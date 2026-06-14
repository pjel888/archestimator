import { beforeEach, describe, expect, it, vi } from "vitest";

const PROJECT_ID = "11111111-1111-4111-8111-111111111111";
const ESTIMATE_ID = "33333333-3333-4333-8333-333333333333";
const NODE_ID = "44444444-4444-4444-8444-444444444444";
const WORKSPACE_ID = "22222222-2222-4222-8222-222222222222";

const getCurrentWorkspaceProject = vi.hoisted(() => vi.fn());
const getProjectPublicationSummary = vi.hoisted(() => vi.fn());
const listProjectEstimates = vi.hoisted(() => vi.fn());
const fromSpy = vi.hoisted(() => vi.fn());
// Records every `.eq(column, value)` filter, tagged with the table it ran against.
const eqCalls = vi.hoisted(() => [] as Array<{ table: string; column: string; value: unknown }>);

vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: vi.fn(async () => ({ from: fromSpy })),
}));
vi.mock("@/lib/repositories/workspace-repository", () => ({
  getCurrentWorkspaceProject,
  getProjectPublicationSummary,
  listProjectEstimates,
}));

import {
  assembleDashboardSummary,
  DASHBOARD_ESTIMATE_NODE_LIMIT,
  getDashboardEstimateSeries,
} from "@/lib/repositories/project-dashboard-repository";
import type { Tables } from "@/lib/supabase/types";

type TableData = { rows?: unknown[]; single?: unknown };

function chain(table: string, { rows = [] as unknown[], single = null as unknown }: TableData) {
  const c: Record<string, unknown> = {};
  c.select = () => c;
  c.eq = (column: string, value: unknown) => {
    eqCalls.push({ table, column, value });
    return c;
  };
  for (const method of ["in", "order", "limit", "is", "gte", "lte", "not", "or"]) {
    c[method] = () => c;
  }
  c.maybeSingle = async () => ({ data: single, error: null });
  c.single = async () => ({ data: single, error: null });
  c.then = (resolve: (value: { data: unknown[]; error: null }) => unknown) => resolve({ data: rows, error: null });
  return c;
}

const ESTIMATE_META = {
  id: ESTIMATE_ID,
  name: "Base build",
  sheet_code: "EST-001",
  currency_code: "PHP",
  updated_at: "2026-06-10T00:00:00.000Z",
};

// qty*unit + misc + qty*unit*contingency/100 → (2*100) + 0 + 0 = 200; (1*50)+10+0 = 60 → 260.
const ROW_FACTS = [
  {
    id: "row-a",
    estimate_id: ESTIMATE_ID,
    node_id: NODE_ID,
    supplier: "Acme",
    source_snapshot: { categoryNodeId: "cat-1", supplierId: "sup-1", supplier: "Acme" },
    quantity: 2,
    unit_cost: 100,
    contingency_percentage: 0,
    misc_cost: 0,
  },
  {
    id: "row-b",
    estimate_id: ESTIMATE_ID,
    node_id: NODE_ID,
    supplier: "Beta",
    source_snapshot: { categoryNodeId: "cat-2", supplierId: "sup-2", supplier: "Beta" },
    quantity: 1,
    unit_cost: 50,
    contingency_percentage: 0,
    misc_cost: 10,
  },
];

const NODE_FACTS = [{ id: NODE_ID, estimate_id: ESTIMATE_ID, parent_id: null, kind: "area", name: "Ground floor", sort_order: 0 }];

function mockTables({ estimateMeta = ESTIMATE_META as unknown, rows = ROW_FACTS, nodes = NODE_FACTS as unknown[] }: {
  estimateMeta?: unknown;
  rows?: unknown[];
  nodes?: unknown[];
} = {}) {
  fromSpy.mockImplementation((table: string) => {
    if (table === "estimates") return chain(table, { single: estimateMeta });
    if (table === "estimate_row_items") return chain(table, { rows });
    if (table === "estimate_nodes") return chain(table, { rows: nodes });
    return chain(table, { rows: [] });
  });
}

describe("getDashboardEstimateSeries", () => {
  beforeEach(() => {
    fromSpy.mockReset();
    eqCalls.length = 0;
    getCurrentWorkspaceProject.mockResolvedValue({
      workspace: { id: WORKSPACE_ID },
      project: { id: PROJECT_ID, name: "Lewis Residence" },
    });
  });

  it("returns space/category/supplier series whose totals reconcile to the row facts (R14)", async () => {
    mockTables();
    const result = await getDashboardEstimateSeries(PROJECT_ID, ESTIMATE_ID);

    expect(result).not.toBeNull();
    expect(result?.currencyCode).toBe("PHP");
    expect(result?.estimateName).toBe("Base build");
    // Same partition of the same rows → every grouping mode totals identically.
    expect(result?.series.category.total).toBe(260);
    expect(result?.series.space.total).toBe(260);
    expect(result?.series.supplier.total).toBe(260);
    expect(result?.series.category.allBuckets.length).toBeGreaterThan(0);
    expect(result?.didTruncate).toBe(false);
  });

  it("loads facts for ONLY the requested estimate, scoped by project and id (KTD-1)", async () => {
    mockTables();
    await getDashboardEstimateSeries(PROJECT_ID, ESTIMATE_ID);

    // estimate metadata is scoped on BOTH project_id and id (no foreign-estimate leak).
    const estimateFilters = eqCalls.filter((call) => call.table === "estimates");
    expect(estimateFilters).toEqual([
      { table: "estimates", column: "project_id", value: PROJECT_ID },
      { table: "estimates", column: "id", value: ESTIMATE_ID },
    ]);

    // fact tables filter on the single estimate_id — never `.in` across the project.
    expect(eqCalls).toContainEqual({ table: "estimate_row_items", column: "estimate_id", value: ESTIMATE_ID });
    expect(eqCalls).toContainEqual({ table: "estimate_nodes", column: "estimate_id", value: ESTIMATE_ID });
  });

  it("handles an estimate with zero rows without throwing (empty buckets, total 0)", async () => {
    mockTables({ rows: [] });
    const result = await getDashboardEstimateSeries(PROJECT_ID, ESTIMATE_ID);

    expect(result?.series.category.total).toBe(0);
    expect(result?.series.category.allBuckets).toEqual([]);
  });

  it("flags truncation when the node count exceeds the per-estimate cap", async () => {
    const tooMany = Array.from({ length: DASHBOARD_ESTIMATE_NODE_LIMIT + 1 }, (_unused, index) => ({
      id: `node-${index}`,
      estimate_id: ESTIMATE_ID,
      parent_id: null,
      kind: "group",
      name: `Node ${index}`,
      sort_order: index,
    }));
    mockTables({ nodes: tooMany });

    const result = await getDashboardEstimateSeries(PROJECT_ID, ESTIMATE_ID);
    expect(result?.didTruncate).toBe(true);
  });

  it("returns null for an unknown or foreign estimate id (RLS, no leak)", async () => {
    mockTables({ estimateMeta: null });
    const result = await getDashboardEstimateSeries(PROJECT_ID, "99999999-9999-4999-8999-999999999999");
    expect(result).toBeNull();
  });

  it("returns null when the project is not visible to the caller", async () => {
    getCurrentWorkspaceProject.mockResolvedValueOnce({ workspace: { id: WORKSPACE_ID }, project: null });
    const result = await getDashboardEstimateSeries(PROJECT_ID, ESTIMATE_ID);
    expect(result).toBeNull();
  });
});

function estimate(overrides: Partial<Tables<"estimates">>): Tables<"estimates"> {
  return {
    id: "est",
    project_id: PROJECT_ID,
    name: "Estimate",
    sheet_code: "EST",
    currency_code: "PHP",
    notes: null,
    project_budget: null,
    metadata: {},
    created_at: "2026-01-01T00:00:00.000Z",
    created_by: null,
    updated_at: "2026-01-01T00:00:00.000Z",
    ...overrides,
  } as Tables<"estimates">;
}

describe("assembleDashboardSummary", () => {
  it("picks the most-recently-updated estimate as the headline (R1/R2)", () => {
    const estimates = [
      estimate({ id: "newer", name: "Revised scope", updated_at: "2026-06-12T00:00:00.000Z" }),
      estimate({ id: "older", name: "Initial", updated_at: "2026-05-01T00:00:00.000Z" }),
    ];
    const summary = assembleDashboardSummary({
      projectId: PROJECT_ID,
      estimates,
      totalCostByEstimateId: new Map([
        ["newer", 1000],
        ["older", 800],
      ]),
      firstNodeByEstimateId: new Map([["older", "node-older"]]),
    });

    expect(summary.headline?.id).toBe("newer");
    expect(summary.headline?.name).toBe("Revised scope");
    expect(summary.headline?.total).toBe(1000);
    expect(summary.otherEstimates).toHaveLength(1);
    expect(summary.otherEstimates[0]).toMatchObject({ id: "older", total: 800, firstNodeId: "node-older" });
  });

  it("honors an in-project selected estimate id and normalizes the selected grouping mode (U1/U2)", () => {
    const estimates = [
      estimate({ id: "newer", name: "Revised scope", updated_at: "2026-06-12T00:00:00.000Z" }),
      estimate({ id: "older", name: "Initial", updated_at: "2026-05-01T00:00:00.000Z" }),
    ];
    const summary = assembleDashboardSummary({
      projectId: PROJECT_ID,
      project: { id: PROJECT_ID, name: "Lewis Residence", client_name: "Lewis Family", location: "Quezon City" },
      estimates,
      totalCostByEstimateId: new Map([
        ["newer", 1000],
        ["older", 800],
      ]),
      firstNodeByEstimateId: new Map([
        ["newer", "node-newer"],
        ["older", "node-older"],
      ]),
      nodeCountByEstimateId: new Map([["older", 3]]),
      rowCountByEstimateId: new Map([["older", 12]]),
      selectedEstimateId: "older",
      selectedGroupingMode: "supplier",
      publicationSummary: {
        projectId: PROJECT_ID,
        workspaceId: WORKSPACE_ID,
        canManagePublication: true,
        status: "published",
        publicationId: "pub-1",
        clientLinkPath: "/p/pub-1",
        tokenCopyAvailable: true,
        publishedAt: "2026-06-12T00:00:00.000Z",
        expiresAt: null,
        passwordRequired: false,
        selectedEstimateCount: 1,
        selectedEstimateIds: ["older"],
        snapshotVersion: 1,
        openCount: 0,
        latestOpenedAt: null,
        latestActivityAt: null,
      },
    });

    expect(summary.selectedEstimateId).toBe("older");
    expect(summary.selectedGroupingMode).toBe("supplier");
    expect(summary.headline?.id).toBe("older");
    expect(summary.selectedEstimate).toMatchObject({
      id: "older",
      rowCount: 12,
      nodeCount: 3,
      firstNodeId: "node-older",
      isSelected: true,
      isIncludedInProposal: true,
    });
    expect(summary.estimateSheets).toHaveLength(2);
    expect(summary.otherEstimates).toEqual([
      expect.objectContaining({ id: "newer", firstNodeId: "node-newer" }),
    ]);
    expect(summary.readiness?.status).toBe("ready");
  });

  it("falls back to the latest project estimate for unknown selected ids and defaults invalid modes to category", () => {
    const summary = assembleDashboardSummary({
      projectId: PROJECT_ID,
      estimates: [estimate({ id: "newer", updated_at: "2026-06-12T00:00:00.000Z" })],
      totalCostByEstimateId: new Map([["newer", 1000]]),
      firstNodeByEstimateId: new Map(),
      selectedEstimateId: "foreign",
      selectedGroupingMode: "rows",
    });

    expect(summary.selectedEstimateId).toBe("newer");
    expect(summary.selectedGroupingMode).toBe("category");
  });

  it("sums a single-currency rollup across all estimates (R9)", () => {
    const summary = assembleDashboardSummary({
      projectId: PROJECT_ID,
      estimates: [estimate({ id: "a", currency_code: "PHP" }), estimate({ id: "b", currency_code: "PHP" })],
      totalCostByEstimateId: new Map([
        ["a", 300],
        ["b", 700],
      ]),
      firstNodeByEstimateId: new Map(),
    });

    expect(summary.rollup).toEqual({ kind: "single-currency", total: 1000, currencyCode: "PHP" });
  });

  it("degrades to a mixed rollup with no total when currencies differ (R9/KTD-4)", () => {
    const summary = assembleDashboardSummary({
      projectId: PROJECT_ID,
      estimates: [estimate({ id: "a", currency_code: "PHP" }), estimate({ id: "b", currency_code: "USD" })],
      totalCostByEstimateId: new Map([
        ["a", 300],
        ["b", 700],
      ]),
      firstNodeByEstimateId: new Map(),
    });

    expect(summary.rollup).toEqual({ kind: "mixed" });
  });

  it("emits a variance only when the headline has a positive budget (R3)", () => {
    const withBudget = assembleDashboardSummary({
      projectId: PROJECT_ID,
      estimates: [estimate({ id: "a", project_budget: 800 })],
      totalCostByEstimateId: new Map([["a", 1000]]),
      firstNodeByEstimateId: new Map(),
    });
    expect(withBudget.headline?.variance).toEqual({ budget: 800, delta: 200, percent: 0.25, isOver: true });

    const withoutBudget = assembleDashboardSummary({
      projectId: PROJECT_ID,
      estimates: [estimate({ id: "a", project_budget: null })],
      totalCostByEstimateId: new Map([["a", 1000]]),
      firstNodeByEstimateId: new Map(),
    });
    expect(withoutBudget.headline?.variance).toBeNull();
  });

  it("collapses a single estimate to an empty other-estimates list", () => {
    const summary = assembleDashboardSummary({
      projectId: PROJECT_ID,
      estimates: [estimate({ id: "only" })],
      totalCostByEstimateId: new Map([["only", 500]]),
      firstNodeByEstimateId: new Map(),
    });
    expect(summary.otherEstimates).toEqual([]);
    expect(summary.rollup).toEqual({ kind: "single-currency", total: 500, currencyCode: "PHP" });
  });

  it("flags the empty project so the zero-estimate state can render (R12)", () => {
    const summary = assembleDashboardSummary({
      projectId: PROJECT_ID,
      estimates: [],
      totalCostByEstimateId: new Map(),
      firstNodeByEstimateId: new Map(),
    });
    expect(summary.estimateCount).toBe(0);
    expect(summary.headline).toBeNull();
    expect(summary.costMix).toBeNull();
  });
});
