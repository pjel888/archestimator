"use server";

import { revalidatePath } from "next/cache";

import { writeAdminAuditEvent } from "@/lib/admin/audit";
import { requireAdminContext } from "@/lib/admin/require-admin";
import { getCurrentUserContext } from "@/lib/auth/session";
import { getCloudflareD1Database, type D1DatabaseLike } from "@/lib/cloudflare/d1";
import { formatReplySubject, normalizeEmailAddress, sanitizeHeaderText } from "@/lib/email/support-email-address";
import {
  buildPlusAddress,
  readSupportEmailConfig,
  supportOutboundConfigured,
} from "@/lib/email/support-email-config";
import { sendEmail } from "@/lib/email/transactional-email-client";
import {
  createExternalSupportConversationInD1,
  createSupportConversation,
  claimFailedSupportMessageRetryInD1,
  findSupportMessageByClientMessageIdInD1,
  getSupportConversationInD1,
  getSupportMessageByIdInD1,
  insertSupportMessageIfNewInD1,
  listSupportMessages,
  markSupportConversationReadForAdminInD1,
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
      error:
        | "unauthorized"
        | "validation"
        | "d1_unavailable"
        | "not_found"
        | "email_send_failed"
        | "delivery_pending"
        | "delivery_uncertain"
        | "failed";
      message?: SupportMessageRow;
    };

function normalizeActionText(value: string, field: string, maxLength: number): string {
  const trimmed = value.trim();
  if (!trimmed) throw new Error(`${field} is required.`);
  if (trimmed.length > maxLength) throw new Error(`${field} must be ${maxLength} characters or fewer.`);
  return trimmed;
}

function plainTextToMinimalHtml(text: string) {
  const escaped = text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
  return `<pre style="font-family:ui-sans-serif,system-ui,sans-serif;white-space:pre-wrap;">${escaped}</pre>`;
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

function resolveSupportSendIdentity() {
  const config = readSupportEmailConfig();
  return {
    from: { email: config.supportFrom, name: config.supportFromName },
    fromAddress: config.supportFrom,
    fromName: config.supportFromName,
    mailbox: config.supportMailbox,
  };
}

async function buildThreadingHeaders(db: D1DatabaseLike, conversationId: string) {
  const messages = await listSupportMessages(conversationId, { limit: 50, dbOverride: db });
  const withIds = messages.data
    .map((message) => message.internet_message_id || message.email_message_id)
    .filter((id): id is string => Boolean(id));
  if (withIds.length === 0) return undefined;
  const parent = withIds[withIds.length - 1]!;
  const references = withIds.slice(-8).join(" ");
  return {
    "In-Reply-To": parent,
    References: references,
  } satisfies Record<string, string>;
}

async function dispatchSupportEmail(input: {
  to: string;
  subject: string;
  text: string;
  replyTo: string;
  headers?: Record<string, string>;
}) {
  if (!supportOutboundConfigured()) {
    return {
      ok: false as const,
      error: "Cloudflare Email Service delivery is not configured for this environment.",
      code: "EMAIL_NOT_CONFIGURED",
    };
  }
  const identity = resolveSupportSendIdentity();
  return sendEmail({
    to: input.to,
    subject: input.subject,
    text: input.text,
    html: plainTextToMinimalHtml(input.text),
    from: `${identity.fromName} <${identity.fromAddress}>`,
    replyTo: input.replyTo,
    headers: input.headers,
  });
}

/**
 * Re-attempts email delivery for a previously-failed support reply.
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
  const recipient = conversation.requester_email;

  if (recipient) {
    const identity = resolveSupportSendIdentity();
    const replyTo = conversation.routing_token
      ? buildPlusAddress(identity.mailbox, conversation.routing_token)
      : identity.fromAddress;
    const headers = await buildThreadingHeaders(db, conversation.id);
    const result = await dispatchSupportEmail({
      to: recipient,
      subject: formatReplySubject(conversation.subject),
      text: existingMessage.body_text,
      replyTo,
      headers,
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
    finalMessage = await markSupportMessageSendStatusInD1(db, {
      messageId: claimedMessage.id,
      sendStatus: "sent",
      emailMessageId: result.messageId ?? null,
    });
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
    summary: { messageId: finalMessage.id, providerAccepted: Boolean(recipient), retry: true },
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

  const identity = resolveSupportSendIdentity();
  const inserted = await insertSupportMessageIfNewInD1(db, {
    conversationId,
    senderRole: "admin",
    authorUserId: admin.userId,
    bodyText: body,
    clientMessageId,
    sendStatus: "pending",
    direction: "outbound",
    transport: conversation.requester_email ? "email" : "in_app",
    mailboxAddress: conversation.mailbox_address ?? identity.mailbox,
    fromAddress: identity.fromAddress,
    fromName: identity.fromName,
    toJson: conversation.requester_email ? JSON.stringify([{ email: conversation.requester_email }]) : null,
    providerName: conversation.requester_email ? "cloudflare-email" : null,
  });

  if (!inserted.inserted) {
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
    const replyTo = conversation.routing_token
      ? buildPlusAddress(identity.mailbox, conversation.routing_token)
      : identity.fromAddress;
    const headers = await buildThreadingHeaders(db, conversationId);
    const result = await dispatchSupportEmail({
      to: conversation.requester_email,
      subject: formatReplySubject(conversation.subject),
      text: body,
      replyTo,
      headers,
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
    summary: { messageId: finalMessage.id, providerAccepted: Boolean(conversation.requester_email) },
  });
  revalidatePath("/admin/support");
  return { ok: true, data: { message: finalMessage, conversation } };
}

export async function createSupportEmailConversationAndSend(input: {
  to: string;
  subject: string;
  body: string;
  clientMessageId: string;
  recipientName?: string | null;
}): Promise<SupportActionResult<{ conversation: SupportConversationRow; message: SupportMessageRow }>> {
  const admin = await requireAdminContext();
  let recipient;
  try {
    recipient = normalizeEmailAddress(input.to);
    sanitizeHeaderText(input.subject, 160);
    normalizeActionText(input.body, "body", 8_000);
    normalizeActionText(input.clientMessageId, "clientMessageId", 128);
  } catch {
    return { ok: false, error: "validation" };
  }

  const subject = sanitizeHeaderText(input.subject, 160) ?? "Archestimator support";
  const body = normalizeActionText(input.body, "body", 8_000);
  const clientMessageId = normalizeActionText(input.clientMessageId, "clientMessageId", 128);
  const recipientName = input.recipientName ? sanitizeHeaderText(input.recipientName, 120) : recipient.name;

  const db = await getCloudflareD1Database();
  if (!db) return { ok: false, error: "d1_unavailable" };

  const existingMessage = await findSupportMessageByClientMessageIdInD1(db, clientMessageId);
  if (existingMessage) {
    const existingConversation = await getSupportConversationInD1(db, existingMessage.conversation_id);
    if (!existingConversation) return { ok: false, error: "not_found" };
    if (existingMessage.send_status === "send_failed") {
      return retrySupportReplyEmail({
        admin,
        conversation: existingConversation,
        existingMessage,
        db,
      });
    }
    if (existingMessage.send_status === "pending") {
      return { ok: false, error: "delivery_pending", message: existingMessage };
    }
    return { ok: true, data: { conversation: existingConversation, message: existingMessage } };
  }

  const identity = resolveSupportSendIdentity();
  const conversation = await createExternalSupportConversationInD1(db, {
    requesterEmail: recipient.email,
    requesterName: recipientName,
    subject,
    mailboxAddress: identity.mailbox,
    channel: "email",
  });

  const inserted = await insertSupportMessageIfNewInD1(db, {
    conversationId: conversation.id,
    senderRole: "admin",
    authorUserId: admin.userId,
    bodyText: body,
    clientMessageId,
    sendStatus: "pending",
    direction: "outbound",
    transport: "email",
    mailboxAddress: identity.mailbox,
    fromAddress: identity.fromAddress,
    fromName: identity.fromName,
    toJson: JSON.stringify([{ email: recipient.email, name: recipientName }]),
    providerName: "cloudflare-email",
  });

  if (!inserted.inserted && inserted.message.send_status !== "send_failed") {
    if (inserted.message.send_status === "pending") {
      return { ok: false, error: "delivery_pending", message: inserted.message };
    }
    return { ok: true, data: { conversation, message: inserted.message } };
  }

  const messageToSend =
    !inserted.inserted && inserted.message.send_status === "send_failed"
      ? (await claimFailedSupportMessageRetryInD1(db, inserted.message.id)) ?? inserted.message
      : inserted.message;

  const replyTo = conversation.routing_token
    ? buildPlusAddress(identity.mailbox, conversation.routing_token)
    : identity.fromAddress;

  const result = await dispatchSupportEmail({
    to: recipient.email,
    subject,
    text: body,
    replyTo,
  });

  if (!result.ok) {
    const failedMessage = await markSupportMessageSendStatusInD1(db, {
      messageId: messageToSend.id,
      sendStatus: "send_failed",
    });
    await writeSupportAudit({
      actorUserId: admin.userId,
      actorEmail: admin.email,
      action: "support.email_conversation_send_failed",
      targetId: conversation.id,
      summary: { messageId: messageToSend.id, code: result.code ?? "unknown" },
    });
    revalidatePath("/admin/support");
    if (!failedMessage) return { ok: false, error: "delivery_uncertain", message: messageToSend };
    return { ok: false, error: "email_send_failed", message: failedMessage };
  }

  const finalMessage = await markSupportMessageSendStatusInD1(db, {
    messageId: messageToSend.id,
    sendStatus: "sent",
    emailMessageId: result.messageId ?? null,
  });
  if (!finalMessage) return { ok: false, error: "delivery_uncertain", message: messageToSend };

  await writeSupportAudit({
    actorUserId: admin.userId,
    actorEmail: admin.email,
    action: "support.email_conversation_created",
    targetId: conversation.id,
    summary: { messageId: finalMessage.id, providerAccepted: true },
  });
  revalidatePath("/admin/support");
  return { ok: true, data: { conversation, message: finalMessage } };
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

export async function markSupportConversationRead(input: {
  conversationId: string;
}): Promise<SupportActionResult<{ conversation: SupportConversationRow }>> {
  await requireAdminContext();
  const conversationId = normalizeActionText(input.conversationId, "conversationId", 128);
  const db = await getCloudflareD1Database();
  if (!db) return { ok: false, error: "d1_unavailable" };
  const conversation = await markSupportConversationReadForAdminInD1(db, conversationId);
  if (!conversation) return { ok: false, error: "not_found" };
  revalidatePath("/admin/support");
  return { ok: true, data: { conversation } };
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

export async function getSupportMessageForAdmin(messageId: string) {
  await requireAdminContext();
  const db = await getCloudflareD1Database();
  if (!db) return null;
  return getSupportMessageByIdInD1(db, messageId);
}
