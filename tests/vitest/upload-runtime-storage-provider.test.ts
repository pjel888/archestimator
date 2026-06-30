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
  it("defaults to Supabase storage when no Cloudflare proof flag is set", async () => {
    delete process.env.ARCHESTIMATOR_UPLOAD_STORAGE_PROVIDER;
    const bucketApi = {
      upload: vi.fn(async () => ({ error: null })),
      remove: vi.fn(async () => ({ error: null })),
      download: vi.fn(async () => ({ data: new Blob(["image"], { type: "image/webp" }), error: null })),
      createSignedUrl: vi.fn(async () => ({ data: { signedUrl: "https://signed.example/image.webp" }, error: null })),
      getPublicUrl: vi.fn(() => ({ data: { publicUrl: "https://public.example/image.webp" } })),
    };
    const supabase = {
      storage: {
        from: vi.fn(() => bucketApi),
      },
    };

    const provider = await createRuntimeUploadStorageProvider(supabase);
    await provider.uploadObject({
      bucket: "component-images",
      path: "workspace-1/user-1/component.webp",
      body: new Uint8Array([1]),
      contentType: "image/webp",
    });

    expect(readRuntimeUploadStorageProvider()).toBe("supabase");
    expect(supabase.storage.from).toHaveBeenCalledWith("component-images");
    expect(bucketApi.upload).toHaveBeenCalledWith("workspace-1/user-1/component.webp", new Uint8Array([1]), {
      contentType: "image/webp",
      cacheControl: "31536000",
      upsert: false,
    });
  });

  it("uses the ARCH_UPLOADS_R2 binding when Cloudflare R2 storage is explicitly selected", async () => {
    process.env.ARCHESTIMATOR_UPLOAD_STORAGE_PROVIDER = "cloudflare-r2";
    const r2 = createFakeR2Bucket();

    const provider = await createRuntimeUploadStorageProvider(createUnusedSupabaseStorageClient(), {
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

    await expect(createRuntimeUploadStorageProvider(createUnusedSupabaseStorageClient(), {
      cloudflareEnv: {},
    })).rejects.toThrow("Cloudflare R2 upload storage was selected but ARCH_UPLOADS_R2 is not bound.");
  });

  it("rejects unsupported provider names", () => {
    process.env.ARCHESTIMATOR_UPLOAD_STORAGE_PROVIDER = "mystery-storage";

    expect(() => readRuntimeUploadStorageProvider())
      .toThrow("Unsupported upload storage provider: mystery-storage");
  });
});

function createUnusedSupabaseStorageClient() {
  return {
    storage: {
      from: vi.fn(() => {
        throw new Error("Supabase storage should not be used.");
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
