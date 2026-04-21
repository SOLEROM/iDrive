import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Header } from "@/components/Header";
import { useApp } from "@/state/AppContext";
import { RideDirection } from "@/domain/enums";
import { newActivity, newEvent, type Event } from "@/domain/models";
import { getDayOfWeekLabel, getDayOrder } from "@/lib/i18n";

const JS_DOW: Record<number, string> = {
  0: "SUNDAY", 1: "MONDAY", 2: "TUESDAY", 3: "WEDNESDAY",
  4: "THURSDAY", 5: "FRIDAY", 6: "SATURDAY",
};

function directionFromChecks(to: boolean, from: boolean): RideDirection {
  if (to && from) return RideDirection.BOTH;
  if (to) return RideDirection.TO;
  if (from) return RideDirection.FROM;
  return RideDirection.BOTH;
}

export function ActivityEditorScreen() {
  const { childId = "", activityIndex = "new" } = useParams();
  const navigate = useNavigate();
  const { parent, children, events, upsertChild, upsertEvents, config } = useApp();

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
    // Migrate old single-time activities
    if (existing && existing.days.length > 0 && (existing.startTime || existing.endTime)) {
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

  const applyTime = (dateMs: number, timeStr: string): number => {
    if (!timeStr) return dateMs;
    const d = new Date(dateMs);
    const [h, m] = timeStr.split(":").map(Number);
    d.setHours(h, m, 0, 0);
    return d.getTime();
  };

  const generateActivityEvents = async (activity: ReturnType<typeof newActivity>) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 2, 0, 23, 59, 59, 999);
    const slug = activity.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 12);
    const childSuffix = childId.slice(-6);

    const hasDayTimes = Object.keys(activity.dayTimes).length > 0;
    const activeDays = hasDayTimes ? Object.keys(activity.dayTimes) : activity.days;

    const toUpsert: Event[] = [];
    for (let d = new Date(today); d <= endOfMonth; d.setDate(d.getDate() + 1)) {
      const dow = JS_DOW[d.getDay()];
      if (activeDays.length > 0 && !activeDays.includes(dow)) continue;
      const times = hasDayTimes
        ? (activity.dayTimes[dow] ?? { startTime: "", endTime: "" })
        : { startTime: activity.startTime, endTime: activity.endTime };
      const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      const dayStart = new Date(d).setHours(0, 0, 0, 0);
      toUpsert.push(newEvent({
        eventId: `act-${childSuffix}-${slug}-${dateStr}`,
        childId,
        title: activity.name,
        eventType: activity.name,
        description: activity.notes,
        createdByParentId: parent?.parentId ?? "anon",
        startDateTime: applyTime(dayStart, times.startTime),
        endDateTime: applyTime(dayStart, times.endTime || times.startTime),
        locationName: activity.place,
        needsRide: activity.needsRide,
        rideDirection: activity.rideDirection,
      }));
      if (!activity.repeating) break;
    }
    if (toUpsert.length > 0) await upsertEvents(toUpsert);
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
    await upsertChild({ ...child, activities });

    if (!isNew && existing) {
      const now = Date.now();
      const futureLinked = events.filter(
        (e) => e.childId === childId && e.eventType === existing.name && e.startDateTime >= now,
      );
      if (futureLinked.length > 0) {
        const hasDayTimes = Object.keys(activity.dayTimes).length > 0;
        await upsertEvents(futureLinked.map((e) => {
          const dow = JS_DOW[new Date(e.startDateTime).getDay()];
          const times = hasDayTimes
            ? (activity.dayTimes[dow] ?? { startTime: "", endTime: "" })
            : { startTime: activity.startTime, endTime: activity.endTime };
          return {
            ...e,
            title: activity.name,
            eventType: activity.name,
            locationName: activity.place || e.locationName,
            startDateTime: times.startTime ? applyTime(e.startDateTime, times.startTime) : e.startDateTime,
            endDateTime: times.endTime ? applyTime(e.endDateTime, times.endTime) : e.endDateTime,
            needsRide: activity.needsRide,
            rideDirection: activity.rideDirection,
          };
        }));
      }
    }

    await generateActivityEvents(activity);
    navigate(`/children/${childId}`);
  };

  const handleDelete = async () => {
    const activities = child.activities.filter((_, i) => i !== idx);
    await upsertChild({ ...child, activities });
    navigate(`/children/${childId}`);
  };

  return (
    <>
      <Header title={isNew ? "New Activity" : "Edit Activity"} back />
      <main className="app-main">
        <div className="card">
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
        </div>
        <div className="row" style={{ gap: 8, marginTop: 12 }}>
          <button className="btn btn--primary" style={{ flex: 1 }}
            disabled={!name.trim()}
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
