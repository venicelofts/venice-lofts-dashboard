"use client";

import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";

export type NoteTarget = {
  sourceId: string;
  title: string;
  body: string;
};

export function ItemNoteModal({
  target,
  busy = false,
  onClose,
  onSave,
  onClear,
}: {
  target: NoteTarget | null;
  busy?: boolean;
  onClose: () => void;
  onSave: (sourceId: string, body: string) => void;
  onClear: (sourceId: string) => void;
}) {
  const titleId = useId();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [draft, setDraft] = useState(target?.body ?? "");

  useEffect(() => {
    setDraft(target?.body ?? "");
  }, [target]);

  useEffect(() => {
    if (!target) return;
    const frame = requestAnimationFrame(() => textareaRef.current?.focus());
    return () => cancelAnimationFrame(frame);
  }, [target]);

  useEffect(() => {
    if (!target) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [target, onClose]);

  if (!target || typeof document === "undefined") return null;

  const hasExisting = target.body.trim().length > 0;

  return createPortal(
    <div
      className="focus-overlay-enter fixed inset-0 z-50 overflow-y-auto overscroll-contain p-4 py-6 md:p-8"
      role="presentation"
    >
      <button
        type="button"
        className="fixed inset-0 bg-[rgba(26,42,34,0.45)] backdrop-blur-[2px]"
        aria-label="Close note"
        onClick={onClose}
      />

      <div className="relative z-10 mx-auto flex min-h-[calc(100dvh-3rem)] w-full max-w-lg items-center justify-center">
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          className="focus-panel-enter my-auto w-full max-h-[calc(100dvh-3rem)] overflow-y-auto rounded-2xl border border-[var(--border)] bg-[var(--bg-elevated)] shadow-[0_24px_64px_rgba(26,42,34,0.18)]"
        >
          <div className="border-b border-[var(--border)] px-5 py-4 md:px-6">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="text-[0.68rem] font-semibold tracking-[0.18em] text-[var(--text-faint)] uppercase">
                  Note
                </p>
                <h2
                  id={titleId}
                  className="mt-1 font-serif text-xl leading-snug text-[var(--text)] md:text-[1.35rem]"
                >
                  {target.title}
                </h2>
              </div>
              <button
                type="button"
                onClick={onClose}
                disabled={busy}
                className="btn-pill btn-pill-ghost shrink-0 px-3 py-1.5 text-xs"
              >
                Close
              </button>
            </div>
          </div>

          <div className="px-5 py-5 md:px-6 md:py-6">
            <label className="sr-only" htmlFor={`${titleId}-body`}>
              Note body
            </label>
            <textarea
              ref={textareaRef}
              id={`${titleId}-body`}
              rows={5}
              value={draft}
              disabled={busy}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Add a note for this item…"
              className="w-full resize-y rounded-xl border border-[var(--border)] bg-[var(--bg)] px-3.5 py-3 text-sm leading-relaxed text-[var(--text)] outline-none placeholder:text-[var(--text-faint)] focus:border-[var(--accent)]"
            />

            <div className="mt-5 flex flex-wrap items-center gap-2">
              <button
                type="button"
                disabled={busy}
                onClick={() => onSave(target.sourceId, draft)}
                className="btn-pill btn-pill-primary px-5 py-2"
              >
                Save
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={onClose}
                className="btn-pill btn-pill-ghost px-5 py-2"
              >
                Cancel
              </button>
              {hasExisting ? (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => onClear(target.sourceId)}
                  className="btn-pill btn-pill-ghost ml-auto px-4 py-2 text-[var(--danger)]"
                >
                  Clear
                </button>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
