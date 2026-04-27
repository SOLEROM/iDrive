import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Header } from "@/components/Header";
import { ChildBadge } from "@/components/ChildBadge";
import { useApp } from "@/state/AppContext";
import { RideDirection } from "@/domain/enums";
import { newActivity } from "@/domain/models";
import { expandActivity, findFutureActivityEventIds } from "@/domain/activityExpander";
import { getDayOfWeekLabel, getDayOrder } from "@/lib/i18n";

function directionFromChecks(to: boolean, from: boolean): RideDirection {
  if (to && from) return RideDirection.BOTH;
  if (to) return RideDirection.TO;
  if (from) return RideDirection.FROM;
  return RideDirection.BOTH;
}

export function ActivityEditorScreen() {
  const { childId = "", activityIndex = "new" } = useParams();
  const navigate = useNavigate();
  const { parent, children, events, upsertChild, upsertEvents, deleteEvents, config } = useApp();

  const child = children.find((c) => c.childId === childId) ?? null;
  const isNew = activityIndex === "new";
  const idx = isNew ? -1 : parseInt(activityIndex, 10);
  const existing = !isNew && child ? child.activities[idx] ?? null : null;

  const [name, setName] = useState(existing?.name ?? "");
  const [place, setPlace] = useState(existing?.place ?? "");
  const [oneTime, setOneTime] = useState(!(existing?.repeating ?? true));
  const [notes, setNotes] = useState(existing?.notes ?? "");
  const [needsRide, setNeedsRide] = useState(existing?.needsRide ?? true);
  const [rideTo, setRideTo] = useState(
    existing ? existing.rideDirection !== RideDirection.FROM : true,
  );
  const [rideFrom, setRideFrom] = useState(
    existing ? existing.rideDirection !== RideDirection.TO : true,
  );

  const initDayTimes = (): Record<string, { startTime: string; endTime: string }> => {
    if (existing?.dayTimes && Object.keys(existing.dayTimes).length > 0) {
      return existing.dayTimes;
    }
    if (existing && existing.days?.length > 0 && (existing.startTime || existing.endTime)) {
      const result: Record<string, { startTime: string; endTime: string }> = {};
      for (const d of existing.days) {
        result[d] = { startTime: existing.startTime, endTime: existing.endTime };
      }
      return result;
    }
    return {};
  };

  const [dayTimes, setDayTimes] = useState<Record<string, { startTime: string; endTime: string }>>(initDayTimes);

  if (!child) return (
    <><Header title="Activity" back /><main className="app-main"><div className="card empty">Child not found.</div></main></>
  );

  const allDays = getDayOrder(config.language);

  const toggleDay = (d: string) => {
    setDayTimes((prev) => {
      if (d in prev) {
        const next = { ...prev };
        delete next[d];
        return next;
      }
      return { ...prev, [d]: { startTime: "", endTime: "" } };
    });
  };

  const setDayTime = (d: string, field: "startTime" | "endTime", val: string) => {
    setDayTimes((prev) => ({
      ...prev,
      [d]: { ...(prev[d] ?? { startTime: "", endTime: "" }), [field]: val },
    }));
  };

  const handleSave = async () => {
    const days = allDays.filter((d) => d in dayTimes);
    const rideDirection = directionFromChecks(rideTo, rideFrom);
    const activity = newActivity({
      name: name.trim(), days, place,
      startTime: "", endTime: "",
      dayTimes,
      repeating: !oneTime, needsRide, rideDirection, notes,
    });
    const activities = isNew
      ? [...child.activities, activity]
      : child.activities.map((a, i) => (i === idx ? activity : a));

    // Cascade old (and current name, in case rename happened) future events.
    const oldName = existing?.name ?? activity.name;
    const idsOld = findFutureActivityEventIds(events, childId, oldName);
    const idsNew = oldName !== activity.name
      ? findFutureActivityEventIds(events, childId, activity.name)
      : [];
    const allIds = [...new Set([...idsOld, ...idsNew])];
    if (allIds.length > 0) await deleteEvents(allIds);

    await upsertChild({ ...child, activities });

    const toUpsert = expandActivity(activity, {
      childId, createdByParentId: parent?.parentId ?? "anon",
    });
    if (toUpsert.length > 0) await upsertEvents(toUpsert);

    navigate(`/children/${childId}`);
  };

  const handleDelete = async () => {
    if (existing) {
      const ids = findFutureActivityEventIds(events, childId, existing.name);
      if (ids.length > 0) await deleteEvents(ids);
    }
    const activities = child.activities.filter((_, i) => i !== idx);
    await upsertChild({ ...child, activities });
    navigate(`/children/${childId}`);
  };

  const checkedDays = Object.keys(dayTimes);
  const missingTime = checkedDays.some((d) => !dayTimes[d].startTime);

  return (
    <>
      <Header title={isNew ? "New Activity" : "Edit Activity"} back />
      <main className="app-main">
        <div className="card">
          <div style={{ marginBottom: 8 }}>
            <ChildBadge name={child.name} color={child.colorTag} archived={child.isArchived} />
          </div>
          <label>Name
            <input className="input" value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Activity name" />
          </label>

          <div style={{ marginTop: 8 }}>
            <span style={{ display: "block", marginBottom: 6, fontWeight: 500 }}>Days</span>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {allDays.map((d) => {
                const checked = d in dayTimes;
                const times = dayTimes[d] ?? { startTime: "", endTime: "" };
                return (
                  <div key={d} style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                    <label style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer", minWidth: 110 }}>
                      <input type="checkbox" checked={checked} onChange={() => toggleDay(d)} />
                      <span>{getDayOfWeekLabel(d, config.language)}</span>
                    </label>
                    {checked && (
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <input type="time" className="input"
                          style={{ width: 120, padding: "4px 6px", fontSize: 14 }}
                          value={times.startTime}
                          onChange={(e) => setDayTime(d, "startTime", e.target.value)} />
                        <span style={{ color: "var(--muted)", fontSize: 13 }}>–</span>
                        <input type="time" className="input"
                          style={{ width: 120, padding: "4px 6px", fontSize: 14 }}
                          value={times.endTime}
                          onChange={(e) => setDayTime(d, "endTime", e.target.value)} />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <label style={{ marginTop: 8 }}>Place
            <input className="input" list="activity-locations" value={place}
              onChange={(e) => setPlace(e.target.value)}
              placeholder="Location (optional)" />
            <datalist id="activity-locations">
              {config.globalLocations.map((l) => <option key={l} value={l} />)}
            </datalist>
          </label>
          <label>Notes
            <textarea className="textarea" value={notes} rows={3}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Shared notes for all occurrences (optional)" />
          </label>
          <label className="row" style={{ gap: 8, cursor: "pointer" }}>
            <input type="checkbox" checked={oneTime} onChange={(e) => setOneTime(e.target.checked)} />
            One time only
          </label>

          <div style={{ borderTop: "1px solid var(--border)", marginTop: 12, paddingTop: 12 }}>
            <label className="row" style={{ gap: 8, cursor: "pointer" }}>
              <input type="checkbox" checked={needsRide} onChange={(e) => setNeedsRide(e.target.checked)} />
              <strong>Needs ride</strong>
            </label>
            {needsRide && (
              <div className="row" style={{ gap: 16, marginTop: 10 }}>
                <label className="row" style={{ gap: 6, cursor: "pointer" }}>
                  <input type="checkbox" checked={rideTo} onChange={(e) => setRideTo(e.target.checked)} />
                  To
                </label>
                <label className="row" style={{ gap: 6, cursor: "pointer" }}>
                  <input type="checkbox" checked={rideFrom} onChange={(e) => setRideFrom(e.target.checked)} />
                  From
                </label>
              </div>
            )}
          </div>

          {missingTime && (
            <p style={{ color: "var(--danger)", fontSize: 13, marginTop: 10 }}>
              Set a start time for every checked day before saving.
            </p>
          )}
        </div>
        <div className="row" style={{ gap: 8, marginTop: 12 }}>
          <button className="btn btn--primary" style={{ flex: 1 }}
            disabled={!name.trim() || missingTime}
            onClick={handleSave}>
            Save
          </button>
          {!isNew && (
            <button className="btn btn--danger" onClick={handleDelete}>
              Delete
            </button>
          )}
        </div>
      </main>
    </>
  );
}
