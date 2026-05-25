import { describe, expect, it } from "vitest";

import { isMissingColumnError, isMissingRelationError, normalizeEstimateRecord } from "@/lib/repositories/estimate-schema-compat";

describe("estimate schema compatibility", () => {
  it("normalizes legacy revision_label rows to the sheet_code app contract", () => {
    const estimate = normalizeEstimateRecord({
      id: "33333333-3333-4333-8333-333333333333",
      project_id: "22222222-2222-4222-8222-222222222222",
      name: "Lewis Residence",
      revision_label: "EST-LR-001",
      currency_code: "PHP",
      metadata: {},
      created_at: "2026-05-19T00:00:00.000Z",
      created_by: "4e23801d-6fc2-4886-b980-d15ca2b164b8",
      updated_at: "2026-05-19T00:00:00.000Z",
    });

    expect(estimate.sheet_code).toBe("EST-LR-001");
    expect(estimate.notes).toBeNull();
    expect(estimate.project_budget).toBeNull();
  });

  it("detects Postgres and PostgREST missing-column errors for one column", () => {
    expect(isMissingColumnError({ code: "42703", message: "column estimates.sheet_code does not exist" }, "sheet_code")).toBe(true);
    expect(isMissingColumnError({ code: "PGRST204", message: "Could not find the 'sheet_code' column of 'estimates' in the schema cache" }, "sheet_code")).toBe(true);
    expect(isMissingColumnError({ code: "42703", message: "column estimates.name does not exist" }, "sheet_code")).toBe(false);
  });

  it("detects missing relation errors during staged migration rollout", () => {
    expect(isMissingRelationError({ code: "42P01", message: "relation public.estimate_templates does not exist" }, "estimate_templates")).toBe(true);
    expect(isMissingRelationError({ code: "PGRST205", message: "Could not find the table 'public.estimate_templates' in the schema cache" }, "estimate_templates")).toBe(true);
    expect(isMissingRelationError({ code: "PGRST205", message: "Could not find the table 'public.estimates' in the schema cache" }, "estimate_templates")).toBe(false);
  });
});
