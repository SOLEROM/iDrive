import { useEffect, useRef } from "react";
import type { Child, Event } from "@/domain/models";
import { planRegenAllActivities } from "@/domain/rollingWindow";

/**
 * On app open (and after listeners settle), advance the activity-event
 * window for any activity whose latest future event is within ~7 days.
 *
 * Runs once per session — guarded by a ref to avoid loops with the
 * snapshot listener.
 */
export function useRollingRegen(
  ready: boolean,
  children: Child[],
  events: Event[],
  upsertEvents: (events: Event[]) => Promise<void>,
): void {
  const done = useRef(false);
  useEffect(() => {
    if (!ready || done.current) return;
    if (children.length === 0) return;
    done.current = true;
    const toUpsert = planRegenAllActivities(events, children);
    if (toUpsert.length > 0) void upsertEvents(toUpsert);
  }, [ready, children, events, upsertEvents]);
}
