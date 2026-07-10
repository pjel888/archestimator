import { beforeEach, describe, expect, it, vi } from "vitest";

const d1Mocks = vi.hoisted(() => ({
  getCloudflareD1Database: vi.fn(),
}));

const loggerMocks = vi.hoisted(() => ({
  emitLogRecord: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/cloudflare/d1", () => d1Mocks);
vi.mock("@/lib/observability/logger", () => loggerMocks);

type CacheRow = {
  key: string;
  payload_json: string;
  fetched_at: string;
  expires_at: string;
};

class MetricCacheStatement {
  private values: unknown[] = [];

  constructor(
    private readonly database: MetricCacheDatabase,
    private readonly sql: string,
  ) {}

  bind(...values: unknown[]) {
    this.values = values;
    this.database.bound.push({ sql: this.sql, values });
    return this;
  }

  async first() {
    if (!this.sql.includes("FROM admin_metric_cache")) return null;
    const key = typeof this.values[0] === "string" ? this.values[0] : "";
    return this.database.rows.get(key) ?? null;
  }

  async run() {
    const [key, payloadJson, fetchedAt, expiresAt] = this.values;
    if (
      typeof key === "string" &&
      typeof payloadJson === "string" &&
      typeof fetchedAt === "string" &&
      typeof expiresAt === "string"
    ) {
      this.database.rows.set(key, {
        key,
        payload_json: payloadJson,
        fetched_at: fetchedAt,
        expires_at: expiresAt,
      });
    }
    return { success: true, meta: { changes: 1 } };
  }
}

class MetricCacheDatabase {
  bound: { sql: string; values: unknown[] }[] = [];
  rows = new Map<string, CacheRow>();

  prepare(sql: string) {
    return new MetricCacheStatement(this, sql);
  }
}

beforeEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
});

describe("admin metric cache", () => {
  it("sets and reads typed JSON payloads from D1", async () => {
    const database = new MetricCacheDatabase();
    d1Mocks.getCloudflareD1Database.mockResolvedValue(database);

    const { getMetricCache, setMetricCache } = await import("@/lib/admin/metric-cache");
    const write = await setMetricCache("overview", { users: 3 }, 60);
    const read = await getMetricCache<{ users: number }>("overview");

    expect(write.error).toBeNull();
    expect(read.error).toBeNull();
    expect(read.data?.payload.users).toBe(3);
    expect(database.bound[0]?.sql).toContain("INSERT INTO admin_metric_cache");
    expect(database.bound[1]?.sql).toContain("FROM admin_metric_cache");
  });

  it("refreshes only when the cache is stale or missing", async () => {
    const database = new MetricCacheDatabase();
    d1Mocks.getCloudflareD1Database.mockResolvedValue(database);
    const refresher = vi.fn().mockResolvedValue({ incidents: 1 });

    const { refreshIfStale } = await import("@/lib/admin/metric-cache");
    const first = await refreshIfStale("incidents", 60, refresher);
    const second = await refreshIfStale("incidents", 60, refresher);

    expect(first.data?.payload.incidents).toBe(1);
    expect(second.data?.payload.incidents).toBe(1);
    expect(refresher).toHaveBeenCalledTimes(1);
  });
});
