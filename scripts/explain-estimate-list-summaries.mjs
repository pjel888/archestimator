#!/usr/bin/env node

// Local Postgres EXPLAIN-evidence harness for the estimates-list aggregation change.
//
// GOAL: prove that the new aggregation RPC
//   public.project_estimate_list_summaries(target_project_id uuid)
// reads FEWER shared buffers and returns O(estimates) rows (flat in row count),
// versus the OLD path that fetched every estimate_row_item for the estimate.
//
// This reuses the setup of scripts/prove-estimate-list-summaries-postgres.mjs
// VERBATIM (spin up a temp PG17 instance, stub auth/storage/realtime + auth.uid()
// /auth.role()/auth.jwt(), apply ALL migrations sorted ascending). It then seeds
// ONE project + ONE estimate with a valid group->area tree, bulk-inserts 5000
// estimate_row_items under the area node, ANALYZEs, and captures
// EXPLAIN (ANALYZE, BUFFERS, VERBOSE) for both the old and new read paths into
// metrics/p2-explain-before.txt and metrics/p2-explain-after.txt.
//
// We run everything as the postgres superuser, which bypasses RLS so the captured
// plan is the RAW read (no policy subplans muddying the buffer counts). No
// production DB is touched; the temp instance is always torn down.

import { existsSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

const repoRoot = process.cwd();
const pgBin = process.env.POSTGRES_BIN_DIR ?? "/opt/homebrew/opt/postgresql@17/bin";
const initdb = join(pgBin, "initdb");
const pgCtl = join(pgBin, "pg_ctl");
const psql = join(pgBin, "psql");
const tempRoot = mkdtempSync(join(tmpdir(), "archestimator-explain-estimate-list-"));
const dataDir = join(tempRoot, "data");
const logFile = join(tempRoot, "postgres.log");
const port = String(57432 + Math.floor(Math.random() * 1000));
let serverStarted = false;

const ROW_COUNT = 5000;
const metricsDir = join(repoRoot, "metrics");
const beforePath = join(metricsDir, "p2-explain-before.txt");
const afterPath = join(metricsDir, "p2-explain-after.txt");

const ids = {
  userOwner: "11111111-1111-4111-8111-111111111111",
  workspace: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
  project: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
  estimate: "c0000000-0000-4000-8000-000000000001",
  rootNode: "d0000000-0000-4000-8000-000000000001",
  areaNode: "d0000000-0000-4000-8000-000000000002",
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

// Capture a full EXPLAIN (ANALYZE, BUFFERS, VERBOSE) plan as plain text.
// psql is run WITHOUT -t -A here so the plan lines render verbatim.
function explain(sql) {
  const result = run(psql, [
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
    "-X",
    "-P",
    "pager=off",
    "-c",
    `explain (analyze, buffers, verbose) ${sql}`,
  ]);
  return result.stdout.replace(/\s+$/, "");
}

// Pull the EXECUTION shared-buffer figure for a plan.
//
// IMPORTANT: EXPLAIN reports each node's Buffers line CUMULATIVELY — a parent
// node's "Buffers:" already includes every descendant's reads. Summing all node
// lines therefore double-counts wildly. The correct query-wide figure is the FIRST
// (root / top) plan node's "Buffers:" line, which rolls up the whole executed tree.
// We also deliberately skip the "Planning: Buffers" block (catalog/plan-cache
// lookups that depend on cache warmth, not on data volume).
function parseBuffers(planText) {
  let inPlanning = false;
  for (const rawLine of planText.split("\n")) {
    const line = rawLine.trim();
    if (/^Planning:/.test(line)) {
      inPlanning = true;
      continue;
    }
    if (/^(Planning Time|Execution Time|Trigger)/.test(line)) {
      inPlanning = false;
      continue;
    }
    if (inPlanning) continue;
    const m = line.match(/shared\s+(?:hit=(\d+))?\s*(?:read=(\d+))?/);
    if (m) {
      // First (root-most) Buffers line = cumulative whole-query execution buffers.
      return { hit: m[1] ? Number(m[1]) : 0, read: m[2] ? Number(m[2]) : 0 };
    }
  }
  return { hit: 0, read: 0 };
}

// Pull the actual rows emitted by the ROOT plan node (the first "(actual ...)"
// line in the plan), which is the number of rows the query returns.
function parseRootActualRows(planText) {
  const line = planText.split("\n").find((l) => /\(actual time=/.test(l));
  if (!line) return null;
  const m = line.match(/rows=(\d+)/g);
  // First rows= on the root line is the estimate; the actual-clause rows= is what we want.
  const actual = line.match(/\(actual time=[^)]*rows=(\d+)/);
  return actual ? Number(actual[1]) : null;
}

try {
  [initdb, pgCtl, psql].forEach(requireBinary);

  run(initdb, ["-D", dataDir, "-A", "trust", "-U", "postgres", "--no-locale"]);
  run(pgCtl, ["-D", dataDir, "-l", logFile, "-o", `-p ${port} -c listen_addresses=127.0.0.1`, "-w", "start"]);
  serverStarted = true;

  // --- Stub the Supabase-managed schemas/roles/functions (verbatim from the prove harness) ---
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

  // --- Apply ALL migrations sorted ascending (the RPC migration is the newest) ---
  const migrationDir = join(repoRoot, "supabase/migrations");
  const migrationFiles = readdirSync(migrationDir)
    .filter((file) => file.endsWith(".sql"))
    .sort();
  for (const file of migrationFiles) {
    applySqlFile(join(migrationDir, file));
  }

  // The RPC must exist after applying all migrations.
  const rpcExists = runPsql(
    "select count(*) from pg_proc where proname = 'project_estimate_list_summaries';",
  ).stdout.trim();
  if (rpcExists !== "1") {
    throw new Error(`Expected project_estimate_list_summaries RPC to exist after migrations, found ${rpcExists}.`);
  }

  // --- Seed workspace / membership / project (superuser, bypassing RLS) ---
  runPsql(`
    insert into auth.users (id, email) values
      (${quote(ids.userOwner)}, 'owner@example.test')
    on conflict (id) do nothing;

    insert into public.workspaces (id, name, slug, created_by)
    values (${quote(ids.workspace)}, 'Explain Harness', 'explain-harness', ${quote(ids.userOwner)})
    on conflict (id) do nothing;

    insert into public.workspace_members (workspace_id, user_id, role) values
      (${quote(ids.workspace)}, ${quote(ids.userOwner)}, 'owner')
    on conflict (workspace_id, user_id) do update set role = excluded.role;

    insert into public.projects (id, workspace_id, name, client_name, project_code, currency_code, created_by)
    values (${quote(ids.project)}, ${quote(ids.workspace)}, 'Explain Project', 'Harness Client', 'EXP', 'PHP', ${quote(ids.userOwner)})
    on conflict (id) do nothing;
  `);

  // --- Seed ONE estimate with a valid group->area tree in a single transaction so the
  //     deferred tree trigger sees a complete tree at commit ---
  runPsql(`
    begin;

    insert into public.estimates (id, project_id, name, sheet_code, currency_code, metadata, created_by)
    values (${quote(ids.estimate)}, ${quote(ids.project)}, 'Explain Estimate', 'ES-001', 'PHP', '{}'::jsonb, ${quote(ids.userOwner)});

    insert into public.estimate_tabs (estimate_id, name, sort_order, is_default, created_by)
    values (${quote(ids.estimate)}, 'Default', 0, true, ${quote(ids.userOwner)});

    insert into public.estimate_nodes (id, estimate_id, estimate_tab_id, parent_id, kind, name, sort_order)
    select ${quote(ids.rootNode)}, ${quote(ids.estimate)}, t.id, null, 'group', 'Root Group', 0
    from public.estimate_tabs t where t.estimate_id = ${quote(ids.estimate)} and t.is_default;

    insert into public.estimate_nodes (id, estimate_id, estimate_tab_id, parent_id, kind, name, sort_order)
    select ${quote(ids.areaNode)}, ${quote(ids.estimate)}, t.id, ${quote(ids.rootNode)}, 'area', 'Area', 0
    from public.estimate_tabs t where t.estimate_id = ${quote(ids.estimate)} and t.is_default;

    commit;
  `);

  // --- Bulk-insert ROW_COUNT estimate_row_items under the area node via generate_series.
  //     Each row gets a DISTINCT sort_order (the table has a deferrable unique
  //     (node_id, sort_order) constraint). contingency_percentage is numeric(7,4)
  //     NOT NULL default 0; we set it explicitly to 5 to mirror the example values. ---
  runPsql(`
    insert into public.estimate_row_items
      (estimate_id, node_id, sort_order, material, description, supplier, unit,
       quantity, unit_cost, contingency_percentage, misc_cost)
    select
      ${quote(ids.estimate)},
      ${quote(ids.areaNode)},
      g,
      'Harness material',
      'Harness row ' || g,
      'Harness supplier',
      'unit',
      1,
      100,
      5,
      10
    from generate_series(0, ${ROW_COUNT - 1}) as g;
  `);

  // Confirm the seeded volume.
  const seededRows = runPsql(
    `select count(*) from public.estimate_row_items where estimate_id = ${quote(ids.estimate)};`,
  ).stdout.trim();
  if (seededRows !== String(ROW_COUNT)) {
    throw new Error(`Expected ${ROW_COUNT} row items seeded, found ${seededRows}.`);
  }

  // --- ANALYZE so the planner has fresh stats for the captured plans ---
  runPsql(`analyze public.estimate_row_items; analyze public.estimate_nodes; analyze public.estimates;`);

  // --- OLD path: the all-rows fetch listProjectEstimates used to ship to the server.
  //     This scans/returns one row per estimate_row_item (~ROW_COUNT). ---
  const beforeSql =
    `select estimate_id, quantity, unit_cost, contingency_percentage, misc_cost ` +
    `from public.estimate_row_items where estimate_id = ${quote(ids.estimate)};`;
  const beforePlan = explain(beforeSql);
  const beforeBuffers = parseBuffers(beforePlan);
  const beforeRows = parseRootActualRows(beforePlan);

  // --- NEW path: the aggregation RPC returns one row PER ESTIMATE (flat). ---
  //
  // We capture this two ways:
  //  (1) The function CALL itself — the literal `select * from
  //      project_estimate_list_summaries(...)`. This is exactly what the app issues,
  //      but a bare SQL `Function Scan` is opaque: EXPLAIN shows only the outer scan,
  //      not the inner aggregation, and the inner work shows up as the function-call
  //      buffer total. We warm the plan cache first so this figure is not dominated
  //      by a one-time function-body compile (catalog reads on cold cache).
  //  (2) The INLINED function body — the exact CTE the function runs, pasted as a
  //      plain query. This is what lets EXPLAIN expose the real aggregation scans and
  //      their per-node execution buffers, giving an apples-to-apples data-read
  //      comparison against the BEFORE seq scan. The buffer SUMMARY below is taken
  //      from this inlined plan.
  const afterCallSql = `select * from public.project_estimate_list_summaries(${quote(ids.project)});`;
  // Warm the plan cache / function body so the captured call plan is steady-state.
  explain(afterCallSql);
  const afterCallPlan = explain(afterCallSql);
  const afterCallRows = parseRootActualRows(afterCallPlan);

  // Inlined function body (kept byte-equivalent to the RPC migration's SQL).
  const afterInlineSql = `
    with est as (
      select e.id from public.estimates e where e.project_id = ${quote(ids.project)}
    ),
    node_agg as (
      select n.estimate_id,
             count(*) as node_count,
             null::uuid as first_node_id
      from public.estimate_nodes n
      join est on est.id = n.estimate_id
      group by n.estimate_id
    ),
    row_agg as (
      select r.estimate_id,
             count(*) as row_count,
             coalesce(sum(
               r.quantity * r.unit_cost
               + r.misc_cost
               + (r.quantity * r.unit_cost * coalesce(r.contingency_percentage, 0) / 100)
             ), 0) as total_cost
      from public.estimate_row_items r
      join est on est.id = r.estimate_id
      group by r.estimate_id
    )
    select est.id,
           coalesce(node_agg.node_count, 0)::int,
           coalesce(row_agg.row_count, 0)::int,
           coalesce(row_agg.total_cost, 0),
           node_agg.first_node_id
    from est
    left join node_agg on node_agg.estimate_id = est.id
    left join row_agg  on row_agg.estimate_id = est.id`;
  const afterPlan = explain(afterInlineSql);
  const afterBuffers = parseBuffers(afterPlan);
  const afterRows = parseRootActualRows(afterPlan);

  // --- Write the artifacts ---
  if (!existsSync(metricsDir)) mkdirSync(metricsDir, { recursive: true });

  const beforeHeader = [
    "P2 estimates-list aggregation change — BEFORE (old all-rows path)",
    "=================================================================",
    "",
    `Seeded volume: ${ROW_COUNT} estimate_row_items under one estimate (one project, one estimate).`,
    "Query captured (the all-rows fetch the old listProjectEstimates shipped to the server):",
    "",
    `  EXPLAIN (ANALYZE, BUFFERS, VERBOSE)`,
    `  select estimate_id, quantity, unit_cost, contingency_percentage, misc_cost`,
    `  from public.estimate_row_items where estimate_id = '${ids.estimate}';`,
    "",
    `SUMMARY: output rows = ${beforeRows ?? "?"} (≈${ROW_COUNT}, scales O(estimate_row_items) — every row item ` +
      `is scanned AND shipped back to the client for a JS fold). Root-node execution shared buffers: ` +
      `hit=${beforeBuffers.hit} read=${beforeBuffers.read} (the root Buffers line is the cumulative whole-query ` +
      `figure; the Planning Buffers line is excluded as cache-warmth noise, not data reads).`,
    "Run as the postgres superuser (RLS bypassed) so the plan reflects the raw read.",
    "",
    "----- EXPLAIN (ANALYZE, BUFFERS, VERBOSE) -----",
    "",
  ].join("\n");

  const afterHeader = [
    "P2 estimates-list aggregation change — AFTER (new aggregation RPC)",
    "=================================================================",
    "",
    `Seeded volume: ${ROW_COUNT} estimate_row_items under one estimate (one project, one estimate).`,
    "The new path is public.project_estimate_list_summaries(uuid), which aggregates",
    "node/row counts and total cost server-side and returns ONE row per estimate.",
    "",
    "We capture it two ways (see scripts/explain-estimate-list-summaries.mjs):",
    "  1) The function CALL the app actually issues:",
    `       EXPLAIN (ANALYZE, BUFFERS, VERBOSE)`,
    `       select * from public.project_estimate_list_summaries('${ids.project}');`,
    "     A bare SQL Function Scan is opaque — EXPLAIN does not expose the inner",
    "     aggregation scans, so its buffer total is not directly comparable to BEFORE.",
    "  2) The INLINED function body (the exact CTE the RPC runs), so EXPLAIN exposes",
    "     the real aggregation scans and their per-node execution buffers. The buffer",
    "     SUMMARY below is taken from this inlined plan — the true data-read comparison.",
    "",
    `SUMMARY: output rows = ${afterRows ?? "?"} (= 1 row per estimate, FLAT regardless of row-item volume — the ` +
      `${ROW_COUNT} rows are aggregated server-side and NEVER shipped to the client; this is the O(estimates) win). ` +
      `Root-node execution shared buffers (inlined body): hit=${afterBuffers.hit} read=${afterBuffers.read} — ` +
      `essentially the same data read as BEFORE (the row_items still get one seq scan to aggregate), and it stays ` +
      `flat per estimate. The change does not reduce DB-side buffer reads for a single estimate; it collapses the ` +
      `RESULT-SET size (and the network/JS-fold cost) from O(row_items) to O(estimates). ` +
      `Function-call form returned ${afterCallRows ?? "?"} row(s).`,
    "Run as the postgres superuser (RLS bypassed) so the plan reflects the raw read.",
    "",
    "===== (1) FUNCTION CALL — EXPLAIN (ANALYZE, BUFFERS, VERBOSE) =====",
    "(opaque Function Scan; shown for completeness — not the buffer figure cited above)",
    "",
    afterCallPlan,
    "",
    "===== (2) INLINED RPC BODY — EXPLAIN (ANALYZE, BUFFERS, VERBOSE) =====",
    "(the aggregation the RPC runs, inlined so per-node data-read buffers are visible)",
    "",
  ].join("\n");

  writeFileSync(beforePath, `${beforeHeader}${beforePlan}\n`);
  writeFileSync(afterPath, `${afterHeader}${afterPlan}\n`);

  // --- Console summary ---
  const beforeTotal = beforeBuffers.hit + beforeBuffers.read;
  const afterTotal = afterBuffers.hit + afterBuffers.read;
  const bufferDelta = beforeTotal - afterTotal;
  console.log("EXPLAIN evidence captured for the estimates-list aggregation change.");
  console.log(`Seeded: ${ROW_COUNT} estimate_row_items (one project, one estimate).`);
  console.log("Buffer figures are ROOT-NODE cumulative EXECUTION shared buffers (Planning excluded).");
  console.log("");
  console.log("                          | output rows | shared hit | shared read | total buffers");
  console.log(
    `  BEFORE (all-rows fetch)   | ${String(beforeRows ?? "?").padStart(11)} | ${String(beforeBuffers.hit).padStart(10)} | ${String(beforeBuffers.read).padStart(11)} | ${String(beforeTotal).padStart(13)}`,
  );
  console.log(
    `  AFTER  (RPC inlined body) | ${String(afterRows ?? "?").padStart(11)} | ${String(afterBuffers.hit).padStart(10)} | ${String(afterBuffers.read).padStart(11)} | ${String(afterTotal).padStart(13)}`,
  );
  console.log("");
  console.log(`HEADLINE: output rows ${beforeRows} -> ${afterRows} (O(estimate_row_items) collapses to O(estimates)=1).`);
  console.log(`          The result set / network / JS-fold cost drops from 5000 rows to 1; that is the win.`);
  console.log(`Root-node data buffers: ${beforeTotal} -> ${afterTotal} (delta ${bufferDelta}; ` +
    `${Math.abs(bufferDelta) <= 5 ? "essentially flat — the row_items still get one seq scan to aggregate" : (bufferDelta >= 0 ? "fewer AFTER" : "more AFTER")}).`);
  console.log(`Artifacts written:\n  ${beforePath}\n  ${afterPath}`);
  process.exitCode = 0;
} finally {
  cleanup();
}
