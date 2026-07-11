import { spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import {
  canonicalJson,
  sha256Hex,
} from "../../scripts/lib/estimate-sheet-performance-contract";
import { createTestReceipt } from "../../scripts/lib/estimate-sheet-performance-test-receipt";
import { fixturePayloadWithoutLinkage, stableStringify } from "../fixtures/estimate-sheet-performance";

function writeRun(root: string, options: { receiptFingerprint?: "current" | "different" } = {}) {
  const runRoot = join(root, "run");
  const source = readCurrentSourceFingerprint();
  const applicationFingerprint = source.application;
  const producerFingerprint = source.producer;
  mkdirSync(join(runRoot, "receipts"), { recursive: true });
  const manifest = {
    schema_version: "estimate-sheet-performance-run.v1",
    package_id: "PLAN-2026-07-08-project-estimate-sheet-performance",
    unit_id: "UNIT-001",
    run_id: "measurement-test-run",
    profile: "artifact-only",
    cleanupRequirement: "NOT_APPLICABLE",
    run_root: runRoot,
    pointer_path: join(runRoot, "run-pointer.json"),
    created_at: "2026-07-11T00:00:00.000Z",
    status: "PREPARED",
    sourceFingerprint: source,
    applicationFingerprint,
    producerFingerprint,
    namespaces: {},
    mutationJournal: [],
    previewProcesses: [],
  };
  writeFileSync(join(runRoot, "run-manifest.json"), `${JSON.stringify(manifest)}\n`, { mode: 0o600 });
  const receiptFingerprint = options.receiptFingerprint === "different"
    ? { ...applicationFingerprint, content_sha256: sha256Hex("different") }
    : applicationFingerprint;
  const receipt = createTestReceipt({
    testClass: "vitest",
    argv: ["bun", "run", "test:dom"],
    files: ["tests/vitest/example.test.ts"],
    unitId: "UNIT-001",
    runId: manifest.run_id,
    applicationFingerprint: receiptFingerprint,
    producerFingerprint,
    preApplicationFingerprint: receiptFingerprint,
    preProducerFingerprint: producerFingerprint,
    passed: 1,
    failed: 0,
    skipped: 0,
    durationMs: 1,
  });
  writeFileSync(join(runRoot, "receipts", "dom-tests.json"), `${JSON.stringify(receipt)}\n`, { mode: 0o600 });
  for (const role of ["fingerprint-reference", "typecheck", "error-handling"]) {
    writeFileSync(join(runRoot, "receipts", `command-${role}.json`), `${JSON.stringify({
      schema_version: "estimate-sheet-command-receipt.v1",
      role,
      unit_id: manifest.unit_id,
      run_id: manifest.run_id,
      overall: "PASS",
      application_fingerprint: applicationFingerprint,
      producer_fingerprint: producerFingerprint,
    })}\n`, { mode: 0o600 });
  }
  return { manifestPath: join(runRoot, "run-manifest.json"), runRoot };
}

function sanitizedEnvironment() {
  return { PATH: process.env.PATH, HOME: process.env.HOME, TMPDIR: process.env.TMPDIR };
}

function readCurrentSourceFingerprint() {
  const result = spawnSync("bun", ["run", "scripts/compute-estimate-sheet-source-fingerprint.ts"], {
    cwd: process.cwd(),
    encoding: "utf8",
    env: sanitizedEnvironment(),
  });
  if (result.status !== 0) throw new Error(result.stderr || "unable to compute source fingerprint");
  return JSON.parse(result.stdout);
}

function runMeasure(manifestPath: string) {
  return spawnSync("bun", ["run", "scripts/measure-estimate-sheet-performance.ts", "--",
    `--run-manifest=${manifestPath}`,
    "--unit=UNIT-001",
    "--profile=small",
    "--evidence-class=jsdom",
    "--budget-policy=record-only",
    "--tests=auto:dom-tests",
    "--gates=auto:fingerprint-reference,auto:typecheck,auto:error-handling",
    "--fixture-output=auto:fixture",
    "--output=auto:jsdom",
  ], {
    cwd: process.cwd(),
    encoding: "utf8",
    env: sanitizedEnvironment(),
  });
}

describe("estimate-sheet measurement producer", () => {
  it("writes a reciprocal fixture/report pair only after validating receipt and gate lineage", () => {
    const root = mkdtempSync(join(tmpdir(), "estimate-measurement-"));
    try {
      const { manifestPath, runRoot } = writeRun(root);
      const result = runMeasure(manifestPath);
      expect(result.status, result.stderr).toBe(0);
      const report = JSON.parse(readFileSync(join(runRoot, "reports", "jsdom.json"), "utf8"));
      const fixture = JSON.parse(readFileSync(join(runRoot, "fixtures", "fixture.json"), "utf8"));
      expect(report.overall).toBe("PASS");
      expect(report.failures).toBeUndefined();
      expect(report.fixtureHash).toBe(sha256Hex(stableStringify(fixturePayloadWithoutLinkage(fixture))));
      expect(fixture.linkage.counterpartPayloadSha256).toBe(sha256Hex(canonicalJson(report)));
      expect(fixture.linkage.bundleSha256).toBe(sha256Hex(canonicalJson({
        fixturePayloadSha256: report.fixtureHash,
        reportPayloadSha256: fixture.linkage.counterpartPayloadSha256,
      })));
      expect(report.metrics["M-GRAPH-ANCESTOR-LOOKUP-P95"]).toMatchObject({ status: "SKIPPED" });
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("rejects a mismatched test receipt before publishing either artifact", () => {
    const root = mkdtempSync(join(tmpdir(), "estimate-measurement-invalid-"));
    try {
      const { manifestPath, runRoot } = writeRun(root, { receiptFingerprint: "different" });
      const result = runMeasure(manifestPath);
      expect(result.status).not.toBe(0);
      expect(result.stderr).toMatch(/test receipt fingerprint mismatch/);
      expect(existsSync(join(runRoot, "fixtures", "fixture.json"))).toBe(false);
      expect(existsSync(join(runRoot, "reports", "jsdom.json"))).toBe(false);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});
