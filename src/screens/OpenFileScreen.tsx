import { useState } from "react";
import { useApp } from "@/state/AppContext";

export function OpenFileScreen() {
  const { signInWithGoogle } = useApp();
  const [error, setError] = useState("");

  return (
    <div className="splash" style={{ padding: 24 }}>
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: 48, marginBottom: 8 }}>🚗👧🎒</div>
        <h1 style={{ fontSize: 22, margin: 0 }}>Kids Rides</h1>
        <p style={{ color: "var(--muted)", marginTop: 8, maxWidth: 300 }}>
          Sign in to sync your group's rides and classes in real time.
        </p>
      </div>
      <div className="card" style={{ width: "min(100%, 360px)" }}>
        <button
          className="btn btn--full"
          onClick={() => { setError(""); signInWithGoogle().catch((e) => setError(String(e))); }}
        >
          Sign in with Google
        </button>
        {error && <p style={{ margin: "8px 0 0", color: "var(--danger)", fontSize: 13 }}>{error}</p>}
      </div>
    </div>
  );
}
