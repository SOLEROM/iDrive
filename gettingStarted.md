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

## 2. Run the app

The repo ships a `run.sh` helper with three modes:

```bash
./run.sh              # (default) DEV: HTTPS Vite dev server on :5173, HMR on
./run.sh --prod       # PROD: build + HTTPS preview of dist/ on :4173 (SW + manifest)
./run.sh --cloud      # CLOUD: build + Cloudflare quick tunnel — public HTTPS URL
./run.sh --help       # usage
```

Equivalent npm scripts if you prefer:

```bash
npm run dev           # plain HTTP dev on :5173 (no SW)
npm run dev:https     # HTTPS dev on :5173
npm run preview       # HTTP preview of built dist/ on :4173
npm run preview:https # HTTPS preview of built dist/ on :4173
```

On first visit you'll see the sign-in screen; this build uses a local
mock (no real OAuth yet), so enter any name + email and continue.

### Test on a phone — three paths, ranked by ease

1. **`./run.sh --cloud`** — the only path that reliably shows Chrome's
   **"Install app"** option. Cloudflare gives you a real HTTPS URL with a
   trusted cert. Works on any network (phone doesn't need to be on your
   Wi-Fi). No setup on the phone. Script stays alive with a 5-second
   health-check loop; Ctrl+C tears down tunnel + preview.
2. **`./run.sh --prod`** then open `https://<your-LAN-IP>:4173` on the
   phone. Self-signed cert — Chrome marks the origin as untrusted, which
   silently suppresses the install prompt. You can still use the app and
   *"Add to Home screen"*, but not a proper PWA install. Works offline
   once loaded.
3. **`adb reverse tcp:4173 tcp:4173`** then open `http://localhost:4173`
   on a USB-connected phone. Chrome trusts `localhost` for install
   purposes, so the prompt appears. Needs USB debugging enabled.

### Regenerating app icons

PNG icons are derived from the SVGs in `public/icons/`. If you edit the
SVGs, run:

```bash
npm run icons         # regenerates icon-{192,512,maskable}.png via sharp
```

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
- `dist/icons/*` — app icons (PNG for Chrome installability, SVG for scalable)

Preview the production build locally:

```bash
npm run preview       # http://localhost:4173  (HTTP, no cert)
./run.sh --prod       # https://<LAN-IP>:4173   (HTTPS via self-signed cert)
./run.sh --cloud      # https://<random>.trycloudflare.com  (HTTPS, trusted cert)
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

### Local testing (before you deploy)

The quickest way to test install on your own phone is
`./run.sh --cloud` — it starts a Cloudflare quick tunnel so Chrome sees a
real HTTPS origin with a trusted cert, which unlocks the **"Install app"**
prompt. Once logged in you'll also see an **Install app** button in
Settings → About (wired via `beforeinstallprompt`).

### Android (Chrome)

1. Visit the deployed URL (or the tunnel URL from `--cloud`)
2. Wait ~5–10s for the service worker to register
3. Chrome menu (⋮) → **"Install app"** (or use the in-app button in
   Settings → About)
4. Launches standalone, no URL bar, shows up in the app drawer

If you only see **"Add to Home screen"** and not **"Install app"**, the
origin isn't trusted (self-signed cert) — Chrome silently blocks the
install prompt. Use `./run.sh --cloud` or deploy to a real HTTPS host.

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
| Service worker doesn't register | Not HTTPS (or not `localhost`). Use `./run.sh --prod` or `./run.sh --cloud`. |
| "Add to Home screen" appears but not "Install app" | Origin is untrusted (self-signed cert). Use `./run.sh --cloud` for a trusted tunnel URL. |
| Install prompt never appears on Android | Need a valid manifest + trusted HTTPS + a registered service worker. Check DevTools → Application → Manifest for the failing criterion. |
| `Blocked request. This host ("…trycloudflare.com") is not allowed` | Vite 5 guards `preview.allowedHosts`. Already set to `true` in `vite.config.ts`; restart the preview after pulling. |
| Tunnel URL returns "can't connect" | The script has exited — the tunnel dies with it. Keep `./run.sh --cloud` running in its terminal. |
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
