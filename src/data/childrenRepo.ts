import { deleteDoc, onSnapshot, setDoc } from "firebase/firestore";
import type { Child } from "@/domain/models";
import { subCol, subDoc } from "./paths";

export async function upsertChild(groupId: string, child: Child): Promise<void> {
  await setDoc(subDoc(groupId, "children", child.childId), {
    ...child,
    updatedAt: Date.now(),
  });
}

export async function deleteChild(groupId: string, childId: string): Promise<void> {
  await deleteDoc(subDoc(groupId, "children", childId));
}

export function listenChildren(
  groupId: string,
  cb: (children: Child[]) => void,
): () => void {
  return onSnapshot(subCol(groupId, "children"), (snap) => {
    cb(snap.docs.map((d) => d.data() as Child));
  });
}
