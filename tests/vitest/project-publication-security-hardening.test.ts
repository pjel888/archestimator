import { readFileSync } from "node:fs";

import { afterEach, describe, expect, it, vi } from "vitest";

const publicRepositorySource = readFileSync("src/lib/publication/public-repository.ts", "utf8");
const d1StoreSource = readFileSync("src/lib/publication/d1-store.ts", "utf8");

function buildMockPublicationStore(overrides: Record<string, unknown> = {}) {
  return {
    getComment: vi.fn().mockResolvedValue({
      id: "row-id",
      created_at: "2026-06-03T01:10:00.000Z",
      body: "valid post under the right publication",
      author_name: null,
      recipient_id: "recipient-bound-to-A",
      estimate_id: null,
      row_id: null,
      target_kind: "proposal",
      target_label: "the proposal",
      target_secondary_label: null,
      snapshot_version_at_comment: 1,
    }),
    getPublicationAccessByTokenHash: vi.fn().mockResolvedValue({
      id: "publication-1",
      status: "published",
      password_hash: null,
      expires_at: null,
      revoked_at: null,
      snapshot_version: 1,
    }),
    getPublicationWriteContextByTokenHash: vi.fn().mockResolvedValue({
      id: "publication-1",
      activity_target_labels_json: {
        estimateLabels: {},
        rowLabels: {},
        rowEstimateIds: {},
      },
      snapshot_json: {},
      snapshot_version: 1,
    }),
    getLegacyMigrationStatus: vi.fn().mockResolvedValue(null),
    getRecipientTokenHash: vi.fn().mockResolvedValue("recipient-hash"),
    insertClientComment: vi.fn().mockResolvedValue("row-id"),
    insertPublicationEvent: vi.fn().mockResolvedValue(undefined),
    submitClientResponse: vi.fn().mockResolvedValue("response-id"),
    ...overrides,
  };
}

// Shared helper: drive recordProjectPublicationAnalyticsEvent against a mocked D1 store and
// return the event that would be inserted into project_publication_events so the computed
// ipHash / userAgentHash can be asserted. Telemetry is force-enabled via env.
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
  vi.stubEnv("PUBLICATION_TOKEN_HASH_SECRET", "publication-token-hash-secret");
  vi.stubEnv("ARCHESTIMATOR_ACCESS_TELEMETRY_ENABLED", "true");
  if (pepper === undefined) {
    vi.stubEnv("ARCHESTIMATOR_TELEMETRY_HASH_PEPPER", "");
  } else {
    vi.stubEnv("ARCHESTIMATOR_TELEMETRY_HASH_PEPPER", pepper);
  }

  const store = buildMockPublicationStore();

  vi.doMock("@/lib/publication/d1-store", () => ({
    createPublicationD1Store: vi.fn(() => store),
  }));

  const { recordProjectPublicationAnalyticsEvent } = await import("@/lib/publication/public-repository");
  await recordProjectPublicationAnalyticsEvent({
    token: "client-token",
    eventType: "open",
    accessStage: "page_visit",
    recipientKnown: false,
    request: new Request("https://archestimator.test/share/client-token", {
      headers: { "cf-connecting-ip": forwardedFor, "user-agent": userAgent },
    }),
  });

  const inserted = store.insertPublicationEvent.mock.calls[0]?.[0] as { ipHash?: string | null; userAgentHash?: string | null };
  return inserted;
}

describe("SEC-02 (AC-SEC-02) — keyed HMAC for ip_hash / user_agent_hash", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.doUnmock("@/lib/publication/d1-store");
    vi.restoreAllMocks();
    vi.resetModules();
  });

  it("hashes the SAME ip/user-agent differently under two different peppers (keyed, not bare sha256)", async () => {
    const ua = "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_5) AppleWebKit/537.36 Chrome/125.0 Safari/537.36";
    const first = await captureAnalyticsInsert({ pepper: "pepper-one", forwardedFor: "203.0.113.44", userAgent: ua });
    const second = await captureAnalyticsInsert({ pepper: "pepper-two", forwardedFor: "203.0.113.44", userAgent: ua });

    // Non-vacuous: hashes must be present, must NOT contain the raw values, and must differ across peppers.
    expect(first.ipHash).toEqual(expect.any(String));
    expect(second.ipHash).toEqual(expect.any(String));
    expect(first.ipHash).not.toContain("203.0.113.44");
    expect(first.ipHash).not.toBe(second.ipHash);

    expect(first.userAgentHash).toEqual(expect.any(String));
    expect(second.userAgentHash).toEqual(expect.any(String));
    expect(first.userAgentHash).not.toBe(second.userAgentHash);
  });

  it("is deterministic for the same ip under the same pepper (so analytics dedup/group still works)", async () => {
    const ua = "curl/8.4.0";
    const a = await captureAnalyticsInsert({ pepper: "stable-pepper", forwardedFor: "198.51.100.7", userAgent: ua });
    const b = await captureAnalyticsInsert({ pepper: "stable-pepper", forwardedFor: "198.51.100.7", userAgent: ua });
    expect(a.ipHash).toBe(b.ipHash);
    expect(a.userAgentHash).toBe(b.userAgentHash);
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
    vi.doUnmock("@/lib/publication/d1-store");
    vi.restoreAllMocks();
    vi.resetModules();
  });

  // Mock two publications (A=under-token-A, B=under-token-B) plus a recipient bound to A.
  // The recipient lookup is constrained by getRecipientTokenHash(<publicationId>, recipientId),
  // so resolving recipient-A's id under publication B returns no token hash -> "Recipient not found".
  function buildRepositoryMock({
    publicationId,
    recipientRow,
  }: {
    publicationId: string;
    recipientRow: { recipient_token_hash: string } | null;
  }) {
    return buildMockPublicationStore({
      getPublicationWriteContextByTokenHash: vi.fn().mockResolvedValue({
        id: publicationId,
        activity_target_labels_json: {
          estimateLabels: {},
          rowLabels: {},
          rowEstimateIds: {},
        },
        snapshot_json: {},
        snapshot_version: 1,
      }),
      getRecipientTokenHash: vi.fn(async (resolvedPublicationId: string, recipientId: string) => {
        return resolvedPublicationId === publicationId && recipientId === "recipient-bound-to-A"
          ? recipientRow?.recipient_token_hash ?? null
          : null;
      }),
    });
  }

  async function setupRepository(store: ReturnType<typeof buildRepositoryMock>) {
    vi.resetModules();
    vi.stubEnv("PUBLICATION_TOKEN_HASH_SECRET", "publication-token-hash-secret");

    vi.doMock("@/lib/publication/d1-store", () => ({
      createPublicationD1Store: vi.fn(() => store),
    }));

    return import("@/lib/publication/public-repository");
  }

  it("comment: a recipientId bound to publication A cannot resolve under publication B (0 rows -> not found)", async () => {
    // Publication B resolves to id "publication-B"; the recipient row lookup under B's id finds nothing.
    const store = buildRepositoryMock({ publicationId: "publication-B", recipientRow: null });
    const { insertSharedLinkComment } = await setupRepository(store);

    await expect(
      insertSharedLinkComment({
        publicationToken: "token-B",
        recipientId: "recipient-bound-to-A",
        expectedSnapshotVersion: 1,
        body: "should not post under wrong publication",
      }),
    ).rejects.toThrow(/recipient not found/i);

    // The app-layer recipient lookup MUST be scoped by publication_id before writing.
    expect(store.getRecipientTokenHash).toHaveBeenCalledWith("publication-B", "recipient-bound-to-A");
    expect(store.insertClientComment).not.toHaveBeenCalled();
  });

  it("decision: a recipientId bound to publication A cannot resolve under publication B (0 rows -> not found)", async () => {
    const store = buildRepositoryMock({ publicationId: "publication-B", recipientRow: null });
    const { submitSharedLinkDecision } = await setupRepository(store);

    await expect(
      submitSharedLinkDecision({
        publicationToken: "token-B",
        recipientId: "recipient-bound-to-A",
        expectedSnapshotVersion: 1,
        decision: "accepted",
      }),
    ).rejects.toThrow(/recipient not found/i);

    expect(store.getRecipientTokenHash).toHaveBeenCalledWith("publication-B", "recipient-bound-to-A");
    expect(store.submitClientResponse).not.toHaveBeenCalled();
  });

  it("comment: a recipientId that IS bound to the resolving publication still posts (scoping is not over-broad)", async () => {
    const store = buildRepositoryMock({ publicationId: "publication-A", recipientRow: { recipient_token_hash: "recipient-hash" } });
    const { insertSharedLinkComment } = await setupRepository(store);

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
        estimateId: null,
        rowId: null,
        targetKind: "proposal",
        targetLabel: "the proposal",
        targetSecondaryLabel: null,
        snapshotVersionAtComment: 1,
      },
    });

    expect(store.getRecipientTokenHash).toHaveBeenCalledWith("publication-A", "recipient-bound-to-A");
    expect(store.insertClientComment).toHaveBeenCalledWith(expect.objectContaining({ publicationId: "publication-A", recipientTokenHash: "recipient-hash" }));
  });

  it("static guard: both write-path recipient lookups carry a publication_id constraint", () => {
    // insertSharedLinkComment + submitSharedLinkDecision each resolve the publication context
    // first, then ask the D1 store for a recipient token hash scoped by publication id.
    const scopedLookups = publicRepositorySource.match(/store\.getRecipientTokenHash\(publicationId, params\.recipientId\)/g) ?? [];
    expect(scopedLookups.length).toBe(2);
    expect(publicRepositorySource).toMatch(/resolvePublicationContextByTokenHash\(store, pubHash\)[\s\S]*?store\.getRecipientTokenHash\(publicationId, params\.recipientId\)/);

    // The D1 store query keeps that boundary enforced at the SQL layer.
    expect(d1StoreSource).toMatch(/async getRecipientTokenHash[\s\S]*?FROM shared_link_recipients[\s\S]*?WHERE publication_id = \? AND id = \?[\s\S]*?\[publicationId, recipientId\]/);
    expect(d1StoreSource).toMatch(/async insertClientComment[\s\S]*?FROM shared_link_recipients[\s\S]*?WHERE publication_id = \? AND recipient_token_hash = \?[\s\S]*?\[publication\.id, input\.recipientTokenHash\]/);
    expect(d1StoreSource).toMatch(/async submitClientResponse[\s\S]*?FROM shared_link_recipients[\s\S]*?WHERE publication_id = \? AND recipient_token_hash = \?[\s\S]*?\[publication\.id, input\.recipientTokenHash\]/);
  });
});
