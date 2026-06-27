import { beforeEach, describe, expect, it, vi } from "vitest";

const serviceRoleMocks = vi.hoisted(() => ({
  createSupabaseServiceRoleClient: vi.fn(),
}));

vi.mock("@/lib/supabase/service-role", () => serviceRoleMocks);
vi.mock("server-only", () => ({}));

function createRequest(secret: string | null, options: {
  method?: "GET" | "POST";
  bodyBytes?: Uint8Array;
  contentLength?: string;
} = {}) {
  const headers = new Headers();
  if (secret) headers.set("authorization", `Bearer ${secret}`);
  if (options.contentLength) headers.set("content-length", options.contentLength);

  return new Request("http://localhost/api/internal/upload-runtime", {
    method: options.method ?? "GET",
    headers,
    body: options.bodyBytes,
  });
}

function createRuntimeClient(result: {
  error?: { name?: string; statusCode?: string | number } | null;
  data?: { public?: boolean } | null;
} = {}) {
  const getBucket = vi.fn(async () => ({
    data: result.data ?? { public: false },
    error: result.error ?? null,
  }));
  const client = {
    storage: { getBucket },
  };

  serviceRoleMocks.createSupabaseServiceRoleClient.mockReturnValue(client);
  return { client, getBucket };
}

beforeEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
  vi.unstubAllEnvs();
});

describe("internal upload runtime proof route", () => {
  it("fails closed when the proof secret is missing or incorrect", async () => {
    const { GET } = await import("@/app/api/internal/upload-runtime/route");

    const notConfigured = await GET(createRequest("runtime-secret"));
    expect(notConfigured.status).toBe(503);
    expect(notConfigured.headers.get("cache-control")).toContain("no-store");
    await expect(notConfigured.json()).resolves.toEqual({ error: "Upload runtime proof is not configured." });
    expect(serviceRoleMocks.createSupabaseServiceRoleClient).not.toHaveBeenCalled();

    vi.stubEnv("UPLOAD_RUNTIME_PROOF_SECRET", "runtime-secret");
    const unauthorized = await GET(createRequest("wrong-secret"));
    expect(unauthorized.status).toBe(401);
    expect(unauthorized.headers.get("cache-control")).toContain("no-store");
    await expect(unauthorized.json()).resolves.toEqual({ error: "Unauthorized." });
    expect(serviceRoleMocks.createSupabaseServiceRoleClient).not.toHaveBeenCalled();
  });

  it("returns a no-store sanitized runtime and storage-latency dry run", async () => {
    vi.stubEnv("UPLOAD_RUNTIME_PROOF_SECRET", "runtime-secret");
    vi.stubEnv("ARCH_UPLOAD_HOSTED_MEMORY_MB", "1024");
    vi.stubEnv("ARCH_UPLOAD_HOSTED_BODY_LIMIT_BYTES", "12582912");
    vi.stubEnv("ARCH_UPLOAD_HOSTED_ROUTE_DURATION_MS", "10000");
    vi.stubEnv("ARCH_UPLOAD_HOSTED_CONCURRENT_UPLOADS", "3");
    vi.stubEnv("ARCH_UPLOAD_STORAGE_LATENCY_P95_MS", "250");
    vi.stubEnv("VERCEL", "1");
    vi.stubEnv("VERCEL_ENV", "preview");
    vi.stubEnv("VERCEL_REGION", "iad1");
    const runtimeClient = createRuntimeClient();
    const { GET } = await import("@/app/api/internal/upload-runtime/route");

    const response = await GET(createRequest("runtime-secret"));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toContain("no-store");
    expect(serviceRoleMocks.createSupabaseServiceRoleClient).toHaveBeenCalledWith("archestimator-upload-runtime-proof");
    expect(runtimeClient.getBucket).toHaveBeenCalledWith("component-attachments");
    expect(body).toMatchObject({
      mode: "dry-run",
      proofSurface: "upload-hosted-runtime",
      runtime: "nodejs",
      deployment: {
        vercel: true,
        vercelEnvPresent: true,
        vercelRegionPresent: true,
      },
      configuredLimits: {
        memoryMb: 1024,
        bodyLimitBytes: 12582912,
        routeDurationMs: 10000,
        expectedConcurrentUploads: 3,
        storageLatencyP95Ms: 250,
      },
      bodyProbe: null,
      storageLatency: {
        status: "ok",
        bucketReachable: true,
        bucketPublic: false,
      },
    });
    expect(body.durationMs).toBeGreaterThanOrEqual(0);
    expect(body.memory.before.rssMb).toBeGreaterThan(0);
    expect(JSON.stringify(body)).not.toContain("runtime-secret");
  });

  it("accepts bounded authenticated POST body probes without returning bytes", async () => {
    vi.stubEnv("UPLOAD_RUNTIME_PROOF_SECRET", "runtime-secret");
    createRuntimeClient();
    const { POST } = await import("@/app/api/internal/upload-runtime/route");

    const bodyBytes = new Uint8Array([1, 2, 3, 4, 5]);
    const response = await POST(createRequest("runtime-secret", {
      method: "POST",
      bodyBytes,
      contentLength: String(bodyBytes.byteLength),
    }));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.bodyProbe).toEqual({
      contentLengthBytes: 5,
      receivedBytes: 5,
      maxProbeBodyBytes: 4 * 1024 * 1024,
    });
    expect(JSON.stringify(body)).not.toContain("[1,2,3,4,5]");
  });

  it("rejects oversized body probes before creating a service-role client", async () => {
    vi.stubEnv("UPLOAD_RUNTIME_PROOF_SECRET", "runtime-secret");
    const { POST } = await import("@/app/api/internal/upload-runtime/route");

    const response = await POST(createRequest("runtime-secret", {
      method: "POST",
      contentLength: String(5 * 1024 * 1024),
    }));

    expect(response.status).toBe(413);
    expect(response.headers.get("cache-control")).toContain("no-store");
    await expect(response.json()).resolves.toEqual({ error: "Upload runtime body probe is too large." });
    expect(serviceRoleMocks.createSupabaseServiceRoleClient).not.toHaveBeenCalled();
  });

  it("accepts CRON_SECRET as a shared internal proof secret", async () => {
    vi.stubEnv("CRON_SECRET", "cron-secret");
    createRuntimeClient();
    const { GET } = await import("@/app/api/internal/upload-runtime/route");

    const response = await GET(createRequest("cron-secret"));

    expect(response.status).toBe(200);
    expect(serviceRoleMocks.createSupabaseServiceRoleClient).toHaveBeenCalledWith("archestimator-upload-runtime-proof");
  });
});
