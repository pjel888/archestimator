import { describe, expect, it, vi } from "vitest";

import {
  handleRecipientEvidenceByteUpload,
  insertPendingEvidenceUpload,
  readEvidenceMagicMime,
  readVisibleOwnedRequestExposure,
  type RecipientEvidenceByteUploadDependencies,
} from "@/app/api/share/[token]/requests/[publicRequestId]/evidence/_route-core";
import { runtime } from "@/app/api/share/[token]/requests/[publicRequestId]/evidence/route";
import { buildUploadObjectKey } from "@/lib/uploads/object-keys";

const PDF_BYTES = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x37]);
const PNG_BYTES = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const JPEG_BYTES = new Uint8Array([0xff, 0xd8, 0xff, 0xe0]);
const JPEG_WITH_EXIF_BYTES = new Uint8Array([
  0xff, 0xd8, 0xff, 0xe1,
  ...new TextEncoder().encode("Exif\0\0private-camera-metadata"),
]);
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
    requiresPassword: vi.fn(async () => false),
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
    checkDurableQuota: vi.fn(async () => ({ allowed: true as const })),
    processImage: vi.fn(async () => ({
      status: "ok" as const,
      image: {
        data: Buffer.from("normalized-webp"),
        info: { width: 800, height: 600 },
      },
    })),
    buildObjectKey: vi.fn(() => "workspace-1/recipient-1/project-artifacts/project-1/evidence.pdf"),
    createStorageProvider: vi.fn(async () => storageProvider as never),
    reserveUpload: vi.fn(async () => ({
      uploadSessionId: "upload-session-1",
      assetId: "upload-asset-1",
      reservationState: "acquired",
      scanStatus: "pending",
      bucket: "project-artifacts",
      path: "workspace-1/recipient-1/project-artifacts/project-1/evidence.pdf",
    }) as never),
    finalizeUpload: vi.fn(async () => ({
      uploadSessionId: "upload-session-1",
      assetId: "upload-asset-1",
      scanStatus: "pending" as const,
    })),
    failUpload: vi.fn(async () => undefined),
    renewCleanupLease: vi.fn(async () => undefined),
    buildPendingEvidenceUploadStatement: vi.fn(() => ({}) as never),
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

    expect(preparedSql).toContain("INSERT OR IGNORE INTO project_change_request_evidence_uploads");
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
    ["missing portal password session", { requiresPassword: vi.fn(async () => true) }],
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

  it("denies before parsing or storage when the durable recipient quota is exhausted", async () => {
    const deps = dependencies({
      checkDurableQuota: vi.fn(async () => ({
        allowed: false as const,
        message: "Too many evidence uploads. Please wait 60 seconds.",
        retryAfter: 60,
      })),
    });

    const response = await handleRecipientEvidenceByteUpload(
      uploadRequest(),
      "share-token",
      "public-request-1",
      deps,
    );

    expect(response.status).toBe(429);
    expect(response.headers.get("retry-after")).toBe("60");
    expect(deps.readFormData).not.toHaveBeenCalled();
    expect(deps.reserveAdmission).not.toHaveBeenCalled();
    expect(deps.createStorageProvider).not.toHaveBeenCalled();
  });

  it("fails closed before parsing or storage when durable quota storage is unavailable", async () => {
    const deps = dependencies({
      checkDurableQuota: vi.fn(async () => { throw new Error("D1 unavailable"); }),
    });

    const response = await handleRecipientEvidenceByteUpload(
      uploadRequest(),
      "share-token",
      "public-request-1",
      deps,
    );

    expect(response.status).toBe(503);
    expect(deps.readFormData).not.toHaveBeenCalled();
    expect(deps.reserveAdmission).not.toHaveBeenCalled();
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
    expect(deps.checkDurableQuota).toHaveBeenCalledWith({
      portalId: "portal-1",
      recipientId: "recipient-1",
      request: expect.any(Request),
      workspaceId: "workspace-1",
    });
    expect(deps.buildObjectKey).toHaveBeenCalledWith(expect.objectContaining({
      contentSha256: expect.stringMatching(/^[a-f0-9]{64}$/),
      surface: "portal-request-evidence",
      targetEntityId: "request-version-1",
      userId: "recipient-1",
      workspaceId: "workspace-1",
    }));
    expect(deps.reserveUpload).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({
      actorUserId: "recipient-1",
      bucket: "project-artifacts",
      idempotencyKey: expect.stringMatching(/^portal-request-evidence:request-version-1:[a-f0-9]{64}$/),
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
    expect(deps.buildPendingEvidenceUploadStatement).toHaveBeenCalledWith(expect.anything(), {
      id: "evidence-upload-1",
      recipientId: "recipient-1",
      requestVersionId: "request-version-1",
      uploadAssetId: "upload-asset-1",
      createdAt: "2026-07-27T00:00:00.000Z",
    });
    expect(deps.finalizeUpload).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ uploadSessionId: "upload-session-1" }),
      [expect.anything()],
    );
    await expect(response.json()).resolves.toEqual({ status: "pending_scan" });
  });

  it("strips image metadata through WebP normalization and checksums normalized bytes", async () => {
    const normalizedBytes = Buffer.from("normalized-webp-without-exif");
    const uploadObject = vi.fn(async () => undefined);
    const deps = dependencies({
      createStorageProvider: vi.fn(async () => ({
        uploadObject,
        removeObjects: vi.fn(async () => undefined),
      }) as never),
      processImage: vi.fn(async () => ({
        status: "ok" as const,
        image: {
          data: normalizedBytes,
          info: { width: 1200, height: 900 },
        },
      })),
    });

    const response = await handleRecipientEvidenceByteUpload(
      uploadRequest(JPEG_WITH_EXIF_BYTES, "image/jpeg", "site-photo.jpg"),
      "share-token",
      "public-request-1",
      deps,
    );

    expect(response.status).toBe(201);
    expect(deps.processImage).toHaveBeenCalledWith({
      sourceBuffer: Buffer.from(JPEG_WITH_EXIF_BYTES),
      magicMime: "image/jpeg",
      maxImagePixels: 24_000_000,
      maxImageEdge: 1600,
    });
    expect(deps.buildObjectKey).toHaveBeenCalledWith(expect.objectContaining({
      extension: "webp",
      fileName: "site-photo.webp",
    }));
    expect(deps.reserveUpload).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({
      checksumBytes: normalizedBytes,
      contentType: "image/webp",
      fileName: "site-photo.webp",
      sizeBytes: normalizedBytes.byteLength,
      metadata: expect.objectContaining({
        normalizedContentType: "image/webp",
        normalizedHeight: 900,
        normalizedWidth: 1200,
        sourceContentType: "image/jpeg",
        sourceSizeBytes: JPEG_WITH_EXIF_BYTES.byteLength,
      }),
    }));
    expect(uploadObject).toHaveBeenCalledWith(expect.objectContaining({
      body: normalizedBytes,
      contentType: "image/webp",
    }));
    expect(normalizedBytes.includes(Buffer.from("Exif"))).toBe(false);
  });

  it("isolates identical evidence bytes by request-version storage ownership", () => {
    const shared = {
      contentSha256: "a".repeat(64),
      extension: "pdf",
      fileName: "evidence.pdf",
      surface: "portal-request-evidence" as const,
      userId: "recipient-1",
      workspaceId: "workspace-1",
    };

    const firstPath = buildUploadObjectKey({ ...shared, targetEntityId: "request-version-1" });
    const secondPath = buildUploadObjectKey({ ...shared, targetEntityId: "request-version-2" });

    expect(firstPath).not.toBe(secondPath);
  });

  it("reserves in D1 before writing R2 and atomically finalizes the evidence relation", async () => {
    const order: string[] = [];
    const deps = dependencies({
      reserveUpload: vi.fn(async () => {
        order.push("reserve");
        return {
          uploadSessionId: "upload-session-1",
          assetId: "upload-asset-1",
          reservationState: "acquired",
          scanStatus: "pending",
          bucket: "project-artifacts",
          path: "workspace-1/recipient-1/project-artifacts/project-1/evidence.pdf",
        } as never;
      }),
      createStorageProvider: vi.fn(async () => {
        order.push("storage");
        return {
          uploadObject: vi.fn(async () => { order.push("upload"); }),
          removeObjects: vi.fn(async () => undefined),
        } as never;
      }),
      buildPendingEvidenceUploadStatement: vi.fn(() => {
        order.push("relationship");
        return {} as never;
      }),
      finalizeUpload: vi.fn(async () => {
        order.push("finalize");
        return {
          uploadSessionId: "upload-session-1",
          assetId: "upload-asset-1",
          scanStatus: "pending",
        };
      }),
    });

    const response = await handleRecipientEvidenceByteUpload(
      uploadRequest(),
      "share-token",
      "public-request-1",
      deps,
    );

    expect(response.status).toBe(201);
    expect(order).toEqual(["reserve", "storage", "upload", "relationship", "finalize"]);
  });

  it("does not open R2 when durable reservation fails", async () => {
    const deps = dependencies({
      reserveUpload: vi.fn(async () => { throw new Error("reserve failed"); }),
    });

    const response = await handleRecipientEvidenceByteUpload(
      uploadRequest(),
      "share-token",
      "public-request-1",
      deps,
    );

    expect(response.status).toBe(503);
    expect(deps.createStorageProvider).not.toHaveBeenCalled();
    expect(deps.finalizeUpload).not.toHaveBeenCalled();
  });

  it("returns a finalized evidence replay without opening or deleting R2", async () => {
    const deps = dependencies({
      reserveUpload: vi.fn(async () => ({
        uploadSessionId: "upload-session-1",
        assetId: "upload-asset-1",
        reservationState: "finalized",
        scanStatus: "pending",
        bucket: "project-artifacts",
        path: "workspace-1/recipient-1/project-artifacts/project-1/evidence.pdf",
      }) as never),
    });

    const response = await handleRecipientEvidenceByteUpload(uploadRequest(), "share-token", "public-request-1", deps);

    expect(response.status).toBe(200);
    expect(deps.createStorageProvider).not.toHaveBeenCalled();
    expect(deps.finalizeUpload).not.toHaveBeenCalled();
    expect(deps.failUpload).not.toHaveBeenCalled();
  });

  it("rejects a concurrent evidence reservation without opening or deleting R2", async () => {
    const deps = dependencies({
      reserveUpload: vi.fn(async () => ({
        uploadSessionId: "upload-session-1",
        assetId: "upload-asset-1",
        reservationState: "in_progress",
        scanStatus: "pending",
        bucket: "project-artifacts",
        path: "workspace-1/recipient-1/project-artifacts/project-1/evidence.pdf",
      }) as never),
    });

    const response = await handleRecipientEvidenceByteUpload(uploadRequest(), "share-token", "public-request-1", deps);

    expect(response.status).toBe(409);
    expect(response.headers.get("retry-after")).toBe("1");
    expect(deps.createStorageProvider).not.toHaveBeenCalled();
    expect(deps.finalizeUpload).not.toHaveBeenCalled();
    expect(deps.failUpload).not.toHaveBeenCalled();
  });

  it("retries transient D1 finalization without rewriting or deleting R2", async () => {
    const removeObjects = vi.fn(async () => undefined);
    const deps = dependencies({
      createStorageProvider: vi.fn(async () => ({
        uploadObject: vi.fn(async () => undefined),
        removeObjects,
      }) as never),
      finalizeUpload: vi.fn()
        .mockRejectedValueOnce(new Error("D1 unavailable"))
        .mockResolvedValueOnce({
          uploadSessionId: "upload-session-1",
          assetId: "upload-asset-1",
          scanStatus: "pending",
        }),
    });

    const response = await handleRecipientEvidenceByteUpload(
      uploadRequest(),
      "share-token",
      "public-request-1",
      deps,
    );

    expect(response.status).toBe(201);
    expect(deps.finalizeUpload).toHaveBeenCalledTimes(2);
    expect(deps.buildPendingEvidenceUploadStatement).toHaveBeenCalledTimes(2);
    expect(removeObjects).not.toHaveBeenCalled();
    expect(deps.failUpload).not.toHaveBeenCalled();
  });

  it("preserves R2 bytes and reserved state when D1 finalization stays unavailable", async () => {
    const removeObjects = vi.fn(async () => undefined);
    const deps = dependencies({
      createStorageProvider: vi.fn(async () => ({
        uploadObject: vi.fn(async () => undefined),
        removeObjects,
      }) as never),
      finalizeUpload: vi.fn(async () => { throw new Error("finalization failed"); }),
    });

    const response = await handleRecipientEvidenceByteUpload(
      uploadRequest(),
      "share-token",
      "public-request-1",
      deps,
    );

    expect(response.status).toBe(503);
    expect(deps.finalizeUpload).toHaveBeenCalledTimes(2);
    expect(removeObjects).not.toHaveBeenCalled();
    expect(deps.failUpload).not.toHaveBeenCalled();
    expect(response.headers.get("cache-control")).toContain("no-store");
    expect(response.headers.get("x-content-type-options")).toBe("nosniff");
  });

  it("removes possible partial bytes and fails reserved state when R2 storage fails", async () => {
    const removeObjects = vi.fn(async () => undefined);
    const deps = dependencies({
      createStorageProvider: vi.fn(async () => ({
        uploadObject: vi.fn(async () => { throw new Error("R2 unavailable"); }),
        removeObjects,
      }) as never),
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
    expect(deps.failUpload).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ uploadSessionId: "upload-session-1" }),
      "storage",
    );
  });

  it("keeps a reacquired upload object when a stale cleanup claim is rejected", async () => {
    const removeObjects = vi.fn(async () => undefined);
    const deps = dependencies({
      createStorageProvider: vi.fn(async () => ({
        uploadObject: vi.fn(async () => { throw new Error("late stale failure"); }),
        removeObjects,
      }) as never),
      renewCleanupLease: vi.fn(async () => {
        throw new Error("upload cleanup claim guard failed");
      }),
    });

    const response = await handleRecipientEvidenceByteUpload(
      uploadRequest(),
      "share-token",
      "public-request-1",
      deps,
    );

    expect(response.status).toBe(503);
    expect(removeObjects).not.toHaveBeenCalled();
    expect(deps.failUpload).not.toHaveBeenCalled();
  });
});
