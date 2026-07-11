#!/usr/bin/env bun

import { resolve } from "node:path";
import {
  buildEstimatePerformanceFixture,
  fixturePayloadWithoutLinkage,
  stableStringify,
  type EstimatePerformanceProfile,
  type EstimateSheetPerformanceFixture,
} from "../tests/fixtures/estimate-sheet-performance";
import {
  PERFORMANCE_REPORT_SCHEMA,
  assertPerformanceReport,
  assertRunManifest,
  assertTestReceipt,
  canonicalJson,
  cliBoolean,
  cliString,
  ensureContainedRunPath,
  fingerprintContentEqual,
  nowIso,
  parseStrictCli,
  readJsonFile,
  resolveRunManifestPath,
  sha256File,
  sha256Hex,
  writeJsonNoOverwrite,
  type PerformanceReportV1,
  type RunManifestV1,
} from "./lib/estimate-sheet-performance-contract";
import { computeEstimateSheetSourceFingerprint } from "./compute-estimate-sheet-source-fingerprint";

const EVIDENCE_CLASSES = new Set(["jsdom", "local-browser", "local-d1", "hosted-d1"]);
const BUDGET_POLICIES = new Set(["record-only", "enforce"]);

function resolveManifest(path: string): RunManifestV1 {
  const manifest = readJsonFile<RunManifestV1>(resolve(path));
  assertRunManifest(manifest);
  return manifest;
}

type CommandGateReceipt = {
  schema_version: string;
  role: string;
  unit_id: string;
  run_id: string;
  overall: "PASS" | "FAIL";
  application_fingerprint: RunManifestV1["applicationFingerprint"];
  producer_fingerprint: RunManifestV1["producerFingerprint"];
};

function resolveArtifactPath(manifest: RunManifestV1, value: string, kind: "test" | "gate" | "fixture" | "report"): string {
  if (!value.startsWith("auto:")) return ensureContainedRunPath(manifest.run_root, value);
  const role = value.slice("auto:".length);
  if (!role) throw new Error(`${kind} output role is empty`);
  if (kind === "test") return ensureContainedRunPath(manifest.run_root, `receipts/${role}.json`);
  if (kind === "gate") return ensureContainedRunPath(manifest.run_root, `receipts/command-${role}.json`);
  if (kind === "fixture") return ensureContainedRunPath(manifest.run_root, `fixtures/${role}.json`);
  return ensureContainedRunPath(manifest.run_root, `reports/${role}.json`);
}

function assertTestReceiptForRun(path: string, manifest: RunManifestV1): void {
  const receipt = readJsonFile(path);
  assertTestReceipt(receipt);
  if (receipt.unit_id !== manifest.unit_id || receipt.run_id !== manifest.run_id) throw new Error(`test receipt identity mismatch: ${path}`);
  if (!fingerprintContentEqual(receipt.application_fingerprint, manifest.applicationFingerprint) || !fingerprintContentEqual(receipt.producer_fingerprint, manifest.producerFingerprint)) {
    throw new Error(`test receipt fingerprint mismatch: ${path}`);
  }
  if (receipt.overall !== "PASS" || receipt.failed !== 0 || receipt.passed < 1) throw new Error(`test receipt is not a passing cohort: ${path}`);
}

function assertGateReceiptForRun(path: string, manifest: RunManifestV1, expectedRole: string): void {
  const receipt = readJsonFile<CommandGateReceipt>(path);
  if (receipt.schema_version !== "estimate-sheet-command-receipt.v1") throw new Error(`gate receipt schema mismatch: ${path}`);
  if (receipt.role !== expectedRole || receipt.unit_id !== manifest.unit_id || receipt.run_id !== manifest.run_id) throw new Error(`gate receipt identity mismatch: ${path}`);
  if (!fingerprintContentEqual(receipt.application_fingerprint, manifest.applicationFingerprint) || !fingerprintContentEqual(receipt.producer_fingerprint, manifest.producerFingerprint)) {
    throw new Error(`gate receipt fingerprint mismatch: ${path}`);
  }
  if (receipt.overall !== "PASS") throw new Error(`gate receipt is not passing: ${path}`);
}

function skippedMetrics(): Record<string, unknown> {
  const reason = "record-only jsdom producer has no instrumented per-metric samples";
  const residualRisk = "Budget compliance remains unevaluated until an instrumented producer records raw samples.";
  return Object.fromEntries([
    "M-GRAPH-ANCESTOR-LOOKUP-P95",
    "M-GRAPH-COMPONENT-LOOKUP-P95",
    "M-GRAPH-DUPLICATE-BYTES",
    "M-DERIVE-CLOSED-MOVE-OPTION-WORK",
    "M-DERIVE-SIDEBAR-UNRELATED-RENDER-COUNT",
    "M-MUTATE-CLIENT-FANOUT-NONMATCH-INSPECTIONS",
    "M-MUTATE-DUPLICATE-SAVE-PATCH-COUNT",
  ].map((metric) => [metric, { status: "SKIPPED", reason, residualRisk }]));
}

export function createEstimateSheetPerformanceReport(input: {
  manifest: RunManifestV1;
  evidenceClass: PerformanceReportV1["evidenceClass"];
  fixtureHash?: string;
  buildHash?: string | null;
  profile?: PerformanceReportV1["method"]["profile"];
  outputRole?: string;
  budgetPolicy?: "record-only" | "enforce";
  overall?: "PASS" | "FAIL";
  failures?: string[];
  metrics?: Record<string, unknown>;
  inputHashes?: Record<string, string>;
}): PerformanceReportV1 {
  const fingerprint = computeEstimateSheetSourceFingerprint({ repoRoot: process.cwd() }).fingerprint;
  const report: PerformanceReportV1 = {
    schema_version: PERFORMANCE_REPORT_SCHEMA,
    evidenceClass: input.evidenceClass,
    trace: {
      packageId: input.manifest.package_id,
      unitId: input.manifest.unit_id,
      evidenceId: input.outputRole,
      requirementIds: ["REQ-013", "OPS-001", "OPS-002"],
    },
    head: fingerprint.head,
    applicationFingerprint: fingerprint.application,
    producerFingerprint: fingerprint.producer,
    fixtureHash: input.fixtureHash ?? sha256Hex("estimate-sheet-fixture-unavailable\0"),
    buildHash: input.buildHash ?? null,
    authFixtureHash: sha256Hex("estimate-sheet-auth-fixture-unavailable\0"),
    toolHashes: { evaluator: sha256Hex(canonicalJson({ schema: PERFORMANCE_REPORT_SCHEMA, role: input.outputRole ?? "report" })), ...(input.inputHashes ?? {}) },
    runId: input.manifest.run_id,
    generatedAt: nowIso(),
    method: { warmups: input.evidenceClass === "jsdom" ? 3 : 0, samples: input.evidenceClass === "jsdom" ? 30 : 0, workerCount: 1, retries: 0, profile: input.profile },
    metrics: input.metrics ?? skippedMetrics(),
    overall: input.overall ?? "FAIL",
    ...(input.failures ? { failures: input.failures } : {}),
  };
  if (input.evidenceClass === "local-browser") {
    report.browserScope = input.manifest.unit_id === "UNIT-002" ? "baseline" : "full-local";
    report.buildMode = "opennext-preview";
  } else {
    report.buildMode = "not-applicable";
  }
  assertPerformanceReport(report, { strict: true });
  return report;
}

export function measureEstimateSheetPerformance(input: {
  runManifest: string;
  evidenceClass: PerformanceReportV1["evidenceClass"];
  output?: string;
  fixtureOutput?: string;
  tests?: string[];
  gates?: string[];
  profile?: EstimatePerformanceProfile;
  outputRole?: string;
  budgetPolicy?: "record-only" | "enforce";
  check?: boolean;
}): { report: PerformanceReportV1; reportPath: string } {
  const manifest = resolveManifest(input.runManifest);
  const current = computeEstimateSheetSourceFingerprint({ repoRoot: process.cwd() }).fingerprint;
  if (!fingerprintContentEqual(current.application, manifest.applicationFingerprint) || !fingerprintContentEqual(current.producer, manifest.producerFingerprint)) {
    throw new Error("run manifest fingerprint is stale for measurement");
  }
  const outputPath = resolveArtifactPath(manifest, input.output ?? `auto:${input.outputRole ?? input.evidenceClass}`, "report");
  if (input.check) {
    const existing = readJsonFile<PerformanceReportV1>(outputPath);
    assertPerformanceReport(existing, { strict: true });
    if (existing.runId !== manifest.run_id || existing.trace.unitId !== manifest.unit_id) throw new Error("report run identity does not match manifest");
    return { report: existing, reportPath: outputPath };
  }
  const profile = input.profile ?? (manifest.profile === "artifact-only" ? "limit" : manifest.profile);
  const fixturePath = resolveArtifactPath(manifest, input.fixtureOutput ?? "auto:fixture", "fixture");
  const testPaths = (input.tests ?? ["auto:dom-tests"]).map((value) => resolveArtifactPath(manifest, value, "test"));
  const gateReferences = input.gates ?? [];
  const gatePaths = gateReferences.map((value) => resolveArtifactPath(manifest, value, "gate"));
  for (const path of testPaths) assertTestReceiptForRun(path, manifest);
  for (let index = 0; index < gatePaths.length; index += 1) assertGateReceiptForRun(gatePaths[index]!, manifest, gateReferences[index]!.slice("auto:".length));

  const fixture = buildEstimatePerformanceFixture(profile, {
    seed: `estimate-sheet-${profile}-v1`,
    traceId: `trace-${manifest.unit_id}-${manifest.run_id}`,
    runId: manifest.run_id,
    generatedAt: manifest.created_at,
    applicationFingerprint: manifest.applicationFingerprint.content_sha256,
    producerFingerprint: manifest.producerFingerprint.content_sha256,
  });
  const fixturePayloadHash = sha256Hex(stableStringify(fixturePayloadWithoutLinkage(fixture)));
  const inputHashes = Object.fromEntries([
    ...testPaths.map((path, index) => [`test-${index + 1}`, sha256File(path)]),
    ...gatePaths.map((path, index) => [`gate-${index + 1}`, sha256File(path)]),
  ]);
  const report = createEstimateSheetPerformanceReport({
    manifest,
    evidenceClass: input.evidenceClass,
    fixtureHash: fixturePayloadHash,
    buildHash: input.evidenceClass === "local-browser" ? sha256Hex(`build-unavailable\0${manifest.run_id}`) : null,
    profile,
    outputRole: input.outputRole,
    budgetPolicy: input.budgetPolicy,
    overall: input.budgetPolicy === "enforce" ? "FAIL" : "PASS",
    failures: input.budgetPolicy === "enforce" ? ["metric-measurement-unavailable"] : undefined,
    metrics: skippedMetrics(),
    inputHashes,
  });
  const reportPayloadHash = sha256Hex(canonicalJson(report));
  const linkedFixture: EstimateSheetPerformanceFixture = {
    ...fixture,
    linkage: {
      counterpartPayloadSha256: reportPayloadHash,
      bundleSha256: sha256Hex(canonicalJson({ fixturePayloadSha256: fixturePayloadHash, reportPayloadSha256: reportPayloadHash })),
    },
  };
  assertPerformanceReport(report, { strict: true });
  writeJsonNoOverwrite(fixturePath, linkedFixture, 0o600);
  writeJsonNoOverwrite(outputPath, report, 0o600);
  return { report, reportPath: outputPath };
}

export function main(argv = process.argv.slice(2)): number {
  const values = parseStrictCli(argv);
  if (cliBoolean(values, "help")) { console.log("Usage: bun run scripts/measure-estimate-sheet-performance.ts --unit=UNIT-001 --evidence-class=jsdom --run-manifest=PATH --output=auto:jsdom [--check]"); return 0; }
  const evidenceClass = cliString(values, "evidence-class", true) as string;
  if (!EVIDENCE_CLASSES.has(evidenceClass)) throw new Error(`invalid evidence class: ${evidenceClass}`);
  const policy = (cliString(values, "budget-policy") ?? "enforce") as "record-only" | "enforce";
  if (!BUDGET_POLICIES.has(policy)) throw new Error(`invalid budget policy: ${policy}`);
  const unit = cliString(values, "unit", true) as string;
  const runManifest = resolveRunManifestPath(process.cwd(), unit, cliString(values, "run-manifest") ?? process.env.ESTIMATE_PERF_RUN_MANIFEST);
  const output = cliString(values, "output");
  const outputRole: string = output?.replace(/^auto:/u, "") ?? evidenceClass;
  const result = measureEstimateSheetPerformance({
    runManifest,
    evidenceClass: evidenceClass as PerformanceReportV1["evidenceClass"],
    output: output ?? `auto:${outputRole}`,
    fixtureOutput: cliString(values, "fixture-output"),
    outputRole,
    budgetPolicy: policy,
    tests: (cliString(values, "tests") ?? "auto:dom-tests").split(",").filter(Boolean),
    gates: (cliString(values, "gates") ?? "").split(",").filter(Boolean),
    profile: cliString(values, "profile") as EstimatePerformanceProfile | undefined,
    check: cliBoolean(values, "check"),
  });
  process.stdout.write(`${JSON.stringify({ ...result.report, report_path: result.reportPath }, null, 2)}\n`);
  return result.report.overall === "PASS" || policy === "record-only" ? 0 : 1;
}

if (import.meta.main) {
  try { process.exitCode = main(); }
  catch (error) { console.error(error instanceof Error ? error.message : String(error)); process.exitCode = 1; }
}
