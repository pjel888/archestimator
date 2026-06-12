import { describe, expect, it } from "vitest";

import { latestMigrationBySuffix, migrations, read } from "./security-findings-test-helpers";

describe("Codex implementation and seed-data hardening contracts", () => {
  it("keeps implementation prompt templates from self-authorizing direct main pushes", () => {
    const implementationPrompt = read(".ai/08_prompts/003-PLAN-IMPLEMENTATION-PROMPT.MD");

    expect(implementationPrompt).toContain("This template is not authorization by itself");
    expect(implementationPrompt).toContain("current user prompt or an owner-approved plan");
    expect(implementationPrompt).toContain("If direct-main authority is missing");
    expect(implementationPrompt).toContain(
      "Push main again only when direct main push is authorized for the current run.",
    );
    expect(implementationPrompt).not.toContain("this prompt is Philip");
    expect(implementationPrompt).not.toContain("explicit instruction to merge the completed task branch into main");
  });

  it("restores deterministic Lewis seed rows after the Luna reset migrations", () => {
    const resetMigrationIndex = migrations.indexOf("20260518151743_reset_luna_heights_estimate_contents.sql");
    const treeMigrationIndex = migrations.indexOf("20260519173857_populate_lewis_residence_estimate_tree.sql");
    const repairMigrationIndex = migrations.indexOf("20260605131500_restore_lewis_residence_seed_rows.sql");
    const repairMigration = latestMigrationBySuffix("_restore_lewis_residence_seed_rows.sql");

    expect(resetMigrationIndex).toBeGreaterThanOrEqual(0);
    expect(treeMigrationIndex).toBeGreaterThan(resetMigrationIndex);
    expect(repairMigrationIndex).toBeGreaterThan(treeMigrationIndex);
    expect(repairMigration).toContain("insert into public.estimate_row_items");
    expect(repairMigration).toContain("'66666666-6666-4666-8666-666666666661'");
    expect(repairMigration).toContain("'66666666-6666-4666-8666-666666666665'");
    expect(repairMigration).toContain("'77777777-7777-4777-8777-777777777721'");
    expect(repairMigration).toContain("seedRepair");
    expect(repairMigration).toContain("on conflict (id) do update");
  });

  it("keeps estimate quantity and misc edits nonnegative before totals and persistence", () => {
    const estimateSheet = read("src/components/workshop/EstimateSheetContent.tsx");

    expect(estimateSheet).toContain("parseNonNegativeEditableNumber,");
    const editableRowModel = read("src/components/workshop/estimate-sheet/rows/editable-row-model.ts");
    expect(editableRowModel).toContain("function parseNonNegativeEditableNumber");
    expect(editableRowModel).toContain("Math.max(0, parseEditableNumber(value))");
    expect(estimateSheet).toContain("quantity: parseNonNegativeEditableNumber(values.quantity)");
    expect(estimateSheet).toContain("miscCost: parseNonNegativeEditableNumber(values.miscCost)");
    expect(estimateSheet).not.toContain("applyEstimateGridEdit");
    expect(estimateSheet).not.toContain("DataEditor");
  });
});
