import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import {
  ESTIMATE_LOGICAL_OUTPUTS,
  canonicalJson,
  sha256File,
  sha256Json,
  type FingerprintContent,
  type PerformanceReportV1,
  type RunManifestV1,
  type SourceFingerprint,
} from "../../scripts/lib/estimate-sheet-performance-contract";
import {
  parseReleaseEvaluationMarkdown,
  renderReleaseEvaluation,
  writeEstimateSheetReleaseEvaluation,
} from "../../scripts/write-estimate-sheet-release-evaluation";

const RUN_ID = "123e4567-e89b-42d3-a456-426614174001";
const LOCAL_RUN_ID = "123e4567-e89b-42d3-a456-426614174000";
const LOCAL_PROOF_CHILDREN = [
  ["mode-proof", "estimate-sheet-mode-proof.v1", "mode-proof.json"],
  ["browser-child", "estimate-sheet-performance-report.v1", "reports/browser-child.json"],
  ["d1-child", "estimate-sheet-performance-report.v1", "reports/d1-child.json"],
  ["dom-tests", "estimate-sheet-test-receipt.v1", "receipts/dom-tests.json"],
  ["e2e-tests", "estimate-sheet-test-receipt.v1", "receipts/e2e-tests.json"],
  ["next-build", "estimate-sheet-command-receipt.v1", "receipts/command-next-build.json"],
  ["opennext-build", "estimate-sheet-command-receipt.v1", "receipts/command-opennext-build.json"],
  ["error-handling", "estimate-sheet-command-receipt.v1", "receipts/command-error-handling.json"],
  ["react-doctor", "estimate-sheet-command-receipt.v1", "receipts/command-react-doctor.json"],
  ["typecheck", "estimate-sheet-command-receipt.v1", "receipts/command-typecheck.json"],
] as const;
const roots: string[] = [];

afterEach(() => {
  while (roots.length) rmSync(roots.pop()!, { recursive: true, force: true });
});

function fingerprintContent(seed: string): FingerprintContent {
  return {
    contract_version: "estimate-sheet-fingerprint.v1",
    path_count: 1,
    path_list_sha256: seed.repeat(64).slice(0, 64),
    content_sha256: seed.repeat(64).slice(0, 64),
  };
}

function sourceFingerprint(): SourceFingerprint {
  return {
    contract_version: "estimate-sheet-source-fingerprint.v2",
    head: "1234567",
    path_count: 2,
    path_list_sha256: "c".repeat(64),
    application: fingerprintContent("a"),
    producer: fingerprintContent("b"),
  };
}

function writeJson(path: string, value: unknown): void {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${canonicalJson(value)}\n`, { mode: 0o600 });
}

function hostedReport(fingerprint: SourceFingerprint, overall: "PASS" | "FAIL" = "PASS"): PerformanceReportV1 {
  return {
    schema_version: "estimate-sheet-performance-report.v1",
    evidenceClass: "hosted-d1",
    trace: { packageId: "PLAN-2026-07-08-project-estimate-sheet-performance", unitId: "UNIT-011", evidenceId: "EVID-011" },
    head: fingerprint.head,
    applicationFingerprint: fingerprint.application,
    producerFingerprint: fingerprint.producer,
    fixtureHash: "d".repeat(64),
    buildHash: null,
    authFixtureHash: "e".repeat(64),
    toolHashes: { wrangler: "f".repeat(64) },
    runId: RUN_ID,
    generatedAt: "2026-07-11T00:00:00.000Z",
    method: { warmups: 0, samples: 1, workerCount: 1, retries: 0, profile: "limit" },
    metrics: { hosted: { status: overall, value: overall === "PASS" ? 1 : 0 } },
    overall,
    ...(overall === "FAIL" ? { failures: ["hosted"] } : {}),
    d1: { binding: "ARCH_DB" },
    provider: { provider: "cloudflare-d1-remote" },
    deployment: { deployment_performed: false },
    cleanup: { state: "CLEANUP_VERIFIED" },
    buildMode: "not-applicable",
  };
}

function commandReceipt(input: {
  role: "error-handling" | "release-gates" | "typecheck";
  fingerprint: SourceFingerprint;
  overall?: "PASS" | "FAIL";
  childOutputs?: unknown[];
}) {
  return {
    schema_version: "estimate-sheet-command-receipt.v1",
    role: input.role,
    argv: ["bun", "run", input.role],
    unit_id: "UNIT-011",
    run_id: RUN_ID,
    start_at: "2026-07-11T00:00:00.000Z",
    end_at: "2026-07-11T00:00:01.000Z",
    duration_ms: 1_000,
    exit_code: input.overall === "FAIL" ? 1 : 0,
    signal: null,
    overall: input.overall ?? "PASS",
    redacted_output_sha256: "1".repeat(64),
    diagnostic_counts: { stdoutLines: 1, stderrLines: 0, failures: input.overall === "FAIL" ? 1 : 0 },
    application_fingerprint: input.fingerprint.application,
    producer_fingerprint: input.fingerprint.producer,
    pre_application_fingerprint: input.fingerprint.application,
    pre_producer_fingerprint: input.fingerprint.producer,
    post_application_fingerprint: input.fingerprint.application,
    post_producer_fingerprint: input.fingerprint.producer,
    child_outputs: input.childOutputs ?? [],
    build_hash: null,
  };
}

function localProofChild(role: string, schemaVersion: string, fingerprint: SourceFingerprint) {
  return {
    schema_version: schemaVersion,
    unit_id: "UNIT-010",
    run_id: LOCAL_RUN_ID,
    application_fingerprint: fingerprint.application,
    producer_fingerprint: fingerprint.producer,
    overall: "PASS",
    ...(role === "browser-child" ? { evidenceClass: "local-browser" } : {}),
    ...(role === "d1-child" ? { evidenceClass: "local-d1" } : {}),
    ...(role === "dom-tests" ? { test_class: "vitest" } : {}),
    ...(role === "e2e-tests" ? { test_class: "playwright" } : {}),
    ...(schemaVersion === "estimate-sheet-command-receipt.v1" ? { role } : {}),
  };
}

function setupEvaluation(options: {
  productionReady?: boolean;
  localReady?: boolean;
  observabilityReady?: boolean;
  releaseCommandOverall?: "PASS" | "FAIL";
  typecheckOverall?: "PASS" | "FAIL";
  hostedOverall?: "PASS" | "FAIL";
} = {}) {
  const repoRoot = mkdtempSync(join(tmpdir(), "estimate-release-"));
  roots.push(repoRoot);
  const planRoot = join(repoRoot, ".ai/03_plans/2026-07-08/Project-Estimate-Sheet-Performance-Optimization");
  const runRoot = join(repoRoot, ".ai/99_scratch/estimate-sheet-performance/runs/UNIT-011/run");
  const immutableRunRoot = join(planRoot, "evidence/runtime/runs/UNIT-011", RUN_ID);
  mkdirSync(runRoot, { recursive: true });
  const fingerprint = sourceFingerprint();
  const manifest: RunManifestV1 = {
    schema_version: "estimate-sheet-performance-run.v1",
    package_id: "PLAN-2026-07-08-project-estimate-sheet-performance",
    unit_id: "UNIT-011",
    run_id: RUN_ID,
    profile: "artifact-only",
    evidence_class: "hosted-d1",
    cleanupRequirement: "REQUIRED",
    run_root: runRoot,
    immutable_run_root: immutableRunRoot,
    pointer_path: join(runRoot, "run-pointer.json"),
    logical_outputs: { ...ESTIMATE_LOGICAL_OUTPUTS },
    created_at: "2026-07-11T00:00:00.000Z",
    status: "PREPARED",
    sourceFingerprint: fingerprint,
    applicationFingerprint: fingerprint.application,
    producerFingerprint: fingerprint.producer,
    namespaces: {},
    mutationJournal: [],
    previewProcesses: [],
  };
  const runManifest = join(runRoot, "run-manifest.json");
  writeJson(runManifest, manifest);
  writeJson(join(runRoot, "reports/hosted-d1.json"), hostedReport(fingerprint, options.hostedOverall));

  const localDurableRoot = join(planRoot, `evidence/runtime/runs/UNIT-010/${LOCAL_RUN_ID}`);
  const childReferences = LOCAL_PROOF_CHILDREN.map(([role, schemaId, immutablePath], index) => {
    const childPath = join(localDurableRoot, `dependencies/proof-children/${String(index + 1).padStart(2, "0")}-${role}.json`);
    writeJson(childPath, localProofChild(role, schemaId, fingerprint));
    return { role, schemaId, immutablePath, sha256: sha256File(childPath), childPath };
  });
  const admissionPath = join(localDurableRoot, "dependencies/01-admission.json");
  writeJson(admissionPath, { schema_version: "estimate-sheet-predecessor-admission.v1", unit_id: "UNIT-010", run_id: LOCAL_RUN_ID });
  const localPath = join(localDurableRoot, "reports/integration.json");
  writeJson(localPath, {
    schema_version: "estimate-sheet-performance-integration.v1",
    unit_id: "UNIT-010",
    run_id: LOCAL_RUN_ID,
    integrationScope: "full-local",
    application_fingerprint: fingerprint.application,
    producer_fingerprint: fingerprint.producer,
    requiredPhases: ["off", "shadow", "on", "rollback"],
    sourceBuildMatch: "required",
    fixtureHash: "2".repeat(64),
    authFixtureHash: "3".repeat(64),
    buildHash: "4".repeat(64),
    finalSnapshot: { schemaVersion: "estimate-performance-mode-snapshot.v1" },
    children: childReferences.map(({ role, schemaId, immutablePath, sha256 }) => ({ role, schemaId, immutablePath, sha256 })),
    overall: "PASS",
    generated_at: "2026-07-11T00:00:00.000Z",
  });
  const indexPayload = {
    schema_version: "estimate-sheet-evidence-index.v1",
    unit_id: "UNIT-010",
    run_id: LOCAL_RUN_ID,
    status: "VERIFIED",
    evidence: [{
      id: "EVID-010",
      immutable_path: `evidence/runtime/runs/UNIT-010/${LOCAL_RUN_ID}/reports/integration.json`,
      sha256: sha256File(localPath),
    }],
    dependencySources: [
      ...childReferences.map((entry) => ({
        immutable_path: entry.childPath.slice(planRoot.length + 1),
        sha256: entry.sha256,
      })),
      { immutable_path: admissionPath.slice(planRoot.length + 1), sha256: sha256File(admissionPath) },
    ],
    projection: { path: "evidence/runtime/integrated-local-proof.json", source: "immutable-run" },
    created_at: "2026-07-11T00:00:00.000Z",
  };
  const index = { ...indexPayload, payload_sha256: sha256Json(indexPayload) };
  const immutableIndexPath = join(localDurableRoot, "evidence-index.json");
  const projectedIndexPath = join(planRoot, "evidence/runtime/evidence-index.json");
  writeJson(immutableIndexPath, index);
  writeJson(projectedIndexPath, index);
  const indexSha256 = sha256File(projectedIndexPath);
  writeJson(join(planRoot, "plan-pack.json"), {
    artifacts: [{ id: "ART-052", role: "runtime-evidence-registry", path: "evidence/runtime/evidence-index.json", sha256: indexSha256 }],
    runtime_evidence: {
      registry: {
        artifact_id: "ART-052",
        projection_path: "evidence/runtime/evidence-index.json",
        immutable_path: `evidence/runtime/runs/UNIT-010/${LOCAL_RUN_ID}/evidence-index.json`,
        sha256: indexSha256,
      },
    },
  });

  const productionReady = options.productionReady ?? true;
  const localReady = options.localReady ?? productionReady;
  const observabilityReady = options.observabilityReady ?? productionReady;
  const releaseJsonPath = join(runRoot, "receipts/release-gates-json.json");
  const releaseMarkdownPath = join(runRoot, "receipts/release-gates-md.md");
  writeJson(releaseJsonPath, {
    mode: "cloudflare-release-gates",
    readiness: {
      localReleaseGateReportReady: localReady,
      observabilitySupportProofReady: observabilityReady,
      productionCutoverReady: productionReady,
    },
    gates: [
      { key: "local-runtime", ready: localReady },
      { key: "observability-support", ready: observabilityReady },
    ],
    blockers: productionReady ? [] : ["release evidence remains incomplete"],
  });
  writeFileSync(releaseMarkdownPath, "# Cloudflare Release Gates\n\nDeterministic child output.\n", { mode: 0o600 });
  const childOutputs = [
    {
      env_key: "OUTPUT_FILE",
      role: "release-gates-json",
      immutable_path: releaseJsonPath,
      schema_id: "cloudflare-release-gates",
      sha256: sha256File(releaseJsonPath),
    },
    {
      env_key: "MARKDOWN_FILE",
      role: "release-gates-md",
      immutable_path: releaseMarkdownPath,
      schema_id: "cloudflare-release-gates-markdown",
      sha256: sha256File(releaseMarkdownPath),
    },
  ];
  writeJson(join(runRoot, "receipts/command-error-handling.json"), commandReceipt({ role: "error-handling", fingerprint }));
  writeJson(join(runRoot, "receipts/command-typecheck.json"), commandReceipt({ role: "typecheck", fingerprint, overall: options.typecheckOverall }));
  writeJson(join(runRoot, "receipts/command-release-gates.json"), commandReceipt({
    role: "release-gates",
    fingerprint,
    overall: options.releaseCommandOverall ?? (productionReady ? "PASS" : "FAIL"),
    childOutputs,
  }));
  return { repoRoot, planRoot, runRoot, runManifest };
}

function evaluate(setup: ReturnType<typeof setupEvaluation>) {
  return writeEstimateSheetReleaseEvaluation({
    repoRoot: setup.repoRoot,
    planRoot: setup.planRoot,
    runManifest: setup.runManifest,
    local: "index:EVID-010",
    hosted: "auto:hosted",
    global: "auto:release-gates-json",
    gates: ["auto:error-handling", "auto:release-gates", "auto:typecheck"],
    output: "auto:release",
    createdAt: "2026-07-11T01:00:00.000Z",
  });
}

describe("estimate-sheet release evaluation contract", () => {
  it("derives READY from same-run immutable hosted and release-gate child evidence", () => {
    const setup = setupEvaluation({ productionReady: true });
    const result = evaluate(setup);
    expect(result.evaluation.status).toBe("READY");
    expect(result.evaluation.reasons).toEqual([]);
    expect(result.evaluation.fieldInp).toEqual({ status: "NOT_EVALUATED", reason: "production-rum-outside-no-deploy-pack" });
    expect(result.evaluation.manualScreenReader.status).toBe("NOT_EVALUATED");
    expect(result.evaluation.dependencies.command_receipts.map((entry) => entry.role)).toEqual([
      "error-handling",
      "release-gates",
      "typecheck",
    ]);
    expect(result.evaluation.dependencies.release_gate_outputs.map((entry) => entry.role)).toEqual([
      "release-gates-json",
      "release-gates-md",
    ]);
    expect(result.evaluation.dependencies.local).toMatchObject({
      evidence_id: "EVID-010",
      registry_artifact_id: "ART-052",
      registry_projection_path: "evidence/runtime/evidence-index.json",
      registry_sha256: sha256File(join(setup.planRoot, "evidence/runtime/evidence-index.json")),
    });
    const markdown = readFileSync(result.outputPath, "utf8");
    expect(parseReleaseEvaluationMarkdown(markdown)).toEqual(result.evaluation);
    expect(renderReleaseEvaluation(result.evaluation)).toBe(markdown);
    expect([...markdown.matchAll(/```json/g)]).toHaveLength(1);
  });

  it("derives NOT_READY from a complete global release report without accepting caller status", () => {
    const setup = setupEvaluation({ productionReady: false, localReady: true, observabilityReady: false });
    const result = evaluate(setup);
    expect(result.evaluation.status).toBe("NOT_READY");
    expect(result.evaluation.reasons).toContain("production-cutover-not-ready");
    expect(result.evaluation.reasons).toContain("observability-support-proof-not-ready");
    expect(() => writeEstimateSheetReleaseEvaluation({
      repoRoot: setup.repoRoot,
      planRoot: setup.planRoot,
      runManifest: setup.runManifest,
      local: "index:EVID-010",
      hosted: "auto:hosted",
      global: "auto:release-gates-json",
      gates: ["auto:error-handling", "auto:release-gates", "auto:typecheck"],
      output: "second-release.md",
      status: "READY",
    } as never)).toThrow(/evaluator-derived/);
  });

  it("derives BLOCKED when a required non-release command receipt fails", () => {
    const setup = setupEvaluation({ productionReady: true, typecheckOverall: "FAIL" });
    const result = evaluate(setup);
    expect(result.evaluation.status).toBe("BLOCKED");
    expect(result.evaluation.reasons).toEqual(["typecheck-gate-failed"]);
  });

  it("rejects a production-ready global report that contradicts its prerequisites", () => {
    const setup = setupEvaluation({ productionReady: true, localReady: false });
    expect(() => evaluate(setup)).toThrow(/production readiness contradicts its prerequisites/);
  });

  it("rejects mutation of the current ART-052 projection or a copied proof child", () => {
    const mutatedProjection = setupEvaluation({ productionReady: true });
    writeJson(join(mutatedProjection.planRoot, "evidence/runtime/evidence-index.json"), { mutated: true });
    expect(() => evaluate(mutatedProjection)).toThrow(/ART-052 projection hash mismatch/);

    const mutatedChild = setupEvaluation({ productionReady: true });
    writeJson(
      join(mutatedChild.planRoot, `evidence/runtime/runs/UNIT-010/${LOCAL_RUN_ID}/dependencies/proof-children/01-mode-proof.json`),
      { mutated: true },
    );
    expect(() => evaluate(mutatedChild)).toThrow(/ART-052 dependency hash mismatch/);
  });

  it("rejects mutated child outputs and noncanonical Markdown bytes", () => {
    const setup = setupEvaluation({ productionReady: true });
    writeFileSync(join(setup.runRoot, "receipts/release-gates-json.json"), "{\"mode\":\"mutated\"}\n", { mode: 0o600 });
    expect(() => evaluate(setup)).toThrow(/hash mismatch/);

    const clean = setupEvaluation({ productionReady: true });
    const result = evaluate(clean);
    const markdown = readFileSync(result.outputPath, "utf8");
    expect(() => parseReleaseEvaluationMarkdown(`${markdown}\n`)).toThrow(/not canonical/);
    expect(() => parseReleaseEvaluationMarkdown(markdown.replace("READY", "NOT_READY"))).toThrow();
  });
});
