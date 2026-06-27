import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

describe("upload scan RPC provider proof script", () => {
  it("requires explicit provider mode and refuses unexpected Supabase projects", () => {
    const script = readFileSync(join(process.cwd(), "scripts/prove-upload-scan-rpc-provider-postgres.ts"), "utf8");

    expect(script).toContain("#!/usr/bin/env bun");
    expect(script).toContain("ARCH_UPLOAD_SCAN_RPC_PROOF");
    expect(script).toContain("ARCH_UPLOAD_SCAN_RPC_PROOF_ENV_FILE");
    expect(script).toContain('EXPECTED_PROJECT_REF = "ebxxqidacheyapmmzavr"');
    expect(script).toContain("provider-proof-skipped");
    expect(script).toContain("provider-proof-refused");
    expect(script).toContain("linked-provider-scan-rpc-readback");
    expect(script).toContain("cleanupFixture");
    expect(script).toContain("passed: originalPassed && cleanupErrors.length === 0");
  });

  it("exercises checksum-bound scanner results, override audit, and denied cases", () => {
    const script = readFileSync(join(process.cwd(), "scripts/prove-upload-scan-rpc-provider-postgres.ts"), "utf8");

    expect(script).toContain('serviceClient.rpc("record_upload_asset"');
    expect(script).toContain('serviceClient.rpc("record_upload_scan_result"');
    expect(script).toContain('serviceClient.rpc("approve_upload_scan_override"');
    expect(script).toContain("expected_checksum_sha256: asset.checksumSha256");
    expect(script).toContain('scanner_status: "clean"');
    expect(script).toContain("failed_transient");
    expect(script).toContain("failed_permanent");
    expect(script).toContain("infected");
    expect(script).toContain("unsupported");
    expect(script).toContain("record-scan-result-rejects-checksum-mismatch");
    expect(script).toContain("record-scan-result-rejects-non-attachment");
    expect(script).toContain("scan-override-rejects-checksum-mismatch");
    expect(script).toContain("provider-readback-statuses-match-scan-rpc-results");
    expect(script).toContain("provider-readback-records-scan-events");
  });

  it("keeps provider repair migrations aligned with the checksum-bound scan RPC contract", () => {
    const checksumContractMigration = readFileSync(
      join(process.cwd(), "supabase/migrations/20260627024155_upload_scan_rpc_checksum_contracts.sql"),
      "utf8",
    );
    const scannedAtMigration = readFileSync(
      join(process.cwd(), "supabase/migrations/20260627024318_upload_scan_lifecycle_scanned_at_readback.sql"),
      "utf8",
    );
    const triggerMigration = readFileSync(
      join(process.cwd(), "supabase/migrations/20260627024438_upload_asset_session_consistency_scan_mutability.sql"),
      "utf8",
    );

    expect(checksumContractMigration).toContain("drop function if exists public.record_upload_scan_result(uuid, text, public.upload_scan_status, jsonb)");
    expect(checksumContractMigration).toContain("expected_checksum_sha256 text");
    expect(checksumContractMigration).toContain("Scan result checksum does not match the uploaded asset.");
    expect(checksumContractMigration).toContain("Scan override checksum does not match the uploaded asset.");
    expect(scannedAtMigration).toContain("add column if not exists scanned_at timestamptz");
    expect(triggerMigration).toContain("before insert or update of upload_session_id, workspace_id, actor_user_id, surface, target_entity_type, target_entity_id, storage_bucket, storage_path");
    expect(triggerMigration).not.toContain("scan_status ON public.upload_assets");
  });
});
