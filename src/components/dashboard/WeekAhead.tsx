"use client";

import { format, isValid, parseISO } from "date-fns";
import { useRouter } from "next/navigation";
import {
  ListPagination,
  NoteButton,
  SourceKindBadge,
  StarButton,
  importantRowClass,
  useListPage,
} from "@/components/dashboard/ListControls";
import type { DashboardListEvent } from "@/components/dashboard/listShared";

function dateBadge(value: string | null) {
  if (!value) return { day: "TBD", time: "No time" };
  const d = parseISO(value);
  if (!isValid(d)) return { day: "TBD", time: value };
  return {
    day: format(d, "EEE M/d").toUpperCase(),
    time: format(d, "h:mm a"),
  };
}

export function WeekAhead({
  events,
  busyId = null,
  notesBySourceId = {},
  onDismiss,
  onOpenNote,
  onToggleImportant,
}: {
  events: DashboardListEvent[];
  busyId?: string | null;
  notesBySourceId?: Record<string, string>;
  onDismiss?: (id: string) => void;
  onOpenNote?: (sourceId: string, title: string) => void;
  onToggleImportant?: (id: string, important: boolean) => void;
}) {
  const router = useRouter();
  const { page, totalPages, setPage, slice } = useListPage(events.length);
  const pageEvents = slice(events);

  return (
    <section className="fade-up fade-up-delay-1">
      <div className="mb-1 flex flex-wrap items-end justify-between gap-2">
        <h2 className="section-title">Today &amp; The Week Ahead</h2>
        <a
          href="#upcoming"
          className="text-sm text-[var(--text-muted)] underline-offset-2 hover:text-[var(--accent)] hover:underline"
        >
          view the whole week
        </a>
      </div>
      <p className="font-script mb-5 text-xl text-[var(--gold)]">
        The rhythm of the next few days
      </p>

      {events.length === 0 ? (
        <p className="rounded-xl border border-dashed border-[var(--border-strong)] bg-[var(--bg-elevated)] px-4 py-10 text-center text-[var(--text-muted)]">
          No events this week yet. Run{" "}
          <code className="font-mono text-[var(--accent)]">pnpm scan</code> after
          configuring Graph mail or folders.
        </p>
      ) : (
        <>
          <ul className="divide-y divide-[var(--border)] border-y border-[var(--border)]">
            {pageEvents.map((event) => {
              const when = dateBadge(event.starts_at);
              const needsReview = event.needs_review;
              const note =
                event.source_id != null
                  ? notesBySourceId[event.source_id]
                  : undefined;
              const hasNote = Boolean(note?.trim());

              return (
                <li
                  key={event.id}
                  className={`group flex flex-wrap items-start gap-3 py-3.5 md:gap-5 ${importantRowClass(event.is_important)} ${needsReview ? "cursor-pointer" : ""
                    }`}
                  role={needsReview ? "link" : undefined}
                  tabIndex={needsReview ? 0 : undefined}
                  onClick={
                    needsReview
                      ? () => router.push(`/review?event=${event.id}`)
                      : undefined
                  }
                  onKeyDown={
                    needsReview
                      ? (e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          router.push(`/review?event=${event.id}`);
                        }
                      }
                      : undefined
                  }
                >
                  <div
                    className={`flex min-w-[9.5rem] shrink-0 items-baseline gap-2 pt-0.5 ${event.is_important ? "pl-2" : ""
                      }`}
                  >
                    <span className="rounded-md bg-[var(--gold-soft)] px-2 py-0.5 text-[0.7rem] font-semibold tracking-wide text-[var(--text)]">
                      {when.day}
                    </span>
                    <span className="text-sm font-medium text-[var(--text)]">
                      {when.time}
                    </span>
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                      <h3 className="font-serif text-lg leading-snug text-[var(--text)]">
                        {event.title}
                      </h3>
                      <SourceKindBadge kind={event.sourceKind} />
                      {needsReview ? (
                        <span className="text-xs font-medium tracking-wide text-[var(--warn)] uppercase">
                          needs review
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-0.5 text-sm text-[var(--text-muted)]">
                      {[event.location, event.category, event.excerpt]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                    {hasNote ? (
                      <p className="mt-1 line-clamp-1 text-sm italic text-[var(--text-muted)]">
                        {note}
                      </p>
                    ) : null}
                  </div>

                  <div className="flex shrink-0 items-center gap-2">
                    {onToggleImportant ? (
                      <StarButton
                        important={event.is_important}
                        disabled={busyId === event.id}
                        onClick={() =>
                          onToggleImportant(event.id, !event.is_important)
                        }
                      />
                    ) : null}
                    {event.source_id && onOpenNote ? (
                      <NoteButton
                        hasNote={hasNote}
                        onClick={() =>
                          onOpenNote(event.source_id!, event.title)
                        }
                      />
                    ) : null}
                    {onDismiss ? (
                      <button
                        type="button"
                        aria-label="Dismiss"
                        title="Dismiss"
                        disabled={busyId === event.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          onDismiss(event.id);
                        }}
                        className="rounded-full p-1.5 text-[var(--text-faint)] hover:bg-[var(--bg-soft)] hover:text-[var(--danger)] disabled:opacity-40"
                      >
                        <svg
                          aria-hidden="true"
                          width="14"
                          height="14"
                          viewBox="0 0 14 14"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.75"
                          strokeLinecap="round"
                        >
                          <path d="M3.5 3.5l7 7M10.5 3.5l-7 7" />
                        </svg>
                      </button>
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ul>
          <ListPagination
            page={page}
            totalPages={totalPages}
            onPageChange={setPage}
          />
        </>
      )}
    </section>
  );
}
