# Task: Rebuild App as Progressive Web App (PWA)

## Objective

Re-implement the existing mobile application as a **Progressive Web App (PWA)** that delivers a native-like experience on Android and iPhone, with a single codebase and no dependency on app store distribution.

---

## Core Requirements

### 1. Frontend

* Use React (preferred) or minimal JS stack
* Implement:

  * Full-screen mobile UI (no browser chrome)
  * Responsive layout (mobile-first)
  * Navigation system (SPA)
* Ensure UX mimics native app behavior:

  * Smooth transitions
  * Touch-friendly components
  * App-like navigation patterns

---

### 2. PWA Capabilities

* Add `manifest.json`:

  * App name, icon, theme color, display: standalone
* Implement Service Worker:

  * Cache static assets
  * Enable offline fallback
  * Version-controlled cache updates
* Ensure installability:

  * Android: Chrome install prompt
  * iOS: Add-to-home-screen support

---

### 3. Backend Integration

* All business logic and heavy processing must reside in backend services
* Frontend acts as:

  * Thin client
  * UI + API orchestration layer
* Integrate with Google Drive as primary storage backend
* Use REST or GraphQL API abstraction

---

### 4. State & Data Handling

* Local caching via IndexedDB or localStorage
* Sync strategy:

  * Queue updates when offline
  * Sync when connectivity restored
* Maintain deterministic state handling (no hidden side effects)

---

### 5. Performance Constraints

* Optimize for:

  * Fast initial load (<2s on mobile)
  * Minimal JS bundle size
* Avoid heavy computation on client
* Lazy-load non-critical modules

---

### 6. Security & Permissions

* Enforce HTTPS (mandatory for PWA)
* Handle authentication securely (OAuth for Google Drive)
* Do not execute dynamic remote code in client

---

### 7. Build & Deployment

* Use Vite or similar lightweight bundler
* Output static deployable bundle
* Deployment target:

  * Static hosting (e.g., CDN / Nginx)
* Versioning:

  * Cache-busting strategy for updates

---

## Deliverables

1. `/frontend` PWA project
2. `manifest.json` + service worker implementation
3. API interface layer
4. Deployment script (build + publish)
5. Documentation:

   * Install instructions (Android + iOS)
   * Offline behavior definition

---

## Acceptance Criteria

* App installs on Android via browser prompt
* App can be added to iPhone home screen
* Runs in standalone full-screen mode
* Works offline for cached content
* Syncs correctly after reconnect
* UI indistinguishable (functionally) from native app

---

## Constraints

* No platform-specific code (unless wrapped later)
* No reliance on app stores
* Keep architecture modular for future native wrapping (e.g., Capacitor)

---

## Notes

Treat this system as:

> “Frontend shell over a backend-driven intelligence system”

Do not embed core logic in the client. Maintain clear separation between UI and processing layers.

