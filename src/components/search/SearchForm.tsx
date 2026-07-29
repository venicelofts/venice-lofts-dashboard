import type { EventCategory, SourceKind } from "@/lib/database.types";

const CATEGORIES: Array<{ value: "" | EventCategory; label: string }> = [
  { value: "", label: "All categories" },
  { value: "flight", label: "Flight" },
  { value: "hotel", label: "Hotel" },
  { value: "meeting", label: "Meeting" },
  { value: "deadline", label: "Deadline" },
  { value: "travel", label: "Travel" },
  { value: "other", label: "Other" },
];

const KINDS: Array<{ value: "" | SourceKind; label: string }> = [
  { value: "", label: "All sources" },
  { value: "email", label: "Email" },
  { value: "calendar", label: "Calendar" },
  { value: "file", label: "File" },
];

const SCOPES = [
  { value: "all", label: "Everything" },
  { value: "events", label: "Events" },
  { value: "sources", label: "Sources" },
] as const;

export type SearchScope = (typeof SCOPES)[number]["value"];

const fieldClass =
  "rounded-full border border-[var(--border-strong)] bg-[var(--bg-elevated)] px-3.5 py-2 text-sm text-[var(--text)] outline-none transition-colors focus:border-[var(--accent)]";

export function SearchForm({
  q,
  scope,
  category,
  kind,
}: {
  q: string;
  scope: SearchScope;
  category: EventCategory | "";
  kind: SourceKind | "";
}) {
  return (
    <form method="get" className="fade-up space-y-3" role="search">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <label className="sr-only" htmlFor="search-q">
          Search
        </label>
        <input
          id="search-q"
          name="q"
          type="search"
          defaultValue={q}
          placeholder="Search events, excerpts, locations, sources…"
          autoFocus
          autoComplete="off"
          className={`${fieldClass} min-w-0 flex-1 rounded-full px-4 py-2.5`}
        />
        <button type="submit" className="btn-pill btn-pill-primary shrink-0 px-5">
          Search
        </button>
      </div>

      <div className="flex flex-wrap gap-2">
        <label className="sr-only" htmlFor="search-scope">
          Scope
        </label>
        <select
          id="search-scope"
          name="scope"
          defaultValue={scope}
          className={fieldClass}
        >
          {SCOPES.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>

        <label className="sr-only" htmlFor="search-category">
          Category
        </label>
        <select
          id="search-category"
          name="category"
          defaultValue={category}
          className={fieldClass}
        >
          {CATEGORIES.map((option) => (
            <option key={option.value || "all"} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>

        <label className="sr-only" htmlFor="search-kind">
          Source kind
        </label>
        <select
          id="search-kind"
          name="kind"
          defaultValue={kind}
          className={fieldClass}
        >
          {KINDS.map((option) => (
            <option key={option.value || "all"} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>
    </form>
  );
}
