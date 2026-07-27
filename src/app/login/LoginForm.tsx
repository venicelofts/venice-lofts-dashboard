"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

const devLoginEnabled = process.env.NEXT_PUBLIC_ENABLE_DEV_LOGIN === "true";
const devEmail = process.env.NEXT_PUBLIC_DEV_LOGIN_EMAIL ?? "";
const devPassword = process.env.NEXT_PUBLIC_DEV_LOGIN_PASSWORD ?? "";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const authError = searchParams.get("error");
  const [error, setError] = useState<string | null>(
    authError ? "Sign-in failed. Try again or check Azure is configured in Supabase." : null,
  );
  const [loading, setLoading] = useState<"microsoft" | "dev" | null>(null);

  async function signInWithMicrosoft() {
    setLoading("microsoft");
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

    setLoading(null);
    if (signError) {
      setError(signError.message);
    }
  }

  async function signInAsDeveloper() {
    if (!devEmail || !devPassword) {
      setError("Dev login is enabled but NEXT_PUBLIC_DEV_LOGIN_EMAIL / PASSWORD are not set.");
      return;
    }

    setLoading("dev");
    setError(null);

    const supabase = createClient();
    const { error: signError } = await supabase.auth.signInWithPassword({
      email: devEmail,
      password: devPassword,
    });

    setLoading(null);
    if (signError) {
      setError(signError.message);
      return;
    }

    router.replace("/");
    router.refresh();
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-4">
      <div className="card rounded-2xl p-7">
        <div className="flex items-baseline gap-2">
          <span className="font-serif text-2xl font-semibold">The Lofts</span>
          <span className="font-script text-2xl text-[var(--gold)]">Events</span>
        </div>
        <h1 className="mt-5 font-serif text-2xl text-[var(--accent)]">Sign in</h1>
        <p className="mt-2 text-sm text-[var(--text-muted)]">
          Use your Petit Microsoft account to access the dashboard.
        </p>
        <button
          type="button"
          onClick={signInWithMicrosoft}
          disabled={loading !== null}
          className="btn-pill btn-pill-primary mt-6 w-full py-2.5"
        >
          <MicrosoftIcon />
          {loading === "microsoft" ? "Redirecting…" : "Continue with Microsoft"}
        </button>
        {devLoginEnabled ? (
          <>
            <div className="my-5 flex items-center gap-3 text-xs text-[var(--text-muted)]">
              <span className="h-px flex-1 bg-[var(--border)]" />
              local only
              <span className="h-px flex-1 bg-[var(--border)]" />
            </div>
            <button
              type="button"
              onClick={signInAsDeveloper}
              disabled={loading !== null}
              className="btn-pill btn-pill-soft w-full py-2.5"
            >
              {loading === "dev" ? "Signing in…" : "Continue as Developer"}
            </button>
          </>
        ) : null}
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
