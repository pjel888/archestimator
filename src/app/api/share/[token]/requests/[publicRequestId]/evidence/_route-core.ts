import { randomUUID } from "node:crypto";

import type {
  D1DatabaseLike,
  D1PreparedStatementLike,
} from "@/lib/cloudflare/d1";
import {
  readClientPortalRecipientSession,
  requiresClientPortalPassword,
  resolveClientPortalBaseContext,
} from "@/lib/client-portal/public-repository";
import {
  evaluateClientPortalPolicy,
} from "@/lib/client-portal/policy";
import { checkClientPortalEvidenceUploadRateLimits } from "@/lib/client-portal/public-rate-limits";
import { readBoundedFormData } from "@/lib/http/read-bounded-body";
import { assertSameOriginPublicPost } from "@/lib/publication/security";
import { reserveUploadAdmission } from "@/lib/uploads/admission-control";
import { buildUploadObjectKey } from "@/lib/uploads/object-keys";
import { getUploadPolicy } from "@/lib/uploads/policy";
import { createRuntimeUploadStorageProvider } from "@/lib/uploads/runtime-storage-provider";
import {
  CLOUDFLARE_IMAGE_PROCESSING_UNAVAILABLE_MESSAGE,
  processSupportImageToWebp,
} from "@/lib/uploads/server-image-processing";
import {
  failReservedUploadAsset,
  finalizeReservedUploadAsset,
  reserveUploadAsset,
} from "@/lib/uploads/upload-records";

const UPLOAD_SURFACE = "portal-request-evidence" as const;
const MULTIPART_OVERHEAD_BYTES = 1024 * 1024;
const MAX_EVIDENCE_IMAGE_PIXELS = 24_000_000;
const MAX_EVIDENCE_IMAGE_EDGE = 1600;
const MIME_EXTENSIONS = {
  "application/pdf": "pdf",
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/avif": "avif",
} as const;

type SupportedEvidenceMime = keyof typeof MIME_EXTENSIONS;
type PublicContext = NonNullable<Awaited<ReturnType<typeof resolveClientPortalBaseContext>>>;

export type VisibleOwnedRequestExposure = {
  requestId: string;
  requestVersionId: string;
  ownerRecipientId: string;
  exposureStatus: "visible";
};

export type PendingEvidenceUploadInput = {
  id: string;
  requestVersionId: string;
  uploadAssetId: string;
  recipientId: string;
  createdAt: string;
};

export type RecipientEvidenceByteUploadDependencies = {
  assertSameOrigin: typeof assertSameOriginPublicPost;
  requiresPassword: typeof requiresClientPortalPassword;
  readRecipientSession: typeof readClientPortalRecipientSession;
  resolvePublicContext: typeof resolveClientPortalBaseContext;
  evaluatePolicy: typeof evaluateClientPortalPolicy;
  readVisibleOwnedRequestExposure: typeof readVisibleOwnedRequestExposure;
  readFormData: typeof readBoundedFormData;
  getPolicy: typeof getUploadPolicy;
  reserveAdmission: typeof reserveUploadAdmission;
  buildObjectKey: typeof buildUploadObjectKey;
  createStorageProvider: typeof createRuntimeUploadStorageProvider;
  checkDurableQuota: typeof checkClientPortalEvidenceUploadRateLimits;
  processImage: typeof processSupportImageToWebp;
  reserveUpload: typeof reserveUploadAsset;
  finalizeUpload: typeof finalizeReservedUploadAsset;
  failUpload: typeof failReservedUploadAsset;
  buildPendingEvidenceUploadStatement: typeof buildPendingEvidenceUploadStatement;
  createId: () => string;
  now: () => string;
};

function privateHeaders() {
  return {
    "Cache-Control": "private, no-store, max-age=0, must-revalidate",
    "X-Content-Type-Options": "nosniff",
  };
}

function json(body: unknown, status = 200, extraHeaders?: HeadersInit) {
  const headers = new Headers(privateHeaders());
  if (extraHeaders) {
    new Headers(extraHeaders).forEach((value, name) => headers.set(name, value));
  }
  return Response.json(body, { status, headers });
}

function unavailable() {
  return json({ error: "Evidence upload is unavailable." }, 404);
}

function readAscii(bytes: Uint8Array, start: number, end: number) {
  return String.fromCharCode(...bytes.subarray(start, end));
}

function hasAvifBrand(bytes: Uint8Array) {
  if (bytes.length < 16 || readAscii(bytes, 4, 8) !== "ftyp") return false;
  const readableLength = Math.min(bytes.length, 64);
  for (let offset = 8; offset + 4 <= readableLength; offset += offset === 8 ? 8 : 4) {
    const brand = readAscii(bytes, offset, offset + 4);
    if (brand === "avif" || brand === "avis") return true;
  }
  return false;
}

export function readEvidenceMagicMime(bytes: Uint8Array): SupportedEvidenceMime | null {
  if (
    bytes.length >= 5
    && bytes[0] === 0x25
    && bytes[1] === 0x50
    && bytes[2] === 0x44
    && bytes[3] === 0x46
    && bytes[4] === 0x2d
  ) return "application/pdf";
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return "image/jpeg";
  }
  if (
    bytes.length >= 8
    && bytes[0] === 0x89
    && bytes[1] === 0x50
    && bytes[2] === 0x4e
    && bytes[3] === 0x47
    && bytes[4] === 0x0d
    && bytes[5] === 0x0a
    && bytes[6] === 0x1a
    && bytes[7] === 0x0a
  ) return "image/png";
  if (
    bytes.length >= 12
    && readAscii(bytes, 0, 4) === "RIFF"
    && readAscii(bytes, 8, 12) === "WEBP"
  ) return "image/webp";
  if (hasAvifBrand(bytes)) return "image/avif";
  return null;
}

export async function readVisibleOwnedRequestExposure(input: {
  database: D1DatabaseLike;
  portalId: string;
  workspaceId: string;
  projectId: string;
  recipientId: string;
  publicRequestId: string;
}): Promise<VisibleOwnedRequestExposure | null> {
  const row = await input.database.prepare<{
    request_id: string;
    current_version_id: string;
    requested_by_actor_id: string;
    exposure_status: "visible";
  }>(`
    SELECT
      request.id AS request_id,
      request.current_version_id,
      request.requested_by_actor_id,
      exposure.status AS exposure_status
    FROM client_portal_request_exposures AS exposure
    JOIN project_change_requests AS request
      ON request.id = exposure.request_id
      AND request.origin_portal_id = exposure.portal_id
    WHERE exposure.portal_id = ?
      AND exposure.public_request_id = ?
      AND exposure.status = 'visible'
      AND request.workspace_id = ?
      AND request.project_id = ?
      AND request.requested_by_actor_type = 'recipient'
      AND request.requested_by_actor_id = ?
      AND request.status IN ('submitted', 'acknowledged', 'under_assessment', 'proposal_issued')
      AND request.current_version_id IS NOT NULL
    LIMIT 1
  `).bind(
    input.portalId,
    input.publicRequestId,
    input.workspaceId,
    input.projectId,
    input.recipientId,
  ).first();

  if (!row || row.exposure_status !== "visible") return null;
  return {
    requestId: row.request_id,
    requestVersionId: row.current_version_id,
    ownerRecipientId: row.requested_by_actor_id,
    exposureStatus: row.exposure_status,
  };
}

export async function insertPendingEvidenceUpload(
  database: D1DatabaseLike,
  input: PendingEvidenceUploadInput,
) {
  const result = await buildPendingEvidenceUploadStatement(database, input).run();
  if (result.success === false) throw new Error("Could not retain request evidence upload.");
}

export function buildPendingEvidenceUploadStatement(
  database: D1DatabaseLike,
  input: PendingEvidenceUploadInput,
): D1PreparedStatementLike {
  return database.prepare(`
    INSERT OR IGNORE INTO project_change_request_evidence_uploads (
      id,
      request_version_id,
      upload_asset_id,
      recipient_id,
      relationship,
      status,
      artifact_version_id,
      created_at,
      updated_at,
      rejection_reason
    ) VALUES (?, ?, ?, ?, 'evidence', 'pending_scan', NULL, ?, ?, NULL)
  `).bind(
    input.id,
    input.requestVersionId,
    input.uploadAssetId,
    input.recipientId,
    input.createdAt,
    input.createdAt,
  );
}

const dependencies: RecipientEvidenceByteUploadDependencies = {
  assertSameOrigin: assertSameOriginPublicPost,
  requiresPassword: requiresClientPortalPassword,
  readRecipientSession: readClientPortalRecipientSession,
  resolvePublicContext: resolveClientPortalBaseContext,
  evaluatePolicy: evaluateClientPortalPolicy,
  readVisibleOwnedRequestExposure,
  readFormData: readBoundedFormData,
  getPolicy: getUploadPolicy,
  reserveAdmission: reserveUploadAdmission,
  buildObjectKey: buildUploadObjectKey,
  createStorageProvider: createRuntimeUploadStorageProvider,
  checkDurableQuota: checkClientPortalEvidenceUploadRateLimits,
  processImage: processSupportImageToWebp,
  reserveUpload: reserveUploadAsset,
  finalizeUpload: finalizeReservedUploadAsset,
  failUpload: failReservedUploadAsset,
  buildPendingEvidenceUploadStatement,
  createId: randomUUID,
  now: () => new Date().toISOString(),
};

async function authorizeRecipientRequest(
  request: Request,
  token: string,
  publicRequestId: string,
  routeDependencies: RecipientEvidenceByteUploadDependencies,
) {
  const cookie = request.headers.get("cookie") ?? "";
  if (await routeDependencies.requiresPassword(token, cookie)) return null;
  const actor = await routeDependencies.readRecipientSession(
    token,
    cookie,
  );
  if (!actor || actor.status !== "active" || actor.verificationState !== "verified") return null;

  const context = await routeDependencies.resolvePublicContext(token, actor, true) as PublicContext | null;
  if (!context) return null;
  const exposure = await routeDependencies.readVisibleOwnedRequestExposure({
    database: context.database,
    portalId: context.portal.id,
    workspaceId: context.portal.workspace_id,
    projectId: context.portal.project_id,
    recipientId: actor.recipientId,
    publicRequestId,
  });
  if (!exposure || exposure.ownerRecipientId !== actor.recipientId) return null;

  const decision = routeDependencies.evaluatePolicy({
    actor,
    action: "artifact:upload_evidence",
    portal: context.policyPortal,
    target: {
      kind: "change_request",
      portalId: context.portal.id,
      exposureStatus: exposure.exposureStatus,
      ownerRecipientId: exposure.ownerRecipientId,
      allowedRecipientIds: [exposure.ownerRecipientId],
    },
  });
  if (!decision.allowed) return null;
  return { actor, context, exposure };
}

function isSupportedMime(value: string): value is SupportedEvidenceMime {
  return Object.hasOwn(MIME_EXTENSIONS, value);
}

type EvidenceFile = {
  arrayBuffer: () => Promise<ArrayBuffer>;
  name: string;
  size: number;
  type: string;
};

function isEvidenceFile(value: unknown): value is EvidenceFile {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<EvidenceFile>;
  return typeof candidate.arrayBuffer === "function"
    && typeof candidate.name === "string"
    && typeof candidate.size === "number"
    && typeof candidate.type === "string";
}

export async function handleRecipientEvidenceByteUpload(
  request: Request,
  token: string,
  publicRequestId: string,
  routeDependencies: RecipientEvidenceByteUploadDependencies = dependencies,
) {
  const origin = routeDependencies.assertSameOrigin(request);
  if (!origin.ok) return json({ error: origin.message }, origin.status);

  const normalizedToken = token.trim();
  const normalizedPublicRequestId = publicRequestId.trim();
  if (!normalizedToken || !normalizedPublicRequestId || normalizedPublicRequestId.length > 200) {
    return unavailable();
  }

  let authorization: Awaited<ReturnType<typeof authorizeRecipientRequest>>;
  try {
    authorization = await authorizeRecipientRequest(
      request,
      normalizedToken,
      normalizedPublicRequestId,
      routeDependencies,
    );
  } catch {
    return unavailable();
  }
  if (!authorization) return unavailable();

  const { actor, context, exposure } = authorization;
  let durableQuota: Awaited<ReturnType<typeof checkClientPortalEvidenceUploadRateLimits>>;
  try {
    durableQuota = await routeDependencies.checkDurableQuota({
      portalId: context.portal.id,
      recipientId: actor.recipientId,
      workspaceId: context.portal.workspace_id,
      request,
    });
  } catch {
    return json({ error: "Evidence upload is temporarily unavailable." }, 503);
  }
  if (!durableQuota.allowed) {
    return json({ error: durableQuota.message }, 429, {
      "Retry-After": String(durableQuota.retryAfter),
    });
  }

  let admission: ReturnType<typeof reserveUploadAdmission>;
  try {
    admission = routeDependencies.reserveAdmission({
      surface: UPLOAD_SURFACE,
      workspaceId: context.portal.workspace_id,
      userId: actor.recipientId,
      request,
    });
  } catch {
    return json({ error: "Evidence upload is unavailable." }, 503);
  }
  if (!admission.allowed) {
    return json({ error: admission.message }, 429, {
      "Retry-After": String(admission.retryAfter),
    });
  }

  try {
    const policy = routeDependencies.getPolicy(UPLOAD_SURFACE);
    const parsed = await routeDependencies.readFormData(
      request,
      policy.maxBytes + MULTIPART_OVERHEAD_BYTES,
    );
    if (!parsed.ok) return json({ error: parsed.error }, parsed.status);

    const file = parsed.value.get("file");
    if (!isEvidenceFile(file)) return json({ error: "Evidence file is required." }, 400);
    const declaredMime = file.type.trim().toLowerCase();
    const allowedMimeTypes = new Set<string>(policy.allowedMimeTypes);
    if (!isSupportedMime(declaredMime) || !allowedMimeTypes.has(declaredMime)) {
      return json({ error: "Evidence file type is not supported." }, 415);
    }
    if (file.size <= 0) return json({ error: "Evidence file is empty." }, 400);
    if (file.size > policy.maxBytes) return json({ error: "Evidence file is too large." }, 413);

    const sourceBytes = Buffer.from(await file.arrayBuffer());
    const magicMime = readEvidenceMagicMime(sourceBytes.subarray(0, 64));
    if (!magicMime || magicMime !== declaredMime) {
      return json({ error: "Evidence file content does not match its type." }, 400);
    }

    const isImage = declaredMime.startsWith("image/");
    let uploadBytes = sourceBytes;
    let uploadContentType: string = declaredMime;
    let uploadFileName = file.name;
    let normalizedImageMetadata: Record<string, string | number> = {};
    if (isImage) {
      const processed = await routeDependencies.processImage({
        sourceBuffer: sourceBytes,
        magicMime,
        maxImagePixels: MAX_EVIDENCE_IMAGE_PIXELS,
        maxImageEdge: MAX_EVIDENCE_IMAGE_EDGE,
      });
      if (processed.status === "cloudflare-image-processing-unavailable") {
        return json({ error: CLOUDFLARE_IMAGE_PROCESSING_UNAVAILABLE_MESSAGE }, 503);
      }
      if (processed.status === "dimensions-too-large") {
        return json({ error: "Evidence image dimensions exceed the 24 megapixel limit." }, 413);
      }
      if (processed.status === "animated-image") {
        return json({ error: "Animated evidence images are not supported." }, 400);
      }
      if (
        processed.status === "unsupported-encoding"
        || processed.status === "missing-dimensions"
        || processed.status === "decode-error"
      ) {
        return json({ error: "Evidence image could not be decoded safely." }, 400);
      }
      uploadBytes = processed.image.data;
      uploadContentType = "image/webp";
      uploadFileName = `${file.name.replace(/\.[^.]+$/, "") || "evidence"}.webp`;
      normalizedImageMetadata = {
        normalizedContentType: uploadContentType,
        normalizedHeight: processed.image.info.height,
        normalizedWidth: processed.image.info.width,
        sourceContentType: declaredMime,
        sourceSizeBytes: sourceBytes.byteLength,
      };
      if (uploadBytes.byteLength > policy.maxBytes) {
        return json({ error: "Normalized evidence image is too large." }, 413);
      }
    }

    const objectPath = routeDependencies.buildObjectKey({
      surface: UPLOAD_SURFACE,
      workspaceId: context.portal.workspace_id,
      userId: actor.recipientId,
      fileName: uploadFileName,
      extension: isImage ? "webp" : MIME_EXTENSIONS[declaredMime],
      targetEntityId: context.portal.project_id,
    });

    let reservation: Awaited<ReturnType<typeof reserveUploadAsset>> | null = null;
    let storageProvider: Awaited<ReturnType<typeof createRuntimeUploadStorageProvider>> | null = null;
    let storageAttempted = false;
    let objectStored = false;
    try {
      reservation = await routeDependencies.reserveUpload(context.database, {
        workspaceId: context.portal.workspace_id,
        actorUserId: actor.recipientId,
        surface: UPLOAD_SURFACE,
        targetEntityType: "project-change-request",
        targetEntityId: exposure.requestId,
        bucket: policy.bucket,
        path: objectPath,
        fileName: uploadFileName,
        contentType: uploadContentType,
        sizeBytes: uploadBytes.byteLength,
        checksumBytes: uploadBytes,
        scanStatus: "pending",
        metadata: {
          portalId: context.portal.id,
          projectId: context.portal.project_id,
          publicRequestId: normalizedPublicRequestId,
          recipientId: actor.recipientId,
          requestId: exposure.requestId,
          requestVersionId: exposure.requestVersionId,
          ...normalizedImageMetadata,
        },
      });
      storageProvider = await routeDependencies.createStorageProvider();
      storageAttempted = true;
      await storageProvider.uploadObject({
        bucket: policy.bucket,
        path: objectPath,
        body: uploadBytes,
        contentType: uploadContentType,
        cacheControl: "private, no-store",
      });
      objectStored = true;
      let finalized = false;
      let finalizationError: unknown;
      for (let attempt = 0; attempt < 2 && !finalized; attempt += 1) {
        const evidenceStatement = routeDependencies.buildPendingEvidenceUploadStatement(context.database, {
          id: routeDependencies.createId(),
          requestVersionId: exposure.requestVersionId,
          uploadAssetId: reservation.assetId,
          recipientId: actor.recipientId,
          createdAt: routeDependencies.now(),
        });
        try {
          await routeDependencies.finalizeUpload(context.database, reservation, [evidenceStatement]);
          finalized = true;
        } catch (error) {
          finalizationError = error;
        }
      }
      if (!finalized) throw finalizationError;
    } catch {
      if (reservation && !objectStored) {
        if (storageAttempted && storageProvider) {
          await storageProvider.removeObjects(policy.bucket, [objectPath]).catch(() => undefined);
        }
        await routeDependencies.failUpload(
          context.database,
          reservation,
          "storage",
        ).catch(() => undefined);
      }
      return json({ error: "Evidence upload could not be finalized." }, 503);
    }

    return json({ status: "pending_scan" }, 201);
  } catch {
    return json({ error: "Evidence upload could not be processed." }, 503);
  } finally {
    try {
      admission.release();
    } catch {
      void 0;
    }
  }
}
