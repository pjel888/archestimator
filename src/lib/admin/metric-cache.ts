import "server-only";

import { getCloudflareD1Database, type D1DatabaseLike } from "@/lib/cloudflare/d1";
import { emitLogRecord } from "@/lib/observability/logger";

export type MetricCacheResult<T> = {
  data: T | null;
  error: string | null;
};

type MetricCacheRow = {
  key: string;
  payload_json: string;
  fetched_at: string;
  expires_at: string;
};

export type MetricCachePayload<T> = {
  key: string;
  payload: T;
  fetchedAt: string;
  expiresAt: string;
};

function logMetricCacheFailure(error: unknown, event: string, key: string) {
  emitLogRecord({
    level: "error",
    event,
    message: "Admin metric cache operation failed.",
    context: {
      cache_key: key,
      error_name: error instanceof Error ? error.name : "unknown",
    },
  });
}

function parseMetricCacheRow<T>(row: MetricCacheRow): MetricCachePayload<T> {
  return {
    key: row.key,
    payload: JSON.parse(row.payload_json) as T,
    fetchedAt: row.fetched_at,
    expiresAt: row.expires_at,
  };
}

async function getMetricCacheFromD1<T>(
  db: D1DatabaseLike,
  key: string,
): Promise<MetricCachePayload<T> | null> {
  const now = new Date().toISOString();
  const row = await db
    .prepare<MetricCacheRow>(
      `
        SELECT key, payload_json, fetched_at, expires_at
        FROM admin_metric_cache
        WHERE key = ? AND expires_at > ?
        LIMIT 1
      `,
    )
    .bind(key, now)
    .first<MetricCacheRow>();

  return row ? parseMetricCacheRow<T>(row) : null;
}

export async function getMetricCache<T>(key: string): Promise<MetricCacheResult<MetricCachePayload<T>>> {
  try {
    const db = await getCloudflareD1Database();
    if (!db) return { data: null, error: "Something went wrong. Try again in a moment." };
    return { data: await getMetricCacheFromD1<T>(db, key), error: null };
  } catch (error) {
    logMetricCacheFailure(error, "admin_metric_cache_read_failed", key);
    return { data: null, error: "Admin metric cache could not be read." };
  }
}

export async function setMetricCache<T>(
  key: string,
  payload: T,
  ttlSeconds: number,
): Promise<MetricCacheResult<MetricCachePayload<T>>> {
  const fetchedAt = new Date();
  const expiresAt = new Date(fetchedAt.getTime() + Math.max(0, ttlSeconds) * 1_000);
  const cachePayload: MetricCachePayload<T> = {
    key,
    payload,
    fetchedAt: fetchedAt.toISOString(),
    expiresAt: expiresAt.toISOString(),
  };

  try {
    const db = await getCloudflareD1Database();
    if (!db) return { data: null, error: "Something went wrong. Try again in a moment." };

    await db
      .prepare(
        `
          INSERT INTO admin_metric_cache (key, payload_json, fetched_at, expires_at)
          VALUES (?, ?, ?, ?)
          ON CONFLICT(key) DO UPDATE SET
            payload_json = excluded.payload_json,
            fetched_at = excluded.fetched_at,
            expires_at = excluded.expires_at
        `,
      )
      .bind(key, JSON.stringify(payload), cachePayload.fetchedAt, cachePayload.expiresAt)
      .run();

    return { data: cachePayload, error: null };
  } catch (error) {
    logMetricCacheFailure(error, "admin_metric_cache_write_failed", key);
    return { data: null, error: "Admin metric cache could not be written." };
  }
}

export async function refreshIfStale<T>(
  key: string,
  ttlSeconds: number,
  refresher: () => Promise<T>,
): Promise<MetricCacheResult<MetricCachePayload<T>>> {
  const cached = await getMetricCache<T>(key);
  if (cached.error) return cached;
  if (cached.data) return cached;

  const payload = await refresher();
  return setMetricCache(key, payload, ttlSeconds);
}
