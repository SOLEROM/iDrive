import { useState } from "react";
import { useApp } from "@/state/AppContext";

export function SignInScreen() {
  const { signIn } = useApp();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim()) return;
    setBusy(true);
    try { await signIn(name.trim(), email.trim()); }
    finally { setBusy(false); }
  };

  return (
    <div className="splash" style={{ padding: 24 }}>
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: 48, marginBottom: 8 }}>🚗👧🎒</div>
        <h1 style={{ fontSize: 22, margin: 0 }}>Kids Rides & Classes</h1>
        <p style={{ color: "var(--muted)", marginTop: 8, maxWidth: 320 }}>
          Coordinate children's classes and shared rides with your parent group.
        </p>
      </div>
      <form className="card" style={{ width: "min(100%, 360px)" }} onSubmit={submit}>
        <label>
          Your name
          <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Alex Parent" />
        </label>
        <label>
          Email
          <input
            className="input"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="alex@example.com"
          />
        </label>
        <button className="btn btn--full" type="submit" disabled={busy} style={{ marginTop: 16 }}>
          {busy ? "Signing in…" : "Get started"}
        </button>
        <p style={{ fontSize: 12, color: "var(--muted)", marginTop: 10 }}>
          In this build, auth is mocked locally. A real build would redirect through
          Google OAuth to use Drive and Sheets as storage.
        </p>
      </form>
    </div>
  );
}
