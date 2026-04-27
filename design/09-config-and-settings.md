---
noteId: "5b7bb8903fa311f1a7bf15b8f7b87558"
tags: []

---

# Config & Settings

## Three scopes — explicit in the rewrite

| Scope        | Where stored                          | Examples                          |
|--------------|---------------------------------------|-----------------------------------|
| Device-local | `localStorage["idrive-local-config"]` | theme, language, landing screen   |
| Shared       | `groups/{gid}` doc                    | `globalLocations`, `globalActivities` |
| Session      | derived from auth / never stored      | displayName, email, uid           |

Today these are mashed together in `AppLocalConfig`. Rewrite splits into
three typed shapes with a single `useAppConfig()` hook exposing them:

```ts
type LocalConfig   = { themeMode; language; defaultLandingScreen;
                       showCompletedRidesByDefault; compactCardMode;
                       vibrateOnReminder; soundOnReminder;
                       notificationLeadTimeMinutesDefault;
                       debugLoggingEnabled }
type SharedConfig  = { globalLocations: string[]; globalActivities: Activity[] }
type SessionInfo   = { displayName; email; parentId }     // not writable
```

No more `syncIntervalMinutes`, no more `loginEmail`/`activeParentId` in
config. Screens read `session` or `parent` directly.

## Settings screen (kept + reorganised)

Sections (one card per):
1. **Profile** (read-only): display name, email, sign-out.
2. **Members** (read-only): list from `parents`. Hint: "Edit `families.yaml`
   to change."
3. **Appearance**: theme, language, landing screen, compact mode.
4. **Reminders**: default lead time, vibrate, sound.
   (No wiring yet — see `14-notifications.md`.)
5. **Locations** (shared): add/remove global locations — see below.
6. **Backup**: "Download `.xlsx`".
7. **About / Install**: version, install button (`useInstallPrompt`).
8. **Advanced**: debug logging toggle.

Every setting card gets a tiny **scope pill**: `device` / `shared` — so the
user understands what changes for them vs. everyone.

## Shared locations — first-class feature

**Rule:** any place a parent types a location in the app offers the shared
list as suggestions and saving a new value does **not** auto-add to the
shared list. Additions are deliberate, from Settings only.

- **Owner:** `SharedConfig.globalLocations: string[]` on the group doc.
- **Write sites:** Settings → Locations card (add / remove chips). One
  source of truth. No other screen mutates the list.
- **Read sites (autocomplete):**
  - `EventEditorScreen` — Location field uses `<datalist>` bound to
    `globalLocations` (already wired).
  - `ActivityEditorScreen` — Place field, same datalist (already wired).
- **Semantics:** free-text entry allowed. The datalist is a hint, not a
  constraint — a parent can type a one-off address without polluting the
  shared list.
- **De-dup on add:** trim + case-insensitive compare against existing
  entries before adding (today's code is case-sensitive — fix in rewrite).
- **Rename:** not supported in v1. Remove + re-add is the workflow.
- **Scope pill:** the Locations card is tagged `shared` so the user
  knows it affects everyone in the group.

Same pattern applies to `globalActivities` (shared activity templates
reusable across children) — currently surfaced only in the EventEditor's
activity picker; the rewrite keeps that behaviour without adding a new
management UI (low user demand, easy to add later).

## Defaults shipped with the app
Centralised in `domain/defaults.ts`:
```ts
export const DEFAULT_LOCAL: LocalConfig = {
  themeMode: "SYSTEM", language: "SYSTEM",
  defaultLandingScreen: "DASHBOARD",
  showCompletedRidesByDefault: false,
  compactCardMode: false,
  vibrateOnReminder: true, soundOnReminder: true,
  notificationLeadTimeMinutesDefault: 60,
  debugLoggingEnabled: false,
}
```
