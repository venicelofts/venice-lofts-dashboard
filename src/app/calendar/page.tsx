import {
  addMonths,
  endOfMonth,
  format,
  startOfMonth,
  startOfWeek,
  endOfWeek,
} from "date-fns";
import { AppShell } from "@/components/AppShell";
import { MonthCalendar } from "@/components/calendar/MonthCalendar";
import {
  CALENDAR_EVENT_SELECT,
  toCalendarEvent,
  type CalendarEvent,
} from "@/lib/calendar/types";
import { createClient } from "@/lib/supabase/server";

export default async function CalendarPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const now = new Date();
  const rangeStart = startOfWeek(startOfMonth(addMonths(now, -1)), {
    weekStartsOn: 1,
  });
  const rangeEnd = endOfWeek(endOfMonth(addMonths(now, 2)), {
    weekStartsOn: 1,
  });

  const { data } = await supabase
    .from("events")
    .select(CALENDAR_EVENT_SELECT)
    .eq("sources.kind", "calendar")
    .gte("starts_at", rangeStart.toISOString())
    .lte("starts_at", rangeEnd.toISOString())
    .order("starts_at", { ascending: true });

  const events: CalendarEvent[] = (data ?? []).map((row) =>
    toCalendarEvent(row as Parameters<typeof toCalendarEvent>[0]),
  );

  return (
    <AppShell email={user.email}>
      <div className="mb-6">
        <h2 className="section-title">Calendar</h2>
      </div>

      <MonthCalendar
        initialEvents={events}
        initialMonth={format(startOfMonth(now), "yyyy-MM-dd")}
      />
    </AppShell>
  );
}
