import { readFileSync } from "node:fs";
import { join } from "node:path";

import { beforeEach, describe, expect, it, vi } from "vitest";

import type { UploadOperationalTelemetryRecord } from "@/lib/uploads/operational-telemetry";

const authMocks = vi.hoisted(() => ({
  requireCurrentUserContext: vi.fn(),
}));

const authzMocks = vi.hoisted(() => ({
  canEditProjectInD1: vi.fn(),
  isWorkspaceEditorInD1: vi.fn(),
  readProjectFromD1: vi.fn(),
}));

const workspaceMocks = vi.hoisted(() => ({
  ensureDefaultWorkspace: vi.fn(),
}));

const cloudflareMocks = vi.hoisted(() => ({
  getCloudflareContext: vi.fn(),
}));

const d1Mocks = vi.hoisted(() => ({
  getCloudflareD1Database: vi.fn(),
}));

vi.mock("@/lib/auth/session", () => authMocks);
vi.mock("@/lib/authz/d1-access", () => authzMocks);
vi.mock("@/lib/repositories/workspace-repository", () => workspaceMocks);
vi.mock("@opennextjs/cloudflare", () => cloudflareMocks);
vi.mock("@/lib/cloudflare/d1", () => d1Mocks);

const WORKSPACE_ID = "11111111-1111-4111-8111-111111111111";
const USER_ID = "22222222-2222-4222-8222-222222222222";
const SESSION_ID = "33333333-3333-4333-8333-333333333333";
const PROJECT_ID = "44444444-4444-4444-8444-444444444444";
const PROJECT_COMPONENT_ID = "55555555-5555-4555-8555-555555555555";
const PROJECT_WORKSPACE_ID = "66666666-6666-4666-8666-666666666666";

function createJsonRequest(body: Record<string, unknown>) {
  return new Request("http://localhost/api/component-library/attachments/direct-upload", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

function createUnparsedJsonRequest() {
  return {
    headers: new Headers({ "content-type": "application/json" }),
    json: vi.fn(async () => ({ action: "create" })),
  } as unknown as Request & { json: ReturnType<typeof vi.fn> };
}

function uploadSessionRow(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: SESSION_ID,
    workspace_id: WORKSPACE_ID,
    actor_user_id: USER_ID,
    surface: "component-attachment",
    target_entity_type: "component-library",
    target_entity_id: null,
    storage_bucket: "component-attachments",
    storage_path: `${WORKSPACE_ID}/${USER_ID}/signed-spec.pdf`,
    file_name: "spec.pdf",
    content_type: "application/pdf",
    size_bytes: 24 * 1024 * 1024,
    checksum_sha256: null,
    status: "reserved",
    expires_at: new Date(Date.now() + 300_000).toISOString(),
    metadata_json: JSON.stringify({ provider: "cloudflare-r2", uploadMode: "signed_single_part" }),
    ...overrides,
  };
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

  async first<R>() {
    if (this.sql.includes("FROM upload_sessions")) {
      return this.database.sessionRow as R | null;
    }
    if (this.sql.includes("FROM upload_assets")) {
      return this.database.existingAssetRow as R | null;
    }
    return null as R | null;
  }

  async all<R>() {
    if (!this.sql.includes("FROM upload_sessions")) {
      return { success: true, results: [] as R[] };
    }

    const actorScoped = this.sql.includes("actor_user_id = ?");
    const afterInsertAttempt = this.database.insertAttempted;
    const rows = actorScoped
      ? (afterInsertAttempt && this.database.postInsertActiveActorSessions
        ? this.database.postInsertActiveActorSessions
        : this.database.activeActorSessions)
      : (afterInsertAttempt && this.database.postInsertActiveWorkspaceSessions
        ? this.database.postInsertActiveWorkspaceSessions
        : this.database.activeWorkspaceSessions);
    return { success: true, results: rows as R[] };
  }

  async run() {
    this.database.runStatements.push(this);

    if (this.sql.includes("INSERT INTO upload_sessions")) {
      this.database.insertAttempted = true;
      if (this.database.insertSessionChanges > 0) {
        this.database.insertedSessions.push({
          id: this.values[0],
          workspace_id: this.values[1],
          actor_user_id: this.values[2],
          surface: this.values[3],
          target_entity_type: this.values[4],
          target_entity_id: this.values[5],
          storage_bucket: this.values[6],
          storage_path: this.values[7],
          file_name: this.values[8],
          content_type: this.values[9],
          size_bytes: this.values[10],
          checksum_sha256: this.values[11],
          expires_at: this.values[12],
          metadata_json: this.values[13],
        });
      }
      return { success: true, meta: { changes: this.database.insertSessionChanges } };
    }

    if (this.sql.includes("UPDATE upload_sessions")) {
      if (this.database.updateSessionChanges > 0 && this.database.sessionRow) {
        this.database.sessionRow = {
          ...this.database.sessionRow,
          status: "finalized",
          metadata_json: this.values[0],
        };
      }
      return { success: true, meta: { changes: this.database.updateSessionChanges } };
    }

    if (this.sql.includes("INSERT INTO upload_assets")) {
      this.database.insertedAssets.push({
        id: this.values[0],
        workspace_id: this.values[1],
        actor_user_id: this.values[2],
        project_id: this.values[3],
        upload_session_id: this.values[4],
        surface: this.values[5],
        target_entity_type: this.values[6],
        target_entity_id: this.values[7],
        file_name: this.values[8],
        content_type: this.values[9],
        size_bytes: this.values[10],
        checksum_sha256: this.values[11],
        scan_status: this.values[12],
        storage_bucket: this.values[13],
        storage_path: this.values[14],
        metadata_json: this.values[15],
      });
      this.database.existingAssetRow = {
        id: this.values[0],
        upload_session_id: this.values[4],
        scan_status: this.values[12],
      };
      return { success: true, meta: { changes: 1 } };
    }

    if (this.sql.includes("INSERT INTO upload_events")) {
      const sessionOnlyEvent = this.sql.includes("SELECT ?, ?, NULL");
      if (sessionOnlyEvent && this.database.insertSessionChanges === 0) {
        return { success: true, meta: { changes: 0 } };
      }
      this.database.insertedEvents.push(sessionOnlyEvent
        ? {
          id: this.values[0],
          upload_session_id: this.values[1],
          upload_asset_id: null,
          workspace_id: this.values[2],
          actor_user_id: this.values[3],
          event_type: this.values[4],
          metadata_json: this.values[5],
        }
        : {
          id: this.values[0],
          upload_session_id: this.values[1],
          upload_asset_id: this.values[2] ?? null,
          workspace_id: this.values[3],
          actor_user_id: this.values[4],
          event_type: this.values[5],
          metadata_json: this.values[6],
        });
      return { success: true, meta: { changes: 1 } };
    }

    return { success: true, meta: { changes: 1 } };
  }
}

class FakeD1Database {
  activeActorSessions: Array<{ expires_at: string }> = [];
  activeWorkspaceSessions: Array<{ expires_at: string }> = [];
  batchCalls: FakeD1Statement[][] = [];
  existingAssetRow: Record<string, unknown> | null = null;
  insertedAssets: Record<string, unknown>[] = [];
  insertedEvents: Record<string, unknown>[] = [];
  insertedSessions: Record<string, unknown>[] = [];
  insertAttempted = false;
  insertSessionChanges = 1;
  postInsertActiveActorSessions: Array<{ expires_at: string }> | null = null;
  postInsertActiveWorkspaceSessions: Array<{ expires_at: string }> | null = null;
  runStatements: FakeD1Statement[] = [];
  sessionRow: Record<string, unknown> | null = uploadSessionRow();
  statements: FakeD1Statement[] = [];
  updateSessionChanges = 1;

  prepare(sql: string) {
    const statement = new FakeD1Statement(this, sql);
    this.statements.push(statement);
    return statement;
  }

  async batch(statements: FakeD1Statement[]) {
    this.batchCalls.push(statements);
    return Promise.all(statements.map((statement) => statement.run()));
  }
}

function mockUploadMetadataD1(options: {
  activeActorSessions?: Array<{ expires_at: string }>;
  activeWorkspaceSessions?: Array<{ expires_at: string }>;
  insertSessionChanges?: number;
  postInsertActiveActorSessions?: Array<{ expires_at: string }>;
  postInsertActiveWorkspaceSessions?: Array<{ expires_at: string }>;
  sessionRow?: Record<string, unknown> | null;
  updateSessionChanges?: number;
} = {}) {
  const database = new FakeD1Database();
  database.activeActorSessions = options.activeActorSessions ?? [];
  database.activeWorkspaceSessions = options.activeWorkspaceSessions ?? [];
  database.insertSessionChanges = options.insertSessionChanges ?? 1;
  database.postInsertActiveActorSessions = options.postInsertActiveActorSessions ?? null;
  database.postInsertActiveWorkspaceSessions = options.postInsertActiveWorkspaceSessions ?? null;
  database.sessionRow = options.sessionRow === undefined ? uploadSessionRow() : options.sessionRow;
  database.updateSessionChanges = options.updateSessionChanges ?? 1;
  d1Mocks.getCloudflareD1Database.mockResolvedValue(database);
  return database;
}

function mockR2Storage(options: {
  contentType?: string | null;
  sizeBytes?: number;
  etag?: string | null;
  checksumSha256?: string | null;
} = {}) {
  const object = {
    size: options.sizeBytes ?? 24 * 1024 * 1024,
    etag: options.etag ?? "r2-etag-proof",
    httpMetadata: {
      contentType: options.contentType ?? "application/pdf",
    },
    checksums: {
      toJSON: () => ({
        sha256: options.checksumSha256 ?? undefined,
      }),
    },
    arrayBuffer: vi.fn(async () => new ArrayBuffer(options.sizeBytes ?? 24 * 1024 * 1024)),
  };
  const r2 = {
    put: vi.fn(async () => ({ etag: "r2-put-etag" })),
    head: vi.fn(async () => object),
    get: vi.fn(async () => object),
    delete: vi.fn(async () => undefined),
  };
  cloudflareMocks.getCloudflareContext.mockResolvedValue({ env: { ARCH_UPLOADS_R2: r2 } });
  return r2;
}

beforeEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
  vi.unstubAllEnvs();
  vi.stubEnv("ARCHESTIMATOR_UPLOAD_STORAGE_PROVIDER", "cloudflare-r2");
  cloudflareMocks.getCloudflareContext.mockResolvedValue({ env: {} });
  workspaceMocks.ensureDefaultWorkspace.mockResolvedValue({
    workspace: { id: WORKSPACE_ID },
    profile: { id: USER_ID },
  });
  authMocks.requireCurrentUserContext.mockResolvedValue({ userId: USER_ID });
  authzMocks.canEditProjectInD1.mockResolvedValue(true);
  authzMocks.isWorkspaceEditorInD1.mockResolvedValue(true);
  authzMocks.readProjectFromD1.mockResolvedValue({ id: PROJECT_ID, workspace_id: PROJECT_WORKSPACE_ID });
  mockUploadMetadataD1();
});

describe("component attachment signed direct-upload route", () => {
  it("keeps direct-upload auth before JSON body parsing", async () => {
    authMocks.requireCurrentUserContext.mockRejectedValue(new Error("NEXT_REDIRECT:/login"));
    const request = createUnparsedJsonRequest();
    const { POST } = await import("@/app/api/component-library/attachments/direct-upload/route");

    await expect(POST(request)).rejects.toThrow("NEXT_REDIRECT:/login");

    expect(request.json).not.toHaveBeenCalled();
    expect(d1Mocks.getCloudflareD1Database).not.toHaveBeenCalled();
  });

  it("creates a signed single-part session in Cloudflare D1 without persisting URL tokens", async () => {
    const database = mockUploadMetadataD1();
    const { POST } = await import("@/app/api/component-library/attachments/direct-upload/route");

    const response = await POST(createJsonRequest({
      action: "create",
      fileName: "Signed Spec.PDF",
      contentType: "application/pdf",
      sizeBytes: 24 * 1024 * 1024,
    }));

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toMatchObject({
      provider: "cloudflare-r2",
      uploadMode: "signed_single_part",
      uploadSessionId: expect.stringMatching(/^[0-9a-f-]{36}$/),
      bucket: "component-attachments",
      path: expect.stringMatching(new RegExp(`^${WORKSPACE_ID}/${USER_ID}/signed-spec-[0-9a-f-]+\\.pdf$`)),
      uploadUrl: expect.stringContaining("/api/component-library/attachments/direct-upload?uploadSessionId="),
      method: "PUT",
      requiresFinalizeRpc: true,
      finalizeUrl: "/api/component-library/attachments/direct-upload",
      scanStatus: "pending",
    });
    expect(database.insertedSessions).toEqual([expect.objectContaining({
      workspace_id: WORKSPACE_ID,
      actor_user_id: USER_ID,
      surface: "component-attachment",
      storage_bucket: "component-attachments",
      file_name: "Signed Spec.PDF",
      content_type: "application/pdf",
      size_bytes: 24 * 1024 * 1024,
      metadata_json: expect.stringContaining("cloudflare-r2"),
    })]);
    expect(database.insertedEvents).toEqual([expect.objectContaining({
      event_type: "session_reserved",
      upload_asset_id: null,
    })]);
    expect(database.batchCalls).toHaveLength(1);
    expect(database.batchCalls[0]).toHaveLength(2);
    expect(JSON.stringify(database.insertedSessions)).not.toContain("secret-token");
    expect(JSON.stringify(database.insertedSessions)).not.toContain("signedUrl");
    expect(JSON.stringify(database.insertedSessions)).not.toContain("uploadUrl");
  });

  it("rejects unsupported create-time MIME types before provider or metadata access", async () => {
    const database = mockUploadMetadataD1();
    const { POST } = await import("@/app/api/component-library/attachments/direct-upload/route");

    const response = await POST(createJsonRequest({
      action: "create",
      fileName: "Unsafe Image.png",
      contentType: "image/png",
      sizeBytes: 24 * 1024 * 1024,
    }));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: "Use a PDF, XLS, or XLSX attachment.",
    });
    expect(d1Mocks.getCloudflareD1Database).not.toHaveBeenCalled();
    expect(cloudflareMocks.getCloudflareContext).not.toHaveBeenCalled();
    expect(database.insertedSessions).toEqual([]);
    expect(database.insertedAssets).toEqual([]);
    expect(database.insertedEvents).toEqual([]);
    expect(database.runStatements).toEqual([]);
    expect(database.batchCalls).toEqual([]);
  });

  it("keeps library direct-upload creation restricted to workspace editors", async () => {
    const database = mockUploadMetadataD1();
    authzMocks.isWorkspaceEditorInD1.mockResolvedValue(false);
    const { POST } = await import("@/app/api/component-library/attachments/direct-upload/route");

    const response = await POST(createJsonRequest({
      action: "create",
      fileName: "Library Spec.PDF",
      contentType: "application/pdf",
      sizeBytes: 24 * 1024 * 1024,
    }));

    expect(response.status).toBe(403);
    expect(authzMocks.isWorkspaceEditorInD1).toHaveBeenCalledWith(database, WORKSPACE_ID, { userId: USER_ID });
    expect(database.insertedSessions).toEqual([]);
  });

  it("derives a project attachment workspace server-side and reserves an immutable project target", async () => {
    const database = mockUploadMetadataD1();
    const { POST } = await import("@/app/api/component-library/attachments/direct-upload/route");

    const response = await POST(createJsonRequest({
      action: "create",
      workspaceId: WORKSPACE_ID,
      projectId: PROJECT_ID,
      projectComponentId: PROJECT_COMPONENT_ID,
      fileName: "Project Spec.PDF",
      contentType: "application/pdf",
      sizeBytes: 24 * 1024 * 1024,
    }));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      path: expect.stringMatching(new RegExp(`^${PROJECT_WORKSPACE_ID}/${USER_ID}/project-spec-`)),
    });
    expect(authzMocks.readProjectFromD1).toHaveBeenCalledWith(database, PROJECT_ID);
    expect(authzMocks.canEditProjectInD1).toHaveBeenCalledWith(database, PROJECT_ID, { userId: USER_ID });
    expect(workspaceMocks.ensureDefaultWorkspace).not.toHaveBeenCalled();
    expect(database.insertedSessions).toEqual([expect.objectContaining({
      workspace_id: PROJECT_WORKSPACE_ID,
      target_entity_type: "project-component",
      target_entity_id: PROJECT_COMPONENT_ID,
      metadata_json: expect.stringContaining(PROJECT_ID),
    })]);
    expect(JSON.stringify(database.insertedSessions)).not.toContain(`\"workspaceId\":\"${WORKSPACE_ID}\"`);
  });

  it("uploads a reserved single-part session body to Cloudflare R2 through the same-origin PUT URL", async () => {
    const storagePath = `${WORKSPACE_ID}/${USER_ID}/signed-spec.pdf`;
    mockUploadMetadataD1({
      sessionRow: uploadSessionRow({
        storage_path: storagePath,
        size_bytes: 4,
        content_type: "application/pdf",
      }),
    });
    const r2 = mockR2Storage({ sizeBytes: 4 });
    const { PUT } = await import("@/app/api/component-library/attachments/direct-upload/route");

    const response = await PUT(new Request(
      `http://localhost/api/component-library/attachments/direct-upload?uploadSessionId=${SESSION_ID}`,
      {
        method: "PUT",
        headers: { "content-type": "application/pdf" },
        body: new Uint8Array([0x25, 0x50, 0x44, 0x46]),
      },
    ));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      provider: "cloudflare-r2",
      uploadSessionId: SESSION_ID,
      bucket: "component-attachments",
      path: storagePath,
      sizeBytes: 4,
    });
    expect(r2.put).toHaveBeenCalledWith(
      `component-attachments/${storagePath}`,
      expect.any(Uint8Array),
      expect.objectContaining({
        httpMetadata: expect.objectContaining({
          contentType: "application/pdf",
        }),
      }),
    );
  });

  it("fails closed for resumable uploads until Cloudflare R2 multipart support is enabled", async () => {
    const database = mockUploadMetadataD1();
    const { POST } = await import("@/app/api/component-library/attachments/direct-upload/route");

    const response = await POST(createJsonRequest({
      action: "create",
      fileName: "Large Spec.PDF",
      contentType: "application/pdf",
      sizeBytes: 80 * 1024 * 1024,
    }));

    expect(response.status).toBe(501);
    await expect(response.json()).resolves.toEqual({
      error: "Something went wrong. Try again in a moment.",
    });
    expect(database.insertedSessions).toEqual([]);
  });

  it("ignores forged cross-workspace direct-upload workspace IDs and uses the server-derived workspace", async () => {
    const database = mockUploadMetadataD1();
    const { POST } = await import("@/app/api/component-library/attachments/direct-upload/route");

    const response = await POST(createJsonRequest({
      action: "create",
      workspaceId: "workspace-2",
      fileName: "Forged Workspace Spec.PDF",
      contentType: "application/pdf",
      sizeBytes: 24 * 1024 * 1024,
    }));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.path).toEqual(expect.stringMatching(new RegExp(`^${WORKSPACE_ID}/${USER_ID}/`)));
    expect(body.path).not.toContain("workspace-2");
    expect(database.insertedSessions[0]).toEqual(expect.objectContaining({
      workspace_id: WORKSPACE_ID,
      actor_user_id: USER_ID,
      storage_path: expect.stringMatching(new RegExp(`^${WORKSPACE_ID}/${USER_ID}/`)),
    }));
    expect(JSON.stringify(database.insertedSessions)).not.toContain("workspace-2");
  });

  it("fails closed before opening upload metadata when Cloudflare R2 is not selected", async () => {
    vi.stubEnv("ARCHESTIMATOR_UPLOAD_STORAGE_PROVIDER", "supabase");
    const database = mockUploadMetadataD1();
    const { POST } = await import("@/app/api/component-library/attachments/direct-upload/route");

    const response = await POST(createJsonRequest({
      action: "create",
      fileName: "Signed Spec.PDF",
      contentType: "application/pdf",
      sizeBytes: 24 * 1024 * 1024,
    }));

    expect(response.status).toBe(501);
    await expect(response.json()).resolves.toEqual({
      error: "Something went wrong. Try again in a moment.",
    });
    expect(d1Mocks.getCloudflareD1Database).not.toHaveBeenCalled();
    expect(database.insertedSessions).toEqual([]);
  });

  it("keeps small attachments on the existing server-mediated route", async () => {
    const database = mockUploadMetadataD1();
    const { POST } = await import("@/app/api/component-library/attachments/direct-upload/route");

    const response = await POST(createJsonRequest({
      action: "create",
      fileName: "Small Spec.PDF",
      contentType: "application/pdf",
      sizeBytes: 1024,
    }));

    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toEqual({
      error: "Use the standard attachment upload for files up to 20 MB.",
    });
    expect(database.insertedSessions).toEqual([]);
  });

  it("blocks signed session creation when the actor has too many reserved direct-upload sessions", async () => {
    const telemetry: UploadOperationalTelemetryRecord[] = [];
    const { setUploadOperationalTelemetrySink } = await import("@/lib/uploads/operational-telemetry");
    setUploadOperationalTelemetrySink((record) => telemetry.push(record));
    const database = mockUploadMetadataD1({
      activeActorSessions: Array.from({ length: 3 }, () => ({
        expires_at: new Date(Date.now() + 120_000).toISOString(),
      })),
      activeWorkspaceSessions: Array.from({ length: 3 }, () => ({
        expires_at: new Date(Date.now() + 120_000).toISOString(),
      })),
    });
    const { POST } = await import("@/app/api/component-library/attachments/direct-upload/route");

    const response = await POST(createJsonRequest({
      action: "create",
      fileName: "Signed Spec.PDF",
      contentType: "application/pdf",
      sizeBytes: 24 * 1024 * 1024,
    }));

    expect(response.status).toBe(429);
    expect(response.headers.get("Retry-After")).toMatch(/^\d+$/);
    await expect(response.json()).resolves.toEqual({
      error: "Too many attachment upload sessions are already reserved. Finish or retry after one expires.",
    });
    expect(database.insertedSessions).toEqual([]);
    expect(telemetry).toEqual([expect.objectContaining({
      event: "upload_quota_exceeded",
      source: "admission-control",
      surface: "component-attachment",
      workspaceId: WORKSPACE_ID,
      status: "blocked",
      severity: "warning",
      quotaClass: "active_actor",
      backpressureReason: "active_actor",
    })]);
    expect(JSON.stringify(telemetry)).not.toContain("signed-spec");
    expect(JSON.stringify(telemetry)).not.toContain("secret-token");
  });

  it("blocks signed session creation when workspace reserved direct-upload capacity is full", async () => {
    const telemetry: UploadOperationalTelemetryRecord[] = [];
    const { setUploadOperationalTelemetrySink } = await import("@/lib/uploads/operational-telemetry");
    setUploadOperationalTelemetrySink((record) => telemetry.push(record));
    const database = mockUploadMetadataD1({
      activeActorSessions: [],
      activeWorkspaceSessions: Array.from({ length: 6 }, () => ({
        expires_at: new Date(Date.now() + 180_000).toISOString(),
      })),
    });
    const { POST } = await import("@/app/api/component-library/attachments/direct-upload/route");

    const response = await POST(createJsonRequest({
      action: "create",
      fileName: "Signed Spec.PDF",
      contentType: "application/pdf",
      sizeBytes: 24 * 1024 * 1024,
    }));

    expect(response.status).toBe(429);
    expect(response.headers.get("Retry-After")).toMatch(/^\d+$/);
    await expect(response.json()).resolves.toEqual({
      error: "Attachment upload capacity is busy for this workspace. Wait for an upload session to finish or expire.",
    });
    expect(database.insertedSessions).toEqual([]);
    expect(telemetry).toEqual([expect.objectContaining({
      event: "upload_backpressure_rejected",
      source: "admission-control",
      surface: "component-attachment",
      workspaceId: WORKSPACE_ID,
      status: "blocked",
      severity: "warning",
      quotaClass: "active_workspace",
      backpressureReason: "active_workspace",
    })]);
    expect(JSON.stringify(telemetry)).not.toContain("signed-spec");
    expect(JSON.stringify(telemetry)).not.toContain("secret-token");
  });

  it("maps atomic D1 capacity rejection to a direct-upload backpressure response", async () => {
    const telemetry: UploadOperationalTelemetryRecord[] = [];
    const { setUploadOperationalTelemetrySink } = await import("@/lib/uploads/operational-telemetry");
    setUploadOperationalTelemetrySink((record) => telemetry.push(record));
    const database = mockUploadMetadataD1({
      activeActorSessions: [],
      activeWorkspaceSessions: [],
      insertSessionChanges: 0,
      postInsertActiveActorSessions: Array.from({ length: 3 }, () => ({
        expires_at: new Date(Date.now() + 300_000).toISOString(),
      })),
    });
    const { POST } = await import("@/app/api/component-library/attachments/direct-upload/route");

    const response = await POST(createJsonRequest({
      action: "create",
      fileName: "Signed Spec.PDF",
      contentType: "application/pdf",
      sizeBytes: 24 * 1024 * 1024,
    }));

    expect(response.status).toBe(429);
    expect(response.headers.get("Retry-After")).toBe("300");
    await expect(response.json()).resolves.toEqual({
      error: "Too many attachment upload sessions are already reserved. Finish or retry after one expires.",
    });
    expect(database.insertedSessions).toEqual([]);
    expect(database.runStatements.some((statement) => statement.sql.includes("INSERT INTO upload_sessions"))).toBe(true);
    expect(telemetry).toEqual([expect.objectContaining({
      event: "upload_quota_exceeded",
      source: "admission-control",
      surface: "component-attachment",
      workspaceId: WORKSPACE_ID,
      status: "blocked",
      severity: "warning",
      quotaClass: "active_actor",
      backpressureReason: "active_actor",
    })]);
    expect(JSON.stringify(telemetry)).not.toContain("signed-spec");
    expect(JSON.stringify(telemetry)).not.toContain("secret-token");
  });

  it("finalizes a signed upload only after provider object-head validation", async () => {
    const database = mockUploadMetadataD1();
    const r2 = mockR2Storage();
    const { POST } = await import("@/app/api/component-library/attachments/direct-upload/route");

    const response = await POST(createJsonRequest({
      action: "finalize",
      uploadSessionId: SESSION_ID,
    }));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      bucket: "component-attachments",
      uploadSessionId: SESSION_ID,
      assetId: expect.stringMatching(/^[0-9a-f-]{36}$/),
      scanStatus: "pending",
      path: `${WORKSPACE_ID}/${USER_ID}/signed-spec.pdf`,
      providerProof: "etag",
    });
    expect(r2.head).toHaveBeenCalledWith(`component-attachments/${WORKSPACE_ID}/${USER_ID}/signed-spec.pdf`);
    expect(database.insertedAssets).toEqual([expect.objectContaining({
      upload_session_id: SESSION_ID,
      workspace_id: WORKSPACE_ID,
      actor_user_id: USER_ID,
      scan_status: "pending",
      storage_bucket: "component-attachments",
      storage_path: `${WORKSPACE_ID}/${USER_ID}/signed-spec.pdf`,
      metadata_json: expect.stringContaining("providerFinalizeProof"),
    })]);
    expect(database.insertedEvents).toEqual([expect.objectContaining({
      event_type: "scan_pending",
      upload_session_id: SESSION_ID,
      metadata_json: expect.stringContaining("providerFinalizeProof"),
    })]);
    expect(database.batchCalls).toHaveLength(1);
    expect(database.batchCalls[0]).toHaveLength(3);
  });

  it("repairs a finalized direct-upload session that is missing its asset", async () => {
    const database = mockUploadMetadataD1({
      sessionRow: uploadSessionRow({ status: "finalized" }),
    });
    const r2 = mockR2Storage();
    const { POST } = await import("@/app/api/component-library/attachments/direct-upload/route");

    const response = await POST(createJsonRequest({
      action: "finalize",
      uploadSessionId: SESSION_ID,
    }));

    expect(response.status).toBe(200);
    expect(r2.head).toHaveBeenCalledWith(
      `component-attachments/${WORKSPACE_ID}/${USER_ID}/signed-spec.pdf`,
    );
    expect(database.insertedAssets).toEqual([
      expect.objectContaining({ upload_session_id: SESSION_ID }),
    ]);
    expect(database.insertedEvents).toEqual([
      expect.objectContaining({
        upload_session_id: SESSION_ID,
        event_type: "scan_pending",
      }),
    ]);
    expect(database.batchCalls).toHaveLength(1);
    expect(database.batchCalls[0]).toHaveLength(3);
  });

  it("authorizes finalization from the immutable session target and copies project ownership to the asset", async () => {
    const storagePath = `${PROJECT_WORKSPACE_ID}/${USER_ID}/project-spec.pdf`;
    const database = mockUploadMetadataD1({
      sessionRow: uploadSessionRow({
        workspace_id: PROJECT_WORKSPACE_ID,
        target_entity_type: "project-component",
        target_entity_id: PROJECT_COMPONENT_ID,
        storage_path: storagePath,
        metadata_json: JSON.stringify({
          provider: "cloudflare-r2",
          uploadMode: "signed_single_part",
          projectId: PROJECT_ID,
          projectComponentId: PROJECT_COMPONENT_ID,
        }),
      }),
    });
    mockR2Storage();
    const { POST } = await import("@/app/api/component-library/attachments/direct-upload/route");

    const response = await POST(createJsonRequest({
      action: "finalize",
      uploadSessionId: SESSION_ID,
      projectId: "77777777-7777-4777-8777-777777777777",
      projectComponentId: "88888888-8888-4888-8888-888888888888",
    }));

    expect(response.status).toBe(200);
    expect(authzMocks.canEditProjectInD1).toHaveBeenCalledWith(database, PROJECT_ID, { userId: USER_ID });
    expect(workspaceMocks.ensureDefaultWorkspace).not.toHaveBeenCalled();
    expect(database.insertedAssets).toEqual([expect.objectContaining({
      workspace_id: PROJECT_WORKSPACE_ID,
      project_id: PROJECT_ID,
      target_entity_type: "project-component",
      target_entity_id: PROJECT_COMPONENT_ID,
      storage_path: storagePath,
      metadata_json: expect.stringContaining(PROJECT_COMPONENT_ID),
    })]);
    expect(JSON.stringify(database.insertedAssets)).not.toContain("77777777-7777-4777-8777-777777777777");
    expect(JSON.stringify(database.insertedAssets)).not.toContain("88888888-8888-4888-8888-888888888888");
  });

  it("blocks project-target finalization when current project edit access is gone", async () => {
    const database = mockUploadMetadataD1({
      sessionRow: uploadSessionRow({
        workspace_id: PROJECT_WORKSPACE_ID,
        target_entity_type: "project-component",
        target_entity_id: PROJECT_COMPONENT_ID,
        metadata_json: JSON.stringify({
          provider: "cloudflare-r2",
          uploadMode: "signed_single_part",
          projectId: PROJECT_ID,
          projectComponentId: PROJECT_COMPONENT_ID,
        }),
      }),
    });
    authzMocks.canEditProjectInD1.mockResolvedValue(false);
    const r2 = mockR2Storage();
    const { POST } = await import("@/app/api/component-library/attachments/direct-upload/route");

    const response = await POST(createJsonRequest({
      action: "finalize",
      uploadSessionId: SESSION_ID,
    }));

    expect(response.status).toBe(403);
    expect(r2.head).not.toHaveBeenCalled();
    expect(database.insertedAssets).toEqual([]);
  });

  it("refuses legacy provider direct-upload sessions after switching the route to Cloudflare R2", async () => {
    const database = mockUploadMetadataD1({
      sessionRow: uploadSessionRow({
        metadata_json: JSON.stringify({ provider: "legacy-storage", uploadMode: "signed_single_part" }),
      }),
    });
    const { POST } = await import("@/app/api/component-library/attachments/direct-upload/route");

    const response = await POST(createJsonRequest({
      action: "finalize",
      uploadSessionId: SESSION_ID,
    }));

    expect(response.status).toBe(501);
    await expect(response.json()).resolves.toEqual({
      error: "Something went wrong. Try again in a moment.",
    });
    expect(database.insertedAssets).toEqual([]);
  });

  it("finalizes a TUS resumable upload with the larger session cap and recorded mode", async () => {
    const database = mockUploadMetadataD1({
      sessionRow: uploadSessionRow({
        size_bytes: 80 * 1024 * 1024,
        metadata_json: JSON.stringify({ provider: "cloudflare-r2", uploadMode: "tus_resumable" }),
      }),
    });
    const r2 = mockR2Storage({ sizeBytes: 80 * 1024 * 1024, etag: "r2-tus-etag-proof" });
    const { POST } = await import("@/app/api/component-library/attachments/direct-upload/route");

    const response = await POST(createJsonRequest({
      action: "finalize",
      uploadSessionId: SESSION_ID,
    }));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      bucket: "component-attachments",
      uploadSessionId: SESSION_ID,
      assetId: expect.stringMatching(/^[0-9a-f-]{36}$/),
      scanStatus: "pending",
      path: `${WORKSPACE_ID}/${USER_ID}/signed-spec.pdf`,
      providerProof: "etag",
    });
    expect(database.insertedAssets[0]).toEqual(expect.objectContaining({
      size_bytes: 80 * 1024 * 1024,
      scan_status: "pending",
      metadata_json: expect.stringContaining("tus_resumable"),
    }));
    expect(r2.head).toHaveBeenCalledWith(`component-attachments/${WORKSPACE_ID}/${USER_ID}/signed-spec.pdf`);
  });

  it("refuses finalization when provider object-head readback does not match the session", async () => {
    const database = mockUploadMetadataD1();
    mockR2Storage({
      contentType: "application/vnd.ms-excel",
      sizeBytes: 24 * 1024 * 1024,
      etag: "r2-etag-proof",
    });
    const { POST } = await import("@/app/api/component-library/attachments/direct-upload/route");

    const response = await POST(createJsonRequest({
      action: "finalize",
      uploadSessionId: SESSION_ID,
    }));

    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toEqual({
      error: "Uploaded object could not be finalized.",
    });
    expect(database.insertedAssets).toEqual([]);
  });
});

describe("signed direct-upload session migration contract", () => {
  it("defines the Cloudflare D1 upload metadata tables needed by direct-upload sessions", () => {
    const migration = readFileSync(join(process.cwd(), "migrations/0010_upload_metadata.sql"), "utf8");

    expect(migration).toContain("CREATE TABLE IF NOT EXISTS upload_sessions");
    expect(migration).toContain("CREATE TABLE IF NOT EXISTS upload_assets");
    expect(migration).toContain("CREATE TABLE IF NOT EXISTS upload_events");
    expect(migration).toContain("idx_upload_sessions_active_capacity");
    expect(migration).toContain("status IN (");
    expect(migration).toContain("'reserved'");
    expect(migration).toContain("'finalized'");
    expect(migration).toContain("metadata_json TEXT NOT NULL DEFAULT '{}'");
  });

  it("keeps the direct-upload route and D1 helper off provider RPC/service-role paths", () => {
    const route = readFileSync(join(
      process.cwd(),
      "src/app/api/component-library/attachments/direct-upload/route.ts",
    ), "utf8");
    const helper = readFileSync(join(process.cwd(), "src/lib/uploads/direct-upload-records.ts"), "utf8");

    expect(route).toContain("getCloudflareD1Database");
    expect(route).not.toContain("@supabase/supabase-js");
    expect(route).not.toContain("SUPABASE_SERVICE_ROLE_KEY");
    expect(route).not.toMatch(/\.rpc\s*\(/);
    expect(helper).toContain("INSERT INTO upload_sessions");
    expect(helper).toContain("INSERT INTO upload_assets");
    expect(helper).toContain("INSERT INTO upload_events");
    expect(helper).not.toMatch(/\.rpc\s*\(/);
    expect(helper).not.toContain("create_upload_session");
    expect(helper).not.toContain("finalize_upload_session");
  });
});
