import { beforeEach, describe, expect, it, vi } from "vitest";

import type { D1DatabaseLike, D1PreparedStatementLike, D1Result, D1Value } from "@/lib/cloudflare/d1";

const mocks = vi.hoisted(() => ({
  prepareEstimateMutationIntent: vi.fn(),
  readConcurrentEstimateMutationReceipt: vi.fn(),
  prepareHistoryEventInsert: vi.fn(),
}));

vi.mock("@/lib/estimates/d1-intents/intent-context", () => ({
  prepareEstimateMutationIntent: mocks.prepareEstimateMutationIntent,
  async prepareParsedEstimateMutationIntent(
    database: unknown,
    actor: unknown,
    input: unknown,
    parseCommittedResult: (value: unknown) => unknown,
  ) {
    const prepared = await mocks.prepareEstimateMutationIntent(database, actor, input);
    return {
      ...prepared,
      committedResult: prepared.committedResult === null
        ? null
        : parseCommittedResult(prepared.committedResult),
    };
  },
  readConcurrentEstimateMutationReceipt: mocks.readConcurrentEstimateMutationReceipt,
  buildProjectPublicationRevisionForEstimate: vi.fn((projectId: string, workspaceId: string, estimateId: string) => ({
    sql: "UPDATE projects SET publication_source_revision = publication_source_revision + 1 WHERE id = ? AND workspace_id = ? AND ? = ?",
    values: [projectId, workspaceId, estimateId, estimateId],
  })),
}));

vi.mock("@/lib/estimates/d1-intents/history-events", () => ({
  prepareHistoryEventInsert: mocks.prepareHistoryEventInsert,
}));

import {
  ValueEngineeringMutationError,
  selectValueEngineeringAlternative,
  setValueEngineeringOptionalInclusion,
} from "@/lib/estimates/value-engineering-repository";

type Prepared = D1PreparedStatementLike & { sql: string; values: D1Value[] };

function createDatabase(input: {
  alternative?: Record<string, unknown> | null;
  optional?: Record<string, unknown> | null;
  batchResults?: D1Result[];
} = {}) {
  const batches: Prepared[][] = [];
  const prepared: Prepared[] = [];
  const database: D1DatabaseLike = {
    prepare<T = Record<string, unknown>>(sql: string) {
      const statement = {
        sql,
        values: [] as D1Value[],
        bind(...values: D1Value[]) {
          statement.values = values;
          return statement;
        },
        async first<R = T>() {
          if (sql.includes("FROM estimate_alternative_groups AS group_row")) {
            return (input.alternative ?? null) as R | null;
          }
          if (sql.includes("FROM estimate_optional_items AS optional_row")) {
            return (input.optional ?? null) as R | null;
          }
          return null;
        },
        async all<R = T>() {
          return { success: true, results: [] as R[] };
        },
        async run() {
          return { success: true, meta: { changes: 1 } };
        },
      } satisfies Prepared;
      prepared.push(statement);
      return statement;
    },
    async batch(statements) {
      batches.push(statements as Prepared[]);
      return input.batchResults ?? statements.map(() => ({ success: true, meta: { changes: 1 } }));
    },
  };
  return { database, batches, prepared };
}

const actor = { userId: "user-1", role: "member" as const };
const context = {
  workspaceId: "workspace-1",
  projectId: "project-1",
  estimateId: "estimate-1",
  actorUserId: "user-1",
  commandKind: "value_engineering.select_alternative",
  intentId: "intent-1",
  requestFingerprint: "1".repeat(64),
};

beforeEach(() => {
  vi.clearAllMocks();
  mocks.prepareEstimateMutationIntent.mockResolvedValue({ context, committedResult: null });
  mocks.readConcurrentEstimateMutationReceipt.mockResolvedValue(null);
  mocks.prepareHistoryEventInsert.mockResolvedValue({
    eventId: "event-1",
    statement: { sql: "INSERT INTO estimate_sheet_events VALUES (?)", values: ["event-1"] },
    outboxStatement: { sql: "INSERT INTO activity_event_outbox VALUES (?)", values: ["outbox-1"] },
  });
});

describe("value-engineering D1 repository", () => {
  it("authorizes and commits alternative selection, scope revision, receipt, history, and outbox in one batch", async () => {
    const { database, batches } = createDatabase({
      alternative: {
        group_revision: 4,
        selected_row_item_id: "row-old",
        contribution_revision: 9,
        requested_member_exists: 1,
      },
    });

    await expect(selectValueEngineeringAlternative({
      database,
      actor,
      projectId: "project-1",
      estimateId: "estimate-1",
      estimateTabId: "tab-1",
      contributionScopeId: "scope-1",
      groupId: "group-1",
      selectedRowItemId: "row-new",
      expectedGroupRevision: 4,
      expectedContributionRevision: 9,
      intentId: "intent-1",
      now: "2026-07-30T00:00:00.000Z",
    })).resolves.toEqual({
      kind: "alternative_selection",
      contributionScopeId: "scope-1",
      groupId: "group-1",
      selectedRowItemId: "row-new",
      groupRevision: 5,
      contributionRevision: 10,
      changed: true,
      replayed: false,
    });

    expect(mocks.prepareEstimateMutationIntent).toHaveBeenCalledWith(
      database,
      actor,
      expect.objectContaining({
        projectId: "project-1",
        estimateId: "estimate-1",
        correlationId: "intent-1",
        commandKind: "value_engineering.select_alternative",
      }),
    );
    expect(batches).toHaveLength(1);
    expect(batches[0]).toHaveLength(6);
    expect(batches[0]?.map((statement) => statement.sql)).toEqual([
      expect.stringContaining("UPDATE estimate_alternative_groups"),
      expect.stringContaining("UPDATE estimate_contribution_scopes"),
      expect.stringContaining("INSERT INTO estimate_mutation_receipts"),
      expect.stringContaining("publication_source_revision"),
      expect.stringContaining("estimate_sheet_events"),
      expect.stringContaining("activity_event_outbox"),
    ]);
    expect(mocks.prepareHistoryEventInsert).toHaveBeenCalledWith(database, expect.objectContaining({
      eventType: "alternative_selection_changed",
      correlationId: "intent-1",
      oldSnapshot: { selectedRowItemId: "row-old", groupRevision: 4 },
      newSnapshot: { selectedRowItemId: "row-new", groupRevision: 5 },
    }));
  });

  it("records a guarded receipt only when an optional inclusion request is already satisfied", async () => {
    mocks.prepareEstimateMutationIntent.mockResolvedValue({
      context: { ...context, commandKind: "value_engineering.set_optional_inclusion" },
      committedResult: null,
    });
    const { database, batches } = createDatabase({
      optional: { optional_revision: 2, is_included: 0, contribution_revision: 6 },
    });

    await expect(setValueEngineeringOptionalInclusion({
      database,
      actor,
      projectId: "project-1",
      estimateId: "estimate-1",
      estimateTabId: "tab-1",
      contributionScopeId: "scope-1",
      rowItemId: "row-optional",
      isIncluded: false,
      expectedOptionalRevision: 2,
      expectedContributionRevision: 6,
      intentId: "intent-1",
    })).resolves.toEqual({
      kind: "optional_inclusion",
      contributionScopeId: "scope-1",
      rowItemId: "row-optional",
      isIncluded: false,
      optionalRevision: 2,
      contributionRevision: 6,
      changed: false,
      replayed: false,
    });

    expect(batches).toHaveLength(1);
    expect(batches[0]).toHaveLength(1);
    expect(batches[0]?.[0]?.sql).toContain("INSERT INTO estimate_mutation_receipts");
    expect(mocks.prepareHistoryEventInsert).not.toHaveBeenCalled();
  });

  it("rejects stale revisions and wrong-tab membership without any partial batch", async () => {
    const stale = createDatabase({
      alternative: {
        group_revision: 5,
        selected_row_item_id: "row-old",
        contribution_revision: 9,
        requested_member_exists: 1,
      },
    });
    await expect(selectValueEngineeringAlternative({
      database: stale.database,
      actor,
      projectId: "project-1",
      estimateId: "estimate-1",
      estimateTabId: "tab-1",
      contributionScopeId: "scope-1",
      groupId: "group-1",
      selectedRowItemId: "row-new",
      expectedGroupRevision: 4,
      expectedContributionRevision: 9,
      intentId: "intent-stale",
    })).rejects.toMatchObject({ code: "revision_conflict" });
    expect(stale.batches).toHaveLength(0);

    const wrongTab = createDatabase({
      alternative: {
        group_revision: 4,
        selected_row_item_id: "row-old",
        contribution_revision: 9,
        requested_member_exists: 0,
      },
    });
    await expect(selectValueEngineeringAlternative({
      database: wrongTab.database,
      actor,
      projectId: "project-1",
      estimateId: "estimate-1",
      estimateTabId: "tab-1",
      contributionScopeId: "scope-1",
      groupId: "group-1",
      selectedRowItemId: "row-other-tab",
      expectedGroupRevision: 4,
      expectedContributionRevision: 9,
      intentId: "intent-wrong-tab",
    })).rejects.toMatchObject({ code: "not_found" });
    expect(wrongTab.batches).toHaveLength(0);
  });

  it("returns a committed intent as a replay and maps authorization denial", async () => {
    const committed = {
      kind: "alternative_selection" as const,
      contributionScopeId: "scope-1",
      groupId: "group-1",
      selectedRowItemId: "row-new",
      groupRevision: 5,
      contributionRevision: 10,
      changed: true,
    };
    mocks.prepareEstimateMutationIntent.mockResolvedValueOnce({ context, committedResult: committed });
    const replay = createDatabase();
    await expect(selectValueEngineeringAlternative({
      database: replay.database,
      actor,
      projectId: "project-1",
      estimateId: "estimate-1",
      estimateTabId: "tab-1",
      contributionScopeId: "scope-1",
      groupId: "group-1",
      selectedRowItemId: "row-new",
      expectedGroupRevision: 4,
      expectedContributionRevision: 9,
      intentId: "intent-1",
    })).resolves.toEqual({ ...committed, replayed: true });
    expect(replay.batches).toHaveLength(0);

    mocks.prepareEstimateMutationIntent.mockRejectedValueOnce(new Error("Estimate edit access denied."));
    await expect(selectValueEngineeringAlternative({
      database: replay.database,
      actor,
      projectId: "project-1",
      estimateId: "estimate-1",
      estimateTabId: "tab-1",
      contributionScopeId: "scope-1",
      groupId: "group-1",
      selectedRowItemId: "row-new",
      expectedGroupRevision: 4,
      expectedContributionRevision: 9,
      intentId: "intent-denied",
    })).rejects.toEqual(expect.objectContaining({
      code: "not_authorized",
      name: ValueEngineeringMutationError.name,
    }));
  });

  it("validates optional receipts and recovers a concurrent committed result", async () => {
    const committed = {
      kind: "optional_inclusion" as const,
      contributionScopeId: "scope-1",
      rowItemId: "row-optional",
      isIncluded: true,
      optionalRevision: 3,
      contributionRevision: 7,
      changed: true,
    };
    const input = {
      actor,
      projectId: "project-1",
      estimateId: "estimate-1",
      estimateTabId: "tab-1",
      contributionScopeId: "scope-1",
      rowItemId: "row-optional",
      isIncluded: true,
      expectedOptionalRevision: 2,
      expectedContributionRevision: 6,
      intentId: "intent-1",
    };

    mocks.prepareEstimateMutationIntent.mockResolvedValueOnce({ context, committedResult: committed });
    const replay = createDatabase();
    await expect(setValueEngineeringOptionalInclusion({ database: replay.database, ...input }))
      .resolves.toEqual({ ...committed, replayed: true });
    expect(replay.batches).toHaveLength(0);

    mocks.prepareEstimateMutationIntent.mockResolvedValueOnce({
      context: { ...context, commandKind: "value_engineering.set_optional_inclusion" },
      committedResult: null,
    });
    mocks.readConcurrentEstimateMutationReceipt.mockResolvedValueOnce(committed);
    const concurrent = createDatabase({
      optional: { optional_revision: 2, is_included: 0, contribution_revision: 6 },
    });
    concurrent.database.batch = vi.fn().mockRejectedValue(new Error("concurrent write"));

    await expect(setValueEngineeringOptionalInclusion({ database: concurrent.database, ...input }))
      .resolves.toEqual({ ...committed, replayed: true });
    expect(mocks.readConcurrentEstimateMutationReceipt).toHaveBeenCalledWith(
      concurrent.database,
      expect.objectContaining({ intentId: "intent-1" }),
    );
  });
});
