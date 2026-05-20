import { getDoc, onSnapshot, setDoc } from "firebase/firestore";
import type { Activity } from "@/domain/models";
import { groupDoc } from "./paths";

export interface SharedConfig {
  globalLocations: string[];
  globalActivities: Activity[];
}

// Refresh roster on every sign-in, but never touch globalLocations /
// globalActivities — otherwise a re-sign-in patches them back to [] and
// wipes everyone's shared lists.
export async function ensureGroupDoc(
  groupId: string,
  groupName: string,
  members: string[],
): Promise<void> {
  const ref = groupDoc(groupId);
  const existing = await getDoc(ref);
  if (existing.exists()) {
    await setDoc(ref, { groupName, members }, { merge: true });
  } else {
    await setDoc(ref, { groupName, members, globalLocations: [], globalActivities: [] });
  }
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
