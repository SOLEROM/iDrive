import type { SheetsAdapter } from "../sheetsAdapter";
import type {
  Event,
  NotificationEntry,
  Parent,
  RideAssignment,
} from "@/domain/models";
import {
  defaultGroupSharedConfig,
  type GroupSharedConfig,
} from "@/domain/config";
import { newEvent } from "@/domain/models";
import { EventType, VisibilityScope } from "@/domain/enums";

interface Sheet {
  groupId: string;
  groupName: string;
  events: Event[];
  assignments: RideAssignment[];
  parents: Parent[];
  config: GroupSharedConfig;
  notifications: NotificationEntry[];
}

/**
 * In-memory mock of the Sheets adapter. Seeds each newly-referenced sheet with
 * two demo events (Piano Lesson, Soccer Practice) the first time it's read,
 * unless the caller has written data to that sheet already.
 */
export class MockSheetsAdapter implements SheetsAdapter {
  private sheets = new Map<string, Sheet>();
  private groupIdToSheetId = new Map<string, string>();
  private seededSheets = new Set<string>();

  async ensureSheetExists(groupId: string, groupName: string): Promise<string> {
    const existing = this.groupIdToSheetId.get(groupId);
    if (existing) return existing;
    const sheetId = `sheet-${groupId}`;
    this.groupIdToSheetId.set(groupId, sheetId);
    this.sheets.set(sheetId, {
      groupId,
      groupName,
      events: [],
      assignments: [],
      parents: [],
      config: { ...defaultGroupSharedConfig, groupName },
      notifications: [],
    });
    return sheetId;
  }

  private ensureSeedData(sheetId: string): Sheet {
    let s = this.sheets.get(sheetId);
    if (!s) {
      s = {
        groupId: sheetId,
        groupName: "Group",
        events: [],
        assignments: [],
        parents: [],
        config: { ...defaultGroupSharedConfig, groupName: "Group" },
        notifications: [],
      };
      this.sheets.set(sheetId, s);
    }
    if (!this.seededSheets.has(sheetId) && s.events.length === 0) {
      s.events = seedEvents(sheetId);
      this.seededSheets.add(sheetId);
    }
    return s;
  }

  async readEvents(sheetId: string): Promise<Event[]> {
    return this.ensureSeedData(sheetId).events.slice();
  }

  async writeEvents(sheetId: string, events: Event[]): Promise<void> {
    const s = this.sheets.get(sheetId) ?? {
      groupId: sheetId,
      groupName: "Group",
      events: [],
      assignments: [],
      parents: [],
      config: { ...defaultGroupSharedConfig },
      notifications: [],
    };
    s.events = events.slice();
    this.sheets.set(sheetId, s);
    this.seededSheets.add(sheetId); // suppress re-seed on next read
  }

  async readAssignments(sheetId: string): Promise<RideAssignment[]> {
    return (this.sheets.get(sheetId)?.assignments ?? []).slice();
  }

  async writeAssignments(sheetId: string, assignments: RideAssignment[]): Promise<void> {
    const s = this.sheets.get(sheetId);
    if (!s) throw new Error(`unknown sheetId: ${sheetId}`);
    s.assignments = assignments.slice();
    this.seededSheets.add(sheetId);
  }

  async readParents(sheetId: string): Promise<Parent[]> {
    return (this.sheets.get(sheetId)?.parents ?? []).slice();
  }

  async writeParents(sheetId: string, parents: Parent[]): Promise<void> {
    const s = this.sheets.get(sheetId);
    if (!s) throw new Error(`unknown sheetId: ${sheetId}`);
    s.parents = parents.slice();
    this.seededSheets.add(sheetId);
  }

  async readGroupConfig(sheetId: string): Promise<GroupSharedConfig> {
    return this.sheets.get(sheetId)?.config ?? { ...defaultGroupSharedConfig };
  }

  async writeGroupConfig(sheetId: string, config: GroupSharedConfig): Promise<void> {
    const s = this.sheets.get(sheetId);
    if (!s) throw new Error(`unknown sheetId: ${sheetId}`);
    s.config = { ...config };
    this.seededSheets.add(sheetId);
  }

  async readNotifications(sheetId: string): Promise<NotificationEntry[]> {
    return (this.sheets.get(sheetId)?.notifications ?? []).slice();
  }

  async appendNotification(sheetId: string, entry: NotificationEntry): Promise<void> {
    const s = this.sheets.get(sheetId);
    if (!s) throw new Error(`unknown sheetId: ${sheetId}`);
    s.notifications.push(entry);
    this.seededSheets.add(sheetId);
  }
}

function seedEvents(sheetId: string): Event[] {
  const now = Date.now();
  const oneHour = 60 * 60 * 1000;
  const oneDay = 24 * oneHour;
  return [
    newEvent({
      eventId: `${sheetId}:piano`,
      childId: "c-seed-1",
      title: "Piano Lesson",
      eventType: EventType.MUSIC,
      locationName: "Music School",
      startDateTime: now + oneDay,
      endDateTime: now + oneDay + oneHour,
      needsRide: true,
      createdByParentId: "p-seed-1",
      visibilityScope: VisibilityScope.GROUP,
      updatedAt: now,
    }),
    newEvent({
      eventId: `${sheetId}:soccer`,
      childId: "c-seed-1",
      title: "Soccer Practice",
      eventType: EventType.SPORTS,
      locationName: "Community Field",
      startDateTime: now + 2 * oneDay,
      endDateTime: now + 2 * oneDay + 90 * 60 * 1000,
      needsRide: true,
      createdByParentId: "p-seed-1",
      visibilityScope: VisibilityScope.GROUP,
      updatedAt: now,
    }),
  ];
}
