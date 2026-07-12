import "server-only";

import { getCloudflareD1Database, type D1DatabaseLike } from "@/lib/cloudflare/d1";

type SupportConversationAccessRow = {
  user_id: string;
};

export type SupportConversationStatus = "open" | "pending" | "resolved" | "archived";
export type SupportMessageSendStatus = "sent" | "send_failed" | "pending";
export type SupportMessageSenderRole = "user" | "admin" | "system";

export type SupportConversationRow = {
  id: string;
  user_id: string;
  requester_email: string | null;
  requester_name: string | null;
  subject: string | null;
  status: SupportConversationStatus;
  channel: "in_app" | "email";
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

const SUPPORT_BODY_MAX = 8_000;
const SUPPORT_SUBJECT_MAX = 160;
const SUPPORT_CLIENT_MESSAGE_ID_MAX = 128;

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

async function resolveSupportDb(dbOverride?: D1DatabaseLike): Promise<D1DatabaseLike> {
  const db = dbOverride ?? (await getCloudflareD1Database());
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
        SELECT
          c.id,
          c.user_id,
          p.email AS requester_email,
          p.display_name AS requester_name,
          c.subject,
          c.status,
          c.channel,
          c.last_message_at,
          c.unread_for_admin,
          c.unread_for_user,
          c.created_at,
          c.updated_at
        FROM support_conversations c
        LEFT JOIN profiles p ON p.id = c.user_id
        WHERE c.id = ?
        LIMIT 1
      `,
    )
    .bind(conversationId)
    .first<SupportConversationRow>();
}

export async function listSupportConversations(
  input: { status?: SupportConversationStatus | null; limit?: number } = {},
  dbOverride?: D1DatabaseLike,
): Promise<SupportQueryResult<SupportConversationRow[]>> {
  try {
    const db = await resolveSupportDb(dbOverride);
    const limit = Math.max(1, Math.min(input.limit ?? 50, 100));
    const status = input.status ?? null;
    const statement = db.prepare<SupportConversationRow>(
      `
        SELECT
          c.id,
          c.user_id,
          p.email AS requester_email,
          p.display_name AS requester_name,
          c.subject,
          c.status,
          c.channel,
          c.last_message_at,
          c.unread_for_admin,
          c.unread_for_user,
          c.created_at,
          c.updated_at
        FROM support_conversations c
        LEFT JOIN profiles p ON p.id = c.user_id
        ${status ? "WHERE c.status = ?" : ""}
        ORDER BY c.last_message_at DESC
        LIMIT ?
      `,
    );
    const rows = status
      ? await statement.bind(status, limit).all<SupportConversationRow>()
      : await statement.bind(limit).all<SupportConversationRow>();
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

  return row?.user_id === userId;
}

export async function listSupportMessages(
  conversationId: string,
  optionsOrDbOverride?: D1DatabaseLike | { limit?: number; dbOverride?: D1DatabaseLike },
): Promise<SupportQueryResult<SupportMessageRow[]>> {
  // Support both the old positional signature (dbOverride) and the new options
  // object signature for backward compatibility.
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
    // Cap messages to prevent unbounded fetches on long threads. The most
    // recent `limit` messages are returned (ordered chronologically).
    const rows = await db
      .prepare<SupportMessageRow>(
        `
          SELECT id, conversation_id, sender_role, author_user_id, body_text, body_html,
                 email_message_id, client_message_id, send_status, created_at
          FROM support_messages
          WHERE conversation_id = ?
          ORDER BY created_at DESC
          LIMIT ?
        `,
      )
      .bind(conversationId, limit)
      .all<SupportMessageRow>();
    // Reverse to chronological order for display.
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
        SELECT id, conversation_id, sender_role, author_user_id, body_text, body_html,
               email_message_id, client_message_id, send_status, created_at
        FROM support_messages
        WHERE conversation_id = ? AND client_message_id = ?
        LIMIT 1
      `,
    )
    .bind(conversationId, clientMessageId)
    .first<SupportMessageRow>();
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

    await db
      .prepare(
        `
          INSERT INTO support_conversations (
            id, user_id, subject, status, channel, last_message_at,
            unread_for_admin, unread_for_user, created_at, updated_at
          )
          VALUES (?, ?, ?, 'open', 'in_app', ?, ?, ?, ?, ?)
        `,
      )
      .bind(conversationId, input.userId, subject, now, senderRole === "admin" ? 0 : 1, senderRole === "admin" ? 1 : 0, now, now)
      .run();

    await db
      .prepare(
        `
          INSERT INTO support_messages (
            id, conversation_id, sender_role, author_user_id, body_text,
            body_html, email_message_id, client_message_id, send_status, created_at
          )
          VALUES (?, ?, ?, ?, ?, NULL, NULL, ?, 'sent', ?)
        `,
      )
      .bind(messageId, conversationId, senderRole, authorUserId, bodyText, clientMessageId, now)
      .run();

    const conversation = await getSupportConversationInD1(db, conversationId);
    const message = await getSupportMessageByClientIdInD1(db, conversationId, clientMessageId);
    if (!conversation || !message) return { data: null, error: "Support conversation could not be created." };

    return {
      data: {
        conversation: {
          ...conversation,
          requester_email: conversation.requester_email ?? profile?.email ?? null,
          requester_name: conversation.requester_name ?? profile?.display_name ?? null,
        },
        message,
      },
      error: null,
    };
  } catch {
    return { data: null, error: "Support conversation could not be created." };
  }
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
  },
): Promise<{ message: SupportMessageRow; inserted: boolean }> {
  const bodyText = normalizeBodyText(input.bodyText);
  const clientMessageId = normalizeClientMessageId(input.clientMessageId);
  const existing = await getSupportMessageByClientIdInD1(db, input.conversationId, clientMessageId);
  if (existing) return { message: existing, inserted: false };

  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  await db
    .prepare(
      `
        INSERT OR IGNORE INTO support_messages (
          id, conversation_id, sender_role, author_user_id, body_text,
          body_html, email_message_id, client_message_id, send_status, created_at
        )
        VALUES (?, ?, ?, ?, ?, NULL, NULL, ?, ?, ?)
      `,
    )
    .bind(id, input.conversationId, input.senderRole, input.authorUserId, bodyText, clientMessageId, input.sendStatus, now)
    .run();

  const row = await getSupportMessageByClientIdInD1(db, input.conversationId, clientMessageId);
  if (!row) throw new Error("Support message insert failed.");

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

  return { message: row, inserted: true };
}

export async function markSupportMessageSendStatusInD1(
  db: D1DatabaseLike,
  input: { messageId: string; sendStatus: SupportMessageSendStatus; emailMessageId?: string | null },
): Promise<SupportMessageRow | null> {
  const result = await db
    .prepare(
      `
        UPDATE support_messages
        SET send_status = ?, email_message_id = ?
        WHERE id = ?
      `,
    )
    .bind(input.sendStatus, input.emailMessageId ?? null, input.messageId)
    .run();

  if ((result.meta?.changes ?? 0) !== 1) return null;

  return db
    .prepare<SupportMessageRow>(
      `
        SELECT id, conversation_id, sender_role, author_user_id, body_text, body_html,
               email_message_id, client_message_id, send_status, created_at
        FROM support_messages
        WHERE id = ?
        LIMIT 1
      `,
    )
    .bind(input.messageId)
    .first<SupportMessageRow>();
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

  return db
    .prepare<SupportMessageRow>(
      `
        SELECT id, conversation_id, sender_role, author_user_id, body_text, body_html,
               email_message_id, client_message_id, send_status, created_at
        FROM support_messages
        WHERE id = ?
        LIMIT 1
      `,
    )
    .bind(messageId)
    .first<SupportMessageRow>();
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
          SELECT
            c.id,
            c.user_id,
            p.email AS requester_email,
            p.display_name AS requester_name,
            c.subject,
            c.status,
            c.channel,
            c.last_message_at,
            c.unread_for_admin,
            c.unread_for_user,
            c.created_at,
            c.updated_at
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
                 m.email_message_id, m.client_message_id, m.send_status, m.created_at
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
              client_message_id = NULL
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
