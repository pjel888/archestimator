"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

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
import type { EmailAttachmentInput } from "@/lib/email/cloudflare-email-client";
import { htmlToPlainText, sanitizeSupportHtml, wrapSupportEmailHtml } from "@/lib/email/support-email-html";
import {
  getSupportUploadsR2,
  materializeDraftAttachmentsForMessage,
  type SupportDraftAttachmentMeta,
} from "@/lib/email/support-outbound-attachments";
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
  type SupportAttachmentRow,
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

function resolveOutboundBodies(input: { body?: string; html?: string | null }) {
  const rawHtml = input.html?.trim() ? sanitizeSupportHtml(input.html) : "";
  if (rawHtml) {
    const textFromHtml = htmlToPlainText(rawHtml);
    const bodyText = (textFromHtml || input.body || "").trim();
    if (!bodyText) throw new Error("body is required.");
    return {
      bodyText: bodyText.slice(0, 40_000),
      bodyHtml: rawHtml,
      emailHtml: wrapSupportEmailHtml(rawHtml),
    };
  }
  const bodyText = normalizeActionText(input.body ?? "", "body", 40_000);
  return {
    bodyText,
    bodyHtml: null as string | null,
    emailHtml: plainTextToMinimalHtml(bodyText),
  };
}

function normalizeDraftAttachments(raw: SupportDraftAttachmentMeta[] | undefined) {
  if (!raw?.length) return [] as SupportDraftAttachmentMeta[];
  return raw.slice(0, 10).map((draft) => ({
    draftId: normalizeActionText(draft.draftId, "draftId", 128),
    r2Key: normalizeActionText(draft.r2Key, "r2Key", 512),
    filename: normalizeActionText(draft.filename, "filename", 180),
    contentType: normalizeActionText(draft.contentType || "application/octet-stream", "contentType", 180),
    sizeBytes: Math.max(0, Math.floor(Number(draft.sizeBytes) || 0)),
  }));
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
  html: string;
  replyTo: string;
  headers?: Record<string, string>;
  attachments?: EmailAttachmentInput[];
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
    html: input.html,
    from: `${identity.fromName} <${identity.fromAddress}>`,
    replyTo: input.replyTo,
    headers: input.headers,
    attachments: input.attachments,
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
  const shouldEmail = conversation.channel === "email" && Boolean(conversation.requester_email);
  const recipient = shouldEmail ? conversation.requester_email : null;

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
      html: existingMessage.body_html
        ? wrapSupportEmailHtml(existingMessage.body_html)
        : plainTextToMinimalHtml(existingMessage.body_text),
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
  body?: string;
  html?: string | null;
  clientMessageId: string;
  drafts?: SupportDraftAttachmentMeta[];
}): Promise<SupportActionResult<{
  message: SupportMessageRow;
  conversation: SupportConversationRow;
  attachments: SupportAttachmentRow[];
}>> {
  const admin = await requireAdminContext();
  const conversationId = normalizeActionText(input.conversationId, "conversationId", 128);
  const clientMessageId = normalizeActionText(input.clientMessageId, "clientMessageId", 128);
  const drafts = normalizeDraftAttachments(input.drafts);
  let bodies;
  try {
    bodies = resolveOutboundBodies({ body: input.body, html: input.html });
  } catch {
    return { ok: false, error: "validation" };
  }
  const db = await getCloudflareD1Database();
  if (!db) return { ok: false, error: "d1_unavailable" };

  const conversation = await getSupportConversationInD1(db, conversationId);
  if (!conversation) return { ok: false, error: "not_found" };

  const identity = resolveSupportSendIdentity();
  const isEmailChannel = conversation.channel === "email";
  const inserted = await insertSupportMessageIfNewInD1(db, {
    conversationId,
    senderRole: "admin",
    authorUserId: admin.userId,
    bodyText: bodies.bodyText,
    bodyHtml: bodies.bodyHtml,
    clientMessageId,
    sendStatus: "pending",
    direction: "outbound",
    transport: isEmailChannel ? "email" : "in_app",
    mailboxAddress: isEmailChannel ? (conversation.mailbox_address ?? identity.mailbox) : null,
    fromAddress: isEmailChannel ? identity.fromAddress : null,
    fromName: isEmailChannel ? identity.fromName : null,
    toJson: isEmailChannel && conversation.requester_email
      ? JSON.stringify([{ email: conversation.requester_email }])
      : null,
    providerName: isEmailChannel ? "cloudflare-email" : null,
    attachmentCount: drafts.length,
  });

  if (!inserted.inserted) {
    if (inserted.message.send_status === "send_failed") {
      if (!isEmailChannel) {
        const recovered = await markSupportMessageSendStatusInD1(db, {
          messageId: inserted.message.id,
          sendStatus: "sent",
        });
        if (!recovered) return { ok: false, error: "delivery_uncertain", message: inserted.message };
        return { ok: true, data: { message: recovered, conversation, attachments: [] } };
      }
      const retry = await retrySupportReplyEmail({ admin, conversation, existingMessage: inserted.message, db });
      if (!retry.ok) return retry;
      return { ok: true, data: { ...retry.data, attachments: [] } };
    }
    if (inserted.message.send_status === "pending") {
      return { ok: false, error: "delivery_pending", message: inserted.message };
    }
    return { ok: true, data: { message: inserted.message, conversation, attachments: [] } };
  }

  let emailAttachments: EmailAttachmentInput[] = [];
  let storedAttachments: SupportAttachmentRow[] = [];
  if (drafts.length > 0) {
    const r2 = await getSupportUploadsR2();
    if (!r2) return { ok: false, error: "failed", message: inserted.message };
    try {
      const materialized = await materializeDraftAttachmentsForMessage({
        db,
        r2,
        adminUserId: admin.userId,
        conversationId,
        messageId: inserted.message.id,
        drafts,
      });
      emailAttachments = materialized.emailAttachments;
      storedAttachments = materialized.attachments;
    } catch {
      return { ok: false, error: "validation", message: inserted.message };
    }
  }

  let finalMessage: SupportMessageRow | null = inserted.message;
  if (isEmailChannel && conversation.requester_email) {
    const replyTo = conversation.routing_token
      ? buildPlusAddress(identity.mailbox, conversation.routing_token)
      : identity.fromAddress;
    const headers = await buildThreadingHeaders(db, conversationId);
    const result = await dispatchSupportEmail({
      to: conversation.requester_email,
      subject: formatReplySubject(conversation.subject),
      text: bodies.bodyText,
      html: bodies.emailHtml,
      replyTo,
      headers,
      attachments: emailAttachments,
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
    summary: {
      messageId: finalMessage.id,
      providerAccepted: isEmailChannel && Boolean(conversation.requester_email),
      channel: conversation.channel,
      attachmentCount: storedAttachments.length,
    },
  });
  revalidatePath("/admin/support");
  return { ok: true, data: { message: finalMessage, conversation, attachments: storedAttachments } };
}

export async function createSupportEmailConversationAndSend(input: {
  to: string;
  subject: string;
  body?: string;
  html?: string | null;
  clientMessageId: string;
  recipientName?: string | null;
  drafts?: SupportDraftAttachmentMeta[];
}): Promise<SupportActionResult<{
  conversation: SupportConversationRow;
  message: SupportMessageRow;
  attachments: SupportAttachmentRow[];
}>> {
  const admin = await requireAdminContext();
  let recipient;
  let bodies;
  let drafts: SupportDraftAttachmentMeta[];
  try {
    recipient = normalizeEmailAddress(input.to);
    sanitizeHeaderText(input.subject, 160);
    bodies = resolveOutboundBodies({ body: input.body, html: input.html });
    normalizeActionText(input.clientMessageId, "clientMessageId", 128);
    drafts = normalizeDraftAttachments(input.drafts);
  } catch {
    return { ok: false, error: "validation" };
  }

  const subject = sanitizeHeaderText(input.subject, 160) ?? "Archestimator support";
  const clientMessageId = normalizeActionText(input.clientMessageId, "clientMessageId", 128);
  const recipientName = input.recipientName ? sanitizeHeaderText(input.recipientName, 120) : recipient.name;

  const db = await getCloudflareD1Database();
  if (!db) return { ok: false, error: "d1_unavailable" };

  const existingMessage = await findSupportMessageByClientMessageIdInD1(db, clientMessageId);
  if (existingMessage) {
    const existingConversation = await getSupportConversationInD1(db, existingMessage.conversation_id);
    if (!existingConversation) return { ok: false, error: "not_found" };
    if (existingMessage.send_status === "send_failed") {
      const retry = await retrySupportReplyEmail({
        admin,
        conversation: existingConversation,
        existingMessage,
        db,
      });
      if (!retry.ok) return retry;
      return { ok: true, data: { conversation: retry.data.conversation, message: retry.data.message, attachments: [] } };
    }
    if (existingMessage.send_status === "pending") {
      return { ok: false, error: "delivery_pending", message: existingMessage };
    }
    return { ok: true, data: { conversation: existingConversation, message: existingMessage, attachments: [] } };
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
    bodyText: bodies.bodyText,
    bodyHtml: bodies.bodyHtml,
    clientMessageId,
    sendStatus: "pending",
    direction: "outbound",
    transport: "email",
    mailboxAddress: identity.mailbox,
    fromAddress: identity.fromAddress,
    fromName: identity.fromName,
    toJson: JSON.stringify([{ email: recipient.email, name: recipientName }]),
    providerName: "cloudflare-email",
    attachmentCount: drafts.length,
  });

  if (!inserted.inserted && inserted.message.send_status !== "send_failed") {
    if (inserted.message.send_status === "pending") {
      return { ok: false, error: "delivery_pending", message: inserted.message };
    }
    return { ok: true, data: { conversation, message: inserted.message, attachments: [] } };
  }

  const messageToSend =
    !inserted.inserted && inserted.message.send_status === "send_failed"
      ? (await claimFailedSupportMessageRetryInD1(db, inserted.message.id)) ?? inserted.message
      : inserted.message;

  let emailAttachments: EmailAttachmentInput[] = [];
  let storedAttachments: SupportAttachmentRow[] = [];
  if (drafts.length > 0 && inserted.inserted) {
    const r2 = await getSupportUploadsR2();
    if (!r2) return { ok: false, error: "failed", message: messageToSend };
    try {
      const materialized = await materializeDraftAttachmentsForMessage({
        db,
        r2,
        adminUserId: admin.userId,
        conversationId: conversation.id,
        messageId: messageToSend.id,
        drafts,
      });
      emailAttachments = materialized.emailAttachments;
      storedAttachments = materialized.attachments;
    } catch {
      return { ok: false, error: "validation", message: messageToSend };
    }
  }

  const replyTo = conversation.routing_token
    ? buildPlusAddress(identity.mailbox, conversation.routing_token)
    : identity.fromAddress;

  const result = await dispatchSupportEmail({
    to: recipient.email,
    subject,
    text: bodies.bodyText,
    html: bodies.emailHtml,
    replyTo,
    attachments: emailAttachments,
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
    summary: { messageId: finalMessage.id, providerAccepted: true, attachmentCount: storedAttachments.length },
  });
  revalidatePath("/admin/support");
  return { ok: true, data: { conversation, message: finalMessage, attachments: storedAttachments } };
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
  revalidatePath("/admin/support");
  redirect("/workshop/feedback?support=1");
}

export async function getSupportMessageForAdmin(messageId: string) {
  await requireAdminContext();
  const db = await getCloudflareD1Database();
  if (!db) return null;
  return getSupportMessageByIdInD1(db, messageId);
}
