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
  buildProjectPublicationRevisionForEstimate: vi.fn(() => ({
    sql: "UPDATE projects SET publication_source_revision = publication_source_revision + 1",
    values: [],
  })),
}));

vi.mock("@/lib/estimates/d1-intents/history-events", () => ({
  prepareHistoryEventInsert: mocks.prepareHistoryEventInsert,
}));

import {
  applyEstimateContributionConfigurationBulk,
  ContributionConfigurationError,
  createOrReplaceEstimateAlternativeGroup,
  ensureEstimateContributionScope,
  markEstimateContributionRowOptional,
  removeEstimateAlternativeGroup,
  unmarkEstimateContributionRowOptional,
} from "@/lib/estimates/contribution-configuration-repository";

type Prepared = D1PreparedStatementLike & { sql: string; values: D1Value[] };

function createDatabase(input: {
  scope?: Record<string, unknown> | null;
  group?: Record<string, unknown> | null;
  validation?: Record<string, unknown> | null;
  optional?: Record<string, unknown> | null;
  batchResults?: D1Result[];
} = {}) {
  const batches: Prepared[][] = [];
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
          if (sql.includes("SELECT id, revision") && sql.includes("FROM estimate_contribution_scopes")) {
            return (input.scope ?? null) as R | null;
          }
          if (sql.includes("FROM estimate_alternative_groups AS group_row")) {
            return (input.group ?? null) as R | null;
          }
          if (sql.includes("WITH requested AS")) return (input.validation ?? null) as R | null;
          if (sql.includes("LEFT JOIN estimate_optional_items AS optional_row")) {
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
      return statement;
    },
    async batch(statements) {
      batches.push(statements as Prepared[]);
      return input.batchResults ?? statements.map(() => ({ success: true, meta: { changes: 1 } }));
    },
  };
  return { database, batches };
}

const actor = { userId: "user-1", role: "member" as const };
const base = {
  actor,
  projectId: "project-1",
  estimateId: "estimate-1",
  estimateTabId: "tab-1",
  contributionScopeId: "scope-1",
  intentId: "intent-1",
  now: "2026-07-30T00:00:00.000Z",
};

beforeEach(() => {
  vi.clearAllMocks();
  mocks.prepareEstimateMutationIntent.mockImplementation(async (_database, _actor, input) => ({
    context: {
      workspaceId: "workspace-1",
      projectId: input.projectId,
      estimateId: input.estimateId,
      actorUserId: "user-1",
      commandKind: input.commandKind,
      intentId: input.correlationId,
      requestFingerprint: "1".repeat(64),
    },
    committedResult: null,
  }));
  mocks.readConcurrentEstimateMutationReceipt.mockResolvedValue(null);
  mocks.prepareHistoryEventInsert.mockResolvedValue({
    eventId: "event-1",
    statement: { sql: "INSERT INTO estimate_sheet_events VALUES (?)", values: ["event-1"] },
    outboxStatement: { sql: "INSERT INTO activity_event_outbox VALUES (?)", values: ["outbox-1"] },
  });
});

describe("contribution configuration repository", () => {
  it("commits multiple optional rows under one scope revision and one receipt", async () => {
    const { database, batches } = createDatabase({ scope: { id: "scope-1", revision: 7 } });

    await expect(applyEstimateContributionConfigurationBulk({
      database,
      ...base,
      expectedContributionRevision: 7,
      operation: {
        kind: "mark_optional",
        rows: [
          { rowItemId: "row-1", isIncluded: true, expectedOptionalRevision: null },
          { rowItemId: "row-2", isIncluded: false, expectedOptionalRevision: 2 },
        ],
      },
    })).resolves.toMatchObject({
      kind: "contribution_configuration_bulk_applied",
      contributionRevision: 8,
      changedRowItemIds: ["row-1", "row-2"],
      replayed: false,
    });

    expect(batches).toHaveLength(1);
    const sql = batches[0]?.map((statement) => statement.sql) ?? [];
    expect(sql.filter((statement) => statement.includes("INSERT INTO estimate_optional_items"))).toHaveLength(2);
    expect(sql.filter((statement) => statement.includes("UPDATE estimate_contribution_scopes"))).toHaveLength(1);
    expect(sql.filter((statement) => statement.includes("INSERT INTO estimate_mutation_receipts"))).toHaveLength(1);
    expect(mocks.prepareHistoryEventInsert).toHaveBeenCalledOnce();
  });

  it("ensures an existing tab scope idempotently with one guarded receipt", async () => {
    const { database, batches } = createDatabase({ scope: { id: "scope-existing", revision: 4 } });

    await expect(ensureEstimateContributionScope({ database, ...base })).resolves.toEqual({
      kind: "contribution_scope_ensured",
      contributionScopeId: "scope-existing",
      contributionRevision: 4,
      changed: false,
      replayed: false,
    });

    expect(batches).toHaveLength(1);
    expect(batches[0]).toHaveLength(1);
    expect(batches[0]?.[0]?.sql).toContain("INSERT INTO estimate_mutation_receipts");
    expect(mocks.prepareHistoryEventInsert).not.toHaveBeenCalled();
  });

  it("creates a two-row same-node root alternative group with atomic revision, receipt, publication, history, and outbox writes", async () => {
    const { database, batches } = createDatabase({
      group: null,
      validation: {
        contribution_revision: 5,
        valid_count: 2,
        node_count: 1,
        root_count: 2,
        unavailable_count: 0,
      },
    });

    await expect(createOrReplaceEstimateAlternativeGroup({
      database,
      ...base,
      groupId: "group-1",
      name: "Floor finishes",
      rowItemIds: ["row-1", "row-2"],
      selectedRowItemId: "row-2",
      expectedGroupRevision: null,
      expectedContributionRevision: 5,
    })).resolves.toEqual({
      kind: "alternative_group_configured",
      contributionScopeId: "scope-1",
      groupId: "group-1",
      name: "Floor finishes",
      rowItemIds: ["row-1", "row-2"],
      selectedRowItemId: "row-2",
      groupRevision: 1,
      contributionRevision: 6,
      changed: true,
      replayed: false,
    });

    expect(batches[0]?.map((statement) => statement.sql)).toEqual([
      expect.stringContaining("INSERT INTO estimate_alternative_groups"),
      expect.stringContaining("DELETE FROM estimate_alternative_members"),
      expect.stringContaining("INSERT INTO estimate_alternative_members"),
      expect.stringContaining("UPDATE estimate_contribution_scopes"),
      expect.stringContaining("INSERT INTO estimate_mutation_receipts"),
      expect.stringContaining("publication_source_revision"),
      expect.stringContaining("estimate_sheet_events"),
      expect.stringContaining("activity_event_outbox"),
    ]);
    expect(batches[0]?.[3]?.sql).toContain("COUNT(DISTINCT row_item.node_id)");
    expect(mocks.prepareHistoryEventInsert).toHaveBeenCalledWith(database, expect.objectContaining({
      eventType: "alternative_group_created",
      correlationId: "intent-1",
    }));
  });

  it("rejects cross-node, non-root, and already-configured alternative members before batching", async () => {
    for (const validation of [
      { contribution_revision: 5, valid_count: 2, node_count: 2, root_count: 2, unavailable_count: 0 },
      { contribution_revision: 5, valid_count: 2, node_count: 1, root_count: 1, unavailable_count: 0 },
      { contribution_revision: 5, valid_count: 2, node_count: 1, root_count: 2, unavailable_count: 1 },
    ]) {
      const { database, batches } = createDatabase({ validation });
      await expect(createOrReplaceEstimateAlternativeGroup({
        database,
        ...base,
        groupId: "group-1",
        rowItemIds: ["row-1", "row-2"],
        selectedRowItemId: "row-1",
        expectedGroupRevision: null,
        expectedContributionRevision: 5,
      })).rejects.toMatchObject({ code: "constraint_conflict" });
      expect(batches).toHaveLength(0);
    }
  });

  it("marks and unmarks a root optional row with entity and contribution CAS", async () => {
    const created = createDatabase({
      optional: {
        contribution_revision: 3,
        optional_revision: null,
        is_included: null,
        is_root: 1,
        alternative_count: 0,
      },
    });
    await expect(markEstimateContributionRowOptional({
      database: created.database,
      ...base,
      rowItemId: "row-1",
      isIncluded: false,
      expectedOptionalRevision: null,
      expectedContributionRevision: 3,
    })).resolves.toMatchObject({
      kind: "optional_row_marked",
      optionalRevision: 1,
      contributionRevision: 4,
      isIncluded: false,
      changed: true,
    });
    expect(created.batches[0]?.map((statement) => statement.sql)).toEqual([
      expect.stringContaining("INSERT INTO estimate_optional_items"),
      expect.stringContaining("UPDATE estimate_contribution_scopes"),
      expect.stringContaining("INSERT INTO estimate_mutation_receipts"),
      expect.stringContaining("publication_source_revision"),
      expect.stringContaining("estimate_sheet_events"),
      expect.stringContaining("activity_event_outbox"),
    ]);

    const removed = createDatabase({
      optional: {
        contribution_revision: 4,
        optional_revision: 1,
        is_included: 0,
        is_root: 1,
        alternative_count: 0,
      },
    });
    await expect(unmarkEstimateContributionRowOptional({
      database: removed.database,
      ...base,
      rowItemId: "row-1",
      expectedOptionalRevision: 1,
      expectedContributionRevision: 4,
    })).resolves.toMatchObject({
      kind: "optional_row_unmarked",
      optionalRevision: null,
      contributionRevision: 5,
      changed: true,
    });
    expect(removed.batches[0]?.[0]?.sql).toContain("DELETE FROM estimate_optional_items");
  });

  it("removes a group cleanly and returns its former projection members", async () => {
    const { database, batches } = createDatabase({
      group: {
        name: "Floor finishes",
        selected_row_item_id: "row-2",
        group_revision: 2,
        contribution_revision: 8,
        member_ids_json: '["row-1","row-2"]',
      },
    });

    await expect(removeEstimateAlternativeGroup({
      database,
      ...base,
      groupId: "group-1",
      expectedGroupRevision: 2,
      expectedContributionRevision: 8,
    })).resolves.toMatchObject({
      kind: "alternative_group_removed",
      removedRowItemIds: ["row-1", "row-2"],
      groupRevision: null,
      contributionRevision: 9,
    });
    expect(batches[0]?.[0]?.sql).toContain("DELETE FROM estimate_alternative_groups");
    expect(batches[0]?.[1]?.sql).toContain("NOT EXISTS (SELECT 1 FROM estimate_alternative_members");
  });

  it("returns committed intents as replays and maps authorization failures", async () => {
    const committed = {
      kind: "contribution_scope_ensured" as const,
      contributionScopeId: "scope-1",
      contributionRevision: 1,
      changed: true,
    };
    mocks.prepareEstimateMutationIntent.mockResolvedValueOnce({ context: {}, committedResult: committed });
    const replay = createDatabase();
    await expect(ensureEstimateContributionScope({ database: replay.database, ...base }))
      .resolves.toEqual({ ...committed, replayed: true });
    expect(replay.batches).toHaveLength(0);

    mocks.prepareEstimateMutationIntent.mockRejectedValueOnce(new Error("Estimate edit access denied."));
    await expect(ensureEstimateContributionScope({ database: replay.database, ...base }))
      .rejects.toEqual(expect.objectContaining({
        code: "not_authorized",
        name: ContributionConfigurationError.name,
      }));
  });

  it("validates every command-specific committed receipt before replay", async () => {
    const cases = [
      {
        receipt: {
          kind: "alternative_group_configured",
          contributionScopeId: "scope-1",
          groupId: "group-1",
          name: "Floor finishes",
          rowItemIds: ["row-1", "row-2"],
          selectedRowItemId: "row-2",
          groupRevision: 2,
          contributionRevision: 6,
          changed: true,
        },
        run: (database: D1DatabaseLike) => createOrReplaceEstimateAlternativeGroup({
          database,
          ...base,
          groupId: "group-1",
          name: "Floor finishes",
          rowItemIds: ["row-1", "row-2"],
          selectedRowItemId: "row-2",
          expectedGroupRevision: 1,
          expectedContributionRevision: 5,
        }),
      },
      {
        receipt: {
          kind: "optional_row_marked",
          contributionScopeId: "scope-1",
          rowItemId: "row-1",
          isIncluded: false,
          optionalRevision: 2,
          contributionRevision: 6,
          changed: true,
        },
        run: (database: D1DatabaseLike) => markEstimateContributionRowOptional({
          database,
          ...base,
          rowItemId: "row-1",
          isIncluded: false,
          expectedOptionalRevision: 1,
          expectedContributionRevision: 5,
        }),
      },
      {
        receipt: {
          kind: "optional_row_unmarked",
          contributionScopeId: "scope-1",
          rowItemId: "row-1",
          optionalRevision: null,
          contributionRevision: 6,
          changed: true,
        },
        run: (database: D1DatabaseLike) => unmarkEstimateContributionRowOptional({
          database,
          ...base,
          rowItemId: "row-1",
          expectedOptionalRevision: 1,
          expectedContributionRevision: 5,
        }),
      },
      {
        receipt: {
          kind: "alternative_group_removed",
          contributionScopeId: "scope-1",
          groupId: "group-1",
          removedRowItemIds: ["row-1", "row-2"],
          groupRevision: null,
          contributionRevision: 6,
          changed: true,
        },
        run: (database: D1DatabaseLike) => removeEstimateAlternativeGroup({
          database,
          ...base,
          groupId: "group-1",
          expectedGroupRevision: 1,
          expectedContributionRevision: 5,
        }),
      },
      {
        receipt: {
          kind: "contribution_configuration_bulk_applied",
          contributionScopeId: "scope-1",
          contributionRevision: 6,
          changed: true,
          changedRowItemIds: ["row-1"],
          changedGroupIds: [],
        },
        run: (database: D1DatabaseLike) => applyEstimateContributionConfigurationBulk({
          database,
          ...base,
          expectedContributionRevision: 5,
          operation: {
            kind: "mark_optional",
            rows: [{ rowItemId: "row-1", isIncluded: true, expectedOptionalRevision: null }],
          },
        }),
      },
    ] as const;

    for (const { receipt, run } of cases) {
      mocks.prepareEstimateMutationIntent.mockResolvedValueOnce({ context: {}, committedResult: receipt });
      const replay = createDatabase();
      await expect(run(replay.database)).resolves.toEqual({ ...receipt, replayed: true });
      expect(replay.batches).toHaveLength(0);
    }
  });
});
