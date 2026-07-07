import { readFileSync } from "node:fs";
import { afterEach, describe, expect, it, vi } from "vitest";

const publicRepository = readFileSync("src/lib/publication/public-repository.ts", "utf8");
const publicationD1Store = readFileSync("src/lib/publication/d1-store.ts", "utf8");
const validPublicationToken = "a".repeat(43);
const publicationAccessRow = {
  id: "publication-1",
  status: "published" as const,
  password_hash: null,
  expires_at: null,
  revoked_at: null,
  snapshot_version: 1,
};
const estimateA = "11111111-1111-4111-8111-111111111111";
const estimateB = "33333333-3333-4333-8333-333333333333";
const rowId = "22222222-2222-4222-8222-222222222222";

function publicationWriteContext(overrides: Record<string, unknown> = {}) {
  return {
    id: "publication-1",
    activity_target_labels_json: {
      estimateLabels: { [estimateA]: "Main Estimate", [estimateB]: "Alternate Estimate" },
      rowLabels: { [rowId]: "Concrete works" },
      rowEstimateIds: { [rowId]: estimateA },
    },
    snapshot_json: {
      generatedAt: "2026-06-03T01:00:00.000Z",
      project: { id: "project-1" },
      estimates: [
        {
          id: estimateA,
          name: "Main Estimate",
          rows: [{ id: rowId, description: "Concrete works" }],
        },
        {
          id: estimateB,
          name: "Alternate Estimate",
          rows: [],
        },
      ],
    },
    snapshot_version: 4,
    ...overrides,
  };
}

function createMockPublicationStore(overrides: Record<string, unknown> = {}) {
  return {
    cleanupExpiredRateLimitEvents: vi.fn().mockResolvedValue(undefined),
    countRateLimitEvents: vi.fn().mockResolvedValue(1),
    deleteRateLimitEvents: vi.fn().mockResolvedValue(undefined),
    getComment: vi.fn().mockResolvedValue({
      id: "comment-id",
      created_at: "2026-06-03T01:10:00.000Z",
      body: "Can we confirm this line item?",
      author_name: null,
      recipient_id: "recipient-id",
      estimate_id: null,
      row_id: null,
      target_kind: "proposal",
      target_label: "the proposal",
      target_secondary_label: null,
      snapshot_version_at_comment: 4,
    }),
    getLatestRecipientDecision: vi.fn().mockResolvedValue(null),
    getPublicationAccessByTokenHash: vi.fn().mockResolvedValue(publicationAccessRow),
    getPublicationSnapshotById: vi.fn().mockResolvedValue(null),
    getPublicationSnapshotByTokenHash: vi.fn().mockResolvedValue({ ...publicationAccessRow, snapshot_json: {} }),
    getPublicationWriteContextByTokenHash: vi.fn().mockResolvedValue(publicationWriteContext()),
    getRecipientByTokenHash: vi.fn().mockResolvedValue(null),
    getRecipientIdentity: vi.fn().mockResolvedValue(null),
    getRecipientTokenHash: vi.fn().mockResolvedValue("recipient-token-hash"),
    incrementPublicationOpen: vi.fn().mockResolvedValue(undefined),
    insertClientComment: vi.fn().mockResolvedValue("comment-id"),
    insertPublicationEvent: vi.fn().mockResolvedValue(undefined),
    insertRateLimitEvent: vi.fn().mockResolvedValue(undefined),
    insertSharedLinkEvent: vi.fn().mockResolvedValue(undefined),
    listPublicComments: vi.fn().mockResolvedValue([]),
    markRecipientOpened: vi.fn().mockResolvedValue(undefined),
    markRecipientUnsubscribed: vi.fn().mockResolvedValue(null),
    submitClientResponse: vi.fn().mockResolvedValue("response-id"),
    ...overrides,
  };
}

async function importRepositoryWithStore(store = createMockPublicationStore()) {
  vi.resetModules();
  vi.stubEnv("PUBLICATION_TOKEN_HASH_SECRET", "publication-token-hash-secret");

  const createPublicationD1Store = vi.fn(() => store);
  vi.doMock("@/lib/publication/d1-store", () => ({
    createPublicationD1Store,
  }));

  return {
    createPublicationD1Store,
    repository: await import("@/lib/publication/public-repository"),
    store,
  };
}

describe("project publication public repository (Cloudflare D1 context)", () => {
  afterEach(() => {
    vi.doUnmock("@/lib/publication/d1-store");
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
    vi.resetModules();
  });

  it("keeps password verification server-side and removes Supabase service-role/RPC access", () => {
    expect(publicRepository).toContain("verifyProjectPublicationPasswordByToken");
    expect(publicRepository).toContain("verifyPublicationPassword");
    expect(publicRepository).toContain("resolveProjectPublicationAccessByToken");
    expect(publicRepository).toContain("resolveProjectPublicationSnapshotByToken");
    expect(publicRepository).toContain("createPublicationD1Store");
    expect(publicRepository).toContain("getPublicationAccessByTokenHash");
    expect(publicRepository).toContain("insertPublicationEvent");
    expect(publicRepository).toContain("incrementPublicationOpen");
    expect(publicRepository).not.toContain("@supabase/supabase-js");
    expect(publicRepository).not.toContain("SUPABASE_SERVICE_ROLE_KEY");
    expect(publicRepository).not.toContain(".rpc(");
  });

  // OPT-2/OPT-3 (PERF-03/PERF-04): the token->publication lookup and the service client are
  // de-duplicated per request via React.cache. cache() only memoises inside a real RSC request
  // scope (it does NOT dedupe in a bare vitest call), so the structure is asserted here and
  // runtime behavior is covered through the D1 store boundary below.
  it("routes hot-path publication row lookups and D1 store construction through React.cache wrappers", () => {
    expect(publicRepository).toMatch(/import\s*\{\s*cache\s*\}\s*from\s*"react"/);
    expect(publicRepository).toContain("const getRequestPublicationServiceClient = cache(createPublicationServiceClient)");
    expect(publicRepository).toMatch(/const getCachedPublicationAccessRowByToken = cache\(/);
    expect(publicRepository).toMatch(/const getCachedPublicationSnapshotRowByToken = cache\(/);
    expect(publicRepository).toMatch(/resolveProjectPublicationAccessByToken[\s\S]*?await getCachedPublicationAccessRowByToken\(normalizedToken\)/);
    expect(publicRepository).toMatch(/resolveProjectPublicationSnapshotByToken[\s\S]*?await getCachedPublicationSnapshotRowByToken\(normalizedToken\)/);
    expect(publicRepository).toMatch(/recordProjectPublicationAnalyticsEvent[\s\S]*?await getCachedPublicationAccessRowByToken\(token\)/);
    expect(publicRepository).toMatch(/recordProjectPublicationEvent[\s\S]*?await getCachedPublicationAccessRowByToken\(token\)/);
  });

  it("resolves the access row through the D1 store boundary", async () => {
    const store = createMockPublicationStore();
    const { repository } = await importRepositoryWithStore(store);

    const access = await repository.resolveProjectPublicationAccessByToken(validPublicationToken);

    expect(access).toEqual(expect.objectContaining({ publicationId: "publication-1", status: "published", passwordRequired: false }));
    expect(store.getPublicationAccessByTokenHash).toHaveBeenCalledTimes(1);
  });

  it("fails malformed publication tokens before creating a D1 store", async () => {
    const store = createMockPublicationStore();
    const { createPublicationD1Store, repository } = await importRepositoryWithStore(store);

    await expect(repository.resolveProjectPublicationAccessByToken("client-token")).resolves.toBeNull();
    await expect(repository.resolveProjectPublicationSnapshotByToken("client-token")).resolves.toBeNull();
    await expect(repository.verifyProjectPublicationPasswordByToken("client-token", "secret")).resolves.toBe(false);
    expect(createPublicationD1Store).not.toHaveBeenCalled();
  });

  it("does not delete expired rate-limit events on every recorded attempt", async () => {
    vi.spyOn(Date, "now").mockReturnValue(1_717_000_000_000);
    const store = createMockPublicationStore();
    const { repository } = await importRepositoryWithStore(store);
    const request = new Request("https://archestimator.test/share/client-token", {
      headers: { "cf-connecting-ip": "203.0.113.10" },
    });

    await expect(repository.checkProjectPublicationEventRateLimit({ token: "client-token", request })).resolves.toEqual({ allowed: true });
    await expect(repository.checkProjectPublicationEventRateLimit({ token: "client-token", request })).resolves.toEqual({ allowed: true });

    expect(store.insertRateLimitEvent).toHaveBeenCalledTimes(2);
    expect(store.countRateLimitEvents).toHaveBeenCalledTimes(2);
    expect(store.cleanupExpiredRateLimitEvents).toHaveBeenCalledTimes(1);
  });

  it("runs expired rate-limit cleanup as a single in-process flight under concurrent checks", async () => {
    vi.spyOn(Date, "now").mockReturnValue(1_717_000_000_000);
    let resolveCleanup: (() => void) | null = null;
    const cleanupFinished = new Promise<void>((resolve) => {
      resolveCleanup = resolve;
    });
    const store = createMockPublicationStore({
      cleanupExpiredRateLimitEvents: vi.fn(() => cleanupFinished),
    });
    const { repository } = await importRepositoryWithStore(store);
    const request = new Request("https://archestimator.test/share/client-token", {
      headers: { "cf-connecting-ip": "203.0.113.10" },
    });

    const first = repository.checkProjectPublicationEventRateLimit({ token: "client-token", request });
    const second = repository.checkProjectPublicationEventRateLimit({ token: "client-token", request });
    expect(store.cleanupExpiredRateLimitEvents).toHaveBeenCalledTimes(1);

    resolveCleanup?.();

    await expect(Promise.all([first, second])).resolves.toEqual([{ allowed: true }, { allowed: true }]);
    expect(store.insertRateLimitEvent).toHaveBeenCalledTimes(2);
    expect(store.countRateLimitEvents).toHaveBeenCalledTimes(2);
    expect(store.cleanupExpiredRateLimitEvents).toHaveBeenCalledTimes(1);
  });

  it("blocks publication password attempts from durable D1 failure rows", async () => {
    const now = 1_717_000_000_000;
    vi.spyOn(Date, "now").mockReturnValue(now);
    const store = createMockPublicationStore({
      countRateLimitEvents: vi.fn().mockResolvedValue(5),
    });
    const { repository } = await importRepositoryWithStore(store);
    const request = new Request("https://archestimator.test/share/client-token", {
      headers: { "cf-connecting-ip": "203.0.113.10" },
    });

    await expect(repository.checkProjectPublicationPasswordRateLimit({ token: "client-token", request })).resolves.toEqual({
      allowed: false,
      message: "Too many attempts. Please wait 3600 seconds.",
      retryAfter: 3600,
    });

    expect(store.countRateLimitEvents).toHaveBeenCalledWith({
      activeAt: new Date(now).toISOString(),
      keyHash: expect.any(String),
      scope: "project_publication_password",
      since: new Date(now - 60 * 60 * 1000).toISOString(),
    });
    expect(publicationD1Store).toContain("AND expires_at > ?");
    expect(store.insertRateLimitEvent).not.toHaveBeenCalled();
  });

  it("records publication password failures as durable D1 rows and returns progressive delays", async () => {
    const now = 1_717_000_000_000;
    vi.spyOn(Date, "now").mockReturnValue(now);
    const store = createMockPublicationStore({
      countRateLimitEvents: vi
        .fn()
        .mockResolvedValueOnce(1)
        .mockResolvedValueOnce(2)
        .mockResolvedValueOnce(3)
        .mockResolvedValueOnce(4)
        .mockResolvedValueOnce(5)
        .mockResolvedValueOnce(6),
    });
    const { repository } = await importRepositoryWithStore(store);
    const request = new Request("https://archestimator.test/share/client-token", {
      headers: { "cf-connecting-ip": "203.0.113.10" },
    });

    const delays = [];
    for (let attempt = 0; attempt < 6; attempt += 1) {
      const result = await repository.recordProjectPublicationPasswordFailure({ token: "client-token", request });
      delays.push(result.delayMs);
    }

    expect(delays).toEqual([1000, 2000, 4000, 8000, 16000, 30000]);
    expect(store.insertRateLimitEvent).toHaveBeenCalledTimes(6);
    expect(store.insertRateLimitEvent).toHaveBeenCalledWith({
      keyHash: expect.any(String),
      metadata: { route: "password", success: false },
      scope: "project_publication_password",
      ttlSeconds: 60 * 60,
    });
    expect(store.countRateLimitEvents).toHaveBeenCalledWith({
      keyHash: expect.any(String),
      scope: "project_publication_password",
      since: new Date(now - 60 * 60 * 1000).toISOString(),
    });
  });

  it("clears durable publication password failure rows after successful unlock", async () => {
    const store = createMockPublicationStore();
    const { repository } = await importRepositoryWithStore(store);
    const request = new Request("https://archestimator.test/share/client-token", {
      headers: { "cf-connecting-ip": "203.0.113.10" },
    });

    await repository.clearProjectPublicationPasswordFailures({ token: "client-token", request });

    expect(store.deleteRateLimitEvents).toHaveBeenCalledWith("project_publication_password", expect.any(String));
  });

  it("preserves duplicate decision conflicts when the D1 submit returns no id", async () => {
    const store = createMockPublicationStore({
      submitClientResponse: vi.fn().mockResolvedValue(null),
    });
    const { repository } = await importRepositoryWithStore(store);

    await expect(
      repository.submitSharedLinkDecision({
        publicationToken: "publication-token",
        recipientId: "recipient-id",
        expectedSnapshotVersion: 3,
        decision: "accepted",
        signerName: "Jane Client",
      }),
    ).rejects.toThrow("Decision already submitted.");

    expect(store.submitClientResponse).toHaveBeenCalledWith(
      expect.objectContaining({ decision: "accepted", expectedSnapshotVersion: 3 }),
    );
  });

  it("passes the viewed snapshot version into the D1 comment writer for stale-comment locking", async () => {
    const store = createMockPublicationStore();
    const { repository } = await importRepositoryWithStore(store);

    await expect(
      repository.insertSharedLinkComment({
        publicationToken: "publication-token",
        recipientId: "recipient-id",
        expectedSnapshotVersion: 4,
        body: "Can we confirm this line item?",
      }),
    ).resolves.toEqual({
      id: "comment-id",
      comment: {
        id: "comment-id",
        content: "Can we confirm this line item?",
        createdAt: "2026-06-03T01:10:00.000Z",
        authorName: "Client",
        authorType: "recipient",
        estimateId: null,
        rowId: null,
        targetKind: "proposal",
        targetLabel: "the proposal",
        targetSecondaryLabel: null,
        snapshotVersionAtComment: 4,
      },
    });

    expect(store.insertClientComment).toHaveBeenCalledWith(
      expect.objectContaining({
        body: "Can we confirm this line item?",
        expectedSnapshotVersion: 4,
        publicationId: "publication-1",
        recipientTokenHash: "recipient-token-hash",
      }),
    );
    expect(store.getComment).toHaveBeenCalledWith("publication-1", "comment-id");
  });

  it("rejects comment review targets absent from the publication target map before D1 write", async () => {
    const store = createMockPublicationStore({
      getPublicationWriteContextByTokenHash: vi.fn().mockResolvedValue(
        publicationWriteContext({
          activity_target_labels_json: {
            estimateLabels: { [estimateA]: "Main Estimate" },
            rowLabels: {},
            rowEstimateIds: {},
          },
        }),
      ),
    });
    const { repository } = await importRepositoryWithStore(store);

    await expect(
      repository.insertSharedLinkComment({
        publicationToken: "publication-token",
        recipientId: "recipient-id",
        expectedSnapshotVersion: 4,
        body: "Can we review this?",
        estimateId: estimateA,
        rowId,
      }),
    ).rejects.toThrow("Invalid review target: selected line item is not part of this publication.");
    expect(store.insertClientComment).not.toHaveBeenCalled();
  });

  it("rejects decision review targets when the row does not belong to the submitted estimate", async () => {
    const store = createMockPublicationStore();
    const { repository } = await importRepositoryWithStore(store);

    await expect(
      repository.submitSharedLinkDecision({
        publicationToken: "publication-token",
        recipientId: "recipient-id",
        expectedSnapshotVersion: 4,
        decision: "revision_requested",
        estimateId: estimateB,
        rowId,
      }),
    ).rejects.toThrow("Invalid review target: selected line item does not belong to the selected estimate.");
    expect(store.submitClientResponse).not.toHaveBeenCalled();
  });

  it("normalizes row-only comment targets to the owning estimate before D1 write", async () => {
    const store = createMockPublicationStore({
      getComment: vi.fn().mockResolvedValue({
        id: "comment-id",
        created_at: "2026-06-03T01:10:00.000Z",
        body: "Can we confirm this line item?",
        author_name: null,
        recipient_id: "recipient-id",
        estimate_id: estimateA,
        row_id: rowId,
        target_kind: "row",
        target_label: "Concrete works",
        target_secondary_label: "Main Estimate",
        snapshot_version_at_comment: 4,
      }),
    });
    const { repository } = await importRepositoryWithStore(store);

    await expect(
      repository.insertSharedLinkComment({
        publicationToken: "publication-token",
        recipientId: "recipient-id",
        expectedSnapshotVersion: 4,
        body: "Can we confirm this line item?",
        rowId,
      }),
    ).resolves.toEqual({
      id: "comment-id",
      comment: expect.objectContaining({
        estimateId: expect.stringMatching(/^est_/),
        rowId: expect.stringMatching(/^row_/),
        targetKind: "row",
        targetLabel: "Concrete works",
        targetSecondaryLabel: "Main Estimate",
      }),
    });

    expect(store.insertClientComment).toHaveBeenCalledWith(
      expect.objectContaining({
        estimateId: estimateA,
        rowId,
        targetKind: "row",
        targetLabel: "Concrete works",
        targetSecondaryLabel: "Main Estimate",
      }),
    );
  });

  it("normalizes row-only decision targets to the owning estimate before D1 write", async () => {
    const store = createMockPublicationStore();
    const { repository } = await importRepositoryWithStore(store);

    await expect(
      repository.submitSharedLinkDecision({
        publicationToken: "publication-token",
        recipientId: "recipient-id",
        expectedSnapshotVersion: 4,
        decision: "revision_requested",
        rowId,
      }),
    ).resolves.toEqual({ id: "response-id" });

    expect(store.submitClientResponse).toHaveBeenCalledWith(
      expect.objectContaining({
        estimateId: estimateA,
        rowId,
        targetKind: "row",
        targetLabel: "Concrete works",
        targetSecondaryLabel: "Main Estimate",
      }),
    );
  });

  it("wraps D1 duplicate-decision errors so they stay mappable to 409", async () => {
    const store = createMockPublicationStore({
      submitClientResponse: vi.fn().mockRejectedValue(new Error("Decision already submitted.")),
    });
    const { repository } = await importRepositoryWithStore(store);

    await expect(
      repository.submitSharedLinkDecision({
        publicationToken: "publication-token",
        recipientId: "recipient-id",
        expectedSnapshotVersion: 3,
        decision: "accepted",
        signerName: "Jane Client",
      }),
    ).rejects.toThrow("Decision already submitted.");
  });

  it("records access analytics without open-count, recipient, shared-link, or prohibited-field side effects", async () => {
    vi.stubEnv("ARCHESTIMATOR_ACCESS_TELEMETRY_ENABLED", "true");
    const store = createMockPublicationStore();
    const { repository } = await importRepositoryWithStore(store);

    const result = await repository.recordProjectPublicationAnalyticsEvent({
      token: "client-token",
      eventType: "open",
      accessStage: "page_visit",
      recipientKnown: false,
      request: new Request("https://archestimator.test/share/client-token", {
        headers: {
          "cf-connecting-ip": "203.0.113.44",
          "user-agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_5) AppleWebKit/537.36 Chrome/125.0.6422.0 Safari/537.36",
          "cf-ipcountry": "PH",
          referer: "https://client.example/private",
        },
      }),
    });

    expect(result).toEqual({ recorded: true });
    expect(store.insertPublicationEvent).toHaveBeenCalledTimes(1);
    const inserted = store.insertPublicationEvent.mock.calls[0]?.[0] as { metadata: Record<string, unknown>; ipHash?: string; userAgentHash?: string };
    expect(inserted.ipHash).toEqual(expect.any(String));
    expect(inserted.userAgentHash).toEqual(expect.any(String));
    expect(inserted.metadata).toEqual(expect.objectContaining({
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
    expect(store.incrementPublicationOpen).not.toHaveBeenCalled();
    expect(store.insertSharedLinkEvent).not.toHaveBeenCalled();
    expect(store.markRecipientOpened).not.toHaveBeenCalled();
  });

  async function runRecordOpenWithUserAgent(userAgent: string) {
    const store = createMockPublicationStore();
    const { repository } = await importRepositoryWithStore(store);

    await repository.recordProjectPublicationEvent({
      token: "client-token",
      eventType: "open",
      request: new Request("https://archestimator.test/share/client-token", {
        headers: {
          "cf-connecting-ip": "203.0.113.44",
          "user-agent": userAgent,
        },
      }),
    });

    return store;
  }

  it("counts a normal-browser open: writes the audit event AND increments the open counter", async () => {
    const store = await runRecordOpenWithUserAgent(
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_5) AppleWebKit/537.36 Chrome/125.0.6422.0 Safari/537.36",
    );

    expect(store.insertPublicationEvent).toHaveBeenCalledTimes(1);
    expect(store.incrementPublicationOpen).toHaveBeenCalledWith("publication-1");
  });

  it("does NOT increment the open counter for a bot/crawler user agent (still writes the audit event)", async () => {
    const store = await runRecordOpenWithUserAgent(
      "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)",
    );

    expect(store.insertPublicationEvent).toHaveBeenCalledTimes(1);
    expect(store.incrementPublicationOpen).not.toHaveBeenCalled();
    expect(store.markRecipientOpened).not.toHaveBeenCalled();
    expect(store.insertSharedLinkEvent).not.toHaveBeenCalled();
  });

  it("keeps access telemetry disabled by default in production unless explicitly truth-locked", async () => {
    const { repository } = await importRepositoryWithStore();

    expect(repository.isProjectPublicationAccessTelemetryEnabled({ NODE_ENV: "production" })).toBe(false);
    expect(repository.isProjectPublicationAccessTelemetryEnabled({ NODE_ENV: "production", ARCHESTIMATOR_ACCESS_TELEMETRY_ENABLED: "true" })).toBe(false);
    expect(repository.isProjectPublicationAccessTelemetryEnabled({ NODE_ENV: "production", ARCHESTIMATOR_ACCESS_TELEMETRY_ENABLED: "true", ARCHESTIMATOR_ACCESS_TELEMETRY_PRODUCTION_READY: "true" })).toBe(true);
    expect(repository.isProjectPublicationAccessTelemetryEnabled({ NODE_ENV: "test", ARCHESTIMATOR_ACCESS_TELEMETRY_ENABLED: "true" })).toBe(true);
  });
});
