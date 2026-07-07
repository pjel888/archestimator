import { beforeEach, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";

const PROJECT_ID = "22222222-2222-4222-8222-222222222222";
const ESTIMATE_ID = "33333333-3333-4333-8333-333333333333";
const GROUP_NODE_ID = "44444444-4444-4444-8444-444444444444";
const AREA_NODE_ID = "55555555-5555-4555-8555-555555555555";

const requireCurrentUserContext = vi.hoisted(() => vi.fn());
const getCloudflareD1Database = vi.hoisted(() => vi.fn());
const preparedSql = vi.hoisted(() => [] as string[]);

vi.mock("@/lib/auth/session", () => ({
  requireCurrentUserContext,
  getCurrentUserContext: requireCurrentUserContext,
}));
vi.mock("@/lib/cloudflare/d1", () => ({
  getCloudflareD1Database,
}));

import { listProjectEstimates } from "@/lib/repositories/workspace-repository";

function createD1Fixture() {
  return {
    prepare(sql: string) {
      preparedSql.push(sql);
      return {
        bind() {
          return {
            async first() {
              if (sql.includes("FROM projects") && sql.includes("WHERE id = ?")) {
                return {
                  id: PROJECT_ID,
                  workspace_id: "ws-1",
                  created_by: "11111111-1111-4111-8111-111111111111",
                  name: "Proj",
                  client_name: null,
                  location: null,
                  project_code: "P-001",
                  currency_code: "PHP",
                  metadata: "{}",
                  created_at: "2026-01-01T00:00:00Z",
                  updated_at: "2026-01-01T00:00:00Z",
                };
              }
              if (sql.includes("FROM workspaces") && sql.includes("WHERE id = ?")) {
                return {
                  id: "ws-1",
                  created_by: "11111111-1111-4111-8111-111111111111",
                  name: "WS",
                  slug: null,
                  created_at: "2026-01-01T00:00:00Z",
                  updated_at: "2026-01-01T00:00:00Z",
                };
              }
              return null;
            },
            async all() {
              if (sql.includes("FROM estimates") && sql.includes("WHERE project_id = ?")) {
                return {
                  results: [
                    {
                      id: ESTIMATE_ID,
                      project_id: PROJECT_ID,
                      name: "Estimate",
                      sheet_code: "EST-001",
                      currency_code: "PHP",
                      notes: null,
                      project_budget: null,
                      metadata: "{}",
                      created_by: null,
                      created_at: "2026-01-01T00:00:00Z",
                      updated_at: "2026-01-01T00:00:00Z",
                    },
                  ],
                };
              }
              if (sql.includes("FROM estimates estimate")) {
                return {
                  results: [{ estimate_id: ESTIMATE_ID, node_count: 7, row_count: 3, total_cost: 1234.5 }],
                };
              }
              if (sql.includes("FROM estimate_nodes") && sql.includes("WHERE estimate_id IN")) {
                return {
                  results: [
                    { id: GROUP_NODE_ID, estimate_id: ESTIMATE_ID, kind: "group", parent_id: null, sort_order: 0 },
                    { id: AREA_NODE_ID, estimate_id: ESTIMATE_ID, kind: "area", parent_id: GROUP_NODE_ID, sort_order: 0 },
                  ],
                };
              }
              return { results: [] };
            },
          };
        },
      };
    },
  };
}

describe("listProjectEstimates read path (F8 / F9 — P2-1, P2-2)", () => {
  beforeEach(() => {
    preparedSql.length = 0;
    requireCurrentUserContext.mockResolvedValue({
      userId: "11111111-1111-4111-8111-111111111111",
      email: "owner@example.com",
      role: "admin",
      profile: { id: "11111111-1111-4111-8111-111111111111", default_workspace_id: "ws-1", role: "admin" },
    });
    getCloudflareD1Database.mockResolvedValue(createD1Fixture());
  });

  it("selects explicit estimate columns, never metadata/created_by (F9)", async () => {
    await listProjectEstimates(PROJECT_ID);
    const estimateSelect = preparedSql.find((sql) => sql.includes("FROM estimates") && sql.includes("WHERE project_id = ?"));
    expect(estimateSelect).toContain("SELECT id, project_id, name, sheet_code, currency_code, notes, project_budget, created_at, updated_at");
    expect(estimateSelect).not.toContain("metadata");
    expect(estimateSelect).not.toContain("created_by");
    expect(estimateSelect).not.toContain("SELECT *");
  });

  it("starts the project lookup and estimates list in the same request wave", () => {
    const source = readFileSync("src/lib/repositories/workspace-repository.ts", "utf8");

    expect(source).toContain("const projectContextPromise = getCurrentWorkspaceProject(projectId)");
    expect(source).toContain("const estimatesPromise = traced(\"listProjectEstimates.estimates\"");
    expect(source).toContain("WHERE project_id = ?");
    expect(source).toContain("await Promise.all([projectContextPromise, estimatesPromise])");
  });

  it("builds count/total maps from D1 aggregate SQL and drops the all-rows JS fold (F8)", async () => {
    const result = await listProjectEstimates(PROJECT_ID);

    expect(preparedSql.some((sql) => sql.includes("FROM estimates estimate") && sql.includes("node_count"))).toBe(true);
    expect(preparedSql.some((sql) => sql.includes("SELECT id, estimate_id, kind, parent_id, sort_order"))).toBe(true);
    expect(readFileSync("src/lib/repositories/workspace-repository.ts", "utf8")).not.toContain("project_estimate_list_summaries");
    expect(result.nodeCountByEstimateId.get(ESTIMATE_ID)).toBe(7);
    expect(result.rowCountByEstimateId.get(ESTIMATE_ID)).toBe(3);
    expect(result.totalCostByEstimateId.get(ESTIMATE_ID)).toBe(1234.5);
    // first node still selected by the depth-first/area-first JS oracle (Path A).
    expect(result.firstNodeByEstimateId.get(ESTIMATE_ID)).toBe(AREA_NODE_ID);
  });

  it("keeps D1 project and estimate reads behind explicit access checks", () => {
    const source = readFileSync("src/lib/repositories/workspace-repository.ts", "utf8");

    expect(source).toContain("canAccessProjectInD1(database, projectRow.id, userContext)");
    expect(source).toContain("canAccessEstimateInD1(database, normalizedEstimate.id, userContext)");
    expect(source).toContain("AND estimate.id IN (${placeholders(estimateIds)})");
    expect(source).toContain("canAccessEstimateInD1(database, estimate.id, userContext)");
  });

  it("does not return project estimates when the D1 access predicate denies the caller", async () => {
    requireCurrentUserContext.mockResolvedValue({
      userId: "99999999-9999-4999-8999-999999999999",
      email: "attacker@example.com",
      role: "member",
      profile: { id: "99999999-9999-4999-8999-999999999999", default_workspace_id: "ws-1", role: "member" },
    });

    const result = await listProjectEstimates(PROJECT_ID);

    expect(preparedSql.some((sql) => sql.includes("SELECT 1 AS allowed") && sql.includes("FROM projects project"))).toBe(true);
    expect(result.project).toBeNull();
    expect(result.estimates).toEqual([]);
    expect(result.totalCostByEstimateId.size).toBe(0);
  });
});
