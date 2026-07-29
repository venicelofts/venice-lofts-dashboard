import { getGraphAccessToken } from '@/lib/graph/auth'

export type GraphCalendarEvent = {
 id: string
 subject: string
 startsAt: string
 endsAt: string
 location: string | null
 isAllDay: boolean
 organizer: string | null
 webLink: string | null
 bodyPreview: string | null
}

type GraphDateTime = {
 dateTime?: string
 timeZone?: string
}

type GraphEvent = {
 id?: string
 subject?: string
 start?: GraphDateTime
 end?: GraphDateTime
 location?: { displayName?: string }
 isAllDay?: boolean
 isCancelled?: boolean
 organizer?: { emailAddress?: { name?: string; address?: string } }
 webLink?: string
 bodyPreview?: string
}

type GraphListResponse = {
 value?: GraphEvent[]
 '@odata.nextLink'?: string
 error?: { code?: string; message?: string }
}

function formatOrganizer(organizer: GraphEvent['organizer']): string | null {
 if (!organizer?.emailAddress) return null
 const { name, address } = organizer.emailAddress
 if (name && address) return `${name} <${address}>`
 return name ?? address ?? null
}

/**
 * Graph returns local wall-clock in `dateTime` with a separate `timeZone`.
 * Prefer appending Z when the string already looks like UTC; otherwise parse
 * as a naive local and keep ISO from Date (scanner host TZ is acceptable for
 * ops display; calendarView already expands recurrence in mailbox TZ).
 */
function graphDateTimeToIso(value: GraphDateTime | undefined): string | null {
 if (!value?.dateTime) return null
 const raw = value.dateTime.trim()
 if (!raw) return null

 // Graph often returns "2026-07-28T15:00:00.0000000"
 const normalized = raw.replace(/(\.\d{3})\d+$/, '$1')
 if (/Z$/i.test(normalized) || /[+-]\d{2}:\d{2}$/.test(normalized)) {
  const d = new Date(normalized)
  return Number.isNaN(d.getTime()) ? null : d.toISOString()
 }

 const asUtc = new Date(`${normalized}Z`)
 if (
  !Number.isNaN(asUtc.getTime()) &&
  value.timeZone?.toUpperCase() === 'UTC'
 ) {
  return asUtc.toISOString()
 }

 const local = new Date(normalized)
 return Number.isNaN(local.getTime()) ? null : local.toISOString()
}

function normalizeEvent(event: GraphEvent): GraphCalendarEvent | null {
 if (!event.id || event.isCancelled) return null
 const startsAt = graphDateTimeToIso(event.start)
 const endsAt = graphDateTimeToIso(event.end)
 if (!startsAt || !endsAt) return null

 return {
  id: event.id,
  subject: event.subject?.trim() || '(no subject)',
  startsAt,
  endsAt,
  location: event.location?.displayName?.trim() || null,
  isAllDay: Boolean(event.isAllDay),
  organizer: formatOrganizer(event.organizer),
  webLink: event.webLink?.trim() || null,
  bodyPreview: event.bodyPreview?.trim() || null,
 }
}

async function graphGet(
 url: string,
 accessToken: string,
): Promise<GraphListResponse> {
 const res = await fetch(url, {
  headers: {
   Authorization: `Bearer ${accessToken}`,
   Accept: 'application/json',
   Prefer: 'outlook.timezone="UTC"',
  },
 })

 const json = (await res.json()) as GraphListResponse

 if (!res.ok) {
  const detail = json.error?.message ?? json.error?.code ?? `HTTP ${res.status}`
  throw new Error(`Graph calendar request failed: ${detail}`)
 }

 return json
}

export async function listCalendarView(options: {
 mailbox: string
 start: Date
 end: Date
}): Promise<GraphCalendarEvent[]> {
 const { mailbox, start, end } = options
 const accessToken = await getGraphAccessToken()

 const select =
  'id,subject,start,end,location,isAllDay,isCancelled,organizer,webLink,bodyPreview'
 const startIso = start.toISOString()
 const endIso = end.toISOString()

 let nextUrl: string | null =
  `https://graph.microsoft.com/v1.0/users/${encodeURIComponent(mailbox)}/calendarView` +
  `?startDateTime=${encodeURIComponent(startIso)}` +
  `&endDateTime=${encodeURIComponent(endIso)}` +
  `&$select=${encodeURIComponent(select)}` +
  `&$orderby=${encodeURIComponent('start/dateTime')}` +
  `&$top=50`

 const out: GraphCalendarEvent[] = []

 while (nextUrl) {
  const page = await graphGet(nextUrl, accessToken)
  for (const event of page.value ?? []) {
   const normalized = normalizeEvent(event)
   if (normalized) out.push(normalized)
  }
  nextUrl = page['@odata.nextLink'] ?? null
 }

 return out
}
