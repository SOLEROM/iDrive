import { useApp } from "@/state/AppContext";

export function SyncBanner() {
  const { syncState } = useApp();
  if (syncState.status === "IDLE") return null;
  if (syncState.status === "RUNNING") {
    return <div className="banner banner--info">Syncing…</div>;
  }
  if (syncState.status === "ERROR") {
    return (
      <div className="banner banner--danger">Sync failed: {syncState.error}</div>
    );
  }
  return null;
}
