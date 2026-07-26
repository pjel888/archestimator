import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";

import { describe, expect, it } from "vitest";

const root = process.cwd();
const activityArchive = path.join(root, ".ai/09_archive/store/2026-07-11-Activity-History-Mapping-complete");
const activityPlan = path.join(activityArchive, "11_IMPLEMENTATION_PLAN.md");
const activityPlanPack = path.join(activityArchive, "plan-pack.json");
const integrationEvidence = path.join(activityArchive, "evidence/2026-07-11-unit-008-integration.md");
const migrationGeneration = path.join(
  root,
  ".ai/09_archive/store/2026-07-10-plan-packs-user-closed-2026-07-12/Beta-Readiness-Program/MIGRATION_LEASE_GENERATION.json",
);

type MigrationGeneration = {
  migration_tail: { entries: Array<{ path: string; sha256: string }> };
  allocations: Array<{
    planned_path: string;
    status: string;
    consumed_file_sha256?: string;
  }>;
};

type PlanPack = {
  implementation_status: string;
  release_status: string;
  terminal_status: string;
  artifacts: Array<{ path: string; sha256: string }>;
};

function sha256CanonicalText(content: string) {
  return createHash("sha256").update(content.replace(/\r\n/g, "\n")).digest("hex");
}

describe("activity-history execution ownership", () => {
  it("preserves Activity's consumed migrations without an unclaimed allocation", async () => {
    const generation = JSON.parse(await readFile(migrationGeneration, "utf8")) as MigrationGeneration;
    const activityMigrations = [
      "migrations/0060_activity_history_indexes.sql",
      "migrations/0065_activity_history_lifecycle.sql",
    ];
    const tailByPath = new Map(generation.migration_tail.entries.map((entry) => [entry.path, entry.sha256]));
    const allocationsByPath = new Map(generation.allocations.map((allocation) => [allocation.planned_path, allocation]));

    for (const migration of activityMigrations) {
      const migrationDigest = sha256CanonicalText(await readFile(path.join(root, migration), "utf8"));
      expect(tailByPath.get(migration)).toBe(migrationDigest);

      const allocation = allocationsByPath.get(migration);
      if (allocation) {
        expect(allocation.status).toBe("CONSUMED");
        expect(allocation.consumed_file_sha256).toBe(migrationDigest);
      }
    }
  });

  it("keeps UNIT-008 as a read-only verifier with an explicit ownership check", async () => {
    const plan = await readFile(activityPlan, "utf8");

    expect(plan).toContain("Owned scope: read-only product verifier.");
    expect(plan).toContain("tests/vitest/activity-plan-ownership.test.ts");
    expect(plan).toContain("rejects an undeclared path or overlapping live lease");
  });

  it("binds the archived integration result to the completed plan pack", async () => {
    const evidence = await readFile(integrationEvidence, "utf8");
    const planPack = JSON.parse(await readFile(activityPlanPack, "utf8")) as PlanPack;
    const evidenceArtifact = planPack.artifacts.find(
      (artifact) => artifact.path === "evidence/2026-07-11-unit-008-integration.md",
    );

    expect(planPack.implementation_status).toBe("COMPLETE");
    expect(planPack.release_status).toBe("READY");
    expect(planPack.terminal_status).toBe("ACHIEVED");
    expect(evidenceArtifact?.sha256).toBe(sha256CanonicalText(evidence));
    expect(evidence).toContain("33 files / 402");
    expect(evidence).toContain("tests / 0 failures");
    expect(evidence).toContain("0060_activity_history_indexes.sql");
    expect(evidence).toContain("0065_activity_history_lifecycle.sql");
  });
});
