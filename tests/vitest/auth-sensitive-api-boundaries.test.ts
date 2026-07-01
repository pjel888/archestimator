import { readFileSync } from "node:fs";
import { join } from "node:path";

import { beforeEach, describe, expect, it, vi } from "vitest";

const authMocks = vi.hoisted(() => ({
  getCurrentUserContext: vi.fn(),
  requireCurrentUserContext: vi.fn(),
}));

const workspaceMocks = vi.hoisted(() => ({
  ensureDefaultWorkspace: vi.fn(),
}));

const legalTermsMocks = vi.hoisted(() => ({
  getCurrentUserTermsAcceptanceStatus: vi.fn(),
}));

const supabaseServerMocks = vi.hoisted(() => ({
  createSupabaseServerClient: vi.fn(),
}));

const supabaseJsMocks = vi.hoisted(() => ({
  createClient: vi.fn(),
}));

const cloudflareMocks = vi.hoisted(() => ({
  getCloudflareContext: vi.fn(),
}));

const d1Mocks = vi.hoisted(() => ({
  getCloudflareD1Database: vi.fn(),
}));

vi.mock("@/lib/auth/session", () => authMocks);
vi.mock("@/lib/legal/terms-acceptance", () => legalTermsMocks);
vi.mock("@/lib/repositories/workspace-repository", () => workspaceMocks);
vi.mock("@/lib/supabase/server", () => supabaseServerMocks);
vi.mock("@supabase/supabase-js", () => supabaseJsMocks);
vi.mock("@opennextjs/cloudflare", () => cloudflareMocks);
vi.mock("@/lib/cloudflare/d1", () => d1Mocks);

const DEFAULT_WORKSPACE_ID = "workspace-1";
const DEFAULT_USER_ID = "user-1";
const PNG_1X1 = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII=",
  "base64",
);

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
    workspace: { id: DEFAULT_WORKSPACE_ID },
  });
  authMocks.requireCurrentUserContext.mockResolvedValue({
    userId: DEFAULT_USER_ID,
  });
  authMocks.getCurrentUserContext.mockResolvedValue({
    userId: DEFAULT_USER_ID,
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

function createPngFile(name = "reference.png") {
  return new File([PNG_1X1], name, { type: "image/png" });
}

function createUnparsedFormRequest() {
  return {
    headers: new Headers(),
    formData: vi.fn(async () => new FormData()),
  } as unknown as Request & { formData: ReturnType<typeof vi.fn> };
}

class FakeD1Statement {
  values: unknown[] = [];

  constructor(
    private readonly database: FakeD1Database,
    readonly sql: string,
  ) {}

  bind(...values: unknown[]) {
    this.values = values;
    return this;
  }

  async first() {
    return this.database.first(this.sql, this.values);
  }

  async all() {
    return this.database.all(this.sql, this.values);
  }

  async run() {
    if (this.database.failNextRun) {
      const error = this.database.failNextRun;
      this.database.failNextRun = null;
      throw error;
    }
    this.database.runStatements.push({ sql: this.sql, values: this.values });
    return { success: true, meta: { changes: 1 } };
  }
}

class FakeD1Database {
  failNextRun: Error | null = null;
  projectLookupRow: { id: string; workspace_id: string } | null = null;
  estimateLookupRow: { id: string; project_id?: string } | null = null;
  estimateRowLookupRow: { id: string; estimate_id: string } | null = null;
  attachmentRows: Array<Record<string, unknown>> = [];
  attachmentLookupRow: Record<string, unknown> | null = null;
  attachmentLookupError: Error | null = null;
  uploadAssetLookupRow: Record<string, unknown> | null = null;
  uploadAssetLookupError: Error | null = null;
  access = {
    canAccessProject: true,
    canAccessEstimate: true,
    canEditProject: true,
    canEditEstimate: true,
    canManageLibrary: true,
  };
  readonly statements: FakeD1Statement[] = [];
  readonly runStatements: Array<{ sql: string; values: unknown[] }> = [];

  prepare(sql: string) {
    const statement = new FakeD1Statement(this, sql);
    this.statements.push(statement);
    return statement;
  }

  first(sql: string, values: unknown[]) {
    if (sql.includes("SELECT id, workspace_id") && sql.includes("FROM projects")) {
      if (!this.projectLookupRow) return null;
      if (this.projectLookupRow.id !== values[0]) return null;
      if (sql.includes("workspace_id = ?") && this.projectLookupRow.workspace_id !== values[1]) return null;
      return this.projectLookupRow;
    }

    if (sql.includes("SELECT id, project_id") && sql.includes("FROM estimates")) {
      if (!this.estimateLookupRow) return null;
      if (this.estimateLookupRow.id !== values[0]) return null;
      if (sql.includes("project_id = ?") && this.estimateLookupRow.project_id && this.estimateLookupRow.project_id !== values[1]) return null;
      return { id: this.estimateLookupRow.id, project_id: this.estimateLookupRow.project_id ?? values[1] };
    }

    if (sql.includes("SELECT id, estimate_id") && sql.includes("FROM estimate_row_items")) {
      if (!this.estimateRowLookupRow) return null;
      if (this.estimateRowLookupRow.id !== values[0]) return null;
      if (this.estimateRowLookupRow.estimate_id !== values[1]) return null;
      return this.estimateRowLookupRow;
    }

    if (sql.includes("SELECT 1 AS allowed") && sql.includes("FROM projects project")) {
      if (sql.includes("role IN ('owner', 'admin', 'member')")) {
        return this.access.canEditProject ? { allowed: 1 } : null;
      }
      return this.access.canAccessProject ? { allowed: 1 } : null;
    }

    if (sql.includes("SELECT 1 AS allowed") && sql.includes("FROM estimates estimate")) {
      if (sql.includes("sheet_member.role IN ('owner', 'admin', 'editor')")) {
        return this.access.canEditEstimate ? { allowed: 1 } : null;
      }
      return this.access.canAccessEstimate ? { allowed: 1 } : null;
    }

    if (sql.includes("SELECT 1 AS allowed") && sql.includes("FROM workspace_members workspace_member")) {
      return this.access.canManageLibrary ? { allowed: 1 } : null;
    }

    if (sql.includes("FROM cost_library_item_variant_attachments") && sql.includes("WHERE id = ?")) {
      if (this.attachmentLookupError) throw this.attachmentLookupError;
      if (!this.attachmentLookupRow) return null;
      if (this.attachmentLookupRow.id !== values[0]) return null;
      if (this.attachmentLookupRow.workspace_id !== values[1]) return null;
      return this.attachmentLookupRow;
    }

    if (sql.includes("FROM upload_assets")) {
      if (this.uploadAssetLookupError) throw this.uploadAssetLookupError;
      if (!this.uploadAssetLookupRow) return null;
      if (this.uploadAssetLookupRow.workspace_id !== values[0]) return null;
      if (this.uploadAssetLookupRow.storage_bucket !== values[1]) return null;
      if (this.uploadAssetLookupRow.storage_path !== values[2]) return null;
      return this.uploadAssetLookupRow;
    }

    return null;
  }

  all(sql: string, _values: unknown[]) {
    if (sql.includes("FROM cost_library_item_variant_attachments")) {
      return { results: this.attachmentRows, success: true };
    }

    return { results: [], success: true };
  }
}

let activeD1: FakeD1Database;

function createR2StorageBridge(storageFrom: ReturnType<typeof vi.fn>) {
  return {
    put: vi.fn(async (key: string, value: BodyInit, options?: { httpMetadata?: { contentType?: string; cacheControl?: string } }) => {
      const [bucket, ...pathParts] = key.split("/");
      const path = pathParts.join("/");
      const storage = storageFrom(bucket);
      const { error } = await storage.upload(path, value, {
        contentType: options?.httpMetadata?.contentType,
        cacheControl: options?.httpMetadata?.cacheControl,
        upsert: false,
      });
      if (error) throw error;
      return null;
    }),
    get: vi.fn(async (key: string) => {
      const [bucket, ...pathParts] = key.split("/");
      const path = pathParts.join("/");
      const storage = storageFrom(bucket);
      const { data, error } = await storage.download(path);
      if (error || !data) return null;
      const body = data instanceof Blob ? data : new Blob([data]);
      const arrayBuffer = await body.arrayBuffer();
      return {
        size: arrayBuffer.byteLength,
        httpMetadata: { contentType: body.type || null },
        arrayBuffer: async () => arrayBuffer,
      };
    }),
    delete: vi.fn(async (keys: string | string[]) => {
      const keyList = Array.isArray(keys) ? keys : [keys];
      const pathsByBucket = new Map<string, string[]>();
      for (const key of keyList) {
        const [bucket, ...pathParts] = key.split("/");
        const path = pathParts.join("/");
        pathsByBucket.set(bucket, [...(pathsByBucket.get(bucket) ?? []), path]);
      }
      await Promise.all([...pathsByBucket].map(async ([bucket, paths]) => {
        const storage = storageFrom(bucket);
        const { error } = await storage.remove(paths);
        if (error) throw error;
      }));
    }),
  };
}

function d1SqlStatements(database: FakeD1Database, pattern: RegExp) {
  return database.runStatements.filter((statement) => pattern.test(statement.sql));
}

function d1PreparedStatements(database: FakeD1Database, pattern: RegExp) {
  return database.statements.filter((statement) => pattern.test(statement.sql));
}

function mockStorageClient(
  attachmentRows: Array<Record<string, unknown>> = [],
  options: {
    attachmentLookupRow?: Record<string, unknown> | null;
    attachmentLookupError?: { message: string } | null;
    uploadAssetLookupRow?: Record<string, unknown> | null;
    uploadAssetLookupError?: { message: string } | null;
    uploadEventInsertError?: { message: string } | null;
    downloadBlob?: Blob;
  } = {},
) {
  const remove = vi.fn(async () => ({ error: null }));
  const upload = vi.fn(async () => ({ error: null }));
  const download = vi.fn(async () => ({ data: options.downloadBlob ?? new Blob(["image"], { type: "image/webp" }), error: null }));
  const getPublicUrl = vi.fn(() => ({ data: { publicUrl: "https://cdn.example/file" } }));
  const storageFrom = vi.fn(() => ({ remove, upload, download, getPublicUrl }));
  const rpc = createRpcMock();
  const attachmentQuery = {
    select: vi.fn(() => attachmentQuery),
    eq: vi.fn(() => attachmentQuery),
    in: vi.fn(async () => ({ data: attachmentRows, error: null })),
    maybeSingle: vi.fn(async () => ({
      data: options.attachmentLookupRow ?? null,
      error: options.attachmentLookupError ?? null,
    })),
  };
  const uploadAssetQuery = {
    select: vi.fn(() => uploadAssetQuery),
    eq: vi.fn(() => uploadAssetQuery),
    maybeSingle: vi.fn(async () => ({
      data: options.uploadAssetLookupRow ?? null,
      error: options.uploadAssetLookupError ?? null,
    })),
  };
  const uploadEventsQuery = {
    insert: vi.fn(async () => ({ error: options.uploadEventInsertError ?? null })),
  };
  const dbFrom = vi.fn((table: string) => {
    if (table === "upload_assets") return uploadAssetQuery;
    if (table === "upload_events") return uploadEventsQuery;
    return attachmentQuery;
  });
  const client = { from: dbFrom, rpc, storage: { from: storageFrom } };
  supabaseJsMocks.createClient.mockReturnValue(client);
  supabaseServerMocks.createSupabaseServerClient.mockResolvedValue(client);
  const d1 = new FakeD1Database();
  activeD1 = d1;
  d1.attachmentRows = attachmentRows;
  d1.attachmentLookupRow = options.attachmentLookupRow ?? null;
  d1.attachmentLookupError = options.attachmentLookupError ? new Error(options.attachmentLookupError.message) : null;
  d1.uploadAssetLookupRow = options.uploadAssetLookupRow ?? null;
  d1.uploadAssetLookupError = options.uploadAssetLookupError ? new Error(options.uploadAssetLookupError.message) : null;
  if (options.uploadEventInsertError) d1.failNextRun = new Error(options.uploadEventInsertError.message);
  d1Mocks.getCloudflareD1Database.mockResolvedValue(d1);
  const r2 = createR2StorageBridge(storageFrom);
  cloudflareMocks.getCloudflareContext.mockResolvedValue({ env: { ARCH_UPLOADS_R2: r2 } });
  return {
    client,
    d1,
    r2,
    from: storageFrom,
    dbFrom,
    rpc,
    remove,
    upload,
    download,
    getPublicUrl,
    attachmentQuery,
    uploadAssetQuery,
    uploadEventsQuery,
  };
}

function createRpcMock(options: {
  canAccessProject?: boolean;
  canAccessEstimate?: boolean;
  canEditProject?: boolean;
  canEditEstimate?: boolean;
  canManageLibrary?: boolean;
  rpcError?: { message: string };
} = {}) {
  return vi.fn(async (name: string) => {
    if (options.rpcError) return { data: null, error: options.rpcError };
    if (name === "can_access_project") return { data: options.canAccessProject ?? true, error: null };
    if (name === "can_access_estimate") return { data: options.canAccessEstimate ?? true, error: null };
    if (name === "can_edit_project") return { data: options.canEditProject ?? true, error: null };
    if (name === "can_edit_estimate") return { data: options.canEditEstimate ?? true, error: null };
    if (name === "is_workspace_editor") return { data: options.canManageLibrary ?? true, error: null };
    return { data: null, error: { message: `Unexpected rpc ${name}` } };
  });
}

function mockServerRpc(options: Parameters<typeof createRpcMock>[0] = {}) {
  const rpc = createRpcMock(options);
  supabaseServerMocks.createSupabaseServerClient.mockResolvedValue({ rpc });
  activeD1.access = {
    ...activeD1.access,
    canManageLibrary: options.canManageLibrary ?? true,
  };
  d1Mocks.getCloudflareD1Database.mockResolvedValue(activeD1);
  return { rpc, d1: activeD1 };
}

function mockProjectLookup(
  data: { id: string; workspace_id: string } | null = null,
  options: Parameters<typeof createRpcMock>[0] = {},
  estimateData: { id: string; project_id?: string } | null = null,
) {
  const d1 = activeD1 ?? new FakeD1Database();
  activeD1 = d1;
  d1.projectLookupRow = data;
  d1.estimateLookupRow = estimateData ?? (data ? { id: "estimate-1", project_id: data.id } : null);
  d1.estimateRowLookupRow = d1.estimateLookupRow ? { id: "row-1", estimate_id: d1.estimateLookupRow.id } : null;
  d1.access = {
    canAccessProject: options.canAccessProject ?? true,
    canAccessEstimate: options.canAccessEstimate ?? true,
    canEditProject: options.canEditProject ?? true,
    canEditEstimate: options.canEditEstimate ?? true,
    canManageLibrary: options.canManageLibrary ?? d1.access.canManageLibrary ?? true,
  };
  d1Mocks.getCloudflareD1Database.mockResolvedValue(d1);

  const rpc = createRpcMock(options);
  const maybeSingle = vi.fn(async () => ({ data, error: data ? null : { message: "not found" } }));
  const single = vi.fn(async () => ({ data, error: data ? null : { message: "not found" } }));
  const resolvedEstimateData = estimateData ?? (data ? { id: "estimate-1" } : null);
  const query = {
    select: vi.fn(() => query),
    eq: vi.fn(() => query),
    maybeSingle,
    single,
  };
  const estimateMaybeSingle = vi.fn(async () => ({ data: resolvedEstimateData, error: resolvedEstimateData ? null : null }));
  const estimateSingle = vi.fn(async () => ({ data: resolvedEstimateData, error: resolvedEstimateData ? null : { message: "not found" } }));
  const estimateQuery = {
    select: vi.fn(() => estimateQuery),
    eq: vi.fn(() => estimateQuery),
    maybeSingle: estimateMaybeSingle,
    single: estimateSingle,
  };
  const from = vi.fn((table: string) => (table === "estimates" ? estimateQuery : query));
  supabaseServerMocks.createSupabaseServerClient.mockResolvedValue({ from, rpc });
  return { d1, from, maybeSingle, single, estimateMaybeSingle, estimateSingle, rpc };
}

beforeEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
  vi.unstubAllEnvs();
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://example.supabase.co");
  vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "service-role");
  cloudflareMocks.getCloudflareContext.mockResolvedValue({ env: {} });
  activeD1 = new FakeD1Database();
  d1Mocks.getCloudflareD1Database.mockResolvedValue(activeD1);
  legalTermsMocks.getCurrentUserTermsAcceptanceStatus.mockResolvedValue({
    requiredTerms: { key: "terms", version: "test" },
    acceptedCurrentVersion: true,
    requiresAcceptance: false,
    acceptedAt: "2026-01-01T00:00:00.000Z",
    latestAcceptedVersion: "test",
  });
  mockCurrentWorkspace();
  mockServerRpc();
});

describe("sensitive API auth boundaries", () => {
  it("keeps component image uploads workspace/user scoped", () => {
    const source = read("src/app/api/component-library/images/route.ts");

    expectAuthBeforeBodyParsing(source);
    expect(source).toContain("ensureDefaultWorkspace()");
    expect(source).toContain("isWorkspaceEditorInD1");
    expect(source).not.toContain("createSupabaseServerClient");
    expect(source).toContain("processUploadImageToWebp");
    expect(source).toContain("uploadSessionId");
    expect(source).toContain("assetId");
    expect(source).toContain("scanStatus");
    expect(source).toContain("isOwnedUploadPath");
    expect(source).toContain('path.startsWith(`${workspaceId}/${userId}/`)');
    expect(source).toContain('!path.includes("..")');
    expect(source).toContain("createComponentImageRouteUrl(path)");
    expect(source).toContain("parseComponentImageStoragePath");
    expect(source).not.toContain(".getPublicUrl(path)");
    expect(source).toContain("getCloudflareD1Database");
    expect(source).toContain("recordUploadAsset(uploadMetadataDb");
    expect(source).not.toContain("record_upload_asset");
  });

  it("keeps component attachment uploads workspace/user scoped", () => {
    const source = read("src/app/api/component-library/attachments/route.ts");

    expectAuthBeforeBodyParsing(source);
    expect(source).toContain("ensureDefaultWorkspace()");
    expect(source).toContain("isWorkspaceEditorInD1");
    expect(source).not.toContain("createSupabaseServerClient");
    expect(source).toContain("uploadSessionId");
    expect(source).toContain("assetId");
    expect(source).toContain("scanStatus");
    expect(source).toContain("isOwnedAttachmentPath");
    expect(source).toContain('path.startsWith(`${workspaceId}/${userId}/`)');
    expect(source).toContain('!path.includes("..")');
    expect(source).toContain("getCloudflareD1Database");
    expect(source).toContain("recordUploadAsset(uploadMetadataDb");
    expect(source).not.toContain("record_upload_asset");
  });

  it("keeps project image uploads scoped to a project in the current workspace", () => {
    const source = read("src/app/api/projects/images/route.ts");

    expectAuthBeforeBodyParsing(source);
    expect(source).toContain("ensureDefaultWorkspace()");
    expect(source).toContain("canEditProjectInD1");
    expect(source).toContain("processUploadImageToWebp");
    expect(source).toContain("uploadSessionId");
    expect(source).toContain("assetId");
    expect(source).toContain("scanStatus");
    expect(source).toContain("readProjectInWorkspaceFromD1(uploadMetadataDb, projectId, workspace.id)");
    expect(source).toContain("isOwnedUploadPath");
    expect(source).toContain("parseProjectImageStoragePath(path)");
    expect(source).toContain("parsed.workspaceId === workspaceId");
    expect(source).toContain("parsed.ownerUserId === userId");
  });

  it("keeps estimate row image uploads scoped to an editable project estimate instead of library managers", () => {
    const source = read("src/app/api/estimate-row-images/route.ts");

    expectAuthBeforeBodyParsing(source);
    expect(source).toContain("ensureDefaultWorkspace()");
    expect(source).toContain("canEditProjectInD1");
    expect(source).toContain("canEditEstimateInD1");
    expect(source).toContain("readProjectInWorkspaceFromD1(uploadMetadataDb, projectId, workspace.id)");
    expect(source).toContain("readEstimateInProjectFromD1(uploadMetadataDb, estimateId, projectId)");
    expect(source).toContain("readEstimateRowItemInEstimateFromD1(uploadMetadataDb, rowItemId, estimateId)");
    expect(source).toContain("processUploadImageToWebp");
    expect(source).not.toContain("is_workspace_editor");
    expect(source).not.toContain("createSupabaseServerClient");
    expect(source).not.toContain(".from(\"projects\")");
    expect(source).not.toContain(".from(\"estimates\")");
    expect(source).not.toContain(".from(\"estimate_row_items\")");
    expect(source).toContain("uploadSessionId");
    expect(source).toContain("assetId");
    expect(source).toContain("imageAsset");
    expect(source).toContain("scanStatus");
    expect(source).toContain('const PROJECT_IMAGE_BUCKET = "project-images"');
    expect(source).toContain("PROJECT_IMAGE_PATH_SEGMENT");
    expect(source).toContain("createProjectImageRouteUrl(path)");
    expect(source).toContain('surface: "project-image"');
    expect(source).toContain("targetEntityType: \"estimate-row\"");
    expect(source).toContain("targetEntityId: projectId");
    expect(source).toContain("PROJECT_IMAGE_BUCKET");
    expect(source).not.toContain('const COMPONENT_IMAGE_BUCKET = "component-images"');
    expect(source).not.toContain(".getPublicUrl(path)");
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

  it("rejects component image uploads before parsing bodies when the user cannot manage the library", async () => {
    const storage = mockStorageClient();
    const server = mockServerRpc({ canManageLibrary: false });
    const request = createUnparsedFormRequest();
    const { POST } = await import("@/app/api/component-library/images/route");

    const response = await POST(request);

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({
      error: "Only workspace editors/admins can manage the library.",
    });
    expect(d1PreparedStatements(server.d1, /FROM workspace_members workspace_member/)).toHaveLength(1);
    expect(server.rpc).not.toHaveBeenCalled();
    expect(request.formData).not.toHaveBeenCalled();
    expect(storage.from).not.toHaveBeenCalled();
    expect(storage.upload).not.toHaveBeenCalled();
  });

  it("rejects component attachment uploads before parsing bodies when auth fails", async () => {
    authMocks.requireCurrentUserContext.mockRejectedValue(new Error("NEXT_REDIRECT:/login"));
    const request = createUnparsedFormRequest();
    const { POST } = await import("@/app/api/component-library/attachments/route");

    await expect(POST(request)).rejects.toThrow("NEXT_REDIRECT:/login");

    expect(request.formData).not.toHaveBeenCalled();
  });

  it("rejects component attachment uploads before parsing bodies when the user cannot manage the library", async () => {
    const storage = mockStorageClient();
    const server = mockServerRpc({ canManageLibrary: false });
    const request = createUnparsedFormRequest();
    const { POST } = await import("@/app/api/component-library/attachments/route");

    const response = await POST(request);

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({
      error: "Only workspace editors/admins can manage the library.",
    });
    expect(d1PreparedStatements(server.d1, /FROM workspace_members workspace_member/)).toHaveLength(1);
    expect(server.rpc).not.toHaveBeenCalled();
    expect(request.formData).not.toHaveBeenCalled();
    expect(storage.from).not.toHaveBeenCalled();
    expect(storage.upload).not.toHaveBeenCalled();
  });

  it("does not expose component attachment storage errors to clients", async () => {
    const storage = mockStorageClient();
    storage.upload.mockResolvedValueOnce({ error: { message: "storage bucket internals leaked" } });
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    const formData = new FormData();
    formData.set("file", new File([Buffer.from("%PDF-1.7\n%test")], "spec.pdf", { type: "application/pdf" }));
    const { POST } = await import("@/app/api/component-library/attachments/route");

    try {
      const response = await POST(createFormRequest(formData));

      expect(response.status).toBe(500);
      await expect(response.json()).resolves.toEqual({ error: "Could not store attachment." });
      expect(storage.upload).toHaveBeenCalledOnce();
      expect(consoleError).toHaveBeenCalledWith(
        "Component attachment upload failed",
        expect.objectContaining({ message: "storage bucket internals leaked" }),
      );
    } finally {
      consoleError.mockRestore();
    }
  });

  it("removes a stored component attachment when upload record persistence fails", async () => {
    const storage = mockStorageClient();
    storage.d1.failNextRun = new Error("record failed");
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    const formData = new FormData();
    formData.set("file", new File([Buffer.from("%PDF-1.7\n%test")], "spec.pdf", { type: "application/pdf" }));
    const { POST } = await import("@/app/api/component-library/attachments/route");

    try {
      const response = await POST(createFormRequest(formData));

      expect(response.status).toBe(500);
      await expect(response.json()).resolves.toEqual({ error: "Could not store attachment." });
      expect(storage.upload).toHaveBeenCalledOnce();
      expect(d1SqlStatements(storage.d1, /INSERT INTO upload_sessions/)).toHaveLength(0);
      expect(storage.remove).toHaveBeenCalledWith([
        expect.stringMatching(/^workspace-1\/user-1\/spec-[0-9a-f-]+\.pdf$/),
      ]);
    } finally {
      consoleError.mockRestore();
    }
  });

  it("uploads component attachments through R2 when the Cloudflare storage provider is selected", async () => {
    vi.stubEnv("ARCHESTIMATOR_UPLOAD_STORAGE_PROVIDER", "cloudflare-r2");
    const storage = mockStorageClient();
    const r2 = {
      put: vi.fn(async () => null),
      get: vi.fn(async () => null),
      delete: vi.fn(async () => undefined),
    };
    cloudflareMocks.getCloudflareContext.mockResolvedValue({ env: { ARCH_UPLOADS_R2: r2 } });
    const formData = new FormData();
    formData.set("file", new File([Buffer.from("%PDF-1.7\n%test")], "Spec.PDF", { type: "application/pdf" }));
    const { POST } = await import("@/app/api/component-library/attachments/route");

    const response = await POST(createFormRequest(formData));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toMatchObject({
      bucket: "component-attachments",
      path: expect.stringMatching(/^workspace-1\/user-1\/spec-[0-9a-f-]+\.pdf$/),
      contentType: "application/pdf",
      scanStatus: "pending",
    });
    expect(storage.upload).not.toHaveBeenCalled();
    expect(r2.put).toHaveBeenCalledWith(expect.stringMatching(/^component-attachments\/workspace-1\/user-1\/spec-[0-9a-f-]+\.pdf$/), expect.any(Buffer), {
      httpMetadata: {
        contentType: "application/pdf",
        cacheControl: "31536000",
      },
    });
    expect(d1SqlStatements(storage.d1, /INSERT INTO upload_sessions/)).toHaveLength(1);
    expect(d1SqlStatements(storage.d1, /INSERT INTO upload_assets/)).toHaveLength(1);
    expect(d1SqlStatements(storage.d1, /INSERT INTO upload_events/)).toHaveLength(1);
  });

  it("uploads component images through storage plus atomic asset records and returns resolver URLs", async () => {
    const storage = mockStorageClient();
    const formData = new FormData();
    formData.set("file", createPngFile("Library Hero.PNG"));
    const { POST } = await import("@/app/api/component-library/images/route");

    const response = await POST(createFormRequest(formData));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      bucket: "component-images",
      uploadSessionId: expect.any(String),
      assetId: expect.any(String),
      scanStatus: "not_required",
      url: expect.stringContaining("/api/component-library/images?path="),
      thumbnailUrl: expect.stringContaining("/api/component-library/images?path="),
      contentType: "image/webp",
    });
    expect(storage.from).toHaveBeenCalledWith("component-images");
    expect(storage.upload).toHaveBeenCalledTimes(2);
    expect(storage.upload).toHaveBeenNthCalledWith(1, expect.stringMatching(/^workspace-1\/user-1\/library-hero-[0-9a-f-]+\.webp$/), expect.any(Buffer), expect.objectContaining({
      contentType: "image/webp",
      upsert: false,
    }));
    expect(storage.upload).toHaveBeenNthCalledWith(2, expect.stringMatching(/^workspace-1\/user-1\/library-hero-[0-9a-f-]+-thumb\.webp$/), expect.any(Buffer), expect.objectContaining({
      contentType: "image/webp",
      upsert: false,
    }));
    expect(d1SqlStatements(storage.d1, /INSERT INTO upload_sessions/)).toHaveLength(1);
    expect(d1SqlStatements(storage.d1, /INSERT INTO upload_assets/)).toHaveLength(1);
    expect(d1SqlStatements(storage.d1, /INSERT INTO upload_events/)).toHaveLength(1);
    expect(storage.d1.runStatements.flatMap((statement) => statement.values)).toEqual(expect.arrayContaining([
      "component-image",
      "component-library",
      "component-images",
      "not_required",
      expect.stringMatching(/^workspace-1\/user-1\/library-hero-[0-9a-f-]+\.webp$/),
      expect.stringMatching(/^workspace-1\/user-1\/library-hero-[0-9a-f-]+-thumb\.webp$/),
    ]));
  });

  it("uploads component images through R2 when the Cloudflare storage provider is selected", async () => {
    vi.stubEnv("ARCHESTIMATOR_UPLOAD_STORAGE_PROVIDER", "cloudflare-r2");
    const storage = mockStorageClient();
    const r2 = {
      put: vi.fn(async () => null),
      get: vi.fn(async () => null),
      delete: vi.fn(async () => undefined),
    };
    cloudflareMocks.getCloudflareContext.mockResolvedValue({ env: { ARCH_UPLOADS_R2: r2 } });
    const formData = new FormData();
    formData.set("file", createPngFile("Library Hero.PNG"));
    const { POST } = await import("@/app/api/component-library/images/route");

    const response = await POST(createFormRequest(formData));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      bucket: "component-images",
      url: expect.stringContaining("/api/component-library/images?path="),
      thumbnailUrl: expect.stringContaining("/api/component-library/images?path="),
    });
    expect(storage.from).not.toHaveBeenCalled();
    expect(storage.upload).not.toHaveBeenCalled();
    expect(r2.put).toHaveBeenCalledTimes(2);
    expect(r2.put).toHaveBeenNthCalledWith(1, expect.stringMatching(/^component-images\/workspace-1\/user-1\/library-hero-[0-9a-f-]+\.webp$/), expect.any(Buffer), expect.objectContaining({
      httpMetadata: expect.objectContaining({ contentType: "image/webp" }),
    }));
    expect(d1SqlStatements(storage.d1, /INSERT INTO upload_assets/)).toHaveLength(1);
    expect(storage.d1.runStatements.flatMap((statement) => statement.values)).toEqual(expect.arrayContaining([
      "component-images",
      expect.stringMatching(/^workspace-1\/user-1\/library-hero-[0-9a-f-]+\.webp$/),
    ]));
  });

  it("uploads project images through private project storage plus atomic asset records", async () => {
    const storage = mockStorageClient();
    mockProjectLookup({ id: "project-1", workspace_id: DEFAULT_WORKSPACE_ID });
    const formData = new FormData();
    formData.set("projectId", "project-1");
    formData.set("file", createPngFile("Project Cover.PNG"));
    const { POST } = await import("@/app/api/projects/images/route");

    const response = await POST(createFormRequest(formData));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      bucket: "project-images",
      uploadSessionId: expect.any(String),
      assetId: expect.any(String),
      scanStatus: "not_required",
      url: expect.stringContaining("/api/projects/images?path="),
      thumbnailUrl: expect.stringContaining("/api/projects/images?path="),
      contentType: "image/webp",
    });
    expect(storage.from).toHaveBeenCalledWith("project-images");
    expect(storage.upload).toHaveBeenCalledTimes(2);
    expect(storage.upload).toHaveBeenNthCalledWith(1, expect.stringMatching(/^workspace-1\/user-1\/project-images\/project-1\/project-cover-[0-9a-f-]+\.webp$/), expect.any(Buffer), expect.objectContaining({
      contentType: "image/webp",
      upsert: false,
    }));
    expect(d1SqlStatements(storage.d1, /INSERT INTO upload_sessions/)).toHaveLength(1);
    expect(d1SqlStatements(storage.d1, /INSERT INTO upload_assets/)).toHaveLength(1);
    expect(d1SqlStatements(storage.d1, /INSERT INTO upload_events/)).toHaveLength(1);
    expect(storage.d1.runStatements.flatMap((statement) => statement.values)).toEqual(expect.arrayContaining([
      "project-image",
      "project",
      "project-1",
      "project-images",
      "not_required",
      expect.stringMatching(/^workspace-1\/user-1\/project-images\/project-1\/project-cover-[0-9a-f-]+\.webp$/),
      expect.stringMatching(/^workspace-1\/user-1\/project-images\/project-1\/project-cover-[0-9a-f-]+-thumb\.webp$/),
    ]));
  });

  it("uploads estimate row images into the private project image bucket and returns row asset descriptors", async () => {
    const storage = mockStorageClient();
    const projectLookup = mockProjectLookup(
      { id: "project-1", workspace_id: DEFAULT_WORKSPACE_ID },
      { canEditProject: true, canEditEstimate: false },
    );
    const formData = new FormData();
    formData.set("projectId", "project-1");
    formData.set("estimateId", "estimate-1");
    formData.set("rowItemId", "row-1");
    formData.set("file", createPngFile("Reference.PNG"));
    const { POST } = await import("@/app/api/estimate-row-images/route");

    const response = await POST(createFormRequest(formData));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      bucket: "project-images",
      uploadSessionId: expect.any(String),
      assetId: expect.any(String),
      scanStatus: "not_required",
      path: expect.stringMatching(/^workspace-1\/user-1\/project-images\/project-1\/estimate-row-images\/estimate-1\/reference-[0-9a-f-]+\.webp$/),
      url: expect.stringContaining("/api/projects/images?path="),
      imageAsset: {
        kind: "upload-asset",
        schemaVersion: 1,
        bucket: "project-images",
        url: expect.stringContaining("/api/projects/images?path="),
        scanStatus: "not_required",
      },
    });
    expect(storage.from).toHaveBeenCalledWith("project-images");
    expect(storage.upload).toHaveBeenCalledTimes(2);
    expect(d1SqlStatements(storage.d1, /INSERT INTO upload_sessions/)).toHaveLength(1);
    expect(d1SqlStatements(storage.d1, /INSERT INTO upload_assets/)).toHaveLength(1);
    expect(d1SqlStatements(storage.d1, /INSERT INTO upload_events/)).toHaveLength(1);
    expect(storage.d1.runStatements.flatMap((statement) => statement.values)).toEqual(expect.arrayContaining([
      "project-image",
      "estimate-row",
      "project-1",
      "project-images",
      "not_required",
      expect.stringMatching(/^workspace-1\/user-1\/project-images\/project-1\/estimate-row-images\/estimate-1\/reference-[0-9a-f-]+\.webp$/),
      expect.stringMatching(/^workspace-1\/user-1\/project-images\/project-1\/estimate-row-images\/estimate-1\/reference-[0-9a-f-]+-thumb\.webp$/),
      expect.stringContaining("\"estimateId\":\"estimate-1\""),
      expect.stringContaining("\"rowItemId\":\"row-1\""),
    ]));
    expect(d1PreparedStatements(projectLookup.d1, /FROM projects\s+WHERE id = \?\s+AND workspace_id = \?/)).toHaveLength(1);
    expect(d1PreparedStatements(projectLookup.d1, /FROM estimates\s+WHERE id = \?\s+AND project_id = \?/)).toHaveLength(1);
    expect(d1PreparedStatements(projectLookup.d1, /FROM projects project/)).toHaveLength(1);
    expect(d1PreparedStatements(projectLookup.d1, /FROM estimates estimate/)).toHaveLength(1);
    expect(d1PreparedStatements(projectLookup.d1, /FROM estimate_row_items/)).toHaveLength(1);
  });

  it("rejects oversized image requests before auth, body parsing, or storage work", async () => {
    const storage = mockStorageClient();
    const request = {
      headers: new Headers({ "content-length": String(14 * 1024 * 1024) }),
      formData: vi.fn(async () => new FormData()),
    } as unknown as Request & { formData: ReturnType<typeof vi.fn> };
    const { POST } = await import("@/app/api/component-library/images/route");

    const response = await POST(request);

    expect(response.status).toBe(413);
    await expect(response.json()).resolves.toEqual({
      error: "Image upload is too large. Compress or choose an image under 12 MB.",
    });
    expect(authMocks.requireCurrentUserContext).not.toHaveBeenCalled();
    expect(request.formData).not.toHaveBeenCalled();
    expect(storage.upload).not.toHaveBeenCalled();
  });

  it("rejects image MIME and magic mismatches before storage writes or upload records", async () => {
    const storage = mockStorageClient();
    const formData = new FormData();
    formData.set("file", new File([Buffer.from("not actually a png")], "fake.png", { type: "image/png" }));
    const { POST } = await import("@/app/api/component-library/images/route");

    const response = await POST(createFormRequest(formData));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: "The uploaded file does not look like a supported image.",
    });
    expect(storage.upload).not.toHaveBeenCalled();
    expect(d1SqlStatements(storage.d1, /INSERT INTO upload_assets/)).toHaveLength(0);
  });

  it("fails component image uploads explicitly in Cloudflare proof builds before storage writes", async () => {
    vi.stubEnv("ARCHESTIMATOR_CLOUDFLARE_BUILD", "1");
    const storage = mockStorageClient();
    const formData = new FormData();
    formData.set("file", createPngFile("cloudflare-proof.png"));
    const { POST } = await import("@/app/api/component-library/images/route");

    const response = await POST(createFormRequest(formData));

    expect(response.status).toBe(501);
    await expect(response.json()).resolves.toEqual({
      error: expect.stringContaining("Cloudflare Workers proof build"),
    });
    expect(storage.upload).not.toHaveBeenCalled();
    expect(d1SqlStatements(storage.d1, /INSERT INTO upload_assets/)).toHaveLength(0);
  });

  it("rejects empty image uploads before storage writes", async () => {
    const storage = mockStorageClient();
    const formData = new FormData();
    formData.set("file", new File([], "empty.png", { type: "image/png" }));
    const { POST } = await import("@/app/api/component-library/images/route");

    const response = await POST(createFormRequest(formData));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: "Image file is empty.",
    });
    expect(storage.upload).not.toHaveBeenCalled();
  });

  it("rejects fake XLSX attachments before storage writes or upload records", async () => {
    const storage = mockStorageClient();
    const formData = new FormData();
    formData.set("file", new File([Buffer.from("PK\x03\x04[Content_Types].xml")], "fake.xlsx", {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    }));
    const { POST } = await import("@/app/api/component-library/attachments/route");

    const response = await POST(createFormRequest(formData));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: "The uploaded file does not look like a supported attachment.",
    });
    expect(storage.upload).not.toHaveBeenCalled();
    expect(d1SqlStatements(storage.d1, /INSERT INTO upload_assets/)).toHaveLength(0);
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

  it("rejects component image deletion when the user cannot manage the library", async () => {
    const storage = mockStorageClient();
    const server = mockServerRpc({ canManageLibrary: false });
    const { DELETE } = await import("@/app/api/component-library/images/route");

    const response = await DELETE(createJsonRequest({
      paths: ["workspace-1/user-1/component.webp"],
    }));

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({
      error: "Only workspace editors/admins can manage the library.",
    });
    expect(d1PreparedStatements(server.d1, /FROM workspace_members workspace_member/)).toHaveLength(1);
    expect(server.rpc).not.toHaveBeenCalled();
    expect(storage.from).not.toHaveBeenCalled();
    expect(storage.remove).not.toHaveBeenCalled();
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

  it("serves component images through a private workspace resolver", async () => {
    const storage = mockStorageClient();
    const path = `${DEFAULT_WORKSPACE_ID}/${DEFAULT_USER_ID}/component.webp`;
    const { GET } = await import("@/app/api/component-library/images/route");

    const response = await GET(new Request(`http://localhost/api/component-library/images?path=${encodeURIComponent(path)}`));

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("image/webp");
    expect(response.headers.get("cache-control")).toBe("private, max-age=86400, immutable");
    expect(storage.from).toHaveBeenCalledWith("component-images");
    expect(storage.download).toHaveBeenCalledWith(path);
  });

  it("serves component images from R2 when the Cloudflare storage provider is selected", async () => {
    vi.stubEnv("ARCHESTIMATOR_UPLOAD_STORAGE_PROVIDER", "cloudflare-r2");
    const storage = mockStorageClient();
    const path = `${DEFAULT_WORKSPACE_ID}/${DEFAULT_USER_ID}/component.webp`;
    const r2Body = new TextEncoder().encode("r2-image");
    const r2 = {
      put: vi.fn(async () => null),
      get: vi.fn(async () => ({
        size: r2Body.byteLength,
        httpMetadata: { contentType: "image/webp" },
        arrayBuffer: async () => r2Body.buffer.slice(r2Body.byteOffset, r2Body.byteOffset + r2Body.byteLength),
      })),
      delete: vi.fn(async () => undefined),
    };
    cloudflareMocks.getCloudflareContext.mockResolvedValue({ env: { ARCH_UPLOADS_R2: r2 } });
    const { GET } = await import("@/app/api/component-library/images/route");

    const response = await GET(new Request(`http://localhost/api/component-library/images?path=${encodeURIComponent(path)}`));

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("image/webp");
    await expect(response.text()).resolves.toBe("r2-image");
    expect(storage.from).not.toHaveBeenCalled();
    expect(storage.download).not.toHaveBeenCalled();
    expect(r2.get).toHaveBeenCalledWith(`component-images/${path}`);
  });

  it("denies component image resolver requests for another workspace before storage download", async () => {
    const storage = mockStorageClient();
    const path = `workspace-2/${DEFAULT_USER_ID}/component.webp`;
    const { GET } = await import("@/app/api/component-library/images/route");

    const response = await GET(new Request(`http://localhost/api/component-library/images?path=${encodeURIComponent(path)}`));

    expect(response.status).toBe(404);
    expect(response.headers.get("cache-control")).toBe("private, no-cache, no-store, max-age=0, must-revalidate");
    await expect(response.json()).resolves.toEqual({
      error: "Image could not be found.",
    });
    expect(storage.from).not.toHaveBeenCalled();
    expect(storage.download).not.toHaveBeenCalled();
  });

  it("fails closed with no-store for malformed component image paths before auth", async () => {
    const storage = mockStorageClient();
    const { GET } = await import("@/app/api/component-library/images/route");

    const response = await GET(new Request("http://localhost/api/component-library/images?path=../escape.webp"));

    expect(response.status).toBe(404);
    expect(response.headers.get("cache-control")).toBe("private, no-cache, no-store, max-age=0, must-revalidate");
    await expect(response.json()).resolves.toEqual({
      error: "Image could not be found.",
    });
    expect(authMocks.requireCurrentUserContext).not.toHaveBeenCalled();
    expect(storage.from).not.toHaveBeenCalled();
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

  it("removes owned component attachment paths through R2 when Cloudflare storage is selected", async () => {
    vi.stubEnv("ARCHESTIMATOR_UPLOAD_STORAGE_PROVIDER", "cloudflare-r2");
    const storage = mockStorageClient();
    const r2 = {
      put: vi.fn(async () => null),
      get: vi.fn(async () => null),
      delete: vi.fn(async () => undefined),
    };
    cloudflareMocks.getCloudflareContext.mockResolvedValue({ env: { ARCH_UPLOADS_R2: r2 } });
    const { DELETE } = await import("@/app/api/component-library/attachments/route");

    const response = await DELETE(createJsonRequest({
      paths: [
        "workspace-1/user-1/spec.pdf",
        "workspace-1/user-1/schedule.xlsx",
        "workspace-1/user-2/other.pdf",
      ],
    }));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      removedPaths: [
        "workspace-1/user-1/spec.pdf",
        "workspace-1/user-1/schedule.xlsx",
      ],
    });
    expect(storage.remove).not.toHaveBeenCalled();
    expect(r2.delete).toHaveBeenCalledWith([
      "component-attachments/workspace-1/user-1/spec.pdf",
      "component-attachments/workspace-1/user-1/schedule.xlsx",
    ]);
  });

  it("rejects component attachment deletion when the user cannot manage the library", async () => {
    const storage = mockStorageClient();
    const server = mockServerRpc({ canManageLibrary: false });
    const { DELETE } = await import("@/app/api/component-library/attachments/route");

    const response = await DELETE(createJsonRequest({
      paths: ["workspace-1/user-1/spec.pdf"],
    }));

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({
      error: "Only workspace editors/admins can manage the library.",
    });
    expect(d1PreparedStatements(server.d1, /FROM workspace_members workspace_member/)).toHaveLength(1);
    expect(server.rpc).not.toHaveBeenCalled();
    expect(d1PreparedStatements(storage.d1, /FROM cost_library_item_variant_attachments/)).toHaveLength(0);
    expect(storage.remove).not.toHaveBeenCalled();
  });

  it("blocks draft cleanup from deleting reviewed Library attachments", async () => {
    const storage = mockStorageClient([{
      storage_path: "workspace-1/user-1/spec.pdf",
      review_status: "accepted",
      is_current_approved: true,
    }]);
    const { DELETE } = await import("@/app/api/component-library/attachments/route");

    const response = await DELETE(createJsonRequest({
      paths: ["workspace-1/user-1/spec.pdf"],
    }));

    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toEqual({
      error: "Reviewed Library attachments cannot be removed from draft cleanup.",
    });
    expect(d1PreparedStatements(storage.d1, /FROM cost_library_item_variant_attachments/)).toHaveLength(1);
    expect(storage.remove).not.toHaveBeenCalled();
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

  it("fails closed for malformed component attachment download ids before auth", async () => {
    const storage = mockStorageClient();
    const { GET } = await import("@/app/api/component-library/attachments/route");

    const response = await GET(new Request("http://localhost/api/component-library/attachments?id=not-a-uuid"));

    expect(response.status).toBe(404);
    expect(response.headers.get("cache-control")).toBe("private, no-cache, no-store, max-age=0, must-revalidate");
    await expect(response.json()).resolves.toEqual({
      error: "Attachment could not be found.",
    });
    expect(authMocks.requireCurrentUserContext).not.toHaveBeenCalled();
    expect(d1PreparedStatements(storage.d1, /FROM cost_library_item_variant_attachments/)).toHaveLength(0);
    expect(storage.download).not.toHaveBeenCalled();
  });

  it("refuses component attachment downloads until the upload asset is scan-clean", async () => {
    const attachmentId = "11111111-1111-4111-8111-111111111111";
    const storagePath = `${DEFAULT_WORKSPACE_ID}/${DEFAULT_USER_ID}/spec.pdf`;
    const storage = mockStorageClient([], {
      attachmentLookupRow: {
        id: attachmentId,
        workspace_id: DEFAULT_WORKSPACE_ID,
        storage_bucket: "component-attachments",
        storage_path: storagePath,
        file_name: "spec.pdf",
        content_type: "application/pdf",
        size_bytes: 8,
        review_status: "approved",
        is_current_approved: true,
      },
      uploadAssetLookupRow: {
        id: "22222222-2222-4222-8222-222222222222",
        upload_session_id: "33333333-3333-4333-8333-333333333333",
        workspace_id: DEFAULT_WORKSPACE_ID,
        surface: "component-attachment",
        storage_bucket: "component-attachments",
        storage_path: storagePath,
        status: "finalized",
        scan_status: "pending",
      },
    });
    const { GET } = await import("@/app/api/component-library/attachments/route");

    const response = await GET(new Request(`http://localhost/api/component-library/attachments?id=${attachmentId}`));

    expect(response.status).toBe(409);
    expect(response.headers.get("cache-control")).toBe("private, no-cache, no-store, max-age=0, must-revalidate");
    await expect(response.json()).resolves.toEqual({
      error: "Attachment is not available until scanning is complete.",
    });
    expect(d1PreparedStatements(storage.d1, /FROM cost_library_item_variant_attachments/)).toHaveLength(1);
    expect(d1PreparedStatements(storage.d1, /FROM upload_assets/)).toHaveLength(1);
    expect(d1SqlStatements(storage.d1, /INSERT INTO upload_events/)).toHaveLength(0);
    expect(storage.download).not.toHaveBeenCalled();
  });

  it.each([
    ["uploaded draft", "uploaded", false],
    ["approved but not current", "approved", false],
    ["rejected", "rejected", false],
  ])("refuses component attachment downloads until attachment review is approved/current for %s", async (_caseName, reviewStatus, isCurrentApproved) => {
    const attachmentId = "11111111-1111-4111-8111-111111111111";
    const storagePath = `${DEFAULT_WORKSPACE_ID}/${DEFAULT_USER_ID}/spec.pdf`;
    const storage = mockStorageClient([], {
      attachmentLookupRow: {
        id: attachmentId,
        workspace_id: DEFAULT_WORKSPACE_ID,
        storage_bucket: "component-attachments",
        storage_path: storagePath,
        file_name: "spec.pdf",
        content_type: "application/pdf",
        size_bytes: 8,
        review_status: reviewStatus,
        is_current_approved: isCurrentApproved,
      },
      uploadAssetLookupRow: {
        id: "22222222-2222-4222-8222-222222222222",
        upload_session_id: "33333333-3333-4333-8333-333333333333",
        workspace_id: DEFAULT_WORKSPACE_ID,
        surface: "component-attachment",
        storage_bucket: "component-attachments",
        storage_path: storagePath,
        status: "finalized",
        scan_status: "clean",
      },
    });
    const { GET } = await import("@/app/api/component-library/attachments/route");

    const response = await GET(new Request(`http://localhost/api/component-library/attachments?id=${attachmentId}`));

    expect(response.status).toBe(409);
    expect(response.headers.get("cache-control")).toBe("private, no-cache, no-store, max-age=0, must-revalidate");
    await expect(response.json()).resolves.toEqual({
      error: "Attachment is not available until approval is complete.",
    });
    expect(d1PreparedStatements(storage.d1, /FROM cost_library_item_variant_attachments/)).toHaveLength(1);
    expect(d1PreparedStatements(storage.d1, /FROM upload_assets/)).toHaveLength(0);
    expect(d1SqlStatements(storage.d1, /INSERT INTO upload_events/)).toHaveLength(0);
    expect(storage.download).not.toHaveBeenCalled();
  });

  it.each([
    ["wrong workspace", { workspace_id: "workspace-2", scan_status: "clean", status: "finalized", surface: "component-attachment", storage_bucket: "component-attachments", storage_path: `${DEFAULT_WORKSPACE_ID}/${DEFAULT_USER_ID}/spec.pdf` }],
    ["wrong surface", { workspace_id: DEFAULT_WORKSPACE_ID, scan_status: "clean", status: "finalized", surface: "component-image", storage_bucket: "component-attachments", storage_path: `${DEFAULT_WORKSPACE_ID}/${DEFAULT_USER_ID}/spec.pdf` }],
    ["wrong bucket", { workspace_id: DEFAULT_WORKSPACE_ID, scan_status: "clean", status: "finalized", surface: "component-attachment", storage_bucket: "component-images", storage_path: `${DEFAULT_WORKSPACE_ID}/${DEFAULT_USER_ID}/spec.pdf` }],
    ["wrong path", { workspace_id: DEFAULT_WORKSPACE_ID, scan_status: "clean", status: "finalized", surface: "component-attachment", storage_bucket: "component-attachments", storage_path: `${DEFAULT_WORKSPACE_ID}/${DEFAULT_USER_ID}/other.pdf` }],
    ["non-finalized", { workspace_id: DEFAULT_WORKSPACE_ID, scan_status: "clean", status: "reserved", surface: "component-attachment", storage_bucket: "component-attachments", storage_path: `${DEFAULT_WORKSPACE_ID}/${DEFAULT_USER_ID}/spec.pdf` }],
    ["infected", { workspace_id: DEFAULT_WORKSPACE_ID, scan_status: "infected", status: "finalized", surface: "component-attachment", storage_bucket: "component-attachments", storage_path: `${DEFAULT_WORKSPACE_ID}/${DEFAULT_USER_ID}/spec.pdf` }],
    ["unsupported", { workspace_id: DEFAULT_WORKSPACE_ID, scan_status: "unsupported", status: "finalized", surface: "component-attachment", storage_bucket: "component-attachments", storage_path: `${DEFAULT_WORKSPACE_ID}/${DEFAULT_USER_ID}/spec.pdf` }],
    ["transient scan failure", { workspace_id: DEFAULT_WORKSPACE_ID, scan_status: "failed_transient", status: "finalized", surface: "component-attachment", storage_bucket: "component-attachments", storage_path: `${DEFAULT_WORKSPACE_ID}/${DEFAULT_USER_ID}/spec.pdf` }],
    ["permanent scan failure", { workspace_id: DEFAULT_WORKSPACE_ID, scan_status: "failed_permanent", status: "finalized", surface: "component-attachment", storage_bucket: "component-attachments", storage_path: `${DEFAULT_WORKSPACE_ID}/${DEFAULT_USER_ID}/spec.pdf` }],
    ["override not yet enabled for downloads", { workspace_id: DEFAULT_WORKSPACE_ID, scan_status: "override_approved", status: "finalized", surface: "component-attachment", storage_bucket: "component-attachments", storage_path: `${DEFAULT_WORKSPACE_ID}/${DEFAULT_USER_ID}/spec.pdf` }],
  ])("refuses component attachment downloads for %s upload asset rows", async (_caseName, assetOverrides) => {
    const attachmentId = "11111111-1111-4111-8111-111111111111";
    const storagePath = `${DEFAULT_WORKSPACE_ID}/${DEFAULT_USER_ID}/spec.pdf`;
    const storage = mockStorageClient([], {
      attachmentLookupRow: {
        id: attachmentId,
        workspace_id: DEFAULT_WORKSPACE_ID,
        storage_bucket: "component-attachments",
        storage_path: storagePath,
        file_name: "spec.pdf",
        content_type: "application/pdf",
        size_bytes: 8,
        review_status: "approved",
        is_current_approved: true,
      },
      uploadAssetLookupRow: {
        id: "22222222-2222-4222-8222-222222222222",
        upload_session_id: "33333333-3333-4333-8333-333333333333",
        ...assetOverrides,
      },
    });
    const { GET } = await import("@/app/api/component-library/attachments/route");

    const response = await GET(new Request(`http://localhost/api/component-library/attachments?id=${attachmentId}`));

    expect(response.status).toBe(409);
    expect(response.headers.get("cache-control")).toBe("private, no-cache, no-store, max-age=0, must-revalidate");
    await expect(response.json()).resolves.toEqual({
      error: "Attachment is not available until scanning is complete.",
    });
    expect(d1SqlStatements(storage.d1, /INSERT INTO upload_events/)).toHaveLength(0);
    expect(storage.download).not.toHaveBeenCalled();
  });

  it("refuses component attachment downloads when audit insertion fails", async () => {
    const attachmentId = "11111111-1111-4111-8111-111111111111";
    const storagePath = `${DEFAULT_WORKSPACE_ID}/${DEFAULT_USER_ID}/spec.pdf`;
    const storage = mockStorageClient([], {
      uploadEventInsertError: { message: "audit table unavailable" },
      attachmentLookupRow: {
        id: attachmentId,
        workspace_id: DEFAULT_WORKSPACE_ID,
        storage_bucket: "component-attachments",
        storage_path: storagePath,
        file_name: "spec.pdf",
        content_type: "application/pdf",
        size_bytes: 8,
        review_status: "approved",
        is_current_approved: true,
      },
      uploadAssetLookupRow: {
        id: "22222222-2222-4222-8222-222222222222",
        upload_session_id: "33333333-3333-4333-8333-333333333333",
        workspace_id: DEFAULT_WORKSPACE_ID,
        surface: "component-attachment",
        storage_bucket: "component-attachments",
        storage_path: storagePath,
        status: "finalized",
        scan_status: "clean",
      },
    });
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    const { GET } = await import("@/app/api/component-library/attachments/route");

    try {
      const response = await GET(new Request(`http://localhost/api/component-library/attachments?id=${attachmentId}`));

      expect(response.status).toBe(409);
      expect(response.headers.get("cache-control")).toBe("private, no-cache, no-store, max-age=0, must-revalidate");
      await expect(response.json()).resolves.toEqual({
        error: "Attachment download could not be audited.",
      });
      expect(d1PreparedStatements(storage.d1, /INSERT INTO upload_events/)).toHaveLength(1);
      expect(storage.download).not.toHaveBeenCalled();
    } finally {
      consoleError.mockRestore();
    }
  });

  it("audits and serves component attachment downloads only after scan-clean finalization", async () => {
    const attachmentId = "11111111-1111-4111-8111-111111111111";
    const assetId = "22222222-2222-4222-8222-222222222222";
    const sessionId = "33333333-3333-4333-8333-333333333333";
    const storagePath = `${DEFAULT_WORKSPACE_ID}/${DEFAULT_USER_ID}/spec.pdf`;
    const storage = mockStorageClient([], {
      downloadBlob: new Blob(["%PDF-1.7"], { type: "application/pdf" }),
      attachmentLookupRow: {
        id: attachmentId,
        workspace_id: DEFAULT_WORKSPACE_ID,
        storage_bucket: "component-attachments",
        storage_path: storagePath,
        file_name: "spec.pdf",
        content_type: "application/pdf",
        size_bytes: 8,
        review_status: "approved",
        is_current_approved: true,
      },
      uploadAssetLookupRow: {
        id: assetId,
        upload_session_id: sessionId,
        workspace_id: DEFAULT_WORKSPACE_ID,
        surface: "component-attachment",
        storage_bucket: "component-attachments",
        storage_path: storagePath,
        status: "finalized",
        scan_status: "clean",
      },
    });
    const { GET } = await import("@/app/api/component-library/attachments/route");

    const response = await GET(new Request(`http://localhost/api/component-library/attachments?id=${attachmentId}`));

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("application/pdf");
    expect(response.headers.get("content-disposition")).toBe('attachment; filename="spec.pdf"');
    expect(response.headers.get("cache-control")).toBe("private, max-age=300");
    expect(d1SqlStatements(storage.d1, /INSERT INTO upload_events/)[0]?.values).toEqual(expect.arrayContaining([
      DEFAULT_WORKSPACE_ID,
      sessionId,
      assetId,
      DEFAULT_USER_ID,
      "download_url_issued",
    ]));
    expect(storage.from).toHaveBeenCalledWith("component-attachments");
    expect(storage.download).toHaveBeenCalledWith(storagePath);
  });

  it("audits and serves component attachment downloads from R2 when Cloudflare storage is selected", async () => {
    vi.stubEnv("ARCHESTIMATOR_UPLOAD_STORAGE_PROVIDER", "cloudflare-r2");
    const attachmentId = "11111111-1111-4111-8111-111111111111";
    const assetId = "22222222-2222-4222-8222-222222222222";
    const sessionId = "33333333-3333-4333-8333-333333333333";
    const storagePath = `${DEFAULT_WORKSPACE_ID}/${DEFAULT_USER_ID}/spec.pdf`;
    const r2Body = new TextEncoder().encode("%PDF-1.7");
    const storage = mockStorageClient([], {
      attachmentLookupRow: {
        id: attachmentId,
        workspace_id: DEFAULT_WORKSPACE_ID,
        storage_bucket: "component-attachments",
        storage_path: storagePath,
        file_name: "spec.pdf",
        content_type: "application/pdf",
        size_bytes: 8,
        review_status: "approved",
        is_current_approved: true,
      },
      uploadAssetLookupRow: {
        id: assetId,
        upload_session_id: sessionId,
        workspace_id: DEFAULT_WORKSPACE_ID,
        surface: "component-attachment",
        storage_bucket: "component-attachments",
        storage_path: storagePath,
        status: "finalized",
        scan_status: "clean",
      },
    });
    const r2 = {
      put: vi.fn(async () => null),
      get: vi.fn(async () => ({
        size: r2Body.byteLength,
        httpMetadata: { contentType: "application/pdf" },
        arrayBuffer: async () => r2Body.buffer.slice(r2Body.byteOffset, r2Body.byteOffset + r2Body.byteLength),
      })),
      delete: vi.fn(async () => undefined),
    };
    cloudflareMocks.getCloudflareContext.mockResolvedValue({ env: { ARCH_UPLOADS_R2: r2 } });
    const { GET } = await import("@/app/api/component-library/attachments/route");

    const response = await GET(new Request(`http://localhost/api/component-library/attachments?id=${attachmentId}`));

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("application/pdf");
    await expect(response.text()).resolves.toBe("%PDF-1.7");
    expect(d1SqlStatements(storage.d1, /INSERT INTO upload_events/)[0]?.values).toEqual(expect.arrayContaining([
      sessionId,
      assetId,
      "download_url_issued",
    ]));
    expect(storage.download).not.toHaveBeenCalled();
    expect(r2.get).toHaveBeenCalledWith(`component-attachments/${storagePath}`);
  });

  it("removes only owned project image paths", async () => {
    const workspaceId = "11111111-1111-4111-8111-111111111111";
    const userId = "22222222-2222-4222-8222-222222222222";
    const projectId = "33333333-3333-4333-8333-333333333333";
    workspaceMocks.ensureDefaultWorkspace.mockResolvedValue({ workspace: { id: workspaceId } });
    authMocks.requireCurrentUserContext.mockResolvedValue({ userId });
    const storage = mockStorageClient();
    const projectLookup = mockProjectLookup({ id: projectId, workspace_id: workspaceId });
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
    expect(d1PreparedStatements(projectLookup.d1, /FROM projects project/)).toHaveLength(1);
    expect(storage.from).toHaveBeenCalledWith("project-images");
    expect(storage.remove).toHaveBeenCalledWith([
      `${workspaceId}/${userId}/project-images/${projectId}/image.webp`,
      `${workspaceId}/${userId}/project-images/${projectId}/image-thumb.webp`,
    ]);
  });

  it("rejects project image deletion when the user cannot edit the project", async () => {
    const workspaceId = "11111111-1111-4111-8111-111111111111";
    const userId = "22222222-2222-4222-8222-222222222222";
    const projectId = "33333333-3333-4333-8333-333333333333";
    workspaceMocks.ensureDefaultWorkspace.mockResolvedValue({ workspace: { id: workspaceId } });
    authMocks.requireCurrentUserContext.mockResolvedValue({ userId });
    const storage = mockStorageClient();
    const projectLookup = mockProjectLookup({ id: projectId, workspace_id: workspaceId }, { canEditProject: false });
    const { DELETE } = await import("@/app/api/projects/images/route");

    const response = await DELETE(createJsonRequest({
      paths: [`${workspaceId}/${userId}/project-images/${projectId}/image.webp`],
    }));

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({
      error: "You do not have permission to edit this project.",
    });
    expect(d1PreparedStatements(projectLookup.d1, /FROM projects project/)).toHaveLength(1);
    expect(storage.from).not.toHaveBeenCalled();
    expect(storage.remove).not.toHaveBeenCalled();
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
    expect(d1PreparedStatements(projectLookup.d1, /FROM projects\s+WHERE id = \?/)).toHaveLength(1);
    expect(d1PreparedStatements(projectLookup.d1, /FROM projects project/)).toHaveLength(1);
    expect(storage.from).toHaveBeenCalledWith("project-images");
    expect(storage.download).toHaveBeenCalledWith(path);
  });

  it("serves estimate row images when estimate access resolves without project-wide access", async () => {
    const workspaceId = "11111111-1111-4111-8111-111111111111";
    const ownerUserId = "22222222-2222-4222-8222-222222222222";
    const projectId = "33333333-3333-4333-8333-333333333333";
    const estimateId = "44444444-4444-4444-8444-444444444444";
    const path = `${workspaceId}/${ownerUserId}/project-images/${projectId}/estimate-row-images/${estimateId}/image.webp`;
    const storage = mockStorageClient();
    const projectLookup = mockProjectLookup(
      { id: projectId, workspace_id: workspaceId },
      { canAccessProject: false, canAccessEstimate: true },
      { id: estimateId },
    );
    const { GET } = await import("@/app/api/projects/images/route");

    const response = await GET(new Request(`http://localhost/api/projects/images?path=${encodeURIComponent(path)}`));

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("image/webp");
    expect(d1PreparedStatements(projectLookup.d1, /FROM projects\s+WHERE id = \?/)).toHaveLength(1);
    expect(d1PreparedStatements(projectLookup.d1, /FROM estimates\s+WHERE id = \?/)).toHaveLength(1);
    expect(d1PreparedStatements(projectLookup.d1, /FROM projects project/)).toHaveLength(1);
    expect(d1PreparedStatements(projectLookup.d1, /FROM estimates estimate/)).toHaveLength(1);
    expect(storage.from).toHaveBeenCalledWith("project-images");
    expect(storage.download).toHaveBeenCalledWith(path);
  });

  it("denies private project image downloads when the user lacks project access", async () => {
    const workspaceId = "11111111-1111-4111-8111-111111111111";
    const ownerUserId = "22222222-2222-4222-8222-222222222222";
    const projectId = "33333333-3333-4333-8333-333333333333";
    const path = `${workspaceId}/${ownerUserId}/project-images/${projectId}/image.webp`;
    const storage = mockStorageClient();
    const projectLookup = mockProjectLookup(
      { id: projectId, workspace_id: workspaceId },
      { canAccessProject: false },
    );
    const { GET } = await import("@/app/api/projects/images/route");

    const response = await GET(new Request(`http://localhost/api/projects/images?path=${encodeURIComponent(path)}`));

    expect(response.status).toBe(404);
    expect(response.headers.get("cache-control")).toBe("private, no-cache, no-store, max-age=0, must-revalidate");
    await expect(response.json()).resolves.toEqual({
      error: "Image could not be found.",
    });
    expect(d1PreparedStatements(projectLookup.d1, /FROM projects project/)).toHaveLength(1);
    expect(storage.from).not.toHaveBeenCalled();
    expect(storage.download).not.toHaveBeenCalled();
  });

  it("fails closed with no-store for malformed project image paths before auth", async () => {
    const projectLookup = mockProjectLookup();
    const storage = mockStorageClient();
    const { GET } = await import("@/app/api/projects/images/route");

    const response = await GET(new Request("http://localhost/api/projects/images?path=not-a-valid-private-path.webp"));

    expect(response.status).toBe(404);
    expect(response.headers.get("cache-control")).toBe("private, no-cache, no-store, max-age=0, must-revalidate");
    await expect(response.json()).resolves.toEqual({
      error: "Image could not be found.",
    });
    expect(authMocks.getCurrentUserContext).not.toHaveBeenCalled();
    expect(projectLookup.from).not.toHaveBeenCalled();
    expect(storage.from).not.toHaveBeenCalled();
  });

  it("fails closed with no-store for unauthenticated project image requests without redirecting", async () => {
    const workspaceId = "11111111-1111-4111-8111-111111111111";
    const ownerUserId = "22222222-2222-4222-8222-222222222222";
    const projectId = "33333333-3333-4333-8333-333333333333";
    const path = `${workspaceId}/${ownerUserId}/project-images/${projectId}/image.webp`;
    const projectLookup = mockProjectLookup({ id: projectId, workspace_id: workspaceId });
    const storage = mockStorageClient();
    authMocks.getCurrentUserContext.mockResolvedValue(null);
    const { GET } = await import("@/app/api/projects/images/route");

    const response = await GET(new Request(`http://localhost/api/projects/images?path=${encodeURIComponent(path)}`));

    expect(response.status).toBe(404);
    expect(response.headers.get("cache-control")).toBe("private, no-cache, no-store, max-age=0, must-revalidate");
    await expect(response.json()).resolves.toEqual({
      error: "Image could not be found.",
    });
    expect(projectLookup.from).not.toHaveBeenCalled();
    expect(storage.from).not.toHaveBeenCalled();
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
    expect(d1PreparedStatements(projectLookup.d1, /FROM projects\s+WHERE id = \?\s+AND workspace_id = \?/)).toHaveLength(1);
    expect(storage.from).not.toHaveBeenCalled();
    expect(storage.upload).not.toHaveBeenCalled();
  });

  it("rejects project image uploads when the user cannot edit the project before file decoding or storage writes", async () => {
    const storage = mockStorageClient();
    const projectLookup = mockProjectLookup(
      { id: "project-1", workspace_id: DEFAULT_WORKSPACE_ID },
      { canEditProject: false },
    );
    const file = new window.File(["not decoded"], "project.png", { type: "image/png" });
    const arrayBuffer = vi.spyOn(file, "arrayBuffer");
    const formData = new FormData();
    formData.set("projectId", "project-1");
    formData.set("file", file);
    const { POST } = await import("@/app/api/projects/images/route");

    const response = await POST(createFormRequest(formData));

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({
      error: "You do not have permission to edit this project.",
    });
    expect(d1PreparedStatements(projectLookup.d1, /FROM projects\s+WHERE id = \?\s+AND workspace_id = \?/)).toHaveLength(1);
    expect(d1PreparedStatements(projectLookup.d1, /FROM projects project/)).toHaveLength(1);
    expect(arrayBuffer).not.toHaveBeenCalled();
    expect(storage.from).not.toHaveBeenCalled();
    expect(storage.upload).not.toHaveBeenCalled();
  });

  it("rejects estimate row image uploads before parsing bodies when auth fails", async () => {
    authMocks.requireCurrentUserContext.mockRejectedValue(new Error("NEXT_REDIRECT:/login"));
    const request = createUnparsedFormRequest();
    const { POST } = await import("@/app/api/estimate-row-images/route");

    await expect(POST(request)).rejects.toThrow("NEXT_REDIRECT:/login");

    expect(request.formData).not.toHaveBeenCalled();
  });

  it("rejects estimate row image uploads for estimates outside the current project before file decoding or storage writes", async () => {
    const storage = mockStorageClient();
    const projectLookup = mockProjectLookup(
      { id: "project-1", workspace_id: DEFAULT_WORKSPACE_ID },
      {},
      { id: "estimate-2", project_id: "other-project" },
    );
    const file = new window.File(["not decoded"], "estimate-row.png", { type: "image/png" });
    const arrayBuffer = vi.spyOn(file, "arrayBuffer");
    const formData = new FormData();
    formData.set("projectId", "project-1");
    formData.set("estimateId", "estimate-2");
    formData.set("rowItemId", "row-1");
    formData.set("file", file);
    const { POST } = await import("@/app/api/estimate-row-images/route");

    const response = await POST(createFormRequest(formData));

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({
      error: "Estimate could not be found.",
    });
    expect(d1PreparedStatements(projectLookup.d1, /FROM projects\s+WHERE id = \?\s+AND workspace_id = \?/)).toHaveLength(1);
    expect(d1PreparedStatements(projectLookup.d1, /FROM estimates\s+WHERE id = \?\s+AND project_id = \?/)).toHaveLength(1);
    expect(arrayBuffer).not.toHaveBeenCalled();
    expect(storage.from).not.toHaveBeenCalled();
    expect(storage.upload).not.toHaveBeenCalled();
  });

  it("rejects estimate row image uploads when the user can neither edit the project nor the estimate", async () => {
    const storage = mockStorageClient();
    const projectLookup = mockProjectLookup(
      { id: "project-1", workspace_id: DEFAULT_WORKSPACE_ID },
      { canEditProject: false, canEditEstimate: false },
    );
    const file = new window.File(["not decoded"], "estimate-row.png", { type: "image/png" });
    const arrayBuffer = vi.spyOn(file, "arrayBuffer");
    const formData = new FormData();
    formData.set("projectId", "project-1");
    formData.set("estimateId", "estimate-1");
    formData.set("rowItemId", "row-1");
    formData.set("file", file);
    const { POST } = await import("@/app/api/estimate-row-images/route");

    const response = await POST(createFormRequest(formData));

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({
      error: "You do not have permission to edit this estimate.",
    });
    expect(d1PreparedStatements(projectLookup.d1, /FROM projects\s+WHERE id = \?\s+AND workspace_id = \?/)).toHaveLength(1);
    expect(d1PreparedStatements(projectLookup.d1, /FROM estimates\s+WHERE id = \?\s+AND project_id = \?/)).toHaveLength(1);
    expect(d1PreparedStatements(projectLookup.d1, /FROM projects project/)).toHaveLength(1);
    expect(d1PreparedStatements(projectLookup.d1, /FROM estimates estimate/)).toHaveLength(1);
    expect(projectLookup.rpc).not.toHaveBeenCalled();
    expect(arrayBuffer).not.toHaveBeenCalled();
    expect(storage.from).not.toHaveBeenCalled();
    expect(storage.upload).not.toHaveBeenCalled();
  });

  it("rejects estimate row image uploads for stale rows before file decoding or storage writes", async () => {
    const storage = mockStorageClient();
    const projectLookup = mockProjectLookup(
      { id: "project-1", workspace_id: DEFAULT_WORKSPACE_ID },
      { canEditProject: true, canEditEstimate: true },
    );
    projectLookup.d1.estimateRowLookupRow = null;
    const file = new window.File(["not decoded"], "estimate-row.png", { type: "image/png" });
    const arrayBuffer = vi.spyOn(file, "arrayBuffer");
    const formData = new FormData();
    formData.set("projectId", "project-1");
    formData.set("estimateId", "estimate-1");
    formData.set("rowItemId", "stale-row");
    formData.set("file", file);
    const { POST } = await import("@/app/api/estimate-row-images/route");

    const response = await POST(createFormRequest(formData));

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({
      error: "Estimate row could not be found.",
    });
    expect(d1PreparedStatements(projectLookup.d1, /FROM estimate_row_items/)).toHaveLength(1);
    expect(arrayBuffer).not.toHaveBeenCalled();
    expect(storage.from).not.toHaveBeenCalled();
    expect(storage.upload).not.toHaveBeenCalled();
  });
});
