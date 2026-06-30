import { describe, expect, it } from "vitest";

import type { UploadStorageProvider } from "@/lib/uploads/storage-provider";

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
});
