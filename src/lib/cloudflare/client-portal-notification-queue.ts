import { sendCloudflareEmail } from "@/lib/email/cloudflare-email-client";

export const CLIENT_PORTAL_NOTIFICATION_QUEUE_NAME = "archestimator-client-portal-notifications";
export const CLIENT_PORTAL_NOTIFICATION_QUEUE_BINDING = "CLIENT_PORTAL_NOTIFICATIONS_QUEUE";

type D1Result = { meta?: { changes?: number }; results?: unknown[]; success?: boolean };
type D1Statement = { bind(...values: unknown[]): D1Statement; all<T>(): Promise<D1Result & { results?: T[] }>; run(): Promise<D1Result> };
type D1Database = { prepare(sql: string): D1Statement };
type QueueMessage = { ack(): void; body: unknown; retry(options?: { delaySeconds?: number }): void };
type QueueBatch = { messages: readonly QueueMessage[]; queue: string };
type QueueBinding = { sendBatch(messages: Iterable<{ body: ClientPortalNotificationMessage; contentType: "json" }>): Promise<unknown> | unknown };

export type ClientPortalNotificationMessage = { outboxId: string; version: 1 };
export type ClientPortalNotificationQueueEnv = Record<string, unknown> & {
  ARCH_DB?: D1Database;
  CLIENT_PORTAL_NOTIFICATIONS_QUEUE?: QueueBinding;
  EMAIL?: Parameters<typeof sendCloudflareEmail>[1] extends { binding?: infer Binding } ? Binding : never;
  ARCHESTIMATOR_EMAIL_DELIVERY_ENABLED?: string;
  ARCHESTIMATOR_EMAIL_PROVIDER?: string;
  CLOUDFLARE_EMAIL_FROM?: string;
  CLOUDFLARE_EMAIL_REPLY_TO?: string;
};

type DeliveryRow = { attempt_count: number; event_type: string; id: string; recipient_email: string | null; recipient_id: string | null; project_name: string | null };

function message(value: unknown): value is ClientPortalNotificationMessage {
  return Boolean(value && typeof value === "object" && (value as { version?: unknown }).version === 1 && typeof (value as { outboxId?: unknown }).outboxId === "string" && /^outbox_[a-zA-Z0-9-]{8,}$/.test((value as { outboxId: string }).outboxId));
}

function retryAt(attempt: number, now: Date) {
  return new Date(now.getTime() + Math.min(60, 2 ** Math.min(attempt, 6)) * 60_000).toISOString();
}

function subject(row: DeliveryRow) {
  return row.event_type === "portal.recipient.reminded" ? `Reminder: ${row.project_name ?? "Client Portal"}` : `Client Portal update: ${row.project_name ?? "project"}`;
}

function body(row: DeliveryRow) {
  return row.event_type === "portal.recipient.reminded" ? "A Client Portal review is awaiting your attention." : "There is a new Client Portal update for your review.";
}

export async function enqueuePendingClientPortalNotifications(env: ClientPortalNotificationQueueEnv, now = new Date()) {
  const database = env.ARCH_DB;
  const queue = env.CLIENT_PORTAL_NOTIFICATIONS_QUEUE;
  if (!database || !queue) return { enqueued: 0, skipped: true };
  const pending = await database.prepare("SELECT id FROM client_portal_notification_outbox WHERE state = 'pending' AND next_attempt_at <= ? ORDER BY next_attempt_at ASC, id ASC LIMIT 100").bind(now.toISOString()).all<{ id: string }>();
  if (pending.success === false) throw new Error("Client Portal notification outbox selection failed.");
  const pendingRows = (pending.results ?? []) as Array<{ id: string }>;
  const messages = pendingRows.filter((row) => /^outbox_[a-zA-Z0-9-]{8,}$/.test(row.id)).map((row) => ({ body: { version: 1 as const, outboxId: row.id }, contentType: "json" as const }));
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
  const row = await database.prepare("SELECT o.id, o.event_type, o.recipient_id, o.attempt_count, r.email_normalized AS recipient_email, p.name AS project_name FROM client_portal_notification_outbox o LEFT JOIN client_portal_recipients r ON r.id = o.recipient_id LEFT JOIN client_portals cp ON cp.id = o.portal_id LEFT JOIN projects p ON p.id = cp.project_id WHERE o.id = ? AND o.lease_token = ? LIMIT 1").bind(value.outboxId, leaseToken).all<DeliveryRow>();
  if (row.success === false || !row.results?.[0]) throw new Error("Client Portal notification outbox row is unavailable.");
  const delivery = row.results[0];
  if (!delivery.recipient_email) {
    await database.prepare("UPDATE client_portal_notification_outbox SET state = 'dead', last_error_code = 'recipient_unavailable', lease_token = NULL, lease_expires_at = NULL, updated_at = ? WHERE id = ? AND lease_token = ?").bind(new Date().toISOString(), delivery.id, leaseToken).run();
    return "dead" as const;
  }
  const email = await sendCloudflareEmail({ to: delivery.recipient_email, subject: subject(delivery), text: body(delivery) }, { binding: env.EMAIL, context: { env }, env: env as Record<string, string | undefined> });
  if (email.ok) {
    const deliveredAt = new Date().toISOString();
    await database.prepare("UPDATE client_portal_notification_outbox SET state = 'delivered', delivered_at = ?, lease_token = NULL, lease_expires_at = NULL, last_error_code = NULL, updated_at = ? WHERE id = ? AND lease_token = ?").bind(deliveredAt, deliveredAt, delivery.id, leaseToken).run();
    return "delivered" as const;
  }
  const attempts = delivery.attempt_count + 1;
  const state = attempts >= 10 ? "dead" : "pending";
  await database.prepare("UPDATE client_portal_notification_outbox SET state = ?, attempt_count = ?, next_attempt_at = ?, lease_token = NULL, lease_expires_at = NULL, last_error_code = ?, updated_at = ? WHERE id = ? AND lease_token = ?").bind(state, attempts, retryAt(attempts, now), email.code ?? "email_delivery_failed", new Date().toISOString(), delivery.id, leaseToken).run();
  return state === "dead" ? "dead" as const : "retry" as const;
}

export async function runClientPortalNotificationQueueBatch({ batch, env }: { batch: QueueBatch; env: ClientPortalNotificationQueueEnv }) {
  if (batch.queue !== CLIENT_PORTAL_NOTIFICATION_QUEUE_NAME || !env.ARCH_DB) return { acked: 0, retried: 0 };
  let acked = 0; let retried = 0;
  for (const item of batch.messages) {
    if (!message(item.body)) { item.ack(); acked += 1; continue; }
    try {
      const outcome = await processMessage(env.ARCH_DB, env, item.body);
      if (outcome === "retry") { item.retry({ delaySeconds: 60 }); retried += 1; } else { item.ack(); acked += 1; }
    } catch { item.retry({ delaySeconds: 60 }); retried += 1; }
  }
  return { acked, retried };
}
