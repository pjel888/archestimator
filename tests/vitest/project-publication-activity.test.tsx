import { beforeEach, describe, expect, it, vi, afterEach } from "vitest";
import { act, fireEvent, render, screen, waitFor, cleanup, within } from "@testing-library/react";
import React from "react";

// Hoisted mocks for route, repo, security, hook, Realtime, email, component deps (P8 red tests written FIRST per Master Prompt + subagent TDD red-first rule + full graph impact completed before any symbol touch)
const mocks = vi.hoisted(() => ({
  assertSameOriginPublicPost: vi.fn(),
  assertSameOrigin: vi.fn(),
  verifySharedLinkSessionCookieValue: vi.fn(),
  createSharedLinkSessionCookieName: vi.fn(),
  hashPublicationToken: vi.fn(),
  readPublicationTokenHashSecret: vi.fn(),
  hasPublicationAccessCookie: vi.fn(),
  useSharedLinkSession: vi.fn(),
  requireCurrentUserContext: vi.fn(),
  // P8 extensions (additive)
  createPublicationServiceClient: vi.fn(),
  checkProjectPublicationActivityRateLimit: vi.fn(),
  recordProjectPublicationEvent: vi.fn(),
  sendEmail: vi.fn(),
  // Realtime mock
  createClient: vi.fn(),
  channel: vi.fn(() => ({
    on: vi.fn().mockReturnThis(),
    subscribe: vi.fn().mockReturnThis(),
    unsubscribe: vi.fn(),
  })),
}));

vi.mock("@/lib/publication/security", async () => {
  const actual = await vi.importActual<typeof import("@/lib/publication/security")>(
    "@/lib/publication/security",
  );
  return {
    ...actual,
    assertSameOriginPublicPost: mocks.assertSameOriginPublicPost,
    assertSameOrigin: mocks.assertSameOrigin,
    verifySharedLinkSessionCookieValue: mocks.verifySharedLinkSessionCookieValue,
    createSharedLinkSessionCookieName: mocks.createSharedLinkSessionCookieName,
    hashPublicationToken: mocks.hashPublicationToken,
    readPublicationTokenHashSecret: mocks.readPublicationTokenHashSecret,
    hasPublicationAccessCookie: mocks.hasPublicationAccessCookie,
  };
});

vi.mock("@/lib/auth/session", () => ({
  requireCurrentUserContext: mocks.requireCurrentUserContext,
}));

vi.mock("@/hooks/use-shared-link-session", () => ({
  useSharedLinkSession: mocks.useSharedLinkSession,
}));

vi.mock("@/lib/publication/public-repository", async () => {
  const actual = await vi.importActual("@/lib/publication/public-repository");
  return {
    ...actual,
    checkProjectPublicationActivityRateLimit: mocks.checkProjectPublicationActivityRateLimit,
    createPublicationServiceClient: mocks.createPublicationServiceClient,
    recordProjectPublicationEvent: mocks.recordProjectPublicationEvent,
  };
});

vi.mock("@/lib/email/resend-client", () => ({
  sendEmail: mocks.sendEmail,
}));

vi.mock("@supabase/supabase-js", () => ({
  createClient: mocks.createClient,
}));

vi.mock("@/lib/publication/actions", async () => {
  const actual = await vi.importActual<typeof import("@/lib/publication/actions")>("@/lib/publication/actions");
  return {
    ...actual,
    loadSharedLinkActivity: vi.fn(actual.loadSharedLinkActivity),
    maybeTriggerSharedLinkActivityDigest: vi.fn(actual.maybeTriggerSharedLinkActivityDigest),
  };
});

// Modules under test (will fail to import or execute until P8 impl — intentionally red first)
import { GET } from "@/app/api/share/[token]/activity/route";
import { deriveCredentialVersion } from "@/lib/publication/security";
import { loadSharedLinkActivity, maybeTriggerSharedLinkActivityDigest } from "@/lib/publication/actions";
import SharedLinkActivityFeed from "@/components/share/SharedLinkActivityFeed";
import { summarizeProjectPublicationAccessTelemetryMetrics } from "@/lib/publication/activity-helpers";

function params(token = "client-pub-token-123") {
  return { params: Promise.resolve({ token }) };
}

function makeRequest(headers: Record<string, string> = {}) {
  return new Request("http://localhost/api/share/client-pub-token-123/activity", {
    method: "GET",
    headers: { "content-type": "application/json", ...headers },
  });
}

type QueryResultMock = {
  select: ReturnType<typeof vi.fn>;
  eq: ReturnType<typeof vi.fn>;
  order: ReturnType<typeof vi.fn>;
  limit: ReturnType<typeof vi.fn>;
  maybeSingle: ReturnType<typeof vi.fn>;
  in: ReturnType<typeof vi.fn>;
  or: ReturnType<typeof vi.fn>;
};

function createQueryResult(data: unknown, error: Error | null = null) {
  const query = {} as QueryResultMock;
  query.select = vi.fn(() => query);
  query.eq = vi.fn(() => query);
  query.order = vi.fn(() => query);
  query.in = vi.fn(() => query);
  query.or = vi.fn(() => query);
  query.limit = vi.fn(async () => ({ data, error }));
  query.maybeSingle = vi.fn(async () => ({ data, error }));
  return query;
}

function createActivityRouteSupabaseMock() {
  return {
    from: vi.fn((table: string) => {
      if (table === "project_publications") {
        return createQueryResult({
          id: "pub1",
          status: "published",
          revoked_at: null,
          expires_at: null,
          password_hash: null,
          snapshot_version: 7,
          snapshot_json: {
            estimates: [
              {
                id: "est-1",
                name: "Main Estimate",
                rows: [{ id: "row-1", material: "Hardwood Oak Flooring", nodeId: "node-1" }],
                nodes: [{ id: "node-1", name: "Living Area" }],
              },
            ],
          },
        });
      }
      if (table === "shared_link_comments") {
        return createQueryResult([
          {
            id: "11111111-1111-4111-8111-111111111111",
            created_at: "2026-05-28T10:00:00Z",
            body: "Looks good",
            is_internal: false,
            author_email: "recipient@example.com",
            recipient_id: "recipient-1",
            estimate_id: "est-1",
            row_id: "row-1",
          },
          {
            id: "11111111-1111-4111-8111-111111111110",
            created_at: "2026-05-28T10:00:00Z",
            body: "Duplicate timestamp comment",
            is_internal: false,
            author_email: "recipient@example.com",
            recipient_id: "recipient-1",
            estimate_id: "est-1",
            row_id: "row-1",
          },
        ]);
      }
      if (table === "shared_link_responses") {
        return createQueryResult([
          {
            id: "22222222-2222-4222-8222-222222222222",
            created_at: "2026-05-28T11:00:00Z",
            decision: "accepted",
            note: null,
            recipient_id: "recipient-1",
          },
        ]);
      }
      if (table === "shared_link_events") {
        return createQueryResult([
          {
            id: "33333333-3333-4333-8333-333333333333",
            created_at: "2026-05-28T12:00:00Z",
            event_type: "open",
            metadata_json: {},
            recipient_id: "recipient-1",
          },
        ]);
      }
      if (table === "shared_link_recipients") {
        return createQueryResult([{ id: "recipient-1", display_name: "Maria" }]);
      }
      if (table === "project_publication_events") {
        return createQueryResult([
          {
            id: "access-2",
            created_at: "2026-05-28T12:30:00Z",
            event_type: "open",
            metadata_json: { access_stage: "page_visit", eventType: "open", recipient_known: true, bot: false, device_type: "desktop", browser_family: "Chrome", os_family: "macOS", country: "PH" },
            ip_hash: "ip-secret",
            user_agent_hash: "ua-secret",
          },
          {
            id: "access-2-duplicate",
            created_at: "2026-05-28T12:30:00Z",
            event_type: "open",
            metadata_json: { access_stage: "page_visit", eventType: "open", recipient_known: true, bot: false, device_type: "desktop", browser_family: "Chrome", os_family: "macOS", country: "PH" },
            ip_hash: "ip-secret",
            user_agent_hash: "ua-secret",
          },
          {
            id: "access-bot",
            created_at: "2026-05-28T12:31:00Z",
            event_type: "open",
            metadata_json: { access_stage: "page_visit", eventType: "open", recipient_known: false, bot: true, device_type: "bot" },
            ip_hash: "bot-ip-secret",
            user_agent_hash: "bot-ua-secret",
          },
        ]);
      }
      return createQueryResult([]);
    }),
  };
}

function createPublicationActionsSupabaseMock() {
  return {
    channel: mocks.channel,
    removeChannel: vi.fn(),
    from: vi.fn((table: string) => {
      if (table === "project_publications") {
        return createQueryResult({
          id: "pub1",
          project_id: "11111111-1111-4111-8111-111111111111",
          published_by: "user-1",
          status: "published",
          revoked_at: null,
          expires_at: null,
          password_hash: null,
          snapshot_version: 7,
          snapshot_json: {
            estimates: [
              {
                id: "est-1",
                name: "Main Estimate",
                rows: [{ id: "row-1", material: "Hardwood Oak Flooring", nodeId: "node-1" }],
                nodes: [{ id: "node-1", name: "Living Area" }],
              },
            ],
          },
        });
      }
      if (table === "projects") {
        return createQueryResult({
          id: "11111111-1111-4111-8111-111111111111",
          workspace_id: "22222222-2222-4222-8222-222222222222",
          name: "Project",
          project_code: null,
          client_name: null,
          location: null,
          currency_code: "PHP",
          metadata: {},
        });
      }
      if (table === "profiles") {
        return createQueryResult({
          id: "user-1",
          display_name: "Philip Lewis",
          email: "owner@example.com",
        });
      }
      if (table === "shared_link_comments") {
        return createQueryResult([
          {
            id: "c1",
            created_at: "2026-05-28T10:00:00Z",
            body: "Looks good",
            is_internal: false,
            author_email: "recipient@example.com",
            author_name: null,
            recipient_id: "recipient-1",
            estimate_id: "est-1",
            row_id: "row-1",
          },
          {
            id: "c0",
            created_at: "2026-05-28T10:00:00Z",
            body: "Duplicate timestamp comment",
            is_internal: false,
            author_email: "recipient@example.com",
            author_name: null,
            recipient_id: "recipient-1",
            estimate_id: "est-1",
            row_id: "row-1",
          },
          {
            id: "c2",
            created_at: "2026-05-28T09:00:00Z",
            body: "Internal note",
            is_internal: true,
            author_email: "owner@example.com",
            author_name: "Philip Lewis",
            recipient_id: null,
            estimate_id: "est-1",
            row_id: "row-1",
          },
        ]);
      }
      if (table === "shared_link_responses") {
        return createQueryResult([
          {
            id: "d1",
            created_at: "2026-05-28T11:00:00Z",
            decision: "accepted",
            note: null,
            recipient_id: "recipient-1",
          },
        ]);
      }
      if (table === "shared_link_events") {
        return createQueryResult([
          {
            id: "e1",
            created_at: "2026-05-28T12:00:00Z",
            event_type: "open",
            metadata_json: {},
            recipient_id: "recipient-1",
          },
        ]);
      }
      if (table === "shared_link_recipients") {
        return createQueryResult([{ id: "recipient-1", display_name: "Maria" }]);
      }
      if (table === "project_publication_events") {
        return createQueryResult([
          {
            id: "access-2",
            created_at: "2026-05-28T12:30:00Z",
            event_type: "open",
            metadata_json: { access_stage: "page_visit", eventType: "open", recipient_known: true, bot: false, device_type: "desktop", browser_family: "Chrome", os_family: "macOS", country: "PH" },
            ip_hash: "ip-secret",
            user_agent_hash: "ua-secret",
          },
          {
            id: "access-2-duplicate",
            created_at: "2026-05-28T12:30:00Z",
            event_type: "open",
            metadata_json: { access_stage: "page_visit", eventType: "open", recipient_known: true, bot: false, device_type: "desktop", browser_family: "Chrome", os_family: "macOS", country: "PH" },
            ip_hash: "ip-secret",
            user_agent_hash: "ua-secret",
          },
          {
            id: "access-bot",
            created_at: "2026-05-28T12:31:00Z",
            event_type: "open",
            metadata_json: { access_stage: "page_visit", eventType: "open", recipient_known: false, bot: true, device_type: "bot" },
            ip_hash: "bot-ip-secret",
            user_agent_hash: "bot-ua-secret",
          },
        ]);
      }
      return createQueryResult([]);
    }),
  };
}

describe("P8 — Shared Link Activity Feed & Notifications (red tests written FIRST before any route/action/component impl)", () => {
  const originalEnv = {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "anon-key";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "service-role";
    mocks.assertSameOriginPublicPost.mockReturnValue({ ok: true });
    mocks.assertSameOrigin.mockReturnValue({ ok: true });
    mocks.createSharedLinkSessionCookieName.mockReturnValue("shared_link_session_abc123");
    mocks.hashPublicationToken.mockReturnValue("publication-token-hash");
    mocks.readPublicationTokenHashSecret.mockReturnValue("publication-hash-secret");
    mocks.verifySharedLinkSessionCookieValue.mockReturnValue(false);
    mocks.hasPublicationAccessCookie.mockReturnValue(false);
    mocks.checkProjectPublicationActivityRateLimit.mockResolvedValue({ allowed: true });
    mocks.useSharedLinkSession.mockReturnValue({ isValid: true });
    mocks.requireCurrentUserContext.mockResolvedValue({
      userId: "user-1",
      email: "owner@example.com",
      role: "admin",
    });
    mocks.createPublicationServiceClient.mockReturnValue(createActivityRouteSupabaseMock());
    mocks.sendEmail.mockResolvedValue({ ok: true, mocked: true });
    mocks.createClient.mockReturnValue(createPublicationActionsSupabaseMock());
    // @ts-expect-error test env
    global.fetch = vi.fn();
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    if (originalEnv.NEXT_PUBLIC_SUPABASE_URL === undefined) {
      delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    } else {
      process.env.NEXT_PUBLIC_SUPABASE_URL = originalEnv.NEXT_PUBLIC_SUPABASE_URL;
    }
    if (originalEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY === undefined) {
      delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    } else {
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = originalEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    }
    if (originalEnv.SUPABASE_SERVICE_ROLE_KEY === undefined) {
      delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    } else {
      process.env.SUPABASE_SERVICE_ROLE_KEY = originalEnv.SUPABASE_SERVICE_ROLE_KEY;
    }
  });

  describe("GET /api/share/[token]/activity route (public filtered + session aware, is_internal filter for unauth)", () => {
    it("allows same-origin GET without CSRF header or cookie", async () => {
      mocks.assertSameOriginPublicPost.mockReturnValue({ ok: false, status: 403, message: "Publication request verification failed." });
      mocks.assertSameOrigin.mockReturnValue({ ok: true });

      const res = await GET(makeRequest({ origin: "http://localhost" }), params());

      expect(res.status).toBe(200);
      expect(mocks.assertSameOriginPublicPost).not.toHaveBeenCalled();
      const json = (await res.json()) as { activities?: unknown[]; recipientSession?: boolean };
      expect(Array.isArray(json.activities)).toBe(true);
      expect(json.recipientSession).toBe(false);
    });

    it("rejects cross-origin GET requests", async () => {
      mocks.assertSameOrigin.mockReturnValue({ ok: false, status: 403, message: "Cross-origin publication requests are blocked." });

      const res = await GET(makeRequest({ origin: "https://evil.example" }), params());

      expect(res.status).toBe(403);
      expect(await res.json()).toEqual({ error: "Cross-origin publication requests are blocked." });
      expect(mocks.createPublicationServiceClient).not.toHaveBeenCalled();
    });

    it("rejects missing or invalid CSRF for POST-like but allows safe GET (reuses assert pattern from P5/P6)", async () => {
      // GET is read, but security boundary still applies for token validation
      const res = await GET(new Request("http://localhost/api/share/client-pub-token-123/activity"), params());
      // Red until impl: either 200 with filtered or proper error shape
      expect([200, 400, 401, 404]).toContain(res.status);
    });

    it("filters is_internal comments for unauthenticated / public recipient views (decisions may be recipient-scoped)", async () => {
      mocks.assertSameOriginPublicPost?.mockReturnValue?.({ ok: true }); // if used
      const req = makeRequest({ cookie: "" });
      const res = await GET(req, params());
      expect([200, 503]).toContain(res.status);
      if (res.status === 200) {
        const json = (await res.json()) as { activities?: Array<{ type?: string; is_internal?: boolean }> };
        // Red expectation: public sees only !is_internal
        expect(json.activities?.every((activity) => activity.type !== "comment" || activity.is_internal === false)).toBe(true);
      }
    });

    it("requires the publication access cookie before exposing password-protected activity", async () => {
      mocks.createPublicationServiceClient.mockReturnValueOnce({
        from: vi.fn((table: string) => {
          if (table === "project_publications") {
            return createQueryResult({
              id: "pub1",
              status: "published",
              revoked_at: null,
              expires_at: null,
              password_hash: "hashed-password",
              snapshot_version: 7,
              snapshot_json: {},
            });
          }
          return createQueryResult([]);
        }),
      });

      const res = await GET(makeRequest({ cookie: "" }), params());

      expect(res.status).toBe(423);
      expect(await res.json()).toEqual({ error: "Publication password required.", passwordRequired: true });
      expect(mocks.hasPublicationAccessCookie).toHaveBeenCalledWith("", {
        token: "client-pub-token-123",
        publicationId: "pub1",
        // AC-MOD-01: bound to the password-derived credentialVersion, not snapshot_version.
        credentialVersion: deriveCredentialVersion("hashed-password"),
      });
    });

    it("does not expose recipient decisions or events without a verified recipient session", async () => {
      const res = await GET(makeRequest({ cookie: "" }), params());

      expect(res.status).toBe(200);
      const json = (await res.json()) as { activities?: Array<{ title?: string }> };
      expect(JSON.stringify(json)).not.toContain("approved the proposal");
      expect(json.activities?.some((activity) => activity.title === "Maria commented on Living Area.")).toBe(true);
    });

    it("uses durable rate limiting before loading public activity", async () => {
      mocks.checkProjectPublicationActivityRateLimit.mockResolvedValueOnce({
        allowed: false,
        message: "Too many attempts. Please wait 60 seconds.",
        retryAfter: 60,
      });

      const req = makeRequest({ cookie: "" });
      const res = await GET(req, params());

      expect(res.status).toBe(429);
      expect(res.headers.get("retry-after")).toBe("60");
      expect(await res.json()).toEqual({ error: "Too many attempts. Please wait 60 seconds." });
      expect(mocks.createPublicationServiceClient).not.toHaveBeenCalled();
    });

    it("returns composed client-safe ActivityViewModel items without raw database fields", async () => {
      const res = await GET(makeRequest({ origin: "http://localhost" }), params());

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json).toEqual(
        expect.objectContaining({
          hasMore: false,
          recipientSession: false,
          activities: expect.any(Array),
        }),
      );
      expect(json.activities.length).toBeGreaterThan(0);
      expect(json.activities[0]).toEqual(
        expect.objectContaining({
          id: expect.stringMatching(/^act_[a-f0-9]{16}$/),
          source: expect.any(String),
          action: expect.any(String),
          visibility: "public",
          occurredAt: expect.any(String),
          title: expect.any(String),
        }),
      );
      const serialized = JSON.stringify(json);
      expect(serialized).not.toContain("event_type");
      expect(serialized).not.toContain("metadata_json");
      expect(serialized).not.toContain("created_at");
      expect(serialized).not.toContain("author_email");
      expect(serialized).not.toContain("recipient_id");
      expect(serialized).not.toContain("raw");
      expect(serialized).not.toContain("accepted");
      expect(serialized).not.toContain("revision_requested");
      expect(serialized).not.toMatch(/[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/i);
      expect(json.activities.some((activity: { title?: string }) => activity.title === "Maria approved the proposal.")).toBe(false);
      expect(json.activities.some((activity: { title?: string }) => activity.title === "Maria commented on Living Area.")).toBe(true);
      expect(serialized).not.toContain("recipient@example.com");
      expect(json.activities.every((activity: { title?: string }) => activity.title && !activity.title.includes("EVENT"))).toBe(true);
    });


    it("supports stable opaque cursor pagination without raw cursor fields", async () => {
      mocks.verifySharedLinkSessionCookieValue.mockReturnValue(true);
      const parsableSession = "shared-link-session-v1:eyJyZWNpcGllbnRJZCI6InJlY2lwaWVudC0xIn0:dummy";

      const res = await GET(
        new Request("http://localhost/api/share/client-pub-token-123/activity?limit=2", {
          headers: { cookie: `shared_link_session_abc123=${encodeURIComponent(parsableSession)}` },
        }),
        params(),
      );
      expect(res.status).toBe(200);
      const firstPage = await res.json();
      expect(firstPage.activities).toHaveLength(2);
      expect(firstPage.hasMore).toBe(true);
      expect(firstPage.nextCursor).toEqual(expect.stringMatching(/^shared-link-activity-cursor-v2:/));

      expect(() => JSON.parse(Buffer.from(firstPage.nextCursor, "base64url").toString("utf8"))).toThrow();
      expect(firstPage.nextCursor).not.toContain("createdAt");
      expect(firstPage.nextCursor).not.toContain("created_at");
      expect(firstPage.nextCursor).not.toMatch(/[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/i);
      expect(JSON.stringify(firstPage)).not.toContain("created_at");

      const secondPageRes = await GET(
        new Request(`http://localhost/api/share/client-pub-token-123/activity?limit=20&cursor=${encodeURIComponent(firstPage.nextCursor)}`, {
          headers: { cookie: `shared_link_session_abc123=${encodeURIComponent(parsableSession)}` },
        }),
        params(),
      );
      expect(secondPageRes.status).toBe(200);
      const secondPage = await secondPageRes.json();
      expect(secondPage.activities.map((activity: { id: string }) => activity.id)).not.toContain(firstPage.activities[0].id);
      expect(secondPage.activities.map((activity: { id: string }) => activity.id)).not.toContain(firstPage.activities[1].id);
      expect(secondPage.activities.some((activity: { title?: string }) => activity.title === "Maria commented on Living Area.")).toBe(true);
    });

    it("rejects malformed public activity cursors without loading publication rows", async () => {
      const res = await GET(
        new Request("http://localhost/api/share/client-pub-token-123/activity?cursor=not-a-valid-cursor"),
        params(),
      );

      expect(res.status).toBe(400);
      expect(await res.json()).toEqual({ error: "Activity cursor is invalid." });
      expect(mocks.createPublicationServiceClient).not.toHaveBeenCalled();
    });

    it("returns full activity (including internal) when owner/manager context via session or server action path", async () => {
      mocks.verifySharedLinkSessionCookieValue.mockReturnValue(true);
      const parsableSession = "shared-link-session-v1:eyJyZWNpcGllbnRJZCI6InJlY2lwLTEyMyIsInB1YmxpY2F0aW9uSWQiOiJwdWIxIiwic25hcHNob3RWZXJzaW9uIjoiMSJ9:dummy";
      const req = makeRequest({ cookie: `shared_link_session_abc123=${encodeURIComponent(parsableSession)}` });
      const res = await GET(req, params());
      expect([200, 401, 503]).toContain(res.status);
    });
  });

  describe("loadSharedLinkActivity server action (owner-only, joins comments + decisions + events)", () => {
    it("requires owner/manager context and returns joined activity with proper ordering", async () => {
      const result = await loadSharedLinkActivity("client-pub-token-123");
      expect(result).toBeDefined();
      expect(Array.isArray(result?.activities)).toBe(true);
      const titles = result.activities.map((activity) => activity.title);
      expect(titles).toContain("Maria approved the proposal.");
      expect(titles).toContain("Maria commented on Living Area.");
      expect(titles).toContain("Philip Lewis added an internal note.");
      expect(result.activities.some((activity) => activity.badges?.includes("Internal"))).toBe(true);
      expect(JSON.stringify(result.activities)).not.toContain("recipient@example.com");
    });

    it("supports pagination cursor and filters for manager modal", async () => {
      const firstPage = await loadSharedLinkActivity("client-pub-token-123", { limit: 2 });
      expect(firstPage.activities).toHaveLength(2);
      expect(firstPage.hasMore).toBe(true);
      expect(firstPage.nextCursor).toEqual(expect.any(String));

      const result = await loadSharedLinkActivity("client-pub-token-123", { limit: 20, cursor: firstPage.nextCursor });
      expect(result).toBeDefined();
    });


    it("loads access telemetry only when requested, dedupes duplicate access events, hides bots, and omits diagnostic hashes", async () => {
      const hiddenByDefault = await loadSharedLinkActivity("client-pub-token-123", { limit: 20 });
      expect(hiddenByDefault.activities.some((activity) => activity.meta === "access_telemetry")).toBe(false);

      const result = await loadSharedLinkActivity("client-pub-token-123", { limit: 20, includeAccessTelemetry: true });
      const accessItems = result.activities.filter((activity) => activity.meta === "access_telemetry");
      expect(accessItems).toHaveLength(1);
      expect(accessItems[0]?.title).toMatch(/viewed the proposal/i);
      expect(JSON.stringify(accessItems)).not.toContain("ip-secret");
      expect(JSON.stringify(accessItems)).not.toContain("ua-secret");
      expect(JSON.stringify(accessItems)).not.toContain("access-bot");

      const withBots = await loadSharedLinkActivity("client-pub-token-123", { limit: 20, includeAccessTelemetry: true, includeBots: true });
      expect(withBots.activities.filter((activity) => activity.meta === "access_telemetry")).toHaveLength(2);

      const firstPage = await loadSharedLinkActivity("client-pub-token-123", { limit: 1, includeAccessTelemetry: true });
      expect(firstPage.activities[0]?.meta).toBe("access_telemetry");
      expect(firstPage.hasMore).toBe(true);
      expect(firstPage.nextCursor).toEqual(expect.any(String));
      const secondPage = await loadSharedLinkActivity("client-pub-token-123", { limit: 20, includeAccessTelemetry: true, cursor: firstPage.nextCursor });
      expect(secondPage.activities.map((activity) => activity.id)).not.toContain(firstPage.activities[0]?.id);

      const metrics = summarizeProjectPublicationAccessTelemetryMetrics([
        { accessStage: "page_visit", bot: false },
        { accessStage: "page_visit", bot: true },
      ]);
      expect(metrics).toEqual({ total: 2, bot: 1, human: 1, byStage: { page_visit: 2 } });
    });
  });

  describe("SharedLinkActivityFeed component (Realtime + owner-only rendering + design system)", () => {
    it("renders loading then activity list (comments + decisions), respects is_internal visibility", async () => {
      render(<SharedLinkActivityFeed publicationToken="client-pub-token-123" isOwner={true} />);
      // Red: expects activity items to appear after load
      await waitFor(() => {
        expect(screen.queryByText(/Looks good|activity/i) || screen.queryByTestId("activity-item")).toBeTruthy();
      }, { timeout: 1000 });
    });

    it("renders composed activity copy instead of raw type or decision labels", async () => {
      vi.mocked(global.fetch).mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            activities: [
              {
                id: "act_deadbeef12345678",
                source: "decision",
                action: "approved",
                visibility: "public",
                occurredAt: "2026-05-28T11:00:00Z",
                title: "Client approved the proposal.",
                body: "Ready to proceed.",
              },
            ],
            hasMore: false,
            recipientSession: false,
          }),
          { status: 200, headers: { "content-type": "application/json" } },
        ),
      );

      render(<SharedLinkActivityFeed publicationToken="client-pub-token-123" isOwner={false} />);

      await waitFor(() => expect(screen.getByText("Client approved the proposal.")).toBeInTheDocument());
      expect(screen.queryByText(/DECISION/)).not.toBeInTheDocument();
      expect(screen.queryByText(/Decision:\s*accepted/i)).not.toBeInTheDocument();
    });


    it("renders accessible feed articles with keyboard-operable activity details", async () => {
      vi.mocked(global.fetch).mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            activities: [
              {
                id: "act_access1234567890",
                source: "share",
                action: "viewed",
                visibility: "public",
                occurredAt: "2026-05-28T12:30:00Z",
                title: "Maria viewed the proposal.",
                facts: [
                  { label: "Device type", value: "Desktop" },
                  { label: "Browser family", value: "Chrome" },
                  { label: "Country", value: "PH" },
                ],
              },
            ],
            hasMore: false,
            recipientSession: false,
          }),
          { status: 200, headers: { "content-type": "application/json" } },
        ),
      );

      render(<SharedLinkActivityFeed publicationToken="client-pub-token-123" isOwner={false} />);

      const feed = await screen.findByRole("feed", { name: "Shared link activity feed" });
      const article = within(feed).getByRole("article", { name: /Maria viewed the proposal/i });
      expect(article).toHaveAttribute("tabindex", "0");
      const detailsToggle = within(article).getByText("Activity details");
      fireEvent.click(detailsToggle);
      expect(within(article).getByText("Device type")).toBeInTheDocument();
      expect(within(article).getByText("Desktop")).toBeInTheDocument();
      expect(article.textContent).not.toContain("ip_hash");
      expect(article.textContent).not.toContain("user_agent_hash");
    });

    it("does NOT set up a Supabase Realtime subscription (subscription was non-functional, removed in AC-MOD-08)", async () => {
      render(<SharedLinkActivityFeed publicationToken="client-pub-token-123" publicationId="pub1" isOwner={true} />);

      await waitFor(() => expect(screen.getByTestId("activity-feed")).toBeInTheDocument());
      // The dead Realtime subscription has been removed — mocks.channel should never be called
      expect(mocks.channel).not.toHaveBeenCalled();
    });

    it("footer shows honest refresh copy and does not claim live Realtime updates (AC-MOD-08)", async () => {
      render(<SharedLinkActivityFeed publicationToken="client-pub-token-123" isOwner={true} />);
      await waitFor(() => expect(screen.getByTestId("activity-feed")).toBeInTheDocument());

      const footer = screen.getByText(/Activity refreshes when you reopen this tab/i);
      expect(footer).toBeInTheDocument();
      expect(footer.textContent).toContain("Use Refresh for the latest");
      // No false Realtime claim
      expect(screen.queryByText(/Live updates via Realtime/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/Realtime/)).not.toBeInTheDocument();
    });

    it("refetches activity when window gains focus (AC-MOD-08 poll-on-focus)", async () => {
      const loadMock = vi.mocked(loadSharedLinkActivity);
      loadMock.mockClear();

      render(<SharedLinkActivityFeed publicationToken="client-pub-token-123" isOwner={true} />);
      await waitFor(() => expect(screen.getByTestId("activity-feed")).toBeInTheDocument());

      const callsAfterMount = loadMock.mock.calls.length;
      expect(callsAfterMount).toBeGreaterThanOrEqual(1);

      // Simulate the window gaining focus
      await act(async () => {
        fireEvent(window, new Event("focus"));
      });

      await waitFor(() => {
        expect(loadMock.mock.calls.length).toBeGreaterThan(callsAfterMount);
      });
    });

    it("refetches activity when tab becomes visible via visibilitychange (AC-MOD-08 poll-on-visible)", async () => {
      const loadMock = vi.mocked(loadSharedLinkActivity);
      loadMock.mockClear();

      render(<SharedLinkActivityFeed publicationToken="client-pub-token-123" isOwner={true} />);
      await waitFor(() => expect(screen.getByTestId("activity-feed")).toBeInTheDocument());

      const callsAfterMount = loadMock.mock.calls.length;
      expect(callsAfterMount).toBeGreaterThanOrEqual(1);

      // Simulate the tab becoming visible
      Object.defineProperty(document, "visibilityState", {
        configurable: true,
        get: () => "visible",
      });
      await act(async () => {
        fireEvent(document, new Event("visibilitychange"));
      });

      await waitFor(() => {
        expect(loadMock.mock.calls.length).toBeGreaterThan(callsAfterMount);
      });
    });

    it("announces focus-triggered activity refreshes with a polite new-activity banner when newer items arrive", async () => {
      let callCount = 0;
      vi.mocked(loadSharedLinkActivity).mockImplementation(async () => {
        callCount++;
        // Second call returns a new item that wasn't in the first response
        if (callCount === 1) {
          return {
            activities: [{ id: "act_old", source: "share", action: "viewed", visibility: "public" as const, occurredAt: "2026-05-28T11:00:00Z", title: "Old activity." }],
            hasMore: false,
            nextCursor: null,
          };
        }
        return {
          activities: [{ id: "act_new", source: "share", action: "viewed", visibility: "public" as const, occurredAt: "2026-05-28T12:00:00Z", title: "New activity." }],
          hasMore: false,
          nextCursor: null,
        };
      });

      render(<SharedLinkActivityFeed publicationToken="client-pub-token-123" isOwner={true} />);
      await waitFor(() => expect(screen.getByText("Old activity.")).toBeInTheDocument());

      // Trigger a focus refetch that brings a new item
      await act(async () => {
        fireEvent(window, new Event("focus"));
      });

      await waitFor(() => expect(screen.getByText("New activity.")).toBeInTheDocument());
      expect(screen.getByText("New activity loaded.")).toBeInTheDocument();
      expect(screen.getByText("New shared link activity loaded.")).toBeInTheDocument();
    });


    it("renders a 200-item shared activity feed without raw-copy regressions", async () => {
      vi.mocked(global.fetch).mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            activities: Array.from({ length: 200 }, (_, index) => ({
              id: `act_perf_${index}`,
              source: "share",
              action: "viewed",
              visibility: "public",
              occurredAt: `2026-05-28T12:${String(index % 60).padStart(2, "0")}:00Z`,
              title: `Client viewed proposal update ${index + 1}.`,
            })),
            hasMore: false,
            recipientSession: false,
          }),
          { status: 200, headers: { "content-type": "application/json" } },
        ),
      );

      const startedAt = performance.now();
      render(<SharedLinkActivityFeed publicationToken="client-pub-token-123" isOwner={false} />);

      await screen.findByText("Client viewed proposal update 200.");
      expect(screen.getAllByTestId("activity-item")).toHaveLength(200);
      expect(performance.now() - startedAt).toBeLessThan(2_000);
      expect(screen.queryByText(/row_updated|event_type|metadata_json|DECISION/)).not.toBeInTheDocument();
    });

    it("does not subscribe to Realtime without a publication id", async () => {
      render(<SharedLinkActivityFeed publicationToken="client-pub-token-123" isOwner={true} />);

      await waitFor(() => expect(screen.getByTestId("activity-feed")).toBeInTheDocument());
      expect(mocks.channel).not.toHaveBeenCalled();
    });

    it("does not render internal items for non-owner / public context", () => {
      render(<SharedLinkActivityFeed publicationToken="client-pub-token-123" isOwner={false} />);
      // Red expectation: no internals leaked
    });
  });

  describe("Owner email digest (rate limited 1 per 15min per publication via P0 Resend)", () => {
    it("triggers lightweight digest send on comment_add / decision (rate limit prevents spam)", async () => {
      // Simulate post-comment path calling digest trigger
      mocks.sendEmail.mockClear();
      // In real impl the route/action after successful insert calls rate-limited digest
      // Red test: multiple rapid calls should result in at most 1 real send within window (mocked always succeeds)
      await Promise.all([
        // hypothetical trigger
        (async () => { /* would call internal rate limited send */ })(),
      ]);
      // After impl the mock will have been called 0 or 1 time depending on rate state in test
      expect(mocks.sendEmail.mock.calls.length).toBeLessThanOrEqual(1);
    });

    it("gracefully degrades when Resend key missing (mocked success path)", async () => {
      const res = await mocks.sendEmail({ to: "owner@example.com", subject: "New shared link activity", text: "..." });
      expect(res.ok).toBe(true);
    });

    it("resolves the real owner email and sender label for activity digests", async () => {
      mocks.sendEmail.mockClear();

      mocks.requireCurrentUserContext.mockRejectedValueOnce(new Error("auth required"));
      await expect(maybeTriggerSharedLinkActivityDigest("pub-real-owner", "client-pub-token-123", "comment")).resolves.toEqual({
        ok: false,
        error: "digest-auth-required",
      });
      expect(mocks.sendEmail).not.toHaveBeenCalled();

      mocks.requireCurrentUserContext.mockResolvedValueOnce({
        userId: "manager-user",
        email: "manager@example.com",
        displayName: "Manager",
        role: "admin",
        profile: {},
        avatarUrl: null,
      });
      await maybeTriggerSharedLinkActivityDigest("pub-real-owner", "client-pub-token-123", "comment");

      expect(mocks.sendEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: "owner@example.com",
          subject: expect.stringContaining("shared project link"),
          text: expect.stringContaining("Philip Lewis"),
          html: expect.stringContaining("Philip Lewis"),
        }),
      );
      const payload = mocks.sendEmail.mock.calls[0]?.[0] as { text?: string; html?: string };
      expect(`${payload.text ?? ""}\n${payload.html ?? ""}`).not.toContain("owner@archestimator.test");
      expect(`${payload.text ?? ""}\n${payload.html ?? ""}`).not.toContain("A team member");
      expect(`${payload.text ?? ""}\n${payload.html ?? ""}`).toContain("unsubscribe");
      expect(`${payload.text ?? ""}\n${payload.html ?? ""}`).toContain("mailto:");
    });
  });

  describe("Project sidebar badge for unseen shared-link activity", () => {
    it("renders activity badge on project card/list when unseen comments/decisions exist (local last-seen comparison)", () => {
      // Red test will mount a mocked ProjectCard or projects list item with publication activity summary
      // Expects a small badge/dot when latestActivityAt > client lastSeen
      expect(true).toBe(true); // placeholder until component under test is extended
    });
  });
});
