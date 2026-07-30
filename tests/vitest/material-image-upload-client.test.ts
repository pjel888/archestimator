import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { useMaterialImageUpload } from "@/components/workshop/material-image-upload/use-material-image-upload";
import {
  admitMaterialImageFile,
  uploadOriginalMaterialImage,
  type MaterialImageClientUploadSuccess,
  type MaterialImageUploadTransport,
} from "@/lib/uploads/client-image-upload";
import { UploadClientError } from "@/lib/uploads/client-upload";
import {
  MATERIAL_IMAGE_MAX_BYTES,
  materialImageUploadFailure,
  toMaterialImageAssetDescriptor,
  type MaterialImageUploadResult,
} from "@/lib/uploads/material-image-contract";

function sourceFile(name = "material.png") {
  return new File([new Uint8Array([1, 2, 3])], name, { type: "image/png" });
}

function uploadResult(overrides: Partial<MaterialImageUploadResult> = {}): MaterialImageUploadResult {
  return {
    assetId: "asset-1",
    uploadSessionId: "session-1",
    bucket: "project-images",
    path: "workspace-1/user-1/project-images/project-1/material.webp",
    thumbnailPath: "workspace-1/user-1/project-images/project-1/material-thumb.webp",
    url: "/api/projects/images?assetId=asset-1&variant=image",
    thumbnailUrl: "/api/projects/images?assetId=asset-1&variant=thumbnail",
    fileName: "material.png",
    contentType: "image/webp",
    sizeBytes: 100,
    width: 1200,
    height: 900,
    thumbnailWidth: 512,
    thumbnailHeight: 384,
    originalBytes: 200,
    originalContentType: "image/png",
    checksumSha256: "a".repeat(64),
    scanStatus: "not_required",
    ...overrides,
  };
}

function uploaded(result = uploadResult()): MaterialImageClientUploadSuccess {
  return { result, descriptor: toMaterialImageAssetDescriptor(result) };
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("material image client upload adapter", () => {
  it("uses the shared exact 12 MiB boundary without decoding or transforming", () => {
    const exact = { size: MATERIAL_IMAGE_MAX_BYTES, type: "image/png" } as File;
    const over = { size: MATERIAL_IMAGE_MAX_BYTES + 1, type: "image/png" } as File;

    expect(admitMaterialImageFile(exact)).toEqual({ ok: true, file: exact });
    expect(admitMaterialImageFile(over)).toEqual(materialImageUploadFailure("too_large"));
    expect(admitMaterialImageFile({ size: 1, type: "image/gif" } as File))
      .toEqual(materialImageUploadFailure("unsupported_type"));
  });

  it("passes the original File and ownership fields to the existing transport primitive", async () => {
    const file = sourceFile();
    const transport: MaterialImageUploadTransport = vi.fn(async (_url, formData) => {
      expect(formData.get("file")).toBe(file);
      expect(formData.get("projectId")).toBe("project-1");
      expect(formData.get("estimateId")).toBe("estimate-1");
      expect(formData.get("uploadAttemptId")).toEqual(expect.any(String));
      return uploadResult() as never;
    });

    await expect(uploadOriginalMaterialImage({
      endpoint: "/api/projects/images",
      file,
      fields: { projectId: "project-1", estimateId: "estimate-1", omitted: null },
      transport,
    })).resolves.toEqual(uploaded());
    expect(transport).toHaveBeenCalledTimes(1);
  });

  it("fails retryably when the route result is not canonical", async () => {
    const transport: MaterialImageUploadTransport = vi.fn(async () => ({ url: "/image.webp" }) as never);

    await expect(uploadOriginalMaterialImage({
      endpoint: "/api/projects/images",
      file: sourceFile(),
      transport,
    })).rejects.toMatchObject({
      kind: "invalid-response",
      retryable: true,
      status: 502,
    });
  });

  it.each([
    ["timeout", undefined],
    ["http", 429],
    ["http", 503],
  ] as const)("preserves retryable %s transport failures", async (kind, status) => {
    const transport: MaterialImageUploadTransport = vi.fn(async () => {
      throw new UploadClientError("Try again.", { kind, retryable: true, status });
    });

    await expect(uploadOriginalMaterialImage({
      endpoint: "/api/component-library/images",
      file: sourceFile(),
      transport,
    })).rejects.toMatchObject({ kind, retryable: true, status });
  });
});

describe("useMaterialImageUpload", () => {
  it("is lazy, creates a local preview, and uploads only after startUpload", async () => {
    const file = sourceFile();
    const uploadImage = vi.fn(async () => uploaded());
    const objectUrls = {
      create: vi.fn(() => "blob:material-preview"),
      revoke: vi.fn(),
    };
    const { result } = renderHook(() => useMaterialImageUpload({
      endpoint: "/api/projects/images",
      fields: { projectId: "project-1", estimateId: "estimate-1", rowItemId: "row-1" },
      uploadImage,
      objectUrls,
    }));

    await act(async () => {
      expect(await result.current.selectFile(file)).toBe(true);
    });
    expect(result.current.state.phase).toBe("selected");
    expect(result.current.state.previewUrl).toBe("blob:material-preview");
    expect(uploadImage).not.toHaveBeenCalled();

    await act(async () => {
      await result.current.startUpload();
    });
    expect(uploadImage).toHaveBeenCalledWith(expect.objectContaining({
      endpoint: "/api/projects/images",
      file,
      fields: expect.objectContaining({ rowItemId: "row-1" }),
      signal: expect.any(AbortSignal),
    }));
    expect(result.current.state.phase).toBe("uploaded");
    expect(result.current.state.descriptor?.assetId).toBe("asset-1");
  });

  it("aborts active transport and exposes an upload-only retry", async () => {
    const uploadImage = vi.fn(({ signal }: { signal?: AbortSignal }) => new Promise<MaterialImageClientUploadSuccess>((_resolve, reject) => {
      signal?.addEventListener("abort", () => {
        reject(new UploadClientError("Upload cancelled.", { kind: "aborted", retryable: true }));
      });
    }));
    const { result } = renderHook(() => useMaterialImageUpload({
      endpoint: "/api/projects/images",
      uploadImage: uploadImage as typeof uploadOriginalMaterialImage,
      objectUrls: { create: () => "blob:preview", revoke: vi.fn() },
    }));
    await act(async () => {
      await result.current.selectFile(sourceFile());
    });

    let pending: Promise<MaterialImageClientUploadSuccess | null>;
    act(() => {
      pending = result.current.startUpload();
    });
    act(() => {
      result.current.cancelUpload();
    });
    await act(async () => {
      await pending!;
    });

    expect(result.current.state.phase).toBe("cancelled");
    expect(result.current.canRetryUpload).toBe(true);
    expect(result.current.canRetrySave).toBe(false);
  });

  it("retains one upload-attempt identity across transport retries", async () => {
    const attemptIds: string[] = [];
    const uploadImage = vi.fn(async (input: { fields?: Record<string, string | null | undefined> }) => {
      attemptIds.push(String(input.fields?.uploadAttemptId));
      if (attemptIds.length === 1) {
        throw new UploadClientError("Try again.", { kind: "http", retryable: true, status: 503 });
      }
      return uploaded();
    });
    const { result } = renderHook(() => useMaterialImageUpload({
      endpoint: "/api/component-library/images",
      uploadImage: uploadImage as typeof uploadOriginalMaterialImage,
      objectUrls: { create: () => "blob:preview", revoke: vi.fn() },
    }));

    await act(async () => {
      await result.current.selectFile(sourceFile());
    });
    await act(async () => {
      await result.current.startUpload();
    });
    await act(async () => {
      await result.current.retryUpload();
    });

    expect(attemptIds).toHaveLength(2);
    expect(attemptIds[0]).toBeTruthy();
    expect(attemptIds[1]).toBe(attemptIds[0]);
  });

  it("retains the descriptor across save failure and retries save without another upload", async () => {
    const uploadImage = vi.fn(async () => uploaded());
    const saveDescriptor = vi.fn()
      .mockRejectedValueOnce(new Error("Revision conflict"))
      .mockResolvedValueOnce(undefined);
    const revoke = vi.fn();
    const { result } = renderHook(() => useMaterialImageUpload({
      endpoint: "/api/component-library/images",
      uploadImage,
      saveDescriptor,
      objectUrls: { create: () => "blob:preview", revoke },
    }));
    await act(async () => {
      await result.current.selectFile(sourceFile());
    });
    await act(async () => {
      await result.current.startUpload();
    });

    await act(async () => {
      expect(await result.current.save()).toBe(false);
    });
    expect(result.current.state.phase).toBe("save_error");
    expect(result.current.state.descriptor?.assetId).toBe("asset-1");
    expect(result.current.canRetrySave).toBe(true);

    await act(async () => {
      expect(await result.current.retrySave()).toBe(true);
    });
    expect(result.current.state.phase).toBe("saved");
    expect(result.current.state.descriptor?.assetId).toBe("asset-1");
    expect(uploadImage).toHaveBeenCalledTimes(1);
    expect(saveDescriptor).toHaveBeenCalledTimes(2);
    expect(revoke).toHaveBeenCalledWith("blob:preview");
  });

  it("revokes replaced previews and cleans a provisional descriptor on unmount", async () => {
    const revoke = vi.fn();
    const cleanupProvisionalDescriptor = vi.fn().mockResolvedValue(undefined);
    const uploadImage = vi.fn(async () => uploaded());
    const objectUrls = {
      create: vi.fn()
        .mockReturnValueOnce("blob:first")
        .mockReturnValueOnce("blob:second"),
      revoke,
    };
    const { result, unmount } = renderHook(() => useMaterialImageUpload({
      endpoint: "/api/component-library/images",
      uploadImage,
      cleanupProvisionalDescriptor,
      objectUrls,
    }));

    await act(async () => {
      await result.current.selectFile(sourceFile("first.png"));
    });
    await act(async () => {
      await result.current.selectFile(sourceFile("second.png"));
    });
    expect(revoke).toHaveBeenCalledWith("blob:first");

    await act(async () => {
      await result.current.startUpload();
    });
    unmount();

    expect(revoke).toHaveBeenCalledWith("blob:second");
    expect(cleanupProvisionalDescriptor).toHaveBeenCalledWith(
      expect.objectContaining({ assetId: "asset-1" }),
    );
  });
});
