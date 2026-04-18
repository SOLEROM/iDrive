# Sync Design — Kids Rides & Classes Manager

---

## 1. Principles

- Google Drive / Sheets = remote source of truth
- Room = local cache for performance and offline use
- All writes go to Room first (optimistic), then sync queue
- Sync engine drains queue and reconciles with remote
- Conflicts surface in UI; user resolves manually

---

## 2. Sync Triggers

| Trigger | Condition |
|---|---|
| App cold start | Always |
| App foreground resume | If last sync > 5 min ago |
| Local mutation | Immediately after write |
| Manual | User taps "Sync Now" in Sync Status screen |
| WorkManager periodic | Configurable interval (default 30 min) |
| Network reconnect | Via ConnectivityManager NetworkCallback |

---

## 3. SyncQueue

Stored in Room table `sync_queue_operations`:

```
operationId: String (UUID)
operationType: UPSERT | DELETE
entityType: PARENT | CHILD | EVENT | ASSIGNMENT | REMINDER | NOTIFICATION
entityId: String
entityJson: String (serialized entity)
target: DRIVE | SHEETS
createdAt: Long
attempts: Int
lastAttemptAt: Long?
status: PENDING | IN_FLIGHT | FAILED | DONE
```

- Max size: `SyncConfig.maxOfflineQueueSize` (default 500)
- On overflow: oldest DONE entries purged first; if still full, fail with error
- Operations are idempotent: upsert by entityId; duplicate upserts collapse to latest

---

## 4. Sync Engine Flow

```
SyncEngine.sync(groupId)
  1. Acquire mutex (skip if already syncing)
  2. Push phase:
     a. Load PENDING operations from SyncQueue
     b. For each DRIVE op: serialize to JSON, write to DriveAdapter
     c. For each SHEETS op: batch rows by tab, write via SheetsAdapter
     d. Mark ops DONE on success, FAILED on error
  3. Pull phase:
     a. Read Drive JSON → deserialize → merge into Room (ParentDao, ChildDao)
     b. Read Sheets Events tab → merge into Room (EventDao)
     c. Read Sheets Assignments tab → merge into Room (AssignmentDao) with conflict check
     d. Read Sheets Parents tab → merge into Room (GroupMemberDao)
     e. Read Sheets Notifications tab → merge into Room (NotificationDao)
  4. Emit SyncResult(success, conflictsFound, errors)
  5. Update lastSyncAt in DataStore
```

---

## 4b. Implementation pointers

- `data/sync/SyncEngine.kt` — `sync(parentId, groupId, sheetId)` is the single entry point; push then pull, guarded by a coroutine `Mutex`.
- `data/sync/ConflictDetector.kt` — stateless; exposes `detectEntityConflict`, `detectAssignmentConflicts`, `detectEventConflicts`. See `ConflictDetectorTest` for behaviour-by-example.
- `data/sync/SyncQueueDao.kt` — `markInFlight` / `markDone` / `markFailed` / `deleteDone`; also exposes `getPendingCount()` as a `Flow<Int>` for the UI badge.
- `data/sync/SyncWorker.kt` — the WorkManager wrapper; pulls from `SyncEngine` via Hilt.

---

## 5. Conflict Detection

### Simple fields (last-write-wins)
Compare `updatedAt` timestamps. Remote wins if remote.updatedAt > local.updatedAt. Local wins if local was mutated after last successful sync.

```
conflict = local.updatedAt > lastSyncAt AND remote.updatedAt > lastSyncAt
         AND local != remote
```

When conflict detected on simple fields: store both versions in Room with `isConflict = true`. Show in Conflict Resolution screen. User picks winner; losing version deleted.

### Ride assignment collision
Both parents claim same ride leg for same event:
- Remote assignment row exists with different driverParentId
- Set `assignmentStatus = CONFLICT` on both records
- Show conflict in Rides Board with alert chip
- User or admin resolves by cancelling one

### Deleted vs edited
- Deletion stored as a tombstone row with `status = DELETED` and `updatedAt`
- On merge: if remote tombstone.updatedAt > local.updatedAt → deletion wins
- If local was mutated after tombstone: show Conflict Resolution (restore vs delete)

### Recurring event conflict
If both local and remote changed `recurrenceRule` or `startDateTime` of the same recurring series: flag series for review. Do not auto-merge.

---

## 6. Retry Policy

| Attempt | Delay |
|---|---|
| 1 | 30s |
| 2 | 2 min |
| 3 | 5 min |
| 4 | 15 min |
| 5+ | 30 min (cap) |

After `SyncConfig.syncRetryCount` (default 5) failures, operation stays FAILED and user sees a banner. Manual sync re-queues failed operations.

---

## 7. Offline Behavior

- App fully functional offline for reads and new mutations.
- Mutations are queued. UI shows optimistic state immediately.
- Sync status banner shows "Offline — X pending" when queue non-empty and no network.
- On reconnect, SyncEngine fires automatically within 10s.

---

## 8. Schema Versioning

Private Drive JSON:
- Field `schemaVersion: Int` in root
- On read: if schemaVersion < current → run migration functions
- On write: always write current version

Shared Sheet:
- `GroupConfig` tab has key `dataSchemaVersion`
- On read: validate version; if mismatch, show warning and block sync until user updates app

---

## 9. WorkManager Configuration

```kotlin
PeriodicWorkRequestBuilder<SyncWorker>(
    repeatInterval = syncConfig.backgroundSyncIntervalMinutes,
    repeatIntervalTimeUnit = TimeUnit.MINUTES
).setConstraints(
    Constraints.Builder()
        .setRequiredNetworkType(
            if (syncConfig.requireWifiForLargeSync) UNMETERED else CONNECTED
        )
        .build()
).build()
```

---

## 10. Sync Status Model

```kotlin
data class SyncStatus(
    val lastSyncAt: Long?,
    val isSyncing: Boolean,
    val pendingOperations: Int,
    val hasConflicts: Boolean,
    val lastError: String?
)
```

Exposed as `StateFlow<SyncStatus>` from `SyncEngine`. Observed by SyncStatusViewModel and dashboard banner.
