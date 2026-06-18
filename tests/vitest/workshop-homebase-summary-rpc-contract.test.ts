import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

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
