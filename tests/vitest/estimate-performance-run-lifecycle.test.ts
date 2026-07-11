import { copyFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, relative } from "node:path";

import { describe, expect, it } from "vitest";

import {
  RUN_MANIFEST_SCHEMA,
  ESTIMATE_LOGICAL_OUTPUTS,
  defaultImmutableRunRoot,
  defaultPlanRoot,
  defaultRunRoot,
  replaceFileAtomically,
  resolveRunManifestPath,
  sha256File,
  sha256Hex,
  sha256Json,
  validateRunManifest,
  writeNoOverwrite,
  type SourceFingerprint,
} from "../../scripts/lib/estimate-sheet-performance-contract";
import { readReceiptEnvironment } from "../../scripts/lib/estimate-sheet-performance-test-receipt";
import {
  prepareEstimateSheetPerformanceRun,
  recoverEstimateSheetPrepareTransition,
} from "../../scripts/prepare-estimate-sheet-performance-run";
import {
  parseEstimateSheetGateOptions,
  validateEstimateSheetGateCommand,
} from "../../scripts/run-estimate-sheet-performance-gate";

const digest = sha256Hex("run-lifecycle");
const fingerprint = {
  contract_version: "estimate-sheet-application-fingerprint.v1",
  path_count: 1,
  path_list_sha256: digest,
  content_sha256: digest,
};

function validManifest(root: string, overrides: Record<string, unknown> = {}) {
  return {
    schema_version: RUN_MANIFEST_SCHEMA,
    package_id: "PLAN-2026-07-08-project-estimate-sheet-performance",
    unit_id: "UNIT-001",
    run_id: "00000000-0000-4000-8000-000000000001",
    profile: "artifact-only",
    evidence_class: "jsdom",
    cleanupRequirement: "NOT_APPLICABLE",
    run_root: root,
    immutable_run_root: join(root, "immutable"),
    pointer_path: join(root, "run-pointer.json"),
    logical_outputs: { ...ESTIMATE_LOGICAL_OUTPUTS },
    created_at: "2026-07-11T00:00:00.000Z",
    status: "PREPARED",
    sourceFingerprint: {
      contract_version: "estimate-sheet-source-fingerprint.v2",
      head: "abcdef1234567",
      path_count: 1,
      path_list_sha256: digest,
      application: fingerprint,
      producer: fingerprint,
    },
    applicationFingerprint: fingerprint,
    producerFingerprint: fingerprint,
    namespaces: {},
    mutationJournal: [],
    previewProcesses: [],
    ...overrides,
  };
}

function copyFixtureFile(sourceRoot: string, destinationRoot: string, path: string): void {
  const destination = join(destinationRoot, path);
  mkdirSync(dirname(destination), { recursive: true });
  copyFileSync(join(sourceRoot, path), destination);
}

function createPrepareRepositoryFixture() {
  const sourceRoot = process.cwd();
  const repoRoot = mkdtempSync(join(tmpdir(), "estimate-sheet-prepare-repo-"));
  const planRoot = defaultPlanRoot(repoRoot);
  const admissionRelative = ".ai/99_scratch/estimate-sheet-performance/admissions/UNIT-001-planning.json";
  const admission = JSON.parse(readFileSync(join(sourceRoot, admissionRelative), "utf8")) as {
    independent_reviews: Array<{ path: string }>;
  };
  for (const path of [
    ".ai/03_plans/2026-07-08/Project-Estimate-Sheet-Performance-Optimization/plan-pack.json",
    ".ai/03_plans/2026-07-08/Project-Estimate-Sheet-Performance-Optimization/IMPLEMENTATION_PLAN.md",
    ".ai/03_plans/2026-07-08/Project-Estimate-Sheet-Performance-Optimization/evidence/2026-07-10-frontier-plan-readiness.md",
    ".ai/03_plans/2026-07-08/Project-Estimate-Sheet-Performance-Optimization/evidence/source-fingerprint-v1.mjs",
    ".ai/03_plans/2026-07-08/Project-Estimate-Sheet-Performance-Optimization/evidence/record-unit001-planning-admission.mjs",
    admissionRelative,
    ...admission.independent_reviews.map((review) => review.path),
  ]) copyFixtureFile(sourceRoot, repoRoot, path);
  return {
    repoRoot,
    planRoot,
    runRoot: defaultRunRoot(repoRoot),
    admissionPath: join(repoRoot, admissionRelative),
    planPath: join(planRoot, "plan-pack.json"),
    journalPath: join(repoRoot, ".ai/99_scratch/estimate-sheet-performance/plan-transition-journal.json"),
    unitLeasePath: join(repoRoot, ".ai/99_scratch/estimate-sheet-performance/leases/units/UNIT-001"),
    cleanup: () => rmSync(repoRoot, { recursive: true, force: true }),
  };
}

describe("estimate-sheet performance run lifecycle contract", () => {
  it("accepts the artifact-only UNIT-001 preparation state", () => {
    const root = join(tmpdir(), "estimate-sheet-lifecycle");
    expect(validateRunManifest(validManifest(root))).toEqual([]);
  });

  it("rejects a NOT_APPLICABLE run that declares preview or mutation resources", () => {
    const root = join(tmpdir(), "estimate-sheet-lifecycle-invalid");
    const errors = validateRunManifest(validManifest(root, {
      runtimeEnv: join(root, "runtime.env"),
      previewProcesses: [{ role: "preview", phase: "start" }],
      mutationJournal: [{ commandId: "mutate-1" }],
    }));
    expect(errors).toEqual(expect.arrayContaining([
      "NOT_APPLICABLE manifest cannot contain runtimeEnv",
      "NOT_APPLICABLE manifest cannot launch preview processes",
      "NOT_APPLICABLE manifest cannot contain mutations",
    ]));
  });

  it("requires complete immutable admission bindings in run manifests", () => {
    const root = join(tmpdir(), "estimate-sheet-lifecycle-admission");
    expect(validateRunManifest(validManifest(root, {
      admissionKind: "refreeze",
      admissionPath: "dependencies/admission.json",
    }))).toEqual(expect.arrayContaining([
      "admission path/hash must be present together",
    ]));
    expect(validateRunManifest(validManifest(root, {
      admissionKind: "refreeze",
      admissionPath: "dependencies/admission.json",
      admissionSha256: digest,
      inputApplicationFingerprint: fingerprint,
      inputProducerFingerprint: fingerprint,
    }))).toEqual([]);
  });

  it("binds refreeze test receipts to the admission-owned focused run", () => {
    const repoRoot = process.cwd();
    const scratchRoot = join(repoRoot, ".ai/99_scratch/estimate-sheet-performance/receipt-environment-tests");
    mkdirSync(scratchRoot, { recursive: true });
    const root = mkdtempSync(join(scratchRoot, "refreeze-"));
    const runRoot = join(root, "focused.run");
    const admissionPath = join(root, "admission.json");
    try {
      mkdirSync(runRoot, { recursive: true });
      const payload = {
        schema_version: "estimate-sheet-refreeze-admission.v1",
        status: "RECORDED",
        unit_id: "UNIT-002",
        focused_run: {
          run_id: "focused-refreeze-run",
          run_root: relative(repoRoot, runRoot),
          receipt_role: "refreeze-tests",
        },
      };
      writeFileSync(admissionPath, `${JSON.stringify({ ...payload, payload_sha256: sha256Json(payload) }, null, 2)}\n`, { mode: 0o600 });
      const environment = readReceiptEnvironment({
        ESTIMATE_PERF_UNIT: "UNIT-002",
        ESTIMATE_PERF_REFREEZE_ADMISSION: relative(repoRoot, admissionPath),
        ESTIMATE_PERF_TEST_OUTPUT_ROLE: "refreeze-tests",
      } as NodeJS.ProcessEnv);
      expect(environment).toMatchObject({
        enabled: true,
        role: "refreeze-tests",
        unitId: "UNIT-002",
        runId: "focused-refreeze-run",
        runRoot,
        receiptPath: join(runRoot, "receipts/refreeze-tests.json"),
      });
      expect(() => readReceiptEnvironment({
        ESTIMATE_PERF_UNIT: "UNIT-002",
        ESTIMATE_PERF_REFREEZE_ADMISSION: relative(repoRoot, admissionPath),
        ESTIMATE_PERF_TEST_OUTPUT_ROLE: "wrong-role",
      } as NodeJS.ProcessEnv)).toThrow(/binding is invalid/);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("publishes immutable files and refuses replacement", () => {
    const root = mkdtempSync(join(tmpdir(), "estimate-sheet-run-"));
    const target = join(root, "receipt.json");
    try {
      writeNoOverwrite(target, "first\n");
      expect(readFileSync(target, "utf8")).toBe("first\n");
      expect(() => writeNoOverwrite(target, "second\n")).toThrow(/refusing to overwrite/);
      expect(readFileSync(target, "utf8")).toBe("first\n");
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("separates mutable execution runs from pack-contained immutable evidence", () => {
    const repoRoot = join(tmpdir(), "estimate-sheet-repo");
    expect(defaultRunRoot(repoRoot)).toBe(join(
      repoRoot,
      ".ai/99_scratch/estimate-sheet-performance/runs",
    ));
    expect(defaultImmutableRunRoot(repoRoot)).toBe(join(
      repoRoot,
      ".ai/03_plans/2026-07-08/Project-Estimate-Sheet-Performance-Optimization/evidence/runtime/runs",
    ));
  });

  it("atomically replaces only the expected registered bytes", () => {
    const root = mkdtempSync(join(tmpdir(), "estimate-sheet-replace-"));
    const target = join(root, "projection.json");
    try {
      writeNoOverwrite(target, "stale\n", 0o644);
      const staleSha256 = sha256File(target);
      const currentSha256 = replaceFileAtomically(target, "current\n", staleSha256, 0o644);
      expect(currentSha256).toBe(sha256Hex("current\n"));
      expect(readFileSync(target, "utf8")).toBe("current\n");

      expect(() => replaceFileAtomically(target, "unexpected\n", staleSha256, 0o644))
        .toThrow(/current hash mismatch/);
      expect(readFileSync(target, "utf8")).toBe("current\n");
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("resolves the run committed by plan state instead of the newest orphan", () => {
    const repoRoot = mkdtempSync(join(tmpdir(), "estimate-sheet-resolve-"));
    const planRoot = join(repoRoot, ".ai/03_plans/2026-07-08/Project-Estimate-Sheet-Performance-Optimization");
    const unitRoot = join(repoRoot, ".ai/99_scratch/estimate-sheet-performance/runs/UNIT-001");
    const committedRoot = join(unitRoot, "committed");
    const orphanRoot = join(unitRoot, "orphan");
    try {
      mkdirSync(planRoot, { recursive: true });
      mkdirSync(committedRoot, { recursive: true });
      mkdirSync(orphanRoot, { recursive: true });
      writeFileSync(join(planRoot, "plan-pack.json"), `${JSON.stringify({
        runtime_evidence: {
          latest_unit_id: "UNIT-001",
          latest_run_id: "committed-run",
        },
      })}\n`);
      writeFileSync(join(committedRoot, "run-manifest.json"), `${JSON.stringify({
        unit_id: "UNIT-001",
        run_id: "committed-run",
        status: "PREPARED",
        created_at: "2026-07-11T00:00:00.000Z",
      })}\n`);
      writeFileSync(join(orphanRoot, "run-manifest.json"), `${JSON.stringify({
        unit_id: "UNIT-001",
        run_id: "orphan-run",
        status: "PREPARED",
        created_at: "2026-07-11T01:00:00.000Z",
      })}\n`);

      expect(resolveRunManifestPath(repoRoot, "UNIT-001")).toBe(join(committedRoot, "run-manifest.json"));
    } finally {
      rmSync(repoRoot, { recursive: true, force: true });
    }
  });

  it("commits the UNIT-001 READY to IN_PROGRESS plan transition", async () => {
    const fixture = createPrepareRepositoryFixture();
    const sourceFingerprint = validManifest(fixture.repoRoot).sourceFingerprint as SourceFingerprint;
    try {
      const prepared = await prepareEstimateSheetPerformanceRun({
        repoRoot: fixture.repoRoot,
        planRoot: fixture.planRoot,
        runRoot: fixture.runRoot,
        unit: "UNIT-001",
        profile: "limit",
        artifactOnly: true,
        cleanupNotApplicable: true,
        admissionPath: fixture.admissionPath,
        sourceFingerprint,
      });
      const transitioned = JSON.parse(readFileSync(fixture.planPath, "utf8"));
      expect(transitioned.implementation_status).toBe("IN_PROGRESS");
      expect(transitioned.next_unit).toBe("UNIT-001");
      expect(transitioned.units.find((unit: { id: string }) => unit.id === "UNIT-001")?.status).toBe("IN_PROGRESS");
      expect(transitioned.runtime_evidence).toMatchObject({
        transition_sequence: 1,
        latest_unit_id: "UNIT-001",
        latest_run_id: prepared.run.run_id,
      });
      expect(prepared.run.immutable_run_root).toBe(join(defaultImmutableRunRoot(fixture.repoRoot), "UNIT-001", prepared.run.run_id));
      expect(prepared.run.logical_outputs).toEqual(ESTIMATE_LOGICAL_OUTPUTS);
      expect(JSON.parse(readFileSync(prepared.pointerPath, "utf8"))).toMatchObject({
        immutable_run_root: prepared.run.immutable_run_root,
        logical_outputs: ESTIMATE_LOGICAL_OUTPUTS,
        cleanupRequirement: "NOT_APPLICABLE",
      });
      expect(readFileSync(join(prepared.run.immutable_run_root, "run-manifest.json"))).toEqual(readFileSync(prepared.runManifestPath));
      await expect(prepareEstimateSheetPerformanceRun({
        repoRoot: fixture.repoRoot,
        planRoot: fixture.planRoot,
        runRoot: fixture.runRoot,
        unit: "UNIT-001",
        profile: "limit",
        artifactOnly: true,
        cleanupNotApplicable: true,
        admissionPath: fixture.admissionPath,
        sourceFingerprint,
      })).rejects.toThrow(/READY|IN_PROGRESS/);
    } finally {
      fixture.cleanup();
    }
  }, 30_000);

  it("retains an unresolved prepare run and lease until rollback recovery finishes", async () => {
    const fixture = createPrepareRepositoryFixture();
    const sourceFingerprint = validManifest(fixture.repoRoot).sourceFingerprint as SourceFingerprint;
    const originalPlan = readFileSync(fixture.planPath);
    try {
      await expect(prepareEstimateSheetPerformanceRun({
        repoRoot: fixture.repoRoot,
        unit: "UNIT-001",
        profile: "limit",
        artifactOnly: true,
        cleanupNotApplicable: true,
        admissionPath: fixture.admissionPath,
        sourceFingerprint,
        faultInjector: (phase) => {
          if (phase === "PROJECTION_WRITTEN") throw new Error("fault-before-prepare-commit");
        },
      })).rejects.toThrow("fault-before-prepare-commit");

      expect(existsSync(fixture.journalPath)).toBe(true);
      expect(existsSync(fixture.unitLeasePath)).toBe(true);
      const owner = JSON.parse(readFileSync(join(fixture.unitLeasePath, "owner.json"), "utf8")) as { run_root: string };
      expect(existsSync(owner.run_root)).toBe(true);
      expect(readFileSync(fixture.planPath)).toEqual(originalPlan);

      expect(recoverEstimateSheetPrepareTransition({ repoRoot: fixture.repoRoot })).toMatchObject({
        result: "ROLLED_BACK",
        unit_id: "UNIT-001",
      });
      expect(existsSync(fixture.journalPath)).toBe(false);
      expect(existsSync(fixture.unitLeasePath)).toBe(false);
      expect(existsSync(owner.run_root)).toBe(false);
      expect(readFileSync(fixture.planPath)).toEqual(originalPlan);
    } finally {
      fixture.cleanup();
    }
  }, 30_000);

  it("recovers a committed prepare without deleting its run or lease", async () => {
    const fixture = createPrepareRepositoryFixture();
    const sourceFingerprint = validManifest(fixture.repoRoot).sourceFingerprint as SourceFingerprint;
    try {
      await expect(prepareEstimateSheetPerformanceRun({
        repoRoot: fixture.repoRoot,
        unit: "UNIT-001",
        profile: "limit",
        artifactOnly: true,
        cleanupNotApplicable: true,
        admissionPath: fixture.admissionPath,
        sourceFingerprint,
        faultInjector: (phase) => {
          if (phase === "MANIFEST_COMMITTED") throw new Error("fault-after-prepare-commit");
        },
      })).rejects.toThrow("fault-after-prepare-commit");

      expect(existsSync(fixture.journalPath)).toBe(true);
      const owner = JSON.parse(readFileSync(join(fixture.unitLeasePath, "owner.json"), "utf8")) as { run_root: string };
      const manifest = JSON.parse(readFileSync(join(owner.run_root, "run-manifest.json"), "utf8")) as {
        run_id: string;
        immutable_run_root: string;
      };
      expect(existsSync(manifest.immutable_run_root)).toBe(true);

      expect(recoverEstimateSheetPrepareTransition({ repoRoot: fixture.repoRoot })).toMatchObject({
        result: "COMMITTED",
        unit_id: "UNIT-001",
        run_id: manifest.run_id,
      });
      expect(existsSync(fixture.journalPath)).toBe(false);
      expect(existsSync(fixture.unitLeasePath)).toBe(true);
      expect(existsSync(owner.run_root)).toBe(true);
      expect(existsSync(join(manifest.immutable_run_root, "run-manifest.json"))).toBe(true);
      const transitioned = JSON.parse(readFileSync(fixture.planPath, "utf8"));
      expect(transitioned.runtime_evidence.latest_run_id).toBe(manifest.run_id);
      expect(transitioned.units.find((unit: { id: string }) => unit.id === "UNIT-001")?.status).toBe("IN_PROGRESS");
    } finally {
      fixture.cleanup();
    }
  }, 30_000);

  it("admits only the command fixed for each gate role", () => {
    expect(() => validateEstimateSheetGateCommand(
      "typecheck",
      "UNIT-001",
      ["bun", "run", "validate"],
    )).toThrow(/wrong child command/);
    expect(() => validateEstimateSheetGateCommand(
      "browser-check",
      "UNIT-002",
      [
        "bun", "run", "perf:estimate:check", "--",
        "--unit=UNIT-002",
        "--evidence=auto:browser",
        "--evidence-class=local-browser",
        "--browser-scope=baseline",
        "--budget-policy=record-only",
        "--tests=auto:e2e-tests",
        "--gates=auto:opennext-build",
        "--source-build-match=required",
      ],
    )).not.toThrow();
    expect(() => validateEstimateSheetGateCommand(
      "browser-check",
      "UNIT-002",
      [
        "bun", "run", "perf:estimate:check", "--",
        "--unit=UNIT-002",
        "--evidence=auto:browser",
        "--evidence-class=local-browser",
        "--browser-scope=baseline",
        "--budget-policy=record-only",
        "--tests=auto:e2e-tests",
        "--gates=auto:opennext-build",
        "--source-build-match=required",
        "--caller-selected-path=/tmp/report.json",
      ],
    )).toThrow(/wrong child command/);
  });

  it("parses the exact repeated release-gate child-output bindings", () => {
    const parsed = parseEstimateSheetGateOptions([
      "--unit=UNIT-011",
      "--role=release-gates",
      "--child-output=OUTPUT_FILE:auto:release-gates-json",
      "--child-output=MARKDOWN_FILE:auto:release-gates-md",
    ]);
    expect(parsed.childOutputSpecs).toEqual([
      "OUTPUT_FILE:auto:release-gates-json",
      "MARKDOWN_FILE:auto:release-gates-md",
    ]);
    expect(parsed.values.get("unit")).toBe("UNIT-011");
    expect(parsed.values.get("role")).toBe("release-gates");
  });
});
