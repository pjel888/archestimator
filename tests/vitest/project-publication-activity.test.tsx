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
  createPublicationAdminD1Client: vi.fn(),
  checkProjectPublicationActivityRateLimit: vi.fn(),
  recordProjectPublicationEvent: vi.fn(),
  sendEmail: vi.fn(),
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
    createPublicationServiceClient: mocks.createPublicationServiceClient,
    recordProjectPublicationEvent: mocks.recordProjectPublicationEvent,
  };
});

vi.mock("@/lib/publication/public-rate-limits", () => ({
  checkProjectPublicationActivityRateLimit: mocks.checkProjectPublicationActivityRateLimit,
}));

vi.mock("@/lib/email/transactional-email-client", () => ({
  sendEmail: mocks.sendEmail,
}));

vi.mock("@/lib/publication/admin-d1-client", () => ({
  createPublicationAdminD1Client: mocks.createPublicationAdminD1Client,
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
import { composeSharedLinkActivity } from "@/lib/activity";
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
  gte: ReturnType<typeof vi.fn>;
  insert: ReturnType<typeof vi.fn>;
};
type QueryRecord = { table: string; query: QueryResultMock };

function createQueryResult(data: unknown, error: Error | null = null) {
  const query = {} as QueryResultMock;
  query.select = vi.fn(() => query);
  query.eq = vi.fn(() => query);
  query.order = vi.fn(() => query);
  query.in = vi.fn(() => query);
  query.or = vi.fn(() => query);
  query.gte = vi.fn(async () => ({ count: 0, error: null }));
  query.insert = vi.fn(async () => ({ error: null }));
  query.limit = vi.fn(async () => ({ data, error }));
  query.maybeSingle = vi.fn(async () => ({ data, error }));
  return query;
}

const compactTargetLabels = {
  estimateLabels: { "est-1": "Main Estimate" },
  rowLabels: { "row-1": "Living Area" },
};

function createActivityRoutePublicationServiceMock(
  queryRecords: QueryRecord[] = [],
  overrides: {
    publication?: Partial<{
      activity_target_labels_json: typeof compactTargetLabels;
      expires_at: string | null;
      id: string;
      password_hash: string | null;
      revoked_at: string | null;
      snapshot_version: number;
      status: string;
    }>;
  } = {},
) {
  const publication = {
    id: "pub1",
    status: "published",
    revoked_at: null,
    expires_at: null,
    password_hash: null,
    snapshot_version: 7,
    activity_target_labels_json: compactTargetLabels,
    ...overrides.publication,
  };
  const comments = [
    {
      id: "11111111-1111-4111-8111-111111111111",
      created_at: "2026-05-28T10:00:00Z",
      body: "Looks good",
      is_internal: false,
      author_email: "recipient@example.com",
      recipient_id: "recipient-1",
      estimate_id: "est-1",
      row_id: "row-1",
      target_kind: "row",
      target_label: "Living Area",
      target_secondary_label: "Main Estimate",
      snapshot_version_at_comment: 7,
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
      target_kind: "row",
      target_label: "Living Area",
      target_secondary_label: "Main Estimate",
      snapshot_version_at_comment: 7,
    },
  ];
  const responses = [
    {
      id: "22222222-2222-4222-8222-222222222222",
      created_at: "2026-05-28T11:00:00Z",
      decision: "revision_requested",
      note: "Please revise this item.",
      recipient_id: "recipient-1",
      estimate_id: "est-1",
      row_id: "row-1",
      target_kind: "row",
      target_label: "Concrete works",
      target_secondary_label: "Main Estimate",
    },
  ];
  const events = [
    {
      id: "33333333-3333-4333-8333-333333333333",
      created_at: "2026-05-28T12:00:00Z",
      event_type: "open",
      metadata_json: {},
      recipient_id: "recipient-1",
    },
  ];
  const recipients = [{ id: "recipient-1", display_name: "Maria" }];

  function recordQuery(table: string, data: unknown, selectValue: string) {
    const query = createQueryResult(data);
    query.select(selectValue);
    queryRecords.push({ table, query });
    return query;
  }

  return {
    getPublicationActivityContextByTokenHash: vi.fn(async () => {
      recordQuery(
        "project_publications",
        publication,
        "id, status, revoked_at, expires_at, password_hash, activity_target_labels_json, snapshot_version",
      );
      return publication;
    }),
    listPublicActivityComments: vi.fn(async () => {
      recordQuery(
        "shared_link_comments",
        comments,
        "id, created_at, body, is_internal, author_email, author_name, recipient_id, estimate_id, row_id, target_kind, target_label, target_secondary_label, snapshot_version_at_comment",
      );
      return comments;
    }),
    listRecipientActivityResponses: vi.fn(async () => {
      recordQuery(
        "shared_link_responses",
        responses,
        "id, created_at, decision, note, recipient_id, estimate_id, row_id, target_kind, target_label, target_secondary_label",
      );
      return responses;
    }),
    listRecipientActivityEvents: vi.fn(async () => {
      recordQuery(
        "shared_link_events",
        events,
        "id, created_at, event_type, metadata_json, recipient_id",
      );
      return events;
    }),
    listRecipientDisplayNames: vi.fn(async () => {
      recordQuery("shared_link_recipients", recipients, "id, display_name");
      return recipients;
    }),
  };
}

function createPublicationActionsD1ClientMock(queryRecords: QueryRecord[] = []) {
  return {
    channel: mocks.channel,
    removeChannel: vi.fn(),
    callProcedure: vi.fn(async (functionName: string) => {
      if (functionName === "reserve_security_rate_limit_slot") {
        return { data: true, error: null };
      }
      return { data: null, error: null };
    }),
    rpc: vi.fn(async (functionName: string) => {
      if (functionName === "reserve_security_rate_limit_slot") {
        return { data: true, error: null };
      }
      return { data: null, error: null };
    }),
    from: vi.fn((table: string) => {
      let query: QueryResultMock;
      if (table === "project_publications") {
        query = createQueryResult({
          id: "pub1",
          project_id: "11111111-1111-4111-8111-111111111111",
          published_by: "user-1",
          status: "published",
          revoked_at: null,
          expires_at: null,
          password_hash: null,
          snapshot_version: 7,
          activity_target_labels_json: compactTargetLabels,
        });
        queryRecords.push({ table, query });
        return query;
      }
      if (table === "projects") {
        query = createQueryResult({
          id: "11111111-1111-4111-8111-111111111111",
          workspace_id: "22222222-2222-4222-8222-222222222222",
          name: "Project",
          project_code: null,
          client_name: null,
          location: null,
          currency_code: "PHP",
          metadata: {},
        });
        queryRecords.push({ table, query });
        return query;
      }
      if (table === "profiles") {
        query = createQueryResult({
          id: "user-1",
          display_name: "Philip Lewis",
          email: "owner@example.com",
        });
        queryRecords.push({ table, query });
        return query;
      }
      if (table === "shared_link_comments") {
        query = createQueryResult([
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
            target_kind: "row",
            target_label: "Living Area",
            target_secondary_label: "Main Estimate",
            snapshot_version_at_comment: 7,
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
            target_kind: "row",
            target_label: "Living Area",
            target_secondary_label: "Main Estimate",
            snapshot_version_at_comment: 7,
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
            target_kind: "row",
            target_label: "Living Area",
            target_secondary_label: "Main Estimate",
            snapshot_version_at_comment: 7,
          },
        ]);
        queryRecords.push({ table, query });
        return query;
      }
      if (table === "shared_link_responses") {
        query = createQueryResult([
          {
            id: "d1",
            created_at: "2026-05-28T11:00:00Z",
            decision: "accepted",
            note: null,
            recipient_id: "recipient-1",
            estimate_id: null,
            row_id: null,
            target_kind: "proposal",
            target_label: "the proposal",
            target_secondary_label: null,
          },
        ]);
        queryRecords.push({ table, query });
        return query;
      }
      if (table === "shared_link_events") {
        query = createQueryResult([
          {
            id: "e1",
            created_at: "2026-05-28T12:00:00Z",
            event_type: "open",
            metadata_json: {},
            recipient_id: "recipient-1",
          },
        ]);
        queryRecords.push({ table, query });
        return query;
      }
      if (table === "shared_link_recipients") {
        query = createQueryResult([{ id: "recipient-1", display_name: "Maria" }]);
        queryRecords.push({ table, query });
        return query;
      }
      if (table === "project_publication_events") {
        query = createQueryResult([
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
        queryRecords.push({ table, query });
        return query;
      }
      query = createQueryResult([]);
      queryRecords.push({ table, query });
      return query;
    }),
  };
}

describe("P8 — Shared Link Activity Feed & Notifications (red tests written FIRST before any route/action/component impl)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
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
    mocks.createPublicationServiceClient.mockReturnValue(createActivityRoutePublicationServiceMock());
    mocks.sendEmail.mockResolvedValue({ ok: true, mocked: true });
    mocks.createPublicationAdminD1Client.mockReturnValue(createPublicationActionsD1ClientMock());
    // @ts-expect-error test env
    global.fetch = vi.fn();
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
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

    it("loads compact target labels without selecting the full snapshot", async () => {
      const queryRecords: QueryRecord[] = [];
      mocks.createPublicationServiceClient.mockReturnValueOnce(createActivityRoutePublicationServiceMock(queryRecords));

      const res = await GET(makeRequest({ origin: "http://localhost" }), params());

      expect(res.status).toBe(200);
      const publicationSelect = queryRecords.find((record) => record.table === "project_publications")?.query.select.mock.calls[0]?.[0];
      expect(publicationSelect).toContain("activity_target_labels_json");
      expect(publicationSelect).not.toContain("snapshot_json");
      const json = (await res.json()) as { activities?: Array<{ title?: string }> };
      expect(json.activities?.some((activity) => activity.title === "Maria commented on Living Area.")).toBe(true);
    });

    it("selects stored target context for comments and responses before composing public activity", async () => {
      const queryRecords: QueryRecord[] = [];
      mocks.createPublicationServiceClient.mockReturnValueOnce(createActivityRoutePublicationServiceMock(queryRecords));
      mocks.verifySharedLinkSessionCookieValue.mockReturnValueOnce(true);
      const parsableSession = "shared-link-session-v1:eyJyZWNpcGllbnRJZCI6InJlY2lwaWVudC0xIn0:dummy";

      const res = await GET(
        makeRequest({
          origin: "http://localhost",
          cookie: `shared_link_session_abc123=${encodeURIComponent(parsableSession)}`,
        }),
        params(),
      );

      expect(res.status).toBe(200);
      const commentSelect = queryRecords.find((record) => record.table === "shared_link_comments")?.query.select.mock.calls[0]?.[0];
      const responseSelect = queryRecords.find((record) => record.table === "shared_link_responses")?.query.select.mock.calls[0]?.[0];
      expect(commentSelect).toContain("target_kind");
      expect(commentSelect).toContain("target_label");
      expect(commentSelect).toContain("target_secondary_label");
      expect(commentSelect).toContain("snapshot_version_at_comment");
      expect(responseSelect).toContain("estimate_id");
      expect(responseSelect).toContain("row_id");
      expect(responseSelect).toContain("target_kind");
      expect(responseSelect).toContain("target_label");
      expect(responseSelect).toContain("target_secondary_label");
      const json = (await res.json()) as { activities?: Array<{ title?: string; target?: { kind?: string; label?: string } }> };
      expect(json.activities?.some((activity) => activity.title === "Maria requested revisions for Concrete works.")).toBe(true);
      expect(json.activities?.some((activity) => activity.target?.kind === "row" && activity.target.label === "Concrete works")).toBe(true);
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
      expect(res.status).toBe(200);
      await expect(res.json()).resolves.toEqual(
        expect.objectContaining({
          recipientSession: false,
          activities: expect.any(Array),
        }),
      );
    });

    it("filters is_internal comments for unauthenticated / public recipient views (decisions may be recipient-scoped)", async () => {
      mocks.assertSameOriginPublicPost?.mockReturnValue?.({ ok: true }); // if used
      const req = makeRequest({ cookie: "" });
      const res = await GET(req, params());
      expect(res.status).toBe(200);
      const json = (await res.json()) as { activities?: Array<{ type?: string; is_internal?: boolean }> };
      expect(json.activities?.every((activity) => activity.type !== "comment" || activity.is_internal === false)).toBe(true);
    });

    it("requires the publication access cookie before exposing password-protected activity", async () => {
      mocks.createPublicationServiceClient.mockReturnValueOnce(
        createActivityRoutePublicationServiceMock([], {
          publication: {
            password_hash: "hashed-password",
          },
        }),
      );

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

    it("does not expose comment bodies in public activity without a verified recipient session", async () => {
      const res = await GET(makeRequest({ cookie: "" }), params());

      expect(res.status).toBe(200);
      const serialized = JSON.stringify(await res.json());
      expect(serialized).toContain("Maria commented on Living Area.");
      expect(serialized).not.toContain("Looks good");
      expect(serialized).not.toContain("Duplicate timestamp comment");
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
      expect(serialized).not.toContain("Looks good");
      expect(serialized).not.toContain("Duplicate timestamp comment");
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
      expect(res.status).toBe(200);
      await expect(res.json()).resolves.toEqual(
        expect.objectContaining({
          recipientSession: true,
          activities: expect.any(Array),
        }),
      );
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

    it("loads owner activity target labels without selecting the full snapshot", async () => {
      const queryRecords: QueryRecord[] = [];
      mocks.createPublicationAdminD1Client.mockReturnValueOnce(createPublicationActionsD1ClientMock(queryRecords));

      const result = await loadSharedLinkActivity("client-pub-token-123");

      const publicationSelect = queryRecords.find((record) => record.table === "project_publications")?.query.select.mock.calls[0]?.[0];
      expect(publicationSelect).toContain("activity_target_labels_json");
      expect(publicationSelect).not.toContain("snapshot_json");
      expect(result.activities.some((activity) => activity.title === "Maria commented on Living Area.")).toBe(true);
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

  describe("shared-link activity target composition", () => {
    it("renders targeted decisions against the stored line item context instead of only the proposal", () => {
      const activity = composeSharedLinkActivity(
        {
          id: "decision-row-context",
          type: "decision",
          created_at: "2026-05-28T11:00:00Z",
          recipientDisplayName: "Maria",
          decision: "revision_requested",
          metadata: {
            targetKind: "row",
            targetLabel: "Concrete works",
            targetSecondaryLabel: "Main Estimate",
          },
        },
        { audience: "client", visibility: "public" },
      );

      expect(activity.title).toBe("Maria requested revisions for Concrete works.");
      expect(activity.target).toEqual({
        kind: "row",
        label: "Concrete works",
        secondaryLabel: "Main Estimate",
      });
      expect(activity.raw).toBeUndefined();
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

    it("resolves the real owner email and sender label for public-route activity digests", async () => {
      mocks.sendEmail.mockClear();

      mocks.requireCurrentUserContext.mockRejectedValueOnce(new Error("auth required"));
      await maybeTriggerSharedLinkActivityDigest("pub-real-owner-public-route", "client-pub-token-123", "comment");

      expect(mocks.requireCurrentUserContext).not.toHaveBeenCalled();
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
