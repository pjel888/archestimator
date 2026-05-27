import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migration = readFileSync("supabase/migrations/20260526142913_project_sheet_collaboration_access.sql", "utf8");
const types = readFileSync("src/lib/supabase/types.ts", "utf8");

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

  it("keeps generated Supabase types aligned with the collaboration schema", () => {
    expect(types).toContain("collaboration_role: \"owner\" | \"admin\" | \"editor\" | \"viewer\"");
    expect(types).toContain("collaboration_invitations: {");
    expect(types).toContain("project_members: {");
    expect(types).toContain("estimate_sheet_access_settings: {");
    expect(types).toContain("estimate_sheet_members: {");
    expect(types).toContain("avatar_url: string | null");
  });
});
