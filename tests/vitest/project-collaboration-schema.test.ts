import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import { latestMigrationBySuffix } from "./security-findings-test-helpers";

const migration = readFileSync("supabase/migrations/20260526142913_project_sheet_collaboration_access.sql", "utf8");
const d1CollaborationMigration = readFileSync("migrations/0007_collaboration_invitations.sql", "utf8");
const d1EstimateAccessMigration = readFileSync("migrations/0008_estimate_sheet_user_preferences.sql", "utf8");
const d1ProfileMigration = readFileSync("migrations/0003_profiles.sql", "utf8");
const d1AccessSource = readFileSync("src/lib/authz/d1-access.ts", "utf8");
const collaborationTypes = readFileSync("src/lib/collaboration/types.ts", "utf8");
const membershipGuards = latestMigrationBySuffix("_teamspace_membership_atomic_guards.sql");
const rlsAuthUidPerf = latestMigrationBySuffix("_teamspace_rls_authuid_perf.sql");

describe("project and estimate sheet collaboration schema", () => {
  it("adds durable project/sheet access tables, role helpers, RLS policies, and realtime authorization", () => {
    expect(migration).toContain("create type public.collaboration_role");
    expect(migration).toContain("alter table public.profiles add column if not exists avatar_url text");
    expect(migration).toContain("create or replace function public.handle_new_auth_user");
    expect(migration).toContain("new.raw_user_meta_data->>'avatar_url'");
    expect(migration).toContain("projects_id_workspace_id_unique");
    expect(migration).toContain("estimates_id_project_id_unique");
    expect(migration).toContain("create table if not exists public.project_members");
    expect(migration).toContain("create table if not exists public.estimate_sheet_access_settings");
    expect(migration).toContain("create table if not exists public.estimate_sheet_members");
    expect(migration).toContain("create table if not exists public.collaboration_invitations");
    expect(migration).toContain("create or replace function public.can_access_project");
    expect(migration).toContain("create or replace function public.can_edit_project");
    expect(migration).toContain("create or replace function public.can_manage_project_access");
    expect(migration).toContain("create or replace function public.can_assign_project_role");
    expect(migration).toContain("create or replace function public.can_manage_estimate_access");
    expect(migration).toContain("create or replace function public.can_change_estimate_access_settings");
    expect(migration).toContain("create or replace function public.apply_pending_collaboration_invitations");
    expect(migration).toContain("create or replace function public.can_access_estimate");
    expect(migration).toContain("create or replace function public.can_edit_estimate");
    expect(migration).toContain('drop policy if exists "members can manage projects"');
    expect(migration).toContain('create policy "project viewers can read projects"');
    expect(migration).toContain('create policy "project editors can update projects"');
    expect(migration).toContain('create policy "estimate viewers can read estimate rows"');
    expect(migration).toContain('create policy "estimate editors can manage estimate rows"');
    expect(migration).toContain('create policy "project access managers can add project memberships"');
    expect(migration).toContain('create policy "project access managers can update project memberships"');
    expect(migration).not.toContain('create policy "project editors can manage project memberships"');
    expect(migration).toContain('create policy "estimate access managers can update sheet access settings"');
    expect(migration).not.toContain('create policy "estimate editors can manage sheet memberships"');
    expect(migration).toContain('create policy "project access managers can create project invitations"');
    expect(migration).toContain('"realtime"."messages"');
    expect(migration).toContain("realtime.topic()");
    expect(migration).toContain("realtime.messages.extension in ('broadcast', 'presence')");
    expect(migration).toContain("create or replace function public.can_send_realtime_topic");
    expect(migration).toContain("realtime.messages.extension = 'broadcast'");
    expect(migration).toContain("public.can_send_realtime_topic((select realtime.topic()))");
    expect(migration).toContain("^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$");
  });

  it("guards membership floors atomically with DB triggers (T1.4 / F13 / G13)", () => {
    expect(membershipGuards).toContain(
      "create or replace function public.enforce_workspace_owner_floor",
    );
    expect(membershipGuards).toContain(
      "create or replace function public.enforce_project_manager_floor",
    );
    expect(membershipGuards).toContain("security definer");
    expect(membershipGuards).toContain("set search_path = ''");
    expect(membershipGuards).toContain("before delete or update on public.workspace_members");
    expect(membershipGuards).toContain("before delete or update on public.project_members");
    expect(membershipGuards).toContain(
      "execute function public.enforce_workspace_owner_floor()",
    );
    expect(membershipGuards).toContain(
      "execute function public.enforce_project_manager_floor()",
    );
    expect(membershipGuards).toContain("Every workspace must keep at least one owner.");
    expect(membershipGuards).toContain("Every project must keep at least one owner or admin.");
    expect(membershipGuards).toContain("errcode = 'P0001'");
  });

  it("wraps auth.uid() as (select auth.uid()) in collaboration RLS helpers (T2.4 / F-P5)", () => {
    expect(rlsAuthUidPerf).toContain("(select auth.uid())");
    expect(rlsAuthUidPerf).toContain("create or replace function public.current_project_access_rank");
    expect(rlsAuthUidPerf).toContain("create or replace function public.can_access_project");
    expect(rlsAuthUidPerf).toContain("create or replace function public.can_edit_project");
    expect(rlsAuthUidPerf).toContain("create or replace function public.can_assign_project_role");
    expect(rlsAuthUidPerf).toContain("create or replace function public.can_access_estimate");
    expect(rlsAuthUidPerf).toContain("create or replace function public.can_edit_estimate");
    expect(rlsAuthUidPerf).toContain("create or replace function public.can_assign_estimate_role");
    expect(rlsAuthUidPerf).toContain('create policy "collaborators can view collaborator profiles" on public.profiles');

    // No bare auth.uid() may remain: every executable occurrence must read (select auth.uid()).
    // Comment lines that merely mention auth.uid() in prose are excluded so the counts compare
    // like-for-like SQL occurrences only.
    const sqlOnly = rlsAuthUidPerf
      .split("\n")
      .filter((line) => !line.trimStart().startsWith("--"))
      .join("\n");
    const bareCount = (sqlOnly.match(/auth\.uid\(\)/g) ?? []).length;
    const wrappedCount = (sqlOnly.match(/\(select auth\.uid\(\)\)/g) ?? []).length;
    expect(bareCount).toBe(wrappedCount);
  });

  it("keeps active D1 collaboration schema and source types aligned", () => {
    expect(d1CollaborationMigration).toContain("role TEXT NOT NULL DEFAULT 'editor' CHECK (role IN ('owner', 'admin', 'editor', 'viewer'))");
    expect(d1CollaborationMigration).toContain("CREATE TABLE IF NOT EXISTS project_members");
    expect(d1CollaborationMigration).toContain("CREATE TABLE IF NOT EXISTS estimate_sheet_members");
    expect(d1CollaborationMigration).toContain("CREATE TABLE IF NOT EXISTS collaboration_invitations");
    expect(d1EstimateAccessMigration).toContain("CREATE TABLE IF NOT EXISTS estimate_sheet_access_settings");
    expect(d1ProfileMigration).toContain("avatar_url TEXT");
    expect(collaborationTypes).toContain("export type CollaborationRole = ProjectEstimateCollaborationRole");
    expect(d1AccessSource).toContain("FROM project_members project_member");
    expect(d1AccessSource).toContain("FROM estimate_sheet_members sheet_member");
    expect(d1AccessSource).toContain("LEFT JOIN estimate_sheet_access_settings access");
  });
});
