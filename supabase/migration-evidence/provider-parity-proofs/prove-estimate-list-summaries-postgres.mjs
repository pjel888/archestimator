#!/usr/bin/env node

// Local Postgres prove-harness for public.project_estimate_list_summaries(uuid).
//
// Verifies that the aggregation RPC (supabase/migrations/
// 20260614161500_project_estimate_list_summaries_rpc.sql) returns counts/totals
// byte-identical to the JS oracle in src/lib/estimates/estimate-row-total.ts.
//
// Mirrors scripts/prove-estimate-tabs-postgres.mjs: spins up a temp PG instance,
// stubs auth/storage/realtime + auth.uid()/auth.role()/auth.jwt(), then applies
// ALL migrations in supabase/migrations sorted ascending (the RPC migration is the
// newest and MUST be applied — we do not stop before any target).
//
// We seed and call the RPC as the postgres superuser, which bypasses RLS for both
// inserts and the security-invoker RPC. That deliberately isolates ARITHMETIC
// parity (this harness) from RLS access (proven separately in
// prove-estimate-tabs-postgres.mjs).

import { existsSync, mkdtempSync, readFileSync, readdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

const repoRoot = process.cwd();
const pgBin = process.env.POSTGRES_BIN_DIR ?? "/opt/homebrew/opt/postgresql@17/bin";
const initdb = join(pgBin, "initdb");
const pgCtl = join(pgBin, "pg_ctl");
const psql = join(pgBin, "psql");
const tempRoot = mkdtempSync(join(tmpdir(), "archestimator-estimate-list-summaries-"));
const dataDir = join(tempRoot, "data");
const logFile = join(tempRoot, "postgres.log");
const port = String(57432 + Math.floor(Math.random() * 1000));
let serverStarted = false;

const ids = {
  userOwner: "11111111-1111-4111-8111-111111111111",
  workspace: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
  project: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
  // A second project that must NOT leak into the target project's summaries.
  otherProject: "b0b0b0b0-b0b0-4b0b-8b0b-b0b0b0b0b0b0",
  otherEstimate: "e0e0e0e0-e0e0-4e0e-8e0e-e0e0e0e0e0e0",
  otherRoot: "e1e1e1e1-e1e1-4e1e-8e1e-e1e1e1e1e1e1",
  otherArea: "e2e2e2e2-e2e2-4e2e-8e2e-e2e2e2e2e2e2",
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

// --- JS oracle (mirrors src/lib/estimates/estimate-row-total.ts byte-for-byte) ---
// subtotal    = quantity * unit_cost
// contingency = subtotal * contingency_percentage / 100
// line_total  = subtotal + misc_cost + contingency
function computeEstimateRowLineTotal(row) {
  const quantity = Number(row.quantity ?? 0);
  const unitCost = Number(row.unit_cost ?? 0);
  const contingencyPercentage = Number(row.contingency_percentage ?? 0);
  const miscCost = Number(row.misc_cost ?? 0);
  const subTotal = quantity * unitCost;
  return subTotal + miscCost + (subTotal * contingencyPercentage) / 100;
}

function sumEstimateRowLineTotals(rows) {
  return rows.reduce((total, row) => total + computeEstimateRowLineTotal(row), 0);
}

// Each scenario is one estimate with a valid tree: a root group + a child area
// (both seeded in a single transaction so the deferred tree trigger sees a valid
// tree at commit). Row items attach to the area node.
//
// NOTE ON THE "contingency=null" SCENARIO: estimate_row_items.contingency_percentage
// is `numeric(7,4) NOT NULL default 0` and was never relaxed to nullable, so the DB
// cannot store a literal NULL. We exercise the RPC's `coalesce(contingency_percentage, 0)`
// branch faithfully by OMITTING the column on insert (it defaults to 0) while the JS
// oracle is fed contingency_percentage: null — both sides must resolve to 0 and agree.
const scenarios = [
  {
    key: "zero-row",
    estimateId: "c0000000-0000-4000-8000-000000000001",
    rootNode: "d0000000-0000-4000-8000-000000000001",
    areaNode: "d0000000-0000-4000-8000-000000000002",
    name: "Zero-Row Estimate",
    sheetCode: "ES-001",
    rows: [], // group + area only, no row items
  },
  {
    key: "contingency-zero",
    estimateId: "c0000000-0000-4000-8000-000000000002",
    rootNode: "d0000000-0000-4000-8000-000000000003",
    areaNode: "d0000000-0000-4000-8000-000000000004",
    name: "Contingency Zero Estimate",
    sheetCode: "ES-002",
    rows: [
      { id: "f0000000-0000-4000-8000-000000000001", quantity: 2, unit_cost: 100, contingency_percentage: 0, misc_cost: 10 },
    ],
  },
  {
    key: "contingency-null",
    estimateId: "c0000000-0000-4000-8000-000000000003",
    rootNode: "d0000000-0000-4000-8000-000000000005",
    areaNode: "d0000000-0000-4000-8000-000000000006",
    name: "Contingency Null Estimate",
    sheetCode: "ES-003",
    rows: [
      // contingency_percentage omitted on insert (DB default 0); oracle fed null.
      { id: "f0000000-0000-4000-8000-000000000002", quantity: 3, unit_cost: 50, contingency_percentage: null, misc_cost: 5, omitContingency: true },
    ],
  },
  {
    key: "misc-only",
    estimateId: "c0000000-0000-4000-8000-000000000004",
    rootNode: "d0000000-0000-4000-8000-000000000007",
    areaNode: "d0000000-0000-4000-8000-000000000008",
    name: "Misc Only Estimate",
    sheetCode: "ES-004",
    rows: [
      // quantity=0 -> subtotal 0 -> total is misc_cost only.
      { id: "f0000000-0000-4000-8000-000000000003", quantity: 0, unit_cost: 0, contingency_percentage: 0, misc_cost: 25 },
      // unit_cost=0 -> subtotal 0 -> total is misc_cost only (contingency moot).
      { id: "f0000000-0000-4000-8000-000000000004", quantity: 7, unit_cost: 0, contingency_percentage: 15, misc_cost: 25 },
    ],
  },
  {
    key: "multi-row-mixed",
    estimateId: "c0000000-0000-4000-8000-000000000005",
    rootNode: "d0000000-0000-4000-8000-000000000009",
    areaNode: "d0000000-0000-4000-8000-00000000000a",
    name: "Multi Row Mixed Estimate",
    sheetCode: "ES-005",
    rows: [
      { id: "f0000000-0000-4000-8000-000000000005", quantity: 2.5, unit_cost: 120.75, contingency_percentage: 10, misc_cost: 12.5 },
      { id: "f0000000-0000-4000-8000-000000000006", quantity: 1, unit_cost: 999.99, contingency_percentage: 0, misc_cost: 0 },
      { id: "f0000000-0000-4000-8000-000000000007", quantity: 4, unit_cost: 33.33, contingency_percentage: 7.5, misc_cost: 100 },
      // contingency omitted (defaults 0); oracle fed null.
      { id: "f0000000-0000-4000-8000-000000000008", quantity: 10, unit_cost: 5, contingency_percentage: null, misc_cost: 0.01, omitContingency: true },
    ],
  },
];

function expectedNodeCount() {
  return 2; // every scenario seeds exactly a root group + a child area
}

function expectedRowCount(scenario) {
  return scenario.rows.length;
}

function expectedTotalCost(scenario) {
  return sumEstimateRowLineTotals(scenario.rows);
}

function parseRpcRow(line) {
  // psql -t -A delimits columns with '|'.
  const parts = line.split("|");
  return {
    estimate_id: (parts[0] ?? "").trim(),
    node_count: (parts[1] ?? "").trim(),
    row_count: (parts[2] ?? "").trim(),
    total_cost: (parts[3] ?? "").trim(),
    first_node_id: (parts[4] ?? "").trim(),
  };
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

  // Apply ALL migrations sorted ascending. The RPC migration is the newest and must
  // be included — do NOT stop before any target.
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

  // --- Seed workspace / membership / project (as superuser, bypassing RLS) ---
  runPsql(`
    insert into auth.users (id, email) values
      (${quote(ids.userOwner)}, 'owner@example.test')
    on conflict (id) do nothing;

    insert into public.workspaces (id, name, slug, created_by)
    values (${quote(ids.workspace)}, 'Summaries Harness', 'summaries-harness', ${quote(ids.userOwner)})
    on conflict (id) do nothing;

    insert into public.workspace_members (workspace_id, user_id, role) values
      (${quote(ids.workspace)}, ${quote(ids.userOwner)}, 'owner')
    on conflict (workspace_id, user_id) do update set role = excluded.role;

    insert into public.projects (id, workspace_id, name, client_name, project_code, currency_code, created_by)
    values
      (${quote(ids.project)}, ${quote(ids.workspace)}, 'Summaries Project', 'Harness Client', 'SUM', 'PHP', ${quote(ids.userOwner)}),
      (${quote(ids.otherProject)}, ${quote(ids.workspace)}, 'Other Project', 'Harness Client', 'OTH', 'PHP', ${quote(ids.userOwner)})
    on conflict (id) do nothing;
  `);

  // --- Seed each scenario estimate in its own transaction (valid tree at commit) ---
  for (const scenario of scenarios) {
    const rowInserts = scenario.rows
      .map((row, index) => {
        // Distinct sort_order per row — estimate_row_items_unique_sort is
        // unique (node_id, sort_order).
        const cols = ["id", "estimate_id", "node_id", "sort_order", "material", "description", "supplier", "unit", "quantity", "unit_cost", "misc_cost"];
        const vals = [
          quote(row.id),
          quote(scenario.estimateId),
          quote(scenario.areaNode),
          String(index),
          quote("Harness material"),
          quote("Harness row"),
          quote("Harness supplier"),
          quote("unit"),
          String(row.quantity),
          String(row.unit_cost),
          String(row.misc_cost),
        ];
        // Only set contingency_percentage when not exercising the omit/default path.
        if (!row.omitContingency) {
          cols.push("contingency_percentage");
          vals.push(String(row.contingency_percentage));
        }
        return `insert into public.estimate_row_items (${cols.join(", ")}) values (${vals.join(", ")});`;
      })
      .join("\n");

    runPsql(`
      begin;

      insert into public.estimates (id, project_id, name, sheet_code, currency_code, metadata, created_by)
      values (${quote(scenario.estimateId)}, ${quote(ids.project)}, ${quote(scenario.name)}, ${quote(scenario.sheetCode)}, 'PHP', '{}'::jsonb, ${quote(ids.userOwner)});

      -- Default tab for this estimate; estimate_nodes carry estimate_tab_id (composite
      -- FK to estimate_tabs(estimate_id, id)). Seed the tab BEFORE the nodes.
      insert into public.estimate_tabs (estimate_id, name, sort_order, is_default, created_by)
      values (${quote(scenario.estimateId)}, 'Default', 0, true, ${quote(ids.userOwner)});

      insert into public.estimate_nodes (id, estimate_id, estimate_tab_id, parent_id, kind, name, sort_order)
      select ${quote(scenario.rootNode)}, ${quote(scenario.estimateId)}, t.id, null, 'group', 'Root Group', 0
      from public.estimate_tabs t where t.estimate_id = ${quote(scenario.estimateId)} and t.is_default;

      insert into public.estimate_nodes (id, estimate_id, estimate_tab_id, parent_id, kind, name, sort_order)
      select ${quote(scenario.areaNode)}, ${quote(scenario.estimateId)}, t.id, ${quote(scenario.rootNode)}, 'area', 'Area', 0
      from public.estimate_tabs t where t.estimate_id = ${quote(scenario.estimateId)} and t.is_default;

      ${rowInserts}

      commit;
    `);
  }

  // --- Seed a SECOND project's estimate that must NOT leak into the target summary ---
  runPsql(`
    begin;

    insert into public.estimates (id, project_id, name, sheet_code, currency_code, metadata, created_by)
    values (${quote(ids.otherEstimate)}, ${quote(ids.otherProject)}, 'Other Estimate', 'ES-999', 'PHP', '{}'::jsonb, ${quote(ids.userOwner)});

    insert into public.estimate_tabs (estimate_id, name, sort_order, is_default, created_by)
    values (${quote(ids.otherEstimate)}, 'Default', 0, true, ${quote(ids.userOwner)});

    insert into public.estimate_nodes (id, estimate_id, estimate_tab_id, parent_id, kind, name, sort_order)
    select ${quote(ids.otherRoot)}, ${quote(ids.otherEstimate)}, t.id, null, 'group', 'Root Group', 0
    from public.estimate_tabs t where t.estimate_id = ${quote(ids.otherEstimate)} and t.is_default;

    insert into public.estimate_nodes (id, estimate_id, estimate_tab_id, parent_id, kind, name, sort_order)
    select ${quote(ids.otherArea)}, ${quote(ids.otherEstimate)}, t.id, ${quote(ids.otherRoot)}, 'area', 'Area', 0
    from public.estimate_tabs t where t.estimate_id = ${quote(ids.otherEstimate)} and t.is_default;

    insert into public.estimate_row_items (id, estimate_id, node_id, sort_order, material, description, supplier, unit, quantity, unit_cost, contingency_percentage, misc_cost)
    values ('f0000000-0000-4000-8000-0000000000ff', ${quote(ids.otherEstimate)}, ${quote(ids.otherArea)}, 0, 'm', 'd', 's', 'unit', 9, 9, 9, 9);

    commit;
  `);

  // --- Run the RPC once for the target project and parse all rows ---
  const rpcResult = runPsql(
    `select estimate_id, node_count, row_count, total_cost, first_node_id from public.project_estimate_list_summaries(${quote(ids.project)});`,
  );
  const rpcLines = rpcResult.stdout
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
  const rpcByEstimate = new Map();
  for (const line of rpcLines) {
    const parsed = parseRpcRow(line);
    if (rpcByEstimate.has(parsed.estimate_id)) {
      throw new Error(`RPC returned a DUPLICATE row for estimate ${parsed.estimate_id} (left joins must not fan out).`);
    }
    rpcByEstimate.set(parsed.estimate_id, parsed);
  }

  // Exactly one row per estimate in the project, and no others.
  if (rpcByEstimate.size !== scenarios.length) {
    throw new Error(
      `RPC returned ${rpcByEstimate.size} rows for the target project; expected exactly ${scenarios.length} (one per estimate, zero-row estimate must not be dropped).`,
    );
  }

  const EPSILON = 1e-6;
  const observed = [];

  for (const scenario of scenarios) {
    const actual = rpcByEstimate.get(scenario.estimateId);
    if (!actual) {
      throw new Error(`RPC did not return a row for ${scenario.key} (${scenario.estimateId}). Left joins must not drop the zero-row estimate.`);
    }

    const expNodes = expectedNodeCount();
    const expRows = expectedRowCount(scenario);
    const expTotal = expectedTotalCost(scenario);

    if (actual.node_count !== String(expNodes)) {
      throw new Error(`[${scenario.key}] node_count mismatch: RPC=${actual.node_count || "<empty>"} expected=${expNodes}`);
    }
    if (actual.row_count !== String(expRows)) {
      throw new Error(`[${scenario.key}] row_count mismatch: RPC=${actual.row_count || "<empty>"} expected=${expRows}`);
    }

    const actualTotal = Number(actual.total_cost);
    if (!Number.isFinite(actualTotal)) {
      throw new Error(`[${scenario.key}] total_cost not numeric: RPC=${actual.total_cost || "<empty>"}`);
    }
    if (Math.abs(actualTotal - expTotal) >= EPSILON) {
      throw new Error(
        `[${scenario.key}] total_cost mismatch: RPC=${actual.total_cost} (=${actualTotal}) expected=${expTotal} (|diff|=${Math.abs(actualTotal - expTotal)})`,
      );
    }

    // first_node_id is ALWAYS null by design (Path A). psql -t -A renders NULL as ''.
    if (actual.first_node_id !== "") {
      throw new Error(`[${scenario.key}] first_node_id expected NULL/empty but RPC=${actual.first_node_id}`);
    }

    observed.push({ ...scenario, actual, expTotal });
  }

  // Print exact per-estimate RPC output observed.
  console.log("Per-estimate RPC output (estimate_id | node_count | row_count | total_cost | first_node_id):");
  for (const row of observed) {
    const a = row.actual;
    console.log(
      `  [${row.key}] ${a.estimate_id} | ${a.node_count} | ${a.row_count} | ${a.total_cost || "0"} | ${a.first_node_id === "" ? "<null>" : a.first_node_id}  (oracle total=${row.expTotal})`,
    );
  }

  console.log(`PASS: ${scenarios.length} parity cases`);
} finally {
  cleanup();
}
