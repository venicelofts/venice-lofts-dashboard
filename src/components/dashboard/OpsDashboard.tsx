"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { ItineraryEvent, Source } from "@/lib/database.types";
import {
  CALENDAR_EVENT_SELECT,
  toCalendarEvent,
  type CalendarEvent,
} from "@/lib/calendar/types";
import { FocusNow } from "@/components/dashboard/FocusNow";
import { OnTheCalendar } from "@/components/dashboard/OnTheCalendar";
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
  initialCalendarEvents,
  sources,
  from,
  to,
  calendarFrom,
  calendarTo,
}: {
  initialWeekEvents: ItineraryEvent[];
  initialUpcomingEvents: ItineraryEvent[];
  initialReviewEvents: ItineraryEvent[];
  initialCalendarEvents: CalendarEvent[];
  sources: Source[];
  from: string;
  to: string;
  calendarFrom: string;
  calendarTo: string;
}) {
  const [weekEvents, setWeekEvents] = useState(initialWeekEvents);
  const [upcomingEvents, setUpcomingEvents] = useState(initialUpcomingEvents);
  const [reviewEvents, setReviewEvents] = useState(initialReviewEvents);
  const [calendarEvents, setCalendarEvents] = useState(initialCalendarEvents);
  const [busyId, setBusyId] = useState<string | null>(null);

  const [propStamp, setPropStamp] = useState(() => ({
    week: initialWeekEvents,
    upcoming: initialUpcomingEvents,
    review: initialReviewEvents,
    calendar: initialCalendarEvents,
  }));

  if (
    propStamp.week !== initialWeekEvents ||
    propStamp.upcoming !== initialUpcomingEvents ||
    propStamp.review !== initialReviewEvents ||
    propStamp.calendar !== initialCalendarEvents
  ) {
    setPropStamp({
      week: initialWeekEvents,
      upcoming: initialUpcomingEvents,
      review: initialReviewEvents,
      calendar: initialCalendarEvents,
    });
    setWeekEvents(initialWeekEvents);
    setUpcomingEvents(initialUpcomingEvents);
    setReviewEvents(initialReviewEvents);
    setCalendarEvents(initialCalendarEvents);
  }

  useEffect(() => {
    const supabase = createClient();

    async function refetch() {
      const [weekRes, upcomingRes, reviewRes, calendarRes] = await Promise.all([
        supabase
          .from("events")
          .select("*")
          .or(`starts_at.is.null,and(starts_at.gte.${from},starts_at.lte.${to})`)
          .order("starts_at", { ascending: true, nullsFirst: false }),
        supabase
          .from("events")
          .select("*")
          .gt("starts_at", to)
          .order("starts_at", { ascending: true })
          .limit(8),
        supabase
          .from("events")
          .select("*")
          .eq("needs_review", true)
          .order("created_at", { ascending: false })
          .limit(8),
        supabase
          .from("events")
          .select(CALENDAR_EVENT_SELECT)
          .eq("sources.kind", "calendar")
          .gte("starts_at", calendarFrom)
          .lte("starts_at", calendarTo)
          .order("starts_at", { ascending: true }),
      ]);

      if (weekRes.data) setWeekEvents(weekRes.data);
      if (upcomingRes.data) setUpcomingEvents(upcomingRes.data);
      if (reviewRes.data) setReviewEvents(reviewRes.data);
      if (calendarRes.data) {
        setCalendarEvents(
          calendarRes.data.map((row) =>
            toCalendarEvent(row as Parameters<typeof toCalendarEvent>[0]),
          ),
        );
      }
    }

    const channel = supabase
      .channel("ops-dashboard-realtime")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "events",
        },
        () => {
          void refetch();
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [from, to, calendarFrom, calendarTo]);

  const focusEvent = useMemo(
    () => pickFocus(weekEvents, reviewEvents),
    [weekEvents, reviewEvents],
  );

  async function dismiss(id: string) {
    setBusyId(id);
    const prevWeek = weekEvents;
    const prevUpcoming = upcomingEvents;
    const prevReview = reviewEvents;
    const prevCalendar = calendarEvents;

    setWeekEvents((prev) => prev.filter((event) => event.id !== id));
    setUpcomingEvents((prev) => prev.filter((event) => event.id !== id));
    setReviewEvents((prev) => prev.filter((event) => event.id !== id));
    setCalendarEvents((prev) => prev.filter((event) => event.id !== id));

    const supabase = createClient();
    const { error } = await supabase.from("events").delete().eq("id", id);
    if (error) {
      setWeekEvents(prevWeek);
      setUpcomingEvents(prevUpcoming);
      setReviewEvents(prevReview);
      setCalendarEvents(prevCalendar);
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
    const clearedAt = new Date().toISOString();
    const { error } = await supabase
      .from("events")
      .update({
        needs_review: false,
        confidence: 0.9,
        cleared_at: clearedAt,
      })
      .eq("id", id);

    if (!error) {
      setReviewEvents((prev) => prev.filter((event) => event.id !== id));
      setWeekEvents((prev) =>
        prev.map((event) =>
          event.id === id
            ? { ...event, needs_review: false, confidence: 0.9, cleared_at: clearedAt }
            : event,
        ),
      );
      setUpcomingEvents((prev) =>
        prev.map((event) =>
          event.id === id
            ? { ...event, needs_review: false, confidence: 0.9, cleared_at: clearedAt }
            : event,
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
      <OnTheCalendar events={calendarEvents} />
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
