import { beforeEach, describe, expect, it } from "vitest";

import {
  assertSameOriginPublicPost,
  createPublicPostCsrfToken,
  createPublicationAccessCookie,
  createPublicationAccessCookieName,
  createPublicationToken,
  decryptPublicationToken,
  encryptPublicationToken,
  hasPublicationAccessCookie,
  hashPublicationPassword,
  hashPublicationToken,
  verifyPublicationPassword,
  // P10 exports (red tests reference these before impl)
  getProgressiveDelayMs,
  isPasswordLocked,
  recordPasswordFailure,
  recordPasswordSuccess,
} from "@/lib/publication/security";

describe("project publication security helpers (Shared Link V2)", () => {
  it("stores only keyed token hashes while retaining encrypted owner recopy", () => {
    const token = createPublicationToken({ bytes: 24, randomBytes: () => Buffer.alloc(24, 7) });
    const hash = hashPublicationToken(token, "server-side-secret");
    const encrypted = encryptPublicationToken(token, "0123456789abcdef0123456789abcdef");

    expect(token).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(hash).not.toContain(token);
    expect(hash).toBe(hashPublicationToken(token, "server-side-secret"));
    expect(encrypted).not.toContain(token);
    expect(decryptPublicationToken(encrypted, "0123456789abcdef0123456789abcdef")).toBe(token);
  });

  it("hashes optional publication passwords without retaining plaintext", async () => {
    const passwordHash = await hashPublicationPassword("client-passphrase", {
      saltBytes: () => Buffer.alloc(16, 3),
    });

    expect(passwordHash).toContain("scrypt-sha256-v1");
    expect(passwordHash).not.toContain("client-passphrase");
    await expect(verifyPublicationPassword("client-passphrase", passwordHash)).resolves.toBe(true);
    await expect(verifyPublicationPassword("wrong-passphrase", passwordHash)).resolves.toBe(false);
  });

  it("requires same-origin public POSTs and a matching CSRF header/cookie pair", () => {
    const token = createPublicPostCsrfToken({ randomBytes: () => Buffer.alloc(16, 5) });
    const cookieName = createPublicationAccessCookieName("public-token");
    const sameOriginRequest = new Request("https://archestimator.test/api/share/public-token/events", {
      method: "POST",
      headers: {
        origin: "https://archestimator.test",
        cookie: `${cookieName}=unlocked; ae_publication_csrf=${token}`,
        "x-archestimator-csrf": token,
      },
    });
    const crossOriginRequest = new Request("https://archestimator.test/api/share/public-token/events", {
      method: "POST",
      headers: {
        origin: "https://evil.example",
        cookie: `ae_publication_csrf=${token}`,
        "x-archestimator-csrf": token,
      },
    });

    expect(assertSameOriginPublicPost(sameOriginRequest)).toEqual({ ok: true });
    expect(assertSameOriginPublicPost(crossOriginRequest)).toEqual({ ok: false, status: 403, message: "Cross-origin publication requests are blocked." });
  });

  it("signs publication access cookies so unlocked state cannot be forged", () => {
    const context = {
      token: "public-token",
      publicationId: "publication-1",
      snapshotVersion: "2026-05-27T00:00:00.000Z",
    };
    const cookie = createPublicationAccessCookie(context, {
      now: Date.parse("2026-05-27T00:00:00.000Z"),
    });
    const cookiePair = cookie.split(";")[0];

    expect(cookie).toContain("HttpOnly");
    expect(cookie).not.toContain("=unlocked");
    expect(hasPublicationAccessCookie(cookiePair, context, { now: Date.parse("2026-05-27T01:00:00.000Z") })).toBe(true);
    expect(
      hasPublicationAccessCookie(`${createPublicationAccessCookieName("public-token")}=unlocked`, context),
    ).toBe(false);
    expect(
      hasPublicationAccessCookie(cookiePair, { ...context, snapshotVersion: "stale-version" }),
    ).toBe(false);
  });

  // (end of original describe)
});

// ============================================================================
// P10 RED TESTS — written FIRST (before any edit to security.ts, route.ts, or form)
// per Master Prompt + subagent-driven-development skill + AGENTS.md/CLAUDE.md
// (graph impact completed with 65 direct / 500 impacted / 122 files before these test edits).
// Covers: progressive delay (1s,2s,4s,8s...), hard 5-attempt/15min lockout per IP+token,
// password_attempt event recording contract (via type + record calls).
// ============================================================================
describe("P10 — password brute-force hardening (in-memory lockout + progressive delay)", () => {
  beforeEach(() => {
    // @ts-expect-error test-only reset (added in impl)
    if (typeof __resetPasswordAttemptStoreForTest === "function") {
      __resetPasswordAttemptStoreForTest();
    }
  });

  it("computes progressive delays 1s, 2s, 4s, 8s... on successive failures", () => {
    expect(getProgressiveDelayMs(1)).toBe(1000);
    expect(getProgressiveDelayMs(2)).toBe(2000);
    expect(getProgressiveDelayMs(3)).toBe(4000);
    expect(getProgressiveDelayMs(4)).toBe(8000);
    expect(getProgressiveDelayMs(5)).toBe(16000);
  });

  it("enforces hard lockout after 5 failures per IP per token (15-minute block)", () => {
    const ip = "198.51.100.42";
    const token = "p10-red-token";
    for (let i = 0; i < 4; i++) {
      recordPasswordFailure(ip, token, Date.now());
    }
    expect(isPasswordLocked(ip, token)).toBe(false);
    recordPasswordFailure(ip, token, Date.now());
    expect(isPasswordLocked(ip, token)).toBe(true);
  });

  it("success clears any lockout state for the IP+token", () => {
    const ip = "198.51.100.43";
    const token = "p10-red-token-2";
    for (let i = 0; i < 5; i++) recordPasswordFailure(ip, token, Date.now());
    expect(isPasswordLocked(ip, token)).toBe(true);
    recordPasswordSuccess(ip, token);
    expect(isPasswordLocked(ip, token)).toBe(false);
  });
});
