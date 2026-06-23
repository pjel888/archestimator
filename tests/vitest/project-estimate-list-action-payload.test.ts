import { describe, expect, it } from "vitest";

import {
  buildProjectEstimateListRow,
  projectEstimateListRowSource,
} from "@/lib/estimates/project-estimate-list-row";
import { computeEstimateRowLineTotal, sumEstimateRowLineTotals } from "@/lib/estimates/estimate-row-total";

const SENSITIVE_FIELDS = ["metadata", "created_by", "workspace_id", "assumptions"] as const;

const recordWithSensitiveFields = {
  id: "estimate-1",
  project_id: "project-1",
  name: "Ground Floor",
  sheet_code: "EST-001",
  currency_code: "PHP",
  notes: "n",
  project_budget: 5000,
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-02T00:00:00Z",
  // sensitive columns a normalized estimate record carries
  metadata: { secret: true },
  created_by: "user-1",
  workspace_id: "workspace-1",
} as never;

describe("estimate action reconciliation payloads", () => {
  it("create reconcile via a full canonical row carrying an empty tree summary", () => {
    // The action return contract: { row: ProjectEstimateListRow }. This is the
    // shape the optimistic store reconciles a temp insert against — it must
    // include the server-computed summary and no sensitive columns.
    const row = buildProjectEstimateListRow(recordWithSensitiveFields, {
      firstNodeId: null,
      nodeCount: 0,
      rowItemCount: 0,
      totalProjectCost: 0,
      isFavorite: false,
      favoriteCreatedAt: null,
    });

    const keys = Object.keys(row);
    for (const sensitive of SENSITIVE_FIELDS) expect(keys).not.toContain(sensitive);
    expect(row.firstNodeId).toBeNull();
    expect(row.nodeCount).toBe(0);
  });

  it("update/regenerate reconcile via a scalar-only canonical source projection", () => {
    // The action return contract for scalar-only edits: { estimate:
    // ProjectEstimateListRowSource }. The client patches these scalar fields and
    // keeps its existing summary. No summary keys, no sensitive columns.
    const estimate = projectEstimateListRowSource(recordWithSensitiveFields);
    const keys = Object.keys(estimate);

    for (const sensitive of SENSITIVE_FIELDS) expect(keys).not.toContain(sensitive);
    expect(keys).not.toContain("nodeCount");
    expect(keys).not.toContain("totalProjectCost");
    expect(estimate.sheet_code).toBe("EST-001");
    expect(estimate.name).toBe("Ground Floor");
  });

  it("computes line totals matching the SQL estimate_row_line_total formula", () => {
    // quantity*unit_cost + misc_cost + subtotal*contingency/100
    expect(computeEstimateRowLineTotal({ quantity: 2, unit_cost: 100, contingency_percentage: 5, misc_cost: 10 })).toBe(
      2 * 100 + 10 + (2 * 100 * 5) / 100,
    );
    expect(computeEstimateRowLineTotal({ quantity: 1, unit_cost: 100, contingency_percentage: null, misc_cost: 0 })).toBe(100);
    expect(computeEstimateRowLineTotal({ quantity: null, unit_cost: null, misc_cost: 25 })).toBe(25);
  });

  it("sums duplicated rows into a single optimistic total", () => {
    const total = sumEstimateRowLineTotals([
      { quantity: 2, unit_cost: 100, contingency_percentage: 5, misc_cost: 10 },
      { quantity: 1, unit_cost: 50, contingency_percentage: 0, misc_cost: 0 },
    ]);
    expect(total).toBe(220 + 50);
  });
});
