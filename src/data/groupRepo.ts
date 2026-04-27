import { onSnapshot, setDoc } from "firebase/firestore";
import type { Activity } from "@/domain/models";
import { groupDoc } from "./paths";

export interface SharedConfig {
  globalLocations: string[];
  globalActivities: Activity[];
}

export async function ensureGroupDoc(
  groupId: string,
  groupName: string,
  members: string[],
): Promise<void> {
  await setDoc(
    groupDoc(groupId),
    { groupName, members, globalLocations: [], globalActivities: [] },
    { merge: true },
  );
}

export async function patchSharedConfig(
  groupId: string,
  patch: Partial<SharedConfig>,
): Promise<void> {
  await setDoc(groupDoc(groupId), patch, { merge: true });
}

export function listenSharedConfig(
  groupId: string,
  cb: (cfg: SharedConfig) => void,
): () => void {
  return onSnapshot(groupDoc(groupId), (snap) => {
    if (!snap.exists()) return;
    const d = snap.data();
    cb({
      globalLocations: (d.globalLocations as string[]) ?? [],
      globalActivities: (d.globalActivities as Activity[]) ?? [],
    });
  });
}
