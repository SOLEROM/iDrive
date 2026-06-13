import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Header } from "@/components/Header";
import { useApp } from "@/state/AppContext";
import { useRideAlarms } from "@/state/useRideAlarms";
import { usePersonalTasks } from "@/state/usePersonalTasks";
import { usePersonalTaskAlarms } from "@/state/usePersonalTaskAlarms";
import { AlarmToggle } from "@/components/AlarmToggle";
import { fmtDateTime } from "@/lib/format";
import { localeFor, t } from "@/lib/i18n";
import { ChildBadge } from "@/components/ChildBadge";
import { AssignmentStatus, ChildColor, ChildColorHex, EventStatus, RideDirection, isExternalDriver } from "@/domain/enums";
import { todayStart, endOfDay, endOfWeek, endOfMonth, isoDateLocal } from "@/domain/timeWindow";
const _endOfToday = () => endOfDay(todayStart());
import { RideStatusChip } from "@/components/RideStatusChip";

type UpcomingRange = "1d" | "7d";

export function DashboardScreen() {
  const navigate = useNavigate();
  const { parent, children, events, assignments, upsertAssignment, config } = useApp();
  const { isAlarmOn, getLeadMinutes, enableAlarm, disableAlarm } = useRideAlarms(assignments, events, children, config);
  const { tasks, addTask, removeTask, updateTask } = usePersonalTasks();
  const taskAlarms = usePersonalTaskAlarms(tasks, config);
  const childColorMap = new Map(children.map((c) => [c.childId, ChildColorHex[c.colorTag]]));
  const [range, setRange] = useState<UpcomingRange>("1d");
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [taskDesc, setTaskDesc] = useState("");
  const [taskDue, setTaskDue] = useState(() => defaultDueLocal());
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [editDesc, setEditDesc] = useState("");
  const [editDue, setEditDue] = useState("");

  const startEditTask = (id: string) => {
    const task = tasks.find((t) => t.id === id);
    if (!task) return;
    setEditingTaskId(id);
    setEditDesc(task.description);
    setEditDue(msToLocalInput(task.dueAt));
  };
  const cancelEditTask = () => { setEditingTaskId(null); setEditDesc(""); setEditDue(""); };
  const saveEditTask = () => {
    if (!editingTaskId) return;
    const desc = editDesc.trim();
    if (!desc) return;
    const ms = new Date(editDue).getTime();
    if (!Number.isFinite(ms)) return;
    updateTask(editingTaskId, desc, ms);
    cancelEditTask();
  };

  const startOfToday = todayStart();
  const endOfToday = _endOfToday();
  const upcomingWindowEnd = range === "1d"
    ? endOfDay(startOfToday)
    : endOfDay(startOfToday + 6 * 86_400_000);

  const upcoming = events
    .filter((e) =>
      e.startDateTime >= startOfToday &&
      e.startDateTime <= upcomingWindowEnd &&
      e.status !== EventStatus.CANCELLED,
    )
    .sort((a, b) => a.startDateTime - b.startDateTime);

  const markRideDone = async (e: React.MouseEvent, assignmentId: string) => {
    e.stopPropagation();
    const a = assignments.find((x) => x.assignmentId === assignmentId);
    if (!a) return;
    await upsertAssignment({
      ...a,
      assignmentStatus: AssignmentStatus.COMPLETED,
      completedAt: Date.now(),
    });
  };

  // My rides on the dashboard include:
  //   - rides I drive (or claimed for someone else),
  //   - rides assigned to an external (non-member) driver — visible to
  //     everyone in the family so they can verify out-of-group coverage.
  const myOpenRides = assignments.filter((a) => {
    if (a.assignmentStatus === AssignmentStatus.UNASSIGNED) return false;
    if (a.assignmentStatus === AssignmentStatus.COMPLETED) return false;
    // Drop assignments whose event's day is before today — stale, not actionable.
    const evt = events.find((e) => e.eventId === a.eventId);
    if (!evt || evt.startDateTime < startOfToday) return false;
    if (a.driverParentId === parent?.parentId) return true;
    if (a.claimedByParentId === parent?.parentId) return true;
    if (isExternalDriver(a.driverParentId)) return true;
    return false;
  }).sort((a, b) => {
    const evtA = events.find((e) => e.eventId === a.eventId);
    const evtB = events.find((e) => e.eventId === b.eventId);
    const timeA = evtA ? (a.rideLeg === "FROM" ? evtA.endDateTime : evtA.startDateTime) : 0;
    const timeB = evtB ? (b.rideLeg === "FROM" ? evtB.endDateTime : evtB.startDateTime) : 0;
    return timeA - timeB;
  });

  const sortedTasks = [...tasks].sort((a, b) => a.dueAt - b.dueAt);

  const submitTask = () => {
    const desc = taskDesc.trim();
    if (!desc) return;
    const ms = new Date(taskDue).getTime();
    if (!Number.isFinite(ms)) return;
    addTask(desc, ms);
    setTaskDesc("");
    setTaskDue(defaultDueLocal());
    setShowTaskForm(false);
  };

  const weekEnd = endOfWeek();
  const monthEnd = endOfMonth();

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
      <Header
        title={`${t("hi", config.language)} ${parent?.displayName ?? t("there", config.language)}`.trim()}
        right={(() => {
          const locale = localeFor(config.language);
          const now = new Date();
          const weekday = now.toLocaleDateString(locale, { weekday: "long" });
          const datePart = now.toLocaleDateString(locale, { month: "short", day: "numeric" });
          return (
            <div style={{ textAlign: "right", lineHeight: 1.15, flexShrink: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: "var(--fg)" }}>{weekday}</div>
              <div style={{ fontSize: 11, color: "var(--muted)" }}>{datePart}</div>
            </div>
          );
        })()}
      />
      <main className="app-main">
        <section>
          <div className="row row--between" style={{ margin: "20px 4px 8px", alignItems: "center" }}>
            <h2 style={{ ...sH, margin: 0 }}>{t("myRides", config.language)}</h2>
            <button
              onClick={() => setShowTaskForm((v) => !v)}
              aria-label={t("addTask", config.language)}
              title={t("addTask", config.language)}
              style={{
                background: showTaskForm ? "var(--primary)" : "transparent",
                color: showTaskForm ? "#fff" : "var(--fg)",
                border: "1px solid var(--border)",
                borderRadius: 999,
                width: 28, height: 28,
                lineHeight: 1,
                fontSize: 18, fontWeight: 600,
                cursor: "pointer",
                padding: 0,
              }}
            >+</button>
          </div>
          {showTaskForm && (
            <div className="card" style={{ borderLeft: "4px solid var(--primary)" }}>
              <input
                className="input"
                type="text"
                placeholder={t("taskDescription", config.language)}
                value={taskDesc}
                onChange={(e) => setTaskDesc(e.target.value)}
                autoFocus
              />
              <input
                className="input"
                type="datetime-local"
                style={{ marginTop: 8 }}
                value={taskDue}
                onChange={(e) => setTaskDue(e.target.value)}
              />
              <div className="row" style={{ gap: 8, marginTop: 10 }}>
                <button
                  className="btn btn--full"
                  style={{ minHeight: "auto", padding: "10px" }}
                  onClick={submitTask}
                  disabled={!taskDesc.trim()}
                >{t("save", config.language)}</button>
                <button
                  className="btn btn--ghost btn--full"
                  style={{ minHeight: "auto", padding: "10px" }}
                  onClick={() => { setShowTaskForm(false); setTaskDesc(""); }}
                >{t("cancel", config.language)}</button>
              </div>
            </div>
          )}
          {myOpenRides.length === 0 && sortedTasks.length === 0 && (
            <div className="card empty">{t("nothingOnYourPlate", config.language)}</div>
          )}
          {sortedTasks.map((task) => {
            const isEditing = editingTaskId === task.id;
            return (
              <div className="card" key={task.id} style={{ borderLeft: "4px solid var(--primary)" }}>
                {isEditing ? (
                  <>
                    <input
                      className="input"
                      type="text"
                      placeholder={t("taskDescription", config.language)}
                      value={editDesc}
                      onChange={(e) => setEditDesc(e.target.value)}
                      autoFocus
                    />
                    <input
                      className="input"
                      type="datetime-local"
                      style={{ marginTop: 8 }}
                      value={editDue}
                      onChange={(e) => setEditDue(e.target.value)}
                    />
                    <div className="row" style={{ gap: 8, marginTop: 10 }}>
                      <button
                        className="btn btn--full"
                        style={{ minHeight: "auto", padding: "10px" }}
                        onClick={saveEditTask}
                        disabled={!editDesc.trim()}
                      >{t("save", config.language)}</button>
                      <button
                        className="btn btn--ghost btn--full"
                        style={{ minHeight: "auto", padding: "10px" }}
                        onClick={cancelEditTask}
                      >{t("cancel", config.language)}</button>
                    </div>
                  </>
                ) : (
                  <div className="row row--between" style={{ alignItems: "flex-start" }}>
                    <div
                      style={{ cursor: "pointer", flex: 1 }}
                      onClick={() => startEditTask(task.id)}
                      title={t("addTask", config.language)}
                    >
                      <div className="row" style={{ gap: 6, flexWrap: "wrap" }}>
                        <span className="chip">{t("personalTask", config.language)}</span>
                        <strong>{task.description}</strong>
                      </div>
                      <p style={{ margin: "2px 0 0" }}>{fmtDateTime(task.dueAt, config.language)}</p>
                    </div>
                    <div className="row" style={{ gap: 8, flexShrink: 0, alignItems: "center" }}>
                      <AlarmToggle
                        isOn={taskAlarms.isAlarmOn(task.id)}
                        leadMinutes={taskAlarms.getLeadMinutes(task.id)}
                        onEnable={(mins) => void taskAlarms.enableAlarm(task.id, mins)}
                        onDisable={() => taskAlarms.disableAlarm(task.id)}
                        stopPropagation
                      />
                      <button
                        className="btn"
                        style={{ padding: "4px 10px", minHeight: "auto", fontSize: 12 }}
                        onClick={() => removeTask(task.id)}
                      >{t("done", config.language)}</button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
          {myOpenRides.map((a) => {
            const evt = events.find((e) => e.eventId === a.eventId);
            const hex = evt ? childColorMap.get(evt.childId) : undefined;
            const external = isExternalDriver(a.driverParentId);
            const hasNote = !!evt?.description;
            const preview = hasNote
              ? (evt!.description.length > 15 ? evt!.description.slice(0, 15) + "…" : evt!.description)
              : null;
            const cardStyle: React.CSSProperties = {
              cursor: "pointer",
              ...(hex ? { borderLeft: `4px solid ${hex}` } : {}),
              ...(external ? { background: "#ef444422", borderColor: "#ef4444" } : {}),
            };
            return (
              <div className="card" key={a.assignmentId}
                style={cardStyle}
                onClick={() => evt && navigate(`/events/${evt.eventId}`)}>
                <div className="row row--between" style={{ alignItems: "flex-start" }}>
                  <div>
                    <div className="row" style={{ gap: 6, flexWrap: "wrap" }}>
                      {(() => {
                        const c = evt ? children.find((c) => c.childId === evt.childId) : null;
                        return c ? <ChildBadge name={c.name} color={c.colorTag} archived={c.isArchived} /> : null;
                      })()}
                      <strong>{evt?.title ?? a.eventId} · {a.rideLeg}</strong>
                    </div>
                    {evt && <p style={{ margin: "2px 0 0" }}>{fmtDateTime(a.rideLeg === "FROM" ? evt.endDateTime : evt.startDateTime, config.language)}</p>}
                    {external && (
                      <p style={{ margin: "2px 0 0", color: "#ef4444", fontWeight: 600, fontSize: 13 }}>
                        {t("externalDriver", config.language)}: {a.driverName || "?"}
                      </p>
                    )}
                  </div>
                  <div className="row" style={{ gap: 8, flexShrink: 0, alignItems: "center" }}>
                    {(hasNote || !evt) && (
                      <span style={{
                        background: "var(--surface)", border: "1px solid var(--border)",
                        borderRadius: 6, padding: "3px 7px", fontSize: 11,
                        color: "var(--fg)", maxWidth: 110, lineHeight: 1.3,
                      }} title={evt?.description}>
                        {preview}
                      </span>
                    )}
                    {external && (
                      <span className="chip" style={{ background: "#ef4444", color: "#fff" }}>
                        {t("externalDriver", config.language)}
                      </span>
                    )}
                    {a.assignmentStatus !== AssignmentStatus.VOLUNTEERED && (
                      <RideStatusChip status={a.assignmentStatus} />
                    )}
                    <AlarmToggle
                      isOn={isAlarmOn(a.assignmentId)}
                      leadMinutes={getLeadMinutes(a.assignmentId)}
                      onEnable={(mins) => void enableAlarm(a.assignmentId, mins)}
                      onDisable={() => disableAlarm(a.assignmentId)}
                      stopPropagation
                    />
                    {evt && evt.startDateTime <= endOfToday && (
                      <button
                        className="btn"
                        style={{ padding: "4px 10px", minHeight: "auto", fontSize: 12 }}
                        onClick={(ev) => markRideDone(ev, a.assignmentId)}
                      >
                        {t("done", config.language)}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </section>

        <section>
          <div className="row row--between" style={{ margin: "20px 4px 8px" }}>
            <h2 style={{ ...sH, margin: 0 }}>{t("upcomingEvents", config.language)}</h2>
            <div className="row" style={{ gap: 4 }}>
              <button
                onClick={() => setRange("1d")}
                style={rangeBtn(range === "1d")}
                aria-pressed={range === "1d"}
              >{t("today", config.language)}</button>
              <button
                onClick={() => setRange("7d")}
                style={rangeBtn(range === "7d")}
                aria-pressed={range === "7d"}
              >{t("sevenDays", config.language)}</button>
            </div>
          </div>
          {upcoming.length === 0 && (
            <div className="card empty">
              {range === "1d" ? t("nothingScheduledToday", config.language) + " " : t("nothingNext7Days", config.language) + " "}
              <Link to="/events">{t("addOne", config.language)}</Link>
            </div>
          )}
          {upcoming.map((e) => {
            const child = children.find((c) => c.childId === e.childId);
            const hex = childColorMap.get(e.childId);
            return (
              <Link to={`/events/${e.eventId}`} key={e.eventId}>
                <div className="card" style={hex ? { borderLeft: `4px solid ${hex}` } : undefined}>
                  <div className="row row--between">
                    <div>
                      <div className="row" style={{ gap: 6, flexWrap: "wrap" }}>
                        <ChildBadge name={child?.name ?? ""} color={child?.colorTag ?? ChildColor.BLUE} archived={child?.isArchived} />
                        <strong>{e.title}</strong>
                      </div>
                      <p>{fmtDateTime(e.startDateTime, config.language)} · {e.locationName || e.eventType}</p>
                    </div>
                    <div className="row" style={{ gap: 8 }}>
                      {e.needsRide && <span className="chip">Ride</span>}
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}
        </section>

        <section>
          <h2 style={sH}>{t("weekOpenRideRequests", config.language)}</h2>
          {weekOpenLegs === 0 ? (
            <div className="card empty">{t("allLegsClaimedWeek", config.language)}</div>
          ) : (
            <div className="card">
              <p>
                {weekOpenLegs} {t(weekOpenLegs === 1 ? "rideLeg" : "rideLegs", config.language)}{" "}
                {t("needVolunteersWeek", config.language)}
              </p>
              <Link to="/rides" className="btn btn--ghost" style={{ display: "inline-block", marginTop: 8 }}>
                {t("viewBoard", config.language)}
              </Link>
            </div>
          )}
        </section>

        <section>
          <h2 style={sH}>{t("monthOpenRideRequests", config.language)}</h2>
          {monthOpenLegs === 0 ? (
            <div className="card empty">{t("allLegsClaimedMonth", config.language)}</div>
          ) : (
            <div className="card">
              <p>
                {monthOpenLegs} {t(monthOpenLegs === 1 ? "rideLeg" : "rideLegs", config.language)}{" "}
                {t("needVolunteersMonth", config.language)}
              </p>
              <Link to="/rides" className="btn btn--ghost" style={{ display: "inline-block", marginTop: 8 }}>
                {t("viewBoard", config.language)}
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

// Format an absolute ms timestamp as the YYYY-MM-DDTHH:mm string that
// <input type="datetime-local"> expects, in local time.
function msToLocalInput(ms: number): string {
  const d = new Date(ms);
  const date = isoDateLocal(ms);
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${date}T${hh}:${mm}`;
}

// Default due-time for the new-task form: today at the next half-hour.
function defaultDueLocal(): string {
  const now = new Date();
  now.setMinutes(now.getMinutes() + (30 - (now.getMinutes() % 30)));
  now.setSeconds(0, 0);
  return msToLocalInput(now.getTime());
}

function rangeBtn(active: boolean): React.CSSProperties {
  return {
    padding: "4px 10px",
    minHeight: "auto",
    fontSize: 12,
    fontWeight: active ? 600 : 400,
    borderRadius: 999,
    border: "1px solid var(--border)",
    background: active ? "var(--primary)" : "transparent",
    color: active ? "#fff" : "var(--fg)",
    cursor: "pointer",
  };
}
