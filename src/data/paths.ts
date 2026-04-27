import { collection, doc } from "firebase/firestore";
import { db } from "./firebase";

export const groupDoc = (gid: string) => doc(db, "groups", gid);
export const subCol = (gid: string, sub: string) => collection(db, "groups", gid, sub);
export const subDoc = (gid: string, sub: string, id: string) => doc(db, "groups", gid, sub, id);
