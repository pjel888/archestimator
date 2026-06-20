import { readFileSync } from "node:fs";

import { afterEach, describe, expect, it, vi } from "vitest";

const publicRepositorySource = readFileSync("src/lib/publication/public-repository.ts", "utf8");

// Shared helper: drive recordProjectPublicationAnalyticsEvent against a mocked Supabase client
// and return the row that would be inserted into project_publication_events (so we can read the
// computed ip_hash / user_agent_hash). Telemetry is force-enabled via env.
async function captureAnalyticsInsert({
  pepper,
  forwardedFor,
  userAgent,
}: {
  pepper?: string;
  forwardedFor: string;
  userAgent: string;
}): Promise<{ ip_hash?: string | null; user_agent_hash?: string | null }> {
  vi.resetModules();
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://archestimator.test");
  vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "service-role-key");
  vi.stubEnv("PUBLICATION_TOKEN_HASH_SECRET", "publication-token-hash-secret");
  vi.stubEnv("ARCHESTIMATOR_ACCESS_TELEMETRY_ENABLED", "true");
  if (pepper === undefined) {
    vi.stubEnv("ARCHESTIMATOR_TELEMETRY_HASH_PEPPER", "");
  } else {
    vi.stubEnv("ARCHESTIMATOR_TELEMETRY_HASH_PEPPER", pepper);
  }

  const publicationQuery = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue({
      data: { id: "publication-1", status: "published", password_hash: null, expires_at: null, revoked_at: null, snapshot_version: 1 },
      error: null,
    }),
  };
  const eventInsert = vi.fn().mockResolvedValue({ error: null });

  vi.doMock("@supabase/supabase-js", () => ({
    createClient: vi.fn(() => ({
      from: vi.fn((table: string) => {
        if (table === "project_publications") return publicationQuery;
        if (table === "project_publication_events") return { insert: eventInsert };
        throw new Error(`Unexpected table: ${table}`);
      }),
      rpc: vi.fn(),
    })),
  }));

  const { recordProjectPublicationAnalyticsEvent } = await import("@/lib/publication/public-repository");
  await recordProjectPublicationAnalyticsEvent({
    token: "client-token",
    eventType: "open",
    accessStage: "page_visit",
    recipientKnown: false,
    request: new Request("https://archestimator.test/share/client-token", {
      headers: { "x-forwarded-for": forwardedFor, "user-agent": userAgent },
    }),
  });

  const inserted = eventInsert.mock.calls[0]?.[0] as { ip_hash?: string | null; user_agent_hash?: string | null };
  return inserted;
}

describe("SEC-02 (AC-SEC-02) — keyed HMAC for ip_hash / user_agent_hash", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.doUnmock("@supabase/supabase-js");
    vi.resetModules();
  });

  it("hashes the SAME ip/user-agent differently under two different peppers (keyed, not bare sha256)", async () => {
    const ua = "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_5) AppleWebKit/537.36 Chrome/125.0 Safari/537.36";
    const first = await captureAnalyticsInsert({ pepper: "pepper-one", forwardedFor: "203.0.113.44", userAgent: ua });
    const second = await captureAnalyticsInsert({ pepper: "pepper-two", forwardedFor: "203.0.113.44", userAgent: ua });

    // Non-vacuous: hashes must be present, must NOT contain the raw values, and must differ across peppers.
    expect(first.ip_hash).toEqual(expect.any(String));
    expect(second.ip_hash).toEqual(expect.any(String));
    expect(first.ip_hash).not.toContain("203.0.113.44");
    expect(first.ip_hash).not.toBe(second.ip_hash);

    expect(first.user_agent_hash).toEqual(expect.any(String));
    expect(second.user_agent_hash).toEqual(expect.any(String));
    expect(first.user_agent_hash).not.toBe(second.user_agent_hash);
  });

  it("is deterministic for the same ip under the same pepper (so analytics dedup/group still works)", async () => {
    const ua = "curl/8.4.0";
    const a = await captureAnalyticsInsert({ pepper: "stable-pepper", forwardedFor: "198.51.100.7", userAgent: ua });
    const b = await captureAnalyticsInsert({ pepper: "stable-pepper", forwardedFor: "198.51.100.7", userAgent: ua });
    expect(a.ip_hash).toBe(b.ip_hash);
    expect(a.user_agent_hash).toBe(b.user_agent_hash);
  });

  it("static guard: ip/user-agent hashing goes through a keyed HMAC, never a bare sha256(value)", () => {
    // The telemetry hash helper must use createHmac, and must be the value passed to the
    // ip_hash / user_agent_hash columns.
    expect(publicRepositorySource).toContain('import { createHash, createHmac } from "node:crypto"');
    expect(publicRepositorySource).toMatch(/function hashRequestValue\([\s\S]*?createHmac\("sha256", readTelemetryHashPepper\(\)\)/);
    expect(publicRepositorySource).toContain("ARCHESTIMATOR_TELEMETRY_HASH_PEPPER");

    // The ip_hash / user_agent_hash fields are only ever assigned from hashRequestValue(...)
    // output (no bare createHash("sha256")(ip) path for those telemetry columns).
    const ipHashAssignments = publicRepositorySource.match(/const ipHash = [^\n;]+/g) ?? [];
    const uaHashAssignments = publicRepositorySource.match(/const userAgentHash = [^\n;]+/g) ?? [];
    expect(ipHashAssignments.length).toBeGreaterThan(0);
    expect(uaHashAssignments.length).toBeGreaterThan(0);
    for (const line of [...ipHashAssignments, ...uaHashAssignments]) {
      expect(line).toContain("hashRequestValue(");
      expect(line).not.toContain('createHash("sha256")');
    }
    // No bare createHash("sha256") on an ip-ish or user-agent-ish value anywhere in the module.
    expect(publicRepositorySource).not.toMatch(/createHash\("sha256"\)\.update\((?:[^)]*\b(?:ip|user[_-]?agent)\b[^)]*)\)/i);
  });
});

describe("SEC-06 (AC-SEC-06) — recipient lookups are publication-scoped", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.doUnmock("@supabase/supabase-js");
    vi.resetModules();
  });

  // Mock two publications (A=under-token-A, B=under-token-B) plus a recipient bound to A.
  // The recipient lookup is constrained by .eq("id", recipientId).eq("publication_id", <pubB>),
  // so resolving recipient-A's id under publication B returns 0 rows -> "Recipient not found".
  function buildSupabaseMock({
    publicationId,
    recipientRow,
  }: {
    publicationId: string;
    recipientRow: { recipient_token_hash: string } | null;
  }) {
    const recipientEq = vi.fn().mockReturnThis();
    const recipientQuery = {
      select: vi.fn().mockReturnThis(),
      eq: recipientEq,
      maybeSingle: vi.fn().mockResolvedValue({ data: recipientRow, error: null }),
    };
    const publicationQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: { id: publicationId }, error: null }),
    };
    const commentQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({
        data: {
          id: "row-id",
          created_at: "2026-06-03T01:10:00.000Z",
          body: "valid post under the right publication",
          author_name: null,
          recipient_id: "recipient-bound-to-A",
        },
        error: null,
      }),
    };
    const rpc = vi.fn().mockResolvedValue({ data: "row-id", error: null });
    return { recipientEq, recipientQuery, publicationQuery, commentQuery, rpc };
  }

  async function setupRepository(mock: ReturnType<typeof buildSupabaseMock>) {
    vi.resetModules();
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://archestimator.test");
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "service-role-key");
    vi.stubEnv("PUBLICATION_TOKEN_HASH_SECRET", "publication-token-hash-secret");

    vi.doMock("@supabase/supabase-js", () => ({
      createClient: vi.fn(() => ({
        from: vi.fn((table: string) => {
          if (table === "project_publications") return mock.publicationQuery;
          if (table === "shared_link_recipients") return mock.recipientQuery;
          if (table === "shared_link_comments") return mock.commentQuery;
          throw new Error(`Unexpected table: ${table}`);
        }),
        rpc: mock.rpc,
      })),
    }));

    return import("@/lib/publication/public-repository");
  }

  it("comment: a recipientId bound to publication A cannot resolve under publication B (0 rows -> not found)", async () => {
    // Publication B resolves to id "publication-B"; the recipient row lookup under B's id finds nothing.
    const mock = buildSupabaseMock({ publicationId: "publication-B", recipientRow: null });
    const { insertSharedLinkComment } = await setupRepository(mock);

    await expect(
      insertSharedLinkComment({
        publicationToken: "token-B",
        recipientId: "recipient-bound-to-A",
        expectedSnapshotVersion: 1,
        body: "should not post under wrong publication",
      }),
    ).rejects.toThrow(/recipient not found/i);

    // The recipient lookup MUST have been scoped by publication_id (the cross-publication guard).
    expect(mock.recipientEq).toHaveBeenCalledWith("id", "recipient-bound-to-A");
    expect(mock.recipientEq).toHaveBeenCalledWith("publication_id", "publication-B");
    // RPC never reached because the app-layer lookup already rejected.
    expect(mock.rpc).not.toHaveBeenCalled();
  });

  it("decision: a recipientId bound to publication A cannot resolve under publication B (0 rows -> not found)", async () => {
    const mock = buildSupabaseMock({ publicationId: "publication-B", recipientRow: null });
    const { submitSharedLinkDecision } = await setupRepository(mock);

    await expect(
      submitSharedLinkDecision({
        publicationToken: "token-B",
        recipientId: "recipient-bound-to-A",
        expectedSnapshotVersion: 1,
        decision: "accepted",
      }),
    ).rejects.toThrow(/recipient not found/i);

    expect(mock.recipientEq).toHaveBeenCalledWith("id", "recipient-bound-to-A");
    expect(mock.recipientEq).toHaveBeenCalledWith("publication_id", "publication-B");
    expect(mock.rpc).not.toHaveBeenCalled();
  });

  it("comment: a recipientId that IS bound to the resolving publication still posts (scoping is not over-broad)", async () => {
    const mock = buildSupabaseMock({ publicationId: "publication-A", recipientRow: { recipient_token_hash: "recipient-hash" } });
    const { insertSharedLinkComment } = await setupRepository(mock);

    await expect(
      insertSharedLinkComment({
        publicationToken: "token-A",
        recipientId: "recipient-bound-to-A",
        expectedSnapshotVersion: 1,
        body: "valid post under the right publication",
      }),
    ).resolves.toEqual({
      id: "row-id",
      comment: {
        id: "row-id",
        content: "valid post under the right publication",
        createdAt: "2026-06-03T01:10:00.000Z",
        authorName: "Client",
        authorType: "recipient",
      },
    });

    expect(mock.recipientEq).toHaveBeenCalledWith("publication_id", "publication-A");
    expect(mock.rpc).toHaveBeenCalledWith("insert_client_comment", expect.objectContaining({ p_recipient_token_hash: "recipient-hash" }));
  });

  it("static guard: both write-path recipient lookups carry a publication_id constraint", () => {
    // insertSharedLinkComment + submitSharedLinkDecision each scope the shared_link_recipients
    // lookup by both id and publication_id.
    const scopedLookups = publicRepositorySource.match(
      /from\("shared_link_recipients"\)\s*\.select\("recipient_token_hash"\)\s*\.eq\("id", params\.recipientId\)\s*\.eq\("publication_id", publicationId\)/g,
    ) ?? [];
    expect(scopedLookups.length).toBe(2);
  });
});
