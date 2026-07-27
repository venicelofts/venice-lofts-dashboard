"use client";

import type { ItineraryEvent, Source } from "@/lib/database.types";
import { format, isValid, parseISO } from "date-fns";

function formatScanned(value: string) {
  const d = parseISO(value);
  if (!isValid(d)) return value;
  return format(d, "MMM d");
}

function EmailColumn({
  title,
  subtitle,
  items,
  emptyLabel,
  accentClass,
}: {
  title: string;
  subtitle: string;
  items: Array<{
    id: string;
    title: string;
    detail: string;
    tags: Array<{ label: string; tone?: "default" | "vip" | "pink" | "lavender" | "sky" }>;
    href?: string;
  }>;
  emptyLabel: string;
  accentClass?: string;
}) {
  return (
    <section className={`card flex min-h-[16rem] flex-col p-5 ${accentClass ?? ""}`}>
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h2 className="section-title text-[1.35rem]">{title}</h2>
          <p className="mt-1 text-sm text-[var(--text-muted)]">{subtitle}</p>
        </div>
        <span className="text-xs text-[var(--text-faint)]">Clear</span>
      </div>

      {items.length === 0 ? (
        <p className="m-auto px-4 py-8 text-center text-sm text-[var(--text-muted)]">
          {emptyLabel}
        </p>
      ) : (
        <ul className="divide-y divide-[var(--border)]">
          {items.map((item) => (
            <li key={item.id} className="py-3.5 first:pt-0">
              <div className="flex gap-3">
                <span
                  className="mt-1 h-4 w-4 shrink-0 rounded border border-[var(--border-strong)] bg-[var(--bg)]"
                  aria-hidden
                />
                <div className="min-w-0 flex-1">
                  <h3 className="font-semibold text-[var(--text)]">{item.title}</h3>
                  <p className="mt-0.5 line-clamp-2 text-sm text-[var(--text-muted)]">
                    {item.detail}
                  </p>
                  <div className="mt-2 flex flex-wrap items-center gap-1.5">
                    {item.tags.map((tag) => (
                      <span
                        key={`${item.id}-${tag.label}`}
                        className={`rounded-md px-1.5 py-0.5 text-[0.68rem] font-medium ${tag.tone === "vip"
                            ? "bg-[var(--gold-soft)] text-[var(--text)]"
                            : tag.tone === "pink"
                              ? "bg-[var(--tag-pink)] text-[var(--text)]"
                              : tag.tone === "lavender"
                                ? "bg-[var(--tag-lavender)] text-[var(--text)]"
                                : tag.tone === "sky"
                                  ? "bg-[var(--tag-sky)] text-[var(--text)]"
                                  : "bg-[var(--bg-soft)] text-[var(--text-muted)]"
                          }`}
                      >
                        {tag.label}
                      </span>
                    ))}
                    {item.href ? (
                      <a
                        href={item.href}
                        className="ml-auto text-[0.7rem] text-[var(--text-faint)] hover:text-[var(--accent)]"
                      >
                        open →
                      </a>
                    ) : null}
                  </div>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export function EmailPanels({
  reviewEvents,
  sources,
}: {
  reviewEvents: ItineraryEvent[];
  sources: Source[];
}) {
  const reviewItems = reviewEvents.slice(0, 6).map((event) => ({
    id: event.id,
    title: event.title,
    detail: event.excerpt || `${event.category} · confidence ${Math.round(event.confidence * 100)}%`,
    href: `/review?event=${event.id}`,
    tags: [
      { label: `P${event.confidence < 0.5 ? "1" : "2"}` },
      {
        label: event.starts_at
          ? formatScanned(event.starts_at)
          : formatScanned(event.created_at),
      },
      ...(event.confidence < 0.55 ? [{ label: "VIP", tone: "vip" as const }] : []),
      { label: "Review", tone: "pink" as const },
    ],
  }));

  const sourceItems = sources
    .filter((s) => s.kind === "email")
    .slice(0, 6)
    .map((source) => ({
      id: source.id,
      title: source.path_or_subject ?? "(untitled email)",
      detail: `Scanned ${formatScanned(source.last_scanned_at)}`,
      href: "/sources",
      tags: [
        { label: "Email" },
        { label: formatScanned(source.last_scanned_at) },
        { label: "Ingested", tone: "sky" as const },
      ],
    }));

  return (
    <section className="fade-up fade-up-delay-3 grid gap-4 lg:grid-cols-[1.4fr_1fr]">
      <EmailColumn
        title="Needs Review"
        subtitle="Low-confidence extractions items from recent mail"
        items={reviewItems}
        emptyLabel="Nothing in the review queue — refresh after the next scan."
      />
      <EmailColumn
        title="Recent Sources"
        subtitle="Emails ingested by the scanner"
        items={sourceItems}
        emptyLabel="No email sources yet — run a scan to pull."
      />
    </section>
  );
}
