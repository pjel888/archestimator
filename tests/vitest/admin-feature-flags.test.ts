import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const d1Mocks = vi.hoisted(() => ({
  getCloudflareD1Database: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/cloudflare/d1", () => d1Mocks);

type FeatureFlagRow = {
  key: string;
  enabled: number;
  description: string | null;
  updated_at: string;
  updated_by: string | null;
};

class FeatureFlagStatement {
  constructor(private readonly rows: FeatureFlagRow[]) {}

  async all() {
    return { results: this.rows };
  }
}

class FeatureFlagDatabase {
  prepareCalls: string[] = [];

  constructor(private readonly rows: FeatureFlagRow[]) {}

  prepare(sql: string) {
    this.prepareCalls.push(sql);
    return new FeatureFlagStatement(this.rows);
  }
}

async function importFeatureFlags() {
  const module = await import("@/lib/admin/feature-flags");
  module.resetAdminFeatureFlagCacheForTests();
  return module;
}

beforeEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("admin feature flags", () => {
  it("reads feature flags from D1 and caches the short-lived result", async () => {
    const database = new FeatureFlagDatabase([
      {
        key: "admin_dashboard_enabled",
        enabled: 1,
        description: "Master switch",
        updated_at: "2026-07-10T05:00:00.000Z",
        updated_by: "admin-user",
      },
    ]);
    d1Mocks.getCloudflareD1Database.mockResolvedValue(database);

    const { getFeatureFlag, isAdminDashboardEnabled, listFeatureFlags } = await importFeatureFlags();

    await expect(isAdminDashboardEnabled()).resolves.toBe(true);
    await expect(getFeatureFlag("admin_dashboard_enabled")).resolves.toMatchObject({
      enabled: true,
      key: "admin_dashboard_enabled",
    });
    await expect(listFeatureFlags()).resolves.toHaveLength(1);
    expect(d1Mocks.getCloudflareD1Database).toHaveBeenCalledTimes(1);
    expect(database.prepareCalls[0]).toContain("FROM feature_flags");
  });

  it("lets ADMIN_DASHBOARD_ENABLED override D1 for the master flag", async () => {
    vi.stubEnv("ADMIN_DASHBOARD_ENABLED", "off");

    const { isAdminDashboardEnabled } = await importFeatureFlags();

    await expect(isAdminDashboardEnabled()).resolves.toBe(false);
    expect(d1Mocks.getCloudflareD1Database).not.toHaveBeenCalled();
  });
});
