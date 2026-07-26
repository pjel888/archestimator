import { createRequire } from "node:module";

type SqliteValue = bigint | null | number | string | Uint8Array;
type SqliteRow = Record<string, SqliteValue>;

type SqliteStatement = {
  all: (...parameters: unknown[]) => SqliteRow[];
};

type SqliteDatabase = {
  close: () => void;
  exec: (sql: string) => unknown;
  prepare?: (sql: string) => SqliteStatement;
  query?: (sql: string) => SqliteStatement;
};

export type LocalSqliteResult = {
  error?: Error;
  status: number;
  stderr: string;
  stdout: string;
};

const requireRuntime = createRequire(import.meta.url);

function openDatabase(databasePath: string): SqliteDatabase {
  if (Object.hasOwn(process.versions, "bun")) {
    const { Database } = requireRuntime("bun:sqlite") as {
      Database: new (path: string) => SqliteDatabase;
    };
    return new Database(databasePath);
  }

  const { DatabaseSync } = requireRuntime("node:sqlite") as {
    DatabaseSync: new (path: string) => SqliteDatabase;
  };
  return new DatabaseSync(databasePath);
}

function queryRows(database: SqliteDatabase, sql: string) {
  const statement = database.prepare?.(sql) ?? database.query?.(sql);
  if (!statement) throw new Error("The active SQLite runtime does not support prepared queries.");
  return statement.all();
}

function stripCliDirectives(sql: string) {
  return sql
    .split(/\r?\n/u)
    .filter((line) => !line.trimStart().startsWith("."))
    .join("\n");
}

function beginsWithQuery(sql: string) {
  const withoutLeadingComments = sql
    .replace(/^(?:\s|--[^\n]*(?:\n|$)|\/\*[\s\S]*?\*\/)+/u, "")
    .trimStart();
  return /^(?:EXPLAIN|PRAGMA|SELECT|VALUES|WITH)\b/iu.test(withoutLeadingComments);
}

function containsMultipleStatements(sql: string) {
  const withoutLiteralsOrComments = sql
    .replace(/'(?:''|[^'])*'/gu, "''")
    .replace(/"(?:""|[^"])*"/gu, '""')
    .replace(/--[^\n]*(?:\n|$)|\/\*[\s\S]*?\*\//gu, "");
  return (withoutLiteralsOrComments.match(/;/gu)?.length ?? 0) > 1;
}

function isReadStatement(sql: string) {
  if (!beginsWithQuery(sql) || containsMultipleStatements(sql)) return false;
  return !/^\s*PRAGMA\b[^;]*=/iu.test(sql);
}

function jsonValue(_key: string, value: unknown) {
  if (typeof value !== "bigint") return value;
  return value <= BigInt(Number.MAX_SAFE_INTEGER) && value >= BigInt(Number.MIN_SAFE_INTEGER)
    ? Number(value)
    : value.toString();
}

function displayValue(value: SqliteValue) {
  if (value === null) return "";
  if (value instanceof Uint8Array) return Buffer.from(value).toString("hex").toUpperCase();
  return String(value);
}

function rowsToText(rows: SqliteRow[]) {
  if (rows.length === 0) return "";
  return `${rows.map((row) => Object.values(row).map(displayValue).join("|")).join("\n")}\n`;
}

function quoteIdentifier(value: string) {
  return `"${value.replaceAll('"', '""')}"`;
}

function dumpIdentifier(value: string) {
  return /^[A-Za-z_][A-Za-z0-9_]*$/u.test(value) ? value : quoteIdentifier(value);
}

function sqlLiteral(value: SqliteValue) {
  if (value === null) return "NULL";
  if (typeof value === "number" || typeof value === "bigint") return String(value);
  if (value instanceof Uint8Array) return `X'${Buffer.from(value).toString("hex")}'`;
  return `'${value.replaceAll("'", "''")}'`;
}

function dumpTableRows(database: SqliteDatabase, tableName: string) {
  const rows = queryRows(database, `SELECT * FROM ${quoteIdentifier(tableName)};`);
  return rows.map((row) => {
    const columns = Object.keys(row).map(quoteIdentifier).join(",");
    const values = Object.values(row).map(sqlLiteral).join(",");
    return `INSERT INTO ${dumpIdentifier(tableName)}(${columns}) VALUES(${values});`;
  });
}

function dumpDatabase(database: SqliteDatabase) {
  const schema = queryRows(
    database,
    `SELECT type, name, sql
     FROM sqlite_schema
     WHERE sql IS NOT NULL AND name NOT LIKE 'sqlite_%'
     ORDER BY CASE type WHEN 'table' THEN 0 WHEN 'index' THEN 1 WHEN 'trigger' THEN 2 ELSE 3 END, name;`,
  );
  const tables = schema.filter((row) => row.type === "table");
  const remainingSchema = schema.filter((row) => row.type !== "table");
  const lines = ["PRAGMA foreign_keys=OFF;", "BEGIN TRANSACTION;"];

  for (const row of tables) {
    lines.push(`${String(row.sql)};`);
    lines.push(...dumpTableRows(database, String(row.name)));
  }
  for (const row of remainingSchema) lines.push(`${String(row.sql)};`);
  lines.push("COMMIT;", "");
  return lines.join("\n");
}

function execute(databasePath: string, sql: string, json: boolean) {
  const database = openDatabase(databasePath);
  try {
    if (sql.trim() === ".dump") return dumpDatabase(database);
    const normalizedSql = stripCliDirectives(sql).trim();
    if (!normalizedSql) return "";
    if (!isReadStatement(normalizedSql)) {
      database.exec(normalizedSql);
      return "";
    }
    const rows = queryRows(database, normalizedSql);
    return json ? `${JSON.stringify(rows, jsonValue)}\n` : rowsToText(rows);
  } finally {
    database.close();
  }
}

function sqliteVersion() {
  const database = openDatabase(":memory:");
  try {
    const row = queryRows(database, "SELECT sqlite_version() AS version;")[0];
    return `${row?.version ?? "unknown"}\n`;
  } finally {
    database.close();
  }
}

export function runLocalSqliteCli(args: string[], input?: string): LocalSqliteResult {
  try {
    if (args.length === 1 && args[0] === "--version") {
      return { status: 0, stderr: "", stdout: sqliteVersion() };
    }

    const json = args[0] === "-json";
    const commandArgs = json ? args.slice(1) : args;
    const databasePath = commandArgs[0];
    if (!databasePath) throw new Error("A SQLite database path is required.");
    const sql = commandArgs.slice(1).join(" ") || input || "";
    return { status: 0, stderr: "", stdout: execute(databasePath, sql, json) };
  } catch (error) {
    const sqliteError = error instanceof Error ? error : new Error(String(error));
    return { error: sqliteError, status: 1, stderr: sqliteError.message, stdout: "" };
  }
}
