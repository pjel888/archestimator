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
  const getPublicUrl = vi.fn(() => ({ data: { publicUrl: "https://cdn.example/file" } }));
  const from = vi.fn(() => ({ remove, upload, getPublicUrl }));
  const client = { storage: { from } };
  supabaseJsMocks.createClient.mockReturnValue(client);
  return { client, from, remove, upload, getPublicUrl };
}

function mockMissingProjectLookup() {
  const single = vi.fn(async () => ({ data: null, error: { message: "not found" } }));
  const query = {
    select: vi.fn(() => query),
    eq: vi.fn(() => query),
    single,
  };
  const from = vi.fn(() => query);
  supabaseServerMocks.createSupabaseServerClient.mockResolvedValue({ from });
  return { from, single };
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
    expect(source).toContain('path.startsWith(`${workspaceId}/${userId}/project-images/`)');
  });

  it("keeps proposal export behind the current workspace repository boundary", () => {
    const source = read(
      "src/app/api/projects/[projectId]/estimates/[estimateId]/export/proposal.xlsx/route.ts",
    );

    expect(source).toContain("getProjectEstimateTreeByEstimate(projectId, estimateId)");
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
    const storage = mockStorageClient();
    const { DELETE } = await import("@/app/api/projects/images/route");

    const response = await DELETE(createJsonRequest({
      paths: [
        "workspace-1/user-1/project-images/project-1/image.webp",
        "workspace-1/user-1/project-images/project-1/image-thumb.webp",
        "workspace-1/user-1/component.webp",
        "workspace-2/user-1/project-images/project-1/image.webp",
        "workspace-1/user-2/project-images/project-1/image.webp",
        "workspace-1/user-1/project-images/project-1/../escape.webp",
      ],
    }));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      removedPaths: [
        "workspace-1/user-1/project-images/project-1/image.webp",
        "workspace-1/user-1/project-images/project-1/image-thumb.webp",
      ],
    });
    expect(storage.from).toHaveBeenCalledWith("component-images");
    expect(storage.remove).toHaveBeenCalledWith([
      "workspace-1/user-1/project-images/project-1/image.webp",
      "workspace-1/user-1/project-images/project-1/image-thumb.webp",
    ]);
  });

  it("rejects project image uploads for projects outside the current workspace before storage writes", async () => {
    const storage = mockStorageClient();
    const projectLookup = mockMissingProjectLookup();
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
