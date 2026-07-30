import { describe, expect, it } from "vitest";

import {
  admitMaterialImageSource,
  MATERIAL_IMAGE_MAX_BYTES,
  materialImageBucketForSurface,
  materialImageUploadFailure,
  parseMaterialImageAssetDescriptor,
  parseMaterialImageUploadResult,
  sniffMaterialImageMimeType,
  toMaterialImageAssetDescriptor,
  toOpaqueMaterialImageAssetDescriptor,
  toOpaqueMaterialImageUploadResult,
  type MaterialImageUploadResult,
} from "@/lib/uploads/material-image-contract";

const JPEG_HEADER = new Uint8Array([0xff, 0xd8, 0xff, 0xe0]);
const PNG_HEADER = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const WEBP_HEADER = new Uint8Array([0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50]);
const AVIF_HEADER = new Uint8Array([0, 0, 0, 0, 0x66, 0x74, 0x79, 0x70, 0x61, 0x76, 0x69, 0x66]);

function uploadResult(overrides: Partial<MaterialImageUploadResult> = {}): MaterialImageUploadResult {
  return {
    assetId: "asset-1",
    uploadSessionId: "session-1",
    bucket: "project-images",
    path: "workspace/user/project-images/project/image.webp",
    thumbnailPath: "workspace/user/project-images/project/image-thumb.webp",
    url: "/api/projects/images?assetId=asset-1&variant=image",
    thumbnailUrl: "/api/projects/images?assetId=asset-1&variant=thumbnail",
    fileName: "source.png",
    contentType: "image/webp",
    sizeBytes: 100,
    width: 800,
    height: 600,
    thumbnailWidth: 400,
    thumbnailHeight: 300,
    originalBytes: 200,
    originalContentType: "image/png",
    checksumSha256: "a".repeat(64),
    scanStatus: "not_required",
    ...overrides,
  };
}

describe("material image upload contract", () => {
  it("admits the exact byte limit and rejects one byte over with the shared error", () => {
    expect(admitMaterialImageSource({
      sizeBytes: MATERIAL_IMAGE_MAX_BYTES,
      declaredMimeType: "image/jpeg",
      headerBytes: JPEG_HEADER,
    })).toEqual({ ok: true, declaredMimeType: "image/jpeg", magicMimeType: "image/jpeg" });

    expect(admitMaterialImageSource({
      sizeBytes: MATERIAL_IMAGE_MAX_BYTES + 1,
      declaredMimeType: "image/jpeg",
      headerBytes: JPEG_HEADER,
    })).toEqual(materialImageUploadFailure("too_large"));
  });

  it("rejects empty, unsupported, missing-magic, and mismatched files consistently", () => {
    expect(admitMaterialImageSource({ sizeBytes: 0, headerBytes: JPEG_HEADER }))
      .toEqual(materialImageUploadFailure("empty_file"));
    expect(admitMaterialImageSource({ sizeBytes: 4, declaredMimeType: "image/gif", headerBytes: JPEG_HEADER }))
      .toEqual(materialImageUploadFailure("unsupported_type"));
    expect(admitMaterialImageSource({ sizeBytes: 4, declaredMimeType: "image/jpeg", headerBytes: new Uint8Array(4) }))
      .toEqual(materialImageUploadFailure("invalid_magic"));
    expect(admitMaterialImageSource({ sizeBytes: 8, declaredMimeType: "image/jpeg", headerBytes: PNG_HEADER }))
      .toEqual(materialImageUploadFailure("type_mismatch"));
  });

  it("sniffs every admitted source format", () => {
    expect(sniffMaterialImageMimeType(JPEG_HEADER)).toBe("image/jpeg");
    expect(sniffMaterialImageMimeType(PNG_HEADER)).toBe("image/png");
    expect(sniffMaterialImageMimeType(WEBP_HEADER)).toBe("image/webp");
    expect(sniffMaterialImageMimeType(AVIF_HEADER)).toBe("image/avif");
  });

  it("keeps project and component storage domains distinct", () => {
    expect(materialImageBucketForSurface("project-image")).toBe("project-images");
    expect(materialImageBucketForSurface("component-image")).toBe("component-images");
  });

  it("parses one canonical route result and derives its durable descriptor", () => {
    const result = uploadResult();
    expect(parseMaterialImageUploadResult(result)).toEqual(result);

    const descriptor = toMaterialImageAssetDescriptor(result);
    expect(parseMaterialImageAssetDescriptor(descriptor)).toEqual(descriptor);
    expect(descriptor).toEqual(expect.objectContaining({
      kind: "upload-asset",
      schemaVersion: 1,
      assetId: "asset-1",
      uploadSessionId: "session-1",
      bucket: "project-images",
      contentType: "image/webp",
      sizeBytes: 100,
    }));
  });

  it("rejects URL-only, unsafe storage locators, non-WebP, and malformed-checksum successes", () => {
    expect(parseMaterialImageUploadResult({ url: "/api/projects/images?path=image.webp" })).toBeNull();
    expect(parseMaterialImageUploadResult(uploadResult({ path: "../raw.webp" }))).toBeNull();
    expect(parseMaterialImageUploadResult({ ...uploadResult(), contentType: "image/png" })).toBeNull();
    expect(parseMaterialImageUploadResult(uploadResult({ checksumSha256: "not-a-checksum" }))).toBeNull();
  });

  it("requires opaque project asset authorization and accepts HTTPS component serving", () => {
    expect(parseMaterialImageUploadResult(uploadResult())).not.toBeNull();
    expect(parseMaterialImageUploadResult(uploadResult({
      url: "https://images.example.test/project.webp",
      thumbnailUrl: "https://images.example.test/project-thumb.webp",
    }))).not.toBeNull();
    expect(parseMaterialImageUploadResult(uploadResult({
      bucket: "component-images",
      path: "workspace/user/component.webp",
      thumbnailPath: "workspace/user/component-thumb.webp",
      url: "https://images.example.test/component.webp",
      thumbnailUrl: "https://images.example.test/component-thumb.webp",
    }))).not.toBeNull();
    expect(parseMaterialImageUploadResult(uploadResult({
      url: "/api/projects/images?path=workspace%2Fraw.webp",
    }))).toBeNull();
  });

  it("derives an opaque estimate-row result and descriptor without R2 locators", () => {
    const opaqueResult = toOpaqueMaterialImageUploadResult(uploadResult(), {
      url: "/api/projects/images?assetId=asset-1&variant=image",
      thumbnailUrl: "/api/projects/images?assetId=asset-1&variant=thumbnail",
    });
    const descriptor = toOpaqueMaterialImageAssetDescriptor(opaqueResult);
    expect(opaqueResult).not.toHaveProperty("bucket");
    expect(opaqueResult).not.toHaveProperty("path");
    expect(descriptor).not.toHaveProperty("thumbnailPath");
    expect(descriptor).toMatchObject({ assetId: "asset-1", uploadSessionId: "session-1" });
  });
});
