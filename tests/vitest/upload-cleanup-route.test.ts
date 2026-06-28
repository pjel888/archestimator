import { beforeEach, describe, expect, it, vi } from "vitest";

const serviceRoleMocks = vi.hoisted(() => ({
  createSupabaseServiceRoleClient: vi.fn(),
}));

vi.mock("@/lib/supabase/service-role", () => serviceRoleMocks);
vi.mock("server-only", () => ({}));

const WORKSPACE_ID = "11111111-1111-4111-8111-111111111111";
const USER_ID = "22222222-2222-4222-8222-222222222222";
const SESSION_ID = "33333333-3333-4333-8333-333333333333";
const ASSET_ID = "44444444-4444-4444-8444-444444444444";
const ATTACHMENT_PATH = `${WORKSPACE_ID}/${USER_ID}/cleanup-route-proof.pdf`;

function createRequest(secret: string | null, limit = 25, options: { dryRun?: boolean } = {}) {
  const dryRun = options.dryRun ? "&dryRun=1" : "";
  return new Request(`http://localhost/api/internal/upload-cleanup?limit=${limit}${dryRun}`, {
    method: "GET",
    headers: secret ? { authorization: `Bearer ${secret}` } : undefined,
  });
}

function createThenableQuery<T>(data: T[]) {
  const query = {
    select: vi.fn(() => query),
    eq: vi.fn(() => query),
    in: vi.fn(() => query),
    lte: vi.fn(() => query),
    order: vi.fn(() => query),
    limit: vi.fn(() => query),
    then: (resolve: (value: { data: T[]; error: null }) => unknown, reject: (reason: unknown) => unknown) => {
      return Promise.resolve({ data, error: null }).then(resolve, reject);
    },
  };

  return query;
}

function createCleanupClient() {
  const assetQuery = createThenableQuery([{
    id: ASSET_ID,
    upload_session_id: SESSION_ID,
    workspace_id: WORKSPACE_ID,
    actor_user_id: USER_ID,
    surface: "component-attachment",
    storage_bucket: "component-attachments",
    storage_path: ATTACHMENT_PATH,
    thumbnail_path: null,
    status: "deleted",
    updated_at: "2026-05-01T00:00:00.000Z",
  }]);
  const sessionQuery = createThenableQuery([]);
  const remove = vi.fn(async () => ({ error: null }));
  const insert = vi.fn(async () => ({ error: null }));
  const from = vi.fn((table: string) => {
    if (table === "upload_assets") return assetQuery;
    if (table === "upload_sessions") return sessionQuery;
    if (table === "upload_events") return { insert };
    throw new Error(`Unexpected table ${table}`);
  });
  const client = {
    from,
    storage: {
      from: vi.fn(() => ({ remove })),
    },
  };

  serviceRoleMocks.createSupabaseServiceRoleClient.mockReturnValue(client);
  return { client, assetQuery, sessionQuery, remove, insert };
}

beforeEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
  vi.unstubAllEnvs();
});

describe("internal upload cleanup route", () => {
  it("fails closed when the job secret is missing or incorrect", async () => {
    const { GET } = await import("@/app/api/internal/upload-cleanup/route");

    const notConfigured = await GET(createRequest("cleanup-secret"));
    expect(notConfigured.status).toBe(503);
    expect(notConfigured.headers.get("cache-control")).toContain("no-store");
    await expect(notConfigured.json()).resolves.toEqual({ error: "Upload cleanup job is not configured." });
    expect(serviceRoleMocks.createSupabaseServiceRoleClient).not.toHaveBeenCalled();

    vi.stubEnv("UPLOAD_CLEANUP_JOB_SECRET", "cleanup-secret");
    const unauthorized = await GET(createRequest("wrong-secret"));
    expect(unauthorized.status).toBe(401);
    expect(unauthorized.headers.get("cache-control")).toContain("no-store");
    await expect(unauthorized.json()).resolves.toEqual({ error: "Unauthorized." });
    expect(serviceRoleMocks.createSupabaseServiceRoleClient).not.toHaveBeenCalled();
  });

  it("runs the cleanup job with service-role storage and returns a path-safe summary", async () => {
    vi.stubEnv("UPLOAD_CLEANUP_JOB_SECRET", "cleanup-secret");
    vi.stubEnv("UPLOAD_JOBS_ENABLED", "1");
    const cleanup = createCleanupClient();
    const { GET } = await import("@/app/api/internal/upload-cleanup/route");

    const response = await GET(createRequest("cleanup-secret", 5));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toContain("no-store");
    expect(serviceRoleMocks.createSupabaseServiceRoleClient).toHaveBeenCalledWith("archestimator-upload-cleanup-job");
    expect(cleanup.assetQuery.limit).toHaveBeenCalledWith(5);
    expect(cleanup.sessionQuery.limit).toHaveBeenCalledWith(5);
    expect(cleanup.remove).toHaveBeenCalledWith([ATTACHMENT_PATH]);
    expect(cleanup.insert).toHaveBeenCalledTimes(2);
    expect(cleanup.insert.mock.calls.map((call) => call[0].event_type)).toEqual([
      "cleanup_queued",
      "cleanup_succeeded",
    ]);
    expect(body).toMatchObject({
      planner: {
        candidateCount: 1,
        rejectedCount: 0,
        candidateBuckets: ["component-attachments"],
      },
      storage: {
        removedCount: 1,
        failedCount: 0,
        rejectedCount: 0,
      },
      audit: {
        queuedCount: 1,
        succeededCount: 1,
        failedCount: 0,
        writeFailureCount: 0,
      },
      operationalSnapshot: {
        status: "healthy",
      },
    });
    expect(JSON.stringify(body)).not.toContain(ATTACHMENT_PATH);
    expect(JSON.stringify(cleanup.insert.mock.calls)).not.toContain(ATTACHMENT_PATH);
  });

  it("blocks non-dry-run cleanup unless upload jobs are explicitly enabled", async () => {
    vi.stubEnv("UPLOAD_CLEANUP_JOB_SECRET", "cleanup-secret");
    const { GET } = await import("@/app/api/internal/upload-cleanup/route");

    const response = await GET(createRequest("cleanup-secret", 5));

    expect(response.status).toBe(503);
    expect(response.headers.get("cache-control")).toContain("no-store");
    await expect(response.json()).resolves.toEqual({ error: "Upload cleanup job is disabled." });
    expect(serviceRoleMocks.createSupabaseServiceRoleClient).not.toHaveBeenCalled();
  });

  it("supports an authenticated dry run without storage removal or cleanup audit writes", async () => {
    vi.stubEnv("UPLOAD_CLEANUP_JOB_SECRET", "cleanup-secret");
    const cleanup = createCleanupClient();
    const { GET } = await import("@/app/api/internal/upload-cleanup/route");

    const response = await GET(createRequest("cleanup-secret", 5, { dryRun: true }));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toContain("no-store");
    expect(cleanup.assetQuery.limit).toHaveBeenCalledWith(5);
    expect(cleanup.sessionQuery.limit).toHaveBeenCalledWith(5);
    expect(cleanup.remove).not.toHaveBeenCalled();
    expect(cleanup.insert).not.toHaveBeenCalled();
    expect(body).toMatchObject({
      mode: "dry-run",
      readRecordCount: 1,
      planner: {
        candidateCount: 1,
        rejectedCount: 0,
        candidateBuckets: ["component-attachments"],
      },
      storage: {
        removedCount: 0,
        failedCount: 0,
        rejectedCount: 0,
        failedBuckets: [],
      },
      audit: {
        queuedCount: 0,
        succeededCount: 0,
        failedCount: 0,
        writeFailureCount: 0,
      },
      operationalSnapshot: {
        status: "healthy",
      },
    });
    expect(JSON.stringify(body)).not.toContain(ATTACHMENT_PATH);
  });

  it("accepts Vercel CRON_SECRET even when a manual cleanup secret is also configured", async () => {
    vi.stubEnv("CRON_SECRET", "cron-secret");
    vi.stubEnv("UPLOAD_CLEANUP_JOB_SECRET", "manual-cleanup-secret");
    vi.stubEnv("UPLOAD_JOBS_ENABLED", "1");
    createCleanupClient();
    const { GET } = await import("@/app/api/internal/upload-cleanup/route");

    const response = await GET(createRequest("cron-secret", 1));

    expect(response.status).toBe(200);
    expect(serviceRoleMocks.createSupabaseServiceRoleClient).toHaveBeenCalledWith("archestimator-upload-cleanup-job");
  });

  it("emits cleanup telemetry from the cron route path", async () => {
    vi.stubEnv("CRON_SECRET", "cron-secret");
    vi.stubEnv("UPLOAD_JOBS_ENABLED", "1");
    const telemetry: unknown[] = [];
    const { setUploadOperationalTelemetrySink } = await import("@/lib/uploads/operational-telemetry");
    setUploadOperationalTelemetrySink((record) => telemetry.push(record));
    createCleanupClient();
    const { GET } = await import("@/app/api/internal/upload-cleanup/route");

    const response = await GET(createRequest("cron-secret", 5));

    expect(response.status).toBe(200);
    expect(telemetry).toEqual([expect.objectContaining({
      event: "upload_cleanup_run_completed",
      source: "cleanup-job",
      status: "healthy",
      cleanupCandidates: 1,
      cleanupRemoved: 1,
      cleanupSucceeded: 1,
    })]);
    expect(JSON.stringify(telemetry)).not.toContain(ATTACHMENT_PATH);
  });
});
