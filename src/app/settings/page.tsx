import { AppShell } from "@/components/AppShell";
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
    .order("started_at", { ascending: false })
    .limit(10);

  return (
    <AppShell email={user.email}>
      <h2 className="section-title mb-6">Settings</h2>

      <section className="card mb-8 p-5">
        <h3 className="font-serif text-lg font-medium">Your user id</h3>
        <p className="mt-2 text-sm text-[var(--text-muted)]">
          Used only for scanner setup (<code className="font-mono">SCAN_USER_ID</code>).
          All signed-in users see the same shared ops data.
        </p>
        <p className="mt-2 break-all font-mono text-sm text-[var(--accent)]">{user.id}</p>
      </section>

      <section>
        <h3 className="mb-3 font-serif text-lg font-medium text-[var(--accent)]">
          Recent scan runs
        </h3>
        {!runs?.length ? (
          <p className="text-sm text-[var(--text-muted)]">No scan runs yet.</p>
        ) : (
          <ul className="space-y-2">
            {runs.map((run) => (
              <li key={run.id} className="card px-3 py-2 font-mono text-xs">
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
