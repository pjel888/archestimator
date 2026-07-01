import { beforeEach, describe, expect, it, vi } from "vitest";

const cloudflareMocks = vi.hoisted(() => ({
  getCloudflareContext: vi.fn(),
}));

vi.mock("@opennextjs/cloudflare", () => cloudflareMocks);
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

function createR2RuntimeBinding(result: {
  listError?: Error | null;
} = {}, env: Record<string, string> = {}) {
  const list = vi.fn(async () => {
    if (result.listError) throw result.listError;
    return { objects: [] };
  });
  const r2 = { list };

  cloudflareMocks.getCloudflareContext.mockResolvedValue({ env: { ...env, ARCH_UPLOADS_R2: r2 } });
  return { r2, list };
}

beforeEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
  vi.unstubAllEnvs();
  vi.stubEnv("ARCHESTIMATOR_UPLOAD_STORAGE_PROVIDER", "cloudflare-r2");
  cloudflareMocks.getCloudflareContext.mockResolvedValue({ env: {} });
});

describe("internal upload runtime proof route", () => {
  it("fails closed when the proof secret is missing or incorrect", async () => {
    const { GET } = await import("@/app/api/internal/upload-runtime/route");

    const notConfigured = await GET(createRequest("runtime-secret"));
    expect(notConfigured.status).toBe(503);
    expect(notConfigured.headers.get("cache-control")).toContain("no-store");
    await expect(notConfigured.json()).resolves.toEqual({ error: "Upload runtime proof is not configured." });
    expect(cloudflareMocks.getCloudflareContext).not.toHaveBeenCalled();

    vi.stubEnv("UPLOAD_RUNTIME_PROOF_SECRET", "runtime-secret");
    const unauthorized = await GET(createRequest("wrong-secret"));
    expect(unauthorized.status).toBe(401);
    expect(unauthorized.headers.get("cache-control")).toContain("no-store");
    await expect(unauthorized.json()).resolves.toEqual({ error: "Unauthorized." });
    expect(cloudflareMocks.getCloudflareContext).not.toHaveBeenCalled();
  });

  it("returns a no-store sanitized runtime and storage-latency dry run", async () => {
    vi.stubEnv("UPLOAD_RUNTIME_PROOF_SECRET", "runtime-secret");
    vi.stubEnv("ARCH_UPLOAD_HOSTED_MEMORY_MB", "1024");
    vi.stubEnv("ARCH_UPLOAD_HOSTED_BODY_LIMIT_BYTES", "12582912");
    vi.stubEnv("ARCH_UPLOAD_HOSTED_ROUTE_DURATION_MS", "10000");
    vi.stubEnv("ARCH_UPLOAD_HOSTED_CONCURRENT_UPLOADS", "3");
    vi.stubEnv("ARCH_UPLOAD_STORAGE_LATENCY_P95_MS", "250");
    const runtimeClient = createR2RuntimeBinding();
    const { GET } = await import("@/app/api/internal/upload-runtime/route");

    const response = await GET(createRequest("runtime-secret"));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toContain("no-store");
    expect(runtimeClient.list).toHaveBeenCalledWith({ prefix: "component-attachments/", limit: 1 });
    expect(body).toMatchObject({
      mode: "dry-run",
      proofSurface: "upload-hosted-runtime",
      runtime: "nodejs",
      deployment: {
        targetRuntime: "cloudflare-workers-open-next",
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
        provider: "cloudflare-r2",
        status: "ok",
        bucketReachable: true,
        bucketPublic: null,
      },
    });
    expect(body.durationMs).toBeGreaterThanOrEqual(0);
    expect(body.memory.before.rssMb).toBeGreaterThan(0);
    expect(JSON.stringify(body)).not.toContain("runtime-secret");
  });

  it("uses Cloudflare env provider and runtime limits over stale process values", async () => {
    vi.stubEnv("UPLOAD_RUNTIME_PROOF_SECRET", "runtime-secret");
    vi.stubEnv("ARCHESTIMATOR_UPLOAD_STORAGE_PROVIDER", "legacy-storage");
    vi.stubEnv("ARCH_UPLOAD_HOSTED_MEMORY_MB", "1024");
    createR2RuntimeBinding({}, {
      ARCHESTIMATOR_UPLOAD_STORAGE_PROVIDER: "cloudflare-r2",
      ARCH_UPLOAD_HOSTED_MEMORY_MB: "128",
      ARCH_UPLOAD_HOSTED_BODY_LIMIT_BYTES: "4194304",
      ARCH_UPLOAD_HOSTED_ROUTE_DURATION_MS: "30000",
      ARCH_UPLOAD_HOSTED_CONCURRENT_UPLOADS: "3",
      ARCH_UPLOAD_STORAGE_LATENCY_P95_MS: "250",
    });
    const { GET } = await import("@/app/api/internal/upload-runtime/route");

    const response = await GET(createRequest("runtime-secret"));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.configuredLimits).toEqual({
      memoryMb: 128,
      bodyLimitBytes: 4194304,
      routeDurationMs: 30000,
      expectedConcurrentUploads: 3,
      storageLatencyP95Ms: 250,
    });
    expect(body.storageLatency).toMatchObject({
      provider: "cloudflare-r2",
      status: "ok",
      bucketReachable: true,
    });
  });

  it("accepts bounded authenticated POST body probes without returning bytes", async () => {
    vi.stubEnv("UPLOAD_RUNTIME_PROOF_SECRET", "runtime-secret");
    createR2RuntimeBinding();
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

  it("rejects oversized body probes before touching storage", async () => {
    vi.stubEnv("UPLOAD_RUNTIME_PROOF_SECRET", "runtime-secret");
    const { POST } = await import("@/app/api/internal/upload-runtime/route");

    const response = await POST(createRequest("runtime-secret", {
      method: "POST",
      contentLength: String(5 * 1024 * 1024),
    }));

    expect(response.status).toBe(413);
    expect(response.headers.get("cache-control")).toContain("no-store");
    await expect(response.json()).resolves.toEqual({ error: "Upload runtime body probe is too large." });
    expect(cloudflareMocks.getCloudflareContext).not.toHaveBeenCalled();
  });

  it("accepts CRON_SECRET as a shared internal proof secret", async () => {
    vi.stubEnv("CRON_SECRET", "cron-secret");
    createR2RuntimeBinding();
    const { GET } = await import("@/app/api/internal/upload-runtime/route");

    const response = await GET(createRequest("cron-secret"));

    expect(response.status).toBe(200);
    expect(cloudflareMocks.getCloudflareContext).toHaveBeenCalled();
  });
});
