import { beforeEach, describe, expect, it, vi } from "vitest";

const PROJECT_ID = "22222222-2222-4222-8222-222222222222";
const ESTIMATE_ID = "33333333-3333-4333-8333-333333333333";
const GROUP_NODE_ID = "44444444-4444-4444-8444-444444444444";
const AREA_NODE_ID = "55555555-5555-4555-8555-555555555555";

const requireCurrentUserContext = vi.hoisted(() => vi.fn());
const fromSpy = vi.hoisted(() => vi.fn());
const rpcSpy = vi.hoisted(() => vi.fn());
const selectArgs = vi.hoisted(() => [] as Array<{ table: string; columns: string }>);

vi.mock("@/lib/auth/session", () => ({
  requireCurrentUserContext,
  getCurrentUserContext: requireCurrentUserContext,
}));
vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: vi.fn(async () => ({ from: fromSpy, rpc: rpcSpy })),
}));

import { listProjectEstimates } from "@/lib/repositories/workspace-repository";

function chain(table: string, { rows = [] as unknown[], single = null as unknown }) {
  const c: Record<string, unknown> = {};
  for (const method of ["eq", "in", "order", "is", "gte", "lte", "not", "or", "contains", "limit"]) {
    c[method] = () => c;
  }
  c.select = (columns: string) => {
    selectArgs.push({ table, columns });
    return c;
  };
  c.maybeSingle = async () => ({ data: single, error: null });
  c.single = async () => ({ data: single, error: null });
  c.then = (resolve: (value: { data: unknown[]; error: null }) => unknown) => resolve({ data: rows, error: null });
  return c;
}

describe("listProjectEstimates read path (F8 / F9 — P2-1, P2-2)", () => {
  beforeEach(() => {
    fromSpy.mockReset();
    rpcSpy.mockReset();
    selectArgs.length = 0;
    requireCurrentUserContext.mockResolvedValue({
      userId: "11111111-1111-4111-8111-111111111111",
      email: "owner@example.com",
      profile: { id: "11111111-1111-4111-8111-111111111111", default_workspace_id: "ws-1", role: "admin" },
    });
    fromSpy.mockImplementation((table: string) => {
      if (table === "workspaces") return chain(table, { single: { id: "ws-1", name: "WS", created_by: "u1" } });
      if (table === "projects") return chain(table, { single: { id: PROJECT_ID, workspace_id: "ws-1", name: "Proj" } });
      if (table === "estimates")
        return chain(table, {
          rows: [
            {
              id: ESTIMATE_ID,
              project_id: PROJECT_ID,
              name: "Estimate",
              sheet_code: "EST-001",
              currency_code: "PHP",
              notes: null,
              project_budget: null,
              created_at: "2026-01-01T00:00:00Z",
              updated_at: "2026-01-01T00:00:00Z",
            },
          ],
        });
      if (table === "estimate_nodes")
        return chain(table, {
          rows: [
            { id: GROUP_NODE_ID, estimate_id: ESTIMATE_ID, kind: "group", parent_id: null, sort_order: 0 },
            { id: AREA_NODE_ID, estimate_id: ESTIMATE_ID, kind: "area", parent_id: GROUP_NODE_ID, sort_order: 0 },
          ],
        });
      return chain(table, {});
    });
    rpcSpy.mockResolvedValue({
      data: [{ estimate_id: ESTIMATE_ID, node_count: 7, row_count: 3, total_cost: 1234.5, first_node_id: null }],
      error: null,
    });
  });

  it("selects explicit estimate columns, never metadata/created_by (F9)", async () => {
    await listProjectEstimates(PROJECT_ID);
    const estimateSelect = selectArgs.find((entry) => entry.table === "estimates");
    expect(estimateSelect?.columns).toBe(
      "id, project_id, name, sheet_code, currency_code, notes, project_budget, created_at, updated_at",
    );
    expect(estimateSelect?.columns).not.toContain("metadata");
    expect(estimateSelect?.columns).not.toContain("created_by");
    expect(estimateSelect?.columns).not.toContain("*");
  });

  it("builds count/total maps from the aggregation RPC and drops the all-rows JS fold (F8)", async () => {
    const result = await listProjectEstimates(PROJECT_ID);

    expect(rpcSpy).toHaveBeenCalledWith("project_estimate_list_summaries", { target_project_id: PROJECT_ID });
    // The all-row-items fetch is gone — counts/totals come from the RPC.
    expect(fromSpy.mock.calls.map((call) => call[0])).not.toContain("estimate_row_items");
    expect(result.nodeCountByEstimateId.get(ESTIMATE_ID)).toBe(7);
    expect(result.rowCountByEstimateId.get(ESTIMATE_ID)).toBe(3);
    expect(result.totalCostByEstimateId.get(ESTIMATE_ID)).toBe(1234.5);
    // first node still selected by the depth-first/area-first JS oracle (Path A).
    expect(result.firstNodeByEstimateId.get(ESTIMATE_ID)).toBe(AREA_NODE_ID);
  });
});
