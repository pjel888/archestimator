#!/usr/bin/env node

// Local Postgres proof for the project dashboard activity/location migration.
// Boots a temp cluster, applies the migration against the minimum schema
// contracts it depends on, then proves backfill, triggers, constraints, and
// editor-only exact-coordinate RLS behavior.

import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

const repoRoot = process.cwd();
const pgBin = process.env.POSTGRES_BIN_DIR ?? "/opt/homebrew/bin";
const initdb = join(pgBin, "initdb");
const pgCtl = join(pgBin, "pg_ctl");
const psql = join(pgBin, "psql");
const tempRoot = mkdtempSync(join(tmpdir(), "archestimator-dashboard-location-"));
const dataDir = join(tempRoot, "data");
const logFile = join(tempRoot, "postgres.log");
const port = String(59432 + Math.floor(Math.random() * 1000));
const migrationPath = join(repoRoot, "supabase/migrations/20260619105250_project_dashboard_activity_location.sql");
let serverStarted = false;

const ids = {
  workspaceA: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
  workspaceB: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
  projectA: "10000000-0000-4000-8000-000000000001",
  projectB: "20000000-0000-4000-8000-000000000001",
  estimateA: "30000000-0000-4000-8000-000000000001",
  estimateRestricted: "30000000-0000-4000-8000-000000000002",
  eventA: "40000000-0000-4000-8000-000000000001",
  eventRestricted: "40000000-0000-4000-8000-000000000002",
  editor: "50000000-0000-4000-8000-000000000001",
  viewer: "60000000-0000-4000-8000-000000000001",
  outsider: "70000000-0000-4000-8000-000000000001",
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

function applyFile(path) {
  run(psql, [
    "-h", "127.0.0.1",
    "-p", port,
    "-U", "postgres",
    "-d", "postgres",
    "-v", "ON_ERROR_STOP=1",
    "-q",
    "-f", path,
  ]);
}

function scalar(sql) {
  return runPsql(sql).stdout.trim();
}

function requireBinary(path) {
  if (!existsSync(path)) {
    throw new Error(`Missing PostgreSQL binary: ${path}. Install PostgreSQL or set POSTGRES_BIN_DIR.`);
  }
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function expectFailure(sql, message) {
  const result = runPsql(sql, { expectFailure: true });
  assert(result.status !== 0, message);
}

function asUser(userId, sql) {
  return `
    reset role;
    set role authenticated;
    set local request.jwt.claim.sub = '${userId}';
    ${sql}
    reset role;
  `;
}

function cleanup() {
  if (serverStarted) {
    run(pgCtl, ["-D", dataDir, "-m", "fast", "-w", "stop"], { stdio: "pipe" });
  }
  rmSync(tempRoot, { recursive: true, force: true });
}

try {
  [initdb, pgCtl, psql].forEach(requireBinary);
  assert(existsSync(migrationPath), `Missing migration: ${migrationPath}`);

  run(initdb, ["-D", dataDir, "-A", "trust", "-U", "postgres", "--no-locale"]);
  run(pgCtl, ["-D", dataDir, "-l", logFile, "-o", `-p ${port} -c listen_addresses=127.0.0.1`, "-w", "start"]);
  serverStarted = true;

  runPsql(`
    create extension if not exists pgcrypto;
    create schema auth;
    create role anon nologin;
    create role authenticated nologin;
    grant usage on schema public, auth to anon, authenticated;

    create table auth.users (
      id uuid primary key
    );

    create function auth.uid()
    returns uuid
    language sql
    stable
    as $$
      select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
    $$;
    grant execute on function auth.uid() to anon, authenticated;

    create table public.projects (
      id uuid primary key,
      workspace_id uuid not null,
      name text not null,
      constraint projects_id_workspace_id_unique unique (id, workspace_id)
    );

    create table public.estimates (
      id uuid primary key,
      project_id uuid not null references public.projects(id) on delete cascade,
      name text,
      sheet_code text,
      inherits_project_access boolean not null default true,
      constraint estimates_id_project_id_unique unique (id, project_id)
    );

    create table public.project_members (
      project_id uuid not null,
      workspace_id uuid not null,
      user_id uuid not null references auth.users(id) on delete cascade,
      role text not null check (role in ('owner', 'admin', 'editor', 'viewer')),
      primary key (project_id, user_id),
      foreign key (project_id, workspace_id) references public.projects(id, workspace_id) on delete cascade
    );

    create table public.estimate_sheet_members (
      estimate_id uuid not null,
      project_id uuid not null,
      user_id uuid not null references auth.users(id) on delete cascade,
      role text not null check (role in ('editor', 'viewer')),
      primary key (estimate_id, user_id),
      foreign key (estimate_id, project_id) references public.estimates(id, project_id) on delete cascade
    );

    create function public.project_role_rank(target_role text)
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
      end
    $$;
    grant execute on function public.project_role_rank(text) to authenticated;

    create function public.current_project_access_rank(target_project_id uuid)
    returns integer
    language sql
    stable
    security definer
    set search_path = public, auth
    as $$
      select coalesce(max(public.project_role_rank(role)), 0)
      from public.project_members
      where project_id = target_project_id
        and user_id = auth.uid()
    $$;
    grant execute on function public.current_project_access_rank(uuid) to authenticated;

    create function public.can_edit_project(target_project_id uuid)
    returns boolean
    language sql
    stable
    security definer
    set search_path = public, auth
    as $$
      select public.current_project_access_rank(target_project_id) >= 20
    $$;
    grant execute on function public.can_edit_project(uuid) to authenticated;

    create function public.can_access_estimate(target_estimate_id uuid)
    returns boolean
    language sql
    stable
    security definer
    set search_path = public, auth
    as $$
      select exists (
        select 1
        from public.estimates estimate
        where estimate.id = target_estimate_id
          and estimate.inherits_project_access
          and public.current_project_access_rank(estimate.project_id) > 0
      )
      or exists (
        select 1
        from public.estimate_sheet_members member
        where member.estimate_id = target_estimate_id
          and member.user_id = auth.uid()
      )
    $$;
    grant execute on function public.can_access_estimate(uuid) to authenticated;

    create function public.set_updated_at()
    returns trigger
    language plpgsql
    as $$
    begin
      new.updated_at := now();
      return new;
    end;
    $$;

    create table public.estimate_sheet_events (
      id uuid primary key default gen_random_uuid(),
      workspace_id uuid not null,
      estimate_id uuid not null references public.estimates(id) on delete cascade,
      estimate_tab_id uuid,
      target_row_id uuid,
      estimate_node_id uuid,
      event_type text not null,
      event_source text not null default 'user',
      actor_user_id uuid references auth.users(id) on delete set null,
      row_context jsonb not null default '{}'::jsonb,
      old_snapshot jsonb,
      new_snapshot jsonb,
      changed_fields text[],
      total_delta numeric,
      payload jsonb not null default '{}'::jsonb,
      correlation_id uuid,
      created_at timestamptz not null default now()
    );
    alter table public.estimate_sheet_events enable row level security;

    insert into auth.users(id) values
      ('${ids.editor}'),
      ('${ids.viewer}'),
      ('${ids.outsider}');
    insert into public.projects(id, workspace_id, name) values
      ('${ids.projectA}', '${ids.workspaceA}', 'Project A'),
      ('${ids.projectB}', '${ids.workspaceB}', 'Project B');
    insert into public.estimates(id, project_id, name, sheet_code, inherits_project_access) values
      ('${ids.estimateA}', '${ids.projectA}', 'Estimate A', 'EST-A', true),
      ('${ids.estimateRestricted}', '${ids.projectA}', 'Restricted Estimate', 'EST-R', false);
    insert into public.project_members(project_id, workspace_id, user_id, role) values
      ('${ids.projectA}', '${ids.workspaceA}', '${ids.editor}', 'editor'),
      ('${ids.projectA}', '${ids.workspaceA}', '${ids.viewer}', 'viewer');
    insert into public.estimate_sheet_events(
      id,
      workspace_id,
      estimate_id,
      event_type,
      event_source,
      actor_user_id,
      payload
    ) values
      (
        '${ids.eventA}',
        '${ids.workspaceA}',
        '${ids.estimateA}',
        'row_updated',
        'user',
        '${ids.editor}',
        '{"secret":"raw payload stays server-side"}'::jsonb
      ),
      (
        '${ids.eventRestricted}',
        '${ids.workspaceA}',
        '${ids.estimateRestricted}',
        'row_updated',
        'user',
        '${ids.outsider}',
        '{"secret":"restricted payload stays server-side"}'::jsonb
      );
  `);

  applyFile(migrationPath);

  assert(
    scalar(`select project_id from public.estimate_sheet_events where id = '${ids.eventA}'`) === ids.projectA,
    "estimate_sheet_events.project_id was not backfilled",
  );
  assert(
    scalar(`select is_nullable from information_schema.columns where table_schema = 'public' and table_name = 'estimate_sheet_events' and column_name = 'project_id'`) === "NO",
    "estimate_sheet_events.project_id is still nullable",
  );
  assert(
    scalar(`select to_regclass('public.estimate_sheet_events_project_created_idx') is not null`) === "t",
    "project activity cursor index is missing",
  );
  assert(
    scalar(asUser(ids.editor, `select count(*) from public.estimate_sheet_events where id = '${ids.eventRestricted}';`)) === "0",
    "restricted estimate events should be omitted by activity RLS",
  );

  const insertedEventScope = scalar(`
    insert into public.estimate_sheet_events(estimate_id, event_type, event_source)
    values ('${ids.estimateA}', 'row_inserted', 'user')
    returning project_id || ':' || workspace_id
  `);
  assert(insertedEventScope === `${ids.projectA}:${ids.workspaceA}`, "event scope trigger did not fill project/workspace ids");

  expectFailure(`
    insert into public.estimate_sheet_events(estimate_id, project_id, workspace_id, event_type, event_source)
    values ('${ids.estimateA}', '${ids.projectB}', '${ids.workspaceB}', 'row_inserted', 'user')
  `, "mismatched estimate/project event insert should fail");

  expectFailure(asUser(ids.editor, `
    insert into public.project_locations(project_id, latitude, longitude)
    values ('${ids.projectA}', 91, 120);
  `), "invalid latitude should fail");

  runPsql(asUser(ids.editor, `
    insert into public.project_locations(project_id, latitude, longitude, accuracy_meters, source, display_label)
    values ('${ids.projectA}', 14.599512, 120.984222, 8.25, 'manual', 'Site gate');
  `));

  assert(
    scalar(asUser(ids.editor, `select count(*) from public.project_locations where project_id = '${ids.projectA}';`)) === "1",
    "editor should be able to read exact project location",
  );
  assert(
    scalar(asUser(ids.viewer, `select count(*) from public.project_locations where project_id = '${ids.projectA}';`)) === "0",
    "viewer should not be able to read exact project location",
  );
  assert(
    scalar(asUser(ids.outsider, `select count(*) from public.project_locations;`)) === "0",
    "outsider should not be able to read exact project location",
  );
  expectFailure(`
    reset role;
    set role anon;
    select count(*) from public.project_locations;
  `, "anon should not have project location select access");

  assert(
    scalar(`select created_by = '${ids.editor}' and updated_by = '${ids.editor}' from public.project_locations where project_id = '${ids.projectA}'`) === "t",
    "project location trigger did not set actor columns",
  );

  console.log(JSON.stringify({
    proof: "project_dashboard_activity_location_postgres",
    migration: "20260619105250_project_dashboard_activity_location",
    postgres: run(psql, ["--version"]).stdout.trim(),
    assertions: [
      "migration applies",
      "estimate_sheet_events.project_id backfilled and not null",
      "event scope trigger fills project/workspace ids",
      "mismatched event scope rejected",
      "project activity cursor index exists",
      "restricted estimate events omitted by RLS",
      "invalid coordinates rejected",
      "editor can insert/read exact location",
      "viewer/outsider/anon cannot read exact location",
      "location actor columns populated",
    ],
  }, null, 2));
} finally {
  cleanup();
}
