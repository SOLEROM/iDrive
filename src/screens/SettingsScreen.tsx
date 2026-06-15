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
  const [newDriver, setNewDriver] = useState("");
  const [testLog, setTestLog] = useState<string[]>([]);
  const [testBusy, setTestBusy] = useState(false);

  const set = <K extends keyof AppLocalConfig>(k: K, v: AppLocalConfig[K]) =>
    setConfig({ [k]: v } as Partial<AppLocalConfig>);

  // Test alarm: schedules a notification ~60s out and logs each diagnostic
  // step so we can tell whether the OS/browser actually fired it. Uses the
  // Notification Triggers API (survives PWA close) when the runtime exposes
  // it, otherwise falls back to in-tab setTimeout (foreground-only).
  const appendLog = (msg: string) =>
    setTestLog((prev) => [...prev, `[${new Date().toLocaleTimeString()}] ${msg}`]);

  const runTestAlarm = async () => {
    setTestLog([]);
    setTestBusy(true);
    try {
      appendLog(`UA: ${navigator.userAgent.slice(0, 70)}${navigator.userAgent.length > 70 ? "…" : ""}`);
      appendLog(`installed (standalone): ${isStandalone}`);
      if (!("Notification" in window)) {
        appendLog("FAIL: Notification API not supported in this browser");
        return;
      }
      appendLog(`Notification.permission: ${Notification.permission}`);
      if (Notification.permission === "default") {
        appendLog("Requesting permission…");
        const r = await Notification.requestPermission();
        appendLog(`permission result: ${r}`);
      }
      if (Notification.permission !== "granted") {
        appendLog("FAIL: permission not granted — enable notifications for this site/app in OS settings");
        return;
      }
      const swSupported = "serviceWorker" in navigator;
      appendLog(`serviceWorker available: ${swSupported}`);
      let registration: ServiceWorkerRegistration | null = null;
      if (swSupported) {
        try {
          registration = await navigator.serviceWorker.ready;
          appendLog(`SW state: ${registration.active?.state ?? "unknown"}, scope: ${registration.scope}`);
        } catch (e) {
          appendLog(`SW error: ${(e as Error).message}`);
        }
      }
      const triggersSupported = "TimestampTrigger" in window;
      appendLog(`TimestampTrigger (background-survives-close): ${triggersSupported}`);
      appendLog(`navigator.vibrate available: ${"vibrate" in navigator}`);

      const fireAt = Date.now() + 60_000;
      appendLog(`Scheduling test alarm for ${new Date(fireAt).toLocaleTimeString()} (+60s)`);

      if (triggersSupported && registration) {
        try {
          const opts = {
            body: "Fired via service worker TimestampTrigger",
            tag: "idrive-test-alarm",
            showTrigger: new (window as unknown as { TimestampTrigger: new (ts: number) => unknown })
              .TimestampTrigger(fireAt),
          } as NotificationOptions;
          await registration.showNotification("Test alarm", opts);
          appendLog("Scheduled via SW showTrigger — should fire even if PWA is closed");
          return;
        } catch (e) {
          appendLog(`SW showTrigger failed: ${(e as Error).message} — falling back to in-tab timer`);
        }
      }

      appendLog("Using in-tab setTimeout + SW showNotification — only fires while this PWA is open");
      setTimeout(() => {
        void (async () => {
          if (!registration) {
            appendLog("FAIL: no service worker registration — cannot show notification");
            return;
          }
          try {
            await registration.showNotification("Test alarm", {
              body: "Fired via in-tab setTimeout (SW showNotification)",
              tag: "idrive-test-alarm",
            });
            appendLog(`Fired notification at ${new Date().toLocaleTimeString()}`);
          } catch (e) {
            appendLog(`showNotification FAIL: ${(e as Error).message}`);
          }
          if (config.vibrateOnReminder && "vibrate" in navigator) navigator.vibrate([300, 100, 300]);
        })();
      }, fireAt - Date.now());
    } catch (e) {
      appendLog(`UNCAUGHT: ${(e as Error).message}`);
    } finally {
      setTestBusy(false);
    }
  };

  const addLocation = () => {
    const loc = newLocation.trim();
    if (!loc || config.globalLocations.includes(loc)) return;
    setNewLocation("");
    set("globalLocations", [...config.globalLocations, loc]);
  };

  const removeLocation = (loc: string) => {
    set("globalLocations", config.globalLocations.filter((l) => l !== loc));
  };

  const addDriver = () => {
    const name = newDriver.trim();
    if (!name || config.globalExternalDrivers.includes(name)) return;
    setNewDriver("");
    set("globalExternalDrivers", [...config.globalExternalDrivers, name]);
  };

  const removeDriver = (name: string) => {
    set("globalExternalDrivers", config.globalExternalDrivers.filter((d) => d !== name));
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

          <div style={{ marginTop: 16, paddingTop: 12, borderTop: "1px solid var(--border)" }}>
            <h3 style={{ margin: "0 0 4px", fontSize: 14 }}>Test alarm</h3>
            <p style={{ margin: "0 0 8px", fontSize: 12, color: "var(--muted)" }}>
              Heads-up: alarms currently use an in-page timer + browser Notification,
              not Android's system AlarmManager. They reliably fire only while the
              PWA is open. Tap below to schedule a test in 60 seconds and watch the
              diagnostic log — keep the app open OR close it to test background firing.
            </p>
            <button
              className="btn btn--full"
              onClick={runTestAlarm}
              disabled={testBusy}
              style={{ marginBottom: 8 }}
            >
              {testBusy ? "Scheduling…" : "Schedule test alarm (+60s)"}
            </button>
            {testLog.length > 0 && (
              <pre style={{
                margin: 0, padding: 8,
                background: "var(--surface)", border: "1px solid var(--border)",
                borderRadius: 6, fontSize: 11, lineHeight: 1.35,
                whiteSpace: "pre-wrap", wordBreak: "break-word",
                maxHeight: 240, overflow: "auto",
              }}>
                {testLog.join("\n")}
              </pre>
            )}
            <p style={{ margin: "8px 0 0", fontSize: 11, color: "var(--muted)" }}>
              For reliable alarms when the app is closed: Android → Settings →
              Apps → (this PWA) → Notifications ON, Battery → unrestricted.
              True background alarms require Web Push (not yet wired up).
            </p>
          </div>
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
          <h2 style={{ marginTop: 0 }}>External drivers</h2>
          <p style={{ margin: "0 0 8px", fontSize: 12, color: "var(--muted)" }}>
            Non-member drivers you can assign a ride to. They show up (in red)
            in the driver picker on the Rides Board.
          </p>
          <div className="row" style={{ gap: 8, flexWrap: "wrap", marginBottom: 8 }}>
            {config.globalExternalDrivers.map((name) => (
              <span key={name} className="chip" style={{ color: "#ef4444" }}>
                {name}&nbsp;
                <button
                  style={{ background: "none", border: "none", cursor: "pointer", padding: 0, lineHeight: 1, color: "#ef4444" }}
                  onClick={() => removeDriver(name)}
                  aria-label={`Remove ${name}`}
                >×</button>
              </span>
            ))}
            {config.globalExternalDrivers.length === 0 && (
              <span className="chip chip--muted">None</span>
            )}
          </div>
          <div className="row" style={{ gap: 8 }}>
            <input className="input" style={{ flex: 1 }} placeholder="Add driver…"
              value={newDriver}
              onChange={(e) => setNewDriver(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") addDriver(); }} />
            <button className="btn" onClick={addDriver}>Add</button>
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
