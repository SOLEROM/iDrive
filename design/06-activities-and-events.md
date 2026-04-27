# Activities → Events

## Mental model
- **Activity** = a template attached to a child. *No date.*
- **Event** = a concrete dated occurrence. *On the shared timeline.*

Saving / editing an activity is the **only** automated event-creation path
besides the manual "New event" button.

## Activity shape (rewrite)
```
{
  name, place, notes,
  dayTimes: { [DayOfWeek]: { startTime: "HH:MM", endTime: "HH:MM" } },
  repeating: boolean,        // false = one-time (first matching day only)
  needsRide, rideDirection,  // defaults copied onto generated events
}
```
Days are derived: `Object.keys(dayTimes)`. Empty means "every day".

## Generation window
From **today (00:00 local)** through **end of next month 23:59:59.999 local**.
(Current code uses `today … endOfNextMonth` via `new Date(y, m+2, 0)` — keep
that window; it gives the Rides Board ~30-60 days of look-ahead regardless of
what day of the month it is.)

## Deterministic ids
```
act-{childId.slice(-6)}-{slug(activityName)}-{YYYY-MM-DD}
```
Re-saving an activity upserts the same ids → no duplicates.

## Editing semantics
1. Collect future events with `childId` + `eventType === oldActivity.name`.
2. `deleteMany(futureIds)` (cascades assignments).
3. Upsert new child.activities array.
4. `generateActivityEvents(newActivity)` → `upsertMany`.

All three steps in `activityExpander.saveActivity(child, newActivity, ctx)` so
screens don't orchestrate.

## Expansion algorithm (extract to `domain/activityExpander.ts`)
```
for d in [today, endOfNextMonth]:
  dow = dayOfWeek(d)
  if activity.dayTimes has dow:  (or empty dayTimes)
    t = activity.dayTimes[dow] or fallback
    emit Event { id, title=name, eventType=name,
                 startDateTime=d@t.start, endDateTime=d@t.end,
                 locationName=activity.place,
                 description=activity.notes,
                 needsRide, rideDirection }
    if not repeating: break
```

This is the piece that lives in `ActivityEditorScreen.generateActivityEvents`
today. Moving it into `domain/` lets us unit-test:
- repeating vs one-time
- per-day different times
- empty `dayTimes` = every day
- `endTime` falls back to `startTime`
- re-save is idempotent (same ids)

## Non-automated events
Manually added events via `EventEditorScreen` keep `eventType = ""` or a
free-form value; they are NOT swept by activity edits because the cascade
filters by `eventType === activity.name`.

## Open question to revisit later (not in this rewrite)
"Rolling window": today + N days auto-regeneration when the window slides.
Current behaviour: events stop at end-of-next-month; re-save the activity to
extend. Acceptable while the group is small; document in
`19-known-issues.md`.
