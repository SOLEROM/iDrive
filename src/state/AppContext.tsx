import React, { createContext, useContext, useEffect, useRef, useState } from "react";
import { defaultAppLocalConfig, type AppLocalConfig } from "@/domain/config";
import type { Child, Event, RideAssignment } from "@/domain/models";
import {
  openExistingFile, createNewFile, writeToHandle,
  tryReopenSavedFile, clearSavedHandle, type AppData,
  isFSASupported, openFileFromBuffer, saveDataToIDB, loadDataFromIDB, clearDataFromIDB, buildWorkbookBlob,
} from "@/storage/xlsxStorage";

export interface AppParent {
  parentId: string;
  displayName: string;
  email: string;
}

interface AppContextValue {
  isLoading: boolean;
  fileError: string | null;
  fileHandle: FileSystemFileHandle | null;

  parent: AppParent | null;
  config: AppLocalConfig;
  children: Child[];
  events: Event[];
  assignments: RideAssignment[];

  openFile(): Promise<void>;
  openFileFromBuffer(buf: ArrayBuffer): Promise<void>;
  createFile(cfg: AppLocalConfig): Promise<void>;
  closeFile(): Promise<void>;
  downloadFile(): void;

  setConfig(next: Partial<AppLocalConfig>): Promise<void>;
  upsertChild(child: Child): Promise<void>;
  upsertEvent(event: Event): Promise<void>;
  upsertEvents(events: Event[]): Promise<void>;
  deleteEvent(eventId: string): Promise<void>;
  upsertAssignment(assignment: RideAssignment): Promise<void>;
}

const Ctx = createContext<AppContextValue | null>(null);

export function AppProvider({ children: reactChildren }: { children: React.ReactNode }) {
  const [isLoading, setIsLoading] = useState(true);
  const [fileError, setFileError] = useState<string | null>(null);
  const [fileHandle, setFileHandle] = useState<FileSystemFileHandle | null>(null);
  const [data, setData] = useState<AppData>({
    config: defaultAppLocalConfig,
    children: [],
    events: [],
    assignments: [],
  });
  const dataRef = useRef(data);
  dataRef.current = data; // keep ref current on every render

  // Try to silently reopen the last-used file on load.
  useEffect(() => {
    (async () => {
      try {
        if (isFSASupported()) {
          const result = await tryReopenSavedFile();
          if (result) {
            dataRef.current = result.data;
            setFileHandle(result.handle);
            setData(result.data);
          }
        } else {
          // iOS fallback: load from IndexedDB bytes
          const saved = await loadDataFromIDB();
          if (saved) {
            dataRef.current = saved;
            setData(saved);
          }
        }
      } catch { /* no saved file — stay on open screen */ }
      finally { setIsLoading(false); }
    })();
  }, []);

  const save = async (handle: FileSystemFileHandle | null, next: AppData) => {
    dataRef.current = next;
    setData(next);
    if (handle) {
      await writeToHandle(handle, next);
    } else {
      await saveDataToIDB(next);
    }
  };

  const openFile = async () => {
    setFileError(null);
    try {
      const result = await openExistingFile();
      dataRef.current = result.data;
      setFileHandle(result.handle);
      setData(result.data);
    } catch (e) {
      if ((e as DOMException).name !== "AbortError") {
        setFileError("Could not open file. Is it a valid idrive.xlsx?");
      }
    }
  };

  const openFileFromBufferFn = async (buf: ArrayBuffer) => {
    setFileError(null);
    try {
      const data = await openFileFromBuffer(buf);
      await saveDataToIDB(data);
      dataRef.current = data;
      setFileHandle(null);
      setData(data);
    } catch {
      setFileError("Could not open file. Is it a valid idrive.xlsx?");
    }
  };

  const createFile = async (cfg: AppLocalConfig) => {
    setFileError(null);
    try {
      if (isFSASupported()) {
        const result = await createNewFile(cfg);
        dataRef.current = result.data;
        setFileHandle(result.handle);
        setData(result.data);
      } else {
        const data: AppData = { config: cfg, children: [], events: [], assignments: [] };
        await saveDataToIDB(data);
        dataRef.current = data;
        setData(data);
      }
    } catch (e) {
      if ((e as DOMException).name !== "AbortError") {
        setFileError("Could not create file.");
      }
    }
  };

  const closeFile = async () => {
    await clearSavedHandle();
    await clearDataFromIDB();
    const empty = { config: defaultAppLocalConfig, children: [], events: [], assignments: [] };
    dataRef.current = empty;
    setFileHandle(null);
    setData(empty);
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

  const parent: AppParent | null =
    data.config.loginName && data.config.loginEmail
      ? { parentId: data.config.loginEmail, displayName: data.config.loginName, email: data.config.loginEmail }
      : null;

  return (
    <Ctx.Provider value={{
      isLoading, fileError, fileHandle,
      parent, config: data.config,
      children: data.children.filter((c) => !c.isArchived),
      events: data.events,
      assignments: data.assignments,
      openFile, openFileFromBuffer: openFileFromBufferFn, createFile, closeFile, downloadFile,
      setConfig, upsertChild, upsertEvent, upsertEvents, deleteEvent, upsertAssignment,
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
