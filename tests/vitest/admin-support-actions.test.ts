import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { D1DatabaseLike, D1PreparedStatementLike, D1Result, D1Value } from "@/lib/cloudflare/d1";
import type { SupportConversationRow, SupportMessageRow } from "@/lib/repositories/support-conversations-repository";

const authMocks = vi.hoisted(() => ({
  requireAdminContext: vi.fn(),
}));

const d1Mocks = vi.hoisted(() => ({
  getCloudflareD1Database: vi.fn(),
}));

const emailMocks = vi.hoisted(() => ({
  sendEmail: vi.fn(),
}));

const auditMocks = vi.hoisted(() => ({
  writeAdminAuditEvent: vi.fn(),
}));

const cacheMocks = vi.hoisted(() => ({
  revalidatePath: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => cacheMocks);
vi.mock("@/lib/admin/require-admin", () => authMocks);
vi.mock("@/lib/cloudflare/d1", () => d1Mocks);
vi.mock("@/lib/email/transactional-email-client", () => emailMocks);
vi.mock("@/lib/admin/audit", () => auditMocks);

class SupportStatement implements D1PreparedStatementLike {
  private values: D1Value[] = [];

  constructor(
    private readonly database: SupportDatabase,
    private readonly sql: string,
  ) {}

  bind(...values: D1Value[]) {
    this.values = values;
    return this;
  }

  async first<R = Record<string, unknown>>(): Promise<R | null> {
    if (this.sql.includes("FROM support_conversations c")) {
      return this.database.conversation as R;
    }
    if (this.sql.includes("FROM support_subject_privacy_fences")) {
      return {
        user_id: this.database.conversation.user_id,
        generation: 0,
        state: "open",
        privacy_request_id: null,
      } as R;
    }
    if (
      this.sql.includes("SELECT id, created_at") &&
      this.sql.includes("FROM support_messages")
    ) {
      return null;
    }
    if (this.sql.includes("FROM support_messages") && this.sql.includes("WHERE id = ?")) {
      const [messageId] = this.values;
      const row = this.database.messages.find((message) => message.id === messageId);
      return (row ?? null) as R | null;
    }
    if (this.sql.includes("FROM support_messages") && this.sql.includes("client_message_id")) {
      const [conversationId, clientMessageId] = this.values;
      const row = this.database.messages.find(
        (message) => message.conversation_id === conversationId && message.client_message_id === clientMessageId,
      );
      return (row ?? null) as R | null;
    }
    return null;
  }

  async all<R = Record<string, unknown>>(): Promise<D1Result<R>> {
    if (this.sql.includes("FROM support_messages") && this.sql.includes("conversation_id = ?")) {
      const [conversationId] = this.values;
      return {
        results: this.database.messages.filter(
          (message) => message.conversation_id === conversationId,
        ) as R[],
      };
    }
    return { results: [] as R[] };
  }

  async run(): Promise<D1Result> {
    if (this.sql.includes("INSERT OR IGNORE INTO support_messages")) {
      const [
        id,
        authorUserId,
        bodyText,
        bodyHtml,
        clientMessageId,
        transport,
        mailboxAddress,
        fromAddress,
        fromName,
        toJson,
        ccJson,
        attachmentCount,
        providerName,
        createdAt,
        conversationId,
      ] = this.values;
      const exists = this.database.messages.some(
        (message) => message.conversation_id === conversationId && message.client_message_id === clientMessageId,
      );
      if (!exists) {
        this.database.messages.push({
          id: String(id),
          conversation_id: String(conversationId),
          sender_role: "admin",
          author_user_id: typeof authorUserId === "string" ? authorUserId : null,
          body_text: String(bodyText),
          body_html: typeof bodyHtml === "string" ? bodyHtml : null,
          email_message_id: null,
          client_message_id: String(clientMessageId),
          send_status: "pending",
          direction: "outbound",
          transport: transport === "email" ? "email" : "in_app",
          mailbox_address: typeof mailboxAddress === "string" ? mailboxAddress : null,
          from_address: typeof fromAddress === "string" ? fromAddress : null,
          from_name: typeof fromName === "string" ? fromName : null,
          to_json: typeof toJson === "string" ? toJson : null,
          cc_json: typeof ccJson === "string" ? ccJson : null,
          internet_message_id: null,
          in_reply_to: null,
          references_json: null,
          ingest_key: null,
          attachment_count: typeof attachmentCount === "number" ? attachmentCount : 0,
          provider_name: typeof providerName === "string" ? providerName : null,
          received_at: null,
          warning_flags_json: null,
          created_at: String(createdAt),
        });
      }
      return { success: true, meta: { changes: exists ? 0 : 1 } };
    }
    if (this.sql.includes("UPDATE support_messages")) {
      if (this.sql.includes("SET send_status = 'pending'")) {
        const [messageId] = this.values;
        const row = this.database.messages.find((message) => message.id === messageId && message.send_status === "send_failed");
        if (row) row.send_status = "pending";
        return { success: true, meta: { changes: row ? 1 : 0 } };
      }
      if (this.sql.includes("warning_flags_json = json_set")) {
        const [finalizedAt, messageId] = this.values;
        const row = this.database.messages.find((message) => message.id === messageId);
        if (row) {
          row.send_status = "sent";
          row.warning_flags_json = JSON.stringify({
            adminLifecycleFinalizedAt: String(finalizedAt),
          });
        }
        return { success: true, meta: { changes: row ? 1 : 0 } };
      }
      const [sendStatus, emailMessageId, , messageId] = this.values;
      const row = this.database.messages.find((message) => message.id === messageId);
      if (this.database.failNextStatusWrite) {
        this.database.failNextStatusWrite = false;
        return { success: true, meta: { changes: 0 } };
      }
      if (row) {
        row.send_status = sendStatus === "send_failed" ? "send_failed" : "sent";
        row.email_message_id = typeof emailMessageId === "string" ? emailMessageId : null;
      }
      return { success: true, meta: { changes: row ? 1 : 0 } };
    }
    if (this.sql.includes("UPDATE support_conversations")) {
      this.database.conversation.updated_at = new Date().toISOString();
      return { success: true, meta: { changes: 1 } };
    }
    return { success: true, meta: { changes: 1 } };
  }
}

class SupportDatabase implements D1DatabaseLike {
  readonly conversation: SupportConversationRow = {
    id: "conv-1",
    user_id: "user-1",
    requester_email: "requester@example.com",
    requester_name: "Requester",
    subject: "Help",
    status: "open",
    channel: "email",
    mailbox_address: "support@archestimator.com",
    routing_token: null,
    last_message_at: "2026-07-10T05:00:00.000Z",
    unread_for_admin: 1,
    unread_for_user: 0,
    created_at: "2026-07-10T05:00:00.000Z",
    updated_at: "2026-07-10T05:00:00.000Z",
  };
  readonly messages: SupportMessageRow[] = [];
  failNextStatusWrite = false;

  prepare(sql: string) {
    return new SupportStatement(this, sql);
  }

  async batch(statements: D1PreparedStatementLike[]) {
    return Promise.all(statements.map((statement) => statement.run()));
  }
}

beforeEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
  vi.stubEnv("ARCHESTIMATOR_EMAIL_DELIVERY_ENABLED", "true");
  vi.stubEnv("ARCHESTIMATOR_EMAIL_PROVIDER", "cloudflare");
  authMocks.requireAdminContext.mockResolvedValue({
    userId: "admin-1",
    email: "admin@example.com",
    role: "admin",
    profile: {},
    displayName: "Admin",
    avatarUrl: null,
  });
  auditMocks.writeAdminAuditEvent.mockResolvedValue({ data: null, error: null });
  emailMocks.sendEmail.mockResolvedValue({ ok: true, messageId: "email-1" });
});

afterEach(() => {
  vi.unstubAllEnvs();
});

function replyInput(clientMessageId: string, body: string) {
  return {
    conversationId: "conv-1",
    body,
    clientMessageId,
    expectedConversationStatus: "open" as const,
    expectedConversationUpdatedAt: "2026-07-10T05:00:00.000Z",
    renderedInboundMessageId: null,
  };
}

describe("admin support actions", () => {
  it("denies support replies before touching D1 when admin context fails", async () => {
    authMocks.requireAdminContext.mockRejectedValue(new Error("NEXT_REDIRECT"));
    const { sendSupportReply } = await import("@/lib/admin/support-actions");

    await expect(sendSupportReply(replyInput("msg-1", "Hello"))).rejects.toThrow("NEXT_REDIRECT");
    expect(d1Mocks.getCloudflareD1Database).not.toHaveBeenCalled();
  });

  it("uses client_message_id as the idempotency key for support replies", async () => {
    const database = new SupportDatabase();
    d1Mocks.getCloudflareD1Database.mockResolvedValue(database);
    const { sendSupportReply } = await import("@/lib/admin/support-actions");

    await expect(sendSupportReply(replyInput("msg-1", "Hello"))).resolves.toMatchObject({ ok: true });
    await expect(sendSupportReply(replyInput("msg-1", "Hello"))).resolves.toMatchObject({ ok: true });

    expect(database.messages).toHaveLength(1);
    expect(emailMocks.sendEmail).toHaveBeenCalledTimes(1);
    expect(database.messages[0]?.send_status).toBe("sent");
  });

  it("keeps failed email rows and marks send_status as send_failed", async () => {
    const database = new SupportDatabase();
    d1Mocks.getCloudflareD1Database.mockResolvedValue(database);
    emailMocks.sendEmail.mockResolvedValue({ ok: false, error: "down", code: "EMAIL_DOWN" });
    const { sendSupportReply } = await import("@/lib/admin/support-actions");

    const result = await sendSupportReply(replyInput("msg-2", "Hello"));

    expect(result).toMatchObject({ ok: false, error: "email_send_failed" });
    expect(database.messages).toHaveLength(1);
    expect(database.messages[0]?.send_status).toBe("send_failed");
    expect(auditMocks.writeAdminAuditEvent).toHaveBeenCalledWith(expect.objectContaining({
      action: "support.reply_send_failed",
    }));
  });

  it("claims a failed reply once so concurrent retries do not send duplicate email", async () => {
    const database = new SupportDatabase();
    database.messages.push({
      id: "message-failed",
      conversation_id: "conv-1",
      sender_role: "admin",
      author_user_id: "admin-1",
      body_text: "Retry me",
      body_html: null,
      email_message_id: null,
      client_message_id: "retry-1",
      send_status: "send_failed",
      direction: "outbound",
      transport: "email",
      mailbox_address: "support@archestimator.com",
      from_address: "support@archestimator.com",
      from_name: "Archestimator Support",
      to_json: JSON.stringify([{ email: "requester@example.com", name: null }]),
      cc_json: null,
      internet_message_id: null,
      in_reply_to: null,
      references_json: null,
      ingest_key: null,
      attachment_count: 0,
      provider_name: "cloudflare-email",
      received_at: null,
      warning_flags_json: null,
      created_at: "2026-07-12T00:00:00.000Z",
    });
    d1Mocks.getCloudflareD1Database.mockResolvedValue(database);
    const { sendSupportReply } = await import("@/lib/admin/support-actions");

    const [first, second] = await Promise.all([
      sendSupportReply(replyInput("retry-1", "Retry me")),
      sendSupportReply(replyInput("retry-1", "Retry me")),
    ]);

    expect([first, second].filter((result) => result.ok)).toHaveLength(1);
    expect([first, second].find((result) => !result.ok)).toMatchObject({ error: "delivery_pending" });
    expect(emailMocks.sendEmail).toHaveBeenCalledTimes(1);
  });

  it("returns an explicit uncertainty when post-send persistence does not claim a row", async () => {
    const database = new SupportDatabase();
    database.failNextStatusWrite = true;
    d1Mocks.getCloudflareD1Database.mockResolvedValue(database);
    const { sendSupportReply } = await import("@/lib/admin/support-actions");

    await expect(sendSupportReply(replyInput("uncertain-1", "Hello")))
      .resolves.toMatchObject({ ok: false, error: "delivery_uncertain" });

    expect(emailMocks.sendEmail).toHaveBeenCalledTimes(1);
    expect(database.messages[0]?.send_status).toBe("pending");
  });
});
