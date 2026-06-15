import { useEffect, useRef } from "react";
import type { AppParent } from "@/state/AppContext";

interface Props {
  parents: AppParent[];
  meId: string;
  onPick: (parentId: string, displayName: string) => void;
  /** Saved non-member drivers — shown (red) above the "Other…" entry. */
  externalDrivers?: string[];
  /** Picks a saved external driver by name. */
  onPickExternal?: (name: string) => void;
  /** Optional "Other…" handler — the parent should prompt for a free-text name. */
  onPickOther?: () => void;
  otherLabel?: string;
  onClose: () => void;
}

/**
 * Tiny popover for picking a driver — me first, then the rest, then any
 * saved external (non-member) drivers, then an optional "Other…" entry to
 * add a new external driver.
 */
export function MemberPicker({
  parents, meId, onPick, externalDrivers, onPickExternal, onPickOther, otherLabel, onClose,
}: Props) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [onClose]);

  const me = parents.find((p) => p.parentId === meId);
  const others = parents.filter((p) => p.parentId !== meId);

  return (
    <div
      ref={ref}
      role="menu"
      aria-label="Assign ride to"
      style={{
        position: "absolute",
        right: 0,
        top: "calc(100% + 4px)",
        background: "var(--surface)",
        border: "1px solid var(--border)",
        borderRadius: 10,
        boxShadow: "0 4px 16px rgba(0,0,0,0.18)",
        minWidth: 180,
        zIndex: 100,
        padding: 4,
      }}
    >
      {me && (
        <button
          type="button"
          role="menuitem"
          onClick={(e) => { e.stopPropagation(); onPick(me.parentId, me.displayName); onClose(); }}
          style={pickerBtn(true)}
        >
          {me.displayName} (you)
        </button>
      )}
      {others.length > 0 && (
        <div style={{ height: 1, background: "var(--border)", margin: "4px 0" }} />
      )}
      {others.map((p) => (
        <button
          type="button"
          role="menuitem"
          key={p.parentId}
          onClick={(e) => { e.stopPropagation(); onPick(p.parentId, p.displayName); onClose(); }}
          style={pickerBtn(false)}
        >
          {p.displayName}
        </button>
      ))}
      {others.length === 0 && me && !onPickOther && (
        <div style={{ padding: 8, fontSize: 11, color: "var(--muted)" }}>
          To add members, edit families.yaml.
        </div>
      )}
      {externalDrivers && externalDrivers.length > 0 && onPickExternal && (
        <>
          <div style={{ height: 1, background: "var(--border)", margin: "4px 0" }} />
          {externalDrivers.map((name) => (
            <button
              type="button"
              role="menuitem"
              key={name}
              onClick={(e) => { e.stopPropagation(); onPickExternal(name); onClose(); }}
              style={{ ...pickerBtn(false), color: "#ef4444" }}
            >
              {name}
            </button>
          ))}
        </>
      )}
      {onPickOther && (
        <>
          <div style={{ height: 1, background: "var(--border)", margin: "4px 0" }} />
          <button
            type="button"
            role="menuitem"
            onClick={(e) => { e.stopPropagation(); onPickOther(); onClose(); }}
            style={{ ...pickerBtn(false), color: "#ef4444", fontStyle: "italic" }}
          >
            {otherLabel ?? "Other…"}
          </button>
        </>
      )}
    </div>
  );
}

function pickerBtn(highlighted: boolean): React.CSSProperties {
  return {
    display: "block",
    width: "100%",
    textAlign: "left",
    padding: "8px 10px",
    background: highlighted ? "var(--primary-weak)" : "transparent",
    border: 0,
    borderRadius: 6,
    fontSize: 14,
    cursor: "pointer",
    color: "var(--fg)",
  };
}
