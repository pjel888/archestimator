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

  it("denies component create/update/price mutations for workspace viewers before RPC writes", async () => {
    const rpc = vi.fn(async (name: string) => {
      if (name === "is_workspace_editor") return { data: false, error: null };
      return { data: {}, error: null };
    });
    const quotaBuilder: Record<string, unknown> = {};
    quotaBuilder.select = () => quotaBuilder;
    quotaBuilder.eq = () => quotaBuilder;
    quotaBuilder.then = (resolve: (v: { count: number; error: null }) => unknown) =>
      resolve({ count: 0, error: null });
    supabaseServerMocks.createSupabaseServerClient.mockResolvedValue({
      from: () => quotaBuilder,
      rpc,
    });
    const {
      createCostLibraryComponent,
      updateCostLibraryComponent,
      upsertCostLibraryComponentPriceOption,
    } = await import("@/lib/component-library/actions");

    await expect(createCostLibraryComponent({
      name: "Viewer copy",
      category: "Finishes",
      unit: "pc",
      priceOptions: [{ label: "Default", unit: "pc", unitCost: 1, isDefault: true }],
    })).rejects.toThrow(/editors\/admins/);
    await expect(updateCostLibraryComponent("item-1", {
      name: "Viewer edit",
      category: "Finishes",
      unit: "pc",
    })).rejects.toThrow(/editors\/admins/);
    await expect(upsertCostLibraryComponentPriceOption("item-1", {
      label: "Default",
      unit: "pc",
      unitCost: 1,
      isDefault: true,
    })).rejects.toThrow(/editors\/admins/);

    expect(rpc).toHaveBeenCalledTimes(3);
    expect(rpc).toHaveBeenCalledWith("is_workspace_editor", { target_workspace_id: WORKSPACE_ID });
    expect(rpc).not.toHaveBeenCalledWith("create_cost_library_component", expect.anything());
    expect(rpc).not.toHaveBeenCalledWith("update_cost_library_component", expect.anything());
    expect(rpc).not.toHaveBeenCalledWith("upsert_cost_library_component_price_option", expect.anything());
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

describe("component library mutation RPC authorization", () => {
  it("keeps direct component mutation RPCs behind workspace editor checks", async () => {
    const { readFileSync } = await import("node:fs");
    const migration = readFileSync(
      "supabase/migrations/20260616152309_harden_component_library_editor_rpc_access.sql",
      "utf8",
    );

    expect(migration).toContain("public.is_workspace_editor(target_workspace_id) is not true");
    expect(migration).toContain("create or replace function public.validate_cost_library_component_refs");
    expect(migration).toContain("create or replace function public.upsert_cost_library_component_price_option");
    expect(migration).not.toContain("from public.workspace_members member\n    where member.workspace_id = target_workspace_id");
  });
});
