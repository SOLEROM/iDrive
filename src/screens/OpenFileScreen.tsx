import { useState } from "react";
import { useApp } from "@/state/AppContext";
import { defaultAppLocalConfig } from "@/domain/config";

export function OpenFileScreen() {
  const { openFile, openFileFromBuffer, createFile, isLoading, fileError } = useApp();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [creating, setCreating] = useState(false);

  const hasFSA = "showOpenFilePicker" in window;

  const handleOpen = async () => {
    await openFile();
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim()) return;
    await createFile({ ...defaultAppLocalConfig, loginName: name.trim(), loginEmail: email.trim() });
  };

  const handleFileInput = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await openFileFromBuffer(await file.arrayBuffer());
  };

  if (!hasFSA) {
    return (
      <div className="splash" style={{ padding: 24 }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 48, marginBottom: 8 }}>🚗👧🎒</div>
          <h1 style={{ fontSize: 22, margin: 0 }}>Kids Rides for Crazy Parents</h1>
          <p style={{ color: "var(--muted)", marginTop: 8, maxWidth: 320 }}>
            Open an existing <strong>idrive.xlsx</strong> or create a new one.
            Your data is saved on this device.
          </p>
        </div>

        {fileError && (
          <div className="card" style={{ borderLeft: "3px solid var(--danger, red)", maxWidth: 360 }}>
            <p style={{ margin: 0, color: "var(--danger, red)" }}>{fileError}</p>
          </div>
        )}

        <div className="card" style={{ width: "min(100%, 360px)" }}>
          <h2 style={{ marginTop: 0 }}>Open existing file</h2>
          <p style={{ color: "var(--muted)", fontSize: 13, marginTop: 0 }}>
            Select your idrive.xlsx from Files.
          </p>
          <label className="btn btn--full" style={{ display: "block", textAlign: "center", cursor: "pointer" }}>
            {isLoading ? "Loading…" : "Choose idrive.xlsx"}
            <input type="file" accept=".xlsx" style={{ display: "none" }} onChange={handleFileInput} disabled={isLoading} />
          </label>
        </div>

        <div className="card" style={{ width: "min(100%, 360px)" }}>
          <h2 style={{ marginTop: 0 }}>
            <button
              style={{ all: "unset", cursor: "pointer", display: "flex", alignItems: "center", gap: 8 }}
              onClick={() => setCreating((v) => !v)}
            >
              Create new file {creating ? "▾" : "▸"}
            </button>
          </h2>
          {creating && (
            <form onSubmit={handleCreate}>
              <label>
                Your name
                <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Alex Parent" />
              </label>
              <label>
                Email
                <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="alex@example.com" />
              </label>
              <button className="btn btn--full" type="submit" disabled={isLoading || !name.trim() || !email.trim()} style={{ marginTop: 12 }}>
                {isLoading ? "Creating…" : "Create new file"}
              </button>
            </form>
          )}
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
          All data lives in your <strong>idrive.xlsx</strong> file — open it or create a new one.
        </p>
      </div>

      {fileError && (
        <div className="card" style={{ borderLeft: "3px solid var(--danger, red)", maxWidth: 360 }}>
          <p style={{ margin: 0, color: "var(--danger, red)" }}>{fileError}</p>
        </div>
      )}

      <div className="card" style={{ width: "min(100%, 360px)" }}>
        <h2 style={{ marginTop: 0 }}>Open existing file</h2>
        <p style={{ color: "var(--muted)", fontSize: 13, marginTop: 0 }}>
          Select your idrive.xlsx from disk.
        </p>
        <button className="btn btn--full" onClick={handleOpen} disabled={isLoading}>
          {isLoading ? "Loading…" : "Open idrive.xlsx"}
        </button>
      </div>

      <div className="card" style={{ width: "min(100%, 360px)" }}>
        <h2 style={{ marginTop: 0 }}>
          <button
            style={{ all: "unset", cursor: "pointer", display: "flex", alignItems: "center", gap: 8 }}
            onClick={() => setCreating((v) => !v)}
          >
            Create new file {creating ? "▾" : "▸"}
          </button>
        </h2>
        {creating && (
          <form onSubmit={handleCreate}>
            <label>
              Your name
              <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Alex Parent" />
            </label>
            <label>
              Email
              <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="alex@example.com" />
            </label>
            <button className="btn btn--full" type="submit" disabled={isLoading || !name.trim() || !email.trim()} style={{ marginTop: 12 }}>
              {isLoading ? "Creating…" : "Create idrive.xlsx"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
