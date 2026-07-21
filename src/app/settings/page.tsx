import { AppShell } from "@/components/AppShell";
import { CopyScanCommand } from "@/components/CopyScanCommand";
import { createClient } from "@/lib/supabase/server";

export default async function SettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: runs } = await supabase
    .from("scan_runs")
    .select("*")
    .eq("user_id", user.id)
    .order("started_at", { ascending: false })
    .limit(10);

  return (
    <AppShell email={user.email}>
      <h2 className="mb-2 text-xl font-semibold">Settings</h2>
      <p className="mb-6 text-sm text-[var(--text-muted)]">
        Agent config lives on your Mac in <code className="font-mono">.env.local</code>. Paste your
        user id into <code className="font-mono">SCAN_USER_ID</code> so the scanner can write rows
        for you.
      </p>

      <section className="mb-8 rounded-lg border border-[var(--border)] bg-[var(--bg-elevated)] p-4">
        <h3 className="font-medium">Your user id</h3>
        <p className="mt-2 break-all font-mono text-sm text-[var(--accent)]">{user.id}</p>
      </section>

      <section className="mb-8 rounded-lg border border-[var(--border)] bg-[var(--bg-elevated)] p-4">
        <h3 className="font-medium">Run scan (CLI)</h3>
        <p className="mt-2 text-sm text-[var(--text-muted)]">
          Scanning stays on your machine (email/PDF access). Trigger it from a terminal or launchd —
          not from the hosted UI.
        </p>
        <CopyScanCommand />
        <ol className="mt-4 list-decimal space-y-2 pl-5 text-sm text-[var(--text-muted)]">
          <li>
            Set <code className="font-mono text-[var(--text)]">ANTHROPIC_API_KEY</code>, optional{" "}
            <code className="font-mono text-[var(--text)]">SCAN_FOLDERS</code>, and for email{" "}
            <code className="font-mono text-[var(--text)]">AZURE_*</code> +{" "}
            <code className="font-mono text-[var(--text)]">GRAPH_MAILBOX</code> in{" "}
            <code className="font-mono text-[var(--text)]">.env.local</code>
          </li>
          <li>
            Run <code className="font-mono text-[var(--text)]">pnpm scan</code>
          </li>
          <li>
            Install morning job:{" "}
            <code className="font-mono text-[var(--text)]">./scripts/install-launchd.sh</code>
          </li>
        </ol>
      </section>

      <section className="mb-8 rounded-lg border border-[var(--border)] bg-[var(--bg-elevated)] p-4">
        <h3 className="font-medium">One-time schema setup</h3>
        <p className="mt-2 text-sm text-[var(--text-muted)]">
          If tables are missing, run{" "}
          <code className="font-mono text-[var(--text)]">
            supabase/migrations/20260711143000_itinerary_schema.sql
          </code>{" "}
          in the{" "}
          <a
            className="text-[var(--accent)] underline"
            href="https://supabase.com/dashboard/project/qdsltkyziufnwvtsvahc/sql/new"
            target="_blank"
            rel="noreferrer"
          >
            Supabase SQL Editor
          </a>
          , or set <code className="font-mono text-[var(--text)]">DATABASE_URL</code> and run{" "}
          <code className="font-mono text-[var(--text)]">pnpm db:migrate</code>.
        </p>
      </section>

      <section>
        <h3 className="mb-3 font-medium">Recent scan runs</h3>
        {!runs?.length ? (
          <p className="text-sm text-[var(--text-muted)]">No scan runs yet.</p>
        ) : (
          <ul className="space-y-2">
            {runs.map((run) => (
              <li
                key={run.id}
                className="rounded border border-[var(--border)] bg-[var(--bg-elevated)] px-3 py-2 font-mono text-xs"
              >
                <div className="flex flex-wrap justify-between gap-2">
                  <span>{new Date(run.started_at).toLocaleString()}</span>
                  <span className={run.error ? "text-[var(--danger)]" : "text-[var(--ok)]"}>
                    {run.error ? "error" : run.finished_at ? "ok" : "open"}
                  </span>
                </div>
                {run.error ? <p className="mt-1 text-[var(--danger)]">{run.error}</p> : null}
              </li>
            ))}
          </ul>
        )}
      </section>
    </AppShell>
  );
}
