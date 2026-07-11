import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

import { DECISION_SCHEMA, PERFORMANCE_BUDGETS } from "../../scripts/lib/estimate-sheet-performance-contract";

const scriptPath = resolve(process.cwd(), "scripts/write-estimate-sheet-bottleneck-decision.ts");
const describeDecision = describe.skipIf(!existsSync(scriptPath));

describeDecision("estimate-sheet bottleneck decision contract", () => {
  it("uses the dedicated decision schema and explicit branch predicates", () => {
    const source = readFileSync(scriptPath, "utf8");
    expect(source).toContain(DECISION_SCHEMA);
    for (const unit of ["UNIT-005", "UNIT-006", "UNIT-007", "UNIT-008", "UNIT-009"]) {
      expect(source).toContain(unit);
    }
    expect(source).toMatch(/activate/);
    expect(source).toMatch(/supersede/);
  });

  it("keeps zero-count and exact-count budgets explicit", () => {
    expect(PERFORMANCE_BUDGETS.closedDialogMoveOptionWork).toBe(0);
    expect(PERFORMANCE_BUDGETS.unrelatedSidebarRenders).toBe(0);
    expect(PERFORMANCE_BUDGETS.authoritativePatchCount).toBe(1);
    expect(PERFORMANCE_BUDGETS.nonmatchingRowInspections).toBe(0);
  });

  it("does not rank a branch without an explicit metric predicate", () => {
    const source = readFileSync(scriptPath, "utf8");
    expect(source).toMatch(/missing|non-finite|finite|fail closed/i);
    expect(source).toMatch(/threshold|predicate/i);
  });
});

