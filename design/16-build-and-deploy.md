# Build & Deploy

## Scripts (unchanged)
```
npm run dev           Vite HMR on :5173
npm test              Vitest, ~1s for domain
npm run typecheck     tsc --noEmit
npm run build         tsc --noEmit && vite build → dist/
npm run preview       vite preview on :4173
./run.sh --firebase   gen-families → build → firebase deploy
./run.sh --cloud      build + Cloudflare quick tunnel (temp URL)
./run.sh --prod       build + HTTPS preview (self-signed)
./run.sh              (default) HTTPS Vite dev
```

Keep `run.sh`. It does the right things.

## Env
`.env.local` contains the six `VITE_FIREBASE_*` vars. Never committed.
`.env.local.example` documents them. Rewrite adds a startup assertion:

```ts
// data/firebase.ts
const required = ["VITE_FIREBASE_API_KEY", "VITE_FIREBASE_PROJECT_ID", …];
for (const k of required)
  if (!import.meta.env[k]) throw new Error(`Missing ${k}`);
```

Today a missing var silently yields a broken Firebase init at runtime.

## Hosting
Firebase Hosting — `idrive-8bcdc.web.app`. `firebase.json` rewrites all
SPA routes to `/index.html`. Nothing else to configure.

## Family pipeline
`families.yaml` → `scripts/gen-families.js` → `src/familiesData.ts` →
bundled. Run via `./run.sh --firebase` only.

## `scripts/sync-families.js`
Exists; not currently used. Would fit the `emailIndex` approach from
`familyPlan.md`. **Not adopted in this rewrite.** Keep as a reference for a
later migration.

## Bundle size discipline
- `xlsx` dynamic-imported (see `13-backup-export.md`).
- Firestore modular APIs only (`firebase/firestore`, `firebase/auth`); never
  `firebase` root.
- No moment/day.js — `Intl` and small helpers only.

## Release checklist
1. `npm test` green.
2. `npm run typecheck` green.
3. `./run.sh --firebase` prints "Live at …".
4. Open the deployed URL on phone + desktop, verify sign-in.
5. Edit one activity, verify event regeneration.
6. Claim a ride on one device, see update on the other within ~1s.
