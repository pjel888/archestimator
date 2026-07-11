import {
  copyFileSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  symlinkSync,
  utimesSync,
  writeFileSync,
} from "node:fs";
import { execFileSync } from "node:child_process";
import { tmpdir } from "node:os";
import { basename, dirname, join, relative } from "node:path";

import { describe, expect, it } from "vitest";

import {
  RUN_MANIFEST_SCHEMA,
  PREPARE_INPUT_SCHEMA,
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
  readKnownPlanPredecessor,
  recoverEstimateSheetPrepareTransition,
} from "../../scripts/prepare-estimate-sheet-performance-run";
import type { EstimateSheetPlanManifest } from "../../scripts/lib/estimate-sheet-performance-plan-state";
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
  const runId = "00000000-0000-4000-8000-000000000001";
  const prepareInput = {
    schema_version: PREPARE_INPUT_SCHEMA,
    unit_id: "UNIT-001",
    profile: "artifact-only",
    application_fingerprint: fingerprint,
    producer_fingerprint: fingerprint,
    fixture: null,
    decision: null,
    predecessor: null,
    admission: {
      kind: "planning",
      sha256: digest,
      input_application_fingerprint: fingerprint,
      input_producer_fingerprint: fingerprint,
    },
  };
  const prepareInputSha256 = sha256Json(prepareInput);
  const runKey = `${runId}-${digest.slice(0, 12)}-${prepareInputSha256.slice(0, 12)}`;
  const runRoot = join(root, "scratch", "runs", "UNIT-001", runKey);
  const immutableRunRoot = join(root, "plan", "evidence", "runtime", "runs", "UNIT-001", runKey);
  return {
    schema_version: RUN_MANIFEST_SCHEMA,
    package_id: "PLAN-2026-07-08-project-estimate-sheet-performance",
    unit_id: "UNIT-001",
    run_id: runId,
    profile: "artifact-only",
    evidence_class: "jsdom",
    cleanupRequirement: "NOT_APPLICABLE",
    run_root: runRoot,
    immutable_run_root: immutableRunRoot,
    pointer_path: join(runRoot, "run-pointer.json"),
    logical_outputs: { ...ESTIMATE_LOGICAL_OUTPUTS },
    prepareInput,
    prepareInputSha256,
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
    admissionKind: "planning",
    admissionPath: "dependencies/admission.json",
    admissionSha256: digest,
    inputApplicationFingerprint: fingerprint,
    inputProducerFingerprint: fingerprint,
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
  const planPath = join(planRoot, "plan-pack.json");
  writeFileSync(planPath, execFileSync("git", ["show", "5c0418e65:.ai/03_plans/2026-07-08/Project-Estimate-Sheet-Performance-Optimization/plan-pack.json"], {
    cwd: sourceRoot,
  }));
  return {
    repoRoot,
    planRoot,
    runRoot: defaultRunRoot(repoRoot),
    admissionPath: join(repoRoot, admissionRelative),
    planPath,
    journalPath: join(repoRoot, ".ai/99_scratch/estimate-sheet-performance/plan-transition-journal.json"),
    unitLeasePath: join(repoRoot, ".ai/99_scratch/estimate-sheet-performance/leases/units/UNIT-001"),
    cleanup: () => rmSync(repoRoot, { recursive: true, force: true }),
  };
}

function createKnownPredecessorFixture(targetUnit: "UNIT-002" | "UNIT-003" | "UNIT-004") {
  const planRoot = mkdtempSync(join(tmpdir(), "estimate-sheet-known-predecessor-"));
  const predecessorNumber = Number(targetUnit.slice(-3)) - 1;
  const predecessorUnit = `UNIT-${String(predecessorNumber).padStart(3, "0")}` as "UNIT-001" | "UNIT-002" | "UNIT-003";
  const runId = `predecessor-${predecessorUnit}`;
  const immutableRoot = `evidence/runtime/runs/${predecessorUnit}/${runId}-${digest.slice(0, 12)}-${digest.slice(0, 12)}`;
  const evidenceRelative = `${immutableRoot}/reports/primary.json`;
  const indexRelative = `${immutableRoot}/evidence-index.json`;
  const evidencePath = join(planRoot, evidenceRelative);
  const indexPath = join(planRoot, indexRelative);
  const evidenceBytes = `${JSON.stringify({
    applicationFingerprint: fingerprint,
    producerFingerprint: fingerprint,
  })}\n`;
  mkdirSync(dirname(evidencePath), { recursive: true });
  writeFileSync(evidencePath, evidenceBytes);
  const primary = { immutable_path: evidenceRelative, sha256: sha256Hex(evidenceBytes) };
  const writeIndex = (evidence: Array<{ immutable_path: string; sha256: string }>) => {
    const payload = {
      schema_version: "estimate-sheet-evidence-index.v1",
      unit_id: predecessorUnit,
      run_id: runId,
      status: "VERIFIED",
      evidence,
    };
    const bytes = `${JSON.stringify({ ...payload, payload_sha256: sha256Json(payload) })}\n`;
    mkdirSync(dirname(indexPath), { recursive: true });
    writeFileSync(indexPath, bytes);
    return sha256Hex(bytes);
  };
  const plan = {
    runtime_evidence: {
      latest_unit_id: predecessorUnit,
      latest_run_id: runId,
      registry: {
        immutable_path: indexRelative,
        sha256: writeIndex([primary]),
      },
      projections: [],
    },
  } as unknown as EstimateSheetPlanManifest;
  return {
    planRoot,
    plan,
    predecessorUnit,
    runId,
    indexRelative,
    evidenceRelative,
    primary,
    writeIndex,
    cleanup: () => rmSync(planRoot, { recursive: true, force: true }),
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
      admissionKind: "planning",
      admissionPath: "dependencies/admission.json",
      admissionSha256: undefined,
      inputApplicationFingerprint: undefined,
      inputProducerFingerprint: undefined,
    }))).toEqual(expect.arrayContaining([
      "admission path/hash must be present together",
    ]));
    expect(validateRunManifest(validManifest(root, {
      admissionKind: "planning",
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
      mkdirSync(runRoot, { recursive: true, mode: 0o700 });
      const sourceFingerprint: SourceFingerprint = {
        contract_version: "estimate-sheet-source-fingerprint.v2",
        head: "abcdef1234567",
        path_count: 1,
        path_list_sha256: digest,
        application: fingerprint,
        producer: fingerprint,
      };
      const runManifest = {
        schema_version: "estimate-sheet-performance-run.v1",
        package_id: "PLAN-2026-07-08-project-estimate-sheet-performance",
        unit_id: "UNIT-002",
        run_id: "focused-refreeze-run",
        profile: "artifact-only",
        cleanupRequirement: "NOT_APPLICABLE",
        run_root: runRoot,
        pointer_path: join(runRoot, "run-pointer.json"),
        created_at: "2026-07-11T00:00:00.000Z",
        status: "PREPARED",
        sourceFingerprint,
        applicationFingerprint: fingerprint,
        producerFingerprint: fingerprint,
        namespaces: {},
        mutationJournal: [],
        previewProcesses: [],
      };
      const runManifestPath = join(runRoot, "run-manifest.json");
      writeFileSync(runManifestPath, `${JSON.stringify(runManifest)}\n`, { mode: 0o600 });
      const pointerPath = join(runRoot, "run-pointer.json");
      const pointerBytes = `${JSON.stringify({
        schema_version: "estimate-sheet-performance-run-pointer.v1",
        unit_id: "UNIT-002",
        run_id: "focused-refreeze-run",
        run_root: runRoot,
        run_manifest: "run-manifest.json",
        application_fingerprint: digest,
        producer_fingerprint: digest,
      })}\n`;
      writeFileSync(pointerPath, pointerBytes, { mode: 0o600 });
      const payload = {
        schema_version: "estimate-sheet-refreeze-admission.v1",
        status: "RECORDED",
        unit_id: "UNIT-002",
        input_application_fingerprint: fingerprint,
        input_producer_fingerprint: fingerprint,
        focused_run: {
          run_id: "focused-refreeze-run",
          run_root: relative(repoRoot, runRoot),
          unit_id: "UNIT-002",
          receipt_role: "refreeze-tests",
          run_manifest_sha256: sha256File(runManifestPath),
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
      } as NodeJS.ProcessEnv)).toThrow(/role must be refreeze-tests/);

      const tamperedManifest = { ...runManifest, created_at: "2026-07-12T00:00:00.000Z" };
      writeFileSync(runManifestPath, `${JSON.stringify(tamperedManifest)}\n`, { mode: 0o600 });
      expect(() => readReceiptEnvironment({
        ESTIMATE_PERF_UNIT: "UNIT-002",
        ESTIMATE_PERF_REFREEZE_ADMISSION: relative(repoRoot, admissionPath),
        ESTIMATE_PERF_TEST_OUTPUT_ROLE: "refreeze-tests",
      } as NodeJS.ProcessEnv)).toThrow(/manifest hash mismatch/);
      expect(existsSync(join(runRoot, "receipts/refreeze-tests.json"))).toBe(false);

      writeFileSync(runManifestPath, `${JSON.stringify(runManifest)}\n`, { mode: 0o600 });
      const outsidePointerPath = join(root, "outside-pointer.json");
      writeFileSync(outsidePointerPath, pointerBytes, { mode: 0o600 });
      rmSync(pointerPath);
      symlinkSync(outsidePointerPath, pointerPath);
      expect(() => readReceiptEnvironment({
        ESTIMATE_PERF_UNIT: "UNIT-002",
        ESTIMATE_PERF_REFREEZE_ADMISSION: relative(repoRoot, admissionPath),
        ESTIMATE_PERF_TEST_OUTPUT_ROLE: "refreeze-tests",
      } as NodeJS.ProcessEnv)).toThrow(/symbolic[- ]link/);
      expect(existsSync(join(runRoot, "receipts/refreeze-tests.json"))).toBe(false);
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

  it("durably creates every missing parent directory before publication", () => {
    const root = mkdtempSync(join(tmpdir(), "estimate-sheet-durable-directories-"));
    const target = join(root, "one", "two", "three", "receipt.json");
    try {
      writeNoOverwrite(target, "durable\n");
      expect(readFileSync(target, "utf8")).toBe("durable\n");
      expect(existsSync(join(root, "one", "two", "three"))).toBe(true);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("rejects publication through a symbolic-link directory component", () => {
    const root = mkdtempSync(join(tmpdir(), "estimate-sheet-symlink-root-"));
    const external = mkdtempSync(join(tmpdir(), "estimate-sheet-symlink-external-"));
    const linked = join(root, "linked");
    const escapedTarget = join(linked, "nested", "receipt.json");
    try {
      symlinkSync(external, linked, "dir");
      expect(() => writeNoOverwrite(escapedTarget, "must-not-escape\n", 0o600, root)).toThrow(/symbolic-link traversal/);
      expect(existsSync(join(external, "nested", "receipt.json"))).toBe(false);

      mkdirSync(join(external, "existing"));
      expect(() => writeNoOverwrite(
        join(linked, "existing", "receipt.json"),
        "must-still-not-escape\n",
        0o600,
        root,
      )).toThrow(/symbolic-link traversal/);
      expect(existsSync(join(external, "existing", "receipt.json"))).toBe(false);
    } finally {
      rmSync(root, { recursive: true, force: true });
      rmSync(external, { recursive: true, force: true });
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
    const makeManifest = (runId: string, createdAt: string) => {
      const base = validManifest(repoRoot);
      const runKey = `${runId}-${fingerprint.content_sha256.slice(0, 12)}-${base.prepareInputSha256.slice(0, 12)}`;
      const runRoot = join(defaultRunRoot(repoRoot), "UNIT-001", runKey);
      const immutableRunRoot = join(defaultImmutableRunRoot(repoRoot), "UNIT-001", runKey);
      return {
        manifest: {
          ...base,
          run_id: runId,
          run_root: runRoot,
          immutable_run_root: immutableRunRoot,
          pointer_path: join(runRoot, "run-pointer.json"),
          created_at: createdAt,
        },
        runRoot,
        immutableRunRoot,
      };
    };
    const committed = makeManifest("committed-run", "2026-07-11T00:00:00.000Z");
    const orphan = makeManifest("orphan-run", "2026-07-11T01:00:00.000Z");
    try {
      mkdirSync(planRoot, { recursive: true });
      mkdirSync(committed.runRoot, { recursive: true });
      mkdirSync(committed.immutableRunRoot, { recursive: true });
      mkdirSync(orphan.runRoot, { recursive: true });
      mkdirSync(orphan.immutableRunRoot, { recursive: true });
      const manifestBytes = new Map([committed, orphan].map((candidate) => [candidate, `${JSON.stringify(candidate.manifest)}\n`]));
      writeFileSync(join(planRoot, "plan-pack.json"), `${JSON.stringify({
        runtime_evidence: {
          latest_unit_id: "UNIT-001",
          latest_run_id: "committed-run",
          latest_run_manifest_sha256: sha256Hex(manifestBytes.get(committed)!),
        },
      })}\n`);
      for (const candidate of [committed, orphan]) {
        const bytes = manifestBytes.get(candidate)!;
        writeFileSync(join(candidate.runRoot, "run-manifest.json"), bytes);
        writeFileSync(join(candidate.immutableRunRoot, "run-manifest.json"), bytes);
      }

      expect(resolveRunManifestPath(repoRoot, "UNIT-001")).toBe(join(committed.runRoot, "run-manifest.json"));
    } finally {
      rmSync(repoRoot, { recursive: true, force: true });
    }
  });

  it("binds the exact current immutable predecessor for UNIT-002 through UNIT-004", () => {
    for (const targetUnit of ["UNIT-002", "UNIT-003", "UNIT-004"] as const) {
      const fixture = createKnownPredecessorFixture(targetUnit);
      try {
        expect(readKnownPlanPredecessor(fixture.planRoot, fixture.plan, targetUnit)).toEqual({
          unit_id: fixture.predecessorUnit,
          run_id: fixture.runId,
          index_immutable_path: fixture.indexRelative,
          index_sha256: fixture.plan.runtime_evidence.registry.sha256,
          evidence_immutable_path: fixture.evidenceRelative,
          evidence_sha256: fixture.primary.sha256,
          application_fingerprint: fingerprint,
          producer_fingerprint: fingerprint,
        });
      } finally {
        fixture.cleanup();
      }
    }
  });

  it("rejects stale or ambiguous allocation predecessor bindings", () => {
    const fixture = createKnownPredecessorFixture("UNIT-002");
    try {
      const wrongUnit = structuredClone(fixture.plan);
      wrongUnit.runtime_evidence.latest_unit_id = "UNIT-004";
      expect(() => readKnownPlanPredecessor(fixture.planRoot, wrongUnit, "UNIT-002"))
        .toThrow(/requires the current UNIT-001 immutable predecessor/);

      const wrongRun = structuredClone(fixture.plan);
      wrongRun.runtime_evidence.latest_run_id = "wrong-run";
      expect(() => readKnownPlanPredecessor(fixture.planRoot, wrongRun, "UNIT-002"))
        .toThrow(/allocation predecessor index does not expose one immutable primary output/);

      const wrongHash = structuredClone(fixture.plan);
      wrongHash.runtime_evidence.registry.sha256 = sha256Hex("wrong-index");
      expect(() => readKnownPlanPredecessor(fixture.planRoot, wrongHash, "UNIT-002"))
        .toThrow(/allocation predecessor index hash mismatch/);

      fixture.plan.runtime_evidence.registry.sha256 = fixture.writeIndex([fixture.primary, fixture.primary]);
      expect(() => readKnownPlanPredecessor(fixture.planRoot, fixture.plan, "UNIT-002"))
        .toThrow(/does not expose one immutable primary output/);
    } finally {
      fixture.cleanup();
    }
  });

  it("recovers a dead pre-journal transition lock without inventing a journal", () => {
    const fixture = createPrepareRepositoryFixture();
    const transitionLockPath = join(dirname(fixture.runRoot), ".plan-transition.lock");
    try {
      mkdirSync(transitionLockPath, { mode: 0o700 });
      writeFileSync(join(transitionLockPath, "owner.json"), `${JSON.stringify({
        schema_version: "estimate-sheet-plan-transition-lock.v1",
        pid: 2_147_483_647,
        owner_id: "a".repeat(32),
        operation: "PREPARE",
        acquired_at: new Date(Date.now() - 5_000).toISOString(),
      })}\n`, { mode: 0o600 });
      expect(existsSync(fixture.journalPath)).toBe(false);
      expect(recoverEstimateSheetPrepareTransition({ repoRoot: fixture.repoRoot })).toEqual({ result: "NO_JOURNAL" });
      expect(existsSync(transitionLockPath)).toBe(false);
    } finally {
      fixture.cleanup();
    }
  });

  it("recovers an aged ownerless lock but never steals a fresh partial lock", () => {
    const aged = createPrepareRepositoryFixture();
    const agedLockPath = join(dirname(aged.runRoot), ".plan-transition.lock");
    try {
      mkdirSync(agedLockPath, { mode: 0o700 });
      const staleTime = new Date(Date.now() - 5_000);
      utimesSync(agedLockPath, staleTime, staleTime);
      expect(recoverEstimateSheetPrepareTransition({ repoRoot: aged.repoRoot })).toEqual({ result: "NO_JOURNAL" });
      expect(existsSync(agedLockPath)).toBe(false);
    } finally {
      aged.cleanup();
    }

    const fresh = createPrepareRepositoryFixture();
    const freshLockPath = join(dirname(fresh.runRoot), ".plan-transition.lock");
    try {
      mkdirSync(freshLockPath, { mode: 0o700 });
      writeFileSync(join(freshLockPath, `owner.json.tmp-${process.pid}-partial`), "partial\n", { mode: 0o600 });
      expect(() => recoverEstimateSheetPrepareTransition({ repoRoot: fresh.repoRoot }))
        .toThrow(/too recent for safe recovery takeover/);
      expect(existsSync(freshLockPath)).toBe(true);
    } finally {
      fresh.cleanup();
    }
  });

  it("never takes over a live index transition lock", () => {
    const fixture = createPrepareRepositoryFixture();
    const transitionLockPath = join(dirname(fixture.runRoot), ".plan-transition.lock");
    try {
      mkdirSync(transitionLockPath, { mode: 0o700 });
      writeFileSync(join(transitionLockPath, "owner.json"), `${JSON.stringify({
        schema_version: "estimate-sheet-plan-transition-lock.v1",
        pid: process.pid,
        owner_id: "b".repeat(32),
        operation: "INDEX",
        acquired_at: new Date().toISOString(),
      })}\n`, { mode: 0o600 });
      expect(() => recoverEstimateSheetPrepareTransition({ repoRoot: fixture.repoRoot }))
        .toThrow(/plan transition lock is active/);
      expect(existsSync(transitionLockPath)).toBe(true);
    } finally {
      fixture.cleanup();
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
      expect(prepared.run.immutable_run_root).toBe(join(
        defaultImmutableRunRoot(fixture.repoRoot),
        "UNIT-001",
        basename(prepared.run.run_root),
      ));
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

  it("journals prepare before lease allocation and recovers without an unresolved lease", async () => {
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
          if (phase === "ALLOCATION_JOURNALED") throw new Error("fault-before-lease-allocation");
        },
      })).rejects.toThrow("fault-before-lease-allocation");

      expect(existsSync(fixture.journalPath)).toBe(true);
      expect(existsSync(fixture.unitLeasePath)).toBe(false);
      expect(readFileSync(fixture.planPath)).toEqual(originalPlan);
      const transitionLockPath = join(dirname(fixture.runRoot), ".plan-transition.lock");
      mkdirSync(transitionLockPath, { mode: 0o700 });
      const staleTime = new Date(Date.now() - 5_000);
      utimesSync(transitionLockPath, staleTime, staleTime);
      expect(recoverEstimateSheetPrepareTransition({ repoRoot: fixture.repoRoot })).toMatchObject({
        result: "ROLLED_BACK",
        unit_id: "UNIT-001",
      });
      expect(existsSync(transitionLockPath)).toBe(false);
      expect(existsSync(fixture.journalPath)).toBe(false);
      expect(existsSync(fixture.unitLeasePath)).toBe(false);
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
