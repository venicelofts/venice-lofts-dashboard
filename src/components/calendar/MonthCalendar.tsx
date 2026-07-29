"use client";

import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  isToday,
  isValid,
  parseISO,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import { useMemo, useState } from "react";
import type { CalendarEvent } from "@/lib/calendar/types";

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const MAX_CHIPS = 3;

function eventTimeLabel(event: CalendarEvent) {
  if (event.isAllDay) return "All day";
  if (!event.starts_at) return "";
  const d = parseISO(event.starts_at);
  if (!isValid(d)) return "";
  return format(d, "h:mm a");
}

function eventRangeLabel(event: CalendarEvent) {
  if (event.isAllDay) return "All day";
  if (!event.starts_at) return "Time TBD";
  const start = parseISO(event.starts_at);
  if (!isValid(start)) return event.starts_at;
  const startLabel = format(start, "h:mm a");
  if (!event.ends_at) return startLabel;
  const end = parseISO(event.ends_at);
  if (!isValid(end)) return startLabel;
  return `${startLabel} – ${format(end, "h:mm a")}`;
}

export function MonthCalendar({
  initialEvents,
  initialMonth,
}: {
  initialEvents: CalendarEvent[];
  initialMonth: string;
}) {
  const [cursor, setCursor] = useState(() => {
    const d = parseISO(initialMonth);
    return isValid(d) ? startOfMonth(d) : startOfMonth(new Date());
  });
  const [selected, setSelected] = useState<Date>(() => new Date());
  const [events] = useState(initialEvents);

  const days = useMemo(() => {
    const monthStart = startOfMonth(cursor);
    const monthEnd = endOfMonth(cursor);
    const gridStart = startOfWeek(monthStart, { weekStartsOn: 1 });
    const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
    return eachDayOfInterval({ start: gridStart, end: gridEnd });
  }, [cursor]);

  const eventsByDay = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    for (const event of events) {
      if (!event.starts_at) continue;
      const d = parseISO(event.starts_at);
      if (!isValid(d)) continue;
      const key = format(d, "yyyy-MM-dd");
      const list = map.get(key) ?? [];
      list.push(event);
      map.set(key, list);
    }
    for (const list of map.values()) {
      list.sort((a, b) => {
        const aT = a.starts_at ? Date.parse(a.starts_at) : 0;
        const bT = b.starts_at ? Date.parse(b.starts_at) : 0;
        return aT - bT;
      });
    }
    return map;
  }, [events]);

  const selectedKey = format(selected, "yyyy-MM-dd");
  const selectedEvents = eventsByDay.get(selectedKey) ?? [];

  return (
    <div className="fade-up flex flex-col gap-8 lg:grid lg:grid-cols-[minmax(0,1.6fr)_minmax(16rem,1fr)] lg:items-start lg:gap-10">
      <div>
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-serif text-2xl font-semibold tracking-tight text-[var(--text)] md:text-3xl">
            {format(cursor, "MMMM yyyy")}
          </h2>
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="btn-pill btn-pill-ghost px-3"
              onClick={() => setCursor((d) => addMonths(d, -1))}
              aria-label="Previous month"
            >
              ←
            </button>
            <button
              type="button"
              className="btn-pill btn-pill-ghost px-3"
              onClick={() => {
                const today = new Date();
                setCursor(startOfMonth(today));
                setSelected(today);
              }}
            >
              Today
            </button>
            <button
              type="button"
              className="btn-pill btn-pill-ghost px-3"
              onClick={() => setCursor((d) => addMonths(d, 1))}
              aria-label="Next month"
            >
              →
            </button>
          </div>
        </div>

        <div className="grid grid-cols-7 gap-px overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--border)]">
          {WEEKDAYS.map((label) => (
            <div
              key={label}
              className="bg-[var(--bg-soft)] px-2 py-2 text-center text-[0.65rem] font-semibold tracking-[0.12em] text-[var(--text-faint)] uppercase"
            >
              {label}
            </div>
          ))}

          {days.map((day) => {
            const key = format(day, "yyyy-MM-dd");
            const dayEvents = eventsByDay.get(key) ?? [];
            const inMonth = isSameMonth(day, cursor);
            const selectedDay = isSameDay(day, selected);
            const today = isToday(day);
            const overflow = Math.max(0, dayEvents.length - MAX_CHIPS);

            return (
              <button
                key={key}
                type="button"
                onClick={() => setSelected(day)}
                className={`flex min-h-[5.5rem] flex-col gap-1 bg-[var(--bg-elevated)] p-1.5 text-left transition-colors md:min-h-[6.5rem] md:p-2 ${inMonth ? "" : "opacity-40"
                  } ${selectedDay
                    ? "ring-2 ring-inset ring-[var(--accent)]"
                    : "hover:bg-[var(--bg-soft)]"
                  }`}
              >
                <span
                  className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold ${today
                      ? "bg-[var(--accent)] text-white"
                      : "text-[var(--text-muted)]"
                    }`}
                >
                  {format(day, "d")}
                </span>
                <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                  {dayEvents.slice(0, MAX_CHIPS).map((event) => (
                    <span
                      key={event.id}
                      className="truncate rounded-md bg-[var(--accent-soft)] px-1 py-0.5 text-[0.65rem] leading-tight text-[var(--accent)]"
                      title={event.title}
                    >
                      <span className="font-medium">
                        {eventTimeLabel(event)}
                      </span>{" "}
                      {event.title}
                    </span>
                  ))}
                  {overflow > 0 ? (
                    <span className="px-1 text-[0.65rem] text-[var(--text-faint)]">
                      +{overflow} more
                    </span>
                  ) : null}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <aside className="rounded-xl border border-[var(--border)] bg-[var(--bg-elevated)] p-4 md:p-5">
        <h3 className="font-serif text-xl font-medium text-[var(--text)]">
          {format(selected, "EEEE, MMM d")}
        </h3>
        <p className="mt-1 font-script text-lg text-[var(--gold)]">
          Outlook calendar
        </p>

        {selectedEvents.length === 0 ? (
          <p className="mt-6 text-sm text-[var(--text-muted)]">
            No events on this day.
          </p>
        ) : (
          <ul className="mt-5 divide-y divide-[var(--border)]">
            {selectedEvents.map((event) => (
              <li key={event.id} className="py-3.5 first:pt-0 last:pb-0">
                <p className="text-xs font-semibold tracking-wide text-[var(--text-faint)] uppercase">
                  {eventRangeLabel(event)}
                </p>
                <p className="mt-1 font-serif text-lg leading-snug text-[var(--text)]">
                  {event.title}
                </p>
                {event.location ? (
                  <p className="mt-1 text-sm text-[var(--text-muted)]">
                    {event.location}
                  </p>
                ) : null}
                {event.webLink ? (
                  <a
                    href={event.webLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-2 inline-block text-sm text-[var(--accent)] underline-offset-2 hover:underline"
                  >
                    Open in Outlook
                  </a>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </aside>
    </div>
  );
}
