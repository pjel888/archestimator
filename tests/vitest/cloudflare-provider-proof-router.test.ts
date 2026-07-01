import { describe, expect, it, vi } from "vitest";

import { routeCloudflareProviderProofRequest } from "@/lib/cloudflare/provider-proof-router";

function responseOutput(bytes: Uint8Array) {
  return {
    response: () => new Response(bytes, {
      headers: {
        "content-type": "image/webp",
      },
    }),
  };
}

function createImagesBinding() {
  return {
    info: vi.fn(async () => ({ format: "png", width: 2, height: 2 })),
    input: vi.fn(() => ({
      transform: vi.fn(function transform() {
        return this;
      }),
      output: vi.fn(async () => responseOutput(new Uint8Array([1, 2, 3, 4]))),
    })),
  };
}

function createR2Bucket() {
  const objects = new Map<string, Uint8Array>();
  return {
    put: vi.fn(async (key: string, value: ArrayBuffer | ArrayBufferView | Blob | ReadableStream | string) => {
      if (typeof value === "string") {
        objects.set(key, new TextEncoder().encode(value));
        return;
      }
      if (value instanceof Blob) {
        objects.set(key, new Uint8Array(await value.arrayBuffer()));
        return;
      }
      if (value instanceof ReadableStream) {
        objects.set(key, new Uint8Array(await new Response(value).arrayBuffer()));
        return;
      }
      if (value instanceof ArrayBuffer) {
        objects.set(key, new Uint8Array(value));
        return;
      }
      objects.set(key, new Uint8Array(value.buffer, value.byteOffset, value.byteLength));
    }),
    get: vi.fn(async (key: string) => {
      const bytes = objects.get(key);
      if (!bytes) return null;
      return {
        size: bytes.byteLength,
        arrayBuffer: async () => bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength),
      };
    }),
    delete: vi.fn(async (key: string | string[]) => {
      for (const item of Array.isArray(key) ? key : [key]) objects.delete(item);
    }),
  };
}

describe("routeCloudflareProviderProofRequest", () => {
  it("ignores non-proof paths", async () => {
    const response = await routeCloudflareProviderProofRequest(
      new Request("https://archestimator.test/api/health"),
      { CRON_SECRET: "secret" },
    );

    expect(response).toBeNull();
  });

  it("requires POST and a matching bearer secret", async () => {
    const getResponse = await routeCloudflareProviderProofRequest(
      new Request("https://archestimator.test/__cloudflare/provider-proof"),
      { CRON_SECRET: "secret" },
    );
    const missingSecretResponse = await routeCloudflareProviderProofRequest(
      new Request("https://archestimator.test/__cloudflare/provider-proof", { method: "POST" }),
      {},
    );
    const unauthorizedResponse = await routeCloudflareProviderProofRequest(
      new Request("https://archestimator.test/__cloudflare/provider-proof", {
        method: "POST",
        headers: { authorization: "Bearer wrong" },
      }),
      { CRON_SECRET: "secret" },
    );

    expect(getResponse?.status).toBe(405);
    expect(missingSecretResponse?.status).toBe(503);
    expect(unauthorizedResponse?.status).toBe(401);
  });

  it("proves Images binding transform and ephemeral R2 object lifecycle", async () => {
    const images = createImagesBinding();
    const r2 = createR2Bucket();
    const response = await routeCloudflareProviderProofRequest(
      new Request("https://archestimator.test/__cloudflare/provider-proof", {
        method: "POST",
        headers: { authorization: "Bearer proof-secret" },
      }),
      {
        CRON_SECRET: "proof-secret",
        IMAGES: images,
        ARCH_UPLOADS_R2: r2,
      },
    );

    expect(response?.status).toBe(200);
    const body = await response?.json() as {
      ok: boolean;
      result: {
        imagesProviderProofReady: boolean;
        r2ProviderProofReady: boolean;
        imageOutputBytes: number;
        imageInfoMs: number | null;
        imageTransformMs: number | null;
        r2ObjectBytes: number;
        proofObjectDeleted: boolean;
        r2PutMs: number | null;
        r2GetMs: number | null;
        r2DeleteMs: number | null;
        r2RoundTripMs: number | null;
      };
    };

    expect(body.ok).toBe(true);
    expect(body.result.imagesProviderProofReady).toBe(true);
    expect(body.result.r2ProviderProofReady).toBe(true);
    expect(body.result.imageOutputBytes).toBe(4);
    expect(body.result.imageInfoMs).toEqual(expect.any(Number));
    expect(body.result.imageTransformMs).toEqual(expect.any(Number));
    expect(body.result.r2ObjectBytes).toBeGreaterThan(0);
    expect(body.result.proofObjectDeleted).toBe(true);
    expect(body.result.r2PutMs).toEqual(expect.any(Number));
    expect(body.result.r2GetMs).toEqual(expect.any(Number));
    expect(body.result.r2DeleteMs).toEqual(expect.any(Number));
    expect(body.result.r2RoundTripMs).toEqual(expect.any(Number));
    expect(images.info).toHaveBeenCalledTimes(1);
    expect(images.input).toHaveBeenCalledTimes(1);
    expect(r2.put).toHaveBeenCalledTimes(1);
    expect(r2.delete).toHaveBeenCalledTimes(1);
  });
});
