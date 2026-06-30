import { beforeEach, describe, expect, it, vi } from "vitest";

const authMocks = vi.hoisted(() => ({
  requireCurrentUserContext: vi.fn(),
}));

const d1Mocks = vi.hoisted(() => ({
  getCloudflareD1Database: vi.fn(),
}));

vi.mock("@/lib/auth/session", () => authMocks);
vi.mock("@/lib/cloudflare/d1", () => d1Mocks);
vi.mock("server-only", () => ({}));

class FakeD1Statement {
  values: unknown[] = [];

  constructor(
    private readonly database: FakeD1Database,
    readonly sql: string,
  ) {}

  bind(...values: unknown[]) {
    this.values = values;
    return this;
  }

  async first<R>() {
    return null as R | null;
  }

  async all<R>() {
    if (this.sql.includes("FROM upload_assets")) {
      if (this.database.failTable === "upload_assets") throw new Error("select failed for private/path.pdf");
      return { success: true, results: this.database.assets as R[] };
    }
    if (this.sql.includes("FROM upload_sessions")) {
      if (this.database.failTable === "upload_sessions") throw new Error("select failed for private/path.pdf");
      return { success: true, results: this.database.sessions as R[] };
    }
    if (this.database.failTable === "upload_events") throw new Error("select failed for private/path.pdf");
    return { success: true, results: this.database.events as R[] };
  }

  async run() {
    return { success: true, meta: { changes: 1 } };
  }
}

class FakeD1Database {
  assets: unknown[] = [];
  sessions: unknown[] = [];
  events: unknown[] = [];
  failTable: "upload_assets" | "upload_sessions" | "upload_events" | null = null;
  statements: FakeD1Statement[] = [];

  prepare(sql: string) {
    const statement = new FakeD1Statement(this, sql);
    this.statements.push(statement);
    return statement;
  }
}

beforeEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
  d1Mocks.getCloudflareD1Database.mockResolvedValue(new FakeD1Database());
});

describe("upload operations dashboard snapshot", () => {
  it("does not open D1 for non-platform-admin users", async () => {
    authMocks.requireCurrentUserContext.mockResolvedValue({ role: "member", userId: "user-1" });
    const { readUploadOperationsDashboardSnapshot } = await import("@/lib/uploads/operations-dashboard");

    await expect(readUploadOperationsDashboardSnapshot()).resolves.toEqual({
      authorized: false,
      error: null,
      snapshot: null,
    });
    expect(d1Mocks.getCloudflareD1Database).not.toHaveBeenCalled();
  });

  it("selects only path-safe aggregate fields from D1 upload tables", async () => {
    authMocks.requireCurrentUserContext.mockResolvedValue({ role: "admin", userId: "user-1" });
    const database = new FakeD1Database();
    d1Mocks.getCloudflareD1Database.mockResolvedValue(database);
    const { readUploadOperationsDashboardSnapshot } = await import("@/lib/uploads/operations-dashboard");

    await readUploadOperationsDashboardSnapshot({ now: new Date("2026-06-27T08:00:00.000Z") });

    expect(d1Mocks.getCloudflareD1Database).toHaveBeenCalled();
    const sql = database.statements.map((statement) => statement.sql).join("\n");
    expect(sql).toContain("SELECT workspace_id, surface, content_type, size_bytes, status, scan_status, scan_provider, created_at, updated_at");
    expect(sql).toContain("SELECT workspace_id, surface, content_type, size_bytes, status, created_at, expires_at");
    expect(sql).toContain("SELECT workspace_id, event_type, created_at");
    expect(sql).not.toMatch(/storage_path|file_name|metadata|signed|token/i);
    for (const statement of database.statements) {
      expect(statement.values).toEqual(["2026-06-26T08:00:00.000Z", 500]);
    }
  });

  it("aggregates upload outcomes, scan backlog, cleanup backlog, and operations events", async () => {
    authMocks.requireCurrentUserContext.mockResolvedValue({ role: "ceo", userId: "user-1" });
    const database = new FakeD1Database();
    database.assets = [
      {
        workspace_id: "workspace-1",
        surface: "component-attachment",
        content_type: "application/pdf",
        size_bytes: 2_000_000,
        status: "finalized",
        scan_status: "pending",
        scan_provider: "clamd",
        created_at: "2026-06-27T07:00:00.000Z",
        updated_at: "2026-06-27T07:00:00.000Z",
      },
      {
        workspace_id: "workspace-1",
        surface: "component-attachment",
        content_type: "application/pdf",
        size_bytes: "3000000",
        status: "finalized",
        scan_status: "failed_transient",
        scan_provider: "clamd",
        created_at: "2026-06-27T06:00:00.000Z",
        updated_at: "2026-06-27T06:05:00.000Z",
      },
      {
        workspace_id: "workspace-1",
        surface: "component-attachment",
        content_type: "application/pdf",
        size_bytes: 1_000,
        status: "finalized",
        scan_status: "infected",
        scan_provider: "clamd",
        created_at: "2026-06-27T07:10:00.000Z",
        updated_at: "2026-06-27T07:10:00.000Z",
      },
      {
        workspace_id: "workspace-1",
        surface: "component-attachment",
        content_type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        size_bytes: 25_000_000,
        status: "finalized",
        scan_status: "unsupported",
        scan_provider: "archestimator-policy-scanner",
        created_at: "2026-06-27T07:15:00.000Z",
        updated_at: "2026-06-27T07:15:00.000Z",
      },
      {
        workspace_id: "workspace-1",
        surface: "component-image",
        content_type: "image/webp",
        size_bytes: 500_000,
        status: "removed",
        scan_status: "not_required",
        scan_provider: null,
        created_at: "2026-06-27T07:20:00.000Z",
        updated_at: "2026-06-27T07:20:00.000Z",
      },
    ];
    database.sessions = [
      {
        workspace_id: "workspace-1",
        surface: "component-attachment",
        content_type: "application/pdf",
        size_bytes: 2_000_000,
        status: "reserved",
        created_at: "2026-06-27T07:30:00.000Z",
        expires_at: "2026-06-27T07:45:00.000Z",
      },
      {
        workspace_id: "workspace-1",
        surface: "component-image",
        content_type: "image/webp",
        size_bytes: 500_000,
        status: "failed",
        created_at: "2026-06-27T07:35:00.000Z",
        expires_at: "2026-06-27T07:40:00.000Z",
      },
    ];
    database.events = [
      { workspace_id: "workspace-1", event_type: "cleanup_queued", created_at: "2026-06-27T07:00:00.000Z" },
      { workspace_id: "workspace-1", event_type: "cleanup_failed", created_at: "2026-06-27T07:01:00.000Z" },
      { workspace_id: "workspace-1", event_type: "cleanup_succeeded", created_at: "2026-06-27T07:02:00.000Z" },
      { workspace_id: "workspace-1", event_type: "download_url_issued", created_at: "2026-06-27T07:03:00.000Z" },
      { workspace_id: "workspace-1", event_type: "scan_override_approved", created_at: "2026-06-27T07:04:00.000Z" },
      { workspace_id: "workspace-1", event_type: "backpressure_denied", created_at: "2026-06-27T07:05:00.000Z" },
      { workspace_id: "workspace-1", event_type: "scan_failed_transient", created_at: "2026-06-27T07:06:00.000Z" },
    ];
    d1Mocks.getCloudflareD1Database.mockResolvedValue(database);
    const { readUploadOperationsDashboardSnapshot } = await import("@/lib/uploads/operations-dashboard");

    const result = await readUploadOperationsDashboardSnapshot({
      now: new Date("2026-06-27T08:00:00.000Z"),
      windowHours: 12,
    });

    expect(result.error).toBeNull();
    expect(result.snapshot).toMatchObject({
      generatedAt: "2026-06-27T08:00:00.000Z",
      windowStart: "2026-06-26T20:00:00.000Z",
      windowHours: 12,
      bySurface: {
        "component-attachment": {
          finalizedAssets: 4,
          removedAssets: 0,
          failedSessions: 0,
          activeOrReservedSessions: 1,
          totalBytes: 30_001_000,
          contentTypes: {
            "application/pdf": 3,
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": 1,
          },
        },
        "component-image": {
          finalizedAssets: 0,
          removedAssets: 1,
          failedSessions: 1,
        },
      },
      scanQueue: {
        queuedCount: 2,
        queuedBytes: 5_000_000,
        oldestQueuedAt: "2026-06-27T06:00:00.000Z",
        blockedCount: 2,
        infectedCount: 1,
        unsupportedCount: 1,
        providerCounts: {
          clamd: 3,
          "archestimator-policy-scanner": 1,
        },
      },
      cleanupBacklog: {
        removedAssetCount: 1,
        expiredSessionCount: 2,
        cleanupQueuedEvents: 1,
        cleanupFailedEvents: 1,
        cleanupSucceededEvents: 1,
        auditEventRetentionDays: 365,
      },
      operationsEvents: {
        downloadUrlIssued: 1,
        scanOverrideApproved: 1,
        backpressureDenied: 1,
        scanFailures: 1,
      },
    });
    expect(JSON.stringify(result.snapshot)).not.toMatch(/storage_path|private\/path|signed|token/i);
  });

  it("returns a generic error when any metrics query fails", async () => {
    authMocks.requireCurrentUserContext.mockResolvedValue({ role: "admin", userId: "user-1" });
    const database = new FakeD1Database();
    database.failTable = "upload_assets";
    d1Mocks.getCloudflareD1Database.mockResolvedValue(database);
    const { readUploadOperationsDashboardSnapshot } = await import("@/lib/uploads/operations-dashboard");

    await expect(readUploadOperationsDashboardSnapshot()).resolves.toEqual({
      authorized: true,
      error: "Upload operations dashboard metrics could not be loaded.",
      snapshot: null,
    });
  });
});
