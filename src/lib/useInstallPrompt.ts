import { useEffect, useState } from "react";

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

// Module-level so the event is captured even before any component mounts.
let _deferred: BeforeInstallPromptEvent | null = null;
const _listeners = new Set<() => void>();
const _notify = () => _listeners.forEach((fn) => fn());

window.addEventListener("beforeinstallprompt", (e) => {
  e.preventDefault();
  _deferred = e as BeforeInstallPromptEvent;
  _notify();
});

window.addEventListener("appinstalled", () => {
  _deferred = null;
  _notify();
});

export function useInstallPrompt() {
  const [, tick] = useState(0);

  useEffect(() => {
    const rerender = () => tick((n) => n + 1);
    _listeners.add(rerender);
    return () => { _listeners.delete(rerender); };
  }, []);

  const install = async () => {
    if (!_deferred) return;
    await _deferred.prompt();
    const { outcome } = await _deferred.userChoice;
    if (outcome === "accepted") { _deferred = null; _notify(); }
  };

  return { canInstall: !!_deferred, install };
}
