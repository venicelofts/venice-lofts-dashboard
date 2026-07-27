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
    .eq("user_id", user.id)
    .order("started_at", { ascending: false })
    .limit(10);

  return (
    <AppShell email={user.email}>
      <h2 className="mb-6 text-xl font-semibold">Settings</h2>

      <section className="card mb-8 p-4">
        <h3 className="font-medium">Your user id</h3>
        <p className="mt-2 break-all font-mono text-sm text-[var(--accent)]">{user.id}</p>
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
                className="card px-3 py-2 font-mono text-xs"
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
