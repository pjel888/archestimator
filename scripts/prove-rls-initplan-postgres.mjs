#!/usr/bin/env node

// Prove the RLS initplan rewrite changes NO access decision.
//
// Migration 20260614162000_rls_initplan_auth_uid.sql rewrites three
// SECURITY DEFINER helpers — is_workspace_member, current_project_access_rank,
// can_access_estimate — replacing bare `auth.uid()` with `(select auth.uid())`.
// The bodies are otherwise byte-identical. This harness spins up a temp PG17
// instance, applies every migration EXCEPT the target (so the helpers are the
// OLD bare-auth.uid() versions), captures each access decision for three
// principals (owner / sheet-collaborator / non-member), then applies ONLY the
// target migration and re-captures the same decisions. It asserts OLD === NEW
// for every (user, function) pair, and also asserts the expected semantics so
// the proof is meaningful.

import { existsSync, mkdtempSync, readFileSync, readdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

const repoRoot = process.cwd();
const pgBin = process.env.POSTGRES_BIN_DIR ?? "/opt/homebrew/opt/postgresql@16/bin";
const initdb = join(pgBin, "initdb");
const pgCtl = join(pgBin, "pg_ctl");
const psql = join(pgBin, "psql");
const tempRoot = mkdtempSync(join(tmpdir(), "archestimator-rls-initplan-"));
const dataDir = join(tempRoot, "data");
const logFile = join(tempRoot, "postgres.log");
const port = String(57432 + Math.floor(Math.random() * 1000));
const targetMigration = "20260614162000_rls_initplan_auth_uid.sql";
let serverStarted = false;

const ids = {
  // OWNER: workspace 'owner' of the workspace owning the project/estimate.
  userOwner: "11111111-1111-4111-8111-111111111111",
  // SHEET COLLABORATOR: not a workspace/project member, but an estimate_sheet_members row.
  userCollaborator: "22222222-2222-4222-8222-222222222222",
  // NON-MEMBER: no membership anywhere.
  userNonMember: "33333333-3333-4333-8333-333333333333",
  workspace: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
  project: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
  estimate: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
  tab: "dddddddd-dddd-4ddd-8ddd-dddddddddddd",
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

// Run a single scalar query AS the given user and return the trimmed text.
function scalarAsUser(userId, expr) {
  return runPsql(asUserSql(userId, `select ${expr};`)).stdout.trim();
}

// Capture the three access decisions for one principal, as that user.
function captureDecisions(userId) {
  return {
    can_access_estimate: scalarAsUser(userId, `public.can_access_estimate(${quote(ids.estimate)})`),
    current_project_access_rank: scalarAsUser(userId, `public.current_project_access_rank(${quote(ids.project)})`),
    is_workspace_member: scalarAsUser(userId, `public.is_workspace_member(${quote(ids.workspace)})`),
  };
}

const principals = [
  { key: "owner", id: ids.userOwner },
  { key: "collaborator", id: ids.userCollaborator },
  { key: "non-member", id: ids.userNonMember },
];
const functionKeys = ["can_access_estimate", "current_project_access_rank", "is_workspace_member"];

try {
  [initdb, pgCtl, psql].forEach(requireBinary);

  run(initdb, ["-D", dataDir, "-A", "trust", "-U", "postgres", "--no-locale"]);
  run(pgCtl, ["-D", dataDir, "-l", logFile, "-o", `-p ${port} -c listen_addresses=127.0.0.1`, "-w", "start"]);
  serverStarted = true;

  // Supabase auth/storage/realtime stubs — identical to the estimate-tabs harness.
  // auth.uid()/role()/jwt() read request.jwt.claim.sub, which asUserSql sets per txn.
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

  // Apply ALL migrations sorted ascending EXCEPT the target — so the three
  // helpers remain the OLD bare-auth.uid() versions for the first capture.
  const migrationDir = join(repoRoot, "supabase/migrations");
  const migrationFiles = readdirSync(migrationDir)
    .filter((file) => file.endsWith(".sql"))
    .sort();
  if (!migrationFiles.includes(targetMigration)) {
    throw new Error(`${targetMigration} was not found in ${migrationDir}.`);
  }

  for (const file of migrationFiles) {
    if (file === targetMigration) continue;
    applySqlFile(join(migrationDir, file));
  }

  // Seed three principals against ONE estimate.
  // - OWNER: workspace_members 'owner' of the workspace owning project/estimate.
  // - COLLABORATOR: NOT a workspace/project member; an estimate_sheet_members row
  //   for the target estimate (the sheet-member branch of can_access_estimate,
  //   which is independent of estimate_inherits_project_access).
  // - NON-MEMBER: no membership anywhere.
  // The estimate uses the default inherit_project_access=true (no override row),
  // exactly like the template's inheritedEstimate. Because ALL migrations are
  // already applied here (unlike the template, which seeds BEFORE the tabs
  // foundation backfill), estimate_nodes.estimate_tab_id is already NOT NULL —
  // so we seed an explicit default estimate_tabs row and attach both nodes to it.
  // The node-tree enforce trigger is deferrable-initially-deferred, so a single
  // multi-statement transaction satisfies it at commit.
  runPsql(`
    insert into auth.users (id, email) values
      (${quote(ids.userOwner)}, 'owner@example.test'),
      (${quote(ids.userCollaborator)}, 'collaborator@example.test'),
      (${quote(ids.userNonMember)}, 'non-member@example.test')
    on conflict (id) do nothing;

    insert into public.workspaces (id, name, slug, created_by)
    values (${quote(ids.workspace)}, 'RLS Initplan Harness', 'rls-initplan-harness', ${quote(ids.userOwner)})
    on conflict (id) do nothing;

    insert into public.workspace_members (workspace_id, user_id, role) values
      (${quote(ids.workspace)}, ${quote(ids.userOwner)}, 'owner')
    on conflict (workspace_id, user_id) do update set role = excluded.role;

    insert into public.projects (id, workspace_id, name, client_name, project_code, currency_code, created_by)
    values (${quote(ids.project)}, ${quote(ids.workspace)}, 'RLS Initplan Project', 'Harness Client', 'RLS', 'PHP', ${quote(ids.userOwner)})
    on conflict (id) do nothing;

    insert into public.estimates (id, project_id, name, sheet_code, currency_code, metadata, created_by)
    values
      (${quote(ids.estimate)}, ${quote(ids.project)}, 'Harness Estimate', 'ES-100', 'PHP', '{}'::jsonb, ${quote(ids.userOwner)})
    on conflict (id) do nothing;

    insert into public.estimate_tabs (id, estimate_id, name, sort_order, is_default, created_by)
    values (${quote(ids.tab)}, ${quote(ids.estimate)}, 'Default', 0, true, ${quote(ids.userOwner)})
    on conflict (id) do nothing;

    -- SHEET COLLABORATOR: granted access ONLY through the sheet-member branch.
    -- Mirrors how the template seeds estimate_sheet_members (estimate_id, project_id, user_id, role).
    insert into public.estimate_sheet_members (estimate_id, project_id, user_id, role, added_by)
    values (${quote(ids.estimate)}, ${quote(ids.project)}, ${quote(ids.userCollaborator)}, 'viewer', ${quote(ids.userOwner)})
    on conflict (estimate_id, user_id) do update set role = excluded.role;

    insert into public.estimate_nodes (id, estimate_id, estimate_tab_id, parent_id, kind, name, sort_order)
    values
      (${quote(ids.rootNode)}, ${quote(ids.estimate)}, ${quote(ids.tab)}, null, 'group', 'Root Group', 0),
      (${quote(ids.areaNode)}, ${quote(ids.estimate)}, ${quote(ids.tab)}, ${quote(ids.rootNode)}, 'area', 'Area', 0)
    on conflict (id) do nothing;

    insert into public.estimate_row_items (id, estimate_id, node_id, sort_order, material, description, supplier, unit, quantity, unit_cost, metadata)
    values (${quote(ids.rowItem)}, ${quote(ids.estimate)}, ${quote(ids.areaNode)}, 0, 'Harness material', 'Harness row', 'Harness supplier', 'unit', 1, 10, '{}'::jsonb)
    on conflict (id) do nothing;
  `);

  // Sanity: confirm the helper THIS migration rewrites (is_workspace_member) is
  // still the OLD bare-auth.uid() version before we apply it. (can_access_estimate
  // and current_project_access_rank were already wrapped by the earlier Teamspace
  // migration 20260614120100, so we guard on is_workspace_member — the helper this
  // migration uniquely covers — to keep the before/after proof meaningful.)
  const preBodyHasSelectAuthUid = runPsql(
    "select pg_get_functiondef('public.is_workspace_member(uuid)'::regprocedure) like '%(select auth.uid())%';",
  ).stdout.trim();
  if (preBodyHasSelectAuthUid !== "f") {
    throw new Error(
      `Pre-condition failed: is_workspace_member already contains (select auth.uid()) before the target migration was applied (got ${preBodyHasSelectAuthUid}).`,
    );
  }

  // ---- Capture OLD decisions (bare auth.uid() helpers) ----
  const oldDecisions = {
    owner: captureDecisions(ids.userOwner),
    collaborator: captureDecisions(ids.userCollaborator),
    "non-member": captureDecisions(ids.userNonMember),
  };

  // ---- Apply ONLY the target migration — helpers become (select auth.uid()) ----
  applySqlFile(join(migrationDir, targetMigration));

  // Sanity: confirm the rewrite actually landed on is_workspace_member.
  const postBodyHasSelectAuthUid = runPsql(
    "select pg_get_functiondef('public.is_workspace_member(uuid)'::regprocedure) like '%(select auth.uid())%';",
  ).stdout.trim();
  if (postBodyHasSelectAuthUid !== "t") {
    throw new Error(
      `Post-condition failed: is_workspace_member does not contain (select auth.uid()) after the target migration (got ${postBodyHasSelectAuthUid}).`,
    );
  }

  // ---- Capture NEW decisions ((select auth.uid()) helpers) ----
  const newDecisions = {
    owner: captureDecisions(ids.userOwner),
    collaborator: captureDecisions(ids.userCollaborator),
    "non-member": captureDecisions(ids.userNonMember),
  };

  // ---- Print OLD vs NEW table ----
  const rows = [];
  for (const { key } of principals) {
    for (const fn of functionKeys) {
      rows.push({
        user: key,
        function: fn,
        old: oldDecisions[key][fn],
        new: newDecisions[key][fn],
        match: oldDecisions[key][fn] === newDecisions[key][fn] ? "yes" : "NO",
      });
    }
  }

  const col = (s, w) => String(s).padEnd(w);
  const wUser = Math.max(4, ...rows.map((r) => r.user.length));
  const wFn = Math.max(8, ...rows.map((r) => r.function.length));
  console.log("");
  console.log("RLS initplan rewrite — access-decision parity (OLD bare auth.uid() vs NEW (select auth.uid()))");
  console.log(`  ${col("user", wUser)}  ${col("function", wFn)}  OLD  NEW  MATCH`);
  console.log(`  ${"-".repeat(wUser)}  ${"-".repeat(wFn)}  ---  ---  -----`);
  for (const r of rows) {
    console.log(`  ${col(r.user, wUser)}  ${col(r.function, wFn)}  ${col(r.old, 3)}  ${col(r.new, 3)}  ${r.match}`);
  }
  console.log("");

  // ---- ASSERT 1: every (user, function) pair is unchanged by the rewrite ----
  const mismatches = rows.filter((r) => r.match !== "yes");
  if (mismatches.length > 0) {
    const diff = mismatches
      .map((r) => `  (${r.user}, ${r.function}): OLD=${r.old} NEW=${r.new}`)
      .join("\n");
    throw new Error(`RLS initplan rewrite CHANGED ${mismatches.length} access decision(s):\n${diff}`);
  }

  // ---- ASSERT 2: expected semantics (so parity is meaningful, not vacuous) ----
  const expect = (actual, wanted, label) => {
    if (actual !== wanted) {
      throw new Error(`Semantics check failed — ${label}: expected ${wanted}, received ${actual || "<empty>"}`);
    }
  };

  // owner -> can_access true, rank > 0, workspace member true
  expect(newDecisions.owner.can_access_estimate, "t", "owner can_access_estimate");
  if (!(Number.parseInt(newDecisions.owner.current_project_access_rank, 10) > 0)) {
    throw new Error(
      `Semantics check failed — owner current_project_access_rank: expected > 0, received ${newDecisions.owner.current_project_access_rank}`,
    );
  }
  expect(newDecisions.owner.is_workspace_member, "t", "owner is_workspace_member");

  // sheet-collaborator -> can_access true (sheet branch), workspace member false, rank 0
  expect(newDecisions.collaborator.can_access_estimate, "t", "collaborator can_access_estimate (sheet branch)");
  expect(newDecisions.collaborator.is_workspace_member, "f", "collaborator is_workspace_member");
  expect(newDecisions.collaborator.current_project_access_rank, "0", "collaborator current_project_access_rank");

  // non-member -> can_access false, rank 0, workspace member false
  expect(newDecisions["non-member"].can_access_estimate, "f", "non-member can_access_estimate");
  expect(newDecisions["non-member"].current_project_access_rank, "0", "non-member current_project_access_rank");
  expect(newDecisions["non-member"].is_workspace_member, "f", "non-member is_workspace_member");

  console.log(`PASS: ${rows.length} decisions identical (owner/collaborator/non-member)`);
} finally {
  cleanup();
}
