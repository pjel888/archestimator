import { beforeEach, describe, expect, it, vi } from "vitest";

const supabaseServerMocks = vi.hoisted(() => ({
  createSupabaseServerClient: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => supabaseServerMocks);

const betterAuthRuntimeMocks = vi.hoisted(() => ({
  createCloudflareBetterAuthForRequest: vi.fn(),
}));

vi.mock("@/lib/auth/cloudflare-better-auth-runtime", () => betterAuthRuntimeMocks);

const params = {
  params: Promise.resolve({ token: "invite-token" }),
};

function postInviteSignOut(headers: Record<string, string> = {}) {
  return new Request("https://app.archestimator.test/invite/invite-token/sign-out", {
    method: "POST",
    headers,
  });
}

describe("/invite/[token]/sign-out route security", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it("rejects cross-origin sign-out before touching the auth session", async () => {
    const { POST } = await import("@/app/invite/[token]/sign-out/route");

    const response = await POST(postInviteSignOut({
      host: "app.archestimator.test",
      origin: "https://evil.example",
    }), params);

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({ error: "Invalid request origin." });
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(supabaseServerMocks.createSupabaseServerClient).not.toHaveBeenCalled();
    expect(betterAuthRuntimeMocks.createCloudflareBetterAuthForRequest).not.toHaveBeenCalled();
  });

  it("allows same-origin sign-out and returns to the invite page", async () => {
    const handler = vi.fn(async () => new Response(null, { status: 204 }));
    betterAuthRuntimeMocks.createCloudflareBetterAuthForRequest.mockResolvedValue({ handler });
    const { POST } = await import("@/app/invite/[token]/sign-out/route");

    const response = await POST(postInviteSignOut({
      host: "app.archestimator.test",
      origin: "https://app.archestimator.test",
    }), params);

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("https://app.archestimator.test/invite/invite-token");
    expect(betterAuthRuntimeMocks.createCloudflareBetterAuthForRequest).toHaveBeenCalledOnce();
    expect(handler).toHaveBeenCalledOnce();
    const [signOutRequest] = handler.mock.calls[0] ?? [];
    expect(signOutRequest).toBeInstanceOf(Request);
    expect(signOutRequest.method).toBe("POST");
    expect(signOutRequest.url).toBe("https://app.archestimator.test/api/auth/sign-out");
  });
});
