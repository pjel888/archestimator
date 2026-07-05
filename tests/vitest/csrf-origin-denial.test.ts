import { describe, expect, it } from "vitest";

import {
  assertSameOrigin,
  assertSameOriginPublicPost,
  assertSameOriginPublicFormPost,
} from "@/lib/publication/security";

const APP_ORIGIN = "https://archestimator.com";
const FORGED_ORIGIN = "https://evil.example";
const APP_URL = `${APP_ORIGIN}/api/share/abc123/comment`;

function buildRequest(opts: {
  method?: string;
  url?: string;
  origin?: string | null;
  csrfHeader?: string | null;
  csrfCookie?: string | null;
}): Request {
  const headers = new Headers();
  if (opts.origin !== undefined && opts.origin !== null) {
    headers.set("origin", opts.origin);
  }
  if (opts.csrfHeader) headers.set("x-archestimator-csrf", opts.csrfHeader);
  const cookieParts: string[] = [];
  if (opts.csrfCookie) cookieParts.push(`ae_publication_csrf=${opts.csrfCookie}`);
  if (cookieParts.length > 0) headers.set("cookie", cookieParts.join("; "));
  return new Request(opts.url ?? APP_URL, { method: opts.method ?? "POST", headers });
}

describe("CSRF / origin denial tests (P1.10 — security-compliance followup)", () => {
  describe("assertSameOrigin (authenticated workshop routes)", () => {
    // Scenario FORGED-ORIGIN-1: cross-origin request blocked when Origin present
    it("rejects a forged Origin header (FORGED-ORIGIN-1)", () => {
      const request = buildRequest({ origin: FORGED_ORIGIN });
      const result = assertSameOrigin(request);
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.status).toBe(403);
        expect(result.message).toMatch(/cross-origin/i);
      }
    });

    // Scenario NO-ORIGIN-1 (assertSameOrigin): no Origin header allowed (SameSite model)
    it("allows requests with no Origin header (SameSite session cookie model)", () => {
      const request = buildRequest({ origin: null });
      const result = assertSameOrigin(request);
      expect(result.ok).toBe(true);
    });

    it("allows same-origin requests (regression)", () => {
      const request = buildRequest({ origin: APP_ORIGIN });
      const result = assertSameOrigin(request);
      expect(result.ok).toBe(true);
    });
  });

  describe("assertSameOriginPublicPost (public share-token POST routes)", () => {
    // Stricter: REQUIRES Origin + valid CSRF header/cookie pair
    it("rejects a forged Origin header even with valid CSRF pair (FORGED-ORIGIN-1)", () => {
      const request = buildRequest({
        origin: FORGED_ORIGIN,
        csrfHeader: "token-abc",
        csrfCookie: "token-abc",
      });
      const result = assertSameOriginPublicPost(request);
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.status).toBe(403);
    });

    it("rejects missing Origin header (NO-ORIGIN-1, public POST stricter)", () => {
      const request = buildRequest({ origin: null });
      const result = assertSameOriginPublicPost(request);
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.status).toBe(403);
    });

    it("rejects same-origin when CSRF header is missing (MISSING-CSRF-1)", () => {
      const request = buildRequest({ origin: APP_ORIGIN, csrfHeader: null, csrfCookie: "x" });
      const result = assertSameOriginPublicPost(request);
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.status).toBe(403);
    });

    it("rejects same-origin when CSRF cookie is missing (MISSING-CSRF-1)", () => {
      const request = buildRequest({ origin: APP_ORIGIN, csrfHeader: "x", csrfCookie: null });
      const result = assertSameOriginPublicPost(request);
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.status).toBe(403);
    });

    it("rejects same-origin when CSRF header ≠ CSRF cookie (DOUBLE-SUBMIT-MISMATCH-1)", () => {
      const request = buildRequest({
        origin: APP_ORIGIN,
        csrfHeader: "token-attacker",
        csrfCookie: "token-victim",
      });
      const result = assertSameOriginPublicPost(request);
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.status).toBe(403);
    });

    it("allows same-origin with matching CSRF pair (regression)", () => {
      const request = buildRequest({
        origin: APP_ORIGIN,
        csrfHeader: "match",
        csrfCookie: "match",
      });
      const result = assertSameOriginPublicPost(request);
      expect(result.ok).toBe(true);
    });
  });

  describe("assertSameOriginPublicFormPost (form-POST routes — /api/share/[token]/unsubscribe)", () => {
    it("rejects forged Origin (FORGED-ORIGIN-1)", () => {
      const request = buildRequest({ origin: FORGED_ORIGIN });
      const result = assertSameOriginPublicFormPost(request, "csrf-token");
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.status).toBe(403);
    });

    it("rejects when form csrf token missing (MISSING-CSRF-1)", () => {
      const request = buildRequest({
        origin: APP_ORIGIN,
        csrfCookie: "token-x",
      });
      const result = assertSameOriginPublicFormPost(request, null);
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.status).toBe(403);
    });

    it("allows same-origin with matching form csrf token + cookie (regression)", () => {
      const request = buildRequest({
        origin: APP_ORIGIN,
        csrfCookie: "form-token",
      });
      const result = assertSameOriginPublicFormPost(request, "form-token");
      expect(result.ok).toBe(true);
    });
  });
});
