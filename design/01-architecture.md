# Architecture

## Layered structure (target)

```
src/
├── domain/         pure TS, no imports outside domain/; 100% testable
│   ├── enums.ts
│   ├── models.ts
│   ├── ids.ts              ← deterministic id builders (childId, eventId, activityId)
│   ├── recurrence.ts
│   ├── rideStateMachine.ts
│   ├── conflictDetector.ts
│   ├── activityExpander.ts ← NEW: activity template → Event[] (moved out of UI)
│   └── timeWindow.ts       ← startOfDay, week/month windows, day-key helpers
│
├── data/           adapters — only this layer imports firebase / xlsx
│   ├── firebase.ts         ← app/auth/db init
│   ├── paths.ts            ← Firestore ref helpers (groupDoc, subCol, subDoc)
│   ├── authRepo.ts         ← sign-in, sign-out, onAuthChanged
│   ├── groupRepo.ts        ← group doc + shared config
│   ├── parentsRepo.ts
│   ├── childrenRepo.ts
│   ├── eventsRepo.ts       ← upsert, upsertMany, delete, deleteMany
│   ├── assignmentsRepo.ts
│   ├── familiesBundle.ts   ← loads auto-generated families[]
│   └── xlsxExporter.ts     ← backup blob only (parse removed)
│
├── state/
│   ├── AppProvider.tsx     ← thin: wires repos to React state
│   ├── useAuth.ts          ← auth + membership resolution
│   ├── useGroupData.ts     ← listeners → memoised selectors
│   ├── useLocalConfig.ts   ← localStorage-backed device prefs
│   └── useTheme.ts         ← applies themeMode to <html>
│
├── ui/
│   ├── components/         ← generic, reusable (Card, Chip, Header, Tabs, …)
│   ├── screens/            ← one per route, uses hooks + components only
│   └── styles/             ← styles.css + CSS vars, tokens
│
├── lib/                    ← framework-agnostic helpers (format, i18n)
│
└── pwa/registerSW.ts
```

### Dependency rule (enforced by convention + ESLint import/no-restricted-paths later)
`ui → state → data → domain`. Never the other direction.
`domain` has **zero runtime deps** (can run in a Node test).
`data` is the only module tree that imports `firebase` or `xlsx`.

## Why this split
- Screens stop pulling `setDoc`/`writeBatch` through the provider.
- Firestore can be mocked by a fake repo for integration tests of screens.
- `activityExpander` is testable the same way `recurrence` already is.
- The god-provider becomes a ~80-line glue file.

## File size budget
- Screens ≤ 250 lines. Split when a screen grows sub-views (extract them).
- Provider/hooks ≤ 150 lines.
- Repos ≤ 80 lines each.
- Domain files ≤ 200 lines.
