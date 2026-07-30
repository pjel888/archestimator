import { spawnSync } from "node:child_process";
import { mkdir, readFile, rename, unlink, writeFile } from "node:fs/promises";
import { dirname, isAbsolute, relative, resolve, sep } from "node:path";
import {
  finishCli, flagString, makeResult, parseArgs, qualityRoot, readJson, sha256, writeJson,
  type QualityFinding,
} from "./common";
import {
  buildBaselineInventory, buildCanonicalBaseline, buildComponentMeasurementEnvelope,
  validateComponentMeasurementArtifactResult, validateComponentMeasurementEnvelope,
  type BaselineInventory, type ComponentMeasurementArtifactResult, type ComponentMeasurementEnvelope, type RatchetProposal,
} from "./component-baseline-core";
import {
  validateCanonicalGenerationBindings,
  COMPONENT_BASELINE_MEASUREMENT_COMMAND,
  type ComponentEvidenceMap,
  type CoverageSummary,
  type VitestJsonReport,
} from "./component-core";
import {
  validateBaselineAdmission,
  validateCandidateCheckpointAgainstWorktree,
  validateReviewBuffers,
} from "./validate-baseline-admission";
import type { CandidateRecord } from "./candidate-core";

interface CriticalCapabilities {
  capabilities: Array<{ id: string; name: string }>;
}

interface ValidationArtifact {
  status?: string;
  data?: {
    phase?: string;
    inventory_sha256?: string;
    candidate_digest?: string;
    author_ids?: string[];
    review_source?: string;
    reviewer_identity_assurance?: string;
    author_identity_assurance?: string;
    quality_review_sha256?: string;
    security_review_sha256?: string;
    bootstrap?: boolean;
    predecessor_baseline_sha256?: string | null;
  };
}

function draftInputsPresent(values: Array<string | undefined>): boolean {
  return values.every((value) => Boolean(value));
}

function commaSeparatedFlag(flags: Map<string, string | boolean>, name: string): string[] {
  return [...new Set(String(flagString(flags, name, "")).split(",").map((value) => value.trim()).filter(Boolean))].sort();
}

function validationApproves(validation: ValidationArtifact, inventorySha: string, inventory: BaselineInventory): boolean {
  const data = validation.data;
  if (!data || typeof data.bootstrap !== "boolean") return false;
  const predecessorApproved = data.bootstrap
    ? data.predecessor_baseline_sha256 === null
    : /^[a-f0-9]{64}$/u.test(String(data.predecessor_baseline_sha256));
  return [
    validation.status === "PASS",
    data.phase === "admission",
    data.inventory_sha256 === inventorySha,
    data.candidate_digest === inventory.source.candidate_digest,
    data.bootstrap === inventory.admission.bootstrap,
    JSON.stringify(data.author_ids) === JSON.stringify(inventory.admission.author_ids),
    data.review_source === "local-agent",
    data.reviewer_identity_assurance === "asserted-local",
    data.author_identity_assurance === "asserted-local",
    predecessorApproved,
  ].every(Boolean);
}

function normalizedRelative(root: string, path: string): string {
  return relative(root, resolve(root, path)).split(sep).join("/");
}

function pathFromFlag(root: string, flags: Map<string, string | boolean>, name: string, fallback?: string): string | undefined {
  const value = flagString(flags, name, fallback);
  return value ? (isAbsolute(value) ? value : resolve(root, value)) : undefined;
}

async function removeIfPresent(path: string): Promise<void> {
  try { await unlink(path); } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
  }
}

async function writeJsonAtomic(path: string, value: unknown): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
  const temporary = `${path}.${process.pid}.${Date.now()}.tmp`;
  try {
    await writeFile(temporary, `${JSON.stringify(value, null, 2)}\n`, "utf8");
    await rename(temporary, path);
  } finally {
    await removeIfPresent(temporary);
  }
}

async function readMeasurementJson(path: string, code: string, label: string, findings: QualityFinding[]): Promise<Buffer | undefined> {
  try {
    const raw = await readFile(path);
    JSON.parse(raw.toString());
    return raw;
  } catch (error) {
    findings.push({ code, message: `Measurement ${label} is missing or malformed: ${String(error)}` });
    return undefined;
  }
}

async function performMeasurement(root: string, candidatePath: string, reportPath: string, coverageDirectory: string, coveragePath: string): Promise<{ findings: QualityFinding[]; measurement?: ComponentMeasurementEnvelope }> {
  const findings: QualityFinding[] = [];
  const before = await validateCandidateCheckpointAgainstWorktree(root, candidatePath);
  findings.push(...before.findings);
  if (before.findings.length > 0 || !before.binding) return { findings };
  await mkdir(dirname(reportPath), { recursive: true });
  await mkdir(coverageDirectory, { recursive: true });
  await removeIfPresent(reportPath);
  await removeIfPresent(coveragePath);
  const args = ["x", "vitest", "run", "--maxWorkers=1", "--coverage", "--coverage.reportOnFailure=true", "--coverage.reporter=json-summary", "--coverage.reporter=lcov", `--coverage.reportsDirectory=${coverageDirectory}`, "--reporter=json", `--outputFile=${reportPath}`];
  const command = COMPONENT_BASELINE_MEASUREMENT_COMMAND;
  const startedAt = Date.now();
  const run = spawnSync("bun", args, { cwd: root, encoding: "utf8", maxBuffer: 50 * 1024 * 1024, env: { ...process.env, FORCE_COLOR: "0" } });
  const durationMs = Date.now() - startedAt;
  if (run.error) findings.push({ code: "COMPONENT_INFRASTRUCTURE_FAILURE", message: `Component measurement could not execute: ${String(run.error)}` });
  if (run.status === null) findings.push({ code: "COMPONENT_INFRASTRUCTURE_FAILURE", message: "Component measurement has no exit status" });
  const [reportRaw, coverageRaw, after] = await Promise.all([
    readMeasurementJson(reportPath, "COMPONENT_REPORT_MALFORMED", "report", findings),
    readMeasurementJson(coveragePath, "COMPONENT_COVERAGE_MALFORMED", "coverage", findings),
    validateCandidateCheckpointAgainstWorktree(root, candidatePath),
  ]);
  const artifact = normalizedRelative(root, candidatePath);
  const built = buildComponentMeasurementEnvelope({
    command, candidateArtifact: artifact, before: { ...before.binding, artifact },
    after: after.binding ? { ...after.binding, artifact } : undefined,
    beforeFindings: before.findings, afterFindings: after.findings,
    reportPath: normalizedRelative(root, reportPath), reportRaw,
    coveragePath: normalizedRelative(root, coveragePath), coverageRaw,
    durationMs, exitStatus: run.status,
  });
  findings.push(...built.findings);
  if (run.status !== 0) findings.push({ code: "COMPONENT_MEASUREMENT_RED", message: `Raw measurement exited ${String(run.status)}; its exact failures may be inventoried but cannot be treated as green evidence` });
  return { findings, measurement: built.measurement };
}

async function measure(root: string, flags: Map<string, string | boolean>): Promise<never> {
  const candidatePath = pathFromFlag(root, flags, "candidate")!;
  const reportPath = pathFromFlag(root, flags, "report", "artifacts/quality/component-baseline-measurement/source.vitest.json")!;
  const coverageDirectory = pathFromFlag(root, flags, "coverage-directory", "artifacts/coverage/component-baseline")!;
  const coveragePath = resolve(coverageDirectory, "coverage-summary.json");
  const output = pathFromFlag(root, flags, "output", "artifacts/quality/component-baseline-measurement/measurement.json")!;
  const findings: QualityFinding[] = [];
  let measurement: ComponentMeasurementEnvelope | undefined;
  if (!candidatePath) {
    findings.push({ code: "MEASUREMENT_CANDIDATE_REQUIRED", message: "measure requires --candidate with a canonical quality-candidate artifact" });
  } else if (normalizedRelative(root, reportPath).startsWith("quality/") || normalizedRelative(root, coveragePath).startsWith("quality/")) {
    findings.push({ code: "MEASUREMENT_PATH_IMMUTABLE", message: "Raw measurement must use transient artifact paths, never tracked admitted evidence paths" });
  } else {
    const performed = await performMeasurement(root, candidatePath, reportPath, coverageDirectory, coveragePath);
    findings.push(...performed.findings);
    measurement = performed.measurement;
  }
  const result = makeResult("component-baseline-measurement", findings, {
    measurement: measurement ?? null,
  }, findings.length === 0 ? "Component baseline measurement completed" : `Component baseline measurement failed with ${findings.length} finding(s)`);
  return finishCli(result, output);
}

interface DraftMeasurementSources {
  measurementRaw: Buffer;
  measurement: ComponentMeasurementEnvelope;
  reportPath: string;
  reportRaw: Buffer;
  coveragePath: string;
  coverageRaw: Buffer;
  candidatePath: string;
  candidateRaw: Buffer;
}

function draftSummary(findings: QualityFinding[], phase: string | undefined): string {
  return findings.length === 0 ? `Deterministic ${phase} inventory generated` : "Component baseline inventory generation failed";
}

async function loadDraftMeasurement(root: string, flags: Map<string, string | boolean>, measurementPath: string, findings: QualityFinding[]): Promise<DraftMeasurementSources | undefined> {
  const measurementRaw = await readFile(measurementPath);
  const artifact = JSON.parse(measurementRaw.toString()) as ComponentMeasurementArtifactResult;
  const measurement = artifact.data?.measurement;
  findings.push(...validateComponentMeasurementArtifactResult(artifact));
  findings.push(...validateComponentMeasurementEnvelope(measurement ?? undefined));
  if (!measurement) return undefined;
  const reportPath = pathFromFlag(root, flags, "report", measurement.report.artifact)!;
  const coveragePath = pathFromFlag(root, flags, "coverage", measurement.coverage.artifact)!;
  const candidatePath = resolve(root, measurement.candidate.artifact);
  const [reportRaw, coverageRaw, candidateRaw, candidateCheck] = await Promise.all([
    readFile(reportPath), readFile(coveragePath), readFile(candidatePath),
    validateCandidateCheckpointAgainstWorktree(root, candidatePath),
  ]);
  const sourceBindingsValid = [
    sha256(reportRaw) === measurement.report.sha256,
    sha256(coverageRaw) === measurement.coverage.sha256,
    sha256(candidateRaw) === measurement.candidate.artifact_sha256,
  ].every(Boolean);
  if (!sourceBindingsValid) findings.push({ code: "MEASUREMENT_SOURCE_BINDING_MISMATCH", message: "Measurement report, coverage, or candidate bytes do not match the envelope" });
  const expectedCandidate = {
    artifact_sha256: measurement.candidate.artifact_sha256,
    inner_sha256: measurement.candidate.inner_sha256,
    commit_sha: measurement.candidate.commit_sha,
    comparison_base: measurement.candidate.comparison_base,
    profile: measurement.candidate.profile,
  };
  const candidateValid = [candidateCheck.findings.length === 0, JSON.stringify(candidateCheck.binding) === JSON.stringify(expectedCandidate)].every(Boolean);
  if (!candidateValid) findings.push({ code: "MEASUREMENT_CANDIDATE_STALE", message: "Measurement candidate no longer matches the current worktree checkpoint" });
  return { measurementRaw, measurement, reportPath, reportRaw, coveragePath, coverageRaw, candidatePath, candidateRaw };
}

async function buildDraftInventory(root: string, flags: Map<string, string | boolean>, measurementPath: string, generatedAt: string, phase: "draft" | "admission", loaded: DraftMeasurementSources): Promise<BaselineInventory> {
  const [evidenceMap, registry] = await Promise.all([
    readJson<ComponentEvidenceMap>(resolve(root, "quality/component-evidence-map.json")),
    readJson<CriticalCapabilities>(resolve(root, "quality/critical-capabilities.json")),
  ]);
  const proposalPath = pathFromFlag(root, flags, "proposals");
  const proposals = proposalPath ? await readJson<Record<string, RatchetProposal>>(proposalPath) : undefined;
  return buildBaselineInventory({
    report: JSON.parse(loaded.reportRaw.toString()) as VitestJsonReport,
    reportPath: normalizedRelative(root, loaded.reportPath), reportSha256: sha256(loaded.reportRaw),
    coveragePath: normalizedRelative(root, loaded.coveragePath), coverageSha256: sha256(loaded.coverageRaw),
    candidatePath: normalizedRelative(root, loaded.candidatePath), candidateSha256: sha256(loaded.candidateRaw),
    measurementPath: normalizedRelative(root, measurementPath), measurementSha256: sha256(loaded.measurementRaw),
    measurement: loaded.measurement,
    command: loaded.measurement.command, commit: loaded.measurement.candidate.commit_sha, generatedAt, root,
    evidenceMap, capabilities: registry.capabilities.map((capability) => ({ ...capability, critical: true as const })), proposals, phase,
    bootstrap: flags.get("allow-bootstrap") === true || flags.get("allow-bootstrap") === "true",
    authorIds: commaSeparatedFlag(flags, "author-ids"),
    qualityReviewPath: flagString(flags, "quality-review"), securityReviewPath: flagString(flags, "security-review"),
  });
}

function validateDraftFlags(
  flags: Map<string, string | boolean>,
  measurementPath: string,
  generatedAt: string | undefined,
  phase: string | undefined,
): QualityFinding[] {
  const findings: QualityFinding[] = [];
  if (!draftInputsPresent([measurementPath, generatedAt])) findings.push({ code: "DRAFT_INPUT_REQUIRED", message: "draft requires --measurement and --generated-at" });
  if (!["draft", "admission"].includes(phase ?? "")) findings.push({ code: "PHASE_INVALID", message: `Unsupported phase ${phase}` });
  if (phase === "admission" && commaSeparatedFlag(flags, "author-ids").length === 0) findings.push({ code: "DRAFT_AUTHOR_IDS_REQUIRED", message: "admission draft requires --author-ids" });
  return findings;
}

async function draft(root: string, flags: Map<string, string | boolean>): Promise<never> {
  const measurementPath = pathFromFlag(root, flags, "measurement")!;
  const output = pathFromFlag(root, flags, "output", "artifacts/quality/component-baseline-inventory.draft.json")!;
  const generatedAt = flagString(flags, "generated-at");
  const phase = flagString(flags, "phase", "draft");
  const findings = validateDraftFlags(flags, measurementPath, generatedAt, phase);
  let inventory: BaselineInventory | undefined;
  if (findings.length === 0) {
    const loaded = await loadDraftMeasurement(root, flags, measurementPath, findings);
    if (loaded && findings.length === 0) inventory = await buildDraftInventory(root, flags, measurementPath, generatedAt!, phase as "draft" | "admission", loaded);
    if (inventory) await writeJson(output, inventory);
  }
  const result = makeResult("component-baseline-draft", findings, { output: normalizedRelative(root, output), records: inventory?.records.length ?? 0, phase }, draftSummary(findings, phase));
  return finishCli(result);
}

interface GenerationInputs {
  inventoryRaw: Buffer;
  validationRaw: Buffer;
  reportRaw: Buffer;
  coverageRaw: Buffer;
  qualityRaw: Buffer;
  securityRaw: Buffer;
  candidateRaw: Buffer;
  measurementRaw: Buffer;
  inventory: BaselineInventory;
  validation: ValidationArtifact;
}

async function readGenerationInputs(root: string, inventoryPath: string, validationPath: string): Promise<GenerationInputs> {
  const [inventoryRaw, validationRaw] = await Promise.all([readFile(inventoryPath), readFile(validationPath)]);
  const inventory = JSON.parse(inventoryRaw.toString()) as BaselineInventory;
  const validation = JSON.parse(validationRaw.toString()) as ValidationArtifact;
  const paths = [
    inventory.source.artifact, inventory.source.coverage_artifact,
    inventory.admission.quality_review.artifact, inventory.admission.security_review.artifact,
    inventory.source.candidate_artifact, inventory.source.measurement_artifact,
  ].map((path) => resolve(root, path));
  const [reportRaw, coverageRaw, qualityRaw, securityRaw, candidateRaw, measurementRaw] = await Promise.all(paths.map((path) => readFile(path)));
  return { inventoryRaw, validationRaw, reportRaw, coverageRaw, qualityRaw, securityRaw, candidateRaw, measurementRaw, inventory, validation };
}

async function validateGenerationInputs(root: string, input: GenerationInputs, expectedInventorySha: string, expectedValidationSha: string): Promise<{ findings: QualityFinding[]; qualityReviewer?: string; securityReviewer?: string }> {
  const findings = validateCanonicalGenerationBindings({
    inventoryRaw: input.inventoryRaw, validationRaw: input.validationRaw,
    reportRaw: input.reportRaw, coverageRaw: input.coverageRaw,
    candidateRaw: input.candidateRaw, measurementRaw: input.measurementRaw,
    expectedInventorySha256: expectedInventorySha, expectedValidationSha256: expectedValidationSha,
  });
  const candidateCheck = await validateCandidateCheckpointAgainstWorktree(root, input.inventory.source.candidate_artifact);
  findings.push(...candidateCheck.findings);
  const reviews = validateReviewBuffers({
    qualityRaw: input.qualityRaw, securityRaw: input.securityRaw,
    inventorySha256: expectedInventorySha, candidateDigest: input.inventory.source.candidate_digest,
    disallowedReviewers: input.inventory.admission.author_ids,
  });
  findings.push(...reviews.findings);
  if (sha256(input.qualityRaw) !== input.validation.data?.quality_review_sha256 || sha256(input.securityRaw) !== input.validation.data?.security_review_sha256) {
    findings.push({ code: "GENERATION_REVIEW_DRIFT", message: "Review bytes no longer match the admission validation artifact" });
  }
  return { findings, qualityReviewer: reviews.qualityReviewer, securityReviewer: reviews.securityReviewer };
}

function generationInputDigests(input: GenerationInputs): string[] {
  return [input.inventoryRaw, input.validationRaw, input.reportRaw, input.coverageRaw, input.qualityRaw, input.securityRaw, input.candidateRaw, input.measurementRaw].map(sha256);
}

async function canonicalFromFiles(root: string, inventoryPath: string, validationPath: string, expectedInventorySha: string, expectedValidationSha: string): Promise<{ baseline?: ReturnType<typeof buildCanonicalBaseline>; findings: QualityFinding[] }> {
  const first = await readGenerationInputs(root, inventoryPath, validationPath);
  const firstValidation = await validateGenerationInputs(root, first, expectedInventorySha, expectedValidationSha);
  if (firstValidation.findings.length > 0) return { findings: firstValidation.findings };
  const second = await readGenerationInputs(root, inventoryPath, validationPath);
  const secondValidation = await validateGenerationInputs(root, second, expectedInventorySha, expectedValidationSha);
  const findings = [...secondValidation.findings];
  if (JSON.stringify(generationInputDigests(first)) !== JSON.stringify(generationInputDigests(second))) {
    findings.push({ code: "GENERATION_INPUT_DRIFT", message: "Canonical generation inputs changed during the final recheck" });
  }
  if (findings.length > 0 || !secondValidation.qualityReviewer || !secondValidation.securityReviewer) return { findings };
  const candidateRecord = (JSON.parse(second.candidateRaw.toString()) as { data: { record: CandidateRecord } }).data.record;
  return { findings: [], baseline: buildCanonicalBaseline({
    root, inventory: second.inventory, inventoryPath: normalizedRelative(root, inventoryPath), inventorySha256: expectedInventorySha,
    report: JSON.parse(second.reportRaw.toString()) as VitestJsonReport, reportPath: second.inventory.source.artifact, reportSha256: second.inventory.source.artifact_sha256,
    coverage: JSON.parse(second.coverageRaw.toString()) as CoverageSummary, coveragePath: second.inventory.source.coverage_artifact, coverageSha256: second.inventory.source.coverage_sha256,
    validationPath: normalizedRelative(root, validationPath), validationSha256: expectedValidationSha,
    qualityReviewPath: second.inventory.admission.quality_review.artifact, qualityReviewSha256: sha256(second.qualityRaw), qualityReviewer: secondValidation.qualityReviewer,
    securityReviewPath: second.inventory.admission.security_review.artifact, securityReviewSha256: sha256(second.securityRaw), securityReviewer: secondValidation.securityReviewer,
    candidateRecord, authorIds: second.inventory.admission.author_ids,
    bootstrap: second.validation.data?.bootstrap === true,
    predecessorBaselineSha256: second.validation.data?.predecessor_baseline_sha256 ?? null,
  }) };
}

async function recomputeAdmissionForGeneration(
  root: string,
  inventoryPath: string,
  inventory: BaselineInventory,
  validation: ValidationArtifact,
): Promise<QualityFinding[]> {
  const recomputed = await validateBaselineAdmission({
    root,
    inventoryPath,
    phase: "admission",
    disallowedReviewers: inventory.admission.author_ids,
    allowBootstrap: inventory.admission.bootstrap === true,
    now: Date.now(),
  });
  if (recomputed.findings.length > 0) {
    return [{
      code: "GENERATION_ADMISSION_RECOMPUTE_FAILED",
      message: "Admission failed when independently recomputed during canonical generation",
      detail: recomputed.findings,
    }];
  }
  if (JSON.stringify(recomputed.data) !== JSON.stringify(validation.data)) {
    return [{
      code: "GENERATION_ADMISSION_RECOMPUTE_MISMATCH",
      message: "Admission artifact does not exactly match independently recomputed lineage and ratchet data",
    }];
  }
  return [];
}

async function generate(root: string, flags: Map<string, string | boolean>): Promise<never> {
  const inventoryPath = pathFromFlag(root, flags, "inventory")!;
  const validationPath = pathFromFlag(root, flags, "validation")!;
  const output = pathFromFlag(root, flags, "output", "artifacts/quality/baseline.generated.json")!;
  const findings: QualityFinding[] = [];
  if (!inventoryPath || !validationPath) findings.push({ code: "GENERATION_INPUT_REQUIRED", message: "generate requires --inventory and --validation; it never performs admission implicitly" });
  let baseline;
  if (findings.length === 0) {
    const [inventoryRaw, validationRaw] = await Promise.all([readFile(inventoryPath), readFile(validationPath)]);
    const inventory = JSON.parse(inventoryRaw.toString()) as BaselineInventory;
    const validation = JSON.parse(validationRaw.toString()) as ValidationArtifact;
    const inventorySha = sha256(inventoryRaw);
    const validationSha = sha256(validationRaw);
    if (!validationApproves(validation, inventorySha, inventory)) {
      findings.push({ code: "ADMISSION_VALIDATION_STALE", message: "Validation artifact does not PASS and bind the exact admission inventory and candidate" });
    }
    findings.push(...await recomputeAdmissionForGeneration(root, inventoryPath, inventory, validation));
    if (findings.length === 0) {
      const generated = await canonicalFromFiles(root, inventoryPath, validationPath, inventorySha, validationSha);
      findings.push(...generated.findings);
      baseline = generated.baseline;
    }
    if (baseline) await writeJsonAtomic(output, baseline);
  }
  const result = makeResult("component-baseline-generation", findings, { output: normalizedRelative(root, output) }, findings.length === 0 ? "Canonical baseline candidate generated from prior admission PASS" : "Canonical baseline generation failed");
  return finishCli(result);
}

async function main(): Promise<never> {
  const { positionals, flags } = parseArgs();
  const root = resolve(flagString(flags, "root", qualityRoot())!);
  const command = positionals[0];
  try {
    if (command === "measure") return measure(root, flags);
    if (command === "draft") return draft(root, flags);
    if (command === "generate") return generate(root, flags);
    return finishCli(makeResult("component-baseline", [{ code: "COMMAND_INVALID", message: "Expected measure, draft, or generate" }], { command: command ?? null }, "Component baseline command failed"));
  } catch (error) {
    return finishCli(makeResult("component-baseline", [{ code: "BASELINE_INFRASTRUCTURE_FAILURE", message: `Baseline command failed closed: ${String(error)}` }], { command: command ?? null }, "Component baseline command failed"));
  }
}

await main();
