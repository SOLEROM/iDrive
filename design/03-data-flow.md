# Data Flow

## One source of truth
Firestore. The client has **no separate write queue** — the Firestore SDK's
offline cache queues writes and replays them. Local state is a reflection of
`onSnapshot` results; mutations go through repos, never through `setState`
directly.

## Read path

```
Firestore (groups/{gid}/**)
    │ onSnapshot
    ▼
data/*Repo.listen(gid, callback)
    │
    ▼
state/useGroupData  →  context
    │
    ▼
ui/screens (pure render from selectors)
```

Selectors (memoised) derive things like:
- `upcomingEvents(events, today)`
- `myOpenRides(assignments, parentId)`
- `openRideLegs(events, assignments, window)`
- `eventsByDay(events, weekStart)` / `eventsByMonth(...)`

Today, every screen recomputes these inline. The rewrite centralises them so
the logic is covered once by unit tests.

## Write path

```
screen → useApp().xxx  →  data/*Repo.upsert/delete  →  setDoc / writeBatch
```

Every repo method:
- Stamps `updatedAt = Date.now()`.
- Stamps `createdAt` if not already set.
- Returns the persisted object (so UI can navigate without re-reading).

Batched writes via `writeBatch` for all multi-doc operations
(`eventsRepo.upsertMany`, `eventsRepo.deleteManyAndCascadeAssignments`).

## Cascading rules
- Delete `Event` → also delete all `RideAssignment` where `eventId === …`.
- Regenerate activity → delete all **future** events with matching
  `eventType === activity.name` for the same child, then upsertMany new set.
- Delete activity → same cascade as regenerate but with no upsert.
- Archive child → do NOT delete events automatically; they simply become
  grey-tinted in the UI. (Decision: keep history.)

## Offline behaviour
- Reads instant from the Firestore local cache (IndexedDB).
- Writes queued locally, reflected in UI immediately (optimistic).
- On reconnect, Firestore flushes queued writes.
- If a write fails permanently (e.g. rules rejection), we surface a toast
  from `state/useErrorBus.ts` (new, see `19-known-issues.md`).

## What we are NOT building
- No custom offline queue.
- No manual "sync" button — the old `syncIntervalMinutes` goes away for good.
- No optimistic-state rollback beyond what Firestore does for us.
