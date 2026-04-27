import { type Activity, type Event, newEvent } from "./models";
import { activityEventId } from "./ids";
import { todayStart, endOfNextMonth, dowOf, isoDateLocal } from "./timeWindow";

export interface ExpandContext {
  childId: string;
  createdByParentId: string;
  /** Overrideable for tests. Defaults to [todayStart, endOfNextMonth]. */
  windowStart?: number;
  windowEnd?: number;
}

const MS_DAY = 86_400_000;

function applyTime(dateMs: number, hhmm: string): number {
  if (!hhmm) return dateMs;
  const [h, m] = hhmm.split(":").map(Number);
  const d = new Date(dateMs);
  d.setHours(h, m, 0, 0);
  return d.getTime();
}

/**
 * Expand an Activity template into concrete dated Event[] for the given child.
 * Idempotent: same activity + same window → same event ids → upserts deduplicate.
 */
export function expandActivity(activity: Activity, ctx: ExpandContext): Event[] {
  const start = ctx.windowStart ?? todayStart();
  const end = ctx.windowEnd ?? endOfNextMonth();

  const hasDayTimes = !!activity.dayTimes && Object.keys(activity.dayTimes).length > 0;
  const fallbackTimes = { startTime: activity.startTime ?? "", endTime: activity.endTime ?? "" };
  const activeDays = hasDayTimes
    ? new Set(Object.keys(activity.dayTimes))
    : (activity.days?.length ? new Set(activity.days) : null);

  const out: Event[] = [];
  for (let d = start; d <= end; d += MS_DAY) {
    const dow = dowOf(d);
    if (activeDays && !activeDays.has(dow)) continue;
    const t = hasDayTimes ? (activity.dayTimes[dow] ?? fallbackTimes) : fallbackTimes;
    const dayStart = (() => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x.getTime(); })();
    const startMs = applyTime(dayStart, t.startTime);
    const endMs = applyTime(dayStart, t.endTime || t.startTime);
    out.push(newEvent({
      eventId: activityEventId(ctx.childId, activity.name, isoDateLocal(dayStart), t.startTime),
      childId: ctx.childId,
      title: activity.name,
      eventType: activity.name,
      description: activity.notes ?? "",
      createdByParentId: ctx.createdByParentId,
      startDateTime: startMs,
      endDateTime: endMs,
      locationName: activity.place ?? "",
      needsRide: activity.needsRide,
      rideDirection: activity.rideDirection,
    }));
    if (!activity.repeating) break;
  }
  return out;
}

/**
 * Future-dated event ids that belong to a given activity (by name) on a child.
 * Used to cascade-delete before regenerating.
 */
export function findFutureActivityEventIds(
  events: Event[],
  childId: string,
  activityName: string,
  now: number = todayStart(),
): string[] {
  return events
    .filter((e) => e.childId === childId && e.eventType === activityName && e.startDateTime >= now)
    .map((e) => e.eventId);
}
