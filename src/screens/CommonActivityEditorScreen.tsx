import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Header } from "@/components/Header";
import { useApp } from "@/state/AppContext";
import { DayOfWeek, RideDirection } from "@/domain/enums";
import { newActivity } from "@/domain/models";
import { getDayOfWeekLabel, getEveryDayLabel } from "@/lib/i18n";

function directionFromChecks(to: boolean, from: boolean): RideDirection {
  if (to && from) return RideDirection.BOTH;
  if (to) return RideDirection.TO;
  if (from) return RideDirection.FROM;
  return RideDirection.BOTH;
}

export function CommonActivityEditorScreen() {
  const { activityIndex = "new" } = useParams();
  const navigate = useNavigate();
  const { config, setConfig } = useApp();
  const isNew = activityIndex === "new";
  const idx = isNew ? -1 : parseInt(activityIndex, 10);
  const existing = !isNew ? config.globalActivities[idx] ?? null : null;

  const [name, setName] = useState(existing?.name ?? "");
  const [days, setDays] = useState<string[]>(existing?.days ?? []);
  const [place, setPlace] = useState(existing?.place ?? "");
  const [startTime, setStartTime] = useState(existing?.startTime ?? "");
  const [endTime, setEndTime] = useState(existing?.endTime ?? "");
  const [oneTime, setOneTime] = useState(!(existing?.repeating ?? true));
  const [needsRide, setNeedsRide] = useState(existing?.needsRide ?? true);
  const [rideTo, setRideTo] = useState(
    existing ? existing.rideDirection !== RideDirection.FROM : true,
  );
  const [rideFrom, setRideFrom] = useState(
    existing ? existing.rideDirection !== RideDirection.TO : true,
  );

  const toggleDay = (d: string) => {
    setDays((prev) =>
      prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d]
    );
  };

  const handleSave = async () => {
    const rideDirection = directionFromChecks(rideTo, rideFrom);
    const activity = newActivity({ name: name.trim(), days, place, startTime, endTime, repeating: !oneTime, needsRide, rideDirection });
    const globalActivities = isNew
      ? [...config.globalActivities, activity]
      : config.globalActivities.map((a, i) => (i === idx ? activity : a));
    await setConfig({ globalActivities });
    navigate("/settings");
  };

  const handleDelete = async () => {
    const globalActivities = config.globalActivities.filter((_, i) => i !== idx);
    await setConfig({ globalActivities });
    navigate("/settings");
  };

  return (
    <>
      <Header title={isNew ? "New Common Activity" : "Edit Common Activity"} back />
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
              <button className="btn btn--sm" onClick={() => setDays(Object.values(DayOfWeek))}>
                {getEveryDayLabel(config.language)}
              </button>
            </div>
            <div className="row" style={{ flexWrap: "wrap", gap: 8 }}>
              {Object.values(DayOfWeek).map((d) => (
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
