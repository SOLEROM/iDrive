import { onSnapshot, setDoc } from "firebase/firestore";
import type { Activity } from "@/domain/models";
import { groupDoc } from "./paths";

export interface SharedConfig {
  globalLocations: string[];
  globalActivities: Activity[];
}

// Refresh roster on every sign-in. Always a blind merge of groupName +
// members — never read first, and never touch globalLocations /
// globalActivities.
//
// Why no getDoc: a brand-new group doc doesn't exist yet, and the
// `allow read` rule (isMember) does get(group).data.members — which
// errors on a missing doc and is denied. So pre-reading would deadlock
// the very first member of a newly-added family ("Sign-in failed").
// A merge setDoc satisfies the `create` rule (members[] includes the
// signer) for a new group and the `update` rule for an existing one.
//
// globalLocations / globalActivities are intentionally omitted: merge
// leaves any existing values alone, and listenSharedConfig defaults a
// missing field to [], so a brand-new group reads as empty until first
// use. (Including them here would patch them back to [] on every
// re-sign-in and wipe everyone's shared lists.)
export async function ensureGroupDoc(
  groupId: string,
  groupName: string,
  members: string[],
): Promise<void> {
  await setDoc(groupDoc(groupId), { groupName, members }, { merge: true });
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
