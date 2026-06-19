import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { parseWorkshopHomebaseSummaryPayload } from "@/lib/repositories/workspace-repository";

const root = process.cwd();
const migrationPath = "supabase/migrations/20260618184856_workspace_homebase_summary.sql";
const migration = readFileSync(join(root, migrationPath), "utf8");
const repository = readFileSync(join(root, "src/lib/repositories/workspace-repository.ts"), "utf8");
const types = readFileSync(join(root, "src/lib/supabase/types.ts"), "utf8");
const packageJson = readFileSync(join(root, "package.json"), "utf8");

describe("workspace_homebase_summary Phase 3 RPC contract", () => {
  it("defines an invoker JSONB RPC with explicit grants and no broad dashboard scope", () => {
    expect(existsSync(join(root, migrationPath))).toBe(true);
    expect(migration).toMatch(/create or replace function public\.workspace_homebase_summary\(\s*target_workspace_id uuid,\s*recent_limit int default 12\s*\)/i);
    expect(migration).toMatch(/returns jsonb/i);
    expect(migration).toMatch(/language sql/i);
    expect(migration).toMatch(/stable/i);
    expect(migration).toMatch(/security invoker/i);
    expect(migration).toMatch(/set search_path = public/i);
    expect(migration).toContain("least(greatest(coalesce(recent_limit, 12), 1), 50)");
    expect(migration).toContain("pf.user_id = (select auth.uid())");
    expect(migration).toContain("ef.user_id = (select auth.uid())");
    expect(migration).toMatch(/order by[\s\S]*updated_at desc[\s\S]*id desc/i);
    expect(migration).toContain("revoke execute on function public.workspace_homebase_summary(uuid, int) from public, anon");
    expect(migration).toContain("grant execute on function public.workspace_homebase_summary(uuid, int) to authenticated");
    expect(migration).not.toMatch(/select\s+\*/i);
    expect(migration).not.toMatch(/project_publications|collaboration_invitations|pendingInvite/i);
  });

  it("splices additive Supabase types for the RPC", () => {
    expect(types).toContain("workspace_homebase_summary");
    expect(types).toContain("Args: { recent_limit?: number; target_workspace_id: string }");
    expect(types).toContain("Returns: Json");
  });

  it("routes through a server-only flag and falls back to the app-only path", () => {
    expect(repository).toContain("WORKSHOP_HOMEBASE_SUMMARY_RPC_ENABLED");
    expect(repository).not.toContain("NEXT_PUBLIC_WORKSHOP_HOMEBASE_SUMMARY_RPC_ENABLED");
    expect(repository).toContain('supabase.rpc("workspace_homebase_summary"');
    expect(repository).toContain("getWorkshopHomebaseDataAppPath");
    expect(repository).toContain("using app path");
  });

  it("adds the local proof harness script entrypoint", () => {
    expect(existsSync(join(root, "scripts/prove-workshop-homebase-summary-postgres.mjs"))).toBe(true);
    expect(packageJson).toContain('"prove:workspace-homebase-summary"');
  });
});

describe("workspace_homebase_summary RPC fallback precision", () => {
  it("defines a rollout-only fallback guard", () => {
    expect(repository).toMatch(/export function isWorkspaceHomebaseSummaryRolloutError\(error: unknown\): boolean/);
    expect(repository).toContain('code === "PGRST202"');
    expect(repository).toContain('code === "42883"');
    expect(repository).toContain('message.includes("schema cache")');
    expect(repository).toContain('message.includes("could not find the function")');
  });

  it("binds RPC errors and rethrows non-rollout failures", () => {
    const rpcPathStart = repository.indexOf("async function getWorkshopHomebaseDataRpcPath");
    const rpcPathEnd = repository.indexOf("async function getWorkshopHomebaseDataAppPath", rpcPathStart);
    expect(rpcPathStart).toBeGreaterThan(-1);
    expect(rpcPathEnd).toBeGreaterThan(rpcPathStart);
    const rpcPathSource = repository.slice(rpcPathStart, rpcPathEnd);
    expect(rpcPathSource).not.toContain("catch (error)");
    expect(rpcPathSource).toContain("if (summaryResult.error)");
    expect(rpcPathSource).toContain("isWorkspaceHomebaseSummaryRolloutError(summaryResult.error)");
    expect(rpcPathSource).toContain("throw summaryResult.error;");
    expect(rpcPathSource).toContain("if (projectMembersResult.error");
    expect(rpcPathSource).toContain("throw projectMembersResult.error");
    expect(rpcPathSource).toContain("throw sheetMembersResult.error");
    expect(rpcPathSource).toContain("throw workspaceMembershipResult.error");
  });

  it("logs a sanitized fallback warning without raw payloads or secrets", () => {
    const rpcPathStart = repository.indexOf("async function getWorkshopHomebaseDataRpcPath");
    const rpcPathEnd = repository.indexOf("async function getWorkshopHomebaseDataAppPath", rpcPathStart);
    const rpcPathSource = repository.slice(rpcPathStart, rpcPathEnd);
    expect(rpcPathSource).toContain("[workspace_homebase_summary] RPC unavailable (code=");
    expect(rpcPathSource).toContain(", message=");
    expect(rpcPathSource).toContain(", details=");
    expect(rpcPathSource).toContain("); using app path");
    expect(rpcPathSource).not.toContain("${error}");
    expect(rpcPathSource).not.toContain("String(error)");
  });

  it("rejects invalid array elements instead of casting them silently", () => {
    const readRpcArrayStart = repository.indexOf("function readRpcArray");
    const readRpcArrayEnd = repository.indexOf("function parseWorkshopHomebaseSummaryPayload", readRpcArrayStart);
    expect(readRpcArrayStart).toBeGreaterThan(-1);
    expect(readRpcArrayEnd).toBeGreaterThan(readRpcArrayStart);
    const readRpcArraySource = repository.slice(readRpcArrayStart, readRpcArrayEnd);
    expect(readRpcArraySource).toContain("workspace_homebase_summary invalid array element");
  });
});


describe("workspace_homebase_summary payload element guards", () => {
  function makeValidPayload() {
    return {
      projectFavorites: [{ project_id: "proj-fav-1", created_at: "2026-06-19T00:00:00Z" }],
      estimateFavorites: [{ estimate_id: "est-fav-1", project_id: "proj-fav-1", created_at: "2026-06-19T00:00:00Z" }],
      recentProjects: [{
        id: "proj-1",
        name: "Project One",
        client_name: "Client",
        project_code: "P001",
        location: "Here",
        updated_at: "2026-06-19T00:00:00Z",
        workspace_id: "ws-1",
        created_by: "user-1",
      }],
      favoriteProjects: [{
        id: "proj-2",
        name: "Project Two",
        client_name: null,
        project_code: null,
        location: null,
        updated_at: "2026-06-19T00:00:00Z",
        workspace_id: "ws-1",
        created_by: null,
      }],
      estimateProjects: [{
        id: "proj-3",
        name: "Project Three",
        client_name: null,
        project_code: null,
        location: null,
        updated_at: "2026-06-19T00:00:00Z",
        workspace_id: "ws-1",
        created_by: null,
      }],
      recentEstimates: [{
        id: "est-1",
        project_id: "proj-1",
        name: "Estimate One",
        sheet_code: "E001",
        updated_at: "2026-06-19T00:00:00Z",
      }],
      favoriteEstimates: [{
        id: "est-2",
        project_id: "proj-2",
        name: "Estimate Two",
        sheet_code: "E002",
        updated_at: "2026-06-19T00:00:00Z",
      }],
      estimateNodes: [{
        id: "node-1",
        estimate_id: "est-1",
        kind: "area",
        parent_id: null,
        sort_order: 0,
      }],
    };
  }

  it("accepts a well-formed payload", () => {
    const payload = makeValidPayload();
    const result = parseWorkshopHomebaseSummaryPayload(payload);
    expect(result.recentProjects[0].id).toBe("proj-1");
    expect(result.estimateNodes[0].kind).toBe("area");
  });

  it("accepts extra fields on elements", () => {
    const payload = makeValidPayload();
    (payload.favoriteProjects[0] as Record<string, unknown>).favorite_created_at = "2026-06-19T00:00:00Z";
    const result = parseWorkshopHomebaseSummaryPayload(payload);
    expect(result.favoriteProjects[0].id).toBe("proj-2");
  });

  it("rejects a non-object payload", () => {
    expect(() => parseWorkshopHomebaseSummaryPayload(null)).toThrow("workspace_homebase_summary invalid payload");
    expect(() => parseWorkshopHomebaseSummaryPayload([1, 2, 3])).toThrow("workspace_homebase_summary invalid payload");
  });

  it("rejects a missing top-level array", () => {
    const payload = makeValidPayload();
    delete (payload as Record<string, unknown>).recentProjects;
    expect(() => parseWorkshopHomebaseSummaryPayload(payload)).toThrow("recentProjects is not an array");
  });

  it("rejects non-object array elements", () => {
    const payload = makeValidPayload();
    payload.recentProjects = ["not-an-object"];
    expect(() => parseWorkshopHomebaseSummaryPayload(payload)).toThrow(/workspace_homebase_summary invalid array element.*recentProjects\[0\]/);
  });

  it("rejects a project record with a missing id", () => {
    const payload = makeValidPayload();
    payload.recentProjects = [{ ...payload.recentProjects[0], id: undefined }];
    expect(() => parseWorkshopHomebaseSummaryPayload(payload)).toThrow("recentProjects[0].id must be a string");
  });

  it("rejects an estimate record with a non-string project_id", () => {
    const payload = makeValidPayload();
    payload.recentEstimates = [{ ...payload.recentEstimates[0], project_id: 123 }];
    expect(() => parseWorkshopHomebaseSummaryPayload(payload)).toThrow("recentEstimates[0].project_id must be a string");
  });

  it("rejects an estimate node with a non-number sort_order", () => {
    const payload = makeValidPayload();
    payload.estimateNodes = [{ ...payload.estimateNodes[0], sort_order: "0" }];
    expect(() => parseWorkshopHomebaseSummaryPayload(payload)).toThrow("estimateNodes[0].sort_order must be a number");
  });

  it("rejects an estimate node with an unknown kind", () => {
    const payload = makeValidPayload();
    payload.estimateNodes = [{ ...payload.estimateNodes[0], kind: "unknown" }];
    expect(() => parseWorkshopHomebaseSummaryPayload(payload)).toThrow("estimateNodes[0].kind must be a known estimate node kind");
  });

  it("rejects a favorite ref with a missing created_at", () => {
    const payload = makeValidPayload();
    payload.projectFavorites = [{ project_id: "proj-fav-1" }];
    expect(() => parseWorkshopHomebaseSummaryPayload(payload)).toThrow("projectFavorites[0].created_at must be a string");
  });

  it("rejects a nullable text field that is neither string nor null", () => {
    const payload = makeValidPayload();
    payload.favoriteProjects = [{ ...payload.favoriteProjects[0], client_name: 123 }];
    expect(() => parseWorkshopHomebaseSummaryPayload(payload)).toThrow("favoriteProjects[0].client_name must be a string or null");
  });
});
