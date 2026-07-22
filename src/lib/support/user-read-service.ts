import "server-only";

import type { CurrentUserContext } from "@/lib/auth/session";
import { isPlatformAdmin } from "@/lib/auth/roles";
import { runRequiredD1Batch } from "@/lib/cloudflare/d1-batch";
import type { D1DatabaseLike, D1Value } from "@/lib/cloudflare/d1";
import { fanoutSupportInboxInvalidation } from "@/lib/cloudflare/support-inbox-fanout";
import { isUuid } from "@/lib/ids";
import { requireOpenSupportPrivacyFence } from "@/lib/support/privacy-fence";
import { getSupportRuntimeBindings } from "@/lib/support/runtime";

type SupportCursor = { id: string; timestamp: string };

type UserConversationRow = {
  id: string;
  last_message_at: string;
  last_preview: string | null;
  status: "open" | "pending" | "resolved" | "archived";
  subject: string | null;
  unread_for_user: number;
};

type UserMessageRow = {
  app_release: string | null;
  body_text: string;
  browser_family: string | null;
  created_at: string;
  diagnostics_shared: number | null;
  estimate_id: string | null;
  id: string;
  os_family: string | null;
  project_id: string | null;
  route_template: string | null;
  sender_role: "user" | "admin" | "system";
  timezone: string | null;
  viewport_height: number | null;
  viewport_width: number | null;
  workspace_id: string | null;
};

export type UserSupportConversationSummary = {
  id: string;
  lastMessageAt: string;
  lastPreview: string;
  stableReference: string;
  status: "open" | "pending" | "resolved" | "archived";
  subject: string;
  unread: boolean;
};

export type UserSupportMessage = {
  attachments: Array<{
    contentType: "image/webp";
    id: string;
    sizeBytes: number;
    url: string;
  }>;
  bodyText: string;
  context: {
    appRelease: string | null;
    browserFamily: string | null;
    diagnosticsShared: boolean;
    estimateId: string | null;
    osFamily: string | null;
    projectId: string | null;
    routeTemplate: string;
    timezone: string | null;
    viewportHeight: number | null;
    viewportWidth: number | null;
    workspaceId: string | null;
  } | null;
  createdAt: string;
  id: string;
  senderRole: "user" | "admin" | "system";
};

export class SupportReadError extends Error {
  constructor(message: string, readonly status: 400 | 404 | 409 | 503) {
    super(message);
  }
}

function parseLimit(value: string | null | undefined, fallback: number) {
  if (!value) return fallback;
  if (!/^\d{1,3}$/u.test(value)) throw new SupportReadError("Invalid support page limit.", 400);
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > 100) {
    throw new SupportReadError("Support page limit must be between 1 and 100.", 400);
  }
  return parsed;
}

function encodeCursor(cursor: SupportCursor) {
  const json = JSON.stringify(cursor);
  const binary = new TextEncoder().encode(json);
  let value = "";
  for (const byte of binary) value += String.fromCharCode(byte);
  return btoa(value).replace(/\+/gu, "-").replace(/\//gu, "_").replace(/=+$/u, "");
}

function decodeCursor(value: string | null | undefined) {
  if (!value) return null;
  try {
    const normalized = value.replace(/-/gu, "+").replace(/_/gu, "/");
    const padded = normalized.padEnd(normalized.length + ((4 - normalized.length % 4) % 4), "=");
    const binary = atob(padded);
    const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
    const parsed = JSON.parse(new TextDecoder().decode(bytes)) as SupportCursor;
    if (!parsed || !isUuid(parsed.id) || typeof parsed.timestamp !== "string" || !Number.isFinite(Date.parse(parsed.timestamp))) {
      throw new Error("invalid cursor");
    }
    return parsed;
  } catch {
    throw new SupportReadError("Invalid support cursor.", 400);
  }
}

function hiddenLegacyFilter(conversationAlias: string) {
  return `NOT EXISTS (
    SELECT 1
    FROM support_legacy_feedback_imports hidden_legacy
    WHERE hidden_legacy.conversation_id = ${conversationAlias}.id
      AND hidden_legacy.user_visible_at IS NULL
  )`;
}

export async function listUserSupportConversations(input: {
  cursor?: string | null;
  database: D1DatabaseLike;
  limit?: string | null;
  userId: string;
}) {
  const cursor = decodeCursor(input.cursor);
  const limit = parseLimit(input.limit, 25);
  const cursorSql = cursor ? "AND (conversation.last_message_at < ? OR (conversation.last_message_at = ? AND conversation.id < ?))" : "";
  const values: D1Value[] = [input.userId];
  if (cursor) values.push(cursor.timestamp, cursor.timestamp, cursor.id);
  values.push(limit + 1);

  const rows = await input.database
    .prepare<UserConversationRow>(
      `SELECT conversation.id, conversation.subject, conversation.status,
              conversation.last_message_at, conversation.unread_for_user,
              (
                SELECT substr(message.body_text, 1, 240)
                FROM support_messages message
                WHERE message.conversation_id = conversation.id
                ORDER BY message.created_at DESC, message.id DESC
                LIMIT 1
              ) AS last_preview
       FROM support_conversations conversation
       WHERE conversation.user_id = ?
         AND conversation.channel = 'in_app'
         AND ${hiddenLegacyFilter("conversation")}
         ${cursorSql}
       ORDER BY conversation.last_message_at DESC, conversation.id DESC
       LIMIT ?`,
    )
    .bind(...values)
    .all<UserConversationRow>();
  if (rows.success === false) throw new SupportReadError("Support requests could not be read.", 503);
  const allRows = rows.results ?? [];
  const page = allRows.slice(0, limit);
  const last = page.at(-1);

  const unreadRow = await input.database
    .prepare<{ total: number }>(
      `SELECT COUNT(*) AS total
       FROM support_conversations conversation
       WHERE conversation.user_id = ?
         AND conversation.channel = 'in_app'
         AND conversation.unread_for_user = 1
         AND ${hiddenLegacyFilter("conversation")}`,
    )
    .bind(input.userId)
    .first<{ total: number }>();

  return {
    conversations: page.map((row): UserSupportConversationSummary => ({
      id: row.id,
      lastMessageAt: row.last_message_at,
      lastPreview: row.last_preview?.trim() ?? "",
      stableReference: row.id,
      status: row.status,
      subject: row.subject?.trim() || "Support request",
      unread: row.unread_for_user === 1,
    })),
    nextCursor: allRows.length > page.length && last
      ? encodeCursor({ id: last.id, timestamp: last.last_message_at })
      : null,
    totalUnread: Number(unreadRow?.total ?? 0),
  };
}

async function requireVisibleOwnedConversation(
  database: D1DatabaseLike,
  conversationId: string,
  userId: string,
) {
  if (!isUuid(conversationId)) throw new SupportReadError("Support conversation not found.", 404);
  const row = await database
    .prepare<{ id: string }>(
      `SELECT conversation.id
       FROM support_conversations conversation
       WHERE conversation.id = ?
         AND conversation.user_id = ?
         AND conversation.channel = 'in_app'
         AND ${hiddenLegacyFilter("conversation")}
       LIMIT 1`,
    )
    .bind(conversationId, userId)
    .first<{ id: string }>();
  if (!row) throw new SupportReadError("Support conversation not found.", 404);
}

export async function listUserSupportMessages(input: {
  conversationId: string;
  cursor?: string | null;
  database: D1DatabaseLike;
  limit?: string | null;
  userId: string;
}) {
  await requireVisibleOwnedConversation(input.database, input.conversationId, input.userId);
  const cursor = decodeCursor(input.cursor);
  const limit = parseLimit(input.limit, 50);
  const cursorSql = cursor ? "AND (message.created_at < ? OR (message.created_at = ? AND message.id < ?))" : "";
  const values: D1Value[] = [input.conversationId];
  if (cursor) values.push(cursor.timestamp, cursor.timestamp, cursor.id);
  values.push(limit + 1);
  const result = await input.database
    .prepare<UserMessageRow>(
      `SELECT message.id, message.sender_role, message.body_text, message.created_at,
              context.workspace_id, context.project_id, context.estimate_id,
              context.route_template, context.app_release, context.viewport_width,
              context.viewport_height, context.timezone, context.browser_family,
              context.os_family, context.diagnostics_shared
       FROM support_messages message
       LEFT JOIN support_message_context context ON context.message_id = message.id
       WHERE message.conversation_id = ?
         ${cursorSql}
       ORDER BY message.created_at DESC, message.id DESC
       LIMIT ?`,
    )
    .bind(...values)
    .all<UserMessageRow>();
  if (result.success === false) throw new SupportReadError("Support messages could not be read.", 503);
  const allRows = result.results ?? [];
  const descendingPage = allRows.slice(0, limit);
  const oldest = descendingPage.at(-1);
  const messageIds = descendingPage.map((row) => row.id);
  const attachmentsByMessage = new Map<string, UserSupportMessage["attachments"]>();
  if (messageIds.length > 0) {
    const placeholders = messageIds.map(() => "?").join(", ");
    const attachments = await input.database
      .prepare<{ id: string; message_id: string; size_bytes: number }>(
        `SELECT id, message_id, size_bytes
         FROM support_message_attachments
         WHERE message_id IN (${placeholders})
           AND content_type = 'image/webp'
           AND storage_status = 'stored'
         ORDER BY created_at ASC, id ASC`,
      )
      .bind(...messageIds)
      .all<{ id: string; message_id: string; size_bytes: number }>();
    if (attachments.success === false) throw new SupportReadError("Support attachments could not be read.", 503);
    for (const attachment of attachments.results ?? []) {
      const valuesForMessage = attachmentsByMessage.get(attachment.message_id) ?? [];
      valuesForMessage.push({
        contentType: "image/webp",
        id: attachment.id,
        sizeBytes: Number(attachment.size_bytes),
        url: `/api/support/attachments/${encodeURIComponent(attachment.id)}`,
      });
      attachmentsByMessage.set(attachment.message_id, valuesForMessage);
    }
  }

  const messages = descendingPage.reverse().map((row): UserSupportMessage => ({
    attachments: attachmentsByMessage.get(row.id) ?? [],
    bodyText: row.body_text,
    context: row.route_template
      ? {
          appRelease: row.app_release,
          browserFamily: row.browser_family,
          diagnosticsShared: row.diagnostics_shared === 1,
          estimateId: row.estimate_id,
          osFamily: row.os_family,
          projectId: row.project_id,
          routeTemplate: row.route_template,
          timezone: row.timezone,
          viewportHeight: row.viewport_height,
          viewportWidth: row.viewport_width,
          workspaceId: row.workspace_id,
        }
      : null,
    createdAt: row.created_at,
    id: row.id,
    senderRole: row.sender_role,
  }));
  return {
    messages,
    nextCursor: allRows.length > descendingPage.length && oldest
      ? encodeCursor({ id: oldest.id, timestamp: oldest.created_at })
      : null,
  };
}

export async function readSupportAttachmentForActor(input: {
  actor: CurrentUserContext;
  attachmentId: string;
  database: D1DatabaseLike;
}) {
  if (!isUuid(input.attachmentId)) throw new SupportReadError("Attachment not found.", 404);
  const row = await input.database
    .prepare<{
      content_type: string;
      id: string;
      message_id: string;
      r2_key: string;
      size_bytes: number;
      storage_status: string;
      user_id: string | null;
      user_visible_at: string | null;
      legacy_feedback_id: string | null;
    }>(
      `SELECT attachment.id, attachment.message_id, attachment.r2_key,
              attachment.content_type, attachment.size_bytes, attachment.storage_status,
              conversation.user_id, legacy.feedback_id AS legacy_feedback_id,
              legacy.user_visible_at
       FROM support_message_attachments attachment
       INNER JOIN support_messages message ON message.id = attachment.message_id
       INNER JOIN support_conversations conversation ON conversation.id = message.conversation_id
       LEFT JOIN support_legacy_feedback_imports legacy ON legacy.conversation_id = conversation.id
       WHERE attachment.id = ?
       LIMIT 1`,
    )
    .bind(input.attachmentId)
    .first();
  const isAdmin = isPlatformAdmin(input.actor);
  const ownerAllowed = row?.user_id === input.actor.userId
    && (!row.legacy_feedback_id || row.user_visible_at !== null);
  if (
    !row
    || (!isAdmin && !ownerAllowed)
    || row.storage_status !== "stored"
    || row.content_type !== "image/webp"
    || !row.r2_key.startsWith("support-user/")
  ) {
    throw new SupportReadError("Attachment not found.", 404);
  }
  return row;
}

export async function markUserSupportConversationReadThrough(input: {
  conversationId: string;
  database: D1DatabaseLike;
  throughMessageId: string;
  user: CurrentUserContext;
}) {
  await requireVisibleOwnedConversation(input.database, input.conversationId, input.user.userId);
  if (!isUuid(input.throughMessageId)) throw new SupportReadError("Read watermark is invalid.", 400);
  const watermark = await input.database
    .prepare<{ created_at: string; id: string }>(
      `SELECT message.created_at, message.id
       FROM support_messages message
       WHERE message.id = ?
         AND message.conversation_id = ?
         AND message.sender_role IN ('admin', 'system')
       LIMIT 1`,
    )
    .bind(input.throughMessageId, input.conversationId)
    .first<{ created_at: string; id: string }>();
  if (!watermark) throw new SupportReadError("Read watermark is invalid.", 400);

  const fence = await requireOpenSupportPrivacyFence(input.database, input.user.userId);
  const now = new Date().toISOString();
  const update = input.database
    .prepare(
      `UPDATE support_conversations
       SET unread_for_user = 0, updated_at = ?
       WHERE id = ?
         AND user_id = ?
         AND unread_for_user = 1
         AND NOT EXISTS (
           SELECT 1
           FROM support_messages later_message
           WHERE later_message.conversation_id = support_conversations.id
             AND later_message.sender_role IN ('admin', 'system')
             AND (
               later_message.created_at > ?
               OR (later_message.created_at = ? AND later_message.id > ?)
             )
         )
         AND EXISTS (
           SELECT 1
           FROM support_subject_privacy_fences read_fence
           WHERE read_fence.user_id = support_conversations.user_id
             AND read_fence.generation = ?
             AND read_fence.state = 'open'
         )`,
    )
    .bind(
      now,
      input.conversationId,
      input.user.userId,
      watermark.created_at,
      watermark.created_at,
      watermark.id,
      fence.generation,
    );
  const [result] = await runRequiredD1Batch(input.database, [update], "Support read receipt could not be saved.");
  const current = await input.database
    .prepare<{ unread_for_user: number }>(
      `SELECT unread_for_user
       FROM support_conversations
       WHERE id = ? AND user_id = ?
       LIMIT 1`,
    )
    .bind(input.conversationId, input.user.userId)
    .first<{ unread_for_user: number }>();
  if (!current) throw new SupportReadError("Support conversation not found.", 404);

  const currentFence = await input.database
    .prepare<{ generation: number; state: string }>(
      `SELECT generation, state FROM support_subject_privacy_fences WHERE user_id = ? LIMIT 1`,
    )
    .bind(input.user.userId)
    .first<{ generation: number; state: string }>();
  if (!currentFence || currentFence.state !== "open" || currentFence.generation !== fence.generation) {
    throw new SupportReadError("Support read receipt crossed a privacy boundary.", 409);
  }

  if (result.meta?.changes === 1) {
    try {
      await fanoutSupportInboxInvalidation({
        env: await getSupportRuntimeBindings(),
        conversationId: input.conversationId,
        subject: "user_read_receipt",
        type: "support_conversation_changed",
      });
    } catch {
      // D1 is authoritative; reconnect and bounded polling repair invalidation loss.
    }
  }
  return {
    throughMessageId: watermark.id,
    unread: current.unread_for_user === 1,
  };
}

/**
 * Shared admin watermark mutation for the authorized admin API layer. The
 * caller owns the platform-admin gate; this function owns source ordering,
 * privacy fencing, required batching, and post-D1 invalidation.
 */
export async function markAdminSupportConversationReadThrough(input: {
  conversationId: string;
  database: D1DatabaseLike;
  throughMessageId: string;
}) {
  if (!isUuid(input.conversationId) || !isUuid(input.throughMessageId)) {
    throw new SupportReadError("Support read watermark is invalid.", 400);
  }
  const conversation = await input.database
    .prepare<{ unread_for_admin: number; user_id: string | null }>(
      `SELECT user_id, unread_for_admin
       FROM support_conversations
       WHERE id = ?
       LIMIT 1`,
    )
    .bind(input.conversationId)
    .first<{ unread_for_admin: number; user_id: string | null }>();
  if (!conversation) throw new SupportReadError("Support conversation not found.", 404);
  const watermark = await input.database
    .prepare<{ created_at: string; id: string }>(
      `SELECT id, created_at
       FROM support_messages
       WHERE id = ?
         AND conversation_id = ?
         AND (sender_role = 'user' OR direction = 'inbound')
       LIMIT 1`,
    )
    .bind(input.throughMessageId, input.conversationId)
    .first<{ created_at: string; id: string }>();
  if (!watermark) throw new SupportReadError("Support read watermark is invalid.", 400);

  const fence = conversation.user_id
    ? await requireOpenSupportPrivacyFence(input.database, conversation.user_id)
    : null;
  const fenceSql = fence
    ? `AND EXISTS (
         SELECT 1 FROM support_subject_privacy_fences admin_read_fence
         WHERE admin_read_fence.user_id = support_conversations.user_id
           AND admin_read_fence.generation = ?
           AND admin_read_fence.state = 'open'
       )`
    : "";
  const values: D1Value[] = [
    new Date().toISOString(),
    input.conversationId,
    watermark.created_at,
    watermark.created_at,
    watermark.id,
  ];
  if (fence) values.push(fence.generation);
  const update = input.database
    .prepare(
      `UPDATE support_conversations
       SET unread_for_admin = 0, updated_at = ?
       WHERE id = ?
         AND unread_for_admin = 1
         AND NOT EXISTS (
           SELECT 1
           FROM support_messages later_message
           WHERE later_message.conversation_id = support_conversations.id
             AND (later_message.sender_role = 'user' OR later_message.direction = 'inbound')
             AND (
               later_message.created_at > ?
               OR (later_message.created_at = ? AND later_message.id > ?)
             )
         )
         ${fenceSql}`,
    )
    .bind(...values);
  const [result] = await runRequiredD1Batch(input.database, [update], "Support admin read receipt could not be saved.");
  const current = await input.database
    .prepare<{ unread_for_admin: number }>(
      "SELECT unread_for_admin FROM support_conversations WHERE id = ? LIMIT 1",
    )
    .bind(input.conversationId)
    .first<{ unread_for_admin: number }>();
  if (!current) throw new SupportReadError("Support conversation not found.", 404);
  if (fence && conversation.user_id) {
    const currentFence = await input.database
      .prepare<{ generation: number; state: string }>(
        "SELECT generation, state FROM support_subject_privacy_fences WHERE user_id = ? LIMIT 1",
      )
      .bind(conversation.user_id)
      .first<{ generation: number; state: string }>();
    if (!currentFence || currentFence.generation !== fence.generation || currentFence.state !== "open") {
      throw new SupportReadError("Support read receipt crossed a privacy boundary.", 409);
    }
  }
  if (result.meta?.changes === 1) {
    try {
      await fanoutSupportInboxInvalidation({
        env: await getSupportRuntimeBindings(),
        conversationId: input.conversationId,
        subject: "admin_read_receipt",
        type: "support_conversation_changed",
      });
    } catch {
      // D1 remains authoritative when identifier-only invalidation is delayed.
    }
  }
  return { throughMessageId: watermark.id, unread: current.unread_for_admin === 1 };
}
