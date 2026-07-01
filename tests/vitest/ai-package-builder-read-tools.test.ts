import { beforeEach, describe, expect, it, vi } from "vitest";

const d1Mocks = vi.hoisted(() => ({
  getCloudflareD1Database: vi.fn(),
}));

vi.mock("@/lib/cloudflare/d1", () => d1Mocks);

import { readPackageBuilderTools } from "@/lib/ai/package-builder/read-tools";

const workspaceId = "55555555-5555-4555-8555-555555555555";
const userId = "44444444-4444-4444-8444-444444444444";
const routeProjectId = "11111111-1111-4111-8111-111111111111";
const routeEstimateId = "22222222-2222-4222-8222-222222222222";
const routeGroupNodeId = "33333333-3333-4333-8333-333333333333";
const routeAreaNodeId = "44444444-4444-4444-8444-444444444444";
const routeActiveTabId = "12121212-1212-4121-8121-121212121212";
const otherProjectId = "99999999-9999-4999-8999-999999999999";
const otherEstimateId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const otherAreaNodeId = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const selectedEstimateId = "66666666-6666-4666-8666-666666666666";
const selectedAreaNodeId = "88888888-8888-4888-8888-888888888888";
const selectedActiveTabId = "56565656-5656-4565-8565-565656565656";
const componentBedId = "13131313-1313-4131-8131-131313131313";

const userContext = {
  userId,
  email: "user@example.com",
  workspaceId,
  authMode: "supabase" as const,
};

type Fixture = ReturnType<typeof makeFixture>;
type Statement = { sql: string; values: unknown[] };

function makeFixture() {
  return {
    workspaces: [{ id: workspaceId, name: "Readonly Workspace" }],
    projects: [
      {
        id: routeProjectId,
        workspace_id: workspaceId,
        name: "Lewis Residence",
        client_name: "Lewis",
        location: "Manila",
        project_code: "LR",
        updated_at: "2026-05-28T00:00:00.000Z",
      },
      {
        id: otherProjectId,
        workspace_id: workspaceId,
        name: "Previous Condo Fitout",
        client_name: "Prior Client",
        location: "Makati",
        project_code: "PCF",
        updated_at: "2026-05-27T00:00:00.000Z",
      },
    ],
    estimates: [
      {
        id: routeEstimateId,
        project_id: routeProjectId,
        name: "Initial Estimate",
        sheet_code: "ES-001",
        updated_at: "2026-05-28T00:00:00.000Z",
      },
      {
        id: selectedEstimateId,
        project_id: routeProjectId,
        name: "Selected Estimate",
        sheet_code: "ES-003",
        updated_at: "2026-05-29T00:00:00.000Z",
      },
      {
        id: otherEstimateId,
        project_id: otherProjectId,
        name: "Prior Condo Estimate",
        sheet_code: "ES-002",
        updated_at: "2026-05-27T00:00:00.000Z",
      },
    ],
    nodes: [
      { id: routeGroupNodeId, estimate_id: routeEstimateId, estimate_tab_id: routeActiveTabId, parent_id: null, kind: "group", name: "House", sort_order: 0 },
      { id: routeAreaNodeId, estimate_id: routeEstimateId, estimate_tab_id: routeActiveTabId, parent_id: routeGroupNodeId, kind: "area", name: "Bedroom 1", sort_order: 1 },
      { id: "77777777-7777-4777-8777-777777777777", estimate_id: selectedEstimateId, estimate_tab_id: selectedActiveTabId, parent_id: null, kind: "group", name: "Selected House", sort_order: 0 },
      { id: selectedAreaNodeId, estimate_id: selectedEstimateId, estimate_tab_id: selectedActiveTabId, parent_id: "77777777-7777-4777-8777-777777777777", kind: "area", name: "Selected Bedroom", sort_order: 1 },
      { id: otherAreaNodeId, estimate_id: otherEstimateId, estimate_tab_id: "other-tab", parent_id: null, kind: "area", name: "Bedroom", sort_order: 0 },
      { id: "powder-node", estimate_id: otherEstimateId, estimate_tab_id: "other-tab", parent_id: null, kind: "area", name: "Powder Room", sort_order: 1 },
    ],
    rows: [
      {
        id: "55555555-5555-4555-8555-555555555555",
        estimate_id: routeEstimateId,
        node_id: routeAreaNodeId,
        material: "Existing bed",
        description: "Existing row",
        supplier: null,
        quantity: 1,
        quantity_base: null,
        quantity_contingency_amount: null,
        unit: "pc",
        unit_cost: 10_000,
        contingency_percentage: 0,
        adjustment_percentage: 0,
        misc_cost: 0,
        row_revision: 3,
        source_library_item_id: null,
        sort_order: 0,
        updated_at: "2026-05-28T00:00:00.000Z",
      },
      {
        id: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
        estimate_id: selectedEstimateId,
        node_id: selectedAreaNodeId,
        material: "Selected estimate bed",
        description: "Selected row",
        supplier: null,
        quantity: 1,
        quantity_base: null,
        quantity_contingency_amount: null,
        unit: "pc",
        unit_cost: 15_000,
        contingency_percentage: 0,
        adjustment_percentage: 0,
        misc_cost: 0,
        row_revision: 5,
        source_library_item_id: null,
        sort_order: 0,
        updated_at: "2026-05-29T00:00:00.000Z",
      },
      {
        id: "dddddddd-dddd-4ddd-8ddd-dddddddddddd",
        estimate_id: otherEstimateId,
        node_id: otherAreaNodeId,
        material: "Prior condo queen bed",
        description: "Prior bedroom furniture row.",
        supplier: "Prior Supplier",
        quantity: 1,
        quantity_base: null,
        quantity_contingency_amount: null,
        unit: "pc",
        unit_cost: 21_000,
        contingency_percentage: 0,
        adjustment_percentage: 0,
        misc_cost: 0,
        source_library_item_id: null,
        sort_order: 0,
        updated_at: "2026-05-27T00:00:00.000Z",
      },
      {
        id: "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee",
        estimate_id: otherEstimateId,
        node_id: "powder-node",
        material: "Powder room vanity mirror",
        description: "Bath finish",
        supplier: null,
        quantity: 1,
        quantity_base: null,
        quantity_contingency_amount: null,
        unit: "pc",
        unit_cost: 7_500,
        contingency_percentage: 0,
        adjustment_percentage: 0,
        misc_cost: 500,
        source_library_item_id: componentBedId,
        sort_order: 1,
        updated_at: "2026-05-27T00:00:00.000Z",
      },
    ],
    components: [
      {
        id: componentBedId,
        name: "Bedroom bed frame",
        description: "Condo bedroom furniture.",
        category: "Furniture",
        category_node_id: "cat-bedroom-beds",
        library_folder_id: "folder-bedroom-beds",
        supplier: "Supplier A",
        supplier_id: null,
        brand: "Condo Brand",
        brand_id: null,
        unit: "pc",
        unit_cost: 25_000,
        misc_cost: 0,
        lifecycle_state: "available",
        current_version_number: 7,
        active_price_option_id: "price-bed",
        confidence: "high",
        workspace_id: workspaceId,
      },
    ],
    priceOptions: [
      {
        id: "price-bed",
        item_id: componentBedId,
        workspace_id: workspaceId,
        unit: "pc",
        unit_cost: 24_500,
        misc_cost: 250,
        currency: "PHP",
        is_active: 1,
        is_default: 1,
        updated_at: "2026-05-28T00:00:00.000Z",
        confidence: "high",
        supplier_id: null,
      },
    ],
    categories: [
      { id: "cat-root", parent_id: null, label: "Objects", node_type: "root", sort_order: 0, code: null, metadata: "{}" },
      { id: "cat-furniture", parent_id: "cat-root", label: "Furniture", node_type: "category", sort_order: 1, code: null, metadata: "{}" },
      { id: "cat-bedroom-beds", parent_id: "cat-furniture", label: "Bedroom Beds", node_type: "category", sort_order: 2, code: null, metadata: "{}" },
    ],
    folders: [
      { id: "folder-furniture", workspace_id: workspaceId, parent_id: null, name: "Furniture", sort_order: 0, source_category_node_id: "cat-furniture", folder_kind: "taxonomy" },
      { id: "folder-bedroom-beds", workspace_id: workspaceId, parent_id: "folder-furniture", name: "Bedroom Beds", sort_order: 1, source_category_node_id: "cat-bedroom-beds", folder_kind: "taxonomy" },
    ],
    templates: [
      {
        id: "template-condo",
        workspace_id: workspaceId,
        name: "3 Bedroom Condo Starter",
        description: "Starter estimate for bedroom condo packages.",
        category: "Condo",
        sort_order: 0,
      },
    ],
    templateNodes: [
      { id: "template-area", template_id: "template-condo", kind: "area", name: "Bedroom" },
    ],
    templateRows: [
      {
        id: "template-row",
        template_id: "template-condo",
        template_node_id: "template-area",
        material: "Template bedroom paint finish",
        description: "Paint finish copied from a workspace template.",
        supplier: "Template Supplier",
        quantity: 1,
        unit: "allowance",
        unit_cost: 9000,
        contingency_percentage: 10,
        adjustment_percentage: 10,
        misc_cost: 500,
        sort_order: 0,
      },
    ],
    memoryRows: [
      {
        signal: "accepted",
        source_type: "library_item",
        source_id: componentBedId,
        source_label: "Preferred bedroom bed frame",
        room_name: "Bedroom 1",
        operation_type: "insert_component_row",
        weight: 1,
        created_at: "2026-05-28T00:00:00.000Z",
      },
    ],
  };
}

function asValues(values: unknown[]) {
  return values.filter((value): value is string => typeof value === "string");
}

function rowsForSql(fixture: Fixture, sql: string, values: unknown[]) {
  const normalized = sql.replace(/\s+/g, " ");
  const stringValues = asValues(values);

  if (normalized.includes("FROM ai_package_builder_memory_preferences")) return fixture.memoryRows;
  if (normalized.includes("FROM workspaces")) return fixture.workspaces.filter((workspace) => workspace.id === values[0]);
  if (normalized.includes("FROM projects") && normalized.includes("AND id = ?")) {
    return fixture.projects.filter((project) => project.workspace_id === values[0] && project.id === values[1]);
  }
  if (normalized.includes("FROM projects")) {
    return fixture.projects.filter((project) => project.workspace_id === values[0]).sort((left, right) => right.updated_at.localeCompare(left.updated_at));
  }
  if (normalized.includes("FROM estimates") && normalized.includes("WHERE id = ?")) {
    return fixture.estimates.filter((estimate) => estimate.id === values[0] && estimate.project_id === values[1]);
  }
  if (normalized.includes("FROM estimates") && normalized.includes("project_id IN")) {
    return fixture.estimates.filter((estimate) => stringValues.includes(estimate.project_id)).sort((left, right) => right.updated_at.localeCompare(left.updated_at));
  }
  if (normalized.includes("FROM estimates")) {
    return fixture.estimates.filter((estimate) => estimate.project_id === values[0]).sort((left, right) => right.updated_at.localeCompare(left.updated_at));
  }
  if (normalized.includes("FROM estimate_nodes") && normalized.includes("WHERE id = ?")) {
    return fixture.nodes.filter((node) => node.id === values[0]);
  }
  if (normalized.includes("FROM estimate_nodes") && normalized.includes("estimate_id IN")) {
    return fixture.nodes.filter((node) => stringValues.includes(node.estimate_id)).sort((left, right) => left.sort_order - right.sort_order);
  }
  if (normalized.includes("FROM estimate_nodes")) {
    return fixture.nodes
      .filter((node) => node.estimate_id === values[0])
      .filter((node) => normalized.includes("estimate_tab_id = ?") ? node.estimate_tab_id === values[1] : true)
      .sort((left, right) => left.sort_order - right.sort_order);
  }
  if (normalized.includes("FROM estimate_row_items") && normalized.includes("estimate_id IN")) {
    const estimateIds = stringValues.filter((value) => fixture.estimates.some((estimate) => estimate.id === value));
    return fixture.rows.filter((row) => estimateIds.includes(row.estimate_id)).sort((left, right) => right.updated_at.localeCompare(left.updated_at) || left.sort_order - right.sort_order);
  }
  if (normalized.includes("FROM estimate_row_items")) {
    const nodeIds = stringValues.filter((value) => fixture.nodes.some((node) => node.id === value));
    return fixture.rows
      .filter((row) => row.estimate_id === values[0])
      .filter((row) => normalized.includes("node_id IN") ? nodeIds.includes(row.node_id) : true)
      .sort((left, right) => left.sort_order - right.sort_order);
  }
  if (normalized.includes("FROM cost_library_items")) {
    return fixture.components.filter((component) => component.workspace_id === values[0] && !["archived", "discontinued"].includes(component.lifecycle_state));
  }
  if (normalized.includes("FROM cost_library_item_price_options")) {
    return fixture.priceOptions.filter((option) => option.workspace_id === values[0] && stringValues.includes(option.id) && option.is_active === 1);
  }
  if (normalized.includes("FROM component_category_nodes")) return fixture.categories;
  if (normalized.includes("FROM library_folders")) return fixture.folders.filter((folder) => folder.workspace_id === values[0]);
  if (normalized.includes("FROM estimate_templates")) return fixture.templates.filter((template) => template.workspace_id === values[0]);
  if (normalized.includes("FROM estimate_template_nodes")) {
    return fixture.templateNodes.filter((node) => stringValues.includes(node.template_id));
  }
  if (normalized.includes("FROM estimate_template_row_items")) {
    return fixture.templateRows.filter((row) => stringValues.includes(row.template_id)).sort((left, right) => left.sort_order - right.sort_order);
  }
  throw new Error(`Unexpected D1 query: ${sql}`);
}

function makeD1Database(fixture = makeFixture(), observed: Statement[] = []) {
  return {
    prepare: vi.fn((sql: string) => ({
      bind: vi.fn((...values: unknown[]) => {
        observed.push({ sql, values });
        return {
          first: vi.fn(async () => rowsForSql(fixture, sql, values)[0] ?? null),
          all: vi.fn(async () => ({ success: true, results: rowsForSql(fixture, sql, values) })),
          run: vi.fn(async () => ({ success: true })),
        };
      }),
      first: vi.fn(async () => rowsForSql(fixture, sql, [])[0] ?? null),
      all: vi.fn(async () => ({ success: true, results: rowsForSql(fixture, sql, []) })),
      run: vi.fn(async () => ({ success: true })),
    })),
  };
}

async function readWithFixture(input: Partial<Parameters<typeof readPackageBuilderTools>[0]> = {}, fixture = makeFixture(), observed: Statement[] = []) {
  d1Mocks.getCloudflareD1Database.mockResolvedValue(makeD1Database(fixture, observed));
  return readPackageBuilderTools({
    runId: "66666666-6666-4666-8666-666666666666",
    userContext,
    message: "Make a 3 bedroom condo estimate.",
    ...input,
  });
}

describe("AI package-builder read tools", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("uses the server-derived workspace id and D1 without bootstrapping workspace state", async () => {
    const fixture = makeFixture();
    fixture.projects = [];
    fixture.components = [];
    fixture.templates = [];

    const result = await readWithFixture({}, fixture);

    expect(result.workspace).toEqual({ name: "Readonly Workspace" });
    expect(result.projects).toEqual([]);
    expect(result.componentMatches).toEqual([]);
    expect(result.templateMatches).toEqual([]);
    expect(result.auditEvents.map((event) => event.dataAccessEvent?.event_name)).toContain("read_current_workspace_context");
  });

  it("reads package-builder memory preferences only when explicitly enabled", async () => {
    const observed: Statement[] = [];
    const result = await readWithFixture({ memoryEnabled: true }, makeFixture(), observed);

    expect(observed).toEqual(expect.arrayContaining([
      expect.objectContaining({
        sql: expect.stringContaining("FROM ai_package_builder_memory_preferences"),
        values: [workspaceId, userId, 80],
      }),
    ]));
    expect(result.memoryPreferences.componentSignals).toEqual([
      expect.objectContaining({
        sourceLibraryItemId: componentBedId,
        sourceLabel: "Preferred bedroom bed frame",
      }),
    ]);
    expect(result.auditEvents.find((event) => event.dataAccessEvent?.event_name === "read_package_builder_memory_preferences")?.dataAccessEvent).toMatchObject({
      source_tables: ["ai_package_builder_memory_preferences"],
      row_count: 1,
    });
  });

  it("reads route project, estimate, active tab tree, and rows through D1", async () => {
    const observed: Statement[] = [];
    const result = await readWithFixture({
      message: "Use the current estimate context for a 3 bedroom condo.",
      routeContext: { projectId: routeProjectId, estimateId: routeEstimateId, activeTabId: routeActiveTabId },
    }, makeFixture(), observed);

    expect(result.projectSummary).toMatchObject({ id: routeProjectId, name: "Lewis Residence" });
    expect(result.estimateSummary).toMatchObject({ id: routeEstimateId, name: "Initial Estimate", rowCount: 1, activeTabId: routeActiveTabId });
    expect(result.estimateTree).toEqual([
      { id: routeGroupNodeId, name: "House", kind: "group", path: ["House"], rowCount: 0 },
      { id: routeAreaNodeId, name: "Bedroom 1", kind: "area", path: ["House", "Bedroom 1"], rowCount: 1 },
    ]);
    expect(result.areaRows).toEqual([
      expect.objectContaining({ id: "55555555-5555-4555-8555-555555555555", material: "Existing bed", rowRevision: 3, total: 10_000 }),
    ]);
    expect(observed.some((statement) => statement.sql.includes("estimate_tab_id = ?") && statement.values.includes(routeActiveTabId))).toBe(true);
    expect(observed.some((statement) => statement.sql.includes("node_id IN") && statement.values.includes(routeAreaNodeId))).toBe(true);
  });

  it("resolves selected-node route context and excludes that estimate from historical matches", async () => {
    const result = await readWithFixture({
      message: "Use this selected estimate route for a 3 bedroom condo.",
      routeContext: { projectId: routeProjectId, selectedNodeId: selectedAreaNodeId },
    });

    expect(result.estimateSummary).toMatchObject({
      id: selectedEstimateId,
      name: "Selected Estimate",
      firstNodeId: selectedAreaNodeId,
    });
    expect(result.areaRows).toEqual([
      expect.objectContaining({ id: "cccccccc-cccc-4ccc-8ccc-cccccccccccc", material: "Selected estimate bed", rowRevision: 5 }),
    ]);
    expect(result.historicalRowMatches.every((row) => row.estimateId !== selectedEstimateId)).toBe(true);
  });

  it("reads historical rows and comparable packages across scoped workspace projects", async () => {
    const result = await readWithFixture({
      message: "Make a project for me with an estimate sheet which is for a 3 bedroom condo unit.",
      routeContext: { projectId: routeProjectId, estimateId: routeEstimateId },
    });

    expect(result.historicalRowMatches.every((row) => row.estimateId !== routeEstimateId)).toBe(true);
    expect(result.historicalRowMatches).toEqual(expect.arrayContaining([
      expect.objectContaining({
        projectName: "Previous Condo Fitout",
        estimateName: "Prior Condo Estimate",
        areaName: "Bedroom",
        material: "Prior condo queen bed",
        total: 21_000,
      }),
    ]));
    expect(result.comparableEstimatePackages.every((packageMatch) => packageMatch.estimateId !== routeEstimateId)).toBe(true);
    expect(result.comparableEstimatePackages).toEqual(expect.arrayContaining([
      expect.objectContaining({
        projectName: "Previous Condo Fitout",
        estimateName: "Prior Condo Estimate",
        matchedTerms: expect.arrayContaining(["bed", "condo"]),
        rowCount: 2,
        total: 29_000,
        sourceLibraryCoverageRatio: 0.5,
      }),
    ]));
  });

  it("reads D1 estimate templates with row previews", async () => {
    const result = await readWithFixture({ message: "Make a 3 bedroom condo estimate." });

    expect(result.templateMatches).toEqual([
      expect.objectContaining({
        id: "template-condo",
        name: "3 Bedroom Condo Starter",
        rowCount: 1,
        areaNames: ["Bedroom"],
        rowPreviews: [
          expect.objectContaining({
            id: "template-row",
            templateNodeId: "template-area",
            material: "Template bedroom paint finish",
            total: 10_400,
          }),
        ],
      }),
    ]);
  });

  it("enriches component matches with active price, category, and library folder context", async () => {
    const observed: Statement[] = [];
    const result = await readWithFixture({ message: "Add bedroom beds from the furniture folder." }, makeFixture(), observed);

    expect(result.componentMatches).toEqual([
      expect.objectContaining({
        material: "Bedroom bed frame",
        category: "Bedroom Beds",
        categoryNodeId: "cat-bedroom-beds",
        categoryPath: ["Objects", "Furniture", "Bedroom Beds"],
        libraryFolderId: "folder-bedroom-beds",
        libraryFolderName: "Bedroom Beds",
        libraryFolderPath: ["Furniture", "Bedroom Beds"],
        priceOptionId: "price-bed",
        priceOptionUpdatedAt: "2026-05-28T00:00:00.000Z",
        unitCost: 24_500,
      }),
    ]);
    expect(observed.some((statement) => statement.sql.includes("FROM component_category_nodes"))).toBe(true);
    expect(observed.some((statement) => statement.sql.includes("FROM library_folders") && statement.values.includes(workspaceId))).toBe(true);
  });
});
