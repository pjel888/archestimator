import { existsSync, readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

const seedSql = readFileSync("supabase/seed.sql", "utf8");
const launchReadinessPlanDir = existsSync(".ai/03_plans/mvp-launch-readiness-2026-06-01")
  ? ".ai/03_plans/mvp-launch-readiness-2026-06-01"
  : ".ai/09_archive/mvp-launch-readiness-2026-06-01";
const demoPlan = readFileSync(
  `${launchReadinessPlanDir}/28-investor-incubator-demo-readiness-plan.md`,
  "utf8",
);

describe("demo seed readiness", () => {
  it("keeps the local Supabase seed anchored to a realistic demo workspace and estimate", () => {
    expect(seedSql).toContain("Archestimator Demo Workspace");
    expect(seedSql).toContain("Lewis Residence");
    expect(seedSql).toContain("AE-LR-001");
    expect(seedSql).toContain("Lewis Residence Baseline Estimate");
    expect(seedSql).toContain("Quezon City, Metro Manila, Philippines");
  });

  it("seeds linked, detached, and manual estimate rows for demo/export rehearsal", () => {
    expect(seedSql).toContain("insert into public.estimate_row_items");
    expect(seedSql).toContain("600x600 Porcelain Floor Tile");
    expect(seedSql).toContain("Master bedroom low-VOC paint system");
    expect(seedSql).toContain("'linked-clean'");
    expect(seedSql).toContain("'detached'");
    expect(seedSql).toContain("'unlinked'");
    expect(seedSql).toContain("sourceLibraryItemId");
    expect(seedSql.match(/66666666-6666-4666-8666-66666666666[1-5]/g)?.length).toBeGreaterThanOrEqual(10);
  });

  it("keeps seeded component trust fields demo-realistic instead of placeholder allowances", () => {
    expect(seedSql).toContain("Quezon City Tile Depot");
    expect(seedSql).toContain("Metro Manila Paint Center");
    expect(seedSql).toContain("May 2026 QC supplier canvas");
    expect(seedSql).toContain("May 2026 paint supplier canvas");
    expect(seedSql).toContain("'supplier-canvas'");
    expect(seedSql).not.toContain("Supplier quote required");
    expect(seedSql).not.toContain("'editable allowance'");
    expect(seedSql).not.toContain("requires-quote-verification");
  });

  it("keeps the investor demo plan pointed at the concrete seed anchors without exposing unfinished surfaces", () => {
    expect(demoPlan).toContain("supabase/seed.sql");
    expect(demoPlan).toContain("DEMO_PROJECT_PLACEHOLDER Baseline Estimate");
    expect(demoPlan).toContain("600x600 Porcelain Floor Tile");
    expect(demoPlan).toContain("Master bedroom low-VOC paint system");
    expect(demoPlan).toMatch(/Do not show provider dashboards, real customer data, Ask Flip, billing/i);
  });
});
