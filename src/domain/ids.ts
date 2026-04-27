// Deterministic + random ID builders. No side effects, no Date imports
// except for date-stamped activity-event IDs.

const RAND_LEN = 8;

function rand(): string {
  return Math.random().toString(36).slice(2, 2 + RAND_LEN);
}

export function newChildId(): string { return `c-${rand()}`; }
export function newEventId(): string { return `e-${rand()}`; }
export function newAssignmentId(): string { return `a-${rand()}`; }

export function slugifyActivityName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 24);
}

export function activityEventId(
  childId: string,
  activityName: string,
  isoDate: string, // YYYY-MM-DD
  startTime?: string, // "HH:MM" — included to disambiguate same-name activities
): string {
  const base = `act-${childId.slice(-6)}-${slugifyActivityName(activityName)}-${isoDate}`;
  if (!startTime) return base;
  return `${base}-${startTime.replace(":", "")}`;
}

export function activityEventIdPrefix(childId: string, activityName: string): string {
  return `act-${childId.slice(-6)}-${slugifyActivityName(activityName)}-`;
}
