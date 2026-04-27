import { useState } from "react";
import { Header } from "@/components/Header";
import { useApp } from "@/state/AppContext";
import { AppLanguage, LandingScreen, ThemeMode } from "@/domain/enums";
import { type AppLocalConfig } from "@/domain/config";
import { useInstallPrompt } from "@/lib/useInstallPrompt";

export function SettingsScreen() {
  const { parent, parents, bundleMembers, config, setConfig, signOut, downloadFile, downloadAnalytics } = useApp();
  const { canInstall, install } = useInstallPrompt();
  const isStandalone =
    window.matchMedia("(display-mode: standalone)").matches ||
    !!(navigator as Navigator & { standalone?: boolean }).standalone;
  const ua = navigator.userAgent;
  const isIOS = /iphone|ipad|ipod/i.test(ua);
  const isIOSChrome = isIOS && /CriOS/i.test(ua);
  const isIOSSafari = isIOS && !isIOSChrome;
  const [newLocation, setNewLocation] = useState("");

  const set = <K extends keyof AppLocalConfig>(k: K, v: AppLocalConfig[K]) =>
    setConfig({ [k]: v } as Partial<AppLocalConfig>);

  const addLocation = () => {
    const loc = newLocation.trim();
    if (!loc || config.globalLocations.includes(loc)) return;
    setNewLocation("");
    set("globalLocations", [...config.globalLocations, loc]);
  };

  const removeLocation = (loc: string) => {
    set("globalLocations", config.globalLocations.filter((l) => l !== loc));
  };

  return (
    <>
      <Header title="Settings" />
      <main className="app-main">
        <div className="card">
          <h2 style={{ marginTop: 0 }}>Profile</h2>
          <p style={{ margin: 0 }}>{parent?.displayName}</p>
        </div>

        <div className="card">
          <h2 style={{ marginTop: 0 }}>Members</h2>
          {bundleMembers.length === 0 && (
            <p style={{ margin: "4px 0", fontSize: 14, color: "var(--muted)" }}>
              No members in families.yaml.
            </p>
          )}
          {bundleMembers.map((email) => {
            const p = parents.find((x) => (x.email ?? "").toLowerCase() === email);
            const isMe = !!p && p.parentId === parent?.parentId;
            const displayName = p?.displayName?.trim() || email.split("@")[0];
            const signedIn = !!p;
            return (
              <p key={email} style={{ margin: "4px 0", fontSize: 14 }}>
                <strong>{displayName}</strong>
                {isMe && " (you)"}{" "}
                <span style={{ color: "var(--muted)", fontSize: 12 }}>
                  {email}{!signedIn && " · not signed in yet"}
                </span>
              </p>
            );
          })}
          <p style={{ margin: "10px 0 0", fontSize: 12, color: "var(--muted)" }}>
            To add or remove members, edit families.yaml and run ./run.sh --firebase.
            New members appear here right away; the next time anyone signs in
            the group's roster on the server is refreshed automatically.
          </p>
        </div>

        <div className="card">
          <h2 style={{ marginTop: 0 }}>Appearance</h2>
          <label>Theme
            <select className="select" value={config.themeMode}
              onChange={(e) => set("themeMode", e.target.value as AppLocalConfig["themeMode"])}>
              {Object.values(ThemeMode).map((m) => <option key={m} value={m}>{m}</option>)}
            </select>
          </label>
          <label>Language
            <select className="select" value={config.language}
              onChange={(e) => set("language", e.target.value as AppLocalConfig["language"])}>
              {Object.values(AppLanguage).map((m) => <option key={m} value={m}>{m}</option>)}
            </select>
          </label>
          <label>Landing screen
            <select className="select" value={config.defaultLandingScreen}
              onChange={(e) => set("defaultLandingScreen", e.target.value as AppLocalConfig["defaultLandingScreen"])}>
              {Object.values(LandingScreen).map((m) => <option key={m} value={m}>{m}</option>)}
            </select>
          </label>
        </div>

        <div className="card">
          <h2 style={{ marginTop: 0 }}>Reminders</h2>
          <label>Default notification lead time (minutes)
            <input className="input" type="number" min={0} max={1440}
              value={config.notificationLeadTimeMinutesDefault}
              onChange={(e) => set("notificationLeadTimeMinutesDefault", Number(e.target.value))} />
          </label>
          <label className="row" style={{ marginTop: 6 }}>
            <input type="checkbox" checked={config.vibrateOnReminder}
              onChange={(e) => set("vibrateOnReminder", e.target.checked)} />
            &nbsp;Vibrate on reminder
          </label>
          <label className="row" style={{ marginTop: 6 }}>
            <input type="checkbox" checked={config.soundOnReminder}
              onChange={(e) => set("soundOnReminder", e.target.checked)} />
            &nbsp;Sound on reminder
          </label>
        </div>

        <div className="card">
          <h2 style={{ marginTop: 0 }}>Locations</h2>
          <div className="row" style={{ gap: 8, flexWrap: "wrap", marginBottom: 8 }}>
            {config.globalLocations.map((loc) => (
              <span key={loc} className="chip">
                {loc}&nbsp;
                <button
                  style={{ background: "none", border: "none", cursor: "pointer", padding: 0, lineHeight: 1 }}
                  onClick={() => removeLocation(loc)}
                  aria-label={`Remove ${loc}`}
                >×</button>
              </span>
            ))}
            {config.globalLocations.length === 0 && (
              <span className="chip chip--muted">None</span>
            )}
          </div>
          <div className="row" style={{ gap: 8 }}>
            <input className="input" style={{ flex: 1 }} placeholder="Add location…"
              value={newLocation}
              onChange={(e) => setNewLocation(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") addLocation(); }} />
            <button className="btn" onClick={addLocation}>Add</button>
          </div>
        </div>

        <div className="card">
          <h2 style={{ marginTop: 0 }}>About</h2>
          <p>Kids Rides for Crazy Parents PWA · v0.1.0</p>
          {!isStandalone && (
            canInstall
              ? <button className="btn btn--full" style={{ marginTop: 8 }} onClick={install}>Install app</button>
              : isIOSChrome
                ? <p style={{ fontSize: 13, color: "var(--muted)", marginBottom: 0 }}>
                    Chrome on iPhone can't install apps. Open in <strong>Safari</strong>, then Share → <strong>Add to Home Screen</strong>.
                  </p>
                : isIOSSafari
                  ? <p style={{ fontSize: 13, color: "var(--muted)", marginBottom: 0 }}>
                      Tap <strong>Share</strong> in Safari → <strong>Add to Home Screen</strong>.
                    </p>
                  : <p style={{ fontSize: 13, color: "var(--muted)", marginBottom: 0 }}>
                      Open the browser menu → <strong>Add to Home Screen</strong>.
                    </p>
          )}
        </div>

        <div className="card">
          <h2 style={{ marginTop: 0 }}>Export</h2>
          <button className="btn btn--full" onClick={downloadFile} style={{ marginTop: 4 }}>
            Download backup (.xlsx)
          </button>
          <p style={{ fontSize: 12, color: "var(--muted)", margin: "6px 0 12px" }}>
            Human-readable archive: config + monthly tabs.
          </p>
          <button className="btn btn--ghost btn--full" onClick={downloadAnalytics}>
            Export for analysis (.xlsx)
          </button>
          <p style={{ fontSize: 12, color: "var(--muted)", margin: "6px 0 0" }}>
            Flat sheets with joined names — open in Excel for pivots.
          </p>
        </div>

        <button className="btn btn--danger btn--full" onClick={signOut} style={{ marginTop: 8, marginBottom: 24 }}>
          Sign out
        </button>
      </main>
    </>
  );
}
