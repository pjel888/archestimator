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
  hostedEvidence?: Array<{ command: string; exit: number; result: string; artifact?: string }>;
  localEvidence: Array<{ command: string; exit: number; result: string }>;
};

const hostedRuntimeFailClosedProof = JSON.parse(readFileSync(join(
  process.cwd(),
  ".ai/03_plans/2026-06-26-File-Upload-Audit-And-Improvement/evidence/upload-hosted-runtime-fail-closed-proof.json",
), "utf8")) as {
  passed: boolean;
  productionProofReady: boolean;
  samples: Array<{ status: number; hasNoStoreCacheControl: boolean }>;
};

const hostedOperationsFailClosedProof = JSON.parse(readFileSync(join(
  process.cwd(),
  ".ai/03_plans/2026-06-26-File-Upload-Audit-And-Improvement/evidence/upload-hosted-operations-fail-closed-proof.json",
), "utf8")) as {
  passed: boolean;
  productionProofReady: boolean;
  results: Array<{ samples: Array<{ status: number; hasNoStoreCacheControl: boolean }> }>;
};

const productionProofEvidenceCheck = JSON.parse(readFileSync(join(
  process.cwd(),
  ".ai/03_plans/2026-06-26-File-Upload-Audit-And-Improvement/evidence/upload-production-proof-evidence-check.json",
), "utf8")) as {
  passed: boolean;
  productionProofReady: boolean;
  totals: { required: number; passed: number; failed: number; missing: number; invalid: number };
  requirements: Array<{ key: string; status: string; failedChecks: string[] }>;
};

const alertDeliveryProof = JSON.parse(readFileSync(join(
  process.cwd(),
  ".ai/03_plans/2026-06-26-File-Upload-Audit-And-Improvement/evidence/upload-alert-delivery-production-proof.json",
), "utf8")) as {
  passed: boolean;
  proofBoundary: string;
  delivery: { delivered: boolean; secretRedacted: boolean; payloadPathSafe: boolean };
  failedChecks: string[];
};

const liveClamdProof = JSON.parse(readFileSync(join(
  process.cwd(),
  ".ai/03_plans/2026-06-26-File-Upload-Audit-And-Improvement/evidence/upload-clamd-live-proof.json",
), "utf8")) as {
  passed: boolean;
  proofBoundary: string;
  skipped: boolean;
  reason: string;
};

const dashboardProductionProof = JSON.parse(readFileSync(join(
  process.cwd(),
  ".ai/03_plans/2026-06-26-File-Upload-Audit-And-Improvement/evidence/upload-dashboard-production-proof.json",
), "utf8")) as {
  passed: boolean;
  proofBoundary: string;
  skipped: boolean;
  dashboard: { hostedObserved: boolean; pathSafe: boolean };
};

const backpressureProductionProof = JSON.parse(readFileSync(join(
  process.cwd(),
  ".ai/03_plans/2026-06-26-File-Upload-Audit-And-Improvement/evidence/upload-backpressure-production-proof.json",
), "utf8")) as {
  passed: boolean;
  proofBoundary: string;
  skipped: boolean;
  exercise: { hosted: boolean; rejectionStatus: number | null; pathSafe: boolean };
};

const retentionRunbookProductionProof = JSON.parse(readFileSync(join(
  process.cwd(),
  ".ai/03_plans/2026-06-26-File-Upload-Audit-And-Improvement/evidence/upload-retention-runbook-production-proof.json",
), "utf8")) as {
  passed: boolean;
  proofBoundary: string;
  skipped: boolean;
  runbook: { hostedCronObserved: boolean; noRawStoragePaths: boolean };
};

describe("upload release gates", () => {
  it("separates closed-beta and platform readiness from missing production proof", () => {
    expect(releaseGates.proofBoundary).toBe("local-plus-linked-provider-operation-proof");
    expect(releaseGates.closedBeta.status).toBe("ready");
    expect(releaseGates.production.status).toBe("blocked");
    expect(releaseGates.platform.status).toBe("ready");
    expect(releaseGates.closedBeta.blockers.map((blocker) => blocker.id)).toEqual([]);
    expect(releaseGates.closedBeta.blockers.map((blocker) => blocker.id)).not.toContain("UPLOAD-GATE-PROVIDER-STORAGE-DENIAL");
    expect(releaseGates.closedBeta.blockers.map((blocker) => blocker.id)).not.toContain("UPLOAD-GATE-COMPONENT-IMAGE-PRIVACY-DECISION");
    expect(releaseGates.closedBeta.blockers.map((blocker) => blocker.id)).not.toContain("UPLOAD-GATE-ESTIMATE-ROW-ASSET-FINALITY");
    expect(releaseGates.closedBeta.blockers.map((blocker) => blocker.id)).not.toContain("UPLOAD-GATE-UPLOAD-DOMAIN-APPLIED-PROOF");
    expect(releaseGates.production.blockers.map((blocker) => blocker.id)).toContain("UPLOAD-GATE-SCANNER");
    expect(releaseGates.platform.blockers.map((blocker) => blocker.id)).toEqual([]);
  });

  it("records hosted no-secret proof attempts without claiming production readiness", () => {
    expect(releaseGates.hostedEvidence).toEqual(expect.arrayContaining([
      expect.objectContaining({
        command: "OUTPUT_FILE=.ai/03_plans/2026-06-26-File-Upload-Audit-And-Improvement/evidence/upload-hosted-runtime-fail-closed-proof.json bun run scripts/verify-hosted-upload-runtime.ts",
        exit: 1,
        artifact: "evidence/upload-hosted-runtime-fail-closed-proof.json",
      }),
      expect.objectContaining({
        command: "OUTPUT_FILE=.ai/03_plans/2026-06-26-File-Upload-Audit-And-Improvement/evidence/upload-hosted-operations-fail-closed-proof.json MARKDOWN_FILE=.ai/03_plans/2026-06-26-File-Upload-Audit-And-Improvement/evidence/upload-hosted-operations-fail-closed-proof.md bun run scripts/verify-hosted-upload-operations.ts",
        exit: 1,
        artifact: "evidence/upload-hosted-operations-fail-closed-proof.json",
      }),
    ]));
    expect(hostedRuntimeFailClosedProof.passed).toBe(false);
    expect(hostedRuntimeFailClosedProof.productionProofReady).toBe(false);
    expect(hostedRuntimeFailClosedProof.samples.map((sample) => sample.status)).toEqual([404]);
    expect(hostedRuntimeFailClosedProof.samples.map((sample) => sample.hasNoStoreCacheControl)).toEqual([false]);
    expect(hostedOperationsFailClosedProof.passed).toBe(false);
    expect(hostedOperationsFailClosedProof.productionProofReady).toBe(false);
    expect(hostedOperationsFailClosedProof.results.flatMap((result) => result.samples.map((sample) => sample.status))).toEqual([404, 404]);
    expect(JSON.stringify(releaseGates.production.blockers)).toContain("hosted scan proof route has not been observed deployed");
    expect(JSON.stringify(releaseGates.production.blockers)).toContain("hosted cleanup proof route has not been observed deployed");
    expect(JSON.stringify(releaseGates.production.blockers)).toContain("hosted runtime proof route has not been observed deployed");
  });

  it("records the production evidence bundle checker without closing production gates", () => {
    expect(releaseGates.production.status).toBe("blocked");
    expect(releaseGates.production.localPasses?.map((pass) => pass.id)).toContain("UPLOAD-GATE-PRODUCTION-EVIDENCE-BUNDLE-CHECKER-LOCAL");
    expect(releaseGates.production.localPasses?.map((pass) => pass.id)).toContain("UPLOAD-GATE-PRODUCTION-PROOF-RUNBOOK-LOCAL");
    expect(JSON.stringify(releaseGates.production.localPasses)).toContain("scripts/check-upload-production-proof-evidence.ts");
    expect(JSON.stringify(releaseGates.production.localPasses)).toContain("UPLOAD_PRODUCTION_PROOF_RUNBOOK.md");
    expect(JSON.stringify(releaseGates.production.localPasses)).toContain("productionProofReady=false");

    expect(productionProofEvidenceCheck.passed).toBe(false);
    expect(productionProofEvidenceCheck.productionProofReady).toBe(false);
    expect(productionProofEvidenceCheck.totals).toEqual({
      required: 7,
      passed: 0,
      failed: 7,
      missing: 0,
      invalid: 0,
    });
    expect(productionProofEvidenceCheck.requirements.find((item) => item.key === "hostedUploadOperations")?.status).toBe("failed");
    expect(productionProofEvidenceCheck.requirements.find((item) => item.key === "hostedUploadRuntime")?.status).toBe("failed");
    expect(productionProofEvidenceCheck.requirements.find((item) => item.key === "liveScanner")?.status).toBe("failed");
    expect(productionProofEvidenceCheck.requirements.find((item) => item.key === "liveScanner")?.failedChecks).toContain("live-scanner-eicar-detected");
    expect(productionProofEvidenceCheck.requirements.find((item) => item.key === "alertDelivery")?.status).toBe("failed");
    expect(productionProofEvidenceCheck.requirements.find((item) => item.key === "alertDelivery")?.failedChecks).toContain("alert-delivery-observed");
    expect(productionProofEvidenceCheck.requirements.find((item) => item.key === "dashboardObservation")?.status).toBe("failed");
    expect(productionProofEvidenceCheck.requirements.find((item) => item.key === "hostedBackpressure")?.status).toBe("failed");
    expect(productionProofEvidenceCheck.requirements.find((item) => item.key === "retentionRunbook")?.status).toBe("failed");

    expect(alertDeliveryProof.passed).toBe(false);
    expect(alertDeliveryProof.proofBoundary).toBe("hosted-alert-delivery-proof-skipped");
    expect(alertDeliveryProof.delivery.delivered).toBe(false);
    expect(alertDeliveryProof.delivery.secretRedacted).toBe(true);
    expect(alertDeliveryProof.delivery.payloadPathSafe).toBe(false);
    expect(alertDeliveryProof.failedChecks).toContain("alert-delivery-explicit-proof-opt-in");

    expect(liveClamdProof.passed).toBe(false);
    expect(liveClamdProof.skipped).toBe(true);
    expect(liveClamdProof.proofBoundary).toBe("live-clamd-proof-skipped");
    expect(liveClamdProof.reason).toContain("ARCH_UPLOAD_CLAMD_LIVE_PROOF");

    expect(dashboardProductionProof.passed).toBe(false);
    expect(dashboardProductionProof.skipped).toBe(true);
    expect(dashboardProductionProof.proofBoundary).toBe("hosted-dashboard-proof-skipped");
    expect(dashboardProductionProof.dashboard.hostedObserved).toBe(false);
    expect(dashboardProductionProof.dashboard.pathSafe).toBe(false);
    expect(backpressureProductionProof.passed).toBe(false);
    expect(backpressureProductionProof.skipped).toBe(true);
    expect(backpressureProductionProof.proofBoundary).toBe("hosted-backpressure-proof-skipped");
    expect(backpressureProductionProof.exercise.hosted).toBe(false);
    expect(backpressureProductionProof.exercise.rejectionStatus).toBeNull();
    expect(backpressureProductionProof.exercise.pathSafe).toBe(false);
    expect(retentionRunbookProductionProof.passed).toBe(false);
    expect(retentionRunbookProductionProof.skipped).toBe(true);
    expect(retentionRunbookProductionProof.proofBoundary).toBe("production-retention-runbook-proof-skipped");
    expect(retentionRunbookProductionProof.runbook.hostedCronObserved).toBe(false);
    expect(retentionRunbookProductionProof.runbook.noRawStoragePaths).toBe(false);
  });

  it("records the latest upload validation evidence without claiming production readiness", () => {
    expect(releaseGates.localEvidence).toEqual(expect.arrayContaining([
      expect.objectContaining({
        command: "bunx vitest run tests/vitest/upload-alert-delivery-proof-script.test.ts tests/vitest/upload-production-observations-proof-script.test.ts tests/vitest/upload-production-proof-evidence-checker.test.ts tests/vitest/upload-release-gates.test.ts --maxWorkers=1",
        exit: 0,
        result: "4 files, 19 tests passed after production proof runbook updates",
      }),
      expect.objectContaining({
        command: "bunx tsc --noEmit --pretty false",
        exit: 0,
        result: "No TypeScript errors after upload production proof runbook updates",
      }),
      expect.objectContaining({
        command: "bunx vitest run tests/vitest/upload-production-proof-evidence-checker.test.ts tests/vitest/upload-production-observations-proof-script.test.ts tests/vitest/upload-release-gates.test.ts --maxWorkers=1",
        exit: 0,
        result: "3 files, 14 tests passed after adding the production proof runbook alignment test",
      }),
      expect.objectContaining({
        command: "bunx eslint scripts/check-upload-production-proof-evidence.ts tests/vitest/upload-production-proof-evidence-checker.test.ts tests/vitest/upload-production-observations-proof-script.test.ts tests/vitest/upload-release-gates.test.ts",
        exit: 0,
        result: "Scoped upload production proof checker, production observation, and release-gate lint passed with no errors after production proof runbook updates",
      }),
      expect.objectContaining({
        command: "OUTPUT_FILE=.ai/03_plans/2026-06-26-File-Upload-Audit-And-Improvement/evidence/upload-production-proof-evidence-check.json bun run scripts/check-upload-production-proof-evidence.ts",
        exit: 1,
        result: "Expected fail-closed upload production evidence bundle check: productionProofReady=false with required=7, passed=0, failed=7 fail-closed artifacts, missing=0, invalid=0. See evidence/upload-production-proof-evidence-check.json.",
      }),
      expect.objectContaining({
        command: "bun run scripts/verify-upload-production-observations.ts",
        exit: 1,
        result: "Expected fail-closed production observation proofs: dashboard, backpressure, and retention runbook artifacts were written as skipped because ARCH_UPLOAD_PRODUCTION_OBSERVATIONS_PROOF/input were absent; production remains blocked.",
      }),
      expect.objectContaining({
        command: "bun run scripts/prove-upload-clamd-live.ts",
        exit: 0,
        result: "Expected fail-closed live ClamD proof skipped because ARCH_UPLOAD_CLAMD_LIVE_PROOF is not set; no scanner was contacted, productionProofReady remains false, and evidence/upload-clamd-live-proof.json records skipped=true.",
      }),
      expect.objectContaining({
        command: "OUTPUT_FILE=.ai/03_plans/2026-06-26-File-Upload-Audit-And-Improvement/evidence/upload-alert-delivery-production-proof.json bun run scripts/verify-upload-alert-delivery.ts",
        exit: 1,
        result: "Expected fail-closed upload alert delivery proof: passed=false because explicit proof opt-in, hosted observation confirmation, alert env config, and observed 2xx delivery are absent. The artifact is sanitized and production remains blocked. See evidence/upload-alert-delivery-production-proof.json.",
      }),
      expect.objectContaining({
        command: "bunx vitest run tests/vitest/upload-alert-delivery-proof-script.test.ts tests/vitest/upload-production-observations-proof-script.test.ts tests/vitest/upload-production-proof-evidence-checker.test.ts tests/vitest/upload-release-gates.test.ts --maxWorkers=1",
        exit: 0,
        result: "4 files, 18 tests passed",
      }),
      expect.objectContaining({
        command: "bunx eslint scripts/verify-upload-alert-delivery.ts scripts/verify-upload-production-observations.ts scripts/check-upload-production-proof-evidence.ts tests/vitest/upload-alert-delivery-proof-script.test.ts tests/vitest/upload-production-observations-proof-script.test.ts tests/vitest/upload-production-proof-evidence-checker.test.ts tests/vitest/upload-release-gates.test.ts",
        exit: 0,
        result: "Scoped upload alert delivery proof, production observation proof, production evidence checker, and release-gate lint passed with no errors",
      }),
      expect.objectContaining({
        command: "bunx vitest run tests/vitest/upload-production-proof-evidence-checker.test.ts tests/vitest/upload-release-gates.test.ts --maxWorkers=1",
        exit: 0,
        result: "2 files, 8 tests passed",
      }),
      expect.objectContaining({
        command: "bunx eslint scripts/check-upload-production-proof-evidence.ts tests/vitest/upload-production-proof-evidence-checker.test.ts tests/vitest/upload-release-gates.test.ts",
        exit: 0,
        result: "Scoped upload production evidence checker and release-gate lint passed with no errors",
      }),
      expect.objectContaining({
        command: "bunx tsc --noEmit --pretty false",
        exit: 0,
        result: "No TypeScript errors after upload production evidence checker updates",
      }),
      expect.objectContaining({
        command: "git diff --check",
        exit: 0,
        result: "No whitespace errors after upload production evidence checker updates",
      }),
      expect.objectContaining({
        command: "bunx vitest run tests/vitest/upload-release-gates.test.ts tests/vitest/hosted-upload-operations-proof-script.test.ts tests/vitest/hosted-upload-runtime-proof-script.test.ts --maxWorkers=1",
        exit: 0,
        result: "3 files, 14 tests passed",
      }),
      expect.objectContaining({
        command: "bunx eslint tests/vitest/upload-release-gates.test.ts scripts/verify-hosted-upload-operations.ts scripts/verify-hosted-upload-runtime.ts tests/vitest/hosted-upload-operations-proof-script.test.ts tests/vitest/hosted-upload-runtime-proof-script.test.ts",
        exit: 0,
        result: "Scoped hosted upload proof verifier, hosted evidence, and release-gate lint passed with no errors",
      }),
      expect.objectContaining({
        command: "bunx tsc --noEmit --pretty false",
        exit: 0,
        result: "No TypeScript errors after hosted no-secret proof evidence updates",
      }),
      expect.objectContaining({
        command: "git diff --check",
        exit: 0,
        result: "No whitespace errors after hosted no-secret proof evidence updates",
      }),
      expect.objectContaining({
        command: "bunx vitest run tests/vitest/vercel-env-readiness-script.test.ts tests/vitest/upload-release-gates.test.ts tests/vitest/upload-cleanup-cron-config.test.ts tests/vitest/upload-operational-alerts.test.ts --maxWorkers=1",
        exit: 0,
        result: "4 files, 17 tests passed",
      }),
      expect.objectContaining({
        command: "bunx eslint scripts/check-vercel-env-readiness.ts tests/vitest/vercel-env-readiness-script.test.ts tests/vitest/upload-release-gates.test.ts tests/vitest/upload-cleanup-cron-config.test.ts tests/vitest/upload-operational-alerts.test.ts",
        exit: 0,
        result: "Scoped Vercel env upload production proof preflight, cron/alert readiness, and release-gate lint passed with no errors",
      }),
      expect.objectContaining({
        command: "git diff --check",
        exit: 0,
        result: "No whitespace errors after upload production proof env preflight updates",
      }),
      expect.objectContaining({
        command: "bunx vitest run tests/vitest/vercel-env-readiness-script.test.ts tests/vitest/upload-release-gates.test.ts --maxWorkers=1",
        exit: 0,
        result: "2 files, 11 tests passed",
      }),
      expect.objectContaining({
        command: "bunx eslint scripts/check-vercel-env-readiness.ts tests/vitest/vercel-env-readiness-script.test.ts tests/vitest/upload-release-gates.test.ts",
        exit: 0,
        result: "Scoped Vercel env upload production proof preflight and release-gate lint passed with no errors",
      }),
      expect.objectContaining({
        command: "bunx tsc --noEmit --pretty false",
        exit: 0,
        result: "No TypeScript errors after upload production proof env preflight updates",
      }),
      expect.objectContaining({
        command: "ARCH_UPLOAD_CLEAN_DOWNLOAD_PROOF=1 ARCH_UPLOAD_CLEAN_DOWNLOAD_PROOF_ENV_FILE=.env.local bun run scripts/prove-upload-clean-download-provider-postgres.ts",
        exit: 0,
        result: "Linked provider clean attachment download proof passed with approved/current attachment eligibility, scan-clean finalized upload asset readback, download_url_issued audit event, private provider byte readback, safe header contract, failedChecks=[] and cleanupErrors=[]. See evidence/upload-clean-download-provider-proof.json",
      }),
      expect.objectContaining({
        command: "ARCH_UPLOAD_STORAGE_PROOF=1 ARCH_UPLOAD_STORAGE_PROOF_ENV_FILE=.env.local node scripts/prove-upload-storage-denial-postgres.mjs",
        exit: 0,
        result: "Linked provider direct storage-denial proof passed for project-images, component-images, and component-attachments; failedChecks=[] and cleanupErrors=[]. See evidence/upload-storage-denial-proof.json",
      }),
      expect.objectContaining({
        command: "ARCH_UPLOAD_CLEANUP_PROOF=1 ARCH_UPLOAD_CLEANUP_PROOF_ENV_FILE=.env.local bun run scripts/prove-upload-cleanup-provider-postgres.ts",
        exit: 0,
        result: "Linked provider upload cleanup proof passed through planUploadStorageCleanup with candidateCount=5, rejectedCount=5, removedCount=5, readbackMissingCount=5, preservedReadbackCount=4, retryAudit cleanup_queued=2, cleanup_failed=1, cleanup_succeeded=1, rawStoragePathRecorded=false, failedChecks=[] and cleanupErrors=[]. See evidence/upload-cleanup-provider-proof.json",
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
      expect.objectContaining({
        command: "ARCH_UPLOAD_SESSION_CAPACITY_PROOF=1 ARCH_UPLOAD_SESSION_CAPACITY_PROOF_ENV_FILE=.env.local bun run scripts/prove-upload-session-capacity-provider-postgres.ts",
        exit: 0,
        result: "Linked provider create_upload_session concurrency proof passed for project ebxxqidacheyapmmzavr: 8 same-actor attempts admitted/read back exactly 3 reserved sessions with 5 active_actor capacity rejections; 8 same-workspace/different-actor attempts admitted/read back exactly 6 reserved sessions with 2 active_workspace capacity rejections; failedChecks=[] and cleanupErrors=[]. See evidence/upload-session-capacity-provider-proof.json",
      }),
      expect.objectContaining({
        command: "bunx vitest run tests/vitest/upload-cleanup-route.test.ts tests/vitest/upload-scan-route.test.ts tests/vitest/hosted-upload-operations-proof-script.test.ts tests/vitest/upload-session-capacity-provider-proof-script.test.ts --maxWorkers=1",
        exit: 0,
        result: "4 files, 17 tests passed",
      }),
    ]));
    expect(releaseGates.localEvidence).not.toEqual(expect.arrayContaining([
      expect.objectContaining({
        command: "bunx tsc --noEmit --pretty false",
        exit: 2,
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
    expect(JSON.stringify(releaseGates.closedBeta.localPasses)).toContain("UPLOAD-GATE-ATTACHMENT-STATUS-UX-LOCAL");
    expect(JSON.stringify(releaseGates.closedBeta.blockers)).not.toContain("publication snapshot migration has not been exercised against non-empty publication data");
    expect(JSON.stringify(releaseGates.closedBeta.blockers)).not.toContain("linked provider storage-denial proof covers component-images anon/auth direct download/delete denial");
    expect(JSON.stringify(releaseGates.closedBeta.blockers)).not.toContain("direct object read-denial operation proof is not captured");
    expect(JSON.stringify(releaseGates.closedBeta.blockers)).not.toContain("component-images bucket remains public");
    expect(JSON.stringify(releaseGates.closedBeta.blockers)).not.toContain("final product/security privacy decision");
    expect(JSON.stringify(releaseGates.closedBeta.blockers)).not.toContain("provider-backed read denial is not captured");
    expect(JSON.stringify(releaseGates.closedBeta.blockers)).not.toContain("classifier has not been run against persisted provider/project data");
    expect(JSON.stringify(releaseGates.production.blockers)).toContain("hosted scheduled TTL invocation");
    expect(JSON.stringify(releaseGates.production.blockers)).not.toContain("durable scheduled TTL cleanup");
    expect(JSON.stringify(releaseGates.production.blockers)).not.toContain("persisted retry/audit job execution");
    expect(JSON.stringify(releaseGates.production.blockers)).toContain("live scanner/CDR service execution");
    expect(JSON.stringify(releaseGates.production.blockers)).toContain("observed hosted scan worker invocation");
    expect(JSON.stringify(releaseGates.production.blockers)).toContain("linked-provider scan-worker storage download/readback proof");
    expect(JSON.stringify(releaseGates.production.blockers)).not.toContain("provider-backed file scanning");
    expect(JSON.stringify(releaseGates.production.blockers)).toContain("local injected scan job runner");
    expect(JSON.stringify(releaseGates.production.blockers)).toContain("secret-gated internal scan worker route");
    expect(JSON.stringify(releaseGates.production.blockers)).toContain("ClamD INSTREAM scanner provider source");
    expect(JSON.stringify(releaseGates.production.blockers)).toContain("explicit live ClamD proof harness");
    expect(JSON.stringify(releaseGates.production.blockers)).toContain("platform-admin scan override route");
    expect(JSON.stringify(releaseGates.production.blockers)).toContain("operator-facing scan override settings/runbook rehearsal");
    expect(JSON.stringify(releaseGates.production.blockers)).not.toContain("operator-facing override UI/runbook rehearsal are not complete");
    expect(JSON.stringify(releaseGates.production.blockers)).not.toContain("provider-backed clean download proof");
    expect(JSON.stringify(releaseGates.production.blockers)).not.toContain("provider-backed retry/audit execution");
    expect(releaseGates.production.localPasses?.map((pass) => pass.id)).toContain("UPLOAD-GATE-CLEANUP-PROVIDER-EXECUTION-READBACK");
    expect(releaseGates.production.localPasses?.map((pass) => pass.id)).toContain("UPLOAD-GATE-CLEANUP-JOB-RETRY-AUDIT-READBACK");
    expect(releaseGates.production.localPasses?.map((pass) => pass.id)).toContain("UPLOAD-GATE-CLEANUP-SCHEDULER-CONFIG-LOCAL");
    expect(releaseGates.production.localPasses?.map((pass) => pass.id)).toContain("UPLOAD-GATE-OPERATIONAL-TELEMETRY-SEAM-LOCAL");
    expect(releaseGates.production.localPasses?.map((pass) => pass.id)).toContain("UPLOAD-GATE-DIRECT-UPLOAD-RESERVED-SESSION-BACKPRESSURE-LOCAL");
    expect(releaseGates.production.localPasses?.map((pass) => pass.id)).toContain("UPLOAD-GATE-OPERATIONS-ALERT-WEBHOOK-SINK-LOCAL");
    expect(releaseGates.production.localPasses?.map((pass) => pass.id)).toContain("UPLOAD-GATE-ALERT-DELIVERY-PROOF-HARNESS-LOCAL");
    expect(releaseGates.production.localPasses?.map((pass) => pass.id)).toContain("UPLOAD-GATE-OPERATIONS-DASHBOARD-QUERY-LOCAL");
    expect(releaseGates.production.localPasses?.map((pass) => pass.id)).toContain("UPLOAD-GATE-OPERATIONS-DASHBOARD-SURFACE-LOCAL");
    expect(releaseGates.production.localPasses?.map((pass) => pass.id)).toContain("UPLOAD-GATE-PRODUCTION-OBSERVATION-PROOF-HARNESSES-LOCAL");
    expect(releaseGates.production.localPasses?.map((pass) => pass.id)).toContain("UPLOAD-GATE-PRODUCTION-OBSERVATION-RUNBOOK-TEMPLATE-LOCAL");
    expect(releaseGates.production.localPasses?.map((pass) => pass.id)).toContain("UPLOAD-GATE-SCANNER-RPC-PROVIDER-READBACK");
    expect(releaseGates.production.localPasses?.map((pass) => pass.id)).toContain("UPLOAD-GATE-SCAN-JOB-RUNNER-LOCAL");
    expect(releaseGates.production.localPasses?.map((pass) => pass.id)).toContain("UPLOAD-GATE-SCAN-WORKER-PROVIDER-READBACK");
    expect(releaseGates.production.localPasses?.map((pass) => pass.id)).toContain("UPLOAD-GATE-SCAN-WORKER-ROUTE-LOCAL");
    expect(releaseGates.production.localPasses?.map((pass) => pass.id)).toContain("UPLOAD-GATE-CLAMD-SCANNER-PROVIDER-LOCAL");
    expect(releaseGates.production.localPasses?.map((pass) => pass.id)).toContain("UPLOAD-GATE-CLAMD-LIVE-PROOF-HARNESS-LOCAL");
    expect(releaseGates.production.localPasses?.map((pass) => pass.id)).toContain("UPLOAD-GATE-HOSTED-UPLOAD-OPERATIONS-DRY-RUN-HARNESS-LOCAL");
    expect(releaseGates.production.localPasses?.map((pass) => pass.id)).toContain("UPLOAD-GATE-SCAN-OVERRIDE-ROUTE-LOCAL");
    expect(releaseGates.production.localPasses?.map((pass) => pass.id)).toContain("UPLOAD-GATE-SCAN-OVERRIDE-UI-RUNBOOK-LOCAL");
    expect(releaseGates.production.localPasses?.map((pass) => pass.id)).toContain("UPLOAD-GATE-CLEAN-DOWNLOAD-PROVIDER-READBACK");
    expect(releaseGates.production.localPasses?.map((pass) => pass.id)).toContain("UPLOAD-GATE-HOSTED-RUNTIME-PROOF-HARNESS-LOCAL");
    expect(releaseGates.production.localPasses?.map((pass) => pass.id)).toContain("UPLOAD-GATE-PRODUCTION-PROOF-ENV-PREFLIGHT-LOCAL");
    expect(releaseGates.production.localPasses?.map((pass) => pass.id)).toContain("UPLOAD-GATE-PRODUCTION-PROOF-RUNBOOK-LOCAL");
    expect(releaseGates.production.localPasses?.map((pass) => pass.id)).toContain("UPLOAD-GATE-OPERATIONS-RUNBOOK-DRILL-LOCAL");
    expect(JSON.stringify(releaseGates.production.localPasses)).toContain("linked-provider concurrency proof");
    expect(JSON.stringify(releaseGates.production.localPasses)).toContain("scripts/verify-hosted-upload-operations.ts");
    expect(JSON.stringify(releaseGates.production.localPasses)).toContain("scripts/verify-upload-alert-delivery.ts");
    expect(JSON.stringify(releaseGates.production.localPasses)).toContain("uploadProductionProofReady");
    expect(JSON.stringify(releaseGates.production.localPasses)).toContain("scripts/verify-upload-production-observations.ts");
    expect(JSON.stringify(releaseGates.production.localPasses)).toContain("upload-production-observations-input.template.json");
    expect(JSON.stringify(releaseGates.production.blockers)).toContain("path-safe cleanup/admission/scan operational telemetry seam");
    expect(JSON.stringify(releaseGates.production.blockers)).toContain("source/local/provider-proven signed/direct-upload reserved-session backpressure");
    expect(JSON.stringify(releaseGates.production.blockers)).not.toContain("atomic create_upload_session capacity enforcement is not complete");
    expect(JSON.stringify(releaseGates.production.blockers)).toContain("non-blocking sanitized webhook alert sink");
    expect(JSON.stringify(releaseGates.production.blockers)).toContain("path-safe platform-admin operations dashboard query and settings surface");
    expect(JSON.stringify(releaseGates.production.blockers)).toContain("real hosted dashboard emission");
    expect(JSON.stringify(releaseGates.production.blockers)).toContain("local cleanup/scan operations runbook drill");
    expect(JSON.stringify(releaseGates.production.blockers)).toContain("observed alert delivery");
    expect(JSON.stringify(releaseGates.production.blockers)).not.toContain("quota alert delivery");
    expect(JSON.stringify(releaseGates.production.blockers)).toContain("observed hosted backpressure exercise");
    expect(JSON.stringify(releaseGates.production.blockers)).not.toContain("production backpressure hooks");
    expect(JSON.stringify(releaseGates.production.blockers)).toContain("production retention runbook exercise");
    expect(JSON.stringify(releaseGates.production.blockers)).toContain("secret-gated upload-runtime route");
    expect(JSON.stringify(releaseGates.production.blockers)).toContain("hosted body-size, memory, duration, concurrency, and storage-latency observations");
    expect(JSON.stringify(releaseGates.production.blockers)).toContain("upload production env-name preflight");
    expect(releaseGates.platform.localPasses?.map((pass) => pass.id)).toContain("UPLOAD-GATE-PROVIDER-ADAPTER-READ-PARITY-LOCAL");
    expect(releaseGates.platform.localPasses?.map((pass) => pass.id)).toContain("UPLOAD-GATE-UPLOAD-SESSION-STRATEGY-LOCAL");
    expect(releaseGates.platform.localPasses?.map((pass) => pass.id)).toContain("UPLOAD-GATE-PROVIDER-MIGRATION-DRY-RUN-READBACK");
    expect(releaseGates.platform.localPasses?.map((pass) => pass.id)).toContain("UPLOAD-GATE-S3-LIKE-MULTIPART-PARITY-LOCAL");
    expect(releaseGates.platform.localPasses?.map((pass) => pass.id)).toContain("UPLOAD-GATE-ASSET-DESCRIPTOR-MIGRATION-PARITY-LOCAL");
    expect(releaseGates.platform.localPasses?.map((pass) => pass.id)).toContain("UPLOAD-GATE-SUPABASE-SIGNED-UPLOAD-PROVIDER-READBACK");
    expect(releaseGates.platform.localPasses?.map((pass) => pass.id)).toContain("UPLOAD-GATE-SIGNED-UPLOAD-APP-ROUTE-PROVIDER-READBACK");
    expect(releaseGates.platform.localPasses?.map((pass) => pass.id)).toContain("UPLOAD-GATE-SIGNED-UPLOAD-BROWSER-CLIENT-LOCAL");
    expect(releaseGates.platform.localPasses?.map((pass) => pass.id)).toContain("UPLOAD-GATE-TUS-RESUMABLE-APP-ROUTE-LOCAL");
    expect(releaseGates.platform.localPasses?.map((pass) => pass.id)).toContain("UPLOAD-GATE-TUS-RESUMABLE-BROWSER-CLIENT-LOCAL");
    expect(releaseGates.platform.localPasses?.map((pass) => pass.id)).toContain("UPLOAD-GATE-SUPABASE-TUS-RESUMABLE-PROVIDER-READBACK");
    expect(JSON.stringify(releaseGates.platform.blockers)).not.toContain("real resumable/TUS/multipart provider flows");
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
        command: "ARCH_UPLOAD_TUS_PROVIDER_PROOF=1 ARCH_UPLOAD_TUS_PROVIDER_PROOF_ENV_FILE=.env.local bun run scripts/prove-upload-tus-provider-postgres.ts",
        exit: 0,
        result: "Linked provider signed TUS resumable proof passed with reserved session readback, 6 MB creation-with-upload plus tail PATCH through /storage/v1/upload/resumable/sign, x-signature without Authorization header, provider object-head validation by ETag, finalize_upload_session asset/event readback, sanitized metadata, failedChecks=[] and cleanupErrors=[]. See evidence/upload-tus-provider-proof.json",
      }),
      expect.objectContaining({
        command: "bunx vitest run tests/vitest/upload-provider-portability.test.ts tests/vitest/upload-signed-route.test.ts tests/vitest/upload-component-attachment-client.test.ts tests/vitest/upload-tus-provider-proof-script.test.ts tests/vitest/upload-tus-provider-proof.test.ts --maxWorkers=1",
        exit: 0,
        result: "5 files, 21 tests passed",
      }),
      expect.objectContaining({
        command: "bunx eslint src/lib/uploads/component-attachment-client.ts src/components/workshop/component-library-manager/AddComponentModal.tsx tests/vitest/upload-component-attachment-client.test.ts",
        exit: 0,
        result: "No lint errors for component attachment signed-direct client transport, Add Component modal integration, and focused client tests",
      }),
      expect.objectContaining({
        command: "bunx vitest run tests/vitest/upload-cleanup-job.test.ts tests/vitest/upload-cleanup-route.test.ts tests/vitest/upload-abuse-caps.test.ts --maxWorkers=1",
        exit: 0,
        result: "3 files, 16 tests passed",
      }),
      expect.objectContaining({
        command: "bunx eslint src/lib/uploads/operational-telemetry.ts src/lib/uploads/cleanup-job.ts src/lib/uploads/admission-control.ts tests/vitest/upload-cleanup-job.test.ts tests/vitest/upload-cleanup-route.test.ts tests/vitest/upload-abuse-caps.test.ts",
        exit: 0,
        result: "Scoped upload operational telemetry, cleanup job, admission control, and focused test lint passed with no errors",
      }),
      expect.objectContaining({
        command: "bunx vitest run tests/vitest/upload-operational-alerts.test.ts tests/vitest/upload-abuse-caps.test.ts tests/vitest/vercel-env-readiness-script.test.ts --maxWorkers=1",
        exit: 0,
        result: "3 files, 16 tests passed",
      }),
      expect.objectContaining({
        command: "bunx eslint src/lib/uploads/operational-telemetry.ts src/lib/uploads/admission-control.ts scripts/check-vercel-env-readiness.ts tests/vitest/upload-operational-alerts.test.ts tests/vitest/upload-abuse-caps.test.ts tests/vitest/vercel-env-readiness-script.test.ts",
        exit: 0,
        result: "Scoped upload operational alert sink, admission control, Vercel env readiness, and focused tests lint passed with no errors",
      }),
      expect.objectContaining({
        command: "bunx vitest run tests/vitest/upload-signed-route.test.ts tests/vitest/upload-abuse-caps.test.ts --maxWorkers=1",
        exit: 0,
        result: "2 files, 18 tests passed",
      }),
      expect.objectContaining({
        command: "bunx eslint src/lib/uploads/direct-upload-records.ts src/app/api/component-library/attachments/direct-upload/route.ts tests/vitest/upload-signed-route.test.ts tests/vitest/upload-abuse-caps.test.ts",
        exit: 0,
        result: "Scoped upload direct-session backpressure lint passed with no errors",
      }),
      expect.objectContaining({
        command: "bunx vitest run tests/vitest/upload-scan-job.test.ts tests/vitest/upload-cleanup-job.test.ts tests/vitest/upload-abuse-caps.test.ts --maxWorkers=1",
        exit: 0,
        result: "3 files, 17 tests passed",
      }),
      expect.objectContaining({
        command: "bunx eslint src/lib/uploads/operational-telemetry.ts src/lib/uploads/scan-job.ts tests/vitest/upload-scan-job.test.ts tests/vitest/upload-cleanup-job.test.ts tests/vitest/upload-abuse-caps.test.ts",
        exit: 0,
        result: "Scoped upload scan operational telemetry lint passed with no errors",
      }),
      expect.objectContaining({
        command: "ARCH_UPLOAD_SCAN_WORKER_PROVIDER_PROOF=1 ARCH_UPLOAD_SCAN_WORKER_PROVIDER_PROOF_ENV_FILE=.env.local bun run scripts/prove-upload-scan-worker-provider-postgres.ts",
        exit: 0,
        result: "Linked provider scan worker proof passed with pending provider asset readback, listUploadScanJobRecords visibility, Supabase Storage byte download through runUploadScanJob, clean policy-scanner outcome persisted by checksum-bound result writer, scan_clean event and telemetry readback, rawStoragePathRecorded=false, failedChecks=[] and cleanupErrors=[]. See evidence/upload-scan-worker-provider-proof.json",
      }),
      expect.objectContaining({
        command: "bunx vitest run tests/vitest/upload-scan-worker-provider-proof-script.test.ts tests/vitest/upload-scan-worker-provider-proof.test.ts --maxWorkers=1",
        exit: 0,
        result: "2 files, 6 tests passed",
      }),
      expect.objectContaining({
        command: "bunx eslint scripts/prove-upload-scan-worker-provider-postgres.ts tests/vitest/upload-scan-worker-provider-proof-script.test.ts tests/vitest/upload-scan-worker-provider-proof.test.ts",
        exit: 0,
        result: "Scoped upload scan worker provider proof lint passed with no errors",
      }),
      expect.objectContaining({
        command: "bunx vitest run tests/vitest/upload-operations-dashboard.test.ts --maxWorkers=1",
        exit: 0,
        result: "1 file, 4 tests passed",
      }),
      expect.objectContaining({
        command: "bunx eslint src/lib/uploads/operations-dashboard.ts tests/vitest/upload-operations-dashboard.test.ts",
        exit: 0,
        result: "Scoped upload operations dashboard query lint passed with no errors",
      }),
      expect.objectContaining({
        command: "bunx vitest run tests/vitest/upload-operations-dashboard.test.ts tests/vitest/upload-operations-dashboard-ui.test.tsx tests/vitest/workshop-settings-modal-content-view.test.tsx --maxWorkers=1",
        exit: 0,
        result: "3 files, 11 tests passed",
      }),
      expect.objectContaining({
        command: "bunx eslint src/lib/uploads/operations-dashboard.ts src/components/workshop/UploadOperationsDashboardPanel.tsx src/app/workshop/settings/upload-operations/page.tsx src/components/workshop/WorkshopSettingsModalContentView.tsx tests/vitest/upload-operations-dashboard.test.ts tests/vitest/upload-operations-dashboard-ui.test.tsx tests/vitest/workshop-settings-modal-content-view.test.tsx",
        exit: 0,
        result: "Scoped upload operations dashboard page, panel, query, settings rail, and focused tests lint passed with no errors",
      }),
      expect.objectContaining({
        command: "bun run scripts/prove-upload-operations-runbook-local.ts",
        exit: 0,
        result: "Local upload operations runbook proof passed with cleanup failure/retry, scan clean/transient outcomes, scan override review rehearsal, path-safe telemetry, failedChecks=[]; see evidence/upload-operations-runbook-local-proof.json",
      }),
      expect.objectContaining({
        command: "bunx vitest run tests/vitest/upload-operations-runbook-local-proof-script.test.ts tests/vitest/upload-operations-runbook-local-proof.test.ts --maxWorkers=1",
        exit: 0,
        result: "2 files, 4 tests passed",
      }),
      expect.objectContaining({
        command: "bunx eslint scripts/prove-upload-operations-runbook-local.ts tests/vitest/upload-operations-runbook-local-proof-script.test.ts tests/vitest/upload-operations-runbook-local-proof.test.ts",
        exit: 0,
        result: "Scoped upload operations runbook local proof lint passed with no errors",
      }),
      expect.objectContaining({
        command: "bunx vitest run tests/vitest/library-add-component-modal-a11y.test.tsx --maxWorkers=1",
        exit: 0,
        result: "1 file, 7 tests passed",
      }),
      expect.objectContaining({
        command: "bunx eslint src/components/workshop/component-library-manager/AddComponentModal.tsx tests/vitest/library-add-component-modal-a11y.test.tsx",
        exit: 0,
        result: "Scoped Add Component attachment status UX lint passed with no errors",
      }),
      expect.objectContaining({
        command: "bunx vitest run tests/vitest/upload-scan-job.test.ts --maxWorkers=1",
        exit: 0,
        result: "1 file, 4 tests passed",
      }),
      expect.objectContaining({
        command: "bunx eslint src/lib/uploads/scan-job.ts tests/vitest/upload-scan-job.test.ts",
        exit: 0,
        result: "Scoped upload scan job runner lint passed with no errors",
      }),
      expect.objectContaining({
        command: "bunx vitest run tests/vitest/upload-scan-override-route.test.ts --maxWorkers=1",
        exit: 0,
        result: "1 file, 5 tests passed",
      }),
      expect.objectContaining({
        command: "bunx eslint src/lib/uploads/scan-override.ts src/app/api/component-library/attachments/scan-override/route.ts tests/vitest/upload-scan-override-route.test.ts",
        exit: 0,
        result: "Scoped upload scan override route/helper lint passed with no errors",
      }),
      expect.objectContaining({
        command: "bunx vitest run tests/vitest/upload-scan-route.test.ts tests/vitest/upload-scanning.test.ts tests/vitest/upload-cleanup-cron-config.test.ts --maxWorkers=1",
        exit: 0,
        result: "3 files, 11 tests passed",
      }),
      expect.objectContaining({
        command: "bunx eslint src/app/api/internal/upload-scan/route.ts src/lib/uploads/policy-scanner.ts src/lib/uploads/scan-job.ts tests/vitest/upload-scan-route.test.ts tests/vitest/upload-scanning.test.ts tests/vitest/upload-cleanup-cron-config.test.ts",
        exit: 0,
        result: "Scoped upload scan worker route, policy scanner, byte adapter, cron config, and focused tests lint passed with no errors",
      }),
      expect.objectContaining({
        command: "bunx vitest run tests/vitest/upload-clamd-scanner.test.ts tests/vitest/upload-scan-route.test.ts tests/vitest/upload-scanning.test.ts tests/vitest/upload-cleanup-cron-config.test.ts tests/vitest/upload-release-gates.test.ts --maxWorkers=1",
        exit: 0,
        result: "5 files, 17 tests passed",
      }),
      expect.objectContaining({
        command: "bunx eslint src/lib/uploads/clamd-scanner.ts src/app/api/internal/upload-scan/route.ts src/lib/uploads/policy-scanner.ts src/lib/uploads/scan-job.ts tests/vitest/upload-clamd-scanner.test.ts tests/vitest/upload-scan-route.test.ts tests/vitest/upload-scanning.test.ts tests/vitest/upload-cleanup-cron-config.test.ts tests/vitest/upload-release-gates.test.ts",
        exit: 0,
        result: "Scoped upload ClamD scanner provider, scan worker route, policy scanner, byte adapter, cron config, release gate, and focused tests lint passed with no errors",
      }),
      expect.objectContaining({
        command: "bunx vitest run tests/vitest/upload-clamd-live-proof-script.test.ts --maxWorkers=1",
        exit: 0,
        result: "1 file, 3 tests passed",
      }),
      expect.objectContaining({
        command: "bunx eslint scripts/prove-upload-clamd-live.ts tests/vitest/upload-clamd-live-proof-script.test.ts tests/vitest/upload-release-gates.test.ts",
        exit: 0,
        result: "Scoped live ClamD proof harness and release-gate lint passed with no errors",
      }),
      expect.objectContaining({
        command: "bunx vitest run tests/vitest/upload-runtime-route.test.ts tests/vitest/hosted-upload-runtime-proof-script.test.ts --maxWorkers=1",
        exit: 0,
        result: "2 files, 10 tests passed",
      }),
      expect.objectContaining({
        command: "bunx eslint src/app/api/internal/upload-runtime/route.ts scripts/verify-hosted-upload-runtime.ts tests/vitest/upload-runtime-route.test.ts tests/vitest/hosted-upload-runtime-proof-script.test.ts tests/vitest/upload-release-gates.test.ts",
        exit: 0,
        result: "Scoped hosted upload runtime proof route, verifier, and release-gate lint passed with no errors",
      }),
      expect.objectContaining({
        command: "bunx vitest run tests/vitest/upload-scan-override-ui.test.tsx tests/vitest/workshop-settings-modal-content-view.test.tsx tests/vitest/upload-attachment-scan-freeze.test.ts tests/vitest/component-library-attachment-lifecycle.test.ts tests/vitest/upload-operations-runbook-local-proof-script.test.ts tests/vitest/upload-operations-runbook-local-proof.test.ts --maxWorkers=1",
        exit: 0,
        result: "6 files, 22 tests passed",
      }),
      expect.objectContaining({
        command: "bunx vitest run tests/vitest/upload-scan-override-ui.test.tsx tests/vitest/workshop-settings-modal-content-view.test.tsx tests/vitest/upload-scan-override-route.test.ts tests/vitest/upload-attachment-scan-freeze.test.ts tests/vitest/component-library-attachment-lifecycle.test.ts tests/vitest/upload-operations-runbook-local-proof-script.test.ts tests/vitest/upload-operations-runbook-local-proof.test.ts tests/vitest/upload-release-gates.test.ts --maxWorkers=1",
        exit: 0,
        result: "8 files, 29 tests passed",
      }),
      expect.objectContaining({
        command: "bunx eslint src/lib/uploads/scan-override-review.ts src/components/workshop/UploadScanOverridePanel.tsx src/app/workshop/settings/scan-overrides/page.tsx src/components/workshop/WorkshopSettingsModalContentView.tsx src/app/api/component-library/attachments/route.ts scripts/prove-upload-operations-runbook-local.ts tests/vitest/upload-scan-override-ui.test.tsx tests/vitest/workshop-settings-modal-content-view.test.tsx tests/vitest/upload-attachment-scan-freeze.test.ts tests/vitest/component-library-attachment-lifecycle.test.ts tests/vitest/upload-operations-runbook-local-proof-script.test.ts tests/vitest/upload-operations-runbook-local-proof.test.ts tests/vitest/upload-release-gates.test.ts",
        exit: 0,
        result: "Scoped scan override operator UI, download gate, runbook, and release-gate lint passed with no errors",
      }),
    ]));
    expect(JSON.stringify(releaseGates)).not.toContain("provider proof skipped");
  });
});
