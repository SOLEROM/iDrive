import { describe, it, expect } from "vitest";
import {
  defaultAppLocalConfig,
  defaultParentPrivateConfig,
  defaultGroupSharedConfig,
  defaultSyncConfig,
  defaultUiPreferenceConfig,
  parseConfig,
  encodeConfig,
  type AppLocalConfig,
} from "@/domain/config";
import { AppLanguage, LandingScreen, ThemeMode } from "@/domain/enums";

describe("configParser round-trips", () => {
  it("AppLocalConfig round-trips", () => {
    const original: AppLocalConfig = {
      ...defaultAppLocalConfig,
      themeMode: ThemeMode.DARK,
      language: AppLanguage.HEBREW,
      defaultLandingScreen: LandingScreen.RIDES,
      syncOnAppOpen: false,
      backgroundSyncEnabled: false,
      backgroundSyncIntervalMinutes: 60,
      showCompletedRidesByDefault: true,
      compactCardMode: true,
      vibrateOnReminder: false,
      soundOnReminder: false,
      notificationLeadTimeMinutesDefault: 30,
      allowMobileDataSync: false,
      debugLoggingEnabled: true,
      lastSelectedGroupId: "group-123",
    };
    const restored = parseConfig(encodeConfig(original), defaultAppLocalConfig);
    expect(restored).toEqual(original);
  });

  it("ParentPrivateConfig round-trips with defaults", () => {
    const text = encodeConfig(defaultParentPrivateConfig);
    expect(parseConfig(text, defaultParentPrivateConfig)).toEqual(defaultParentPrivateConfig);
  });

  it("GroupSharedConfig round-trips with custom values", () => {
    const cfg = {
      ...defaultGroupSharedConfig,
      groupName: "Soccer Parents",
      groupDescription: "Test group",
      timezone: "America/New_York",
      enableRideSharing: true,
      allowMultipleVolunteersPerRideLeg: false,
      maxFutureEventMonths: 6,
    };
    expect(parseConfig(encodeConfig(cfg), defaultGroupSharedConfig)).toEqual(cfg);
  });

  it("SyncConfig round-trips", () => {
    expect(parseConfig(encodeConfig(defaultSyncConfig), defaultSyncConfig)).toEqual(defaultSyncConfig);
  });

  it("UiPreferenceConfig round-trips", () => {
    expect(parseConfig(encodeConfig(defaultUiPreferenceConfig), defaultUiPreferenceConfig))
      .toEqual(defaultUiPreferenceConfig);
  });

  it("AppLocalConfig ignores unknown keys for forward-compat", () => {
    const payload = JSON.stringify({ themeMode: ThemeMode.DARK, futureField: "ignored" });
    const restored = parseConfig(payload, defaultAppLocalConfig);
    expect(restored.themeMode).toBe(ThemeMode.DARK);
    // @ts-expect-error — futureField is not part of AppLocalConfig
    expect(restored.futureField).toBeUndefined();
  });
});
