import { useEffect, useState } from "react";
import { applyUpdate, isUpdateAvailable, onUpdateAvailable } from "@/pwa/registerSW";

export function UpdateBanner() {
  const [available, setAvailable] = useState(isUpdateAvailable());
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => onUpdateAvailable(() => setAvailable(true)), []);

  if (!available || dismissed) return null;
  return (
    <div className="banner banner--info"
      style={{ position: "fixed", left: 12, right: 12, top: 8, zIndex: 30 }}
      role="status"
    >
      <div className="row row--between">
        <span>New version available.</span>
        <div className="row" style={{ gap: 6 }}>
          <button className="btn" style={{ padding: "4px 10px", minHeight: "auto", fontSize: 12 }}
            onClick={() => void applyUpdate()}>Reload</button>
          <button className="btn btn--ghost" style={{ padding: "4px 10px", minHeight: "auto", fontSize: 12 }}
            onClick={() => setDismissed(true)}>Later</button>
        </div>
      </div>
    </div>
  );
}
