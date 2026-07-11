import { AppShell } from "@/components/AppShell";
import { ReviewList } from "@/components/ReviewList";
import { createClient } from "@/lib/supabase/server";

export default async function ReviewPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: events } = await supabase
    .from("events")
    .select("*")
    .eq("user_id", user.id)
    .eq("needs_review", true)
    .order("created_at", { ascending: false });

  return (
    <AppShell email={user.email}>
      <h2 className="mb-2 text-xl font-semibold">Review</h2>
      <p className="mb-6 text-sm text-[var(--text-muted)]">
        Low-confidence extractions items. Confirm to keep, dismiss to delete.
      </p>
      <ReviewList events={events ?? []} />
    </AppShell>
  );
}
