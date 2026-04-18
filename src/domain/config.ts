import {
  AppLanguage,
  LandingScreen,
  ThemeMode,
} from "./enums";

// ─── AppLocalConfig — device-local preferences ──────────────────────────────
export interface AppLocalConfig {
  themeMode: (typeof ThemeMode)[keyof typeof ThemeMode];
  language: (typeof AppLanguage)[keyof typeof AppLanguage];
  defaultLandingScreen: (typeof LandingScreen)[keyof typeof LandingScreen];
  syncOnAppOpen: boolean;
  backgroundSyncEnabled: boolean;
  backgroundSyncIntervalMinutes: number;
  showCompletedRidesByDefault: boolean;
  compactCardMode: boolean;
  vibrateOnReminder: boolean;
  soundOnReminder: boolean;
  notificationLeadTimeMinutesDefault: number;
  allowMobileDataSync: boolean;
  debugLoggingEnabled: boolean;
  lastSelectedGroupId: string | null;
}

export const defaultAppLocalConfig: AppLocalConfig = {
  themeMode: ThemeMode.SYSTEM,
  language: AppLanguage.SYSTEM,
  defaultLandingScreen: LandingScreen.DASHBOARD,
  syncOnAppOpen: true,
  backgroundSyncEnabled: true,
  backgroundSyncIntervalMinutes: 30,
  showCompletedRidesByDefault: false,
  compactCardMode: false,
  vibrateOnReminder: true,
  soundOnReminder: true,
  notificationLeadTimeMinutesDefault: 60,
  allowMobileDataSync: true,
  debugLoggingEnabled: false,
  lastSelectedGroupId: null,
};

// ─── ParentPrivateConfig — stored in the parent's own Drive ─────────────────
export interface ParentPrivateConfig {
  displayName: string;
  email: string;
  phone: string | null;
  preferredMapApp: "GOOGLE_MAPS" | "WAZE" | "APPLE_MAPS" | "DEFAULT";
  autoClaimReturnLeg: boolean;
  notifyOnClaim: boolean;
  notifyOnCompletion: boolean;
}

export const defaultParentPrivateConfig: ParentPrivateConfig = {
  displayName: "",
  email: "",
  phone: null,
  preferredMapApp: "DEFAULT",
  autoClaimReturnLeg: false,
  notifyOnClaim: true,
  notifyOnCompletion: true,
};

// ─── GroupSharedConfig — per-group, stored in the shared Sheet ──────────────
export interface GroupSharedConfig {
  groupName: string;
  groupDescription: string;
  timezone: string;
  enableRideSharing: boolean;
  allowMultipleVolunteersPerRideLeg: boolean;
  maxFutureEventMonths: number;
  conflictPolicy: "MANUAL" | "FIRST_COME_FIRST_SERVED" | "ADMIN_DECIDES";
  inviteMode: "OPEN" | "CODE_REQUIRED" | "ADMIN_APPROVAL";
}

export const defaultGroupSharedConfig: GroupSharedConfig = {
  groupName: "",
  groupDescription: "",
  timezone: "UTC",
  enableRideSharing: true,
  allowMultipleVolunteersPerRideLeg: false,
  maxFutureEventMonths: 12,
  conflictPolicy: "MANUAL",
  inviteMode: "CODE_REQUIRED",
};

// ─── SyncConfig ─────────────────────────────────────────────────────────────
export interface SyncConfig {
  enabled: boolean;
  intervalMinutes: number;
  retryMaxAttempts: number;
  retryBackoffSeconds: number;
}

export const defaultSyncConfig: SyncConfig = {
  enabled: true,
  intervalMinutes: 30,
  retryMaxAttempts: 5,
  retryBackoffSeconds: 30,
};

// ─── UiPreferenceConfig ─────────────────────────────────────────────────────
export interface UiPreferenceConfig {
  dashboardCardOrder: string[];
  showWeekendsInCalendar: boolean;
  startOfWeek: "MONDAY" | "SUNDAY";
  dashboardDensity: "COMPACT" | "COMFORTABLE" | "SPACIOUS";
}

export const defaultUiPreferenceConfig: UiPreferenceConfig = {
  dashboardCardOrder: [
    "UPCOMING_EVENTS",
    "RIDE_REQUESTS",
    "MY_CHILDREN",
    "GROUP_ACTIVITY",
    "RECENT_NOTIFICATIONS",
    "QUICK_ADD",
  ],
  showWeekendsInCalendar: true,
  startOfWeek: "MONDAY",
  dashboardDensity: "COMFORTABLE",
};

// ─── Parsing (forward-compat: ignores unknown keys) ─────────────────────────
export function parseConfig<T extends object>(raw: string, defaults: T): T {
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const result = { ...defaults } as Record<string, unknown>;
    for (const key of Object.keys(defaults)) {
      if (key in parsed) result[key] = parsed[key];
    }
    return result as T;
  } catch {
    return { ...defaults };
  }
}

export function encodeConfig<T>(cfg: T): string {
  return JSON.stringify(cfg);
}
