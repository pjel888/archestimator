import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";

const testMocks = vi.hoisted(() => ({
  createSupabaseServerClient: vi.fn(),
  ensureDefaultWorkspace: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: testMocks.createSupabaseServerClient,
}));

vi.mock("@/lib/repositories/workspace-repository", () => ({
  ensureDefaultWorkspace: testMocks.ensureDefaultWorkspace,
}));

const WORKSPACE = {
  id: "workspace-1",
  name: "Workspace One",
  slug: null,
  created_by: "user-1",
};

function createOverviewPayload(overrides: Record<string, unknown> = {}) {
  return {
    componentCount: 2,
    categoryCount: 3,
    supplierCount: 4,
    brandCount: 1,
    templateCount: 2,
    templateCategories: ["Residential", "Commercial"],
    recentComponents: [
      {
        id: "component-1",
        name: "Fast Component",
        category: "Concrete",
        supplier: null,
        unit: "bag",
        unit_cost: 250,
        thumbnail_path: null,
        pricing_source: "Catalog",
        pricing_date: "2026-06-01",
        confidence: "high",
        lifecycle_state: "available",
        updated_at: "2026-06-20T00:00:00.000Z",
      },
    ],
    recentTemplateRows: [
      {
        id: "template-1",
        workspace_id: "workspace-1",
        name: "Starter Template",
        description: "A fast template",
        category: "Residential",
        sort_order: 10,
        metadata: {},
        created_by: null,
        created_at: "2026-06-01T00:00:00.000Z",
        updated_at: "2026-06-21T00:00:00.000Z",
      },
    ],
    recentTemplateNodes: [
      {
        id: "group-1",
        template_id: "template-1",
        parent_id: null,
        kind: "group",
        name: "Shell",
        sort_order: 10,
        metadata: {},
        created_at: "2026-06-01T00:00:00.000Z",
        updated_at: "2026-06-01T00:00:00.000Z",
      },
      {
        id: "area-1",
        template_id: "template-1",
        parent_id: "group-1",
        kind: "area",
        name: "Slab",
        sort_order: 20,
        metadata: {},
        created_at: "2026-06-01T00:00:00.000Z",
        updated_at: "2026-06-01T00:00:00.000Z",
      },
    ],
    recentTemplateRowItems: [
      {
        id: "row-1",
        template_id: "template-1",
        template_node_id: "area-1",
        sort_order: 10,
        source_library_item_id: "component-1",
        source_snapshot: {},
        category_node_id: null,
        supplier_id: null,
        material: "Fast Component",
        description: "",
        supplier: "",
        unit: "bag",
        quantity: 2,
        unit_cost: 100,
        misc_cost: 15,
        contingency_percentage: 0,
        discipline: "",
        designation: "",
        link_state: "linked-clean",
        metadata: {},
        created_at: "2026-06-01T00:00:00.000Z",
        updated_at: "2026-06-01T00:00:00.000Z",
      },
    ],
    health: {
      staleComponentCount: 1,
      discontinuedInUseCount: 0,
      missingBrandCount: 1,
      lastLibraryUpdate: "2026-06-20T00:00:00.000Z",
    },
    ...overrides,
  };
}

function createComponentRowsSeedPayload(overrides: Record<string, unknown> = {}) {
  return {
    componentCount: 0,
    categoryRows: [],
    suppliers: [],
    brands: [],
    libraryFolders: [],
    itemRows: [],
    priceOptions: [],
    costEntries: [],
    ...overrides,
  };
}

function createCostLibraryItemRow(overrides: Record<string, unknown> = {}) {
  return {
    id: "55555555-5555-4555-8555-555555555555",
    workspace_id: WORKSPACE.id,
    name: "Bounded Component",
    description: "",
    supplier: "",
    supplier_id: null,
    brand: null,
    brand_id: null,
    category: "Hardware",
    category_node_id: null,
    library_folder_id: null,
    unit: "pc",
    unit_cost: 10,
    misc_cost: 0,
    pricing_source: "Catalog",
    pricing_date: "2026-06-01",
    confidence: "high",
    metadata: {},
    thumbnail_path: null,
    active_price_option_id: null,
    current_version_number: 1,
    lifecycle_state: "available",
    lifecycle_state_changed_at: "2026-06-20T00:00:00.000Z",
    created_at: "2026-06-20T00:00:00.000Z",
    updated_at: "2026-06-20T00:00:00.000Z",
    ...overrides,
  };
}

function createTemplatesSeedPayload(overrides: Record<string, unknown> = {}) {
  return {
    templates: [
      {
        id: "11111111-1111-4111-8111-111111111111",
        workspace_id: WORKSPACE.id,
        name: "Starter Template",
        description: "A fast template",
        category: "Residential",
        sort_order: 10,
        metadata: {},
        created_by: null,
        created_at: "2026-06-01T00:00:00.000Z",
        updated_at: "2026-06-21T00:00:00.000Z",
      },
    ],
    nodes: [
      {
        id: "22222222-2222-4222-8222-222222222222",
        template_id: "11111111-1111-4111-8111-111111111111",
        parent_id: null,
        kind: "group",
        name: "Shell",
        sort_order: 10,
        metadata: {},
        created_at: "2026-06-01T00:00:00.000Z",
        updated_at: "2026-06-01T00:00:00.000Z",
      },
      {
        id: "33333333-3333-4333-8333-333333333333",
        template_id: "11111111-1111-4111-8111-111111111111",
        parent_id: "22222222-2222-4222-8222-222222222222",
        kind: "area",
        name: "Slab",
        sort_order: 20,
        metadata: {},
        created_at: "2026-06-01T00:00:00.000Z",
        updated_at: "2026-06-01T00:00:00.000Z",
      },
    ],
    rowItems: [
      {
        id: "44444444-4444-4444-8444-444444444444",
        template_id: "11111111-1111-4111-8111-111111111111",
        template_node_id: "33333333-3333-4333-8333-333333333333",
        sort_order: 10,
        source_library_item_id: null,
        source_snapshot: {},
        category_node_id: null,
        supplier_id: null,
        material: "Fast Component",
        description: "",
        supplier: "",
        unit: "bag",
        quantity: 2,
        unit_cost: 100,
        misc_cost: 15,
        contingency_percentage: 0,
        discipline: "",
        designation: "",
        link_state: "linked-clean",
        metadata: {},
        created_at: "2026-06-01T00:00:00.000Z",
        updated_at: "2026-06-01T00:00:00.000Z",
      },
    ],
    ...overrides,
  };
}

function createSupabaseTableChain(result: { data: unknown[] | null; error: unknown }) {
  const chain = {
    select: vi.fn(() => chain),
    eq: vi.fn(() => chain),
    neq: vi.fn(() => chain),
    in: vi.fn(() => chain),
    is: vi.fn(() => chain),
    order: vi.fn(() => chain),
    limit: vi.fn(() => Promise.resolve(result)),
    range: vi.fn(() => Promise.resolve(result)),
    maybeSingle: vi.fn(() => Promise.resolve({ data: result.data?.[0] ?? null, error: result.error })),
    then: (resolve: (value: typeof result) => unknown, reject?: (reason: unknown) => unknown) =>
      Promise.resolve(result).then(resolve, reject),
  };
  return chain;
}

beforeEach(() => {
  vi.resetModules();
  testMocks.createSupabaseServerClient.mockReset();
  testMocks.ensureDefaultWorkspace.mockReset().mockResolvedValue({
    workspace: WORKSPACE,
    profile: { id: "user-1" },
  });
});

describe("library_overview_summary RPC contract", () => {
  it("defines an invoker JSONB RPC with explicit grants and workspace-gated output", () => {
    const migrationPath = "supabase/migrations/20260625010000_library_overview_summary.sql";
    const migration = readFileSync(join(process.cwd(), migrationPath), "utf8");

    expect(existsSync(join(process.cwd(), migrationPath))).toBe(true);
    expect(migration).toMatch(/create or replace function public\.library_overview_summary\(\s*target_workspace_id uuid\s*\)/i);
    expect(migration).toMatch(/returns jsonb/i);
    expect(migration).toMatch(/language sql/i);
    expect(migration).toMatch(/stable/i);
    expect(migration).toMatch(/security invoker/i);
    expect(migration).toMatch(/set search_path = public/i);
    expect(migration).toContain("authorized_workspace");
    expect(migration).toContain("public.is_workspace_member(workspace.id)");
    expect(migration).not.toContain("public.is_platform_admin()");
    expect(migration).toContain("cross join public.component_category_nodes category");
    expect(migration).toContain("item.lifecycle_state <> 'archived'");
    expect(migration).toContain("limit 6");
    expect(migration).toContain("limit 5");
    expect(migration).toContain("revoke execute on function public.library_overview_summary(uuid) from public, anon");
    expect(migration).toContain("grant execute on function public.library_overview_summary(uuid) to authenticated");
  });

  it("splices additive Supabase types and a rollout-safe repository path", () => {
    const repository = readFileSync(
      join(process.cwd(), "src/lib/repositories/component-library-repository.ts"),
      "utf8",
    );
    const types = readFileSync(join(process.cwd(), "src/lib/supabase/types.ts"), "utf8");

    expect(types).toContain("library_overview_summary");
    expect(types).toContain("Args: { target_workspace_id: string }");
    expect(types).toContain("Returns: Json");
    expect(repository).toContain("WORKSHOP_LIBRARY_OVERVIEW_RPC_DISABLED");
    expect(repository).not.toContain("NEXT_PUBLIC_WORKSHOP_LIBRARY_OVERVIEW_RPC_DISABLED");
    expect(repository).toContain('rpc("library_overview_summary"');
    expect(repository).toContain("getLibraryOverviewAppPath");
    expect(repository).toContain("using app path");
  });

  it("assembles the overview through the RPC fast path with app-path semantics", async () => {
    const rpcClient = {
      rpc: vi.fn(async () => ({ data: createOverviewPayload(), error: null })),
      from: vi.fn(() => {
        throw new Error("RPC fast path should not issue table reads");
      }),
    };
    testMocks.createSupabaseServerClient.mockResolvedValue(rpcClient);

    const { getLibraryOverview } = await import("@/lib/repositories/component-library-repository");
    const overview = await getLibraryOverview();

    expect(rpcClient.rpc).toHaveBeenCalledWith("library_overview_summary", {
      target_workspace_id: WORKSPACE.id,
    });
    expect(overview.componentCount).toBe(2);
    expect(overview.recentComponents[0]).toMatchObject({
      id: "component-1",
      supplier: "",
      unitCost: 250,
    });
    expect(overview.templateCategories).toEqual(["Commercial", "Residential"]);
    expect(overview.recentTemplates[0]).toMatchObject({
      id: "template-1",
      groupCount: 1,
      areaCount: 1,
      rowCount: 1,
      total: 215,
    });
    expect(overview.health).toEqual({
      staleComponentCount: 1,
      discontinuedInUseCount: 0,
      missingBrandCount: 1,
      lastLibraryUpdate: "2026-06-20T00:00:00.000Z",
    });
  });

  it("rejects incompatible payloads instead of casting them silently", async () => {
    const { parseLibraryOverviewSummaryPayload } = await import("@/lib/repositories/component-library-repository");

    expect(() => parseLibraryOverviewSummaryPayload(null)).toThrow("library_overview_summary invalid payload");
    expect(() => parseLibraryOverviewSummaryPayload(createOverviewPayload({ recentComponents: "not-an-array" }))).toThrow(
      "recentComponents is not an array",
    );
    expect(() => parseLibraryOverviewSummaryPayload(createOverviewPayload({ recentTemplateRows: ["bad-row"] }))).toThrow(
      /library_overview_summary invalid array element.*recentTemplateRows\[0\]/,
    );
    expect(() => parseLibraryOverviewSummaryPayload(createOverviewPayload({ componentCount: "2" }))).toThrow(
      "componentCount must be a number",
    );
    expect(() => parseLibraryOverviewSummaryPayload(createOverviewPayload({ health: { staleComponentCount: 1 } }))).toThrow(
      "health.discontinuedInUseCount must be a number",
    );
  });
});

describe("library_component_rows_seed RPC contract", () => {
  it("defines an invoker JSONB RPC with explicit grants and workspace-gated browse seed arrays", () => {
    const migrationPath = "supabase/migrations/20260625013000_library_component_rows_seed.sql";
    const migration = readFileSync(join(process.cwd(), migrationPath), "utf8");

    expect(existsSync(join(process.cwd(), migrationPath))).toBe(true);
    expect(migration).toMatch(/create or replace function public\.library_component_rows_seed\(\s*target_workspace_id uuid\s*\)/i);
    expect(migration).toMatch(/returns jsonb/i);
    expect(migration).toMatch(/language sql/i);
    expect(migration).toMatch(/stable/i);
    expect(migration).toMatch(/security invoker/i);
    expect(migration).toMatch(/set search_path = public/i);
    expect(migration).toContain("authorized_workspace");
    expect(migration).toContain("public.is_workspace_member(workspace.id)");
    expect(migration).not.toContain("public.is_platform_admin()");
    expect(migration).toContain("item.lifecycle_state <> 'archived'");
    expect(migration).toContain("public.cost_library_item_price_options");
    expect(migration).toContain("public.cost_library_item_variant_cost_entries");
    expect(migration).toContain("revoke execute on function public.library_component_rows_seed(uuid) from public, anon");
    expect(migration).toContain("grant execute on function public.library_component_rows_seed(uuid) to authenticated");
  });

  it("adds an item-limit signature for partial first paint seeds", () => {
    const migrationPath = "supabase/migrations/20260625020000_library_component_rows_seed_item_limit.sql";
    const migration = readFileSync(join(process.cwd(), migrationPath), "utf8");

    expect(existsSync(join(process.cwd(), migrationPath))).toBe(true);
    expect(migration).toMatch(/drop function if exists public\.library_component_rows_seed\(uuid\)/i);
    expect(migration).toMatch(/target_workspace_id uuid,\s*item_limit integer default null/i);
    expect(migration).toContain("'componentCount'");
    expect(migration).toContain("limit (select value from bounded_limit)");
    expect(migration).toContain("public.is_workspace_member(workspace.id)");
    expect(migration).not.toContain("public.is_platform_admin()");
    expect(migration).toContain("revoke execute on function public.library_component_rows_seed(uuid, integer) from public, anon");
    expect(migration).toContain("grant execute on function public.library_component_rows_seed(uuid, integer) to authenticated");
  });

  it("keeps the item-limit RPC on an explicit browse projection", () => {
    const migrationPath = "supabase/migrations/20260625023000_library_component_rows_seed_browse_projection.sql";
    const migration = readFileSync(join(process.cwd(), migrationPath), "utf8");

    expect(existsSync(join(process.cwd(), migrationPath))).toBe(true);
    expect(migration).toMatch(/create or replace function public\.library_component_rows_seed\(\s*target_workspace_id uuid,\s*item_limit integer default null\s*\)/i);
    expect(migration).toContain("item.active_price_option_id");
    expect(migration).toContain("option_row.active_cost_entry_id");
    expect(migration).toContain("cost_entry.price_option_id");
    expect(migration).toContain("select supplier.id, supplier.name, supplier.normalized_name, supplier.sort_order");
    expect(migration).toContain("folder.source_category_node_id");
    expect(migration).not.toContain("select item.*\n  from public.cost_library_items");
    expect(migration).toContain("revoke execute on function public.library_component_rows_seed(uuid, integer) from public, anon");
    expect(migration).toContain("grant execute on function public.library_component_rows_seed(uuid, integer) to authenticated");
  });

  it("adds a partial browse-order index for the limited first-paint seed", () => {
    const migrationPath = "supabase/migrations/20260625024500_library_component_rows_seed_browse_index.sql";
    const migration = readFileSync(join(process.cwd(), migrationPath), "utf8");

    expect(existsSync(join(process.cwd(), migrationPath))).toBe(true);
    expect(migration).toContain("create index if not exists cost_library_items_workspace_browse_active_idx");
    expect(migration).toContain("on public.cost_library_items(workspace_id, category, name, id)");
    expect(migration).toContain("where lifecycle_state <> 'archived'");
  });

  it("splices additive Supabase types and a rollout-safe components browse path", () => {
    const repository = readFileSync(
      join(process.cwd(), "src/lib/repositories/component-library-repository.ts"),
      "utf8",
    );
    const types = readFileSync(join(process.cwd(), "src/lib/supabase/types.ts"), "utf8");

    expect(types).toContain("library_component_rows_seed");
    expect(types).toContain("Args: { item_limit?: number | null; target_workspace_id: string }");
    expect(types).toContain("Returns: Json");
    expect(repository).toContain("WORKSHOP_LIBRARY_COMPONENT_ROWS_RPC_DISABLED");
    expect(repository).not.toContain("NEXT_PUBLIC_WORKSHOP_LIBRARY_COMPONENT_ROWS_RPC_DISABLED");
    expect(repository).toContain('rpc("library_component_rows_seed"');
    expect(repository).toContain("loadCurrentWorkspaceComponentRowsLibraryAppPath");
    expect(repository).toContain("using app path");
  });

  it("assembles the components browse seed through the RPC fast path without table reads", async () => {
    const rpcClient = {
      rpc: vi.fn(async () => ({ data: createComponentRowsSeedPayload(), error: null })),
      from: vi.fn(() => {
        throw new Error("RPC fast path should not issue table reads");
      }),
    };
    testMocks.createSupabaseServerClient.mockResolvedValue(rpcClient);

    const { getCurrentWorkspaceComponentRowsLibrary } = await import("@/lib/repositories/component-library-repository");
    const library = await getCurrentWorkspaceComponentRowsLibrary({ includeDetailGraph: false });

    expect(rpcClient.rpc).toHaveBeenCalledWith("library_component_rows_seed", {
      item_limit: null,
      target_workspace_id: WORKSPACE.id,
    });
    expect(library.workspaceId).toBe(WORKSPACE.id);
    expect(library.categoryTree.length).toBeGreaterThan(0);
    expect(library.suppliers).toEqual([]);
    expect(library.brands).toEqual([]);
    expect(library.libraryFolders).toEqual([]);
    expect(library.libraryItems).toEqual([]);
  });

  it("passes item limits through the RPC fast path and marks partial browse seeds", async () => {
    const rpcClient = {
      rpc: vi.fn(async () => ({
        data: createComponentRowsSeedPayload({
          componentCount: 2,
          itemRows: [createCostLibraryItemRow()],
        }),
        error: null,
      })),
      from: vi.fn(() => {
        throw new Error("RPC fast path should not issue table reads");
      }),
    };
    testMocks.createSupabaseServerClient.mockResolvedValue(rpcClient);

    const { getCurrentWorkspaceComponentRowsLibrary } = await import("@/lib/repositories/component-library-repository");
    const library = await getCurrentWorkspaceComponentRowsLibrary({ includeDetailGraph: false, itemLimit: 48 });

    expect(rpcClient.rpc).toHaveBeenCalledWith("library_component_rows_seed", {
      item_limit: 48,
      target_workspace_id: WORKSPACE.id,
    });
    expect(library.libraryItems).toHaveLength(1);
    expect(library.isPartial).toBe(true);
    expect(library.loadedComponentCount).toBe(1);
    expect(library.totalComponentCount).toBe(2);
  });

  it("does not mark bounded app-path fallback seeds partial when fewer rows than the limit are returned", async () => {
    const previousFlag = process.env.WORKSHOP_LIBRARY_COMPONENT_ROWS_RPC_DISABLED;
    process.env.WORKSHOP_LIBRARY_COMPONENT_ROWS_RPC_DISABLED = "1";
    const rowsByTable: Record<string, unknown[]> = {
      component_category_nodes: [],
      component_suppliers: [],
      component_brands: [],
      library_folders: [],
      cost_library_items: [createCostLibraryItemRow()],
      cost_library_item_price_options: [],
      cost_library_item_variant_cost_entries: [],
    };
    const appPathClient = {
      rpc: vi.fn(() => {
        throw new Error("RPC should be disabled for this fallback test");
      }),
      from: vi.fn((table: string) => createSupabaseTableChain({
        data: rowsByTable[table] ?? [],
        error: null,
      })),
    };
    testMocks.createSupabaseServerClient.mockResolvedValue(appPathClient);

    try {
      const { getCurrentWorkspaceComponentRowsLibrary } = await import("@/lib/repositories/component-library-repository");
      const library = await getCurrentWorkspaceComponentRowsLibrary({ includeDetailGraph: false, itemLimit: 48 });

      expect(appPathClient.rpc).toHaveBeenCalledTimes(0);
      expect(appPathClient.from.mock.calls.map(([table]) => table)).toContain("cost_library_items");
      expect(library.libraryItems).toHaveLength(1);
      expect(library.isPartial).toBe(false);
      expect(library.loadedComponentCount).toBe(1);
      expect(library.totalComponentCount).toBe(1);
    } finally {
      if (previousFlag === undefined) {
        delete process.env.WORKSHOP_LIBRARY_COMPONENT_ROWS_RPC_DISABLED;
      } else {
        process.env.WORKSHOP_LIBRARY_COMPONENT_ROWS_RPC_DISABLED = previousFlag;
      }
    }
  });

  it("keeps the components browse seed slim while preserving current price fields", async () => {
    const createdAt = "2026-06-20T00:00:00.000Z";
    const itemId = "component-1";
    const priceOptionId = "price-option-1";
    const rpcClient = {
      rpc: vi.fn(async () => ({
        data: createComponentRowsSeedPayload({
          itemRows: [
            {
              id: itemId,
              workspace_id: WORKSPACE.id,
              name: "Fast Cabinet Pull",
              description: "Browse row",
              supplier: "Supplier A",
              supplier_id: null,
              brand: "Brand A",
              brand_id: null,
              category: "Hardware",
              category_node_id: null,
              library_folder_id: null,
              unit: "pc",
              unit_cost: 100,
              misc_cost: 5,
              pricing_source: "Catalog",
              pricing_date: "2026-06-01",
              confidence: "high",
              metadata: { sourceUrl: "https://example.com/detail-only", notes: "detail-only" },
              thumbnail_path: null,
              active_price_option_id: priceOptionId,
              current_version_number: 7,
              lifecycle_state: "available",
              lifecycle_state_changed_at: createdAt,
              created_at: createdAt,
              updated_at: createdAt,
            },
          ],
          priceOptions: [
            {
              id: priceOptionId,
              workspace_id: WORKSPACE.id,
              item_id: itemId,
              label: "Current option",
              sku: "SKU-1",
              variant_description: "Detail-only variant",
              variant_sort_order: 1,
              unit: "pc",
              unit_cost: 250,
              misc_cost: 15,
              currency: "PHP",
              pricing_source: "Supplier quote",
              pricing_date: "2026-06-15",
              confidence: "medium",
              source_url: "https://example.com/variant",
              notes: "detail-only option notes",
              supplier_id: null,
              active_cost_entry_id: "cost-entry-1",
              package_quantity: null,
              package_unit: null,
              dimension_length: null,
              dimension_width: null,
              dimension_height: null,
              dimension_unit: null,
              mass: null,
              mass_unit: null,
              image_bucket: null,
              image_path: null,
              thumbnail_path: null,
              image_metadata: {},
              variant_metadata: {},
              is_active: true,
              is_default: true,
              created_at: createdAt,
              updated_at: createdAt,
            },
          ],
          costEntries: [
            {
              id: "cost-entry-1",
              workspace_id: WORKSPACE.id,
              item_id: itemId,
              price_option_id: priceOptionId,
              unit_cost: 321,
              misc_cost: 9,
              currency: "PHP",
              pricing_source: "Latest supplier quote",
              pricing_date: "2026-06-22",
              confidence: "high",
              source_url: "https://example.com/cost-entry",
              notes: "detail-only cost entry notes",
              is_current: true,
              deleted_at: null,
              created_at: createdAt,
              updated_at: createdAt,
            },
          ],
        }),
        error: null,
      })),
      from: vi.fn(() => {
        throw new Error("RPC fast path should not issue table reads");
      }),
    };
    testMocks.createSupabaseServerClient.mockResolvedValue(rpcClient);

    const { getCurrentWorkspaceComponentRowsLibrary } = await import("@/lib/repositories/component-library-repository");
    const library = await getCurrentWorkspaceComponentRowsLibrary({ includeDetailGraph: false });
    const [item] = library.libraryItems;

    expect(item).toMatchObject({
      id: itemId,
      itemCost: 321,
      miscCost: 9,
      pricingSource: "Latest supplier quote",
      pricingDate: "2026-06-22",
      confidence: "high",
      priceOptionId,
      priceOptionLabel: "Current option",
    });
    expect(item).not.toHaveProperty("priceOptions");
    expect(item).not.toHaveProperty("history");
    expect(item).not.toHaveProperty("notes");
    expect(item).not.toHaveProperty("sourceUrl");
  });

  it("rejects incompatible component browse payloads instead of casting them silently", async () => {
    const { parseLibraryComponentRowsSeedPayload } = await import("@/lib/repositories/component-library-repository");

    expect(() => parseLibraryComponentRowsSeedPayload(null)).toThrow("library_component_rows_seed invalid payload");
    expect(() => parseLibraryComponentRowsSeedPayload(createComponentRowsSeedPayload({ suppliers: "not-an-array" }))).toThrow(
      "suppliers is not an array",
    );
    expect(() => parseLibraryComponentRowsSeedPayload(createComponentRowsSeedPayload({ itemRows: ["bad-row"] }))).toThrow(
      /library_component_rows_seed invalid array element.*itemRows\[0\]/,
    );
  });
});

describe("library_templates_seed RPC contract", () => {
  it("defines an invoker JSONB RPC with explicit grants and workspace-gated template arrays", () => {
    const migrationPath = "supabase/migrations/20260625021500_library_templates_seed.sql";
    const migration = readFileSync(join(process.cwd(), migrationPath), "utf8");

    expect(existsSync(join(process.cwd(), migrationPath))).toBe(true);
    expect(migration).toMatch(/create or replace function public\.library_templates_seed\(\s*target_workspace_id uuid,\s*target_template_id uuid default null\s*\)/i);
    expect(migration).toMatch(/returns jsonb/i);
    expect(migration).toMatch(/language sql/i);
    expect(migration).toMatch(/stable/i);
    expect(migration).toMatch(/security invoker/i);
    expect(migration).toMatch(/set search_path = public/i);
    expect(migration).toContain("authorized_workspace");
    expect(migration).toContain("public.is_workspace_member(workspace.id)");
    expect(migration).not.toContain("public.is_platform_admin()");
    expect(migration).toContain("target_template_id is null");
    expect(migration).toContain("public.estimate_template_nodes");
    expect(migration).toContain("public.estimate_template_row_items");
    expect(migration).toContain("revoke execute on function public.library_templates_seed(uuid, uuid) from public, anon");
    expect(migration).toContain("grant execute on function public.library_templates_seed(uuid, uuid) to authenticated");
  });

  it("splices additive Supabase types and a rollout-safe templates path", () => {
    const repository = readFileSync(
      join(process.cwd(), "src/lib/repositories/component-library-repository.ts"),
      "utf8",
    );
    const types = readFileSync(join(process.cwd(), "src/lib/supabase/types.ts"), "utf8");

    expect(types).toContain("library_templates_seed");
    expect(types).toContain("target_template_id?: string | null");
    expect(types).toContain("target_workspace_id: string");
    expect(types).toContain("Returns: Json");
    expect(repository).toContain("WORKSHOP_LIBRARY_TEMPLATES_RPC_DISABLED");
    expect(repository).not.toContain("NEXT_PUBLIC_WORKSHOP_LIBRARY_TEMPLATES_RPC_DISABLED");
    expect(repository).toContain('rpc("library_templates_seed"');
    expect(repository).toContain("loadCurrentWorkspaceEstimateTemplatesAppPath");
    expect(repository).toContain("parseLibraryTemplatesSeedPayload");
    expect(repository).toContain("using app path");
  });

  it("assembles the templates browse seed through the RPC fast path without table reads", async () => {
    const rpcClient = {
      rpc: vi.fn(async () => ({ data: createTemplatesSeedPayload(), error: null })),
      from: vi.fn(() => {
        throw new Error("RPC fast path should not issue table reads");
      }),
    };
    testMocks.createSupabaseServerClient.mockResolvedValue(rpcClient);

    const { getCurrentWorkspaceEstimateTemplatesSeed } = await import("@/lib/repositories/component-library-repository");
    const seed = await getCurrentWorkspaceEstimateTemplatesSeed();

    expect(rpcClient.rpc).toHaveBeenCalledWith("library_templates_seed", {
      target_template_id: null,
      target_workspace_id: WORKSPACE.id,
    });
    expect(seed.workspaceId).toBe(WORKSPACE.id);
    expect(seed.templates).toHaveLength(1);
    expect(seed.templates[0]).toMatchObject({
      id: "11111111-1111-4111-8111-111111111111",
      nodes: [
        {
          id: "22222222-2222-4222-8222-222222222222",
          children: [
            {
              id: "33333333-3333-4333-8333-333333333333",
              estimateRowItems: [
                {
                  id: "44444444-4444-4444-8444-444444444444",
                  totalItemCosts: 215,
                },
              ],
            },
          ],
        },
      ],
    });
  });

  it("loads a single template detail through the RPC fast path", async () => {
    const templateId = "11111111-1111-4111-8111-111111111111";
    const rpcClient = {
      rpc: vi.fn(async () => ({ data: createTemplatesSeedPayload(), error: null })),
      from: vi.fn(() => {
        throw new Error("RPC fast path should not issue table reads");
      }),
    };
    testMocks.createSupabaseServerClient.mockResolvedValue(rpcClient);

    const { getEstimateTemplateById } = await import("@/lib/repositories/component-library-repository");
    const template = await getEstimateTemplateById(templateId);

    expect(rpcClient.rpc).toHaveBeenCalledWith("library_templates_seed", {
      target_template_id: templateId,
      target_workspace_id: WORKSPACE.id,
    });
    expect(template).toMatchObject({
      id: templateId,
      nodes: [
        {
          id: "22222222-2222-4222-8222-222222222222",
          children: [
            {
              id: "33333333-3333-4333-8333-333333333333",
              estimateRowItems: [
                {
                  id: "44444444-4444-4444-8444-444444444444",
                  totalItemCosts: 215,
                },
              ],
            },
          ],
        },
      ],
    });
  });

  it("rejects incompatible template seed payloads instead of casting them silently", async () => {
    const { parseLibraryTemplatesSeedPayload } = await import("@/lib/repositories/component-library-repository");

    expect(() => parseLibraryTemplatesSeedPayload(null)).toThrow("library_templates_seed invalid payload");
    expect(() => parseLibraryTemplatesSeedPayload(createTemplatesSeedPayload({ templates: "not-an-array" }))).toThrow(
      "templates is not an array",
    );
    expect(() => parseLibraryTemplatesSeedPayload(createTemplatesSeedPayload({ nodes: ["bad-row"] }))).toThrow(
      /library_templates_seed invalid array element.*nodes\[0\]/,
    );
    expect(() => parseLibraryTemplatesSeedPayload(createTemplatesSeedPayload({ templates: [{ id: "template-1" }] }))).toThrow(
      /library_templates_seed invalid row shape/,
    );
  });
});
