import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const migrationPath = readdirSync(join(process.cwd(), "supabase/migrations"))
  .filter((file) => file.endsWith("_ai_audit_foundation.sql"))
  .sort()
  .at(-1);

if (!migrationPath) throw new Error("Missing AI audit foundation migration.");

const migration = readFileSync(join(process.cwd(), "supabase/migrations", migrationPath), "utf8");
const auditSource = readFileSync(join(process.cwd(), "src/lib/ai/audit.ts"), "utf8");
const supabaseTypes = readFileSync(join(process.cwd(), "src/lib/supabase/types.ts"), "utf8");

describe("AI audit foundation schema", () => {
  it("creates metadata-only audit tables for action runs, tool calls, and data access", () => {
    expect(migration).toContain("create table if not exists public.ai_action_runs");
    expect(migration).toContain("create table if not exists public.ai_tool_calls");
    expect(migration).toContain("create table if not exists public.ai_data_access_events");
    expect(migration).toContain("workspace_id uuid not null references public.workspaces(id) on delete cascade");
    expect(migration).toContain("actor_user_id uuid not null references auth.users(id) on delete cascade");
    expect(migration).toContain("request_message_hash text");
    expect(migration).toContain("route_context_hash text");
    expect(migration).toContain("provider_send_categories text[] not null default '{}'::text[]");
    expect(migration).toContain("redaction_status public.ai_redaction_status not null default 'metadata_only'");
    expect(migration).toContain("create constraint trigger ai_tool_calls_enforce_workspace_refs");
    expect(migration).toContain("create constraint trigger ai_data_access_events_enforce_workspace_refs");
    expect(migration).toContain("AI tool call project target must belong to the same workspace.");
    expect(migration).toContain("AI data access event tool call must belong to the same run, workspace, and actor.");
    expect(migration).not.toContain("raw_prompt");
    expect(migration).not.toContain("raw_message");
    expect(migration).not.toContain("security definer");
  });

  it("enables actor-scoped RLS with explicit authenticated grants and no anon grants", () => {
    expect(migration).toContain("alter table public.ai_action_runs enable row level security");
    expect(migration).toContain("alter table public.ai_tool_calls enable row level security");
    expect(migration).toContain("alter table public.ai_data_access_events enable row level security");
    expect(migration).toContain("actors can view own ai action runs");
    expect(migration).toContain("actors can insert own ai action runs");
    expect(migration).toContain("workspace admins can view ai action runs");
    expect(migration).toContain("actor_user_id = auth.uid() and public.is_workspace_member(workspace_id)");
    expect(migration).toContain("revoke all on public.ai_action_runs from public");
    expect(migration).toContain("revoke all on public.ai_action_runs from anon, authenticated");
    expect(migration).toContain("revoke all on public.ai_tool_calls from anon, authenticated");
    expect(migration).toContain("revoke all on public.ai_data_access_events from anon, authenticated");
    expect(migration).toContain("revoke execute on function public.enforce_ai_tool_call_workspace_refs() from anon, authenticated");
    expect(migration).toContain("revoke execute on function public.enforce_ai_data_access_workspace_refs() from anon, authenticated");
    expect(migration).not.toContain("to anon");
    expect(migration).not.toContain("grant select, insert on public.ai_action_runs to authenticated");
  });

  it("wires typed app contracts without storing raw route context", () => {
    expect(auditSource).toContain("buildAiAskAuditEvent");
    expect(auditSource).toContain("hashAiAuditValue(input.message)");
    expect(auditSource).toContain("hashAiAuditValue(input.routeContext)");
    expect(auditSource).toContain("[\"user_message\", \"bounded_route_context\"]");
    expect(auditSource).toContain("[\"user_message\", \"bounded_route_context\", \"server_scoped_read_context\"]");
    expect(auditSource).toContain("archestimator-ai-audit");
    expect(auditSource).toContain("SUPABASE_SERVICE_ROLE_KEY");
    expect(auditSource).toContain("Ask request used bounded browser route context and no database read tools.");
    expect(supabaseTypes).toContain("ai_action_runs");
    expect(supabaseTypes).toContain("ai_tool_calls");
    expect(supabaseTypes).toContain("ai_data_access_events");
    expect(supabaseTypes).toContain("ai_interaction_mode: \"ask\" | \"draft\" | \"apply\" | \"eval\"");
  });
});
