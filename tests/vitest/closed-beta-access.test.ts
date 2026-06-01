import { describe, expect, it, vi } from "vitest";

describe("closed beta access helper", () => {
  it("normalizes emails without rewriting plus addressing", async () => {
    const { normalizeClosedBetaEmail } = await import("@/lib/auth/closed-beta-access");

    expect(normalizeClosedBetaEmail("  Beta+Pilot@Example.COM ")).toBe("beta+pilot@example.com");
  });

  it("allows every authenticated user while the beta gate is disabled", async () => {
    const rpc = vi.fn();
    const { getClosedBetaAccessForEmail } = await import("@/lib/auth/closed-beta-access");

    const result = await getClosedBetaAccessForEmail({
      email: "user@example.com",
      env: { CLOSED_BETA_ACCESS_ENABLED: "false" },
      supabase: { rpc },
    });

    expect(result).toEqual({
      allowed: true,
      status: "disabled",
      normalizedEmail: "user@example.com",
    });
    expect(rpc).not.toHaveBeenCalled();
  });

  it("uses the server-side RPC for enabled access decisions", async () => {
    const rpc = vi.fn(async () => ({
      data: { allowed: true, status: "invited", normalized_email: "pilot@example.com" },
      error: null,
    }));
    const { getClosedBetaAccessForEmail } = await import("@/lib/auth/closed-beta-access");

    const result = await getClosedBetaAccessForEmail({
      email: " Pilot@Example.COM ",
      env: { CLOSED_BETA_ACCESS_ENABLED: "true" },
      supabase: { rpc },
    });

    expect(rpc).toHaveBeenCalledWith("check_closed_beta_access", { raw_email: "pilot@example.com" });
    expect(result).toEqual({
      allowed: true,
      status: "invited",
      normalizedEmail: "pilot@example.com",
    });
  });

  it("fails closed when the RPC errors or no verified email is available", async () => {
    const rpc = vi.fn(async () => ({
      data: null,
      error: { message: "permission denied" },
    }));
    const { getClosedBetaAccessForEmail } = await import("@/lib/auth/closed-beta-access");

    await expect(
      getClosedBetaAccessForEmail({
        email: "",
        env: { CLOSED_BETA_ACCESS_ENABLED: "true" },
        supabase: { rpc },
      }),
    ).resolves.toEqual({
      allowed: false,
      status: "no-email",
      normalizedEmail: "",
    });

    await expect(
      getClosedBetaAccessForEmail({
        email: "blocked@example.com",
        env: { CLOSED_BETA_ACCESS_ENABLED: "true" },
        supabase: { rpc },
      }),
    ).resolves.toEqual({
      allowed: false,
      status: "error",
      normalizedEmail: "blocked@example.com",
    });
  });
});
