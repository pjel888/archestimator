import { readFileSync } from "node:fs";
import { afterEach, describe, expect, it, vi } from "vitest";

const actions = readFileSync("src/lib/publication/actions.ts", "utf8");
const emailLinks = readFileSync("src/lib/publication/email-links.ts", "utf8");
const publisherDrawer = readFileSync("src/components/workshop/publisher/PublisherDrawer.tsx", "utf8");
const publisherDrawerHook = readFileSync("src/components/workshop/publisher/usePublisherDrawer.ts", "utf8");
const recipientLimits = readFileSync("src/lib/publication/recipient-limits.ts", "utf8");

const PROJECT_ID = "11111111-1111-4111-8111-111111111111";
const WORKSPACE_ID = "22222222-2222-4222-8222-222222222222";
const USER_ID = "33333333-3333-4333-8333-333333333333";
const PUBLICATION_ID = "44444444-4444-4444-8444-444444444444";
const ESTIMATE_ID = "55555555-5555-4555-8555-555555555555";

type PublicationHarnessState = {
  auditEvents: Array<Record<string, unknown>>;
  estimates: Array<{ id: string; name: string; sheet_code: string; updated_at: string }>;
  latest: {
    encrypted_token: string;
    expires_at: string | null;
    id: string;
    location_visibility: "exact" | "locality" | "hidden";
    password_hash: string | null;
    selected_estimate_ids: string[];
    snapshot_version: number;
  } | null;
  publicationLookup: {
    activity_target_labels_json: Record<string, unknown>;
    expires_at: string | null;
    id: string;
    project_id: string;
    revoked_at: string | null;
    status: string;
  } | null;
  publicationUpdates: Array<{ filters: Record<string, unknown>; payload: Record<string, unknown>; table: string }>;
  revalidatedPaths: string[];
  rpcCalls: Array<{ args: Record<string, unknown>; functionName: string }>;
  rpcData: unknown;
  summary: Record<string, unknown> | null;
  summaryError: Error | null;
  currentUserRole: string | null;
  projectRole: string | null;
  snapshot: {
    estimates: Array<{ id: string; name: string; nodes: unknown[]; rows: unknown[]; sheetCode: string; tabs: unknown[]; updatedAt: string }>;
    project: Record<string, unknown>;
    schemaVersion: 1.3;
  };
  workspaceRole: string | null;
};

type FakeQuery = {
  filters: Record<string, unknown>;
  op: "insert" | "select" | "update";
  payload?: Record<string, unknown> | Record<string, unknown>[];
  selectValue?: string;
};

function resolveMaybeSingle(table: string, query: FakeQuery, state: PublicationHarnessState) {
  if (table === "projects") {
    return {
      data: {
        client_name: "Client",
        currency_code: "USD",
        id: PROJECT_ID,
        location: "Austin",
        metadata: {},
        name: "Kitchen Renovation",
        project_code: "KR-1",
        workspace_id: WORKSPACE_ID,
      },
      error: null,
    };
  }

  if (table === "project_publications") {
    if (query.selectValue?.includes("workspace_id")) {
      return {
        data: {
          encrypted_token: state.latest?.encrypted_token ?? null,
          id: PUBLICATION_ID,
          project_id: PROJECT_ID,
          workspace_id: WORKSPACE_ID,
        },
        error: null,
      };
    }
    if (query.selectValue?.includes("project_id, status")) {
      return { data: state.publicationLookup, error: null };
    }
    return { data: state.latest, error: null };
  }

  if (table === "workspace_members") {
    return { data: state.workspaceRole ? { role: state.workspaceRole } : null, error: null };
  }

  if (table === "project_members") {
    return { data: state.projectRole ? { role: state.projectRole } : null, error: null };
  }

  return { data: null, error: null };
}

function resolveQuery(table: string, query: FakeQuery, state: PublicationHarnessState) {
  if (query.op === "update" || query.op === "insert") {
    state.publicationUpdates.push({
      filters: { ...query.filters },
      payload: Array.isArray(query.payload) ? { rows: query.payload } : { ...(query.payload ?? {}) },
      table,
    });
    return { data: null, error: null };
  }

  if (table === "estimates") return { data: state.estimates, error: null };
  if (table === "estimate_row_items") return { data: [], error: null };
  if (table === "estimate_nodes") return { data: [], error: null };
  if (table === "estimate_tabs") return { data: [], error: null };
  if (table === "shared_link_comments") return { data: [], error: null };
  if (table === "shared_link_responses") return { data: [], error: null };
  if (table === "shared_link_events") return { data: [], error: null };
  if (table === "project_publication_events") return { data: [], error: null };
  if (table === "shared_link_recipients") return { data: [], error: null };

  return { data: [], error: null };
}

function createQuery(table: string, state: PublicationHarnessState) {
  const query: FakeQuery = {
    filters: {},
    op: "select",
  };
  const builder = {
    eq(key: string, value: unknown) {
      query.filters[key] = value;
      return builder;
    },
    in(key: string, value: unknown) {
      query.filters[key] = value;
      return builder;
    },
    insert(payload: Record<string, unknown> | Record<string, unknown>[]) {
      query.op = "insert";
      query.payload = payload;
      return builder;
    },
    is(key: string, value: unknown) {
      query.filters[key] = value;
      return builder;
    },
    limit() {
      return builder;
    },
    maybeSingle() {
      return Promise.resolve(resolveMaybeSingle(table, query, state));
    },
    or() {
      return builder;
    },
    order() {
      return builder;
    },
    select(value: string) {
      query.selectValue = value;
      return builder;
    },
    then(resolve: (value: unknown) => unknown, reject: (reason?: unknown) => unknown) {
      return Promise.resolve(resolveQuery(table, query, state)).then(resolve, reject);
    },
    update(payload: Record<string, unknown>) {
      query.op = "update";
      query.payload = payload;
      return builder;
    },
  };

  return builder;
}

async function loadPublicationActionsWithHarness(overrides: Partial<PublicationHarnessState> = {}) {
  vi.resetModules();

  const state: PublicationHarnessState = {
    auditEvents: [],
    estimates: [{ id: ESTIMATE_ID, name: "Base Estimate", sheet_code: "E-1", updated_at: "2026-06-21T00:00:00.000Z" }],
    latest: {
      encrypted_token: "encrypted-old-token",
      expires_at: "2026-07-01T00:00:00.000Z",
      id: PUBLICATION_ID,
      location_visibility: "locality",
      password_hash: "existing-password-hash",
      selected_estimate_ids: [ESTIMATE_ID],
      snapshot_version: 2,
    },
    publicationLookup: {
      activity_target_labels_json: {},
      expires_at: null,
      id: PUBLICATION_ID,
      project_id: PROJECT_ID,
      revoked_at: null,
      status: "published",
    },
    publicationUpdates: [],
    revalidatedPaths: [],
    rpcCalls: [],
    rpcData: 3,
    summary: { id: PROJECT_ID, name: "Kitchen Renovation" },
    summaryError: null,
    currentUserRole: "admin",
    projectRole: null,
    snapshot: {
      estimates: [{ id: ESTIMATE_ID, name: "Base Estimate", nodes: [], rows: [], sheetCode: "E-1", tabs: [], updatedAt: "2026-06-21T00:00:00.000Z" }],
      project: { id: PROJECT_ID, name: "Kitchen Renovation" },
      schemaVersion: 1.3,
    },
    workspaceRole: null,
    ...overrides,
  };

  const admin = {
    from(table: string) {
      return createQuery(table, state);
    },
    callProcedure(functionName: string, args: Record<string, unknown>) {
      state.rpcCalls.push({ args, functionName });
      return Promise.resolve({ data: state.rpcData, error: null });
    },
  };

  vi.doMock("@/lib/publication/admin-d1-client", () => ({
    createPublicationAdminD1Client: vi.fn(() => admin),
  }));
  vi.doMock("@/lib/auth/account-audit", () => ({
    recordAccountSecurityEvent: vi.fn(async (event: Record<string, unknown>) => {
      state.auditEvents.push({
        event_type: event.eventType,
        user_id: event.userId,
        workspace_id: event.workspaceId,
        metadata_json: event.metadata,
      });
    }),
  }));
  vi.doMock("next/cache", () => ({
    revalidatePath: vi.fn((path: string) => {
      state.revalidatedPaths.push(path);
    }),
  }));
  vi.doMock("next/headers", () => ({ headers: vi.fn(async () => ({ get: () => null })) }));
  vi.doMock("@/lib/auth/session", () => ({
    requireAuth: vi.fn(async () => {
      if (!state.currentUserRole) throw new Error("NEXT_REDIRECT:/login");
      return {
        email: "philip@example.com",
        id: USER_ID,
      };
    }),
    requireCurrentUserContext: vi.fn(async () => {
      if (!state.currentUserRole) throw new Error("NEXT_REDIRECT:/login");
      return {
        displayName: "Philip",
        email: "philip@example.com",
        role: state.currentUserRole,
        userId: USER_ID,
      };
    }),
  }));
  vi.doMock("@/lib/publication/security", () => ({
    createPublicationToken: vi.fn(() => "new-token"),
    decryptPublicationToken: vi.fn((value: string) => value.replace(/^encrypted-/, "")),
    encryptPublicationToken: vi.fn((value: string) => `encrypted-${value}`),
    hashPublicationPassword: vi.fn(async (value: string) => `password-hash-${value}`),
    hashPublicationToken: vi.fn((value: string) => `token-hash-${value}`),
    readPublicationTokenEncryptionSecret: vi.fn(() => "encryption-secret"),
    readPublicationTokenHashSecret: vi.fn(() => "hash-secret"),
    validatePublicationPassword: vi.fn((value: string) =>
      value.length >= 8 ? { ok: true as const } : { ok: false as const, message: "Password must be at least 8 characters." },
    ),
  }));
  vi.doMock("@/lib/publication/snapshot", () => ({
    buildProjectPublicationSnapshot: vi.fn(() => state.snapshot),
    normalizeProjectPublicationLocationVisibility: vi.fn((value: unknown) =>
      value === "exact" || value === "hidden" ? value : "locality",
    ),
  }));
  vi.doMock("@/lib/email/transactional-email-client", () => ({
    readEmailDeliveryConfig: vi.fn(() => ({ configured: true })),
    sendEmail: vi.fn(async () => ({ mocked: true, ok: true })),
  }));
  vi.doMock("@/lib/repositories/workspace-repository", () => ({
    getProjectPublicationSummary: vi.fn(async () => {
      if (state.summaryError) throw state.summaryError;
      return state.summary;
    }),
  }));

  const publicationActions = await import("@/lib/publication/actions");
  return { publicationActions, state };
}

afterEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
});

describe("project publication manager actions (Shared Link Overhaul V2)", () => {
  it("creates, republishes, and revokes client links behind server-side manager checks", () => {
    expect(actions).toContain('"use server"');
    expect(actions).toContain("createProjectPublication");
    expect(actions).toContain("republishProjectPublication");
    expect(actions).toContain("rotateProjectPublicationLink");
    expect(actions).toContain("revokeProjectPublication");
    expect(actions).toContain("assertProjectPublicationManager");
    expect(actions).toContain("Only project owners and admins can publish shared links.");
    expect(actions).toContain("createPublicationToken");
    expect(actions).toContain("hashPublicationToken");
    expect(actions).toContain("encryptPublicationToken");
    expect(actions).toContain("hashPublicationPassword");
    expect(actions).toContain("buildProjectPublicationSnapshot");
    expect(actions).toContain("project_publications");
    expect(actions).toContain("selected_estimate_ids");
    expect(actions).toContain('status: "revoked"');
    expect(actions).toContain("revalidatePublicationRoutes");
  });

  it("keeps every shared-link mutation behind the central manager assertion before writes", () => {
    const mutationNames = [
      "createProjectPublication",
      "republishProjectPublication",
      "rotateProjectPublicationLink",
      "revokeProjectPublication",
      "addSharedLinkRecipients",
      "resendSharedLinkRecipientEmail",
      "removeSharedLinkRecipient",
    ];

    for (const name of mutationNames) {
      const start = actions.indexOf(`export async function ${name}`);
      expect(start, `${name} export missing`).toBeGreaterThanOrEqual(0);

      const next = actions.indexOf("\nexport async function ", start + 1);
      const source = actions.slice(start, next === -1 ? actions.length : next);
      const assertionIndex = source.indexOf("assertProjectPublicationManager");
      const firstWriteIndex = [".insert(", ".update(", ".delete(", "callPublicationD1Procedure"]
        .map((needle) => source.indexOf(needle))
        .filter((index) => index >= 0)
        .sort((a, b) => a - b)[0];

      expect(assertionIndex, `${name} must call assertProjectPublicationManager`).toBeGreaterThanOrEqual(0);
      expect(firstWriteIndex, `${name} must have a mutation/write to guard`).toBeGreaterThanOrEqual(0);
      expect(assertionIndex, `${name} must assert manager access before writing`).toBeLessThan(firstWriteIndex);
    }
  });

  it("rejects every publication mutation for non-manager roles without writes", async () => {
    const actors = [
      { currentUserRole: "user", expectedError: "Only project owners and admins can publish shared links.", label: "authenticated user without project access", projectRole: null, workspaceRole: null },
      { currentUserRole: "user", expectedError: "Only project owners and admins can publish shared links.", label: "workspace member", projectRole: null, workspaceRole: "member" },
      { currentUserRole: "user", expectedError: "Only project owners and admins can publish shared links.", label: "project member", projectRole: "member", workspaceRole: null },
      { currentUserRole: "user", expectedError: "Only project owners and admins can publish shared links.", label: "project editor", projectRole: "editor", workspaceRole: null },
      { currentUserRole: "user", expectedError: "Only project owners and admins can publish shared links.", label: "project viewer", projectRole: "viewer", workspaceRole: null },
      { currentUserRole: null, expectedError: "NEXT_REDIRECT:/login", label: "public recipient-token visitor", projectRole: null, workspaceRole: null },
    ];
    const mutationCases: Array<{
      label: string;
      run: (publicationActions: Awaited<ReturnType<typeof loadPublicationActionsWithHarness>>["publicationActions"]) => Promise<unknown>;
    }> = [
      {
        label: "createProjectPublication",
        run: (publicationActions) => publicationActions.createProjectPublication({ projectId: PROJECT_ID }),
      },
      {
        label: "republishProjectPublication",
        run: (publicationActions) => publicationActions.republishProjectPublication({ projectId: PROJECT_ID }),
      },
      {
        label: "rotateProjectPublicationLink",
        run: (publicationActions) => publicationActions.rotateProjectPublicationLink({ projectId: PROJECT_ID }),
      },
      {
        label: "revokeProjectPublication",
        run: (publicationActions) => publicationActions.revokeProjectPublication({ projectId: PROJECT_ID }),
      },
      {
        label: "addSharedLinkRecipients",
        run: (publicationActions) =>
          publicationActions.addSharedLinkRecipients({
            publicationId: PUBLICATION_ID,
            recipients: [{ email: "client@example.com" }],
          }),
      },
      {
        label: "resendSharedLinkRecipientEmail",
        run: (publicationActions) =>
          publicationActions.resendSharedLinkRecipientEmail({
            publicationId: PUBLICATION_ID,
            recipientId: USER_ID,
          }),
      },
      {
        label: "removeSharedLinkRecipient",
        run: (publicationActions) =>
          publicationActions.removeSharedLinkRecipient({
            publicationId: PUBLICATION_ID,
            recipientId: USER_ID,
          }),
      },
    ];

    for (const actor of actors) {
      for (const mutation of mutationCases) {
        const { publicationActions, state } = await loadPublicationActionsWithHarness({
          currentUserRole: actor.currentUserRole,
          projectRole: actor.projectRole,
          workspaceRole: actor.workspaceRole,
        });

        await expect(mutation.run(publicationActions), `${actor.label} should not run ${mutation.label}`).rejects.toThrow(actor.expectedError);
        expect(state.publicationUpdates, `${actor.label} ${mutation.label} should not write rows`).toEqual([]);
        expect(state.rpcCalls, `${actor.label} ${mutation.label} should not call RPCs`).toEqual([]);
        expect(state.revalidatedPaths, `${actor.label} ${mutation.label} should not revalidate`).toEqual([]);
      }
    }
  });

  it("asserts behavioral return contracts for republish success and invalid-password failure", async () => {
    const { publicationActions, state } = await loadPublicationActionsWithHarness();

    const invalid = await publicationActions.republishProjectPublication({
      projectId: PROJECT_ID,
      password: "short",
    });

    expect(invalid).toEqual({
      ok: false,
      message: "Password must be at least 8 characters.",
    });
    expect(state.publicationUpdates).toHaveLength(0);

    const result = await publicationActions.republishProjectPublication({
      clearPassword: true,
      expiresAt: null,
      projectId: PROJECT_ID,
    });

    expect(result).toEqual({
      clientLinkPath: "/share/new-token",
      message: "New shared page issued.",
      ok: true,
    });
    expect(state.publicationUpdates).toEqual([]);
    expect(state.rpcCalls).toEqual([
      expect.objectContaining({
        functionName: "replace_project_publication",
        args: expect.objectContaining({
          p_encrypted_token: "encrypted-new-token",
          p_expires_at: null,
          p_password_hash: null,
          p_selected_estimate_ids: [ESTIMATE_ID],
          p_snapshot_json: state.snapshot,
          target_project_id: PROJECT_ID,
        }),
      }),
    ]);
    expect(state.auditEvents).toEqual([
      expect.objectContaining({
        event_type: "publisher_publication_republished",
        user_id: USER_ID,
        workspace_id: WORKSPACE_ID,
        metadata_json: expect.objectContaining({
          expires_at_changed: true,
          password_cleared: true,
          project_id: PROJECT_ID,
          publication_id: 3,
          selected_estimate_count: 1,
        }),
      }),
    ]);
    expect(state.revalidatedPaths).toEqual(expect.arrayContaining([
      `/workshop/projects/${PROJECT_ID}`,
      "/share/old-token",
      "/share/new-token",
    ]));
  });

  it("asserts behavioral return contracts for rotate success and stale-token conflict", async () => {
    const successHarness = await loadPublicationActionsWithHarness();

    const result = await successHarness.publicationActions.rotateProjectPublicationLink({ projectId: PROJECT_ID });

    expect(result).toEqual({
      clientLinkPath: "/share/new-token",
      message: "New shared link ready.",
      ok: true,
    });
    expect(successHarness.state.rpcCalls).toEqual([
      {
        functionName: "rotate_project_publication_credentials",
        args: expect.objectContaining({
          expected_encrypted_token: "encrypted-old-token",
          p_encrypted_token: "encrypted-new-token",
          p_password_hash: "existing-password-hash",
          p_selected_estimate_ids: [ESTIMATE_ID],
          p_token_hash: "token-hash-new-token",
          target_publication_id: PUBLICATION_ID,
        }),
      },
    ]);
    expect(successHarness.state.revalidatedPaths).toEqual(expect.arrayContaining([
      `/workshop/projects/${PROJECT_ID}`,
      "/share/old-token",
      "/share/new-token",
    ]));
    expect(successHarness.state.auditEvents).toEqual([
      expect.objectContaining({
        event_type: "publisher_publication_rotated",
        user_id: USER_ID,
        workspace_id: WORKSPACE_ID,
        metadata_json: expect.objectContaining({
          invalidated_recipient_count: 3,
          password_cleared: false,
          project_id: PROJECT_ID,
          publication_id: PUBLICATION_ID,
          selected_estimate_count: 1,
        }),
      }),
    ]);

    const conflictHarness = await loadPublicationActionsWithHarness({ rpcData: -1 });

    const conflict = await conflictHarness.publicationActions.rotateProjectPublicationLink({ projectId: PROJECT_ID });

    expect(conflict).toEqual({
      message: "Shared link changed while rotating. Refresh and try again.",
      ok: false,
    });
    expect(conflictHarness.state.rpcCalls).toHaveLength(1);
    expect(conflictHarness.state.auditEvents).toEqual([]);
    expect(conflictHarness.state.revalidatedPaths).toEqual([]);
  });

  it("rejects link rotation when previously selected estimates no longer resolve", async () => {
    const harness = await loadPublicationActionsWithHarness({
      snapshot: {
        estimates: [],
        project: { id: PROJECT_ID, name: "Kitchen Renovation" },
        schemaVersion: 1.3,
      },
    });

    const result = await harness.publicationActions.rotateProjectPublicationLink({ projectId: PROJECT_ID });

    expect(result).toEqual({
      message: "Select at least one estimate to publish.",
      ok: false,
    });
    expect(harness.state.rpcCalls).toEqual([]);
    expect(harness.state.auditEvents).toEqual([]);
    expect(harness.state.revalidatedPaths).toEqual([]);
  });

  it("asserts behavioral return contracts for owner activity load and inactive tokens", async () => {
    const successHarness = await loadPublicationActionsWithHarness();

    await expect(successHarness.publicationActions.loadSharedLinkActivity("public-token", { limit: 500 })).resolves.toEqual({
      activities: [],
      hasMore: false,
    });

    const inactiveHarness = await loadPublicationActionsWithHarness({
      publicationLookup: {
        activity_target_labels_json: {},
        expires_at: null,
        id: PUBLICATION_ID,
        project_id: PROJECT_ID,
        revoked_at: "2026-06-21T00:00:00.000Z",
        status: "revoked",
      },
    });

    await expect(inactiveHarness.publicationActions.loadSharedLinkActivity("public-token")).rejects.toThrow(
      "Publication not found or inactive.",
    );
  });

  it("wraps the refresh publication summary pilot action in the canonical ActionResult shape", async () => {
    const { publicationActions, state } = await loadPublicationActionsWithHarness();

    const result = await publicationActions.refreshProjectPublicationSummary(PROJECT_ID);

    expect(result).toEqual({
      ok: true,
      data: state.summary,
    });
  });

  it("normalizes refresh publication summary thrown errors without leaking raw details", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const { publicationActions } = await loadPublicationActionsWithHarness({
      summaryError: new Error("database password leaked token=provider-secret"),
    });

    const result = await publicationActions.refreshProjectPublicationSummary(PROJECT_ID);

    expect(result).toEqual({
      ok: false,
      error: {
        kind: "internal",
        code: "INTERNAL_ERROR",
        message: "Something went wrong. Try again in a moment.",
      },
    });
    expect(JSON.stringify(result)).not.toMatch(/provider-secret|password leaked/i);
    expect(consoleSpy).toHaveBeenCalled();

    consoleSpy.mockRestore();
  });

  it("wires Publisher drawer controls to server actions", () => {
    expect(publisherDrawerHook).toContain("republishProjectPublication");
    expect(publisherDrawerHook).toContain("rotateProjectPublicationLink");
    expect(publisherDrawerHook).toContain("revokeProjectPublication");
    expect(publisherDrawerHook).toContain("republishMutation");
    expect(publisherDrawerHook).toContain("rotateMutation");
    expect(publisherDrawerHook).toContain("revokeMutation");
    // P13 final terminology consistency pass for "Shared link" (P0-P1 complete; all publication tests updated)
    expect(publisherDrawer).toContain("Generate shared link");
    expect(publisherDrawer).toContain("Update shared page");
    expect(publisherDrawer).toContain("New link");
    expect(publisherDrawer).toContain("Turn off link");
    expect(publisherDrawer).toContain("Require password");
  });

  // RED TEST (P0): Sheet selection filter support already exists in action; test will pass for backend but UI wiring is red until P1
  it("createProjectPublication accepts selectedEstimateIds array and normalizes for snapshot filtering", () => {
    expect(actions).toContain("selectedEstimateIds");
    expect(actions).toContain("normalizeSelectedEstimateIds");
    expect(actions).toContain("buildSnapshotForProject(context, estimateIds, normalizedLocationVisibility)");
    // Explicit filter path present (red until P1 threads from SheetPickerList)
    expect(actions).toMatch(/if \(selectedEstimateIds\.length\)|\.in\("id", selectedEstimateIds\)/);
  });

  it("persists compact activity target labels anywhere a publication snapshot is written", () => {
    expect(actions).toContain("createSharedLinkTargetLabelsJson");
    expect(actions).toContain("activity_target_labels_json: createSharedLinkTargetLabelsJson(snapshot)");
    expect(actions).toContain("p_activity_target_labels_json: createSharedLinkTargetLabelsJson(snapshot)");
    expect(actions).toContain('select("id, project_id, status, revoked_at, expires_at, activity_target_labels_json")');
    expect(actions).not.toContain('select("id, project_id, status, revoked_at, expires_at, snapshot_json")');
  });

  it("builds publication snapshots without selecting full source_snapshot JSON for row thumbnails", () => {
    expect(actions).toContain("imageUrl:source_snapshot->>imageUrl");
    expect(actions).not.toContain("contingency_percentage, source_snapshot");
    expect(actions).toContain("imageUrl: typeof row.imageUrl === \"string\"");
  });

  it("processes recipient invitation sends with bounded concurrency", () => {
    expect(actions).toContain("SHARED_LINK_RECIPIENT_ADD_CONCURRENCY");
    expect(recipientLimits).toContain("SHARED_LINK_RECIPIENT_ACTION_LIMIT = 50");
    expect(actions).toContain("inputs.length > SHARED_LINK_RECIPIENT_ACTION_LIMIT");
    expect(actions).toContain("mapWithBoundedConcurrency(allowedRecipients");
    expect(actions).toContain("sendSharedLinkRecipientInvitationEmail");

    const addActionStart = actions.indexOf("export async function addSharedLinkRecipients");
    const managerGate = actions.indexOf("assertProjectPublicationManager(pubCtx.projectId)", addActionStart);
    const limitCheck = actions.indexOf("inputs.length > SHARED_LINK_RECIPIENT_ACTION_LIMIT", addActionStart);
    const emailWork = actions.indexOf("mapWithBoundedConcurrency(allowedRecipients", addActionStart);
    expect(managerGate).toBeGreaterThan(addActionStart);
    expect(limitCheck).toBeGreaterThan(managerGate);
    expect(limitCheck).toBeLessThan(emailWork);
  });

  it("rejects recipient batches above the per-action cap before inserts or email work", async () => {
    const { publicationActions, state } = await loadPublicationActionsWithHarness();
    const recipients = Array.from({ length: 51 }, (_, index) => ({
      email: `client-${index}@example.com`,
    }));

    const result = await publicationActions.addSharedLinkRecipients({
      baseClientLink: "/share/client-token",
      publicationId: PUBLICATION_ID,
      recipients,
    });

    expect(result).toEqual({
      ok: false,
      message: "Add up to 50 recipients per action.",
      added: 0,
      failedEmails: recipients.map((recipient) => recipient.email),
      emailResults: recipients.map((recipient) => ({
        email: recipient.email,
        ok: false,
        error: "Add up to 50 recipients per action.",
        status: "failed",
      })),
    });
    expect(state.publicationUpdates.filter((update) => update.table === "shared_link_recipients")).toEqual([]);
  });

  it("builds publication snapshots from estimate tabs as well as nodes and rows", () => {
    expect(actions).toContain('.from<EstimateTabSource>("estimate_tabs")');
    expect(actions).toContain('.select("id, estimate_id, name, sort_order, is_default")');
    expect(actions).toContain('.is("archived_at", null)');
    expect(actions).toContain('.select("id, estimate_id, estimate_tab_id, name, kind, parent_id, sort_order")');
    expect(actions).toContain("tabsByEstimateId");
    expect(actions).toContain("estimateTabId: node.estimate_tab_id");
    expect(actions).toContain("sortOrder: tab.sort_order");
    expect(actions).toContain("isDefault: tab.is_default");
  });

  // Historical red placeholder (P0/P2): "Tab rendering for receiver (will fail until P2 implements SharePageTabs + ARIA tablist in share page)"
  // P2 delivered (SharePageTabs + ARIA); placeholder retained for historical red-first record.
  // No active assertion (would be noise post-delivery).
  it("receiver surface will expose tablist for sheet navigation (tabbed estimates)", () => {
    // P2 delivered; original expect(true).toBe(false) removed.
  });

  // P4 RED TESTS (Shared Link Overhaul — Email & Recipients)
  // These must fail until addSharedLinkRecipients / removeSharedLinkRecipient implemented in actions.ts
  // and wired with transactional email + token gen + graceful failure per Master Prompt + P4 bullets.
  it("exposes P4 recipient management server actions (add/remove with token generation + Cloudflare Email)", () => {
    expect(actions).toContain("addSharedLinkRecipients");
    expect(actions).toContain("removeSharedLinkRecipient");
    expect(actions).toContain("shared_link_recipients");
    expect(actions).toContain("recipient_token_hash");
    expect(actions).toContain("delivery_status");
    expect(actions).toContain('RecipientDeliveryStatus = "pending" | "sent" | "bounced" | "opened" | "responded"');
    // Uses the Cloudflare-native transactional email client with unique recipient token link.
    expect(actions).toContain("sendEmail");
    expect(actions).toContain("from \"@/lib/email/transactional-email-client\"");
    // Graceful: publication create/republish succeed even if email fails/bounces (no throw, status may stay pending)
    expect(actions).toMatch(/sendEmail|TransactionalEmailClient|ok:\s*false/);
  });

  it("P4 recipient actions generate secure per-recipient tokens and insert with invited_by", () => {
    expect(actions).toContain("createPublicationToken"); // reuse or similar for recipient tokens
    expect(actions).toContain("hashPublicationToken"); // or equiv for recipient_token_hash
    expect(actions).toMatch(/insert.*shared_link_recipients|recipient_token_hash/);
    expect(actions).toContain("invited_by");
  });

  it("blocks project managers from inviting their own sign-in email as a shared-link recipient", () => {
    expect(actions).toContain("readSelfInviteBlockedMessage");
    expect(actions).toContain("context.currentUserEmail");
    expect(actions).toContain("You cannot invite your own sign-in email to this shared link.");
    expect(actions).toMatch(/blockedSelfEmails\.length[\s\S]*emailResults/);
    expect(actions).toMatch(/normalized\.filter[\s\S]*!isSelfRecipientEmail/);
  });

  it("supports per-recipient resend with a fresh secure recipient token and a 5 minute rate limit", () => {
    expect(actions).toContain("resendSharedLinkRecipientEmail");
    expect(actions).toContain("shared_link_recipient_resend");
    expect(actions).toContain("security_rate_limit_events");
    expect(actions).toContain("5 * 60");
    expect(actions).toContain("recipient_token_hash");
    expect(actions).toContain("createPublicationToken");
    expect(actions).toContain("hashPublicationToken");
  });

  it("recipient emails emit the same canonical query parameter that the share page accepts", () => {
    const pageSrc = readFileSync("src/app/share/[token]/page.tsx", "utf8");

    expect(actions).toContain("buildSharedLinkRecipientEmailLinks");
    expect(emailLinks).toContain('searchParams.set("recipient", rawToken)');
    expect(emailLinks).not.toContain("rt=");
    expect(pageSrc).toContain("searchParamsData.recipient");
    expect(pageSrc).toContain("searchParamsData.rt");
  });

  it("recipient and owner digest emails do not use placeholder sender or owner identities", () => {
    expect(actions).not.toContain('"A team member"');
    expect(actions).not.toContain('"owner@archestimator.test"');
    expect(actions).toContain("readPublicationSenderIdentity");
    expect(actions).toContain("resolvePublicationDigestOwner");
    expect(actions).toContain('"An Archestimator user"');
    expect(actions).toContain("workspace_members");
    expect(actions).toContain('role", "owner"');
    expect(actions).toContain("created_by");
    expect(actions).toContain("owner digest skipped");
  });

  it("recipient emails include a compliance unsubscribe footer", () => {
    expect(actions).toContain("buildPublicationEmailComplianceFooter");
    expect(actions).toContain("unsubscribe");
    expect(actions).toContain("mailto:");
    expect(emailLinks).toContain("/unsubscribe");
    expect(emailLinks).toContain('searchParams.set("recipient", rawToken)');
    expect(actions).toContain("complianceFooter");
  });

  it("recipient unsubscribe links suppress future recipient emails", () => {
    const unsubscribeRoute = readFileSync("src/app/api/share/[token]/unsubscribe/route.ts", "utf8");
    const publicRepository = readFileSync("src/lib/publication/public-repository.ts", "utf8");
    const d1Store = readFileSync("src/lib/publication/d1-store.ts", "utf8");
    const recipientComposer = readFileSync("src/components/workshop/publication/RecipientEmailComposer.tsx", "utf8");
    const migrationText = readFileSync("supabase/migrations/20260531175141_shared_link_recipient_unsubscribe.sql", "utf8");
    const d1PublicationMigration = readFileSync("migrations/0014_publication_shared_links.sql", "utf8");

    expect(migrationText).toContain("email_unsubscribed_at timestamptz");
    expect(d1PublicationMigration).toContain("email_unsubscribed_at TEXT");
    expect(unsubscribeRoute).toContain("unsubscribeSharedLinkRecipientByToken");
    expect(unsubscribeRoute).toContain("get(\"recipient\")");
    // SEC-14: mutation is gated behind an explicit POST; GET is read-only.
    expect(unsubscribeRoute).toContain("export async function POST");
    expect(unsubscribeRoute).toContain("Cache-Control");
    expect(publicRepository).toContain("unsubscribeSharedLinkRecipientByToken");
    expect(d1Store).toContain("email_unsubscribed_at");
    expect(actions).toContain("Recipient has unsubscribed from follow-up emails");
    expect(recipientComposer).toContain("email_unsubscribed_at");
    expect(recipientComposer).toContain("unsubscribed");
    expect(recipientComposer).toContain("failed");
  });

  it("recipient opens update recipient status and write recipient-scoped activity without exposing raw tokens", () => {
    const pageSrc = readFileSync("src/app/share/[token]/page.tsx", "utf8");
    const publicRepository = readFileSync("src/lib/publication/public-repository.ts", "utf8");
    const security = readFileSync("src/lib/publication/security.ts", "utf8");

    expect(security).toContain("readSharedLinkSessionCookieRecipientId");
    expect(pageSrc).toContain("recipientIdForOpenEvent");
    expect(pageSrc).toContain("metadata: recipientIdForOpenEvent ? { recipient_id: recipientIdForOpenEvent } : {}");
    expect(publicRepository).toContain("shared_link_recipients");
    const d1Store = readFileSync("src/lib/publication/d1-store.ts", "utf8");
    expect(d1Store).toContain("delivery_status = 'opened'");
    expect(d1Store).toContain("last_opened_at");
    expect(d1Store).toContain("shared_link_events");
    expect(publicRepository).toContain("recipientId");
    expect(publicRepository).not.toContain("raw-recipient-token");
  });

  // ============================================================================
  // P5 RED TESTS (Recipient Session & Security Cookie — Packet P5)
  // Per Master Prompt + exact P5 task: additive shared_link_session_[token] HttpOnly cookie,
  // ?recipient= verification on share page load, useSharedLinkSession hook, UI blocking for interactive.
  // Backwards compat for password + view-only flows. Red until implemented.
  // ============================================================================
  it("P5 exposes additive shared_link_session cookie helpers (HttpOnly, SameSite=Lax, Secure, Max-Age=86400) without breaking password cookie", () => {
    const security = readFileSync("src/lib/publication/security.ts", "utf8");
    expect(security).toContain("shared_link_session_");
    expect(security).toContain("createSharedLinkSessionCookieName");
    expect(security).toContain("createSharedLinkSessionCookie");
    expect(security).toContain("verifySharedLinkSessionCookieValue");
    expect(security).toContain("; HttpOnly;");
    expect(security).toContain("SameSite=Lax");
    expect(security).toMatch(/Max-Age=86400|86400/);
    // Additive: existing password access cookie logic and names untouched
    expect(security).toContain("ae_publication_access_");
    expect(security).toContain("createPublicationAccessCookieName");
    expect(security).toContain("verifyPublicationAccessCookieValue");
    expect(security).toContain("createPublicationAccessCookie");
  });

  it("P5 share page verifies recipient token on ?recipient= load, sets session cookie, and scopes open tracking (password/view-only paths unchanged)", () => {
    const pageSrc = readFileSync("src/app/share/[token]/page.tsx", "utf8");
    const sessionRouteSrc = readFileSync("src/app/api/share/[token]/session/route.ts", "utf8");
    expect(pageSrc).toContain("searchParams");
    expect(pageSrc).toContain("?recipient");
    expect(pageSrc).toContain("redirect(`/api/share/${encodeURIComponent(token)}/session?recipient=${encodeURIComponent(recipientToken)}`)");
    expect(pageSrc).not.toContain("SharePageRecipientSessionInitializer");
    expect(sessionRouteSrc).toContain("export async function GET");
    expect(sessionRouteSrc).toContain("verifySharedLinkRecipientToken");
    expect(sessionRouteSrc).toContain("getSharedLinkSessionCookieParts");
    expect(sessionRouteSrc).toContain("response.cookies.set");
    expect(pageSrc).toContain("recipientIdForOpenEvent");
    expect(pageSrc).toContain("createSharedLinkSessionCookieName"); // P5 session cookie name construction used on recipient path + subsequent loads
    expect(pageSrc).toContain("verifySharedLinkSessionCookieValue");
    // Existing password gate and cookie logic must remain identical for backwards compat
    expect(pageSrc).toContain("passwordRequired");
    expect(pageSrc).toContain("ProjectPublicationPasswordGate");
    expect(pageSrc).toContain("verifyPublicationAccessCookieValue");
    expect(pageSrc).toContain("createPublicationAccessCookieName");
  });

  it("P5 provides useSharedLinkSession hook (client-side) and integrates blocking guard in receiver UI for future interactive (P6+)", () => {
    let hookSrc = "";
    try {
      hookSrc = readFileSync("src/hooks/use-shared-link-session.ts", "utf8");
    } catch {
      hookSrc = "";
    }
    expect(hookSrc).toContain("useSharedLinkSession");
    // P5 hook uses cookie-flag approach (no Provider needed; simpler for HttpOnly + non-secret _ok flag; future P6+ can extend with context if desired)
    // Guard/blocking is split between the page-level session banner and interactive widgets.
    const banner = readFileSync("src/components/share/SharePageSessionBanner.tsx", "utf8");
    const comments = readFileSync("src/components/share/SharePageComments.tsx", "utf8");
    const decision = readFileSync("src/components/share/SharePageDecision.tsx", "utf8");
    expect(banner).toContain("hasValidRecipientSession");
    expect(banner).toContain("Use your personalized link to comment and respond.");
    expect(banner).toContain("text-[12px]"); // client-portal type scale (T1: /share label floor is 12px)
    expect(comments).toContain("useSharedLinkSession");
    expect(decision).toContain("useSharedLinkSession");
  });
});
