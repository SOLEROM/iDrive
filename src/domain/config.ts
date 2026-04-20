import { AppLanguage, LandingScreen, ThemeMode } from "./enums";
import type { Activity } from "@/domain/models";

export interface AppLocalConfig {
  loginName: string;
  loginEmail: string;
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
}

export const defaultAppLocalConfig: AppLocalConfig = {
  loginName: "",
  loginEmail: "",
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
};
