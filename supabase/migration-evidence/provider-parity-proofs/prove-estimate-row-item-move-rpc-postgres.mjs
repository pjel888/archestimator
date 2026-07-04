#!/usr/bin/env node

import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

const repoRoot = process.cwd();
const tempRoot = mkdtempSync(join(tmpdir(), "archestimator-row-move-rpc-"));
const dataDir = join(tempRoot, "data");
const logFile = join(tempRoot, "postgres.log");
const port = String(56600 + Math.floor(Math.random() * 600));
const targetMigration = "supabase/migrations/20260627090000_estimate_row_item_move_rpc.sql";
let serverStarted = false;

const ids = {
  owner: "11111111-1111-4111-8111-111111111111",
  viewer: "22222222-2222-4222-8222-222222222222",
  workspace: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
  project: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
  estimate: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
  tab: "dddddddd-dddd-4ddd-8ddd-dddddddddddd",
  otherTab: "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee",
  sourceNode: "10000000-0000-4000-8000-000000000001",
  targetNode: "10000000-0000-4000-8000-000000000002",
  otherTabNode: "10000000-0000-4000-8000-000000000003",
  rowA: "20000000-0000-4000-8000-000000000001",
  rowB: "20000000-0000-4000-8000-000000000002",
  rowC: "20000000-0000-4000-8000-000000000003",
  rowX: "20000000-0000-4000-8000-000000000004",
  rowY: "20000000-0000-4000-8000-000000000005",
  corrCrossNode: "30000000-0000-4000-8000-000000000001",
  corrStale: "30000000-0000-4000-8000-000000000002",
  corrDenseRollback: "30000000-0000-4000-8000-000000000003",
  corrSameNode: "30000000-0000-4000-8000-000000000004",
  corrViewer: "30000000-0000-4000-8000-000000000005",
  corrAnon: "30000000-0000-4000-8000-000000000006",
  corrCrossTab: "30000000-0000-4000-8000-000000000007",
};

const checks = [];

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: repoRoot,
    encoding: "utf8",
    env: process.env,
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

function pgArgs(extra) {
  return [
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
    ...extra,
  ];
}

function runPsql(sql, options = {}) {
  return run("psql", pgArgs(["-q", "-t", "-A", "-c", sql]), options);
}

function applySqlFile(path) {
  return run("psql", pgArgs(["-q", "-f", path]));
}

function quote(value) {
  return `'${String(value).replaceAll("'", "''")}'`;
}

function jsonQuote(value) {
  return quote(JSON.stringify(value));
}

function record(label) {
  checks.push(label);
}

function cleanup() {
  if (serverStarted) {
    run("pg_ctl", ["-D", dataDir, "-m", "fast", "-w", "stop"], { stdio: "pipe" });
  }
  rmSync(tempRoot, { recursive: true, force: true });
}

function requireCommand(command) {
  const result = spawnSync("sh", ["-lc", `command -v ${command}`], {
    encoding: "utf8",
  });
  if (result.status !== 0) {
    throw new Error(`Missing required command: ${command}`);
  }
}

function setupMinimalSchema() {
  runPsql(`
    create extension if not exists pgcrypto;
    create schema if not exists auth;
    create role anon nologin;
    create role authenticated nologin;

    create or replace function auth.uid()
    returns uuid
    language sql
    stable
    as $$
      select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid;
    $$;

    create table public.estimates (
      id uuid primary key,
      project_id uuid not null,
      workspace_id uuid not null
    );

    create table public.estimate_editors (
      project_id uuid not null,
      user_id uuid not null,
      can_edit boolean not null default false,
      primary key (project_id, user_id)
    );

    create table public.estimate_nodes (
      id uuid primary key,
      estimate_id uuid not null references public.estimates(id) on delete cascade,
      estimate_tab_id uuid not null
    );

    create table public.estimate_row_items (
      id uuid primary key,
      estimate_id uuid not null references public.estimates(id) on delete cascade,
      node_id uuid not null references public.estimate_nodes(id) on delete cascade,
      sort_order integer not null,
      row_revision integer not null default 1,
      label text not null,
      constraint estimate_row_items_unique_sort unique (node_id, sort_order) deferrable initially deferred
    );

    create table public.estimate_sheet_events (
      id uuid primary key default gen_random_uuid(),
      estimate_id uuid not null,
      workspace_id uuid not null,
      estimate_tab_id uuid,
      estimate_node_id uuid,
      target_row_id uuid,
      event_type text not null,
      event_source text not null,
      correlation_id uuid not null,
      actor_user_id uuid not null,
      row_context jsonb not null default '{}'::jsonb,
      old_snapshot jsonb not null default '{}'::jsonb,
      new_snapshot jsonb not null default '{}'::jsonb,
      changed_fields text[] not null default '{}',
      total_delta numeric not null default 0,
      payload jsonb not null default '{}'::jsonb,
      created_at timestamptz not null default now(),
      unique (estimate_id, correlation_id)
    );

    create or replace function public.assert_can_edit_estimate_for_history(
      target_project_id uuid,
      target_estimate_id uuid,
      actor_user_id uuid
    )
    returns uuid
    language plpgsql
    stable
    security definer
    set search_path = public
    as $$
    declare
      resolved_workspace_id uuid;
    begin
      select estimate.workspace_id
        into resolved_workspace_id
      from public.estimates estimate
      join public.estimate_editors editor
        on editor.project_id = estimate.project_id
       and editor.user_id = actor_user_id
       and editor.can_edit
      where estimate.id = target_estimate_id
        and estimate.project_id = target_project_id;

      if resolved_workspace_id is null then
        raise exception 'Estimate edit access denied.' using errcode = '42501';
      end if;

      return resolved_workspace_id;
    end;
    $$;

    create or replace function public.estimate_sheet_event_result(
      target_estimate_id uuid,
      target_correlation_id uuid
    )
    returns jsonb
    language sql
    stable
    as $$
      select jsonb_build_object(
        'idempotent', true,
        'eventId', event.id,
        'payload', event.payload
      )
      from public.estimate_sheet_events event
      where event.estimate_id = target_estimate_id
        and event.correlation_id = target_correlation_id
      limit 1;
    $$;

    create or replace function public.estimate_row_item_snapshot(row_item public.estimate_row_items)
    returns jsonb
    language sql
    stable
    as $$
      select jsonb_build_object(
        'rowId', row_item.id,
        'nodeId', row_item.node_id,
        'sortOrder', row_item.sort_order,
        'rowRevision', row_item.row_revision,
        'label', row_item.label
      );
    $$;

    create or replace function public.estimate_row_context(row_item public.estimate_row_items)
    returns jsonb
    language sql
    stable
    as $$
      select jsonb_build_object(
        'rowId', row_item.id,
        'nodeId', row_item.node_id,
        'sortOrder', row_item.sort_order
      );
    $$;

    grant usage on schema public to anon, authenticated;
  `);
}

function seedData() {
  runPsql(`
    insert into public.estimates(id, project_id, workspace_id)
    values (${quote(ids.estimate)}, ${quote(ids.project)}, ${quote(ids.workspace)});

    insert into public.estimate_editors(project_id, user_id, can_edit)
    values (${quote(ids.project)}, ${quote(ids.owner)}, true);

    insert into public.estimate_nodes(id, estimate_id, estimate_tab_id)
    values
      (${quote(ids.sourceNode)}, ${quote(ids.estimate)}, ${quote(ids.tab)}),
      (${quote(ids.targetNode)}, ${quote(ids.estimate)}, ${quote(ids.tab)}),
      (${quote(ids.otherTabNode)}, ${quote(ids.estimate)}, ${quote(ids.otherTab)});

    insert into public.estimate_row_items(id, estimate_id, node_id, sort_order, row_revision, label)
    values
      (${quote(ids.rowA)}, ${quote(ids.estimate)}, ${quote(ids.sourceNode)}, 0, 1, 'A'),
      (${quote(ids.rowB)}, ${quote(ids.estimate)}, ${quote(ids.sourceNode)}, 1, 1, 'B'),
      (${quote(ids.rowC)}, ${quote(ids.estimate)}, ${quote(ids.sourceNode)}, 2, 1, 'C'),
      (${quote(ids.rowX)}, ${quote(ids.estimate)}, ${quote(ids.targetNode)}, 0, 1, 'X'),
      (${quote(ids.rowY)}, ${quote(ids.estimate)}, ${quote(ids.targetNode)}, 1, 1, 'Y');
  `);
}

function moveSql({ updates, movedRowId, sourceNodeId, targetNodeId, correlationId }) {
  return `
    select public.move_estimate_row_item_with_history(
      ${quote(ids.project)}::uuid,
      ${quote(ids.estimate)}::uuid,
      ${quote(ids.tab)}::uuid,
      ${jsonQuote(updates)}::jsonb,
      ${quote(movedRowId)}::uuid,
      ${quote(sourceNodeId)}::uuid,
      ${quote(targetNodeId)}::uuid,
      ${quote(correlationId)}::uuid
    )::text;
  `;
}

function asAuthenticatedSql(userId, sql) {
  return `
    begin;
    set local role authenticated;
    set local "request.jwt.claim.sub" = ${quote(userId)};
    ${sql}
    commit;
  `;
}

function asAnonSql(sql) {
  return `
    begin;
    set local role anon;
    set local "request.jwt.claim.sub" = ${quote(ids.owner)};
    ${sql}
    commit;
  `;
}

function callMove(userId, args) {
  const result = runPsql(asAuthenticatedSql(userId, moveSql(args)));
  const lines = result.stdout.trim().split(/\n/).filter(Boolean);
  return JSON.parse(lines.at(-1));
}

function expectFailure(sql, expectedSnippet, label) {
  const result = runPsql(sql, { expectFailure: true });
  const output = `${result.stdout}\n${result.stderr}`;
  if (!output.includes(expectedSnippet)) {
    throw new Error(`${label}: expected failure containing ${expectedSnippet}, received:\n${output}`);
  }
  record(label);
}

function assertSql(sql, label) {
  runPsql(`
    do $$
    begin
      if not (${sql}) then
        raise exception ${quote(`${label} failed`)};
      end if;
    end;
    $$;
  `);
  record(label);
}

function assertResult(condition, label) {
  if (!condition) throw new Error(`${label} failed`);
  record(label);
}

try {
  ["initdb", "pg_ctl", "psql"].forEach(requireCommand);
  if (!existsSync(targetMigration)) throw new Error(`Missing migration: ${targetMigration}`);

  run("initdb", ["-D", dataDir, "-A", "trust", "-U", "postgres", "--no-locale"]);
  run("pg_ctl", ["-D", dataDir, "-l", logFile, "-o", `-p ${port} -c listen_addresses=127.0.0.1`, "-w", "start"]);
  serverStarted = true;

  setupMinimalSchema();
  applySqlFile(targetMigration);
  record("migration applies to a real PostgreSQL database");

  assertSql(
    `has_function_privilege('authenticated', 'public.move_estimate_row_item_with_history(uuid,uuid,uuid,jsonb,uuid,uuid,uuid,uuid)', 'execute')
     and not has_function_privilege('anon', 'public.move_estimate_row_item_with_history(uuid,uuid,uuid,jsonb,uuid,uuid,uuid,uuid)', 'execute')`,
    "function grants authenticated execute and denies anon"
  );

  seedData();

  const crossNodeUpdates = [
    { rowId: ids.rowB, nodeId: ids.targetNode, sortOrder: 1, expectedRowRevision: 1 },
    { rowId: ids.rowC, nodeId: ids.sourceNode, sortOrder: 1, expectedRowRevision: 1 },
    { rowId: ids.rowY, nodeId: ids.targetNode, sortOrder: 2, expectedRowRevision: 1 },
  ];

  expectFailure(
    asAnonSql(moveSql({
      updates: crossNodeUpdates,
      movedRowId: ids.rowB,
      sourceNodeId: ids.sourceNode,
      targetNodeId: ids.targetNode,
      correlationId: ids.corrAnon,
    })),
    "permission denied for function",
    "anon cannot execute row move RPC"
  );

  expectFailure(
    asAuthenticatedSql(ids.viewer, moveSql({
      updates: crossNodeUpdates,
      movedRowId: ids.rowB,
      sourceNodeId: ids.sourceNode,
      targetNodeId: ids.targetNode,
      correlationId: ids.corrViewer,
    })),
    "Estimate edit access denied",
    "non-editor authenticated user is rejected"
  );

  const crossNodeResult = callMove(ids.owner, {
    updates: crossNodeUpdates,
    movedRowId: ids.rowB,
    sourceNodeId: ids.sourceNode,
    targetNodeId: ids.targetNode,
    correlationId: ids.corrCrossNode,
  });
  assertResult(crossNodeResult.idempotent === false, "cross-node move is non-idempotent on first call");
  assertResult(crossNodeResult.updatedRowCount === 3, "cross-node move reports changed row count");
  assertResult(Array.isArray(crossNodeResult.rows) && crossNodeResult.rows.length === 5, "cross-node move returns full affected sibling rows");
  assertSql(
    `(select string_agg(label || ':' || sort_order || ':' || row_revision, ',' order by sort_order)
      from public.estimate_row_items
      where node_id = ${quote(ids.sourceNode)}::uuid) = 'A:0:1,C:1:2'
     and
     (select string_agg(label || ':' || sort_order || ':' || row_revision, ',' order by sort_order)
      from public.estimate_row_items
      where node_id = ${quote(ids.targetNode)}::uuid) = 'X:0:1,B:1:2,Y:2:2'`,
    "cross-node move produces dense order and increments changed revisions"
  );

  const retryResult = callMove(ids.owner, {
    updates: crossNodeUpdates,
    movedRowId: ids.rowB,
    sourceNodeId: ids.sourceNode,
    targetNodeId: ids.targetNode,
    correlationId: ids.corrCrossNode,
  });
  assertResult(retryResult.idempotent === true, "correlation retry is idempotent");
  assertResult(retryResult.updatedRowCount === 3, "idempotent retry preserves original updated row count");
  assertResult(Array.isArray(retryResult.rows) && retryResult.rows.length === 5, "idempotent retry returns full affected sibling rows");
  assertSql(`(select count(*) from public.estimate_sheet_events) = 1`, "idempotent retry does not create a second event");

  expectFailure(
    asAuthenticatedSql(ids.owner, moveSql({
      updates: [
        { rowId: ids.rowB, nodeId: ids.sourceNode, sortOrder: 1, expectedRowRevision: 1 },
        { rowId: ids.rowC, nodeId: ids.sourceNode, sortOrder: 2, expectedRowRevision: 2 },
        { rowId: ids.rowY, nodeId: ids.targetNode, sortOrder: 1, expectedRowRevision: 2 },
      ],
      movedRowId: ids.rowB,
      sourceNodeId: ids.targetNode,
      targetNodeId: ids.sourceNode,
      correlationId: ids.corrStale,
    })),
    "estimate_sheet_row_revision_conflict",
    "stale expected row revision is rejected"
  );

  expectFailure(
    asAuthenticatedSql(ids.owner, moveSql({
      updates: [
        { rowId: ids.rowB, nodeId: ids.otherTabNode, sortOrder: 0, expectedRowRevision: 2 },
        { rowId: ids.rowX, nodeId: ids.targetNode, sortOrder: 0, expectedRowRevision: 1 },
        { rowId: ids.rowY, nodeId: ids.targetNode, sortOrder: 1, expectedRowRevision: 2 },
      ],
      movedRowId: ids.rowB,
      sourceNodeId: ids.targetNode,
      targetNodeId: ids.otherTabNode,
      correlationId: ids.corrCrossTab,
    })),
    "Cross-tab row reorganization is not supported",
    "cross-tab target is rejected"
  );

  expectFailure(
    asAuthenticatedSql(ids.owner, moveSql({
      updates: [
        { rowId: ids.rowB, nodeId: ids.sourceNode, sortOrder: 0, expectedRowRevision: 2 },
      ],
      movedRowId: ids.rowB,
      sourceNodeId: ids.targetNode,
      targetNodeId: ids.sourceNode,
      correlationId: ids.corrDenseRollback,
    })),
    "Row reorganization updates must produce dense sibling order",
    "invalid dense order rolls back"
  );
  assertSql(
    `(select string_agg(label || ':' || sort_order || ':' || row_revision, ',' order by node_id, sort_order)
      from public.estimate_row_items) = 'A:0:1,C:1:2,X:0:1,B:1:2,Y:2:2'
     and (select count(*) from public.estimate_sheet_events) = 1`,
    "failed dense-order move leaves rows and history unchanged"
  );

  const sameNodeResult = callMove(ids.owner, {
    updates: [
      { rowId: ids.rowB, nodeId: ids.targetNode, sortOrder: 0, expectedRowRevision: 2 },
      { rowId: ids.rowX, nodeId: ids.targetNode, sortOrder: 1, expectedRowRevision: 1 },
    ],
    movedRowId: ids.rowB,
    sourceNodeId: ids.targetNode,
    targetNodeId: ids.targetNode,
    correlationId: ids.corrSameNode,
  });
  assertResult(sameNodeResult.updatedRowCount === 2, "same-node reorder reports changed row count");
  assertSql(
    `(select string_agg(label || ':' || sort_order || ':' || row_revision, ',' order by sort_order)
      from public.estimate_row_items
      where node_id = ${quote(ids.targetNode)}::uuid) = 'B:0:3,X:1:2,Y:2:2'
     and (select count(*) from public.estimate_sheet_events where event_type = 'row_reorganized') = 2`,
    "same-node reorder succeeds through deferrable unique sort constraint"
  );

  console.log(JSON.stringify({
    mode: "estimate-row-item-move-rpc-postgres-proof",
    migration: targetMigration,
    checks,
  }, null, 2));
} finally {
  cleanup();
}
