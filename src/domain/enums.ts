export const ChildColor = {
  RED: "RED", ORANGE: "ORANGE", YELLOW: "YELLOW", GREEN: "GREEN",
  BLUE: "BLUE", PURPLE: "PURPLE", PINK: "PINK", TEAL: "TEAL",
} as const;
export type ChildColor = (typeof ChildColor)[keyof typeof ChildColor];

export const ChildColorHex: Record<ChildColor, string> = {
  RED: "#ef4444", ORANGE: "#f97316", YELLOW: "#eab308", GREEN: "#22c55e",
  BLUE: "#3b82f6", PURPLE: "#a855f7", PINK: "#ec4899", TEAL: "#14b8a6",
};

export const EventType = {
  CLASS: "CLASS", SCHOOL: "SCHOOL", SPORTS: "SPORTS", MUSIC: "MUSIC",
  THERAPY: "THERAPY", MEETING: "MEETING", CUSTOM: "CUSTOM",
} as const;
export type EventType = (typeof EventType)[keyof typeof EventType];

export const RideDirection = { TO: "TO", FROM: "FROM", BOTH: "BOTH" } as const;
export type RideDirection = (typeof RideDirection)[keyof typeof RideDirection];

/**
 * Sentinel `driverParentId` for rides assigned to someone outside the
 * family group (typed by hand via the MemberPicker "Other…" option).
 * The external driver's name is carried in `driverName`; the assignment
 * is visible to every member so they can verify and follow up.
 */
export const EXTERNAL_DRIVER_ID = "external";
export function isExternalDriver(driverParentId: string | undefined | null): boolean {
  return driverParentId === EXTERNAL_DRIVER_ID;
}

export const RideLeg = { TO: "TO", FROM: "FROM" } as const;
export type RideLeg = (typeof RideLeg)[keyof typeof RideLeg];

export const AssignmentStatus = {
  UNASSIGNED: "UNASSIGNED",
  VOLUNTEERED: "VOLUNTEERED",
  CONFIRMED: "CONFIRMED",
  COMPLETED: "COMPLETED",
  CONFLICT: "CONFLICT",
  CANCELLED: "CANCELLED",
} as const;
export type AssignmentStatus =
  (typeof AssignmentStatus)[keyof typeof AssignmentStatus];

export const VisibilityScope = { PRIVATE: "PRIVATE", GROUP: "GROUP" } as const;
export type VisibilityScope =
  (typeof VisibilityScope)[keyof typeof VisibilityScope];

export const EventStatus = {
  ACTIVE: "ACTIVE", CANCELLED: "CANCELLED", ARCHIVED: "ARCHIVED",
} as const;
export type EventStatus = (typeof EventStatus)[keyof typeof EventStatus];

export const GroupRole = { ADMIN: "ADMIN", MEMBER: "MEMBER" } as const;
export type GroupRole = (typeof GroupRole)[keyof typeof GroupRole];

export const NotificationCategory = {
  RIDE_CLAIMED: "RIDE_CLAIMED",
  RIDE_COMPLETED: "RIDE_COMPLETED",
  RIDE_CONFLICT: "RIDE_CONFLICT",
  EVENT_CHANGED: "EVENT_CHANGED",
  SYNC_ERROR: "SYNC_ERROR",
} as const;
export type NotificationCategory =
  (typeof NotificationCategory)[keyof typeof NotificationCategory];

export const RecurrenceFrequency = { WEEKLY: "WEEKLY" } as const;
export type RecurrenceFrequency =
  (typeof RecurrenceFrequency)[keyof typeof RecurrenceFrequency];

export const ThemeMode = {
  SYSTEM: "SYSTEM", LIGHT: "LIGHT", DARK: "DARK",
} as const;
export type ThemeMode = (typeof ThemeMode)[keyof typeof ThemeMode];

export const AppLanguage = {
  SYSTEM: "SYSTEM", ENGLISH: "ENGLISH", HEBREW: "HEBREW",
} as const;
export type AppLanguage = (typeof AppLanguage)[keyof typeof AppLanguage];

export const LandingScreen = {
  DASHBOARD: "DASHBOARD",
  EVENTS: "EVENTS",
  RIDES: "RIDES",
  CHILDREN: "CHILDREN",
} as const;
export type LandingScreen = (typeof LandingScreen)[keyof typeof LandingScreen];

export function landingScreenPath(s: LandingScreen): string {
  switch (s) {
    case "EVENTS":   return "/events";
    case "RIDES":    return "/rides";
    case "CHILDREN": return "/children";
    case "DASHBOARD": default: return "/";
  }
}

export const DayOfWeek = {
  MONDAY: "MONDAY",
  TUESDAY: "TUESDAY",
  WEDNESDAY: "WEDNESDAY",
  THURSDAY: "THURSDAY",
  FRIDAY: "FRIDAY",
  SATURDAY: "SATURDAY",
  SUNDAY: "SUNDAY",
} as const;
export type DayOfWeek = (typeof DayOfWeek)[keyof typeof DayOfWeek];

export const DayOfWeekOrder: DayOfWeek[] = [
  DayOfWeek.MONDAY, DayOfWeek.TUESDAY, DayOfWeek.WEDNESDAY, DayOfWeek.THURSDAY,
  DayOfWeek.FRIDAY, DayOfWeek.SATURDAY, DayOfWeek.SUNDAY,
];

export function dayOfWeekIndex(d: DayOfWeek): number {
  return DayOfWeekOrder.indexOf(d);
}
