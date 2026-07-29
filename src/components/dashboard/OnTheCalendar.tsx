"use client";

import { format, isValid, parseISO } from "date-fns";
import Link from "next/link";
import type { CalendarEvent } from "@/lib/calendar/types";

function timeLabel(event: CalendarEvent) {
  if (event.isAllDay) return "All day";
  if (!event.starts_at) return "TBD";
  const d = parseISO(event.starts_at);
  if (!isValid(d)) return "TBD";
  return format(d, "EEE h:mm a");
}

export function OnTheCalendar({ events }: { events: CalendarEvent[] }) {
  if (events.length === 0) return null;

  return (
    <section className="fade-up">
      <div className="mb-1 flex flex-wrap items-end justify-between gap-2">
        <h2 className="section-title">On the calendar</h2>
        <Link
          href="/calendar"
          className="text-sm text-[var(--text-muted)] underline-offset-2 hover:text-[var(--accent)] hover:underline"
        >
          Open calendar →
        </Link>
      </div>
      <p className="font-script mb-5 text-xl text-[var(--gold)]">
        Today and the next two days from Outlook
      </p>

      <ul className="divide-y divide-[var(--border)] border-y border-[var(--border)]">
        {events.map((event) => (
          <li
            key={event.id}
            className="flex flex-wrap items-baseline gap-x-4 gap-y-1 py-3"
          >
            <span className="min-w-[7.5rem] shrink-0 text-xs font-semibold tracking-wide text-[var(--text-faint)] uppercase">
              {timeLabel(event)}
            </span>
            <div className="min-w-0 flex-1">
              <p className="font-serif text-lg leading-snug text-[var(--text)]">
                {event.title}
              </p>
              {event.location ? (
                <p className="mt-0.5 text-sm text-[var(--text-muted)]">
                  {event.location}
                </p>
              ) : null}
            </div>
            {event.webLink ? (
              <a
                href={event.webLink}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-[var(--accent)] underline-offset-2 hover:underline"
              >
                Outlook
              </a>
            ) : null}
          </li>
        ))}
      </ul>
    </section>
  );
}
