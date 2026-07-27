import { AppShell } from "@/components/AppShell";
import { ReviewList } from "@/components/ReviewList";
import { createClient } from "@/lib/supabase/server";

export default async function ReviewPage({
  searchParams,
}: {
  searchParams: Promise<{ event?: string | string[] }>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const params = await searchParams;
  const focusId = typeof params.event === "string" ? params.event : null;

  const { data: events } = await supabase
    .from("events")
    .select("*")
    .eq("needs_review", true)
    .order("created_at", { ascending: false });

  return (
    <AppShell email={user.email}>
      <h2 className="section-title mb-2">Review</h2>
      <p className="font-script mb-6 text-xl text-[var(--gold)]">
        Confirm what stays, dismiss what doesn&apos;t
      </p>
      <p className="mb-6 text-sm text-[var(--text-muted)]">
        Low-confidence extracted items. Confirm to keep, dismiss to delete.
      </p>
      <ReviewList events={events ?? []} focusId={focusId} />
    </AppShell>
  );
}
