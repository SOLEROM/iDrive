import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { MockDriveAdapter } from "@/remote/mock/mockDriveAdapter";
import { MockSheetsAdapter } from "@/remote/mock/mockSheetsAdapter";
import { SyncEngine, type SyncState } from "@/services/syncEngine";
import { db } from "@/storage/db";
import type { Parent } from "@/domain/models";
import { parentsRepo } from "@/storage/repository";
import {
  defaultAppLocalConfig,
  type AppLocalConfig,
  parseConfig,
  encodeConfig,
} from "@/domain/config";
import { newParent } from "@/domain/models";

interface AppContextValue {
  parent: Parent | null;
  signIn(displayName: string, email: string): Promise<void>;
  signOut(): Promise<void>;
  config: AppLocalConfig;
  setConfig(next: Partial<AppLocalConfig>): void;
  sync: SyncEngine;
  syncState: SyncState;
}

const Ctx = createContext<AppContextValue | null>(null);

const LOCAL_CFG_KEY = "kidsrides.localConfig";

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [parent, setParent] = useState<Parent | null>(null);
  const [config, setConfigState] = useState<AppLocalConfig>(loadLocalConfig);
  const [syncState, setSyncState] = useState<SyncState>({ status: "IDLE" });

  const sync = useMemo(() => {
    const drive = new MockDriveAdapter();
    const sheets = new MockSheetsAdapter();
    return new SyncEngine(drive, sheets);
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const p = await parentsRepo.current();
      if (!cancelled) setParent(p ?? null);
    })();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => sync.subscribe(setSyncState), [sync]);

  const signIn = async (displayName: string, email: string) => {
    const parentId = `p-${Math.random().toString(36).slice(2, 10)}`;
    const p = newParent({
      parentId,
      displayName,
      email,
      groupIds: ["group-demo"],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
    const saved = await parentsRepo.upsert(p);
    setParent(saved);
  };

  const signOut = async () => {
    await db().delete();
    setParent(null);
    localStorage.removeItem(LOCAL_CFG_KEY);
    setConfigState(defaultAppLocalConfig);
    window.location.reload();
  };

  const setConfig = (next: Partial<AppLocalConfig>) => {
    const merged = { ...config, ...next };
    localStorage.setItem(LOCAL_CFG_KEY, encodeConfig(merged));
    setConfigState(merged);
  };

  return (
    <Ctx.Provider value={{ parent, signIn, signOut, config, setConfig, sync, syncState }}>
      {children}
    </Ctx.Provider>
  );
}

export function useApp(): AppContextValue {
  const v = useContext(Ctx);
  if (!v) throw new Error("useApp must be used inside <AppProvider>");
  return v;
}

function loadLocalConfig(): AppLocalConfig {
  if (typeof localStorage === "undefined") return defaultAppLocalConfig;
  const raw = localStorage.getItem(LOCAL_CFG_KEY);
  if (!raw) return defaultAppLocalConfig;
  return parseConfig(raw, defaultAppLocalConfig);
}
