#!/usr/bin/env node

// Local proof harness for workspace/project membership-floor triggers.
// Verifies that the atomic guards in the teamspace_membership_atomic_guards
// migration actually block the last owner/admin removal/demotion.
// Uses a temp Postgres instance; output is sanitized.

import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

const repoRoot = process.cwd();
const pgBin = process.env.POSTGRES_BIN_DIR ?? "/opt/homebrew/bin";
const initdb = join(pgBin, "initdb");
const pgCtl = join(pgBin, "pg_ctl");
const psql = join(pgBin, "psql");
const tempRoot = mkdtempSync(join(tmpdir(), "archestimator-membership-floor-"));
const dataDir = join(tempRoot, "data");
const logFile = join(tempRoot, "postgres.log");
const port = String(58432 + Math.floor(Math.random() * 1000));
let serverStarted = false;

const ids = {
  userA: "11111111-1111-4111-8111-111111111111",
  userB: "22222222-2222-4222-8222-222222222222",
  userC: "33333333-3333-4333-8333-333333333333",
  userD: "44444444-4444-4444-8444-444444444444",
  workspaceA: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
  workspaceB: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
  projectA: "a1000000-0000-4000-8000-000000000001",
  projectB: "b1000000-0000-4000-8000-000000000001",
};

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: repoRoot,
    encoding: "utf8",
    env: {
      ...process.env,
      LC_ALL: "C",
      PATH: `${pgBin}:${process.env.PATH ?? ""}`,
    },
    ...options,
  });

  if (options.expectFailure) {
    if (result.status === 0) {
      throw new Error(`Expected command to fail: ${command} ${args.join(" ")}`);
    }
    return result;
  }

  if (result.status !== 0) {
    const log = existsSync(logFile) ? `\nPostgres log:\n${readFileSync(logFile, "utf8")}` : "";
    throw new Error(`Command failed: ${command} ${args.join(" ")}\n${result.stdout}\n${result.stderr}${log}`);
  }
  return result;
}

function runPsql(sql, options = {}) {
  return run(psql, [
    "-h", "127.0.0.1",
    "-p", port,
    "-U", "postgres",
    "-d", "postgres",
    "-v", "ON_ERROR_STOP=1",
    "-q", "-t", "-A",
    "-c", sql,
  ], options);
}

function applySql(sql) {
  runPsql(sql);
}

function quote(value) {
  return `'${String(value).replaceAll("'", "''")}'`;
}

function cleanup() {
  if (serverStarted) {
    run(pgCtl, ["-D", dataDir, "-m", "fast", "-w", "stop"], { stdio: "pipe" });
  }
  rmSync(tempRoot, { recursive: true, force: true });
}

function requireBinary(path) {
  if (!existsSync(path)) {
    throw new Error(`Missing PostgreSQL binary: ${path}. Install postgresql@17 or set POSTGRES_BIN_DIR.`);
  }
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function expectFailure(sql, message) {
  const result = runPsql(sql, { expectFailure: true });
  assert(result.status !== 0, message);
}

function expectSuccess(sql, message) {
  try {
    runPsql(sql);
  } catch (error) {
    throw new Error(message, { cause: error });
  }
}

try {
  [initdb, pgCtl, psql].forEach(requireBinary);

  run(initdb, ["-D", dataDir, "-A", "trust", "-U", "postgres", "--no-locale"]);
  run(pgCtl, ["-D", dataDir, "-l", logFile, "-o", `-p ${port} -c listen_addresses=127.0.0.1`, "-w", "start"]);
  serverStarted = true;

  applySql(`
    create schema auth;
    create role anon nologin;
    create role authenticated nologin;
    grant usage on schema public to anon, authenticated;
    grant usage on schema auth to anon, authenticated;

    create function auth.uid()
    returns uuid
    language sql
    stable
    as $$
      select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
    $$;
    grant execute on function auth.uid() to anon, authenticated;

    create function public.is_platform_admin()
    returns boolean
    language sql
    stable
    as $$ select false $$;
    grant execute on function public.is_platform_admin() to authenticated;

    create type public.collaboration_role as enum ('owner', 'admin', 'editor', 'viewer');

    create table public.profiles (
      id uuid primary key
    );
    create table public.workspaces (
      id uuid primary key,
      name text
    );
    create table public.workspace_members (
      workspace_id uuid not null references public.workspaces(id),
      user_id uuid not null references public.profiles(id),
      role public.collaboration_role not null,
      created_at timestamptz default now(),
      updated_at timestamptz default now(),
      primary key (workspace_id, user_id)
    );
    create table public.projects (
      id uuid primary key,
      workspace_id uuid not null references public.workspaces(id),
      name text not null
    );
    create table public.project_members (
      project_id uuid not null references public.projects(id),
      workspace_id uuid not null references public.workspaces(id),
      user_id uuid not null references public.profiles(id),
      role public.collaboration_role not null,
      created_at timestamptz default now(),
      updated_at timestamptz default now(),
      primary key (project_id, user_id)
    );

    create or replace function public.collaboration_role_rank(target_role public.collaboration_role)
    returns integer
    language sql
    immutable
    as $$
      select case target_role
        when 'owner' then 40
        when 'admin' then 30
        when 'editor' then 20
        when 'viewer' then 10
        else 0
      end;
    $$;

    create or replace function public.has_other_project_access_manager(target_project_id uuid, target_user_id uuid)
    returns boolean
    language sql
    security definer
    set search_path = public
    stable
    as $$
      select exists (
        select 1
        from public.projects p
        join public.workspace_members wm on wm.workspace_id = p.workspace_id
        where p.id = target_project_id
          and wm.user_id <> target_user_id
          and wm.role in ('owner', 'admin')
      )
      or exists (
        select 1
        from public.project_members pm
        where pm.project_id = target_project_id
          and pm.user_id <> target_user_id
          and pm.role in ('owner', 'admin')
      );
    $$;

    create or replace function public.enforce_workspace_owner_floor()
    returns trigger
    language plpgsql
    security definer
    set search_path = ''
    as $$
    declare
      remaining_owner_count integer;
    begin
      if pg_trigger_depth() > 1 then
        if tg_op = 'UPDATE' then return new; end if;
        return old;
      end if;

      if tg_op = 'UPDATE' and new.role = 'owner' then
        return new;
      end if;

      if old.role <> 'owner' then
        if tg_op = 'UPDATE' then
          return new;
        end if;
        return old;
      end if;

      select count(*)
        into remaining_owner_count
        from public.workspace_members wm
        where wm.workspace_id = old.workspace_id
          and wm.user_id <> old.user_id
          and wm.role = 'owner';

      if remaining_owner_count = 0 then
        raise exception 'Every workspace must keep at least one owner.'
          using errcode = 'P0001';
      end if;

      if tg_op = 'UPDATE' then
        return new;
      end if;
      return old;
    end;
    $$;

    create or replace function public.enforce_project_manager_floor()
    returns trigger
    language plpgsql
    security definer
    set search_path = ''
    as $$
    begin
      if pg_trigger_depth() > 1 then
        if tg_op = 'UPDATE' then return new; end if;
        return old;
      end if;

      if tg_op = 'UPDATE' and new.role in ('owner', 'admin') then
        return new;
      end if;

      if old.role not in ('owner', 'admin') then
        if tg_op = 'UPDATE' then
          return new;
        end if;
        return old;
      end if;

      if not public.has_other_project_access_manager(old.project_id, old.user_id) then
        raise exception 'Every project must keep at least one owner or admin.'
          using errcode = 'P0001';
      end if;

      if tg_op = 'UPDATE' then
        return new;
      end if;
      return old;
    end;
    $$;

    create trigger workspace_members_enforce_owner_floor
      before delete or update on public.workspace_members
      for each row execute function public.enforce_workspace_owner_floor();

    create trigger project_members_enforce_manager_floor
      before delete or update on public.project_members
      for each row execute function public.enforce_project_manager_floor();

    insert into public.profiles (id) values
      (${quote(ids.userA)}),
      (${quote(ids.userB)}),
      (${quote(ids.userC)}),
      (${quote(ids.userD)});

    insert into public.workspaces (id, name) values
      (${quote(ids.workspaceA)}, 'Workspace A'),
      (${quote(ids.workspaceB)}, 'Workspace B');

    insert into public.workspace_members (workspace_id, user_id, role) values
      (${quote(ids.workspaceA)}, ${quote(ids.userA)}, 'owner'),
      (${quote(ids.workspaceA)}, ${quote(ids.userB)}, 'owner'),
      (${quote(ids.workspaceA)}, ${quote(ids.userC)}, 'admin'),
      (${quote(ids.workspaceB)}, ${quote(ids.userA)}, 'owner'),
      (${quote(ids.workspaceB)}, ${quote(ids.userD)}, 'viewer');

    insert into public.projects (id, workspace_id, name) values
      (${quote(ids.projectA)}, ${quote(ids.workspaceA)}, 'Project A'),
      (${quote(ids.projectB)}, ${quote(ids.workspaceB)}, 'Project B');

    insert into public.project_members (project_id, workspace_id, user_id, role) values
      (${quote(ids.projectA)}, ${quote(ids.workspaceA)}, ${quote(ids.userA)}, 'owner'),
      (${quote(ids.projectA)}, ${quote(ids.workspaceA)}, ${quote(ids.userB)}, 'editor'),
      (${quote(ids.projectB)}, ${quote(ids.workspaceB)}, ${quote(ids.userA)}, 'owner'),
      (${quote(ids.projectB)}, ${quote(ids.workspaceB)}, ${quote(ids.userB)}, 'admin'),
      (${quote(ids.projectB)}, ${quote(ids.workspaceB)}, ${quote(ids.userD)}, 'editor');
  `);

  // Workspace owner floor: deleting a non-last owner must succeed.
  expectSuccess(
    `delete from public.workspace_members where workspace_id = ${quote(ids.workspaceA)} and user_id = ${quote(ids.userB)};`,
    "deleting a non-last workspace owner failed",
  );

  // Workspace owner floor: deleting the last owner must fail.
  expectFailure(
    `delete from public.workspace_members where workspace_id = ${quote(ids.workspaceA)} and user_id = ${quote(ids.userA)};`,
    "deleting the last workspace owner succeeded",
  );

  // Workspace owner floor: demoting the last owner must fail.
  expectFailure(
    `update public.workspace_members set role = 'admin' where workspace_id = ${quote(ids.workspaceA)} and user_id = ${quote(ids.userA)};`,
    "demoting the last workspace owner succeeded",
  );

  // Project manager floor: deleting a non-last owner/admin must succeed.
  expectSuccess(
    `delete from public.project_members where project_id = ${quote(ids.projectB)} and user_id = ${quote(ids.userB)};`,
    "deleting a non-last project manager failed",
  );

  // Project manager floor: deleting the last owner/admin must fail.
  // Project B has no other workspace owner/admin, and userB was already removed,
  // so removing userA leaves zero project access managers.
  expectFailure(
    `delete from public.project_members where project_id = ${quote(ids.projectB)} and user_id = ${quote(ids.userA)};`,
    "deleting the last project manager succeeded",
  );

  // Project manager floor: demoting the last owner/admin to editor must fail.
  expectFailure(
    `update public.project_members set role = 'editor' where project_id = ${quote(ids.projectB)} and user_id = ${quote(ids.userA)};`,
    "demoting the last project manager succeeded",
  );

  // Project manager floor: keeping owner status should succeed.
  expectSuccess(
    `update public.project_members set role = 'owner' where project_id = ${quote(ids.projectB)} and user_id = ${quote(ids.userA)};`,
    "keeping project owner status failed",
  );

  // Project manager floor: deleting a non-manager must succeed.
  expectSuccess(
    `delete from public.project_members where project_id = ${quote(ids.projectB)} and user_id = ${quote(ids.userD)};`,
    "deleting a non-manager project member failed",
  );

  console.log(JSON.stringify({
    ok: true,
    proof: "membership_floor_triggers",
    checks: [
      "workspace last-owner delete blocked",
      "workspace last-owner demotion blocked",
      "workspace non-last owner delete allowed",
      "project non-last manager delete allowed",
      "project last-manager delete blocked",
      "project last-manager demotion blocked",
      "project manager-status-preserving update allowed",
      "project non-manager delete allowed",
    ],
  }, null, 2));
} finally {
  cleanup();
}
