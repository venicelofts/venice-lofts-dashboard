import { logScanErrors } from '@/lib/scan/errors'
import { scanFolders, type FolderScanStats } from '@/lib/scan/folders'
import {
 scanEmail,
 isEmailScanConfigured,
 type EmailScanStats,
} from '@/lib/scan/email'
import {
 scanCalendar,
 isCalendarScanConfigured,
 type CalendarScanStats,
} from '@/lib/scan/calendar'
import { createServiceClient } from '@/lib/scan/persist'

export type RunScanOptions = {
 userId: string
 includeFolders: boolean
 log?: (message: string) => void
}

export type RunScanResult = {
 runId: string
 stats: {
  folders: FolderScanStats | null
  email: EmailScanStats | null
  calendar: CalendarScanStats | null
 }
}

export async function runScan(options: RunScanOptions): Promise<RunScanResult> {
 const { userId, includeFolders } = options
 const log = options.log ?? (() => {})

 const folders = includeFolders
  ? (process.env.SCAN_FOLDERS ?? '')
     .split(',')
     .map((s) => s.trim())
     .filter(Boolean)
  : []

 const supabase = createServiceClient()
 const startedAt = new Date().toISOString()
 const { data: run, error: runError } = await supabase
  .from('scan_runs')
  .insert({ user_id: userId, started_at: startedAt, stats: {} })
  .select('id')
  .single()

 if (runError) {
  throw new Error(
   `Failed to create scan_runs row: ${runError.message}. If the table is missing, run the SQL in supabase/migrations/.`,
  )
 }

 const aggregate: RunScanResult['stats'] = {
  folders: null,
  email: null,
  calendar: null,
 }

 try {
  if (includeFolders) {
   if (folders.length > 0) {
    log(`Scanning folders: ${folders.join(', ')}`)
    aggregate.folders = await scanFolders(userId, folders)
    log(`Folder scan: ${JSON.stringify(aggregate.folders)}`)
    logScanErrors('Folder scan', aggregate.folders.errors)
   } else {
    log('No SCAN_FOLDERS configured — skipping folder scan')
   }
  }

  if (isEmailScanConfigured()) {
   log('Scanning mailbox via Microsoft Graph…')
   aggregate.email = await scanEmail(userId)
   log(`Email scan: ${JSON.stringify(aggregate.email)}`)
   logScanErrors('Email scan', aggregate.email.errors)
  } else {
   log(
    'Graph mail not configured (AZURE_* / GRAPH_MAILBOX) — skipping email scan',
   )
  }

  if (isCalendarScanConfigured()) {
   log('Scanning Outlook calendar via Microsoft Graph…')
   aggregate.calendar = await scanCalendar(userId)
   log(`Calendar scan: ${JSON.stringify(aggregate.calendar)}`)
   logScanErrors('Calendar scan', aggregate.calendar.errors)
  } else {
   log(
    'Graph calendar not configured (AZURE_* / GRAPH_MAILBOX) — skipping calendar scan',
   )
  }

  await supabase
   .from('scan_runs')
   .update({
    finished_at: new Date().toISOString(),
    stats: aggregate,
   })
   .eq('id', run.id)

  return { runId: run.id, stats: aggregate }
 } catch (err) {
  const message = err instanceof Error ? err.message : String(err)
  await supabase
   .from('scan_runs')
   .update({
    finished_at: new Date().toISOString(),
    stats: aggregate,
    error: message,
   })
   .eq('id', run.id)
  throw err
 }
}
