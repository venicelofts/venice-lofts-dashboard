import { endOfWeek, startOfDay } from "date-fns";
import { AppShell } from "@/components/AppShell";
import { RealtimeEvents } from "@/components/RealtimeEvents";
import { createClient } from "@/lib/supabase/server";

export default async function TodayPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const from = startOfDay(new Date()).toISOString();
  const to = endOfWeek(new Date(), { weekStartsOn: 1 }).toISOString();

  const { data: events } = await supabase
    .from("events")
    .select("*")
    .eq("user_id", user.id)
    .or(`starts_at.is.null,and(starts_at.gte.${from},starts_at.lte.${to})`)
    .order("starts_at", { ascending: true, nullsFirst: false });

  const { data: lastRun } = await supabase
    .from("scan_runs")
    .select("*")
    .eq("user_id", user.id)
    .order("started_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return (
    <AppShell email={user.email}>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold">Today / this week</h2>
          <p className="mt-1 text-sm text-[var(--text-muted)]">
            Live updates when the morning scan finishes.
          </p>
        </div>
        <p className="font-mono text-xs text-[var(--text-muted)]">
          Last scan:{" "}
          {lastRun?.finished_at
            ? new Date(lastRun.finished_at).toLocaleString()
            : lastRun
              ? "running / incomplete"
              : "never"}
        </p>
      </div>
      <RealtimeEvents initialEvents={events ?? []} userId={user.id} />
    </AppShell>
  );
}
