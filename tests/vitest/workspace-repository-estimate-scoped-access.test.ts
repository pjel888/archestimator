import { beforeEach, describe, expect, it, vi } from "vitest";

import type { D1DatabaseLike, D1Value } from "@/lib/cloudflare/d1";

const PROJECT_ID = "22222222-2222-4222-8222-222222222222";
const WORKSPACE_ID = "11111111-1111-4111-8111-111111111111";
const ESTIMATE_ID = "33333333-3333-4333-8333-333333333333";
const TAB_ID = "44444444-4444-4444-8444-444444444444";
const NODE_ID = "55555555-5555-4555-8555-555555555555";
const SHEET_USER_ID = "66666666-6666-4666-8666-666666666666";

const requireCurrentUserContext = vi.hoisted(() => vi.fn());
const getCloudflareD1Database = vi.hoisted(() => vi.fn());

vi.mock("server-only", () => ({}));
vi.mock("@/lib/auth/session", () => ({
  requireCurrentUserContext,
  getCurrentUserContext: requireCurrentUserContext,
}));
vi.mock("@/lib/cloudflare/d1", () => ({
  getCloudflareD1Database,
}));

import {
  getEstimateTreesForTabs,
  getProjectEstimateTreeByEstimate,
  resolveEstimateTabRouteContext,
} from "@/lib/repositories/workspace-repository";

type CapturedQuery = {
  sql: string;
  values: D1Value[];
};

function projectRow() {
  return {
    id: PROJECT_ID,
    workspace_id: WORKSPACE_ID,
    created_by: "77777777-7777-4777-8777-777777777777",
    name: "Sheet-scoped project",
    client_name: null,
    location: null,
    project_code: "P-108",
    currency_code: "PHP",
    metadata: "{}",
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
  };
}

function workspaceRow() {
  return {
    id: WORKSPACE_ID,
    created_by: "77777777-7777-4777-8777-777777777777",
    name: "Sheet Scope Builders",
    slug: null,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
  };
}

function estimateRow() {
  return {
    id: ESTIMATE_ID,
    project_id: PROJECT_ID,
    name: "Invited sheet",
    sheet_code: "EST-108",
    notes: null,
    project_budget: null,
    currency_code: "PHP",
    metadata: "{}",
    created_by: null,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
  };
}

function tabRow() {
  return {
    id: TAB_ID,
    estimate_id: ESTIMATE_ID,
    name: "Main",
    sort_order: 0,
    is_default: 1,
    archived_at: null,
    metadata: "{}",
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
  };
}

function createD1Fixture() {
  const queries: CapturedQuery[] = [];
  const db: D1DatabaseLike = {
    prepare: vi.fn((sql: string) => {
      const statement = {
        values: [] as D1Value[],
        bind: vi.fn((...values: D1Value[]) => {
          statement.values = values;
          return statement;
        }),
        first: vi.fn(async () => {
          queries.push({ sql, values: statement.values });

          if (sql.includes("SELECT id, workspace_id") && sql.includes("FROM projects")) return projectRow();
          if (sql.includes("SELECT 1 AS allowed") && sql.includes("FROM projects project")) return null;
          if (sql.includes("SELECT 1 AS allowed") && sql.includes("FROM estimates estimate") && sql.includes("estimate_sheet_members sheet_member")) {
            return { allowed: 1 };
          }
          if (sql.includes("SELECT id, project_id, name") && sql.includes("FROM estimates") && sql.includes("AND project_id = ?")) {
            return estimateRow();
          }
          if (sql.includes("FROM workspaces") && sql.includes("WHERE id = ?")) return workspaceRow();
          if (sql.includes("FROM estimate_tabs") && sql.includes("is_default = 1")) return tabRow();
          if (sql.includes("FROM estimate_tabs") && sql.includes("WHERE id = ?")) return tabRow();
          if (sql.includes("SELECT node.id, node.estimate_id, node.estimate_tab_id")) {
            return { id: NODE_ID, estimate_id: ESTIMATE_ID, estimate_tab_id: TAB_ID };
          }
          if (sql.includes("FROM estimate_sheet_adjustments")) return null;
          return null;
        }),
        all: vi.fn(async () => {
          queries.push({ sql, values: statement.values });

          if (sql.includes("FROM estimate_nodes")) {
            return {
              results: [
                {
                  id: NODE_ID,
                  estimate_id: ESTIMATE_ID,
                  estimate_tab_id: TAB_ID,
                  kind: "area",
                  name: "Area A",
                  parent_id: null,
                  sort_order: 0,
                },
              ],
            };
          }
          if (sql.includes("FROM estimate_row_items")) return { results: [] };
          if (sql.includes("FROM estimate_tabs")) return { results: [tabRow()] };
          return { results: [] };
        }),
        run: vi.fn(async () => ({ success: true, meta: { changes: 0 } })),
      };
      return statement;
    }),
  };
  return { db, queries };
}

describe("estimate-scoped project context", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireCurrentUserContext.mockResolvedValue({
      userId: SHEET_USER_ID,
      email: "sheet-only@example.com",
      role: "member",
      profile: { id: SHEET_USER_ID, default_workspace_id: WORKSPACE_ID, role: "member" },
    });
  });

  it("lets sheet-only collaborators load an estimate tree without whole-project access", async () => {
    const fixture = createD1Fixture();
    getCloudflareD1Database.mockResolvedValue(fixture.db);

    const result = await getProjectEstimateTreeByEstimate(PROJECT_ID, ESTIMATE_ID);

    expect(result.project?.id).toBe(PROJECT_ID);
    expect(result.estimate?.id).toBe(ESTIMATE_ID);
    expect(result.tree).toHaveLength(1);
    expect(result.tree[0]?.id).toBe(NODE_ID);

    const wholeProjectCheck = fixture.queries.find((query) =>
      query.sql.includes("SELECT 1 AS allowed") &&
      query.sql.includes("FROM projects project")
    );
    expect(wholeProjectCheck?.sql).not.toContain("estimate_sheet_members");

    const estimateCheck = fixture.queries.find((query) =>
      query.sql.includes("SELECT 1 AS allowed") &&
      query.sql.includes("FROM estimates estimate")
    );
    expect(estimateCheck?.sql).toContain("estimate_sheet_members sheet_member");
    expect(estimateCheck?.values).toContain(SHEET_USER_ID);
  });

  it("keeps all-tab export reads available to estimate-scoped sheet members", async () => {
    const fixture = createD1Fixture();
    getCloudflareD1Database.mockResolvedValue(fixture.db);

    const result = await getEstimateTreesForTabs(
      PROJECT_ID,
      ESTIMATE_ID,
      [{ id: TAB_ID, name: "Main", sortOrder: 0, isDefault: true }],
    );

    expect(result.project?.id).toBe(PROJECT_ID);
    expect(result.estimate?.id).toBe(ESTIMATE_ID);
    expect(result.tabs).toHaveLength(1);
    expect(result.tabs[0]?.tree[0]?.id).toBe(NODE_ID);

    const wholeProjectCheck = fixture.queries.find((query) =>
      query.sql.includes("SELECT 1 AS allowed") &&
      query.sql.includes("FROM projects project")
    );
    expect(wholeProjectCheck?.sql).not.toContain("estimate_sheet_members");

    const estimateCheck = fixture.queries.find((query) =>
      query.sql.includes("SELECT 1 AS allowed") &&
      query.sql.includes("FROM estimates estimate")
    );
    expect(estimateCheck?.sql).toContain("estimate_sheet_members sheet_member");
  });

  it("lets sheet-only collaborators resolve the estimate route through a node segment", async () => {
    const fixture = createD1Fixture();
    getCloudflareD1Database.mockResolvedValue(fixture.db);

    const result = await resolveEstimateTabRouteContext(PROJECT_ID, NODE_ID);

    expect(result.project?.id).toBe(PROJECT_ID);
    expect(result.estimate?.id).toBe(ESTIMATE_ID);
    expect(result.tab?.id).toBe(TAB_ID);
    expect(result.selectedNodeId).toBe(NODE_ID);
    expect(result.tree).toHaveLength(1);

    const selectedNodeLookup = fixture.queries.find((query) =>
      query.sql.includes("SELECT node.id, node.estimate_id, node.estimate_tab_id")
    );
    expect(selectedNodeLookup?.values).toEqual([NODE_ID, PROJECT_ID]);

    const wholeProjectCheck = fixture.queries.find((query) =>
      query.sql.includes("SELECT 1 AS allowed") &&
      query.sql.includes("FROM projects project")
    );
    expect(wholeProjectCheck?.sql).not.toContain("estimate_sheet_members");

    const estimateCheck = fixture.queries.find((query) =>
      query.sql.includes("SELECT 1 AS allowed") &&
      query.sql.includes("FROM estimates estimate")
    );
    expect(estimateCheck?.sql).toContain("estimate_sheet_members sheet_member");
    expect(estimateCheck?.values).toContain(ESTIMATE_ID);
  });
});
