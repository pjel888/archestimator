#!/usr/bin/env node

import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

const repoRoot = process.cwd();
const pgBin = process.env.POSTGRES_BIN_DIR ?? "/opt/homebrew/opt/postgresql@16/bin";
const initdb = join(pgBin, "initdb");
const pgCtl = join(pgBin, "pg_ctl");
const psql = join(pgBin, "psql");
const tempRoot = mkdtempSync(join(tmpdir(), "archestimator-notification-rls-"));
const dataDir = join(tempRoot, "data");
const logFile = join(tempRoot, "postgres.log");
const port = String(55432 + Math.floor(Math.random() * 1000));
let serverStarted = false;

const ids = {
  userA: "11111111-1111-4111-8111-111111111111",
  userB: "22222222-2222-4222-8222-222222222222",
  definitionA: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
  definitionB: "dddddddd-dddd-4ddd-8ddd-dddddddddddd",
  deliveryA: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
  deliveryB: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
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

try {
  [initdb, pgCtl, psql].forEach(requireBinary);

  run(initdb, ["-D", dataDir, "-A", "trust", "-U", "postgres", "--no-locale"]);
  run(pgCtl, ["-D", dataDir, "-l", logFile, "-o", `-p ${port} -c listen_addresses=127.0.0.1`, "-w", "start"]);
  serverStarted = true;

  const bootstrapSql = `
    create extension if not exists pgcrypto;
    create schema if not exists auth;
    create role anon nologin;
    create role authenticated nologin;
    create role service_role nologin bypassrls;

    create table auth.users (
      id uuid primary key,
      email text
    );

    create table public.workspaces (id uuid primary key);
    create table public.projects (id uuid primary key);
    create table public.estimates (id uuid primary key);
    create table public.profiles (
      id uuid primary key references auth.users(id) on delete cascade,
      email text not null
    );

    create or replace function auth.uid()
    returns uuid
    language sql
    stable
    as $$
      select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid;
    $$;

    create or replace function public.set_updated_at()
    returns trigger
    language plpgsql
    as $$
    begin
      new.updated_at = now();
      return new;
    end;
    $$;
  `;
  runPsql(bootstrapSql);

  const migration = readFileSync(join(repoRoot, "supabase/migrations/20260606090000_notification_system.sql"), "utf8");
  const migrationPath = join(tempRoot, "notification-system.sql");
  writeFileSync(migrationPath, migration);
  run(psql, [
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
    migrationPath,
  ]);

  runPsql(`
    insert into auth.users (id, email) values
      (${quote(ids.userA)}, 'notification-user-a@example.invalid'),
      (${quote(ids.userB)}, 'notification-user-b@example.invalid');

    insert into public.profiles (id, email) values
      (${quote(ids.userA)}, 'notification-user-a@example.invalid'),
      (${quote(ids.userB)}, 'notification-user-b@example.invalid');

    insert into public.notification_definitions (
      id, kind, title, body, severity, surface, release_version, priority, dedupe_key,
      action_label, action_href, payload_json, starts_at, expires_at
    ) values
      (
        ${quote(ids.definitionA)}, 'release_announcement', 'RLS proof A',
        'Only user A should read this notification.', 'info', 'modal',
        '0.1.0-rls-a', 10, 'notification-rls-a',
        'View workshop', '/workshop', '{"schemaVersion":1}'::jsonb,
        now() - interval '1 minute', now() + interval '1 hour'
      ),
      (
        ${quote(ids.definitionB)}, 'system_notice', 'RLS proof B',
        'Only user B should read this notification.', 'warning', 'center',
        null, 1, 'notification-rls-b',
        'Open projects', '/workshop/projects', '{"schemaVersion":1}'::jsonb,
        now() - interval '1 minute', now() + interval '1 hour'
      );

    insert into public.notification_deliveries (
      id, notification_id, user_id, delivery_reason, payload_json
    ) values
      (${quote(ids.deliveryA)}, ${quote(ids.definitionA)}, ${quote(ids.userA)}, 'rls_proof_user_a', '{"schemaVersion":1}'::jsonb),
      (${quote(ids.deliveryB)}, ${quote(ids.definitionB)}, ${quote(ids.userB)}, 'rls_proof_user_b', '{"schemaVersion":1}'::jsonb);
  `);

  const asUserA = `set role authenticated; set request.jwt.claim.sub = ${quote(ids.userA)};`;
  assertScalar(`${asUserA} select count(*) from public.notification_deliveries where id = ${quote(ids.deliveryA)};`, 1, "same-user delivery read");
  assertScalar(`${asUserA} select count(*) from public.notification_definitions where id = ${quote(ids.definitionA)};`, 1, "same-user definition read");
  assertScalar(`${asUserA} select count(*) from public.notification_deliveries where id = ${quote(ids.deliveryB)};`, 0, "cross-user delivery denial");
  assertScalar(`${asUserA} select count(*) from public.notification_definitions where id = ${quote(ids.definitionB)};`, 0, "cross-user definition denial");

  runPsql(`${asUserA} update public.notification_deliveries set read_at = now() where id = ${quote(ids.deliveryA)};`, { expectFailure: true });
  runPsql(`${asUserA} insert into public.notification_definitions (kind, title, body, severity, surface) values ('system_notice', 'Browser insert', 'Should fail.', 'info', 'center');`, { expectFailure: true });
  runPsql(`set role anon; select count(*) from public.notification_deliveries;`, { expectFailure: true });

  console.log(JSON.stringify({
    ok: true,
    proof: "notification_rls_postgres",
    postgres: run(psql, ["--version"]).stdout.trim(),
    assertions: [
      "same-user delivery read succeeds",
      "same-user definition read succeeds",
      "cross-user delivery read denied",
      "cross-user definition read denied",
      "authenticated direct update denied",
      "authenticated direct definition insert denied",
      "anonymous delivery read denied",
    ],
  }, null, 2));
} finally {
  cleanup();
}
