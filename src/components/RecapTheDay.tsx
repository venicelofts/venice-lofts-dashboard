"use client";

import {
  addDays,
  endOfDay,
  format,
  isValid,
  parseISO,
  startOfDay,
} from "date-fns";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { createClient } from "@/lib/supabase/client";
import type { ItineraryEvent, ScanRun } from "@/lib/database.types";

type RecapData = {
  todayEvents: ItineraryEvent[];
  confirmedToday: ItineraryEvent[];
  newToday: ItineraryEvent[];
  openReview: ItineraryEvent[];
  tomorrowEvents: ItineraryEvent[];
  lastRun: ScanRun | null;
};

function formatWhen(value: string | null) {
  if (!value) return "No time";
  const d = parseISO(value);
  if (!isValid(d)) return value;
  return format(d, "h:mm a");
}

function dayBounds() {
  const now = new Date();
  const from = startOfDay(now).toISOString();
  const to = endOfDay(now).toISOString();
  const tomorrowFrom = startOfDay(addDays(now, 1)).toISOString();
  const tomorrowTo = endOfDay(addDays(now, 1)).toISOString();
  return { from, to, tomorrowFrom, tomorrowTo };
}

function buildRecapText(data: RecapData, dateLabel: string) {
  const lines: string[] = [`Venice Lofts · Daily recap — ${dateLabel}`, ""];

  lines.push(`Today (${data.todayEvents.length} event${data.todayEvents.length === 1 ? "" : "s"})`);
  if (data.todayEvents.length === 0) {
    lines.push("- Nothing scheduled for today");
  } else {
    for (const event of data.todayEvents) {
      lines.push(`- ${formatWhen(event.starts_at)} · ${event.title}`);
    }
  }

  lines.push("");
  lines.push(
    `Cleared today (${data.confirmedToday.length} item${data.confirmedToday.length === 1 ? "" : "s"})`,
  );
  if (data.confirmedToday.length === 0) {
    lines.push("- No confirmations logged today");
  } else {
    for (const event of data.confirmedToday) {
      lines.push(`- ${event.title}`);
    }
  }

  lines.push("");
  lines.push(`Still open (${data.openReview.length} in review)`);
  if (data.openReview.length === 0) {
    lines.push("- Review queue is clear");
  } else {
    for (const event of data.openReview) {
      lines.push(`- ${event.title}`);
    }
  }

  lines.push("");
  lines.push(
    `Tomorrow (${data.tomorrowEvents.length} event${data.tomorrowEvents.length === 1 ? "" : "s"})`,
  );
  if (data.tomorrowEvents.length === 0) {
    lines.push("- Nothing on the board yet");
  } else {
    for (const event of data.tomorrowEvents) {
      lines.push(`- ${formatWhen(event.starts_at)} · ${event.title}`);
    }
  }

  if (data.lastRun?.finished_at) {
    const synced = parseISO(data.lastRun.finished_at);
    if (isValid(synced)) {
      lines.push("");
      lines.push(`Last synced: ${format(synced, "h:mm a")}`);
    }
  }

  return lines.join("\n");
}

type RecapKind = "today" | "cleared" | "new" | "review" | "tomorrow";

const recapKind = {
  today: {
    badge: "On board",
    accent: "var(--accent)",
    tint: "rgba(27, 77, 62, 0.08)",
    border: "rgba(27, 77, 62, 0.22)",
  },
  cleared: {
    badge: "Cleared",
    accent: "var(--gold)",
    tint: "rgba(184, 146, 63, 0.12)",
    border: "rgba(184, 146, 63, 0.28)",
  },
  new: {
    badge: "New",
    accent: "#3d6b7a",
    tint: "rgba(61, 107, 122, 0.1)",
    border: "rgba(61, 107, 122, 0.24)",
  },
  review: {
    badge: "In review",
    accent: "var(--danger)",
    tint: "rgba(154, 79, 66, 0.1)",
    border: "rgba(154, 79, 66, 0.24)",
  },
  tomorrow: {
    badge: "Tomorrow",
    accent: "#6b7c5e",
    tint: "rgba(107, 124, 94, 0.12)",
    border: "rgba(107, 124, 94, 0.26)",
  },
} as const satisfies Record<
  RecapKind,
  { badge: string; accent: string; tint: string; border: string }
>;

function RecapSection({
  title,
  count,
  empty,
  kind,
  children,
}: {
  title: string;
  count: number;
  empty: string;
  kind: RecapKind;
  children: React.ReactNode;
}) {
  const style = recapKind[kind];
  return (
    <section>
      <h3 className="flex items-center gap-2 text-xs font-semibold tracking-[0.14em] text-[var(--text-faint)] uppercase">
        <span
          aria-hidden="true"
          className="inline-block size-1.5 rounded-full"
          style={{ background: style.accent }}
        />
        {title}
        <span className="text-[var(--text-muted)]">({count})</span>
      </h3>
      {count === 0 ? (
        <p className="mt-2 text-sm text-[var(--text-muted)]">{empty}</p>
      ) : (
        <ul className="mt-2 space-y-2">{children}</ul>
      )}
    </section>
  );
}

function RecapItem({
  title,
  detail,
  kind,
}: {
  title: string;
  detail?: string | null;
  kind: RecapKind;
}) {
  const style = recapKind[kind];
  return (
    <li
      className="rounded-xl border px-3 py-2.5"
      style={{
        background: style.tint,
        borderColor: style.border,
        borderLeftWidth: 3,
        borderLeftColor: style.accent,
      }}
    >
      <p
        className="text-[0.62rem] font-semibold tracking-[0.16em] uppercase"
        style={{ color: style.accent }}
      >
        {style.badge}
      </p>
      <p className="mt-1 font-medium text-[var(--text)]">{title}</p>
      {detail ? <p className="mt-0.5 text-sm text-[var(--text-muted)]">{detail}</p> : null}
    </li>
  );
}

function RecapStat({
  label,
  value,
  kind,
}: {
  label: string;
  value: number;
  kind: RecapKind;
}) {
  const style = recapKind[kind];
  return (
    <div
      className="rounded-xl border px-3 py-3 text-center"
      style={{
        background: style.tint,
        borderColor: style.border,
      }}
    >
      <p className="font-serif text-2xl" style={{ color: style.accent }}>
        {value}
      </p>
      <p
        className="mt-0.5 text-[0.68rem] font-medium tracking-wide uppercase"
        style={{ color: style.accent }}
      >
        {label}
      </p>
    </div>
  );
}

export function RecapTheDay() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [openCount, setOpenCount] = useState(0);
  const [copied, setCopied] = useState(false);
  const [data, setData] = useState<RecapData | null>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  const dateLabel = format(new Date(), "EEEE, MMM d");

  const refreshOpenCount = useCallback(async () => {
    const supabase = createClient();
    const { count } = await supabase
      .from("events")
      .select("id", { count: "exact", head: true })
      .eq("needs_review", true);
    setOpenCount(count ?? 0);
  }, []);

  const loadRecap = useCallback(async () => {
    setLoading(true);
    const supabase = createClient();
    const { from, to, tomorrowFrom, tomorrowTo } = dayBounds();

    const [
      { data: todayEvents },
      { data: confirmedToday },
      { data: newToday },
      { data: openReview },
      { data: tomorrowEvents },
      { data: lastRun },
    ] = await Promise.all([
      supabase
        .from("events")
        .select("*")
        .gte("starts_at", from)
        .lte("starts_at", to)
        .order("starts_at", { ascending: true }),
      supabase
        .from("events")
        .select("*")
        .gte("cleared_at", from)
        .not("cleared_at", "is", null)
        .order("cleared_at", { ascending: false })
        .limit(12),
      supabase
        .from("events")
        .select("*")
        .gte("created_at", from)
        .order("created_at", { ascending: false })
        .limit(12),
      supabase
        .from("events")
        .select("*")
        .eq("needs_review", true)
        .order("created_at", { ascending: false }),
      supabase
        .from("events")
        .select("*")
        .gte("starts_at", tomorrowFrom)
        .lte("starts_at", tomorrowTo)
        .order("starts_at", { ascending: true })
        .limit(6),
      supabase
        .from("scan_runs")
        .select("*")
        .order("started_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);

    setData({
      todayEvents: todayEvents ?? [],
      confirmedToday: confirmedToday ?? [],
      newToday: newToday ?? [],
      openReview: openReview ?? [],
      tomorrowEvents: tomorrowEvents ?? [],
      lastRun: lastRun ?? null,
    });
    setOpenCount(openReview?.length ?? 0);
    setLoading(false);
  }, []);

  const close = useCallback(() => {
    setOpen(false);
    setCopied(false);
    void refreshOpenCount();
  }, [refreshOpenCount]);

  const openRecap = useCallback(() => {
    setOpen(true);
    void loadRecap();
  }, [loadRecap]);

  const recapText = useMemo(
    () => (data ? buildRecapText(data, dateLabel) : ""),
    [data, dateLabel],
  );

  useEffect(() => {
    void refreshOpenCount();
  }, [refreshOpenCount]);

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

  async function copyRecap() {
    if (!recapText) return;
    await navigator.clipboard.writeText(recapText);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  }

  const syncedLabel =
    data?.lastRun?.finished_at && isValid(parseISO(data.lastRun.finished_at))
      ? format(parseISO(data.lastRun.finished_at), "h:mm a")
      : null;

  return (
    <>
      <button type="button" onClick={openRecap} className="btn-pill btn-pill-soft gap-2">
        Recap the day
        {openCount > 0 ? (
          <span className="inline-flex min-w-5 items-center justify-center rounded-full bg-[var(--accent-soft)] px-1.5 py-0.5 text-[0.68rem] font-semibold tabular-nums text-[var(--accent)]">
            {openCount}
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
              aria-label="Close daily recap"
              onClick={close}
            />

            <div className="relative z-10 mx-auto flex min-h-[calc(100dvh-3rem)] w-full max-w-2xl items-center justify-center">
              <div
                role="dialog"
                aria-modal="true"
                aria-labelledby="recap-title"
                className="focus-panel-enter my-auto w-full max-h-[calc(100dvh-3rem)] overflow-y-auto rounded-2xl border border-[var(--border)] bg-[var(--bg-elevated)] shadow-[0_24px_64px_rgba(26,42,34,0.18)]"
              >
                <div className="border-b border-[var(--border)] bg-[var(--accent-mid)] px-5 py-5 text-[#f7f5ef] md:px-7">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-[0.68rem] font-semibold tracking-[0.18em] text-[var(--gold-soft)] uppercase">
                        Daily recap
                      </p>
                      <h2
                        id="recap-title"
                        className="mt-1 font-serif text-2xl italic md:text-[1.75rem]"
                      >
                        Recap the day
                      </h2>
                      <p className="mt-1 font-script text-xl text-[var(--gold-soft)]">
                        {dateLabel}
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

                <div className="space-y-7 px-5 py-6 md:px-7 md:py-8">
                  {loading || !data ? (
                    <p className="text-center text-sm text-[var(--text-muted)]">
                      Pulling today&apos;s recap…
                    </p>
                  ) : (
                    <>
                      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                        <RecapStat
                          label="Today"
                          value={data.todayEvents.length}
                          kind="today"
                        />
                        <RecapStat
                          label="Cleared"
                          value={data.confirmedToday.length}
                          kind="cleared"
                        />
                        <RecapStat
                          label="In review"
                          value={data.openReview.length}
                          kind="review"
                        />
                        <RecapStat
                          label="Tomorrow"
                          value={data.tomorrowEvents.length}
                          kind="tomorrow"
                        />
                      </div>

                      <RecapSection
                        title="On the board today"
                        kind="today"
                        count={data.todayEvents.length}
                        empty="Nothing scheduled for today."
                      >
                        {data.todayEvents.map((event) => (
                          <RecapItem
                            key={event.id}
                            kind="today"
                            title={event.title}
                            detail={`${formatWhen(event.starts_at)} · ${event.category}${event.needs_review ? " · needs review" : ""}`}
                          />
                        ))}
                      </RecapSection>

                      <RecapSection
                        title="Cleared today"
                        kind="cleared"
                        count={data.confirmedToday.length}
                        empty="No confirmations logged today."
                      >
                        {data.confirmedToday.map((event) => (
                          <RecapItem
                            key={event.id}
                            kind="cleared"
                            title={event.title}
                            detail={event.excerpt}
                          />
                        ))}
                      </RecapSection>

                      {data.newToday.length > 0 ? (
                        <RecapSection
                          title="New since this morning"
                          kind="new"
                          count={data.newToday.length}
                          empty=""
                        >
                          {data.newToday.map((event) => (
                            <RecapItem
                              key={event.id}
                              kind="new"
                              title={event.title}
                              detail={
                                event.needs_review
                                  ? "Needs review"
                                  : `Confirmed · ${event.category}`
                              }
                            />
                          ))}
                        </RecapSection>
                      ) : null}

                      <RecapSection
                        title="Still open"
                        kind="review"
                        count={data.openReview.length}
                        empty="Review queue is clear."
                      >
                        {data.openReview.map((event) => (
                          <RecapItem
                            key={event.id}
                            kind="review"
                            title={event.title}
                            detail={`${(event.confidence * 100).toFixed(0)}% confidence · ${event.category}`}
                          />
                        ))}
                      </RecapSection>

                      <RecapSection
                        title="Tomorrow"
                        kind="tomorrow"
                        count={data.tomorrowEvents.length}
                        empty="Nothing on the board for tomorrow yet."
                      >
                        {data.tomorrowEvents.map((event) => (
                          <RecapItem
                            key={event.id}
                            kind="tomorrow"
                            title={event.title}
                            detail={`${formatWhen(event.starts_at)} · ${event.category}`}
                          />
                        ))}
                      </RecapSection>

                      {syncedLabel ? (
                        <p className="text-xs text-[var(--text-faint)]">
                          Last synced at {syncedLabel}
                        </p>
                      ) : null}

                      <div className="flex flex-wrap gap-2 border-t border-[var(--border)] pt-6">
                        <button
                          type="button"
                          onClick={() => void copyRecap()}
                          className="btn-pill btn-pill-primary px-5 py-2"
                        >
                          {copied ? "Copied" : "Copy recap"}
                        </button>
                        <button
                          ref={closeRef}
                          type="button"
                          onClick={close}
                          className="btn-pill btn-pill-ghost px-5 py-2"
                        >
                          Done
                        </button>
                      </div>
                    </>
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
