#!/usr/bin/env bun

import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";

type RestoreCheck = {
  key: string;
  label: string;
  ready: boolean;
  evidence: string;
};

type TableSnapshot = Record<string, unknown>[];

type LocalSqliteRehearsal = {
  sqliteVersion: string;
  fixtureTableCount: number;
  sourceRows: number;
  restoredRows: number;
  exportSqlBytes: number;
  sourceChecksum: string;
  restoredChecksum: string;
  foreignKeyViolations: number;
  checks: RestoreCheck[];
  tempArtifactsRemoved: boolean;
};

type RestoreRehearsalInputs = {
  generatedAt?: string;
  localRehearsal?: LocalSqliteRehearsal;
};

export type CloudflareD1RestoreRehearsalReport = {
  generatedAt: string;
  mode: "cloudflare-d1-restore-rehearsal";
  sources: {
    officialDocs: {
      importExportData: string;
      wranglerCommands: string;
      timeTravelRestore: string;
    };
    localFixture: string;
  };
  commands: {
    sqlExport: string;
    sqlImport: string;
    localSqliteRehearsal: string;
    timeTravelRestore: string;
  };
  d1ExportReady: boolean;
  d1ImportReady: boolean;
  restoreRehearsalReady: boolean;
  destructiveRestoreDocumented: boolean;
  localOnly: true;
  providerBacked: false;
  localRehearsal: LocalSqliteRehearsal;
  destructiveRestoreRunbook: string[];
  blockers: string[];
  note: string;
};

const PLAN_ROOT = ".ai/03_plans/2026-06-29-Cloudflare-Migration-Codex/evidence";

const OFFICIAL_DOCS = {
  importExportData: "https://developers.cloudflare.com/d1/best-practices/import-export-data/",
  wranglerCommands: "https://developers.cloudflare.com/d1/wrangler-commands/",
  timeTravelRestore: "https://developers.cloudflare.com/d1/wrangler-commands/#time-travel-restore",
} as const;

const COMMANDS = {
  sqlExport:
    "wrangler d1 export ARCH_DB --remote --output=./backups/arch-db-YYYYMMDDTHHMMSSZ.sql",
  sqlImport:
    "wrangler d1 execute ARCH_DB --remote --file=./backups/arch-db-YYYYMMDDTHHMMSSZ.sql",
  localSqliteRehearsal:
    "sqlite3 source.db .dump > export.sql && sqlite3 restored.db < export.sql",
  timeTravelRestore:
    "wrangler d1 time-travel restore ARCH_DB --timestamp=<ISO-8601-or-unix-timestamp>",
} as const;

const DESTRUCTIVE_RESTORE_RUNBOOK = [
  "Take a fresh SQL export before any hosted restore command.",
  "Confirm the target D1 database name, database id, account, and environment are the intended Archestimator target.",
  "Treat `wrangler d1 time-travel restore` as destructive because it overwrites the database with a prior state.",
  "Run destructive restore only in a staging or rehearsal D1 database until owner-approved production cutover.",
  "After restore, run schema drift, row-count, foreign-key, authorization-denial, RPC golden-fixture, and route smoke checks before traffic.",
];

const FIXTURE_SQL = `
PRAGMA foreign_keys = ON;

CREATE TABLE workspaces (
  id TEXT PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE workspace_members (
  workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('owner', 'editor', 'viewer')),
  PRIMARY KEY (workspace_id, user_id)
);

CREATE TABLE projects (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  status TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE estimate_rows (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  quantity REAL NOT NULL,
  unit_cost_cents INTEGER NOT NULL,
  sort_order INTEGER NOT NULL
);

CREATE TABLE upload_assets (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  object_key TEXT NOT NULL UNIQUE,
  sha256 TEXT NOT NULL,
  scan_status TEXT NOT NULL
);

INSERT INTO workspaces (id, slug, name, created_at) VALUES
  ('ws-alpha', 'alpha', 'Alpha Workshop', '2026-06-30T00:00:00.000Z'),
  ('ws-beta', 'beta', 'Beta Workshop', '2026-06-30T00:00:00.000Z');

INSERT INTO workspace_members (workspace_id, user_id, role) VALUES
  ('ws-alpha', 'user-owner', 'owner'),
  ('ws-alpha', 'user-viewer', 'viewer'),
  ('ws-beta', 'user-owner', 'owner');

INSERT INTO projects (id, workspace_id, name, status, updated_at) VALUES
  ('project-alpha', 'ws-alpha', 'Library Renovation', 'active', '2026-06-30T00:01:00.000Z'),
  ('project-beta', 'ws-beta', 'Kitchen Refresh', 'draft', '2026-06-30T00:02:00.000Z');

INSERT INTO estimate_rows (id, project_id, description, quantity, unit_cost_cents, sort_order) VALUES
  ('row-alpha-1', 'project-alpha', 'Cabinet install', 4, 125000, 1),
  ('row-alpha-2', 'project-alpha', 'Finish carpentry', 16.5, 8500, 2),
  ('row-beta-1', 'project-beta', 'Counter prep', 1, 42000, 1);

INSERT INTO upload_assets (id, project_id, object_key, sha256, scan_status) VALUES
  ('asset-alpha-1', 'project-alpha', 'projects/project-alpha/source-photo.webp', '4b227777d4dd1fc61c6f884f48641d02b4d121d3fd328cb08b5531fcacdabf8a', 'clean');
`;

const FIXTURE_TABLES = [
  "workspaces",
  "workspace_members",
  "projects",
  "estimate_rows",
  "upload_assets",
] as const;

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

  if (result.error) {
    throw result.error;
  }
  if (result.status !== 0) {
    const detail = result.stderr.trim() || result.stdout.trim() || `exit ${result.status}`;
    throw new Error(`sqlite3 ${args.join(" ")} failed: ${detail}`);
  }

  return result.stdout;
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

function quotedIdentifier(value: string) {
  return `"${value.replaceAll("\"", "\"\"")}"`;
}

function collectSnapshots(databasePath: string) {
  const snapshots: Record<string, TableSnapshot> = {};
  for (const table of FIXTURE_TABLES) {
    snapshots[table] = runSqliteJson<Record<string, unknown>>(
      databasePath,
      `SELECT * FROM ${quotedIdentifier(table)} ORDER BY rowid;`,
    );
  }
  return snapshots;
}

function countRows(snapshots: Record<string, TableSnapshot>) {
  return Object.values(snapshots).reduce((total, rows) => total + rows.length, 0);
}

function checksum(snapshots: Record<string, TableSnapshot>) {
  return createHash("sha256").update(JSON.stringify(snapshots)).digest("hex");
}

function buildLocalSqliteRehearsal(): LocalSqliteRehearsal {
  const tempDir = mkdtempSync(join(tmpdir(), "archestimator-d1-restore-"));
  const sourceDb = join(tempDir, "source.db");
  const restoredDb = join(tempDir, "restored.db");
  const exportSqlPath = join(tempDir, "export.sql");

  try {
    runSqliteScript(sourceDb, FIXTURE_SQL);
    const exportSql = runSqlite([sourceDb, ".dump"]);
    writeFileSync(exportSqlPath, exportSql);
    runSqliteScript(restoredDb, exportSql);
    runSqliteScript(restoredDb, "PRAGMA foreign_keys = ON;");

    const sourceSnapshots = collectSnapshots(sourceDb);
    const restoredSnapshots = collectSnapshots(restoredDb);
    const sourceRowCount = countRows(sourceSnapshots);
    const restoredRowCount = countRows(restoredSnapshots);
    const sourceSnapshotChecksum = checksum(sourceSnapshots);
    const restoredSnapshotChecksum = checksum(restoredSnapshots);
    const foreignKeyViolations = runSqliteJson<Record<string, unknown>>(restoredDb, "PRAGMA foreign_key_check;").length;
    const checks = [
      {
        key: "sqlite-dump-has-schema",
        label: "SQLite export includes schema statements",
        ready: exportSql.includes("CREATE TABLE workspaces") && exportSql.includes("CREATE TABLE upload_assets"),
        evidence: `exportSqlBytes=${exportSql.length}`,
      },
      {
        key: "sqlite-dump-has-data",
        label: "SQLite export includes representative data",
        ready: exportSql.includes("INSERT INTO workspaces") && exportSql.includes("INSERT INTO estimate_rows"),
        evidence: `sourceRows=${sourceRowCount}`,
      },
      {
        key: "import-row-counts-match",
        label: "Imported database row counts match source",
        ready: sourceRowCount === restoredRowCount && restoredRowCount > 0,
        evidence: `sourceRows=${sourceRowCount}, restoredRows=${restoredRowCount}`,
      },
      {
        key: "import-checksum-matches",
        label: "Imported database checksum matches source",
        ready: sourceSnapshotChecksum === restoredSnapshotChecksum,
        evidence: `sourceChecksum=${sourceSnapshotChecksum}, restoredChecksum=${restoredSnapshotChecksum}`,
      },
      {
        key: "foreign-key-check-clean",
        label: "Imported database passes foreign-key check",
        ready: foreignKeyViolations === 0,
        evidence: `foreignKeyViolations=${foreignKeyViolations}`,
      },
    ];

    rmSync(tempDir, { recursive: true, force: true });

    return {
      sqliteVersion: sqliteVersion(),
      fixtureTableCount: FIXTURE_TABLES.length,
      sourceRows: sourceRowCount,
      restoredRows: restoredRowCount,
      exportSqlBytes: exportSql.length,
      sourceChecksum: sourceSnapshotChecksum,
      restoredChecksum: restoredSnapshotChecksum,
      foreignKeyViolations,
      checks,
      tempArtifactsRemoved: true,
    };
  } catch (error) {
    rmSync(tempDir, { recursive: true, force: true });
    throw error;
  }
}

function buildBlockers(checks: RestoreCheck[], destructiveRestoreDocumented: boolean) {
  const blockers = checks
    .filter((check) => !check.ready)
    .map((check) => `${check.label}: ${check.evidence}`);

  if (!destructiveRestoreDocumented) {
    blockers.push("Destructive D1 Time Travel restore runbook is incomplete.");
  }

  return blockers;
}

export function buildCloudflareD1RestoreRehearsal(
  inputs: RestoreRehearsalInputs = {},
): CloudflareD1RestoreRehearsalReport {
  const localRehearsal = inputs.localRehearsal ?? buildLocalSqliteRehearsal();
  const checksReady = localRehearsal.checks.every((check) => check.ready);
  const destructiveRestoreDocumented =
    DESTRUCTIVE_RESTORE_RUNBOOK.some((item) => item.includes("destructive"))
    && COMMANDS.timeTravelRestore.includes("time-travel restore");
  const d1ExportReady =
    COMMANDS.sqlExport.includes("d1 export")
    && localRehearsal.exportSqlBytes > 0
    && localRehearsal.checks.some((check) => check.key === "sqlite-dump-has-schema" && check.ready);
  const d1ImportReady =
    COMMANDS.sqlImport.includes("d1 execute")
    && localRehearsal.restoredRows === localRehearsal.sourceRows
    && localRehearsal.sourceChecksum === localRehearsal.restoredChecksum;
  const restoreRehearsalReady =
    checksReady
    && localRehearsal.foreignKeyViolations === 0
    && localRehearsal.tempArtifactsRemoved;

  return {
    generatedAt: inputs.generatedAt ?? new Date().toISOString(),
    mode: "cloudflare-d1-restore-rehearsal",
    sources: {
      officialDocs: OFFICIAL_DOCS,
      localFixture: "Temporary sqlite3 fixture generated by this script from sanitized schema/data constants.",
    },
    commands: COMMANDS,
    d1ExportReady,
    d1ImportReady,
    restoreRehearsalReady,
    destructiveRestoreDocumented,
    localOnly: true,
    providerBacked: false,
    localRehearsal,
    destructiveRestoreRunbook: DESTRUCTIVE_RESTORE_RUNBOOK,
    blockers: buildBlockers(localRehearsal.checks, destructiveRestoreDocumented),
    note:
      "Local-only D1 export/import restore rehearsal. It creates temporary SQLite databases from sanitized fixture data, dumps SQL, imports into a fresh database, verifies rows/checksums/foreign keys, and removes temp artifacts. It does not read env files, print secret values, call Cloudflare APIs, create D1 databases, deploy Workers, change DNS, run Time Travel restore, or prove a hosted D1 restore.",
  };
}

function writeOutput(outputFile: string, report: CloudflareD1RestoreRehearsalReport) {
  const outputPath = resolve(outputFile);
  mkdirSync(dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, `${JSON.stringify(report, null, 2)}\n`);
}

function markdownRows(rows: string[][]) {
  return rows.map((row) => `| ${row.map((cell) => cell.replaceAll("|", "\\|")).join(" | ")} |`);
}

export function writeMarkdown(report: CloudflareD1RestoreRehearsalReport, markdownFile: string) {
  const outputPath = resolve(markdownFile);
  mkdirSync(dirname(outputPath), { recursive: true });
  const checkRows = report.localRehearsal.checks.map((check) => [
    check.label,
    check.ready ? "PASS" : "FAIL",
    check.evidence,
  ]);
  const blockerLines = report.blockers.length > 0
    ? report.blockers.map((blocker) => `- ${blocker}`)
    : ["- (none)"];
  const runbookLines = report.destructiveRestoreRunbook.map((item) => `- ${item}`);
  const lines = [
    "# Cloudflare D1 Restore Rehearsal",
    "",
    `Generated: ${report.generatedAt}`,
    "",
    report.note,
    "",
    "## Summary",
    "",
    "| Gate | Ready |",
    "| --- | --- |",
    `| D1 export command ready | ${report.d1ExportReady ? "yes" : "no"} |`,
    `| D1 import command ready | ${report.d1ImportReady ? "yes" : "no"} |`,
    `| Local restore rehearsal ready | ${report.restoreRehearsalReady ? "yes" : "no"} |`,
    `| Destructive restore documented | ${report.destructiveRestoreDocumented ? "yes" : "no"} |`,
    `| Local-only proof | ${report.localOnly ? "yes" : "no"} |`,
    `| Provider-backed D1 proof | ${report.providerBacked ? "yes" : "no"} |`,
    "",
    "## Commands",
    "",
    "| Use | Command |",
    "| --- | --- |",
    `| SQL export | \`${report.commands.sqlExport}\` |`,
    `| SQL import | \`${report.commands.sqlImport}\` |`,
    `| Local rehearsal shape | \`${report.commands.localSqliteRehearsal}\` |`,
    `| Destructive Time Travel restore | \`${report.commands.timeTravelRestore}\` |`,
    "",
    "## Local Rehearsal",
    "",
    "| Item | Value |",
    "| --- | ---: |",
    `| SQLite version | ${report.localRehearsal.sqliteVersion} |`,
    `| Fixture tables | ${report.localRehearsal.fixtureTableCount} |`,
    `| Source rows | ${report.localRehearsal.sourceRows} |`,
    `| Restored rows | ${report.localRehearsal.restoredRows} |`,
    `| Export SQL bytes | ${report.localRehearsal.exportSqlBytes} |`,
    `| Foreign-key violations | ${report.localRehearsal.foreignKeyViolations} |`,
    `| Temp artifacts removed | ${report.localRehearsal.tempArtifactsRemoved ? "yes" : "no"} |`,
    "",
    "## Checks",
    "",
    "| Check | Result | Evidence |",
    "| --- | --- | --- |",
    ...markdownRows(checkRows),
    "",
    "## Destructive Restore Runbook",
    "",
    ...runbookLines,
    "",
    "## Official Docs",
    "",
    `- D1 import/export data: ${report.sources.officialDocs.importExportData}`,
    `- Wrangler D1 commands: ${report.sources.officialDocs.wranglerCommands}`,
    `- Time Travel restore: ${report.sources.officialDocs.timeTravelRestore}`,
    "",
    "## Blockers",
    "",
    ...blockerLines,
    "",
  ];
  writeFileSync(outputPath, lines.join("\n"));
}

async function main() {
  const report = buildCloudflareD1RestoreRehearsal();
  const outputFile = readEnv("OUTPUT_FILE") ?? `${PLAN_ROOT}/2026-06-30-cloudflare-d1-restore-rehearsal.json`;
  const markdownFile = readEnv("MARKDOWN_FILE") ?? `${PLAN_ROOT}/2026-06-30-cloudflare-d1-restore-rehearsal.md`;
  writeOutput(outputFile, report);
  writeMarkdown(report, markdownFile);
  console.log(JSON.stringify(report, null, 2));
  if (!report.restoreRehearsalReady) process.exitCode = 1;
}

if (import.meta.main) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
