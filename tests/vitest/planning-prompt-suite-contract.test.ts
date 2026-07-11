import {
  cpSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { dirname, join } from "node:path";
import { tmpdir } from "node:os";
import { spawnSync } from "node:child_process";

import { afterEach, describe, expect, it } from "vitest";

const root = process.cwd();
const fixture = join(root, "tests/fixtures/planning-prompt-suite/valid-plan-pack");
const promptSuite = join(root, ".ai/08_prompts/000_Planning Prompts");
const tempRoots: string[] = [];

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

    expect(result.status).toBe(0);
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
    expect(result.stderr).toContain("AC-001=PASS requires TEST-001=PASS");
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
    expect(result.stderr).toContain("test_trigger expected NONE, EXPLICIT_TEST_TASK, or MVP_CRITICAL_INVARIANT");
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
    expect(result.stderr).toContain("includes UNIT-001=BLOCKED, expected VERIFIED, READY, or IN_PROGRESS");
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
