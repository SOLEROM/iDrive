import * as XLSX from "xlsx";
import type { AppLocalConfig } from "@/domain/config";
import type { Activity, Child, Event, RideAssignment } from "@/domain/models";
import type { AppParent } from "./parentsRepo";

export interface ExportInput {
  config: AppLocalConfig;
  parents: AppParent[];
  children: Child[];
  events: Event[];
  assignments: RideAssignment[];
}

// ─── Backup workbook (recovery / human-readable) ──────────────────────────────
function monthTabName(timestamp: number): string {
  const d = new Date(timestamp);
  return `${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getFullYear()).slice(2)}`;
}

const CONFIG_KEYS: (keyof AppLocalConfig)[] = [
  "loginName", "loginEmail", "activeParentId", "themeMode", "language", "defaultLandingScreen",
  "showCompletedRidesByDefault", "compactCardMode", "vibrateOnReminder",
  "soundOnReminder", "notificationLeadTimeMinutesDefault", "debugLoggingEnabled",
  "globalActivities", "globalLocations",
];

function buildConfigSheet(
  config: AppLocalConfig,
  parents: AppParent[],
  children: Child[],
): XLSX.WorkSheet {
  const rows: (string | number | boolean | null)[][] = [
    ...CONFIG_KEYS.map((k) => {
      if (k === "globalActivities") return [k as string, JSON.stringify(config.globalActivities)];
      const v = config[k];
      return [k as string, Array.isArray(v) ? v.join("|") : String(v)];
    }),
    [],
    ["[Children]"],
    ["childId", "name", "colorTag", "notes", "isArchived", "activities"],
    ...children.map((c) => [
      c.childId, c.name, c.colorTag, c.notes,
      String(c.isArchived), JSON.stringify(c.activities),
    ]),
    [],
    ["[Parents]"],
    ["parentId", "displayName"],
    ...parents.map((p) => [p.parentId, p.displayName]),
  ];
  return XLSX.utils.aoa_to_sheet(rows);
}

const EVENT_HDR = [
  "eventId", "childId", "title", "type", "startDateTime", "endDateTime",
  "locationName", "needsRide", "rideDirection", "status", "isRecurring",
  "recurrenceRule", "createdAt", "updatedAt",
];
const ASSIGN_HDR = [
  "assignmentId", "eventId", "driverParentId", "driverName", "claimedByParentId",
  "rideLeg", "status", "notes", "claimedAt", "completedAt", "updatedAt",
];

function buildMonthSheet(events: Event[], assignments: RideAssignment[]): XLSX.WorkSheet {
  const rows: (string | number | null)[][] = [
    ["[Events]"],
    EVENT_HDR,
    ...events.map((e) => [
      e.eventId, e.childId, e.title, e.eventType,
      new Date(e.startDateTime).toISOString(),
      new Date(e.endDateTime).toISOString(),
      e.locationName, String(e.needsRide), e.rideDirection,
      e.status, String(e.isRecurring),
      e.recurrenceRule ? JSON.stringify(e.recurrenceRule) : "",
      String(e.createdAt), String(e.updatedAt),
    ]),
    [],
    ["[Assignments]"],
    ASSIGN_HDR,
    ...assignments.map((a) => [
      a.assignmentId, a.eventId, a.driverParentId, a.driverName ?? "",
      a.claimedByParentId ?? "",
      a.rideLeg, a.assignmentStatus, a.notes,
      a.claimedAt != null ? String(a.claimedAt) : "",
      a.completedAt != null ? String(a.completedAt) : "",
      String(a.updatedAt),
    ]),
  ];
  return XLSX.utils.aoa_to_sheet(rows);
}

export function buildBackupBlob(data: ExportInput): Blob {
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, buildConfigSheet(data.config, data.parents, data.children), "Config");

  const byTab = new Map<string, { events: Event[]; assignments: RideAssignment[] }>();
  const getTab = (tab: string) => {
    if (!byTab.has(tab)) byTab.set(tab, { events: [], assignments: [] });
    return byTab.get(tab)!;
  };
  for (const e of data.events) getTab(monthTabName(e.startDateTime)).events.push(e);
  for (const a of data.assignments) {
    const evt = data.events.find((e) => e.eventId === a.eventId);
    getTab(monthTabName(evt?.startDateTime ?? Date.now())).assignments.push(a);
  }
  const sorted = [...byTab.keys()].sort((a, b) => {
    const toMs = (s: string) =>
      new Date(`20${s.slice(2)}-${s.slice(0, 2)}-01`).getTime();
    return toMs(a) - toMs(b);
  });
  for (const tab of sorted) {
    const { events, assignments } = byTab.get(tab)!;
    XLSX.utils.book_append_sheet(wb, buildMonthSheet(events, assignments), tab);
  }
  return blobFrom(wb);
}

// ─── Analytics workbook (flat, denormalised) ──────────────────────────────────
function isoUtc(ms: number): string {
  return new Date(ms).toISOString();
}

function dateLocal(ms: number): string {
  const d = new Date(ms);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function weekdayLocal(ms: number): string {
  return ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"][new Date(ms).getDay()];
}

function monthLocal(ms: number): string {
  const d = new Date(ms);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function activityRows(children: Child[]): (string | boolean)[][] {
  const out: (string | boolean)[][] = [[
    "childId", "childName", "childColor",
    "activityName", "place", "notes",
    "daysCsv", "hasPerDayTimes",
    "startTime", "endTime",
    "repeating", "needsRide", "rideDirection",
  ]];
  for (const c of children) {
    for (const a of c.activities) {
      const days = activityDaysCsv(a);
      const hasDayTimes = !!a.dayTimes && Object.keys(a.dayTimes).length > 0;
      out.push([
        c.childId, c.name, c.colorTag,
        a.name, a.place, a.notes ?? "",
        days, hasDayTimes,
        hasDayTimes ? "" : (a.startTime ?? ""),
        hasDayTimes ? "" : (a.endTime ?? ""),
        a.repeating, a.needsRide, a.rideDirection,
      ]);
    }
  }
  return out;
}

function activityDaysCsv(a: Activity): string {
  if (a.dayTimes && Object.keys(a.dayTimes).length > 0) return Object.keys(a.dayTimes).join(",");
  return (a.days ?? []).join(",");
}

export function buildAnalyticsBlob(data: ExportInput): Blob {
  const wb = XLSX.utils.book_new();
  const childById = new Map(data.children.map((c) => [c.childId, c]));
  const parentById = new Map(data.parents.map((p) => [p.parentId, p]));

  const eventRows: (string | number | boolean)[][] = [[
    "eventId", "title", "eventType", "description",
    "startISO", "endISO", "durationMinutes",
    "dateLocal", "weekdayLocal", "monthLocal",
    "childId", "childName", "childColor",
    "locationName", "locationAddress",
    "needsRide", "rideDirection", "status",
    "createdByParentId", "createdByParentName",
    "createdAtISO", "updatedAtISO",
  ]];
  for (const e of data.events) {
    const child = childById.get(e.childId);
    const creator = parentById.get(e.createdByParentId);
    eventRows.push([
      e.eventId, e.title, e.eventType, e.description ?? "",
      isoUtc(e.startDateTime), isoUtc(e.endDateTime),
      Math.round((e.endDateTime - e.startDateTime) / 60000),
      dateLocal(e.startDateTime), weekdayLocal(e.startDateTime), monthLocal(e.startDateTime),
      e.childId, child?.name ?? "", child?.colorTag ?? "",
      e.locationName, e.locationAddress ?? "",
      e.needsRide, e.rideDirection, e.status,
      e.createdByParentId, creator?.displayName ?? "",
      e.createdAt ? isoUtc(e.createdAt) : "", e.updatedAt ? isoUtc(e.updatedAt) : "",
    ]);
  }
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(eventRows), "Events");

  const eventById = new Map(data.events.map((e) => [e.eventId, e]));
  const assignRows: (string | number | boolean)[][] = [[
    "assignmentId", "eventId", "eventTitle", "eventDateLocal", "eventStartISO",
    "childId", "childName", "childColor",
    "rideLeg", "assignmentStatus",
    "driverParentId", "driverName",
    "claimedByParentId", "claimedByName",
    "selfAssigned", "notes",
    "claimedAtISO", "completedAtISO", "updatedAtISO",
  ]];
  for (const a of data.assignments) {
    const evt = eventById.get(a.eventId);
    const child = evt ? childById.get(evt.childId) : null;
    const claimer = a.claimedByParentId ? parentById.get(a.claimedByParentId) : null;
    assignRows.push([
      a.assignmentId, a.eventId, evt?.title ?? "",
      evt ? dateLocal(evt.startDateTime) : "",
      evt ? isoUtc(evt.startDateTime) : "",
      evt?.childId ?? "", child?.name ?? "", child?.colorTag ?? "",
      a.rideLeg, a.assignmentStatus,
      a.driverParentId, a.driverName ?? "",
      a.claimedByParentId ?? "", claimer?.displayName ?? "",
      (a.claimedByParentId ?? a.driverParentId) === a.driverParentId,
      a.notes ?? "",
      a.claimedAt ? isoUtc(a.claimedAt) : "",
      a.completedAt ? isoUtc(a.completedAt) : "",
      a.updatedAt ? isoUtc(a.updatedAt) : "",
    ]);
  }
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(assignRows), "Assignments");

  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(activityRows(data.children)), "Activities");

  const startMs = Math.min(...data.events.map((e) => e.startDateTime), Number.POSITIVE_INFINITY);
  const endMs = Math.max(...data.events.map((e) => e.startDateTime), Number.NEGATIVE_INFINITY);
  const completedByParent = new Map<string, number>();
  for (const a of data.assignments) {
    if (a.assignmentStatus !== "COMPLETED") continue;
    const name = parentById.get(a.driverParentId)?.displayName ?? a.driverName ?? "?";
    completedByParent.set(name, (completedByParent.get(name) ?? 0) + 1);
  }
  const summaryRows: (string | number)[][] = [
    ["key", "value"],
    ["exportGeneratedAtISO", new Date().toISOString()],
    ["dataWindowStartISO", Number.isFinite(startMs) ? isoUtc(startMs) : ""],
    ["dataWindowEndISO",   Number.isFinite(endMs)   ? isoUtc(endMs)   : ""],
    ["childCount (active)",  data.children.filter((c) => !c.isArchived).length],
    ["childCount (archived)", data.children.filter((c) => c.isArchived).length],
    ["parentCount", data.parents.length],
    ["eventCount (total)", data.events.length],
    ["eventCount (needsRide)", data.events.filter((e) => e.needsRide).length],
    ["assignmentCount (VOLUNTEERED)", data.assignments.filter((a) => a.assignmentStatus === "VOLUNTEERED").length],
    ["assignmentCount (CONFIRMED)",   data.assignments.filter((a) => a.assignmentStatus === "CONFIRMED").length],
    ["assignmentCount (COMPLETED)",   data.assignments.filter((a) => a.assignmentStatus === "COMPLETED").length],
    ["assignmentCount (CANCELLED)",   data.assignments.filter((a) => a.assignmentStatus === "CANCELLED").length],
    ["completedRidesByParent (csv)",
     [...completedByParent].map(([k, v]) => `${k}:${v}`).join(", ")],
  ];
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(summaryRows), "Summary");

  return blobFrom(wb);
}

function blobFrom(wb: XLSX.WorkBook): Blob {
  const raw = XLSX.write(wb, { type: "array", bookType: "xlsx" }) as Uint8Array;
  const copied = new Uint8Array(raw).buffer as ArrayBuffer;
  return new Blob([copied], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
}
