import { randomUUID } from "node:crypto";

import { NextResponse } from "next/server";

import { requireCurrentUserContext } from "@/lib/auth/session";
import { getCloudflareD1Database } from "@/lib/cloudflare/d1";
import { ensureDefaultWorkspace } from "@/lib/repositories/workspace-repository";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { reserveUploadAdmission } from "@/lib/uploads/admission-control";
import { createRuntimeUploadStorageProvider } from "@/lib/uploads/runtime-storage-provider";
import { decideUploadScanGate, type UploadScanStatus } from "@/lib/uploads/scanning";
import { recordUploadAsset } from "@/lib/uploads/upload-records";

export const runtime = "nodejs";

const COMPONENT_ATTACHMENT_BUCKET = "component-attachments";
const MAX_UPLOAD_BYTES = 20 * 1024 * 1024;
const PRIVATE_ATTACHMENT_ERROR_CACHE_CONTROL = "private, no-cache, no-store, max-age=0, must-revalidate";
const ALLOWED_MIME_TYPES = new Set([
  "application/pdf",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
]);

const EXTENSION_BY_MIME_TYPE = new Map([
  ["application/pdf", "pdf"],
  ["application/vnd.ms-excel", "xls"],
  ["application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "xlsx"],
]);
const ALLOWED_ATTACHMENT_EXTENSIONS = [".pdf", ".xls", ".xlsx"] as const;

function jsonError(message: string, status = 400, headers?: HeadersInit) {
  return NextResponse.json({ error: message }, { status, headers });
}

function privateAttachmentNotFound() {
  return NextResponse.json(
    { error: "Attachment could not be found." },
    {
      status: 404,
      headers: {
        "Cache-Control": PRIVATE_ATTACHMENT_ERROR_CACHE_CONTROL,
      },
    },
  );
}

function privateAttachmentUnavailable(message = "Attachment is not available until scanning is complete.") {
  return jsonError(message, 409, {
    "Cache-Control": PRIVATE_ATTACHMENT_ERROR_CACHE_CONTROL,
  });
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function safeContentDisposition(fileName: string) {
  const fallback = fileName
    .replace(/[^\x20-\x7e]+/g, "-")
    .replace(/[\\"]/g, "")
    .trim();
  return `attachment; filename="${fallback || "component-attachment"}"`;
}

function includesAscii(bytes: Uint8Array, value: string) {
  return Buffer.from(bytes).includes(value);
}

function looksLikeXlsx(bytes: Uint8Array) {
  return (
    bytes.length >= 2
    && bytes[0] === 0x50
    && bytes[1] === 0x4b
    && includesAscii(bytes, "[Content_Types].xml")
    && includesAscii(bytes, "xl/workbook.xml")
  );
}

function readMagicMime(bytes: Uint8Array): string | null {
  if (
    bytes.length >= 5
    && bytes[0] === 0x25
    && bytes[1] === 0x50
    && bytes[2] === 0x44
    && bytes[3] === 0x46
    && bytes[4] === 0x2d
  ) {
    return "application/pdf";
  }

  if (looksLikeXlsx(bytes)) {
    return "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
  }

  if (
    bytes.length >= 8
    && bytes[0] === 0xd0
    && bytes[1] === 0xcf
    && bytes[2] === 0x11
    && bytes[3] === 0xe0
    && bytes[4] === 0xa1
    && bytes[5] === 0xb1
    && bytes[6] === 0x1a
    && bytes[7] === 0xe1
  ) {
    return "application/vnd.ms-excel";
  }

  return null;
}

function isOwnedAttachmentPath(path: string, workspaceId: string, userId: string) {
  return (
    path.startsWith(`${workspaceId}/${userId}/`)
    && ALLOWED_ATTACHMENT_EXTENSIONS.some((extension) => path.endsWith(extension))
    && !path.includes("..")
    && !path.includes("//")
  );
}

type AttachmentDownloadRow = {
  id: string;
  workspace_id: string;
  storage_bucket: string;
  storage_path: string;
  file_name: string;
  content_type: string;
  size_bytes: number;
  review_status?: string | null;
  is_current_approved?: boolean | null;
};

type UploadAssetScanRow = {
  id: string;
  upload_session_id: string;
  workspace_id: string;
  surface: string;
  storage_bucket: string;
  storage_path: string;
  status: string;
  scan_status: string;
  scan_override_expires_at?: string | null;
};

type AttachmentDownloadQuery<T> = {
  select: (columns: string) => AttachmentDownloadQuery<T>;
  eq: (column: string, value: unknown) => AttachmentDownloadQuery<T>;
  maybeSingle: () => PromiseLike<{ data: T | null; error: { message?: string | null } | null }>;
};

type AttachmentDownloadLookupResult = {
  attachment: AttachmentDownloadRow | null;
  lookupFailed: boolean;
  unavailableReason?: "not_approved";
};

type UploadEventInsertQuery = {
  insert: (row: Record<string, unknown>) => PromiseLike<{ error: { message?: string | null } | null }>;
};

type AttachmentDownloadClient = {
  from: {
    (table: "cost_library_item_variant_attachments"): AttachmentDownloadQuery<AttachmentDownloadRow>;
    (table: "upload_assets"): AttachmentDownloadQuery<UploadAssetScanRow>;
    (table: "upload_events"): UploadEventInsertQuery;
  };
};

function readStoragePaths(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return [];
  const rawPaths = (value as { path?: unknown; paths?: unknown }).paths ?? (value as { path?: unknown }).path;
  const paths = Array.isArray(rawPaths) ? rawPaths : [rawPaths];
  return paths.filter((path): path is string => typeof path === "string" && path.trim().length > 0).map((path) => path.trim());
}

function isMissingAttachmentGovernanceColumnError(error: { code?: string | null; message?: string | null }) {
  return error.code === "42703" || /review_status|is_current_approved/i.test(error.message ?? "");
}

function safeUploadName(name: string) {
  const stem = name
    .replace(/\.[^.]+$/, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
  return stem || "component-attachment";
}

function isUploadScanStatus(value: string): value is UploadScanStatus {
  return [
    "not_required",
    "pending",
    "clean",
    "infected",
    "unsupported",
    "failed_transient",
    "failed_permanent",
    "override_approved",
  ].includes(value);
}

function uploadMetadataUnavailableResponse() {
  return jsonError("Cloudflare D1 upload metadata is not configured.", 503);
}

async function canManageLibrary(workspaceId: string) {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("is_workspace_editor", {
    target_workspace_id: workspaceId,
  });
  if (error) {
    console.error("Component attachment authorization failed", error);
    return false;
  }
  return data === true;
}

async function readAttachmentDownloadRecord(
  client: unknown,
  attachmentId: string,
  workspaceId: string,
): Promise<AttachmentDownloadLookupResult> {
  const downloadClient = client as AttachmentDownloadClient;
  const { data, error } = await downloadClient
    .from("cost_library_item_variant_attachments")
    .select("id, workspace_id, storage_bucket, storage_path, file_name, content_type, size_bytes, review_status, is_current_approved")
    .eq("id", attachmentId)
    .eq("workspace_id", workspaceId)
    .maybeSingle();

  if (error) {
    console.error("Component attachment lookup failed", error);
    return { attachment: null, lookupFailed: true };
  }

  if (!data) return { attachment: null, lookupFailed: false };
  if (data.storage_bucket !== COMPONENT_ATTACHMENT_BUCKET || !ALLOWED_MIME_TYPES.has(data.content_type)) {
    return { attachment: null, lookupFailed: false };
  }
  if (data.review_status !== "approved" || data.is_current_approved !== true) {
    return { attachment: null, lookupFailed: false, unavailableReason: "not_approved" };
  }
  return { attachment: data, lookupFailed: false };
}

async function readCleanUploadAsset(client: unknown, attachment: AttachmentDownloadRow) {
  const downloadClient = client as AttachmentDownloadClient;
  const { data, error } = await downloadClient
    .from("upload_assets")
    .select("id, upload_session_id, workspace_id, surface, storage_bucket, storage_path, status, scan_status, scan_override_expires_at")
    .eq("workspace_id", attachment.workspace_id)
    .eq("storage_bucket", COMPONENT_ATTACHMENT_BUCKET)
    .eq("storage_path", attachment.storage_path)
    .maybeSingle();

  if (error) {
    console.error("Component attachment upload asset lookup failed", error);
    return { uploadAsset: null, lookupFailed: true };
  }

  if (
    !data
    || data.workspace_id !== attachment.workspace_id
    || data.surface !== "component-attachment"
    || data.storage_bucket !== COMPONENT_ATTACHMENT_BUCKET
    || data.storage_path !== attachment.storage_path
    || data.status !== "finalized"
    || !isUploadScanStatus(data.scan_status)
  ) {
    return { uploadAsset: null, lookupFailed: false };
  }

  const scanDecision = decideUploadScanGate({
    surface: "component-attachment",
    scanStatus: data.scan_status,
    overrideExpiresAt: data.scan_override_expires_at ?? null,
  });
  if (!scanDecision.allowed) return { uploadAsset: null, lookupFailed: false };

  return { uploadAsset: data, lookupFailed: false };
}

async function recordAttachmentDownloadIssued(
  client: unknown,
  attachment: AttachmentDownloadRow,
  uploadAsset: UploadAssetScanRow,
  actorUserId: string,
) {
  const downloadClient = client as AttachmentDownloadClient;
  const { error } = await downloadClient.from("upload_events").insert({
    workspace_id: attachment.workspace_id,
    upload_session_id: uploadAsset.upload_session_id,
    upload_asset_id: uploadAsset.id,
    actor_user_id: actorUserId,
    event_type: "download_url_issued",
    metadata: {
      attachmentId: attachment.id,
      storagePath: attachment.storage_path,
      reviewStatus: attachment.review_status ?? null,
      isCurrentApproved: attachment.is_current_approved ?? null,
    },
  });

  if (error) {
    console.error("Component attachment download audit failed", error);
    return false;
  }
  return true;
}

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const attachmentId = requestUrl.searchParams.get("id") ?? "";
  if (!isUuid(attachmentId)) return privateAttachmentNotFound();

  const [{ workspace }, currentUser] = await Promise.all([ensureDefaultWorkspace(), requireCurrentUserContext()]);
  if (!(await canManageLibrary(workspace.id))) {
    return jsonError("Only workspace editors/admins can manage the library.", 403, {
      "Cache-Control": PRIVATE_ATTACHMENT_ERROR_CACHE_CONTROL,
    });
  }

  const storageSupabase = await createSupabaseServerClient();
  const {
    attachment,
    lookupFailed: attachmentLookupFailed,
    unavailableReason: attachmentUnavailableReason,
  } = await readAttachmentDownloadRecord(storageSupabase, attachmentId, workspace.id);
  if (attachmentLookupFailed) return jsonError("Could not verify attachment.", 500, { "Cache-Control": PRIVATE_ATTACHMENT_ERROR_CACHE_CONTROL });
  if (attachmentUnavailableReason === "not_approved") return privateAttachmentUnavailable("Attachment is not available until approval is complete.");
  if (!attachment) return privateAttachmentNotFound();

  const { uploadAsset, lookupFailed: uploadAssetLookupFailed } = await readCleanUploadAsset(storageSupabase, attachment);
  if (uploadAssetLookupFailed) {
    return jsonError("Could not verify attachment scan status.", 500, { "Cache-Control": PRIVATE_ATTACHMENT_ERROR_CACHE_CONTROL });
  }
  if (!uploadAsset) return privateAttachmentUnavailable();

  const auditRecorded = await recordAttachmentDownloadIssued(storageSupabase, attachment, uploadAsset, currentUser.userId);
  if (!auditRecorded) return privateAttachmentUnavailable("Attachment download could not be audited.");

  const storageProvider = await createRuntimeUploadStorageProvider();
  const object = await storageProvider.downloadObject(COMPONENT_ATTACHMENT_BUCKET, attachment.storage_path).catch(() => null);
  if (!object) return privateAttachmentNotFound();

  return new Response(object.body, {
    headers: {
      "Cache-Control": "private, max-age=300",
      "Content-Disposition": safeContentDisposition(attachment.file_name),
      "Content-Length": String(attachment.size_bytes),
      "Content-Type": attachment.content_type,
      "X-Content-Type-Options": "nosniff",
    },
  });
}

export async function POST(request: Request) {
  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (contentLength > MAX_UPLOAD_BYTES + 1024 * 1024) {
    return jsonError("Attachment upload is too large. Choose a PDF or Excel file under 20 MB.", 413);
  }

  const [{ workspace }, currentUser] = await Promise.all([ensureDefaultWorkspace(), requireCurrentUserContext()]);
  if (!(await canManageLibrary(workspace.id))) {
    return jsonError("Only workspace editors/admins can manage the library.", 403);
  }

  const admission = reserveUploadAdmission({ surface: "component-attachment", workspaceId: workspace.id, userId: currentUser.userId, request });
  if (!admission.allowed) {
    return jsonError(admission.message, 429, { "Retry-After": String(admission.retryAfter) });
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file");
    if (!(file instanceof File)) return jsonError("Attachment file is required.");
    if (file.size <= 0) return jsonError("Attachment file is empty.");
    if (file.size > MAX_UPLOAD_BYTES) return jsonError("Attachment upload is too large. Choose a PDF or Excel file under 20 MB.", 413);

    const sourceBuffer = Buffer.from(await file.arrayBuffer());
    const magicMime = readMagicMime(sourceBuffer);
    if (!magicMime || !ALLOWED_MIME_TYPES.has(magicMime)) {
      return jsonError("The uploaded file does not look like a supported attachment.");
    }

    const declaredMime = file.type.trim();
    if (declaredMime && ALLOWED_MIME_TYPES.has(declaredMime) && declaredMime !== magicMime) {
      return jsonError("The uploaded file does not look like a supported attachment.");
    }

    const extension = EXTENSION_BY_MIME_TYPE.get(magicMime);
    if (!extension) return jsonError("Use a PDF, XLS, or XLSX attachment.");

    const uploadMetadataDb = await getCloudflareD1Database();
    if (!uploadMetadataDb) return uploadMetadataUnavailableResponse();

    const path = `${workspace.id}/${currentUser.userId}/${safeUploadName(file.name)}-${randomUUID()}.${extension}`;
    let uploadedPath: string | null = null;

    try {
      const storageProvider = await createRuntimeUploadStorageProvider();
      await storageProvider.uploadObject({
        bucket: COMPONENT_ATTACHMENT_BUCKET,
        path,
        body: sourceBuffer,
        contentType: magicMime,
        cacheControl: "31536000",
      });
      uploadedPath = path;
      const uploadRecord = await recordUploadAsset(uploadMetadataDb, {
        workspaceId: workspace.id,
        actorUserId: currentUser.userId,
        surface: "component-attachment",
        targetEntityType: "component-library",
        targetEntityId: null,
        bucket: COMPONENT_ATTACHMENT_BUCKET,
        path,
        fileName: file.name,
        contentType: magicMime,
        sizeBytes: file.size,
        checksumBytes: sourceBuffer,
        scanStatus: "pending",
        metadata: {
          attachmentKind: extension === "pdf" ? "pdf" : "excel",
        },
      });

      return NextResponse.json({
        bucket: COMPONENT_ATTACHMENT_BUCKET,
        uploadSessionId: uploadRecord.uploadSessionId,
        assetId: uploadRecord.assetId,
        scanStatus: uploadRecord.scanStatus,
        path,
        fileName: file.name,
        contentType: magicMime,
        sizeBytes: file.size,
      });
    } catch (error) {
      console.error("Component attachment upload failed", error);
      if (uploadedPath) {
        const storageProvider = await createRuntimeUploadStorageProvider().catch(() => null);
        await storageProvider?.removeObjects(COMPONENT_ATTACHMENT_BUCKET, [uploadedPath]).catch(() => undefined);
      }
      return jsonError("Could not store attachment.", 500);
    }
  } finally {
    admission.release();
  }
}

export async function DELETE(request: Request) {
  const [{ workspace }, currentUser] = await Promise.all([ensureDefaultWorkspace(), requireCurrentUserContext()]);
  if (!(await canManageLibrary(workspace.id))) {
    return jsonError("Only workspace editors/admins can manage the library.", 403);
  }

  const body = await request.json().catch(() => null);
  const paths = readStoragePaths(body).filter((path) => isOwnedAttachmentPath(path, workspace.id, currentUser.userId));
  if (paths.length === 0) return jsonError("No removable attachment paths were provided.");

  const supabase = await createSupabaseServerClient();
  const { data: attachmentRows, error: attachmentLookupError } = await supabase
    .from("cost_library_item_variant_attachments")
    .select("storage_path, review_status, is_current_approved")
    .eq("workspace_id", workspace.id)
    .in("storage_path", paths);

  if (attachmentLookupError && !isMissingAttachmentGovernanceColumnError(attachmentLookupError)) {
    return jsonError("Could not verify attachment review state.", 500);
  }

  if (!attachmentLookupError) {
    const reviewedAttachment = ((attachmentRows ?? []) as Array<{
      storage_path: string | null;
      review_status?: string | null;
      is_current_approved?: boolean | null;
    }>).find((row) => row.is_current_approved === true || (row.review_status && row.review_status !== "uploaded"));
    if (reviewedAttachment) {
      return jsonError("Reviewed Library attachments cannot be removed from draft cleanup.", 409);
    }
  }

  const storageProvider = await createRuntimeUploadStorageProvider();
  try {
    await storageProvider.removeObjects(COMPONENT_ATTACHMENT_BUCKET, paths);
  } catch {
    return jsonError("Could not remove uploaded attachment.", 500);
  }
  return NextResponse.json({ removedPaths: paths });
}
