import { beforeEach, describe, expect, it, vi } from "vitest";

const authMocks = vi.hoisted(() => ({
  requireCurrentUserContext: vi.fn(),
}));

const serviceRoleMocks = vi.hoisted(() => ({
  createSupabaseServiceRoleClient: vi.fn(),
}));

vi.mock("@/lib/auth/session", () => authMocks);
vi.mock("@/lib/supabase/service-role", () => serviceRoleMocks);
vi.mock("server-only", () => ({}));

function createQuery(data: unknown[] | null, error: { message: string } | null = null) {
  const query = {
    select: vi.fn(() => query),
    gte: vi.fn(() => query),
    order: vi.fn(() => query),
    limit: vi.fn(async () => ({ data, error })),
  };
  return query;
}

beforeEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
});

describe("upload operations dashboard snapshot", () => {
  it("does not create a service-role client for non-platform-admin users", async () => {
    authMocks.requireCurrentUserContext.mockResolvedValue({ role: "member", userId: "user-1" });
    const { readUploadOperationsDashboardSnapshot } = await import("@/lib/uploads/operations-dashboard");

    await expect(readUploadOperationsDashboardSnapshot()).resolves.toEqual({
      authorized: false,
      error: null,
      snapshot: null,
    });
    expect(serviceRoleMocks.createSupabaseServiceRoleClient).not.toHaveBeenCalled();
  });

  it("selects only path-safe aggregate fields from upload tables", async () => {
    authMocks.requireCurrentUserContext.mockResolvedValue({ role: "admin", userId: "user-1" });
    const assetsQuery = createQuery([]);
    const sessionsQuery = createQuery([]);
    const eventsQuery = createQuery([]);
    serviceRoleMocks.createSupabaseServiceRoleClient.mockReturnValue({
      from: vi.fn((table: string) => {
        if (table === "upload_assets") return assetsQuery;
        if (table === "upload_sessions") return sessionsQuery;
        return eventsQuery;
      }),
    });
    const { readUploadOperationsDashboardSnapshot } = await import("@/lib/uploads/operations-dashboard");

    await readUploadOperationsDashboardSnapshot({ now: new Date("2026-06-27T08:00:00.000Z") });

    expect(serviceRoleMocks.createSupabaseServiceRoleClient).toHaveBeenCalledWith("archestimator-upload-operations-dashboard");
    expect(assetsQuery.select).toHaveBeenCalledWith(
      "workspace_id, surface, content_type, size_bytes, status, scan_status, scan_provider, created_at, updated_at",
    );
    expect(sessionsQuery.select).toHaveBeenCalledWith(
      "workspace_id, surface, content_type, size_bytes, status, created_at, expires_at",
    );
    expect(eventsQuery.select).toHaveBeenCalledWith("workspace_id, event_type, created_at");
    expect(JSON.stringify([
      assetsQuery.select.mock.calls,
      sessionsQuery.select.mock.calls,
      eventsQuery.select.mock.calls,
    ])).not.toMatch(/storage_path|file_name|metadata|signed|token/i);
  });

  it("aggregates upload outcomes, scan backlog, cleanup backlog, and operations events", async () => {
    authMocks.requireCurrentUserContext.mockResolvedValue({ role: "ceo", userId: "user-1" });
    const assetsQuery = createQuery([
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
    ]);
    const sessionsQuery = createQuery([
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
    ]);
    const eventsQuery = createQuery([
      { workspace_id: "workspace-1", event_type: "cleanup_queued", created_at: "2026-06-27T07:00:00.000Z" },
      { workspace_id: "workspace-1", event_type: "cleanup_failed", created_at: "2026-06-27T07:01:00.000Z" },
      { workspace_id: "workspace-1", event_type: "cleanup_succeeded", created_at: "2026-06-27T07:02:00.000Z" },
      { workspace_id: "workspace-1", event_type: "download_url_issued", created_at: "2026-06-27T07:03:00.000Z" },
      { workspace_id: "workspace-1", event_type: "scan_override_approved", created_at: "2026-06-27T07:04:00.000Z" },
      { workspace_id: "workspace-1", event_type: "backpressure_denied", created_at: "2026-06-27T07:05:00.000Z" },
      { workspace_id: "workspace-1", event_type: "scan_failed_transient", created_at: "2026-06-27T07:06:00.000Z" },
    ]);
    serviceRoleMocks.createSupabaseServiceRoleClient.mockReturnValue({
      from: vi.fn((table: string) => {
        if (table === "upload_assets") return assetsQuery;
        if (table === "upload_sessions") return sessionsQuery;
        return eventsQuery;
      }),
    });
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
    serviceRoleMocks.createSupabaseServiceRoleClient.mockReturnValue({
      from: vi.fn((table: string) => {
        if (table === "upload_assets") return createQuery([], { message: "select failed for private/path.pdf" });
        if (table === "upload_sessions") return createQuery([]);
        return createQuery([]);
      }),
    });
    const { readUploadOperationsDashboardSnapshot } = await import("@/lib/uploads/operations-dashboard");

    await expect(readUploadOperationsDashboardSnapshot()).resolves.toEqual({
      authorized: true,
      error: "Upload operations dashboard metrics could not be loaded.",
      snapshot: null,
    });
  });
});
