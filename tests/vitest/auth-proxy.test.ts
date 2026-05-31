import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { AUTH_REQUEST_PATH_HEADER } from "@/lib/auth/redirects";

const supabaseSsrMocks = vi.hoisted(() => ({
  createServerClient: vi.fn(),
}));

vi.mock("@supabase/ssr", () => supabaseSsrMocks);

function request(url: string) {
  return new NextRequest(new URL(url));
}

function mockUser(user: unknown) {
  supabaseSsrMocks.createServerClient.mockReturnValue({
    auth: {
      getUser: vi.fn(async () => ({
        data: { user },
      })),
    },
  });
}

describe("auth proxy", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://example.supabase.co");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "anon-key");
    vi.stubEnv("ARCHESTIMATOR_DEV_AUTH_BYPASS", "0");
  });

  it("redirects signed-out protected workshop requests to canonical login with safe next", async () => {
    mockUser(null);
    const { proxy } = await import("@/proxy");

    const response = await proxy(request("http://localhost:3000/workshop?tab=projects"));

    expect(supabaseSsrMocks.createServerClient).toHaveBeenCalledTimes(1);
    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(
      "http://localhost:3000/login?next=%2Fworkshop%3Ftab%3Dprojects",
    );
  });

  it("redirects signed-in login requests away from the canonical auth entry", async () => {
    mockUser({ id: "user-1" });
    const { proxy } = await import("@/proxy");

    const response = await proxy(request("http://localhost:3000/login?next=/workshop/projects"));

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("http://localhost:3000/workshop");
  });

  it.each([
    ["landing", "http://localhost:3000/"],
    ["about", "http://localhost:3000/about"],
    ["features", "http://localhost:3000/features"],
    ["pricing", "http://localhost:3000/pricing"],
    ["contact", "http://localhost:3000/contact"],
    ["privacy", "http://localhost:3000/privacy"],
    ["terms", "http://localhost:3000/terms"],
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

  it("does not early-return login because signed-in users still need redirect behavior", async () => {
    mockUser({ id: "user-1" });
    const { proxy } = await import("@/proxy");

    const response = await proxy(request("http://localhost:3000/login"));

    expect(supabaseSsrMocks.createServerClient).toHaveBeenCalledTimes(1);
    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("http://localhost:3000/workshop");
  });
});
