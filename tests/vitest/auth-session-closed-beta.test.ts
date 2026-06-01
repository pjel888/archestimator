import { beforeEach, describe, expect, it, vi } from "vitest";

const nextNavigationMocks = vi.hoisted(() => ({
  redirect: vi.fn((url: string) => {
    throw new Error(`NEXT_REDIRECT:${url}`);
  }),
}));

const devAuthMocks = vi.hoisted(() => ({
  getDevCurrentUserContext: vi.fn(),
}));

const supabaseServerMocks = vi.hoisted(() => ({
  createSupabaseServerClient: vi.fn(),
}));

vi.mock("next/navigation", () => nextNavigationMocks);
vi.mock("@/lib/auth/dev-auth", () => devAuthMocks);
vi.mock("@/lib/supabase/server", () => supabaseServerMocks);

describe("auth session closed beta gate", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    vi.stubEnv("CLOSED_BETA_ACCESS_ENABLED", "true");
    devAuthMocks.getDevCurrentUserContext.mockResolvedValue(null);
  });

  it("blocks revoked users before loading or creating a profile", async () => {
    const from = vi.fn();
    const supabase = {
      auth: {
        getUser: vi.fn(async () => ({
          data: { user: { id: "user-1", email: "revoked@example.com", user_metadata: {} } },
        })),
      },
      rpc: vi.fn(async () => ({
        data: { allowed: false, status: "revoked", normalized_email: "revoked@example.com" },
        error: null,
      })),
      from,
    };
    supabaseServerMocks.createSupabaseServerClient.mockResolvedValue(supabase);
    const { getCurrentUserContext } = await import("@/lib/auth/session");

    await expect(getCurrentUserContext()).rejects.toThrow("NEXT_REDIRECT:/beta/access-required?status=revoked");

    expect(supabase.rpc).toHaveBeenCalledWith("check_closed_beta_access", { raw_email: "revoked@example.com" });
    expect(from).not.toHaveBeenCalled();
  });
});
