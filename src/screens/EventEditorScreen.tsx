import { useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { Link } from "react-router-dom";
import { Header } from "@/components/Header";
import type { Event } from "@/domain/models";
import { newEvent } from "@/domain/models";
import { newEventId } from "@/domain/ids";
import { RideDirection } from "@/domain/enums";
import { useApp } from "@/state/AppContext";
import { toLocalInputValue, fromLocalInputValue } from "@/lib/format";

export function EventEditorScreen() {
  const { eventId } = useParams();
  const [searchParams] = useSearchParams();
  const nav = useNavigate();
  const { parent, children, events, config, upsertEvent, deleteEvent } = useApp();
  const isNew = !eventId || eventId === "new";

  const stored = isNew ? null : events.find((e) => e.eventId === eventId) ?? null;
  const dateParam = isNew ? searchParams.get("date") : null;
  const baseStart = dateParam ? new Date(dateParam + "T09:00").getTime() : Date.now() + 24 * 60 * 60 * 1000;
  const baseEnd   = dateParam ? new Date(dateParam + "T10:00").getTime() : Date.now() + 25 * 60 * 60 * 1000;
  const [event, setEvent] = useState<Event>(
    stored ?? newEvent({
      eventId: newEventId(),
      childId: children[0]?.childId ?? "",
      title: "",
      createdByParentId: parent?.parentId ?? "anon",
      startDateTime: baseStart,
      endDateTime: baseEnd,
      needsRide: true,
    }),
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isNew && !stored) return <><Header title="Event" back /></>;

  const save = async () => {
    if (!event.title.trim()) { setError("Title is required."); return; }
    setError(null);
    setSaving(true);
    try {
      await upsertEvent(event);
      nav(-1);
    } catch (e) {
      setError("Failed to save — check that the file is still accessible.");
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!isNew) await deleteEvent(event.eventId);
    nav(-1);
  };

  return (
    <>
      <Header title={isNew ? "New event" : "Edit event"} back />
      <main className="app-main">
        <div className="card">
          {error && (
            <p style={{ color: "var(--danger, red)", marginTop: 0, marginBottom: 8 }}>{error}</p>
          )}

          <label>Title
            <input className="input" value={event.title}
              onChange={(e) => setEvent({ ...event, title: e.target.value })} />
          </label>

          <label>Child
            {children.length === 0 ? (
              <p style={{ fontSize: 13, color: "var(--muted)" }}>
                No children yet — <Link to="/children">add one first</Link>.
              </p>
            ) : (
              <select className="select" value={event.childId}
                onChange={(e) => setEvent({ ...event, childId: e.target.value, eventType: "" })}>
                <option value="">— none —</option>
                {children.map((c) => <option key={c.childId} value={c.childId}>{c.name}</option>)}
              </select>
            )}
          </label>

          {(() => {
            const child = children.find((c) => c.childId === event.childId);
            const childActivities = child?.activities ?? [];
            const globalActivities = config.globalActivities ?? [];
            const merged = [
              ...childActivities,
              ...globalActivities.filter((g) => !childActivities.some((a) => a.name === g.name)),
            ];
            const pickActivity = (name: string) => {
              const act = merged.find((a) => a.name === name);
              setEvent((prev) => ({
                ...prev,
                eventType: name,
                title: prev.title || name,
                locationName: prev.locationName || act?.place || "",
              }));
            };
            return (
              <label>Activity
                <select className="select" value={event.eventType} onChange={(e) => pickActivity(e.target.value)}>
                  <option value="">— select —</option>
                  {merged.map((a) => <option key={a.name} value={a.name}>{a.name}</option>)}
                </select>
              </label>
            );
          })()}
          <label>Starts
            <input className="input" type="datetime-local"
              value={toLocalInputValue(event.startDateTime)}
              onChange={(e) => setEvent({ ...event, startDateTime: fromLocalInputValue(e.target.value) })} />
          </label>
          <label>Ends
            <input className="input" type="datetime-local"
              value={toLocalInputValue(event.endDateTime)}
              onChange={(e) => setEvent({ ...event, endDateTime: fromLocalInputValue(e.target.value) })} />
          </label>
          <label>Location
            <input className="input" list="locations-list" value={event.locationName}
              onChange={(e) => setEvent({ ...event, locationName: e.target.value })} />
            <datalist id="locations-list">
              {config.globalLocations.map((l) => <option key={l} value={l} />)}
            </datalist>
          </label>
          <label>Notes
            <textarea className="textarea" rows={3} value={event.description}
              onChange={(e) => setEvent({ ...event, description: e.target.value })}
              placeholder="Notes for this event (optional)" />
          </label>
          <label className="row" style={{ marginTop: 16 }}>
            <input type="checkbox" checked={event.needsRide}
              onChange={(e) => setEvent({ ...event, needsRide: e.target.checked })} />
            &nbsp;Needs ride
          </label>
          {event.needsRide && (
            <label>Ride direction
              <select className="select" value={event.rideDirection}
                onChange={(e) => setEvent({ ...event, rideDirection: e.target.value as Event["rideDirection"] })}>
                {Object.values(RideDirection).map((d) => <option key={d} value={d}>{d}</option>)}
              </select>
            </label>
          )}
          <button className="btn btn--full" onClick={save} disabled={saving} style={{ marginTop: 16 }}>
            {saving ? "Saving…" : "Save"}
          </button>
          {!isNew && (
            <button className="btn btn--danger btn--full" onClick={remove} style={{ marginTop: 8 }}>Delete</button>
          )}
        </div>
      </main>
    </>
  );
}
