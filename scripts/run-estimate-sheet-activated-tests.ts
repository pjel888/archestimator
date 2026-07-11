#!/usr/bin/env bun

import { spawnSync, type SpawnSyncReturns } from "node:child_process";
import { existsSync, lstatSync, realpathSync } from "node:fs";
import { resolve } from "node:path";

import {
  assertRegularFile,
  assertRunManifest,
  canonicalJson,
  cliBoolean,
  cliString,
  defaultPlanRoot,
  ensureContainedRunPath,
  fingerprintContentEqual,
  isContained,
  isPlainObject,
  isSafeRelativePath,
  isSha256,
  normalizeArgv,
  parseStrictCli,
  readJsonFile,
  resolveRunManifestPath,
  sha256File,
  sha256Json,
  validateFingerprintContent,
  type RunManifestV1,
  type SourceFingerprint,
} from "./lib/estimate-sheet-performance-contract";
import { readTestReceipt } from "./lib/estimate-sheet-performance-test-receipt";
import { computeEstimateSheetSourceFingerprint } from "./compute-estimate-sheet-source-fingerprint";
import {
  BOTTLENECK_BRANCH_ORDER,
  assertBottleneckDecision,
  type BottleneckDecisionV1,
  type BottleneckUnit,
} from "./write-estimate-sheet-bottleneck-decision";
import { assertSupersessionReceipt } from "./write-estimate-sheet-supersession";

export const ACTIVATED_ESTIMATE_TEST_REGISTRY = {
  base: [
    "tests/vitest/estimate-node-route-context-rpc-contract.test.ts",
    "tests/vitest/estimate-route-server-concurrency.test.ts",
    "tests/vitest/estimate-sheet-large-data-budgets.test.ts",
    "tests/vitest/estimate-row-table-virtualization.test.tsx",
    "tests/vitest/estimate-branch-virtualization.test.tsx",
    "tests/vitest/perf/estimate-sheet-render-baseline.test.tsx",
    "tests/vitest/perf/estimate-sheet-render-relief.test.tsx",
    "tests/vitest/perf/estimate-sheet-memoization.test.tsx",
    "tests/vitest/perf/estimate-sheet-cursor-isolation.test.tsx",
    "tests/vitest/estimate-sheet-performance-contract.test.ts",
    "tests/vitest/estimate-sheet-d1-performance.test.ts",
    "tests/vitest/estimate-mutations.test.ts",
    "tests/vitest/estimate-row-mutation-coordinator.test.tsx",
    "tests/vitest/estimate-sheet-bulk-row-delete-partial-failure.test.tsx",
    "tests/vitest/estimate-row-update-broadcast.test.ts",
    "tests/vitest/estimate-component-fan-out.test.ts",
    "tests/vitest/perf/estimate-sheet-fan-out-budget.test.tsx",
    "tests/vitest/estimate-link-state-transitions.test.ts",
    "tests/vitest/estimate-component-identity.test.ts",
    "tests/vitest/estimate-three-edit-surfaces.test.ts",
    "tests/vitest/estimate-sheet-derived-work-characterization.test.tsx",
    "tests/vitest/estimate-sheet-sidebar-render-isolation.test.tsx",
    "tests/vitest/estimate-mutation-revision-concurrency.test.ts",
    "tests/vitest/estimate-sheet-d1-bind-budget.test.ts",
  ],
  "UNIT-005": [
    "tests/vitest/estimate-sheet-route-large-data-contract.test.ts",
  ],
  "UNIT-006": [
    "tests/vitest/estimate-graph-parity.test.ts",
    "tests/vitest/estimate-graph-property.test.ts",
    "tests/vitest/estimate-graph-selectors.test.ts",
  ],
  "UNIT-007": [
    "tests/vitest/estimate-graph-totals.test.ts",
    "tests/vitest/estimate-sheet-derived-state-property.test.ts",
    "tests/vitest/perf/estimate-sheet-large-edit-budget.test.tsx",
  ],
  "UNIT-008": [
    "tests/vitest/perf/estimate-sheet-large-virtualization.test.tsx",
  ],
  "UNIT-009": [
    "tests/vitest/estimate-row-tree-patch.test.ts",
  ],
} as const;

export type ActivatedEstimateTestRegistry = {
  base: readonly string[];
  "UNIT-005": readonly string[];
  "UNIT-006": readonly string[];
  "UNIT-007": readonly string[];
  "UNIT-008": readonly string[];
  "UNIT-009": readonly string[];
};

type RuntimeRow = {
  artifact_id: string;
  projection_path: string;
  immutable_path: string | null;
  sha256: string;
};

type RuntimePlan = {
  runtime_evidence: {
    latest_unit_id: string | null;
    latest_run_id: string | null;
    registry: RuntimeRow;
    projections: RuntimeRow[];
  };
};

type EvidenceIndex = Record<string, unknown> & {
  schema_version?: unknown;
  unit_id?: unknown;
  run_id?: unknown;
  status?: unknown;
  evidence?: unknown;
  payload_sha256?: unknown;
};

type FingerprintOutput = Record<string, unknown> & {
  run_id?: unknown;
  application_fingerprint?: unknown;
  producer_fingerprint?: unknown;
};

const UNIT_OUTPUTS: Readonly<Record<BottleneckUnit, { artifactId: string; projectionPath: string }>> = {
  "UNIT-005": { artifactId: "ART-044", projectionPath: "evidence/runtime/unit-005-route-d1.json" },
  "UNIT-006": { artifactId: "ART-045", projectionPath: "evidence/runtime/unit-006-graph.json" },
  "UNIT-007": { artifactId: "ART-046", projectionPath: "evidence/runtime/unit-007-derived-state.json" },
  "UNIT-008": { artifactId: "ART-047", projectionPath: "evidence/runtime/unit-008-render-a11y.json" },
  "UNIT-009": { artifactId: "ART-048", projectionPath: "evidence/runtime/unit-009-mutations.json" },
};

function assertOnlyCliOptions(values: Map<string, unknown>, allowed: readonly string[]): void {
  for (const key of values.keys()) if (!allowed.includes(key)) throw new Error(`unknown CLI option: --${key}`);
}

function assertCanonicalRegistry(registry: ActivatedEstimateTestRegistry): void {
  const expectedKeys = ["base", ...BOTTLENECK_BRANCH_ORDER];
  const keys = Object.keys(registry);
  if (canonicalJson(keys) !== canonicalJson(expectedKeys)) throw new Error("activated test registry has unknown, missing, or unordered groups");
  for (const key of expectedKeys as Array<keyof ActivatedEstimateTestRegistry>) {
    if (!Array.isArray(registry[key])
      || canonicalJson(registry[key]) !== canonicalJson(ACTIVATED_ESTIMATE_TEST_REGISTRY[key])) {
      throw new Error(`activated test registry group ${key} is unknown or unordered`);
    }
  }
}

export function resolveActivatedEstimateTests(input: {
  decision: BottleneckDecisionV1;
  repoRoot?: string;
  registry?: ActivatedEstimateTestRegistry;
}): string[] {
  assertBottleneckDecision(input.decision);
  const repoRoot = resolve(input.repoRoot ?? process.cwd());
  const realRepoRoot = realpathSync(repoRoot);
  const registry = input.registry ?? ACTIVATED_ESTIMATE_TEST_REGISTRY;
  assertCanonicalRegistry(registry);
  const selected = [...registry.base];
  for (const unit of BOTTLENECK_BRANCH_ORDER) {
    if (input.decision.branches[unit].action === "activate") selected.push(...registry[unit]);
  }
  const seen = new Set<string>();
  for (const path of selected) {
    if (!isSafeRelativePath(path) || !path.startsWith("tests/")) throw new Error(`activated test path escapes the closed registry: ${path}`);
    if (seen.has(path)) throw new Error(`activated test registry contains duplicate path: ${path}`);
    seen.add(path);
    const absolute = resolve(repoRoot, path);
    const stat = lstatSync(absolute, { throwIfNoEntry: false });
    if (!stat?.isFile() || stat.isSymbolicLink()) throw new Error(`activated test path is missing or not a regular file: ${path}`);
    if (!isContained(realRepoRoot, realpathSync(absolute))) throw new Error(`activated test path resolves outside the repository: ${path}`);
  }
  return selected;
}

function resolveImmutable(planRoot: string, path: string, label: string): string {
  if (!isSafeRelativePath(path) || !path.startsWith("evidence/runtime/runs/")) throw new Error(`${label} immutable path is invalid`);
  const absolute = resolve(planRoot, path);
  if (!isContained(planRoot, absolute)) throw new Error(`${label} immutable path escapes plan root`);
  assertRegularFile(absolute, `${label} immutable source`);
  return absolute;
}

function currentRow(planRoot: string, plan: RuntimePlan, artifactId: string, projectionPath: string): {
  row: RuntimeRow & { immutable_path: string };
  immutable: string;
} {
  const matches = plan.runtime_evidence.projections.filter((row) => row.artifact_id === artifactId);
  if (matches.length !== 1) throw new Error(`runtime state must contain exactly one ${artifactId}`);
  const row = matches[0]!;
  if (row.projection_path !== projectionPath || row.immutable_path === null || !isSha256(row.sha256)) {
    throw new Error(`${artifactId} runtime binding is stale or malformed`);
  }
  const projection = resolve(planRoot, projectionPath);
  assertRegularFile(projection, `${artifactId} projection`);
  const immutable = resolveImmutable(planRoot, row.immutable_path, artifactId);
  if (sha256File(projection) !== row.sha256 || sha256File(immutable) !== row.sha256) {
    throw new Error(`${artifactId} projection/immutable hash mismatch`);
  }
  return { row: row as RuntimeRow & { immutable_path: string }, immutable };
}

function assertPayloadHash(value: Record<string, unknown>, label: string): void {
  if (!isSha256(value.payload_sha256)) throw new Error(`${label} payload hash is missing`);
  const payload = { ...value };
  delete payload.payload_sha256;
  if (sha256Json(payload) !== value.payload_sha256) throw new Error(`${label} payload hash mismatch`);
}

function readDecision(planRoot: string, plan: RuntimePlan, decisionPath: string): BottleneckDecisionV1 {
  const expected = "evidence/runtime/bottleneck-decision.json";
  if (resolve(decisionPath) !== resolve(planRoot, expected)) throw new Error(`decision path must be ${expected}`);
  const binding = currentRow(planRoot, plan, "ART-043", expected);
  const decision = readJsonFile<BottleneckDecisionV1>(binding.immutable);
  assertBottleneckDecision(decision);
  return decision;
}

function readCurrentUnit009Output(planRoot: string, plan: RuntimePlan, decision: BottleneckDecisionV1): {
  output: FingerprintOutput;
  row: RuntimeRow & { immutable_path: string };
} {
  for (const unit of BOTTLENECK_BRANCH_ORDER) {
    const spec = UNIT_OUTPUTS[unit];
    const binding = currentRow(planRoot, plan, spec.artifactId, spec.projectionPath);
    const output = readJsonFile<FingerprintOutput>(binding.immutable);
    if (validateFingerprintContent(output.application_fingerprint, `${unit}.application_fingerprint`).length
      || validateFingerprintContent(output.producer_fingerprint, `${unit}.producer_fingerprint`).length
      || typeof output.run_id !== "string" || !output.run_id) {
      throw new Error(`${unit} current output has invalid identity/fingerprints`);
    }
    if (decision.branches[unit].action === "supersede") {
      assertSupersessionReceipt(output);
      if (output.decision_sha256 !== sha256File(resolve(planRoot, "evidence/runtime/bottleneck-decision.json"))) {
        throw new Error(`${unit} supersession receipt is not bound to the current decision`);
      }
    } else if (output.schema_version === "estimate-sheet-supersession-receipt.v1") {
      throw new Error(`${unit} is activated but its current output is a supersession receipt`);
    }
    if (unit === "UNIT-009") return { output, row: binding.row };
  }
  throw new Error("UNIT-009 output is missing");
}

function assertCurrentIndex(planRoot: string, plan: RuntimePlan, unit009: { output: FingerprintOutput; row: RuntimeRow & { immutable_path: string } }): void {
  const registry = plan.runtime_evidence.registry;
  if (registry.artifact_id !== "ART-052" || registry.projection_path !== "evidence/runtime/evidence-index.json"
    || registry.immutable_path === null || !isSha256(registry.sha256)) {
    throw new Error("current evidence-index binding is stale or malformed");
  }
  const projection = resolve(planRoot, registry.projection_path);
  assertRegularFile(projection, "current evidence-index projection");
  const immutable = resolveImmutable(planRoot, registry.immutable_path, "current evidence-index");
  if (sha256File(projection) !== registry.sha256 || sha256File(immutable) !== registry.sha256) {
    throw new Error("current evidence-index projection/immutable hash mismatch");
  }
  const index = readJsonFile<EvidenceIndex>(immutable);
  if (index.schema_version !== "estimate-sheet-evidence-index.v1" || index.unit_id !== "UNIT-009"
    || !["VERIFIED", "SUPERSEDED"].includes(String(index.status)) || index.run_id !== unit009.output.run_id) {
    throw new Error("current evidence-index is not the immutable UNIT-009 predecessor");
  }
  assertPayloadHash(index, "current evidence-index");
  if (!Array.isArray(index.evidence) || index.evidence.length !== 1) throw new Error("current evidence-index has an invalid UNIT-009 evidence set");
  const entry = index.evidence[0];
  if (!isPlainObject(entry) || entry.immutable_path !== unit009.row.immutable_path || entry.sha256 !== unit009.row.sha256) {
    throw new Error("current evidence-index does not bind the current UNIT-009 bytes");
  }
}

export function validateActivatedTestReporterReceipt(
  receiptPath: string,
  manifest: RunManifestV1,
  files: string[],
  child: SpawnSyncReturns<string>,
  repoRoot: string,
): void {
  const receipt = readTestReceipt(receiptPath);
  if (receipt.unit_id !== "UNIT-010" || receipt.run_id !== manifest.run_id
    || !fingerprintContentEqual(receipt.application_fingerprint, manifest.applicationFingerprint)
    || !fingerprintContentEqual(receipt.producer_fingerprint, manifest.producerFingerprint)) {
    throw new Error("activated-test reporter receipt has wrong run/fingerprint identity");
  }
  if (receipt.workers !== 1 || receipt.retries !== 0 || receipt.fixtureMutation !== undefined) {
    throw new Error("activated-test reporter receipt changed worker/retry/fixture state");
  }
  const expectedFiles = normalizeArgv(files, repoRoot);
  if (canonicalJson(receipt.files) !== canonicalJson(expectedFiles)) throw new Error("activated-test reporter receipt file list mismatch");
  const receiptTestPaths = receipt.argv.filter((argument) => argument.startsWith("tests/"));
  if (canonicalJson(receiptTestPaths) !== canonicalJson(expectedFiles)
    || !receipt.argv.includes("--maxWorkers=1")) {
    throw new Error("activated-test reporter receipt argv mismatch");
  }
  if (child.status === 0) {
    if (receipt.overall !== "PASS" || receipt.failed !== 0 || receipt.passed < 1) throw new Error("passing activated-test child wrote a non-passing receipt");
  } else if (receipt.overall !== "FAIL" || receipt.failed < 1) {
    throw new Error("failing activated-test child wrote a non-failing receipt");
  }
}

export function runEstimateSheetActivatedTests(input: {
  repoRoot?: string;
  planRoot?: string;
  decisionPath: string;
  runManifest: string;
  sourceFingerprint?: SourceFingerprint;
  spawn?: typeof spawnSync;
}): { files: string[]; command: string[]; exitCode: number; receiptPath: string } {
  const repoRoot = resolve(input.repoRoot ?? process.cwd());
  const planRoot = resolve(input.planRoot ?? defaultPlanRoot(repoRoot));
  const manifest = readJsonFile<RunManifestV1>(resolve(input.runManifest));
  assertRunManifest(manifest);
  if (manifest.unit_id !== "UNIT-010") throw new Error("activated-test runner requires the prepared UNIT-010 run");
  const plan = readJsonFile<RuntimePlan>(resolve(planRoot, "plan-pack.json"));
  if (plan.runtime_evidence.latest_unit_id !== "UNIT-010" || plan.runtime_evidence.latest_run_id !== manifest.run_id) {
    throw new Error("activated-test run is not the committed UNIT-010 plan run");
  }
  const currentFingerprint = input.sourceFingerprint ?? computeEstimateSheetSourceFingerprint({ repoRoot }).fingerprint as SourceFingerprint;
  if (!fingerprintContentEqual(currentFingerprint.application, manifest.applicationFingerprint)
    || !fingerprintContentEqual(currentFingerprint.producer, manifest.producerFingerprint)) {
    throw new Error("activated-test run fingerprint is stale");
  }
  const decision = readDecision(planRoot, plan, input.decisionPath);
  const unit009 = readCurrentUnit009Output(planRoot, plan, decision);
  assertCurrentIndex(planRoot, plan, unit009);
  if (!fingerprintContentEqual(unit009.output.application_fingerprint, manifest.applicationFingerprint)
    || !fingerprintContentEqual(unit009.output.producer_fingerprint, manifest.producerFingerprint)) {
    throw new Error("UNIT-010 fingerprints do not match the current UNIT-009 predecessor output");
  }

  const files = resolveActivatedEstimateTests({ decision, repoRoot });
  const command = ["bun", "run", "test:dom", "--", ...files, "--maxWorkers=1"];
  const receiptPath = ensureContainedRunPath(manifest.run_root, "receipts/dom-tests.json");
  if (existsSync(receiptPath)) throw new Error("activated-test receipt already exists before the conditional reporter runs");
  const env = { ...process.env };
  delete env.ESTIMATE_PERF_FIXTURE_ROLE;
  delete env.ESTIMATE_PERF_FIXTURE_HASH;
  env.ESTIMATE_PERF_UNIT = "UNIT-010";
  env.ESTIMATE_PERF_TEST_OUTPUT_ROLE = "dom-tests";
  env.ESTIMATE_PERF_RUN_ROOT = manifest.run_root;
  env.ESTIMATE_PERF_RUN_ID = manifest.run_id;
  env.ESTIMATE_PERF_RUN_MANIFEST = resolve(input.runManifest);
  const spawn = input.spawn ?? spawnSync;
  const child = spawn(command[0]!, command.slice(1), {
    cwd: repoRoot,
    env,
    shell: false,
    encoding: "utf8",
    stdio: ["ignore", "inherit", "inherit"],
  }) as SpawnSyncReturns<string>;
  if (child.error) throw child.error;
  if (child.status === null) throw new Error(`activated-test child terminated without an exit code${child.signal ? ` (${child.signal})` : ""}`);
  if (!existsSync(receiptPath)) throw new Error("activated-test conditional reporter did not write its receipt");
  validateActivatedTestReporterReceipt(receiptPath, manifest, files, child, repoRoot);
  return { files, command, exitCode: child.status === 0 ? 0 : 1, receiptPath };
}

export function main(argv = process.argv.slice(2)): number {
  if (argv.includes("--")) throw new Error("activated-test runner accepts no caller-supplied test path or child arguments");
  const values = parseStrictCli(argv);
  assertOnlyCliOptions(values, ["help", "unit", "decision", "output-role"]);
  if (cliBoolean(values, "help")) {
    if (values.size !== 1) throw new Error("--help cannot be combined with other options");
    console.log("Usage: bun run scripts/run-estimate-sheet-activated-tests.ts --unit=UNIT-010 --decision=evidence/runtime/bottleneck-decision.json --output-role=dom-tests");
    return 0;
  }
  if (cliString(values, "unit", true) !== "UNIT-010") throw new Error("activated-test runner only accepts UNIT-010");
  const decision = cliString(values, "decision", true);
  if (decision !== "evidence/runtime/bottleneck-decision.json") throw new Error("decision path must be evidence/runtime/bottleneck-decision.json");
  if (cliString(values, "output-role", true) !== "dom-tests") throw new Error("output role must be dom-tests");
  if (process.env.ESTIMATE_PERF_UNIT !== "UNIT-010" || process.env.ESTIMATE_PERF_TEST_OUTPUT_ROLE !== "dom-tests") {
    throw new Error("activated-test runner requires matching UNIT-010/dom-tests environment identity");
  }
  const repoRoot = process.cwd();
  const planRoot = defaultPlanRoot(repoRoot);
  const runManifest = resolveRunManifestPath(repoRoot, "UNIT-010");
  const result = runEstimateSheetActivatedTests({
    repoRoot,
    planRoot,
    decisionPath: resolve(planRoot, decision),
    runManifest,
  });
  process.stdout.write(`${canonicalJson(result)}\n`);
  return result.exitCode;
}

if (import.meta.main) {
  try { process.exitCode = main(); }
  catch (error) { console.error(error instanceof Error ? error.message : String(error)); process.exitCode = 1; }
}
