"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import type { ItineraryEvent } from "@/lib/database.types";

export function ReviewList({ events }: { events: ItineraryEvent[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);

  async function confirm(id: string) {
    setBusy(id);
    const supabase = createClient();
    await supabase
      .from("events")
      .update({ needs_review: false, confidence: 0.9 })
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
      <p className="rounded-lg border border-dashed border-[var(--border)] bg-[var(--bg-elevated)] px-4 py-10 text-center text-[var(--text-muted)]">
        Nothing in the review queue.
      </p>
    );
  }

  return (
    <ul className="space-y-3">
      {events.map((event) => (
        <li
          key={event.id}
          className="card px-4 py-3"
        >
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h3 className="font-medium">{event.title}</h3>
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
                className="rounded bg-[var(--accent)] px-3 py-1.5 text-sm text-black disabled:opacity-50"
              >
                Confirm
              </button>
              <button
                type="button"
                disabled={busy === event.id}
                onClick={() => void remove(event.id)}
                className="rounded border border-[var(--border)] px-3 py-1.5 text-sm text-[var(--danger)] disabled:opacity-50"
              >
                Dismiss
              </button>
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}
