import { beforeEach, describe, expect, it, vi } from "vitest";

// Regression guard for U11: revalidateTemplateSurfaces() must revalidate BOTH
// template surfaces (the library overview + the templates browse route). A prior
// bug had it call itself recursively, so every template mutation stack-overflowed
// before reaching the second revalidatePath. These server actions had zero
// coverage, so validate stayed green while the feature was broken — this closes
// that gap by driving a real action through the shared revalidation helper.

const cacheMocks = vi.hoisted(() => ({ revalidatePath: vi.fn(), revalidateTag: vi.fn() }));
const authMocks = vi.hoisted(() => ({ requireCurrentUserContext: vi.fn() }));
const workspaceMocks = vi.hoisted(() => ({
  ensureDefaultWorkspace: vi.fn(),
  listCurrentWorkspaceProjects: vi.fn(),
  listProjectEstimateSheets: vi.fn(),
}));
const d1Mocks = vi.hoisted(() => ({ getCloudflareD1Database: vi.fn() }));
const authzMocks = vi.hoisted(() => ({
  canEditEstimateInD1: vi.fn(),
  isWorkspaceEditorInD1: vi.fn(),
  isWorkspaceMemberInD1: vi.fn(),
}));

vi.mock("next/cache", () => cacheMocks);
vi.mock("@/lib/auth/session", () => ({ requireCurrentUserContext: authMocks.requireCurrentUserContext }));
vi.mock("@/lib/cloudflare/d1", () => d1Mocks);
vi.mock("@/lib/authz/d1-access", () => authzMocks);
vi.mock("@/lib/repositories/workspace-repository", () => workspaceMocks);

const WORKSPACE_ID = "11111111-1111-4111-8111-111111111111";
const TEMPLATE_ID = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";

function createD1Fixture(options: {
  firstResults?: unknown[];
  allResults?: unknown[][];
} = {}) {
  const firstResults = [...(options.firstResults ?? [])];
  const allResults = [...(options.allResults ?? [])];
  const statements: Array<{ sql: string; values: unknown[] }> = [];
  const database = {
    prepare: vi.fn((sql: string) => ({
      bind: vi.fn((...values: unknown[]) => {
        statements.push({ sql, values });
        return {
          first: vi.fn(async () => firstResults.shift() ?? null),
          all: vi.fn(async () => ({ success: true, results: allResults.shift() ?? [] })),
          run: vi.fn(async () => ({ success: true, meta: { changes: 1 } })),
        };
      }),
    })),
    statements,
  };
  d1Mocks.getCloudflareD1Database.mockResolvedValue(database);
  return database;
}

beforeEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
  cacheMocks.revalidatePath.mockReset();
  authMocks.requireCurrentUserContext.mockReset().mockResolvedValue({ userId: "user-1" });
  workspaceMocks.ensureDefaultWorkspace.mockReset().mockResolvedValue({ workspace: { id: WORKSPACE_ID } });
  authzMocks.isWorkspaceEditorInD1.mockResolvedValue(true);
  authzMocks.canEditEstimateInD1.mockResolvedValue(true);
  authzMocks.isWorkspaceMemberInD1.mockResolvedValue(true);
});

describe("template-surface revalidation (U11)", () => {
  it("revalidates BOTH the library overview and the templates browse route (no recursion)", async () => {
    createD1Fixture({
      firstResults: [{ id: TEMPLATE_ID, name: "Kitchen Deluxe" }],
    });
    const { renameEstimateTemplate } = await import("@/lib/component-library/actions");

    // Completing at all proves the shared helper does not recurse/stack-overflow.
    const result = await renameEstimateTemplate({ templateId: TEMPLATE_ID, name: "Kitchen Deluxe" });

    expect(result).toEqual({ templateId: TEMPLATE_ID, name: "Kitchen Deluxe" });
    const paths = cacheMocks.revalidatePath.mock.calls.map((call) => call[0]);
    expect(paths).toContain("/workshop/library");
    expect(paths).toContain("/workshop/library/templates");
  });

  it("denies a workspace viewer at the app layer (P3 T17 / F19) without mutating", async () => {
    const d1 = createD1Fixture({
      firstResults: [{ id: TEMPLATE_ID, name: "x" }],
    });
    authzMocks.isWorkspaceEditorInD1.mockResolvedValue(false);
    const { renameEstimateTemplate } = await import("@/lib/component-library/actions");

    await expect(renameEstimateTemplate({ templateId: TEMPLATE_ID, name: "Hijack" })).rejects.toThrow(
      /editors\/admins/,
    );
    // No write reached the DB, and no revalidation fired.
    expect(d1.prepare).not.toHaveBeenCalled();
    expect(cacheMocks.revalidatePath).not.toHaveBeenCalled();
  });

  it("rejects creation when the workspace is at its quota (P3 T19 / F24)", async () => {
    const d1 = createD1Fixture({
      firstResults: [{ count: 2_000 }],
    });
    const { createEstimateTemplate } = await import("@/lib/component-library/actions");

    await expect(createEstimateTemplate({ name: "Over the limit" })).rejects.toThrow(/limit/);
    expect(d1.statements.some((statement) => statement.sql.includes("INSERT INTO estimate_templates"))).toBe(false);
    expect(cacheMocks.revalidatePath).not.toHaveBeenCalled();
  });
});
