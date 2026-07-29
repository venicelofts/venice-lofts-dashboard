import type { ItineraryEvent, SourceKind } from '@/lib/database.types'

export const LIST_PAGE_SIZE = 10

export type DashboardListEvent = ItineraryEvent & {
 sourceKind: SourceKind | null
}

type SourceEmbed = {
 kind: string
}

export function withSourceKind(
 row: ItineraryEvent & {
  sources?: SourceEmbed | SourceEmbed[] | null
 },
): DashboardListEvent {
 const embedded = row.sources
 const raw = Array.isArray(embedded) ? embedded[0]?.kind : embedded?.kind
 const sourceKind: SourceKind | null =
  raw === 'email' || raw === 'calendar' || raw === 'file' ? raw : null

 return {
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
  sourceKind,
 }
}
