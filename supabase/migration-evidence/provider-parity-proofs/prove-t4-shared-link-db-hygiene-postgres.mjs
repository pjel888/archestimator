#!/usr/bin/env node

// Local proof harness for the AC-MOD-T4 shared-link DB hygiene split.
// Builds a minimal shared-link schema, applies each split unit in order, and
// asserts the expected objects/behavior. pg_cron schedules are commented out in
// the SQL files, so this harness proves only the DDL/additive units and the
// manual DELETE portions of the retention/GC units.

import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

const repoRoot = process.cwd();
const pgBin = process.env.POSTGRES_BIN_DIR ?? "/opt/homebrew/bin";
const initdb = join(pgBin, "initdb");
const pgCtl = join(pgBin, "pg_ctl");
const psql = join(pgBin, "psql");
const tempRoot = mkdtempSync(join(tmpdir(), "archestimator-t4-shared-link-db-hygiene-"));
const dataDir = join(tempRoot, "data");
const logFile = join(tempRoot, "postgres.log");
const port = String(58432 + Math.floor(Math.random() * 1000));
let serverStarted = false;

const ids = {
  workspace: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
  project: "a1000000-0000-4000-8000-000000000001",
  publication: "a1000000-0000-4000-8000-000000000002",
  recipient: "a1000000-0000-4000-8000-000000000003",
  user: "a1000000-0000-4000-8000-000000000004",
  nonManager: "a1000000-0000-4000-8000-000000000005",
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
    "-q",
    "-t",
    "-A",
    "-c", sql,
  ], options);
}

function applySqlFile(filePath, options = {}) {
  return run(psql, [
    "-h", "127.0.0.1",
    "-p", port,
    "-U", "postgres",
    "-d", "postgres",
    "-v", "ON_ERROR_STOP=1",
    "-q",
    "-f", filePath,
  ], options);
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

function scalar(sql) {
  const result = runPsql(sql);
  const lines = result.stdout.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  return lines[0] ?? null;
}

function rows(sql) {
  const result = runPsql(sql);
  return result.stdout.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function assertIndexExists(indexName) {
  const found = rows(`
    select indexname
    from pg_indexes
    where schemaname = 'public' and indexname = ${quote(indexName)};
  `);
  assert(found.length > 0, `Expected index ${indexName} to exist.`);
}

function assertIndexReadyAndValid(indexName) {
  const state = scalar(`
    select i.indisready::text || ',' || i.indisvalid::text
    from pg_class c
    join pg_index i on i.indexrelid = c.oid
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relname = ${quote(indexName)};
  `);
  assert(state === "true,true", `Expected index ${indexName} to be ready and valid, got ${state ?? "missing"}.`);
}

function assertIndexDoesNotExist(indexName) {
  const found = rows(`
    select indexname
    from pg_indexes
    where schemaname = 'public' and indexname = ${quote(indexName)};
  `);
  assert(found.length === 0, `Expected index ${indexName} to be dropped.`);
}

const unitFiles = {
  P3: join(repoRoot, "supabase/migrations-pending-review/AC-MOD-T4-P3_project_publication_events_manager_rls.sql"),
  P4: join(repoRoot, "supabase/migrations-pending-review/AC-MOD-T4-P4_shared_link_comments_public_feed_index.sql"),
  P5: join(repoRoot, "supabase/migrations-pending-review/AC-MOD-T4-P5_fk_covering_indexes.sql"),
  P6: join(repoRoot, "supabase/migrations-pending-review/AC-MOD-T4-P6_snapshot_size_guardrail.sql"),
  P1: join(repoRoot, "supabase/migrations-pending-review/AC-MOD-T4-P1_shared_link_telemetry_retention.sql"),
  P7: join(repoRoot, "supabase/migrations-pending-review/AC-MOD-T4-P7_security_rate_limit_gc.sql"),
  P2: join(repoRoot, "supabase/migrations-pending-review/AC-MOD-T4-P2_drop_redundant_token_hash_indexes.sql"),
};

for (const [name, path] of Object.entries(unitFiles)) {
  if (!existsSync(path)) throw new Error(`Missing T4 unit file ${name}: ${path}`);
}

try {
  [initdb, pgCtl, psql].forEach(requireBinary);

  run(initdb, ["-D", dataDir, "-A", "trust", "-U", "postgres", "--no-locale"]);
  run(pgCtl, ["-D", dataDir, "-l", logFile, "-o", `-p ${port} -c listen_addresses=127.0.0.1`, "-w", "start"]);
  serverStarted = true;

  applySqlFile(join(repoRoot, "scripts/sql/prove-t4-shared-link-schema.sql"), { expectFailure: true });
} catch {
  // The shared schema bootstrap file does not exist; build inline instead.
}

runPsql(`
  create schema if not exists public;

  create type public.project_publication_status as enum ('published', 'expired', 'revoked');
  create type public.project_publication_event_type as enum ('open', 'password_success', 'password_failure', 'download_attempt_blocked');

  create table public.project_publications (
    id uuid primary key,
    workspace_id uuid not null,
    project_id uuid not null,
    token_hash text not null unique,
    encrypted_token text not null,
    password_hash text,
    status public.project_publication_status not null default 'published',
    snapshot_version integer not null default 1 check (snapshot_version >= 1),
    selected_estimate_ids uuid[] not null default '{}'::uuid[],
    snapshot_json jsonb not null default '{}'::jsonb,
    published_by uuid,
    published_at timestamptz not null default now(),
    expires_at timestamptz,
    revoked_at timestamptz,
    open_count integer not null default 0 check (open_count >= 0),
    latest_opened_at timestamptz,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
  );

  create table public.project_publication_events (
    id uuid primary key default gen_random_uuid(),
    publication_id uuid not null references public.project_publications(id) on delete cascade,
    event_type public.project_publication_event_type not null,
    metadata_json jsonb not null default '{}'::jsonb,
    ip_hash text,
    user_agent_hash text,
    created_at timestamptz not null default now()
  );

  create table public.shared_link_recipients (
    id uuid primary key,
    publication_id uuid not null references public.project_publications(id) on delete cascade,
    email text not null,
    display_name text,
    invited_by uuid,
    invited_at timestamptz not null default now(),
    recipient_token_hash text not null unique,
    delivery_status text not null default 'pending'
      check (delivery_status in ('pending', 'sent', 'bounced', 'opened', 'responded')),
    last_opened_at timestamptz,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
  );

  create table public.shared_link_comments (
    id uuid primary key default gen_random_uuid(),
    publication_id uuid not null references public.project_publications(id) on delete cascade,
    recipient_id uuid references public.shared_link_recipients(id) on delete set null,
    author_email text not null,
    author_name text,
    estimate_id uuid,
    row_id uuid,
    body text not null check (char_length(body) <= 1000),
    is_internal boolean not null default false,
    created_at timestamptz not null default now()
  );

  create table public.shared_link_events (
    id uuid primary key default gen_random_uuid(),
    publication_id uuid not null references public.project_publications(id) on delete cascade,
    recipient_id uuid references public.shared_link_recipients(id) on delete set null,
    event_type text not null check (event_type in ('open', 'comment_add', 'accept_decision', 'decline_decision', 'password_attempt')),
    metadata_json jsonb not null default '{}'::jsonb,
    ip_hash text,
    user_agent_hash text,
    created_at timestamptz not null default now()
  );

  create table public.security_rate_limit_events (
    id uuid primary key default gen_random_uuid(),
    scope text not null,
    key_hash text not null,
    metadata_json jsonb not null default '{}'::jsonb,
    occurred_at timestamptz not null default now(),
    expires_at timestamptz not null
  );

  -- Roles referenced by T4 policies.
  create role authenticated;
  create role service_role;

  -- Stub the manager-check function used by P3.
  create or replace function public.can_manage_project_publication(target_project_id uuid)
  returns boolean
  language sql
  stable
  as $$ select current_setting('request.jwt.claim.sub', true) = '${ids.user}' $$;
  grant execute on function public.can_manage_project_publication(uuid) to authenticated;
  grant select on table public.project_publications to authenticated;

  -- Redundant plain indexes that P2 will drop (production mirrors these).
  create index project_publications_token_hash_idx on public.project_publications (token_hash);
  create index shared_link_recipients_token_hash_idx on public.shared_link_recipients (recipient_token_hash);

  alter table public.project_publication_events enable row level security;

  insert into public.project_publications (id, workspace_id, project_id, token_hash, encrypted_token, snapshot_json)
  values (
    ${quote(ids.publication)},
    ${quote(ids.workspace)},
    ${quote(ids.project)},
    'tok-hash-001',
    'enc-token-001',
    '{"estimates":[]}'::jsonb
  );

  insert into public.shared_link_recipients (id, publication_id, email, invited_by, recipient_token_hash)
  values (
    ${quote(ids.recipient)},
    ${quote(ids.publication)},
    'client@example.com',
    ${quote(ids.user)},
    'recipient-hash-001'
  );

  -- Old telemetry rows that P1 should prune.
  insert into public.project_publication_events (publication_id, event_type, created_at)
  values (${quote(ids.publication)}, 'open', now() - interval '200 days');
  insert into public.shared_link_events (publication_id, event_type, created_at)
  values (${quote(ids.publication)}, 'open', now() - interval '200 days');

  -- P7 prunes by expires_at, not by occurred_at recency.
  insert into public.security_rate_limit_events (scope, key_hash, occurred_at, expires_at)
  values ('shared_link_recipient_resend', 'hash-expired-recent', now(), now() - interval '1 minute');

  -- P7 keeps unexpired rows even if they were first observed earlier.
  insert into public.security_rate_limit_events (scope, key_hash, occurred_at, expires_at)
  values ('shared_link_recipient_resend', 'hash-active-old', now() - interval '48 hours', now() + interval '1 hour');
`);

try {
  // P3
  applySqlFile(unitFiles.P3);
  const p3Policy = scalar(`
    select polname
    from pg_policy
    where polrelid = 'public.project_publication_events'::regclass
      and polname = 'project publication managers can read publication events';
  `);
  assert(p3Policy === "project publication managers can read publication events", "P3 policy missing.");
  const p3Grant = scalar(`
    select has_table_privilege('authenticated', 'public.project_publication_events', 'SELECT')::text;
  `);
  assert(p3Grant === "true", "P3 SELECT grant for authenticated missing.");
  const p3ManagerVisible = scalar(`
    begin;
    set local role authenticated;
    set local "request.jwt.claim.sub" = ${quote(ids.user)};
    select count(*)::text from public.project_publication_events;
    rollback;
  `);
  assert(p3ManagerVisible === "1", "P3 manager read did not expose publication event.");
  const p3NonManagerVisible = scalar(`
    begin;
    set local role authenticated;
    set local "request.jwt.claim.sub" = ${quote(ids.nonManager)};
    select count(*)::text from public.project_publication_events;
    rollback;
  `);
  assert(p3NonManagerVisible === "0", "P3 non-manager read exposed publication event.");

  // P4
  applySqlFile(unitFiles.P4);
  assertIndexExists("shared_link_comments_public_feed_idx");
  const p4Def = scalar(`
    select indexdef from pg_indexes
    where schemaname = 'public' and indexname = 'shared_link_comments_public_feed_idx';
  `);
  assert(p4Def.includes("is_internal = false"), "P4 index predicate mismatch.");

  // P5
  applySqlFile(unitFiles.P5);
  assertIndexExists("project_publications_published_by_idx");
  assertIndexExists("project_publications_workspace_idx");
  assertIndexExists("shared_link_events_recipient_idx");
  assertIndexExists("shared_link_recipients_invited_by_idx");
  assertIndexReadyAndValid("project_publications_published_by_idx");
  assertIndexReadyAndValid("project_publications_workspace_idx");
  assertIndexReadyAndValid("shared_link_events_recipient_idx");
  assertIndexReadyAndValid("shared_link_recipients_invited_by_idx");

  // P6
  applySqlFile(unitFiles.P6);
  const p6Col = scalar(`
    select column_name
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'project_publications'
      and column_name = 'snapshot_size_bytes';
  `);
  assert(p6Col === "snapshot_size_bytes", "P6 generated column missing.");
  const p6Size = scalar(`
    select snapshot_size_bytes from public.project_publications where id = ${quote(ids.publication)};
  `);
  assert(Number(p6Size) > 0, "P6 generated size should be positive for non-empty snapshot_json.");

  // P1
  applySqlFile(unitFiles.P1);
  const p1PubStale = scalar(`
    select count(*) from public.project_publication_events where created_at < now() - interval '180 days';
  `);
  const p1SharedStale = scalar(`
    select count(*) from public.shared_link_events where created_at < now() - interval '180 days';
  `);
  assert(p1PubStale === "0", "P1 did not prune old project_publication_events.");
  assert(p1SharedStale === "0", "P1 did not prune old shared_link_events.");

  // P7
  applySqlFile(unitFiles.P7);
  const p7Expired = scalar(`
    select count(*) from public.security_rate_limit_events where expires_at < now();
  `);
  const p7Remaining = scalar(`
    select count(*) from public.security_rate_limit_events;
  `);
  const p7ActiveOld = scalar(`
    select count(*) from public.security_rate_limit_events where key_hash = 'hash-active-old';
  `);
  assert(p7Expired === "0", "P7 did not prune expired security_rate_limit_events.");
  assert(p7Remaining === "1", "P7 should keep the unexpired security_rate_limit_events row.");
  assert(p7ActiveOld === "1", "P7 should keep rows that are unexpired even when occurred_at is old.");

  // P2
  const p2Preflight = rows(`
    select indexrelname || '=' || idx_scan
    from pg_stat_user_indexes
    where indexrelname in ('project_publications_token_hash_idx', 'shared_link_recipients_token_hash_idx');
  `);
  assert(p2Preflight.length === 2, "P2 preflight indexes missing.");
  assert(p2Preflight.every((row) => row.endsWith("=0")), `P2 preflight must show zero scans: ${p2Preflight.join(", ")}`);
  applySqlFile(unitFiles.P2);
  assertIndexDoesNotExist("project_publications_token_hash_idx");
  assertIndexDoesNotExist("shared_link_recipients_token_hash_idx");
  // Unique indexes must survive.
  assertIndexExists("project_publications_token_hash_key");
  assertIndexExists("shared_link_recipients_recipient_token_hash_key");

  console.log(JSON.stringify({
    ok: true,
    proof: "t4_shared_link_db_hygiene",
    checks: [
      "P3 manager-read RLS policy exists on project_publication_events",
      "P3 authenticated SELECT grant exists and RLS allows only managers",
      "P4 public-feed partial index exists with is_internal = false predicate",
      "P5 FK covering indexes created and marked ready/valid",
      "P6 snapshot_size_bytes generated column tracks snapshot_json size",
      "P1 prunes project_publication_events and shared_link_events older than 180 days",
      "P7 prunes expired security_rate_limit_events by expires_at while keeping unexpired rows",
      "P2 drops redundant token-hash indexes only after zero-scan preflight",
      "Unique token-hash indexes survive P2 drops",
    ],
  }, null, 2));
} finally {
  cleanup();
}
