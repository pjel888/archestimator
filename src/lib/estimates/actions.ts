"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireCurrentUserContext } from "@/lib/auth/session";
import type { EstimateTreeNode, EstimateRowItem } from "@/components/workshop/estimate-tree-data";
import {
  canNestEstimateNodeKind,
  getEstimateNodeKindSortRank,
  getEstimateNodeNestingError,
  normalizeEstimateTreeNodeKind,
  type EstimateTreeNodeKind,
} from "@/lib/estimates/tree-hierarchy";
import { planEstimateTreeDelete } from "@/lib/estimates/estimate-tree-edit";
import { isUuid } from "@/lib/ids";
import { isMissingColumnError, normalizeEstimateRecord, type EstimateRecordWithLegacy } from "@/lib/repositories/estimate-schema-compat";
import { getCurrentWorkspaceProject, getProjectEstimateTreeByEstimate } from "@/lib/repositories/workspace-repository";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Tables, TablesInsert, TablesUpdate } from "@/lib/supabase/types";

function readRequiredText(formData: FormData, key: string) {
  const value = String(formData.get(key) ?? "").trim();
  if (!value) throw new Error(`${key} is required.`);
  return value;
}

function readOptionalText(formData: FormData, key: string) {
  const value = String(formData.get(key) ?? "").trim();
  return value || null;
}

type InsertEstimateRowItemFromLibraryInput = {
  projectId: string;
  estimateId: string;
  targetNodeId: string;
  rowId: string;
  libraryItem: EstimateRowItem;
};

type UpdateEstimateRowItemInput = {
  projectId: string;
  estimateId: string;
  rowId: string;
  quantity?: number;
  miscCost?: number;
};

export type UpdateEstimateRowItemResult = {
  rowId: string;
  nodeId: string;
  quantity: number;
  itemCost: number;
  miscCost: number;
  linkState: Tables<"estimate_row_items">["link_state"];
};

type ReplaceEstimateRowItemInput = {
  projectId: string;
  estimateId: string;
  rowId: string;
  libraryItem: EstimateRowItem;
};

type DeleteEstimateRowItemInput = {
  projectId: string;
  estimateId: string;
  rowId: string;
};

type FetchEstimateTreeInput = {
  projectId: string;
  estimateId: string;
};

type ReorderEstimateTreeNodeUpdate = {
  id: string;
  parentId: string | null;
  sortOrder: number;
};

type ReorderEstimateTreeNodesInput = {
  updates: ReorderEstimateTreeNodeUpdate[];
};

type ReorderEstimateTreeNodesResult = {
  tree: EstimateTreeNode[];
};

type ReorderEstimateNodeRow = {
  id: string;
  estimate_id: string;
  parent_id: string | null;
  kind: string;
};

type ValidatedEstimateNodeRow = {
  id: string;
  estimate_id: string;
  parent_id: string | null;
  kind: string;
};

type RenameEstimateNodeResult = {
  nodeId: string;
  name: string;
};

type DeleteEstimateNodeResult = {
  tree: EstimateTreeNode[];
  deletedNodeIds: string[];
  fallbackNodeId: string | null;
};

type CreateEstimateNodeKind = "group" | "area";

type CreateEstimateNodeSiblingRow = {
  id: string;
  kind: string;
  sort_order: number;
};

function readEstimateNodeKind(formData: FormData): CreateEstimateNodeKind {
  const value = readRequiredText(formData, "kind");
  if (value === "group") return "group";
  if (value === "area") return "area";
  throw new Error("Estimate node kind must be group or area.");
}

function getCreateEstimateNodeSiblingRank(kind: string) {
  const normalizedKind = normalizeEstimateTreeNodeKind(kind);
  return normalizedKind ? getEstimateNodeKindSortRank(normalizedKind) : Number.MAX_SAFE_INTEGER;
}

function buildCreateEstimateNodeSiblingUpdates(parentId: string | null, siblings: CreateEstimateNodeSiblingRow[]) {
  return siblings
    .map((sibling, index) => ({ sibling, index }))
    .sort((left, right) => (
      getCreateEstimateNodeSiblingRank(left.sibling.kind) - getCreateEstimateNodeSiblingRank(right.sibling.kind) ||
      left.sibling.sort_order - right.sibling.sort_order ||
      left.index - right.index
    ))
    .map(({ sibling }, index) => ({
      id: sibling.id,
      parent_id: parentId,
      sort_order: (index + 1) * 10,
    }));
}

async function getValidatedEstimateRow(projectId: string, estimateId: string, rowId: string) {
  const { project } = await getCurrentWorkspaceProject(projectId);
  if (!project) throw new Error("Project not found in the current workspace.");

  const supabase = await createSupabaseServerClient();
  const { data: row, error } = await supabase
    .from("estimate_row_items")
    .select("id, node_id, estimate_id, estimate_nodes!inner(id, kind, estimates!inner(project_id))")
    .eq("id", rowId)
    .eq("estimate_id", estimateId)
    .eq("estimate_nodes.estimates.project_id", project.id)
    .maybeSingle();

  if (error) throw error;
  if (!row) throw new Error("Estimate row item not found in the current project.");

  return { project, supabase, row };
}

async function getValidatedEstimateNode(projectId: string, estimateId: string, nodeId: string) {
  const { project } = await getCurrentWorkspaceProject(projectId);
  if (!project) throw new Error("Project not found in the current workspace.");

  const supabase = await createSupabaseServerClient();
  const { data: estimate, error: estimateError } = await supabase
    .from("estimates")
    .select("id, project_id")
    .eq("id", estimateId)
    .eq("project_id", project.id)
    .maybeSingle();

  if (estimateError) throw estimateError;
  if (!estimate) throw new Error("Estimate not found in the current project.");

  const { data: node, error: nodeError } = await supabase
    .from("estimate_nodes")
    .select("id, estimate_id, parent_id, kind, estimates!inner(project_id)")
    .eq("id", nodeId)
    .eq("estimate_id", estimate.id)
    .eq("estimates.project_id", project.id)
    .maybeSingle();

  if (nodeError) throw nodeError;
  if (!node) throw new Error("Estimate tree node not found in the current project.");

  return { project, estimate, supabase, node: node as ValidatedEstimateNodeRow };
}

function readEstimateNodeName(input: FormData | string) {
  if (typeof input === "string") return normalizeEditableText(input, "Estimate tree node name");
  return readRequiredText(input, "name");
}

function getSourceSnapshot(libraryItem: EstimateRowItem) {
  return {
    category: libraryItem.category,
    categoryNodeId: libraryItem.categoryNodeId ?? null,
    categoryPath: libraryItem.categoryPath ?? [],
    imageUrl: libraryItem.imageUrl ?? null,
    pricingDate: libraryItem.pricingDate,
    pricingSource: libraryItem.pricingSource,
    sourceUrl: libraryItem.sourceUrl ?? null,
    supplier: libraryItem.supplier ?? null,
    supplierId: libraryItem.supplierId ?? null,
    tags: libraryItem.tags ?? [],
    taxonomyVersion: "2026-05-22-draft-3",
  };
}

function getEstimateRowMetadata(libraryItem: EstimateRowItem) {
  return {
    categoryNodeId: libraryItem.categoryNodeId ?? null,
    categoryPath: libraryItem.categoryPath ?? [],
    supplierId: libraryItem.supplierId ?? null,
    sourceComponentId: libraryItem.id,
    tags: libraryItem.tags ?? [],
  };
}

function getSourceLibraryItemId(libraryItem: EstimateRowItem) {
  return libraryItem.source === "library" && isUuid(libraryItem.id) ? libraryItem.id : null;
}

async function insertEstimateWithSheetCodeFallback(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  payload: TablesInsert<"estimates">,
  sheetCode: string,
) {
  const currentResult = await supabase.from("estimates").insert(payload).select("*").single();
  if (!currentResult.error) return normalizeEstimateRecord(currentResult.data as EstimateRecordWithLegacy);

  if (!isMissingColumnError(currentResult.error, "sheet_code")) throw currentResult.error;

  const legacyPayload = { ...payload };
  delete legacyPayload.sheet_code;
  const legacyEstimatePayload = { ...legacyPayload, revision_label: sheetCode };
  const legacyResult = await supabase
    .from("estimates")
    .insert(legacyEstimatePayload as never)
    .select("*")
    .single();

  if (legacyResult.error) throw legacyResult.error;
  return normalizeEstimateRecord(legacyResult.data as unknown as EstimateRecordWithLegacy);
}

type ProjectEstimateCodeRow = {
  id: string;
  sheetCode: string;
};

type UpdateEstimateDetailsInput = {
  projectId: string;
  estimateId: string;
  name?: string;
  sheetCode?: string;
};

const GENERATED_SHEET_CODE_PREFIX = "ES";

function normalizeEditableText(value: string | undefined, label: string) {
  const text = String(value ?? "").trim();
  if (!text) throw new Error(`${label} is required.`);
  return text;
}

async function listProjectEstimateCodes(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  projectId: string,
): Promise<ProjectEstimateCodeRow[]> {
  const currentResult = await supabase
    .from("estimates")
    .select("id, sheet_code")
    .eq("project_id", projectId);

  if (!currentResult.error) {
    return (currentResult.data ?? []).map((estimate) => ({
      id: estimate.id,
      sheetCode: estimate.sheet_code ?? "",
    }));
  }

  if (!isMissingColumnError(currentResult.error, "sheet_code")) throw currentResult.error;

  const legacyResult = await supabase
    .from("estimates")
    .select("id, revision_label")
    .eq("project_id", projectId);

  if (legacyResult.error) throw legacyResult.error;
  return ((legacyResult.data ?? []) as unknown as Array<{ id: string; revision_label?: string | null }>).map((estimate) => ({
    id: estimate.id,
    sheetCode: estimate.revision_label ?? "",
  }));
}

function getNextGeneratedSheetCode(existingCodes: string[]) {
  const generatedCodePattern = new RegExp(`^${GENERATED_SHEET_CODE_PREFIX}-(\\d+)$`, "i");
  const nextNumber = existingCodes.reduce((highest, code) => {
    const match = code.trim().match(generatedCodePattern);
    if (!match) return highest;
    const parsed = Number(match[1]);
    return Number.isFinite(parsed) ? Math.max(highest, parsed) : highest;
  }, 0) + 1;

  return `${GENERATED_SHEET_CODE_PREFIX}-${String(nextNumber).padStart(3, "0")}`;
}

async function generateNextEstimateSheetCode(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  projectId: string,
  excludedEstimateId?: string,
) {
  const estimateCodes = await listProjectEstimateCodes(supabase, projectId);
  const existingCodes = estimateCodes
    .filter((estimate) => estimate.id !== excludedEstimateId)
    .map((estimate) => estimate.sheetCode.trim())
    .filter(Boolean);
  const existingCodeSet = new Set(existingCodes.map((code) => code.toLocaleLowerCase()));
  let candidate = getNextGeneratedSheetCode(existingCodes);

  while (existingCodeSet.has(candidate.toLocaleLowerCase())) {
    candidate = getNextGeneratedSheetCode([...existingCodes, candidate]);
  }

  return candidate;
}

async function assertEstimateSheetCodeIsAvailable(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  projectId: string,
  sheetCode: string,
  currentEstimateId?: string,
) {
  const estimateCodes = await listProjectEstimateCodes(supabase, projectId);
  const normalizedSheetCode = sheetCode.trim().toLocaleLowerCase();
  const duplicate = estimateCodes.find(
    (estimate) => estimate.id !== currentEstimateId && estimate.sheetCode.trim().toLocaleLowerCase() === normalizedSheetCode,
  );

  if (duplicate) throw new Error(`Sheet code ${sheetCode} already exists in this project.`);
}

async function updateEstimateWithSheetCodeFallback(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  estimateId: string,
  projectId: string,
  payload: TablesUpdate<"estimates">,
  sheetCode?: string,
) {
  const currentResult = await supabase
    .from("estimates")
    .update(payload)
    .eq("id", estimateId)
    .eq("project_id", projectId)
    .select("*")
    .maybeSingle();

  if (!currentResult.error) {
    if (!currentResult.data) throw new Error("Estimate not found in the current project.");
    return normalizeEstimateRecord(currentResult.data as EstimateRecordWithLegacy);
  }

  if (!sheetCode || !isMissingColumnError(currentResult.error, "sheet_code")) throw currentResult.error;

  const legacyPayload = { ...payload } as Record<string, unknown>;
  delete legacyPayload.sheet_code;
  legacyPayload.revision_label = sheetCode;

  const legacyResult = await supabase
    .from("estimates")
    .update(legacyPayload as never)
    .eq("id", estimateId)
    .eq("project_id", projectId)
    .select("*")
    .maybeSingle();

  if (legacyResult.error) throw legacyResult.error;
  if (!legacyResult.data) throw new Error("Estimate not found in the current project.");
  return normalizeEstimateRecord(legacyResult.data as unknown as EstimateRecordWithLegacy);
}

async function createEstimateWithDefaultTree({
  supabase,
  project,
  name,
  sheetCode,
  createdBy,
}: {
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>;
  project: Tables<"projects">;
  name: string;
  sheetCode: string;
  createdBy: string | null;
}) {
  await assertEstimateSheetCodeIsAvailable(supabase, project.id, sheetCode);

  const estimate = await insertEstimateWithSheetCodeFallback(
    supabase,
    {
      project_id: project.id,
      created_by: createdBy,
      name,
      sheet_code: sheetCode,
      currency_code: project.currency_code,
      metadata: {},
    },
    sheetCode,
  );

  const { data: projectGroupNode, error: projectGroupError } = await supabase
    .from("estimate_nodes")
    .insert({
      estimate_id: estimate.id,
      parent_id: null,
      kind: "group",
      name: "Project Scope",
      sort_order: 0,
    })
    .select("id")
    .single();

  if (projectGroupError) throw projectGroupError;

  const { error: generalNodesError } = await supabase.from("estimate_nodes").insert([
    {
      estimate_id: estimate.id,
      parent_id: projectGroupNode.id,
      kind: "group",
      name: "General Requirements",
      sort_order: 0,
    },
    {
      estimate_id: estimate.id,
      parent_id: projectGroupNode.id,
      kind: "group",
      name: "Site Works",
      sort_order: 10,
    },
  ]);

  if (generalNodesError) throw generalNodesError;

  const { data: buildingGroupNode, error: buildingGroupError } = await supabase
    .from("estimate_nodes")
    .insert({
      estimate_id: estimate.id,
      parent_id: projectGroupNode.id,
      kind: "group",
      name: project.name,
      sort_order: 20,
    })
    .select("id")
    .single();

  if (buildingGroupError) throw buildingGroupError;

  const { data: levelGroupNode, error: levelGroupError } = await supabase
    .from("estimate_nodes")
    .insert({
      estimate_id: estimate.id,
      parent_id: buildingGroupNode.id,
      kind: "group",
      name: "Ground Floor",
      sort_order: 0,
    })
    .select("id")
    .single();

  if (levelGroupError) throw levelGroupError;

  const { data: areaNode, error: areaError } = await supabase
    .from("estimate_nodes")
    .insert({
      estimate_id: estimate.id,
      parent_id: levelGroupNode.id,
      kind: "area",
      name: "Project-wide",
      sort_order: 0,
    })
    .select("id")
    .single();

  if (areaError) throw areaError;

  return { estimate, areaNodeId: areaNode.id };
}

function revalidateProjectEstimatePaths(projectId: string) {
  revalidatePath(`/workshop/projects/${projectId}`);
  revalidatePath(`/workshop/projects/${projectId}/estimates`);
}

export async function fetchEstimateTree({ projectId, estimateId }: FetchEstimateTreeInput) {
  const { project, estimate, tree } = await getProjectEstimateTreeByEstimate(projectId, estimateId);
  if (!project || !estimate) throw new Error("Estimate not found in the current project.");
  return tree;
}

export async function reorderEstimateTreeNodes(
  projectId: string,
  estimateId: string,
  input: ReorderEstimateTreeNodesInput,
): Promise<ReorderEstimateTreeNodesResult> {
  if (!input.updates.length) throw new Error("At least one estimate tree node update is required.");

  const updateIds = new Set<string>();
  for (const update of input.updates) {
    if (updateIds.has(update.id)) throw new Error(`Duplicate estimate tree node update: ${update.id}.`);
    updateIds.add(update.id);
    if (!Number.isInteger(update.sortOrder) || update.sortOrder < 0) throw new Error("Estimate tree node sort order must be a non-negative integer.");
  }

  const { project } = await getCurrentWorkspaceProject(projectId);
  if (!project) throw new Error("Project not found in the current workspace.");

  const supabase = await createSupabaseServerClient();
  const { data: estimate, error: estimateError } = await supabase
    .from("estimates")
    .select("id, project_id")
    .eq("id", estimateId)
    .eq("project_id", project.id)
    .maybeSingle();

  if (estimateError) throw estimateError;
  if (!estimate) throw new Error("Estimate not found in the current project.");

  const referencedNodeIds = Array.from(new Set([
    ...input.updates.map((update) => update.id),
    ...input.updates.flatMap((update) => (update.parentId ? [update.parentId] : [])),
  ]));
  const { data: referencedNodes, error: nodeError } = await supabase
    .from("estimate_nodes")
    .select("id, estimate_id, parent_id, kind")
    .in("id", referencedNodeIds);

  if (nodeError) throw nodeError;

  const referencedNodeRows = (referencedNodes ?? []) as ReorderEstimateNodeRow[];
  const nodesById = new Map(referencedNodeRows.map((node) => [node.id, node]));
  for (const update of input.updates) {
    const node = nodesById.get(update.id);
    if (!node || node.estimate_id !== estimate.id) throw new Error("Estimate tree update node not found in the current estimate.");

    const parentNode = update.parentId ? nodesById.get(update.parentId) : null;
    if (update.parentId && (!parentNode || parentNode.estimate_id !== estimate.id)) {
      throw new Error("Estimate tree update parent not found in the current estimate.");
    }

    const nodeKind = normalizeEstimateTreeNodeKind(node.kind);
    if (!nodeKind) throw new Error("Unsupported estimate node kind.");

    let parentKind: EstimateTreeNodeKind | null = null;
    if (parentNode) {
      parentKind = normalizeEstimateTreeNodeKind(parentNode.kind);
      if (!parentKind) throw new Error("Unsupported estimate node kind.");
    }

    if (!canNestEstimateNodeKind(nodeKind, parentKind)) throw new Error(getEstimateNodeNestingError(nodeKind, parentKind));
  }

  const moveUpdates = input.updates.map((update) => ({
    id: update.id,
    parent_id: update.parentId,
    sort_order: update.sortOrder,
  }));
  const rpcPayload = { target_estimate_id: estimate.id, move_updates: moveUpdates };
  const { error: rpcError } = await supabase.rpc("reorder_estimate_nodes", rpcPayload);
  if (rpcError) throw new Error(`Could not reorder estimate tree: ${rpcError.message}`);

  const { project: refreshedProject, estimate: refreshedEstimate, tree } = await getProjectEstimateTreeByEstimate(project.id, estimate.id);
  if (!refreshedProject || !refreshedEstimate) throw new Error("Estimate not found after reordering the tree.");
  return { tree };
}

export async function createEstimate(projectId: string, formData: FormData) {
  const { project } = await getCurrentWorkspaceProject(projectId);
  if (!project) throw new Error("Project not found in the current workspace.");

  const supabase = await createSupabaseServerClient();
  const currentUser = await requireCurrentUserContext();
  const name = readRequiredText(formData, "name");
  const requestedSheetCode = readOptionalText(formData, "sheetCode") ?? readOptionalText(formData, "revisionLabel");
  const sheetCode = requestedSheetCode ?? (await generateNextEstimateSheetCode(supabase, project.id));

  const { areaNodeId } = await createEstimateWithDefaultTree({
    supabase,
    project,
    name,
    sheetCode,
    createdBy: currentUser.userId,
  });

  revalidateProjectEstimatePaths(project.id);
  redirect(`/workshop/projects/${project.id}/estimates/${areaNodeId}`);
}

export async function createEstimateSheetDraft(projectId: string) {
  const { project } = await getCurrentWorkspaceProject(projectId);
  if (!project) throw new Error("Project not found in the current workspace.");

  const supabase = await createSupabaseServerClient();
  const currentUser = await requireCurrentUserContext();
  const sheetCode = await generateNextEstimateSheetCode(supabase, project.id);

  const { estimate, areaNodeId } = await createEstimateWithDefaultTree({
    supabase,
    project,
    name: `${sheetCode} Estimate Sheet`,
    sheetCode,
    createdBy: currentUser.userId,
  });

  revalidateProjectEstimatePaths(project.id);
  return { estimateId: estimate.id, areaNodeId, sheetCode };
}

export async function updateEstimateDetails(input: UpdateEstimateDetailsInput) {
  const { project } = await getCurrentWorkspaceProject(input.projectId);
  if (!project) throw new Error("Project not found in the current workspace.");

  const supabase = await createSupabaseServerClient();
  const payload: TablesUpdate<"estimates"> = {};
  let sheetCode: string | undefined;

  if (input.name !== undefined) payload.name = normalizeEditableText(input.name, "Estimate sheet name");
  if (input.sheetCode !== undefined) {
    sheetCode = normalizeEditableText(input.sheetCode, "Sheet code");
    await assertEstimateSheetCodeIsAvailable(supabase, project.id, sheetCode, input.estimateId);
    payload.sheet_code = sheetCode;
  }

  if (Object.keys(payload).length === 0) throw new Error("No estimate changes provided.");

  const estimate = await updateEstimateWithSheetCodeFallback(supabase, input.estimateId, project.id, payload, sheetCode);
  revalidateProjectEstimatePaths(project.id);
  return estimate;
}

export async function regenerateEstimateSheetCode(input: { projectId: string; estimateId: string }) {
  const { project } = await getCurrentWorkspaceProject(input.projectId);
  if (!project) throw new Error("Project not found in the current workspace.");

  const supabase = await createSupabaseServerClient();
  const sheetCode = await generateNextEstimateSheetCode(supabase, project.id, input.estimateId);
  const estimate = await updateEstimateWithSheetCodeFallback(
    supabase,
    input.estimateId,
    project.id,
    { sheet_code: sheetCode },
    sheetCode,
  );

  revalidateProjectEstimatePaths(project.id);
  return estimate;
}

export async function createEstimateNode(projectId: string, estimateId: string, formData: FormData) {
  const { project } = await getCurrentWorkspaceProject(projectId);
  if (!project) throw new Error("Project not found in the current workspace.");

  const supabase = await createSupabaseServerClient();
  const name = readRequiredText(formData, "name");
  const kind = readEstimateNodeKind(formData);
  const parentId = readOptionalText(formData, "parentId");
  let parentKind: EstimateTreeNodeKind | null = null;

  const { data: estimate, error: estimateError } = await supabase
    .from("estimates")
    .select("id, project_id")
    .eq("id", estimateId)
    .eq("project_id", project.id)
    .maybeSingle();

  if (estimateError) throw estimateError;
  if (!estimate) throw new Error("Estimate not found in the current project.");

  if (parentId) {
    const { data: parentNode, error: parentError } = await supabase
      .from("estimate_nodes")
      .select("id, kind, estimate_id, estimates!inner(project_id)")
      .eq("id", parentId)
      .eq("estimate_id", estimate.id)
      .eq("estimates.project_id", project.id)
      .maybeSingle();

    if (parentError) throw parentError;
    if (!parentNode) throw new Error("Parent estimate node not found in the current project.");
    parentKind = normalizeEstimateTreeNodeKind(parentNode.kind);
    if (!parentKind) throw new Error("Unsupported estimate node kind.");
  }

  if (!canNestEstimateNodeKind(kind, parentKind)) {
    throw new Error(getEstimateNodeNestingError(kind, parentKind));
  }

  const siblingQuery = supabase
    .from("estimate_nodes")
    .select("id, kind, sort_order")
    .eq("estimate_id", estimate.id)
    .order("sort_order", { ascending: true });
  const { data: siblings, error: siblingsError } = parentId
    ? await siblingQuery.eq("parent_id", parentId)
    : await siblingQuery.is("parent_id", null);

  if (siblingsError) throw siblingsError;

  const siblingRows = (siblings ?? []) as CreateEstimateNodeSiblingRow[];
  const maxSiblingSortOrder = siblingRows.reduce((max, sibling) => Math.max(max, sibling.sort_order), -1);
  const { data: node, error: insertError } = await supabase.from("estimate_nodes").insert({
    estimate_id: estimate.id,
    parent_id: parentId,
    kind,
    name,
    sort_order: maxSiblingSortOrder + 1,
  }).select("id").single();

  if (insertError) throw insertError;

  const moveUpdates = buildCreateEstimateNodeSiblingUpdates(parentId, [
    ...siblingRows,
    { id: node.id, kind, sort_order: maxSiblingSortOrder + 1 },
  ]);
  const { error: rpcError } = await supabase.rpc("reorder_estimate_nodes", {
    target_estimate_id: estimate.id,
    move_updates: moveUpdates,
  });
  if (rpcError) {
    const { error: rollbackError } = await supabase
      .from("estimate_nodes")
      .delete()
      .eq("id", node.id)
      .eq("estimate_id", estimate.id);
    if (rollbackError) {
      throw new Error(`Could not order estimate tree siblings: ${rpcError.message}; rollback failed: ${rollbackError.message}`);
    }
    throw new Error(`Could not order estimate tree siblings: ${rpcError.message}`);
  }

  revalidatePath(`/workshop/projects/${project.id}/estimates`);
  revalidatePath(`/workshop/projects/${project.id}/estimates/${estimate.id}`);
  redirect(`/workshop/projects/${project.id}/estimates/${node.id}`);
}

export async function renameEstimateNode(
  projectId: string,
  estimateId: string,
  nodeId: string,
  formDataOrName: FormData | string,
): Promise<RenameEstimateNodeResult> {
  const name = readEstimateNodeName(formDataOrName);
  const { estimate, supabase, node } = await getValidatedEstimateNode(projectId, estimateId, nodeId);

  const { error } = await supabase
    .from("estimate_nodes")
    .update({ name })
    .eq("id", node.id)
    .eq("estimate_id", estimate.id);

  if (error) throw error;

  return { nodeId: node.id, name };
}

export async function deleteEstimateNode(
  projectId: string,
  estimateId: string,
  nodeId: string,
): Promise<DeleteEstimateNodeResult> {
  const { project, estimate, supabase, node } = await getValidatedEstimateNode(projectId, estimateId, nodeId);
  const { project: currentProject, estimate: currentEstimate, tree: currentTree } = await getProjectEstimateTreeByEstimate(project.id, estimate.id);
  if (!currentProject || !currentEstimate) throw new Error("Estimate not found before deleting the tree node.");

  const deletePlan = planEstimateTreeDelete(currentTree, node.id, node.id);
  const { error } = await supabase
    .from("estimate_nodes")
    .delete()
    .eq("id", node.id)
    .eq("estimate_id", estimate.id);

  if (error) throw error;

  const { project: refreshedProject, estimate: refreshedEstimate, tree } = await getProjectEstimateTreeByEstimate(project.id, estimate.id);
  if (!refreshedProject || !refreshedEstimate) throw new Error("Estimate not found after deleting the tree node.");

  revalidatePath(`/workshop/projects/${project.id}/estimates`);
  revalidatePath(`/workshop/projects/${project.id}/estimates/${estimate.id}`);
  revalidatePath(`/workshop/projects/${project.id}/estimates/${node.id}`);

  return {
    tree,
    deletedNodeIds: Array.from(deletePlan.deletedNodeIds),
    fallbackNodeId: deletePlan.fallbackNodeId,
  };
}

export async function insertEstimateRowItemFromLibrary({ projectId, estimateId, targetNodeId, rowId, libraryItem }: InsertEstimateRowItemFromLibraryInput) {
  const { project } = await getCurrentWorkspaceProject(projectId);
  if (!project) throw new Error("Project not found in the current workspace.");

  const supabase = await createSupabaseServerClient();
  const { data: targetNode, error: nodeError } = await supabase
    .from("estimate_nodes")
    .select("id, estimate_id, kind, estimates!inner(project_id)")
    .eq("id", targetNodeId)
    .eq("estimate_id", estimateId)
    .eq("kind", "area")
    .eq("estimates.project_id", project.id)
    .maybeSingle();

  if (nodeError) throw nodeError;
  if (!targetNode) throw new Error("Target estimate area not found in the current project.");

  const { data: existingRows, error: rowsError } = await supabase
    .from("estimate_row_items")
    .select("sort_order")
    .eq("estimate_id", estimateId)
    .eq("node_id", targetNodeId)
    .order("sort_order", { ascending: false })
    .limit(1);

  if (rowsError) throw rowsError;

  const nextSortOrder = (existingRows?.[0]?.sort_order ?? -1) + 1;
  const quantity = libraryItem.quantity || 1;
  const sourceSnapshot = getSourceSnapshot(libraryItem);
  const sourceLibraryItemId = getSourceLibraryItemId(libraryItem);
  const persistedRowId = isUuid(rowId) ? rowId : randomUUID();

  const { error: insertError } = await supabase.from("estimate_row_items").insert({
    id: persistedRowId,
    estimate_id: estimateId,
    node_id: targetNodeId,
    sort_order: nextSortOrder,
    source_library_item_id: sourceLibraryItemId,
    source_snapshot: sourceSnapshot,
    category_node_id: libraryItem.categoryNodeId ?? null,
    supplier_id: libraryItem.supplierId ?? null,
    material: libraryItem.material,
    description: libraryItem.description,
    supplier: libraryItem.supplier,
    unit: libraryItem.unit,
    quantity,
    unit_cost: libraryItem.itemCost,
    misc_cost: libraryItem.miscCost,
    discipline: libraryItem.discipline,
    designation: libraryItem.designation,
    metadata: getEstimateRowMetadata(libraryItem),
    link_state: sourceLibraryItemId ? "linked-clean" : "unlinked",
  });

  if (insertError) throw insertError;

  revalidatePath(`/workshop/projects/${project.id}/estimates/${targetNodeId}`);
  revalidatePath(`/workshop/projects/${project.id}/estimates`);
}

export async function updateEstimateRowItem({ projectId, estimateId, rowId, quantity, miscCost }: UpdateEstimateRowItemInput): Promise<UpdateEstimateRowItemResult> {
  const { project, supabase, row } = await getValidatedEstimateRow(projectId, estimateId, rowId);
  const updatePayload = {
    ...(quantity !== undefined ? { quantity } : {}),
    ...(miscCost !== undefined ? { misc_cost: miscCost } : {}),
    link_state: "linked-overridden" as const,
  };

  const { data: updatedRow, error } = await supabase
    .from("estimate_row_items")
    .update(updatePayload)
    .eq("id", row.id)
    .eq("estimate_id", estimateId)
    .select("id, node_id, quantity, unit_cost, misc_cost, link_state")
    .single();
  if (error) throw error;

  revalidatePath(`/workshop/projects/${project.id}/estimates/${row.node_id}`);
  return {
    rowId: updatedRow.id,
    nodeId: updatedRow.node_id,
    quantity: Number(updatedRow.quantity),
    itemCost: Number(updatedRow.unit_cost),
    miscCost: Number(updatedRow.misc_cost),
    linkState: updatedRow.link_state,
  };
}

export async function replaceEstimateRowItemWithLibrary({ projectId, estimateId, rowId, libraryItem }: ReplaceEstimateRowItemInput) {
  const { project, supabase, row } = await getValidatedEstimateRow(projectId, estimateId, rowId);
  const quantity = libraryItem.quantity || 1;
  const sourceLibraryItemId = getSourceLibraryItemId(libraryItem);
  const { error } = await supabase
    .from("estimate_row_items")
    .update({
      source_library_item_id: sourceLibraryItemId,
      source_snapshot: getSourceSnapshot(libraryItem),
      category_node_id: libraryItem.categoryNodeId ?? null,
      supplier_id: libraryItem.supplierId ?? null,
      material: libraryItem.material,
      description: libraryItem.description,
      supplier: libraryItem.supplier,
      unit: libraryItem.unit,
      quantity,
      unit_cost: libraryItem.itemCost,
      misc_cost: libraryItem.miscCost,
      discipline: libraryItem.discipline,
      designation: libraryItem.designation,
      metadata: getEstimateRowMetadata(libraryItem),
      link_state: sourceLibraryItemId ? "linked-clean" : "unlinked",
    })
    .eq("id", row.id)
    .eq("estimate_id", estimateId);

  if (error) throw error;

  revalidatePath(`/workshop/projects/${project.id}/estimates/${row.node_id}`);
}

export async function deleteEstimateRowItem({ projectId, estimateId, rowId }: DeleteEstimateRowItemInput) {
  const { project, supabase, row } = await getValidatedEstimateRow(projectId, estimateId, rowId);
  const { error } = await supabase.from("estimate_row_items").delete().eq("id", row.id).eq("estimate_id", estimateId);
  if (error) throw error;

  revalidatePath(`/workshop/projects/${project.id}/estimates/${row.node_id}`);
}
