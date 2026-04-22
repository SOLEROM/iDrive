import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import {
  onAuthStateChanged, signInWithPopup,
  GoogleAuthProvider, signOut as firebaseSignOut,
} from "firebase/auth";
import type { User } from "firebase/auth";
import {
  collection, doc, setDoc, deleteDoc, onSnapshot, writeBatch, getDoc,
} from "firebase/firestore";
import { auth, db } from "@/firebase";
import { defaultAppLocalConfig, type AppLocalConfig } from "@/domain/config";
import type { Activity, Child, Event, RideAssignment } from "@/domain/models";
import { buildWorkbookBlob, type AppData } from "@/storage/xlsxStorage";

// ── Local (device-only) config ────────────────────────────────────────────────
type LocalConfig = Omit<AppLocalConfig,
  "globalLocations" | "globalActivities" | "loginName" | "loginEmail" | "activeParentId" | "syncIntervalMinutes"
>;

const LOCAL_CONFIG_KEY = "idrive-local-config";
const GROUP_ID_KEY = "idrive-group-id";

const defaultLocalConfig: LocalConfig = {
  themeMode: defaultAppLocalConfig.themeMode,
  language: defaultAppLocalConfig.language,
  defaultLandingScreen: defaultAppLocalConfig.defaultLandingScreen,
  showCompletedRidesByDefault: defaultAppLocalConfig.showCompletedRidesByDefault,
  compactCardMode: defaultAppLocalConfig.compactCardMode,
  vibrateOnReminder: defaultAppLocalConfig.vibrateOnReminder,
  soundOnReminder: defaultAppLocalConfig.soundOnReminder,
  notificationLeadTimeMinutesDefault: defaultAppLocalConfig.notificationLeadTimeMinutesDefault,
  debugLoggingEnabled: defaultAppLocalConfig.debugLoggingEnabled,
};

function loadLocalConfig(): LocalConfig {
  try {
    const raw = localStorage.getItem(LOCAL_CONFIG_KEY);
    if (raw) return { ...defaultLocalConfig, ...(JSON.parse(raw) as Partial<LocalConfig>) };
  } catch { /* ignore */ }
  return defaultLocalConfig;
}

interface SharedConfig {
  globalLocations: string[];
  globalActivities: Activity[];
}

// ── Firestore path helpers ────────────────────────────────────────────────────
const groupDoc = (gid: string) => doc(db, "groups", gid);
const subCol = (gid: string, sub: string) => collection(db, "groups", gid, sub);
const subDoc = (gid: string, sub: string, id: string) => doc(db, "groups", gid, sub, id);
const inviteDoc = (email: string) => doc(db, "invites", email.toLowerCase().trim());
const profileDoc = (uid: string) => doc(db, "userProfiles", uid);

function generateGroupCode(): string {
  const chars = "abcdefghjkmnpqrstuvwxyz23456789";
  return Array.from({ length: 8 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
}

// ── Context interface ─────────────────────────────────────────────────────────
export interface AppParent {
  parentId: string;
  displayName: string;
  email?: string;
}

interface AppContextValue {
  isLoading: boolean;
  authUser: User | null;
  groupId: string | null;

  parent: AppParent | null;
  parents: AppParent[];
  config: AppLocalConfig;
  children: Child[];
  events: Event[];
  assignments: RideAssignment[];

  signInWithGoogle(): Promise<void>;
  signOut(): Promise<void>;
  inviteMember(email: string): Promise<string>;

  downloadFile(): void;
  setConfig(next: Partial<AppLocalConfig>): Promise<void>;
  upsertChild(child: Child): Promise<void>;
  upsertEvent(event: Event): Promise<void>;
  upsertEvents(events: Event[]): Promise<void>;
  deleteEvent(eventId: string): Promise<void>;
  deleteEvents(eventIds: string[]): Promise<void>;
  upsertAssignment(assignment: RideAssignment): Promise<void>;
}

const Ctx = createContext<AppContextValue | null>(null);

// ── Provider ──────────────────────────────────────────────────────────────────
export function AppProvider({ children: reactChildren }: { children: React.ReactNode }) {
  const [isLoading, setIsLoading] = useState(true);
  const [authUser, setAuthUser] = useState<User | null>(null);
  const [groupId, setGroupId] = useState<string | null>(null);
  const [parents, setParents] = useState<AppParent[]>([]);
  const [children, setChildren] = useState<Child[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [assignments, setAssignments] = useState<RideAssignment[]>([]);
  const [sharedConfig, setSharedConfig] = useState<SharedConfig>({ globalLocations: [], globalActivities: [] });
  const [localConfig, setLocalConfigState] = useState<LocalConfig>(loadLocalConfig);

  // ── Auth + auto group setup ───────────────────────────────────────────────
  useEffect(() => {
    return onAuthStateChanged(auth, async (user) => {
      setAuthUser(user);
      if (!user) {
        setGroupId(null);
        setParents([]);
        setChildren([]);
        setEvents([]);
        setAssignments([]);
        setSharedConfig({ globalLocations: [], globalActivities: [] });
        setIsLoading(false);
        return;
      }

      // 1. Already set up on this device (localStorage cache)?
      const saved = localStorage.getItem(`${GROUP_ID_KEY}-${user.uid}`);
      if (saved) {
        setGroupId(saved);
        setIsLoading(false);
        return;
      }

      try {
        // 2. Same account signed in elsewhere — find existing group from Firestore profile
        const profile = await getDoc(profileDoc(user.uid));
        if (profile.exists()) {
          const gid = (profile.data() as { groupId: string }).groupId;
          localStorage.setItem(`${GROUP_ID_KEY}-${user.uid}`, gid);
          setGroupId(gid);
          setIsLoading(false);
          return;
        }

        // 3. Check for a pending email invite
        if (user.email) {
          const invite = await getDoc(inviteDoc(user.email));
          if (invite.exists()) {
            const { groupId: gid } = invite.data() as { groupId: string };
            await joinGroupAs(user, gid);
            await deleteDoc(inviteDoc(user.email));
            setIsLoading(false);
            return;
          }
        }

        // 4. No group anywhere — create a fresh one
        await createGroupFor(user);
      } catch { /* silent — user will see empty state */ }
      setIsLoading(false);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const displayNameFor = (user: User) =>
    user.displayName?.trim() || user.email?.split("@")[0] || "Me";

  const createGroupFor = async (user: User) => {
    const gid = generateGroupCode();
    const now = Date.now();
    await setDoc(groupDoc(gid), { globalLocations: [], globalActivities: [], createdAt: now, createdByUid: user.uid });
    await setDoc(subDoc(gid, "parents", user.uid), { displayName: displayNameFor(user), email: user.email ?? "" });
    await setDoc(profileDoc(user.uid), { groupId: gid });
    localStorage.setItem(`${GROUP_ID_KEY}-${user.uid}`, gid);
    setGroupId(gid);
  };

  const joinGroupAs = async (user: User, gid: string) => {
    await setDoc(subDoc(gid, "parents", user.uid), { displayName: displayNameFor(user), email: user.email ?? "" });
    await setDoc(profileDoc(user.uid), { groupId: gid });
    localStorage.setItem(`${GROUP_ID_KEY}-${user.uid}`, gid);
    setGroupId(gid);
  };

  // ── Firestore listeners ───────────────────────────────────────────────────
  useEffect(() => {
    if (!groupId) return;
    const unsubs: (() => void)[] = [];

    unsubs.push(onSnapshot(groupDoc(groupId), (snap) => {
      if (snap.exists()) {
        const d = snap.data();
        setSharedConfig({
          globalLocations: (d.globalLocations as string[]) ?? [],
          globalActivities: (d.globalActivities as Activity[]) ?? [],
        });
      }
    }));

    unsubs.push(onSnapshot(subCol(groupId, "parents"), (snap) => {
      setParents(snap.docs.map((d) => ({
        parentId: d.id,
        displayName: String(d.data().displayName ?? ""),
        email: String(d.data().email ?? ""),
      })));
    }));

    unsubs.push(onSnapshot(subCol(groupId, "children"), (snap) => {
      setChildren(snap.docs.map((d) => d.data() as Child));
    }));

    unsubs.push(onSnapshot(subCol(groupId, "events"), (snap) => {
      setEvents(snap.docs.map((d) => d.data() as Event));
    }));

    unsubs.push(onSnapshot(subCol(groupId, "assignments"), (snap) => {
      setAssignments(snap.docs.map((d) => d.data() as RideAssignment));
    }));

    return () => unsubs.forEach((u) => u());
  }, [groupId]);

  // ── Derived ───────────────────────────────────────────────────────────────
  const parent: AppParent | null = authUser
    ? (parents.find((p) => p.parentId === authUser.uid) ?? null)
    : null;

  const config: AppLocalConfig = {
    ...defaultAppLocalConfig,
    ...localConfig,
    globalLocations: sharedConfig.globalLocations,
    globalActivities: sharedConfig.globalActivities,
    loginName: parent?.displayName ?? "",
    loginEmail: authUser?.email ?? "",
    activeParentId: authUser?.uid ?? "",
    syncIntervalMinutes: 0,
  };

  // ── Auth actions ──────────────────────────────────────────────────────────
  const signInWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    await signInWithPopup(auth, provider);
  };

  const signOut = async () => {
    if (authUser) localStorage.removeItem(`${GROUP_ID_KEY}-${authUser.uid}`);
    await firebaseSignOut(auth);
  };

  const inviteMember = async (email: string): Promise<string> => {
    if (!groupId || !authUser) return "Not in a group";
    const normalized = email.trim().toLowerCase();
    if (!normalized.includes("@")) return "Invalid email address";
    try {
      await setDoc(inviteDoc(normalized), { groupId, invitedBy: authUser.uid, invitedAt: Date.now() });
      return "";
    } catch {
      return "Failed to send invite";
    }
  };

  // ── Data mutations ────────────────────────────────────────────────────────
  const downloadFile = useCallback(() => {
    const data: AppData = { config, parents, children, events, assignments };
    const blob = buildWorkbookBlob(data);
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "idrive.xlsx"; a.click();
    URL.revokeObjectURL(url);
  }, [config, parents, children, events, assignments]);

  const SHARED_KEYS = new Set(["globalLocations", "globalActivities"]);

  const setConfig = useCallback(async (next: Partial<AppLocalConfig>) => {
    const sharedUpdates: Record<string, unknown> = {};
    const localUpdates: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(next)) {
      if (SHARED_KEYS.has(k)) sharedUpdates[k] = v;
      else localUpdates[k] = v;
    }
    if (Object.keys(sharedUpdates).length > 0 && groupId) {
      await setDoc(groupDoc(groupId), sharedUpdates, { merge: true });
    }
    if (Object.keys(localUpdates).length > 0) {
      const merged = { ...localConfig, ...localUpdates } as LocalConfig;
      setLocalConfigState(merged);
      localStorage.setItem(LOCAL_CONFIG_KEY, JSON.stringify(merged));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groupId, localConfig]);

  const upsertChild = useCallback(async (child: Child) => {
    if (!groupId) return;
    await setDoc(subDoc(groupId, "children", child.childId), { ...child, updatedAt: Date.now() });
  }, [groupId]);

  const upsertEvent = useCallback(async (event: Event) => {
    if (!groupId) return;
    const now = Date.now();
    await setDoc(subDoc(groupId, "events", event.eventId), { ...event, updatedAt: now, createdAt: event.createdAt || now });
  }, [groupId]);

  const upsertEvents = useCallback(async (eventsToUpsert: Event[]) => {
    if (!groupId || eventsToUpsert.length === 0) return;
    const now = Date.now();
    const batch = writeBatch(db);
    for (const event of eventsToUpsert) {
      batch.set(subDoc(groupId, "events", event.eventId), { ...event, updatedAt: now, createdAt: event.createdAt || now });
    }
    await batch.commit();
  }, [groupId]);

  const deleteEvent = useCallback(async (eventId: string) => {
    if (!groupId) return;
    const batch = writeBatch(db);
    batch.delete(subDoc(groupId, "events", eventId));
    for (const a of assignments.filter((a) => a.eventId === eventId)) {
      batch.delete(subDoc(groupId, "assignments", a.assignmentId));
    }
    await batch.commit();
  }, [groupId, assignments]);

  const deleteEvents = useCallback(async (eventIds: string[]) => {
    if (!groupId || eventIds.length === 0) return;
    const idSet = new Set(eventIds);
    const batch = writeBatch(db);
    for (const id of eventIds) batch.delete(subDoc(groupId, "events", id));
    for (const a of assignments.filter((a) => idSet.has(a.eventId))) {
      batch.delete(subDoc(groupId, "assignments", a.assignmentId));
    }
    await batch.commit();
  }, [groupId, assignments]);

  const upsertAssignment = useCallback(async (assignment: RideAssignment) => {
    if (!groupId) return;
    await setDoc(subDoc(groupId, "assignments", assignment.assignmentId), { ...assignment, updatedAt: Date.now() });
  }, [groupId]);

  return (
    <Ctx.Provider value={{
      isLoading,
      authUser,
      groupId,
      parent,
      parents,
      config,
      children: children.filter((c) => !c.isArchived),
      events,
      assignments,
      signInWithGoogle,
      signOut,
      inviteMember,
      downloadFile,
      setConfig,
      upsertChild,
      upsertEvent,
      upsertEvents,
      deleteEvent,
      deleteEvents,
      upsertAssignment,
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
