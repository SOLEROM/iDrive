# Sync via Firebase Firestore

## Overview

Replace the local xlsx file as the source of truth with a shared Firestore
database. The app keeps working offline (reads/writes go to a local cache);
Firestore handles propagating changes to every device in the group
automatically — no Sync button, no file picker, no Dropbox.

---

## How it works end-to-end

```
User A (Android)          Firestore (cloud)         User B (desktop Chrome)
─────────────────         ─────────────────         ───────────────────────
edits event               ← write (merge)
                          ────────────────────────→ real-time listener fires
                                                    UI updates automatically
```

1. On first open, user signs in with their Google account (one tap — Google
   Auth via Firebase).
2. The app subscribes to the group's Firestore collection. Changes from any
   device arrive as a real-time snapshot within ~1 second.
3. Every mutation (add child, edit event, claim ride…) writes directly to
   Firestore. The Firestore SDK caches the write locally first so it feels
   instant even with poor connectivity.
4. When the device goes offline, writes are queued in the local cache and
   flushed automatically when connectivity returns.

---

## Data model in Firestore

One Firestore **database per group** (identified by a short group code the
first user shares with others, e.g. `xk92p`).

```
groups/
  {groupId}/
    config          ← document: AppLocalConfig fields
    parents/        ← collection: one doc per parent
      {parentId}    → { displayName }
    children/       ← collection: one doc per child
      {childId}     → Child fields + activities[]
    events/         ← collection: one doc per event
      {eventId}     → Event fields
    assignments/    ← collection: one doc per assignment
      {assignmentId} → RideAssignment fields
```

Each document maps 1-to-1 to the existing TypeScript models — no schema
change needed. `updatedAt` is kept on every record (already there) so
conflict resolution stays identical to the current merge logic.

---

## Auth and group membership

1. User installs the PWA and taps **Sign in with Google**.
2. They either:
   - **Create a new group** → Firestore generates a `groupId`; user shares
     the 5-char code with family members.
   - **Join an existing group** → they paste the code; the app points to
     that group's Firestore path.
3. Firestore Security Rules restrict read/write to users who appear in the
   group's `parents` sub-collection — so strangers can't access the data
   even if they guess the group code.

---

## What changes in the codebase

| Area | Change |
|---|---|
| `AppContext.tsx` | Replace `xlsxStorage` calls with Firestore SDK calls. `upsertEvent` → `setDoc`. Real-time listeners replace the sync timer. |
| `OpenFileScreen.tsx` | Replaced by a **Sign In + Group Code** screen. |
| `Header.tsx` | Remove Sync button entirely (sync is automatic). |
| `SettingsScreen.tsx` | Remove sync interval setting. Add "Group code: xk92p" display. |
| `xlsxStorage.ts` | Keep only the **Download xlsx** export path (useful as a backup). |
| New: `src/firebase.ts` | Firebase app init + `getFirestore()`, `getAuth()`. |
| New: `src/remote/firestoreAdapter.ts` | CRUD helpers wrapping the Firestore SDK. |
| `package.json` | Add `firebase` (the JS SDK, ~50 KB gzipped for Firestore + Auth). |

---

## Offline behaviour

The Firestore SDK has built-in offline persistence (IndexedDB under the
hood). When offline:
- Reads return the cached snapshot instantly.
- Writes are accepted locally and queued; they sync when connectivity
  returns.
- No extra code needed — this is on by default with
  `enableIndexedDbPersistence(db)`.

---

## Free tier limits (Firebase Spark plan)

| Metric | Free allowance | Expected usage (10 parents) |
|---|---|---|
| Stored data | 1 GB | < 5 MB |
| Reads / day | 50,000 | < 500 |
| Writes / day | 20,000 | < 200 |
| Network egress | 10 GB / month | negligible |

A small family group will never approach these limits.

---

## Migration from xlsx

On first sign-in, if the user has an existing `idrive.xlsx` on their device:
1. Parse it with the existing `xlsxStorage.parseWorkbook()`.
2. Batch-write all records to Firestore (`writeBatch`).
3. Mark migration done; stop using the local file.

Subsequent users who join via the group code get the data immediately
without any file transfer.

---

## Trade-offs

| Pro | Con |
|---|---|
| Real-time — no manual sync | Requires Google account |
| Works identically on iOS, Android, desktop | Internet required for first load (offline works after) |
| No file management for users | Data lives on Google's servers (not user-owned) |
| Handles simultaneous edits correctly | Small Firebase setup effort (project, auth, rules) |
| Free for a small group | If Google kills Firebase, migration needed |
