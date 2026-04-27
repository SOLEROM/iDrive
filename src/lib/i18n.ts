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

/**
 * BCP-47 locale code for `Intl.*` formatters. Returns `undefined` for
 * SYSTEM so the browser default is used.
 */
export function localeFor(language: Lang): string | undefined {
  if (language === AppLanguage.HEBREW) return "he";
  if (language === AppLanguage.ENGLISH) return "en";
  return undefined;
}

// ─── UI string bag ────────────────────────────────────────────────────────────
// Storage stays in English (enum keys, doc fields). Display goes through t().

const STRINGS = {
  myRides:               { en: "My rides",                         he: "הנסיעות שלי" },
  upcomingEvents:        { en: "Upcoming events",                  he: "אירועים קרובים" },
  today:                 { en: "Today",                            he: "היום" },
  sevenDays:             { en: "7 days",                           he: "7 ימים" },
  weekOpenRideRequests:  { en: "Week open ride requests",          he: "נסיעות פנויות השבוע" },
  monthOpenRideRequests: { en: "Month open ride requests",         he: "נסיעות פנויות החודש" },
  nothingOnYourPlate:    { en: "Nothing on your plate.",           he: "אין כלום על הצלחת שלך." },
  nothingScheduledToday: { en: "Nothing scheduled today.",         he: "אין אירועים היום." },
  nothingNext7Days:      { en: "Nothing in the next 7 days.",      he: "אין אירועים בשבעת הימים הקרובים." },
  addOne:                { en: "Add one →",                        he: "הוסף →" },
  allLegsClaimedWeek:    { en: "All legs claimed this week.",      he: "כל הנסיעות תפוסות השבוע." },
  allLegsClaimedMonth:   { en: "All legs claimed for the rest of the month.", he: "כל הנסיעות תפוסות עד סוף החודש." },
  needVolunteersWeek:    { en: "need volunteers this week.",       he: "מחכות למתנדב השבוע." },
  needVolunteersMonth:   { en: "need volunteers later this month.", he: "מחכות למתנדב בהמשך החודש." },
  rideLeg:               { en: "ride leg",                         he: "נסיעה" },
  rideLegs:              { en: "ride legs",                        he: "נסיעות" },
  viewBoard:             { en: "View board",                       he: "פתח לוח" },
  done:                  { en: "Done",                             he: "בוצע" },
  hi:                    { en: "Hi,",                              he: "שלום," },
  there:                 { en: "there",                            he: "" },
  day:                   { en: "Day",                              he: "יום" },
  week:                  { en: "Week",                              he: "שבוע" },
  month:                 { en: "Month",                             he: "חודש" },
  noEventsThisDay:       { en: "No events this day.",               he: "אין אירועים ביום זה." },
  add:                   { en: "+ Add",                             he: "+ הוסף" },
  ride:                  { en: "Ride",                              he: "נסיעה" },
  otherDots:             { en: "Other…",                            he: "אחר…" },
  enterDriverName:       { en: "Driver's name",                     he: "שם הנהג" },
  externalDriver:        { en: "External driver",                   he: "נהג חיצוני" },
  cancel:                { en: "Cancel",                            he: "ביטול" },
  assign:                { en: "Assign",                            he: "שייך" },
} as const;

export type StringKey = keyof typeof STRINGS;

export function t(key: StringKey, language: Lang): string {
  const entry = STRINGS[key];
  if (language === AppLanguage.HEBREW) return entry.he || entry.en;
  return entry.en;
}
