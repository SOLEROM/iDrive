import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Header } from "@/components/Header";
import { AssignmentStatus, ChildColorHex, RideDirection, RideLeg } from "@/domain/enums";
import { useApp } from "@/state/AppContext";
import { newAssignment } from "@/domain/models";
import { fmtDateTime } from "@/lib/format";

export function RidesBoardScreen() {
  const navigate = useNavigate();
  const { parent, children, events, assignments, upsertAssignment, upsertEvent } = useApp();
  const [filterChildId, setFilterChildId] = useState<string>("");
  const [filterMine, setFilterMine] = useState(false);
  const [noteOpenId, setNoteOpenId] = useState<string | null>(null);
  const [noteDraft, setNoteDraft] = useState("");

  const myEventIds = new Set(
    assignments
      .filter((a) => a.driverParentId === parent?.parentId && a.assignmentStatus !== AssignmentStatus.UNASSIGNED)
      .map((a) => a.eventId),
  );

  const rideEvents = events.filter((e) =>
    e.needsRide &&
    (!filterChildId || e.childId === filterChildId) &&
    (!filterMine || myEventIds.has(e.eventId)),
  );

  // Returns the active (non-unassigned) assignment for a leg, if any.
  const activeAssignment = (eventId: string, leg: RideLeg) =>
    assignments.find(
      (a) => a.eventId === eventId && a.rideLeg === leg &&
        a.assignmentStatus !== AssignmentStatus.UNASSIGNED,
    ) ?? null;

  const toggleClaim = async (eventId: string, leg: RideLeg) => {
    if (!parent) return;
    const existing = activeAssignment(eventId, leg);
    if (existing && existing.driverParentId === parent.parentId) {
      // I'm the current assignee → unassign
      await upsertAssignment({ ...existing, assignmentStatus: AssignmentStatus.UNASSIGNED, claimedAt: null });
    } else {
      // Unassigned or someone else → claim (override)
      await upsertAssignment(newAssignment({
        assignmentId: existing?.assignmentId ?? `a-${Math.random().toString(36).slice(2, 10)}`,
        eventId,
        driverParentId: parent.parentId,
        driverName: parent.displayName,
        rideLeg: leg,
        assignmentStatus: AssignmentStatus.VOLUNTEERED,
        claimedAt: Date.now(),
      }));
    }
  };

  const filteredChild = filterChildId ? children.find((c) => c.childId === filterChildId) : null;
  const bgHex = filterMine ? "#ef4444" : ((!filterMine && filteredChild) ? ChildColorHex[filteredChild.colorTag] : null);

  const btnBase: React.CSSProperties = {
    padding: "5px 12px", minHeight: "auto", fontSize: 13, whiteSpace: "nowrap",
    borderRadius: 8, cursor: "pointer", boxSizing: "border-box",
  };

  return (
    <>
      <Header title="Rides Board" />
      <div style={{ display: "flex", gap: 8, padding: "8px 12px", background: "var(--surface)", borderBottom: "1px solid var(--border)", overflowX: "auto" }}>
        <button
          style={{ ...btnBase, border: "2px solid var(--border)", background: (!filterChildId && !filterMine) ? "var(--primary)" : "transparent", color: (!filterChildId && !filterMine) ? "#fff" : "var(--fg)", fontWeight: (!filterChildId && !filterMine) ? 600 : 400 }}
          onClick={() => { setFilterChildId(""); setFilterMine(false); }}
        >All</button>
        <button
          style={{ ...btnBase, border: "2px solid #ef4444", background: filterMine ? "#ef4444" : "transparent", color: filterMine ? "#fff" : "#ef4444", fontWeight: filterMine ? 600 : 400 }}
          onClick={() => { setFilterMine((v) => !v); setFilterChildId(""); }}
        >My</button>
        {children.map((c) => {
          const hex = ChildColorHex[c.colorTag];
          const isActive = !filterMine && filterChildId === c.childId;
          return (
            <button
              key={c.childId}
              style={{ ...btnBase, border: `2px solid ${hex}`, background: isActive ? hex : "transparent", color: isActive ? "#fff" : hex, fontWeight: isActive ? 600 : 400 }}
              onClick={() => { setFilterChildId(c.childId); setFilterMine(false); }}
            >{c.name}</button>
          );
        })}
      </div>
      <main className="app-main" style={bgHex ? { background: `${bgHex}18` } : undefined}>
        {rideEvents.length === 0 && <div className="card empty">No rides to coordinate yet.</div>}
        {rideEvents.map((e) => {
          const legs: RideLeg[] = e.rideDirection === RideDirection.BOTH
            ? [RideLeg.TO, RideLeg.FROM]
            : [e.rideDirection as unknown as RideLeg];
          const child = children.find((c) => c.childId === e.childId);
          const hex = child ? ChildColorHex[child.colorTag] : undefined;
          const noteOpen = noteOpenId === e.eventId;
          const hasNote = !!e.description;
          const preview = hasNote
            ? (e.description!.length > 15 ? e.description!.slice(0, 15) + "…" : e.description!)
            : null;
          const toggleNote = (ev: React.MouseEvent) => {
            ev.stopPropagation();
            if (noteOpen) { setNoteOpenId(null); }
            else { setNoteOpenId(e.eventId); setNoteDraft(e.description ?? ""); }
          };
          const saveNote = async (ev: React.MouseEvent) => {
            ev.stopPropagation();
            await upsertEvent({ ...e, description: noteDraft });
            setNoteOpenId(null);
          };
          return (
            <div className="card" key={e.eventId} style={{ cursor: "pointer", ...(hex ? { borderLeft: `4px solid ${hex}` } : {}) }}
              onClick={() => navigate(`/events/${e.eventId}`)}>
              <div className="row row--between" style={{ alignItems: "flex-start" }}>
                <div>
                  <strong>{e.title}</strong>
                  <p style={{ margin: "2px 0 0" }}>{fmtDateTime(e.startDateTime)}</p>
                </div>
                <button
                  onClick={toggleNote}
                  style={{
                    background: hasNote ? "var(--surface)" : "transparent",
                    border: hasNote ? "1px solid var(--border)" : "1px dashed var(--border)",
                    borderRadius: 6,
                    cursor: "pointer",
                    padding: "3px 7px",
                    fontSize: 11,
                    color: hasNote ? "var(--fg)" : "var(--muted)",
                    maxWidth: 120,
                    textAlign: "left",
                    lineHeight: 1.3,
                    flexShrink: 0,
                    marginLeft: 8,
                  }}
                  title={hasNote ? e.description : "Add note"}
                >
                  {preview ?? "+ note"}
                </button>
              </div>
              {noteOpen && (
                <div style={{ marginTop: 8, borderTop: "1px solid var(--border)", paddingTop: 8 }}
                  onClick={(ev) => ev.stopPropagation()}>
                  <textarea
                    className="textarea"
                    rows={3}
                    value={noteDraft}
                    onChange={(ev) => setNoteDraft(ev.target.value)}
                    placeholder="Notes for this ride…"
                    style={{ marginBottom: 6 }}
                    autoFocus
                  />
                  <div className="row" style={{ gap: 8 }}>
                    <button className="btn" style={{ flex: 1, padding: "6px", minHeight: "auto", fontSize: 13 }}
                      onClick={saveNote}>Save</button>
                    <button className="btn btn--ghost" style={{ padding: "6px 10px", minHeight: "auto", fontSize: 13 }}
                      onClick={(ev) => { ev.stopPropagation(); setNoteOpenId(null); }}>Cancel</button>
                  </div>
                </div>
              )}
              {legs.map((leg) => {
                const a = activeAssignment(e.eventId, leg);
                const isMine = a?.driverParentId === parent?.parentId;
                return (
                  <div className="row row--between" key={leg}
                    style={{ padding: "8px 0", borderTop: "1px solid var(--border)" }}>
                    <div>
                      <span>Leg: <strong>{leg}</strong></span>
                      {a && (
                        <span style={{ marginLeft: 10, fontSize: 15, fontWeight: 700, color: isMine ? "var(--primary)" : "#ef4444" }}>
                          {isMine ? "you" : (a.driverName || a.driverParentId)}
                        </span>
                      )}
                    </div>
                    <button
                      className={isMine ? "btn btn--ghost" : (a ? "btn btn--ghost" : "btn")}
                      style={{ padding: "6px 12px", minHeight: "auto" }}
                      onClick={(ev) => { ev.stopPropagation(); toggleClaim(e.eventId, leg); }}
                    >
                      {isMine ? "Unaccept" : "Accept"}
                    </button>
                  </div>
                );
              })}
            </div>
          );
        })}
      </main>
      <Link to="/events/new" className="fab" aria-label="Add ride event">＋</Link>
    </>
  );
}
