import { readFileSync } from "node:fs";
import { join } from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";

const testMocks = vi.hoisted(() => ({
  getCloudflareD1Database: vi.fn(),
  ensureDefaultWorkspace: vi.fn(),
}));

vi.mock("@/lib/cloudflare/d1", () => ({
  getCloudflareD1Database: testMocks.getCloudflareD1Database,
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

const TEMPLATE_ID = "11111111-1111-4111-8111-111111111111";
const GROUP_NODE_ID = "22222222-2222-4222-8222-222222222222";
const AREA_NODE_ID = "33333333-3333-4333-8333-333333333333";
const ROW_ID = "44444444-4444-4444-8444-444444444444";
const ITEM_ID = "55555555-5555-4555-8555-555555555555";
const PRICE_OPTION_ID = "66666666-6666-4666-8666-666666666666";
const COST_ENTRY_ID = "77777777-7777-4777-8777-777777777777";

function createOverviewPayload(overrides: Record<string, unknown> = {}) {
  return {
    componentCount: 2,
    categoryCount: 1,
    supplierCount: 1,
    brandCount: 1,
    templateCount: 1,
    templateCategories: ["Residential"],
    recentComponents: [createCostLibraryItemRow()],
    recentTemplateRows: [createTemplateRow()],
    recentTemplateNodes: createTemplateNodes(),
    recentTemplateRowItems: createTemplateRowItems(),
    health: {
      staleComponentCount: 1,
      discontinuedInUseCount: 0,
      missingBrandCount: 1,
      lastLibraryUpdate: "2026-06-22T00:00:00.000Z",
    },
    ...overrides,
  };
}

function createCategoryRows() {
  return [
    {
      id: "category-concrete",
      parent_id: null,
      label: "Concrete",
      node_type: "category",
      sort_order: 10,
      code: "CON",
      metadata: {},
    },
  ];
}

function createCostLibraryItemRow(overrides: Record<string, unknown> = {}) {
  return {
    id: ITEM_ID,
    workspace_id: WORKSPACE.id,
    name: "Fast Component",
    description: "Browse row",
    supplier: "Supplier A",
    supplier_id: null,
    brand: "Brand A",
    brand_id: null,
    category: "Concrete",
    category_node_id: "category-concrete",
    library_folder_id: null,
    unit: "bag",
    unit_cost: 100,
    misc_cost: 5,
    pricing_source: "Catalog",
    pricing_date: "2026-06-01",
    confidence: "high",
    metadata: { source: "library", sourceUrl: "https://example.com/detail-only", notes: "detail-only" },
    thumbnail_path: null,
    active_price_option_id: PRICE_OPTION_ID,
    current_version_number: 7,
    lifecycle_state: "available",
    lifecycle_state_changed_at: "2026-06-20T00:00:00.000Z",
    created_at: "2026-06-20T00:00:00.000Z",
    updated_at: "2026-06-22T00:00:00.000Z",
    ...overrides,
  };
}

function createPriceOptionRow(overrides: Record<string, unknown> = {}) {
  return {
    id: PRICE_OPTION_ID,
    workspace_id: WORKSPACE.id,
    item_id: ITEM_ID,
    label: "Current option",
    sku: "SKU-1",
    variant_description: "Detail-only variant",
    variant_sort_order: 1,
    unit: "bag",
    unit_cost: 250,
    misc_cost: 15,
    currency: "PHP",
    pricing_source: "Supplier quote",
    pricing_date: "2026-06-15",
    confidence: "medium",
    source_url: "https://example.com/variant",
    notes: "detail-only option notes",
    supplier_id: null,
    active_cost_entry_id: COST_ENTRY_ID,
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
    metadata_json: {},
    variant_metadata: {},
    is_active: 1,
    is_default: 1,
    created_at: "2026-06-20T00:00:00.000Z",
    updated_at: "2026-06-22T00:00:00.000Z",
    ...overrides,
  };
}

function createCostEntryRow(overrides: Record<string, unknown> = {}) {
  return {
    id: COST_ENTRY_ID,
    workspace_id: WORKSPACE.id,
    item_id: ITEM_ID,
    price_option_id: PRICE_OPTION_ID,
    unit_cost: 321,
    misc_cost: 9,
    currency: "PHP",
    pricing_source: "Latest supplier quote",
    pricing_date: "2026-06-22",
    confidence: "high",
    source_url: "https://example.com/cost-entry",
    notes: "detail-only cost entry notes",
    is_current: 1,
    deleted_at: null,
    created_at: "2026-06-21T00:00:00.000Z",
    updated_at: "2026-06-22T00:00:00.000Z",
    ...overrides,
  };
}

function createTemplateRow(overrides: Record<string, unknown> = {}) {
  return {
    id: TEMPLATE_ID,
    workspace_id: WORKSPACE.id,
    name: "Starter Template",
    description: "A fast template",
    category: "Residential",
    sort_order: 10,
    metadata: {},
    created_by: null,
    created_at: "2026-06-01T00:00:00.000Z",
    updated_at: "2026-06-21T00:00:00.000Z",
    ...overrides,
  };
}

function createTemplateNodes() {
  return [
    {
      id: GROUP_NODE_ID,
      template_id: TEMPLATE_ID,
      parent_id: null,
      kind: "group",
      name: "Shell",
      sort_order: 10,
      metadata: {},
      created_at: "2026-06-01T00:00:00.000Z",
      updated_at: "2026-06-01T00:00:00.000Z",
    },
    {
      id: AREA_NODE_ID,
      template_id: TEMPLATE_ID,
      parent_id: GROUP_NODE_ID,
      kind: "area",
      name: "Slab",
      sort_order: 20,
      metadata: {},
      created_at: "2026-06-01T00:00:00.000Z",
      updated_at: "2026-06-01T00:00:00.000Z",
    },
  ];
}

function createTemplateRowItems() {
  return [
    {
      id: ROW_ID,
      template_id: TEMPLATE_ID,
      template_node_id: AREA_NODE_ID,
      sort_order: 10,
      source_library_item_id: ITEM_ID,
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
  ];
}

function createComponentLibraryD1Payload(overrides: Partial<ComponentLibraryD1Payload> = {}): ComponentLibraryD1Payload {
  return {
    categoryRows: createCategoryRows(),
    suppliers: [
      {
        id: "supplier-1",
        name: "Supplier A",
        normalized_name: "supplier a",
        sort_order: 1,
      },
    ],
    brands: [
      {
        id: "brand-1",
        name: "Brand A",
        normalized_name: "brand a",
        sort_order: 1,
      },
    ],
    libraryFolders: [],
    itemRows: [createCostLibraryItemRow()],
    priceOptions: [createPriceOptionRow()],
    costEntries: [createCostEntryRow()],
    templates: [createTemplateRow()],
    nodes: createTemplateNodes(),
    rowItems: createTemplateRowItems(),
    discontinuedRows: [],
    templateRefRows: [],
    estimateRefRows: [],
    overview: createOverviewPayload(),
    ...overrides,
  };
}

type ComponentLibraryD1Payload = {
  categoryRows: Record<string, unknown>[];
  suppliers: Record<string, unknown>[];
  brands: Record<string, unknown>[];
  libraryFolders: Record<string, unknown>[];
  itemRows: Record<string, unknown>[];
  priceOptions: Record<string, unknown>[];
  costEntries: Record<string, unknown>[];
  templates: Record<string, unknown>[];
  nodes: Record<string, unknown>[];
  rowItems: Record<string, unknown>[];
  discontinuedRows: Record<string, unknown>[];
  templateRefRows: Record<string, unknown>[];
  estimateRefRows: Record<string, unknown>[];
  overview: ReturnType<typeof createOverviewPayload>;
};

type D1Value = string | number | boolean | null | ArrayBuffer;

type PreparedD1Statement = {
  sql: string;
  values: D1Value[];
};

class FakeComponentLibraryD1Statement {
  private values: D1Value[] = [];

  constructor(
    private readonly database: FakeComponentLibraryD1Database,
    private readonly sql: string,
  ) {}

  bind(...values: D1Value[]) {
    this.values = values;
    this.database.prepared.push({ sql: this.sql, values });
    return this;
  }

  async first<T>() {
    return this.database.first<T>(this.sql, this.values);
  }

  async all<T>() {
    return { results: this.database.all<T>(this.sql, this.values) };
  }

  async run() {
    return { success: true, meta: { changes: 0 } };
  }
}

class FakeComponentLibraryD1Database {
  readonly prepared: PreparedD1Statement[] = [];
  readonly payload: ComponentLibraryD1Payload;

  constructor(payload: Partial<ComponentLibraryD1Payload> = {}) {
    this.payload = createComponentLibraryD1Payload(payload);
  }

  prepare(sql: string) {
    return new FakeComponentLibraryD1Statement(this, sql);
  }

  first<T>(sql: string): T | null {
    const overview = this.payload.overview;

    if (sql.includes("FROM cost_library_items") && sql.includes("pricing_date < ?")) {
      return { count: overview.health.staleComponentCount } as T;
    }
    if (sql.includes("FROM cost_library_items") && sql.includes("brand_id IS NULL")) {
      return { count: overview.health.missingBrandCount } as T;
    }
    if (sql.includes("COUNT(*) AS count FROM cost_library_items")) {
      return { count: overview.componentCount } as T;
    }
    if (sql.includes("COUNT(*) AS count FROM component_category_nodes")) {
      const count = this.payload.categoryRows.filter((row) => row.parent_id === null).length;
      return { count } as T;
    }
    if (sql.includes("COUNT(*) AS count FROM component_suppliers")) {
      return { count: this.payload.suppliers.length } as T;
    }
    if (sql.includes("COUNT(*) AS count FROM component_brands")) {
      return { count: this.payload.brands.length } as T;
    }
    if (sql.includes("SELECT updated_at") && sql.includes("FROM cost_library_items")) {
      return { updated_at: overview.health.lastLibraryUpdate } as T;
    }

    throw new Error(`Unexpected D1 first query: ${sql}`);
  }

  all<T>(sql: string, values: D1Value[]): T[] {
    if (sql.includes("FROM component_category_nodes")) return this.payload.categoryRows as T[];
    if (sql.includes("FROM component_suppliers")) return this.payload.suppliers as T[];
    if (sql.includes("FROM component_brands")) return this.payload.brands as T[];
    if (sql.includes("FROM library_folders")) return this.payload.libraryFolders as T[];
    if (sql.includes("FROM cost_library_item_price_options")) {
      return this.filterBySelectedIds(this.payload.priceOptions, values, "item_id", sql) as T[];
    }
    if (sql.includes("FROM cost_library_item_variant_cost_entries")) {
      return this.filterBySelectedIds(this.payload.costEntries, values, "item_id", sql) as T[];
    }
    if (sql.includes("FROM cost_library_item_versions")) return [];
    if (sql.includes("FROM cost_library_item_price_history")) return [];
    if (sql.includes("FROM cost_library_item_state_history")) return [];
    if (sql.includes("FROM cost_library_item_variant_attachments")) return [];
    if (sql.includes("FROM cost_library_items") && sql.includes("lifecycle_state = 'discontinued'")) {
      return this.payload.discontinuedRows as T[];
    }
    if (sql.includes("FROM cost_library_items")) {
      return this.costLibraryItems(sql, values) as T[];
    }
    if (sql.includes("SELECT category FROM estimate_templates")) {
      return this.payload.templates.map((row) => ({ category: row.category })) as T[];
    }
    if (sql.includes("FROM estimate_templates")) {
      return this.filterBySelectedIds(this.payload.templates, values, "id", sql) as T[];
    }
    if (sql.includes("FROM estimate_template_nodes")) {
      return this.filterBySelectedIds(this.payload.nodes, values, "template_id", sql) as T[];
    }
    if (sql.includes("FROM estimate_template_row_items") && sql.includes("source_library_item_id IN")) {
      return this.filterBySelectedIds(this.payload.templateRefRows, values, "source_library_item_id", sql) as T[];
    }
    if (sql.includes("FROM estimate_template_row_items")) {
      return this.filterBySelectedIds(this.payload.rowItems, values, "template_id", sql) as T[];
    }
    if (sql.includes("FROM estimate_row_items")) {
      return this.filterBySelectedIds(this.payload.estimateRefRows, values, "source_library_item_id", sql) as T[];
    }

    throw new Error(`Unexpected D1 all query: ${sql}`);
  }

  private costLibraryItems(sql: string, values: D1Value[]) {
    const rows = this.filterBySelectedIds(this.payload.itemRows, values, "id", sql);
    if (sql.includes("LIMIT ? OFFSET ?")) {
      const limit = Number(values[values.length - 2]);
      const offset = Number(values[values.length - 1]);
      return rows.slice(offset, offset + limit);
    }
    if (sql.includes("LIMIT ?")) {
      const limit = Number(values[values.length - 1]);
      return rows.slice(0, limit);
    }
    if (sql.includes("LIMIT 6")) return rows.slice(0, 6);
    return rows;
  }

  private filterBySelectedIds(rows: Record<string, unknown>[], values: D1Value[], key: string, sql: string) {
    if (!sql.includes(" IN (")) return rows;
    const selected = new Set(values.filter((value): value is string => typeof value === "string"));
    return rows.filter((row) => typeof row[key] === "string" && selected.has(row[key]));
  }
}

beforeEach(() => {
  vi.resetModules();
  delete process.env.WORKSHOP_LIBRARY_OVERVIEW_RPC_DISABLED;
  delete process.env.WORKSHOP_LIBRARY_COMPONENT_ROWS_RPC_DISABLED;
  delete process.env.WORKSHOP_LIBRARY_TEMPLATES_RPC_DISABLED;
  testMocks.getCloudflareD1Database.mockReset();
  testMocks.ensureDefaultWorkspace.mockReset().mockResolvedValue({
    workspace: WORKSPACE,
    profile: { id: "user-1" },
  });
});

describe("component library Cloudflare D1 app-path contract", () => {
  it("keeps the historical Supabase RPC migrations workspace-gated and grant-scoped", () => {
    const overviewMigration = readFileSync(
      join(process.cwd(), "supabase/migrations/20260625010000_library_overview_summary.sql"),
      "utf8",
    );
    const componentRowsMigration = readFileSync(
      join(process.cwd(), "supabase/migrations/20260625023000_library_component_rows_seed_browse_projection.sql"),
      "utf8",
    );
    const templatesMigration = readFileSync(
      join(process.cwd(), "supabase/migrations/20260625021500_library_templates_seed.sql"),
      "utf8",
    );

    for (const migration of [overviewMigration, componentRowsMigration, templatesMigration]) {
      expect(migration).toMatch(/security invoker/i);
      expect(migration).toContain("public.is_workspace_member(workspace.id)");
      expect(migration).not.toContain("public.is_platform_admin()");
      expect(migration).toContain("from public, anon");
      expect(migration).toContain("to authenticated");
    }

    expect(componentRowsMigration).toContain("item.active_price_option_id");
    expect(componentRowsMigration).toContain("option_row.active_cost_entry_id");
    expect(templatesMigration).toContain("target_template_id is null");
  });

  it("keeps the repository on Cloudflare D1 without Supabase RPC rollout flags", () => {
    const repository = readFileSync(
      join(process.cwd(), "src/lib/repositories/component-library-repository.ts"),
      "utf8",
    );

    expect(repository).toContain("getCloudflareD1Database");
    expect(repository).toContain("return getLibraryOverviewAppPath();");
    expect(repository).toContain("return loadCurrentWorkspaceComponentRowsLibraryAppPath({");
    expect(repository).toContain("return loadCurrentWorkspaceEstimateTemplatesAppPath({");
    expect(repository).not.toContain("createSupabaseServerClient");
    expect(repository).not.toContain(".rpc(");
    expect(repository).not.toContain("WORKSHOP_LIBRARY_OVERVIEW_RPC_DISABLED");
    expect(repository).not.toContain("WORKSHOP_LIBRARY_COMPONENT_ROWS_RPC_DISABLED");
    expect(repository).not.toContain("WORKSHOP_LIBRARY_TEMPLATES_RPC_DISABLED");
  });

  it("assembles the overview through the Cloudflare D1 app path", async () => {
    const database = new FakeComponentLibraryD1Database();
    testMocks.getCloudflareD1Database.mockResolvedValue(database);

    const { getLibraryOverview } = await import("@/lib/repositories/component-library-repository");
    const overview = await getLibraryOverview();

    expect(database.prepared.map((entry) => entry.sql)).toEqual(
      expect.arrayContaining([
        expect.stringContaining("FROM cost_library_items"),
        expect.stringContaining("FROM component_category_nodes"),
        expect.stringContaining("FROM component_suppliers"),
        expect.stringContaining("FROM component_brands"),
        expect.stringContaining("FROM estimate_templates"),
      ]),
    );
    expect(overview).toMatchObject({
      componentCount: 2,
      categoryCount: 1,
      supplierCount: 1,
      brandCount: 1,
      templateCount: 1,
      templateCategories: ["Residential"],
      health: {
        staleComponentCount: 1,
        discontinuedInUseCount: 0,
        missingBrandCount: 1,
        lastLibraryUpdate: "2026-06-22T00:00:00.000Z",
      },
    });
    expect(overview.recentComponents[0]).toMatchObject({
      id: ITEM_ID,
      supplier: "Supplier A",
      unitCost: 100,
    });
    expect(overview.recentTemplates[0]).toMatchObject({
      id: TEMPLATE_ID,
      groupCount: 1,
      areaCount: 1,
      rowCount: 1,
      total: 215,
    });
  });

  it("fails closed when the Cloudflare D1 binding is unavailable", async () => {
    testMocks.getCloudflareD1Database.mockResolvedValue(null);

    const { getLibraryOverview } = await import("@/lib/repositories/component-library-repository");

    await expect(getLibraryOverview()).rejects.toThrow(
      "Cloudflare D1 binding ARCH_DB is required for component library reads.",
    );
  });

  it("keeps parser guards for the historical overview payload shape", async () => {
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

describe("component library browse and template D1 contract", () => {
  it("loads a slim component browse seed through D1 while preserving selectable price options", async () => {
    const database = new FakeComponentLibraryD1Database();
    testMocks.getCloudflareD1Database.mockResolvedValue(database);

    const { getCurrentWorkspaceComponentRowsLibrary } = await import("@/lib/repositories/component-library-repository");
    const library = await getCurrentWorkspaceComponentRowsLibrary({ includeDetailGraph: false });
    const [item] = library.libraryItems;

    expect(database.prepared.map((entry) => entry.sql)).toEqual(
      expect.arrayContaining([
        expect.stringContaining("FROM component_category_nodes"),
        expect.stringContaining("FROM cost_library_items"),
        expect.stringContaining("FROM cost_library_item_price_options"),
        expect.stringContaining("FROM cost_library_item_variant_cost_entries"),
      ]),
    );
    expect(library.workspaceId).toBe(WORKSPACE.id);
    expect(library.categoryTree).toHaveLength(1);
    expect(item).toMatchObject({
      id: ITEM_ID,
      itemCost: 321,
      miscCost: 9,
      pricingSource: "Latest supplier quote",
      pricingDate: "2026-06-22",
      confidence: "high",
      priceOptionId: PRICE_OPTION_ID,
      priceOptionLabel: "Current option",
    });
    expect(item.priceOptions).toEqual([
      expect.objectContaining({
        id: PRICE_OPTION_ID,
        label: "Current option",
        unitCost: 321,
        isActive: true,
        isDefault: true,
      }),
    ]);
    expect(item).not.toHaveProperty("history");
    expect(item).not.toHaveProperty("notes");
    expect(item).not.toHaveProperty("sourceUrl");
  });

  it("marks bounded browse seeds partial when D1 returns the requested limit", async () => {
    const database = new FakeComponentLibraryD1Database({
      itemRows: [
        createCostLibraryItemRow({ id: ITEM_ID, name: "First Component" }),
        createCostLibraryItemRow({ id: "88888888-8888-4888-8888-888888888888", name: "Second Component" }),
      ],
    });
    testMocks.getCloudflareD1Database.mockResolvedValue(database);

    const { getCurrentWorkspaceComponentRowsLibrary } = await import("@/lib/repositories/component-library-repository");
    const library = await getCurrentWorkspaceComponentRowsLibrary({ includeDetailGraph: false, itemLimit: 1 });

    expect(library.libraryItems).toHaveLength(1);
    expect(library.isPartial).toBe(true);
    expect(library.loadedComponentCount).toBe(1);
    expect(library.totalComponentCount).toBeUndefined();
  });

  it("does not mark bounded D1 browse seeds partial when fewer rows than the limit are returned", async () => {
    const database = new FakeComponentLibraryD1Database();
    testMocks.getCloudflareD1Database.mockResolvedValue(database);

    const { getCurrentWorkspaceComponentRowsLibrary } = await import("@/lib/repositories/component-library-repository");
    const library = await getCurrentWorkspaceComponentRowsLibrary({ includeDetailGraph: false, itemLimit: 48 });

    expect(library.libraryItems).toHaveLength(1);
    expect(library.isPartial).toBe(false);
    expect(library.loadedComponentCount).toBe(1);
    expect(library.totalComponentCount).toBe(1);
  });

  it("loads the template browse seed through D1", async () => {
    const database = new FakeComponentLibraryD1Database();
    testMocks.getCloudflareD1Database.mockResolvedValue(database);

    const { getCurrentWorkspaceEstimateTemplatesSeed } = await import("@/lib/repositories/component-library-repository");
    const seed = await getCurrentWorkspaceEstimateTemplatesSeed();

    expect(database.prepared.map((entry) => entry.sql)).toEqual(
      expect.arrayContaining([
        expect.stringContaining("FROM estimate_templates"),
        expect.stringContaining("FROM estimate_template_nodes"),
        expect.stringContaining("FROM estimate_template_row_items"),
      ]),
    );
    expect(seed.workspaceId).toBe(WORKSPACE.id);
    expect(seed.userId).toBe("user-1");
    expect(seed.templates[0]).toMatchObject({
      id: TEMPLATE_ID,
      nodes: [
        {
          id: GROUP_NODE_ID,
          children: [
            {
              id: AREA_NODE_ID,
              estimateRowItems: [
                {
                  id: ROW_ID,
                  totalItemCosts: 215,
                },
              ],
            },
          ],
        },
      ],
    });
  });

  it("loads a single template detail through the D1 app path", async () => {
    const otherTemplateId = "99999999-9999-4999-8999-999999999999";
    const database = new FakeComponentLibraryD1Database({
      templates: [
        createTemplateRow({ id: TEMPLATE_ID, name: "Selected Template" }),
        createTemplateRow({ id: otherTemplateId, name: "Other Template" }),
      ],
    });
    testMocks.getCloudflareD1Database.mockResolvedValue(database);

    const { getEstimateTemplateById } = await import("@/lib/repositories/component-library-repository");
    const template = await getEstimateTemplateById(TEMPLATE_ID);

    expect(database.prepared.find((entry) => entry.sql.includes("FROM estimate_templates"))?.values).toEqual([
      WORKSPACE.id,
      TEMPLATE_ID,
    ]);
    expect(template).toMatchObject({
      id: TEMPLATE_ID,
      name: "Selected Template",
    });
  });

  it("keeps parser guards for the historical component and template payload shapes", async () => {
    const {
      parseLibraryComponentRowsSeedPayload,
      parseLibraryTemplatesSeedPayload,
    } = await import("@/lib/repositories/component-library-repository");

    expect(() => parseLibraryComponentRowsSeedPayload(null)).toThrow("library_component_rows_seed invalid payload");
    expect(() => parseLibraryComponentRowsSeedPayload({ ...createComponentLibraryD1Payload(), suppliers: "not-an-array" })).toThrow(
      "suppliers is not an array",
    );
    expect(() => parseLibraryComponentRowsSeedPayload({ ...createComponentLibraryD1Payload(), itemRows: ["bad-row"] })).toThrow(
      /library_component_rows_seed invalid array element.*itemRows\[0\]/,
    );
    expect(() => parseLibraryTemplatesSeedPayload(null)).toThrow("library_templates_seed invalid payload");
    expect(() => parseLibraryTemplatesSeedPayload({ ...createComponentLibraryD1Payload(), templates: "not-an-array" })).toThrow(
      "templates is not an array",
    );
    expect(() => parseLibraryTemplatesSeedPayload({ ...createComponentLibraryD1Payload(), nodes: ["bad-row"] })).toThrow(
      /library_templates_seed invalid array element.*nodes\[0\]/,
    );
    expect(() => parseLibraryTemplatesSeedPayload({ ...createComponentLibraryD1Payload(), templates: [{ id: TEMPLATE_ID }] })).toThrow(
      /library_templates_seed invalid row shape/,
    );
  });
});
