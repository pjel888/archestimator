import { beforeEach, describe, expect, it, vi } from "vitest";

const authMocks = vi.hoisted(() => ({
  requireAdminContext: vi.fn(),
}));

const d1Mocks = vi.hoisted(() => ({
  getCloudflareD1Database: vi.fn(),
}));

const auditMocks = vi.hoisted(() => ({
  writeAdminAuditEvent: vi.fn(),
}));

const cacheMocks = vi.hoisted(() => ({
  revalidatePath: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => cacheMocks);
vi.mock("@/lib/admin/require-admin", () => authMocks);
vi.mock("@/lib/cloudflare/d1", () => d1Mocks);
vi.mock("@/lib/admin/audit", () => auditMocks);

class FlagActionStatement {
  private values: unknown[] = [];

  constructor(
    private readonly database: FlagActionDatabase,
    private readonly sql: string,
  ) {}

  bind(...values: unknown[]) {
    this.values = values;
    return this;
  }

  async run() {
    if (this.sql.includes("UPDATE feature_flags")) {
      const [enabled, updatedAt, updatedBy, key] = this.values;
      this.database.row = {
        key: String(key),
        enabled: enabled === 1 ? 1 : 0,
        description: "Maintenance mode",
        updated_at: String(updatedAt),
        updated_by: String(updatedBy),
      };
    }
    return { success: true, meta: { changes: 1 } };
  }

  async first() {
    return this.database.row;
  }

  async all() {
    return { results: this.database.row ? [this.database.row] : [] };
  }
}

class FlagActionDatabase {
  row: {
    key: string;
    enabled: number;
    description: string | null;
    updated_at: string;
    updated_by: string | null;
  } | null = null;

  prepare(sql: string) {
    return new FlagActionStatement(this, sql);
  }
}

beforeEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
  authMocks.requireAdminContext.mockResolvedValue({
    userId: "admin-1",
    email: "admin@example.com",
    role: "admin",
    profile: {},
    displayName: "Admin",
    avatarUrl: null,
  });
  auditMocks.writeAdminAuditEvent.mockResolvedValue({ data: null, error: null });
});

describe("admin flag actions", () => {
  it("updates a feature flag and writes an audit event", async () => {
    const database = new FlagActionDatabase();
    d1Mocks.getCloudflareD1Database.mockResolvedValue(database);
    const { setFeatureFlag } = await import("@/lib/admin/flag-actions");

    const result = await setFeatureFlag({ key: "admin_maintenance_mode", enabled: true });

    expect(result).toMatchObject({
      ok: true,
      flag: {
        key: "admin_maintenance_mode",
        enabled: true,
        updated_by: "admin-1",
      },
    });
    expect(auditMocks.writeAdminAuditEvent).toHaveBeenCalledWith(expect.objectContaining({
      action: "feature_flag.updated",
      targetId: "admin_maintenance_mode",
      summary: { enabled: true },
    }));
  });

  it("denies flag changes before D1 when admin context fails", async () => {
    authMocks.requireAdminContext.mockRejectedValue(new Error("NEXT_REDIRECT"));
    const { setFeatureFlag } = await import("@/lib/admin/flag-actions");

    await expect(setFeatureFlag({ key: "admin_maintenance_mode", enabled: false })).rejects.toThrow("NEXT_REDIRECT");
    expect(d1Mocks.getCloudflareD1Database).not.toHaveBeenCalled();
  });
});
