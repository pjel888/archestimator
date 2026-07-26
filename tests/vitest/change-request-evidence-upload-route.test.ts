import { describe, expect, it, vi } from "vitest";

import {
  handleRecipientEvidenceByteUpload,
  insertPendingEvidenceUpload,
  readEvidenceMagicMime,
  readVisibleOwnedRequestExposure,
  type RecipientEvidenceByteUploadDependencies,
} from "@/app/api/share/[token]/requests/[publicRequestId]/evidence/_route-core";
import { runtime } from "@/app/api/share/[token]/requests/[publicRequestId]/evidence/route";

const PDF_BYTES = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x37]);
const PNG_BYTES = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const JPEG_BYTES = new Uint8Array([0xff, 0xd8, 0xff, 0xe0]);
const WEBP_BYTES = new TextEncoder().encode("RIFFsizeWEBP");
const AVIF_BYTES = new Uint8Array([
  0x00, 0x00, 0x00, 0x18,
  0x66, 0x74, 0x79, 0x70,
  0x61, 0x76, 0x69, 0x66,
  0x00, 0x00, 0x00, 0x00,
]);

function uploadRequest(
  bytes: Uint8Array = PDF_BYTES,
  type = "application/pdf",
  name = "site-evidence.pdf",
) {
  const boundary = "archestimator-evidence-boundary";
  const encoder = new TextEncoder();
  const prefix = encoder.encode(
    `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="${name}"\r\nContent-Type: ${type}\r\n\r\n`,
  );
  const suffix = encoder.encode(`\r\n--${boundary}--\r\n`);
  const body = new Uint8Array(prefix.byteLength + bytes.byteLength + suffix.byteLength);
  body.set(prefix, 0);
  body.set(bytes, prefix.byteLength);
  body.set(suffix, prefix.byteLength + bytes.byteLength);
  const request = new Request(
    "https://archestimator.test/api/share/share-token/requests/public-request-1/evidence",
    {
      method: "POST",
      headers: {
        origin: "https://archestimator.test",
        "content-type": `multipart/form-data; boundary=${boundary}`,
      },
      body: body.buffer,
    },
  );
  Object.defineProperty(request, "evidenceFile", {
    value: {
      name,
      size: bytes.byteLength,
      type,
      arrayBuffer: async () => bytes.slice().buffer,
    },
  });
  return request;
}

function dependencies(
  overrides: Partial<RecipientEvidenceByteUploadDependencies> = {},
): RecipientEvidenceByteUploadDependencies {
  const actor = {
    kind: "recipient" as const,
    recipientId: "recipient-1",
    portalId: "portal-1",
    role: "requester" as const,
    status: "active" as const,
    verificationState: "verified" as const,
    organization: "Client Co",
    isRequiredApprover: false,
    overrides: [],
  };
  const storageProvider = {
    uploadObject: vi.fn(async () => undefined),
    removeObjects: vi.fn(async () => undefined),
  };

  return {
    assertSameOrigin: vi.fn(() => ({ ok: true as const })),
    readRecipientSession: vi.fn(async () => actor),
    resolvePublicContext: vi.fn(async () => ({
      database: {} as never,
      portal: {
        id: "portal-1",
        workspace_id: "workspace-1",
        project_id: "project-1",
      },
      issue: { id: "issue-1", status: "issued" },
      policyPortal: {
        id: "portal-1",
        workspaceId: "workspace-1",
        projectId: "project-1",
        status: "live",
        allowAnonymousView: false,
      },
    })) as never,
    evaluatePolicy: vi.fn(() => ({
      allowed: true,
      reasonCode: "allowed",
      hideResource: false,
      effectiveCapabilities: ["artifact:upload_evidence"],
    })) as never,
    readFormData: vi.fn(async (request) => ({
      ok: true as const,
      value: {
        get: (name: string) => name === "file"
          ? (request as Request & { evidenceFile?: unknown }).evidenceFile ?? null
          : null,
      } as FormData,
    })),
    readVisibleOwnedRequestExposure: vi.fn(async () => ({
      requestId: "request-1",
      requestVersionId: "request-version-1",
      ownerRecipientId: "recipient-1",
      exposureStatus: "visible" as const,
    })),
    getPolicy: vi.fn(() => ({
      surface: "portal-request-evidence",
      bucket: "project-artifacts",
      kind: "attachment",
      maxBytes: 20 * 1024 * 1024,
      keyPrefix: "project-artifacts",
      publicUrlAllowed: false,
      scanRequired: true,
      allowedMimeTypes: [
        "application/pdf",
        "image/jpeg",
        "image/png",
        "image/webp",
        "image/avif",
      ],
    })),
    reserveAdmission: vi.fn(() => ({ allowed: true as const, release: vi.fn() })),
    buildObjectKey: vi.fn(() => "workspace-1/recipient-1/project-artifacts/project-1/evidence.pdf"),
    createStorageProvider: vi.fn(async () => storageProvider as never),
    recordUpload: vi.fn(async () => ({
      uploadSessionId: "upload-session-1",
      assetId: "upload-asset-1",
      scanStatus: "pending" as const,
    })),
    insertPendingEvidenceUpload: vi.fn(async () => undefined),
    createId: vi.fn(() => "evidence-upload-1"),
    now: vi.fn(() => "2026-07-27T00:00:00.000Z"),
    ...overrides,
  };
}

describe("recipient change-request evidence byte upload route", () => {
  it("uses the Node runtime and recognizes every allowed evidence signature", () => {
    expect(runtime).toBe("nodejs");
    expect(readEvidenceMagicMime(PDF_BYTES)).toBe("application/pdf");
    expect(readEvidenceMagicMime(JPEG_BYTES)).toBe("image/jpeg");
    expect(readEvidenceMagicMime(PNG_BYTES)).toBe("image/png");
    expect(readEvidenceMagicMime(WEBP_BYTES)).toBe("image/webp");
    expect(readEvidenceMagicMime(AVIF_BYTES)).toBe("image/avif");
    expect(readEvidenceMagicMime(new Uint8Array([0x00, 0x01, 0x02]))).toBeNull();
  });

  it("resolves the public request id only through a visible recipient-owned exposure", async () => {
    let preparedSql = "";
    let boundValues: unknown[] = [];
    const database = {
      prepare: (sql: string) => {
        preparedSql = sql;
        return {
          bind: (...values: unknown[]) => {
            boundValues = values;
            return {
              first: async () => ({
                request_id: "request-1",
                current_version_id: "request-version-1",
                requested_by_actor_id: "recipient-1",
                exposure_status: "visible",
              }),
            };
          },
        };
      },
    };

    await expect(readVisibleOwnedRequestExposure({
      database: database as never,
      portalId: "portal-1",
      workspaceId: "workspace-1",
      projectId: "project-1",
      recipientId: "recipient-1",
      publicRequestId: "public-request-1",
    })).resolves.toEqual({
      requestId: "request-1",
      requestVersionId: "request-version-1",
      ownerRecipientId: "recipient-1",
      exposureStatus: "visible",
    });
    expect(preparedSql).toContain("FROM client_portal_request_exposures AS exposure");
    expect(preparedSql).toContain("exposure.status = 'visible'");
    expect(preparedSql).toContain("request.requested_by_actor_id = ?");
    expect(boundValues).toEqual([
      "portal-1",
      "public-request-1",
      "workspace-1",
      "project-1",
      "recipient-1",
    ]);
  });

  it("writes a retained pending-scan evidence relationship", async () => {
    let preparedSql = "";
    let boundValues: unknown[] = [];
    const database = {
      prepare: (sql: string) => {
        preparedSql = sql;
        return {
          bind: (...values: unknown[]) => {
            boundValues = values;
            return { run: async () => ({ success: true }) };
          },
        };
      },
    };

    await insertPendingEvidenceUpload(database as never, {
      id: "evidence-upload-1",
      requestVersionId: "request-version-1",
      uploadAssetId: "upload-asset-1",
      recipientId: "recipient-1",
      createdAt: "2026-07-27T00:00:00.000Z",
    });

    expect(preparedSql).toContain("INSERT INTO project_change_request_evidence_uploads");
    expect(preparedSql).toContain("'evidence', 'pending_scan'");
    expect(boundValues).toEqual([
      "evidence-upload-1",
      "request-version-1",
      "upload-asset-1",
      "recipient-1",
      "2026-07-27T00:00:00.000Z",
      "2026-07-27T00:00:00.000Z",
    ]);
  });

  it("requires recipient auth, visible public ownership, and an exact change-request policy target", async () => {
    const deps = dependencies();
    const response = await handleRecipientEvidenceByteUpload(
      uploadRequest(),
      "share-token",
      "public-request-1",
      deps,
    );

    expect({ status: response.status, body: await response.clone().json() }).toEqual({
      status: 201,
      body: { status: "pending_scan" },
    });
    expect(deps.readVisibleOwnedRequestExposure).toHaveBeenCalledWith(expect.objectContaining({
      portalId: "portal-1",
      projectId: "project-1",
      publicRequestId: "public-request-1",
      recipientId: "recipient-1",
      workspaceId: "workspace-1",
    }));
    expect(deps.evaluatePolicy).toHaveBeenCalledWith({
      actor: expect.objectContaining({ recipientId: "recipient-1" }),
      action: "artifact:upload_evidence",
      portal: expect.objectContaining({ id: "portal-1" }),
      target: {
        kind: "change_request",
        portalId: "portal-1",
        exposureStatus: "visible",
        ownerRecipientId: "recipient-1",
        allowedRecipientIds: ["recipient-1"],
      },
    });
    expect(response.headers.get("cache-control")).toContain("no-store");
    expect(response.headers.get("x-content-type-options")).toBe("nosniff");
  });

  it.each([
    ["missing recipient session", { readRecipientSession: vi.fn(async () => null) }],
    ["request exposure not owned", { readVisibleOwnedRequestExposure: vi.fn(async () => null) }],
    ["policy denied", {
      evaluatePolicy: vi.fn(() => ({
        allowed: false,
        reasonCode: "capability_not_granted",
        hideResource: true,
        effectiveCapabilities: [],
      })) as never,
    }],
  ])("fails closed when %s", async (_label, override) => {
    const deps = dependencies(override as Partial<RecipientEvidenceByteUploadDependencies>);
    const response = await handleRecipientEvidenceByteUpload(
      uploadRequest(),
      "share-token",
      "public-request-1",
      deps,
    );

    expect(response.status).toBe(404);
    expect(deps.createStorageProvider).not.toHaveBeenCalled();
    expect(response.headers.get("cache-control")).toContain("no-store");
    expect(response.headers.get("x-content-type-options")).toBe("nosniff");
  });

  it("rejects unsupported MIME, MIME/magic mismatch, and oversized files before storage", async () => {
    const unsupported = dependencies();
    const unsupportedResponse = await handleRecipientEvidenceByteUpload(
      uploadRequest(PDF_BYTES, "application/octet-stream", "payload.bin"),
      "share-token",
      "public-request-1",
      unsupported,
    );
    expect(unsupportedResponse.status).toBe(415);

    const mismatch = dependencies();
    const mismatchResponse = await handleRecipientEvidenceByteUpload(
      uploadRequest(PNG_BYTES, "application/pdf"),
      "share-token",
      "public-request-1",
      mismatch,
    );
    expect(mismatchResponse.status).toBe(400);

    const oversized = dependencies({
      getPolicy: vi.fn(() => ({
        ...dependencies().getPolicy("portal-request-evidence"),
        maxBytes: 4,
      })),
    });
    const oversizedResponse = await handleRecipientEvidenceByteUpload(
      uploadRequest(PDF_BYTES),
      "share-token",
      "public-request-1",
      oversized,
    );
    expect(oversizedResponse.status).toBe(413);

    expect(unsupported.createStorageProvider).not.toHaveBeenCalled();
    expect(mismatch.createStorageProvider).not.toHaveBeenCalled();
    expect(oversized.createStorageProvider).not.toHaveBeenCalled();
  });

  it("fails closed with private headers when multipart parsing throws", async () => {
    const release = vi.fn();
    const deps = dependencies({
      reserveAdmission: vi.fn(() => ({ allowed: true as const, release })),
      readFormData: vi.fn(async () => { throw new Error("parser failed"); }),
    });

    const response = await handleRecipientEvidenceByteUpload(
      uploadRequest(),
      "share-token",
      "public-request-1",
      deps,
    );

    expect(response.status).toBe(503);
    expect(response.headers.get("cache-control")).toContain("no-store");
    expect(response.headers.get("x-content-type-options")).toBe("nosniff");
    expect(release).toHaveBeenCalledTimes(1);
    expect(deps.createStorageProvider).not.toHaveBeenCalled();
  });

  it("stores project-scoped metadata and inserts a retained pending-scan evidence record", async () => {
    const deps = dependencies();
    const response = await handleRecipientEvidenceByteUpload(
      uploadRequest(),
      "share-token",
      "public-request-1",
      deps,
    );

    expect(response.status).toBe(201);
    expect(deps.buildObjectKey).toHaveBeenCalledWith(expect.objectContaining({
      surface: "portal-request-evidence",
      targetEntityId: "project-1",
      userId: "recipient-1",
      workspaceId: "workspace-1",
    }));
    expect(deps.recordUpload).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({
      actorUserId: "recipient-1",
      bucket: "project-artifacts",
      scanStatus: "pending",
      surface: "portal-request-evidence",
      targetEntityId: "request-1",
      targetEntityType: "project-change-request",
      metadata: {
        portalId: "portal-1",
        projectId: "project-1",
        publicRequestId: "public-request-1",
        recipientId: "recipient-1",
        requestId: "request-1",
        requestVersionId: "request-version-1",
      },
      workspaceId: "workspace-1",
    }));
    expect(deps.insertPendingEvidenceUpload).toHaveBeenCalledWith(expect.anything(), {
      id: "evidence-upload-1",
      recipientId: "recipient-1",
      requestVersionId: "request-version-1",
      uploadAssetId: "upload-asset-1",
      createdAt: "2026-07-27T00:00:00.000Z",
    });
    await expect(response.json()).resolves.toEqual({ status: "pending_scan" });
  });

  it.each(["record", "evidence"])("removes the uploaded object when %s persistence fails", async (failure) => {
    const removeObjects = vi.fn(async () => undefined);
    const deps = dependencies({
      createStorageProvider: vi.fn(async () => ({
        uploadObject: vi.fn(async () => undefined),
        removeObjects,
      }) as never),
      recordUpload: failure === "record"
        ? vi.fn(async () => { throw new Error("record failed"); })
        : dependencies().recordUpload,
      insertPendingEvidenceUpload: failure === "evidence"
        ? vi.fn(async () => { throw new Error("evidence failed"); })
        : vi.fn(async () => undefined),
    });

    const response = await handleRecipientEvidenceByteUpload(
      uploadRequest(),
      "share-token",
      "public-request-1",
      deps,
    );

    expect(response.status).toBe(503);
    expect(removeObjects).toHaveBeenCalledWith("project-artifacts", [
      "workspace-1/recipient-1/project-artifacts/project-1/evidence.pdf",
    ]);
    expect(response.headers.get("cache-control")).toContain("no-store");
    expect(response.headers.get("x-content-type-options")).toBe("nosniff");
  });
});
