import "server-only";

import {
  getCloudflareD1Database,
  type D1DatabaseLike,
  type D1PreparedStatementLike,
  type D1Result,
  type D1Value,
} from "@/lib/cloudflare/d1";

export type D1IntentStatement = {
  sql: string;
  values?: readonly unknown[];
};

function normalizeD1Value(value: unknown): D1Value {
  if (value === undefined) return null;
  if (
    value === null
    || typeof value === "string"
    || typeof value === "number"
    || typeof value === "boolean"
    || value instanceof ArrayBuffer
  ) {
    return value;
  }
  return JSON.stringify(value);
}

function prepareStatement(database: D1DatabaseLike, statement: D1IntentStatement) {
  return database
    .prepare(statement.sql)
    .bind(...(statement.values ?? []).map(normalizeD1Value));
}

export async function requireEstimateD1Database(): Promise<D1DatabaseLike> {
  const database = await getCloudflareD1Database();
  if (!database) throw new Error("Cloudflare D1 ARCH_DB binding is required for estimate actions.");
  return database;
}

export async function firstD1Row<T>(
  database: D1DatabaseLike,
  sql: string,
  values: readonly unknown[] = [],
): Promise<T | null> {
  return database.prepare<T>(sql).bind(...values.map(normalizeD1Value)).first<T>();
}

export async function allD1Rows<T>(
  database: D1DatabaseLike,
  sql: string,
  values: readonly unknown[] = [],
): Promise<T[]> {
  const result = await database.prepare<T>(sql).bind(...values.map(normalizeD1Value)).all<T>();
  if (result.success === false) throw new Error("Cloudflare D1 estimate action read failed.");
  return result.results ?? [];
}

export async function runD1Statement(
  database: D1DatabaseLike,
  sql: string,
  values: readonly unknown[] = [],
): Promise<D1Result> {
  const result = await database.prepare(sql).bind(...values.map(normalizeD1Value)).run();
  if (result.success === false) throw new Error("Cloudflare D1 estimate action write failed.");
  return result;
}

export async function runD1Batch(
  database: D1DatabaseLike,
  statements: readonly D1IntentStatement[],
): Promise<void> {
  if (statements.length === 0) return;
  if (database.batch) {
    const results = await database.batch(statements.map((statement) => prepareStatement(database, statement)));
    if (results.some((result) => result.success === false)) {
      throw new Error("Cloudflare D1 estimate action batch failed.");
    }
    return;
  }
  for (const statement of statements) {
    await runD1Statement(database, statement.sql, statement.values);
  }
}

export async function runPreparedD1Batch(
  database: D1DatabaseLike,
  statements: readonly D1IntentStatement[],
  preparedStatements: readonly D1PreparedStatementLike[],
): Promise<void> {
  if (preparedStatements.length === 0) {
    await runD1Batch(database, statements);
    return;
  }
  if (database.batch) {
    const results = await database.batch([
      ...statements.map((statement) => prepareStatement(database, statement)),
      ...preparedStatements,
    ]);
    if (results.some((result) => result.success === false)) {
      throw new Error("Cloudflare D1 estimate action batch failed.");
    }
    return;
  }
  await runD1Batch(database, statements);
  for (const statement of preparedStatements) {
    const result = await statement.run();
    if (result.success === false) throw new Error("Cloudflare D1 estimate action write failed.");
  }
}
