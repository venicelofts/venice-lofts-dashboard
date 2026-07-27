"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { ItineraryEvent } from "@/lib/database.types";
import { EventList } from "@/components/EventList";

export function RealtimeEvents({
  initialEvents,
  from,
  to,
}: {
  initialEvents: ItineraryEvent[];
  from: string;
  to: string;
}) {
  const [events, setEvents] = useState(initialEvents);
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    setEvents(initialEvents);
  }, [initialEvents]);

  useEffect(() => {
    const supabase = createClient();

    async function refetch() {
      const { data } = await supabase
        .from("events")
        .select("*")
        .or(`starts_at.is.null,and(starts_at.gte.${from},starts_at.lte.${to})`)
        .order("starts_at", { ascending: true, nullsFirst: false });
      if (data) setEvents(data);
    }

    const channel = supabase
      .channel("events-realtime")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "events",
        },
        () => {
          void refetch();
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [from, to]);

  async function dismiss(id: string) {
    setBusyId(id);
    const previous = events;
    setEvents((prev) => prev.filter((event) => event.id !== id));
    const supabase = createClient();
    const { error } = await supabase.from("events").delete().eq("id", id);
    if (error) {
      setEvents(previous);
    }
    setBusyId(null);
  }

  return <EventList events={events} busyId={busyId} onDismiss={(id) => void dismiss(id)} />;
}
