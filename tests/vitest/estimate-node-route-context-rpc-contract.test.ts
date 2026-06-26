import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const repositorySource = readFileSync("src/lib/repositories/workspace-repository.ts", "utf8");
const estimateActionsSource = readFileSync("src/lib/estimates/actions.ts", "utf8");
const expressPromotionActionsSource = readFileSync("src/lib/estimates/express-promotion-actions.ts", "utf8");
const migrationPath = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "../../supabase/migrations/20260626125725_estimate_route_context_rpc_authorized_definer.sql",
);
const migrationSql = readFileSync(migrationPath, "utf8");
const normalizedSql = migrationSql.toLowerCase().replace(/\s+/g, " ");

function expectBefore(source: string, before: string, after: string) {
  const beforeIndex = source.indexOf(before);
  const afterIndex = source.indexOf(after);
  expect(beforeIndex, `${before} should exist`).toBeGreaterThanOrEqual(0);
  expect(afterIndex, `${after} should exist`).toBeGreaterThanOrEqual(0);
  expect(beforeIndex, `${before} should appear before ${after}`).toBeLessThan(afterIndex);
}

describe("estimate_node_route_context repository fast path", () => {
  it("tries the additive RPC before the legacy selected-node PostgREST path", () => {
    expect(repositorySource).toContain("async function readEstimateNodeRouteContextRpcPath");
    expect(repositorySource).toContain('rpc("estimate_node_route_context"');
    expect(repositorySource).toContain('traced("estimate-route-context.rpc"');
    expect(repositorySource).toContain('traced("estimate-route-context.rpc-build"');
    expect(repositorySource).toContain('process.env.ESTIMATE_NODE_ROUTE_CONTEXT_RPC_DISABLED === "1"');
    expect(repositorySource).toContain("parseEstimateNodeRouteContextRpcPayload");
    expect(repositorySource).toContain("if (rpcRouteContext) return rpcRouteContext;");
    expectBefore(
      repositorySource,
      "const rpcRouteContext = await readEstimateNodeRouteContextRpcPath",
      'traced("estimate-route-context.selected-node"',
    );
  });

  it("keeps the existing route-context fallback path available", () => {
    expect(repositorySource).toContain("estimate-route-context.selected-node");
    expect(repositorySource).toContain("estimate-route-context.tab-tree");
    expect(repositorySource).toContain("estimate-route-context.tabs-list");
    expect(repositorySource).toContain("estimate-route-context.estimate-lookup");
    expect(repositorySource).toContain("estimate-route-context.default-fallback");
  });

  it("keeps the process cache private, bounded, traceable, and opt-out capable", () => {
    expect(repositorySource).toContain("const estimateRouteContextProcessCache = new Map");
    expect(repositorySource).toContain("ESTIMATE_ROUTE_CONTEXT_PROCESS_CACHE_MAX_ENTRIES");
    expect(repositorySource).toContain("ESTIMATE_NODE_ROUTE_CONTEXT_PROCESS_CACHE_TTL_MS");
    expect(repositorySource).toContain("readEstimateRouteContextProcessCacheKey");
    expect(repositorySource).toContain("readSupabaseAuthStorageKey");
    expect(repositorySource).toContain("getDevAuthBypassCredentialFromRequestParts");
    expect(repositorySource).toContain('createHash("sha256")');
    expect(repositorySource).toContain('traced("estimate-route-context.cache-hit"');
    expect(repositorySource).toContain("structuredClone");
    expect(repositorySource).toContain("clearEstimateRouteContextProcessCache");
    expect(repositorySource).toContain("loadEstimateNodeRouteContextRpcPath");
    expect(repositorySource).toContain("writeEstimateRouteContextProcessCache(cacheKey, projectId, loadPromise)");
    expect(repositorySource).toContain("if (cacheKey) estimateRouteContextProcessCache.delete(cacheKey)");
    expect(repositorySource).toContain('process.env.ESTIMATE_NODE_ROUTE_CONTEXT_RPC_DISABLED === "1"');
  });

  it("invalidates the route-context process cache on estimate mutations that revalidate project estimate paths", () => {
    expect(estimateActionsSource).toContain("clearEstimateRouteContextProcessCache(projectId)");
    expectBefore(
      estimateActionsSource,
      "clearEstimateRouteContextProcessCache(projectId)",
      "revalidatePath(`/workshop/projects/${projectId}`)",
    );
    expect(expressPromotionActionsSource).toContain("clearEstimateRouteContextProcessCache(project.id)");
    expectBefore(
      expressPromotionActionsSource,
      "clearEstimateRouteContextProcessCache(project.id)",
      'revalidatePath("/workshop/library")',
    );
  });
});

describe("estimate_node_route_context migration contract", () => {
  it("is a stable explicit-authorized read RPC with an authenticated-only grant", () => {
    expect(normalizedSql).toContain("create or replace function public.estimate_node_route_context");
    expect(normalizedSql).toContain("returns jsonb");
    expect(normalizedSql).toContain("language sql");
    expect(normalizedSql).toContain("stable");
    expect(normalizedSql).toContain("security definer");
    expect(normalizedSql).toMatch(/set\s+search_path\s*=\s*public/);

    const revokeMatch = normalizedSql.match(/revoke\s+all\s+on\s+function[^;]*;/);
    expect(revokeMatch).not.toBeNull();
    expect(revokeMatch?.[0]).toContain("public");
    expect(revokeMatch?.[0]).toContain("anon");

    const grantMatch = normalizedSql.match(/grant\s+execute\s+on\s+function[^;]*;/);
    expect(grantMatch).not.toBeNull();
    expect(grantMatch?.[0]).toContain("authenticated");
  });

  it("scopes the route context to the requested project and selected node", () => {
    expect(normalizedSql).toContain("(select auth.uid()) is not null");
    expect(normalizedSql).toContain("node.id = target_node_id");
    expect(normalizedSql).toContain("estimate.project_id = target_project_id");
    expect(normalizedSql).toContain("public.can_access_estimate(node.estimate_id)");
    expect(normalizedSql).toContain("selected.estimate_tab_id is not null");
    expect(normalizedSql).toContain("tab.archived_at is null");
    expect(normalizedSql).toContain("resolved.estimate_tab_id = node.estimate_tab_id");
  });

  it("preserves load-limit overfetch semantics for nodes and rows", () => {
    expect(normalizedSql).toContain("tab_nodes.route_ordinal <= limits.max_node_count + 1");
    expect(normalizedSql).toContain("raw_nodes.route_ordinal <= limits.max_node_count");
    expect(normalizedSql).toContain("tab_rows.route_ordinal <= limits.max_row_item_count + 1");
    expect(normalizedSql).toContain("raw_rows.route_ordinal <= limits.max_row_item_count");
    expect(normalizedSql).toContain("'didexceednodelimit'");
    expect(normalizedSql).toContain("'didexceedrowitemlimit'");
  });
});
