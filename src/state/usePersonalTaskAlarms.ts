import { useCallback, useEffect, useRef, useState } from "react";
import type { AppLocalConfig } from "@/domain/config";
import type { PersonalTask } from "@/state/usePersonalTasks";

const STORAGE_KEY = "personal-task-alarm-settings";

// undefined = alarm ON with global default
// null     = alarm explicitly OFF
// number   = alarm ON with this many minutes lead time
type AlarmSettings = Record<string, number | null>;

function load(): AlarmSettings {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "{}") as AlarmSettings; }
  catch { return {}; }
}
function save(s: AlarmSettings): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
}

async function showViaServiceWorker(title: string, opts: NotificationOptions): Promise<boolean> {
  if (!("serviceWorker" in navigator)) return false;
  try {
    const reg = await navigator.serviceWorker.ready;
    await reg.showNotification(title, opts);
    return true;
  } catch {
    return false;
  }
}

export function usePersonalTaskAlarms(tasks: PersonalTask[], config: AppLocalConfig) {
  const [settings, setSettings] = useState<AlarmSettings>(load);
  const timers = useRef(new Map<string, ReturnType<typeof setTimeout>>());

  // Prune settings for tasks that no longer exist (cleanup after expiry/done).
  useEffect(() => {
    setSettings((prev) => {
      const ids = new Set(tasks.map((t) => t.id));
      const next: AlarmSettings = {};
      let changed = false;
      for (const [k, v] of Object.entries(prev)) {
        if (ids.has(k)) next[k] = v;
        else changed = true;
      }
      if (changed) save(next);
      return changed ? next : prev;
    });
  }, [tasks]);

  // Ask permission once on mount when there's an upcoming alarmable task.
  useEffect(() => {
    if (!("Notification" in window) || Notification.permission !== "default") return;
    const now = Date.now();
    const hasUpcoming = tasks.some((t) => settings[t.id] !== null && t.dueAt > now);
    if (hasUpcoming) Notification.requestPermission();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // (Re-)schedule all enabled alarms whenever deps change.
  useEffect(() => {
    const refs = timers.current;
    refs.forEach(clearTimeout);
    refs.clear();

    if (!("Notification" in window) || Notification.permission !== "granted") return;

    const now = Date.now();
    for (const task of tasks) {
      const setting = settings[task.id];
      if (setting === null) continue;
      const leadMins = setting ?? config.notificationLeadTimeMinutesDefault;
      const fireAt = task.dueAt - leadMins * 60_000;
      if (fireAt <= now) continue;

      const t = setTimeout(() => {
        if (Notification.permission === "granted") {
          void showViaServiceWorker("Task reminder", {
            body: `${task.description} · ${new Date(task.dueAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`,
            tag: task.id,
          });
        }
        if (config.vibrateOnReminder && "vibrate" in navigator) {
          navigator.vibrate([300, 100, 300]);
        }
        refs.delete(task.id);
      }, fireAt - now);
      refs.set(task.id, t);
    }

    return () => { refs.forEach(clearTimeout); refs.clear(); };
  }, [tasks, settings, config.notificationLeadTimeMinutesDefault, config.vibrateOnReminder]);

  const isAlarmOn = (id: string) => settings[id] !== null;

  const getLeadMinutes = (id: string): number => {
    const s = settings[id];
    return (s !== null && s !== undefined) ? s : config.notificationLeadTimeMinutesDefault;
  };

  const enableAlarm = useCallback(async (taskId: string, minutes: number) => {
    if ("Notification" in window) {
      if (Notification.permission === "default") {
        const perm = await Notification.requestPermission();
        if (perm !== "granted") return;
      }
      if (Notification.permission === "denied") return;
    }
    setSettings((prev) => { const n = { ...prev, [taskId]: minutes }; save(n); return n; });
  }, []);

  const disableAlarm = useCallback((taskId: string) => {
    setSettings((prev) => { const n = { ...prev, [taskId]: null }; save(n); return n; });
  }, []);

  return { isAlarmOn, getLeadMinutes, enableAlarm, disableAlarm };
}
