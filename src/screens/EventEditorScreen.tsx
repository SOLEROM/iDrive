import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Header } from "@/components/Header";
import { childrenRepo, eventsRepo } from "@/storage/repository";
import type { Child, Event } from "@/domain/models";
import { newEvent } from "@/domain/models";
import { EventType, RideDirection, VisibilityScope } from "@/domain/enums";
import { useApp } from "@/state/AppContext";
import { toLocalInputValue, fromLocalInputValue } from "@/lib/format";

export function EventEditorScreen() {
  const { eventId } = useParams();
  const nav = useNavigate();
  const { parent, config } = useApp();
  const isNew = !eventId || eventId === "new";
  const [children, setChildren] = useState<Child[]>([]);
  const [event, setEvent] = useState<Event | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const cs = await childrenRepo.list();
      if (cancelled) return;
      setChildren(cs);
      if (isNew) {
        setEvent(newEvent({
          eventId: `e-${Math.random().toString(36).slice(2, 10)}`,
          childId: cs[0]?.childId ?? "",
          title: "",
          createdByParentId: parent?.parentId ?? "anon",
          startDateTime: Date.now() + 24 * 60 * 60 * 1000,
          endDateTime: Date.now() + 25 * 60 * 60 * 1000,
          groupId: config.lastSelectedGroupId ?? "group-demo",
        }));
      } else {
        const e = await eventsRepo.byId(eventId!);
        setEvent(e ?? null);
      }
    })();
    return () => { cancelled = true; };
  }, [eventId, isNew, parent, config.lastSelectedGroupId]);

  if (!event) return <><Header title="Event" back /></>;

  const save = async () => {
    if (!event.title.trim() || !event.childId) return;
    await eventsRepo.upsert(event);
    nav(-1);
  };

  const remove = async () => {
    if (!isNew) await eventsRepo.delete(event.eventId);
    nav(-1);
  };

  return (
    <>
      <Header title={isNew ? "New event" : "Edit event"} back />
      <main className="app-main">
        <div className="card">
          <label>Title
            <input className="input" value={event.title}
              onChange={(e) => setEvent({ ...event, title: e.target.value })} />
          </label>
          <label>Child
            <select className="select" value={event.childId}
              onChange={(e) => setEvent({ ...event, childId: e.target.value })}>
              {children.map((c) => <option key={c.childId} value={c.childId}>{c.name}</option>)}
            </select>
          </label>
          <label>Type
            <select className="select" value={event.eventType}
              onChange={(e) => setEvent({ ...event, eventType: e.target.value as Event["eventType"] })}>
              {Object.values(EventType).map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </label>
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
            <input className="input" value={event.locationName}
              onChange={(e) => setEvent({ ...event, locationName: e.target.value })} />
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
          <label>Visibility
            <select className="select" value={event.visibilityScope}
              onChange={(e) => setEvent({ ...event, visibilityScope: e.target.value as Event["visibilityScope"] })}>
              {Object.values(VisibilityScope).map((v) => <option key={v} value={v}>{v}</option>)}
            </select>
          </label>
          <button className="btn btn--full" onClick={save} style={{ marginTop: 16 }}>Save</button>
          {!isNew && (
            <button className="btn btn--danger btn--full" onClick={remove} style={{ marginTop: 8 }}>
              Delete
            </button>
          )}
        </div>
      </main>
    </>
  );
}
