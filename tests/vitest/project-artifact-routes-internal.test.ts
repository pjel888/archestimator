import { describe, expect, it, vi } from "vitest";

import {
  handleArchiveArtifact,
  handleCreateArtifact,
  handleListArtifacts,
  handleVersionArtifact,
  type InternalArtifactRouteDependencies,
} from "@/app/api/projects/[projectId]/artifacts/_route-core";

const PROJECT_ID = "11111111-1111-4111-8111-111111111111";
const WORKSPACE_ID = "22222222-2222-4222-8222-222222222222";
const USER_ID = "33333333-3333-4333-8333-333333333333";

function dependencies(overrides: Partial<InternalArtifactRouteDependencies> = {}): InternalArtifactRouteDependencies {
  return {
    resolveAccess: vi.fn(async () => ({
      ok: true as const,
      database: {} as never,
      projectId: PROJECT_ID,
      workspaceId: WORKSPACE_ID,
      actor: { id: USER_ID, type: "internal_user" as const },
    })),
    listProjectArtifacts: vi.fn(async () => []),
    createArtifact: vi.fn(async () => ({ artifact: { id: "artifact-1" }, replayed: false })) as never,
    addArtifactVersion: vi.fn(async () => ({ artifact: { id: "artifact-1" }, version: { id: "version-2" }, replayed: false })) as never,
    archiveArtifact: vi.fn(async () => ({ id: "artifact-1", status: "archived" })) as never,
    ...overrides,
  };
}

describe("internal project artifact routes", () => {
  it("lists only after current-user project read authorization", async () => {
    const listProjectArtifacts = vi.fn(async () => [{ id: "artifact-1" }]);
    const deps = dependencies({ listProjectArtifacts: listProjectArtifacts as never });
    const response = await handleListArtifacts(
      new Request(`https://archestimator.test/api/projects/${PROJECT_ID}/artifacts?includeArchived=true&limit=25`),
      PROJECT_ID,
      deps,
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ artifacts: [{ id: "artifact-1" }] });
    expect(deps.resolveAccess).toHaveBeenCalledWith(PROJECT_ID, "read");
    expect(listProjectArtifacts).toHaveBeenCalledWith(expect.objectContaining({
      includeArchived: true,
      limit: 25,
      projectId: PROJECT_ID,
      workspaceId: WORKSPACE_ID,
    }));
    expect(response.headers.get("cache-control")).toContain("private");
    expect(response.headers.get("cache-control")).toContain("no-store");
  });

  it("creates, versions, and archives only through write authorization", async () => {
    const createArtifact = vi.fn(async () => ({ artifact: { id: "artifact-1" }, replayed: false }));
    const addArtifactVersion = vi.fn(async () => ({ artifact: { id: "artifact-1" }, version: { id: "version-2" }, replayed: false }));
    const archiveArtifact = vi.fn(async () => ({ id: "artifact-1", status: "archived" }));
    const deps = dependencies({
      createArtifact: createArtifact as never,
      addArtifactVersion: addArtifactVersion as never,
      archiveArtifact: archiveArtifact as never,
    });

    const createResponse = await handleCreateArtifact(new Request("https://archestimator.test", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        artifactId: "artifact-1",
        versionId: "version-1",
        artifactType: "drawing",
        title: "Issued drawing",
        uploadAssetId: "upload-1",
        contentSha256: "a".repeat(64),
      }),
    }), PROJECT_ID, deps);
    const versionResponse = await handleVersionArtifact(new Request("https://archestimator.test", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        versionId: "version-2",
        uploadAssetId: "upload-2",
        contentSha256: "b".repeat(64),
        expectedCurrentVersionId: "version-1",
      }),
    }), PROJECT_ID, "artifact-1", deps);
    const archiveResponse = await handleArchiveArtifact(
      new Request("https://archestimator.test", { method: "POST" }),
      PROJECT_ID,
      "artifact-1",
      deps,
    );

    expect(createResponse.status).toBe(201);
    expect(versionResponse.status).toBe(201);
    expect(archiveResponse.status).toBe(200);
    expect(deps.resolveAccess).toHaveBeenCalledTimes(3);
    expect(deps.resolveAccess).toHaveBeenNthCalledWith(1, PROJECT_ID, "write");
    expect(deps.resolveAccess).toHaveBeenNthCalledWith(2, PROJECT_ID, "write");
    expect(deps.resolveAccess).toHaveBeenNthCalledWith(3, PROJECT_ID, "write");
    expect(createArtifact).toHaveBeenCalledWith(expect.objectContaining({
      actor: { id: USER_ID, type: "internal_user" },
      projectId: PROJECT_ID,
      workspaceId: WORKSPACE_ID,
    }));
    expect(addArtifactVersion).toHaveBeenCalledWith(expect.objectContaining({ artifactId: "artifact-1" }));
    expect(archiveArtifact).toHaveBeenCalledWith(expect.objectContaining({ artifactId: "artifact-1" }));
  });

  it("does not invoke services when authorization fails", async () => {
    const denied = new Response(JSON.stringify({ error: "Project artifact access denied." }), { status: 403 });
    const deps = dependencies({ resolveAccess: vi.fn(async () => ({ ok: false as const, response: denied })) });
    const response = await handleListArtifacts(new Request("https://archestimator.test"), PROJECT_ID, deps);

    expect(response.status).toBe(403);
    expect(deps.listProjectArtifacts).not.toHaveBeenCalled();
  });
});
