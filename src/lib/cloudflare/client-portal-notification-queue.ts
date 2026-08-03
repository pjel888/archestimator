import { sendCloudflareEmail } from "@/lib/email/cloudflare-email-client";
import { buildSharedLinkRecipientEmailLinks } from "@/lib/publication/email-links";
import { decryptPublicationToken, readPublicationTokenEncryptionSecret } from "@/lib/publication/security";

export const CLIENT_PORTAL_NOTIFICATION_QUEUE_NAME = "archestimator-client-portal-notifications";
export const CLIENT_PORTAL_NOTIFICATION_QUEUE_BINDING = "CLIENT_PORTAL_NOTIFICATIONS_QUEUE";

type D1Result = { meta?: { changes?: number }; results?: unknown[]; success?: boolean };
type D1Statement = { bind(...values: unknown[]): D1Statement; all<T>(): Promise<D1Result & { results?: T[] }>; run(): Promise<D1Result> };
type D1Database = { prepare(sql: string): D1Statement };
type QueueMessage = { ack(): void; body: unknown; retry(options?: { delaySeconds?: number }): void };
type QueueBatch = { messages: readonly QueueMessage[]; queue: string };
type QueueBinding = { sendBatch(messages: Iterable<{ body: ClientPortalNotificationMessage | LegacyPublicationRecipientMessage; contentType: "json" }>): Promise<unknown> | unknown };

export type ClientPortalNotificationMessage = { outboxId: string; version: 1 };
export type LegacyPublicationRecipientMessage = {
  intentId: string;
  kind: "legacy-publication-recipient";
  publicationId: string;
  recipientId: string;
  version: 2;
};
export type ClientPortalNotificationQueueEnv = Record<string, unknown> & {
  ARCH_DB?: D1Database;
  CLIENT_PORTAL_NOTIFICATIONS_QUEUE?: QueueBinding;
  EMAIL?: Parameters<typeof sendCloudflareEmail>[1] extends { binding?: infer Binding } ? Binding : never;
  ARCHESTIMATOR_EMAIL_DELIVERY_ENABLED?: string;
  ARCHESTIMATOR_EMAIL_PROVIDER?: string;
  CLOUDFLARE_EMAIL_FROM?: string;
  CLOUDFLARE_EMAIL_REPLY_TO?: string;
  ARCHESTIMATOR_ALLOWED_APP_ORIGINS?: string;
  ARCHESTIMATOR_PUBLICATION_TOKEN_SECRET?: string;
  NEXT_PUBLIC_APP_URL?: string;
  NEXT_PUBLIC_SITE_URL?: string;
  NODE_ENV?: string;
  PUBLICATION_TOKEN_ENCRYPTION_SECRET?: string;
};

type DeliveryRow = { attempt_count: number; event_type: string; id: string; payload_json: string; recipient_email: string | null; recipient_id: string | null; project_name: string | null };
type LegacyDeliveryIntent = {
  attemptCount: number;
  encryptedRawToken: string;
  expectedPublicationEncryptedToken: string | null;
  expectedRecipientTokenHash: string;
  intentId: string;
  kind: "invitation" | "resend";
  linkBase: string;
  nextAttemptAt: string;
  projectName: string;
  proposedRecipientTokenHash: string;
  providerAcceptedAt?: string;
  providerMessageId?: string | null;
  recipientEmail: string;
  senderEmail: string;
  senderLabel: string;
  state: string;
  version: 1;
};
type LegacyDeliveryRow = {
  current_publication_encrypted_token: string | null;
  delivery_status: string;
  email: string;
  publication_id: string;
  recipient_id: string;
  recipient_token_hash: string;
  resend_delivery_metadata: string;
};

function message(value: unknown): value is ClientPortalNotificationMessage | LegacyPublicationRecipientMessage {
  if (!value || typeof value !== "object") return false;
  if ((value as { version?: unknown }).version === 1) {
    return typeof (value as { outboxId?: unknown }).outboxId === "string"
      && /^outbox_[a-zA-Z0-9-]{8,}$/.test((value as { outboxId: string }).outboxId);
  }
  return (value as { version?: unknown }).version === 2
    && (value as { kind?: unknown }).kind === "legacy-publication-recipient"
    && typeof (value as { intentId?: unknown }).intentId === "string"
    && /^legacy_delivery_[a-zA-Z0-9-]{8,}$/.test((value as { intentId: string }).intentId)
    && typeof (value as { publicationId?: unknown }).publicationId === "string"
    && typeof (value as { recipientId?: unknown }).recipientId === "string";
}

function retryAt(attempt: number, now: Date) {
  return new Date(now.getTime() + Math.min(60, 2 ** Math.min(attempt, 6)) * 60_000).toISOString();
}

function subject(row: DeliveryRow) {
  if (row.event_type === "portal.recipient.reminded") return `Reminder: ${row.project_name ?? "Client Portal"}`;
  if (row.event_type === "decision_submitted") return `Client decision: ${row.project_name ?? "project"}`;
  if (row.event_type === "thread_created" || row.event_type === "message_created") return `Client discussion: ${row.project_name ?? "project"}`;
  return `Client Portal update: ${row.project_name ?? "project"}`;
}

function stringEnv(env: ClientPortalNotificationQueueEnv, key: string) {
  const value = env[key];
  return typeof value === "string" ? value : undefined;
}

function nodeEnv(env: ClientPortalNotificationQueueEnv) {
  const value = stringEnv(env, "NODE_ENV");
  return value === "development" || value === "production" || value === "test" ? value : undefined;
}

function encryptionSecret(env: ClientPortalNotificationQueueEnv) {
  return stringEnv(env, "PUBLICATION_TOKEN_ENCRYPTION_SECRET")
    ?? stringEnv(env, "ARCHESTIMATOR_PUBLICATION_TOKEN_SECRET")
    ?? readPublicationTokenEncryptionSecret();
}

function deliveryBody(row: DeliveryRow, env: ClientPortalNotificationQueueEnv) {
  const payload = JSON.parse(row.payload_json) as Record<string, unknown>;
  const encryptedStableToken = payload.encryptedStableToken;
  if (typeof encryptedStableToken !== "string") {
    if (row.event_type === "portal.recipient.reminded") return "A Client Portal review is awaiting your attention.";
    if (row.event_type === "decision_submitted") return "A recipient submitted an issue-wide Client Portal decision.";
    if (row.event_type === "thread_created" || row.event_type === "message_created") return row.recipient_id
      ? "The project team added a Client Portal discussion message."
      : "A recipient added a Client Portal discussion message.";
    if (row.event_type !== "portal.recipient.invited" && row.event_type !== "portal.recipient.resent") return "There is a new Client Portal update for your review.";
    throw new Error("Missing encrypted Client Portal stable token.");
  }

  const secret = encryptionSecret(env);
  const stableToken = decryptPublicationToken(encryptedStableToken, secret);
  const encryptedBootstrapToken = payload.encryptedBootstrapToken;
  if (typeof encryptedBootstrapToken !== "string") throw new Error("Missing encrypted Client Portal bootstrap token.");
  const bootstrapToken = decryptPublicationToken(encryptedBootstrapToken, secret);
  const links = buildSharedLinkRecipientEmailLinks({
    env: {
      ARCHESTIMATOR_ALLOWED_APP_ORIGINS: stringEnv(env, "ARCHESTIMATOR_ALLOWED_APP_ORIGINS"),
      NEXT_PUBLIC_APP_URL: stringEnv(env, "NEXT_PUBLIC_APP_URL"),
      NEXT_PUBLIC_SITE_URL: stringEnv(env, "NEXT_PUBLIC_SITE_URL"),
      NODE_ENV: nodeEnv(env),
    },
    linkBase: `/share/${encodeURIComponent(stableToken)}`,
    rawToken: bootstrapToken,
  });
  return `There is a new Client Portal update for your review.\n\nOpen Client Portal: ${links.recipientLink}`;
}

function legacyDeliveryIntent(value: string): LegacyDeliveryIntent | null {
  try {
    const intent = JSON.parse(value) as Partial<LegacyDeliveryIntent>;
    if (intent.version !== 1 || (intent.kind !== "invitation" && intent.kind !== "resend")) return null;
    const requiredStrings = [
      intent.encryptedRawToken,
      intent.expectedRecipientTokenHash,
      intent.intentId,
      intent.linkBase,
      intent.nextAttemptAt,
      intent.projectName,
      intent.proposedRecipientTokenHash,
      intent.recipientEmail,
      intent.senderEmail,
      intent.senderLabel,
      intent.state,
    ];
    if (requiredStrings.some((entry) => typeof entry !== "string" || !entry)) return null;
    if (!Number.isInteger(intent.attemptCount) || (intent.attemptCount ?? -1) < 0) return null;
    if (intent.expectedPublicationEncryptedToken !== null && typeof intent.expectedPublicationEncryptedToken !== "string") return null;
    return intent as LegacyDeliveryIntent;
  } catch {
    return null;
  }
}

function escapeEmailHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function legacyDeliveryEmail(intent: LegacyDeliveryIntent, env: ClientPortalNotificationQueueEnv) {
  const rawToken = decryptPublicationToken(intent.encryptedRawToken, encryptionSecret(env));
  const { recipientLink, unsubscribeHref } = buildSharedLinkRecipientEmailLinks({
    env: {
      ARCHESTIMATOR_ALLOWED_APP_ORIGINS: stringEnv(env, "ARCHESTIMATOR_ALLOWED_APP_ORIGINS"),
      NEXT_PUBLIC_APP_URL: stringEnv(env, "NEXT_PUBLIC_APP_URL"),
      NEXT_PUBLIC_SITE_URL: stringEnv(env, "NEXT_PUBLIC_SITE_URL"),
      NODE_ENV: nodeEnv(env),
    },
    linkBase: intent.linkBase,
    rawToken,
  });
  const subjectLine = `Project Estimate: ${intent.projectName} shared by ${intent.senderLabel}`;
  const complianceText = `\n\nYou received this email because ${intent.senderLabel} shared an Archestimator project link with ${intent.recipientEmail}. To unsubscribe from follow-up emails for this shared link, visit ${unsubscribeHref}.`;
  const text = `Hello,\n\n${intent.senderLabel} has shared a view-only estimate for the project "${intent.projectName}" with you.\n\nYou can view the estimate using the following link:\n${recipientLink}\n\nIf you have any questions, please contact ${intent.senderLabel} at ${intent.senderEmail}.\n\nBest regards,\nThe Archestimator Team${complianceText}`;
  const html = `<!doctype html><html><body style="font-family:system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#333;line-height:1.5;font-size:14px"><p>Hello,</p><p><strong>${escapeEmailHtml(intent.senderLabel)}</strong> has shared a view-only estimate for the project <strong>${escapeEmailHtml(intent.projectName)}</strong> with you.</p><p style="margin:16px 0"><a href="${escapeEmailHtml(recipientLink)}" style="background:#292929;color:#fff;padding:10px 16px;text-decoration:none;border-radius:3px;display:inline-block;font-weight:500">View Project Estimate</a></p><p>If you have any questions, please contact ${escapeEmailHtml(intent.senderLabel)} at ${escapeEmailHtml(intent.senderEmail)}.</p><p>Best regards,<br>The Archestimator Team</p><hr style="border:0;border-top:1px solid #e5e5e5;margin:20px 0"><p style="color:#666;font-size:12px;line-height:1.5">You received this email because ${escapeEmailHtml(intent.senderLabel)} shared an Archestimator project link with ${escapeEmailHtml(intent.recipientEmail)}. <a href="${escapeEmailHtml(unsubscribeHref)}">Unsubscribe from follow-up emails</a>.</p></body></html>`;
  return { html, subject: subjectLine, text };
}

export async function enqueuePendingClientPortalNotifications(env: ClientPortalNotificationQueueEnv, now = new Date()) {
  const database = env.ARCH_DB;
  const queue = env.CLIENT_PORTAL_NOTIFICATIONS_QUEUE;
  if (!database || !queue) return { enqueued: 0, skipped: true };
  const pending = await database.prepare("SELECT id FROM client_portal_notification_outbox WHERE state = 'pending' AND next_attempt_at <= ? ORDER BY next_attempt_at ASC, id ASC LIMIT 100").bind(now.toISOString()).all<{ id: string }>();
  if (pending.success === false) throw new Error("Client Portal notification outbox selection failed.");
  const pendingRows = (pending.results ?? []) as Array<{ id: string }>;
  const legacyPending = await database.prepare(`SELECT
      id,
      publication_id,
      json_extract(resend_delivery_metadata, '$.intentId') AS intent_id
    FROM shared_link_recipients
    WHERE (
        json_extract(resend_delivery_metadata, '$.state') = 'pending'
        AND json_extract(resend_delivery_metadata, '$.nextAttemptAt') <= ?
      ) OR (
        json_extract(resend_delivery_metadata, '$.state') = 'processing'
        AND json_extract(resend_delivery_metadata, '$.leaseExpiresAt') <= ?
      )
    ORDER BY json_extract(resend_delivery_metadata, '$.nextAttemptAt') ASC, id ASC
    LIMIT 100`).bind(now.toISOString(), now.toISOString()).all<{ id: string; intent_id: string; publication_id: string }>();
  if (legacyPending.success === false) throw new Error("Legacy publication recipient delivery selection failed.");
  const portalMessages = pendingRows
    .filter((row) => /^outbox_[a-zA-Z0-9-]{8,}$/.test(row.id))
    .map((row) => ({ body: { version: 1 as const, outboxId: row.id }, contentType: "json" as const }));
  const legacyMessages = ((legacyPending.results ?? []) as Array<{ id: string; intent_id: string; publication_id: string }>)
    .filter((row) => typeof row.id === "string" && typeof row.publication_id === "string" && /^legacy_delivery_[a-zA-Z0-9-]{8,}$/.test(row.intent_id))
    .map((row) => ({
      body: {
        intentId: row.intent_id,
        kind: "legacy-publication-recipient" as const,
        publicationId: row.publication_id,
        recipientId: row.id,
        version: 2 as const,
      },
      contentType: "json" as const,
    }));
  const messages = [...portalMessages, ...legacyMessages];
  if (messages.length) await queue.sendBatch(messages);
  return { enqueued: messages.length, skipped: false };
}

async function processMessage(database: D1Database, env: ClientPortalNotificationQueueEnv, value: ClientPortalNotificationMessage) {
  const now = new Date();
  const leaseToken = crypto.randomUUID();
  const leaseExpiresAt = new Date(now.getTime() + 5 * 60_000).toISOString();
  const claim = await database.prepare("UPDATE client_portal_notification_outbox SET state = 'processing', lease_token = ?, lease_expires_at = ?, updated_at = ? WHERE id = ? AND ((state = 'pending' AND next_attempt_at <= ?) OR (state = 'processing' AND lease_expires_at <= ?))").bind(leaseToken, leaseExpiresAt, now.toISOString(), value.outboxId, now.toISOString(), now.toISOString()).run();
  if (claim.success === false) throw new Error("Client Portal notification outbox lease failed.");
  if ((claim.meta?.changes ?? 0) === 0) return "duplicate" as const;
  const row = await database.prepare("SELECT o.id, o.event_type, o.recipient_id, o.attempt_count, o.payload_json, COALESCE(r.email_normalized, owner.email) AS recipient_email, p.name AS project_name FROM client_portal_notification_outbox o LEFT JOIN client_portal_recipients r ON r.id = o.recipient_id LEFT JOIN client_portals cp ON cp.id = o.portal_id LEFT JOIN profiles owner ON owner.id = cp.created_by LEFT JOIN projects p ON p.id = cp.project_id WHERE o.id = ? AND o.lease_token = ? LIMIT 1").bind(value.outboxId, leaseToken).all<DeliveryRow>();
  if (row.success === false || !row.results?.[0]) throw new Error("Client Portal notification outbox row is unavailable.");
  const delivery = row.results[0];
  if (!delivery.recipient_email) {
    await database.prepare("UPDATE client_portal_notification_outbox SET state = 'dead', last_error_code = 'recipient_unavailable', lease_token = NULL, lease_expires_at = NULL, updated_at = ? WHERE id = ? AND lease_token = ?").bind(new Date().toISOString(), delivery.id, leaseToken).run();
    return "dead" as const;
  }
  let text: string;
  try {
    text = deliveryBody(delivery, env);
  } catch {
    await database.prepare("UPDATE client_portal_notification_outbox SET state = 'dead', last_error_code = 'invalid_delivery_payload', lease_token = NULL, lease_expires_at = NULL, updated_at = ? WHERE id = ? AND lease_token = ?").bind(new Date().toISOString(), delivery.id, leaseToken).run();
    return "dead" as const;
  }
  const email = await sendCloudflareEmail({ to: delivery.recipient_email, subject: subject(delivery), text }, { binding: env.EMAIL, context: { env }, env: env as Record<string, string | undefined> });
  if (email.ok) {
    const deliveredAt = new Date().toISOString();
    await database.prepare("UPDATE client_portal_notification_outbox SET state = 'delivered', payload_json = json_remove(payload_json, '$.encryptedBootstrapToken', '$.encryptedStableToken'), delivered_at = ?, lease_token = NULL, lease_expires_at = NULL, last_error_code = NULL, updated_at = ? WHERE id = ? AND lease_token = ?").bind(deliveredAt, deliveredAt, delivery.id, leaseToken).run();
    return "delivered" as const;
  }
  const attempts = delivery.attempt_count + 1;
  const state = attempts >= 10 ? "dead" : "pending";
  await database.prepare("UPDATE client_portal_notification_outbox SET state = ?, attempt_count = ?, next_attempt_at = ?, lease_token = NULL, lease_expires_at = NULL, last_error_code = ?, updated_at = ? WHERE id = ? AND lease_token = ?").bind(state, attempts, retryAt(attempts, now), email.code ?? "email_delivery_failed", new Date().toISOString(), delivery.id, leaseToken).run();
  return state === "dead" ? "dead" as const : "retry" as const;
}

async function finishLegacyIntent(
  database: D1Database,
  value: LegacyPublicationRecipientMessage,
  leaseToken: string,
  state: "dead" | "superseded",
  errorCode: string,
) {
  const at = new Date().toISOString();
  const result = await database.prepare(`UPDATE shared_link_recipients
    SET resend_delivery_metadata = json_remove(
          json_set(resend_delivery_metadata,
            '$.state', ?, '$.lastErrorCode', ?, '$.updatedAt', ?
          ),
          '$.encryptedRawToken', '$.leaseToken', '$.leaseExpiresAt'
        ),
        updated_at = ?
    WHERE publication_id = ? AND id = ?
      AND json_extract(resend_delivery_metadata, '$.intentId') = ?
      AND json_extract(resend_delivery_metadata, '$.leaseToken') = ?`).bind(
    state,
    errorCode,
    at,
    at,
    value.publicationId,
    value.recipientId,
    value.intentId,
    leaseToken,
  ).run();
  if (result.success === false) throw new Error("Legacy publication recipient delivery state update failed.");
}

async function processLegacyPublicationRecipientMessage(
  database: D1Database,
  env: ClientPortalNotificationQueueEnv,
  value: LegacyPublicationRecipientMessage,
) {
  const now = new Date();
  const nowIso = now.toISOString();
  const leaseToken = crypto.randomUUID();
  const leaseExpiresAt = new Date(now.getTime() + 5 * 60_000).toISOString();
  const claim = await database.prepare(`UPDATE shared_link_recipients
    SET resend_delivery_metadata = json_set(
          resend_delivery_metadata,
          '$.state', 'processing', '$.leaseToken', ?, '$.leaseExpiresAt', ?, '$.updatedAt', ?
        ),
        updated_at = ?
    WHERE publication_id = ? AND id = ?
      AND json_extract(resend_delivery_metadata, '$.intentId') = ?
      AND (
        (json_extract(resend_delivery_metadata, '$.state') = 'pending'
          AND json_extract(resend_delivery_metadata, '$.nextAttemptAt') <= ?)
        OR
        (json_extract(resend_delivery_metadata, '$.state') = 'processing'
          AND json_extract(resend_delivery_metadata, '$.leaseExpiresAt') <= ?)
      )`).bind(
    leaseToken,
    leaseExpiresAt,
    nowIso,
    nowIso,
    value.publicationId,
    value.recipientId,
    value.intentId,
    nowIso,
    nowIso,
  ).run();
  if (claim.success === false) throw new Error("Legacy publication recipient delivery lease failed.");
  if ((claim.meta?.changes ?? 0) === 0) {
    const retained = await database.prepare(`SELECT
        json_extract(resend_delivery_metadata, '$.intentId') AS intent_id,
        json_extract(resend_delivery_metadata, '$.state') AS state
      FROM shared_link_recipients
      WHERE publication_id = ? AND id = ?
      LIMIT 1`).bind(value.publicationId, value.recipientId).all<{ intent_id: string; state: string }>();
    if (retained.success === false) throw new Error("Legacy publication recipient delivery replay check failed.");
    const retainedIntent = retained.results?.[0];
    if (retainedIntent?.intent_id === value.intentId && (retainedIntent.state === "pending" || retainedIntent.state === "processing")) {
      return "retry" as const;
    }
    return "duplicate" as const;
  }

  const selected = await database.prepare(`SELECT
      recipient.id AS recipient_id,
      recipient.publication_id,
      recipient.email,
      recipient.recipient_token_hash,
      recipient.delivery_status,
      recipient.resend_delivery_metadata,
      publication.encrypted_token AS current_publication_encrypted_token
    FROM shared_link_recipients recipient
    JOIN project_publications publication ON publication.id = recipient.publication_id
    WHERE recipient.publication_id = ? AND recipient.id = ?
      AND json_extract(recipient.resend_delivery_metadata, '$.intentId') = ?
      AND json_extract(recipient.resend_delivery_metadata, '$.leaseToken') = ?
    LIMIT 1`).bind(value.publicationId, value.recipientId, value.intentId, leaseToken).all<LegacyDeliveryRow>();
  if (selected.success === false || !selected.results?.[0]) throw new Error("Legacy publication recipient delivery row is unavailable.");
  const row = selected.results[0];
  const intent = legacyDeliveryIntent(row.resend_delivery_metadata);
  if (!intent || intent.intentId !== value.intentId) {
    await finishLegacyIntent(database, value, leaseToken, "dead", "invalid_delivery_payload");
    return "dead" as const;
  }
  if (
    row.current_publication_encrypted_token !== intent.expectedPublicationEncryptedToken
    || row.recipient_token_hash !== intent.expectedRecipientTokenHash
  ) {
    await finishLegacyIntent(database, value, leaseToken, "superseded", "delivery_intent_superseded");
    return "superseded" as const;
  }

  let providerAcceptedAt = intent.providerAcceptedAt;
  let providerMessageId = intent.providerMessageId ?? null;
  if (!providerAcceptedAt) {
    let emailBody: ReturnType<typeof legacyDeliveryEmail>;
    try {
      emailBody = legacyDeliveryEmail(intent, env);
    } catch {
      await finishLegacyIntent(database, value, leaseToken, "dead", "invalid_delivery_payload");
      return "dead" as const;
    }
    const email = await sendCloudflareEmail({
      to: row.email,
      replyTo: intent.senderEmail,
      subject: emailBody.subject,
      text: emailBody.text,
      html: emailBody.html,
      headers: { "X-Archestimator-Delivery-Intent": intent.intentId },
    }, { binding: env.EMAIL, context: { env }, env: env as Record<string, string | undefined> });
    if (!email.ok) {
      const attempts = intent.attemptCount + 1;
      const state = attempts >= 10 ? "dead" : "pending";
      const nextAttemptAt = retryAt(attempts, now);
      const failedAt = new Date().toISOString();
      const failure = await database.prepare(`UPDATE shared_link_recipients
        SET delivery_status = CASE
              WHEN ? = 'dead' AND ? = 'invitation' AND recipient_token_hash = ? THEN 'bounced'
              ELSE delivery_status
            END,
            resend_delivery_metadata = json_remove(
              json_set(resend_delivery_metadata,
                '$.state', ?, '$.attemptCount', ?, '$.nextAttemptAt', ?,
                '$.lastErrorCode', ?, '$.updatedAt', ?
              ),
              '$.leaseToken', '$.leaseExpiresAt'
            ),
            updated_at = ?
        WHERE publication_id = ? AND id = ?
          AND json_extract(resend_delivery_metadata, '$.intentId') = ?
          AND json_extract(resend_delivery_metadata, '$.leaseToken') = ?`).bind(
        state,
        intent.kind,
        intent.proposedRecipientTokenHash,
        state,
        attempts,
        nextAttemptAt,
        email.code ?? "email_delivery_failed",
        failedAt,
        failedAt,
        value.publicationId,
        value.recipientId,
        value.intentId,
        leaseToken,
      ).run();
      if (failure.success === false) throw new Error("Legacy publication recipient delivery retry state failed.");
      return state === "dead" ? "dead" as const : "retry" as const;
    }

    providerAcceptedAt = new Date().toISOString();
    providerMessageId = email.messageId ?? null;
    const accepted = await database.prepare(`UPDATE shared_link_recipients
      SET resend_delivery_metadata = json_set(
            resend_delivery_metadata,
            '$.providerAcceptedAt', ?, '$.providerMessageId', ?, '$.updatedAt', ?
          ),
          updated_at = ?
      WHERE publication_id = ? AND id = ?
        AND json_extract(resend_delivery_metadata, '$.intentId') = ?
        AND json_extract(resend_delivery_metadata, '$.leaseToken') = ?`).bind(
      providerAcceptedAt,
      providerMessageId,
      providerAcceptedAt,
      providerAcceptedAt,
      value.publicationId,
      value.recipientId,
      value.intentId,
      leaseToken,
    ).run();
    if (accepted.success === false || (accepted.meta?.changes ?? 0) === 0) {
      throw new Error("Legacy publication recipient provider acceptance could not be persisted.");
    }
  }

  const deliveredAt = new Date().toISOString();
  const finalized = await database.prepare(`UPDATE shared_link_recipients
    SET recipient_token_hash = ?,
        delivery_status = 'sent',
        resend_email_id = ?,
        resend_delivery_metadata = json_remove(
          json_set(resend_delivery_metadata,
            '$.state', 'delivered', '$.deliveredAt', ?, '$.updatedAt', ?, '$.lastErrorCode', NULL
          ),
          '$.encryptedRawToken', '$.leaseToken', '$.leaseExpiresAt'
        ),
        updated_at = ?
    WHERE publication_id = ? AND id = ? AND recipient_token_hash = ?
      AND json_extract(resend_delivery_metadata, '$.intentId') = ?
      AND json_extract(resend_delivery_metadata, '$.leaseToken') = ?
      AND json_extract(resend_delivery_metadata, '$.providerAcceptedAt') IS NOT NULL
      AND EXISTS (
        SELECT 1 FROM project_publications publication
        WHERE publication.id = shared_link_recipients.publication_id
          AND publication.encrypted_token IS ?
      )`).bind(
    intent.proposedRecipientTokenHash,
    providerMessageId,
    deliveredAt,
    deliveredAt,
    deliveredAt,
    value.publicationId,
    value.recipientId,
    intent.expectedRecipientTokenHash,
    value.intentId,
    leaseToken,
    intent.expectedPublicationEncryptedToken,
  ).run();
  if (finalized.success === false) throw new Error("Legacy publication recipient delivery finalization failed.");
  if ((finalized.meta?.changes ?? 0) === 0) {
    await finishLegacyIntent(database, value, leaseToken, "superseded", "delivery_finalization_superseded");
    return "superseded" as const;
  }
  return "delivered" as const;
}

export async function runClientPortalNotificationQueueBatch({ batch, env }: { batch: QueueBatch; env: ClientPortalNotificationQueueEnv }) {
  if (batch.queue !== CLIENT_PORTAL_NOTIFICATION_QUEUE_NAME || !env.ARCH_DB) return { acked: 0, retried: 0 };
  let acked = 0; let retried = 0;
  for (const item of batch.messages) {
    if (!message(item.body)) { item.ack(); acked += 1; continue; }
    try {
      const outcome = item.body.version === 2
        ? await processLegacyPublicationRecipientMessage(env.ARCH_DB, env, item.body)
        : await processMessage(env.ARCH_DB, env, item.body);
      if (outcome === "retry") { item.retry({ delaySeconds: 60 }); retried += 1; } else { item.ack(); acked += 1; }
    } catch { item.retry({ delaySeconds: 60 }); retried += 1; }
  }
  return { acked, retried };
}
