"use client";

import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export function LoginForm() {
  const searchParams = useSearchParams();
  const authError = searchParams.get("error");
  const [error, setError] = useState<string | null>(
    authError ? "Sign-in failed. Try again or check Azure is configured in Supabase." : null,
  );
  const [loading, setLoading] = useState(false);

  async function signInWithMicrosoft() {
    setLoading(true);
    setError(null);

    const supabase = createClient();
    const origin = window.location.origin;
    const { error: signError } = await supabase.auth.signInWithOAuth({
      provider: "azure",
      options: {
        redirectTo: `${origin}/auth/callback`,
        scopes: "email",
        queryParams: {
          prompt: "select_account",
        },
      },
    });

    setLoading(false);
    if (signError) {
      setError(signError.message);
    }
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-4">
      <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-elevated)] p-6 shadow-lg">
        <p className="font-mono text-xs tracking-[0.18em] text-[var(--text-muted)] uppercase">
          Venice Lofts
        </p>
        <h1 className="mt-2 text-2xl font-semibold">Sign in</h1>
        <p className="mt-2 text-sm text-[var(--text-muted)]">
          Use your Microsoft account to access the dashboard.
        </p>
        <button
          type="button"
          onClick={signInWithMicrosoft}
          disabled={loading}
          className="mt-6 flex w-full items-center justify-center gap-2 rounded bg-[var(--accent)] px-3 py-2.5 font-medium text-black disabled:opacity-50"
        >
          <MicrosoftIcon />
          {loading ? "Redirecting…" : "Continue with Microsoft"}
        </button>
        {error ? <p className="mt-4 text-sm text-[var(--danger)]">{error}</p> : null}
      </div>
    </div>
  );
}

function MicrosoftIcon() {
  return (
    <svg aria-hidden="true" width="18" height="18" viewBox="0 0 21 21" fill="none">
      <rect x="1" y="1" width="9" height="9" fill="#F25022" />
      <rect x="11" y="1" width="9" height="9" fill="#7FBA00" />
      <rect x="1" y="11" width="9" height="9" fill="#00A4EF" />
      <rect x="11" y="11" width="9" height="9" fill="#FFB900" />
    </svg>
  );
}
