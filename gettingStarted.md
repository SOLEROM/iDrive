# Getting Started

Developer onboarding for the **Kids Rides & Classes PWA** — from a fresh
host to building, testing, and deploying.

**Audience:** developers joining the project. If you just want to try the
app, skip to §1 → §3.

---

## 0. What you'll need

- **Node.js 20+** and **npm 10+**
- ~300 MB free disk (`node_modules/`)
- A modern browser (Chrome 90+, Edge 90+, Safari 16+, Firefox 110+) with
  Service Worker support — this is a PWA
- A **Firebase project** with Firestore + Auth enabled (see §4)

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

## 2. Configure Firebase

Create a `.env.local` file in the project root with your Firebase project
config (get these from Firebase Console → Project Settings → Your apps):

```
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...
```

For the existing project (`idrive-8bcdc`) this file already exists on the
dev machine — do not commit it.

---

## 3. Run the app

```bash
npm run dev           # http://localhost:5173  (Firebase works on localhost)
```

The `run.sh` helper has additional modes:

```bash
./run.sh              # (default) DEV: HTTPS Vite dev server on :5173, HMR on
./run.sh --prod       # PROD: build + HTTPS preview on :4173 (self-signed cert)
./run.sh --cloud      # CLOUD: build + Cloudflare quick tunnel — public HTTPS URL
./run.sh --firebase   # DEPLOY: gen-families → build → Firebase Hosting
./run.sh --help       # usage
```

On first visit you'll see the **Sign in with Google** screen. Only email
addresses listed in `families.yaml` are authorised. Unauthorized accounts
get an error message and are immediately signed out.

### Test on a phone

**Best option: `./run.sh --firebase`** — deploys to `idrive-8bcdc.web.app`,
a permanent pre-authorized HTTPS URL. No setup needed on the phone.

Other options:

- **`./run.sh --cloud`** — Cloudflare quick tunnel. Real HTTPS, but the URL
  changes every run. You'd need to re-authorize it in Firebase Console →
  Auth → Authorized Domains, which is impractical.
- **`./run.sh --prod`** then open `https://<LAN-IP>:4173` — self-signed cert,
  Chrome marks origin untrusted, suppresses PWA install prompt. Auth may fail
  if the LAN IP isn't in Firebase authorized domains.
- **`adb reverse tcp:5173 tcp:5173`** then `npm run dev` on `http://localhost:5173`
  via USB — `localhost` is always authorized.

---

## 4. Firebase project setup (one-time)

If starting from scratch with a new Firebase project:

1. **Firebase Console** → Create project
2. Enable **Authentication** → Sign-in method → Google
3. Add authorized domains: `localhost`, your hosting domain
4. Enable **Firestore Database** → Start in production mode
5. Deploy Firestore security rules:
   ```bash
   npx firebase-tools deploy --only firestore:rules
   ```
6. Enable **Firebase Hosting** (optional, but recommended for stable URL):
   ```bash
   npx firebase-tools deploy --only hosting
   ```

---

## 5. Managing family membership

Edit `families.yaml` in the project root:

```yaml
families:
  - name: solovs
    members:
      - parent1@gmail.com
      - parent2@gmail.com
      # add more members below
```

Then deploy:

```bash
./run.sh --firebase
```

This runs `scripts/gen-families.js` to generate `src/familiesData.ts`, builds
the app, and deploys to Firebase Hosting. The new member list is live
immediately for all users on next app load.

The `groupId` for each family is derived deterministically from the family
name (SHA256 hex, first 10 chars). Renaming a family in the yaml creates a
new empty group — avoid renaming.

---

## 6. Test

### Unit + integration tests (Vitest)

```bash
npm test              # 28 cases, ~1s
npm run test:watch    # watch mode
```

Current inventory:

| File | Cases |
|---|---|
| `tests/domain/recurrence.test.ts` | 7 |
| `tests/domain/rideStateMachine.test.ts` | 14 |
| `tests/domain/conflictDetector.test.ts` | 7 |

### Typecheck

```bash
npm run typecheck     # tsc --noEmit
```

### Coverage

```bash
npx vitest run --coverage
```

---

## 7. Build for production

```bash
npm run build         # → dist/
```

Output is a static bundle. Artefacts:

- `dist/index.html` — entry
- `dist/assets/*.js` / `*.css` — hashed bundles
- `dist/sw.js` + `dist/workbox-*.js` — Workbox service worker
- `dist/manifest.webmanifest` — installable PWA manifest
- `dist/icons/*` — app icons

---

## 8. Deploy

### Firebase Hosting (recommended)

```bash
./run.sh --firebase
```

This runs the full pipeline: `gen-families.js` → `vite build` → `firebase-tools deploy`.
The app is live at `https://idrive-8bcdc.web.app` within ~30 seconds.

### Other static hosts (Netlify / Vercel / Cloudflare Pages)

1. Point the provider at this repo
2. Build command: `node scripts/gen-families.js && npm run build`
3. Publish directory: `dist`
4. Node version: **20**
5. Set all `VITE_FIREBASE_*` env vars in the provider dashboard
6. Add the hosting domain to Firebase Console → Auth → Authorized Domains

### Nginx

```nginx
server {
    listen 443 ssl http2;
    server_name kidsrides.example.com;
    root /var/www/kidsrides/dist;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location = /sw.js {
        add_header Cache-Control "no-cache, max-age=0";
    }
    location = /manifest.webmanifest {
        add_header Cache-Control "no-cache, max-age=0";
    }

    location /assets/ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

---

## 9. Installing the app

### Android (Chrome)

1. Visit the deployed URL
2. Wait ~5–10s for the service worker to register
3. Chrome menu (⋮) → **"Install app"**
4. Launches standalone, no URL bar

### iPhone / iPad (Safari)

1. Visit the deployed URL in Safari
2. Share → *Add to Home Screen*
3. Launches standalone from the home-screen icon

Offline support kicks in on the **second** visit.

---

## 10. Typical workflows

### Work on a feature

```bash
npm run dev                        # start Vite + Firebase
# edit src/…

npm test                           # Vitest
npm run typecheck                  # tsc --noEmit
./run.sh --firebase                # deploy to test on phone
```

### Add a screen

1. New file under `src/screens/`
2. Register the route in `src/App.tsx`
3. Add a link or tab entry in `src/components/TabBar.tsx` if it's top-level

### Add a family member

1. Edit `families.yaml` — add the email under the correct family
2. `./run.sh --firebase`

### Wipe local session data

- **In-app**: Settings → *Sign out*
- **DevTools**: Application → Clear storage → Clear site data

---

## 11. Things that will bite you

| Symptom | Cause |
|---|---|
| `auth/unauthorized-domain` | Sign-in domain not in Firebase Console → Auth → Authorized Domains. `localhost` and `idrive-8bcdc.web.app` are pre-listed. |
| "Your account is not authorised" in-app | Email not in `families.yaml`. Edit yaml and run `./run.sh --firebase`. |
| Service worker doesn't register | Not HTTPS (or not `localhost`). Use `./run.sh --firebase`. |
| "Add to Home screen" but not "Install app" | Self-signed cert — use Firebase Hosting for trusted HTTPS. |
| Cloudflare tunnel URL changes every run | Expected. Use `./run.sh --firebase` for a stable URL. |
| `familiesData.ts` shows stale members | Run `./run.sh --firebase` to regenerate and deploy. |
| Old cached bundle stuck after deploy | Service worker auto-updates on next visit; hard refresh or reopen tab. |
