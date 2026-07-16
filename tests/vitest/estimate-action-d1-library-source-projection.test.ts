import { describe, expect, it, vi } from "vitest";

import type { D1DatabaseLike, D1PreparedStatementLike, D1Result, D1Value } from "@/lib/cloudflare/d1";
import { EstimateActionsD1Client } from "@/lib/estimates/d1-action-client";

vi.mock("server-only", () => ({}));

function createCapturingDatabase(row: Record<string, unknown>) {
  const capture = { sql: "", values: [] as D1Value[] };
  const database: D1DatabaseLike = {
    prepare<T = Record<string, unknown>>(sql: string): D1PreparedStatementLike<T> {
      capture.sql = sql;
      const statement: D1PreparedStatementLike<T> = {
        bind(...values: D1Value[]) {
          capture.values = values;
          return statement;
        },
        async first<R = T>() {
          return row as R;
        },
        async all<R = T>(): Promise<D1Result<R>> {
          return { success: true, results: [row as R] };
        },
        async run() {
          return { success: true };
        },
      };
      return statement;
    },
  };
  return { capture, database };
}

describe("EstimateActionsD1Client library-source projection", () => {
  it("returns every field required by the estimate commit freshness guard", async () => {
    const sourceId = "11111111-1111-4111-8111-111111111111";
    const sourceRow = {
      id: sourceId,
      workspace_id: "22222222-2222-4222-8222-222222222222",
      active_price_option_id: "33333333-3333-4333-8333-333333333333",
      current_version_number: 7,
      updated_at: "2026-07-15T00:00:00.000Z",
      lifecycle_state: "available",
      unit: "box",
      unit_cost: 2500,
      misc_cost: 25,
    };
    const { capture, database } = createCapturingDatabase(sourceRow);

    const client = new EstimateActionsD1Client(database, null);
    const result = await client
      .from("cost_library_items")
      .select("id, workspace_id, active_price_option_id, current_version_number, updated_at, lifecycle_state, unit, unit_cost, misc_cost")
      .eq("id", sourceId)
      .maybeSingle<typeof sourceRow>();

    expect(result).toEqual({ data: sourceRow, error: null });
    expect(capture.sql.replace(/\s+/g, " ")).toContain(
      "SELECT id, workspace_id, active_price_option_id, current_version_number, updated_at, lifecycle_state, unit, unit_cost, misc_cost FROM cost_library_items",
    );
    expect(capture.values).toEqual([sourceId]);
  });

  it("returns selected variant pricing and its current cost entry", async () => {
    const sourceId = "11111111-1111-4111-8111-111111111111";
    const optionId = "33333333-3333-4333-8333-333333333333";
    const optionRow = {
      id: optionId,
      item_id: sourceId,
      label: "Option 3",
      unit: "box",
      unit_cost: 2500,
      misc_cost: 25,
      is_active: 1,
      updated_at: "2026-07-15T00:00:00.000Z",
    };
    const optionRead = createCapturingDatabase(optionRow);
    const optionResult = await new EstimateActionsD1Client(optionRead.database, null)
      .from("cost_library_item_price_options")
      .select("id, item_id, label, unit, unit_cost, misc_cost, is_active, updated_at")
      .eq("id", optionId)
      .eq("item_id", sourceId)
      .maybeSingle<typeof optionRow>();

    expect(optionResult).toEqual({ data: optionRow, error: null });
    expect(optionRead.capture.sql.replace(/\s+/g, " ")).toContain(
      "SELECT id, item_id, label, unit, unit_cost, misc_cost, is_active, updated_at FROM cost_library_item_price_options",
    );
    expect(optionRead.capture.values).toEqual([optionId, sourceId]);

    const costRow = {
      id: "44444444-4444-4444-8444-444444444444",
      price_option_id: optionId,
      unit_cost: 2500,
      misc_cost: 25,
      updated_at: "2026-07-15T00:00:00.000Z",
    };
    const costRead = createCapturingDatabase(costRow);
    const costResult = await new EstimateActionsD1Client(costRead.database, null)
      .from("cost_library_item_variant_cost_entries")
      .select("id, price_option_id, unit_cost, misc_cost, updated_at")
      .eq("price_option_id", optionId)
      .eq("is_current", 1)
      .is("deleted_at", null)
      .maybeSingle<typeof costRow>();

    expect(costResult).toEqual({ data: costRow, error: null });
    expect(costRead.capture.sql.replace(/\s+/g, " ")).toContain(
      "SELECT id, price_option_id, unit_cost, misc_cost, updated_at FROM cost_library_item_variant_cost_entries",
    );
    expect(costRead.capture.sql).toContain("deleted_at IS NULL");
    expect(costRead.capture.values).toEqual([optionId, 1]);
  });
});
