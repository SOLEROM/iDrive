# Auth & Membership

## Sign-in flow (kept, cleaner wiring)

```
onAuthStateChanged(user):
  if not user: clear state, stop.
  fastPath: localStorage["groupId:{uid}"] → set groupId, done.
  slowPath:
    family = findFamily(user.email) in bundled families[]
    if not family: authError + signOut
    else:
      setDoc(groups/{gid}, {groupName, members, globalLocations:[], globalActivities:[]}, merge)
      setDoc(groups/{gid}/parents/{uid}, {displayName, email}, merge)
      cache groupId in localStorage
      set groupId → starts listeners
```

Moved out of `AppContext` into `state/useAuth.ts` (subscribes) and
`data/authRepo.ts` (sign-in/out).

## Membership source
`families.yaml` at repo root. Example:

```yaml
families:
  - name: solovs
    members:
      - vladi.solov@gmail.com
      - …
```

Build step `scripts/gen-families.js` → `src/familiesData.ts`, loaded by
`data/familiesBundle.ts`. Admin changes members = edit yaml + `./run.sh --firebase`.

## Errors surfaced
- Email not in bundle → "Not authorised. Contact your group admin."
- Popup blocked → "Popup blocked. Enable popups and try again."
- Rules reject (very rare if bundle is in sync) → "Sign-in failed. Try again."

## Sign-out
- Clear `groupId:{uid}` cache.
- `firebaseSignOut(auth)` — Firestore SDK stops listeners automatically
  because we unsubscribe when `groupId` becomes `null`.

## localStorage keys (all under `idrive-` prefix)
- `idrive-group-id-{uid}` — resolved groupId cache.
- `idrive-local-config` — LocalConfig JSON.

## What we removed
- "Create group / join with code" screens.
- `userProfiles` collection (never landed but referenced in some plans).
- Manual `syncIntervalMinutes` control.
