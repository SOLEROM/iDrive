# Getting Started

Developer onboarding for the **Kids Rides & Classes PWA** — from a fresh
host to building, testing, and deploying.

**Audience:** developers joining the project. If you just want to try the
app, skip to §1 → §3.

---

## 0. What you'll need

- **Node.js 20+** and **npm 10+** (we're on Node 22 in CI)
- ~300 MB free disk (`node_modules/`)
- A modern browser (Chrome 90+, Edge 90+, Safari 16+, Firefox 110+) with
  Service Worker support — this is a PWA

macOS, Linux, and Windows (via WSL2) all work. The `install.sh` script
targets Ubuntu.

---

## 1. Install the toolchain

One command:

```bash
./install.sh
```

The script installs Node 20 via `nvm` if missing, then `npm install`s the
project. Safe to re-run.

Manual equivalent:

```bash
node -v               # expect v20 or newer
npm install
```

---

## 2. Run the dev server

```bash
npm run dev
```

Opens at [http://localhost:5173](http://localhost:5173). Hot-reload is on.

On first visit you'll see the sign-in screen; this build uses a local
mock (no real OAuth yet), so enter any name + email and continue.

### Test on a phone

The dev server binds to your LAN (`host: true`). From the same Wi-Fi:

```bash
# find the LAN IP the server prints, e.g. http://192.168.1.42:5173
```

iOS Safari **requires HTTPS** for service workers to register. Two options:

1. **Use production preview over HTTPS**: `npm run build && npx vite preview --https`
2. **Expose via a tunnel**: `npx serveo` / `cloudflared tunnel` / `ngrok`.

---

## 3. Test

### Unit + integration tests (Vitest)

```bash
npm test              # 44 cases, ~2s
npm run test:watch    # watch mode
```

Current inventory:

| File | Cases |
|---|---|
| `tests/domain/recurrence.test.ts` | 7 |
| `tests/domain/rideStateMachine.test.ts` | 14 |
| `tests/domain/conflictDetector.test.ts` | 7 |
| `tests/config/configParser.test.ts` | 6 |
| `tests/remote/privateDriveData.test.ts` | 2 |
| `tests/remote/mockSheetsAdapter.test.ts` | 6 |
| `tests/services/syncEngine.test.ts` | 2 |

### Typecheck

```bash
npm run typecheck     # tsc --noEmit
```

### Coverage

```bash
npx vitest run --coverage
```

---

## 4. Build for production

```bash
npm run build         # → dist/
```

Output is a static bundle ready for any CDN or static host. Artefacts:

- `dist/index.html` — entry
- `dist/assets/*.js` / `*.css` — hashed bundles
- `dist/sw.js` + `dist/workbox-*.js` — Workbox service worker
- `dist/manifest.webmanifest` — installable PWA manifest
- `dist/icons/*` — app icons (SVG)

Preview the production build locally:

```bash
npm run preview       # http://localhost:4173
```

---

## 5. Deploy

The app is a static bundle — any HTTPS host works:

### Option A — Netlify / Vercel / Cloudflare Pages

1. Point the provider at this repo
2. Build command: `npm run build`
3. Publish directory: `dist`
4. Node version: **20**
5. Ensure **HTTPS is enabled** (service workers require it outside `localhost`)

### Option B — Nginx

```nginx
server {
    listen 443 ssl http2;
    server_name kidsrides.example.com;
    root /var/www/kidsrides/dist;

    # PWA: serve index.html for SPA routes
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Service worker must never be cached long-term
    location = /sw.js {
        add_header Cache-Control "no-cache, max-age=0";
    }
    location = /manifest.webmanifest {
        add_header Cache-Control "no-cache, max-age=0";
    }

    # Hashed assets are safe to cache forever
    location /assets/ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

### Option C — GitHub Pages / S3 / any static host

`dist/` drops into any static web root. Enable HTTPS; set `index.html` as
the 404 fallback so client-side routing works.

---

## 6. Installing the app

### Android (Chrome)

1. Visit the deployed URL
2. Browser prompts "Install app" (or use menu → *Install app*)
3. Launches standalone, no URL bar, shows up in the app drawer

### iPhone / iPad (Safari)

1. Visit the deployed URL in Safari
2. Share → *Add to Home Screen*
3. Confirm — launches standalone from the home-screen icon

Offline support kicks in on the **second** visit (the service worker
needs one successful load to precache).

---

## 7. Typical workflows

### Work on a feature

```bash
npm run dev                        # start Vite
# edit src/…

npm test                           # Vitest
npm run typecheck                  # tsc --noEmit
```

### Add a screen

1. New file under `src/screens/`
2. Register the route in `src/App.tsx`
3. Add a link or tab entry in `src/components/TabBar.tsx` if it's top-level

### Debug a sync issue

1. Open DevTools → **Application** → **IndexedDB** → `kids-rides` — inspect
   the `syncQueue` table
2. Watch console logs; `SyncEngine` emits state transitions
3. Force a sync: Settings → **Sync now**

### Wipe local data

- **In-app**: Settings → *Sign out (wipes local data)*
- **DevTools**: Application → Clear storage → Clear site data

---

## 8. Real Google Drive / Sheets (deferred)

Debug builds use in-memory mock adapters
(`src/remote/mock/MockDriveAdapter.ts` / `MockSheetsAdapter.ts`). To add
real adapters:

1. Create a Google Cloud project → enable **Drive API** + **Sheets API**
2. Create an **OAuth 2.0 Web credential** with the deploy origin as an
   authorized redirect URI
3. Implement `GoogleDriveAdapter` and `GoogleSheetsAdapter` behind the
   existing `DriveAdapter` / `SheetsAdapter` interfaces
4. Flip the adapters in `src/state/AppContext.tsx` based on an env flag

The `DriveAdapter` / `SheetsAdapter` interfaces are the only contract to
respect.

---

## 9. Things that will bite you

| Symptom | Cause |
|---|---|
| Service worker doesn't register | Not HTTPS (or not `localhost`). Use `vite preview --https` or a tunnel. |
| Install prompt never appears on Android | Need a valid manifest + HTTPS + a service worker. Check DevTools → Application → Manifest. |
| iOS shows Safari chrome after "Add to Home Screen" | `apple-mobile-web-app-capable` meta missing — already set in `index.html`; verify it's being served. |
| `dexie` throws `DatabaseClosedError` in tests | Tests share the Dexie singleton — `__resetDb()` in `tests/setup.ts` clears it between tests. |
| Old cached bundle stuck after deploy | Service worker auto-updates on next visit, but the *current* tab needs a reload. Hard refresh or close/reopen. |
| `fake-indexeddb` errors in node | Always `import "fake-indexeddb/auto"` in `tests/setup.ts` (already wired). |

---

## 10. Where to go next

- **Dashboard** (`src/screens/DashboardScreen.tsx`) — the landing view
- **Core contracts** — `src/remote/driveAdapter.ts`,
  `src/remote/sheetsAdapter.ts`, `src/domain/models.ts`
- **Executable spec** — `tests/` documents the expected behaviour of every
  non-trivial piece of domain logic
- **PWA config** — `vite.config.ts` (manifest + Workbox settings)
