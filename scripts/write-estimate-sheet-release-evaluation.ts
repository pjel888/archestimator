#!/usr/bin/env bun

import { readFileSync } from "node:fs";
import { relative, resolve, sep } from "node:path";

import {
  COMMAND_RECEIPT_SCHEMA,
  INTEGRATION_SCHEMA,
  MODE_PROOF_SCHEMA,
  PERFORMANCE_REPORT_SCHEMA,
  RELEASE_EVALUATION_SCHEMA,
  TEST_RECEIPT_SCHEMA,
  assertPerformanceReport,
  assertRegularFile,
  canonicalJson,
  cliBoolean,
  cliString,
  defaultPlanRoot,
  ensureContainedRunPath,
  fingerprintContentEqual,
  isContained,
  isPlainObject,
  nowIso,
  parseStrictCli,
  readAuthoritativeRunManifest,
  readJsonFile,
  resolveManifestLogicalOutput,
  sha256File,
  sha256Json,
  writeRunNoOverwrite,
  type PerformanceReportV1,
  type EstimateOutputRole,
  type RunManifestV1,
  type SourceFingerprint,
} from "./lib/estimate-sheet-performance-contract";
import type { CommandReceiptV1 } from "./run-estimate-sheet-performance-gate";

const ESTIMATE_RELEASE_EVALUATION_SCHEMA: typeof RELEASE_EVALUATION_SCHEMA =
  "estimate-sheet-release-evaluation.v1";
const LOCAL_EVIDENCE_ID = "EVID-010" as const;
const COMMAND_GATE_ROLES = ["error-handling", "release-gates", "typecheck"] as const;
type CommandGateRole = (typeof COMMAND_GATE_ROLES)[number];
type ReleaseStatus = "READY" | "NOT_READY" | "BLOCKED";

type ImmutableDependency = {
  immutable_path: string;
  sha256: string;
};

type LocalDependency = ImmutableDependency & {
  evidence_id: typeof LOCAL_EVIDENCE_ID;
  unit_id: "UNIT-010";
  run_id: string;
  registry_artifact_id: "ART-052";
  registry_projection_path: "evidence/runtime/evidence-index.json";
  registry_sha256: string;
};

type CommandDependency = ImmutableDependency & {
  role: CommandGateRole;
  overall: "PASS" | "FAIL";
};

type ReleaseGateOutputDependency = ImmutableDependency & {
  role: "release-gates-json" | "release-gates-md";
  schema_id: "cloudflare-release-gates" | "cloudflare-release-gates-markdown";
};

export type ReleaseEvaluationV1 = {
  schema_version: typeof RELEASE_EVALUATION_SCHEMA;
  unit_id: "UNIT-011";
  run_id: string;
  status: ReleaseStatus;
  application_fingerprint: SourceFingerprint["application"];
  producer_fingerprint: SourceFingerprint["producer"];
  dependencies: {
    local: LocalDependency;
    hosted_d1: ImmutableDependency;
    command_receipts: CommandDependency[];
    release_gate_outputs: ReleaseGateOutputDependency[];
  };
  global_release: {
    local_release_gate_report_ready: boolean;
    observability_support_proof_ready: boolean;
    production_cutover_ready: boolean;
    failed_gate_keys: string[];
  };
  fieldInp: { status: "NOT_EVALUATED"; reason: "production-rum-outside-no-deploy-pack" };
  manualScreenReader: { status: "NOT_EVALUATED"; reason: "manual-assistive-technology-proof-outside-automated-pack" };
  reasons: string[];
  created_at: string;
  payload_sha256: string;
};

type EvidenceRegistry = {
  schema_version?: unknown;
  unit_id?: unknown;
  run_id?: unknown;
  status?: unknown;
  evidence?: unknown;
  dependencySources?: unknown;
  payload_sha256?: unknown;
};

type GlobalReleaseReport = {
  mode: "cloudflare-release-gates";
  readiness: {
    localReleaseGateReportReady: boolean;
    observabilitySupportProofReady: boolean;
    productionCutoverReady: boolean;
  };
  gates: Array<{ key: string; ready: boolean }>;
  blockers: string[];
};

type CurrentRegistryBinding = {
  path: string;
  sha256: string;
  registry: EvidenceRegistry;
  dependencySources: Array<{ immutable_path: string; sha256: string }>;
};

const UNIT_010_PROOF_CHILDREN = [
  { role: "mode-proof", schemaId: MODE_PROOF_SCHEMA },
  { role: "browser-child", schemaId: PERFORMANCE_REPORT_SCHEMA },
  { role: "d1-child", schemaId: PERFORMANCE_REPORT_SCHEMA },
  { role: "dom-tests", schemaId: TEST_RECEIPT_SCHEMA },
  { role: "e2e-tests", schemaId: TEST_RECEIPT_SCHEMA },
  { role: "next-build", schemaId: COMMAND_RECEIPT_SCHEMA },
  { role: "opennext-build", schemaId: COMMAND_RECEIPT_SCHEMA },
  { role: "error-handling", schemaId: COMMAND_RECEIPT_SCHEMA },
  { role: "react-doctor", schemaId: COMMAND_RECEIPT_SCHEMA },
  { role: "typecheck", schemaId: COMMAND_RECEIPT_SCHEMA },
] as const;

function relativePortable(root: string, path: string): string {
  return relative(root, path).split(sep).join("/");
}

function assertSha256(value: unknown, label: string): asserts value is string {
  if (typeof value !== "string" || !/^[a-f0-9]{64}$/u.test(value)) throw new Error(`${label} must be a SHA-256 digest`);
}

function resolveCurrentRegistryBinding(planRoot: string): CurrentRegistryBinding {
  const planPath = resolve(planRoot, "plan-pack.json");
  const plan = readJsonFile<unknown>(planPath);
  if (!isPlainObject(plan) || !Array.isArray(plan.artifacts) || !isPlainObject(plan.runtime_evidence)) {
    throw new Error("plan pack has no current ART-052 registry binding");
  }
  const artifacts = plan.artifacts.filter((entry) => isPlainObject(entry) && entry.id === "ART-052");
  if (artifacts.length !== 1) throw new Error("plan pack must contain exactly one ART-052 artifact");
  const artifact = artifacts[0]!;
  if (artifact.path !== "evidence/runtime/evidence-index.json") throw new Error("ART-052 projection path is invalid");
  assertSha256(artifact.sha256, "ART-052 hash");
  const runtimeRegistry = plan.runtime_evidence.registry;
  if (!isPlainObject(runtimeRegistry)
    || runtimeRegistry.artifact_id !== "ART-052"
    || runtimeRegistry.projection_path !== artifact.path
    || runtimeRegistry.sha256 !== artifact.sha256
    || typeof runtimeRegistry.immutable_path !== "string") {
    throw new Error("runtime registry does not bind the current ART-052 artifact");
  }
  const path = resolve(planRoot, artifact.path);
  if (!isContained(planRoot, path)) throw new Error("ART-052 projection escapes the plan root");
  assertRegularFile(path, "ART-052 projection");
  if (sha256File(path) !== artifact.sha256) throw new Error("ART-052 projection hash mismatch");
  const immutableIndexPath = resolve(planRoot, runtimeRegistry.immutable_path);
  if (!isContained(planRoot, immutableIndexPath)) throw new Error("ART-052 immutable index escapes the plan root");
  assertRegularFile(immutableIndexPath, "ART-052 immutable index");
  if (sha256File(immutableIndexPath) !== artifact.sha256) throw new Error("ART-052 immutable index hash mismatch");
  const registry = readJsonFile<EvidenceRegistry>(path);
  if (!isPlainObject(registry) || typeof registry.payload_sha256 !== "string") throw new Error("ART-052 payload hash is missing");
  const registryPayload = { ...registry } as Record<string, unknown>;
  delete registryPayload.payload_sha256;
  if (registry.payload_sha256 !== sha256Json(registryPayload)) throw new Error("ART-052 payload hash mismatch");
  if (!Array.isArray(registry.dependencySources) || registry.dependencySources.some((entry) => !isPlainObject(entry)
    || typeof entry.immutable_path !== "string"
    || typeof entry.sha256 !== "string")) {
    throw new Error("ART-052 dependencySources are invalid");
  }
  const dependencySources = registry.dependencySources as Array<{ immutable_path: string; sha256: string }>;
  const seenPaths = new Set<string>();
  for (const dependency of dependencySources) {
    assertSha256(dependency.sha256, "ART-052 dependency hash");
    if (seenPaths.has(dependency.immutable_path)) throw new Error("ART-052 dependency path is duplicated");
    seenPaths.add(dependency.immutable_path);
    const dependencyPath = resolve(planRoot, dependency.immutable_path);
    if (!isContained(planRoot, dependencyPath)) throw new Error("ART-052 dependency escapes the plan root");
    assertRegularFile(dependencyPath, "ART-052 dependency");
    if (sha256File(dependencyPath) !== dependency.sha256) throw new Error("ART-052 dependency hash mismatch");
  }
  return { path, sha256: artifact.sha256, registry, dependencySources };
}

function assertUnit010ProofChild(
  value: unknown,
  expected: (typeof UNIT_010_PROOF_CHILDREN)[number],
  runId: string,
  manifest: RunManifestV1,
): void {
  if (!isPlainObject(value)
    || value.schema_version !== expected.schemaId
    || value.unit_id !== "UNIT-010"
    || value.run_id !== runId
    || value.overall !== "PASS") {
    throw new Error(`UNIT-010 proof child ${expected.role} identity or status is invalid`);
  }
  const application = value.applicationFingerprint ?? value.application_fingerprint;
  const producer = value.producerFingerprint ?? value.producer_fingerprint;
  if (!fingerprintContentEqual(application, manifest.applicationFingerprint)
    || !fingerprintContentEqual(producer, manifest.producerFingerprint)) {
    throw new Error(`UNIT-010 proof child ${expected.role} fingerprint mismatch`);
  }
  if (expected.schemaId === COMMAND_RECEIPT_SCHEMA && value.role !== expected.role) {
    throw new Error(`UNIT-010 command proof child ${expected.role} role mismatch`);
  }
  if (expected.role === "browser-child" && value.evidenceClass !== "local-browser") {
    throw new Error("UNIT-010 browser child evidence class is invalid");
  }
  if (expected.role === "d1-child" && value.evidenceClass !== "local-d1") {
    throw new Error("UNIT-010 D1 child evidence class is invalid");
  }
  if (expected.role === "dom-tests" && value.test_class !== "vitest") {
    throw new Error("UNIT-010 DOM test child class is invalid");
  }
  if (expected.role === "e2e-tests" && value.test_class !== "playwright") {
    throw new Error("UNIT-010 E2E test child class is invalid");
  }
}

function assertRecursiveUnit010Proof(
  planRoot: string,
  proof: Record<string, unknown>,
  registry: CurrentRegistryBinding,
  manifest: RunManifestV1,
): void {
  if (proof.integrationScope !== "full-local"
    || proof.sourceBuildMatch !== "required"
    || canonicalJson(proof.requiredPhases) !== canonicalJson(["off", "shadow", "on", "rollback"])
    || !Array.isArray(proof.children)
    || proof.children.length !== UNIT_010_PROOF_CHILDREN.length) {
    throw new Error("UNIT-010 immutable local evidence is not a complete full-local envelope");
  }
  if (registry.dependencySources.length !== UNIT_010_PROOF_CHILDREN.length + 1) {
    throw new Error("ART-052 must bind the ten proof children and one UNIT-010 admission dependency");
  }
  for (let index = 0; index < UNIT_010_PROOF_CHILDREN.length; index += 1) {
    const expected = UNIT_010_PROOF_CHILDREN[index]!;
    const child = proof.children[index];
    const dependency = registry.dependencySources[index];
    if (!isPlainObject(child)
      || child.role !== expected.role
      || child.schemaId !== expected.schemaId
      || typeof child.immutablePath !== "string"
      || typeof child.sha256 !== "string") {
      throw new Error(`UNIT-010 proof child ${expected.role} reference is invalid`);
    }
    assertSha256(child.sha256, `UNIT-010 proof child ${expected.role} hash`);
    const expectedSuffix = `/dependencies/proof-children/${String(index + 1).padStart(2, "0")}-${expected.role}.json`;
    if (!dependency
      || dependency.sha256 !== child.sha256
      || !dependency.immutable_path.endsWith(expectedSuffix)) {
      throw new Error(`ART-052 does not bind copied UNIT-010 proof child ${expected.role}`);
    }
    const path = resolve(planRoot, dependency.immutable_path);
    const value = readJsonFile<unknown>(path);
    assertUnit010ProofChild(value, expected, String(proof.run_id), manifest);
  }
  const admission = registry.dependencySources.at(-1)!;
  if (!/\/dependencies\/01-[^/]+\.json$/u.test(admission.immutable_path)) {
    throw new Error("ART-052 UNIT-010 admission dependency path is invalid");
  }
}

function resolveRunArtifact(manifest: RunManifestV1, value: string, defaultRole: string): string {
  const selected = value.startsWith("auto:") ? value.slice("auto:".length) : value;
  const path = value.startsWith("auto:")
    ? resolveManifestLogicalOutput(manifest, (selected || defaultRole) as EstimateOutputRole)
    : ensureContainedRunPath(manifest.run_root, value);
  assertRegularFile(path, `${defaultRole} artifact`);
  return path;
}

function resolveCommandReceipt(manifest: RunManifestV1, role: CommandGateRole): string {
  const path = resolveManifestLogicalOutput(manifest, role);
  assertRegularFile(path, `${role} command receipt`);
  return path;
}

function validateCommandReceipt(manifest: RunManifestV1, role: CommandGateRole): { receipt: CommandReceiptV1; dependency: CommandDependency; path: string } {
  const path = resolveCommandReceipt(manifest, role);
  const receipt = readJsonFile<CommandReceiptV1>(path);
  if (receipt.schema_version !== COMMAND_RECEIPT_SCHEMA
    || receipt.role !== role
    || receipt.unit_id !== "UNIT-011"
    || receipt.run_id !== manifest.run_id
    || !["PASS", "FAIL"].includes(receipt.overall)) {
    throw new Error(`${role} command receipt identity is invalid`);
  }
  if (!fingerprintContentEqual(receipt.application_fingerprint, manifest.applicationFingerprint)
    || !fingerprintContentEqual(receipt.producer_fingerprint, manifest.producerFingerprint)
    || !fingerprintContentEqual(receipt.pre_application_fingerprint, manifest.applicationFingerprint)
    || !fingerprintContentEqual(receipt.pre_producer_fingerprint, manifest.producerFingerprint)
    || !fingerprintContentEqual(receipt.post_application_fingerprint, manifest.applicationFingerprint)
    || !fingerprintContentEqual(receipt.post_producer_fingerprint, manifest.producerFingerprint)) {
    throw new Error(`${role} command receipt fingerprint mismatch`);
  }
  return {
    receipt,
    path,
    dependency: {
      role,
      overall: receipt.overall,
      immutable_path: relativePortable(manifest.immutable_run_root, path),
      sha256: sha256File(path),
    },
  };
}

function validateGlobalReleaseReport(value: unknown): asserts value is GlobalReleaseReport {
  if (!isPlainObject(value) || value.mode !== "cloudflare-release-gates" || !isPlainObject(value.readiness)) {
    throw new Error("release-gates JSON child schema mismatch");
  }
  for (const key of ["localReleaseGateReportReady", "observabilitySupportProofReady", "productionCutoverReady"] as const) {
    if (typeof value.readiness[key] !== "boolean") throw new Error(`release-gates readiness.${key} missing`);
  }
  if (!Array.isArray(value.gates) || value.gates.some((gate) => !isPlainObject(gate)
    || typeof gate.key !== "string"
    || !/^[a-z0-9-]+$/u.test(gate.key)
    || typeof gate.ready !== "boolean")) {
    throw new Error("release-gates gate list is invalid");
  }
  if (!Array.isArray(value.blockers) || value.blockers.some((blocker) => typeof blocker !== "string")) {
    throw new Error("release-gates blockers are invalid");
  }
  const gateKeys = value.gates.map((gate) => gate.key);
  if (new Set(gateKeys).size !== gateKeys.length) throw new Error("release-gates gate keys are duplicated");
  const allGatesReady = value.gates.length > 0 && value.gates.every((gate) => gate.ready);
  const productionReady = value.readiness.productionCutoverReady;
  if (productionReady && (!value.readiness.localReleaseGateReportReady
    || !value.readiness.observabilitySupportProofReady
    || !allGatesReady
    || value.blockers.length > 0)) {
    throw new Error("release-gates production readiness contradicts its prerequisites");
  }
  if (!productionReady
    && value.readiness.localReleaseGateReportReady
    && value.readiness.observabilitySupportProofReady
    && allGatesReady
    && value.blockers.length === 0) {
    throw new Error("release-gates non-production readiness has no failing prerequisite");
  }
}

function validateReleaseGateOutputs(
  manifest: RunManifestV1,
  receipt: CommandReceiptV1,
  expectedGlobal?: string,
): { report: GlobalReleaseReport; dependencies: ReleaseGateOutputDependency[] } {
  if (!Array.isArray(receipt.child_outputs) || receipt.child_outputs.length !== 2) {
    throw new Error("release-gates receipt must bind exactly two child outputs");
  }
  const expected = [
    { role: "release-gates-json" as const, schema_id: "cloudflare-release-gates" as const },
    { role: "release-gates-md" as const, schema_id: "cloudflare-release-gates-markdown" as const },
  ];
  const dependencies = expected.map(({ role, schema_id }) => {
    const matches = receipt.child_outputs.filter((child) => child.role === role && child.schema_id === schema_id);
    if (matches.length !== 1) throw new Error(`release-gates receipt child ${role} is missing or duplicated`);
    const child = matches[0]!;
    const path = resolveManifestLogicalOutput(manifest, role);
    if (resolve(child.immutable_path) !== path) throw new Error(`${role} child output path is not canonical`);
    assertRegularFile(path, role);
    assertSha256(child.sha256, `${role} receipt hash`);
    if (sha256File(path) !== child.sha256) throw new Error(`${role} hash mismatch`);
    return { role, schema_id, path, immutable_path: relativePortable(manifest.immutable_run_root, path), sha256: child.sha256 };
  });
  const json = dependencies.find((entry) => entry.role === "release-gates-json")!;
  const markdown = dependencies.find((entry) => entry.role === "release-gates-md")!;
  if (expectedGlobal) {
    const resolvedGlobal = resolveRunArtifact(manifest, expectedGlobal, "release-gates-json");
    if (resolvedGlobal !== json.path) throw new Error("caller global release-gates path does not match the bound child output");
  }
  const report = readJsonFile<unknown>(json.path);
  validateGlobalReleaseReport(report);
  const markdownBytes = readFileSync(markdown.path, "utf8");
  if (!markdownBytes.startsWith("# Cloudflare Release Gates\n") || !markdownBytes.endsWith("\n")) {
    throw new Error("release-gates Markdown child schema mismatch");
  }
  return {
    report,
    dependencies: dependencies.map((entry) => ({
      role: entry.role,
      schema_id: entry.schema_id,
      immutable_path: entry.immutable_path,
      sha256: entry.sha256,
    })),
  };
}

function resolveLocalDependency(
  planRoot: string,
  reference: string,
  manifest: RunManifestV1,
): { dependency: LocalDependency; overall: "PASS" | "FAIL" } {
  if (reference !== `index:${LOCAL_EVIDENCE_ID}`) throw new Error(`local dependency must be index:${LOCAL_EVIDENCE_ID}`);
  const currentRegistry = resolveCurrentRegistryBinding(planRoot);
  const registry = currentRegistry.registry;
  if (registry.schema_version !== "estimate-sheet-evidence-index.v1"
    || registry.unit_id !== "UNIT-010"
    || registry.status !== "VERIFIED"
    || typeof registry.run_id !== "string"
    || !Array.isArray(registry.evidence)) {
    throw new Error("current evidence registry does not contain a verified UNIT-010 entry");
  }
  const matches = registry.evidence.filter((entry) => isPlainObject(entry) && entry.id === LOCAL_EVIDENCE_ID);
  if (matches.length !== 1) throw new Error(`evidence registry must contain exactly one ${LOCAL_EVIDENCE_ID} entry`);
  const entry = matches[0]!;
  if (typeof entry.immutable_path !== "string" || typeof entry.sha256 !== "string") throw new Error("local evidence registry entry is incomplete");
  const path = resolve(planRoot, entry.immutable_path);
  if (!isContained(planRoot, path)) throw new Error("local immutable evidence escapes the plan root");
  assertRegularFile(path, "UNIT-010 immutable local evidence");
  assertSha256(entry.sha256, "UNIT-010 immutable evidence hash");
  if (sha256File(path) !== entry.sha256) throw new Error("UNIT-010 immutable local evidence hash mismatch");
  const proof = readJsonFile<Record<string, unknown>>(path);
  if (proof.schema_version !== INTEGRATION_SCHEMA
    || proof.unit_id !== "UNIT-010"
    || proof.run_id !== registry.run_id
    || proof.overall !== "PASS") {
    throw new Error("UNIT-010 immutable local evidence schema mismatch");
  }
  const applicationFingerprint = proof.applicationFingerprint ?? proof.application_fingerprint;
  const producerFingerprint = proof.producerFingerprint ?? proof.producer_fingerprint;
  if (!fingerprintContentEqual(applicationFingerprint, manifest.applicationFingerprint)
    || !fingerprintContentEqual(producerFingerprint, manifest.producerFingerprint)) {
    throw new Error("UNIT-010 immutable local evidence fingerprint mismatch");
  }
  assertRecursiveUnit010Proof(planRoot, proof, currentRegistry, manifest);
  return {
    overall: "PASS",
    dependency: {
      evidence_id: LOCAL_EVIDENCE_ID,
      unit_id: "UNIT-010",
      run_id: registry.run_id,
      immutable_path: relativePortable(planRoot, path),
      sha256: entry.sha256,
      registry_artifact_id: "ART-052",
      registry_projection_path: "evidence/runtime/evidence-index.json",
      registry_sha256: currentRegistry.sha256,
    },
  };
}

function resolveHostedDependency(manifest: RunManifestV1, reference: string): { dependency: ImmutableDependency; report: PerformanceReportV1 } {
  const path = resolveRunArtifact(manifest, reference, "hosted D1 proof");
  const report = readJsonFile<PerformanceReportV1>(path);
  assertPerformanceReport(report, { strict: true });
  if (report.evidenceClass !== "hosted-d1"
    || report.trace.unitId !== "UNIT-011"
    || report.runId !== manifest.run_id
    || !fingerprintContentEqual(report.applicationFingerprint, manifest.applicationFingerprint)
    || !fingerprintContentEqual(report.producerFingerprint, manifest.producerFingerprint)) {
    throw new Error("hosted D1 proof run identity or fingerprint mismatch");
  }
  return {
    report,
    dependency: { immutable_path: relativePortable(manifest.immutable_run_root, path), sha256: sha256File(path) },
  };
}

function releaseReasonCodes(input: {
  localOverall: "PASS" | "FAIL";
  hostedOverall: "PASS" | "FAIL";
  commands: CommandDependency[];
  global: GlobalReleaseReport;
}): { status: ReleaseStatus; reasons: string[] } {
  const blocked: string[] = [];
  if (input.localOverall !== "PASS") blocked.push("integrated-local-proof-failed");
  if (input.hostedOverall !== "PASS") blocked.push("hosted-d1-proof-failed");
  for (const role of ["error-handling", "typecheck"] as const) {
    if (input.commands.find((command) => command.role === role)?.overall !== "PASS") blocked.push(`${role}-gate-failed`);
  }
  if (blocked.length) return { status: "BLOCKED", reasons: blocked.sort() };

  const failedGateKeys = input.global.gates.filter((gate) => !gate.ready).map((gate) => `global-gate-${gate.key}`).sort();
  const releaseCommand = input.commands.find((command) => command.role === "release-gates")!;
  if (!input.global.readiness.productionCutoverReady) {
    return {
      status: "NOT_READY",
      reasons: [...new Set([
        ...failedGateKeys,
        ...(input.global.readiness.observabilitySupportProofReady ? [] : ["observability-support-proof-not-ready"]),
        ...(input.global.readiness.localReleaseGateReportReady ? [] : ["local-release-gate-report-not-ready"]),
        ...(releaseCommand.overall === "PASS" ? [] : ["release-gates-command-not-ready"]),
        "production-cutover-not-ready",
      ])].sort(),
    };
  }
  if (releaseCommand.overall !== "PASS") return { status: "BLOCKED", reasons: ["release-gates-command-failed-unexpectedly"] };
  return { status: "READY", reasons: [] };
}

function markdownCell(value: string): string {
  return value.replaceAll("|", "\\|").replaceAll("\n", " ");
}

export function renderReleaseEvaluation(payload: ReleaseEvaluationV1): string {
  const commandRows = payload.dependencies.command_receipts.map((dependency) =>
    `| command:${dependency.role} | ${dependency.overall} | ${dependency.sha256} | ${markdownCell(dependency.immutable_path)} |`);
  const outputRows = payload.dependencies.release_gate_outputs.map((dependency) =>
    `| output:${dependency.role} | bound | ${dependency.sha256} | ${markdownCell(dependency.immutable_path)} |`);
  const reasons = payload.reasons.length ? payload.reasons.map((reason) => `- ${reason}`) : ["- none"];
  return [
    `<!-- estimate-sheet-release-evaluation.v1 sha256=${payload.payload_sha256} -->`,
    "",
    "```json",
    canonicalJson(payload),
    "```",
    "",
    "# Release Evaluation",
    "",
    "## Status",
    "",
    payload.status,
    "",
    "## Reasons",
    "",
    ...reasons,
    "",
    "## Dependencies",
    "",
    "| Dependency | Outcome | SHA-256 | Immutable path |",
    "| --- | --- | --- | --- |",
    `| registry:${payload.dependencies.local.registry_artifact_id} | bound | ${payload.dependencies.local.registry_sha256} | ${payload.dependencies.local.registry_projection_path} |`,
    `| local:${payload.dependencies.local.evidence_id} | bound | ${payload.dependencies.local.sha256} | ${markdownCell(payload.dependencies.local.immutable_path)} |`,
    `| hosted-d1 | bound | ${payload.dependencies.hosted_d1.sha256} | ${markdownCell(payload.dependencies.hosted_d1.immutable_path)} |`,
    ...commandRows,
    ...outputRows,
    "",
    "## Residual Proof",
    "",
    "| Field | Status | Reason |",
    "| --- | --- | --- |",
    `| fieldInp | ${payload.fieldInp.status} | ${payload.fieldInp.reason} |`,
    `| manualScreenReader | ${payload.manualScreenReader.status} | ${payload.manualScreenReader.reason} |`,
    "",
  ].join("\n");
}

function assertReleaseEvaluation(value: unknown): asserts value is ReleaseEvaluationV1 {
  if (!isPlainObject(value)
    || value.schema_version !== RELEASE_EVALUATION_SCHEMA
    || value.unit_id !== "UNIT-011"
    || typeof value.run_id !== "string"
    || !["READY", "NOT_READY", "BLOCKED"].includes(String(value.status))
    || !isPlainObject(value.dependencies)
    || !isPlainObject(value.application_fingerprint)
    || !isPlainObject(value.producer_fingerprint)
    || !isPlainObject(value.fieldInp)
    || value.fieldInp.status !== "NOT_EVALUATED"
    || !isPlainObject(value.manualScreenReader)
    || value.manualScreenReader.status !== "NOT_EVALUATED"
    || !Array.isArray(value.reasons)
    || value.reasons.some((reason) => typeof reason !== "string" || !/^[a-z0-9-]+$/u.test(reason))
    || typeof value.created_at !== "string"
    || Number.isNaN(Date.parse(value.created_at))) {
    throw new Error("release evaluation payload is invalid");
  }
  assertSha256(value.payload_sha256, "release evaluation payload hash");
  const payload = { ...value } as Partial<ReleaseEvaluationV1>;
  delete payload.payload_sha256;
  if (value.payload_sha256 !== sha256Json(payload)) throw new Error("release evaluation payload hash mismatch");
}

export function parseReleaseEvaluationMarkdown(markdown: string): ReleaseEvaluationV1 {
  const fences = [...markdown.matchAll(/```json\n([\s\S]*?)\n```/gu)];
  if (fences.length !== 1) throw new Error("release evaluation must contain exactly one JSON payload block");
  const header = markdown.match(/^<!-- estimate-sheet-release-evaluation\.v1 sha256=([a-f0-9]{64}) -->\n\n/u);
  if (!header) throw new Error("release evaluation header is invalid");
  const payload = JSON.parse(fences[0]![1]!) as unknown;
  assertReleaseEvaluation(payload);
  if (header[1] !== payload.payload_sha256) throw new Error("release evaluation header hash mismatch");
  if (renderReleaseEvaluation(payload) !== markdown) throw new Error("release evaluation Markdown bytes are not canonical");
  return payload;
}

export function writeEstimateSheetReleaseEvaluation(input: {
  repoRoot?: string;
  planRoot?: string;
  runManifest: string;
  local?: string;
  hosted?: string;
  global?: string;
  gates?: string[];
  output?: string;
  createdAt?: string;
  status?: never;
  reasons?: never;
}): { evaluation: ReleaseEvaluationV1; outputPath: string } {
  if ((input as { status?: unknown }).status !== undefined || (input as { reasons?: unknown }).reasons !== undefined) {
    throw new Error("release status and reasons are evaluator-derived and cannot be supplied by the caller");
  }
  const repoRoot = resolve(input.repoRoot ?? process.cwd());
  const planRoot = resolve(input.planRoot ?? defaultPlanRoot(repoRoot));
  const runManifestPath = resolve(input.runManifest);
  const manifest = readAuthoritativeRunManifest(repoRoot, runManifestPath, "UNIT-011");
  if (manifest.unit_id !== "UNIT-011") throw new Error("release evaluation requires a UNIT-011 run");

  const local = resolveLocalDependency(planRoot, input.local ?? `index:${LOCAL_EVIDENCE_ID}`, manifest);
  const hosted = resolveHostedDependency(manifest, input.hosted ?? "auto:hosted");
  const requestedGates = input.gates ?? COMMAND_GATE_ROLES.map((role) => `auto:${role}`);
  if (requestedGates.length !== COMMAND_GATE_ROLES.length
    || COMMAND_GATE_ROLES.some((role) => !requestedGates.includes(`auto:${role}`))) {
    throw new Error("release evaluation requires the exact error-handling, release-gates, and typecheck receipts");
  }
  const commands = COMMAND_GATE_ROLES.map((role) => validateCommandReceipt(manifest, role));
  const releaseCommand = commands.find((command) => command.dependency.role === "release-gates")!;
  const releaseOutputs = validateReleaseGateOutputs(manifest, releaseCommand.receipt, input.global ?? "auto:release-gates-json");
  const result = releaseReasonCodes({
    localOverall: local.overall,
    hostedOverall: hosted.report.overall,
    commands: commands.map((command) => command.dependency),
    global: releaseOutputs.report,
  });
  const createdAt = input.createdAt ?? nowIso();
  if (Number.isNaN(Date.parse(createdAt))) throw new Error("release evaluation createdAt is invalid");
  const payload = {
    schema_version: ESTIMATE_RELEASE_EVALUATION_SCHEMA,
    unit_id: "UNIT-011" as const,
    run_id: manifest.run_id,
    status: result.status,
    application_fingerprint: manifest.applicationFingerprint,
    producer_fingerprint: manifest.producerFingerprint,
    dependencies: {
      local: local.dependency,
      hosted_d1: hosted.dependency,
      command_receipts: commands.map((command) => command.dependency),
      release_gate_outputs: releaseOutputs.dependencies,
    },
    global_release: {
      local_release_gate_report_ready: releaseOutputs.report.readiness.localReleaseGateReportReady,
      observability_support_proof_ready: releaseOutputs.report.readiness.observabilitySupportProofReady,
      production_cutover_ready: releaseOutputs.report.readiness.productionCutoverReady,
      failed_gate_keys: releaseOutputs.report.gates.filter((gate) => !gate.ready).map((gate) => gate.key).sort(),
    },
    fieldInp: { status: "NOT_EVALUATED" as const, reason: "production-rum-outside-no-deploy-pack" as const },
    manualScreenReader: { status: "NOT_EVALUATED" as const, reason: "manual-assistive-technology-proof-outside-automated-pack" as const },
    reasons: result.reasons,
    created_at: createdAt,
  };
  const evaluation: ReleaseEvaluationV1 = { ...payload, payload_sha256: sha256Json(payload) };
  const immutableOutput = input.output === undefined || input.output === "auto:release";
  const outputPath = immutableOutput
    ? resolveManifestLogicalOutput(manifest, "release")
    : ensureContainedRunPath(manifest.run_root, input.output);
  const markdown = renderReleaseEvaluation(evaluation);
  parseReleaseEvaluationMarkdown(markdown);
  const refreshedManifest = readAuthoritativeRunManifest(repoRoot, runManifestPath, "UNIT-011");
  if (canonicalJson(refreshedManifest) !== canonicalJson(manifest)) {
    throw new Error("release run manifest changed before publication");
  }
  writeRunNoOverwrite(manifest, outputPath, markdown, 0o600);
  return { evaluation, outputPath };
}

function assertAllowedOptions(values: Map<string, string | boolean>, allowed: readonly string[]): void {
  for (const key of values.keys()) if (!allowed.includes(key)) throw new Error(`unknown option: --${key}`);
}

export function main(argv = process.argv.slice(2)): number {
  const values = parseStrictCli(argv);
  assertAllowedOptions(values, ["help", "run-manifest", "unit", "local", "hosted", "global", "gates", "output"]);
  if (cliBoolean(values, "help")) {
    console.log("Usage: bun run scripts/write-estimate-sheet-release-evaluation.ts --unit=UNIT-011 --local=index:EVID-010 --hosted=auto:hosted --global=auto:release-gates-json --gates=auto:error-handling,auto:release-gates,auto:typecheck --output=auto:release");
    return 0;
  }
  const unit = cliString(values, "unit") ?? "UNIT-011";
  if (unit !== "UNIT-011") throw new Error("release evaluation is restricted to UNIT-011");
  const runManifest = cliString(values, "run-manifest") ?? process.env.ESTIMATE_PERF_RUN_MANIFEST;
  if (!runManifest) throw new Error("release evaluation requires --run-manifest or ESTIMATE_PERF_RUN_MANIFEST");
  const result = writeEstimateSheetReleaseEvaluation({
    runManifest,
    local: cliString(values, "local") ?? `index:${LOCAL_EVIDENCE_ID}`,
    hosted: cliString(values, "hosted") ?? "auto:hosted",
    global: cliString(values, "global") ?? "auto:release-gates-json",
    gates: (cliString(values, "gates") ?? COMMAND_GATE_ROLES.map((role) => `auto:${role}`).join(",")).split(",").filter(Boolean),
    output: cliString(values, "output") ?? "auto:release",
  });
  process.stdout.write(`${canonicalJson({ ...result.evaluation, output_path: result.outputPath })}\n`);
  return result.evaluation.status === "READY" ? 0 : 1;
}

if (import.meta.main) {
  try { process.exitCode = main(); }
  catch (error) { console.error(error instanceof Error ? error.message : String(error)); process.exitCode = 1; }
}
