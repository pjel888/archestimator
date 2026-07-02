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

  it("adds no-store cache control to delegated successful Better Auth responses", async () => {
    const handlers = createHandlers();
    cloudflareMocks.createCloudflareBetterAuthNextHandlersForRequest.mockResolvedValue(handlers);

    const { GET, POST } = await import("@/app/api/auth/[...all]/route");
    const getResponse = await GET(createRequest());
    const postResponse = await POST(createRequest("/api/auth/sign-in/social", "POST"));

    expect(getResponse.headers.get("cache-control")).toBe("private, no-cache, no-store, max-age=0, must-revalidate");
    expect(postResponse.headers.get("cache-control")).toBe("private, no-cache, no-store, max-age=0, must-revalidate");
  });

  it("preserves delegated no-store cache control when Better Auth already sets it", async () => {
    const handlers = createHandlers();
    handlers.GET.mockResolvedValue(Response.json({ ok: true }, {
      headers: { "cache-control": "private, no-store" },
    }));
    cloudflareMocks.createCloudflareBetterAuthNextHandlersForRequest.mockResolvedValue(handlers);

    const { GET } = await import("@/app/api/auth/[...all]/route");
    const response = await GET(createRequest());

    expect(response.headers.get("cache-control")).toBe("private, no-store");
  });

  it("normalizes duplicate OAuth state cookies before Better Auth handles Google callbacks", async () => {
    const handlers = createHandlers();
    cloudflareMocks.createCloudflareBetterAuthNextHandlersForRequest.mockResolvedValue(handlers);

    const { GET } = await import("@/app/api/auth/[...all]/route");
    const response = await GET(new Request("https://archestimator.com/api/auth/callback/google?state=fresh-state", {
      headers: {
        cookie:
          "theme=light; __Secure-better-auth.state=old-state.old-signature; "
          + "better-auth.session_token=session; __Secure-better-auth.state=fresh-state.fresh%2Fsignature",
      },
    }));

    expect(response.status).toBe(200);
    const routedRequest = handlers.GET.mock.calls[0]?.[0] as Request;
    expect(routedRequest.headers.get("cookie")).toBe(
      "theme=light; better-auth.session_token=session; __Secure-better-auth.state=fresh-state.fresh%2Fsignature",
    );
    expect(cloudflareMocks.createCloudflareBetterAuthNextHandlersForRequest).toHaveBeenCalledWith(
      expect.objectContaining({ method: "GET" }),
    );
  });
});
