# Firestore Layout & Rules

## Collection tree (unchanged from current)

```
groups/{groupId}
  .groupName: string
  .members: string[]             ← lower-cased emails; checked by rules
  .globalLocations: string[]
  .globalActivities: Activity[]

groups/{groupId}/parents/{uid}
  .displayName, .email

groups/{groupId}/children/{childId}
  …Child fields + activities + updatedAt

groups/{groupId}/events/{eventId}
  …Event fields + createdAt + updatedAt

groups/{groupId}/assignments/{assignmentId}
  …RideAssignment fields + updatedAt
```

## groupId derivation (unchanged)
SHA-256(lowercased family name), first 10 hex chars. Same name → same
groupId across deploys. Done by `scripts/gen-families.js` at build time.

## Security rules (current, kept)
- `isMember(groupId)` reads the group doc and checks lowercased email
  against `members[]`.
- Root `groups/{groupId}` create: auth user whose email is in
  `request.resource.data.members`.
- Root read/update + all sub-collections: members only.
- `parents/{uid}` write requires `request.auth.uid == parentId`.

### Hardening for rewrite
- Add `allow delete` rules explicitly (current rules allow implicitly via
  `write`). Keep delete permitted on events/assignments; deny on the group
  root and on `parents/{uid}` (except when `request.auth.uid == parentId`).
- Reject writes missing `updatedAt` for sub-doc types.
- Limit `members[]` mutation to match `familiesData.ts` — currently clients
  can rewrite `members` on the root doc via `setDoc(..., {merge:true})`.
  Rule: `allow update` only if `request.resource.data.members ==
  resource.data.members`. Member-list changes must come from the deploy
  pipeline (which uses client auth, not admin SDK — revisit if we move to
  `scripts/sync-families.js` per `familyPlan.md`).

## What we do NOT adopt from `familyPlan.md`
- The `emailIndex` / `families/{familyId}` admin-SDK flow is **not** adopted
  in this rewrite. Current `families.yaml` → bundled `familiesData.ts`
  works and avoids the service-account operational burden. We keep the door
  open; `data/familiesBundle.ts` is the single seam where we'd swap it.

## Indexes
None required today (all queries are whole-collection listens per group).
If we later add per-child event queries, add a composite index on
`childId + startDateTime`.
