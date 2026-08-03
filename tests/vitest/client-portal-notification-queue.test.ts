import { afterEach, describe, expect, it, vi } from "vitest";

import {
  CLIENT_PORTAL_NOTIFICATION_QUEUE_NAME,
  enqueuePendingClientPortalNotifications,
  runClientPortalNotificationQueueBatch,
} from "@/lib/cloudflare/client-portal-notification-queue";
import { encryptPublicationToken } from "@/lib/publication/security";

const EMAIL_ENV = {
  ARCHESTIMATOR_EMAIL_DELIVERY_ENABLED: "true",
  ARCHESTIMATOR_EMAIL_PROVIDER: "cloudflare-email",
  CLOUDFLARE_EMAIL_FROM: "Archestimator <noreply@archestimator.com>",
};

type StatementCall = { sql: string; values: unknown[] };

class FakeMessage {
  acked = false;
  retried = false;
  retryDelaySeconds: number | null = null;

  constructor(readonly body: unknown) {}

  ack() {
    this.acked = true;
  }

  retry(options?: { delaySeconds?: number }) {
    this.retried = true;
    this.retryDelaySeconds = options?.delaySeconds ?? null;
  }
}

function deliveryDatabase({
  claimChanges = 1,
  delivery = {
    attempt_count: 0,
    event_type: "portal.recipient.reminded",
    id: "outbox_12345678",
    payload_json: "{}",
    project_name: "Harbor House",
    recipient_email: "client@example.com",
    recipient_id: "recipient_12345678",
  },
}: {
  claimChanges?: number;
  delivery?: {
    attempt_count: number;
    event_type: string;
    id: string;
    payload_json: string;
    project_name: string | null;
    recipient_email: string | null;
    recipient_id: string | null;
  };
} = {}) {
  const calls: StatementCall[] = [];
  let claimAttempted = false;
  return {
    calls,
    prepare(sql: string) {
      return {
        bind(...values: unknown[]) {
          return {
            async all() {
              calls.push({ sql, values });
              if (sql.startsWith("SELECT o.id")) return { results: [delivery], success: true };
              return { results: [], success: true };
            },
            async run() {
              calls.push({ sql, values });
              if (sql.startsWith("UPDATE client_portal_notification_outbox SET state = 'processing'")) {
                claimAttempted = true;
                return { meta: { changes: claimChanges }, success: true };
              }
              return { meta: { changes: claimAttempted ? 1 : 0 }, success: true };
            },
          };
        },
      };
    },
  };
}

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
});

describe("Client Portal notification queue", () => {
  it("enqueues only valid pending outbox rows through the dedicated binding", async () => {
    const sent: unknown[] = [];
    const database = {
      prepare() {
        return {
          bind() {
            return {
              async all() {
                return {
                  results: [{ id: "outbox_12345678" }, { id: "invalid" }],
                  success: true,
                };
              },
            };
          },
        };
      },
    };

    const result = await enqueuePendingClientPortalNotifications({
      ARCH_DB: database,
      CLIENT_PORTAL_NOTIFICATIONS_QUEUE: {
        sendBatch(messages) {
          sent.push(...Array.from(messages));
        },
      },
    }, new Date("2026-07-12T03:30:00.000Z"));

    expect(result).toEqual({ enqueued: 1, skipped: false });
    expect(sent).toEqual([{ body: { outboxId: "outbox_12345678", version: 1 }, contentType: "json" }]);
  });

  it("leases, delivers, and acknowledges a valid notification once", async () => {
    const database = deliveryDatabase();
    const emailSend = vi.fn(async () => ({ messageId: "email_123" }));
    const message = new FakeMessage({ outboxId: "outbox_12345678", version: 1 });

    const summary = await runClientPortalNotificationQueueBatch({
      batch: { messages: [message], queue: CLIENT_PORTAL_NOTIFICATION_QUEUE_NAME },
      env: { ...EMAIL_ENV, ARCH_DB: database, EMAIL: { send: emailSend } },
    });

    expect(summary).toEqual({ acked: 1, retried: 0 });
    expect(message.acked).toBe(true);
    expect(message.retried).toBe(false);
    expect(emailSend).toHaveBeenCalledWith(expect.objectContaining({
      subject: "Reminder: Harbor House",
      to: "client@example.com",
    }));
    expect(database.calls.some((call) => call.sql.includes("state = 'delivered'"))).toBe(true);
  });

  it("delivers recipient decisions to the portal owner when recipient_id is null", async () => {
    const database = deliveryDatabase({ delivery: {
      attempt_count: 0,
      event_type: "decision_submitted",
      id: "outbox_12345678",
      payload_json: JSON.stringify({ audience: "owner", decisionId: "decision_1" }),
      project_name: "Harbor House",
      recipient_email: "owner@example.com",
      recipient_id: null,
    } });
    const emailSend = vi.fn(async () => ({ messageId: "email_owner" }));
    const queueMessage = new FakeMessage({ outboxId: "outbox_12345678", version: 1 });

    await runClientPortalNotificationQueueBatch({
      batch: { messages: [queueMessage], queue: CLIENT_PORTAL_NOTIFICATION_QUEUE_NAME },
      env: { ...EMAIL_ENV, ARCH_DB: database, EMAIL: { send: emailSend } },
    });

    expect(emailSend).toHaveBeenCalledWith(expect.objectContaining({ subject: "Client decision: Harbor House", text: "A recipient submitted an issue-wide Client Portal decision.", to: "owner@example.com" }));
    expect(database.calls.some((call) => call.sql.includes("LEFT JOIN profiles owner") && call.sql.includes("COALESCE"))).toBe(true);
  });

  it("describes owner discussion replies correctly to recipient subscribers", async () => {
    const database = deliveryDatabase({ delivery: {
      attempt_count: 0,
      event_type: "message_created",
      id: "outbox_12345678",
      payload_json: JSON.stringify({ audience: "recipient", messageId: "message_1", threadId: "thread_1" }),
      project_name: "Harbor House",
      recipient_email: "client@example.com",
      recipient_id: "recipient_12345678",
    } });
    const emailSend = vi.fn(async () => ({ messageId: "email_reply" }));
    const queueMessage = new FakeMessage({ outboxId: "outbox_12345678", version: 1 });

    await runClientPortalNotificationQueueBatch({
      batch: { messages: [queueMessage], queue: CLIENT_PORTAL_NOTIFICATION_QUEUE_NAME },
      env: { ...EMAIL_ENV, ARCH_DB: database, EMAIL: { send: emailSend } },
    });

    expect(emailSend).toHaveBeenCalledWith(expect.objectContaining({
      subject: "Client discussion: Harbor House",
      text: "The project team added a Client Portal discussion message.",
      to: "client@example.com",
    }));
  });

  it("decrypts invite material only inside delivery and removes it after sending", async () => {
    const secret = "test-client-portal-delivery-secret";
    const stableToken = "s".repeat(43);
    const bootstrapToken = "b".repeat(43);
    const database = deliveryDatabase({
      delivery: {
        attempt_count: 0,
        event_type: "portal.recipient.invited",
        id: "outbox_12345678",
        payload_json: JSON.stringify({
          encryptedBootstrapToken: encryptPublicationToken(bootstrapToken, secret),
          encryptedStableToken: encryptPublicationToken(stableToken, secret),
        }),
        project_name: "Harbor House",
        recipient_email: "client@example.com",
        recipient_id: "recipient_12345678",
      },
    });
    const emailSend = vi.fn(async () => ({ messageId: "email_invite" }));
    const queueMessage = new FakeMessage({ outboxId: "outbox_12345678", version: 1 });

    await runClientPortalNotificationQueueBatch({
      batch: { messages: [queueMessage], queue: CLIENT_PORTAL_NOTIFICATION_QUEUE_NAME },
      env: { ...EMAIL_ENV, ARCH_DB: database, EMAIL: { send: emailSend }, NEXT_PUBLIC_APP_URL: "https://app.archestimator.test", PUBLICATION_TOKEN_ENCRYPTION_SECRET: secret },
    });

    expect(emailSend).toHaveBeenCalledWith(expect.objectContaining({
      text: `There is a new Client Portal update for your review.\n\nOpen Client Portal: https://app.archestimator.test/share/${stableToken}?recipient=${bootstrapToken}`,
    }));
    expect(database.calls.some((call) => call.sql.includes("json_remove(payload_json") && call.sql.includes("state = 'delivered'"))).toBe(true);
  });

  it("marks malformed invite payloads dead without sending or logging secrets", async () => {
    const database = deliveryDatabase({ delivery: {
      attempt_count: 0,
      event_type: "portal.recipient.invited",
      id: "outbox_12345678",
      payload_json: "{}",
      project_name: "Harbor House",
      recipient_email: "client@example.com",
      recipient_id: "recipient_12345678",
    } });
    const emailSend = vi.fn(async () => ({ messageId: "should-not-send" }));
    const queueMessage = new FakeMessage({ outboxId: "outbox_12345678", version: 1 });

    const summary = await runClientPortalNotificationQueueBatch({
      batch: { messages: [queueMessage], queue: CLIENT_PORTAL_NOTIFICATION_QUEUE_NAME },
      env: { ...EMAIL_ENV, ARCH_DB: database, EMAIL: { send: emailSend } },
    });

    expect(summary).toEqual({ acked: 1, retried: 0 });
    expect(emailSend).not.toHaveBeenCalled();
    const deadWrite = database.calls.find((call) => call.sql.includes("invalid_delivery_payload"));
    expect(deadWrite?.sql).not.toContain("json_remove");
  });

  it("acks a duplicate lease claim without sending another email", async () => {
    const database = deliveryDatabase({ claimChanges: 0 });
    const emailSend = vi.fn(async () => ({ messageId: "should-not-send" }));
    const message = new FakeMessage({ outboxId: "outbox_12345678", version: 1 });

    const summary = await runClientPortalNotificationQueueBatch({
      batch: { messages: [message], queue: CLIENT_PORTAL_NOTIFICATION_QUEUE_NAME },
      env: { ...EMAIL_ENV, ARCH_DB: database, EMAIL: { send: emailSend } },
    });

    expect(summary).toEqual({ acked: 1, retried: 0 });
    expect(message.acked).toBe(true);
    expect(emailSend).not.toHaveBeenCalled();
  });

  it("returns delivery failures to the queue and schedules a pending retry", async () => {
    vi.stubEnv("ARCHESTIMATOR_DEV_LOG_DISABLED", "1");
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    const database = deliveryDatabase();
    const message = new FakeMessage({ outboxId: "outbox_12345678", version: 1 });

    const summary = await runClientPortalNotificationQueueBatch({
      batch: { messages: [message], queue: CLIENT_PORTAL_NOTIFICATION_QUEUE_NAME },
      env: {
        ...EMAIL_ENV,
        ARCH_DB: database,
        EMAIL: {
          async send() {
            throw new Error("provider unavailable");
          },
        },
      },
    });

    expect(summary).toEqual({ acked: 0, retried: 1 });
    expect(message.retried).toBe(true);
    expect(message.retryDelaySeconds).toBe(60);
    const retry = database.calls.find((call) => call.sql.includes("attempt_count = ?"));
    expect(retry?.values).toContain("pending");
    expect(retry?.values).toContain("CLOUDFLARE_EMAIL_SEND_ERROR");
  });

  it("enqueues pending legacy publication recipient intents on the existing queue", async () => {
    const sent: unknown[] = [];
    const database = {
      prepare(sql: string) {
        return {
          bind() {
            return {
              async all() {
                if (sql.includes("FROM shared_link_recipients")) {
                  return {
                    results: [{
                      id: "44444444-4444-4444-8444-444444444444",
                      intent_id: "legacy_delivery_12345678",
                      publication_id: "33333333-3333-4333-8333-333333333333",
                    }],
                    success: true,
                  };
                }
                return { results: [], success: true };
              },
            };
          },
        };
      },
    };

    const result = await enqueuePendingClientPortalNotifications({
      ARCH_DB: database,
      CLIENT_PORTAL_NOTIFICATIONS_QUEUE: {
        sendBatch(messages) {
          sent.push(...Array.from(messages));
        },
      },
    }, new Date("2026-07-12T03:30:00.000Z"));

    expect(result).toEqual({ enqueued: 1, skipped: false });
    expect(sent).toEqual([{
      body: {
        intentId: "legacy_delivery_12345678",
        kind: "legacy-publication-recipient",
        publicationId: "33333333-3333-4333-8333-333333333333",
        recipientId: "44444444-4444-4444-8444-444444444444",
        version: 2,
      },
      contentType: "json",
    }]);
  });

  it("finalizes a provider-accepted legacy intent without sending the email again", async () => {
    const secret = "legacy-delivery-secret";
    const deliveryIntent = {
      attemptCount: 0,
      encryptedRawToken: encryptPublicationToken("r".repeat(43), secret),
      expectedPublicationEncryptedToken: "encrypted-publication-token",
      expectedRecipientTokenHash: "previous-token-hash",
      intentId: "legacy_delivery_12345678",
      kind: "resend",
      linkBase: "/share/current-token",
      nextAttemptAt: "2026-07-12T03:30:00.000Z",
      projectName: "Harbor House",
      proposedRecipientTokenHash: "next-token-hash",
      providerAcceptedAt: "2026-07-12T03:31:00.000Z",
      providerMessageId: "provider-message-1",
      recipientEmail: "client@example.com",
      senderEmail: "owner@example.com",
      senderLabel: "Owner",
      state: "pending",
      version: 1,
    };
    const calls: StatementCall[] = [];
    const database = {
      prepare(sql: string) {
        return {
          bind(...values: unknown[]) {
            return {
              async all() {
                calls.push({ sql, values });
                if (sql.includes("current_publication_encrypted_token")) {
                  return {
                    results: [{
                      current_publication_encrypted_token: "encrypted-publication-token",
                      delivery_status: "sent",
                      email: "client@example.com",
                      publication_id: "33333333-3333-4333-8333-333333333333",
                      recipient_id: "44444444-4444-4444-8444-444444444444",
                      recipient_token_hash: "previous-token-hash",
                      resend_delivery_metadata: JSON.stringify(deliveryIntent),
                    }],
                    success: true,
                  };
                }
                return { results: [], success: true };
              },
              async run() {
                calls.push({ sql, values });
                return { meta: { changes: 1 }, success: true };
              },
            };
          },
        };
      },
    };
    const emailSend = vi.fn(async () => ({ messageId: "must-not-send" }));
    const queueMessage = new FakeMessage({
      intentId: "legacy_delivery_12345678",
      kind: "legacy-publication-recipient",
      publicationId: "33333333-3333-4333-8333-333333333333",
      recipientId: "44444444-4444-4444-8444-444444444444",
      version: 2,
    });

    const summary = await runClientPortalNotificationQueueBatch({
      batch: { messages: [queueMessage], queue: CLIENT_PORTAL_NOTIFICATION_QUEUE_NAME },
      env: { ...EMAIL_ENV, ARCH_DB: database, EMAIL: { send: emailSend }, PUBLICATION_TOKEN_ENCRYPTION_SECRET: secret },
    });

    expect(summary).toEqual({ acked: 1, retried: 0 });
    expect(emailSend).not.toHaveBeenCalled();
    const finalize = calls.find((call) => call.sql.includes("recipient_token_hash = ?") && call.sql.includes("state', 'delivered'"));
    expect(finalize?.values).toContain("next-token-hash");
    expect(finalize?.values).toContain("provider-message-1");
  });

  it("retries an active legacy intent instead of acknowledging its unexpired lease", async () => {
    const database = {
      prepare(sql: string) {
        return {
          bind() {
            return {
              async all() {
                if (sql.includes("AS intent_id") && sql.includes("AS state")) {
                  return { results: [{ intent_id: "legacy_delivery_12345678", state: "processing" }], success: true };
                }
                return { results: [], success: true };
              },
              async run() {
                return { meta: { changes: 0 }, success: true };
              },
            };
          },
        };
      },
    };
    const emailSend = vi.fn(async () => ({ messageId: "must-not-send" }));
    const queueMessage = new FakeMessage({
      intentId: "legacy_delivery_12345678",
      kind: "legacy-publication-recipient",
      publicationId: "33333333-3333-4333-8333-333333333333",
      recipientId: "44444444-4444-4444-8444-444444444444",
      version: 2,
    });

    const summary = await runClientPortalNotificationQueueBatch({
      batch: { messages: [queueMessage], queue: CLIENT_PORTAL_NOTIFICATION_QUEUE_NAME },
      env: { ...EMAIL_ENV, ARCH_DB: database, EMAIL: { send: emailSend } },
    });

    expect(summary).toEqual({ acked: 0, retried: 1 });
    expect(queueMessage.retried).toBe(true);
    expect(emailSend).not.toHaveBeenCalled();
  });

  it("keeps the prior resend token active when legacy provider delivery fails", async () => {
    vi.stubEnv("ARCHESTIMATOR_DEV_LOG_DISABLED", "1");
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    const secret = "legacy-delivery-secret";
    const intent = {
      attemptCount: 0,
      encryptedRawToken: encryptPublicationToken("r".repeat(43), secret),
      expectedPublicationEncryptedToken: "encrypted-publication-token",
      expectedRecipientTokenHash: "previous-token-hash",
      intentId: "legacy_delivery_12345678",
      kind: "resend",
      linkBase: "/share/current-token",
      nextAttemptAt: "2026-07-12T03:30:00.000Z",
      projectName: "Harbor House",
      proposedRecipientTokenHash: "next-token-hash",
      recipientEmail: "client@example.com",
      senderEmail: "owner@example.com",
      senderLabel: "Owner",
      state: "processing",
      version: 1,
    };
    const calls: StatementCall[] = [];
    const database = {
      prepare(sql: string) {
        return {
          bind(...values: unknown[]) {
            return {
              async all() {
                calls.push({ sql, values });
                if (sql.includes("current_publication_encrypted_token")) {
                  return {
                    results: [{
                      current_publication_encrypted_token: "encrypted-publication-token",
                      delivery_status: "sent",
                      email: "client@example.com",
                      publication_id: "33333333-3333-4333-8333-333333333333",
                      recipient_id: "44444444-4444-4444-8444-444444444444",
                      recipient_token_hash: "previous-token-hash",
                      resend_delivery_metadata: JSON.stringify(intent),
                    }],
                    success: true,
                  };
                }
                return { results: [], success: true };
              },
              async run() {
                calls.push({ sql, values });
                return { meta: { changes: 1 }, success: true };
              },
            };
          },
        };
      },
    };
    const queueMessage = new FakeMessage({
      intentId: "legacy_delivery_12345678",
      kind: "legacy-publication-recipient",
      publicationId: "33333333-3333-4333-8333-333333333333",
      recipientId: "44444444-4444-4444-8444-444444444444",
      version: 2,
    });

    const summary = await runClientPortalNotificationQueueBatch({
      batch: { messages: [queueMessage], queue: CLIENT_PORTAL_NOTIFICATION_QUEUE_NAME },
      env: {
        ...EMAIL_ENV,
        ARCH_DB: database,
        EMAIL: { async send() { throw new Error("provider unavailable"); } },
        PUBLICATION_TOKEN_ENCRYPTION_SECRET: secret,
      },
    });

    expect(summary).toEqual({ acked: 0, retried: 1 });
    expect(calls.some((call) => call.sql.includes("recipient_token_hash = ?") && call.sql.includes("state', 'delivered'"))).toBe(false);
    const retryWrite = calls.find((call) => call.sql.includes("'$.attemptCount'"));
    expect(retryWrite?.sql).not.toContain("SET recipient_token_hash");
    expect(retryWrite?.values).toContain("pending");
  });
});
