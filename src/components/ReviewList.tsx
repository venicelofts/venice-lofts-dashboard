"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import type { ItineraryEvent } from "@/lib/database.types";

export function ReviewList({
  events,
  focusId = null,
}: {
  events: ItineraryEvent[];
  focusId?: string | null;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    if (!focusId) return;
    const el = document.getElementById(`review-event-${focusId}`);
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [focusId, events]);

  async function confirm(id: string) {
    setBusy(id);
    const supabase = createClient();
    await supabase
      .from("events")
      .update({
        needs_review: false,
        confidence: 0.9,
        cleared_at: new Date().toISOString(),
      })
      .eq("id", id);
    setBusy(null);
    router.refresh();
  }

  async function remove(id: string) {
    setBusy(id);
    const supabase = createClient();
    await supabase.from("events").delete().eq("id", id);
    setBusy(null);
    router.refresh();
  }

  if (events.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-[var(--border-strong)] bg-[var(--bg-elevated)] px-4 py-10 text-center text-[var(--text-muted)]">
        Nothing in the review queue.
      </p>
    );
  }

  return (
    <ul className="space-y-3">
      {events.map((event) => {
        const focused = focusId === event.id;
        return (
          <li
            key={event.id}
            id={`review-event-${event.id}`}
            className={`card card-interactive px-4 py-4 transition-[box-shadow,border-color]${focused ? " border-[var(--accent)] shadow-[0_0_0_1px_var(--accent)]" : ""
              }`}
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h3 className="font-serif text-lg font-medium">{event.title}</h3>
                <p className="mt-1 text-sm text-[var(--text-muted)]">
                  confidence {(event.confidence * 100).toFixed(0)}% · {event.category}
                </p>
                {event.excerpt ? (
                  <p className="mt-2 text-sm text-[var(--text-muted)]">{event.excerpt}</p>
                ) : null}
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={busy === event.id}
                  onClick={() => void confirm(event.id)}
                  className="btn-pill btn-pill-primary px-4 py-1.5"
                >
                  Confirm
                </button>
                <button
                  type="button"
                  disabled={busy === event.id}
                  onClick={() => void remove(event.id)}
                  className="btn-pill btn-pill-ghost text-[var(--danger)]"
                >
                  Dismiss
                </button>
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
