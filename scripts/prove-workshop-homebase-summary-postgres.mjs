#!/usr/bin/env node

// Local proof harness for public.workspace_homebase_summary(uuid, int).
// Uses a temp Postgres instance with a minimal schema, applies the migration,
// and verifies cross-tenant denial, same-workspace favorite isolation, and anon
// execute denial. Output is sanitized: no ids, emails, tokens, or SQL URLs.

import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

const repoRoot = process.cwd();
const pgBin = process.env.POSTGRES_BIN_DIR ?? "/opt/homebrew/bin";
const initdb = join(pgBin, "initdb");
const pgCtl = join(pgBin, "pg_ctl");
const psql = join(pgBin, "psql");
const tempRoot = mkdtempSync(join(tmpdir(), "archestimator-workspace-homebase-summary-"));
const dataDir = join(tempRoot, "data");
const logFile = join(tempRoot, "postgres.log");
const port = String(58432 + Math.floor(Math.random() * 1000));
let serverStarted = false;

const ids = {
  userA: "11111111-1111-4111-8111-111111111111",
  userB: "22222222-2222-4222-8222-222222222222",
  userC: "33333333-3333-4333-8333-333333333333",
  workspaceA: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
  workspaceB: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
  projectA: "a1000000-0000-4000-8000-000000000001",
  projectB: "a2000000-0000-4000-8000-000000000002",
  projectOtherTenant: "b1000000-0000-4000-8000-000000000001",
  estimateA: "e1000000-0000-4000-8000-000000000001",
  estimateB: "e2000000-0000-4000-8000-000000000002",
  estimateOtherTenant: "f1000000-0000-4000-8000-000000000001",
  nodeA: "d1000000-0000-4000-8000-000000000001",
  nodeB: "d2000000-0000-4000-8000-000000000002",
  nodeOtherTenant: "c1000000-0000-4000-8000-000000000001",
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

function callSummaryAs(userId, workspaceId) {
  const result = runPsql(`
    begin;
    set local role authenticated;
    set local request.jwt.claim.sub = ${quote(userId)};
    select public.workspace_homebase_summary(${quote(workspaceId)}::uuid, 12);
    commit;
  `);
  const jsonLine = result.stdout.split(/\r?\n/).find((line) => line.trim().startsWith("{"));
  if (!jsonLine) throw new Error("RPC did not return JSON");
  return JSON.parse(jsonLine);
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
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

    create table public.workspaces (
      id uuid primary key,
      name text,
      created_by uuid,
      created_at timestamptz default now(),
      updated_at timestamptz default now()
    );
    create table public.workspace_members (
      workspace_id uuid not null references public.workspaces(id),
      user_id uuid not null,
      role text not null default 'member',
      created_at timestamptz default now(),
      primary key (workspace_id, user_id)
    );
    create table public.projects (
      id uuid primary key,
      workspace_id uuid not null references public.workspaces(id),
      name text not null,
      client_name text,
      project_code text,
      location text,
      created_by uuid,
      created_at timestamptz default now(),
      updated_at timestamptz default now(),
      unique (id, workspace_id)
    );
    create table public.project_members (
      project_id uuid not null,
      workspace_id uuid not null,
      user_id uuid not null,
      role text not null default 'viewer',
      created_at timestamptz default now(),
      updated_at timestamptz default now(),
      primary key (project_id, user_id)
    );
    create table public.estimates (
      id uuid primary key,
      project_id uuid not null references public.projects(id),
      name text not null,
      sheet_code text,
      created_at timestamptz default now(),
      updated_at timestamptz default now(),
      unique (id, project_id)
    );
    create table public.estimate_sheet_members (
      estimate_id uuid not null,
      project_id uuid not null,
      user_id uuid not null,
      role text not null default 'viewer',
      created_at timestamptz default now(),
      updated_at timestamptz default now(),
      primary key (estimate_id, user_id)
    );
    create table public.project_favorites (
      id uuid primary key,
      workspace_id uuid not null,
      user_id uuid not null,
      project_id uuid not null,
      created_at timestamptz not null default now()
    );
    create table public.estimate_favorites (
      id uuid primary key,
      workspace_id uuid not null,
      user_id uuid not null,
      project_id uuid not null,
      estimate_id uuid not null,
      created_at timestamptz not null default now()
    );
    create table public.estimate_nodes (
      id uuid primary key,
      estimate_id uuid not null references public.estimates(id),
      kind text not null,
      parent_id uuid,
      sort_order integer not null default 0
    );
    grant select on all tables in schema public to authenticated;
  `);

  const migrationSql = readFileSync(join(repoRoot, "supabase/migrations/20260618184856_workspace_homebase_summary.sql"), "utf8");
  applySql(migrationSql);

  applySql(`
    insert into public.workspaces (id, name, created_by) values
      (${quote(ids.workspaceA)}, 'Workspace A', ${quote(ids.userA)}),
      (${quote(ids.workspaceB)}, 'Workspace B', ${quote(ids.userC)});
    insert into public.workspace_members (workspace_id, user_id, role) values
      (${quote(ids.workspaceA)}, ${quote(ids.userA)}, 'owner'),
      (${quote(ids.workspaceA)}, ${quote(ids.userB)}, 'member'),
      (${quote(ids.workspaceB)}, ${quote(ids.userC)}, 'owner');
    insert into public.projects (id, workspace_id, name, client_name, project_code, location, created_by, updated_at) values
      (${quote(ids.projectA)}, ${quote(ids.workspaceA)}, 'Project A', 'Client A', 'A-001', 'Site A', ${quote(ids.userA)}, '2026-06-18T08:00:00Z'),
      (${quote(ids.projectB)}, ${quote(ids.workspaceA)}, 'Project B', 'Client B', 'B-001', 'Site B', ${quote(ids.userB)}, '2026-06-18T09:00:00Z'),
      (${quote(ids.projectOtherTenant)}, ${quote(ids.workspaceB)}, 'Other Tenant Project', 'Other', 'X-001', 'Other', ${quote(ids.userC)}, '2026-06-18T10:00:00Z');
    insert into public.estimates (id, project_id, name, sheet_code, updated_at) values
      (${quote(ids.estimateA)}, ${quote(ids.projectA)}, 'Estimate A', 'EA-001', '2026-06-18T08:30:00Z'),
      (${quote(ids.estimateB)}, ${quote(ids.projectB)}, 'Estimate B', 'EB-001', '2026-06-18T09:30:00Z'),
      (${quote(ids.estimateOtherTenant)}, ${quote(ids.projectOtherTenant)}, 'Other Tenant Estimate', 'EX-001', '2026-06-18T10:30:00Z');
    insert into public.estimate_nodes (id, estimate_id, kind, sort_order) values
      (${quote(ids.nodeA)}, ${quote(ids.estimateA)}, 'area', 1),
      (${quote(ids.nodeB)}, ${quote(ids.estimateB)}, 'area', 1),
      (${quote(ids.nodeOtherTenant)}, ${quote(ids.estimateOtherTenant)}, 'area', 1);
    insert into public.project_favorites (id, workspace_id, user_id, project_id, created_at) values
      ('fa000000-0000-4000-8000-000000000001', ${quote(ids.workspaceA)}, ${quote(ids.userA)}, ${quote(ids.projectA)}, '2026-06-18T11:00:00Z'),
      ('fb000000-0000-4000-8000-000000000001', ${quote(ids.workspaceA)}, ${quote(ids.userB)}, ${quote(ids.projectB)}, '2026-06-18T11:05:00Z'),
      ('fc000000-0000-4000-8000-000000000001', ${quote(ids.workspaceB)}, ${quote(ids.userC)}, ${quote(ids.projectOtherTenant)}, '2026-06-18T11:10:00Z');
    insert into public.estimate_favorites (id, workspace_id, user_id, project_id, estimate_id, created_at) values
      ('ea000000-0000-4000-8000-000000000001', ${quote(ids.workspaceA)}, ${quote(ids.userA)}, ${quote(ids.projectA)}, ${quote(ids.estimateA)}, '2026-06-18T12:00:00Z'),
      ('eb000000-0000-4000-8000-000000000001', ${quote(ids.workspaceA)}, ${quote(ids.userB)}, ${quote(ids.projectB)}, ${quote(ids.estimateB)}, '2026-06-18T12:05:00Z'),
      ('ec000000-0000-4000-8000-000000000001', ${quote(ids.workspaceB)}, ${quote(ids.userC)}, ${quote(ids.projectOtherTenant)}, ${quote(ids.estimateOtherTenant)}, '2026-06-18T12:10:00Z');
  `);

  const userA = callSummaryAs(ids.userA, ids.workspaceA);
  const userB = callSummaryAs(ids.userB, ids.workspaceA);
  const nonMember = callSummaryAs(ids.userC, ids.workspaceA);

  assert(userA.projectFavorites.length === 1, "user A sees only one own project favorite");
  assert(userA.projectFavorites[0].project_id === ids.projectA, "user A project favorite leaked or disappeared");
  assert(userA.estimateFavorites.length === 1, "user A sees only one own estimate favorite");
  assert(userA.estimateFavorites[0].estimate_id === ids.estimateA, "user A estimate favorite leaked or disappeared");
  assert(
    userA.favoriteProjects.every((project) => project.id !== ids.projectB),
    "user A favorite project records leaked user B favorite",
  );
  assert(
    userA.favoriteEstimates.every((estimate) => estimate.id !== ids.estimateB),
    "user A favorite estimate records leaked user B favorite",
  );
  assert(!JSON.stringify(userA).includes(ids.workspaceB), "user A output leaked other workspace");

  assert(userB.projectFavorites.length === 1, "user B sees only one own project favorite");
  assert(userB.projectFavorites[0].project_id === ids.projectB, "user B project favorite leaked or disappeared");
  assert(nonMember.projectFavorites.length === 0, "non-member saw project favorites");
  assert(nonMember.recentProjects.length === 0, "non-member saw recent projects");
  assert(nonMember.recentEstimates.length === 0, "non-member saw recent estimates");
  assert(nonMember.estimateNodes.length === 0, "non-member saw estimate nodes");
  assert(!("pendingInvites" in userA), "RPC returned pending invite data");
  assert(!("projectPublications" in userA), "RPC returned publication data");

  runPsql(`
    begin;
    set local role anon;
    set local request.jwt.claim.sub = ${quote(ids.userA)};
    select public.workspace_homebase_summary(${quote(ids.workspaceA)}::uuid, 12);
    commit;
  `, { expectFailure: true });

  console.log(JSON.stringify({
    ok: true,
    proof: "workspace_homebase_summary",
    checks: [
      "same-workspace favorite isolation",
      "cross-tenant non-member denial",
      "anon execute denial",
      "optional publication and pending invite exclusion",
    ],
  }, null, 2));
} finally {
  cleanup();
}
