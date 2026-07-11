import { copyFileSync, existsSync, mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

import { describe, expect, it } from "vitest";

import {
  INDEX_SCHEMA,
  PERFORMANCE_REPORT_SCHEMA,
  canonicalJson,
  sha256File,
  sha256Hex,
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

function createIndexFixture() {
  const root = mkdtempSync(join(tmpdir(), "estimate-index-"));
  const livePlanRoot = resolve(process.cwd(), ".ai/03_plans/2026-07-08/Project-Estimate-Sheet-Performance-Optimization");
  const planRoot = join(root, "plan");
  const runRoot = join(root, "runs", "UNIT-001", "test-run");
  const immutableRunRoot = join(planRoot, "evidence/runtime/runs");
  const projection = join(planRoot, "evidence/runtime/jsdom-baseline.json");
  const fixtureProjection = join(planRoot, "evidence/runtime/fixture-manifest.json");
  const planPath = join(planRoot, "plan-pack.json");
  const journalPath = join(root, ".ai/99_scratch/estimate-sheet-performance/plan-transition-journal.json");
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

  mkdirSync(join(planRoot, "evidence/runtime"), { recursive: true });
  mkdirSync(runRoot, { recursive: true });
  const livePlan = JSON.parse(readFileSync(join(livePlanRoot, "plan-pack.json"), "utf8")) as EstimateSheetPlanManifest;
  const inProgress = deriveEstimateSheetPrepareTransition(livePlan, {
    unitId: "UNIT-001",
    runId: "test-run",
    updatedAt: "2026-07-11T00:00:00.000Z",
  });
  writeFileSync(planPath, `${JSON.stringify(inProgress, null, 2)}\n`);
  for (const name of ["fixture-manifest.json", "jsdom-baseline.json", "evidence-index.json"]) {
    copyFileSync(join(livePlanRoot, "evidence/runtime", name), join(planRoot, "evidence/runtime", name));
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
  mkdirSync(join(runRoot, "reports"), { recursive: true });
  mkdirSync(join(runRoot, "fixtures"), { recursive: true });
  mkdirSync(join(runRoot, "dependencies"), { recursive: true });
  writeFileSync(join(runRoot, "reports/jsdom.json"), `${canonicalJson(report)}\n`, { mode: 0o600 });
  writeFileSync(join(runRoot, "fixtures/fixture.json"), `${canonicalJson(fixture)}\n`, { mode: 0o600 });
  writeFileSync(join(runRoot, "dependencies/planning-admission.json"), "{\"schema_version\":\"estimate-sheet-planning-admission.v1\"}\n", { mode: 0o600 });
  writeFileSync(join(runRoot, "run-manifest.json"), `${JSON.stringify({
    schema_version: "estimate-sheet-performance-run.v1",
    package_id: "PLAN-2026-07-08-project-estimate-sheet-performance",
    unit_id: "UNIT-001",
    run_id: "test-run",
    profile: "artifact-only",
    cleanupRequirement: "NOT_APPLICABLE",
    run_root: runRoot,
    pointer_path: join(root, "current.json"),
    created_at: "2026-07-11T00:00:00.000Z",
    status: "PREPARED",
    sourceFingerprint,
    applicationFingerprint: fingerprint,
    producerFingerprint: fingerprint,
    namespaces: {},
    mutationJournal: [],
    previewProcesses: [],
    admissionKind: "planning",
    admissionPath: "dependencies/planning-admission.json",
    admissionSha256: sha256File(join(runRoot, "dependencies/planning-admission.json")),
    inputApplicationFingerprint: fingerprint,
    inputProducerFingerprint: fingerprint,
  })}\n`, { mode: 0o600 });

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
    evidencePath: "reports/jsdom.json",
    projectPath: projection,
    cleanupNotApplicable: true,
    secondary: [{ role: "fixture", evidencePath: "fixtures/fixture.json", projectPath: fixtureProjection }],
    sourceFingerprint,
    faultInjector,
  });
  return {
    root,
    planRoot,
    runRoot,
    immutableRunRoot,
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
  const planRoot = join(root, "plan");
  const planPath = join(planRoot, "plan-pack.json");
  const outputPath = join(planRoot, "evidence/runtime/runs/UNIT-011/test-run/final-closeout.json");
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
    runId: "test-run",
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
    journalPath: join(root, ".ai/99_scratch/estimate-sheet-performance/plan-transition-journal.json"),
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
    const root = mkdtempSync(join(tmpdir(), "estimate-index-"));
    const liveRepoRoot = process.cwd();
    const repoRoot = root;
    const planRoot = join(root, "plan");
    const runRoot = join(root, "runs", "UNIT-001", "test-run");
    const immutableRunRoot = join(planRoot, "evidence/runtime/runs");
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
    try {
      mkdirSync(join(planRoot, "evidence/runtime"), { recursive: true });
      mkdirSync(runRoot, { recursive: true });
      const livePlanRoot = resolve(liveRepoRoot, ".ai/03_plans/2026-07-08/Project-Estimate-Sheet-Performance-Optimization");
      const livePlan = JSON.parse(readFileSync(join(livePlanRoot, "plan-pack.json"), "utf8")) as EstimateSheetPlanManifest;
      const inProgress = deriveEstimateSheetPrepareTransition(livePlan, {
        unitId: "UNIT-001",
        runId: "test-run",
        updatedAt: "2026-07-11T00:00:00.000Z",
      });
      writeFileSync(join(planRoot, "plan-pack.json"), `${JSON.stringify(inProgress, null, 2)}\n`);
      for (const name of ["fixture-manifest.json", "jsdom-baseline.json", "evidence-index.json"]) {
        copyFileSync(join(livePlanRoot, "evidence/runtime", name), join(planRoot, "evidence/runtime", name));
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
      mkdirSync(join(runRoot, "reports"), { recursive: true });
      mkdirSync(join(runRoot, "fixtures"), { recursive: true });
      mkdirSync(join(runRoot, "dependencies"), { recursive: true });
      writeFileSync(join(runRoot, "reports/jsdom.json"), `${canonicalJson(report)}\n`, { mode: 0o600 });
      writeFileSync(join(runRoot, "fixtures/fixture.json"), `${canonicalJson(fixture)}\n`, { mode: 0o600 });
      writeFileSync(join(runRoot, "dependencies/planning-admission.json"), "{\"schema_version\":\"estimate-sheet-planning-admission.v1\"}\n", { mode: 0o600 });
      writeFileSync(join(runRoot, "run-manifest.json"), `${JSON.stringify({
        schema_version: "estimate-sheet-performance-run.v1",
        package_id: "PLAN-2026-07-08-project-estimate-sheet-performance",
        unit_id: "UNIT-001",
        run_id: "test-run",
        profile: "artifact-only",
        cleanupRequirement: "NOT_APPLICABLE",
        run_root: runRoot,
        pointer_path: join(root, "current.json"),
        created_at: "2026-07-11T00:00:00.000Z",
        status: "PREPARED",
        sourceFingerprint,
        applicationFingerprint: fingerprint,
        producerFingerprint: fingerprint,
        namespaces: {},
        mutationJournal: [],
        previewProcesses: [],
        admissionKind: "planning",
        admissionPath: "dependencies/planning-admission.json",
        admissionSha256: sha256File(join(runRoot, "dependencies/planning-admission.json")),
        inputApplicationFingerprint: fingerprint,
        inputProducerFingerprint: fingerprint,
      })}\n`, { mode: 0o600 });

      const projection = join(planRoot, "evidence/runtime/jsdom-baseline.json");
      const fixtureProjection = join(planRoot, "evidence/runtime/fixture-manifest.json");
      const result = updateEstimateSheetPerformanceEvidenceIndex({
        repoRoot,
        planRoot,
        immutableRunRoot,
        runManifest: join(runRoot, "run-manifest.json"),
        evidencePath: "reports/jsdom.json",
        projectPath: projection,
        cleanupNotApplicable: true,
        secondary: [{ role: "fixture", evidencePath: "fixtures/fixture.json", projectPath: fixtureProjection }],
        sourceFingerprint,
      });
      expect(result.index.schema_version).toBe(INDEX_SCHEMA);
      expect(result.index.evidence[0]?.id).toBe("EVID-002");
      expect(readFileSync(projection, "utf8")).toBe(readFileSync(join(runRoot, "reports/jsdom.json"), "utf8"));
      expect(readFileSync(fixtureProjection, "utf8")).toBe(readFileSync(join(runRoot, "fixtures/fixture.json"), "utf8"));
      expect(readFileSync(join(planRoot, "evidence/runtime/evidence-index.json"), "utf8")).toContain(INDEX_SCHEMA);
      const transitioned = JSON.parse(readFileSync(join(planRoot, "plan-pack.json"), "utf8"));
      expect(transitioned.runtime_evidence.transition_sequence).toBe(2);
      expect(transitioned.next_unit).toBe("UNIT-002");
      expect(transitioned.units.find((unit: { id: string }) => unit.id === "UNIT-001")?.status).toBe("VERIFIED");
      expect(transitioned.evidence_index.find((evidence: { id: string }) => evidence.id === "EVID-002")?.status).toBe("PASS");
      expect(result.indexPath).toContain("evidence/runtime/runs/UNIT-001/test-run/evidence-index.json");
    } finally {
      rmSync(root, { recursive: true, force: true });
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
      expect(existsSync(fixture.immutableRunRoot)).toBe(false);
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
      expect(readFileSync(fixture.projection, "utf8")).toBe(readFileSync(join(fixture.runRoot, "reports/jsdom.json"), "utf8"));
      expect(readFileSync(fixture.fixtureProjection, "utf8")).toBe(readFileSync(join(fixture.runRoot, "fixtures/fixture.json"), "utf8"));
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
        run_id: "test-run",
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
        run_id: "test-run",
      });
      expect(existsSync(fixture.outputPath)).toBe(true);
      expect(existsSync(fixture.transitionPath)).toBe(true);
      expect(existsSync(fixture.journalPath)).toBe(false);
    } finally {
      fixture.cleanup();
    }
  });
});
