---
noteId: "b7f805603fa311f1a7bf15b8f7b87558"
tags: []

---

# UI & Navigation

## Routes (kept)

| Path                                    | Screen               | In tabbar |
|-----------------------------------------|----------------------|-----------|
| `/`                                     | Dashboard            | Home      |
| `/events`                               | Events (week/month)  | Events    |
| `/events/new`                           | EventEditor          | —         |
| `/events/:eventId`                      | EventEditor          | —         |
| `/rides`                                | RidesBoard           | Rides     |
| `/my-rides`                             | MyRides              | —         |
| `/children`                             | Children             | Kids      |
| `/children/:childId`                    | ChildDetail          | —         |
| `/children/:childId/activities/:idx`    | ActivityEditor       | —         |
| `/children/:childId/activities/new`     | ActivityEditor       | —         |
| `/settings`                             | Settings             | Settings  |
| `/notifications`                        | Notifications        | —         |

Dead routes dropped: `CommonActivityEditorScreen` (no route exists; delete
the file).

## Tab bar
5 slots: Home · Events · Rides · Kids · Settings. Badge counts come later.

## Unauthenticated
`<Shell>` renders `<SignInScreen>` when `!authUser || !parent`. Loading
state uses the same shell to avoid a layout flash.

## Landing screen on open
Respects `config.defaultLandingScreen` (DASHBOARD default). On sign-in,
navigate to that route. (Today this is declared but ignored.)

## Consistent component vocabulary

- `Card` — rounded surface with optional left-border child tint.
- `Chip` — pill (status / tag).
- `SectionHeader` — small-caps grey label between cards.
- `ListRow` — two-line row (title + subtitle), optional right adornment.
- `FAB` — floating action for "add" on Events / Rides.
- `BottomSheet` — modal for override-confirm on rides, and note edits.
- `FormField` — label + input/select/textarea with scope pill when applicable.
- `ChildColorPicker` — reused in Children + ChildDetail.
- `RideStatusChip` — already exists; extend to all 6 statuses.
- `ChildBadge` — **NEW**. Filled coloured pill with child's name inside
  (e.g. a green pill saying "Noa"). The single source of truth for showing
  *whose* event/ride this is. Replaces the scattered `ChildDot + text`
  pairings used today. Accessible label: `"Child: {name}"`.

Put these in `ui/components/`. Screens are then mostly layout + data wiring.

## Child identification — non-negotiable rule

Every screen that renders an event, ride leg, assignment, or activity MUST
show **both** the child's name and the child's colour — not one or the
other. Colour helps at a glance, the name is what you actually talk about.
No colour-only tiles, no name-only rows.

Concretely, per screen:

| Screen | How the child is shown |
|---|---|
| Dashboard — Upcoming events | `ChildBadge` inline in the card header + child-coloured left border |
| Dashboard — My rides | `ChildBadge` next to event title + coloured left border |
| EventsScreen — Week view | `ChildBadge` on each event row (replaces bare coloured border) |
| EventsScreen — Month view (cells) | Up to 3 coloured dots **with first letter of name** overlaid when space allows; on day-expand the list rows use full `ChildBadge` |
| EventsScreen — Month view (day list) | `ChildBadge` on every row |
| EventEditor | Read-only `ChildBadge` under the title when a child is picked; the child `<select>` still drives the edit |
| RidesBoard — cards | `ChildBadge` in the card header; coloured left border retained as a secondary cue |
| RidesBoard — filter chips | Already show child name; add a filled dot in the chip so active-filter state is unambiguous |
| MyRides | `ChildBadge` on every assignment card |
| ChildrenScreen | `ChildBadge` per row + notes preview |
| ChildDetail header | Full-width coloured header strip + name |
| ActivityEditor header | `ChildBadge` under the title ("Editing activity for Noa") |
| Notifications | `ChildBadge` inside each notification row when the entry references an event |

Card borders, chips and tints are decorative reinforcement — the
`ChildBadge` with the name is what the user reads.

### Archived children
When an event still references an archived child, render `ChildBadge` in
muted grey with the name + "(archived)" suffix — never a broken or missing
badge.

### No child assigned
For events with `childId === ""` (manual multi-kid events), show a neutral
grey `ChildBadge` labelled "No child" instead of hiding the slot. Keeps
the layout grid predictable and makes the absence of a child legible.

## Keyboard & focus
- Enter in "Add location" input commits (already works).
- Tab order sensible on forms (no custom focus management needed for v1).
- Mobile first; max-width 640 for desktop readability.

## Accessibility minimums
- Touch target ≥ 44px (already respected via `.btn` styles).
- Labels tied to inputs via `<label>` wrapping (already used).
- Color is never the only signal (text + icon pair on status chips).
- `aria-label` on icon-only buttons (back, close, dot buttons).
