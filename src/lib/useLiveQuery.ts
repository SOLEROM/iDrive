import { useEffect, useState } from "react";
import type { Observable } from "dexie";

export function useLiveQuery<T>(
  factory: () => Observable<T>,
  initial: T,
): T {
  const [value, setValue] = useState<T>(initial);
  useEffect(() => {
    const sub = factory().subscribe({
      next: (v) => setValue(v),
      error: (e) => console.warn("liveQuery error", e),
    });
    return () => sub.unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return value;
}
