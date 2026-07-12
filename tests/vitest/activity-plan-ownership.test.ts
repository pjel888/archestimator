import { readFile } from "node:fs/promises";
import path from "node:path";

import { describe, expect, it } from "vitest";

const root = process.cwd();
const activityPlan = path.join(root, ".ai/09_archive/store/2026-07-11-Activity-History-Mapping-complete/11_IMPLEMENTATION_PLAN.md");
const migrationGeneration = path.join(root, ".ai/03_plans/2026-07-10/Beta-Readiness-Program/MIGRATION_LEASE_GENERATION.json");
const contributionReceipt = path.join(root, ".ai/99_scratch/release-integrity/activity-history-contribution.json");

type MigrationGeneration = {
  migration_tail: { entries: Array<{ path: string }> };
  allocations: Array<{ planned_path: string; status: string }>;
};

type ContributionReceipt = {
  status: string;
  ownership: { live_lease_overlap: boolean; consumed_migrations: string[] };
  exact_changed_files: Record<string, string>;
  verification: { integration_suite: { files: number; tests: number; failed: number } };
};

describe("activity-history execution ownership", () => {
  it("preserves Activity's consumed migrations without an unclaimed allocation", async () => {
    const generation = JSON.parse(await readFile(migrationGeneration, "utf8")) as MigrationGeneration;
    const activityMigrations = [
      "migrations/0060_activity_history_indexes.sql",
      "migrations/0065_activity_history_lifecycle.sql",
    ];
    const tailPaths = new Set(generation.migration_tail.entries.map((entry) => entry.path));
    const allocationsByPath = new Map(generation.allocations.map((allocation) => [allocation.planned_path, allocation.status]));

    for (const migration of activityMigrations) {
      expect(tailPaths).toContain(migration);
      expect(allocationsByPath.get(migration) ?? "CONSUMED").toBe("CONSUMED");
    }
  });

  it("keeps UNIT-008 as a read-only verifier with an explicit ownership check", async () => {
    const plan = await readFile(activityPlan, "utf8");

    expect(plan).toContain("Owned scope: read-only product verifier.");
    expect(plan).toContain("tests/vitest/activity-plan-ownership.test.ts");
    expect(plan).toContain("rejects an undeclared path or overlapping live lease");
  });

  it("records a collision-free scoped contribution with the complete integration result", async () => {
    const receipt = JSON.parse(await readFile(contributionReceipt, "utf8")) as ContributionReceipt;

    expect(receipt.status).toBe("PASS");
    expect(receipt.ownership.live_lease_overlap).toBe(false);
    expect(receipt.ownership.consumed_migrations).toEqual([
      "migrations/0060_activity_history_indexes.sql",
      "migrations/0065_activity_history_lifecycle.sql",
    ]);
    expect(receipt.exact_changed_files["migrations/0060_activity_history_indexes.sql"]).toMatch(/^[a-f0-9]{64}$/);
    expect(receipt.exact_changed_files["migrations/0065_activity_history_lifecycle.sql"]).toMatch(/^[a-f0-9]{64}$/);
    expect(receipt.verification.integration_suite).toEqual({ files: 33, tests: 402, failed: 0 });
  });
});
