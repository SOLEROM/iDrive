import { AppLanguage, DayOfWeek } from "@/domain/enums";

type Lang = (typeof AppLanguage)[keyof typeof AppLanguage];

// Sun=0 … Sat=6, matches JS Date.getDay()
const SHORT_LABELS: Record<Lang, string[]> = {
  [AppLanguage.ENGLISH]: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
  [AppLanguage.HEBREW]:  ["ראשון", "שני", "שלישי", "רביעי", "חמישי", "שישי", "שבת"],
  [AppLanguage.SYSTEM]:  ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
};

const DOW_LABELS: Record<Lang, Record<DayOfWeek, string>> = {
  [AppLanguage.ENGLISH]: {
    SUNDAY: "Sunday", MONDAY: "Monday", TUESDAY: "Tuesday",
    WEDNESDAY: "Wednesday", THURSDAY: "Thursday", FRIDAY: "Friday", SATURDAY: "Saturday",
  },
  [AppLanguage.HEBREW]: {
    SUNDAY: "ראשון", MONDAY: "שני", TUESDAY: "שלישי",
    WEDNESDAY: "רביעי", THURSDAY: "חמישי", FRIDAY: "שישי", SATURDAY: "שבת",
  },
  [AppLanguage.SYSTEM]: {
    SUNDAY: "Sunday", MONDAY: "Monday", TUESDAY: "Tuesday",
    WEDNESDAY: "Wednesday", THURSDAY: "Thursday", FRIDAY: "Friday", SATURDAY: "Saturday",
  },
};

const EVERY_DAY: Record<Lang, string> = {
  [AppLanguage.ENGLISH]: "Every day",
  [AppLanguage.HEBREW]:  "כל יום",
  [AppLanguage.SYSTEM]:  "Every day",
};

// Day order for the activity editor checkboxes
const HEBREW_WEEK: DayOfWeek[] = [
  DayOfWeek.SUNDAY, DayOfWeek.MONDAY, DayOfWeek.TUESDAY, DayOfWeek.WEDNESDAY,
  DayOfWeek.THURSDAY, DayOfWeek.FRIDAY, DayOfWeek.SATURDAY,
];
const STANDARD_WEEK: DayOfWeek[] = [
  DayOfWeek.MONDAY, DayOfWeek.TUESDAY, DayOfWeek.WEDNESDAY, DayOfWeek.THURSDAY,
  DayOfWeek.FRIDAY, DayOfWeek.SATURDAY, DayOfWeek.SUNDAY,
];

export function getDayOrder(language: Lang): DayOfWeek[] {
  return language === AppLanguage.HEBREW ? HEBREW_WEEK : STANDARD_WEEK;
}

export function getDayLabels(language: Lang): string[] {
  return SHORT_LABELS[language] ?? SHORT_LABELS[AppLanguage.ENGLISH];
}

export function getDayOfWeekLabel(day: DayOfWeek, language: Lang): string {
  return (DOW_LABELS[language] ?? DOW_LABELS[AppLanguage.ENGLISH])[day];
}

export function getEveryDayLabel(language: Lang): string {
  return EVERY_DAY[language] ?? EVERY_DAY[AppLanguage.ENGLISH];
}
