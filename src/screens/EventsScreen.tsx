import { useState } from "react";
import { Link } from "react-router-dom";
import { Header } from "@/components/Header";
import { useApp } from "@/state/AppContext";
import { ChildColor, ChildColorHex } from "@/domain/enums";
import { fmtDateTime, fmtTime } from "@/lib/format";
import { expandRecurrence } from "@/domain/recurrence";
import { getDayLabels } from "@/lib/i18n";
import type { Event } from "@/domain/models";

type ViewMode = "week" | "month";

function startOfDay(ms: number): number {
  const d = new Date(ms);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

function sameDay(a: number, b: number): boolean {
  return startOfDay(a) === startOfDay(b);
}

function eventsForDay(events: Event[], dayMs: number): Event[] {
  return events.filter((e) => sameDay(e.startDateTime, dayMs));
}

function EventCard({ e, childColor }: { e: Event; childColor: ChildColor }) {
  const hex = ChildColorHex[childColor];
  return (
    <Link to={`/events/${e.eventId.split(":")[0]}`} key={e.eventId}>
      <div className="card" style={{ borderLeft: `4px solid ${hex}` }}>
        <div className="row row--between">
          <div>
            <strong>{e.title}</strong>
            <p>{fmtDateTime(e.startDateTime)}</p>
            {e.locationName && <p>{e.locationName}</p>}
          </div>
          {e.needsRide && <span className="chip">Ride</span>}
        </div>
      </div>
    </Link>
  );
}


function WeekView({ events, childColorMap, dayLabels }: { events: Event[]; childColorMap: Map<string, ChildColor>; dayLabels: string[] }) {
  const today = startOfDay(Date.now());
  const days = Array.from({ length: 7 }, (_, i) => today + i * 86400000);

  return (
    <div>
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
                to={`/events/new?date=${new Date(dayMs).toISOString().slice(0, 10)}`}
                style={{ fontSize: 18, color: "var(--primary)", textDecoration: "none", lineHeight: 1 }}
              >＋</Link>
            </div>
            {dayEvents.length === 0 ? (
              <div style={{ color: "var(--muted)", fontSize: 13, paddingLeft: 4 }}>—</div>
            ) : (
              dayEvents.map((e) => {
                const color = childColorMap.get(e.childId) ?? ChildColor.BLUE;
                const hex = ChildColorHex[color];
                return (
                  <Link to={`/events/${e.eventId.split(":")[0]}`} key={e.eventId}>
                    <div style={{
                      display: "flex", alignItems: "center", gap: 8,
                      padding: "6px 8px", marginBottom: 4,
                      background: "var(--surface)", borderRadius: 8,
                      border: "1px solid var(--border)",
                      borderLeft: `4px solid ${hex}`, fontSize: 13,
                    }}>
                      <span style={{ flex: 1, fontWeight: 500 }}>{e.title}</span>
                      <span style={{ color: "var(--muted)" }}>{fmtTime(e.startDateTime)}</span>
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

function MonthView({ events, childColorMap, dayLabels }: { events: Event[]; childColorMap: Map<string, ChildColor>; dayLabels: string[] }) {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();

  const firstOfMonth = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const startDow = firstOfMonth.getDay();

  const [selectedDay, setSelectedDay] = useState<number | null>(null);

  const todayStart = startOfDay(Date.now());

  const cells: (number | null)[] = [
    ...Array(startDow).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => new Date(year, month, i + 1).getTime()),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  const selectedEvents = selectedDay !== null ? eventsForDay(events, selectedDay) : [];

  return (
    <div>
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
          const isToday = dayMs === todayStart;
          const isSelected = selectedDay === dayMs;
          // up to 3 unique child colors for the dot row
          const dotColors = [...new Set(dayEvents.map((e) => {
            const c = childColorMap.get(e.childId) ?? ChildColor.BLUE;
            return ChildColorHex[c];
          }))].slice(0, 3);
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
                <div style={{ display: "flex", gap: 2, marginTop: 2 }}>
                  {dotColors.map((hex) => (
                    <span key={hex} style={{ width: 5, height: 5, borderRadius: "50%", background: hex, display: "block" }} />
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
            <span>{new Date(selectedDay).toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}</span>
            <Link
              to={`/events/new?date=${new Date(selectedDay).toISOString().slice(0, 10)}`}
              className="btn"
              style={{ fontSize: 13, padding: "4px 10px", minHeight: "auto" }}
            >+ Add</Link>
          </div>
          {selectedEvents.length === 0 ? (
            <div className="card empty" style={{ padding: "16px" }}>No events this day.</div>
          ) : (
            selectedEvents.map((e) => (
              <EventCard key={e.eventId} e={e} childColor={childColorMap.get(e.childId) ?? ChildColor.BLUE} />
            ))
          )}
        </div>
      )}
    </div>
  );
}

export function EventsScreen() {
  const { children, events, config } = useApp();
  const [viewMode, setViewMode] = useState<ViewMode>("week");
  const dayLabels = getDayLabels(config.language);

  const windowStart = startOfDay(Date.now());
  const windowEnd = viewMode === "month"
    ? new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0, 23, 59, 59, 999).getTime()
    : windowStart + 7 * 86400000;

  const expanded = events
    .flatMap((e) => expandRecurrence(e, windowStart, windowEnd))
    .sort((a, b) => a.startDateTime - b.startDateTime);

  const childColorMap = new Map(children.map((c) => [c.childId, c.colorTag]));

  const modes: { id: ViewMode; label: string }[] = [
    { id: "week", label: "Week" },
    { id: "month", label: "Month" },
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
        {viewMode === "week" && <WeekView events={expanded} childColorMap={childColorMap} dayLabels={dayLabels} />}
        {viewMode === "month" && <MonthView events={expanded} childColorMap={childColorMap} dayLabels={dayLabels} />}
      </main>
      <Link to="/events/new" className="fab" aria-label="Add event">＋</Link>
    </>
  );
}
