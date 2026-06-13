import { useCallback, useEffect, useState } from "react";
import { endOfDay } from "@/domain/timeWindow";

const STORAGE_KEY = "personal-tasks";

export interface PersonalTask {
  id: string;
  description: string;
  dueAt: number; // ms epoch, local-time
  createdAt: number;
}

function load(): PersonalTask[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw) as PersonalTask[];
    return Array.isArray(arr) ? arr : [];
  } catch { return []; }
}
function save(list: PersonalTask[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}

// Drop tasks whose entire due-day has already passed (yesterday or earlier).
function purgeExpired(list: PersonalTask[], now: number = Date.now()): PersonalTask[] {
  return list.filter((t) => endOfDay(t.dueAt) >= now);
}

function genId(): string {
  return `task-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function usePersonalTasks() {
  const [tasks, setTasks] = useState<PersonalTask[]>(() => {
    const pruned = purgeExpired(load());
    save(pruned);
    return pruned;
  });

  // Re-purge once per minute (in case the app stays open across midnight).
  useEffect(() => {
    const i = setInterval(() => {
      setTasks((prev) => {
        const next = purgeExpired(prev);
        if (next.length !== prev.length) save(next);
        return next;
      });
    }, 60_000);
    return () => clearInterval(i);
  }, []);

  const addTask = useCallback((description: string, dueAt: number): PersonalTask => {
    const task: PersonalTask = {
      id: genId(),
      description: description.trim(),
      dueAt,
      createdAt: Date.now(),
    };
    setTasks((prev) => {
      const next = [...prev, task];
      save(next);
      return next;
    });
    return task;
  }, []);

  const removeTask = useCallback((id: string) => {
    setTasks((prev) => {
      const next = prev.filter((t) => t.id !== id);
      save(next);
      return next;
    });
  }, []);

  const updateTask = useCallback((id: string, description: string, dueAt: number) => {
    setTasks((prev) => {
      const next = prev.map((t) =>
        t.id === id ? { ...t, description: description.trim(), dueAt } : t,
      );
      save(next);
      return next;
    });
  }, []);

  return { tasks, addTask, removeTask, updateTask };
}
