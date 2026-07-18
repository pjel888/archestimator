import { describe, expect, it, vi } from "vitest";

import type { CurrentUserContext } from "@/lib/auth/session";
import type { D1DatabaseLike, D1PreparedStatementLike, D1Result, D1Value } from "@/lib/cloudflare/d1";
import {
  insertEstimateTemplateIntoEstimateWithHistory,
  insertEstimateTemplatesIntoEstimateWithHistory,
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
      const requestedTemplateIds = new Set(this.values.slice(1).map(String));
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
  sourceReadCount = 0;
  readonly receipts = new Map<string, {
    actor_user_id: string;
    request_fingerprint: string;
    result_json: string;
    status: string;
  }>();
  parentKind = "group";
  parentTabId: string | null = TARGET_TAB_ID;
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
    return new FakeStatement<T>(this, sql);
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

describe("trusted estimate template insertion", () => {
  it("rejects missing atomic support before auth, receipt, or source reads", async () => {
    const database = new TemplateInsertDatabase("available");
    Object.defineProperty(database, "batch", { value: undefined });

    await expect(insert(database)).rejects.toThrow("Estimate template insertion requires atomic D1 batch support.");
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
      statementCount: 9,
    });
    expect(database.batches).toHaveLength(1);
    expect(database.batches[0]).toHaveLength(9);
    expect(database.batches[0].filter((statement) => statement.sql.includes("INSERT INTO estimate_nodes"))).toHaveLength(2);
    expect(database.batches[0].filter((statement) => statement.sql.includes("INSERT INTO estimate_row_items"))).toHaveLength(2);
    expect(database.batches[0].filter((statement) => statement.sql.includes("INSERT INTO estimate_sheet_events"))).toHaveLength(1);
    expect(database.batches[0].filter((statement) => statement.sql.includes("INSERT INTO activity_event_outbox"))).toHaveLength(1);
    expect(database.batches[0].filter((statement) => statement.sql.includes("INSERT INTO estimate_mutation_receipts"))).toHaveLength(1);
  });

  it("uses the current available component and selected active variant in one atomic D1 batch", async () => {
    const database = new TemplateInsertDatabase("available");
    const result = await insert(database);

    expect(result).toMatchObject({
      status: "inserted",
      insertedRootNodeIds: [expect.any(String)],
      estimateTabId: TARGET_TAB_ID,
      statementCount: 7,
    });
    expect(database.batches).toHaveLength(1);
    expect(database.batches[0]).toHaveLength(7);
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
