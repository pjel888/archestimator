import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { describe, expect, test } from "vitest";

import {
  buildHostedUploadOperationProbes,
  normalizeHostedUploadOperationsBaseUrl,
  parseHostedUploadOperationsCount,
  verifyHostedUploadOperations,
  writeMarkdown,
} from "../../scripts/verify-hosted-upload-operations";

function makeFetch(statusByPath: (input: {
  path: string;
  authorization: string | null;
}) => { status: number; headers?: Record<string, string>; body?: unknown }) {
  return (async (input: string | URL | Request, init?: RequestInit) => {
    const url = typeof input === "string" ? new URL(input) : input instanceof URL ? input : new URL(input.url);
    const authorization = init?.headers && "authorization" in init.headers
      ? String(init.headers.authorization)
      : null;
    const next = statusByPath({ path: `${url.pathname}${url.search}`, authorization });
    const body = typeof next.body === "string" ? next.body : JSON.stringify(next.body ?? {});
    return new Response(body, {
      status: next.status,
      headers: {
        "cache-control": "private, no-cache, no-store, max-age=0, must-revalidate",
        "content-type": "application/json",
        ...next.headers,
      },
    });
  }) as typeof fetch;
}

describe("hosted upload operations proof verifier", () => {
  test("builds unauthenticated probes by default and only adds dry-run probes when secrets exist", () => {
    expect(buildHostedUploadOperationProbes().map((probe) => probe.key)).toEqual([
      "upload-cleanup-unauthenticated-dry-run",
      "upload-scan-unauthenticated-dry-run",
    ]);
    expect(buildHostedUploadOperationProbes({
      cleanupSecret: "cleanup-secret",
      scanSecret: "scan-secret",
      limit: 3,
    }).map((probe) => [probe.key, probe.path, probe.authenticated])).toEqual([
      ["upload-cleanup-unauthenticated-dry-run", "/api/internal/upload-cleanup?limit=3&dryRun=1", false],
      ["upload-scan-unauthenticated-dry-run", "/api/internal/upload-scan?limit=3&dryRun=1", false],
      ["upload-cleanup-authenticated-dry-run", "/api/internal/upload-cleanup?limit=3&dryRun=1", true],
      ["upload-scan-authenticated-dry-run", "/api/internal/upload-scan?limit=3&dryRun=1", true],
    ]);
  });

  test("normalizes hosted inputs with HTTPS and bounded counts", () => {
    expect(normalizeHostedUploadOperationsBaseUrl("https://www.archestimator.com/path")).toBe("https://www.archestimator.com");
    expect(normalizeHostedUploadOperationsBaseUrl("http://localhost:3000")).toBe("http://localhost:3000");
    expect(() => normalizeHostedUploadOperationsBaseUrl("http://example.com")).toThrow(/HTTPS/);
    expect(parseHostedUploadOperationsCount("999", 1, 5)).toBe(5);
    expect(parseHostedUploadOperationsCount("0", 1, 5)).toBe(1);
  });

  test("passes fail-closed probes without claiming production proof when secrets are absent", async () => {
    const report = await verifyHostedUploadOperations({
      baseUrl: "https://example.com",
      runs: 1,
      fetchImpl: makeFetch(() => ({
        status: 401,
        body: { error: "Unauthorized." },
      })),
    });

    expect(report.passed).toBe(true);
    expect(report.productionProofReady).toBe(false);
    expect(report.proofBoundary).toBe("hosted-fail-closed-only");
    expect(report.missingAuthenticatedProbeSecrets).toEqual([
      "HOSTED_UPLOAD_OPERATIONS_CLEANUP_SECRET",
      "HOSTED_UPLOAD_OPERATIONS_SCAN_SECRET",
    ]);
  });

  test("passes authenticated dry-run probes without recording bearer secrets", async () => {
    const seenAuthorization: string[] = [];
    const report = await verifyHostedUploadOperations({
      baseUrl: "https://example.com",
      cleanupSecret: "cleanup-secret",
      scanSecret: "scan-secret",
      runs: 1,
      limit: 2,
      fetchImpl: makeFetch(({ path, authorization }) => {
        if (authorization) seenAuthorization.push(authorization);
        if (!authorization) return { status: 401, body: { error: "Unauthorized." } };
        if (path.includes("upload-cleanup")) {
          return {
            status: 200,
            body: {
              mode: "dry-run",
              readRecordCount: 0,
              planner: { candidateCount: 0 },
              storage: { removedCount: 0 },
            },
          };
        }
        return {
          status: 200,
          body: {
            mode: "dry-run",
            readRecordCount: 0,
            selectedRecordCount: 0,
            scannedCount: 0,
            outcomeCounts: { clean: 0 },
          },
        };
      }),
    });

    expect(report.passed).toBe(true);
    expect(report.productionProofReady).toBe(true);
    expect(report.proofBoundary).toBe("hosted-authenticated-dry-run");
    expect(report.authenticatedDryRunKinds).toEqual(["cleanup", "scan"]);
    expect(seenAuthorization).toEqual(["Bearer cleanup-secret", "Bearer scan-secret"]);
    expect(JSON.stringify(report)).not.toContain("cleanup-secret");
    expect(JSON.stringify(report)).not.toContain("scan-secret");
  });

  test("fails authenticated dry-run probes that do not return dry-run summaries", async () => {
    const report = await verifyHostedUploadOperations({
      baseUrl: "https://example.com",
      cleanupSecret: "cleanup-secret",
      runs: 1,
      fetchImpl: makeFetch(({ authorization }) => {
        if (!authorization) return { status: 401, body: { error: "Unauthorized." } };
        return { status: 200, body: { mode: "mutating-run" } };
      }),
    });

    expect(report.passed).toBe(false);
    expect(report.productionProofReady).toBe(false);
    expect(report.results.find((result) => result.key === "upload-cleanup-authenticated-dry-run")?.passed).toBe(false);
  });

  test("writes markdown without leaking authenticated probe secrets", async () => {
    const report = await verifyHostedUploadOperations({
      baseUrl: "https://example.com",
      cleanupSecret: "cleanup-secret",
      scanSecret: "scan-secret",
      fetchImpl: makeFetch(({ authorization }) => {
        if (!authorization) return { status: 401, body: { error: "Unauthorized." } };
        return { status: 200, body: { mode: "dry-run" } };
      }),
    });
    const dir = mkdtempSync(join(tmpdir(), "hosted-upload-operations-"));
    try {
      const file = join(dir, "report.md");
      writeMarkdown(report, file);
      const markdown = readFileSync(file, "utf8");
      expect(markdown).toContain("Hosted Upload Operations Proof");
      expect(markdown).not.toContain("cleanup-secret");
      expect(markdown).not.toContain("scan-secret");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
