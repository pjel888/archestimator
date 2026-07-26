import type { UploadStorageProvider } from "@/lib/uploads/storage-provider";
import {
  assertArtifactVersionPublishable,
  readArtifact,
  readArtifactVersion,
} from "@/lib/project-artifacts/service";
import { createRuntimeUploadStorageProvider } from "@/lib/uploads/runtime-storage-provider";

import {
  createArtifactContentResponse,
  readArtifactUploadLocator,
  type ArtifactUploadLocator,
} from "../../../_download";
import {
  resolveInternalArtifactAccess,
  type InternalArtifactAccess,
} from "../../../_route-core";

export type InternalArtifactContentDependencies = {
  resolveAccess: (projectId: string, mode: "read") => Promise<InternalArtifactAccess | { ok: false; response: Response }>;
  readArtifact: typeof readArtifact;
  readArtifactVersion: typeof readArtifactVersion;
  assertPublishable: typeof assertArtifactVersionPublishable;
  readUploadLocator: (
    database: InternalArtifactAccess["database"],
    input: { uploadAssetId: string; workspaceId: string; projectId: string },
  ) => Promise<ArtifactUploadLocator | null>;
  createStorageProvider: () => Promise<UploadStorageProvider>;
};

const dependencies: InternalArtifactContentDependencies = {
  resolveAccess: resolveInternalArtifactAccess,
  readArtifact,
  readArtifactVersion,
  assertPublishable: assertArtifactVersionPublishable,
  readUploadLocator: readArtifactUploadLocator,
  createStorageProvider: createRuntimeUploadStorageProvider,
};

function unavailable(status = 404) {
  return Response.json(
    { error: "Artifact content is unavailable." },
    {
      status,
      headers: {
        "Cache-Control": "private, no-store, max-age=0, must-revalidate",
        "X-Content-Type-Options": "nosniff",
      },
    },
  );
}

export async function handleInternalArtifactContent(
  request: Request,
  projectId: string,
  artifactVersionId: string,
  routeDependencies: InternalArtifactContentDependencies = dependencies,
) {
  const access = await routeDependencies.resolveAccess(projectId, "read");
  if (!access.ok) return access.response;

  try {
    const version = await routeDependencies.readArtifactVersion({
      database: access.database,
      projectId: access.projectId,
      versionId: artifactVersionId,
      workspaceId: access.workspaceId,
    });
    if (!version || version.contentType !== "application/pdf") return unavailable();
    const artifact = await routeDependencies.readArtifact({
      artifactId: version.artifactId,
      database: access.database,
      projectId: access.projectId,
      workspaceId: access.workspaceId,
    });
    if (!artifact) return unavailable();
    await routeDependencies.assertPublishable({
      contentSha256: version.contentSha256,
      database: access.database,
      projectId: access.projectId,
      uploadAssetId: version.uploadAssetId,
      workspaceId: access.workspaceId,
    });
    const locator = await routeDependencies.readUploadLocator(access.database, {
      uploadAssetId: version.uploadAssetId,
      projectId: access.projectId,
      workspaceId: access.workspaceId,
    });
    if (!locator) return unavailable();
    const storageProvider = await routeDependencies.createStorageProvider();
    return createArtifactContentResponse({
      request,
      ...locator,
      fileName: version.fileName,
      contentType: version.contentType,
      sizeBytes: version.sizeBytes,
      storageProvider,
      download: new URL(request.url).searchParams.get("download") === "1",
    });
  } catch {
    return unavailable();
  }
}
