import { readFileSync } from "node:fs";
import { beforeEach, describe, expect, it, vi } from "vitest";

const nextNavigationMocks = vi.hoisted(() => ({
  redirect: vi.fn((url: string) => {
    throw new Error(`NEXT_REDIRECT:${url}`);
  }),
}));
const nextHeadersMocks = vi.hoisted(() => ({
  headers: vi.fn(async () => new Headers({ host: "localhost:3000" })),
}));

const devAuthMocks = vi.hoisted(() => ({
  getDevCurrentUserContext: vi.fn(),
}));

const closedBetaD1Mocks = vi.hoisted(() => ({
  getClosedBetaAccessFromCloudflareD1: vi.fn(),
}));
const profileD1Mocks = vi.hoisted(() => ({
  getProfileByEmailFromCloudflareD1: vi.fn(),
}));
const betterAuthRuntimeMocks = vi.hoisted(() => ({
  getCloudflareBetterAuthIdentityFromRequest: vi.fn(),
}));

vi.mock("next/navigation", () => nextNavigationMocks);
vi.mock("next/headers", () => nextHeadersMocks);
vi.mock("@/lib/auth/dev-auth", () => devAuthMocks);
vi.mock("@/lib/auth/closed-beta-d1-store", () => closedBetaD1Mocks);
vi.mock("@/lib/auth/profile-d1-store", () => profileD1Mocks);
vi.mock("@/lib/auth/cloudflare-better-auth-runtime", () => betterAuthRuntimeMocks);

describe("auth session closed beta gate", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    vi.stubEnv("CLOSED_BETA_ACCESS_ENABLED", "true");
    vi.stubEnv("ARCHESTIMATOR_AUTH_PROVIDER", "");
    devAuthMocks.getDevCurrentUserContext.mockResolvedValue(null);
    betterAuthRuntimeMocks.getCloudflareBetterAuthIdentityFromRequest.mockResolvedValue(null);
    closedBetaD1Mocks.getClosedBetaAccessFromCloudflareD1.mockResolvedValue({
      allowed: true,
      normalizedEmail: "owner@example.com",
      status: "active",
    });
    profileD1Mocks.getProfileByEmailFromCloudflareD1.mockResolvedValue(null);
  });

  it("returns null when no Better Auth identity exists without touching D1 profile lookup", async () => {
    const { getCurrentUserContext, requireCurrentUserContext } = await import("@/lib/auth/session");

    await expect(getCurrentUserContext()).resolves.toBeNull();
    await expect(requireCurrentUserContext()).rejects.toThrow("NEXT_REDIRECT:/login");

    expect(profileD1Mocks.getProfileByEmailFromCloudflareD1).not.toHaveBeenCalled();
  });

  it("blocks revoked users before loading or creating a profile", async () => {
    vi.stubEnv("ARCHESTIMATOR_AUTH_PROVIDER", "better-auth");
    betterAuthRuntimeMocks.getCloudflareBetterAuthIdentityFromRequest.mockResolvedValue({
      id: "better-auth-revoked",
      email: "revoked@example.com",
      displayName: "Revoked User",
      avatarUrl: null,
    });
    closedBetaD1Mocks.getClosedBetaAccessFromCloudflareD1.mockResolvedValue({
      allowed: false,
      status: "revoked",
      normalizedEmail: "revoked@example.com",
    });
    const { getCurrentUserContext } = await import("@/lib/auth/session");

    await expect(getCurrentUserContext()).rejects.toThrow("NEXT_REDIRECT:/access-required?status=revoked");

    expect(closedBetaD1Mocks.getClosedBetaAccessFromCloudflareD1).toHaveBeenCalledWith("revoked@example.com");
    expect(profileD1Mocks.getProfileByEmailFromCloudflareD1).not.toHaveBeenCalled();
  });

  it("loads the Better Auth profile from Cloudflare D1", async () => {
    vi.stubEnv("ARCHESTIMATOR_AUTH_PROVIDER", "better-auth");
    betterAuthRuntimeMocks.getCloudflareBetterAuthIdentityFromRequest.mockResolvedValue({
      id: "better-auth-user",
      email: "owner@example.com",
      displayName: "Identity Name",
      avatarUrl: null,
    });
    profileD1Mocks.getProfileByEmailFromCloudflareD1.mockResolvedValue({
      avatar_url: "https://example.com/avatar.png",
      created_at: "2026-06-30T00:00:00.000Z",
      default_workspace_id: "workspace-1",
      display_name: "D1 Name",
      email: "owner@example.com",
      id: "profile-1",
      role: "ceo",
      updated_at: "2026-06-30T00:00:00.000Z",
    });
    const { getCurrentUserContext } = await import("@/lib/auth/session");

    await expect(getCurrentUserContext()).resolves.toMatchObject({
      avatarUrl: "https://example.com/avatar.png",
      displayName: "D1 Name",
      email: "owner@example.com",
      role: "ceo",
      userId: "profile-1",
    });
  });

  it("keeps current-user auth phases traceable with safe fixed labels", () => {
    const sessionSource = readFileSync("src/lib/auth/session.ts", "utf8");

    [
      'traced("current-user.dev-auth-context"',
      'traced("current-user.better-auth-d1-session"',
      'traced("current-user.better-auth-closed-beta-access"',
      'traced("current-user.better-auth-d1-profile-lookup"',
    ].forEach((label) => {
      expect(sessionSource).toContain(label);
    });
    expect(sessionSource).not.toMatch(/createSupabase|@\/lib\/supabase/);
  });
});
