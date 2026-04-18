import { AssignmentStatus } from "@/domain/enums";

const CLASS: Record<AssignmentStatus, string> = {
  UNASSIGNED: "chip chip--muted",
  VOLUNTEERED: "chip",
  CONFIRMED: "chip chip--ok",
  COMPLETED: "chip chip--ok",
  CONFLICT: "chip chip--danger",
  CANCELLED: "chip chip--muted",
};

export function RideStatusChip({ status }: { status: AssignmentStatus }) {
  return <span className={CLASS[status]}>{status}</span>;
}
