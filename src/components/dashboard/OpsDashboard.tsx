"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { ItemNote, ItineraryEvent, Source } from "@/lib/database.types";
import {
  CALENDAR_EVENT_SELECT,
  toCalendarEvent,
  type CalendarEvent,
} from "@/lib/calendar/types";
import { FocusNow } from "@/components/dashboard/FocusNow";
import { ImportantEvents } from "@/components/dashboard/ImportantEvents";
import { OnTheCalendar } from "@/components/dashboard/OnTheCalendar";
import { WeekAhead } from "@/components/dashboard/WeekAhead";
import { UpcomingEvents } from "@/components/dashboard/UpcomingEvents";
import { EmailPanels } from "@/components/dashboard/EmailPanels";
import {
  ItemNoteModal,
  type NoteTarget,
} from "@/components/dashboard/ItemNoteModal";
import {
  withSourceKind,
  type DashboardListEvent,
} from "@/components/dashboard/listShared";

function pickFocus(
  weekEvents: DashboardListEvent[],
  reviewEvents: ItineraryEvent[],
) {
  const fromReview = reviewEvents[0];
  if (fromReview) return fromReview;
  return weekEvents.find((e) => e.needs_review) ?? weekEvents[0] ?? null;
}

function notesMapFromRows(notes: ItemNote[]): Record<string, string> {
  const map: Record<string, string> = {};
  for (const note of notes) {
    map[note.source_id] = note.body;
  }
  return map;
}

function patchImportant<T extends { id: string; is_important: boolean }>(
  items: T[],
  id: string,
  important: boolean,
): T[] {
  return items.map((item) =>
    item.id === id ? { ...item, is_important: important } : item,
  );
}

export function OpsDashboard({
  initialWeekEvents,
  initialUpcomingEvents,
  initialReviewEvents,
  initialCalendarEvents,
  initialImportantEvents,
  initialNotes,
  sources,
  from,
  to,
  calendarFrom,
  calendarTo,
}: {
  initialWeekEvents: DashboardListEvent[];
  initialUpcomingEvents: ItineraryEvent[];
  initialReviewEvents: ItineraryEvent[];
  initialCalendarEvents: CalendarEvent[];
  initialImportantEvents: DashboardListEvent[];
  initialNotes: ItemNote[];
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
  const [importantEvents, setImportantEvents] = useState(
    initialImportantEvents,
  );
  const [notesBySourceId, setNotesBySourceId] = useState(() =>
    notesMapFromRows(initialNotes),
  );
  const [busyId, setBusyId] = useState<string | null>(null);
  const [noteBusy, setNoteBusy] = useState(false);
  const [noteTarget, setNoteTarget] = useState<NoteTarget | null>(null);

  const [propStamp, setPropStamp] = useState(() => ({
    week: initialWeekEvents,
    upcoming: initialUpcomingEvents,
    review: initialReviewEvents,
    calendar: initialCalendarEvents,
    important: initialImportantEvents,
    notes: initialNotes,
  }));

  if (
    propStamp.week !== initialWeekEvents ||
    propStamp.upcoming !== initialUpcomingEvents ||
    propStamp.review !== initialReviewEvents ||
    propStamp.calendar !== initialCalendarEvents ||
    propStamp.important !== initialImportantEvents ||
    propStamp.notes !== initialNotes
  ) {
    setPropStamp({
      week: initialWeekEvents,
      upcoming: initialUpcomingEvents,
      review: initialReviewEvents,
      calendar: initialCalendarEvents,
      important: initialImportantEvents,
      notes: initialNotes,
    });
    setWeekEvents(initialWeekEvents);
    setUpcomingEvents(initialUpcomingEvents);
    setReviewEvents(initialReviewEvents);
    setCalendarEvents(initialCalendarEvents);
    setImportantEvents(initialImportantEvents);
    setNotesBySourceId(notesMapFromRows(initialNotes));
  }

  useEffect(() => {
    const supabase = createClient();

    async function refetch() {
      const [weekRes, upcomingRes, reviewRes, calendarRes, importantRes] =
        await Promise.all([
          supabase
            .from("events")
            .select("*, sources(kind)")
            .or(
              `starts_at.is.null,and(starts_at.gte.${from},starts_at.lte.${to})`,
            )
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
          supabase
            .from("events")
            .select("*, sources(kind)")
            .eq("is_important", true)
            .order("starts_at", { ascending: true, nullsFirst: false }),
        ]);

      if (weekRes.data) {
        setWeekEvents(
          weekRes.data.map((row) =>
            withSourceKind(row as Parameters<typeof withSourceKind>[0]),
          ),
        );
      }
      if (upcomingRes.data) setUpcomingEvents(upcomingRes.data);
      if (reviewRes.data) setReviewEvents(reviewRes.data);
      if (calendarRes.data) {
        setCalendarEvents(
          calendarRes.data.map((row) =>
            toCalendarEvent(row as Parameters<typeof toCalendarEvent>[0]),
          ),
        );
      }
      if (importantRes.data) {
        setImportantEvents(
          importantRes.data.map((row) =>
            withSourceKind(row as Parameters<typeof withSourceKind>[0]),
          ),
        );
      }

      const sourceIds = [
        ...new Set(
          [
            ...(weekRes.data ?? []).map((row) =>
              withSourceKind(row as Parameters<typeof withSourceKind>[0]),
            ),
            ...(calendarRes.data ?? []).map((row) =>
              toCalendarEvent(row as Parameters<typeof toCalendarEvent>[0]),
            ),
            ...(importantRes.data ?? []).map((row) =>
              withSourceKind(row as Parameters<typeof withSourceKind>[0]),
            ),
          ]
            .map((e) => e.source_id)
            .filter((id): id is string => Boolean(id)),
        ),
      ];

      if (sourceIds.length > 0) {
        const { data: notes } = await supabase
          .from("item_notes")
          .select("*")
          .in("source_id", sourceIds);
        if (notes) setNotesBySourceId(notesMapFromRows(notes));
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

  function openNote(sourceId: string, title: string) {
    setNoteTarget({
      sourceId,
      title,
      body: notesBySourceId[sourceId] ?? "",
    });
  }

  async function saveNote(sourceId: string, body: string) {
    const trimmed = body.trim();
    if (!trimmed) {
      await clearNote(sourceId);
      return;
    }

    setNoteBusy(true);
    const prev = notesBySourceId;
    setNotesBySourceId((map) => ({ ...map, [sourceId]: trimmed }));

    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setNotesBySourceId(prev);
      setNoteBusy(false);
      return;
    }

    const { error } = await supabase.from("item_notes").upsert(
      {
        user_id: user.id,
        source_id: sourceId,
        body: trimmed,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "source_id" },
    );

    if (error) {
      setNotesBySourceId(prev);
    } else {
      setNoteTarget(null);
    }
    setNoteBusy(false);
  }

  async function clearNote(sourceId: string) {
    setNoteBusy(true);
    const prev = notesBySourceId;
    setNotesBySourceId((map) => {
      const next = { ...map };
      delete next[sourceId];
      return next;
    });

    const supabase = createClient();
    const { error } = await supabase
      .from("item_notes")
      .delete()
      .eq("source_id", sourceId);

    if (error) {
      setNotesBySourceId(prev);
    } else {
      setNoteTarget(null);
    }
    setNoteBusy(false);
  }

  async function dismiss(id: string) {
    setBusyId(id);
    const prevWeek = weekEvents;
    const prevUpcoming = upcomingEvents;
    const prevReview = reviewEvents;
    const prevCalendar = calendarEvents;
    const prevImportant = importantEvents;

    setWeekEvents((prev) => prev.filter((event) => event.id !== id));
    setUpcomingEvents((prev) => prev.filter((event) => event.id !== id));
    setReviewEvents((prev) => prev.filter((event) => event.id !== id));
    setCalendarEvents((prev) => prev.filter((event) => event.id !== id));
    setImportantEvents((prev) => prev.filter((event) => event.id !== id));

    const supabase = createClient();
    const { error } = await supabase.from("events").delete().eq("id", id);
    if (error) {
      setWeekEvents(prevWeek);
      setUpcomingEvents(prevUpcoming);
      setReviewEvents(prevReview);
      setCalendarEvents(prevCalendar);
      setImportantEvents(prevImportant);
    }
    setBusyId(null);
  }

  async function toggleImportant(id: string, important: boolean) {
    setBusyId(id);
    const prevWeek = weekEvents;
    const prevUpcoming = upcomingEvents;
    const prevCalendar = calendarEvents;
    const prevImportant = importantEvents;

    setWeekEvents((prev) => patchImportant(prev, id, important));
    setUpcomingEvents((prev) => patchImportant(prev, id, important));
    setCalendarEvents((prev) => patchImportant(prev, id, important));

    if (important) {
      const fromWeek = weekEvents.find((e) => e.id === id);
      const fromImportant = importantEvents.find((e) => e.id === id);
      const fromCalendar = calendarEvents.find((e) => e.id === id);
      const fromUpcoming = upcomingEvents.find((e) => e.id === id);

      const next: DashboardListEvent | null = fromWeek
        ? { ...fromWeek, is_important: true }
        : fromImportant
          ? { ...fromImportant, is_important: true }
          : fromCalendar
            ? { ...fromCalendar, is_important: true, sourceKind: "calendar" }
            : fromUpcoming
              ? { ...fromUpcoming, is_important: true, sourceKind: null }
              : null;

      if (next) {
        setImportantEvents((prev) => {
          if (prev.some((e) => e.id === id)) {
            return patchImportant(prev, id, true);
          }
          return [...prev, next].sort((a, b) => {
            if (!a.starts_at && !b.starts_at) return 0;
            if (!a.starts_at) return 1;
            if (!b.starts_at) return -1;
            return a.starts_at.localeCompare(b.starts_at);
          });
        });
      }
    } else {
      setImportantEvents((prev) => prev.filter((event) => event.id !== id));
    }

    const supabase = createClient();
    const { error } = await supabase
      .from("events")
      .update({ is_important: important })
      .eq("id", id);

    if (error) {
      setWeekEvents(prevWeek);
      setUpcomingEvents(prevUpcoming);
      setCalendarEvents(prevCalendar);
      setImportantEvents(prevImportant);
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
            ? {
              ...event,
              needs_review: false,
              confidence: 0.9,
              cleared_at: clearedAt,
            }
            : event,
        ),
      );
      setUpcomingEvents((prev) =>
        prev.map((event) =>
          event.id === id
            ? {
              ...event,
              needs_review: false,
              confidence: 0.9,
              cleared_at: clearedAt,
            }
            : event,
        ),
      );
      setImportantEvents((prev) =>
        prev.map((event) =>
          event.id === id
            ? {
              ...event,
              needs_review: false,
              confidence: 0.9,
              cleared_at: clearedAt,
            }
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
      <ImportantEvents
        events={importantEvents}
        busyId={busyId}
        onToggleImportant={(id, important) =>
          void toggleImportant(id, important)
        }
      />
      <OnTheCalendar
        events={calendarEvents}
        busyId={busyId}
        notesBySourceId={notesBySourceId}
        onOpenNote={openNote}
        onToggleImportant={(id, important) =>
          void toggleImportant(id, important)
        }
      />
      <WeekAhead
        events={weekEvents}
        busyId={busyId}
        notesBySourceId={notesBySourceId}
        onDismiss={(id) => void dismiss(id)}
        onOpenNote={openNote}
        onToggleImportant={(id, important) =>
          void toggleImportant(id, important)
        }
      />
      <UpcomingEvents
        events={upcomingEvents}
        busyId={busyId}
        onDismiss={(id) => void dismiss(id)}
      />
      <EmailPanels reviewEvents={reviewEvents} sources={sources} />

      <ItemNoteModal
        target={noteTarget}
        busy={noteBusy}
        onClose={() => {
          if (!noteBusy) setNoteTarget(null);
        }}
        onSave={(sourceId, body) => void saveNote(sourceId, body)}
        onClear={(sourceId) => void clearNote(sourceId)}
      />

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
