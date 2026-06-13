#!/usr/bin/env node

// Proof harness for the Phase-5 RELAX-ONLY unification migration
// (.ai/03_plans/2026-06-13-Estimate-Tree-Single-Node-Unification/08_unify_estimate_node_kinds.P5.sql).
//
// Boots an ephemeral PostgreSQL cluster, bootstraps the auth/storage shims,
// applies the FULL migration chain (seed inserted just before the tabs
// foundation so the backfill stamps estimate_tab_id), proves the CURRENT
// two-kind rules reject mixed content, applies the relax-only migration, then
// proves:
//   • rows-on-(former-group) and child-under-(former-area) are now ACCEPTED
//   • cycle / cross-tab / missing-parent / orphan-row are STILL REJECTED (I1/I2/I3)
//   • the integrity assertion block passes on all-area data
//   • the RPC kind-guard STILL blocks row writes (the Phase-5 write-freeze)
//
// Run:  POSTGRES_BIN_DIR=/opt/homebrew/opt/postgresql@17/bin \
//         node scripts/prove-unify-estimate-node-kinds-postgres.mjs

import { existsSync, mkdtempSync, readFileSync, readdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

const repoRoot = process.cwd();
const pgBin = process.env.POSTGRES_BIN_DIR ?? "/opt/homebrew/opt/postgresql@17/bin";
const initdb = join(pgBin, "initdb");
const pgCtl = join(pgBin, "pg_ctl");
const psql = join(pgBin, "psql");
const tempRoot = mkdtempSync(join(tmpdir(), "archestimator-unify-kinds-"));
const dataDir = join(tempRoot, "data");
const logFile = join(tempRoot, "postgres.log");
const port = String(57432 + Math.floor(Math.random() * 1000));
const tabsMigration = "20260612094734_estimate_tabs_foundation.sql";
const unifyMigration = join(
  repoRoot,
  ".ai/03_plans/2026-06-13-Estimate-Tree-Single-Node-Unification/08_unify_estimate_node_kinds.P5.sql",
);
let serverStarted = false;

const ids = {
  userOwner: "11111111-1111-4111-8111-111111111111",
  userViewer: "22222222-2222-4222-8222-222222222222",
  workspace: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
  project: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
  estimate: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
  rootNode: "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee", // group (root)
  areaNode: "ffffffff-ffff-4fff-8fff-ffffffffffff", // area (child of root)
  rowItem: "99999999-9999-4999-8999-999999999999", // row on areaNode
};

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: repoRoot,
    encoding: "utf8",
    env: { ...process.env, LC_ALL: "C", PATH: `${pgBin}:${process.env.PATH ?? ""}` },
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
  return run(
    psql,
    ["-h", "127.0.0.1", "-p", port, "-U", "postgres", "-d", "postgres", "-v", "ON_ERROR_STOP=1", "-q", "-t", "-A", "-c", sql],
    options,
  );
}

function applySqlFile(path) {
  const content = readFileSync(path, "utf8");
  const args = ["-h", "127.0.0.1", "-p", port, "-U", "postgres", "-d", "postgres", "-v", "ON_ERROR_STOP=1", "-q", "-f", path];
  if (!/(^|\n)\s*begin;/i.test(content)) args.splice(args.length - 2, 0, "-1");
  return run(psql, args);
}

function quote(value) {
  return `'${String(value).replaceAll("'", "''")}'`;
}

function assertScalar(sql, expected, label) {
  const actual = runPsql(sql).stdout.trim();
  if (actual !== String(expected)) throw new Error(`✗ ${label}: expected ${expected}, received ${actual || "<empty>"}`);
  console.log(`✓ ${label}`);
}

function assertOk(sql, label) {
  runPsql(sql);
  console.log(`✓ ${label}`);
}

function assertFailure(sql, label) {
  const result = runPsql(sql, { expectFailure: true });
  if (!result.stderr && !result.stdout) throw new Error(`${label}: failure produced no diagnostic output.`);
  console.log(`✓ ${label} (correctly rejected)`);
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

function cleanup() {
  if (serverStarted) run(pgCtl, ["-D", dataDir, "-m", "fast", "-w", "stop"], { stdio: "pipe" });
  rmSync(tempRoot, { recursive: true, force: true });
}

function requireBinary(path) {
  if (!existsSync(path)) throw new Error(`Missing PostgreSQL binary: ${path}. Install postgresql@17 or set POSTGRES_BIN_DIR.`);
}

try {
  [initdb, pgCtl, psql].forEach(requireBinary);
  run(initdb, ["-D", dataDir, "-A", "trust", "-U", "postgres", "--no-locale"]);
  run(pgCtl, ["-D", dataDir, "-l", logFile, "-o", `-p ${port} -c listen_addresses=127.0.0.1`, "-w", "start"]);
  serverStarted = true;

  // --- auth/storage/realtime shims (verbatim from prove-estimate-tabs-postgres.mjs) ---
  runPsql(`
    create extension if not exists pgcrypto;
    create schema if not exists auth;
    create schema if not exists storage;
    create schema if not exists realtime;
    create role anon nologin;
    create role authenticated nologin;
    create role service_role nologin bypassrls;
    create table auth.users (
      id uuid primary key, email text,
      raw_app_meta_data jsonb not null default '{}'::jsonb,
      raw_user_meta_data jsonb not null default '{}'::jsonb,
      created_at timestamptz not null default now()
    );
    create table storage.buckets (
      id text primary key, name text not null, public boolean not null default false,
      file_size_limit bigint, allowed_mime_types text[],
      created_at timestamptz not null default now(), updated_at timestamptz not null default now()
    );
    create table storage.objects (
      id uuid primary key default gen_random_uuid(),
      bucket_id text not null references storage.buckets(id) on delete cascade,
      name text not null, owner uuid, metadata jsonb,
      created_at timestamptz not null default now(), updated_at timestamptz not null default now()
    );
    alter table storage.objects enable row level security;
    create table realtime.messages (
      id uuid primary key default gen_random_uuid(), topic text not null default '',
      extension text not null default 'broadcast', payload jsonb not null default '{}'::jsonb,
      inserted_at timestamptz not null default now()
    );
    create or replace function realtime.topic() returns text language sql stable as $$
      select coalesce(nullif(current_setting('request.realtime.topic', true), ''), ''); $$;
    create or replace function auth.uid() returns uuid language sql stable as $$
      select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid; $$;
    create or replace function auth.role() returns text language sql stable as $$
      select coalesce(nullif(current_setting('request.jwt.claim.role', true), ''), current_user); $$;
    create or replace function auth.jwt() returns jsonb language sql stable as $$
      select jsonb_build_object(
        'sub', nullif(current_setting('request.jwt.claim.sub', true), ''),
        'email', nullif(current_setting('request.jwt.claim.email', true), ''),
        'role', coalesce(nullif(current_setting('request.jwt.claim.role', true), ''), current_user)); $$;
    create or replace function storage.foldername(path text) returns text[] language sql immutable as $$
      select string_to_array(path, '/'); $$;
  `);

  // --- apply migrations [0, tabs), seed, then [tabs, end] ---
  const migrationDir = join(repoRoot, "supabase/migrations");
  const migrationFiles = readdirSync(migrationDir).filter((f) => f.endsWith(".sql")).sort();
  const tabsIndex = migrationFiles.indexOf(tabsMigration);
  if (tabsIndex === -1) throw new Error(`${tabsMigration} not found.`);

  for (const file of migrationFiles.slice(0, tabsIndex)) applySqlFile(join(migrationDir, file));

  runPsql(`
    insert into auth.users (id, email) values
      (${quote(ids.userOwner)}, 'owner@example.test'), (${quote(ids.userViewer)}, 'viewer@example.test')
    on conflict (id) do nothing;
    insert into public.workspaces (id, name, slug, created_by)
    values (${quote(ids.workspace)}, 'Unify Harness', 'unify-harness', ${quote(ids.userOwner)}) on conflict (id) do nothing;
    insert into public.workspace_members (workspace_id, user_id, role) values
      (${quote(ids.workspace)}, ${quote(ids.userOwner)}, 'owner') on conflict (workspace_id, user_id) do update set role = excluded.role;
    insert into public.projects (id, workspace_id, name, client_name, project_code, currency_code, created_by)
    values (${quote(ids.project)}, ${quote(ids.workspace)}, 'Unify Project', 'Client', 'UNI', 'PHP', ${quote(ids.userOwner)}) on conflict (id) do nothing;
    insert into public.estimates (id, project_id, name, sheet_code, currency_code, metadata, created_by)
    values (${quote(ids.estimate)}, ${quote(ids.project)}, 'Unify Estimate', 'ES-100', 'PHP', '{}'::jsonb, ${quote(ids.userOwner)}) on conflict (id) do nothing;
    insert into public.estimate_nodes (id, estimate_id, parent_id, kind, name, sort_order) values
      (${quote(ids.rootNode)}, ${quote(ids.estimate)}, null, 'group', 'Root Group', 0),
      (${quote(ids.areaNode)}, ${quote(ids.estimate)}, ${quote(ids.rootNode)}, 'area', 'Area', 0) on conflict (id) do nothing;
    insert into public.estimate_row_items (id, estimate_id, node_id, sort_order, material, description, supplier, unit, quantity, unit_cost, metadata)
    values (${quote(ids.rowItem)}, ${quote(ids.estimate)}, ${quote(ids.areaNode)}, 0, 'Material', 'Row', 'Supplier', 'unit', 1, 10, '{}'::jsonb) on conflict (id) do nothing;
  `);

  for (const file of migrationFiles.slice(tabsIndex)) applySqlFile(join(migrationDir, file));

  const tabId = runPsql(`select estimate_tab_id from public.estimate_nodes where id = ${quote(ids.rootNode)};`).stdout.trim();
  if (!tabId) throw new Error("setup: rootNode estimate_tab_id was not backfilled.");

  console.log("\n── PRE-migration: current two-kind rules must REJECT mixed content ──");
  assertOk(`select public.validate_estimate_node_tree(${quote(ids.estimate)});`, "PRE: seeded all-area tree validates");
  assertFailure(
    `insert into public.estimate_row_items (id, estimate_id, node_id, sort_order, material, description, supplier, unit, quantity, unit_cost, metadata)
     values (gen_random_uuid(), ${quote(ids.estimate)}, ${quote(ids.rootNode)}, 5, 'M', 'R', 'S', 'unit', 1, 1, '{}'::jsonb);`,
    "PRE: row on a GROUP node rejected (enforce_estimate_row_item_area_node)",
  );
  assertFailure(
    `insert into public.estimate_nodes (id, estimate_id, estimate_tab_id, parent_id, kind, name, sort_order)
     values (gen_random_uuid(), ${quote(ids.estimate)}, ${quote(tabId)}, ${quote(ids.areaNode)}, 'area', 'Child under area', 1);`,
    "PRE: child under an AREA node rejected (validate_estimate_node_tree hierarchy)",
  );

  console.log("\n── Applying relax-only migration (08_unify_estimate_node_kinds.P5.sql) ──");
  const applyOut = applySqlFile(unifyMigration);
  const noticeLine = (applyOut.stderr || "").split("\n").find((l) => l.includes("Integrity assertions"));
  console.log("  migration applied; " + (noticeLine ? noticeLine.trim() : "(integrity NOTICE not captured in stderr)"));

  console.log("\n── POST-migration: relaxation holds, invariants preserved ──");
  assertOk(
    `insert into public.estimate_nodes (id, estimate_id, estimate_tab_id, parent_id, kind, name, sort_order)
     values ('11111111-2222-4333-8444-555555555555', ${quote(ids.estimate)}, ${quote(tabId)}, ${quote(ids.areaNode)}, 'area', 'Sub-area of an area', 1);`,
    "POST: child under a (former-area) node now ACCEPTED — areaNode is now mixed (row + child)",
  );
  assertOk(
    `insert into public.estimate_row_items (id, estimate_id, node_id, sort_order, material, description, supplier, unit, quantity, unit_cost, metadata)
     values (gen_random_uuid(), ${quote(ids.estimate)}, ${quote(ids.rootNode)}, 6, 'M', 'R', 'S', 'unit', 1, 1, '{}'::jsonb);`,
    "POST: row on a (former-group) node now ACCEPTED — rootNode is now mixed (rows + children)",
  );
  assertOk(`select public.validate_estimate_node_tree(${quote(ids.estimate)});`, "POST: tree with mixed nodes validates");

  assertFailure(
    `update public.estimate_nodes set parent_id = ${quote(ids.areaNode)} where id = ${quote(ids.rootNode)};`,
    "POST · I1: cycle still REJECTED",
  );
  assertFailure(
    `insert into public.estimate_nodes (id, estimate_id, estimate_tab_id, parent_id, kind, name, sort_order)
     values (gen_random_uuid(), ${quote(ids.estimate)}, '00000000-0000-4000-8000-0000000000aa', ${quote(ids.rootNode)}, 'area', 'Cross-tab child', 9);`,
    "POST · I2: cross-tab parent still REJECTED",
  );
  assertFailure(
    `insert into public.estimate_nodes (id, estimate_id, estimate_tab_id, parent_id, kind, name, sort_order)
     values (gen_random_uuid(), ${quote(ids.estimate)}, ${quote(tabId)}, '00000000-0000-4000-8000-0000000000bb', 'area', 'Missing-parent child', 9);`,
    "POST · I3: missing parent still REJECTED",
  );
  assertFailure(
    `insert into public.estimate_row_items (id, estimate_id, node_id, sort_order, material, description, supplier, unit, quantity, unit_cost, metadata)
     values (gen_random_uuid(), ${quote(ids.estimate)}, '00000000-0000-4000-8000-0000000000cc', 7, 'M', 'R', 'S', 'unit', 1, 1, '{}'::jsonb);`,
    "POST: orphan row (bad node_id) still REJECTED (relaxed orphan guard)",
  );

  console.log("\n── POST-migration: Phase-5 RPC write-freeze still holds ──");
  assertFailure(
    asUserSql(
      ids.userOwner,
      `select public.insert_estimate_row_item_with_history(
         ${quote(ids.project)}, ${quote(ids.estimate)}, ${quote(ids.rootNode)},
         '{"material":"X","unit":"unit","quantity":1,"unitCost":1}'::jsonb, ${quote(ids.userOwner)}, gen_random_uuid());`,
    ),
    "POST: insert_estimate_row_item_with_history onto a GROUP node STILL rejected (RPC guard intact in P5 → writes withheld)",
  );

  console.log("\n✅ unify-estimate-node-kinds local Postgres proof passed");
} finally {
  cleanup();
}
