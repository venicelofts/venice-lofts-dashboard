"use client";

import { useState, type FormEvent } from "react";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setStatus(null);

    const supabase = createClient();
    const origin = window.location.origin;
    const { error: signError } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${origin}/auth/callback`,
      },
    });

    setLoading(false);
    if (signError) {
      setError(signError.message);
      return;
    }
    setStatus("Check your email for the magic link.");
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-4">
      <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-elevated)] p-6 shadow-lg">
        <p className="font-mono text-xs tracking-[0.18em] text-[var(--text-muted)] uppercase">
          Venice Lofts
        </p>
        <h1 className="mt-2 text-2xl font-semibold">Sign in</h1>
        <p className="mt-2 text-sm text-[var(--text-muted)]">
          Magic link auth via Supabase. Use the same account as your scan agent owner.
        </p>
        <form onSubmit={onSubmit} className="mt-6 space-y-4">
          <label className="block text-sm">
            <span className="text-[var(--text-muted)]">Email</span>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full rounded border border-[var(--border)] bg-[var(--bg)] px-3 py-2 outline-none focus:border-[var(--accent)]"
              placeholder="you@company.com"
            />
          </label>
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded bg-[var(--accent)] px-3 py-2 font-medium text-black disabled:opacity-50"
          >
            {loading ? "Sending…" : "Send magic link"}
          </button>
        </form>
        {status ? <p className="mt-4 text-sm text-[var(--ok)]">{status}</p> : null}
        {error ? <p className="mt-4 text-sm text-[var(--danger)]">{error}</p> : null}
      </div>
    </div>
  );
}
