import { afterEach, describe, expect, it, vi } from "vitest";

import {
  buildHeaders,
  checkVercelHealthReadiness,
  parseHealthUrls,
  parseInputsFromEnv,
  summarizeProbe,
} from "@/../scripts/check-vercel-health-readiness";

const originalEnv = { ...process.env };

afterEach(() => {
  process.env = { ...originalEnv };
  vi.restoreAllMocks();
});

describe("Vercel health readiness checker", () => {
  it("requires at least one health URL", () => {
    process.env = {};

    expect(() => parseInputsFromEnv()).toThrow(/VERCEL_HEALTH_URLS/);
  });

  it("parses comma and newline separated URLs", () => {
    expect(parseHealthUrls("https://one.example/api/health, https://two.example/api/health\nhttps://three.example/api/health")).toEqual([
      "https://one.example/api/health",
      "https://two.example/api/health",
      "https://three.example/api/health",
    ]);
  });

  it("passes only the Archestimator health JSON contract", () => {
    const result = summarizeProbe({
      url: "https://preview.example/api/health",
      response: new Response(JSON.stringify({ ok: true, service: "archestimator" }), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
      bodyText: JSON.stringify({ ok: true, service: "archestimator" }),
      durationMs: 12.4,
    });

    expect(result.passed).toBe(true);
    expect(result.healthJsonOk).toBe(true);
    expect(result.healthService).toBe("archestimator");
  });

  it("fails redirects, deployment protection, and non-health bodies", async () => {
    const responses = [
      new Response("", { status: 307, headers: { location: "https://www.archestimator.com/api/health" } }),
      new Response("Authentication Required", { status: 401, headers: { "content-type": "text/plain" } }),
      new Response("<html>Coming Soon</html>", { status: 404, headers: { "content-type": "text/html" } }),
    ];
    const fetchMock = vi.fn(async () => responses.shift()!);

    const result = await checkVercelHealthReadiness({
      urls: [
        "https://archestimator.com/api/health",
        "https://preview.example/api/health",
        "https://www.archestimator.com/api/health",
      ],
    }, fetchMock as unknown as typeof fetch);

    expect(result.vercelHealthReady).toBe(false);
    expect(result.probes.map((probe) => probe.status)).toEqual([307, 401, 404]);
    expect(result.blockedUrls).toHaveLength(3);
  });

  it("uses auth material for requests but never writes it to the report", async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ ok: true, service: "archestimator" }), {
      status: 200,
      headers: { "content-type": "application/json" },
    }));

    const result = await checkVercelHealthReadiness({
      urls: ["https://preview.example/api/health"],
      authHeader: "Bearer secret-header",
      authCookie: "vercel-bypass=secret-cookie",
    }, fetchMock as unknown as typeof fetch);

    expect(fetchMock).toHaveBeenCalledWith(
      "https://preview.example/api/health",
      expect.objectContaining({
        headers: {
          Authorization: "Bearer secret-header",
          Cookie: "vercel-bypass=secret-cookie",
        },
        redirect: "manual",
      }),
    );
    expect(result.vercelHealthReady).toBe(true);
    expect(result.usedAuthMaterial).toBe(true);
    expect(JSON.stringify(result)).not.toContain("secret");
  });

  it("builds request headers from optional auth inputs", () => {
    expect(buildHeaders({ authHeader: "Bearer token", authCookie: "cookie=value" })).toEqual({
      Authorization: "Bearer token",
      Cookie: "cookie=value",
    });
  });
});
