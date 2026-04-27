import { onSnapshot, setDoc, writeBatch } from "firebase/firestore";
import type { Event, RideAssignment } from "@/domain/models";
import { db } from "./firebase";
import { subCol, subDoc } from "./paths";

export async function upsertEvent(groupId: string, event: Event): Promise<void> {
  const now = Date.now();
  await setDoc(subDoc(groupId, "events", event.eventId), {
    ...event,
    updatedAt: now,
    createdAt: event.createdAt || now,
  });
}

export async function upsertEvents(groupId: string, events: Event[]): Promise<void> {
  if (events.length === 0) return;
  const now = Date.now();
  const batch = writeBatch(db);
  for (const e of events) {
    batch.set(subDoc(groupId, "events", e.eventId), {
      ...e,
      updatedAt: now,
      createdAt: e.createdAt || now,
    });
  }
  await batch.commit();
}

export async function deleteEventCascade(
  groupId: string,
  eventId: string,
  assignments: RideAssignment[],
): Promise<void> {
  const batch = writeBatch(db);
  batch.delete(subDoc(groupId, "events", eventId));
  for (const a of assignments.filter((a) => a.eventId === eventId)) {
    batch.delete(subDoc(groupId, "assignments", a.assignmentId));
  }
  await batch.commit();
}

export async function deleteEventsCascade(
  groupId: string,
  eventIds: string[],
  assignments: RideAssignment[],
): Promise<void> {
  if (eventIds.length === 0) return;
  const idSet = new Set(eventIds);
  const batch = writeBatch(db);
  for (const id of eventIds) batch.delete(subDoc(groupId, "events", id));
  for (const a of assignments.filter((a) => idSet.has(a.eventId))) {
    batch.delete(subDoc(groupId, "assignments", a.assignmentId));
  }
  await batch.commit();
}

export function listenEvents(
  groupId: string,
  cb: (events: Event[]) => void,
): () => void {
  return onSnapshot(subCol(groupId, "events"), (snap) => {
    cb(snap.docs.map((d) => d.data() as Event));
  });
}
