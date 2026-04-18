# UX Guidelines — Kids Rides & Classes Manager

> Implementation lives in `app/src/main/java/i/drive/kids/ui/`. Theme in `ui/theme/`, shared composables in `ui/component/`, one sub-package per screen under `ui/screen/`. Material 3 (Compose BOM 2024.06.00) + `material-icons-extended`. **Use `SwipeToDismissBox` — the older `SwipeToDismiss` API is gone in Material 3 ≥ 1.2.**

---

## 1. Principles

The app serves busy parents on the go. Every design decision must answer: **can a distracted parent do this in 5 seconds, one-handed, while walking?**

- **Calm** — no visual noise, generous whitespace
- **Fast** — critical info above the fold, no deep navigation to claim a ride
- **Low friction** — default values everywhere, progressive disclosure for advanced options
- **Obvious** — labels + icons, never icon-only for primary actions
- **Readable under stress** — large text, high contrast, clear hierarchy

---

## 2. Design System

### Theme
- Jetpack Compose Material 3
- Dynamic color disabled (consistent branding across devices)
- Custom `IdrivePalette` with fixed semantic colors (see §4)
- `ComfortaaFont` as primary (rounded, friendly), system fallback

### Spacing scale (dp)
`4 / 8 / 12 / 16 / 24 / 32 / 48`

### Touch targets
Minimum 48×48 dp for all interactive elements. Prefer 56 dp for primary actions.

### Typography scale
| Style | Size | Weight | Usage |
|---|---|---|---|
| DisplaySmall | 36sp | Medium | Screen titles |
| HeadlineMedium | 28sp | Medium | Section headers |
| TitleLarge | 22sp | SemiBold | Card titles |
| TitleMedium | 16sp | Medium | List items |
| BodyLarge | 16sp | Normal | Body text |
| BodyMedium | 14sp | Normal | Secondary text |
| LabelSmall | 11sp | Medium | Chips, badges |

---

## 3. Screen Inventory

| Screen | Route | Key action |
|---|---|---|
| Splash | `splash` | Auto-navigate |
| Sign-In | `signin` | Google sign-in button |
| Onboarding | `onboarding/{step}` | Step-by-step setup |
| Dashboard | `dashboard` | Scan today's rides |
| Children | `children` | Add/edit children |
| Child Detail | `child/{childId}` | View child events |
| Events List | `events` | Browse all events |
| Event Editor | `event/new`, `event/{id}/edit` | Create/edit event |
| Rides Board | `rides` | Claim rides |
| My Rides | `myrides` | My commitments |
| Notifications | `notifications` | In-app feed |
| Settings | `settings` | All config |
| Sync Status | `sync` | Sync state + history |
| Conflict Resolution | `conflict/{id}` | Resolve data conflict |

---

## 4. Color Rules

### Child colors (user-assigned)
```
RED     #EF5350
ORANGE  #FF7043
YELLOW  #FDD835
GREEN   #66BB6A
BLUE    #42A5F5
PURPLE  #AB47BC
PINK    #EC407A
TEAL    #26C6DA
```

### Ride status colors (fixed, never reassigned)
| Status | Color | Hex | Pair with |
|---|---|---|---|
| UNASSIGNED | Amber/warning | #FFA000 | ⚠ icon + "Needs driver" label |
| VOLUNTEERED | Blue/info | #1976D2 | ✋ icon + "Volunteered" label |
| CONFIRMED | Green/positive | #388E3C | ✓ icon + "Confirmed" label |
| COMPLETED | Grey/success | #757575 | ✓✓ icon + "Done" label |
| CONFLICT | Red/alert | #D32F2F | ⚡ icon + "Conflict" label |
| CANCELLED | Light grey | #BDBDBD | — icon + "Cancelled" label |

**Rule:** Never use color alone. Always pair with icon and text label.

---

## 5. Dashboard Layout

Vertical scrollable list of sections, each collapsible. Default order (user-configurable):

1. **Today's Rides** — cards for rides happening today
2. **Urgent Unassigned** — rides within urgentRideWindowHours with no driver
3. **My Accepted Rides** — rides I volunteered or confirmed
4. **Recent Group Updates** — last 5 notifications from the group feed
5. **Upcoming Classes** — next 3 events for my children

Each card shows: child color badge, child name, event title, time, location, ride leg chips.

Empty state: friendly illustration + "No rides today" message (not blank screen).

---

## 6. Event Editor UX

Single scrollable form. Progressive disclosure:

```
[Child selector]
[Title]
[Event type chips]
[Location]
[Date / Time]
[Duration]
──────────────────
Recurring?  [toggle]
  ↳ [only if ON] Frequency, Days, Every N weeks, End date
──────────────────
Needs a ride?  [toggle]
  ↳ [only if ON] Direction chips: TO / FROM / BOTH
──────────────────
Share with group?  [toggle — default ON for group members]
──────────────────
[Save]  [Cancel]
```

No nested navigation. Everything on one screen.

---

## 7. Rides Board UX

Grouped by day (sticky date headers). Per ride card:

```
┌─────────────────────────────────┐
│ 🔵 Emma · Soccer Practice       │
│ Tue 14 Jan  15:30 → Coach Park  │
│ [TO] [FROM]                     │
│ TO:  ⚠ Needs driver  [Claim]    │
│ FROM: ✋ Mike volunteered        │
└─────────────────────────────────┘
```

- Child color dot on the left
- Ride leg chips as outlined chips (TO/FROM/BOTH)
- Status shown as icon + text + colored chip
- "Claim" button visible only when UNASSIGNED and I haven't claimed
- One tap to claim. Confirmation bottom sheet: "Confirm you'll drive Emma TO Soccer Practice on Tue 14 Jan at 15:30?"

---

## 8. Notifications UX

In-app feed (NotificationEntry list):
- Grouped by date
- Each item: icon by category, message, time, unread indicator
- Swipe to dismiss
- Tap to navigate to related event/ride
- "Mark all read" action in toolbar

---

## 9. Settings UX

Sectioned list. Each item:
```
[Icon]  Setting name          [scope badge]
        Current value or description
```

Scope badges:
- `[device]` — light grey chip
- `[private]` — blue chip
- `[group]` — green chip, shows lock icon if user is not admin

Group settings visible to all members but editable only by admins.

---

## 10. Accessibility & Readability

- Minimum contrast ratio: 4.5:1 (WCAG AA)
- Support text scale up to 1.5× without layout breakage
- All interactive elements have `contentDescription`
- No animations that cannot be disabled (respect `reduceMotion`)
- Avoid icon-only buttons except in toolbar; add tooltips on long press
- Form fields: always show label, not just hint placeholder

---

## 11. Language Readiness

- All strings in `res/values/strings.xml`
- Hebrew support via `res/values-iw/strings.xml` (RTL layout via `layoutDirection`)
- No hardcoded strings in Composables or ViewModels
- Date/time formatting uses `java.time` with locale-aware formatters
- Number formatting respects locale

---

## 12. Loading & Error States

Every screen must handle:
- **Loading** — skeleton placeholder (not spinner for main content)
- **Empty** — illustration + message + primary action
- **Error** — message + retry button
- **Offline** — banner at top: "Working offline · X changes pending"
- **Conflict** — banner with "Resolve conflicts" deep link
