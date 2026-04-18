import { useState } from "react";
import { Link } from "react-router-dom";
import { Header } from "@/components/Header";
import { ChildDot } from "@/components/ChildDot";
import { useLiveQuery } from "@/lib/useLiveQuery";
import { childrenRepo } from "@/storage/repository";
import { useApp } from "@/state/AppContext";
import { ChildColor } from "@/domain/enums";
import { newChild } from "@/domain/models";

export function ChildrenScreen() {
  const { parent } = useApp();
  const children = useLiveQuery(() => childrenRepo.observeAll(), []);
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  const [color, setColor] = useState<ChildColor>(ChildColor.BLUE);

  const save = async () => {
    if (!name.trim() || !parent) return;
    await childrenRepo.upsert(newChild({
      childId: `c-${Math.random().toString(36).slice(2, 10)}`,
      parentOwnerId: parent.parentId,
      name: name.trim(),
      colorTag: color,
    }));
    setName("");
    setColor(ChildColor.BLUE);
    setAdding(false);
  };

  return (
    <>
      <Header
        title="Children"
        action={{ label: adding ? "Cancel" : "+ Add", onClick: () => setAdding((v) => !v) }}
      />
      <main className="app-main">
        {adding && (
          <div className="card">
            <label>Name
              <input className="input" value={name} onChange={(e) => setName(e.target.value)} />
            </label>
            <label>Color
              <div className="row" style={{ flexWrap: "wrap", gap: 8, marginTop: 6 }}>
                {Object.values(ChildColor).map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setColor(c)}
                    style={{
                      border: color === c ? "3px solid var(--primary)" : "1px solid var(--border)",
                      width: 32, height: 32, borderRadius: "50%",
                      background: `var(--color-${c.toLowerCase()})`,
                    }}
                    aria-label={c}
                    data-color={c}
                  >
                    <ChildDot color={c} />
                  </button>
                ))}
              </div>
            </label>
            <button className="btn btn--full" onClick={save} style={{ marginTop: 12 }}>Save</button>
          </div>
        )}
        {children.length === 0 && !adding && (
          <div className="card empty">No children yet. Tap + Add.</div>
        )}
        {children.map((c) => (
          <Link to={`/children/${c.childId}`} key={c.childId}>
            <div className="card">
              <div className="row">
                <ChildDot color={c.colorTag} />
                <strong>{c.name}</strong>
              </div>
              {c.notes && <p>{c.notes}</p>}
            </div>
          </Link>
        ))}
      </main>
    </>
  );
}
