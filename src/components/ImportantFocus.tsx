"use client";

import { format, isValid, parseISO } from "date-fns";
import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { createClient } from "@/lib/supabase/client";
import type { ItineraryEvent } from "@/lib/database.types";

function formatWhen(value: string | null) {
  if (!value) return "No time set";
  const d = parseISO(value);
  if (!isValid(d)) return value;
  return format(d, "EEE MMM d · h:mm a");
}

export function ImportantFocus() {
  const [open, setOpen] = useState(false);
  const [queueCount, setQueueCount] = useState(0);
  const [events, setEvents] = useState<ItineraryEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  const refreshCount = useCallback(async () => {
    const supabase = createClient();
    const { count } = await supabase
      .from("events")
      .select("id", { count: "exact", head: true })
      .eq("is_important", true);
    setQueueCount(count ?? 0);
  }, []);

  const loadImportant = useCallback(async () => {
    setLoading(true);
    const supabase = createClient();
    const { data } = await supabase
      .from("events")
      .select("*")
      .eq("is_important", true)
      .order("starts_at", { ascending: true, nullsFirst: false });
    setEvents(data ?? []);
    setQueueCount(data?.length ?? 0);
    setLoading(false);
  }, []);

  const close = useCallback(() => {
    setOpen(false);
    void refreshCount();
  }, [refreshCount]);

  const openFocus = useCallback(() => {
    setOpen(true);
    void loadImportant();
  }, [loadImportant]);

  useEffect(() => {
    void refreshCount();

    const supabase = createClient();
    const channel = supabase
      .channel("important-focus-count")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "events" },
        () => {
          void refreshCount();
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [refreshCount]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, close]);

  useEffect(() => {
    if (!open || loading) return;
    closeRef.current?.focus();
  }, [open, loading]);

  async function unstar(id: string) {
    if (busyId) return;
    setBusyId(id);
    const supabase = createClient();
    const { error } = await supabase
      .from("events")
      .update({ is_important: false })
      .eq("id", id);

    if (!error) {
      setEvents((prev) => prev.filter((event) => event.id !== id));
      setQueueCount((prev) => Math.max(0, prev - 1));
    }
    setBusyId(null);
  }

  return (
    <>
      <button
        type="button"
        onClick={openFocus}
        className="btn-pill btn-pill-gold gap-2"
      >
        Important
        {queueCount > 0 ? (
          <span className="inline-flex min-w-[1.25rem] items-center justify-center rounded-full bg-white/25 px-1.5 py-0.5 text-[0.68rem] font-semibold tabular-nums">
            {queueCount}
          </span>
        ) : null}
      </button>

      {open && typeof document !== "undefined"
        ? createPortal(
          <div
            className="focus-overlay-enter fixed inset-0 z-50 overflow-y-auto overscroll-contain p-4 py-6 md:p-8"
            role="presentation"
          >
            <button
              type="button"
              className="fixed inset-0 bg-[rgba(26,42,34,0.45)] backdrop-blur-[2px]"
              aria-label="Close Important"
              onClick={close}
            />

            <div className="relative z-10 mx-auto flex min-h-[calc(100dvh-3rem)] w-full max-w-2xl items-center justify-center">
              <div
                role="dialog"
                aria-modal="true"
                aria-labelledby="important-focus-title"
                className="focus-panel-enter my-auto w-full max-h-[calc(100dvh-3rem)] overflow-y-auto rounded-2xl border border-[var(--border)] bg-[var(--bg-elevated)] shadow-[0_24px_64px_rgba(26,42,34,0.18)]"
              >
                <div className="border-b border-[var(--border)] bg-[var(--gold)] px-5 py-5 text-[#1a2a22] md:px-7">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-[0.68rem] font-semibold tracking-[0.18em] uppercase opacity-80">
                        Starred items
                      </p>
                      <h2
                        id="important-focus-title"
                        className="mt-1 font-serif text-2xl italic md:text-[1.75rem]"
                      >
                        Important
                      </h2>
                      <p className="mt-1 font-script text-xl opacity-90">
                        keep these close
                      </p>
                    </div>
                    <button
                      ref={closeRef}
                      type="button"
                      onClick={close}
                      className="btn-pill shrink-0 border border-black/10 bg-black/5 px-3 py-1.5 text-xs text-[#1a2a22] hover:bg-black/10"
                    >
                      Close
                    </button>
                  </div>
                </div>

                <div className="px-5 py-6 md:px-7 md:py-8">
                  {loading ? (
                    <p className="text-center text-sm text-[var(--text-muted)]">
                      Loading important items…
                    </p>
                  ) : events.length > 0 ? (
                    <ul className="divide-y divide-[var(--border)]">
                      {events.map((event) => (
                        <li
                          key={event.id}
                          className="flex flex-wrap items-start justify-between gap-3 py-4 first:pt-0 last:pb-0"
                        >
                          <div className="min-w-0 flex-1">
                            <h3 className="font-serif text-lg leading-snug text-[var(--text)]">
                              {event.title}
                            </h3>
                            <p className="mt-1 text-sm text-[var(--text-muted)]">
                              {formatWhen(event.starts_at)}
                              {event.location ? ` · ${event.location}` : ""}
                              {` · ${event.category}`}
                            </p>
                          </div>
                          <button
                            type="button"
                            disabled={busyId === event.id}
                            onClick={() => void unstar(event.id)}
                            className="btn-pill btn-pill-ghost shrink-0 px-3 py-1.5 text-xs"
                          >
                            Unstar
                          </button>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <div className="text-center">
                      <p className="font-serif text-2xl italic text-[var(--text)]">
                        Nothing starred yet
                      </p>
                      <p className="mt-2 text-sm text-[var(--text-muted)]">
                        Tap the star on calendar or week-ahead items to pin
                        them here.
                      </p>
                      <button
                        type="button"
                        onClick={close}
                        className="btn-pill btn-pill-gold mt-6 px-5 py-2"
                      >
                        Back to ops
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>,
          document.body,
        )
        : null}
    </>
  );
}
