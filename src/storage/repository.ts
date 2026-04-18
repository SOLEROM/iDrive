import { liveQuery, type Observable } from "dexie";
import type {
  Child,
  Event,
  NotificationEntry,
  Parent,
  RideAssignment,
} from "@/domain/models";
import { db, type SyncOpType } from "./db";

const now = () => Date.now();

// ─── Children ───────────────────────────────────────────────────────────────
export const childrenRepo = {
  observeAll(): Observable<Child[]> {
    return liveQuery(async () =>
      (await db().children.toArray()).filter((c) => !c.isArchived),
    );
  },
  async list(): Promise<Child[]> {
    return (await db().children.toArray()).filter((c) => !c.isArchived);
  },
  async byId(childId: string): Promise<Child | undefined> {
    return db().children.get(childId);
  },
  async upsert(child: Child): Promise<Child> {
    const withTs = { ...child, updatedAt: now(), createdAt: child.createdAt || now() };
    await db().children.put(withTs);
    await enqueue("CHILD_UPSERT", withTs.childId, withTs, null);
    return withTs;
  },
  async archive(childId: string): Promise<void> {
    const c = await db().children.get(childId);
    if (!c) return;
    await childrenRepo.upsert({ ...c, isArchived: true });
  },
};

// ─── Events ─────────────────────────────────────────────────────────────────
export const eventsRepo = {
  observeAll(): Observable<Event[]> {
    return liveQuery(() => db().events.orderBy("startDateTime").toArray());
  },
  async list(): Promise<Event[]> {
    return db().events.orderBy("startDateTime").toArray();
  },
  async byId(eventId: string): Promise<Event | undefined> {
    return db().events.get(eventId);
  },
  async byChild(childId: string): Promise<Event[]> {
    return db().events.where("childId").equals(childId).sortBy("startDateTime");
  },
  async upsert(event: Event): Promise<Event> {
    const withTs = { ...event, updatedAt: now(), createdAt: event.createdAt || now() };
    await db().events.put(withTs);
    await enqueue("EVENT_UPSERT", withTs.eventId, withTs, withTs.groupId ?? null);
    return withTs;
  },
  async delete(eventId: string): Promise<void> {
    await db().events.delete(eventId);
  },
};

// ─── Ride Assignments ───────────────────────────────────────────────────────
export const assignmentsRepo = {
  observeAll(): Observable<RideAssignment[]> {
    return liveQuery(() => db().assignments.toArray());
  },
  async list(): Promise<RideAssignment[]> {
    return db().assignments.toArray();
  },
  async byEvent(eventId: string): Promise<RideAssignment[]> {
    return db().assignments.where("eventId").equals(eventId).toArray();
  },
  async byDriver(driverId: string): Promise<RideAssignment[]> {
    return db().assignments.where("driverParentId").equals(driverId).toArray();
  },
  async upsert(a: RideAssignment): Promise<RideAssignment> {
    const withTs = { ...a, updatedAt: now() };
    await db().assignments.put(withTs);
    await enqueue("ASSIGNMENT_UPSERT", withTs.assignmentId, withTs, null);
    return withTs;
  },
};

// ─── Parents ────────────────────────────────────────────────────────────────
export const parentsRepo = {
  async current(): Promise<Parent | undefined> {
    return (await db().parents.toArray())[0];
  },
  async upsert(p: Parent): Promise<Parent> {
    const withTs = { ...p, updatedAt: now(), createdAt: p.createdAt || now() };
    await db().parents.put(withTs);
    await enqueue("PARENT_UPSERT", withTs.parentId, withTs, null);
    return withTs;
  },
};

// ─── Notifications ──────────────────────────────────────────────────────────
export const notificationsRepo = {
  observeRecent(limit = 50): Observable<NotificationEntry[]> {
    return liveQuery(async () => {
      const all = await db().notifications.orderBy("createdAt").reverse().toArray();
      return all.slice(0, limit);
    });
  },
  async append(n: NotificationEntry): Promise<void> {
    await db().notifications.put(n);
    await enqueue("NOTIFICATION_APPEND", n.notificationId, n, n.groupId);
  },
};

// ─── Sync queue helper ──────────────────────────────────────────────────────
async function enqueue(
  opType: SyncOpType,
  entityId: string,
  payload: unknown,
  groupId: string | null,
): Promise<void> {
  await db().syncQueue.add({
    opType,
    entityId,
    payload: JSON.stringify(payload),
    groupId,
    enqueuedAt: now(),
    attempts: 0,
    lastError: null,
  });
}
