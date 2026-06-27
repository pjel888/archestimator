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
const CHECKSUM_SHA256 = "a".repeat(64);
const ATTACHMENT_PATH = `${WORKSPACE_ID}/${USER_ID}/scan-route-proof.pdf`;

function createRequest(secret: string | null, limit = 25, options: { dryRun?: boolean } = {}) {
  const dryRun = options.dryRun ? "&dryRun=1" : "";
  return new Request(`http://localhost/api/internal/upload-scan?limit=${limit}${dryRun}`, {
    method: "GET",
    headers: secret ? { authorization: `Bearer ${secret}` } : undefined,
  });
}

function createThenableQuery<T>(data: T[]) {
  const query = {
    select: vi.fn(() => query),
    eq: vi.fn(() => query),
    in: vi.fn(() => query),
    order: vi.fn(() => query),
    limit: vi.fn(() => query),
    then: (resolve: (value: { data: T[]; error: null }) => unknown, reject: (reason: unknown) => unknown) => {
      return Promise.resolve({ data, error: null }).then(resolve, reject);
    },
  };

  return query;
}

function createScanClient(bytes = new TextEncoder().encode("%PDF-1.7")) {
  const assetQuery = createThenableQuery([{
    id: ASSET_ID,
    upload_session_id: SESSION_ID,
    workspace_id: WORKSPACE_ID,
    actor_user_id: USER_ID,
    storage_bucket: "component-attachments",
    storage_path: ATTACHMENT_PATH,
    file_name: "scan-route-proof.pdf",
    content_type: "application/pdf",
    size_bytes: bytes.byteLength,
    checksum_sha256: CHECKSUM_SHA256,
    scan_status: "pending",
  }]);
  const download = vi.fn(async () => ({ data: bytes, error: null }));
  const rpc = vi.fn(async () => ({ error: null }));
  const from = vi.fn((table: string) => {
    if (table === "upload_assets") return assetQuery;
    throw new Error(`Unexpected table ${table}`);
  });
  const client = {
    from,
    rpc,
    storage: {
      from: vi.fn(() => ({ download })),
    },
  };

  serviceRoleMocks.createSupabaseServiceRoleClient.mockReturnValue(client);
  return { client, assetQuery, download, rpc };
}

beforeEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
  vi.unstubAllEnvs();
});

describe("internal upload scan route", () => {
  it("fails closed when the job secret is missing or incorrect", async () => {
    const { GET } = await import("@/app/api/internal/upload-scan/route");

    const notConfigured = await GET(createRequest("scan-secret"));
    expect(notConfigured.status).toBe(503);
    expect(notConfigured.headers.get("cache-control")).toContain("no-store");
    await expect(notConfigured.json()).resolves.toEqual({ error: "Upload scan job is not configured." });
    expect(serviceRoleMocks.createSupabaseServiceRoleClient).not.toHaveBeenCalled();

    vi.stubEnv("UPLOAD_SCAN_JOB_SECRET", "scan-secret");
    const unauthorized = await GET(createRequest("wrong-secret"));
    expect(unauthorized.status).toBe(401);
    expect(unauthorized.headers.get("cache-control")).toContain("no-store");
    await expect(unauthorized.json()).resolves.toEqual({ error: "Unauthorized." });
    expect(serviceRoleMocks.createSupabaseServiceRoleClient).not.toHaveBeenCalled();
  });

  it("runs the scan job with service-role storage and returns a path-safe summary", async () => {
    vi.stubEnv("UPLOAD_SCAN_JOB_SECRET", "scan-secret");
    const scan = createScanClient();
    const { GET } = await import("@/app/api/internal/upload-scan/route");

    const response = await GET(createRequest("scan-secret", 900));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toContain("no-store");
    expect(serviceRoleMocks.createSupabaseServiceRoleClient).toHaveBeenCalledWith("archestimator-upload-scan-job");
    expect(scan.assetQuery.limit).toHaveBeenCalledWith(500);
    expect(scan.client.storage.from).toHaveBeenCalledWith("component-attachments");
    expect(scan.download).toHaveBeenCalledWith(ATTACHMENT_PATH);
    expect(scan.rpc).toHaveBeenCalledWith("record_upload_scan_result", {
      target_asset_id: ASSET_ID,
      expected_checksum_sha256: CHECKSUM_SHA256,
      scanner_provider: "archestimator-policy-scanner",
      scanner_status: "clean",
      scanner_result: expect.objectContaining({
        scannerVersion: "policy-v1",
        scanJobRunId: expect.stringMatching(/^[0-9a-f-]{36}$/),
      }),
    });
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
    expect(JSON.stringify(scan.rpc.mock.calls)).not.toContain(ATTACHMENT_PATH);
  });

  it("supports an authenticated dry run without storage download, scanning, or result writes", async () => {
    vi.stubEnv("UPLOAD_SCAN_JOB_SECRET", "scan-secret");
    const scan = createScanClient();
    const { GET } = await import("@/app/api/internal/upload-scan/route");

    const response = await GET(createRequest("scan-secret", 5, { dryRun: true }));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toContain("no-store");
    expect(serviceRoleMocks.createSupabaseServiceRoleClient).toHaveBeenCalledWith("archestimator-upload-scan-job");
    expect(scan.assetQuery.limit).toHaveBeenCalledWith(5);
    expect(scan.download).not.toHaveBeenCalled();
    expect(scan.rpc).not.toHaveBeenCalled();
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
    const eicarBytes = new TextEncoder().encode("X5O!P%@AP[4\\PZX54(P^)7CC)7}$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*");
    const scan = createScanClient(eicarBytes);
    const { GET } = await import("@/app/api/internal/upload-scan/route");

    const response = await GET(createRequest("cron-secret", 1));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.outcomeCounts.infected).toBe(1);
    expect(scan.rpc).toHaveBeenCalledWith("record_upload_scan_result", expect.objectContaining({
      scanner_provider: "archestimator-policy-scanner",
      scanner_status: "infected",
      scanner_result: expect.objectContaining({
        signature: "Eicar-Test-Signature",
      }),
    }));
  });
});
