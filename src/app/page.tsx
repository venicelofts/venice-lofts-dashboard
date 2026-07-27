import { endOfWeek, format, isValid, parseISO, startOfDay } from "date-fns";
import { AppShell } from "@/components/AppShell";
import { OpsDashboard } from "@/components/dashboard/OpsDashboard";
import { createClient } from "@/lib/supabase/server";

function formatLastSynced(finishedAt: string | null | undefined, hasRun: boolean) {
  if (!finishedAt) return hasRun ? "running / incomplete" : null;
  const d = parseISO(finishedAt);
  if (!isValid(d)) return finishedAt;
  return format(d, "h:mm a EEE, MMM d");
}

export default async function TodayPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const from = startOfDay(new Date()).toISOString();
  const to = endOfWeek(new Date(), { weekStartsOn: 1 }).toISOString();

  const [
    { data: weekEvents },
    { data: upcomingEvents },
    { data: reviewEvents },
    { data: sources },
    { data: lastRun },
  ] = await Promise.all([
    supabase
      .from("events")
      .select("*")
      .or(`starts_at.is.null,and(starts_at.gte.${from},starts_at.lte.${to})`)
      .order("starts_at", { ascending: true, nullsFirst: false }),
    supabase
      .from("events")
      .select("*")
      .gt("starts_at", to)
      .order("starts_at", { ascending: true })
      .limit(8),
    supabase
      .from("events")
      .select("*")
      .eq("needs_review", true)
      .order("created_at", { ascending: false })
      .limit(8),
    supabase
      .from("sources")
      .select("*")
      .eq("kind", "email")
      .order("last_scanned_at", { ascending: false })
      .limit(8),
    supabase
      .from("scan_runs")
      .select("*")
      .order("started_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  return (
    <AppShell
      email={user.email}
      lastSyncedLabel={formatLastSynced(lastRun?.finished_at, Boolean(lastRun))}
    >
      <OpsDashboard
        initialWeekEvents={weekEvents ?? []}
        initialUpcomingEvents={upcomingEvents ?? []}
        initialReviewEvents={reviewEvents ?? []}
        sources={sources ?? []}
        from={from}
        to={to}
      />
    </AppShell>
  );
}
