"use server";

import { revalidatePath } from "next/cache";

import { writeAdminAuditEvent } from "@/lib/admin/audit";
import { requireAdminContext } from "@/lib/admin/require-admin";
import { getCurrentUserContext } from "@/lib/auth/session";
import { getCloudflareD1Database, type D1DatabaseLike } from "@/lib/cloudflare/d1";
import { sendEmail } from "@/lib/email/transactional-email-client";
import {
  createSupportConversation,
  claimFailedSupportMessageRetryInD1,
  getSupportConversationInD1,
  insertSupportMessageIfNewInD1,
  markSupportMessageSendStatusInD1,
  normalizeSupportConversationStatus,
  updateSupportConversationStatus,
  type SupportConversationRow,
  type SupportConversationStatus,
  type SupportMessageRow,
} from "@/lib/repositories/support-conversations-repository";

export type SupportActionResult<T> =
  | { ok: true; data: T }
  | {
      ok: false;
      error: "unauthorized" | "validation" | "d1_unavailable" | "not_found" | "email_send_failed" | "delivery_pending" | "delivery_uncertain" | "failed";
      message?: SupportMessageRow;
    };

function normalizeActionText(value: string, field: string, maxLength: number): string {
  const trimmed = value.trim();
  if (!trimmed) throw new Error(`${field} is required.`);
  if (trimmed.length > maxLength) throw new Error(`${field} must be ${maxLength} characters or fewer.`);
  return trimmed;
}

async function writeSupportAudit(input: {
  actorUserId: string;
  actorEmail: string;
  action: string;
  targetId: string;
  summary?: Record<string, unknown>;
}) {
  await writeAdminAuditEvent({
    actorUserId: input.actorUserId,
    actorEmail: input.actorEmail,
    action: input.action,
    targetType: "support_conversation",
    targetId: input.targetId,
    summary: input.summary ?? null,
  });
}

/**
 * Re-attempts email delivery for a previously-failed support reply.
 * This is called when sendSupportReply is invoked with a clientMessageId
 * that already exists with send_status="send_failed". Instead of permanently
 * blocking, we retry the email send so the operator can recover.
 */
async function retrySupportReplyEmail(input: {
  admin: { userId: string; email: string | null };
  conversation: SupportConversationRow;
  existingMessage: SupportMessageRow;
  db: D1DatabaseLike;
}): Promise<SupportActionResult<{ message: SupportMessageRow; conversation: SupportConversationRow }>> {
  const { admin, conversation, existingMessage, db } = input;
  const claimedMessage = await claimFailedSupportMessageRetryInD1(db, existingMessage.id);
  if (!claimedMessage) {
    return { ok: false, error: "delivery_pending", message: existingMessage };
  }

  let finalMessage: SupportMessageRow | null = claimedMessage;

  if (conversation.requester_email) {
    const result = await sendEmail({
      to: conversation.requester_email,
      subject: conversation.subject ? `Re: ${conversation.subject}` : "Archestimator support reply",
      text: existingMessage.body_text,
    });
    if (!result.ok) {
      await writeSupportAudit({
        actorUserId: admin.userId,
        actorEmail: admin.email ?? "unknown",
        action: "support.reply_send_failed",
        targetId: conversation.id,
        summary: { messageId: claimedMessage.id, code: result.code ?? "unknown", retry: true },
      });
      revalidatePath("/admin/support");
      const failedMessage = await markSupportMessageSendStatusInD1(db, {
        messageId: claimedMessage.id,
        sendStatus: "send_failed",
      });
      if (!failedMessage) return { ok: false, error: "delivery_uncertain", message: claimedMessage };
      return { ok: false, error: "email_send_failed", message: failedMessage };
    }
    finalMessage = (await markSupportMessageSendStatusInD1(db, {
      messageId: claimedMessage.id,
      sendStatus: "sent",
      emailMessageId: result.messageId ?? null,
    }));
  } else {
    finalMessage = await markSupportMessageSendStatusInD1(db, {
      messageId: claimedMessage.id,
      sendStatus: "sent",
    });
  }

  if (!finalMessage) return { ok: false, error: "delivery_uncertain", message: claimedMessage };

  await writeSupportAudit({
    actorUserId: admin.userId,
    actorEmail: admin.email ?? "unknown",
    action: "support.reply_sent",
    targetId: conversation.id,
    summary: { messageId: finalMessage.id, emailDelivered: Boolean(conversation.requester_email), retry: true },
  });
  revalidatePath("/admin/support");
  return { ok: true, data: { message: finalMessage, conversation } };
}

export async function sendSupportReply(input: {
  conversationId: string;
  body: string;
  clientMessageId: string;
}): Promise<SupportActionResult<{ message: SupportMessageRow; conversation: SupportConversationRow }>> {
  const admin = await requireAdminContext();
  const conversationId = normalizeActionText(input.conversationId, "conversationId", 128);
  const body = normalizeActionText(input.body, "body", 8_000);
  const clientMessageId = normalizeActionText(input.clientMessageId, "clientMessageId", 128);
  const db = await getCloudflareD1Database();
  if (!db) return { ok: false, error: "d1_unavailable" };

  const conversation = await getSupportConversationInD1(db, conversationId);
  if (!conversation) return { ok: false, error: "not_found" };

  const inserted = await insertSupportMessageIfNewInD1(db, {
    conversationId,
    senderRole: "admin",
    authorUserId: admin.userId,
    bodyText: body,
    clientMessageId,
    sendStatus: "pending",
  });

  if (!inserted.inserted) {
    // Message already exists (duplicate clientMessageId). If it previously
    // failed to send, re-attempt the email send instead of permanently
    // blocking the operator. If it was already sent successfully, return it.
    if (inserted.message.send_status === "send_failed") {
      return retrySupportReplyEmail({ admin, conversation, existingMessage: inserted.message, db });
    }
    if (inserted.message.send_status === "pending") {
      return { ok: false, error: "delivery_pending", message: inserted.message };
    }
    return { ok: true, data: { message: inserted.message, conversation } };
  }

  let finalMessage: SupportMessageRow | null = inserted.message;
  if (conversation.requester_email) {
    const result = await sendEmail({
      to: conversation.requester_email,
      subject: conversation.subject ? `Re: ${conversation.subject}` : "Archestimator support reply",
      text: body,
    });
    if (!result.ok) {
      finalMessage = await markSupportMessageSendStatusInD1(db, {
        messageId: inserted.message.id,
        sendStatus: "send_failed",
      });
      if (!finalMessage) return { ok: false, error: "delivery_uncertain", message: inserted.message };
      await writeSupportAudit({
        actorUserId: admin.userId,
        actorEmail: admin.email,
        action: "support.reply_send_failed",
        targetId: conversationId,
        summary: { messageId: finalMessage.id, code: result.code ?? "unknown" },
      });
      revalidatePath("/admin/support");
      return { ok: false, error: "email_send_failed", message: finalMessage };
    }
    finalMessage = await markSupportMessageSendStatusInD1(db, {
      messageId: inserted.message.id,
      sendStatus: "sent",
      emailMessageId: result.messageId ?? null,
    });
  } else {
    finalMessage = await markSupportMessageSendStatusInD1(db, {
      messageId: inserted.message.id,
      sendStatus: "sent",
    });
  }

  if (!finalMessage) return { ok: false, error: "delivery_uncertain", message: inserted.message };

  await writeSupportAudit({
    actorUserId: admin.userId,
    actorEmail: admin.email,
    action: "support.reply_sent",
    targetId: conversationId,
    summary: { messageId: finalMessage.id, emailDelivered: Boolean(conversation.requester_email) },
  });
  revalidatePath("/admin/support");
  return { ok: true, data: { message: finalMessage, conversation } };
}

export async function setConversationStatus(input: {
  conversationId: string;
  status: SupportConversationStatus;
}): Promise<SupportActionResult<{ conversation: SupportConversationRow }>> {
  const admin = await requireAdminContext();
  const conversationId = normalizeActionText(input.conversationId, "conversationId", 128);
  const status = normalizeSupportConversationStatus(input.status);
  const result = await updateSupportConversationStatus({ conversationId, status });
  if (result.error) return { ok: false, error: "failed" };
  if (!result.data) return { ok: false, error: "not_found" };

  await writeSupportAudit({
    actorUserId: admin.userId,
    actorEmail: admin.email,
    action: "support.status_updated",
    targetId: conversationId,
    summary: { status },
  });
  revalidatePath("/admin/support");
  return { ok: true, data: { conversation: result.data } };
}

export async function startConversation(input: {
  subject?: string;
  initialBody: string;
  clientMessageId: string;
}): Promise<SupportActionResult<{ conversation: SupportConversationRow; message: SupportMessageRow }>> {
  const user = await getCurrentUserContext();
  if (!user) return { ok: false, error: "unauthorized" };
  const initialBody = normalizeActionText(input.initialBody, "initialBody", 8_000);
  const clientMessageId = normalizeActionText(input.clientMessageId, "clientMessageId", 128);
  const result = await createSupportConversation({
    userId: user.userId,
    subject: input.subject,
    initialBody,
    clientMessageId,
    senderRole: "user",
    authorUserId: user.userId,
  });
  if (result.error || !result.data) return { ok: false, error: "failed" };

  await writeAdminAuditEvent({
    actorUserId: user.userId,
    actorEmail: user.email,
    action: "support.conversation_started",
    targetType: "support_conversation",
    targetId: result.data.conversation.id,
    summary: { source: "support_widget" },
  });
  revalidatePath("/workshop/feedback");
  return { ok: true, data: result.data };
}
