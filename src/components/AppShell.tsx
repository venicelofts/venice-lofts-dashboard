"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const links = [
  { href: "/", label: "Today" },
  { href: "/trips", label: "Trips" },
  { href: "/review", label: "Review" },
  { href: "/sources", label: "Sources" },
  { href: "/settings", label: "Settings" },
];

export function AppShell({
  children,
  email,
}: {
  children: React.ReactNode;
  email?: string | null;
}) {
  const pathname = usePathname();
  const router = useRouter();

  async function signOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-6xl flex-col px-4 py-6 md:px-8">
      <header className="mb-8 flex flex-wrap items-end justify-between gap-4 border-b border-[var(--border)] pb-4">
        <div>
          <p className="font-mono text-xs tracking-[0.18em] text-[var(--text-muted)] uppercase">
            Internal tool
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">
            Venice Lofts
          </h1>
        </div>
        <div className="flex items-center gap-3 text-sm text-[var(--text-muted)]">
          {email ? <span className="hidden sm:inline">{email}</span> : null}
          <button
            type="button"
            onClick={signOut}
            className="rounded border border-[var(--border)] px-3 py-1.5 hover:bg-[var(--bg-soft)]"
          >
            Sign out
          </button>
        </div>
      </header>

      <nav className="mb-6 flex flex-wrap gap-2">
        {links.map((link) => {
          const active =
            link.href === "/"
              ? pathname === "/"
              : pathname.startsWith(link.href);
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`rounded px-3 py-1.5 text-sm ${active
                  ? "bg-[var(--accent-soft)] text-[var(--accent)]"
                  : "text-[var(--text-muted)] hover:bg-[var(--bg-soft)] hover:text-[var(--text)]"
                }`}
            >
              {link.label}
            </Link>
          );
        })}
      </nav>

      <main className="flex-1">{children}</main>
    </div>
  );
}
