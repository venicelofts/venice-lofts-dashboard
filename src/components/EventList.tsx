import { format, parseISO, isValid } from "date-fns";
import type { ItineraryEvent } from "@/lib/database.types";

function formatWhen(value: string | null) {
  if (!value) return "No time";
  const d = parseISO(value);
  if (!isValid(d)) return value;
  return format(d, "EEE MMM d · h:mm a");
}

const categoryColor: Record<string, string> = {
  flight: "#3d9cf0",
  hotel: "#a78bfa",
  meeting: "#3ecf8e",
  deadline: "#e6a23c",
  travel: "#67e8f9",
  other: "#8b9aab",
};

export function EventList({ events }: { events: ItineraryEvent[] }) {
  if (events.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-[var(--border)] bg-[var(--bg-elevated)] px-4 py-10 text-center text-[var(--text-muted)]">
        No events yet. Run <code className="font-mono text-[var(--accent)]">pnpm scan</code> after
        configuring Graph mail or folders.
      </p>
    );
  }

  return (
    <ul className="space-y-3">
      {events.map((event) => (
        <li
          key={event.id}
          className="rounded-lg border border-[var(--border)] bg-[var(--bg-elevated)] px-4 py-3"
        >
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <div className="flex items-center gap-2">
                <span
                  className="inline-block h-2 w-2 rounded-full"
                  style={{ background: categoryColor[event.category] ?? categoryColor.other }}
                />
                <h3 className="font-medium">{event.title}</h3>
              </div>
              <p className="mt-1 text-sm text-[var(--text-muted)]">
                {formatWhen(event.starts_at)}
                {event.location ? ` · ${event.location}` : ""}
              </p>
            </div>
            <div className="font-mono text-xs text-[var(--text-muted)]">
              {event.category}
              {event.needs_review ? (
                <span className="ml-2 text-[var(--warn)]">needs review</span>
              ) : null}
            </div>
          </div>
          {event.excerpt ? (
            <p className="mt-2 line-clamp-2 text-sm text-[var(--text-muted)]">{event.excerpt}</p>
          ) : null}
        </li>
      ))}
    </ul>
  );
}
