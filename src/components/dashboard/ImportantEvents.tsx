"use client";

import { format, isValid, parseISO } from "date-fns";
import {
  ListPagination,
  SourceKindBadge,
  StarButton,
  importantRowClass,
  useListPage,
} from "@/components/dashboard/ListControls";
import type { DashboardListEvent } from "@/components/dashboard/listShared";

function dateBadge(value: string | null) {
  if (!value) return { day: "TBD", time: "No time" };
  const d = parseISO(value);
  if (!isValid(d)) return { day: "TBD", time: value };
  return {
    day: format(d, "EEE M/d").toUpperCase(),
    time: format(d, "h:mm a"),
  };
}

export function ImportantEvents({
  events,
  busyId = null,
  onToggleImportant,
}: {
  events: DashboardListEvent[];
  busyId?: string | null;
  onToggleImportant?: (id: string, important: boolean) => void;
}) {
  const { page, totalPages, setPage, slice } = useListPage(events.length);
  const pageEvents = slice(events);

  if (events.length === 0) return null;

  return (
    <section id="important" className="fade-up scroll-mt-6">
      <div className="mb-1 flex flex-wrap items-end justify-between gap-2">
        <h2 className="section-title">Important</h2>
        <span className="text-sm text-[var(--text-muted)]">
          {events.length} starred
        </span>
      </div>
      <p className="font-script mb-5 text-xl text-[var(--gold)]">
        Keep these close
      </p>

      <ul className="divide-y divide-[var(--border)] overflow-hidden rounded-xl border border-[var(--gold-muted)]">
        {pageEvents.map((event) => {
          const when = dateBadge(event.starts_at);

          return (
            <li
              key={event.id}
              className={`flex flex-wrap items-start gap-3 px-3 py-3.5 md:gap-5 md:px-4 ${importantRowClass(true)}`}
            >
              <div className="flex min-w-[9.5rem] shrink-0 items-baseline gap-2 pt-0.5 pl-2">
                <span className="rounded-md bg-[var(--gold-soft)] px-2 py-0.5 text-[0.7rem] font-semibold tracking-wide text-[var(--text)]">
                  {when.day}
                </span>
                <span className="text-sm font-medium text-[var(--text)]">
                  {when.time}
                </span>
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                  <h3 className="font-serif text-lg leading-snug text-[var(--text)]">
                    {event.title}
                  </h3>
                  <SourceKindBadge kind={event.sourceKind} />
                </div>
                <p className="mt-0.5 text-sm text-[var(--text-muted)]">
                  {[event.location, event.category]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
              </div>

              {onToggleImportant ? (
                <div className="flex shrink-0 items-center">
                  <StarButton
                    important
                    disabled={busyId === event.id}
                    onClick={() => onToggleImportant(event.id, false)}
                  />
                </div>
              ) : null}
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
