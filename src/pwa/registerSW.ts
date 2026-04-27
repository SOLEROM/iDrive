import { registerSW } from "virtual:pwa-register";

let _needRefresh = false;
const _listeners = new Set<() => void>();
let _update: ((reload?: boolean) => Promise<void>) | null = null;

const updater = registerSW({
  immediate: true,
  onNeedRefresh() {
    _needRefresh = true;
    _listeners.forEach((fn) => fn());
  },
  onOfflineReady() {
    console.info("[pwa] ready to work offline");
  },
});

_update = updater;

export function registerServiceWorker(): void {
  // Side-effects above run on import. Kept as named export to match callers.
}

export function onUpdateAvailable(cb: () => void): () => void {
  _listeners.add(cb);
  if (_needRefresh) cb();
  return () => _listeners.delete(cb);
}

export function isUpdateAvailable(): boolean {
  return _needRefresh;
}

export async function applyUpdate(): Promise<void> {
  if (_update) await _update(true);
}
