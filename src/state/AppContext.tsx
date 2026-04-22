import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { defaultAppLocalConfig, type AppLocalConfig } from "@/domain/config";
import type { Child, Event, RideAssignment } from "@/domain/models";
import {
  openExistingFile, createNewFile, writeToHandle, persistHandle, readFromHandle, loadSavedHandle,
  tryReopenSavedFile, clearSavedHandle, type AppData,
  isFSASupported, openFileFromBuffer, saveDataToIDB, loadDataFromIDB, clearDataFromIDB, buildWorkbookBlob,
  type StoredParent,
} from "@/storage/xlsxStorage";

export interface AppParent {
  parentId: string;
  displayName: string;
}

interface AppContextValue {
  isLoading: boolean;
  fileLoaded: boolean;
  fileError: string | null;
  fileHandle: FileSystemFileHandle | null;
  isSyncing: boolean;
  syncNeeded: boolean;
  lastSyncAt: number | null;

  parent: AppParent | null;
  parents: AppParent[];
  config: AppLocalConfig;
  children: Child[];
  events: Event[];
  assignments: RideAssignment[];

  sync(): Promise<void>;
  syncFromBuffer(buf: ArrayBuffer): Promise<void>;
  openFile(): Promise<void>;
  openFileFromBuffer(buf: ArrayBuffer): Promise<void>;
  createFile(): Promise<void>;
  closeFile(): Promise<void>;
  downloadFile(): void;

  addParentAndSwitch(name: string): Promise<void>;
  switchParent(parentId: string): Promise<void>;
  logOut(): Promise<void>;

  setConfig(next: Partial<AppLocalConfig>): Promise<void>;
  upsertChild(child: Child): Promise<void>;
  upsertEvent(event: Event): Promise<void>;
  upsertEvents(events: Event[]): Promise<void>;
  deleteEvent(eventId: string): Promise<void>;
  deleteEvents(eventIds: string[]): Promise<void>;
  upsertAssignment(assignment: RideAssignment): Promise<void>;
}

const Ctx = createContext<AppContextValue | null>(null);

function makeEmptyData(): AppData {
  return { config: defaultAppLocalConfig, parents: [], children: [], events: [], assignments: [] };
}

function mergeData(local: AppData, remote: AppData): AppData {
  const parentMap = new Map<string, StoredParent>();
  for (const p of [...remote.parents, ...local.parents]) parentMap.set(p.parentId, p);

  const childMap = new Map<string, Child>();
  for (const c of [...remote.children, ...local.children]) {
    const ex = childMap.get(c.childId);
    if (!ex || c.updatedAt > ex.updatedAt) childMap.set(c.childId, c);
  }

  const eventMap = new Map<string, Event>();
  for (const e of [...remote.events, ...local.events]) {
    const ex = eventMap.get(e.eventId);
    if (!ex || e.updatedAt > ex.updatedAt) eventMap.set(e.eventId, e);
  }

  const assignMap = new Map<string, RideAssignment>();
  for (const a of [...remote.assignments, ...local.assignments]) {
    const ex = assignMap.get(a.assignmentId);
    if (!ex || a.updatedAt > ex.updatedAt) assignMap.set(a.assignmentId, a);
  }

  return {
    config: local.config, // local config wins (device-specific settings)
    parents: [...parentMap.values()],
    children: [...childMap.values()],
    events: [...eventMap.values()],
    assignments: [...assignMap.values()],
  };
}

export function AppProvider({ children: reactChildren }: { children: React.ReactNode }) {
  const [isLoading, setIsLoading] = useState(true);
  const [fileLoaded, setFileLoaded] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);
  const [fileHandle, setFileHandle] = useState<FileSystemFileHandle | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncNeeded, setSyncNeeded] = useState(false);
  const [lastSyncAt, setLastSyncAt] = useState<number | null>(null);
  const [data, setData] = useState<AppData>(makeEmptyData());
  const dataRef = useRef(data);
  dataRef.current = data;
  const fileHandleRef = useRef(fileHandle);
  fileHandleRef.current = fileHandle;
  const isSyncingRef = useRef(false);

  useEffect(() => {
    (async () => {
      try {
        if (isFSASupported()) {
          try {
            const result = await tryReopenSavedFile();
            if (result) {
              dataRef.current = result.data;
              setFileHandle(result.handle);
              setData(result.data);
              setFileLoaded(true);
              return;
            }
          } catch { /* permission expired or FSA error — fall through to IDB */ }
        }
        // Always try IDB: covers iOS, Android, and FSA permission-expiry after refresh
        const saved = await loadDataFromIDB();
        if (saved) {
          dataRef.current = saved;
          setData(saved);
          setFileLoaded(true);
        }
      } catch { /* no saved data — show open screen */ }
      finally { setIsLoading(false); }
    })();
  }, []);

  const save = async (handle: FileSystemFileHandle | null, next: AppData) => {
    dataRef.current = next;
    setData(next);
    if (handle) await writeToHandle(handle, next);
    await saveDataToIDB(next); // always cache in IDB so refresh restores session
  };

  // Stable sync function — reads from refs to avoid stale closures
  const sync = useCallback(async () => {
    if (isSyncingRef.current) return;

    let handle = fileHandleRef.current;

    // If the live handle was lost (permission expired after refresh), try to regain it.
    // requestPermission requires a user gesture — clicking Sync satisfies that.
    if (!handle && isFSASupported()) {
      try {
        const saved = await loadSavedHandle();
        if (saved) {
          const perm = await saved.requestPermission({ mode: "readwrite" });
          if (perm === "granted") {
            handle = saved;
            setFileHandle(saved);
            fileHandleRef.current = saved;
          }
        }
      } catch { return; }
      if (!handle) return;
    }

    if (!handle) return;
    isSyncingRef.current = true;
    setIsSyncing(true);
    try {
      const remote = await readFromHandle(handle);
      const merged = mergeData(dataRef.current, remote);
      await writeToHandle(handle, merged);
      await saveDataToIDB(merged);
      dataRef.current = merged;
      setData(merged);
      setLastSyncAt(Date.now());
    } catch { /* silent — file may be locked by Dropbox */ }
    finally {
      isSyncingRef.current = false;
      setIsSyncing(false);
    }
  }, []);

  // Auto-sync timer — FSA: calls sync(); iOS/IDB: sets syncNeeded badge
  useEffect(() => {
    const minutes = data.config.syncIntervalMinutes;
    if (!minutes || !fileLoaded) return;
    const id = setInterval(() => {
      if (fileHandleRef.current) {
        sync();
      } else {
        setSyncNeeded(true); // can't auto-pick file on iOS — show badge instead
      }
    }, minutes * 60_000);
    return () => clearInterval(id);
  }, [fileHandle, fileLoaded, data.config.syncIntervalMinutes, sync]);

  // iOS sync: read file from user-picked buffer, merge into IDB
  const syncFromBuffer = useCallback(async (buf: ArrayBuffer) => {
    if (isSyncingRef.current) return;
    isSyncingRef.current = true;
    setIsSyncing(true);
    setSyncNeeded(false);
    try {
      const remote = await openFileFromBuffer(buf);
      const merged = mergeData(dataRef.current, remote);
      await saveDataToIDB(merged);
      dataRef.current = merged;
      setData(merged);
      setLastSyncAt(Date.now());
    } catch { /* ignore bad file */ }
    finally {
      isSyncingRef.current = false;
      setIsSyncing(false);
    }
  }, []);

  const openFile = async () => {
    setFileError(null);
    try {
      const result = await openExistingFile();
      dataRef.current = result.data;
      setFileHandle(result.handle);
      setData(result.data);
      setFileLoaded(true);
    } catch (e) {
      if ((e as DOMException).name !== "AbortError") {
        setFileError("Could not open file. Is it a valid idrive.xlsx?");
      }
    }
  };

  const openFileFromBufferFn = async (buf: ArrayBuffer) => {
    setFileError(null);
    try {
      const loaded = await openFileFromBuffer(buf);
      await saveDataToIDB(loaded);
      dataRef.current = loaded;
      setFileHandle(null);
      setData(loaded);
      setFileLoaded(true);
    } catch {
      setFileError("Could not open file. Is it a valid idrive.xlsx?");
    }
  };

  const createFile = async () => {
    setFileError(null);
    const emptyData: AppData = { config: defaultAppLocalConfig, parents: [], children: [], events: [], assignments: [] };

    if ("showSaveFilePicker" in window) {
      try {
        const result = await createNewFile(emptyData);
        dataRef.current = result.data;
        setFileHandle(result.handle);
        setData(result.data);
        setFileLoaded(true);
      } catch (e) {
        if ((e as DOMException).name !== "AbortError") setFileError("Could not create file.");
      }
      return;
    }

    if ("showDirectoryPicker" in window) {
      try {
        const dir = await showDirectoryPicker({ mode: "readwrite" });
        const handle = await dir.getFileHandle("idrive.xlsx", { create: true });
        await writeToHandle(handle, emptyData);
        await persistHandle(handle);
        dataRef.current = emptyData;
        setFileHandle(handle);
        setData(emptyData);
        setFileLoaded(true);
      } catch (e) {
        if ((e as DOMException).name !== "AbortError") setFileError("Could not create file.");
      }
      return;
    }

    // Android / iOS — no file picker available, store in IDB
    try {
      await saveDataToIDB(emptyData);
      dataRef.current = emptyData;
      setData(emptyData);
      setFileLoaded(true);
    } catch {
      setFileError("Could not create file.");
    }
  };

  const closeFile = async () => {
    await clearSavedHandle();
    await clearDataFromIDB();
    const empty = makeEmptyData();
    dataRef.current = empty;
    setFileHandle(null);
    setData(empty);
    setFileLoaded(false);
    setLastSyncAt(null);
  };

  const downloadFile = () => {
    const blob = buildWorkbookBlob(dataRef.current);
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "idrive.xlsx";
    a.click();
    URL.revokeObjectURL(url);
  };

  const addParentAndSwitch = async (name: string) => {
    if (!fileHandle && isFSASupported()) return;
    const parentId = `p-${Math.random().toString(36).slice(2, 10)}`;
    const d = dataRef.current;
    await save(fileHandle, {
      ...d,
      parents: [...d.parents, { parentId, displayName: name.trim() }],
      config: { ...d.config, activeParentId: parentId },
    });
  };

  const switchParent = async (parentId: string) => {
    if (!fileHandle && isFSASupported()) return;
    const d = dataRef.current;
    await save(fileHandle, { ...d, config: { ...d.config, activeParentId: parentId } });
  };

  const logOut = async () => {
    if (!fileHandle && isFSASupported()) return;
    const d = dataRef.current;
    await save(fileHandle, { ...d, config: { ...d.config, activeParentId: "" } });
  };

  const setConfig = async (next: Partial<AppLocalConfig>) => {
    if (!fileHandle && isFSASupported()) return;
    const d = dataRef.current;
    await save(fileHandle, { ...d, config: { ...d.config, ...next } });
  };

  const upsertChild = async (child: Child) => {
    if (!fileHandle && isFSASupported()) return;
    const now = Date.now();
    const updated = { ...child, updatedAt: now };
    const d = dataRef.current;
    await save(fileHandle, { ...d, children: [...d.children.filter((c) => c.childId !== child.childId), updated] });
  };

  const upsertEvent = async (event: Event) => {
    if (!fileHandle && isFSASupported()) return;
    const now = Date.now();
    const updated = { ...event, updatedAt: now, createdAt: event.createdAt || now };
    const d = dataRef.current;
    await save(fileHandle, { ...d, events: [...d.events.filter((e) => e.eventId !== event.eventId), updated] });
  };

  const upsertEvents = async (eventsToUpsert: Event[]) => {
    if (!fileHandle && isFSASupported()) return;
    const now = Date.now();
    const updatedList = eventsToUpsert.map((e) => ({ ...e, updatedAt: now, createdAt: e.createdAt || now }));
    const ids = new Set(updatedList.map((e) => e.eventId));
    const d = dataRef.current;
    await save(fileHandle, { ...d, events: [...d.events.filter((e) => !ids.has(e.eventId)), ...updatedList] });
  };

  const deleteEvent = async (eventId: string) => {
    if (!fileHandle && isFSASupported()) return;
    const d = dataRef.current;
    await save(fileHandle, {
      ...d,
      events: d.events.filter((e) => e.eventId !== eventId),
      assignments: d.assignments.filter((a) => a.eventId !== eventId),
    });
  };

  const deleteEvents = async (eventIds: string[]) => {
    if (!fileHandle && isFSASupported()) return;
    const idSet = new Set(eventIds);
    const d = dataRef.current;
    await save(fileHandle, {
      ...d,
      events: d.events.filter((e) => !idSet.has(e.eventId)),
      assignments: d.assignments.filter((a) => !idSet.has(a.eventId)),
    });
  };

  const upsertAssignment = async (assignment: RideAssignment) => {
    if (!fileHandle && isFSASupported()) return;
    const now = Date.now();
    const updated = { ...assignment, updatedAt: now };
    const d = dataRef.current;
    await save(fileHandle, {
      ...d,
      assignments: [...d.assignments.filter((a) => a.assignmentId !== assignment.assignmentId), updated],
    });
  };

  const activeParent: AppParent | null = (() => {
    const { activeParentId, loginName, loginEmail } = data.config;
    const fromList = data.parents.find((p) => p.parentId === activeParentId);
    if (fromList) return fromList;
    if (loginName) return { parentId: loginEmail || loginName, displayName: loginName };
    return null;
  })();

  return (
    <Ctx.Provider value={{
      isLoading, fileLoaded, fileError, fileHandle, isSyncing, syncNeeded, lastSyncAt,
      parent: activeParent,
      parents: data.parents,
      config: data.config,
      children: data.children.filter((c) => !c.isArchived),
      events: data.events,
      assignments: data.assignments,
      sync, syncFromBuffer, openFile, openFileFromBuffer: openFileFromBufferFn, createFile, closeFile, downloadFile,
      addParentAndSwitch, switchParent, logOut,
      setConfig, upsertChild, upsertEvent, upsertEvents, deleteEvent, deleteEvents, upsertAssignment,
    }}>
      {reactChildren}
    </Ctx.Provider>
  );
}

export function useApp(): AppContextValue {
  const v = useContext(Ctx);
  if (!v) throw new Error("useApp must be used inside <AppProvider>");
  return v;
}
