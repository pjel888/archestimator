import { classifyEstimateRowSource, getProjectComponentIdentity, isExpressComponentProjectFolderEnabled, readEstimateRowMetadata, readProjectComponentProjectionMetadata, withProjectComponentProjectionMetadata } from "@/lib/estimates/express-components";
import { sanitizeEstimateRowSourceSnapshot } from "@/lib/estimates/image-url";
import { readEstimateRowPriceOptionsSnapshot } from "@/lib/estimates/source-snapshot-price-options";
import { canAccessWholeProjectInD1 } from "@/lib/authz/d1-access";
import { requireCurrentUserContext } from "@/lib/auth/session";
import { getCloudflareD1Database, type D1DatabaseLike, type D1Value } from "@/lib/cloudflare/d1";
import {
  SIDEBAR_COMPONENT_LIBRARY_MAX_LIMIT,
  fallbackComponentRowsLibraryDataset,
  getCurrentWorkspaceComponentRowsLibrary,
  type ComponentRowsLibraryDataset,
} from "@/lib/repositories/component-library-repository";
import { getCurrentWorkspaceProject } from "@/lib/repositories/workspace-repository";
import type { EstimateRowItem } from "@/lib/estimates/types";
import type { Json } from "@/lib/types/json";

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
  adjustment_percentage?: number | string | null;
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
  updated_at: string;
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

type ProjectComponentProjectionD1Row = {
  id: string;
  material: string | null;
  description: string | null;
  supplier: string | null;
  supplier_id: string | null;
  unit: string | null;
  unit_cost: number | string | null;
  quantity: number | string | null;
  quantity_base: number | string | null;
  quantity_contingency_amount: number | string | null;
  contingency_percentage: number | string | null;
  adjustment_percentage: number | string | null;
  misc_cost: number | string | null;
  row_revision: number | null;
  category_node_id: string | null;
  discipline: string | null;
  designation: string | null;
  source_library_item_id: string | null;
  link_state: EstimateRowItem["linkState"] | null;
  source_snapshot_json: string | null;
  metadata_json: string | null;
  created_at: string | null;
  updated_at: string | null;
  node_id: string | null;
  node_name: string | null;
  estimate_id: string | null;
  estimate_name: string | null;
  estimate_project_id: string | null;
};

function readRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function readJsonRecord(value: unknown): Record<string, unknown> {
  if (typeof value === "string") {
    try {
      return readRecord(JSON.parse(value));
    } catch {
      return {};
    }
  }

  return readRecord(value);
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

function fromD1ProjectComponentRow(row: ProjectComponentProjectionD1Row): ProjectComponentProjectionRow {
  return {
    id: row.id,
    material: row.material ?? "",
    description: row.description ?? "",
    supplier: row.supplier ?? "",
    supplier_id: row.supplier_id,
    unit: row.unit ?? "",
    unit_cost: row.unit_cost ?? 0,
    quantity: row.quantity ?? 0,
    quantity_base: row.quantity_base,
    quantity_contingency_amount: row.quantity_contingency_amount,
    contingency_percentage: row.contingency_percentage,
    adjustment_percentage: row.adjustment_percentage,
    misc_cost: row.misc_cost ?? 0,
    row_revision: row.row_revision,
    category_node_id: row.category_node_id,
    discipline: row.discipline,
    designation: row.designation,
    source_library_item_id: row.source_library_item_id,
    link_state: row.link_state,
    source_snapshot: readJsonRecord(row.source_snapshot_json),
    metadata: readJsonRecord(row.metadata_json),
    created_at: row.created_at ?? new Date(0).toISOString(),
    updated_at: row.updated_at ?? row.created_at ?? new Date(0).toISOString(),
    estimate_nodes: row.node_id
      ? {
          id: row.node_id,
          name: row.node_name ?? "",
          estimates: row.estimate_id
            ? {
                id: row.estimate_id,
                name: row.estimate_name ?? "",
                project_id: row.estimate_project_id ?? "",
              }
            : null,
        }
      : null,
  };
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
  const componentId = getProjectComponentIdentity(metadata, row.id, sourceSnapshot) ?? row.id;
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
  const legacyAdjustmentPercentage = quantityBase === null ? readNumber(row.contingency_percentage ?? 0) : 0;
  const contingencyPercentage = quantityBase === null
    ? 0
    : quantityBase > 0 ? ((quantityContingencyAmount ?? 0) / quantityBase) * 100 : 0;
  const miscCost = readNumber(row.misc_cost);
  const subTotal = itemCost * quantity;
  const contingencyValue = 0;
  const adjustmentPercentage = row.adjustment_percentage === undefined ? legacyAdjustmentPercentage : readNumber(row.adjustment_percentage ?? 0);
  const adjustmentValue = (subTotal * adjustmentPercentage) / 100;
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
    id: componentId,
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
    adjustmentPercentage,
    adjustmentValue,
    miscCost,
    totalItemCosts: subTotal + contingencyValue + adjustmentValue + miscCost,
    rowRevision: row.row_revision ?? undefined,
    category,
    categoryNodeId: categoryNodeId ?? undefined,
    discipline: row.discipline ?? undefined,
    designation: row.designation ?? undefined,
    tags: ["project-component", projectionClassification, estimateName, nodeName].filter((tag): tag is string => Boolean(tag)),
    imageUrl: typeof sourceSnapshot.imageUrl === "string" ? sourceSnapshot.imageUrl : undefined,
    sourceLibraryItemId: row.source_library_item_id,
    metadata: withProjectComponentProjectionMetadata(metadata, {
      componentId,
      projectId,
      projectName: projectName ?? null,
      estimateId: estimateId ?? null,
      estimateName: estimateName ?? null,
      nodeId: nodeId ?? null,
      nodeName: nodeName ?? null,
      sourceRowId: row.id,
      instanceRowIds: [row.id],
      instanceCount: 1,
      classification: projectionClassification,
      ...(Object.keys(imageAsset).length > 0 ? { imageAsset: imageAsset as Json } : {}),
    }),
    linkState: row.link_state ?? "unlinked",
    libraryFolderId: projectFolderId,
    componentVersionId: typeof sourceSnapshot.componentVersionId === "string" ? sourceSnapshot.componentVersionId : undefined,
    componentVersionNumber: typeof sourceSnapshot.componentVersionNumber === "number" ? sourceSnapshot.componentVersionNumber : undefined,
    priceOptionId: typeof sourceSnapshot.priceOptionId === "string" ? sourceSnapshot.priceOptionId : undefined,
    priceOptionLabel: typeof sourceSnapshot.priceOptionLabel === "string" ? sourceSnapshot.priceOptionLabel : undefined,
    priceOptions: readEstimateRowPriceOptionsSnapshot(sourceSnapshot.priceOptions),
    lifecycleState: typeof sourceSnapshot.lifecycleState === "string" ? sourceSnapshot.lifecycleState as EstimateRowItem["lifecycleState"] : undefined,
    sourceUrl: typeof sourceSnapshot.sourceUrl === "string" ? sourceSnapshot.sourceUrl : undefined,
    pricingSource: typeof sourceSnapshot.pricingSource === "string" ? sourceSnapshot.pricingSource : "Project estimate row",
    pricingDate: typeof sourceSnapshot.pricingDate === "string" ? sourceSnapshot.pricingDate : "",
  };
}

function mergeProjectComponentProjectionItems(entries: Array<{ row: ProjectComponentProjectionRow; item: EstimateRowItem }>) {
  const groups = new Map<string, Array<{ row: ProjectComponentProjectionRow; item: EstimateRowItem }>>();
  for (const entry of entries) {
    const componentId = getProjectComponentIdentity(entry.item.metadata, entry.item.id) ?? entry.item.id;
    const group = groups.get(componentId);
    if (group) group.push(entry);
    else groups.set(componentId, [entry]);
  }

  return [...groups.entries()].map(([componentId, group]) => {
    const [primary] = group;
    const instanceRowIds = group.map(({ row }) => row.id);
    const projection = readProjectComponentProjectionMetadata(primary.item.metadata);
    return {
      ...primary.item,
      id: componentId,
      metadata: withProjectComponentProjectionMetadata(primary.item.metadata, {
        ...(projection ?? {}),
        componentId,
        sourceRowId: projection?.sourceRowId ?? primary.row.id,
        instanceRowIds,
        instanceCount: instanceRowIds.length,
      }),
    };
  });
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

  const database = await requireProjectComponentProjectionD1Database();
  const currentUser = await requireCurrentUserContext();
  const canAccessWholeProject = await canAccessWholeProjectInD1(database, project.id, currentUser);
  if (!canAccessWholeProject) return library;
  const canReadRestrictedEstimates = currentUser.role === "ceo" || currentUser.role === "admin";

  const projectRowLimit = normalizeProjectComponentRowLimit(options.projectRowLimit);
  const projectRows = await all<ProjectComponentProjectionD1Row>(
    database,
    `SELECT
       row_items.id,
       row_items.material,
       row_items.description,
       row_items.supplier,
       row_items.supplier_id,
       row_items.unit,
       row_items.unit_cost,
       row_items.quantity,
       row_items.quantity_base,
       row_items.quantity_contingency_amount,
       row_items.contingency_percentage,
       row_items.adjustment_percentage,
       row_items.misc_cost,
       row_items.row_revision,
       row_items.category_node_id,
       row_items.discipline,
       row_items.designation,
       row_items.source_library_item_id,
       row_items.link_state,
       row_items.source_snapshot_json,
       row_items.metadata_json,
       row_items.created_at,
       row_items.updated_at,
       nodes.id AS node_id,
       nodes.name AS node_name,
       estimates.id AS estimate_id,
       estimates.name AS estimate_name,
       estimates.project_id AS estimate_project_id
     FROM estimate_row_items row_items
     LEFT JOIN estimate_nodes nodes ON nodes.id = row_items.node_id
     INNER JOIN estimates ON estimates.id = row_items.estimate_id
     LEFT JOIN estimate_sheet_access_settings access ON access.estimate_id = estimates.id
     WHERE estimates.project_id = ?
       AND (
         ? = 1
         OR COALESCE(access.inherit_project_access, 1) = 1
         OR EXISTS (
           SELECT 1
           FROM estimate_sheet_members sheet_member
           WHERE sheet_member.estimate_id = estimates.id
             AND sheet_member.user_id = ?
         )
       )
     ORDER BY row_items.updated_at DESC, row_items.created_at DESC, row_items.id DESC
     LIMIT ?`,
    [project.id, canReadRestrictedEstimates ? 1 : 0, currentUser.userId, projectRowLimit ?? SIDEBAR_COMPONENT_LIBRARY_MAX_LIMIT],
  );

  const projectedRows = projectRows
    .map(fromD1ProjectComponentRow)
    .map((row) => ({ row, item: projectEstimateRowToLibraryItem(row, project.id, project.name) }))
    .filter((entry): entry is { row: ProjectComponentProjectionRow; item: EstimateRowItem } => Boolean(entry.item));
  const projectItems = mergeProjectComponentProjectionItems(projectedRows);

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

async function requireProjectComponentProjectionD1Database() {
  const database = await getCloudflareD1Database();
  if (!database) {
    throw new Error("Cloudflare D1 ARCH_DB binding is required for project component projections.");
  }
  return database;
}

async function all<T>(database: D1DatabaseLike, sql: string, values: D1Value[] = []) {
  const result = await database.prepare<T>(sql).bind(...values).all<T>();
  if (result.success === false) throw new Error("Cloudflare D1 project component projection read failed.");
  return result.results ?? [];
}
