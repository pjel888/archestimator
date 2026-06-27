import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  canApproveUploadScanOverride,
  parseUploadScanOverrideRequest,
} from "@/lib/uploads/scan-override";

const authMocks = vi.hoisted(() => ({
  requireCurrentUserContext: vi.fn(),
}));

const serviceRoleMocks = vi.hoisted(() => ({
  createSupabaseServiceRoleClient: vi.fn(),
}));

vi.mock("@/lib/auth/session", () => authMocks);
vi.mock("@/lib/supabase/service-role", () => serviceRoleMocks);
vi.mock("server-only", () => ({}));

const USER_ID = "22222222-2222-4222-8222-222222222222";
const ASSET_ID = "44444444-4444-4444-8444-444444444444";
const CHECKSUM_SHA256 = "a".repeat(64);
const EXPIRES_AT = "2030-01-01T00:00:00.000Z";

function overrideBody(overrides: Record<string, unknown> = {}) {
  return {
    assetId: ASSET_ID,
    expectedChecksumSha256: CHECKSUM_SHA256,
    reason: "Security review approved after supplier verification.",
    expiresAt: EXPIRES_AT,
    ...overrides,
  };
}

function createJsonRequest(body: unknown) {
  return new Request("http://localhost/api/component-library/attachments/scan-override", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

function createUnparsedRequest(body: unknown) {
  return {
    json: vi.fn(async () => body),
  } as unknown as Request & { json: ReturnType<typeof vi.fn> };
}

function mockCurrentUser(role = "admin") {
  authMocks.requireCurrentUserContext.mockResolvedValue({
    userId: USER_ID,
    email: "admin@example.com",
    role,
  });
}

function mockServiceRoleRpc(error: { message: string } | null = null) {
  const rpc = vi.fn(async () => ({
    data: {
      assetId: ASSET_ID,
      scanStatus: "override_approved",
      overrideExpiresAt: EXPIRES_AT,
    },
    error,
  }));
  const client = { rpc };
  serviceRoleMocks.createSupabaseServiceRoleClient.mockReturnValue(client);
  return { client, rpc };
}

beforeEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
});

describe("upload scan override route", () => {
  it("keeps override authority platform-admin scoped and validates audited fields", () => {
    expect(canApproveUploadScanOverride("ceo")).toBe(true);
    expect(canApproveUploadScanOverride("admin")).toBe(true);
    expect(canApproveUploadScanOverride("member")).toBe(false);

    const parsed = parseUploadScanOverrideRequest({
      assetId: ASSET_ID,
      expectedChecksumSha256: CHECKSUM_SHA256.toUpperCase(),
      reason: " Documented supplier evidence reviewed. ",
      expiresAt: "2030-01-01T00:00:00Z",
    }, new Date("2026-06-27T00:00:00Z"));

    expect(parsed).toEqual({
      ok: true,
      value: {
        assetId: ASSET_ID,
        expectedChecksumSha256: CHECKSUM_SHA256,
        reason: "Documented supplier evidence reviewed.",
        expiresAt: EXPIRES_AT,
      },
    });
    expect(parseUploadScanOverrideRequest(overrideBody({ reason: "short" }))).toEqual({
      ok: false,
      status: 400,
      error: "A documented override reason is required.",
    });
  });

  it("rejects non-platform-admins before parsing request JSON", async () => {
    mockCurrentUser("member");
    const request = createUnparsedRequest(overrideBody());
    const { POST } = await import("@/app/api/component-library/attachments/scan-override/route");

    const response = await POST(request);

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({ error: "Only platform admins can approve scan overrides." });
    expect(request.json).not.toHaveBeenCalled();
    expect(serviceRoleMocks.createSupabaseServiceRoleClient).not.toHaveBeenCalled();
  });

  it("rejects invalid override payloads before creating a service-role client", async () => {
    mockCurrentUser("admin");
    const { POST } = await import("@/app/api/component-library/attachments/scan-override/route");

    const response = await POST(createJsonRequest(overrideBody({
      expectedChecksumSha256: "not-a-checksum",
    })));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: "A valid expected SHA-256 checksum is required." });
    expect(serviceRoleMocks.createSupabaseServiceRoleClient).not.toHaveBeenCalled();
  });

  it("calls the audited service-role override RPC with actor, reason, expiry, and checksum", async () => {
    mockCurrentUser("admin");
    const { rpc } = mockServiceRoleRpc();
    const { POST } = await import("@/app/api/component-library/attachments/scan-override/route");

    const response = await POST(createJsonRequest(overrideBody()));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      assetId: ASSET_ID,
      scanStatus: "override_approved",
      overrideExpiresAt: EXPIRES_AT,
    });
    expect(serviceRoleMocks.createSupabaseServiceRoleClient).toHaveBeenCalledWith("archestimator-upload-scan-override");
    expect(rpc).toHaveBeenCalledWith("approve_upload_scan_override", {
      target_asset_id: ASSET_ID,
      override_actor_user_id: USER_ID,
      override_reason: "Security review approved after supplier verification.",
      override_expires_at: EXPIRES_AT,
      expected_checksum_sha256: CHECKSUM_SHA256,
    });
  });

  it("returns a generic failure when the override RPC rejects", async () => {
    mockCurrentUser("admin");
    mockServiceRoleRpc({
      message: `Scan override checksum mismatch for ${ASSET_ID} at private/path.pdf`,
    });
    const { POST } = await import("@/app/api/component-library/attachments/scan-override/route");

    const response = await POST(createJsonRequest(overrideBody()));
    const body = await response.json();

    expect(response.status).toBe(409);
    expect(body).toEqual({ error: "Scan override could not be approved." });
    expect(JSON.stringify(body)).not.toContain(ASSET_ID);
    expect(JSON.stringify(body)).not.toContain("private/path.pdf");
  });
});
