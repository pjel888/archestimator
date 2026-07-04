import { beforeEach, describe, expect, it, vi } from "vitest";

// AC-MOD-18 (MOD-SHEET-05 / MOD-SHEET-06): behavioral tests for the publication actions.
// These exercise the real create/republish code paths against a mocked Supabase admin client to
// prove that (a) the PERSISTED `selected_estimate_ids` are the RESOLVED ids actually present in the
// snapshot — not the requested array — so the stored count can never drift past deleted sheets, and
// (b) a project that resolves to ZERO estimates is rejected (ok:false) and writes nothing.

const PROJECT_ID = "11111111-1111-4111-8111-111111111111";
const WORKSPACE_ID = "22222222-2222-4222-8222-222222222222";
const EST_A = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const EST_B = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const EST_DELETED = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";

const mocks = vi.hoisted(() => ({
  requireAuth: vi.fn(),
  requireCurrentUserContext: vi.fn(),
  createPublicationAdminD1Client: vi.fn(),
}));

vi.mock("@/lib/auth/session", () => ({
  requireAuth: mocks.requireAuth,
  requireCurrentUserContext: mocks.requireCurrentUserContext,
}));

vi.mock("@/lib/publication/admin-d1-client", () => ({
  createPublicationAdminD1Client: mocks.createPublicationAdminD1Client,
}));

vi.mock("@/lib/auth/account-audit", () => ({
  recordAccountSecurityEvent: vi.fn(),
}));

// Security: keep real token/hash crypto, but stub the env-secret readers so the actions can run
// without real secrets configured in the test environment.
vi.mock("@/lib/publication/security", async () => {
  const actual = await vi.importActual<typeof import("@/lib/publication/security")>(
    "@/lib/publication/security",
  );
  return {
    ...actual,
    readPublicationTokenHashSecret: () => "test-hash-secret",
    readPublicationTokenEncryptionSecret: () => "test-encryption-secret-0123456789",
  };
});

// next/cache revalidatePath is a no-op in this unit context.
vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

import {
  createProjectPublication,
  republishProjectPublication,
} from "@/lib/publication/actions";
import {
  encryptPublicationToken,
  readPublicationTokenEncryptionSecret,
} from "@/lib/publication/security";

// A real encrypted token so republish's readClientLinkPath(latest) can decrypt it (it is built with
// the same test encryption secret the security mock returns).
const VALID_ENCRYPTED_TOKEN = encryptPublicationToken(
  "live-share-token",
  readPublicationTokenEncryptionSecret(),
);

type Insert = Record<string, unknown>;
type Update = Record<string, unknown>;

type CapturedWrites = {
  inserts: Insert[];
  rpcs: Array<{ args: Record<string, unknown>; functionName: string }>;
  updates: Update[];
};

/**
 * Build a Supabase admin-client mock for the publication action paths.
 *
 * @param estimateRowsForSnapshot the estimate rows the `estimates` table read in
 *   buildSnapshotForProject resolves to (this is what determines the snapshot's resolved set —
 *   simulate a deleted sheet by simply omitting it here even if it was "requested").
 * @param latestPublication the row readLatestProjectPublication returns (null = no live link).
 */
function createAdminMock({
  estimateRowsForSnapshot,
  latestPublication,
  captured,
}: {
  estimateRowsForSnapshot: Array<{ id: string; name: string; sheet_code: string | null; updated_at: string }>;
  latestPublication: Record<string, unknown> | null;
  captured: CapturedWrites;
}) {
  function projectsBuilder() {
    const builder: Record<string, unknown> = {};
    builder.select = vi.fn(() => builder);
    builder.eq = vi.fn(() => builder);
    builder.maybeSingle = vi.fn(async () => ({
      data: {
        id: PROJECT_ID,
        workspace_id: WORKSPACE_ID,
        name: "Test Project",
        project_code: "TP-1",
        client_name: "Client",
        location: "Location",
        currency_code: "PHP",
        metadata: {},
      },
      error: null,
    }));
    return builder;
  }

  function publicationsReadBuilder() {
    // readLatestProjectPublication: .select().eq().eq().order().limit().maybeSingle()
    const builder: Record<string, unknown> = {};
    builder.select = vi.fn(() => builder);
    builder.eq = vi.fn(() => builder);
    builder.order = vi.fn(() => builder);
    builder.limit = vi.fn(() => builder);
    builder.maybeSingle = vi.fn(async () => ({ data: latestPublication, error: null }));
    return builder;
  }

  function estimatesReadBuilder() {
    // buildSnapshotForProject: .select().eq().order() builds the query, THEN optionally .in("id", …)
    // is chained, and the builder itself is awaited. So every chain method returns the builder and
    // the builder is a thenable resolving to the rows.
    const result = { data: estimateRowsForSnapshot, error: null };
    const builder: Record<string, unknown> = {};
    builder.select = vi.fn(() => builder);
    builder.eq = vi.fn(() => builder);
    builder.in = vi.fn(() => builder);
    builder.order = vi.fn(() => builder);
    (builder as { then: unknown }).then = (resolve: (v: typeof result) => void) => resolve(result);
    return builder;
  }

  function emptyChildReadBuilder() {
    // estimate_row_items / estimate_nodes / estimate_tabs reads — chainable, awaitable, resolve [].
    const result = { data: [], error: null };
    const builder: Record<string, unknown> = {};
    builder.select = vi.fn(() => builder);
    builder.eq = vi.fn(() => builder);
    builder.in = vi.fn(() => builder);
    builder.is = vi.fn(() => builder);
    builder.order = vi.fn(() => builder);
    (builder as { then: unknown }).then = (resolve: (v: typeof result) => void) => resolve(result);
    return builder;
  }

  function publicationsWriteBuilder() {
    const builder: Record<string, unknown> = {};
    builder.insert = vi.fn((row: Insert) => {
      captured.inserts.push(row);
      return Promise.resolve({ error: null });
    });
    builder.update = vi.fn((row: Update) => {
      captured.updates.push(row);
      // .update().eq()... resolves; support both create's revoke chain and republish's update chain.
      const chain: Record<string, unknown> = {};
      chain.eq = vi.fn(() => chain);
      // create's revoke chain is awaited after two .eq(); make the builder awaitable.
      (chain as { then?: unknown }).then = (resolve: (v: { error: null }) => void) =>
        resolve({ error: null });
      return chain;
    });
    return builder;
  }

  let publicationCall = 0;
  return {
    callProcedure: vi.fn((functionName: string, args: Record<string, unknown>) => {
      captured.rpcs.push({ args, functionName });
      return Promise.resolve({ data: "publication-id", error: null });
    }),
    from: vi.fn((table: string) => {
      if (table === "projects") return projectsBuilder();
      if (table === "estimates") return estimatesReadBuilder();
      if (table === "estimate_row_items" || table === "estimate_nodes" || table === "estimate_tabs") {
        return emptyChildReadBuilder();
      }
      if (table === "project_publications") {
        // First call in each action is the READ (readLatestProjectPublication). Subsequent calls are
        // the revoke .update() and the insert/update write.
        publicationCall += 1;
        if (publicationCall === 1) return publicationsReadBuilder();
        return publicationsWriteBuilder();
      }
      throw new Error(`Unexpected table read in test mock: ${table}`);
    }),
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  // Manager via global role short-circuit (ceo) — skips workspace/project membership reads.
  const ownerContext = {
    userId: "user-1",
    email: "owner@example.com",
    role: "ceo",
    displayName: "Owner",
  };
  mocks.requireAuth.mockResolvedValue(ownerContext);
  mocks.requireCurrentUserContext.mockResolvedValue(ownerContext);
});

describe("createProjectPublication — resolved selected_estimate_ids (MOD-SHEET-06 / MOD-SHEET-05)", () => {
  it("persists only the estimate ids that actually resolved into the snapshot, dropping deleted sheets", async () => {
    const captured: CapturedWrites = { inserts: [], rpcs: [], updates: [] };
    // Requested A, B, and a since-deleted sheet — but the snapshot read only resolves A and B.
    mocks.createPublicationAdminD1Client.mockReturnValue(
      createAdminMock({
        estimateRowsForSnapshot: [
          { id: EST_A, name: "Foundation", sheet_code: "S-100", updated_at: "2026-06-01T00:00:00.000Z" },
          { id: EST_B, name: "Framing", sheet_code: "S-200", updated_at: "2026-06-01T00:00:00.000Z" },
        ],
        latestPublication: null,
        captured,
      }),
    );

    const result = await createProjectPublication({
      projectId: PROJECT_ID,
      selectedEstimateIds: [EST_A, EST_B, EST_DELETED],
    });

    expect(result.ok).toBe(true);
    expect(captured.inserts).toHaveLength(0);
    expect(captured.rpcs).toHaveLength(1);
    expect(captured.rpcs[0]?.functionName).toBe("replace_project_publication");
    const rpcArgs = captured.rpcs[0]?.args as { p_selected_estimate_ids: string[] };
    // Non-vacuous: the requested array had 3 ids incl. a deleted one; the stored set is exactly the
    // 2 ids present in the snapshot (no EST_DELETED), so count can't exceed the snapshot's estimates.
    expect(rpcArgs.p_selected_estimate_ids).toEqual([EST_A, EST_B]);
    expect(rpcArgs.p_selected_estimate_ids).not.toContain(EST_DELETED);
    expect(rpcArgs.p_selected_estimate_ids).toHaveLength(2);
  });

  it("rejects publishing a project that resolves to zero estimates and writes nothing", async () => {
    const captured: CapturedWrites = { inserts: [], rpcs: [], updates: [] };
    mocks.createPublicationAdminD1Client.mockReturnValue(
      createAdminMock({
        estimateRowsForSnapshot: [], // nothing resolves — e.g. all requested sheets were deleted
        latestPublication: null,
        captured,
      }),
    );

    const result = await createProjectPublication({
      projectId: PROJECT_ID,
      selectedEstimateIds: [EST_DELETED],
    });

    expect(result.ok).toBe(false);
    expect(result.message).toBe("Select at least one estimate to publish.");
    // Nothing persisted: no insert AND no revoke-update of the prior live link.
    expect(captured.inserts).toHaveLength(0);
    expect(captured.rpcs).toHaveLength(0);
    expect(captured.updates).toHaveLength(0);
  });
});

describe("republishProjectPublication — resolved selected_estimate_ids (MOD-SHEET-06 / MOD-SHEET-05)", () => {
  it("persists the resolved ids present in the rebuilt snapshot, not the requested array", async () => {
    const captured: CapturedWrites = { inserts: [], rpcs: [], updates: [] };
    mocks.createPublicationAdminD1Client.mockReturnValue(
      createAdminMock({
        estimateRowsForSnapshot: [
          { id: EST_A, name: "Foundation", sheet_code: "S-100", updated_at: "2026-06-01T00:00:00.000Z" },
        ],
        latestPublication: {
          id: "pub-1",
          encrypted_token: VALID_ENCRYPTED_TOKEN,
          expires_at: null,
          password_hash: null,
          selected_estimate_ids: [EST_A, EST_B],
          snapshot_version: 4,
        },
        captured,
      }),
    );

    const result = await republishProjectPublication({
      projectId: PROJECT_ID,
      selectedEstimateIds: [EST_A, EST_DELETED],
    });

    expect(result.ok).toBe(true);
    // republish issues exactly one update (the publication row).
    expect(captured.updates).toHaveLength(1);
    const updated = captured.updates[0] as { selected_estimate_ids: string[] };
    // Non-vacuous: requested [A, deleted]; only A resolves in the snapshot → stored set is [A].
    expect(updated.selected_estimate_ids).toEqual([EST_A]);
    expect(updated.selected_estimate_ids).not.toContain(EST_DELETED);
  });

  it("rejects republishing into a zero-estimate snapshot and writes nothing", async () => {
    const captured: CapturedWrites = { inserts: [], rpcs: [], updates: [] };
    mocks.createPublicationAdminD1Client.mockReturnValue(
      createAdminMock({
        estimateRowsForSnapshot: [],
        latestPublication: {
          id: "pub-1",
          encrypted_token: VALID_ENCRYPTED_TOKEN,
          expires_at: null,
          password_hash: null,
          selected_estimate_ids: [EST_DELETED],
          snapshot_version: 4,
        },
        captured,
      }),
    );

    const result = await republishProjectPublication({
      projectId: PROJECT_ID,
      selectedEstimateIds: [EST_DELETED],
    });

    expect(result.ok).toBe(false);
    expect(result.message).toBe("Select at least one estimate to publish.");
    expect(captured.updates).toHaveLength(0);
    expect(captured.inserts).toHaveLength(0);
  });
});
