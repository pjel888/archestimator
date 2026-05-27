import { beforeEach, describe, expect, it, vi } from "vitest";
import { getLandingAuthState } from "@/lib/landing/get-landing-auth-state";

const createSupabaseServerClient = vi.hoisted(() => vi.fn());

vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient,
}));

describe("landing auth state", () => {
  beforeEach(() => {
    createSupabaseServerClient.mockReset();
  });

  it("returns true when Supabase resolves an authenticated user", async () => {
    createSupabaseServerClient.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: "user-1" } },
        }),
      },
    });

    await expect(getLandingAuthState()).resolves.toBe(true);
  });

  it("returns false when Supabase resolves no authenticated user", async () => {
    createSupabaseServerClient.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: null },
        }),
      },
    });

    await expect(getLandingAuthState()).resolves.toBe(false);
  });

  it("fails closed to logged-out state when auth lookup throws", async () => {
    createSupabaseServerClient.mockRejectedValue(new Error("missing env"));

    await expect(getLandingAuthState()).resolves.toBe(false);
  });
});
