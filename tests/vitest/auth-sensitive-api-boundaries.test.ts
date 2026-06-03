import { readFileSync } from "node:fs";
import { join } from "node:path";

import { beforeEach, describe, expect, it, vi } from "vitest";

const authMocks = vi.hoisted(() => ({
  requireCurrentUserContext: vi.fn(),
}));

const workspaceMocks = vi.hoisted(() => ({
  ensureDefaultWorkspace: vi.fn(),
}));

const supabaseServerMocks = vi.hoisted(() => ({
  createSupabaseServerClient: vi.fn(),
}));

const supabaseJsMocks = vi.hoisted(() => ({
  createClient: vi.fn(),
}));

vi.mock("@/lib/auth/session", () => authMocks);
vi.mock("@/lib/repositories/workspace-repository", () => workspaceMocks);
vi.mock("@/lib/supabase/server", () => supabaseServerMocks);
vi.mock("@supabase/supabase-js", () => supabaseJsMocks);

function read(relativePath: string) {
  return readFileSync(join(process.cwd(), relativePath), "utf8");
}

function expectAuthBeforeBodyParsing(source: string) {
  const authIndex = source.indexOf("requireCurrentUserContext()");
  const bodyIndex = source.indexOf("request.formData()");

  expect(authIndex).toBeGreaterThanOrEqual(0);
  expect(bodyIndex).toBeGreaterThanOrEqual(0);
  expect(authIndex).toBeLessThan(bodyIndex);
}

function mockCurrentWorkspace() {
  workspaceMocks.ensureDefaultWorkspace.mockResolvedValue({
    workspace: { id: "workspace-1" },
  });
  authMocks.requireCurrentUserContext.mockResolvedValue({
    userId: "user-1",
  });
}

function createJsonRequest(body: unknown) {
  return new Request("http://localhost/api/storage-test", {
    method: "DELETE",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

function createFormRequest(formData: FormData) {
  return {
    headers: new Headers(),
    formData: vi.fn(async () => formData),
  } as unknown as Request;
}

function createUnparsedFormRequest() {
  return {
    headers: new Headers(),
    formData: vi.fn(async () => new FormData()),
  } as unknown as Request & { formData: ReturnType<typeof vi.fn> };
}

function mockStorageClient() {
  const remove = vi.fn(async () => ({ error: null }));
  const upload = vi.fn(async () => ({ error: null }));
  const download = vi.fn(async () => ({ data: new Blob(["image"], { type: "image/webp" }), error: null }));
  const getPublicUrl = vi.fn(() => ({ data: { publicUrl: "https://cdn.example/file" } }));
  const from = vi.fn(() => ({ remove, upload, download, getPublicUrl }));
  const client = { storage: { from } };
  supabaseJsMocks.createClient.mockReturnValue(client);
  return { client, from, remove, upload, download, getPublicUrl };
}

function mockProjectLookup(data: { id: string; workspace_id: string } | null = null) {
  const maybeSingle = vi.fn(async () => ({ data, error: data ? null : { message: "not found" } }));
  const single = vi.fn(async () => ({ data, error: data ? null : { message: "not found" } }));
  const query = {
    select: vi.fn(() => query),
    eq: vi.fn(() => query),
    maybeSingle,
    single,
  };
  const from = vi.fn(() => query);
  supabaseServerMocks.createSupabaseServerClient.mockResolvedValue({ from });
  return { from, maybeSingle, single };
}

beforeEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
  vi.unstubAllEnvs();
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://example.supabase.co");
  vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "service-role");
  mockCurrentWorkspace();
});

describe("sensitive API auth boundaries", () => {
  it("keeps component image uploads workspace/user scoped", () => {
    const source = read("src/app/api/component-library/images/route.ts");

    expectAuthBeforeBodyParsing(source);
    expect(source).toContain("ensureDefaultWorkspace()");
    expect(source).toContain("isOwnedUploadPath");
    expect(source).toContain('path.startsWith(`${workspaceId}/${userId}/`)');
    expect(source).toContain('!path.includes("..")');
    expect(source).toContain("persistSession: false");
  });

  it("keeps component attachment uploads workspace/user scoped", () => {
    const source = read("src/app/api/component-library/attachments/route.ts");

    expectAuthBeforeBodyParsing(source);
    expect(source).toContain("ensureDefaultWorkspace()");
    expect(source).toContain("isOwnedAttachmentPath");
    expect(source).toContain('path.startsWith(`${workspaceId}/${userId}/`)');
    expect(source).toContain('!path.includes("..")');
    expect(source).toContain("persistSession: false");
  });

  it("keeps project image uploads scoped to a project in the current workspace", () => {
    const source = read("src/app/api/projects/images/route.ts");

    expectAuthBeforeBodyParsing(source);
    expect(source).toContain("ensureDefaultWorkspace()");
    expect(source).toContain('.eq("workspace_id", workspace.id)');
    expect(source).toContain("isOwnedUploadPath");
    expect(source).toContain("parseProjectImageStoragePath(path)");
    expect(source).toContain("parsed.workspaceId === workspaceId");
    expect(source).toContain("parsed.ownerUserId === userId");
  });

  it("keeps proposal export behind the current workspace repository boundary", () => {
    const source = read(
      "src/app/api/projects/[projectId]/estimates/[estimateId]/export/proposal.xlsx/route.ts",
    );

    expect(source).toContain("getProjectEstimateTreeByEstimate(projectId, estimateId,");
    expect(source).toContain('Cache-Control": "private, no-store"');
    expect(source).toContain('status: 404');
  });

  it("rejects component image uploads before parsing bodies when auth fails", async () => {
    authMocks.requireCurrentUserContext.mockRejectedValue(new Error("NEXT_REDIRECT:/login"));
    const request = createUnparsedFormRequest();
    const { POST } = await import("@/app/api/component-library/images/route");

    await expect(POST(request)).rejects.toThrow("NEXT_REDIRECT:/login");

    expect(request.formData).not.toHaveBeenCalled();
  });

  it("rejects component attachment uploads before parsing bodies when auth fails", async () => {
    authMocks.requireCurrentUserContext.mockRejectedValue(new Error("NEXT_REDIRECT:/login"));
    const request = createUnparsedFormRequest();
    const { POST } = await import("@/app/api/component-library/attachments/route");

    await expect(POST(request)).rejects.toThrow("NEXT_REDIRECT:/login");

    expect(request.formData).not.toHaveBeenCalled();
  });

  it("rejects project image uploads before parsing bodies when auth fails", async () => {
    authMocks.requireCurrentUserContext.mockRejectedValue(new Error("NEXT_REDIRECT:/login"));
    const request = createUnparsedFormRequest();
    const { POST } = await import("@/app/api/projects/images/route");

    await expect(POST(request)).rejects.toThrow("NEXT_REDIRECT:/login");

    expect(request.formData).not.toHaveBeenCalled();
  });

  it("removes only owned component image paths", async () => {
    const storage = mockStorageClient();
    const { DELETE } = await import("@/app/api/component-library/images/route");

    const response = await DELETE(createJsonRequest({
      paths: [
        "workspace-1/user-1/component.webp",
        "workspace-1/user-1/component-thumb.webp",
        "workspace-2/user-1/other.webp",
        "workspace-1/user-2/other.webp",
        "workspace-1/user-1/../escape.webp",
        "workspace-1/user-1//double.webp",
        "workspace-1/user-1/not-webp.png",
      ],
    }));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      removedPaths: [
        "workspace-1/user-1/component.webp",
        "workspace-1/user-1/component-thumb.webp",
      ],
    });
    expect(storage.from).toHaveBeenCalledWith("component-images");
    expect(storage.remove).toHaveBeenCalledWith([
      "workspace-1/user-1/component.webp",
      "workspace-1/user-1/component-thumb.webp",
    ]);
  });

  it("rejects component image delete requests with no owned paths before storage writes", async () => {
    const storage = mockStorageClient();
    const { DELETE } = await import("@/app/api/component-library/images/route");

    const response = await DELETE(createJsonRequest({
      paths: [
        "workspace-2/user-1/other.webp",
        "workspace-1/user-2/other.webp",
        "workspace-1/user-1/../escape.webp",
      ],
    }));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: "No removable image paths were provided.",
    });
    expect(storage.from).not.toHaveBeenCalled();
    expect(storage.remove).not.toHaveBeenCalled();
  });

  it("removes only owned component attachment paths", async () => {
    const storage = mockStorageClient();
    const { DELETE } = await import("@/app/api/component-library/attachments/route");

    const response = await DELETE(createJsonRequest({
      paths: [
        "workspace-1/user-1/spec.pdf",
        "workspace-1/user-1/schedule.xlsx",
        "workspace-2/user-1/spec.pdf",
        "workspace-1/user-2/spec.pdf",
        "workspace-1/user-1/../escape.pdf",
        "workspace-1/user-1//double.pdf",
        "workspace-1/user-1/image.webp",
      ],
    }));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      removedPaths: [
        "workspace-1/user-1/spec.pdf",
        "workspace-1/user-1/schedule.xlsx",
      ],
    });
    expect(storage.from).toHaveBeenCalledWith("component-attachments");
    expect(storage.remove).toHaveBeenCalledWith([
      "workspace-1/user-1/spec.pdf",
      "workspace-1/user-1/schedule.xlsx",
    ]);
  });

  it("rejects component attachment delete requests with no owned paths before storage writes", async () => {
    const storage = mockStorageClient();
    const { DELETE } = await import("@/app/api/component-library/attachments/route");

    const response = await DELETE(createJsonRequest({
      paths: [
        "workspace-2/user-1/spec.pdf",
        "workspace-1/user-2/spec.pdf",
        "workspace-1/user-1/../escape.pdf",
      ],
    }));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: "No removable attachment paths were provided.",
    });
    expect(storage.from).not.toHaveBeenCalled();
    expect(storage.remove).not.toHaveBeenCalled();
  });

  it("removes only owned project image paths", async () => {
    const workspaceId = "11111111-1111-4111-8111-111111111111";
    const userId = "22222222-2222-4222-8222-222222222222";
    const projectId = "33333333-3333-4333-8333-333333333333";
    workspaceMocks.ensureDefaultWorkspace.mockResolvedValue({ workspace: { id: workspaceId } });
    authMocks.requireCurrentUserContext.mockResolvedValue({ userId });
    const storage = mockStorageClient();
    const { DELETE } = await import("@/app/api/projects/images/route");

    const response = await DELETE(createJsonRequest({
      paths: [
        `${workspaceId}/${userId}/project-images/${projectId}/image.webp`,
        `${workspaceId}/${userId}/project-images/${projectId}/image-thumb.webp`,
        `${workspaceId}/${userId}/component.webp`,
        `44444444-4444-4444-8444-444444444444/${userId}/project-images/${projectId}/image.webp`,
        `${workspaceId}/55555555-5555-4555-8555-555555555555/project-images/${projectId}/image.webp`,
        `${workspaceId}/${userId}/project-images/${projectId}/../escape.webp`,
      ],
    }));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      removedPaths: [
        `${workspaceId}/${userId}/project-images/${projectId}/image.webp`,
        `${workspaceId}/${userId}/project-images/${projectId}/image-thumb.webp`,
      ],
    });
    expect(storage.from).toHaveBeenCalledWith("project-images");
    expect(storage.remove).toHaveBeenCalledWith([
      `${workspaceId}/${userId}/project-images/${projectId}/image.webp`,
      `${workspaceId}/${userId}/project-images/${projectId}/image-thumb.webp`,
    ]);
  });

  it("serves private project images only after authenticated project access resolves", async () => {
    const workspaceId = "11111111-1111-4111-8111-111111111111";
    const ownerUserId = "22222222-2222-4222-8222-222222222222";
    const projectId = "33333333-3333-4333-8333-333333333333";
    const path = `${workspaceId}/${ownerUserId}/project-images/${projectId}/image.webp`;
    const storage = mockStorageClient();
    const projectLookup = mockProjectLookup({ id: projectId, workspace_id: workspaceId });
    const { GET } = await import("@/app/api/projects/images/route");

    const response = await GET(new Request(`http://localhost/api/projects/images?path=${encodeURIComponent(path)}`));

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("image/webp");
    expect(projectLookup.from).toHaveBeenCalledWith("projects");
    expect(projectLookup.maybeSingle).toHaveBeenCalled();
    expect(storage.from).toHaveBeenCalledWith("project-images");
    expect(storage.download).toHaveBeenCalledWith(path);
  });

  it("rejects project image uploads for projects outside the current workspace before storage writes", async () => {
    const storage = mockStorageClient();
    const projectLookup = mockProjectLookup();
    const formData = new FormData();
    formData.set("projectId", "project-2");
    formData.set("file", new window.File(["not decoded"], "project.png", { type: "image/png" }));
    const { POST } = await import("@/app/api/projects/images/route");

    const response = await POST(createFormRequest(formData));

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({
      error: "Project could not be found.",
    });
    expect(projectLookup.from).toHaveBeenCalledWith("projects");
    expect(projectLookup.single).toHaveBeenCalled();
    expect(storage.from).not.toHaveBeenCalled();
    expect(storage.upload).not.toHaveBeenCalled();
  });
});
