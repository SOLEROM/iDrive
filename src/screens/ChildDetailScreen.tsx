import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Header } from "@/components/Header";
import { ChildDot } from "@/components/ChildDot";
import { childrenRepo, eventsRepo } from "@/storage/repository";
import { ChildColor } from "@/domain/enums";
import type { Child, Event } from "@/domain/models";
import { fmtDateTime } from "@/lib/format";

export function ChildDetailScreen() {
  const { childId = "" } = useParams();
  const nav = useNavigate();
  const [child, setChild] = useState<Child | null>(null);
  const [events, setEvents] = useState<Event[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const c = await childrenRepo.byId(childId);
      const e = await eventsRepo.byChild(childId);
      if (!cancelled) {
        setChild(c ?? null);
        setEvents(e);
      }
    })();
    return () => { cancelled = true; };
  }, [childId]);

  if (!child) return <><Header title="Child" back /><main className="app-main"><div className="card empty">Not found.</div></main></>;

  const save = async (patch: Partial<Child>) => {
    const updated = await childrenRepo.upsert({ ...child, ...patch });
    setChild(updated);
  };

  const archive = async () => {
    await childrenRepo.archive(child.childId);
    nav("/children");
  };

  return (
    <>
      <Header title={child.name} back />
      <main className="app-main">
        <div className="card">
          <label>Name
            <input className="input" value={child.name} onChange={(e) => setChild({ ...child, name: e.target.value })}
              onBlur={(e) => save({ name: e.target.value })} />
          </label>
          <label>Color
            <select className="select" value={child.colorTag}
              onChange={(e) => save({ colorTag: e.target.value as ChildColor })}>
              {Object.values(ChildColor).map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </label>
          <label>Notes
            <textarea className="textarea" value={child.notes ?? ""}
              onChange={(e) => setChild({ ...child, notes: e.target.value })}
              onBlur={(e) => save({ notes: e.target.value })} />
          </label>
          <button className="btn btn--danger btn--full" onClick={archive} style={{ marginTop: 12 }}>
            Archive child
          </button>
        </div>

        <h2 style={{ margin: "20px 4px 8px", fontSize: 13, textTransform: "uppercase", color: "var(--muted)" }}>
          Events
        </h2>
        {events.length === 0 && <div className="card empty">No events for {child.name}.</div>}
        {events.map((e) => (
          <div className="card" key={e.eventId}>
            <div className="row">
              <ChildDot color={child.colorTag} />
              <strong>{e.title}</strong>
            </div>
            <p>{fmtDateTime(e.startDateTime)}</p>
          </div>
        ))}
      </main>
    </>
  );
}
