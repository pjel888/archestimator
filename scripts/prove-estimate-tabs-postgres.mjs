#!/usr/bin/env node

import { existsSync, mkdtempSync, readFileSync, readdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

const repoRoot = process.cwd();
const pgBin = process.env.POSTGRES_BIN_DIR ?? "/opt/homebrew/opt/postgresql@16/bin";
const initdb = join(pgBin, "initdb");
const pgCtl = join(pgBin, "pg_ctl");
const psql = join(pgBin, "psql");
const tempRoot = mkdtempSync(join(tmpdir(), "archestimator-estimate-tabs-rls-"));
const dataDir = join(tempRoot, "data");
const logFile = join(tempRoot, "postgres.log");
const port = String(56432 + Math.floor(Math.random() * 1000));
const targetMigration = "20260612094734_estimate_tabs_foundation.sql";
let serverStarted = false;

const ids = {
  userOwner: "11111111-1111-4111-8111-111111111111",
  userViewer: "22222222-2222-4222-8222-222222222222",
  workspace: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
  project: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
  inheritedEstimate: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
  restrictedEstimate: "dddddddd-dddd-4ddd-8ddd-dddddddddddd",
  rootNode: "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee",
  areaNode: "ffffffff-ffff-4fff-8fff-ffffffffffff",
  rowItem: "99999999-9999-4999-8999-999999999999",
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
      throw new Error(`Expected command to fail: ${command} ${args.join(" ")}\n${result.stdout}\n${result.stderr}`);
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
    "-h",
    "127.0.0.1",
    "-p",
    port,
    "-U",
    "postgres",
    "-d",
    "postgres",
    "-v",
    "ON_ERROR_STOP=1",
    "-q",
    "-t",
    "-A",
    "-c",
    sql,
  ], options);
}

function applySqlFile(path) {
  const content = readFileSync(path, "utf8");
  const args = [
    "-h",
    "127.0.0.1",
    "-p",
    port,
    "-U",
    "postgres",
    "-d",
    "postgres",
    "-v",
    "ON_ERROR_STOP=1",
    "-q",
    "-f",
    path,
  ];
  if (!/(^|\n)\s*begin;/i.test(content)) args.splice(args.length - 2, 0, "-1");
  return run(psql, args);
}

function quote(value) {
  return `'${String(value).replaceAll("'", "''")}'`;
}

function assertScalar(sql, expected, label) {
  const result = runPsql(sql);
  const actual = result.stdout.trim();
  if (actual !== String(expected)) {
    throw new Error(`${label}: expected ${expected}, received ${actual || "<empty>"}`);
  }
}

function assertFailure(sql, label) {
  const result = runPsql(sql, { expectFailure: true });
  if (!result.stderr && !result.stdout) {
    throw new Error(`${label}: failure produced no diagnostic output.`);
  }
}

function cleanup() {
  if (serverStarted) {
    run(pgCtl, ["-D", dataDir, "-m", "fast", "-w", "stop"], { stdio: "pipe" });
  }
  rmSync(tempRoot, { recursive: true, force: true });
}

function requireBinary(path) {
  if (!existsSync(path)) {
    throw new Error(`Missing PostgreSQL binary: ${path}. Install postgresql@16 or set POSTGRES_BIN_DIR.`);
  }
}

function asUserSql(userId, sql) {
  return `
    begin;
    set local role authenticated;
    set local "request.jwt.claim.sub" = ${quote(userId)};
    set local "request.jwt.claim.role" = 'authenticated';
    ${sql}
    commit;
  `;
}

try {
  [initdb, pgCtl, psql].forEach(requireBinary);

  run(initdb, ["-D", dataDir, "-A", "trust", "-U", "postgres", "--no-locale"]);
  run(pgCtl, ["-D", dataDir, "-l", logFile, "-o", `-p ${port} -c listen_addresses=127.0.0.1`, "-w", "start"]);
  serverStarted = true;

  runPsql(`
    create extension if not exists pgcrypto;
    create schema if not exists auth;
    create schema if not exists storage;
    create schema if not exists realtime;
    create role anon nologin;
    create role authenticated nologin;
    create role service_role nologin bypassrls;

    create table auth.users (
      id uuid primary key,
      email text,
      raw_app_meta_data jsonb not null default '{}'::jsonb,
      raw_user_meta_data jsonb not null default '{}'::jsonb,
      created_at timestamptz not null default now()
    );

    create table storage.buckets (
      id text primary key,
      name text not null,
      public boolean not null default false,
      file_size_limit bigint,
      allowed_mime_types text[],
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    );

    create table storage.objects (
      id uuid primary key default gen_random_uuid(),
      bucket_id text not null references storage.buckets(id) on delete cascade,
      name text not null,
      owner uuid,
      metadata jsonb,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    );

    alter table storage.objects enable row level security;

    create table realtime.messages (
      id uuid primary key default gen_random_uuid(),
      topic text not null default '',
      extension text not null default 'broadcast',
      payload jsonb not null default '{}'::jsonb,
      inserted_at timestamptz not null default now()
    );

    create or replace function realtime.topic()
    returns text
    language sql
    stable
    as $$
      select coalesce(nullif(current_setting('request.realtime.topic', true), ''), '');
    $$;

    create or replace function auth.uid()
    returns uuid
    language sql
    stable
    as $$
      select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid;
    $$;

    create or replace function auth.role()
    returns text
    language sql
    stable
    as $$
      select coalesce(nullif(current_setting('request.jwt.claim.role', true), ''), current_user);
    $$;

    create or replace function auth.jwt()
    returns jsonb
    language sql
    stable
    as $$
      select jsonb_build_object(
        'sub', nullif(current_setting('request.jwt.claim.sub', true), ''),
        'email', nullif(current_setting('request.jwt.claim.email', true), ''),
        'role', coalesce(nullif(current_setting('request.jwt.claim.role', true), ''), current_user)
      );
    $$;

    create or replace function storage.foldername(path text)
    returns text[]
    language sql
    immutable
    as $$
      select string_to_array(path, '/');
    $$;
  `);

  const migrationDir = join(repoRoot, "supabase/migrations");
  const migrationFiles = readdirSync(migrationDir)
    .filter((file) => file.endsWith(".sql"))
    .sort();
  const targetIndex = migrationFiles.indexOf(targetMigration);
  if (targetIndex === -1) throw new Error(`${targetMigration} was not found.`);

  for (const file of migrationFiles.slice(0, targetIndex)) {
    applySqlFile(join(migrationDir, file));
  }

  runPsql(`
    insert into auth.users (id, email) values
      (${quote(ids.userOwner)}, 'owner@example.test'),
      (${quote(ids.userViewer)}, 'viewer@example.test')
    on conflict (id) do nothing;

    insert into public.workspaces (id, name, slug, created_by)
    values (${quote(ids.workspace)}, 'Tabs Harness', 'tabs-harness', ${quote(ids.userOwner)})
    on conflict (id) do nothing;

    insert into public.workspace_members (workspace_id, user_id, role) values
      (${quote(ids.workspace)}, ${quote(ids.userOwner)}, 'owner'),
      (${quote(ids.workspace)}, ${quote(ids.userViewer)}, 'viewer')
    on conflict (workspace_id, user_id) do update set role = excluded.role;

    insert into public.projects (id, workspace_id, name, client_name, project_code, currency_code, created_by)
    values (${quote(ids.project)}, ${quote(ids.workspace)}, 'Tabs Harness Project', 'Harness Client', 'TAB', 'PHP', ${quote(ids.userOwner)})
    on conflict (id) do nothing;

    insert into public.estimates (id, project_id, name, sheet_code, currency_code, metadata, created_by)
    values
      (${quote(ids.inheritedEstimate)}, ${quote(ids.project)}, 'Inherited Estimate', 'ES-100', 'PHP', '{}'::jsonb, ${quote(ids.userOwner)}),
      (${quote(ids.restrictedEstimate)}, ${quote(ids.project)}, 'Restricted Estimate', 'ES-200', 'PHP', '{}'::jsonb, ${quote(ids.userOwner)})
    on conflict (id) do nothing;

    insert into public.estimate_sheet_access_settings (estimate_id, project_id, inherit_project_access, updated_by)
    values (${quote(ids.restrictedEstimate)}, ${quote(ids.project)}, false, ${quote(ids.userOwner)})
    on conflict (estimate_id) do update set inherit_project_access = excluded.inherit_project_access;

    insert into public.estimate_nodes (id, estimate_id, parent_id, kind, name, sort_order)
    values
      (${quote(ids.rootNode)}, ${quote(ids.inheritedEstimate)}, null, 'group', 'Root Group', 0),
      (${quote(ids.areaNode)}, ${quote(ids.inheritedEstimate)}, ${quote(ids.rootNode)}, 'area', 'Area', 0)
    on conflict (id) do nothing;

    insert into public.estimate_row_items (id, estimate_id, node_id, sort_order, material, description, supplier, unit, quantity, unit_cost, metadata)
    values (${quote(ids.rowItem)}, ${quote(ids.inheritedEstimate)}, ${quote(ids.areaNode)}, 0, 'Harness material', 'Harness row', 'Harness supplier', 'unit', 1, 10, '{}'::jsonb)
    on conflict (id) do nothing;
  `);

  applySqlFile(join(migrationDir, targetMigration));

  assertScalar("select count(*) from public.estimates e join public.estimate_tabs t on t.estimate_id = e.id and t.is_default where e.id in ('" + ids.inheritedEstimate + "', '" + ids.restrictedEstimate + "')", "2", "P1 harness default tabs");
  assertScalar("select count(*) from public.estimate_nodes where estimate_tab_id is null", "0", "P2 harness attached nodes");
  assertScalar("select count(*) from public.estimate_nodes n join public.estimate_tabs t on t.id = n.estimate_tab_id where t.estimate_id <> n.estimate_id", "0", "P3 harness tab boundaries");
  assertScalar("select count(*) from public.estimate_nodes c join public.estimate_nodes p on p.id = c.parent_id where c.estimate_tab_id <> p.estimate_tab_id", "0", "P4 harness same-tab parents");
  assertScalar("select count(*) from public.estimate_row_items r join public.estimate_nodes n on n.id = r.node_id where n.estimate_id <> r.estimate_id", "0", "P5 harness row estimate boundary");

  assertScalar(asUserSql(ids.userOwner, "select count(*) from public.estimate_tabs where estimate_id in ('" + ids.inheritedEstimate + "', '" + ids.restrictedEstimate + "');"), "1", "workspace owner without explicit sheet membership reads only inherited estimate tab");
  assertScalar(asUserSql(ids.userViewer, "select count(*) from public.estimate_tabs where estimate_id in ('" + ids.inheritedEstimate + "', '" + ids.restrictedEstimate + "');"), "1", "viewer can read only inherited estimate tab");

  const viewerCreateSql = asUserSql(ids.userViewer, `
    select public.create_estimate_tab_with_history(${quote(ids.project)}, ${quote(ids.inheritedEstimate)}, 'Viewer Forbidden', ${quote(ids.userViewer)}, gen_random_uuid());
  `);
  assertFailure(viewerCreateSql, "viewer cannot create estimate tab");

  const ownerCreateSql = asUserSql(ids.userOwner, `
    select (public.create_estimate_tab_with_history(${quote(ids.project)}, ${quote(ids.inheritedEstimate)}, 'Owner Created', ${quote(ids.userOwner)}, gen_random_uuid())->>'estimateTabId') is not null;
  `);
  assertScalar(ownerCreateSql, "t", "owner can create estimate tab");

  assertScalar("select count(*) from public.estimate_sheet_events where event_type = 'tab_created' and estimate_tab_id is not null", "1", "tab-created event is tab-scoped");

  console.log("estimate-tabs local Postgres proof passed");
} finally {
  cleanup();
}
