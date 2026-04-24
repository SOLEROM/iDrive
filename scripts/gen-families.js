#!/usr/bin/env node
// Converts families.yaml → src/familiesData.ts (embedded in the app bundle).
// Run automatically by ./run.sh --firebase before vite build.

import { readFileSync, writeFileSync } from "fs";
import { load as yamlLoad } from "js-yaml";
import { createHash } from "crypto";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const { families } = yamlLoad(readFileSync(resolve(root, "families.yaml"), "utf8"));

const data = families.map((f) => ({
  name: f.name,
  // Deterministic groupId from family name — same name always → same group
  groupId: createHash("sha256").update(f.name.toLowerCase().trim()).digest("hex").slice(0, 10),
  members: (f.members || []).map((e) => e.toLowerCase().trim()).filter(Boolean),
}));

const ts = [
  "// Auto-generated from families.yaml — do not edit directly.",
  "export interface FamilyEntry { name: string; groupId: string; members: string[]; }",
  `export const families: FamilyEntry[] = ${JSON.stringify(data, null, 2)};`,
  "",
].join("\n");

writeFileSync(resolve(root, "src/familiesData.ts"), ts);
console.log(`✓ Generated src/familiesData.ts (${data.length} family/families)`);
for (const f of data) {
  console.log(`  ${f.name}: ${f.members.length} member(s), groupId=${f.groupId}`);
}
