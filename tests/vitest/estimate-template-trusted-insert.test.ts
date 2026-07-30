import { describe, expect, it, vi } from "vitest";

import type { CurrentUserContext } from "@/lib/auth/session";
import type { D1DatabaseLike, D1PreparedStatementLike, D1Result, D1Value } from "@/lib/cloudflare/d1";
import {
  buildTemplateSidecarSourceGuard,
  insertEstimateTemplateIntoEstimateWithHistory,
  insertEstimateTemplatesIntoEstimateWithHistory,
  loadTemplateSidecars,
} from "@/lib/estimates/d1-intents/templates";

vi.mock("server-only", () => ({}));

const PROJECT_ID = "11111111-1111-4111-8111-111111111111";
const WORKSPACE_ID = "22222222-2222-4222-8222-222222222222";
const ESTIMATE_ID = "33333333-3333-4333-8333-333333333333";
const PARENT_NODE_ID = "44444444-4444-4444-8444-444444444444";
const TEMPLATE_ID = "55555555-5555-4555-8555-555555555555";
const SECOND_TEMPLATE_ID = "56565656-5656-4565-8565-565656565656";
const TEMPLATE_NODE_ID = "66666666-6666-4666-8666-666666666666";
const SECOND_TEMPLATE_NODE_ID = "67676767-6767-4676-8676-676767676767";
const TEMPLATE_ROW_ID = "77777777-7777-4777-8777-777777777777";
const SECOND_TEMPLATE_ROW_ID = "78787878-7878-4787-8787-787878787878";
const COMPONENT_ID = "88888888-8888-4888-8888-888888888888";
const PRICE_OPTION_ID = "99999999-9999-4999-8999-999999999999";
const TARGET_TAB_ID = "abababab-abab-4bab-8bab-abababababab";
const INSERT_INTENT_ID = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const LINK_INTENT_ID = "bcbcbcbc-bcbc-4bcb-8bcb-bcbcbcbcbcbc";

function currentUser(): CurrentUserContext {
  const now = "2026-07-14T00:00:00.000Z";
  return {
    avatarUrl: null,
    displayName: "Admin",
    email: "admin@example.test",
    profile: {
      avatar_url: null,
      created_at: now,
      default_workspace_id: WORKSPACE_ID,
      display_name: "Admin",
      email: "admin@example.test",
      id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      role: "admin",
      updated_at: now,
    },
    role: "admin",
    userId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
  };
}

function recordFromInsert(statement: FakeStatement) {
  const columns = statement.sql
    .slice(statement.sql.indexOf("(") + 1, statement.sql.indexOf(")"))
    .split(",")
    .map((column) => column.replaceAll('"', "").trim());
  return Object.fromEntries(columns.map((column, index) => [column, statement.values[index]]));
}

class FakeStatement<T = Record<string, unknown>> implements D1PreparedStatementLike<T> {
  values: D1Value[] = [];

  constructor(readonly database: TemplateInsertDatabase, readonly sql: string) {}

  bind(...values: D1Value[]) {
    this.values = values;
    return this;
  }

  async first<R = T>(): Promise<R | null> {
    if (this.sql.includes("FROM estimate_mutation_receipts")) {
      return this.database.receipts.get(`${String(this.values[1])}:${String(this.values[2])}`) as R | undefined ?? null;
    }
    if (this.sql.includes("SELECT estimate.id")) {
      return { id: ESTIMATE_ID, project_id: PROJECT_ID, workspace_id: WORKSPACE_ID } as R;
    }
    if (this.sql.includes("FROM estimate_tabs")) {
      return this.database.activeTab ? { id: TARGET_TAB_ID } as R : null;
    }
    if (this.sql.includes("FROM estimate_templates")) {
      this.database.sourceReadCount += 1;
      return {
        id: TEMPLATE_ID,
        workspace_id: WORKSPACE_ID,
        name: "Living room Template",
        description: "Linked Template fixture",
        category: "Interior",
        current_version_number: 1,
        archived_at: null,
        created_by: currentUser().userId,
        updated_at: "2026-07-14T00:00:00.000Z",
      } as R;
    }
    if (this.sql.includes("FROM estimate_nodes")) {
      return {
        id: PARENT_NODE_ID,
        estimate_id: ESTIMATE_ID,
        estimate_tab_id: this.database.parentTabId,
        parent_id: null,
        kind: this.database.parentKind,
        name: "Target",
        sort_order: 0,
        updated_at: "2026-07-14T00:00:00.000Z",
      } as R;
    }
    if (this.sql.includes("FROM estimate_sheet_events") && this.sql.includes("correlation_id")) return null;
    return null;
  }

  async all<R = T>(): Promise<D1Result<R>> {
    if (this.sql.includes("FROM estimate_templates")) {
      this.database.sourceReadCount += 1;
      const requestedTemplateIds = new Set(
        JSON.parse(String(this.values[1] ?? "[]")) as string[],
      );
      return {
        success: true,
        results: [TEMPLATE_ID, SECOND_TEMPLATE_ID]
          .filter((id) => requestedTemplateIds.has(id))
          .map((id) => ({ id, workspace_id: WORKSPACE_ID, updated_at: "2026-07-14T00:00:00.000Z" })) as R[],
      };
    }
    if (this.sql.includes("FROM estimate_template_nodes")) {
      this.database.sourceReadCount += 1;
      return { success: true, results: this.database.templateNodes as R[] };
    }
    if (this.sql.includes("FROM estimate_template_row_items")) {
      this.database.sourceReadCount += 1;
      return { success: true, results: this.database.templateRows as R[] };
    }
    if (this.sql.includes("FROM estimate_template_row_variant_selections")) {
      return { success: true, results: this.database.templateVariants as R[] };
    }
    if (this.sql.includes("FROM estimate_template_alternative_groups")) {
      return { success: true, results: this.database.templateAlternativeGroups as R[] };
    }
    if (this.sql.includes("FROM estimate_template_alternative_members")) {
      return { success: true, results: this.database.templateAlternativeMembers as R[] };
    }
    if (this.sql.includes("FROM estimate_template_optional_items")) {
      return { success: true, results: this.database.templateOptionalItems as R[] };
    }
    if (this.sql.includes("FROM estimate_template_accessory_edges")) {
      return { success: true, results: this.database.templateAccessoryEdges as R[] };
    }
    if (this.sql.includes("FROM cost_library_items")) {
      return {
        success: true,
        results: [{
          id: COMPONENT_ID,
          workspace_id: WORKSPACE_ID,
          name: "Current material",
          description: "Current description",
          supplier: "Current supplier",
          supplier_id: "current-supplier",
          brand: "Current brand",
          brand_id: "current-brand",
          category: "Current category",
          category_node_id: "current-category",
          unit: "item-unit",
          unit_cost: 200,
          misc_cost: 20,
          pricing_source: "Item source",
          pricing_date: "2026-07-01",
          metadata_json: "{}",
          thumbnail_path: "/current.jpg",
          current_version_number: 7,
          lifecycle_state: this.database.lifecycleState,
          updated_at: "2026-07-14T00:00:00.000Z",
        }] as R[],
      };
    }
    if (this.sql.includes("FROM cost_library_item_price_options")) {
      return {
        success: true,
        results: [{
          id: PRICE_OPTION_ID,
          workspace_id: WORKSPACE_ID,
          item_id: COMPONENT_ID,
          label: "Current option",
          unit: "pc",
          unit_cost: 250,
          misc_cost: 25,
          currency: "PHP",
          supplier_id: "option-supplier",
          brand: "Option brand",
          brand_id: "option-brand",
          pricing_source: "Option source",
          metadata_json: "{}",
          is_active: 1,
          is_default: 1,
          created_at: "2026-07-01T00:00:00.000Z",
          updated_at: "2026-07-14T00:00:00.000Z",
        }] as R[],
      };
    }
    if (this.sql.includes("FROM cost_library_item_variant_cost_entries")) {
      return {
        success: true,
        results: [{
          id: "cdcdcdcd-cdcd-4dcd-8dcd-cdcdcdcdcdcd",
          workspace_id: WORKSPACE_ID,
          item_id: COMPONENT_ID,
          price_option_id: PRICE_OPTION_ID,
          unit_cost: 300,
          misc_cost: 30,
          currency: "PHP",
          pricing_source: "Current cost entry",
          pricing_date: "2026-07-14",
          source_url: "https://example.test/current",
          updated_at: "2026-07-14T00:00:00.000Z",
        }] as R[],
      };
    }
    return { success: true, results: [] };
  }

  async run(): Promise<D1Result<T>> {
    return { success: true };
  }
}

class TemplateInsertDatabase implements D1DatabaseLike {
  readonly batches: FakeStatement[][] = [];
  readonly preparedStatements: FakeStatement[] = [];
  sourceReadCount = 0;
  readonly receipts = new Map<string, {
    actor_user_id: string;
    request_fingerprint: string;
    result_json: string;
    status: string;
  }>();
  parentKind = "group";
  parentTabId: string | null = TARGET_TAB_ID;
  activeTab = true;
  templateVariants: Array<Record<string, unknown>> = [];
  templateAlternativeGroups: Array<Record<string, unknown>> = [];
  templateAlternativeMembers: Array<Record<string, unknown>> = [];
  templateOptionalItems: Array<Record<string, unknown>> = [];
  templateAccessoryEdges: Array<Record<string, unknown>> = [];
  templateNodes = [{
    id: TEMPLATE_NODE_ID,
    template_id: TEMPLATE_ID,
    parent_id: null,
    kind: "area",
    name: "Living",
    sort_order: 0,
    metadata: "{}",
    updated_at: "2026-07-14T00:00:00.000Z",
  }];
  templateRows = [{
    id: TEMPLATE_ROW_ID,
    template_id: TEMPLATE_ID,
    template_node_id: TEMPLATE_NODE_ID,
    sort_order: 0,
    source_library_item_id: COMPONENT_ID,
    source_snapshot: JSON.stringify({ priceOptionId: PRICE_OPTION_ID, priceOptionLabel: "Saved" }),
    pricing_provenance_origin: "inherited_snapshot",
    category_node_id: "saved-category",
    supplier_id: "saved-supplier",
    material: "Saved material",
    description: "Saved description",
    supplier: "Saved supplier",
    unit: "saved-unit",
    quantity: 2,
    unit_cost: 100,
    misc_cost: 5,
    contingency_percentage: 0,
    adjustment_percentage: 10,
    discipline: "Architectural",
    designation: "Furniture",
    link_state: "linked-clean",
    metadata: "{}",
    updated_at: "2026-07-14T00:00:00.000Z",
  }];

  constructor(readonly lifecycleState: string) {}

  prepare<T = Record<string, unknown>>(sql: string) {
    const statement = new FakeStatement<T>(this, sql);
    this.preparedStatements.push(statement);
    return statement;
  }

  async batch<T = Record<string, unknown>>(statements: D1PreparedStatementLike<T>[]) {
    const fakeStatements = statements as FakeStatement[];
    this.batches.push(fakeStatements);
    for (const statement of fakeStatements) {
      if (!statement.sql.includes("INSERT INTO estimate_mutation_receipts")) continue;
      this.receipts.set(`${String(statement.values[2])}:${String(statement.values[3])}`, {
        actor_user_id: String(statement.values[4]),
        request_fingerprint: String(statement.values[7]),
        result_json: String(statement.values[8]),
        status: "committed",
      });
    }
    return statements.map(() => ({ success: true }));
  }
}

function insert(
  database: D1DatabaseLike,
  unavailableSourcePolicy?: "cancel" | "use_saved_snapshot_unlinked",
  overrides: Partial<{ correlationId: string; targetTabId: string }> = {},
) {
  return insertEstimateTemplateIntoEstimateWithHistory(database, currentUser(), {
    projectId: PROJECT_ID,
    estimateId: ESTIMATE_ID,
    targetParentNodeId: PARENT_NODE_ID,
    templateId: TEMPLATE_ID,
    unavailableSourcePolicy: unavailableSourcePolicy ?? "cancel",
    correlationId: INSERT_INTENT_ID,
    ...overrides,
  });
}

function insertMany(database: D1DatabaseLike, templateIds: string[], correlationId = INSERT_INTENT_ID) {
  return insertEstimateTemplatesIntoEstimateWithHistory(database, currentUser(), {
    projectId: PROJECT_ID,
    estimateId: ESTIMATE_ID,
    targetParentNodeId: PARENT_NODE_ID,
    templateIds,
    unavailableSourcePolicy: "cancel",
    correlationId,
  });
}

function insertLinked(
  database: D1DatabaseLike,
  overrides: Partial<{ correlationId: string; targetTabId: string | undefined }> = {},
) {
  return insertEstimateTemplateIntoEstimateWithHistory(database, currentUser(), {
    projectId: PROJECT_ID,
    estimateId: ESTIMATE_ID,
    targetParentNodeId: PARENT_NODE_ID,
    templateId: TEMPLATE_ID,
    unavailableSourcePolicy: "cancel",
    correlationId: LINK_INTENT_ID,
    targetTabId: TARGET_TAB_ID,
    mode: "linked",
    ...overrides,
  });
}

describe("trusted estimate template insertion", () => {
  it("returns a typed copy fallback without writes when linked insertion has no active tab", async () => {
    const database = new TemplateInsertDatabase("available");
    database.parentTabId = null;

    const result = await insertLinked(database, { targetTabId: undefined });

    expect(result).toEqual({
      status: "requires_active_tab",
      code: "template_link_requires_active_tab",
      estimateId: ESTIMATE_ID,
      targetParentNodeId: PARENT_NODE_ID,
    });
    expect(database.batches).toHaveLength(0);
  });

  it("links one whole Template through a constant-count set-based batch", async () => {
    const database = new TemplateInsertDatabase("available");

    const result = await insertLinked(database);

    expect(result).toMatchObject({
      status: "inserted",
      mode: "linked",
      instanceId: expect.any(String),
      templateId: TEMPLATE_ID,
      estimateTabId: TARGET_TAB_ID,
      insertedNodeCount: 1,
      insertedRowItemCount: 1,
      appliedVersionNumber: 1,
      targetVersionNumber: 1,
      statementCount: 12,
    });
    expect(database.batches).toHaveLength(1);
    expect(database.batches[0]).toHaveLength(12);
    expect(database.batches[0][0]?.sql).toContain("estimate_template_link_source_guard");
    expect(database.batches[0].filter((statement) => statement.sql.includes("INSERT INTO estimate_nodes"))).toHaveLength(1);
    expect(database.batches[0].filter((statement) => statement.sql.includes("INSERT INTO estimate_row_items"))).toHaveLength(1);
    expect(database.batches[0].filter((statement) => statement.sql.includes("INSERT INTO estimate_template_instance_nodes"))).toHaveLength(1);
    expect(database.batches[0].filter((statement) => statement.sql.includes("INSERT INTO estimate_template_instance_rows"))).toHaveLength(1);
    const versionInsert = database.batches[0].find((statement) => statement.sql.includes("INSERT INTO estimate_template_versions"));
    const nodeInsert = database.batches[0].find((statement) => statement.sql.includes("INSERT INTO estimate_nodes"));
    const rowInsert = database.batches[0].find((statement) => statement.sql.includes("INSERT INTO estimate_row_items"));
    const instanceInsert = database.batches[0].find((statement) => statement.sql.includes("INSERT INTO estimate_template_instances"));
    expect(versionInsert).toBeDefined();
    expect(nodeInsert).toBeDefined();
    expect(rowInsert).toBeDefined();
    expect(instanceInsert).toBeDefined();
    const snapshot = JSON.parse(String(versionInsert!.values[3]));
    expect(snapshot.rows[0]).toEqual({
      id: TEMPLATE_ROW_ID,
      rowKind: "component",
      templateNodeId: TEMPLATE_NODE_ID,
      sortOrder: 0,
      sourceLibraryItemId: COMPONENT_ID,
      selectedVariantId: PRICE_OPTION_ID,
      initialTakeoffDefaults: {
        quantity: 2,
        contingencyPercentage: 0,
        adjustmentPercentage: 10,
      },
    });
    expect(JSON.parse(String(nodeInsert!.values[2]))).toHaveLength(1);
    const insertedRows = JSON.parse(String(rowInsert!.values[2])) as Array<{
      brandId: string;
      sourceSnapshot: Record<string, unknown>;
    }>;
    expect(insertedRows).toHaveLength(1);
    expect(insertedRows[0]).toMatchObject({
      brandId: "option-brand",
      sourceSnapshot: { brand: "Option brand", brandId: "option-brand" },
    });
  });

  it("replays a committed linked insertion without another source read or batch", async () => {
    const database = new TemplateInsertDatabase("available");

    const first = await insertLinked(database);
    const sourceReadCount = database.sourceReadCount;
    const replay = await insertLinked(database);

    expect(replay).toEqual(first);
    expect(database.sourceReadCount).toBe(sourceReadCount);
    expect(database.batches).toHaveLength(1);
  });

  it("stores linked variant sidecars in the version snapshot and materialized estimate", async () => {
    const database = new TemplateInsertDatabase("available");
    database.templateVariants = [{
      template_row_item_id: TEMPLATE_ROW_ID,
      template_id: TEMPLATE_ID,
      selected_price_option_id: PRICE_OPTION_ID,
      selected_option_snapshot_json: JSON.stringify({ id: PRICE_OPTION_ID, label: "Linked variant" }),
    }];

    const result = await insertLinked(database);

    expect(result).toMatchObject({ status: "inserted", statementCount: 13 });
    const batch = database.batches[0] ?? [];
    const versionInsert = batch.find((statement) => statement.sql.includes("INSERT INTO estimate_template_versions"))!;
    const snapshot = JSON.parse(String(versionInsert.values[3])) as {
      sidecars: { variantSelections: Array<Record<string, unknown>> };
    };
    expect(snapshot.sidecars.variantSelections).toEqual([expect.objectContaining({
      templateRowItemId: TEMPLATE_ROW_ID,
      selectedPriceOptionId: PRICE_OPTION_ID,
    })]);
    const rowInsert = batch.find((statement) => statement.sql.includes("INSERT INTO estimate_row_items"))!;
    const insertedRowId = (JSON.parse(String(rowInsert.values[2])) as Array<{ id: string }>)[0]?.id;
    const variantInsert = batch.find((statement) => statement.sql.includes("INSERT INTO estimate_row_variant_selections"))!;
    const variantPayload = JSON.parse(String(variantInsert.values.at(-1))) as Array<{ rowId: string }>;
    expect(variantPayload[0]?.rowId).toBe(insertedRowId);
    expect(variantPayload[0]?.rowId).not.toBe(TEMPLATE_ROW_ID);
  });

  it("rejects missing atomic support before auth, receipt, or source reads", async () => {
    const database = new TemplateInsertDatabase("available");
    Object.defineProperty(database, "batch", { value: undefined });

    await expect(insert(database)).rejects.toThrow("Something went wrong. Try again in a moment.");
    expect(database.sourceReadCount).toBe(0);
    expect(database.batches).toEqual([]);
  });

  it("copies multiple templates through the plural intent in one ordered history, outbox, and receipt batch", async () => {
    const database = new TemplateInsertDatabase("available");
    database.templateNodes.push({
      id: SECOND_TEMPLATE_NODE_ID,
      template_id: SECOND_TEMPLATE_ID,
      parent_id: null,
      kind: "area",
      name: "Dining",
      sort_order: 1000,
      metadata: "{}",
      updated_at: "2026-07-14T00:00:00.000Z",
    });
    database.templateRows.push({
      ...database.templateRows[0],
      id: SECOND_TEMPLATE_ROW_ID,
      template_id: SECOND_TEMPLATE_ID,
      template_node_id: SECOND_TEMPLATE_NODE_ID,
      material: "Second saved material",
    });

    const result = await insertMany(database, [TEMPLATE_ID, SECOND_TEMPLATE_ID]);

    expect(result).toMatchObject({
      status: "inserted",
      insertedNodeCount: 2,
      insertedRowItemCount: 2,
      statementCount: 10,
    });
    expect(database.batches).toHaveLength(1);
    expect(database.batches[0]).toHaveLength(10);
    expect(database.batches[0].filter((statement) => statement.sql.includes("INSERT INTO estimate_nodes"))).toHaveLength(2);
    expect(database.batches[0].filter((statement) => statement.sql.includes("INSERT INTO estimate_row_items"))).toHaveLength(2);
    expect(database.batches[0].filter((statement) => statement.sql.includes("INSERT INTO estimate_sheet_events"))).toHaveLength(1);
    expect(database.batches[0].filter((statement) => statement.sql.includes("INSERT INTO activity_event_outbox"))).toHaveLength(1);
    expect(database.batches[0].filter((statement) => statement.sql.includes("INSERT INTO estimate_mutation_receipts"))).toHaveLength(1);
    for (const statement of database.batches[0]) {
      expect(statement.sql.match(/\?/g)?.length ?? 0).toBe(statement.values.length);
    }
  });

  it("uses the current available component and selected active variant in one atomic D1 batch", async () => {
    const database = new TemplateInsertDatabase("available");
    const result = await insert(database);

    expect(result).toMatchObject({
      status: "inserted",
      insertedRootNodeIds: [expect.any(String)],
      estimateTabId: TARGET_TAB_ID,
      statementCount: 8,
    });
    expect(database.batches).toHaveLength(1);
    expect(database.batches[0]).toHaveLength(8);
    expect(database.batches[0][0]?.sql).toContain("estimate_template_copy_source_guard");
    expect(database.batches[0].some((statement) => statement.sql.includes("publication_source_revision"))).toBe(true);
    expect(database.batches[0].some((statement) => statement.sql.includes("INSERT INTO activity_event_outbox"))).toBe(true);
    expect(database.batches[0].some((statement) => statement.sql.includes("INSERT INTO estimate_mutation_receipts"))).toBe(true);
    const nodeInsert = database.batches[0].find((statement) => statement.sql.includes("INSERT INTO estimate_nodes"));
    const rowInsert = database.batches[0].find((statement) => statement.sql.includes("INSERT INTO estimate_row_items"));
    expect(nodeInsert).toBeDefined();
    expect(rowInsert).toBeDefined();
    const nodeRecord = recordFromInsert(nodeInsert!);
    const rowRecord = recordFromInsert(rowInsert!);
    expect(nodeRecord.id).not.toBe(TEMPLATE_NODE_ID);
    expect(rowRecord.id).not.toBe(TEMPLATE_ROW_ID);
    expect(rowRecord).toMatchObject({
      source_library_item_id: COMPONENT_ID,
      material: "Current material",
      description: "Current description",
      supplier: "Current supplier",
      supplier_id: "option-supplier",
      category_node_id: "current-category",
      unit: "pc",
      quantity: 2,
      unit_cost: 300,
      misc_cost: 30,
      link_state: "linked-clean",
      row_revision: 1,
      pricing_provenance_origin: "inherited_snapshot",
    });
    expect(JSON.parse(String(rowRecord.source_snapshot_json))).toMatchObject({
      sourceLibraryItemId: COMPONENT_ID,
      componentVersionNumber: 7,
      lifecycleState: "available",
      priceOptionId: PRICE_OPTION_ID,
      priceOptionLabel: "Current option",
      pricingSource: "Current cost entry",
      templateSourceResolution: "current_library_component",
    });
  });

  it("copies variants, alternatives, optional rows, and accessory assemblies with fresh identities", async () => {
    const database = new TemplateInsertDatabase("available");
    const rowIds = Array.from({ length: 5 }, (_, index) =>
      `70000000-0000-4000-8000-${String(index + 1).padStart(12, "0")}`);
    database.templateRows = rowIds.map((id, index) => ({
      ...database.templateRows[0],
      id,
      sort_order: index,
      material: `Source row ${index + 1}`,
    }));
    const groupId = "71000000-0000-4000-8000-000000000001";
    database.templateVariants = [{
      template_row_item_id: rowIds[0],
      template_id: TEMPLATE_ID,
      selected_price_option_id: PRICE_OPTION_ID,
      selected_option_snapshot_json: JSON.stringify({ id: PRICE_OPTION_ID, label: "Selected" }),
    }];
    database.templateAlternativeGroups = [{
      id: groupId,
      template_id: TEMPLATE_ID,
      selected_template_row_item_id: rowIds[0],
      name: "Finish choice",
    }];
    database.templateAlternativeMembers = [
      { group_id: groupId, template_row_item_id: rowIds[0], sort_order: 0 },
      { group_id: groupId, template_row_item_id: rowIds[1], sort_order: 1 },
    ];
    database.templateOptionalItems = [{
      template_id: TEMPLATE_ID,
      template_row_item_id: rowIds[2],
      is_included: 0,
    }];
    database.templateAccessoryEdges = [{
      id: "72000000-0000-4000-8000-000000000001",
      template_id: TEMPLATE_ID,
      parent_template_row_item_id: rowIds[3],
      child_template_row_item_id: rowIds[4],
      mode: "required",
      is_included: 1,
      quantity_rule_json: JSON.stringify({ schemaVersion: 1, kind: "per-parent", multiplier: 1 }),
    }];

    const first = await insert(database);
    const replay = await insert(database);

    expect(replay).toEqual(first);
    expect(first).toMatchObject({ status: "inserted", insertedRowItemCount: 5, statementCount: 18 });
    expect(database.batches).toHaveLength(1);
    const batch = database.batches[0] ?? [];
    for (const table of [
      "estimate_row_variant_selections",
      "estimate_contribution_scopes",
      "estimate_alternative_groups",
      "estimate_alternative_members",
      "estimate_optional_items",
      "estimate_accessory_edges",
    ]) {
      expect(batch.some((statement) => statement.sql.includes(`INSERT INTO ${table}`))).toBe(true);
    }
    const copiedRowIds = batch
      .filter((statement) => statement.sql.includes("INSERT INTO estimate_row_items"))
      .map((statement) => String(recordFromInsert(statement).id));
    expect(copiedRowIds).toHaveLength(5);
    expect(copiedRowIds.some((id) => rowIds.includes(id))).toBe(false);
    const groupStatement = batch.find((statement) => statement.sql.includes("INSERT INTO estimate_alternative_groups"))!;
    const copiedGroups = JSON.parse(String(groupStatement.values.at(-1))) as Array<{ id: string; selectedRowId: string }>;
    expect(copiedGroups[0]?.id).not.toBe(groupId);
    expect(copiedRowIds).toContain(copiedGroups[0]?.selectedRowId);
    const edgeStatement = batch.find((statement) => statement.sql.includes("INSERT INTO estimate_accessory_edges"))!;
    const copiedEdges = JSON.parse(String(edgeStatement.values.at(-1))) as Array<{
      id: string;
      parentRowId: string;
      childRowId: string;
    }>;
    expect(copiedEdges[0]?.id).not.toBe(database.templateAccessoryEdges[0]?.id);
    expect(copiedRowIds).toContain(copiedEdges[0]?.parentRowId);
    expect(copiedRowIds).toContain(copiedEdges[0]?.childRowId);
  });

  it("rejects an alternative group that crosses the selected row closure", async () => {
    const database = new TemplateInsertDatabase("available");
    const outsideRowId = "79797979-7979-4797-8797-797979797979";
    const groupId = "71717171-7171-4717-8717-717171717171";
    database.templateAlternativeGroups = [{
      id: groupId,
      template_id: TEMPLATE_ID,
      selected_template_row_item_id: TEMPLATE_ROW_ID,
      name: "Partial choice",
    }];
    database.templateAlternativeMembers = [
      { group_id: groupId, template_row_item_id: TEMPLATE_ROW_ID, sort_order: 0 },
      { group_id: groupId, template_row_item_id: outsideRowId, sort_order: 1 },
    ];

    await expect(loadTemplateSidecars(database, [TEMPLATE_ID], new Set([TEMPLATE_ROW_ID])))
      .rejects.toThrow("alternative group crosses the selected copy boundary");
    const sidecarReads = database.preparedStatements.filter((statement) => (
      statement.sql.includes("FROM estimate_template_row_variant_selections")
      || statement.sql.includes("FROM estimate_template_alternative_groups")
      || statement.sql.includes("FROM estimate_template_alternative_members")
      || statement.sql.includes("FROM estimate_template_optional_items")
      || statement.sql.includes("FROM estimate_template_accessory_edges")
    ));
    expect(sidecarReads).toHaveLength(5);
    expect(sidecarReads.every((statement) => statement.values.length === 1)).toBe(true);
  });

  it("rejects an accessory edge that crosses the selected row closure", async () => {
    const database = new TemplateInsertDatabase("available");
    database.templateAccessoryEdges = [{
      id: "72727272-7272-4727-8727-727272727272",
      template_id: TEMPLATE_ID,
      parent_template_row_item_id: TEMPLATE_ROW_ID,
      child_template_row_item_id: "79797979-7979-4797-8797-797979797979",
      mode: "required",
      is_included: 1,
      quantity_rule_json: JSON.stringify({ schemaVersion: 1, kind: "fixed", quantity: 1 }),
    }];

    await expect(loadTemplateSidecars(database, [TEMPLATE_ID], new Set([TEMPLATE_ROW_ID])))
      .rejects.toThrow("accessory edge crosses the selected copy boundary");
  });

  it("guards the atomic copy against sidecars crossing closure after preflight", () => {
    const guard = buildTemplateSidecarSourceGuard({
      variantSelections: [],
      alternativeGroups: [],
      alternativeMembers: [],
      optionalItems: [],
      accessoryEdges: [],
    }, new Set([TEMPLATE_ROW_ID]));

    expect(guard.sql).toContain("closure_group.selected_template_row_item_id NOT IN");
    expect(guard.sql).toContain("closure_member.template_row_item_id NOT IN");
    expect(guard.sql).toContain("closure_edge.parent_template_row_item_id IN");
    expect(guard.sql).toContain("<> (closure_edge.child_template_row_item_id IN");
    expect(guard.values).toHaveLength(11);
  });

  it("returns an explicit confirmation requirement without writes when the source is unavailable", async () => {
    const database = new TemplateInsertDatabase("discontinued");
    const result = await insert(database);

    expect(result).toEqual({
      status: "requires_saved_snapshot_confirmation",
      unavailableSourceCount: 1,
      unavailableRows: [{
        templateRowId: TEMPLATE_ROW_ID,
        material: "Saved material",
        reason: "component_discontinued",
      }],
    });
    expect(database.batches).toHaveLength(0);
  });

  it("inserts an explicitly accepted saved snapshot as unlinked and project-specific", async () => {
    const database = new TemplateInsertDatabase("archived");
    database.templateVariants = [{
      template_row_item_id: TEMPLATE_ROW_ID,
      template_id: TEMPLATE_ID,
      selected_price_option_id: PRICE_OPTION_ID,
      selected_option_snapshot_json: JSON.stringify({ id: PRICE_OPTION_ID, label: "Saved variant" }),
    }];
    const result = await insert(
      database,
      "use_saved_snapshot_unlinked",
    );

    expect(result).toMatchObject({ status: "inserted" });
    expect(database.batches).toHaveLength(1);
    const rowInsert = database.batches[0].find((statement) => statement.sql.includes("INSERT INTO estimate_row_items"));
    const rowRecord = recordFromInsert(rowInsert!);
    expect(rowRecord).toMatchObject({
      source_library_item_id: null,
      material: "Saved material",
      unit_cost: 100,
      link_state: "unlinked",
    });
    expect(JSON.parse(String(rowRecord.source_snapshot_json))).toMatchObject({
      source: "project",
      sourceType: "template_saved_snapshot",
      sourceLibraryItemId: null,
      savedSourceLibraryItemId: COMPONENT_ID,
      templateSourceResolution: "saved_snapshot_unlinked",
      templateSourceUnavailableReason: "component_archived",
    });
    const variantInsert = database.batches[0].find((statement) => statement.sql.includes("INSERT INTO estimate_row_variant_selections"));
    const variantPayload = JSON.parse(String(variantInsert?.values.at(-1))) as Array<{ rowId: string; selectedPriceOptionId: string }>;
    expect(variantPayload).toEqual([expect.objectContaining({
      rowId: rowRecord.id,
      selectedPriceOptionId: PRICE_OPTION_ID,
    })]);
    expect(variantPayload[0]?.rowId).not.toBe(TEMPLATE_ROW_ID);
  });

  it("replays the same committed intent without source reads or another batch", async () => {
    const database = new TemplateInsertDatabase("available");

    const first = await insert(database);
    const sourceReadCount = database.sourceReadCount;
    const replay = await insert(database);

    expect(replay).toEqual(first);
    expect(database.batches).toHaveLength(1);
    expect(database.sourceReadCount).toBe(sourceReadCount);
  });

  it("uses a fresh destination id for a new intent", async () => {
    const database = new TemplateInsertDatabase("available");

    const first = await insert(database);
    const second = await insert(database, undefined, { correlationId: "dededede-dede-4ede-8ede-dededededede" });

    expect(database.batches).toHaveLength(2);
    expect((second as { insertedRootNodeIds: string[] }).insertedRootNodeIds)
      .not.toEqual((first as { insertedRootNodeIds: string[] }).insertedRootNodeIds);
  });

  it("accepts any selected estimate node as the destination parent", async () => {
    const database = new TemplateInsertDatabase("available");
    database.parentKind = "area";

    const result = await insert(database);

    expect(result).toMatchObject({ status: "inserted" });
    expect(database.batches).toHaveLength(1);
  });

  it("rejects a caller tab mismatch with zero writes", async () => {
    const database = new TemplateInsertDatabase("available");

    await expect(insert(database, undefined, {
      targetTabId: "efefefef-efef-4fef-8fef-efefefefefef",
    })).rejects.toThrow("Template insert target tab does not match the selected estimate node.");
    expect(database.batches).toHaveLength(0);
  });

  it("rejects an over-1000-statement selection without chunking or writes", async () => {
    const database = new TemplateInsertDatabase("available");
    database.templateNodes = Array.from({ length: 996 }, (_, index) => ({
      id: `01000000-0000-4000-8000-${String(index).padStart(12, "0")}`,
      template_id: TEMPLATE_ID,
      parent_id: null,
      kind: "area",
      name: `Template node ${index}`,
      sort_order: index,
      metadata: "{}",
      updated_at: "2026-07-14T00:00:00.000Z",
    }));
    database.templateRows = [];

    await expect(insertMany(database, [TEMPLATE_ID])).rejects.toThrow("selection_too_large");
    expect(database.batches).toHaveLength(0);
  });
});
