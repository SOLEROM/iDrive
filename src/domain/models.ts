import type {
  AssignmentStatus,
  ChildColor,
  DayOfWeek,
  EventStatus,
  NotificationCategory,
  RecurrenceFrequency,
  RideDirection,
  RideLeg,
  VisibilityScope,
} from "./enums";
import {
  AssignmentStatus as AS,
  ChildColor as CC,
  EventStatus as ES,
  RideDirection as RD,
  VisibilityScope as VS,
} from "./enums";

export type Millis = number;

export interface Activity {
  name: string;
  days: string[];    // array of DayOfWeek values; empty = every day
  place: string;
  startTime: string; // legacy fallback "HH:MM" or ""
  endTime: string;   // legacy fallback "HH:MM" or ""
  dayTimes: Record<string, { startTime: string; endTime: string }>; // per-day times; keys are DayOfWeek values
  repeating: boolean; // default true; false = "one time only" (generates one event)
  needsRide: boolean;
  rideDirection: RideDirection;
  notes: string;     // template text copied to event.description on generation
}

export function newActivity(partial: Partial<Activity> & Pick<Activity, "name">): Activity {
  return { days: [], place: "", startTime: "", endTime: "", dayTimes: {}, repeating: true, needsRide: false, rideDirection: RD.BOTH, notes: "", ...partial };
}

export interface Parent {
  parentId: string;
  displayName: string;
  email: string;
  phone?: string | null;
  groupIds: string[];
  isAdminByGroup: Record<string, boolean>;
  createdAt: Millis;
  updatedAt: Millis;
}

export interface Child {
  childId: string;
  parentOwnerId: string;
  name: string;
  colorTag: ChildColor;
  notes: string;
  isArchived: boolean;
  activities: Activity[];
  createdAt: Millis;
  updatedAt: Millis;
}

export interface RecurrenceRule {
  frequency: RecurrenceFrequency;
  daysOfWeek?: DayOfWeek[] | null;
  intervalWeeks: number;
  endDate?: Millis | null;
}

export interface Event {
  eventId: string;
  groupId?: string | null;
  childId: string;
  title: string;
  eventType: string;
  description: string;
  locationName: string;
  locationAddress: string;
  startDateTime: Millis;
  endDateTime: Millis;
  isRecurring: boolean;
  recurrenceRule?: RecurrenceRule | null;
  needsRide: boolean;
  rideDirection: RideDirection;
  createdByParentId: string;
  visibilityScope: VisibilityScope;
  status: EventStatus;
  createdAt: Millis;
  updatedAt: Millis;
}

export interface RideAssignment {
  assignmentId: string;
  eventId: string;
  driverParentId: string;
  driverName: string;
  rideLeg: RideLeg;
  assignmentStatus: AssignmentStatus;
  notes: string;
  claimedAt?: Millis | null;
  completedAt?: Millis | null;
  updatedAt: Millis;
}

export interface Group {
  groupId: string;
  groupName: string;
  memberParentIds: string[];
  sharedSheetId: string;
  createdAt: Millis;
  updatedAt: Millis;
}

export interface NotificationEntry {
  notificationId: string;
  groupId: string;
  eventId: string | null;
  assignmentId: string | null;
  triggeredByParentId: string;
  message: string;
  category: NotificationCategory;
  createdAt: Millis;
}

// ─── Factory helpers (mirror Kotlin default values) ─────────────────────────
export function newChild(partial: Partial<Child> & Pick<Child, "childId" | "parentOwnerId" | "name">): Child {
  return {
    colorTag: CC.BLUE,
    notes: "",
    isArchived: false,
    activities: [],
    createdAt: 0,
    updatedAt: 0,
    ...partial,
  };
}

export function newParent(
  partial: Partial<Parent> & Pick<Parent, "parentId" | "displayName" | "email">,
): Parent {
  return {
    groupIds: [],
    isAdminByGroup: {},
    createdAt: 0,
    updatedAt: 0,
    phone: null,
    ...partial,
  };
}

export function newEvent(
  partial: Partial<Event> & Pick<Event, "eventId" | "childId" | "title" | "createdByParentId">,
): Event {
  return {
    groupId: null,
    eventType: "",
    description: "",
    locationName: "",
    locationAddress: "",
    startDateTime: 0,
    endDateTime: 0,
    isRecurring: false,
    recurrenceRule: null,
    needsRide: false,
    rideDirection: RD.BOTH,
    visibilityScope: VS.GROUP,
    status: ES.ACTIVE,
    createdAt: 0,
    updatedAt: 0,
    ...partial,
  };
}

export function newAssignment(
  partial: Partial<RideAssignment> &
    Pick<RideAssignment, "assignmentId" | "eventId" | "driverParentId" | "rideLeg">,
): RideAssignment {
  return {
    assignmentStatus: AS.UNASSIGNED,
    driverName: "",
    notes: "",
    claimedAt: null,
    completedAt: null,
    updatedAt: 0,
    ...partial,
  };
}
