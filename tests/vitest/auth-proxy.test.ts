import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import {
  AUTH_VERIFIED_REQUEST_HEADER,
  AUTH_VERIFIED_REQUEST_HEADER_VALUE,
  TERMS_ACCEPTED_REQUEST_HEADER,
  TERMS_ACCEPTED_REQUEST_HEADER_VALUE,
} from "@/lib/auth/protected-route-gate";
import { AUTH_REQUEST_PATH_HEADER } from "@/lib/auth/redirects";
import {
  createTermsGateCookieValue,
  TERMS_GATE_COOKIE_NAME,
} from "@/lib/legal/terms-gate-cookie";

const OAUTH_STATE_RESET_CLEAR_SITE_DATA = "\"cache\", \"cookies\", \"storage\"";

const supabaseSsrMocks = vi.hoisted(() => ({
  createServerClient: vi.fn(),
}));
const betterAuthRuntimeMocks = vi.hoisted(() => ({
  getCloudflareBetterAuthIdentityFromRequest: vi.fn(),
  isCloudflareBetterAuthProviderEnabled: vi.fn(() => false),
}));

vi.mock("@supabase/ssr", () => supabaseSsrMocks);
vi.mock("@/lib/auth/cloudflare-better-auth-runtime", () => betterAuthRuntimeMocks);

function request(url: string, init?: RequestInit) {
  return new NextRequest(new URL(url), init);
}

function createTermsAcceptanceQuery({
  accepted = true,
  error = null,
}: {
  accepted?: boolean;
  error?: { message?: string } | null;
} = {}) {
  const maybeSingle = vi.fn(async () => ({
    data: accepted
      ? {
          accepted_at: "2026-06-16T00:00:00.000Z",
          terms_version: "terms-2026-06-16",
        }
      : null,
    error,
  }));
  const query = {
    select: vi.fn(() => query),
    eq: vi.fn(() => query),
    order: vi.fn(() => query),
    limit: vi.fn(() => query),
    maybeSingle,
  };
  const from = vi.fn(() => query);
  return { from, query, maybeSingle };
}

function mockUser(user: unknown, options?: { termsAccepted?: boolean; termsError?: { message?: string } | null }) {
  const authUser = user && typeof user === "object" ? user as { id?: unknown; email?: unknown } : null;
  betterAuthRuntimeMocks.getCloudflareBetterAuthIdentityFromRequest.mockResolvedValue(authUser?.id
    ? {
        id: String(authUser.id),
        email: typeof authUser.email === "string" ? authUser.email : "user@example.com",
        displayName: null,
        avatarUrl: null,
      }
    : null);
  const rpc = vi.fn(async () => ({
    data: { allowed: true, status: "active", normalized_email: "user@example.com" },
    error: null,
  }));
  const signOut = vi.fn(async () => ({ error: null }));
  const termsQuery = createTermsAcceptanceQuery({
    accepted: options?.termsAccepted ?? true,
    error: options?.termsError ?? null,
  });
  supabaseSsrMocks.createServerClient.mockImplementation((_url, _key, options) => {
    return {
      auth: {
        getClaims: vi.fn(async () => ({
          data: authUser?.id
            ? {
                claims: {
                  sub: authUser.id,
                  email: typeof authUser.email === "string" ? authUser.email : null,
                },
                header: {},
                signature: new Uint8Array(),
              }
            : null,
          error: null,
        })),
        getUser: vi.fn(async () => ({
          data: { user },
        })),
        signOut: vi.fn(async () => {
          await signOut();
          options.cookies.setAll([
            {
              name: "sb-test-auth-token",
              value: "",
              options: { maxAge: 0, path: "/" },
            },
          ]);
          return { error: null };
        }),
      },
      from: termsQuery.from,
      rpc,
    };
  });
  return { rpc, signOut, termsQuery };
}

describe("auth proxy", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://example.supabase.co");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "anon-key");
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "test-service-role-secret");
    vi.stubEnv("BETTER_AUTH_SECRET", "test-better-auth-secret-with-enough-length");
    vi.stubEnv("ARCHESTIMATOR_DEV_AUTH_BYPASS", "0");
    vi.stubEnv("CLOSED_BETA_ACCESS_ENABLED", "false");
    vi.stubEnv("ARCHESTIMATOR_AUTH_PROVIDER", "better-auth");
    betterAuthRuntimeMocks.isCloudflareBetterAuthProviderEnabled.mockReturnValue(true);
    betterAuthRuntimeMocks.getCloudflareBetterAuthIdentityFromRequest.mockResolvedValue(null);
  });

  it("redirects signed-out protected workshop requests to canonical login with safe next", async () => {
    mockUser(null);
    const { proxy } = await import("@/proxy");

    const response = await proxy(request("http://localhost:3000/workshop?tab=projects"));

    expect(supabaseSsrMocks.createServerClient).not.toHaveBeenCalled();
    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(
      "http://localhost:3000/login?next=%2Fworkshop%3Ftab%3Dprojects",
    );
  });

  it("fails closed to login before creating a Supabase client when hosted env is missing", async () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "");
    mockUser(null);
    const { proxy } = await import("@/proxy");

    const response = await proxy(request("http://localhost:3000/workshop?tab=projects"));

    expect(supabaseSsrMocks.createServerClient).not.toHaveBeenCalled();
    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(
      "http://localhost:3000/login?next=%2Fworkshop%3Ftab%3Dprojects",
    );
  });

  it("fails closed to login when Cloudflare Better Auth is selected but no D1 session is present", async () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "");
    vi.stubEnv("ARCHESTIMATOR_AUTH_PROVIDER", "better-auth");
    betterAuthRuntimeMocks.getCloudflareBetterAuthIdentityFromRequest.mockResolvedValue(null);
    mockUser(null);
    const { proxy } = await import("@/proxy");

    const response = await proxy(request("http://localhost:3000/workshop?tab=projects"));

    expect(supabaseSsrMocks.createServerClient).not.toHaveBeenCalled();
    expect(betterAuthRuntimeMocks.getCloudflareBetterAuthIdentityFromRequest).toHaveBeenCalledWith({
      headers: expect.any(Headers),
      requestUrl: "http://localhost:3000/workshop?tab=projects",
    });
    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(
      "http://localhost:3000/login?next=%2Fworkshop%3Ftab%3Dprojects",
    );
  });

  it("keeps the login route renderable instead of creating a Supabase client when hosted env is missing", async () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "");
    mockUser(null);
    const { proxy } = await import("@/proxy");

    const response = await proxy(request("http://localhost:3000/login"));

    expect(supabaseSsrMocks.createServerClient).not.toHaveBeenCalled();
    expect(response.status).toBe(200);
    expect(response.headers.get(`x-middleware-request-${AUTH_REQUEST_PATH_HEADER}`)).toBe("/login");
  });

  it("redirects signed-in login requests away from the canonical auth entry", async () => {
    mockUser({ id: "user-1" });
    const { proxy } = await import("@/proxy");

    const response = await proxy(request("http://localhost:3000/login?next=/workshop/projects"));

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("http://localhost:3000/workshop");
  });

  it("does not do Supabase beta access work in the proxy", async () => {
    const { rpc, signOut } = mockUser({ id: "user-1", email: "outsider@example.com" });
    vi.stubEnv("CLOSED_BETA_ACCESS_ENABLED", "true");
    const { proxy } = await import("@/proxy");

    const response = await proxy(request("http://localhost:3000/workshop/projects"));

    expect(rpc).not.toHaveBeenCalled();
    expect(signOut).not.toHaveBeenCalled();
    expect(response.status).toBe(200);
    expect(response.headers.get(`x-middleware-request-${AUTH_VERIFIED_REQUEST_HEADER}`)).toBe(
      AUTH_VERIFIED_REQUEST_HEADER_VALUE,
    );
  });

  it("lets the server layout enforce Terms when no valid Terms gate cookie is present", async () => {
    mockUser({ id: "user-1", email: "user@example.com" }, { termsAccepted: false });
    const { proxy } = await import("@/proxy");

    const response = await proxy(request("http://localhost:3000/workshop/projects?view=active"));

    expect(response.status).toBe(200);
    expect(response.headers.get(`x-middleware-request-${AUTH_VERIFIED_REQUEST_HEADER}`)).toBe(
      AUTH_VERIFIED_REQUEST_HEADER_VALUE,
    );
    expect(response.headers.get(`x-middleware-request-${TERMS_ACCEPTED_REQUEST_HEADER}`)).toBeNull();
  });

  it("marks protected workshop requests as auth-verified while leaving Terms to the server layout without the gate cookie", async () => {
    const { termsQuery } = mockUser({ id: "user-1", email: "user@example.com" }, { termsAccepted: true });
    const { proxy } = await import("@/proxy");

    const response = await proxy(request("http://localhost:3000/workshop/projects"));

    expect(response.status).toBe(200);
    expect(termsQuery.from).not.toHaveBeenCalled();
    expect(response.headers.get(`x-middleware-request-${AUTH_VERIFIED_REQUEST_HEADER}`)).toBe(
      AUTH_VERIFIED_REQUEST_HEADER_VALUE,
    );
    expect(response.headers.get(`x-middleware-request-${TERMS_ACCEPTED_REQUEST_HEADER}`)).toBeNull();
    expect(response.cookies.get(TERMS_GATE_COOKIE_NAME)).toBeUndefined();
  });

  it("uses a Cloudflare Better Auth D1 session for protected route gates when selected", async () => {
    mockUser(null, { termsAccepted: true });
    betterAuthRuntimeMocks.getCloudflareBetterAuthIdentityFromRequest.mockResolvedValue({
      id: "better-auth-user-1",
      email: "user@example.com",
      displayName: "User",
      avatarUrl: null,
    });
    const { proxy } = await import("@/proxy");

    const response = await proxy(request("http://localhost:3000/workshop/projects"));

    expect(response.status).toBe(200);
    expect(betterAuthRuntimeMocks.getCloudflareBetterAuthIdentityFromRequest).toHaveBeenCalledWith({
      headers: expect.any(Headers),
      requestUrl: "http://localhost:3000/workshop/projects",
    });
    expect(response.headers.get(`x-middleware-request-${AUTH_VERIFIED_REQUEST_HEADER}`)).toBe(
      AUTH_VERIFIED_REQUEST_HEADER_VALUE,
    );
    expect(response.headers.get(`x-middleware-request-${TERMS_ACCEPTED_REQUEST_HEADER}`)).toBeNull();
  });

  it("skips the Terms database lookup when a valid signed Terms gate cookie is present", async () => {
    const userId = "user-1";
    const cookieValue = await createTermsGateCookieValue(userId);
    const { termsQuery } = mockUser({ id: userId, email: "user@example.com" }, { termsAccepted: false });
    const { proxy } = await import("@/proxy");

    const response = await proxy(
      request("http://localhost:3000/workshop/projects", {
        headers: {
          cookie: `${TERMS_GATE_COOKIE_NAME}=${cookieValue}`,
        },
      }),
    );

    expect(response.status).toBe(200);
    expect(termsQuery.from).not.toHaveBeenCalled();
    expect(response.headers.get(`x-middleware-request-${AUTH_VERIFIED_REQUEST_HEADER}`)).toBe(
      AUTH_VERIFIED_REQUEST_HEADER_VALUE,
    );
    expect(response.headers.get(`x-middleware-request-${TERMS_ACCEPTED_REQUEST_HEADER}`)).toBe(
      TERMS_ACCEPTED_REQUEST_HEADER_VALUE,
    );
  });

  it("strips spoofed protected-route gate headers before forwarding public requests", async () => {
    mockUser({ id: "user-1", email: "user@example.com" });
    const { proxy } = await import("@/proxy");

    const response = await proxy(
      request("http://localhost:3000/about", {
        headers: {
          [AUTH_VERIFIED_REQUEST_HEADER]: AUTH_VERIFIED_REQUEST_HEADER_VALUE,
          [TERMS_ACCEPTED_REQUEST_HEADER]: TERMS_ACCEPTED_REQUEST_HEADER_VALUE,
        },
      }),
    );

    expect(response.status).toBe(200);
    expect(response.headers.get(`x-middleware-request-${AUTH_VERIFIED_REQUEST_HEADER}`)).toBeNull();
    expect(response.headers.get(`x-middleware-request-${TERMS_ACCEPTED_REQUEST_HEADER}`)).toBeNull();
    expect(supabaseSsrMocks.createServerClient).not.toHaveBeenCalled();
  });

  it("does not perform Supabase beta sign-out from the login-route proxy", async () => {
    const { rpc, signOut } = mockUser({ id: "user-1", email: "revoked@example.com" });
    vi.stubEnv("CLOSED_BETA_ACCESS_ENABLED", "true");
    const { proxy } = await import("@/proxy");

    const response = await proxy(request("http://localhost:3000/login"));

    expect(rpc).not.toHaveBeenCalled();
    expect(signOut).not.toHaveBeenCalled();
    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("http://localhost:3000/workshop");
  });

  it("keeps access-required public to avoid redirect loops", async () => {
    mockUser({ id: "user-1", email: "outsider@example.com" });
    vi.stubEnv("CLOSED_BETA_ACCESS_ENABLED", "true");
    const { proxy } = await import("@/proxy");

    const response = await proxy(request("http://localhost:3000/access-required"));

    expect(response.status).toBe(200);
    expect(supabaseSsrMocks.createServerClient).not.toHaveBeenCalled();
  });

  it.each([
    ["landing", "http://localhost:3000/"],
    ["about", "http://localhost:3000/about"],
    ["features", "http://localhost:3000/features"],
    ["pricing", "http://localhost:3000/pricing"],
    ["contact", "http://localhost:3000/contact"],
    ["privacy", "http://localhost:3000/privacy"],
    ["terms", "http://localhost:3000/terms"],
    ["trust", "http://localhost:3000/trust"],
    ["signup", "http://localhost:3000/signup"],
    ["invite token", "http://localhost:3000/invite/invite-token"],
    ["share token", "http://localhost:3000/share/share-token"],
  ])("skips Supabase auth lookup for public %s requests while preserving request path", async (_label, url) => {
    mockUser({ id: "user-1" });
    const { proxy } = await import("@/proxy");

    const response = await proxy(request(url));

    expect(response.status).toBe(200);
    expect(supabaseSsrMocks.createServerClient).not.toHaveBeenCalled();
    expect(response.headers.get(`x-middleware-request-${AUTH_REQUEST_PATH_HEADER}`)).toBe(new URL(url).pathname);
  });

  it.each([
    ["landing", "http://localhost:3000/"],
    ["features", "http://localhost:3000/features"],
    ["trust", "http://localhost:3000/trust"],
    ["signup", "http://localhost:3000/signup"],
  ])("marks public static %s responses cacheable at the edge", async (_label, url) => {
    mockUser({ id: "user-1" });
    const { proxy } = await import("@/proxy");

    const response = await proxy(request(url));

    expect(response.headers.get("Cache-Control")).toBe("s-maxage=31536000");
  });

  it("redirects state mismatch marketing requests to a no-store clean login reset", async () => {
    mockUser({ id: "user-1" });
    const { proxy } = await import("@/proxy");

    const response = await proxy(request("http://localhost:3000/?error=state_mismatch"));

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(
      "http://localhost:3000/login?next=%2Fworkshop&oauth_state_reset=1",
    );
    expect(response.headers.get("Cache-Control")).toBe("private, no-cache, no-store, max-age=0, must-revalidate");
    expect(response.headers.get("Clear-Site-Data")).toBe(OAUTH_STATE_RESET_CLEAR_SITE_DATA);
    expect(response.headers.get("set-cookie")).toContain("__Secure-better-auth.state=; Path=/;");
    expect(supabaseSsrMocks.createServerClient).not.toHaveBeenCalled();
  });

  it("does not add marketing cache headers to invite public routes", async () => {
    mockUser({ id: "user-1" });
    const { proxy } = await import("@/proxy");

    const response = await proxy(request("http://localhost:3000/invite/invite-token"));

    expect(response.headers.get("Cache-Control")).toBeNull();
  });

  it("marks share public routes private and no-store", async () => {
    mockUser({ id: "user-1" });
    const { proxy } = await import("@/proxy");

    const response = await proxy(request("http://localhost:3000/share/share-token"));

    expect(response.headers.get("Cache-Control")).toBe("private, no-cache, no-store, max-age=0, must-revalidate");
  });

  it("does not early-return login because signed-in users still need redirect behavior", async () => {
    mockUser({ id: "user-1" });
    const { proxy } = await import("@/proxy");

    const response = await proxy(request("http://localhost:3000/login"));

    expect(supabaseSsrMocks.createServerClient).not.toHaveBeenCalled();
    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("http://localhost:3000/workshop");
  });
});
