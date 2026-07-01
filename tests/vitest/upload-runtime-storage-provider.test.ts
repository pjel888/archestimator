import { afterEach, describe, expect, it, vi } from "vitest";

import { createRuntimeUploadStorageProvider, readRuntimeUploadStorageProvider } from "@/lib/uploads/runtime-storage-provider";
import type { CloudflareR2UploadBucket } from "@/lib/uploads/r2-storage-provider";

const ORIGINAL_PROVIDER = process.env.ARCHESTIMATOR_UPLOAD_STORAGE_PROVIDER;

afterEach(() => {
  if (ORIGINAL_PROVIDER === undefined) {
    delete process.env.ARCHESTIMATOR_UPLOAD_STORAGE_PROVIDER;
  } else {
    process.env.ARCHESTIMATOR_UPLOAD_STORAGE_PROVIDER = ORIGINAL_PROVIDER;
  }
});

describe("runtime upload storage provider selection", () => {
  it("defaults to Cloudflare R2 storage when no provider override is set", async () => {
    delete process.env.ARCHESTIMATOR_UPLOAD_STORAGE_PROVIDER;
    const r2 = createFakeR2Bucket();

    const provider = await createRuntimeUploadStorageProvider(createUnusedLegacyStorageClient(), {
      cloudflareEnv: { ARCH_UPLOADS_R2: r2 },
    });
    await provider.uploadObject({
      bucket: "component-images",
      path: "workspace-1/user-1/component.webp",
      body: new Uint8Array([1, 2, 3]),
      contentType: "image/webp",
    });

    expect(readRuntimeUploadStorageProvider()).toBe("cloudflare-r2");
    expect(r2.put).toHaveBeenCalledWith("component-images/workspace-1/user-1/component.webp", new Uint8Array([1, 2, 3]), {
      httpMetadata: {
        contentType: "image/webp",
        cacheControl: "31536000",
      },
    });
  });

  it("uses the ARCH_UPLOADS_R2 binding when Cloudflare R2 storage is explicitly selected", async () => {
    process.env.ARCHESTIMATOR_UPLOAD_STORAGE_PROVIDER = "cloudflare-r2";
    const r2 = createFakeR2Bucket();

    const provider = await createRuntimeUploadStorageProvider(createUnusedLegacyStorageClient(), {
      cloudflareEnv: { ARCH_UPLOADS_R2: r2 },
    });
    await provider.uploadObject({
      bucket: "component-images",
      path: "workspace-1/user-1/component.webp",
      body: new Uint8Array([1, 2, 3]),
      contentType: "image/webp",
    });

    expect(readRuntimeUploadStorageProvider()).toBe("cloudflare-r2");
    expect(r2.put).toHaveBeenCalledWith("component-images/workspace-1/user-1/component.webp", new Uint8Array([1, 2, 3]), {
      httpMetadata: {
        contentType: "image/webp",
        cacheControl: "31536000",
      },
    });
  });

  it("fails closed when R2 storage is selected without a Worker binding", async () => {
    process.env.ARCHESTIMATOR_UPLOAD_STORAGE_PROVIDER = "cloudflare-r2";

    await expect(createRuntimeUploadStorageProvider(createUnusedLegacyStorageClient(), {
      cloudflareEnv: {},
    })).rejects.toThrow("Cloudflare R2 upload storage was selected but ARCH_UPLOADS_R2 is not bound.");
  });

  it("rejects unsupported provider names", () => {
    process.env.ARCHESTIMATOR_UPLOAD_STORAGE_PROVIDER = "mystery-storage";

    expect(() => readRuntimeUploadStorageProvider())
      .toThrow("Unsupported upload storage provider: mystery-storage");
  });

  it("rejects a retired storage provider name", () => {
    process.env.ARCHESTIMATOR_UPLOAD_STORAGE_PROVIDER = "legacy-storage";

    expect(() => readRuntimeUploadStorageProvider())
      .toThrow("Unsupported upload storage provider: legacy-storage");
  });
});

function createUnusedLegacyStorageClient() {
  return {
    storage: {
      from: vi.fn(() => {
        throw new Error("Legacy storage should not be used.");
      }),
    },
  };
}

function createFakeR2Bucket(): CloudflareR2UploadBucket {
  return {
    put: vi.fn(async () => null),
    get: vi.fn(async () => null),
    delete: vi.fn(async () => undefined),
  };
}
