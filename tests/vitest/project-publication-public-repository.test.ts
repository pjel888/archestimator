import { readFileSync } from "node:fs";
import { afterEach, describe, expect, it, vi } from "vitest";

const publicRepository = readFileSync("src/lib/publication/public-repository.ts", "utf8");

describe("project publication public repository (Shared Link V2 context)", () => {
  afterEach(() => {
    vi.doUnmock("@supabase/supabase-js");
    vi.resetModules();
  });

  it("keeps password verification server-side and increments open counters with public events", () => {
    expect(publicRepository).toContain("verifyProjectPublicationPasswordByToken");
    expect(publicRepository).toContain("verifyPublicationPassword");
    expect(publicRepository).toContain("resolveProjectPublicationAccessByToken");
    expect(publicRepository).toContain("resolveProjectPublicationSnapshotByToken");
    expect(publicRepository).toContain('.select("id, status, password_hash, expires_at, revoked_at, snapshot_version")');
    expect(publicRepository).toContain('rpc("increment_project_publication_open"');
  });

  // OPT-2/OPT-3 (PERF-03/PERF-04): the token->publication lookup and the service client are
  // de-duplicated per request via React.cache. cache() only memoises inside a real RSC request
  // scope (it does NOT dedupe in a bare vitest call — verified), so the structure is asserted
  // here and the runtime memoisation is covered by the production build + the page test.
  it("routes the hot-path publication-row lookup and service client through React.cache wrappers (per-request dedup)", () => {
    // imports the per-request memoisation primitive
    expect(publicRepository).toMatch(/import\s*\{\s*cache\s*\}\s*from\s*"react"/);

    // one cache-wrapped service client (OPT-3) and two cache-wrapped row readers (OPT-2)
    expect(publicRepository).toContain("const getRequestPublicationServiceClient = cache(createPublicationServiceClient)");
    expect(publicRepository).toMatch(/const getCachedPublicationAccessRowByToken = cache\(/);
    expect(publicRepository).toMatch(/const getCachedPublicationSnapshotRowByToken = cache\(/);

    // the access + snapshot resolvers read through the cached readers instead of re-querying
    expect(publicRepository).toMatch(/resolveProjectPublicationAccessByToken[\s\S]*?await getCachedPublicationAccessRowByToken\(token\)/);
    expect(publicRepository).toMatch(/resolveProjectPublicationSnapshotByToken[\s\S]*?await getCachedPublicationSnapshotRowByToken\(token\)/);

    // both telemetry writers reuse the cached access row rather than issuing their own SELECT
    expect(publicRepository).toMatch(/recordProjectPublicationAnalyticsEvent[\s\S]*?await getCachedPublicationAccessRowByToken\(token\)/);
    expect(publicRepository).toMatch(/recordProjectPublicationEvent[\s\S]*?await getCachedPublicationAccessRowByToken\(token\)/);

    // the access resolver + both telemetry writers no longer carry an inline token_hash SELECT;
    // the only remaining inline access-column selects are in the password/recipient verifiers.
    const inlineAccessSelects = publicRepository.match(/\.select\("id, status, password_hash, expires_at, revoked_at, snapshot_version"\)/g) ?? [];
    expect(inlineAccessSelects.length).toBe(2);
  });

  it("still resolves the access row through the cached reader at runtime (one client SELECT per resolver call)", async () => {
    vi.resetModules();
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://archestimator.test");
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "service-role-key");
    vi.stubEnv("PUBLICATION_TOKEN_HASH_SECRET", "publication-token-hash-secret");

    const select = vi.fn().mockReturnThis();
    const eq = vi.fn().mockReturnThis();
    const maybeSingle = vi.fn().mockResolvedValue({
      data: { id: "publication-1", status: "published", password_hash: null, expires_at: null, revoked_at: null, snapshot_version: 1 },
      error: null,
    });
    const from = vi.fn(() => ({ select, eq, maybeSingle }));

    vi.doMock("@supabase/supabase-js", () => ({
      createClient: vi.fn(() => ({ from, rpc: vi.fn() })),
    }));

    // React.cache memoisation only engages inside a real RSC request render scope (it is a
    // no-op in a bare vitest call — verified), so we cannot assert cross-call dedup here; the
    // per-request dedup is covered by the production build + the page test. What we CAN verify
    // is that the resolver now reads through the cache-wrapped getCachedPublicationAccessRowByToken
    // path: a single resolver call issues exactly one publication-row SELECT against
    // project_publications and returns the resolved access shape with the active-state gate applied.
    const { resolveProjectPublicationAccessByToken } = await import("@/lib/publication/public-repository");
    const access = await resolveProjectPublicationAccessByToken("client-token");

    expect(access).toEqual(expect.objectContaining({ publicationId: "publication-1", status: "published", passwordRequired: false }));
    expect(from).toHaveBeenCalledWith("project_publications");
    expect(select).toHaveBeenCalledTimes(1);
  });

  it("preserves duplicate decision conflicts when the submit_client_response RPC returns no id", async () => {
    vi.resetModules();

    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://archestimator.test";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "service-role-key";
    process.env.PUBLICATION_TOKEN_HASH_SECRET = "publication-token-hash-secret";

    const publicationQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: { id: "publication-1" }, error: null }),
    };
    const recipientQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({
        data: { recipient_token_hash: "recipient-token-hash" },
        error: null,
      }),
    };
    const rpc = vi.fn().mockResolvedValue({ data: null, error: null });

    vi.doMock("@supabase/supabase-js", () => ({
      createClient: vi.fn(() => ({
        from: vi.fn((table: string) => {
          if (table === "project_publications") return publicationQuery;
          if (table === "shared_link_recipients") return recipientQuery;
          throw new Error(`Unexpected table: ${table}`);
        }),
        rpc,
      })),
    }));

    const { submitSharedLinkDecision } = await import("@/lib/publication/public-repository");

    await expect(
      submitSharedLinkDecision({
        publicationToken: "publication-token",
        recipientId: "recipient-id",
        expectedSnapshotVersion: 3,
        decision: "accepted",
      }),
    ).rejects.toThrow("Decision already submitted.");

    expect(rpc).toHaveBeenCalledWith(
      "submit_client_response",
      expect.objectContaining({ p_decision: "accepted", p_expected_snapshot_version: 3 }),
    );
  });

  it("passes the viewed snapshot version into insert_client_comment for stale-comment locking", async () => {
    vi.resetModules();

    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://archestimator.test";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "service-role-key";
    process.env.PUBLICATION_TOKEN_HASH_SECRET = "publication-token-hash-secret";

    const publicationQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: { id: "publication-1" }, error: null }),
    };
    const recipientQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({
        data: { recipient_token_hash: "recipient-token-hash" },
        error: null,
      }),
    };
    const rpc = vi.fn().mockResolvedValue({ data: "comment-id", error: null });

    vi.doMock("@supabase/supabase-js", () => ({
      createClient: vi.fn(() => ({
        from: vi.fn((table: string) => {
          if (table === "project_publications") return publicationQuery;
          if (table === "shared_link_recipients") return recipientQuery;
          throw new Error(`Unexpected table: ${table}`);
        }),
        rpc,
      })),
    }));

    const { insertSharedLinkComment } = await import("@/lib/publication/public-repository");

    await expect(
      insertSharedLinkComment({
        publicationToken: "publication-token",
        recipientId: "recipient-id",
        expectedSnapshotVersion: 4,
        body: "Can we confirm this line item?",
      }),
    ).resolves.toEqual({ id: "comment-id" });

    expect(rpc).toHaveBeenCalledWith(
      "insert_client_comment",
      expect.objectContaining({ p_body: "Can we confirm this line item?", p_expected_snapshot_version: 4 }),
    );
  });

  it("wraps submit_client_response RPC error objects so duplicate decisions stay mappable to 409", async () => {
    vi.resetModules();

    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://archestimator.test";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "service-role-key";
    process.env.PUBLICATION_TOKEN_HASH_SECRET = "publication-token-hash-secret";

    const publicationQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: { id: "publication-1" }, error: null }),
    };
    const recipientQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({
        data: { recipient_token_hash: "recipient-token-hash" },
        error: null,
      }),
    };
    const rpc = vi.fn().mockResolvedValue({
      data: null,
      error: { code: "P0001", message: "Decision already submitted." },
    });

    vi.doMock("@supabase/supabase-js", () => ({
      createClient: vi.fn(() => ({
        from: vi.fn((table: string) => {
          if (table === "project_publications") return publicationQuery;
          if (table === "shared_link_recipients") return recipientQuery;
          throw new Error(`Unexpected table: ${table}`);
        }),
        rpc,
      })),
    }));

    const { submitSharedLinkDecision } = await import("@/lib/publication/public-repository");

    await expect(
      submitSharedLinkDecision({
        publicationToken: "publication-token",
        recipientId: "recipient-id",
        expectedSnapshotVersion: 3,
        decision: "accepted",
      }),
    ).rejects.toThrow("Decision already submitted.");
  });
  it("records access analytics without open-count, recipient, shared-link, or prohibited-field side effects", async () => {
    vi.resetModules();
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://archestimator.test");
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "service-role-key");
    vi.stubEnv("PUBLICATION_TOKEN_HASH_SECRET", "publication-token-hash-secret");
    vi.stubEnv("ARCHESTIMATOR_ACCESS_TELEMETRY_ENABLED", "true");

    const publicationQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({
        data: { id: "publication-1", status: "published", password_hash: null, expires_at: null, revoked_at: null, snapshot_version: 1 },
        error: null,
      }),
    };
    const eventInsert = vi.fn().mockResolvedValue({ error: null });
    const rpc = vi.fn();
    const tableCalls: string[] = [];

    vi.doMock("@supabase/supabase-js", () => ({
      createClient: vi.fn(() => ({
        from: vi.fn((table: string) => {
          tableCalls.push(table);
          if (table === "project_publications") return publicationQuery;
          if (table === "project_publication_events") return { insert: eventInsert };
          throw new Error(`Unexpected table: ${table}`);
        }),
        rpc,
      })),
    }));

    const { recordProjectPublicationAnalyticsEvent } = await import("@/lib/publication/public-repository");
    const result = await recordProjectPublicationAnalyticsEvent({
      token: "client-token",
      eventType: "open",
      accessStage: "page_visit",
      recipientKnown: false,
      request: new Request("https://archestimator.test/share/client-token", {
        headers: {
          "x-forwarded-for": "203.0.113.44",
          "user-agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_5) AppleWebKit/537.36 Chrome/125.0.6422.0 Safari/537.36",
          "x-vercel-ip-country": "PH",
          "x-vercel-ip-city": "Manila",
          referer: "https://client.example/private",
        },
      }),
    });

    expect(result).toEqual({ recorded: true });
    expect(eventInsert).toHaveBeenCalledTimes(1);
    const inserted = eventInsert.mock.calls[0]?.[0] as { metadata_json: Record<string, unknown>; ip_hash?: string; user_agent_hash?: string };
    expect(inserted.ip_hash).toEqual(expect.any(String));
    expect(inserted.user_agent_hash).toEqual(expect.any(String));
    expect(inserted.metadata_json).toEqual(expect.objectContaining({
      access_stage: "page_visit",
      recipient_known: false,
      country: "PH",
      browser_family: "Chrome",
      os_family: "macOS",
      device_type: "desktop",
      bot: false,
    }));
    const serialized = JSON.stringify(inserted);
    expect(serialized).not.toContain("203.0.113.44");
    expect(serialized).not.toContain("Chrome/125.0.6422.0");
    expect(serialized).not.toContain("Manila");
    expect(serialized).not.toContain("client.example");
    expect(rpc).not.toHaveBeenCalled();
    expect(tableCalls).not.toContain("shared_link_events");
    expect(tableCalls).not.toContain("shared_link_recipients");
  });

  // MOD-MET-01 (AC-MOD-09): the public "Opened N times" counter must only count real visitors.
  // Bots/crawlers/link-preview unfurlers still write the raw audit event but must NOT increment.
  async function runRecordOpenWithUserAgent(userAgent: string) {
    vi.resetModules();
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://archestimator.test");
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "service-role-key");
    vi.stubEnv("PUBLICATION_TOKEN_HASH_SECRET", "publication-token-hash-secret");

    const publicationQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({
        data: { id: "publication-1", status: "published", password_hash: null, expires_at: null, revoked_at: null, snapshot_version: 1 },
        error: null,
      }),
    };
    const eventInsert = vi.fn().mockResolvedValue({ error: null });
    const rpc = vi.fn().mockResolvedValue({ error: null });
    const tableCalls: string[] = [];

    vi.doMock("@supabase/supabase-js", () => ({
      createClient: vi.fn(() => ({
        from: vi.fn((table: string) => {
          tableCalls.push(table);
          if (table === "project_publications") return publicationQuery;
          if (table === "project_publication_events") return { insert: eventInsert };
          throw new Error(`Unexpected table: ${table}`);
        }),
        rpc,
      })),
    }));

    const { recordProjectPublicationEvent } = await import("@/lib/publication/public-repository");
    await recordProjectPublicationEvent({
      token: "client-token",
      eventType: "open",
      request: new Request("https://archestimator.test/share/client-token", {
        headers: {
          "x-forwarded-for": "203.0.113.44",
          "user-agent": userAgent,
        },
      }),
    });

    return { eventInsert, rpc, tableCalls };
  }

  it("counts a normal-browser open: writes the audit event AND increments the open counter", async () => {
    const { eventInsert, rpc } = await runRecordOpenWithUserAgent(
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_5) AppleWebKit/537.36 Chrome/125.0.6422.0 Safari/537.36",
    );

    expect(eventInsert).toHaveBeenCalledTimes(1);
    expect(rpc).toHaveBeenCalledWith("increment_project_publication_open", { target_publication_id: "publication-1" });
  });

  it("does NOT increment the open counter for a bot/crawler user agent (still writes the audit event)", async () => {
    const { eventInsert, rpc, tableCalls } = await runRecordOpenWithUserAgent(
      "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)",
    );

    // Raw audit event still recorded (useful even for bots), but the public counter is untouched.
    expect(eventInsert).toHaveBeenCalledTimes(1);
    expect(rpc).not.toHaveBeenCalled();
    // No recipient bookkeeping for an anonymous open.
    expect(tableCalls).not.toContain("shared_link_recipients");
    expect(tableCalls).not.toContain("shared_link_events");
  });

  it("keeps access telemetry disabled by default in production unless explicitly truth-locked", async () => {
    vi.resetModules();
    const { isProjectPublicationAccessTelemetryEnabled } = await import("@/lib/publication/public-repository");

    expect(isProjectPublicationAccessTelemetryEnabled({ NODE_ENV: "production" })).toBe(false);
    expect(isProjectPublicationAccessTelemetryEnabled({ NODE_ENV: "production", ARCHESTIMATOR_ACCESS_TELEMETRY_ENABLED: "true" })).toBe(false);
    expect(isProjectPublicationAccessTelemetryEnabled({ NODE_ENV: "production", ARCHESTIMATOR_ACCESS_TELEMETRY_ENABLED: "true", ARCHESTIMATOR_ACCESS_TELEMETRY_PRODUCTION_READY: "true" })).toBe(true);
    expect(isProjectPublicationAccessTelemetryEnabled({ NODE_ENV: "test", ARCHESTIMATOR_ACCESS_TELEMETRY_ENABLED: "true" })).toBe(true);
  });

});
