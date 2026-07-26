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
    headers: new Headers(),
  } as Request;
}

function dependencies(): ProjectArtifactUploadDependencies {
  return {
    resolveAccess: vi.fn(async () => ({
      actor: { id: userId, type: "internal_user" as const },
      database: {} as never,
      ok: true as const,
      projectId,
      workspaceId,
    })),
    createStorageProvider: vi.fn(async () => ({
      downloadObject: vi.fn(),
      removeObjects: vi.fn(async () => undefined),
      uploadObject: vi.fn(async () => undefined),
    })),
    recordUpload: vi.fn(async () => ({ assetId: "asset-1", scanStatus: "pending" as const, uploadSessionId: "session-1" })),
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
    expect(routeDependencies.recordUpload).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({
      surface: "project-artifact",
      targetEntityId: projectId,
      targetEntityType: "project",
      workspaceId,
    }));
  });

  it("rejects a non-PDF before opening storage", async () => {
    const routeDependencies = dependencies();
    const file = new File(["not a pdf"], "notes.txt", { type: "text/plain" });
    const response = await handleProjectArtifactUpload(requestFor(file), projectId, routeDependencies);

    expect(response.status).toBe(400);
    expect(routeDependencies.createStorageProvider).not.toHaveBeenCalled();
    expect(routeDependencies.recordUpload).not.toHaveBeenCalled();
  });
});
