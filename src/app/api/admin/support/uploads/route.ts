import { gateAdminApiGet, gateAdminApiMutation, NO_STORE_HEADERS } from "@/lib/admin/require-admin";
import {
  getSupportUploadsR2,
} from "@/lib/email/support-outbound-attachments";
import { classifyInboundAttachment, sha256Hex } from "@/lib/email/support-email-attachments";
import { readSupportEmailConfig } from "@/lib/email/support-email-config";
import { getCloudflareD1Database } from "@/lib/cloudflare/d1";
import {
  addSupportDraftAttachmentInD1,
  getSupportDraftForAdminInD1,
  getOrCreateSupportDraftInD1,
  listSupportDraftAttachmentsInD1,
} from "@/lib/repositories/support-drafts-d1";

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

  const draftId = form.get("draftId");
  if (typeof draftId !== "string" || !UUID_PATTERN.test(draftId)) return jsonError("A valid draftId is required.", 400);
  const db = await getCloudflareD1Database();
  if (!db) return jsonError("Draft storage unavailable.", 503);
  const kind = form.get("kind");
  const conversationId = form.get("conversationId");
  if (kind !== "reply" && kind !== "new_email") return jsonError("Invalid draft kind.", 400);
  if (kind === "reply" && (typeof conversationId !== "string" || !conversationId)) {
    return jsonError("Reply draft conversation is required.", 400);
  }
  const draft = await getOrCreateSupportDraftInD1({
    db,
    adminUserId: gate.context.userId,
    scopeKey: draftId,
    kind,
    conversationId: typeof conversationId === "string" ? conversationId : null,
    clientMessageId: draftId,
  });
  if (!draft || draft.lifecycle !== "editing") return jsonError("Draft is unavailable.", 409);

  const r2Key = `support-email/drafts/${gate.context.userId.replace(/[^a-zA-Z0-9_-]/g, "_")}/${draftId}/${crypto.randomUUID()}-${decision.sanitizedFilename}`;
  const bytes = new Uint8Array(await file.arrayBuffer());
  const digest = await sha256Hex(bytes);

  await r2.put(r2Key, bytes, {
    httpMetadata: {
      contentType: decision.safeContentType,
      cacheControl: "private, max-age=3600",
    },
  });
  let attachmentId: string;
  try {
    const attachment = await addSupportDraftAttachmentInD1({
      db,
      draft_id: draftId,
      r2_key: r2Key,
      filename: decision.sanitizedFilename,
      content_type: decision.safeContentType,
      size_bytes: bytes.byteLength,
      sha256: digest,
    });
    attachmentId = attachment.id;
  } catch {
    await r2.delete?.(r2Key).catch(() => undefined);
    return jsonError("Draft attachment could not be saved.", 409);
  }

  const isImage = decision.safeContentType.startsWith("image/");
  const previewUrl = isImage
    ? `/api/admin/support/uploads?draftId=${encodeURIComponent(draftId)}&attachmentId=${encodeURIComponent(attachmentId)}`
    : null;

  return Response.json(
    {
      draftId,
      attachmentId,
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

  const attachmentId = url.searchParams.get("attachmentId");
  if (!attachmentId || !UUID_PATTERN.test(attachmentId)) return jsonError("attachmentId is required.", 400);

  const db = await getCloudflareD1Database();
  if (!db) return jsonError("Draft storage unavailable.", 503);
  const draft = await getSupportDraftForAdminInD1(db, draftId, gate.context.userId);
  if (!draft) return jsonError("Draft not found.", 404);
  const attachment = (await listSupportDraftAttachmentsInD1(db, draftId)).find((candidate) => candidate.id === attachmentId);
  if (!attachment) return jsonError("Draft attachment not found.", 404);

  const r2 = await getSupportUploadsR2();
  if (!r2) return jsonError("Attachment storage unavailable.", 503);

  const object = await r2.get(attachment.r2_key);
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
