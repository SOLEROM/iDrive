---
noteId: "e4cad3003fa411f1a7bf15b8f7b87558"
tags: []

---

# Pitfalls — where this design can fail

A critical read of our own plan. Each item: **what**, **why it hurts**,
**what we could do**. Ordered roughly by severity.

---

## Concurrency & offline

### 1. Offline race on ride claims
Two parents tap **Accept** on the same leg while both are offline. Both
writes queue locally; on reconnect Firestore merges by last-write-wins.
`conflictDetector` runs client-side on the resolved snapshot — too late,
the second writer has already overwritten the first's claim silently.

- **Risk:** everyone thinks they're driving. Nobody is surprised until
  they show up and collide.
- **Fix ideas:** a Firestore security rule that only allows
  `UNASSIGNED → VOLUNTEERED` when the *prior* server state was
  `UNASSIGNED` (via `resource.data.assignmentStatus`). That converts the
  race into a rule rejection the loser can handle.

### 2. No "you are offline" banner
Firestore accepts the write offline and reflects it instantly in the UI.
The user has no idea their action hasn't propagated. Combined with #1,
this quietly creates double-booked legs.

- **Fix:** `navigator.onLine` + a subtle banner. Queue count badge on
  the sync status.

### 3. Activity save fires a delete + batch write in sequence
The cascade in `saveActivity` is `deleteMany(futureIds)` then
`upsertMany(newEvents)`. Between the two, listeners may emit an
intermediate snapshot with an empty calendar. UI can flicker; a concurrent
reader on another device briefly sees no events.

- **Fix:** a single `writeBatch` containing both deletes and sets so the
  transition is atomic.

---

## Data model

### 4. Legacy activity fields read after we "delete" them
`startTime`/`endTime`/`days` are removed from the TS type, but existing
Firestore docs still carry them. The rewrite plan migrates "on first
write". A child that nobody touches for a year has stale-format data
living on that can't be read once the type disappears.

- **Fix:** a read-time migrator in `childrenRepo.listen` that reshapes
  before handing to state. Don't delete legacy fields from the runtime
  reader until a full write-through has been observed.

### 5. Denormalised names on assignments
`driverName`, `claimedByName` are copied at claim time. If a parent
renames themselves later, past rides still show the old name. Analytics
exports inherit the skew.

- **Fix:** resolve by ID at render time (drop the `*Name` fields), OR
  schedule a tiny backfill on sign-in that stamps current names on my
  own historical records.

### 6. `driverParentId === ""` vs `UNASSIGNED`
Two ways to express "no driver" — status `UNASSIGNED` and an empty
`driverParentId`. Screens test both, inconsistently. Easy to introduce a
bug where we check one and not the other.

- **Fix:** canonical: `UNASSIGNED` ⇒ `driverParentId = ""` always. One
  writer function, no other path to the blank state.

### 7. Override-claim produces tombstones
When A takes over B's leg we set B's assignment to `CANCELLED` and create
a new `VOLUNTEERED` for A. Over months a popular leg accumulates a pile
of `CANCELLED` docs per event.

- **Fix:** reuse the assignment doc in-place (flip driver + stamp
  `updatedAt`). Lose per-driver audit detail but keep Firestore tidy.

### 8. Deterministic activity event IDs can collide on rename
`act-{childId.slice(-6)}-{slug(name)}-{YYYY-MM-DD}`. The cascade on edit
filters future events by `eventType === oldActivity.name`. If the rename
crosses a save cycle where `eventType` was already updated mid-way (e.g.
interrupted), the next regen creates new ids and leaves the old ones
orphaned under the old slug.

- **Fix:** always cascade by *both* the old and the current name, and by
  `eventType === activity.name` OR `eventId.startsWith("act-" + childSuffix + "-" + oldSlug + "-")`.

### 9. Slug truncation collisions
The slug is `.slice(0, 12)`. Two activities named
"Therapy group morning" and "Therapy group afternoon" slug to
`therapy-grou` for both. Events on the same day collide on id.

- **Fix:** widen slug to 24 chars, or hash the full name to 6 hex chars
  appended. The 12-char budget was an Android leftover.

---

## UX

### 10. `ChildBadge` everywhere vs tiny surfaces
We promised full name + colour on every event surface. Month-view cells
are ~45px wide on small phones. A badge with "Noa" fits; a badge with
"Elizabeth" doesn't. The earlier spec said "first letter overlaid on
coloured dot for month cells" — that contradicts the "name on every
screen" rule.

- **Fix (name in design):** the rule is **name visible when the row is
  readable**; the month-cell dot is a *teaser* and the day-expand list
  below is the authoritative, named view. Document this carve-out
  explicitly in `10-ui-navigation.md`.

### 11. Member picker friction in RidesBoard
A long list of legs + a split-button + a picker = slow on a busy
Sunday-night planning session. The 90% case (assign to me) must stay
one-tap. Our plan keeps primary = self, secondary = caret — the spec is
OK, the risk is a developer putting the picker inline "for
discoverability" and wrecking the primary flow.

- **Fix:** explicit acceptance test in `15-testing.md`: "tap Accept,
  assignment goes to me, no modal appears".

### 12. "Done" button on Dashboard doesn't hide the event
Event is set to ARCHIVED but EventsScreen doesn't filter by status. Users
mark events done and still see them everywhere.

- **Fix:** filter ARCHIVED from week/month unless a "Show archived"
  toggle is on. Already in `19-known-issues.md` — duplicated here
  because it's a symptom of a missing cross-cutting rule ("status
  filters are applied at selector, not in screens").

### 13. Landing screen setting references a route that doesn't exist
`LandingScreen.CALENDAR` is in the enum but there's no `/calendar`
route. If a user picks it, navigation at sign-in falls back to
`Navigate to="/"` — silent "my setting didn't work".

- **Fix:** drop CALENDAR from the enum or map it to `/events`
  explicitly. Add a zod-style guard in `useAuth`'s post-sign-in
  navigation.

### 14. Per-day times UX trap
Activity editor lets you check Mon + Wed + Fri and forget to fill in
times. Current code treats empty as "00:00" and end = start → a valid
event at midnight. Nobody notices until the event appears.

- **Fix:** can't save if any checked day has empty start time. Block the
  button, show inline error.

---

## Security & privacy

### 15. `families.yaml` emails end up in the public bundle
`familiesData.ts` is shipped in the JS bundle. Anyone can open devtools
and list authorised emails. Low-risk (rules still reject non-matching
sign-ins) but it's PII. Crawlers can harvest.

- **Fix:** move membership check to a Cloud Function OR read from a
  protected Firestore collection (the `emailIndex` design from
  `familyPlan.md`). Either breaks the "no service account" promise of
  today's setup. Trade-off; park it but know we've taken the hit.

### 16. Rules `get()` on every write
`isMember(groupId)` reads the group doc. Each write triggers a read.
With 5 listeners plus mutations, we burn ~2× the Firestore reads we'd
otherwise expect. Fine for a family; ugly per GB.

- **Fix:** cache membership in custom claims (admin SDK required at
  sign-in). Out of scope for this rewrite, but document the ceiling.

### 17. Clients can rewrite `groups/{gid}.members`
Our rules allow `update` to any member. A member could spitefully
rewrite the members array and lock everyone else out.

- **Fix:** rule explicitly: `request.resource.data.members == resource.data.members`
  on update. Member-list changes come from the deploy pipeline only.

### 18. `scripts/sync-families.js` uses a service account
The file is gitignored but lives on the maintainer's laptop. If it
leaks, the attacker has admin access to the whole project.

- **Fix (if we adopt it):** rotate on any suspicion, store under
  system keychain, don't back up the plain JSON.

---

## Operational / scaling

### 19. Event window never advances
Activity expansion runs today → end of next month **at save time**.
Nothing moves that window forward. After ~30 days of not editing an
activity, the far-end month silently empties.

- **Fix:** run a rolling-window regen on app open for any activity
  whose last event is within 7 days of today. 10-line hook. Do this in
  the rewrite, not "later"; it's the single most likely long-term
  silent bug.

### 20. DST cliff
Activity `startTime="09:00"` + `setHours(9,0,0,0)` on a spring-forward
Sunday → 10:00 UTC before, 09:00 UTC after. Generated events on the two
sides of DST have different UTC anchors. The Rides Board sorts by UTC
start; the "9am Monday" and "9am Wednesday" can flip order if one side
of the week is pre-DST.

- **Fix:** document it's intentional (local time is the user's mental
  model) and add a recurrence test that crosses a DST boundary.

### 21. Analytics export bakes in the exporter's timezone
`dateLocal` is computed from `new Date()` on the exporter's browser.
Two parents in different timezones produce different CSVs for the same
group data.

- **Fix:** pick one TZ and commit — either UTC (boring but stable) or
  record a `group.timezone` in shared config and use that.

### 22. No garbage collection for past events / assignments
Every generated event + every cancelled assignment lives forever in
Firestore. A family using the app for 5 years = ~60 × 5 = 300 events per
child + tombstones. Listeners read the whole collection on subscribe.

- **Fix:** a bounded window listener
  (`where("startDateTime", ">", oneYearAgo)`) OR a periodic archive job.
  Not urgent; name it.

### 23. Bundle size creep (xlsx at ~500 KB gz)
We plan dynamic import, but `npm run build` doesn't enforce a budget.
Once SheetJS regresses or someone adds lodash, the main bundle balloons.

- **Fix:** `vite-plugin-bundle-analyzer` in CI + a hard cap in
  `vite.config.ts` (`build.chunkSizeWarningLimit: 200`).

---

## Scope creep / design-shape

### 24. Notification scaffold without delivery
Writing notification docs on every ride mutation doubles our write
volume *and* establishes a schema we'll regret when we actually ship
push. Better to have no notifications UI at all than a half one.

- **Fix:** drop the scaffold from the rewrite. Ship it as one unit when
  Web Push + FCM + a real UI are all in place.

### 25. Two sources for "recurring"
We kept both `Activity.dayTimes` (flat events) and
`Event.recurrenceRule`. Every reader in the app has to support both
shapes. The EventEditor barely uses rules today; keeping rule support
"for a future one-off recurring event" is speculative.

- **Fix (maybe):** drop `RecurrenceRule` entirely, make manual events
  flat-only. `expandRecurrence` becomes a no-op and can be deleted.
  This simplifies ~300 lines. We lose "a parent's one-off weekly for a
  month". Trade-off.

### 26. `claimedByParentId` is two fields where one was enough
We now store who pressed the button. In practice nobody asks "who
assigned grandma?" — they ask "who's actually driving?". The audit
value is low and every write site must maintain both fields in sync.

- **Fix:** ship without `claimedByParentId`; only the driver matters.
  Add later if a real use case comes up (analytics "planner" attribution
  would be the reason).

### 27. Member-picker UI in MyRides for reassign
The current spec lets a claimer release their cross-assignment. We did
not spell out: can A reassign a ride they gave to B, to C, without
first un-assigning? If yes, that's a second, different picker hidden in
`/my-rides`. If no, users will want it anyway.

- **Fix:** pick one and write it down. Recommend **no** — release
  first, reclaim second. One picker, one mental model.

### 28. "Everyone peer-equal" won't survive year two
No admin flag. Works great for one family. The moment the user wants
"only the primary parent can delete events" there's nowhere to put it
and adding it cascades into every mutation's rule.

- **Fix:** put `roles: { [uid]: "admin"|"member" }` on the group doc
  *now*, default-populate everyone as member, don't enforce anywhere
  yet. Cheap to add, expensive to retrofit.

---

## Testing & process

### 29. In-memory Firestore fake vs the real thing
We plan an in-memory repo double. It won't reproduce Firestore's
transaction + offline + rule semantics. Green repo tests won't catch
production-only bugs.

- **Fix:** add one smoke test using the Firebase Emulator Suite that
  runs the five happy-path mutations against real rules. Covers #1,
  #16, #17 in one shot.

### 30. No E2E means UI regressions land silently
We said no Playwright this round. Perfectly rational on cost; and
perfectly easy to ship a regression like "the Accept button no longer
works" through green unit tests.

- **Fix:** at least one cypress/playwright script that signs in with a
  test account and claims a ride. Run it manually before every
  `./run.sh --firebase`.

---

## Summary — the three I'd fix before starting Phase 1

1. **#1 Offline race on ride claims.** Cheap rule change, huge
   correctness win. Don't ship without it.
2. **#19 Event window never advances.** Silent data drought. Rolling
   regen on app open is a one-hour task.
3. **#24 Drop the notifications scaffold.** Saves work now, avoids
   schema regret later. Ship notifications as one coherent feature
   when we actually ship push.

Everything else is a "know it, watch it" list.
