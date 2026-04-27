import { useEffect } from "react";
import { ThemeMode, type ThemeMode as TM } from "@/domain/enums";

export function useTheme(mode: TM): void {
  useEffect(() => {
    if (typeof document === "undefined") return;
    const root = document.documentElement;
    const apply = () => {
      const resolved = mode === ThemeMode.SYSTEM
        ? (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light")
        : mode === ThemeMode.DARK ? "dark" : "light";
      root.setAttribute("data-theme", resolved);
    };
    apply();
    if (mode !== ThemeMode.SYSTEM) return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    mq.addEventListener?.("change", apply);
    return () => mq.removeEventListener?.("change", apply);
  }, [mode]);
}
