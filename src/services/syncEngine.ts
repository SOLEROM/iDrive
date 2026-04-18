import type { DriveAdapter } from "@/remote/driveAdapter";
import type { SheetsAdapter } from "@/remote/sheetsAdapter";
import { db } from "@/storage/db";
import type { Event, RideAssignment, NotificationEntry, Parent } from "@/domain/models";

export type SyncState =
  | { status: "IDLE" }
  | { status: "RUNNING"; startedAt: number }
  | { status: "ERROR"; error: string; at: number }
  | { status: "DONE"; at: number };

export class SyncEngine {
  private listeners = new Set<(s: SyncState) => void>();
  private current: SyncState = { status: "IDLE" };

  constructor(
    private drive: DriveAdapter,
    private sheets: SheetsAdapter,
  ) {}

  subscribe(fn: (s: SyncState) => void): () => void {
    this.listeners.add(fn);
    fn(this.current);
    return () => this.listeners.delete(fn);
  }

  state(): SyncState { return this.current; }

  private emit(s: SyncState) {
    this.current = s;
    this.listeners.forEach((fn) => fn(s));
  }

  /**
   * Flush the sync queue: drain every pending op and, on success, remove it.
   * Failed ops are retried up to `maxAttempts` with exponential back-off.
   */
  async runOnce(maxAttempts = 5): Promise<void> {
    this.emit({ status: "RUNNING", startedAt: Date.now() });
    try {
      const parent = (await db().parents.toArray())[0];
      if (!parent) {
        this.emit({ status: "DONE", at: Date.now() });
        return;
      }
      await this.pushQueue(parent, maxAttempts);
      await this.pullGroupData(parent);
      this.emit({ status: "DONE", at: Date.now() });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      this.emit({ status: "ERROR", error: msg, at: Date.now() });
    }
  }

  private async pushQueue(parent: Parent, maxAttempts: number): Promise<void> {
    const items = await db().syncQueue.orderBy("enqueuedAt").toArray();
    for (const item of items) {
      if (item.attempts >= maxAttempts) continue;
      try {
        await this.applyOp(item.opType, item.payload, parent);
        await db().syncQueue.delete(item.queueId!);
      } catch (e) {
        const err = e instanceof Error ? e.message : String(e);
        await db().syncQueue.update(item.queueId!, {
          attempts: item.attempts + 1,
          lastError: err,
        });
      }
    }
  }

  private async applyOp(opType: string, payload: string, parent: Parent): Promise<void> {
    const data = JSON.parse(payload);
    switch (opType) {
      case "CHILD_UPSERT":
      case "PARENT_UPSERT": {
        const pdd = (await this.drive.read(parent.parentId)) ?? {
          schemaVersion: 1,
          parent,
          children: [],
          privateEvents: [],
          knownGroups: [],
          cachedRemoteIds: { driveFileId: null, sheetIds: {} },
          updatedAt: 0,
        };
        if (opType === "CHILD_UPSERT") {
          pdd.children = mergeById(pdd.children, data as any, "childId");
        } else {
          pdd.parent = data as Parent;
        }
        pdd.updatedAt = Date.now();
        await this.drive.write(parent.parentId, pdd);
        return;
      }
      case "EVENT_UPSERT": {
        const evt = data as Event;
        const groupId = evt.groupId;
        if (!groupId) {
          // private event → Drive
          const pdd = (await this.drive.read(parent.parentId)) ?? null;
          if (pdd) {
            pdd.privateEvents = mergeById(pdd.privateEvents, evt, "eventId");
            pdd.updatedAt = Date.now();
            await this.drive.write(parent.parentId, pdd);
          }
          return;
        }
        const sheetId = await this.sheets.ensureSheetExists(groupId, groupId);
        const existing = await this.sheets.readEvents(sheetId);
        await this.sheets.writeEvents(sheetId, mergeById(existing, evt, "eventId"));
        return;
      }
      case "ASSIGNMENT_UPSERT": {
        const a = data as RideAssignment;
        const evt = await db().events.get(a.eventId);
        const groupId = evt?.groupId;
        if (!groupId) return;
        const sheetId = await this.sheets.ensureSheetExists(groupId, groupId);
        const existing = await this.sheets.readAssignments(sheetId);
        await this.sheets.writeAssignments(
          sheetId,
          mergeById(existing, a, "assignmentId"),
        );
        return;
      }
      case "NOTIFICATION_APPEND": {
        const n = data as NotificationEntry;
        const sheetId = await this.sheets.ensureSheetExists(n.groupId, n.groupId);
        await this.sheets.appendNotification(sheetId, n);
        return;
      }
      default:
        return;
    }
  }

  private async pullGroupData(parent: Parent): Promise<void> {
    for (const groupId of parent.groupIds) {
      const sheetId = await this.sheets.ensureSheetExists(groupId, groupId);
      const [events, assignments, notifications] = await Promise.all([
        this.sheets.readEvents(sheetId),
        this.sheets.readAssignments(sheetId),
        this.sheets.readNotifications(sheetId),
      ]);
      await db().events.bulkPut(events);
      await db().assignments.bulkPut(assignments);
      await db().notifications.bulkPut(notifications);
    }
  }
}

function mergeById<T extends Record<string, any>>(existing: T[], incoming: T, key: keyof T): T[] {
  const map = new Map<any, T>(existing.map((x) => [x[key], x]));
  map.set(incoming[key], incoming);
  return Array.from(map.values());
}
