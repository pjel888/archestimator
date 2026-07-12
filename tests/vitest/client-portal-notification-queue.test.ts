import { afterEach, describe, expect, it, vi } from "vitest";

import {
  CLIENT_PORTAL_NOTIFICATION_QUEUE_NAME,
  enqueuePendingClientPortalNotifications,
  runClientPortalNotificationQueueBatch,
} from "@/lib/cloudflare/client-portal-notification-queue";

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
});
