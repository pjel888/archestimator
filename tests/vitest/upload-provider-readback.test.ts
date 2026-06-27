import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const providerReadback = JSON.parse(readFileSync(join(
  process.cwd(),
  ".ai/03_plans/2026-06-26-File-Upload-Audit-And-Improvement/evidence/upload-provider-readback.json",
), "utf8")) as {
  proofBoundary: string;
  projectId: string;
  passed: boolean;
  migrationVersionsPresent: string[];
  uploadTables: Array<{ name: string; rlsEnabled: boolean }>;
  removedStoragePoliciesPresent: unknown[];
  functionGrants: Array<{
    function: string;
    anonExecute: boolean;
    authenticatedExecute: boolean;
    serviceRoleExecute: boolean;
  }>;
  evidenceLimitations: string[];
};

describe("upload provider readback evidence", () => {
  it("records linked-provider migration, RLS, grant, and storage-policy readback without overstating proof", () => {
    expect(providerReadback).toMatchObject({
      proofBoundary: "linked-provider-readback",
      projectId: "ebxxqidacheyapmmzavr",
      passed: true,
    });
    expect(providerReadback.migrationVersionsPresent).toEqual(expect.arrayContaining([
      "20260626183000_upload_storage_direct_write_containment",
      "20260626184000_freeze_unscanned_component_attachment_approval",
      "20260626190000_upload_domain_tables",
      "20260626194500_upload_scan_status_taxonomy",
      "20260626200000_upload_scan_lifecycle_contracts",
    ]));
    expect(providerReadback.uploadTables).toEqual(expect.arrayContaining([
      { name: "upload_assets", rlsEnabled: true },
      { name: "upload_events", rlsEnabled: true },
      { name: "upload_sessions", rlsEnabled: true },
    ]));
    expect(providerReadback.removedStoragePoliciesPresent).toEqual([]);
    expect(providerReadback.functionGrants).toEqual(expect.arrayContaining([
      expect.objectContaining({ function: "record_upload_asset", anonExecute: false, authenticatedExecute: false, serviceRoleExecute: true }),
      expect.objectContaining({ function: "get_upload_asset_descriptor", anonExecute: false, authenticatedExecute: true, serviceRoleExecute: true }),
      expect.objectContaining({ function: "record_upload_scan_result", anonExecute: false, authenticatedExecute: false, serviceRoleExecute: true }),
    ]));
    expect(providerReadback.evidenceLimitations.join(" ")).toContain("does not replace auth-token proof-script scenarios");
    expect(providerReadback.evidenceLimitations.join(" ")).toContain("does not prove direct Supabase Storage operations");
  });
});
