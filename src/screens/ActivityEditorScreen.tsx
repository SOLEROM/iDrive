import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Header } from "@/components/Header";
import { useApp } from "@/state/AppContext";
import { RideDirection } from "@/domain/enums";
import { newActivity, newEvent, type Event } from "@/domain/models";
import { getDayOfWeekLabel, getDayOrder, getEveryDayLabel } from "@/lib/i18n";

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
  const [days, setDays] = useState<string[]>(existing?.days ?? []);
  const [place, setPlace] = useState(existing?.place ?? "");
  const [startTime, setStartTime] = useState(existing?.startTime ?? "");
  const [endTime, setEndTime] = useState(existing?.endTime ?? "");
  const [oneTime, setOneTime] = useState(!(existing?.repeating ?? true));
  const [notes, setNotes] = useState(existing?.notes ?? "");
  const [needsRide, setNeedsRide] = useState(existing?.needsRide ?? true);
  const [rideTo, setRideTo] = useState(
    existing ? existing.rideDirection !== RideDirection.FROM : true,
  );
  const [rideFrom, setRideFrom] = useState(
    existing ? existing.rideDirection !== RideDirection.TO : true,
  );

  if (!child) return (
    <><Header title="Activity" back /><main className="app-main"><div className="card empty">Child not found.</div></main></>
  );

  const toggleDay = (d: string) => {
    setDays((prev) =>
      prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d]
    );
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
    // Generate through end of next month for at least 6 weeks of visibility
    const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 2, 0, 23, 59, 59, 999);
    const slug = activity.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 12);
    const childSuffix = childId.slice(-6);

    const toUpsert: Event[] = [];
    for (let d = new Date(today); d <= endOfMonth; d.setDate(d.getDate() + 1)) {
      const dow = JS_DOW[d.getDay()];
      if (activity.days.length > 0 && !activity.days.includes(dow)) continue;
      const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      const dayStart = new Date(d).setHours(0, 0, 0, 0);
      toUpsert.push(newEvent({
        eventId: `act-${childSuffix}-${slug}-${dateStr}`,
        childId,
        title: activity.name,
        eventType: activity.name,
        description: activity.notes,
        createdByParentId: parent?.parentId ?? "anon",
        startDateTime: applyTime(dayStart, activity.startTime),
        endDateTime: applyTime(dayStart, activity.endTime || activity.startTime),
        locationName: activity.place,
        needsRide: activity.needsRide,
        rideDirection: activity.rideDirection,
      }));
      if (!activity.repeating) break; // one-time: only first matching day
    }
    if (toUpsert.length > 0) await upsertEvents(toUpsert);
  };

  const handleSave = async () => {
    const rideDirection = directionFromChecks(rideTo, rideFrom);
    const activity = newActivity({
      name: name.trim(), days, place, startTime, endTime,
      repeating: !oneTime, needsRide, rideDirection, notes,
    });
    const activities = isNew
      ? [...child.activities, activity]
      : child.activities.map((a, i) => (i === idx ? activity : a));
    await upsertChild({ ...child, activities });

    // Update future events that were already generated from this activity
    if (!isNew && existing) {
      const now = Date.now();
      const futureLinked = events.filter(
        (e) => e.childId === childId && e.eventType === existing.name && e.startDateTime >= now,
      );
      if (futureLinked.length > 0) {
        await upsertEvents(futureLinked.map((e) => ({
          ...e,
          title: activity.name,
          eventType: activity.name,
          locationName: activity.place || e.locationName,
          startDateTime: applyTime(e.startDateTime, activity.startTime),
          endDateTime: applyTime(e.endDateTime, activity.endTime),
          needsRide: activity.needsRide,
          rideDirection: activity.rideDirection,
        })));
      }
    }

    // Generate (or fill gaps for) events from today to end of month
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
          <div>
            <div className="row" style={{ justifyContent: "space-between", marginBottom: 4 }}>
              <span>Days</span>
              <button className="btn btn--sm" onClick={() => setDays(getDayOrder(config.language))}>
                {getEveryDayLabel(config.language)}
              </button>
            </div>
            <div className="row" style={{ flexWrap: "wrap", gap: 8 }}>
              {getDayOrder(config.language).map((d) => (
                <label key={d} className="row" style={{ gap: 4, cursor: "pointer" }}>
                  <input type="checkbox" checked={days.includes(d)} onChange={() => toggleDay(d)} />
                  {getDayOfWeekLabel(d, config.language)}
                </label>
              ))}
            </div>
          </div>
          <label>Place
            <input className="input" list="activity-locations" value={place}
              onChange={(e) => setPlace(e.target.value)}
              placeholder="Location (optional)" />
            <datalist id="activity-locations">
              {config.globalLocations.map((l) => <option key={l} value={l} />)}
            </datalist>
          </label>
          <label>Start time
            <input type="time" className="input" value={startTime}
              onChange={(e) => setStartTime(e.target.value)} />
          </label>
          <label>End time
            <input type="time" className="input" value={endTime}
              onChange={(e) => setEndTime(e.target.value)} />
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
