import { useNavigate } from "react-router-dom";
import { useApp } from "@/state/AppContext";

interface Props {
  title: string;
  back?: boolean;
  action?: { label: string; onClick: () => void };
}

export function Header({ title, back, action }: Props) {
  const nav = useNavigate();
  const { fileHandle, isSyncing, lastSyncAt, sync } = useApp();

  const syncLabel = isSyncing
    ? "Syncing…"
    : lastSyncAt
      ? `Synced ${formatAgo(lastSyncAt)}`
      : "Sync";

  return (
    <header className="app-header">
      <div className="row" style={{ gap: 8 }}>
        {back && (
          <button
            className="btn btn--ghost"
            style={{ padding: "4px 10px", minHeight: "auto", border: 0 }}
            onClick={() => nav(-1)}
            aria-label="Back"
          >
            ← Back
          </button>
        )}
        <h1>{title}</h1>
      </div>
      <div className="row" style={{ gap: 8 }}>
        {fileHandle && (
          <button
            className="btn btn--ghost"
            style={{ padding: "4px 10px", minHeight: "auto", fontSize: 13, opacity: isSyncing ? 0.6 : 1 }}
            onClick={sync}
            disabled={isSyncing}
            title={lastSyncAt ? `Last synced: ${new Date(lastSyncAt).toLocaleTimeString()}` : "Sync with file"}
          >
            ⟳ {syncLabel}
          </button>
        )}
        {action && (
          <button
            className="btn"
            style={{ padding: "6px 12px", minHeight: "auto" }}
            onClick={action.onClick}
          >
            {action.label}
          </button>
        )}
      </div>
    </header>
  );
}

function formatAgo(ts: number): string {
  const sec = Math.floor((Date.now() - ts) / 1000);
  if (sec < 60) return "just now";
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  return `${Math.floor(min / 60)}h ago`;
}
