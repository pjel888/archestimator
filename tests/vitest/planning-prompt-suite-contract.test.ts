import {
  cpSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { createHash } from "node:crypto";
import { dirname, join } from "node:path";
import { tmpdir } from "node:os";
import { spawnSync } from "node:child_process";

import { afterEach, describe, expect, it } from "vitest";

const root = process.cwd();
const fixture = join(root, "tests/fixtures/planning-prompt-suite/valid-plan-pack");
const promptSuite = join(root, ".ai/08_prompts/000_Planning Prompts");
const tempRoots: string[] = [];
const existingFocusedTestPath = "tests/vitest/account-membership-d1.test.ts";
const existingFocusedTestHash = createHash("sha256")
  .update(readFileSync(join(root, existingFocusedTestPath)))
  .digest("hex");
const secondExistingFocusedTestPath = "tests/vitest/activity-composer.test.ts";
const secondExistingFocusedTestHash = createHash("sha256")
  .update(readFileSync(join(root, secondExistingFocusedTestPath)))
  .digest("hex");
const baselineHead = spawnSync("git", ["rev-parse", "HEAD"], {
  cwd: root,
  encoding: "utf8",
}).stdout.trim();

function existingFocusedTestFields() {
  return {
    execution_mode: "EXISTING_READ_ONLY",
    existing_test_path: existingFocusedTestPath,
    test_command: `bunx vitest run ${existingFocusedTestPath} --maxWorkers=1`,
    existing_test_sha256: existingFocusedTestHash,
  };
}

function runValidator(folder: string, args: string[] = []) {
  return spawnSync(process.execPath, ["scripts/validate-plan-pack.mjs", ...args, folder], {
    cwd: root,
    encoding: "utf8",
  });
}

function runSuiteValidator(folder: string) {
  return spawnSync(process.execPath, ["scripts/validate-planning-prompt-suite.mjs"], {
    cwd: root,
    encoding: "utf8",
    env: { ...process.env, PLANNING_PROMPT_SUITE_ROOT: folder },
  });
}

function copyFixture() {
  const tempRoot = mkdtempSync(join(tmpdir(), "archestimator-plan-pack-"));
  tempRoots.push(tempRoot);
  const target = join(tempRoot, "pack");
  cpSync(fixture, target, { recursive: true });
  return target;
}

function readManifest(folder: string) {
  return JSON.parse(readFileSync(join(folder, "plan-pack.json"), "utf8")) as Record<string, unknown>;
}

function mutateManifest(folder: string, mutate: (manifest: Record<string, unknown>) => void) {
  const path = join(folder, "plan-pack.json");
  const manifest = readManifest(folder);
  mutate(manifest);
  writeFileSync(path, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
}

afterEach(() => {
  for (const path of tempRoots.splice(0)) {
    rmSync(path, { recursive: true, force: true });
  }
});

describe("frontier planning prompt contracts", () => {
  it("accepts the canonical semantic plan-pack fixture", () => {
    const result = runValidator(fixture);

    expect(result.status, result.stderr).toBe(0);
    expect(result.stdout).toContain("plan-pack validation passed");
  });

  it("requires every selected test to pass before its criterion passes", () => {
    const folder = copyFixture();
    mutateManifest(folder, (manifest) => {
      const criteria = manifest.criteria as Array<Record<string, unknown>>;
      criteria[0].test_requirement = "TARGETED";
      criteria[0].test_trigger = "MVP_CRITICAL_INVARIANT";
      criteria[0].test_rationale = "Static inspection cannot prove that required tests block a passing criterion.";
      criteria[0].test_ids = ["TEST-001"];
      manifest.tests = [{
        id: "TEST-001",
        status: "SKIPPED",
        artifact_path: "IMPLEMENTATION_PLAN.md",
        criterion_ids: ["AC-001"],
        evidence_ids: [],
      }];
    });

    const result = runValidator(folder);

    expect(result.status).toBe(1);
    expect(result.stderr).toContain(
      "AC-001 MVP_CRITICAL_INVARIANT rationale must name the critical invariant and explain why cheaper evidence is insufficient",
    );
  });

  it("requires a trigger and rationale for every new-suite test decision", () => {
    const folder = copyFixture();
    mutateManifest(folder, (manifest) => {
      const criteria = manifest.criteria as Array<Record<string, unknown>>;
      delete criteria[0].test_trigger;
      delete criteria[0].test_rationale;
    });

    const result = runValidator(folder);

    expect(result.status).toBe(1);
    expect(result.stderr).toContain("test_trigger expected NONE, EXPLICIT_TEST_TASK, MVP_CRITICAL_INVARIANT, or CHEAPEST_DECISIVE_EXISTING_TEST");
    expect(result.stderr).toContain("test_rationale must be a non-empty string");
  });

  it("requires broader verification to explain why targeted evidence is insufficient", () => {
    const folder = copyFixture();
    mutateManifest(folder, (manifest) => {
      const criteria = manifest.criteria as Array<Record<string, unknown>>;
      criteria[0].test_requirement = "BROADER";
      criteria[0].test_trigger = "MVP_CRITICAL_INVARIANT";
      criteria[0].test_rationale = "Run a broad suite for confidence.";
    });

    const result = runValidator(folder);

    expect(result.status).toBe(1);
    expect(result.stderr).toContain("BROADER must explain why targeted evidence is insufficient");
  });

  it("reserves TEST_TASK for an explicit testing request", () => {
    const folder = copyFixture();
    mutateManifest(folder, (manifest) => {
      const criteria = manifest.criteria as Array<Record<string, unknown>>;
      criteria[0].test_requirement = "TEST_TASK";
      criteria[0].test_trigger = "MVP_CRITICAL_INVARIANT";
      criteria[0].test_rationale = "The criterion needs testing-specific evidence for a critical invariant.";
    });

    const result = runValidator(folder);

    expect(result.status).toBe(1);
    expect(result.stderr).toContain("TEST_TASK requires test_trigger EXPLICIT_TEST_TASK");
  });

  it("rejects the explicit-test trigger outside TEST_TASK", () => {
    const folder = copyFixture();
    mutateManifest(folder, (manifest) => {
      const criteria = manifest.criteria as Array<Record<string, unknown>>;
      criteria[0].test_requirement = "TARGETED";
      criteria[0].test_trigger = "EXPLICIT_TEST_TASK";
      criteria[0].test_rationale = "The user explicitly requested a testing deliverable, so TARGETED is intentionally invalid.";
    });

    const result = runValidator(folder);

    expect(result.status).toBe(1);
    expect(result.stderr).toContain("EXPLICIT_TEST_TASK requires test_requirement TEST_TASK");
    expect(result.stderr).toContain("TARGETED requires test_trigger MVP_CRITICAL_INVARIANT or CHEAPEST_DECISIVE_EXISTING_TEST");
  });

  it("rejects BROADER without an integrated critical trigger", () => {
    const folder = copyFixture();
    mutateManifest(folder, (manifest) => {
      const criteria = manifest.criteria as Array<Record<string, unknown>>;
      criteria[0].test_requirement = "BROADER";
      criteria[0].test_trigger = "EXPLICIT_TEST_TASK";
      criteria[0].test_rationale = "Targeted evidence is insufficient because the integrated boundary needs a broad suite.";
    });

    const result = runValidator(folder);

    expect(result.status).toBe(1);
    expect(result.stderr).toContain("BROADER requires test_trigger MVP_CRITICAL_INVARIANT");
  });

  it("allows one existing focused test when it is the cheapest decisive proof", () => {
    const folder = copyFixture();
    mutateManifest(folder, (manifest) => {
      const criteria = manifest.criteria as Array<Record<string, unknown>>;
      criteria[0].test_requirement = "TARGETED";
      criteria[0].test_trigger = "CHEAPEST_DECISIVE_EXISTING_TEST";
      criteria[0].test_rationale = "The existing focused validator test is the cheapest decisive proof of this parser behavior.";
      criteria[0].test_ids = ["TEST-001"];
      (manifest.baseline as Record<string, unknown>).head = baselineHead;
      manifest.tests = [{
        id: "TEST-001",
        status: "PASS",
        artifact_path: "IMPLEMENTATION_PLAN.md",
        criterion_ids: ["AC-001"],
        evidence_ids: ["EVID-001"],
        ...existingFocusedTestFields(),
      }];
      const evidence = manifest.evidence_index as Array<Record<string, unknown>>;
      (evidence[0].claim_ids as string[]).push("TEST-001");
    });

    const writeResult = runValidator(folder, ["--write"]);
    const result = runValidator(folder);

    expect(writeResult.status).toBe(0);
    expect(result.status).toBe(0);
  });

  it("rejects a vague critical-invariant rationale", () => {
    const folder = copyFixture();
    mutateManifest(folder, (manifest) => {
      const criteria = manifest.criteria as Array<Record<string, unknown>>;
      criteria[0].test_requirement = "TARGETED";
      criteria[0].test_trigger = "MVP_CRITICAL_INVARIANT";
      criteria[0].test_rationale = "Run focused tests for general confidence.";
      criteria[0].test_ids = ["TEST-001"];
      manifest.tests = [{
        id: "TEST-001",
        status: "PASS",
        artifact_path: "IMPLEMENTATION_PLAN.md",
        criterion_ids: ["AC-001"],
        evidence_ids: ["EVID-001"],
      }];
      const evidence = manifest.evidence_index as Array<Record<string, unknown>>;
      (evidence[0].claim_ids as string[]).push("TEST-001");
    });

    const result = runValidator(folder);

    expect(result.status).toBe(1);
    expect(result.stderr).toContain("MVP_CRITICAL_INVARIANT rationale must name the critical invariant and explain why cheaper evidence is insufficient");
  });

  it("requires exactly one test for the existing-test exception", () => {
    const folder = copyFixture();
    mutateManifest(folder, (manifest) => {
      const criteria = manifest.criteria as Array<Record<string, unknown>>;
      criteria[0].test_requirement = "TARGETED";
      criteria[0].test_trigger = "CHEAPEST_DECISIVE_EXISTING_TEST";
      criteria[0].test_rationale = "The existing focused validator test is the cheapest decisive proof of this parser behavior.";
      criteria[0].test_ids = ["TEST-001", "TEST-002"];
      (manifest.baseline as Record<string, unknown>).head = baselineHead;
      manifest.tests = ["TEST-001", "TEST-002"].map((id) => ({
        id,
        status: "PASS",
        artifact_path: "IMPLEMENTATION_PLAN.md",
        criterion_ids: ["AC-001"],
        evidence_ids: ["EVID-001"],
        ...existingFocusedTestFields(),
      }));
      const evidence = manifest.evidence_index as Array<Record<string, unknown>>;
      (evidence[0].claim_ids as string[]).push("TEST-001", "TEST-002");
    });

    const result = runValidator(folder);

    expect(result.status).toBe(1);
    expect(result.stderr).toContain(
      "CHEAPEST_DECISIVE_EXISTING_TEST permits at most one proposal test_id",
    );
  });

  it("rejects distinct existing-test exceptions across one plan pack", () => {
    const folder = copyFixture();
    mutateManifest(folder, (manifest) => {
      const criteria = manifest.criteria as Array<Record<string, unknown>>;
      criteria[0].test_requirement = "TARGETED";
      criteria[0].test_trigger = "CHEAPEST_DECISIVE_EXISTING_TEST";
      criteria[0].test_rationale = "The first existing focused test is the cheapest decisive proof for this criterion.";
      criteria[0].test_ids = ["TEST-001"];
      criteria.push({
        ...criteria[0],
        id: "AC-002",
        test_rationale: "The second existing focused test is the cheapest decisive proof for this other criterion.",
        test_ids: ["TEST-002"],
      });
      for (const requirement of manifest.requirements as Array<Record<string, unknown>>) {
        (requirement.criterion_ids as string[]).push("AC-002");
      }
      const gates = manifest.gates as Array<Record<string, unknown>>;
      (gates[0].criterion_ids as string[]).push("AC-002");
      (manifest.baseline as Record<string, unknown>).head = baselineHead;
      manifest.tests = [
        {
          id: "TEST-001",
          status: "PASS",
          artifact_path: "IMPLEMENTATION_PLAN.md",
          criterion_ids: ["AC-001"],
          evidence_ids: ["EVID-001"],
          ...existingFocusedTestFields(),
        },
        {
          id: "TEST-002",
          status: "PASS",
          artifact_path: "IMPLEMENTATION_PLAN.md",
          criterion_ids: ["AC-002"],
          evidence_ids: ["EVID-001"],
          execution_mode: "EXISTING_READ_ONLY",
          existing_test_path: secondExistingFocusedTestPath,
          test_command: `bunx vitest run ${secondExistingFocusedTestPath} --maxWorkers=1`,
          existing_test_sha256: secondExistingFocusedTestHash,
        },
      ];
      const evidence = manifest.evidence_index as Array<Record<string, unknown>>;
      (evidence[0].claim_ids as string[]).push("AC-002", "TEST-001", "TEST-002");
    });

    const result = runValidator(folder);

    expect(result.status).toBe(1);
    expect(result.stderr).toContain(
      "linked CHEAPEST_DECISIVE_EXISTING_TEST proposal metadata permits exactly one shared test_id and existing_test_path per plan pack",
    );
  });

  it("rejects a fabricated existing-test record without baseline-bound identity", () => {
    const folder = copyFixture();
    mutateManifest(folder, (manifest) => {
      const criteria = manifest.criteria as Array<Record<string, unknown>>;
      criteria[0].test_requirement = "TARGETED";
      criteria[0].test_trigger = "CHEAPEST_DECISIVE_EXISTING_TEST";
      criteria[0].test_rationale = "The claimed existing test is the cheapest decisive proof, but its identity is fabricated.";
      criteria[0].test_ids = ["TEST-001"];
      manifest.tests = [{
        id: "TEST-001",
        status: "PASS",
        artifact_path: "IMPLEMENTATION_PLAN.md",
        criterion_ids: ["AC-001"],
        evidence_ids: ["EVID-001"],
      }];
      const evidence = manifest.evidence_index as Array<Record<string, unknown>>;
      (evidence[0].claim_ids as string[]).push("TEST-001");
    });

    const result = runValidator(folder);

    expect(result.status).toBe(1);
    expect(result.stderr).toContain("execution_mode must be EXISTING_READ_ONLY");
    expect(result.stderr).toContain("existing_test_path must be a non-empty string");
    expect(result.stderr).toContain("requires an exact Git commit in baseline.head");
  });

  it("rejects shell composition in the one-existing-test command", () => {
    const folder = copyFixture();
    mutateManifest(folder, (manifest) => {
      const criteria = manifest.criteria as Array<Record<string, unknown>>;
      criteria[0].test_requirement = "TARGETED";
      criteria[0].test_trigger = "CHEAPEST_DECISIVE_EXISTING_TEST";
      criteria[0].test_rationale = "The existing focused test is the cheapest decisive proof, but the command smuggles a broad suite.";
      criteria[0].test_ids = ["TEST-001"];
      (manifest.baseline as Record<string, unknown>).head = baselineHead;
      manifest.tests = [{
        id: "TEST-001",
        status: "PASS",
        artifact_path: "IMPLEMENTATION_PLAN.md",
        criterion_ids: ["AC-001"],
        evidence_ids: ["EVID-001"],
        ...existingFocusedTestFields(),
        test_command: `bunx vitest run ${existingFocusedTestPath} --maxWorkers=1 && bun test`,
      }];
      const evidence = manifest.evidence_index as Array<Record<string, unknown>>;
      (evidence[0].claim_ids as string[]).push("TEST-001");
    });

    const result = runValidator(folder);

    expect(result.status).toBe(1);
    expect(result.stderr).toContain("one direct command without shell composition");
  });

  it("rejects shell-active existing-test selectors", () => {
    for (const unsafePath of [
      "tests/vitest/account-membership-d1*.test.ts",
      "tests/vitest/$FOCUSED_TEST.test.ts",
      "tests/vitest/account-membership-d1?.test.ts",
      "tests/vitest/account-membership-d1[0].test.ts",
      "tests/vitest/account-membership-d1{a,b}.test.ts",
    ]) {
      const folder = copyFixture();
      mutateManifest(folder, (manifest) => {
        const criteria = manifest.criteria as Array<Record<string, unknown>>;
        criteria[0].test_requirement = "TARGETED";
        criteria[0].test_trigger = "CHEAPEST_DECISIVE_EXISTING_TEST";
        criteria[0].test_rationale = "The existing focused test is claimed as cheapest decisive proof, but its selector is shell-active.";
        criteria[0].test_ids = ["TEST-001"];
        (manifest.baseline as Record<string, unknown>).head = baselineHead;
        manifest.tests = [{
          id: "TEST-001",
          status: "PASS",
          artifact_path: "IMPLEMENTATION_PLAN.md",
          criterion_ids: ["AC-001"],
          evidence_ids: ["EVID-001"],
          ...existingFocusedTestFields(),
          existing_test_path: unsafePath,
          test_command: `bunx vitest run ${unsafePath} --maxWorkers=1`,
        }];
        const evidence = manifest.evidence_index as Array<Record<string, unknown>>;
        (evidence[0].claim_ids as string[]).push("TEST-001");
      });

      const result = runValidator(folder);

      expect(result.status, unsafePath).toBe(1);
      expect(result.stderr, unsafePath).toContain("existing_test_path must be a shell-inert repository-relative path");
      expect(result.stderr, unsafePath).toContain("test_command must be one direct command without shell composition");
    }
  });

  it("rejects mutating, excluding, false-pass, and scope-changing existing-test flags", () => {
    const unsafeFlags = [
      "--update",
      `--exclude=${existingFocusedTestPath}`,
      "--passWithNoTests",
      "--watch",
      "--config=vitest.config.ts",
      "--setupFiles=tests/setup.ts",
      "--shard=1/2",
      "--project=unit",
      "--maxWorkers=2",
      "--minWorkers=1",
      "--no-color",
      "--no-warnings",
      "--test-concurrency=1",
    ];

    for (const unsafeFlag of unsafeFlags) {
      const folder = copyFixture();
      mutateManifest(folder, (manifest) => {
        const criteria = manifest.criteria as Array<Record<string, unknown>>;
        criteria[0].test_requirement = "TARGETED";
        criteria[0].test_trigger = "CHEAPEST_DECISIVE_EXISTING_TEST";
        criteria[0].test_rationale = "The existing focused test is the cheapest decisive proof, but this option violates read-only execution.";
        criteria[0].test_ids = ["TEST-001"];
        (manifest.baseline as Record<string, unknown>).head = baselineHead;
        manifest.tests = [{
          id: "TEST-001",
          status: "PASS",
          artifact_path: "IMPLEMENTATION_PLAN.md",
          criterion_ids: ["AC-001"],
          evidence_ids: ["EVID-001"],
          ...existingFocusedTestFields(),
          test_command: `bunx vitest run ${existingFocusedTestPath} ${unsafeFlag}`,
        }];
        const evidence = manifest.evidence_index as Array<Record<string, unknown>>;
        (evidence[0].claim_ids as string[]).push("TEST-001");
      });

      const result = runValidator(folder);

      expect(result.status, unsafeFlag).toBe(1);
      expect(result.stderr, unsafeFlag).toContain(
        "test_command options after existing_test_path must be read-only and runner-allowlisted",
      );
    }
  });

  it("rejects the existing-test trigger outside TARGETED", () => {
    const folder = copyFixture();
    mutateManifest(folder, (manifest) => {
      const criteria = manifest.criteria as Array<Record<string, unknown>>;
      criteria[0].test_requirement = "BROADER";
      criteria[0].test_trigger = "CHEAPEST_DECISIVE_EXISTING_TEST";
      criteria[0].test_rationale = "The existing focused test is the cheapest decisive proof, but this mapping is intentionally invalid.";
    });

    const result = runValidator(folder);

    expect(result.status).toBe(1);
    expect(result.stderr).toContain(
      "CHEAPEST_DECISIVE_EXISTING_TEST requires test_requirement TEST_PROPOSAL or legacy TARGETED",
    );
  });

  it("rejects an observed run scope above the package action ceiling", () => {
    const folder = copyFixture();
    mutateManifest(folder, (manifest) => {
      manifest.package_action_ceiling = "IMPLEMENT_LOCAL";
      manifest.last_observed_run_scope = "EXTERNAL_ACTIONS";
    });

    const result = runValidator(folder);

    expect(result.status).toBe(1);
    expect(result.stderr).toContain("EXTERNAL_ACTIONS exceeds package_action_ceiling IMPLEMENT_LOCAL");
  });

  it("rejects stale artifact evidence", () => {
    const folder = copyFixture();
    writeFileSync(join(folder, "evidence/check.txt"), "changed after validation\n", "utf8");

    const result = runValidator(folder);

    expect(result.status).toBe(1);
    expect(result.stderr).toContain("hash mismatch");
  });

  it("does not let --write launder changed proof or mutate an invalid manifest", () => {
    const folder = copyFixture();
    const manifestBefore = readFileSync(join(folder, "plan-pack.json"), "utf8");
    writeFileSync(join(folder, "evidence/check.txt"), "changed without a proof rerun\n", "utf8");

    const result = runValidator(folder, ["--write"]);

    expect(result.status).toBe(1);
    expect(result.stderr).toContain("mark STALE or attach a fresh proof receipt");
    expect(readFileSync(join(folder, "plan-pack.json"), "utf8")).toBe(manifestBefore);
  });

  it("does not let --write launder a changed current source or canonical artifact", () => {
    const folder = copyFixture();
    const manifestBefore = readFileSync(join(folder, "plan-pack.json"), "utf8");
    writeFileSync(join(folder, "IMPLEMENTATION_PLAN.md"), "changed after terminal proof\n", "utf8");

    const result = runValidator(folder, ["--write"]);

    expect(result.status).toBe(1);
    expect(result.stderr).toContain("changed while SRC-001=CURRENT");
    expect(result.stderr).toContain("changed after closed claims");
    expect(readFileSync(join(folder, "plan-pack.json"), "utf8")).toBe(manifestBefore);
  });

  it("lets --write refresh an ordinary non-source artifact atomically", () => {
    const folder = copyFixture();
    writeFileSync(join(folder, "README.md"), "updated entrypoint metadata\n", "utf8");

    const writeResult = runValidator(folder, ["--write"]);
    const readResult = runValidator(folder);

    expect(writeResult.status).toBe(0);
    expect(readResult.status).toBe(0);
  });

  it("does not let --write refresh a changed non-canonical proof-bearing artifact", () => {
    const folder = copyFixture();
    mutateManifest(folder, (manifest) => {
      const criteria = manifest.criteria as Array<Record<string, unknown>>;
      criteria[0].artifact_path = "README.md";
      const units = manifest.units as Array<Record<string, unknown>>;
      units[0].artifact_path = "README.md";
      const decisions = manifest.decisions as Array<Record<string, unknown>>;
      decisions[0].artifact_path = "README.md";
    });
    const manifestBefore = readFileSync(join(folder, "plan-pack.json"), "utf8");
    writeFileSync(join(folder, "README.md"), "changed proof-bearing metadata\n", "utf8");

    const result = runValidator(folder, ["--write"]);

    expect(result.status).toBe(1);
    expect(result.stderr).toContain("proof-bearing records AC-001, UNIT-001, DEC-AUTO-001");
    expect(readFileSync(join(folder, "plan-pack.json"), "utf8")).toBe(manifestBefore);
  });

  it("rejects impossible achieved and archived state combinations", () => {
    const folder = copyFixture();
    mutateManifest(folder, (manifest) => {
      manifest.implementation_status = "INCOMPLETE";
      const requirements = manifest.requirements as Array<Record<string, unknown>>;
      requirements[0].status = "BLOCKED";
      const units = manifest.units as Array<Record<string, unknown>>;
      units[0].status = "BLOCKED";
      const evidence = manifest.evidence_index as Array<Record<string, unknown>>;
      evidence[0].status = "FAIL";
      manifest.next_unit = "UNIT-001";
    });

    const result = runValidator(folder, ["--write"]);

    expect(result.status).toBe(1);
    expect(result.stderr).toContain("ACHIEVED requires implementation_status COMPLETE");
    expect(result.stderr).toContain("ARCHIVED: requires terminal_status ACHIEVED and implementation_status COMPLETE");
    expect(result.stderr).toContain("not READY or IN_PROGRESS");
  });

  it("rejects achieved status while the plan lifecycle is active", () => {
    const folder = copyFixture();
    mutateManifest(folder, (manifest) => {
      manifest.plan_lifecycle = "ACTIVE";
    });

    const result = runValidator(folder);

    expect(result.status).toBe(1);
    expect(result.stderr).toContain("ACHIEVED requires plan_lifecycle N/A, ARCHIVE_READY, or ARCHIVED");
  });

  it("rejects completed implementation when the package is not implementation-ready", () => {
    const folder = copyFixture();
    mutateManifest(folder, (manifest) => {
      manifest.package_status = "NOT_READY";
    });

    const result = runValidator(folder);

    expect(result.status).toBe(1);
    expect(result.stderr).toContain("COMPLETE requires package_status IMPLEMENTATION_READY");
  });

  it("allows auxiliary closeout failures without blocking completed implementation", () => {
    const folder = copyFixture();
    mutateManifest(folder, (manifest) => {
      manifest.release_status = "NOT_EVALUATED";
      const sources = manifest.sources as Array<Record<string, unknown>>;
      sources.push({
        id: "SRC-002",
        status: "STALE",
        artifact_path: "IMPLEMENTATION_PLAN.md",
        affected_ids: ["OPS-001"],
      });
      const requirements = manifest.requirements as Array<Record<string, unknown>>;
      requirements.push({
        id: "OPS-001",
        status: "BLOCKED",
        completion_role: "AUXILIARY",
        artifact_path: "IMPLEMENTATION_PLAN.md",
        source_ids: ["SRC-002"],
        unit_ids: ["UNIT-002"],
        criterion_ids: ["AC-002"],
      });
      const criteria = manifest.criteria as Array<Record<string, unknown>>;
      criteria.push({
        id: "AC-002",
        status: "FAIL",
        artifact_path: "IMPLEMENTATION_PLAN.md",
        test_requirement: "NOT_REQUIRED",
        test_trigger: "NONE",
        test_rationale: "A failed auxiliary memory sync is recorded directly and does not require a product test.",
        requirement_ids: ["OPS-001"],
        test_ids: [],
        evidence_ids: ["EVID-002"],
        authorization_boundary_id: null,
      });
      const gates = manifest.gates as Array<Record<string, unknown>>;
      gates.push({
        id: "GATE-AUX-001",
        status: "FAIL",
        artifact_path: "IMPLEMENTATION_PLAN.md",
        criterion_ids: ["AC-002"],
        evidence_ids: ["EVID-002"],
        authorization_boundary_id: null,
      });
      const units = manifest.units as Array<Record<string, unknown>>;
      units.push({
        id: "UNIT-002",
        status: "BLOCKED",
        artifact_path: "IMPLEMENTATION_PLAN.md",
        depends_on: ["UNIT-001"],
        requirement_ids: ["OPS-001"],
        risk_ids: [],
        evidence_ids: ["EVID-002"],
      });
      const evidence = manifest.evidence_index as Array<Record<string, unknown>>;
      evidence.push({
        id: "EVID-002",
        status: "FAIL",
        artifact_path: "evidence/check.txt",
        sha256: evidence[0].sha256,
        claim_ids: ["OPS-001", "UNIT-002", "AC-002", "GATE-AUX-001"],
        source_revision: "fixture-v1",
        valid_until: null,
      });
    });

    const result = runValidator(folder, ["--write"]);

    expect(result.status).toBe(0);
    expect(result.stdout).toContain("plan-pack validation passed");

    mutateManifest(folder, (manifest) => {
      manifest.release_status = "READY";
    });
    const releaseResult = runValidator(folder);
    expect(releaseResult.status).toBe(1);
    expect(releaseResult.stderr).toContain("release_status: READY conflicts with AC-002=FAIL");
  });

  it("allows TECH_BLOCKED for a blocked core unit without rewriting an accepted requirement", () => {
    const folder = copyFixture();
    mutateManifest(folder, (manifest) => {
      manifest.package_status = "NOT_READY";
      manifest.implementation_status = "INCOMPLETE";
      manifest.release_status = "NOT_READY";
      manifest.plan_lifecycle = "N/A";
      manifest.terminal_status = "TECH_BLOCKED";
      const units = manifest.units as Array<Record<string, unknown>>;
      units[0].status = "BLOCKED";
    });

    const result = runValidator(folder, ["--write"]);

    expect(result.status, result.stderr).toBe(0);
    expect(result.stdout).toContain("plan-pack validation passed");
  });

  it("rejects TECH_BLOCKED when only auxiliary work is blocked", () => {
    const folder = copyFixture();
    mutateManifest(folder, (manifest) => {
      manifest.package_status = "NOT_READY";
      manifest.implementation_status = "INCOMPLETE";
      manifest.release_status = "NOT_READY";
      manifest.plan_lifecycle = "N/A";
      manifest.terminal_status = "TECH_BLOCKED";
      const requirements = manifest.requirements as Array<Record<string, unknown>>;
      requirements[0].completion_role = "AUXILIARY";
      requirements[0].status = "BLOCKED";
      requirements[1].completion_role = "AUXILIARY";
      requirements[1].status = "DEFERRED";
      const units = manifest.units as Array<Record<string, unknown>>;
      units[0].status = "BLOCKED";
    });

    const result = runValidator(folder);

    expect(result.status).toBe(1);
    expect(result.stderr).toContain("auxiliary-only failures cannot block implementation");
  });

  it("rejects implementation-ready requirements backed only by stale sources", () => {
    const folder = copyFixture();
    mutateManifest(folder, (manifest) => {
      const sources = manifest.sources as Array<Record<string, unknown>>;
      sources[0].status = "STALE";
    });

    const result = runValidator(folder);

    expect(result.status).toBe(1);
    expect(result.stderr).toContain("REQ-001 requires at least one CURRENT source");
    expect(result.stderr).toContain("SEC-001 requires at least one CURRENT source");
  });

  it("reports malformed link arrays without throwing", () => {
    const folder = copyFixture();
    mutateManifest(folder, (manifest) => {
      const criteria = manifest.criteria as Array<Record<string, unknown>>;
      criteria[0].requirement_ids = "REQ-001";
    });

    const result = runValidator(folder);

    expect(result.status).toBe(1);
    expect(result.stderr).toContain("requirement_ids must be an array");
    expect(result.stderr).not.toContain("TypeError");
  });

  it("rejects unknown completion roles", () => {
    const folder = copyFixture();
    mutateManifest(folder, (manifest) => {
      const requirements = manifest.requirements as Array<Record<string, unknown>>;
      requirements[0].completion_role = "OPTIONAL";
    });

    const result = runValidator(folder);

    expect(result.status).toBe(1);
    expect(result.stderr).toContain("completion_role expected CORE or AUXILIARY");
  });

  it("treats a risk linked to a core criterion as core even when its unit is auxiliary", () => {
    const folder = copyFixture();
    mutateManifest(folder, (manifest) => {
      manifest.release_status = "NOT_EVALUATED";
      const sources = manifest.sources as Array<Record<string, unknown>>;
      (sources[0].affected_ids as string[]).push("OPS-001");
      const requirements = manifest.requirements as Array<Record<string, unknown>>;
      requirements.push({
        id: "OPS-001",
        status: "BLOCKED",
        completion_role: "AUXILIARY",
        artifact_path: "IMPLEMENTATION_PLAN.md",
        source_ids: ["SRC-001"],
        unit_ids: ["UNIT-002"],
        criterion_ids: ["AC-002"],
      });
      const criteria = manifest.criteria as Array<Record<string, unknown>>;
      criteria.push({
        id: "AC-002",
        status: "FAIL",
        artifact_path: "IMPLEMENTATION_PLAN.md",
        test_requirement: "NOT_REQUIRED",
        test_trigger: "NONE",
        test_rationale: "Auxiliary capability evidence remains visible without affecting implementation completion.",
        requirement_ids: ["OPS-001"],
        test_ids: [],
        evidence_ids: ["EVID-001"],
        authorization_boundary_id: null,
      });
      const units = manifest.units as Array<Record<string, unknown>>;
      units.push({
        id: "UNIT-002",
        status: "BLOCKED",
        artifact_path: "IMPLEMENTATION_PLAN.md",
        depends_on: ["UNIT-001"],
        requirement_ids: ["OPS-001"],
        risk_ids: ["RISK-001"],
        evidence_ids: ["EVID-001"],
      });
      const risks = manifest.risks as Array<Record<string, unknown>>;
      risks.push({
        id: "RISK-001",
        status: "OPEN",
        artifact_path: "IMPLEMENTATION_PLAN.md",
        unit_ids: ["UNIT-002"],
        criterion_ids: ["AC-001"],
      });
    });

    const result = runValidator(folder);

    expect(result.status).toBe(1);
    expect(result.stderr).toContain("ACHIEVED conflicts with RISK-001=OPEN");
  });

  it("rejects boundary states backed only by resolved authorization records", () => {
    const folder = copyFixture();
    mutateManifest(folder, (manifest) => {
      manifest.release_status = "BOUNDARY";
      manifest.plan_lifecycle = "ACTIVE";
      manifest.terminal_status = "AUTH_BLOCKED";
      manifest.authorization_boundaries = [{
        id: "AUTH-001",
        status: "RESOLVED",
        artifact_path: "IMPLEMENTATION_PLAN.md",
        affected_ids: ["AC-001"],
      }];
      const criteria = manifest.criteria as Array<Record<string, unknown>>;
      criteria[0].status = "BOUNDARY";
      criteria[0].authorization_boundary_id = "AUTH-001";
    });

    const result = runValidator(folder);

    expect(result.status).toBe(1);
    expect(result.stderr).toContain("BOUNDARY requires an active AUTH record");
    expect(result.stderr).toContain("AUTH_BLOCKED requires an active AUTH record");
    expect(result.stderr).toContain("requires an active authorization_boundary_id");
  });

  it("rejects authorization-blocked terminal states that mask internal failures", () => {
    const folder = copyFixture();
    mutateManifest(folder, (manifest) => {
      manifest.release_status = "BOUNDARY";
      manifest.plan_lifecycle = "N/A";
      manifest.terminal_status = "AUTH_BLOCKED";
      manifest.authorization_boundaries = [{
        id: "AUTH-001",
        status: "ACTIVE",
        artifact_path: "IMPLEMENTATION_PLAN.md",
        affected_ids: ["AC-001"],
      }];
      const criteria = manifest.criteria as Array<Record<string, unknown>>;
      criteria[0].status = "BOUNDARY";
      criteria[0].authorization_boundary_id = "AUTH-001";
      const gates = manifest.gates as Array<Record<string, unknown>>;
      gates[0].status = "FAIL";
    });

    const result = runValidator(folder);

    expect(result.status).toBe(1);
    expect(result.stderr).toContain("AUTH_BLOCKED conflicts with GATE-VERIFY-001=FAIL");
  });

  it("rejects release-ready claims before implementation and verification complete", () => {
    const folder = copyFixture();
    mutateManifest(folder, (manifest) => {
      manifest.implementation_status = "IN_PROGRESS";
      manifest.plan_lifecycle = "ACTIVE";
      manifest.terminal_status = "ACTIVE";
      const units = manifest.units as Array<Record<string, unknown>>;
      units[0].status = "IN_PROGRESS";
      const gates = manifest.gates as Array<Record<string, unknown>>;
      gates[0].status = "FAIL";
      manifest.ready_slices = [{ id: "SLICE-001", unit_ids: ["UNIT-001"] }];
      manifest.next_unit = "UNIT-001";
    });

    const result = runValidator(folder);

    expect(result.status).toBe(1);
    expect(result.stderr).toContain("READY requires implementation_status COMPLETE");
    expect(result.stderr).toContain("READY conflicts with GATE-VERIFY-001=FAIL");
  });

  it("rejects active ready work without an exact next unit", () => {
    const folder = copyFixture();
    mutateManifest(folder, (manifest) => {
      manifest.implementation_status = "IN_PROGRESS";
      manifest.release_status = "NOT_EVALUATED";
      manifest.plan_lifecycle = "ACTIVE";
      manifest.terminal_status = "ACTIVE";
      const units = manifest.units as Array<Record<string, unknown>>;
      units[0].status = "READY";
      manifest.ready_slices = [{ id: "SLICE-001", unit_ids: ["UNIT-001"] }];
      manifest.next_unit = null;
    });

    const result = runValidator(folder);

    expect(result.status).toBe(1);
    expect(result.stderr).toContain("ACTIVE packs with ready/in-progress work require an exact next unit");
  });

  it("rejects achieved requirements with only non-accepting criteria", () => {
    const folder = copyFixture();
    mutateManifest(folder, (manifest) => {
      const criteria = manifest.criteria as Array<Record<string, unknown>>;
      criteria[0].status = "N/A";
      const gates = manifest.gates as Array<Record<string, unknown>>;
      gates[0].status = "N/A";
    });

    const result = runValidator(folder);

    expect(result.status).toBe(1);
    expect(result.stderr).toContain("REQ-001 to have a PASS or BOUNDARY criterion");
    expect(result.stderr).toContain("SEC-001 to have a PASS or BOUNDARY criterion");
  });

  it("rejects completed requirements implemented only by superseded units", () => {
    const folder = copyFixture();
    mutateManifest(folder, (manifest) => {
      const units = manifest.units as Array<Record<string, unknown>>;
      units[0].status = "SUPERSEDED";
    });

    const result = runValidator(folder);

    expect(result.status).toBe(1);
    expect(result.stderr).toContain("COMPLETE requires REQ-001 to have a non-superseded VERIFIED unit");
    expect(result.stderr).toContain("COMPLETE requires SEC-001 to have a non-superseded VERIFIED unit");
  });

  it("rejects achieved terminal states with unresolved risks", () => {
    const folder = copyFixture();
    mutateManifest(folder, (manifest) => {
      const risks = manifest.risks as Array<Record<string, unknown>>;
      risks.push({
        id: "RISK-001",
        status: "OPEN",
        artifact_path: "IMPLEMENTATION_PLAN.md",
        unit_ids: ["UNIT-001"],
        criterion_ids: ["AC-001"],
      });
      const units = manifest.units as Array<Record<string, unknown>>;
      units[0].risk_ids = ["RISK-001"];
    });

    const result = runValidator(folder);

    expect(result.status).toBe(1);
    expect(result.stderr).toContain("ACHIEVED conflicts with RISK-001=OPEN");
  });

  it("rejects orphaned active authorization boundaries", () => {
    const folder = copyFixture();
    mutateManifest(folder, (manifest) => {
      manifest.release_status = "NOT_EVALUATED";
      manifest.authorization_boundaries = [{
        id: "AUTH-001",
        status: "ACTIVE",
        artifact_path: "IMPLEMENTATION_PLAN.md",
        affected_ids: ["AC-001"],
      }];
    });

    const result = runValidator(folder);

    expect(result.status).toBe(1);
    expect(result.stderr).toContain("active authorization boundaries require BOUNDARY");
    expect(result.stderr).toContain("AUTH-001 is ACTIVE but has no BOUNDARY criterion or gate");
  });

  it("rejects one-way source and risk trace claims", () => {
    const folder = copyFixture();
    mutateManifest(folder, (manifest) => {
      const sources = manifest.sources as Array<Record<string, unknown>>;
      sources[0].affected_ids = ["SEC-001"];
      const risks = manifest.risks as Array<Record<string, unknown>>;
      risks.push({
        id: "RISK-001",
        status: "OPEN",
        artifact_path: "IMPLEMENTATION_PLAN.md",
        unit_ids: ["UNIT-001"],
        criterion_ids: ["AC-001"],
      });
    });

    const result = runValidator(folder);

    expect(result.status).toBe(1);
    expect(result.stderr).toContain("REQ-001 -> SRC-001 is not reciprocal");
    expect(result.stderr).toContain("RISK-001 -> UNIT-001 is not reciprocal");
  });

  it("rejects missing required shape and invalid freshness timestamps", () => {
    const folder = copyFixture();
    mutateManifest(folder, (manifest) => {
      delete manifest.baseline;
      delete manifest.stale_triggers;
      delete manifest.updated_at;
      const units = manifest.units as Array<Record<string, unknown>>;
      units[0].depends_on = 7;
      delete units[0].evidence_ids;
      const evidence = manifest.evidence_index as Array<Record<string, unknown>>;
      delete evidence[0].claim_ids;
      delete evidence[0].source_revision;
      evidence[0].valid_until = "definitely-not-a-date";
    });

    const result = runValidator(folder, ["--write"]);

    expect(result.status).toBe(1);
    expect(result.stderr).toContain("baseline: expected an object");
    expect(result.stderr).toContain("stale_triggers must be an array");
    expect(result.stderr).toContain("updated_at: expected canonical ISO-8601");
    expect(result.stderr).toContain("depends_on must be an array");
    expect(result.stderr).toContain("has invalid valid_until");
  });

  it("rejects a non-object manifest without crashing", () => {
    const folder = copyFixture();
    writeFileSync(join(folder, "plan-pack.json"), "null\n", "utf8");

    const result = runValidator(folder);

    expect(result.status).toBe(1);
    expect(result.stderr).toContain("root must be an object");
  });

  it("rejects cyclic execution units", () => {
    const folder = copyFixture();
    mutateManifest(folder, (manifest) => {
      const units = manifest.units as Array<Record<string, unknown>>;
      units[0].depends_on = ["UNIT-001"];
    });

    const result = runValidator(folder);

    expect(result.status).toBe(1);
    expect(result.stderr).toContain("cycle detected");
  });

  it("rejects ready slices that omit transitive dependencies", () => {
    const folder = copyFixture();
    mutateManifest(folder, (manifest) => {
      manifest.implementation_status = "IN_PROGRESS";
      manifest.plan_lifecycle = "ACTIVE";
      manifest.terminal_status = "ACTIVE";
      const units = manifest.units as Array<Record<string, unknown>>;
      units.push({
        id: "UNIT-002",
        status: "READY",
        artifact_path: "IMPLEMENTATION_PLAN.md",
        depends_on: ["UNIT-001"],
        requirement_ids: ["REQ-001"],
        risk_ids: [],
        evidence_ids: ["EVID-001"],
      });
      const requirements = manifest.requirements as Array<Record<string, unknown>>;
      (requirements[0].unit_ids as string[]).push("UNIT-002");
      const evidence = manifest.evidence_index as Array<Record<string, unknown>>;
      (evidence[0].claim_ids as string[]).push("UNIT-002");
      manifest.ready_slices = [{ id: "SLICE-001", unit_ids: ["UNIT-002"] }];
      manifest.next_unit = "UNIT-002";
    });

    const result = runValidator(folder);

    expect(result.status).toBe(1);
    expect(result.stderr).toContain("omits dependency UNIT-001 for UNIT-002");
  });

  it("rejects blocked units inside an advertised ready slice", () => {
    const folder = copyFixture();
    mutateManifest(folder, (manifest) => {
      manifest.package_status = "CONDITIONALLY_READY";
      manifest.implementation_status = "IN_PROGRESS";
      manifest.plan_lifecycle = "ACTIVE";
      manifest.terminal_status = "ACTIVE";
      const units = manifest.units as Array<Record<string, unknown>>;
      units[0].status = "BLOCKED";
      units.push({
        id: "UNIT-002",
        status: "READY",
        artifact_path: "IMPLEMENTATION_PLAN.md",
        depends_on: ["UNIT-001"],
        requirement_ids: ["REQ-001"],
        risk_ids: [],
        evidence_ids: ["EVID-001"],
      });
      const requirements = manifest.requirements as Array<Record<string, unknown>>;
      (requirements[0].unit_ids as string[]).push("UNIT-002");
      const evidence = manifest.evidence_index as Array<Record<string, unknown>>;
      (evidence[0].claim_ids as string[]).push("UNIT-002");
      manifest.ready_slices = [{ id: "SLICE-001", unit_ids: ["UNIT-001", "UNIT-002"] }];
      manifest.next_unit = "UNIT-002";
    });

    const result = runValidator(folder);

    expect(result.status).toBe(1);
    expect(result.stderr).toContain(
      "includes UNIT-001=BLOCKED, expected VERIFIED, decision-backed SUPERSEDED, READY, or IN_PROGRESS",
    );
  });

  it("rejects duplicate canonical execution roles", () => {
    const folder = copyFixture();
    mutateManifest(folder, (manifest) => {
      const artifacts = manifest.artifacts as Array<Record<string, unknown>>;
      artifacts[0].role = "canonical-execution";
    });

    const result = runValidator(folder, ["--write"]);

    expect(result.status).toBe(1);
    expect(result.stderr).toContain("exactly one canonical-execution role");
  });

  it("rejects artifact paths that escape through symlinks", () => {
    const folder = copyFixture();
    const evidencePath = join(folder, "evidence/check.txt");
    const outsidePath = join(dirname(folder), "outside.txt");
    writeFileSync(outsidePath, "outside pack\n", "utf8");
    rmSync(evidencePath);
    symlinkSync(outsidePath, evidencePath);

    const result = runValidator(folder);

    expect(result.status).toBe(1);
    expect(result.stderr).toContain("must not escape or traverse a symlink");
  });

  it("rejects a vacuous stage prompt containing only contract tokens", () => {
    const tempRoot = mkdtempSync(join(tmpdir(), "archestimator-prompt-suite-"));
    tempRoots.push(tempRoot);
    const suite = join(tempRoot, "suite");
    cpSync(promptSuite, suite, { recursive: true });
    writeFileSync(
      join(suite, "Creating-Plan-Prompt.md"),
      "Frontier-Planning-Kernel.md Frontier-Applicability-Gates.md Plan-Pack-Schema.md This stage is planning-only `focused`, `standard`, or `high-blast-radius` Create `plan-pack.json` final checking pass is read-only\n",
      "utf8",
    );

    const result = runSuiteValidator(suite);

    expect(result.status).toBe(1);
    expect(result.stderr).toContain("Creating-Plan-Prompt.md: missing required section");
  });
});
