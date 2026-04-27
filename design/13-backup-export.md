---
noteId: "c84c2a903fa311f1a7bf15b8f7b87558"
tags: []

---

# XLSX Exports

Two xlsx exports, one file each. Both are download-only, no import path.

| Export | Audience | Shape | Button |
|---|---|---|---|
| **Backup** | "Just in case" archive | Normalised, human-readable | Settings → "Download backup (.xlsx)" |
| **Analytics** | Stats, pivots, post-analysis | Denormalised flat tables | Settings → "Export for analysis (.xlsx)" |

# 1. Backup export

## Purpose
Download a human-readable snapshot of the group. Not used for app state at
all — not a source of truth, not imported back. **Export only.**

## When to use it
- Before a risky change (admin swapping the family's Firebase project).
- For non-technical users to "see the data".
- As a last-resort recovery if Firestore is lost (rebuild by hand).

## Where it lives
`data/xlsxExporter.ts`. **Only** file in the whole repo that imports `xlsx`.
The existing `parseWorkbookFromBuffer` / `parseMonthSheet` /
`parseConfigSheet` are removed — they were orphans from the retired
xlsx-as-storage era.

## Workbook shape (kept)
- Sheet **Config** — key/value config + children + parents blocks.
- Sheet **MMYY** per month — events and assignments for that month.

## Trigger
Settings → "Download backup (.xlsx)". Direct `Blob → URL.createObjectURL
→ a[download]` — no server round-trip.

## Keep it small
Bundle impact of `xlsx` is ~500 KB gzip; dynamic-import it inside the
download handler so the main bundle stays slim:

```ts
const mod = await import("./xlsxExporter");
mod.downloadBackup(data);
```

This is a rewrite change. Today `xlsx` is eagerly imported via
`xlsxStorage.ts`.

## Fields covered
- Local config keys (theme, language, …).
- Shared config (locations, global activities).
- Children (incl. `activities` JSON).
- Parents (displayName).
- Events (per month tab).
- Assignments (per month tab, keyed to event's month).

---

# 2. Analytics export (NEW)

## Purpose
Produce an xlsx suitable for pivot tables, charts, and post-analysis in
Excel / Google Sheets / any BI tool. Everything joined up front so no
lookups are needed inside the spreadsheet.

## Where it lives
Same module: `data/xlsxExporter.ts`, new function
`buildAnalyticsWorkbookBlob(data: AppData): Blob`. Also dynamic-imported
from the Settings handler (`await import("./xlsxExporter")`).

## Trigger
Settings → "Export for analysis (.xlsx)". Sits below the backup button with
a one-line hint: *"Flat tables with joined names for pivoting."*

## Workbook shape — flat, denormalised, stable column order

Three primary sheets — every row is self-contained (foreign fields inlined).
No nested JSON, no month splits, no section headers.

### Sheet `Events`
```
eventId | title | eventType | description
  | startISO | endISO | durationMinutes
  | dateLocal (YYYY-MM-DD) | weekdayLocal (MON..SUN) | monthLocal (YYYY-MM)
  | childId | childName | childColor
  | locationName | locationAddress
  | needsRide | rideDirection | status
  | createdByParentId | createdByParentName
  | createdAtISO | updatedAtISO
```

### Sheet `Assignments`
```
assignmentId | eventId | eventTitle | eventDateLocal | eventStartISO
  | childId | childName | childColor
  | rideLeg | assignmentStatus
  | driverParentId | driverName
  | claimedByParentId | claimedByName         ← NEW field (see 07-…)
  | selfAssigned (bool: driver == claimer)
  | notes
  | claimedAtISO | completedAtISO | updatedAtISO
```

### Sheet `Activities`
One row per child-activity template (exploded from each child doc).
```
childId | childName | childColor
  | activityName | place | notes
  | daysCsv (MON,WED,FRI) | hasPerDayTimes (bool)
  | startTime | endTime        (single-time fallback; blank if per-day)
  | repeating (bool) | needsRide | rideDirection
```

### Sheet `Summary` (read-only digest)
One-column pivot-seed metrics — copy into charts directly:
```
key                                   | value
------------------------------------- | ------
groupName                             | solovs
exportGeneratedAtISO                  | 2026-04-24T09:12:00Z
dataWindowStartISO                    | (min event startDateTime)
dataWindowEndISO                      | (max event startDateTime)
childCount (active)                   | 2
childCount (archived)                 | 0
parentCount                           | 3
eventCount (total)                    | 84
eventCount (needsRide)                | 52
assignmentCount (VOLUNTEERED)         | 12
assignmentCount (CONFIRMED)           | 6
assignmentCount (COMPLETED)           | 28
assignmentCount (CANCELLED)           | 2
openLegCount (future, all children)   | 9
completedRidesByParent (csv)          | Vlad:14, Zina:10, Grandma:4
```

## Rules for the analytics format
- **Flat only** — no nested JSON, no merged cells, no section markers.
  Excel pivots choke on those.
- **ISO timestamps** — always UTC (`toISOString()`); the
  `*Local` columns exist for weekday/month grouping without needing
  timezone formulas.
- **Stable column order** — documented above; do not reorder in future
  rewrites (breaks downstream pivots).
- **Empty, not null** — write `""` for absent strings, `0`/blank for
  absent numbers. Spreadsheets handle "" cleanly.
- **Booleans as `TRUE` / `FALSE`** (Excel-native), not `1`/`0` or `true`.
- **All rows included** — no pagination, no "current month" slice.
- **Children and parents inlined** — `childName`, `childColor`,
  `driverName`, `claimedByName` all resolved at export time so the sheet
  works even if IDs later change.

## What it does NOT contain
- `globalActivities` (shared templates) — not interesting for analysis;
  already in the `Activities` sheet per-child.
- Local device config (theme, language). Out of scope.
- The `Config` / per-month shape from the backup workbook.

## Test cases for `buildAnalyticsWorkbook`
- Empty group → 4 sheets present with headers only.
- Archived child with past events → `childName` still resolves (reads
  archived children too).
- Assignment referring to a deleted event → `eventTitle=""`,
  `eventDateLocal=""` (safe fallback, row still emitted).
- `driverParentId` pointing at a parent no longer in the group →
  `driverName=""` (not throw).
