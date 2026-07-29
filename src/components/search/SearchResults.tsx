import { format, isValid, parseISO } from "date-fns";
import Link from "next/link";
import { SourceKindBadge } from "@/components/dashboard/ListControls";
import type { DashboardListEvent } from "@/components/dashboard/listShared";
import type { Source, SourceKind } from "@/lib/database.types";

function formatWhen(value: string | null) {
  if (!value) return "No time";
  const d = parseISO(value);
  if (!isValid(d)) return value;
  return format(d, "EEE MMM d · h:mm a");
}

const categoryColor: Record<string, string> = {
  flight: "#1b4d3e",
  hotel: "#6b7c5e",
  meeting: "#b8923f",
  deadline: "#9a4f42",
  travel: "#3d6b7a",
  other: "#8a7a5c",
};

export type SourceSearchHit = Source & {
  matchSnippet?: string | null;
};

export function SearchResults({
  events,
  sources,
  queried,
}: {
  events: DashboardListEvent[];
  sources: SourceSearchHit[];
  queried: boolean;
}) {
  if (!queried) {
    return (
      <p className="mt-8 rounded-xl border border-dashed border-[var(--border-strong)] bg-[var(--bg-elevated)] px-4 py-10 text-center text-[var(--text-muted)]">
        Type a keyword or pick a filter to look through events and sources.
      </p>
    );
  }

  if (events.length === 0 && sources.length === 0) {
    return (
      <p className="mt-8 rounded-xl border border-dashed border-[var(--border-strong)] bg-[var(--bg-elevated)] px-4 py-10 text-center text-[var(--text-muted)]">
        No matches. Try a broader term or clear a filter.
      </p>
    );
  }

  return (
    <div className="mt-8 space-y-10">
      {events.length > 0 ? (
        <section className="fade-up fade-up-delay-1">
          <h3 className="mb-3 font-serif text-lg font-medium text-[var(--accent)]">
            Events
            <span className="ml-2 text-sm font-sans font-normal text-[var(--text-faint)]">
              {events.length}
            </span>
          </h3>
          <ul className="space-y-2">
            {events.map((event) => {
              const href = event.needs_review
                ? `/review?event=${event.id}`
                : null;
              const body = (
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className="inline-block h-2 w-2 shrink-0 rounded-full"
                        style={{
                          background:
                            categoryColor[event.category] ?? categoryColor.other,
                        }}
                      />
                      <h4 className="font-serif text-lg font-medium leading-snug">
                        {event.title}
                      </h4>
                      <SourceKindBadge kind={event.sourceKind} />
                      {event.needs_review ? (
                        <span className="text-xs font-medium tracking-wide text-[var(--warn)] uppercase">
                          needs review
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-1 text-sm text-[var(--text-muted)]">
                      {formatWhen(event.starts_at)}
                      {event.location ? ` · ${event.location}` : ""}
                      {` · ${event.category}`}
                    </p>
                    {event.excerpt ? (
                      <p className="mt-1.5 line-clamp-2 text-sm text-[var(--text-muted)]">
                        {event.excerpt}
                      </p>
                    ) : null}
                  </div>
                </div>
              );

              return (
                <li key={event.id} className="card card-interactive px-4 py-3">
                  {href ? (
                    <Link href={href} className="block">
                      {body}
                    </Link>
                  ) : (
                    body
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}

      {sources.length > 0 ? (
        <section className="fade-up fade-up-delay-2">
          <h3 className="mb-3 font-serif text-lg font-medium text-[var(--accent)]">
            Sources
            <span className="ml-2 text-sm font-sans font-normal text-[var(--text-faint)]">
              {sources.length}
            </span>
          </h3>
          <ul className="space-y-2">
            {sources.map((source) => (
              <li key={source.id} className="card card-interactive px-4 py-3">
                <Link href="/sources" className="block">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium">
                      {source.path_or_subject ?? "(untitled)"}
                    </p>
                    <SourceKindBadge kind={source.kind as SourceKind} />
                  </div>
                  <p className="mt-1 text-xs tracking-wide text-[var(--text-muted)] uppercase">
                    scanned {new Date(source.last_scanned_at).toLocaleString()}
                  </p>
                  {source.matchSnippet ? (
                    <p className="mt-1.5 line-clamp-2 text-sm text-[var(--text-muted)]">
                      {source.matchSnippet}
                    </p>
                  ) : null}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
