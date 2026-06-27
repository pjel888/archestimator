import { describe, expect, test } from "vitest";

import {
  normalizeHostedUploadRuntimeBaseUrl,
  parseHostedUploadRuntimeCount,
  verifyHostedUploadRuntime,
} from "../../scripts/verify-hosted-upload-runtime";

function makeFetch(statusByRequest: (input: {
  method: string;
  path: string;
  authorization: string | null;
  bodyBytes: number;
}) => { status: number; headers?: Record<string, string>; body?: unknown }) {
  return (async (input: string | URL | Request, init?: RequestInit) => {
    const url = typeof input === "string" ? new URL(input) : input instanceof URL ? input : new URL(input.url);
    const headers = new Headers(init?.headers);
    const body = init?.body;
    const bodyBytes = body instanceof Uint8Array ? body.byteLength : 0;
    const next = statusByRequest({
      method: init?.method ?? "GET",
      path: `${url.pathname}${url.search}`,
      authorization: headers.get("authorization"),
      bodyBytes,
    });
    return new Response(JSON.stringify(next.body ?? {}), {
      status: next.status,
      headers: {
        "cache-control": "private, no-cache, no-store, max-age=0, must-revalidate",
        "content-type": "application/json",
        ...next.headers,
      },
    });
  }) as typeof fetch;
}

function runtimeBody(bodyProbe: Record<string, unknown> | null = null) {
  return {
    mode: "dry-run",
    proofSurface: "upload-hosted-runtime",
    runtime: "nodejs",
    durationMs: 12.4,
    deployment: { vercel: true, vercelEnvPresent: true, vercelRegionPresent: true },
    configuredLimits: {
      memoryMb: 1024,
      bodyLimitBytes: 12582912,
      routeDurationMs: 10000,
      expectedConcurrentUploads: 3,
      storageLatencyP95Ms: 250,
    },
    bodyProbe,
    memory: { before: { rssMb: 100 }, after: { rssMb: 101 }, rssDeltaMb: 1 },
    storageLatency: { status: "ok", bucketReachable: true, bucketPublic: false, durationMs: 24.3 },
  };
}

describe("hosted upload runtime proof verifier", () => {
  test("normalizes HTTPS hosted inputs and bounds counts", () => {
    expect(normalizeHostedUploadRuntimeBaseUrl("https://www.archestimator.com/path")).toBe("https://www.archestimator.com");
    expect(normalizeHostedUploadRuntimeBaseUrl("http://localhost:3000")).toBe("http://localhost:3000");
    expect(() => normalizeHostedUploadRuntimeBaseUrl("http://example.com")).toThrow(/HTTPS/);
    expect(parseHostedUploadRuntimeCount("999", 1, 5)).toBe(5);
    expect(parseHostedUploadRuntimeCount("0", 1, 5)).toBe(1);
  });

  test("passes fail-closed probes without claiming production runtime proof when no secret exists", async () => {
    const report = await verifyHostedUploadRuntime({
      baseUrl: "https://example.com",
      runs: 1,
      fetchImpl: makeFetch(() => ({
        status: 401,
        body: { error: "Unauthorized." },
      })),
    });

    expect(report.passed).toBe(true);
    expect(report.authenticated).toBe(false);
    expect(report.productionProofReady).toBe(false);
    expect(report.proofBoundary).toBe("hosted-runtime-fail-closed-only");
    expect(report.missingAuthenticatedProbeSecrets).toEqual(["HOSTED_UPLOAD_RUNTIME_SECRET"]);
  });

  test("passes authenticated runtime, body, and concurrency probes without recording bearer secrets", async () => {
    const seenAuthorization: string[] = [];
    const report = await verifyHostedUploadRuntime({
      baseUrl: "https://example.com",
      secret: "runtime-secret",
      runs: 1,
      concurrency: 3,
      bodyProbeBytes: 7,
      fetchImpl: makeFetch(({ method, authorization, bodyBytes }) => {
        if (authorization) seenAuthorization.push(authorization);
        if (!authorization) return { status: 401, body: { error: "Unauthorized." } };
        return {
          status: 200,
          body: runtimeBody(method === "POST"
            ? { contentLengthBytes: null, receivedBytes: bodyBytes, maxProbeBodyBytes: 4 * 1024 * 1024 }
            : null),
        };
      }),
    });

    expect(report.passed).toBe(true);
    expect(report.authenticated).toBe(true);
    expect(report.productionProofReady).toBe(true);
    expect(report.proofBoundary).toBe("hosted-runtime-authenticated-dry-run");
    expect(report.samples.filter((sample) => sample.type === "authenticated-concurrency-probe")).toHaveLength(3);
    expect(seenAuthorization).toEqual([
      "Bearer runtime-secret",
      "Bearer runtime-secret",
      "Bearer runtime-secret",
      "Bearer runtime-secret",
      "Bearer runtime-secret",
    ]);
    expect(JSON.stringify(report)).not.toContain("runtime-secret");
  });

  test("does not mark production proof ready when hosted configured limit facts are absent", async () => {
    const report = await verifyHostedUploadRuntime({
      baseUrl: "https://example.com",
      secret: "runtime-secret",
      fetchImpl: makeFetch(({ authorization, method, bodyBytes }) => {
        if (!authorization) return { status: 401, body: { error: "Unauthorized." } };
        return {
          status: 200,
          body: {
            ...runtimeBody(method === "POST" ? { receivedBytes: bodyBytes } : null),
            configuredLimits: {
              memoryMb: null,
              bodyLimitBytes: null,
              routeDurationMs: null,
              expectedConcurrentUploads: null,
              storageLatencyP95Ms: null,
            },
          },
        };
      }),
    });

    expect(report.passed).toBe(true);
    expect(report.productionProofReady).toBe(false);
  });

  test("fails authenticated body probes when the route does not echo the received byte count", async () => {
    const report = await verifyHostedUploadRuntime({
      baseUrl: "https://example.com",
      secret: "runtime-secret",
      bodyProbeBytes: 7,
      fetchImpl: makeFetch(({ authorization }) => {
        if (!authorization) return { status: 401, body: { error: "Unauthorized." } };
        return {
          status: 200,
          body: runtimeBody({ receivedBytes: 6 }),
        };
      }),
    });

    expect(report.passed).toBe(false);
    expect(report.productionProofReady).toBe(false);
    expect(report.samples.find((sample) => sample.type === "authenticated-body-probe")?.passed).toBe(false);
  });
});
