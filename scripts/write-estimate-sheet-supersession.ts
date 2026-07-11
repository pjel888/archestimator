#!/usr/bin/env bun

import { resolve } from "node:path";

import {
  SUPERSESSION_SCHEMA,
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
  parseStrictCli,
  readJsonFile,
  sha256File,
  sha256Json,
  validateFingerprintContent,
  writeJsonNoOverwrite,
  type EstimateUnit,
  type FingerprintContent,
  type RunManifestV1,
  type SourceFingerprint,
} from "./lib/estimate-sheet-performance-contract";
import { computeEstimateSheetSourceFingerprint } from "./compute-estimate-sheet-source-fingerprint";
import {
  BOTTLENECK_BRANCH_ORDER,
  assertBottleneckDecision,
  type BottleneckDecisionV1,
  type BottleneckUnit,
} from "./write-estimate-sheet-bottleneck-decision";

const SUPERSEDABLE = new Set<string>(BOTTLENECK_BRANCH_ORDER);

const PREDECESSORS: Readonly<Record<BottleneckUnit, {
  unitId: string;
  artifactId: string;
  projectionPath: string;
}>> = {
  "UNIT-005": { unitId: "UNIT-004", artifactId: "ART-043", projectionPath: "evidence/runtime/bottleneck-decision.json" },
  "UNIT-006": { unitId: "UNIT-005", artifactId: "ART-044", projectionPath: "evidence/runtime/unit-005-route-d1.json" },
  "UNIT-007": { unitId: "UNIT-006", artifactId: "ART-045", projectionPath: "evidence/runtime/unit-006-graph.json" },
  "UNIT-008": { unitId: "UNIT-007", artifactId: "ART-046", projectionPath: "evidence/runtime/unit-007-derived-state.json" },
  "UNIT-009": { unitId: "UNIT-008", artifactId: "ART-047", projectionPath: "evidence/runtime/unit-008-render-a11y.json" },
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

type EvidenceIndex = {
  schema_version: string;
  unit_id: string;
  run_id: string;
  status: string;
  evidence: Array<{ id: string; immutable_path: string; sha256: string }>;
  payload_sha256: string;
  [key: string]: unknown;
};

type FingerprintOutput = Record<string, unknown> & {
  run_id?: unknown;
  application_fingerprint?: unknown;
  producer_fingerprint?: unknown;
};

export type SupersessionReceiptV1 = {
  schema_version: typeof SUPERSESSION_SCHEMA;
  unit_id: BottleneckUnit;
  run_id: string;
  decision_path: "evidence/runtime/bottleneck-decision.json";
  decision_immutable_path: string;
  decision_sha256: string;
  action: "supersede";
  reason: string;
  predecessor: {
    unit_id: string;
    run_id: string;
    projection_path: string;
    immutable_path: string;
    sha256: string;
    application_fingerprint: FingerprintContent;
    producer_fingerprint: FingerprintContent;
  };
  input_application_fingerprint: FingerprintContent;
  input_producer_fingerprint: FingerprintContent;
  application_fingerprint: FingerprintContent;
  producer_fingerprint: FingerprintContent;
  changed_application_paths: [];
  changed_producer_paths: [];
  resources: [];
  mutations: [];
  output_role: "supersession";
  created_at: string;
  payload_sha256: string;
};

function assertOnlyCliOptions(values: Map<string, unknown>, allowed: readonly string[]): void {
  for (const key of values.keys()) if (!allowed.includes(key)) throw new Error(`unknown CLI option: --${key}`);
}

function resolveImmutable(planRoot: string, path: string, label: string): string {
  if (!isSafeRelativePath(path) || !path.startsWith("evidence/runtime/runs/")) throw new Error(`${label} immutable path is invalid`);
  const absolute = resolve(planRoot, path);
  if (!isContained(planRoot, absolute)) throw new Error(`${label} immutable path escapes plan root`);
  assertRegularFile(absolute, `${label} immutable source`);
  return absolute;
}

function readCurrentRow(planRoot: string, plan: RuntimePlan, artifactId: string, projectionPath: string): {
  row: RuntimeRow & { immutable_path: string };
  immutablePath: string;
} {
  const matches = plan.runtime_evidence.projections.filter((candidate) => candidate.artifact_id === artifactId);
  if (matches.length !== 1) throw new Error(`runtime state must contain exactly one ${artifactId}`);
  const candidate = matches[0]!;
  if (candidate.projection_path !== projectionPath || candidate.immutable_path === null || !isSha256(candidate.sha256)) {
    throw new Error(`${artifactId} runtime binding is stale or malformed`);
  }
  const projection = resolve(planRoot, projectionPath);
  assertRegularFile(projection, `${artifactId} projection`);
  const immutablePath = resolveImmutable(planRoot, candidate.immutable_path, artifactId);
  if (sha256File(projection) !== candidate.sha256 || sha256File(immutablePath) !== candidate.sha256) {
    throw new Error(`${artifactId} projection/immutable hash mismatch`);
  }
  return { row: candidate as RuntimeRow & { immutable_path: string }, immutablePath };
}

function assertPayloadHash(value: Record<string, unknown>, label: string): void {
  if (!isSha256(value.payload_sha256)) throw new Error(`${label} payload hash is missing`);
  const payload = { ...value };
  delete payload.payload_sha256;
  if (sha256Json(payload) !== value.payload_sha256) throw new Error(`${label} payload hash mismatch`);
}

function readCurrentPredecessor(planRoot: string, plan: RuntimePlan, unit: BottleneckUnit): {
  unitId: string;
  runId: string;
  projectionPath: string;
  immutablePath: string;
  sha256: string;
  application: FingerprintContent;
  producer: FingerprintContent;
} {
  const expected = PREDECESSORS[unit];
  const binding = readCurrentRow(planRoot, plan, expected.artifactId, expected.projectionPath);
  const output = readJsonFile<FingerprintOutput>(binding.immutablePath);
  if (validateFingerprintContent(output.application_fingerprint, "predecessor.application_fingerprint").length
    || validateFingerprintContent(output.producer_fingerprint, "predecessor.producer_fingerprint").length
    || typeof output.run_id !== "string" || !output.run_id) {
    throw new Error("supersession predecessor output has invalid identity/fingerprints");
  }

  const registry = plan.runtime_evidence.registry;
  if (registry.artifact_id !== "ART-052" || registry.projection_path !== "evidence/runtime/evidence-index.json"
    || registry.immutable_path === null || !isSha256(registry.sha256)) {
    throw new Error("current evidence-index binding is stale or malformed");
  }
  const registryProjection = resolve(planRoot, registry.projection_path);
  assertRegularFile(registryProjection, "current evidence-index projection");
  const registryImmutable = resolveImmutable(planRoot, registry.immutable_path, "current evidence-index");
  if (sha256File(registryProjection) !== registry.sha256 || sha256File(registryImmutable) !== registry.sha256) {
    throw new Error("current evidence-index projection/immutable hash mismatch");
  }
  const index = readJsonFile<EvidenceIndex>(registryImmutable);
  if (index.schema_version !== "estimate-sheet-evidence-index.v1" || index.unit_id !== expected.unitId
    || !["VERIFIED", "SUPERSEDED"].includes(index.status) || index.run_id !== output.run_id) {
    throw new Error("current evidence-index is not the expected predecessor");
  }
  assertPayloadHash(index, "current evidence-index");
  if (!Array.isArray(index.evidence) || index.evidence.length !== 1
    || index.evidence[0]!.immutable_path !== binding.row.immutable_path
    || index.evidence[0]!.sha256 !== binding.row.sha256) {
    throw new Error("current evidence-index does not bind the predecessor bytes");
  }
  return {
    unitId: expected.unitId,
    runId: output.run_id,
    projectionPath: expected.projectionPath,
    immutablePath: binding.row.immutable_path,
    sha256: binding.row.sha256,
    application: output.application_fingerprint as FingerprintContent,
    producer: output.producer_fingerprint as FingerprintContent,
  };
}

function readCurrentDecision(planRoot: string, plan: RuntimePlan, decisionPath: string): {
  decision: BottleneckDecisionV1;
  immutablePath: string;
  sha256: string;
} {
  const expectedPath = "evidence/runtime/bottleneck-decision.json";
  if (resolve(decisionPath) !== resolve(planRoot, expectedPath)) throw new Error(`decision path must be ${expectedPath}`);
  const binding = readCurrentRow(planRoot, plan, "ART-043", expectedPath);
  const decision = readJsonFile<BottleneckDecisionV1>(binding.immutablePath);
  assertBottleneckDecision(decision);
  return { decision, immutablePath: binding.row.immutable_path, sha256: binding.row.sha256 };
}

export function assertSupersessionReceipt(value: unknown): asserts value is SupersessionReceiptV1 {
  if (!isPlainObject(value) || value.schema_version !== SUPERSESSION_SCHEMA
    || !SUPERSEDABLE.has(String(value.unit_id)) || value.action !== "supersede") {
    throw new Error("supersession receipt schema or identity is invalid");
  }
  if (!Array.isArray(value.resources) || value.resources.length
    || !Array.isArray(value.mutations) || value.mutations.length
    || !Array.isArray(value.changed_application_paths) || value.changed_application_paths.length
    || !Array.isArray(value.changed_producer_paths) || value.changed_producer_paths.length) {
    throw new Error("supersession receipt must declare empty resources, mutations, and source deltas");
  }
  if (!isPlainObject(value.predecessor)
    || !fingerprintContentEqual(value.predecessor.application_fingerprint, value.input_application_fingerprint)
    || !fingerprintContentEqual(value.predecessor.producer_fingerprint, value.input_producer_fingerprint)
    || !fingerprintContentEqual(value.input_application_fingerprint, value.application_fingerprint)
    || !fingerprintContentEqual(value.input_producer_fingerprint, value.producer_fingerprint)) {
    throw new Error("supersession receipt changed application or producer scope");
  }
  assertPayloadHash(value, "supersession receipt");
}

export function writeEstimateSheetSupersession(input: {
  repoRoot?: string;
  planRoot?: string;
  unit: EstimateUnit;
  runManifest: string;
  decision: string;
  output?: string;
  sourceFingerprint?: SourceFingerprint;
}): { receipt: SupersessionReceiptV1; outputPath: string } {
  if (!SUPERSEDABLE.has(input.unit)) throw new Error(`unit ${input.unit} cannot be superseded`);
  const unit = input.unit as BottleneckUnit;
  const repoRoot = resolve(input.repoRoot ?? process.cwd());
  const planRoot = resolve(input.planRoot ?? defaultPlanRoot(repoRoot));
  const manifest = readJsonFile<RunManifestV1>(resolve(input.runManifest));
  assertRunManifest(manifest);
  if (manifest.unit_id !== unit || manifest.cleanupRequirement !== "NOT_APPLICABLE"
    || manifest.previewProcesses.length || manifest.mutationJournal.length || Object.keys(manifest.namespaces).length) {
    throw new Error("supersession requires its prepared side-effect-free unit run");
  }
  const plan = readJsonFile<RuntimePlan>(resolve(planRoot, "plan-pack.json"));
  if (plan.runtime_evidence.latest_unit_id !== unit || plan.runtime_evidence.latest_run_id !== manifest.run_id) {
    throw new Error("supersession run is not the committed current plan run");
  }
  const currentFingerprint = input.sourceFingerprint ?? computeEstimateSheetSourceFingerprint({ repoRoot }).fingerprint as SourceFingerprint;
  if (!fingerprintContentEqual(currentFingerprint.application, manifest.applicationFingerprint)
    || !fingerprintContentEqual(currentFingerprint.producer, manifest.producerFingerprint)) {
    throw new Error("supersession run fingerprint is stale");
  }
  const decisionBinding = readCurrentDecision(planRoot, plan, input.decision);
  const branch = decisionBinding.decision.branches[unit];
  if (branch.action !== "supersede") throw new Error(`immutable decision does not supersede ${unit}`);
  const predecessor = readCurrentPredecessor(planRoot, plan, unit);
  if (!fingerprintContentEqual(predecessor.application, manifest.applicationFingerprint)
    || !fingerprintContentEqual(predecessor.producer, manifest.producerFingerprint)) {
    throw new Error("supersession changed the predecessor application/producer scope");
  }

  const payload = {
    schema_version: SUPERSESSION_SCHEMA,
    unit_id: unit,
    run_id: manifest.run_id,
    decision_path: "evidence/runtime/bottleneck-decision.json" as const,
    decision_immutable_path: decisionBinding.immutablePath,
    decision_sha256: decisionBinding.sha256,
    action: "supersede" as const,
    reason: branch.reason,
    predecessor: {
      unit_id: predecessor.unitId,
      run_id: predecessor.runId,
      projection_path: predecessor.projectionPath,
      immutable_path: predecessor.immutablePath,
      sha256: predecessor.sha256,
      application_fingerprint: predecessor.application,
      producer_fingerprint: predecessor.producer,
    },
    input_application_fingerprint: predecessor.application,
    input_producer_fingerprint: predecessor.producer,
    application_fingerprint: manifest.applicationFingerprint,
    producer_fingerprint: manifest.producerFingerprint,
    changed_application_paths: [] as [],
    changed_producer_paths: [] as [],
    resources: [] as [],
    mutations: [] as [],
    output_role: "supersession" as const,
    created_at: manifest.created_at,
  };
  const receipt: SupersessionReceiptV1 = { ...payload, payload_sha256: sha256Json(payload) };
  assertSupersessionReceipt(receipt);
  const outputPath = ensureContainedRunPath(manifest.run_root, input.output ?? "receipts/supersession.json");
  writeJsonNoOverwrite(outputPath, receipt, 0o600);
  return { receipt, outputPath };
}

export function main(argv = process.argv.slice(2)): number {
  if (argv.includes("--")) throw new Error("supersession command accepts no positional or child arguments");
  const values = parseStrictCli(argv);
  assertOnlyCliOptions(values, ["help", "unit", "decision", "output", "run-manifest"]);
  if (cliBoolean(values, "help")) {
    if (values.size !== 1) throw new Error("--help cannot be combined with other options");
    console.log("Usage: bun run scripts/write-estimate-sheet-supersession.ts --unit=UNIT-005 --decision=evidence/runtime/bottleneck-decision.json --output=auto:supersession");
    return 0;
  }
  const unit = cliString(values, "unit", true) as EstimateUnit;
  if (!SUPERSEDABLE.has(unit)) throw new Error("supersession unit must be UNIT-005 through UNIT-009");
  const decision = cliString(values, "decision", true);
  if (decision !== "evidence/runtime/bottleneck-decision.json") throw new Error("decision path must be evidence/runtime/bottleneck-decision.json");
  if (cliString(values, "output", true) !== "auto:supersession") throw new Error("supersession output must be auto:supersession");
  const repoRoot = process.cwd();
  const planRoot = defaultPlanRoot(repoRoot);
  const plan = readJsonFile<RuntimePlan>(resolve(planRoot, "plan-pack.json"));
  const runManifest = cliString(values, "run-manifest")
    ?? resolve(repoRoot, ".ai/99_scratch/estimate-sheet-performance/runs", unit, plan.runtime_evidence.latest_run_id ?? "", "run-manifest.json");
  const result = writeEstimateSheetSupersession({
    repoRoot,
    planRoot,
    unit,
    runManifest,
    decision: resolve(planRoot, decision),
    output: "receipts/supersession.json",
  });
  process.stdout.write(`${canonicalJson({ ...result.receipt, output_path: result.outputPath })}\n`);
  return 0;
}

if (import.meta.main) {
  try { process.exitCode = main(); }
  catch (error) { console.error(error instanceof Error ? error.message : String(error)); process.exitCode = 1; }
}
