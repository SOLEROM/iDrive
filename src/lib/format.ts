import type { AppLanguage } from "@/domain/enums";
import { localeFor } from "./i18n";

type Lang = (typeof AppLanguage)[keyof typeof AppLanguage] | undefined;

export function fmtDateTime(ms: number, language?: Lang): string {
  return new Date(ms).toLocaleString(language ? localeFor(language) : undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function fmtDate(ms: number, language?: Lang): string {
  return new Date(ms).toLocaleDateString(language ? localeFor(language) : undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

export function fmtTime(ms: number, language?: Lang): string {
  return new Date(ms).toLocaleTimeString(language ? localeFor(language) : undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
}

export function toLocalInputValue(ms: number | null | undefined): string {
  if (!ms) return "";
  const d = new Date(ms);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function fromLocalInputValue(v: string): number {
  return new Date(v).getTime();
}
