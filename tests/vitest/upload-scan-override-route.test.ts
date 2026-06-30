import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  canApproveUploadScanOverride,
  parseUploadScanOverrideRequest,
} from "@/lib/uploads/scan-override";

const authMocks = vi.hoisted(() => ({
  requireCurrentUserContext: vi.fn(),
}));

const d1Mocks = vi.hoisted(() => ({
  getCloudflareD1Database: vi.fn(),
}));

vi.mock("@/lib/auth/session", () => authMocks);
vi.mock("@/lib/cloudflare/d1", () => d1Mocks);
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
    if (this.sql.includes("FROM upload_assets")) {
      return this.database.asset as R;
    }
    return null as R | null;
  }

  async all<R>() {
    return { results: [] as R[] };
  }

  async run() {
    this.database.runStatements.push(this);
    if (this.sql.includes("UPDATE upload_assets")) {
      return { success: true, meta: { changes: this.database.updateChanges } };
    }
    return { success: true, meta: { changes: 1 } };
  }
}

class FakeD1Database {
  asset: Record<string, unknown> | null = {
    checksum_sha256: CHECKSUM_SHA256,
    id: ASSET_ID,
    scan_status: "failed_permanent",
    surface: "component-attachment",
    upload_session_id: "session-1",
    workspace_id: "workspace-1",
  };
  runStatements: FakeD1Statement[] = [];
  statements: FakeD1Statement[] = [];
  updateChanges = 1;

  prepare(sql: string) {
    const statement = new FakeD1Statement(this, sql);
    this.statements.push(statement);
    return statement;
  }
}

beforeEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
  d1Mocks.getCloudflareD1Database.mockResolvedValue(new FakeD1Database());
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
    expect(d1Mocks.getCloudflareD1Database).not.toHaveBeenCalled();
  });

  it("rejects invalid override payloads before opening D1", async () => {
    mockCurrentUser("admin");
    const { POST } = await import("@/app/api/component-library/attachments/scan-override/route");

    const response = await POST(createJsonRequest(overrideBody({
      expectedChecksumSha256: "not-a-checksum",
    })));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: "A valid expected SHA-256 checksum is required." });
    expect(d1Mocks.getCloudflareD1Database).not.toHaveBeenCalled();
  });

  it("writes the audited D1 override with actor, reason, expiry, and checksum", async () => {
    mockCurrentUser("admin");
    const database = new FakeD1Database();
    d1Mocks.getCloudflareD1Database.mockResolvedValue(database);
    const { POST } = await import("@/app/api/component-library/attachments/scan-override/route");

    const response = await POST(createJsonRequest(overrideBody()));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      assetId: ASSET_ID,
      scanStatus: "override_approved",
      overrideExpiresAt: EXPIRES_AT,
    });
    const update = database.runStatements.find((statement) => statement.sql.includes("UPDATE upload_assets"));
    const event = database.runStatements.find((statement) => statement.sql.includes("INSERT INTO upload_events"));
    expect(update?.values).toEqual([
      "override_approved",
      USER_ID,
      "Security review approved after supplier verification.",
      EXPIRES_AT,
      CHECKSUM_SHA256,
      expect.any(String),
      ASSET_ID,
      CHECKSUM_SHA256,
      "component-attachment",
      "failed_permanent",
      "unsupported",
    ]);
    expect(event?.values).toEqual([
      expect.any(String),
      "session-1",
      ASSET_ID,
      "workspace-1",
      USER_ID,
      "scan_override_approved",
      JSON.stringify({
        checksumSha256: CHECKSUM_SHA256,
        expiresAt: EXPIRES_AT,
        reason: "Security review approved after supplier verification.",
      }),
      expect.any(String),
    ]);
  });

  it("returns a generic failure when the D1 override rejects", async () => {
    mockCurrentUser("admin");
    const database = new FakeD1Database();
    database.asset = { ...database.asset, checksum_sha256: "b".repeat(64) };
    d1Mocks.getCloudflareD1Database.mockResolvedValue(database);
    const { POST } = await import("@/app/api/component-library/attachments/scan-override/route");

    const response = await POST(createJsonRequest(overrideBody()));
    const body = await response.json();

    expect(response.status).toBe(409);
    expect(body).toEqual({ error: "Scan override could not be approved." });
    expect(JSON.stringify(body)).not.toContain(ASSET_ID);
    expect(JSON.stringify(body)).not.toContain("private/path.pdf");
  });
});
