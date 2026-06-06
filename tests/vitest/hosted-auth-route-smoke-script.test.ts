import { afterEach, describe, expect, it, vi } from "vitest";

import {
  buildHeaders,
  evaluateCase,
  hasPrivateNoStoreCacheControl,
  normalizeLocationPath,
  parseInputsFromEnv,
  parseRuns,
  validateHostedAuthBaseUrl,
  verifyHostedAuthRoutes,
} from "@/../scripts/verify-hosted-auth-routes";

const originalEnv = { ...process.env };

afterEach(() => {
  process.env = { ...originalEnv };
  vi.restoreAllMocks();
});

describe("hosted auth route smoke script", () => {
  it("requires a hosted base URL", () => {
    process.env = {};

    expect(() => parseInputsFromEnv()).toThrow(/HOSTED_AUTH_BASE_URL/);
  });

  it("caps hosted auth benchmark runs to a safe bounded count", () => {
    expect(parseRuns(undefined)).toBe(1);
    expect(parseRuns("3")).toBe(3);
    expect(parseRuns("99")).toBe(10);
    expect(() => parseRuns("0")).toThrow(/HOSTED_AUTH_RUNS/);
  });

  it("parses optional hosted auth benchmark output settings from env", () => {
    process.env = {
      HOSTED_AUTH_BASE_URL: "https://www.archestimator.com",
      HOSTED_AUTH_RUNS: "4",
      OUTPUT_FILE: "/tmp/auth.json",
      MARKDOWN_FILE: "/tmp/auth.md",
      HOSTED_AUTH_ALLOWED_COOKIE: "allowed-session-secret",
      HOSTED_AUTH_DENIED_COOKIE: "denied-session-secret",
      HOSTED_AUTH_REVOKED_COOKIE: "revoked-session-secret",
      HOSTED_AUTH_EXPIRED_COOKIE: "expired-session-secret",
    };

    const inputs = parseInputsFromEnv();

    expect(inputs.runs).toBe(4);
    expect(inputs.outputFile).toBe("/tmp/auth.json");
    expect(inputs.markdownFile).toBe("/tmp/auth.md");
    expect(inputs.baseUrl).toBe("https://www.archestimator.com");
    expect(inputs.cases.find((authCase) => authCase.name === "allowed")?.cookie).toBe("allowed-session-secret");
  });

  it("merges platform and session cookies only into request headers", () => {
    expect(buildHeaders(
      {
        platformCookie: "vercel-bypass=platform-secret",
        platformAuthHeader: "Bearer platform-secret",
      },
      "sb-access-token=session-secret",
    )).toEqual({
      Cookie: "vercel-bypass=platform-secret; sb-access-token=session-secret",
      Authorization: "Bearer platform-secret",
    });
  });

  it("classifies the hosted auth redirects required by the closed beta gate", () => {
    expect(evaluateCase({
      name: "signedOut",
      status: 307,
      ok: false,
      location: "https://preview.example/login?next=%2Fworkshop",
      normalizedLocationPath: "/login?next=%2Fworkshop",
    })).toBe(true);

    expect(evaluateCase({
      name: "allowed",
      status: 200,
      ok: true,
      location: null,
      normalizedLocationPath: null,
    })).toBe(true);

    expect(evaluateCase({
      name: "denied",
      status: 307,
      ok: false,
      location: "https://preview.example/beta/access-required",
      normalizedLocationPath: "/beta/access-required",
    })).toBe(true);

    expect(evaluateCase({
      name: "revoked",
      status: 307,
      ok: false,
      location: "https://preview.example/beta/access-required?status=revoked",
      normalizedLocationPath: "/beta/access-required?status=revoked",
    })).toBe(true);

    expect(evaluateCase({
      name: "expired",
      status: 307,
      ok: false,
      location: "https://preview.example/login?next=%2Fworkshop",
      normalizedLocationPath: "/login?next=%2Fworkshop",
    })).toBe(true);
  });

  it("normalizes relative and absolute redirect locations", () => {
    expect(normalizeLocationPath("/login?next=%2Fworkshop", "https://preview.example")).toBe("/login?next=%2Fworkshop");
    expect(normalizeLocationPath("https://preview.example/beta/access-required", "https://preview.example")).toBe(
      "/beta/access-required",
    );
  });

  it("refuses to send hosted session cookies to unapproved origins", () => {
    expect(() => validateHostedAuthBaseUrl(
      "https://evil.example",
      ["https://www.archestimator.com"],
    )).toThrow(/not in HOSTED_AUTH_ALLOWED_ORIGINS/);

    expect(validateHostedAuthBaseUrl(
      "https://www.archestimator.com/workshop",
      ["https://www.archestimator.com"],
    )).toBe("https://www.archestimator.com");
  });

  it("fails closed when required hosted session cookies are missing", async () => {
    const fetchMock = vi.fn(async () => new Response(null, {
      status: 307,
      headers: {
        "cache-control": "private, no-cache, no-store, max-age=0, must-revalidate",
        location: "https://preview.example/login?next=%2Fworkshop",
      },
    }));

    const result = await verifyHostedAuthRoutes({
      baseUrl: "https://preview.example",
      allowedOrigins: ["https://preview.example"],
      cases: [
        { name: "signedOut", required: true },
        { name: "allowed", required: true },
        { name: "denied", required: true },
        { name: "revoked", required: true },
        { name: "expired", required: true },
      ],
    }, fetchMock as unknown as typeof fetch);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(result.passed).toBe(false);
    expect(result.cases.find((authCase) => authCase.name === "signedOut")?.passed).toBe(true);
    expect(result.cases.find((authCase) => authCase.name === "signedOut")?.hasPrivateNoStoreCacheControl).toBe(true);
    expect(result.cases.find((authCase) => authCase.name === "allowed")?.error).toMatch(/HOSTED_AUTH_ALLOWED_COOKIE/);
  });

  it("uses auth material for requests but never writes it to the report", async () => {
    const cacheControl = "private, no-cache, no-store, max-age=0, must-revalidate";
    const responses = [
      new Response(null, {
        status: 307,
        headers: { "cache-control": cacheControl, location: "https://preview.example/login?next=%2Fworkshop" },
      }),
      new Response("<html>workshop</html>", { status: 200, headers: { "cache-control": cacheControl } }),
      new Response(null, {
        status: 307,
        headers: { "cache-control": cacheControl, location: "https://preview.example/beta/access-required" },
      }),
      new Response(null, {
        status: 307,
        headers: { "cache-control": cacheControl, location: "https://preview.example/beta/access-required?status=revoked" },
      }),
      new Response(null, {
        status: 307,
        headers: { "cache-control": cacheControl, location: "https://preview.example/login?next=%2Fworkshop" },
      }),
    ];
    const fetchMock = vi.fn(async () => responses.shift()!);

    const result = await verifyHostedAuthRoutes({
      baseUrl: "https://preview.example",
      allowedOrigins: ["https://preview.example"],
      platformCookie: "platform-cookie-secret",
      platformAuthHeader: "Bearer platform-header-secret",
      cases: [
        { name: "signedOut", required: true },
        { name: "allowed", cookie: "allowed-session-secret", required: true },
        { name: "denied", cookie: "denied-session-secret", required: true },
        { name: "revoked", cookie: "revoked-session-secret", required: true },
        { name: "expired", cookie: "expired-session-secret", required: true },
      ],
    }, fetchMock as unknown as typeof fetch);

    expect(result.passed).toBe(true);
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      "https://preview.example/workshop",
      expect.objectContaining({
        headers: {
          Cookie: "platform-cookie-secret; allowed-session-secret",
          Authorization: "Bearer platform-header-secret",
        },
      }),
    );
    expect(JSON.stringify(result)).not.toContain("secret");
    expect(result.cases.every((authCase) => authCase.hasPrivateNoStoreCacheControl)).toBe(true);
    expect(result.cases[0]?.cacheControl).toBe(cacheControl);
  });

  it("records repeated sanitized timing samples for provided cases", async () => {
    const fetchMock = vi.fn(async () => new Response(null, {
      status: 307,
      headers: {
        "cache-control": "private, no-store",
        location: "https://preview.example/login?next=%2Fworkshop",
      },
    }));

    const result = await verifyHostedAuthRoutes({
      baseUrl: "https://preview.example",
      allowedOrigins: ["https://preview.example"],
      runs: 3,
      cases: [
        { name: "signedOut", required: true },
      ],
    }, fetchMock as unknown as typeof fetch);

    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(result.runs).toBe(3);
    expect(result.passed).toBe(true);
    expect(result.cases[0]?.samples).toHaveLength(3);
    expect(result.cases[0]?.minDurationMs).not.toBeNull();
    expect(result.cases[0]?.averageDurationMs).not.toBeNull();
    expect(result.cases[0]?.maxDurationMs).not.toBeNull();
    expect(JSON.stringify(result)).not.toContain("secret");
  });

  it("fails the hosted auth proof when cache headers could leak protected responses", async () => {
    const fetchMock = vi.fn(async () => new Response(null, {
      status: 307,
      headers: {
        "cache-control": "public, max-age=3600",
        location: "https://preview.example/login?next=%2Fworkshop",
      },
    }));

    const result = await verifyHostedAuthRoutes({
      baseUrl: "https://preview.example",
      allowedOrigins: ["https://preview.example"],
      cases: [
        { name: "signedOut", required: true },
      ],
    }, fetchMock as unknown as typeof fetch);

    expect(result.passed).toBe(false);
    expect(result.cases[0]?.passed).toBe(false);
    expect(result.cases[0]?.hasPrivateNoStoreCacheControl).toBe(false);
    expect(hasPrivateNoStoreCacheControl("private, no-store")).toBe(true);
    expect(hasPrivateNoStoreCacheControl("public, max-age=3600")).toBe(false);
  });
});
