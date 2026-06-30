import { describe, expect, it, vi } from "vitest";

describe("closed beta access helper", () => {
  it("normalizes emails without rewriting plus addressing", async () => {
    const { normalizeClosedBetaEmail } = await import("@/lib/auth/closed-beta-access");

    expect(normalizeClosedBetaEmail("  Beta+Pilot@Example.COM ")).toBe("beta+pilot@example.com");
  });

  it("allows every authenticated user while the beta gate is disabled", async () => {
    const checkAccess = vi.fn();
    const { getClosedBetaAccessForEmail } = await import("@/lib/auth/closed-beta-access");

    const result = await getClosedBetaAccessForEmail({
      email: "user@example.com",
      env: { CLOSED_BETA_ACCESS_ENABLED: "false" },
      store: { checkAccess },
    });

    expect(result).toEqual({
      allowed: true,
      status: "disabled",
      normalizedEmail: "user@example.com",
    });
    expect(checkAccess).not.toHaveBeenCalled();
  });

  it("uses the D1 access store for enabled access decisions", async () => {
    const checkAccess = vi.fn(async () => ({
      allowed: true,
      status: "invited",
      normalizedEmail: "pilot@example.com",
    }));
    const { getClosedBetaAccessForEmail } = await import("@/lib/auth/closed-beta-access");

    const result = await getClosedBetaAccessForEmail({
      email: " Pilot@Example.COM ",
      env: { CLOSED_BETA_ACCESS_ENABLED: "true" },
      store: { checkAccess },
    });

    expect(checkAccess).toHaveBeenCalledWith("pilot@example.com");
    expect(result).toEqual({
      allowed: true,
      status: "invited",
      normalizedEmail: "pilot@example.com",
    });
  });

  it("fails closed when the D1 store errors or no verified email is available", async () => {
    const checkAccess = vi.fn(async () => {
      throw new Error("permission denied");
    });
    const { getClosedBetaAccessForEmail } = await import("@/lib/auth/closed-beta-access");

    await expect(
      getClosedBetaAccessForEmail({
        email: "",
        env: { CLOSED_BETA_ACCESS_ENABLED: "true" },
        store: { checkAccess },
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
        store: { checkAccess },
      }),
    ).resolves.toEqual({
      allowed: false,
      status: "error",
      normalizedEmail: "blocked@example.com",
    });
  });
});
