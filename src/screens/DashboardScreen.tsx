import { Link, useNavigate } from "react-router-dom";
import { Header } from "@/components/Header";
import { useApp } from "@/state/AppContext";
import { fmtDateTime } from "@/lib/format";
import { ChildDot } from "@/components/ChildDot";
import { AssignmentStatus, ChildColor, ChildColorHex, EventStatus, RideDirection } from "@/domain/enums";
import { RideStatusChip } from "@/components/RideStatusChip";

export function DashboardScreen() {
  const navigate = useNavigate();
  const { parent, children, events, assignments, upsertEvent } = useApp();
  const childColorMap = new Map(children.map((c) => [c.childId, ChildColorHex[c.colorTag]]));

  const startOfToday = (() => { const d = new Date(); d.setHours(0,0,0,0); return d.getTime(); })();

  const upcoming = events
    .filter((e) => e.startDateTime >= startOfToday && e.status === EventStatus.ACTIVE)
    .sort((a, b) => a.startDateTime - b.startDateTime)
    .slice(0, 3);

  const markDone = async (e: React.MouseEvent, eventId: string) => {
    e.preventDefault();
    const evt = events.find((x) => x.eventId === eventId);
    if (!evt) return;
    await upsertEvent({ ...evt, status: EventStatus.ARCHIVED });
  };

  const myOpenRides = assignments.filter(
    (a) => a.driverParentId === parent?.parentId &&
      a.assignmentStatus !== AssignmentStatus.UNASSIGNED &&
      a.assignmentStatus !== AssignmentStatus.COMPLETED,
  );

  const weekEnd = (() => { const d = new Date(); d.setDate(d.getDate() + (7 - d.getDay())); d.setHours(23, 59, 59, 999); return d.getTime(); })();
  const monthEnd = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0, 23, 59, 59, 999).getTime();

  const countOpenLegs = (evts: typeof events) =>
    evts.reduce((count, e) => {
      const legCount = e.rideDirection === RideDirection.BOTH ? 2 : 1;
      const claimed = assignments.filter(
        (a) => a.eventId === e.eventId && a.assignmentStatus !== AssignmentStatus.UNASSIGNED,
      ).length;
      return count + Math.max(0, legCount - claimed);
    }, 0);

  const rideEvents = events.filter((e) => e.needsRide && e.startDateTime >= startOfToday);
  const weekOpenLegs = countOpenLegs(rideEvents.filter((e) => e.startDateTime <= weekEnd));
  const monthOpenLegs = countOpenLegs(rideEvents.filter((e) => e.startDateTime > weekEnd && e.startDateTime <= monthEnd));

  return (
    <>
      <Header title={`Hi, ${parent?.displayName ?? "there"}`} />
      <main className="app-main">
        <section>
          <h2 style={sH}>Upcoming events</h2>
          {upcoming.length === 0 && (
            <div className="card empty">No upcoming events. <Link to="/events">Add one →</Link></div>
          )}
          {upcoming.map((e) => {
            const child = children.find((c) => c.childId === e.childId);
            const hex = childColorMap.get(e.childId);
            return (
              <Link to={`/events/${e.eventId}`} key={e.eventId}>
                <div className="card" style={hex ? { borderLeft: `4px solid ${hex}` } : undefined}>
                  <div className="row row--between">
                    <div>
                      <div className="row">
                        <ChildDot color={child?.colorTag ?? ChildColor.BLUE} />
                        <strong>{e.title}</strong>
                      </div>
                      <p>{fmtDateTime(e.startDateTime)} · {e.locationName || e.eventType}</p>
                    </div>
                    <div className="row" style={{ gap: 8 }}>
                      {e.needsRide && <span className="chip">Ride</span>}
                      <button
                        className="btn btn--ghost"
                        style={{ padding: "4px 10px", minHeight: "auto", fontSize: 12 }}
                        onClick={(ev) => markDone(ev, e.eventId)}
                      >
                        Done
                      </button>
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}
        </section>

        <section>
          <h2 style={sH}>My rides</h2>
          {myOpenRides.length === 0 && <div className="card empty">Nothing on your plate.</div>}
          {myOpenRides.map((a) => {
            const evt = events.find((e) => e.eventId === a.eventId);
            const hex = evt ? childColorMap.get(evt.childId) : undefined;
            const hasNote = !!evt?.description;
            const preview = hasNote
              ? (evt!.description.length > 15 ? evt!.description.slice(0, 15) + "…" : evt!.description)
              : null;
            return (
              <div className="card" key={a.assignmentId}
                style={{ cursor: "pointer", ...(hex ? { borderLeft: `4px solid ${hex}` } : {}) }}
                onClick={() => evt && navigate(`/events/${evt.eventId}`)}>
                <div className="row row--between" style={{ alignItems: "flex-start" }}>
                  <div>
                    <strong>{evt?.title ?? a.eventId} · {a.rideLeg}</strong>
                    {evt && <p style={{ margin: "2px 0 0" }}>{fmtDateTime(evt.startDateTime)}</p>}
                  </div>
                  <div className="row" style={{ gap: 8, flexShrink: 0 }}>
                    {(hasNote || !evt) && (
                      <span style={{
                        background: "var(--surface)", border: "1px solid var(--border)",
                        borderRadius: 6, padding: "3px 7px", fontSize: 11,
                        color: "var(--fg)", maxWidth: 110, lineHeight: 1.3,
                      }} title={evt?.description}>
                        {preview}
                      </span>
                    )}
                    <RideStatusChip status={a.assignmentStatus} />
                  </div>
                </div>
              </div>
            );
          })}
        </section>

        <section>
          <h2 style={sH}>Week open ride requests</h2>
          {weekOpenLegs === 0 ? (
            <div className="card empty">All legs claimed this week.</div>
          ) : (
            <div className="card">
              <p>{weekOpenLegs} ride leg{weekOpenLegs === 1 ? "" : "s"} need volunteers this week.</p>
              <Link to="/rides" className="btn btn--ghost" style={{ display: "inline-block", marginTop: 8 }}>
                View board
              </Link>
            </div>
          )}
        </section>

        <section>
          <h2 style={sH}>Month open ride requests</h2>
          {monthOpenLegs === 0 ? (
            <div className="card empty">All legs claimed for the rest of the month.</div>
          ) : (
            <div className="card">
              <p>{monthOpenLegs} ride leg{monthOpenLegs === 1 ? "" : "s"} need volunteers later this month.</p>
              <Link to="/rides" className="btn btn--ghost" style={{ display: "inline-block", marginTop: 8 }}>
                View board
              </Link>
            </div>
          )}
        </section>

      </main>
    </>
  );
}

const sH: React.CSSProperties = {
  margin: "20px 4px 8px", fontSize: 13,
  textTransform: "uppercase", letterSpacing: 0.5, color: "var(--muted)",
};
