import {
  addDays,
  endOfDay,
  endOfWeek,
  format,
  isValid,
  parseISO,
  startOfDay,
} from "date-fns";
import { AppShell } from "@/components/AppShell";
import { OpsDashboard } from "@/components/dashboard/OpsDashboard";
import {
  CALENDAR_EVENT_SELECT,
  toCalendarEvent,
  type CalendarEvent,
} from "@/lib/calendar/types";
import { withSourceKind } from "@/components/dashboard/listShared";
import { createClient } from "@/lib/supabase/server";

function formatLastSynced(finishedAt: string | null | undefined, hasRun: boolean) {
  if (!finishedAt) return hasRun ? "running / incomplete" : null;
  const d = parseISO(finishedAt);
  if (!isValid(d)) return finishedAt;
  return format(d, "h:mm a EEE, MMM d");
}

export default async function TodayPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const from = startOfDay(new Date()).toISOString();
  const to = endOfWeek(new Date(), { weekStartsOn: 1 }).toISOString();
  const calendarFrom = from;
  const calendarTo = endOfDay(addDays(new Date(), 2)).toISOString();

  const [
    { data: weekEvents },
    { data: upcomingEvents },
    { data: reviewEvents },
    { data: calendarRows },
    { data: importantRows },
    { data: sources },
    { data: lastRun },
  ] = await Promise.all([
    supabase
      .from("events")
      .select("*, sources(kind)")
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
    supabase
      .from("events")
      .select("*, sources(kind)")
      .eq("is_important", true)
      .order("starts_at", { ascending: true, nullsFirst: false }),
    supabase
      .from("sources")
      .select("*")
      .eq("kind", "email")
      .order("last_scanned_at", { ascending: false })
      .limit(8),
    supabase
      .from("scan_runs")
      .select("*")
      .order("started_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  const calendarEvents: CalendarEvent[] = (calendarRows ?? []).map((row) =>
    toCalendarEvent(row as Parameters<typeof toCalendarEvent>[0]),
  );

  const weekListEvents = (weekEvents ?? []).map((row) =>
    withSourceKind(row as Parameters<typeof withSourceKind>[0]),
  );

  const importantEvents = (importantRows ?? []).map((row) =>
    withSourceKind(row as Parameters<typeof withSourceKind>[0]),
  );

  const sourceIds = [
    ...new Set(
      [...weekListEvents, ...calendarEvents, ...importantEvents]
        .map((e) => e.source_id)
        .filter((id): id is string => Boolean(id)),
    ),
  ];

  const { data: notes } =
    sourceIds.length > 0
      ? await supabase.from("item_notes").select("*").in("source_id", sourceIds)
      : { data: [] };

  return (
    <AppShell
      email={user.email}
      lastSyncedLabel={formatLastSynced(lastRun?.finished_at, Boolean(lastRun))}
    >
      {/* <OpsDashboard
        initialWeekEvents={weekListEvents}
        initialUpcomingEvents={upcomingEvents ?? []}
        initialReviewEvents={reviewEvents ?? []}
        initialCalendarEvents={calendarEvents}
        initialImportantEvents={importantEvents}
        initialNotes={notes ?? []}
        sources={sources ?? []}
        from={from}
        to={to}
        calendarFrom={calendarFrom}
        calendarTo={calendarTo}
      /> */}
      <div>
        <h1>Due to lack of consideration for the developers time, this project has been abandoned</h1>
      </div>
    </AppShell>
  );
}
