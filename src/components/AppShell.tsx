"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const links = [
  { href: "/", label: "Daily Ops" },
  { href: "/trips", label: "Trips" },
  { href: "/review", label: "Review" },
  { href: "/sources", label: "Sources" },
  { href: "/settings", label: "Settings" },
];

function greetingForHour(hour: number) {
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

function firstNameFromEmail(email?: string | null) {
  if (!email) return "there";
  const local = email.split("@")[0] ?? "";
  const token = local.split(/[._-]/)[0] ?? local;
  if (!token) return "there";
  return token.charAt(0).toUpperCase() + token.slice(1);
}

export function AppShell({
  children,
  email,
  lastSyncedLabel,
}: {
  children: React.ReactNode;
  email?: string | null;
  lastSyncedLabel?: string | null;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const hour = new Date().getHours();
  const name = firstNameFromEmail(email);

  async function signOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-6xl flex-col px-4 py-6 md:px-8 md:py-8">
      <header className="fade-up mb-7 flex flex-col gap-5 border-b border-[var(--border)] pb-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <Link href="/" className="group inline-flex items-baseline gap-2">
              <span className="font-serif text-3xl font-semibold tracking-tight text-[var(--text)] md:text-[2rem]">
                The Lofts
              </span>
              <span className="font-script text-3xl text-[var(--gold)] md:text-[2.15rem]">
                Events
              </span>
            </Link>
            <p className="mt-2 text-[0.68rem] font-medium tracking-[0.16em] text-[var(--text-faint)] uppercase">
              Venice Lofts · Events · Daily Operations
            </p>
            <p className="mt-3 font-serif text-lg text-[var(--text)] md:text-xl">
              {greetingForHour(hour)}, {name}
              <span className="text-[var(--text-muted)]"> / </span>
              <span className="font-script text-[1.35rem] text-[var(--gold)]">
                keep the day clear
              </span>
            </p>
          </div>

          <div className="flex flex-col items-stretch gap-3 sm:items-end">
            {lastSyncedLabel ? (
              <p className="text-xs text-[var(--text-faint)]">
                Last synced: {lastSyncedLabel}
              </p>
            ) : null}
            <div className="flex flex-wrap items-center gap-2">
              <Link href="/review" className="btn-pill btn-pill-primary">
                Let&apos;s get it done
              </Link>
              <Link href="/sources" className="btn-pill btn-pill-gold">
                Handled details
              </Link>
              <Link href="/settings" className="btn-pill btn-pill-soft">
                Recap the day
              </Link>
              <button
                type="button"
                onClick={signOut}
                className="btn-pill btn-pill-ghost px-3"
                aria-label="Sign out"
                title="Sign out"
              >
                <SettingsIcon />
              </button>
            </div>
          </div>
        </div>

        <nav className="flex flex-wrap gap-1.5" aria-label="Primary">
          {links.map((link) => {
            const active =
              link.href === "/"
                ? pathname === "/"
                : pathname.startsWith(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`rounded-full px-3.5 py-1.5 text-sm transition-colors ${active
                    ? "bg-[var(--accent)] text-[#f7f5ef]"
                    : "text-[var(--text-muted)] hover:bg-[var(--bg-soft)] hover:text-[var(--text)]"
                  }`}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>
      </header>

      <main className="flex-1 pb-10">{children}</main>
    </div>
  );
}

function SettingsIcon() {
  return (
    <svg
      aria-hidden="true"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="3" />
      <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
    </svg>
  );
}
