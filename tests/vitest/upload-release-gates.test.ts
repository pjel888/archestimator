import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const releaseGates = JSON.parse(readFileSync(join(
  process.cwd(),
  ".ai/03_plans/2026-06-26-File-Upload-Audit-And-Improvement/evidence/upload-release-gates.json",
), "utf8")) as {
  proofBoundary: string;
  closedBeta: { status: string; blockers: Array<{ id: string }> };
  production: { status: string; blockers: Array<{ id: string }> };
  platform: { status: string; blockers: Array<{ id: string }>; localPasses?: Array<{ id: string }> };
  localEvidence: Array<{ command: string; exit: number; result: string }>;
};

describe("upload release gates", () => {
  it("separates local closed-beta hardening from missing provider, production, and platform proof", () => {
    expect(releaseGates.proofBoundary).toBe("local-plus-linked-provider-readback");
    expect(releaseGates.closedBeta.status).toBe("blocked");
    expect(releaseGates.production.status).toBe("blocked");
    expect(releaseGates.platform.status).toBe("blocked");
    expect(releaseGates.closedBeta.blockers.map((blocker) => blocker.id)).toEqual(expect.arrayContaining([
      "UPLOAD-GATE-PROVIDER-STORAGE-DENIAL",
      "UPLOAD-GATE-COMPONENT-IMAGE-PRIVACY-DECISION",
    ]));
    expect(releaseGates.closedBeta.blockers.map((blocker) => blocker.id)).not.toContain("UPLOAD-GATE-ESTIMATE-ROW-ASSET-FINALITY");
    expect(releaseGates.closedBeta.blockers.map((blocker) => blocker.id)).not.toContain("UPLOAD-GATE-UPLOAD-DOMAIN-APPLIED-PROOF");
    expect(releaseGates.production.blockers.map((blocker) => blocker.id)).toContain("UPLOAD-GATE-SCANNER");
    expect(releaseGates.platform.blockers.map((blocker) => blocker.id)).toContain("UPLOAD-GATE-PROVIDER-PORTABILITY");
  });

  it("records the latest local upload validation command without claiming provider proof", () => {
    expect(releaseGates.localEvidence).toEqual(expect.arrayContaining([
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
    expect(JSON.stringify(releaseGates.closedBeta.localPasses)).toContain("UPLOAD-GATE-COMPONENT-IMAGE-PERSISTED-SCAN-READBACK");
    expect(JSON.stringify(releaseGates.closedBeta.localPasses)).toContain("UPLOAD-GATE-COMPONENT-IMAGE-PRIVATE-BUCKET-READBACK");
    expect(JSON.stringify(releaseGates.closedBeta.localPasses)).toContain("UPLOAD-GATE-UPLOAD-DOMAIN-APPLIED-READBACK");
    expect(JSON.stringify(releaseGates.closedBeta.blockers)).toContain("direct object read-denial operation proof is not captured");
    expect(JSON.stringify(releaseGates.closedBeta.blockers)).toContain("publication snapshot migration has not been exercised against non-empty publication data");
    expect(JSON.stringify(releaseGates.closedBeta.blockers)).not.toContain("component-images bucket remains public");
    expect(JSON.stringify(releaseGates.closedBeta.blockers)).not.toContain("final product/security privacy decision");
    expect(JSON.stringify(releaseGates.closedBeta.blockers)).not.toContain("provider-backed read denial is not captured");
    expect(JSON.stringify(releaseGates.closedBeta.blockers)).not.toContain("classifier has not been run against persisted provider/project data");
    expect(JSON.stringify(releaseGates.production.blockers)).toContain("durable scheduled TTL cleanup");
    expect(releaseGates.platform.localPasses?.map((pass) => pass.id)).toContain("UPLOAD-GATE-PROVIDER-ADAPTER-READ-PARITY-LOCAL");
    expect(releaseGates.platform.localPasses?.map((pass) => pass.id)).toContain("UPLOAD-GATE-UPLOAD-SESSION-STRATEGY-LOCAL");
    expect(releaseGates.platform.localPasses?.map((pass) => pass.id)).toContain("UPLOAD-GATE-PROVIDER-MIGRATION-DRY-RUN-READBACK");
    expect(releaseGates.platform.localPasses?.map((pass) => pass.id)).toContain("UPLOAD-GATE-S3-LIKE-MULTIPART-PARITY-LOCAL");
    expect(releaseGates.platform.localPasses?.map((pass) => pass.id)).toContain("UPLOAD-GATE-ASSET-DESCRIPTOR-MIGRATION-PARITY-LOCAL");
    expect(JSON.stringify(releaseGates.platform.blockers)).toContain("signed/resumable flows are not implemented against a real provider");
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
    ]));
    expect(JSON.stringify(releaseGates)).not.toContain("provider-backed pass");
  });
});
