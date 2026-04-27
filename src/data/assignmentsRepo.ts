import { onSnapshot, setDoc } from "firebase/firestore";
import type { RideAssignment } from "@/domain/models";
import { subCol, subDoc } from "./paths";

/** Strip undefined values; Firestore setDoc rejects them. */
function stripUndefined<T extends object>(obj: T): T {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined) out[k] = v;
  }
  return out as T;
}

export async function upsertAssignment(
  groupId: string,
  assignment: RideAssignment,
): Promise<void> {
  await setDoc(
    subDoc(groupId, "assignments", assignment.assignmentId),
    stripUndefined({ ...assignment, updatedAt: Date.now() }),
  );
}

export function listenAssignments(
  groupId: string,
  cb: (assignments: RideAssignment[]) => void,
): () => void {
  return onSnapshot(subCol(groupId, "assignments"), (snap) => {
    cb(snap.docs.map((d) => d.data() as RideAssignment));
  });
}
