import type { D1DatabaseLike } from "@/lib/cloudflare/d1";
import { runRequiredD1Batch } from "@/lib/cloudflare/d1-batch";
import { DEFAULT_SUPPORT_MAILBOX } from "@/lib/email/support-email-config";
import {
  supportPrivacyWriteGateSql,
  supportPrivacyWriteGateValues,
  type SupportPrivacyWriteGate,
} from "@/lib/support/privacy-fence";

export type { D1DatabaseLike } from "@/lib/cloudflare/d1";

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
export type SupportMailboxFolder = "inbox" | "sent" | "archive" | "all" | "starred" | "snoozed";

export type SupportMailboxFilters = {
  folder: SupportMailboxFolder;
  status: SupportConversationStatus | null;
  channel: SupportChannelFilter;
  unreadOnly: boolean;
  search: string;
  label: string | null;
  assigneeUserId: string | null;
  limit: number;
  cursor: SupportMailboxCursor | null;
};

export type SupportMailboxCursor = {
  timestamp: string;
  id: string;
};

export type SupportMailboxPage = {
  conversations: SupportConversationRow[];
  counts: Record<SupportMailboxFolder, number>;
  nextCursor: string | null;
};

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

export type SupportMessageContextRow = {
  message_id: string;
  workspace_id: string | null;
  project_id: string | null;
  estimate_id: string | null;
  route_template: string;
  app_release: string | null;
  viewport_width: number | null;
  viewport_height: number | null;
  timezone: string | null;
  browser_family: string | null;
  os_family: string | null;
  diagnostics_shared: number;
  created_at: string;
};

export type SupportConversationTriageRow = {
  conversation_id: string;
  assignee_user_id: string | null;
  snoozed_until: string | null;
  starred_for_admin: number;
  revision: number;
  updated_at: string;
  labels: string[];
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

function isSupportMailboxFolder(value: string): value is SupportMailboxFolder {
  return value === "inbox" || value === "sent" || value === "archive" || value === "all" || value === "starred" || value === "snoozed";
}

function isSupportChannelFilter(value: string): value is SupportChannelFilter {
  return value === "all" || value === "email" || value === "in_app";
}

function decodeSupportMailboxCursor(value: string): SupportMailboxCursor {
  try {
    const parsed = JSON.parse(atob(value.replace(/-/g, "+").replace(/_/g, "/"))) as unknown;
    if (
      !parsed
      || typeof parsed !== "object"
      || typeof (parsed as SupportMailboxCursor).timestamp !== "string"
      || typeof (parsed as SupportMailboxCursor).id !== "string"
      || !(parsed as SupportMailboxCursor).timestamp
      || !(parsed as SupportMailboxCursor).id
    ) {
      throw new Error("Invalid cursor.");
    }
    return parsed as SupportMailboxCursor;
  } catch {
    throw new Error("Invalid support mailbox cursor.");
  }
}

function encodeSupportMailboxCursor(cursor: SupportMailboxCursor) {
  return btoa(JSON.stringify(cursor)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

export function normalizeSupportMailboxFilters(input: {
  folder?: string | null;
  status?: string | null;
  channel?: string | null;
  unreadOnly?: boolean | null;
  search?: string | null;
  label?: string | null;
  assigneeUserId?: string | null;
  limit?: number | null;
  cursor?: string | null;
} = {}): SupportMailboxFilters {
  const folder = input.folder ?? "inbox";
  if (!isSupportMailboxFolder(folder)) throw new Error("Invalid support mailbox folder.");

  const status = input.status ?? null;
  if (status !== null && !isSupportConversationStatus(status)) {
    throw new Error("Invalid support conversation status.");
  }

  const channel = input.channel ?? "all";
  if (!isSupportChannelFilter(channel)) throw new Error("Invalid support channel filter.");

  const search = input.search?.trim() ?? "";
  if (search.length > 160) throw new Error("Support search must be 160 characters or fewer.");

  const rawLabel = input.label?.trim().toLowerCase() ?? "";
  if (rawLabel && (rawLabel.length > 48 || /[\u0000-\u001f\u007f]/.test(rawLabel))) {
    throw new Error("Invalid support label filter.");
  }
  const assigneeUserId = input.assigneeUserId?.trim() ?? "";
  if (assigneeUserId.length > 128 || /[\u0000-\u001f\u007f]/.test(assigneeUserId)) {
    throw new Error("Invalid support assignee filter.");
  }

  const requestedLimit = input.limit ?? 50;
  if (!Number.isInteger(requestedLimit) || requestedLimit < 1 || requestedLimit > 100) {
    throw new Error("Support mailbox limit must be between 1 and 100.");
  }

  return {
    folder,
    status,
    channel,
    unreadOnly: Boolean(input.unreadOnly),
    search,
    label: rawLabel || null,
    assigneeUserId: assigneeUserId || null,
    limit: requestedLimit,
    cursor: input.cursor ? decodeSupportMailboxCursor(input.cursor) : null,
  };
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
  if (!db) throw new Error("Something went wrong. Try again in a moment.");
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

function buildSupportMailboxCommonClauses(filters: SupportMailboxFilters) {
  const clauses: string[] = [];
  const binds: Array<string | number> = [];

  if (filters.status) {
    clauses.push("c.status = ?");
    binds.push(filters.status);
  }
  if (filters.channel !== "all") {
    clauses.push("c.channel = ?");
    binds.push(filters.channel);
  }
  if (filters.unreadOnly) clauses.push("c.unread_for_admin = 1");
  if (filters.search) {
    const like = `%${filters.search.toLowerCase().replace(/[%_]/g, "")}%`;
    clauses.push(
      `(lower(COALESCE(c.requester_email, p.email, '')) LIKE ? OR lower(COALESCE(c.requester_name, p.display_name, '')) LIKE ? OR lower(COALESCE(c.subject, '')) LIKE ?)`,
    );
    binds.push(like, like, like);
  }
  if (filters.label) {
    clauses.push("EXISTS (SELECT 1 FROM support_conversation_labels label_filter WHERE label_filter.conversation_id = c.id AND label_filter.label = ?)");
    binds.push(filters.label);
  }
  if (filters.assigneeUserId) {
    clauses.push("EXISTS (SELECT 1 FROM support_conversation_triage assignee_filter WHERE assignee_filter.conversation_id = c.id AND assignee_filter.assignee_user_id = ?)");
    binds.push(filters.assigneeUserId);
  }

  return { clauses, binds };
}

function supportMailboxFolderClause(folder: SupportMailboxFolder) {
  if (folder === "inbox") return { clause: "(c.status <> 'archived' AND NOT EXISTS (SELECT 1 FROM support_conversation_triage inbox_triage WHERE inbox_triage.conversation_id = c.id AND inbox_triage.snoozed_until > ?))", needsNow: true };
  if (folder === "archive") return { clause: "c.status = 'archived'", needsNow: false };
  if (folder === "sent") {
    return { clause: "EXISTS (SELECT 1 FROM support_messages sent_message WHERE sent_message.conversation_id = c.id AND sent_message.direction = 'outbound')", needsNow: false };
  }
  if (folder === "starred") return { clause: "EXISTS (SELECT 1 FROM support_conversation_triage starred_triage WHERE starred_triage.conversation_id = c.id AND starred_triage.starred_for_admin = 1)", needsNow: false };
  if (folder === "snoozed") return { clause: "EXISTS (SELECT 1 FROM support_conversation_triage snoozed_triage WHERE snoozed_triage.conversation_id = c.id AND snoozed_triage.snoozed_until > ?)", needsNow: true };
  return { clause: "1 = 1", needsNow: false };
}

function supportMailboxSortExpression(folder: SupportMailboxFolder) {
  if (folder === "sent") {
    return "COALESCE((SELECT MAX(sent_message.created_at) FROM support_messages sent_message WHERE sent_message.conversation_id = c.id AND sent_message.direction = 'outbound'), c.last_message_at)";
  }
  return "c.last_message_at";
}

function coerceMailboxCounts(
  row: (Partial<Record<SupportMailboxFolder, number>> & { all_count?: number }) | null,
): Record<SupportMailboxFolder, number> {
  return {
    inbox: Number(row?.inbox ?? 0),
    sent: Number(row?.sent ?? 0),
    archive: Number(row?.archive ?? 0),
    all: Number(row?.all_count ?? row?.all ?? 0),
    starred: Number(row?.starred ?? 0),
    snoozed: Number(row?.snoozed ?? 0),
  };
}

export async function listSupportMailbox(
  input: Parameters<typeof normalizeSupportMailboxFilters>[0] = {},
  dbOverride?: D1DatabaseLike,
): Promise<SupportQueryResult<SupportMailboxPage>> {
  try {
    const db = await resolveSupportDb(dbOverride);
    const filters = normalizeSupportMailboxFilters(input);
    const { clauses: commonClauses, binds: commonBinds } = buildSupportMailboxCommonClauses(filters);
    const now = new Date().toISOString();
    const folder = supportMailboxFolderClause(filters.folder);
    const sortExpression = supportMailboxSortExpression(filters.folder);
    const rowClauses = [...commonClauses, folder.clause];
    const rowBinds = [...commonBinds, ...(folder.needsNow ? [now] : [])];

    if (filters.cursor) {
      rowClauses.push(`(${sortExpression} < ? OR (${sortExpression} = ? AND c.id < ?))`);
      rowBinds.push(filters.cursor.timestamp, filters.cursor.timestamp, filters.cursor.id);
    }

    const where = `WHERE ${rowClauses.join(" AND ")}`;
    const countWhere = commonClauses.length > 0 ? `WHERE ${commonClauses.join(" AND ")}` : "";
    const [rows, counts] = await Promise.all([
      db
        .prepare<SupportConversationRow & { sort_timestamp: string }>(
          `
            SELECT ${CONVERSATION_SELECT}, ${sortExpression} AS sort_timestamp
            FROM support_conversations c
            LEFT JOIN profiles p ON p.id = c.user_id
            ${where}
            ORDER BY sort_timestamp DESC, c.id DESC
            LIMIT ?
          `,
        )
        .bind(...rowBinds, filters.limit + 1)
        .all<SupportConversationRow & { sort_timestamp: string }>(),
      db
        .prepare<Record<SupportMailboxFolder, number>>(
          `
            SELECT
              SUM(CASE WHEN c.status <> 'archived' AND NOT EXISTS (SELECT 1 FROM support_conversation_triage inbox_triage WHERE inbox_triage.conversation_id = c.id AND inbox_triage.snoozed_until > ?) THEN 1 ELSE 0 END) AS inbox,
              SUM(CASE WHEN EXISTS (SELECT 1 FROM support_messages sent_message WHERE sent_message.conversation_id = c.id AND sent_message.direction = 'outbound') THEN 1 ELSE 0 END) AS sent,
              SUM(CASE WHEN c.status = 'archived' THEN 1 ELSE 0 END) AS archive,
              SUM(CASE WHEN EXISTS (SELECT 1 FROM support_conversation_triage starred_triage WHERE starred_triage.conversation_id = c.id AND starred_triage.starred_for_admin = 1) THEN 1 ELSE 0 END) AS starred,
              SUM(CASE WHEN EXISTS (SELECT 1 FROM support_conversation_triage snoozed_triage WHERE snoozed_triage.conversation_id = c.id AND snoozed_triage.snoozed_until > ?) THEN 1 ELSE 0 END) AS snoozed,
              COUNT(*) AS all_count
            FROM support_conversations c
            LEFT JOIN profiles p ON p.id = c.user_id
            ${countWhere}
          `,
        )
        .bind(now, now, ...commonBinds)
        .first<Record<SupportMailboxFolder, number>>(),
    ]);

    const page = (rows.results ?? []).slice(0, filters.limit);
    const last = page.at(-1);
    const hasMore = (rows.results ?? []).length > page.length;
    return {
      data: {
        conversations: page,
        counts: coerceMailboxCounts(counts),
        nextCursor: hasMore && last
          ? encodeSupportMailboxCursor({ timestamp: last.sort_timestamp, id: last.id })
          : null,
      },
      error: null,
    };
  } catch {
    return {
      data: {
        conversations: [],
        counts: { inbox: 0, sent: 0, archive: 0, all: 0, starred: 0, snoozed: 0 },
        nextCursor: null,
      },
      error: "Support conversations could not be read.",
    };
  }
}

export async function listSupportConversations(
  input: {
    status?: SupportConversationStatus | null;
    channel?: SupportChannelFilter | null;
    unreadOnly?: boolean;
    search?: string | null;
    label?: string | null;
    assigneeUserId?: string | null;
    limit?: number;
    cursor?: string | null;
  } = {},
  dbOverride?: D1DatabaseLike,
): Promise<SupportQueryResult<SupportConversationRow[]>> {
  const result = await listSupportMailbox({ ...input, folder: "all" }, dbOverride);
  return { data: result.data.conversations, error: result.error };
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

export async function canAccessVisibleSupportConversationInD1({
  conversationId,
  database,
  userId,
}: {
  conversationId: string;
  database: D1DatabaseLike;
  userId: string;
}) {
  const row = await database
    .prepare<{ allowed: number }>(
      `SELECT 1 AS allowed
       FROM support_conversations conversation
       WHERE conversation.id = ?
         AND conversation.user_id = ?
         AND conversation.channel = 'in_app'
         AND NOT EXISTS (
           SELECT 1
           FROM support_legacy_feedback_imports hidden_legacy
           WHERE hidden_legacy.conversation_id = conversation.id
             AND hidden_legacy.user_visible_at IS NULL
         )
       LIMIT 1`,
    )
    .bind(conversationId, userId)
    .first<{ allowed: number }>();
  return row?.allowed === 1;
}

export async function listSupportConversationsForUserInD1(
  db: D1DatabaseLike,
  userId: string,
  limit = 50,
) {
  const rows = await db
    .prepare<SupportConversationRow>(
      `
        SELECT ${CONVERSATION_SELECT}
        FROM support_conversations c
        LEFT JOIN profiles p ON p.id = c.user_id
        WHERE c.user_id = ? AND c.channel = 'in_app'
        ORDER BY c.last_message_at DESC, c.id DESC
        LIMIT ?
      `,
    )
    .bind(userId, Math.max(1, Math.min(100, Math.floor(limit))))
    .all<SupportConversationRow>();
  return rows.results ?? [];
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

export async function listSupportAttachmentsForMessageInD1(db: D1DatabaseLike, messageId: string) {
  const rows = await db.prepare<SupportAttachmentRow>(
    `SELECT id, message_id, r2_key, filename, content_type, size_bytes, content_id,
            disposition, sha256, storage_status, created_at
     FROM support_message_attachments
     WHERE message_id = ? AND storage_status = 'stored'
     ORDER BY created_at ASC`,
  ).bind(messageId).all<SupportAttachmentRow>();
  return rows.results ?? [];
}

export async function deleteSupportAttachmentsForMessageInD1(db: D1DatabaseLike, messageId: string) {
  const attachments = await listSupportAttachmentsForMessageInD1(db, messageId);
  await db.prepare(`DELETE FROM support_message_attachments WHERE message_id = ?`).bind(messageId).run();
  await updateSupportMessageAttachmentCountInD1(db, messageId, 0);
  return attachments;
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

export async function listSupportMessageContextsForConversationInD1(
  db: D1DatabaseLike,
  conversationId: string,
): Promise<SupportMessageContextRow[]> {
  const rows = await db
    .prepare<SupportMessageContextRow>(
      `SELECT context.message_id, context.workspace_id, context.project_id,
              context.estimate_id, context.route_template, context.app_release,
              context.viewport_width, context.viewport_height, context.timezone,
              context.browser_family, context.os_family,
              context.diagnostics_shared, context.created_at
       FROM support_message_context context
       INNER JOIN support_messages message ON message.id = context.message_id
       WHERE message.conversation_id = ?
       ORDER BY context.created_at ASC, context.message_id ASC`,
    )
    .bind(conversationId)
    .all<SupportMessageContextRow>();
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
    privacyGate?: SupportPrivacyWriteGate;
  },
): Promise<SupportConversationRow> {
  const now = new Date().toISOString();
  const conversationId = crypto.randomUUID();
  const routingToken = createSupportRoutingToken();
  const subject = normalizeOptionalText(input.subject, SUPPORT_SUBJECT_MAX) ?? "Support request";
  const mailbox = (input.mailboxAddress ?? DEFAULT_SUPPORT_MAILBOX).toLowerCase();

  const insert = db.prepare(
      `
        INSERT INTO support_conversations (
          id, user_id, requester_email, requester_name, subject, status, channel,
          mailbox_address, routing_token, last_message_at,
          unread_for_admin, unread_for_user, created_at, updated_at
        )
        SELECT ?, NULL, ?, ?, ?, 'open', ?, ?, ?, ?, 1, 0, ?, ?
        WHERE ${supportPrivacyWriteGateSql("external_conversation_fence")}
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
      ...supportPrivacyWriteGateValues(input.privacyGate ?? null),
    );
  const [created] = await runRequiredD1Batch(db, [insert], "External support conversation could not be created.");
  if ((created.meta?.changes ?? 0) !== 1) throw new Error("support_subject_fenced");

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
    ccJson?: string | null;
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
    privacyGate?: SupportPrivacyWriteGate;
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

  const insertMessage = db.prepare(
      `
        INSERT OR IGNORE INTO support_messages (
          id, conversation_id, sender_role, author_user_id, body_text,
          body_html, email_message_id, client_message_id, send_status,
          direction, transport, mailbox_address, from_address, from_name, to_json, cc_json,
          internet_message_id, in_reply_to, references_json, ingest_key,
          attachment_count, provider_name, received_at, warning_flags_json, created_at
        )
        SELECT ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
        WHERE ${supportPrivacyWriteGateSql("message_insert_fence")}
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
      input.ccJson ?? null,
      input.internetMessageId ?? null,
      input.inReplyTo ?? null,
      input.referencesJson ?? null,
      input.ingestKey ?? null,
      input.attachmentCount ?? 0,
      input.providerName ?? null,
      input.receivedAt ?? null,
      input.warningFlagsJson ?? null,
      now,
      ...supportPrivacyWriteGateValues(input.privacyGate ?? null),
    );
  const updateConversation = db.prepare(
    `UPDATE support_conversations
     SET last_message_at = ?, updated_at = ?,
         unread_for_admin = CASE WHEN ? = 'admin' THEN unread_for_admin ELSE 1 END,
         unread_for_user = CASE WHEN ? = 'admin' THEN 1 ELSE unread_for_user END
     WHERE id = ? AND ${supportPrivacyWriteGateSql("message_conversation_fence")}`,
  ).bind(
    now,
    now,
    input.senderRole,
    input.senderRole,
    input.conversationId,
    ...supportPrivacyWriteGateValues(input.privacyGate ?? null),
  );
  const results = await runRequiredD1Batch(
    db,
    [insertMessage, updateConversation],
    "Support message could not be inserted.",
  );

  const row =
    (input.ingestKey ? await findSupportMessageByIngestKeyInD1(db, input.ingestKey) : null) ??
    (await getSupportMessageByClientIdInD1(db, input.conversationId, clientMessageId));
  if (!row || (results[1]?.meta?.changes ?? 0) !== 1) throw new Error("Support message insert failed.");

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

export async function markSupportConversationReadForUserInD1(
  db: D1DatabaseLike,
  conversationId: string,
  userId: string,
): Promise<SupportConversationRow | null> {
  const now = new Date().toISOString();
  const result = await db
    .prepare(
      `
        UPDATE support_conversations
        SET unread_for_user = 0, updated_at = ?
        WHERE id = ? AND user_id = ? AND channel = 'in_app'
      `,
    )
    .bind(now, conversationId, userId)
    .run();
  if ((result.meta?.changes ?? 0) !== 1) return null;
  return getSupportConversationInD1(db, conversationId);
}

export async function getSupportConversationTriageInD1(db: D1DatabaseLike, conversationId: string) {
  const triage = await db.prepare<Omit<SupportConversationTriageRow, "labels">>(
    `SELECT conversation_id, assignee_user_id, snoozed_until, starred_for_admin, revision, updated_at
     FROM support_conversation_triage WHERE conversation_id = ? LIMIT 1`,
  ).bind(conversationId).first<Omit<SupportConversationTriageRow, "labels">>();
  const labels = await db.prepare<{ label: string }>(
    `SELECT label FROM support_conversation_labels WHERE conversation_id = ? ORDER BY label ASC`,
  ).bind(conversationId).all<{ label: string }>();
  return triage ? { ...triage, labels: (labels.results ?? []).map((row) => row.label) } : null;
}

export async function updateSupportConversationTriageInD1(input: {
  db: D1DatabaseLike;
  conversationId: string;
  expectedRevision: number;
  assigneeUserId?: string | null;
  snoozedUntil?: string | null;
  starredForAdmin?: boolean;
}) {
  const existing = await getSupportConversationTriageInD1(input.db, input.conversationId);
  const now = new Date().toISOString();
  if (!existing) {
    if (input.expectedRevision !== 0) return { updated: false, triage: null };
    await input.db.prepare(
      `INSERT INTO support_conversation_triage (conversation_id, assignee_user_id, snoozed_until, starred_for_admin, revision, updated_at)
       VALUES (?, ?, ?, ?, 1, ?)`,
    ).bind(input.conversationId, input.assigneeUserId ?? null, input.snoozedUntil ?? null, input.starredForAdmin ? 1 : 0, now).run();
    return { updated: true, triage: await getSupportConversationTriageInD1(input.db, input.conversationId) };
  }
  const result = await input.db.prepare(
    `UPDATE support_conversation_triage
     SET assignee_user_id = ?, snoozed_until = ?, starred_for_admin = ?, revision = revision + 1, updated_at = ?
     WHERE conversation_id = ? AND revision = ?`,
  ).bind(
    input.assigneeUserId === undefined ? existing.assignee_user_id : input.assigneeUserId,
    input.snoozedUntil === undefined ? existing.snoozed_until : input.snoozedUntil,
    input.starredForAdmin === undefined ? existing.starred_for_admin : input.starredForAdmin ? 1 : 0,
    now, input.conversationId, input.expectedRevision,
  ).run();
  return { updated: Boolean(result.meta?.changes), triage: await getSupportConversationTriageInD1(input.db, input.conversationId) };
}

export async function replaceSupportConversationLabelsInD1(input: {
  db: D1DatabaseLike;
  conversationId: string;
  labels: string[];
}) {
  const labels = [...new Set(input.labels.map((label) => label.trim().toLowerCase()).filter(Boolean))];
  if (labels.length > 12 || labels.some((label) => label.length > 48 || /[\u0000-\u001f\u007f]/.test(label))) {
    throw new Error("Invalid support labels.");
  }
  await input.db.prepare(`DELETE FROM support_conversation_labels WHERE conversation_id = ?`).bind(input.conversationId).run();
  const now = new Date().toISOString();
  for (const label of labels) {
    await input.db.prepare(
      `INSERT INTO support_conversation_labels (conversation_id, label, created_at) VALUES (?, ?, ?)`,
    ).bind(input.conversationId, label, now).run();
  }
  return getSupportConversationTriageInD1(input.db, input.conversationId);
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
): Promise<SupportQueryResult<{
  conversations: SupportConversationRow[];
  messages: SupportMessageRow[];
  drafts: Array<{
    id: string;
    conversation_id: string | null;
    kind: string;
    to_json: string | null;
    cc_json: string | null;
    subject: string | null;
    body_text: string | null;
    body_html: string | null;
    updated_at: string;
  }>;
}>> {
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
    const drafts = await db.prepare<{
      id: string;
      conversation_id: string | null;
      kind: string;
      to_json: string | null;
      cc_json: string | null;
      subject: string | null;
      body_text: string | null;
      body_html: string | null;
      updated_at: string;
    }>(
      `SELECT draft.id, draft.conversation_id, draft.kind, draft.to_json, draft.cc_json,
              draft.subject, draft.body_text, draft.body_html, draft.updated_at
       FROM support_drafts draft
       INNER JOIN support_conversations conversation ON conversation.id = draft.conversation_id
       WHERE conversation.user_id = ?
       ORDER BY draft.updated_at ASC, draft.id ASC`,
    ).bind(requesterUserId).all();

    return {
      data: {
        conversations: conversations.results ?? [],
        messages: messages.results ?? [],
        drafts: drafts.results ?? [],
      },
      error: null,
    };
  } catch {
    return { data: { conversations: [], messages: [], drafts: [] }, error: "Support data could not be read for privacy request." };
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
              cc_json = NULL,
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
