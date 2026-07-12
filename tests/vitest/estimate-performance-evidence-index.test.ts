import {
  existsSync,
  mkdtempSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  renameSync,
  rmSync,
  symlinkSync,
  utimesSync,
  writeFileSync,
} from "node:fs";
import { execFileSync } from "node:child_process";
import { tmpdir } from "node:os";
import { basename, join, relative, resolve } from "node:path";

import { describe, expect, it } from "vitest";

import {
  ESTIMATE_LOGICAL_OUTPUTS,
  INDEX_SCHEMA,
  PERFORMANCE_REPORT_SCHEMA,
  PREPARE_INPUT_SCHEMA,
  canonicalJson,
  defaultImmutableRunRoot,
  defaultPlanRoot,
  defaultRunRoot,
  sha256Hex,
  sha256Json,
} from "../../scripts/lib/estimate-sheet-performance-contract";
import {
  buildEstimatePerformanceFixture,
  fixturePayloadWithoutLinkage,
  stableStringify,
} from "../../tests/fixtures/estimate-sheet-performance";
import {
  deriveEstimateSheetPrepareTransition,
  type EstimateSheetPlanManifest,
} from "../../scripts/lib/estimate-sheet-performance-plan-state";
import {
  commitEstimateSheetPlanOnlyTransition,
  recoverEstimateSheetIndexTransition,
  updateEstimateSheetPerformanceEvidenceIndex,
} from "../../scripts/update-estimate-sheet-performance-evidence-index";

const scriptPath = resolve(process.cwd(), "scripts/update-estimate-sheet-performance-evidence-index.ts");
const describeIndex = describe.skipIf(!existsSync(scriptPath));
const FIXTURE_PLAN_REVISION = "5c0418e65";

function createIndexFixture() {
  const root = mkdtempSync(join(tmpdir(), "estimate-index-"));
  const planRoot = defaultPlanRoot(root);
  const immutableRunRoot = defaultImmutableRunRoot(root);
  const projection = join(planRoot, "evidence/runtime/jsdom-baseline.json");
  const fixtureProjection = join(planRoot, "evidence/runtime/fixture-manifest.json");
  const planPath = join(planRoot, "plan-pack.json");
  const journalPath = resolve(defaultRunRoot(root), "..", "plan-transition-journal.json");
  const fingerprint = {
    contract_version: "estimate-sheet-application-fingerprint.v1",
    path_count: 1,
    path_list_sha256: sha256Hex("paths"),
    content_sha256: sha256Hex("content"),
  };
  const sourceFingerprint = {
    contract_version: "estimate-sheet-source-fingerprint.v2" as const,
    head: "1234567",
    path_count: 1,
    path_list_sha256: sha256Hex("source-paths"),
    application: fingerprint,
    producer: fingerprint,
  };
  const admissionBytes = `${canonicalJson({ schema_version: "estimate-sheet-planning-admission.v1" })}\n`;
  const admissionSha256 = sha256Hex(admissionBytes);
  const prepareInput = {
    schema_version: PREPARE_INPUT_SCHEMA,
    unit_id: "UNIT-001" as const,
    profile: "artifact-only" as const,
    application_fingerprint: fingerprint,
    producer_fingerprint: fingerprint,
    fixture: null,
    decision: null,
    predecessor: null,
    admission: {
      kind: "planning" as const,
      sha256: admissionSha256,
      input_application_fingerprint: fingerprint,
      input_producer_fingerprint: fingerprint,
    },
  };
  const prepareInputSha256 = sha256Json(prepareInput);
  const runKey = `test-run-${fingerprint.content_sha256.slice(0, 12)}-${prepareInputSha256.slice(0, 12)}`;
  const runRoot = join(root, ".ai/99_scratch/estimate-sheet-performance/runs/UNIT-001", runKey);
  const immutableUnitRunRoot = join(immutableRunRoot, "UNIT-001", runKey);

  mkdirSync(join(planRoot, "evidence/runtime"), { recursive: true });
  mkdirSync(runRoot, { recursive: true });
  const livePlan = JSON.parse(execFileSync("git", ["show", `${FIXTURE_PLAN_REVISION}:.ai/03_plans/2026-07-08/Project-Estimate-Sheet-Performance-Optimization/plan-pack.json`], {
    cwd: process.cwd(),
    encoding: "utf8",
  })) as EstimateSheetPlanManifest;
  for (const name of ["fixture-manifest.json", "jsdom-baseline.json", "evidence-index.json"]) {
    writeFileSync(
      join(planRoot, "evidence/runtime", name),
      execFileSync("git", ["show", `${FIXTURE_PLAN_REVISION}:.ai/03_plans/2026-07-08/Project-Estimate-Sheet-Performance-Optimization/evidence/runtime/${name}`]),
    );
  }

  const baseFixture = buildEstimatePerformanceFixture("small", {
    runId: "test-run",
    generatedAt: "2026-07-11T00:00:00.000Z",
    applicationFingerprint: fingerprint.content_sha256,
    producerFingerprint: fingerprint.content_sha256,
  });
  const fixturePayloadSha256 = sha256Hex(stableStringify(fixturePayloadWithoutLinkage(baseFixture)));
  const report = {
    schema_version: PERFORMANCE_REPORT_SCHEMA,
    evidenceClass: "jsdom" as const,
    trace: { packageId: "PLAN-2026-07-08-project-estimate-sheet-performance", unitId: "UNIT-001" as const },
    head: "1234567",
    applicationFingerprint: fingerprint,
    producerFingerprint: fingerprint,
    fixtureHash: fixturePayloadSha256,
    buildHash: null,
    authFixtureHash: sha256Hex("test-auth-fixture"),
    toolHashes: { evaluator: sha256Hex("test-evaluator") },
    runId: "test-run",
    generatedAt: "2026-07-11T00:00:00.000Z",
    method: { warmups: 3, samples: 30, workerCount: 1, retries: 0, profile: "small" as const },
    metrics: { measured: { status: "PASS" as const, value: 1 } },
    overall: "PASS" as const,
    buildMode: "not-applicable" as const,
  };
  const reportPayloadSha256 = sha256Hex(canonicalJson(report));
  const fixture = {
    ...baseFixture,
    linkage: {
      counterpartPayloadSha256: reportPayloadSha256,
      bundleSha256: sha256Hex(canonicalJson({ fixturePayloadSha256, reportPayloadSha256 })),
    },
  };
  mkdirSync(join(immutableUnitRunRoot, "reports"), { recursive: true });
  mkdirSync(join(immutableUnitRunRoot, "fixtures"), { recursive: true });
  mkdirSync(join(immutableUnitRunRoot, "dependencies"), { recursive: true });
  writeFileSync(join(immutableUnitRunRoot, ESTIMATE_LOGICAL_OUTPUTS.jsdom), `${canonicalJson(report)}\n`, { mode: 0o600 });
  writeFileSync(join(immutableUnitRunRoot, ESTIMATE_LOGICAL_OUTPUTS.fixture), `${canonicalJson(fixture)}\n`, { mode: 0o600 });
  writeFileSync(join(immutableUnitRunRoot, "dependencies/admission.json"), admissionBytes, { mode: 0o600 });
  const runManifest = {
    schema_version: "estimate-sheet-performance-run.v1",
    package_id: "PLAN-2026-07-08-project-estimate-sheet-performance",
    unit_id: "UNIT-001",
    run_id: "test-run",
    profile: "artifact-only",
    evidence_class: "jsdom",
    cleanupRequirement: "NOT_APPLICABLE",
    run_root: runRoot,
    immutable_run_root: immutableUnitRunRoot,
    pointer_path: join(runRoot, "run-pointer.json"),
    logical_outputs: { ...ESTIMATE_LOGICAL_OUTPUTS },
    prepareInput,
    prepareInputSha256,
    created_at: "2026-07-11T00:00:00.000Z",
    status: "PREPARED",
    sourceFingerprint,
    applicationFingerprint: fingerprint,
    producerFingerprint: fingerprint,
    namespaces: {},
    mutationJournal: [],
    previewProcesses: [],
    admissionKind: "planning",
    admissionPath: "dependencies/admission.json",
    admissionSha256,
    inputApplicationFingerprint: fingerprint,
    inputProducerFingerprint: fingerprint,
  };
  const runManifestBytes = `${JSON.stringify(runManifest)}\n`;
  writeFileSync(join(runRoot, "run-manifest.json"), runManifestBytes, { mode: 0o600 });
  writeFileSync(join(immutableUnitRunRoot, "run-manifest.json"), runManifestBytes, { mode: 0o600 });
  const inProgress = deriveEstimateSheetPrepareTransition(livePlan, {
    unitId: "UNIT-001",
    runId: "test-run",
    runManifestSha256: sha256Hex(runManifestBytes),
    updatedAt: "2026-07-11T00:00:00.000Z",
  });
  writeFileSync(planPath, `${JSON.stringify(inProgress, null, 2)}\n`);

  const original = {
    plan: readFileSync(planPath),
    projection: readFileSync(projection),
    fixtureProjection: readFileSync(fixtureProjection),
  };
  const run = (faultInjector?: Parameters<typeof updateEstimateSheetPerformanceEvidenceIndex>[0]["faultInjector"]) => updateEstimateSheetPerformanceEvidenceIndex({
    repoRoot: root,
    planRoot,
    immutableRunRoot,
    runManifest: join(runRoot, "run-manifest.json"),
    evidencePath: "auto:jsdom",
    projectPath: projection,
    cleanupNotApplicable: true,
    secondary: [{ role: "fixture", evidencePath: "auto:fixture", projectPath: fixtureProjection }],
    sourceFingerprint,
    faultInjector,
  });
  return {
    root,
    planRoot,
    runRoot,
    immutableRunRoot,
    immutableUnitRunRoot,
    projection,
    fixtureProjection,
    planPath,
    journalPath,
    original,
    run,
    cleanup: () => rmSync(root, { recursive: true, force: true }),
  };
}

function createPlanOnlyTransitionFixture() {
  const root = mkdtempSync(join(tmpdir(), "estimate-plan-only-transition-"));
  const livePlanRoot = resolve(process.cwd(), ".ai/03_plans/2026-07-08/Project-Estimate-Sheet-Performance-Optimization");
  const planRoot = defaultPlanRoot(root);
  const planPath = join(planRoot, "plan-pack.json");
  const runId = "123e4567-e89b-42d3-a456-426614174011";
  const runKey = `${runId}-${"a".repeat(12)}-${"b".repeat(12)}`;
  const outputPath = join(defaultImmutableRunRoot(root), "UNIT-011", runKey, "final-closeout.json");
  mkdirSync(planRoot, { recursive: true });
  const plan = JSON.parse(readFileSync(join(livePlanRoot, "plan-pack.json"), "utf8")) as EstimateSheetPlanManifest;
  const previousPlanBytes = Buffer.from(`${JSON.stringify(plan, null, 2)}\n`, "utf8");
  writeFileSync(planPath, previousPlanBytes);
  const next = structuredClone(plan);
  next.updated_at = "2026-07-11T01:00:00.000Z";
  next.runtime_evidence.transition_sequence += 1;
  const run = (phase: "PROJECTION_WRITTEN" | "MANIFEST_COMMITTED") => commitEstimateSheetPlanOnlyTransition({
    repoRoot: root,
    planPath,
    expectedPlanSha256: sha256Hex(previousPlanBytes),
    previousPlanBytes,
    next,
    journalRoot: resolve(outputPath, ".."),
    transition: "FINAL_CLOSEOUT",
    unitId: "UNIT-011",
    runId,
    durableFiles: [{ path: outputPath, bytes: Buffer.from("{\"status\":\"READY\"}\n", "utf8") }],
    faultInjector: (current) => {
      if (current === phase) throw new Error(`fault-${phase}`);
    },
  });
  return {
    root,
    planPath,
    outputPath,
    previousPlanBytes,
    next,
    runId,
    journalPath: resolve(defaultRunRoot(root), "..", "plan-transition-journal.json"),
    transitionPath: join(resolve(outputPath, ".."), "transitions", `${String(next.runtime_evidence.transition_sequence).padStart(4, "0")}-final_closeout.json`),
    run,
    cleanup: () => rmSync(root, { recursive: true, force: true }),
  };
}

describeIndex("estimate-sheet performance evidence index", () => {
  it("uses the dedicated v1 index schema and immutable projection vocabulary", () => {
    const source = readFileSync(scriptPath, "utf8");
    expect(source).toContain(INDEX_SCHEMA);
    expect(source).toMatch(/dependencySources/);
    expect(source).toMatch(/immutable/i);
    expect(source).toMatch(/sha256/i);
    expect(source).toMatch(/cleanup/i);
  });

  it("binds index identity to canonical bytes rather than object insertion order", () => {
    const first = { schema_version: INDEX_SCHEMA, evidence: [{ id: "EVID-001", sha256: sha256Hex("a") }] };
    const second = { evidence: [{ sha256: sha256Hex("a"), id: "EVID-001" }], schema_version: INDEX_SCHEMA };
    expect(canonicalJson(first)).toBe(canonicalJson(second));
    expect(sha256Hex(canonicalJson(first))).toBe(sha256Hex(canonicalJson(second)));
  });

  it("does not permit a projection to become its own immutable source", () => {
    const source = readFileSync(scriptPath, "utf8");
    expect(source).toMatch(/source.*projection|projection.*source/i);
    expect(source).toMatch(/cyclic|cycle|self/i);
  });

  it("materializes immutable evidence, projects source bytes, and commits the terminal plan transition", () => {
    const fixture = createIndexFixture();
    try {
      const result = fixture.run();
      expect(result.index.schema_version).toBe(INDEX_SCHEMA);
      expect(result.index.evidence[0]?.id).toBe("EVID-002");
      expect(readFileSync(fixture.projection, "utf8")).toBe(readFileSync(join(fixture.immutableUnitRunRoot, ESTIMATE_LOGICAL_OUTPUTS.jsdom), "utf8"));
      expect(readFileSync(fixture.fixtureProjection, "utf8")).toBe(readFileSync(join(fixture.immutableUnitRunRoot, ESTIMATE_LOGICAL_OUTPUTS.fixture), "utf8"));
      expect(readFileSync(join(fixture.planRoot, "evidence/runtime/evidence-index.json"), "utf8")).toContain(INDEX_SCHEMA);
      const transitioned = JSON.parse(readFileSync(fixture.planPath, "utf8"));
      expect(transitioned.runtime_evidence.transition_sequence).toBe(2);
      expect(transitioned.next_unit).toBe("UNIT-002");
      expect(transitioned.units.find((unit: { id: string }) => unit.id === "UNIT-001")?.status).toBe("VERIFIED");
      expect(transitioned.evidence_index.find((evidence: { id: string }) => evidence.id === "EVID-002")?.status).toBe("PASS");
      expect(result.indexPath).toBe(join(fixture.immutableUnitRunRoot, "evidence-index.json"));
    } finally {
      fixture.cleanup();
    }
  });

  it("denies mutable manifest identity tampering before indexing evidence", () => {
    const fixture = createIndexFixture();
    try {
      const manifestPath = join(fixture.runRoot, "run-manifest.json");
      const tampered = JSON.parse(readFileSync(manifestPath, "utf8"));
      tampered.created_at = "2026-07-12T00:00:00.000Z";
      writeFileSync(manifestPath, `${JSON.stringify(tampered)}\n`, { mode: 0o600 });

      expect(() => fixture.run()).toThrow(/identity differs from its immutable authority/u);
      expect(readFileSync(fixture.planPath)).toEqual(fixture.original.plan);
      expect(existsSync(join(fixture.immutableUnitRunRoot, "evidence-index.json"))).toBe(false);
    } finally {
      fixture.cleanup();
    }
  });

  it("denies an immutable evidence source reached through a nested symlink before reading outside bytes", () => {
    const fixture = createIndexFixture();
    try {
      const reportsPath = join(fixture.immutableUnitRunRoot, "reports");
      const outsidePath = join(fixture.root, "outside-source");
      renameSync(reportsPath, outsidePath);
      const outsideFile = join(outsidePath, basename(ESTIMATE_LOGICAL_OUTPUTS.jsdom));
      writeFileSync(outsideFile, "outside sentinel is not JSON\n", { mode: 0o600 });
      symlinkSync(outsidePath, reportsPath, "dir");

      expect(() => fixture.run()).toThrow(/symbolic-link traversal/u);
      expect(readFileSync(outsideFile, "utf8")).toBe("outside sentinel is not JSON\n");
      expect(readFileSync(fixture.planPath)).toEqual(fixture.original.plan);
      expect(existsSync(join(fixture.immutableUnitRunRoot, "evidence-index.json"))).toBe(false);
    } finally {
      fixture.cleanup();
    }
  });

  it("denies immutable publication through a nested destination symlink without writing outside the run", () => {
    const fixture = createPlanOnlyTransitionFixture();
    try {
      const runRoot = resolve(fixture.outputPath, "..");
      const outsidePath = join(fixture.root, "outside-destination");
      mkdirSync(runRoot, { recursive: true, mode: 0o700 });
      mkdirSync(outsidePath, { mode: 0o700 });
      symlinkSync(outsidePath, join(runRoot, "transitions"), "dir");

      expect(() => fixture.run("PROJECTION_WRITTEN")).toThrow(/symbolic-link traversal/u);
      expect(readdirSync(outsidePath)).toEqual([]);
      expect(readFileSync(fixture.planPath)).toEqual(fixture.previousPlanBytes);
    } finally {
      fixture.cleanup();
    }
  });

  it("rolls back projected bytes and immutable files when recovery observes the old manifest", () => {
    const fixture = createIndexFixture();
    try {
      expect(() => fixture.run((phase) => {
        if (phase === "PROJECTION_WRITTEN") throw new Error("fault-after-projection");
      })).toThrow("fault-after-projection");
      expect(existsSync(fixture.journalPath)).toBe(true);
      expect(readFileSync(fixture.planPath)).toEqual(fixture.original.plan);
      expect(readFileSync(fixture.projection)).not.toEqual(fixture.original.projection);

      expect(recoverEstimateSheetIndexTransition({ repoRoot: fixture.root })).toMatchObject({
        result: "ROLLED_BACK",
        unit_id: "UNIT-001",
        run_id: "test-run",
      });
      expect(readFileSync(fixture.planPath)).toEqual(fixture.original.plan);
      expect(readFileSync(fixture.projection)).toEqual(fixture.original.projection);
      expect(readFileSync(fixture.fixtureProjection)).toEqual(fixture.original.fixtureProjection);
      expect(existsSync(join(fixture.immutableUnitRunRoot, "evidence-index.json"))).toBe(false);
      expect(existsSync(join(fixture.immutableUnitRunRoot, ESTIMATE_LOGICAL_OUTPUTS.jsdom))).toBe(true);
      expect(existsSync(fixture.journalPath)).toBe(false);
    } finally {
      fixture.cleanup();
    }
  });

  it("replays immutable bytes when recovery observes a committed manifest", () => {
    const fixture = createIndexFixture();
    try {
      expect(() => fixture.run((phase) => {
        if (phase === "MANIFEST_COMMITTED") throw new Error("fault-after-manifest");
      })).toThrow("fault-after-manifest");
      expect(existsSync(fixture.journalPath)).toBe(true);
      const committedPlan = JSON.parse(readFileSync(fixture.planPath, "utf8"));
      expect(committedPlan.units.find((unit: { id: string }) => unit.id === "UNIT-001")?.status).toBe("VERIFIED");
      writeFileSync(fixture.projection, "corrupt-projection\n");
      rmSync(fixture.fixtureProjection);

      expect(recoverEstimateSheetIndexTransition({ repoRoot: fixture.root })).toMatchObject({
        result: "COMMITTED",
        unit_id: "UNIT-001",
        run_id: "test-run",
      });
      expect(readFileSync(fixture.projection, "utf8")).toBe(readFileSync(join(fixture.immutableUnitRunRoot, ESTIMATE_LOGICAL_OUTPUTS.jsdom), "utf8"));
      expect(readFileSync(fixture.fixtureProjection, "utf8")).toBe(readFileSync(join(fixture.immutableUnitRunRoot, ESTIMATE_LOGICAL_OUTPUTS.fixture), "utf8"));
      expect(existsSync(fixture.journalPath)).toBe(false);
    } finally {
      fixture.cleanup();
    }
  });

  it("rolls back plan-only transition outputs when the manifest was not committed", () => {
    const fixture = createPlanOnlyTransitionFixture();
    try {
      expect(() => fixture.run("PROJECTION_WRITTEN")).toThrow("fault-PROJECTION_WRITTEN");
      expect(existsSync(fixture.outputPath)).toBe(true);
      expect(existsSync(fixture.transitionPath)).toBe(true);
      expect(readFileSync(fixture.planPath)).toEqual(fixture.previousPlanBytes);

      expect(recoverEstimateSheetIndexTransition({ repoRoot: fixture.root })).toMatchObject({
        result: "ROLLED_BACK",
        unit_id: "UNIT-011",
        run_id: fixture.runId,
      });
      expect(existsSync(fixture.outputPath)).toBe(false);
      expect(existsSync(fixture.transitionPath)).toBe(false);
      expect(existsSync(fixture.journalPath)).toBe(false);
      expect(readFileSync(fixture.planPath)).toEqual(fixture.previousPlanBytes);
    } finally {
      fixture.cleanup();
    }
  });

  it("finishes a committed plan-only transition after response loss", () => {
    const fixture = createPlanOnlyTransitionFixture();
    try {
      expect(() => fixture.run("MANIFEST_COMMITTED")).toThrow("fault-MANIFEST_COMMITTED");
      expect(JSON.parse(readFileSync(fixture.planPath, "utf8")).runtime_evidence.transition_sequence)
        .toBe(fixture.next.runtime_evidence.transition_sequence);

      expect(recoverEstimateSheetIndexTransition({ repoRoot: fixture.root })).toMatchObject({
        result: "COMMITTED",
        unit_id: "UNIT-011",
        run_id: fixture.runId,
      });
      expect(existsSync(fixture.outputPath)).toBe(true);
      expect(existsSync(fixture.transitionPath)).toBe(true);
      expect(existsSync(fixture.journalPath)).toBe(false);
    } finally {
      fixture.cleanup();
    }
  });

  it("reclaims a dead pre-journal index lock before returning no journal", () => {
    const root = mkdtempSync(join(tmpdir(), "estimate-index-dead-lock-"));
    const lockPath = resolve(defaultRunRoot(root), "..", ".plan-transition.lock");
    try {
      mkdirSync(lockPath, { recursive: true });
      writeFileSync(join(lockPath, "owner.json"), `${canonicalJson({
        schema_version: "estimate-sheet-plan-transition-lock.v1",
        pid: 2_147_483_647,
        owner_id: "a".repeat(32),
        operation: "INDEX",
        acquired_at: "2026-07-11T00:00:00.000Z",
      })}\n`);

      expect(recoverEstimateSheetIndexTransition({ repoRoot: root })).toEqual({ result: "NO_JOURNAL" });
      expect(existsSync(lockPath)).toBe(false);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("reclaims an aged ownerless pre-journal index lock", () => {
    const root = mkdtempSync(join(tmpdir(), "estimate-index-ownerless-lock-"));
    const lockPath = resolve(defaultRunRoot(root), "..", ".plan-transition.lock");
    try {
      mkdirSync(lockPath, { recursive: true });
      const aged = new Date(Date.now() - 5_000);
      utimesSync(lockPath, aged, aged);

      expect(recoverEstimateSheetIndexTransition({ repoRoot: root })).toEqual({ result: "NO_JOURNAL" });
      expect(existsSync(lockPath)).toBe(false);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("does not take over an active index lock", () => {
    const root = mkdtempSync(join(tmpdir(), "estimate-index-active-lock-"));
    const lockPath = resolve(defaultRunRoot(root), "..", ".plan-transition.lock");
    try {
      mkdirSync(lockPath, { recursive: true });
      writeFileSync(join(lockPath, "owner.json"), `${canonicalJson({
        schema_version: "estimate-sheet-plan-transition-lock.v1",
        pid: process.pid,
        owner_id: "b".repeat(32),
        operation: "INDEX",
        acquired_at: new Date().toISOString(),
      })}\n`);

      expect(() => recoverEstimateSheetIndexTransition({ repoRoot: root })).toThrow(/plan transition lock is active/u);
      expect(existsSync(lockPath)).toBe(true);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("denies a corrupted journal projection path before recovery mutates files", () => {
    const fixture = createIndexFixture();
    try {
      expect(() => fixture.run((phase) => {
        if (phase === "PROJECTION_WRITTEN") throw new Error("fault-after-projection");
      })).toThrow("fault-after-projection");
      const projectedBytes = readFileSync(fixture.projection);
      const victimPath = join(fixture.root, "unowned-projection.json");
      const victimBytes = Buffer.from("preserve projection victim\n", "utf8");
      writeFileSync(victimPath, victimBytes);
      const journal = JSON.parse(readFileSync(fixture.journalPath, "utf8"));
      journal.projections[0].path = relative(fixture.root, victimPath);
      writeFileSync(fixture.journalPath, `${canonicalJson(journal)}\n`);

      expect(() => recoverEstimateSheetIndexTransition({ repoRoot: fixture.root })).toThrow(/projection is not plan-owned/u);
      expect(readFileSync(victimPath)).toEqual(victimBytes);
      expect(readFileSync(fixture.projection)).toEqual(projectedBytes);
      expect(existsSync(fixture.journalPath)).toBe(true);
    } finally {
      fixture.cleanup();
    }
  });

  it("denies a corrupted journal immutable path before rollback deletes files", () => {
    const fixture = createIndexFixture();
    try {
      expect(() => fixture.run((phase) => {
        if (phase === "PROJECTION_WRITTEN") throw new Error("fault-after-projection");
      })).toThrow("fault-after-projection");
      const projectedBytes = readFileSync(fixture.projection);
      const victimPath = join(fixture.root, "unowned-immutable.json");
      const victimBytes = Buffer.from("preserve immutable victim\n", "utf8");
      writeFileSync(victimPath, victimBytes);
      const journal = JSON.parse(readFileSync(fixture.journalPath, "utf8"));
      journal.immutable_files[0] = {
        path: relative(fixture.root, victimPath),
        sha256: sha256Hex(victimBytes),
      };
      writeFileSync(fixture.journalPath, `${canonicalJson(journal)}\n`);

      expect(() => recoverEstimateSheetIndexTransition({ repoRoot: fixture.root })).toThrow(/outside UNIT-001/u);
      expect(readFileSync(victimPath)).toEqual(victimBytes);
      expect(readFileSync(fixture.projection)).toEqual(projectedBytes);
      expect(existsSync(fixture.journalPath)).toBe(true);
    } finally {
      fixture.cleanup();
    }
  });
});
