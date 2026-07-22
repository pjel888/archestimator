import { gateAdminApiGet, gateAdminApiMutation, NO_STORE_HEADERS } from "@/lib/admin/require-admin";
import {
  getSupportUploadsR2,
} from "@/lib/email/support-outbound-attachments";
import { classifyInboundAttachment, sha256Hex } from "@/lib/email/support-email-attachments";
import { readSupportEmailConfig } from "@/lib/email/support-email-config";
import { getCloudflareD1Database } from "@/lib/cloudflare/d1";
import { runRequiredD1Batch } from "@/lib/cloudflare/d1-batch";
import {
  getSupportDraftForAdminInD1,
  listSupportDraftAttachmentsInD1,
} from "@/lib/repositories/support-drafts-d1";
import {
  captureSupportPrivacyWriteGate,
  supportPrivacyWriteGateSql,
  supportPrivacyWriteGateValues,
  type SupportPrivacyWriteGate,
} from "@/lib/support/privacy-fence";
import {
  forgetSupportSubjectR2Object,
  markSupportSubjectR2ObjectStoredStatement,
  reserveOpenSupportSubjectR2Object,
} from "@/lib/support/subject-r2-registry";

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
  const resolvedConversationId = typeof conversationId === "string" ? conversationId : null;
  let privacyGate: SupportPrivacyWriteGate = null;
  if (resolvedConversationId) {
    const conversation = await db.prepare<{ user_id: string | null }>(
      "SELECT user_id FROM support_conversations WHERE id = ? LIMIT 1",
    ).bind(resolvedConversationId).first<{ user_id: string | null }>();
    if (!conversation) return jsonError("Draft is unavailable.", 409);
    try {
      privacyGate = await captureSupportPrivacyWriteGate(db, conversation.user_id);
    } catch {
      return jsonError("support_subject_fenced", 409);
    }
  }
  let draft = await getSupportDraftForAdminInD1(db, draftId, gate.context.userId);
  if (!draft) {
    const now = new Date().toISOString();
    const insertDraft = db.prepare(
      `INSERT OR IGNORE INTO support_drafts (
         id, admin_user_id, scope_key, kind, conversation_id, client_message_id,
         lifecycle, revision, created_at, updated_at
       ) SELECT ?, ?, ?, ?, ?, ?, 'editing', 1, ?, ?
       WHERE ${supportPrivacyWriteGateSql("draft_upload_fence")}`,
    ).bind(
      draftId,
      gate.context.userId,
      draftId,
      kind,
      resolvedConversationId,
      draftId,
      now,
      now,
      ...supportPrivacyWriteGateValues(privacyGate),
    );
    const [created] = await runRequiredD1Batch(db, [insertDraft], "Support draft could not be created.");
    if ((created.meta?.changes ?? 0) !== 1) return jsonError("support_subject_fenced", 409);
    draft = await getSupportDraftForAdminInD1(db, draftId, gate.context.userId);
  }
  if (
    !draft
    || draft.lifecycle !== "editing"
    || draft.kind !== kind
    || draft.conversation_id !== resolvedConversationId
  ) return jsonError("Draft is unavailable.", 409);

  const r2Key = `support-email/drafts/${gate.context.userId.replace(/[^a-zA-Z0-9_-]/g, "_")}/${draftId}/${crypto.randomUUID()}-${decision.sanitizedFilename}`;
  const bytes = new Uint8Array(await file.arrayBuffer());
  const digest = await sha256Hex(bytes);
  const attachmentId = crypto.randomUUID();
  let subjectReservation = false;

  try {
    if (privacyGate) {
      await reserveOpenSupportSubjectR2Object({
        database: db,
        privacyGate,
        r2Key,
        sourceId: attachmentId,
        sourceKind: "admin_draft_attachment",
      });
      subjectReservation = true;
    }
    await r2.put(r2Key, bytes, {
      httpMetadata: {
        contentType: decision.safeContentType,
        cacheControl: "private, max-age=3600",
      },
    });
    const insertAttachment = db.prepare(
      `INSERT INTO support_draft_attachments (
         id, draft_id, r2_key, filename, content_type, size_bytes, sha256, created_at
       ) SELECT ?, ?, ?, ?, ?, ?, ?, ?
       WHERE EXISTS (
         SELECT 1 FROM support_drafts draft
         WHERE draft.id = ? AND draft.admin_user_id = ? AND draft.lifecycle = 'editing'
       ) AND ${supportPrivacyWriteGateSql("draft_attachment_fence")}`,
    ).bind(
      attachmentId,
      draft.id,
      r2Key,
      decision.sanitizedFilename,
      decision.safeContentType,
      bytes.byteLength,
      digest,
      new Date().toISOString(),
      draft.id,
      gate.context.userId,
      ...supportPrivacyWriteGateValues(privacyGate),
    );
    const statements = [insertAttachment];
    if (privacyGate) {
      statements.push(markSupportSubjectR2ObjectStoredStatement({
        database: db,
        r2Key,
        sourceId: attachmentId,
        sourceKind: "admin_draft_attachment",
        storedAt: new Date().toISOString(),
        userId: privacyGate.userId,
      }));
    }
    const results = await runRequiredD1Batch(db, statements, "Draft attachment could not be saved.");
    if (results.some((result) => (result.meta?.changes ?? 0) !== 1)) {
      throw new Error("support_subject_fenced");
    }
  } catch {
    try {
      if (!r2.delete) throw new Error("support_r2_delete_unavailable");
      await r2.delete(r2Key);
      const remaining = await r2.get(r2Key);
      if (remaining) {
        await remaining.body?.cancel().catch(() => undefined);
        throw new Error("support_r2_delete_unconfirmed");
      }
      if (subjectReservation && privacyGate) {
        await forgetSupportSubjectR2Object({
          database: db,
          r2Key,
          userId: privacyGate.userId,
        });
      }
    } catch (cleanupError) {
      // A durable subject reservation intentionally remains for erasure retry.
      void cleanupError;
    }
    return jsonError(privacyGate ? "support_subject_fenced" : "Draft attachment could not be saved.", 409);
  }

  const isImage = decision.safeContentType.startsWith("image/");
  const previewUrl = isImage
    ? `/api/admin/support/uploads?draftId=${encodeURIComponent(draftId)}&attachmentId=${encodeURIComponent(attachmentId)}`
    : null;

  return Response.json(
    {
      draftId: draft.id,
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
