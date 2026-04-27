import { onSnapshot, setDoc } from "firebase/firestore";
import { subCol, subDoc } from "./paths";

export interface AppParent {
  parentId: string;
  displayName: string;
  email: string;
}

export async function registerParent(
  groupId: string,
  uid: string,
  displayName: string,
  email: string,
): Promise<void> {
  await setDoc(subDoc(groupId, "parents", uid), { displayName, email }, { merge: true });
}

export function listenParents(
  groupId: string,
  cb: (parents: AppParent[]) => void,
): () => void {
  return onSnapshot(subCol(groupId, "parents"), (snap) => {
    cb(snap.docs.map((d) => ({
      parentId: d.id,
      displayName: String(d.data().displayName ?? ""),
      email: String(d.data().email ?? ""),
    })));
  });
}
