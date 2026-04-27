import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Header } from "@/components/Header";
import { useApp } from "@/state/AppContext";
import { AssignmentStatus, ChildColor, ChildColorHex, RideDirection, RideLeg } from "@/domain/enums";
import { fmtDateTime, fmtTime } from "@/lib/format";
import { expandRecurrence } from "@/domain/recurrence";
import { sameDay, startOfDay, todayStart, endOfDay, endOfMonth, isoDateLocal } from "@/domain/timeWindow";
import { getDayLabels, localeFor, t } from "@/lib/i18n";
import type { AppLanguage } from "@/domain/enums";
import type { Child, Event, RideAssignment } from "@/domain/models";
import { ChildBadge } from "@/components/ChildBadge";

type ViewMode = "day" | "week" | "month";

function eventsForDay(events: Event[], dayMs: number): Event[] {
  return events.filter((e) => sameDay(e.startDateTime, dayMs));
}

function EventCard({ e, child, language }: {
  e: Event; child: Child | null; language: (typeof AppLanguage)[keyof typeof AppLanguage];
}) {
  const hex = ChildColorHex[child?.colorTag ?? ChildColor.BLUE];
  return (
    <Link to={`/events/${e.eventId.split(":")[0]}`} key={e.eventId}>
      <div className="card" style={{ borderLeft: `4px solid ${hex}` }}>
        <div className="row row--between">
          <div style={{ minWidth: 0 }}>
            <div className="row" style={{ gap: 6, flexWrap: "wrap" }}>
              {child && <ChildBadge name={child.name} color={child.colorTag} archived={child.isArchived} />}
              <strong>{e.title}</strong>
            </div>
            <p>{fmtDateTime(e.startDateTime, language)}</p>
            {e.locationName && <p>{e.locationName}</p>}
          </div>
          {e.needsRide && <span className="chip">Ride</span>}
        </div>
      </div>
    </Link>
  );
}


// ─── Day view (calendar-style timeline) ──────────────────────────────────────
const HOUR_PX = 56;
const GUTTER_PX = 52;
const MIN_BOX_PX = 26;
const MS_HOUR = 3_600_000;
const MS_MIN = 60_000;

interface PositionedEvent {
  event: Event;
  topPx: number;
  heightPx: number;
  leftPct: number;
  widthPct: number;
}

/**
 * Lay events out into non-overlapping columns (Google-Calendar style):
 * sweep events sorted by start time; each event takes the leftmost column
 * whose previous event has already ended. Within a transitively-overlapping
 * cluster every event gets equal width.
 */
function layoutEvents(events: Event[], dayStartMs: number): PositionedEvent[] {
  const sorted = [...events].sort(
    (a, b) => a.startDateTime - b.startDateTime || a.endDateTime - b.endDateTime,
  );
  const out: PositionedEvent[] = [];
  let cluster: { e: Event; col: number }[] = [];
  let columnsEnd: number[] = [];

  function flush() {
    if (cluster.length === 0) return;
    const totalCols = columnsEnd.length;
    for (const { e, col } of cluster) {
      const startMs = Math.max(0, e.startDateTime - dayStartMs);
      const endMs = Math.min(24 * MS_HOUR, e.endDateTime - dayStartMs);
      const startMin = startMs / MS_MIN;
      const endMin = Math.max(startMin + 1, endMs / MS_MIN);
      const topPx = (startMin / 60) * HOUR_PX;
      const heightPx = Math.max(MIN_BOX_PX, ((endMin - startMin) / 60) * HOUR_PX);
      out.push({
        event: e,
        topPx,
        heightPx,
        leftPct: (col / totalCols) * 100,
        widthPct: (1 / totalCols) * 100,
      });
    }
    cluster = [];
    columnsEnd = [];
  }

  let clusterEnd = -Infinity;
  for (const e of sorted) {
    const eStart = e.startDateTime;
    const eEnd = Math.max(e.endDateTime, eStart + 30 * MS_MIN);
    if (eStart >= clusterEnd) flush();
    let col = -1;
    for (let i = 0; i < columnsEnd.length; i++) {
      if (columnsEnd[i] <= eStart) { col = i; break; }
    }
    if (col === -1) { col = columnsEnd.length; columnsEnd.push(0); }
    columnsEnd[col] = eEnd;
    cluster.push({ e, col });
    clusterEnd = Math.max(clusterEnd, eEnd);
  }
  flush();
  return out;
}

function activeAssignmentsFor(eventId: string, assignments: RideAssignment[]): RideAssignment[] {
  return assignments.filter((a) =>
    a.eventId === eventId &&
    a.assignmentStatus !== AssignmentStatus.UNASSIGNED &&
    a.assignmentStatus !== AssignmentStatus.CANCELLED,
  );
}

/**
 * True when the event needs both TO and FROM legs and both have an active
 * assignment. The day-view box renders a green ✓ when this holds, so a
 * fully-covered round-trip is unmistakable at a glance.
 */
function isFullyCovered(e: Event, assignments: RideAssignment[]): boolean {
  if (!e.needsRide || e.rideDirection !== RideDirection.BOTH) return false;
  const active = activeAssignmentsFor(e.eventId, assignments);
  const hasTo = active.some((a) => a.rideLeg === RideLeg.TO);
  const hasFrom = active.some((a) => a.rideLeg === RideLeg.FROM);
  return hasTo && hasFrom;
}

function hourLabel(hour: number, locale: string | undefined): string {
  const d = new Date(2000, 0, 1, hour, 0);
  return d.toLocaleTimeString(locale, { hour: "numeric" });
}

const DARK_TEXT_COLORS = new Set<ChildColor>([ChildColor.YELLOW]);
function textColorFor(c: ChildColor): string {
  return DARK_TEXT_COLORS.has(c) ? "#1b1f2a" : "#fff";
}

function DayView({
  events, assignments, children, dayMs, language, onPrev, onNext,
}: {
  events: Event[];
  assignments: RideAssignment[];
  children: Child[];
  dayMs: number;
  language: (typeof AppLanguage)[keyof typeof AppLanguage];
  onPrev: () => void;
  onNext: () => void;
}) {
  const childById = new Map(children.map((c) => [c.childId, c]));
  const locale = localeFor(language);
  const dateLabel = new Date(dayMs).toLocaleDateString(locale, {
    weekday: "long", month: "long", day: "numeric", year: "numeric",
  });
  const isToday = sameDay(dayMs, todayStart());
  const dayStart = startOfDay(dayMs);
  const dayEnd = endOfDay(dayMs);

  const inDay = events.filter((e) => e.endDateTime >= dayStart && e.startDateTime <= dayEnd);
  const positioned = layoutEvents(inDay, dayStart);

  // Auto-scroll the page to the earliest event (or 7am) on day change.
  const gridRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const main = document.querySelector(".app-main") as HTMLElement | null;
    if (!main || !gridRef.current) return;
    const earliestMs = inDay.length > 0
      ? Math.min(...inDay.map((e) => e.startDateTime))
      : dayStart + 7 * MS_HOUR;
    const minutes = Math.max(0, (earliestMs - dayStart) / MS_MIN);
    const targetWithinGrid = (minutes / 60) * HOUR_PX - 60;
    const gridTop = gridRef.current.offsetTop;
    main.scrollTo({ top: Math.max(0, gridTop + targetWithinGrid), behavior: "auto" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dayMs]);

  // Now-line position (today only).
  const nowOffsetPx = isToday
    ? ((Date.now() - dayStart) / MS_MIN / 60) * HOUR_PX
    : null;

  return (
    <div>
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        marginBottom: 8,
      }}>
        <button type="button" aria-label="Previous day" onClick={onPrev} style={navBtn}>‹</button>
        <strong style={{ fontSize: 15, color: isToday ? "var(--primary)" : "var(--fg)" }}>{dateLabel}</strong>
        <button type="button" aria-label="Next day" onClick={onNext} style={navBtn}>›</button>
      </div>
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 8 }}>
        <Link
          to={`/events/new?date=${isoDateLocal(dayMs)}`}
          className="btn"
          style={{ fontSize: 13, padding: "4px 10px", minHeight: "auto" }}
        >{t("add", language)}</Link>
      </div>

      <div
        ref={gridRef}
        style={{
          position: "relative",
          height: 24 * HOUR_PX,
          background: "var(--surface)",
          borderRadius: 12,
          border: "1px solid var(--border)",
          overflow: "hidden",
        }}
      >
        {/* Hour grid lines + labels */}
        {Array.from({ length: 24 }, (_, h) => (
          <div
            key={h}
            style={{
              position: "absolute", left: 0, right: 0,
              top: h * HOUR_PX, height: HOUR_PX,
              borderTop: h === 0 ? "none" : "1px solid var(--border)",
              boxSizing: "border-box",
            }}
          >
            <span style={{
              position: "absolute", left: 6, top: -8,
              fontSize: 10, color: "var(--muted)",
              background: "var(--surface)", padding: "0 4px",
            }}>
              {h === 0 ? "" : hourLabel(h, locale)}
            </span>
          </div>
        ))}

        {/* Now-line (today only) */}
        {nowOffsetPx !== null && nowOffsetPx >= 0 && nowOffsetPx <= 24 * HOUR_PX && (
          <div
            aria-hidden
            style={{
              position: "absolute", left: GUTTER_PX, right: 4,
              top: nowOffsetPx,
              height: 2,
              background: "#ef4444",
              zIndex: 2,
              pointerEvents: "none",
            }}
          />
        )}

        {/* Event boxes */}
        {positioned.length === 0 ? null : positioned.map(({ event: e, topPx, heightPx, leftPct, widthPct }) => {
          const child = childById.get(e.childId) ?? null;
          const colorTag = child?.colorTag ?? ChildColor.BLUE;
          const bg = ChildColorHex[colorTag];
          const fg = textColorFor(colorTag);
          const drivers = activeAssignmentsFor(e.eventId, assignments);
          const fullyCovered = isFullyCovered(e, assignments);
          const compact = heightPx < 56;
          return (
            <Link
              key={e.eventId}
              to={`/events/${e.eventId.split(":")[0]}`}
              style={{
                position: "absolute",
                top: topPx,
                left: `calc(${GUTTER_PX}px + ${leftPct}% - (${GUTTER_PX}px * ${leftPct} / 100))`,
                width: `calc((100% - ${GUTTER_PX}px - 4px) * ${widthPct} / 100)`,
                height: heightPx - 2,
                padding: 6,
                background: bg,
                color: fg,
                borderRadius: 6,
                border: `1px solid ${bg}`,
                boxShadow: "0 1px 3px rgba(0,0,0,0.18)",
                overflow: "hidden",
                fontSize: 12,
                lineHeight: 1.25,
                textDecoration: "none",
              }}
              title={`${e.title}${child ? " · " + child.name : ""}${fullyCovered ? " · TO+FROM assigned" : ""}`}
            >
              {fullyCovered && (
                <span
                  aria-label="Both TO and FROM assigned"
                  style={{
                    position: "absolute",
                    top: 4,
                    right: 4,
                    width: 18,
                    height: 18,
                    borderRadius: "50%",
                    background: "#16a34a",
                    color: "#fff",
                    fontSize: 12,
                    fontWeight: 800,
                    lineHeight: "18px",
                    textAlign: "center",
                    boxShadow: "0 1px 2px rgba(0,0,0,0.25)",
                  }}
                >✓</span>
              )}
              <div style={{
                fontWeight: 700,
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
                paddingRight: fullyCovered ? 22 : 0,
              }}>
                {e.title || "(no title)"}
              </div>
              {!compact && (
                <>
                  <div style={{ opacity: 0.92, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {fmtTime(e.startDateTime, language)}
                    {e.endDateTime > e.startDateTime && ` – ${fmtTime(e.endDateTime, language)}`}
                  </div>
                  {child && (
                    <div style={{ opacity: 0.92, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {child.name}
                    </div>
                  )}
                  {drivers.length > 0 && (
                    <div style={{ opacity: 0.85, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {drivers.map((a) => `${a.rideLeg}: ${a.driverName || "?"}`).join(" · ")}
                    </div>
                  )}
                </>
              )}
            </Link>
          );
        })}
      </div>

      {inDay.length === 0 && (
        <p style={{ marginTop: 12, color: "var(--muted)", fontSize: 13, textAlign: "center" }}>
          {t("noEventsThisDay", language)}
        </p>
      )}
    </div>
  );
}

function WeekView({
  events, children, dayLabels, weekStartMs, language, onPrev, onNext,
}: {
  events: Event[]; children: Child[]; dayLabels: string[];
  weekStartMs: number;
  language: (typeof AppLanguage)[keyof typeof AppLanguage];
  onPrev: () => void;
  onNext: () => void;
}) {
  const childById = new Map(children.map((c) => [c.childId, c]));
  const today = todayStart();
  const days = Array.from({ length: 7 }, (_, i) => weekStartMs + i * 86400000);
  const lastDay = days[6];
  const startD = new Date(weekStartMs);
  const endD = new Date(lastDay);
  const sameMonth = startD.getMonth() === endD.getMonth() && startD.getFullYear() === endD.getFullYear();
  const locale = localeFor(language);
  const rangeLabel = sameMonth
    ? `${startD.toLocaleDateString(locale, { month: "short", day: "numeric" })} – ${endD.getDate()}, ${endD.getFullYear()}`
    : `${startD.toLocaleDateString(locale, { month: "short", day: "numeric" })} – ${endD.toLocaleDateString(locale, { month: "short", day: "numeric", year: "numeric" })}`;

  return (
    <div>
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        marginBottom: 8,
      }}>
        <button type="button" aria-label="Previous week" onClick={onPrev} style={navBtn}>‹</button>
        <strong style={{ fontSize: 14 }}>{rangeLabel}</strong>
        <button type="button" aria-label="Next week" onClick={onNext} style={navBtn}>›</button>
      </div>
      {days.map((dayMs) => {
        const dayEvents = eventsForDay(events, dayMs);
        const d = new Date(dayMs);
        const label = `${dayLabels[d.getDay()]} ${d.getDate()}`;
        const isToday = dayMs === today;
        return (
          <div key={dayMs} style={{ marginBottom: 12 }}>
            <div style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              fontSize: 13, fontWeight: 600,
              color: isToday ? "var(--primary)" : "var(--muted)",
              marginBottom: 6, paddingBottom: 4,
              borderBottom: "1px solid var(--border)",
            }}>
              <span>{label}</span>
              <Link
                to={`/events/new?date=${isoDateLocal(dayMs)}`}
                style={{ fontSize: 18, color: "var(--primary)", textDecoration: "none", lineHeight: 1 }}
              >＋</Link>
            </div>
            {dayEvents.length === 0 ? (
              <div style={{ color: "var(--muted)", fontSize: 13, paddingLeft: 4 }}>—</div>
            ) : (
              dayEvents.map((e) => {
                const child = childById.get(e.childId) ?? null;
                const hex = ChildColorHex[child?.colorTag ?? ChildColor.BLUE];
                return (
                  <Link to={`/events/${e.eventId.split(":")[0]}`} key={e.eventId}>
                    <div style={{
                      display: "flex", alignItems: "center", gap: 8,
                      padding: "6px 8px", marginBottom: 4,
                      background: "var(--surface)", borderRadius: 8,
                      border: "1px solid var(--border)",
                      borderLeft: `4px solid ${hex}`, fontSize: 13,
                    }}>
                      {child && <ChildBadge name={child.name} color={child.colorTag} archived={child.isArchived} size="sm" />}
                      <span style={{ flex: 1, fontWeight: 500 }}>{e.title}</span>
                      <span style={{ color: "var(--muted)" }}>{fmtTime(e.startDateTime, language)}</span>
                      {e.needsRide && <span className="chip" style={{ fontSize: 11, padding: "2px 7px" }}>Ride</span>}
                    </div>
                  </Link>
                );
              })
            )}
          </div>
        );
      })}
    </div>
  );
}

function MonthView({
  events, children, dayLabels, monthMs, language, onPrev, onNext,
}: {
  events: Event[]; children: Child[]; dayLabels: string[];
  monthMs: number;
  language: (typeof AppLanguage)[keyof typeof AppLanguage];
  onPrev: () => void;
  onNext: () => void;
}) {
  const childById = new Map(children.map((c) => [c.childId, c]));
  const cursor = new Date(monthMs);
  const year = cursor.getFullYear();
  const month = cursor.getMonth();

  const firstOfMonth = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const startDow = firstOfMonth.getDay();

  const [selectedDay, setSelectedDay] = useState<number | null>(null);

  const today = todayStart();
  const locale = localeFor(language);
  const monthLabel = firstOfMonth.toLocaleDateString(locale, { month: "long", year: "numeric" });

  const cells: (number | null)[] = [
    ...Array(startDow).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => new Date(year, month, i + 1).getTime()),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  const selectedEvents = selectedDay !== null ? eventsForDay(events, selectedDay) : [];

  return (
    <div>
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        marginBottom: 8,
      }}>
        <button
          type="button"
          aria-label="Previous month"
          onClick={() => { setSelectedDay(null); onPrev(); }}
          style={navBtn}
        >‹</button>
        <strong style={{ fontSize: 15 }}>{monthLabel}</strong>
        <button
          type="button"
          aria-label="Next month"
          onClick={() => { setSelectedDay(null); onNext(); }}
          style={navBtn}
        >›</button>
      </div>
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(7, 1fr)",
        gap: 2,
        marginBottom: 16,
      }}>
        {dayLabels.map((d) => (
          <div key={d} style={{
            textAlign: "center",
            fontSize: 11,
            color: "var(--muted)",
            fontWeight: 600,
            padding: "4px 0",
          }}>
            {d}
          </div>
        ))}
        {cells.map((dayMs, idx) => {
          if (dayMs === null) {
            return <div key={`empty-${idx}`} />;
          }
          const dayEvents = eventsForDay(events, dayMs);
          const hasEvents = dayEvents.length > 0;
          const isToday = dayMs === today;
          const isSelected = selectedDay === dayMs;
          // One dot per event, in chronological order — no dedup, no cap.
          const dotColors = dayEvents.map((e) => {
            const c = childById.get(e.childId)?.colorTag ?? ChildColor.BLUE;
            return ChildColorHex[c];
          });
          return (
            <button
              key={dayMs}
              onClick={() => setSelectedDay(isSelected ? null : dayMs)}
              style={{
                display: "flex", flexDirection: "column", alignItems: "center",
                padding: "6px 2px 4px", borderRadius: 8,
                border: isSelected ? "2px solid var(--primary)" : "1px solid transparent",
                background: isToday ? "var(--primary-weak)" : isSelected ? "var(--primary-weak)" : "transparent",
                cursor: hasEvents ? "pointer" : "default", minWidth: 0,
              }}
            >
              <span style={{ fontSize: 13, fontWeight: isToday ? 700 : 400, color: isToday ? "var(--primary)" : "var(--fg)" }}>
                {new Date(dayMs).getDate()}
              </span>
              {hasEvents && (
                <div style={{
                  display: "flex", flexWrap: "wrap", justifyContent: "center",
                  gap: 2, marginTop: 2, maxWidth: "100%",
                }}>
                  {dotColors.map((hex, i) => (
                    <span key={i} style={{ width: 4, height: 4, borderRadius: "50%", background: hex, display: "block" }} />
                  ))}
                </div>
              )}
            </button>
          );
        })}
      </div>

      {selectedDay !== null && (
        <div>
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            fontSize: 13, fontWeight: 600, color: "var(--muted)", marginBottom: 8,
          }}>
            <span>{new Date(selectedDay).toLocaleDateString(locale, { weekday: "long", month: "long", day: "numeric" })}</span>
            <Link
              to={`/events/new?date=${isoDateLocal(selectedDay)}`}
              className="btn"
              style={{ fontSize: 13, padding: "4px 10px", minHeight: "auto" }}
            >+ Add</Link>
          </div>
          {selectedEvents.length === 0 ? (
            <div className="card empty" style={{ padding: "16px" }}>No events this day.</div>
          ) : (
            selectedEvents.map((e) => (
              <EventCard key={e.eventId} e={e} child={childById.get(e.childId) ?? null} language={language} />
            ))
          )}
        </div>
      )}
    </div>
  );
}

export function EventsScreen() {
  const { children, events, assignments, config } = useApp();
  const [viewMode, setViewMode] = useState<ViewMode>("day");
  const [dayOffset, setDayOffset] = useState(0);
  const [monthOffset, setMonthOffset] = useState(0);
  const [weekOffset, setWeekOffset] = useState(0);
  const dayLabels = getDayLabels(config.language);

  const today = new Date();
  const monthCursorMs = new Date(today.getFullYear(), today.getMonth() + monthOffset, 1).getTime();
  const weekStartMs = todayStart() + weekOffset * 7 * 86400000;
  const dayCursorMs = todayStart() + dayOffset * 86400000;

  const windowStart =
    viewMode === "day" ? dayCursorMs :
    viewMode === "month" ? monthCursorMs :
    weekStartMs;
  const windowEnd =
    viewMode === "day" ? endOfDay(dayCursorMs) :
    viewMode === "month" ? endOfMonth(monthCursorMs) :
    weekStartMs + 7 * 86400000;

  const expanded = events
    .flatMap((e) => expandRecurrence(e, windowStart, windowEnd))
    .sort((a, b) => a.startDateTime - b.startDateTime);

  const modes: { id: ViewMode; label: string }[] = [
    { id: "day", label: t("day", config.language) },
    { id: "week", label: t("week", config.language) },
    { id: "month", label: t("month", config.language) },
  ];

  return (
    <>
      <Header title="Events" />
      <div style={{
        display: "flex",
        background: "var(--surface)",
        borderBottom: "1px solid var(--border)",
        padding: "6px 12px",
        gap: 6,
      }}>
        {modes.map(({ id, label }) => (
          <button
            key={id}
            onClick={() => setViewMode(id)}
            style={{
              flex: 1,
              padding: "7px 0",
              borderRadius: 8,
              border: "none",
              background: viewMode === id ? "var(--primary)" : "var(--border)",
              color: viewMode === id ? "#fff" : "var(--fg)",
              fontWeight: viewMode === id ? 600 : 400,
              fontSize: 13,
              cursor: "pointer",
            }}
          >
            {label}
          </button>
        ))}
      </div>
      <main className="app-main">
        {viewMode === "day" && (
          <DayView
            key={dayOffset}
            events={expanded}
            assignments={assignments}
            children={children}
            dayMs={dayCursorMs}
            language={config.language}
            onPrev={() => setDayOffset((n) => n - 1)}
            onNext={() => setDayOffset((n) => n + 1)}
          />
        )}
        {viewMode === "week" && (
          <WeekView
            key={weekOffset}
            events={expanded}
            children={children}
            dayLabels={dayLabels}
            weekStartMs={weekStartMs}
            language={config.language}
            onPrev={() => setWeekOffset((n) => n - 1)}
            onNext={() => setWeekOffset((n) => n + 1)}
          />
        )}
        {viewMode === "month" && (
          <MonthView
            key={monthOffset}
            events={expanded}
            children={children}
            dayLabels={dayLabels}
            monthMs={monthCursorMs}
            language={config.language}
            onPrev={() => setMonthOffset((n) => n - 1)}
            onNext={() => setMonthOffset((n) => n + 1)}
          />
        )}
      </main>
      <Link to="/events/new" className="fab" aria-label="Add event">＋</Link>
    </>
  );
}

const navBtn: React.CSSProperties = {
  border: "1px solid var(--border)",
  background: "var(--surface)",
  color: "var(--fg)",
  borderRadius: 8,
  padding: "4px 12px",
  fontSize: 18,
  lineHeight: 1,
  minHeight: "auto",
  cursor: "pointer",
};
