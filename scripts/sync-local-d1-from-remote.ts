#!/usr/bin/env bun
/**
 * Sync local Miniflare ARCH_DB from remote production D1.
 *
 * Why this exists: wrangler remote bindings (`ARCH_DEV_USE_REMOTE_BINDINGS=1`)
 * currently hang in this account when the edge-preview proxy path is blocked
 * by Cloudflare Access / missing interactive cloudflared login. Export+import
 * uses the working `wrangler d1 export --remote` path and gives localhost the
 * same workshop rows without mutating production during day-to-day local edits
 * after the sync.
 *
 * Security:
 * - Export SQL may contain sessions/OAuth tokens. Written under `.wrangler/tmp/`
 *   (gitignored) and deleted after a successful import.
 * - This overwrites local D1 data only. Remote D1 is read-only here.
 */
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, rmSync, existsSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { Database } from "bun:sqlite";

const ROOT = process.cwd();
const TMP_DIR = join(ROOT, ".wrangler", "tmp");
const EXPORT_PATH = join(TMP_DIR, "arch-db-remote-sync.sql");
const LOCAL_D1_DIR = join(ROOT, ".wrangler", "state", "v3", "d1");

function run(command: string, args: string[], opts: { allowFail?: boolean } = {}) {
  const result = spawnSync(command, args, {
    cwd: ROOT,
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024,
  });
  if (result.status !== 0 && !opts.allowFail) {
    const detail = [result.stderr, result.stdout].filter(Boolean).join("\n").trim();
    throw new Error(`${command} ${args.join(" ")} failed (${result.status}): ${detail.slice(-2000)}`);
  }
  return result;
}

function splitSqlStatements(sql: string): string[] {
  const statements: string[] = [];
  let current = "";
  let inSingle = false;
  let inDouble = false;

  for (let i = 0; i < sql.length; i += 1) {
    const ch = sql[i];
    const next = sql[i + 1];

    if (inSingle) {
      current += ch;
      if (ch === "'" && next === "'") {
        current += next;
        i += 1;
      } else if (ch === "'") {
        inSingle = false;
      }
      continue;
    }

    if (inDouble) {
      current += ch;
      if (ch === '"' && next === '"') {
        current += next;
        i += 1;
      } else if (ch === '"') {
        inDouble = false;
      }
      continue;
    }

    if (ch === "'") {
      inSingle = true;
      current += ch;
      continue;
    }
    if (ch === '"') {
      inDouble = true;
      current += ch;
      continue;
    }
    if (ch === ";") {
      const trimmed = current.trim();
      if (trimmed) statements.push(trimmed);
      current = "";
      continue;
    }
    current += ch;
  }

  const trailing = current.trim();
  if (trailing) statements.push(trailing);
  return statements;
}

function downloadExportViaSignedUrlFromLatestLog(startedAfterMs: number): void {
  const logDir = join(process.env.HOME ?? "", "Library/Preferences/.wrangler/logs");
  const files = readdirSync(logDir)
    .filter((name) => name.startsWith("wrangler-") && name.endsWith(".log"))
    .map((name) => {
      const full = join(logDir, name);
      return { full, mtimeMs: statSync(full).mtimeMs };
    })
    .filter((entry) => entry.mtimeMs >= startedAfterMs - 5_000)
    .sort((a, b) => b.mtimeMs - a.mtimeMs);

  if (files.length === 0) {
    throw new Error("No recent wrangler log found to recover export URL.");
  }

  for (const file of files) {
    const text = readFileSync(file.full, "utf8");
    const match = text.match(/https:\/\/[^\s"]+\.sql\?[^\s"]+/);
    if (!match) continue;
    const curl = spawnSync("curl", ["-fsSL", "-o", EXPORT_PATH, match[0]], { encoding: "utf8" });
    if (curl.status === 0 && existsSync(EXPORT_PATH) && readFileSync(EXPORT_PATH).byteLength > 100) {
      return;
    }
  }
  throw new Error("Could not download D1 export via signed URL from recent wrangler logs.");
}

function ensureRemoteExport(): void {
  mkdirSync(TMP_DIR, { recursive: true });
  rmSync(EXPORT_PATH, { force: true });
  const startedAfterMs = Date.now();
  const exportResult = run(
    "bunx",
    ["wrangler", "d1", "export", "ARCH_DB", "--remote", `--output=${EXPORT_PATH}`],
    { allowFail: true },
  );
  if (!existsSync(EXPORT_PATH) || readFileSync(EXPORT_PATH).byteLength < 100) {
    console.warn("wrangler d1 export download failed; recovering via signed URL from recent logs…");
    downloadExportViaSignedUrlFromLatestLog(startedAfterMs);
  }
  if (!existsSync(EXPORT_PATH)) {
    throw new Error(`Export missing after recovery. stderr=${exportResult.stderr?.slice(-500)}`);
  }
  console.log(`exported_bytes=${readFileSync(EXPORT_PATH).byteLength}`);
}

function findLocalSqlitePath(): string {
  const objectDir = join(LOCAL_D1_DIR, "miniflare-D1DatabaseObject");
  if (!existsSync(objectDir)) {
    throw new Error("Local D1 sqlite directory not found. Run migrations apply --local first.");
  }
  const path = readdirSync(objectDir)
    .filter((name) => name.endsWith(".sqlite") && name !== "metadata.sqlite")
    .map((name) => join(objectDir, name))[0];
  if (!path) {
    throw new Error("Local D1 sqlite file not found. Run migrations apply --local first.");
  }
  return path;
}

function stripReferences(createSql: string): string {
  return createSql.replace(
    /\s+REFERENCES\s+\w+\s*\([^)]*\)(?:\s+ON\s+DELETE\s+\w+(?:\s+\w+)?)?(?:\s+ON\s+UPDATE\s+\w+(?:\s+\w+)?)?/gi,
    "",
  );
}

function redactEmail(email: string): string {
  const [local, domain] = email.split("@");
  if (!domain) return "***";
  const visible = local.slice(0, 2);
  return `${visible}***@${domain}`;
}

function importIntoLocalSqlite(dbPath: string, exportSql: string): void {
  const db = new Database(dbPath);
  db.exec("PRAGMA foreign_keys=OFF;");
  const existing = new Set(
    db.query("SELECT name FROM sqlite_master WHERE type='table'").all().map((row) => String((row as { name: string }).name)),
  );

  const statements = splitSqlStatements(exportSql);
  let created = 0;
  const inserts: Array<{ table: string; sql: string }> = [];

  for (const statement of statements) {
    const createMatch = statement.match(/^CREATE TABLE (?:IF NOT EXISTS )?["']?(\w+)["']?\s*\(/i);
    if (createMatch) {
      const name = createMatch[1];
      if (!name || existing.has(name) || name === "d1_migrations") continue;
      try {
        db.exec(stripReferences(statement));
        created += 1;
        existing.add(name);
      } catch (error) {
        console.warn(`CREATE_FAIL ${name}: ${String(error)}`);
      }
      continue;
    }

    const insertMatch = statement.match(/^INSERT INTO ["']?(\w+)["']?/i);
    if (insertMatch) {
      const table = insertMatch[1];
      if (!table || table === "d1_migrations") continue;
      inserts.push({ table, sql: statement });
    }
  }

  for (const table of [...new Set(inserts.map((row) => row.table))].sort().reverse()) {
    try {
      db.exec(`DELETE FROM "${table}"`);
    } catch {
      // optional / missing table
    }
  }

  let ok = 0;
  let fail = 0;
  const failedTables = new Map<string, number>();
  for (const row of inserts) {
    const sql = row.sql.replace(/^INSERT INTO/i, "INSERT OR IGNORE INTO");
    try {
      db.exec(sql);
      ok += 1;
    } catch (error) {
      fail += 1;
      failedTables.set(row.table, (failedTables.get(row.table) ?? 0) + 1);
      if (fail <= 12) console.warn(`INSERT_FAIL ${row.table}: ${String(error)}`);
    }
  }

  db.exec("PRAGMA foreign_keys=ON;");
  const users = db.query("SELECT id, email FROM user").all() as Array<{ id: string; email: string }>;
  const projects = db.query("SELECT id, name FROM projects ORDER BY created_at DESC LIMIT 10").all() as Array<{
    id: string;
    name: string;
  }>;
  db.close();

  console.log(
    JSON.stringify(
      {
        dbPath,
        createdTables: created,
        insertOk: ok,
        insertFail: fail,
        failedTables: Object.fromEntries(failedTables),
        userCount: users.length,
        users: users.map((user) => ({ id: user.id, email: redactEmail(user.email) })),
        projectCount: projects.length,
        projects: projects.map((project) => ({ id: project.id, name: project.name })),
        exportSha256: createHash("sha256").update(exportSql).digest("hex").slice(0, 16),
      },
      null,
      2,
    ),
  );

  if (users.length === 0) {
    throw new Error("Sync finished but local user table is empty.");
  }
  if (fail > 0) {
    throw new Error(`Sync incomplete: ${fail} INSERT statement(s) failed (${[...failedTables.keys()].join(", ")}).`);
  }
}

function main() {
  console.log("Syncing local ARCH_DB from remote production D1…");
  ensureRemoteExport();

  // Fresh local DB avoids trigger/seed conflicts from prior local-only rows.
  rmSync(LOCAL_D1_DIR, { recursive: true, force: true });
  run("bunx", ["wrangler", "d1", "migrations", "apply", "ARCH_DB", "--local"]);

  const dbPath = findLocalSqlitePath();
  const exportSql = readFileSync(EXPORT_PATH, "utf8");
  try {
    importIntoLocalSqlite(dbPath, exportSql);
  } finally {
    rmSync(EXPORT_PATH, { force: true });
  }

  console.log("Done. Restart bun dev and sign in again on localhost to use synced rows.");
  console.log("Reminder: local edits no longer auto-push to production. Re-run this sync to refresh.");
}

main();
