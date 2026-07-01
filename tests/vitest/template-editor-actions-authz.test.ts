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
    if (this.sql.includes("FROM workspace_members")) {
      return (this.database.isEditor ? { allowed: 1 } : null) as T | null;
    }
    if (this.sql.includes("FROM estimate_templates")) {
      return {
        id: templateId,
        workspace_id: workspaceId,
        name: "Editor-safe template",
      } as T;
    }
    if (this.sql.includes("FROM estimate_template_row_items")) {
      return this.database.row as T;
    }
    return null;
  }

  async all<T>() {
    this.database.executedStatements.push(this);
    return { results: [] as T[], success: true };
  }

  async run() {
    this.database.executedStatements.push(this);
    if (this.sql.includes("UPDATE estimate_template_row_items")) {
      this.database.row = {
        ...this.database.row,
        material: String(this.values[0]),
        updated_at: String(this.values[1]),
      };
    }
    return { success: true };
  }
}

class FakeD1Database {
  executedStatements: FakeD1Statement[] = [];
  row = {
    id: rowId,
    template_id: templateId,
    template_node_id: nodeId,
    sort_order: 0,
    source_library_item_id: null,
    source_snapshot: null,
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
    await expect(actions.reorderEstimateTemplateRowItems({ templateId, nodeId, orderedRowIds: [rowId] })).rejects.toThrow(
      "Only workspace editors/admins can edit estimate templates.",
    );
    await expect(actions.insertTemplateIntoTemplate({ targetTemplateId: templateId, targetNodeId: null, sourceTemplateId })).rejects.toThrow(
      "Only workspace editors/admins can edit estimate templates.",
    );

    expect(d1Mocks.getCloudflareD1Database).toHaveBeenCalledTimes(10);
    expect(database.executedStatements.filter((statement) => statement.sql.includes("FROM workspace_members"))).toHaveLength(10);
    expect(database.executedStatements.some((statement) => statement.sql.includes("estimate_templates"))).toBe(false);
    expect(database.executedStatements.some((statement) => statement.sql.includes("estimate_template_row_items"))).toBe(false);
  });

  it("allows workspace editors to continue through the D1 row update flow", async () => {
    const database = new FakeD1Database(true);
    d1Mocks.getCloudflareD1Database.mockResolvedValue(database);
    const actions = await import("@/lib/component-library/template-editor-actions");

    await expect(actions.updateEstimateTemplateRowItem({ templateId, rowId, patch: { material: "Updated row" } })).resolves.toMatchObject({
      row: { id: rowId, template_id: templateId, material: "Updated row" },
    });

    const workspaceGateIndex = database.executedStatements.findIndex((statement) => statement.sql.includes("FROM workspace_members"));
    const templateReadIndex = database.executedStatements.findIndex((statement) => statement.sql.includes("FROM estimate_templates"));
    const rowUpdateIndex = database.executedStatements.findIndex((statement) => statement.sql.includes("UPDATE estimate_template_row_items"));
    expect(workspaceGateIndex).toBeGreaterThanOrEqual(0);
    expect(templateReadIndex).toBeGreaterThan(workspaceGateIndex);
    expect(rowUpdateIndex).toBeGreaterThan(templateReadIndex);
    expect(database.executedStatements[rowUpdateIndex].values[0]).toBe("Updated row");
    expect(database.executedStatements[rowUpdateIndex].values.at(-2)).toBe(rowId);
    expect(database.executedStatements[rowUpdateIndex].values.at(-1)).toBe(templateId);
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
