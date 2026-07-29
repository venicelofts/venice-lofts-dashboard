"use client";

import { useEffect, useState } from "react";
import type { SourceKind } from "@/lib/database.types";
import { LIST_PAGE_SIZE } from "@/components/dashboard/listShared";

const badgeStyles: Record<SourceKind, string> = {
  email: "bg-[var(--accent-soft)] text-[var(--accent)]",
  calendar: "bg-[var(--gold-soft)] text-[var(--text)]",
  file: "bg-[var(--bg-muted)] text-[var(--text-muted)]",
};

const badgeLabels: Record<SourceKind, string> = {
  email: "Email",
  calendar: "Calendar",
  file: "File",
};

export function SourceKindBadge({
  kind,
}: {
  kind: SourceKind | null | undefined;
}) {
  if (!kind) return null;
  return (
    <span
      className={`rounded-md px-1.5 py-0.5 text-[0.65rem] font-semibold tracking-wide uppercase ${badgeStyles[kind]}`}
    >
      {badgeLabels[kind]}
    </span>
  );
}

function NoteIcon() {
  return (
    <svg
      aria-hidden="true"
      width="14"
      height="14"
      viewBox="0 0 14 14"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M3.5 1.75h5.25L11.5 4.5v7.75a.75.75 0 0 1-.75.75h-7.25a.75.75 0 0 1-.75-.75V2.5a.75.75 0 0 1 .75-.75Z" />
      <path d="M8.75 1.75V4.5H11.5" />
      <path d="M4.75 7.25h4.5M4.75 9.75h3" />
    </svg>
  );
}

export function NoteButton({
  hasNote,
  onClick,
}: {
  hasNote: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={hasNote ? "Edit note" : "Add note"}
      title={hasNote ? "Edit note" : "Add note"}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      className="inline-flex items-center justify-center rounded-md p-1.5 text-[var(--gold)] transition-colors hover:bg-[var(--bg-soft)] hover:text-[#a88235]"
    >
      <NoteIcon />
    </button>
  );
}

function OutlookIcon() {
  return (
    <svg
      aria-hidden="true"
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
    >
      <rect width="16" height="16" rx="3" fill="#0078D4" />
      <path
        d="M2.75 5.25 8 8.75l5.25-3.5"
        stroke="white"
        strokeWidth="1.25"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <rect
        x="2.75"
        y="4.5"
        width="10.5"
        height="7"
        rx="1"
        stroke="white"
        strokeWidth="1.25"
      />
    </svg>
  );
}

export function OutlookButton({ href }: { href: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Open in Outlook"
      title="Open in Outlook"
      className="inline-flex items-center justify-center rounded-md p-1.5 text-[var(--text-faint)] transition-colors hover:bg-[var(--bg-soft)]"
    >
      <OutlookIcon />
    </a>
  );
}

export function useListPage(itemCount: number, pageSize = LIST_PAGE_SIZE) {
  const totalPages = Math.max(1, Math.ceil(itemCount / pageSize));
  const [page, setPage] = useState(0);
  const safePage = Math.min(page, totalPages - 1);

  useEffect(() => {
    setPage((current) => Math.min(current, Math.max(0, totalPages - 1)));
  }, [totalPages]);

  return {
    page: safePage,
    totalPages,
    setPage,
    slice: <T,>(items: T[]) =>
      items.slice(safePage * pageSize, safePage * pageSize + pageSize),
  };
}

export function ListPagination({
  page,
  totalPages,
  onPageChange,
}: {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}) {
  if (totalPages <= 1) return null;

  return (
    <div className="mt-3 flex items-center justify-between gap-3 text-sm text-[var(--text-muted)]">
      <button
        type="button"
        disabled={page <= 0}
        onClick={() => onPageChange(page - 1)}
        className="rounded-full px-3 py-1.5 hover:bg-[var(--bg-soft)] hover:text-[var(--text)] disabled:pointer-events-none disabled:opacity-40"
      >
        Previous
      </button>
      <span>
        Page {page + 1} of {totalPages}
      </span>
      <button
        type="button"
        disabled={page >= totalPages - 1}
        onClick={() => onPageChange(page + 1)}
        className="rounded-full px-3 py-1.5 hover:bg-[var(--bg-soft)] hover:text-[var(--text)] disabled:pointer-events-none disabled:opacity-40"
      >
        Next
      </button>
    </div>
  );
}
