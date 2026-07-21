"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { writeAdminAuditEvent } from "@/lib/admin/audit";
import { requireAdminContext } from "@/lib/admin/require-admin";
import { getCurrentUserContext } from "@/lib/auth/session";
import { getCloudflareD1Database, type D1DatabaseLike } from "@/lib/cloudflare/d1";
import { fanoutSupportInboxInvalidation } from "@/lib/cloudflare/support-inbox-fanout";
import { formatReplySubject, normalizeEmailAddress, normalizeSupportRecipients, sanitizeHeaderText } from "@/lib/email/support-email-address";
import {
  buildPlusAddress,
  readSupportEmailConfig,
  supportOutboundConfigured,
} from "@/lib/email/support-email-config";
import {
  resolveSupportSendIdentity as resolveRegisteredSupportSendIdentity,
  resolveSupportSendIdentityByAddress,
  listSupportSendIdentities,
  type SupportSendIdentity,
} from "@/lib/email/support-send-identities";
import type { EmailAttachmentInput } from "@/lib/email/cloudflare-email-client";
import { htmlToPlainText, sanitizeSupportHtml, wrapSupportEmailHtml } from "@/lib/email/support-email-html";
import {
  getSupportUploadsR2,
  materializeDraftAttachmentsForMessage,
  materializeStoredSupportAttachmentsForMessage,
  type SupportDraftAttachmentMeta,
} from "@/lib/email/support-outbound-attachments";
import { sendEmail } from "@/lib/email/transactional-email-client";
import {
  bindSupportDraftOutboundMessageInD1,
  bindSupportDraftPendingMessageInD1,
  claimSupportDraftForSendInD1,
  getSupportDraftByScopeForAdminInD1,
  listSupportDraftAttachmentsInD1,
  releaseSupportDraftSendClaimInD1,
} from "@/lib/repositories/support-drafts-d1";
import {
  createExternalSupportConversationInD1,
  createSupportConversation,
  claimFailedSupportMessageRetryInD1,
  findSupportMessageByClientMessageIdInD1,
  getSupportConversationInD1,
  getSupportConversationTriageInD1,
  getSupportAttachmentForAdminInD1,
  getSupportMessageByIdInD1,
  insertSupportMessageIfNewInD1,
  listSupportAttachmentsForMessageInD1,
  listSupportMessages,
  markSupportConversationReadForAdminInD1,
  markSupportMessageSendStatusInD1,
  normalizeSupportConversationStatus,
  replaceSupportConversationLabelsInD1,
  updateSupportConversationTriageInD1,
  updateSupportConversationStatus,
  type SupportConversationTriageRow,
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

async function fanoutInAppSupportMessage(conversationId: string, messageId: string) {
  try {
    const { getCloudflareContext } = await import("@opennextjs/cloudflare");
    const context = await getCloudflareContext({ async: true }) as unknown as { env?: Record<string, unknown> };
    return fanoutSupportInboxInvalidation({
      env: context.env ?? {},
      conversationId,
      messageId,
      subject: "admin_in_app_reply",
    });
  } catch {
    return { degraded: true, skipped: false };
  }
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

async function resolvePersistedDraftBodies(input: {
  db: D1DatabaseLike;
  adminUserId: string;
  draftScopeKey?: string | null;
  kind: "reply" | "new_email";
  conversationId?: string | null;
  fallback: { body?: string; html?: string | null };
}) {
  if (!input.draftScopeKey) return resolveOutboundBodies(input.fallback);
  const draft = await getSupportDraftByScopeForAdminInD1(input.db, input.draftScopeKey, input.adminUserId);
  if (!draft || draft.lifecycle !== "editing" || draft.kind !== input.kind || draft.conversation_id !== (input.conversationId ?? null)) {
    throw new Error("Draft is unavailable.");
  }
  return resolveOutboundBodies({ body: draft.body_text ?? undefined, html: draft.body_html });
}

type SupportDraftAttachmentReference = { draftId: string; attachmentId: string };

function normalizeDraftAttachments(raw: SupportDraftAttachmentReference[] | undefined) {
  if (!raw?.length) return [] as SupportDraftAttachmentReference[];
  return raw.slice(0, 10).map((draft) => ({
    draftId: normalizeActionText(draft.draftId, "draftId", 128),
    attachmentId: normalizeActionText(draft.attachmentId, "attachmentId", 128),
  }));
}

async function resolveDraftAttachments(input: {
  db: D1DatabaseLike;
  adminUserId: string;
  references: SupportDraftAttachmentReference[];
}): Promise<SupportDraftAttachmentMeta[]> {
  const resolved: SupportDraftAttachmentMeta[] = [];
  for (const reference of input.references) {
    const draft = await getSupportDraftByScopeForAdminInD1(input.db, reference.draftId, input.adminUserId);
    if (!draft || draft.lifecycle !== "editing") throw new Error("Draft is unavailable.");
    const attachment = (await listSupportDraftAttachmentsInD1(input.db, draft.id)).find((row) => row.id === reference.attachmentId);
    if (!attachment) throw new Error("Draft attachment is unavailable.");
    resolved.push({
      draftId: draft.id,
      r2Key: attachment.r2_key,
      filename: attachment.filename,
      contentType: attachment.content_type || "application/octet-stream",
      sizeBytes: attachment.size_bytes,
      sha256: attachment.sha256,
    });
  }
  return resolved;
}

async function claimDraftReferences(input: {
  db: D1DatabaseLike;
  adminUserId: string;
  references: SupportDraftAttachmentReference[];
  scopeKeys?: string[];
}) {
  const draftIds: string[] = [];
  for (const scopeKey of [...new Set([...(input.scopeKeys ?? []), ...input.references.map((reference) => reference.draftId)])]) {
    const draft = await getSupportDraftByScopeForAdminInD1(input.db, scopeKey, input.adminUserId);
    if (!draft || draft.lifecycle !== "editing") {
      await Promise.all(draftIds.map((draftId) => releaseSupportDraftSendClaimInD1({ db: input.db, draftId, adminUserId: input.adminUserId })));
      throw new Error("Draft is unavailable.");
    }
    const claimed = await claimSupportDraftForSendInD1({
      db: input.db,
      draftId: draft.id,
      adminUserId: input.adminUserId,
      expectedRevision: draft.revision,
    });
    if (!claimed.claimed) {
      await Promise.all(draftIds.map((draftId) => releaseSupportDraftSendClaimInD1({ db: input.db, draftId, adminUserId: input.adminUserId })));
      throw new Error("Draft changed before send.");
    }
    draftIds.push(draft.id);
  }
  return draftIds;
}

async function consumeDraftClaims(db: D1DatabaseLike, adminUserId: string, draftIds: string[], messageId: string) {
  await Promise.all(draftIds.map((draftId) => bindSupportDraftOutboundMessageInD1({
    db, draftId, adminUserId, outboundMessageId: messageId,
  })));
}

async function bindDraftPendingClaims(db: D1DatabaseLike, adminUserId: string, draftIds: string[], messageId: string) {
  const results = await Promise.all(draftIds.map((draftId) => bindSupportDraftPendingMessageInD1({
    db, draftId, adminUserId, outboundMessageId: messageId,
  })));
  return results.every((result) => result.bound);
}

async function failDraftPromotion(input: {
  db: D1DatabaseLike;
  adminUserId: string;
  draftIds: string[];
  message: SupportMessageRow;
}) {
  const failedMessage = await markSupportMessageSendStatusInD1(input.db, {
    messageId: input.message.id,
    sendStatus: "send_failed",
  });
  if (failedMessage && input.draftIds.length > 0) {
    await consumeDraftClaims(input.db, input.adminUserId, input.draftIds, failedMessage.id);
  }
  return failedMessage ?? input.message;
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

function resolveSupportSendIdentity(identityId?: string | null) {
  return resolveRegisteredSupportSendIdentity(readSupportEmailConfig(), identityId);
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
  to: string | string[];
  cc?: string[];
  subject: string;
  text: string;
  html: string;
  replyTo: string;
  identity: SupportSendIdentity;
  headers?: Record<string, string>;
  attachments?: EmailAttachmentInput[];
}) {
  if (!supportOutboundConfigured()) {
    return {
      ok: false as const,
      error: "Email delivery is temporarily unavailable.",
      code: "EMAIL_NOT_CONFIGURED",
    };
  }
  return sendEmail({
    to: input.to,
    cc: input.cc,
    subject: input.subject,
    text: input.text,
    html: input.html,
    from: `${input.identity.fromName} <${input.identity.fromAddress}>`,
    replyTo: input.replyTo,
    headers: input.headers,
    attachments: input.attachments,
  });
}

async function loadPersistedEmailAttachments(db: D1DatabaseLike, messageId: string) {
  const attachments = await listSupportAttachmentsForMessageInD1(db, messageId);
  if (attachments.length === 0) return [] as EmailAttachmentInput[];
  const r2 = await getSupportUploadsR2();
  if (!r2) throw new Error("Attachment storage unavailable.");
  const loaded: EmailAttachmentInput[] = [];
  for (const attachment of attachments) {
    const object = await r2.get(attachment.r2_key);
    if (!object) throw new Error("Persisted attachment is unavailable.");
    const bytes = new Uint8Array(await object.arrayBuffer());
    loaded.push({
      filename: attachment.filename,
      content: bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer,
      type: attachment.content_type || "application/octet-stream",
      disposition: attachment.disposition === "inline" ? "inline" : "attachment",
      contentId: attachment.content_id ?? undefined,
    });
  }
  return loaded;
}

function parsePersistedRecipients(value: string | null) {
  if (!value) return [] as string[];
  try {
    const parsed = JSON.parse(value) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.flatMap((recipient) => {
      if (!recipient || typeof recipient !== "object" || typeof (recipient as { email?: unknown }).email !== "string") return [];
      return [normalizeEmailAddress((recipient as { email: string }).email).email];
    });
  } catch {
    return [];
  }
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
  const storedTo = parsePersistedRecipients(existingMessage.to_json);
  const storedCc = parsePersistedRecipients(existingMessage.cc_json);
  const recipients = storedTo.length > 0
    ? storedTo
    : conversation.channel === "email" && conversation.requester_email
      ? [conversation.requester_email]
      : [];

  if (recipients.length > 0) {
    let identity: SupportSendIdentity;
    try {
      identity = resolveSupportSendIdentityByAddress(readSupportEmailConfig(), existingMessage.from_address);
    } catch {
      return { ok: false, error: "validation", message: existingMessage };
    }
    const replyTo = conversation.routing_token
      ? buildPlusAddress(identity.replyMailbox, conversation.routing_token)
      : identity.replyMailbox;
    const headers = await buildThreadingHeaders(db, conversation.id);
    let attachments: EmailAttachmentInput[];
    try {
      attachments = await loadPersistedEmailAttachments(db, existingMessage.id);
      if (attachments.length !== existingMessage.attachment_count) {
        throw new Error("Persisted attachment set is incomplete.");
      }
    } catch {
      const failedMessage = await markSupportMessageSendStatusInD1(db, {
        messageId: claimedMessage.id,
        sendStatus: "send_failed",
      });
      return { ok: false, error: "failed", message: failedMessage ?? claimedMessage };
    }
    const result = await dispatchSupportEmail({
      to: recipients,
      cc: storedCc,
      subject: formatReplySubject(conversation.subject),
      text: existingMessage.body_text,
      html: existingMessage.body_html
        ? wrapSupportEmailHtml(existingMessage.body_html)
        : plainTextToMinimalHtml(existingMessage.body_text),
      replyTo,
      identity,
      headers,
      attachments,
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
    summary: { messageId: finalMessage.id, providerAccepted: recipients.length > 0, retry: true },
  });
  revalidatePath("/admin/support");
  return { ok: true, data: { message: finalMessage, conversation } };
}

export async function sendSupportReply(input: {
  conversationId: string;
  body?: string;
  html?: string | null;
  clientMessageId: string;
  fromIdentityId?: string | null;
  replyAll?: boolean;
  draftScopeKey?: string | null;
  drafts?: SupportDraftAttachmentReference[];
}): Promise<SupportActionResult<{
  message: SupportMessageRow;
  conversation: SupportConversationRow;
  attachments: SupportAttachmentRow[];
}>> {
  const admin = await requireAdminContext();
  const conversationId = normalizeActionText(input.conversationId, "conversationId", 128);
  const clientMessageId = normalizeActionText(input.clientMessageId, "clientMessageId", 128);
  const draftReferences = normalizeDraftAttachments(input.drafts);
  const db = await getCloudflareD1Database();
  if (!db) return { ok: false, error: "d1_unavailable" };

  const conversation = await getSupportConversationInD1(db, conversationId);
  if (!conversation) return { ok: false, error: "not_found" };
  let bodies;
  try {
    bodies = await resolvePersistedDraftBodies({
      db,
      adminUserId: admin.userId,
      draftScopeKey: input.draftScopeKey,
      kind: "reply",
      conversationId,
      fallback: { body: input.body, html: input.html },
    });
  } catch {
    return { ok: false, error: "validation" };
  }

  let identity: SupportSendIdentity;
  try {
    identity = resolveSupportSendIdentity(input.fromIdentityId);
  } catch {
    return { ok: false, error: "validation" };
  }
  const isEmailChannel = conversation.channel === "email";
  let emailRecipients: ReturnType<typeof normalizeSupportRecipients> | null = null;
  if (isEmailChannel) {
    try {
      const messages = await listSupportMessages(conversationId, { dbOverride: db, limit: 200 });
      const latestInbound = [...messages.data].reverse().find((message) => message.direction === "inbound");
      const configuredIdentities = listSupportSendIdentities(readSupportEmailConfig());
      emailRecipients = normalizeSupportRecipients({
        to: [latestInbound?.from_address ?? conversation.requester_email ?? ""],
        cc: input.replyAll
          ? [...parsePersistedRecipients(latestInbound?.to_json ?? null), ...parsePersistedRecipients(latestInbound?.cc_json ?? null)]
          : [],
        excluded: configuredIdentities.flatMap((configuredIdentity) => [configuredIdentity.fromAddress, configuredIdentity.replyMailbox]),
      });
    } catch {
      return { ok: false, error: "validation" };
    }
  }
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
    mailboxAddress: isEmailChannel ? (conversation.mailbox_address ?? identity.replyMailbox) : null,
    fromAddress: isEmailChannel ? identity.fromAddress : null,
    fromName: isEmailChannel ? identity.fromName : null,
    toJson: emailRecipients
      ? JSON.stringify(emailRecipients.to.map((address) => ({ email: address.email, name: address.name })))
      : null,
    ccJson: emailRecipients?.cc.length
      ? JSON.stringify(emailRecipients.cc.map((address) => ({ email: address.email, name: address.name })))
      : null,
    providerName: isEmailChannel ? "cloudflare-email" : null,
    attachmentCount: draftReferences.length,
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

  let claimedDraftIds: string[] = [];
  let drafts: SupportDraftAttachmentMeta[] = [];
  if (draftReferences.length > 0 || input.draftScopeKey) {
    try {
      drafts = await resolveDraftAttachments({ db, adminUserId: admin.userId, references: draftReferences });
      claimedDraftIds = await claimDraftReferences({
        db,
        adminUserId: admin.userId,
        references: draftReferences,
        scopeKeys: input.draftScopeKey ? [input.draftScopeKey] : [],
      });
      if (!await bindDraftPendingClaims(db, admin.userId, claimedDraftIds, inserted.message.id)) {
        return { ok: false, error: "failed", message: await failDraftPromotion({ db, adminUserId: admin.userId, draftIds: claimedDraftIds, message: inserted.message }) };
      }
    } catch {
      return { ok: false, error: "validation", message: await failDraftPromotion({ db, adminUserId: admin.userId, draftIds: claimedDraftIds, message: inserted.message }) };
    }
  }

  let emailAttachments: EmailAttachmentInput[] = [];
  let storedAttachments: SupportAttachmentRow[] = [];
  if (drafts.length > 0) {
    const r2 = await getSupportUploadsR2();
    if (!r2) {
      return { ok: false, error: "failed", message: await failDraftPromotion({ db, adminUserId: admin.userId, draftIds: claimedDraftIds, message: inserted.message }) };
    }
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
      return { ok: false, error: "validation", message: await failDraftPromotion({ db, adminUserId: admin.userId, draftIds: claimedDraftIds, message: inserted.message }) };
    }
  }

  let finalMessage: SupportMessageRow | null = inserted.message;
  if (isEmailChannel && emailRecipients) {
    const replyTo = conversation.routing_token
      ? buildPlusAddress(identity.replyMailbox, conversation.routing_token)
      : identity.replyMailbox;
    const headers = await buildThreadingHeaders(db, conversationId);
    const result = await dispatchSupportEmail({
      to: emailRecipients.to.map((address) => address.email),
      cc: emailRecipients.cc.map((address) => address.email),
      subject: formatReplySubject(conversation.subject),
      text: bodies.bodyText,
      html: bodies.emailHtml,
      replyTo,
      identity,
      headers,
      attachments: emailAttachments,
    });
    if (!result.ok) {
      finalMessage = await markSupportMessageSendStatusInD1(db, {
        messageId: inserted.message.id,
        sendStatus: "send_failed",
      });
      if (!finalMessage) return { ok: false, error: "delivery_uncertain", message: inserted.message };
      if (claimedDraftIds.length > 0) {
        await consumeDraftClaims(db, admin.userId, claimedDraftIds, finalMessage.id);
      }
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

  if (claimedDraftIds.length > 0) {
    await consumeDraftClaims(db, admin.userId, claimedDraftIds, finalMessage.id);
  }

  const realtime = isEmailChannel
    ? { degraded: false, skipped: true }
    : await fanoutInAppSupportMessage(conversationId, finalMessage.id);

  await writeSupportAudit({
    actorUserId: admin.userId,
    actorEmail: admin.email,
    action: "support.reply_sent",
    targetId: conversationId,
    summary: {
      messageId: finalMessage.id,
      providerAccepted: isEmailChannel && Boolean(emailRecipients),
      channel: conversation.channel,
      attachmentCount: storedAttachments.length,
      realtimeDegraded: realtime.degraded,
    },
  });
  revalidatePath("/admin/support");
  return { ok: true, data: { message: finalMessage, conversation, attachments: storedAttachments } };
}

export async function createSupportEmailConversationAndSend(input: {
  to: string;
  cc?: string | null;
  subject: string;
  body?: string;
  html?: string | null;
  clientMessageId: string;
  fromIdentityId?: string | null;
  recipientName?: string | null;
  draftScopeKey?: string | null;
  forwardSource?: { conversationId: string; attachmentIds: string[] } | null;
  drafts?: SupportDraftAttachmentReference[];
}): Promise<SupportActionResult<{
  conversation: SupportConversationRow;
  message: SupportMessageRow;
  attachments: SupportAttachmentRow[];
}>> {
  const admin = await requireAdminContext();
  let recipient;
  let recipients: ReturnType<typeof normalizeSupportRecipients>;
  let draftReferences: SupportDraftAttachmentReference[];
  let forwardAttachmentIds: string[];
  try {
    recipient = normalizeEmailAddress(input.to);
    sanitizeHeaderText(input.subject, 160);
    normalizeActionText(input.clientMessageId, "clientMessageId", 128);
    draftReferences = normalizeDraftAttachments(input.drafts);
    forwardAttachmentIds = [...new Set((input.forwardSource?.attachmentIds ?? []).map((id) => normalizeActionText(id, "attachmentId", 128)))];
    if (forwardAttachmentIds.length > 10) throw new Error("Too many forwarded attachments.");
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

  const forwardSourceAttachments: SupportAttachmentRow[] = [];
  if (input.forwardSource) {
    const sourceConversationId = normalizeActionText(input.forwardSource.conversationId, "forward conversationId", 128);
    for (const attachmentId of forwardAttachmentIds) {
      const attachment = await getSupportAttachmentForAdminInD1(db, attachmentId);
      if (!attachment || attachment.conversation_id !== sourceConversationId || attachment.storage_status !== "stored") {
        return { ok: false, error: "validation" };
      }
      forwardSourceAttachments.push(attachment);
    }
  }

  let bodies;
  try {
    bodies = await resolvePersistedDraftBodies({
      db,
      adminUserId: admin.userId,
      draftScopeKey: input.draftScopeKey,
      kind: "new_email",
      fallback: { body: input.body, html: input.html },
    });
  } catch {
    return { ok: false, error: "validation" };
  }

  let identity: SupportSendIdentity;
  try {
    identity = resolveSupportSendIdentity(input.fromIdentityId);
  } catch {
    return { ok: false, error: "validation" };
  }
  try {
    recipients = normalizeSupportRecipients({
      to: [input.to],
      cc: input.cc?.split(",").map((address) => address.trim()).filter(Boolean) ?? [],
      excluded: listSupportSendIdentities(readSupportEmailConfig()).flatMap((configuredIdentity) => [configuredIdentity.fromAddress, configuredIdentity.replyMailbox]),
    });
  } catch {
    return { ok: false, error: "validation" };
  }
  const conversation = await createExternalSupportConversationInD1(db, {
    requesterEmail: recipient.email,
    requesterName: recipientName,
    subject,
    mailboxAddress: identity.replyMailbox,
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
    mailboxAddress: identity.replyMailbox,
    fromAddress: identity.fromAddress,
    fromName: identity.fromName,
    toJson: JSON.stringify(recipients.to.map((address) => ({ email: address.email, name: address.name }))),
    ccJson: recipients.cc.length ? JSON.stringify(recipients.cc.map((address) => ({ email: address.email, name: address.name }))) : null,
    providerName: "cloudflare-email",
    attachmentCount: draftReferences.length + forwardSourceAttachments.length,
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

  let drafts: SupportDraftAttachmentMeta[] = [];
  let claimedDraftIds: string[] = [];
  if ((draftReferences.length > 0 || input.draftScopeKey) && inserted.inserted) {
    try {
      drafts = await resolveDraftAttachments({ db, adminUserId: admin.userId, references: draftReferences });
      claimedDraftIds = await claimDraftReferences({
        db,
        adminUserId: admin.userId,
        references: draftReferences,
        scopeKeys: input.draftScopeKey ? [input.draftScopeKey] : [],
      });
      if (!await bindDraftPendingClaims(db, admin.userId, claimedDraftIds, messageToSend.id)) {
        return { ok: false, error: "failed", message: await failDraftPromotion({ db, adminUserId: admin.userId, draftIds: claimedDraftIds, message: messageToSend }) };
      }
    } catch {
      return { ok: false, error: "validation", message: await failDraftPromotion({ db, adminUserId: admin.userId, draftIds: claimedDraftIds, message: messageToSend }) };
    }
  }

  let emailAttachments: EmailAttachmentInput[] = [];
  let storedAttachments: SupportAttachmentRow[] = [];
  if (forwardSourceAttachments.length > 0 && inserted.inserted) {
    const r2 = await getSupportUploadsR2();
    if (!r2) return { ok: false, error: "failed", message: messageToSend };
    try {
      const materialized = await materializeStoredSupportAttachmentsForMessage({
        db,
        r2,
        conversationId: conversation.id,
        messageId: messageToSend.id,
        attachments: forwardSourceAttachments,
      });
      emailAttachments = materialized.emailAttachments;
      storedAttachments = materialized.attachments;
    } catch {
      const failedMessage = await markSupportMessageSendStatusInD1(db, {
        messageId: messageToSend.id,
        sendStatus: "send_failed",
      });
      return { ok: false, error: "failed", message: failedMessage ?? messageToSend };
    }
  }
  if (drafts.length > 0 && inserted.inserted) {
    const r2 = await getSupportUploadsR2();
    if (!r2) {
      return { ok: false, error: "failed", message: await failDraftPromotion({ db, adminUserId: admin.userId, draftIds: claimedDraftIds, message: messageToSend }) };
    }
    try {
      const materialized = await materializeDraftAttachmentsForMessage({
        db,
        r2,
        adminUserId: admin.userId,
        conversationId: conversation.id,
        messageId: messageToSend.id,
        drafts,
      });
      emailAttachments = [...emailAttachments, ...materialized.emailAttachments];
      storedAttachments = [...storedAttachments, ...materialized.attachments];
    } catch {
      return { ok: false, error: "validation", message: await failDraftPromotion({ db, adminUserId: admin.userId, draftIds: claimedDraftIds, message: messageToSend }) };
    }
  }

  const replyTo = conversation.routing_token
    ? buildPlusAddress(identity.replyMailbox, conversation.routing_token)
    : identity.replyMailbox;

  const result = await dispatchSupportEmail({
    to: recipients.to.map((address) => address.email),
    cc: recipients.cc.map((address) => address.email),
    subject,
    text: bodies.bodyText,
    html: bodies.emailHtml,
    replyTo,
    identity,
    attachments: emailAttachments,
  });

  if (!result.ok) {
    const failedMessage = await markSupportMessageSendStatusInD1(db, {
      messageId: messageToSend.id,
      sendStatus: "send_failed",
    });
    if (failedMessage && claimedDraftIds.length > 0) {
      await consumeDraftClaims(db, admin.userId, claimedDraftIds, failedMessage.id);
    }
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

  if (claimedDraftIds.length > 0) {
    await consumeDraftClaims(db, admin.userId, claimedDraftIds, finalMessage.id);
  }

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

export async function forwardSupportConversation(input: {
  conversationId: string;
  to: string;
  cc?: string | null;
  clientMessageId: string;
  fromIdentityId?: string | null;
  attachmentIds?: string[];
}): Promise<SupportActionResult<{
  conversation: SupportConversationRow;
  message: SupportMessageRow;
  attachments: SupportAttachmentRow[];
}>> {
  const admin = await requireAdminContext();
  const conversationId = normalizeActionText(input.conversationId, "conversationId", 128);
  const db = await getCloudflareD1Database();
  if (!db) return { ok: false, error: "d1_unavailable" };
  const conversation = await getSupportConversationInD1(db, conversationId);
  if (!conversation) return { ok: false, error: "not_found" };
  const source = (await listSupportMessages(conversationId, { dbOverride: db, limit: 200 })).data.at(-1);
  if (!source) return { ok: false, error: "not_found" };
  const sourceSender = source.from_address || conversation.requester_email || "Unknown sender";
  const body = [
    "---------- Forwarded support conversation ----------",
    `From: ${sourceSender}`,
    `Subject: ${conversation.subject || "Support request"}`,
    "",
    source.body_text,
  ].join("\n");
  const result = await createSupportEmailConversationAndSend({
    to: input.to,
    cc: input.cc,
    subject: `Fwd: ${conversation.subject || "Support request"}`.slice(0, 160),
    body,
    clientMessageId: input.clientMessageId,
    fromIdentityId: input.fromIdentityId,
    forwardSource: { conversationId, attachmentIds: input.attachmentIds ?? [] },
  });
  if (result.ok) {
    await writeSupportAudit({
      actorUserId: admin.userId,
      actorEmail: admin.email,
      action: "support.conversation_forwarded",
      targetId: conversationId,
      summary: { forwardedConversationId: result.data.conversation.id, attachmentCount: result.data.attachments.length },
    });
  }
  return result;
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

export async function updateSupportTriage(input: {
  conversationId: string;
  expectedRevision: number;
  starredForAdmin?: boolean;
  snoozedUntil?: string | null;
  assignToSelf?: boolean;
}): Promise<SupportActionResult<{ triage: SupportConversationTriageRow }>> {
  const admin = await requireAdminContext();
  const conversationId = normalizeActionText(input.conversationId, "conversationId", 128);
  if (!Number.isInteger(input.expectedRevision) || input.expectedRevision < 0) return { ok: false, error: "validation" };
  let snoozedUntil: string | null | undefined = input.snoozedUntil;
  if (snoozedUntil !== undefined && snoozedUntil !== null) {
    const parsed = new Date(snoozedUntil);
    if (Number.isNaN(parsed.getTime()) || parsed.getTime() <= Date.now() || parsed.getTime() > Date.now() + 365 * 24 * 60 * 60 * 1000) {
      return { ok: false, error: "validation" };
    }
    snoozedUntil = parsed.toISOString();
  }
  const db = await getCloudflareD1Database();
  if (!db) return { ok: false, error: "d1_unavailable" };
  const existing = await getSupportConversationTriageInD1(db, conversationId);
  if (input.assignToSelf === false && existing?.assignee_user_id !== admin.userId) {
    return { ok: false, error: "validation" };
  }
  const result = await updateSupportConversationTriageInD1({
    db,
    conversationId,
    expectedRevision: input.expectedRevision,
    starredForAdmin: input.starredForAdmin,
    snoozedUntil,
    assigneeUserId: input.assignToSelf === undefined ? undefined : input.assignToSelf ? admin.userId : null,
  });
  if (!result.triage) return { ok: false, error: "not_found" };
  if (!result.updated) return { ok: false, error: "failed" };
  await writeSupportAudit({
    actorUserId: admin.userId,
    actorEmail: admin.email,
    action: "support.triage_updated",
    targetId: conversationId,
    summary: { starred: result.triage.starred_for_admin, snoozedUntil: result.triage.snoozed_until, assigned: result.triage.assignee_user_id === admin.userId },
  });
  revalidatePath("/admin/support");
  return { ok: true, data: { triage: result.triage } };
}

export async function replaceSupportTriageLabels(input: {
  conversationId: string;
  labels: string[];
  expectedRevision: number;
}): Promise<SupportActionResult<{ triage: SupportConversationTriageRow }>> {
  const admin = await requireAdminContext();
  if (!Number.isInteger(input.expectedRevision) || input.expectedRevision < 0) return { ok: false, error: "validation" };
  const db = await getCloudflareD1Database();
  if (!db) return { ok: false, error: "d1_unavailable" };
  try {
    const revision = await updateSupportConversationTriageInD1({
      db,
      conversationId: normalizeActionText(input.conversationId, "conversationId", 128),
      expectedRevision: input.expectedRevision,
    });
    if (!revision.updated || !revision.triage) return { ok: false, error: "failed" };
    const triage = await replaceSupportConversationLabelsInD1({
      db,
      conversationId: normalizeActionText(input.conversationId, "conversationId", 128),
      labels: input.labels,
    });
    if (!triage) return { ok: false, error: "not_found" };
    await writeSupportAudit({ actorUserId: admin.userId, actorEmail: admin.email, action: "support.labels_updated", targetId: input.conversationId, summary: { count: triage.labels.length } });
    revalidatePath("/admin/support");
    return { ok: true, data: { triage } };
  } catch {
    return { ok: false, error: "validation" };
  }
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
