import { afterEach, describe, expect, it, vi } from "vitest";

import {
  buildHeaders,
  evaluateCase,
  normalizeLocationPath,
  parseInputsFromEnv,
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

  it("fails closed when required hosted session cookies are missing", async () => {
    const fetchMock = vi.fn(async () => new Response(null, {
      status: 307,
      headers: { location: "https://preview.example/login?next=%2Fworkshop" },
    }));

    const result = await verifyHostedAuthRoutes({
      baseUrl: "https://preview.example",
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
    expect(result.cases.find((authCase) => authCase.name === "allowed")?.error).toMatch(/HOSTED_AUTH_ALLOWED_COOKIE/);
  });

  it("uses auth material for requests but never writes it to the report", async () => {
    const responses = [
      new Response(null, { status: 307, headers: { location: "https://preview.example/login?next=%2Fworkshop" } }),
      new Response("<html>workshop</html>", { status: 200 }),
      new Response(null, { status: 307, headers: { location: "https://preview.example/beta/access-required" } }),
      new Response(null, {
        status: 307,
        headers: { location: "https://preview.example/beta/access-required?status=revoked" },
      }),
      new Response(null, { status: 307, headers: { location: "https://preview.example/login?next=%2Fworkshop" } }),
    ];
    const fetchMock = vi.fn(async () => responses.shift()!);

    const result = await verifyHostedAuthRoutes({
      baseUrl: "https://preview.example",
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
  });
});
