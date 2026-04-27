import { useCallback, useState } from "react";
import { defaultLocalConfig, type LocalConfig } from "@/domain/config";

const KEY = "idrive-local-config";

function load(): LocalConfig {
  try {
    if (typeof window === "undefined") return defaultLocalConfig;
    const raw = localStorage.getItem(KEY);
    if (raw) return { ...defaultLocalConfig, ...(JSON.parse(raw) as Partial<LocalConfig>) };
  } catch { /* ignore */ }
  return defaultLocalConfig;
}

export function useLocalConfig(): {
  local: LocalConfig;
  patchLocal: (patch: Partial<LocalConfig>) => void;
} {
  const [local, setLocal] = useState<LocalConfig>(load);

  const patchLocal = useCallback((patch: Partial<LocalConfig>) => {
    setLocal((prev) => {
      const next = { ...prev, ...patch };
      try {
        if (typeof window !== "undefined") {
          localStorage.setItem(KEY, JSON.stringify(next));
        }
      } catch { /* ignore */ }
      return next;
    });
  }, []);

  return { local, patchLocal };
}
