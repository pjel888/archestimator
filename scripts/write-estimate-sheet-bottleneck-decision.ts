#!/usr/bin/env bun

import { relative, resolve } from "node:path";

import {
  fixturePayloadWithoutLinkage,
  stableStringify,
  type EstimateSheetPerformanceFixture,
} from "../tests/fixtures/estimate-sheet-performance";
import {
  DECISION_SCHEMA,
  PERFORMANCE_BUDGETS,
  assertPerformanceReport,
  assertRegularFile,
  assertRunManifest,
  assertTestReceipt,
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
  sha256Hex,
  sha256Json,
  validateFingerprintContent,
  writeJsonNoOverwrite,
  type FingerprintContent,
  type PerformanceReportV1,
  type RunManifestV1,
  type SourceFingerprint,
  type TestReceiptV1,
} from "./lib/estimate-sheet-performance-contract";
import { computeEstimateSheetSourceFingerprint } from "./compute-estimate-sheet-source-fingerprint";

const BOTTLENECK_DECISION_SCHEMA: typeof DECISION_SCHEMA =
  "estimate-sheet-bottleneck-decision.v1";

export const BOTTLENECK_BRANCH_ORDER = [
  "UNIT-005",
  "UNIT-006",
  "UNIT-007",
  "UNIT-008",
  "UNIT-009",
] as const;

export type BottleneckUnit = (typeof BOTTLENECK_BRANCH_ORDER)[number];
type MetricKind = "maximum" | "zero" | "exact-one" | "functional";

type OperandSpec = Readonly<{
  id: string;
  kind: MetricKind;
  threshold?: number;
}>;

const maximum = (id: string, threshold: number): OperandSpec => ({ id, kind: "maximum", threshold });
const zero = (id: string): OperandSpec => ({ id, kind: "zero", threshold: 0 });
const functional = (id: string): OperandSpec => ({ id, kind: "functional" });

export const BOTTLENECK_OPERAND_REGISTRY: Readonly<Record<BottleneckUnit, readonly OperandSpec[]>> = {
  "UNIT-005": [
    maximum("M-ROUTE-COLD-MEDIAN", PERFORMANCE_BUDGETS.coldRouteMedianMs),
    maximum("M-ROUTE-WARM-MEDIAN", PERFORMANCE_BUDGETS.warmRouteMedianMs),
    maximum("M-ROUTE-HOVER-MEDIAN", PERFORMANCE_BUDGETS.warmRouteMedianMs),
    maximum("M-ROUTE-WARM-CONTENT-VISIBLE", PERFORMANCE_BUDGETS.warmSheetVisibleMs),
    zero("M-ROUTE-PARENT-FALLBACK-COUNT"),
    maximum("M-ROUTE-SKELETON-EPISODES", PERFORMANCE_BUDGETS.sheetSkeletonEpisodes),
    maximum("M-ROUTE-RSC-BYTES", PERFORMANCE_BUDGETS.stressRscBytes),
    maximum("M-D1-ROUTE-CONTEXT-STATEMENTS", PERFORMANCE_BUDGETS.routeContextStatements),
    maximum("M-D1-TAB-TREE-STATEMENTS", PERFORMANCE_BUDGETS.tabTreeStatements),
    maximum("M-D1-ROW-UPDATE-STATEMENTS", PERFORMANCE_BUDGETS.rowUpdateStatements),
    functional("M-D1-SUBTREE-DEPTH-SHAPE"),
    functional("M-D1-BIND-CEILING"),
    maximum("M-D1-COST-PROJECTION-PCT", 50),
  ],
  "UNIT-006": [
    maximum("M-MUTATE-CLIENT-FANOUT-P95", PERFORMANCE_BUDGETS.fanOutP95Ms),
    zero("M-MUTATE-CLIENT-FANOUT-NONMATCH-INSPECTIONS"),
    maximum("M-GRAPH-ANCESTOR-LOOKUP-P95", PERFORMANCE_BUDGETS.ancestorLookupP95Ms),
    maximum("M-GRAPH-COMPONENT-LOOKUP-P95", PERFORMANCE_BUDGETS.componentLookupP95Ms),
    zero("M-GRAPH-DUPLICATE-BYTES"),
  ],
  "UNIT-007": [
    maximum("M-DERIVE-SCALAR-CPU-P95", PERFORMANCE_BUDGETS.scalarDerivedCpuP95Ms),
    maximum("M-INTERACTION-SEARCH-FACET-P95", 100),
    zero("M-DERIVE-FULL-TREE-RECOMPUTE-COUNT"),
    zero("M-DERIVE-UNAFFECTED-ROW-RENDER-COUNT"),
    zero("M-DERIVE-CLOSED-MOVE-OPTION-WORK"),
    zero("M-DERIVE-SIDEBAR-UNRELATED-RENDER-COUNT"),
  ],
  "UNIT-008": [
    maximum("M-INTERACTION-EVENT-TIMING-P75", PERFORMANCE_BUDGETS.labEventTimingP75Ms),
    maximum("M-RENDER-ROW-MARKER-COUNT", PERFORMANCE_BUDGETS.mountedRows),
    maximum("M-RENDER-BRANCH-MARKER-COUNT", PERFORMANCE_BUDGETS.mountedBranches),
    maximum("M-INTERACTION-SCROLL-FRAME-GAP-P95", PERFORMANCE_BUDGETS.scrollFrameGapP95Ms),
    maximum("M-INTERACTION-LONG-FRAME-MAX", PERFORMANCE_BUDGETS.longTaskMaxMs),
    zero("M-INTERACTION-OVER-50MS-COUNT"),
    functional("M-RENDER-FOCUS-CONTINUITY"),
    functional("M-RESPONSIVE-TABLET-EDIT"),
    functional("M-RESPONSIVE-MOBILE-READONLY"),
    functional("M-RENDER-VIRTUALIZATION-A11Y"),
    zero("M-RENDER-CURSOR-ROW-RERENDER-COUNT"),
    maximum("M-ROUTE-CLIENT-JS-GZIP-BYTES", PERFORMANCE_BUDGETS.routeClientJsGzipBytes),
  ],
  "UNIT-009": [
    zero("M-MUTATE-WHOLE-TREE-SNAPSHOT-COUNT"),
    maximum("M-INTERACTION-EDIT-P95", PERFORMANCE_BUDGETS.editP95Ms),
    maximum("M-MUTATE-CLIENT-FANOUT-P95", PERFORMANCE_BUDGETS.fanOutP95Ms),
    zero("M-MUTATE-CLIENT-FANOUT-NONMATCH-INSPECTIONS"),
    functional("M-MUTATE-SERVER-FANOUT-BUDGET"),
    { id: "M-MUTATE-DUPLICATE-SAVE-PATCH-COUNT", kind: "exact-one", threshold: 1 },
    functional("M-MUTATE-REVISION-ORDERING"),
    functional("M-MUTATE-ATOMIC-ROLLBACK"),
    functional("M-MUTATE-OPTIMISTIC-ID"),
    functional("M-MUTATE-CONCURRENCY"),
  ],
};

const BRANCH_PREDICATES: Readonly<Record<BottleneckUnit, string>> = {
  "UNIT-005": BOTTLENECK_OPERAND_REGISTRY["UNIT-005"].map(({ id }) => `${id}.fail`).join(" OR "),
  "UNIT-006": `UNIT-007.activate OR ${BOTTLENECK_OPERAND_REGISTRY["UNIT-006"].map(({ id }) => `${id}.fail`).join(" OR ")}`,
  "UNIT-007": BOTTLENECK_OPERAND_REGISTRY["UNIT-007"].map(({ id }) => `${id}.fail`).join(" OR "),
  "UNIT-008": BOTTLENECK_OPERAND_REGISTRY["UNIT-008"].map(({ id }) => `${id}.fail`).join(" OR "),
  "UNIT-009": BOTTLENECK_OPERAND_REGISTRY["UNIT-009"].map(({ id }) => `${id}.fail`).join(" OR "),
};

type MetricRecord = Record<string, unknown> & {
  status?: unknown;
  value?: unknown;
  threshold?: unknown;
  comparison?: unknown;
  scenarioIds?: unknown;
  affectedScenarioCount?: unknown;
};

export type EvaluatedOperand = {
  metricId: string;
  sourceRole: "jsdom" | "browser" | "d1-local";
  failed: boolean;
  normalizedOverage: number;
  affectedScenarioCount: number;
};

export type BottleneckBranch = {
  action: "activate" | "supersede";
  predicate: string;
  operandIds: string[];
  failedMetricIds: string[];
  failedBudgetCount: number;
  affectedScenarioCount: number;
  normalizedOverage: number;
  triggeredBy: string[];
  reason: string;
};

export type DecisionEvidenceBinding = {
  unit_id: string;
  run_id: string;
  projection_path: string;
  immutable_path: string;
  sha256: string;
};

export type BottleneckDecisionV1 = {
  schema_version: typeof DECISION_SCHEMA;
  unit_id: "UNIT-004";
  run_id: string;
  application_fingerprint: FingerprintContent;
  producer_fingerprint: FingerprintContent;
  predecessor: {
    unit_id: "UNIT-003";
    run_id: string;
    application_fingerprint: FingerprintContent;
    producer_fingerprint: FingerprintContent;
  };
  input_index: { projection_path: string; immutable_path: string; sha256: string };
  evidence: Record<"fixture" | "jsdom" | "browser" | "d1-local" | "decision-tests", DecisionEvidenceBinding>;
  branches: Record<BottleneckUnit, BottleneckBranch>;
  ranking: BottleneckUnit[];
  activatedUnits: BottleneckUnit[];
  supersededUnits: BottleneckUnit[];
  deferredRequirements: [] | ["REQ-014", "DATA-004"];
  overall: "PASS";
  failures: [];
  created_at: string;
  payload_sha256: string;
};

type RuntimeProjectionRow = {
  artifact_id: string;
  evidence_id?: string;
  relationship?: string;
  role?: string;
  projection_path: string;
  immutable_path: string | null;
  sha256: string;
};

type RuntimePlan = {
  runtime_evidence: {
    latest_unit_id: string | null;
    latest_run_id: string | null;
    registry: RuntimeProjectionRow;
    projections: RuntimeProjectionRow[];
  };
};

type EvidenceIndex = {
  schema_version: string;
  unit_id: string;
  run_id: string;
  status: string;
  evidence: Array<{ id: string; immutable_path: string; sha256: string }>;
  projection: { path: string; source: string };
  payload_sha256: string;
  [key: string]: unknown;
};

const INPUT_PROJECTIONS = {
  fixture: { artifactId: "ART-039", unitId: "UNIT-001", role: "fixture", path: "evidence/runtime/fixture-manifest.json" },
  jsdom: { artifactId: "ART-040", unitId: "UNIT-001", role: "jsdom", path: "evidence/runtime/jsdom-baseline.json" },
  browser: { artifactId: "ART-041", unitId: "UNIT-002", role: "browser", path: "evidence/runtime/browser-baseline.json" },
  "d1-local": { artifactId: "ART-042", unitId: "UNIT-003", role: "d1-local", path: "evidence/runtime/d1-local-baseline.json" },
} as const;

function assertExactKeys(value: Record<string, unknown>, expected: readonly string[], label: string): void {
  const actual = Object.keys(value);
  if (actual.length !== expected.length || actual.some((key, index) => key !== expected[index])) {
    throw new Error(`${label} has unknown, missing, duplicate, or unordered fields`);
  }
}

function assertOnlyCliOptions(values: Map<string, unknown>, allowed: readonly string[]): void {
  for (const key of values.keys()) if (!allowed.includes(key)) throw new Error(`unknown CLI option: --${key}`);
}

function assertPayloadSha256(value: Record<string, unknown>, label: string): void {
  if (!isSha256(value.payload_sha256)) throw new Error(`${label} payload hash is missing`);
  const payload = { ...value };
  delete payload.payload_sha256;
  if (sha256Json(payload) !== value.payload_sha256) throw new Error(`${label} payload hash mismatch`);
}

function resolveImmutablePlanFile(planRoot: string, path: string, label: string): string {
  if (!isSafeRelativePath(path) || !path.startsWith("evidence/runtime/runs/")) {
    throw new Error(`${label} immutable path is invalid`);
  }
  const absolute = resolve(planRoot, path);
  if (!isContained(planRoot, absolute)) throw new Error(`${label} immutable path escapes the plan root`);
  assertRegularFile(absolute, `${label} immutable source`);
  return absolute;
}

function readProjectionBinding(
  planRoot: string,
  plan: RuntimePlan,
  spec: (typeof INPUT_PROJECTIONS)[keyof typeof INPUT_PROJECTIONS],
): { binding: DecisionEvidenceBinding; absoluteProjection: string; absoluteImmutable: string } {
  const matches = plan.runtime_evidence.projections.filter((row) => row.artifact_id === spec.artifactId);
  if (matches.length !== 1) throw new Error(`runtime state must contain exactly one ${spec.artifactId}`);
  const row = matches[0]!;
  if (row.projection_path !== spec.path || row.role !== spec.role || row.immutable_path === null || !isSha256(row.sha256)) {
    throw new Error(`${spec.artifactId} runtime projection is stale or malformed`);
  }
  const absoluteProjection = resolve(planRoot, spec.path);
  assertRegularFile(absoluteProjection, `${spec.artifactId} projection`);
  const absoluteImmutable = resolveImmutablePlanFile(planRoot, row.immutable_path, spec.artifactId);
  const projectionSha256 = sha256File(absoluteProjection);
  if (projectionSha256 !== row.sha256 || sha256File(absoluteImmutable) !== row.sha256) {
    throw new Error(`${spec.artifactId} projection/immutable hash mismatch`);
  }
  const runMatch = row.immutable_path.match(new RegExp(`^evidence/runtime/runs/${spec.unitId}/([^/]+)/`, "u"));
  if (!runMatch) throw new Error(`${spec.artifactId} immutable path has the wrong unit`);
  return {
    binding: {
      unit_id: spec.unitId,
      run_id: runMatch[1]!,
      projection_path: spec.path,
      immutable_path: row.immutable_path,
      sha256: row.sha256,
    },
    absoluteProjection,
    absoluteImmutable,
  };
}

function readCurrentIndex(planRoot: string, plan: RuntimePlan, inputIndexPath: string): {
  index: EvidenceIndex;
  binding: { projection_path: string; immutable_path: string; sha256: string };
} {
  const expectedProjection = "evidence/runtime/evidence-index.json";
  const projectionPath = resolve(inputIndexPath);
  if (projectionPath !== resolve(planRoot, expectedProjection)) throw new Error(`input index must be ${expectedProjection}`);
  const row = plan.runtime_evidence.registry;
  if (row.artifact_id !== "ART-052" || row.projection_path !== expectedProjection || row.immutable_path === null || !isSha256(row.sha256)) {
    throw new Error("current evidence-index runtime binding is stale or malformed");
  }
  assertRegularFile(projectionPath, "current evidence-index projection");
  const immutablePath = resolveImmutablePlanFile(planRoot, row.immutable_path, "current evidence-index");
  if (sha256File(projectionPath) !== row.sha256 || sha256File(immutablePath) !== row.sha256) {
    throw new Error("current evidence-index projection/immutable hash mismatch");
  }
  const index = readJsonFile<EvidenceIndex>(immutablePath);
  if (index.schema_version !== "estimate-sheet-evidence-index.v1" || index.unit_id !== "UNIT-003" || index.status !== "VERIFIED") {
    throw new Error("current evidence-index is not the immutable UNIT-003 predecessor");
  }
  assertPayloadSha256(index, "current evidence-index");
  if (index.projection?.path !== INPUT_PROJECTIONS["d1-local"].path || index.projection?.source !== "immutable-run") {
    throw new Error("current evidence-index has the wrong UNIT-003 projection");
  }
  return { index, binding: { projection_path: expectedProjection, immutable_path: row.immutable_path, sha256: row.sha256 } };
}

function assertReportIdentity(
  report: PerformanceReportV1,
  input: {
    evidenceClass: PerformanceReportV1["evidenceClass"];
    unitId: string;
    runId: string;
    fingerprints: { application: FingerprintContent; producer: FingerprintContent };
  },
): void {
  assertPerformanceReport(report, { strict: true });
  if (report.evidenceClass !== input.evidenceClass || report.trace.unitId !== input.unitId || report.runId !== input.runId) {
    throw new Error(`${input.evidenceClass} decision input has wrong unit/run identity`);
  }
  if (report.method.profile !== "limit" || report.method.workerCount !== 1 || report.method.retries !== 0) {
    throw new Error(`${input.evidenceClass} decision input has a stale fixture or sampling profile`);
  }
  if (!fingerprintContentEqual(report.applicationFingerprint, input.fingerprints.application)
    || !fingerprintContentEqual(report.producerFingerprint, input.fingerprints.producer)) {
    throw new Error(`${input.evidenceClass} decision input fingerprint mismatch`);
  }
}

function assertFixtureIdentity(
  fixture: EstimateSheetPerformanceFixture,
  report: PerformanceReportV1,
  binding: DecisionEvidenceBinding,
  fingerprints: { application: FingerprintContent; producer: FingerprintContent },
): void {
  if (fixture.schemaVersion !== "estimate-sheet-performance-fixture.v1"
    || fixture.profile !== "limit"
    || fixture.runId !== binding.run_id
    || fixture.fingerprints.application !== fingerprints.application.content_sha256
    || fixture.fingerprints.producer !== fingerprints.producer.content_sha256) {
    throw new Error("UNIT-001 fixture is stale or has the wrong fingerprint lineage");
  }
  const fixturePayloadSha256 = sha256Hex(stableStringify(fixturePayloadWithoutLinkage(fixture)));
  const reportPayloadSha256 = sha256Hex(canonicalJson(report));
  const bundleSha256 = sha256Hex(canonicalJson({ fixturePayloadSha256, reportPayloadSha256 }));
  if (report.fixtureHash !== fixturePayloadSha256
    || fixture.linkage.counterpartPayloadSha256 !== reportPayloadSha256
    || fixture.linkage.bundleSha256 !== bundleSha256) {
    throw new Error("UNIT-001 fixture/report linkage is stale");
  }
}

function affectedScenarioCount(metric: MetricRecord): number {
  if (Array.isArray(metric.scenarioIds)) {
    if (metric.scenarioIds.length === 0 || metric.scenarioIds.some((id) => typeof id !== "string" || !id)) {
      throw new Error("metric scenarioIds are unclassifiable");
    }
    return new Set(metric.scenarioIds).size;
  }
  if (metric.affectedScenarioCount !== undefined) {
    if (!Number.isInteger(metric.affectedScenarioCount) || Number(metric.affectedScenarioCount) < 1) {
      throw new Error("metric affectedScenarioCount is unclassifiable");
    }
    return Number(metric.affectedScenarioCount);
  }
  return 1;
}

function evaluateOperand(spec: OperandSpec, metric: MetricRecord, sourceRole: EvaluatedOperand["sourceRole"]): EvaluatedOperand {
  if (metric.status !== "PASS" && metric.status !== "FAIL") {
    throw new Error(`${spec.id} is missing, skipped, or unclassifiable`);
  }
  if (metric.unclassifiable === true) throw new Error(`${spec.id} is explicitly unclassifiable`);
  let failed: boolean;
  let normalizedOverage = 0;
  if (spec.kind === "functional") {
    failed = metric.status !== "PASS";
  } else {
    if (typeof metric.value !== "number" || !Number.isFinite(metric.value)) throw new Error(`${spec.id} is missing or non-finite`);
    if (metric.threshold !== spec.threshold) throw new Error(`${spec.id} threshold is stale`);
    const expectedComparison = spec.kind === "exact-one" ? "exact" : "maximum";
    if (metric.comparison !== expectedComparison) throw new Error(`${spec.id} comparison is stale or unclassifiable`);
    if (metric.value < 0) throw new Error(`${spec.id} is negative and unclassifiable`);
    if (spec.kind === "maximum") failed = metric.value > (spec.threshold as number);
    else if (spec.kind === "zero") failed = metric.value !== 0;
    else failed = metric.value !== 1;
    if (failed) {
      const threshold = spec.threshold as number;
      normalizedOverage = threshold === 0 ? Math.abs(metric.value) : Math.abs(metric.value - threshold) / Math.abs(threshold);
    }
    if ((metric.status === "FAIL") !== failed) throw new Error(`${spec.id} status contradicts its value and threshold`);
  }
  return {
    metricId: spec.id,
    sourceRole,
    failed,
    normalizedOverage,
    affectedScenarioCount: failed ? affectedScenarioCount(metric) : 0,
  };
}

export function evaluateBottleneckBranches(reports: Record<EvaluatedOperand["sourceRole"], PerformanceReportV1>): {
  branches: Record<BottleneckUnit, BottleneckBranch>;
  ranking: BottleneckUnit[];
} {
  const branchEvaluations = {} as Record<BottleneckUnit, EvaluatedOperand[]>;
  for (const unit of BOTTLENECK_BRANCH_ORDER) {
    branchEvaluations[unit] = BOTTLENECK_OPERAND_REGISTRY[unit].map((spec) => {
      const matches = (Object.entries(reports) as Array<[EvaluatedOperand["sourceRole"], PerformanceReportV1]>)
        .filter(([, report]) => Object.prototype.hasOwnProperty.call(report.metrics, spec.id));
      if (matches.length !== 1) throw new Error(`${spec.id} must be mapped exactly once; found ${matches.length}`);
      const [sourceRole, report] = matches[0]!;
      const metric = report.metrics[spec.id];
      if (!isPlainObject(metric)) throw new Error(`${spec.id} is missing or unclassifiable`);
      return evaluateOperand(spec, metric, sourceRole);
    });
  }

  const unit007Failed = branchEvaluations["UNIT-007"].some(({ failed }) => failed);
  const branches = {} as Record<BottleneckUnit, BottleneckBranch>;
  for (const unit of BOTTLENECK_BRANCH_ORDER) {
    const evaluated = branchEvaluations[unit];
    const failed = evaluated.filter((operand) => operand.failed);
    const triggeredBy = unit === "UNIT-006" && unit007Failed ? ["UNIT-007"] : [];
    const action: BottleneckBranch["action"] = failed.length > 0 || triggeredBy.length > 0 ? "activate" : "supersede";
    branches[unit] = {
      action,
      predicate: BRANCH_PREDICATES[unit],
      operandIds: BOTTLENECK_OPERAND_REGISTRY[unit].map(({ id }) => id),
      failedMetricIds: failed.map(({ metricId }) => metricId),
      failedBudgetCount: failed.length,
      affectedScenarioCount: failed.reduce((sum, operand) => sum + operand.affectedScenarioCount, 0),
      normalizedOverage: Number(failed.reduce((sum, operand) => sum + operand.normalizedOverage, 0).toFixed(9)),
      triggeredBy,
      reason: action === "activate"
        ? `predicate-true:${[...triggeredBy.map((id) => `${id}.activate`), ...failed.map(({ metricId }) => `${metricId}.fail`)].join(",")}`
        : "predicate-false:all-explicit-operands-pass",
    };
  }
  const ranking = BOTTLENECK_BRANCH_ORDER.filter((unit) => branches[unit].action === "activate")
    .sort((left, right) => {
      const leftBranch = branches[left];
      const rightBranch = branches[right];
      return rightBranch.failedBudgetCount - leftBranch.failedBudgetCount
        || rightBranch.normalizedOverage - leftBranch.normalizedOverage
        || rightBranch.affectedScenarioCount - leftBranch.affectedScenarioCount
        || BOTTLENECK_BRANCH_ORDER.indexOf(left) - BOTTLENECK_BRANCH_ORDER.indexOf(right);
    });
  return { branches, ranking };
}

export function assertBottleneckDecision(value: unknown): asserts value is BottleneckDecisionV1 {
  if (!isPlainObject(value)) throw new Error("decision must be an object");
  assertExactKeys(value, [
    "schema_version", "unit_id", "run_id", "application_fingerprint", "producer_fingerprint",
    "predecessor", "input_index", "evidence", "branches", "ranking", "activatedUnits",
    "supersededUnits", "deferredRequirements", "overall", "failures", "created_at", "payload_sha256",
  ], "decision");
  if (value.schema_version !== BOTTLENECK_DECISION_SCHEMA || value.unit_id !== "UNIT-004" || typeof value.run_id !== "string" || !value.run_id) {
    throw new Error("decision schema or identity is invalid");
  }
  if (validateFingerprintContent(value.application_fingerprint, "application_fingerprint").length
    || validateFingerprintContent(value.producer_fingerprint, "producer_fingerprint").length) {
    throw new Error("decision fingerprints are invalid");
  }
  if (!isPlainObject(value.predecessor)
    || value.predecessor.unit_id !== "UNIT-003"
    || typeof value.predecessor.run_id !== "string"
    || !fingerprintContentEqual(value.predecessor.application_fingerprint, value.application_fingerprint)
    || !fingerprintContentEqual(value.predecessor.producer_fingerprint, value.producer_fingerprint)) {
    throw new Error("decision predecessor is invalid");
  }
  if (!isPlainObject(value.input_index)
    || value.input_index.projection_path !== "evidence/runtime/evidence-index.json"
    || !isSafeRelativePath(value.input_index.immutable_path)
    || !isSha256(value.input_index.sha256)) {
    throw new Error("decision input index binding is invalid");
  }
  if (!isPlainObject(value.evidence)) throw new Error("decision evidence bindings are missing");
  assertExactKeys(value.evidence, ["fixture", "jsdom", "browser", "d1-local", "decision-tests"], "decision evidence");
  for (const [role, binding] of Object.entries(value.evidence)) {
    if (!isPlainObject(binding) || typeof binding.unit_id !== "string" || typeof binding.run_id !== "string"
      || typeof binding.projection_path !== "string" || typeof binding.immutable_path !== "string"
      || !isSha256(binding.sha256)) {
      throw new Error(`decision evidence binding ${role} is invalid`);
    }
  }
  if (!isPlainObject(value.branches)) throw new Error("decision branches are missing");
  assertExactKeys(value.branches, BOTTLENECK_BRANCH_ORDER, "decision branches");
  const activated: BottleneckUnit[] = [];
  const superseded: BottleneckUnit[] = [];
  for (const unit of BOTTLENECK_BRANCH_ORDER) {
    const branch = value.branches[unit];
    if (!isPlainObject(branch) || (branch.action !== "activate" && branch.action !== "supersede")) throw new Error(`decision branch ${unit} is invalid`);
    assertExactKeys(branch, [
      "action", "predicate", "operandIds", "failedMetricIds", "failedBudgetCount",
      "affectedScenarioCount", "normalizedOverage", "triggeredBy", "reason",
    ], `decision branch ${unit}`);
    if (branch.predicate !== BRANCH_PREDICATES[unit]) throw new Error(`decision branch ${unit} predicate is not canonical`);
    if (!Array.isArray(branch.operandIds)
      || canonicalJson(branch.operandIds) !== canonicalJson(BOTTLENECK_OPERAND_REGISTRY[unit].map(({ id }) => id))) {
      throw new Error(`decision branch ${unit} operands are not canonical`);
    }
    if (!Array.isArray(branch.failedMetricIds)
      || branch.failedMetricIds.some((id) => typeof id !== "string")
      || canonicalJson(branch.failedMetricIds) !== canonicalJson((branch.operandIds as string[]).filter((id) => (branch.failedMetricIds as string[]).includes(id)))) {
      throw new Error(`decision branch ${unit} failed operands are invalid or unordered`);
    }
    const failedMetricIds = branch.failedMetricIds as string[];
    if (branch.failedBudgetCount !== failedMetricIds.length
      || !Number.isInteger(branch.affectedScenarioCount) || Number(branch.affectedScenarioCount) < 0
      || typeof branch.normalizedOverage !== "number" || !Number.isFinite(branch.normalizedOverage) || branch.normalizedOverage < 0) {
      throw new Error(`decision branch ${unit} ranking operands are invalid`);
    }
    const expectedTriggeredBy = unit === "UNIT-006" && value.branches["UNIT-007"].action === "activate" ? ["UNIT-007"] : [];
    if (canonicalJson(branch.triggeredBy) !== canonicalJson(expectedTriggeredBy)) throw new Error(`decision branch ${unit} dependency trigger is invalid`);
    const expectedAction = failedMetricIds.length > 0 || expectedTriggeredBy.length > 0 ? "activate" : "supersede";
    if (branch.action !== expectedAction) throw new Error(`decision branch ${unit} action contradicts its explicit predicate`);
    const expectedReason = expectedAction === "activate"
      ? `predicate-true:${[...expectedTriggeredBy.map((id) => `${id}.activate`), ...failedMetricIds.map((id) => `${id}.fail`)].join(",")}`
      : "predicate-false:all-explicit-operands-pass";
    if (branch.reason !== expectedReason) throw new Error(`decision branch ${unit} reason is invalid`);
    (branch.action === "activate" ? activated : superseded).push(unit);
  }
  if (value.branches["UNIT-007"].action === "activate" && value.branches["UNIT-006"].action !== "activate") {
    throw new Error("decision violates UNIT-007.activate => UNIT-006.activate");
  }
  if (canonicalJson(value.activatedUnits) !== canonicalJson(activated)
    || canonicalJson(value.supersededUnits) !== canonicalJson(superseded)) {
    throw new Error("decision activated/superseded lists do not match branches");
  }
  const expectedDeferred = superseded.includes("UNIT-006") ? ["REQ-014", "DATA-004"] : [];
  if (canonicalJson(value.deferredRequirements) !== canonicalJson(expectedDeferred)) throw new Error("decision deferred requirements are invalid");
  const expectedRanking = BOTTLENECK_BRANCH_ORDER.filter((unit) => activated.includes(unit))
    .sort((left, right) => {
      const leftBranch = value.branches[left] as unknown as BottleneckBranch;
      const rightBranch = value.branches[right] as unknown as BottleneckBranch;
      return rightBranch.failedBudgetCount - leftBranch.failedBudgetCount
        || rightBranch.normalizedOverage - leftBranch.normalizedOverage
        || rightBranch.affectedScenarioCount - leftBranch.affectedScenarioCount
        || BOTTLENECK_BRANCH_ORDER.indexOf(left) - BOTTLENECK_BRANCH_ORDER.indexOf(right);
    });
  if (canonicalJson(value.ranking) !== canonicalJson(expectedRanking)) throw new Error("decision ranking is invalid");
  if (value.overall !== "PASS" || !Array.isArray(value.failures) || value.failures.length !== 0) throw new Error("decision outcome is invalid");
  assertPayloadSha256(value, "decision");
}

function validateDecisionTestReceipt(path: string, manifest: RunManifestV1): TestReceiptV1 {
  const receipt = readJsonFile<TestReceiptV1>(path);
  assertTestReceipt(receipt);
  if (receipt.unit_id !== "UNIT-004" || receipt.run_id !== manifest.run_id || receipt.overall !== "PASS" || receipt.failed !== 0) {
    throw new Error("decision test receipt has the wrong run identity or outcome");
  }
  if (canonicalJson(receipt.files) !== canonicalJson(["tests/vitest/estimate-sheet-bottleneck-decision.test.ts"])) {
    throw new Error("decision test receipt has an unexpected file list");
  }
  if (receipt.fixtureMutation !== undefined
    || !fingerprintContentEqual(receipt.application_fingerprint, manifest.applicationFingerprint)
    || !fingerprintContentEqual(receipt.producer_fingerprint, manifest.producerFingerprint)) {
    throw new Error("decision test receipt changed fixture or fingerprint scope");
  }
  return receipt;
}

export function writeEstimateSheetBottleneckDecision(input: {
  repoRoot?: string;
  planRoot?: string;
  runManifest: string;
  inputIndex: string;
  tests: string;
  output?: string;
  sourceFingerprint?: SourceFingerprint;
}): { decision: BottleneckDecisionV1; outputPath: string } {
  const repoRoot = resolve(input.repoRoot ?? process.cwd());
  const planRoot = resolve(input.planRoot ?? defaultPlanRoot(repoRoot));
  const manifest = readJsonFile<RunManifestV1>(resolve(input.runManifest));
  assertRunManifest(manifest);
  if (manifest.unit_id !== "UNIT-004" || manifest.cleanupRequirement !== "NOT_APPLICABLE"
    || manifest.previewProcesses.length || manifest.mutationJournal.length || Object.keys(manifest.namespaces).length) {
    throw new Error("decision requires the prepared side-effect-free UNIT-004 run");
  }
  const plan = readJsonFile<RuntimePlan>(resolve(planRoot, "plan-pack.json"));
  if (plan.runtime_evidence.latest_unit_id !== "UNIT-004" || plan.runtime_evidence.latest_run_id !== manifest.run_id) {
    throw new Error("decision run is not the committed UNIT-004 plan run");
  }
  const currentFingerprint = input.sourceFingerprint ?? computeEstimateSheetSourceFingerprint({ repoRoot }).fingerprint as SourceFingerprint;
  if (!fingerprintContentEqual(currentFingerprint.application, manifest.applicationFingerprint)
    || !fingerprintContentEqual(currentFingerprint.producer, manifest.producerFingerprint)) {
    throw new Error("decision run fingerprint is stale");
  }

  const currentIndex = readCurrentIndex(planRoot, plan, resolve(input.inputIndex));
  const inputBindings = Object.fromEntries(
    Object.entries(INPUT_PROJECTIONS).map(([role, spec]) => [role, readProjectionBinding(planRoot, plan, spec)]),
  ) as Record<keyof typeof INPUT_PROJECTIONS, ReturnType<typeof readProjectionBinding>>;
  const expectedD1Evidence = currentIndex.index.evidence;
  if (!Array.isArray(expectedD1Evidence) || expectedD1Evidence.length !== 1
    || expectedD1Evidence[0]!.id !== "EVID-004"
    || expectedD1Evidence[0]!.immutable_path !== inputBindings["d1-local"].binding.immutable_path
    || expectedD1Evidence[0]!.sha256 !== inputBindings["d1-local"].binding.sha256) {
    throw new Error("current evidence-index does not bind the current UNIT-003 projection");
  }

  const reports = {
    jsdom: readJsonFile<PerformanceReportV1>(inputBindings.jsdom.absoluteImmutable),
    browser: readJsonFile<PerformanceReportV1>(inputBindings.browser.absoluteImmutable),
    "d1-local": readJsonFile<PerformanceReportV1>(inputBindings["d1-local"].absoluteImmutable),
  };
  const fingerprints = { application: manifest.applicationFingerprint, producer: manifest.producerFingerprint };
  assertReportIdentity(reports.jsdom, { evidenceClass: "jsdom", unitId: "UNIT-001", runId: inputBindings.jsdom.binding.run_id, fingerprints });
  assertReportIdentity(reports.browser, { evidenceClass: "local-browser", unitId: "UNIT-002", runId: inputBindings.browser.binding.run_id, fingerprints });
  if (reports.browser.browserScope !== "baseline") throw new Error("browser decision input must use baseline scope");
  assertReportIdentity(reports["d1-local"], { evidenceClass: "local-d1", unitId: "UNIT-003", runId: inputBindings["d1-local"].binding.run_id, fingerprints });
  const fixture = readJsonFile<EstimateSheetPerformanceFixture>(inputBindings.fixture.absoluteImmutable);
  assertFixtureIdentity(fixture, reports.jsdom, inputBindings.fixture.binding, fingerprints);

  if (input.tests !== "auto:decision-tests") throw new Error("decision tests must be auto:decision-tests");
  const testPath = ensureContainedRunPath(manifest.run_root, "receipts/decision-tests.json");
  validateDecisionTestReceipt(testPath, manifest);
  const testBinding: DecisionEvidenceBinding = {
    unit_id: "UNIT-004",
    run_id: manifest.run_id,
    projection_path: "auto:decision-tests",
    immutable_path: relative(planRoot, testPath).split("\\").join("/"),
    sha256: sha256File(testPath),
  };

  const evaluated = evaluateBottleneckBranches(reports);
  const activatedUnits = BOTTLENECK_BRANCH_ORDER.filter((unit) => evaluated.branches[unit].action === "activate");
  const supersededUnits = BOTTLENECK_BRANCH_ORDER.filter((unit) => evaluated.branches[unit].action === "supersede");
  const payload = {
    schema_version: BOTTLENECK_DECISION_SCHEMA,
    unit_id: "UNIT-004" as const,
    run_id: manifest.run_id,
    application_fingerprint: manifest.applicationFingerprint,
    producer_fingerprint: manifest.producerFingerprint,
    predecessor: {
      unit_id: "UNIT-003" as const,
      run_id: currentIndex.index.run_id,
      application_fingerprint: manifest.applicationFingerprint,
      producer_fingerprint: manifest.producerFingerprint,
    },
    input_index: currentIndex.binding,
    evidence: {
      fixture: inputBindings.fixture.binding,
      jsdom: inputBindings.jsdom.binding,
      browser: inputBindings.browser.binding,
      "d1-local": inputBindings["d1-local"].binding,
      "decision-tests": testBinding,
    },
    branches: evaluated.branches,
    ranking: evaluated.ranking,
    activatedUnits,
    supersededUnits,
    deferredRequirements: (supersededUnits.includes("UNIT-006") ? ["REQ-014", "DATA-004"] : []) as [] | ["REQ-014", "DATA-004"],
    overall: "PASS" as const,
    failures: [] as [],
    created_at: manifest.created_at,
  };
  const decision: BottleneckDecisionV1 = { ...payload, payload_sha256: sha256Json(payload) };
  assertBottleneckDecision(decision);
  const outputPath = ensureContainedRunPath(manifest.run_root, input.output ?? "receipts/decision.json");
  writeJsonNoOverwrite(outputPath, decision, 0o600);
  return { decision, outputPath };
}

export function main(argv = process.argv.slice(2)): number {
  if (argv.includes("--")) throw new Error("decision command accepts no positional or child arguments");
  const values = parseStrictCli(argv);
  assertOnlyCliOptions(values, ["help", "unit", "input-index", "tests", "output", "run-manifest"]);
  if (cliBoolean(values, "help")) {
    if (values.size !== 1) throw new Error("--help cannot be combined with other options");
    console.log("Usage: bun run scripts/write-estimate-sheet-bottleneck-decision.ts --unit=UNIT-004 --input-index=evidence/runtime/evidence-index.json --tests=auto:decision-tests --output=auto:decision");
    return 0;
  }
  if (cliString(values, "unit", true) !== "UNIT-004") throw new Error("decision writer only accepts UNIT-004");
  const inputIndex = cliString(values, "input-index", true);
  if (inputIndex !== "evidence/runtime/evidence-index.json") throw new Error("input index must be evidence/runtime/evidence-index.json");
  const tests = cliString(values, "tests", true);
  const output = cliString(values, "output", true);
  if (output !== "auto:decision") throw new Error("decision output must be auto:decision");
  const repoRoot = process.cwd();
  const planRoot = defaultPlanRoot(repoRoot);
  const runManifest = cliString(values, "run-manifest")
    ?? resolve(repoRoot, ".ai/99_scratch/estimate-sheet-performance/runs/UNIT-004", readJsonFile<RuntimePlan>(resolve(planRoot, "plan-pack.json")).runtime_evidence.latest_run_id ?? "", "run-manifest.json");
  const result = writeEstimateSheetBottleneckDecision({
    repoRoot,
    planRoot,
    runManifest,
    inputIndex: resolve(planRoot, inputIndex),
    tests,
    output: "receipts/decision.json",
  });
  process.stdout.write(`${canonicalJson({ ...result.decision, output_path: result.outputPath })}\n`);
  return 0;
}

if (import.meta.main) {
  try { process.exitCode = main(); }
  catch (error) { console.error(error instanceof Error ? error.message : String(error)); process.exitCode = 1; }
}
