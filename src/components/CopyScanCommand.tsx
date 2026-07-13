"use client";

import { useState } from "react";

export function CopyScanCommand() {
  const [copied, setCopied] = useState(false);
  const command = "cd ~/Developer/venice-lofts && pnpm scan";

  async function copy() {
    await navigator.clipboard.writeText(command);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className="mt-3 flex flex-wrap items-center gap-2">
      <code className="rounded bg-[var(--bg)] px-2 py-1 font-mono text-xs text-[var(--text)]">
        {command}
      </code>
      <button
        type="button"
        onClick={() => void copy()}
        className="rounded border border-[var(--border)] px-2 py-1 text-xs hover:bg-[var(--bg-soft)]"
      >
        {copied ? "Copied" : "Copy"}
      </button>
    </div>
  );
}
