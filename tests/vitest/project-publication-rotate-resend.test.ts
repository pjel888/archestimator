import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Behavioral tests for AC-MOD-02 (rotate in place) and AC-MOD-03 (resend send-before-persist).
// These mock the Supabase admin client and the action's collaborators so we can assert the exact
// DB-call shape (in-place UPDATE vs revoke+insert; resend send ordering vs early-write).

const PROJECT_ID = "11111111-1111-4111-8111-111111111111";
const WORKSPACE_ID = "22222222-2222-4222-8222-222222222222";
const PUBLICATION_ID = "33333333-3333-4333-8333-333333333333";
const RECIPIENT_ID = "44444444-4444-4444-8444-444444444444";

type RecordedQuery = {
  table: string;
  operation: "select" | "insert" | "update" | "delete" | "none";
  payload?: unknown;
  filters: Array<{ method: string; column?: string; value?: unknown }>;
};

type RecordedRpc = {
  args: Record<string, unknown>;
  functionName: string;
};

function setRequiredEnv() {
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://archestimator.test";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "service-role-key";
  process.env.PUBLICATION_TOKEN_HASH_SECRET = "publication-token-hash-secret";
  process.env.PUBLICATION_TOKEN_ENCRYPTION_SECRET = "publication-token-encryption-secret";
  process.env.NEXT_PUBLIC_APP_URL = "https://www.archestimator.com";
}

/**
 * Build a chainable Supabase query mock for a single table interaction.
 * `resolveResult` decides what a terminal/awaited query resolves to based on the recorded query.
 */
function makeAdminClient({
  recorded,
  recordedRpc = [],
  resolveRpc,
  resolveResult,
}: {
  recorded: RecordedQuery[];
  recordedRpc?: RecordedRpc[];
  resolveRpc?: (call: RecordedRpc) => { data: unknown; error: unknown };
  resolveResult: (query: RecordedQuery) => { data: unknown; error: unknown; count?: number };
}) {
  function from(table: string) {
    const query: RecordedQuery = { table, operation: "none", filters: [] };
    recorded.push(query);

    const terminalResult = () => resolveResult(query);

    const builder: Record<string, unknown> = {
      select() {
        if (query.operation === "none") query.operation = "select";
        return builder;
      },
      insert(payload: unknown) {
        query.operation = "insert";
        query.payload = payload;
        return builder;
      },
      update(payload: unknown) {
        query.operation = "update";
        query.payload = payload;
        return builder;
      },
      delete() {
        query.operation = "delete";
        return builder;
      },
      eq(column: string, value: unknown) {
        query.filters.push({ method: "eq", column, value });
        return builder;
      },
      lt(column: string, value: unknown) {
        query.filters.push({ method: "lt", column, value });
        return builder;
      },
      gte(column: string, value: unknown) {
        query.filters.push({ method: "gte", column, value });
        return builder;
      },
      in(column: string, value: unknown) {
        query.filters.push({ method: "in", column, value });
        return builder;
      },
      is(column: string, value: unknown) {
        query.filters.push({ method: "is", column, value });
        return builder;
      },
      order() {
        return builder;
      },
      limit() {
        return builder;
      },
      maybeSingle() {
        return Promise.resolve(terminalResult());
      },
      single() {
        return Promise.resolve(terminalResult());
      },
      then(onFulfilled: (value: unknown) => unknown, onRejected?: (reason: unknown) => unknown) {
        return Promise.resolve(terminalResult()).then(onFulfilled, onRejected);
      },
    };

    return builder;
  }

  const rpc = vi.fn((functionName: string, args: Record<string, unknown>) => {
    const call = { functionName, args };
    recordedRpc.push(call);
    return Promise.resolve(resolveRpc?.(call) ?? { data: true, error: null });
  });

  return { from, rpc };
}

function findFilter(query: RecordedQuery, column: string) {
  return query.filters.find((filter) => filter.column === column);
}

afterEach(() => {
  vi.doUnmock("@supabase/supabase-js");
  vi.doUnmock("@/lib/auth/session");
  vi.doUnmock("next/cache");
  vi.doUnmock("next/headers");
  vi.doUnmock("@/lib/email/transactional-email-client");
  vi.doUnmock("@/lib/publication/snapshot");
  vi.resetModules();
});

beforeEach(() => {
  setRequiredEnv();
  vi.resetModules();
});

describe("AC-MOD-02 rotateProjectPublicationLink rotates the token in place", () => {
  it("rotates credentials through the atomic RPC and never inserts or revokes directly", async () => {
    const recorded: RecordedQuery[] = [];
    const recordedRpc: RecordedRpc[] = [];

    vi.doMock("@/lib/auth/session", () => ({
      requireAuth: vi.fn().mockResolvedValue(undefined),
      requireCurrentUserContext: vi.fn().mockResolvedValue({
        userId: "user-1",
        role: "ceo",
        email: "owner@example.com",
        displayName: "Owner One",
      }),
    }));
    vi.doMock("next/cache", () => ({ revalidatePath: vi.fn() }));
    vi.doMock("@/lib/publication/snapshot", () => ({
      // AC-MOD-18 (MOD-SHEET-06): the snapshot must carry the resolved estimates the action now reads
      // back into selected_estimate_ids — mirror the mocked selection (["est-1"]) so create/republish
      // reach the persist path instead of the new zero-resolution guard.
      buildProjectPublicationSnapshot: vi.fn(() => ({
        generatedAt: "2026-06-13T00:00:00.000Z",
        estimates: [{ id: "est-1" }],
      })),
      normalizeProjectPublicationLocationVisibility: vi.fn((value: unknown) =>
        value === "exact" || value === "hidden" ? value : "locality",
      ),
    }));

    vi.doMock("@supabase/supabase-js", () => ({
      createClient: vi.fn(() =>
        makeAdminClient({
          recorded,
          recordedRpc,
          resolveResult: (query) => {
            if (query.table === "projects") {
              return {
                data: {
                  id: PROJECT_ID,
                  workspace_id: WORKSPACE_ID,
                  name: "Demo Project",
                  project_code: "P-1",
                  client_name: "Client",
                  location: "Site",
                  currency_code: "USD",
                  metadata: {},
                },
                error: null,
              };
            }
            if (query.table === "project_publications" && query.operation === "select") {
              return {
                data: {
                  id: PUBLICATION_ID,
                  encrypted_token: "encrypted-old",
                  expires_at: null,
                  password_hash: "existing-password-hash",
                  selected_estimate_ids: ["est-1"],
                  snapshot_version: 3,
                },
                error: null,
              };
            }
            // estimates / nodes / rows / tabs for snapshot building
            return { data: [], error: null };
          },
        }),
      ),
    }));

    // decryptPublicationToken is exercised by readClientLinkPath; stub security partially.
    vi.doMock("@/lib/publication/security", async () => {
      const actual = await vi.importActual<typeof import("@/lib/publication/security")>(
        "@/lib/publication/security",
      );
      return {
        ...actual,
        decryptPublicationToken: vi.fn(() => "old-token"),
      };
    });

    const { rotateProjectPublicationLink } = await import("@/lib/publication/actions");
    const result = await rotateProjectPublicationLink({ projectId: PROJECT_ID });

    expect(result.ok).toBe(true);
    expect(result.message).toBe("New shared link ready.");
    expect(result.clientLinkPath).toMatch(/^\/share\//);
    // The new client link path is a freshly minted token, not the old one.
    expect(result.clientLinkPath).not.toBe("/share/old-token");

    const publicationWrites = recorded.filter(
      (query) => query.table === "project_publications" && (query.operation === "insert" || query.operation === "update"),
    );
    expect(publicationWrites).toHaveLength(0);
    expect(recordedRpc).toHaveLength(1);
    expect(recordedRpc[0].functionName).toBe("rotate_project_publication_credentials");
    expect(recordedRpc[0].args).toEqual(
      expect.objectContaining({
        target_publication_id: PUBLICATION_ID,
        expected_encrypted_token: "encrypted-old",
        p_password_hash: "existing-password-hash",
        p_selected_estimate_ids: ["est-1"],
        p_activity_target_labels_json: {
          estimateLabels: { "est-1": "Proposal" },
          rowLabels: {},
          rowEstimateIds: {},
        },
        p_token_hash: expect.any(String),
        p_encrypted_token: expect.any(String),
      }),
    );
    expect(
      recorded.some(
        (query) =>
          query.table === "project_publications" &&
          query.operation === "update" &&
          (query.payload as Record<string, unknown> | undefined)?.status === "revoked",
      ),
    ).toBe(false);
  });

  it("does not report success when a concurrent rotation changes the locked publication row first", async () => {
    const recorded: RecordedQuery[] = [];
    const recordedRpc: RecordedRpc[] = [];

    vi.doMock("@/lib/auth/session", () => ({
      requireAuth: vi.fn().mockResolvedValue(undefined),
      requireCurrentUserContext: vi.fn().mockResolvedValue({
        userId: "user-1",
        role: "ceo",
        email: "owner@example.com",
        displayName: "Owner One",
      }),
    }));
    vi.doMock("next/cache", () => ({ revalidatePath: vi.fn() }));
    vi.doMock("@/lib/publication/snapshot", () => ({
      buildProjectPublicationSnapshot: vi.fn(() => ({
        generatedAt: "2026-06-13T00:00:00.000Z",
        estimates: [{ id: "est-1" }],
      })),
      normalizeProjectPublicationLocationVisibility: vi.fn((value: unknown) =>
        value === "exact" || value === "hidden" ? value : "locality",
      ),
    }));

    vi.doMock("@supabase/supabase-js", () => ({
      createClient: vi.fn(() =>
        makeAdminClient({
          recorded,
          recordedRpc,
          resolveRpc: (call) =>
            call.functionName === "rotate_project_publication_credentials"
              ? { data: -1, error: null }
              : { data: true, error: null },
          resolveResult: (query) => {
            if (query.table === "projects") {
              return {
                data: {
                  id: PROJECT_ID,
                  workspace_id: WORKSPACE_ID,
                  name: "Demo Project",
                  project_code: "P-1",
                  client_name: "Client",
                  location: "Site",
                  currency_code: "USD",
                  metadata: {},
                },
                error: null,
              };
            }
            if (query.table === "project_publications" && query.operation === "select") {
              return {
                data: {
                  id: PUBLICATION_ID,
                  encrypted_token: "encrypted-old",
                  expires_at: null,
                  password_hash: "existing-password-hash",
                  selected_estimate_ids: ["est-1"],
                  snapshot_version: 3,
                },
                error: null,
              };
            }
            return { data: [], error: null };
          },
        }),
      ),
    }));

    vi.doMock("@/lib/publication/security", async () => {
      const actual = await vi.importActual<typeof import("@/lib/publication/security")>(
        "@/lib/publication/security",
      );
      return {
        ...actual,
        decryptPublicationToken: vi.fn(() => "old-token"),
      };
    });

    const { rotateProjectPublicationLink } = await import("@/lib/publication/actions");
    const result = await rotateProjectPublicationLink({ projectId: PROJECT_ID });

    expect(result).toEqual({
      ok: false,
      message: "Shared link changed while rotating. Refresh and try again.",
    });
    expect(recordedRpc[0]).toEqual(
      expect.objectContaining({
        functionName: "rotate_project_publication_credentials",
        args: expect.objectContaining({
          target_publication_id: PUBLICATION_ID,
          expected_encrypted_token: "encrypted-old",
        }),
      }),
    );
  });
});

describe("AC-MOD-10 republishProjectPublication writes expires_at conditionally", () => {
  async function setupRepublish({
    republishArgs,
    latestPasswordHash = "existing-password-hash",
  }: {
    republishArgs: { projectId: string; selectedEstimateIds?: string[]; password?: string; clearPassword?: boolean; expiresAt?: string | null };
    latestPasswordHash?: string | null;
  }) {
    const recorded: RecordedQuery[] = [];

    vi.doMock("@/lib/auth/session", () => ({
      requireAuth: vi.fn().mockResolvedValue(undefined),
      requireCurrentUserContext: vi.fn().mockResolvedValue({
        userId: "user-1",
        role: "ceo",
        email: "owner@example.com",
        displayName: "Owner One",
      }),
    }));
    vi.doMock("next/cache", () => ({ revalidatePath: vi.fn() }));
    vi.doMock("@/lib/publication/snapshot", () => ({
      // AC-MOD-18 (MOD-SHEET-06): the snapshot must carry the resolved estimates the action now reads
      // back into selected_estimate_ids — mirror the mocked selection (["est-1"]) so create/republish
      // reach the persist path instead of the new zero-resolution guard.
      buildProjectPublicationSnapshot: vi.fn(() => ({
        generatedAt: "2026-06-13T00:00:00.000Z",
        estimates: [{ id: "est-1" }],
      })),
      normalizeProjectPublicationLocationVisibility: vi.fn((value: unknown) =>
        value === "exact" || value === "hidden" ? value : "locality",
      ),
    }));

    vi.doMock("@supabase/supabase-js", () => ({
      createClient: vi.fn(() =>
        makeAdminClient({
          recorded,
          resolveResult: (query) => {
            if (query.table === "projects") {
              return {
                data: {
                  id: PROJECT_ID,
                  workspace_id: WORKSPACE_ID,
                  name: "Demo Project",
                  project_code: "P-1",
                  client_name: "Client",
                  location: "Site",
                  currency_code: "USD",
                  metadata: {},
                },
                error: null,
              };
            }
            if (query.table === "project_publications" && query.operation === "select") {
              return {
                data: {
                  id: PUBLICATION_ID,
                  encrypted_token: "encrypted-existing",
                  expires_at: "2026-01-01T00:00:00.000Z",
                  password_hash: latestPasswordHash,
                  selected_estimate_ids: ["est-1"],
                  snapshot_version: 7,
                },
                error: null,
              };
            }
            return { data: [], error: null };
          },
        }),
      ),
    }));

    vi.doMock("@/lib/publication/security", async () => {
      const actual = await vi.importActual<typeof import("@/lib/publication/security")>(
        "@/lib/publication/security",
      );
      return {
        ...actual,
        decryptPublicationToken: vi.fn(() => "existing-token"),
      };
    });

    const { republishProjectPublication } = await import("@/lib/publication/actions");
    const result = await republishProjectPublication(republishArgs);

    const updates = recorded.filter(
      (query) => query.table === "project_publications" && query.operation === "update",
    );

    return { result, recorded, updates };
  }

  it("writes expires_at when expiresAt is a string (sets a new expiry on the same row)", async () => {
    const { result, updates } = await setupRepublish({
      republishArgs: { projectId: PROJECT_ID, expiresAt: "2027-12-31T23:59:59.000Z" },
    });

    expect(result.ok).toBe(true);
    expect(updates).toHaveLength(1);
    const update = updates[0];
    expect(findFilter(update, "id")?.value).toBe(PUBLICATION_ID);
    const payload = update.payload as Record<string, unknown>;
    expect(payload).toHaveProperty("expires_at");
    expect(payload.expires_at).toBe("2027-12-31T23:59:59.000Z");
  });

  it("clears expires_at when expiresAt is null (reactivation in place)", async () => {
    const { result, updates } = await setupRepublish({
      republishArgs: { projectId: PROJECT_ID, expiresAt: null },
    });

    expect(result.ok).toBe(true);
    expect(updates).toHaveLength(1);
    const payload = updates[0].payload as Record<string, unknown>;
    expect(payload).toHaveProperty("expires_at");
    expect(payload.expires_at).toBeNull();
  });

  it("leaves expires_at untouched when expiresAt is undefined (key absent from payload)", async () => {
    const { result, updates } = await setupRepublish({
      republishArgs: { projectId: PROJECT_ID },
    });

    expect(result.ok).toBe(true);
    expect(updates).toHaveLength(1);
    const payload = updates[0].payload as Record<string, unknown>;
    // No expires_at key at all → the stored column is left exactly as-is.
    expect(Object.prototype.hasOwnProperty.call(payload, "expires_at")).toBe(false);
  });

  it("reactivation (expiresAt: null) updates the SAME row, mints no new token, and preserves password_hash (MOD-EXP-02)", async () => {
    const { result, recorded, updates } = await setupRepublish({
      republishArgs: { projectId: PROJECT_ID, expiresAt: null },
      latestPasswordHash: "protected-link-hash",
    });

    expect(result.ok).toBe(true);
    // Same row in place — never an INSERT of a new publication row (which would mint a new token).
    const publicationInserts = recorded.filter(
      (query) => query.table === "project_publications" && query.operation === "insert",
    );
    expect(publicationInserts).toHaveLength(0);

    expect(updates).toHaveLength(1);
    const update = updates[0];
    expect(findFilter(update, "id")?.value).toBe(PUBLICATION_ID);

    const payload = update.payload as Record<string, unknown>;
    // No fresh token is written on republish/reactivate.
    expect(payload).not.toHaveProperty("token_hash");
    expect(payload).not.toHaveProperty("encrypted_token");
    // Password preserved: passwordUpdate is {} so password_hash is NOT in the payload and stays as stored.
    // (Non-vacuous: this asserts republish does NOT null the hash on the protected-link reactivate path.)
    expect(Object.prototype.hasOwnProperty.call(payload, "password_hash")).toBe(false);
    // Expiry cleared so the link is live again.
    expect(payload.expires_at).toBeNull();
    // The same /share/<token> resolves: clientLinkPath uses the existing encrypted_token.
    expect(result.clientLinkPath).toBe("/share/existing-token");
  });

  it("a reactivate that also clears the password DOES null password_hash (guards the non-vacuous preserve test)", async () => {
    const { updates } = await setupRepublish({
      republishArgs: { projectId: PROJECT_ID, expiresAt: null, clearPassword: true },
      latestPasswordHash: "protected-link-hash",
    });

    expect(updates).toHaveLength(1);
    const payload = updates[0].payload as Record<string, unknown>;
    // When the caller explicitly clears, password_hash IS present and null — proving the
    // preserve assertion above is meaningful (the key is only absent on the non-clear path).
    expect(Object.prototype.hasOwnProperty.call(payload, "password_hash")).toBe(true);
    expect(payload.password_hash).toBeNull();
  });
});

describe("AC-MOD-15 setting a too-short password is rejected and never persisted", () => {
  function mockManagerEnv(
    recorded: RecordedQuery[],
    { hasLatest, recordedRpc = [] }: { hasLatest: boolean; recordedRpc?: RecordedRpc[] },
  ) {
    vi.doMock("@/lib/auth/session", () => ({
      requireAuth: vi.fn().mockResolvedValue(undefined),
      requireCurrentUserContext: vi.fn().mockResolvedValue({
        userId: "user-1",
        role: "ceo",
        email: "owner@example.com",
        displayName: "Owner One",
      }),
    }));
    vi.doMock("next/cache", () => ({ revalidatePath: vi.fn() }));
    vi.doMock("@/lib/publication/snapshot", () => ({
      // AC-MOD-18 (MOD-SHEET-06): the snapshot must carry the resolved estimates the action now reads
      // back into selected_estimate_ids — mirror the mocked selection (["est-1"]) so create/republish
      // reach the persist path instead of the new zero-resolution guard.
      buildProjectPublicationSnapshot: vi.fn(() => ({
        generatedAt: "2026-06-13T00:00:00.000Z",
        estimates: [{ id: "est-1" }],
      })),
      normalizeProjectPublicationLocationVisibility: vi.fn((value: unknown) =>
        value === "exact" || value === "hidden" ? value : "locality",
      ),
    }));
    vi.doMock("@/lib/publication/security", async () => {
      const actual = await vi.importActual<typeof import("@/lib/publication/security")>(
        "@/lib/publication/security",
      );
      return {
        ...actual,
        decryptPublicationToken: vi.fn(() => "existing-token"),
      };
    });
    vi.doMock("@supabase/supabase-js", () => ({
      createClient: vi.fn(() =>
        makeAdminClient({
          recorded,
          recordedRpc,
          resolveResult: (query) => {
            if (query.table === "projects") {
              return {
                data: {
                  id: PROJECT_ID,
                  workspace_id: WORKSPACE_ID,
                  name: "Demo Project",
                  project_code: "P-1",
                  client_name: "Client",
                  location: "Site",
                  currency_code: "USD",
                  metadata: {},
                },
                error: null,
              };
            }
            if (query.table === "project_publications" && query.operation === "select") {
              return {
                data: hasLatest
                  ? {
                      id: PUBLICATION_ID,
                      encrypted_token: "encrypted-existing",
                      expires_at: null,
                      password_hash: "existing-password-hash",
                      selected_estimate_ids: ["est-1"],
                      snapshot_version: 7,
                    }
                  : null,
                error: null,
              };
            }
            return { data: [], error: null };
          },
        }),
      ),
    }));
  }

  it("createProjectPublication returns { ok:false } and writes no publication row for an empty supplied password", async () => {
    const recorded: RecordedQuery[] = [];
    mockManagerEnv(recorded, { hasLatest: false });

    const { createProjectPublication } = await import("@/lib/publication/actions");
    const result = await createProjectPublication({ projectId: PROJECT_ID, password: "" });

    expect(result.ok).toBe(false);
    expect(result.message).toBe("Password must be at least 4 characters.");

    const publicationWrites = recorded.filter(
      (query) =>
        query.table === "project_publications" &&
        (query.operation === "insert" || query.operation === "update"),
    );
    expect(publicationWrites).toHaveLength(0);
  });

  it("createProjectPublication returns { ok:false } and writes no publication row for a 1-char password", async () => {
    const recorded: RecordedQuery[] = [];
    mockManagerEnv(recorded, { hasLatest: false });

    const { createProjectPublication } = await import("@/lib/publication/actions");
    const result = await createProjectPublication({ projectId: PROJECT_ID, password: "a" });

    expect(result.ok).toBe(false);
    expect(result.message).toBe("Password must be at least 4 characters.");

    // Nothing was hashed or persisted: no INSERT of a publication row at all.
    const publicationWrites = recorded.filter(
      (query) =>
        query.table === "project_publications" &&
        (query.operation === "insert" || query.operation === "update"),
    );
    expect(publicationWrites).toHaveLength(0);
  });

  it("republishProjectPublication returns { ok:false } and writes no update for a 3-char password", async () => {
    const recorded: RecordedQuery[] = [];
    mockManagerEnv(recorded, { hasLatest: true });

    const { republishProjectPublication } = await import("@/lib/publication/actions");
    const result = await republishProjectPublication({ projectId: PROJECT_ID, password: "abc" });

    expect(result.ok).toBe(false);
    expect(result.message).toBe("Password must be at least 4 characters.");

    const publicationWrites = recorded.filter(
      (query) =>
        query.table === "project_publications" &&
        (query.operation === "insert" || query.operation === "update"),
    );
    expect(publicationWrites).toHaveLength(0);
  });

  it("createProjectPublication accepts a >= 4-char password and DOES persist (guards the reject tests)", async () => {
    const recorded: RecordedQuery[] = [];
    const recordedRpc: RecordedRpc[] = [];
    mockManagerEnv(recorded, { hasLatest: false, recordedRpc });

    const { createProjectPublication } = await import("@/lib/publication/actions");
    const result = await createProjectPublication({ projectId: PROJECT_ID, password: "abcd" });

    expect(result.ok).toBe(true);
    // A valid password persists through the atomic replacement RPC carrying a non-null password_hash.
    const inserts = recorded.filter(
      (query) => query.table === "project_publications" && query.operation === "insert",
    );
    expect(inserts).toHaveLength(0);
    expect(recordedRpc).toHaveLength(1);
    expect(recordedRpc[0].functionName).toBe("replace_project_publication");
    expect(typeof recordedRpc[0].args.p_password_hash).toBe("string");
    expect(recordedRpc[0].args.p_password_hash).not.toBeNull();
  });
});

describe("AC-MOD-03 resendSharedLinkRecipientEmail sends before persisting", () => {
  async function setupResend({ sendOk }: { sendOk: boolean }) {
    const recorded: RecordedQuery[] = [];
    const recordedRpc: RecordedRpc[] = [];

    vi.doMock("@/lib/auth/session", () => ({
      requireAuth: vi.fn().mockResolvedValue(undefined),
      requireCurrentUserContext: vi.fn().mockResolvedValue({
        userId: "user-1",
        role: "ceo",
        email: "owner@example.com",
        displayName: "Owner One",
      }),
    }));
    vi.doMock("next/cache", () => ({ revalidatePath: vi.fn() }));
    vi.doMock("next/headers", () => ({
      headers: vi.fn().mockResolvedValue({ get: () => "203.0.113.1" }),
    }));

    const sendEmail = vi.fn().mockResolvedValue(
      sendOk
        ? { ok: true, messageId: "resend-message-1" }
        : { ok: false, error: "smtp exploded" },
    );
    vi.doMock("@/lib/email/transactional-email-client", () => ({
      sendEmail,
      readEmailDeliveryConfig: vi.fn(() => ({ configured: true })),
    }));

    vi.doMock("@/lib/publication/security", async () => {
      const actual = await vi.importActual<typeof import("@/lib/publication/security")>(
        "@/lib/publication/security",
      );
      return {
        ...actual,
        decryptPublicationToken: vi.fn(() => "client-token"),
      };
    });

    // Track ordering: did any shared_link_recipients update happen before sendEmail was called?
    const callOrder: string[] = [];
    sendEmail.mockImplementation(async () => {
      callOrder.push("send");
      return sendOk
        ? { ok: true, messageId: "resend-message-1" }
        : { ok: false, error: "smtp exploded" };
    });

    vi.doMock("@supabase/supabase-js", () => ({
      createClient: vi.fn(() =>
        makeAdminClient({
          recorded,
          recordedRpc,
          resolveRpc: (call) => {
            if (call.functionName === "persist_shared_link_recipient_resend") {
              callOrder.push("recipient-update");
              return { data: true, error: null };
            }
            return { data: true, error: null };
          },
          resolveResult: (query) => {
            if (query.table === "project_publications" && query.operation === "select") {
              return {
                data: {
                  id: PUBLICATION_ID,
                  project_id: PROJECT_ID,
                  workspace_id: WORKSPACE_ID,
                  encrypted_token: "encrypted-token",
                },
                error: null,
              };
            }
            if (query.table === "projects") {
              return {
                data: {
                  id: PROJECT_ID,
                  workspace_id: WORKSPACE_ID,
                  name: "Demo Project",
                  project_code: "P-1",
                  client_name: "Client",
                  location: "Site",
                  currency_code: "USD",
                  metadata: {},
                },
                error: null,
              };
            }
            if (query.table === "security_rate_limit_events") {
              // delete cleanup, insert, and count query: keep under limit.
              if (query.operation === "select") return { data: null, error: null, count: 1 };
              return { data: null, error: null };
            }
            if (query.table === "shared_link_recipients" && query.operation === "select") {
              return {
                data: {
                  id: RECIPIENT_ID,
                  email: "client@example.com",
                  display_name: null,
                  email_unsubscribed_at: null,
                },
                error: null,
              };
            }
            return { data: null, error: null };
          },
        }),
      ),
    }));

    const { resendSharedLinkRecipientEmail } = await import("@/lib/publication/actions");
    return { resendSharedLinkRecipientEmail, recorded, recordedRpc, sendEmail, callOrder };
  }

  it("does NOT overwrite recipient_token_hash when the email send fails", async () => {
    const { resendSharedLinkRecipientEmail, recorded, sendEmail, callOrder } = await setupResend({ sendOk: false });

    const result = await resendSharedLinkRecipientEmail({
      publicationId: PUBLICATION_ID,
      recipientId: RECIPIENT_ID,
      baseClientLink: "/share/client-token",
    });

    expect(result.ok).toBe(false);
    expect(sendEmail).toHaveBeenCalledTimes(1);

    const recipientUpdates = recorded.filter(
      (query) => query.table === "shared_link_recipients" && query.operation === "update",
    );
    // No write at all on failure → the previously emailed link stays valid.
    expect(recipientUpdates).toHaveLength(0);
    expect(callOrder).toEqual(["send"]);
  });

  it("persists the new hash, sent status, and resend id only after a successful send", async () => {
    const { resendSharedLinkRecipientEmail, recorded, recordedRpc, sendEmail, callOrder } = await setupResend({ sendOk: true });

    const result = await resendSharedLinkRecipientEmail({
      publicationId: PUBLICATION_ID,
      recipientId: RECIPIENT_ID,
      baseClientLink: "/share/client-token",
    });

    expect(result.ok).toBe(true);
    expect(sendEmail).toHaveBeenCalledTimes(1);

    const recipientUpdates = recorded.filter(
      (query) => query.table === "shared_link_recipients" && query.operation === "update",
    );
    expect(recipientUpdates).toHaveLength(0);
    expect(callOrder).toEqual(["send", "recipient-update"]);

    const persistCalls = recordedRpc.filter((call) => call.functionName === "persist_shared_link_recipient_resend");
    expect(persistCalls).toHaveLength(1);
    expect(persistCalls[0].args).toEqual(
      expect.objectContaining({
        target_publication_id: PUBLICATION_ID,
        target_recipient_id: RECIPIENT_ID,
        expected_encrypted_token: "encrypted-token",
        p_recipient_token_hash: expect.any(String),
        p_resend_email_id: "resend-message-1",
        p_invited_by: "user-1",
      }),
    );
  });
});

// AC-MOD-17 (MOD-ACT-04 + MOD-REC-05) — addSharedLinkRecipients must surface the inserted
// recipient id (so a just-added chip is server-actionable without a remount) and tag a
// unique-violation as an explicit "duplicate" status (so the UI never renders it as a green
// "sent" chip while the headline says "No new recipients added").
describe("AC-MOD-17 addSharedLinkRecipients surfaces inserted id + neutral duplicate status", () => {
  const NEW_RECIPIENT_ID = "55555555-5555-4555-8555-555555555555";

  async function setupAdd({
    duplicate,
    sendEmail: customSendEmail,
  }: {
    duplicate: boolean;
    sendEmail?: ReturnType<typeof vi.fn>;
  }) {
    const recorded: RecordedQuery[] = [];

    vi.doMock("@/lib/auth/session", () => ({
      requireAuth: vi.fn().mockResolvedValue(undefined),
      requireCurrentUserContext: vi.fn().mockResolvedValue({
        userId: "user-1",
        role: "ceo",
        email: "owner@example.com",
        displayName: "Owner One",
      }),
    }));
    vi.doMock("next/cache", () => ({ revalidatePath: vi.fn() }));
    vi.doMock("next/headers", () => ({
      headers: vi.fn().mockResolvedValue({ get: () => "203.0.113.1" }),
    }));

    const sendEmail = customSendEmail ?? vi.fn().mockResolvedValue({ ok: true, messageId: "invite-message-1" });
    vi.doMock("@/lib/email/transactional-email-client", () => ({
      sendEmail,
      readEmailDeliveryConfig: vi.fn(() => ({ configured: true })),
    }));

    vi.doMock("@/lib/publication/security", async () => {
      const actual = await vi.importActual<typeof import("@/lib/publication/security")>(
        "@/lib/publication/security",
      );
      return {
        ...actual,
        decryptPublicationToken: vi.fn(() => "client-token"),
      };
    });

    vi.doMock("@supabase/supabase-js", () => ({
      createClient: vi.fn(() =>
        makeAdminClient({
          recorded,
          resolveResult: (query) => {
            if (query.table === "project_publications" && query.operation === "select") {
              return {
                data: {
                  id: PUBLICATION_ID,
                  project_id: PROJECT_ID,
                  workspace_id: WORKSPACE_ID,
                  encrypted_token: "encrypted-token",
                },
                error: null,
              };
            }
            if (query.table === "projects") {
              return {
                data: {
                  id: PROJECT_ID,
                  workspace_id: WORKSPACE_ID,
                  name: "Demo Project",
                  project_code: "P-1",
                  client_name: "Client",
                  location: "Site",
                  currency_code: "USD",
                  metadata: {},
                },
                error: null,
              };
            }
            if (query.table === "shared_link_recipients" && query.operation === "insert") {
              // Simulate a unique-violation (already invited) vs a fresh insert returning the id.
              if (duplicate) {
                return { data: null, error: { code: "23505", message: "duplicate key value" } };
              }
              const payload = query.payload as { email?: string } | undefined;
              return {
                data: { id: payload?.email === "second@example.com" ? "66666666-6666-4666-8666-666666666666" : NEW_RECIPIENT_ID },
                error: null,
              };
            }
            return { data: null, error: null };
          },
        }),
      ),
    }));

    const { addSharedLinkRecipients } = await import("@/lib/publication/actions");
    return { addSharedLinkRecipients, recorded, sendEmail };
  }

  it("returns the inserted recipient id (and status 'sent') on a successful add", async () => {
    const { addSharedLinkRecipients, sendEmail } = await setupAdd({ duplicate: false });

    const result = await addSharedLinkRecipients({
      publicationId: PUBLICATION_ID,
      recipients: [{ email: "fresh@example.com" }],
      baseClientLink: "/share/client-token",
    });

    expect(sendEmail).toHaveBeenCalledTimes(1);
    expect(result.added).toBe(1);
    const entry = result.emailResults.find((r) => r.email === "fresh@example.com");
    expect(entry).toBeDefined();
    // The id flows back so a just-added chip can Resend/Remove server-side without a remount.
    expect(entry?.id).toBe(NEW_RECIPIENT_ID);
    expect(entry?.ok).toBe(true);
    expect(entry?.status).toBe("sent");
  });

  it("tags a duplicate (unique violation) as status 'duplicate', not a green success", async () => {
    const { addSharedLinkRecipients, sendEmail } = await setupAdd({ duplicate: true });

    const result = await addSharedLinkRecipients({
      publicationId: PUBLICATION_ID,
      recipients: [{ email: "already@example.com" }],
      baseClientLink: "/share/client-token",
    });

    // A duplicate is not a new add and never sends an email.
    expect(result.added).toBe(0);
    expect(sendEmail).not.toHaveBeenCalled();

    const entry = result.emailResults.find((r) => r.email === "already@example.com");
    expect(entry).toBeDefined();
    expect(entry?.status).toBe("duplicate");
    // ok stays true so the aggregate/added logic is unaffected, but the misleading
    // "already invited" error string no longer drives a green "sent" chip.
    expect(entry?.ok).toBe(true);
    expect(entry?.error).toBeUndefined();
    // Headline still reflects "no new recipients" for a pure-duplicate batch.
    expect(result.message).toMatch(/No new recipients added/i);
  });

  it("sends multiple new recipient invitations with bounded overlap instead of strict serial waits", async () => {
    const startedSends: string[] = [];
    let releaseFirstSend!: () => void;
    const firstSendGate = new Promise<void>((resolve) => {
      releaseFirstSend = resolve;
    });
    const sendEmail = vi.fn(async ({ to }: { to: string }) => {
      startedSends.push(to);
      if (to === "first@example.com") await firstSendGate;
      return { ok: true, messageId: `invite-${to}` };
    });
    const { addSharedLinkRecipients } = await setupAdd({ duplicate: false, sendEmail });

    const resultPromise = addSharedLinkRecipients({
      publicationId: PUBLICATION_ID,
      recipients: [{ email: "first@example.com" }, { email: "second@example.com" }],
      baseClientLink: "/share/client-token",
    });

    for (let attempts = 0; attempts < 10 && startedSends.length < 2; attempts += 1) {
      await new Promise((resolve) => setTimeout(resolve, 0));
    }
    expect(startedSends).toEqual(["first@example.com", "second@example.com"]);

    releaseFirstSend();
    const result = await resultPromise;

    expect(result.added).toBe(2);
    expect(sendEmail).toHaveBeenCalledTimes(2);
    expect(result.emailResults.filter((entry) => entry.status === "sent")).toHaveLength(2);
  });
});

// AC-MOD-20 (MOD-REC-08) — neither resend nor add may email a dead `/share/<uuid>` link. When the
// encrypted token can't be decrypted (clientLinkPath null) and no usable baseClientLink is passed,
// the old `|| \`/share/${publicationId}\`` fallback emailed a 404 URL. Both actions must now abort
// with a clear ok:false BEFORE sending or inserting.
describe("AC-MOD-20 dead-link abort: never email an unresolvable /share/<uuid> link", () => {
  // decryptPublicationToken throws → getPublicationProjectId swallows it → pubCtx.clientLinkPath is null.
  function mockSharedEnv(recorded: RecordedQuery[], sendEmail: ReturnType<typeof vi.fn>) {
    vi.doMock("@/lib/auth/session", () => ({
      requireAuth: vi.fn().mockResolvedValue(undefined),
      requireCurrentUserContext: vi.fn().mockResolvedValue({
        userId: "user-1",
        role: "ceo",
        email: "owner@example.com",
        displayName: "Owner One",
      }),
    }));
    vi.doMock("next/cache", () => ({ revalidatePath: vi.fn() }));
    vi.doMock("next/headers", () => ({
      headers: vi.fn().mockResolvedValue({ get: () => "203.0.113.1" }),
    }));
    vi.doMock("@/lib/email/transactional-email-client", () => ({
      sendEmail,
      readEmailDeliveryConfig: vi.fn(() => ({ configured: true })),
    }));
    vi.doMock("@/lib/publication/security", async () => {
      const actual = await vi.importActual<typeof import("@/lib/publication/security")>(
        "@/lib/publication/security",
      );
      return {
        ...actual,
        // Simulate a secret rotation: the stored encrypted_token can no longer be decrypted.
        decryptPublicationToken: vi.fn(() => {
          throw new Error("decrypt failed (rotated secret)");
        }),
      };
    });
    vi.doMock("@supabase/supabase-js", () => ({
      createClient: vi.fn(() =>
        makeAdminClient({
          recorded,
          resolveResult: (query) => {
            if (query.table === "project_publications" && query.operation === "select") {
              return {
                data: {
                  id: PUBLICATION_ID,
                  project_id: PROJECT_ID,
                  workspace_id: WORKSPACE_ID,
                  encrypted_token: "encrypted-cannot-decrypt",
                },
                error: null,
              };
            }
            if (query.table === "projects") {
              return {
                data: {
                  id: PROJECT_ID,
                  workspace_id: WORKSPACE_ID,
                  name: "Demo Project",
                  project_code: "P-1",
                  client_name: "Client",
                  location: "Site",
                  currency_code: "USD",
                  metadata: {},
                },
                error: null,
              };
            }
            if (query.table === "security_rate_limit_events") {
              if (query.operation === "select") return { data: null, error: null, count: 1 };
              return { data: null, error: null };
            }
            if (query.table === "shared_link_recipients" && query.operation === "select") {
              return {
                data: {
                  id: RECIPIENT_ID,
                  email: "client@example.com",
                  display_name: null,
                  email_unsubscribed_at: null,
                },
                error: null,
              };
            }
            return { data: null, error: null };
          },
        }),
      ),
    }));
  }

  it("resendSharedLinkRecipientEmail returns ok:false, sends nothing, and writes no recipient row", async () => {
    const recorded: RecordedQuery[] = [];
    const sendEmail = vi.fn().mockResolvedValue({ ok: true, messageId: "should-never-send" });
    mockSharedEnv(recorded, sendEmail);

    const { resendSharedLinkRecipientEmail } = await import("@/lib/publication/actions");
    // No baseClientLink passed → must fall back to clientLinkPath, which is null (decrypt threw).
    const result = await resendSharedLinkRecipientEmail({
      publicationId: PUBLICATION_ID,
      recipientId: RECIPIENT_ID,
    });

    expect(result.ok).toBe(false);
    expect(result.message).toMatch(/Could not resolve the shared link/i);
    // The dead link is never built and never sent.
    expect(sendEmail).not.toHaveBeenCalled();
    // No recipient write happened → the prior token/status are untouched.
    const recipientUpdates = recorded.filter(
      (q) => q.table === "shared_link_recipients" && q.operation === "update",
    );
    expect(recipientUpdates).toHaveLength(0);
  });

  it("rejects a bare-UUID baseClientLink (a stale /share/<uuid>) without sending", async () => {
    const recorded: RecordedQuery[] = [];
    const sendEmail = vi.fn().mockResolvedValue({ ok: true, messageId: "should-never-send" });
    mockSharedEnv(recorded, sendEmail);

    const { resendSharedLinkRecipientEmail } = await import("@/lib/publication/actions");
    const result = await resendSharedLinkRecipientEmail({
      publicationId: PUBLICATION_ID,
      recipientId: RECIPIENT_ID,
      // A path whose share token is a bare UUID can never resolve (it is not a token_hash).
      baseClientLink: `/share/${PUBLICATION_ID}`,
    });

    expect(result.ok).toBe(false);
    expect(sendEmail).not.toHaveBeenCalled();
  });

  it("addSharedLinkRecipients aborts the batch: no inserts, no sends, ok:false", async () => {
    const recorded: RecordedQuery[] = [];
    const sendEmail = vi.fn().mockResolvedValue({ ok: true, messageId: "should-never-send" });
    mockSharedEnv(recorded, sendEmail);

    const { addSharedLinkRecipients } = await import("@/lib/publication/actions");
    const result = await addSharedLinkRecipients({
      publicationId: PUBLICATION_ID,
      recipients: [{ email: "fresh@example.com" }],
      // no baseClientLink; clientLinkPath is null → unresolvable
    });

    expect(result.ok).toBe(false);
    expect(result.added).toBe(0);
    expect(result.message).toMatch(/Could not resolve the shared link/i);
    // No recipient rows inserted against a dead link.
    const recipientInserts = recorded.filter(
      (q) => q.table === "shared_link_recipients" && q.operation === "insert",
    );
    expect(recipientInserts).toHaveLength(0);
    // No email sent.
    expect(sendEmail).not.toHaveBeenCalled();
    // The affected recipient is surfaced as a failure.
    const entry = result.emailResults.find((r) => r.email === "fresh@example.com");
    expect(entry).toBeDefined();
    expect(entry?.ok).toBe(false);
    expect(entry?.status).toBe("failed");
    expect(result.failedEmails).toContain("fresh@example.com");
  });

  it("still sends when a usable baseClientLink is provided (guards the abort tests)", async () => {
    const recorded: RecordedQuery[] = [];
    const sendEmail = vi.fn().mockResolvedValue({ ok: true, messageId: "resend-message-1" });
    mockSharedEnv(recorded, sendEmail);

    const { resendSharedLinkRecipientEmail } = await import("@/lib/publication/actions");
    const result = await resendSharedLinkRecipientEmail({
      publicationId: PUBLICATION_ID,
      recipientId: RECIPIENT_ID,
      // A real (non-UUID) share token resolves fine → the abort must NOT fire.
      baseClientLink: "/share/real-client-token",
    });

    expect(result.ok).toBe(true);
    expect(sendEmail).toHaveBeenCalledTimes(1);
  });
});
