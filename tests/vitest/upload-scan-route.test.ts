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
const CHECKSUM_SHA256 = "a".repeat(64);
const ATTACHMENT_PATH = `${WORKSPACE_ID}/${USER_ID}/scan-route-proof.pdf`;

function createRequest(secret: string | null, limit = 25, options: { dryRun?: boolean } = {}) {
  const dryRun = options.dryRun ? "&dryRun=1" : "";
  return new Request(`http://localhost/api/internal/upload-scan?limit=${limit}${dryRun}`, {
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
    return this.database.assetForResult as R | null;
  }

  async all<R>() {
    return { success: true, results: this.database.scanRows as R[] };
  }

  async run() {
    this.database.runStatements.push(this);
    if (this.sql.includes("UPDATE upload_assets")) {
      return { success: true, meta: { changes: this.database.updateChanges } };
    }
    return { success: true, meta: { changes: 1 } };
  }
}

class FakeD1Database {
  assetForResult: Record<string, unknown> | null = null;
  runStatements: FakeD1Statement[] = [];
  scanRows: unknown[] = [];
  statements: FakeD1Statement[] = [];
  updateChanges = 1;

  prepare(sql: string) {
    const statement = new FakeD1Statement(this, sql);
    this.statements.push(statement);
    return statement;
  }
}

function createScanDatabase(bytes = new TextEncoder().encode("%PDF-1.7")) {
  const row = {
    id: ASSET_ID,
    upload_session_id: SESSION_ID,
    workspace_id: WORKSPACE_ID,
    actor_user_id: USER_ID,
    surface: "component-attachment",
    status: "finalized",
    storage_bucket: "component-attachments",
    storage_path: ATTACHMENT_PATH,
    file_name: "scan-route-proof.pdf",
    content_type: "application/pdf",
    size_bytes: bytes.byteLength,
    checksum_sha256: CHECKSUM_SHA256,
    scan_status: "pending",
  };

  const database = new FakeD1Database();
  database.assetForResult = row;
  database.scanRows = [row];
  return database;
}

function createR2ScanBinding(database: FakeD1Database, bytes = new TextEncoder().encode("%PDF-1.7")) {
  const r2 = {
    put: vi.fn(),
    get: vi.fn(async () => ({
      size: bytes.byteLength,
      httpMetadata: { contentType: "application/pdf" },
      arrayBuffer: async () => bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength),
    })),
    delete: vi.fn(),
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

describe("internal upload scan route", () => {
  it("fails closed when the job secret is missing or incorrect", async () => {
    const { GET } = await import("@/app/api/internal/upload-scan/route");

    const notConfigured = await GET(createRequest("scan-secret"));
    expect(notConfigured.status).toBe(503);
    expect(notConfigured.headers.get("cache-control")).toContain("no-store");
    await expect(notConfigured.json()).resolves.toEqual({ error: "Upload scan job is not configured." });
    expect(cloudflareMocks.getCloudflareContext).not.toHaveBeenCalled();

    vi.stubEnv("UPLOAD_SCAN_JOB_SECRET", "scan-secret");
    const unauthorized = await GET(createRequest("wrong-secret"));
    expect(unauthorized.status).toBe(401);
    expect(unauthorized.headers.get("cache-control")).toContain("no-store");
    await expect(unauthorized.json()).resolves.toEqual({ error: "Unauthorized." });
    expect(cloudflareMocks.getCloudflareContext).not.toHaveBeenCalled();
  });

  it("runs the scan job with default R2 storage and returns a path-safe summary", async () => {
    vi.stubEnv("UPLOAD_SCAN_JOB_SECRET", "scan-secret");
    vi.stubEnv("UPLOAD_JOBS_ENABLED", "1");
    const database = createScanDatabase();
    const r2 = createR2ScanBinding(database);
    const { GET } = await import("@/app/api/internal/upload-scan/route");

    const response = await GET(createRequest("scan-secret", 900));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toContain("no-store");
    const listStatement = database.statements.find((statement) => statement.sql.includes("ORDER BY created_at ASC"));
    expect(listStatement?.values).toEqual(["component-attachment", "finalized", "pending", "failed_transient", 500]);
    expect(r2.get).toHaveBeenCalledWith(`component-attachments/${ATTACHMENT_PATH}`);
    const update = database.runStatements.find((statement) => statement.sql.includes("UPDATE upload_assets"));
    const event = database.runStatements.find((statement) => statement.sql.includes("INSERT INTO upload_events"));
    expect(update?.values.slice(0, 3)).toEqual([
      "clean",
      "archestimator-policy-scanner",
      expect.any(String),
    ]);
    expect(JSON.parse(update?.values[2] as string)).toEqual(expect.objectContaining({
      scannerVersion: "policy-v1",
      scanJobRunId: expect.stringMatching(/^[0-9a-f-]{36}$/),
    }));
    expect(event?.values[5]).toBe("scan_clean");
    expect(body).toMatchObject({
      scannedCount: 1,
      writeFailedCount: 0,
      downloadFailedCount: 0,
      scannerFailedCount: 0,
      outcomeCounts: {
        clean: 1,
      },
    });
    expect(JSON.stringify(body)).not.toContain(ATTACHMENT_PATH);
    expect(JSON.stringify(database.runStatements.map((statement) => statement.values))).not.toContain(ATTACHMENT_PATH);
  });

  it("uses the R2 binding for scan downloads when Cloudflare R2 storage is selected", async () => {
    vi.stubEnv("UPLOAD_SCAN_JOB_SECRET", "scan-secret");
    vi.stubEnv("UPLOAD_JOBS_ENABLED", "1");
    vi.stubEnv("ARCHESTIMATOR_UPLOAD_STORAGE_PROVIDER", "cloudflare-r2");
    const bytes = new TextEncoder().encode("%PDF-1.7");
    const database = createScanDatabase(bytes);
    const r2 = createR2ScanBinding(database, bytes);
    const { GET } = await import("@/app/api/internal/upload-scan/route");

    const response = await GET(createRequest("scan-secret", 5));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(r2.get).toHaveBeenCalledWith(`component-attachments/${ATTACHMENT_PATH}`);
    const update = database.runStatements.find((statement) => statement.sql.includes("UPDATE upload_assets"));
    expect(update?.values[0]).toBe("clean");
    expect(update?.values[1]).toBe("archestimator-policy-scanner");
    expect(body).toMatchObject({
      scannedCount: 1,
      downloadFailedCount: 0,
      scannerFailedCount: 0,
      outcomeCounts: {
        clean: 1,
      },
    });
    expect(JSON.stringify(body)).not.toContain(ATTACHMENT_PATH);
  });

  it("blocks non-dry-run scans unless upload jobs are explicitly enabled", async () => {
    vi.stubEnv("UPLOAD_SCAN_JOB_SECRET", "scan-secret");
    const { GET } = await import("@/app/api/internal/upload-scan/route");

    const response = await GET(createRequest("scan-secret", 5));

    expect(response.status).toBe(503);
    expect(response.headers.get("cache-control")).toContain("no-store");
    await expect(response.json()).resolves.toEqual({ error: "Upload scan job is disabled." });
    expect(cloudflareMocks.getCloudflareContext).not.toHaveBeenCalled();
  });

  it("supports an authenticated dry run without storage download, scanning, or result writes", async () => {
    vi.stubEnv("UPLOAD_SCAN_JOB_SECRET", "scan-secret");
    const database = createScanDatabase();
    cloudflareMocks.getCloudflareContext.mockResolvedValue({ env: { ARCH_DB: database } });
    const { GET } = await import("@/app/api/internal/upload-scan/route");

    const response = await GET(createRequest("scan-secret", 5, { dryRun: true }));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toContain("no-store");
    const listStatement = database.statements.find((statement) => statement.sql.includes("ORDER BY created_at ASC"));
    expect(listStatement?.values).toEqual(["component-attachment", "finalized", "pending", "failed_transient", 5]);
    expect(database.runStatements).toEqual([]);
    expect(body).toMatchObject({
      mode: "dry-run",
      readRecordCount: 1,
      selectedRecordCount: 1,
      downloadableBuckets: ["component-attachments"],
      pendingCount: 1,
      retryableCount: 0,
      totalBytes: 8,
      scannedCount: 0,
      writeFailedCount: 0,
      downloadFailedCount: 0,
      scannerFailedCount: 0,
      outcomeCounts: {
        clean: 0,
        infected: 0,
        unsupported: 0,
        failed_transient: 0,
        failed_permanent: 0,
      },
    });
    expect(JSON.stringify(body)).not.toContain(ATTACHMENT_PATH);
  });

  it("accepts Vercel CRON_SECRET and records infected policy-scanner results", async () => {
    vi.stubEnv("CRON_SECRET", "cron-secret");
    vi.stubEnv("UPLOAD_JOBS_ENABLED", "1");
    const eicarBytes = new TextEncoder().encode("X5O!P%@AP[4\\PZX54(P^)7CC)7}$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*");
    const database = createScanDatabase(eicarBytes);
    createR2ScanBinding(database, eicarBytes);
    const { GET } = await import("@/app/api/internal/upload-scan/route");

    const response = await GET(createRequest("cron-secret", 1));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.outcomeCounts.infected).toBe(1);
    const update = database.runStatements.find((statement) => statement.sql.includes("UPDATE upload_assets"));
    expect(update?.values[0]).toBe("infected");
    expect(update?.values[1]).toBe("archestimator-policy-scanner");
    expect(JSON.parse(update?.values[2] as string)).toEqual(expect.objectContaining({
      signature: "Eicar-Test-Signature",
    }));
  });
});
