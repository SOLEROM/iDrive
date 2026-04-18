import "fake-indexeddb/auto";
import { afterEach } from "vitest";
import { __resetDb } from "@/storage/db";

afterEach(async () => {
  // Each test gets a fresh database.
  try {
    await indexedDB.databases?.().then((dbs) =>
      Promise.all(
        dbs.map((d) => d.name && indexedDB.deleteDatabase(d.name)),
      ),
    );
  } catch {
    // fake-indexeddb older versions may not expose .databases()
  }
  __resetDb();
});
