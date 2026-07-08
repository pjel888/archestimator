import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

describe("Cloudflare Worker request id contract", () => {
  const workerSource = readFileSync("worker.ts", "utf8");

  it("wraps every Worker fetch in request id context and echoes x-request-id", () => {
    expect(workerSource).toContain("resolveRequestId(request.headers)");
    expect(workerSource).toContain("withRequestIdContext(requestId");
    expect(workerSource).toContain("responseWithRequestId");
  });

  it("logs and returns a safe structured response for unhandled Worker fetch errors", () => {
    expect(workerSource).toContain('event: "worker_fetch_error"');
    expect(workerSource).toContain("logWorkerFetchError(error, request, requestId)");
    expect(workerSource).toContain('"INTERNAL_ERROR"');
    expect(workerSource).toContain("normalizePathForLog(request.url)");
  });
});

