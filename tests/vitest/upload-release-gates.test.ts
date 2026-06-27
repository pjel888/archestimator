import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const releaseGates = JSON.parse(readFileSync(join(
  process.cwd(),
  ".ai/03_plans/2026-06-26-File-Upload-Audit-And-Improvement/evidence/upload-release-gates.json",
), "utf8")) as {
  proofBoundary: string;
  closedBeta: { status: string; blockers: Array<{ id: string }> };
  production: { status: string; blockers: Array<{ id: string }>; localPasses?: Array<{ id: string }> };
  platform: { status: string; blockers: Array<{ id: string }>; localPasses?: Array<{ id: string }> };
  localEvidence: Array<{ command: string; exit: number; result: string }>;
};

describe("upload release gates", () => {
  it("separates closed-beta readiness from missing production and platform proof", () => {
    expect(releaseGates.proofBoundary).toBe("local-plus-linked-provider-operation-proof");
    expect(releaseGates.closedBeta.status).toBe("ready");
    expect(releaseGates.production.status).toBe("blocked");
    expect(releaseGates.platform.status).toBe("blocked");
    expect(releaseGates.closedBeta.blockers.map((blocker) => blocker.id)).toEqual([]);
    expect(releaseGates.closedBeta.blockers.map((blocker) => blocker.id)).not.toContain("UPLOAD-GATE-PROVIDER-STORAGE-DENIAL");
    expect(releaseGates.closedBeta.blockers.map((blocker) => blocker.id)).not.toContain("UPLOAD-GATE-COMPONENT-IMAGE-PRIVACY-DECISION");
    expect(releaseGates.closedBeta.blockers.map((blocker) => blocker.id)).not.toContain("UPLOAD-GATE-ESTIMATE-ROW-ASSET-FINALITY");
    expect(releaseGates.closedBeta.blockers.map((blocker) => blocker.id)).not.toContain("UPLOAD-GATE-UPLOAD-DOMAIN-APPLIED-PROOF");
    expect(releaseGates.production.blockers.map((blocker) => blocker.id)).toContain("UPLOAD-GATE-SCANNER");
    expect(releaseGates.platform.blockers.map((blocker) => blocker.id)).toContain("UPLOAD-GATE-PROVIDER-PORTABILITY");
  });

  it("records the latest upload validation evidence without claiming production readiness", () => {
    expect(releaseGates.localEvidence).toEqual(expect.arrayContaining([
      expect.objectContaining({
        command: "ARCH_UPLOAD_STORAGE_PROOF=1 ARCH_UPLOAD_STORAGE_PROOF_ENV_FILE=.env.local node scripts/prove-upload-storage-denial-postgres.mjs",
        exit: 0,
        result: "Linked provider direct storage-denial proof passed for project-images, component-images, and component-attachments; failedChecks=[] and cleanupErrors=[]. See evidence/upload-storage-denial-proof.json",
      }),
      expect.objectContaining({
        command: "ARCH_UPLOAD_CLEANUP_PROOF=1 ARCH_UPLOAD_CLEANUP_PROOF_ENV_FILE=.env.local bun run scripts/prove-upload-cleanup-provider-postgres.ts",
        exit: 0,
        result: "Linked provider upload cleanup proof passed through planUploadStorageCleanup with candidateCount=5, rejectedCount=5, removedCount=5, readbackMissingCount=5, preservedReadbackCount=4, failedChecks=[] and cleanupErrors=[]. See evidence/upload-cleanup-provider-proof.json",
      }),
      expect.objectContaining({
        command: "Supabase connector: apply upload scan RPC checksum/scan mutability repair migrations and read back catalog for project ebxxqidacheyapmmzavr",
        exit: 0,
        result: "Linked provider catalog now exposes checksum-bound record_upload_scan_result and approve_upload_scan_override signatures with service_role-only execute grants; upload_assets.scanned_at exists; enforce_upload_asset_session_consistency no longer blocks scan_status updates. Local migrations 20260627024155, 20260627024318, and 20260627024438 mirror the provider ledger.",
      }),
      expect.objectContaining({
        command: "ARCH_UPLOAD_SCAN_RPC_PROOF=1 ARCH_UPLOAD_SCAN_RPC_PROOF_ENV_FILE=.env.local bun run scripts/prove-upload-scan-rpc-provider-postgres.ts",
        exit: 0,
        result: "Linked provider scanner RPC proof passed with assetFixtureCount=7, clean/transient/infected/permanent/unsupported outcomes recorded, override_approved read back for permanent/unsupported cases, checksum and non-attachment denials verified, scan events recorded, failedChecks=[] and cleanupErrors=[]. See evidence/upload-scan-rpc-provider-proof.json",
      }),
      expect.objectContaining({
        command: "ARCH_UPLOAD_SIGNED_PROVIDER_PROOF=1 ARCH_UPLOAD_SIGNED_PROVIDER_PROOF_ENV_FILE=.env.local bun run scripts/prove-upload-signed-provider-postgres.ts",
        exit: 0,
        result: "Linked provider signed single-part upload proof passed with Supabase signed URL issuance, token-only upload without Authorization header, provider object-head validation by ETag, upload asset finalization recording, failedChecks=[] and cleanupErrors=[]. See evidence/upload-signed-provider-proof.json",
      }),
      expect.objectContaining({
        command: "Supabase connector: apply signed direct-upload session RPC migrations and repair readback for project ebxxqidacheyapmmzavr",
        exit: 0,
        result: "Linked provider now exposes service-role-only record_upload_asset, create_upload_session, and finalize_upload_session RPCs compatible with upload_sessions.file_name/expires_at/scan_status, session_reserved reservation events, and typed scan_pending/asset_finalized event inserts. Provider ledger versions 20260627032615, 20260627034126, 20260627034336, and 20260627034619 are mirrored locally.",
      }),
      expect.objectContaining({
        command: "ARCH_UPLOAD_SIGNED_ROUTE_PROOF=1 ARCH_UPLOAD_SIGNED_ROUTE_PROOF_ENV_FILE=.env.local bun run scripts/prove-upload-signed-route-provider-postgres.ts",
        exit: 0,
        result: "Linked provider signed app-route proof passed with reserved session readback, token-only upload without Authorization header, provider object-head validation by ETag, finalize_upload_session asset/event readback, sanitized metadata, failedChecks=[] and cleanupErrors=[]. See evidence/upload-signed-route-provider-proof.json",
      }),
      expect.objectContaining({
        command: "bunx vitest run tests/vitest/upload-signed-route.test.ts tests/vitest/upload-signed-route-proof-script.test.ts tests/vitest/upload-signed-route-provider-proof.test.ts tests/vitest/upload-provider-portability.test.ts tests/vitest/upload-session-strategy.test.ts --maxWorkers=1",
        exit: 0,
        result: "5 files, 18 tests passed",
      }),
      expect.objectContaining({
        command: "bunx vitest run tests/vitest/upload-component-image-backfill.test.ts --maxWorkers=1",
        exit: 0,
        result: "1 file, 6 tests passed",
      }),
      expect.objectContaining({
        command: "node -e \"JSON.parse(require('node:fs').readFileSync('.ai/03_plans/2026-06-26-File-Upload-Audit-And-Improvement/evidence/upload-component-image-publication-snapshot-migration-proof.json','utf8')); console.log('json ok')\"",
        exit: 0,
        result: "Publication snapshot migration proof JSON parsed successfully",
      }),
      expect.objectContaining({
        exit: 0,
        result: "16 files, 115 tests passed",
      }),
      expect.objectContaining({
        command: "bunx vitest run tests/vitest/upload-domain-contracts.test.ts --maxWorkers=1",
        exit: 0,
        result: "1 file, 9 tests passed",
      }),
      expect.objectContaining({
        command: "bunx vitest run tests/vitest/upload-storage-provider.test.ts --maxWorkers=1",
        exit: 0,
        result: "1 file, 3 tests passed",
      }),
      expect.objectContaining({
        command: "bunx vitest run tests/vitest/upload-cleanup.test.ts --maxWorkers=1",
        exit: 0,
        result: "1 file, 7 tests passed",
      }),
      expect.objectContaining({
        command: "bunx vitest run tests/vitest/upload-component-image-backfill.test.ts --maxWorkers=1",
        exit: 0,
        result: "1 file, 4 tests passed",
      }),
      expect.objectContaining({
        command: "Supabase connector: aggregate component-image persisted reference scan for project ebxxqidacheyapmmzavr",
        exit: 0,
        result: "Linked provider aggregate scan found zero persisted legacy public component-image URLs and zero upload_assets component-image records; see evidence/upload-component-image-provider-scan.json",
      }),
      expect.objectContaining({
        command: "bunx vitest run tests/vitest/upload-component-image-provider-scan.test.ts --maxWorkers=1",
        exit: 0,
        result: "1 file, 2 tests passed",
      }),
      expect.objectContaining({
        command: "Supabase connector: apply component-images private bucket migration and read back storage catalog for project ebxxqidacheyapmmzavr",
        exit: 0,
        result: "Linked provider storage catalog readback confirms component-images public=false, the old public read policy is absent, and no storage.objects policies reference component-images; see evidence/upload-component-image-private-bucket-readback.json",
      }),
      expect.objectContaining({
        command: "bunx vitest run tests/vitest/upload-session-strategy.test.ts --maxWorkers=1",
        exit: 0,
        result: "1 file, 4 tests passed",
      }),
      expect.objectContaining({
        command: "Supabase connector: list migrations and read-only upload-domain catalog query for project ebxxqidacheyapmmzavr",
        exit: 0,
        result: "Linked provider readback passed; see evidence/upload-provider-readback.json",
      }),
      expect.objectContaining({
        command: "bunx vitest run tests/vitest/auth-sensitive-api-boundaries.test.ts tests/vitest/upload-attachment-scan-freeze.test.ts --maxWorkers=1",
        exit: 0,
        result: "2 files, 36 tests passed",
      }),
      expect.objectContaining({
        command: "bunx tsc --noEmit --pretty false",
        exit: 0,
        result: "No TypeScript errors",
      }),
      expect.objectContaining({
        command: "node scripts/prove-upload-domain-rls-postgres.mjs",
        exit: 0,
        result: "Provider proof skipped as expected because ARCH_UPLOAD_DOMAIN_RLS_PROOF is not set; report covers upload_sessions, upload_assets, and upload_events table/RPC boundaries",
      }),
    ]));
    expect(JSON.stringify(releaseGates.closedBeta.localPasses)).toContain("UPLOAD-GATE-ESTIMATE-ROW-ASSET-FINALITY");
    expect(JSON.stringify(releaseGates.closedBeta.localPasses)).toContain("validate_estimate_row_image_asset");
    expect(JSON.stringify(releaseGates.closedBeta.localPasses)).toContain("UPLOAD-GATE-ATTACHMENT-DOWNLOAD-BROKER-FAIL-CLOSED");
    expect(JSON.stringify(releaseGates.closedBeta.localPasses)).toContain("UPLOAD-GATE-SCAN-STATUS-TAXONOMY-LOCAL");
    expect(JSON.stringify(releaseGates.closedBeta.localPasses)).toContain("UPLOAD-GATE-UPLOAD-CLEANUP-CORE-LOCAL");
    expect(JSON.stringify(releaseGates.closedBeta.localPasses)).toContain("UPLOAD-GATE-CLEANUP-RETENTION-OBSERVABILITY-LOCAL");
    expect(JSON.stringify(releaseGates.closedBeta.localPasses)).toContain("UPLOAD-GATE-COMPONENT-IMAGE-BACKFILL-READINESS-LOCAL");
    expect(JSON.stringify(releaseGates.closedBeta.localPasses)).toContain("UPLOAD-GATE-COMPONENT-IMAGE-PUBLICATION-SNAPSHOT-MIGRATION-LOCAL");
    expect(JSON.stringify(releaseGates.closedBeta.localPasses)).toContain("UPLOAD-GATE-COMPONENT-IMAGE-PERSISTED-SCAN-READBACK");
    expect(JSON.stringify(releaseGates.closedBeta.localPasses)).toContain("UPLOAD-GATE-COMPONENT-IMAGE-PRIVATE-BUCKET-READBACK");
    expect(JSON.stringify(releaseGates.closedBeta.localPasses)).toContain("UPLOAD-GATE-PROVIDER-STORAGE-DENIAL-OPERATION-PROOF");
    expect(JSON.stringify(releaseGates.closedBeta.localPasses)).toContain("UPLOAD-GATE-UPLOAD-DOMAIN-APPLIED-READBACK");
    expect(JSON.stringify(releaseGates.closedBeta.blockers)).not.toContain("publication snapshot migration has not been exercised against non-empty publication data");
    expect(JSON.stringify(releaseGates.closedBeta.blockers)).not.toContain("linked provider storage-denial proof covers component-images anon/auth direct download/delete denial");
    expect(JSON.stringify(releaseGates.closedBeta.blockers)).not.toContain("direct object read-denial operation proof is not captured");
    expect(JSON.stringify(releaseGates.closedBeta.blockers)).not.toContain("component-images bucket remains public");
    expect(JSON.stringify(releaseGates.closedBeta.blockers)).not.toContain("final product/security privacy decision");
    expect(JSON.stringify(releaseGates.closedBeta.blockers)).not.toContain("provider-backed read denial is not captured");
    expect(JSON.stringify(releaseGates.closedBeta.blockers)).not.toContain("classifier has not been run against persisted provider/project data");
    expect(JSON.stringify(releaseGates.production.blockers)).toContain("durable scheduled TTL cleanup");
    expect(JSON.stringify(releaseGates.production.blockers)).toContain("persisted retry/audit job execution");
    expect(JSON.stringify(releaseGates.production.blockers)).toContain("scanner/CDR provider");
    expect(JSON.stringify(releaseGates.production.blockers)).toContain("queue worker");
    expect(JSON.stringify(releaseGates.production.blockers)).toContain("provider-backed clean download proof");
    expect(JSON.stringify(releaseGates.production.blockers)).not.toContain("provider-backed retry/audit execution");
    expect(releaseGates.production.localPasses?.map((pass) => pass.id)).toContain("UPLOAD-GATE-CLEANUP-PROVIDER-EXECUTION-READBACK");
    expect(releaseGates.production.localPasses?.map((pass) => pass.id)).toContain("UPLOAD-GATE-SCANNER-RPC-PROVIDER-READBACK");
    expect(releaseGates.platform.localPasses?.map((pass) => pass.id)).toContain("UPLOAD-GATE-PROVIDER-ADAPTER-READ-PARITY-LOCAL");
    expect(releaseGates.platform.localPasses?.map((pass) => pass.id)).toContain("UPLOAD-GATE-UPLOAD-SESSION-STRATEGY-LOCAL");
    expect(releaseGates.platform.localPasses?.map((pass) => pass.id)).toContain("UPLOAD-GATE-PROVIDER-MIGRATION-DRY-RUN-READBACK");
    expect(releaseGates.platform.localPasses?.map((pass) => pass.id)).toContain("UPLOAD-GATE-S3-LIKE-MULTIPART-PARITY-LOCAL");
    expect(releaseGates.platform.localPasses?.map((pass) => pass.id)).toContain("UPLOAD-GATE-ASSET-DESCRIPTOR-MIGRATION-PARITY-LOCAL");
    expect(releaseGates.platform.localPasses?.map((pass) => pass.id)).toContain("UPLOAD-GATE-SUPABASE-SIGNED-UPLOAD-PROVIDER-READBACK");
    expect(releaseGates.platform.localPasses?.map((pass) => pass.id)).toContain("UPLOAD-GATE-SIGNED-UPLOAD-APP-ROUTE-PROVIDER-READBACK");
    expect(releaseGates.platform.localPasses?.map((pass) => pass.id)).toContain("UPLOAD-GATE-SIGNED-UPLOAD-BROWSER-CLIENT-LOCAL");
    expect(JSON.stringify(releaseGates.platform.blockers)).toContain("real resumable/TUS/multipart provider flows");
    expect(JSON.stringify(releaseGates.platform.blockers)).not.toContain("browser/client direct-upload UX integration");
    expect(JSON.stringify(releaseGates.platform.blockers)).not.toContain("app-route signed-upload integration");
    expect(JSON.stringify(releaseGates.platform.blockers)).not.toContain("signed/resumable flows are not implemented against a real provider");
    expect(JSON.stringify(releaseGates.platform.blockers)).not.toContain("existing object migration/asset-descriptor parity has not been exercised");
    expect(JSON.stringify(releaseGates.platform.blockers)).not.toContain("S3-like multipart parity tests");
    expect(JSON.stringify(releaseGates.platform.blockers)).not.toContain("migration dry-run against asset descriptors has not been executed");
    expect(releaseGates.localEvidence).toEqual(expect.arrayContaining([
      expect.objectContaining({
        command: "bunx vitest run tests/vitest/upload-provider-portability.test.ts --maxWorkers=1",
        exit: 0,
        result: "1 file, 2 tests passed",
      }),
      expect.objectContaining({
        command: "bunx vitest run tests/vitest/upload-asset-descriptor-migration.test.ts --maxWorkers=1",
        exit: 0,
        result: "1 file, 4 tests passed",
      }),
      expect.objectContaining({
        command: "supabase db push --linked --dry-run",
        exit: 0,
        result: "Linked provider dry-run passed; Remote database is up to date. See evidence/upload-provider-migration-dry-run.json",
      }),
      expect.objectContaining({
        command: "bunx vitest run tests/vitest/upload-component-attachment-client.test.ts --maxWorkers=1",
        exit: 0,
        result: "1 file, 4 tests passed",
      }),
      expect.objectContaining({
        command: "bunx eslint src/lib/uploads/component-attachment-client.ts src/components/workshop/component-library-manager/AddComponentModal.tsx tests/vitest/upload-component-attachment-client.test.ts",
        exit: 0,
        result: "No lint errors for component attachment signed-direct client transport, Add Component modal integration, and focused client tests",
      }),
    ]));
    expect(JSON.stringify(releaseGates)).not.toContain("provider proof skipped");
  });
});
