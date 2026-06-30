#!/usr/bin/env bun

import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";

import {
  BETA_FEEDBACK_SEVERITIES,
  BETA_FEEDBACK_STATUSES,
  BETA_FEEDBACK_TYPES,
} from "../src/lib/workshop/beta-feedback";

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

type BetaFeedbackProofFixture = {
  sqliteVersion: string;
  fixtureTables: number;
  rowsSeeded: number;
  feedbackRows: number;
  authorizedSubmissionRows: number;
  forgedWorkspaceRows: number;
  mismatchedProjectRows: number;
  adminQueueRows: number;
  nonAdminQueueRows: number;
  nonAdminStatusAfterDeniedUpdate: string | null;
  adminStatusAfterUpdate: string | null;
  statusAuditRows: number;
  duplicateStatusAuditRows: number;
  rollbackCommandFailed: boolean;
  rollbackResidueRows: number;
  restoredFeedbackRows: number;
  restoredStatusAuditRows: number;
  reviewQueuePlanUsesIndex: boolean;
  reviewQueuePlanDetails: string[];
  tempArtifactsRemoved: boolean;
};

type BetaFeedbackProofInputs = {
  generatedAt?: string;
  fixture?: BetaFeedbackProofFixture;
  queryRows?: QueryProofRow[];
};

export type CloudflareD1BetaFeedbackProofReport = {
  generatedAt: string;
  mode: "cloudflare-d1-beta-feedback-proof";
  sources: {
    plan: string;
    currentAppFiles: string[];
    currentSupabaseMigrations: string[];
    d1DatabaseApi: string;
  };
  readiness: {
    schemaReady: boolean;
    enumParityReady: boolean;
    appLayerAuthzReady: boolean;
    submissionMutationReady: boolean;
    forgedContextDenied: boolean;
    adminReviewReady: boolean;
    adminStatusUpdateReady: boolean;
    nonAdminReviewDenied: boolean;
    rollbackReady: boolean;
    idempotencyReady: boolean;
    queryBudgetReady: boolean;
    restoreFixtureReady: boolean;
    localBetaFeedbackD1SliceReady: boolean;
    productionBetaFeedbackD1Ready: false;
  };
  localOnly: true;
  providerBacked: false;
  fixture: BetaFeedbackProofFixture;
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

const FEEDBACK_TYPES_SQL = BETA_FEEDBACK_TYPES.map((value) => `'${value}'`).join(", ");
const FEEDBACK_SEVERITIES_SQL = BETA_FEEDBACK_SEVERITIES.map((value) => `'${value}'`).join(", ");
const FEEDBACK_STATUSES_SQL = BETA_FEEDBACK_STATUSES.map((value) => `'${value}'`).join(", ");

const FIXTURE_SQL = `
.bail on
PRAGMA foreign_keys = ON;

CREATE TABLE users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  role TEXT NOT NULL CHECK (role IN ('user', 'admin', 'ceo'))
);

CREATE TABLE workspaces (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL
);

CREATE TABLE workspace_members (
  workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('owner', 'editor', 'viewer')),
  PRIMARY KEY (workspace_id, user_id)
);

CREATE TABLE projects (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL
);

CREATE TABLE beta_feedback_submissions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  workspace_id TEXT REFERENCES workspaces(id) ON DELETE SET NULL,
  project_id TEXT REFERENCES projects(id) ON DELETE SET NULL,
  user_email TEXT NOT NULL,
  feedback_type TEXT NOT NULL CHECK (feedback_type IN (${FEEDBACK_TYPES_SQL})),
  severity TEXT NOT NULL CHECK (severity IN (${FEEDBACK_SEVERITIES_SQL})),
  page_path TEXT,
  message TEXT NOT NULL CHECK (length(trim(message)) BETWEEN 10 AND 4000),
  metadata_json TEXT NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN (${FEEDBACK_STATUSES_SQL})),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE beta_feedback_status_events (
  id TEXT PRIMARY KEY,
  feedback_id TEXT NOT NULL REFERENCES beta_feedback_submissions(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN (${FEEDBACK_STATUSES_SQL})),
  actor_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL,
  UNIQUE (feedback_id, status)
);

CREATE INDEX idx_beta_feedback_created_at
  ON beta_feedback_submissions(created_at DESC);

CREATE INDEX idx_beta_feedback_status_created_at
  ON beta_feedback_submissions(status, created_at DESC);

CREATE INDEX idx_beta_feedback_user_created_at
  ON beta_feedback_submissions(user_id, created_at DESC);

CREATE INDEX idx_workspace_members_user_workspace
  ON workspace_members(user_id, workspace_id);

CREATE INDEX idx_projects_workspace
  ON projects(workspace_id, id);

INSERT INTO users (id, email, role) VALUES
  ('user-alpha', 'alpha@example.test', 'user'),
  ('user-beta', 'beta@example.test', 'user'),
  ('platform-admin', 'admin@example.test', 'admin');

INSERT INTO workspaces (id, name) VALUES
  ('ws-alpha', 'Alpha Workshop'),
  ('ws-beta', 'Beta Workshop');

INSERT INTO workspace_members (workspace_id, user_id, role) VALUES
  ('ws-alpha', 'user-alpha', 'owner'),
  ('ws-beta', 'user-beta', 'owner');

INSERT INTO projects (id, workspace_id, name) VALUES
  ('project-alpha', 'ws-alpha', 'Alpha Project'),
  ('project-beta', 'ws-beta', 'Beta Project');
`;

const AUTHORIZED_SUBMISSION_SQL = `
.bail on
PRAGMA foreign_keys = ON;

INSERT INTO beta_feedback_submissions (
  id,
  user_id,
  workspace_id,
  project_id,
  user_email,
  feedback_type,
  severity,
  page_path,
  message,
  metadata_json,
  status,
  created_at,
  updated_at
)
SELECT
  'feedback-alpha-1',
  actor.id,
  'ws-alpha',
  'project-alpha',
  actor.email,
  'export_issue',
  'high',
  '/workshop/projects/project-alpha',
  'Workbook formulas need clearer section totals.',
  '{"source":"workshop_feedback_form"}',
  'new',
  '2026-06-30T00:00:00.000Z',
  '2026-06-30T00:00:00.000Z'
FROM users actor
WHERE actor.id = 'user-alpha'
  AND lower(actor.email) = lower('alpha@example.test')
  AND EXISTS (
    SELECT 1
    FROM workspace_members wm
    WHERE wm.workspace_id = 'ws-alpha'
      AND wm.user_id = actor.id
  )
  AND EXISTS (
    SELECT 1
    FROM projects p
    JOIN workspace_members wm ON wm.workspace_id = p.workspace_id
    WHERE p.id = 'project-alpha'
      AND p.workspace_id = 'ws-alpha'
      AND wm.user_id = actor.id
  );
`;

const FORGED_WORKSPACE_SUBMISSION_SQL = `
.bail on
PRAGMA foreign_keys = ON;

INSERT INTO beta_feedback_submissions (
  id,
  user_id,
  workspace_id,
  project_id,
  user_email,
  feedback_type,
  severity,
  page_path,
  message,
  metadata_json,
  status,
  created_at,
  updated_at
)
SELECT
  'feedback-forged-workspace',
  actor.id,
  'ws-beta',
  'project-beta',
  actor.email,
  'bug',
  'medium',
  '/workshop/projects/project-beta',
  'This forged workspace submission should not persist.',
  '{"source":"workshop_feedback_form"}',
  'new',
  '2026-06-30T00:01:00.000Z',
  '2026-06-30T00:01:00.000Z'
FROM users actor
WHERE actor.id = 'user-alpha'
  AND lower(actor.email) = lower('alpha@example.test')
  AND EXISTS (
    SELECT 1
    FROM workspace_members wm
    WHERE wm.workspace_id = 'ws-beta'
      AND wm.user_id = actor.id
  )
  AND EXISTS (
    SELECT 1
    FROM projects p
    JOIN workspace_members wm ON wm.workspace_id = p.workspace_id
    WHERE p.id = 'project-beta'
      AND p.workspace_id = 'ws-beta'
      AND wm.user_id = actor.id
  );
`;

const MISMATCHED_PROJECT_SUBMISSION_SQL = `
.bail on
PRAGMA foreign_keys = ON;

INSERT INTO beta_feedback_submissions (
  id,
  user_id,
  workspace_id,
  project_id,
  user_email,
  feedback_type,
  severity,
  page_path,
  message,
  metadata_json,
  status,
  created_at,
  updated_at
)
SELECT
  'feedback-mismatched-project',
  actor.id,
  'ws-alpha',
  'project-beta',
  actor.email,
  'bug',
  'medium',
  '/workshop/projects/project-beta',
  'This mismatched project submission should not persist.',
  '{"source":"workshop_feedback_form"}',
  'new',
  '2026-06-30T00:02:00.000Z',
  '2026-06-30T00:02:00.000Z'
FROM users actor
WHERE actor.id = 'user-alpha'
  AND lower(actor.email) = lower('alpha@example.test')
  AND EXISTS (
    SELECT 1
    FROM workspace_members wm
    WHERE wm.workspace_id = 'ws-alpha'
      AND wm.user_id = actor.id
  )
  AND EXISTS (
    SELECT 1
    FROM projects p
    JOIN workspace_members wm ON wm.workspace_id = p.workspace_id
    WHERE p.id = 'project-beta'
      AND p.workspace_id = 'ws-alpha'
      AND wm.user_id = actor.id
  );
`;

const NON_ADMIN_STATUS_UPDATE_SQL = `
.bail on
PRAGMA foreign_keys = ON;

UPDATE beta_feedback_submissions
SET status = 'reviewing',
    updated_at = '2026-06-30T00:03:00.000Z'
WHERE id = 'feedback-alpha-1'
  AND EXISTS (
    SELECT 1
    FROM users actor
    WHERE actor.id = 'user-alpha'
      AND actor.role IN ('admin', 'ceo')
  );
`;

const ADMIN_STATUS_UPDATE_SQL = `
.bail on
PRAGMA foreign_keys = ON;
BEGIN IMMEDIATE;
UPDATE beta_feedback_submissions
SET status = 'reviewing',
    updated_at = '2026-06-30T00:04:00.000Z'
WHERE id = 'feedback-alpha-1'
  AND EXISTS (
    SELECT 1
    FROM users actor
    WHERE actor.id = 'platform-admin'
      AND actor.role IN ('admin', 'ceo')
  );
INSERT INTO beta_feedback_status_events (
  id,
  feedback_id,
  status,
  actor_user_id,
  created_at
)
SELECT
  'status-event-feedback-alpha-1-reviewing-' || lower(hex(randomblob(4))),
  'feedback-alpha-1',
  'reviewing',
  'platform-admin',
  '2026-06-30T00:04:00.000Z'
WHERE EXISTS (
  SELECT 1
  FROM users actor
  WHERE actor.id = 'platform-admin'
    AND actor.role IN ('admin', 'ceo')
)
ON CONFLICT(feedback_id, status) DO NOTHING;
COMMIT;
`;

const ROLLBACK_PROOF_SQL = `
.bail on
PRAGMA foreign_keys = ON;
BEGIN IMMEDIATE;
INSERT INTO beta_feedback_submissions (
  id,
  user_id,
  workspace_id,
  project_id,
  user_email,
  feedback_type,
  severity,
  page_path,
  message,
  metadata_json,
  status,
  created_at,
  updated_at
)
VALUES (
  'feedback-rollback-1',
  'user-alpha',
  'ws-alpha',
  'project-alpha',
  'alpha@example.test',
  'bug',
  'high',
  '/workshop/projects/project-alpha',
  'This row should disappear when the status audit fails.',
  '{"source":"workshop_feedback_form"}',
  'new',
  '2026-06-30T00:05:00.000Z',
  '2026-06-30T00:05:00.000Z'
);
INSERT INTO beta_feedback_status_events (
  id,
  feedback_id,
  status,
  actor_user_id,
  created_at
)
VALUES (
  'status-event-invalid',
  'feedback-rollback-1',
  'deleted',
  'platform-admin',
  '2026-06-30T00:05:00.000Z'
);
COMMIT;
`;

const QUERY_SPECS = [
  {
    surface: "submit_beta_feedback_authz",
    queryBudget: 2,
    plannedQueries: 1,
    localBudgetMs: 100,
    sql: `
      SELECT EXISTS (
        SELECT 1
        FROM users actor
        JOIN workspace_members wm ON wm.user_id = actor.id
        JOIN projects p ON p.workspace_id = wm.workspace_id
        WHERE actor.id = 'user-alpha'
          AND lower(actor.email) = lower('alpha@example.test')
          AND wm.workspace_id = 'ws-alpha'
          AND p.id = 'project-alpha'
      ) AS allowed;
    `,
    notes: "Submission guard stays as one indexed user/workspace/project authorization query before or inside the D1 insert path.",
  },
  {
    surface: "beta_feedback_admin_review_queue",
    queryBudget: 2,
    plannedQueries: 1,
    localBudgetMs: 100,
    sql: `
      SELECT id, created_at, updated_at, feedback_type, severity, status, user_email, workspace_id, project_id, page_path, message
      FROM beta_feedback_submissions
      WHERE status = 'reviewing'
        AND EXISTS (
          SELECT 1
          FROM users actor
          WHERE actor.id = 'platform-admin'
            AND actor.role IN ('admin', 'ceo')
        )
      ORDER BY created_at DESC
      LIMIT 50;
    `,
    notes: "Admin review queue uses the status/created-at index and keeps non-admin filtering in the server-side D1 repository.",
  },
  {
    surface: "beta_feedback_status_update_guard",
    queryBudget: 2,
    plannedQueries: 1,
    localBudgetMs: 100,
    sql: `
      SELECT EXISTS (
        SELECT 1
        FROM users actor
        JOIN beta_feedback_submissions f ON f.id = 'feedback-alpha-1'
        WHERE actor.id = 'platform-admin'
          AND actor.role IN ('admin', 'ceo')
      ) AS allowed;
    `,
    notes: "Status update guard checks platform-admin authority and target existence before the transactional update/audit write.",
  },
] as const;

const PREPARED_STATEMENT_PATTERNS = [
  "INSERT INTO beta_feedback_submissions (...) SELECT ... FROM users actor WHERE actor.id = ? AND lower(actor.email) = lower(?) AND EXISTS (...)",
  "SELECT ... FROM beta_feedback_submissions WHERE status = ? AND EXISTS (SELECT 1 FROM users actor WHERE actor.id = ? AND actor.role IN ('admin', 'ceo')) ORDER BY created_at DESC LIMIT ?",
  "UPDATE beta_feedback_submissions SET status = ?, updated_at = ? WHERE id = ? AND EXISTS (SELECT 1 FROM users actor WHERE actor.id = ? AND actor.role IN ('admin', 'ceo'))",
  "INSERT INTO beta_feedback_status_events (...) VALUES (?, ?, ?, ?, ?) ON CONFLICT(feedback_id, status) DO NOTHING",
];

const PRODUCTION_PROOF_REQUIREMENTS = [
  "Implement the beta-feedback D1 repository against a real Cloudflare D1 binding with prepared statements and typed result models.",
  "Wire the repository behind the current protected feedback Server Actions only after Better Auth identity handoff is production-proven.",
  "Run positive, forged-workspace, mismatched-project, non-admin review, admin update, rollback, and idempotency tests against the Worker runtime.",
  "Capture hosted Worker+D1 query count, p95 duration, rows read/written, and failure telemetry for the feedback submission and review routes.",
  "Run a provider-backed D1 export/restore rehearsal for this slice before treating D1 as the source of truth.",
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

function countSeedRows(databasePath: string) {
  const rows = runSqliteJson<{ rows_seeded: number }>(
    databasePath,
    `
      SELECT
        (SELECT COUNT(*) FROM users)
        + (SELECT COUNT(*) FROM workspaces)
        + (SELECT COUNT(*) FROM workspace_members)
        + (SELECT COUNT(*) FROM projects) AS rows_seeded;
    `,
  );
  return rows[0]?.rows_seeded ?? 0;
}

function buildReviewQueuePlan(databasePath: string) {
  const output = runSqlite(
    [databasePath],
    `
      EXPLAIN QUERY PLAN
      SELECT id, created_at, status
      FROM beta_feedback_submissions
      WHERE status = 'reviewing'
      ORDER BY created_at DESC
      LIMIT 50;
    `,
  );
  const details = output
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && line !== "QUERY PLAN");
  return {
    reviewQueuePlanDetails: details,
    reviewQueuePlanUsesIndex: details.some((detail) => /idx_beta_feedback_status_created_at/i.test(detail)),
  };
}

function dumpDatabase(databasePath: string) {
  return runSqlite([databasePath, ".dump"]);
}

function buildLocalFixtureAndQueries() {
  const tempDir = mkdtempSync(join(tmpdir(), "archestimator-d1-beta-feedback-"));
  const databasePath = join(tempDir, "beta-feedback.db");
  const restoredDatabasePath = join(tempDir, "beta-feedback-restored.db");

  try {
    runSqliteScript(databasePath, FIXTURE_SQL);
    const rowsSeeded = countSeedRows(databasePath);

    runSqliteScript(databasePath, AUTHORIZED_SUBMISSION_SQL);
    runSqliteScript(databasePath, FORGED_WORKSPACE_SUBMISSION_SQL);
    runSqliteScript(databasePath, MISMATCHED_PROJECT_SUBMISSION_SQL);
    runSqliteScript(databasePath, NON_ADMIN_STATUS_UPDATE_SQL);

    const nonAdminStatusRows = runSqliteJson<{ status: string }>(
      databasePath,
      "SELECT status FROM beta_feedback_submissions WHERE id = 'feedback-alpha-1';",
    );

    runSqliteScript(databasePath, ADMIN_STATUS_UPDATE_SQL);
    runSqliteScript(databasePath, ADMIN_STATUS_UPDATE_SQL);

    const rollbackResult = runSqliteAllowFailure([databasePath], ROLLBACK_PROOF_SQL);
    const reviewPlan = buildReviewQueuePlan(databasePath);
    const queryRows = buildQueryProofRows(databasePath);
    const dumpSql = dumpDatabase(databasePath);
    runSqliteScript(restoredDatabasePath, dumpSql);

    const summaryRows = runSqliteJson<{
      feedbackRows: number;
      authorizedSubmissionRows: number;
      forgedWorkspaceRows: number;
      mismatchedProjectRows: number;
      adminQueueRows: number;
      nonAdminQueueRows: number;
      adminStatusAfterUpdate: string | null;
      statusAuditRows: number;
      duplicateStatusAuditRows: number;
      rollbackResidueRows: number;
      restoredFeedbackRows: number;
      restoredStatusAuditRows: number;
    }>(
      databasePath,
      `
        SELECT
          (SELECT COUNT(*) FROM beta_feedback_submissions) AS feedbackRows,
          (SELECT COUNT(*) FROM beta_feedback_submissions WHERE id = 'feedback-alpha-1') AS authorizedSubmissionRows,
          (SELECT COUNT(*) FROM beta_feedback_submissions WHERE id = 'feedback-forged-workspace') AS forgedWorkspaceRows,
          (SELECT COUNT(*) FROM beta_feedback_submissions WHERE id = 'feedback-mismatched-project') AS mismatchedProjectRows,
          (
            SELECT COUNT(*)
            FROM beta_feedback_submissions
            WHERE EXISTS (
              SELECT 1
              FROM users actor
              WHERE actor.id = 'platform-admin'
                AND actor.role IN ('admin', 'ceo')
            )
          ) AS adminQueueRows,
          (
            SELECT COUNT(*)
            FROM beta_feedback_submissions
            WHERE EXISTS (
              SELECT 1
              FROM users actor
              WHERE actor.id = 'user-alpha'
                AND actor.role IN ('admin', 'ceo')
            )
          ) AS nonAdminQueueRows,
          (SELECT status FROM beta_feedback_submissions WHERE id = 'feedback-alpha-1') AS adminStatusAfterUpdate,
          (SELECT COUNT(*) FROM beta_feedback_status_events WHERE feedback_id = 'feedback-alpha-1') AS statusAuditRows,
          (
            SELECT CASE WHEN COUNT(*) > 1 THEN COUNT(*) - 1 ELSE 0 END
            FROM beta_feedback_status_events
            WHERE feedback_id = 'feedback-alpha-1'
              AND status = 'reviewing'
          ) AS duplicateStatusAuditRows,
          (
            (SELECT COUNT(*) FROM beta_feedback_submissions WHERE id = 'feedback-rollback-1')
            + (SELECT COUNT(*) FROM beta_feedback_status_events WHERE feedback_id = 'feedback-rollback-1')
          ) AS rollbackResidueRows,
          (SELECT COUNT(*) FROM main.beta_feedback_submissions) AS restoredFeedbackRows,
          (SELECT COUNT(*) FROM main.beta_feedback_status_events) AS restoredStatusAuditRows;
      `,
    );
    const restoredRows = runSqliteJson<{
      restoredFeedbackRows: number;
      restoredStatusAuditRows: number;
    }>(
      restoredDatabasePath,
      `
        SELECT
          (SELECT COUNT(*) FROM beta_feedback_submissions) AS restoredFeedbackRows,
          (SELECT COUNT(*) FROM beta_feedback_status_events) AS restoredStatusAuditRows;
      `,
    );
    const summary = summaryRows[0] ?? {
      feedbackRows: 0,
      authorizedSubmissionRows: 0,
      forgedWorkspaceRows: Number.POSITIVE_INFINITY,
      mismatchedProjectRows: Number.POSITIVE_INFINITY,
      adminQueueRows: 0,
      nonAdminQueueRows: Number.POSITIVE_INFINITY,
      adminStatusAfterUpdate: null,
      statusAuditRows: 0,
      duplicateStatusAuditRows: Number.POSITIVE_INFINITY,
      rollbackResidueRows: Number.POSITIVE_INFINITY,
      restoredFeedbackRows: 0,
      restoredStatusAuditRows: 0,
    };
    const restoredSummary = restoredRows[0] ?? {
      restoredFeedbackRows: 0,
      restoredStatusAuditRows: 0,
    };

    rmSync(tempDir, { recursive: true, force: true });

    return {
      fixture: {
        sqliteVersion: sqliteVersion(),
        fixtureTables: 6,
        rowsSeeded,
        feedbackRows: summary.feedbackRows,
        authorizedSubmissionRows: summary.authorizedSubmissionRows,
        forgedWorkspaceRows: summary.forgedWorkspaceRows,
        mismatchedProjectRows: summary.mismatchedProjectRows,
        adminQueueRows: summary.adminQueueRows,
        nonAdminQueueRows: summary.nonAdminQueueRows,
        nonAdminStatusAfterDeniedUpdate: nonAdminStatusRows[0]?.status ?? null,
        adminStatusAfterUpdate: summary.adminStatusAfterUpdate,
        statusAuditRows: summary.statusAuditRows,
        duplicateStatusAuditRows: summary.duplicateStatusAuditRows,
        rollbackCommandFailed: rollbackResult.status !== 0,
        rollbackResidueRows: summary.rollbackResidueRows,
        restoredFeedbackRows: restoredSummary.restoredFeedbackRows,
        restoredStatusAuditRows: restoredSummary.restoredStatusAuditRows,
        reviewQueuePlanUsesIndex: reviewPlan.reviewQueuePlanUsesIndex,
        reviewQueuePlanDetails: reviewPlan.reviewQueuePlanDetails,
        tempArtifactsRemoved: true,
      } satisfies BetaFeedbackProofFixture,
      queryRows,
    };
  } catch (error) {
    rmSync(tempDir, { recursive: true, force: true });
    throw error;
  }
}

function buildReadiness(fixture: BetaFeedbackProofFixture, queryRows: QueryProofRow[]) {
  const schemaReady = fixture.fixtureTables === 6
    && fixture.reviewQueuePlanUsesIndex;
  const enumParityReady = BETA_FEEDBACK_TYPES.length === 6
    && BETA_FEEDBACK_SEVERITIES.length === 4
    && BETA_FEEDBACK_STATUSES.join(",") === "new,reviewing,resolved,archived";
  const submissionMutationReady = fixture.authorizedSubmissionRows === 1
    && fixture.feedbackRows === 1;
  const forgedContextDenied = fixture.forgedWorkspaceRows === 0
    && fixture.mismatchedProjectRows === 0;
  const adminReviewReady = fixture.adminQueueRows === 1
    && fixture.nonAdminQueueRows === 0;
  const adminStatusUpdateReady = fixture.nonAdminStatusAfterDeniedUpdate === "new"
    && fixture.adminStatusAfterUpdate === "reviewing"
    && fixture.statusAuditRows === 1;
  const rollbackReady = fixture.rollbackCommandFailed
    && fixture.rollbackResidueRows === 0;
  const idempotencyReady = fixture.statusAuditRows === 1
    && fixture.duplicateStatusAuditRows === 0;
  const queryBudgetReady = queryRows.every((row) => row.status === "local-pass");
  const restoreFixtureReady = fixture.restoredFeedbackRows === fixture.feedbackRows
    && fixture.restoredStatusAuditRows === fixture.statusAuditRows;
  const appLayerAuthzReady = submissionMutationReady
    && forgedContextDenied
    && adminReviewReady
    && adminStatusUpdateReady;

  return {
    schemaReady,
    enumParityReady,
    appLayerAuthzReady,
    submissionMutationReady,
    forgedContextDenied,
    adminReviewReady,
    adminStatusUpdateReady,
    nonAdminReviewDenied: fixture.nonAdminQueueRows === 0 && fixture.nonAdminStatusAfterDeniedUpdate === "new",
    rollbackReady,
    idempotencyReady,
    queryBudgetReady,
    restoreFixtureReady,
    localBetaFeedbackD1SliceReady: schemaReady
      && enumParityReady
      && appLayerAuthzReady
      && rollbackReady
      && idempotencyReady
      && queryBudgetReady
      && restoreFixtureReady,
    productionBetaFeedbackD1Ready: false as const,
  };
}

function buildBlockers(readiness: CloudflareD1BetaFeedbackProofReport["readiness"]) {
  const blockers: string[] = [];
  if (!readiness.schemaReady) blockers.push("Local beta-feedback D1 schema/index/query-plan proof failed.");
  if (!readiness.enumParityReady) blockers.push("D1 beta-feedback enum/check constraints do not match current app model.");
  if (!readiness.appLayerAuthzReady) blockers.push("Local app-layer authorization proof for beta feedback failed.");
  if (!readiness.rollbackReady) blockers.push("Local rollback proof left residue or did not fail as expected.");
  if (!readiness.idempotencyReady) blockers.push("Local admin status update idempotency proof allowed duplicate audit side effects.");
  if (!readiness.queryBudgetReady) blockers.push("Local beta-feedback D1 query-budget/p95 proof failed.");
  if (!readiness.restoreFixtureReady) blockers.push("Local beta-feedback export/restore fixture did not round-trip.");
  blockers.push("Hosted Worker+D1 beta-feedback proof is still missing.");
  blockers.push("Better Auth production identity handoff is still missing; keep current Supabase-backed Server Actions live.");
  return blockers;
}

export function buildCloudflareD1BetaFeedbackProof(
  inputs: BetaFeedbackProofInputs = {},
): CloudflareD1BetaFeedbackProofReport {
  const built = inputs.fixture && inputs.queryRows
    ? { fixture: inputs.fixture, queryRows: inputs.queryRows }
    : buildLocalFixtureAndQueries();
  const readiness = buildReadiness(built.fixture, built.queryRows);

  return {
    generatedAt: inputs.generatedAt ?? new Date().toISOString(),
    mode: "cloudflare-d1-beta-feedback-proof",
    sources: {
      plan: ".ai/03_plans/2026-06-29-Cloudflare-Migration-Codex/27_PROOF_SPIKE_BACKLOG.md",
      currentAppFiles: [
        "src/lib/workshop/beta-feedback.ts",
        "src/lib/workshop/beta-feedback-actions.ts",
        "src/lib/workshop/beta-feedback-review.ts",
        "src/lib/workshop/beta-feedback-review-actions.ts",
      ],
      currentSupabaseMigrations: [
        "supabase/migrations/20260602083000_beta_feedback_submissions.sql",
        "supabase/migrations/20260602084500_beta_feedback_review_queue.sql",
        "supabase/migrations/20260603191535_harden_beta_feedback_context.sql",
      ],
      d1DatabaseApi: "https://developers.cloudflare.com/d1/worker-api/d1-database/",
    },
    readiness,
    localOnly: true,
    providerBacked: false,
    fixture: built.fixture,
    queryProof: {
      rows: built.queryRows,
    },
    d1RewriteStrategy: {
      typeStrategy:
        "Custom typed repository models mirror src/lib/workshop/beta-feedback.ts enum unions and SQLite CHECK constraints until a broader D1 type-generation strategy is selected.",
      preparedStatementPatterns: PREPARED_STATEMENT_PATTERNS,
    },
    productionProofRequirements: PRODUCTION_PROOF_REQUIREMENTS,
    blockers: buildBlockers(readiness),
    note:
      "Local-only D1 beta-feedback domain proof. It uses sanitized temporary SQLite tables to model the current protected feedback submission, forged-context denial, platform-admin review queue, admin-only status update, rollback, idempotency, query-budget, index-plan, and export/restore behavior. It does not read env files, call provider APIs, create hosted D1 databases, deploy Workers, replace Supabase-backed live Server Actions, change DNS, bill, or make production D1/Auth/Realtime ready.",
  };
}

function writeOutput(outputFile: string, report: CloudflareD1BetaFeedbackProofReport) {
  const outputPath = resolve(outputFile);
  mkdirSync(dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, `${JSON.stringify(report, null, 2)}\n`);
}

function markdownRows(rows: string[][]) {
  return rows.map((row) => `| ${row.map((cell) => cell.replaceAll("|", "\\|")).join(" | ")} |`);
}

export function writeMarkdown(report: CloudflareD1BetaFeedbackProofReport, markdownFile: string) {
  const outputPath = resolve(markdownFile);
  mkdirSync(dirname(outputPath), { recursive: true });
  const queryRows = report.queryProof.rows.map((row) => [
    row.surface,
    `${row.plannedQueries}/${row.queryBudget}`,
    `${row.localP95Ms}ms/${row.localBudgetMs}ms`,
    String(row.rowsReturned),
    row.status,
    row.notes,
  ]);
  const sourceLines = [
    ...report.sources.currentAppFiles,
    ...report.sources.currentSupabaseMigrations,
  ].map((source) => `- ${source}`);
  const requirementLines = report.productionProofRequirements.map((item) => `- ${item}`);
  const blockerLines = report.blockers.length > 0
    ? report.blockers.map((blocker) => `- ${blocker}`)
    : ["- (none)"];
  const preparedStatementLines = report.d1RewriteStrategy.preparedStatementPatterns.map((item) => `- \`${item}\``);
  const planLines = report.fixture.reviewQueuePlanDetails.length > 0
    ? report.fixture.reviewQueuePlanDetails.map((item) => `- ${item}`)
    : ["- (none)"];

  const lines = [
    "# Cloudflare D1 Beta Feedback Proof",
    "",
    `Generated: ${report.generatedAt}`,
    "",
    report.note,
    "",
    "## Summary",
    "",
    "| Gate | Ready |",
    "| --- | --- |",
    `| Schema ready | ${report.readiness.schemaReady ? "yes" : "no"} |`,
    `| Enum parity ready | ${report.readiness.enumParityReady ? "yes" : "no"} |`,
    `| App-layer authz ready | ${report.readiness.appLayerAuthzReady ? "yes" : "no"} |`,
    `| Submission mutation ready | ${report.readiness.submissionMutationReady ? "yes" : "no"} |`,
    `| Forged context denied | ${report.readiness.forgedContextDenied ? "yes" : "no"} |`,
    `| Admin review ready | ${report.readiness.adminReviewReady ? "yes" : "no"} |`,
    `| Admin status update ready | ${report.readiness.adminStatusUpdateReady ? "yes" : "no"} |`,
    `| Non-admin review denied | ${report.readiness.nonAdminReviewDenied ? "yes" : "no"} |`,
    `| Rollback ready | ${report.readiness.rollbackReady ? "yes" : "no"} |`,
    `| Idempotency ready | ${report.readiness.idempotencyReady ? "yes" : "no"} |`,
    `| Query budget ready | ${report.readiness.queryBudgetReady ? "yes" : "no"} |`,
    `| Restore fixture ready | ${report.readiness.restoreFixtureReady ? "yes" : "no"} |`,
    `| Local beta-feedback D1 slice ready | ${report.readiness.localBetaFeedbackD1SliceReady ? "yes" : "no"} |`,
    `| Production beta-feedback D1 ready | ${report.readiness.productionBetaFeedbackD1Ready ? "yes" : "no"} |`,
    `| Local-only proof | ${report.localOnly ? "yes" : "no"} |`,
    `| Provider-backed D1 proof | ${report.providerBacked ? "yes" : "no"} |`,
    "",
    "## Local Fixture",
    "",
    "| Item | Value |",
    "| --- | ---: |",
    `| SQLite version | ${report.fixture.sqliteVersion} |`,
    `| Fixture tables | ${report.fixture.fixtureTables} |`,
    `| Seed rows | ${report.fixture.rowsSeeded} |`,
    `| Feedback rows | ${report.fixture.feedbackRows} |`,
    `| Authorized submission rows | ${report.fixture.authorizedSubmissionRows} |`,
    `| Forged workspace rows | ${report.fixture.forgedWorkspaceRows} |`,
    `| Mismatched project rows | ${report.fixture.mismatchedProjectRows} |`,
    `| Admin queue rows | ${report.fixture.adminQueueRows} |`,
    `| Non-admin queue rows | ${report.fixture.nonAdminQueueRows} |`,
    `| Non-admin status after denied update | ${report.fixture.nonAdminStatusAfterDeniedUpdate ?? "(missing)"} |`,
    `| Admin status after update | ${report.fixture.adminStatusAfterUpdate ?? "(missing)"} |`,
    `| Status audit rows | ${report.fixture.statusAuditRows} |`,
    `| Duplicate status audit rows | ${report.fixture.duplicateStatusAuditRows} |`,
    `| Rollback command failed as expected | ${report.fixture.rollbackCommandFailed ? "yes" : "no"} |`,
    `| Rollback residue rows | ${report.fixture.rollbackResidueRows} |`,
    `| Restored feedback rows | ${report.fixture.restoredFeedbackRows} |`,
    `| Restored status audit rows | ${report.fixture.restoredStatusAuditRows} |`,
    `| Review queue plan uses index | ${report.fixture.reviewQueuePlanUsesIndex ? "yes" : "no"} |`,
    `| Temp artifacts removed | ${report.fixture.tempArtifactsRemoved ? "yes" : "no"} |`,
    "",
    "## Query Proof",
    "",
    "| Surface | Planned/query budget | Local p95/budget | Rows returned | Status | Notes |",
    "| --- | ---: | ---: | ---: | --- | --- |",
    ...markdownRows(queryRows),
    "",
    "## Review Queue Query Plan",
    "",
    ...planLines,
    "",
    "## D1 Rewrite Strategy",
    "",
    report.d1RewriteStrategy.typeStrategy,
    "",
    "Prepared statement patterns:",
    "",
    ...preparedStatementLines,
    "",
    "## Sources",
    "",
    ...sourceLines,
    "",
    "## Production Proof Requirements",
    "",
    ...requirementLines,
    "",
    "## Blockers",
    "",
    ...blockerLines,
    "",
  ];
  writeFileSync(outputPath, lines.join("\n"));
}

async function main() {
  const report = buildCloudflareD1BetaFeedbackProof();
  const outputFile = readEnv("OUTPUT_FILE") ?? `${PLAN_ROOT}/2026-06-30-cloudflare-d1-beta-feedback-proof.json`;
  const markdownFile = readEnv("MARKDOWN_FILE") ?? `${PLAN_ROOT}/2026-06-30-cloudflare-d1-beta-feedback-proof.md`;
  writeOutput(outputFile, report);
  writeMarkdown(report, markdownFile);
  console.log(JSON.stringify(report, null, 2));
  if (!report.readiness.localBetaFeedbackD1SliceReady) process.exitCode = 1;
}

if (import.meta.main) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
