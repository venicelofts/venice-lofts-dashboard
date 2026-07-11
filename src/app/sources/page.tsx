import { AppShell } from "@/components/AppShell";
import { createClient } from "@/lib/supabase/server";

export default async function SourcesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: sources } = await supabase
    .from("sources")
    .select("*")
    .eq("user_id", user.id)
    .order("last_scanned_at", { ascending: false })
    .limit(100);

  return (
    <AppShell email={user.email}>
      <h2 className="mb-2 text-xl font-semibold">Sources</h2>
      <p className="mb-6 text-sm text-[var(--text-muted)]">
        Emails and local files ingested by the scanner.
      </p>
      {!sources?.length ? (
        <p className="rounded-lg border border-dashed border-[var(--border)] bg-[var(--bg-elevated)] px-4 py-10 text-center text-[var(--text-muted)]">
          No sources ingested yet.
        </p>
      ) : (
        <ul className="space-y-2">
          {sources.map((source) => (
            <li
              key={source.id}
              className="rounded-lg border border-[var(--border)] bg-[var(--bg-elevated)] px-4 py-3"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="font-medium">{source.path_or_subject ?? "(untitled)"}</p>
                  <p className="mt-1 font-mono text-xs text-[var(--text-muted)]">
                    {source.kind} · scanned {new Date(source.last_scanned_at).toLocaleString()}
                  </p>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </AppShell>
  );
}
