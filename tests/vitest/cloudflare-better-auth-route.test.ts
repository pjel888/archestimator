import { beforeEach, describe, expect, it, vi } from "vitest";

const cloudflareMocks = vi.hoisted(() => ({
  getCloudflareContext: vi.fn(),
}));
const betterAuthMocks = vi.hoisted(() => ({
  createCloudflareBetterAuthNextHandlers: vi.fn(),
}));

vi.mock("@opennextjs/cloudflare", () => cloudflareMocks);
vi.mock("@/lib/auth/better-auth-cloudflare", () => betterAuthMocks);

const VALID_SECRET = "better-auth-route-secret-32-chars-minimum";

function createRequest(path = "/api/auth/get-session", method = "GET") {
  return new Request(`https://app.archestimator.com${path}`, { method });
}

function createHandlers() {
  return {
    GET: vi.fn(async () => Response.json({ method: "GET" })),
    POST: vi.fn(async () => Response.json({ method: "POST" })),
    PATCH: vi.fn(async () => Response.json({ method: "PATCH" })),
    PUT: vi.fn(async () => Response.json({ method: "PUT" })),
    DELETE: vi.fn(async () => Response.json({ method: "DELETE" })),
  };
}

beforeEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
  vi.unstubAllEnvs();
  cloudflareMocks.getCloudflareContext.mockResolvedValue({ env: {}, ctx: { waitUntil: vi.fn() } });
});

describe("Cloudflare Better Auth route", () => {
  it("fails closed before constructing handlers when the secret or D1 binding is missing", async () => {
    const { GET } = await import("@/app/api/auth/[...all]/route");

    const missingSecret = await GET(createRequest());
    expect(missingSecret.status).toBe(503);
    expect(missingSecret.headers.get("cache-control")).toContain("no-store");
    await expect(missingSecret.json()).resolves.toEqual({ error: "Better Auth route is not configured." });
    expect(cloudflareMocks.getCloudflareContext).not.toHaveBeenCalled();
    expect(betterAuthMocks.createCloudflareBetterAuthNextHandlers).not.toHaveBeenCalled();

    vi.stubEnv("BETTER_AUTH_SECRET", VALID_SECRET);
    const missingD1 = await GET(createRequest());
    expect(missingD1.status).toBe(503);
    expect(missingD1.headers.get("cache-control")).toContain("no-store");
    await expect(missingD1.json()).resolves.toEqual({ error: "Better Auth D1 binding is not available." });
    expect(betterAuthMocks.createCloudflareBetterAuthNextHandlers).not.toHaveBeenCalled();
  });

  it("constructs D1-backed Better Auth handlers and delegates exported methods", async () => {
    const archDb = { prepare: vi.fn() };
    const waitUntil = vi.fn();
    const handlers = createHandlers();
    vi.stubEnv("BETTER_AUTH_SECRET", VALID_SECRET);
    vi.stubEnv("BETTER_AUTH_URL", "https://app.archestimator.com");
    vi.stubEnv("BETTER_AUTH_TRUSTED_ORIGINS", "https://app.archestimator.com,http://localhost:3000");
    cloudflareMocks.getCloudflareContext.mockResolvedValue({ env: { ARCH_DB: archDb }, ctx: { waitUntil } });
    betterAuthMocks.createCloudflareBetterAuthNextHandlers.mockResolvedValue(handlers);

    const { GET, POST } = await import("@/app/api/auth/[...all]/route");
    const getResponse = await GET(createRequest());
    const postResponse = await POST(createRequest("/api/auth/sign-in/email", "POST"));

    expect(getResponse.status).toBe(200);
    expect(postResponse.status).toBe(200);
    expect(handlers.GET).toHaveBeenCalledWith(expect.objectContaining({ method: "GET" }));
    expect(handlers.POST).toHaveBeenCalledWith(expect.objectContaining({ method: "POST" }));
    expect(betterAuthMocks.createCloudflareBetterAuthNextHandlers).toHaveBeenCalledTimes(2);
    expect(betterAuthMocks.createCloudflareBetterAuthNextHandlers).toHaveBeenCalledWith({
      d1Database: archDb,
      baseURL: "https://app.archestimator.com",
      secret: VALID_SECRET,
      trustedOrigins: ["https://app.archestimator.com", "http://localhost:3000"],
      waitUntil: expect.any(Function),
    });

    const firstCallOptions = betterAuthMocks.createCloudflareBetterAuthNextHandlers.mock.calls[0][0];
    firstCallOptions.waitUntil(Promise.resolve("background"));
    expect(waitUntil).toHaveBeenCalledTimes(1);
  });
});
