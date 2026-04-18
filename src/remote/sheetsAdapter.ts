import type {
  Event,
  NotificationEntry,
  Parent,
  RideAssignment,
} from "@/domain/models";
import type { GroupSharedConfig } from "@/domain/config";

/**
 * Abstract Sheets adapter. Each group has a shared sheet with tabs for
 * Events, Assignments, Parents, GroupConfig, Notifications.
 */
export interface SheetsAdapter {
  ensureSheetExists(groupId: string, groupName: string): Promise<string>;

  readEvents(sheetId: string): Promise<Event[]>;
  writeEvents(sheetId: string, events: Event[]): Promise<void>;

  readAssignments(sheetId: string): Promise<RideAssignment[]>;
  writeAssignments(sheetId: string, assignments: RideAssignment[]): Promise<void>;

  readParents(sheetId: string): Promise<Parent[]>;
  writeParents(sheetId: string, parents: Parent[]): Promise<void>;

  readGroupConfig(sheetId: string): Promise<GroupSharedConfig>;
  writeGroupConfig(sheetId: string, config: GroupSharedConfig): Promise<void>;

  readNotifications(sheetId: string): Promise<NotificationEntry[]>;
  appendNotification(sheetId: string, entry: NotificationEntry): Promise<void>;
}
