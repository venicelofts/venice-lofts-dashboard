"use client";

import { differenceInCalendarDays, format, isValid, parseISO } from "date-fns";
import type { ItineraryEvent } from "@/lib/database.types";

const accentByCategory: Record<string, string> = {
  flight: "#1b4d3e",
  hotel: "#6b7c5e",
  meeting: "#b8923f",
  deadline: "#9a4f42",
  travel: "#3d6b7a",
  other: "#8a7a5c",
};

function daysOut(startsAt: string | null) {
  if (!startsAt) return null;
  const d = parseISO(startsAt);
  if (!isValid(d)) return null;
  return differenceInCalendarDays(d, new Date());
}

function dateLabel(startsAt: string | null) {
  if (!startsAt) return "Date TBD";
  const d = parseISO(startsAt);
  if (!isValid(d)) return startsAt;
  return format(d, "MMM d");
}

export function UpcomingEvents({
  events,
  busyId = null,
  onDismiss,
}: {
  events: ItineraryEvent[];
  busyId?: string | null;
  onDismiss?: (id: string) => void;
}) {
  return (
    <section id="upcoming" className="fade-up fade-up-delay-2 scroll-mt-6">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-2">
        <h2 className="section-title">Upcoming Events</h2>
        <p className="text-sm text-[var(--text-muted)]">
          Beyond this week · status stays as extracted
        </p>
      </div>

      {events.length === 0 ? (
        <p className="rounded-xl border border-dashed border-[var(--border-strong)] bg-[var(--bg-elevated)] px-4 py-10 text-center text-[var(--text-muted)]">
          No further-out events yet. Items past this week will land here.
        </p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {events.map((event) => {
            const accent = accentByCategory[event.category] ?? accentByCategory.other;
            const out = daysOut(event.starts_at);
            const status = event.needs_review ? "Review" : "Hold";

            return (
              <article
                key={event.id}
                className="card card-interactive relative flex flex-col overflow-hidden p-4"
                style={{ borderTop: `4px solid ${accent}` }}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h3 className="font-serif text-lg leading-snug text-[var(--text)]">
                      {event.title}
                    </h3>
                    <p className="mt-1 text-xs text-[var(--text-muted)]">
                      {dateLabel(event.starts_at)} · {status}
                    </p>
                  </div>
                  {onDismiss ? (
                    <button
                      type="button"
                      aria-label="Dismiss"
                      title="Dismiss"
                      disabled={busyId === event.id}
                      onClick={() => onDismiss(event.id)}
                      className="rounded-md p-1 text-[var(--text-faint)] hover:bg-[var(--bg-soft)] hover:text-[var(--danger)] disabled:opacity-50"
                    >
                      <svg
                        aria-hidden="true"
                        width="12"
                        height="12"
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

                <div className="mt-4 flex items-stretch gap-3">
                  <span
                    className="w-1 shrink-0 rounded-full"
                    style={{ background: accent }}
                    aria-hidden
                  />
                  <div>
                    <p className="font-serif text-3xl leading-none font-semibold text-[var(--text)]">
                      {out === null ? "—" : Math.max(out, 0)}
                    </p>
                    <p className="mt-1 text-[0.65rem] font-semibold tracking-[0.14em] text-[var(--text-muted)] uppercase">
                      Days out
                    </p>
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap gap-1.5">
                  <span className="rounded-md bg-[var(--bg-soft)] px-2 py-0.5 text-[0.7rem] text-[var(--text-muted)] capitalize">
                    {event.category}
                  </span>
                  {event.location ? (
                    <span className="rounded-md bg-[var(--bg-soft)] px-2 py-0.5 text-[0.7rem] text-[var(--text-muted)]">
                      {event.location}
                    </span>
                  ) : null}
                  {event.needs_review ? (
                    <span className="rounded-md bg-[var(--accent-soft)] px-2 py-0.5 text-[0.7rem] text-[var(--accent)]">
                      Needs review
                    </span>
                  ) : null}
                </div>

                {event.needs_review ? (
                  <a
                    href={`/review?event=${event.id}`}
                    className="mt-4 text-sm font-medium text-[var(--accent)] hover:underline"
                  >
                    Make definite →
                  </a>
                ) : (
                  <p className="mt-4 text-sm text-[var(--text-faint)]">Tracked</p>
                )}
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
