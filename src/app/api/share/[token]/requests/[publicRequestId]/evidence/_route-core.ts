import { randomUUID } from "node:crypto";

import type { D1DatabaseLike } from "@/lib/cloudflare/d1";
import {
  readClientPortalRecipientSession,
  resolveClientPortalBaseContext,
} from "@/lib/client-portal/public-repository";
import {
  evaluateClientPortalPolicy,
} from "@/lib/client-portal/policy";
import { readBoundedFormData } from "@/lib/http/read-bounded-body";
import { assertSameOriginPublicPost } from "@/lib/publication/security";
import { reserveUploadAdmission } from "@/lib/uploads/admission-control";
import { buildUploadObjectKey } from "@/lib/uploads/object-keys";
import { getUploadPolicy } from "@/lib/uploads/policy";
import { createRuntimeUploadStorageProvider } from "@/lib/uploads/runtime-storage-provider";
import { recordUploadAsset } from "@/lib/uploads/upload-records";

const UPLOAD_SURFACE = "portal-request-evidence" as const;
const MULTIPART_OVERHEAD_BYTES = 1024 * 1024;
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
  readRecipientSession: typeof readClientPortalRecipientSession;
  resolvePublicContext: typeof resolveClientPortalBaseContext;
  evaluatePolicy: typeof evaluateClientPortalPolicy;
  readVisibleOwnedRequestExposure: typeof readVisibleOwnedRequestExposure;
  readFormData: typeof readBoundedFormData;
  getPolicy: typeof getUploadPolicy;
  reserveAdmission: typeof reserveUploadAdmission;
  buildObjectKey: typeof buildUploadObjectKey;
  createStorageProvider: typeof createRuntimeUploadStorageProvider;
  recordUpload: typeof recordUploadAsset;
  insertPendingEvidenceUpload: typeof insertPendingEvidenceUpload;
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
  const result = await database.prepare(`
    INSERT INTO project_change_request_evidence_uploads (
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
  ).run();
  if (result.success === false) throw new Error("Could not retain request evidence upload.");
}

const dependencies: RecipientEvidenceByteUploadDependencies = {
  assertSameOrigin: assertSameOriginPublicPost,
  readRecipientSession: readClientPortalRecipientSession,
  resolvePublicContext: resolveClientPortalBaseContext,
  evaluatePolicy: evaluateClientPortalPolicy,
  readVisibleOwnedRequestExposure,
  readFormData: readBoundedFormData,
  getPolicy: getUploadPolicy,
  reserveAdmission: reserveUploadAdmission,
  buildObjectKey: buildUploadObjectKey,
  createStorageProvider: createRuntimeUploadStorageProvider,
  recordUpload: recordUploadAsset,
  insertPendingEvidenceUpload,
  createId: randomUUID,
  now: () => new Date().toISOString(),
};

async function authorizeRecipientRequest(
  request: Request,
  token: string,
  publicRequestId: string,
  routeDependencies: RecipientEvidenceByteUploadDependencies,
) {
  const actor = await routeDependencies.readRecipientSession(
    token,
    request.headers.get("cookie") ?? "",
  );
  if (!actor || actor.status !== "active" || actor.verificationState !== "verified") return null;

  const context = await routeDependencies.resolvePublicContext(token, actor, false) as PublicContext | null;
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

    const bytes = Buffer.from(await file.arrayBuffer());
    const magicMime = readEvidenceMagicMime(bytes.subarray(0, 64));
    if (!magicMime || magicMime !== declaredMime) {
      return json({ error: "Evidence file content does not match its type." }, 400);
    }

    const objectPath = routeDependencies.buildObjectKey({
      surface: UPLOAD_SURFACE,
      workspaceId: context.portal.workspace_id,
      userId: actor.recipientId,
      fileName: file.name,
      extension: MIME_EXTENSIONS[declaredMime],
      targetEntityId: context.portal.project_id,
    });

    let storageProvider: Awaited<ReturnType<typeof createRuntimeUploadStorageProvider>>;
    try {
      storageProvider = await routeDependencies.createStorageProvider();
      await storageProvider.uploadObject({
        bucket: policy.bucket,
        path: objectPath,
        body: bytes,
        contentType: declaredMime,
        cacheControl: "private, no-store",
      });
    } catch {
      return json({ error: "Evidence upload could not be stored." }, 503);
    }

    try {
      const upload = await routeDependencies.recordUpload(context.database, {
        workspaceId: context.portal.workspace_id,
        actorUserId: actor.recipientId,
        surface: UPLOAD_SURFACE,
        targetEntityType: "project-change-request",
        targetEntityId: exposure.requestId,
        bucket: policy.bucket,
        path: objectPath,
        fileName: file.name,
        contentType: declaredMime,
        sizeBytes: bytes.byteLength,
        checksumBytes: bytes,
        scanStatus: "pending",
        metadata: {
          portalId: context.portal.id,
          projectId: context.portal.project_id,
          publicRequestId: normalizedPublicRequestId,
          recipientId: actor.recipientId,
          requestId: exposure.requestId,
          requestVersionId: exposure.requestVersionId,
        },
      });
      await routeDependencies.insertPendingEvidenceUpload(context.database, {
        id: routeDependencies.createId(),
        requestVersionId: exposure.requestVersionId,
        uploadAssetId: upload.assetId,
        recipientId: actor.recipientId,
        createdAt: routeDependencies.now(),
      });
    } catch {
      await storageProvider.removeObjects(policy.bucket, [objectPath]).catch(() => undefined);
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
