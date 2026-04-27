import { useEffect, useState } from "react";
import type { Child, Event, RideAssignment } from "@/domain/models";
import { listenSharedConfig, type SharedConfig } from "@/data/groupRepo";
import { listenParents, type AppParent } from "@/data/parentsRepo";
import { listenChildren } from "@/data/childrenRepo";
import { listenEvents } from "@/data/eventsRepo";
import { listenAssignments } from "@/data/assignmentsRepo";

export interface GroupData {
  parents: AppParent[];
  children: Child[];
  events: Event[];
  assignments: RideAssignment[];
  sharedConfig: SharedConfig;
}

const EMPTY: GroupData = {
  parents: [], children: [], events: [], assignments: [],
  sharedConfig: { globalLocations: [], globalActivities: [] },
};

export function useGroupData(groupId: string | null): GroupData {
  const [data, setData] = useState<GroupData>(EMPTY);

  useEffect(() => {
    if (!groupId) {
      setData(EMPTY);
      return;
    }
    const unsubs: (() => void)[] = [
      listenSharedConfig(groupId, (sharedConfig) => setData((d) => ({ ...d, sharedConfig }))),
      listenParents(groupId,      (parents)      => setData((d) => ({ ...d, parents }))),
      listenChildren(groupId,     (children)     => setData((d) => ({ ...d, children }))),
      listenEvents(groupId,       (events)       => setData((d) => ({ ...d, events }))),
      listenAssignments(groupId,  (assignments)  => setData((d) => ({ ...d, assignments }))),
    ];
    return () => unsubs.forEach((u) => u());
  }, [groupId]);

  return data;
}
