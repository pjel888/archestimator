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
  scanLifecycleColumnsPresent: string[];
  directUploadSessionColumnsPresent: string[];
  scanRpcSignatures: Array<{
    function: string;
    identityArgs: string;
    anonExecute: boolean;
    authenticatedExecute: boolean;
    serviceRoleExecute: boolean;
  }>;
  directUploadRpcSignatures: Array<{
    function: string;
    identityArgs: string;
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
      "20260627024155_upload_scan_rpc_checksum_contracts",
      "20260627024318_upload_scan_lifecycle_scanned_at_readback",
      "20260627024438_upload_asset_session_consistency_scan_mutability",
      "20260627032615_upload_direct_signed_session_rpcs",
      "20260627034126_upload_direct_signed_session_schema_repair",
      "20260627034336_upload_direct_signed_session_event_taxonomy_repair",
      "20260627034619_upload_direct_signed_session_event_type_cast_repair",
    ]));
    expect(providerReadback.uploadTables).toEqual(expect.arrayContaining([
      { name: "upload_assets", rlsEnabled: true },
      { name: "upload_events", rlsEnabled: true },
      { name: "upload_sessions", rlsEnabled: true },
    ]));
    expect(providerReadback.removedStoragePoliciesPresent).toEqual([]);
    expect(providerReadback.functionGrants).toEqual(expect.arrayContaining([
      expect.objectContaining({ function: "record_upload_asset", anonExecute: false, authenticatedExecute: false, serviceRoleExecute: true }),
      expect.objectContaining({ function: "create_upload_session", anonExecute: false, authenticatedExecute: false, serviceRoleExecute: true }),
      expect.objectContaining({ function: "finalize_upload_session", anonExecute: false, authenticatedExecute: false, serviceRoleExecute: true }),
      expect.objectContaining({ function: "get_upload_asset_descriptor", anonExecute: false, authenticatedExecute: true, serviceRoleExecute: true }),
      expect.objectContaining({ function: "record_upload_scan_result", anonExecute: false, authenticatedExecute: false, serviceRoleExecute: true }),
    ]));
    expect(providerReadback.directUploadSessionColumnsPresent).toEqual(expect.arrayContaining([
      "file_name",
      "expires_at",
      "scan_status",
    ]));
    expect(providerReadback.scanLifecycleColumnsPresent).toEqual(expect.arrayContaining([
      "scan_provider",
      "scan_result",
      "scanned_at",
      "scan_override_checksum_sha256",
    ]));
    expect(providerReadback.scanRpcSignatures).toEqual(expect.arrayContaining([
      expect.objectContaining({
        function: "record_upload_scan_result",
        identityArgs: "target_asset_id uuid, expected_checksum_sha256 text, scanner_provider text, scanner_status upload_scan_status, scanner_result jsonb",
        anonExecute: false,
        authenticatedExecute: false,
        serviceRoleExecute: true,
      }),
      expect.objectContaining({
        function: "approve_upload_scan_override",
        identityArgs: "target_asset_id uuid, override_actor_user_id uuid, override_reason text, override_expires_at timestamp with time zone, expected_checksum_sha256 text",
        anonExecute: false,
        authenticatedExecute: false,
        serviceRoleExecute: true,
      }),
    ]));
    expect(providerReadback.directUploadRpcSignatures).toEqual(expect.arrayContaining([
      expect.objectContaining({
        function: "create_upload_session",
        identityArgs: "target_workspace_id uuid, actor_user_id uuid, upload_surface upload_surface, target_entity_type text, target_entity_id uuid, storage_bucket text, storage_path text, file_name text, content_type text, size_bytes bigint, checksum_sha256 text, session_expires_at timestamp with time zone, metadata jsonb",
        anonExecute: false,
        authenticatedExecute: false,
        serviceRoleExecute: true,
      }),
      expect.objectContaining({
        function: "finalize_upload_session",
        identityArgs: "target_upload_session_id uuid, target_workspace_id uuid, actor_user_id uuid, observed_content_type text, observed_size_bytes bigint, observed_checksum_sha256 text, observed_etag text, scan_status upload_scan_status, metadata jsonb",
        anonExecute: false,
        authenticatedExecute: false,
        serviceRoleExecute: true,
      }),
    ]));
    expect(providerReadback.evidenceLimitations.join(" ")).toContain("does not replace auth-token proof-script scenarios");
    expect(providerReadback.evidenceLimitations.join(" ")).toContain("does not prove direct Supabase Storage operations");
    expect(providerReadback.evidenceLimitations.join(" ")).toContain("browser/client direct-upload UX behavior");
  });
});
