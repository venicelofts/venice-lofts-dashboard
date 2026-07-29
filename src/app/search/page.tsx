import { AppShell } from "@/components/AppShell";
import { withSourceKind } from "@/components/dashboard/listShared";
import { SearchForm } from "@/components/search/SearchForm";
import {
  SearchResults,
  type SourceSearchHit,
} from "@/components/search/SearchResults";
import { escapeIlike, ilikeOr, parseSearchParams } from "@/lib/search";
import type {
  EventCategory,
  ItineraryEvent,
  Source,
  SourceKind,
} from "@/lib/database.types";
import { createClient } from "@/lib/supabase/server";

const RESULT_LIMIT = 40;

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string | string[];
    scope?: string | string[];
    category?: string | string[];
    kind?: string | string[];
  }>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const params = parseSearchParams(await searchParams);
  const { q, scope, category, kind, queried } = params;

  const includeEvents = scope === "all" || scope === "events";
  const includeSources = scope === "all" || scope === "sources";

  const [events, sources] = queried
    ? await Promise.all([
      includeEvents
        ? searchEvents(supabase, { q, category, kind })
        : Promise.resolve([]),
      includeSources && (q || kind)
        ? searchSources(supabase, { q, kind })
        : Promise.resolve([]),
    ])
    : [[], []];

  return (
    <AppShell email={user.email}>
      <h2 className="section-title mb-2">Search</h2>
      <p className="font-script mb-2 text-xl text-[var(--gold)]">
        Find what&apos;s already in the system
      </p>
      <p className="mb-6 text-sm text-[var(--text-muted)]">
        Look up extracted events and ingested sources by keyword, category, or
        source type.
      </p>

      <SearchForm q={q} scope={scope} category={category} kind={kind} />
      <SearchResults events={events} sources={sources} queried={queried} />
    </AppShell>
  );
}

type ServerClient = Awaited<ReturnType<typeof createClient>>;

async function searchEvents(
  supabase: ServerClient,
  {
    q,
    category,
    kind,
  }: {
    q: string;
    category: EventCategory | "";
    kind: SourceKind | "";
  },
) {
  let query = supabase
    .from("events")
    .select(kind ? "*, sources!inner(kind)" : "*, sources(kind)")
    .order("starts_at", { ascending: false, nullsFirst: false })
    .limit(RESULT_LIMIT);

  if (q) {
    query = query.or(ilikeOr(["title", "excerpt", "location"], q));
  }
  if (category) {
    query = query.eq("category", category);
  }
  if (kind) {
    query = query.eq("sources.kind", kind);
  }

  const { data } = await query;
  const rows = (data ?? []) as Array<
    ItineraryEvent & { sources?: { kind: string } | { kind: string }[] | null }
  >;

  // When filtering by source kind via embed, PostgREST can return events with
  // a null sources embed for non-matches depending on join type — drop those.
  return rows
    .map(withSourceKind)
    .filter((event) => (kind ? event.sourceKind === kind : true));
}

async function searchSources(
  supabase: ServerClient,
  { q, kind }: { q: string; kind: SourceKind | "" },
) {
  const byId = new Map<string, SourceSearchHit>();

  let sourceQuery = supabase
    .from("sources")
    .select("*")
    .order("last_scanned_at", { ascending: false })
    .limit(RESULT_LIMIT);

  if (q) {
    sourceQuery = sourceQuery.ilike(
      "path_or_subject",
      `%${escapeIlike(q)}%`,
    );
  }
  if (kind) {
    sourceQuery = sourceQuery.eq("kind", kind);
  }

  const { data: subjectMatches } = await sourceQuery;
  for (const source of (subjectMatches ?? []) as Source[]) {
    byId.set(source.id, source);
  }

  // Also match document snippets (closest thing to a stored "summary").
  if (q) {
    const { data: docs } = await supabase
      .from("documents")
      .select("source_id, text_snippet")
      .ilike("text_snippet", `%${escapeIlike(q)}%`)
      .limit(RESULT_LIMIT);

    const snippetBySource = new Map<string, string>();
    for (const doc of docs ?? []) {
      if (!doc.source_id || !doc.text_snippet) continue;
      if (!snippetBySource.has(doc.source_id)) {
        snippetBySource.set(doc.source_id, doc.text_snippet);
      }
    }

    const missingIds = [...snippetBySource.keys()].filter((id) => !byId.has(id));
    if (missingIds.length > 0) {
      let fetchMissing = supabase.from("sources").select("*").in("id", missingIds);
      if (kind) {
        fetchMissing = fetchMissing.eq("kind", kind);
      }
      const { data: matchedSources } = await fetchMissing;
      for (const source of (matchedSources ?? []) as Source[]) {
        byId.set(source.id, {
          ...source,
          matchSnippet: snippetBySource.get(source.id) ?? null,
        });
      }
    }

    for (const [sourceId, snippet] of snippetBySource) {
      const existing = byId.get(sourceId);
      if (existing && !existing.matchSnippet) {
        byId.set(sourceId, { ...existing, matchSnippet: snippet });
      }
    }
  }

  return Array.from(byId.values())
    .sort(
      (a, b) =>
        new Date(b.last_scanned_at).getTime() -
        new Date(a.last_scanned_at).getTime(),
    )
    .slice(0, RESULT_LIMIT);
}
