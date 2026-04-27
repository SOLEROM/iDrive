---
noteId: "a81407203fa311f1a7bf15b8f7b87558"
tags: []

---

# Feature Inventory (mandatory — must survive the rewrite)

Each item below is observed behaviour in the current `src/`. The rewrite
MUST preserve every one.

## Cross-cutting UI rules (apply to every screen)
- [ ] **Child identification: name + colour on every event / ride / activity
  row.** No colour-only chips, no name-only rows. Uses the `ChildBadge`
  component defined in `10-ui-navigation.md`. See that file for the
  per-screen table.

## Auth & group
- [x] Google Sign-In (popup).
- [x] `families.yaml` → bundled membership check; unauthorised emails rejected
  with message.
- [x] Deterministic `groupId` per family (SHA-256 first 10 hex chars).
- [x] First member seeds the group doc (`members`, `groupName`, empty shared
  arrays).
- [x] Each signed-in parent is registered in `groups/{gid}/parents/{uid}`.
- [x] Sign-out clears cached group on device.

## Children
- [x] List (archived hidden from list screens).
- [x] Inline-add with name + 8-colour picker.
- [x] ChildDetail: edit name/color/notes, list activities (clickable).
- [x] Each activity row shows days (or "every day" chip).

## Activities (templates on child)
- [x] New + edit + delete.
- [x] Per-day times (`dayTimes`), each day an independent start/end.
- [x] "One time only" toggle (else repeating).
- [x] Place (free text + datalist of `globalLocations`).
- [x] Notes → copied to each generated event as description.
- [x] Needs ride → direction = TO / FROM / BOTH.
- [x] Save → generate events (today → end of next month) with deterministic
  ids; delete-then-regenerate on edit.
- [x] Delete activity → cascades future events.

## Events
- [x] Week and Month views on `/events` (tab switch).
- [x] Child-coloured left border on event cards.
- [x] Events sorted by start time.
- [x] FAB "+ add event".
- [x] Month cell shows up to 3 unique child-coloured dots + click → day list.
- [x] "+" per day in week view and in selected day's header in month view
  (pre-fills date).
- [x] EventEditor: child picker, activity picker (merged child + global),
  datalist on location, datetime-local inputs, notes, needs-ride +
  direction, visibility, save, delete.
- [x] Activity pick pre-fills title + location.
- [x] FAB deep-links `/events/new?date=YYYY-MM-DD`.

## Rides
- [x] `/rides`: all future `needsRide` events as cards.
- [x] Filter chips: All, My, per-child with child-colour tint on main area.
- [x] Per-leg active assignment display (driver name or "you").
- [x] Accept / Unaccept one-tap.
- [x] Inline per-event note editor (stored on `Event.description`).
- [x] `/my-rides`: my assignments + all allowed next-state buttons.
- [x] Completed / cancelled assignments reachable via state machine.
- [x] **NEW (shipped):** any family-group member can assign a leg to themselves
  *or to another member* via a member picker on the Accept control;
  assignee gets a notification, claimer appears in both parties' "My rides"
  (see `07-rides-and-assignments.md`).

## Dashboard
- [x] "Upcoming events" (next 3, ACTIVE, today+).
- [x] "Done" button on each upcoming (sets status to ARCHIVED).
- [x] "My rides" (non-unassigned, non-completed).
- [x] Week open-leg counter + link to /rides.
- [x] Month open-leg counter + link to /rides.
- [x] Note-preview chip on my-rides when event has a description.

## Settings
- [x] Profile (display name).
- [x] Members list + hint about `families.yaml`.
- [x] Theme (SYSTEM/LIGHT/DARK).
- [x] Language (SYSTEM/ENGLISH/HEBREW).
- [x] Landing screen (DASHBOARD / CALENDAR / EVENTS / RIDES / CHILDREN).
- [x] Reminder lead time + vibrate/sound toggles (stored only).
- [x] Locations (shared) — add/remove chips.
- [x] About + version + install button (or platform guidance).
- [x] Download backup (.xlsx).
- [x] **NEW (shipped):** Export for analysis (.xlsx) — flat, denormalised workbook
  (`Events`, `Assignments`, `Activities`, `Summary` sheets) for pivots /
  post-analysis. See `13-backup-export.md §2`.
- [x] Sign out.

## PWA
- [x] Manifest with icons, standalone display.
- [x] Workbox SW: auto-update, network-first HTML, stale-while-revalidate
  JS/CSS, cache-first images (30d, 100 entries).
- [x] `beforeinstallprompt` capture module-level.
- [x] Offline via Firestore `persistentLocalCache`.

## Internationalisation
- [x] Day labels + "every day" in EN / HE (infrastructure only).

## i18n gaps (existing & kept as gaps)
- [ ] Full UI string translation. (Scaffolded, not done — see
  `11-theming-and-i18n.md`.)

## Notifications gap (existing)
- [ ] `/notifications` stub; settings toggles non-functional. Rewrite
  scaffolds the data layer (`14-notifications.md`) but does NOT deliver
  push.
