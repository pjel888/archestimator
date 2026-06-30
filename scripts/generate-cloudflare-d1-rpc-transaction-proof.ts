#!/usr/bin/env bun

import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";

type LocalRpcMechanicsStatus = "local-pass" | "local-fail" | "not-applicable";

type LocalRpcMechanicsRow = {
  surface: string;
  rpcDomains: string[];
  transactionProof: LocalRpcMechanicsStatus;
  rollbackProof: LocalRpcMechanicsStatus;
  idempotencyProof: LocalRpcMechanicsStatus;
  evidence: string;
};

type LocalRpcMechanicsFixture = {
  sqliteVersion: string;
  fixtureTables: number;
  coveredPatternCount: number;
  coveredRpcDomains: string[];
  committedMutationRows: number;
  committedHistoryRows: number;
  committedJournalRows: number;
  rollbackCommandFailed: boolean;
  rollbackResidueRows: number;
  idempotentEffectRows: number;
  duplicateSideEffects: number;
  tempArtifactsRemoved: boolean;
  rows: LocalRpcMechanicsRow[];
};

type RpcTransactionProofInputs = {
  generatedAt?: string;
  fixture?: LocalRpcMechanicsFixture;
};

export type CloudflareD1RpcTransactionProofReport = {
  generatedAt: string;
  mode: "cloudflare-d1-rpc-transaction-proof";
  sources: {
    plan: string;
    localFixture: string;
    d1DatabaseApi: string;
  };
  localTransactionMechanicsReady: boolean;
  localRollbackMechanicsReady: boolean;
  localIdempotencyMechanicsReady: boolean;
  localRpcMechanicsProofReady: boolean;
  productionRpcRewriteReady: false;
  localOnly: true;
  providerBacked: false;
  fixture: LocalRpcMechanicsFixture;
  productionProofRequirements: string[];
  blockers: string[];
  note: string;
};

const PLAN_ROOT = ".ai/03_plans/2026-06-29-Cloudflare-Migration-Codex/evidence";

const FIXTURE_SQL = `
.bail on
PRAGMA foreign_keys = ON;

CREATE TABLE workspaces (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL
);

CREATE TABLE estimates (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL
);

CREATE TABLE estimate_rows (
  id TEXT PRIMARY KEY,
  estimate_id TEXT NOT NULL REFERENCES estimates(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  amount_cents INTEGER NOT NULL
);

CREATE TABLE estimate_history (
  id TEXT PRIMARY KEY,
  estimate_id TEXT NOT NULL REFERENCES estimates(id) ON DELETE CASCADE,
  mutation_key TEXT NOT NULL UNIQUE,
  event_type TEXT NOT NULL
);

CREATE TABLE mutation_journal (
  id TEXT PRIMARY KEY,
  correlation_key TEXT NOT NULL UNIQUE,
  operation TEXT NOT NULL
);

CREATE TABLE upload_assets (
  id TEXT PRIMARY KEY,
  object_key TEXT NOT NULL UNIQUE,
  checksum TEXT NOT NULL,
  idempotency_key TEXT NOT NULL UNIQUE
);

CREATE TABLE collaboration_invitations (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  recipient_email TEXT NOT NULL,
  token_hash TEXT NOT NULL UNIQUE,
  accepted_at TEXT
);

CREATE TABLE deletion_jobs (
  id TEXT PRIMARY KEY,
  correlation_key TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL
);

INSERT INTO workspaces (id, name) VALUES ('ws-alpha', 'Alpha Workshop');
INSERT INTO estimates (id, workspace_id, name) VALUES ('estimate-alpha', 'ws-alpha', 'Alpha Estimate');
INSERT INTO estimate_rows (id, estimate_id, description, amount_cents)
VALUES ('row-seed', 'estimate-alpha', 'Seed row', 1000);
`;

const COMMIT_PROOF_SQL = `
.bail on
PRAGMA foreign_keys = ON;
BEGIN IMMEDIATE;
INSERT INTO estimate_rows (id, estimate_id, description, amount_cents)
VALUES ('row-commit-1', 'estimate-alpha', 'Committed row', 2500);
INSERT INTO estimate_history (id, estimate_id, mutation_key, event_type)
VALUES ('history-commit-1', 'estimate-alpha', 'mutation-commit-1', 'insert_row');
INSERT INTO mutation_journal (id, correlation_key, operation)
VALUES ('journal-commit-1', 'correlation-commit-1', 'insert_estimate_row_item_with_history');
COMMIT;
`;

const ROLLBACK_PROOF_SQL = `
.bail on
PRAGMA foreign_keys = ON;
BEGIN IMMEDIATE;
INSERT INTO estimate_rows (id, estimate_id, description, amount_cents)
VALUES ('row-rollback-1', 'estimate-alpha', 'Rollback row', 5000);
INSERT INTO estimate_history (id, estimate_id, mutation_key, event_type)
VALUES ('history-rollback-1', 'estimate-alpha', 'mutation-rollback-1', 'insert_row');
INSERT INTO mutation_journal (id, correlation_key, operation)
VALUES ('journal-rollback-1', 'correlation-rollback-1', 'insert_estimate_row_item_with_history');
INSERT INTO estimate_rows (id, estimate_id, description, amount_cents)
VALUES ('row-invalid-fk', 'missing-estimate', 'Invalid row should abort transaction', 9999);
COMMIT;
`;

const IDEMPOTENCY_PROOF_SQL = `
.bail on
PRAGMA foreign_keys = ON;

INSERT INTO upload_assets (id, object_key, checksum, idempotency_key)
VALUES ('asset-upload-1', 'uploads/ws-alpha/file.webp', 'checksum-alpha', 'upload-key-1')
ON CONFLICT(idempotency_key) DO NOTHING;

INSERT INTO upload_assets (id, object_key, checksum, idempotency_key)
VALUES ('asset-upload-duplicate', 'uploads/ws-alpha/file-duplicate.webp', 'checksum-alpha', 'upload-key-1')
ON CONFLICT(idempotency_key) DO NOTHING;

INSERT INTO collaboration_invitations (id, project_id, recipient_email, token_hash, accepted_at)
VALUES ('invite-1', 'project-alpha', 'client@example.test', 'token-hash-1', '2026-06-30T00:00:00Z')
ON CONFLICT(token_hash) DO UPDATE SET accepted_at = COALESCE(collaboration_invitations.accepted_at, excluded.accepted_at);

INSERT INTO collaboration_invitations (id, project_id, recipient_email, token_hash, accepted_at)
VALUES ('invite-duplicate', 'project-alpha', 'client@example.test', 'token-hash-1', '2026-06-30T00:05:00Z')
ON CONFLICT(token_hash) DO UPDATE SET accepted_at = COALESCE(collaboration_invitations.accepted_at, excluded.accepted_at);

INSERT INTO deletion_jobs (id, correlation_key, status)
VALUES ('delete-job-1', 'delete-key-1', 'completed')
ON CONFLICT(correlation_key) DO NOTHING;

INSERT INTO deletion_jobs (id, correlation_key, status)
VALUES ('delete-job-duplicate', 'delete-key-1', 'completed')
ON CONFLICT(correlation_key) DO NOTHING;
`;

const PRODUCTION_PROOF_REQUIREMENTS = [
  "Replace each remaining mutating Supabase RPC with a D1 service path that references this transaction/rollback/idempotency pattern or an equally specific proof.",
  "Add golden before/after fixtures and fail-closed rollback tests for each transaction-sensitive RPC row in cf:d1-rpc-map.",
  "Add retry/correlation-key or natural-unique-constraint proof for each idempotency-sensitive RPC row in cf:d1-rpc-map.",
  "Run the mutation proof against the Cloudflare Worker runtime with a bound D1 database before production cutover.",
  "Keep authorization checks, audit/history rows, and destructive-operation cleanup journals inside the tested mutation boundary.",
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

function buildRows(summary: {
  committedMutationRows: number;
  committedHistoryRows: number;
  committedJournalRows: number;
  rollbackCommandFailed: boolean;
  rollbackResidueRows: number;
  uploadRows: number;
  uploadDuplicateRows: number;
  invitationRows: number;
  invitationDuplicateRows: number;
  deletionJobRows: number;
  deletionJobDuplicateRows: number;
}): LocalRpcMechanicsRow[] {
  const transactionPass = summary.committedMutationRows === 1
    && summary.committedHistoryRows === 1
    && summary.committedJournalRows === 1;
  const rollbackPass = summary.rollbackCommandFailed && summary.rollbackResidueRows === 0;
  const uploadIdempotencyPass = summary.uploadRows === 1 && summary.uploadDuplicateRows === 0;
  const invitationIdempotencyPass = summary.invitationRows === 1 && summary.invitationDuplicateRows === 0;
  const deletionIdempotencyPass = summary.deletionJobRows === 1 && summary.deletionJobDuplicateRows === 0;

  return [
    {
      surface: "estimate_history_atomic_mutation",
      rpcDomains: ["estimate-history", "component-library"],
      transactionProof: transactionPass ? "local-pass" : "local-fail",
      rollbackProof: rollbackPass ? "local-pass" : "local-fail",
      idempotencyProof: "not-applicable",
      evidence: `committedRows=${summary.committedMutationRows}, committedHistory=${summary.committedHistoryRows}, committedJournal=${summary.committedJournalRows}, rollbackResidue=${summary.rollbackResidueRows}`,
    },
    {
      surface: "upload_metadata_idempotency",
      rpcDomains: ["uploads"],
      transactionProof: "not-applicable",
      rollbackProof: "not-applicable",
      idempotencyProof: uploadIdempotencyPass ? "local-pass" : "local-fail",
      evidence: `uploadRows=${summary.uploadRows}, duplicateUploadRows=${summary.uploadDuplicateRows}`,
    },
    {
      surface: "collaboration_invitation_token_idempotency",
      rpcDomains: ["collaboration", "publication"],
      transactionProof: "not-applicable",
      rollbackProof: "not-applicable",
      idempotencyProof: invitationIdempotencyPass ? "local-pass" : "local-fail",
      evidence: `invitationRows=${summary.invitationRows}, duplicateInvitationRows=${summary.invitationDuplicateRows}`,
    },
    {
      surface: "bulk_delete_journal_idempotency",
      rpcDomains: ["bulk-delete", "activity-audit"],
      transactionProof: "not-applicable",
      rollbackProof: "not-applicable",
      idempotencyProof: deletionIdempotencyPass ? "local-pass" : "local-fail",
      evidence: `deletionJobRows=${summary.deletionJobRows}, duplicateDeletionJobRows=${summary.deletionJobDuplicateRows}`,
    },
  ];
}

function buildLocalRpcMechanicsFixture(): LocalRpcMechanicsFixture {
  const tempDir = mkdtempSync(join(tmpdir(), "archestimator-d1-rpc-proof-"));
  const databasePath = join(tempDir, "rpc-proof.db");

  try {
    runSqliteScript(databasePath, FIXTURE_SQL);
    runSqliteScript(databasePath, COMMIT_PROOF_SQL);
    const rollbackResult = runSqliteAllowFailure([databasePath], ROLLBACK_PROOF_SQL);
    runSqliteScript(databasePath, IDEMPOTENCY_PROOF_SQL);

    const rows = runSqliteJson<{
      committedMutationRows: number;
      committedHistoryRows: number;
      committedJournalRows: number;
      rollbackResidueRows: number;
      uploadRows: number;
      uploadDuplicateRows: number;
      invitationRows: number;
      invitationDuplicateRows: number;
      deletionJobRows: number;
      deletionJobDuplicateRows: number;
    }>(
      databasePath,
      `
        SELECT
          (SELECT COUNT(*) FROM estimate_rows WHERE id = 'row-commit-1') AS committedMutationRows,
          (SELECT COUNT(*) FROM estimate_history WHERE id = 'history-commit-1') AS committedHistoryRows,
          (SELECT COUNT(*) FROM mutation_journal WHERE id = 'journal-commit-1') AS committedJournalRows,
          (
            (SELECT COUNT(*) FROM estimate_rows WHERE id IN ('row-rollback-1', 'row-invalid-fk'))
            + (SELECT COUNT(*) FROM estimate_history WHERE id = 'history-rollback-1')
            + (SELECT COUNT(*) FROM mutation_journal WHERE id = 'journal-rollback-1')
          ) AS rollbackResidueRows,
          (SELECT COUNT(*) FROM upload_assets WHERE idempotency_key = 'upload-key-1') AS uploadRows,
          (SELECT COUNT(*) FROM upload_assets WHERE id = 'asset-upload-duplicate') AS uploadDuplicateRows,
          (SELECT COUNT(*) FROM collaboration_invitations WHERE token_hash = 'token-hash-1') AS invitationRows,
          (SELECT COUNT(*) FROM collaboration_invitations WHERE id = 'invite-duplicate') AS invitationDuplicateRows,
          (SELECT COUNT(*) FROM deletion_jobs WHERE correlation_key = 'delete-key-1') AS deletionJobRows,
          (SELECT COUNT(*) FROM deletion_jobs WHERE id = 'delete-job-duplicate') AS deletionJobDuplicateRows;
      `,
    );
    const summary = rows[0] ?? {
      committedMutationRows: 0,
      committedHistoryRows: 0,
      committedJournalRows: 0,
      rollbackResidueRows: Number.POSITIVE_INFINITY,
      uploadRows: 0,
      uploadDuplicateRows: Number.POSITIVE_INFINITY,
      invitationRows: 0,
      invitationDuplicateRows: Number.POSITIVE_INFINITY,
      deletionJobRows: 0,
      deletionJobDuplicateRows: Number.POSITIVE_INFINITY,
    };
    const proofRows = buildRows({
      ...summary,
      rollbackCommandFailed: rollbackResult.status !== 0,
    });
    const duplicateSideEffects = summary.uploadDuplicateRows
      + summary.invitationDuplicateRows
      + summary.deletionJobDuplicateRows;
    rmSync(tempDir, { recursive: true, force: true });

    return {
      sqliteVersion: sqliteVersion(),
      fixtureTables: 9,
      coveredPatternCount: proofRows.length,
      coveredRpcDomains: Array.from(new Set(proofRows.flatMap((row) => row.rpcDomains))).sort(),
      committedMutationRows: summary.committedMutationRows,
      committedHistoryRows: summary.committedHistoryRows,
      committedJournalRows: summary.committedJournalRows,
      rollbackCommandFailed: rollbackResult.status !== 0,
      rollbackResidueRows: summary.rollbackResidueRows,
      idempotentEffectRows: summary.uploadRows + summary.invitationRows + summary.deletionJobRows,
      duplicateSideEffects,
      tempArtifactsRemoved: true,
      rows: proofRows,
    };
  } catch (error) {
    rmSync(tempDir, { recursive: true, force: true });
    throw error;
  }
}

function buildBlockers(report: Pick<CloudflareD1RpcTransactionProofReport,
  "localRpcMechanicsProofReady" | "localTransactionMechanicsReady" | "localRollbackMechanicsReady" | "localIdempotencyMechanicsReady"
>) {
  const blockers: string[] = [];
  if (!report.localTransactionMechanicsReady) blockers.push("Local all-or-nothing mutation transaction proof failed.");
  if (!report.localRollbackMechanicsReady) blockers.push("Local rollback/fail-closed proof left residue or did not fail as expected.");
  if (!report.localIdempotencyMechanicsReady) blockers.push("Local idempotency proof allowed duplicate side effects.");
  if (report.localRpcMechanicsProofReady) {
    blockers.push("Per-RPC D1 rewrite references are still incomplete; cf:d1-rpc-map remains the production gate.");
    blockers.push("Hosted Worker+D1 mutation/rollback/idempotency proof is still missing.");
  }
  return blockers;
}

export function buildCloudflareD1RpcTransactionProof(
  inputs: RpcTransactionProofInputs = {},
): CloudflareD1RpcTransactionProofReport {
  const fixture = inputs.fixture ?? buildLocalRpcMechanicsFixture();
  const localTransactionMechanicsReady = fixture.committedMutationRows === 1
    && fixture.committedHistoryRows === 1
    && fixture.committedJournalRows === 1;
  const localRollbackMechanicsReady = fixture.rollbackCommandFailed
    && fixture.rollbackResidueRows === 0;
  const localIdempotencyMechanicsReady = fixture.idempotentEffectRows === 3
    && fixture.duplicateSideEffects === 0;
  const localRpcMechanicsProofReady = localTransactionMechanicsReady
    && localRollbackMechanicsReady
    && localIdempotencyMechanicsReady
    && fixture.rows.every((row) => (
      row.transactionProof !== "local-fail"
      && row.rollbackProof !== "local-fail"
      && row.idempotencyProof !== "local-fail"
    ));
  const partialReport = {
    localTransactionMechanicsReady,
    localRollbackMechanicsReady,
    localIdempotencyMechanicsReady,
    localRpcMechanicsProofReady,
  };

  return {
    generatedAt: inputs.generatedAt ?? new Date().toISOString(),
    mode: "cloudflare-d1-rpc-transaction-proof",
    sources: {
      plan: ".ai/03_plans/2026-06-29-Cloudflare-Migration-Codex/23_D1_AUTH_REALTIME_REDESIGN_PLAN.md",
      localFixture: "Temporary sqlite3 fixture generated by this script from sanitized schema/data constants.",
      d1DatabaseApi: "https://developers.cloudflare.com/d1/worker-api/d1-database/",
    },
    ...partialReport,
    productionRpcRewriteReady: false,
    localOnly: true,
    providerBacked: false,
    fixture,
    productionProofRequirements: PRODUCTION_PROOF_REQUIREMENTS,
    blockers: buildBlockers(partialReport),
    note:
      "Local-only D1 RPC transaction mechanics proof. It uses sanitized temporary SQLite tables to prove all-or-nothing writes, rollback with no residue, and uniqueness/correlation-key idempotency for representative mutating RPC domains. It does not read env files, call provider APIs, create hosted D1 databases, deploy Workers, rewrite every Supabase RPC, or make production D1/Auth/Realtime ready.",
  };
}

function writeOutput(outputFile: string, report: CloudflareD1RpcTransactionProofReport) {
  const outputPath = resolve(outputFile);
  mkdirSync(dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, `${JSON.stringify(report, null, 2)}\n`);
}

function markdownRows(rows: string[][]) {
  return rows.map((row) => `| ${row.map((cell) => cell.replaceAll("|", "\\|")).join(" | ")} |`);
}

export function writeMarkdown(report: CloudflareD1RpcTransactionProofReport, markdownFile: string) {
  const outputPath = resolve(markdownFile);
  mkdirSync(dirname(outputPath), { recursive: true });
  const proofRows = report.fixture.rows.map((row) => [
    row.surface,
    row.rpcDomains.join(", "),
    row.transactionProof,
    row.rollbackProof,
    row.idempotencyProof,
    row.evidence,
  ]);
  const requirementLines = report.productionProofRequirements.map((item) => `- ${item}`);
  const blockerLines = report.blockers.length > 0
    ? report.blockers.map((blocker) => `- ${blocker}`)
    : ["- (none)"];
  const lines = [
    "# Cloudflare D1 RPC Transaction Proof",
    "",
    `Generated: ${report.generatedAt}`,
    "",
    report.note,
    "",
    "## Summary",
    "",
    "| Gate | Ready |",
    "| --- | --- |",
    `| Local transaction mechanics ready | ${report.localTransactionMechanicsReady ? "yes" : "no"} |`,
    `| Local rollback mechanics ready | ${report.localRollbackMechanicsReady ? "yes" : "no"} |`,
    `| Local idempotency mechanics ready | ${report.localIdempotencyMechanicsReady ? "yes" : "no"} |`,
    `| Local RPC mechanics proof ready | ${report.localRpcMechanicsProofReady ? "yes" : "no"} |`,
    `| Production RPC rewrite ready | ${report.productionRpcRewriteReady ? "yes" : "no"} |`,
    `| Local-only proof | ${report.localOnly ? "yes" : "no"} |`,
    `| Provider-backed D1 proof | ${report.providerBacked ? "yes" : "no"} |`,
    "",
    "## Local Fixture",
    "",
    "| Item | Value |",
    "| --- | ---: |",
    `| SQLite version | ${report.fixture.sqliteVersion} |`,
    `| Fixture tables | ${report.fixture.fixtureTables} |`,
    `| Covered pattern count | ${report.fixture.coveredPatternCount} |`,
    `| Covered RPC domains | ${report.fixture.coveredRpcDomains.join(", ")} |`,
    `| Committed mutation rows | ${report.fixture.committedMutationRows} |`,
    `| Committed history rows | ${report.fixture.committedHistoryRows} |`,
    `| Committed journal rows | ${report.fixture.committedJournalRows} |`,
    `| Rollback command failed as expected | ${report.fixture.rollbackCommandFailed ? "yes" : "no"} |`,
    `| Rollback residue rows | ${report.fixture.rollbackResidueRows} |`,
    `| Idempotent effect rows | ${report.fixture.idempotentEffectRows} |`,
    `| Duplicate side effects | ${report.fixture.duplicateSideEffects} |`,
    `| Temp artifacts removed | ${report.fixture.tempArtifactsRemoved ? "yes" : "no"} |`,
    "",
    "## Proof Surfaces",
    "",
    "| Surface | RPC domains | Transaction | Rollback | Idempotency | Evidence |",
    "| --- | --- | --- | --- | --- | --- |",
    ...markdownRows(proofRows),
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
  const report = buildCloudflareD1RpcTransactionProof();
  const outputFile = readEnv("OUTPUT_FILE") ?? `${PLAN_ROOT}/2026-06-30-cloudflare-d1-rpc-transaction-proof.json`;
  const markdownFile = readEnv("MARKDOWN_FILE") ?? `${PLAN_ROOT}/2026-06-30-cloudflare-d1-rpc-transaction-proof.md`;
  writeOutput(outputFile, report);
  writeMarkdown(report, markdownFile);
  console.log(JSON.stringify(report, null, 2));
  if (!report.localRpcMechanicsProofReady) process.exitCode = 1;
}

if (import.meta.main) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
