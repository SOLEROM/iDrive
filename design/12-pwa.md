# PWA Shell

## Manifest (unchanged)
`vite-plugin-pwa` generates `manifest.webmanifest`:
- name: "Kids Rides & Classes"
- short_name: "KidsRides"
- display: standalone
- orientation: portrait
- theme_color: `#3464D6`
- icons: 192, 512, maskable (in `public/icons/`)

## Service worker (unchanged)
`registerType: "autoUpdate"`. Runtime caching:
- **HTML** — NetworkFirst, 3s timeout.
- **JS / CSS / worker** — StaleWhileRevalidate.
- **Images** — CacheFirst, 30 days, 100 entries.
- `navigateFallback: /index.html` for SPA routes.

## Install prompt
`lib/useInstallPrompt.ts` captures `beforeinstallprompt` at module load so a
later render can still prompt. Works as-is; rewrite moves it to
`state/useInstallPrompt.ts` (same module, same contract, grouped with other
hooks).

### iOS Safari specifics (kept)
- No install prompt event. Settings screen shows tailored guidance when
  running in Safari vs. Chrome-on-iOS.
- Service worker only registers over HTTPS or `localhost`.

## Offline behaviour
Comes "for free" from:
- Workbox cached app shell.
- Firestore SDK's `persistentLocalCache()` (IndexedDB).

On first launch we rely on the network to fetch both the app shell and the
initial Firestore snapshot. Second launch onward: full offline.

## Update flow
`onNeedRefresh` currently only `console.info`s. Rewrite: surface a small
banner — "New version available — reload" — that the user can dismiss.
Don't force auto-reload (we'd lose unsaved form state).

## What we do NOT ship in this rewrite
- Background sync (needs `sync` + push permissions — see `14-notifications.md`).
- Badging API (nice-to-have for open ride counts on the icon).
