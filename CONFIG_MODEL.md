# Config Model — Kids Rides & Classes Manager

> All five config classes below are implemented in `app/src/main/java/i/drive/kids/config/` and round-trip-tested via `ConfigParserTest`. Serialization uses `kotlinx.serialization` with `encodeDefaults = true` and `ignoreUnknownKeys = true` for forward-compat.

---

## Overview

Four config scopes. Each has a distinct storage backend, visibility, and lifecycle.

| Scope | Storage | Visible to | Synced |
|---|---|---|---|
| App-local | DataStore (device) | This device only | No |
| Parent-private | Drive JSON | This parent only | Yes (Drive) |
| Group-shared | Sheets GroupConfig tab | All group members | Yes (Sheets) |
| Dev/build | `local.properties` + BuildConfig | Developer only | Never |

---

## 1. App-Local Config (`AppLocalConfig`)

Stored in DataStore on-device. Never leaves the device.

```kotlin
data class AppLocalConfig(
    val themeMode: ThemeMode = ThemeMode.SYSTEM,          // SYSTEM | LIGHT | DARK
    val language: AppLanguage = AppLanguage.SYSTEM,        // SYSTEM | ENGLISH | HEBREW
    val defaultLandingScreen: LandingScreen = LandingScreen.DASHBOARD,
    val syncOnAppOpen: Boolean = true,
    val backgroundSyncEnabled: Boolean = true,
    val backgroundSyncIntervalMinutes: Long = 30,
    val showCompletedRidesByDefault: Boolean = false,
    val compactCardMode: Boolean = false,
    val vibrateOnReminder: Boolean = true,
    val soundOnReminder: Boolean = true,
    val notificationLeadTimeMinutesDefault: Int = 60,
    val allowMobileDataSync: Boolean = true,
    val debugLoggingEnabled: Boolean = false,
    val lastSelectedGroupId: String? = null
)
```

---

## 2. Parent-Private Config (`ParentPrivateConfig`)

Stored inside the private Drive JSON under `preferences`. Synced across the parent's devices.

```kotlin
data class ParentPrivateConfig(
    val parentDisplayName: String = "",
    val phoneNumber: String? = null,
    val defaultReminderLeadTimeMinutes: Int = 60,
    val notifyOnRideClaimed: Boolean = true,
    val notifyOnRideCompleted: Boolean = true,
    val notifyOnRideConflict: Boolean = true,
    val notifyOnEventChanged: Boolean = true,
    val shareMyPhoneWithGroup: Boolean = false,
    val shareMyEmailWithGroup: Boolean = true,
    val preferredColorPalette: String = "default",
    val defaultChildColor: ChildColor = ChildColor.BLUE,
    val defaultEventDurationMinutes: Int = 60,
    val defaultEventShareMode: VisibilityScope = VisibilityScope.GROUP,
    val defaultRideDirection: RideDirection = RideDirection.BOTH,
    val showPrivateEventsOnDashboard: Boolean = true,
    val autoArchivePastEventsAfterDays: Int = 30,
    val timezone: String = "system",
    val weekStartDay: DayOfWeek = DayOfWeek.SUNDAY,
    val preferredMapApp: MapApp = MapApp.GOOGLE_MAPS,
    val notes: String = ""
)
```

---

## 3. Group-Shared Config (`GroupSharedConfig`)

Stored as key-value rows in the `GroupConfig` tab of the shared Sheet. All group members see this.

```kotlin
data class GroupSharedConfig(
    val groupName: String = "",
    val groupDescription: String = "",
    val timezone: String = "UTC",
    val defaultLanguage: AppLanguage = AppLanguage.ENGLISH,
    val weekStartDay: DayOfWeek = DayOfWeek.SUNDAY,
    val enableRideSharing: Boolean = true,
    val allowParentsToClaimOtherChildrenRides: Boolean = true,
    val allowMultipleVolunteersPerRideLeg: Boolean = false,
    val requireAdminApprovalForAssignments: Boolean = false,
    val defaultReminderLeadTimeMinutes: Int = 60,
    val urgentRideWindowHours: Int = 24,
    val showCompletedAssignmentsToAll: Boolean = true,
    val allowPrivateEventsInSharedTimeline: Boolean = false,
    val defaultEventVisibility: VisibilityScope = VisibilityScope.GROUP,
    val supportedEventTypes: List<EventType> = EventType.values().toList(),
    val supportedRideDirections: List<RideDirection> = RideDirection.values().toList(),
    val maxFutureEventMonths: Int = 12,
    val enableAuditLog: Boolean = true,
    val enableNotificationsFeed: Boolean = true,
    val enableConflictFlagging: Boolean = true,
    val conflictResolutionPolicy: ConflictPolicy = ConflictPolicy.MANUAL,
    val groupColorTheme: String = "default",
    val groupInviteMode: InviteMode = InviteMode.OPEN,
    val groupJoinCode: String? = null,
    val sharedSheetVersion: Int = 1,
    val dataSchemaVersion: Int = 1
)
```

---

## 4. Notification Config (part of parent-private scope)

```kotlin
data class NotificationConfig(
    val enableLocalNotifications: Boolean = true,
    val enableInAppNotifications: Boolean = true,
    val reminderLeadTimes: List<Int> = listOf(60, 1440),  // minutes
    val completionNotificationsEnabled: Boolean = true,
    val quietHoursStart: Int? = null,   // hour of day (0-23)
    val quietHoursEnd: Int? = null,
    val suppressDuplicateNotificationsWithinMinutes: Int = 30
)
```

---

## 5. Ride Policy Config (part of group-shared scope)

```kotlin
data class RidePolicyConfig(
    val allowRoundTripClaimAsSingleAction: Boolean = true,
    val splitRoundTripIntoSeparateLegs: Boolean = true,
    val requireCompletionConfirmation: Boolean = true,
    val allowSelfAssignmentCancellation: Boolean = true,
    val cancellationCutoffMinutes: Int = 60,
    val markOverdueRideAfterMinutes: Int = 30,
    val allowWaitlistVolunteers: Boolean = false,
    val enableBackupDriverField: Boolean = false
)
```

---

## 6. UI Preference Config (part of app-local scope)

```kotlin
data class UiPreferenceConfig(
    val showChildColorBadges: Boolean = true,
    val showLargeDateHeaders: Boolean = true,
    val dashboardDensity: DashboardDensity = DashboardDensity.COMFORTABLE,
    val homeCardOrder: List<HomeCard> = HomeCard.defaultOrder(),
    val hideEmptySections: Boolean = true,
    val showRecentActivityFeed: Boolean = true,
    val showConflictBanner: Boolean = true,
    val showSyncBanner: Boolean = true,
    val use24HourClock: Boolean = false
)
```

---

## 7. Sync Config (part of app-local scope)

```kotlin
data class SyncConfig(
    val syncOnStartup: Boolean = true,
    val syncOnResume: Boolean = true,
    val syncOnMutation: Boolean = true,
    val syncRetryCount: Int = 5,
    val syncRetryBackoffSeconds: Int = 30,
    val syncBatchSize: Int = 50,
    val maxOfflineQueueSize: Int = 500,
    val requireWifiForLargeSync: Boolean = false,
    val localCacheRetentionDays: Int = 90
)
```

---

## 8. Event Type Config

Each event type can override defaults:

```kotlin
data class EventTypeConfig(
    val type: EventType,
    val label: String,
    val icon: String,          // material icon name
    val defaultDurationMinutes: Int,
    val defaultColor: String,  // hex
    val defaultNeedsRide: Boolean,
    val defaultShareMode: VisibilityScope
)
```

Defaults per type are defined in `EventTypeDefaults.kt`.

---

## 9. Dev/Build Config

`local.properties` (gitignored):

```properties
applicationId=i.drive.kids
versionName=1.0.0
versionCode=1
minSdk=26
targetSdk=35
compileSdk=35
enableDebugMenu=true
useMockGoogleServices=true
mockDataSeed=42
logLevel=DEBUG
keystorePath=keystore/release.jks
keystoreAlias=idrive
signingMode=local
adbTargetSerial=
```

Exposed via `BuildConfig` fields in `build.gradle.kts`.

---

## 10. Settings Screen Mapping

| Section | Config scope | Fields |
|---|---|---|
| Account | Parent-private | displayName, phone, sharePhone, shareEmail |
| Group | Group-shared | groupName, enableRideSharing, ridePolicy, eventTypes |
| Notifications | Parent-private | all notification fields |
| Appearance | App-local | theme, language, compactMode, colorBadges, clock format |
| Sync | App-local | syncOnOpen, backgroundSync, interval, wifi-only |
| Advanced | App-local | debugLogging, cacheRetention, exportSettings |
| About | — | version, licenses, feedback link |

Each setting row shows a label indicating scope: `[device]`, `[private]`, or `[group]`.
