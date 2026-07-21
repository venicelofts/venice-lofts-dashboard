import { config as loadEnv } from 'dotenv'
import path from 'node:path'
import { logScanErrors } from '../src/lib/scan/errors'
import { scanFolders } from '../src/lib/scan/folders'
import { scanEmail, isEmailScanConfigured } from '../src/lib/scan/email'
import { createServiceClient } from '../src/lib/scan/persist'

loadEnv({ path: path.resolve(process.cwd(), '.env.local') })
loadEnv({ path: path.resolve(process.cwd(), '.env') })

async function main() {
 const userId = process.env.SCAN_USER_ID
 if (!userId) {
  console.error(
   'SCAN_USER_ID is required. Sign in to the dashboard once, copy your user id from Settings, and set it in .env.local',
  )
  process.exit(1)
 }

 const folders = (process.env.SCAN_FOLDERS ?? '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean)

 const supabase = createServiceClient()
 const startedAt = new Date().toISOString()
 const { data: run, error: runError } = await supabase
  .from('scan_runs')
  .insert({ user_id: userId, started_at: startedAt, stats: {} })
  .select('id')
  .single()

 if (runError) {
  console.error('Failed to create scan_runs row:', runError.message)
  console.error(
   'If the table is missing, run the SQL in supabase/migrations/20260711143000_itinerary_schema.sql in the Supabase SQL Editor.',
  )
  process.exit(1)
 }

 const aggregate = {
  folders: null as Awaited<ReturnType<typeof scanFolders>> | null,
  email: null as Awaited<ReturnType<typeof scanEmail>> | null,
 }

 try {
  if (folders.length > 0) {
   console.log(`Scanning folders: ${folders.join(', ')}`)
   aggregate.folders = await scanFolders(userId, folders)
   console.log('Folder scan:', aggregate.folders)
   logScanErrors('Folder scan', aggregate.folders.errors)
  } else {
   console.log('No SCAN_FOLDERS configured — skipping folder scan')
  }

  if (isEmailScanConfigured()) {
   console.log('Scanning mailbox via Microsoft Graph…')
   aggregate.email = await scanEmail(userId)
   console.log('Email scan:', aggregate.email)
   logScanErrors('Email scan', aggregate.email.errors)
  } else {
   console.log(
    'Graph mail not configured (AZURE_* / GRAPH_MAILBOX) — skipping email scan',
   )
  }

  await supabase
   .from('scan_runs')
   .update({
    finished_at: new Date().toISOString(),
    stats: aggregate,
   })
   .eq('id', run.id)

  console.log('Scan complete.')
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
  console.error('Scan failed:', message)
  process.exit(1)
 }
}

main()
