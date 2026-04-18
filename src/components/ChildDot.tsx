import { ChildColorHex, type ChildColor } from "@/domain/enums";

export function ChildDot({ color }: { color: ChildColor }) {
  return <span className="child-dot" style={{ background: ChildColorHex[color] }} />;
}
