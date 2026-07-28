"use client";

import { format, isValid, parseISO } from "date-fns";
import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { createClient } from "@/lib/supabase/client";
import type { ItineraryEvent } from "@/lib/database.types";

function formatWhen(value: string | null) {
  if (!value) return null;
  const d = parseISO(value);
  if (!isValid(d)) return value;
  return format(d, "EEE MMM d · h:mm a");
}

export function GetItDoneFocus() {
  const [open, setOpen] = useState(false);
  const [queueCount, setQueueCount] = useState(0);
  const [events, setEvents] = useState<ItineraryEvent[]>([]);
  const [initialCount, setInitialCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const confirmRef = useRef<HTMLButtonElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  const refreshCount = useCallback(async () => {
    const supabase = createClient();
    const { count } = await supabase
      .from("events")
      .select("id", { count: "exact", head: true })
      .eq("needs_review", true);
    setQueueCount(count ?? 0);
  }, []);

  const loadQueue = useCallback(async () => {
    setLoading(true);
    const supabase = createClient();
    const { data } = await supabase
      .from("events")
      .select("*")
      .eq("needs_review", true)
      .order("created_at", { ascending: false });
    const items = data ?? [];
    setEvents(items);
    setInitialCount(items.length);
    setQueueCount(items.length);
    setLoading(false);
  }, []);

  const close = useCallback(() => {
    setOpen(false);
    void refreshCount();
  }, [refreshCount]);

  const openFocus = useCallback(() => {
    setOpen(true);
    void loadQueue();
  }, [loadQueue]);

  useEffect(() => {
    void refreshCount();
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
    if (!open || loading || busy) return;
    const target = events.length > 0 ? confirmRef.current : closeRef.current;
    target?.focus();
  }, [open, loading, busy, events.length]);

  async function confirmCurrent() {
    const current = events[0];
    if (!current || busy) return;

    setBusy(true);
    const supabase = createClient();
    const { error } = await supabase
      .from("events")
      .update({
        needs_review: false,
        confidence: 0.9,
        cleared_at: new Date().toISOString(),
      })
      .eq("id", current.id);

    if (!error) {
      setEvents((prev) => prev.slice(1));
      setQueueCount((prev) => Math.max(0, prev - 1));
    }
    setBusy(false);
  }

  async function dismissCurrent() {
    const current = events[0];
    if (!current || busy) return;

    setBusy(true);
    const supabase = createClient();
    const { error } = await supabase.from("events").delete().eq("id", current.id);

    if (!error) {
      setEvents((prev) => prev.slice(1));
      setQueueCount((prev) => Math.max(0, prev - 1));
    }
    setBusy(false);
  }

  const current = events[0] ?? null;
  const completed = initialCount - events.length;
  const position = events.length > 0 ? completed + 1 : completed;
  const when = current ? formatWhen(current.starts_at) : null;

  return (
    <>
      <button
        type="button"
        onClick={openFocus}
        className="btn-pill btn-pill-primary gap-2"
      >
        Let&apos;s get it done
        {queueCount > 0 ? (
          <span className="inline-flex min-w-[1.25rem] items-center justify-center rounded-full bg-white/20 px-1.5 py-0.5 text-[0.68rem] font-semibold tabular-nums">
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
              aria-label="Close focus mode"
              onClick={close}
            />

            <div className="relative z-10 mx-auto flex min-h-[calc(100dvh-3rem)] w-full max-w-2xl items-center justify-center">
              <div
                role="dialog"
                aria-modal="true"
                aria-labelledby="focus-mode-title"
                className="focus-panel-enter my-auto w-full max-h-[calc(100dvh-3rem)] overflow-y-auto rounded-2xl border border-[var(--border)] bg-[var(--bg-elevated)] shadow-[0_24px_64px_rgba(26,42,34,0.18)]"
              >
                <div className="border-b border-[var(--border)] bg-[var(--accent)] px-5 py-5 text-[#f7f5ef] md:px-7">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-[0.68rem] font-semibold tracking-[0.18em] text-[var(--gold-soft)] uppercase">
                        Focus mode
                      </p>
                      <h2
                        id="focus-mode-title"
                        className="mt-1 font-serif text-2xl italic md:text-[1.75rem]"
                      >
                        Let&apos;s get it done
                      </h2>
                      <p className="mt-1 font-script text-xl text-[var(--gold-soft)]">
                        keep the day clear
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={close}
                      className="btn-pill shrink-0 border border-white/20 bg-white/10 px-3 py-1.5 text-xs !text-white hover:bg-white/20 hover:!text-white"
                    >
                      Close
                    </button>
                  </div>
                </div>

                <div className="px-5 py-6 md:px-7 md:py-8">
                  {loading ? (
                    <p className="text-center text-sm text-[var(--text-muted)]">
                      Loading review queue…
                    </p>
                  ) : current ? (
                    <div>
                      <p className="text-xs font-medium tracking-[0.14em] text-[var(--text-faint)] uppercase">
                        {position} of {initialCount}
                      </p>
                      <h3 className="mt-3 font-serif text-2xl font-medium leading-snug text-[var(--text)] md:text-[1.65rem]">
                        {current.title}
                      </h3>
                      <p className="mt-2 text-sm text-[var(--text-muted)]">
                        confidence {(current.confidence * 100).toFixed(0)}% · {current.category}
                        {when ? ` · ${when}` : ""}
                      </p>
                      {current.excerpt ? (
                        <p className="mt-4 rounded-xl border border-[var(--border)] bg-[var(--bg-soft)] px-4 py-3 text-sm leading-relaxed text-[var(--text-muted)]">
                          {current.excerpt}
                        </p>
                      ) : null}
                      <div className="mt-8 flex flex-wrap gap-2">
                        <button
                          ref={confirmRef}
                          type="button"
                          disabled={busy}
                          onClick={() => void confirmCurrent()}
                          className="btn-pill btn-pill-primary px-5 py-2"
                        >
                          Confirm
                        </button>
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => void dismissCurrent()}
                          className="btn-pill btn-pill-ghost px-5 py-2 text-[var(--danger)]"
                        >
                          Dismiss
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center">
                      <p className="font-serif text-2xl italic text-[var(--text)]">
                        Nothing left — day is clear
                      </p>
                      <p className="mt-2 text-sm text-[var(--text-muted)]">
                        {initialCount > 0
                          ? `You cleared ${initialCount} item${initialCount === 1 ? "" : "s"} from review.`
                          : "No items were waiting in review."}
                      </p>
                      <button
                        ref={closeRef}
                        type="button"
                        onClick={close}
                        className="btn-pill btn-pill-primary mt-6 px-5 py-2"
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
