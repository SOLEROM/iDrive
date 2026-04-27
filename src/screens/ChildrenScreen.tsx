import { useState } from "react";
import { Link } from "react-router-dom";
import { Header } from "@/components/Header";
import { ChildDot } from "@/components/ChildDot";
import { ChildBadge } from "@/components/ChildBadge";
import { useApp } from "@/state/AppContext";
import { ChildColor } from "@/domain/enums";
import { newChild } from "@/domain/models";
import { newChildId } from "@/domain/ids";

export function ChildrenScreen() {
  const { parent, children, upsertChild } = useApp();
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  const [color, setColor] = useState<ChildColor>(ChildColor.BLUE);

  const save = async () => {
    if (!name.trim() || !parent) return;
    await upsertChild(newChild({
      childId: newChildId(),
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
                    key={c} type="button" onClick={() => setColor(c)} aria-label={c} data-color={c}
                    style={{
                      border: color === c ? "3px solid var(--primary)" : "1px solid var(--border)",
                      width: 32, height: 32, borderRadius: "50%",
                      background: `var(--color-${c.toLowerCase()})`,
                    }}
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
              <ChildBadge name={c.name} color={c.colorTag} archived={c.isArchived} />
              {c.notes && <p style={{ marginTop: 6 }}>{c.notes}</p>}
            </div>
          </Link>
        ))}
      </main>
    </>
  );
}
