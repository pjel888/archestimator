import { readFileSync } from "node:fs";
import { join } from "node:path";

import { beforeEach, describe, expect, it, vi } from "vitest";

import type { UploadOperationalTelemetryRecord } from "@/lib/uploads/operational-telemetry";

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

const WORKSPACE_ID = "11111111-1111-4111-8111-111111111111";
const USER_ID = "22222222-2222-4222-8222-222222222222";
const SESSION_ID = "33333333-3333-4333-8333-333333333333";
const ASSET_ID = "44444444-4444-4444-8444-444444444444";

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

function mockServerRpc(canManageLibrary = true) {
  const rpc = vi.fn(async (name: string) => {
    if (name === "is_workspace_editor") return { data: canManageLibrary, error: null };
    return { data: null, error: { message: `Unexpected rpc ${name}` } };
  });
  supabaseServerMocks.createSupabaseServerClient.mockResolvedValue({ rpc });
  return { rpc };
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
    metadata: {},
    ...overrides,
  };
}

function decodeTusUploadMetadata(metadata: string) {
  return Object.fromEntries(metadata.split(",").map((entry) => {
    const [key, encodedValue] = entry.split(" ");
    return [key, Buffer.from(encodedValue ?? "", "base64").toString("utf8")];
  }));
}

function mockDirectStorageClient(options: {
  sessionRow?: Record<string, unknown> | null;
  objectInfo?: Record<string, unknown> | null;
  objectInfoError?: { message: string } | null;
  activeActorSessions?: Array<{ expires_at: string }>;
  activeWorkspaceSessions?: Array<{ expires_at: string }>;
  createSessionError?: { message: string; code?: string };
} = {}) {
  const createSignedUploadUrl = vi.fn(async (path: string) => ({
    data: {
      signedUrl: `https://example.supabase.co/storage/v1/object/upload/sign/component-attachments/${path}?token=secret-token`,
      token: "secret-token",
      path,
    },
    error: null,
  }));
  const info = vi.fn(async () => ({
    data: options.objectInfo ?? {
      contentType: "application/pdf",
      size: 24 * 1024 * 1024,
      etag: "etag-proof",
    },
    error: options.objectInfoError ?? null,
  }));
  const storageFrom = vi.fn(() => ({ createSignedUploadUrl, info }));
  const rpc = vi.fn(async (name: string, args?: Record<string, unknown>) => {
    if (name === "create_upload_session") {
      if (options.createSessionError) {
        return { data: null, error: options.createSessionError };
      }
      return {
        data: { uploadSessionId: SESSION_ID, expiresAt: args?.session_expires_at },
        error: null,
      };
    }
    if (name === "finalize_upload_session") {
      return {
        data: { uploadSessionId: SESSION_ID, assetId: ASSET_ID, scanStatus: args?.scan_status ?? "pending" },
        error: null,
      };
    }
    return { data: null, error: { message: `Unexpected rpc ${name}` } };
  });
  const filters = new Map<string, unknown>();
  const query = {
    select: vi.fn(() => query),
    eq: vi.fn((column: string, value: unknown) => {
      filters.set(column, value);
      return query;
    }),
    gt: vi.fn(async () => {
      const isActorScoped = filters.has("actor_user_id");
      filters.clear();
      return {
        data: isActorScoped
          ? (options.activeActorSessions ?? [])
          : (options.activeWorkspaceSessions ?? []),
        error: null,
      };
    }),
    maybeSingle: vi.fn(async () => {
      filters.clear();
      return { data: options.sessionRow ?? uploadSessionRow(), error: null };
    }),
  };
  const from = vi.fn(() => query);
  const client = { from, rpc, storage: { from: storageFrom } };
  supabaseJsMocks.createClient.mockReturnValue(client);
  return {
    client,
    storageFrom,
    createSignedUploadUrl,
    info,
    rpc,
    from,
    query,
  };
}

beforeEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
  vi.unstubAllEnvs();
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://example.supabase.co");
  vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "service-role");
  workspaceMocks.ensureDefaultWorkspace.mockResolvedValue({ workspace: { id: WORKSPACE_ID } });
  authMocks.requireCurrentUserContext.mockResolvedValue({ userId: USER_ID });
  mockServerRpc();
});

describe("component attachment signed direct-upload route", () => {
  it("keeps direct-upload auth and library authorization before JSON body parsing", async () => {
    authMocks.requireCurrentUserContext.mockRejectedValue(new Error("NEXT_REDIRECT:/login"));
    const request = createUnparsedJsonRequest();
    const { POST } = await import("@/app/api/component-library/attachments/direct-upload/route");

    await expect(POST(request)).rejects.toThrow("NEXT_REDIRECT:/login");

    expect(request.json).not.toHaveBeenCalled();
  });

  it("creates a signed single-part session without persisting the signed URL or token", async () => {
    const storage = mockDirectStorageClient();
    const { POST } = await import("@/app/api/component-library/attachments/direct-upload/route");

    const response = await POST(createJsonRequest({
      action: "create",
      fileName: "Signed Spec.PDF",
      contentType: "application/pdf",
      sizeBytes: 24 * 1024 * 1024,
    }));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      provider: "supabase-storage",
      uploadMode: "signed_single_part",
      uploadSessionId: SESSION_ID,
      bucket: "component-attachments",
      path: expect.stringMatching(new RegExp(`^${WORKSPACE_ID}/${USER_ID}/signed-spec-[0-9a-f-]+\\.pdf$`)),
      uploadUrl: expect.stringContaining("/object/upload/sign/component-attachments/"),
      method: "PUT",
      requiresFinalizeRpc: true,
      finalizeUrl: "/api/component-library/attachments/direct-upload",
      scanStatus: "pending",
    });
    expect(storage.createSignedUploadUrl).toHaveBeenCalledWith(
      expect.stringMatching(new RegExp(`^${WORKSPACE_ID}/${USER_ID}/signed-spec-[0-9a-f-]+\\.pdf$`)),
      { upsert: false },
    );
    expect(storage.rpc).toHaveBeenCalledWith("create_upload_session", expect.objectContaining({
      target_workspace_id: WORKSPACE_ID,
      actor_user_id: USER_ID,
      upload_surface: "component-attachment",
      storage_bucket: "component-attachments",
      file_name: "Signed Spec.PDF",
      content_type: "application/pdf",
      size_bytes: 24 * 1024 * 1024,
      metadata: expect.objectContaining({
        provider: "supabase-storage",
        uploadMode: "signed_single_part",
        route: "component-attachment-direct-upload",
      }),
    }));
    const createSessionCall = storage.rpc.mock.calls.find(([name]) => name === "create_upload_session");
    expect(JSON.stringify(createSessionCall?.[1]?.metadata)).not.toContain("secret-token");
    expect(JSON.stringify(createSessionCall?.[1]?.metadata)).not.toContain("signedUrl");
    expect(JSON.stringify(createSessionCall?.[1]?.metadata)).not.toContain("uploadUrl");
  });

  it("creates a signed TUS resumable session without persisting the token or upload location", async () => {
    const storage = mockDirectStorageClient();
    const { POST } = await import("@/app/api/component-library/attachments/direct-upload/route");

    const response = await POST(createJsonRequest({
      action: "create",
      fileName: "Large Spec.PDF",
      contentType: "application/pdf",
      sizeBytes: 80 * 1024 * 1024,
    }));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toMatchObject({
      provider: "supabase-storage",
      uploadMode: "tus_resumable",
      uploadSessionId: SESSION_ID,
      bucket: "component-attachments",
      path: expect.stringMatching(new RegExp(`^${WORKSPACE_ID}/${USER_ID}/large-spec-[0-9a-f-]+\\.pdf$`)),
      endpoint: "https://example.storage.supabase.co/storage/v1/upload/resumable/sign",
      uploadToken: "secret-token",
      chunkSizeBytes: 6 * 1024 * 1024,
      requiresFinalizeRpc: true,
      finalizeUrl: "/api/component-library/attachments/direct-upload",
      scanStatus: "pending",
    });
    expect(decodeTusUploadMetadata(body.uploadMetadata)).toEqual({
      bucketName: "component-attachments",
      objectName: body.path,
      contentType: "application/pdf",
      cacheControl: "3600",
    });
    expect(storage.createSignedUploadUrl).toHaveBeenCalledWith(
      expect.stringMatching(new RegExp(`^${WORKSPACE_ID}/${USER_ID}/large-spec-[0-9a-f-]+\\.pdf$`)),
      { upsert: false },
    );
    const createSessionCall = storage.rpc.mock.calls.find(([name]) => name === "create_upload_session");
    expect(createSessionCall?.[1]).toEqual(expect.objectContaining({
      size_bytes: 80 * 1024 * 1024,
      metadata: expect.objectContaining({
        provider: "supabase-storage",
        uploadMode: "tus_resumable",
        route: "component-attachment-direct-upload",
        chunkSizeBytes: 6 * 1024 * 1024,
      }),
    }));
    expect(JSON.stringify(createSessionCall?.[1]?.metadata)).not.toContain("secret-token");
    expect(JSON.stringify(createSessionCall?.[1]?.metadata)).not.toContain("signedUrl");
    expect(JSON.stringify(createSessionCall?.[1]?.metadata)).not.toContain("uploadUrl");
    expect(JSON.stringify(createSessionCall?.[1]?.metadata)).not.toContain("resumable/sign");
  });

  it("keeps small attachments on the existing server-mediated route", async () => {
    const storage = mockDirectStorageClient();
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
    expect(storage.createSignedUploadUrl).not.toHaveBeenCalled();
    expect(storage.rpc).not.toHaveBeenCalledWith("create_upload_session", expect.anything());
  });

  it("blocks signed session creation when the actor has too many reserved direct-upload sessions", async () => {
    const telemetry: UploadOperationalTelemetryRecord[] = [];
    const { setUploadOperationalTelemetrySink } = await import("@/lib/uploads/operational-telemetry");
    setUploadOperationalTelemetrySink((record) => telemetry.push(record));
    const storage = mockDirectStorageClient({
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
    expect(storage.createSignedUploadUrl).not.toHaveBeenCalled();
    expect(storage.rpc).not.toHaveBeenCalledWith("create_upload_session", expect.anything());
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
    const storage = mockDirectStorageClient({
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
    expect(storage.createSignedUploadUrl).not.toHaveBeenCalled();
    expect(storage.rpc).not.toHaveBeenCalledWith("create_upload_session", expect.anything());
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

  it("maps atomic create_upload_session capacity rejection to a direct-upload backpressure response", async () => {
    const telemetry: UploadOperationalTelemetryRecord[] = [];
    const { setUploadOperationalTelemetrySink } = await import("@/lib/uploads/operational-telemetry");
    setUploadOperationalTelemetrySink((record) => telemetry.push(record));
    const storage = mockDirectStorageClient({
      activeActorSessions: [],
      activeWorkspaceSessions: [],
      createSessionError: {
        message: "Upload direct session actor capacity exceeded.",
        code: "53300",
      },
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
    expect(storage.createSignedUploadUrl).toHaveBeenCalled();
    expect(storage.rpc).toHaveBeenCalledWith("create_upload_session", expect.objectContaining({
      target_workspace_id: WORKSPACE_ID,
      actor_user_id: USER_ID,
      upload_surface: "component-attachment",
    }));
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
    const storage = mockDirectStorageClient();
    const { POST } = await import("@/app/api/component-library/attachments/direct-upload/route");

    const response = await POST(createJsonRequest({
      action: "finalize",
      uploadSessionId: SESSION_ID,
    }));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      bucket: "component-attachments",
      uploadSessionId: SESSION_ID,
      assetId: ASSET_ID,
      scanStatus: "pending",
      path: `${WORKSPACE_ID}/${USER_ID}/signed-spec.pdf`,
      providerProof: "etag",
    });
    expect(storage.query.eq).toHaveBeenCalledWith("id", SESSION_ID);
    expect(storage.query.eq).toHaveBeenCalledWith("workspace_id", WORKSPACE_ID);
    expect(storage.query.eq).toHaveBeenCalledWith("actor_user_id", USER_ID);
    expect(storage.info).toHaveBeenCalledWith(`${WORKSPACE_ID}/${USER_ID}/signed-spec.pdf`);
    expect(storage.rpc).toHaveBeenCalledWith("finalize_upload_session", expect.objectContaining({
      target_upload_session_id: SESSION_ID,
      target_workspace_id: WORKSPACE_ID,
      actor_user_id: USER_ID,
      observed_content_type: "application/pdf",
      observed_size_bytes: 24 * 1024 * 1024,
      observed_etag: "etag-proof",
      scan_status: "pending",
      metadata: expect.objectContaining({
        providerFinalizeProof: "etag",
      }),
    }));
  });

  it("finalizes a TUS resumable upload with the larger session cap and recorded mode", async () => {
    const storage = mockDirectStorageClient({
      sessionRow: uploadSessionRow({
        size_bytes: 80 * 1024 * 1024,
        metadata: { provider: "supabase-storage", uploadMode: "tus_resumable" },
      }),
      objectInfo: {
        contentType: "application/pdf",
        size: 80 * 1024 * 1024,
        etag: "tus-etag-proof",
      },
    });
    const { POST } = await import("@/app/api/component-library/attachments/direct-upload/route");

    const response = await POST(createJsonRequest({
      action: "finalize",
      uploadSessionId: SESSION_ID,
    }));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      bucket: "component-attachments",
      uploadSessionId: SESSION_ID,
      assetId: ASSET_ID,
      scanStatus: "pending",
      path: `${WORKSPACE_ID}/${USER_ID}/signed-spec.pdf`,
      providerProof: "etag",
    });
    expect(storage.rpc).toHaveBeenCalledWith("finalize_upload_session", expect.objectContaining({
      target_upload_session_id: SESSION_ID,
      observed_size_bytes: 80 * 1024 * 1024,
      observed_etag: "tus-etag-proof",
      metadata: expect.objectContaining({
        provider: "supabase-storage",
        uploadMode: "tus_resumable",
        providerFinalizeProof: "etag",
      }),
    }));
  });

  it("refuses finalization when provider object-head readback does not match the session", async () => {
    const storage = mockDirectStorageClient({
      objectInfo: {
        contentType: "application/vnd.ms-excel",
        size: 24 * 1024 * 1024,
        etag: "etag-proof",
      },
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
    expect(storage.rpc).not.toHaveBeenCalledWith("finalize_upload_session", expect.anything());
  });
});

describe("signed direct-upload session migration contract", () => {
  it("adds pending direct-upload session and finalize RPCs without authenticated execute grants", () => {
    const migration = readFileSync(join(
      process.cwd(),
      "supabase/migrations/20260627032615_upload_direct_signed_session_rpcs.sql",
    ), "utf8");

    expect(migration).toContain("add column if not exists expires_at timestamptz");
    expect(migration).toContain("add column if not exists scan_status public.upload_scan_status");
    expect(migration).toContain("create or replace function public.create_upload_session");
    expect(migration).toContain("create or replace function public.finalize_upload_session");
    expect(migration).toContain("'reserved'");
    expect(migration).toContain("session_row.status <> 'reserved'");
    expect(migration).toContain("'session_reserved'");
    expect(migration).toContain("::public.upload_event_type");
    expect(migration).toContain("session_row.status = 'finalized'");
    expect(migration).toContain("Upload finalization requires checksum or ETag proof.");
    expect(migration).toContain("revoke execute on function public.create_upload_session");
    expect(migration).toContain("revoke execute on function public.finalize_upload_session");
    expect(migration).toContain("grant execute on function public.create_upload_session");
    expect(migration).toContain("to service_role");
    expect(migration).not.toMatch(/grant execute on function public\.create_upload_session[\s\S]+authenticated/);
    expect(migration).not.toMatch(/grant execute on function public\.finalize_upload_session[\s\S]+authenticated/);
  });

  it("enforces reserved direct-upload capacity inside create_upload_session atomically", () => {
    const migration = readFileSync(join(
      process.cwd(),
      "supabase/migrations/20260627151000_upload_direct_session_atomic_capacity.sql",
    ), "utf8");

    expect(migration).toContain("create or replace function public.create_upload_session");
    expect(migration).toContain("pg_advisory_xact_lock");
    expect(migration).toContain("hashtextextended('upload-session-capacity:'");
    expect(migration).toContain("active_actor_session_count >= 3");
    expect(migration).toContain("active_workspace_session_count >= 6");
    expect(migration).toContain("Upload direct session actor capacity exceeded.");
    expect(migration).toContain("Upload direct session workspace capacity exceeded.");
    expect(migration).toContain("insert into public.upload_sessions");
    expect(migration).toContain("'session_reserved'");
    expect(migration).toContain("grant execute on function public.create_upload_session");
    expect(migration).not.toMatch(/grant execute on function public\.create_upload_session[\s\S]+authenticated/);
  });
});
