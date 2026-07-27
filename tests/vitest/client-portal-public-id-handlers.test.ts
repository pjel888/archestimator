import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createThread: vi.fn(),
  editMessage: vi.fn(),
  listMessages: vi.fn(),
  listThreads: vi.fn(),
  replyThread: vi.fn(),
  submitDecision: vi.fn(),
  summarizeDecisions: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/client-portal/public-repository", () => ({
  CLIENT_PORTAL_NO_STORE_HEADERS: { "Cache-Control": "private, no-store" },
  readClientPortalRecipientSession: vi.fn(async () => ({
    kind: "recipient",
    recipientId: "recipient_internal_1",
    portalId: "portal_internal_1",
    role: "approver",
    status: "active",
    verificationState: "verified",
    organization: "Client Co",
    isRequiredApprover: true,
    overrides: [],
  })),
  requiresClientPortalPassword: vi.fn(async () => false),
}));
vi.mock("@/lib/publication/security", async (importOriginal) => ({
  ...await importOriginal<typeof import("@/lib/publication/security")>(),
  assertSameOriginPublicPost: vi.fn(() => ({ ok: true })),
}));
vi.mock("@/lib/client-portal/public-rate-limits", () => ({
  checkClientPortalDecisionRateLimit: vi.fn(async () => ({ allowed: true })),
  checkClientPortalDecisionReadRateLimit: vi.fn(async () => ({ allowed: true })),
  checkClientPortalThreadRateLimit: vi.fn(async () => ({ allowed: true })),
  checkClientPortalThreadReadRateLimit: vi.fn(async () => ({ allowed: true })),
}));
vi.mock("@/lib/client-portal/decision-service", () => ({
  ClientPortalDecisionError: class ClientPortalDecisionError extends Error {},
  submitClientPortalDecision: mocks.submitDecision,
  summarizeClientPortalDecisions: mocks.summarizeDecisions,
}));
vi.mock("@/lib/client-portal/thread-repository", () => ({
  ClientPortalThreadError: class ClientPortalThreadError extends Error {},
  createClientPortalRecipientThread: mocks.createThread,
  editClientPortalRecipientMessage: mocks.editMessage,
  listClientPortalRecipientThreadMessages: mocks.listMessages,
  listClientPortalRecipientThreads: mocks.listThreads,
  markClientPortalRecipientThreadRead: vi.fn(),
  replyToClientPortalThread: mocks.replyThread,
  setClientPortalRecipientThreadStatus: vi.fn(),
  tombstoneClientPortalRecipientMessage: vi.fn(),
}));

class FakeDatabase {
  prepare(sql: string) {
    let values: unknown[] = [];
    return {
      bind: (...nextValues: unknown[]) => {
        values = nextValues;
        return {
          first: async () => sql.includes("SELECT current_issue_id")
            ? { current_issue_id: "issue_internal_1" }
            : null,
          all: async () => {
            if (sql.includes("client_portal_issue_sections")) return { results: [{ id: "section_internal_1" }] };
            if (sql.includes("FROM client_portal_threads")) {
              return { results: values.includes("2026-07-27T00:00:00.000Z") ? [{ id: "thread_internal_1" }] : [{ id: "thread_internal_1" }] };
            }
            if (sql.includes("FROM client_portal_messages") || sql.includes("SELECT message.id")) return { results: [{ id: "message_internal_1" }] };
            return { results: [] };
          },
        };
      },
    };
  }
}

vi.mock("@/lib/cloudflare/d1", () => ({
  getCloudflareD1Database: vi.fn(async () => new FakeDatabase()),
}));

import { submitClientPortalDecisionResponse } from "@/lib/client-portal/public-decision-handlers";
import { createClientPortalPublicIdentifier } from "@/lib/client-portal/public-identifiers";
import {
  createClientPortalThreadResponse,
  listClientPortalThreadMessagesResponse,
  listClientPortalThreadsResponse,
  replyClientPortalThreadResponse,
} from "@/lib/client-portal/public-thread-handlers";

const token = "a".repeat(43);
const otherToken = "b".repeat(43);
const publicIssueId = createClientPortalPublicIdentifier(token, "issue", "issue_internal_1");
const publicSectionId = createClientPortalPublicIdentifier(token, "section", "section_internal_1");
const publicThreadId = createClientPortalPublicIdentifier(token, "thread", "thread_internal_1");

beforeEach(() => {
  vi.clearAllMocks();
  mocks.submitDecision.mockResolvedValue({
    id: "decision_internal_1",
    issueId: "issue_internal_1",
    issueNumber: 1,
    versionLabel: "Issue 1",
    total: 1200,
    currencyCode: "USD",
    issueContentHash: "f".repeat(64),
    signerName: "Alex",
    note: null,
    submittedAt: "2026-07-27T00:00:00.000Z",
    decision: "approved",
    replayed: false,
  });
  mocks.createThread.mockResolvedValue({
    id: "thread_internal_1",
    issue_id: "issue_internal_1",
    section_key: "section_internal_1",
    target_kind: "section",
    target_public_id: "section_internal_1",
    target_label: "Costs",
    target_secondary_label: null,
    subject: "Question",
    status: "open",
    waiting_state: "waiting_on_owner",
    created_by_actor_id: "recipient_internal_1",
    created_at: "2026-07-27T00:00:00.000Z",
    updated_at: "2026-07-27T00:00:00.000Z",
  });
  mocks.listThreads.mockResolvedValue({
    threads: [{
      id: "thread_internal_1",
      issueId: "issue_internal_1",
      sectionId: "section_internal_1",
      status: "open",
      subject: "Question",
      target: { kind: "issue", publicId: "issue_internal_1", label: "Issue 1" },
      waitingState: "waiting_on_owner",
      createdAt: "2026-07-27T00:00:00.000Z",
      updatedAt: "2026-07-27T00:00:00.000Z",
      unreadCount: 1,
    }],
    hasMore: true,
    nextCursor: "2026-07-27T00:00:00.000Z|thread_internal_1",
  });
  mocks.listMessages.mockResolvedValue({
    messages: [{ id: "message_internal_1", body: "Hello", createdAt: "2026-07-27T00:00:00.000Z", editedAt: null, tombstonedAt: null, author: { displayName: "Alex", side: "client" } }],
    hasMore: true,
    nextCursor: "2026-07-27T00:00:00.000Z|message_internal_1",
  });
  mocks.replyThread.mockResolvedValue({ id: "thread_internal_1", replayed: false });
});

describe("client portal public ID handlers", () => {
  it("translates decision IDs at the boundary and rejects cross-token issues before submission", async () => {
    const request = new Request("https://example.com/api/share/token/decision", {
      method: "POST",
      headers: { "content-type": "application/json", "idempotency-key": "decision-1" },
      body: JSON.stringify({ decision: "approved", expectedIssueContentHash: "f".repeat(64), issueId: publicIssueId }),
    });
    const response = await submitClientPortalDecisionResponse(request, token);
    const payload = await response.json();

    expect(mocks.submitDecision).toHaveBeenCalledWith(expect.objectContaining({ issueId: "issue_internal_1" }));
    expect(JSON.stringify(payload)).not.toContain("issue_internal_1");
    expect(JSON.stringify(payload)).not.toContain("decision_internal_1");

    vi.clearAllMocks();
    const rejected = await submitClientPortalDecisionResponse(new Request(request.url, {
      method: "POST",
      headers: { "content-type": "application/json", "idempotency-key": "decision-2" },
      body: JSON.stringify({ decision: "approved", expectedIssueContentHash: "f".repeat(64), issueId: createClientPortalPublicIdentifier(otherToken, "issue", "issue_internal_1") }),
    }), token);

    expect(rejected.status).toBe(404);
    expect(mocks.submitDecision).not.toHaveBeenCalled();
  });

  it("translates issue and section IDs for thread creation without returning internal identities", async () => {
    const response = await createClientPortalThreadResponse(new Request("https://example.com/api/share/token/threads", {
      method: "POST",
      headers: { "content-type": "application/json", "idempotency-key": "thread-1" },
      body: JSON.stringify({ issueId: publicIssueId, sectionId: publicSectionId, subject: "Question", body: "Please clarify", target: { kind: "section", publicId: publicSectionId } }),
    }), token);
    const payload = await response.json();

    expect(mocks.createThread).toHaveBeenCalledWith(expect.objectContaining({ issueId: "issue_internal_1", sectionId: "section_internal_1", target: { kind: "section", publicId: "section_internal_1" } }));
    expect(JSON.stringify(payload)).not.toContain("issue_internal_1");
    expect(JSON.stringify(payload)).not.toContain("section_internal_1");
    expect(JSON.stringify(payload)).not.toContain("thread_internal_1");
  });

  it("projects discussion rows and cursors, then rejects a cross-token thread before reply", async () => {
    const listResponse = await listClientPortalThreadsResponse(new Request("https://example.com/api/share/token/threads"), token);
    const listPayload = await listResponse.json();

    expect(JSON.stringify(listPayload)).not.toContain("issue_internal_1");
    expect(JSON.stringify(listPayload)).not.toContain("section_internal_1");
    expect(JSON.stringify(listPayload)).not.toContain("thread_internal_1");
    expect(listPayload.threads[0].id).toBe(publicThreadId);

    const messagesResponse = await listClientPortalThreadMessagesResponse(new Request("https://example.com/api/share/token/threads/id/messages"), token, publicThreadId);
    const messagesPayload = await messagesResponse.json();
    expect(JSON.stringify(messagesPayload)).not.toContain("message_internal_1");

    vi.clearAllMocks();
    const rejected = await replyClientPortalThreadResponse(new Request("https://example.com/api/share/token/threads/id/messages", {
      method: "POST",
      headers: { "content-type": "application/json", "idempotency-key": "reply-1" },
      body: JSON.stringify({ body: "Reply" }),
    }), token, createClientPortalPublicIdentifier(otherToken, "thread", "thread_internal_1"));

    expect(rejected.status).toBe(404);
    expect(mocks.replyThread).not.toHaveBeenCalled();
  });
});
