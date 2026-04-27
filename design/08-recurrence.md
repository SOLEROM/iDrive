# Recurrence — Design Decision

## The situation today
Two systems coexist:

1. **`Activity.dayTimes`** → generates flat `Event` docs, one per day. This
   is what the UI actually uses (`EventsScreen` reads events, not rules).

2. **`Event.isRecurring` + `recurrenceRule`** with `domain/recurrence.ts::expandRecurrence`. Events the user creates manually can set these, and
   `EventsScreen` calls `expandRecurrence` over the visible window.

## The problem
- Manual events almost never get `isRecurring=true` in practice (the editor
  UI has no recurrence controls).
- Activity-generated events are stored flat. `expandRecurrence` on a
  non-recurring event is a pass-through, so the code compiles and "works",
  but the dual model is confusing.

## Rewrite decision: keep both, narrow responsibilities
- **Activity path** remains the default for recurring schedules.
  Rationale: the user lives in "activities per child" mentally; flat events
  are what shared viewing, ride claiming, and cascading delete need.
- **`Event.recurrenceRule` stays** for future expansion (e.g. a one-off
  "every other week for a month" manual event). `EventEditorScreen` grows
  a minimal recurrence section (weekly, by weekday checks, end date) —
  optional; default off. Driven by the same `RecurrenceRule` shape already
  in `domain/models.ts`.
- `EventsScreen` keeps calling `expandRecurrence` — no-op for flat events,
  fan-out for rule-driven ones.

## Why not unify to rules-only?
- Ride claiming is per occurrence. Assignments reference `eventId` directly.
  Keeping occurrences as docs lets each date have its own claim history.
- Offline cache keeps ~60 days of events per group, which is tiny.
- Cascading delete on "edit activity" is trivial on flat events; surgical on
  rules (need to know which occurrences already have assignments).

## Why not drop rules entirely?
- A user-typed one-off event can be useful as recurring without forcing them
  to model it as an activity on a child (e.g. "carpool meeting").
- The machinery already exists and is tested (7 cases).

## Window semantics
- Activity expansion window: **today → end of next month**.
- Rule expansion window (in EventsScreen): **visible range** (week or month).
- Ride-board window: **today → end of month** for the counters.
