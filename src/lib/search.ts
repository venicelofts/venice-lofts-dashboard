import type { EventCategory, SourceKind } from '@/lib/database.types'
import type { SearchScope } from '@/components/search/SearchForm'

const EVENT_CATEGORIES = new Set<EventCategory>([
 'flight',
 'hotel',
 'meeting',
 'deadline',
 'travel',
 'other',
])

const SOURCE_KINDS = new Set<SourceKind>(['email', 'file', 'calendar'])
const SCOPES = new Set<SearchScope>(['all', 'events', 'sources'])

export function escapeIlike(value: string) {
 return value
  .replace(/\\/g, '\\\\')
  .replace(/%/g, '\\%')
  .replace(/_/g, '\\_')
  .replace(/"/g, '')
}

export function parseSearchParams(params: {
 q?: string | string[]
 scope?: string | string[]
 category?: string | string[]
 kind?: string | string[]
}) {
 const q = typeof params.q === 'string' ? params.q.trim() : ''
 const scopeRaw = typeof params.scope === 'string' ? params.scope : 'all'
 const scope: SearchScope = SCOPES.has(scopeRaw as SearchScope)
  ? (scopeRaw as SearchScope)
  : 'all'

 const categoryRaw = typeof params.category === 'string' ? params.category : ''
 const category: EventCategory | '' = EVENT_CATEGORIES.has(
  categoryRaw as EventCategory,
 )
  ? (categoryRaw as EventCategory)
  : ''

 const kindRaw = typeof params.kind === 'string' ? params.kind : ''
 const kind: SourceKind | '' = SOURCE_KINDS.has(kindRaw as SourceKind)
  ? (kindRaw as SourceKind)
  : ''

 const queried = Boolean(q || category || kind)

 return { q, scope, category, kind, queried }
}

/** PostgREST `.or()` filter for case-insensitive substring match. */
export function ilikeOr(columns: string[], q: string) {
 const pattern = `%${escapeIlike(q)}%`
 return columns.map((col) => `${col}.ilike."${pattern}"`).join(',')
}
