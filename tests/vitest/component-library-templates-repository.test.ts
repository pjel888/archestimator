import { readFileSync } from "node:fs";
import { join } from "node:path";

import { beforeEach, describe, expect, it, vi } from "vitest";

const d1Mocks = vi.hoisted(() => ({
  getCloudflareD1Database: vi.fn(),
}));

const workspaceRepositoryMocks = vi.hoisted(() => ({
  ensureDefaultWorkspace: vi.fn(),
}));

vi.mock("@/lib/cloudflare/d1", () => d1Mocks);
vi.mock("@/lib/repositories/workspace-repository", () => workspaceRepositoryMocks);

import {
  buildEstimateTemplateSummariesFromRows,
  buildEstimateTemplatesFromRows,
  ESTIMATE_TEMPLATE_SCHEMA_MIGRATION_PATH,
  ESTIMATE_TEMPLATE_SCHEMA_TABLES,
  ESTIMATE_TEMPLATE_SUMMARY_PAGE_LIMIT,
  EstimateTemplateSchemaUnavailableError,
  fallbackComponentLibraryDataset,
  fallbackComponentRowsLibraryDataset,
  getCurrentWorkspaceComponentLibrary,
  getCurrentWorkspaceComponentRowsLibrary,
  getCurrentWorkspaceEstimateTemplates,
  getCurrentWorkspaceEstimateTemplatesSeed,
  getEstimateTemplateById,
} from "@/lib/repositories/component-library-repository";

type PreparedD1Statement = {
  sql: string;
  values: unknown[];
};

class FakeTemplateD1Statement {
  constructor(
    private readonly database: FakeTemplateD1Database,
    private readonly sql: string,
  ) {}

  bind(...values: unknown[]) {
    this.database.prepared.push({ sql: this.sql, values });
    return this;
  }

  async all() {
    return { results: this.database.resolve(this.sql) };
  }
}

class FakeTemplateD1Database {
  prepared: PreparedD1Statement[] = [];

  constructor(private readonly missingTables: ReadonlySet<string> = new Set()) {}

  prepare(sql: string) {
    return new FakeTemplateD1Statement(this, sql);
  }

  resolve(sql: string) {
    const missingTable = ESTIMATE_TEMPLATE_SCHEMA_TABLES.find((tableName) => this.missingTables.has(tableName) && sql.includes(tableName));
    if (missingTable) throw new Error(`D1_ERROR: no such table: ${missingTable}`);
    if (sql.includes("SELECT 1 FROM")) return [];
    if (sql.includes("FROM estimate_templates")) return [];
    if (sql.includes("FROM estimate_template_nodes")) return [];
    if (sql.includes("FROM estimate_template_row_items")) return [];
    throw new Error(`Unexpected D1 query: ${sql}`);
  }
}

beforeEach(() => {
  d1Mocks.getCloudflareD1Database.mockReset();
  workspaceRepositoryMocks.ensureDefaultWorkspace.mockReset();
  workspaceRepositoryMocks.ensureDefaultWorkspace.mockResolvedValue({
    workspace: { id: "workspace-1" },
    profile: { id: "user-1" },
  });
});

describe("component-library template repository helpers", () => {
  it("pages full workspace detail graph reads and keeps the sidebar path bounded by item ids", () => {
    const source = readFileSync(
      join(process.cwd(), "src/lib/repositories/component-library-repository.ts"),
      "utf8",
    );

    expect(source).toContain("SIDEBAR_COMPONENT_LIBRARY_DEFAULT_LIMIT = 50");
    expect(source).toContain("SIDEBAR_COMPONENT_LIBRARY_MAX_LIMIT = 100");
    expect(source).toContain("SIDEBAR_COMPONENT_LIBRARY_ITEM_COLUMNS");
    expect(source).toContain("COST_LIBRARY_ITEM_D1_COLUMNS");
    expect(source).toContain("getCloudflareD1Database");
    expect(source).toContain("LIMIT ?");
    expect(source).toContain("const isBoundedItemPage = boundedItemLimit !== undefined || selectedItemIds.length > 0");
    expect(source).toContain("itemIds: [itemId]");
    expect(source).toContain("collectComponentLibraryRowsForSelectedItems");
    expect(source).toContain("WHERE item_id IN (${placeholders(itemIds)})");
    expect(source).toContain("collectComponentLibraryWorkspaceRowsForItems");
    expect(source.match(/collectComponentLibraryWorkspaceRowsForItems</g)?.length ?? 0).toBeGreaterThanOrEqual(7);
    expect(source).toContain("const itemIdSet = new Set(itemIds);");
    expect(source).toContain("row.item_id !== null && itemIdSet.has(row.item_id)");
    expect(source.match(/LIMIT \? OFFSET \?/g)?.length ?? 0).toBeGreaterThanOrEqual(2);
    expect(source).not.toContain(".select(selectColumns)");
    expect(source).not.toContain(".range(");
    expect(source).not.toContain("collectComponentLibraryRowsInItemChunks");
    expect(source).not.toContain("COMPONENT_LIBRARY_ITEM_ID_QUERY_CHUNK_SIZE");
    expect(source).not.toContain('.in("item_id", chunk)');
  });

  it("exposes separate component-only, template-only, and combined helper contracts", () => {
    expect(typeof getCurrentWorkspaceComponentRowsLibrary).toBe("function");
    expect(typeof getCurrentWorkspaceEstimateTemplates).toBe("function");
    expect(typeof getCurrentWorkspaceComponentLibrary).toBe("function");
    expect("templates" in fallbackComponentRowsLibraryDataset).toBe(false);
    expect(getCurrentWorkspaceComponentRowsLibrary.toString()).toContain("includeDetailGraph: options.includeDetailGraph");
    expect(fallbackComponentLibraryDataset.templates).toEqual([]);
    expect(getCurrentWorkspaceComponentRowsLibrary.toString()).not.toContain("estimate_templates");
    const combinedHelperSource = getCurrentWorkspaceComponentLibrary.toString();
    expect(combinedHelperSource).toContain("ensureDefaultWorkspace");
    expect(combinedHelperSource).toContain("loadCurrentWorkspaceEstimateTemplateSummaries");
    expect(combinedHelperSource).not.toContain("getCurrentWorkspaceComponentRowsLibrary");
    expect(combinedHelperSource).not.toContain("getCurrentWorkspaceEstimateTemplates");
  });

  it("builds graph-free bounded template summaries from aggregate rows", () => {
    expect(ESTIMATE_TEMPLATE_SUMMARY_PAGE_LIMIT).toBe(50);
    const templates = buildEstimateTemplateSummariesFromRows({
      templates: [{
        id: "template-1",
        workspace_id: "workspace-1",
        name: "Apartment Starter",
        description: "Starter rooms",
        category: "Residential",
        sort_order: 10,
        metadata: {},
        created_by: null,
        created_at: "2026-07-14T00:00:00.000Z",
        updated_at: "2026-07-14T00:00:00.000Z",
      }],
      nodeSummaries: [{ template_id: "template-1", group_count: 2, area_count: 3 }],
      costSummaries: [{ template_id: "template-1", row_count: 8, total: 125_500 }],
    });

    expect(templates).toEqual([expect.objectContaining({
      id: "template-1",
      nodes: [],
      summary: { groupCount: 2, areaCount: 3, rowCount: 8, total: 125_500 },
    })]);
  });

  it("keeps production template repository paths free of synthetic fallback templates", () => {
    const source = readFileSync(
      join(process.cwd(), "src/lib/repositories/component-library-repository.ts"),
      "utf8",
    );

    expect(source).not.toMatch(/\bestimateTemplates\b/);
    expect(source).not.toContain("getTemplateTableFallbackTemplates");
    expect(fallbackComponentLibraryDataset.templates).toEqual([]);
  });

  it("keeps an ordinary empty workspace available with an empty bounded seed", async () => {
    const database = new FakeTemplateD1Database();
    d1Mocks.getCloudflareD1Database.mockResolvedValue(database);

    await expect(getCurrentWorkspaceEstimateTemplatesSeed()).resolves.toEqual({
      status: "available",
      templates: [],
      userId: "user-1",
      workspaceId: "workspace-1",
    });
    expect(database.prepared.filter(({ sql }) => sql.includes("LIMIT 0"))).toHaveLength(2);
    expect(database.prepared.find(({ sql }) => sql.includes("FROM estimate_templates"))).toEqual(expect.objectContaining({
      values: ["workspace-1", ESTIMATE_TEMPLATE_SUMMARY_PAGE_LIMIT],
    }));
  });

  it.each(ESTIMATE_TEMPLATE_SCHEMA_TABLES)("returns a migration-required seed when %s is missing", async (missingTable) => {
    const database = new FakeTemplateD1Database(new Set([missingTable]));
    d1Mocks.getCloudflareD1Database.mockResolvedValue(database);

    await expect(getCurrentWorkspaceEstimateTemplatesSeed()).resolves.toEqual({
      status: "schema_unavailable",
      reason: "migration_required",
      migrationPath: ESTIMATE_TEMPLATE_SCHEMA_MIGRATION_PATH,
      missingTables: [missingTable],
      templates: [],
      userId: "user-1",
      workspaceId: "workspace-1",
    });
  });

  it("throws the typed schema error from direct array and detail loaders", async () => {
    const database = new FakeTemplateD1Database(new Set(["estimate_template_nodes"]));
    d1Mocks.getCloudflareD1Database.mockResolvedValue(database);

    const arrayError = await getCurrentWorkspaceEstimateTemplates().catch((error: unknown) => error);
    expect(arrayError).toBeInstanceOf(EstimateTemplateSchemaUnavailableError);
    expect(arrayError).toMatchObject({
      status: "schema_unavailable",
      code: "schema_unavailable",
      reason: "migration_required",
      migrationPath: ESTIMATE_TEMPLATE_SCHEMA_MIGRATION_PATH,
      missingTables: ["estimate_template_nodes"],
    });

    const detailError = await getEstimateTemplateById("11111111-1111-4111-8111-111111111111").catch((error: unknown) => error);
    expect(detailError).toBeInstanceOf(EstimateTemplateSchemaUnavailableError);
    expect(detailError).toMatchObject({
      status: "schema_unavailable",
      code: "schema_unavailable",
      reason: "migration_required",
      missingTables: ["estimate_template_nodes"],
    });
  });

  it("passes the typed seed to an honest migration-required browse state", () => {
    const pageSource = readFileSync(
      join(process.cwd(), "src/app/workshop/library/templates/page.tsx"),
      "utf8",
    );
    const clientSource = readFileSync(
      join(process.cwd(), "src/components/workshop/library/templates-browse/TemplatesBrowsePageClient.tsx"),
      "utf8",
    );

    expect(pageSource).toContain("templateSeed={templateSeed}");
    expect(clientSource).toContain('data-template-schema-state="schema_unavailable"');
    expect(clientSource).toContain("Template storage needs a database migration");
    expect(clientSource).toContain("No sample templates are being shown.");
  });

  it("builds UI-ready estimate templates from persisted template rows", () => {
    const templates = buildEstimateTemplatesFromRows({
      templates: [
        {
          id: "template-1",
          workspace_id: "workspace-1",
          name: "Apartment Starter",
          description: "Starter rooms",
          category: "Residential",
          sort_order: 20,
          metadata: {},
          created_by: null,
          created_at: "2026-05-22T00:00:00.000Z",
          updated_at: "2026-05-22T00:00:00.000Z",
        },
      ],
      nodes: [
        {
          id: "area-1",
          template_id: "template-1",
          parent_id: "group-1",
          kind: "area",
          name: "Living",
          sort_order: 20,
          metadata: {},
          created_at: "2026-05-22T00:00:00.000Z",
          updated_at: "2026-05-22T00:00:00.000Z",
        },
        {
          id: "group-1",
          template_id: "template-1",
          parent_id: null,
          kind: "group",
          name: "Interior",
          sort_order: 10,
          metadata: {},
          created_at: "2026-05-22T00:00:00.000Z",
          updated_at: "2026-05-22T00:00:00.000Z",
        },
      ],
      rowItems: [
        {
          id: "row-1",
          template_id: "template-1",
          template_node_id: "area-1",
          sort_order: 10,
          source_library_item_id: "lib-sofa",
          source_snapshot: {
            category: "Furniture",
            categoryNodeId: "furniture",
            imageUrl: "/component-thumbnails/lib-sofa.jpg",
            pricingDate: "2026-05-17",
            pricingSource: "Catalog",
            source: "library",
            tags: ["living"],
          },
          category_node_id: "furniture",
          supplier_id: "supplier-1",
          material: "Sofa",
          description: "Compact sofa",
          supplier: "IKEA Philippines",
          unit: "pc",
          quantity: 2,
          unit_cost: 100,
          contingency_percentage: 0,
          adjustment_percentage: -10,
          misc_cost: 15,
          discipline: "Architectural",
          designation: "Furniture",
          link_state: "linked-clean",
          metadata: {},
          created_at: "2026-05-22T00:00:00.000Z",
          updated_at: "2026-05-22T00:00:00.000Z",
        },
      ],
    });

    expect(templates).toEqual([
      expect.objectContaining({
        id: "template-1",
        name: "Apartment Starter",
        category: "Residential",
        nodes: [
          expect.objectContaining({
            id: "group-1",
            kind: "group",
            children: [
              expect.objectContaining({
                id: "area-1",
                kind: "area",
                estimateRowItems: [
                  expect.objectContaining({
                    id: "row-1",
                    material: "Sofa",
                    source: "library",
                    quantity: 2,
                    subTotal: 200,
                    adjustmentPercentage: -10,
                    adjustmentValue: -20,
                    miscCost: 15,
                    totalItemCosts: 195,
                    category: "Furniture",
                    categoryNodeId: "furniture",
                    supplierId: "supplier-1",
                    pricingDate: "2026-05-17",
                    pricingSource: "Catalog",
                    tags: ["living"],
                  }),
                ],
              }),
            ],
          }),
        ],
      }),
    ]);
  });
});
