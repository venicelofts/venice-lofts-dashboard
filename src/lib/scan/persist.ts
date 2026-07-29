import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/database.types'
import type { ExtractionResult } from '@/lib/scan/schema'

export function createServiceClient() {
 const url = process.env.NEXT_PUBLIC_SUPABASE_URL
 const key = process.env.SUPABASE_SERVICE_ROLE_KEY
 if (!url || !key) {
  throw new Error(
   'Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY',
  )
 }
 return createClient<Database>(url, key, {
  auth: { persistSession: false, autoRefreshToken: false },
 })
}

type UpsertSourceInput = {
 userId: string
 kind: 'email' | 'file' | 'calendar'
 externalId?: string | null
 contentHash?: string | null
 pathOrSubject?: string | null
 textSnippet?: string | null
 metadata?: Record<string, unknown>
 extraction: ExtractionResult
}

export async function upsertExtraction(
 supabase: SupabaseClient<Database>,
 input: UpsertSourceInput,
) {
 const {
  userId,
  kind,
  externalId = null,
  contentHash = null,
  pathOrSubject = null,
  textSnippet = null,
  metadata = {},
  extraction,
 } = input

 let sourceQuery = supabase.from('sources').select('id').eq('user_id', userId)

 if (externalId) {
  sourceQuery = sourceQuery.eq('external_id', externalId)
 } else if (contentHash) {
  sourceQuery = sourceQuery.eq('content_hash', contentHash)
 }

 const { data: existing } = await sourceQuery.maybeSingle()

 let sourceId = existing?.id

 if (sourceId) {
  await supabase
   .from('sources')
   .update({
    path_or_subject: pathOrSubject,
    last_scanned_at: new Date().toISOString(),
    content_hash: contentHash,
    external_id: externalId,
   })
   .eq('id', sourceId)
 } else {
  const { data: inserted, error } = await supabase
   .from('sources')
   .insert({
    user_id: userId,
    kind,
    external_id: externalId,
    content_hash: contentHash,
    path_or_subject: pathOrSubject,
   })
   .select('id')
   .single()

  if (error) throw error
  sourceId = inserted.id
 }

 await supabase.from('documents').insert({
  user_id: userId,
  source_id: sourceId,
  text_snippet: textSnippet?.slice(0, 4000) ?? null,
  metadata,
 })

 let tripId: string | null = null
 if (extraction.trip?.title) {
  const { data: trip, error: tripError } = await supabase
   .from('trips')
   .insert({
    user_id: userId,
    title: extraction.trip.title,
    starts_on: extraction.trip.starts_on ?? null,
    ends_on: extraction.trip.ends_on ?? null,
   })
   .select('id')
   .single()

  if (tripError) throw tripError
  tripId = trip.id
 }

 if (extraction.events.length > 0) {
  // Preserve importance flags across re-scan replace
  const { data: priorEvents } = await supabase
   .from('events')
   .select('title, starts_at, is_important')
   .eq('source_id', sourceId)
   .eq('user_id', userId)

  const importantKeys = new Set(
   (priorEvents ?? [])
    .filter((row) => row.is_important)
    .map((row) => `${row.title}\0${row.starts_at ?? ''}`),
  )

  const rows = extraction.events.map((event) => ({
   user_id: userId,
   source_id: sourceId!,
   trip_id: tripId,
   title: event.title,
   starts_at: event.starts_at ?? null,
   ends_at: event.ends_at ?? null,
   location: event.location ?? null,
   category: event.category,
   confidence: event.confidence,
   excerpt: event.excerpt ?? null,
   needs_review: event.confidence < 0.6,
   is_important: importantKeys.has(`${event.title}\0${event.starts_at ?? ''}`),
  }))

  // Replace prior events for this source on re-scan
  await supabase
   .from('events')
   .delete()
   .eq('source_id', sourceId)
   .eq('user_id', userId)
  const { error } = await supabase.from('events').insert(rows)
  if (error) throw error

  return { sourceId, eventCount: rows.length, tripId }
 }

 return { sourceId, eventCount: 0, tripId }
}
