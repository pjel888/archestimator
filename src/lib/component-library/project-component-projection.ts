import { classifyEstimateRowSource, isExpressComponentProjectFolderEnabled, readEstimateRowMetadata, withProjectComponentProjectionMetadata } from "@/lib/estimates/express-components";
import { sanitizeEstimateRowSourceSnapshot } from "@/lib/estimates/image-url";
import {
  SIDEBAR_COMPONENT_LIBRARY_MAX_LIMIT,
  fallbackComponentRowsLibraryDataset,
  getCurrentWorkspaceComponentRowsLibrary,
  type ComponentRowsLibraryDataset,
} from "@/lib/repositories/component-library-repository";
import { getCurrentWorkspaceProject } from "@/lib/repositories/workspace-repository";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { EstimateRowItem } from "@/lib/estimates/types";
import type { Json } from "@/lib/supabase/types";

const PROJECT_COMPONENTS_FOLDER_ID_PREFIX = "project-components";
const PROJECT_COMPONENTS_EXPRESS_FOLDER_SUFFIX = "express";
const PROJECT_COMPONENTS_PROJECT_SPECIFIC_FOLDER_SUFFIX = "project-specific";
const UNKNOWN_ESTIMATE_FOLDER_ID = "unknown-estimate";

export type ProjectComponentProjectionRow = {
  id: string;
  material: string;
  description: string;
  supplier: string;
  supplier_id: string | null;
  unit: string;
  unit_cost: number | string;
  quantity: number | string;
  quantity_base: number | string | null;
  quantity_contingency_amount: number | string | null;
  contingency_percentage: number | string | null;
  misc_cost: number | string;
  row_revision: number | null;
  category_node_id: string | null;
  discipline: string | null;
  designation: string | null;
  source_library_item_id: string | null;
  link_state: EstimateRowItem["linkState"] | null;
  source_snapshot: unknown;
  metadata: unknown;
  created_at: string;
  estimate_nodes?: {
    id: string;
    name: string;
    estimates?: {
      id: string;
      name: string;
      project_id: string;
    } | null;
  } | null;
};

export type ProjectComponentRowsLibraryOptions = {
  includeDetailGraph?: boolean;
  itemLimit?: number;
  projectRowLimit?: number;
};

function readRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function readNumber(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function readString(value: unknown) {
  return typeof value === "string" ? value : "";
}

function normalizeProjectComponentRowLimit(limit: number | undefined): number | undefined {
  if (limit === undefined) return undefined;
  if (!Number.isFinite(limit)) return SIDEBAR_COMPONENT_LIBRARY_MAX_LIMIT;
  return Math.max(1, Math.min(SIDEBAR_COMPONENT_LIBRARY_MAX_LIMIT, Math.floor(limit)));
}

export function getProjectComponentsFolderId(projectId: string) {
  return `${PROJECT_COMPONENTS_FOLDER_ID_PREFIX}-${projectId}`;
}

function getProjectComponentsGroupFolderId(projectId: string, group: "express" | "project-specific") {
  return `${getProjectComponentsFolderId(projectId)}-${group}`;
}

export function getProjectEstimateComponentsFolderId(projectId: string, estimateId: string | null | undefined) {
  return `${getProjectComponentsFolderId(projectId)}-estimate-${estimateId || UNKNOWN_ESTIMATE_FOLDER_ID}`;
}

export function projectEstimateRowToLibraryItem(row: ProjectComponentProjectionRow, projectId: string, projectName?: string): EstimateRowItem | null {
  const sourceSnapshot = readRecord(sanitizeEstimateRowSourceSnapshot(row.source_snapshot));
  const metadata = readEstimateRowMetadata(row.metadata);
  const classification = classifyEstimateRowSource({
    material: row.material,
    description: row.description,
    supplier: row.supplier,
    unit: row.unit,
    quantity: readNumber(row.quantity),
    itemCost: readNumber(row.unit_cost),
    miscCost: readNumber(row.misc_cost),
    sourceLibraryItemId: row.source_library_item_id,
    sourceSnapshot,
    linkState: row.link_state,
    metadata,
  });
  const projectionClassification: "express" | "detached-library" | null = classification === "express"
    ? "express"
    : row.link_state === "detached"
      ? "detached-library"
      : null;

  if (!projectionClassification) return null;

  const quantity = readNumber(row.quantity) || 1;
  const quantityBase = row.quantity_base === null || row.quantity_base === undefined ? null : readNumber(row.quantity_base);
  const quantityContingencyAmount = quantityBase === null ? null : readNumber(row.quantity_contingency_amount ?? 0);
  const itemCost = readNumber(row.unit_cost);
  const contingencyPercentage = quantityBase === null
    ? readNumber(row.contingency_percentage ?? 0)
    : quantityBase > 0 ? ((quantityContingencyAmount ?? 0) / quantityBase) * 100 : 0;
  const miscCost = readNumber(row.misc_cost);
  const subTotal = itemCost * quantity;
  const contingencyValue = quantityBase === null ? (subTotal * contingencyPercentage) / 100 : 0;
  const category = readString(sourceSnapshot.category) || "Project";
  const categoryNodeId = row.category_node_id ?? (typeof sourceSnapshot.categoryNodeId === "string" ? sourceSnapshot.categoryNodeId : undefined);
  const supplierId = row.supplier_id ?? (typeof sourceSnapshot.supplierId === "string" ? sourceSnapshot.supplierId : undefined);
  const estimateName = row.estimate_nodes?.estimates?.name;
  const estimateId = row.estimate_nodes?.estimates?.id;
  const nodeName = row.estimate_nodes?.name;
  const nodeId = row.estimate_nodes?.id;
  const projectFolderId = getProjectEstimateComponentsFolderId(projectId, estimateId);
  const imageAsset = readRecord(sourceSnapshot.imageAsset);

  return {
    id: row.id,
    material: row.material || "Untitled component",
    description: row.description,
    supplier: row.supplier || "No supplier",
    supplierId: supplierId ?? undefined,
    source: "project",
    unit: row.unit || "unit",
    itemCost,
    quantity,
    quantityBase,
    quantityContingencyAmount,
    subTotal,
    contingencyPercentage,
    contingencyValue,
    miscCost,
    totalItemCosts: subTotal + contingencyValue + miscCost,
    rowRevision: row.row_revision ?? undefined,
    category,
    categoryNodeId: categoryNodeId ?? undefined,
    discipline: row.discipline ?? undefined,
    designation: row.designation ?? undefined,
    tags: ["project-component", projectionClassification, estimateName, nodeName].filter((tag): tag is string => Boolean(tag)),
    imageUrl: typeof sourceSnapshot.imageUrl === "string" ? sourceSnapshot.imageUrl : undefined,
    sourceLibraryItemId: row.source_library_item_id,
    metadata: withProjectComponentProjectionMetadata(metadata, {
      projectId,
      projectName: projectName ?? null,
      estimateId: estimateId ?? null,
      estimateName: estimateName ?? null,
      nodeId: nodeId ?? null,
      nodeName: nodeName ?? null,
      classification: projectionClassification,
      ...(Object.keys(imageAsset).length > 0 ? { imageAsset: imageAsset as Json } : {}),
    }),
    linkState: row.link_state ?? "unlinked",
    libraryFolderId: projectFolderId,
    componentVersionId: typeof sourceSnapshot.componentVersionId === "string" ? sourceSnapshot.componentVersionId : undefined,
    componentVersionNumber: typeof sourceSnapshot.componentVersionNumber === "number" ? sourceSnapshot.componentVersionNumber : undefined,
    priceOptionId: typeof sourceSnapshot.priceOptionId === "string" ? sourceSnapshot.priceOptionId : undefined,
    priceOptionLabel: typeof sourceSnapshot.priceOptionLabel === "string" ? sourceSnapshot.priceOptionLabel : undefined,
    lifecycleState: typeof sourceSnapshot.lifecycleState === "string" ? sourceSnapshot.lifecycleState as EstimateRowItem["lifecycleState"] : undefined,
    sourceUrl: typeof sourceSnapshot.sourceUrl === "string" ? sourceSnapshot.sourceUrl : undefined,
    pricingSource: typeof sourceSnapshot.pricingSource === "string" ? sourceSnapshot.pricingSource : "Project estimate row",
    pricingDate: typeof sourceSnapshot.pricingDate === "string" ? sourceSnapshot.pricingDate : row.created_at.slice(0, 10),
  };
}

export async function getProjectComponentRowsLibrary(
  projectId: string,
  options: ProjectComponentRowsLibraryOptions = {},
): Promise<ComponentRowsLibraryDataset> {
  const { project } = await getCurrentWorkspaceProject(projectId);
  if (!project) return fallbackComponentRowsLibraryDataset;

  const library = await getCurrentWorkspaceComponentRowsLibrary({
    includeDetailGraph: options.includeDetailGraph,
    itemLimit: options.itemLimit,
  });
  if (!isExpressComponentProjectFolderEnabled()) return library;

  const supabase = await createSupabaseServerClient();
  const projectRowLimit = normalizeProjectComponentRowLimit(options.projectRowLimit);
  let projectRowsQuery = supabase
    .from("estimate_row_items")
    .select("id, material, description, supplier, supplier_id, unit, unit_cost, quantity, quantity_base, quantity_contingency_amount, contingency_percentage, misc_cost, row_revision, category_node_id, discipline, designation, source_library_item_id, link_state, source_snapshot, metadata, created_at, estimate_nodes!inner(id, name, estimates!inner(id, name, project_id))")
    .eq("estimate_nodes.estimates.project_id", project.id)
    .order("created_at", { ascending: false });
  if (projectRowLimit !== undefined) projectRowsQuery = projectRowsQuery.limit(projectRowLimit);

  const { data, error } = await projectRowsQuery;

  if (error) throw error;

  const projectedRows = ((data ?? []) as ProjectComponentProjectionRow[])
    .map((row) => ({ row, item: projectEstimateRowToLibraryItem(row, project.id, project.name) }))
    .filter((entry): entry is { row: ProjectComponentProjectionRow; item: EstimateRowItem } => Boolean(entry.item));
  const projectItems = projectedRows.map((entry) => entry.item);

  const projectFolderId = getProjectComponentsFolderId(project.id);
  const estimateFoldersById = new Map<string, { id: string; name: string }>();
  for (const { row } of projectedRows) {
    const estimateId = row.estimate_nodes?.estimates?.id ?? null;
    const estimateFolderId = getProjectEstimateComponentsFolderId(project.id, estimateId);
    if (estimateFoldersById.has(estimateFolderId)) continue;
    estimateFoldersById.set(estimateFolderId, {
      id: estimateFolderId,
      name: row.estimate_nodes?.estimates?.name?.trim() || "Estimate Sheet",
    });
  }
  const estimateFolders = [...estimateFoldersById.values()].sort((left, right) => left.name.localeCompare(right.name));
  const projectFolders = [
    {
      id: projectFolderId,
      workspace_id: project.workspace_id,
      parent_id: null,
      name: project.name || "Project",
      sort_order: -100,
      source_category_node_id: null,
      folder_kind: "custom" as const,
    },
    ...estimateFolders.map((folder, index) => ({
      id: folder.id,
      workspace_id: project.workspace_id,
      parent_id: projectFolderId,
      name: folder.name,
      sort_order: -90 + index,
      source_category_node_id: null,
      folder_kind: "custom" as const,
    })),
  ];
  const projectFolderIds = new Set(projectFolders.map((folder) => folder.id));

  return {
    ...library,
    libraryFolders: [
      ...projectFolders,
      ...library.libraryFolders.filter((folder) => !projectFolderIds.has(folder.id)),
    ],
    libraryItems: [...projectItems, ...library.libraryItems],
  };
}
