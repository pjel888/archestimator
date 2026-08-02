import { spawnSync } from "node:child_process";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { sha256 } from "../../../scripts/quality/common";
import { candidateDigest, type CandidateRecord } from "../../../scripts/quality/candidate-core";
import {
  buildComponentMeasurementEnvelope,
  validateComponentMeasurementArtifactResult,
  validateComponentMeasurementEnvelope,
} from "../../../scripts/quality/component-baseline-core";
import {
  validateCanonicalBaselineArtifacts,
  validateCanonicalGenerationBindings,
  validateImmutablePredecessorAdmission,
  type ComponentBaseline,
} from "../../../scripts/quality/component-core";
import {
  canonicalBaselineEvidencePaths,
  validateReviewBuffers,
} from "../../../scripts/quality/validate-baseline-admission";

const roots: string[] = [];
const reportRaw = Buffer.from('{"success":true,"numTotalTestSuites":0,"numPassedTestSuites":0,"numFailedTestSuites":0,"numPendingTestSuites":0,"numTotalTests":0,"numPassedTests":0,"numFailedTests":0,"numPendingTests":0,"numTodoTests":0,"testResults":[]}');
const coverageValue = { total: 1, covered: 1, skipped: 0, pct: 100 };
const coverageMetrics = { statements: coverageValue, branches: coverageValue, functions: coverageValue, lines: coverageValue };
const coverageRaw = Buffer.from(JSON.stringify({ total: coverageMetrics, "src/example.ts": coverageMetrics }));
const candidateSha = "c".repeat(64);
const candidatePath = "artifacts/quality/candidate.json";
const candidateRecord: CandidateRecord = {
  schema_version: 1,
  commit_sha: "e".repeat(40),
  comparison_base: { input_ref: "main", resolved_sha: "f".repeat(40) },
  profile: "Q2_CRITICAL_CHANGE_GATE",
  changed_files: [],
  affected_capabilities: [],
};
const innerDigest = candidateDigest(candidateRecord);

function retainedMeasurement() {
  return {
    schema_version: 1 as const,
    integrity_status: "PASS" as const,
    command: "bun x vitest run --maxWorkers=1 --coverage --coverage.reportOnFailure=true --reporter=json",
    duration_ms: 12,
    exit_status: 1,
    candidate: {
      artifact: candidatePath,
      artifact_sha256: candidateSha,
      inner_sha256: innerDigest,
      commit_sha: "e".repeat(40),
      comparison_base: { input_ref: "main", resolved_sha: "f".repeat(40) },
      profile: "Q2_CRITICAL_CHANGE_GATE" as const,
    },
    report: { artifact: "artifacts/quality/component-baseline-measurement/source.vitest.json", sha256: sha256(reportRaw) },
    coverage: { artifact: "artifacts/coverage/component-baseline/coverage-summary.json", sha256: sha256(coverageRaw) },
  };
}

function bindingFixture() {
  const inventoryRaw = Buffer.from(JSON.stringify({
    schema_version: 1,
    admission: { phase: "admission", status: "review_pending", bootstrap: true, author_ids: ["author"] },
    source: {
      command: retainedMeasurement().command,
      commit: retainedMeasurement().candidate.commit_sha,
      measurement: retainedMeasurement(),
      measurement_artifact: "artifacts/quality/component-baseline-measurement/measurement.json",
      measurement_sha256: "a".repeat(64),
      artifact: "quality/baselines/component/source.vitest.json",
      artifact_sha256: sha256(reportRaw),
      coverage_artifact: "quality/baselines/component/coverage-summary.json",
      coverage_sha256: sha256(coverageRaw),
      candidate_artifact: candidatePath,
      candidate_sha256: candidateSha,
      candidate_digest: retainedMeasurement().candidate.inner_sha256,
    },
    records: [],
  }));
  const validationRaw = Buffer.from(JSON.stringify({
    status: "PASS",
    data: {
      phase: "admission",
      inventory_sha256: sha256(inventoryRaw),
      candidate_digest: retainedMeasurement().candidate.inner_sha256,
      author_ids: ["author"],
      review_source: "local-agent",
      reviewer_identity_assurance: "asserted-local",
      author_identity_assurance: "asserted-local",
      bootstrap: true,
      predecessor_baseline_sha256: null,
    },
  }));
  return { inventoryRaw, validationRaw };
}

function codes(findings: Array<{ code: string }>): string[] {
  return findings.map((finding) => finding.code);
}

function runGit(root: string, args: string[]): string {
  const result = spawnSync("git", args, { cwd: root, encoding: "utf8" });
  if (result.error || result.status !== 0) {
    throw result.error ?? new Error(`git ${args.join(" ")} failed: ${result.stderr}`);
  }
  return result.stdout.trim();
}

async function createGitFixtureRoot(): Promise<{ root: string; comparisonBase: string }> {
  const root = await mkdtemp(join(tmpdir(), "component-baseline-lineage-"));
  roots.push(root);
  runGit(root, ["init", "--initial-branch=main"]);
  runGit(root, ["config", "user.email", "quality-fixture@example.invalid"]);
  runGit(root, ["config", "user.name", "Quality Fixture"]);
  runGit(root, ["config", "core.autocrlf", "false"]);
  await writeFile(join(root, "seed.txt"), "seed\n");
  runGit(root, ["add", "seed.txt"]);
  runGit(root, ["commit", "-m", "seed comparison base"]);
  return { root, comparisonBase: runGit(root, ["rev-parse", "HEAD"]) };
}

function bootstrapLineageFixture(comparisonBase: string): ComponentBaseline {
  return {
    source: {
      candidate: {
        record: {
          comparison_base: { input_ref: "main", resolved_sha: comparisonBase },
        },
      },
    },
    admission: {
      bootstrap: true,
      predecessor_baseline_sha256: null,
    },
  } as unknown as ComponentBaseline;
}

async function writeBootstrapBaseline(root: string, baseline: ComponentBaseline): Promise<void> {
  const path = join(root, "quality/baseline.json");
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, `${JSON.stringify(baseline, null, 2)}\n`);
}

async function commitBootstrapBaseline(root: string, baseline: ComponentBaseline, message: string): Promise<void> {
  await writeBootstrapBaseline(root, baseline);
  runGit(root, ["add", "quality/baseline.json"]);
  runGit(root, ["commit", "-m", message]);
}

afterEach(async () => {
  await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
});

describe("canonical component baseline generation integrity", () => {
  it("accepts the byte-identical first bootstrap after its comparison base", async () => {
    const { root, comparisonBase } = await createGitFixtureRoot();
    const baseline = bootstrapLineageFixture(comparisonBase);
    await commitBootstrapBaseline(root, baseline, "admit first bootstrap");

    expect(codes(await validateImmutablePredecessorAdmission(root, baseline))).not.toContain(
      "COMPONENT_BASELINE_BOOTSTRAP_LINEAGE_INVALID",
    );
  });

  it("fails closed when the tracked bootstrap is missing from the worktree", async () => {
    const { root, comparisonBase } = await createGitFixtureRoot();
    const baseline = bootstrapLineageFixture(comparisonBase);
    await commitBootstrapBaseline(root, baseline, "admit first bootstrap");
    await rm(join(root, "quality/baseline.json"));

    expect(codes(await validateImmutablePredecessorAdmission(root, baseline))).toContain(
      "COMPONENT_BASELINE_PREDECESSOR_VALIDATION_FAILED",
    );
  });

  it("rejects modified bootstrap content after the first admission", async () => {
    const { root, comparisonBase } = await createGitFixtureRoot();
    const baseline = bootstrapLineageFixture(comparisonBase);
    await commitBootstrapBaseline(root, baseline, "admit first bootstrap");
    const modified = structuredClone(baseline);
    modified.source.candidate.record.comparison_base.input_ref = "modified";
    await writeBootstrapBaseline(root, modified);

    expect(codes(await validateImmutablePredecessorAdmission(root, modified))).toContain(
      "COMPONENT_BASELINE_BOOTSTRAP_LINEAGE_INVALID",
    );
  });

  it("rejects bootstrap deletion and reintroduction", async () => {
    const { root, comparisonBase } = await createGitFixtureRoot();
    const baseline = bootstrapLineageFixture(comparisonBase);
    await commitBootstrapBaseline(root, baseline, "admit first bootstrap");
    runGit(root, ["rm", "quality/baseline.json"]);
    runGit(root, ["commit", "-m", "delete bootstrap"]);
    await commitBootstrapBaseline(root, baseline, "reintroduce bootstrap");

    expect(codes(await validateImmutablePredecessorAdmission(root, baseline))).toContain(
      "COMPONENT_BASELINE_BOOTSTRAP_LINEAGE_INVALID",
    );
  });

  it("rejects a bootstrap comparison-base rollback", async () => {
    const { root, comparisonBase: originalBase } = await createGitFixtureRoot();
    await writeFile(join(root, "advance.txt"), "advance\n");
    runGit(root, ["add", "advance.txt"]);
    runGit(root, ["commit", "-m", "advance comparison base"]);
    const admittedBase = runGit(root, ["rev-parse", "HEAD"]);
    const baseline = bootstrapLineageFixture(admittedBase);
    await commitBootstrapBaseline(root, baseline, "admit first bootstrap");
    const rolledBack = bootstrapLineageFixture(originalBase);
    await writeBootstrapBaseline(root, rolledBack);

    expect(codes(await validateImmutablePredecessorAdmission(root, rolledBack))).toContain(
      "COMPONENT_BASELINE_BOOTSTRAP_LINEAGE_INVALID",
    );
  });

  it("rejects a second bootstrap after established baseline history", async () => {
    const { root, comparisonBase } = await createGitFixtureRoot();
    const baseline = bootstrapLineageFixture(comparisonBase);
    await commitBootstrapBaseline(root, baseline, "admit first bootstrap");
    const established = structuredClone(baseline);
    established.admission.bootstrap = false;
    established.admission.predecessor_baseline_sha256 = "1".repeat(64);
    await commitBootstrapBaseline(root, established, "admit established baseline");
    await commitBootstrapBaseline(root, baseline, "attempt second bootstrap");

    expect(codes(await validateImmutablePredecessorAdmission(root, baseline))).toContain(
      "COMPONENT_BASELINE_BOOTSTRAP_LINEAGE_INVALID",
    );
  });

  it("excludes only the six canonical evidence outputs from candidate provenance", () => {
    expect([...canonicalBaselineEvidencePaths].sort()).toEqual([
      "quality/baselines/component/admission.json",
      "quality/baselines/component/coverage-summary.json",
      "quality/baselines/component/inventory.json",
      "quality/baselines/component/source.vitest.json",
      "quality/reviews/component-baseline-quality.md",
      "quality/reviews/component-baseline-security.md",
    ]);
    expect(canonicalBaselineEvidencePaths.has("src/example.ts")).toBe(false);
  });

  it("fails the measurement envelope when candidate bytes or source provenance drift during execution", () => {
    const candidate = {
      artifact: "artifacts/quality/candidate.json",
      artifact_sha256: "a".repeat(64),
      inner_sha256: "b".repeat(64),
      commit_sha: "c".repeat(40),
      comparison_base: { input_ref: "main", resolved_sha: "d".repeat(40) },
      profile: "Q2_CRITICAL_CHANGE_GATE" as const,
    };
    const built = buildComponentMeasurementEnvelope({
      command: "bun x vitest run --maxWorkers=1 --coverage --coverage.reportOnFailure=true --reporter=json",
      candidateArtifact: candidate.artifact,
      before: candidate,
      after: { ...candidate, artifact_sha256: "e".repeat(64) },
      beforeFindings: [],
      afterFindings: [{ code: "CANDIDATE_FILE_PROVENANCE_MISMATCH", message: "source changed" }],
      reportPath: "artifacts/report.json", reportRaw,
      coveragePath: "artifacts/coverage.json", coverageRaw,
      durationMs: 12, exitStatus: 0,
    });
    expect(built.measurement?.integrity_status).toBe("FAIL");
    expect(codes(built.findings)).toEqual(expect.arrayContaining([
      "CANDIDATE_FILE_PROVENANCE_MISMATCH",
      "MEASUREMENT_CANDIDATE_DRIFT",
    ]));
  });

  it("rejects an integrity-PASS envelope with a null exit status while allowing a nonzero integer", () => {
    const valid = retainedMeasurement();
    expect(validateComponentMeasurementEnvelope(valid)).toEqual([]);
    expect(codes(validateComponentMeasurementEnvelope({ ...valid, exit_status: null }))).toContain(
      "MEASUREMENT_ENVELOPE_INVALID",
    );
    const built = buildComponentMeasurementEnvelope({
      command: valid.command,
      candidateArtifact: valid.candidate.artifact,
      before: valid.candidate,
      after: valid.candidate,
      beforeFindings: [],
      afterFindings: [],
      reportPath: valid.report.artifact,
      reportRaw,
      coveragePath: valid.coverage.artifact,
      coverageRaw,
      durationMs: 12,
      exitStatus: null,
    });
    expect(built.measurement?.integrity_status).toBe("FAIL");
    expect(codes(built.findings)).toContain("COMPONENT_INFRASTRUCTURE_FAILURE");
  });

  it("allows only coherent green or exact red outer measurement results", () => {
    const measurement = retainedMeasurement();
    expect(validateComponentMeasurementArtifactResult({
      kind: "component-baseline-measurement", status: "PASS", findings: [],
      data: { measurement: { ...measurement, exit_status: 0 } },
    })).toEqual([]);
    expect(validateComponentMeasurementArtifactResult({
      kind: "component-baseline-measurement", status: "FAIL",
      findings: [{ code: "COMPONENT_MEASUREMENT_RED" }], data: { measurement },
    })).toEqual([]);
    for (const artifact of [
      { kind: "component-baseline-measurement", status: "PASS", findings: [], data: { measurement } },
      { kind: "component-baseline-measurement", status: "FAIL", findings: [], data: { measurement } },
      { kind: "component-baseline-measurement", status: "FAIL", findings: [{ code: "COMPONENT_MEASUREMENT_RED" }, { code: "EXTRA" }], data: { measurement } },
      { kind: "component-baseline-measurement", status: "FAIL", findings: [{ code: "COMPONENT_MEASUREMENT_RED" }], data: { measurement: { ...measurement, exit_status: 0 } } },
    ]) {
      expect(codes(validateComponentMeasurementArtifactResult(artifact))).toContain("MEASUREMENT_RESULT_INVALID");
    }
  });

  it.each([
    "quality/baselines/component/source.vitest.json",
    "././quality/baselines/component/source.vitest.json",
    "artifacts/../quality/baselines/component/source.vitest.json",
    ".\\.\\quality\\baselines\\component\\source.vitest.json",
  ])("rejects retained measurement report origin %s", (artifact) => {
    const valid = retainedMeasurement();
    expect(codes(validateComponentMeasurementEnvelope({
      ...valid,
      report: { ...valid.report, artifact },
    }))).toContain("MEASUREMENT_ENVELOPE_INVALID");
  });

  it.each([
    "quality/baselines/component/coverage-summary.json",
    "././quality/baselines/component/coverage-summary.json",
    "artifacts/../quality/baselines/component/coverage-summary.json",
  ])("rejects retained measurement coverage origin %s", (artifact) => {
    const valid = retainedMeasurement();
    expect(codes(validateComponentMeasurementEnvelope({
      ...valid,
      coverage: { ...valid.coverage, artifact },
    }))).toContain("MEASUREMENT_ENVELOPE_INVALID");
  });

  it.each([
    "././quality/baselines/component/source.vitest.json",
    "artifacts/../quality/baselines/component/source.vitest.json",
  ])("rejects retained runtime measurement alias %s", (artifact) => {
    const fixture = bindingFixture();
    const inventory = JSON.parse(fixture.inventoryRaw.toString());
    inventory.source.measurement.report.artifact = artifact;
    const inventoryRaw = Buffer.from(JSON.stringify(inventory));
    const validationRaw = Buffer.from(JSON.stringify({
      status: "PASS",
      data: {
        phase: "admission",
        inventory_sha256: sha256(inventoryRaw),
        candidate_digest: retainedMeasurement().candidate.inner_sha256,
        author_ids: ["author"],
        review_source: "local-agent",
        reviewer_identity_assurance: "asserted-local",
        author_identity_assurance: "asserted-local",
        bootstrap: false,
        predecessor_baseline_sha256: "1".repeat(64),
      },
    }));
    expect(codes(validateCanonicalGenerationBindings({
      inventoryRaw,
      validationRaw,
      reportRaw,
      coverageRaw,
      expectedInventorySha256: sha256(inventoryRaw),
      expectedValidationSha256: sha256(validationRaw),
    }))).toContain("COMPONENT_BASELINE_MEASUREMENT_PROOF_INVALID");
  });

  it("accepts the exact re-read admission, inventory, report, and coverage bytes", () => {
    const { inventoryRaw, validationRaw } = bindingFixture();
    expect(validateCanonicalGenerationBindings({
      inventoryRaw,
      validationRaw,
      reportRaw,
      coverageRaw,
      expectedInventorySha256: sha256(inventoryRaw),
      expectedValidationSha256: sha256(validationRaw),
    })).toEqual([]);
  });

  it("rejects a PASS validation whose bootstrap decision differs from the reviewed inventory", () => {
    const fixture = bindingFixture();
    const validation = JSON.parse(fixture.validationRaw.toString());
    validation.data.bootstrap = false;
    validation.data.predecessor_baseline_sha256 = "1".repeat(64);
    const validationRaw = Buffer.from(JSON.stringify(validation));

    expect(codes(validateCanonicalGenerationBindings({
      inventoryRaw: fixture.inventoryRaw,
      validationRaw,
      reportRaw,
      coverageRaw,
      expectedInventorySha256: sha256(fixture.inventoryRaw),
      expectedValidationSha256: sha256(validationRaw),
    }))).toContain("GENERATION_ADMISSION_BINDING_MISMATCH");
  });

  it("rejects report and coverage bytes swapped after admission", () => {
    const { inventoryRaw, validationRaw } = bindingFixture();
    expect(codes(validateCanonicalGenerationBindings({
      inventoryRaw,
      validationRaw,
      reportRaw: coverageRaw,
      coverageRaw: reportRaw,
      expectedInventorySha256: sha256(inventoryRaw),
      expectedValidationSha256: sha256(validationRaw),
    }))).toEqual(expect.arrayContaining(["GENERATION_REPORT_DRIFT", "GENERATION_COVERAGE_DRIFT"]));
  });

  it("rejects canonical generation when the retained measurement proof is absent or altered", () => {
    const fixture = bindingFixture();
    const missing = JSON.parse(fixture.inventoryRaw.toString());
    delete missing.source.measurement;
    expect(codes(validateCanonicalGenerationBindings({
      inventoryRaw: Buffer.from(JSON.stringify(missing)),
      validationRaw: fixture.validationRaw,
      reportRaw,
      coverageRaw,
      expectedInventorySha256: sha256(Buffer.from(JSON.stringify(missing))),
      expectedValidationSha256: sha256(fixture.validationRaw),
    }))).toContain("COMPONENT_BASELINE_MEASUREMENT_PROOF_INVALID");

    const altered = JSON.parse(fixture.inventoryRaw.toString());
    altered.source.measurement.report.sha256 = "9".repeat(64);
    const alteredRaw = Buffer.from(JSON.stringify(altered));
    const alteredValidationRaw = Buffer.from(JSON.stringify({
      status: "PASS",
      data: {
        phase: "admission",
        inventory_sha256: sha256(alteredRaw),
        candidate_digest: retainedMeasurement().candidate.inner_sha256,
        author_ids: ["author"],
        review_source: "local-agent",
        reviewer_identity_assurance: "asserted-local",
        author_identity_assurance: "asserted-local",
        bootstrap: false,
        predecessor_baseline_sha256: "1".repeat(64),
      },
    }));
    expect(codes(validateCanonicalGenerationBindings({
      inventoryRaw: alteredRaw,
      validationRaw: alteredValidationRaw,
      reportRaw,
      coverageRaw,
      expectedInventorySha256: sha256(alteredRaw),
      expectedValidationSha256: sha256(alteredValidationRaw),
    }))).toContain("COMPONENT_BASELINE_MEASUREMENT_PROOF_MISMATCH");
  });

  it("rejects inventory and admission bytes that drift after their initial validation", () => {
    const { inventoryRaw, validationRaw } = bindingFixture();
    const driftedInventory = Buffer.concat([inventoryRaw, Buffer.from(" ")]);
    const driftedValidation = Buffer.concat([validationRaw, Buffer.from(" ")]);
    expect(codes(validateCanonicalGenerationBindings({
      inventoryRaw: driftedInventory,
      validationRaw: driftedValidation,
      reportRaw,
      coverageRaw,
      expectedInventorySha256: sha256(inventoryRaw),
      expectedValidationSha256: sha256(validationRaw),
    }))).toEqual(expect.arrayContaining([
      "GENERATION_INVENTORY_DRIFT",
      "GENERATION_ADMISSION_DRIFT",
      "GENERATION_ADMISSION_BINDING_MISMATCH",
    ]));
  });

  it("rejects re-read reviews changed to REJECT or the wrong inventory hash", () => {
    const inventorySha = "1".repeat(64);
    const qualityRaw = `Decision: REJECT\nInventory SHA-256: ${inventorySha}\nCandidate Digest: ${retainedMeasurement().candidate.inner_sha256}\nReviewer: quality-reviewer\nReviewer Role: read-only\nSource: local-agent\nReviewer Identity Assurance: asserted-local\nAuthor Identity Assurance: asserted-local\n`;
    const securityRaw = `Decision: APPROVE\nInventory SHA-256: ${"2".repeat(64)}\nCandidate Digest: ${retainedMeasurement().candidate.inner_sha256}\nReviewer: security-reviewer\nReviewer Role: read-only\nSource: local-agent\nReviewer Identity Assurance: asserted-local\nAuthor Identity Assurance: asserted-local\n`;
    expect(codes(validateReviewBuffers({
      qualityRaw,
      securityRaw,
      inventorySha256: inventorySha,
      candidateDigest: retainedMeasurement().candidate.inner_sha256,
      disallowedReviewers: ["author"],
    }).findings)).toEqual(expect.arrayContaining(["REVIEW_DECISION", "REVIEW_SHA"]));
  });

  it("rejects baseline source hashes that differ from the admitted inventory", async () => {
    const root = await mkdtemp(join(tmpdir(), "component-baseline-integrity-"));
    roots.push(root);
    const inventory = JSON.parse(bindingFixture().inventoryRaw.toString());
    inventory.source.artifact_sha256 = "a".repeat(64);
    const inventoryRaw = Buffer.from(JSON.stringify(inventory));
    const validationRaw = Buffer.from(JSON.stringify({
      status: "PASS",
      data: {
        phase: "admission",
        inventory_sha256: sha256(inventoryRaw),
        candidate_digest: retainedMeasurement().candidate.inner_sha256,
        author_ids: ["author"],
        review_source: "local-agent",
        reviewer_identity_assurance: "asserted-local",
        author_identity_assurance: "asserted-local",
        bootstrap: true,
        predecessor_baseline_sha256: null,
      },
    }));
    const qualityReview = `Decision: APPROVE\nInventory SHA-256: ${sha256(inventoryRaw)}\nCandidate Digest: ${retainedMeasurement().candidate.inner_sha256}\nReviewer: quality-reviewer\nReviewer Role: read-only\nSource: local-agent\nReviewer Identity Assurance: asserted-local\nAuthor Identity Assurance: asserted-local\n`;
    const securityReview = `Decision: APPROVE\nInventory SHA-256: ${sha256(inventoryRaw)}\nCandidate Digest: ${retainedMeasurement().candidate.inner_sha256}\nReviewer: security-reviewer\nReviewer Role: read-only\nSource: local-agent\nReviewer Identity Assurance: asserted-local\nAuthor Identity Assurance: asserted-local\n`;
    const artifacts = new Map<string, Buffer | string>([
      ["quality/baselines/component/source.vitest.json", reportRaw],
      ["quality/baselines/component/coverage-summary.json", coverageRaw],
      ["quality/baselines/component/inventory.json", inventoryRaw],
      ["quality/baselines/component/admission.json", validationRaw],
      ["quality/reviews/component-baseline-quality.md", qualityReview],
      ["quality/reviews/component-baseline-security.md", securityReview],
    ]);
    for (const [path, contents] of artifacts) {
      const absolute = join(root, path);
      await mkdir(dirname(absolute), { recursive: true });
      await writeFile(absolute, contents);
    }
    const baseline: ComponentBaseline = {
      schema_version: 1,
      status: "admitted",
      source: {
        command: "bun run quality:baseline:measure",
        report: "quality/baselines/component/source.vitest.json",
        report_sha256: sha256(reportRaw),
        coverage: "quality/baselines/component/coverage-summary.json",
        coverage_sha256: sha256(coverageRaw),
        candidate: { record: candidateRecord, digest: innerDigest },
        measurement: {
          integrity_status: "PASS",
          command: retainedMeasurement().command,
          duration_ms: retainedMeasurement().duration_ms,
          exit_status: retainedMeasurement().exit_status,
          candidate_digest: innerDigest,
          candidate_commit: candidateRecord.commit_sha,
          comparison_base: candidateRecord.comparison_base,
          profile: "Q2_CRITICAL_CHANGE_GATE",
          report_sha256: sha256(reportRaw),
          coverage_sha256: sha256(coverageRaw),
        },
      },
      admission: {
        inventory: "quality/baselines/component/inventory.json",
        inventory_sha256: sha256(inventoryRaw),
        validation_artifact: "quality/baselines/component/admission.json",
        validation_sha256: sha256(validationRaw),
        quality_review_artifact: "quality/reviews/component-baseline-quality.md",
        quality_review_sha256: sha256(qualityReview),
        security_review_artifact: "quality/reviews/component-baseline-security.md",
        security_review_sha256: sha256(securityReview),
        candidate_digest: innerDigest,
        author_ids: ["author"],
        quality_reviewer: "quality-reviewer",
        security_reviewer: "security-reviewer",
        review_source: "local-agent",
        reviewer_identity_assurance: "asserted-local",
        author_identity_assurance: "asserted-local",
        bootstrap: true,
        predecessor_baseline_sha256: null,
      },
      suite: { test_files: [], total_tests: 0 },
      allowed_failures: [],
      coverage: JSON.parse(coverageRaw.toString()) as ComponentBaseline["coverage"],
    };
    expect(codes(await validateCanonicalBaselineArtifacts(root, baseline))).toContain(
      "COMPONENT_BASELINE_SOURCE_INVENTORY_MISMATCH",
    );
    const substitutedCoverage = structuredClone(baseline);
    for (const metrics of Object.values(substitutedCoverage.coverage)) {
      for (const value of Object.values(metrics)) {
        value.covered = 0;
        value.pct = 0;
      }
    }
    expect(codes(await validateCanonicalBaselineArtifacts(root, substitutedCoverage))).toContain(
      "COMPONENT_BASELINE_EMBEDDED_COVERAGE_MISMATCH",
    );
    await writeFile(join(root, "quality/baselines/component/inventory.json"), "{}\n");
    await expect(validateCanonicalBaselineArtifacts(root, baseline)).resolves.toEqual(
      expect.arrayContaining([expect.objectContaining({ code: "COMPONENT_BASELINE_INVENTORY_MALFORMED" })]),
    );
  });

  it("rejects exact review buffers changed to REJECT or the wrong inventory hash", () => {
    const inventorySha = "1".repeat(64);
    const approved = (reviewer: string) => `Decision: APPROVE\nInventory SHA-256: ${inventorySha}\nCandidate Digest: ${retainedMeasurement().candidate.inner_sha256}\nReviewer: ${reviewer}\nReviewer Role: read-only\nSource: local-agent\nReviewer Identity Assurance: asserted-local\nAuthor Identity Assurance: asserted-local\n`;
    const result = validateReviewBuffers({
      qualityRaw: approved("quality-reviewer").replace("APPROVE", "REJECT"),
      securityRaw: approved("security-reviewer").replace(inventorySha, "2".repeat(64)),
      inventorySha256: inventorySha,
      candidateDigest: retainedMeasurement().candidate.inner_sha256,
      disallowedReviewers: ["author"],
    });
    expect(codes(result.findings)).toEqual(expect.arrayContaining(["REVIEW_DECISION", "REVIEW_SHA"]));
  });

  it("rejects duplicate, contradictory, or unknown review fields", () => {
    const inventorySha = "1".repeat(64);
    const approved = (reviewer: string) => `Decision: APPROVE\nInventory SHA-256: ${inventorySha}\nCandidate Digest: ${innerDigest}\nReviewer: ${reviewer}\nReviewer Role: read-only\nSource: local-agent\nReviewer Identity Assurance: asserted-local\nAuthor Identity Assurance: asserted-local\n`;
    const result = validateReviewBuffers({
      qualityRaw: `${approved("quality-reviewer")}Decision: REJECT\n`,
      securityRaw: `${approved("security-reviewer")}Finding: none\n`,
      inventorySha256: inventorySha,
      candidateDigest: innerDigest,
      disallowedReviewers: ["author"],
    });

    expect(codes(result.findings)).toEqual(expect.arrayContaining(["REVIEW_DECISION", "REVIEW_SHA"]));
  });

  it("rejects reviewer whitespace aliases", () => {
    const inventorySha = "1".repeat(64);
    const approved = (reviewer: string) => `Decision: APPROVE\nInventory SHA-256: ${inventorySha}\nCandidate Digest: ${innerDigest}\nReviewer: ${reviewer}\nReviewer Role: read-only\nSource: local-agent\nReviewer Identity Assurance: asserted-local\nAuthor Identity Assurance: asserted-local\n`;
    const authorAlias = validateReviewBuffers({
      qualityRaw: approved("author "),
      securityRaw: approved("security-reviewer"),
      inventorySha256: inventorySha,
      candidateDigest: innerDigest,
      disallowedReviewers: ["author"],
    });
    const duplicateAlias = validateReviewBuffers({
      qualityRaw: approved("same-reviewer"),
      securityRaw: approved("same-reviewer "),
      inventorySha256: inventorySha,
      candidateDigest: innerDigest,
      disallowedReviewers: [],
    });

    expect(codes(authorAlias.findings)).toContain("REVIEW_DECISION");
    expect(codes(duplicateAlias.findings)).toContain("REVIEW_DECISION");
  });

  it("requires honest local identity assurance in both exact review buffers", () => {
    const inventorySha = "1".repeat(64);
    const approved = (reviewer: string) => `Decision: APPROVE\nInventory SHA-256: ${inventorySha}\nCandidate Digest: ${innerDigest}\nReviewer: ${reviewer}\nReviewer Role: read-only\nSource: local-agent\nReviewer Identity Assurance: asserted-local\nAuthor Identity Assurance: asserted-local\n`;
    const result = validateReviewBuffers({
      qualityRaw: approved("quality-reviewer").replace("Source: local-agent\n", ""),
      securityRaw: approved("security-reviewer").replace("Author Identity Assurance: asserted-local\n", ""),
      inventorySha256: inventorySha,
      candidateDigest: innerDigest,
      disallowedReviewers: ["author"],
    });
    expect(codes(result.findings)).toEqual(expect.arrayContaining(["REVIEW_SOURCE", "AUTHOR_IDENTITY_ASSURANCE"]));
  });

  it("keeps UNIT-000 disposition evidence tracked, candidate-bound, and fail-closed", async () => {
    const matrix = await readFile(
      join(process.cwd(), ".ai/03_plans/2026-07-31/Code-Improvement/03-VERIFICATION-MATRIX.md"),
      "utf8",
    );
    const authorityContract = matrix.split("## Plan-State Evidence")[1] ?? "";

    expect(authorityContract).toContain("unit-000-untracked-hardlink-");
    expect(authorityContract).toContain("git ls-files --error-unmatch");
    expect(authorityContract).toContain("$ignoreStatus -ne 1");
    expect(authorityContract).toContain("Disposition evidence must be tracked candidate content");
    expect(authorityContract).toContain("$candidateEntry[0].sha256 -ne $observedEvidenceSha");
    expect(authorityContract).toContain("Predecessor evidence became untracked during UNIT-000 Q2 verification");
    expect(authorityContract).toContain("[IO.FileAttributes]::ReparsePoint");
  });
});
