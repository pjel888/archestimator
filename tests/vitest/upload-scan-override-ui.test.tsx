import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { UploadScanOverridePanel } from "@/components/workshop/UploadScanOverridePanel";
import type { UploadScanOverrideReviewRow } from "@/lib/uploads/scan-override-review";

const authMocks = vi.hoisted(() => ({
  requireCurrentUserContext: vi.fn(),
}));

const serviceRoleMocks = vi.hoisted(() => ({
  createSupabaseServiceRoleClient: vi.fn(),
}));

vi.mock("@/lib/auth/session", () => authMocks);
vi.mock("@/lib/supabase/service-role", () => serviceRoleMocks);
vi.mock("server-only", () => ({}));

const ASSET_ID = "44444444-4444-4444-8444-444444444444";
const CHECKSUM_SHA256 = "a".repeat(64);

function overrideRow(overrides: Partial<UploadScanOverrideReviewRow> = {}): UploadScanOverrideReviewRow {
  return {
    id: ASSET_ID,
    checksumSha256: CHECKSUM_SHA256,
    contentType: "application/pdf",
    createdAt: "2026-06-27T01:00:00.000Z",
    fileName: "supplier-quote.pdf",
    scanProvider: "clamd",
    scanStatus: "failed_permanent",
    scannedAt: "2026-06-27T01:05:00.000Z",
    sizeBytes: 2048,
    updatedAt: "2026-06-27T01:05:00.000Z",
    workspaceId: "11111111-1111-4111-8111-111111111111",
    ...overrides,
  };
}

function createUploadAssetsQuery(data: unknown[] | null, error: { message: string } | null = null) {
  const query = {
    select: vi.fn(() => query),
    eq: vi.fn(() => query),
    in: vi.fn(() => query),
    order: vi.fn(() => query),
    limit: vi.fn(async () => ({ data, error })),
  };
  return query;
}

beforeEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
  vi.unstubAllGlobals();
});

describe("upload scan override review queue", () => {
  it("does not create a service-role client for non-platform-admin users", async () => {
    authMocks.requireCurrentUserContext.mockResolvedValue({ role: "member", userId: "user-1" });
    const { readUploadScanOverrideReviewQueue } = await import("@/lib/uploads/scan-override-review");

    await expect(readUploadScanOverrideReviewQueue()).resolves.toEqual({
      authorized: false,
      error: null,
      rows: [],
    });
    expect(serviceRoleMocks.createSupabaseServiceRoleClient).not.toHaveBeenCalled();
  });

  it("lists only overridable component attachment scan statuses without selecting storage paths", async () => {
    authMocks.requireCurrentUserContext.mockResolvedValue({ role: "admin", userId: "user-1" });
    const query = createUploadAssetsQuery([
      {
        id: ASSET_ID,
        workspace_id: "11111111-1111-4111-8111-111111111111",
        file_name: "supplier-quote.pdf",
        content_type: "application/pdf",
        size_bytes: 2048,
        checksum_sha256: CHECKSUM_SHA256.toUpperCase(),
        scan_status: "failed_permanent",
        scan_provider: "clamd",
        scanned_at: "2026-06-27T01:05:00.000Z",
        created_at: "2026-06-27T01:00:00.000Z",
        updated_at: "2026-06-27T01:05:00.000Z",
      },
      {
        id: "55555555-5555-4555-8555-555555555555",
        workspace_id: "11111111-1111-4111-8111-111111111111",
        file_name: "clean.pdf",
        content_type: "application/pdf",
        size_bytes: 1024,
        checksum_sha256: "b".repeat(64),
        scan_status: "clean",
        scan_provider: "clamd",
        scanned_at: "2026-06-27T01:05:00.000Z",
        created_at: "2026-06-27T01:00:00.000Z",
        updated_at: "2026-06-27T01:05:00.000Z",
      },
    ]);
    serviceRoleMocks.createSupabaseServiceRoleClient.mockReturnValue({ from: vi.fn(() => query) });
    const { readUploadScanOverrideReviewQueue } = await import("@/lib/uploads/scan-override-review");

    const queue = await readUploadScanOverrideReviewQueue();

    expect(queue).toMatchObject({
      authorized: true,
      error: null,
      rows: [
        {
          id: ASSET_ID,
          checksumSha256: CHECKSUM_SHA256,
          fileName: "supplier-quote.pdf",
          scanStatus: "failed_permanent",
        },
      ],
    });
    expect(serviceRoleMocks.createSupabaseServiceRoleClient).toHaveBeenCalledWith("archestimator-upload-scan-override-review");
    expect(query.select).toHaveBeenCalledWith(
      "id, workspace_id, file_name, content_type, size_bytes, checksum_sha256, scan_status, scan_provider, scanned_at, created_at, updated_at",
    );
    expect(query.in).toHaveBeenCalledWith("scan_status", ["failed_permanent", "unsupported"]);
    expect(JSON.stringify(query.select.mock.calls)).not.toContain("storage_path");
  });
});

describe("UploadScanOverridePanel", () => {
  it("submits the existing scan-override API contract", async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({
      scanStatus: "override_approved",
      overrideExpiresAt: "2030-01-01T00:00:00.000Z",
    }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    render(<UploadScanOverridePanel rows={[overrideRow()]} />);

    fireEvent.change(screen.getByLabelText("Override reason"), {
      target: { value: "Supplier evidence reviewed and required for estimate audit." },
    });
    fireEvent.change(screen.getByLabelText("Expiry"), {
      target: { value: "2030-01-01T00:00" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Approve override" }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    const [, init] = fetchMock.mock.calls[0];
    const body = JSON.parse(String(init.body));
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/component-library/attachments/scan-override",
      expect.objectContaining({
        method: "POST",
        headers: { "content-type": "application/json" },
      }),
    );
    expect(body).toEqual({
      assetId: ASSET_ID,
      expectedChecksumSha256: CHECKSUM_SHA256,
      reason: "Supplier evidence reviewed and required for estimate audit.",
      expiresAt: new Date("2030-01-01T00:00").toISOString(),
    });
    expect(await screen.findByText(/Override approved until/i)).toBeInTheDocument();
  });

  it("shows generic failure copy without leaking private identifiers from the API failure", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({
      error: `Override failed for ${ASSET_ID} at private/path.pdf`,
    }), { status: 409 })));
    render(<UploadScanOverridePanel rows={[overrideRow()]} />);

    fireEvent.change(screen.getByLabelText("Override reason"), {
      target: { value: "Supplier evidence reviewed and required for estimate audit." },
    });
    fireEvent.change(screen.getByLabelText("Expiry"), {
      target: { value: "2030-01-01T00:00" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Approve override" }));

    expect(await screen.findByText("Scan override could not be approved. Recheck status, checksum, and expiry.")).toBeInTheDocument();
    expect(screen.queryByText(ASSET_ID)).not.toBeInTheDocument();
    expect(screen.queryByText("private/path.pdf")).not.toBeInTheDocument();
  });

  it("disables override approval when the asset checksum is unavailable", () => {
    render(<UploadScanOverridePanel rows={[overrideRow({ checksumSha256: null })]} />);

    expect(screen.getByRole("button", { name: "Approve override" })).toBeDisabled();
    expect(screen.getByText("This asset is missing a checksum and cannot be override-approved.")).toBeInTheDocument();
  });
});
