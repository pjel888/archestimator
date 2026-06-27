import { describe, expect, it, vi } from "vitest";

import {
  createSupabaseUploadStorageProvider,
  type UploadStorageProvider,
} from "@/lib/uploads/storage-provider";

function createMemoryUploadStorageProvider(): UploadStorageProvider {
  const objects = new Map<string, { body: Uint8Array; contentType: string }>();
  const keyFor = (bucket: string, path: string) => `${bucket}:${path}`;

  return {
    async uploadObject({ bucket, path, body, contentType }) {
      objects.set(keyFor(bucket, path), { body: new Uint8Array(body), contentType });
    },
    async removeObjects(bucket, paths) {
      for (const path of paths) objects.delete(keyFor(bucket, path));
    },
    async downloadObject(bucket, path) {
      const object = objects.get(keyFor(bucket, path));
      if (!object) throw new Error("Storage download failed.");
      return {
        body: object.body.buffer.slice(object.body.byteOffset, object.body.byteOffset + object.body.byteLength),
        contentType: object.contentType,
        sizeBytes: object.body.byteLength,
      };
    },
    async createSignedReadUrl(bucket, path, expiresInSeconds) {
      if (!objects.has(keyFor(bucket, path))) throw new Error("Storage signed URL failed.");
      return `memory://${bucket}/${path}?expiresIn=${expiresInSeconds}`;
    },
    getPublicUrl(bucket, path) {
      return `memory-public://${bucket}/${path}`;
    },
  };
}

describe("upload storage provider contract", () => {
  it("supports provider-neutral upload, signed read, download, and remove operations", async () => {
    const provider = createMemoryUploadStorageProvider();
    await provider.uploadObject({
      bucket: "component-images",
      path: "workspace-1/user-1/component.webp",
      body: Buffer.from("image-bytes"),
      contentType: "image/webp",
    });

    await expect(provider.createSignedReadUrl("component-images", "workspace-1/user-1/component.webp", 60))
      .resolves.toBe("memory://component-images/workspace-1/user-1/component.webp?expiresIn=60");
    await expect(provider.downloadObject("component-images", "workspace-1/user-1/component.webp"))
      .resolves.toMatchObject({
        contentType: "image/webp",
        sizeBytes: 11,
      });

    await provider.removeObjects("component-images", ["workspace-1/user-1/component.webp"]);

    await expect(provider.downloadObject("component-images", "workspace-1/user-1/component.webp"))
      .rejects.toThrow("Storage download failed.");
  });

  it("maps Supabase storage operations into the provider contract", async () => {
    const bucketApi = {
      upload: vi.fn(async () => ({ error: null })),
      remove: vi.fn(async () => ({ error: null })),
      download: vi.fn(async () => ({ data: new Blob(["pdf-bytes"], { type: "application/pdf" }), error: null })),
      createSignedUrl: vi.fn(async () => ({ data: { signedUrl: "https://signed.example/spec.pdf" }, error: null })),
      getPublicUrl: vi.fn(() => ({ data: { publicUrl: "https://public.example/spec.pdf" } })),
    };
    const supabase = {
      storage: {
        from: vi.fn(() => bucketApi),
      },
    };
    const provider = createSupabaseUploadStorageProvider(supabase);

    await provider.uploadObject({
      bucket: "component-attachments",
      path: "workspace-1/user-1/spec.pdf",
      body: Buffer.from("pdf-bytes"),
      contentType: "application/pdf",
      cacheControl: "60",
    });
    const downloaded = await provider.downloadObject("component-attachments", "workspace-1/user-1/spec.pdf");
    const signedUrl = await provider.createSignedReadUrl("component-attachments", "workspace-1/user-1/spec.pdf", 300);
    const publicUrl = provider.getPublicUrl("component-attachments", "workspace-1/user-1/spec.pdf");

    expect(supabase.storage.from).toHaveBeenCalledWith("component-attachments");
    expect(bucketApi.upload).toHaveBeenCalledWith("workspace-1/user-1/spec.pdf", expect.any(Buffer), {
      contentType: "application/pdf",
      cacheControl: "60",
      upsert: false,
    });
    expect(downloaded.contentType).toBe("application/pdf");
    expect(downloaded.sizeBytes).toBe(9);
    expect(bucketApi.download).toHaveBeenCalledWith("workspace-1/user-1/spec.pdf");
    expect(bucketApi.createSignedUrl).toHaveBeenCalledWith("workspace-1/user-1/spec.pdf", 300);
    expect(signedUrl).toBe("https://signed.example/spec.pdf");
    expect(publicUrl).toBe("https://public.example/spec.pdf");
  });

  it("fails closed when provider download or signed-read operations fail", async () => {
    const bucketApi = {
      upload: vi.fn(async () => ({ error: null })),
      remove: vi.fn(async () => ({ error: null })),
      download: vi.fn(async () => ({ data: null, error: { message: "not found" } })),
      createSignedUrl: vi.fn(async () => ({ data: null, error: { message: "signing disabled" } })),
      getPublicUrl: vi.fn(() => ({ data: { publicUrl: "https://public.example/spec.pdf" } })),
    };
    const provider = createSupabaseUploadStorageProvider({
      storage: {
        from: vi.fn(() => bucketApi),
      },
    });

    await expect(provider.downloadObject("component-attachments", "workspace-1/user-1/spec.pdf"))
      .rejects.toThrow("not found");
    await expect(provider.createSignedReadUrl("component-attachments", "workspace-1/user-1/spec.pdf", 300))
      .rejects.toThrow("signing disabled");
  });
});
