import { readFileSync } from "node:fs";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const d1Mocks = vi.hoisted(() => ({
  getCloudflareD1Database: vi.fn(),
}));
const rateLimitEvents = vi.hoisted(() => [] as Array<Record<string, unknown>>);

vi.mock("@/lib/cloudflare/d1", () => d1Mocks);

import {
  checkInviteCreateRateLimit,
  checkInviteAcceptRateLimit,
  checkInviteResolutionRateLimit,
  createInviteToken,
  hashInviteToken,
  isProjectInviteEntryEnabled,
  readInviteEntryConfig,
} from "@/lib/collaboration/invite-entry";

const VALID_INVITE_PEPPER = "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";

function createRateLimitD1() {
  return {
    prepare(sql: string) {
      let values: unknown[] = [];
      const statement = {
        bind(...nextValues: unknown[]) {
          values = nextValues;
          return this;
        },
        async first<R>() {
          const normalizedSql = sql.toLowerCase();
          if (!normalizedSql.includes("from security_rate_limit_events")) return null;
          const [scope, keyHash, since] = values;
          const count = rateLimitEvents.filter((event) =>
            event.scope === scope
            && event.key_hash === keyHash
            && String(event.occurred_at) >= String(since)
          ).length;
          return { count } as R;
        },
        async all<R>() {
          return { results: [] as R[] };
        },
        async run() {
          const normalizedSql = sql.toLowerCase();
          if (normalizedSql.includes("delete from security_rate_limit_events")) {
            const [now] = values;
            for (let index = rateLimitEvents.length - 1; index >= 0; index -= 1) {
              if (String(rateLimitEvents[index].expires_at) < String(now)) rateLimitEvents.splice(index, 1);
            }
          }
          if (normalizedSql.includes("insert into security_rate_limit_events")) {
            const [id, scope, keyHash, metadataJson, occurredAt, expiresAt] = values;
            rateLimitEvents.push({
              id,
              scope,
              key_hash: keyHash,
              metadata_json: metadataJson,
              occurred_at: occurredAt,
              expires_at: expiresAt,
            });
          }
          return { success: true, meta: { changes: 1 } };
        },
      };
      return statement;
    },
  };
}

describe("project invite entry feature flag", () => {
  const envExample = readFileSync(".env.example", "utf8");

  beforeEach(() => {
    rateLimitEvents.length = 0;
    d1Mocks.getCloudflareD1Database.mockReset();
    d1Mocks.getCloudflareD1Database.mockResolvedValue(createRateLimitD1());
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

  it("keys invite rate-limit IP hashing with a server-side pepper", async () => {
    const headers = new Headers({ "x-forwarded-for": "203.0.113.10" });

    await expect(checkInviteCreateRateLimit({ headers, projectId: "project-1", userId: "user-1" })).resolves.toEqual({ allowed: true });
    const tokenPepperKeyHash = rateLimitEvents[0]?.key_hash;

    rateLimitEvents.length = 0;
    vi.stubEnv("ARCHESTIMATOR_INVITE_RATE_LIMIT_HASH_PEPPER", "abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789");

    await expect(checkInviteCreateRateLimit({ headers, projectId: "project-1", userId: "user-1" })).resolves.toEqual({ allowed: true });
    const dedicatedPepperKeyHash = rateLimitEvents[0]?.key_hash;

    expect(tokenPepperKeyHash).toEqual(expect.any(String));
    expect(dedicatedPepperKeyHash).toEqual(expect.any(String));
    expect(dedicatedPepperKeyHash).not.toBe(tokenPepperKeyHash);
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
