"use server";

import { revalidatePath } from "next/cache";

import { writeAdminAuditEvent } from "@/lib/admin/audit";
import { requireAdminContext } from "@/lib/admin/require-admin";
import {
  getCloudflareD1Database,
  type D1DatabaseLike,
  type D1PreparedStatementLike,
  type D1Value,
} from "@/lib/cloudflare/d1";
import { runRequiredD1Batch } from "@/lib/cloudflare/d1-batch";
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
  getSupportDraftByScopeForAdminInD1,
  listSupportDraftAttachmentsInD1,
} from "@/lib/repositories/support-drafts-d1";
import {
  createExternalSupportConversationInD1,
  findSupportMessageByClientMessageIdInD1,
  getSupportConversationInD1,
  getSupportConversationTriageInD1,
  getSupportAttachmentForAdminInD1,
  getSupportMessageByIdInD1,
  getSupportMessageByClientIdInD1,
  insertSupportMessageIfNewInD1,
  listSupportAttachmentsForMessageInD1,
  listSupportMessages,
  normalizeSupportConversationStatus,
  type SupportConversationTriageRow,
  type SupportAttachmentRow,
  type SupportConversationRow,
  type SupportConversationStatus,
  type SupportMessageRow,
} from "@/lib/repositories/support-conversations-repository";
import {
  captureSupportPrivacyWriteGate,
  supportPrivacyWriteGateSql,
  supportPrivacyWriteGateValues,
  type SupportPrivacyWriteGate,
} from "@/lib/support/privacy-fence";
import {
  markAdminSupportConversationReadThrough,
  SupportReadError,
} from "@/lib/support/user-read-service";

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
        | "terminal_reply_required"
        | "support_subject_fenced"
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

async function fanoutInAppSupportConversationChange(conversationId: string, subject: string) {
  try {
    const { getCloudflareContext } = await import("@opennextjs/cloudflare");
    const context = await getCloudflareContext({ async: true }) as unknown as { env?: Record<string, unknown> };
    return fanoutSupportInboxInvalidation({
      env: context.env ?? {},
      conversationId,
      subject,
      type: "support_conversation_changed",
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

async function markSupportMessageSendStatusWithGate(input: {
  db: D1DatabaseLike;
  emailMessageId?: string | null;
  messageId: string;
  privacyGate: SupportPrivacyWriteGate;
  sendStatus: "pending" | "sent" | "send_failed";
}) {
  const mutation = input.db.prepare(
    `UPDATE support_messages
     SET send_status = ?, email_message_id = COALESCE(?, email_message_id),
         internet_message_id = COALESCE(?, internet_message_id),
         provider_name = COALESCE(provider_name, 'cloudflare-email')
     WHERE id = ? AND ${supportPrivacyWriteGateSql("message_status_fence")}`,
  ).bind(
    input.sendStatus,
    input.emailMessageId ?? null,
    input.emailMessageId ?? null,
    input.messageId,
    ...supportPrivacyWriteGateValues(input.privacyGate),
  );
  const [result] = await runRequiredD1Batch(input.db, [mutation], "Support message status could not be saved.");
  if ((result.meta?.changes ?? 0) !== 1) return null;
  return getSupportMessageByIdInD1(input.db, input.messageId);
}

async function claimFailedSupportMessageRetryWithGate(input: {
  db: D1DatabaseLike;
  messageId: string;
  privacyGate: SupportPrivacyWriteGate;
}) {
  const mutation = input.db.prepare(
    `UPDATE support_messages SET send_status = 'pending'
     WHERE id = ? AND send_status = 'send_failed'
       AND ${supportPrivacyWriteGateSql("message_retry_fence")}`,
  ).bind(input.messageId, ...supportPrivacyWriteGateValues(input.privacyGate));
  const [result] = await runRequiredD1Batch(input.db, [mutation], "Support message retry could not be claimed.");
  if ((result.meta?.changes ?? 0) !== 1) return null;
  return getSupportMessageByIdInD1(input.db, input.messageId);
}

async function claimDraftReferences(input: {
  db: D1DatabaseLike;
  adminUserId: string;
  privacyGate: SupportPrivacyWriteGate;
  references: SupportDraftAttachmentReference[];
  scopeKeys?: string[];
}) {
  const draftIds: string[] = [];
  for (const scopeKey of [...new Set([...(input.scopeKeys ?? []), ...input.references.map((reference) => reference.draftId)])]) {
    const draft = await getSupportDraftByScopeForAdminInD1(input.db, scopeKey, input.adminUserId);
    if (!draft || draft.lifecycle !== "editing") {
      await Promise.all(draftIds.map((draftId) => releaseDraftClaim(input.db, input.adminUserId, draftId, input.privacyGate)));
      throw new Error("Draft is unavailable.");
    }
    const claim = input.db.prepare(
      `UPDATE support_drafts
       SET lifecycle = 'sending', revision = revision + 1, updated_at = ?
       WHERE id = ? AND admin_user_id = ? AND lifecycle = 'editing' AND revision = ?
         AND ${supportPrivacyWriteGateSql("draft_claim_fence")}`,
    ).bind(
      new Date().toISOString(),
      draft.id,
      input.adminUserId,
      draft.revision,
      ...supportPrivacyWriteGateValues(input.privacyGate),
    );
    const [claimed] = await runRequiredD1Batch(input.db, [claim], "Support draft could not be claimed.");
    if ((claimed.meta?.changes ?? 0) !== 1) {
      await Promise.all(draftIds.map((draftId) => releaseDraftClaim(input.db, input.adminUserId, draftId, input.privacyGate)));
      throw new Error("Draft changed before send.");
    }
    draftIds.push(draft.id);
  }
  return draftIds;
}

async function releaseDraftClaim(db: D1DatabaseLike, adminUserId: string, draftId: string, privacyGate: SupportPrivacyWriteGate) {
  const statement = db.prepare(
    `UPDATE support_drafts
     SET lifecycle = 'editing', revision = revision + 1, updated_at = ?
     WHERE id = ? AND admin_user_id = ? AND lifecycle = 'sending'
       AND outbound_message_id IS NULL AND ${supportPrivacyWriteGateSql("draft_release_fence")}`,
  ).bind(new Date().toISOString(), draftId, adminUserId, ...supportPrivacyWriteGateValues(privacyGate));
  await runRequiredD1Batch(db, [statement], "Support draft claim could not be released.");
}

async function updateDraftClaims(input: {
  adminUserId: string;
  db: D1DatabaseLike;
  draftIds: string[];
  lifecycle: "sending" | "consumed";
  messageId: string;
  privacyGate: SupportPrivacyWriteGate;
}) {
  if (input.draftIds.length === 0) return true;
  const statements = input.draftIds.map((draftId) => input.db.prepare(
    `UPDATE support_drafts
     SET outbound_message_id = ?, lifecycle = ?, revision = revision + 1, updated_at = ?
     WHERE id = ? AND admin_user_id = ? AND lifecycle = 'sending'
       AND (outbound_message_id IS NULL OR outbound_message_id = ?)
       AND ${supportPrivacyWriteGateSql("draft_bind_fence")}`,
  ).bind(
    input.messageId,
    input.lifecycle,
    new Date().toISOString(),
    draftId,
    input.adminUserId,
    input.messageId,
    ...supportPrivacyWriteGateValues(input.privacyGate),
  ));
  const results = await runRequiredD1Batch(input.db, statements, "Support draft state could not be saved.");
  return results.every((result) => (result.meta?.changes ?? 0) === 1);
}

async function failDraftPromotion(input: {
  db: D1DatabaseLike;
  adminUserId: string;
  draftIds: string[];
  message: SupportMessageRow;
  privacyGate: SupportPrivacyWriteGate;
}) {
  const failedMessage = await markSupportMessageSendStatusWithGate({
    db: input.db,
    messageId: input.message.id,
    privacyGate: input.privacyGate,
    sendStatus: "send_failed",
  });
  if (failedMessage && input.draftIds.length > 0) {
    await updateDraftClaims({
      adminUserId: input.adminUserId,
      db: input.db,
      draftIds: input.draftIds,
      lifecycle: "consumed",
      messageId: failedMessage.id,
      privacyGate: input.privacyGate,
    });
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
async function retrySupportReplyEmailDispatch(input: {
  admin: { userId: string; email: string | null };
  conversation: SupportConversationRow;
  existingMessage: SupportMessageRow;
  db: D1DatabaseLike;
  privacyGate: SupportPrivacyWriteGate;
}): Promise<SupportActionResult<{ message: SupportMessageRow; providerMessageId: string | null }>> {
  const { admin, conversation, existingMessage, db, privacyGate } = input;
  const claimedMessage = await claimFailedSupportMessageRetryWithGate({ db, messageId: existingMessage.id, privacyGate });
  if (!claimedMessage) {
    return { ok: false, error: "delivery_pending", message: existingMessage };
  }

  const storedTo = parsePersistedRecipients(existingMessage.to_json);
  const storedCc = parsePersistedRecipients(existingMessage.cc_json);
  const recipients = storedTo.length > 0
    ? storedTo
    : conversation.channel === "email" && conversation.requester_email
      ? [conversation.requester_email]
      : [];
  if (recipients.length === 0) {
    const failedMessage = await markSupportMessageSendStatusWithGate({
      db,
      messageId: claimedMessage.id,
      privacyGate,
      sendStatus: "send_failed",
    });
    return { ok: false, error: "validation", message: failedMessage ?? claimedMessage };
  }
  let identity: SupportSendIdentity;
  try {
    identity = resolveSupportSendIdentityByAddress(readSupportEmailConfig(), existingMessage.from_address);
  } catch {
    const failedMessage = await markSupportMessageSendStatusWithGate({
      db,
      messageId: claimedMessage.id,
      privacyGate,
      sendStatus: "send_failed",
    });
    return { ok: false, error: "validation", message: failedMessage ?? claimedMessage };
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
    const failedMessage = await markSupportMessageSendStatusWithGate({
      db,
      messageId: claimedMessage.id,
      privacyGate,
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
    const failedMessage = await markSupportMessageSendStatusWithGate({
      db,
      messageId: claimedMessage.id,
      privacyGate,
      sendStatus: "send_failed",
    });
    if (!failedMessage) return { ok: false, error: "delivery_uncertain", message: claimedMessage };
    return { ok: false, error: "email_send_failed", message: failedMessage };
  }
  return {
    ok: true,
    data: { message: claimedMessage, providerMessageId: result.messageId ?? null },
  };
}

async function retrySupportReplyEmail(input: {
  admin: { userId: string; email: string | null };
  conversation: SupportConversationRow;
  existingMessage: SupportMessageRow;
  db: D1DatabaseLike;
}): Promise<SupportActionResult<{ message: SupportMessageRow; conversation: SupportConversationRow }>> {
  let privacyGate: SupportPrivacyWriteGate;
  try {
    privacyGate = await captureSupportPrivacyWriteGate(input.db, input.conversation.user_id);
  } catch {
    return { ok: false, error: "support_subject_fenced", message: input.existingMessage };
  }
  const dispatched = await retrySupportReplyEmailDispatch({ ...input, privacyGate });
  if (!dispatched.ok) return dispatched;
  const finalMessage = await markSupportMessageSendStatusWithGate({
    db: input.db,
    messageId: dispatched.data.message.id,
    privacyGate,
    sendStatus: "sent",
    emailMessageId: dispatched.data.providerMessageId,
  });
  if (!finalMessage) {
    return { ok: false, error: "delivery_uncertain", message: dispatched.data.message };
  }
  await writeSupportAudit({
    actorUserId: input.admin.userId,
    actorEmail: input.admin.email ?? "unknown",
    action: "support.reply_sent",
    targetId: input.conversation.id,
    summary: { messageId: finalMessage.id, providerAccepted: true, retry: true },
  });
  revalidatePath("/admin/support");
  return { ok: true, data: { message: finalMessage, conversation: input.conversation } };
}

type AdminReplyStatus = "pending" | "resolved" | "archived";

type RenderedInboundWatermark = {
  createdAt: string;
  id: string;
};

type ExpectedConversationLifecycle = {
  status: SupportConversationStatus;
  updatedAt: string;
};

function hasAdminLifecycleMarker(message: SupportMessageRow) {
  if (!message.warning_flags_json) return false;
  try {
    const value = JSON.parse(message.warning_flags_json) as unknown;
    return Boolean(
      value
      && typeof value === "object"
      && !Array.isArray(value)
      && typeof (value as { adminLifecycleFinalizedAt?: unknown }).adminLifecycleFinalizedAt === "string",
    );
  } catch {
    return false;
  }
}

function normalizeAdminReplyStatus(value: unknown): AdminReplyStatus {
  if (value === undefined || value === null || value === "pending") return "pending";
  if (value === "resolved" || value === "archived") return value;
  throw new Error("Invalid support reply outcome.");
}

async function readRenderedInboundWatermark(input: {
  conversationId: string;
  db: D1DatabaseLike;
  messageId: string | null;
}): Promise<RenderedInboundWatermark | null> {
  const latestInbound = await input.db
    .prepare<{ created_at: string; id: string }>(
      `SELECT id, created_at
       FROM support_messages
       WHERE conversation_id = ?
         AND (sender_role = 'user' OR direction = 'inbound')
       ORDER BY created_at DESC, id DESC
       LIMIT 1`,
    )
    .bind(input.conversationId)
    .first<{ created_at: string; id: string }>();
  if (!input.messageId) {
    if (latestInbound) throw new Error("Rendered inbound watermark is required.");
    return null;
  }
  const message = await getSupportMessageByIdInD1(input.db, input.messageId);
  if (
    !message
    || message.conversation_id !== input.conversationId
    || (message.sender_role !== "user" && message.direction !== "inbound")
  ) {
    throw new Error("Rendered inbound watermark is invalid.");
  }
  return { createdAt: message.created_at, id: message.id };
}

function buildSupportActionTruthStatement(input: {
  conversationId: string;
  db: D1DatabaseLike;
  expectedUpdatedAt: string;
  now: string;
  privacyGate: SupportPrivacyWriteGate;
  requiredMessageId?: string;
}): D1PreparedStatementLike {
  const messageGate = input.requiredMessageId
    ? `AND EXISTS (
         SELECT 1 FROM support_messages lifecycle_message
         WHERE lifecycle_message.id = ?
           AND lifecycle_message.conversation_id = conversation.id
           AND lifecycle_message.send_status = 'sent'
       )`
    : "";
  const values: D1Value[] = [
    crypto.randomUUID(),
    input.now,
    input.now,
    input.now,
    input.now,
    input.now,
    input.now,
    input.now,
    input.conversationId,
    input.expectedUpdatedAt,
  ];
  if (input.requiredMessageId) values.push(input.requiredMessageId);
  values.push(...supportPrivacyWriteGateValues(input.privacyGate));

  return input.db
    .prepare(
      `INSERT INTO admin_action_items (
         id, derived_key, source_kind, source_id, title, detail, severity, href,
         status, priority, first_seen_at, last_seen_at, snooze_until, resolved_at,
         created_at, updated_at
       )
       SELECT
         ?, 'support:' || conversation.id, 'support', conversation.id,
         COALESCE(NULLIF(trim(conversation.subject), ''),
                  'Support conversation ' || substr(conversation.id, 1, 8)),
         'status: ' || conversation.status,
         CASE WHEN conversation.unread_for_admin = 1 THEN 'warning' ELSE 'info' END,
         '/admin/support?c=' || conversation.id || '&folder=all',
         CASE
           WHEN conversation.status IN ('resolved', 'archived') THEN 'resolved'
           WHEN triage.snoozed_until > ? THEN 'snoozed'
           ELSE 'open'
         END,
         CASE WHEN conversation.unread_for_admin = 1 THEN 20 ELSE 60 END,
         ?, ?,
         CASE
           WHEN conversation.status NOT IN ('resolved', 'archived')
             AND triage.snoozed_until > ?
             THEN triage.snoozed_until
           ELSE NULL
         END,
         CASE WHEN conversation.status IN ('resolved', 'archived') THEN ? ELSE NULL END,
         ?, ?
       FROM support_conversations conversation
       LEFT JOIN support_conversation_triage triage
         ON triage.conversation_id = conversation.id
       WHERE conversation.id = ?
         AND conversation.updated_at = ?
         ${messageGate}
         AND ${supportPrivacyWriteGateSql("action_fence")}
       ON CONFLICT(derived_key) DO UPDATE SET
         title = excluded.title,
         detail = excluded.detail,
         severity = excluded.severity,
         href = excluded.href,
         status = excluded.status,
         priority = excluded.priority,
         last_seen_at = excluded.last_seen_at,
         snooze_until = excluded.snooze_until,
         resolved_at = excluded.resolved_at,
         updated_at = excluded.updated_at`,
    )
    .bind(...values);
}

async function insertPendingAdminReply(input: {
  adminUserId: string;
  attachmentCount: number;
  bodyHtml: string | null;
  bodyText: string;
  ccJson: string | null;
  clientMessageId: string;
  conversation: SupportConversationRow;
  db: D1DatabaseLike;
  fromAddress: string | null;
  fromName: string | null;
  mailboxAddress: string | null;
  providerName: string | null;
  privacyGate: SupportPrivacyWriteGate;
  toJson: string | null;
  transport: "email" | "in_app";
}): Promise<{ inserted: boolean; message: SupportMessageRow }> {
  const existing = await getSupportMessageByClientIdInD1(
    input.db,
    input.conversation.id,
    input.clientMessageId,
  );
  if (existing) {
    return { inserted: false, message: existing };
  }

  const messageId = crypto.randomUUID();
  const now = new Date().toISOString();
  const insertMessage = input.db
    .prepare(
      `INSERT OR IGNORE INTO support_messages (
         id, conversation_id, sender_role, author_user_id, body_text,
         body_html, email_message_id, client_message_id, send_status,
         direction, transport, mailbox_address, from_address, from_name,
         to_json, cc_json, internet_message_id, in_reply_to, references_json,
         ingest_key, attachment_count, provider_name, received_at,
         warning_flags_json, created_at
       )
       SELECT ?, conversation.id, 'admin', ?, ?, ?, NULL, ?, 'pending',
              'outbound', ?, ?, ?, ?, ?, ?, NULL, NULL, NULL, NULL, ?, ?, NULL,
              NULL, ?
       FROM support_conversations conversation
       WHERE conversation.id = ?
         AND ${supportPrivacyWriteGateSql("reply_fence")}`,
    )
    .bind(
      messageId,
      input.adminUserId,
      input.bodyText,
      input.bodyHtml,
      input.clientMessageId,
      input.transport,
      input.mailboxAddress,
      input.fromAddress,
      input.fromName,
      input.toJson,
      input.ccJson,
      input.attachmentCount,
      input.providerName,
      now,
      input.conversation.id,
      ...supportPrivacyWriteGateValues(input.privacyGate),
    );
  const [result] = await runRequiredD1Batch(
    input.db,
    [insertMessage],
    "Support reply could not be staged.",
  );
  const message = await getSupportMessageByClientIdInD1(
    input.db,
    input.conversation.id,
    input.clientMessageId,
  );
  if (!message || message.conversation_id !== input.conversation.id) {
    throw new Error("Support reply staging could not be confirmed.");
  }
  return { inserted: (result.meta?.changes ?? 0) === 1, message };
}

async function finalizeAdminReplyLifecycle(input: {
  conversation: SupportConversationRow;
  db: D1DatabaseLike;
  expectedLifecycle: ExpectedConversationLifecycle;
  message: SupportMessageRow;
  privacyGate: SupportPrivacyWriteGate;
  renderedInboundWatermark: RenderedInboundWatermark | null;
  statusAfterReply: AdminReplyStatus;
}): Promise<{ conversation: SupportConversationRow; message: SupportMessageRow }> {
  if (hasAdminLifecycleMarker(input.message)) {
    const conversation = await getSupportConversationInD1(input.db, input.conversation.id);
    if (!conversation) throw new Error("Support conversation was not found.");
    return { conversation, message: input.message };
  }
  const now = new Date().toISOString();
  const finalizeMessage = input.db
    .prepare(
      `UPDATE support_messages
       SET send_status = 'sent',
           warning_flags_json = json_set(
             CASE
               WHEN json_valid(warning_flags_json)
                 AND json_type(warning_flags_json) = 'object'
                 THEN warning_flags_json
               ELSE '{}'
             END,
             '$.adminLifecycleFinalizedAt',
             ?
           )
       WHERE id = ?
         AND conversation_id = ?
         AND (
           send_status = 'sent'
           OR (transport = 'in_app' AND send_status = 'pending')
         )
         AND json_extract(
           CASE WHEN json_valid(warning_flags_json)
             THEN warning_flags_json ELSE '{}' END,
           '$.adminLifecycleFinalizedAt'
         ) IS NULL
         AND ${supportPrivacyWriteGateSql("lifecycle_fence")}`,
    )
    .bind(
      now,
      input.message.id,
      input.conversation.id,
      ...supportPrivacyWriteGateValues(input.privacyGate),
    );
  const laterInboundSql = input.renderedInboundWatermark
    ? `OR EXISTS (
         SELECT 1 FROM support_messages later_inbound
         WHERE later_inbound.conversation_id = support_conversations.id
           AND (later_inbound.sender_role = 'user' OR later_inbound.direction = 'inbound')
           AND (
             later_inbound.created_at > ?
             OR (later_inbound.created_at = ? AND later_inbound.id > ?)
           )
       )`
    : "";
  const unsafeToCloseSql = `(
    support_conversations.updated_at <> ?
    OR support_conversations.status <> ?
    ${laterInboundSql}
  )`;
  const conversationValues: D1Value[] = [];
  const pushUnsafeValues = () => {
    conversationValues.push(
      input.expectedLifecycle.updatedAt,
      input.expectedLifecycle.status,
    );
    if (input.renderedInboundWatermark) {
      conversationValues.push(
        input.renderedInboundWatermark.createdAt,
        input.renderedInboundWatermark.createdAt,
        input.renderedInboundWatermark.id,
      );
    }
  };
  pushUnsafeValues();
  conversationValues.push(
    input.statusAfterReply,
    input.message.created_at,
    input.message.created_at,
    now,
  );
  pushUnsafeValues();
  conversationValues.push(
    input.renderedInboundWatermark ? 1 : 0,
    input.conversation.id,
    input.message.id,
    now,
    ...supportPrivacyWriteGateValues(input.privacyGate),
  );
  const updateConversation = input.db
    .prepare(
      `UPDATE support_conversations
       SET status = CASE WHEN ${unsafeToCloseSql} THEN 'open' ELSE ? END,
           last_message_at = CASE
             WHEN last_message_at IS NULL OR last_message_at < ? THEN ?
             ELSE last_message_at
           END,
           updated_at = ?,
           unread_for_admin = CASE
             WHEN ${unsafeToCloseSql} THEN 1
             WHEN ? = 1 THEN 0
             ELSE unread_for_admin
           END,
           unread_for_user = CASE WHEN channel = 'in_app' THEN 1 ELSE unread_for_user END
       WHERE id = ?
         AND EXISTS (
           SELECT 1 FROM support_messages lifecycle_message
           WHERE lifecycle_message.id = ?
             AND lifecycle_message.conversation_id = support_conversations.id
             AND lifecycle_message.send_status = 'sent'
             AND json_extract(
               CASE WHEN json_valid(lifecycle_message.warning_flags_json)
                 THEN lifecycle_message.warning_flags_json ELSE '{}' END,
               '$.adminLifecycleFinalizedAt'
             ) = ?
         )
         AND ${supportPrivacyWriteGateSql("reply_fence")}`,
    )
    .bind(...conversationValues);
  const activateLegacy = input.db
    .prepare(
      `UPDATE support_legacy_feedback_imports
       SET user_visible_at = ?, activated_by_message_id = ?
       WHERE conversation_id = ?
         AND user_visible_at IS NULL
         AND EXISTS (
           SELECT 1 FROM support_messages lifecycle_message
           WHERE lifecycle_message.id = ?
             AND lifecycle_message.conversation_id = support_legacy_feedback_imports.conversation_id
             AND lifecycle_message.send_status = 'sent'
         )
         AND ${supportPrivacyWriteGateSql("legacy_activation_fence")}`,
    )
    .bind(
      now,
      input.message.id,
      input.conversation.id,
      input.message.id,
      ...supportPrivacyWriteGateValues(input.privacyGate),
    );
  const updateToday = buildSupportActionTruthStatement({
    conversationId: input.conversation.id,
    db: input.db,
    expectedUpdatedAt: now,
    now,
    privacyGate: input.privacyGate,
    requiredMessageId: input.message.id,
  });
  const results = await runRequiredD1Batch(
    input.db,
    [finalizeMessage, updateConversation, activateLegacy, updateToday],
    "Support reply lifecycle could not be finalized.",
  );
  if (
    (results[0]?.meta?.changes ?? 0) !== 1
    || (results[1]?.meta?.changes ?? 0) !== 1
    || (results[3]?.meta?.changes ?? 0) !== 1
  ) {
    throw new Error("Support reply lifecycle could not be finalized.");
  }
  const [message, conversation] = await Promise.all([
    getSupportMessageByIdInD1(input.db, input.message.id),
    getSupportConversationInD1(input.db, input.conversation.id),
  ]);
  if (!message || !conversation || message.send_status !== "sent") {
    throw new Error("Support reply lifecycle could not be confirmed.");
  }
  return { conversation, message };
}

async function updateAdminSupportStatusWithToday(input: {
  conversation: SupportConversationRow;
  db: D1DatabaseLike;
  expectedStatus: SupportConversationStatus;
  status: "open" | "pending";
}) {
  const privacyGate = await captureSupportPrivacyWriteGate(input.db, input.conversation.user_id);
  const now = new Date().toISOString();
  const updateConversation = input.db
    .prepare(
      `UPDATE support_conversations
       SET status = ?, updated_at = ?
       WHERE id = ?
         AND status = ?
         AND ${supportPrivacyWriteGateSql("status_fence")}`,
    )
    .bind(
      input.status,
      now,
      input.conversation.id,
      input.expectedStatus,
      ...supportPrivacyWriteGateValues(privacyGate),
    );
  const updateToday = buildSupportActionTruthStatement({
    conversationId: input.conversation.id,
    db: input.db,
    expectedUpdatedAt: now,
    now,
    privacyGate,
  });
  const results = await runRequiredD1Batch(
    input.db,
    [updateConversation, updateToday],
    "Support status could not be saved.",
  );
  if ((results[0]?.meta?.changes ?? 0) !== 1 || (results[1]?.meta?.changes ?? 0) !== 1) {
    return null;
  }
  return getSupportConversationInD1(input.db, input.conversation.id);
}

export async function sendSupportReply(input: {
  conversationId: string;
  body?: string;
  html?: string | null;
  clientMessageId: string;
  expectedConversationStatus: SupportConversationStatus;
  expectedConversationUpdatedAt: string;
  renderedInboundMessageId: string | null;
  fromIdentityId?: string | null;
  replyAll?: boolean;
  draftScopeKey?: string | null;
  drafts?: SupportDraftAttachmentReference[];
  statusAfterReply?: AdminReplyStatus;
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
  let privacyGate: SupportPrivacyWriteGate;
  try {
    privacyGate = await captureSupportPrivacyWriteGate(db, conversation.user_id);
  } catch {
    return { ok: false, error: "support_subject_fenced" };
  }
  let statusAfterReply: AdminReplyStatus;
  let expectedLifecycle: ExpectedConversationLifecycle;
  let renderedInboundWatermark: RenderedInboundWatermark | null;
  let bodies;
  try {
    statusAfterReply = normalizeAdminReplyStatus(input.statusAfterReply);
    expectedLifecycle = {
      status: normalizeSupportConversationStatus(input.expectedConversationStatus),
      updatedAt: normalizeActionText(input.expectedConversationUpdatedAt, "expectedConversationUpdatedAt", 64),
    };
    if (Number.isNaN(Date.parse(expectedLifecycle.updatedAt))) {
      throw new Error("Invalid support conversation lifecycle timestamp.");
    }
    renderedInboundWatermark = await readRenderedInboundWatermark({
      conversationId,
      db,
      messageId: input.renderedInboundMessageId
        ? normalizeActionText(input.renderedInboundMessageId, "renderedInboundMessageId", 128)
        : null,
    });
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
  let inserted: Awaited<ReturnType<typeof insertPendingAdminReply>>;
  try {
    inserted = await insertPendingAdminReply({
      adminUserId: admin.userId,
      attachmentCount: draftReferences.length,
      bodyHtml: bodies.bodyHtml,
      bodyText: bodies.bodyText,
      ccJson: emailRecipients?.cc.length
        ? JSON.stringify(emailRecipients.cc.map((address) => ({ email: address.email, name: address.name })))
        : null,
      clientMessageId,
      conversation,
      db,
      fromAddress: isEmailChannel ? identity.fromAddress : null,
      fromName: isEmailChannel ? identity.fromName : null,
      mailboxAddress: isEmailChannel ? (conversation.mailbox_address ?? identity.replyMailbox) : null,
      providerName: isEmailChannel ? "cloudflare-email" : null,
      privacyGate,
      toJson: emailRecipients
        ? JSON.stringify(emailRecipients.to.map((address) => ({ email: address.email, name: address.name })))
        : null,
      transport: isEmailChannel ? "email" : "in_app",
    });
  } catch {
    return { ok: false, error: "failed" };
  }

  let claimedDraftIds: string[] = [];
  let drafts: SupportDraftAttachmentMeta[] = [];
  let emailAttachments: EmailAttachmentInput[] = [];
  let storedAttachments: SupportAttachmentRow[] = [];
  let messageToFinalize = inserted.message;
  let providerMessageId: string | null = null;
  let providerAccepted = false;

  if (!inserted.inserted) {
    storedAttachments = await listSupportAttachmentsForMessageInD1(db, inserted.message.id);
    if (inserted.message.send_status === "sent" && hasAdminLifecycleMarker(inserted.message)) {
      const currentConversation = await getSupportConversationInD1(db, conversationId);
      if (!currentConversation) return { ok: false, error: "not_found" };
      return {
        ok: true,
        data: { message: inserted.message, conversation: currentConversation, attachments: storedAttachments },
      };
    }
    if (inserted.message.send_status === "send_failed") {
      if (isEmailChannel) {
        const retry = await retrySupportReplyEmailDispatch({
          admin,
          conversation,
          existingMessage: inserted.message,
          db,
          privacyGate,
        });
        if (!retry.ok) return retry;
        messageToFinalize = retry.data.message;
        providerMessageId = retry.data.providerMessageId;
        providerAccepted = true;
      } else {
        const recovered = await claimFailedSupportMessageRetryWithGate({
          db,
          messageId: inserted.message.id,
          privacyGate,
        });
        if (!recovered) return { ok: false, error: "delivery_pending", message: inserted.message };
        messageToFinalize = recovered;
      }
    } else if (isEmailChannel && inserted.message.send_status === "pending") {
      // A pending email may already have been accepted by the provider. Never
      // redispatch it without a durable provider outcome.
      return { ok: false, error: "delivery_pending", message: inserted.message };
    }
    if (
      !isEmailChannel
      && (
        storedAttachments.length !== messageToFinalize.attachment_count
        || storedAttachments.some((attachment) => attachment.storage_status !== "stored")
      )
    ) {
      const failedMessage = await markSupportMessageSendStatusWithGate({
        db,
        messageId: messageToFinalize.id,
        privacyGate,
        sendStatus: "send_failed",
      });
      return { ok: false, error: "failed", message: failedMessage ?? messageToFinalize };
    }
  } else if (draftReferences.length > 0 || input.draftScopeKey) {
    try {
      drafts = await resolveDraftAttachments({ db, adminUserId: admin.userId, references: draftReferences });
      claimedDraftIds = await claimDraftReferences({
        db,
        adminUserId: admin.userId,
        privacyGate,
        references: draftReferences,
        scopeKeys: input.draftScopeKey ? [input.draftScopeKey] : [],
      });
      if (!await updateDraftClaims({
        adminUserId: admin.userId,
        db,
        draftIds: claimedDraftIds,
        lifecycle: "sending",
        messageId: inserted.message.id,
        privacyGate,
      })) {
        return { ok: false, error: "failed", message: await failDraftPromotion({ db, adminUserId: admin.userId, draftIds: claimedDraftIds, message: inserted.message, privacyGate }) };
      }
    } catch {
      return { ok: false, error: "validation", message: await failDraftPromotion({ db, adminUserId: admin.userId, draftIds: claimedDraftIds, message: inserted.message, privacyGate }) };
    }
  }

  if (inserted.inserted && drafts.length > 0) {
    const r2 = await getSupportUploadsR2();
    if (!r2) {
      return { ok: false, error: "failed", message: await failDraftPromotion({ db, adminUserId: admin.userId, draftIds: claimedDraftIds, message: inserted.message, privacyGate }) };
    }
    try {
      const materialized = await materializeDraftAttachmentsForMessage({
        db,
        r2,
        adminUserId: admin.userId,
        conversationId,
        messageId: inserted.message.id,
        privacyGate,
        drafts,
      });
      emailAttachments = materialized.emailAttachments;
      storedAttachments = materialized.attachments;
    } catch {
      return { ok: false, error: "validation", message: await failDraftPromotion({ db, adminUserId: admin.userId, draftIds: claimedDraftIds, message: inserted.message, privacyGate }) };
    }
  }

  if (inserted.inserted && isEmailChannel && emailRecipients) {
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
      const failedMessage = await markSupportMessageSendStatusWithGate({
        db,
        messageId: inserted.message.id,
        privacyGate,
        sendStatus: "send_failed",
      });
      if (!failedMessage) return { ok: false, error: "delivery_uncertain", message: inserted.message };
      if (claimedDraftIds.length > 0) {
        await updateDraftClaims({
          adminUserId: admin.userId,
          db,
          draftIds: claimedDraftIds,
          lifecycle: "consumed",
          messageId: failedMessage.id,
          privacyGate,
        });
      }
      await writeSupportAudit({
        actorUserId: admin.userId,
        actorEmail: admin.email,
        action: "support.reply_send_failed",
        targetId: conversationId,
        summary: { messageId: failedMessage.id, code: result.code ?? "unknown" },
      });
      revalidatePath("/admin/support");
      revalidatePath("/admin/today");
      return { ok: false, error: "email_send_failed", message: failedMessage };
    }
    providerMessageId = result.messageId ?? null;
    providerAccepted = true;
  }

  if (isEmailChannel && messageToFinalize.send_status !== "sent") {
    const acceptedMessage = await markSupportMessageSendStatusWithGate({
      db,
      messageId: messageToFinalize.id,
      privacyGate,
      sendStatus: "sent",
      emailMessageId: providerMessageId,
    });
    if (!acceptedMessage) {
      return { ok: false, error: "delivery_uncertain", message: messageToFinalize };
    }
    messageToFinalize = acceptedMessage;
  }

  let finalized: Awaited<ReturnType<typeof finalizeAdminReplyLifecycle>>;
  try {
    finalized = await finalizeAdminReplyLifecycle({
      conversation,
      db,
      expectedLifecycle,
      message: messageToFinalize,
      privacyGate,
      renderedInboundWatermark,
      statusAfterReply,
    });
  } catch {
    return { ok: false, error: "delivery_uncertain", message: messageToFinalize };
  }

  if (claimedDraftIds.length > 0) {
    await updateDraftClaims({
      adminUserId: admin.userId,
      db,
      draftIds: claimedDraftIds,
      lifecycle: "consumed",
      messageId: finalized.message.id,
      privacyGate,
    });
  }

  const realtime = isEmailChannel
    ? { degraded: false, skipped: true }
    : await fanoutInAppSupportMessage(conversationId, finalized.message.id);

  await writeSupportAudit({
    actorUserId: admin.userId,
    actorEmail: admin.email,
    action: "support.reply_sent",
    targetId: conversationId,
    summary: {
      messageId: finalized.message.id,
      providerAccepted,
      channel: conversation.channel,
      attachmentCount: storedAttachments.length,
      realtimeDegraded: realtime.degraded,
      statusAfterReply,
    },
  });
  revalidatePath("/admin/support");
  revalidatePath("/admin/today");
  return {
    ok: true,
    data: { message: finalized.message, conversation: finalized.conversation, attachments: storedAttachments },
  };
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
  let sourcePrivacyGate: SupportPrivacyWriteGate = null;
  if (input.forwardSource) {
    const sourceConversationId = normalizeActionText(input.forwardSource.conversationId, "forward conversationId", 128);
    const sourceConversation = await getSupportConversationInD1(db, sourceConversationId);
    if (!sourceConversation) return { ok: false, error: "not_found" };
    try {
      sourcePrivacyGate = await captureSupportPrivacyWriteGate(db, sourceConversation.user_id);
    } catch {
      return { ok: false, error: "support_subject_fenced" };
    }
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
  let conversation: SupportConversationRow;
  let inserted: Awaited<ReturnType<typeof insertSupportMessageIfNewInD1>>;
  let createdConversationId: string | null = null;
  try {
    conversation = await createExternalSupportConversationInD1(db, {
      requesterEmail: recipient.email,
      requesterName: recipientName,
      subject,
      mailboxAddress: identity.replyMailbox,
      channel: "email",
      privacyGate: sourcePrivacyGate,
    });
    createdConversationId = conversation.id;

    inserted = await insertSupportMessageIfNewInD1(db, {
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
      privacyGate: sourcePrivacyGate,
    });
  } catch {
    if (createdConversationId) {
      await db.prepare(
        `DELETE FROM support_conversations
         WHERE id = ? AND NOT EXISTS (
           SELECT 1 FROM support_messages WHERE conversation_id = support_conversations.id
         )`,
      ).bind(createdConversationId).run().catch(() => undefined);
    }
    return { ok: false, error: sourcePrivacyGate ? "support_subject_fenced" : "failed" };
  }

  if (!inserted.inserted && inserted.message.send_status !== "send_failed") {
    if (inserted.message.send_status === "pending") {
      return { ok: false, error: "delivery_pending", message: inserted.message };
    }
    return { ok: true, data: { conversation, message: inserted.message, attachments: [] } };
  }

  const messageToSend =
    !inserted.inserted && inserted.message.send_status === "send_failed"
      ? (await claimFailedSupportMessageRetryWithGate({
          db,
          messageId: inserted.message.id,
          privacyGate: sourcePrivacyGate,
        })) ?? inserted.message
      : inserted.message;

  let drafts: SupportDraftAttachmentMeta[] = [];
  let claimedDraftIds: string[] = [];
  if ((draftReferences.length > 0 || input.draftScopeKey) && inserted.inserted) {
    try {
      drafts = await resolveDraftAttachments({ db, adminUserId: admin.userId, references: draftReferences });
      claimedDraftIds = await claimDraftReferences({
        db,
        adminUserId: admin.userId,
        privacyGate: sourcePrivacyGate,
        references: draftReferences,
        scopeKeys: input.draftScopeKey ? [input.draftScopeKey] : [],
      });
      if (!await updateDraftClaims({
        adminUserId: admin.userId,
        db,
        draftIds: claimedDraftIds,
        lifecycle: "sending",
        messageId: messageToSend.id,
        privacyGate: sourcePrivacyGate,
      })) {
        return { ok: false, error: "failed", message: await failDraftPromotion({ db, adminUserId: admin.userId, draftIds: claimedDraftIds, message: messageToSend, privacyGate: sourcePrivacyGate }) };
      }
    } catch {
      return { ok: false, error: "validation", message: await failDraftPromotion({ db, adminUserId: admin.userId, draftIds: claimedDraftIds, message: messageToSend, privacyGate: sourcePrivacyGate }) };
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
        privacyGate: sourcePrivacyGate,
      });
      emailAttachments = materialized.emailAttachments;
      storedAttachments = materialized.attachments;
    } catch {
      const failedMessage = await markSupportMessageSendStatusWithGate({
        db,
        messageId: messageToSend.id,
        privacyGate: sourcePrivacyGate,
        sendStatus: "send_failed",
      });
      return { ok: false, error: "failed", message: failedMessage ?? messageToSend };
    }
  }
  if (drafts.length > 0 && inserted.inserted) {
    const r2 = await getSupportUploadsR2();
    if (!r2) {
      return { ok: false, error: "failed", message: await failDraftPromotion({ db, adminUserId: admin.userId, draftIds: claimedDraftIds, message: messageToSend, privacyGate: sourcePrivacyGate }) };
    }
    try {
      const materialized = await materializeDraftAttachmentsForMessage({
        db,
        r2,
        adminUserId: admin.userId,
        conversationId: conversation.id,
        messageId: messageToSend.id,
        privacyGate: sourcePrivacyGate,
        drafts,
      });
      emailAttachments = [...emailAttachments, ...materialized.emailAttachments];
      storedAttachments = [...storedAttachments, ...materialized.attachments];
    } catch {
      return { ok: false, error: "validation", message: await failDraftPromotion({ db, adminUserId: admin.userId, draftIds: claimedDraftIds, message: messageToSend, privacyGate: sourcePrivacyGate }) };
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
    const failedMessage = await markSupportMessageSendStatusWithGate({
      db,
      messageId: messageToSend.id,
      privacyGate: sourcePrivacyGate,
      sendStatus: "send_failed",
    });
    if (failedMessage && claimedDraftIds.length > 0) {
      await updateDraftClaims({
        adminUserId: admin.userId,
        db,
        draftIds: claimedDraftIds,
        lifecycle: "consumed",
        messageId: failedMessage.id,
        privacyGate: sourcePrivacyGate,
      });
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

  const finalMessage = await markSupportMessageSendStatusWithGate({
    db,
    messageId: messageToSend.id,
    privacyGate: sourcePrivacyGate,
    sendStatus: "sent",
    emailMessageId: result.messageId ?? null,
  });
  if (!finalMessage) return { ok: false, error: "delivery_uncertain", message: messageToSend };

  if (claimedDraftIds.length > 0) {
    await updateDraftClaims({
      adminUserId: admin.userId,
      db,
      draftIds: claimedDraftIds,
      lifecycle: "consumed",
      messageId: finalMessage.id,
      privacyGate: sourcePrivacyGate,
    });
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
  expectedStatus: SupportConversationStatus;
  status: SupportConversationStatus;
}): Promise<SupportActionResult<{ conversation: SupportConversationRow }>> {
  const admin = await requireAdminContext();
  const conversationId = normalizeActionText(input.conversationId, "conversationId", 128);
  const status = normalizeSupportConversationStatus(input.status);
  const expectedStatus = normalizeSupportConversationStatus(input.expectedStatus);
  if (status === "resolved" || status === "archived") {
    return { ok: false, error: "terminal_reply_required" };
  }
  const db = await getCloudflareD1Database();
  if (!db) return { ok: false, error: "d1_unavailable" };
  const current = await getSupportConversationInD1(db, conversationId);
  if (!current) return { ok: false, error: "not_found" };
  let conversation: SupportConversationRow | null;
  try {
    conversation = await updateAdminSupportStatusWithToday({
      conversation: current,
      db,
      expectedStatus,
      status,
    });
  } catch {
    return { ok: false, error: "failed" };
  }
  if (!conversation) return { ok: false, error: "failed" };
  const realtime = conversation.channel === "in_app"
    ? await fanoutInAppSupportConversationChange(conversationId, "admin_status_updated")
    : { degraded: false, skipped: true };

  await writeSupportAudit({
    actorUserId: admin.userId,
    actorEmail: admin.email,
    action: "support.status_updated",
    targetId: conversationId,
    summary: { status, realtimeDegraded: realtime.degraded },
  });
  revalidatePath("/admin/support");
  revalidatePath("/admin/today");
  return { ok: true, data: { conversation } };
}

export async function markSupportConversationRead(input: {
  conversationId: string;
  throughMessageId: string;
}): Promise<SupportActionResult<{ throughMessageId: string; unread: boolean }>> {
  await requireAdminContext();
  const conversationId = normalizeActionText(input.conversationId, "conversationId", 128);
  const throughMessageId = normalizeActionText(input.throughMessageId, "throughMessageId", 128);
  const db = await getCloudflareD1Database();
  if (!db) return { ok: false, error: "d1_unavailable" };
  try {
    const result = await markAdminSupportConversationReadThrough({
      conversationId,
      database: db,
      throughMessageId,
    });
    return { ok: true, data: result };
  } catch (error) {
    if (error instanceof SupportReadError && error.status === 404) {
      return { ok: false, error: "not_found" };
    }
    if (error instanceof SupportReadError && error.status === 400) {
      return { ok: false, error: "validation" };
    }
    return { ok: false, error: "failed" };
  }
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
  const conversation = await getSupportConversationInD1(db, conversationId);
  if (!conversation) return { ok: false, error: "not_found" };
  let privacyGate: SupportPrivacyWriteGate;
  try {
    privacyGate = await captureSupportPrivacyWriteGate(db, conversation.user_id);
  } catch {
    return { ok: false, error: "support_subject_fenced" };
  }
  const existing = await getSupportConversationTriageInD1(db, conversationId);
  if (input.assignToSelf === false && existing?.assignee_user_id !== admin.userId) {
    return { ok: false, error: "validation" };
  }
  const assigneeUserId = input.assignToSelf === undefined
    ? existing?.assignee_user_id ?? null
    : input.assignToSelf ? admin.userId : null;
  const nextSnooze = snoozedUntil === undefined ? existing?.snoozed_until ?? null : snoozedUntil;
  const nextStarred = input.starredForAdmin === undefined
    ? existing?.starred_for_admin ?? 0
    : input.starredForAdmin ? 1 : 0;
  const privacyGateSql = supportPrivacyWriteGateSql("triage_fence");
  const mutation = existing
    ? db.prepare(
        `UPDATE support_conversation_triage
         SET assignee_user_id = ?, snoozed_until = ?, starred_for_admin = ?,
             revision = revision + 1, updated_at = ?
         WHERE conversation_id = ? AND revision = ? AND ${privacyGateSql}`,
      ).bind(
        assigneeUserId,
        nextSnooze,
        nextStarred,
        new Date().toISOString(),
        conversationId,
        input.expectedRevision,
        ...supportPrivacyWriteGateValues(privacyGate),
      )
    : db.prepare(
        `INSERT INTO support_conversation_triage (
           conversation_id, assignee_user_id, snoozed_until, starred_for_admin,
           revision, updated_at
         )
         SELECT ?, ?, ?, ?, 1, ? WHERE ? = 0 AND ${privacyGateSql}`,
      ).bind(
        conversationId,
        assigneeUserId,
        nextSnooze,
        nextStarred,
        new Date().toISOString(),
        input.expectedRevision,
        ...supportPrivacyWriteGateValues(privacyGate),
      );
  const [mutationResult] = await runRequiredD1Batch(db, [mutation], "Support triage could not be saved.");
  if ((mutationResult.meta?.changes ?? 0) !== 1) return { ok: false, error: "failed" };
  const triage = await getSupportConversationTriageInD1(db, conversationId);
  if (!triage) return { ok: false, error: "not_found" };
  await writeSupportAudit({
    actorUserId: admin.userId,
    actorEmail: admin.email,
    action: "support.triage_updated",
    targetId: conversationId,
    summary: { starred: triage.starred_for_admin, snoozedUntil: triage.snoozed_until, assigned: triage.assignee_user_id === admin.userId },
  });
  revalidatePath("/admin/support");
  return { ok: true, data: { triage } };
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
    const conversationId = normalizeActionText(input.conversationId, "conversationId", 128);
    const conversation = await getSupportConversationInD1(db, conversationId);
    if (!conversation) return { ok: false, error: "not_found" };
    const privacyGate = await captureSupportPrivacyWriteGate(db, conversation.user_id);
    const labels = [...new Set(input.labels.map((label) => label.trim().toLowerCase()).filter(Boolean))];
    if (labels.length > 12 || labels.some((label) => label.length > 48 || /[\u0000-\u001f\u007f]/u.test(label))) {
      return { ok: false, error: "validation" };
    }
    const existing = await getSupportConversationTriageInD1(db, conversationId);
    const gate = supportPrivacyWriteGateSql("label_fence");
    const now = new Date().toISOString();
    const revision = existing
      ? db.prepare(
          `UPDATE support_conversation_triage
           SET revision = revision + 1, updated_at = ?
           WHERE conversation_id = ? AND revision = ? AND ${gate}`,
        ).bind(now, conversationId, input.expectedRevision, ...supportPrivacyWriteGateValues(privacyGate))
      : db.prepare(
          `INSERT INTO support_conversation_triage (
             conversation_id, assignee_user_id, snoozed_until, starred_for_admin,
             revision, updated_at
           ) SELECT ?, NULL, NULL, 0, 1, ? WHERE ? = 0 AND ${gate}`,
        ).bind(conversationId, now, input.expectedRevision, ...supportPrivacyWriteGateValues(privacyGate));
    const deleteLabels = db.prepare(
      `DELETE FROM support_conversation_labels
       WHERE conversation_id = ? AND ${gate}`,
    ).bind(conversationId, ...supportPrivacyWriteGateValues(privacyGate));
    const inserts = labels.map((label) => db.prepare(
      `INSERT INTO support_conversation_labels (conversation_id, label, created_at)
       SELECT ?, ?, ? WHERE ${gate}`,
    ).bind(conversationId, label, now, ...supportPrivacyWriteGateValues(privacyGate)));
    const results = await runRequiredD1Batch(
      db,
      [revision, deleteLabels, ...inserts],
      "Support labels could not be saved.",
    );
    if ((results[0]?.meta?.changes ?? 0) !== 1 || inserts.some((_, index) => (results[index + 2]?.meta?.changes ?? 0) !== 1)) {
      return { ok: false, error: "failed" };
    }
    const triage = await getSupportConversationTriageInD1(db, conversationId);
    if (!triage) return { ok: false, error: "not_found" };
    await writeSupportAudit({ actorUserId: admin.userId, actorEmail: admin.email, action: "support.labels_updated", targetId: input.conversationId, summary: { count: triage.labels.length } });
    revalidatePath("/admin/support");
    return { ok: true, data: { triage } };
  } catch {
    return { ok: false, error: "validation" };
  }
}

export async function getSupportMessageForAdmin(messageId: string) {
  await requireAdminContext();
  const db = await getCloudflareD1Database();
  if (!db) return null;
  return getSupportMessageByIdInD1(db, messageId);
}
