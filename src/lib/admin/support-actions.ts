"use server";

import { revalidatePath } from "next/cache";

import { writeAdminAuditEvent } from "@/lib/admin/audit";
import { requireAdminContext } from "@/lib/admin/require-admin";
import { getCurrentUserContext } from "@/lib/auth/session";
import { getCloudflareD1Database } from "@/lib/cloudflare/d1";
import { sendEmail } from "@/lib/email/transactional-email-client";
import {
  createSupportConversation,
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
      error: "unauthorized" | "validation" | "d1_unavailable" | "not_found" | "email_send_failed" | "failed";
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
    if (inserted.message.send_status === "send_failed") {
      return { ok: false, error: "email_send_failed", message: inserted.message };
    }
    return { ok: true, data: { message: inserted.message, conversation } };
  }

  let finalMessage = inserted.message;
  if (conversation.requester_email) {
    const result = await sendEmail({
      to: conversation.requester_email,
      subject: conversation.subject ? `Re: ${conversation.subject}` : "Archestimator support reply",
      text: body,
    });
    if (!result.ok) {
      finalMessage = (await markSupportMessageSendStatusInD1(db, {
        messageId: inserted.message.id,
        sendStatus: "send_failed",
      })) ?? inserted.message;
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
    finalMessage = (await markSupportMessageSendStatusInD1(db, {
      messageId: inserted.message.id,
      sendStatus: "sent",
      emailMessageId: result.messageId ?? null,
    })) ?? inserted.message;
  } else {
    finalMessage = (await markSupportMessageSendStatusInD1(db, {
      messageId: inserted.message.id,
      sendStatus: "sent",
    })) ?? inserted.message;
  }

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
  revalidatePath("/admin/support");
  return { ok: true, data: result.data };
}
