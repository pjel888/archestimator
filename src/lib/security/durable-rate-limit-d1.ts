import "server-only";

import { randomUUID } from "node:crypto";

import { getCloudflareD1Database, type D1DatabaseLike, type D1Value } from "@/lib/cloudflare/d1";

type DurableRateLimitJsonValue =
  | string
  | number
  | boolean
  | null
  | { [key: string]: DurableRateLimitJsonValue | undefined }
  | DurableRateLimitJsonValue[];

type RateLimitCountRow = {
  count: number;
};

async function getRequiredRateLimitDatabase() {
  const database = await getCloudflareD1Database();
  if (!database) {
    throw new Error("Something went wrong. Try again in a moment.");
  }
  return database;
}

async function execute(db: D1DatabaseLike, sql: string, values: D1Value[]) {
  const result = await db.prepare(sql).bind(...values).run();
  if (result.success === false) {
    throw new Error("Durable rate limit storage operation failed.");
  }
  return result;
}

async function first<T>(db: D1DatabaseLike, sql: string, values: D1Value[]) {
  return db.prepare<T>(sql).bind(...values).first<T>();
}

export async function insertDurableRateLimitEvent(input: {
  dedupeHash?: string | null;
  keyHash: string;
  metadata?: Record<string, DurableRateLimitJsonValue>;
  scope: string;
  ttlSeconds: number;
}) {
  const db = await getRequiredRateLimitDatabase();
  const occurredAt = new Date().toISOString();
  const expiresAt = new Date(Date.now() + input.ttlSeconds * 1000).toISOString();

  return execute(
    db,
    `INSERT OR IGNORE INTO security_rate_limit_events (
       id, scope, key_hash, dedupe_hash, metadata_json, occurred_at, expires_at
     )
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      randomUUID(),
      input.scope,
      input.keyHash,
      input.dedupeHash ?? null,
      JSON.stringify(input.metadata ?? {}),
      occurredAt,
      expiresAt,
    ],
  );
}

export async function countDurableRateLimitEvents(input: {
  activeAt?: string;
  keyHash: string;
  scope: string;
  since: string;
}) {
  const db = await getRequiredRateLimitDatabase();
  const activeFilter = input.activeAt ? " AND expires_at > ?" : "";
  const row = await first<RateLimitCountRow>(
    db,
    `SELECT COUNT(*) AS count
     FROM security_rate_limit_events
     WHERE scope = ? AND key_hash = ? AND occurred_at >= ?${activeFilter}`,
    input.activeAt
      ? [input.scope, input.keyHash, input.since, input.activeAt]
      : [input.scope, input.keyHash, input.since],
  );
  return row?.count ?? 0;
}

export async function deleteDurableRateLimitEvents(scope: string, keyHash: string) {
  const db = await getRequiredRateLimitDatabase();
  await execute(db, "DELETE FROM security_rate_limit_events WHERE scope = ? AND key_hash = ?", [scope, keyHash]);
}

export async function cleanupExpiredDurableRateLimitEvents(now = Date.now()) {
  const db = await getRequiredRateLimitDatabase();
  await execute(db, "DELETE FROM security_rate_limit_events WHERE expires_at < ?", [new Date(now).toISOString()]);
}
