import { beforeEach, describe, expect, it, vi } from "vitest";

const authMocks = vi.hoisted(() => ({
  requireCurrentUserContext: vi.fn(),
}));

const workspaceMocks = vi.hoisted(() => ({
  ensureDefaultWorkspace: vi.fn(),
}));

const d1Mocks = vi.hoisted(() => ({
  getCloudflareD1Database: vi.fn(),
}));

const authzMocks = vi.hoisted(() => ({
  canEditEstimateInD1: vi.fn(),
  isWorkspaceEditorInD1: vi.fn(),
  isWorkspaceMemberInD1: vi.fn(),
}));

vi.mock("@/lib/auth/session", () => authMocks);
vi.mock("@/lib/repositories/workspace-repository", () => workspaceMocks);
vi.mock("@/lib/cloudflare/d1", () => d1Mocks);
vi.mock("@/lib/authz/d1-access", () => authzMocks);
vi.mock("next/cache", () => ({ revalidatePath: vi.fn(), revalidateTag: vi.fn() }));

const WORKSPACE_ID = "11111111-1111-4111-8111-111111111111";
const USER_ID = "22222222-2222-4222-8222-222222222222";
const COMPONENT_IDS = Array.from({ length: 500 }, (_, index) =>
  `00000000-0000-4000-8000-${(index + 1).toString(16).padStart(12, "0")}`,
);

type PreparedStatement = {
  sql: string;
  values: unknown[];
  run: () => Promise<{ success: true; meta: { changes: number } }>;
};

function createD1Fixture() {
  const statements: Array<{ sql: string; values: unknown[] }> = [];
  const database = {
    prepare: vi.fn((sql: string) => ({
      bind: vi.fn((...values: unknown[]) => {
        statements.push({ sql, values });
        const componentIds = values.flatMap((value): string[] => {
          if (typeof value !== "string") return [];
          if (COMPONENT_IDS.includes(value)) return [value];
          try {
            const parsed = JSON.parse(value) as unknown;
            return Array.isArray(parsed)
              ? parsed.filter((id): id is string => typeof id === "string" && COMPONENT_IDS.includes(id))
              : [];
          } catch {
            return [];
          }
        });
        return {
          sql,
          values,
          first: vi.fn(async () =>
            sql.includes("COUNT(*) AS count") ? { count: componentIds.length } : null,
          ),
          all: vi.fn(async () => ({
            success: true,
            results: sql.includes("FROM cost_library_items")
              ? componentIds.map((id) => ({ id, name: `Component ${id}`, lifecycle_state: "available" }))
              : [],
          })),
          run: vi.fn(async () => ({ success: true as const, meta: { changes: componentIds.length || 1 } })),
        };
      }),
    })),
    batch: vi.fn(async (preparedStatements: PreparedStatement[]) =>
      Promise.all(preparedStatements.map((statement) => statement.run())),
    ),
    statements,
  };
  d1Mocks.getCloudflareD1Database.mockResolvedValue(database);
  return database;
}

function expectEveryStatementWithinD1BindBudget(statements: Array<{ sql: string; values: unknown[] }>) {
  expect(statements.length).toBeGreaterThan(0);
  expect(Math.max(...statements.map((statement) => statement.values.length))).toBeLessThanOrEqual(100);
}

beforeEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
  workspaceMocks.ensureDefaultWorkspace.mockResolvedValue({ workspace: { id: WORKSPACE_ID } });
  authMocks.requireCurrentUserContext.mockResolvedValue({ userId: USER_ID, profile: { id: USER_ID } });
  authzMocks.isWorkspaceEditorInD1.mockResolvedValue(true);
  authzMocks.canEditEstimateInD1.mockResolvedValue(true);
  authzMocks.isWorkspaceMemberInD1.mockResolvedValue(true);
});

describe("component library Cloudflare D1 bind budget", () => {
  it("previews and archives the full 500-component UI batch without exceeding 100 binds per statement", async () => {
    const database = createD1Fixture();
    const actions = await import("@/lib/component-library/actions");

    const preview = await actions.previewBulkArchiveLibraryComponents({ itemIds: COMPONENT_IDS });
    expect(preview).toMatchObject({ ok: true, eligibleIds: COMPONENT_IDS });
    expectEveryStatementWithinD1BindBudget(database.statements);

    database.statements.length = 0;
    const result = await actions.executeBulkArchiveLibraryComponents({
      itemIds: COMPONENT_IDS,
      expectedPreviewHash: preview.previewHash ?? "",
    });

    expect(result).toMatchObject({ ok: true, archivedIds: COMPONENT_IDS });
    expectEveryStatementWithinD1BindBudget(database.statements);
    expect(database.statements.filter((statement) => statement.sql.includes("UPDATE cost_library_items"))).toHaveLength(6);
  });

  it("previews and permanently deletes a 500-component unreferenced admin batch within the same bind budget", async () => {
    const database = createD1Fixture();
    const actions = await import("@/lib/component-library/actions");

    const preview = await actions.previewBulkDeleteLibraryComponents({ itemIds: COMPONENT_IDS });
    expect(preview).toMatchObject({
      ok: true,
      eligibleIds: COMPONENT_IDS,
      summary: { estimateRowCount: 0, templateRowCount: 0 },
    });
    expectEveryStatementWithinD1BindBudget(database.statements);

    database.statements.length = 0;
    const result = await actions.executeBulkDeleteLibraryComponents({
      itemIds: COMPONENT_IDS,
      expectedPreviewHash: preview.previewHash ?? "",
    });

    expect(result).toMatchObject({ ok: true, deletedIds: COMPONENT_IDS });
    expectEveryStatementWithinD1BindBudget(database.statements);
    expect(database.batch).toHaveBeenCalledTimes(1);
  });
});
