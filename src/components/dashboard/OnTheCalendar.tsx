"use client";

import { format, isValid, parseISO } from "date-fns";
import Link from "next/link";
import type { CalendarEvent } from "@/lib/calendar/types";
import {
  ListPagination,
  NoteButton,
  OutlookButton,
  useListPage,
} from "@/components/dashboard/ListControls";

function timeLabel(event: CalendarEvent) {
  if (event.isAllDay) return "All day";
  if (!event.starts_at) return "TBD";
  const d = parseISO(event.starts_at);
  if (!isValid(d)) return "TBD";
  return format(d, "EEE h:mm a");
}

export function OnTheCalendar({
  events,
  notesBySourceId = {},
  onOpenNote,
}: {
  events: CalendarEvent[];
  notesBySourceId?: Record<string, string>;
  onOpenNote?: (sourceId: string, title: string) => void;
}) {
  const { page, totalPages, setPage, slice } = useListPage(events.length);
  const pageEvents = slice(events);

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
        {pageEvents.map((event) => {
          const note =
            event.source_id != null
              ? notesBySourceId[event.source_id]
              : undefined;
          const hasNote = Boolean(note?.trim());

          return (
            <li
              key={event.id}
              className="flex flex-wrap items-center gap-x-4 gap-y-2 py-3"
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
                {hasNote ? (
                  <p className="mt-1 line-clamp-1 text-sm italic text-[var(--text-muted)]">
                    {note}
                  </p>
                ) : null}
              </div>
              <div className="flex shrink-0 items-center gap-2">
                {event.source_id && onOpenNote ? (
                  <NoteButton
                    hasNote={hasNote}
                    onClick={() => onOpenNote(event.source_id!, event.title)}
                  />
                ) : null}
                {event.webLink ? <OutlookButton href={event.webLink} /> : null}
              </div>
            </li>
          );
        })}
      </ul>
      <ListPagination
        page={page}
        totalPages={totalPages}
        onPageChange={setPage}
      />
    </section>
  );
}
