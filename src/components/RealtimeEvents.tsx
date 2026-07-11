"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { ItineraryEvent } from "@/lib/database.types";
import { EventList } from "@/components/EventList";

export function RealtimeEvents({
  initialEvents,
  userId,
}: {
  initialEvents: ItineraryEvent[];
  userId: string;
}) {
  const [events, setEvents] = useState(initialEvents);

  useEffect(() => {
    setEvents(initialEvents);
  }, [initialEvents]);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel("events-realtime")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "events",
          filter: `user_id=eq.${userId}`,
        },
        () => {
          void supabase
            .from("events")
            .select("*")
            .eq("user_id", userId)
            .order("starts_at", { ascending: true, nullsFirst: false })
            .then(({ data }) => {
              if (data) setEvents(data);
            });
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [userId]);

  return <EventList events={events} />;
}
