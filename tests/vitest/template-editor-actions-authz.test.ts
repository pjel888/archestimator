import { readFileSync } from "node:fs";
import { join } from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";

const authMocks = vi.hoisted(() => ({
  requireCurrentUserContext: vi.fn(),
}));

const workspaceMocks = vi.hoisted(() => ({
  ensureDefaultWorkspace: vi.fn(),
}));

const d1Mocks = vi.hoisted(() => ({
  getCloudflareD1Database: vi.fn(),
}));

vi.mock("@/lib/auth/session", () => authMocks);
vi.mock("@/lib/repositories/workspace-repository", () => workspaceMocks);
vi.mock("@/lib/cloudflare/d1", () => d1Mocks);
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

const workspaceId = "00000000-0000-4000-8000-000000000001";
const templateId = "00000000-0000-4000-8000-000000000002";
const sourceTemplateId = "00000000-0000-4000-8000-000000000003";
const nodeId = "00000000-0000-4000-8000-000000000004";
const rowId = "00000000-0000-4000-8000-000000000005";
const sourceGroupId = "00000000-0000-4000-8000-000000000012";
const sourceAreaId = "00000000-0000-4000-8000-000000000013";
const sourceRowId = "00000000-0000-4000-8000-000000000014";

class FakeD1Statement {
  values: unknown[] = [];

  constructor(
    private readonly database: FakeD1Database,
    readonly sql: string,
  ) {}

  bind(...values: unknown[]) {
    this.values = values;
    return this;
  }

  async first<T>() {
    this.database.executedStatements.push(this);
    if (this.sql.includes("FROM estimate_mutation_receipts")) {
      return (this.database.receipts.get(this.values.slice(0, 3).join(":")) ?? null) as T | null;
    }
    if (this.sql.includes("FROM workspace_members")) {
      return (this.database.isEditor ? { allowed: 1 } : null) as T | null;
    }
    if (this.sql.includes("FROM estimate_template_mutation_intents")) {
      return (this.database.mutationIntents.get(String(this.values[0])) ?? null) as T | null;
    }
    if (this.sql.includes("FROM estimate_templates")) {
      return {
        id: String(this.values[0]),
        workspace_id: workspaceId,
        name: "Editor-safe template",
        description: "",
        category: "General",
        current_version_number: this.database.currentVersionNumber,
        updated_at: this.database.templateUpdatedAt,
        archived_at: null,
      } as T;
    }
    if (this.sql.includes("FROM estimate_template_nodes")) {
      return (this.database.targetNodes.find((node) => node.id === this.values[0]) ?? {
        id: nodeId,
        template_id: templateId,
        parent_id: null,
        kind: "area",
        name: "Living",
        sort_order: 0,
        metadata: "{}",
        created_at: "2026-07-01T00:00:00.000Z",
        updated_at: "2026-07-01T00:00:00.000Z",
      }) as T;
    }
    if (this.sql.includes("FROM estimate_template_row_items")) {
      return this.database.row as T;
    }
    return null;
  }

  async all<T>() {
    this.database.executedStatements.push(this);
    if (this.sql.includes("FROM estimate_template_instances AS instance")) {
      return { results: [] as T[], success: true };
    }
    if (this.sql.includes("FROM estimate_template_nodes")) {
      const rows = this.values[0] === sourceTemplateId ? this.database.sourceNodes : this.database.targetNodes;
      return { results: rows as T[], success: true };
    }
    if (this.sql.includes("FROM estimate_template_row_items")) {
      if (this.values.length === 1 && this.values[0] === sourceTemplateId) {
        return { results: this.database.sourceRows as T[], success: true };
      }
      const requestedIds = new Set(this.values.slice(1).map(String));
      const rows = [this.database.row, ...this.database.insertedRows]
        .filter((row) => requestedIds.size === 0 || requestedIds.has(row.id));
      return { results: rows as T[], success: true };
    }
    return { results: [] as T[], success: true };
  }

  async run() {
    this.database.executedStatements.push(this);
    if (this.sql.includes("INSERT INTO estimate_template_mutation_intents")) {
      const intentId = String(this.values[0]);
      if (!this.database.mutationIntents.has(intentId)) {
        this.database.mutationIntents.set(intentId, {
          request_fingerprint: String(this.values[4]),
          expected_version_number: Number(this.values[6]),
          impact_fingerprint: String(this.values[7]),
          state: "pending",
          execution_lease_token: String(this.values[8]),
          execution_lease_expires_at: String(this.values[9]),
        });
      }
      return { success: true, meta: { changes: 1 } };
    }
    if (this.sql.includes("UPDATE estimate_template_mutation_intents")) {
      const notApplied = this.sql.includes("state = 'not_applied'");
      const intentId = String(this.values[notApplied ? 3 : 4]);
      const retained = this.database.mutationIntents.get(intentId);
      if (retained) {
        retained.state = notApplied ? "not_applied" : "committed";
        retained.execution_lease_token = null;
        retained.execution_lease_expires_at = null;
      }
    }
    if (this.sql.includes("UPDATE estimate_template_row_items")) {
      this.database.row = {
        ...this.database.row,
        material: String(this.values[0]),
        adjustment_percentage: Number(this.values.at(-5)),
        contingency_percentage: 0,
        updated_at: String(this.values.at(-4)),
      };
    }
    if (this.sql.includes("INSERT INTO estimate_template_row_items")) {
      this.database.insertedRows.push({
        id: String(this.values[0]),
        template_id: String(this.values[1]),
        template_node_id: String(this.values[2]),
        sort_order: Number(this.values[3]),
        source_library_item_id: this.values[4] === null ? null : String(this.values[4]),
        source_snapshot: this.values[5] === null ? null : String(this.values[5]),
        pricing_provenance_origin: String(this.values[6]),
        category_node_id: this.values[7] === null ? null : String(this.values[7]),
        supplier_id: this.values[8] === null ? null : String(this.values[8]),
        material: String(this.values[9]),
        description: String(this.values[10]),
        supplier: String(this.values[11]),
        unit: String(this.values[12]),
        quantity: Number(this.values[13]),
        unit_cost: Number(this.values[14]),
        misc_cost: Number(this.values[15]),
        contingency_percentage: Number(this.values[16]),
        adjustment_percentage: Number(this.values[17]),
        discipline: String(this.values[18]),
        designation: String(this.values[19]),
        link_state: String(this.values[20]),
        metadata: String(this.values[21]),
        created_at: String(this.values[22]),
        updated_at: String(this.values[23]),
      });
    }
    if (this.sql.includes("UPDATE estimate_templates") && this.sql.includes("current_version_number")) {
      this.database.currentVersionNumber = Number(this.values[0]);
      this.database.templateUpdatedAt = String(this.values[1]);
    }
    if (this.sql.includes("INSERT INTO estimate_mutation_receipts")) {
      this.database.receipts.set(this.values.slice(1, 4).join(":"), {
        actor_user_id: String(this.values[4]),
        request_fingerprint: String(this.values[7]),
        result_json: String(this.values[8]),
        status: "committed",
      });
    }
    return { success: true };
  }
}

class FakeD1Database {
  executedStatements: FakeD1Statement[] = [];
  batchCalls: FakeD1Statement[][] = [];
  insertedRows: Array<Record<string, unknown> & { id: string }> = [];
  targetNodes: Array<Record<string, unknown> & { id: string }> = [];
  sourceNodes: Array<Record<string, unknown> & { id: string }> = [];
  sourceRows: Array<Record<string, unknown> & { id: string }> = [];
  receipts = new Map<string, {
    actor_user_id: string;
    request_fingerprint: string;
    result_json: string;
    status: string;
  }>();
  mutationIntents = new Map<string, {
    request_fingerprint: string;
    expected_version_number: number;
    impact_fingerprint: string;
    state: string;
    execution_lease_token: string | null;
    execution_lease_expires_at: string | null;
  }>();
  currentVersionNumber = 1;
  templateUpdatedAt = "2026-07-01T00:00:00.000Z";
  failBatch = false;
  row = {
    id: rowId,
    template_id: templateId,
    template_node_id: nodeId,
    sort_order: 0,
    source_library_item_id: null,
    source_snapshot: null,
    pricing_provenance_origin: "missing",
    category_node_id: null,
    supplier_id: null,
    material: "Existing row",
    description: "",
    supplier: "",
    unit: "unit",
    quantity: 1,
    unit_cost: 0,
    misc_cost: 0,
    contingency_percentage: 0,
    adjustment_percentage: 0,
    discipline: "",
    designation: "",
    link_state: "unlinked",
    metadata: "{}",
    created_at: "2026-07-01T00:00:00.000Z",
    updated_at: "2026-07-01T00:00:00.000Z",
  };

  constructor(readonly isEditor: boolean) {}

  prepare(sql: string) {
    return new FakeD1Statement(this, sql);
  }

  async batch(statements: FakeD1Statement[]) {
    this.batchCalls.push(statements);
    if (this.failBatch) throw new Error("Injected atomic batch failure");
    return Promise.all(statements.map((statement) => statement.run()));
  }
}

beforeEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
  workspaceMocks.ensureDefaultWorkspace.mockResolvedValue({
    workspace: { id: workspaceId },
    profile: { id: "user-1" },
  });
  authMocks.requireCurrentUserContext.mockResolvedValue({
    userId: "user-1",
    profile: { id: "user-1" },
  });
});

describe("template editor server action authorization", () => {
  it("blocks workspace viewers before any estimate-template table mutation path", async () => {
    const database = new FakeD1Database(false);
    d1Mocks.getCloudflareD1Database.mockResolvedValue(database);
    const actions = await import("@/lib/component-library/template-editor-actions");

    await expect(actions.createEstimateTemplateNode({ templateId, parentId: null, kind: "group", name: "Viewer group" })).rejects.toThrow(
      "Only workspace editors/admins can edit estimate templates.",
    );
    await expect(actions.renameEstimateTemplateNode({ templateId, nodeId, name: "Viewer rename" })).rejects.toThrow(
      "Only workspace editors/admins can edit estimate templates.",
    );
    await expect(actions.deleteEstimateTemplateNode({ templateId, nodeId })).rejects.toThrow(
      "Only workspace editors/admins can edit estimate templates.",
    );
    await expect(actions.moveEstimateTemplateNode({ templateId, nodeId, parentId: null, orderedSiblingIds: [nodeId] })).rejects.toThrow(
      "Only workspace editors/admins can edit estimate templates.",
    );
    await expect(actions.addEstimateTemplateRowItems({ templateId, nodeId, libraryItems: [] })).rejects.toThrow(
      "Only workspace editors/admins can edit estimate templates.",
    );
    await expect(actions.createEstimateTemplateAllowanceRow({ templateId, nodeId, material: "Viewer allowance" })).rejects.toThrow(
      "Only workspace editors/admins can edit estimate templates.",
    );
    await expect(actions.updateEstimateTemplateRowItem({ templateId, rowId, patch: { material: "Viewer update" } })).rejects.toThrow(
      "Only workspace editors/admins can edit estimate templates.",
    );
    await expect(actions.removeEstimateTemplateRowItem({ templateId, rowId })).rejects.toThrow(
      "Only workspace editors/admins can edit estimate templates.",
    );
    await expect(actions.insertTemplateIntoTemplate({ targetTemplateId: templateId, targetNodeId: null, sourceTemplateId })).rejects.toThrow(
      "Only workspace editors/admins can edit estimate templates.",
    );

    expect(d1Mocks.getCloudflareD1Database).toHaveBeenCalledTimes(9);
    expect(database.executedStatements.filter((statement) => statement.sql.includes("FROM workspace_members"))).toHaveLength(9);
    expect(database.executedStatements.some((statement) => statement.sql.includes("estimate_templates"))).toBe(false);
    expect(database.executedStatements.some((statement) => statement.sql.includes("estimate_template_row_items"))).toBe(false);
  });

  it("allows workspace editors to continue through the D1 row update flow", async () => {
    const database = new FakeD1Database(true);
    d1Mocks.getCloudflareD1Database.mockResolvedValue(database);
    const actions = await import("@/lib/component-library/template-editor-actions");
    const intentId = "00000000-0000-4000-8000-000000000010";

    await expect(actions.updateEstimateTemplateRowItem({ intentId, templateId, rowId, patch: { material: "Updated row" } })).resolves.toMatchObject({
      row: { id: rowId, template_id: templateId, material: "Updated row" },
    });

    const workspaceGateIndex = database.executedStatements.findIndex((statement) => statement.sql.includes("FROM workspace_members"));
    const templateReadIndex = database.executedStatements.findIndex((statement) => statement.sql.includes("FROM estimate_templates"));
    const rowUpdateIndex = database.executedStatements.findIndex((statement) => statement.sql.includes("UPDATE estimate_template_row_items"));
    expect(workspaceGateIndex).toBeGreaterThanOrEqual(0);
    expect(templateReadIndex).toBeGreaterThan(workspaceGateIndex);
    expect(rowUpdateIndex).toBeGreaterThan(templateReadIndex);
    expect(database.executedStatements[rowUpdateIndex].values[0]).toBe("Updated row");
    expect(database.executedStatements[rowUpdateIndex].values.at(-3)).toBe(rowId);
    expect(database.executedStatements[rowUpdateIndex].values.at(-2)).toBe(templateId);
    expect(database.batchCalls).toHaveLength(1);
    expect(database.batchCalls[0]?.map((statement) => statement.sql)).toEqual(expect.arrayContaining([
      expect.stringContaining("UPDATE estimate_template_row_items"),
      expect.stringContaining("UPDATE estimate_templates"),
      expect.stringContaining("INSERT INTO component_library_telemetry_events"),
      expect.stringContaining("INSERT INTO estimate_mutation_receipts"),
    ]));

    await expect(actions.updateEstimateTemplateRowItem({ intentId, templateId, rowId, patch: { material: "Updated row" } })).resolves.toMatchObject({
      row: { id: rowId, material: "Updated row" },
    });
    expect(database.batchCalls).toHaveLength(1);
  });

  it("persists referenced component and selected variant identity in template row snapshots", async () => {
    const database = new FakeD1Database(true);
    d1Mocks.getCloudflareD1Database.mockResolvedValue(database);
    const actions = await import("@/lib/component-library/template-editor-actions");
    const componentId = "00000000-0000-4000-8000-000000000006";
    const priceOptionId = "00000000-0000-4000-8000-000000000007";

    await actions.addEstimateTemplateRowItems({
      templateId,
      nodeId,
      libraryItems: [{
        id: componentId,
        material: "Current sofa",
        name: "Current sofa",
        description: "Two-seat sofa",
        supplier: "Supplier",
        source: "library",
        unit: "pc",
        itemCost: 12_500,
        quantity: 1,
        subTotal: 12_500,
        miscCost: 500,
        totalItemCosts: 13_000,
        category: "Furniture",
        sourceLibraryItemId: componentId,
        linkState: "linked-clean",
        componentVersionNumber: 4,
        priceOptionId,
        priceOptionLabel: "Blue",
        priceOptions: [{
          id: priceOptionId,
          label: "Blue",
          unit: "pc",
          unitCost: 12_500,
          miscCost: 500,
          currency: "PHP",
          isActive: true,
          isDefault: true,
        }],
        lifecycleState: "available",
        pricingSource: "Supplier catalog",
        pricingDate: "2026-07-14",
      }],
    });

    const insert = database.executedStatements.find((statement) => statement.sql.includes("INSERT INTO estimate_template_row_items"));
    expect(insert?.values[4]).toBe(componentId);
    expect(insert?.values[6]).toBe("recorded");
    expect(insert?.values[16]).toBe(0);
    expect(JSON.parse(String(insert?.values[5]))).toMatchObject({
      sourceLibraryItemId: componentId,
      sourceComponentId: componentId,
      componentVersionNumber: 4,
      lifecycleState: "available",
      priceOptionId,
      priceOptionLabel: "Blue",
      priceOptions: [expect.objectContaining({ id: priceOptionId, label: "Blue" })],
    });
  });

  it("leaves no Template domain write or receipt when the atomic batch fails", async () => {
    const database = new FakeD1Database(true);
    database.failBatch = true;
    d1Mocks.getCloudflareD1Database.mockResolvedValue(database);
    const actions = await import("@/lib/component-library/template-editor-actions");

    await expect(actions.updateEstimateTemplateRowItem({
      intentId: "00000000-0000-4000-8000-000000000011",
      templateId,
      rowId,
      patch: { material: "Should roll back" },
    })).rejects.toThrow("Could not update the row.");

    expect(database.batchCalls).toHaveLength(1);
    expect(database.row.material).toBe("Existing row");
    expect(database.receipts.size).toBe(0);
    expect(database.executedStatements.some((statement) => statement.sql.includes("UPDATE estimate_template_row_items"))).toBe(false);
    expect(database.mutationIntents.get("00000000-0000-4000-8000-000000000011")?.state).toBe("not_applied");
  });

  it("copies a detached Template graph, telemetry, and receipt in one replay-safe batch", async () => {
    const database = new FakeD1Database(true);
    database.sourceNodes = [
      {
        id: sourceGroupId,
        template_id: sourceTemplateId,
        parent_id: null,
        kind: "group",
        name: "Source group",
        sort_order: 0,
        metadata: "{}",
        created_at: "2026-07-01T00:00:00.000Z",
        updated_at: "2026-07-01T00:00:00.000Z",
      },
      {
        id: sourceAreaId,
        template_id: sourceTemplateId,
        parent_id: sourceGroupId,
        kind: "area",
        name: "Source area",
        sort_order: 0,
        metadata: "{}",
        created_at: "2026-07-01T00:00:00.000Z",
        updated_at: "2026-07-01T00:00:00.000Z",
      },
    ];
    database.sourceRows = [{
      ...database.row,
      id: sourceRowId,
      template_id: sourceTemplateId,
      template_node_id: sourceAreaId,
      source_library_item_id: "00000000-0000-4000-8000-000000000015",
      source_snapshot: "{}",
      pricing_provenance_origin: "recorded",
      contingency_percentage: 12,
      adjustment_percentage: 0,
    }];
    d1Mocks.getCloudflareD1Database.mockResolvedValue(database);
    const actions = await import("@/lib/component-library/template-editor-actions");
    const input = {
      intentId: "00000000-0000-4000-8000-000000000016",
      targetTemplateId: templateId,
      targetNodeId: null,
      sourceTemplateId,
    };

    const first = await actions.insertTemplateIntoTemplate(input);
    const replay = await actions.insertTemplateIntoTemplate(input);

    expect(first.insertedNodeIds).toHaveLength(2);
    expect(replay).toEqual(first);
    expect(first.insertedNodeIds).not.toContain(sourceGroupId);
    expect(first.insertedNodeIds).not.toContain(sourceAreaId);
    expect(database.batchCalls).toHaveLength(1);
    const batch = database.batchCalls[0] ?? [];
    expect(batch.some((statement) => statement.sql.includes("template_composition_source_guard"))).toBe(true);
    expect(batch.filter((statement) => statement.sql.includes("INSERT INTO estimate_template_nodes"))).toHaveLength(2);
    expect(batch.some((statement) => statement.sql.includes("INSERT INTO component_library_telemetry_events"))).toBe(true);
    expect(batch.some((statement) => statement.sql.includes("INSERT INTO estimate_mutation_receipts"))).toBe(true);
    const rowInsert = batch.find((statement) => statement.sql.includes("INSERT INTO estimate_template_row_items"));
    expect(rowInsert?.values[0]).not.toBe(sourceRowId);
    expect(rowInsert?.values[6]).toBe("inherited_snapshot");
    expect(rowInsert?.values[16]).toBe(0);
    expect(rowInsert?.values[17]).toBe(12);
  });

  it("refuses oversized Template composition before opening an atomic batch", async () => {
    const database = new FakeD1Database(true);
    database.sourceNodes = Array.from({ length: 997 }, (_, index) => ({
      id: `00000000-0000-4000-8001-${String(index).padStart(12, "0")}`,
      template_id: sourceTemplateId,
      parent_id: null,
      kind: "group",
      name: `Source group ${index}`,
      sort_order: index,
      metadata: "{}",
      created_at: "2026-07-01T00:00:00.000Z",
      updated_at: "2026-07-01T00:00:00.000Z",
    }));
    d1Mocks.getCloudflareD1Database.mockResolvedValue(database);
    const actions = await import("@/lib/component-library/template-editor-actions");

    await expect(actions.insertTemplateIntoTemplate({
      intentId: "00000000-0000-4000-8000-000000000017",
      targetTemplateId: templateId,
      targetNodeId: null,
      sourceTemplateId,
    })).rejects.toThrow("more than 1000 atomic D1 statements");

    expect(database.batchCalls).toHaveLength(0);
    expect(database.receipts.size).toBe(0);
  });
});

describe("template editor D1 schema", () => {
  const migration = readFileSync(join(process.cwd(), "migrations/0024_estimate_templates.sql"), "utf8");

  it("creates template, node, and row item tables with Cloudflare D1 JSON and hierarchy guards", () => {
    expect(migration).toContain("CREATE TABLE IF NOT EXISTS estimate_templates");
    expect(migration).toContain("CREATE TABLE IF NOT EXISTS estimate_template_nodes");
    expect(migration).toContain("CREATE TABLE IF NOT EXISTS estimate_template_row_items");
    expect(migration).toContain("REFERENCES workspaces(id) ON DELETE CASCADE");
    expect(migration).toContain("json_valid(metadata)");
    expect(migration).toContain("json_valid(source_snapshot)");
    expect(migration).toContain("kind IN ('group', 'area')");
    expect(migration).toContain("adjustment_percentage >= -100");
    expect(migration).toContain("idx_estimate_template_row_items_template_node_sort");
  });
});

describe("template editor RLS hardening migration", () => {
  const migration = readFileSync(join(process.cwd(), "supabase/migrations/20260611182000_harden_estimate_template_editor_access.sql"), "utf8");

  it("splits member read access from editor-only template, node, and row mutations", () => {
    expect(migration).toContain('drop policy if exists "members can manage estimate templates"');
    expect(migration).toContain('create policy "members can read estimate templates"');
    expect(migration).toContain('create policy "members can read estimate template nodes"');
    expect(migration).toContain('create policy "members can read estimate template row items"');

    for (const tableName of ["estimate_templates", "estimate_template_nodes", "estimate_template_row_items"]) {
      for (const operation of ["insert", "update", "delete"]) {
        expect(migration).toContain(`create policy "editors can ${operation} ${tableName.replaceAll("_", " ")}"`);
      }
    }

    expect(migration).toContain("public.is_workspace_member(workspace_id)");
    expect(migration).toContain("public.is_workspace_member(template.workspace_id)");
    expect(migration).toContain("public.is_workspace_editor(workspace_id)");
    expect(migration).toContain("public.is_workspace_editor(template.workspace_id)");
  });
});
