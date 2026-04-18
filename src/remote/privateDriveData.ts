import type { Child, Event, Parent } from "@/domain/models";

export interface KnownGroupEntry {
  groupId: string;
  groupName: string;
  sharedSheetId: string;
  role: "ADMIN" | "MEMBER";
}

export interface CachedRemoteIds {
  driveFileId: string | null;
  sheetIds: Record<string, string>;
}

/** Top-level shape of the JSON file stored in the parent's Drive. */
export interface PrivateDriveData {
  schemaVersion: number;
  parent: Parent;
  children: Child[];
  privateEvents: Event[];
  knownGroups: KnownGroupEntry[];
  cachedRemoteIds: CachedRemoteIds;
  updatedAt: number;
}

export function newPrivateDriveData(parent: Parent): PrivateDriveData {
  return {
    schemaVersion: 1,
    parent,
    children: [],
    privateEvents: [],
    knownGroups: [],
    cachedRemoteIds: { driveFileId: null, sheetIds: {} },
    updatedAt: 0,
  };
}
