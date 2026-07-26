import { spawnSync } from "node:child_process";
import { mkdir, readFile, unlink } from "node:fs/promises";
import { dirname, isAbsolute, relative, resolve, sep } from "node:path";
import {
  finishCli, flagString, makeResult, parseArgs, qualityRoot, readJson, sha256, writeJson,
  type QualityFinding,
} from "./common";
import {
  buildBaselineInventory, buildCanonicalBaseline,
  type BaselineInventory, type RatchetProposal,
} from "./component-baseline-core";
import type { ComponentEvidenceMap, CoverageSummary, VitestJsonReport } from "./component-core";
import { validateBaselineAdmission } from "./validate-baseline-admission";

interface CriticalCapabilities {
  capabilities: Array<{ id: string; name: string }>;
}

interface ValidationArtifact {
  status?: string;
  data?: { phase?: string; inventory_sha256?: string; candidate_sha256?: string; author_ids?: string[] };
}

function draftInputsPresent(values: Array<string | undefined>): boolean {
  return values.every((value) => Boolean(value));
}

function validationApproves(validation: ValidationArtifact, inventorySha: string, inventory: BaselineInventory): boolean {
  return validation.status === "PASS" && validation.data?.phase === "admission" && validation.data.inventory_sha256 === inventorySha && validation.data.candidate_sha256 === inventory.source.candidate_sha256;
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

async function measure(root: string, flags: Map<string, string | boolean>): Promise<never> {
  const reportPath = pathFromFlag(root, flags, "report", "artifacts/quality/component-baseline-measurement/source.vitest.json")!;
  const coverageDirectory = pathFromFlag(root, flags, "coverage-directory", "artifacts/coverage/component-baseline")!;
  const coveragePath = resolve(coverageDirectory, "coverage-summary.json");
  const output = pathFromFlag(root, flags, "output", "artifacts/quality/component-baseline-measurement/measurement.json")!;
  const findings: QualityFinding[] = [];
  if (normalizedRelative(root, reportPath).startsWith("quality/") || normalizedRelative(root, coveragePath).startsWith("quality/")) {
    findings.push({ code: "MEASUREMENT_PATH_IMMUTABLE", message: "Raw measurement must use transient artifact paths, never tracked admitted evidence paths" });
  } else {
    await mkdir(dirname(reportPath), { recursive: true });
    await mkdir(coverageDirectory, { recursive: true });
    await removeIfPresent(reportPath);
    await removeIfPresent(coveragePath);
    const args = ["x", "vitest", "run", "--maxWorkers=1", "--coverage", "--coverage.reporter=json-summary", "--coverage.reporter=lcov", `--coverage.reportsDirectory=${coverageDirectory}`, "--reporter=json", `--outputFile=${reportPath}`];
    const run = spawnSync("bun", args, { cwd: root, encoding: "utf8", maxBuffer: 50 * 1024 * 1024, env: { ...process.env, FORCE_COLOR: "0" } });
    if (run.error || run.status === null) findings.push({ code: "COMPONENT_INFRASTRUCTURE_FAILURE", message: `Component measurement could not execute: ${String(run.error ?? "no exit status")}` });
    try { await readJson<VitestJsonReport>(reportPath); } catch (error) { findings.push({ code: "COMPONENT_REPORT_MALFORMED", message: `Measurement report is missing or malformed: ${String(error)}` }); }
    try { await readJson<CoverageSummary>(coveragePath); } catch (error) { findings.push({ code: "COMPONENT_COVERAGE_MALFORMED", message: `Measurement coverage is missing or malformed: ${String(error)}` }); }
    if (run.status !== 0) findings.push({ code: "COMPONENT_MEASUREMENT_RED", message: `Raw measurement exited ${String(run.status)}; draft inventory may inspect it, but it is not admissible as green evidence` });
  }
  const result = makeResult("component-baseline-measurement", findings, {
    command: "bun x vitest run --maxWorkers=1 --coverage --reporter=json",
    report: normalizedRelative(root, reportPath),
    coverage: normalizedRelative(root, coveragePath),
  }, findings.length === 0 ? "Component baseline measurement completed" : `Component baseline measurement failed with ${findings.length} finding(s)`);
  return finishCli(result, output);
}

async function draft(root: string, flags: Map<string, string | boolean>): Promise<never> {
  const reportPath = pathFromFlag(root, flags, "report")!;
  const coveragePath = pathFromFlag(root, flags, "coverage")!;
  const candidatePath = pathFromFlag(root, flags, "candidate")!;
  const output = pathFromFlag(root, flags, "output", "artifacts/quality/component-baseline-inventory.draft.json")!;
  const generatedAt = flagString(flags, "generated-at");
  const commit = flagString(flags, "commit");
  const phase = flagString(flags, "phase", "draft");
  const findings: QualityFinding[] = [];
  if (!draftInputsPresent([reportPath, coveragePath, candidatePath, generatedAt, commit])) findings.push({ code: "DRAFT_INPUT_REQUIRED", message: "draft requires --report, --coverage, --candidate, --generated-at, and --commit" });
  if (phase !== "draft" && phase !== "admission") findings.push({ code: "PHASE_INVALID", message: `Unsupported phase ${phase}` });
  let inventory: BaselineInventory | undefined;
  if (findings.length === 0) {
    const [reportRaw, coverageRaw, candidateRaw] = await Promise.all([readFile(reportPath), readFile(coveragePath), readFile(candidatePath)]);
    const [evidenceMap, registry] = await Promise.all([
      readJson<ComponentEvidenceMap>(resolve(root, "quality/component-evidence-map.json")),
      readJson<CriticalCapabilities>(resolve(root, "quality/critical-capabilities.json")),
    ]);
    const proposalPath = pathFromFlag(root, flags, "proposals");
    const proposals = proposalPath ? await readJson<Record<string, RatchetProposal>>(proposalPath) : undefined;
    inventory = buildBaselineInventory({
      report: JSON.parse(reportRaw.toString()) as VitestJsonReport,
      reportPath: normalizedRelative(root, reportPath), reportSha256: sha256(reportRaw),
      coveragePath: normalizedRelative(root, coveragePath), coverageSha256: sha256(coverageRaw),
      candidatePath: normalizedRelative(root, candidatePath), candidateSha256: sha256(candidateRaw),
      command: flagString(flags, "command", "bun run quality:baseline:measure")!, commit: commit!, generatedAt: generatedAt!, root,
      evidenceMap, capabilities: registry.capabilities.map((capability) => ({ ...capability, critical: true as const })), proposals, phase: phase as "draft" | "admission",
      qualityReviewPath: flagString(flags, "quality-review"), securityReviewPath: flagString(flags, "security-review"),
    });
    await writeJson(output, inventory);
  }
  const result = makeResult("component-baseline-draft", findings, { output: normalizedRelative(root, output), records: inventory?.records.length ?? 0, phase }, findings.length === 0 ? `Deterministic ${phase} inventory generated` : "Component baseline inventory generation failed");
  return finishCli(result);
}

function reviewerFrom(text: string): string | undefined {
  return text.match(/Reviewer\s*:\s*`?([^`\r\n]+)`?/iu)?.[1]?.trim();
}

async function liveAdmissionFindings(root: string, inventoryPath: string, validation: ValidationArtifact): Promise<QualityFinding[]> {
  const checked = await validateBaselineAdmission({
    root, inventoryPath, phase: "admission",
    disallowedReviewers: validation.data?.author_ids ?? [], now: Date.now(),
  });
  return checked.findings;
}

async function canonicalFromFiles(root: string, inventoryPath: string, validationPath: string, inventory: BaselineInventory, inventorySha: string, validationRaw: Buffer): Promise<{ baseline?: ReturnType<typeof buildCanonicalBaseline>; findings: QualityFinding[] }> {
  const paths = [inventory.source.artifact, inventory.source.coverage_artifact, inventory.admission.quality_review.artifact, inventory.admission.security_review.artifact].map((path) => resolve(root, path));
  const [reportRaw, coverageRaw, qualityRaw, securityRaw] = await Promise.all(paths.map((path) => readFile(path)));
  const qualityReviewer = reviewerFrom(qualityRaw.toString());
  const securityReviewer = reviewerFrom(securityRaw.toString());
  if (![qualityReviewer, securityReviewer].every(Boolean) || qualityReviewer === securityReviewer) {
    return { findings: [{ code: "REVIEWER_BINDING", message: "Canonical generation requires two named, separate reviewers" }] };
  }
  return {
    findings: [],
    baseline: buildCanonicalBaseline({
      root, inventory, inventoryPath: normalizedRelative(root, inventoryPath), inventorySha256: inventorySha,
      report: JSON.parse(reportRaw.toString()) as VitestJsonReport, reportPath: inventory.source.artifact, reportSha256: sha256(reportRaw),
      coverage: JSON.parse(coverageRaw.toString()) as CoverageSummary, coveragePath: inventory.source.coverage_artifact, coverageSha256: sha256(coverageRaw),
      validationPath: normalizedRelative(root, validationPath), validationSha256: sha256(validationRaw),
      qualityReviewPath: inventory.admission.quality_review.artifact, qualityReviewSha256: sha256(qualityRaw), qualityReviewer: qualityReviewer!,
      securityReviewPath: inventory.admission.security_review.artifact, securityReviewSha256: sha256(securityRaw), securityReviewer: securityReviewer!,
    }),
  };
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
    if (!validationApproves(validation, inventorySha, inventory)) {
      findings.push({ code: "ADMISSION_VALIDATION_STALE", message: "Validation artifact does not PASS and bind the exact admission inventory and candidate" });
    } else findings.push(...await liveAdmissionFindings(root, inventoryPath, validation));
    if (findings.length === 0) {
      const generated = await canonicalFromFiles(root, inventoryPath, validationPath, inventory, inventorySha, validationRaw);
      findings.push(...generated.findings);
      baseline = generated.baseline;
    }
    if (baseline) await writeJson(output, baseline);
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
