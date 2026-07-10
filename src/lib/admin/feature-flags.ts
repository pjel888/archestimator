import "server-only";

import { getCloudflareD1Database, type D1DatabaseLike } from "@/lib/cloudflare/d1";

const FEATURE_FLAG_CACHE_TTL_MS = 15_000;
const ADMIN_DASHBOARD_FLAG_KEY = "admin_dashboard_enabled";
const ADMIN_DASHBOARD_ENABLED_ENV = "ADMIN_DASHBOARD_ENABLED";

export type AdminFeatureFlag = {
  key: string;
  enabled: boolean;
  description: string | null;
  updated_at: string;
  updated_by: string | null;
};

type FeatureFlagRow = {
  key: string;
  enabled: number;
  description: string | null;
  updated_at: string;
  updated_by: string | null;
};

type FeatureFlagCacheEntry = {
  expiresAt: number;
  flags: Map<string, AdminFeatureFlag>;
};

let featureFlagCache: FeatureFlagCacheEntry | null = null;

function readFlag(value: string | undefined): boolean | null {
  if (value === undefined) return null;
  const normalized = value.trim().toLowerCase();
  if (["1", "on", "true", "yes", "enabled"].includes(normalized)) return true;
  if (["0", "off", "false", "no", "disabled"].includes(normalized)) return false;
  return null;
}

function toAdminFeatureFlag(row: FeatureFlagRow): AdminFeatureFlag {
  return {
    key: row.key,
    enabled: row.enabled === 1,
    description: row.description,
    updated_at: row.updated_at,
    updated_by: row.updated_by,
  };
}

async function readFeatureFlagsFromD1(db: D1DatabaseLike): Promise<AdminFeatureFlag[]> {
  const result = await db
    .prepare<FeatureFlagRow>(
      `
        SELECT key, enabled, description, updated_at, updated_by
        FROM feature_flags
        ORDER BY key ASC
      `,
    )
    .all<FeatureFlagRow>();

  return (result.results ?? []).map(toAdminFeatureFlag);
}

async function loadFeatureFlagMap(): Promise<Map<string, AdminFeatureFlag>> {
  const now = Date.now();
  if (featureFlagCache && featureFlagCache.expiresAt > now) {
    return featureFlagCache.flags;
  }

  const db = await getCloudflareD1Database();
  if (!db) {
    featureFlagCache = { expiresAt: now + FEATURE_FLAG_CACHE_TTL_MS, flags: new Map() };
    return featureFlagCache.flags;
  }

  const flags = new Map((await readFeatureFlagsFromD1(db)).map((flag) => [flag.key, flag]));
  featureFlagCache = { expiresAt: now + FEATURE_FLAG_CACHE_TTL_MS, flags };
  return flags;
}

export function resetAdminFeatureFlagCacheForTests() {
  if (process.env.NODE_ENV !== "test") return;
  featureFlagCache = null;
}

export async function listFeatureFlags(): Promise<AdminFeatureFlag[]> {
  return Array.from((await loadFeatureFlagMap()).values());
}

export async function getFeatureFlag(key: string): Promise<AdminFeatureFlag | null> {
  return (await loadFeatureFlagMap()).get(key) ?? null;
}

export async function updateFeatureFlagInD1(
  db: D1DatabaseLike,
  input: { key: string; enabled: boolean; updatedBy: string },
): Promise<AdminFeatureFlag | null> {
  const key = input.key.trim();
  if (!key) throw new Error("Feature flag key is required.");
  const updatedAt = new Date().toISOString();
  await db
    .prepare(
      `
        UPDATE feature_flags
        SET enabled = ?, updated_at = ?, updated_by = ?
        WHERE key = ?
      `,
    )
    .bind(input.enabled ? 1 : 0, updatedAt, input.updatedBy, key)
    .run();

  const row = await db
    .prepare<FeatureFlagRow>(
      `
        SELECT key, enabled, description, updated_at, updated_by
        FROM feature_flags
        WHERE key = ?
        LIMIT 1
      `,
    )
    .bind(key)
    .first<FeatureFlagRow>();

  featureFlagCache = null;
  return row ? toAdminFeatureFlag(row) : null;
}

export async function isFeatureFlagEnabled(key: string): Promise<boolean> {
  return (await getFeatureFlag(key))?.enabled ?? false;
}

export async function isAdminDashboardEnabled(): Promise<boolean> {
  const envOverride = readFlag(process.env[ADMIN_DASHBOARD_ENABLED_ENV]);
  if (envOverride !== null) return envOverride;
  return isFeatureFlagEnabled(ADMIN_DASHBOARD_FLAG_KEY);
}
