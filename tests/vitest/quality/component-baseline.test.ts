import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { tmpdir } from "node:os";
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import {
  buildBaselineInventory,
  stableBaselineRecordId,
  type BaselineInventory,
  type ComponentMeasurementEnvelope,
  type InventoryBuildInput,
  type RatchetProposal,
} from "../../../scripts/quality/component-baseline-core";
import { candidateDigest, type CandidateRecord } from "../../../scripts/quality/candidate-core";
import { validateBaselineAdmission, validateInventoryStructure } from "../../../scripts/quality/validate-baseline-admission";
import { sha256 } from "../../../scripts/quality/common";
import { validateCanonicalBaselineArtifacts, type VitestJsonReport } from "../../../scripts/quality/component-core";

const qualityScriptDirectory = resolve(process.cwd(), "scripts", "quality");
const componentBaselineCli = join(qualityScriptDirectory, "component-baseline.ts");
const baselineAdmissionCli = join(qualityScriptDirectory, "validate-baseline-admission.ts");

const generatedAt = "2026-07-26T00:00:00.000Z";
const commit = "a".repeat(40);
const evidenceMap = {
  schema_version: 1 as const,
  component_scope_patterns: ["src/**/*.tsx"],
  affected_rules: [{ id: "KNOWN-NONCRITICAL", source_patterns: [], test_patterns: ["tests/vitest/view.test.tsx"] }],
  critical_capabilities: { "CAP-AUTH": ["tests/vitest/auth-*.test.tsx"] },
};
const capabilities = [{ id: "CAP-AUTH", name: "Authentication", critical: true as const }];
const measurement: ComponentMeasurementEnvelope = {
  schema_version: 1,
  integrity_status: "PASS",
  command: "bun x vitest run --maxWorkers=1 --coverage --coverage.reportOnFailure=true --reporter=json",
  duration_ms: 1,
  exit_status: 0,
  candidate: {
    artifact: "artifacts/quality/candidate.json",
    artifact_sha256: "d".repeat(64),
    inner_sha256: "f".repeat(64),
    commit_sha: commit,
    comparison_base: { input_ref: "main", resolved_sha: "1".repeat(40) },
    profile: "Q2_CRITICAL_CHANGE_GATE",
  },
  report: { artifact: "artifacts/quality/source.json", sha256: "b".repeat(64) },
  coverage: { artifact: "artifacts/quality/coverage.json", sha256: "c".repeat(64) },
};

function report(status: "failed" | "pending" | "passed" = "failed", file = "/repo/tests/vitest/view.test.tsx"): VitestJsonReport {
  return {
    success: status === "passed",
    numTotalTests: 1,
    numFailedTests: status === "failed" ? 1 : 0,
    numPendingTests: status === "pending" ? 1 : 0,
    testResults: [{
      name: file,
      status: "passed",
      assertionResults: [{ fullName: "View renders", status, failureMessages: status === "failed" ? ["expected false at C:\\repo\\view.tsx:12:4"] : [] }],
    }],
  };
}

function input(overrides: Partial<InventoryBuildInput> = {}): InventoryBuildInput {
  return {
    report: report(), reportPath: "artifacts/quality/source.json", reportSha256: "b".repeat(64),
    coveragePath: "artifacts/quality/coverage.json", coverageSha256: "c".repeat(64),
    candidatePath: "artifacts/quality/candidate.json", candidateSha256: "d".repeat(64),
    measurementPath: "artifacts/quality/measurement.json", measurementSha256: "e".repeat(64),
    measurement,
    command: measurement.command, commit, generatedAt, root: "/repo",
    evidenceMap, capabilities, ...overrides,
  };
}

function proposalFor(record: BaselineInventory["records"][number]): Record<string, RatchetProposal> {
  return {
    [record.id]: {
      owner: "component-owner",
      rationale: "Legacy presentation-only assertion with a bounded repair",
      acceptance: { command: "bun run test:component:critical", expected_artifact: "artifacts/quality/component.json" },
      expires_at: "2026-08-01T00:00:00.000Z",
    },
  };
}

describe("component baseline inventory generation", () => {
  it("generates stable identities and byte-equivalent inventory for identical inputs", () => {
    const first = buildBaselineInventory(input());
    const second = buildBaselineInventory(input());
    expect(JSON.stringify(first)).toBe(JSON.stringify(second));
    expect(first.records[0]?.id).toBe(stableBaselineRecordId(first.records[0]!));
  });

  it("keeps an explicitly mapped current failure must-fix even when proposal metadata is supplied", () => {
    const unowned = buildBaselineInventory(input());
    const proposed = buildBaselineInventory(input({ proposals: proposalFor(unowned.records[0]!) }));
    expect(unowned.records[0]).toMatchObject({ classification: "must_fix_noncritical", status: "open" });
    expect(proposed.records[0]).toMatchObject({ classification: "must_fix_noncritical", status: "open", owner: "component-owner" });
    expect(proposed.admission).toMatchObject({ open_must_fix_records: 1, proposed_ratchet_records: 0 });
  });

  it("fails closed when a failed assertion has no known criticality mapping", () => {
    const unknownMap = { ...evidenceMap, affected_rules: [] };
    const initial = buildBaselineInventory(input({ evidenceMap: unknownMap }));
    const proposed = buildBaselineInventory(input({ evidenceMap: unknownMap, proposals: proposalFor(initial.records[0]!) }));
    expect(proposed.records[0]).toMatchObject({ classification: "must_fix_noncritical", status: "open" });
  });

  it.each([
    ["skip", report("pending")],
    ["collection", { success: false, testResults: [{ name: "/repo/tests/vitest/view.test.tsx", status: "failed", message: "import failed", assertionResults: [] }] }],
    ["failed file", { success: false, testResults: [{ name: "/repo/tests/vitest/view.test.tsx", status: "failed", assertionResults: [] }] }],
    ["skipped file", { success: false, testResults: [{ name: "/repo/tests/vitest/view.test.tsx", status: "skipped", assertionResults: [] }] }],
    ["unhandled", { ...report("passed"), success: false, unhandledErrors: ["worker crashed"] }],
    ["malformed", { numTotalTests: 0 }],
  ])("never ratchets %s evidence even when a proposal is supplied", (_name, rawReport) => {
    const initial = buildBaselineInventory(input({ report: rawReport as VitestJsonReport }));
    const proposals = Object.fromEntries(initial.records.map((record) => Object.entries(proposalFor(record))[0]!));
    const proposed = buildBaselineInventory(input({ report: rawReport as VitestJsonReport, proposals }));
    expect(proposed.records.every((record) => record.classification !== "ratchet_noncritical")).toBe(true);
  });

  it("never ratchets failed assertions mapped to a critical capability", () => {
    const criticalReport = report("failed", "/repo/tests/vitest/auth-session.test.tsx");
    const initial = buildBaselineInventory(input({ report: criticalReport }));
    const proposed = buildBaselineInventory(input({ report: criticalReport, proposals: proposalFor(initial.records[0]!) }));
    expect(proposed.records[0]).toMatchObject({ classification: "must_fix_critical", critical_capability_ids: ["CAP-AUTH"] });
  });

  it("never ratchets an infrastructure failure", () => {
    const initial = buildBaselineInventory(input({ report: report("passed"), infrastructureFailure: "worker failed to start" }));
    const proposed = buildBaselineInventory(input({ report: report("passed"), infrastructureFailure: "worker failed to start", proposals: proposalFor(initial.records[0]!) }));
    expect(proposed.records[0]).toMatchObject({ failure_kind: "infrastructure_failure", classification: "must_fix_infrastructure" });
  });

  it("exposes measure, draft, validate, and generate without implicit admission", () => {
    const scripts = JSON.parse(readFileSync("package.json", "utf8")).scripts as Record<string, string>;
    const baselineSource = readFileSync("scripts/quality/component-baseline.ts", "utf8");
    const measurementSchema = JSON.parse(readFileSync("quality/schemas/component-baseline-measurement.schema.json", "utf8"));
    const admissionSchema = JSON.parse(readFileSync("quality/schemas/baseline-admission.schema.json", "utf8"));
    expect(Object.keys(scripts)).toEqual(expect.arrayContaining(["quality:baseline:measure", "quality:baseline:draft", "quality:baseline:validate", "quality:baseline:generate"]));
    expect(scripts["quality:baseline:generate"]).not.toContain("validate-baseline-admission");
    expect(baselineSource).toContain('"--coverage.reportOnFailure=true"');
    expect(admissionSchema.$defs.measurement.properties.exit_status).toEqual({ type: "integer" });
    expect(measurementSchema.properties.data.properties.measurement.allOf[0].then.properties.exit_status).toEqual({ type: "integer" });
    expect(measurementSchema.allOf[0].then.properties.data.properties.measurement.properties.exit_status).toEqual({ const: 0 });
    expect(JSON.stringify(admissionSchema)).not.toContain("reviewed_inventory_sha256");
  });
});

function runGit(root: string, args: string[]): string {
  const run = spawnSync("git", args, { cwd: root, encoding: "utf8" });
  expect(run.status, run.stderr).toBe(0);
  return run.stdout.trim();
}

async function writeReviews(root: string, inventoryPath: string, inventory: BaselineInventory): Promise<void> {
  const inventorySha = sha256(await readFile(inventoryPath));
  const review = (reviewer: string) => `Decision: APPROVE\nInventory SHA-256: ${inventorySha}\nCandidate Digest: ${inventory.source.candidate_digest}\nReviewer: ${reviewer}\nReviewer Role: read-only\nSource: local-agent\nReviewer Identity Assurance: asserted-local\nAuthor Identity Assurance: asserted-local\n`;
  await writeFile(join(root, inventory.admission.quality_review.artifact), review("quality-reviewer"));
  await writeFile(join(root, inventory.admission.security_review.artifact), review("security-reviewer"));
}

async function writeFixture(options: { changed?: boolean; failed?: boolean; profile?: CandidateRecord["profile"]; promote?: boolean; proposeFailure?: boolean } = {}): Promise<{ root: string; inventoryPath: string; inventory: BaselineInventory; candidatePath: string; measurementPath: string; measuredReportPath: string; measuredCoveragePath: string; changedPath: string }> {
  const root = await mkdtemp(join(tmpdir(), "arch-baseline-"));
  runGit(root, ["init", "--quiet"]);
  runGit(root, ["config", "user.email", "baseline@example.invalid"]);
  runGit(root, ["config", "user.name", "Baseline Fixture"]);
  const reportPath = "quality/baselines/component/source.vitest.json";
  const coveragePath = "quality/baselines/component/coverage-summary.json";
  const measuredReportPath = "artifacts/quality/component-baseline-measurement/source.vitest.json";
  const measuredCoveragePath = "artifacts/coverage/component-baseline/coverage-summary.json";
  const candidatePath = "artifacts/quality/candidate-checkpoints/measurement-input.json";
  const measurementPath = "artifacts/quality/component-baseline-measurement/measurement.json";
  const changedPath = "scripts/quality/validate-baseline-admission.ts";
  const reportStatus = options.failed ? "failed" : "passed";
  const reportText = JSON.stringify(report(reportStatus));
  const coverageValue = { total: 1, covered: 1, skipped: 0, pct: 100 };
  const coverageText = JSON.stringify({ total: { statements: coverageValue, branches: coverageValue, functions: coverageValue, lines: coverageValue } });
  for (const path of [reportPath, coveragePath, measuredReportPath, measuredCoveragePath, candidatePath, measurementPath, changedPath, "quality/reviews/component-baseline-quality.md", "quality/reviews/component-baseline-security.md", "quality/component-evidence-map.json", "quality/critical-capabilities.json"]) await mkdir(dirname(join(root, path)), { recursive: true });
  await writeFile(join(root, ".gitignore"), "artifacts/quality/candidate-checkpoints/\nartifacts/quality/component-baseline-measurement/\nartifacts/coverage/\n");
  await writeFile(join(root, measuredReportPath), reportText);
  await writeFile(join(root, measuredCoveragePath), coverageText);
  await writeFile(join(root, changedPath), "before\n");
  await writeFile(join(root, "quality/component-evidence-map.json"), readFileSync("quality/component-evidence-map.json", "utf8"));
  await writeFile(join(root, "quality/critical-capabilities.json"), readFileSync("quality/critical-capabilities.json", "utf8"));
  runGit(root, ["add", "."]);
  runGit(root, ["commit", "--quiet", "-m", "fixture base"]);
  const headCommit = runGit(root, ["rev-parse", "HEAD"]);
  const changed = options.changed ?? true;
  if (changed) await writeFile(join(root, changedPath), "after\n");
  const candidateRecord: CandidateRecord = {
    schema_version: 1,
    commit_sha: headCommit,
    comparison_base: { input_ref: headCommit, resolved_sha: headCommit },
    profile: options.profile ?? "Q2_CRITICAL_CHANGE_GATE",
    changed_files: changed ? [{
      path: "scripts/quality/validate-baseline-admission.ts",
      sha256: sha256("after\n"),
      deleted: false,
      sources: ["unstaged"],
    }] : [],
    affected_capabilities: [],
  };
  const candidateText = JSON.stringify({
    schema_version: 1,
    kind: "quality-candidate",
    status: options.failed ? "FAIL" : "PASS",
    generated_at: generatedAt,
    summary: "fixture candidate",
    findings: options.failed ? [{ code: "COMPONENT_MEASUREMENT_RED", message: "raw run exited 1" }] : [],
    data: { record: candidateRecord, sha256: candidateDigest(candidateRecord) },
  });
  await writeFile(join(root, candidatePath), candidateText);
  const measurementEnvelope: ComponentMeasurementEnvelope = {
    schema_version: 1,
    integrity_status: "PASS",
    command: "bun x vitest run --maxWorkers=1 --coverage --coverage.reportOnFailure=true --reporter=json",
    duration_ms: 1,
    exit_status: 0,
    candidate: {
      artifact: candidatePath,
      artifact_sha256: sha256(candidateText),
      inner_sha256: candidateDigest(candidateRecord),
      commit_sha: headCommit,
      comparison_base: candidateRecord.comparison_base,
      profile: candidateRecord.profile as ComponentMeasurementEnvelope["candidate"]["profile"],
    },
    report: { artifact: measuredReportPath, sha256: sha256(reportText) },
    coverage: { artifact: measuredCoveragePath, sha256: sha256(coverageText) },
  };
  const measurementText = JSON.stringify({
    schema_version: 1,
    kind: "component-baseline-measurement",
    status: "PASS",
    generated_at: generatedAt,
    summary: "fixture measurement",
    findings: [],
    data: {
      measurement: { ...measurementEnvelope, exit_status: options.failed ? 1 : 0 },
    },
  });
  await writeFile(join(root, measurementPath), measurementText);
  if (options.promote !== false) {
    await writeFile(join(root, reportPath), await readFile(join(root, measuredReportPath)));
    await writeFile(join(root, coveragePath), await readFile(join(root, measuredCoveragePath)));
  }
  const inventoryInput = input({
    report: report(reportStatus), root, phase: "admission", reportPath, reportSha256: sha256(reportText),
    coveragePath, coverageSha256: sha256(coverageText), candidatePath, candidateSha256: sha256(candidateText), commit: headCommit,
    measurementPath, measurementSha256: sha256(measurementText),
    measurement: { ...measurementEnvelope, exit_status: options.failed ? 1 : 0 },
    command: "bun x vitest run --maxWorkers=1 --coverage --coverage.reportOnFailure=true --reporter=json",
  });
  const initialInventory = buildBaselineInventory(inventoryInput);
  const inventory = options.proposeFailure
    ? buildBaselineInventory({ ...inventoryInput, proposals: proposalFor(initialInventory.records[0]!) })
    : initialInventory;
  const inventoryPath = join(root, "quality/baselines/component/inventory.json");
  await mkdir(dirname(inventoryPath), { recursive: true });
  await writeFile(inventoryPath, `${JSON.stringify(inventory, null, 2)}\n`);
  await writeReviews(root, inventoryPath, inventory);
  return { root, inventoryPath, inventory, candidatePath, measurementPath, measuredReportPath, measuredCoveragePath, changedPath };
}

describe("component baseline admission validation", () => {
  it("rejects bootstrap admission of a newly failed mapped noncritical assertion despite a proposal", async () => {
    const fixture = await writeFixture({ failed: true, proposeFailure: true });
    expect(fixture.inventory.records[0]).toMatchObject({
      classification: "must_fix_noncritical",
      status: "open",
      owner: "component-owner",
    });
    const result = await validateBaselineAdmission({
      root: fixture.root,
      inventoryPath: fixture.inventoryPath,
      phase: "admission",
      disallowedReviewers: ["author"],
      now: Date.parse(generatedAt),
    });
    expect(result.findings.map((finding) => finding.code)).toContain("OPEN_MUST_FIX");
  });

  it.each([
    ["empty object", {}],
    ["null", null],
    ["missing records", { source: {}, admission: {}, counts: {} }],
    ["wrong records", { source: {}, admission: {}, counts: {}, records: {} }],
    ["wrong source", { source: null, admission: {}, counts: {}, records: [] }],
    ["wrong admission", { source: {}, admission: null, counts: {}, records: [] }],
    ["wrong counts", { source: {}, admission: {}, counts: null, records: [] }],
    ["null record", { source: {}, admission: {}, counts: {}, records: [null] }],
  ])("returns structural findings without throwing for %s", (_label, inventory) => {
    expect(() => validateInventoryStructure(inventory)).not.toThrow();
    expect(validateInventoryStructure(inventory).length).toBeGreaterThan(0);
  });

  it("accepts exact immutable sources and two read-only non-author reviews bound to inventory and candidate", async () => {
    const fixture = await writeFixture();
    const result = await validateBaselineAdmission({ root: fixture.root, inventoryPath: fixture.inventoryPath, phase: "admission", disallowedReviewers: ["author"], now: Date.parse(generatedAt) });
    expect(result.findings).toEqual([]);
  });

  it("accepts a stronger Q3 candidate and a canonical empty changed-file inventory", async () => {
    const fixture = await writeFixture({ changed: false, profile: "Q3_RELEASE_GATE" });
    const result = await validateBaselineAdmission({ root: fixture.root, inventoryPath: fixture.inventoryPath, phase: "admission", disallowedReviewers: ["author"], now: Date.parse(generatedAt) });
    expect(result.findings).toEqual([]);
  });

  it("rejects changed bytes for a recorded candidate file", async () => {
    const fixture = await writeFixture();
    await writeFile(join(fixture.root, fixture.changedPath), "drifted bytes\n");
    const result = await validateBaselineAdmission({ root: fixture.root, inventoryPath: fixture.inventoryPath, phase: "admission", disallowedReviewers: ["author"], now: Date.parse(generatedAt) });
    expect(result.findings.map((finding) => finding.code)).toContain("CANDIDATE_FILE_PROVENANCE_MISMATCH");
  });

  it("rejects an unrecorded dirty path", async () => {
    const fixture = await writeFixture();
    await writeFile(join(fixture.root, "unexpected.txt"), "not in checkpoint\n");
    const result = await validateBaselineAdmission({ root: fixture.root, inventoryPath: fixture.inventoryPath, phase: "admission", disallowedReviewers: ["author"], now: Date.parse(generatedAt) });
    expect(result.findings.map((finding) => finding.code)).toContain("CANDIDATE_PATH_SET_MISMATCH");
  });

  it("rejects source-category drift for a recorded candidate file", async () => {
    const fixture = await writeFixture();
    runGit(fixture.root, ["add", fixture.changedPath]);
    const result = await validateBaselineAdmission({ root: fixture.root, inventoryPath: fixture.inventoryPath, phase: "admission", disallowedReviewers: ["author"], now: Date.parse(generatedAt) });
    expect(result.findings.map((finding) => finding.code)).toContain("CANDIDATE_FILE_PROVENANCE_MISMATCH");
  });

  it("allows only the circular component baseline admission files as extra paths", async () => {
    const fixture = await writeFixture();
    const admissionPath = join(fixture.root, "quality/baselines/component/admission.json");
    await writeFile(admissionPath, "{}\n");
    const result = await validateBaselineAdmission({ root: fixture.root, inventoryPath: fixture.inventoryPath, phase: "admission", disallowedReviewers: ["author"], now: Date.parse(generatedAt) });
    expect(result.findings).toEqual([]);
  });

  it("rejects a candidate checkpoint captured before the current HEAD", async () => {
    const fixture = await writeFixture();
    runGit(fixture.root, ["commit", "--quiet", "--allow-empty", "-m", "new head"]);
    const result = await validateBaselineAdmission({ root: fixture.root, inventoryPath: fixture.inventoryPath, phase: "admission", disallowedReviewers: ["author"], now: Date.parse(generatedAt) });
    expect(result.findings.map((finding) => finding.code)).toContain("CANDIDATE_HEAD_MISMATCH");
  });

  it("rejects an inventory source commit that differs from the candidate checkpoint", async () => {
    const fixture = await writeFixture();
    fixture.inventory.source.commit = "d".repeat(40);
    await writeFile(fixture.inventoryPath, `${JSON.stringify(fixture.inventory, null, 2)}\n`);
    await writeReviews(fixture.root, fixture.inventoryPath, fixture.inventory);
    const result = await validateBaselineAdmission({ root: fixture.root, inventoryPath: fixture.inventoryPath, phase: "admission", disallowedReviewers: ["author"], now: Date.parse(generatedAt) });
    expect(result.findings.map((finding) => finding.code)).toContain("CANDIDATE_COMMIT_MISMATCH");
  });

  it("rejects malformed Q2 candidate comparison-base, profile, and source provenance", async () => {
    const fixture = await writeFixture();
    const candidate = JSON.parse(await readFile(join(fixture.root, fixture.candidatePath), "utf8"));
    candidate.data.record.comparison_base.input_ref = "";
    candidate.data.record.profile = "Q1_CHANGE_GATE";
    candidate.data.record.changed_files[0].sources = ["copied"];
    const candidateText = JSON.stringify(candidate);
    await writeFile(join(fixture.root, fixture.candidatePath), candidateText);
    fixture.inventory.source.candidate_sha256 = sha256(candidateText);
    await writeFile(fixture.inventoryPath, `${JSON.stringify(fixture.inventory, null, 2)}\n`);
    await writeReviews(fixture.root, fixture.inventoryPath, fixture.inventory);
    const result = await validateBaselineAdmission({ root: fixture.root, inventoryPath: fixture.inventoryPath, phase: "admission", disallowedReviewers: ["author"], now: Date.parse(generatedAt) });
    expect(result.findings.map((finding) => finding.code)).toEqual(expect.arrayContaining([
      "CANDIDATE_COMPARISON_BASE_MALFORMED",
      "CANDIDATE_PROFILE_MISMATCH",
      "CANDIDATE_SOURCE_MALFORMED",
    ]));
  });

  it("preserves whole-file candidate hash binding outside the embedded record", async () => {
    const fixture = await writeFixture();
    const candidate = JSON.parse(await readFile(join(fixture.root, fixture.candidatePath), "utf8"));
    candidate.summary = "changed envelope bytes";
    await writeFile(join(fixture.root, fixture.candidatePath), JSON.stringify(candidate));
    const result = await validateBaselineAdmission({ root: fixture.root, inventoryPath: fixture.inventoryPath, phase: "admission", disallowedReviewers: ["author"], now: Date.parse(generatedAt) });
    expect(result.findings.map((finding) => finding.code)).toContain("SOURCE_HASH");
  });

  it("binds inventory source.candidate_digest to the measurement inner digest", async () => {
    const fixture = await writeFixture();
    fixture.inventory.source.candidate_digest = "0".repeat(64);
    await writeFile(fixture.inventoryPath, `${JSON.stringify(fixture.inventory, null, 2)}\n`);
    await writeReviews(fixture.root, fixture.inventoryPath, fixture.inventory);
    const result = await validateBaselineAdmission({ root: fixture.root, inventoryPath: fixture.inventoryPath, phase: "admission", disallowedReviewers: ["author"], now: Date.parse(generatedAt) });
    expect(result.findings.map((finding) => finding.code)).toEqual(expect.arrayContaining([
      "CANDIDATE_DIGEST_MISMATCH",
      "MEASUREMENT_INVENTORY_BINDING_MISMATCH",
    ]));
  });

  it("rejects a stale measurement paired with a freshly rebound candidate", async () => {
    const fixture = await writeFixture();
    const candidatePath = join(fixture.root, fixture.candidatePath);
    const candidate = JSON.parse(await readFile(candidatePath, "utf8"));
    candidate.summary = "fresh candidate envelope";
    const candidateText = JSON.stringify(candidate);
    await writeFile(candidatePath, candidateText);
    fixture.inventory.source.candidate_sha256 = sha256(candidateText);
    await writeFile(fixture.inventoryPath, `${JSON.stringify(fixture.inventory, null, 2)}\n`);
    await writeReviews(fixture.root, fixture.inventoryPath, fixture.inventory);
    const result = await validateBaselineAdmission({ root: fixture.root, inventoryPath: fixture.inventoryPath, phase: "admission", disallowedReviewers: ["author"], now: Date.parse(generatedAt) });
    expect(result.findings.map((finding) => finding.code)).toContain("MEASUREMENT_INVENTORY_BINDING_MISMATCH");
  });

  it("draft consumes the bound measurement envelope and rejects later candidate drift", async () => {
    const fixture = await writeFixture();
    const args = [
      componentBaselineCli, "draft", "--root", fixture.root,
      "--measurement", fixture.measurementPath,
      "--report", fixture.inventory.source.artifact,
      "--coverage", fixture.inventory.source.coverage_artifact,
      "--generated-at", generatedAt,
      "--phase", "admission",
      "--output", "artifacts/quality/inventory.from-measurement.json",
    ];
    const valid = spawnSync("bun", args, { cwd: process.cwd(), encoding: "utf8" });
    expect(valid.status, valid.stderr).toBe(0);
    const promoted = JSON.parse(await readFile(join(fixture.root, "artifacts/quality/inventory.from-measurement.json"), "utf8"));
    expect(promoted.source).toMatchObject({
      artifact: "quality/baselines/component/source.vitest.json",
      coverage_artifact: "quality/baselines/component/coverage-summary.json",
      measurement: {
        report: { artifact: "artifacts/quality/component-baseline-measurement/source.vitest.json" },
        coverage: { artifact: "artifacts/coverage/component-baseline/coverage-summary.json" },
      },
    });
    const candidatePath = join(fixture.root, fixture.candidatePath);
    const candidate = JSON.parse(await readFile(candidatePath, "utf8"));
    candidate.summary = "drift after measurement";
    await writeFile(candidatePath, JSON.stringify(candidate));
    const stale = spawnSync("bun", args, { cwd: process.cwd(), encoding: "utf8" });
    expect(stale.status).toBe(1);
    expect(stale.stdout).toContain("MEASUREMENT_SOURCE_BINDING_MISMATCH");
  });

  it("rejects incoherent outer measurement results during draft and admission", async () => {
    const fixture = await writeFixture();
    const measurementFile = join(fixture.root, fixture.measurementPath);
    const artifact = JSON.parse(await readFile(measurementFile, "utf8"));
    artifact.status = "FAIL";
    artifact.findings = [{ code: "COMPONENT_MEASUREMENT_RED" }, { code: "COMPONENT_REPORT_MALFORMED" }];
    const altered = JSON.stringify(artifact);
    await writeFile(measurementFile, altered);
    const draft = spawnSync("bun", [
      componentBaselineCli, "draft", "--root", fixture.root,
      "--measurement", fixture.measurementPath, "--generated-at", generatedAt,
    ], { cwd: process.cwd(), encoding: "utf8" });
    expect(draft.status).toBe(1);
    expect(draft.stdout).toContain("MEASUREMENT_RESULT_INVALID");
    fixture.inventory.source.measurement_sha256 = sha256(altered);
    await writeFile(fixture.inventoryPath, `${JSON.stringify(fixture.inventory, null, 2)}\n`);
    await writeReviews(fixture.root, fixture.inventoryPath, fixture.inventory);
    const admission = await validateBaselineAdmission({
      root: fixture.root, inventoryPath: fixture.inventoryPath, phase: "admission",
      disallowedReviewers: ["author"], now: Date.parse(generatedAt),
    });
    expect(admission.findings.map((finding) => finding.code)).toContain("MEASUREMENT_RESULT_INVALID");
  });

  it("allows an exact red outer measurement result during draft and admission", async () => {
    const fixture = await writeFixture();
    const measurementFile = join(fixture.root, fixture.measurementPath);
    const artifact = JSON.parse(await readFile(measurementFile, "utf8"));
    artifact.status = "FAIL";
    artifact.findings = [{ code: "COMPONENT_MEASUREMENT_RED", message: "raw run exited 1" }];
    artifact.data.measurement.exit_status = 1;
    const redMeasurement = JSON.stringify(artifact);
    await writeFile(measurementFile, redMeasurement);
    const draft = spawnSync("bun", [
      componentBaselineCli, "draft", "--root", fixture.root,
      "--measurement", fixture.measurementPath, "--generated-at", generatedAt,
    ], { cwd: process.cwd(), encoding: "utf8" });
    expect(draft.status, draft.stdout).toBe(0);
    fixture.inventory.source.measurement.exit_status = 1;
    fixture.inventory.source.measurement_sha256 = sha256(redMeasurement);
    await writeFile(fixture.inventoryPath, `${JSON.stringify(fixture.inventory, null, 2)}\n`);
    await writeReviews(fixture.root, fixture.inventoryPath, fixture.inventory);
    const admission = await validateBaselineAdmission({
      root: fixture.root, inventoryPath: fixture.inventoryPath, phase: "admission",
      disallowedReviewers: ["author"], now: Date.parse(generatedAt),
    });
    expect(admission.findings.map((finding) => finding.code)).not.toContain("MEASUREMENT_RESULT_INVALID");
  });

  it("fails closed on source hash drift and mutable source paths", async () => {
    const fixture = await writeFixture();
    await writeFile(join(fixture.root, fixture.inventory.source.artifact), "drift");
    let result = await validateBaselineAdmission({ root: fixture.root, inventoryPath: fixture.inventoryPath, phase: "admission", disallowedReviewers: [], now: Date.parse(generatedAt) });
    expect(result.findings.map((finding) => finding.code)).toContain("SOURCE_HASH");
    fixture.inventory.source.artifact = "artifacts/quality/source.vitest.json";
    await writeFile(fixture.inventoryPath, `${JSON.stringify(fixture.inventory, null, 2)}\n`);
    result = await validateBaselineAdmission({ root: fixture.root, inventoryPath: fixture.inventoryPath, phase: "admission", disallowedReviewers: [], now: Date.parse(generatedAt) });
    expect(result.findings.map((finding) => finding.code)).toEqual(expect.arrayContaining(["SOURCE_PATH_MUTABLE", "SOURCE_MISSING"]));
  });

  it("rejects role-swapped canonical report and coverage paths", async () => {
    const fixture = await writeFixture();
    const reportPath = fixture.inventory.source.artifact;
    fixture.inventory.source.artifact = fixture.inventory.source.coverage_artifact;
    fixture.inventory.source.coverage_artifact = reportPath;
    await writeFile(fixture.inventoryPath, `${JSON.stringify(fixture.inventory, null, 2)}\n`);
    await writeReviews(fixture.root, fixture.inventoryPath, fixture.inventory);
    const result = await validateBaselineAdmission({ root: fixture.root, inventoryPath: fixture.inventoryPath, phase: "admission", disallowedReviewers: ["author"], now: Date.parse(generatedAt) });
    expect(result.findings.map((finding) => finding.code)).toContain("SOURCE_PATH_MUTABLE");
  });

  it("rejects same, author, non-read-only, and candidate-mismatched reviewers", async () => {
    const fixture = await writeFixture();
    const inventorySha = sha256(await readFile(fixture.inventoryPath));
    const bad = `Decision: APPROVE\nInventory SHA-256: ${inventorySha}\nCandidate Digest: ${"f".repeat(64)}\nReviewer: author\nReviewer Role: writer\nSource: local-agent\nReviewer Identity Assurance: asserted-local\nAuthor Identity Assurance: asserted-local\n`;
    await writeFile(join(fixture.root, fixture.inventory.admission.quality_review.artifact), bad);
    await writeFile(join(fixture.root, fixture.inventory.admission.security_review.artifact), bad);
    const result = await validateBaselineAdmission({ root: fixture.root, inventoryPath: fixture.inventoryPath, phase: "admission", disallowedReviewers: ["author"], now: Date.parse(generatedAt) });
    expect(result.findings.map((finding) => finding.code)).toEqual(expect.arrayContaining(["REVIEW_CANDIDATE_DIGEST", "REVIEWER_NOT_READ_ONLY", "REVIEWER_NOT_INDEPENDENT", "REVIEWER_IS_AUTHOR"]));
  });

  it("rejects review overrides that differ from inventory and canonical pointers", async () => {
    const fixture = await writeFixture();
    const roguePath = join(fixture.root, "artifacts/quality/rogue-quality-review.md");
    await mkdir(dirname(roguePath), { recursive: true });
    const inventorySha = sha256(await readFile(fixture.inventoryPath));
    const rogue = `Decision: APPROVE\nInventory SHA-256: ${inventorySha}\nCandidate Digest: ${fixture.inventory.source.candidate_digest}\nReviewer: rogue-reviewer\nReviewer Role: read-only\nSource: local-agent\nReviewer Identity Assurance: asserted-local\nAuthor Identity Assurance: asserted-local\n`;
    await writeFile(roguePath, rogue);
    const result = await validateBaselineAdmission({
      root: fixture.root,
      inventoryPath: fixture.inventoryPath,
      phase: "admission",
      qualityReviewPath: roguePath,
      disallowedReviewers: ["author"],
      now: Date.parse(generatedAt),
    });
    expect(result.findings.map((finding) => finding.code)).toContain("REVIEW_PATH_OVERRIDE_MISMATCH");
    expect(result.data.quality_review_sha256).toBe(sha256(rogue));
  });

  it("generates a canonical candidate only after the separate admission validator passes", async () => {
    const fixture = await writeFixture({ promote: false });
    const admissionPath = join(fixture.root, "quality/baselines/component/admission.json");
    const baselinePath = join(fixture.root, "artifacts/quality/baseline.generated.json");
    const canonicalReportPath = join(fixture.root, fixture.inventory.source.artifact);
    const canonicalCoveragePath = join(fixture.root, fixture.inventory.source.coverage_artifact);
    await expect(readFile(canonicalReportPath)).rejects.toThrow();
    await expect(readFile(canonicalCoveragePath)).rejects.toThrow();
    const measuredReport = await readFile(join(fixture.root, fixture.measuredReportPath));
    const measuredCoverage = await readFile(join(fixture.root, fixture.measuredCoveragePath));
    await writeFile(canonicalReportPath, measuredReport);
    await writeFile(canonicalCoveragePath, measuredCoverage);
    expect(await readFile(canonicalReportPath)).toEqual(measuredReport);
    expect(await readFile(canonicalCoveragePath)).toEqual(measuredCoverage);
    expect(sha256(await readFile(canonicalReportPath))).toBe(fixture.inventory.source.measurement.report.sha256);
    expect(sha256(await readFile(canonicalCoveragePath))).toBe(fixture.inventory.source.measurement.coverage.sha256);
    const draft = spawnSync("bun", [
      componentBaselineCli, "draft", "--root", fixture.root,
      "--measurement", fixture.measurementPath,
      "--report", fixture.inventory.source.artifact,
      "--coverage", fixture.inventory.source.coverage_artifact,
      "--generated-at", generatedAt,
      "--phase", "admission",
      "--output", "quality/baselines/component/inventory.json",
    ], { cwd: process.cwd(), encoding: "utf8" });
    expect(draft.status, draft.stderr).toBe(0);
    const draftedInventory = JSON.parse(await readFile(fixture.inventoryPath, "utf8")) as BaselineInventory;
    await writeReviews(fixture.root, fixture.inventoryPath, draftedInventory);
    const validate = spawnSync("bun", [
      baselineAdmissionCli, "--root", fixture.root,
      "--inventory", "quality/baselines/component/inventory.json", "--phase", "admission",
      "--disallowed-reviewers", "author", "--output", "quality/baselines/component/admission.json",
    ], { cwd: process.cwd(), encoding: "utf8" });
    expect(validate.status, validate.stderr).toBe(0);
    const generate = spawnSync("bun", [
      componentBaselineCli, "generate", "--root", fixture.root,
      "--inventory", "quality/baselines/component/inventory.json",
      "--validation", "quality/baselines/component/admission.json",
      "--output", "artifacts/quality/baseline.generated.json",
    ], { cwd: process.cwd(), encoding: "utf8" });
    expect(generate.status, generate.stderr).toBe(0);
    const baseline = JSON.parse(await readFile(baselinePath, "utf8"));
    expect(baseline).toMatchObject({
      status: "admitted",
      source: {
        report: "quality/baselines/component/source.vitest.json",
        candidate: { record: expect.any(Object), digest: draftedInventory.source.candidate_digest },
        measurement: { candidate_digest: draftedInventory.source.candidate_digest },
      },
      admission: {
        inventory: "quality/baselines/component/inventory.json",
        validation_artifact: "quality/baselines/component/admission.json",
        review_source: "local-agent",
        reviewer_identity_assurance: "asserted-local",
        author_identity_assurance: "asserted-local",
      },
    });
    await rm(join(fixture.root, fixture.candidatePath));
    await rm(join(fixture.root, fixture.measurementPath));
    expect(await validateCanonicalBaselineArtifacts(fixture.root, baseline)).toEqual([]);
    const tamper = [
      (value: typeof baseline) => { value.source.candidate.record.affected_capabilities.push("CAP-TAMPER"); },
      (value: typeof baseline) => { value.source.measurement.duration_ms += 1; },
      (value: typeof baseline) => { value.source.measurement.candidate_digest = "0".repeat(64); },
      (value: typeof baseline) => { value.admission.candidate_digest = "0".repeat(64); },
      (value: typeof baseline) => { value.admission.quality_reviewer = "security-reviewer"; },
    ];
    for (const mutate of tamper) {
      const altered = structuredClone(baseline);
      mutate(altered);
      expect((await validateCanonicalBaselineArtifacts(fixture.root, altered)).length).toBeGreaterThan(0);
    }
    expect(await readFile(admissionPath, "utf8")).toContain('"status": "PASS"');
  });

  it("rejects review bytes changed after admission validation", async () => {
    const fixture = await writeFixture();
    const validate = spawnSync("bun", [
      baselineAdmissionCli, "--root", fixture.root,
      "--inventory", "quality/baselines/component/inventory.json", "--phase", "admission",
      "--disallowed-reviewers", "author", "--output", "quality/baselines/component/admission.json",
    ], { cwd: process.cwd(), encoding: "utf8" });
    expect(validate.status, validate.stderr).toBe(0);
    const inventorySha = sha256(await readFile(fixture.inventoryPath));
    await writeFile(join(fixture.root, fixture.inventory.admission.quality_review.artifact), `Decision: REJECT\nInventory SHA-256: ${inventorySha}\nCandidate Digest: ${"f".repeat(64)}\nReviewer: quality-reviewer\nReviewer Role: read-only\nSource: local-agent\nReviewer Identity Assurance: asserted-local\nAuthor Identity Assurance: asserted-local\n`);
    const generate = spawnSync("bun", [
      componentBaselineCli, "generate", "--root", fixture.root,
      "--inventory", "quality/baselines/component/inventory.json",
      "--validation", "quality/baselines/component/admission.json",
      "--output", "artifacts/quality/baseline.generated.json",
    ], { cwd: process.cwd(), encoding: "utf8" });
    expect(generate.status).toBe(1);
    expect(generate.stdout).toContain("REVIEW_DECISION");
    expect(generate.stdout).toContain("REVIEW_CANDIDATE_DIGEST");
  });
});
