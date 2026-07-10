import { beforeEach, describe, expect, it, vi } from "vitest";

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
    if (this.sql.includes("FROM support_messages") && this.sql.includes("client_message_id")) {
      const [conversationId, clientMessageId] = this.values;
      const row = this.database.messages.find(
        (message) => message.conversation_id === conversationId && message.client_message_id === clientMessageId,
      );
      return (row ?? null) as R | null;
    }
    if (this.sql.includes("FROM support_messages") && this.sql.includes("WHERE id = ?")) {
      const [messageId] = this.values;
      const row = this.database.messages.find((message) => message.id === messageId);
      return (row ?? null) as R | null;
    }
    return null;
  }

  async all<R = Record<string, unknown>>(): Promise<D1Result<R>> {
    return { results: [] };
  }

  async run(): Promise<D1Result> {
    if (this.sql.includes("INSERT OR IGNORE INTO support_messages")) {
      const [id, conversationId, senderRole, authorUserId, bodyText, clientMessageId, sendStatus, createdAt] = this.values;
      const exists = this.database.messages.some(
        (message) => message.conversation_id === conversationId && message.client_message_id === clientMessageId,
      );
      if (!exists) {
        this.database.messages.push({
          id: String(id),
          conversation_id: String(conversationId),
          sender_role: senderRole === "admin" ? "admin" : "user",
          author_user_id: typeof authorUserId === "string" ? authorUserId : null,
          body_text: String(bodyText),
          body_html: null,
          email_message_id: null,
          client_message_id: String(clientMessageId),
          send_status: sendStatus === "pending" ? "pending" : "sent",
          created_at: String(createdAt),
        });
      }
      return { success: true, meta: { changes: exists ? 0 : 1 } };
    }
    if (this.sql.includes("UPDATE support_messages")) {
      const [sendStatus, emailMessageId, messageId] = this.values;
      const row = this.database.messages.find((message) => message.id === messageId);
      if (row) {
        row.send_status = sendStatus === "send_failed" ? "send_failed" : "sent";
        row.email_message_id = typeof emailMessageId === "string" ? emailMessageId : null;
      }
      return { success: true, meta: { changes: row ? 1 : 0 } };
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
    channel: "in_app",
    last_message_at: "2026-07-10T05:00:00.000Z",
    unread_for_admin: 1,
    unread_for_user: 0,
    created_at: "2026-07-10T05:00:00.000Z",
    updated_at: "2026-07-10T05:00:00.000Z",
  };
  readonly messages: SupportMessageRow[] = [];

  prepare(sql: string) {
    return new SupportStatement(this, sql);
  }
}

beforeEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
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

describe("admin support actions", () => {
  it("denies support replies before touching D1 when admin context fails", async () => {
    authMocks.requireAdminContext.mockRejectedValue(new Error("NEXT_REDIRECT"));
    const { sendSupportReply } = await import("@/lib/admin/support-actions");

    await expect(sendSupportReply({ conversationId: "conv-1", body: "Hello", clientMessageId: "msg-1" })).rejects.toThrow("NEXT_REDIRECT");
    expect(d1Mocks.getCloudflareD1Database).not.toHaveBeenCalled();
  });

  it("uses client_message_id as the idempotency key for support replies", async () => {
    const database = new SupportDatabase();
    d1Mocks.getCloudflareD1Database.mockResolvedValue(database);
    const { sendSupportReply } = await import("@/lib/admin/support-actions");

    await expect(sendSupportReply({ conversationId: "conv-1", body: "Hello", clientMessageId: "msg-1" })).resolves.toMatchObject({ ok: true });
    await expect(sendSupportReply({ conversationId: "conv-1", body: "Hello", clientMessageId: "msg-1" })).resolves.toMatchObject({ ok: true });

    expect(database.messages).toHaveLength(1);
    expect(emailMocks.sendEmail).toHaveBeenCalledTimes(1);
    expect(database.messages[0]?.send_status).toBe("sent");
  });

  it("keeps failed email rows and marks send_status as send_failed", async () => {
    const database = new SupportDatabase();
    d1Mocks.getCloudflareD1Database.mockResolvedValue(database);
    emailMocks.sendEmail.mockResolvedValue({ ok: false, error: "down", code: "EMAIL_DOWN" });
    const { sendSupportReply } = await import("@/lib/admin/support-actions");

    const result = await sendSupportReply({ conversationId: "conv-1", body: "Hello", clientMessageId: "msg-2" });

    expect(result).toMatchObject({ ok: false, error: "email_send_failed" });
    expect(database.messages).toHaveLength(1);
    expect(database.messages[0]?.send_status).toBe("send_failed");
    expect(auditMocks.writeAdminAuditEvent).toHaveBeenCalledWith(expect.objectContaining({
      action: "support.reply_send_failed",
    }));
  });
});
