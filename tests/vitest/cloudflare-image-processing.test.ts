import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  type CloudflareImagesBindingLike,
  processUploadImageToWebp,
} from "@/lib/uploads/server-image-processing";

const PNG_BYTES = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAACXBIWXMAAAPoAAAD6AG1e1JrAAAADUlEQVQImWP4////fwAJ+wP9CNHoHgAAAABJRU5ErkJggg==",
  "base64",
);

function createFakeImagesBinding({
  info = { format: "image/png", width: 1200, height: 600 },
  outputs = ["optimized-webp", "thumbnail-webp"],
}: {
  info?: { format?: string; width?: number; height?: number };
  outputs?: string[];
} = {}) {
  const transforms: Array<Record<string, unknown>> = [];
  const outputOptions: Array<Record<string, unknown>> = [];
  const outputQueue = [...outputs];
  const input = vi.fn((_stream: ReadableStream<Uint8Array>) => {
    const handle = {
      transform: vi.fn((options: Record<string, unknown>) => {
        transforms.push(options);
        return handle;
      }),
      output: vi.fn(async (options: Record<string, unknown>) => {
        outputOptions.push(options);
        return {
          response: () => new Response(outputQueue.shift() ?? "webp", {
            headers: { "content-type": "image/webp" },
          }),
        };
      }),
    };
    return handle;
  });

  return {
    binding: {
      input,
      info: vi.fn(async () => info),
    } satisfies CloudflareImagesBindingLike,
    input,
    transforms,
    outputOptions,
  };
}

async function processWithCloudflareImages(binding?: CloudflareImagesBindingLike | null) {
  return processUploadImageToWebp({
    sourceBuffer: PNG_BYTES,
    magicMime: "image/png",
    maxImagePixels: 24_000_000,
    maxImageEdge: 800,
    thumbnailEdge: 120,
    cloudflareImagesBinding: binding,
  });
}

beforeEach(() => {
  vi.unstubAllEnvs();
  vi.stubEnv("ARCHESTIMATOR_CLOUDFLARE_BUILD", "1");
  vi.stubEnv("ARCHESTIMATOR_IMAGE_PROCESSING_PROVIDER", "cloudflare-images");
});

describe("Cloudflare Images upload processing", () => {
  it("creates optimized and thumbnail WebP outputs from a bound Images API", async () => {
    const fake = createFakeImagesBinding();

    const result = await processWithCloudflareImages(fake.binding);

    expect(result.status).toBe("ok");
    if (result.status !== "ok") return;
    expect(result.image.optimized.data.toString()).toBe("optimized-webp");
    expect(result.image.thumbnail.data.toString()).toBe("thumbnail-webp");
    expect(result.image.optimized.info).toEqual({ width: 800, height: 400 });
    expect(result.image.thumbnail.info).toEqual({ width: 120, height: 60 });
    expect(fake.transforms).toEqual([
      { width: 800, height: 800, fit: "scale-down" },
      { width: 120, height: 120, fit: "scale-down" },
    ]);
    expect(fake.outputOptions).toEqual([
      { format: "image/webp", quality: 82, anim: false },
      { format: "image/webp", quality: 85, anim: false },
    ]);
  });

  it("fails closed when Cloudflare Images is selected but no binding is available", async () => {
    const result = await processWithCloudflareImages(null);

    expect(result).toEqual({ status: "cloudflare-image-processing-unavailable" });
  });

  it("keeps the proof build unavailable unless the Cloudflare Images provider is selected", async () => {
    vi.stubEnv("ARCHESTIMATOR_IMAGE_PROCESSING_PROVIDER", "node-sharp");
    const fake = createFakeImagesBinding();

    const result = await processWithCloudflareImages(fake.binding);

    expect(result).toEqual({ status: "cloudflare-image-processing-unavailable" });
    expect(fake.input).not.toHaveBeenCalled();
  });

  it("rejects unsupported image encodings before transformation", async () => {
    const fake = createFakeImagesBinding({ info: { format: "image/gif", width: 100, height: 100 } });

    const result = await processWithCloudflareImages(fake.binding);

    expect(result).toEqual({ status: "unsupported-encoding" });
    expect(fake.input).not.toHaveBeenCalled();
  });

  it("rejects oversized dimensions before transformation", async () => {
    const fake = createFakeImagesBinding({ info: { format: "image/png", width: 6000, height: 5000 } });

    const result = await processWithCloudflareImages(fake.binding);

    expect(result).toEqual({ status: "dimensions-too-large" });
    expect(fake.input).not.toHaveBeenCalled();
  });
});
