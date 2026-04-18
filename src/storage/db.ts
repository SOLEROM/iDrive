import Dexie, { type Table } from "dexie";
import type {
  Child,
  Event,
  Group,
  NotificationEntry,
  Parent,
  RideAssignment,
} from "@/domain/models";

export type SyncOpType =
  | "CHILD_UPSERT"
  | "EVENT_UPSERT"
  | "ASSIGNMENT_UPSERT"
  | "PARENT_UPSERT"
  | "GROUP_UPSERT"
  | "NOTIFICATION_APPEND";

export interface SyncQueueItem {
  queueId?: number;
  opType: SyncOpType;
  entityId: string;
  payload: string; // JSON
  groupId: string | null;
  enqueuedAt: number;
  attempts: number;
  lastError: string | null;
}

export class AppDatabase extends Dexie {
  parents!: Table<Parent, string>;
  children!: Table<Child, string>;
  events!: Table<Event, string>;
  assignments!: Table<RideAssignment, string>;
  groups!: Table<Group, string>;
  notifications!: Table<NotificationEntry, string>;
  syncQueue!: Table<SyncQueueItem, number>;

  constructor() {
    super("kids-rides");
    this.version(1).stores({
      parents: "parentId, email",
      children: "childId, parentOwnerId",
      events: "eventId, childId, groupId, startDateTime, status",
      assignments: "assignmentId, eventId, driverParentId, assignmentStatus",
      groups: "groupId",
      notifications: "notificationId, groupId, createdAt",
      syncQueue: "++queueId, entityId, opType, enqueuedAt",
    });
  }
}

let _db: AppDatabase | null = null;
export function db(): AppDatabase {
  if (!_db) _db = new AppDatabase();
  return _db;
}

/** Test helper: resets the singleton — useful between tests. */
export function __resetDb(): void {
  if (_db) {
    _db.close();
    _db = null;
  }
}
