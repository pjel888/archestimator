import "server-only";

import { getCloudflareD1Database, type D1DatabaseLike } from "@/lib/cloudflare/d1";
import type { ClosedBetaAccessResult, ClosedBetaAccessStatus } from "@/lib/auth/closed-beta-access";
import type { ClosedBetaAllowlistRow, ClosedBetaAllowlistStatus } from "@/lib/auth/beta-allowlist-admin";
import {
  resolveClosedBetaInviteOrigin,
  sendClosedBetaInviteEmail,
} from "@/lib/auth/closed-beta-invite-email";
import type { CloudflareEmailClientOptions } from "@/lib/email/cloudflare-email-client";

type ClosedBetaAccessRow = {
  normalized_email: string;
  status: string;
};

type ClosedBetaAllowlistD1Row = {
  accepted_at: string | null;
  created_at: string;
  id: string;
  invited_at: string;
  invited_by: string | null;
  invite_email_sent_at: string | null;
  normalized_email: string;
  notes: string | null;
  status: string;
  updated_at: string;
};

type PendingInviteRow = {
  id: string;
  normalized_email: string;
};

function isClosedBetaAccessStatus(value: string): value is Exclude<ClosedBetaAccessStatus, "disabled" | "no-email" | "error"> {
  return value === "missing" || value === "invited" || value === "active" || value === "revoked";
}

function toClosedBetaAccessResult(row: ClosedBetaAccessRow | null, normalizedEmail: string): ClosedBetaAccessResult {
  if (!row) {
    return { allowed: false, status: "missing", normalizedEmail };
  }

  const status = isClosedBetaAccessStatus(row.status) ? row.status : "error";
  const rowEmail = row.normalized_email || normalizedEmail;
  return {
    allowed: status === "invited" || status === "active",
    status,
    normalizedEmail: rowEmail,
  };
}

function toAllowlistRow(row: ClosedBetaAllowlistD1Row): ClosedBetaAllowlistRow {
  return {
    accepted_at: row.accepted_at,
    created_at: row.created_at,
    id: row.id,
    invited_at: row.invited_at,
    invited_by: row.invited_by,
    invite_email_sent_at: row.invite_email_sent_at ?? null,
    normalized_email: row.normalized_email,
    notes: row.notes,
    status: row.status as ClosedBetaAllowlistStatus,
    updated_at: row.updated_at,
  };
}

function metadataJson(input: Record<string, unknown>) {
  return JSON.stringify(input);
}

export async function getClosedBetaAccessFromD1(
  db: D1DatabaseLike,
  normalizedEmail: string,
): Promise<ClosedBetaAccessResult> {
  const row = await db
    .prepare<ClosedBetaAccessRow>(
      `
        SELECT normalized_email, status
        FROM closed_beta_allowed_emails
        WHERE normalized_email = ?
        LIMIT 1
      `,
    )
    .bind(normalizedEmail)
    .first<ClosedBetaAccessRow>();

  return toClosedBetaAccessResult(row, normalizedEmail);
}

export async function getClosedBetaAccessFromCloudflareD1(normalizedEmail: string): Promise<ClosedBetaAccessResult | null> {
  const db = await getCloudflareD1Database();
  return db ? getClosedBetaAccessFromD1(db, normalizedEmail) : null;
}

export async function markClosedBetaAllowlistAcceptedInD1(
  db: D1DatabaseLike,
  normalizedEmail: string,
): Promise<{ promoted: boolean }> {
  const email = normalizedEmail.trim().toLowerCase();
  if (!email) return { promoted: false };

  const now = new Date().toISOString();
  const update = await db
    .prepare(
      `
        UPDATE closed_beta_allowed_emails
        SET
          status = 'active',
          accepted_at = COALESCE(accepted_at, ?),
          updated_at = ?
        WHERE normalized_email = ?
          AND status = 'invited'
      `,
    )
    .bind(now, now, email)
    .run();

  return { promoted: (update.meta?.changes ?? 0) > 0 };
}

export async function reconcileClosedBetaAllowlistAcceptedFromUsersInD1(
  db?: D1DatabaseLike | null,
): Promise<{ promoted: number }> {
  const database = db ?? (await getCloudflareD1Database());
  if (!database) return { promoted: 0 };

  const now = new Date().toISOString();
  const update = await database
    .prepare(
      `
        UPDATE closed_beta_allowed_emails
        SET
          status = 'active',
          accepted_at = COALESCE(accepted_at, ?),
          updated_at = ?
        WHERE status = 'invited'
          AND EXISTS (
            SELECT 1
            FROM "user" AS auth_user
            WHERE lower(trim(auth_user.email)) = closed_beta_allowed_emails.normalized_email
          )
      `,
    )
    .bind(now, now)
    .run();

  return { promoted: update.meta?.changes ?? 0 };
}

export async function readClosedBetaAllowlistQueueFromD1(status: ClosedBetaAllowlistStatus | null): Promise<ClosedBetaAllowlistRow[]> {
  const db = await getCloudflareD1Database();
  if (!db) throw new Error("Cloudflare D1 is not available for closed beta allowlist reads.");

  await reconcileClosedBetaAllowlistAcceptedFromUsersInD1(db);

  const statusFilter = status ? "WHERE status = ?" : "";
  const statement = db.prepare<ClosedBetaAllowlistD1Row>(
    `
      SELECT
        id,
        normalized_email,
        status,
        invited_by,
        invited_at,
        accepted_at,
        invite_email_sent_at,
        notes,
        created_at,
        updated_at
      FROM closed_beta_allowed_emails
      ${statusFilter}
      ORDER BY created_at DESC
      LIMIT 100
    `,
  );

  const result = status ? await statement.bind(status).all<ClosedBetaAllowlistD1Row>() : await statement.all<ClosedBetaAllowlistD1Row>();
  return (result.results ?? []).map(toAllowlistRow);
}

export async function createClosedBetaAllowlistEntryInD1({
  actorUserId,
  email,
  notes,
  status,
}: {
  actorUserId: string;
  email: string;
  notes: string | null;
  status: ClosedBetaAllowlistStatus;
}) {
  const result = await createClosedBetaAllowlistEntriesInD1({
    actorUserId,
    emails: [email],
    notes,
    status,
  });
  if (result.created === 0) {
    throw new Error("Closed beta allowlist entry already exists or was not created.");
  }
  return result;
}

export async function createClosedBetaAllowlistEntriesInD1({
  actorUserId,
  emails,
  notes,
  status,
}: {
  actorUserId: string;
  emails: string[];
  notes: string | null;
  status: ClosedBetaAllowlistStatus;
}) {
  const db = await getCloudflareD1Database();
  if (!db) throw new Error("Cloudflare D1 is not available for closed beta allowlist writes.");

  const now = new Date().toISOString();
  let created = 0;
  const createdEmails: string[] = [];

  for (const email of emails) {
    const id = crypto.randomUUID();
    const insert = await db
      .prepare(
        `
          INSERT OR IGNORE INTO closed_beta_allowed_emails (
            id,
            normalized_email,
            status,
            invited_by,
            invited_at,
            accepted_at,
            notes,
            metadata_json,
            created_at,
            updated_at
          )
          VALUES (?, ?, ?, ?, ?, NULL, ?, '{}', ?, ?)
        `,
      )
      .bind(id, email, status, actorUserId, now, notes, now, now)
      .run();

    if ((insert.meta?.changes ?? 0) === 0) continue;
    created += 1;
    createdEmails.push(email);

    await db
      .prepare(
        `
          INSERT INTO closed_beta_allowlist_audit_events (
            id,
            allowlist_entry_id,
            actor_user_id,
            event_type,
            metadata_json,
            created_at
          )
          VALUES (?, ?, ?, 'created', ?, ?)
          ON CONFLICT(allowlist_entry_id, event_type, actor_user_id, metadata_json) DO NOTHING
        `,
      )
      .bind(crypto.randomUUID(), id, actorUserId, metadataJson({ status }), now)
      .run();
  }

  return { created, requested: emails.length, createdEmails };
}

export async function markClosedBetaInviteEmailSentInD1(
  db: D1DatabaseLike,
  entryId: string,
  sentAt = new Date().toISOString(),
) {
  await db
    .prepare(
      `
        UPDATE closed_beta_allowed_emails
        SET invite_email_sent_at = COALESCE(invite_email_sent_at, ?), updated_at = ?
        WHERE id = ?
          AND invite_email_sent_at IS NULL
      `,
    )
    .bind(sentAt, sentAt, entryId)
    .run();
}

export async function listPendingClosedBetaInviteEmailsFromD1(
  db: D1DatabaseLike,
  limit = 50,
): Promise<PendingInviteRow[]> {
  const result = await db
    .prepare<PendingInviteRow>(
      `
        SELECT id, normalized_email
        FROM closed_beta_allowed_emails
        WHERE invite_email_sent_at IS NULL
          AND status IN ('invited', 'active')
        ORDER BY created_at ASC
        LIMIT ?
      `,
    )
    .bind(limit)
    .all<PendingInviteRow>();

  return result.results ?? [];
}

export async function deliverPendingClosedBetaInviteEmailsFromD1({
  db,
  cloudflareOptions,
  limit = 50,
  origin,
}: {
  db?: D1DatabaseLike | null;
  cloudflareOptions?: CloudflareEmailClientOptions;
  limit?: number;
  origin?: string;
} = {}): Promise<{ attempted: number; sent: number; failed: number }> {
  const database = db ?? (await getCloudflareD1Database());
  if (!database) return { attempted: 0, sent: 0, failed: 0 };

  const pending = await listPendingClosedBetaInviteEmailsFromD1(database, limit);
  let sent = 0;
  let failed = 0;
  const resolvedOrigin =
    origin
    ?? resolveClosedBetaInviteOrigin(
      (cloudflareOptions?.env as Record<string, string | undefined> | undefined) ?? process.env,
    );

  for (const row of pending) {
    const result = await sendClosedBetaInviteEmail({
      email: row.normalized_email,
      origin: resolvedOrigin,
      cloudflareOptions,
    });
    if (!result.ok) {
      failed += 1;
      continue;
    }
    await markClosedBetaInviteEmailSentInD1(database, row.id);
    sent += 1;
  }

  return { attempted: pending.length, sent, failed };
}

export async function sendClosedBetaInviteEmailsForCreatedEntriesInD1({
  emails,
}: {
  emails: string[];
}): Promise<{ attempted: number; sent: number; failed: number }> {
  const db = await getCloudflareD1Database();
  if (!db || emails.length === 0) return { attempted: 0, sent: 0, failed: 0 };

  let sent = 0;
  let failed = 0;
  const origin = resolveClosedBetaInviteOrigin();

  for (const email of emails) {
    const row = await db
      .prepare<PendingInviteRow>(
        `
          SELECT id, normalized_email
          FROM closed_beta_allowed_emails
          WHERE normalized_email = ?
            AND invite_email_sent_at IS NULL
            AND status IN ('invited', 'active')
          LIMIT 1
        `,
      )
      .bind(email)
      .first<PendingInviteRow>();

    if (!row) continue;

    const result = await sendClosedBetaInviteEmail({ email: row.normalized_email, origin });
    if (!result.ok) {
      failed += 1;
      continue;
    }
    await markClosedBetaInviteEmailSentInD1(db, row.id);
    sent += 1;
  }

  return { attempted: emails.length, sent, failed };
}

export async function updateClosedBetaAllowlistEntryInD1({
  actorUserId,
  id,
  notes,
  status,
}: {
  actorUserId: string;
  id: string;
  notes: string | null;
  status: ClosedBetaAllowlistStatus;
}) {
  const db = await getCloudflareD1Database();
  if (!db) throw new Error("Cloudflare D1 is not available for closed beta allowlist writes.");

  const now = new Date().toISOString();
  const update =
    status === "active"
      ? await db
          .prepare(
            `
              UPDATE closed_beta_allowed_emails
              SET
                status = ?,
                notes = ?,
                accepted_at = COALESCE(accepted_at, ?),
                updated_at = ?
              WHERE id = ?
            `,
          )
          .bind(status, notes, now, now, id)
          .run()
      : await db
          .prepare(
            `
              UPDATE closed_beta_allowed_emails
              SET status = ?, notes = ?, updated_at = ?
              WHERE id = ?
            `,
          )
          .bind(status, notes, now, id)
          .run();

  if ((update.meta?.changes ?? 0) === 0) throw new Error("Closed beta allowlist entry was not updated.");

  await db
    .prepare(
      `
        INSERT INTO closed_beta_allowlist_audit_events (
          id,
          allowlist_entry_id,
          actor_user_id,
          event_type,
          metadata_json,
          created_at
        )
        VALUES (?, ?, ?, 'updated', ?, ?)
        ON CONFLICT(allowlist_entry_id, event_type, actor_user_id, metadata_json) DO NOTHING
      `,
    )
    .bind(crypto.randomUUID(), id, actorUserId, metadataJson({ status }), now)
    .run();
}
