---
noteId: "87d2e3003fa311f1a7bf15b8f7b87558"
tags: []

---

# Rides & Assignments

## Concepts
- Every event with `needsRide: true` exposes 1-2 **legs**:
  - `TO` and `FROM` when `rideDirection === BOTH`.
  - else a single leg matching `rideDirection`.
- Each leg has at most one **active** `RideAssignment`.
- **Claimer ≠ Driver.** Any member of the family group may claim a leg on
  behalf of themselves *or* on behalf of another member (see "Assign to
  another member" below).

## ⚠ Implemented model (current)

The implementation diverges from the original spec below — **no Confirm step**:

```
UNASSIGNED ─Accept──▶ VOLUNTEERED ─Done──▶ COMPLETED
     ▲                    │                   │
     │                    └─Release─▶         │
     │                                ◀─Undo──┘
```

`CONFIRMED` is retained in the enum + rules for legacy rows but new claims
never produce it. **Done** is gated to events whose `startDateTime` is on
or before today (UI guard, not a state-machine rule). **Release** works
from any active state. See `IMPLEMENTATION_STATUS.md`.

## State machine (kept — `domain/rideStateMachine.ts`)

```
UNASSIGNED ─claim──▶ VOLUNTEERED ─confirm──▶ CONFIRMED ─complete──▶ COMPLETED
     ▲                    │                      │
     │                    ├─release──▶ UNASSIGNED
     │                    └─cancel ──▶ CANCELLED
CONFLICT ◀─(collision detected)── VOLUNTEERED | CONFIRMED
CANCELLED ─reopen─▶ UNASSIGNED
```

`COMPLETED` is terminal.

## What each screen does

### RidesBoard (`/rides`)
- Lists all future `needsRide` events.
- Filter chips: **All · My · {Child}** (child-coloured backgrounds).
- Per-leg action: **Accept** (UNASSIGNED → VOLUNTEERED) or **Unaccept**
  (my VOLUNTEERED → UNASSIGNED).
- Inline per-event note editor.
- **Rewrite addition:** show the current state chip per leg
  (`VOLUNTEERED` / `CONFIRMED` / `COMPLETED`), not just the driver name.
- **Rewrite addition:** "Confirm" action shown to the other parent(s) in the
  group when a leg is `VOLUNTEERED` by someone else — one-tap to
  `CONFIRMED`. "Mark done" on `CONFIRMED` → `COMPLETED`.

### MyRides (`/my-rides`)
- Lists my assignments (any status).
- For each, buttons for every valid next state (already the code today).
- Rewrite: hide `CANCELLED` by default unless `showCompletedRidesByDefault`.

### Dashboard cards
- "My rides" (not COMPLETED, not UNASSIGNED).
- "Week open legs" and "Month open legs" counts.

## Override rule
If the current leg is held by someone else, tapping **Accept** should:
- Today: overwrites silently (blanks the other parent).
- Rewrite: flips the assignment to `CONFLICT` and prompts:
  "This leg is already taken by {name}. Take over?"
  On confirm → set old to `CANCELLED`, create new `VOLUNTEERED`.

That's how `detectAssignmentConflicts` actually earns its keep.

## Assignment id reuse
Keep current behaviour: re-use the existing `assignmentId` when flipping
UNASSIGNED → VOLUNTEERED, so the doc history is continuous.

## Assign to another family member (NEW)

Any signed-in member of the family group can assign a leg to **any** other
member — not just to themselves. Rationale: a parent planning the week
from the kitchen knows "grandma's picking up Thursday" and should be able
to record it without making grandma open the app.

### Data model change
`RideAssignment` gets a new field:
```
claimedByParentId: string   // who pressed "Assign"; defaults to driverParentId
```
`driverParentId` continues to mean "who is driving". When self-claimed they
are equal. When assigned on behalf of someone else they differ.

Both fields are required on any non-`UNASSIGNED` assignment. Releasing
(→ UNASSIGNED) clears `driverParentId` and `claimedByParentId` (or just
blanks `driverParentId` — we'll keep `claimedByParentId` for audit until
the slot is re-claimed).

### UI — RidesBoard per-leg action
Replace the single **Accept** button with a split control:
- Primary tap → **Accept** (assign to me — the 90% case).
- Secondary "…" / caret → opens a small member picker listing:
  - **Me (You)** — highlighted.
  - Every other parent in `groups/{gid}/parents` — tappable.
  - Footer hint: "To add or remove members, edit `families.yaml`."

After pick, the assignment is created with:
- `driverParentId` = picked uid
- `driverName` = picked displayName
- `claimedByParentId` = my uid
- `assignmentStatus = VOLUNTEERED`

The existing override flow (see "Override rule" above) applies regardless
of who is being assigned: if the leg is held by someone else, the
"Take over?" confirm dialog shows both the old driver and the new pick.

### UI — MyRides
- The "my" filter includes any assignment where **I am the driver OR I am
  the claimer**. A small chip labels how it reached me:
  - none — self-assigned.
  - "Assigned by {name}" — someone else put me on this leg.
- Driver can release (→ UNASSIGNED) or cancel (→ CANCELLED) — same as
  today. The claimer (if different) can do the same — no extra permission
  checks; trust within the family is the norm.

### Notifications (ties into `14-notifications.md`)
When an assignment is created with `driverParentId !== claimedByParentId`:
- Emit `NotificationCategory.RIDE_CLAIMED` with message
  `"{claimerName} assigned you {event.title} ({leg})"`.
- Target the driver first; group-feed visible to everyone.

When the driver releases a leg they were assigned to by someone else:
- Emit a notification back to the original claimer —
  `"{driverName} released {event.title} ({leg})"`.

These emissions are wired in the repo layer (`assignmentsRepo.claim`,
`assignmentsRepo.release`) so every screen using them behaves consistently.

### Dashboard & counters
- "Week open legs" / "Month open legs" — unchanged (count legs without
  active assignment, regardless of driver).
- "My rides" already covers driver; expand to include `claimedByParentId`
  so an assignment I made for someone else also appears on my dashboard
  until they complete it — helpful for the planner parent.

### What the rewrite does NOT add
- No "request a ride" flow. Assignments are commitments, not suggestions.
- No reassignment history timeline (we keep just the current pair of ids).
- No per-member permissions to restrict who can assign whom. Everyone in
  the family group is peer-equal. Revisit if a shared-admin model is
  ever needed.
