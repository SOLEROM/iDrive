import * as XLSX from "xlsx";
import { defaultAppLocalConfig, type AppLocalConfig } from "@/domain/config";
import type { Child, Event, RideAssignment } from "@/domain/models";
import {
  AssignmentStatus, ChildColor, EventStatus, EventType,
  RideDirection, RideLeg, VisibilityScope,
} from "@/domain/enums";

export interface StoredParent {
  parentId: string;
  displayName: string;
}

export interface AppData {
  config: AppLocalConfig;
  parents: StoredParent[];
  children: Child[];
  events: Event[];
  assignments: RideAssignment[];
}

// ─── Monthly tab naming ───────────────────────────────────────────────────────
export function monthTabName(timestamp: number): string {
  const d = new Date(timestamp);
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yy = String(d.getFullYear()).slice(2);
  return `${mm}${yy}`;
}

// ─── Config tab ───────────────────────────────────────────────────────────────
const CONFIG_KEYS: (keyof AppLocalConfig)[] = [
  "loginName", "loginEmail", "activeParentId", "themeMode", "language", "defaultLandingScreen",
  "showCompletedRidesByDefault", "compactCardMode", "vibrateOnReminder",
  "soundOnReminder", "notificationLeadTimeMinutesDefault", "debugLoggingEnabled",
  "globalActivities", "globalLocations", "syncIntervalMinutes",
];

function buildConfigSheet(config: AppLocalConfig, parents: StoredParent[], children: Child[]): XLSX.WorkSheet {
  const rows: (string | number | boolean | null)[][] = [
    ...CONFIG_KEYS.map((k) => {
      if (k === "globalActivities") return [k as string, JSON.stringify(config.globalActivities)];
      const v = config[k];
      return [k as string, Array.isArray(v) ? v.join("|") : String(v)];
    }),
    [],
    ["[Children]"],
    ["childId", "name", "colorTag", "notes", "isArchived", "eventTypes"],
    ...children.map((c) => [c.childId, c.name, c.colorTag, c.notes, String(c.isArchived), JSON.stringify(c.activities)]),
    [],
    ["[Parents]"],
    ["parentId", "displayName"],
    ...parents.map((p) => [p.parentId, p.displayName]),
  ];
  return XLSX.utils.aoa_to_sheet(rows);
}

function parseConfigSheet(ws: XLSX.WorkSheet): { config: AppLocalConfig; parents: StoredParent[]; children: Child[] } {
  const rows = XLSX.utils.sheet_to_json<string[]>(ws, { header: 1, defval: "" }) as string[][];
  const kv: Record<string, string> = {};
  const children: Child[] = [];
  const parents: StoredParent[] = [];
  let section: "config" | "children" | "parents" = "config";
  let headerSeen = false;

  for (const row of rows) {
    const key = String(row[0] ?? "").trim();
    if (!key) { if (section !== "config") { section = "config"; headerSeen = false; } continue; }
    if (key === "[Children]") { section = "children"; headerSeen = false; continue; }
    if (key === "[Parents]") { section = "parents"; headerSeen = false; continue; }
    if (section === "children") {
      if (!headerSeen) { headerSeen = true; continue; }
      const rawCol5 = String(row[5] ?? "").trim();
      let activities: import("@/domain/models").Activity[] = [];
      try { activities = JSON.parse(rawCol5 || "[]"); } catch { activities = []; }
      children.push({
        childId: String(row[0]),
        parentOwnerId: "",
        name: String(row[1] ?? ""),
        colorTag: (String(row[2]) as ChildColor) || ChildColor.BLUE,
        notes: String(row[3] ?? ""),
        isArchived: String(row[4]) === "true",
        activities,
        createdAt: 0,
        updatedAt: 0,
      });
    } else if (section === "parents") {
      if (!headerSeen) { headerSeen = true; continue; }
      if (String(row[0]).trim()) {
        parents.push({ parentId: String(row[0]).trim(), displayName: String(row[1] ?? "").trim() });
      }
    } else {
      kv[key] = String(row[1] ?? "");
    }
  }

  const d = defaultAppLocalConfig;
  let globalActivities: import("@/domain/models").Activity[] = [];
  try { globalActivities = JSON.parse(kv.globalActivities || "[]"); } catch { globalActivities = []; }
  const config: AppLocalConfig = {
    loginName: kv.loginName ?? d.loginName,
    loginEmail: kv.loginEmail ?? d.loginEmail,
    activeParentId: kv.activeParentId ?? d.activeParentId,
    themeMode: (kv.themeMode as AppLocalConfig["themeMode"]) || d.themeMode,
    language: (kv.language as AppLocalConfig["language"]) || d.language,
    defaultLandingScreen: (kv.defaultLandingScreen as AppLocalConfig["defaultLandingScreen"]) || d.defaultLandingScreen,
    showCompletedRidesByDefault: kv.showCompletedRidesByDefault === "true",
    compactCardMode: kv.compactCardMode === "true",
    vibrateOnReminder: kv.vibrateOnReminder !== "false",
    soundOnReminder: kv.soundOnReminder !== "false",
    notificationLeadTimeMinutesDefault: parseInt(kv.notificationLeadTimeMinutesDefault) || d.notificationLeadTimeMinutesDefault,
    debugLoggingEnabled: kv.debugLoggingEnabled === "true",
    globalActivities,
    globalLocations: (() => { const raw = (kv.globalLocations ?? "").trim(); return raw ? raw.split("|").map((s) => s.trim()).filter(Boolean) : []; })(),
    syncIntervalMinutes: kv.syncIntervalMinutes !== undefined ? parseInt(kv.syncIntervalMinutes) || 0 : d.syncIntervalMinutes,
  };

  return { config, parents, children };
}

// ─── Monthly tab ──────────────────────────────────────────────────────────────
const EVENT_HDR = ["eventId","childId","title","type","startDateTime","endDateTime",
  "locationName","needsRide","rideDirection","status","isRecurring","recurrenceRule","visibilityScope","createdAt","updatedAt"];
const ASSIGN_HDR = ["assignmentId","eventId","driverParentId","driverName","rideLeg","status","notes","claimedAt","completedAt","updatedAt"];

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
      e.visibilityScope, String(e.createdAt), String(e.updatedAt),
    ]),
    [],
    ["[Assignments]"],
    ASSIGN_HDR,
    ...assignments.map((a) => [
      a.assignmentId, a.eventId, a.driverParentId, a.driverName ?? "",
      a.rideLeg, a.assignmentStatus, a.notes,
      a.claimedAt != null ? String(a.claimedAt) : "",
      a.completedAt != null ? String(a.completedAt) : "",
      String(a.updatedAt),
    ]),
  ];
  return XLSX.utils.aoa_to_sheet(rows);
}

function parseMonthSheet(ws: XLSX.WorkSheet): { events: Event[]; assignments: RideAssignment[] } {
  const rows = XLSX.utils.sheet_to_json<string[]>(ws, { header: 1, defval: "" }) as string[][];
  const events: Event[] = [];
  const assignments: RideAssignment[] = [];
  let section: "events" | "assignments" | "none" = "none";
  let headerSeen = false;

  for (const row of rows) {
    const first = String(row[0] ?? "").trim();
    if (!first) { headerSeen = false; continue; }
    if (first === "[Events]") { section = "events"; headerSeen = false; continue; }
    if (first === "[Assignments]") { section = "assignments"; headerSeen = false; continue; }
    if (!headerSeen) { headerSeen = true; continue; }

    if (section === "events") {
      try {
        events.push({
          eventId: row[0], childId: row[1], title: row[2],
          eventType: (row[3] as EventType) || EventType.CLASS,
          startDateTime: new Date(row[4]).getTime(),
          endDateTime: new Date(row[5]).getTime(),
          locationName: row[6] ?? "", locationAddress: "",
          needsRide: row[7] === "true",
          rideDirection: (row[8] as RideDirection) || RideDirection.BOTH,
          status: (row[9] as EventStatus) || EventStatus.ACTIVE,
          isRecurring: row[10] === "true",
          recurrenceRule: row[11] ? (JSON.parse(row[11]) as Event["recurrenceRule"]) : null,
          visibilityScope: (row[12] as VisibilityScope) || VisibilityScope.PRIVATE,
          description: "", groupId: null, createdByParentId: "",
          createdAt: parseInt(row[13]) || 0, updatedAt: parseInt(row[14]) || 0,
        });
      } catch { /* skip malformed row */ }
    } else if (section === "assignments") {
      try {
        assignments.push({
          assignmentId: row[0], eventId: row[1], driverParentId: row[2],
          driverName: row[3] ?? "",
          rideLeg: row[4] as RideLeg,
          assignmentStatus: (row[5] as AssignmentStatus) || AssignmentStatus.UNASSIGNED,
          notes: row[6] ?? "",
          claimedAt: row[7] ? parseInt(row[7]) : null,
          completedAt: row[8] ? parseInt(row[8]) : null,
          updatedAt: parseInt(row[9]) || 0,
        });
      } catch { /* skip malformed row */ }
    }
  }
  return { events, assignments };
}

// ─── Workbook build / parse ───────────────────────────────────────────────────
function buildWorkbook(data: AppData): XLSX.WorkBook {
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
    const toMs = (s: string) => {
      const mm = s.slice(0, 2);
      const yy = s.slice(2);
      return new Date(`20${yy}-${mm}-01`).getTime();
    };
    return toMs(a) - toMs(b);
  });
  for (const tab of sorted) {
    const { events, assignments } = byTab.get(tab)!;
    XLSX.utils.book_append_sheet(wb, buildMonthSheet(events, assignments), tab);
  }
  return wb;
}

function parseWorkbook(wb: XLSX.WorkBook): AppData {
  const configWs = wb.Sheets["Config"];
  const { config, parents, children } = configWs
    ? parseConfigSheet(configWs)
    : { config: defaultAppLocalConfig, parents: [], children: [] };

  const events: Event[] = [];
  const assignments: RideAssignment[] = [];
  for (const name of wb.SheetNames) {
    if (name === "Config") continue;
    const { events: es, assignments: as } = parseMonthSheet(wb.Sheets[name]);
    events.push(...es);
    assignments.push(...as);
  }
  return { config, parents, children, events, assignments };
}

// ─── Public API ───────────────────────────────────────────────────────────────
export function buildWorkbookBlob(data: AppData): Blob {
  const raw = XLSX.write(buildWorkbook(data), { type: "array", bookType: "xlsx" }) as Uint8Array;
  const copied = new Uint8Array(raw).buffer as ArrayBuffer;
  return new Blob([copied], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
}

export function parseWorkbookFromBuffer(buf: ArrayBuffer): AppData {
  return parseWorkbook(XLSX.read(new Uint8Array(buf), { type: "array" }));
}
