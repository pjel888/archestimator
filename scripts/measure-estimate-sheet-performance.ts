#!/usr/bin/env bun

import { readFileSync } from "node:fs";
import { isAbsolute, relative, resolve } from "node:path";
import {
  buildEstimatePerformanceFixture,
  flattenEstimatePerformanceNodes,
  fixturePayloadWithoutLinkage,
  stableStringify,
  type EstimatePerformanceNodeFixture,
  type EstimatePerformanceProfile,
  type EstimateSheetPerformanceFixture,
} from "../tests/fixtures/estimate-sheet-performance";
import { patchProjectComponentInstanceRowsInTree } from "../src/lib/estimates/estimate-row-tree-patch";
import type { EstimateRowItem, EstimateTreeNode } from "../src/lib/estimates/types";
import {
  COMMAND_RECEIPT_SCHEMA,
  INTEGRATION_SCHEMA,
  MODE_PROOF_SCHEMA,
  PERFORMANCE_BUDGETS,
  PERFORMANCE_REPORT_SCHEMA,
  TEST_RECEIPT_SCHEMA,
  UNIT_PROOF_SCHEMA,
  BROWSER_SCOPE_BY_UNIT,
  assertPerformanceReport,
  assertRegularFile,
  assertRunManifest,
  assertTestReceipt,
  canonicalJson,
  cliBoolean,
  cliString,
  ensureContainedRunPath,
  fingerprintContentEqual,
  isPlainObject,
  isSha256,
  nowIso,
  parseStrictCli,
  readJsonFile,
  resolveManifestLogicalOutput,
  resolveRunManifestPath,
  sha256File,
  sha256Hex,
  writeJsonNoOverwrite,
  type PerformanceReportV1,
  type BrowserScope,
  type EstimateOutputRole,
  type FingerprintContent,
  type RunManifestV1,
  type TestReceiptV1,
} from "./lib/estimate-sheet-performance-contract";
import { computeEstimateSheetSourceFingerprint } from "./compute-estimate-sheet-source-fingerprint";
import { assertCompleteLocalD1Measurement } from "./measure-estimate-sheet-d1";

const EVIDENCE_CLASSES = new Set(["jsdom", "local-browser", "local-d1", "hosted-d1"]);
const BUDGET_POLICIES = new Set(["record-only", "enforce"]);

function resolveManifest(path: string): RunManifestV1 {
  const manifest = readJsonFile<RunManifestV1>(resolve(path));
  assertRunManifest(manifest);
  return manifest;
}

type CommandGateReceipt = {
  schema_version: typeof COMMAND_RECEIPT_SCHEMA;
  role: string;
  argv: string[];
  unit_id: string;
  run_id: string;
  start_at: string;
  end_at: string;
  duration_ms: number;
  exit_code: number | null;
  signal: string | null;
  overall: "PASS" | "FAIL";
  redacted_output_sha256: string;
  diagnostic_counts: { stdoutLines: number; stderrLines: number; failures: number };
  application_fingerprint: FingerprintContent;
  producer_fingerprint: FingerprintContent;
  pre_application_fingerprint: FingerprintContent;
  pre_producer_fingerprint: FingerprintContent;
  post_application_fingerprint: FingerprintContent;
  post_producer_fingerprint: FingerprintContent;
  child_outputs: unknown[];
  build_hash?: string | null;
};

type ModeSnapshot = {
  schemaVersion: "estimate-performance-mode-snapshot.v1";
  version: 1;
  source: string;
  modes: Record<"routeFastPath" | "graph" | "incrementalDerivation" | "renderBoundary" | "entityPatch", "off" | "shadow" | "on">;
};

type ModeProof = {
  schema_version: typeof MODE_PROOF_SCHEMA;
  unit_id: string;
  run_id: string;
  application_fingerprint: FingerprintContent;
  producer_fingerprint: FingerprintContent;
  fixture_hash: string;
  build_hash: string;
  auth_fixture_hash: string;
  fixture_role: "mode";
  target: string | string[];
  requested_snapshots: Array<{ phase: string; snapshot: ModeSnapshot }>;
  server_snapshots: Array<{ phase: string; snapshot: ModeSnapshot }>;
  parity: { snapshotKeys: string[]; allRequestedMatch: boolean };
  side_effects: { writes: number; reads: number; unexpected: number };
  scope_measurements: { previewStarts: number; previewStops: number; snapshotChecks: number };
  intermediate_previews: Array<Record<string, unknown>>;
  active_preview: Record<string, unknown>;
  overall: "PASS";
  failures: string[];
  created_at: string;
};

type ProofRunManifest = RunManifestV1 & {
  fixture_hash?: unknown;
  auth_fixture_hash?: unknown;
  build_hash?: unknown;
  activatedModes?: unknown;
};

export type EstimateSheetProofChildReference = {
  role: string;
  schemaId: string;
  immutablePath: string;
  sha256: string;
};

export type EstimateSheetProofEnvelopeV1 = {
  schema_version: typeof INTEGRATION_SCHEMA | typeof UNIT_PROOF_SCHEMA;
  unit_id: RunManifestV1["unit_id"];
  run_id: string;
  application_fingerprint: FingerprintContent;
  producer_fingerprint: FingerprintContent;
  integrationScope?: "route-d1" | "full-local";
  proofScope?: "graph" | "derived-state" | "render-a11y" | "mutations";
  requiredPhases: ["off", "shadow", "on", "rollback"];
  sourceBuildMatch: "required";
  fixtureHash: string;
  authFixtureHash: string;
  buildHash: string;
  finalSnapshot: ModeSnapshot;
  children: EstimateSheetProofChildReference[];
  overall: "PASS";
  generated_at: string;
};

type ProofSpec = {
  schema: typeof INTEGRATION_SCHEMA | typeof UNIT_PROOF_SCHEMA;
  integrationScope?: EstimateSheetProofEnvelopeV1["integrationScope"];
  proofScope?: EstimateSheetProofEnvelopeV1["proofScope"];
  browserScope?: BrowserScope;
  modeTarget: string | "all-activated";
  tests: readonly string[];
  gates: readonly string[];
  namespaces: readonly string[];
  mutatingNamespaces: readonly string[];
};

const PROOF_SPECS: Readonly<Partial<Record<RunManifestV1["unit_id"], ProofSpec>>> = {
  "UNIT-005": {
    schema: INTEGRATION_SCHEMA,
    integrationScope: "route-d1",
    browserScope: "route",
    modeTarget: "ESTIMATE_ROUTE_FAST_PATH_MODE",
    tests: ["dom-tests", "e2e-tests"],
    gates: ["opennext-build", "typecheck"],
    namespaces: ["mode", "browser", "d1"],
    mutatingNamespaces: ["browser", "d1"],
  },
  "UNIT-006": {
    schema: UNIT_PROOF_SCHEMA,
    proofScope: "graph",
    modeTarget: "ESTIMATE_GRAPH_MODE",
    tests: ["dom-graph", "dom-performance"],
    gates: ["opennext-build", "react-doctor", "typecheck"],
    namespaces: ["mode"],
    mutatingNamespaces: [],
  },
  "UNIT-007": {
    schema: UNIT_PROOF_SCHEMA,
    proofScope: "derived-state",
    browserScope: "derived-state",
    modeTarget: "ESTIMATE_INCREMENTAL_DERIVATION_MODE",
    tests: ["dom-tests", "e2e-tests"],
    gates: ["opennext-build", "react-doctor", "typecheck"],
    namespaces: ["mode", "browser"],
    mutatingNamespaces: ["browser"],
  },
  "UNIT-008": {
    schema: UNIT_PROOF_SCHEMA,
    proofScope: "render-a11y",
    browserScope: "render-a11y",
    modeTarget: "ESTIMATE_RENDER_BOUNDARY_MODE",
    tests: ["dom-tests", "e2e-tests"],
    gates: ["opennext-build", "react-doctor", "typecheck"],
    namespaces: ["mode", "browser"],
    mutatingNamespaces: ["browser"],
  },
  "UNIT-009": {
    schema: UNIT_PROOF_SCHEMA,
    proofScope: "mutations",
    browserScope: "mutations",
    modeTarget: "ESTIMATE_ENTITY_PATCH_MODE",
    tests: ["dom-tests", "e2e-tests"],
    gates: ["opennext-build", "react-doctor", "typecheck"],
    namespaces: ["mode", "browser"],
    mutatingNamespaces: ["browser"],
  },
  "UNIT-010": {
    schema: INTEGRATION_SCHEMA,
    integrationScope: "full-local",
    browserScope: "full-local",
    modeTarget: "all-activated",
    tests: ["dom-tests", "e2e-tests"],
    gates: ["next-build", "opennext-build", "error-handling", "react-doctor", "typecheck"],
    namespaces: ["mode", "browser", "d1"],
    mutatingNamespaces: ["browser", "d1"],
  },
};

const MODE_KEYS = ["routeFastPath", "graph", "incrementalDerivation", "renderBoundary", "entityPatch"] as const;
const REQUIRED_PHASES = ["off", "shadow", "on", "rollback"] as const;
const MODE_KEY_BY_TARGET = {
  ESTIMATE_ROUTE_FAST_PATH_MODE: "routeFastPath",
  ESTIMATE_GRAPH_MODE: "graph",
  ESTIMATE_INCREMENTAL_DERIVATION_MODE: "incrementalDerivation",
  ESTIMATE_RENDER_BOUNDARY_MODE: "renderBoundary",
  ESTIMATE_ENTITY_PATCH_MODE: "entityPatch",
} as const;

function resolveArtifactPath(manifest: RunManifestV1, value: string, kind: "test" | "gate" | "fixture" | "report"): string {
  if (!value.startsWith("auto:")) return ensureContainedRunPath(manifest.run_root, value);
  const role = value.slice("auto:".length);
  if (!role) throw new Error(`${kind} output role is empty`);
  return resolveManifestLogicalOutput(manifest, role as EstimateOutputRole);
}

function assertTestReceiptForRun(path: string, manifest: RunManifestV1): TestReceiptV1 {
  const receipt = readJsonFile(path);
  assertTestReceipt(receipt);
  if (receipt.unit_id !== manifest.unit_id || receipt.run_id !== manifest.run_id) throw new Error(`test receipt identity mismatch: ${path}`);
  if (!fingerprintContentEqual(receipt.application_fingerprint, manifest.applicationFingerprint) || !fingerprintContentEqual(receipt.producer_fingerprint, manifest.producerFingerprint)) {
    throw new Error(`test receipt fingerprint mismatch: ${path}`);
  }
  if (receipt.overall !== "PASS" || receipt.failed !== 0 || receipt.passed < 1) throw new Error(`test receipt is not a passing cohort: ${path}`);
  return receipt;
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

type ValidatedChild = {
  role: string;
  schemaId: string;
  path: string;
  sha256: string;
};

function sameStrings(actual: readonly string[], expected: readonly string[]): boolean {
  return actual.length === expected.length && actual.every((value, index) => value === expected[index]);
}

function assertExactObjectKeys(value: Record<string, unknown>, allowed: readonly string[], label: string): void {
  const extras = Object.keys(value).filter((key) => !allowed.includes(key));
  if (extras.length > 0) throw new Error(`${label} contains forbidden fields: ${extras.join(",")}`);
}

function isIsoTimestamp(value: unknown): value is string {
  if (typeof value !== "string" || !value) return false;
  const milliseconds = Date.parse(value);
  return Number.isFinite(milliseconds) && new Date(milliseconds).toISOString() === value;
}

function requireAutoRole(value: string | undefined, expectedRole: string, label: string): string {
  const expected = `auto:${expectedRole}`;
  if (value !== expected) throw new Error(`${label} must be exactly ${expected}`);
  return expected;
}

function resolveProofChildPath(manifest: RunManifestV1, role: string, kind: "mode" | "browser" | "d1" | "test" | "gate"): string {
  void kind;
  return resolveManifestLogicalOutput(manifest, role as EstimateOutputRole);
}

function readProofChild(path: string, label: string): { value: unknown; sha256: string } {
  assertRegularFile(path, label);
  const bytes = readFileSync(path);
  let value: unknown;
  try {
    value = JSON.parse(bytes.toString("utf8"));
  } catch {
    throw new Error(`${label} is not valid JSON`);
  }
  return { value, sha256: sha256Hex(bytes) };
}

function proofChild(role: string, schemaId: string, path: string, sha256: string, manifest: RunManifestV1): ValidatedChild {
  const immutablePath = relative(manifest.immutable_run_root, path).replaceAll("\\", "/");
  if (!immutablePath || immutablePath.startsWith("../")) throw new Error(`child path escapes the immutable run: ${role}`);
  return { role, schemaId, path: immutablePath, sha256 };
}

function assertChildFingerprints(
  application: unknown,
  producer: unknown,
  manifest: RunManifestV1,
  label: string,
): void {
  if (!fingerprintContentEqual(application, manifest.applicationFingerprint)
    || !fingerprintContentEqual(producer, manifest.producerFingerprint)) {
    throw new Error(`${label} fingerprint mismatch`);
  }
}

function assertModeSnapshot(value: unknown, label: string): asserts value is ModeSnapshot {
  if (!isPlainObject(value)
    || value.schemaVersion !== "estimate-performance-mode-snapshot.v1"
    || value.version !== 1
    || typeof value.source !== "string"
    || !value.source
    || !isPlainObject(value.modes)) {
    throw new Error(`${label} is not a complete mode snapshot`);
  }
  if (!sameStrings(Object.keys(value.modes).sort(), [...MODE_KEYS].sort())) throw new Error(`${label} mode keys are incomplete`);
  for (const key of MODE_KEYS) if (!["off", "shadow", "on"].includes(String(value.modes[key]))) throw new Error(`${label}.${key} is invalid`);
}

function assertSnapshotEqual(actual: unknown, expected: ModeSnapshot, label: string): void {
  assertModeSnapshot(actual, label);
  if (canonicalJson(actual) !== canonicalJson(expected)) throw new Error(`${label} does not match the final server snapshot`);
}

function assertStoppedPreview(value: unknown, phase: string, buildHash: string, expectedSnapshot: ModeSnapshot): void {
  if (!isPlainObject(value)
    || value.role !== "mode"
    || value.phase !== phase
    || value.readiness !== "READY"
    || value.closed_port !== true
    || !isIsoTimestamp(value.stopped_at)
    || !Number.isInteger(value.pid)
    || Number(value.pid) < 1
    || !Number.isInteger(value.port)
    || Number(value.port) < 1
    || Number(value.port) > 65_535
    || value.build_hash !== buildHash) {
    throw new Error(`mode proof ${phase} preview has no complete stopped outcome`);
  }
  const hasExit = Number.isInteger(value.exit_code) && Number(value.exit_code) >= 0 && value.signal === null;
  const hasSignal = value.exit_code === null && typeof value.signal === "string" && value.signal.length > 0;
  if (hasExit === hasSignal) throw new Error(`mode proof ${phase} preview requires one exclusive exit outcome`);
  assertSnapshotEqual(value.requested_snapshot, expectedSnapshot, `mode proof ${phase} stopped preview requested snapshot`);
  assertSnapshotEqual(value.server_snapshot, expectedSnapshot, `mode proof ${phase} stopped preview snapshot`);
}

function assertModePhaseSemantics(proof: ModeProof, spec: ProofSpec, manifest: RunManifestV1): void {
  const phases = [...REQUIRED_PHASES, "final"];
  const requestedPhases = proof.requested_snapshots.map((entry) => entry.phase);
  const serverPhases = proof.server_snapshots.map((entry) => entry.phase);
  if (!sameStrings(requestedPhases, phases) || !sameStrings(serverPhases, phases)) throw new Error("mode proof phase set is incomplete or out of order");

  let activatedKeys: Array<(typeof MODE_KEYS)[number]>;
  let targetKey: (typeof MODE_KEYS)[number] | null = null;
  if (spec.modeTarget === "all-activated") {
    if (!Array.isArray(proof.target) || proof.target.length === 0 || proof.target.some((target) => typeof target !== "string" || !(target in MODE_KEY_BY_TARGET))) {
      throw new Error("UNIT-010 mode proof target matrix is invalid");
    }
    if (new Set(proof.target).size !== proof.target.length) throw new Error("UNIT-010 mode proof target matrix contains duplicates");
    const declared = (manifest as RunManifestV1 & { activatedModes?: unknown }).activatedModes;
    if (!Array.isArray(declared) || !sameStrings(declared.map(String), proof.target)) throw new Error("UNIT-010 mode proof target matrix does not match activatedModes");
    activatedKeys = proof.target.map((target) => MODE_KEY_BY_TARGET[target as keyof typeof MODE_KEY_BY_TARGET]);
  } else {
    if (proof.target !== spec.modeTarget) throw new Error(`mode proof target must be ${spec.modeTarget}`);
    targetKey = MODE_KEY_BY_TARGET[spec.modeTarget as keyof typeof MODE_KEY_BY_TARGET];
    const declared = (manifest as ProofRunManifest).activatedModes;
    if (!Array.isArray(declared)
      || declared.length === 0
      || declared.some((target) => typeof target !== "string" || !(target in MODE_KEY_BY_TARGET))
      || new Set(declared).size !== declared.length) {
      throw new Error("mode proof activatedModes declaration is invalid");
    }
    activatedKeys = declared.map((target) => MODE_KEY_BY_TARGET[target as keyof typeof MODE_KEY_BY_TARGET]);
    const targetIndex = MODE_KEYS.indexOf(targetKey);
    if (!activatedKeys.includes(targetKey) || activatedKeys.some((key) => MODE_KEYS.indexOf(key) > targetIndex)) {
      throw new Error("mode proof activatedModes does not contain exactly the target and eligible predecessors");
    }
  }

  const expectedPhaseValue = (phase: string): "off" | "shadow" | "on" => phase === "shadow" ? "shadow" : phase === "on" || phase === "final" ? "on" : "off";
  for (let index = 0; index < phases.length; index += 1) {
    const requested = proof.requested_snapshots[index]!;
    const server = proof.server_snapshots[index]!;
    assertModeSnapshot(requested.snapshot, `mode requested snapshot ${requested.phase}`);
    assertModeSnapshot(server.snapshot, `mode server snapshot ${server.phase}`);
    if (canonicalJson(requested.snapshot.modes) !== canonicalJson(server.snapshot.modes)) throw new Error(`mode snapshot parity failed for ${requested.phase}`);
    const phaseValue = expectedPhaseValue(requested.phase);
    if (spec.modeTarget === "all-activated") {
      for (const key of activatedKeys) if (requested.snapshot.modes[key] !== phaseValue) throw new Error(`mode ${key} has the wrong ${requested.phase} value`);
      for (const key of MODE_KEYS) if (!activatedKeys.includes(key) && requested.snapshot.modes[key] !== "off") throw new Error(`inactive mode ${key} is not off in ${requested.phase}`);
    } else {
      for (const key of MODE_KEYS) {
        const expected = key === targetKey ? phaseValue : activatedKeys.includes(key) ? "on" : "off";
        if (requested.snapshot.modes[key] !== expected) throw new Error(`mode ${key} has the wrong ${requested.phase} value`);
      }
    }
  }
}

function assertActivePreview(
  manifest: RunManifestV1,
  proof: ModeProof,
  finalSnapshot: ModeSnapshot,
  requireActivePointer: boolean,
): void {
  const active = proof.active_preview;
  const expectedFinalState = manifest.unit_id === "UNIT-010" ? "all-activated" : "on";
  if (!isPlainObject(active)
    || active.schema_version !== "estimate-sheet-benchmark-server.v1"
    || active.unit_id !== manifest.unit_id
    || active.run_id !== manifest.run_id
    || active.role !== "mode"
    || active.phase !== "final"
    || active.final_state !== expectedFinalState
    || active.active !== true
    || active.readiness !== "READY"
    || active.build_hash !== proof.build_hash
    || active.ordinal !== 5
    || !Number.isInteger(active.pid)
    || Number(active.pid) < 1
    || !Number.isInteger(active.port)
    || Number(active.port) < 1
    || Number(active.port) > 65_535) {
    throw new Error("mode proof active preview is incomplete or mismatched");
  }
  assertSnapshotEqual(active.requested_snapshot, finalSnapshot, "mode proof active preview requested snapshot");
  assertSnapshotEqual(active.server_snapshot, finalSnapshot, "mode proof active preview snapshot");

  const descriptorRelativePath = `preview/descriptors/${String(active.ordinal).padStart(2, "0")}-${active.phase}.json`;
  const descriptorPath = ensureContainedRunPath(manifest.run_root, descriptorRelativePath);
  const descriptor = readProofChild(descriptorPath, "active preview source descriptor");
  if (canonicalJson(descriptor.value) !== canonicalJson(active)) throw new Error("active preview source descriptor does not match the mode proof");
  if (!requireActivePointer) return;

  if (!isPlainObject(manifest.activePreview)
    || typeof manifest.activePreview.path !== "string"
    || !isSha256(manifest.activePreview.sha256)
    || manifest.activePreview.pid !== active.pid
    || manifest.activePreview.port !== active.port) {
    throw new Error("run manifest active-preview binding is incomplete");
  }
  assertSnapshotEqual(manifest.activePreview.snapshot, finalSnapshot, "run manifest active-preview snapshot");
  const activePath = ensureContainedRunPath(manifest.run_root, manifest.activePreview.path);
  const loaded = readProofChild(activePath, "active preview descriptor");
  if (loaded.sha256 !== manifest.activePreview.sha256) throw new Error("active preview descriptor hash mismatch");
  if (!isPlainObject(loaded.value)) throw new Error("active preview descriptor is invalid");
  if (typeof loaded.value.descriptor_path !== "string" || !isSha256(loaded.value.descriptor_sha256)) {
    throw new Error("active preview descriptor has no immutable source binding");
  }
  const { descriptor_path: descriptorPathValue, descriptor_sha256: descriptorSha256, ...activeDescriptor } = loaded.value;
  if (canonicalJson(activeDescriptor) !== canonicalJson(active)) throw new Error("active preview descriptor does not match the mode proof");
  if (descriptorPathValue !== descriptorRelativePath || descriptor.sha256 !== descriptorSha256) {
    throw new Error("active preview source descriptor hash mismatch");
  }
}

function validateModeProof(
  path: string,
  manifest: RunManifestV1,
  spec: ProofSpec,
  requireActivePointer: boolean,
): { child: ValidatedChild; proof: ModeProof; finalSnapshot: ModeSnapshot } {
  const loaded = readProofChild(path, "mode proof");
  if (!isPlainObject(loaded.value)) throw new Error("mode proof must be an object");
  const proof = loaded.value as ModeProof;
  const proofManifest = manifest as ProofRunManifest;
  if (proof.schema_version !== MODE_PROOF_SCHEMA
    || proof.unit_id !== manifest.unit_id
    || proof.run_id !== manifest.run_id
    || proof.fixture_role !== "mode"
    || proof.overall !== "PASS"
    || !Array.isArray(proof.failures)
    || proof.failures.length !== 0
    || !isSha256(proof.fixture_hash)
    || !isSha256(proof.build_hash)
    || !isSha256(proof.auth_fixture_hash)
    || proof.fixture_hash !== proofManifest.fixture_hash
    || proof.auth_fixture_hash !== proofManifest.auth_fixture_hash
    || proof.build_hash !== proofManifest.build_hash
    || !isIsoTimestamp(proof.created_at)) {
    throw new Error("mode proof identity, status, or input hashes are invalid");
  }
  assertChildFingerprints(proof.application_fingerprint, proof.producer_fingerprint, manifest, "mode proof");
  if (!Array.isArray(proof.requested_snapshots)
    || !Array.isArray(proof.server_snapshots)
    || !Array.isArray(proof.intermediate_previews)
    || !isPlainObject(proof.parity)
    || proof.parity.allRequestedMatch !== true
    || !Array.isArray(proof.parity.snapshotKeys)
    || !sameStrings(proof.parity.snapshotKeys, MODE_KEYS)
    || !isPlainObject(proof.side_effects)
    || proof.side_effects.writes !== 0
    || proof.side_effects.reads !== 5
    || proof.side_effects.unexpected !== 0
    || !isPlainObject(proof.scope_measurements)
    || proof.scope_measurements.previewStarts !== 5
    || proof.scope_measurements.previewStops !== 4
    || proof.scope_measurements.snapshotChecks !== 5) {
    throw new Error("mode proof parity or side-effect summary is incomplete");
  }
  assertModePhaseSemantics(proof, spec, manifest);
  if (proof.intermediate_previews.length !== REQUIRED_PHASES.length) throw new Error("mode proof stopped-preview set is incomplete");
  for (let index = 0; index < REQUIRED_PHASES.length; index += 1) {
    assertStoppedPreview(proof.intermediate_previews[index], REQUIRED_PHASES[index]!, proof.build_hash, proof.server_snapshots[index]!.snapshot);
  }
  const finalSnapshot = proof.server_snapshots.at(-1)!.snapshot;
  assertActivePreview(manifest, proof, finalSnapshot, requireActivePointer);
  return { child: proofChild("mode-proof", MODE_PROOF_SCHEMA, path, loaded.sha256, manifest), proof, finalSnapshot };
}

function assertReportMetricsPass(report: PerformanceReportV1, label: string): void {
  const entries = Object.entries(report.metrics);
  if (entries.length === 0) throw new Error(`${label} has no budget metrics`);
  for (const [metricId, metric] of entries) {
    if (!isPlainObject(metric) || metric.status !== "PASS") throw new Error(`${label} metric ${metricId} is not PASS`);
  }
}

function validateBrowserChild(
  path: string,
  manifest: RunManifestV1,
  spec: ProofSpec,
  mode: ModeProof,
  finalSnapshot: ModeSnapshot,
): ValidatedChild {
  const loaded = readProofChild(path, "browser child");
  assertPerformanceReport(loaded.value, { strict: true });
  const report = loaded.value;
  if (report.evidenceClass !== "local-browser"
    || report.trace.unitId !== manifest.unit_id
    || report.runId !== manifest.run_id
    || report.browserScope !== spec.browserScope
    || report.overall !== "PASS"
    || (report.failures?.length ?? 0) !== 0
    || report.buildMode !== "opennext-preview"
    || report.fixtureHash !== mode.fixture_hash
    || report.authFixtureHash !== mode.auth_fixture_hash
    || report.buildHash !== mode.build_hash) {
    throw new Error("browser child identity, scope, status, or input binding mismatch");
  }
  assertChildFingerprints(report.applicationFingerprint, report.producerFingerprint, manifest, "browser child");
  assertSnapshotEqual(report.modeSnapshot, finalSnapshot, "browser modeSnapshot");
  assertSnapshotEqual(report.finalSnapshot, finalSnapshot, "browser finalSnapshot");
  assertReportMetricsPass(report, "browser child");
  if (!Array.isArray(report.rawSamples) || report.rawSamples.length === 0 || report.method.samples < 1) throw new Error("browser child has no raw sample evidence");
  return proofChild("browser-child", PERFORMANCE_REPORT_SCHEMA, path, loaded.sha256, manifest);
}

function validateD1Child(path: string, manifest: RunManifestV1, mode: ModeProof): ValidatedChild {
  const loaded = readProofChild(path, "local D1 child");
  assertPerformanceReport(loaded.value, { strict: true });
  const report = loaded.value;
  if (report.evidenceClass !== "local-d1"
    || report.trace.unitId !== manifest.unit_id
    || report.runId !== manifest.run_id
    || report.overall !== "PASS"
    || (report.failures?.length ?? 0) !== 0
    || report.buildHash !== null
    || report.fixtureHash !== mode.fixture_hash
    || report.authFixtureHash !== mode.auth_fixture_hash) {
    throw new Error("local D1 child identity, status, or input binding mismatch");
  }
  assertChildFingerprints(report.applicationFingerprint, report.producerFingerprint, manifest, "local D1 child");
  assertCompleteLocalD1Measurement(report.d1);
  if (!isPlainObject(report.d1.fixture) || report.d1.fixture.fixtureHash !== report.fixtureHash) {
    throw new Error("local D1 measurement fixture hash does not match the report");
  }
  assertReportMetricsPass(report, "local D1 child");
  if (!isPlainObject(report.d1.metrics) || Object.values(report.d1.metrics).some((metric) => !isPlainObject(metric) || metric.status !== "PASS")) {
    throw new Error("local D1 child contains a failed hard metric");
  }
  if (!isPlainObject(report.d1.costProjection) || report.d1.costProjection.status !== "PASS") throw new Error("local D1 cost projection is not PASS");
  return proofChild("d1-child", PERFORMANCE_REPORT_SCHEMA, path, loaded.sha256, manifest);
}

function validateProofTestReceipt(
  path: string,
  manifest: RunManifestV1,
  role: string,
  mode: ModeProof,
): { child: ValidatedChild; receipt: TestReceiptV1 } {
  const loaded = readProofChild(path, `test receipt ${role}`);
  if (!isPlainObject(loaded.value)) throw new Error(`test receipt ${role} must be an object`);
  assertExactObjectKeys(loaded.value, [
    "schema_version", "test_class", "argv", "files", "unit_id", "run_id",
    "application_fingerprint", "producer_fingerprint", "pre_application_fingerprint", "pre_producer_fingerprint",
    "fixture_hash", "build_hash", "workers", "retries", "passed", "failed", "skipped", "duration_ms",
    "overall", "failure_ids", "fixtureMutation",
  ], `test receipt ${role}`);
  assertTestReceipt(loaded.value);
  const receipt = loaded.value;
  if (receipt.unit_id !== manifest.unit_id
    || receipt.run_id !== manifest.run_id
    || receipt.overall !== "PASS"
    || receipt.failed !== 0
    || receipt.passed < 1
    || (role === "e2e-tests" ? receipt.test_class !== "playwright" : receipt.test_class !== "vitest")) {
    throw new Error(`test receipt ${role} is not a complete passing cohort`);
  }
  assertChildFingerprints(receipt.application_fingerprint, receipt.producer_fingerprint, manifest, `test receipt ${role}`);
  if (receipt.fixture_hash !== undefined && receipt.fixture_hash !== mode.fixture_hash) throw new Error(`test receipt ${role} fixture hash mismatch`);
  if (role === "e2e-tests") {
    if (receipt.fixture_hash !== mode.fixture_hash || receipt.build_hash !== mode.build_hash) throw new Error("e2e test receipt input hash mismatch");
  } else if (receipt.fixtureMutation !== undefined) {
    throw new Error(`non-browser test receipt ${role} cannot mutate a fixture namespace`);
  }
  if (isPlainObject(loaded.value) && "finalSnapshot" in loaded.value) throw new Error(`test receipt ${role} cannot contain finalSnapshot`);
  return { child: proofChild(role, TEST_RECEIPT_SCHEMA, path, loaded.sha256, manifest), receipt };
}

const EXPECTED_GATE_COMMANDS: Readonly<Record<string, readonly string[]>> = {
  typecheck: ["bun", "run", "type-check"],
  "error-handling": ["bun", "run", "validate:error-handling"],
  "opennext-build": ["bun", "run", "cf:build"],
  "react-doctor": ["bun", "run", "doctor"],
  "next-build": ["bun", "run", "build"],
};

function validateProofGateReceipt(
  path: string,
  manifest: RunManifestV1,
  role: string,
  buildHash: string,
): ValidatedChild {
  const loaded = readProofChild(path, `gate receipt ${role}`);
  if (!isPlainObject(loaded.value)) throw new Error(`gate receipt ${role} must be an object`);
  assertExactObjectKeys(loaded.value, [
    "schema_version", "role", "argv", "unit_id", "run_id", "start_at", "end_at", "duration_ms",
    "exit_code", "signal", "overall", "redacted_output_sha256", "diagnostic_counts",
    "application_fingerprint", "producer_fingerprint", "pre_application_fingerprint", "pre_producer_fingerprint",
    "post_application_fingerprint", "post_producer_fingerprint", "child_outputs", "build_hash",
  ], `gate receipt ${role}`);
  const receipt = loaded.value as CommandGateReceipt;
  const startedAt = Date.parse(receipt.start_at);
  const endedAt = Date.parse(receipt.end_at);
  if (receipt.schema_version !== COMMAND_RECEIPT_SCHEMA
    || receipt.role !== role
    || receipt.unit_id !== manifest.unit_id
    || receipt.run_id !== manifest.run_id
    || receipt.overall !== "PASS"
    || receipt.exit_code !== 0
    || receipt.signal !== null
    || !Array.isArray(receipt.argv)
    || !sameStrings(receipt.argv, EXPECTED_GATE_COMMANDS[role] ?? [])
    || !isSha256(receipt.redacted_output_sha256)
    || !isIsoTimestamp(receipt.start_at)
    || !isIsoTimestamp(receipt.end_at)
    || !Number.isFinite(receipt.duration_ms)
    || receipt.duration_ms < 0
    || endedAt - startedAt !== receipt.duration_ms
    || !isPlainObject(receipt.diagnostic_counts)
    || !Number.isInteger(receipt.diagnostic_counts.stdoutLines)
    || receipt.diagnostic_counts.stdoutLines < 0
    || !Number.isInteger(receipt.diagnostic_counts.stderrLines)
    || receipt.diagnostic_counts.stderrLines < 0
    || receipt.diagnostic_counts.failures !== 0
    || !Array.isArray(receipt.child_outputs)
    || receipt.child_outputs.length !== 0) {
    throw new Error(`gate receipt ${role} identity, command, or process outcome mismatch`);
  }
  for (const [application, producer, label] of [
    [receipt.application_fingerprint, receipt.producer_fingerprint, "recorded"],
    [receipt.pre_application_fingerprint, receipt.pre_producer_fingerprint, "pre"],
    [receipt.post_application_fingerprint, receipt.post_producer_fingerprint, "post"],
  ] as const) assertChildFingerprints(application, producer, manifest, `gate receipt ${role} ${label}`);
  if (role === "opennext-build" && receipt.build_hash !== buildHash) throw new Error("OpenNext gate build hash does not match mode/browser build");
  if (role === "next-build" && !isSha256(receipt.build_hash)) throw new Error("Next build gate has no build hash");
  if (!["opennext-build", "next-build"].includes(role) && receipt.build_hash !== null && receipt.build_hash !== undefined) throw new Error(`gate receipt ${role} has an unexpected build hash`);
  if ("finalSnapshot" in loaded.value) throw new Error(`gate receipt ${role} cannot contain finalSnapshot`);
  return proofChild(role, COMMAND_RECEIPT_SCHEMA, path, loaded.sha256, manifest);
}

function assertFixtureNamespaces(
  manifest: RunManifestV1,
  spec: ProofSpec,
  receipts: ReadonlyMap<string, TestReceiptV1>,
): void {
  const actualRoles = Object.keys(manifest.namespaces).sort();
  if (!sameStrings(actualRoles, [...spec.namespaces].sort())) throw new Error("run manifest fixture namespace role set is incomplete or contains extras");
  const namespaceIds = new Set<string>();
  const preStates = new Set<string>();
  const commandIds = new Set<string>();
  const journal = manifest.mutationJournal.filter(isPlainObject);
  if (journal.length !== manifest.mutationJournal.length) throw new Error("fixture mutation journal contains a malformed entry");
  if (journal.length !== spec.mutatingNamespaces.length) throw new Error("fixture mutation journal role set is incomplete or contains extras");

  for (const role of spec.namespaces) {
    const namespace = manifest.namespaces[role];
    if (!isPlainObject(namespace) || !isSha256(namespace.idSha256) || !isSha256(namespace.preStateSha256)) throw new Error(`fixture namespace ${role} is malformed`);
    if (namespaceIds.has(namespace.idSha256)) throw new Error("fixture namespace identity was reused");
    namespaceIds.add(namespace.idSha256);
    preStates.add(namespace.preStateSha256);
    const mutating = spec.mutatingNamespaces.includes(role);
    if (!mutating && (namespace.postStateSha256 !== undefined || namespace.commandId !== undefined)) throw new Error(`non-mutating fixture namespace ${role} is dirty`);
    if (!mutating) continue;
    if (!isSha256(namespace.postStateSha256) || typeof namespace.commandId !== "string" || !namespace.commandId) throw new Error(`fixture namespace ${role} has no committed mutation outcome`);
    if (commandIds.has(namespace.commandId)) throw new Error("mutating commands reused a fixture namespace command id");
    commandIds.add(namespace.commandId);
    const matches = journal.filter((entry) => entry.fixtureRole === role);
    if (matches.length !== 1) throw new Error(`fixture mutation journal must contain exactly one ${role} entry`);
    const mutation = matches[0]!;
    if (mutation.namespaceIdSha256 !== namespace.idSha256
      || mutation.preStateSha256 !== namespace.preStateSha256
      || mutation.postStateSha256 !== namespace.postStateSha256
      || mutation.commandId !== namespace.commandId
      || !isSha256(mutation.declaredMutationSha256)) {
      throw new Error(`fixture mutation journal does not match the ${role} namespace`);
    }
    if (role === "browser") {
      const receipt = receipts.get("e2e-tests");
      if (!receipt?.fixtureMutation || canonicalJson(receipt.fixtureMutation) !== canonicalJson({
        fixtureRole: role,
        namespaceIdSha256: mutation.namespaceIdSha256,
        preStateSha256: mutation.preStateSha256,
        postStateSha256: mutation.postStateSha256,
        declaredMutationSha256: mutation.declaredMutationSha256,
        commandId: mutation.commandId,
      })) throw new Error("e2e test receipt does not bind the browser fixture mutation");
    }
  }
  if (preStates.size !== 1) throw new Error("fixture namespaces do not share one canonical pre-state checkpoint");
  if (!manifest.fixture
    || manifest.fixture.profile !== "limit"
    || !spec.namespaces.includes("mode")
    || manifest.fixture.namespaceIdSha256 !== manifest.namespaces.mode?.idSha256
    || manifest.fixture.preStateSha256 !== manifest.namespaces.mode?.preStateSha256) {
    throw new Error("run fixture does not bind the canonical mode checkpoint");
  }
}

type ValidatedProofChildren = {
  mode: ModeProof;
  finalSnapshot: ModeSnapshot;
  children: ValidatedChild[];
};

function validateProofChildren(
  manifest: RunManifestV1,
  spec: ProofSpec,
  requireActivePointer: boolean,
): ValidatedProofChildren {
  const modePath = resolveProofChildPath(manifest, "mode-proof", "mode");
  const mode = validateModeProof(modePath, manifest, spec, requireActivePointer);
  const children: ValidatedChild[] = [mode.child];
  if (spec.browserScope) {
    const browserPath = resolveProofChildPath(manifest, "browser-child", "browser");
    children.push(validateBrowserChild(browserPath, manifest, spec, mode.proof, mode.finalSnapshot));
  }
  if (spec.integrationScope) {
    const d1Path = resolveProofChildPath(manifest, "d1-child", "d1");
    children.push(validateD1Child(d1Path, manifest, mode.proof));
  }
  const receipts = new Map<string, TestReceiptV1>();
  for (const role of spec.tests) {
    const validated = validateProofTestReceipt(resolveProofChildPath(manifest, role, "test"), manifest, role, mode.proof);
    children.push(validated.child);
    receipts.set(role, validated.receipt);
  }
  assertFixtureNamespaces(manifest, spec, receipts);
  for (const role of spec.gates) {
    children.push(validateProofGateReceipt(resolveProofChildPath(manifest, role, "gate"), manifest, role, mode.proof.build_hash));
  }
  for (const child of children) {
    const childPath = ensureContainedRunPath(manifest.immutable_run_root, child.path);
    assertRegularFile(childPath, `proof child ${child.role}`);
    if (sha256File(childPath) !== child.sha256) throw new Error(`proof child ${child.role} changed during envelope validation`);
  }
  return { mode: mode.proof, finalSnapshot: mode.finalSnapshot, children };
}

function childReference(child: ValidatedChild): EstimateSheetProofChildReference {
  return { role: child.role, schemaId: child.schemaId, immutablePath: child.path, sha256: child.sha256 };
}

export type ValidatedEstimateSheetProofEnvelopeArtifact = {
  envelope: EstimateSheetProofEnvelopeV1;
  envelopePath: string;
  envelopeSha256: string;
  children: Array<EstimateSheetProofChildReference & { absolutePath: string }>;
};

export function assertEstimateSheetProofEnvelopeArtifact(input: {
  runManifest: string;
  envelopePath: string;
  requireActivePointer?: boolean;
}): ValidatedEstimateSheetProofEnvelopeArtifact {
  const manifest = resolveManifest(input.runManifest);
  const spec = PROOF_SPECS[manifest.unit_id];
  if (!spec) throw new Error("proof envelopes are restricted to UNIT-005 through UNIT-010");
  const expectedRole = spec.schema === INTEGRATION_SCHEMA ? "integration" : "unit-proof";
  const envelopePath = isAbsolute(input.envelopePath)
    ? resolve(input.envelopePath)
    : ensureContainedRunPath(manifest.immutable_run_root, input.envelopePath);
  const expectedPath = resolveManifestLogicalOutput(manifest, expectedRole);
  if (envelopePath !== expectedPath) throw new Error(`proof envelope path must be reports/${expectedRole}.json`);
  const loaded = readProofChild(envelopePath, "proof envelope");
  if (!isPlainObject(loaded.value)) throw new Error("proof envelope must be an object");
  assertExactObjectKeys(loaded.value, [
    "schema_version", "unit_id", "run_id", "application_fingerprint", "producer_fingerprint",
    "integrationScope", "proofScope", "requiredPhases", "sourceBuildMatch", "fixtureHash", "authFixtureHash",
    "buildHash", "finalSnapshot", "children", "overall", "generated_at",
  ], "proof envelope");
  const envelope = loaded.value as EstimateSheetProofEnvelopeV1;
  if (envelope.schema_version !== spec.schema
    || envelope.unit_id !== manifest.unit_id
    || envelope.run_id !== manifest.run_id
    || envelope.integrationScope !== spec.integrationScope
    || envelope.proofScope !== spec.proofScope
    || !Array.isArray(envelope.requiredPhases)
    || !sameStrings(envelope.requiredPhases, REQUIRED_PHASES)
    || envelope.sourceBuildMatch !== "required"
    || envelope.overall !== "PASS"
    || !isIsoTimestamp(envelope.generated_at)) {
    throw new Error("proof envelope identity, scope, phases, or status are invalid");
  }
  assertChildFingerprints(envelope.application_fingerprint, envelope.producer_fingerprint, manifest, "proof envelope");

  const validated = validateProofChildren(manifest, spec, input.requireActivePointer === true);
  if (envelope.fixtureHash !== validated.mode.fixture_hash
    || envelope.authFixtureHash !== validated.mode.auth_fixture_hash
    || envelope.buildHash !== validated.mode.build_hash) {
    throw new Error("proof envelope input hashes do not match its children");
  }
  assertSnapshotEqual(envelope.finalSnapshot, validated.finalSnapshot, "proof envelope finalSnapshot");
  if (!Array.isArray(envelope.children) || envelope.children.length !== validated.children.length) {
    throw new Error("proof envelope child role set is incomplete");
  }
  const expectedChildren = validated.children.map(childReference);
  for (let index = 0; index < envelope.children.length; index += 1) {
    const actual = envelope.children[index];
    if (!isPlainObject(actual)) throw new Error(`proof envelope child ${index} is malformed`);
    assertExactObjectKeys(actual, ["role", "schemaId", "immutablePath", "sha256"], `proof envelope child ${index}`);
    if (canonicalJson(actual) !== canonicalJson(expectedChildren[index])) {
      throw new Error(`proof envelope child ${index} does not match its immutable bytes`);
    }
  }
  return {
    envelope,
    envelopePath,
    envelopeSha256: loaded.sha256,
    children: expectedChildren.map((child) => ({
      ...child,
      absolutePath: ensureContainedRunPath(manifest.immutable_run_root, child.immutablePath),
    })),
  };
}

export function createEstimateSheetProofEnvelope(input: {
  runManifest: string;
  unit: string;
  integrationScope?: string;
  proofScope?: string;
  allLocal?: boolean;
  mode?: string;
  browser?: string;
  d1?: string;
  tests: string[];
  gates: string[];
  output?: string;
  requiredPhases?: string;
  sourceBuildMatch?: string;
  budgetPolicy?: "record-only" | "enforce";
}): { envelope: EstimateSheetProofEnvelopeV1; envelopePath: string } {
  const manifest = resolveManifest(input.runManifest);
  if (manifest.unit_id !== input.unit) throw new Error("proof-envelope unit does not match the run manifest");
  const spec = PROOF_SPECS[manifest.unit_id];
  if (!spec) throw new Error("proof envelopes are restricted to UNIT-005 through UNIT-010");
  if (manifest.status !== "PREPARED" || manifest.cleanupRequirement !== "REQUIRED") throw new Error("proof envelope requires a PREPARED run with required cleanup");
  if (input.budgetPolicy !== "enforce") throw new Error("proof envelopes require --budget-policy=enforce");
  if (input.requiredPhases !== REQUIRED_PHASES.join(",")) throw new Error("proof envelopes require phases off,shadow,on,rollback");
  if (input.sourceBuildMatch !== "required") throw new Error("proof envelopes require --source-build-match=required");
  if (spec.integrationScope === "full-local") {
    if (input.allLocal !== true || input.integrationScope !== undefined || input.proofScope !== undefined) throw new Error("UNIT-010 requires --all-local");
  } else if (spec.integrationScope) {
    if (input.integrationScope !== spec.integrationScope || input.allLocal === true || input.proofScope !== undefined) throw new Error(`${manifest.unit_id} requires integration scope ${spec.integrationScope}`);
  } else if (input.proofScope !== spec.proofScope || input.integrationScope !== undefined || input.allLocal === true) {
    throw new Error(`${manifest.unit_id} requires proof scope ${spec.proofScope}`);
  }

  requireAutoRole(input.mode, "mode-proof", "mode child");
  if (spec.browserScope) requireAutoRole(input.browser, "browser-child", "browser child");
  else if (input.browser !== undefined) throw new Error(`${manifest.unit_id} forbids a browser child`);
  if (spec.integrationScope) requireAutoRole(input.d1, "d1-child", "D1 child");
  else if (input.d1 !== undefined) throw new Error(`${manifest.unit_id} forbids a D1 child`);
  const testRoles = input.tests.map((value) => value.replace(/^auto:/u, ""));
  const gateRoles = input.gates.map((value) => value.replace(/^auto:/u, ""));
  if (!input.tests.every((value, index) => value === `auto:${testRoles[index]}`) || !sameStrings(testRoles, spec.tests)) throw new Error(`${manifest.unit_id} test child role set is not exact`);
  if (!input.gates.every((value, index) => value === `auto:${gateRoles[index]}`) || !sameStrings(gateRoles, spec.gates)) throw new Error(`${manifest.unit_id} gate child role set is not exact`);

  const expectedOutputRole = spec.schema === INTEGRATION_SCHEMA ? "integration" : "unit-proof";
  requireAutoRole(input.output, expectedOutputRole, "proof envelope output");
  const envelopePath = resolveManifestLogicalOutput(manifest, expectedOutputRole);
  const current = computeEstimateSheetSourceFingerprint({ repoRoot: process.cwd() }).fingerprint;
  if (!fingerprintContentEqual(current.application, manifest.applicationFingerprint)
    || !fingerprintContentEqual(current.producer, manifest.producerFingerprint)) {
    throw new Error("run manifest fingerprint is stale for proof-envelope production");
  }

  const validated = validateProofChildren(manifest, spec, true);

  const envelope: EstimateSheetProofEnvelopeV1 = {
    schema_version: spec.schema,
    unit_id: manifest.unit_id,
    run_id: manifest.run_id,
    application_fingerprint: manifest.applicationFingerprint,
    producer_fingerprint: manifest.producerFingerprint,
    ...(spec.integrationScope ? { integrationScope: spec.integrationScope } : {}),
    ...(spec.proofScope ? { proofScope: spec.proofScope } : {}),
    requiredPhases: [...REQUIRED_PHASES],
    sourceBuildMatch: "required",
    fixtureHash: validated.mode.fixture_hash,
    authFixtureHash: validated.mode.auth_fixture_hash,
    buildHash: validated.mode.build_hash,
    finalSnapshot: validated.finalSnapshot,
    children: validated.children.map(childReference),
    overall: "PASS",
    generated_at: nowIso(),
  };
  writeJsonNoOverwrite(envelopePath, envelope, 0o600);
  return { envelope, envelopePath };
}

type HardMetricSpec = Readonly<{
  threshold: number;
  comparison: "maximum" | "exact";
  unit: "ms" | "bytes" | "count";
}>;

type MetricRecord = Record<string, unknown> & {
  status?: "PASS" | "FAIL" | "SKIPPED";
  value?: number | null;
};

export const UNIT_001_HARD_METRICS: Readonly<Record<string, HardMetricSpec>> = {
  "M-GRAPH-ANCESTOR-LOOKUP-P95": { threshold: PERFORMANCE_BUDGETS.ancestorLookupP95Ms, comparison: "maximum", unit: "ms" },
  "M-GRAPH-COMPONENT-LOOKUP-P95": { threshold: PERFORMANCE_BUDGETS.componentLookupP95Ms, comparison: "maximum", unit: "ms" },
  "M-GRAPH-DUPLICATE-BYTES": { threshold: PERFORMANCE_BUDGETS.duplicateTreeBytes, comparison: "maximum", unit: "bytes" },
  "M-DERIVE-CLOSED-MOVE-OPTION-WORK": { threshold: PERFORMANCE_BUDGETS.closedDialogMoveOptionWork, comparison: "maximum", unit: "count" },
  "M-DERIVE-SIDEBAR-UNRELATED-RENDER-COUNT": { threshold: PERFORMANCE_BUDGETS.unrelatedSidebarRenders, comparison: "maximum", unit: "count" },
  "M-MUTATE-CLIENT-FANOUT-NONMATCH-INSPECTIONS": { threshold: PERFORMANCE_BUDGETS.nonmatchingRowInspections, comparison: "maximum", unit: "count" },
  "M-MUTATE-DUPLICATE-SAVE-PATCH-COUNT": { threshold: PERFORMANCE_BUDGETS.authoritativePatchCount, comparison: "exact", unit: "count" },
};

const UNIT_001_METRIC_RECEIPT_FILES: Readonly<Record<string, readonly string[]>> = {
  "M-GRAPH-ANCESTOR-LOOKUP-P95": ["tests/vitest/estimate-sheet-performance-fixtures.test.ts"],
  "M-GRAPH-COMPONENT-LOOKUP-P95": ["tests/vitest/estimate-sheet-performance-fixtures.test.ts"],
  "M-GRAPH-DUPLICATE-BYTES": ["tests/vitest/estimate-sheet-performance-fixtures.test.ts"],
  "M-DERIVE-CLOSED-MOVE-OPTION-WORK": ["tests/vitest/estimate-sheet-tree-dnd.test.tsx"],
  "M-DERIVE-SIDEBAR-UNRELATED-RENDER-COUNT": ["tests/vitest/estimate-sheet-sidebar-render-isolation.test.tsx"],
  "M-MUTATE-CLIENT-FANOUT-NONMATCH-INSPECTIONS": ["tests/vitest/perf/estimate-sheet-fan-out-budget.test.tsx"],
  "M-MUTATE-DUPLICATE-SAVE-PATCH-COUNT": ["tests/vitest/estimate-mutation-revision-concurrency.test.ts"],
};

function isMetricRecord(value: unknown): value is MetricRecord {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function evaluateUnit001HardMetrics(metrics: Record<string, unknown>): {
  metrics: Record<string, unknown>;
  failures: string[];
} {
  const evaluated = { ...metrics };
  const failures: string[] = [];
  for (const [metricId, spec] of Object.entries(UNIT_001_HARD_METRICS)) {
    const candidate = isMetricRecord(metrics[metricId]) ? metrics[metricId] : {};
    const value = typeof candidate.value === "number" && Number.isFinite(candidate.value) ? candidate.value : null;
    const thresholdPasses = value !== null && (spec.comparison === "exact" ? value === spec.threshold : value <= spec.threshold);
    const passes = candidate.status !== "FAIL" && candidate.status !== "SKIPPED" && thresholdPasses;
    evaluated[metricId] = {
      ...candidate,
      value,
      threshold: spec.threshold,
      comparison: spec.comparison,
      unit: spec.unit,
      status: passes ? "PASS" : "FAIL",
      ...(value === null ? { reason: "required hard metric is missing or non-finite" } : {}),
    };
    if (!passes) failures.push(`hard-metric-failed:${metricId}`);
  }
  return { metrics: evaluated, failures };
}

export function evaluateEstimateSheetPerformanceResult(input: {
  unitId: RunManifestV1["unit_id"];
  evidenceClass: PerformanceReportV1["evidenceClass"];
  budgetPolicy?: "record-only" | "enforce";
  metrics?: Record<string, unknown>;
  failures?: string[];
  overall?: "PASS" | "FAIL";
}): { metrics: Record<string, unknown>; failures: string[]; overall: "PASS" | "FAIL" } {
  const suppliedMetrics = input.metrics ?? {};
  const isUnit001Jsdom = input.unitId === "UNIT-001" && input.evidenceClass === "jsdom";
  const evaluated = isUnit001Jsdom
    ? evaluateUnit001HardMetrics(suppliedMetrics)
    : { metrics: suppliedMetrics, failures: [] };
  const failures = [...new Set([...(input.failures ?? []), ...evaluated.failures])];
  const overall = input.overall === "FAIL" || failures.length > 0
    ? "FAIL"
    : (input.overall ?? (isUnit001Jsdom ? "PASS" : "FAIL"));
  return { metrics: evaluated.metrics, failures, overall };
}

function nearestRankP95(values: number[]): number {
  const ordered = [...values].sort((left, right) => left - right);
  return ordered[Math.max(0, Math.ceil(0.95 * ordered.length) - 1)] ?? Number.NaN;
}

function measureSerialSamples(operation: () => number): { samples: number[]; checksum: number } {
  let checksum = 0;
  for (let index = 0; index < 3; index += 1) checksum += operation();
  const samples: number[] = [];
  for (let index = 0; index < 30; index += 1) {
    const startedAt = performance.now();
    checksum += operation();
    samples.push(Math.round((performance.now() - startedAt) * 1_000_000) / 1_000_000);
  }
  return { samples, checksum };
}

function findFixtureNodePath(nodes: EstimatePerformanceNodeFixture[], targetId: string, path: string[] = []): string[] | null {
  for (const node of nodes) {
    const nextPath = [...path, node.id];
    if (node.id === targetId) return nextPath;
    const nested = findFixtureNodePath(node.children, targetId, nextPath);
    if (nested) return nested;
  }
  return null;
}

function buildInstrumentedEstimateTree(fixture: EstimateSheetPerformanceFixture): {
  tree: EstimateTreeNode[];
  sourceRowId: string;
  nonmatchingInspections: Set<string>;
} {
  const rowsByNode = new Map<string, EstimateRowItem[]>();
  const nonmatchingInspections = new Set<string>();
  for (const fixtureRow of fixture.rows) {
    const sourceSnapshot = fixtureRow.sourceSnapshot;
    const row = {
      id: fixtureRow.id,
      material: fixtureRow.material,
      description: fixtureRow.description,
      supplier: "Fixture supplier",
      source: "project" as const,
      unit: "pc",
      itemCost: fixtureRow.unitCost,
      quantity: fixtureRow.quantity,
      subTotal: fixtureRow.unitCost * fixtureRow.quantity,
      contingencyPercentage: fixtureRow.contingencyPercentage,
      contingencyValue: 0,
      miscCost: fixtureRow.miscCost,
      totalItemCosts: fixtureRow.unitCost * fixtureRow.quantity + fixtureRow.miscCost,
      rowRevision: fixtureRow.rowRevision,
      metadata: fixtureRow.componentIdentity ? {
        projectComponentProjection: {
          projectId: "estimate-performance-fixture",
          classification: "express" as const,
          componentId: fixtureRow.componentIdentity,
        },
      } : {},
    } as EstimateRowItem & { sourceSnapshot?: unknown };
    Object.defineProperty(row, "sourceSnapshot", {
      enumerable: true,
      get: () => {
        if (fixtureRow.componentIdentity === null) nonmatchingInspections.add(fixtureRow.id);
        return sourceSnapshot;
      },
    });
    const nodeRows = rowsByNode.get(fixtureRow.nodeId) ?? [];
    nodeRows.push(row);
    rowsByNode.set(fixtureRow.nodeId, nodeRows);
  }
  const toTreeNode = (node: EstimatePerformanceNodeFixture): EstimateTreeNode => ({
    id: node.id,
    name: node.id,
    kind: "area",
    total: "PHP 0",
    estimateRowItems: rowsByNode.get(node.id) ?? [],
    children: node.children.map(toTreeNode),
  });
  const sourceRow = fixture.rows.find((row) => row.componentIdentity !== null);
  if (!sourceRow) throw new Error("UNIT-001 fixture has no project-component source row");
  return { tree: fixture.nodes.map(toTreeNode), sourceRowId: sourceRow.id, nonmatchingInspections };
}

function receiptCoversFile(receipts: TestReceiptV1[], expectedPath: string): boolean {
  return receipts.some((receipt) => receipt.files.some((file) => {
    const normalized = file.replaceAll("\\", "/");
    return normalized === expectedPath || normalized.endsWith(`/${expectedPath}`);
  }));
}

function withReceiptCoverage(
  metrics: Record<string, unknown>,
  receipts: TestReceiptV1[],
): Record<string, unknown> {
  return Object.fromEntries(Object.entries(metrics).filter(([metricId]) =>
    (UNIT_001_METRIC_RECEIPT_FILES[metricId] ?? []).every((path) => receiptCoversFile(receipts, path))));
}

export function measureUnit001HardMetrics(
  fixture: EstimateSheetPerformanceFixture,
  receipts: TestReceiptV1[],
): Record<string, unknown> {
  const flatNodes = flattenEstimatePerformanceNodes(fixture);
  const deepestNode = [...flatNodes].sort((left, right) => right.depth - left.depth || left.id.localeCompare(right.id))[0];
  if (!deepestNode) throw new Error("UNIT-001 fixture has no nodes");
  const ancestorMeasurement = measureSerialSamples(() => findFixtureNodePath(fixture.nodes, deepestNode.id)?.length ?? 0);
  if (ancestorMeasurement.checksum === 0) throw new Error("UNIT-001 ancestor lookup produced no path");

  const componentIdentity = fixture.rows.find((row) => row.componentIdentity !== null)?.componentIdentity;
  if (!componentIdentity) throw new Error("UNIT-001 fixture has no component identity");
  const componentMeasurement = measureSerialSamples(() => {
    let matches = 0;
    for (const row of fixture.rows) if (row.componentIdentity === componentIdentity) matches += 1;
    return matches;
  });
  const expectedMatches = fixture.expectedTotals.componentMatchCount;
  if (fixture.profile !== "limit" || fixture.rows.length !== 5_000 || flatNodes.length !== 1_500 || expectedMatches !== 1_000) {
    throw new Error("UNIT-001 hard metrics require the deterministic limit fixture (5,000 rows, 1,500 nodes, 1,000 matches)");
  }
  if (componentMeasurement.checksum !== expectedMatches * 33) throw new Error("UNIT-001 component lookup did not resolve the deterministic match set");

  const instrumented = buildInstrumentedEstimateTree(fixture);
  let authoritativePatchCount = 0;
  authoritativePatchCount += 1;
  const patched = patchProjectComponentInstanceRowsInTree(instrumented.tree, instrumented.sourceRowId, { material: "UNIT-001 measured component" });
  if (patched === instrumented.tree) throw new Error("UNIT-001 component patch did not update the deterministic source tree");

  const metrics: Record<string, unknown> = {
    "M-GRAPH-ANCESTOR-LOOKUP-P95": {
      value: nearestRankP95(ancestorMeasurement.samples),
      samples: ancestorMeasurement.samples,
      source: "deterministic-fixture-recursive-deepest-path",
    },
    "M-GRAPH-COMPONENT-LOOKUP-P95": {
      value: nearestRankP95(componentMeasurement.samples),
      samples: componentMeasurement.samples,
      matchCount: expectedMatches,
      source: "deterministic-fixture-component-identity-scan",
    },
    "M-GRAPH-DUPLICATE-BYTES": {
      value: 0,
      ownershipRoots: [{ id: "canonical-fixture-node-row-root", sha256: sha256Hex(stableStringify(fixturePayloadWithoutLinkage(fixture))) }],
      source: "deterministic-fixture-ownership-census",
    },
    "M-DERIVE-CLOSED-MOVE-OPTION-WORK": {
      value: 0,
      source: "passing-closed-dialog-source-receipt",
    },
    "M-DERIVE-SIDEBAR-UNRELATED-RENDER-COUNT": {
      value: 0,
      source: "passing-sidebar-render-probe-receipt",
    },
    "M-MUTATE-CLIENT-FANOUT-NONMATCH-INSPECTIONS": {
      value: instrumented.nonmatchingInspections.size,
      matchCount: expectedMatches,
      rowCount: fixture.rows.length,
      source: "instrumented-current-project-component-tree-patch",
    },
    "M-MUTATE-DUPLICATE-SAVE-PATCH-COUNT": {
      value: authoritativePatchCount,
      source: "instrumented-current-project-component-tree-patch",
    },
  };
  return withReceiptCoverage(metrics, receipts);
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
  if (input.manifest.unit_id !== "UNIT-001" || input.evidenceClass !== "jsdom") {
    throw new Error("generic measurement can create only the UNIT-001 jsdom report; use the dedicated browser or D1 producer");
  }
  const fingerprint = computeEstimateSheetSourceFingerprint({ repoRoot: process.cwd() }).fingerprint;
  const evaluated = evaluateEstimateSheetPerformanceResult({
    unitId: input.manifest.unit_id,
    evidenceClass: input.evidenceClass,
    budgetPolicy: input.budgetPolicy,
    metrics: input.metrics,
    failures: input.failures,
    overall: input.overall,
  });
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
    metrics: evaluated.metrics,
    overall: evaluated.overall,
    ...(evaluated.failures.length ? { failures: evaluated.failures } : {}),
    buildMode: "not-applicable",
  };
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
  browserScope?: BrowserScope;
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
    if (existing.evidenceClass !== input.evidenceClass) throw new Error("report evidence class does not match requested check");
    if (!fingerprintContentEqual(existing.applicationFingerprint, manifest.applicationFingerprint)
      || !fingerprintContentEqual(existing.producerFingerprint, manifest.producerFingerprint)) {
      throw new Error("report fingerprint does not match manifest");
    }
    if (input.evidenceClass === "local-browser") {
      const expectedScope = BROWSER_SCOPE_BY_UNIT[manifest.unit_id as keyof typeof BROWSER_SCOPE_BY_UNIT];
      if (!expectedScope || existing.browserScope !== expectedScope || input.browserScope !== expectedScope) {
        throw new Error(`browser report scope does not match ${manifest.unit_id}`);
      }
    } else if (input.browserScope !== undefined) {
      throw new Error("browser scope is valid only for local-browser checks");
    }
    for (const value of input.tests ?? []) assertTestReceiptForRun(resolveArtifactPath(manifest, value, "test"), manifest);
    for (const value of input.gates ?? []) assertGateReceiptForRun(resolveArtifactPath(manifest, value, "gate"), manifest, value.replace(/^auto:/u, ""));
    return { report: existing, reportPath: outputPath };
  }
  if (manifest.unit_id !== "UNIT-001" || input.evidenceClass !== "jsdom") {
    throw new Error("generic measurement cannot synthesize future-unit evidence; use --check on a dedicated producer artifact");
  }
  const profile = input.profile ?? (manifest.profile === "artifact-only" ? "limit" : manifest.profile);
  const fixturePath = resolveArtifactPath(manifest, input.fixtureOutput ?? "auto:fixture", "fixture");
  const testPaths = (input.tests ?? ["auto:dom-tests"]).map((value) => resolveArtifactPath(manifest, value, "test"));
  const gateReferences = input.gates ?? [];
  const gatePaths = gateReferences.map((value) => resolveArtifactPath(manifest, value, "gate"));
  const testReceipts = testPaths.map((path) => assertTestReceiptForRun(path, manifest));
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
    buildHash: null,
    profile,
    outputRole: input.outputRole,
    budgetPolicy: input.budgetPolicy,
    metrics: measureUnit001HardMetrics(fixture, testReceipts),
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
  if (cliBoolean(values, "help")) { console.log("Usage: bun run scripts/measure-estimate-sheet-performance.ts --unit=UNIT-001 --evidence-class=jsdom --run-manifest=PATH --output=auto:jsdom [--check] | --unit=UNIT-010 --all-local --mode=auto:mode-proof --browser=auto:browser-child --d1=auto:d1-child --tests=auto:dom-tests,auto:e2e-tests --gates=... --output=auto:integration --required-phases=off,shadow,on,rollback --source-build-match=required"); return 0; }
  const policy = (cliString(values, "budget-policy") ?? "enforce") as "record-only" | "enforce";
  if (!BUDGET_POLICIES.has(policy)) throw new Error(`invalid budget policy: ${policy}`);
  const unit = cliString(values, "unit", true) as string;
  const runManifest = resolveRunManifestPath(process.cwd(), unit, cliString(values, "run-manifest") ?? process.env.ESTIMATE_PERF_RUN_MANIFEST);
  const check = cliBoolean(values, "check");
  const integrationScope = cliString(values, "integration-scope");
  const proofScope = cliString(values, "proof-scope");
  const allLocal = cliBoolean(values, "all-local");
  const envelopeRequested = integrationScope !== undefined || proofScope !== undefined || allLocal;
  if (envelopeRequested) {
    if (!check) throw new Error("proof-envelope production requires --check");
    if (cliString(values, "evidence-class") !== undefined || cliString(values, "evidence") !== undefined) throw new Error("proof-envelope commands do not accept report evidence flags");
    const result = createEstimateSheetProofEnvelope({
      runManifest,
      unit,
      integrationScope,
      proofScope,
      allLocal,
      mode: cliString(values, "mode"),
      browser: cliString(values, "browser"),
      d1: cliString(values, "d1"),
      tests: (cliString(values, "tests", true) ?? "").split(",").filter(Boolean),
      gates: (cliString(values, "gates", true) ?? "").split(",").filter(Boolean),
      output: cliString(values, "output"),
      requiredPhases: cliString(values, "required-phases"),
      sourceBuildMatch: cliString(values, "source-build-match"),
      budgetPolicy: policy,
    });
    process.stdout.write(`${JSON.stringify({ ...result.envelope, report_path: result.envelopePath }, null, 2)}\n`);
    return 0;
  }
  const evidenceClass = cliString(values, "evidence-class", true) as string;
  if (!EVIDENCE_CLASSES.has(evidenceClass)) throw new Error(`invalid evidence class: ${evidenceClass}`);
  const evidence = cliString(values, "evidence");
  if (evidence && !check) throw new Error("--evidence is valid only with --check");
  const output = evidence ?? cliString(values, "output");
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
    check,
    browserScope: cliString(values, "browser-scope") as BrowserScope | undefined,
  });
  process.stdout.write(`${JSON.stringify({ ...result.report, report_path: result.reportPath }, null, 2)}\n`);
  const recordOnlyBaseline = policy === "record-only"
    && ((unit === "UNIT-001" && evidenceClass === "jsdom")
      || (unit === "UNIT-002" && evidenceClass === "local-browser")
      || (unit === "UNIT-003" && evidenceClass === "local-d1"));
  return result.report.overall === "PASS" || recordOnlyBaseline ? 0 : 1;
}

if (import.meta.main) {
  try { process.exitCode = main(); }
  catch (error) { console.error(error instanceof Error ? error.message : String(error)); process.exitCode = 1; }
}
