# Rewrite Plan (phased) — ALL PHASES SHIPPED 2026-04-25

> See [`IMPLEMENTATION_STATUS.md`](./IMPLEMENTATION_STATUS.md) for what actually
> landed and how it differs from the original plan below.

Each phase ends with `npm test && npm run typecheck && npm run build` green
and the app manually verified on the deployed URL.

## Phase 0 — Freeze feature surface
Check `17-features-inventory.md`. Any deviation is a separate discussion.
Deliverable: the user approves the design folder.

## Phase 1 — Scaffolding (no behaviour change)
- Create `src/data/` with `firebase.ts`, `paths.ts`, `familiesBundle.ts`
  moved in.
- Create `src/state/` modules (`useAuth`, `useGroupData`, `useLocalConfig`,
  `useTheme`). Provider becomes a thin composer.
- Keep screens importing from the same `@/state/AppContext` barrel (new
  shape but same exported names) to avoid touching UI yet.
- Delete dead code: `CommonActivityEditorScreen`, xlsx parse path,
  `VisibilityScope.PRIVATE`.

## Phase 2 — Domain cleanup
- Move `activityExpander` out of `ActivityEditorScreen` → `domain/`.
- Drop legacy `startTime`/`endTime`/`days` from `Activity`; migrate on first
  read. Update tests.
- Add `domain/ids.ts` and `domain/timeWindow.ts`; refactor screens to use
  them.
- Trim `AppLocalConfig`: split into LocalConfig + SharedConfig + SessionInfo.

## Phase 3 — Repo layer
- One file per collection under `src/data/*Repo.ts`.
- Provider calls repos only. No `firebase/firestore` imports leak into
  `state/` or `ui/`.
- Add repo tests with in-memory fake.

## Phase 4 — UI cleanup
- Extract reusable components (`Card`, `Chip`, `ListRow`, `FormField`,
  `ChildColorPicker`, `RideStatusChip v2`, `BottomSheet`).
- Re-skin each screen to use them. Line budgets per screen (see
  `01-architecture.md`).
- Wire full ride state machine (Confirm + Complete + override-confirm
  modal).
- Wire landing-screen setting.
- Wire recurrence controls on EventEditor (optional weekly+weekdays+end).

## Phase 5 — Polish
- Update banner on service-worker new-version.
- Toast / error bus for rules rejections.
- Lazy `xlsxExporter` import.
- Scope pills on settings items.
- Conflict detection surfaced in RidesBoard when multiple active
  assignments exist on the same leg.

## Phase 6 — Notifications scaffold
- Add `groups/{gid}/notifications` collection + rules.
- `notificationsRepo` + `useNotifications`.
- Mutations emit notification entries on ride claim / release / confirm /
  complete.
- `/notifications` lists them with dismiss-all.
- **No push delivery this round.**

## Out-of-scope (deferred)
- Web Push / FCM.
- Full HE localisation.
- Conflict resolution UI beyond "accept override" modal.
- Admin SDK flow (`emailIndex`).
- Rolling-window event regeneration.

## Rollback
Each phase is a single branch off `main`; stash and revert if the deployed
build shows a regression. No data migration is destructive — on-read
migration only (old events keep their deterministic ids).
