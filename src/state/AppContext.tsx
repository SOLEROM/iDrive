import React, { createContext, useCallback, useContext, useMemo } from "react";
import { signInWithGoogle as authSignIn, signOut as authSignOut } from "@/data/authRepo";
import { upsertChild as repoUpsertChild, deleteChild as repoDeleteChild } from "@/data/childrenRepo";
import {
  upsertEvent as repoUpsertEvent,
  upsertEvents as repoUpsertEvents,
  deleteEventCascade, deleteEventsCascade,
} from "@/data/eventsRepo";
import { upsertAssignment as repoUpsertAssignment } from "@/data/assignmentsRepo";
import { patchSharedConfig } from "@/data/groupRepo";
import { findFamily } from "@/data/familiesBundle";
import type { AppParent } from "@/data/parentsRepo";
import { defaultAppLocalConfig, type AppLocalConfig } from "@/domain/config";
import type { Child, Event, RideAssignment } from "@/domain/models";
import { useAuth, clearGroupCache } from "./useAuth";
import { useGroupData } from "./useGroupData";
import { useLocalConfig } from "./useLocalConfig";
import { useTheme } from "./useTheme";
import { useRollingRegen } from "./useRollingRegen";

export type { AppParent };

interface AppContextValue {
  isLoading: boolean;
  authUser: ReturnType<typeof useAuth>["authUser"];
  authError: string | null;
  groupId: string | null;

  parent: AppParent | null;
  parents: AppParent[];
  /** Authoritative roster from the bundled families.yaml (lower-cased emails). */
  bundleMembers: string[];
  config: AppLocalConfig;
  children: Child[];
  events: Event[];
  assignments: RideAssignment[];

  signInWithGoogle(): Promise<void>;
  signOut(): Promise<void>;

  downloadFile(): void;
  downloadAnalytics(): void;
  setConfig(next: Partial<AppLocalConfig>): Promise<void>;
  upsertChild(child: Child): Promise<void>;
  deleteChildCascade(childId: string): Promise<void>;
  upsertEvent(event: Event): Promise<void>;
  upsertEvents(events: Event[]): Promise<void>;
  deleteEvent(eventId: string): Promise<void>;
  deleteEvents(eventIds: string[]): Promise<void>;
  upsertAssignment(assignment: RideAssignment): Promise<void>;
}

const Ctx = createContext<AppContextValue | null>(null);

const SHARED_KEYS = new Set(["globalLocations", "globalActivities"]);

export function AppProvider({ children: reactChildren }: { children: React.ReactNode }) {
  const { isLoading, authUser, groupId, authError } = useAuth();
  const { parents, children, events, assignments, sharedConfig } = useGroupData(groupId);
  const { local, patchLocal } = useLocalConfig();

  useTheme(local.themeMode);

  const parent: AppParent | null = useMemo(
    () => (authUser ? (parents.find((p) => p.parentId === authUser.uid) ?? null) : null),
    [authUser, parents],
  );

  const bundleMembers: string[] = useMemo(() => {
    const family = authUser?.email ? findFamily(authUser.email) : undefined;
    return (family?.members ?? []).map((m) => m.toLowerCase());
  }, [authUser]);

  const config: AppLocalConfig = useMemo(() => ({
    ...defaultAppLocalConfig,
    ...local,
    globalLocations: sharedConfig.globalLocations,
    globalActivities: sharedConfig.globalActivities,
    loginName: parent?.displayName ?? "",
    loginEmail: authUser?.email ?? "",
    activeParentId: authUser?.uid ?? "",
  }), [local, sharedConfig, parent, authUser]);

  const signInWithGoogle = useCallback(() => authSignIn(), []);
  const signOut = useCallback(async () => {
    if (authUser) await clearGroupCache(authUser.uid);
    await authSignOut();
  }, [authUser]);

  const downloadFile = useCallback(() => {
    void (async () => {
      const mod = await import("@/data/xlsxExporter");
      const blob = mod.buildBackupBlob({ config, parents, children, events, assignments });
      triggerDownload(blob, "idrive-backup.xlsx");
    })();
  }, [config, parents, children, events, assignments]);

  const downloadAnalytics = useCallback(() => {
    void (async () => {
      const mod = await import("@/data/xlsxExporter");
      const blob = mod.buildAnalyticsBlob({ config, parents, children, events, assignments });
      triggerDownload(blob, "idrive-analytics.xlsx");
    })();
  }, [config, parents, children, events, assignments]);

  const setConfig = useCallback(async (next: Partial<AppLocalConfig>) => {
    const sharedUpdates: Record<string, unknown> = {};
    const localUpdates: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(next)) {
      if (SHARED_KEYS.has(k)) sharedUpdates[k] = v;
      else localUpdates[k] = v;
    }
    if (Object.keys(sharedUpdates).length > 0 && groupId) {
      await patchSharedConfig(groupId, sharedUpdates as Record<"globalLocations" | "globalActivities", never>);
    }
    if (Object.keys(localUpdates).length > 0) {
      patchLocal(localUpdates as Partial<AppLocalConfig>);
    }
  }, [groupId, patchLocal]);

  const upsertChild = useCallback(async (c: Child) => {
    if (!groupId) return;
    await repoUpsertChild(groupId, c);
  }, [groupId]);

  const deleteChildCascade = useCallback(async (childId: string) => {
    if (!groupId) return;
    const eventIds = events.filter((e) => e.childId === childId).map((e) => e.eventId);
    if (eventIds.length > 0) {
      await deleteEventsCascade(groupId, eventIds, assignments);
    }
    await repoDeleteChild(groupId, childId);
  }, [groupId, events, assignments]);

  const upsertEvent = useCallback(async (e: Event) => {
    if (!groupId) return;
    await repoUpsertEvent(groupId, e);
  }, [groupId]);

  const upsertEvents = useCallback(async (es: Event[]) => {
    if (!groupId) return;
    await repoUpsertEvents(groupId, es);
  }, [groupId]);

  // Pitfall #19 fix: keep activity events rolling forward.
  useRollingRegen(!!groupId && !isLoading, children, events, upsertEvents);

  const deleteEvent = useCallback(async (eventId: string) => {
    if (!groupId) return;
    await deleteEventCascade(groupId, eventId, assignments);
  }, [groupId, assignments]);

  const deleteEvents = useCallback(async (eventIds: string[]) => {
    if (!groupId) return;
    await deleteEventsCascade(groupId, eventIds, assignments);
  }, [groupId, assignments]);

  const upsertAssignment = useCallback(async (a: RideAssignment) => {
    if (!groupId) return;
    await repoUpsertAssignment(groupId, a);
  }, [groupId]);

  const value: AppContextValue = {
    isLoading, authUser, authError, groupId,
    parent, parents, bundleMembers, config,
    children: children.filter((c) => !c.isArchived),
    events, assignments,
    signInWithGoogle, signOut, downloadFile, downloadAnalytics, setConfig,
    upsertChild, deleteChildCascade, upsertEvent, upsertEvents,
    deleteEvent, deleteEvents, upsertAssignment,
  };

  return <Ctx.Provider value={value}>{reactChildren}</Ctx.Provider>;
}

export function useApp(): AppContextValue {
  const v = useContext(Ctx);
  if (!v) throw new Error("useApp must be used inside <AppProvider>");
  return v;
}

function triggerDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
