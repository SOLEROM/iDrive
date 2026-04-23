# Family Management Plan

## Goal
Admin (vlad) maintains a `families.yaml` file. Running one command syncs it to Firestore.
Family members sign in with Google and are automatically routed to their group — no codes, no invites, unknown emails rejected.

---

## families.yaml format

```yaml
families:
  - name: Cohen Family
    members:
      - vlad@gmail.com
      - spouse@gmail.com
      - grandma@gmail.com

  - name: Smith Family
    members:
      - john.smith@gmail.com
      - jane.smith@gmail.com
```

---

## Firestore data model

```
emailIndex/
  {email}          → { familyId, groupId, familyName }   ← written by admin script only

families/
  {familyId}       → { name, groupId, members: [] }       ← written by admin script only

groups/
  {groupId}/       ← existing structure (children, events, assignments, parents)
    parents/{uid}  → { displayName, email }               ← written by client on first sign-in
```

`emailIndex` is the lookup table: when a user signs in, their email is checked here.
`families` stores the authoritative member list (for admin reference).
`groups` is the live data — unchanged from current design.

---

## sync script: scripts/sync-families.js

Uses Firebase Admin SDK (bypasses security rules) + service account key.

For each family in `families.yaml`:
1. Generate stable `familyId` from name (slugified)
2. Read existing Firestore `families/{familyId}` to preserve existing `groupId` (don't regenerate if already exists — would break existing data)
3. Write `families/{familyId}` = { name, groupId, members }
4. Write `groups/{groupId}` root doc (merge, don't overwrite existing data)
5. Write `emailIndex/{email}` for every member

Runs as a batch. Idempotent — safe to re-run after any yaml change.

---

## AppContext sign-in flow (new)

```
onAuthStateChanged(user):
  1. Check localStorage (existing session on this device) → fast path
  2. Check emailIndex/{user.email} in Firestore
     → Found: save groupId to localStorage, setGroupId
     → Not found: setAuthError("Not authorized") + sign out
```

Removes: userProfiles collection, invite system, createGroupFor, joinGroupAs

---

## Security rules (new)

```
emailIndex/{email}
  read:  only if request.auth.token.email == email   (user reads own entry)
  write: false   (admin SDK only — client can never write)

families/{familyId}
  read, write: false   (admin SDK only)

groups/{groupId}
  read: any auth user whose email is in emailIndex for this group
  (checked via get() on emailIndex doc)

groups/{groupId}/parents/{parentId}
  write: auth user can write their own record IF their emailIndex entry points to this groupId
```

---

## run.sh --sync

New mode: builds nothing, just runs `node scripts/sync-families.js`.
Requires `serviceAccount.json` in project root (gitignored).

---

## What changes

| File | Change |
|---|---|
| `families.yaml` | New — admin edits this |
| `scripts/sync-families.js` | New — syncs yaml to Firestore |
| `src/state/AppContext.tsx` | Replace invite/userProfiles flow with emailIndex lookup |
| `firestore.rules` | New rules for emailIndex + tighter group access |
| `run.sh` | Add `--sync` mode |
| `.gitignore` | Add `serviceAccount.json` |

---

## Sequence for adding a new family

1. Add family to `families.yaml`
2. Run `./run.sh --sync`
3. Family members open the app, sign in with Google → in the app immediately

## Sequence for removing a member

1. Remove email from `families.yaml`
2. Run `./run.sh --sync` (updates emailIndex)
3. On next sign-in attempt their email is not in emailIndex → rejected
4. If already signed in: their session continues until they sign out (can add active-session revocation later if needed)
