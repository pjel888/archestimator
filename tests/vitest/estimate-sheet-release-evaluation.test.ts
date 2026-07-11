import { existsSync, mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

import { describe, expect, it } from "vitest";

import { RELEASE_EVALUATION_SCHEMA } from "../../scripts/lib/estimate-sheet-performance-contract";
import { writeEstimateSheetReleaseEvaluation } from "../../scripts/write-estimate-sheet-release-evaluation";

const scriptPath = resolve(process.cwd(), "scripts/write-estimate-sheet-release-evaluation.ts");
const describeRelease = describe.skipIf(!existsSync(scriptPath));

describeRelease("estimate-sheet release evaluation contract", () => {
  it("writes the dedicated release schema and maps evaluator status", () => {
    const source = readFileSync(scriptPath, "utf8");
    expect(source).toContain(RELEASE_EVALUATION_SCHEMA);
    expect(source).toMatch(/READY/);
    expect(source).toMatch(/NOT_READY/);
    expect(source).toMatch(/BLOCKED/);
  });

  it("keeps hosted proof and release-gate receipts as dependencies", () => {
    const source = readFileSync(scriptPath, "utf8");
    expect(source).toMatch(/hosted|observability/i);
    expect(source).toMatch(/release-gates|release.*gate/i);
    expect(source).toMatch(/sha256|fingerprint/i);
    expect(source).toMatch(/dependency|receipt/i);
  });

  it("binds immutable hosted and release-gate receipts while retaining no-deploy residuals", () => {
    const root = mkdtempSync(join(tmpdir(), "estimate-release-"));
    const runRoot = join(root, "run");
    const fingerprint = {
      contract_version: "estimate-sheet-fingerprint.v1",
      path_count: 1,
      path_list_sha256: "a".repeat(64),
      content_sha256: "b".repeat(64),
    };
    try {
      mkdirSync(runRoot, { recursive: true });
      writeFileSync(join(runRoot, "hosted.json"), "{\"hosted\":true}\n", { mode: 0o600 });
      writeFileSync(join(runRoot, "release-gates.json"), "{\"gates\":true}\n", { mode: 0o600 });
      writeFileSync(join(runRoot, "run-manifest.json"), `${JSON.stringify({
        schema_version: "estimate-sheet-performance-run.v1",
        package_id: "PLAN-2026-07-08-project-estimate-sheet-performance",
        unit_id: "UNIT-011",
        run_id: "release-test-run",
        profile: "artifact-only",
        cleanupRequirement: "NOT_APPLICABLE",
        run_root: runRoot,
        pointer_path: join(root, "current.json"),
        created_at: "2026-07-11T00:00:00.000Z",
        status: "PREPARED",
        sourceFingerprint: { contract_version: "estimate-sheet-source-fingerprint.v2", head: "1234567", path_count: 1, path_list_sha256: "c".repeat(64), application: fingerprint, producer: fingerprint },
        applicationFingerprint: fingerprint,
        producerFingerprint: fingerprint,
        namespaces: {},
        mutationJournal: [],
        previewProcesses: [],
      })}\n`, { mode: 0o600 });

      const result = writeEstimateSheetReleaseEvaluation({
        runManifest: join(runRoot, "run-manifest.json"),
        hostedD1: "hosted.json",
        releaseGates: "release-gates.json",
        status: "NOT_READY",
        reasons: ["hosted-observability-pending"],
      });
      expect(result.evaluation.schema_version).toBe(RELEASE_EVALUATION_SCHEMA);
      expect(result.evaluation.fieldInp.status).toBe("NOT_EVALUATED");
      expect(result.evaluation.manualScreenReader.status).toBe("NOT_EVALUATED");
      expect(readFileSync(result.outputPath, "utf8")).toContain("hosted-observability-pending");
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});
