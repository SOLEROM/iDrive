import { registerSW } from "virtual:pwa-register";

export function registerServiceWorker(): void {
  if (typeof window === "undefined") return;
  registerSW({
    immediate: true,
    onNeedRefresh() {
      console.info("[pwa] new version available — reload to update");
    },
    onOfflineReady() {
      console.info("[pwa] ready to work offline");
    },
  });
}
