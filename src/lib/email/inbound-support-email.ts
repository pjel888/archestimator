/**
 * Inbound Cloudflare Email Routing handler for support@ mailbox.
 * Worker-safe: no React/Next request imports.
 */

import {
  buildSupportAttachmentR2Key,
  classifyInboundAttachment,
  sha256Hex,
} from "@/lib/email/support-email-attachments";
import {
  normalizeEmailAddress,
  normalizeMessageId,
  redactEmailForLogs,
  senderDomain,
  splitReferencesHeader,
} from "@/lib/email/support-email-address";
import {
  extractPlusRoutingToken,
  isInboundAliasAllowed,
  readSupportEmailConfig,
  stripPlusAddress,
  type SupportEmailConfig,
} from "@/lib/email/support-email-config";
import { fanoutSupportInboxInvalidation } from "@/lib/cloudflare/support-inbox-fanout";
import { runRequiredD1Batch } from "@/lib/cloudflare/d1-batch";
import {
  createExternalSupportConversationInD1,
  findSupportConversationByRoutingTokenInD1,
  findSupportMessageByIngestKeyInD1,
  findSupportMessageByInternetMessageIdInD1,
  getSupportConversationInD1,
  insertSupportMessageIfNewInD1,
  type D1DatabaseLike,
  type SupportConversationRow,
  type SupportMessageRow,
} from "@/lib/repositories/support-conversations-d1";
import {
  requireOpenSupportPrivacyFence,
  SupportPrivacyFenceError,
} from "@/lib/support/privacy-fence";
import {
  markSupportSubjectR2ObjectStoredStatement,
  reserveOpenSupportSubjectR2Object,
} from "@/lib/support/subject-r2-registry";

type ForwardableEmailMessage = {
  from: string;
  to: string;
  headers: Headers;
  raw: ReadableStream<Uint8Array>;
  rawSize: number;
  setReject(reason: string): void;
  forward(rcptTo: string, headers?: Headers): Promise<void>;
};

type R2BucketLike = {
  put(
    key: string,
    value: ArrayBuffer | ArrayBufferView | string | ReadableStream | Blob | null,
    options?: { httpMetadata?: { contentType?: string } },
  ): Promise<unknown>;
  delete?(keys: string | string[]): Promise<unknown>;
};

type SupportInboxNamespaceLike = {
  idFromName(name: string): unknown;
  get(id: unknown): { fetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> };
};

export type InboundSupportEmailEnv = Record<string, unknown> & {
  ARCH_DB?: D1DatabaseLike;
  ARCH_UPLOADS_R2?: R2BucketLike;
  SUPPORT_INBOX?: SupportInboxNamespaceLike | null;
  EMAIL?: {
    send: (message: Record<string, unknown>) => Promise<{ messageId?: string }>;
  };
};

type ExecutionContextLike = {
  waitUntil?(promise: Promise<unknown>): void;
};

type ParsedAddress = {
  address?: string;
  name?: string;
};

type ParsedAttachment = {
  filename?: string | null;
  mimeType?: string | null;
  disposition?: string | null;
  contentId?: string | null;
  content?: ArrayBuffer | Uint8Array | string;
};

type ParsedMail = {
  subject?: string | null;
  text?: string | null;
  html?: string | null;
  messageId?: string | null;
  inReplyTo?: string | null;
  references?: string | string[] | null;
  from?: ParsedAddress | ParsedAddress[] | null;
  to?: ParsedAddress | ParsedAddress[] | null;
  cc?: ParsedAddress | ParsedAddress[] | null;
  date?: string | Date | null;
  attachments?: ParsedAttachment[];
};

type InboundAttachmentInsert = {
  contentId?: string | null;
  contentType: string | null;
  disposition?: string | null;
  filename: string;
  id?: string;
  messageId: string;
  r2Key: string;
  sha256?: string | null;
  sizeBytes: number;
  storageStatus: "stored" | "failed" | "blocked" | "quarantined";
};

type InboundPrivacySubject = {
  userId: string | null;
  generation: number;
};

function inboundPrivacyGateSql(alias: string, fenceAlias: string) {
  return `(\n    (? IS NULL AND ${alias}.user_id IS NULL)\n    OR (${alias}.user_id = ? AND EXISTS (\n      SELECT 1 FROM support_subject_privacy_fences ${fenceAlias}\n      WHERE ${fenceAlias}.user_id = ?\n        AND ${fenceAlias}.generation = ?\n        AND ${fenceAlias}.state = 'open'\n    ))\n  )`;
}

function inboundPrivacyGateValues(subject: InboundPrivacySubject) {
  return [subject.userId, subject.userId, subject.userId, subject.generation] as const;
}

function logSupportEmailEvent(
  event: string,
  level: "info" | "warn" | "error",
  context: Record<string, unknown>,
) {
  console.log(
    JSON.stringify({
      timestamp: new Date().toISOString(),
      level,
      event,
      ...context,
    }),
  );
}

function firstAddress(value: ParsedAddress | ParsedAddress[] | null | undefined): ParsedAddress | null {
  if (!value) return null;
  return Array.isArray(value) ? value[0] ?? null : value;
}

function htmlToPlainText(html: string) {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/\s+/g, " ")
    .trim();
}

function collectAutomatedFlags(headers: Headers) {
  const flags: string[] = [];
  const autoSubmitted = headers.get("auto-submitted")?.toLowerCase() ?? "";
  if (autoSubmitted && autoSubmitted !== "no") flags.push("auto_submitted");
  const precedence = headers.get("precedence")?.toLowerCase() ?? "";
  if (precedence === "bulk" || precedence === "list" || precedence === "junk") flags.push("precedence_bulk");
  if (headers.get("x-auto-response-suppress")) flags.push("auto_response_suppress");
  if (headers.get("list-id") || headers.get("list-unsubscribe")) flags.push("mailing_list");
  const contentType = headers.get("content-type")?.toLowerCase() ?? "";
  if (contentType.includes("delivery-status") || contentType.includes("report")) flags.push("delivery_report");
  return flags;
}

function collectAuthSummary(headers: Headers) {
  return {
    spf: headers.get("received-spf")?.slice(0, 120) ?? null,
    authenticationResults: headers.get("authentication-results")?.slice(0, 240) ?? null,
    spam: headers.get("x-spam-status")?.slice(0, 120) ?? null,
  };
}

async function hashIngestFallback(parts: string[]) {
  const data = new TextEncoder().encode(parts.join("|"));
  const digest = await crypto.subtle.digest("SHA-256", data);
  return `sha256:${[...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("")}`;
}

async function resolveConversation(
  db: D1DatabaseLike,
  input: {
    envelopeTo: string;
    fromEmail: string;
    fromName: string | null;
    subject: string | null;
    inReplyTo: string | null;
    references: string[];
    mailboxAddress: string;
  },
): Promise<{ conversation: SupportConversationRow; created: boolean }> {
  const token = extractPlusRoutingToken(input.envelopeTo);
  if (token) {
    const byToken = await findSupportConversationByRoutingTokenInD1(db, token);
    if (byToken) return { conversation: byToken, created: false };
  }

  const candidates = [input.inReplyTo, ...input.references].filter(Boolean) as string[];
  for (const candidate of candidates) {
    const message = await findSupportMessageByInternetMessageIdInD1(db, candidate);
    if (!message) continue;
    const conversation = await getSupportConversationInD1(db, message.conversation_id);
    if (conversation) return { conversation, created: false };
  }

  const conversation = await createExternalSupportConversationInD1(db, {
    requesterEmail: input.fromEmail,
    requesterName: input.fromName,
    subject: input.subject,
    mailboxAddress: input.mailboxAddress,
    channel: "email",
  });
  return { conversation, created: true };
}

async function insertInboundMessageWithPrivacyFence(input: {
  authorUserId: string | null;
  bodyText: string;
  clientMessageId: string;
  conversation: SupportConversationRow;
  database: D1DatabaseLike;
  fromAddress: string;
  fromName: string | null;
  ingestKey: string;
  privacySubject: InboundPrivacySubject;
  inReplyTo: string | null;
  internetMessageId: string | null;
  mailboxAddress: string;
  referencesJson: string | null;
  toJson: string;
  warningFlagsJson: string | null;
}): Promise<{ inserted: boolean; message: SupportMessageRow }> {
  const existing = await findSupportMessageByIngestKeyInD1(input.database, input.ingestKey);
  if (existing) return { inserted: false, message: existing };
  const messageId = crypto.randomUUID();
  const now = new Date().toISOString();
  const gate = inboundPrivacyGateSql("conversation", "inbound_fence");
  const insertMessage = input.database.prepare(
    `INSERT OR IGNORE INTO support_messages (
       id, conversation_id, sender_role, author_user_id, body_text,
       body_html, email_message_id, client_message_id, send_status,
       direction, transport, mailbox_address, from_address, from_name,
       to_json, cc_json, internet_message_id, in_reply_to, references_json,
       ingest_key, attachment_count, provider_name, received_at,
       warning_flags_json, created_at
     )
     SELECT ?, conversation.id, 'user', ?, ?, NULL, NULL, ?, 'sent',
            'inbound', 'email', ?, ?, ?, ?, NULL, ?, ?, ?, ?, 0,
            'cloudflare-email', ?, ?, ?
     FROM support_conversations conversation
     WHERE conversation.id = ? AND ${gate}`,
  ).bind(
    messageId,
    input.authorUserId,
    input.bodyText,
    input.clientMessageId,
    input.mailboxAddress,
    input.fromAddress,
    input.fromName,
    input.toJson,
    input.internetMessageId,
    input.inReplyTo,
    input.referencesJson,
    input.ingestKey,
    now,
    input.warningFlagsJson,
    now,
    input.conversation.id,
    ...inboundPrivacyGateValues(input.privacySubject),
  );
  const updateConversation = input.database.prepare(
    `UPDATE support_conversations
     SET last_message_at = ?, updated_at = ?, unread_for_admin = 1
     WHERE id = ?
       AND EXISTS (SELECT 1 FROM support_messages message WHERE message.id = ?)
       AND ${inboundPrivacyGateSql("support_conversations", "conversation_fence")}`,
  ).bind(
    now,
    now,
    input.conversation.id,
    messageId,
    ...inboundPrivacyGateValues(input.privacySubject),
  );
  const results = await runRequiredD1Batch(
    input.database,
    [insertMessage, updateConversation],
    "Inbound support email could not be persisted.",
  );
  const row = await findSupportMessageByIngestKeyInD1(input.database, input.ingestKey);
  if ((results[0]?.meta?.changes ?? 0) !== 1 || (results[1]?.meta?.changes ?? 0) !== 1 || !row) {
    if (row) return { inserted: false, message: row };
    throw new SupportPrivacyFenceError();
  }
  return { inserted: true, message: row };
}

async function insertInboundAttachmentWithPrivacyFence(input: {
  attachment: InboundAttachmentInsert;
  database: D1DatabaseLike;
  privacySubject: InboundPrivacySubject;
}) {
  const id = input.attachment.id ?? crypto.randomUUID();
  const createdAt = new Date().toISOString();
  const insert = input.database.prepare(
    `INSERT INTO support_message_attachments (
       id, message_id, r2_key, filename, content_type, size_bytes,
       content_id, disposition, sha256, storage_status, created_at
     )
     SELECT ?, message.id, ?, ?, ?, ?, ?, ?, ?, ?, ?
     FROM support_messages message
     INNER JOIN support_conversations conversation ON conversation.id = message.conversation_id
     WHERE message.id = ?
       AND ${inboundPrivacyGateSql("conversation", "attachment_fence")}`,
  ).bind(
    id,
    input.attachment.r2Key,
    input.attachment.filename,
    input.attachment.contentType,
    input.attachment.sizeBytes,
    input.attachment.contentId ?? null,
    input.attachment.disposition ?? null,
    input.attachment.sha256 ?? null,
    input.attachment.storageStatus,
    createdAt,
    input.attachment.messageId,
    ...inboundPrivacyGateValues(input.privacySubject),
  );
  const statements = [insert];
  if (input.attachment.storageStatus === "stored" && input.privacySubject.userId) {
    statements.push(markSupportSubjectR2ObjectStoredStatement({
      database: input.database,
      r2Key: input.attachment.r2Key,
      sourceId: id,
      sourceKind: "inbound_attachment",
      storedAt: createdAt,
      userId: input.privacySubject.userId,
    }));
  }
  const results = await runRequiredD1Batch(
    input.database,
    statements,
    "Inbound support attachment could not be persisted.",
  );
  if (results.some((result) => (result.meta?.changes ?? 0) !== 1)) {
    throw new SupportPrivacyFenceError();
  }
}

async function updateInboundAttachmentCountWithPrivacyFence(input: {
  attachmentCount: number;
  database: D1DatabaseLike;
  messageId: string;
  privacySubject: InboundPrivacySubject;
  warningFlagsJson: string | null;
}) {
  const result = await input.database.prepare(
    `UPDATE support_messages
     SET attachment_count = ?, warning_flags_json = COALESCE(?, warning_flags_json)
     WHERE id = ? AND EXISTS (
       SELECT 1 FROM support_conversations conversation
       WHERE conversation.id = support_messages.conversation_id
         AND ${inboundPrivacyGateSql("conversation", "attachment_fence")}
     )`,
  ).bind(
    input.attachmentCount,
    input.warningFlagsJson,
    input.messageId,
    ...inboundPrivacyGateValues(input.privacySubject),
  ).run();
  if ((result.meta?.changes ?? 0) !== 1) throw new SupportPrivacyFenceError();
}

async function storeAttachments(input: {
  db: D1DatabaseLike;
  r2: R2BucketLike | null | undefined;
  config: SupportEmailConfig;
  conversationId: string;
  messageId: string;
  privacySubject: InboundPrivacySubject;
  attachments: ParsedAttachment[];
  warningFlags: string[];
}) {
  let storedCount = 0;
  let totalBytes = 0;
  const limited = input.attachments.slice(0, input.config.maxAttachments);

  for (const attachment of limited) {
    const classification = classifyInboundAttachment({
      filename: attachment.filename,
      contentType: attachment.mimeType,
    });

    let bytes: Uint8Array | null = null;
    if (attachment.content instanceof ArrayBuffer) {
      bytes = new Uint8Array(attachment.content);
    } else if (attachment.content instanceof Uint8Array) {
      bytes = attachment.content;
    } else if (typeof attachment.content === "string") {
      bytes = new TextEncoder().encode(attachment.content);
    }

    const sizeBytes = bytes?.byteLength ?? 0;
    if (sizeBytes > input.config.maxAttachmentBytes) {
      input.warningFlags.push("attachment_too_large");
      await insertInboundAttachmentWithPrivacyFence({
        database: input.db,
        privacySubject: input.privacySubject,
        attachment: {
          messageId: input.messageId,
          r2Key: buildSupportAttachmentR2Key({
            conversationId: input.conversationId,
            messageId: input.messageId,
            attachmentId: crypto.randomUUID(),
            filename: classification.sanitizedFilename,
          }),
          filename: classification.sanitizedFilename,
          contentType: classification.safeContentType,
          sizeBytes,
          contentId: attachment.contentId ?? null,
          disposition: attachment.disposition ?? null,
          storageStatus: "quarantined",
        },
      });
      continue;
    }

    if (totalBytes + sizeBytes > input.config.maxTotalAttachmentBytes) {
      input.warningFlags.push("attachment_total_too_large");
      break;
    }

    if (classification.blocked) {
      input.warningFlags.push("attachment_blocked");
      await insertInboundAttachmentWithPrivacyFence({
        database: input.db,
        privacySubject: input.privacySubject,
        attachment: {
          messageId: input.messageId,
          r2Key: buildSupportAttachmentR2Key({
            conversationId: input.conversationId,
            messageId: input.messageId,
            attachmentId: crypto.randomUUID(),
            filename: classification.sanitizedFilename,
          }),
          filename: classification.sanitizedFilename,
          contentType: classification.safeContentType,
          sizeBytes,
          contentId: attachment.contentId ?? null,
          disposition: attachment.disposition ?? null,
          storageStatus: "blocked",
        },
      });
      continue;
    }

    const attachmentId = crypto.randomUUID();
    const r2Key = buildSupportAttachmentR2Key({
      conversationId: input.conversationId,
      messageId: input.messageId,
      attachmentId,
      filename: classification.sanitizedFilename,
    });

    if (!input.r2 || !bytes) {
      input.warningFlags.push("attachment_store_failed");
      await insertInboundAttachmentWithPrivacyFence({
        database: input.db,
        privacySubject: input.privacySubject,
        attachment: {
          messageId: input.messageId,
          r2Key,
          filename: classification.sanitizedFilename,
          contentType: classification.safeContentType,
          sizeBytes,
          contentId: attachment.contentId ?? null,
          disposition: attachment.disposition ?? null,
          storageStatus: "failed",
        },
      });
      continue;
    }

    try {
      const hash = await sha256Hex(bytes);
      if (input.privacySubject.userId) {
        await reserveOpenSupportSubjectR2Object({
          database: input.db,
          privacyGate: {
            generation: input.privacySubject.generation,
            userId: input.privacySubject.userId,
          },
          r2Key,
          sourceId: attachmentId,
          sourceKind: "inbound_attachment",
        });
      }
      await input.r2.put(r2Key, bytes, {
        httpMetadata: { contentType: classification.safeContentType },
      });
      await insertInboundAttachmentWithPrivacyFence({
        database: input.db,
        privacySubject: input.privacySubject,
        attachment: {
          id: attachmentId,
          messageId: input.messageId,
          r2Key,
          filename: classification.sanitizedFilename,
          contentType: classification.safeContentType,
          sizeBytes,
          contentId: attachment.contentId ?? null,
          disposition: attachment.disposition ?? null,
          sha256: hash,
          storageStatus: "stored",
        },
      });
      storedCount += 1;
      totalBytes += sizeBytes;
      logSupportEmailEvent("support_email_attachment_stored", "info", {
        conversation_id: input.conversationId,
        message_id: input.messageId,
        size_bytes: sizeBytes,
      });
    } catch (error) {
      await input.r2.delete?.(r2Key).catch(() => undefined);
      if (error instanceof SupportPrivacyFenceError) throw error;
      input.warningFlags.push("attachment_store_failed");
      await insertInboundAttachmentWithPrivacyFence({
        database: input.db,
        privacySubject: input.privacySubject,
        attachment: {
          messageId: input.messageId,
          r2Key,
          filename: classification.sanitizedFilename,
          contentType: classification.safeContentType,
          sizeBytes,
          contentId: attachment.contentId ?? null,
          disposition: attachment.disposition ?? null,
          storageStatus: "failed",
        },
      });
      logSupportEmailEvent("support_email_attachment_store_failed", "error", {
        conversation_id: input.conversationId,
        message_id: input.messageId,
      });
    }
  }

  if (input.attachments.length > input.config.maxAttachments) {
    input.warningFlags.push("attachment_count_capped");
  }

  return storedCount;
}

async function maybeForward(
  message: ForwardableEmailMessage,
  config: SupportEmailConfig,
  reason: string,
) {
  if (!config.forwardEnabled || !config.forwardTo) return;
  try {
    await message.forward(config.forwardTo);
    logSupportEmailEvent("support_email_fallback_forwarded", "info", {
      reason,
      mailbox: stripPlusAddress(message.to),
    });
  } catch {
    logSupportEmailEvent("support_email_fallback_forward_failed", "error", {
      reason,
      mailbox: stripPlusAddress(message.to),
    });
  }
}

async function fanoutSupportInboxBestEffort(
  env: InboundSupportEmailEnv,
  conversationId: string,
  message: SupportMessageRow,
) {
  const result = await fanoutSupportInboxInvalidation({
    env,
    conversationId,
    messageId: message.id,
    subject: "inbound_email",
  });
  if (result.degraded) {
    logSupportEmailEvent("support_email_realtime_fanout_failed", "warn", {
      conversation_id: conversationId,
      message_id: message.id,
    });
  }
}

export async function handleInboundSupportEmail(input: {
  message: ForwardableEmailMessage;
  env: InboundSupportEmailEnv;
  ctx?: ExecutionContextLike;
}): Promise<void> {
  const { message, env } = input;
  const config = readSupportEmailConfig(env);

  logSupportEmailEvent("support_email_inbound_received", "info", {
    mailbox: stripPlusAddress(message.to),
    sender_domain: senderDomain(message.from),
    raw_size: message.rawSize,
  });

  if (!config.inboundEnabled) {
    await maybeForward(message, config, "inbound_disabled");
    message.setReject("Inbound support email is disabled.");
    return;
  }

  if (!isInboundAliasAllowed(message.to, config)) {
    logSupportEmailEvent("support_email_inbound_unknown_alias", "warn", {
      mailbox: stripPlusAddress(message.to),
    });
    message.setReject("Unknown support mailbox alias.");
    return;
  }

  if (message.rawSize > config.maxMessageBytes) {
    const db = env.ARCH_DB;
    if (db) {
      try {
        const from = normalizeEmailAddress(message.from);
        const conversation = await createExternalSupportConversationInD1(db, {
          requesterEmail: from.email,
          requesterName: from.name,
          subject: message.headers.get("subject") ?? "Oversized email",
          mailboxAddress: stripPlusAddress(message.to),
          channel: "email",
        });
        await insertSupportMessageIfNewInD1(db, {
          conversationId: conversation.id,
          senderRole: "system",
          authorUserId: null,
          bodyText: "Inbound email exceeded the maximum message size and was not fully ingested.",
          clientMessageId: `oversized-${crypto.randomUUID()}`,
          sendStatus: "sent",
          direction: "internal",
          transport: "email",
          mailboxAddress: stripPlusAddress(message.to),
          fromAddress: from.email,
          warningFlagsJson: JSON.stringify(["oversized_message"]),
          ingestKey: await hashIngestFallback([
            "oversized",
            message.from,
            message.to,
            String(message.rawSize),
            message.headers.get("message-id") ?? "",
          ]),
        });
      } catch {
        logSupportEmailEvent("support_email_inbound_parse_failed", "warn", {
          reason: "oversized_message_persist_failed",
        });
      }
    }
    await maybeForward(message, config, "oversized");
    message.setReject("Message too large.");
    return;
  }

  const db = env.ARCH_DB;
  if (!db) {
    logSupportEmailEvent("support_email_inbound_parse_failed", "error", { reason: "d1_unavailable" });
    throw new Error("Something went wrong. Try again in a moment.");
  }

  const warningFlags = collectAutomatedFlags(message.headers);
  const authSummary = collectAuthSummary(message.headers);

  let rawBuffer: ArrayBuffer;
  try {
    rawBuffer = await new Response(message.raw).arrayBuffer();
  } catch {
    logSupportEmailEvent("support_email_inbound_parse_failed", "error", { reason: "raw_read_failed" });
    await maybeForward(message, config, "raw_read_failed");
    message.setReject("Unable to read message.");
    return;
  }

  let parsed: ParsedMail;
  try {
    const PostalMime = (await import("postal-mime")).default;
    parsed = (await PostalMime.parse(rawBuffer)) as ParsedMail;
  } catch {
    logSupportEmailEvent("support_email_inbound_parse_failed", "error", { reason: "mime_parse_failed" });
    try {
      const from = normalizeEmailAddress(message.from);
      const conversation = await createExternalSupportConversationInD1(db, {
        requesterEmail: from.email,
        requesterName: from.name,
        subject: message.headers.get("subject") ?? "Unreadable email",
        mailboxAddress: stripPlusAddress(message.to),
        channel: "email",
      });
      await insertSupportMessageIfNewInD1(db, {
        conversationId: conversation.id,
        senderRole: "system",
        authorUserId: null,
        bodyText: "Inbound email could not be parsed. Optional forwarding may retain the original.",
        clientMessageId: `parse-failed-${crypto.randomUUID()}`,
        sendStatus: "sent",
        direction: "internal",
        transport: "email",
        mailboxAddress: stripPlusAddress(message.to),
        fromAddress: from.email,
        warningFlagsJson: JSON.stringify(["parse_failed"]),
        ingestKey: await hashIngestFallback([
          "parse-failed",
          message.from,
          message.to,
          message.headers.get("message-id") ?? "",
          String(message.rawSize),
        ]),
      });
    } catch {
      logSupportEmailEvent("support_email_inbound_parse_failed", "warn", {
        reason: "parse_failed_secondary_persist_failed",
      });
    }
    await maybeForward(message, config, "parse_failed");
    return;
  }

  let fromEmail: string;
  let fromName: string | null = null;
  try {
    const headerFrom = firstAddress(parsed.from);
    const normalized = normalizeEmailAddress(headerFrom?.address || message.from);
    fromEmail = normalized.email;
    fromName = headerFrom?.name?.trim() || normalized.name;
  } catch {
    try {
      const normalized = normalizeEmailAddress(message.from);
      fromEmail = normalized.email;
      fromName = normalized.name;
    } catch {
      message.setReject("Invalid sender address.");
      return;
    }
  }

  const mailboxAddress = stripPlusAddress(message.to);
  const subject = (parsed.subject ?? message.headers.get("subject") ?? "").trim().slice(0, 160) || "Support request";
  const internetMessageId =
    normalizeMessageId(parsed.messageId) ?? normalizeMessageId(message.headers.get("message-id"));
  const inReplyTo =
    normalizeMessageId(typeof parsed.inReplyTo === "string" ? parsed.inReplyTo : null) ??
    normalizeMessageId(message.headers.get("in-reply-to"));
  const references = [
    ...splitReferencesHeader(
      Array.isArray(parsed.references) ? parsed.references.join(" ") : parsed.references ?? null,
    ),
    ...splitReferencesHeader(message.headers.get("references")),
  ];
  const uniqueReferences = [...new Set(references)];

  const ingestKey =
    internetMessageId ??
    (await hashIngestFallback([
      message.from,
      message.to,
      subject,
      String(parsed.date ?? message.headers.get("date") ?? ""),
      String(message.rawSize),
      String(rawBuffer.byteLength),
    ]));

  const existing = await findSupportMessageByIngestKeyInD1(db, ingestKey);
  if (existing) {
    logSupportEmailEvent("support_email_inbound_duplicate", "info", {
      conversation_id: existing.conversation_id,
      message_id: existing.id,
      sender_domain: senderDomain(fromEmail),
    });
    return;
  }

  const { conversation } = await resolveConversation(db, {
    envelopeTo: message.to,
    fromEmail,
    fromName,
    subject,
    inReplyTo,
    references: uniqueReferences,
    mailboxAddress,
  });
  const privacyUserId = conversation.user_id;
  let privacyGeneration = -1;
  if (privacyUserId) {
    try {
      privacyGeneration = (await requireOpenSupportPrivacyFence(db, privacyUserId)).generation;
    } catch {
      logSupportEmailEvent("support_email_inbound_subject_fenced", "warn", {
        code: "support_subject_fenced",
        conversation_id: conversation.id,
      });
      message.setReject("Support changes are temporarily unavailable for this account.");
      return;
    }
  }
  const privacySubject: InboundPrivacySubject = {
    userId: privacyUserId,
    generation: privacyGeneration,
  };

  const textBody =
    (parsed.text?.trim() ||
      (parsed.html ? htmlToPlainText(parsed.html) : "") ||
      "(empty message body)").slice(0, 8_000);

  let inserted: { inserted: boolean; message: SupportMessageRow };
  try {
    inserted = await insertInboundMessageWithPrivacyFence({
      authorUserId: privacyUserId,
      bodyText: textBody,
      clientMessageId: `inbound-${ingestKey}`.slice(0, 128),
      conversation,
      database: db,
      fromAddress: fromEmail,
      fromName,
      ingestKey,
      inReplyTo,
      internetMessageId,
      mailboxAddress,
      privacySubject,
      referencesJson: uniqueReferences.length > 0 ? JSON.stringify(uniqueReferences) : null,
      toJson: JSON.stringify([{ email: message.to }]),
      warningFlagsJson:
        warningFlags.length > 0 || authSummary.authenticationResults
          ? JSON.stringify({ flags: warningFlags, auth: authSummary })
          : null,
    });
  } catch (error) {
    if (error instanceof SupportPrivacyFenceError) {
      logSupportEmailEvent("support_email_inbound_subject_fenced", "warn", {
        code: error.code,
        conversation_id: conversation.id,
      });
      message.setReject("Support changes are temporarily unavailable for this account.");
      return;
    }
    throw error;
  }

  if (!inserted.inserted) {
    logSupportEmailEvent("support_email_inbound_duplicate", "info", {
      conversation_id: conversation.id,
      message_id: inserted.message.id,
      sender_domain: senderDomain(fromEmail),
    });
    return;
  }

  let attachmentCount: number;
  try {
    attachmentCount = await storeAttachments({
      db,
      r2: env.ARCH_UPLOADS_R2,
      config,
      conversationId: conversation.id,
      messageId: inserted.message.id,
      privacySubject,
      attachments: parsed.attachments ?? [],
      warningFlags,
    });
  } catch (error) {
    if (error instanceof SupportPrivacyFenceError) {
      logSupportEmailEvent("support_email_inbound_subject_fenced", "warn", {
        code: error.code,
        conversation_id: conversation.id,
      });
      message.setReject("Support changes are temporarily unavailable for this account.");
      return;
    }
    throw error;
  }

  if (attachmentCount > 0 || warningFlags.length > 0) {
    await updateInboundAttachmentCountWithPrivacyFence({
      attachmentCount,
      database: db,
      messageId: inserted.message.id,
      privacySubject,
      warningFlagsJson: warningFlags.length > 0
        ? JSON.stringify({ flags: warningFlags, auth: authSummary })
        : null,
    });
  }

  logSupportEmailEvent("support_email_inbound_persisted", "info", {
    conversation_id: conversation.id,
    message_id: inserted.message.id,
    sender_domain: senderDomain(fromEmail),
    mailbox: mailboxAddress,
    attachment_count: attachmentCount,
    sender_redacted: redactEmailForLogs(fromEmail),
  });

  await fanoutSupportInboxBestEffort(env, conversation.id, inserted.message);
  await maybeForward(message, config, "copy_after_ingest");
}
