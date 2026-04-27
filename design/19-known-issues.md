# Known Issues & Smells (mostly resolved)

> Items prefixed with **[FIXED]** are addressed in the 2026-04-25 rewrite.
> See `IMPLEMENTATION_STATUS.md` for the running fix log.

## Bugs

1. **`fromLocalInputValue` ignores TZ** — `new Date("YYYY-MM-DDTHH:MM").getTime()`
   parses as local-time in Chrome/Safari but as UTC in some edge cases
   (historically Safari). Event times could drift across browsers.
   *Fix:* explicitly construct `new Date(y,m,d,h,mi)`.

2. **`sameDay` in EventsScreen works from local midnight but event
   expansion is UTC-anchored** in `recurrence.ts`
   (`Date.UTC(baseDate.getUTCFullYear(), …)`). Manual recurring events
   near midnight can land on the wrong day. *Fix:* anchor consistently
   in local time; all current data is local-time generated.

3. **`upsertEvent` from EventEditor doesn't stamp `createdByParentId`
   correctly when editing** — uses whatever's stored, fine; but when a
   user edits an event they didn't create there's no audit field. Low
   priority, note only.

4. **Override claim silently blanks the previous parent** — see
   `07-rides-and-assignments.md` for the fix (ask first).

5. **`EventEditor` activity dropdown uses `event.eventType` which isn't
   updated when the user types a free-form title** — picking an activity
   after typing a title overrides neither. Works but confusing.

6. **`Dashboard` "Done" button sets status ARCHIVED but the event still
   shows up in EventsScreen** (no filter on status). *Fix:* filter
   archived from week/month views unless a "Show archived" toggle is set.

7. **Child archive hides the child everywhere but past events still
   reference the missing child** (colour map returns undefined). Render
   a neutral border when child is archived, not a broken border.

8. **`parseMonthSheet` / `parseConfigSheet` are dead** — reached from
   `parseWorkbookFromBuffer` which no one calls. Delete.

9. **`CommonActivityEditorScreen.tsx`** — unrouted dead screen. Delete.

10. **`useInstallPrompt.ts` attaches `window.addEventListener` at module
    scope; fine in the browser but blows up in SSR or unit tests**.
    Guard with `if (typeof window !== 'undefined')`.

## Performance

- `RidesBoardScreen` recomputes filters on every render with `filter(…)`
  chained N times. Tiny data → fine today. Noted for later.
- `AppContext` re-renders everyone on any mutation because it passes a
  fresh object every render. Memoise the context value.

## Code smells to address systematically

- Inline styles everywhere (esp. RidesBoard, EventsScreen). Target:
  everything that's not one-off goes into `styles.css` or component files.
- Repeated `childColorMap` construction in 5 screens — centralise in
  `state/useGroupData.ts`.
- `fmtDateTime` is called but weekly views also do custom formatting
  inline — unify.
- `const JS_DOW = {0:"SUNDAY",…}` re-declared inside `ActivityEditorScreen`
  — should live in `domain/enums.ts` or `lib/format.ts`.

## Deliberately NOT fixed
- Stored members on the group doc are the source of truth for rules. If we
  ever want to live-update members without a redeploy, switch to
  `familyPlan.md`'s `emailIndex` approach.
