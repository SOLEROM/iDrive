import { useState } from "react";
import { useApp } from "@/state/AppContext";

export function OpenFileScreen() {
  const {
    openFile, openFileFromBuffer, createFile,
    addParentAndSwitch, switchParent,
    parents, fileLoaded, isLoading, fileError,
  } = useApp();
  const [newUserName, setNewUserName] = useState("");
  const [addingUser, setAddingUser] = useState(false);

  const hasFSA = "showOpenFilePicker" in window;

  const handleFileInput = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await openFileFromBuffer(await file.arrayBuffer());
  };

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserName.trim()) return;
    await addParentAndSwitch(newUserName.trim());
  };

  // ── Stage 2: file is loaded → who are you? ───────────────────────────────
  if (fileLoaded) {
    const alwaysShowForm = parents.length === 0;
    return (
      <div className="splash" style={{ padding: 24 }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 48, marginBottom: 8 }}>🚗👧🎒</div>
          <h1 style={{ fontSize: 22, margin: 0 }}>Who are you?</h1>
        </div>

        <div className="card" style={{ width: "min(100%, 360px)" }}>
          {parents.map((p) => (
            <button
              key={p.parentId}
              className="btn btn--full"
              style={{ marginBottom: 8 }}
              onClick={() => switchParent(p.parentId)}
            >
              {p.displayName}
            </button>
          ))}

          <div style={parents.length > 0 ? { borderTop: "1px solid var(--border)", marginTop: 8, paddingTop: 12 } : undefined}>
            {!alwaysShowForm && (
              <button
                style={{ all: "unset", cursor: "pointer", display: "flex", alignItems: "center", gap: 8, fontWeight: 500 }}
                onClick={() => setAddingUser((v) => !v)}
              >
                Add new user {addingUser ? "▾" : "▸"}
              </button>
            )}
            {(alwaysShowForm || addingUser) && (
              <form onSubmit={handleAddUser} style={!alwaysShowForm ? { marginTop: 10 } : undefined}>
                <input
                  className="input"
                  value={newUserName}
                  onChange={(e) => setNewUserName(e.target.value)}
                  placeholder="Your name"
                  autoFocus
                />
                <button className="btn btn--full" type="submit" disabled={isLoading || !newUserName.trim()} style={{ marginTop: 8 }}>
                  {isLoading ? "Adding…" : "Add & sign in"}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ── Stage 1: no file yet → open or create ────────────────────────────────
  if (!hasFSA) {
    return (
      <div className="splash" style={{ padding: 24 }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 48, marginBottom: 8 }}>🚗👧🎒</div>
          <h1 style={{ fontSize: 22, margin: 0 }}>Kids Rides for Crazy Parents</h1>
          <p style={{ color: "var(--muted)", marginTop: 8, maxWidth: 320 }}>
            Open an existing <strong>idrive.xlsx</strong> or create a new one.
          </p>
        </div>

        {fileError && (
          <div className="card" style={{ borderLeft: "3px solid var(--danger, red)", maxWidth: 360 }}>
            <p style={{ margin: 0, color: "var(--danger, red)" }}>{fileError}</p>
          </div>
        )}

        <div className="card" style={{ width: "min(100%, 360px)" }}>
          <label className="btn btn--full" style={{ display: "block", textAlign: "center", cursor: "pointer" }}>
            {isLoading ? "Loading…" : "Open idrive.xlsx"}
            <input type="file" accept=".xlsx" style={{ display: "none" }} onChange={handleFileInput} disabled={isLoading} />
          </label>
          <button className="btn btn--full" style={{ marginTop: 8 }} onClick={createFile} disabled={isLoading}>
            {isLoading ? "Creating…" : "Create new file"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="splash" style={{ padding: 24 }}>
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: 48, marginBottom: 8 }}>🚗👧🎒</div>
        <h1 style={{ fontSize: 22, margin: 0 }}>Kids Rides for Crazy Parents</h1>
        <p style={{ color: "var(--muted)", marginTop: 8, maxWidth: 320 }}>
          Open an existing <strong>idrive.xlsx</strong> or create a new one.
        </p>
      </div>

      {fileError && (
        <div className="card" style={{ borderLeft: "3px solid var(--danger, red)", maxWidth: 360 }}>
          <p style={{ margin: 0, color: "var(--danger, red)" }}>{fileError}</p>
        </div>
      )}

      <div className="card" style={{ width: "min(100%, 360px)" }}>
        <button className="btn btn--full" onClick={openFile} disabled={isLoading}>
          {isLoading ? "Loading…" : "Open idrive.xlsx"}
        </button>
        <button className="btn btn--full" style={{ marginTop: 8 }} onClick={createFile} disabled={isLoading}>
          {isLoading ? "Creating…" : "Create new file"}
        </button>
      </div>
    </div>
  );
}
