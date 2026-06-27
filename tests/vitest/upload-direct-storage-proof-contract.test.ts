import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const CONTAINMENT_MIGRATION = "20260626183000_upload_storage_direct_write_containment.sql";
const DIRECT_STORAGE_POLICIES = [
  "project editors can upload own project images",
  "project editors can update own project images",
  "project editors can delete own project images",
  "workspace members can upload own component images",
  "workspace members can update own component images",
  "workspace members can delete own component images",
  "workspace members can upload own component attachments",
  "workspace members can update own component attachments",
  "workspace members can delete own component attachments",
  "workspace members can read component attachments",
];

function readMigration(fileName: string) {
  return readFileSync(join(process.cwd(), "supabase/migrations", fileName), "utf8");
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

describe("upload direct storage proof contract", () => {
  it("drops broad direct upload storage bypass policies", () => {
    const sql = readMigration(CONTAINMENT_MIGRATION);

    for (const policyName of DIRECT_STORAGE_POLICIES) {
      expect(sql).toContain(`drop policy if exists "${policyName}" on storage.objects;`);
      expect(sql).not.toMatch(new RegExp(`create\\s+policy\\s+"${escapeRegExp(policyName)}"`, "i"));
    }
  });

  it("does not recreate broad direct upload storage bypasses after the containment migration", () => {
    const laterSql = readdirSync(join(process.cwd(), "supabase/migrations"))
      .filter((fileName) => fileName >= CONTAINMENT_MIGRATION)
      .sort()
      .map(readMigration)
      .join("\n\n");

    for (const policyName of DIRECT_STORAGE_POLICIES) {
      expect(laterSql).not.toMatch(new RegExp(`create\\s+policy\\s+"${escapeRegExp(policyName)}"`, "i"));
    }
  });
});
