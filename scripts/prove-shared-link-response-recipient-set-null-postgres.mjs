#!/usr/bin/env node

// Local proof harness for AC-MOD-04: shared_link_responses.recipient_id SET NULL.
// Spins up a temp Postgres instance, builds a minimal shared-link schema matching
// production, applies the pending-review migration, then proves:
//   1) A response row survives hard-deletion of its recipient.
//   2) The retained row has recipient_id = NULL and keeps decision/note/snapshot_version.
//   3) The FK delete action is SET NULL ('n') after the migration.
// No secrets, provider URLs, or real identities are logged.

import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

const repoRoot = process.cwd();
const pgBin = process.env.POSTGRES_BIN_DIR ?? "/opt/homebrew/bin";
const initdb = join(pgBin, "initdb");
const pgCtl = join(pgBin, "pg_ctl");
const psql = join(pgBin, "psql");
const tempRoot = mkdtempSync(join(tmpdir(), "archestimator-shared-link-response-set-null-"));
const dataDir = join(tempRoot, "data");
const logFile = join(tempRoot, "postgres.log");
const port = String(58432 + Math.floor(Math.random() * 1000));
let serverStarted = false;

const ids = {
  workspace: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
  project: "a1000000-0000-4000-8000-000000000001",
  publication: "a1000000-0000-4000-8000-000000000002",
  recipient: "a1000000-0000-4000-8000-000000000003",
  response: "a1000000-0000-4000-8000-000000000004",
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

function scalar(sql) {
  const result = runPsql(sql);
  const lines = result.stdout.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  return lines[0] ?? null;
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
    create schema if not exists public;

    create type public.project_publication_status as enum ('published', 'expired', 'revoked');

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

    create table public.shared_link_responses (
      id uuid primary key,
      publication_id uuid not null references public.project_publications(id) on delete cascade,
      recipient_id uuid not null references public.shared_link_recipients(id) on delete cascade,
      decision text not null check (decision in ('accepted', 'declined', 'revision_requested')),
      note text check (char_length(note) <= 2000),
      snapshot_version_at_decision integer not null,
      created_at timestamptz not null default now()
    );

    create unique index shared_link_responses_recipient_publication_idx
      on public.shared_link_responses(recipient_id, publication_id);
  `);

  applySql(`
    insert into public.project_publications (id, workspace_id, project_id, token_hash, encrypted_token, status, snapshot_version, snapshot_json)
    values (
      ${quote(ids.publication)},
      ${quote(ids.workspace)},
      ${quote(ids.project)},
      'tok-hash-001',
      'enc-token-001',
      'published',
      1,
      '{}'::jsonb
    );

    insert into public.shared_link_recipients (id, publication_id, email, recipient_token_hash)
    values (
      ${quote(ids.recipient)},
      ${quote(ids.publication)},
      'client@example.com',
      'recipient-hash-001'
    );

    insert into public.shared_link_responses (id, publication_id, recipient_id, decision, note, snapshot_version_at_decision)
    values (
      ${quote(ids.response)},
      ${quote(ids.publication)},
      ${quote(ids.recipient)},
      'revision_requested',
      'Please revise the estimate.',
      3
    );
  `);

  const decisionsAtRiskBefore = scalar(`
    select count(*) as decisions_at_risk
    from public.shared_link_responses
    where recipient_id is not null;
  `);
  assert(decisionsAtRiskBefore === "1", `Expected 1 decision at risk before migration, got ${decisionsAtRiskBefore}`);

  const migrationSql = readFileSync(
    join(repoRoot, "supabase/migrations-pending-review/AC-MOD-04_shared_link_responses_recipient_set_null.sql"),
    "utf8",
  );
  applySql(migrationSql);

  applySql(`delete from public.shared_link_recipients where id = ${quote(ids.recipient)};`);

  const retainedResponse = runPsql(`
    select id, publication_id, recipient_id, decision, note, snapshot_version_at_decision
    from public.shared_link_responses
    where id = ${quote(ids.response)};
  `).stdout.split(/\r?\n/).map((line) => line.trim()).filter(Boolean)[0];

  assert(retainedResponse, "Response row was deleted; SET NULL did not preserve it.");
  const [retId, retPubId, retRecipientId, retDecision, retNote, retSnapshot] = retainedResponse.split("|");
  assert(retId === ids.response, "Retained row id mismatch.");
  assert(retPubId === ids.publication, "Retained publication_id mismatch.");
  assert(retRecipientId === "", `Expected recipient_id to be NULL, got '${retRecipientId}'`);
  assert(retDecision === "revision_requested", "Retained decision mismatch.");
  assert(retNote === "Please revise the estimate.", "Retained note mismatch.");
  assert(retSnapshot === "3", "Retained snapshot_version_at_decision mismatch.");

  const fkAction = scalar(`
    select confdeltype
    from pg_constraint
    where conrelid = 'public.shared_link_responses'::regclass
      and contype = 'f'
      and conname = 'shared_link_responses_recipient_id_fkey';
  `);
  assert(fkAction === "n", `Expected FK delete action 'n' (SET NULL), got '${fkAction}'`);

  const decisionsAtRiskAfter = scalar(`
    select count(*) as decisions_at_risk
    from public.shared_link_responses
    where recipient_id is not null;
  `);
  assert(decisionsAtRiskAfter === "0", `Expected 0 decisions at risk after recipient delete, got ${decisionsAtRiskAfter}`);

  console.log(JSON.stringify({
    ok: true,
    proof: "shared_link_responses_recipient_set_null",
    checks: [
      "pre-migration decisions_at_risk = 1",
      "response row survives recipient hard-delete",
      "surviving row has recipient_id = NULL",
      "decision, note, and snapshot_version_at_decision are preserved",
      "FK delete action is SET NULL (confdeltype = 'n')",
      "post-delete decisions_at_risk = 0",
    ],
  }, null, 2));
} finally {
  cleanup();
}
