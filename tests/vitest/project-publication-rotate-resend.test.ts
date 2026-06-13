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
  resolveResult,
}: {
  recorded: RecordedQuery[];
  resolveResult: (query: RecordedQuery) => { data: unknown; error: unknown; count?: number };
}) {
  function from(table: string) {
    const query: RecordedQuery = { table, operation: "none", filters: [] };
    recorded.push(query);

    const terminalResult = () => resolveResult(query);

    const builder: Record<string, unknown> = {
      select(_columns?: string, _opts?: unknown) {
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

  return { from, rpc: vi.fn().mockResolvedValue({ data: null, error: null }) };
}

function findFilter(query: RecordedQuery, column: string) {
  return query.filters.find((filter) => filter.column === column);
}

afterEach(() => {
  vi.doUnmock("@supabase/supabase-js");
  vi.doUnmock("@/lib/auth/session");
  vi.doUnmock("next/cache");
  vi.doUnmock("next/headers");
  vi.doUnmock("@/lib/email/resend-client");
  vi.doUnmock("@/lib/publication/snapshot");
  vi.resetModules();
});

beforeEach(() => {
  setRequiredEnv();
  vi.resetModules();
});

describe("AC-MOD-02 rotateProjectPublicationLink rotates the token in place", () => {
  it("issues a single UPDATE on the existing publication row, never an INSERT or a revoke", async () => {
    const recorded: RecordedQuery[] = [];

    vi.doMock("@/lib/auth/session", () => ({
      requireCurrentUserContext: vi.fn().mockResolvedValue({
        userId: "user-1",
        role: "ceo",
        email: "owner@example.com",
        displayName: "Owner One",
      }),
    }));
    vi.doMock("next/cache", () => ({ revalidatePath: vi.fn() }));
    vi.doMock("@/lib/publication/snapshot", () => ({
      buildProjectPublicationSnapshot: vi.fn(() => ({ generatedAt: "2026-06-13T00:00:00.000Z" })),
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

    // No INSERT of a brand-new publication row.
    expect(publicationWrites.some((query) => query.operation === "insert")).toBe(false);

    // Exactly one UPDATE, and it targets the existing row id (not a project_id+status revoke sweep).
    const updates = publicationWrites.filter((query) => query.operation === "update");
    expect(updates).toHaveLength(1);
    const update = updates[0];
    expect(findFilter(update, "id")?.value).toBe(PUBLICATION_ID);

    const payload = update.payload as Record<string, unknown>;
    // Token rotated in place.
    expect(payload).toHaveProperty("token_hash");
    expect(payload).toHaveProperty("encrypted_token");
    expect(payload.snapshot_version).toBe(4);
    // Password carried forward on the default (no-password, no-clear) path.
    expect(payload.password_hash).toBe("existing-password-hash");
    // The row must NOT be revoked anywhere in the rotation.
    expect(payload.status).not.toBe("revoked");
    expect(
      recorded.some(
        (query) =>
          query.table === "project_publications" &&
          query.operation === "update" &&
          (query.payload as Record<string, unknown> | undefined)?.status === "revoked",
      ),
    ).toBe(false);
  });
});

describe("AC-MOD-03 resendSharedLinkRecipientEmail sends before persisting", () => {
  async function setupResend({ sendOk }: { sendOk: boolean }) {
    const recorded: RecordedQuery[] = [];

    vi.doMock("@/lib/auth/session", () => ({
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
    vi.doMock("@/lib/email/resend-client", () => ({
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
          resolveResult: (query) => {
            if (query.table === "shared_link_recipients" && query.operation === "update") {
              callOrder.push("recipient-update");
            }
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
    return { resendSharedLinkRecipientEmail, recorded, sendEmail, callOrder };
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
    const { resendSharedLinkRecipientEmail, recorded, sendEmail, callOrder } = await setupResend({ sendOk: true });

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
    // Exactly one update, after the send.
    expect(recipientUpdates).toHaveLength(1);
    expect(callOrder).toEqual(["send", "recipient-update"]);

    const payload = recipientUpdates[0].payload as Record<string, unknown>;
    expect(payload).toHaveProperty("recipient_token_hash");
    expect(typeof payload.recipient_token_hash).toBe("string");
    expect(payload.delivery_status).toBe("sent");
    expect(payload.resend_email_id).toBe("resend-message-1");
    expect(payload.invited_by).toBe("user-1");
    // Never writes a transient "pending" state anymore.
    expect(payload.delivery_status).not.toBe("pending");
  });
});
