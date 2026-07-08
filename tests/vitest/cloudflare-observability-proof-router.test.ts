import { afterEach, describe, expect, it, vi } from "vitest";

import { routeCloudflareObservabilityProofRequest } from "@/lib/cloudflare/observability-proof-router";
import { withRequestIdContext } from "@/lib/observability/request-id";

const REQUEST_ID = {
  echoId: "req_00000000-0000-4000-8000-000000000000",
  internalId: "req_00000000-0000-4000-8000-000000000000",
  source: "generated" as const,
};

describe("Cloudflare observability proof router", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("ignores unrelated paths", async () => {
    await expect(routeCloudflareObservabilityProofRequest(
      new Request("https://archestimator.test/api/health"),
      {},
    )).resolves.toBeNull();
  });

  it("requires the shared proof bearer secret", async () => {
    const missingSecret = await routeCloudflareObservabilityProofRequest(
      new Request("https://archestimator.test/__cloudflare/observability-proof", { method: "POST" }),
      {},
    );
    const unauthorized = await routeCloudflareObservabilityProofRequest(
      new Request("https://archestimator.test/__cloudflare/observability-proof", {
        method: "POST",
        headers: { authorization: "Bearer wrong" },
      }),
      { CRON_SECRET: "secret" },
    );

    expect(missingSecret?.status).toBe(503);
    expect(unauthorized?.status).toBe(401);
  });

  it("emits a structured proof marker without echoing the secret", async () => {
    const log = vi.spyOn(console, "log").mockImplementation(() => undefined);

    const response = await withRequestIdContext(REQUEST_ID, () => routeCloudflareObservabilityProofRequest(
      new Request("https://archestimator.test/__cloudflare/observability-proof", {
        method: "POST",
        headers: {
          authorization: "Bearer proof-secret",
          "x-observability-proof-id": "proof_12345678",
        },
      }),
      { CRON_SECRET: "proof-secret" },
    ));
    const body = await response?.json();
    const record = JSON.parse(String(log.mock.calls[0]?.[0]));

    expect(response?.status).toBe(200);
    expect(body).toMatchObject({
      ok: true,
      mode: "cloudflare-observability-proof",
      proofId: "proof_12345678",
      requestId: REQUEST_ID.internalId,
      route: "/__cloudflare/observability-proof",
    });
    expect(record).toMatchObject({
      level: "info",
      event: "workers_logs_proof_marker",
      request_id: REQUEST_ID.internalId,
      context: {
        proof_id: "proof_12345678",
        route: "/__cloudflare/observability-proof",
      },
    });
    expect(JSON.stringify(body)).not.toContain("proof-secret");
    expect(JSON.stringify(record)).not.toContain("proof-secret");
  });

  it("rejects unsafe proof ids before logging", async () => {
    const log = vi.spyOn(console, "log").mockImplementation(() => undefined);
    const response = await routeCloudflareObservabilityProofRequest(
      new Request("https://archestimator.test/__cloudflare/observability-proof?proof_id=Bearer%20secret", {
        method: "POST",
        headers: { authorization: "Bearer proof-secret" },
      }),
      { CRON_SECRET: "proof-secret" },
    );

    expect(response?.status).toBe(400);
    expect(log).not.toHaveBeenCalled();
  });
});
