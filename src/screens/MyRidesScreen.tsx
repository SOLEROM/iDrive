import { Header } from "@/components/Header";
import { AssignmentStatus, ChildColorHex } from "@/domain/enums";
import { RideStatusChip } from "@/components/RideStatusChip";
import { useApp } from "@/state/AppContext";
import { canTransition, allowedNext } from "@/domain/rideStateMachine";
import { fmtDateTime } from "@/lib/format";

export function MyRidesScreen() {
  const { parent, children, events, assignments, upsertAssignment } = useApp();
  const childColorMap = new Map(children.map((c) => [c.childId, ChildColorHex[c.colorTag]]));

  const mine = assignments.filter((a) => a.driverParentId === parent?.parentId);

  const setStatus = async (id: string, next: AssignmentStatus) => {
    const a = mine.find((x) => x.assignmentId === id);
    if (!a || !canTransition(a.assignmentStatus, next)) return;
    await upsertAssignment({
      ...a,
      assignmentStatus: next,
      completedAt: next === AssignmentStatus.COMPLETED ? Date.now() : a.completedAt,
    });
  };

  return (
    <>
      <Header title="My Rides" />
      <main className="app-main">
        {mine.length === 0 && <div className="card empty">You haven't claimed any rides yet.</div>}
        {mine.map((a) => {
          const evt = events.find((e) => e.eventId === a.eventId);
          const nexts = allowedNext(a.assignmentStatus);
          const hex = evt ? childColorMap.get(evt.childId) : undefined;
          return (
            <div className="card" key={a.assignmentId} style={hex ? { borderLeft: `4px solid ${hex}` } : undefined}>
              <div className="row row--between">
                <strong>{evt?.title ?? a.eventId}</strong>
                <RideStatusChip status={a.assignmentStatus} />
              </div>
              {evt && <p>{fmtDateTime(evt.startDateTime)}</p>}
              <p>Leg: <strong>{a.rideLeg}</strong></p>
              {nexts.length > 0 && (
                <div className="row" style={{ flexWrap: "wrap", gap: 6, marginTop: 8 }}>
                  {nexts.map((n) => (
                    <button key={n} className="btn btn--ghost"
                      style={{ padding: "6px 10px", minHeight: "auto", fontSize: 13 }}
                      onClick={() => setStatus(a.assignmentId, n)}>
                      → {n}
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </main>
    </>
  );
}
