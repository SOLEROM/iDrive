import { Header } from "@/components/Header";
import { AssignmentStatus, ChildColorHex, isExternalDriver } from "@/domain/enums";
import { RideStatusChip } from "@/components/RideStatusChip";
import { ChildBadge } from "@/components/ChildBadge";
import { useApp } from "@/state/AppContext";
import { canTransition, allowedNext } from "@/domain/rideStateMachine";
import { todayStart, endOfDay } from "@/domain/timeWindow";
import { fmtDateTime } from "@/lib/format";
import { t } from "@/lib/i18n";

export function MyRidesScreen() {
  const { parent, parents, children, events, assignments, upsertAssignment, config } = useApp();
  const childColorMap = new Map(children.map((c) => [c.childId, ChildColorHex[c.colorTag]]));
  const childById = new Map(children.map((c) => [c.childId, c]));

  const endOfToday = endOfDay(todayStart());

  // My rides include:
  //   - rides I drive or claimed
  //   - rides assigned to a non-member ("external") driver — every member
  //     should see those, tinted red, so the family can verify out-of-group
  //     coverage.
  const mine = assignments.filter((a) => {
    const isMine = a.driverParentId === parent?.parentId || a.claimedByParentId === parent?.parentId;
    const external = isExternalDriver(a.driverParentId);
    if (!isMine && !external) return false;
    if (config.showCompletedRidesByDefault) return true;
    return a.assignmentStatus !== AssignmentStatus.CANCELLED;
  });

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
          const isFuture = !!evt && evt.startDateTime > endOfToday;
          const nexts = allowedNext(a.assignmentStatus)
            .filter((n) => !(n === AssignmentStatus.COMPLETED && isFuture));
          const hex = evt ? childColorMap.get(evt.childId) : undefined;
          const child = evt ? childById.get(evt.childId) ?? null : null;
          const external = isExternalDriver(a.driverParentId);
          const claimer = a.claimedByParentId && a.claimedByParentId !== a.driverParentId
            ? parents.find((p) => p.parentId === a.claimedByParentId)
            : null;
          const cardStyle: React.CSSProperties = {
            ...(hex ? { borderLeft: `4px solid ${hex}` } : {}),
            ...(external ? { background: "#ef444422", borderColor: "#ef4444" } : {}),
          };
          return (
            <div className="card" key={a.assignmentId} style={cardStyle}>
              <div className="row row--between" style={{ alignItems: "flex-start" }}>
                <div className="row" style={{ gap: 6, flexWrap: "wrap" }}>
                  {child && <ChildBadge name={child.name} color={child.colorTag} archived={child.isArchived} />}
                  <strong>{evt?.title ?? a.eventId}</strong>
                </div>
                <div className="row" style={{ gap: 6, alignItems: "center" }}>
                  {external && (
                    <span className="chip" style={{ background: "#ef4444", color: "#fff" }}>
                      {t("externalDriver", config.language)}
                    </span>
                  )}
                  <RideStatusChip status={a.assignmentStatus} />
                </div>
              </div>
              {evt && <p>{fmtDateTime(evt.startDateTime, config.language)}</p>}
              <p>
                Leg: <strong>{a.rideLeg}</strong>
                {external && (
                  <>
                    {" · "}
                    <span style={{ color: "#ef4444", fontWeight: 600 }}>
                      {a.driverName || "?"}
                    </span>
                  </>
                )}
              </p>
              {claimer && (
                <p style={{ fontSize: 12, color: "var(--muted)" }}>
                  Assigned by {claimer.displayName}
                </p>
              )}
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
