import { ChildColorHex, type ChildColor } from "@/domain/enums";

interface Props {
  name: string;
  color: ChildColor;
  archived?: boolean;
  size?: "sm" | "md";
}

/**
 * Coloured pill with the child's name. The single source of truth for
 * "whose event/ride is this?".
 */
export function ChildBadge({ name, color, archived, size = "md" }: Props) {
  const hex = ChildColorHex[color];
  const padY = size === "sm" ? 1 : 2;
  const padX = size === "sm" ? 6 : 8;
  const fs = size === "sm" ? 11 : 12;
  const label = archived ? `${name} (archived)` : (name || "No child");
  const muted = archived || !name;
  return (
    <span
      aria-label={`Child: ${label}`}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
        padding: `${padY}px ${padX}px`,
        borderRadius: 999,
        fontSize: fs,
        fontWeight: 600,
        background: muted ? "var(--border)" : `${hex}26`,
        color: muted ? "var(--muted)" : hex,
        border: `1px solid ${muted ? "var(--border)" : hex}55`,
        whiteSpace: "nowrap",
        maxWidth: 140,
        overflow: "hidden",
        textOverflow: "ellipsis",
      }}
    >
      <span style={{
        width: 6, height: 6, borderRadius: "50%",
        background: muted ? "var(--muted)" : hex, flexShrink: 0,
      }} />
      {label}
    </span>
  );
}
