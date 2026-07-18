import { createHash } from "node:crypto";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const cloudflareMocks = vi.hoisted(() => ({
  getCloudflareD1Database: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/cloudflare/d1", () => ({
  getCloudflareD1Database: cloudflareMocks.getCloudflareD1Database,
}));

import {
  cleanupExpiredDurableRateLimitEvents,
  countDurableRateLimitEvents,
  deleteDurableRateLimitEvents,
  insertDurableRateLimitEvent,
} from "@/lib/security/durable-rate-limit-d1";

type DatabaseCall = {
  sql: string;
  values: unknown[];
};

function createDatabase(firstValue: unknown = { count: 0 }) {
  const calls: DatabaseCall[] = [];
  const database = {
    prepare: vi.fn((sql: string) => ({
      bind: vi.fn((...values: unknown[]) => {
        calls.push({ sql, values });
        return {
          first: vi.fn().mockResolvedValue(firstValue),
          run: vi.fn().mockResolvedValue({ success: true }),
        };
      }),
    })),
  };
  return { calls, database };
}

function createDurableOperations() {
  return {
    cleanupExpiredDurableRateLimitEvents: vi.fn().mockResolvedValue(undefined),
    countDurableRateLimitEvents: vi.fn().mockResolvedValue(1),
    deleteDurableRateLimitEvents: vi.fn().mockResolvedValue(undefined),
    insertDurableRateLimitEvent: vi.fn().mockResolvedValue(undefined),
  };
}

function createRateLimitEngineMocks() {
  return {
    checkExistingDurableRateLimit: vi.fn().mockResolvedValue({ allowed: true }),
    checkRecordedDurableRateLimit: vi.fn().mockResolvedValue({ allowed: true }),
    clearDurableRateLimitEvents: vi.fn().mockResolvedValue(undefined),
    recordDurableRateLimitEvent: vi.fn().mockResolvedValue(undefined),
  };
}

async function importEngineWithOperations(operations = createDurableOperations()) {
  vi.resetModules();
  vi.doMock("@/lib/security/durable-rate-limit-d1", () => operations);
  const engine = await import("@/lib/security/durable-rate-limits");
  return { engine, operations };
}

async function importPublicationPolicyWithOperations(operations = createDurableOperations()) {
  vi.resetModules();
  vi.doMock("@/lib/security/durable-rate-limit-d1", () => operations);
  vi.stubEnv("PUBLICATION_TOKEN_HASH_SECRET", "publication-token-hash-secret");
  vi.stubEnv("ARCHESTIMATOR_TELEMETRY_HASH_PEPPER", "telemetry-hash-pepper");
  const policy = await import("@/lib/publication/public-rate-limits");
  return { operations, policy };
}

async function importPoliciesWithEngineMocks() {
  const engine = createRateLimitEngineMocks();
  vi.resetModules();
  vi.doMock("@/lib/security/durable-rate-limits", () => engine);
  vi.doMock("@/lib/publication/security", () => ({
    getClientIp: vi.fn(() => "203.0.113.10"),
    hashPublicationToken: vi.fn((token: string) => `token:${token}`),
    hashPublicTelemetryValue: vi.fn((value: string | null) => value ? `hmac:${value}` : null),
    readPublicationTokenHashSecret: vi.fn(() => "secret"),
  }));
  const [publication, clientPortal] = await Promise.all([
    import("@/lib/publication/public-rate-limits"),
    import("@/lib/client-portal/public-rate-limits"),
  ]);
  return { clientPortal, engine, publication };
}

type CapturedRateLimitWindow = {
  limit: number;
  message: (retryAfter: number) => string;
  seconds: number;
};

function summarizeWindow(window: CapturedRateLimitWindow) {
  return {
    limit: window.limit,
    message: window.message(window.seconds),
    seconds: window.seconds,
  };
}

function summarizeRecordedInput(input: {
  keyParts: Array<string | null | undefined>;
  metadata?: Record<string, unknown>;
  scope: string;
  windows: CapturedRateLimitWindow[];
}) {
  return {
    ...input,
    windows: input.windows.map(summarizeWindow),
  };
}

function summarizeExistingInput(input: {
  keyParts: Array<string | null | undefined>;
  scope: string;
  window: CapturedRateLimitWindow;
}) {
  return {
    ...input,
    window: summarizeWindow(input.window),
  };
}

function publicationRequest() {
  return new Request("https://archestimator.test/share/client-token", {
    headers: { "cf-connecting-ip": "203.0.113.10" },
  });
}

describe("durable rate-limit D1 operations", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("preserves insert SQL, bind order, metadata JSON, UUID, and separate occurred/expiry clocks", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-16T08:00:00.000Z"));
    vi.spyOn(Date, "now").mockReturnValue(new Date("2026-07-16T09:00:00.000Z").getTime());
    const { calls, database } = createDatabase();
    cloudflareMocks.getCloudflareD1Database.mockResolvedValue(database);

    await insertDurableRateLimitEvent({
      keyHash: "key-hash",
      metadata: { route: "password", success: false },
      scope: "project_publication_password",
      ttlSeconds: 3600,
    });

    expect(calls).toHaveLength(1);
    expect(calls[0].sql).toContain(
      "INSERT INTO security_rate_limit_events (id, scope, key_hash, metadata_json, occurred_at, expires_at)",
    );
    expect(calls[0].sql).toContain("VALUES (?, ?, ?, ?, ?, ?)");
    expect(calls[0].values).toEqual([
      expect.any(String),
      "project_publication_password",
      "key-hash",
      JSON.stringify({ route: "password", success: false }),
      "2026-07-16T08:00:00.000Z",
      "2026-07-16T10:00:00.000Z",
    ]);
  });

  it("preserves count active-expiry SQL and all count/delete/cleanup bind orders", async () => {
    const { calls, database } = createDatabase({ count: 7 });
    cloudflareMocks.getCloudflareD1Database.mockResolvedValue(database);

    await expect(countDurableRateLimitEvents({
      activeAt: "2026-07-16T08:00:00.000Z",
      keyHash: "key-hash",
      scope: "scope-a",
      since: "2026-07-16T07:00:00.000Z",
    })).resolves.toBe(7);
    await expect(countDurableRateLimitEvents({
      keyHash: "key-hash",
      scope: "scope-a",
      since: "2026-07-16T07:59:00.000Z",
    })).resolves.toBe(7);
    await deleteDurableRateLimitEvents("scope-a", "key-hash");
    await cleanupExpiredDurableRateLimitEvents(new Date("2026-07-16T08:00:00.000Z").getTime());

    expect(calls[0].sql).toContain("AND expires_at > ?");
    expect(calls[0].values).toEqual([
      "scope-a",
      "key-hash",
      "2026-07-16T07:00:00.000Z",
      "2026-07-16T08:00:00.000Z",
    ]);
    expect(calls[1].sql).not.toContain("AND expires_at > ?");
    expect(calls[1].values).toEqual(["scope-a", "key-hash", "2026-07-16T07:59:00.000Z"]);
    expect(calls[2]).toEqual({
      sql: "DELETE FROM security_rate_limit_events WHERE scope = ? AND key_hash = ?",
      values: ["scope-a", "key-hash"],
    });
    expect(calls[3]).toEqual({
      sql: "DELETE FROM security_rate_limit_events WHERE expires_at < ?",
      values: ["2026-07-16T08:00:00.000Z"],
    });
  });

  it("fails with the frozen ARCH_DB binding error", async () => {
    cloudflareMocks.getCloudflareD1Database.mockResolvedValue(null);
    await expect(deleteDurableRateLimitEvents("scope-a", "key-hash")).rejects.toThrow(
      "Cloudflare D1 ARCH_DB binding is required for publication shared links.",
    );
  });
});

describe("durable rate-limit engine and publication policy", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-16T08:00:00.000Z"));
  });

  afterEach(() => {
    vi.doUnmock("@/lib/security/durable-rate-limit-d1");
    vi.doUnmock("@/lib/security/durable-rate-limits");
    vi.doUnmock("@/lib/publication/security");
    vi.unstubAllEnvs();
    vi.useRealTimers();
    vi.restoreAllMocks();
    vi.resetModules();
  });

  it("normalizes key parts with a unit separator, hashes to base64url, and denies recorded attempt limit plus one", async () => {
    const operations = createDurableOperations();
    operations.countDurableRateLimitEvents.mockResolvedValue(3);
    const { engine } = await importEngineWithOperations(operations);
    const expectedHash = createHash("sha256")
      .update(["scope-a", "token", "-", "-", "-"].join("\u001f"))
      .digest("base64url");

    await expect(engine.checkRecordedDurableRateLimit({
      keyParts: [" token ", " ", null, undefined],
      metadata: { route: "event" },
      scope: "scope-a",
      windows: [{ seconds: 60, limit: 2, message: (retryAfter) => `retry ${retryAfter}` }],
    })).resolves.toEqual({ allowed: false, message: "retry 60", retryAfter: 60 });

    expect(operations.insertDurableRateLimitEvent).toHaveBeenCalledWith({
      keyHash: expectedHash,
      metadata: { route: "event" },
      scope: "scope-a",
      ttlSeconds: 60,
    });
    expect(operations.countDurableRateLimitEvents).toHaveBeenCalledWith({
      keyHash: expectedHash,
      scope: "scope-a",
      since: "2026-07-16T07:59:00.000Z",
    });
    expect(operations.insertDurableRateLimitEvent.mock.invocationCallOrder[0]).toBeLessThan(
      operations.countDurableRateLimitEvents.mock.invocationCallOrder[0],
    );
    expect(expectedHash).toMatch(/^[A-Za-z0-9_-]+$/);
  });

  it("evaluates declared windows in order and returns the full denying window", async () => {
    const operations = createDurableOperations();
    operations.countDurableRateLimitEvents.mockResolvedValueOnce(12).mockResolvedValueOnce(121);
    const { engine } = await importEngineWithOperations(operations);

    await expect(engine.checkRecordedDurableRateLimit({
      keyParts: ["user-1", "203.0.113.10"],
      scope: "proposal_export",
      windows: [
        { seconds: 60, limit: 12, message: (retryAfter) => `short ${retryAfter}` },
        { seconds: 3600, limit: 120, message: (retryAfter) => `long ${retryAfter}` },
      ],
    })).resolves.toEqual({ allowed: false, message: "long 3600", retryAfter: 3600 });

    expect(operations.countDurableRateLimitEvents.mock.calls.map(([input]) => input.since)).toEqual([
      "2026-07-16T07:59:00.000Z",
      "2026-07-16T07:00:00.000Z",
    ]);
    expect(operations.insertDurableRateLimitEvent).toHaveBeenCalledWith(expect.objectContaining({ ttlSeconds: 3600 }));
  });

  it("does not delete expired rate-limit events on every recorded attempt", async () => {
    const operations = createDurableOperations();
    const { engine } = await importEngineWithOperations(operations);
    const input = {
      keyParts: ["token", "ip"],
      scope: "project_publication_event",
      windows: [{ seconds: 60, limit: 60, message: (retryAfter: number) => `retry ${retryAfter}` }],
    };

    await expect(engine.checkRecordedDurableRateLimit(input)).resolves.toEqual({ allowed: true });
    await expect(engine.checkRecordedDurableRateLimit(input)).resolves.toEqual({ allowed: true });

    expect(operations.insertDurableRateLimitEvent).toHaveBeenCalledTimes(2);
    expect(operations.countDurableRateLimitEvents).toHaveBeenCalledTimes(2);
    expect(operations.cleanupExpiredDurableRateLimitEvents).toHaveBeenCalledTimes(1);
  });

  it("runs expired rate-limit cleanup as a single in-process flight under concurrent checks", async () => {
    let resolveCleanup: (() => void) | undefined;
    const cleanupFinished = new Promise<void>((resolve) => {
      resolveCleanup = resolve;
    });
    const operations = createDurableOperations();
    operations.cleanupExpiredDurableRateLimitEvents.mockReturnValue(cleanupFinished);
    const { engine } = await importEngineWithOperations(operations);
    const input = {
      keyParts: ["token", "ip"],
      scope: "project_publication_event",
      windows: [{ seconds: 60, limit: 60, message: (retryAfter: number) => `retry ${retryAfter}` }],
    };

    const first = engine.checkRecordedDurableRateLimit(input);
    const second = engine.checkRecordedDurableRateLimit(input);
    expect(operations.cleanupExpiredDurableRateLimitEvents).toHaveBeenCalledTimes(1);
    expect(operations.insertDurableRateLimitEvent).not.toHaveBeenCalled();

    resolveCleanup?.();
    await expect(Promise.all([first, second])).resolves.toEqual([{ allowed: true }, { allowed: true }]);
    expect(operations.insertDurableRateLimitEvent).toHaveBeenCalledTimes(2);
    expect(operations.countDurableRateLimitEvents).toHaveBeenCalledTimes(2);
  });

  it("propagates cleanup failure, resets debounce state, and retries cleanup on the next call", async () => {
    const operations = createDurableOperations();
    operations.cleanupExpiredDurableRateLimitEvents
      .mockRejectedValueOnce(new Error("cleanup failed"))
      .mockResolvedValueOnce(undefined);
    const { engine } = await importEngineWithOperations(operations);
    const input = {
      keyParts: ["token", "ip"],
      scope: "project_publication_event",
      windows: [{ seconds: 60, limit: 60, message: (retryAfter: number) => `retry ${retryAfter}` }],
    };

    await expect(engine.checkRecordedDurableRateLimit(input)).rejects.toThrow("cleanup failed");
    expect(operations.insertDurableRateLimitEvent).not.toHaveBeenCalled();
    await expect(engine.checkRecordedDurableRateLimit(input)).resolves.toEqual({ allowed: true });
    expect(operations.cleanupExpiredDurableRateLimitEvents).toHaveBeenCalledTimes(2);
  });

  it("blocks publication password attempts from durable D1 failure rows", async () => {
    const operations = createDurableOperations();
    operations.countDurableRateLimitEvents.mockResolvedValue(5);
    const { policy } = await importPublicationPolicyWithOperations(operations);

    await expect(policy.checkProjectPublicationPasswordRateLimit({
      token: "client-token",
      request: publicationRequest(),
    })).resolves.toEqual({
      allowed: false,
      message: "Too many attempts. Please wait 3600 seconds.",
      retryAfter: 3600,
    });

    expect(operations.countDurableRateLimitEvents).toHaveBeenCalledWith({
      activeAt: "2026-07-16T08:00:00.000Z",
      keyHash: expect.any(String),
      scope: "project_publication_password",
      since: "2026-07-16T07:00:00.000Z",
    });
    expect(operations.insertDurableRateLimitEvent).not.toHaveBeenCalled();
  });

  it("records publication password failures as durable D1 rows without holding the request open", async () => {
    let resolveCleanup: (() => void) | undefined;
    const cleanupFinished = new Promise<void>((resolve) => {
      resolveCleanup = resolve;
    });
    const operations = createDurableOperations();
    operations.cleanupExpiredDurableRateLimitEvents.mockReturnValue(cleanupFinished);
    const { policy } = await importPublicationPolicyWithOperations(operations);

    const recording = policy.recordProjectPublicationPasswordFailure({
      token: "client-token",
      request: publicationRequest(),
    });
    await Promise.resolve();

    expect(operations.cleanupExpiredDurableRateLimitEvents).toHaveBeenCalledTimes(1);
    expect(operations.insertDurableRateLimitEvent).not.toHaveBeenCalled();
    resolveCleanup?.();
    await recording;
    expect(operations.insertDurableRateLimitEvent).toHaveBeenCalledWith({
      keyHash: expect.any(String),
      metadata: { route: "password", success: false },
      scope: "project_publication_password",
      ttlSeconds: 3600,
    });
    expect(operations.countDurableRateLimitEvents).not.toHaveBeenCalled();
  });

  it("clears durable publication password failure rows after successful unlock", async () => {
    const operations = createDurableOperations();
    operations.countDurableRateLimitEvents.mockResolvedValue(0);
    const { policy } = await importPublicationPolicyWithOperations(operations);
    const request = publicationRequest();

    await policy.checkProjectPublicationPasswordRateLimit({ token: "client-token", request });
    await policy.recordProjectPublicationPasswordFailure({ token: "client-token", request });
    const cleanupCallsBeforeClear = operations.cleanupExpiredDurableRateLimitEvents.mock.calls.length;
    await policy.clearProjectPublicationPasswordFailures({ token: "client-token", request });

    const checkedHash = operations.countDurableRateLimitEvents.mock.calls[0][0].keyHash;
    const recordedHash = operations.insertDurableRateLimitEvent.mock.calls[0][0].keyHash;
    expect(operations.deleteDurableRateLimitEvents).toHaveBeenCalledWith(
      "project_publication_password",
      checkedHash,
    );
    expect(recordedHash).toBe(checkedHash);
    expect(operations.cleanupExpiredDurableRateLimitEvents).toHaveBeenCalledTimes(cleanupCallsBeforeClear);
  });

  it("preserves the exact 18-scope policy matrix across domain-owned wrappers", async () => {
    const { clientPortal, engine, publication } = await importPoliciesWithEngineMocks();
    const request = publicationRequest();
    const publicRequestKey = ["token:client-token", "hmac:203.0.113.10"];

    await publication.checkProjectPublicationSnapshotRateLimit({ token: "client-token", request });
    await publication.checkProposalExportRateLimit({ userId: "user-1", request });
    await publication.checkProjectPublicationEventRateLimit({ token: "client-token", request });
    await publication.checkProjectPublicationActivityRateLimit({ token: "client-token", request });
    await publication.checkSharedLinkSessionStartRateLimit({ token: "client-token", request });
    await publication.checkProjectPublicationPasswordRateLimit({ token: "client-token", request });
    await publication.recordProjectPublicationPasswordFailure({ token: "client-token", request });
    await publication.clearProjectPublicationPasswordFailures({ token: "client-token", request });
    await publication.checkSharedLinkCommentRateLimit({ publicationId: "publication-1", recipientId: "recipient-1" });
    await publication.checkSharedLinkCommentReadRateLimit({ publicationId: "publication-1", recipientId: "recipient-1" });
    await publication.checkSharedLinkDecisionRateLimit({ publicationId: "publication-1", recipientId: "recipient-1" });
    await publication.checkSharedLinkDecisionReadRateLimit({ publicationId: "publication-1", recipientId: "recipient-1" });
    await publication.checkSharedLinkUnsubscribeRateLimit({
      token: "client-token",
      recipientToken: "recipient-token",
      request,
    });

    await clientPortal.checkClientPortalPublicReadRateLimit({ token: "client-token", request, route: "asset" });
    await clientPortal.checkClientPortalPublicReadRateLimit({ token: "client-token", request, route: "manifest" });
    await clientPortal.checkClientPortalPublicReadRateLimit({ token: "client-token", request, route: "section" });
    await clientPortal.checkClientPortalSessionStartRateLimit({ token: "client-token", request });
    await clientPortal.checkClientPortalPasswordRateLimit({ token: "client-token", request });
    await clientPortal.recordClientPortalPasswordFailure({ token: "client-token", request });
    await clientPortal.clearClientPortalPasswordFailures({ token: "client-token", request });
    await clientPortal.checkClientPortalThreadRateLimit({ portalId: "portal-1", recipientId: "recipient-1" });
    await clientPortal.checkClientPortalThreadReadRateLimit({ portalId: "portal-1", recipientId: "recipient-1" });
    await clientPortal.checkClientPortalDecisionRateLimit({ portalId: "portal-1", recipientId: "recipient-1" });
    await clientPortal.checkClientPortalDecisionReadRateLimit({ portalId: "portal-1", recipientId: "recipient-1" });

    const genericWindow = (seconds: number, limit: number) => ({
      limit,
      message: `Too many attempts. Please wait ${seconds} seconds.`,
      seconds,
    });
    const commentWindow = (seconds: number, limit: number) => ({
      limit,
      message: `Too many comments. Please wait ${seconds} seconds.`,
      seconds,
    });
    expect(engine.checkRecordedDurableRateLimit.mock.calls.map(([input]) => summarizeRecordedInput(input))).toEqual([
      { scope: "project_publication_snapshot", keyParts: publicRequestKey, metadata: { route: "snapshot" }, windows: [genericWindow(60, 60)] },
      { scope: "proposal_export", keyParts: ["user-1", "203.0.113.10"], metadata: { route: "proposal_export" }, windows: [genericWindow(60, 12), genericWindow(3600, 120)] },
      { scope: "project_publication_event", keyParts: publicRequestKey, metadata: { route: "event" }, windows: [genericWindow(60, 60)] },
      { scope: "project_publication_activity", keyParts: publicRequestKey, metadata: { route: "activity" }, windows: [genericWindow(60, 60)] },
      { scope: "shared_link_session_start", keyParts: publicRequestKey, metadata: { route: "recipient_session" }, windows: [genericWindow(60, 10), genericWindow(3600, 50)] },
      { scope: "shared_link_comment", keyParts: ["publication-1", "recipient-1"], metadata: { route: "comment" }, windows: [commentWindow(60, 5), commentWindow(3600, 20)] },
      { scope: "shared_link_comment_read", keyParts: ["publication-1", "recipient-1"], metadata: { route: "comment_read" }, windows: [genericWindow(60, 60)] },
      { scope: "shared_link_decision", keyParts: ["publication-1", "recipient-1"], metadata: { route: "decision" }, windows: [genericWindow(60, 5)] },
      { scope: "shared_link_decision_read", keyParts: ["publication-1", "recipient-1"], metadata: { route: "decision_read" }, windows: [genericWindow(60, 60)] },
      { scope: "shared_link_unsubscribe", keyParts: [...publicRequestKey, "token:recipient-token"], metadata: { route: "unsubscribe" }, windows: [genericWindow(60, 5), genericWindow(3600, 20)] },
      { scope: "client_portal_public_read", keyParts: publicRequestKey, metadata: { route: "client_portal_asset" }, windows: [genericWindow(60, 60)] },
      { scope: "client_portal_public_read", keyParts: publicRequestKey, metadata: { route: "client_portal_manifest" }, windows: [genericWindow(60, 60)] },
      { scope: "client_portal_public_read", keyParts: publicRequestKey, metadata: { route: "client_portal_section" }, windows: [genericWindow(60, 60)] },
      { scope: "client_portal_session_start", keyParts: publicRequestKey, metadata: { route: "client_portal_recipient_session" }, windows: [genericWindow(60, 10), genericWindow(3600, 50)] },
      { scope: "client_portal_thread", keyParts: ["portal-1", "recipient-1"], metadata: { route: "client_portal_thread" }, windows: [commentWindow(60, 5), commentWindow(3600, 20)] },
      { scope: "client_portal_thread_read", keyParts: ["portal-1", "recipient-1"], metadata: { route: "client_portal_thread_read" }, windows: [genericWindow(60, 60)] },
      { scope: "client_portal_decision", keyParts: ["portal-1", "recipient-1"], metadata: { route: "client_portal_decision" }, windows: [genericWindow(60, 5)] },
      { scope: "client_portal_decision_read", keyParts: ["portal-1", "recipient-1"], metadata: { route: "client_portal_decision_read" }, windows: [genericWindow(60, 60)] },
    ]);

    expect(engine.checkExistingDurableRateLimit.mock.calls.map(([input]) => summarizeExistingInput(input))).toEqual([
      { scope: "project_publication_password", keyParts: publicRequestKey, window: genericWindow(3600, 5) },
      { scope: "client_portal_password", keyParts: publicRequestKey, window: genericWindow(3600, 5) },
    ]);
    expect(engine.recordDurableRateLimitEvent.mock.calls).toEqual([
      [{ scope: "project_publication_password", keyParts: publicRequestKey, metadata: { route: "password", success: false }, ttlSeconds: 3600 }],
      [{ scope: "client_portal_password", keyParts: publicRequestKey, metadata: { route: "client_portal_password", success: false }, ttlSeconds: 3600 }],
    ]);
    expect(engine.clearDurableRateLimitEvents.mock.calls).toEqual([
      ["project_publication_password", publicRequestKey],
      ["client_portal_password", publicRequestKey],
    ]);
  });
});
