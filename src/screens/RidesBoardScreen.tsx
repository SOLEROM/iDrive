import { Header } from "@/components/Header";
import { useLiveQuery } from "@/lib/useLiveQuery";
import { assignmentsRepo, eventsRepo } from "@/storage/repository";
import { AssignmentStatus, RideDirection, RideLeg } from "@/domain/enums";
import { RideStatusChip } from "@/components/RideStatusChip";
import { useApp } from "@/state/AppContext";
import { newAssignment } from "@/domain/models";
import { fmtDateTime } from "@/lib/format";
import { canTransition } from "@/domain/rideStateMachine";

export function RidesBoardScreen() {
  const { parent } = useApp();
  const events = useLiveQuery(() => eventsRepo.observeAll(), []);
  const assignments = useLiveQuery(() => assignmentsRepo.observeAll(), []);

  const rideEvents = events.filter((e) => e.needsRide);

  const claim = async (eventId: string, leg: RideLeg) => {
    if (!parent) return;
    const existing = assignments.find((a) => a.eventId === eventId && a.rideLeg === leg);
    if (existing && !canTransition(existing.assignmentStatus, AssignmentStatus.VOLUNTEERED)) return;
    await assignmentsRepo.upsert(newAssignment({
      assignmentId: existing?.assignmentId ?? `a-${Math.random().toString(36).slice(2, 10)}`,
      eventId,
      driverParentId: parent.parentId,
      rideLeg: leg,
      assignmentStatus: AssignmentStatus.VOLUNTEERED,
      claimedAt: Date.now(),
    }));
  };

  return (
    <>
      <Header title="Rides Board" />
      <main className="app-main">
        {rideEvents.length === 0 && (
          <div className="card empty">No rides to coordinate yet.</div>
        )}
        {rideEvents.map((e) => {
          const legs: RideLeg[] = e.rideDirection === RideDirection.BOTH
            ? [RideLeg.TO, RideLeg.FROM]
            : [e.rideDirection as unknown as RideLeg];
          return (
            <div className="card" key={e.eventId}>
              <strong>{e.title}</strong>
              <p>{fmtDateTime(e.startDateTime)}</p>
              {legs.map((leg) => {
                const a = assignments.find((x) => x.eventId === e.eventId && x.rideLeg === leg);
                return (
                  <div className="row row--between" key={leg} style={{ padding: "8px 0", borderTop: "1px solid var(--border)" }}>
                    <span>Leg: <strong>{leg}</strong></span>
                    {a ? (
                      <RideStatusChip status={a.assignmentStatus} />
                    ) : (
                      <button className="btn" style={{ padding: "6px 12px", minHeight: "auto" }}
                        onClick={() => claim(e.eventId, leg)}>
                        Volunteer
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          );
        })}
      </main>
    </>
  );
}
