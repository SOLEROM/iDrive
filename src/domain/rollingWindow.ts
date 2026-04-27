import type { Activity, Child, Event } from "./models";
import { expandActivity } from "./activityExpander";
import { todayStart, endOfNextMonth } from "./timeWindow";

const REGEN_THRESHOLD_DAYS = 7;
const MS_DAY = 86_400_000;

export interface RegenPlan {
  upserts: Event[];
}

/** Stable (date, startTime) fingerprint — independent of event-id format. */
function eventFingerprint(e: Event): string {
  const d = new Date(e.startDateTime);
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}@${d.getHours()}:${d.getMinutes()}`;
}

/**
 * Returns the events to upsert for a single (child, activity) pair so that
 * the calendar reaches `endOfNextMonth()`. Only triggers when the latest
 * existing future event is closer than `REGEN_THRESHOLD_DAYS` to today.
 *
 * Existing events are matched by (childId, eventType=activity.name) so the
 * algorithm is independent of the legacy event-id format. Dedup is by
 * (date, startTime) fingerprint, which prevents duplicates when an old
 * row's id lacks the time suffix.
 */
export function planActivityRegen(
  events: Event[],
  child: Child,
  activity: Activity,
  now: number = todayStart(),
): RegenPlan {
  const future = events
    .filter((e) =>
      e.childId === child.childId &&
      e.eventType === activity.name &&
      e.startDateTime >= now,
    )
    .sort((a, b) => a.startDateTime - b.startDateTime);

  const lastFutureMs = future.length > 0 ? future[future.length - 1].startDateTime : 0;
  const daysAhead = Math.max(0, Math.floor((lastFutureMs - now) / MS_DAY));
  if (future.length > 0 && daysAhead >= REGEN_THRESHOLD_DAYS) {
    return { upserts: [] };
  }

  const expanded = expandActivity(activity, {
    childId: child.childId,
    createdByParentId: child.parentOwnerId,
    windowStart: now,
    windowEnd: endOfNextMonth(now),
  });
  const existingFps = new Set(future.map(eventFingerprint));
  return { upserts: expanded.filter((e) => !existingFps.has(eventFingerprint(e))) };
}

/** Plan a regen for every active activity across every active child. */
export function planRegenAllActivities(
  events: Event[],
  children: Child[],
  now: number = todayStart(),
): Event[] {
  const out: Event[] = [];
  for (const c of children) {
    if (c.isArchived) continue;
    for (const a of c.activities) {
      const plan = planActivityRegen(events, c, a, now);
      out.push(...plan.upserts);
    }
  }
  return out;
}
