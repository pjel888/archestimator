"use server";

import { revalidatePath } from "next/cache";

import { requireCurrentUserContext } from "@/lib/auth/session";
import type { EstimateRowItem } from "@/lib/estimates/types";
import { isUuid } from "@/lib/ids";
import { ensureDefaultWorkspace } from "@/lib/repositories/workspace-repository";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { TablesInsert, TablesUpdate } from "@/lib/supabase/types";
import { throwActionError } from "./action-errors";

type SupabaseServerClient = Awaited<ReturnType<typeof createSupabaseServerClient>>;

export type TemplateNodeKind = "group" | "area";

export type TemplateEditorRowPatch = Partial<{
  material: string;
  description: string;
  quantity: number;
  unit: string;
  unitCost: number;
  miscCost: number;
  contingencyPercentage: number;
}>;

function revalidateTemplateEditorPaths(templateId: string) {
  revalidatePath("/workshop/library/templates");
  revalidatePath(`/workshop/library/templates/${templateId}`);
}

/**
 * Hierarchy note: `validate_estimate_template_tree` runs from a DB trigger on
 * every node/row mutation (groups at root, groups nest groups/areas, rows
 * attach to areas only), so the database is the backstop. These actions
 * still pre-check the cheap rules to fail with friendlier messages.
 */
async function requireWorkspaceTemplate(supabase: SupabaseServerClient, workspaceId: string, templateId: string) {
  if (!isUuid(templateId)) throw new Error("Template not found in the current workspace.");
  const { data: template, error } = await supabase
    .from("estimate_templates")
    .select("id, workspace_id, name")
    .eq("id", templateId)
    .eq("workspace_id", workspaceId)
    .maybeSingle();
  if (error) throwActionError("Could not load the template.", error);
  if (!template) throw new Error("Template not found in the current workspace.");
  return template;
}

async function requireTemplateNode(supabase: SupabaseServerClient, templateId: string, nodeId: string) {
  if (!isUuid(nodeId)) throw new Error("Template node not found.");
  const { data: node, error } = await supabase
    .from("estimate_template_nodes")
    .select("id, template_id, parent_id, kind, name, sort_order")
    .eq("id", nodeId)
    .eq("template_id", templateId)
    .maybeSingle();
  if (error) throwActionError("Could not load the template node.", error);
  if (!node) throw new Error("Template node not found.");
  return node;
}

async function nextSiblingSortOrder(supabase: SupabaseServerClient, templateId: string, parentId: string | null) {
  let query = supabase
    .from("estimate_template_nodes")
    .select("sort_order")
    .eq("template_id", templateId)
    .order("sort_order", { ascending: false })
    .limit(1);
  query = parentId === null ? query.is("parent_id", null) : query.eq("parent_id", parentId);
  const { data, error } = await query;
  if (error) throwActionError("Could not read sibling order.", error);
  return (data?.[0]?.sort_order ?? -1) + 1;
}

export async function createEstimateTemplateNode(input: {
  templateId: string;
  parentId: string | null;
  kind: TemplateNodeKind;
  name: string;
}) {
  const [{ workspace }] = await Promise.all([ensureDefaultWorkspace(), requireCurrentUserContext()]);
  const supabase = await createSupabaseServerClient();
  await requireWorkspaceTemplate(supabase, workspace.id, input.templateId);

  const name = input.name.trim();
  if (!name) throw new Error("Node name is required.");
  if (input.parentId === null && input.kind !== "group") {
    throw new Error("Only groups can sit at the template root.");
  }
  if (input.parentId !== null) {
    const parent = await requireTemplateNode(supabase, input.templateId, input.parentId);
    if (parent.kind !== "group") throw new Error("Groups and areas can only be added under a group.");
  }

  const sortOrder = await nextSiblingSortOrder(supabase, input.templateId, input.parentId);
  const { data: node, error } = await supabase
    .from("estimate_template_nodes")
    .insert({
      template_id: input.templateId,
      parent_id: input.parentId,
      kind: input.kind,
      name,
      sort_order: sortOrder,
      metadata: {},
    })
    .select("*")
    .single();
  if (error || !node) throwActionError("Could not add the ${input.kind}.", error);

  revalidateTemplateEditorPaths(input.templateId);
  return { node };
}

export async function renameEstimateTemplateNode(input: { templateId: string; nodeId: string; name: string }) {
  const [{ workspace }] = await Promise.all([ensureDefaultWorkspace(), requireCurrentUserContext()]);
  const supabase = await createSupabaseServerClient();
  await requireWorkspaceTemplate(supabase, workspace.id, input.templateId);

  const name = input.name.trim();
  if (!name) throw new Error("Node name is required.");

  const { data: node, error } = await supabase
    .from("estimate_template_nodes")
    .update({ name })
    .eq("id", input.nodeId)
    .eq("template_id", input.templateId)
    .select("id, name")
    .maybeSingle();
  if (error) throwActionError("Could not rename the node.", error);
  if (!node) throw new Error("Template node not found.");

  revalidateTemplateEditorPaths(input.templateId);
  return { nodeId: node.id, name: node.name };
}

export async function deleteEstimateTemplateNode(input: { templateId: string; nodeId: string }) {
  const [{ workspace }] = await Promise.all([ensureDefaultWorkspace(), requireCurrentUserContext()]);
  const supabase = await createSupabaseServerClient();
  await requireWorkspaceTemplate(supabase, workspace.id, input.templateId);
  await requireTemplateNode(supabase, input.templateId, input.nodeId);

  const { data: allNodes, error: nodesError } = await supabase
    .from("estimate_template_nodes")
    .select("id, parent_id")
    .eq("template_id", input.templateId);
  if (nodesError) throwActionError("Could not load the template tree.", nodesError);

  const childrenByParent = new Map<string | null, string[]>();
  for (const node of allNodes ?? []) {
    const siblings = childrenByParent.get(node.parent_id) ?? [];
    siblings.push(node.id);
    childrenByParent.set(node.parent_id, siblings);
  }
  const subtreeIds: string[] = [];
  const queue = [input.nodeId];
  while (queue.length > 0) {
    const current = queue.shift()!;
    subtreeIds.push(current);
    queue.push(...(childrenByParent.get(current) ?? []));
  }

  const { error: rowsError } = await supabase
    .from("estimate_template_row_items")
    .delete()
    .eq("template_id", input.templateId)
    .in("template_node_id", subtreeIds);
  if (rowsError) throwActionError("Could not delete the node rows.", rowsError);

  const { error: nodeError } = await supabase
    .from("estimate_template_nodes")
    .delete()
    .eq("template_id", input.templateId)
    .in("id", subtreeIds);
  if (nodeError) throwActionError("Could not delete the node.", nodeError);

  revalidateTemplateEditorPaths(input.templateId);
  return { deletedNodeIds: subtreeIds };
}

export async function moveEstimateTemplateNode(input: {
  templateId: string;
  nodeId: string;
  parentId: string | null;
  /** Sibling ids under the new parent, in final order, including the moved node. */
  orderedSiblingIds: string[];
}) {
  const [{ workspace }] = await Promise.all([ensureDefaultWorkspace(), requireCurrentUserContext()]);
  const supabase = await createSupabaseServerClient();
  await requireWorkspaceTemplate(supabase, workspace.id, input.templateId);
  const node = await requireTemplateNode(supabase, input.templateId, input.nodeId);

  if (input.parentId === null && node.kind !== "group") {
    throw new Error("Only groups can sit at the template root.");
  }
  if (input.parentId !== null) {
    if (input.parentId === input.nodeId) throw new Error("A node cannot be its own parent.");
    const parent = await requireTemplateNode(supabase, input.templateId, input.parentId);
    if (parent.kind !== "group") throw new Error("Groups and areas can only be moved under a group.");

    // Reparenting into the node's own subtree would orphan the branch.
    const { data: allNodes, error: nodesError } = await supabase
      .from("estimate_template_nodes")
      .select("id, parent_id")
      .eq("template_id", input.templateId);
    if (nodesError) throwActionError("Could not load the template tree.", nodesError);
    const parentById = new Map((allNodes ?? []).map((entry) => [entry.id, entry.parent_id]));
    let ancestor: string | null = input.parentId;
    while (ancestor) {
      if (ancestor === input.nodeId) throw new Error("A node cannot move into its own subtree.");
      ancestor = parentById.get(ancestor) ?? null;
    }
  }

  const { error: moveError } = await supabase
    .from("estimate_template_nodes")
    .update({ parent_id: input.parentId })
    .eq("id", input.nodeId)
    .eq("template_id", input.templateId);
  if (moveError) throwActionError("Could not move the node.", moveError);

  for (const [index, siblingId] of input.orderedSiblingIds.entries()) {
    const { error: orderError } = await supabase
      .from("estimate_template_nodes")
      .update({ sort_order: index })
      .eq("id", siblingId)
      .eq("template_id", input.templateId);
    if (orderError) throwActionError("Could not store the sibling order.", orderError);
  }

  revalidateTemplateEditorPaths(input.templateId);
  return { nodeId: input.nodeId, parentId: input.parentId };
}

function buildTemplateRowInsert(input: {
  templateId: string;
  nodeId: string;
  sortOrder: number;
  libraryItem: EstimateRowItem;
}): TablesInsert<"estimate_template_row_items"> {
  const item = input.libraryItem;
  return {
    template_id: input.templateId,
    template_node_id: input.nodeId,
    sort_order: input.sortOrder,
    source_library_item_id: item.sourceLibraryItemId ?? (item.source === "library" ? item.id : null),
    source_snapshot: null,
    category_node_id: item.categoryNodeId ?? null,
    supplier_id: item.supplierId ?? null,
    material: item.name?.trim() || item.material,
    description: item.description ?? "",
    supplier: item.supplier ?? "",
    unit: item.unit || "unit",
    quantity: item.quantity > 0 ? item.quantity : 1,
    unit_cost: item.itemCost ?? 0,
    misc_cost: item.miscCost ?? 0,
    contingency_percentage: item.contingencyPercentage ?? 0,
    discipline: item.discipline ?? "",
    designation: item.designation ?? "",
    link_state: item.sourceLibraryItemId || item.source === "library" ? "linked-clean" : "unlinked",
    metadata: {},
  };
}

export async function addEstimateTemplateRowItems(input: {
  templateId: string;
  nodeId: string;
  libraryItems: EstimateRowItem[];
}) {
  const [{ workspace }] = await Promise.all([ensureDefaultWorkspace(), requireCurrentUserContext()]);
  const supabase = await createSupabaseServerClient();
  await requireWorkspaceTemplate(supabase, workspace.id, input.templateId);
  const node = await requireTemplateNode(supabase, input.templateId, input.nodeId);
  if (node.kind !== "area") throw new Error("Components can only be added to an area.");
  if (input.libraryItems.length === 0) throw new Error("No components to add.");

  const { data: lastRow, error: orderError } = await supabase
    .from("estimate_template_row_items")
    .select("sort_order")
    .eq("template_node_id", input.nodeId)
    .order("sort_order", { ascending: false })
    .limit(1);
  if (orderError) throwActionError("Could not read the row order.", orderError);
  const baseSortOrder = (lastRow?.[0]?.sort_order ?? -1) + 1;

  const inserts = input.libraryItems.map((libraryItem, index) =>
    buildTemplateRowInsert({
      templateId: input.templateId,
      nodeId: input.nodeId,
      sortOrder: baseSortOrder + index,
      libraryItem,
    }),
  );

  const { data: rows, error } = await supabase
    .from("estimate_template_row_items")
    .insert(inserts)
    .select("*");
  if (error) throwActionError("Could not add the rows.", error);

  revalidateTemplateEditorPaths(input.templateId);
  return { rows: rows ?? [] };
}

export async function createEstimateTemplateAllowanceRow(input: {
  templateId: string;
  nodeId: string;
  material: string;
}) {
  const [{ workspace }] = await Promise.all([ensureDefaultWorkspace(), requireCurrentUserContext()]);
  const supabase = await createSupabaseServerClient();
  await requireWorkspaceTemplate(supabase, workspace.id, input.templateId);
  const node = await requireTemplateNode(supabase, input.templateId, input.nodeId);
  if (node.kind !== "area") throw new Error("Rows can only be added to an area.");

  const material = input.material.trim();
  if (!material) throw new Error("Row name is required.");

  const { data: lastRow, error: orderError } = await supabase
    .from("estimate_template_row_items")
    .select("sort_order")
    .eq("template_node_id", input.nodeId)
    .order("sort_order", { ascending: false })
    .limit(1);
  if (orderError) throwActionError("Could not read the row order.", orderError);

  const { data: row, error } = await supabase
    .from("estimate_template_row_items")
    .insert({
      template_id: input.templateId,
      template_node_id: input.nodeId,
      sort_order: (lastRow?.[0]?.sort_order ?? -1) + 1,
      source_library_item_id: null,
      source_snapshot: null,
      category_node_id: null,
      supplier_id: null,
      material,
      description: "",
      supplier: "",
      unit: "unit",
      quantity: 1,
      unit_cost: 0,
      misc_cost: 0,
      contingency_percentage: 0,
      discipline: "",
      designation: "",
      link_state: "unlinked",
      metadata: {},
    })
    .select("*")
    .single();
  if (error || !row) throwActionError("Could not add the allowance row.", error);

  revalidateTemplateEditorPaths(input.templateId);
  return { row };
}

export async function updateEstimateTemplateRowItem(input: {
  templateId: string;
  rowId: string;
  patch: TemplateEditorRowPatch;
}) {
  const [{ workspace }] = await Promise.all([ensureDefaultWorkspace(), requireCurrentUserContext()]);
  const supabase = await createSupabaseServerClient();
  await requireWorkspaceTemplate(supabase, workspace.id, input.templateId);
  if (!isUuid(input.rowId)) throw new Error("Template row not found.");

  const update: TablesUpdate<"estimate_template_row_items"> = {};
  if (input.patch.material !== undefined) {
    const material = input.patch.material.trim();
    if (!material) throw new Error("Row name is required.");
    update.material = material;
  }
  if (input.patch.description !== undefined) update.description = input.patch.description.trim();
  if (input.patch.unit !== undefined) {
    const unit = input.patch.unit.trim();
    if (!unit) throw new Error("Unit is required.");
    update.unit = unit;
  }
  if (input.patch.quantity !== undefined) {
    if (!Number.isFinite(input.patch.quantity) || input.patch.quantity < 0) throw new Error("Quantity must be a non-negative number.");
    update.quantity = input.patch.quantity;
  }
  if (input.patch.unitCost !== undefined) {
    if (!Number.isFinite(input.patch.unitCost) || input.patch.unitCost < 0) throw new Error("Unit cost must be a non-negative number.");
    update.unit_cost = input.patch.unitCost;
  }
  if (input.patch.miscCost !== undefined) {
    if (!Number.isFinite(input.patch.miscCost) || input.patch.miscCost < 0) throw new Error("Misc cost must be a non-negative number.");
    update.misc_cost = input.patch.miscCost;
  }
  if (input.patch.contingencyPercentage !== undefined) {
    if (!Number.isFinite(input.patch.contingencyPercentage) || Math.abs(input.patch.contingencyPercentage) > 100) {
      throw new Error("Adjustment must stay between -100 and 100 percent.");
    }
    update.contingency_percentage = input.patch.contingencyPercentage;
  }
  if (Object.keys(update).length === 0) throw new Error("Nothing to update.");

  const { data: row, error } = await supabase
    .from("estimate_template_row_items")
    .update(update)
    .eq("id", input.rowId)
    .eq("template_id", input.templateId)
    .select("*")
    .maybeSingle();
  if (error) throwActionError("Could not update the row.", error);
  if (!row) throw new Error("Template row not found.");

  revalidateTemplateEditorPaths(input.templateId);
  return { row };
}

export async function removeEstimateTemplateRowItem(input: { templateId: string; rowId: string }) {
  const [{ workspace }] = await Promise.all([ensureDefaultWorkspace(), requireCurrentUserContext()]);
  const supabase = await createSupabaseServerClient();
  await requireWorkspaceTemplate(supabase, workspace.id, input.templateId);
  if (!isUuid(input.rowId)) throw new Error("Template row not found.");

  const { data: row, error } = await supabase
    .from("estimate_template_row_items")
    .delete()
    .eq("id", input.rowId)
    .eq("template_id", input.templateId)
    .select("id")
    .maybeSingle();
  if (error) throwActionError("Could not remove the row.", error);
  if (!row) throw new Error("Template row not found.");

  revalidateTemplateEditorPaths(input.templateId);
  return { rowId: row.id };
}

export async function reorderEstimateTemplateRowItems(input: {
  templateId: string;
  nodeId: string;
  orderedRowIds: string[];
}) {
  const [{ workspace }] = await Promise.all([ensureDefaultWorkspace(), requireCurrentUserContext()]);
  const supabase = await createSupabaseServerClient();
  await requireWorkspaceTemplate(supabase, workspace.id, input.templateId);

  for (const [index, rowId] of input.orderedRowIds.entries()) {
    const { error } = await supabase
      .from("estimate_template_row_items")
      .update({ sort_order: index })
      .eq("id", rowId)
      .eq("template_id", input.templateId)
      .eq("template_node_id", input.nodeId);
    if (error) throwActionError("Could not store the row order.", error);
  }

  revalidateTemplateEditorPaths(input.templateId);
  return { nodeId: input.nodeId };
}

/**
 * Copies another template's subtree into the target template (composition,
 * Phase 3.5). Copy semantics mean cycles cannot form; self-insert is still
 * rejected as a footgun.
 */
export async function insertTemplateIntoTemplate(input: {
  targetTemplateId: string;
  targetNodeId: string | null;
  sourceTemplateId: string;
  /** Copy only this node's subtree instead of the whole source template. */
  sourceNodeId?: string | null;
}) {
  const [{ workspace }] = await Promise.all([ensureDefaultWorkspace(), requireCurrentUserContext()]);
  const supabase = await createSupabaseServerClient();
  await requireWorkspaceTemplate(supabase, workspace.id, input.targetTemplateId);
  await requireWorkspaceTemplate(supabase, workspace.id, input.sourceTemplateId);
  if (input.targetTemplateId === input.sourceTemplateId) {
    throw new Error("A template cannot be inserted into itself.");
  }
  if (input.targetNodeId !== null) {
    const target = await requireTemplateNode(supabase, input.targetTemplateId, input.targetNodeId);
    if (target.kind !== "group") throw new Error("Templates can only be inserted under a group.");
  }

  const [sourceNodesResult, sourceRowsResult] = await Promise.all([
    supabase
      .from("estimate_template_nodes")
      .select("*")
      .eq("template_id", input.sourceTemplateId)
      .order("sort_order", { ascending: true }),
    supabase
      .from("estimate_template_row_items")
      .select("*")
      .eq("template_id", input.sourceTemplateId)
      .order("sort_order", { ascending: true }),
  ]);
  if (sourceNodesResult.error) throwActionError("Could not load the source template.", sourceNodesResult.error);
  if (sourceRowsResult.error) throwActionError("Could not load the source rows.", sourceRowsResult.error);

  let sourceNodes = sourceNodesResult.data ?? [];
  let sourceRows = sourceRowsResult.data ?? [];
  if (input.sourceNodeId) {
    const childrenByParent = new Map<string | null, typeof sourceNodes>();
    for (const node of sourceNodes) {
      const siblings = childrenByParent.get(node.parent_id) ?? [];
      siblings.push(node);
      childrenByParent.set(node.parent_id, siblings);
    }
    const subtree: typeof sourceNodes = [];
    const root = sourceNodes.find((node) => node.id === input.sourceNodeId);
    if (!root) throw new Error("The source template node no longer exists.");
    const queue = [root];
    while (queue.length > 0) {
      const node = queue.shift()!;
      subtree.push(node);
      queue.push(...(childrenByParent.get(node.id) ?? []));
    }
    const subtreeIds = new Set(subtree.map((node) => node.id));
    // The subtree root re-parents onto the target node.
    sourceNodes = subtree.map((node) => (node.id === root.id ? { ...node, parent_id: null } : node));
    sourceRows = sourceRows.filter((row) => subtreeIds.has(row.template_node_id));
  }
  if (sourceNodes.length === 0) throw new Error("The source template has no structure to insert.");

  const baseSortOrder = await nextSiblingSortOrder(supabase, input.targetTemplateId, input.targetNodeId);
  const idMap = new Map<string, string>(sourceNodes.map((node) => [node.id, crypto.randomUUID()]));
  const nodeInserts = sourceNodes.map((node, index) => ({
    id: idMap.get(node.id)!,
    template_id: input.targetTemplateId,
    parent_id: node.parent_id ? idMap.get(node.parent_id) ?? null : input.targetNodeId,
    kind: node.kind,
    name: node.name,
    sort_order: node.parent_id ? node.sort_order : baseSortOrder + index,
    metadata: {},
  }));

  const { error: nodeInsertError } = await supabase.from("estimate_template_nodes").insert(nodeInserts);
  if (nodeInsertError) throwActionError("Could not copy the structure.", nodeInsertError);

  const rowInserts = sourceRows.map((row) => ({
    template_id: input.targetTemplateId,
    template_node_id: idMap.get(row.template_node_id)!,
    sort_order: row.sort_order,
    source_library_item_id: row.source_library_item_id,
    source_snapshot: row.source_snapshot,
    category_node_id: row.category_node_id,
    supplier_id: row.supplier_id,
    material: row.material,
    description: row.description,
    supplier: row.supplier,
    unit: row.unit,
    quantity: row.quantity,
    unit_cost: row.unit_cost,
    misc_cost: row.misc_cost,
    contingency_percentage: row.contingency_percentage,
    discipline: row.discipline,
    designation: row.designation,
    link_state: row.link_state,
    metadata: row.metadata,
  }));

  if (rowInserts.length > 0) {
    const { error: rowInsertError } = await supabase.from("estimate_template_row_items").insert(rowInserts);
    if (rowInsertError) {
      // Without a cross-statement transaction, clean up the copied nodes.
      await supabase
        .from("estimate_template_nodes")
        .delete()
        .eq("template_id", input.targetTemplateId)
        .in("id", Array.from(idMap.values()));
      throwActionError("Could not copy the rows.", rowInsertError);
    }
  }

  revalidateTemplateEditorPaths(input.targetTemplateId);
  return { insertedNodeIds: Array.from(idMap.values()) };
}
