import { beforeEach, describe, expect, it, vi } from "vitest";

import { buildPackageBuilderDraft } from "@/lib/ai/package-builder/draft";
import type { PackageBuilderReadToolsData } from "@/lib/ai/package-builder/read-tools";
import { buildPackageDraftHash, type PackageBuilderDraft } from "@/lib/ai/package-builder/schemas";

const WORKSPACE_ID = "55555555-5555-4555-8555-555555555555";
const USER_ID = "44444444-4444-4444-8444-444444444444";
const PROJECT_ID = "aaaaaaaa-1111-4aaa-8aaa-aaaaaaaa1111";
const ESTIMATE_ID = "bbbbbbbb-2222-4bbb-8bbb-bbbbbbbb2222";
const ROOT_NODE_ID = "cccccccc-3333-4ccc-8ccc-cccccccc3333";
const AREA_NODE_ID = "dddddddd-4444-4ddd-8ddd-dddddddd4444";
const ROW_ID = "eeeeeeee-5555-4eee-8eee-eeeeeeee5555";
const TAB_ID = "ffffffff-ffff-4fff-8fff-ffffffffffff";
const AUTH_RUN_ID = "99999999-9999-4999-8999-999999999999";

const workspaceMocks = vi.hoisted(() => ({
  ensureDefaultWorkspace: vi.fn(),
}));

const authMocks = vi.hoisted(() => ({
  requireCurrentUserContext: vi.fn(),
}));

const d1Mocks = vi.hoisted(() => ({
  getCloudflareD1Database: vi.fn(),
}));

const authzMocks = vi.hoisted(() => ({
  canEditEstimateInD1: vi.fn(),
  isWorkspaceEditorInD1: vi.fn(),
}));

const cacheMocks = vi.hoisted(() => ({
  revalidatePath: vi.fn(),
}));

vi.mock("@/lib/repositories/workspace-repository", () => workspaceMocks);
vi.mock("@/lib/auth/session", () => authMocks);
vi.mock("@/lib/cloudflare/d1", () => d1Mocks);
vi.mock("@/lib/authz/d1-access", () => authzMocks);
vi.mock("next/cache", () => cacheMocks);

type CommandRow = {
  id: string;
  workspace_id: string;
  idempotency_key: string;
  command_kind: string;
  draft_id: string;
  draft_hash: string;
  status: string;
  result_json: string | null;
};

type Fixture = {
  commands: CommandRow[];
  components: Array<Record<string, unknown>>;
  libraryFolders: Array<Record<string, unknown>>;
  priceOptions: Array<Record<string, unknown>>;
  projects: Array<Record<string, unknown>>;
  estimates: Array<Record<string, unknown>>;
  tabs: Array<Record<string, unknown>>;
  nodes: Array<Record<string, unknown>>;
  rows: Array<Record<string, unknown>>;
  events: Array<Record<string, unknown>>;
  templateNodes: Array<Record<string, unknown>>;
  templateRows: Array<Record<string, unknown>>;
  statements: Array<{ sql: string; values: unknown[] }>;
};

function normalizeSql(sql: string) {
  return sql.replace(/\s+/g, " ").trim();
}

function parseJson(value: unknown) {
  if (typeof value !== "string") return value;
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}

function makeD1(fixture: Fixture) {
  function makeStatement(sql: string, values: unknown[] = []) {
    return {
      bind: (...nextValues: unknown[]) => makeStatement(sql, nextValues),
      first: async () => firstForSql(fixture, sql, values),
      all: async () => ({ success: true, results: allForSql(fixture, sql, values) }),
      run: async () => {
        runForSql(fixture, sql, values);
        return { success: true, meta: {} };
      },
    };
  }

  return {
    prepare: (sql: string) => makeStatement(sql),
    batch: async (statements: Array<{ run: () => Promise<{ success: boolean; meta: Record<string, never> }> }>) => {
      const results = [];
      for (const statement of statements) results.push(await statement.run());
      return results;
    },
  };
}

function firstForSql(fixture: Fixture, sql: string, values: unknown[]) {
  const normalized = normalizeSql(sql);
  if (normalized.includes("FROM ai_package_apply_commands")) {
    return fixture.commands.find((row) => row.workspace_id === values[0] && row.idempotency_key === values[1]) ?? null;
  }
  if (normalized.includes("FROM estimates estimate JOIN projects project")) {
    const estimate = fixture.estimates.find((row) => row.id === values[0]);
    if (!estimate) return null;
    const project = fixture.projects.find((row) => row.id === estimate.project_id);
    if (!project) return null;
    return { id: estimate.id, project_id: estimate.project_id, workspace_id: project.workspace_id };
  }
  if (normalized.includes("FROM estimate_sheet_events")) {
    const event = fixture.events.find((row) => row.estimate_id === values[0] && row.correlation_id === values[1]);
    return event ? { payload: event.payload } : null;
  }
  if (normalized.includes("FROM estimate_nodes") && normalized.includes("WHERE id = ?")) {
    return fixture.nodes.find((row) => row.id === values[0] && row.estimate_id === values[1]) ?? null;
  }
  if (normalized.includes("FROM estimate_row_items") && normalized.includes("WHERE id = ?")) {
    return fixture.rows.find((row) => row.id === values[0] && row.estimate_id === values[1]) ?? null;
  }
  if (normalized.includes("COALESCE(MAX(sort_order)")) {
    const [, tabId, parentId] = values;
    const max = fixture.nodes
      .filter((row) => row.estimate_id === values[0] && row.estimate_tab_id === tabId && row.parent_id === parentId)
      .reduce((largest, row) => Math.max(largest, Number(row.sort_order ?? 0)), 0);
    return { sort_order: max };
  }
  throw new Error(`Unexpected D1 first query: ${normalized}`);
}

function allForSql(fixture: Fixture, sql: string, values: unknown[]) {
  const normalized = normalizeSql(sql);
  if (normalized.includes("FROM cost_library_items")) {
    const workspaceId = values[0];
    const ids = new Set(values.slice(1));
    return fixture.components.filter((row) => row.workspace_id === workspaceId && ids.has(row.id));
  }
  if (normalized.includes("FROM cost_library_item_price_options")) {
    const workspaceId = values[0];
    const ids = new Set(values.slice(1));
    return fixture.priceOptions.filter((row) => row.workspace_id === workspaceId && ids.has(row.id));
  }
  if (normalized.includes("FROM library_folders")) {
    return fixture.libraryFolders.filter((row) => row.workspace_id === values[0]);
  }
  if (normalized.includes("FROM estimate_row_items") && normalized.includes("node_id IN")) {
    const estimateId = values[0];
    const nodeIds = new Set(values.slice(1));
    return fixture.rows.filter((row) => row.estimate_id === estimateId && nodeIds.has(row.node_id));
  }
  if (normalized.includes("FROM estimate_template_nodes")) {
    return fixture.templateNodes.filter((row) => row.template_id === values[0]);
  }
  if (normalized.includes("FROM estimate_template_row_items")) {
    return fixture.templateRows.filter((row) => row.template_id === values[0]);
  }
  throw new Error(`Unexpected D1 all query: ${normalized}`);
}

function runForSql(fixture: Fixture, sql: string, values: unknown[]) {
  const normalized = normalizeSql(sql);
  fixture.statements.push({ sql: normalized, values });
  if (normalized.startsWith("INSERT INTO ai_package_apply_commands")) {
    fixture.commands.push({
      id: String(values[0]),
      workspace_id: String(values[1]),
      idempotency_key: String(values[2]),
      command_kind: String(values[3]),
      draft_id: String(values[4]),
      draft_hash: String(values[5]),
      status: "started",
      result_json: null,
    });
    return;
  }
  if (normalized.startsWith("UPDATE ai_package_apply_commands") && normalized.includes("status = 'completed'")) {
    const command = fixture.commands.find((row) => row.id === values[7]);
    if (command) {
      command.status = "completed";
      command.result_json = String(values[5]);
    }
    return;
  }
  if (normalized.startsWith("UPDATE ai_package_apply_commands") && normalized.includes("status = 'failed'")) {
    const command = fixture.commands.find((row) => row.id === values[2]);
    if (command) command.status = "failed";
    return;
  }
  if (normalized.startsWith("INSERT INTO cost_library_items")) {
    fixture.components.push({
      id: values[0],
      workspace_id: values[1],
      name: values[2],
      description: values[3],
      category: values[4],
      library_folder_id: values[5],
      supplier: values[6],
      brand: values[7],
      unit: values[8],
      unit_cost: values[9],
      misc_cost: values[10],
      lifecycle_state: values[11],
      active_price_option_id: values[12],
      metadata_json: values[13],
    });
    return;
  }
  if (normalized.startsWith("INSERT INTO cost_library_item_price_options")) {
    fixture.priceOptions.push({
      id: values[0],
      workspace_id: values[1],
      item_id: values[2],
      label: values[3],
      unit: values[4],
      unit_cost: values[5],
      misc_cost: values[6],
      currency: values[7],
      is_active: values[8],
      is_default: values[9],
      updated_at: values[10],
      pricing_source: values[12],
      metadata_json: values[13],
    });
    return;
  }
  if (normalized.startsWith("INSERT INTO projects")) {
    fixture.projects.push({
      id: values[0],
      workspace_id: values[1],
      name: values[2],
      client_name: values[3],
      location: values[4],
      currency_code: values[5],
      metadata: values[6],
    });
    return;
  }
  if (normalized.startsWith("INSERT INTO estimates")) {
    fixture.estimates.push({ id: values[0], project_id: values[1], name: values[2], sheet_code: values[3] });
    return;
  }
  if (normalized.startsWith("INSERT INTO estimate_tabs")) {
    fixture.tabs.push({ id: values[0], estimate_id: values[1], name: "Main", is_default: 1 });
    return;
  }
  if (normalized.startsWith("INSERT INTO estimate_nodes")) {
    fixture.nodes.push({
      id: values[0],
      estimate_id: values[1],
      estimate_tab_id: values[2],
      parent_id: values[3],
      kind: values[4],
      name: values[5],
      sort_order: values[6],
      metadata_json: values[7],
    });
    return;
  }
  if (normalized.startsWith("INSERT INTO estimate_row_items")) {
    fixture.rows.push({
      id: values[0],
      estimate_id: values[1],
      node_id: values[2],
      description: values[3],
      designation: values[4],
      discipline: values[5],
      material: values[6],
      supplier: values[7],
      supplier_id: values[8],
      quantity: values[9],
      quantity_base: values[10],
      quantity_contingency_amount: values[11],
      unit: values[12],
      unit_cost: values[13],
      misc_cost: values[14],
      contingency_percentage: values[15],
      adjustment_percentage: values[16],
      source_snapshot_json: values[17],
      sort_order: values[18],
      row_revision: 0,
      category_node_id: values[19],
      source_library_item_id: values[20],
      link_state: values[21],
      metadata_json: values[22],
    });
    return;
  }
  if (normalized.startsWith("INSERT INTO estimate_sheet_events")) {
    fixture.events.push({
      id: values[0],
      estimate_id: values[1],
      workspace_id: values[2],
      project_id: values[3],
      estimate_node_id: values[4],
      estimate_tab_id: values[5],
      target_row_id: values[6],
      event_type: values[7],
      correlation_id: values[8],
      actor_user_id: values[9],
      payload: values[14],
    });
    return;
  }
  if (normalized.startsWith("UPDATE estimate_nodes")) {
    const node = fixture.nodes.find((row) => row.id === values[2] && row.estimate_id === values[3]);
    if (node) node.name = values[0];
    return;
  }
  if (normalized.startsWith("UPDATE estimate_row_items")) {
    const row = fixture.rows.find((candidate) => candidate.id === values.at(-2) && candidate.estimate_id === values.at(-1));
    if (row) row.row_revision = Number(row.row_revision ?? 0) + 1;
    return;
  }
  if (normalized.startsWith("DELETE FROM estimate_row_items")) {
    fixture.rows = fixture.rows.filter((row) => !(row.id === values[0] && row.estimate_id === values[1]));
    return;
  }
  throw new Error(`Unexpected D1 run query: ${normalized}`);
}

function makeLibraryValidationRows() {
  return [
    {
      id: "11111111-1111-4111-8111-111111111111",
      workspace_id: WORKSPACE_ID,
      name: "Queen bed frame",
      description: "Standard bed frame for condo bedrooms.",
      supplier: "Bedroom Supplier",
      supplier_id: null,
      category: "Furniture",
      category_node_id: null,
      library_folder_id: "folder-furniture",
      brand: null,
      brand_id: null,
      unit: "pc",
      unit_cost: 18_000,
      misc_cost: 0,
      lifecycle_state: "available",
      current_version_number: 1,
      active_price_option_id: null,
      pricing_date: "2026-05-28",
      pricing_source: "Component library",
      thumbnail_path: null,
    },
    {
      id: "22222222-2222-4222-8222-222222222222",
      workspace_id: WORKSPACE_ID,
      name: "Water closet",
      description: "Floor-mounted toilet fixture for toilet and bath areas.",
      supplier: "Plumbing Supplier",
      supplier_id: null,
      category: "Sanitary Systems",
      category_node_id: null,
      library_folder_id: "folder-sanitary-systems",
      brand: null,
      brand_id: null,
      unit: "set",
      unit_cost: 12_500,
      misc_cost: 0,
      lifecycle_state: "available",
      current_version_number: 1,
      active_price_option_id: null,
      pricing_date: "2026-05-28",
      pricing_source: "Component library",
      thumbnail_path: null,
    },
  ];
}

function makeFixture(overrides: Partial<Fixture> = {}): Fixture {
  return {
    commands: [],
    components: makeLibraryValidationRows(),
    libraryFolders: [
      { id: "folder-uncategorized", workspace_id: WORKSPACE_ID, parent_id: null, name: "Uncategorized", is_default_category: 1 },
      { id: "folder-furniture", workspace_id: WORKSPACE_ID, parent_id: null, name: "Furniture", is_default_category: 0 },
      { id: "folder-sanitary-systems", workspace_id: WORKSPACE_ID, parent_id: null, name: "Sanitary Systems", is_default_category: 0 },
    ],
    priceOptions: [],
    projects: [{ id: PROJECT_ID, workspace_id: WORKSPACE_ID, name: "Lewis Residence" }],
    estimates: [{ id: ESTIMATE_ID, project_id: PROJECT_ID, name: "Current Estimate" }],
    tabs: [{ id: TAB_ID, estimate_id: ESTIMATE_ID, name: "Main", is_default: 1 }],
    nodes: [
      { id: ROOT_NODE_ID, estimate_id: ESTIMATE_ID, estimate_tab_id: TAB_ID, parent_id: null, kind: "group", name: "Current Estimate", sort_order: 0 },
      { id: AREA_NODE_ID, estimate_id: ESTIMATE_ID, estimate_tab_id: TAB_ID, parent_id: ROOT_NODE_ID, kind: "area", name: "Master Bedroom", sort_order: 0 },
    ],
    rows: [
      {
        id: ROW_ID,
        estimate_id: ESTIMATE_ID,
        node_id: AREA_NODE_ID,
        material: "Existing bed",
        description: "Existing row",
        supplier: "Existing Supplier",
        supplier_id: null,
        quantity: 1,
        unit: "pc",
        unit_cost: 10_000,
        misc_cost: 0,
        contingency_percentage: 0,
        adjustment_percentage: 0,
        source_snapshot_json: "{}",
        sort_order: 4,
        row_revision: 3,
        category_node_id: null,
        source_library_item_id: null,
        link_state: "unlinked",
        metadata_json: "{}",
      },
    ],
    events: [],
    templateNodes: [
      { id: "12121212-1212-4121-8121-121212121212", template_id: "11111111-1111-4111-8111-111111111111", parent_id: null, kind: "area", name: "Template Bedroom", sort_order: 0, metadata: "{}" },
    ],
    templateRows: [
      {
        id: "99999999-9999-4999-8999-999999999999",
        template_id: "11111111-1111-4111-8111-111111111111",
        template_node_id: "12121212-1212-4121-8121-121212121212",
        sort_order: 0,
        source_library_item_id: null,
        source_snapshot: "{}",
        category_node_id: null,
        supplier_id: null,
        material: "Template bedroom paint finish",
        description: "Paint finish copied from a workspace template.",
        supplier: "Template Supplier",
        unit: "lot",
        quantity: 1,
        unit_cost: 30_000,
        misc_cost: 2_000,
        contingency_percentage: 0,
        adjustment_percentage: 5,
        discipline: "",
        designation: "",
        link_state: "unlinked",
        metadata: "{}",
      },
    ],
    statements: [],
    ...overrides,
  };
}

function makeInput(draft: PackageBuilderDraft, idempotencyKey: string) {
  return {
    mode: "apply" as const,
    draft,
    draftHash: buildPackageDraftHash(draft),
    draftToken: "server.token",
    confirmation: { confirmed: true as const },
    idempotencyKey,
    userContext: {
      userId: USER_ID,
      email: "user@example.com",
      workspaceId: WORKSPACE_ID,
      authMode: "better-auth" as const,
    },
    authorizationRunId: AUTH_RUN_ID,
  };
}

function makeThreeBedroomCondoReadData(): PackageBuilderReadToolsData {
  return {
    workspace: { name: "Test Workspace" },
    projects: [],
    projectSummary: null,
    projectEstimates: [],
    estimateSummary: null,
    estimateTree: [],
    areaRows: [],
    historicalRowMatches: [],
    comparableEstimatePackages: [],
    componentMatches: makeLibraryValidationRows().map((row) => ({
      id: String(row.id),
      material: String(row.name),
      description: String(row.description),
      category: String(row.category),
      categoryPath: [String(row.category)],
      supplier: row.supplier as string | null,
      supplierId: null,
      brand: null,
      unit: String(row.unit),
      unitCost: Number(row.unit_cost),
      miscCost: Number(row.misc_cost),
      currency: "PHP",
      lifecycleState: "available",
      sourceLibraryItemId: String(row.id),
      currentVersionNumber: 1,
    })),
    templateMatches: [],
    memoryPreferences: { componentSignals: [], templateSignals: [], sourceRowCount: 0 },
    auditEvents: [],
  };
}

function makeFillCurrentEstimateDraft(overrides: Partial<PackageBuilderDraft> = {}): PackageBuilderDraft {
  const draft: PackageBuilderDraft = {
    schemaVersion: 1,
    mode: "draft",
    intent: "fill_current_estimate",
    draftId: "draft-fill-current",
    target: {
      projectId: PROJECT_ID,
      estimateId: ESTIMATE_ID,
      selectedNodeId: AREA_NODE_ID,
      activeTabId: TAB_ID,
      nodeIdsByClientDraftId: {
        "existing-root": ROOT_NODE_ID,
        "existing-area-1": AREA_NODE_ID,
      },
      areaNodeIdsByClientDraftId: {
        "existing-area-1": AREA_NODE_ID,
      },
    },
    brief: {
      projectName: "Lewis Residence",
      targetBudget: 5_000_000,
      currencyCode: "PHP",
      bedrooms: 3,
      floorCount: 1,
      finishLevel: "standard",
      missingInputs: [],
    },
    projectDraft: { name: "Lewis Residence", clientName: null, location: null, projectBudget: 5_000_000 },
    estimateDraft: { name: "Current Estimate", sheetCode: "ES-001" },
    treeDraft: [
      { clientDraftId: "existing-root", kind: "group", name: "Current Estimate", parentClientDraftId: null, sortOrder: 0 },
      { clientDraftId: "existing-area-1", kind: "area", name: "Master Bedroom", parentClientDraftId: "existing-root", sortOrder: 0 },
    ],
    rowDraft: [
      {
        clientDraftId: "row-bedroom-bed",
        targetAreaClientDraftId: "existing-area-1",
        sourceType: "allowance",
        sourceLibraryItemId: null,
        sourceTemplateId: null,
        material: "Master Bedroom bed allowance",
        description: "Generated bed allowance.",
        supplier: null,
        quantity: 1,
        unit: "allowance",
        unitCost: 25_000,
        miscCost: 1_000,
        contingencyPercentage: 10,
        adjustmentPercentage: 10,
        assumption: "No matched component.",
        warnings: ["Review before purchase."],
        applyEligible: true,
      },
    ],
    componentMatches: [],
    templateMatches: [],
    operations: [
      { operationId: "op-row-bedroom-bed", type: "insert_allowance_row", clientDraftId: "row-bedroom-bed", applyEligible: true },
    ],
    budgetSummary: {
      targetBudget: 5_000_000,
      draftSubtotal: 25_000,
      allowanceTotal: 26_000,
      contingencyTotal: 2_500,
      draftTotal: 28_500,
      variance: -4_971_500,
      currencyCode: "PHP",
      completeness: "partial",
    },
    assumptions: ["Targets the current estimate."],
    warnings: ["Generated allowance rows are review items."],
    applyEligibility: { eligible: true, reasons: [] },
    requiresConfirmation: true,
  };
  return { ...draft, ...overrides } as PackageBuilderDraft;
}

function makeLibraryComponentCreateDraft(): PackageBuilderDraft {
  return {
    ...makeFillCurrentEstimateDraft(),
    intent: "create_library_component",
    draftId: "draft-create-library-component",
    target: null,
    treeDraft: [],
    rowDraft: [],
    operations: [
      { operationId: "op-component-queen-bed-frame", type: "create_library_component", clientDraftId: "component-queen-bed-frame", applyEligible: true },
    ],
    componentCreateDraft: [
      {
        clientDraftId: "component-queen-bed-frame",
        name: "Queen bed frame",
        description: "Standard bed frame for condo bedrooms.",
        category: "Furniture",
        supplier: "Bedroom Supplier",
        brand: null,
        unit: "set",
        unitCost: 18_000,
        miscCost: 0,
        currencyCode: "PHP",
        pricingSource: "Ask Flip draft",
        lifecycleState: "available",
        warnings: ["Review supplier and pricing before Apply."],
        applyEligible: true,
      },
    ],
    budgetSummary: {
      targetBudget: 18_000,
      draftSubtotal: 18_000,
      allowanceTotal: 0,
      contingencyTotal: 0,
      draftTotal: 18_000,
      variance: 0,
      currencyCode: "PHP",
      completeness: "review-required",
    },
    warnings: ["Review supplier and pricing before Apply."],
  } as PackageBuilderDraft;
}

describe("package-builder Apply", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    workspaceMocks.ensureDefaultWorkspace.mockResolvedValue({ workspace: { id: WORKSPACE_ID } });
    authMocks.requireCurrentUserContext.mockResolvedValue({ userId: USER_ID });
    authzMocks.canEditEstimateInD1.mockResolvedValue(true);
    authzMocks.isWorkspaceEditorInD1.mockResolvedValue(true);
  });

  it("creates component-library records through D1 and records the command result", async () => {
    const fixture = makeFixture({ components: [], priceOptions: [] });
    d1Mocks.getCloudflareD1Database.mockResolvedValue(makeD1(fixture));
    const draft = makeLibraryComponentCreateDraft();

    const { applyPackageBuilderDraft } = await import("@/lib/ai/package-builder/apply");
    const result = await applyPackageBuilderDraft(makeInput(draft, "idem-create-library-component"));

    expect(result).toMatchObject({
      projectId: null,
      estimateId: null,
      createdComponentCount: 1,
      total: 18_000,
      recoveryStatus: "completed",
    });
    expect(fixture.components).toHaveLength(1);
    expect(fixture.components[0]).toMatchObject({ category: "Furniture", library_folder_id: "folder-furniture" });
    expect(fixture.priceOptions).toHaveLength(1);
    expect(fixture.commands[0]).toMatchObject({ command_kind: "library_components_package", status: "completed" });
    expect(cacheMocks.revalidatePath).toHaveBeenCalledWith("/workshop/library");
  });

  it("replays completed component Apply commands without duplicate writes", async () => {
    const draft = makeLibraryComponentCreateDraft();
    const resultJson = JSON.stringify({
      projectId: null,
      estimateId: null,
      selectedNodeId: null,
      createdNodeIds: {},
      insertedRowIds: [],
      createdComponentIds: ["aaaaaaaa-1111-4aaa-8aaa-aaaaaaaa1111"],
      createdComponentCount: 1,
      total: 18_000,
      warnings: draft.warnings,
      recoveryStatus: "completed",
      idempotencyKey: "idem-replay",
      idempotentReplay: false,
      auditRunId: AUTH_RUN_ID,
    });
    const fixture = makeFixture({
      commands: [{
        id: "command-1",
        workspace_id: WORKSPACE_ID,
        idempotency_key: "idem-replay",
        command_kind: "library_components_package",
        draft_id: draft.draftId,
        draft_hash: buildPackageDraftHash(draft),
        status: "completed",
        result_json: resultJson,
      }],
      components: [],
      priceOptions: [],
    });
    d1Mocks.getCloudflareD1Database.mockResolvedValue(makeD1(fixture));

    const { applyPackageBuilderDraft } = await import("@/lib/ai/package-builder/apply");
    const result = await applyPackageBuilderDraft(makeInput(draft, "idem-replay"));

    expect(result).toMatchObject({ recoveryStatus: "idempotent_replay", idempotentReplay: true });
    expect(fixture.components).toHaveLength(0);
    expect(fixture.priceOptions).toHaveLength(0);
  });

  it("rejects idempotency key reuse for a different draft hash", async () => {
    const draft = makeLibraryComponentCreateDraft();
    const fixture = makeFixture({
      commands: [{
        id: "command-1",
        workspace_id: WORKSPACE_ID,
        idempotency_key: "idem-conflict",
        command_kind: "library_components_package",
        draft_id: draft.draftId,
        draft_hash: "different-hash",
        status: "completed",
        result_json: "{}",
      }],
    });
    d1Mocks.getCloudflareD1Database.mockResolvedValue(makeD1(fixture));

    const { applyPackageBuilderDraft } = await import("@/lib/ai/package-builder/apply");
    await expect(applyPackageBuilderDraft(makeInput(draft, "idem-conflict"))).rejects.toThrow(
      "Idempotency key already belongs to a different component draft.",
    );
  });

  it("creates a package project, estimate, tree, rows, audit event, and completed command in D1", async () => {
    const draft = buildPackageBuilderDraft({
      message: "Make a project for me with an estimate sheet which is for a 3 bedroom condo unit.",
      readData: makeThreeBedroomCondoReadData(),
      providerResult: null,
    });
    const fixture = makeFixture({ projects: [], estimates: [], tabs: [], nodes: [], rows: [], events: [] });
    d1Mocks.getCloudflareD1Database.mockResolvedValue(makeD1(fixture));

    const { applyPackageBuilderDraft } = await import("@/lib/ai/package-builder/apply");
    const result = await applyPackageBuilderDraft(makeInput(draft, "idem-create-condo-package"));

    expect(draft.intent).toBe("create_package_project");
    expect(result.projectId).toEqual(expect.any(String));
    expect(result.estimateId).toEqual(expect.any(String));
    expect(result.insertedRowIds).toHaveLength(draft.rowDraft.length);
    expect(result.total).toBe(draft.budgetSummary.draftTotal);
    expect(fixture.projects).toHaveLength(1);
    expect(fixture.estimates).toHaveLength(1);
    expect(fixture.tabs).toHaveLength(1);
    expect(fixture.nodes).toHaveLength(draft.treeDraft.length);
    expect(fixture.rows).toHaveLength(draft.rowDraft.length);
    expect(fixture.events.some((event) => event.event_type === "project_estimate_package_applied")).toBe(true);
    expect(fixture.commands[0]).toMatchObject({ command_kind: "project_estimate_package", status: "completed" });
  });

  it("inserts fill-current-estimate allowance rows through D1 history events", async () => {
    const fixture = makeFixture();
    d1Mocks.getCloudflareD1Database.mockResolvedValue(makeD1(fixture));
    const draft = makeFillCurrentEstimateDraft();

    const { applyPackageBuilderDraft } = await import("@/lib/ai/package-builder/apply");
    const result = await applyPackageBuilderDraft(makeInput(draft, "idem-fill-current"));

    expect(result).toMatchObject({
      projectId: PROJECT_ID,
      estimateId: ESTIMATE_ID,
      selectedNodeId: AREA_NODE_ID,
      total: 28_500,
      recoveryStatus: "completed",
    });
    const inserted = fixture.rows.find((row) => row.material === "Master Bedroom bed allowance");
    expect(inserted).toMatchObject({ node_id: AREA_NODE_ID, sort_order: 5, link_state: "unlinked" });
    expect(fixture.events.some((event) => event.event_type === "estimate_row_inserted")).toBe(true);
  });

  it("creates missing Area Nodes before inserting fill-current rows", async () => {
    const draft = makeFillCurrentEstimateDraft({
      target: {
        projectId: PROJECT_ID,
        estimateId: ESTIMATE_ID,
        selectedNodeId: ROOT_NODE_ID,
        activeTabId: TAB_ID,
        nodeIdsByClientDraftId: { "existing-root": ROOT_NODE_ID },
        areaNodeIdsByClientDraftId: {},
      },
      treeDraft: [
        { clientDraftId: "existing-root", kind: "group", name: "Current Estimate", parentClientDraftId: null, sortOrder: 0 },
        { clientDraftId: "area-master-bedroom", kind: "area", name: "Master Bedroom", parentClientDraftId: "existing-root", sortOrder: 0 },
      ],
      rowDraft: [{
        ...makeFillCurrentEstimateDraft().rowDraft[0],
        targetAreaClientDraftId: "area-master-bedroom",
      }],
      operations: [
        { operationId: "op-tree-master-bedroom", type: "create_tree_node", clientDraftId: "area-master-bedroom", applyEligible: true },
        { operationId: "op-row-bedroom-bed", type: "insert_allowance_row", clientDraftId: "row-bedroom-bed", applyEligible: true },
      ],
    });
    const fixture = makeFixture({ rows: [] });
    d1Mocks.getCloudflareD1Database.mockResolvedValue(makeD1(fixture));

    const { applyPackageBuilderDraft } = await import("@/lib/ai/package-builder/apply");
    const result = await applyPackageBuilderDraft(makeInput(draft, "idem-fill-current-new-area"));

    expect(Object.keys(result.createdNodeIds)).toEqual(["area-master-bedroom"]);
    const createdAreaId = result.createdNodeIds["area-master-bedroom"];
    expect(fixture.nodes.find((node) => node.id === createdAreaId)).toMatchObject({ kind: "area", parent_id: ROOT_NODE_ID });
    expect(fixture.rows.find((row) => row.node_id === createdAreaId)).toBeDefined();
  });

  it("replaces and deletes existing rows through D1 row history guards", async () => {
    const replacementDraft = makeFillCurrentEstimateDraft({
      rowDraft: [],
      rowReplacementDraft: [{
        clientDraftId: "replace-row",
        targetRowId: ROW_ID,
        expectedRowRevision: 3,
        sourceLibraryItemId: "11111111-1111-4111-8111-111111111111",
        priceOptionId: null,
        priceOptionUpdatedAt: null,
        material: "Queen bed frame",
        description: "Standard bed frame for condo bedrooms.",
        supplier: "Bedroom Supplier",
        quantity: 1,
        unit: "pc",
        unitCost: 18_000,
        miscCost: 0,
        contingencyPercentage: -8,
        adjustmentPercentage: -8,
        category: "Furniture",
        categoryPath: ["Furniture"],
        supplierId: null,
        brand: null,
        currentVersionNumber: 1,
        warnings: [],
        applyEligible: true,
        sourceSnapshot: { sourceType: "library_item", sourceLibraryItemId: "11111111-1111-4111-8111-111111111111", componentVersionNumber: 1 },
      }],
      operations: [{ operationId: "op-replace-row", type: "replace_existing_row", clientDraftId: "replace-row", applyEligible: true }],
    });
    const fixture = makeFixture();
    d1Mocks.getCloudflareD1Database.mockResolvedValue(makeD1(fixture));

    const { applyPackageBuilderDraft } = await import("@/lib/ai/package-builder/apply");
    const replacement = await applyPackageBuilderDraft(makeInput(replacementDraft, "idem-replace-row"));

    expect(replacement.replacedRowIds).toEqual([ROW_ID]);
    expect(fixture.events.some((event) => event.event_type === "estimate_row_updated")).toBe(true);

    const deleteDraft = makeFillCurrentEstimateDraft({
      rowDraft: [],
      rowDeleteDraft: [{
        clientDraftId: "delete-row",
        targetRowId: ROW_ID,
        expectedRowRevision: 4,
        warnings: [],
        applyEligible: true,
      }],
      operations: [{ operationId: "op-delete-row", type: "delete_existing_row", clientDraftId: "delete-row", applyEligible: true }],
    });
    const deleted = await applyPackageBuilderDraft(makeInput(deleteDraft, "idem-delete-row"));

    expect(deleted.deletedRowIds).toEqual([ROW_ID]);
    expect(fixture.rows.find((row) => row.id === ROW_ID)).toBeUndefined();
    expect(fixture.events.some((event) => event.event_type === "estimate_row_deleted")).toBe(true);
  });

  it("inserts matched templates into the current estimate through D1", async () => {
    const draft = makeFillCurrentEstimateDraft({
      rowDraft: [],
      templateInsertDraft: [{
        clientDraftId: "insert-template-condo-starter",
        sourceTemplateId: "11111111-1111-4111-8111-111111111111",
        sourceTemplateName: "3 Bedroom Condo Starter",
        targetParentClientDraftId: "existing-root",
        expectedNodeCount: 1,
        expectedRowCount: 1,
        previewTotal: 32_000,
        warnings: [],
        applyEligible: true,
      }],
      operations: [{
        operationId: "op-template-insert-template-condo-starter",
        type: "insert_template",
        clientDraftId: "insert-template-condo-starter",
        applyEligible: true,
      }],
    });
    const fixture = makeFixture();
    d1Mocks.getCloudflareD1Database.mockResolvedValue(makeD1(fixture));

    const { applyPackageBuilderDraft } = await import("@/lib/ai/package-builder/apply");
    const result = await applyPackageBuilderDraft(makeInput(draft, "idem-template-insert"));

    expect(result.insertedTemplateNodeCount).toBe(1);
    expect(result.insertedTemplateRowCount).toBe(1);
    expect(result.insertedTemplateRootNodeIds).toHaveLength(1);
    expect(fixture.events.some((event) => event.event_type === "estimate_template_inserted")).toBe(true);
  });
});
