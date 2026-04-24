#!/usr/bin/env node
// Reads families.yaml and syncs to Firestore.
// Requires serviceAccount.json in the project root.
// Usage: node scripts/sync-families.js

import admin from "firebase-admin";
import { readFileSync } from "fs";
import { load as yamlLoad } from "js-yaml";
import { createHash } from "crypto";
import { fileURLToPath } from "url";
import { dirname, resolve } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");

// ── Init ──────────────────────────────────────────────────────────────────────
const serviceAccount = JSON.parse(readFileSync(resolve(root, "serviceAccount.json"), "utf8"));
admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
const db = admin.firestore();

// ── Load yaml ─────────────────────────────────────────────────────────────────
const { families } = yamlLoad(readFileSync(resolve(root, "families.yaml"), "utf8"));

function slugify(name) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function shortHash(str) {
  return createHash("sha256").update(str).digest("hex").slice(0, 8);
}

// ── Sync ──────────────────────────────────────────────────────────────────────
async function sync() {
  console.log(`Syncing ${families.length} familie(s)…\n`);

  for (const family of families) {
    const familyId = slugify(family.name);
    const members = (family.members || []).map((e) => e.toLowerCase().trim()).filter(Boolean);

    // Preserve existing groupId so we don't lose data on re-run
    const familyRef = db.collection("families").doc(familyId);
    const existing = await familyRef.get();
    const groupId = existing.exists ? existing.data().groupId : shortHash(familyId + "-group");

    // Write family doc
    await familyRef.set({ name: family.name, groupId, members });

    // Ensure group root doc exists (merge — never overwrite live data)
    await db.collection("groups").doc(groupId).set(
      { groupName: family.name, globalLocations: [], globalActivities: [] },
      { merge: true }
    );

    // Write emailIndex for each member
    const batch = db.batch();
    for (const email of members) {
      batch.set(db.collection("emailIndex").doc(email), { familyId, groupId, familyName: family.name });
    }
    await batch.commit();

    console.log(`✓ ${family.name} (groupId: ${groupId})`);
    for (const m of members) console.log(`    ${m}`);
    console.log();
  }

  console.log("Done.");
}

sync().catch((e) => { console.error(e); process.exit(1); });
