import type { DriveAdapter } from "../driveAdapter";
import type { PrivateDriveData } from "../privateDriveData";

export class MockDriveAdapter implements DriveAdapter {
  private store = new Map<string, PrivateDriveData>();

  async read(parentId: string): Promise<PrivateDriveData | null> {
    return this.store.get(parentId) ?? null;
  }

  async write(parentId: string, data: PrivateDriveData): Promise<void> {
    this.store.set(parentId, data);
  }
}
