import { useState } from "react";

interface Props {
  isOn: boolean;
  leadMinutes: number;
  onEnable: (minutes: number) => void;
  onDisable: () => void;
  /** Stop click propagation on the bell tap (use when inside a clickable card) */
  stopPropagation?: boolean;
}

export function AlarmToggle({ isOn, leadMinutes, onEnable, onDisable, stopPropagation }: Props) {
  const [showDialog, setShowDialog] = useState(false);
  const [draft, setDraft] = useState(leadMinutes);

  const handleTap = (e: React.MouseEvent) => {
    if (stopPropagation) e.stopPropagation();
    if (isOn) {
      onDisable();
    } else {
      setDraft(leadMinutes);
      setShowDialog(true);
    }
  };

  const confirm = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowDialog(false);
    onEnable(Math.max(1, draft));
  };

  const cancel = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowDialog(false);
  };

  return (
    <>
      <button
        onClick={handleTap}
        title={isOn ? `Alarm ${leadMinutes} min before – tap to mute` : "Alarm off – tap to set"}
        style={{
          background: "none", border: "none", cursor: "pointer",
          fontSize: 20, lineHeight: 1, padding: "2px 4px",
          opacity: isOn ? 1 : 0.35,
        }}
      >
        {isOn ? "🔔" : "🔕"}
      </button>

      {showDialog && (
        <div
          style={{
            position: "fixed", inset: 0,
            background: "rgba(0,0,0,0.55)",
            display: "flex", alignItems: "center", justifyContent: "center",
            zIndex: 200,
          }}
          onClick={cancel}
        >
          <div
            style={{
              background: "var(--surface)",
              borderRadius: "var(--radius)",
              padding: 20, width: 260,
              boxShadow: "var(--shadow)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ margin: "0 0 6px", fontSize: 16 }}>Set reminder</h3>
            <p style={{ margin: "0 0 10px", color: "var(--muted)", fontSize: 14 }}>
              Minutes before the ride
            </p>
            <input
              type="number" min={1} max={1440}
              className="input"
              value={draft}
              onChange={(e) => setDraft(Number(e.target.value))}
              autoFocus
            />
            <div className="row" style={{ gap: 8, marginTop: 12 }}>
              <button
                className="btn btn--full"
                style={{ minHeight: "auto", padding: "10px" }}
                onClick={confirm}
              >
                Set alarm
              </button>
              <button
                className="btn btn--ghost btn--full"
                style={{ minHeight: "auto", padding: "10px" }}
                onClick={cancel}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
