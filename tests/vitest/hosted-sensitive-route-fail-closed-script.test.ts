import { describe, expect, test } from "bun:test";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import {
  buildSensitiveRouteProbes,
  hasNoStoreCacheControl,
  normalizeHostedBaseUrl,
  parseRunCount,
  verifyHostedSensitiveRoutes,
  writeMarkdown,
} from "../../scripts/verify-hosted-sensitive-route-fail-closed";

function makeFetch(statusByPath: (path: string) => { status: number; headers?: Record<string, string>; body?: string }) {
  return (async (input: string | URL | Request) => {
    const url = typeof input === "string" ? new URL(input) : input instanceof URL ? input : new URL(input.url);
    const next = statusByPath(`${url.pathname}${url.search}`);
    return new Response(next.body ?? "", { status: next.status, headers: next.headers });
  }) as typeof fetch;
}

describe("hosted sensitive route fail-closed verifier", () => {
  test("builds only fake-token and unauthenticated private image probes", () => {
    const probes = buildSensitiveRouteProbes("fake token");
    expect(probes.map((probe) => probe.key)).toEqual([
      "share-page-invalid-token",
      "share-api-invalid-token",
      "share-activity-invalid-token",
      "project-image-missing-path",
      "project-image-invalid-path",
      "project-image-valid-shaped-path",
    ]);
    expect(probes[0].path).toContain("fake%20token");
  });

  test("accepts no-store cache-control variants and bounded run counts", () => {
    expect(hasNoStoreCacheControl("private, no-cache, no-store, max-age=0")).toBe(true);
    expect(hasNoStoreCacheControl("no-store")).toBe(true);
    expect(hasNoStoreCacheControl("public, max-age=0, must-revalidate")).toBe(false);
    expect(parseRunCount("999")).toBe(10);
    expect(parseRunCount("0")).toBe(1);
  });

  test("refuses non-HTTPS external origins but allows localhost", () => {
    expect(normalizeHostedBaseUrl("https://www.archestimator.com/path")).toBe("https://www.archestimator.com");
    expect(normalizeHostedBaseUrl("http://localhost:3000")).toBe("http://localhost:3000");
    expect(() => normalizeHostedBaseUrl("http://example.com")).toThrow(/HTTPS/);
  });

  test("passes when every sensitive probe fails closed with no-store and no Set-Cookie", async () => {
    const report = await verifyHostedSensitiveRoutes({
      baseUrl: "https://example.com",
      fakeToken: "fake-token",
      runs: 1,
      fetchImpl: makeFetch((path) => ({
        status: path.startsWith("/share/") ? 404 : 307,
        headers: { "cache-control": path.startsWith("/api/share") ? "no-store" : "private, no-cache, no-store, max-age=0", location: "/login" },
        body: path,
      })),
    });

    expect(report.passed).toBe(true);
    expect(report.results).toHaveLength(6);
    expect(report.results.every((result) => result.passed)).toBe(true);
  });

  test("fails when a private image redirect has public cache-control", async () => {
    const report = await verifyHostedSensitiveRoutes({
      baseUrl: "https://example.com",
      fakeToken: "fake-token",
      runs: 1,
      fetchImpl: makeFetch((path) => ({
        status: path.includes("projects/images") ? 307 : 404,
        headers: { "cache-control": path.includes("projects/images") ? "public, max-age=0, must-revalidate" : "no-store" },
      })),
    });

    expect(report.passed).toBe(false);
    expect(report.results.find((result) => result.key === "project-image-missing-path")?.passed).toBe(false);
  });

  test("writes markdown without leaking the fake token", async () => {
    const report = await verifyHostedSensitiveRoutes({
      baseUrl: "https://example.com",
      fakeToken: "raw-fake-token",
      runs: 1,
      fetchImpl: makeFetch(() => ({
        status: 404,
        headers: { "cache-control": "no-store", location: "/share/raw-fake-token" },
        body: "raw-fake-token should be redacted",
      })),
    });
    const dir = mkdtempSync(join(tmpdir(), "sensitive-routes-"));
    try {
      const file = join(dir, "report.md");
      writeMarkdown(report, file);
      const markdown = readFileSync(file, "utf8");
      expect(markdown).toContain("<redacted-fake-token>");
      expect(markdown).not.toContain("raw-fake-token");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
