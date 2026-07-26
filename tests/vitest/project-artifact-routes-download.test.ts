import { describe, expect, it, vi } from "vitest";

import {
  createArtifactContentResponse,
  parseSingleByteRange,
} from "@/app/api/projects/[projectId]/artifacts/_download";

describe("project artifact route downloads", () => {
  it("parses and caps one byte range while rejecting multipart ranges", () => {
    expect(parseSingleByteRange("bytes=10-99", 1_000, 32)).toEqual({ offset: 10, length: 32 });
    expect(parseSingleByteRange("bytes=-25", 1_000, 32)).toEqual({ offset: 975, length: 25 });
    expect(parseSingleByteRange("bytes=0-1,4-5", 1_000, 32)).toBeNull();
    expect(parseSingleByteRange("bytes=1000-", 1_000, 32)).toBeNull();
  });

  it("uses the storage provider range API and returns private 206 headers", async () => {
    const downloadObjectRange = vi.fn(async () => ({
      body: new Uint8Array([1, 2, 3, 4]).buffer,
      contentType: "application/pdf",
      offset: 10,
      length: 4,
      totalSizeBytes: 100,
      etag: "artifact-etag",
    }));
    const response = await createArtifactContentResponse({
      request: new Request("https://archestimator.test/content", { headers: { Range: "bytes=10-13" } }),
      bucket: "project-artifacts",
      path: "workspace/project/version.pdf",
      fileName: "Issued drawing.pdf",
      contentType: "application/pdf",
      sizeBytes: 100,
      storageProvider: {
        downloadObject: vi.fn(),
        downloadObjectRange,
        uploadObject: vi.fn(),
        removeObjects: vi.fn(),
        createSignedReadUrl: vi.fn(),
        getPublicUrl: vi.fn(),
      },
    });

    expect(response.status).toBe(206);
    expect(response.headers.get("accept-ranges")).toBe("bytes");
    expect(response.headers.get("content-range")).toBe("bytes 10-13/100");
    expect(response.headers.get("content-length")).toBe("4");
    expect(response.headers.get("cache-control")).toContain("private");
    expect(response.headers.get("cache-control")).toContain("no-store");
    expect(response.headers.get("content-disposition")).toContain("inline");
    expect(downloadObjectRange).toHaveBeenCalledWith("project-artifacts", "workspace/project/version.pdf", {
      offset: 10,
      length: 4,
    });
  });

  it("returns 416 without touching storage for an invalid range", async () => {
    const downloadObject = vi.fn();
    const response = await createArtifactContentResponse({
      request: new Request("https://archestimator.test/content", { headers: { Range: "bytes=100-" } }),
      bucket: "project-artifacts",
      path: "workspace/project/version.pdf",
      fileName: "Drawing.pdf",
      contentType: "application/pdf",
      sizeBytes: 100,
      storageProvider: {
        downloadObject,
        uploadObject: vi.fn(),
        removeObjects: vi.fn(),
        createSignedReadUrl: vi.fn(),
        getPublicUrl: vi.fn(),
      },
    });

    expect(response.status).toBe(416);
    expect(response.headers.get("content-range")).toBe("bytes */100");
    expect(downloadObject).not.toHaveBeenCalled();
  });

  it("fails closed without downloading the full object when range support is unavailable", async () => {
    const downloadObject = vi.fn();
    const response = await createArtifactContentResponse({
      request: new Request("https://archestimator.test/content", { headers: { Range: "bytes=0-3" } }),
      bucket: "project-artifacts",
      path: "workspace/project/version.pdf",
      fileName: "Drawing.pdf",
      contentType: "application/pdf",
      sizeBytes: 100,
      storageProvider: {
        downloadObject,
        uploadObject: vi.fn(),
        removeObjects: vi.fn(),
        createSignedReadUrl: vi.fn(),
        getPublicUrl: vi.fn(),
      },
    });

    expect(response.status).toBe(503);
    expect(response.headers.get("accept-ranges")).toBe("bytes");
    expect(downloadObject).not.toHaveBeenCalled();
  });
});
