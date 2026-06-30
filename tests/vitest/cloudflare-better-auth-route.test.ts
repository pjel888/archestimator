import { beforeEach, describe, expect, it, vi } from "vitest";

const cloudflareMocks = vi.hoisted(() => ({
  createCloudflareBetterAuthNextHandlersForRequest: vi.fn(),
}));

vi.mock("@/lib/auth/cloudflare-better-auth-runtime", () => cloudflareMocks);

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
  cloudflareMocks.createCloudflareBetterAuthNextHandlersForRequest.mockResolvedValue(null);
});

describe("Cloudflare Better Auth route", () => {
  it("fails closed before delegating when Better Auth is not configured", async () => {
    const { GET } = await import("@/app/api/auth/[...all]/route");

    const response = await GET(createRequest());
    expect(response.status).toBe(503);
    expect(response.headers.get("cache-control")).toContain("no-store");
    await expect(response.json()).resolves.toEqual({ error: "Better Auth route is not configured." });
    expect(cloudflareMocks.createCloudflareBetterAuthNextHandlersForRequest).toHaveBeenCalledWith(
      expect.objectContaining({ method: "GET" }),
    );
  });

  it("constructs D1-backed Better Auth handlers and delegates exported methods", async () => {
    const handlers = createHandlers();
    cloudflareMocks.createCloudflareBetterAuthNextHandlersForRequest.mockResolvedValue(handlers);

    const { GET, POST } = await import("@/app/api/auth/[...all]/route");
    const getResponse = await GET(createRequest());
    const postResponse = await POST(createRequest("/api/auth/sign-in/email", "POST"));

    expect(getResponse.status).toBe(200);
    expect(postResponse.status).toBe(200);
    expect(handlers.GET).toHaveBeenCalledWith(expect.objectContaining({ method: "GET" }));
    expect(handlers.POST).toHaveBeenCalledWith(expect.objectContaining({ method: "POST" }));
    expect(cloudflareMocks.createCloudflareBetterAuthNextHandlersForRequest).toHaveBeenCalledTimes(2);
    expect(cloudflareMocks.createCloudflareBetterAuthNextHandlersForRequest).toHaveBeenCalledWith(
      expect.objectContaining({ method: "GET" }),
    );
  });
});
