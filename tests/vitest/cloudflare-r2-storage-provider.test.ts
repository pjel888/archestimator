import { describe, expect, it, vi } from "vitest";

import {
  buildCloudflareR2ObjectKey,
  createCloudflareR2UploadStorageProvider,
  type CloudflareR2UploadBucket,
} from "@/lib/uploads/r2-storage-provider";

class FakeR2Bucket implements CloudflareR2UploadBucket {
  readonly objects = new Map<string, {
    body: Uint8Array;
    httpMetadata?: {
      contentType?: string;
      cacheControl?: string;
    };
  }>();

  readonly putCalls: Array<{
    key: string;
    httpMetadata?: {
      contentType?: string;
      cacheControl?: string;
    };
  }> = [];

  readonly deleteCalls: Array<string | string[]> = [];

  async put(
    key: string,
    value: ArrayBuffer | ArrayBufferView | Blob | ReadableStream | string,
    options?: {
      httpMetadata?: {
        contentType?: string;
        cacheControl?: string;
      };
    },
  ) {
    const body = await toBytes(value);
    this.putCalls.push({ key, httpMetadata: options?.httpMetadata });
    this.objects.set(key, { body, httpMetadata: options?.httpMetadata });
  }

  async get(key: string) {
    const object = this.objects.get(key);
    if (!object) return null;
    return {
      size: object.body.byteLength,
      httpMetadata: object.httpMetadata,
      arrayBuffer: async () => object.body.buffer.slice(
        object.body.byteOffset,
        object.body.byteOffset + object.body.byteLength,
      ),
    };
  }

  async delete(keys: string | string[]) {
    this.deleteCalls.push(keys);
    for (const key of Array.isArray(keys) ? keys : [keys]) {
      this.objects.delete(key);
    }
  }
}

describe("Cloudflare R2 upload storage provider", () => {
  it("maps logical upload buckets and paths into private R2 object keys", async () => {
    const r2 = new FakeR2Bucket();
    const provider = createCloudflareR2UploadStorageProvider(r2);

    await provider.uploadObject({
      bucket: "component-images",
      path: "workspace-1/user-1/component.webp",
      body: Buffer.from("image-bytes"),
      contentType: "image/webp",
      cacheControl: "60",
    });

    const key = "component-images/workspace-1/user-1/component.webp";
    expect(buildCloudflareR2ObjectKey("component-images", "workspace-1/user-1/component.webp")).toBe(key);
    expect(r2.putCalls).toEqual([{
      key,
      httpMetadata: {
        contentType: "image/webp",
        cacheControl: "60",
      },
    }]);
    await expect(provider.downloadObject("component-images", "workspace-1/user-1/component.webp"))
      .resolves.toMatchObject({
        contentType: "image/webp",
        sizeBytes: 11,
      });
  });

  it("removes all mapped private R2 keys for cleanup and delete flows", async () => {
    const r2 = new FakeR2Bucket();
    const provider = createCloudflareR2UploadStorageProvider(r2);
    await provider.uploadObject({
      bucket: "component-attachments",
      path: "workspace-1/user-1/spec.pdf",
      body: new Uint8Array([1]),
      contentType: "application/pdf",
    });
    await provider.uploadObject({
      bucket: "component-attachments",
      path: "workspace-1/user-1/spec-thumb.webp",
      body: new Uint8Array([2]),
      contentType: "image/webp",
    });

    await provider.removeObjects("component-attachments", [
      "workspace-1/user-1/spec.pdf",
      "workspace-1/user-1/spec-thumb.webp",
    ]);

    expect(r2.deleteCalls).toEqual([
      "component-attachments/workspace-1/user-1/spec.pdf",
      "component-attachments/workspace-1/user-1/spec-thumb.webp",
    ]);
    await expect(provider.downloadObject("component-attachments", "workspace-1/user-1/spec.pdf"))
      .rejects.toThrow("R2 storage object was not found.");
  });

  it("fails closed for unsafe object identifiers before calling R2", async () => {
    const r2 = new FakeR2Bucket();
    const provider = createCloudflareR2UploadStorageProvider(r2);

    await expect(provider.uploadObject({
      bucket: "../component-images",
      path: "workspace-1/user-1/component.webp",
      body: new Uint8Array([1]),
      contentType: "image/webp",
    })).rejects.toThrow("R2 logical bucket name is unsafe.");
    await expect(provider.uploadObject({
      bucket: "component-images",
      path: "workspace-1/../component.webp",
      body: new Uint8Array([1]),
      contentType: "image/webp",
    })).rejects.toThrow("R2 storage path is unsafe.");

    expect(r2.putCalls).toEqual([]);
  });

  it("keeps signed reads and public URLs explicit for private R2 objects", async () => {
    const r2 = new FakeR2Bucket();
    const provider = createCloudflareR2UploadStorageProvider(r2);

    await expect(provider.createSignedReadUrl("component-images", "workspace-1/user-1/component.webp", 300))
      .rejects.toThrow("R2 signed read URLs require an app-owned signer or read route.");
    expect(() => provider.getPublicUrl("component-images", "workspace-1/user-1/component.webp"))
      .toThrow("R2 public URLs require an explicit public base URL.");
  });

  it("uses injected signed-read and public URL strategies when a later route supplies them", async () => {
    const signer = vi.fn(async () => "https://archestimator.com/api/uploads/signed/component.webp?sig=proof");
    const provider = createCloudflareR2UploadStorageProvider(new FakeR2Bucket(), {
      publicBaseUrl: "https://assets.archestimator.com/",
      signedReadUrlFactory: signer,
    });

    await expect(provider.createSignedReadUrl("component-images", "workspace-1/user-1/component.webp", 120))
      .resolves.toBe("https://archestimator.com/api/uploads/signed/component.webp?sig=proof");
    expect(() => provider.getPublicUrl("component-images", "workspace-1/user-1/component with space.webp"))
      .toThrow("R2 storage path is unsafe.");
    expect(provider.getPublicUrl("component-images", "workspace-1/user-1/component.webp"))
      .toBe("https://assets.archestimator.com/component-images/workspace-1/user-1/component.webp");
    expect(signer).toHaveBeenCalledWith({
      bucket: "component-images",
      path: "workspace-1/user-1/component.webp",
      key: "component-images/workspace-1/user-1/component.webp",
      expiresInSeconds: 120,
    });
  });
});

async function toBytes(value: ArrayBuffer | ArrayBufferView | Blob | ReadableStream | string): Promise<Uint8Array> {
  if (typeof value === "string") return new TextEncoder().encode(value);
  if (value instanceof ArrayBuffer) return new Uint8Array(value);
  if (ArrayBuffer.isView(value)) {
    return new Uint8Array(value.buffer.slice(value.byteOffset, value.byteOffset + value.byteLength));
  }
  if (value instanceof Blob) return new Uint8Array(await value.arrayBuffer());
  throw new Error("Fake R2 bucket does not support stream values.");
}
