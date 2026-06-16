import { readFileSync } from "node:fs";
import { join } from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";

const authMocks = vi.hoisted(() => ({
  requireCurrentUserContext: vi.fn(),
}));

const workspaceMocks = vi.hoisted(() => ({
  ensureDefaultWorkspace: vi.fn(),
}));

const supabaseServerMocks = vi.hoisted(() => ({
  createSupabaseServerClient: vi.fn(),
}));

vi.mock("@/lib/auth/session", () => authMocks);
vi.mock("@/lib/repositories/workspace-repository", () => workspaceMocks);
vi.mock("@/lib/supabase/server", () => supabaseServerMocks);
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

const workspaceId = "00000000-0000-4000-8000-000000000001";
const templateId = "00000000-0000-4000-8000-000000000002";
const sourceTemplateId = "00000000-0000-4000-8000-000000000003";
const nodeId = "00000000-0000-4000-8000-000000000004";
const rowId = "00000000-0000-4000-8000-000000000005";

function mockViewerSupabaseClient() {
  const rpc = vi.fn(async (name: string) => {
    if (name === "is_workspace_editor") return { data: false, error: null };
    return { data: null, error: null };
  });
  const from = vi.fn(() => {
    throw new Error("viewer template mutations must stop before table access");
  });
  supabaseServerMocks.createSupabaseServerClient.mockResolvedValue({ from, rpc });
  return { from, rpc };
}

function createQueryResult<T>(data: T) {
  const query = {
    select: vi.fn(),
    eq: vi.fn(),
    in: vi.fn(),
    update: vi.fn(),
    maybeSingle: vi.fn(async () => ({ data, error: null })),
  };
  query.select.mockReturnValue(query);
  query.eq.mockReturnValue(query);
  query.in.mockResolvedValue({ data: Array.isArray(data) ? data : [data], error: null });
  query.update.mockReturnValue(query);
  return query;
}

function mockEditorUpdateRowSupabaseClient() {
  const rpc = vi.fn(async (name: string) => {
    if (name === "is_workspace_editor") return { data: true, error: null };
    return { data: null, error: null };
  });
  const templateQuery = createQueryResult({ id: templateId, workspace_id: workspaceId, name: "Editor-safe template" });
  const rowQuery = createQueryResult({ id: rowId, template_id: templateId, material: "Updated row" });
  const from = vi.fn((table: string) => {
    if (table === "estimate_templates") return templateQuery;
    if (table === "estimate_template_row_items") return rowQuery;
    throw new Error(`unexpected table access: ${table}`);
  });
  supabaseServerMocks.createSupabaseServerClient.mockResolvedValue({ from, rpc });
  return { from, rpc, templateQuery, rowQuery };
}

function mockEditorMoveNodeSupabaseClient() {
  const rpc = vi.fn(async (name: string) => {
    if (name === "is_workspace_editor") return { data: true, error: null };
    return { data: null, error: null };
  });
  const templateQuery = createQueryResult({ id: templateId, workspace_id: workspaceId, name: "Editor-safe template" });
  const siblingId = "00000000-0000-4000-8000-000000000006";
  const nodeQuery = createQueryResult([
    {
      id: siblingId,
      template_id: templateId,
      parent_id: null,
      kind: "group",
      name: "Group B",
      sort_order: 1,
    },
    {
      id: nodeId,
      template_id: templateId,
      parent_id: null,
      kind: "group",
      name: "Group A",
      sort_order: 0,
    },
  ]);
  nodeQuery.maybeSingle.mockResolvedValue({
    data: {
    id: nodeId,
    template_id: templateId,
    parent_id: null,
    kind: "group",
    name: "Group A",
    sort_order: 0,
    },
    error: null,
  });
  const from = vi.fn((table: string) => {
    if (table === "estimate_templates") return templateQuery;
    if (table === "estimate_template_nodes") return nodeQuery;
    throw new Error(`unexpected table access: ${table}`);
  });
  supabaseServerMocks.createSupabaseServerClient.mockResolvedValue({ from, rpc });
  return { from, rpc, nodeQuery };
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
    const supabase = mockViewerSupabaseClient();
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

    expect(supabase.rpc).toHaveBeenCalledTimes(10);
    expect(supabase.rpc).toHaveBeenCalledWith("is_workspace_editor", { target_workspace_id: workspaceId });
    expect(supabase.from).not.toHaveBeenCalled();
  });

  it("allows workspace editors to continue through the existing row update flow", async () => {
    const supabase = mockEditorUpdateRowSupabaseClient();
    const actions = await import("@/lib/component-library/template-editor-actions");

    await expect(actions.updateEstimateTemplateRowItem({ templateId, rowId, patch: { material: "Updated row" } })).resolves.toEqual({
      row: { id: rowId, template_id: templateId, material: "Updated row" },
    });

    expect(supabase.rpc).toHaveBeenCalledWith("is_workspace_editor", { target_workspace_id: workspaceId });
    expect(supabase.from).toHaveBeenCalledWith("estimate_templates");
    expect(supabase.templateQuery.select).toHaveBeenCalledWith("id, workspace_id, name");
    expect(supabase.templateQuery.eq).toHaveBeenCalledWith("workspace_id", workspaceId);
    expect(supabase.rowQuery.update).toHaveBeenCalledWith({ material: "Updated row" });
    expect(supabase.rowQuery.eq).toHaveBeenCalledWith("id", rowId);
    expect(supabase.rowQuery.eq).toHaveBeenCalledWith("template_id", templateId);
    expect(supabase.rpc.mock.invocationCallOrder[0]).toBeLessThan(supabase.from.mock.invocationCallOrder[0]);
  });

  it("rebases template node sibling sort orders through temporary values before final ordering", async () => {
    const siblingId = "00000000-0000-4000-8000-000000000006";
    const supabase = mockEditorMoveNodeSupabaseClient();
    const actions = await import("@/lib/component-library/template-editor-actions");

    await expect(
      actions.moveEstimateTemplateNode({
        templateId,
        nodeId,
        parentId: null,
        orderedSiblingIds: [siblingId, nodeId],
      }),
    ).resolves.toEqual({ nodeId, parentId: null });

    expect(supabase.nodeQuery.update).toHaveBeenNthCalledWith(1, {
      sort_order: 1_000_000,
    });
    expect(supabase.nodeQuery.update).toHaveBeenNthCalledWith(2, {
      parent_id: null,
      sort_order: 1_000_001,
    });
    expect(supabase.nodeQuery.update).toHaveBeenNthCalledWith(3, { sort_order: 0 });
    expect(supabase.nodeQuery.update).toHaveBeenNthCalledWith(4, { sort_order: 1 });
    expect(supabase.nodeQuery.in).toHaveBeenCalledWith("id", [siblingId, nodeId]);
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
