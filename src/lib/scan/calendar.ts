import { getGraphAzureConfig } from '@/lib/graph/auth'
import { listCalendarView } from '@/lib/graph/calendar'
import { formatScanError } from '@/lib/scan/errors'
import { createServiceClient, upsertExtraction } from '@/lib/scan/persist'
import type { ExtractionResult } from '@/lib/scan/schema'

export type CalendarScanStats = {
 eventsSeen: number
 eventsUpserted: number
 eventsRemoved: number
 skipped: number
 errors: string[]
 windowStart: string
 windowEnd: string
}

function getGraphMailbox(): string | null {
 const mailbox = process.env.GRAPH_MAILBOX?.trim()
 return mailbox || null
}

export function isCalendarScanConfigured(): boolean {
 return Boolean(getGraphAzureConfig() && getGraphMailbox())
}

function getScanLookbackHours(): number {
 return Number(process.env.SCAN_LOOKBACK_HOURS ?? '48')
}

function getCalendarForwardDays(): number {
 return Number(process.env.SCAN_CALENDAR_FORWARD_DAYS ?? '90')
}

export function calendarExternalId(mailbox: string, graphEventId: string) {
 return `cal:${mailbox}:${graphEventId}`
}

export async function scanCalendar(userId: string): Promise<CalendarScanStats> {
 const lookbackHours = getScanLookbackHours()
 const forwardDays = getCalendarForwardDays()
 const windowStart = new Date(Date.now() - lookbackHours * 60 * 60 * 1000)
 const windowEnd = new Date(Date.now() + forwardDays * 24 * 60 * 60 * 1000)

 const stats: CalendarScanStats = {
  eventsSeen: 0,
  eventsUpserted: 0,
  eventsRemoved: 0,
  skipped: 0,
  errors: [],
  windowStart: windowStart.toISOString(),
  windowEnd: windowEnd.toISOString(),
 }

 const mailbox = getGraphMailbox()
 if (!getGraphAzureConfig() || !mailbox) {
  stats.errors.push(
   'Graph calendar not configured (AZURE_TENANT_ID / AZURE_CLIENT_ID / AZURE_CLIENT_SECRET / GRAPH_MAILBOX)',
  )
  return stats
 }

 const supabase = createServiceClient()

 let events
 try {
  events = await listCalendarView({
   mailbox,
   start: windowStart,
   end: windowEnd,
  })
 } catch (err) {
  stats.errors.push(
   formatScanError(
    err,
    `Graph calendarView (${mailbox}, ${windowStart.toISOString()} → ${windowEnd.toISOString()})`,
   ),
  )
  return stats
 }

 const seenExternalIds = new Set<string>()

 for (const event of events) {
  stats.eventsSeen += 1
  const externalId = calendarExternalId(mailbox, event.id)
  seenExternalIds.add(externalId)

  try {
   const extraction: ExtractionResult = {
    events: [
     {
      title: event.subject,
      starts_at: event.startsAt,
      ends_at: event.endsAt,
      location: event.location,
      category: 'meeting',
      confidence: 1,
      excerpt: event.bodyPreview,
     },
    ],
    trip: null,
   }

   await upsertExtraction(supabase, {
    userId,
    kind: 'calendar',
    externalId,
    pathOrSubject: event.subject,
    textSnippet: event.bodyPreview,
    metadata: {
     mailbox,
     graphEventId: event.id,
     isAllDay: event.isAllDay,
     organizer: event.organizer,
     webLink: event.webLink,
    },
    extraction,
   })

   stats.eventsUpserted += 1
  } catch (err) {
   stats.errors.push(formatScanError(err, `calendar event ${event.id}`))
  }
 }

 // Reconcile: remove calendar sources in-window that Graph no longer returned.
 try {
  const { data: existingSources, error: listError } = await supabase
   .from('sources')
   .select('id, external_id')
   .eq('user_id', userId)
   .eq('kind', 'calendar')
   .like('external_id', `cal:${mailbox}:%`)

  if (listError) throw listError

  for (const source of existingSources ?? []) {
   if (!source.external_id || seenExternalIds.has(source.external_id)) {
    continue
   }

   const { data: childEvents, error: eventsError } = await supabase
    .from('events')
    .select('id, starts_at')
    .eq('source_id', source.id)
    .eq('user_id', userId)

   if (eventsError) throw eventsError

   const inWindow = (childEvents ?? []).some((row) => {
    if (!row.starts_at) return false
    const t = new Date(row.starts_at).getTime()
    return t >= windowStart.getTime() && t <= windowEnd.getTime()
   })

   if (!inWindow) continue

   // events.source_id is ON DELETE SET NULL — delete child events explicitly
   const { error: deleteEventsError } = await supabase
    .from('events')
    .delete()
    .eq('source_id', source.id)
    .eq('user_id', userId)
   if (deleteEventsError) throw deleteEventsError

   const { error: deleteError } = await supabase
    .from('sources')
    .delete()
    .eq('id', source.id)
    .eq('user_id', userId)

   if (deleteError) throw deleteError
   stats.eventsRemoved += 1
  }
 } catch (err) {
  stats.errors.push(formatScanError(err, 'calendar reconcile deletes'))
 }

 return stats
}
