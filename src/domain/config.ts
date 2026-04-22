import { AppLanguage, LandingScreen, ThemeMode } from "./enums";
import type { Activity } from "@/domain/models";

export interface AppLocalConfig {
  loginName: string;
  loginEmail: string;
  activeParentId: string;
  themeMode: (typeof ThemeMode)[keyof typeof ThemeMode];
  language: (typeof AppLanguage)[keyof typeof AppLanguage];
  defaultLandingScreen: (typeof LandingScreen)[keyof typeof LandingScreen];
  showCompletedRidesByDefault: boolean;
  compactCardMode: boolean;
  vibrateOnReminder: boolean;
  soundOnReminder: boolean;
  notificationLeadTimeMinutesDefault: number;
  debugLoggingEnabled: boolean;
  globalActivities: Activity[];
  globalLocations: string[];
  syncIntervalMinutes: number; // 0 = disabled
}

export const defaultAppLocalConfig: AppLocalConfig = {
  loginName: "",
  loginEmail: "",
  activeParentId: "",
  themeMode: ThemeMode.SYSTEM,
  language: AppLanguage.SYSTEM,
  defaultLandingScreen: LandingScreen.DASHBOARD,
  showCompletedRidesByDefault: false,
  compactCardMode: false,
  vibrateOnReminder: true,
  soundOnReminder: true,
  notificationLeadTimeMinutesDefault: 60,
  debugLoggingEnabled: false,
  globalActivities: [],
  globalLocations: [],
  syncIntervalMinutes: 1,
};
