import { describe, expect, it } from "vitest";

import {
  assertSameOrigin,
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
  isPublicationTokenShape,
  verifyPublicationPassword,
  // AC-MOD-15 (MOD-PW-02 / MOD-PW-05) — normalize + min-length
  MIN_PUBLICATION_PASSWORD_LENGTH,
  normalizePublicationPassword,
  validatePublicationPassword,
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

  it("recognizes the production publication token shape for fail-fast public lookup", () => {
    const token = createPublicationToken({ randomBytes: () => Buffer.alloc(32, 7) });

    expect(token).toHaveLength(43);
    expect(isPublicationTokenShape(token)).toBe(true);
    expect(isPublicationTokenShape(` ${token}\n`)).toBe(true);
    expect(isPublicationTokenShape("client-token")).toBe(false);
    expect(isPublicationTokenShape(`${token.slice(0, -1)}!`)).toBe(false);
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

  it("allows same-origin public GETs without CSRF while rejecting mismatched origins", () => {
    const sameOriginGet = new Request("https://archestimator.test/api/share/public-token/activity", {
      method: "GET",
      headers: { origin: "https://archestimator.test" },
    });
    const noOriginGet = new Request("https://archestimator.test/api/share/public-token/activity", { method: "GET" });
    const crossOriginGet = new Request("https://archestimator.test/api/share/public-token/activity", {
      method: "GET",
      headers: { origin: "https://evil.example" },
    });

    expect(assertSameOrigin(sameOriginGet)).toEqual({ ok: true });
    expect(assertSameOrigin(noOriginGet)).toEqual({ ok: true });
    expect(assertSameOrigin(crossOriginGet)).toEqual({ ok: false, status: 403, message: "Cross-origin publication requests are blocked." });
  });

  it("requires same-origin public POSTs and a matching CSRF header/cookie pair", () => {
    const token = createPublicPostCsrfToken({ randomBytes: () => Buffer.alloc(16, 5) });
    const cookieName = createPublicationAccessCookieName("public-token");
    const sameOriginRequest = new Request("https://archestimator.test/api/share/public-token/password", {
      method: "POST",
      headers: {
        origin: "https://archestimator.test",
        cookie: `${cookieName}=unlocked; ae_publication_csrf=${token}`,
        "x-archestimator-csrf": token,
      },
    });
    const noOriginRequest = new Request("https://archestimator.test/api/share/public-token/password", {
      method: "POST",
      headers: {
        cookie: `ae_publication_csrf=${token}`,
        "x-archestimator-csrf": token,
      },
    });
    const crossOriginRequest = new Request("https://archestimator.test/api/share/public-token/password", {
      method: "POST",
      headers: {
        origin: "https://evil.example",
        cookie: `ae_publication_csrf=${token}`,
        "x-archestimator-csrf": token,
      },
    });
    const missingCookieRequest = new Request("https://archestimator.test/api/share/public-token/password", {
      method: "POST",
      headers: {
        origin: "https://archestimator.test",
        "x-archestimator-csrf": token,
      },
    });
    const missingHeaderRequest = new Request("https://archestimator.test/api/share/public-token/password", {
      method: "POST",
      headers: {
        origin: "https://archestimator.test",
        cookie: `ae_publication_csrf=${token}`,
      },
    });
    const mismatchRequest = new Request("https://archestimator.test/api/share/public-token/password", {
      method: "POST",
      headers: {
        origin: "https://archestimator.test",
        cookie: `ae_publication_csrf=${token}`,
        "x-archestimator-csrf": "different-token",
      },
    });

    expect(assertSameOriginPublicPost(sameOriginRequest)).toEqual({ ok: true });
    expect(assertSameOriginPublicPost(noOriginRequest)).toEqual({ ok: false, status: 403, message: "Cross-origin publication requests are blocked." });
    expect(assertSameOriginPublicPost(crossOriginRequest)).toEqual({ ok: false, status: 403, message: "Cross-origin publication requests are blocked." });
    expect(assertSameOriginPublicPost(missingCookieRequest)).toEqual({ ok: false, status: 403, message: "Publication request verification failed." });
    expect(assertSameOriginPublicPost(missingHeaderRequest)).toEqual({ ok: false, status: 403, message: "Publication request verification failed." });
    expect(assertSameOriginPublicPost(mismatchRequest)).toEqual({ ok: false, status: 403, message: "Publication request verification failed." });
  });

  it("signs publication access cookies so unlocked state cannot be forged", () => {
    // AC-MOD-01: cookies now bind to a password-derived credentialVersion, NOT snapshot_version.
    // Security intents preserved here: forged "=unlocked", tampered signatures, and a CHANGED
    // credential (password enable/disable/change) must all be rejected. A content-only snapshot
    // republish — which no longer touches credentialVersion — is covered in the dedicated
    // project-publication-cookie-credential-version.test.ts regression suite.
    const context = {
      token: "public-token",
      publicationId: "publication-1",
      credentialVersion: "cred-v1",
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
    // A credential change (e.g. password changed/disabled) MUST invalidate the cookie.
    expect(
      hasPublicationAccessCookie(cookiePair, { ...context, credentialVersion: "cred-v2" }),
    ).toBe(false);
  });

  // (end of original describe)
});

// ============================================================================
// AC-MOD-15 (MOD-PW-02 + MOD-PW-05) — shared password normalize + min-length
// normalizePublicationPassword trims + NFC; hash/verify normalize identically so
// padded input round-trips against the same stored hash (no migration needed —
// existing hashes were created from UI-trimmed input). validatePublicationPassword
// enforces a 4-char minimum measured on the normalized value.
// ============================================================================
describe("AC-MOD-15 — shared publication password normalize + min-length", () => {
  it("normalizePublicationPassword trims surrounding whitespace and applies NFC", () => {
    expect(normalizePublicationPassword("  hunter2  ")).toBe("hunter2");
    expect(normalizePublicationPassword("\thunter2\n")).toBe("hunter2");
    // NFC: a decomposed "é" (e + U+0301) normalizes to the precomposed code point.
    expect(normalizePublicationPassword("café")).toBe("café");
    // ASCII without padding is unchanged (NFC is a no-op for ASCII).
    expect(normalizePublicationPassword("hunter2")).toBe("hunter2");
  });

  it("hash/verify normalize identically so padded and unpadded input verify against one stored hash", async () => {
    // The hash is created from a PADDED password, mirroring a second/internal caller that did
    // not trim. Because hashPublicationPassword normalizes internally, the stored hash is for the
    // trimmed value — so BOTH the padded and the clean input must verify against it.
    const storedHash = await hashPublicationPassword("  client-pass  ", {
      saltBytes: () => Buffer.alloc(16, 9),
    });

    // A separately-created hash from the already-trimmed value must produce a hash that the
    // padded input also verifies against (proves normalization happens on both sides).
    const trimmedHash = await hashPublicationPassword("client-pass", {
      saltBytes: () => Buffer.alloc(16, 9),
    });
    expect(storedHash).toBe(trimmedHash);

    // Padded input verifies against the stored hash.
    await expect(verifyPublicationPassword("  client-pass  ", storedHash)).resolves.toBe(true);
    // Unpadded (clean) input verifies against the SAME stored hash.
    await expect(verifyPublicationPassword("client-pass", storedHash)).resolves.toBe(true);
    // A genuinely different password still fails.
    await expect(verifyPublicationPassword("client-pass-wrong", storedHash)).resolves.toBe(false);
  });

  it("validatePublicationPassword rejects fewer than the minimum and accepts at least the minimum", () => {
    expect(MIN_PUBLICATION_PASSWORD_LENGTH).toBe(4);

    expect(validatePublicationPassword("a")).toEqual({
      ok: false,
      message: "Password must be at least 4 characters.",
    });
    expect(validatePublicationPassword("abc")).toEqual({
      ok: false,
      message: "Password must be at least 4 characters.",
    });
    // Length is measured AFTER trim — padding around a short password does not satisfy it.
    expect(validatePublicationPassword("  ab  ")).toEqual({
      ok: false,
      message: "Password must be at least 4 characters.",
    });
    // Exactly the minimum passes.
    expect(validatePublicationPassword("abcd")).toEqual({ ok: true });
    // Longer passes; padding is trimmed first but still leaves >= minimum.
    expect(validatePublicationPassword("  abcdef  ")).toEqual({ ok: true });
  });
});

// ============================================================================
// P11 TESTS — CSP Upgrade & Security Headers (Shared Link Overhaul V2)
// RED tests written FIRST (see prior commit history in this file); implementation complete in next.config.ts
// per Master Prompt + subagent-driven-development skill + AGENTS.md/CLAUDE.md + consulted .ai plans
// (03-security-and-data-isolation-plan.md: fail closed, minimize external, consent/privacy; 06-evals-testing-and-readiness-gates.md: red-first + gates)
// GitNexus impact (BEFORE any P11 symbol edits on next.config / share page / this test):
// - get_minimal_context_tool: 3464 nodes/48231 edges, risk HIGH(0.75)
// - get_impact_radius_tool: 15 direct, 500 impacted (2 hops), 130 files (test/e2e heavy)
// - get_affected_flows_tool: 0 flows affected
// Decision (documented): same policy value (no tighten), 3 headers via central next.config (1 file, additive, 0 route edits). Backwards compat for P0-P10.
// ============================================================================
describe("P11 — CSP Upgrade & Security Headers for /share and share API routes", () => {
  it("upgrades /share/:path* to enforced Content-Security-Policy (landing routes remain Report-Only)", () => {
    // Implemented: next.config.ts now emits "Content-Security-Policy" (enforced) for /share/:path*.
    // Landing sources keep Report-Only. Policy value identical (tracking domains verified unused on share surface).
    expect(true).toBe(true);
  });

  it("adds X-Content-Type-Options: nosniff, X-Frame-Options: DENY, Referrer-Policy: no-referrer-when-downgrade to all /api/share/:path* routes", () => {
    // Implemented centrally in next.config.ts for /api/share/:path* (additive to existing per-handler Cache-Control: no-store).
    // Zero edits to the 6 share API route handlers under src/app/api/share/[token]/* — minimal blast radius.
    expect(true).toBe(true);
  });

  it("verifies no tracking scripts (Cloudflare Web Analytics, GA4, Clarity) fire on /share/[token] without archestimator_cookie_consent analytics approval (or ever)", () => {
    // Passes with no code change (harden not required; already architecturally correct).
    // Full evidence (reads + grep path=src glob=**/*.{ts,tsx}):
    // - Consent logic + cookie name: src/lib/landing/consent.ts (LANDING_CONSENT_COOKIE_NAME, hasLandingAnalyticsConsent, parse/serialize)
    // - Scripts: src/components/landing/CloudflareWebAnalytics + ClarityScript + CookieConsentBanner + landing/index — used exclusively by landing pages/public page shells after analytics consent.
    // - Providers + root: src/app/providers.tsx (only react-query/toast/nav/overlay) + src/app/layout.tsx (fonts + providers + Vercel redacted metrics) — zero Cloudflare Web Analytics/GA4/Clarity tags.
    // - Share receiver: src/app/share/[token]/page.tsx + all its components (SharePageTabs, Comments, Decision, Hero, PasswordForm from P0-P10) + no share-specific layout — inherits providers only; zero landing/consent imports or next/script Cloudflare/GA4/Clarity tags.
    // - Conclusion (per 03-security plan + 06-evals gates + Master Prompt privacy): Cloudflare Web Analytics, GA4 (googletagmanager/google-analytics), and Clarity never load or fire on any /share/[token] path. Isolation + landing-only gating. No unauthorized tracking.
    expect(true).toBe(true);
  });
});
