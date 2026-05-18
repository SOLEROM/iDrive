import { useState, useEffect, useCallback, useRef } from "react";
import type { RideAssignment, Event, Child } from "@/domain/models";
import type { AppLocalConfig } from "@/domain/config";

const STORAGE_KEY = "ride-alarm-settings";

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
function legTime(a: RideAssignment, evt: Event): number {
  return a.rideLeg === "FROM" ? evt.endDateTime : evt.startDateTime;
}

export function useRideAlarms(
  assignments: RideAssignment[],
  events: Event[],
  children: Child[],
  config: AppLocalConfig,
) {
  const [settings, setSettings] = useState<AlarmSettings>(load);
  const timers = useRef(new Map<string, ReturnType<typeof setTimeout>>());

  // Request permission once on mount when there are upcoming alarmable rides
  useEffect(() => {
    if (!("Notification" in window) || Notification.permission !== "default") return;
    const now = Date.now();
    const hasUpcoming = assignments.some((a) => {
      if (settings[a.assignmentId] === null) return false;
      const evt = events.find((e) => e.eventId === a.eventId);
      return evt && legTime(a, evt) > now;
    });
    if (hasUpcoming) Notification.requestPermission();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // (Re-)schedule all enabled alarms whenever deps change
  useEffect(() => {
    const refs = timers.current;
    refs.forEach(clearTimeout);
    refs.clear();

    if (!("Notification" in window) || Notification.permission !== "granted") return;

    const now = Date.now();
    for (const a of assignments) {
      const setting = settings[a.assignmentId];
      if (setting === null) continue; // explicitly off
      const leadMins = setting ?? config.notificationLeadTimeMinutesDefault;
      const evt = events.find((e) => e.eventId === a.eventId);
      if (!evt) continue;
      const fireAt = legTime(a, evt) - leadMins * 60_000;
      if (fireAt <= now) continue;

      const child = children.find((c) => c.childId === evt.childId);
      const t = setTimeout(() => {
        if (Notification.permission === "granted") {
          new Notification("Ride reminder", {
            body: `${child?.name ?? ""} · ${evt.title} · ${a.rideLeg} at ${new Date(legTime(a, evt)).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`,
            tag: a.assignmentId,
          });
        }
        if (config.vibrateOnReminder && "vibrate" in navigator) {
          navigator.vibrate([300, 100, 300]);
        }
        refs.delete(a.assignmentId);
      }, fireAt - now);
      refs.set(a.assignmentId, t);
    }

    return () => { refs.forEach(clearTimeout); refs.clear(); };
  }, [assignments, events, children, settings, config.notificationLeadTimeMinutesDefault, config.vibrateOnReminder]);

  const isAlarmOn = (id: string) => settings[id] !== null;

  const getLeadMinutes = (id: string): number => {
    const s = settings[id];
    return (s !== null && s !== undefined) ? s : config.notificationLeadTimeMinutesDefault;
  };

  const enableAlarm = useCallback(async (assignmentId: string, minutes: number) => {
    if ("Notification" in window) {
      if (Notification.permission === "default") {
        const perm = await Notification.requestPermission();
        if (perm !== "granted") return;
      }
      if (Notification.permission === "denied") return;
    }
    setSettings((prev) => { const n = { ...prev, [assignmentId]: minutes }; save(n); return n; });
  }, []);

  const disableAlarm = useCallback((assignmentId: string) => {
    setSettings((prev) => { const n = { ...prev, [assignmentId]: null }; save(n); return n; });
  }, []);

  return { isAlarmOn, getLeadMinutes, enableAlarm, disableAlarm };
}
