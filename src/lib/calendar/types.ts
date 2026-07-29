import type { ItineraryEvent } from '@/lib/database.types'

export type CalendarEvent = ItineraryEvent & {
 webLink: string | null
 isAllDay: boolean
}

type DocumentMetaRow = {
 metadata: Record<string, unknown> | null
 created_at?: string
}

type SourceWithDocs = {
 kind: string
 documents?: DocumentMetaRow[] | null
}

type CalendarEventRow = ItineraryEvent & {
 sources?: SourceWithDocs | SourceWithDocs[] | null
}

function latestMeta(docs: DocumentMetaRow[] | null | undefined) {
 if (!docs?.length) return null
 const sorted = [...docs].sort((a, b) => {
  const aT = a.created_at ? Date.parse(a.created_at) : 0
  const bT = b.created_at ? Date.parse(b.created_at) : 0
  return bT - aT
 })
 return sorted[0]?.metadata ?? null
}

function sourceDocs(sources: CalendarEventRow['sources']) {
 if (!sources) return null
 const source = Array.isArray(sources) ? sources[0] : sources
 return source?.documents ?? null
}

export function toCalendarEvent(row: CalendarEventRow): CalendarEvent {
 const meta = latestMeta(sourceDocs(row.sources))
 const webLink = typeof meta?.webLink === 'string' ? meta.webLink : null
 const isAllDay = Boolean(meta?.isAllDay)

 const event: ItineraryEvent = {
  id: row.id,
  user_id: row.user_id,
  source_id: row.source_id,
  trip_id: row.trip_id,
  title: row.title,
  starts_at: row.starts_at,
  ends_at: row.ends_at,
  location: row.location,
  category: row.category,
  confidence: row.confidence,
  excerpt: row.excerpt,
  needs_review: row.needs_review,
  cleared_at: row.cleared_at,
  created_at: row.created_at,
  updated_at: row.updated_at,
 }

 return {
  ...event,
  webLink,
  isAllDay,
 }
}

/** documents live on sources, not events — nest the embed accordingly */
export const CALENDAR_EVENT_SELECT =
 '*, sources!inner(kind, documents(metadata, created_at))'
