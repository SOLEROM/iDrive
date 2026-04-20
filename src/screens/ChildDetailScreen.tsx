import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Header } from "@/components/Header";
import { useApp } from "@/state/AppContext";
import { ChildColor } from "@/domain/enums";
import type { Child } from "@/domain/models";
import { getEveryDayLabel } from "@/lib/i18n";

export function ChildDetailScreen() {
  const { childId = "" } = useParams();
  const navigate = useNavigate();
  const { children, upsertChild, config } = useApp();

  const stored = children.find((c) => c.childId === childId) ?? null;
  const [draft, setDraft] = useState<Child | null>(stored);

  if (!stored) return (
    <><Header title="Child" back /><main className="app-main"><div className="card empty">Not found.</div></main></>
  );

  const save = async (patch: Partial<Child>) => {
    const updated = { ...stored, ...patch };
    setDraft(updated);
    await upsertChild(updated);
  };

  const current = draft ?? stored;

  return (
    <>
      <Header title={current.name} back />
      <main className="app-main">
        <div className="card">
          <label>Name
            <input className="input" value={current.name}
              onChange={(e) => setDraft({ ...current, name: e.target.value })}
              onBlur={(e) => save({ name: e.target.value })} />
          </label>
          <label>Color
            <select className="select" value={current.colorTag}
              onChange={(e) => save({ colorTag: e.target.value as ChildColor })}>
              {Object.values(ChildColor).map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </label>
          <label>Notes
            <textarea className="textarea" value={current.notes ?? ""}
              onChange={(e) => setDraft({ ...current, notes: e.target.value })}
              onBlur={(e) => save({ notes: e.target.value })} />
          </label>
        </div>

        <div className="card">
          <div className="row" style={{ justifyContent: "space-between", marginBottom: 8 }}>
            <h2 style={{ margin: 0 }}>Activities</h2>
            <button className="btn" onClick={() => navigate(`/children/${childId}/activities/new`)}>Add</button>
          </div>
          {current.activities.length === 0 && (
            <span className="chip chip--muted">No activities</span>
          )}
          {current.activities.map((activity, idx) => (
            <div key={idx} className="row"
              style={{ justifyContent: "space-between", padding: "6px 0", borderTop: "1px solid var(--border)", cursor: "pointer" }}
              onClick={() => navigate(`/children/${childId}/activities/${idx}`)}>
              <div className="row" style={{ gap: 8 }}>
                <span>{activity.name}</span>
                {activity.days.length === 0
                  ? <span className="chip">{getEveryDayLabel(config.language)}</span>
                  : activity.days.map((d) => <span className="chip" key={d}>{d}</span>)}
              </div>
              <span style={{ fontSize: 18, color: "var(--muted)", paddingRight: 4 }}>›</span>
            </div>
          ))}
        </div>

      </main>
    </>
  );
}
