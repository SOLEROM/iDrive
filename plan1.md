# System spec for Claude agent

## Project name : idrive

## Mission

Build an **Android native app** for parents to manage children’s classes, transportation needs, and shared ride commitments.

The system must:

* run as an Android app
* use **Google Drive as the main data storage**
* use **one private parent data file** per parent in that parent’s Google Drive
* use **one shared Google Sheet** per parent group for ride/class coordination
* support one-time and recurring events
* support ride direction:

  * to
  * from
  * both
* support parent volunteering for rides
* support reminders and completion marking
* support offline-friendly local caching
* include a documented, reproducible **Makefile-based workflow** for build, test, signing, and install

---

# 1. Product concept

The app is for groups of parents coordinating children’s classes and rides.

Each parent:

* installs the app
* signs in with Google
* keeps private data in their own Google Drive
* sees and manages their own children and private events

Each group:

* has one shared Google Sheet
* shares ride-relevant activities
* allows any parent in the group to volunteer for rides
* can notify parents when tasks are taken or completed

The app is a coordination system, not just a personal calendar.

---

# 2. Core data model

## 2.1 Parent

Fields:

* `parentId`
* `displayName`
* `email`
* `phone` optional
* `groupIds[]`
* `notificationPreferences`
* `isAdminByGroup[groupId]`
* `createdAt`
* `updatedAt`

## 2.2 Child

Fields:

* `childId`
* `parentOwnerId`
* `name`
* `colorTag`
* `notes`
* `isArchived`
* `createdAt`
* `updatedAt`

## 2.3 Group

Fields:

* `groupId`
* `groupName`
* `sharedSheetId`
* `members[]`
* `createdByParentId`
* `defaultConfigVersion`
* `createdAt`
* `updatedAt`

## 2.4 Event

Fields:

* `eventId`
* `groupId`
* `childId`
* `title`
* `eventType`
* `description`
* `locationName`
* `locationAddress`
* `startDateTime`
* `endDateTime`
* `isRecurring`
* `recurrenceRule`
* `needsRide`
* `rideDirection`
* `createdByParentId`
* `visibilityScope`
* `status`
* `createdAt`
* `updatedAt`

## 2.5 RideAssignment

Fields:

* `assignmentId`
* `eventId`
* `driverParentId`
* `rideLeg`
* `assignmentStatus`
* `notes`
* `claimedAt`
* `completedAt`
* `updatedAt`

## 2.6 Reminder

Fields:

* `reminderId`
* `parentId`
* `eventId`
* `type`
* `scheduledAt`
* `isDelivered`
* `deliveryChannel`
* `createdAt`
* `updatedAt`

## 2.7 NotificationEntry

Fields:

* `notificationId`
* `groupId`
* `eventId`
* `assignmentId`
* `triggeredByParentId`
* `message`
* `category`
* `createdAt`
* `readByParentIds[]`

---

# 3. Storage architecture

## 3.1 Main rule

**Google Drive is the main database layer.**

Do not use Firebase as source of truth.

## 3.2 Storage split

### Private parent data

Stored in the parent’s Google Drive as JSON:

* filename example:
  `kids_rides_private_data.json`

Contains:

* parent profile
* children
* private events
* local preferences mirror
* known groups metadata
* cached remote IDs

### Shared parent-group data

Stored in one shared Google Sheet per group.

Contains:

* shared events
* ride needs
* ride assignments
* group member list
* group settings
* audit or notification log

## 3.3 Local cache

Use Room database locally for:

* fast UI
* temporary offline use
* sync queue
* conflict detection

Rule:

* Google Drive / shared Sheet = remote source of truth
* Room = performance/cache layer

## 3.4 Sync policy

* sync on app launch
* sync on foreground resume
* sync after local mutation
* allow manual sync
* background retry when network available

## 3.5 Conflict policy

* simple fields: last-write-wins with timestamp
* ride assignment collisions: explicit conflict state
* deleted-vs-edited entities: deletion marker wins unless user restores manually
* conflicting recurring event edits: flag for review if both changed key recurrence fields

---

# 4. Google integration

## 4.1 Auth

Use Google Sign-In / OAuth on Android.

Required capabilities:

* access private parent Drive file
* access shared Sheets document
* maintain secure session and refresh behavior

## 4.2 Private file adapter

The agent must implement a service that can:

* create private JSON file if missing
* read it
* write it safely
* version schema
* store remote file ID locally

## 4.3 Shared sheet adapter

The agent must implement a service that can:

* create group shared sheet
* read typed rows
* batch update rows
* preserve schema version
* validate required tabs and headers

---

# 5. Shared Google Sheet schema

Minimum tabs:

## 5.1 `Events`

Columns:

* eventId
* groupId
* childId
* childName
* title
* type
* description
* locationName
* locationAddress
* startDateTime
* endDateTime
* isRecurring
* recurrenceRule
* needsRide
* rideDirection
* createdByParentId
* visibilityScope
* status
* updatedAt

## 5.2 `Assignments`

Columns:

* assignmentId
* eventId
* rideLeg
* driverParentId
* driverName
* status
* notes
* claimedAt
* completedAt
* updatedAt

## 5.3 `Parents`

Columns:

* parentId
* displayName
* email
* role
* isActive
* updatedAt

## 5.4 `GroupConfig`

Columns:

* key
* value
* scope
* updatedAt
* updatedByParentId

## 5.5 `Notifications`

Columns:

* notificationId
* category
* message
* groupId
* eventId
* assignmentId
* createdAt
* createdByParentId

## 5.6 `AuditLog` recommended

Columns:

* logId
* timestamp
* actorParentId
* actionType
* entityType
* entityId
* summary

---

# 6. Functional requirements

## 6.1 Onboarding

User can:

* sign in with Google
* create parent profile
* create or join group
* connect private Drive storage
* validate shared sheet access

## 6.2 Child management

User can:

* add child
* edit child
* archive child
* assign child color
* add notes

## 6.3 Event management

User can:

* create event
* edit event
* duplicate event
* archive/cancel event
* define event type
* define ride need
* define ride direction
* share to group or keep private

## 6.4 Recurrence support

V1 must support:

* one-time
* weekly recurring
* selected weekdays
* optional recurrence end date
* optional repeat every N weeks

## 6.5 Ride management

Parents can:

* volunteer for TO leg
* volunteer for FROM leg
* volunteer for BOTH
* cancel volunteering
* confirm ride
* mark ride done

## 6.6 Notifications

The system should support:

* upcoming event reminder
* ride unassigned reminder
* volunteered ride reminder
* ride completion update
* assignment changed update
* sync error alert

## 6.7 Views

Minimum views:

* splash
* sign-in
* onboarding
* dashboard
* children
* child detail
* events list
* event editor
* rides board
* my rides
* notifications
* settings
* sync status
* conflict resolution screen

---

# 7. UX and look-and-feel specification

This section must guide the Claude agent so the app is not only functional but easy to use by busy parents.

## 7.1 UX principles

The app should feel:

* calm
* fast
* low-friction
* obvious
* family-friendly
* readable under stress
* usable one-handed on a phone

The app is not meant to feel enterprise-heavy or technical.

## 7.2 Design style

Use:

* clean modern Android UI
* Jetpack Compose
* strong spacing
* large touch targets
* minimal clutter
* low text density on high-priority screens
* cards and chips instead of dense tables where possible

Avoid:

* spreadsheet-like complexity in the main UI
* overuse of nested menus
* tiny icons without labels
* overloaded forms on one screen

## 7.3 Visual structure

The most important information must be visible quickly:

* today’s rides
* what still needs a driver
* what I committed to
* which child each item belongs to
* whether a ride is complete

## 7.4 Color rules

Use color intentionally:

* each child can have an optional color tag
* ride status colors should be fixed and consistent:

  * unassigned: neutral/warning
  * volunteered: informative
  * confirmed: strong positive/in-progress
  * completed: success
  * conflict: alert
  * cancelled: muted

Do not rely on color alone:

* pair with text labels and icons

## 7.5 Home dashboard behavior

The dashboard should show, in order:

1. today’s upcoming rides
2. urgent unassigned rides
3. my accepted rides
4. recent updates from other parents
5. upcoming classes for my children

This should be scrollable and card-based.

## 7.6 Event editor UX

The event editor should be simple:

* child
* title
* type
* location
* date/time
* recurring or one-time
* needs ride?
* direction?
* share with group?

Progressive disclosure:

* advanced recurrence settings only appear if recurring is enabled
* ride options only appear if ride is needed

## 7.7 Shared rides board UX

The shared board should allow very fast scanning:

* grouped by day
* clear child label
* clear location/time
* chips for TO / FROM / BOTH
* visible volunteer state
* one-tap claim for a ride leg
* visible completion state

## 7.8 Notifications UX

Notifications should be:

* short
* actionable
* categorized
* dismissible
* mirrored inside the app

## 7.9 Accessibility and readability

The app should:

* support large text reasonably
* use clear contrast
* avoid tiny hit targets
* keep wording simple
* prefer explicit labels over ambiguous icons

## 7.10 Language readiness

The agent should structure the app so it can later support:

* Hebrew
* English

Text resources must be externalized.

---

# 8. Full build, compile, sign, install, and test procedure

The Claude agent must not only build the app, but also generate a **Makefile** that standardizes development and deployment.

The Makefile must be treated as a first-class artifact.

## 8.1 Goals of the Makefile

The generated Makefile must allow a developer to:

* initialize environment
* validate toolchain
* build debug APK
* build release APK
* run tests
* install debug app
* uninstall app
* clean outputs
* sign release app
* verify signing
* optionally run emulator workflows
* package artifacts
* print help

## 8.2 Assumptions

The agent should assume:

* Linux development host
* Android SDK installed locally
* Java installed
* Gradle wrapper committed to project
* ADB available
* signing keystore may or may not exist yet

## 8.3 Required documentation

The agent must generate docs that explain:

* required packages
* environment variables
* where to place signing keystore
* how to create signing keystore
* how to install APK manually
* how to use ADB over USB or TCP

---

# 9. Makefile requirements

The agent must generate a `Makefile` with at least these rules.

## 9.1 Core rules

* `help`
* `doctor`
* `init`
* `clean`
* `deep-clean`

## 9.2 Build rules

* `build-debug`
* `build-release`
* `apk-debug`
* `apk-release`
* `bundle-release` optional if later needed

## 9.3 Test rules

* `test`
* `test-unit`
* `test-integration`
* `test-ui`
* `lint`
* `check`

## 9.4 Device rules

* `adb-devices`
* `install-debug`
* `install-release`
* `uninstall`
* `logcat`

## 9.5 Signing rules

* `keystore-create`
* `sign-release`
* `verify-signature`

## 9.6 Emulator rules optional but recommended

* `emulator-list`
* `emulator-start`
* `emulator-stop`

## 9.7 Packaging rules

* `artifacts`
* `dist`

## 9.8 Example Makefile behavior

The generated Makefile should roughly support flows like:

```make
help            # print available rules
doctor          # verify java, adb, sdk, gradle wrapper
init            # prepare local config templates and directories
build-debug     # compile debug apk
install-debug   # install debug apk on connected device
test            # run all automated tests
build-release   # compile unsigned/signed release artifact depending on config
sign-release    # sign release apk with provided keystore
verify-signature # verify apk signature
dist            # collect final apk + docs into dist/
```

---

# 10. Makefile implementation guidance for the agent

The agent must write a Makefile that:

* uses project-local Gradle wrapper
* uses variables at top of file
* supports overrides via environment variables
* prints friendly errors if required tools are missing
* avoids hardcoding local machine paths when possible

## 10.1 Suggested Makefile variables

At top of file, define variables such as:

* `APP_ID`
* `APP_NAME`
* `BUILD_TYPE`
* `APK_DEBUG_PATH`
* `APK_RELEASE_PATH`
* `KEYSTORE_PATH`
* `KEYSTORE_ALIAS`
* `KEYSTORE_STOREPASS`
* `KEYSTORE_KEYPASS`
* `ADB`
* `GRADLEW`
* `ANDROID_HOME`
* `ANDROID_SDK_ROOT`
* `DIST_DIR`

Sensitive values must not be committed in plain text if avoidable.

## 10.2 Example operational flow the agent must document

### Debug flow

1. `make doctor`
2. `make init`
3. `make build-debug`
4. `make install-debug`
5. `make logcat`

### Release flow

1. `make doctor`
2. `make keystore-create` or provide existing keystore
3. configure signing env vars or local signing file
4. `make build-release`
5. `make sign-release`
6. `make verify-signature`
7. `make dist`

### Test flow

1. `make lint`
2. `make test-unit`
3. `make test-integration`
4. `make test-ui`
5. `make check`

---

# 11. Signing procedure requirements

The agent must implement and document release signing.

## 11.1 Keystore handling

The system should support:

* local developer-generated keystore
* external provided keystore
* documented ignored files via `.gitignore`

Keystore should not be committed.

## 11.2 Signing config

The agent should support either:

* Gradle signing config via local properties file not committed
* or Makefile rule that signs post-build

## 11.3 Required deliverables

The docs must explain:

* how to create keystore
* how to store passwords safely
* how to configure local signing
* how to verify the final release APK

---

# 12. Testing specification for the agent

## 12.1 Unit tests

Must cover:

* recurrence rule creation
* ride direction parsing
* assignment state transitions
* conflict detection
* config parsing
* JSON serialization/deserialization
* sheet row mapping

## 12.2 Integration tests

Must cover:

* Room cache behavior
* repository + sync engine
* fake Drive file adapter
* fake Sheets adapter
* failure/retry flows
* sync queue replay

## 12.3 UI tests

Must cover:

* onboarding
* create child
* create recurring event
* share event
* volunteer for ride
* mark ride complete
* change settings
* conflict banner display

## 12.4 Manual QA flows

The agent must generate a `TEST_PLAN.md` covering:

* first login
* create group
* join group
* add child
* add recurring event
* claim ride
* complete ride
* conflict scenario
* offline edit scenario
* sync recovery scenario

---

# 13. Configuration model

This app needs a structured config design so the behavior is understandable and shareable.

The Claude agent must implement three config scopes:

## 13.1 Config scopes

1. **App-local config**

   * per device / per parent app instance

2. **Parent-private config**

   * stored in private Drive JSON

3. **Group-shared config**

   * stored in shared Google Sheet `GroupConfig` tab

Additionally:
4. **Developer/build config**

* local build and signing config only

---

# 14. Configurable parameters

Below is the minimum set the agent should support.
The agent must design them as typed config objects, not random string maps.

## 14.1 App-local config

These control the app behavior on one device.

Fields:

* `themeMode`

  * system
  * light
  * dark

* `language`

  * system
  * english
  * hebrew

* `defaultLandingScreen`

  * dashboard
  * myRides
  * children
  * events

* `syncOnAppOpen`

  * true/false

* `backgroundSyncEnabled`

  * true/false

* `backgroundSyncIntervalMinutes`

* `showCompletedRidesByDefault`

  * true/false

* `compactCardMode`

  * true/false

* `vibrateOnReminder`

  * true/false

* `soundOnReminder`

  * true/false

* `notificationLeadTimeMinutesDefault`

* `allowMobileDataSync`

  * true/false

* `debugLoggingEnabled`

  * true/false

* `lastSelectedGroupId`

## 14.2 Parent-private config

Stored in private JSON, synced via Drive.

Fields:

* `parentDisplayName`
* `phoneNumber`
* `defaultReminderLeadTimeMinutes`
* `notifyOnRideClaimed`
* `notifyOnRideCompleted`
* `notifyOnRideConflict`
* `notifyOnEventChanged`
* `shareMyPhoneWithGroup`
* `shareMyEmailWithGroup`
* `preferredColorPalette`
* `defaultChildColor`
* `defaultEventDurationMinutes`
* `defaultEventShareMode`
* `defaultRideDirection`
* `showPrivateEventsOnDashboard`
* `autoArchivePastEventsAfterDays`
* `timezone`
* `weekStartDay`
* `preferredMapApp`
* `notes`

## 14.3 Group-shared config

Stored in shared Google Sheet.

Fields:

* `groupName`
* `groupDescription`
* `timezone`
* `defaultLanguage`
* `weekStartDay`
* `enableRideSharing`
* `allowParentsToClaimOtherChildrenRides`
* `allowMultipleVolunteersPerRideLeg`
* `requireAdminApprovalForAssignments`
* `defaultReminderLeadTimeMinutes`
* `urgentRideWindowHours`
* `showCompletedAssignmentsToAll`
* `allowPrivateEventsInSharedTimeline`
* `defaultEventVisibility`
* `supportedEventTypes[]`
* `supportedRideDirections[]`
* `maxFutureEventMonths`
* `enableAuditLog`
* `enableNotificationsFeed`
* `enableConflictFlagging`
* `conflictResolutionPolicy`
* `groupColorTheme`
* `groupInviteMode`
* `groupJoinCode` optional
* `sharedSheetVersion`
* `dataSchemaVersion`

## 14.4 Event type config

The system should allow configurable event types, such as:

* class
* school
* sports
* music
* therapy
* meeting
* custom

Each event type may define:

* label
* icon
* default duration
* default color
* default needsRide
* default shareMode

## 14.5 Notification config

Configurable notification behavior:

* enableLocalNotifications
* enableInAppNotifications
* reminderLeadTimes[]
* completionNotificationsEnabled
* quietHoursStart
* quietHoursEnd
* suppressDuplicateNotificationsWithinMinutes

## 14.6 Ride policy config

Configurable ride behavior:

* allowRoundTripClaimAsSingleAction
* splitRoundTripIntoSeparateLegs
* requireCompletionConfirmation
* allowSelfAssignmentCancellation
* cancellationCutoffMinutes
* markOverdueRideAfterMinutes
* allowWaitlistVolunteers
* enableBackupDriverField

## 14.7 UI preference config

Configurable UI behavior:

* showChildColorBadges
* showLargeDateHeaders
* dashboardDensity
* homeCardOrder[]
* hideEmptySections
* showRecentActivityFeed
* showConflictBanner
* showSyncBanner
* use24HourClock

## 14.8 Sync config

Configurable sync behavior:

* syncOnStartup
* syncOnResume
* syncOnMutation
* syncRetryCount
* syncRetryBackoffSeconds
* syncBatchSize
* maxOfflineQueueSize
* requireWifiForLargeSync
* localCacheRetentionDays

## 14.9 Developer/build config

Not shared between parents. Local file only.

Fields:

* `applicationId`
* `versionName`
* `versionCode`
* `minSdk`
* `targetSdk`
* `compileSdk`
* `enableDebugMenu`
* `useMockGoogleServices`
* `mockDataSeed`
* `logLevel`
* `keystorePath`
* `keystoreAlias`
* `signingMode`
* `adbTargetSerial`

---

# 15. Config UX requirements

The Claude agent must build a settings screen and config handling with these rules:

## 15.1 Settings menu structure

Split settings into:

* Account
* Group
* Notifications
* Appearance
* Sync
* Advanced
* About

## 15.2 Shared vs private clarity

Every setting must clearly indicate whether it is:

* only for me
* shared with group
* device only

This is critical.

## 15.3 Import/export behavior

The agent should design support for:

* export local settings to JSON
* import local settings from JSON
* sync shared group config from shared sheet
* validate config version compatibility

## 15.4 Recommended shared config file format

If extra config file support is added beyond sheet key-value storage, use JSON with:

* schema version
* typed sections
* validation on load

---

# 16. Agent implementation phases

## Phase 1 — Design first

Before coding, the agent must produce:

* `ARCHITECTURE.md`
* `DATA_MODEL.md`
* `SYNC_DESIGN.md`
* `CONFIG_MODEL.md`
* `UX_GUIDELINES.md`
* `BUILD_AND_RELEASE.md`

## Phase 2 — Scaffold project

Create:

* Android project
* Compose setup
* Room setup
* domain/data/ui modules
* DI
* mock repositories
* mock config provider

## Phase 3 — Local-first functional app

Implement:

* all screens
* local DB
* fake sync
* fake shared group flow
* settings menu
* config handling
* testable state flows

## Phase 4 — Google integration

Implement:

* sign-in
* Drive JSON storage
* Sheets shared storage
* sync engine
* config sync
* conflict state handling

## Phase 5 — Automation and packaging

Implement:

* Makefile
* signing config
* build docs
* dist packaging
* install docs

## Phase 6 — Testing and stabilization

Implement:

* automated tests
* manual QA doc
* seeded demo data
* error states
* sync diagnostics

---

# 17. Deliverables

The Claude agent must produce:

## Code

* full Android source project
* tests
* local and Google-backed data layers
* Makefile
* sample config templates

## Documents

* `README.md`
* `ARCHITECTURE.md`
* `DATA_MODEL.md`
* `SYNC_DESIGN.md`
* `CONFIG_MODEL.md`
* `UX_GUIDELINES.md`
* `BUILD_AND_RELEASE.md`
* `TEST_PLAN.md`

## Config templates

* `config/app.local.example.json`
* `config/group.shared.example.json`
* `config/signing.example.properties`

## Build automation

* `Makefile`

---

# 18. Paste-ready agent brief

Use this version directly with Claude Code:

```text
Build an Android app in Kotlin called “Kids Rides & Classes Manager”.

Purpose:
A parent coordination app for children’s classes and rides.

Core requirements:
- Android native app
- Kotlin + Jetpack Compose
- Google Drive is the main database layer
- Each parent has a private JSON data file in their own Google Drive
- Each parent group has one shared Google Sheet for shared class/ride coordination
- Use Room only as local cache, not as source of truth
- Support children, one-time events, recurring events, ride-needed flag, ride direction (to/from/both), ride volunteering, reminders, completion updates, and conflict handling
- Any parent in the group may volunteer for rides for other children if group policy allows it
- Build a simple, clean, family-friendly UI with strong readability, low friction, color tags for children, and fast visibility of today’s rides and unassigned rides
- Add a full settings/config system with app-local config, parent-private config, group-shared config, and developer/build config
- Clearly mark which settings are device-only, private, or shared with the group
- Externalize strings for future English/Hebrew support

Build and release requirements:
- Generate a Makefile with rules for doctor, init, clean, build-debug, build-release, test, lint, check, install-debug, uninstall, logcat, keystore-create, sign-release, verify-signature, artifacts, and dist
- Document full procedures for build, compile, sign, install, test, and sideload deployment without Google Play
- Support release signing via local non-committed config
- Generate config templates and build docs

Testing requirements:
- unit tests
- integration tests
- UI tests
- manual QA plan
- fake/mock Google integrations first, real Google integration second

Before coding, first generate:
1. architecture summary
2. data model
3. private JSON schema
4. shared Google Sheet schema
5. settings/config model
6. sync/conflict strategy
7. UX guidelines
8. Makefile design
9. phased implementation plan

