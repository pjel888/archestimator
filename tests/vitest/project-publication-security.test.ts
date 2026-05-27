import { describe, expect, it } from "vitest";

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
} from "@/lib/publication/security";

describe("project publication security helpers", () => {
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
});
