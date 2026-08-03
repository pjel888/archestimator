import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getCloudflareD1Database: vi.fn(),
  revalidatePath: vi.fn(),
  requireAdminContext: vi.fn(),
  writeAdminAuditEvent: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }));
vi.mock("@/lib/admin/audit", () => ({ writeAdminAuditEvent: mocks.writeAdminAuditEvent }));
vi.mock("@/lib/admin/require-admin", () => ({ requireAdminContext: mocks.requireAdminContext }));
vi.mock("@/lib/cloudflare/d1", () => ({ getCloudflareD1Database: mocks.getCloudflareD1Database }));

class FakeStatement {
  readonly values: unknown[] = [];

  constructor(readonly sql: string) {}

  bind(...values: unknown[]) {
    this.values.push(...values);
    return this;
  }
}

class FakeDatabase {
  readonly batches: FakeStatement[][] = [];

  constructor(
    private readonly batchResults = [
      { success: true, meta: { changes: 1 } },
      { success: true, meta: { changes: 3 } },
      { success: true, meta: { changes: 1 } },
    ],
  ) {}

  prepare(sql: string) {
    return new FakeStatement(sql);
  }

  async batch(statements: FakeStatement[]) {
    this.batches.push(statements);
    return this.batchResults;
  }
}

beforeEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
  mocks.requireAdminContext.mockResolvedValue({ userId: "admin-1", email: "admin@example.com" });
  mocks.writeAdminAuditEvent.mockResolvedValue(undefined);
});

describe("admin notification broadcast persistence", () => {
  it("atomically batches the definition, deliveries, and success audit", async () => {
    const database = new FakeDatabase();
    mocks.getCloudflareD1Database.mockResolvedValue(database);

    const { broadcastNotification } = await import("@/lib/admin/notification-actions");
    const result = await broadcastNotification({
      kind: "system_notice",
      title: "Maintenance complete",
      body: "Archestimator is available again.",
    });

    expect(result).toMatchObject({ ok: true, deliveryCount: 3 });
    expect(database.batches).toHaveLength(1);
    expect(database.batches[0]).toHaveLength(3);
    expect(database.batches[0][0].sql).toContain("INSERT INTO notification_definitions");
    expect(database.batches[0][1].sql).toContain("INSERT INTO notification_deliveries");
    expect(database.batches[0][2].sql).toContain("INSERT INTO admin_audit_events");
    expect(database.batches[0][2].sql).toContain("'notification.broadcast'");
    expect(mocks.writeAdminAuditEvent).not.toHaveBeenCalled();
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/admin");
  });

  it("fails without revalidation when the atomic audit statement is unsuccessful", async () => {
    const database = new FakeDatabase([
      { success: true, meta: { changes: 1 } },
      { success: true, meta: { changes: 3 } },
      { success: false, meta: { changes: 0 } },
    ]);
    mocks.getCloudflareD1Database.mockResolvedValue(database);

    const { broadcastNotification } = await import("@/lib/admin/notification-actions");
    const result = await broadcastNotification({
      kind: "system_notice",
      title: "Maintenance complete",
      body: "Archestimator is available again.",
    });

    expect(result).toEqual({ ok: false, error: "failed" });
    expect(mocks.revalidatePath).not.toHaveBeenCalled();
    expect(mocks.writeAdminAuditEvent).toHaveBeenCalledWith(
      expect.objectContaining({ action: "notification.broadcast_failed" }),
    );
  });

  it("fails without revalidation when the atomic batch throws", async () => {
    const database = new FakeDatabase();
    database.batch = vi.fn().mockRejectedValue(new Error("D1 batch unavailable"));
    mocks.getCloudflareD1Database.mockResolvedValue(database);

    const { broadcastNotification } = await import("@/lib/admin/notification-actions");
    const result = await broadcastNotification({
      kind: "system_notice",
      title: "Maintenance complete",
      body: "Archestimator is available again.",
    });

    expect(result).toEqual({ ok: false, error: "failed" });
    expect(mocks.revalidatePath).not.toHaveBeenCalled();
    expect(mocks.writeAdminAuditEvent).toHaveBeenCalledWith(
      expect.objectContaining({ action: "notification.broadcast_failed" }),
    );
  });
});
