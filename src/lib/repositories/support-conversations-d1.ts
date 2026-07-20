import { DEFAULT_SUPPORT_MAILBOX } from "@/lib/email/support-email-config";

export type D1Value = string | number | boolean | null | ArrayBuffer;

export type D1Result<T = Record<string, unknown>> = {
  results?: T[];
  success?: boolean;
  meta?: { changes?: number };
};

export type D1PreparedStatementLike<T = Record<string, unknown>> = {
  bind(...values: D1Value[]): D1PreparedStatementLike<T>;
  first<R = T>(): Promise<R | null>;
  all<R = T>(): Promise<D1Result<R>>;
  run(): Promise<D1Result<T>>;
};

export type D1DatabaseLike = {
  prepare<T = Record<string, unknown>>(sql: string): D1PreparedStatementLike<T>;
};

type SupportConversationAccessRow = {
  user_id: string | null;
};

export type SupportConversationStatus = "open" | "pending" | "resolved" | "archived";
export type SupportMessageSendStatus = "sent" | "send_failed" | "pending";
export type SupportMessageSenderRole = "user" | "admin" | "system";
export type SupportMessageDirection = "inbound" | "outbound" | "internal";
export type SupportMessageTransport = "in_app" | "email";
export type SupportAttachmentStorageStatus = "stored" | "failed" | "blocked" | "quarantined";
export type SupportChannelFilter = "in_app" | "email" | "all";

export type SupportConversationRow = {
  id: string;
  user_id: string | null;
  requester_email: string | null;
  requester_name: string | null;
  subject: string | null;
  status: SupportConversationStatus;
  channel: "in_app" | "email";
  mailbox_address: string | null;
  routing_token: string | null;
  last_message_at: string;
  unread_for_admin: number;
  unread_for_user: number;
  created_at: string;
  updated_at: string;
};

export type SupportMessageRow = {
  id: string;
  conversation_id: string;
  sender_role: SupportMessageSenderRole;
  author_user_id: string | null;
  body_text: string;
  body_html: string | null;
  email_message_id: string | null;
  client_message_id: string | null;
  send_status: SupportMessageSendStatus;
  direction: SupportMessageDirection;
  transport: SupportMessageTransport;
  mailbox_address: string | null;
  from_address: string | null;
  from_name: string | null;
  to_json: string | null;
  cc_json: string | null;
  internet_message_id: string | null;
  in_reply_to: string | null;
  references_json: string | null;
  ingest_key: string | null;
  attachment_count: number;
  provider_name: string | null;
  received_at: string | null;
  warning_flags_json: string | null;
  created_at: string;
};

export type SupportAttachmentRow = {
  id: string;
  message_id: string;
  r2_key: string;
  filename: string;
  content_type: string | null;
  size_bytes: number;
  content_id: string | null;
  disposition: string | null;
  sha256: string | null;
  storage_status: SupportAttachmentStorageStatus;
  created_at: string;
};

export type SupportQueryResult<T> = {
  data: T;
  error: string | null;
};

type ProfileRow = {
  id: string;
  email: string | null;
  display_name: string | null;
};

const SUPPORT_BODY_MAX = 40_000;
const SUPPORT_SUBJECT_MAX = 160;
const SUPPORT_CLIENT_MESSAGE_ID_MAX = 128;

const CONVERSATION_SELECT = `
  c.id,
  c.user_id,
  COALESCE(c.requester_email, p.email) AS requester_email,
  COALESCE(c.requester_name, p.display_name) AS requester_name,
  c.subject,
  c.status,
  c.channel,
  c.mailbox_address,
  c.routing_token,
  c.last_message_at,
  c.unread_for_admin,
  c.unread_for_user,
  c.created_at,
  c.updated_at
`;

const MESSAGE_SELECT = `
  id, conversation_id, sender_role, author_user_id, body_text, body_html,
  email_message_id, client_message_id, send_status, direction, transport,
  mailbox_address, from_address, from_name, to_json, cc_json,
  internet_message_id, in_reply_to, references_json, ingest_key,
  attachment_count, provider_name, received_at, warning_flags_json, created_at
`;

function normalizeOptionalText(value: string | null | undefined, maxLength: number): string | null {
  const trimmed = value?.trim() ?? "";
  if (!trimmed) return null;
  if (trimmed.length > maxLength) {
    throw new Error(`Value must be ${maxLength} characters or fewer.`);
  }
  return trimmed;
}

function normalizeBodyText(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) throw new Error("Message body is required.");
  if (trimmed.length > SUPPORT_BODY_MAX) {
    throw new Error(`Message body must be ${SUPPORT_BODY_MAX} characters or fewer.`);
  }
  return trimmed;
}

function normalizeClientMessageId(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) throw new Error("clientMessageId is required.");
  if (trimmed.length > SUPPORT_CLIENT_MESSAGE_ID_MAX) {
    throw new Error(`clientMessageId must be ${SUPPORT_CLIENT_MESSAGE_ID_MAX} characters or fewer.`);
  }
  return trimmed;
}

function isSupportConversationStatus(value: string): value is SupportConversationStatus {
  return value === "open" || value === "pending" || value === "resolved" || value === "archived";
}

export function normalizeSupportConversationStatus(value: string): SupportConversationStatus {
  if (!isSupportConversationStatus(value)) throw new Error("Invalid support conversation status.");
  return value;
}

export function createSupportRoutingToken() {
  const bytes = new Uint8Array(12);
  crypto.getRandomValues(bytes);
  return [...bytes].map((b) => b.toString(16).padStart(2, "0")).join("");
}

let supportDbResolver: (() => Promise<D1DatabaseLike | null>) | null = null;

/** Optional Next/runtime injector so this module stays Worker-safe. */
export function setSupportDbResolver(resolver: () => Promise<D1DatabaseLike | null>) {
  supportDbResolver = resolver;
}

async function resolveSupportDb(dbOverride?: D1DatabaseLike): Promise<D1DatabaseLike> {
  if (dbOverride) return dbOverride;
  const db = supportDbResolver ? await supportDbResolver() : null;
  if (!db) throw new Error("Cloudflare D1 is not available.");
  return db;
}

async function getProfileForSupportInD1(db: D1DatabaseLike, userId: string): Promise<ProfileRow | null> {
  return db
    .prepare<ProfileRow>(
      `
        SELECT id, email, display_name
        FROM profiles
        WHERE id = ?
        LIMIT 1
      `,
    )
    .bind(userId)
    .first<ProfileRow>();
}

export async function getSupportConversationInD1(
  db: D1DatabaseLike,
  conversationId: string,
): Promise<SupportConversationRow | null> {
  return db
    .prepare<SupportConversationRow>(
      `
        SELECT ${CONVERSATION_SELECT}
        FROM support_conversations c
        LEFT JOIN profiles p ON p.id = c.user_id
        WHERE c.id = ?
        LIMIT 1
      `,
    )
    .bind(conversationId)
    .first<SupportConversationRow>();
}

export async function findSupportConversationByRoutingTokenInD1(
  db: D1DatabaseLike,
  routingToken: string,
): Promise<SupportConversationRow | null> {
  const token = routingToken.trim().toLowerCase();
  if (!token) return null;
  return db
    .prepare<SupportConversationRow>(
      `
        SELECT ${CONVERSATION_SELECT}
        FROM support_conversations c
        LEFT JOIN profiles p ON p.id = c.user_id
        WHERE c.routing_token = ?
        LIMIT 1
      `,
    )
    .bind(token)
    .first<SupportConversationRow>();
}

export async function findSupportMessageByInternetMessageIdInD1(
  db: D1DatabaseLike,
  internetMessageId: string,
): Promise<SupportMessageRow | null> {
  const messageId = internetMessageId.trim();
  if (!messageId) return null;
  return db
    .prepare<SupportMessageRow>(
      `
        SELECT ${MESSAGE_SELECT}
        FROM support_messages
        WHERE internet_message_id = ? OR email_message_id = ?
        LIMIT 1
      `,
    )
    .bind(messageId, messageId)
    .first<SupportMessageRow>();
}

export async function findSupportMessageByIngestKeyInD1(
  db: D1DatabaseLike,
  ingestKey: string,
): Promise<SupportMessageRow | null> {
  return db
    .prepare<SupportMessageRow>(
      `
        SELECT ${MESSAGE_SELECT}
        FROM support_messages
        WHERE ingest_key = ?
        LIMIT 1
      `,
    )
    .bind(ingestKey)
    .first<SupportMessageRow>();
}

export async function listSupportConversations(
  input: {
    status?: SupportConversationStatus | null;
    channel?: SupportChannelFilter | null;
    unreadOnly?: boolean;
    search?: string | null;
    limit?: number;
    cursor?: string | null;
  } = {},
  dbOverride?: D1DatabaseLike,
): Promise<SupportQueryResult<SupportConversationRow[]>> {
  try {
    const db = await resolveSupportDb(dbOverride);
    const limit = Math.max(1, Math.min(input.limit ?? 50, 100));
    const status = input.status ?? null;
    const channel = input.channel && input.channel !== "all" ? input.channel : null;
    const unreadOnly = Boolean(input.unreadOnly);
    const search = input.search?.trim().toLowerCase() ?? "";
    const cursor = input.cursor?.trim() || null;

    const clauses: string[] = [];
    const binds: Array<string | number> = [];

    if (status) {
      clauses.push("c.status = ?");
      binds.push(status);
    }
    if (channel) {
      clauses.push("c.channel = ?");
      binds.push(channel);
    }
    if (unreadOnly) {
      clauses.push("c.unread_for_admin = 1");
    }
    if (search) {
      clauses.push(
        `(lower(COALESCE(c.requester_email, p.email, '')) LIKE ? OR lower(COALESCE(c.requester_name, p.display_name, '')) LIKE ? OR lower(COALESCE(c.subject, '')) LIKE ?)`,
      );
      const like = `%${search.replace(/[%_]/g, "")}%`;
      binds.push(like, like, like);
    }
    if (cursor) {
      clauses.push("c.last_message_at < ?");
      binds.push(cursor);
    }

    const where = clauses.length > 0 ? `WHERE ${clauses.join(" AND ")}` : "";
    const rows = await db
      .prepare<SupportConversationRow>(
        `
          SELECT ${CONVERSATION_SELECT}
          FROM support_conversations c
          LEFT JOIN profiles p ON p.id = c.user_id
          ${where}
          ORDER BY c.last_message_at DESC
          LIMIT ?
        `,
      )
      .bind(...binds, limit)
      .all<SupportConversationRow>();
    return { data: rows.results ?? [], error: null };
  } catch {
    return { data: [], error: "Support conversations could not be read." };
  }
}

export async function canAccessSupportConversationInD1({
  conversationId,
  database,
  userId,
}: {
  conversationId: string;
  database: D1DatabaseLike;
  userId: string;
}) {
  const row = await database
    .prepare<SupportConversationAccessRow>(
      `SELECT user_id
       FROM support_conversations
       WHERE id = ?
       LIMIT 1`,
    )
    .bind(conversationId)
    .first<SupportConversationAccessRow>();

  return Boolean(row?.user_id && row.user_id === userId);
}

export async function listSupportMessages(
  conversationId: string,
  optionsOrDbOverride?: D1DatabaseLike | { limit?: number; dbOverride?: D1DatabaseLike },
): Promise<SupportQueryResult<SupportMessageRow[]>> {
  const isOptionsObject = (
    value: unknown,
  ): value is { limit?: number; dbOverride?: D1DatabaseLike } =>
    typeof value === "object" &&
    value !== null &&
    !("prepare" in value) &&
    ("limit" in value || "dbOverride" in value);

  const limit = isOptionsObject(optionsOrDbOverride) ? (optionsOrDbOverride.limit ?? 200) : 200;
  const dbOverride = isOptionsObject(optionsOrDbOverride)
    ? optionsOrDbOverride.dbOverride
    : (optionsOrDbOverride as D1DatabaseLike | undefined);

  try {
    const db = await resolveSupportDb(dbOverride);
    const rows = await db
      .prepare<SupportMessageRow>(
        `
          SELECT ${MESSAGE_SELECT}
          FROM support_messages
          WHERE conversation_id = ?
          ORDER BY created_at DESC
          LIMIT ?
        `,
      )
      .bind(conversationId, limit)
      .all<SupportMessageRow>();
    return { data: (rows.results ?? []).reverse(), error: null };
  } catch {
    return { data: [], error: "Support messages could not be read." };
  }
}

export async function getSupportMessageByClientIdInD1(
  db: D1DatabaseLike,
  conversationId: string,
  clientMessageId: string,
): Promise<SupportMessageRow | null> {
  return db
    .prepare<SupportMessageRow>(
      `
        SELECT ${MESSAGE_SELECT}
        FROM support_messages
        WHERE conversation_id = ? AND client_message_id = ?
        LIMIT 1
      `,
    )
    .bind(conversationId, clientMessageId)
    .first<SupportMessageRow>();
}

export async function findSupportMessageByClientMessageIdInD1(
  db: D1DatabaseLike,
  clientMessageId: string,
): Promise<SupportMessageRow | null> {
  return db
    .prepare<SupportMessageRow>(
      `
        SELECT ${MESSAGE_SELECT}
        FROM support_messages
        WHERE client_message_id = ?
        ORDER BY created_at DESC
        LIMIT 1
      `,
    )
    .bind(clientMessageId)
    .first<SupportMessageRow>();
}

export async function getSupportMessageByIdInD1(
  db: D1DatabaseLike,
  messageId: string,
): Promise<SupportMessageRow | null> {
  return db
    .prepare<SupportMessageRow>(
      `
        SELECT ${MESSAGE_SELECT}
        FROM support_messages
        WHERE id = ?
        LIMIT 1
      `,
    )
    .bind(messageId)
    .first<SupportMessageRow>();
}

export async function listSupportAttachmentsInD1(
  db: D1DatabaseLike,
  messageId: string,
): Promise<SupportAttachmentRow[]> {
  const rows = await db
    .prepare<SupportAttachmentRow>(
      `
        SELECT id, message_id, r2_key, filename, content_type, size_bytes, content_id,
               disposition, sha256, storage_status, created_at
        FROM support_message_attachments
        WHERE message_id = ?
        ORDER BY created_at ASC
      `,
    )
    .bind(messageId)
    .all<SupportAttachmentRow>();
  return rows.results ?? [];
}

export async function listSupportAttachmentsForConversationInD1(
  db: D1DatabaseLike,
  conversationId: string,
): Promise<SupportAttachmentRow[]> {
  const rows = await db
    .prepare<SupportAttachmentRow>(
      `
        SELECT a.id, a.message_id, a.r2_key, a.filename, a.content_type, a.size_bytes, a.content_id,
               a.disposition, a.sha256, a.storage_status, a.created_at
        FROM support_message_attachments a
        INNER JOIN support_messages m ON m.id = a.message_id
        WHERE m.conversation_id = ?
        ORDER BY a.created_at ASC
      `,
    )
    .bind(conversationId)
    .all<SupportAttachmentRow>();
  return rows.results ?? [];
}

export async function getSupportAttachmentForAdminInD1(
  db: D1DatabaseLike,
  attachmentId: string,
): Promise<(SupportAttachmentRow & { conversation_id: string }) | null> {
  return db
    .prepare<SupportAttachmentRow & { conversation_id: string }>(
      `
        SELECT a.id, a.message_id, a.r2_key, a.filename, a.content_type, a.size_bytes, a.content_id,
               a.disposition, a.sha256, a.storage_status, a.created_at, m.conversation_id
        FROM support_message_attachments a
        INNER JOIN support_messages m ON m.id = a.message_id
        WHERE a.id = ?
        LIMIT 1
      `,
    )
    .bind(attachmentId)
    .first<SupportAttachmentRow & { conversation_id: string }>();
}

export async function createSupportConversation(
  input: {
    userId: string;
    subject?: string | null;
    initialBody: string;
    clientMessageId: string;
    senderRole?: SupportMessageSenderRole;
    authorUserId?: string | null;
  },
  dbOverride?: D1DatabaseLike,
): Promise<SupportQueryResult<{ conversation: SupportConversationRow; message: SupportMessageRow } | null>> {
  try {
    const db = await resolveSupportDb(dbOverride);
    const now = new Date().toISOString();
    const conversationId = crypto.randomUUID();
    const messageId = crypto.randomUUID();
    const subject = normalizeOptionalText(input.subject, SUPPORT_SUBJECT_MAX) ?? "Support request";
    const bodyText = normalizeBodyText(input.initialBody);
    const clientMessageId = normalizeClientMessageId(input.clientMessageId);
    const senderRole = input.senderRole ?? "user";
    const authorUserId = input.authorUserId ?? input.userId;
    const profile = await getProfileForSupportInD1(db, input.userId);
    const routingToken = createSupportRoutingToken();

    await db
      .prepare(
        `
          INSERT INTO support_conversations (
            id, user_id, requester_email, requester_name, subject, status, channel,
            mailbox_address, routing_token, last_message_at,
            unread_for_admin, unread_for_user, created_at, updated_at
          )
          VALUES (?, ?, ?, ?, ?, 'open', 'in_app', NULL, ?, ?, ?, ?, ?, ?)
        `,
      )
      .bind(
        conversationId,
        input.userId,
        profile?.email?.trim().toLowerCase() ?? null,
        profile?.display_name?.trim() || null,
        subject,
        routingToken,
        now,
        senderRole === "admin" ? 0 : 1,
        senderRole === "admin" ? 1 : 0,
        now,
        now,
      )
      .run();

    await db
      .prepare(
        `
          INSERT INTO support_messages (
            id, conversation_id, sender_role, author_user_id, body_text,
            body_html, email_message_id, client_message_id, send_status,
            direction, transport, attachment_count, created_at
          )
          VALUES (?, ?, ?, ?, ?, NULL, NULL, ?, 'sent', ?, 'in_app', 0, ?)
        `,
      )
      .bind(
        messageId,
        conversationId,
        senderRole,
        authorUserId,
        bodyText,
        clientMessageId,
        senderRole === "admin" ? "outbound" : senderRole === "user" ? "inbound" : "internal",
        now,
      )
      .run();

    const conversation = await getSupportConversationInD1(db, conversationId);
    const message = await getSupportMessageByClientIdInD1(db, conversationId, clientMessageId);
    if (!conversation || !message) return { data: null, error: "Support conversation could not be created." };

    return { data: { conversation, message }, error: null };
  } catch {
    return { data: null, error: "Support conversation could not be created." };
  }
}

export async function createExternalSupportConversationInD1(
  db: D1DatabaseLike,
  input: {
    requesterEmail: string;
    requesterName?: string | null;
    subject?: string | null;
    mailboxAddress?: string | null;
    channel?: "in_app" | "email";
  },
): Promise<SupportConversationRow> {
  const now = new Date().toISOString();
  const conversationId = crypto.randomUUID();
  const routingToken = createSupportRoutingToken();
  const subject = normalizeOptionalText(input.subject, SUPPORT_SUBJECT_MAX) ?? "Support request";
  const mailbox = (input.mailboxAddress ?? DEFAULT_SUPPORT_MAILBOX).toLowerCase();

  await db
    .prepare(
      `
        INSERT INTO support_conversations (
          id, user_id, requester_email, requester_name, subject, status, channel,
          mailbox_address, routing_token, last_message_at,
          unread_for_admin, unread_for_user, created_at, updated_at
        )
        VALUES (?, NULL, ?, ?, ?, 'open', ?, ?, ?, ?, 1, 0, ?, ?)
      `,
    )
    .bind(
      conversationId,
      input.requesterEmail.toLowerCase(),
      input.requesterName?.trim() || null,
      subject,
      input.channel ?? "email",
      mailbox,
      routingToken,
      now,
      now,
      now,
    )
    .run();

  const conversation = await getSupportConversationInD1(db, conversationId);
  if (!conversation) throw new Error("External support conversation insert failed.");
  return conversation;
}

export async function insertSupportMessageIfNewInD1(
  db: D1DatabaseLike,
  input: {
    conversationId: string;
    senderRole: SupportMessageSenderRole;
    authorUserId: string | null;
    bodyText: string;
    clientMessageId: string;
    sendStatus: SupportMessageSendStatus;
    direction?: SupportMessageDirection;
    transport?: SupportMessageTransport;
    mailboxAddress?: string | null;
    fromAddress?: string | null;
    fromName?: string | null;
    toJson?: string | null;
    emailMessageId?: string | null;
    internetMessageId?: string | null;
    inReplyTo?: string | null;
    referencesJson?: string | null;
    ingestKey?: string | null;
    attachmentCount?: number;
    providerName?: string | null;
    receivedAt?: string | null;
    warningFlagsJson?: string | null;
    bodyHtml?: string | null;
  },
): Promise<{ message: SupportMessageRow; inserted: boolean }> {
  const bodyText = normalizeBodyText(input.bodyText);
  const clientMessageId = normalizeClientMessageId(input.clientMessageId);
  const existing = await getSupportMessageByClientIdInD1(db, input.conversationId, clientMessageId);
  if (existing) return { message: existing, inserted: false };

  if (input.ingestKey) {
    const byIngest = await findSupportMessageByIngestKeyInD1(db, input.ingestKey);
    if (byIngest) return { message: byIngest, inserted: false };
  }

  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  const direction =
    input.direction ??
    (input.senderRole === "admin" ? "outbound" : input.senderRole === "user" ? "inbound" : "internal");
  const transport = input.transport ?? "in_app";

  await db
    .prepare(
      `
        INSERT OR IGNORE INTO support_messages (
          id, conversation_id, sender_role, author_user_id, body_text,
          body_html, email_message_id, client_message_id, send_status,
          direction, transport, mailbox_address, from_address, from_name, to_json,
          internet_message_id, in_reply_to, references_json, ingest_key,
          attachment_count, provider_name, received_at, warning_flags_json, created_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
    )
    .bind(
      id,
      input.conversationId,
      input.senderRole,
      input.authorUserId,
      bodyText,
      input.bodyHtml ?? null,
      input.emailMessageId ?? null,
      clientMessageId,
      input.sendStatus,
      direction,
      transport,
      input.mailboxAddress ?? null,
      input.fromAddress ?? null,
      input.fromName ?? null,
      input.toJson ?? null,
      input.internetMessageId ?? null,
      input.inReplyTo ?? null,
      input.referencesJson ?? null,
      input.ingestKey ?? null,
      input.attachmentCount ?? 0,
      input.providerName ?? null,
      input.receivedAt ?? null,
      input.warningFlagsJson ?? null,
      now,
    )
    .run();

  const row =
    (input.ingestKey ? await findSupportMessageByIngestKeyInD1(db, input.ingestKey) : null) ??
    (await getSupportMessageByClientIdInD1(db, input.conversationId, clientMessageId));
  if (!row) throw new Error("Support message insert failed.");

  if (row.id === id) {
    await db
      .prepare(
        `
          UPDATE support_conversations
          SET last_message_at = ?, updated_at = ?,
              unread_for_admin = CASE WHEN ? = 'admin' THEN unread_for_admin ELSE 1 END,
              unread_for_user = CASE WHEN ? = 'admin' THEN 1 ELSE unread_for_user END
          WHERE id = ?
        `,
      )
      .bind(now, now, input.senderRole, input.senderRole, input.conversationId)
      .run();
  }

  return { message: row, inserted: row.id === id };
}

export async function insertSupportAttachmentInD1(
  db: D1DatabaseLike,
  input: {
    messageId: string;
    r2Key: string;
    filename: string;
    contentType: string | null;
    sizeBytes: number;
    contentId?: string | null;
    disposition?: string | null;
    sha256?: string | null;
    storageStatus: SupportAttachmentStorageStatus;
  },
): Promise<SupportAttachmentRow> {
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  await db
    .prepare(
      `
        INSERT INTO support_message_attachments (
          id, message_id, r2_key, filename, content_type, size_bytes,
          content_id, disposition, sha256, storage_status, created_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
    )
    .bind(
      id,
      input.messageId,
      input.r2Key,
      input.filename,
      input.contentType,
      input.sizeBytes,
      input.contentId ?? null,
      input.disposition ?? null,
      input.sha256 ?? null,
      input.storageStatus,
      now,
    )
    .run();

  const row = await db
    .prepare<SupportAttachmentRow>(
      `
        SELECT id, message_id, r2_key, filename, content_type, size_bytes, content_id,
               disposition, sha256, storage_status, created_at
        FROM support_message_attachments
        WHERE id = ?
        LIMIT 1
      `,
    )
    .bind(id)
    .first<SupportAttachmentRow>();
  if (!row) throw new Error("Support attachment insert failed.");
  return row;
}

export async function updateSupportMessageAttachmentCountInD1(
  db: D1DatabaseLike,
  messageId: string,
  attachmentCount: number,
  warningFlagsJson?: string | null,
) {
  await db
    .prepare(
      `
        UPDATE support_messages
        SET attachment_count = ?, warning_flags_json = COALESCE(?, warning_flags_json)
        WHERE id = ?
      `,
    )
    .bind(attachmentCount, warningFlagsJson ?? null, messageId)
    .run();
}

export async function markSupportConversationReadForAdminInD1(
  db: D1DatabaseLike,
  conversationId: string,
): Promise<SupportConversationRow | null> {
  const now = new Date().toISOString();
  await db
    .prepare(
      `
        UPDATE support_conversations
        SET unread_for_admin = 0, updated_at = ?
        WHERE id = ?
      `,
    )
    .bind(now, conversationId)
    .run();
  return getSupportConversationInD1(db, conversationId);
}

export async function markSupportMessageSendStatusInD1(
  db: D1DatabaseLike,
  input: { messageId: string; sendStatus: SupportMessageSendStatus; emailMessageId?: string | null },
): Promise<SupportMessageRow | null> {
  const result = await db
    .prepare(
      `
        UPDATE support_messages
        SET send_status = ?, email_message_id = COALESCE(?, email_message_id),
            internet_message_id = COALESCE(?, internet_message_id),
            provider_name = COALESCE(provider_name, 'cloudflare-email')
        WHERE id = ?
      `,
    )
    .bind(input.sendStatus, input.emailMessageId ?? null, input.emailMessageId ?? null, input.messageId)
    .run();

  if ((result.meta?.changes ?? 0) !== 1) return null;
  return getSupportMessageByIdInD1(db, input.messageId);
}

export async function claimFailedSupportMessageRetryInD1(
  db: D1DatabaseLike,
  messageId: string,
): Promise<SupportMessageRow | null> {
  const result = await db
    .prepare(
      `
        UPDATE support_messages
        SET send_status = 'pending'
        WHERE id = ? AND send_status = 'send_failed'
      `,
    )
    .bind(messageId)
    .run();

  if ((result.meta?.changes ?? 0) !== 1) return null;
  return getSupportMessageByIdInD1(db, messageId);
}

export async function updateSupportConversationStatus(
  input: { conversationId: string; status: SupportConversationStatus },
  dbOverride?: D1DatabaseLike,
): Promise<SupportQueryResult<SupportConversationRow | null>> {
  try {
    const db = await resolveSupportDb(dbOverride);
    const status = normalizeSupportConversationStatus(input.status);
    const now = new Date().toISOString();
    await db
      .prepare(
        `
          UPDATE support_conversations
          SET status = ?, updated_at = ?
          WHERE id = ?
        `,
      )
      .bind(status, now, input.conversationId)
      .run();

    return { data: await getSupportConversationInD1(db, input.conversationId), error: null };
  } catch {
    return { data: null, error: "Support conversation status could not be updated." };
  }
}

export async function listSupportDataForPrivacyRequest(
  requesterUserId: string,
  dbOverride?: D1DatabaseLike,
): Promise<SupportQueryResult<{ conversations: SupportConversationRow[]; messages: SupportMessageRow[] }>> {
  try {
    const db = await resolveSupportDb(dbOverride);
    const conversations = await db
      .prepare<SupportConversationRow>(
        `
          SELECT ${CONVERSATION_SELECT}
          FROM support_conversations c
          LEFT JOIN profiles p ON p.id = c.user_id
          WHERE c.user_id = ?
          ORDER BY c.created_at DESC
        `,
      )
      .bind(requesterUserId)
      .all<SupportConversationRow>();
    const messages = await db
      .prepare<SupportMessageRow>(
        `
          SELECT m.id, m.conversation_id, m.sender_role, m.author_user_id, m.body_text, m.body_html,
                 m.email_message_id, m.client_message_id, m.send_status, m.direction, m.transport,
                 m.mailbox_address, m.from_address, m.from_name, m.to_json, m.cc_json,
                 m.internet_message_id, m.in_reply_to, m.references_json, m.ingest_key,
                 m.attachment_count, m.provider_name, m.received_at, m.warning_flags_json, m.created_at
          FROM support_messages m
          INNER JOIN support_conversations c ON c.id = m.conversation_id
          WHERE c.user_id = ?
          ORDER BY m.created_at ASC
        `,
      )
      .bind(requesterUserId)
      .all<SupportMessageRow>();

    return {
      data: {
        conversations: conversations.results ?? [],
        messages: messages.results ?? [],
      },
      error: null,
    };
  } catch {
    return { data: { conversations: [], messages: [] }, error: "Support data could not be read for privacy request." };
  }
}

export async function eraseSupportDataForPrivacyRequest(
  requesterUserId: string,
  dbOverride?: D1DatabaseLike,
): Promise<SupportQueryResult<{ conversationsUpdated: number; messagesUpdated: number }>> {
  try {
    const db = await resolveSupportDb(dbOverride);
    const now = new Date().toISOString();
    const messagesResult = await db
      .prepare(
        `
          UPDATE support_messages
          SET body_text = '[erased for privacy request]',
              body_html = NULL,
              email_message_id = NULL,
              client_message_id = NULL,
              from_address = NULL,
              from_name = NULL,
              to_json = NULL,
              internet_message_id = NULL,
              ingest_key = NULL
          WHERE conversation_id IN (
            SELECT id FROM support_conversations WHERE user_id = ?
          )
        `,
      )
      .bind(requesterUserId)
      .run();
    const conversationsResult = await db
      .prepare(
        `
          UPDATE support_conversations
          SET subject = '[erased for privacy request]',
              requester_email = NULL,
              requester_name = NULL,
              status = 'archived',
              unread_for_admin = 0,
              unread_for_user = 0,
              updated_at = ?
          WHERE user_id = ?
        `,
      )
      .bind(now, requesterUserId)
      .run();

    return {
      data: {
        conversationsUpdated: conversationsResult.meta?.changes ?? 0,
        messagesUpdated: messagesResult.meta?.changes ?? 0,
      },
      error: null,
    };
  } catch {
    return {
      data: { conversationsUpdated: 0, messagesUpdated: 0 },
      error: "Support data could not be erased for privacy request.",
    };
  }
}
