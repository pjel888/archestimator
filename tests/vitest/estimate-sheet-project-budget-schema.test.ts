import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const migrationPath = readdirSync(join(process.cwd(), "supabase/migrations"))
  .filter((file) => file.endsWith("_estimate_sheet_project_budget.sql"))
  .sort()
  .at(-1);

if (!migrationPath) throw new Error("Missing estimate sheet project budget migration.");

const migration = readFileSync(join(process.cwd(), "supabase/migrations", migrationPath), "utf8");
const supabaseTypes = readFileSync(join(process.cwd(), "src/lib/supabase/types.ts"), "utf8");
const estimatesTable = readFileSync(join(process.cwd(), "src/components/workshop/ProjectEstimatesTable.tsx"), "utf8");
const metadataStrip = readFileSync(join(process.cwd(), "src/components/workshop/ProjectEstimateMetadataStrip.tsx"), "utf8");
const projectLayout = readFileSync(join(process.cwd(), "src/app/workshop/projects/[projectId]/layout.tsx"), "utf8");
const notesMigrationPath = readdirSync(join(process.cwd(), "supabase/migrations"))
  .filter((file) => file.endsWith("_estimate_sheet_notes.sql"))
  .sort()
  .at(-1);

if (!notesMigrationPath) throw new Error("Missing estimate sheet notes migration.");

const notesMigration = readFileSync(join(process.cwd(), "supabase/migrations", notesMigrationPath), "utf8");

describe("estimate sheet project budget schema", () => {
  it("stores project budget on estimates and versions it through the sheet details RPC", () => {
    expect(migration).toContain("add column if not exists project_budget");
    expect(migration).toContain("set project_budget = (project.metadata->>'projectBudget')::numeric");
    expect(migration).toContain("'projectBudget', old_estimate.project_budget");
    expect(migration).toContain("when estimate_patch ? 'projectBudget'");
    expect(migration).toContain("array['name', 'sheetCode', 'projectBudget', 'metadata']");
    expect(supabaseTypes).toContain("project_budget: number | null");
  });

  it("keeps budget UI attached to estimates instead of project metadata", () => {
    expect(estimatesTable).toContain('header: "Project Budget"');
    expect(estimatesTable).toContain('header: "Remaining Budget"');
    expect(estimatesTable).toContain("row.original.project_budget - row.original.totalProjectCost");
    expect(metadataStrip).toContain("dispatchProjectBudgetChange(projectBudget ?? 0)");
    expect(projectLayout).not.toContain("readProjectBudget");
  });

  it("orders estimate budget columns before ongoing cost and remaining budget", () => {
    const projectBudgetHeader = estimatesTable.indexOf('header: "Project Budget"');
    const ongoingCostHeader = estimatesTable.indexOf('header: "Ongoing Project Cost"');
    const remainingBudgetHeader = estimatesTable.indexOf('header: "Remaining Budget"');

    expect(projectBudgetHeader).toBeGreaterThan(-1);
    expect(ongoingCostHeader).toBeGreaterThan(projectBudgetHeader);
    expect(remainingBudgetHeader).toBeGreaterThan(ongoingCostHeader);
  });

  it("stores editable estimate notes next to the estimate name", () => {
    const nameHeader = estimatesTable.indexOf('header: "Estimate Name"');
    const notesHeader = estimatesTable.indexOf('header: "Notes"');
    const projectBudgetHeader = estimatesTable.indexOf('header: "Project Budget"');

    expect(notesMigration).toContain("add column if not exists notes text");
    expect(notesMigration).toContain("'notes', old_estimate.notes");
    expect(notesMigration).toContain("when estimate_patch ? 'notes'");
    expect(notesMigration).toContain("array['name', 'sheetCode', 'notes', 'projectBudget', 'metadata']");
    expect(supabaseTypes).toContain("notes: string | null");
    expect(estimatesTable).toContain('field="notes"');
    expect(nameHeader).toBeGreaterThan(-1);
    expect(notesHeader).toBeGreaterThan(nameHeader);
    expect(projectBudgetHeader).toBeGreaterThan(notesHeader);
  });
});
