import { beforeEach, describe, expect, it, vi } from "vitest";

const cloudflareMocks = vi.hoisted(() => ({
  getCloudflareContext: vi.fn(),
}));

vi.mock("@opennextjs/cloudflare", () => cloudflareMocks);
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
    if (this.sql.includes("INSERT INTO upload_asset_cleanup_objects") && this.sql.includes("RETURNING upload_asset_id")) {
      return { upload_asset_id: ASSET_ID } as R;
    }
    return null as R | null;
  }

  async all<R>() {
    if (this.sql.includes("FROM upload_assets")) {
      return { success: true, results: this.database.assetRows as R[] };
    }
    return { success: true, results: this.database.sessionRows as R[] };
  }

  async run() {
    this.database.runStatements.push(this);
    return { success: true, meta: { changes: 1 } };
  }
}

class FakeD1Database {
  assetRows: unknown[] = [];
  runStatements: FakeD1Statement[] = [];
  sessionRows: unknown[] = [];
  statements: FakeD1Statement[] = [];

  prepare(sql: string) {
    const statement = new FakeD1Statement(this, sql);
    this.statements.push(statement);
    return statement;
  }

  async batch(statements: FakeD1Statement[]) {
    return statements.map(() => ({ success: true, meta: { changes: 0 } }));
  }
}

function createCleanupDatabase() {
  const database = new FakeD1Database();
  database.assetRows = [{
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
  }];
  return database;
}

function createR2CleanupBinding(database: FakeD1Database) {
  const r2 = {
    put: vi.fn(),
    get: vi.fn(),
    delete: vi.fn(async () => undefined),
  };
  cloudflareMocks.getCloudflareContext.mockResolvedValue({ env: { ARCH_DB: database, ARCH_UPLOADS_R2: r2 } });
  return r2;
}

beforeEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
  vi.unstubAllEnvs();
  cloudflareMocks.getCloudflareContext.mockReset();
  cloudflareMocks.getCloudflareContext.mockResolvedValue({ env: {} });
});

describe("internal upload cleanup route", () => {
  it("fails closed when the job secret is missing or incorrect", async () => {
    const { GET } = await import("@/app/api/internal/upload-cleanup/route");

    const notConfigured = await GET(createRequest("cleanup-secret"));
    expect(notConfigured.status).toBe(503);
    expect(notConfigured.headers.get("cache-control")).toContain("no-store");
    await expect(notConfigured.json()).resolves.toEqual({ error: "Upload cleanup job is not configured." });
    expect(cloudflareMocks.getCloudflareContext).not.toHaveBeenCalled();

    vi.stubEnv("UPLOAD_CLEANUP_JOB_SECRET", "cleanup-secret");
    const unauthorized = await GET(createRequest("wrong-secret"));
    expect(unauthorized.status).toBe(401);
    expect(unauthorized.headers.get("cache-control")).toContain("no-store");
    await expect(unauthorized.json()).resolves.toEqual({ error: "Unauthorized." });
    expect(cloudflareMocks.getCloudflareContext).not.toHaveBeenCalled();
  });

  it("runs the cleanup job with default R2 storage and returns a path-safe summary", async () => {
    vi.stubEnv("UPLOAD_CLEANUP_JOB_SECRET", "cleanup-secret");
    vi.stubEnv("UPLOAD_JOBS_ENABLED", "1");
    const database = createCleanupDatabase();
    const r2 = createR2CleanupBinding(database);
    const { GET } = await import("@/app/api/internal/upload-cleanup/route");

    const response = await GET(createRequest("cleanup-secret", 5));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toContain("no-store");
    const assetStatement = database.statements.find((statement) => statement.sql.includes("SELECT id, upload_session_id"));
    const sessionStatement = database.statements.find((statement) => statement.sql.includes("FROM upload_sessions"));
    expect(assetStatement?.values.at(-1)).toBe(5);
    expect(sessionStatement?.values[5]).toBe(5);
    expect(r2.delete).toHaveBeenCalledWith(`component-attachments/${ATTACHMENT_PATH}`);
    expect(database.runStatements).toHaveLength(2);
    expect(database.runStatements.map((statement) => statement.values[5])).toEqual([
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
    expect(JSON.stringify(database.runStatements.map((statement) => statement.values))).not.toContain(ATTACHMENT_PATH);
  });

  it("uses the R2 binding for cleanup deletes when Cloudflare R2 storage is selected", async () => {
    vi.stubEnv("UPLOAD_CLEANUP_JOB_SECRET", "cleanup-secret");
    vi.stubEnv("UPLOAD_JOBS_ENABLED", "1");
    vi.stubEnv("ARCHESTIMATOR_UPLOAD_STORAGE_PROVIDER", "cloudflare-r2");
    const database = createCleanupDatabase();
    const r2 = {
      put: vi.fn(),
      get: vi.fn(),
      delete: vi.fn(async () => undefined),
    };
    cloudflareMocks.getCloudflareContext.mockResolvedValue({ env: { ARCH_DB: database, ARCH_UPLOADS_R2: r2 } });
    const { GET } = await import("@/app/api/internal/upload-cleanup/route");

    const response = await GET(createRequest("cleanup-secret", 5));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(r2.delete).toHaveBeenCalledWith(`component-attachments/${ATTACHMENT_PATH}`);
    expect(database.runStatements).toHaveLength(2);
    expect(body.storage).toMatchObject({
      removedCount: 1,
      failedCount: 0,
      rejectedCount: 0,
    });
    expect(JSON.stringify(body)).not.toContain(ATTACHMENT_PATH);
  });

  it("blocks non-dry-run cleanup unless upload jobs are explicitly enabled", async () => {
    vi.stubEnv("UPLOAD_CLEANUP_JOB_SECRET", "cleanup-secret");
    const { GET } = await import("@/app/api/internal/upload-cleanup/route");

    const response = await GET(createRequest("cleanup-secret", 5));

    expect(response.status).toBe(503);
    expect(response.headers.get("cache-control")).toContain("no-store");
    await expect(response.json()).resolves.toEqual({ error: "Upload cleanup job is disabled." });
    expect(cloudflareMocks.getCloudflareContext).not.toHaveBeenCalled();
  });

  it("supports an authenticated dry run without storage removal or cleanup audit writes", async () => {
    vi.stubEnv("UPLOAD_CLEANUP_JOB_SECRET", "cleanup-secret");
    const database = createCleanupDatabase();
    cloudflareMocks.getCloudflareContext.mockResolvedValue({ env: { ARCH_DB: database } });
    const { GET } = await import("@/app/api/internal/upload-cleanup/route");

    const response = await GET(createRequest("cleanup-secret", 5, { dryRun: true }));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toContain("no-store");
    const assetStatement = database.statements.find((statement) => statement.sql.includes("SELECT id, upload_session_id"));
    const sessionStatement = database.statements.find((statement) => statement.sql.includes("FROM upload_sessions"));
    expect(assetStatement?.values.at(-1)).toBe(5);
    expect(sessionStatement?.values[5]).toBe(5);
    expect(database.runStatements).toEqual([]);
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
    const database = createCleanupDatabase();
    createR2CleanupBinding(database);
    const { GET } = await import("@/app/api/internal/upload-cleanup/route");

    const response = await GET(createRequest("cron-secret", 1));

    expect(response.status).toBe(200);
    const assetStatement = database.statements.find((statement) => statement.sql.includes("SELECT id, upload_session_id"));
    expect(assetStatement?.values.at(-1)).toBe(1);
  });

  it("emits cleanup telemetry from the cron route path", async () => {
    vi.stubEnv("CRON_SECRET", "cron-secret");
    vi.stubEnv("UPLOAD_JOBS_ENABLED", "1");
    const telemetry: unknown[] = [];
    const { setUploadOperationalTelemetrySink } = await import("@/lib/uploads/operational-telemetry");
    setUploadOperationalTelemetrySink((record) => telemetry.push(record));
    const database = createCleanupDatabase();
    createR2CleanupBinding(database);
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
