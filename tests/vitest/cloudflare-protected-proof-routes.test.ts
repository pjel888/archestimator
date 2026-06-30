import { describe, expect, it } from "vitest";

import { routeCloudflareProtectedProofRequest } from "@/lib/cloudflare/protected-proof-routes";

describe("Cloudflare protected proof route dispatcher", () => {
  it("ignores ordinary Worker requests without loading a proof handler", async () => {
    await expect(routeCloudflareProtectedProofRequest(
      new Request("https://archestimator.test/api/health"),
      {},
    )).resolves.toBeNull();
  });

  it("dispatches protected provider-proof requests", async () => {
    const response = await routeCloudflareProtectedProofRequest(
      new Request("https://archestimator.test/__cloudflare/provider-proof", {
        method: "POST",
        headers: { authorization: "Bearer proof-secret" },
      }),
      { CRON_SECRET: "proof-secret" },
    );
    const body = await response?.json();

    expect(response?.status).toBe(200);
    expect(body.mode).toBe("cloudflare-provider-runtime-proof");
    expect(body.result.imagesBindingPresent).toBe(false);
    expect(body.result.r2BindingPresent).toBe(false);
  });

  it("preserves proof route authorization failures", async () => {
    const response = await routeCloudflareProtectedProofRequest(
      new Request("https://archestimator.test/__cloudflare/jobs-proof", {
        method: "POST",
      }),
      {},
    );
    const body = await response?.json();

    expect(response?.status).toBe(503);
    expect(body.error).toBe("CRON_SECRET is not configured.");
  });
});
