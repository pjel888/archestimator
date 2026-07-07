import "server-only";

import { createHash, randomUUID } from "node:crypto";

import { getCloudflareD1Database, type D1DatabaseLike, type D1Value } from "@/lib/cloudflare/d1";

export type JsonValue = string | number | boolean | null | { [key: string]: JsonValue | undefined } | JsonValue[];

export type PublicationAccessRow = {
  id: string;
  status: "published" | "expired" | "revoked";
  password_hash: string | null;
  expires_at: string | null;
  revoked_at: string | null;
  snapshot_version: number;
};

export type PublicationSnapshotRow = PublicationAccessRow & {
  snapshot_json: JsonValue;
};

export type PublicationWriteContextRow = {
  activity_target_labels_json: JsonValue;
  id: string;
  snapshot_json: JsonValue;
  snapshot_version: number;
};

export type PublicationActivityContextRow = PublicationAccessRow & {
  activity_target_labels_json: JsonValue;
};

export type RecipientIdentityRow = {
  id: string;
  email: string;
  display_name: string | null;
};

export type SharedLinkCommentD1Row = {
  id: string;
  created_at: string;
  body: string;
  author_name: string | null;
  recipient_id: string | null;
  estimate_id: string | null;
  row_id: string | null;
  target_kind: "proposal" | "estimate" | "row";
  target_label: string | null;
  target_secondary_label: string | null;
  snapshot_version_at_comment: number | null;
};

export type SharedLinkDecisionD1Row = {
  decision: string;
  note: string | null;
  created_at: string;
  estimate_id: string | null;
  row_id: string | null;
  target_kind: "proposal" | "estimate" | "row";
  target_label: string | null;
  target_secondary_label: string | null;
  signer_name: string | null;
  signature_intent_hash: string | null;
};

export type SharedLinkActivityCommentD1Row = SharedLinkCommentD1Row & {
  body: string;
  is_internal: boolean;
  author_email: string;
};

export type SharedLinkActivityResponseD1Row = {
  id: string;
  created_at: string;
  decision: "accepted" | "declined" | "revision_requested";
  note: string | null;
  recipient_id: string | null;
  estimate_id: string | null;
  row_id: string | null;
  target_kind: "proposal" | "estimate" | "row";
  target_label: string | null;
  target_secondary_label: string | null;
};

export type SharedLinkActivityEventD1Row = {
  id: string;
  created_at: string;
  event_type: string;
  metadata_json: JsonValue;
  recipient_id: string | null;
};

export type PublicationEventType = "open" | "password_success" | "password_failure" | "download_attempt_blocked" | "password_attempt";

type RawPublicationRow = Omit<PublicationSnapshotRow, "snapshot_json"> & {
  snapshot_json?: string | null;
  activity_target_labels_json?: string | null;
};

type RawWriteContextRow = Omit<PublicationWriteContextRow, "activity_target_labels_json" | "snapshot_json"> & {
  activity_target_labels_json: string | null;
  snapshot_json: string | null;
};

type RawActivityContextRow = Omit<PublicationActivityContextRow, "activity_target_labels_json"> & {
  activity_target_labels_json: string | null;
};

type RawActivityEventRow = Omit<SharedLinkActivityEventD1Row, "metadata_json"> & {
  metadata_json: string | null;
};

type RateLimitCountRow = {
  count: number;
};

function parseJson(value: string | null | undefined, fallback: JsonValue): JsonValue {
  if (!value) return fallback;
  try {
    return JSON.parse(value) as JsonValue;
  } catch {
    return fallback;
  }
}

function jsonText(value: JsonValue | undefined, fallback: JsonValue): string {
  return JSON.stringify(value ?? fallback);
}

function nowIso() {
  return new Date().toISOString();
}

function normalizePublicationRow(row: RawPublicationRow | null): PublicationSnapshotRow | null {
  if (!row) return null;
  return {
    ...row,
    snapshot_json: parseJson(row.snapshot_json, {}),
  };
}

function normalizeWriteContextRow(row: RawWriteContextRow | null): PublicationWriteContextRow | null {
  if (!row) return null;
  return {
    ...row,
    activity_target_labels_json: parseJson(row.activity_target_labels_json, {
      estimateLabels: {},
      rowLabels: {},
      rowEstimateIds: {},
    }),
    snapshot_json: parseJson(row.snapshot_json, {}),
  };
}

function normalizeActivityContextRow(row: RawActivityContextRow | null): PublicationActivityContextRow | null {
  if (!row) return null;
  return {
    ...row,
    activity_target_labels_json: parseJson(row.activity_target_labels_json, {
      estimateLabels: {},
      rowLabels: {},
      rowEstimateIds: {},
    }),
  };
}

function normalizeActivityEventRow(row: RawActivityEventRow): SharedLinkActivityEventD1Row {
  return {
    ...row,
    metadata_json: parseJson(row.metadata_json, {}),
  };
}

function cursorClause(cursor?: { createdAt: string; id: string } | null) {
  if (!cursor) return { sql: "", values: [] as D1Value[] };
  return {
    sql: " AND (created_at < ? OR (created_at = ? AND id < ?))",
    values: [cursor.createdAt, cursor.createdAt, cursor.id] as D1Value[],
  };
}

function normalizeD1Value(value: D1Value | Date): D1Value {
  return value instanceof Date ? value.toISOString() : value;
}

async function getRequiredPublicationD1Database() {
  const database = await getCloudflareD1Database();
  if (!database) {
    throw new Error("Cloudflare D1 ARCH_DB binding is required for publication shared links.");
  }
  return database;
}

async function run<T>(db: D1DatabaseLike, sql: string, values: Array<D1Value | Date> = []) {
  return db.prepare<T>(sql).bind(...values.map(normalizeD1Value)).all<T>();
}

async function first<T>(db: D1DatabaseLike, sql: string, values: Array<D1Value | Date> = []) {
  return db.prepare<T>(sql).bind(...values.map(normalizeD1Value)).first<T>();
}

async function execute(db: D1DatabaseLike, sql: string, values: Array<D1Value | Date> = []) {
  await db.prepare(sql).bind(...values.map(normalizeD1Value)).run();
}

function activePublicationWhere(alias = "") {
  const prefix = alias ? `${alias}.` : "";
  return `${prefix}status = 'published' AND ${prefix}revoked_at IS NULL AND (${prefix}expires_at IS NULL OR ${prefix}expires_at > ?)`;
}

export function createPublicationD1Store(databasePromise: Promise<D1DatabaseLike> = getRequiredPublicationD1Database()) {
  const getDb = () => databasePromise;

  return {
    async getPublicationAccessByTokenHash(tokenHash: string): Promise<PublicationAccessRow | null> {
      const db = await getDb();
      return first<PublicationAccessRow>(
        db,
        `SELECT id, status, password_hash, expires_at, revoked_at, snapshot_version
         FROM project_publications
         WHERE token_hash = ?
         LIMIT 1`,
        [tokenHash],
      );
    },

    async getPublicationSnapshotByTokenHash(tokenHash: string): Promise<PublicationSnapshotRow | null> {
      const db = await getDb();
      const row = await first<RawPublicationRow>(
        db,
        `SELECT id, status, password_hash, snapshot_json, expires_at, revoked_at, snapshot_version
         FROM project_publications
         WHERE token_hash = ?
         LIMIT 1`,
        [tokenHash],
      );
      return normalizePublicationRow(row);
    },

    async getPublicationWriteContextByTokenHash(tokenHash: string): Promise<PublicationWriteContextRow | null> {
      const db = await getDb();
      const row = await first<RawWriteContextRow>(
        db,
        `SELECT id, activity_target_labels_json, snapshot_json, snapshot_version
         FROM project_publications
         WHERE token_hash = ?
         LIMIT 1`,
        [tokenHash],
      );
      return normalizeWriteContextRow(row);
    },

    async getPublicationActivityContextByTokenHash(tokenHash: string): Promise<PublicationActivityContextRow | null> {
      const db = await getDb();
      const row = await first<RawActivityContextRow>(
        db,
        `SELECT id, status, revoked_at, expires_at, password_hash, activity_target_labels_json, snapshot_version
         FROM project_publications
         WHERE token_hash = ?
         LIMIT 1`,
        [tokenHash],
      );
      return normalizeActivityContextRow(row);
    },

    async getPublicationSnapshotById(publicationId: string): Promise<JsonValue | null> {
      const db = await getDb();
      const row = await first<{ snapshot_json: string | null }>(
        db,
        "SELECT snapshot_json FROM project_publications WHERE id = ? LIMIT 1",
        [publicationId],
      );
      return row ? parseJson(row.snapshot_json, {}) : null;
    },

    async insertRateLimitEvent(input: {
      keyHash: string;
      metadata?: Record<string, JsonValue>;
      scope: string;
      ttlSeconds: number;
    }) {
      const db = await getDb();
      const at = nowIso();
      await execute(
        db,
        `INSERT INTO security_rate_limit_events (id, scope, key_hash, metadata_json, occurred_at, expires_at)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          randomUUID(),
          input.scope,
          input.keyHash,
          jsonText(input.metadata ?? {}, {}),
          at,
          new Date(Date.now() + input.ttlSeconds * 1000).toISOString(),
        ],
      );
    },

    async countRateLimitEvents(input: { activeAt?: string; keyHash: string; scope: string; since: string }) {
      const db = await getDb();
      const activeFilter = input.activeAt ? " AND expires_at > ?" : "";
      const row = await first<RateLimitCountRow>(
        db,
        `SELECT COUNT(*) AS count
         FROM security_rate_limit_events
         WHERE scope = ? AND key_hash = ? AND occurred_at >= ?${activeFilter}`,
        input.activeAt
          ? [input.scope, input.keyHash, input.since, input.activeAt]
          : [input.scope, input.keyHash, input.since],
      );
      return row?.count ?? 0;
    },

    async deleteRateLimitEvents(scope: string, keyHash: string) {
      const db = await getDb();
      await execute(db, "DELETE FROM security_rate_limit_events WHERE scope = ? AND key_hash = ?", [scope, keyHash]);
    },

    async cleanupExpiredRateLimitEvents(now = Date.now()) {
      const db = await getDb();
      await execute(db, "DELETE FROM security_rate_limit_events WHERE expires_at < ?", [new Date(now).toISOString()]);
    },

    async insertPublicationEvent(input: {
      eventType: PublicationEventType;
      ipHash: string | null;
      metadata: Record<string, JsonValue>;
      publicationId: string;
      userAgentHash: string | null;
    }) {
      const db = await getDb();
      await execute(
        db,
        `INSERT INTO project_publication_events
          (id, publication_id, event_type, metadata_json, ip_hash, user_agent_hash, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          randomUUID(),
          input.publicationId,
          input.eventType,
          jsonText(input.metadata, {}),
          input.ipHash,
          input.userAgentHash,
          nowIso(),
        ],
      );
    },

    async incrementPublicationOpen(publicationId: string) {
      const db = await getDb();
      const at = nowIso();
      await execute(
        db,
        `UPDATE project_publications
         SET open_count = open_count + 1,
             latest_opened_at = ?,
             updated_at = ?
         WHERE id = ?
           AND ${activePublicationWhere()}`,
        [at, at, publicationId, at],
      );
    },

    async markRecipientOpened(input: { publicationId: string; recipientId: string; openedAt: string }) {
      const db = await getDb();
      await execute(
        db,
        `UPDATE shared_link_recipients
         SET delivery_status = 'opened',
             last_opened_at = ?,
             updated_at = ?
         WHERE publication_id = ? AND id = ?`,
        [input.openedAt, input.openedAt, input.publicationId, input.recipientId],
      );
    },

    async insertSharedLinkEvent(input: {
      eventType: "open" | "comment_add" | "accept_decision" | "decline_decision" | "password_attempt";
      ipHash: string | null;
      metadata: Record<string, JsonValue>;
      publicationId: string;
      recipientId: string | null;
      userAgentHash: string | null;
    }) {
      const db = await getDb();
      await execute(
        db,
        `INSERT INTO shared_link_events
          (id, publication_id, recipient_id, event_type, metadata_json, ip_hash, user_agent_hash, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          randomUUID(),
          input.publicationId,
          input.recipientId,
          input.eventType,
          jsonText(input.metadata, {}),
          input.ipHash,
          input.userAgentHash,
          nowIso(),
        ],
      );
    },

    async getRecipientByTokenHash(publicationId: string, recipientTokenHash: string): Promise<RecipientIdentityRow | null> {
      const db = await getDb();
      return first<RecipientIdentityRow>(
        db,
        `SELECT id, email, display_name
         FROM shared_link_recipients
         WHERE publication_id = ? AND recipient_token_hash = ?
         LIMIT 1`,
        [publicationId, recipientTokenHash],
      );
    },

    async markRecipientUnsubscribed(publicationId: string, recipientTokenHash: string): Promise<RecipientIdentityRow | null> {
      const db = await getDb();
      const at = nowIso();
      await execute(
        db,
        `UPDATE shared_link_recipients
         SET email_unsubscribed_at = ?,
             updated_at = ?
         WHERE publication_id = ? AND recipient_token_hash = ?`,
        [at, at, publicationId, recipientTokenHash],
      );
      return first<RecipientIdentityRow>(
        db,
        `SELECT id, email, display_name
         FROM shared_link_recipients
         WHERE publication_id = ? AND recipient_token_hash = ?
         LIMIT 1`,
        [publicationId, recipientTokenHash],
      );
    },

    async getRecipientIdentity(publicationId: string, recipientId: string): Promise<RecipientIdentityRow | null> {
      const db = await getDb();
      return first<RecipientIdentityRow>(
        db,
        `SELECT id, email, display_name
         FROM shared_link_recipients
         WHERE publication_id = ? AND id = ?
         LIMIT 1`,
        [publicationId, recipientId],
      );
    },

    async getRecipientTokenHash(publicationId: string, recipientId: string): Promise<string | null> {
      const db = await getDb();
      const row = await first<{ recipient_token_hash: string | null }>(
        db,
        `SELECT recipient_token_hash
         FROM shared_link_recipients
         WHERE publication_id = ? AND id = ?
         LIMIT 1`,
        [publicationId, recipientId],
      );
      return row?.recipient_token_hash ?? null;
    },

    async listPublicComments(publicationId: string, limit = 200): Promise<SharedLinkCommentD1Row[]> {
      const db = await getDb();
      const result = await run<SharedLinkCommentD1Row>(
        db,
        `SELECT id, created_at, body, author_name, recipient_id, estimate_id, row_id,
                target_kind, target_label, target_secondary_label, snapshot_version_at_comment
         FROM shared_link_comments
         WHERE publication_id = ? AND is_internal = 0
         ORDER BY created_at ASC, id ASC
         LIMIT ?`,
        [publicationId, limit],
      );
      return result.results ?? [];
    },

    async listPublicActivityComments(input: {
      cursor?: { createdAt: string; id: string } | null;
      limit: number;
      publicationId: string;
    }): Promise<SharedLinkActivityCommentD1Row[]> {
      const db = await getDb();
      const cursor = cursorClause(input.cursor);
      const result = await run<SharedLinkActivityCommentD1Row>(
        db,
        `SELECT id, created_at, body, is_internal, author_email, author_name, recipient_id,
                estimate_id, row_id, target_kind, target_label, target_secondary_label,
                snapshot_version_at_comment
         FROM shared_link_comments
         WHERE publication_id = ? AND is_internal = 0${cursor.sql}
         ORDER BY created_at DESC, id DESC
         LIMIT ?`,
        [input.publicationId, ...cursor.values, input.limit],
      );
      return (result.results ?? []).map((row) => ({
        ...row,
        is_internal: Boolean(row.is_internal),
      }));
    },

    async listRecipientActivityResponses(input: {
      cursor?: { createdAt: string; id: string } | null;
      limit: number;
      publicationId: string;
      recipientId: string;
    }): Promise<SharedLinkActivityResponseD1Row[]> {
      const db = await getDb();
      const cursor = cursorClause(input.cursor);
      const result = await run<SharedLinkActivityResponseD1Row>(
        db,
        `SELECT id, created_at, decision, note, recipient_id, estimate_id, row_id,
                target_kind, target_label, target_secondary_label
         FROM shared_link_responses
         WHERE publication_id = ? AND recipient_id = ?${cursor.sql}
         ORDER BY created_at DESC, id DESC
         LIMIT ?`,
        [input.publicationId, input.recipientId, ...cursor.values, input.limit],
      );
      return result.results ?? [];
    },

    async listRecipientActivityEvents(input: {
      cursor?: { createdAt: string; id: string } | null;
      limit: number;
      publicationId: string;
      recipientId: string;
    }): Promise<SharedLinkActivityEventD1Row[]> {
      const db = await getDb();
      const cursor = cursorClause(input.cursor);
      const result = await run<RawActivityEventRow>(
        db,
        `SELECT id, created_at, event_type, metadata_json, recipient_id
         FROM shared_link_events
         WHERE publication_id = ? AND recipient_id = ?${cursor.sql}
         ORDER BY created_at DESC, id DESC
         LIMIT ?`,
        [input.publicationId, input.recipientId, ...cursor.values, input.limit],
      );
      return (result.results ?? []).map(normalizeActivityEventRow);
    },

    async listRecipientDisplayNames(publicationId: string, recipientIds: string[]): Promise<RecipientIdentityRow[]> {
      if (!recipientIds.length) return [];
      const db = await getDb();
      const placeholders = recipientIds.map(() => "?").join(", ");
      const result = await run<RecipientIdentityRow>(
        db,
        `SELECT id, email, display_name
         FROM shared_link_recipients
         WHERE publication_id = ? AND id IN (${placeholders})
         LIMIT 500`,
        [publicationId, ...recipientIds],
      );
      return result.results ?? [];
    },

    async getComment(publicationId: string, commentId: string): Promise<SharedLinkCommentD1Row | null> {
      const db = await getDb();
      return first<SharedLinkCommentD1Row>(
        db,
        `SELECT id, created_at, body, author_name, recipient_id, estimate_id, row_id,
                target_kind, target_label, target_secondary_label, snapshot_version_at_comment
         FROM shared_link_comments
         WHERE publication_id = ? AND id = ? AND is_internal = 0
         LIMIT 1`,
        [publicationId, commentId],
      );
    },

    async getLatestRecipientDecision(publicationId: string, recipientId: string): Promise<SharedLinkDecisionD1Row | null> {
      const db = await getDb();
      return first<SharedLinkDecisionD1Row>(
        db,
        `SELECT decision, note, created_at, estimate_id, row_id, target_kind,
                target_label, target_secondary_label, signer_name, signature_intent_hash
         FROM shared_link_responses
         WHERE publication_id = ? AND recipient_id = ?
         ORDER BY created_at DESC
         LIMIT 1`,
        [publicationId, recipientId],
      );
    },

    async insertClientComment(input: {
      body: string;
      estimateId: string | null;
      expectedSnapshotVersion: number;
      publicationId: string;
      recipientTokenHash: string;
      rowId: string | null;
      targetKind: "proposal" | "estimate" | "row";
      targetLabel: string | null;
      targetSecondaryLabel: string | null;
      tokenHash: string;
    }): Promise<string | null> {
      const db = await getDb();
      const activeAt = nowIso();
      const publication = await first<{ id: string; snapshot_version: number }>(
        db,
        `SELECT id, snapshot_version
         FROM project_publications
         WHERE token_hash = ?
           AND ${activePublicationWhere()}
         LIMIT 1`,
        [input.tokenHash, activeAt],
      );
      if (!publication) throw new Error("Publication not found or expired.");
      if (publication.id !== input.publicationId || publication.snapshot_version !== input.expectedSnapshotVersion) {
        throw new Error("Publication snapshot version changed.");
      }

      const recipient = await first<{ id: string; email: string }>(
        db,
        `SELECT id, email
         FROM shared_link_recipients
         WHERE publication_id = ? AND recipient_token_hash = ?
         LIMIT 1`,
        [publication.id, input.recipientTokenHash],
      );
      if (!recipient) throw new Error("Recipient not found.");

      const id = randomUUID();
      await execute(
        db,
        `INSERT INTO shared_link_comments
          (id, publication_id, recipient_id, author_email, estimate_id, row_id, body,
           target_kind, target_label, target_secondary_label, snapshot_version_at_comment, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          id,
          publication.id,
          recipient.id,
          recipient.email,
          input.estimateId,
          input.rowId,
          input.body.slice(0, 1000),
          input.targetKind,
          input.targetLabel,
          input.targetSecondaryLabel,
          input.expectedSnapshotVersion,
          nowIso(),
        ],
      );
      return id;
    },

    async submitClientResponse(input: {
      decision: "accepted" | "declined" | "revision_requested";
      estimateId: string | null;
      expectedSnapshotVersion: number;
      note: string | null;
      publicationId: string;
      recipientTokenHash: string;
      rowId: string | null;
      signerName: string | null;
      targetKind: "proposal" | "estimate" | "row";
      targetLabel: string | null;
      targetSecondaryLabel: string | null;
      tokenHash: string;
    }): Promise<string | null> {
      const db = await getDb();
      const activeAt = nowIso();
      const publication = await first<{ id: string; snapshot_version: number }>(
        db,
        `SELECT id, snapshot_version
         FROM project_publications
         WHERE token_hash = ?
           AND ${activePublicationWhere()}
         LIMIT 1`,
        [input.tokenHash, activeAt],
      );
      if (!publication) throw new Error("Publication not found or expired.");
      if (publication.id !== input.publicationId || publication.snapshot_version !== input.expectedSnapshotVersion) {
        throw new Error("Publication snapshot version changed.");
      }

      const recipient = await first<{ id: string }>(
        db,
        `SELECT id
         FROM shared_link_recipients
         WHERE publication_id = ? AND recipient_token_hash = ?
         LIMIT 1`,
        [publication.id, input.recipientTokenHash],
      );
      if (!recipient) throw new Error("Recipient not found.");

      const duplicate = await first<{ id: string }>(
        db,
        "SELECT id FROM shared_link_responses WHERE publication_id = ? AND recipient_id = ? LIMIT 1",
        [publication.id, recipient.id],
      );
      if (duplicate) return null;

      const submittedAt = nowIso();
      const signerName = input.decision === "accepted" ? input.signerName?.trim().slice(0, 120) || null : null;
      if (input.decision === "accepted" && !signerName) {
        throw new Error("Signer name is required for accepted decisions.");
      }
      const signatureIntentHash = signerName
        ? createHash("sha256")
            .update(`${publication.id}:${input.expectedSnapshotVersion}:${signerName}:${submittedAt}`)
            .digest("hex")
        : null;

      const id = randomUUID();
      await execute(
        db,
        `INSERT INTO shared_link_responses
          (id, publication_id, recipient_id, decision, note, snapshot_version_at_decision,
           estimate_id, row_id, signer_name, signature_intent_hash, target_kind,
           target_label, target_secondary_label, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          id,
          publication.id,
          recipient.id,
          input.decision,
          input.note?.slice(0, 2000) ?? null,
          input.expectedSnapshotVersion,
          input.estimateId,
          input.rowId,
          signerName,
          signatureIntentHash,
          input.targetKind,
          input.targetLabel,
          input.targetSecondaryLabel,
          submittedAt,
        ],
      );
      return id;
    },
  };
}

export type PublicationD1Store = ReturnType<typeof createPublicationD1Store>;
