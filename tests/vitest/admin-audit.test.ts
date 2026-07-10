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

type BoundStatement = {
  sql: string;
  values: unknown[];
};

class AuditStatement {
  private values: unknown[] = [];

  constructor(
    private readonly database: AuditDatabase,
    private readonly sql: string,
  ) {}

  bind(...values: unknown[]) {
    this.values = values;
    this.database.bound.push({ sql: this.sql, values });
    return this;
  }

  async run() {
    if (this.database.failWrites) throw new Error("D1 write failed");
    return { success: true, meta: { changes: 1 } };
  }

  async first() {
    return { count: 1 };
  }

  async all() {
    return {
      results: [
        {
          id: "audit-1",
          actor_user_id: "admin-1",
          actor_email: "admin@example.com",
          action: "flag.updated",
          target_type: "feature_flag",
          target_id: "admin_dashboard_enabled",
          summary_json: "{\"enabled\":true}",
          request_id: "req-1",
          created_at: "2026-07-10T05:00:00.000Z",
        },
      ],
    };
  }
}

class AuditDatabase {
  bound: BoundStatement[] = [];

  constructor(readonly failWrites = false) {}

  prepare(sql: string) {
    return new AuditStatement(this, sql);
  }
}

beforeEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
});

describe("admin audit repository", () => {
  it("writes admin audit events with generated ids and ISO timestamps", async () => {
    const database = new AuditDatabase();
    d1Mocks.getCloudflareD1Database.mockResolvedValue(database);

    const { writeAdminAuditEvent } = await import("@/lib/admin/audit");
    const result = await writeAdminAuditEvent({
      actorUserId: "admin-1",
      actorEmail: "admin@example.com",
      action: "flag.updated",
      targetType: "feature_flag",
      targetId: "admin_dashboard_enabled",
      summary: { enabled: true },
      requestId: "req-1",
    });

    expect(result.error).toBeNull();
    expect(result.data?.id).toEqual(expect.any(String));
    expect(result.data?.created_at).toEqual(expect.stringContaining("T"));
    expect(database.bound[0]?.sql).toContain("INSERT INTO admin_audit_events");
    expect(database.bound[0]?.values.slice(1, 8)).toEqual([
      "admin-1",
      "admin@example.com",
      "flag.updated",
      "feature_flag",
      "admin_dashboard_enabled",
      "{\"enabled\":true}",
      "req-1",
    ]);
  });

  it("lists audit events with action filtering and pagination", async () => {
    const database = new AuditDatabase();
    d1Mocks.getCloudflareD1Database.mockResolvedValue(database);

    const { listAuditEvents } = await import("@/lib/admin/audit");
    const result = await listAuditEvents({ page: 2, limit: 10, action: "flag.updated" });

    expect(result.error).toBeNull();
    expect(result.count).toBe(1);
    expect(result.data[0]?.action).toBe("flag.updated");
    expect(database.bound.at(-1)?.values).toEqual(["flag.updated", 10, 10]);
  });

  it("logs and returns an error result when D1 writes fail", async () => {
    d1Mocks.getCloudflareD1Database.mockResolvedValue(new AuditDatabase(true));

    const { writeAdminAuditEvent } = await import("@/lib/admin/audit");
    const result = await writeAdminAuditEvent({
      actorUserId: "admin-1",
      actorEmail: "admin@example.com",
      action: "flag.updated",
    });

    expect(result.data).toBeNull();
    expect(result.error).toBe("Admin audit event could not be written.");
    expect(loggerMocks.emitLogRecord).toHaveBeenCalledWith(expect.objectContaining({
      event: "admin_audit_write_failed",
      level: "error",
    }));
  });
});
