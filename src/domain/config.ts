import { AppLanguage, LandingScreen, ThemeMode } from "./enums";
import type { Activity } from "@/domain/models";

// ─── Local config (device-only) ───────────────────────────────────────────────
export interface LocalConfig {
  themeMode: (typeof ThemeMode)[keyof typeof ThemeMode];
  language: (typeof AppLanguage)[keyof typeof AppLanguage];
  defaultLandingScreen: (typeof LandingScreen)[keyof typeof LandingScreen];
  showCompletedRidesByDefault: boolean;
  compactCardMode: boolean;
  vibrateOnReminder: boolean;
  soundOnReminder: boolean;
  notificationLeadTimeMinutesDefault: number;
  debugLoggingEnabled: boolean;
}

export const defaultLocalConfig: LocalConfig = {
  themeMode: ThemeMode.SYSTEM,
  language: AppLanguage.SYSTEM,
  defaultLandingScreen: LandingScreen.DASHBOARD,
  showCompletedRidesByDefault: false,
  compactCardMode: false,
  vibrateOnReminder: true,
  soundOnReminder: true,
  notificationLeadTimeMinutesDefault: 60,
  debugLoggingEnabled: false,
};

// ─── Combined view exposed to screens ─────────────────────────────────────────
export interface AppLocalConfig extends LocalConfig {
  loginName: string;
  loginEmail: string;
  activeParentId: string;
  globalActivities: Activity[];
  globalLocations: string[];
}

export const defaultAppLocalConfig: AppLocalConfig = {
  ...defaultLocalConfig,
  loginName: "",
  loginEmail: "",
  activeParentId: "",
  globalActivities: [],
  globalLocations: [],
};
