import { Buffer } from "node:buffer";

import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  MATERIAL_IMAGE_MAX_EDGE,
  MATERIAL_IMAGE_MAX_PIXELS,
  MATERIAL_IMAGE_THUMBNAIL_EDGE,
  materialImageUploadFailure,
} from "@/lib/uploads/material-image-contract";
import {
  createMaterialImageUploadService,
  type MaterialImageUploadDependencies,
  type MaterialImageUploadServiceInput,
} from "@/lib/uploads/material-image-service";

const sourceBytes = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 1, 2, 3]);
const optimizedBytes = Buffer.from([10, 11, 12]);
const thumbnailBytes = Buffer.from([20, 21]);

function serviceInput(overrides: Partial<MaterialImageUploadServiceInput> = {}): MaterialImageUploadServiceInput {
  return {
    surface: "project-image",
    workspaceId: "workspace-1",
    actorUserId: "user-1",
    targetEntityType: "estimate-row",
    targetEntityId: "row-1",
    fileName: "Material.JPG",
    declaredMimeType: "image/jpeg",
    sourceBytes,
    imagePath: "workspace-1/user-1/project-images/project-1/material.webp",
    thumbnailPath: "workspace-1/user-1/project-images/project-1/material-thumb.webp",
    metadata: { projectId: "project-1", estimateId: "estimate-1" },
    ...overrides,
  };
}

function dependencies(): MaterialImageUploadDependencies {
  const input = serviceInput();
  return {
    storageProvider: {
      uploadObject: vi.fn().mockResolvedValue(undefined),
      removeObjects: vi.fn().mockResolvedValue(undefined),
    },
    processImage: vi.fn().mockResolvedValue({
      status: "ok",
      image: {
        optimized: { data: optimizedBytes, info: { width: 1200, height: 900 } },
        thumbnail: { data: thumbnailBytes, info: { width: 512, height: 384 } },
      },
    }),
    reserveUploadAsset: vi.fn().mockResolvedValue({
      assetId: "asset-1",
      uploadSessionId: "session-1",
      scanStatus: "not_required",
      claimToken: "claim-1",
      reservationState: "acquired",
      workspaceId: input.workspaceId,
      actorUserId: input.actorUserId,
      surface: input.surface,
      targetEntityType: input.targetEntityType ?? null,
      targetEntityId: input.targetEntityId ?? null,
      projectId: "project-1",
      estimateId: "estimate-1",
      bucket: "project-images",
      path: input.imagePath,
      thumbnailPath: input.thumbnailPath,
      fileName: input.fileName,
      contentType: "image/webp",
      sizeBytes: optimizedBytes.byteLength,
      checksumSha256: "a".repeat(64),
      metadataJson: "{}",
      expiresAt: "2030-01-01T00:15:00.000Z",
      createdAt: "2030-01-01T00:00:00.000Z",
    }),
    renewCleanupLease: vi.fn().mockResolvedValue(undefined),
    finalizeUploadAsset: vi.fn().mockResolvedValue({
      assetId: "asset-1",
      uploadSessionId: "session-1",
      scanStatus: "not_required",
    }),
    failUploadAsset: vi.fn().mockResolvedValue(undefined),
  };
}

describe("material image upload service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("processes original bytes once, stores both WebPs, and returns the durable storage receipt internally", async () => {
    const deps = dependencies();
    const input = serviceInput();
    const result = await createMaterialImageUploadService(deps)(input);

    expect(deps.processImage).toHaveBeenCalledTimes(1);
    expect(deps.processImage).toHaveBeenCalledWith({
      sourceBuffer: sourceBytes,
      magicMime: "image/jpeg",
      maxImagePixels: MATERIAL_IMAGE_MAX_PIXELS,
      maxImageEdge: MATERIAL_IMAGE_MAX_EDGE,
      thumbnailEdge: MATERIAL_IMAGE_THUMBNAIL_EDGE,
    });
    expect(deps.storageProvider.uploadObject).toHaveBeenNthCalledWith(1, expect.objectContaining({
      bucket: "project-images",
      path: input.imagePath,
      body: optimizedBytes,
      contentType: "image/webp",
    }));
    expect(deps.storageProvider.uploadObject).toHaveBeenNthCalledWith(2, expect.objectContaining({
      bucket: "project-images",
      path: input.thumbnailPath,
      body: thumbnailBytes,
      contentType: "image/webp",
    }));
    expect(deps.reserveUploadAsset).toHaveBeenCalledWith(expect.objectContaining({
      surface: "project-image",
      targetEntityType: "estimate-row",
      targetEntityId: "row-1",
      bucket: "project-images",
      checksumBytes: optimizedBytes,
      scanStatus: "not_required",
    }));
    expect(result).toEqual({
      ok: true,
      result: expect.objectContaining({
        assetId: "asset-1",
        uploadSessionId: "session-1",
        bucket: "project-images",
        path: input.imagePath,
        thumbnailPath: input.thumbnailPath,
        contentType: "image/webp",
        sizeBytes: optimizedBytes.byteLength,
        originalContentType: "image/jpeg",
        checksumSha256: expect.stringMatching(/^[a-f0-9]{64}$/),
      }),
    });
  });

  it("keeps component-image storage in its separate bucket", async () => {
    const deps = dependencies();
    const input = serviceInput({
      surface: "component-image",
      targetEntityType: "component-library",
      targetEntityId: null,
      imagePath: "workspace-1/user-1/component.webp",
      thumbnailPath: "workspace-1/user-1/component-thumb.webp",
    });
    const result = await createMaterialImageUploadService(deps)(input);

    expect(deps.reserveUploadAsset).toHaveBeenCalledWith(expect.objectContaining({
      surface: "component-image",
      bucket: "component-images",
    }));
    expect(result).toEqual({
      ok: true,
      result: expect.objectContaining({ bucket: "component-images" }),
    });
  });

  it("rejects source admission before processing or storage", async () => {
    const deps = dependencies();
    const result = await createMaterialImageUploadService(deps)(serviceInput({ sourceBytes: Buffer.alloc(0) }));

    expect(result).toEqual(materialImageUploadFailure("empty_file"));
    expect(deps.processImage).not.toHaveBeenCalled();
    expect(deps.storageProvider.uploadObject).not.toHaveBeenCalled();
    expect(deps.reserveUploadAsset).not.toHaveBeenCalled();
  });

  it("rejects paths outside the workspace and actor namespace", async () => {
    const deps = dependencies();
    const result = await createMaterialImageUploadService(deps)(serviceInput({
      imagePath: "workspace-2/user-1/project-images/project-1/material.webp",
    }));

    expect(result).toEqual(materialImageUploadFailure("invalid_storage_path"));
    expect(deps.processImage).not.toHaveBeenCalled();
    expect(deps.storageProvider.uploadObject).not.toHaveBeenCalled();
  });

  it("maps processor denial without writing storage", async () => {
    const deps = dependencies();
    vi.mocked(deps.processImage!).mockResolvedValue({ status: "dimensions-too-large" });

    const result = await createMaterialImageUploadService(deps)(serviceInput());

    expect(result).toEqual(materialImageUploadFailure("too_many_pixels"));
    expect(deps.storageProvider.uploadObject).not.toHaveBeenCalled();
    expect(deps.reserveUploadAsset).not.toHaveBeenCalled();
  });

  it("removes the optimized object when thumbnail storage fails", async () => {
    const deps = dependencies();
    vi.mocked(deps.storageProvider.uploadObject)
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce(new Error("thumbnail write failed"));
    const input = serviceInput();

    const result = await createMaterialImageUploadService(deps)(input);

    expect(result).toEqual(materialImageUploadFailure("storage_failed"));
    expect(deps.storageProvider.removeObjects).toHaveBeenCalledWith("project-images", [input.imagePath]);
    expect(deps.renewCleanupLease).toHaveBeenCalledOnce();
    expect(deps.reserveUploadAsset).toHaveBeenCalledTimes(1);
    expect(deps.failUploadAsset).toHaveBeenCalledWith(expect.anything(), "storage");
  });

  it("removes both objects when durable recording fails", async () => {
    const deps = dependencies();
    vi.mocked(deps.finalizeUploadAsset).mockRejectedValue(new Error("D1 unavailable"));
    const input = serviceInput();

    const result = await createMaterialImageUploadService(deps)(input);

    expect(result).toEqual(materialImageUploadFailure("recording_failed"));
    expect(deps.storageProvider.removeObjects).toHaveBeenCalledWith(
      "project-images",
      [input.imagePath, input.thumbnailPath],
    );
    expect(deps.renewCleanupLease).toHaveBeenCalledOnce();
    expect(deps.failUploadAsset).toHaveBeenCalledWith(expect.anything(), "finalization");
  });

  it("does not delete reacquired objects when the stale cleanup claim is rejected", async () => {
    const deps = dependencies();
    vi.mocked(deps.finalizeUploadAsset).mockRejectedValue(new Error("stale finalize"));
    vi.mocked(deps.renewCleanupLease).mockRejectedValue(new Error("upload cleanup claim guard failed"));

    const result = await createMaterialImageUploadService(deps)(serviceInput());

    expect(result).toEqual(materialImageUploadFailure("recording_failed"));
    expect(deps.storageProvider.removeObjects).not.toHaveBeenCalled();
    expect(deps.failUploadAsset).not.toHaveBeenCalled();
  });

  it("persists failed cleanup state and surfaces the cleanup provider error", async () => {
    const deps = dependencies();
    vi.mocked(deps.finalizeUploadAsset).mockRejectedValue(new Error("D1 unavailable"));
    vi.mocked(deps.storageProvider.removeObjects).mockRejectedValue(new Error("R2 cleanup unavailable"));

    await expect(createMaterialImageUploadService(deps)(serviceInput()))
      .rejects.toThrow("R2 cleanup unavailable");
    expect(deps.failUploadAsset).toHaveBeenCalledWith(expect.anything(), "finalization");
  });

  it("reuses a finalized reservation without rewriting storage", async () => {
    const deps = dependencies();
    const finalized = await deps.reserveUploadAsset({} as never);
    vi.mocked(deps.reserveUploadAsset).mockClear();
    vi.mocked(deps.reserveUploadAsset).mockResolvedValue({ ...finalized, reservationState: "finalized" });
    vi.mocked(deps.storageProvider.uploadObject).mockClear();

    const result = await createMaterialImageUploadService(deps)(serviceInput());

    expect(result).toMatchObject({ ok: true, result: { assetId: "asset-1" } });
    expect(deps.storageProvider.uploadObject).not.toHaveBeenCalled();
    expect(deps.finalizeUploadAsset).not.toHaveBeenCalled();
  });
});
