"use client";

import type { ItineraryEvent } from "@/lib/database.types";

export function FocusNow({
  event,
  busy = false,
  onDone,
}: {
  event: ItineraryEvent | null;
  busy?: boolean;
  onDone?: (id: string) => void;
}) {
  if (!event) {
    return (
      <section className="fade-up overflow-hidden rounded-2xl bg-[var(--accent)] px-5 py-6 text-[#f7f5ef] md:px-7">
        <p className="text-[0.68rem] font-semibold tracking-[0.18em] text-[var(--gold-soft)] uppercase">
          Focus now
        </p>
        <h2 className="mt-2 font-serif text-2xl italic md:text-[1.75rem]">
          Nothing urgent on the board
        </h2>
        <p className="mt-2 max-w-2xl text-sm text-white/75">
          When review items or today&apos;s first commitment land here, finish that before the rest.
        </p>
      </section>
    );
  }

  return (
    <section className="fade-up relative overflow-hidden rounded-2xl bg-[var(--accent)] px-5 py-6 text-[#f7f5ef] shadow-[0_12px_32px_rgba(27,77,62,0.22)] md:px-7">
      <div className="pointer-events-none absolute inset-y-0 right-0 w-1/3 bg-[radial-gradient(circle_at_80%_20%,rgba(200,176,110,0.22),transparent_60%)]" />
      <div className="relative flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <p className="text-[0.68rem] font-semibold tracking-[0.18em] text-[var(--gold-soft)] uppercase">
            Focus now
          </p>
          <h2 className="mt-2 max-w-3xl font-serif text-2xl leading-snug italic md:text-[1.85rem]">
            {event.title}
          </h2>
          <p className="mt-2 max-w-2xl text-sm text-white/75">
            {event.needs_review
              ? "Needs a quick review before it can leave the queue. Everything else can wait."
              : event.excerpt ||
              "Everything else can wait for now. Finish this, then start the day."}
          </p>
        </div>
        {onDone ? (
          <button
            type="button"
            disabled={busy}
            onClick={() => onDone(event.id)}
            className="btn-pill btn-pill-gold shrink-0 px-4 py-1.5 text-xs font-semibold tracking-wide uppercase"
          >
            Done
          </button>
        ) : null}
      </div>
    </section>
  );
}
