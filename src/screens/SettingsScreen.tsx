import { useState } from "react";
import { Header } from "@/components/Header";
import { useApp } from "@/state/AppContext";
import { AppLanguage, LandingScreen, ThemeMode } from "@/domain/enums";
import { type AppLocalConfig } from "@/domain/config";
import { useInstallPrompt } from "@/lib/useInstallPrompt";

export function SettingsScreen() {
  const { parent, config, fileHandle, setConfig, closeFile, downloadFile, logOut } = useApp();
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

        {fileHandle && (
          <div className="card">
            <h2 style={{ marginTop: 0 }}>Sync</h2>
            <label>Auto-sync interval (minutes, 0 = off)
              <input className="input" type="number" min={0} max={60}
                value={config.syncIntervalMinutes}
                onChange={(e) => set("syncIntervalMinutes", Math.max(0, Math.min(60, Number(e.target.value))))} />
            </label>
          </div>
        )}

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
                    Chrome on iPhone can't install apps. Open this page in <strong>Safari</strong>, then tap
                    the Share button and choose <strong>Add to Home Screen</strong>.
                  </p>
                : isIOSSafari
                  ? <p style={{ fontSize: 13, color: "var(--muted)", marginBottom: 0 }}>
                      Tap the <strong>Share</strong> button at the bottom of Safari, then choose <strong>Add to Home Screen</strong>.
                    </p>
                  : <p style={{ fontSize: 13, color: "var(--muted)", marginBottom: 0 }}>
                      Open the browser menu and choose <strong>Add to Home Screen</strong>.
                    </p>
          )}
        </div>

        {!fileHandle && (
          <button className="btn btn--full" onClick={downloadFile} style={{ marginTop: 16 }}>
            Download idrive.xlsx
          </button>
        )}

        <button className="btn btn--full" onClick={logOut} style={{ marginTop: 8 }}>
          Switch user
        </button>

        <button className="btn btn--danger btn--full" onClick={closeFile} style={{ marginTop: 8 }}>
          Close file (erase all local data)
        </button>
      </main>
    </>
  );
}
