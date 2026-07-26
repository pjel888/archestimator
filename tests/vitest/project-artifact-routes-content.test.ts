import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";

import {
  handleInternalArtifactContent,
  type InternalArtifactContentDependencies,
} from "@/app/api/projects/[projectId]/artifacts/versions/[artifactVersionId]/content/_route-core";

const PROJECT_ID = "11111111-1111-4111-8111-111111111111";

describe("internal project artifact content route", () => {
  it("authorizes the current user, scan-gates the version, and resolves storage server-side", async () => {
    const dependencies: InternalArtifactContentDependencies = {
      resolveAccess: vi.fn(async () => ({
        ok: true as const,
        database: {} as never,
        projectId: PROJECT_ID,
        workspaceId: "workspace-1",
        actor: { id: "user-1", type: "internal_user" as const },
      })),
      readArtifact: vi.fn(async () => ({ id: "artifact-1", status: "active" })) as never,
      readArtifactVersion: vi.fn(async () => ({
        id: "version-1",
        artifactId: "artifact-1",
        uploadAssetId: "upload-1",
        fileName: "drawing.pdf",
        contentType: "application/pdf",
        contentSha256: "a".repeat(64),
        sizeBytes: 4,
      })) as never,
      assertPublishable: vi.fn(async () => ({ id: "upload-1" })) as never,
      readUploadLocator: vi.fn(async () => ({ bucket: "project-artifacts", path: "private/version-1.pdf" })),
      createStorageProvider: vi.fn(async () => ({
        downloadObject: vi.fn(async () => ({ body: new Uint8Array([1, 2, 3, 4]).buffer, contentType: "application/pdf", sizeBytes: 4 })),
        uploadObject: vi.fn(),
        removeObjects: vi.fn(),
        createSignedReadUrl: vi.fn(),
        getPublicUrl: vi.fn(),
      })),
    };

    const response = await handleInternalArtifactContent(
      new Request(`https://archestimator.test/api/projects/${PROJECT_ID}/artifacts/versions/version-1/content`),
      PROJECT_ID,
      "version-1",
      dependencies,
    );

    expect(response.status).toBe(200);
    expect(dependencies.resolveAccess).toHaveBeenCalledWith(PROJECT_ID, "read");
    expect(dependencies.assertPublishable).toHaveBeenCalledWith(expect.objectContaining({
      projectId: PROJECT_ID,
      uploadAssetId: "upload-1",
    }));
    expect(dependencies.readUploadLocator).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ uploadAssetId: "upload-1" }));
    expect(await response.arrayBuffer()).toEqual(new Uint8Array([1, 2, 3, 4]).buffer);
  });

  it("keeps every project artifact route on Node and private storage paths out of route responses", () => {
    const routes = [
      "src/app/api/projects/[projectId]/artifacts/route.ts",
      "src/app/api/projects/[projectId]/artifacts/[artifactId]/versions/route.ts",
      "src/app/api/projects/[projectId]/artifacts/[artifactId]/archive/route.ts",
      "src/app/api/projects/[projectId]/artifacts/versions/[artifactVersionId]/content/route.ts",
      "src/app/api/share/[token]/artifacts/[publicArtifactId]/route.ts",
      "src/app/api/share/[token]/requests/evidence/route.ts",
    ];

    for (const route of routes) {
      const source = readFileSync(route, "utf8");
      expect(source).toContain('export const runtime = "nodejs"');
      expect(source).toContain('export const dynamic = "force-dynamic"');
      expect(source).not.toContain("storage_path");
      expect(source).not.toContain("ARCH_UPLOADS_R2");
    }
  });
});
