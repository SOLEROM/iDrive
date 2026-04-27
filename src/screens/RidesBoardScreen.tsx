import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Header } from "@/components/Header";
import { ChildBadge } from "@/components/ChildBadge";
import { MemberPicker } from "@/components/MemberPicker";
import { RideStatusChip } from "@/components/RideStatusChip";
import {
  AssignmentStatus, ChildColor, ChildColorHex, EXTERNAL_DRIVER_ID,
  RideDirection, RideLeg, isExternalDriver,
} from "@/domain/enums";
import { useApp } from "@/state/AppContext";
import { newAssignment } from "@/domain/models";
import { newAssignmentId } from "@/domain/ids";
import { todayStart, endOfDay } from "@/domain/timeWindow";
import { fmtDateTime } from "@/lib/format";
import { t } from "@/lib/i18n";

export function RidesBoardScreen() {
  const navigate = useNavigate();
  const {
    parent, parents, children, events, assignments, config,
    upsertAssignment, upsertEvent,
  } = useApp();
  const [filterChildId, setFilterChildId] = useState<string>("");
  const [filterMine, setFilterMine] = useState(false);
  const [noteOpenId, setNoteOpenId] = useState<string | null>(null);
  const [noteDraft, setNoteDraft] = useState("");
  const [pickerOpenKey, setPickerOpenKey] = useState<string | null>(null);
  const [override, setOverride] = useState<{
    eventId: string; leg: RideLeg; existing: ReturnType<typeof activeAssignmentLookup>; newDriverId: string; newDriverName: string;
  } | null>(null);
  const [otherPrompt, setOtherPrompt] = useState<{ eventId: string; leg: RideLeg } | null>(null);
  const [otherDraft, setOtherDraft] = useState("");

  function activeAssignmentLookup(eventId: string, leg: RideLeg) {
    return assignments.find(
      (a) => a.eventId === eventId && a.rideLeg === leg &&
        a.assignmentStatus !== AssignmentStatus.UNASSIGNED &&
        a.assignmentStatus !== AssignmentStatus.CANCELLED,
    ) ?? null;
  }

  async function undoComplete(eventId: string, leg: RideLeg) {
    const existing = activeAssignmentLookup(eventId, leg);
    if (!existing) return;
    await upsertAssignment({
      ...existing,
      assignmentStatus: AssignmentStatus.VOLUNTEERED,
      completedAt: null,
    });
  }

  const myEventIds = new Set(
    assignments
      .filter((a) =>
        (a.driverParentId === parent?.parentId || a.claimedByParentId === parent?.parentId) &&
        a.assignmentStatus !== AssignmentStatus.UNASSIGNED &&
        a.assignmentStatus !== AssignmentStatus.CANCELLED)
      .map((a) => a.eventId),
  );

  const startOfToday = todayStart();
  const endOfToday = endOfDay(startOfToday);
  const rideEvents = events
    .filter((e) =>
      e.needsRide &&
      e.startDateTime >= startOfToday &&
      (!filterChildId || e.childId === filterChildId) &&
      (!filterMine || myEventIds.has(e.eventId)),
    )
    .sort((a, b) => a.startDateTime - b.startDateTime);

  const filteredChild = filterChildId ? children.find((c) => c.childId === filterChildId) : null;
  const bgHex = filterMine ? "#ef4444" : ((!filterMine && filteredChild) ? ChildColorHex[filteredChild.colorTag] : null);

  async function performClaim(
    eventId: string, leg: RideLeg, driverId: string, driverName: string, existingId?: string,
  ) {
    if (!parent) return;
    await upsertAssignment(newAssignment({
      assignmentId: existingId ?? newAssignmentId(),
      eventId,
      driverParentId: driverId,
      driverName,
      claimedByParentId: parent.parentId,
      rideLeg: leg,
      assignmentStatus: AssignmentStatus.VOLUNTEERED,
      claimedAt: Date.now(),
    }));
  }

  async function release(eventId: string, leg: RideLeg) {
    const existing = activeAssignmentLookup(eventId, leg);
    if (!existing) return;
    await upsertAssignment({
      ...existing,
      driverParentId: "",
      driverName: "",
      claimedByParentId: "",
      assignmentStatus: AssignmentStatus.UNASSIGNED,
      claimedAt: null,
    });
  }

  async function complete(eventId: string, leg: RideLeg) {
    const existing = activeAssignmentLookup(eventId, leg);
    if (!existing) return;
    await upsertAssignment({
      ...existing,
      assignmentStatus: AssignmentStatus.COMPLETED,
      completedAt: Date.now(),
    });
  }

  function tryAccept(eventId: string, leg: RideLeg, driverId: string, driverName: string) {
    if (!parent) return;
    const existing = activeAssignmentLookup(eventId, leg);
    if (existing && existing.driverParentId !== driverId) {
      setOverride({ eventId, leg, existing, newDriverId: driverId, newDriverName: driverName });
      return;
    }
    void performClaim(eventId, leg, driverId, driverName, existing?.assignmentId);
  }

  async function confirmOverride() {
    if (!override) return;
    const { eventId, leg, existing, newDriverId, newDriverName } = override;
    if (existing) {
      await upsertAssignment({
        ...existing,
        assignmentStatus: AssignmentStatus.CANCELLED,
      });
    }
    await performClaim(eventId, leg, newDriverId, newDriverName);
    setOverride(null);
  }

  return (
    <>
      <Header title="Rides Board" />
      <div style={{ display: "flex", gap: 8, padding: "8px 12px", background: "var(--surface)", borderBottom: "1px solid var(--border)", overflowX: "auto" }}>
        <button
          style={chipBtn(!filterChildId && !filterMine, "var(--border)", "var(--primary)")}
          onClick={() => { setFilterChildId(""); setFilterMine(false); }}
        >All</button>
        <button
          style={chipBtn(filterMine, "#ef4444", "#ef4444")}
          onClick={() => { setFilterMine((v) => !v); setFilterChildId(""); }}
        >My</button>
        {children.map((c) => {
          const hex = ChildColorHex[c.colorTag];
          const isActive = !filterMine && filterChildId === c.childId;
          return (
            <button
              key={c.childId}
              style={chipBtn(isActive, hex, hex)}
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
            <div className="card" key={e.eventId}
              style={{ cursor: "pointer", ...(hex ? { borderLeft: `4px solid ${hex}` } : {}) }}
              onClick={() => navigate(`/events/${e.eventId}`)}>
              <div className="row row--between" style={{ alignItems: "flex-start" }}>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div className="row" style={{ gap: 6, flexWrap: "wrap" }}>
                    {child
                      ? <ChildBadge name={child.name} color={child.colorTag} archived={child.isArchived} />
                      : <ChildBadge name="" color={ChildColor.BLUE} />}
                    <strong>{e.title}</strong>
                  </div>
                  <p style={{ margin: "2px 0 0" }}>{fmtDateTime(e.startDateTime, config.language)}</p>
                </div>
                <button
                  onClick={toggleNote}
                  style={noteBtnStyle(hasNote)}
                  title={hasNote ? e.description : "Add note"}
                >
                  {preview ?? "+ note"}
                </button>
              </div>
              {noteOpen && (
                <div style={{ marginTop: 8, borderTop: "1px solid var(--border)", paddingTop: 8 }}
                  onClick={(ev) => ev.stopPropagation()}>
                  <textarea
                    className="textarea" rows={3} value={noteDraft}
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
                const a = activeAssignmentLookup(e.eventId, leg);
                const isMine = a?.driverParentId === parent?.parentId;
                const pickerKey = `${e.eventId}|${leg}`;
                const pickerOpen = pickerOpenKey === pickerKey;
                const external = !!a && isExternalDriver(a.driverParentId);
                return (
                  <div key={leg} style={{
                    borderTop: "1px solid var(--border)", padding: "8px 0",
                    ...(external ? { background: "#ef444422" } : {}),
                  }}
                    onClick={(ev) => ev.stopPropagation()}>
                    <div className="row row--between" style={{ alignItems: "center", flexWrap: "wrap", gap: 8 }}>
                      <div className="row" style={{ gap: 8, alignItems: "center" }}>
                        <span>Leg: <strong>{leg}</strong></span>
                        {a && <RideStatusChip status={a.assignmentStatus} />}
                        {external && (
                          <span className="chip" style={{ background: "#ef4444", color: "#fff" }}>
                            {t("externalDriver", config.language)}
                          </span>
                        )}
                        {a && (
                          <span style={{
                            fontSize: 14, fontWeight: 600,
                            color: external ? "#ef4444" : isMine ? "var(--primary)" : "var(--fg)",
                          }}>
                            {isMine ? "you" : (a.driverName || a.driverParentId)}
                          </span>
                        )}
                      </div>
                      <div className="row" style={{ gap: 4, position: "relative" }}>
                        {!a && (
                          <>
                            <button className="btn" style={legBtn}
                              onClick={() => parent && tryAccept(e.eventId, leg, parent.parentId, parent.displayName)}>
                              Accept
                            </button>
                            <button className="btn btn--ghost" style={{ ...legBtn, padding: "6px 8px" }}
                              aria-label="Assign to…"
                              onClick={() => setPickerOpenKey(pickerOpen ? null : pickerKey)}>▾</button>
                          </>
                        )}
                        {a && (a.assignmentStatus === AssignmentStatus.VOLUNTEERED ||
                               a.assignmentStatus === AssignmentStatus.CONFIRMED) && (
                          <>
                            {e.startDateTime <= endOfToday && (
                              <button className="btn" style={legBtn}
                                onClick={() => complete(e.eventId, leg)}>Done</button>
                            )}
                            <button className="btn btn--ghost" style={legBtn}
                              onClick={() => release(e.eventId, leg)}>Release</button>
                          </>
                        )}
                        {a && a.assignmentStatus === AssignmentStatus.COMPLETED && (
                          <button className="btn btn--ghost" style={legBtn}
                            onClick={() => undoComplete(e.eventId, leg)}>Undo done</button>
                        )}
                        {pickerOpen && parent && (
                          <MemberPicker
                            parents={parents}
                            meId={parent.parentId}
                            otherLabel={t("otherDots", config.language)}
                            onPick={(pid, pname) => tryAccept(e.eventId, leg, pid, pname)}
                            onPickOther={() => {
                              setOtherDraft("");
                              setOtherPrompt({ eventId: e.eventId, leg });
                            }}
                            onClose={() => setPickerOpenKey(null)}
                          />
                        )}
                      </div>
                    </div>
                    {a && a.claimedByParentId && a.claimedByParentId !== a.driverParentId && (
                      <p style={{ fontSize: 11, color: "var(--muted)", margin: "4px 0 0" }}>
                        Assigned by {parents.find((p) => p.parentId === a.claimedByParentId)?.displayName ?? "another member"}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          );
        })}
      </main>
      <Link to="/events/new" className="fab" aria-label="Add ride event">＋</Link>

      {override && (
        <OverridePrompt
          existingName={override.existing?.driverName ?? ""}
          newName={override.newDriverName}
          onCancel={() => setOverride(null)}
          onConfirm={() => void confirmOverride()}
        />
      )}

      {otherPrompt && (
        <OtherDriverPrompt
          draft={otherDraft}
          setDraft={setOtherDraft}
          language={config.language}
          onCancel={() => setOtherPrompt(null)}
          onConfirm={() => {
            const name = otherDraft.trim();
            if (!name) return;
            tryAccept(otherPrompt.eventId, otherPrompt.leg, EXTERNAL_DRIVER_ID, name);
            setOtherPrompt(null);
          }}
        />
      )}
    </>
  );
}

function OtherDriverPrompt({
  draft, setDraft, language, onCancel, onConfirm,
}: {
  draft: string;
  setDraft: (v: string) => void;
  language: Parameters<typeof t>[1];
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <div role="dialog" aria-modal="true"
      style={{
        position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)",
        display: "flex", alignItems: "center", justifyContent: "center",
        zIndex: 50, padding: 16,
      }}
      onClick={onCancel}
    >
      <div className="card" style={{ maxWidth: 360, width: "100%" }} onClick={(e) => e.stopPropagation()}>
        <h2 style={{ marginTop: 0 }}>{t("externalDriver", language)}</h2>
        <label>{t("enterDriverName", language)}
          <input
            className="input"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && draft.trim()) onConfirm(); }}
            autoFocus
          />
        </label>
        <div className="row" style={{ gap: 8, marginTop: 12 }}>
          <button className="btn btn--ghost" style={{ flex: 1 }} onClick={onCancel}>
            {t("cancel", language)}
          </button>
          <button
            className="btn btn--danger"
            style={{ flex: 1 }}
            disabled={!draft.trim()}
            onClick={onConfirm}
          >
            {t("assign", language)}
          </button>
        </div>
      </div>
    </div>
  );
}

const legBtn: React.CSSProperties = {
  padding: "6px 12px", minHeight: "auto", fontSize: 13,
};

function chipBtn(active: boolean, border: string, fg: string): React.CSSProperties {
  return {
    padding: "5px 12px", minHeight: "auto", fontSize: 13, whiteSpace: "nowrap",
    borderRadius: 8, cursor: "pointer", boxSizing: "border-box",
    border: `2px solid ${border}`,
    background: active ? border : "transparent",
    color: active ? "#fff" : fg,
    fontWeight: active ? 600 : 400,
  };
}

function noteBtnStyle(hasNote: boolean): React.CSSProperties {
  return {
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
  };
}

function OverridePrompt({ existingName, newName, onCancel, onConfirm }: {
  existingName: string; newName: string;
  onCancel: () => void; onConfirm: () => void;
}) {
  return (
    <div role="dialog" aria-modal="true"
      style={{
        position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)",
        display: "flex", alignItems: "center", justifyContent: "center",
        zIndex: 50, padding: 16,
      }}
      onClick={onCancel}
    >
      <div className="card" style={{ maxWidth: 360, width: "100%" }} onClick={(e) => e.stopPropagation()}>
        <h2 style={{ marginTop: 0 }}>Override ride?</h2>
        <p>This leg is already taken by <strong>{existingName || "another parent"}</strong>.</p>
        <p>Reassign to <strong>{newName}</strong>?</p>
        <div className="row" style={{ gap: 8, marginTop: 8 }}>
          <button className="btn btn--ghost" style={{ flex: 1 }} onClick={onCancel}>Cancel</button>
          <button className="btn" style={{ flex: 1 }} onClick={onConfirm}>Yes, reassign</button>
        </div>
      </div>
    </div>
  );
}
