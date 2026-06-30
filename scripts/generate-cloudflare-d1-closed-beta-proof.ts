#!/usr/bin/env bun

import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";

type ProofStatus = "local-pass" | "local-fail";

type QueryProofRow = {
  surface: string;
  queryBudget: number;
  plannedQueries: number;
  localBudgetMs: number;
  localP95Ms: number;
  rowsReturned: number;
  sampleCount: number;
  status: ProofStatus;
  notes: string;
};

type ClosedBetaProofFixture = {
  sqliteVersion: string;
  fixtureTables: number;
  rowsSeeded: number;
  invitedAccessAllowed: boolean;
  activeAccessAllowed: boolean;
  revokedAccessAllowed: boolean;
  wrongEmailAccessAllowed: boolean;
  missingEmailAccessAllowed: boolean;
  adminQueueRows: number;
  nonAdminQueueRows: number;
  createRows: number;
  normalizedCreatedEmail: string | null;
  duplicateCreateRows: number;
  nonAdminCreateRows: number;
  invalidCreateCommandFailed: boolean;
  invalidCreateRows: number;
  adminStatusAfterUpdate: string | null;
  nonAdminStatusAfterDeniedUpdate: string | null;
  invalidUpdateCommandFailed: boolean;
  invalidUpdateStatusAfterDenied: string | null;
  rollbackCommandFailed: boolean;
  rollbackResidueRows: number;
  restoredAllowlistRows: number;
  restoredAuditRows: number;
  accessLookupPlanUsesIndex: boolean;
  queuePlanUsesIndex: boolean;
  updatePlanUsesPrimaryKey: boolean;
  planDetails: string[];
  tempArtifactsRemoved: boolean;
};

type ClosedBetaProofInputs = {
  generatedAt?: string;
  fixture?: ClosedBetaProofFixture;
  queryRows?: QueryProofRow[];
};

export type CloudflareD1ClosedBetaProofReport = {
  generatedAt: string;
  mode: "cloudflare-d1-closed-beta-proof";
  sources: {
    plan: string;
    currentAppFiles: string[];
    currentSupabaseMigrations: string[];
    d1DatabaseApi: string;
  };
  affectedRpcNames: string[];
  readiness: {
    schemaReady: boolean;
    statusContractReady: boolean;
    appLayerAdminGuardReady: boolean;
    accessCheckReady: boolean;
    queueReadReady: boolean;
    createMutationReady: boolean;
    updateMutationReady: boolean;
    nonAdminDenied: boolean;
    invalidStatusDenied: boolean;
    rollbackReady: boolean;
    idempotencyReady: boolean;
    queryBudgetReady: boolean;
    restoreFixtureReady: boolean;
    localClosedBetaD1SliceReady: boolean;
    productionClosedBetaD1Ready: false;
  };
  localOnly: true;
  providerBacked: false;
  fixture: ClosedBetaProofFixture;
  queryProof: {
    rows: QueryProofRow[];
  };
  d1RewriteStrategy: {
    typeStrategy: string;
    preparedStatementPatterns: string[];
  };
  productionProofRequirements: string[];
  blockers: string[];
  note: string;
};

const PLAN_ROOT = ".ai/03_plans/2026-06-29-Cloudflare-Migration-Codex/evidence";

const AFFECTED_RPC_NAMES = [
  "check_closed_beta_access",
  "read_closed_beta_allowlist_queue",
  "create_closed_beta_allowlist_entry",
  "update_closed_beta_allowlist_entry",
];

const FIXTURE_SQL = `
.bail on
PRAGMA foreign_keys = ON;

CREATE TABLE users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  role TEXT NOT NULL CHECK (role IN ('member', 'admin', 'ceo'))
);

CREATE TABLE closed_beta_allowed_emails (
  id TEXT PRIMARY KEY,
  normalized_email TEXT NOT NULL UNIQUE CHECK (
    length(trim(normalized_email)) > 0
    AND normalized_email = lower(trim(normalized_email))
  ),
  status TEXT NOT NULL CHECK (status IN ('invited', 'active', 'revoked')),
  invited_by TEXT REFERENCES users(id) ON DELETE SET NULL,
  invited_at TEXT NOT NULL,
  accepted_at TEXT,
  notes TEXT,
  metadata_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE closed_beta_allowlist_audit_events (
  id TEXT PRIMARY KEY,
  allowlist_entry_id TEXT REFERENCES closed_beta_allowed_emails(id) ON DELETE CASCADE,
  actor_user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL,
  metadata_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL,
  UNIQUE (allowlist_entry_id, event_type, actor_user_id, metadata_json)
);

CREATE INDEX idx_closed_beta_allowed_emails_status_created_at
  ON closed_beta_allowed_emails(status, created_at DESC);

CREATE INDEX idx_closed_beta_allowlist_audit_entry_created_at
  ON closed_beta_allowlist_audit_events(allowlist_entry_id, created_at DESC);

INSERT INTO users (id, email, role) VALUES
  ('user-founder', 'philipjonlewis@example.test', 'ceo'),
  ('user-admin', 'admin@example.test', 'admin'),
  ('user-member', 'member@example.test', 'member'),
  ('user-invited', 'pilot@example.test', 'member'),
  ('user-active', 'active@example.test', 'member'),
  ('user-revoked', 'revoked@example.test', 'member');

INSERT INTO closed_beta_allowed_emails (
  id,
  normalized_email,
  status,
  invited_by,
  invited_at,
  accepted_at,
  notes,
  metadata_json,
  created_at,
  updated_at
) VALUES
  (
    'entry-invited',
    'pilot@example.test',
    'invited',
    'user-admin',
    '2026-06-30T00:00:00.000Z',
    NULL,
    'initial invited pilot',
    '{}',
    '2026-06-30T00:00:00.000Z',
    '2026-06-30T00:00:00.000Z'
  ),
  (
    'entry-active',
    'active@example.test',
    'active',
    'user-admin',
    '2026-06-30T00:01:00.000Z',
    '2026-06-30T00:05:00.000Z',
    'active pilot',
    '{}',
    '2026-06-30T00:01:00.000Z',
    '2026-06-30T00:05:00.000Z'
  ),
  (
    'entry-revoked',
    'revoked@example.test',
    'revoked',
    'user-admin',
    '2026-06-30T00:02:00.000Z',
    NULL,
    'revoked pilot',
    '{}',
    '2026-06-30T00:02:00.000Z',
    '2026-06-30T00:06:00.000Z'
  );
`;

const CREATE_ENTRY_SQL = `
.bail on
PRAGMA foreign_keys = ON;

BEGIN;

INSERT INTO closed_beta_allowed_emails (
  id,
  normalized_email,
  status,
  invited_by,
  invited_at,
  notes,
  metadata_json,
  created_at,
  updated_at
)
SELECT
  'entry-new',
  lower(trim('  NewPilot@Example.TEST  ')),
  'invited',
  actor.id,
  '2026-06-30T01:00:00.000Z',
  'ready for alpha import',
  '{}',
  '2026-06-30T01:00:00.000Z',
  '2026-06-30T01:00:00.000Z'
FROM users actor
WHERE actor.id = 'user-admin'
  AND actor.role IN ('admin', 'ceo')
ON CONFLICT(normalized_email) DO NOTHING;

INSERT INTO closed_beta_allowlist_audit_events (
  id,
  allowlist_entry_id,
  actor_user_id,
  event_type,
  metadata_json,
  created_at
)
SELECT
  'audit-create-entry-new',
  'entry-new',
  'user-admin',
  'created',
  '{"status":"invited"}',
  '2026-06-30T01:00:00.000Z'
WHERE EXISTS (
  SELECT 1
  FROM closed_beta_allowed_emails
  WHERE id = 'entry-new'
)
ON CONFLICT(allowlist_entry_id, event_type, actor_user_id, metadata_json) DO NOTHING;

COMMIT;
`;

const NON_ADMIN_CREATE_SQL = `
.bail on
PRAGMA foreign_keys = ON;

INSERT INTO closed_beta_allowed_emails (
  id,
  normalized_email,
  status,
  invited_by,
  invited_at,
  notes,
  metadata_json,
  created_at,
  updated_at
)
SELECT
  'entry-non-admin',
  'blocked@example.test',
  'invited',
  actor.id,
  '2026-06-30T01:01:00.000Z',
  'should not write',
  '{}',
  '2026-06-30T01:01:00.000Z',
  '2026-06-30T01:01:00.000Z'
FROM users actor
WHERE actor.id = 'user-member'
  AND actor.role IN ('admin', 'ceo');
`;

const INVALID_CREATE_SQL = `
.bail on
PRAGMA foreign_keys = ON;

INSERT INTO closed_beta_allowed_emails (
  id,
  normalized_email,
  status,
  invited_by,
  invited_at,
  notes,
  metadata_json,
  created_at,
  updated_at
) VALUES (
  'entry-invalid',
  'invalid@example.test',
  'paused',
  'user-admin',
  '2026-06-30T01:02:00.000Z',
  'invalid status should fail',
  '{}',
  '2026-06-30T01:02:00.000Z',
  '2026-06-30T01:02:00.000Z'
);
`;

const UPDATE_ENTRY_SQL = `
.bail on
PRAGMA foreign_keys = ON;

BEGIN;

UPDATE closed_beta_allowed_emails
SET status = 'active',
    accepted_at = COALESCE(accepted_at, '2026-06-30T01:10:00.000Z'),
    notes = 'activated by admin',
    updated_at = '2026-06-30T01:10:00.000Z'
WHERE id = 'entry-invited'
  AND EXISTS (
    SELECT 1
    FROM users actor
    WHERE actor.id = 'user-admin'
      AND actor.role IN ('admin', 'ceo')
  );

INSERT INTO closed_beta_allowlist_audit_events (
  id,
  allowlist_entry_id,
  actor_user_id,
  event_type,
  metadata_json,
  created_at
)
SELECT
  'audit-update-entry-invited',
  'entry-invited',
  'user-admin',
  'status_changed',
  '{"status":"active"}',
  '2026-06-30T01:10:00.000Z'
WHERE EXISTS (
  SELECT 1
  FROM closed_beta_allowed_emails
  WHERE id = 'entry-invited'
    AND status = 'active'
)
ON CONFLICT(allowlist_entry_id, event_type, actor_user_id, metadata_json) DO NOTHING;

COMMIT;
`;

const NON_ADMIN_UPDATE_SQL = `
.bail on
PRAGMA foreign_keys = ON;

UPDATE closed_beta_allowed_emails
SET status = 'revoked',
    notes = 'non-admin attempted revoke',
    updated_at = '2026-06-30T01:11:00.000Z'
WHERE id = 'entry-invited'
  AND EXISTS (
    SELECT 1
    FROM users actor
    WHERE actor.id = 'user-member'
      AND actor.role IN ('admin', 'ceo')
  );
`;

const INVALID_UPDATE_SQL = `
.bail on
PRAGMA foreign_keys = ON;

UPDATE closed_beta_allowed_emails
SET status = 'paused',
    updated_at = '2026-06-30T01:12:00.000Z'
WHERE id = 'entry-invited';
`;

const ROLLBACK_PROOF_SQL = `
.bail on
PRAGMA foreign_keys = ON;

BEGIN;

INSERT INTO closed_beta_allowed_emails (
  id,
  normalized_email,
  status,
  invited_by,
  invited_at,
  notes,
  metadata_json,
  created_at,
  updated_at
) VALUES (
  'entry-rollback',
  'rollback@example.test',
  'invited',
  'user-admin',
  '2026-06-30T01:20:00.000Z',
  'should rollback',
  '{}',
  '2026-06-30T01:20:00.000Z',
  '2026-06-30T01:20:00.000Z'
);

INSERT INTO closed_beta_allowed_emails (
  id,
  normalized_email,
  status,
  invited_by,
  invited_at,
  notes,
  metadata_json,
  created_at,
  updated_at
) VALUES (
  'entry-rollback-invalid',
  'rollback-invalid@example.test',
  'paused',
  'user-admin',
  '2026-06-30T01:20:01.000Z',
  'invalid status should abort transaction',
  '{}',
  '2026-06-30T01:20:01.000Z',
  '2026-06-30T01:20:01.000Z'
);

COMMIT;
`;

const QUERY_SPECS = [
  {
    surface: "check_closed_beta_access_email_lookup",
    queryBudget: 2,
    plannedQueries: 1,
    localBudgetMs: 100,
    sql: `
      SELECT status
      FROM closed_beta_allowed_emails
      WHERE normalized_email = 'active@example.test'
      LIMIT 1;
    `,
    notes: "The beta access gate remains a single normalized-email lookup with caller-email equality enforced by the service.",
  },
  {
    surface: "read_closed_beta_allowlist_queue_by_status",
    queryBudget: 2,
    plannedQueries: 1,
    localBudgetMs: 100,
    sql: `
      SELECT id, normalized_email, status, created_at
      FROM closed_beta_allowed_emails
      WHERE status = 'active'
      ORDER BY created_at DESC
      LIMIT 100;
    `,
    notes: "Admin queue reads use the status/created-at index and keep direct table enumeration unavailable to non-admins.",
  },
  {
    surface: "create_closed_beta_allowlist_entry_unique_email",
    queryBudget: 2,
    plannedQueries: 1,
    localBudgetMs: 100,
    sql: `
      SELECT id
      FROM closed_beta_allowed_emails
      WHERE normalized_email = 'newpilot@example.test';
    `,
    notes: "Create retries are naturally bounded by the normalized-email unique index.",
  },
  {
    surface: "update_closed_beta_allowlist_entry_by_id",
    queryBudget: 2,
    plannedQueries: 1,
    localBudgetMs: 100,
    sql: `
      SELECT id, status
      FROM closed_beta_allowed_emails
      WHERE id = 'entry-invited';
    `,
    notes: "Admin status updates target a single row by primary key after the app-layer role guard.",
  },
] as const;

const PREPARED_STATEMENT_PATTERNS = [
  "SELECT status FROM closed_beta_allowed_emails WHERE normalized_email = ? LIMIT 1",
  "SELECT ... FROM closed_beta_allowed_emails WHERE status = ? ORDER BY created_at DESC LIMIT 100",
  "INSERT INTO closed_beta_allowed_emails (...) SELECT ... FROM users WHERE actor.role IN ('admin', 'ceo') ON CONFLICT(normalized_email) DO NOTHING",
  "UPDATE closed_beta_allowed_emails SET status = ?, notes = ?, updated_at = ? WHERE id = ? AND EXISTS (SELECT 1 FROM users WHERE role IN ('admin', 'ceo'))",
  "INSERT INTO closed_beta_allowlist_audit_events (...) ON CONFLICT(allowlist_entry_id, event_type, actor_user_id, metadata_json) DO NOTHING",
];

const PRODUCTION_PROOF_REQUIREMENTS = [
  "Implement the closed-beta D1 repository behind Better Auth request identity and app-layer platform-admin checks.",
  "Run check, queue-read, create, duplicate-create, update, non-admin denial, invalid-status, rollback, and restore tests inside the Worker runtime.",
  "Capture hosted Worker+D1 query count, p95 duration, rows read/written, and denial telemetry for beta access checks and allowlist admin actions.",
  "Keep direct allowlist table enumeration blocked; only repository methods with server-derived identity should reach D1.",
  "Run a provider-backed D1 export/restore rehearsal for closed-beta allowlist rows before treating D1 as the source of truth.",
];

function readEnv(name: string) {
  const value = process.env[name];
  return value?.trim() || undefined;
}

function runSqlite(args: string[], input?: string) {
  const result = spawnSync("sqlite3", args, {
    input,
    encoding: "utf8",
    maxBuffer: 20 * 1024 * 1024,
  });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    const detail = result.stderr.trim() || result.stdout.trim() || `exit ${result.status}`;
    throw new Error(`sqlite3 ${args.join(" ")} failed: ${detail}`);
  }
  return result.stdout;
}

function runSqliteAllowFailure(args: string[], input: string) {
  return spawnSync("sqlite3", args, {
    input,
    encoding: "utf8",
    maxBuffer: 20 * 1024 * 1024,
  });
}

function runSqliteScript(databasePath: string, sql: string) {
  runSqlite([databasePath], sql);
}

function runSqliteJson<T>(databasePath: string, sql: string) {
  const output = runSqlite(["-json", databasePath, sql]).trim();
  return output ? JSON.parse(output) as T[] : [];
}

function sqliteVersion() {
  return runSqlite(["--version"]).trim().split(/\s+/)[0] ?? "unknown";
}

function percentile(values: number[], percentileValue: number) {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((left, right) => left - right);
  const index = Math.min(sorted.length - 1, Math.max(0, Math.ceil(sorted.length * percentileValue) - 1));
  return sorted[index];
}

function roundedMs(value: number) {
  return Math.round(value * 100) / 100;
}

function measureQuery(databasePath: string, sql: string) {
  const samples: number[] = [];
  let rowsReturned = 0;

  for (let index = 0; index < 10; index += 1) {
    const started = process.hrtime.bigint();
    const rows = runSqliteJson<Record<string, unknown>>(databasePath, sql);
    const ended = process.hrtime.bigint();
    if (index > 0) samples.push(Number(ended - started) / 1_000_000);
    rowsReturned = rows.length;
  }

  return {
    localP95Ms: roundedMs(percentile(samples, 0.95)),
    rowsReturned,
    sampleCount: samples.length,
  };
}

function buildQueryProofRows(databasePath: string): QueryProofRow[] {
  return QUERY_SPECS.map((spec): QueryProofRow => {
    const result = measureQuery(databasePath, spec.sql);
    const status = spec.plannedQueries <= spec.queryBudget && result.localP95Ms <= spec.localBudgetMs
      ? "local-pass"
      : "local-fail";
    return {
      surface: spec.surface,
      queryBudget: spec.queryBudget,
      plannedQueries: spec.plannedQueries,
      localBudgetMs: spec.localBudgetMs,
      localP95Ms: result.localP95Ms,
      rowsReturned: result.rowsReturned,
      sampleCount: result.sampleCount,
      status,
      notes: spec.notes,
    };
  });
}

function dumpDatabase(databasePath: string) {
  return runSqlite([databasePath, ".dump"]);
}

function countSeedRows(databasePath: string) {
  const rows = runSqliteJson<{ rows_seeded: number }>(
    databasePath,
    `
      SELECT
        (SELECT COUNT(*) FROM users)
        + (SELECT COUNT(*) FROM closed_beta_allowed_emails)
        + (SELECT COUNT(*) FROM closed_beta_allowlist_audit_events) AS rows_seeded;
    `,
  );
  return rows[0]?.rows_seeded ?? 0;
}

function checkAccess(databasePath: string, rawEmail: string, callerEmail: string) {
  const escapedRaw = rawEmail.replaceAll("'", "''");
  const escapedCaller = callerEmail.replaceAll("'", "''");
  const rows = runSqliteJson<{ allowed: number; status: string; normalized_email: string }>(
    databasePath,
    `
      WITH input AS (
        SELECT lower(trim('${escapedRaw}')) AS requested_email,
               lower(trim('${escapedCaller}')) AS caller_email
      ),
      matched AS (
        SELECT beta.status
        FROM input
        JOIN closed_beta_allowed_emails beta ON beta.normalized_email = input.requested_email
        WHERE input.requested_email <> ''
          AND input.caller_email <> ''
          AND input.requested_email = input.caller_email
        LIMIT 1
      )
      SELECT
        CASE WHEN COALESCE((SELECT status FROM matched), 'missing') IN ('invited', 'active') THEN 1 ELSE 0 END AS allowed,
        COALESCE((SELECT status FROM matched), 'missing') AS status,
        (SELECT requested_email FROM input) AS normalized_email;
    `,
  );
  return rows[0] ?? { allowed: 0, status: "missing", normalized_email: rawEmail.trim().toLowerCase() };
}

function adminQueueRowCount(databasePath: string, actorUserId: string, requestedStatus: string | null) {
  const statusPredicate = requestedStatus ? `AND beta.status = '${requestedStatus.replaceAll("'", "''")}'` : "";
  const rows = runSqliteJson<{ rows: number }>(
    databasePath,
    `
      SELECT COUNT(*) AS rows
      FROM closed_beta_allowed_emails beta
      WHERE EXISTS (
        SELECT 1
        FROM users actor
        WHERE actor.id = '${actorUserId.replaceAll("'", "''")}'
          AND actor.role IN ('admin', 'ceo')
      )
      ${statusPredicate};
    `,
  );
  return rows[0]?.rows ?? 0;
}

function scalarString(databasePath: string, sql: string, key: string) {
  const rows = runSqliteJson<Record<string, string | null>>(databasePath, sql);
  return rows[0]?.[key] ?? null;
}

function scalarNumber(databasePath: string, sql: string, key: string) {
  const rows = runSqliteJson<Record<string, number>>(databasePath, sql);
  return rows[0]?.[key] ?? 0;
}

function explainPlan(databasePath: string, sql: string) {
  const output = runSqlite([databasePath], `EXPLAIN QUERY PLAN ${sql}`);
  return output
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && line !== "QUERY PLAN");
}

function buildPlanProof(databasePath: string) {
  const accessLookupPlan = explainPlan(
    databasePath,
    `
      SELECT status
      FROM closed_beta_allowed_emails
      WHERE normalized_email = 'pilot@example.test'
      LIMIT 1
    `,
  );
  const queuePlan = explainPlan(
    databasePath,
    `
      SELECT id, normalized_email, status
      FROM closed_beta_allowed_emails
      WHERE status = 'active'
      ORDER BY created_at DESC
      LIMIT 100
    `,
  );
  const updatePlan = explainPlan(
    databasePath,
    `
      SELECT id, status
      FROM closed_beta_allowed_emails
      WHERE id = 'entry-invited'
    `,
  );
  const planDetails = [...accessLookupPlan, ...queuePlan, ...updatePlan];
  return {
    accessLookupPlanUsesIndex: accessLookupPlan.some((detail) => /normalized_email|sqlite_autoindex_closed_beta_allowed_emails_2/i.test(detail)),
    queuePlanUsesIndex: queuePlan.some((detail) => /idx_closed_beta_allowed_emails_status_created_at/i.test(detail)),
    updatePlanUsesPrimaryKey: updatePlan.some((detail) => /sqlite_autoindex_closed_beta_allowed_emails_1|PRIMARY KEY/i.test(detail)),
    planDetails,
  };
}

function buildLocalFixtureAndQueries() {
  const tempDir = mkdtempSync(join(tmpdir(), "archestimator-d1-closed-beta-"));
  const databasePath = join(tempDir, "closed-beta.db");
  const restoredDatabasePath = join(tempDir, "closed-beta-restored.db");

  try {
    runSqliteScript(databasePath, FIXTURE_SQL);
    const rowsSeeded = countSeedRows(databasePath);
    const invitedAccess = checkAccess(databasePath, " Pilot@Example.TEST ", "pilot@example.test");
    const activeAccess = checkAccess(databasePath, "active@example.test", "active@example.test");
    const revokedAccess = checkAccess(databasePath, "revoked@example.test", "revoked@example.test");
    const wrongEmailAccess = checkAccess(databasePath, "pilot@example.test", "other@example.test");
    const missingEmailAccess = checkAccess(databasePath, "missing@example.test", "missing@example.test");
    const adminQueueRows = adminQueueRowCount(databasePath, "user-admin", null);
    const nonAdminQueueRows = adminQueueRowCount(databasePath, "user-member", null);

    runSqliteScript(databasePath, CREATE_ENTRY_SQL);
    runSqliteScript(databasePath, CREATE_ENTRY_SQL);
    runSqliteScript(databasePath, NON_ADMIN_CREATE_SQL);
    const invalidCreateResult = runSqliteAllowFailure([databasePath], INVALID_CREATE_SQL);
    runSqliteScript(databasePath, UPDATE_ENTRY_SQL);
    runSqliteScript(databasePath, UPDATE_ENTRY_SQL);
    runSqliteScript(databasePath, NON_ADMIN_UPDATE_SQL);
    const invalidUpdateResult = runSqliteAllowFailure([databasePath], INVALID_UPDATE_SQL);
    const rollbackResult = runSqliteAllowFailure([databasePath], ROLLBACK_PROOF_SQL);
    const planProof = buildPlanProof(databasePath);
    const queryRows = buildQueryProofRows(databasePath);
    const dump = dumpDatabase(databasePath);
    runSqlite([restoredDatabasePath], dump);

    const fixture: ClosedBetaProofFixture = {
      sqliteVersion: sqliteVersion(),
      fixtureTables: 3,
      rowsSeeded,
      invitedAccessAllowed: invitedAccess.allowed === 1 && invitedAccess.status === "invited",
      activeAccessAllowed: activeAccess.allowed === 1 && activeAccess.status === "active",
      revokedAccessAllowed: revokedAccess.allowed === 1,
      wrongEmailAccessAllowed: wrongEmailAccess.allowed === 1,
      missingEmailAccessAllowed: missingEmailAccess.allowed === 1,
      adminQueueRows,
      nonAdminQueueRows,
      createRows: scalarNumber(databasePath, "SELECT COUNT(*) AS rows FROM closed_beta_allowed_emails WHERE id = 'entry-new';", "rows"),
      normalizedCreatedEmail: scalarString(
        databasePath,
        "SELECT normalized_email FROM closed_beta_allowed_emails WHERE id = 'entry-new';",
        "normalized_email",
      ),
      duplicateCreateRows: Math.max(
        0,
        scalarNumber(
          databasePath,
          "SELECT COUNT(*) AS rows FROM closed_beta_allowed_emails WHERE normalized_email = 'newpilot@example.test';",
          "rows",
        ) - 1,
      ),
      nonAdminCreateRows: scalarNumber(
        databasePath,
        "SELECT COUNT(*) AS rows FROM closed_beta_allowed_emails WHERE id = 'entry-non-admin';",
        "rows",
      ),
      invalidCreateCommandFailed: invalidCreateResult.status !== 0,
      invalidCreateRows: scalarNumber(
        databasePath,
        "SELECT COUNT(*) AS rows FROM closed_beta_allowed_emails WHERE id = 'entry-invalid';",
        "rows",
      ),
      adminStatusAfterUpdate: scalarString(
        databasePath,
        "SELECT status FROM closed_beta_allowed_emails WHERE id = 'entry-invited';",
        "status",
      ),
      nonAdminStatusAfterDeniedUpdate: scalarString(
        databasePath,
        "SELECT status FROM closed_beta_allowed_emails WHERE id = 'entry-invited';",
        "status",
      ),
      invalidUpdateCommandFailed: invalidUpdateResult.status !== 0,
      invalidUpdateStatusAfterDenied: scalarString(
        databasePath,
        "SELECT status FROM closed_beta_allowed_emails WHERE id = 'entry-invited';",
        "status",
      ),
      rollbackCommandFailed: rollbackResult.status !== 0,
      rollbackResidueRows: scalarNumber(
        databasePath,
        "SELECT COUNT(*) AS rows FROM closed_beta_allowed_emails WHERE normalized_email LIKE 'rollback%';",
        "rows",
      ),
      restoredAllowlistRows: scalarNumber(restoredDatabasePath, "SELECT COUNT(*) AS rows FROM closed_beta_allowed_emails;", "rows"),
      restoredAuditRows: scalarNumber(restoredDatabasePath, "SELECT COUNT(*) AS rows FROM closed_beta_allowlist_audit_events;", "rows"),
      ...planProof,
      tempArtifactsRemoved: false,
    };

    return { fixture, queryRows, tempDir };
  } catch (error) {
    rmSync(tempDir, { recursive: true, force: true });
    throw error;
  }
}

function buildDefaultFixture() {
  const result = buildLocalFixtureAndQueries();
  rmSync(result.tempDir, { recursive: true, force: true });
  return {
    fixture: {
      ...result.fixture,
      tempArtifactsRemoved: true,
    },
    queryRows: result.queryRows,
  };
}

function allQueriesPass(rows: QueryProofRow[]) {
  return rows.length > 0 && rows.every((row) => row.status === "local-pass");
}

function buildReadiness(fixture: ClosedBetaProofFixture, queryRows: QueryProofRow[]) {
  const schemaReady = fixture.fixtureTables === 3 && fixture.rowsSeeded >= 9;
  const statusContractReady = !fixture.revokedAccessAllowed
    && !fixture.invalidCreateRows
    && fixture.invalidCreateCommandFailed
    && fixture.invalidUpdateCommandFailed;
  const appLayerAdminGuardReady = fixture.adminQueueRows >= 3
    && fixture.nonAdminQueueRows === 0
    && fixture.nonAdminCreateRows === 0
    && fixture.nonAdminStatusAfterDeniedUpdate === "active";
  const accessCheckReady = fixture.invitedAccessAllowed
    && fixture.activeAccessAllowed
    && !fixture.revokedAccessAllowed
    && !fixture.wrongEmailAccessAllowed
    && !fixture.missingEmailAccessAllowed;
  const createMutationReady = fixture.createRows === 1
    && fixture.normalizedCreatedEmail === "newpilot@example.test";
  const updateMutationReady = fixture.adminStatusAfterUpdate === "active";
  const rollbackReady = fixture.rollbackCommandFailed && fixture.rollbackResidueRows === 0;
  const idempotencyReady = fixture.duplicateCreateRows === 0 && fixture.restoredAuditRows >= 2;
  const queryBudgetReady = allQueriesPass(queryRows)
    && fixture.accessLookupPlanUsesIndex
    && fixture.queuePlanUsesIndex
    && fixture.updatePlanUsesPrimaryKey;
  const restoreFixtureReady = fixture.restoredAllowlistRows >= 4 && fixture.restoredAuditRows >= 2;

  const readiness = {
    schemaReady,
    statusContractReady,
    appLayerAdminGuardReady,
    accessCheckReady,
    queueReadReady: fixture.adminQueueRows >= 3 && fixture.nonAdminQueueRows === 0,
    createMutationReady,
    updateMutationReady,
    nonAdminDenied: fixture.nonAdminQueueRows === 0
      && fixture.nonAdminCreateRows === 0
      && fixture.nonAdminStatusAfterDeniedUpdate === "active",
    invalidStatusDenied: fixture.invalidCreateCommandFailed
      && fixture.invalidCreateRows === 0
      && fixture.invalidUpdateCommandFailed
      && fixture.invalidUpdateStatusAfterDenied === "active",
    rollbackReady,
    idempotencyReady,
    queryBudgetReady,
    restoreFixtureReady,
    localClosedBetaD1SliceReady: false,
    productionClosedBetaD1Ready: false as const,
  };

  readiness.localClosedBetaD1SliceReady = Object.entries(readiness)
    .filter(([key]) => key !== "productionClosedBetaD1Ready" && key !== "localClosedBetaD1SliceReady")
    .every(([, value]) => value === true);

  return readiness;
}

export function buildCloudflareD1ClosedBetaProof(
  inputs: ClosedBetaProofInputs = {},
): CloudflareD1ClosedBetaProofReport {
  const defaultFixture = inputs.fixture && inputs.queryRows
    ? { fixture: inputs.fixture, queryRows: inputs.queryRows }
    : buildDefaultFixture();
  const fixture = inputs.fixture ?? defaultFixture.fixture;
  const queryRows = inputs.queryRows ?? defaultFixture.queryRows;
  const readiness = buildReadiness(fixture, queryRows);
  return {
    generatedAt: inputs.generatedAt ?? new Date().toISOString(),
    mode: "cloudflare-d1-closed-beta-proof",
    sources: {
      plan: ".ai/03_plans/2026-06-29-Cloudflare-Migration-Codex/23_D1_AUTH_REALTIME_REDESIGN_PLAN.md",
      currentAppFiles: [
        "src/lib/auth/closed-beta-access.ts",
        "src/lib/auth/beta-allowlist-admin.ts",
        "src/lib/auth/beta-allowlist-admin-actions.ts",
        "src/app/workshop/settings/users/page.tsx",
      ],
      currentSupabaseMigrations: [
        "supabase/migrations/20260601182522_closed_beta_allowed_emails.sql",
        "supabase/migrations/20260602090000_harden_beta_allowlist_admin.sql",
      ],
      d1DatabaseApi: "Cloudflare D1 prepared statements and batch/transaction semantics, modeled locally with SQLite",
    },
    affectedRpcNames: AFFECTED_RPC_NAMES,
    readiness,
    localOnly: true,
    providerBacked: false,
    fixture,
    queryProof: {
      rows: queryRows,
    },
    d1RewriteStrategy: {
      typeStrategy:
        "Model closed-beta allowlist rows as a D1 table with normalized-email uniqueness, status CHECK constraints, app-layer platform-admin guards derived from Better Auth identity, and repository-only access for the sensitive queue.",
      preparedStatementPatterns: PREPARED_STATEMENT_PATTERNS,
    },
    productionProofRequirements: PRODUCTION_PROOF_REQUIREMENTS,
    blockers: [
      "Hosted Worker+D1 closed-beta allowlist proof is still missing.",
      "Better Auth production identity handoff is still missing; keep current Supabase-backed closed-beta gates live.",
      "Provider-backed D1 export/restore proof for closed-beta allowlist rows is still missing.",
    ],
    note:
      "Local D1 closed-beta allowlist proof only. It uses sanitized temporary SQLite data and does not read env files, print secret values, call provider APIs, create hosted D1 databases, mutate Cloudflare/Supabase, deploy Workers, change DNS, bill, replace live auth gates, or make production D1/Auth ready.",
  };
}

function boolLabel(value: boolean) {
  return value ? "yes" : "no";
}

function markdownRows(rows: string[][]) {
  return rows.map((row) => `| ${row.map((cell) => cell.replaceAll("|", "\\|")).join(" | ")} |`);
}

export function writeMarkdown(report: CloudflareD1ClosedBetaProofReport, markdownFile: string) {
  const outputPath = resolve(markdownFile);
  mkdirSync(dirname(outputPath), { recursive: true });
  const readinessRows = Object.entries(report.readiness).map(([key, value]) => [
    key.replace(/([A-Z])/g, " $1").replace(/^./, (char) => char.toUpperCase()),
    boolLabel(value),
  ]);
  const queryRows = report.queryProof.rows.map((row) => [
    row.surface,
    String(row.queryBudget),
    String(row.plannedQueries),
    String(row.localBudgetMs),
    String(row.localP95Ms),
    String(row.rowsReturned),
    row.status,
    row.notes,
  ]);
  const lines = [
    "# Cloudflare D1 Closed-Beta Allowlist Proof",
    "",
    `Generated: ${report.generatedAt}`,
    "",
    report.note,
    "",
    "## Readiness",
    "",
    "| Gate | Ready |",
    "| --- | --- |",
    ...markdownRows(readinessRows),
    "",
    "## Affected RPCs",
    "",
    ...report.affectedRpcNames.map((name) => `- \`${name}\``),
    "",
    "## Local Fixture Facts",
    "",
    "| Fact | Value |",
    "| --- | ---: |",
    `| SQLite version | ${report.fixture.sqliteVersion} |`,
    `| Fixture tables | ${report.fixture.fixtureTables} |`,
    `| Rows seeded | ${report.fixture.rowsSeeded} |`,
    `| Admin queue rows | ${report.fixture.adminQueueRows} |`,
    `| Non-admin queue rows | ${report.fixture.nonAdminQueueRows} |`,
    `| Created rows | ${report.fixture.createRows} |`,
    `| Normalized created email | ${report.fixture.normalizedCreatedEmail ?? "(missing)"} |`,
    `| Duplicate create rows | ${report.fixture.duplicateCreateRows} |`,
    `| Non-admin create rows | ${report.fixture.nonAdminCreateRows} |`,
    `| Invalid create command failed | ${boolLabel(report.fixture.invalidCreateCommandFailed)} |`,
    `| Admin status after update | ${report.fixture.adminStatusAfterUpdate ?? "(missing)"} |`,
    `| Non-admin status after denied update | ${report.fixture.nonAdminStatusAfterDeniedUpdate ?? "(missing)"} |`,
    `| Invalid update command failed | ${boolLabel(report.fixture.invalidUpdateCommandFailed)} |`,
    `| Rollback command failed | ${boolLabel(report.fixture.rollbackCommandFailed)} |`,
    `| Rollback residue rows | ${report.fixture.rollbackResidueRows} |`,
    `| Restored allowlist rows | ${report.fixture.restoredAllowlistRows} |`,
    `| Restored audit rows | ${report.fixture.restoredAuditRows} |`,
    `| Access lookup plan uses index | ${boolLabel(report.fixture.accessLookupPlanUsesIndex)} |`,
    `| Queue plan uses index | ${boolLabel(report.fixture.queuePlanUsesIndex)} |`,
    `| Update plan uses primary key | ${boolLabel(report.fixture.updatePlanUsesPrimaryKey)} |`,
    "",
    "## Query Proof",
    "",
    "| Surface | Query budget | Planned queries | Local budget ms | Local p95 ms | Rows | Status | Notes |",
    "| --- | ---: | ---: | ---: | ---: | ---: | --- | --- |",
    ...markdownRows(queryRows),
    "",
    "## Query Plan Details",
    "",
    ...report.fixture.planDetails.map((detail) => `- ${detail}`),
    "",
    "## Prepared Statement Patterns",
    "",
    ...report.d1RewriteStrategy.preparedStatementPatterns.map((pattern) => `- \`${pattern}\``),
    "",
    "## Production Proof Requirements",
    "",
    ...report.productionProofRequirements.map((requirement) => `- ${requirement}`),
    "",
    "## Blockers",
    "",
    ...report.blockers.map((blocker) => `- ${blocker}`),
    "",
  ];
  writeFileSync(outputPath, lines.join("\n"));
}

function writeOutput(outputFile: string, report: CloudflareD1ClosedBetaProofReport) {
  const outputPath = resolve(outputFile);
  mkdirSync(dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, `${JSON.stringify(report, null, 2)}\n`);
}

async function main() {
  const report = buildCloudflareD1ClosedBetaProof();
  const outputFile = readEnv("OUTPUT_FILE") ?? `${PLAN_ROOT}/2026-06-30-cloudflare-d1-closed-beta-proof.json`;
  const markdownFile = readEnv("MARKDOWN_FILE") ?? `${PLAN_ROOT}/2026-06-30-cloudflare-d1-closed-beta-proof.md`;
  writeOutput(outputFile, report);
  writeMarkdown(report, markdownFile);
  console.log(JSON.stringify(report, null, 2));
  if (!report.readiness.localClosedBetaD1SliceReady) process.exitCode = 1;
}

if (import.meta.main) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
