---
noteId: "a07a88403fa311f1a7bf15b8f7b87558"
tags: []

---

# Domain Model

## Entities

### Parent (`AppParent`)
- `parentId` — Firebase Auth uid
- `displayName`, `email`
- (no roles yet; everyone is equal)

### Child
- `childId` — generated (`c-` + random 8)
- `parentOwnerId`
- `name`, `colorTag` (`ChildColor`), `notes`, `isArchived`
- `activities: Activity[]` — **templates**, not dated
- `createdAt`, `updatedAt`

### Activity (template — not dated, not stored separately)
```
{
  name, place, notes,
  dayTimes: Record<DayOfWeek, { startTime: "HH:MM", endTime: "HH:MM" }>,
  repeating: boolean,       // false = one-time
  needsRide: boolean,
  rideDirection: TO | FROM | BOTH,
}
```
Stored as a JSON array on the `Child` doc.

**Legacy fields to drop on rewrite** (do NOT carry forward):
- `days: string[]` + scalar `startTime` / `endTime` (superseded by `dayTimes`).
- We infer `days` from `Object.keys(dayTimes)` at read time.
  Any existing child doc gets migrated on first write in the rewrite.

### Event (dated, shareable)
```
{
  eventId,           // deterministic for generated; "e-…" for manual
  childId, title, eventType, description,
  locationName, locationAddress,
  startDateTime, endDateTime,        // epoch ms
  needsRide, rideDirection,
  createdByParentId,
  status: ACTIVE | CANCELLED | ARCHIVED,
  createdAt, updatedAt,

  // kept for forward compat, unused by activity-generated events:
  isRecurring: false, recurrenceRule: null,
  visibilityScope: GROUP,             // PRIVATE is de facto dead — drop
}
```

### RideAssignment
```
{
  assignmentId, eventId, rideLeg: TO | FROM,
  driverParentId, driverName,
  claimedByParentId,                      // NEW — who pressed "Assign";
                                          // equals driverParentId on self-claim
  assignmentStatus: UNASSIGNED | VOLUNTEERED | CONFIRMED | COMPLETED
                  | CONFLICT | CANCELLED,
  notes, claimedAt, completedAt, updatedAt,
}
```
`CANCELLED` and `CONFLICT` exist in the state machine and should be reachable
from the UI in the rewrite (currently only VOLUNTEERED is used end-to-end).

`claimedByParentId` lets a family member assign a ride to another member
(e.g. a parent scheduling grandma's Thursday pickup). When self-claimed it
equals `driverParentId`. See `07-rides-and-assignments.md` for UI and flow.

## Invariants
- Deterministic event ids for activity-generated events:
  `act-{childId.slice(-6)}-{slug(name)}-{YYYY-MM-DD}`
- Manual event ids: `e-{rand8}`.
- Child ids: `c-{rand8}`.
- Assignment ids: `a-{rand8}`.
- A leg has at most one active assignment (`!= UNASSIGNED`). More than one
  triggers `AssignmentConflict` from `conflictDetector`.
- An activity's events never span past the current-month window at generation
  time; regeneration happens on edit + on first-of-month scheduling (see
  `06-activities-and-events.md`).

## Enums stay as `as const` + type union (no TS `enum`)
Rationale: plain string serialisation, no runtime quirks. Current pattern is
correct and kept.

## What to delete from models on rewrite
- `VisibilityScope.PRIVATE` — never surfaced, never enforced.
- `Event.groupId` on documents — redundant (it's the doc's path).
- `Parent.groupIds`, `Parent.isAdminByGroup` — unused.
- `config.loginEmail/loginName/activeParentId/syncIntervalMinutes` — derived
  or dead (see `09-config-and-settings.md`).
