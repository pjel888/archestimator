import { readFileSync } from "node:fs";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  checkInviteAcceptRateLimit,
  checkInviteResolutionRateLimit,
  createInviteToken,
  hashInviteToken,
  isProjectInviteEntryEnabled,
  readInviteEntryConfig,
} from "@/lib/collaboration/invite-entry";

const VALID_INVITE_PEPPER = "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";

const rateLimitEvents = vi.hoisted(() => [] as Array<Record<string, unknown>>);

vi.mock("@supabase/supabase-js", () => ({
  createClient: vi.fn(() => ({
    from: vi.fn(() => ({
      delete: () => ({
        lt: async () => ({ error: null }),
      }),
      insert: async (row: Record<string, unknown>) => {
        rateLimitEvents.push(row);
        return { error: null };
      },
      select: () => {
        const filters: Record<string, unknown> = {};
        const chain = {
          eq(field: string, value: unknown) {
            filters[field] = value;
            return chain;
          },
          gte() {
            const count = rateLimitEvents.filter((event) =>
              Object.entries(filters).every(([field, value]) => event[field] === value),
            ).length;
            return Promise.resolve({ count, error: null });
          },
        };
        return chain;
      },
    })),
  })),
}));

describe("project invite entry feature flag", () => {
  const envExample = readFileSync(".env.example", "utf8");

  beforeEach(() => {
    rateLimitEvents.length = 0;
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://example.supabase.co");
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "service-role-key");
    vi.stubEnv("PROJECT_INVITE_ENTRY_ENABLED", "true");
    vi.stubEnv("ARCHESTIMATOR_INVITE_TOKEN_PEPPER", VALID_INVITE_PEPPER);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("keeps invite entry unavailable when the flag is disabled", () => {
    expect(
      isProjectInviteEntryEnabled({
        PROJECT_INVITE_ENTRY_ENABLED: "false",
        ARCHESTIMATOR_INVITE_TOKEN_PEPPER: VALID_INVITE_PEPPER,
      }),
    ).toBe(false);
  });

  it("disables invite entry when ARCHESTIMATOR_INVITE_TOKEN_PEPPER is missing", () => {
    expect(
      readInviteEntryConfig({
        PROJECT_INVITE_ENTRY_ENABLED: "true",
        ARCHESTIMATOR_INVITE_TOKEN_PEPPER: "",
      }),
    ).toEqual({
      enabled: false,
      reason: "missing-pepper",
    });
  });

  it("disables invite entry when the pepper is not a 64-character hex secret", () => {
    expect(
      readInviteEntryConfig({
        PROJECT_INVITE_ENTRY_ENABLED: "true",
        ARCHESTIMATOR_INVITE_TOKEN_PEPPER: "short-pepper",
      }),
    ).toEqual({
      enabled: false,
      reason: "invalid-pepper",
    });
    expect(isProjectInviteEntryEnabled({
      PROJECT_INVITE_ENTRY_ENABLED: "true",
      ARCHESTIMATOR_INVITE_TOKEN_PEPPER: "z".repeat(64),
    })).toBe(false);
  });

  it("does not generate invite tokens while disabled", () => {
    expect(() =>
      createInviteToken({
        PROJECT_INVITE_ENTRY_ENABLED: "false",
        ARCHESTIMATOR_INVITE_TOKEN_PEPPER: VALID_INVITE_PEPPER,
      }),
    ).toThrow("Project invite entry is disabled.");
  });

  it("throws descriptive invite-token errors when required env vars are missing or malformed", () => {
    expect(() =>
      createInviteToken({
        PROJECT_INVITE_ENTRY_ENABLED: "true",
        ARCHESTIMATOR_INVITE_TOKEN_PEPPER: "",
      }),
    ).toThrow("Project invite entry is missing ARCHESTIMATOR_INVITE_TOKEN_PEPPER.");
    expect(() =>
      createInviteToken({
        PROJECT_INVITE_ENTRY_ENABLED: "true",
        ARCHESTIMATOR_INVITE_TOKEN_PEPPER: "short-pepper",
      }),
    ).toThrow("Project invite entry requires ARCHESTIMATOR_INVITE_TOKEN_PEPPER to be a 64-character hex secret.");
  });

  it("documents safe invite-entry defaults in the example env", () => {
    expect(envExample).toContain("PROJECT_INVITE_ENTRY_ENABLED=false");
    expect(envExample).toContain("ARCHESTIMATOR_INVITE_TOKEN_PEPPER=");
  });

  it("hashes invite tokens with a required server pepper and no raw-token fallback", () => {
    const rawToken = "public-token-value";
    const pepperedHash = hashInviteToken(rawToken, VALID_INVITE_PEPPER);
    const otherPepperHash = hashInviteToken(rawToken, "abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789");

    expect(pepperedHash).toMatch(/^v1:[a-f0-9]{64}$/);
    expect(pepperedHash).not.toContain(rawToken);
    expect(pepperedHash).not.toBe(otherPepperHash);
    expect(() => hashInviteToken(rawToken, "")).toThrow("Invite token pepper is required.");
  });

  it("rate-limits the 31st rapid invite resolution request", async () => {
    const headers = new Headers({ "x-forwarded-for": "203.0.113.10" });

    for (let attempt = 0; attempt < 30; attempt += 1) {
      await expect(checkInviteResolutionRateLimit({ headers, rawToken: "route-token" })).resolves.toEqual({ allowed: true });
    }

    await expect(checkInviteResolutionRateLimit({ headers, rawToken: "route-token" })).resolves.toEqual({
      allowed: false,
      message: "Too many attempts. Please wait 60 seconds.",
      retryAfter: 60,
    });
  });

  it("rate-limits the 6th rapid invite accept attempt for a user and token", async () => {
    const request = new Request("https://archestimator.test/invite/route-token/accept", {
      headers: { "x-forwarded-for": "203.0.113.10" },
    });

    for (let attempt = 0; attempt < 5; attempt += 1) {
      await expect(checkInviteAcceptRateLimit({ request, rawToken: "route-token", userId: "user-1" })).resolves.toEqual({ allowed: true });
    }

    await expect(checkInviteAcceptRateLimit({ request, rawToken: "route-token", userId: "user-1" })).resolves.toEqual({
      allowed: false,
      message: "Too many attempts. Please wait 60 seconds.",
      retryAfter: 60,
    });
  });
});
