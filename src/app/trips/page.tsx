import { AppShell } from "@/components/AppShell";
import { createClient } from "@/lib/supabase/server";

export default async function TripsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: trips } = await supabase
    .from("trips")
    .select("*")
    .eq("user_id", user.id)
    .order("starts_on", { ascending: true, nullsFirst: false });

  const tripIds = (trips ?? []).map((t) => t.id);
  const counts = new Map<string, number>();
  if (tripIds.length > 0) {
    const { data: events } = await supabase
      .from("events")
      .select("trip_id")
      .eq("user_id", user.id)
      .in("trip_id", tripIds);
    for (const row of events ?? []) {
      if (!row.trip_id) continue;
      counts.set(row.trip_id, (counts.get(row.trip_id) ?? 0) + 1);
    }
  }

  return (
    <AppShell email={user.email}>
      <h2 className="section-title mb-2">Trips</h2>
      <p className="mb-6 text-sm text-[var(--text-muted)]">
        Groupings created by the scanner from related confirmations.
      </p>
      {!trips?.length ? (
        <p className="rounded-xl border border-dashed border-[var(--border-strong)] bg-[var(--bg-elevated)] px-4 py-10 text-center text-[var(--text-muted)]">
          No trips yet.
        </p>
      ) : (
        <ul className="space-y-3">
          {trips.map((trip) => (
            <li key={trip.id} className="card card-interactive px-4 py-3">
              <h3 className="font-serif text-lg font-medium">{trip.title}</h3>
              <p className="mt-1 text-sm text-[var(--text-muted)]">
                {trip.starts_on ?? "?"} → {trip.ends_on ?? "?"} · {counts.get(trip.id) ?? 0}{" "}
                events
              </p>
            </li>
          ))}
        </ul>
      )}
    </AppShell>
  );
}
