import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import {
  normalizeCloudflareHostedRouteBaseUrl,
  verifyCloudflareHostedRoutes,
  writeMarkdown,
} from "../../scripts/verify-cloudflare-hosted-routes";

const PUBLIC_PAGE_PATHS = new Set([
  "/",
  "/login",
  "/pricing",
  "/features",
  "/about",
  "/contact",
  "/trust",
  "/privacy",
  "/terms",
  "/signup",
  "/access-required",
]);

function makeFetch(statusByPath: (path: string) => { status: number; headers?: Record<string, string>; body?: string }) {
  return (async (input: string | URL | Request) => {
    const url = typeof input === "string" ? new URL(input) : input instanceof URL ? input : new URL(input.url);
    const next = statusByPath(`${url.pathname}${url.search}`);
    return new Response(next.body ?? "", { status: next.status, headers: next.headers });
  }) as typeof fetch;
}

function passingHostedRouteFetch(fakeToken = "fake-token") {
  return makeFetch((path) => {
    if (path === "/api/health") {
      return {
        status: 200,
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ok: true, service: "archestimator" }),
      };
    }
    if (PUBLIC_PAGE_PATHS.has(path)) {
      return {
        status: 200,
        headers: { "content-type": "text/html; charset=utf-8" },
        body: "<!doctype html><html><body>ok</body></html>",
      };
    }
    if (path === "/workshop") {
      return {
        status: 307,
        headers: {
          "cache-control": "private, no-cache, no-store, max-age=0",
          location: "/login?next=%2Fworkshop",
        },
      };
    }
    return {
      status: path.includes(encodeURIComponent(fakeToken)) ? 404 : 401,
      headers: { "cache-control": "private, no-cache, no-store, max-age=0" },
      body: path.includes(encodeURIComponent(fakeToken))
        ? "<!doctype html><html><body>Shared proposal This shared proposal is unavailable</body></html>"
        : "",
    };
  });
}

describe("Cloudflare hosted route verifier", () => {
  it("records a no-op NO-GO artifact when no hosted Worker URL is configured", async () => {
    const report = await verifyCloudflareHostedRoutes({ runs: 1 });

    expect(report.configured).toBe(false);
    expect(report.providerBacked).toBe(false);
    expect(report.hostedRouteProofReady).toBe(false);
    expect(report.results).toEqual([]);
    expect(report.blockers[0]).toContain("CLOUDFLARE_HOSTED_ROUTE_BASE_URL");
  });

  it("requires HTTPS hosted URLs and rejects local/private hosts when supplied", () => {
    expect(normalizeCloudflareHostedRouteBaseUrl("https://proof.example.com/path")).toBe("https://proof.example.com");
    expect(() => normalizeCloudflareHostedRouteBaseUrl(undefined)).toThrow(/required/);
    expect(() => normalizeCloudflareHostedRouteBaseUrl("http://proof.example.com")).toThrow(/HTTPS/);
    expect(() => normalizeCloudflareHostedRouteBaseUrl("https://localhost:8787")).toThrow(/private network/);
  });

  it("passes credential-free hosted route proof without mutating providers", async () => {
    const report = await verifyCloudflareHostedRoutes({
      baseUrl: "https://proof.example.com",
      fakeToken: "fake-token",
      runs: 1,
      fetchImpl: passingHostedRouteFetch(),
    });

    expect(report.configured).toBe(true);
    expect(report.providerBacked).toBe(true);
    expect(report.routeContractReady).toBe(true);
    expect(report.hostedRouteProofReady).toBe(true);
    expect(report.passed).toBe(true);
    expect(report.note).toContain("does not call Cloudflare APIs");
  });

  it("fails when a hosted protected route no longer fails closed", async () => {
    const report = await verifyCloudflareHostedRoutes({
      baseUrl: "https://proof.example.com",
      fakeToken: "fake-token",
      runs: 1,
      fetchImpl: makeFetch((path) => {
        if (path === "/api/health") {
          return {
            status: 200,
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ ok: true, service: "archestimator" }),
          };
        }
        if (PUBLIC_PAGE_PATHS.has(path) || path === "/workshop") {
          return {
            status: 200,
            headers: { "content-type": "text/html; charset=utf-8" },
            body: "<!doctype html><html><body>ok</body></html>",
          };
        }
        return { status: 404, headers: { "cache-control": "private, no-cache, no-store, max-age=0" } };
      }),
    });

    expect(report.passed).toBe(false);
    expect(report.routeContractReady).toBe(false);
    expect(report.blockers[0]).toContain("workshop-signed-out");
  });

  it("writes markdown without leaking the fake token", async () => {
    const report = await verifyCloudflareHostedRoutes({
      baseUrl: "https://proof.example.com",
      fakeToken: "raw-fake-token",
      runs: 1,
      fetchImpl: passingHostedRouteFetch("raw-fake-token"),
    });
    const dir = mkdtempSync(join(tmpdir(), "hosted-routes-"));
    try {
      const file = join(dir, "hosted-routes.md");
      writeMarkdown(report, file);
      const markdown = readFileSync(file, "utf8");
      expect(markdown).toContain("Cloudflare Hosted Worker Route Proof");
      expect(markdown).toContain("redacted-fake-token");
      expect(markdown).not.toContain("raw-fake-token");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
