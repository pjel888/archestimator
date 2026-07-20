import { gateAdminApiGet, gateAdminApiMutation, NO_STORE_HEADERS } from "@/lib/admin/require-admin";
import {
  buildSupportDraftR2Key,
  getSupportUploadsR2,
} from "@/lib/email/support-outbound-attachments";
import { classifyInboundAttachment, sha256Hex } from "@/lib/email/support-email-attachments";
import { readSupportEmailConfig } from "@/lib/email/support-email-config";

export const dynamic = "force-dynamic";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/iu;

function jsonError(message: string, status: number) {
  return Response.json({ error: message }, { status, headers: NO_STORE_HEADERS });
}

/**
 * Upload a draft attachment for the support composer (admin-only).
 * Files live under support-email/drafts/{adminId}/{draftId}/ until send materializes them.
 */
export async function POST(request: Request) {
  const gate = await gateAdminApiMutation(request);
  if (!gate.ok) return gate.response;

  const config = readSupportEmailConfig();
  const r2 = await getSupportUploadsR2();
  if (!r2) return jsonError("Attachment storage unavailable.", 503);

  const form = await request.formData().catch(() => null);
  if (!form) return jsonError("Expected multipart form data.", 400);

  const file = form.get("file");
  if (!(file instanceof File)) return jsonError("file is required.", 400);
  if (file.size <= 0) return jsonError("Empty file.", 400);
  if (file.size > config.maxAttachmentBytes) {
    return jsonError(`File exceeds ${config.maxAttachmentBytes} byte limit.`, 413);
  }

  const decision = classifyInboundAttachment({
    filename: file.name,
    contentType: file.type || "application/octet-stream",
  });
  if (decision.blocked) {
    return jsonError("This file type is not allowed.", 415);
  }

  const draftId = crypto.randomUUID();
  const r2Key = buildSupportDraftR2Key({
    adminUserId: gate.context.userId,
    draftId,
    filename: decision.sanitizedFilename,
  });
  const bytes = new Uint8Array(await file.arrayBuffer());
  const digest = await sha256Hex(bytes);

  await r2.put(r2Key, bytes, {
    httpMetadata: {
      contentType: decision.safeContentType,
      cacheControl: "private, max-age=3600",
    },
  });

  const isImage = decision.safeContentType.startsWith("image/");
  const previewUrl = isImage
    ? `/api/admin/support/uploads?draftId=${encodeURIComponent(draftId)}&filename=${encodeURIComponent(decision.sanitizedFilename)}`
    : null;

  return Response.json(
    {
      draftId,
      r2Key,
      filename: decision.sanitizedFilename,
      contentType: decision.safeContentType,
      sizeBytes: bytes.byteLength,
      sha256: digest,
      isImage,
      previewUrl,
    },
    { status: 201, headers: NO_STORE_HEADERS },
  );
}

/**
 * Preview a draft image owned by the current admin.
 */
export async function GET(request: Request) {
  const gate = await gateAdminApiGet();
  if (!gate.ok) return gate.response;

  const url = new URL(request.url);
  const draftId = url.searchParams.get("draftId");
  if (!draftId || !UUID_PATTERN.test(draftId)) {
    return jsonError("Invalid draftId.", 400);
  }

  const filename = url.searchParams.get("filename");
  if (!filename) {
    return jsonError("filename is required for draft preview.", 400);
  }

  const r2 = await getSupportUploadsR2();
  if (!r2) return jsonError("Attachment storage unavailable.", 503);

  const r2Key = buildSupportDraftR2Key({
    adminUserId: gate.context.userId,
    draftId,
    filename,
  });
  const object = await r2.get(r2Key);
  if (!object) {
    return jsonError("Draft not found.", 404);
  }

  const body = object.body ?? new Uint8Array(await object.arrayBuffer());
  return new Response(body as BodyInit, {
    status: 200,
    headers: {
      ...NO_STORE_HEADERS,
      "Content-Type": object.httpMetadata?.contentType || "application/octet-stream",
      "X-Content-Type-Options": "nosniff",
      "Cache-Control": "private, max-age=60",
    },
  });
}
