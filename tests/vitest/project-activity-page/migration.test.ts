import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migrationPath = "supabase/migrations/20260628223000_project_activity_collaboration_audit_rpc.sql";
const repairMigrationPath = "supabase/migrations/20260628224500_project_activity_collaboration_audit_rpc_cursor_qualification.sql";
const indexMigrationPath = "supabase/migrations/20260628231500_project_activity_collaboration_audit_project_created_id_idx.sql";

describe("project activity collaboration audit migration", () => {
  it("adds a scoped authenticated-only RPC without restoring direct table access", () => {
    const sql = readFileSync(migrationPath, "utf8");

    expect(sql).toContain("create or replace function public.read_project_collaboration_audit_events");
    expect(sql).toContain("security definer");
    expect(sql).toContain("set search_path = public");
    expect(sql).toContain("public.can_edit_project(target_project_id)");
    expect(sql).toContain("raise exception 'permission denied for project collaboration activity'");
    expect(sql).toContain("from public.collaboration_audit_events cae");
    expect(sql).toContain("cae.project_id = target_project_id");
    expect(sql).toContain("target_project_only is false or cae.estimate_id is null");
    expect(sql).toContain("target_actor_user_id is null or cae.actor_user_id = target_actor_user_id");
    expect(sql).toContain("target_action_buckets text[] default null");
    expect(sql).toContain("'edited' = any(target_action_buckets)");
    expect(sql).toContain("source_total_count bigint");
    expect(sql).toContain("revoke execute on function public.read_project_collaboration_audit_events");
    expect(sql).toContain("from public");
    expect(sql).toContain("from anon");
    expect(sql).toContain("grant execute on function public.read_project_collaboration_audit_events");
    expect(sql).toContain("to authenticated");
    expect(sql).not.toMatch(/grant\s+select\s+on\s+table\s+public\.collaboration_audit_events/i);
  });

  it("qualifies cursor columns in the provider repair migration", () => {
    const sql = readFileSync(repairMigrationPath, "utf8");

    expect(sql).toContain("select b.*");
    expect(sql).toContain("b.created_at < cursor_created_at");
    expect(sql).toContain("b.created_at = cursor_created_at and b.id < cursor_id");
    expect(sql).toContain("order by b.created_at desc, b.id desc");
  });

  it("adds the collaboration audit cursor-order index only after EXPLAIN proof", () => {
    const sql = readFileSync(indexMigrationPath, "utf8");

    expect(sql).toContain("create index if not exists collaboration_audit_events_project_created_id_idx");
    expect(sql).toContain("on public.collaboration_audit_events(project_id, created_at desc, id desc)");
  });

  it("keeps the active D1 activity repository aligned with the provider-era RPC contract", () => {
    const source = readFileSync("src/lib/repositories/project-activity-feed-repository.ts", "utf8");

    expect(source).toContain("FROM collaboration_audit_events");
    expect(source).toContain("collaborationEventTypesForActions");
    expect(source).toContain('if (args.scope.kind === "project-only") where.push("estimate_id IS NULL")');
    expect(source).toContain("SELECT COUNT(*) AS count FROM collaboration_audit_events");
    expect(source).toContain("source_total_count");
    expect(source).not.toContain('rpc("read_project_collaboration_audit_events"');
  });
});
