import type { PrivateDriveData } from "./privateDriveData";

/**
 * Abstract Drive adapter. Implementations: MockDriveAdapter (in-memory, for
 * local-first dev) and a future GoogleDriveAdapter that talks to the real API.
 */
export interface DriveAdapter {
  /** Fetch the parent's private data file; returns null if none exists yet. */
  read(parentId: string): Promise<PrivateDriveData | null>;

  /** Overwrite the parent's private data file with `data`. */
  write(parentId: string, data: PrivateDriveData): Promise<void>;
}
