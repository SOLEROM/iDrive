import { Link } from "react-router-dom";
import { Header } from "@/components/Header";
import { SyncBanner } from "@/components/SyncBanner";
import { useLiveQuery } from "@/lib/useLiveQuery";
import { childrenRepo, eventsRepo, assignmentsRepo } from "@/storage/repository";
import { useApp } from "@/state/AppContext";
import { fmtDateTime } from "@/lib/format";
import { ChildDot } from "@/components/ChildDot";
import { AssignmentStatus, ChildColor } from "@/domain/enums";
import { RideStatusChip } from "@/components/RideStatusChip";

export function DashboardScreen() {
  const { parent, sync } = useApp();
  const children = useLiveQuery(() => childrenRepo.observeAll(), []);
  const events = useLiveQuery(() => eventsRepo.observeAll(), []);
  const assignments = useLiveQuery(() => assignmentsRepo.observeAll(), []);

  const upcoming = events
    .filter((e) => e.startDateTime >= Date.now())
    .slice(0, 3);
  const myOpenRides = assignments.filter(
    (a) => a.driverParentId === parent?.parentId &&
      a.assignmentStatus !== AssignmentStatus.COMPLETED,
  );
  const unassigned = assignments.filter(
    (a) => a.assignmentStatus === AssignmentStatus.UNASSIGNED,
  );

  return (
    <>
      <Header title={`Hi, ${parent?.displayName ?? "there"}`}
        action={{ label: "Sync", onClick: () => sync.runOnce() }} />
      <main className="app-main">
        <SyncBanner />

        <section>
          <h2 style={sectionH}>Upcoming events</h2>
          {upcoming.length === 0 && (
            <div className="card empty">No upcoming events. <Link to="/events">Add one →</Link></div>
          )}
          {upcoming.map((e) => {
            const child = children.find((c) => c.childId === e.childId);
            return (
              <Link to={`/events/${e.eventId}`} key={e.eventId}>
                <div className="card">
                  <div className="row row--between">
                    <div>
                      <div className="row">
                        <ChildDot color={child?.colorTag ?? ChildColor.BLUE} />
                        <strong>{e.title}</strong>
                      </div>
                      <p>{fmtDateTime(e.startDateTime)} · {e.locationName || e.eventType}</p>
                    </div>
                    {e.needsRide && <span className="chip">Ride</span>}
                  </div>
                </div>
              </Link>
            );
          })}
        </section>

        <section>
          <h2 style={sectionH}>My rides</h2>
          {myOpenRides.length === 0 && (
            <div className="card empty">Nothing on your plate.</div>
          )}
          {myOpenRides.map((a) => (
            <div className="card" key={a.assignmentId}>
              <div className="row row--between">
                <strong>{a.rideLeg} · event {a.eventId.slice(0, 8)}</strong>
                <RideStatusChip status={a.assignmentStatus} />
              </div>
            </div>
          ))}
        </section>

        <section>
          <h2 style={sectionH}>Open ride requests</h2>
          {unassigned.length === 0 ? (
            <div className="card empty">All legs claimed.</div>
          ) : (
            <div className="card">
              <p>
                {unassigned.length} ride leg{unassigned.length === 1 ? "" : "s"} need volunteers.
              </p>
              <Link to="/rides" className="btn btn--ghost" style={{ display: "inline-block", marginTop: 8 }}>
                View board
              </Link>
            </div>
          )}
        </section>

        <section>
          <h2 style={sectionH}>My children</h2>
          {children.length === 0 ? (
            <div className="card empty">
              <Link to="/children">Add your first child →</Link>
            </div>
          ) : (
            <div className="card">
              {children.map((c) => (
                <div className="row" key={c.childId} style={{ padding: "6px 0" }}>
                  <ChildDot color={c.colorTag} />
                  <span>{c.name}</span>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
    </>
  );
}

const sectionH: React.CSSProperties = {
  margin: "20px 4px 8px",
  fontSize: 13,
  textTransform: "uppercase",
  letterSpacing: 0.5,
  color: "var(--muted)",
};
