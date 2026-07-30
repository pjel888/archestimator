import { beforeEach, describe, expect, it, vi } from "vitest";

import type { D1DatabaseLike, D1PreparedStatementLike, D1Result, D1Value } from "@/lib/cloudflare/d1";

const mocks = vi.hoisted(() => ({
  batch: vi.fn(),
  concurrentReceipt: vi.fn(),
  history: vi.fn(),
  prepareIntent: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/cloudflare/d1-batch", () => ({ runRequiredD1Batch: mocks.batch }));
vi.mock("@/lib/estimates/d1-intents/history-events", () => ({ prepareHistoryEventInsert: mocks.history }));
vi.mock("@/lib/estimates/d1-intents/intent-context", () => ({
  buildProjectPublicationRevisionForEstimate: vi.fn(() => ({ sql: "UPDATE projects SET publication_source_revision = publication_source_revision + 1", values: [] })),
  prepareEstimateMutationIntent: mocks.prepareIntent,
  readConcurrentEstimateMutationReceipt: mocks.concurrentReceipt,
}));

import {
  applyMaterialAssemblyBulk,
  createMaterialAssemblyEdge,
  deleteMaterialAssemblyEdge,
  MaterialAssemblyMutationError,
  updateMaterialAssemblyEdge,
} from "@/lib/estimates/material-assembly-repository";

type RecordedStatement = D1PreparedStatementLike & {
  sql: string;
  values: D1Value[];
};

class Statement implements RecordedStatement {
  values: D1Value[] = [];

  constructor(
    readonly sql: string,
    private readonly firstValue: () => unknown,
  ) {}

  bind(...values: D1Value[]) {
    this.values = values;
    return this;
  }

  async first<R>() {
    return this.firstValue() as R | null;
  }

  async all<R>(): Promise<D1Result<R>> {
    return { results: [], success: true };
  }

  async run(): Promise<D1Result> {
    return { success: true };
  }
}

function database(input: {
  edge?: Record<string, unknown> | null;
  endpoint?: Record<string, unknown> | null;
  scope?: Record<string, unknown> | null;
}) {
  const statements: Statement[] = [];
  const db: D1DatabaseLike = {
    prepare(sql) {
      const statement = new Statement(sql, () => {
        if (sql.includes("SELECT scope.revision AS contribution_revision")) return input.endpoint ?? null;
        if (sql.includes("SELECT edge.parent_row_item_id")) return input.edge ?? null;
        if (sql.includes("SELECT id, revision") && sql.includes("FROM estimate_contribution_scopes")) return input.scope ?? null;
        return null;
      });
      statements.push(statement);
      return statement;
    },
    batch: vi.fn(),
  };
  return { db, statements };
}

const actor = { role: "member", userId: "user-1" } as const;
const base = {
  actor,
  childRowItemId: "child-row",
  contributionScopeId: "scope-1",
  edgeId: "edge-1",
  estimateId: "estimate-1",
  estimateTabId: "tab-1",
  intentId: "intent-1",
  isIncluded: true,
  mode: "required" as const,
  parentRowItemId: "parent-row",
  projectId: "project-1",
  quantityRule: { factor: 2, kind: "per-parent", schemaVersion: 1 },
};

const context = {
  actorUserId: actor.userId,
  commandKind: "material_assembly.create_accessory_edge",
  estimateId: base.estimateId,
  intentId: base.intentId,
  projectId: base.projectId,
  requestFingerprint: "1".repeat(64),
  workspaceId: "workspace-1",
};

function edgeState(overrides: Record<string, unknown> = {}) {
  return {
    child_row_item_id: base.childRowItemId,
    contribution_revision: 4,
    edge_revision: 2,
    is_included: 1,
    mode: "required",
    parent_row_item_id: base.parentRowItemId,
    quantity_rule_json: '{"schemaVersion":1,"kind":"per-parent","factor":2}',
    ...overrides,
  };
}

beforeEach(() => {
  mocks.batch.mockReset().mockResolvedValue([]);
  mocks.concurrentReceipt.mockReset().mockResolvedValue(null);
  mocks.history.mockReset().mockResolvedValue({ eventId: "event-1", statement: null, outboxStatement: null });
  mocks.prepareIntent.mockReset().mockResolvedValue({ committedResult: null, context });
});

describe("material assembly repository", () => {
  it("commits a multi-edge assembly change in one D1 batch with one scope CAS and receipt", async () => {
    const fixture = database({ scope: { id: "scope-1", revision: 5 } });

    await expect(applyMaterialAssemblyBulk({
      actor,
      contributionScopeId: base.contributionScopeId,
      database: fixture.db,
      estimateId: base.estimateId,
      estimateTabId: base.estimateTabId,
      expectedContributionRevision: 5,
      intentId: base.intentId,
      now: "2026-07-30T00:00:00.000Z",
      projectId: base.projectId,
      operation: {
        kind: "configure_accessories",
        edges: [
          { ...base, edgeId: "edge-1", childRowItemId: "child-1", expectedEdgeRevision: null },
          { ...base, edgeId: "edge-2", childRowItemId: "child-2", expectedEdgeRevision: 3 },
        ],
      },
    })).resolves.toMatchObject({
      kind: "material_assembly_bulk_applied",
      contributionRevision: 6,
      changedEdgeIds: ["edge-1", "edge-2"],
      replayed: false,
    });

    expect(mocks.batch).toHaveBeenCalledOnce();
    const prepared = mocks.batch.mock.calls[0]?.[1] as RecordedStatement[];
    expect(prepared.filter((statement) => statement.sql.includes("UPDATE estimate_contribution_scopes"))).toHaveLength(1);
    expect(prepared.filter((statement) => statement.sql.includes("INSERT INTO estimate_mutation_receipts"))).toHaveLength(1);
    expect(prepared.filter((statement) => statement.sql.includes("estimate_accessory_edges"))).toHaveLength(3);
    expect(mocks.history).toHaveBeenCalledOnce();
  });

  it("keeps mixed role removal in one batch and one revision guard", async () => {
    const fixture = database({ scope: { id: "scope-1", revision: 8 } });

    await applyMaterialAssemblyBulk({
      actor,
      contributionScopeId: base.contributionScopeId,
      database: fixture.db,
      estimateId: base.estimateId,
      estimateTabId: base.estimateTabId,
      expectedContributionRevision: 8,
      intentId: base.intentId,
      projectId: base.projectId,
      operation: {
        kind: "remove_roles",
        changedRowItemIds: ["parent-row", "child-row"],
        groups: [{ groupId: "group-1", expectedGroupRevision: 2 }],
        optionalRows: [{ rowItemId: "parent-row", expectedOptionalRevision: 4 }],
        edges: [{ edgeId: "edge-1", expectedEdgeRevision: 3 }],
      },
    });

    expect(mocks.batch).toHaveBeenCalledOnce();
    const prepared = mocks.batch.mock.calls[0]?.[1] as RecordedStatement[];
    expect(prepared.filter((statement) => statement.sql.includes("UPDATE estimate_contribution_scopes"))).toHaveLength(1);
    expect(prepared.filter((statement) => statement.sql.includes("INSERT INTO estimate_mutation_receipts"))).toHaveLength(1);
    expect(prepared.some((statement) => statement.sql.includes("DELETE FROM estimate_alternative_groups"))).toBe(true);
    expect(prepared.some((statement) => statement.sql.includes("DELETE FROM estimate_optional_items"))).toBe(true);
    expect(prepared.some((statement) => statement.sql.includes("DELETE FROM estimate_accessory_edges"))).toBe(true);
  });

  it("creates an accessory edge with deterministic rule JSON and scope CAS", async () => {
    const fixture = database({ endpoint: { contribution_revision: 3 } });

    await expect(createMaterialAssemblyEdge({
      ...base,
      database: fixture.db,
      expectedContributionRevision: 3,
      quantityRule: { schemaVersion: 1, factor: 2, kind: "per-parent" },
      now: "2026-07-30T00:00:00.000Z",
    })).resolves.toMatchObject({
      contributionRevision: 4,
      edgeRevision: 1,
      kind: "accessory_edge_created",
      replayed: false,
    });

    expect(mocks.prepareIntent).toHaveBeenCalledWith(fixture.db, actor, expect.objectContaining({
      commandKind: "material_assembly.create_accessory_edge",
      request: expect.objectContaining({
        quantityRule: { schemaVersion: 1, kind: "per-parent", factor: 2 },
      }),
    }));
    const prepared = mocks.batch.mock.calls[0]?.[1] as RecordedStatement[];
    const insert = prepared.find((statement) => statement.sql.includes("INSERT INTO estimate_accessory_edges"));
    expect(insert?.values).toContain('{"schemaVersion":1,"kind":"per-parent","factor":2}');
    expect(insert?.sql).toContain("scope.revision = ?");
    expect(prepared.some((statement) => statement.sql.includes("INSERT INTO estimate_mutation_receipts"))).toBe(true);
  });

  it("rejects endpoint scope mismatches before writing", async () => {
    const fixture = database({ endpoint: null });

    await expect(createMaterialAssemblyEdge({
      ...base,
      database: fixture.db,
      expectedContributionRevision: 3,
    })).rejects.toMatchObject<Partial<MaterialAssemblyMutationError>>({ code: "not_found" });
    expect(mocks.batch).not.toHaveBeenCalled();
  });

  it("enforces edge and contribution revisions for updates", async () => {
    const fixture = database({ edge: edgeState(), endpoint: { contribution_revision: 4 } });

    await expect(updateMaterialAssemblyEdge({
      ...base,
      database: fixture.db,
      expectedContributionRevision: 4,
      expectedEdgeRevision: 1,
    })).rejects.toMatchObject<Partial<MaterialAssemblyMutationError>>({ code: "revision_conflict" });
    expect(mocks.batch).not.toHaveBeenCalled();
  });

  it("records a no-op update as an idempotent receipt without bumping revisions", async () => {
    const fixture = database({ edge: edgeState(), endpoint: { contribution_revision: 4 } });

    await expect(updateMaterialAssemblyEdge({
      ...base,
      database: fixture.db,
      expectedContributionRevision: 4,
      expectedEdgeRevision: 2,
    })).resolves.toMatchObject({
      changed: false,
      contributionRevision: 4,
      edgeRevision: 2,
      replayed: false,
    });

    const prepared = mocks.batch.mock.calls[0]?.[1] as RecordedStatement[];
    expect(prepared).toHaveLength(1);
    expect(prepared[0]?.sql).toContain("INSERT INTO estimate_mutation_receipts");
  });

  it("deletes with edge and scope CAS then publishes the new scope revision", async () => {
    const fixture = database({ edge: edgeState() });

    await expect(deleteMaterialAssemblyEdge({
      actor,
      contributionScopeId: base.contributionScopeId,
      database: fixture.db,
      edgeId: base.edgeId,
      estimateId: base.estimateId,
      estimateTabId: base.estimateTabId,
      expectedContributionRevision: 4,
      expectedEdgeRevision: 2,
      intentId: base.intentId,
      now: "2026-07-30T00:00:00.000Z",
      projectId: base.projectId,
    })).resolves.toMatchObject({
      contributionRevision: 5,
      kind: "accessory_edge_deleted",
      replayed: false,
    });

    const prepared = mocks.batch.mock.calls[0]?.[1] as RecordedStatement[];
    expect(prepared.some((statement) => statement.sql.includes("DELETE FROM estimate_accessory_edges"))).toBe(true);
    expect(prepared.some((statement) => statement.sql.includes("publication_source_revision"))).toBe(true);
  });

  it("replays a committed intent without reading or writing assembly state", async () => {
    const fixture = database({});
    mocks.prepareIntent.mockResolvedValueOnce({
      context,
      committedResult: {
        kind: "accessory_edge_deleted",
        edgeId: base.edgeId,
        contributionScopeId: base.contributionScopeId,
        contributionRevision: 5,
      },
    });

    await expect(deleteMaterialAssemblyEdge({
      actor,
      contributionScopeId: base.contributionScopeId,
      database: fixture.db,
      edgeId: base.edgeId,
      estimateId: base.estimateId,
      estimateTabId: base.estimateTabId,
      expectedContributionRevision: 4,
      expectedEdgeRevision: 2,
      intentId: base.intentId,
      projectId: base.projectId,
    })).resolves.toMatchObject({ replayed: true });
    expect(fixture.statements).toHaveLength(0);
    expect(mocks.batch).not.toHaveBeenCalled();
  });
});
