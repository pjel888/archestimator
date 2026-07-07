import { beforeEach, describe, expect, it, vi, afterEach } from "vitest";
import { render, screen, waitFor, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

// Hoisted mocks for route, repo, security, hook, component deps (P7 red tests written FIRST per Master Prompt + subagent TDD red-first rule)
const mocks = vi.hoisted(() => ({
  assertSameOriginPublicPost: vi.fn(),
  verifySharedLinkSessionCookieValue: vi.fn(),
  createSharedLinkSessionCookieName: vi.fn(),
  hasPublicationAccessCookie: vi.fn(),
  readPublicationViewSnapshotVersion: vi.fn(),
  readPublicationTokenHashSecret: vi.fn(() => "test-publication-hash-secret"),
  useSharedLinkSession: vi.fn(),
  // P7 repo extension (additive)
  resolveProjectPublicationAccessByToken: vi.fn(),
  submitSharedLinkDecision: vi.fn(),
  checkSharedLinkDecisionRateLimit: vi.fn(),
}));

vi.mock("@/lib/publication/security", () => ({
  assertSameOriginPublicPost: mocks.assertSameOriginPublicPost,
  verifySharedLinkSessionCookieValue: mocks.verifySharedLinkSessionCookieValue,
  createSharedLinkSessionCookieName: mocks.createSharedLinkSessionCookieName,
  hasPublicationAccessCookie: mocks.hasPublicationAccessCookie,
  readPublicationViewSnapshotVersion: mocks.readPublicationViewSnapshotVersion,
  readPublicationTokenHashSecret: mocks.readPublicationTokenHashSecret,
}));

vi.mock("@/hooks/use-shared-link-session", () => ({
  useSharedLinkSession: mocks.useSharedLinkSession,
}));

vi.mock("@/lib/publication/public-repository", async () => {
  const actual = await vi.importActual("@/lib/publication/public-repository");
  return {
    ...actual,
    resolveProjectPublicationAccessByToken: mocks.resolveProjectPublicationAccessByToken,
    submitSharedLinkDecision: mocks.submitSharedLinkDecision,
    checkSharedLinkDecisionRateLimit: mocks.checkSharedLinkDecisionRateLimit,
  };
});

// Modules under test (will fail to import or execute until P7 impl — intentionally red first)
import { POST } from "@/app/api/share/[token]/decision/route";
import SharePageComments from "@/components/share/SharePageComments";
import SharePageDecision from "@/components/share/SharePageDecision";
import { composeSharedLinkActivity } from "@/lib/activity";

function params(token = "client-pub-token-123") {
  return { params: Promise.resolve({ token }) };
}

function makeRequest(body: unknown, headers: Record<string, string> = {}) {
  return new Request("http://localhost/api/share/client-pub-token-123/decision", {
    method: "POST",
    headers: { "content-type": "application/json", ...headers },
    body: JSON.stringify(body),
  });
}

const TARGET_ESTIMATE_ID = "11111111-1111-4111-8111-111111111111";
const TARGET_ROW_ID = "22222222-2222-4222-8222-222222222222";

function makeDecisionQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
      mutations: { retry: false },
    },
  });
}

function renderSharePageDecision(ui: React.ReactElement) {
  return render(<QueryClientProvider client={makeDecisionQueryClient()}>{ui}</QueryClientProvider>);
}

describe("P7 — Shared Link Decisions API & UI (red tests written FIRST before any route/component impl)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.createSharedLinkSessionCookieName.mockReturnValue("shared_link_session_abc123");
    mocks.hasPublicationAccessCookie.mockReturnValue(false);
    mocks.readPublicationViewSnapshotVersion.mockReturnValue(1);
    mocks.useSharedLinkSession.mockReturnValue({ isValid: true });
    mocks.resolveProjectPublicationAccessByToken.mockResolvedValue({
      publicationId: "pub1",
      snapshotVersion: 1,
      passwordRequired: false,
      status: "published",
      expiresAt: null,
      credentialVersion: "open",
    });
    mocks.submitSharedLinkDecision.mockResolvedValue({ id: "decision-123" });
    mocks.checkSharedLinkDecisionRateLimit.mockResolvedValue({ allowed: true });
    // @ts-expect-error test env
    global.fetch = vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({ decision: null }) });
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  describe("POST /api/share/[token]/decision route (CSRF + session + snapshot lock via P3 RPC + 409 duplicate)", () => {
    it("rejects missing or invalid CSRF (reuses assertSameOriginPublicPost from P5/P6)", async () => {
      mocks.assertSameOriginPublicPost.mockReturnValue({ ok: false, status: 403, message: "Publication request verification failed." });
      const res = await POST(makeRequest({ decision: "accepted" }), params());
      expect(res.status).toBe(403);
      const json = await res.json();
      expect(json.error).toMatch(/verification failed|cross-origin/i);
    });

    it("rejects invalid decision values before session, rate limit, or RPC work", async () => {
      mocks.assertSameOriginPublicPost.mockReturnValue({ ok: true });

      const res = await POST(
        makeRequest({ decision: "maybe", note: "Try this" }, { "x-archestimator-csrf": "csrf-token-xyz" }),
        params(),
      );

      expect(res.status).toBe(400);
      await expect(res.json()).resolves.toEqual({
        error: "Invalid decision. Must be accepted, declined, or revision_requested.",
      });
      expect(mocks.createSharedLinkSessionCookieName).not.toHaveBeenCalled();
      expect(mocks.resolveProjectPublicationAccessByToken).not.toHaveBeenCalled();
      expect(mocks.verifySharedLinkSessionCookieValue).not.toHaveBeenCalled();
      expect(mocks.checkSharedLinkDecisionRateLimit).not.toHaveBeenCalled();
      expect(mocks.submitSharedLinkDecision).not.toHaveBeenCalled();
    });

    it("rejects invalid or missing recipient session cookie (P5 guard, additive to password flows)", async () => {
      mocks.assertSameOriginPublicPost.mockReturnValue({ ok: true });
      mocks.verifySharedLinkSessionCookieValue.mockReturnValue(false);
      const req = makeRequest(
        { decision: "declined" },
        { cookie: "shared_link_session_abc123=bad", "x-archestimator-csrf": "t" }
      );
      const res = await POST(req, params());
      expect(res.status).toBe(401);
      const json = await res.json();
      expect(json.error).toMatch(/session|recipient|unauthorized|valid recipient/i);
    });

    it("returns 409 Conflict on duplicate decision (P3 RPC raises 'Decision already submitted.' via snapshot_version unique)", async () => {
      mocks.assertSameOriginPublicPost.mockReturnValue({ ok: true });
      mocks.verifySharedLinkSessionCookieValue.mockReturnValue(true);
      mocks.submitSharedLinkDecision.mockRejectedValue(new Error("Decision already submitted."));
      // Cookie value parsable by route's lightweight session parse (sets recipientIdFromCookie before verify mock)
      const parsableSession = "shared-link-session-v1:eyJyZWNpcGllbnRJZCI6InJlY2lwLTEyMyIsInB1YmxpY2F0aW9uSWQiOiJwdWIxIiwic25hcHNob3RWZXJzaW9uIjoiMSJ9:dummy";
      const req = makeRequest(
        { decision: "accepted", note: "Looks good", signerName: "Client Receiver" },
        { cookie: `shared_link_session_abc123=${encodeURIComponent(parsableSession)}`, "x-archestimator-csrf": "csrf-token-xyz" }
      );
      const res = await POST(req, params());
      expect(res.status).toBe(409);
      const json = await res.json();
      expect(json.error).toMatch(/already submitted|duplicate|decision/i);
    });

    it("requires the publication password access cookie before accepting decisions on password-protected shares", async () => {
      mocks.assertSameOriginPublicPost.mockReturnValue({ ok: true });
      mocks.verifySharedLinkSessionCookieValue.mockReturnValue(true);
      mocks.resolveProjectPublicationAccessByToken.mockResolvedValueOnce({
        publicationId: "pub1",
        snapshotVersion: 1,
        passwordRequired: true,
        status: "published",
        expiresAt: null,
        credentialVersion: "cred-v1",
      });
      const parsableSession = "shared-link-session-v1:eyJyZWNpcGllbnRJZCI6InJlY2lwLTEyMyIsInB1YmxpY2F0aW9uSWQiOiJwdWIxIiwic25hcHNob3RWZXJzaW9uIjoiMSJ9:dummy";

      const res = await POST(
        makeRequest(
          { decision: "declined", note: "blocked before password" },
          { cookie: `shared_link_session_abc123=${encodeURIComponent(parsableSession)}`, "x-archestimator-csrf": "csrf-token-xyz" },
        ),
        params(),
      );

      expect(res.status).toBe(423);
      await expect(res.json()).resolves.toEqual({ error: "Publication password required.", passwordRequired: true });
      expect(mocks.hasPublicationAccessCookie).toHaveBeenCalledWith(expect.stringContaining("shared_link_session_abc123"), {
        token: "client-pub-token-123",
        publicationId: "pub1",
        credentialVersion: "cred-v1",
      });
      expect(mocks.verifySharedLinkSessionCookieValue).not.toHaveBeenCalled();
      expect(mocks.submitSharedLinkDecision).not.toHaveBeenCalled();
    });

    it("rejects sessions bound to a stale credential against the current publication", async () => {
      // AC-MOD-01: the route verifies the session against the publication's
      // credentialVersion (password-derived), NOT snapshot_version. A content-only
      // republish must NOT reject the session; only a credential change does. Here the
      // current publication exposes credentialVersion "cred-v2" while the cookie was
      // minted under "cred-v1", so verification fails and the decision is rejected.
      mocks.assertSameOriginPublicPost.mockReturnValue({ ok: true });
      mocks.resolveProjectPublicationAccessByToken.mockResolvedValue({
        publicationId: "pub1",
        snapshotVersion: 2,
        passwordRequired: false,
        status: "published",
        expiresAt: null,
        credentialVersion: "cred-v2",
      });
      mocks.verifySharedLinkSessionCookieValue.mockImplementation((_value, context) => context.credentialVersion === "cred-v1");
      const staleSession = "shared-link-session-v1:eyJyZWNpcGllbnRJZCI6InJlY2lwLTEyMyIsInB1YmxpY2F0aW9uSWQiOiJwdWIxIiwic25hcHNob3RWZXJzaW9uIjoiMSJ9:dummy";
      const req = makeRequest(
        { decision: "accepted", note: "I approve under the old credential" },
        { cookie: `shared_link_session_abc123=${encodeURIComponent(staleSession)}`, "x-archestimator-csrf": "csrf-token-xyz" },
      );

      const res = await POST(req, params());

      expect(res.status).toBe(401);
      await expect(res.json()).resolves.toEqual({ error: "Valid recipient session required for decisions." });
      expect(mocks.verifySharedLinkSessionCookieValue).toHaveBeenCalledWith(
        staleSession,
        expect.objectContaining({
          token: "client-pub-token-123",
          publicationId: "pub1",
          credentialVersion: "cred-v2",
          recipientId: "recip-123",
        }),
      );
      expect(mocks.checkSharedLinkDecisionRateLimit).not.toHaveBeenCalled();
      expect(mocks.submitSharedLinkDecision).not.toHaveBeenCalled();
    });

    it("accepts valid CSRF + session, calls submitSharedLinkDecision with correct payload, returns 201", async () => {
      mocks.assertSameOriginPublicPost.mockReturnValue({ ok: true });
      mocks.verifySharedLinkSessionCookieValue.mockReturnValue(true);
      mocks.submitSharedLinkDecision.mockResolvedValue({ id: "resp-uuid-xyz" });
      const parsableSession = "shared-link-session-v1:eyJyZWNpcGllbnRJZCI6InJlY2lwLTEyMyIsInB1YmxpY2F0aW9uSWQiOiJwdWIxIiwic25hcHNob3RWZXJzaW9uIjoiMSJ9:dummy";
      const req = makeRequest(
        {
          decision: "revision_requested",
          note: "Please revise pricing on line 3",
          estimateId: TARGET_ESTIMATE_ID,
          rowId: TARGET_ROW_ID,
        },
        { cookie: `shared_link_session_abc123=${encodeURIComponent(parsableSession)}`, "x-archestimator-csrf": "csrf-token-xyz" }
      );
      const res = await POST(req, params());
      expect(res.status).toBe(201);
      const json = await res.json();
      expect(json.id).toBe("resp-uuid-xyz");
      expect(mocks.submitSharedLinkDecision).toHaveBeenCalledWith(
        expect.objectContaining({
          publicationToken: "client-pub-token-123",
          recipientId: "recip-123",
          expectedSnapshotVersion: 1,
          decision: "revision_requested",
          note: "Please revise pricing on line 3",
          estimateId: TARGET_ESTIMATE_ID,
          rowId: TARGET_ROW_ID,
        })
      );
    });

    it("returns 400 when the decision row belongs to a different selected estimate", async () => {
      mocks.assertSameOriginPublicPost.mockReturnValue({ ok: true });
      mocks.verifySharedLinkSessionCookieValue.mockReturnValue(true);
      mocks.submitSharedLinkDecision.mockRejectedValueOnce(
        new Error("Invalid review target: selected line item does not belong to the selected estimate."),
      );
      const parsableSession = "shared-link-session-v1:eyJyZWNpcGllbnRJZCI6InJlY2lwLTEyMyIsInB1YmxpY2F0aW9uSWQiOiJwdWIxIiwic25hcHNob3RWZXJzaW9uIjoiMSJ9:dummy";

      const response = await POST(
        makeRequest(
          {
            decision: "revision_requested",
            estimateId: TARGET_ESTIMATE_ID,
            rowId: TARGET_ROW_ID,
          },
          { cookie: `shared_link_session_abc123=${encodeURIComponent(parsableSession)}`, "x-archestimator-csrf": "csrf-token-xyz" },
        ),
        params(),
      );

      expect(response.status).toBe(400);
      await expect(response.json()).resolves.toEqual({
        error: "Invalid review target: selected line item does not belong to the selected estimate.",
      });
      expect(mocks.checkSharedLinkDecisionRateLimit).toHaveBeenCalledTimes(1);
      expect(mocks.submitSharedLinkDecision).toHaveBeenCalledWith(
        expect.objectContaining({
          estimateId: TARGET_ESTIMATE_ID,
          rowId: TARGET_ROW_ID,
        }),
      );
    });

    it("rejects malformed optional target UUIDs before rate limit or RPC work", async () => {
      mocks.assertSameOriginPublicPost.mockReturnValue({ ok: true });
      mocks.verifySharedLinkSessionCookieValue.mockReturnValue(true);
      const parsableSession = "shared-link-session-v1:eyJyZWNpcGllbnRJZCI6InJlY2lwLTEyMyIsInB1YmxpY2F0aW9uSWQiOiJwdWIxIiwic25hcHNob3RWZXJzaW9uIjoiMSJ9:dummy";

      const res = await POST(
        makeRequest(
          { decision: "revision_requested", estimateId: "not-a-uuid" },
          { cookie: `shared_link_session_abc123=${encodeURIComponent(parsableSession)}`, "x-archestimator-csrf": "csrf-token-xyz" },
        ),
        params(),
      );

      expect(res.status).toBe(400);
      await expect(res.json()).resolves.toEqual({ error: expect.stringMatching(/estimate id.*review target id/i) });
      expect(mocks.checkSharedLinkDecisionRateLimit).not.toHaveBeenCalled();
      expect(mocks.submitSharedLinkDecision).not.toHaveBeenCalled();
    });

    it("rejects malformed optional row UUIDs before rate limit or RPC work", async () => {
      mocks.assertSameOriginPublicPost.mockReturnValue({ ok: true });
      mocks.verifySharedLinkSessionCookieValue.mockReturnValue(true);
      const parsableSession = "shared-link-session-v1:eyJyZWNpcGllbnRJZCI6InJlY2lwLTEyMyIsInB1YmxpY2F0aW9uSWQiOiJwdWIxIiwic25hcHNob3RWZXJzaW9uIjoiMSJ9:dummy";

      const res = await POST(
        makeRequest(
          { decision: "revision_requested", rowId: "not-a-uuid" },
          { cookie: `shared_link_session_abc123=${encodeURIComponent(parsableSession)}`, "x-archestimator-csrf": "csrf-token-xyz" },
        ),
        params(),
      );

      expect(res.status).toBe(400);
      await expect(res.json()).resolves.toEqual({ error: expect.stringMatching(/row id.*review target id/i) });
      expect(mocks.checkSharedLinkDecisionRateLimit).not.toHaveBeenCalled();
      expect(mocks.submitSharedLinkDecision).not.toHaveBeenCalled();
    });

    it("sanitizes and truncates direct API decision notes before RPC", async () => {
      mocks.assertSameOriginPublicPost.mockReturnValue({ ok: true });
      mocks.verifySharedLinkSessionCookieValue.mockReturnValue(true);
      const parsableSession = "shared-link-session-v1:eyJyZWNpcGllbnRJZCI6InJlY2lwLTEyMyIsInB1YmxpY2F0aW9uSWQiOiJwdWIxIiwic25hcHNob3RWZXJzaW9uIjoiMSJ9:dummy";
      const maliciousNote =
        '<script>alert(1)</script><img src=x onerror=alert(2)>&lt;script&gt;alert(3)&lt;/script&gt;<b>Keep this</b>&lt;img src=x onerror=alert(4)&gt; ' +
        "x".repeat(2500);
      const req = makeRequest(
        { decision: "revision_requested", note: maliciousNote },
        { cookie: `shared_link_session_abc123=${encodeURIComponent(parsableSession)}`, "x-archestimator-csrf": "csrf-token-xyz" },
      );

      const res = await POST(req, params());
      const submitted = mocks.submitSharedLinkDecision.mock.calls[0]?.[0];

      expect(res.status).toBe(201);
      expect(submitted.note).not.toContain("<script");
      expect(submitted.note).not.toContain("alert(1)");
      expect(submitted.note).not.toContain("alert(3)");
      expect(submitted.note).not.toContain("alert(4)");
      expect(submitted.note).not.toContain("onerror");
      expect(submitted.note).not.toContain("<img");
      expect(submitted.note).not.toContain("<b>");
      expect(submitted.note).toContain("Keep this");
      expect(submitted.note).toHaveLength(2000);
    });

    it("rejects a stale signed rendered-view snapshot after content-only republish", async () => {
      mocks.assertSameOriginPublicPost.mockReturnValue({ ok: true });
      mocks.verifySharedLinkSessionCookieValue.mockReturnValue(true);
      mocks.resolveProjectPublicationAccessByToken.mockResolvedValueOnce({
        publicationId: "pub1",
        snapshotVersion: 2,
        passwordRequired: false,
        status: "published",
        expiresAt: null,
        credentialVersion: "open",
      });
      mocks.readPublicationViewSnapshotVersion.mockReturnValueOnce(1);
      const parsableSession = "shared-link-session-v1:eyJyZWNpcGllbnRJZCI6InJlY2lwLTEyMyIsInB1YmxpY2F0aW9uSWQiOiJwdWIxIiwic25hcHNob3RWZXJzaW9uIjoiMSJ9:dummy";
      const req = makeRequest(
        { decision: "accepted", note: "Looks good", viewToken: "signed-view-token-v1" },
        { cookie: `shared_link_session_abc123=${encodeURIComponent(parsableSession)}`, "x-archestimator-csrf": "csrf-token-xyz" },
      );

      const res = await POST(req, params());

      expect(res.status).toBe(409);
      await expect(res.json()).resolves.toEqual({
        error: "Publication snapshot changed. Please reload before submitting a decision.",
        currentSnapshotVersion: 2,
      });
      expect(mocks.readPublicationViewSnapshotVersion).toHaveBeenCalledWith("signed-view-token-v1", {
        token: "client-pub-token-123",
        publicationId: "pub1",
      });
      expect(mocks.checkSharedLinkDecisionRateLimit).not.toHaveBeenCalled();
      expect(mocks.submitSharedLinkDecision).not.toHaveBeenCalled();
    });

    it("rejects a tampered rendered-view token before rate limit or RPC work", async () => {
      mocks.assertSameOriginPublicPost.mockReturnValue({ ok: true });
      mocks.verifySharedLinkSessionCookieValue.mockReturnValue(true);
      mocks.readPublicationViewSnapshotVersion.mockReturnValueOnce(undefined);
      const parsableSession = "shared-link-session-v1:eyJyZWNpcGllbnRJZCI6InJlY2lwLTEyMyIsInB1YmxpY2F0aW9uSWQiOiJwdWIxIiwic25hcHNob3RWZXJzaW9uIjoiMSJ9:dummy";
      const req = makeRequest(
        { decision: "accepted", note: "Looks good", viewToken: "tampered-view-token" },
        { cookie: `shared_link_session_abc123=${encodeURIComponent(parsableSession)}`, "x-archestimator-csrf": "csrf-token-xyz" },
      );

      const res = await POST(req, params());

      expect(res.status).toBe(409);
      await expect(res.json()).resolves.toEqual({
        error: "Publication snapshot changed. Please reload before submitting a decision.",
        currentSnapshotVersion: 1,
      });
      expect(mocks.readPublicationViewSnapshotVersion).toHaveBeenCalledWith("tampered-view-token", {
        token: "client-pub-token-123",
        publicationId: "pub1",
      });
      expect(mocks.checkSharedLinkDecisionRateLimit).not.toHaveBeenCalled();
      expect(mocks.submitSharedLinkDecision).not.toHaveBeenCalled();
    });

    it("accepts the current signed rendered-view snapshot", async () => {
      mocks.assertSameOriginPublicPost.mockReturnValue({ ok: true });
      mocks.verifySharedLinkSessionCookieValue.mockReturnValue(true);
      mocks.resolveProjectPublicationAccessByToken.mockResolvedValueOnce({
        publicationId: "pub1",
        snapshotVersion: 2,
        passwordRequired: false,
        status: "published",
        expiresAt: null,
        credentialVersion: "open",
      });
      mocks.readPublicationViewSnapshotVersion.mockReturnValueOnce(2);
      const parsableSession = "shared-link-session-v1:eyJyZWNpcGllbnRJZCI6InJlY2lwLTEyMyIsInB1YmxpY2F0aW9uSWQiOiJwdWIxIiwic25hcHNob3RWZXJzaW9uIjoiMSJ9:dummy";
      const req = makeRequest(
        { decision: "accepted", note: "Looks good", signerName: "Client Receiver", viewToken: "signed-view-token-v2" },
        { cookie: `shared_link_session_abc123=${encodeURIComponent(parsableSession)}`, "x-archestimator-csrf": "csrf-token-xyz" },
      );

      const res = await POST(req, params());

      expect(res.status).toBe(201);
      expect(mocks.submitSharedLinkDecision).toHaveBeenCalledWith(
        expect.objectContaining({
          expectedSnapshotVersion: 2,
          signerName: "Client Receiver",
        }),
      );
    });

    it("uses durable decision rate limiting before submitting a decision", async () => {
      mocks.assertSameOriginPublicPost.mockReturnValue({ ok: true });
      mocks.verifySharedLinkSessionCookieValue.mockReturnValue(true);
      mocks.checkSharedLinkDecisionRateLimit.mockResolvedValueOnce({
        allowed: false,
        message: "Too many attempts. Please wait 60 seconds.",
        retryAfter: 60,
      });
      const parsableSession = "shared-link-session-v1:eyJyZWNpcGllbnRJZCI6InJlY2lwLTEyMyIsInB1YmxpY2F0aW9uSWQiOiJwdWIxIiwic25hcHNob3RWZXJzaW9uIjoiMSJ9:dummy";
      const req = makeRequest(
        { decision: "accepted", signerName: "Client Receiver" },
        {
          cookie: `shared_link_session_abc123=${encodeURIComponent(parsableSession)}`,
          "x-archestimator-csrf": "csrf-token-xyz",
        },
      );

      const res = await POST(req, params());

      expect(res.status).toBe(429);
      expect(res.headers.get("retry-after")).toBe("60");
      expect(await res.json()).toEqual({ error: "Too many attempts. Please wait 60 seconds." });
      expect(mocks.submitSharedLinkDecision).not.toHaveBeenCalled();
    });

    it("maps known recipient lookup failures to a generic 403", async () => {
      mocks.assertSameOriginPublicPost.mockReturnValue({ ok: true });
      mocks.verifySharedLinkSessionCookieValue.mockReturnValue(true);
      mocks.submitSharedLinkDecision.mockRejectedValue(new Error("Recipient not found for decision."));
      const parsableSession = "shared-link-session-v1:eyJyZWNpcGllbnRJZCI6InJlY2lwLTEyMyIsInB1YmxpY2F0aW9uSWQiOiJwdWIxIiwic25hcHNob3RWZXJzaW9uIjoiMSJ9:dummy";
      const req = makeRequest(
        { decision: "accepted", signerName: "Client Receiver" },
        { cookie: `shared_link_session_abc123=${encodeURIComponent(parsableSession)}`, "x-archestimator-csrf": "t" },
      );
      const res = await POST(req, params());
      expect(res.status).toBe(403);
      await expect(res.json()).resolves.toEqual({ error: "Decision could not be submitted for this recipient." });
    });

    it("does not classify raw recipient-table failures as public recipient errors", async () => {
      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      const rawDbError = 'relation "shared_link_recipients" does not exist';
      mocks.assertSameOriginPublicPost.mockReturnValue({ ok: true });
      mocks.verifySharedLinkSessionCookieValue.mockReturnValue(true);
      mocks.submitSharedLinkDecision.mockRejectedValue(new Error(rawDbError));
      const parsableSession = "shared-link-session-v1:eyJyZWNpcGllbnRJZCI6InJlY2lwLTEyMyIsInB1YmxpY2F0aW9uSWQiOiJwdWIxIiwic25hcHNob3RWZXJzaW9uIjoiMSJ9:dummy";
      const req = makeRequest(
        { decision: "accepted", signerName: "Client Receiver" },
        { cookie: `shared_link_session_abc123=${encodeURIComponent(parsableSession)}`, "x-archestimator-csrf": "t" },
      );

      const res = await POST(req, params());

      expect(res.status).toBe(500);
      const body = await res.json();
      expect(body).toEqual({ error: "Something went wrong. Please try again." });
      expect(JSON.stringify(body)).not.toContain("shared_link_recipients");
      expect(JSON.stringify(body)).not.toContain("relation");

      consoleSpy.mockRestore();
    });

    // SEC-15 (AC-SEC-15): a forced UNEXPECTED RPC/DB error (one that maps to 500) must return a
    // GENERIC message to the public client — the raw error string must not appear in the response
    // body — while the detailed message is logged server-side via console.error.
    it("returns a generic 500 envelope and never echoes the raw RPC/DB error string (SEC-15)", async () => {
      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      const rawDbError = 'duplicate key value violates unique constraint "shared_link_responses_pkey" DETAIL: internal db guts';
      mocks.assertSameOriginPublicPost.mockReturnValue({ ok: true });
      mocks.verifySharedLinkSessionCookieValue.mockReturnValue(true);
      mocks.submitSharedLinkDecision.mockRejectedValue(new Error(rawDbError));
      const parsableSession = "shared-link-session-v1:eyJyZWNpcGllbnRJZCI6InJlY2lwLTEyMyIsInB1YmxpY2F0aW9uSWQiOiJwdWIxIiwic25hcHNob3RWZXJzaW9uIjoiMSJ9:dummy";
      const req = makeRequest(
        { decision: "accepted", signerName: "Client Receiver" },
        { cookie: `shared_link_session_abc123=${encodeURIComponent(parsableSession)}`, "x-archestimator-csrf": "csrf" },
      );

      const res = await POST(req, params());

      expect(res.status).toBe(500);
      const json = (await res.json()) as { error: string };
      // Client gets a generic message; the raw DB error string is NOT in the response body.
      expect(json.error).toBe("Something went wrong. Please try again.");
      expect(JSON.stringify(json)).not.toContain("shared_link_responses_pkey");
      expect(JSON.stringify(json)).not.toContain("internal db guts");

      // The detailed message IS logged server-side (truncated) for operators.
      const loggedDetail = consoleSpy.mock.calls.some((call) =>
        JSON.stringify(call[0] ?? "").includes("shared_link_responses_pkey"),
      );
      expect(loggedDetail).toBe(true);

      consoleSpy.mockRestore();
    });
  });


  describe("recipient-aware activity copy", () => {
    it("renders safe recipient decision digest copy", () => {
      const accepted = composeSharedLinkActivity({ id: "decision-a", type: "decision", created_at: "2026-06-02T00:00:00.000Z", recipientDisplayName: "Maria", decision: "accepted" }, { audience: "client", visibility: "public" });
      const declined = composeSharedLinkActivity({ id: "decision-d", type: "decision", created_at: "2026-06-02T00:01:00.000Z", recipientDisplayName: "Maria", decision: "declined" }, { audience: "client", visibility: "public" });
      const revision = composeSharedLinkActivity({ id: "decision-r", type: "decision", created_at: "2026-06-02T00:02:00.000Z", recipientDisplayName: "Maria", decision: "revision_requested" }, { audience: "client", visibility: "public" });
      const rowRevision = composeSharedLinkActivity(
        {
          id: "decision-row",
          type: "decision",
          created_at: "2026-06-02T00:03:00.000Z",
          recipientDisplayName: "Maria",
          decision: "revision_requested",
          metadata: { targetKind: "row", targetLabel: "Concrete works", targetSecondaryLabel: "Main Estimate" },
        },
        { audience: "client", visibility: "public" },
      );

      expect(accepted.title).toBe("Maria approved the proposal.");
      expect(declined.title).toBe("Maria declined the proposal.");
      expect(revision.title).toBe("Maria requested revisions.");
      expect(rowRevision.title).toBe("Maria requested revisions for Concrete works.");
      expect(rowRevision.target).toEqual({ kind: "row", label: "Concrete works", secondaryLabel: "Main Estimate" });
      expect([accepted, declined, revision].map((activity) => activity.raw)).toEqual([undefined, undefined, undefined]);
    });
  });

  describe("SharePageDecision component (Accept/Decline/Request Revision buttons + confirmation modal + read-only lock + 409 handling + post-decision comments allowed)", () => {
    it("renders an informational read-only state (no interactive buttons) when no valid session (P5 hook)", () => {
      mocks.useSharedLinkSession.mockReturnValue({ isValid: false });
      const { container } = renderSharePageDecision(<SharePageDecision token="t1" viewToken="view-token" />);
      // AC-UX-07: the no-session state is a read-only explanation (which legitimately
      // mentions how to accept/decline/request a revision), but it must NOT render any
      // interactive decision controls.
      expect(container.querySelector('[data-testid="decision-anonymous-state"]')).not.toBeNull();
      expect(container.querySelector('[aria-label="Approve proposal"]')).toBeNull();
      expect(container.querySelector('[aria-label="Decline proposal"]')).toBeNull();
      expect(container.querySelector('[aria-label="Request changes"]')).toBeNull();
    });

    it("renders the three decision buttons when session valid and undecided", () => {
      mocks.useSharedLinkSession.mockReturnValue({ isValid: true });
      renderSharePageDecision(<SharePageDecision token="t1" viewToken="view-token" />);
      expect(screen.getByRole("button", { name: /approve proposal/i })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /decline/i })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /request changes/i })).toBeInTheDocument();
    });

    it("POSTs selected line-item context from the confirmation modal and shows the scope in the locked badge", async () => {
      mocks.useSharedLinkSession.mockReturnValue({ isValid: true });
      // @ts-expect-error fetch mock
      global.fetch = vi.fn().mockResolvedValue({ ok: true, status: 201, json: async () => ({ id: "d1" }) });
      const user = userEvent.setup();

      renderSharePageDecision(
        <SharePageDecision
          token="t1"
          viewToken="view-token"
          reviewTarget={{
            kind: "row",
            label: "Concrete works",
            secondaryLabel: "Main Estimate",
            estimateId: TARGET_ESTIMATE_ID,
            rowId: TARGET_ROW_ID,
          }}
        />,
      );

      expect(screen.getByText("Applies to Concrete works")).toBeInTheDocument();
      await user.click(screen.getByRole("button", { name: /request changes/i }));
      expect(await screen.findByRole("dialog", { name: /request changes/i })).toBeInTheDocument();
      expect(screen.getAllByText(/Concrete works/).length).toBeGreaterThan(0);
      await user.click(screen.getByRole("button", { name: /^Confirm$/i }));

      await waitFor(() => expect(screen.getByTestId("decision-locked-badge")).toBeInTheDocument());
      const postCall = vi
        .mocked(global.fetch)
        .mock.calls.find(([, init]) => (init as RequestInit | undefined)?.method === "POST");
      expect(JSON.parse(String((postCall?.[1] as RequestInit).body))).toEqual(
        expect.objectContaining({
          decision: "revision_requested",
          viewToken: "view-token",
          estimateId: TARGET_ESTIMATE_ID,
          rowId: TARGET_ROW_ID,
        }),
      );
      expect(screen.getByText(/Applies to Concrete works/)).toBeInTheDocument();
    });
    it("loads a prior recipient decision on mount and keeps the response locked after reload", async () => {
      mocks.useSharedLinkSession.mockReturnValue({ isValid: true });
      // @ts-expect-error fetch mock
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          decision: {
            type: "accepted",
            note: "Looks good.",
            submittedAt: "2026-06-03T01:00:00.000Z",
            signerName: "Client Receiver",
          },
        }),
      });

      renderSharePageDecision(<SharePageDecision token="t1" viewToken="view-token" />);

      expect(await screen.findByTestId("decision-locked-badge")).toBeInTheDocument();
      expect(screen.getByText("Accepted")).toBeInTheDocument();
      expect(screen.getByText("Note: Looks good.")).toBeInTheDocument();
      expect(screen.getByText(/Approved by Client Receiver on/)).toBeInTheDocument();
      expect(screen.queryByRole("button", { name: /approve proposal/i })).not.toBeInTheDocument();
      expect(global.fetch).toHaveBeenCalledWith(
        "/api/share/t1/decision",
        expect.objectContaining({ method: "GET", headers: { Accept: "application/json" } }),
      );
    });


    it("opens confirmation modal with tailored copy before finalizing (no POST until confirm)", async () => {
      mocks.useSharedLinkSession.mockReturnValue({ isValid: true });
      const user = userEvent.setup();
      renderSharePageDecision(<SharePageDecision token="t1" viewToken="view-token" />);
      await user.click(screen.getByRole("button", { name: /approve proposal/i }));
      // Modal should appear (implementation uses role=dialog or visible confirm UI)
      await waitFor(() => {
        // Use getAllBy + first to tolerate any transient duplicates in test env; core contract is modal appears with tailored copy
        const matches = screen.getAllByText(/Approve this proposal\?|We'll notify the project team/i);
        expect(matches.length).toBeGreaterThan(0);
      });
      // Cancel does not POST
      const cancel = screen.getByRole("button", { name: /cancel/i });
      await user.click(cancel);
      expect(
        vi.mocked(global.fetch).mock.calls.filter(([, init]) => (init as RequestInit | undefined)?.method === "POST"),
      ).toHaveLength(0);
    });
    it("traps modal focus, closes on Escape, and restores focus to the trigger", async () => {
      mocks.useSharedLinkSession.mockReturnValue({ isValid: true });
      const user = userEvent.setup();
      renderSharePageDecision(<SharePageDecision token="t1" viewToken="view-token" />);

      const acceptButton = screen.getByRole("button", { name: /approve proposal/i });
      acceptButton.focus();
      await user.click(acceptButton);

      const dialog = await screen.findByRole("dialog", { name: /approve this proposal/i });
      expect(dialog).toHaveAttribute("aria-modal", "true");
      expect(dialog).toHaveAttribute("aria-labelledby", "decision-confirm-title");
      await waitFor(() => expect(screen.getByLabelText(/your name/i)).toHaveFocus());

      await user.tab({ shift: true });
      expect(screen.getByRole("button", { name: /cancel/i })).toHaveFocus();
      await user.tab();
      expect(screen.getByLabelText(/your name/i)).toHaveFocus();

      await user.keyboard("{Escape}");
      await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
      await waitFor(() => expect(acceptButton).toHaveFocus());
    });


    it("on confirm in modal, POSTs to /api/share/[token]/decision with CSRF header + decision + note, then locks to read-only badge", async () => {
      mocks.useSharedLinkSession.mockReturnValue({ isValid: true });
      // @ts-expect-error fetch mock
      global.fetch = vi.fn().mockResolvedValue({ ok: true, status: 201, json: async () => ({ id: "d1" }) });
      const user = userEvent.setup();
      renderSharePageDecision(<SharePageDecision token="t1" viewToken="view-token" />);
      await user.click(screen.getByRole("button", { name: /decline/i }));
      await waitFor(() => expect(screen.getByRole("button", { name: /^Confirm$/i })).toBeInTheDocument());
      const noteInput = screen.queryByPlaceholderText(/note|reason|comment/i);
      if (noteInput) await user.type(noteInput, "Pricing too high");
      const confirmBtn = screen.getByRole("button", { name: /^Confirm$/i });
      await user.click(confirmBtn);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining("/api/share/t1/decision"),
          expect.objectContaining({ method: "POST", headers: expect.objectContaining({ "x-archestimator-csrf": expect.any(String) }) })
        );
      });
      const postCall = vi
        .mocked(global.fetch)
        .mock.calls.find(([, init]) => (init as RequestInit | undefined)?.method === "POST");
      const requestInit = postCall?.[1] as RequestInit;
      const headers = requestInit.headers as Record<string, string>;
      expect(headers["x-archestimator-csrf"]).not.toBe(["client", "post"].join("-"));
      expect(document.cookie).toContain(`ae_publication_csrf=${headers["x-archestimator-csrf"]}`);
      // After success, shows read-only badge/lock (not the 3 buttons)
      await waitFor(() => {
        expect(screen.getByTestId("decision-locked-badge")).toBeInTheDocument();
        expect(screen.queryByRole("button", { name: /approve proposal/i })).not.toBeInTheDocument();
      });
    });

    it("handles duplicate decisions by reloading the persisted target before locking the UI", async () => {
      mocks.useSharedLinkSession.mockReturnValue({ isValid: true });
      let getCount = 0;
      // @ts-expect-error fetch mock
      global.fetch = vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
        if (init?.method === "POST") {
          return { ok: false, status: 409, json: async () => ({ error: "Decision already submitted." }) };
        }
        getCount += 1;
        if (getCount === 1) {
          return { ok: true, status: 200, json: async () => ({ decision: null }) };
        }
        return {
          ok: true,
          status: 200,
          json: async () => ({
            decision: {
              type: "revision_requested",
              note: "Already submitted from another tab.",
              submittedAt: "2026-06-03T01:00:00.000Z",
              estimateId: TARGET_ESTIMATE_ID,
              rowId: TARGET_ROW_ID,
              targetKind: "row",
              targetLabel: "Concrete works",
              targetSecondaryLabel: "Main Estimate",
            },
          }),
        };
      });
      const user = userEvent.setup();
      renderSharePageDecision(
        <SharePageDecision
          token="t1"
          viewToken="view-token"
          reviewTarget={{
            kind: "estimate",
            label: "Wrong attempted estimate",
            estimateId: "33333333-3333-4333-8333-333333333333",
            rowId: null,
          }}
        />,
      );
      await user.click(screen.getByRole("button", { name: /approve proposal/i }));
      await waitFor(() => expect(screen.getByRole("button", { name: /^Confirm$/i })).toBeInTheDocument());
      await user.type(screen.getByLabelText(/your name/i), "Client Receiver");
      const confirmBtn = screen.getByRole("button", { name: /^Confirm$/i });
      await user.click(confirmBtn);

      await waitFor(() => {
        expect(screen.getByTestId("decision-locked-badge")).toBeInTheDocument();
        expect(screen.queryByRole("button", { name: /approve proposal/i })).not.toBeInTheDocument();
      });
      expect(screen.getByText("Revision requested")).toBeInTheDocument();
      expect(screen.getByText(/Applies to Concrete works · Main Estimate/)).toBeInTheDocument();
      expect(screen.queryByText(/Wrong attempted estimate/)).not.toBeInTheDocument();
    });

    it("announces decision submission failures as alerts", async () => {
      mocks.useSharedLinkSession.mockReturnValue({ isValid: true });
      // @ts-expect-error fetch mock
      global.fetch = vi.fn().mockResolvedValue({ ok: false, status: 500, json: async () => ({ error: "Please retry later." }) });
      const user = userEvent.setup();

      renderSharePageDecision(<SharePageDecision token="t1" viewToken="view-token" />);
      await user.click(screen.getByRole("button", { name: /approve proposal/i }));
      await waitFor(() => expect(screen.getByRole("button", { name: /^Confirm$/i })).toBeInTheDocument());
      await user.type(screen.getByLabelText(/your name/i), "Client Receiver");
      await user.click(screen.getByRole("button", { name: /^Confirm$/i }));

      await waitFor(() => {
        const alerts = screen.getAllByRole("alert");
        expect(alerts.length).toBeGreaterThan(0);
        expect(alerts.some((alert) => alert.textContent === "Please retry later.")).toBe(true);
      });
    });

    it("keeps the comment composer usable after the decision component locks", async () => {
      mocks.useSharedLinkSession.mockReturnValue({ isValid: true });
      const user = userEvent.setup();
      // @ts-expect-error fetch mock
      global.fetch = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = String(input);
        if (url.includes("/decision") && init?.method === "POST") {
          return { ok: true, status: 201, json: async () => ({ id: "decision-1" }) };
        }
        if (url.includes("/comment") && init?.method === "POST") {
          return {
            ok: true,
            status: 201,
            json: async () => ({
              id: "comment-after-decision",
              comment: {
                id: "comment-after-decision",
                content: "Follow-up after approval.",
                authorName: "You",
                authorType: "recipient",
                createdAt: "2026-06-03T01:05:00.000Z",
              },
            }),
          };
        }
        return { ok: true, status: 200, json: async () => (url.includes("/comment") ? { comments: [] } : { decision: null }) };
      });

      renderSharePageDecision(
        <>
          <SharePageDecision token="t1" viewToken="view-token" />
          <SharePageComments token="t1" viewToken="view-token" />
        </>
      );

      await user.click(screen.getByRole("button", { name: /approve proposal/i }));
      await waitFor(() => expect(screen.getByRole("button", { name: /^Confirm$/i })).toBeInTheDocument());
      await user.type(screen.getByLabelText(/your name/i), "Client Receiver");
      await user.click(screen.getByRole("button", { name: /^Confirm$/i }));
      await waitFor(() => expect(screen.getByTestId("decision-locked-badge")).toBeInTheDocument());

      await user.type(screen.getByPlaceholderText(/add a comment/i), "Follow-up after approval.");
      await user.click(screen.getByRole("button", { name: /send/i }));

      await waitFor(() => expect(screen.getByText("Follow-up after approval.")).toBeInTheDocument());
      const commentPost = vi
        .mocked(global.fetch)
        .mock.calls.find(([input, init]) => String(input).includes("/comment") && (init as RequestInit | undefined)?.method === "POST");
      expect(JSON.parse(String((commentPost?.[1] as RequestInit).body))).toEqual(
        expect.objectContaining({
          body: "Follow-up after approval.",
          viewToken: "view-token",
        }),
      );
    });
  });
});
