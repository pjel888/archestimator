import { createHash } from "node:crypto";
import { readFileSync, realpathSync, statSync } from "node:fs";
import { resolve, sep } from "node:path";
import { spawnSync } from "node:child_process";

import { describe, expect, it } from "vitest";

const root = process.cwd();
const pack = ".ai/03_plans/2026-07-31/Code-Improvement";
const supplement = ".ai/03_plans/2026-08-01/Codex-Security-Delta-Remediation-Plan-Pack";

const readJson = <T>(path: string): T =>
  JSON.parse(readFileSync(resolve(root, path), "utf8")) as T;

const sha256 = (path: string): string =>
  createHash("sha256").update(readFileSync(resolve(root, path))).digest("hex");

const currentRevision = (): string => {
  const result = spawnSync("git", ["rev-parse", "HEAD"], {
    cwd: root,
    encoding: "utf8",
  });
  expect(result.status).toBe(0);
  return result.stdout.trim().toLowerCase();
};

type Unit = {
  id: string;
  status: string;
  depends_on: string[];
};

type Criterion = {
  id: string;
  status: string;
  authorization_boundary_id: string | null;
};

type Manifest = {
  package_id: string;
  package_status: string;
  implementation_status: string;
  plan_lifecycle: string;
  terminal_status: string;
  next_unit: string | null;
  ready_slices: Array<{ id: string; unit_ids: string[] }>;
  manifest_sha256: string;
  units: Unit[];
  criteria: Criterion[];
  authorization_boundaries: Array<{ id: string; status: string }>;
};

type Mapping = {
  source_id: string;
  outcome: string;
  owner_unit_id: string;
};

type EvidenceLeaf = {
  path: string;
  sha256: string;
  source_revision: string;
};

type AdmissionReceipt = {
  schema_version: number;
  decision_unit_id: string;
  candidate_revision: string;
  source_package_id: string;
  target_package_id: string;
  source_manifest_sha256: string;
  result: string;
  terminal_effect: string;
  finding_count: number;
  pr_record_count: number;
  unowned_count: number;
  duplicate_owner_count: number;
  finding_mappings: Mapping[];
  pr_mappings: Mapping[];
  evidence_paths: EvidenceLeaf[];
};

type ScannerDecision = {
  schema_version: number;
  decision_id: string;
  outcome: string;
  candidate_revision: string;
  evidence_paths: EvidenceLeaf[];
  fallbacks: unknown[];
  unit_transitions: Array<{
    unit_id: string;
    from_status: string;
    to_status: string;
  }>;
  requirement_transitions: unknown[];
  criterion_transitions: Array<{
    criterion_id: string;
    from_status: string;
    to_status: string;
    authorization_boundary_id: string;
  }>;
  terminal_effect: string;
};

const expectedAssignments = new Map<string, string>([
  ["CSF-004", "UNIT-030"],
  ["CSF-009", "UNIT-030"],
  ["CSF-026", "UNIT-030"],
  ["CSF-136", "UNIT-030"],
  ["CSF-137", "UNIT-030"],
  ["PR-128", "UNIT-030"],
  ["CSF-003", "UNIT-031"],
  ["PR-142", "UNIT-031"],
  ["PR-143", "UNIT-031"],
  ["PR-144", "UNIT-031"],
  ["PR-145", "UNIT-031"],
  ["PR-146", "UNIT-031"],
  ["CSF-153", "UNIT-032"],
  ["CSF-154", "UNIT-032"],
  ["CSF-168", "UNIT-032"],
  ["CSF-169", "UNIT-032"],
  ["CSF-170", "UNIT-032"],
  ["CSF-177", "UNIT-032"],
  ["CSF-194", "UNIT-032"],
  ["CSF-025", "UNIT-033"],
  ["CSF-075", "UNIT-034"],
  ["CSF-076", "UNIT-034"],
  ["CSF-148", "UNIT-034"],
  ["CSF-142", "UNIT-035"],
  ["CSF-143", "UNIT-035"],
  ["CSF-145", "UNIT-035"],
  ["CSF-151", "UNIT-036"],
  ["CSF-157", "UNIT-036"],
  ["CSF-164", "UNIT-037"],
  ["CSF-165", "UNIT-037"],
  ["CSF-166", "UNIT-038"],
  ["CSF-173", "UNIT-038"],
  ["CSF-041", "UNIT-039"],
  ["CSF-043", "UNIT-039"],
  ["CSF-044", "UNIT-039"],
  ["CSF-093", "UNIT-040"],
  ["PR-124", "UNIT-040"],
  ["PR-141", "UNIT-041"],
  ["PR-149", "UNIT-041"],
  ["PR-150", "UNIT-041"],
  ["PR-152", "UNIT-041"],
  ["PR-153", "UNIT-041"],
  ["CSF-089", "UNIT-042"],
  ["CSF-147", "UNIT-043"],
  ["CSF-161", "UNIT-043"],
  ["CSF-171", "UNIT-044"],
  ["CSF-146", "UNIT-045"],
  ["CSF-174", "UNIT-046"],
]);

describe("UNIT-024 security supplement admission and scanner viability", () => {
  it("maps all supplement records exactly once to a current owner", () => {
    const manifest = readJson<Manifest>(`${pack}/plan-pack.json`);
    const supplementManifest = readJson<Manifest>(`${supplement}/plan-pack.json`);
    const receipt = readJson<AdmissionReceipt>(
      `${pack}/evidence/unit-024-codex-security-supplement-disposition.json`,
    );
    const revision = currentRevision();
    const expectedFindingIds = Array.from(
      { length: 200 },
      (_, index) => `CSF-${String(index + 1).padStart(3, "0")}`,
    );
    const expectedPrIds = [
      124, 125, 126, 127, 128, 129, 138, 140, 141, 142, 143, 144, 145, 146,
      147, 148, 149, 150, 151, 152, 153,
    ].map((id) => `PR-${id}`);
    const allMappings = [...receipt.finding_mappings, ...receipt.pr_mappings];
    const unitIds = new Set(manifest.units.map((unit) => unit.id));

    expect(Object.keys(receipt).sort()).toEqual([
      "candidate_revision",
      "decision_unit_id",
      "duplicate_owner_count",
      "evidence_paths",
      "finding_count",
      "finding_mappings",
      "pr_mappings",
      "pr_record_count",
      "result",
      "schema_version",
      "source_manifest_sha256",
      "source_package_id",
      "target_package_id",
      "terminal_effect",
      "unowned_count",
    ]);
    expect(receipt).toMatchObject({
      schema_version: 1,
      decision_unit_id: "UNIT-024",
      candidate_revision: revision,
      source_package_id: "PLAN-2026-08-01-codex-security-delta-remediation",
      target_package_id: "PLAN-2026-07-31-code-improvement",
      source_manifest_sha256: supplementManifest.manifest_sha256,
      result: "ABSORBED_INTO_CODE_IMPROVEMENT",
      terminal_effect: "NONE",
      finding_count: 200,
      pr_record_count: 21,
      unowned_count: 0,
      duplicate_owner_count: 0,
    });
    expect(receipt.finding_mappings.map((row) => row.source_id).sort()).toEqual(
      expectedFindingIds,
    );
    expect(receipt.pr_mappings.map((row) => row.source_id).sort()).toEqual(
      expectedPrIds.sort(),
    );
    expect(new Set(allMappings.map((row) => row.source_id)).size).toBe(221);
    expect(
      allMappings.every(
        (row) =>
          Object.keys(row).sort().join(",") ===
            "outcome,owner_unit_id,source_id" && unitIds.has(row.owner_unit_id),
      ),
    ).toBe(true);
    expect(expectedAssignments.size).toBe(48);
    for (const [sourceId, unitId] of expectedAssignments) {
      expect(allMappings.find((row) => row.source_id === sourceId)?.owner_unit_id).toBe(
        unitId,
      );
    }
  });

  it("preserves the supplement as non-runnable and creates the exact delta units", () => {
    const manifest = readJson<Manifest>(`${pack}/plan-pack.json`);
    const supplementManifest = readJson<Manifest>(`${supplement}/plan-pack.json`);
    const catalogue = readFileSync(resolve(root, `${pack}/02-UNIT-CATALOG.md`), "utf8");
    const expectedUnitIds = Array.from(
      { length: 17 },
      (_, index) => `UNIT-${String(index + 30).padStart(3, "0")}`,
    );

    expect(supplementManifest).toMatchObject({
      package_status: "NOT_READY",
      implementation_status: "NOT_STARTED",
      plan_lifecycle: "ACTIVE",
      terminal_status: "ACTIVE",
      next_unit: null,
      ready_slices: [],
    });
    expect(
      supplementManifest.units.filter((unit) =>
        ["READY", "IN_PROGRESS"].includes(unit.status),
      ),
    ).toEqual([]);
    for (const unitId of expectedUnitIds) {
      const unit = manifest.units.find((row) => row.id === unitId);
      expect(unit?.status).toBe("PLANNED");
      expect(unit?.depends_on).toContain("UNIT-024");
      expect(catalogue).toContain(`## \`${unitId}\``);
    }
    expect(manifest.units.find((unit) => unit.id === "UNIT-039")?.depends_on).toEqual([
      "UNIT-024",
      "UNIT-029",
    ]);
    expect(manifest.units.find((unit) => unit.id === "UNIT-023")?.depends_on).toContain(
      "UNIT-041",
    );
    for (const closingUnitId of ["UNIT-020", "UNIT-028"]) {
      const dependencies = manifest.units.find((unit) => unit.id === closingUnitId)?.depends_on;
      expect(dependencies).toEqual(expect.arrayContaining(expectedUnitIds));
    }
    expect(catalogue).toContain(".design-sync/verify-render.mjs");
    expect(catalogue).toContain(".agents/skills/impeccable/scripts/live-server.mjs");
    expect(catalogue).toContain(".agents/skills/impeccable/scripts/live.mjs");
    expect(catalogue).toMatch(/`UNIT-041`[\s\S]*?`@firecms\/neat` is excluded/);
  });

  it("selects only the authorization-backed scanner outcome", () => {
    const manifest = readJson<Manifest>(`${pack}/plan-pack.json`);
    const decision = readJson<ScannerDecision>(
      `${pack}/evidence/unit-024-scanner-viability-decision.json`,
    );
    const topology = readJson<{
      decision_unit_id: string;
      candidate_revision: string;
      outcome: string;
      authoritative_provider_configured: boolean;
      authoritative_clean_result_count: number;
      authorization_boundary_id: string;
      fail_closed_product_impact: string;
    }>(`${pack}/evidence/unit-024-scanner-topology.json`);
    const revision = currentRevision();

    expect(manifest.next_unit).toBe("UNIT-013");
    expect(manifest.units.find((unit) => unit.id === "UNIT-013")?.status).toBe("READY");
    expect(manifest.units.find((unit) => unit.id === "UNIT-024")?.status).toBe(
      "VERIFIED",
    );
    expect(manifest.units.find((unit) => unit.id === "UNIT-025")?.status).toBe(
      "SUPERSEDED",
    );
    for (const criterionId of ["AC-002", "AC-006"]) {
      expect(manifest.criteria.find((criterion) => criterion.id === criterionId)).toMatchObject({
        status: "BOUNDARY",
        authorization_boundary_id: "AUTH-001",
      });
    }
    expect(
      manifest.authorization_boundaries.find((boundary) => boundary.id === "AUTH-001"),
    ).toMatchObject({ status: "ACTIVE" });
    expect(decision).toMatchObject({
      schema_version: 1,
      decision_id: "DEC-AUTO-005",
      outcome: "EXTERNAL_PROVIDER_AUTH_REQUIRED",
      candidate_revision: revision,
      fallbacks: [],
      requirement_transitions: [],
      terminal_effect: "AUTH_BLOCKED",
      unit_transitions: [
        {
          unit_id: "UNIT-025",
          from_status: "PLANNED",
          to_status: "SUPERSEDED",
        },
      ],
    });
    expect(decision.criterion_transitions).toEqual([
      {
        criterion_id: "AC-002",
        from_status: "FAIL",
        to_status: "BOUNDARY",
        authorization_boundary_id: "AUTH-001",
      },
      {
        criterion_id: "AC-006",
        from_status: "FAIL",
        to_status: "BOUNDARY",
        authorization_boundary_id: "AUTH-001",
      },
    ]);
    expect(topology).toMatchObject({
      decision_unit_id: "UNIT-024",
      candidate_revision: revision,
      outcome: "EXTERNAL_PROVIDER_AUTH_REQUIRED",
      authoritative_provider_configured: false,
      authoritative_clean_result_count: 0,
      authorization_boundary_id: "AUTH-001",
    });
    expect(topology.fail_closed_product_impact.length).toBeGreaterThan(0);
  });

  it("rehashes every sealed decision and admission evidence leaf", () => {
    const revision = currentRevision();
    const admission = readJson<AdmissionReceipt>(
      `${pack}/evidence/unit-024-codex-security-supplement-disposition.json`,
    );
    const decision = readJson<ScannerDecision>(
      `${pack}/evidence/unit-024-scanner-viability-decision.json`,
    );
    const rootRealPath = `${realpathSync(root).replace(/[\\/]+$/u, "")}${sep}`;

    for (const leaf of [...admission.evidence_paths, ...decision.evidence_paths]) {
      expect(Object.keys(leaf).sort()).toEqual(["path", "sha256", "source_revision"]);
      expect(leaf.path).toMatch(/^[A-Za-z0-9._/-]+$/u);
      expect(leaf.path.startsWith(".tmp/")).toBe(false);
      expect(leaf.source_revision).toBe(revision);
      const resolved = realpathSync(resolve(root, leaf.path));
      expect(`${resolved}${statSync(resolved).isDirectory() ? sep : ""}`.startsWith(rootRealPath)).toBe(
        true,
      );
      expect(statSync(resolved).isFile()).toBe(true);
      expect(sha256(leaf.path)).toBe(leaf.sha256);
      const ignored = spawnSync("git", ["check-ignore", "-q", "--", leaf.path], {
        cwd: root,
      });
      expect(ignored.status).toBe(1);
    }
  });
});
