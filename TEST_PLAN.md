# Test Plan — Kids Rides & Classes Manager

---

## Manual QA Flows

### Flow 1 — First Login
1. Install fresh APK on clean device
2. Tap app icon — splash screen appears, auto-navigates to Sign-In
3. Tap "Sign in with Google" — mock auth completes in debug build
4. Onboarding starts: enter display name, tap Next
5. Confirm: user is taken to Dashboard, no children/events shown
6. Expected: no crash, dashboard shows empty state message

### Flow 2 — Create Group
1. From Settings → Group → "Create Group"
2. Enter group name, tap Create
3. Confirm group appears in Settings → Group
4. Expected: group listed, GroupConfig tab exists in mock sheet

### Flow 3 — Join Group (TODO — deferred)
_Deferred. Group join flow not yet implemented._

### Flow 4 — Add Child
1. Tap Children tab → "+" button
2. Enter child name, select color (Blue), tap Save
3. Confirm child appears in Children list with blue badge
4. Tap child → Child Detail shows empty events
5. Expected: no crash, color badge visible

### Flow 5 — Add Recurring Event
1. Tap Events → "+" button
2. Select child, enter title "Piano Lesson", type = MUSIC
3. Set date to next Monday, time 16:00, duration 60 min
4. Toggle Recurring ON
5. Set: Weekly, Monday, every 1 week, no end date
6. Toggle "Needs ride?" ON → direction = BOTH
7. Toggle "Share with group?" ON
8. Tap Save
9. Confirm: event appears in Events list, Rides Board shows ride for next Monday
10. Expected: recurrence generates future instances visible in calendar/list

### Flow 6 — Claim Ride
1. Open Rides Board
2. Find the "Piano Lesson" ride for next Monday
3. Confirm TO leg shows "Needs driver" chip with Claim button
4. Tap Claim on TO leg
5. Confirmation bottom sheet appears → tap Confirm
6. Confirm: TO leg now shows "Volunteered" chip with my name
7. Expected: assignment status = VOLUNTEERED, visible to other group members

### Flow 7 — Complete Ride
1. Day of the ride arrives (or set device date manually in testing)
2. Open My Rides — see "Piano Lesson TO" in today's rides
3. Tap "Mark Done"
4. Confirmation: "Confirm you completed this ride?"  → tap Yes
5. Confirm: ride shows "Done" chip in My Rides and Rides Board
6. Expected: assignment status = COMPLETED, dashboard updates

### Flow 8 — Conflict Scenario
1. Simulate two parents claiming same ride leg:
   - Parent A claims TO leg (sets status VOLUNTEERED locally)
   - Mock SheetsAdapter returns a conflicting VOLUNTEERED row from Parent B
2. On next sync, conflict is detected
3. Rides Board shows red "Conflict" chip on the TO leg
4. Banner at top of screen: "1 conflict needs your attention — Resolve"
5. Tap Resolve → Conflict Resolution screen shows both versions
6. Select one winner → conflict resolved
7. Expected: one assignment remains, other cancelled

### Flow 9 — Offline Edit Scenario
1. Turn off WiFi and mobile data on device
2. Add a new event ("Art Class") with ride needed
3. Confirm event appears in UI immediately (optimistic)
4. Sync Status screen shows "Offline — 1 change pending"
5. Turn network back on
6. Wait up to 10 seconds for auto-sync
7. Confirm: Sync Status shows "Last synced just now", pending = 0
8. Expected: event visible in mock Sheets data

### Flow 10 — Sync Recovery Scenario
1. Perform 3 mutations while network is off (add event, claim ride, complete ride)
2. Sync Status: "Offline — 3 changes pending"
3. Simulate sync failure by toggling mock to fail mode (via Debug menu in debug build)
4. Observe retry banner with "Sync failed — retrying in 30s"
5. Restore mock to success mode
6. After next retry, all 3 operations sync
7. Expected: all mutations reflected in remote mock data, pending = 0

---

## Regression Checklist

Run after each significant change:

- [ ] App launches without crash on clean install
- [ ] Sign-in flow completes (mock)
- [ ] Can create child with color tag
- [ ] Can create one-time event (private)
- [ ] Can create recurring event (group, with ride)
- [ ] Dashboard shows today's rides
- [ ] Can claim a ride on Rides Board
- [ ] Can mark ride complete in My Rides
- [ ] Sync status reflects pending operations
- [ ] Settings load all sections without crash
- [ ] Conflict banner appears when conflict injected
- [ ] App works offline for reads and writes
- [ ] Dark mode renders all screens correctly
- [ ] RTL layout renders correctly (Hebrew locale)

---

## Automated Test Coverage

### Status — last verified 2026-04-18

- 42 unit tests passing across 6 classes (run via `make docker-test` or `make test-unit`)
- Instrumented + UI tests: inventoried below but **not yet implemented**

### Unit tests — IMPLEMENTED (`app/src/test`)

| Test class | Cases | Covers |
|---|---|---|
| `RecurrenceExpanderTest` | 7 | Single/multi-day weekly, `intervalWeeks`, `endDate`, far-future safety cap |
| `RideAssignmentStateMachineTest` | 14 | Every valid transition + rejection of invalid transitions; terminal `COMPLETED` |
| `ConflictDetectorTest` | 7 | Timestamp compare, assignment leg collision, event update conflict, no-conflict cases |
| `ConfigParserTest` | 6 | Round-trip for `AppLocalConfig`, `ParentPrivateConfig`, `GroupSharedConfig`, `SyncConfig`, `UiPreferenceConfig` + unknown-key tolerance |
| `PrivateDriveDataJsonTest` | 2 | Full + minimum `PrivateDriveData` JSON round-trip (covers Parent, Child, Event, RecurrenceRule, KnownGroupEntry, CachedRemoteIds) |
| `MockSheetsAdapterTest` | 6 | Events/Assignments/GroupConfig write-then-read identity; notifications append; `ensureSheetExists` idempotency; seed data |

Run locally:
```bash
make docker-test          # containerized — ~30s
# or
make test-unit            # host toolchain
```

Reports land in `app/build/reports/tests/testDebugUnitTest/index.html`.

### Integration tests — PLANNED (`app/src/androidTest`)

| Test | Covers |
|---|---|
| `RoomCacheTest` | All DAOs: insert, update, delete, query by FK |
| `RepositorySyncTest` | Repo reads from Room, sync pushes via mock adapter |
| `SyncQueueReplayTest` | Queue fills offline, drains on reconnect |
| `FakeDriveAdapterTest` | Mock Drive read/write/create |
| `FakeSheetsAdapterTest` | Mock Sheets read/batch-write all tabs |

### UI tests — PLANNED (`app/src/androidTest`, Compose test)

| Test | Covers |
|---|---|
| `OnboardingFlowTest` | Full onboarding to dashboard |
| `CreateChildTest` | Add child, verify in list |
| `CreateRecurringEventTest` | Full event form with recurrence |
| `ShareEventTest` | Share event to group, verify on rides board |
| `VolunteerRideTest` | Claim ride, verify status change |
| `MarkRideCompleteTest` | Complete ride, verify status |
| `SettingsTest` | Change theme, verify applied |
| `ConflictBannerTest` | Inject conflict, verify banner and resolution flow |
