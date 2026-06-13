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
const supabaseServerMocks = vi.hoisted(() => ({ createSupabaseServerClient: vi.fn() }));

vi.mock("next/cache", () => cacheMocks);
vi.mock("@/lib/auth/session", () => ({ requireCurrentUserContext: authMocks.requireCurrentUserContext }));
vi.mock("@/lib/supabase/server", () => supabaseServerMocks);
vi.mock("@/lib/repositories/workspace-repository", () => workspaceMocks);

const WORKSPACE_ID = "11111111-1111-4111-8111-111111111111";
const TEMPLATE_ID = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";

// Chainable Supabase stub: every builder method returns the builder; the terminal
// `.maybeSingle()` resolves to the configured row. Mirrors the rename update chain.
function mockTemplateRow(row: { id: string; name: string }) {
  const builder: Record<string, unknown> = {};
  for (const method of ["update", "eq", "select"]) builder[method] = () => builder;
  builder.maybeSingle = async () => ({ data: row, error: null });
  supabaseServerMocks.createSupabaseServerClient.mockResolvedValue({
    from: () => builder,
    // P3 T17: mutating actions now editor-gate via is_workspace_editor; allow editor here.
    rpc: async () => ({ data: true, error: null }),
  });
}

beforeEach(() => {
  cacheMocks.revalidatePath.mockReset();
  authMocks.requireCurrentUserContext.mockReset().mockResolvedValue({ userId: "user-1" });
  workspaceMocks.ensureDefaultWorkspace.mockReset().mockResolvedValue({ workspace: { id: WORKSPACE_ID } });
  supabaseServerMocks.createSupabaseServerClient.mockReset();
});

describe("template-surface revalidation (U11)", () => {
  it("revalidates BOTH the library overview and the templates browse route (no recursion)", async () => {
    mockTemplateRow({ id: TEMPLATE_ID, name: "Kitchen Deluxe" });
    const { renameEstimateTemplate } = await import("@/lib/component-library/actions");

    // Completing at all proves the shared helper does not recurse/stack-overflow.
    const result = await renameEstimateTemplate({ templateId: TEMPLATE_ID, name: "Kitchen Deluxe" });

    expect(result).toEqual({ templateId: TEMPLATE_ID, name: "Kitchen Deluxe" });
    const paths = cacheMocks.revalidatePath.mock.calls.map((call) => call[0]);
    expect(paths).toContain("/workshop/library");
    expect(paths).toContain("/workshop/library/templates");
  });

  it("denies a workspace viewer at the app layer (P3 T17 / F19) without mutating", async () => {
    // is_workspace_editor returns false → assertCanManageLibrary must throw before any write.
    const builder: Record<string, unknown> = {};
    for (const method of ["update", "eq", "select"]) builder[method] = () => builder;
    const maybeSingle = vi.fn(async () => ({ data: { id: TEMPLATE_ID, name: "x" }, error: null }));
    builder.maybeSingle = maybeSingle;
    supabaseServerMocks.createSupabaseServerClient.mockResolvedValue({
      from: () => builder,
      rpc: async () => ({ data: false, error: null }),
    });
    const { renameEstimateTemplate } = await import("@/lib/component-library/actions");

    await expect(renameEstimateTemplate({ templateId: TEMPLATE_ID, name: "Hijack" })).rejects.toThrow(
      /editors\/admins/,
    );
    // No write reached the DB, and no revalidation fired.
    expect(maybeSingle).not.toHaveBeenCalled();
    expect(cacheMocks.revalidatePath).not.toHaveBeenCalled();
  });

  it("rejects creation when the workspace is at its quota (P3 T19 / F24)", async () => {
    // editor allowed, but the head-count query reports the workspace is at the cap.
    const insert = vi.fn(() => ({ select: () => ({ single: async () => ({ data: {}, error: null }) }) }));
    const quotaBuilder: Record<string, unknown> = {};
    quotaBuilder.select = () => quotaBuilder;
    quotaBuilder.eq = () => quotaBuilder;
    quotaBuilder.then = (resolve: (v: { count: number; error: null }) => unknown) =>
      resolve({ count: 1_000_000, error: null });
    quotaBuilder.insert = insert;
    supabaseServerMocks.createSupabaseServerClient.mockResolvedValue({
      from: () => quotaBuilder,
      rpc: async () => ({ data: true, error: null }),
    });
    const { createEstimateTemplate } = await import("@/lib/component-library/actions");

    await expect(createEstimateTemplate({ name: "Over the limit" })).rejects.toThrow(/limit/);
    expect(insert).not.toHaveBeenCalled();
    expect(cacheMocks.revalidatePath).not.toHaveBeenCalled();
  });
});
