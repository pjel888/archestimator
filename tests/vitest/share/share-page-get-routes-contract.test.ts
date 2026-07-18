import { beforeEach, describe, expect, it, vi } from "vitest";
import { encodeSharedLinkActivityCursor } from "@/lib/publication/activity-helpers";

const mocks = vi.hoisted(() => ({
  assertSameOriginPublicPost: vi.fn(),
  createSharedLinkSessionCookieName: vi.fn(),
  hasPublicationAccessCookie: vi.fn(),
  readPublicationTokenEncryptionSecret: vi.fn(() => "test-publication-encryption-secret"),
  readPublicationViewSnapshotVersion: vi.fn(),
  verifySharedLinkSessionCookieValue: vi.fn(),
  checkSharedLinkCommentReadRateLimit: vi.fn(),
  checkSharedLinkCommentRateLimit: vi.fn(),
  insertSharedLinkComment: vi.fn(),
  loadSharedLinkPublicComments: vi.fn(),
  checkSharedLinkDecisionReadRateLimit: vi.fn(),
  checkSharedLinkDecisionRateLimit: vi.fn(),
  loadSharedLinkRecipientDecision: vi.fn(),
  resolveProjectPublicationAccessByToken: vi.fn(),
  submitSharedLinkDecision: vi.fn(),
}));

vi.mock("@/lib/publication/security", () => ({
  assertSameOriginPublicPost: mocks.assertSameOriginPublicPost,
  createSharedLinkSessionCookieName: mocks.createSharedLinkSessionCookieName,
  hasPublicationAccessCookie: mocks.hasPublicationAccessCookie,
  hashPublicTelemetryValue: vi.fn(() => "hashed-request-value"),
  isPublicationTokenShape: vi.fn(() => false),
  readPublicationTokenEncryptionSecret: mocks.readPublicationTokenEncryptionSecret,
  readPublicationViewSnapshotVersion: mocks.readPublicationViewSnapshotVersion,
  verifySharedLinkSessionCookieValue: mocks.verifySharedLinkSessionCookieValue,
}));

vi.mock("@/lib/publication/public-repository", () => ({
  insertSharedLinkComment: mocks.insertSharedLinkComment,
  loadSharedLinkPublicComments: mocks.loadSharedLinkPublicComments,
  loadSharedLinkRecipientDecision: mocks.loadSharedLinkRecipientDecision,
  resolveProjectPublicationAccessByToken: mocks.resolveProjectPublicationAccessByToken,
  submitSharedLinkDecision: mocks.submitSharedLinkDecision,
}));

vi.mock("@/lib/publication/public-rate-limits", () => ({
  checkSharedLinkCommentReadRateLimit: mocks.checkSharedLinkCommentReadRateLimit,
  checkSharedLinkCommentRateLimit: mocks.checkSharedLinkCommentRateLimit,
  checkSharedLinkDecisionReadRateLimit: mocks.checkSharedLinkDecisionReadRateLimit,
  checkSharedLinkDecisionRateLimit: mocks.checkSharedLinkDecisionRateLimit,
}));

import * as commentRoute from "@/app/api/share/[token]/comment/route";
import * as decisionRoute from "@/app/api/share/[token]/decision/route";

type GetHandler = (request: Request, context: { params: Promise<{ token: string }> }) => Promise<Response>;

function expectGetHandler(route: unknown): GetHandler {
  const handler = (route as { GET?: unknown }).GET;
  expect(handler, "route must export an additive GET handler").toEqual(expect.any(Function));
  return handler as GetHandler;
}

function params(token = "client-pub-token-123") {
  return { params: Promise.resolve({ token }) };
}

function recipientSessionCookie() {
  const session = "shared-link-session-v1:eyJyZWNpcGllbnRJZCI6InJlY2lwLTEyMyIsInB1YmxpY2F0aW9uSWQiOiJwdWItMSIsInNuYXBzaG90VmVyc2lvbiI6IjEifQ:dummy";
  return `shared_link_session_abc123=${encodeURIComponent(session)}`;
}

describe("share page comment and decision GET route contracts", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.createSharedLinkSessionCookieName.mockReturnValue("shared_link_session_abc123");
    mocks.verifySharedLinkSessionCookieValue.mockReturnValue(true);
    mocks.hasPublicationAccessCookie.mockReturnValue(true);
    mocks.checkSharedLinkCommentReadRateLimit.mockResolvedValue({ allowed: true });
    mocks.checkSharedLinkDecisionReadRateLimit.mockResolvedValue({ allowed: true });
    mocks.resolveProjectPublicationAccessByToken.mockResolvedValue({
      publicationId: "pub-1",
      status: "published",
      passwordRequired: false,
      snapshotVersion: 1,
      credentialVersion: "open",
    });
    mocks.loadSharedLinkPublicComments.mockResolvedValue({
      comments: [{
        id: "comment-1",
        content: "Can we confirm the tile allowance?",
        createdAt: "2026-06-03T00:00:00.000Z",
        authorName: "Client",
        authorType: "recipient",
      }],
      hasMore: true,
      nextCursor: "next-comment-page",
    });
    mocks.loadSharedLinkRecipientDecision.mockResolvedValue({
      type: "accepted",
      note: "Looks good.",
      submittedAt: "2026-06-03T00:01:00.000Z",
      final: true,
    });
  });

  it("comment route exposes GET for loading public comment history", async () => {
    const GET = expectGetHandler(commentRoute);

    const response = await GET(
      new Request("http://localhost/api/share/client-pub-token-123/comment", {
        headers: { cookie: recipientSessionCookie() },
      }),
      params(),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({ comments: expect.any(Array), hasMore: true, nextCursor: "next-comment-page" });
    expect(response.headers.get("cache-control")).toMatch(/no-store|private|max-age/i);
    expect(mocks.checkSharedLinkCommentReadRateLimit).toHaveBeenCalledWith({
      publicationId: "pub-1",
      recipientId: "recip-123",
    });
    expect(mocks.loadSharedLinkPublicComments).toHaveBeenCalledWith({ publicationId: "pub-1", cursor: null, limit: 50 });
  });

  it("accepts an encrypted comment cursor and forwards its decoded value", async () => {
    const GET = expectGetHandler(commentRoute);
    const cursor = encodeSharedLinkActivityCursor({ created_at: "2026-06-03T00:00:00.000Z", id: "comment-1" });

    const response = await GET(
      new Request(`http://localhost/api/share/client-pub-token-123/comment?cursor=${encodeURIComponent(cursor)}`, {
        headers: { cookie: recipientSessionCookie() },
      }),
      params(),
    );

    expect(response.status).toBe(200);
    expect(mocks.loadSharedLinkPublicComments).toHaveBeenCalledWith({
      publicationId: "pub-1",
      cursor: { createdAt: "2026-06-03T00:00:00.000Z", id: "comment-1" },
      limit: 50,
    });
  });

  it("rejects invalid comment cursors before loading comment history", async () => {
    const GET = expectGetHandler(commentRoute);
    const response = await GET(
      new Request("http://localhost/api/share/client-pub-token-123/comment?cursor=not-a-cursor", {
        headers: { cookie: recipientSessionCookie() },
      }),
      params(),
    );

    expect(response.status).toBe(400);
    expect(mocks.loadSharedLinkPublicComments).not.toHaveBeenCalled();
  });

  it("comment route rejects missing recipient session before loading comment history", async () => {
    const GET = expectGetHandler(commentRoute);

    const response = await GET(new Request("http://localhost/api/share/client-pub-token-123/comment"), params());

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({ error: "Valid recipient session required for comments." });
    expect(mocks.checkSharedLinkCommentReadRateLimit).not.toHaveBeenCalled();
    expect(mocks.loadSharedLinkPublicComments).not.toHaveBeenCalled();
  });

  it("comment route rejects invalid recipient session before loading comment history", async () => {
    const GET = expectGetHandler(commentRoute);
    mocks.verifySharedLinkSessionCookieValue.mockReturnValueOnce(false);

    const response = await GET(
      new Request("http://localhost/api/share/client-pub-token-123/comment", {
        headers: { cookie: recipientSessionCookie() },
      }),
      params(),
    );

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({ error: "Valid recipient session required for comments." });
    expect(mocks.checkSharedLinkCommentReadRateLimit).not.toHaveBeenCalled();
    expect(mocks.loadSharedLinkPublicComments).not.toHaveBeenCalled();
  });

  it("comment route preserves password gate before loading comment history", async () => {
    const GET = expectGetHandler(commentRoute);
    mocks.resolveProjectPublicationAccessByToken.mockResolvedValueOnce({
      publicationId: "pub-1",
      status: "published",
      passwordRequired: true,
      snapshotVersion: 1,
      credentialVersion: "cred-test",
    });
    mocks.hasPublicationAccessCookie.mockReturnValueOnce(false);

    const response = await GET(
      new Request("http://localhost/api/share/client-pub-token-123/comment", {
        headers: { cookie: recipientSessionCookie() },
      }),
      params(),
    );

    expect(response.status).toBe(423);
    await expect(response.json()).resolves.toEqual({ error: "password_required" });
    expect(mocks.checkSharedLinkCommentReadRateLimit).not.toHaveBeenCalled();
    expect(mocks.loadSharedLinkPublicComments).not.toHaveBeenCalled();
  });

  it("comment route rate limits public comment history reads before loading comments", async () => {
    const GET = expectGetHandler(commentRoute);
    mocks.checkSharedLinkCommentReadRateLimit.mockResolvedValueOnce({
      allowed: false,
      message: "Too many attempts. Please wait 60 seconds.",
      retryAfter: 60,
    });

    const response = await GET(
      new Request("http://localhost/api/share/client-pub-token-123/comment", {
        headers: { cookie: recipientSessionCookie() },
      }),
      params(),
    );

    expect(response.status).toBe(429);
    expect(response.headers.get("retry-after")).toBe("60");
    await expect(response.json()).resolves.toEqual({ error: "Too many attempts. Please wait 60 seconds." });
    expect(mocks.loadSharedLinkPublicComments).not.toHaveBeenCalled();
  });

  it("decision route exposes GET for loading the current recipient decision", async () => {
    const GET = expectGetHandler(decisionRoute);

    const response = await GET(
      new Request("http://localhost/api/share/client-pub-token-123/decision", {
        headers: { cookie: recipientSessionCookie() },
      }),
      params(),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({ decision: expect.anything() });
    expect(response.headers.get("cache-control")).toMatch(/no-store|private|max-age/i);
    expect(mocks.checkSharedLinkDecisionReadRateLimit).toHaveBeenCalledWith({
      publicationId: "pub-1",
      recipientId: "recip-123",
    });
  });

  it("decision route rate limits public decision-state reads before loading decisions", async () => {
    const GET = expectGetHandler(decisionRoute);
    mocks.checkSharedLinkDecisionReadRateLimit.mockResolvedValueOnce({
      allowed: false,
      message: "Too many attempts. Please wait 60 seconds.",
      retryAfter: 60,
    });

    const response = await GET(
      new Request("http://localhost/api/share/client-pub-token-123/decision", {
        headers: { cookie: recipientSessionCookie() },
      }),
      params(),
    );

    expect(response.status).toBe(429);
    expect(response.headers.get("retry-after")).toBe("60");
    await expect(response.json()).resolves.toEqual({ error: "Too many attempts. Please wait 60 seconds." });
    expect(mocks.loadSharedLinkRecipientDecision).not.toHaveBeenCalled();
  });
});
