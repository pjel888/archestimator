import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

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
});
