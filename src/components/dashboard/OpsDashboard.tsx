"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { ItineraryEvent, Source } from "@/lib/database.types";
import { FocusNow } from "@/components/dashboard/FocusNow";
import { WeekAhead } from "@/components/dashboard/WeekAhead";
import { UpcomingEvents } from "@/components/dashboard/UpcomingEvents";
import { EmailPanels } from "@/components/dashboard/EmailPanels";

function pickFocus(weekEvents: ItineraryEvent[], reviewEvents: ItineraryEvent[]) {
  const fromReview = reviewEvents[0];
  if (fromReview) return fromReview;
  return weekEvents.find((e) => e.needs_review) ?? weekEvents[0] ?? null;
}

export function OpsDashboard({
  initialWeekEvents,
  initialUpcomingEvents,
  initialReviewEvents,
  sources,
  userId,
  from,
  to,
}: {
  initialWeekEvents: ItineraryEvent[];
  initialUpcomingEvents: ItineraryEvent[];
  initialReviewEvents: ItineraryEvent[];
  sources: Source[];
  userId: string;
  from: string;
  to: string;
}) {
  const [weekEvents, setWeekEvents] = useState(initialWeekEvents);
  const [upcomingEvents, setUpcomingEvents] = useState(initialUpcomingEvents);
  const [reviewEvents, setReviewEvents] = useState(initialReviewEvents);
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    setWeekEvents(initialWeekEvents);
    setUpcomingEvents(initialUpcomingEvents);
    setReviewEvents(initialReviewEvents);
  }, [initialWeekEvents, initialUpcomingEvents, initialReviewEvents]);

  useEffect(() => {
    const supabase = createClient();

    async function refetch() {
      const [weekRes, upcomingRes, reviewRes] = await Promise.all([
        supabase
          .from("events")
          .select("*")
          .eq("user_id", userId)
          .or(`starts_at.is.null,and(starts_at.gte.${from},starts_at.lte.${to})`)
          .order("starts_at", { ascending: true, nullsFirst: false }),
        supabase
          .from("events")
          .select("*")
          .eq("user_id", userId)
          .gt("starts_at", to)
          .order("starts_at", { ascending: true })
          .limit(8),
        supabase
          .from("events")
          .select("*")
          .eq("user_id", userId)
          .eq("needs_review", true)
          .order("created_at", { ascending: false })
          .limit(8),
      ]);

      if (weekRes.data) setWeekEvents(weekRes.data);
      if (upcomingRes.data) setUpcomingEvents(upcomingRes.data);
      if (reviewRes.data) setReviewEvents(reviewRes.data);
    }

    const channel = supabase
      .channel("ops-dashboard-realtime")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "events",
          filter: `user_id=eq.${userId}`,
        },
        () => {
          void refetch();
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [userId, from, to]);

  const focusEvent = useMemo(
    () => pickFocus(weekEvents, reviewEvents),
    [weekEvents, reviewEvents],
  );

  async function dismiss(id: string) {
    setBusyId(id);
    const prevWeek = weekEvents;
    const prevUpcoming = upcomingEvents;
    const prevReview = reviewEvents;

    setWeekEvents((prev) => prev.filter((event) => event.id !== id));
    setUpcomingEvents((prev) => prev.filter((event) => event.id !== id));
    setReviewEvents((prev) => prev.filter((event) => event.id !== id));

    const supabase = createClient();
    const { error } = await supabase.from("events").delete().eq("id", id);
    if (error) {
      setWeekEvents(prevWeek);
      setUpcomingEvents(prevUpcoming);
      setReviewEvents(prevReview);
    }
    setBusyId(null);
  }

  async function completeFocus(id: string) {
    const target =
      weekEvents.find((e) => e.id === id) ??
      reviewEvents.find((e) => e.id === id) ??
      upcomingEvents.find((e) => e.id === id);

    if (!target) return;

    if (!target.needs_review) {
      await dismiss(id);
      return;
    }

    setBusyId(id);
    const supabase = createClient();
    const { error } = await supabase
      .from("events")
      .update({ needs_review: false, confidence: 0.9 })
      .eq("id", id);

    if (!error) {
      setReviewEvents((prev) => prev.filter((event) => event.id !== id));
      setWeekEvents((prev) =>
        prev.map((event) =>
          event.id === id ? { ...event, needs_review: false, confidence: 0.9 } : event,
        ),
      );
      setUpcomingEvents((prev) =>
        prev.map((event) =>
          event.id === id ? { ...event, needs_review: false, confidence: 0.9 } : event,
        ),
      );
    }
    setBusyId(null);
  }

  return (
    <div className="flex flex-col gap-10">
      <FocusNow
        event={focusEvent}
        busy={busyId === focusEvent?.id}
        onDone={(id) => void completeFocus(id)}
      />
      <WeekAhead
        events={weekEvents}
        busyId={busyId}
        onDismiss={(id) => void dismiss(id)}
      />
      <UpcomingEvents
        events={upcomingEvents}
        busyId={busyId}
        onDismiss={(id) => void dismiss(id)}
      />
      <EmailPanels reviewEvents={reviewEvents} sources={sources} />

      <div
        className="mt-2 flex h-1.5 overflow-hidden rounded-full"
        aria-hidden
      >
        <span className="w-[42%] bg-[var(--accent)]" />
        <span className="w-[28%] bg-[var(--accent-mid)]" />
        <span className="w-[30%] bg-[var(--gold)]" />
      </div>
    </div>
  );
}
