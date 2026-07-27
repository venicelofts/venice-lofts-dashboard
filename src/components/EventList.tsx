"use client";

import { format, parseISO, isValid } from "date-fns";
import { useRouter } from "next/navigation";
import type { ItineraryEvent } from "@/lib/database.types";

function formatWhen(value: string | null) {
  if (!value) return "No time";
  const d = parseISO(value);
  if (!isValid(d)) return value;
  return format(d, "EEE MMM d · h:mm a");
}

const categoryColor: Record<string, string> = {
  flight: "#3d9cf0",
  hotel: "#a78bfa",
  meeting: "#3ecf8e",
  deadline: "#e6a23c",
  travel: "#67e8f9",
  other: "#8b9aab",
};

export function EventList({
  events,
  busyId = null,
  onDismiss,
}: {
  events: ItineraryEvent[];
  busyId?: string | null;
  onDismiss?: (id: string) => void;
}) {
  const router = useRouter();

  if (events.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-[var(--border)] bg-[var(--bg-elevated)] px-4 py-10 text-center text-[var(--text-muted)]">
        No events yet. Run <code className="font-mono text-[var(--accent)]">pnpm scan</code> after
        configuring Graph mail or folders.
      </p>
    );
  }

  return (
    <ul className="space-y-3">
      {events.map((event) => {
        const needsReview = event.needs_review;

        return (
          <li
            key={event.id}
            className={`card px-4 py-3${needsReview ? " cursor-pointer" : ""}`}
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
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span
                    className="inline-block h-2 w-2 shrink-0 rounded-full"
                    style={{ background: categoryColor[event.category] ?? categoryColor.other }}
                  />
                  <h3 className="font-medium">{event.title}</h3>
                </div>
                <p className="mt-1 text-sm text-[var(--text-muted)]">
                  {formatWhen(event.starts_at)}
                  {event.location ? ` · ${event.location}` : ""}
                </p>
              </div>
              <div className="flex items-start gap-3">
                <div className="font-mono text-xs text-[var(--text-muted)]">
                  {event.category}
                  {needsReview ? (
                    <span className="ml-2 text-[var(--warn)]">needs review</span>
                  ) : null}
                </div>
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
                    className="-mr-1 -mt-0.5 rounded p-1 text-[var(--text-muted)] transition-colors hover:bg-[var(--bg-soft)] hover:text-[var(--danger)] disabled:opacity-50"
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
            </div>
            {event.excerpt ? (
              <p className="mt-2 line-clamp-2 text-sm text-[var(--text-muted)]">{event.excerpt}</p>
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}
