import { Header } from "@/components/Header";
import { useApp } from "@/state/AppContext";
import { AppLanguage, LandingScreen, ThemeMode } from "@/domain/enums";
import type { AppLocalConfig } from "@/domain/config";

export function SettingsScreen() {
  const { parent, signOut, config, setConfig, sync, syncState } = useApp();

  const set = <K extends keyof AppLocalConfig>(k: K, v: AppLocalConfig[K]) =>
    setConfig({ [k]: v } as Partial<AppLocalConfig>);

  return (
    <>
      <Header title="Settings" />
      <main className="app-main">
        <div className="card">
          <h2 style={{ marginTop: 0 }}>Profile</h2>
          <p>{parent?.displayName}</p>
          <p className="chip chip--muted">{parent?.email}</p>
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
          <h2 style={{ marginTop: 0 }}>Sync</h2>
          <p>Status: <span className="chip">{syncState.status}</span></p>
          <label className="row" style={{ marginTop: 6 }}>
            <input type="checkbox" checked={config.backgroundSyncEnabled}
              onChange={(e) => set("backgroundSyncEnabled", e.target.checked)} />
            &nbsp;Background sync
          </label>
          <button className="btn btn--ghost btn--full" style={{ marginTop: 12 }}
            onClick={() => sync.runOnce()}>Sync now</button>
        </div>

        <div className="card">
          <h2 style={{ marginTop: 0 }}>About</h2>
          <p>Kids Rides & Classes PWA · v0.1.0</p>
          <p>Installable from your browser's "Add to Home Screen" menu.</p>
        </div>

        <button className="btn btn--danger btn--full" onClick={signOut} style={{ marginTop: 16 }}>
          Sign out (wipes local data)
        </button>
      </main>
    </>
  );
}
