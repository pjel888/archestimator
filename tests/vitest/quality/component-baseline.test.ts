import { mkdtemp, mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { tmpdir } from "node:os";
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import {
  buildBaselineInventory,
  stableBaselineRecordId,
  type BaselineInventory,
  type InventoryBuildInput,
  type RatchetProposal,
} from "../../../scripts/quality/component-baseline-core";
import { validateBaselineAdmission } from "../../../scripts/quality/validate-baseline-admission";
import { sha256 } from "../../../scripts/quality/common";
import type { VitestJsonReport } from "../../../scripts/quality/component-core";

const qualityScriptDirectory = resolve(process.cwd(), "scripts", "quality");
const componentBaselineCli = join(qualityScriptDirectory, "component-baseline.ts");
const baselineAdmissionCli = join(qualityScriptDirectory, "validate-baseline-admission.ts");

const generatedAt = "2026-07-26T00:00:00.000Z";
const commit = "a".repeat(40);
const evidenceMap = {
  schema_version: 1 as const,
  component_scope_patterns: ["src/**/*.tsx"],
  affected_rules: [],
  critical_capabilities: { "CAP-AUTH": ["tests/vitest/auth-*.test.tsx"] },
};
const capabilities = [{ id: "CAP-AUTH", name: "Authentication", critical: true as const }];

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
    command: "bun run quality:baseline:measure", commit, generatedAt, root: "/repo",
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

  it("proposes only an explicitly owned reasoned acceptance-bound future noncritical assertion", () => {
    const unowned = buildBaselineInventory(input());
    const proposed = buildBaselineInventory(input({ proposals: proposalFor(unowned.records[0]!) }));
    expect(unowned.records[0]).toMatchObject({ classification: "must_fix_noncritical", status: "open" });
    expect(proposed.records[0]).toMatchObject({ classification: "ratchet_noncritical", status: "proposed", owner: "component-owner" });
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
    expect(Object.keys(scripts)).toEqual(expect.arrayContaining(["quality:baseline:measure", "quality:baseline:draft", "quality:baseline:validate", "quality:baseline:generate"]));
    expect(scripts["quality:baseline:generate"]).not.toContain("validate-baseline-admission");
    expect(readFileSync("quality/schemas/baseline-admission.schema.json", "utf8")).not.toContain("reviewed_inventory_sha256");
  });
});

async function writeFixture(): Promise<{ root: string; inventoryPath: string; inventory: BaselineInventory }> {
  const root = await mkdtemp(join(tmpdir(), "arch-baseline-"));
  const reportPath = "quality/baselines/component/source.vitest.json";
  const coveragePath = "quality/baselines/component/coverage-summary.json";
  const candidatePath = "artifacts/quality/candidate-checkpoints/measurement-input.json";
  const reportText = JSON.stringify(report("passed"));
  const coverageText = JSON.stringify({ total: {} });
  const candidateText = JSON.stringify({ status: "PASS", digest: "candidate" });
  for (const path of [reportPath, coveragePath, candidatePath, "quality/reviews/component-baseline-quality.md", "quality/reviews/component-baseline-security.md", "quality/component-evidence-map.json", "quality/critical-capabilities.json"]) await mkdir(dirname(join(root, path)), { recursive: true });
  await writeFile(join(root, reportPath), reportText);
  await writeFile(join(root, coveragePath), coverageText);
  await writeFile(join(root, candidatePath), candidateText);
  await writeFile(join(root, "quality/component-evidence-map.json"), readFileSync("quality/component-evidence-map.json", "utf8"));
  await writeFile(join(root, "quality/critical-capabilities.json"), readFileSync("quality/critical-capabilities.json", "utf8"));
  const inventory = buildBaselineInventory(input({
    report: report("passed"), root, phase: "admission", reportPath, reportSha256: sha256(reportText),
    coveragePath, coverageSha256: sha256(coverageText), candidatePath, candidateSha256: sha256(candidateText),
  }));
  const inventoryPath = join(root, "quality/baselines/component/inventory.json");
  await mkdir(dirname(inventoryPath), { recursive: true });
  await writeFile(inventoryPath, `${JSON.stringify(inventory, null, 2)}\n`);
  const inventorySha = sha256(await readFile(inventoryPath));
  const review = (reviewer: string) => `Decision: APPROVE\nInventory SHA-256: ${inventorySha}\nCandidate SHA-256: ${inventory.source.candidate_sha256}\nReviewer: ${reviewer}\nReviewer Role: read-only\n`;
  await writeFile(join(root, inventory.admission.quality_review.artifact), review("quality-reviewer"));
  await writeFile(join(root, inventory.admission.security_review.artifact), review("security-reviewer"));
  return { root, inventoryPath, inventory };
}

describe("component baseline admission validation", () => {
  it("accepts exact immutable sources and two read-only non-author reviews bound to inventory and candidate", async () => {
    const fixture = await writeFixture();
    const result = await validateBaselineAdmission({ root: fixture.root, inventoryPath: fixture.inventoryPath, phase: "admission", disallowedReviewers: ["author"], now: Date.parse(generatedAt) });
    expect(result.findings).toEqual([]);
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

  it("rejects same, author, non-read-only, and candidate-mismatched reviewers", async () => {
    const fixture = await writeFixture();
    const inventorySha = sha256(await readFile(fixture.inventoryPath));
    const bad = `Decision: APPROVE\nInventory SHA-256: ${inventorySha}\nCandidate SHA-256: ${"f".repeat(64)}\nReviewer: author\nReviewer Role: writer\n`;
    await writeFile(join(fixture.root, fixture.inventory.admission.quality_review.artifact), bad);
    await writeFile(join(fixture.root, fixture.inventory.admission.security_review.artifact), bad);
    const result = await validateBaselineAdmission({ root: fixture.root, inventoryPath: fixture.inventoryPath, phase: "admission", disallowedReviewers: ["author"], now: Date.parse(generatedAt) });
    expect(result.findings.map((finding) => finding.code)).toEqual(expect.arrayContaining(["REVIEW_CANDIDATE_SHA", "REVIEWER_NOT_READ_ONLY", "REVIEWER_NOT_INDEPENDENT", "REVIEWER_IS_AUTHOR"]));
  });

  it("generates a canonical candidate only after the separate admission validator passes", async () => {
    const fixture = await writeFixture();
    const admissionPath = join(fixture.root, "quality/baselines/component/admission.json");
    const baselinePath = join(fixture.root, "artifacts/quality/baseline.generated.json");
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
      source: { report: "quality/baselines/component/source.vitest.json" },
      admission: {
        inventory: "quality/baselines/component/inventory.json",
        validation_artifact: "quality/baselines/component/admission.json",
      },
    });
    expect(await readFile(admissionPath, "utf8")).toContain('"status": "PASS"');
  });
});
