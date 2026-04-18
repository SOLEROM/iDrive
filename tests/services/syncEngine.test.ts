import { describe, it, expect } from "vitest";
import { SyncEngine } from "@/services/syncEngine";
import { MockDriveAdapter } from "@/remote/mock/mockDriveAdapter";
import { MockSheetsAdapter } from "@/remote/mock/mockSheetsAdapter";
import { parentsRepo, eventsRepo, childrenRepo } from "@/storage/repository";
import { newChild, newEvent, newParent } from "@/domain/models";

describe("SyncEngine — push queue to Drive/Sheets", () => {
  it("uploads a new private event through the queue", async () => {
    const drive = new MockDriveAdapter();
    const sheets = new MockSheetsAdapter();
    const engine = new SyncEngine(drive, sheets);

    const parent = await parentsRepo.upsert(
      newParent({ parentId: "p1", displayName: "Alex", email: "a@x.com", groupIds: [] }),
    );
    await childrenRepo.upsert(newChild({ childId: "c1", parentOwnerId: "p1", name: "Sam" }));
    await eventsRepo.upsert(newEvent({
      eventId: "e1",
      childId: "c1",
      title: "Private lesson",
      createdByParentId: parent.parentId,
      startDateTime: Date.now() + 24 * 3600_000,
      endDateTime: Date.now() + 25 * 3600_000,
    }));

    await engine.runOnce();

    const written = await drive.read(parent.parentId);
    expect(written).not.toBeNull();
    expect(written!.children).toHaveLength(1);
    expect(written!.children[0].childId).toBe("c1");
    // An unknown-group event should land as a private event on Drive
    expect(written!.privateEvents.some((e) => e.eventId === "e1")).toBe(true);
  });

  it("uploads a group event to the shared Sheet", async () => {
    const drive = new MockDriveAdapter();
    const sheets = new MockSheetsAdapter();
    const engine = new SyncEngine(drive, sheets);

    const parent = await parentsRepo.upsert(newParent({
      parentId: "p1", displayName: "Alex", email: "a@x.com",
      groupIds: ["group-1"],
    }));
    await eventsRepo.upsert(newEvent({
      eventId: "evt-shared",
      childId: "c1",
      groupId: "group-1",
      title: "Soccer match",
      createdByParentId: parent.parentId,
      startDateTime: Date.now() + 48 * 3600_000,
      endDateTime: Date.now() + 50 * 3600_000,
    }));

    await engine.runOnce();

    const sheetId = await sheets.ensureSheetExists("group-1", "group-1");
    const events = await sheets.readEvents(sheetId);
    expect(events.some((e) => e.eventId === "evt-shared")).toBe(true);
  });
});
