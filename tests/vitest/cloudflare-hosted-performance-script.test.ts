import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, describe, expect, it, vi } from "vitest";

import {
  normalizeCloudflareHostedBaseUrl,
  parseHostedPerformanceRunCount,
  verifyCloudflareHostedPerformance,
  writeMarkdown,
} from "../../scripts/verify-cloudflare-hosted-performance";

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

type MockRouteResponse = { status: number; headers?: Record<string, string>; body?: string };

function makeFetch(statusByPath: (path: string) => MockRouteResponse) {
  return (async (input: string | URL | Request) => {
    const url = typeof input === "string" ? new URL(input) : input instanceof URL ? input : new URL(input.url);
    const next = statusByPath(`${url.pathname}${url.search}`);
    return new Response(next.body ?? "", { status: next.status, headers: next.headers });
  }) as typeof fetch;
}

function passingHostedFetch(fakeToken = "fake-token") {
  return makeFetch((path): MockRouteResponse => {
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
        headers: {
          "age": "120",
          "cf-cache-status": "HIT",
          "cf-ray": "example-HKG",
          "content-type": "text/html; charset=utf-8",
          "x-nextjs-prerender": "1",
          "x-opennext": "1",
        },
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

afterEach(() => {
  vi.restoreAllMocks();
});

describe("Cloudflare hosted performance verifier", () => {
  it("requires HTTPS hosted URLs and rejects local/private hosts", () => {
    expect(normalizeCloudflareHostedBaseUrl("https://proof.example.com/path")).toBe("https://proof.example.com");
    expect(() => normalizeCloudflareHostedBaseUrl("http://proof.example.com")).toThrow(/HTTPS/);
    expect(() => normalizeCloudflareHostedBaseUrl("https://localhost:8787")).toThrow(/private network/);
    expect(() => normalizeCloudflareHostedBaseUrl("https://10.0.0.5")).toThrow(/private network/);
  });

  it("uses a larger hosted sample count for p95 readiness", () => {
    expect(parseHostedPerformanceRunCount(undefined)).toBe(20);
    expect(parseHostedPerformanceRunCount("24")).toBe(24);
    expect(parseHostedPerformanceRunCount("999")).toBe(30);
    expect(parseHostedPerformanceRunCount("0")).toBe(20);
    expect(parseHostedPerformanceRunCount("nope")).toBe(20);
  });

  it("passes credential-free hosted route and budget proof without marking production performance ready", async () => {
    const report = await verifyCloudflareHostedPerformance({
      baseUrl: "https://proof.example.com",
      fakeToken: "fake-token",
      runs: 20,
      fetchImpl: passingHostedFetch(),
    });

    expect(report.routeContractReady).toBe(true);
    expect(report.runs).toBe(20);
    expect(report.minimumP95Runs).toBe(20);
    expect(report.p95Method).toBe("nearest-rank");
    expect(report.budgetMetric).toBe("ttfbMs");
    expect(report.p95SampleCountReady).toBe(true);
    expect(report.p95BudgetReady).toBe(true);
    expect(report.warmupRuns).toBe(1);
    expect(report.hostedCredentialFreePerformanceReady).toBe(true);
    expect(report.hostedPerformanceReady).toBe(false);
    expect(report.providerBacked).toBe(true);
    expect(report.results.find((result) => result.key === "health")).toMatchObject({
      required: true,
      passed: true,
      budgetMs: null,
      budgetLabel: "liveness contract only",
      p95BudgetPassed: null,
    });
    expect(report.results.find((result) => result.key === "home")).toMatchObject({
      required: true,
      passed: true,
      p95TtfbMs: expect.any(Number),
      p95BudgetPassed: true,
    });
    expect(report.results.find((result) => result.key === "home")?.samples[0]).toMatchObject({
      ttfbMs: expect.any(Number),
      bodyDownloadMs: expect.any(Number),
      cfCacheStatus: "HIT",
      cfRay: "example-HKG",
      age: "120",
      xNextjsPrerender: "1",
      xOpenNext: "1",
    });
    expect(report.results.find((result) => result.key === "project-image-missing-path")).toMatchObject({
      required: true,
      passed: true,
      budgetMs: null,
      budgetLabel: "record only",
      p95BudgetPassed: null,
    });
  });

  it("records warm-up samples without counting them toward p95 budgets", async () => {
    let currentTimeMs = 0;
    vi.spyOn(performance, "now").mockImplementation(() => currentTimeMs);
    const requestCounts = new Map<string, number>();
    const fetchImpl = (async (input: string | URL | Request) => {
      const url = typeof input === "string" ? new URL(input) : input instanceof URL ? input : new URL(input.url);
      const key = `${url.pathname}${url.search}`;
      const previousCount = requestCounts.get(key) ?? 0;
      requestCounts.set(key, previousCount + 1);
      currentTimeMs += previousCount === 0 ? 900 : 5;
      return passingHostedFetch()(input);
    }) as typeof fetch;

    const report = await verifyCloudflareHostedPerformance({
      baseUrl: "https://proof.example.com",
      fakeToken: "fake-token",
      runs: 1,
      warmupRuns: 1,
      fetchImpl,
    });

    const home = report.results.find((result) => result.key === "home");
    expect(home?.warmupSamples).toHaveLength(1);
    expect(home?.warmupSamples[0]?.ttfbMs).toBe(900);
    expect(home?.warmupSamples[0]?.durationMs).toBe(900);
    expect(home?.samples).toHaveLength(1);
    expect(home?.p95TtfbMs).toBe(5);
    expect(home?.p95DurationMs).toBe(5);
    expect(home?.p95BudgetPassed).toBe(true);
    expect(report.p95SampleCountReady).toBe(false);
    expect(report.p95BudgetReady).toBe(false);
    expect(report.hostedCredentialFreePerformanceReady).toBe(false);
  });

  it("uses enough hosted samples for p95 to tolerate one isolated latency spike", async () => {
    let currentTimeMs = 0;
    vi.spyOn(performance, "now").mockImplementation(() => currentTimeMs);
    const requestCounts = new Map<string, number>();
    const fetchImpl = (async (input: string | URL | Request) => {
      const url = typeof input === "string" ? new URL(input) : input instanceof URL ? input : new URL(input.url);
      const key = `${url.pathname}${url.search}`;
      const previousCount = requestCounts.get(key) ?? 0;
      requestCounts.set(key, previousCount + 1);
      currentTimeMs += previousCount === 10 ? 900 : 5;
      return passingHostedFetch()(input);
    }) as typeof fetch;

    const report = await verifyCloudflareHostedPerformance({
      baseUrl: "https://proof.example.com",
      fakeToken: "fake-token",
      runs: 20,
      warmupRuns: 0,
      fetchImpl,
    });

    const home = report.results.find((result) => result.key === "home");
    expect(report.p95SampleCountReady).toBe(true);
    expect(report.p95BudgetReady).toBe(true);
    expect(home?.maxDurationMs).toBe(900);
    expect(home?.maxTtfbMs).toBe(900);
    expect(home?.p95TtfbMs).toBe(5);
    expect(home?.p95DurationMs).toBe(5);
    expect(home?.p95BudgetPassed).toBe(true);
  });

  it("fails when a protected hosted route no longer fails closed", async () => {
    const report = await verifyCloudflareHostedPerformance({
      baseUrl: "https://proof.example.com",
      fakeToken: "fake-token",
      runs: 1,
      fetchImpl: makeFetch((path): MockRouteResponse => {
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
    expect(report.results.find((result) => result.key === "workshop-signed-out")?.passed).toBe(false);
  });

  it("writes markdown without leaking the fake token", async () => {
    const report = await verifyCloudflareHostedPerformance({
      baseUrl: "https://proof.example.com",
      fakeToken: "raw-fake-token",
      runs: 1,
      warmupRuns: 0,
      fetchImpl: passingHostedFetch("raw-fake-token"),
    });
    const dir = mkdtempSync(join(tmpdir(), "hosted-performance-"));
    try {
      const file = join(dir, "hosted-performance.md");
      writeMarkdown(report, file);
      const markdown = readFileSync(file, "utf8");
      expect(markdown).toContain("Cloudflare Hosted Worker Performance");
      expect(markdown).toContain("Budget metric: ttfbMs");
      expect(markdown).toContain("P95 TTFB");
      expect(markdown).toContain("CF Cache");
      expect(markdown).toContain("HIT");
      expect(markdown).not.toContain("raw-fake-token");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
