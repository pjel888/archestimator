import type { D1DatabaseLike } from "@/lib/cloudflare/d1";

export type SupportDraftKind = "reply" | "new_email";
export type SupportDraftLifecycle = "editing" | "sending" | "consumed";

export type SupportDraftRow = {
  id: string;
  admin_user_id: string;
  scope_key: string;
  kind: SupportDraftKind;
  conversation_id: string | null;
  outbound_message_id: string | null;
  client_message_id: string;
  lifecycle: SupportDraftLifecycle;
  to_json: string | null;
  cc_json: string | null;
  subject: string | null;
  body_text: string | null;
  body_html: string | null;
  from_identity_id: string | null;
  revision: number;
  created_at: string;
  updated_at: string;
};

export type SupportDraftAttachmentRow = {
  id: string;
  draft_id: string;
  r2_key: string;
  filename: string;
  content_type: string | null;
  size_bytes: number;
  sha256: string | null;
  created_at: string;
};

export type SupportDraftUpdate = Pick<SupportDraftRow, "to_json" | "cc_json" | "subject" | "body_text" | "body_html" | "from_identity_id">;

const DRAFT_SELECT = `
  id, admin_user_id, scope_key, kind, conversation_id, outbound_message_id,
  client_message_id, lifecycle, to_json, cc_json, subject, body_text, body_html,
  from_identity_id, revision, created_at, updated_at
`;

export async function getSupportDraftForAdminInD1(db: D1DatabaseLike, draftId: string, adminUserId: string) {
  return db.prepare<SupportDraftRow>(`SELECT ${DRAFT_SELECT} FROM support_drafts WHERE id = ? AND admin_user_id = ? LIMIT 1`)
    .bind(draftId, adminUserId).first<SupportDraftRow>();
}

export async function getSupportDraftByScopeForAdminInD1(db: D1DatabaseLike, scopeKey: string, adminUserId: string) {
  return db.prepare<SupportDraftRow>(
    `SELECT ${DRAFT_SELECT} FROM support_drafts WHERE scope_key = ? AND admin_user_id = ? LIMIT 1`,
  ).bind(scopeKey, adminUserId).first<SupportDraftRow>();
}

export async function listSupportDraftsForAdminInD1(
  db: D1DatabaseLike,
  adminUserId: string,
  limit = 50,
) {
  const result = await db.prepare<SupportDraftRow>(
    `SELECT ${DRAFT_SELECT}
     FROM support_drafts
     WHERE admin_user_id = ?
       AND lifecycle = 'editing'
       AND (
         NULLIF(TRIM(COALESCE(subject, '')), '') IS NOT NULL
         OR NULLIF(TRIM(COALESCE(body_text, '')), '') IS NOT NULL
         OR NULLIF(TRIM(COALESCE(to_json, '')), '') IS NOT NULL
         OR EXISTS (
           SELECT 1
           FROM support_draft_attachments attachment
           WHERE attachment.draft_id = support_drafts.id
         )
       )
     ORDER BY updated_at DESC, id DESC
     LIMIT ?`,
  ).bind(adminUserId, Math.max(1, Math.min(limit, 100))).all<SupportDraftRow>();
  return result.results ?? [];
}

export async function getOrCreateSupportDraftInD1(input: {
  db: D1DatabaseLike;
  adminUserId: string;
  scopeKey: string;
  kind: SupportDraftKind;
  conversationId?: string | null;
  clientMessageId: string;
}) {
  const existing = await input.db.prepare<SupportDraftRow>(
    `SELECT ${DRAFT_SELECT} FROM support_drafts WHERE admin_user_id = ? AND scope_key = ? LIMIT 1`,
  ).bind(input.adminUserId, input.scopeKey).first<SupportDraftRow>();
  if (existing) return existing;

  const now = new Date().toISOString();
  const id = crypto.randomUUID();
  await input.db.prepare(
    `INSERT OR IGNORE INTO support_drafts (
      id, admin_user_id, scope_key, kind, conversation_id, client_message_id,
      lifecycle, revision, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, 'editing', 1, ?, ?)`,
  ).bind(id, input.adminUserId, input.scopeKey, input.kind, input.conversationId ?? null, input.clientMessageId, now, now).run();
  return getSupportDraftByScopeForAdminInD1(input.db, input.scopeKey, input.adminUserId);
}

export async function updateSupportDraftInD1(input: {
  db: D1DatabaseLike;
  draftId: string;
  adminUserId: string;
  expectedRevision: number;
  update: SupportDraftUpdate;
}) {
  const now = new Date().toISOString();
  const result = await input.db.prepare(
    `UPDATE support_drafts SET
      to_json = ?, cc_json = ?, subject = ?, body_text = ?, body_html = ?, from_identity_id = ?,
      revision = revision + 1, updated_at = ?
     WHERE id = ? AND admin_user_id = ? AND lifecycle = 'editing' AND revision = ?`,
  ).bind(
    input.update.to_json, input.update.cc_json, input.update.subject, input.update.body_text,
    input.update.body_html, input.update.from_identity_id, now,
    input.draftId, input.adminUserId, input.expectedRevision,
  ).run();
  const draft = await getSupportDraftForAdminInD1(input.db, input.draftId, input.adminUserId);
  return { updated: Boolean(result.meta?.changes), draft };
}

export async function listSupportDraftAttachmentsInD1(db: D1DatabaseLike, draftId: string) {
  const result = await db.prepare<SupportDraftAttachmentRow>(
    `SELECT id, draft_id, r2_key, filename, content_type, size_bytes, sha256, created_at
     FROM support_draft_attachments WHERE draft_id = ? ORDER BY created_at ASC`,
  ).bind(draftId).all<SupportDraftAttachmentRow>();
  return result.results ?? [];
}

export async function addSupportDraftAttachmentInD1(input: Omit<SupportDraftAttachmentRow, "id" | "created_at"> & { db: D1DatabaseLike }) {
  const id = crypto.randomUUID();
  const createdAt = new Date().toISOString();
  await input.db.prepare(
    `INSERT INTO support_draft_attachments (id, draft_id, r2_key, filename, content_type, size_bytes, sha256, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
  ).bind(id, input.draft_id, input.r2_key, input.filename, input.content_type, input.size_bytes, input.sha256, createdAt).run();
  return {
    id,
    created_at: createdAt,
    draft_id: input.draft_id,
    r2_key: input.r2_key,
    filename: input.filename,
    content_type: input.content_type,
    size_bytes: input.size_bytes,
    sha256: input.sha256,
  } satisfies SupportDraftAttachmentRow;
}

export async function claimSupportDraftForSendInD1(input: {
  db: D1DatabaseLike;
  draftId: string;
  adminUserId: string;
  expectedRevision: number;
}) {
  const result = await input.db.prepare(
    `UPDATE support_drafts
     SET lifecycle = 'sending', revision = revision + 1, updated_at = ?
     WHERE id = ? AND admin_user_id = ? AND lifecycle = 'editing' AND revision = ?`,
  ).bind(new Date().toISOString(), input.draftId, input.adminUserId, input.expectedRevision).run();
  return {
    claimed: Boolean(result.meta?.changes),
    draft: await getSupportDraftForAdminInD1(input.db, input.draftId, input.adminUserId),
  };
}

export async function bindSupportDraftOutboundMessageInD1(input: {
  db: D1DatabaseLike;
  draftId: string;
  adminUserId: string;
  outboundMessageId: string;
}) {
  const result = await input.db.prepare(
    `UPDATE support_drafts
     SET outbound_message_id = ?, lifecycle = 'consumed', revision = revision + 1, updated_at = ?
     WHERE id = ? AND admin_user_id = ? AND lifecycle = 'sending'
       AND (outbound_message_id IS NULL OR outbound_message_id = ?)`,
  ).bind(
    input.outboundMessageId, new Date().toISOString(), input.draftId, input.adminUserId, input.outboundMessageId,
  ).run();
  return {
    consumed: Boolean(result.meta?.changes),
    draft: await getSupportDraftForAdminInD1(input.db, input.draftId, input.adminUserId),
  };
}

export async function bindSupportDraftPendingMessageInD1(input: {
  db: D1DatabaseLike;
  draftId: string;
  adminUserId: string;
  outboundMessageId: string;
}) {
  const result = await input.db.prepare(
    `UPDATE support_drafts
     SET outbound_message_id = ?, revision = revision + 1, updated_at = ?
     WHERE id = ? AND admin_user_id = ? AND lifecycle = 'sending'
       AND (outbound_message_id IS NULL OR outbound_message_id = ?)`,
  ).bind(
    input.outboundMessageId, new Date().toISOString(), input.draftId, input.adminUserId, input.outboundMessageId,
  ).run();
  return {
    bound: Boolean(result.meta?.changes),
    draft: await getSupportDraftForAdminInD1(input.db, input.draftId, input.adminUserId),
  };
}

export async function recoverStaleSupportDraftSendsInD1(input: {
  db: D1DatabaseLike;
  olderThan: string;
  limit: number;
  dryRun?: boolean;
}) {
  const candidates = await input.db.prepare<{ id: string; outbound_message_id: string }>(
    `SELECT id, outbound_message_id
     FROM support_drafts
     WHERE lifecycle = 'sending' AND outbound_message_id IS NOT NULL AND updated_at < ?
     ORDER BY updated_at ASC
     LIMIT ?`,
  ).bind(input.olderThan, input.limit).all<{ id: string; outbound_message_id: string }>();
  if (input.dryRun) return { candidates: (candidates.results ?? []).length, recovered: 0 };
  let recovered = 0;
  for (const candidate of candidates.results ?? []) {
    await input.db.prepare(
      `UPDATE support_messages SET send_status = 'send_failed'
       WHERE id = ? AND send_status = 'pending'`,
    ).bind(candidate.outbound_message_id).run();
    const result = await input.db.prepare(
      `UPDATE support_drafts
       SET lifecycle = 'consumed', revision = revision + 1, updated_at = ?
       WHERE id = ? AND lifecycle = 'sending' AND outbound_message_id = ?`,
    ).bind(new Date().toISOString(), candidate.id, candidate.outbound_message_id).run();
    if (result.meta?.changes) recovered += 1;
  }
  return { candidates: (candidates.results ?? []).length, recovered };
}

export async function releaseSupportDraftSendClaimInD1(input: {
  db: D1DatabaseLike;
  draftId: string;
  adminUserId: string;
}) {
  const result = await input.db.prepare(
    `UPDATE support_drafts
     SET lifecycle = 'editing', revision = revision + 1, updated_at = ?
     WHERE id = ? AND admin_user_id = ? AND lifecycle = 'sending' AND outbound_message_id IS NULL`,
  ).bind(new Date().toISOString(), input.draftId, input.adminUserId).run();
  return {
    released: Boolean(result.meta?.changes),
    draft: await getSupportDraftForAdminInD1(input.db, input.draftId, input.adminUserId),
  };
}

export async function deleteSupportDraftForAdminInD1(input: {
  db: D1DatabaseLike;
  draftId: string;
  adminUserId: string;
}) {
  const draft = await getSupportDraftForAdminInD1(input.db, input.draftId, input.adminUserId);
  if (!draft || draft.lifecycle === "consumed") return { draft: null, attachments: [] as SupportDraftAttachmentRow[] };
  const attachments = await listSupportDraftAttachmentsInD1(input.db, draft.id);
  const result = await input.db.prepare(
    `DELETE FROM support_drafts WHERE id = ? AND admin_user_id = ? AND lifecycle = 'editing'`,
  ).bind(draft.id, input.adminUserId).run();
  return { draft: result.meta?.changes ? draft : null, attachments: result.meta?.changes ? attachments : [] };
}

export async function listSupportDraftAttachmentKeysForPrivacyRequestInD1(
  db: D1DatabaseLike,
  requesterUserId: string,
) {
  const rows = await db.prepare<{ r2_key: string }>(
    `SELECT attachment.r2_key
     FROM support_draft_attachments attachment
     INNER JOIN support_drafts draft ON draft.id = attachment.draft_id
     INNER JOIN support_conversations conversation ON conversation.id = draft.conversation_id
     WHERE conversation.user_id = ?`,
  ).bind(requesterUserId).all<{ r2_key: string }>();
  return (rows.results ?? []).map((row) => row.r2_key);
}

export async function deleteSupportDraftsForPrivacyRequestInD1(
  db: D1DatabaseLike,
  requesterUserId: string,
) {
  const result = await db.prepare(
    `DELETE FROM support_drafts
     WHERE conversation_id IN (SELECT id FROM support_conversations WHERE user_id = ?)`,
  ).bind(requesterUserId).run();
  return result.meta?.changes ?? 0;
}
