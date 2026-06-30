import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import {
  buildCloudflareWorkerPreviewProbes,
  normalizeWorkerPreviewBaseUrl,
  parseRunCount,
  verifyCloudflareWorkerPreviewRoutes,
  writeMarkdown,
} from "../../scripts/verify-cloudflare-worker-preview-routes";

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

function passingPreviewFetch(fakeToken = "fake-token") {
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
    const headers: Record<string, string> = { "cache-control": "private, no-cache, no-store, max-age=0" };
    if (path.includes(encodeURIComponent(fakeToken))) headers.location = `/share/${fakeToken}`;
    return {
      status: path.includes(encodeURIComponent(fakeToken)) ? 404 : 307,
      headers,
      body: path.includes(encodeURIComponent(fakeToken))
        ? "<!doctype html><html><body>Shared proposal This shared proposal is unavailable</body></html>"
        : path,
    };
  });
}

describe("Cloudflare Worker preview route verifier", () => {
  it("builds a credential-free signed-out route matrix", () => {
    const probes = buildCloudflareWorkerPreviewProbes("fake token");

    expect(probes.map((probe) => probe.key)).toEqual([
      "health",
      "home",
      "login",
      "pricing",
      "features",
      "about",
      "contact",
      "trust",
      "privacy",
      "terms",
      "signup",
      "access-required",
      "workshop-signed-out",
      "share-invalid-page",
      "share-invalid-api",
      "project-image-missing-path",
    ]);
    expect(probes.find((probe) => probe.key === "share-invalid-page")?.path).toContain("fake%20token");
  });

  it("normalizes localhost and HTTPS preview URLs with bounded run counts", () => {
    expect(normalizeWorkerPreviewBaseUrl("http://localhost:8787/path")).toBe("http://localhost:8787");
    expect(normalizeWorkerPreviewBaseUrl("https://preview.example/path")).toBe("https://preview.example");
    expect(() => normalizeWorkerPreviewBaseUrl("http://preview.example")).toThrow(/HTTPS/);
    expect(parseRunCount("99")).toBe(10);
    expect(parseRunCount("-1")).toBe(1);
  });

  it("passes when health, public pages, and signed-out fail-closed probes match", async () => {
    const report = await verifyCloudflareWorkerPreviewRoutes({
      baseUrl: "http://localhost:8787",
      fakeToken: "fake-token",
      runs: 1,
      fetchImpl: passingPreviewFetch(),
    });

    expect(report.passed).toBe(true);
    expect(report.results).toHaveLength(16);
    expect(report.results.every((result) => result.passed)).toBe(true);
    expect(report.note).toContain("not provider deployment");
  });

  it("fails when the protected route redirect lacks no-store cache-control", async () => {
    const report = await verifyCloudflareWorkerPreviewRoutes({
      baseUrl: "http://localhost:8787",
      fakeToken: "fake-token",
      runs: 1,
      fetchImpl: makeFetch((path) => {
        if (path === "/workshop") {
          return { status: 307, headers: { "cache-control": "public, max-age=60", location: "/login" } };
        }
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
        return { status: 404, headers: { "cache-control": "private, no-cache, no-store, max-age=0" } };
      }),
    });

    expect(report.passed).toBe(false);
    expect(report.results.find((result) => result.key === "workshop-signed-out")?.passed).toBe(false);
  });

  it("fails when an invalid share page renders the generic app error page", async () => {
    const report = await verifyCloudflareWorkerPreviewRoutes({
      baseUrl: "http://localhost:8787",
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
        if (path.startsWith("/share/")) {
          return {
            status: 200,
            headers: {
              "cache-control": "private, no-cache, no-store, max-age=0",
              "content-type": "text/html; charset=utf-8",
            },
            body: "<!doctype html><html><body>Something went wrong. Try again in a moment.</body></html>",
          };
        }
        return { status: 404, headers: { "cache-control": "private, no-cache, no-store, max-age=0" } };
      }),
    });

    expect(report.passed).toBe(false);
    expect(report.results.find((result) => result.key === "share-invalid-page")?.passed).toBe(false);
  });

  it("writes markdown without leaking the fake token", async () => {
    const report = await verifyCloudflareWorkerPreviewRoutes({
      baseUrl: "http://localhost:8787",
      fakeToken: "raw-fake-token",
      runs: 1,
      fetchImpl: passingPreviewFetch("raw-fake-token"),
    });
    const dir = mkdtempSync(join(tmpdir(), "worker-preview-routes-"));
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
