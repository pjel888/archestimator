import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  handleProjectArtifactUpload,
  type ProjectArtifactUploadDependencies,
} from "@/app/api/projects/[projectId]/artifacts/_upload";
import { resetUploadAdmissionStateForTests } from "@/lib/uploads/admission-control";

const projectId = "00000000-0000-4000-8000-000000000001";
const workspaceId = "00000000-0000-4000-8000-000000000002";
const userId = "00000000-0000-4000-8000-000000000003";

function pdfFile() {
  return new File([new TextEncoder().encode("%PDF-1.7\n%%EOF")], "drawing.pdf", { type: "application/pdf" });
}

function requestFor(file: File) {
  const body = new FormData();
  body.set("file", file);
  return {
    formData: async () => body,
    headers: new Headers({ origin: "https://archestimator.test" }),
    url: "https://archestimator.test/api/projects/project-1/artifacts/uploads",
  } as Request;
}

function dependencies(): ProjectArtifactUploadDependencies {
  return {
    assertSameOrigin: vi.fn(() => ({ ok: true as const })),
    resolveAccess: vi.fn(async () => ({
      actor: { id: userId, type: "internal_user" as const },
      database: {} as never,
      ok: true as const,
      projectId,
      workspaceId,
    })),
    readFormData: vi.fn(async (request) => ({
      ok: true as const,
      value: await request.formData(),
    })),
    createStorageProvider: vi.fn(async () => ({
      downloadObject: vi.fn(),
      removeObjects: vi.fn(async () => undefined),
      uploadObject: vi.fn(async () => undefined),
    })),
    reserveUpload: vi.fn(async () => ({
      assetId: "asset-1",
      bucket: "project-artifacts",
      path: "workspace/project-artifacts/drawing.pdf",
      scanStatus: "pending",
      uploadSessionId: "session-1",
    }) as never),
    finalizeUpload: vi.fn(async () => ({ assetId: "asset-1", scanStatus: "pending" as const, uploadSessionId: "session-1" })),
    failUpload: vi.fn(async () => undefined),
  };
}

describe("project artifact upload route", () => {
  beforeEach(() => resetUploadAdmissionStateForTests());

  it("stores a project-scoped PDF and returns its checksum and pending scan state", async () => {
    const routeDependencies = dependencies();
    const response = await handleProjectArtifactUpload(requestFor(pdfFile()), projectId, routeDependencies);
    const payload = await response.json() as Record<string, unknown>;

    expect(response.status).toBe(201);
    expect(payload).toMatchObject({ assetId: "asset-1", fileName: "drawing.pdf", scanStatus: "pending" });
    expect(payload.checksumSha256).toMatch(/^[a-f0-9]{64}$/);
    expect(routeDependencies.readFormData).toHaveBeenCalledWith(expect.anything(), 26 * 1024 * 1024);
    expect(routeDependencies.reserveUpload).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({
      surface: "project-artifact",
      targetEntityId: projectId,
      targetEntityType: "project",
      workspaceId,
    }));
    expect(routeDependencies.finalizeUpload).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ uploadSessionId: "session-1" }),
    );
  });

  it("rejects a non-PDF before opening storage", async () => {
    const routeDependencies = dependencies();
    const file = new File(["not a pdf"], "notes.txt", { type: "text/plain" });
    const response = await handleProjectArtifactUpload(requestFor(file), projectId, routeDependencies);

    expect(response.status).toBe(400);
    expect(routeDependencies.createStorageProvider).not.toHaveBeenCalled();
    expect(routeDependencies.reserveUpload).not.toHaveBeenCalled();
  });

  it("rejects cross-origin uploads before authorization or body parsing", async () => {
    const routeDependencies = dependencies();
    routeDependencies.assertSameOrigin = vi.fn(() => ({
      ok: false as const,
      status: 403 as const,
      message: "Cross-origin uploads are blocked.",
    }));
    routeDependencies.readFormData = vi.fn();

    const response = await handleProjectArtifactUpload(requestFor(pdfFile()), projectId, routeDependencies);

    expect(response.status).toBe(403);
    expect(routeDependencies.resolveAccess).not.toHaveBeenCalled();
    expect(routeDependencies.readFormData).not.toHaveBeenCalled();
  });

  it("rejects an oversized multipart body before reservation or storage", async () => {
    const routeDependencies = dependencies();
    routeDependencies.readFormData = vi.fn(async () => ({
      ok: false as const,
      status: 413 as const,
      error: "Request body is too large.",
    }));

    const response = await handleProjectArtifactUpload(requestFor(pdfFile()), projectId, routeDependencies);

    expect(response.status).toBe(413);
    expect(routeDependencies.reserveUpload).not.toHaveBeenCalled();
    expect(routeDependencies.createStorageProvider).not.toHaveBeenCalled();
  });

  it("durably reserves before opening R2 storage", async () => {
    const order: string[] = [];
    const routeDependencies = dependencies();
    routeDependencies.reserveUpload = vi.fn(async () => {
      order.push("reserve");
      return {
        assetId: "asset-1",
        bucket: "project-artifacts",
        path: "workspace/project-artifacts/drawing.pdf",
        scanStatus: "pending",
        uploadSessionId: "session-1",
      } as never;
    });
    routeDependencies.createStorageProvider = vi.fn(async () => {
      order.push("storage");
      return {
        downloadObject: vi.fn(),
        removeObjects: vi.fn(async () => undefined),
        uploadObject: vi.fn(async () => { order.push("upload"); }),
      };
    });
    routeDependencies.finalizeUpload = vi.fn(async () => {
      order.push("finalize");
      return { assetId: "asset-1", scanStatus: "pending", uploadSessionId: "session-1" };
    });

    const response = await handleProjectArtifactUpload(requestFor(pdfFile()), projectId, routeDependencies);

    expect(response.status).toBe(201);
    expect(order).toEqual(["reserve", "storage", "upload", "finalize"]);
  });

  it("retries a transient D1 finalization failure without rewriting or deleting R2", async () => {
    const removeObjects = vi.fn(async () => undefined);
    const routeDependencies = dependencies();
    routeDependencies.createStorageProvider = vi.fn(async () => ({
      downloadObject: vi.fn(),
      removeObjects,
      uploadObject: vi.fn(async () => undefined),
    }));
    routeDependencies.finalizeUpload = vi.fn()
      .mockRejectedValueOnce(new Error("D1 unavailable"))
      .mockResolvedValueOnce({ assetId: "asset-1", scanStatus: "pending", uploadSessionId: "session-1" });

    const response = await handleProjectArtifactUpload(requestFor(pdfFile()), projectId, routeDependencies);

    expect(response.status).toBe(201);
    expect(routeDependencies.finalizeUpload).toHaveBeenCalledTimes(2);
    expect(removeObjects).not.toHaveBeenCalled();
    expect(routeDependencies.failUpload).not.toHaveBeenCalled();
  });

  it("preserves R2 bytes and the reserved lifecycle when D1 finalization stays unavailable", async () => {
    const removeObjects = vi.fn(async () => undefined);
    const routeDependencies = dependencies();
    routeDependencies.createStorageProvider = vi.fn(async () => ({
      downloadObject: vi.fn(),
      removeObjects,
      uploadObject: vi.fn(async () => undefined),
    }));
    routeDependencies.finalizeUpload = vi.fn(async () => {
      throw new Error("finalize failed");
    });

    const response = await handleProjectArtifactUpload(requestFor(pdfFile()), projectId, routeDependencies);

    expect(response.status).toBe(503);
    expect(routeDependencies.finalizeUpload).toHaveBeenCalledTimes(2);
    expect(removeObjects).not.toHaveBeenCalled();
    expect(routeDependencies.failUpload).not.toHaveBeenCalled();
  });

  it("removes possible partial bytes and fails the reservation when storage fails", async () => {
    const removeObjects = vi.fn(async () => undefined);
    const routeDependencies = dependencies();
    routeDependencies.createStorageProvider = vi.fn(async () => ({
      downloadObject: vi.fn(),
      removeObjects,
      uploadObject: vi.fn(async () => { throw new Error("R2 unavailable"); }),
    }));

    const response = await handleProjectArtifactUpload(requestFor(pdfFile()), projectId, routeDependencies);

    expect(response.status).toBe(500);
    expect(removeObjects).toHaveBeenCalledWith("project-artifacts", [
      "workspace/project-artifacts/drawing.pdf",
    ]);
    expect(routeDependencies.failUpload).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ uploadSessionId: "session-1" }),
      "storage",
    );
  });
});
