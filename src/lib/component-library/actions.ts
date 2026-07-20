"use server";

import { createHash, randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";

import { requireCurrentUserContext } from "@/lib/auth/session";
import { canEditEstimateInD1, isWorkspaceEditorInD1, isWorkspaceMemberInD1 } from "@/lib/authz/d1-access";
import { getCloudflareD1Database, type D1DatabaseLike, type D1Result, type D1Value } from "@/lib/cloudflare/d1";
import {
  buildRejectedPreviewResult,
  coerceBulkExecutionResult,
  coerceBulkPreviewResult,
  normalizeBulkActionIds,
  type BulkActionExecutionResult,
  type BulkActionPreviewResult,
} from "@/lib/mass-deletion/bulk-action";
import {
  SIDEBAR_COMPONENT_LIBRARY_DEFAULT_LIMIT,
  buildEstimateTemplatesFromRows,
  getCurrentWorkspaceComponentLibrary,
  getCurrentWorkspaceComponentLibraryLite,
  getCurrentWorkspaceComponentRowDetail,
  getCurrentWorkspaceComponentRowsLibrary,
  getCurrentWorkspaceEstimateTemplates,
  type ComponentLibraryDataset,
  type ComponentRowsLibraryDataset,
} from "@/lib/repositories/component-library-repository";
import { getProjectComponentRowsLibrary } from "@/lib/component-library/project-component-projection";
import type { EstimateTemplate } from "@/lib/component-library/estimate-templates";
import type { EstimateRowItem } from "@/lib/estimates/types";
import type { EstimateRowItemPatch } from "@/lib/estimates/estimate-row-tree-patch";
import {
  ensureDefaultWorkspace,
  listCurrentWorkspaceProjects,
  listProjectEstimateSheets,
} from "@/lib/repositories/workspace-repository";
import { normalizeEstimateTreeNodeKind } from "@/lib/estimates/tree-hierarchy";
import { isUuid } from "@/lib/ids";
import {
  loadComponentLibraryUserPreferencesFromCloudflareD1,
  recordComponentLibraryTelemetryEventInCloudflareD1,
  saveComponentLibraryUserPreferencesInCloudflareD1,
} from "@/lib/component-library/d1-store";
import {
  LIBRARY_FOLDER_SORT_ORDER_STEP,
  getLibraryFolderCreateSortOrder,
  type LibraryFolderCreatePlacement,
} from "./library-folder-reorder";
import {
  assertQuickAddComponentInput,
  normalizeQuickAddText,
  type QuickAddField,
  QUICK_ADD_TEXT_LIMITS,
  roundQuickAddMoney,
  validateQuickAddComponentInput,
} from "./quick-add-validation";
import { recordLibraryEvent, sanitizeLibraryTelemetryRecord, type LibraryTelemetryRecord } from "./library-telemetry";
import { readComponentSourceUrlInput } from "./source-url";

type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];
type CurrentUserForD1 = Awaited<ReturnType<typeof requireCurrentUserContext>>;
type EstimateTemplateBuildInput = Parameters<typeof buildEstimateTemplatesFromRows>[0];
type EstimateTemplateTableRow = EstimateTemplateBuildInput["templates"][number];
type EstimateTemplateNodeTableRow = EstimateTemplateBuildInput["nodes"][number];
type EstimateTemplateRowItemTableRow = EstimateTemplateBuildInput["rowItems"][number];

type LibraryFolderRow = {
  id: string;
  workspace_id: string;
  parent_id: string | null;
  name: string;
  sort_order: number;
  source_category_node_id: string | null;
  folder_kind: "taxonomy" | "custom";
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

type ComponentItemD1Row = {
  id: string;
  workspace_id: string;
  name: string;
  unit: string;
  unit_cost: number | string | null;
  misc_cost: number | string | null;
  current_version_number: number | string | null;
  active_price_option_id: string | null;
  pricing_source: string | null;
  pricing_date: string | null;
  thumbnail_path: string | null;
  metadata_json: string | null;
  lifecycle_state: ComponentLifecycleState | string;
  updated_at: string;
};

type LibraryPriceOptionProjectionD1Row = {
  id: string;
  label: string;
  unit: string;
  unit_cost: number | string | null;
  misc_cost: number | string | null;
  currency: string;
  is_active: number | boolean;
  is_default: number | boolean;
  pricing_source: string | null;
  metadata_json: string | null;
  updated_at: string;
};

export type LibraryComponentInstanceSyncResult = {
  affectedEstimates: Array<{ projectId: string; estimateId: string }>;
  rowRevisions: Record<string, number>;
  rowPatches: Record<string, EstimateRowItemPatch>;
  updatedRowCount: number;
};

export type CostLibraryComponentEditorDetail = {
  component: EstimateRowItem;
  expectedComponentImpactFingerprint: string;
  optionUsageCounts: Record<string, number>;
};

function nowIso() {
  return new Date().toISOString();
}

function placeholders(values: readonly unknown[]) {
  return values.map(() => "?").join(", ");
}

function jsonText(value: unknown, fallback: Record<string, unknown> | unknown[] = {}) {
  return JSON.stringify(value ?? fallback);
}

function readJsonValue(value: unknown, fallback: Json = {}) {
  if (typeof value === "string") {
    try {
      return readJsonValue(JSON.parse(value) as unknown, fallback);
    } catch {
      return fallback;
    }
  }
  if (value === null || typeof value === "string" || typeof value === "number" || typeof value === "boolean") return value as Json;
  if (Array.isArray(value)) return value as Json;
  return value && typeof value === "object" ? value as Json : fallback;
}

function readJsonRecord(value: unknown): Record<string, Json | undefined> {
  const parsed = readJsonValue(value, {});
  return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed as Record<string, Json | undefined> : {};
}

function boolInt(value: boolean | undefined) {
  return value === true ? 1 : 0;
}

function numberValue(value: unknown, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

async function requireComponentLibraryActionsD1Database() {
  const database = await getCloudflareD1Database();
  if (!database) throw new Error("Cloudflare D1 ARCH_DB binding is required for component library actions.");
  return database;
}

async function first<T>(database: D1DatabaseLike, sql: string, values: D1Value[] = []) {
  return database.prepare<T>(sql).bind(...values).first<T>();
}

async function all<T>(database: D1DatabaseLike, sql: string, values: D1Value[] = []) {
  const result = await database.prepare<T>(sql).bind(...values).all<T>();
  if (result.success === false) throw new Error("Cloudflare D1 component library read failed.");
  return result.results ?? [];
}

async function run<T = Record<string, unknown>>(database: D1DatabaseLike, sql: string, values: D1Value[] = []) {
  const result = await database.prepare<T>(sql).bind(...values).run();
  if (result.success === false) throw new Error("Cloudflare D1 component library write failed.");
  return result;
}

async function runBatch(database: D1DatabaseLike, statements: Array<{ sql: string; values?: D1Value[] }>) {
  if (statements.length === 0) return;
  if (database.batch) {
    const results = await database.batch(
      statements.map((statement) => database.prepare(statement.sql).bind(...(statement.values ?? []))),
    );
    if (results.some((result) => result.success === false)) {
      throw new Error("Cloudflare D1 component library batch failed.");
    }
    return;
  }
  for (const statement of statements) await run(database, statement.sql, statement.values ?? []);
}

async function runAtomicBatch(
  database: D1DatabaseLike,
  statements: Array<{ sql: string; values?: D1Value[] }>,
): Promise<D1Result[]> {
  if (!database.batch) throw new Error("Cloudflare D1 atomic batch support is required for component updates.");
  const results = await database.batch(
    statements.map((statement) => database.prepare(statement.sql).bind(...(statement.values ?? []))),
  );
  if (results.some((result) => result.success === false)) throw new Error("Cloudflare D1 component update batch failed.");
  return results;
}

// U11 (DATA-2/DATA-3): one place to revalidate every server-rendered surface that
// shows templates — the library browse route AND the library overview (counts) —
// so a template mutation on any surface refreshes them all. Module-local (this is
// a "use server" file: only async exports may be server actions).
function revalidateTemplateSurfaces() {
  revalidatePath("/workshop/library");
  revalidatePath("/workshop/library/templates");
}

export type ComponentLifecycleState = "draft" | "in_production" | "available" | "discontinued" | "archived";

export type ComponentPriceOptionInput = {
  id?: string;
  label: string;
  sku?: string | null;
  variantDescription?: string;
  variantSortOrder?: number;
  unit: string;
  unitCost: number;
  miscCost?: number;
  currency?: string;
  pricingSource?: string;
  pricingDate?: string;
  sourceUrl?: string;
  notes?: string;
  supplierId?: string | null;
  activeCostEntryId?: string | null;
  costEntries?: ComponentVariantCostEntryInput[];
  packageQuantity?: number | null;
  packageUnit?: string | null;
  dimensionLength?: number | null;
  dimensionWidth?: number | null;
  dimensionHeight?: number | null;
  dimensionUnit?: string | null;
  mass?: number | null;
  massUnit?: string | null;
  imageBucket?: string | null;
  imagePath?: string | null;
  thumbnailPath?: string | null;
  imageMetadata?: Json;
  attachments?: ComponentVariantAttachmentInput[];
  variantMetadata?: Json;
  isDefault?: boolean;
  isActive?: boolean;
  changeReason?: string;
  effectiveAt?: string;
};

export type ComponentVariantCostEntryInput = {
  id?: string;
  clientId?: string;
  unitCost: number;
  miscCost?: number;
  currency?: string;
  pricingSource?: string;
  pricingDate?: string;
  sourceUrl?: string;
  notes?: string;
  isCurrent?: boolean;
  deletedAt?: string | null;
};

export type ComponentVariantAttachmentInput = {
  id?: string;
  assetId?: string | null;
  bucket: string;
  path: string;
  fileName: string;
  contentType: string;
  sizeBytes: number;
  kind?: "pdf" | "excel";
  scanStatus?: string | null;
  metadata?: Json;
};

export type CostLibraryComponentInput = {
  id?: string;
  name: string;
  description?: string;
  category?: string;
  categoryNodeId?: string | null;
  supplier?: string | null;
  supplierId?: string | null;
  brand?: string | null;
  brandId?: string | null;
  unit: string;
  unitCost?: number;
  miscCost?: number;
  pricingSource?: string | null;
  pricingDate?: string | null;
  thumbnailPath?: string | null;
  libraryFolderId?: string | null;
  lifecycleState?: ComponentLifecycleState;
  effectiveAt?: string;
  changeReason?: string;
  metadata?: Json;
};

export type CreateCostLibraryComponentInput = CostLibraryComponentInput & {
  priceOptions: ComponentPriceOptionInput[];
};

export type UpdateCostLibraryComponentWithPriceOptionsInput = CreateCostLibraryComponentInput & {
  expectedUpdatedAt: string;
  expectedVersionNumber: number;
  expectedComponentImpactFingerprint: string;
  removedPriceOptionReplacements?: Record<string, string>;
};

export type SaveCostLibraryComponentDraftInput = {
  title?: string | null;
  draft: unknown;
};

export type SaveCostLibraryComponentDraftResult = {
  draftId: string;
  savedAt: string;
};

export type LibraryFolderActionResult = {
  folder: LibraryFolderRow;
};

export type CreateLibraryFolderOptions = {
  placement?: LibraryFolderCreatePlacement;
};

export type ReorderLibraryFoldersInput = {
  updates: Array<{
    id: string;
    parentId: string | null;
    sortOrder: number;
  }>;
};

export type MoveCostLibraryComponentToFolderInput = {
  itemId: string;
  libraryFolderId: string | null;
};

export type BulkArchiveLibraryComponentsInput = {
  itemIds: string[];
};

export type ExecuteBulkArchiveLibraryComponentsInput = BulkArchiveLibraryComponentsInput & {
  expectedPreviewHash: string;
  correlationId?: string;
};

export type BulkDeleteLibraryComponentsInput = {
  itemIds: string[];
};

export type ExecuteBulkDeleteLibraryComponentsInput = BulkDeleteLibraryComponentsInput & {
  expectedPreviewHash: string;
  correlationId?: string;
};

function revalidateLibraryRoutes() {
  revalidatePath("/workshop/library");
  revalidatePath("/workshop/library/components");
}

function readBoolean(value: unknown) {
  return value === true || value === 1 || value === "1";
}

type LinkedEstimateRowTarget = {
  row_id: string;
  row_revision: number | string;
  project_id: string;
  estimate_id: string;
  link_state: string | null;
  selected_price_option_id: string | null;
  source_snapshot_json: string | null;
  metadata_json: string | null;
};

type ComponentPriceOptionImpactRow = {
  id: string;
  updated_at: string;
  is_active: number | boolean;
  is_default: number | boolean;
};

type LibraryComponentSyncOption = {
  id: string;
  label: string;
  variantDescription: string;
  sku: string | null;
  unit: string;
  unitCost: number;
  miscCost: number;
  currency: string;
  pricingSource: string | null;
  pricingDate: string | null;
  sourceUrl: string | null;
  thumbnailPath: string | null;
  isActive: boolean;
  isDefault: boolean;
  snapshot: Record<string, Json | undefined>;
};

type LinkedEstimateRowSyncPlan = {
  rowId: string;
  expectedRowRevision: number;
  projectId: string;
  estimateId: string;
  isOverridden: boolean;
  material: string;
  description: string;
  supplier: string | null;
  supplierId: string | null;
  unit: string;
  unitCost: number;
  categoryNodeId: string | null;
  sourceSnapshot: Record<string, Json | undefined>;
  metadata: Record<string, Json | undefined>;
  patch: EstimateRowItemPatch;
};

const STALE_COMPONENT_IMPACT_ERROR = "Component usage changed while this edit was open. Review the latest impact and try again.";

function buildLinkedEstimateRowsRevisionFingerprint(
  rows: LinkedEstimateRowTarget[],
  priceOptions: ComponentPriceOptionImpactRow[],
) {
  const rowFingerprint = [...rows]
    .sort((left, right) => left.row_id.localeCompare(right.row_id))
    .map((row) => [
      row.row_id,
      numberValue(row.row_revision, 1),
      row.link_state ?? "linked-clean",
      row.selected_price_option_id ?? "",
    ].join(":"))
    .join("|");
  const optionFingerprint = [...priceOptions]
    .sort((left, right) => left.id.localeCompare(right.id))
    .map((option) => [
      option.id,
      option.updated_at,
      boolInt(readBoolean(option.is_active)),
      boolInt(readBoolean(option.is_default)),
    ].join(":"))
    .join("|");
  return `rows[${rowFingerprint}]|options[${optionFingerprint}]`;
}

async function listLinkedEstimateRowTargets(database: D1DatabaseLike, workspaceId: string, itemId: string) {
  return all<LinkedEstimateRowTarget>(
    database,
    `
      SELECT
        row_item.id AS row_id,
        row_item.row_revision,
        project.id AS project_id,
        estimate.id AS estimate_id,
        row_item.link_state,
        COALESCE(
          NULLIF(json_extract(row_item.source_snapshot_json, '$.priceOptionId'), ''),
          NULLIF(json_extract(row_item.metadata_json, '$.priceOptionId'), '')
        ) AS selected_price_option_id,
        row_item.source_snapshot_json,
        row_item.metadata_json
      FROM estimate_row_items row_item
      INNER JOIN estimates estimate ON estimate.id = row_item.estimate_id
      INNER JOIN projects project ON project.id = estimate.project_id
      WHERE project.workspace_id = ?
        AND row_item.source_library_item_id = ?
        AND (row_item.link_state IS NULL OR row_item.link_state NOT IN ('detached', 'unlinked'))
      ORDER BY row_item.id
    `,
    [workspaceId, itemId],
  );
}

async function listComponentPriceOptionImpactRows(database: D1DatabaseLike, workspaceId: string, itemId: string) {
  return all<ComponentPriceOptionImpactRow>(
    database,
    `
      SELECT id, updated_at, is_active, is_default
      FROM cost_library_item_price_options
      WHERE workspace_id = ?
        AND item_id = ?
      ORDER BY id
    `,
    [workspaceId, itemId],
  );
}

function buildLinkedEstimateRowsRevisionGuardStatement(input: {
  workspaceId: string;
  itemId: string;
  expectedFingerprint: string;
}) {
  return {
    sql: `
      SELECT CASE WHEN (
        'rows[' || COALESCE((
        SELECT GROUP_CONCAT(component_revision, '|')
        FROM (
          SELECT
            row_item.id || ':' ||
            CAST(row_item.row_revision AS TEXT) || ':' ||
            COALESCE(row_item.link_state, 'linked-clean') || ':' ||
            COALESCE(
              NULLIF(json_extract(row_item.source_snapshot_json, '$.priceOptionId'), ''),
              NULLIF(json_extract(row_item.metadata_json, '$.priceOptionId'), ''),
              ''
            ) AS component_revision
          FROM estimate_row_items row_item
          INNER JOIN estimates estimate ON estimate.id = row_item.estimate_id
          INNER JOIN projects project ON project.id = estimate.project_id
          WHERE project.workspace_id = ?
            AND row_item.source_library_item_id = ?
            AND (row_item.link_state IS NULL OR row_item.link_state NOT IN ('detached', 'unlinked'))
          ORDER BY row_item.id
        )
      ), '') || ']|options[' || COALESCE((
        SELECT GROUP_CONCAT(option_revision, '|')
        FROM (
          SELECT
            option_row.id || ':' || option_row.updated_at || ':' ||
            CAST(option_row.is_active AS TEXT) || ':' || CAST(option_row.is_default AS TEXT) AS option_revision
          FROM cost_library_item_price_options option_row
          WHERE option_row.workspace_id = ?
            AND option_row.item_id = ?
          ORDER BY option_row.id
        )
      ), '') || ']'
      ) = ? THEN 1 ELSE json('') END AS component_impact_guard
    `,
    values: [
      input.workspaceId,
      input.itemId,
      input.workspaceId,
      input.itemId,
      input.expectedFingerprint,
    ] as D1Value[],
  };
}

function buildLinkedEstimateRowsSyncStatement(input: {
  workspaceId: string;
  itemId: string;
  rowPlans: LinkedEstimateRowSyncPlan[];
  updatedAt: string;
}) {
  const serializedPlans = input.rowPlans.map((plan) => ({
    rowId: plan.rowId,
    expectedRowRevision: plan.expectedRowRevision,
    isOverridden: plan.isOverridden,
    material: plan.material,
    description: plan.description,
    supplier: plan.supplier,
    supplierId: plan.supplierId,
    unit: plan.unit,
    unitCost: plan.unitCost,
    categoryNodeId: plan.categoryNodeId,
    sourceSnapshot: plan.sourceSnapshot,
    metadata: plan.metadata,
  }));
  return {
    sql: `
      WITH sync_rows AS (
        SELECT value AS sync_row
        FROM json_each(?)
      )
      UPDATE estimate_row_items
      SET material = CASE
            WHEN json_extract((SELECT sync_row FROM sync_rows WHERE json_extract(sync_row, '$.rowId') = estimate_row_items.id), '$.isOverridden') = 1 THEN material
            ELSE json_extract((SELECT sync_row FROM sync_rows WHERE json_extract(sync_row, '$.rowId') = estimate_row_items.id), '$.material')
          END,
          description = CASE
            WHEN json_extract((SELECT sync_row FROM sync_rows WHERE json_extract(sync_row, '$.rowId') = estimate_row_items.id), '$.isOverridden') = 1 THEN description
            ELSE json_extract((SELECT sync_row FROM sync_rows WHERE json_extract(sync_row, '$.rowId') = estimate_row_items.id), '$.description')
          END,
          supplier = CASE
            WHEN json_extract((SELECT sync_row FROM sync_rows WHERE json_extract(sync_row, '$.rowId') = estimate_row_items.id), '$.isOverridden') = 1 THEN supplier
            ELSE json_extract((SELECT sync_row FROM sync_rows WHERE json_extract(sync_row, '$.rowId') = estimate_row_items.id), '$.supplier')
          END,
          supplier_id = CASE
            WHEN json_extract((SELECT sync_row FROM sync_rows WHERE json_extract(sync_row, '$.rowId') = estimate_row_items.id), '$.isOverridden') = 1 THEN supplier_id
            ELSE json_extract((SELECT sync_row FROM sync_rows WHERE json_extract(sync_row, '$.rowId') = estimate_row_items.id), '$.supplierId')
          END,
          unit = CASE
            WHEN json_extract((SELECT sync_row FROM sync_rows WHERE json_extract(sync_row, '$.rowId') = estimate_row_items.id), '$.isOverridden') = 1 THEN unit
            ELSE json_extract((SELECT sync_row FROM sync_rows WHERE json_extract(sync_row, '$.rowId') = estimate_row_items.id), '$.unit')
          END,
          unit_cost = CASE
            WHEN json_extract((SELECT sync_row FROM sync_rows WHERE json_extract(sync_row, '$.rowId') = estimate_row_items.id), '$.isOverridden') = 1 THEN unit_cost
            ELSE json_extract((SELECT sync_row FROM sync_rows WHERE json_extract(sync_row, '$.rowId') = estimate_row_items.id), '$.unitCost')
          END,
          category_node_id = CASE
            WHEN json_extract((SELECT sync_row FROM sync_rows WHERE json_extract(sync_row, '$.rowId') = estimate_row_items.id), '$.isOverridden') = 1 THEN category_node_id
            ELSE json_extract((SELECT sync_row FROM sync_rows WHERE json_extract(sync_row, '$.rowId') = estimate_row_items.id), '$.categoryNodeId')
          END,
          source_snapshot_json = json_extract(
            (SELECT sync_row FROM sync_rows WHERE json_extract(sync_row, '$.rowId') = estimate_row_items.id),
            '$.sourceSnapshot'
          ),
          metadata_json = json_extract(
            (SELECT sync_row FROM sync_rows WHERE json_extract(sync_row, '$.rowId') = estimate_row_items.id),
            '$.metadata'
          ),
          row_revision = row_revision + 1,
          updated_at = ?
      WHERE source_library_item_id = ?
        AND (link_state IS NULL OR link_state IN ('linked-clean', 'linked-overridden'))
        AND EXISTS (
          SELECT 1
          FROM sync_rows
          WHERE json_extract(sync_row, '$.rowId') = estimate_row_items.id
            AND json_extract(sync_row, '$.expectedRowRevision') = estimate_row_items.row_revision
        )
        AND estimate_id IN (
          SELECT estimate.id
          FROM estimates estimate
          INNER JOIN projects project ON project.id = estimate.project_id
          WHERE project.workspace_id = ?
        )
      RETURNING id, row_revision
    `,
    values: [
      jsonText(serializedPlans, []),
      input.updatedAt,
      input.itemId,
      input.workspaceId,
    ] as D1Value[],
  };
}

function buildLibraryComponentSyncOption(input: {
  id: string;
  label: string;
  unit: string;
  unitCost: number;
  miscCost: number;
  currency: string;
  isActive: boolean;
  isDefault: boolean;
  pricingSource: string | null;
  pricingDate: string | null;
  thumbnailPath: string | null;
  snapshot: Record<string, unknown>;
}): LibraryComponentSyncOption {
  const snapshot = readJsonRecord(input.snapshot);
  const rowSafeSnapshot = { ...snapshot };
  delete rowSafeSnapshot.attachments;
  delete rowSafeSnapshot.imageBucket;
  delete rowSafeSnapshot.imageMetadata;
  delete rowSafeSnapshot.imagePath;
  return {
    id: input.id,
    label: input.label,
    variantDescription: typeof snapshot.variantDescription === "string" ? snapshot.variantDescription : "",
    sku: typeof snapshot.sku === "string" ? snapshot.sku : null,
    unit: input.unit,
    unitCost: input.unitCost,
    miscCost: input.miscCost,
    currency: input.currency,
    pricingSource: input.pricingSource,
    pricingDate: input.pricingDate,
    sourceUrl: typeof snapshot.sourceUrl === "string" ? snapshot.sourceUrl : null,
    thumbnailPath: input.thumbnailPath,
    isActive: input.isActive,
    isDefault: input.isDefault,
    snapshot: { ...rowSafeSnapshot, id: input.id },
  };
}

function buildLinkedEstimateRowSyncPlans(input: {
  rows: LinkedEstimateRowTarget[];
  itemId: string;
  material: string;
  componentDescription: string;
  category: string;
  categoryNodeId: string | null;
  brand: string | null;
  brandId: string | null;
  supplier: string | null;
  supplierId: string | null;
  lifecycleState: ComponentLifecycleState;
  componentVersionNumber: number;
  componentThumbnailPath: string | null;
  priceOptions: LibraryComponentSyncOption[];
  defaultPriceOptionId: string;
  removedPriceOptionReplacements?: Record<string, string>;
  updatedAt: string;
}) {
  const activeOptions = input.priceOptions.filter((option) => option.isActive);
  const optionById = new Map(activeOptions.map((option) => [option.id, option]));
  const defaultOption = optionById.get(input.defaultPriceOptionId)
    ?? activeOptions.find((option) => option.isDefault)
    ?? activeOptions[0];
  if (!defaultOption) throw new Error("At least one active component variant is required.");
  const catalogue = activeOptions.map((option) => option.snapshot);
  const plans: LinkedEstimateRowSyncPlan[] = [];

  for (const row of input.rows) {
    if (row.link_state && !["linked-clean", "linked-overridden"].includes(row.link_state)) continue;
    const previousSelectedId = row.selected_price_option_id;
    const replacementId = previousSelectedId
      ? input.removedPriceOptionReplacements?.[previousSelectedId]
      : undefined;
    const selectedOption = (previousSelectedId ? optionById.get(previousSelectedId) : null)
      ?? (replacementId ? optionById.get(replacementId) : null)
      ?? (!previousSelectedId ? defaultOption : null);
    if (!selectedOption) {
      throw new Error(`Variant ${previousSelectedId ?? "selection"} is still used by an estimate row. Choose an explicit replacement before deleting it.`);
    }
    if (replacementId && replacementId === previousSelectedId) {
      throw new Error("A deleted variant must be replaced with a different active variant.");
    }

    const rowDescription = selectedOption.variantDescription || input.componentDescription;
    const imageUrl = selectedOption.thumbnailPath || input.componentThumbnailPath;
    const sourceSnapshotPatch = {
      brand: input.brand,
      brandId: input.brandId,
      category: input.category,
      categoryNodeId: input.categoryNodeId,
      componentDescription: input.componentDescription,
      componentVersionNumber: input.componentVersionNumber,
      description: rowDescription,
      imageUrl,
      lifecycleState: input.lifecycleState,
      material: input.material,
      priceOptionId: selectedOption.id,
      priceOptionLabel: selectedOption.label,
      priceOptions: catalogue,
      pricingDate: selectedOption.pricingDate,
      pricingSource: selectedOption.pricingSource,
      sku: selectedOption.sku,
      sourceComponentId: input.itemId,
      sourceLibraryItemId: input.itemId,
      sourceType: "library_component",
      sourceUpdatedAt: input.updatedAt,
      sourceUrl: selectedOption.sourceUrl,
      supplier: input.supplier,
      supplierId: input.supplierId,
      unit: selectedOption.unit,
      unit_cost: selectedOption.unitCost,
    };
    const metadataPatch = {
      brandId: input.brandId,
      categoryNodeId: input.categoryNodeId,
      componentVersionNumber: input.componentVersionNumber,
      priceOptionId: selectedOption.id,
      sourceComponentId: input.itemId,
      supplierId: input.supplierId,
    };
    const sourceSnapshot = { ...readJsonRecord(row.source_snapshot_json), ...sourceSnapshotPatch };
    const metadata = { ...readJsonRecord(row.metadata_json), ...metadataPatch };
    const isOverridden = row.link_state === "linked-overridden";
    const patch: EstimateRowItemPatch = {
      rowRevision: numberValue(row.row_revision, 1) + 1,
      sourceSnapshot,
      metadata,
      priceOptionId: selectedOption.id,
      priceOptionLabel: selectedOption.label,
      priceOptions: catalogue as EstimateRowItem["priceOptions"],
      componentVersionNumber: input.componentVersionNumber,
      updatedAt: input.updatedAt,
      ...(isOverridden ? {} : {
        material: input.material,
        description: rowDescription,
        brand: input.brand,
        supplier: input.supplier ?? "",
        unit: selectedOption.unit,
        itemCost: selectedOption.unitCost,
        imageUrl,
        sourceUrl: selectedOption.sourceUrl,
        category: input.category,
        categoryNodeId: input.categoryNodeId,
        brandId: input.brandId,
        supplierId: input.supplierId,
        sku: selectedOption.sku,
        pricingDate: selectedOption.pricingDate,
        pricingSource: selectedOption.pricingSource,
        lifecycleState: input.lifecycleState,
      }),
    };
    plans.push({
      rowId: row.row_id,
      expectedRowRevision: numberValue(row.row_revision, 1),
      projectId: row.project_id,
      estimateId: row.estimate_id,
      isOverridden,
      material: input.material,
      description: rowDescription,
      supplier: input.supplier,
      supplierId: input.supplierId,
      unit: selectedOption.unit,
      unitCost: selectedOption.unitCost,
      categoryNodeId: input.categoryNodeId,
      sourceSnapshot,
      metadata,
      patch,
    });
  }
  return plans;
}

function emptyLibraryComponentInstanceSyncResult(): LibraryComponentInstanceSyncResult {
  return { affectedEstimates: [], rowRevisions: {}, rowPatches: {}, updatedRowCount: 0 };
}

function buildLibraryComponentInstanceSyncResult(
  rowPlans: LinkedEstimateRowSyncPlan[],
  result: D1Result<{ id: string; row_revision: number | string }>,
): LibraryComponentInstanceSyncResult {
  const affectedEstimateKeys = new Set<string>();
  const affectedEstimates: LibraryComponentInstanceSyncResult["affectedEstimates"] = [];
  for (const row of rowPlans) {
    const key = `${row.projectId}:${row.estimateId}`;
    if (affectedEstimateKeys.has(key)) continue;
    affectedEstimateKeys.add(key);
    affectedEstimates.push({ projectId: row.projectId, estimateId: row.estimateId });
  }
  const rowRevisions = Object.fromEntries((result.results ?? []).map((row) => [row.id, numberValue(row.row_revision)]));
  return {
    affectedEstimates,
    rowRevisions,
    rowPatches: Object.fromEntries(rowPlans
      .filter((plan) => rowRevisions[plan.rowId] !== undefined)
      .map((plan) => [plan.rowId, { ...plan.patch, rowRevision: rowRevisions[plan.rowId] }])),
    updatedRowCount: result.meta?.changes ?? 0,
  };
}

function revalidateLinkedEstimateRows(rows: LinkedEstimateRowTarget[]) {
  const paths = new Set(rows.map((row) => `/workshop/projects/${row.project_id}/estimates/${row.estimate_id}`));
  for (const path of paths) revalidatePath(path);
}

function readFolderName(name: string) {
  const value = name.trim();
  if (!value) throw new Error("Folder name is required.");
  return value;
}

async function assertCanManageLibraryFolders(
  database: D1DatabaseLike,
  workspaceId: string,
  user: CurrentUserForD1,
  action = "manage_library_folders",
) {
  const allowed = await isWorkspaceEditorInD1(database, workspaceId, user);
  if (!allowed) {
    recordLibraryEvent("authz_denied", { workspaceId, action, role: "viewer" });
    throw new Error("Only workspace editors/admins can manage library folders.");
  }
}

// Library Optimization Plan P3 T17 (F19/D8): app-layer fail-fast guard mirroring
// assertCanManageLibraryFolders, applied to every mutating component/template action so
// a workspace viewer is denied at the app boundary (defense-in-depth on top of the RLS
// editor-write split). The is_workspace_editor RPC returns true for editors/admins.
async function assertCanManageLibrary(
  database: D1DatabaseLike,
  workspaceId: string,
  user: CurrentUserForD1,
  action = "manage_library",
) {
  const allowed = await isWorkspaceEditorInD1(database, workspaceId, user);
  if (!allowed) {
    recordLibraryEvent("authz_denied", { workspaceId, action, role: "viewer" });
    throw new Error("Only workspace editors/admins can manage the library.");
  }
}

async function assertCanEditEstimate(
  database: D1DatabaseLike,
  workspaceId: string,
  estimateId: string,
  user: CurrentUserForD1,
  action = "resolve_estimate_template_insert_target",
) {
  const allowed = await canEditEstimateInD1(database, estimateId, user);
  if (!allowed) {
    recordLibraryEvent("authz_denied", { workspaceId, estimateId, action, role: "viewer" });
    throw new Error("Estimate edit access denied.");
  }
}

async function assertCanPublishEstimateTemplateFromEstimate(
  database: D1DatabaseLike,
  estimateId: string,
  user: CurrentUserForD1,
) {
  const allowed = await canEditEstimateInD1(database, estimateId, user);
  if (!allowed) throw new Error("Estimate edit access is required to save this estimate as a template.");
}

// Library Optimization Plan P3 T19 (F24): a generous per-workspace creation quota so a
// runaway client / abuse cannot create unbounded library rows. Enforced at the app layer
// (a head count, no migration). The caps are far above any legitimate workspace today.
const LIBRARY_COMPONENT_CAP = 10_000;
const LIBRARY_TEMPLATE_CAP = 2_000;
const LIBRARY_COMPONENT_DRAFT_CAP = 100;
const LIBRARY_COMPONENT_DRAFT_RETAIN_BEFORE_INSERT = LIBRARY_COMPONENT_DRAFT_CAP - 1;
const LIBRARY_COMPONENT_DRAFT_JSON_MAX_BYTES = 64 * 1024;

type ComponentLibraryPreferenceTab = "components" | "project" | "templates";
type ComponentLibraryPreferenceViewMode = "default" | "suppliers" | "brand";
type ComponentLibraryPreferenceTreeOrder = Record<ComponentLibraryPreferenceViewMode, Record<string, string[]>>;

export type ComponentLibraryUserPreferences = {
  activeTab: ComponentLibraryPreferenceTab;
  componentViewMode: ComponentLibraryPreferenceViewMode;
  favoriteItemIds: string[];
  recentItemIds: string[];
  treeOrder: ComponentLibraryPreferenceTreeOrder;
  updatedAt?: string | null;
};

export type ComponentLibraryUserPreferencesInput = Partial<{
  activeTab: string | null;
  componentViewMode: string | null;
  favoriteItemIds: unknown;
  recentItemIds: unknown;
  treeOrder: unknown;
}>;

const COMPONENT_LIBRARY_PREFERENCE_TABS = ["components", "project", "templates"] as const;
const COMPONENT_LIBRARY_PREFERENCE_VIEW_MODES = ["default", "suppliers", "brand"] as const;
const EMPTY_COMPONENT_LIBRARY_TREE_ORDER: ComponentLibraryPreferenceTreeOrder = { default: {}, suppliers: {}, brand: {} };
const COMPONENT_LIBRARY_PREFERENCE_ID_PATTERN = /^[a-zA-Z0-9_.:-]{1,160}$/;

function readOptionalTelemetryUuid(value: string | undefined) {
  return value && isUuid(value) ? value : null;
}

function readComponentLibraryPreferenceTab(value: unknown): ComponentLibraryPreferenceTab {
  return COMPONENT_LIBRARY_PREFERENCE_TABS.includes(value as ComponentLibraryPreferenceTab)
    ? value as ComponentLibraryPreferenceTab
    : "components";
}

function readComponentLibraryPreferenceViewMode(value: unknown): ComponentLibraryPreferenceViewMode {
  return COMPONENT_LIBRARY_PREFERENCE_VIEW_MODES.includes(value as ComponentLibraryPreferenceViewMode)
    ? value as ComponentLibraryPreferenceViewMode
    : "default";
}

function readComponentLibraryPreferenceIds(value: unknown, limit: number) {
  if (!Array.isArray(value)) return [];
  const ids: string[] = [];
  const seen = new Set<string>();
  for (const candidate of value) {
    if (ids.length >= limit) break;
    if (typeof candidate !== "string") continue;
    const id = candidate.trim();
    if (!COMPONENT_LIBRARY_PREFERENCE_ID_PATTERN.test(id) || seen.has(id)) continue;
    seen.add(id);
    ids.push(id);
  }
  return ids;
}

function isJsonObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function readComponentLibraryTreeOrder(value: unknown): ComponentLibraryPreferenceTreeOrder {
  if (!isJsonObject(value)) return { ...EMPTY_COMPONENT_LIBRARY_TREE_ORDER };
  const treeOrder: ComponentLibraryPreferenceTreeOrder = { default: {}, suppliers: {}, brand: {} };
  for (const mode of COMPONENT_LIBRARY_PREFERENCE_VIEW_MODES) {
    const modeOrder = value[mode];
    if (!isJsonObject(modeOrder)) continue;
    let parentCount = 0;
    for (const [parentKey, rawIds] of Object.entries(modeOrder)) {
      if (parentCount >= 100) break;
      if (!COMPONENT_LIBRARY_PREFERENCE_ID_PATTERN.test(parentKey)) continue;
      const ids = readComponentLibraryPreferenceIds(rawIds, 200);
      if (ids.length === 0) continue;
      treeOrder[mode][parentKey] = ids;
      parentCount += 1;
    }
  }
  return treeOrder;
}

function normalizeComponentLibraryUserPreferences(input: ComponentLibraryUserPreferencesInput & { updatedAt?: string | null }): ComponentLibraryUserPreferences {
  return {
    activeTab: readComponentLibraryPreferenceTab(input.activeTab),
    componentViewMode: readComponentLibraryPreferenceViewMode(input.componentViewMode),
    favoriteItemIds: readComponentLibraryPreferenceIds(input.favoriteItemIds, 500),
    recentItemIds: readComponentLibraryPreferenceIds(input.recentItemIds, 100),
    treeOrder: readComponentLibraryTreeOrder(input.treeOrder),
    updatedAt: input.updatedAt ?? null,
  };
}

export async function recordComponentLibraryTelemetryEvent(input: LibraryTelemetryRecord) {
  const record = sanitizeLibraryTelemetryRecord(input);
  if (!record) return { ok: false, ignored: true };

  try {
    const user = await requireCurrentUserContext();
    const workspaceId = readOptionalTelemetryUuid(record.workspaceId);
    if (workspaceId) {
      const database = await requireComponentLibraryActionsD1Database();
      const allowed = await isWorkspaceMemberInD1(database, workspaceId, user);
      if (!allowed) return { ok: false, ignored: true };
    }

    const {
      schemaVersion,
      event,
      workspaceId: _workspaceId,
      projectId: _projectId,
      estimateId: _estimateId,
      surface,
      kind,
      resourceKind,
      action,
      reason,
      ...payload
    } = record;
    await recordComponentLibraryTelemetryEventInCloudflareD1({
      actorUserId: user.userId,
      workspaceId,
      projectId: readOptionalTelemetryUuid(record.projectId),
      estimateId: readOptionalTelemetryUuid(record.estimateId),
      eventName: event,
      schemaVersion,
      surface: surface ?? null,
      kind: kind ?? null,
      resourceKind: resourceKind ?? null,
      action: action ?? null,
      reason: reason ?? null,
      payload: payload as Record<string, Json | undefined>,
    });
    return { ok: true };
  } catch {
    return { ok: false, ignored: true };
  }
}

export async function loadComponentLibraryUserPreferences(): Promise<ComponentLibraryUserPreferences | null> {
  try {
    const [{ workspace }, currentUser] = await Promise.all([ensureDefaultWorkspace(), requireCurrentUserContext()]);
    const data = await loadComponentLibraryUserPreferencesFromCloudflareD1({
      userId: currentUser.userId,
      workspaceId: workspace.id,
    });
    if (!data) return null;
    return normalizeComponentLibraryUserPreferences({
      activeTab: data.active_tab,
      componentViewMode: data.component_view_mode,
      favoriteItemIds: data.favorite_item_ids,
      recentItemIds: data.recent_item_ids,
      treeOrder: data.tree_order,
      updatedAt: data.updated_at,
    });
  } catch {
    return null;
  }
}

export async function saveComponentLibraryUserPreferences(input: ComponentLibraryUserPreferencesInput) {
  try {
    const [{ workspace }, currentUser] = await Promise.all([ensureDefaultWorkspace(), requireCurrentUserContext()]);
    const preferences = normalizeComponentLibraryUserPreferences(input);
    await saveComponentLibraryUserPreferencesInCloudflareD1({
      userId: currentUser.userId,
      workspaceId: workspace.id,
      activeTab: preferences.activeTab,
      componentViewMode: preferences.componentViewMode,
      favoriteItemIds: preferences.favoriteItemIds,
      recentItemIds: preferences.recentItemIds,
      treeOrder: preferences.treeOrder,
    });
    return { ok: true };
  } catch {
    return { ok: false, ignored: true };
  }
}

async function assertWithinLibraryQuota(
  database: D1DatabaseLike,
  table: "cost_library_items" | "estimate_templates" | "cost_library_component_drafts",
  workspaceId: string,
  cap: number,
  label: string,
) {
  const row = await first<{ count: number }>(
    database,
    table === "cost_library_component_drafts"
      ? `SELECT COUNT(*) AS count FROM ${table} WHERE workspace_id = ? AND status = 'active'`
      : `SELECT COUNT(*) AS count FROM ${table} WHERE workspace_id = ?`,
    [workspaceId],
  );
  if (Number(row?.count ?? 0) >= cap) {
    throw new Error(`This workspace has reached its ${label} limit (${cap}). Archive or delete some first.`);
  }
}

function readComponentDraftJson(value: unknown) {
  const text = jsonText(value);
  if (new TextEncoder().encode(text).byteLength > LIBRARY_COMPONENT_DRAFT_JSON_MAX_BYTES) {
    throw new Error(`Component drafts must be ${LIBRARY_COMPONENT_DRAFT_JSON_MAX_BYTES} bytes or smaller.`);
  }
  return text;
}

async function discardOlderActiveComponentDraftsBeforeInsert(
  database: D1DatabaseLike,
  workspaceId: string,
  timestamp: string,
) {
  await run(
    database,
    `
      UPDATE cost_library_component_drafts
      SET status = 'discarded',
          discarded_at = COALESCE(discarded_at, ?),
          updated_at = ?
      WHERE workspace_id = ?
        AND status = 'active'
        AND id IN (
          SELECT id
          FROM cost_library_component_drafts
          WHERE workspace_id = ?
            AND status = 'active'
          ORDER BY updated_at DESC, created_at DESC, id DESC
          LIMIT -1 OFFSET ?
        )
    `,
    [timestamp, timestamp, workspaceId, workspaceId, LIBRARY_COMPONENT_DRAFT_RETAIN_BEFORE_INSERT],
  );
}

function readRequiredComponentText(value: string | undefined | null, label: string, maxLength?: number) {
  const text = normalizeQuickAddText(value);
  if (!text) throw new Error(`${label} is required.`);
  if (maxLength && text.length > maxLength) throw new Error(`${label} must use ${maxLength} characters or fewer.`);
  return text;
}

function readOptionalComponentText(value: string | undefined | null, label: string, maxLength: number) {
  const text = normalizeQuickAddText(value);
  if (!text) return null;
  if (text.length > maxLength) throw new Error(`${label} must use ${maxLength} characters or fewer.`);
  return text;
}

function isSupportedVariantAttachmentContentType(contentType: string) {
  return (
    contentType === "application/pdf" ||
    contentType === "application/vnd.ms-excel" ||
    contentType === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
  );
}

function validatePriceOptions(priceOptions: ComponentPriceOptionInput[]) {
  if (priceOptions.length === 0) throw new Error("At least one variant is required.");
  const defaultCount = priceOptions.filter((option) => option.isDefault).length;
  if (defaultCount !== 1) throw new Error("Exactly one default variant is required.");
  for (const option of priceOptions) {
    readRequiredComponentText(option.label, "Variant name");
    readRequiredComponentText(option.unit, "Variant unit");
    if (!Number.isFinite(option.unitCost) || option.unitCost < 0) throw new Error("Variant cost must be a non-negative number.");
    if (option.miscCost !== undefined && (!Number.isFinite(option.miscCost) || option.miscCost < 0)) {
      throw new Error("Variant misc cost must be a non-negative number.");
    }
    const activeCostEntries = (option.costEntries ?? []).filter((entry) => entry.deletedAt === undefined || entry.deletedAt === null);
    if (activeCostEntries.length > 0) {
      const currentCount = activeCostEntries.filter((entry) => entry.isCurrent).length;
      if (currentCount !== 1) throw new Error("Each variant must have exactly one current cost entry.");
      for (const entry of activeCostEntries) {
        if (!Number.isFinite(entry.unitCost) || entry.unitCost < 0) throw new Error("Variant cost entries must use non-negative costs.");
        if (entry.miscCost !== undefined && (!Number.isFinite(entry.miscCost) || entry.miscCost < 0)) {
          throw new Error("Variant cost entries must use non-negative misc costs.");
        }
      }
    }
    for (const attachment of option.attachments ?? []) {
      readRequiredComponentText(attachment.path, "Attachment path");
      readRequiredComponentText(attachment.fileName, "Attachment file name");
      if (attachment.bucket !== "component-attachments") {
        throw new Error("Variant attachments must use the component attachment bucket.");
      }
      if (attachment.id && !isUuid(attachment.id)) throw new Error("Refresh this attachment before saving the component.");
      if (!attachment.id && (!attachment.assetId || !isUuid(attachment.assetId))) {
        throw new Error("A finalized upload asset is required for every new variant attachment.");
      }
      if (!isSupportedVariantAttachmentContentType(attachment.contentType)) {
        throw new Error("Variant attachments must be PDF or Excel files.");
      }
      if (!Number.isFinite(attachment.sizeBytes) || attachment.sizeBytes <= 0) throw new Error("Variant attachment size must be positive.");
    }
    if (option.packageQuantity !== undefined && option.packageQuantity !== null && (!Number.isFinite(option.packageQuantity) || option.packageQuantity <= 0)) {
      throw new Error("Variant package quantity must be a positive number.");
    }
    for (const measurement of [option.dimensionLength, option.dimensionWidth, option.dimensionHeight, option.mass]) {
      if (measurement !== undefined && measurement !== null && (!Number.isFinite(measurement) || measurement <= 0)) {
        throw new Error("Variant measurements must be positive numbers.");
      }
    }
  }
}

function toQuickAddTelemetryField(field: QuickAddField) {
  return field.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
}

function recordQuickAddValidationErrors(
  workspaceId: string,
  errors: Partial<Record<QuickAddField, string>>,
) {
  for (const field of Object.keys(errors) as QuickAddField[]) {
    recordLibraryEvent("quick_add_field_invalid", {
      workspaceId,
      field: toQuickAddTelemetryField(field),
      rule: "invalid",
    });
  }
}

function normalizeComponentInput(input: CostLibraryComponentInput) {
  return {
    ...input,
    name: readRequiredComponentText(input.name, "Component name", QUICK_ADD_TEXT_LIMITS.name),
    unit: readRequiredComponentText(input.unit, "Component unit", QUICK_ADD_TEXT_LIMITS.unit),
    category: readRequiredComponentText(input.category, "Component category", QUICK_ADD_TEXT_LIMITS.category),
    description: input.description ?? "",
    categoryNodeId: input.categoryNodeId?.trim() || null,
    supplier: readOptionalComponentText(input.supplier, "Supplier", QUICK_ADD_TEXT_LIMITS.supplier),
    supplierId: input.supplierId?.trim() || null,
    brand: readOptionalComponentText(input.brand, "Brand", QUICK_ADD_TEXT_LIMITS.brand),
    brandId: input.brandId?.trim() || null,
    thumbnailPath: input.thumbnailPath?.trim() || null,
    lifecycleState: input.lifecycleState ?? "available",
    effectiveAt: input.effectiveAt || new Date().toISOString(),
    changeReason: input.changeReason ?? "",
    metadata: input.metadata ?? {},
  };
}

function readComponentInputForCreate(input: CreateCostLibraryComponentInput): CostLibraryComponentInput {
  return {
    id: input.id,
    name: input.name,
    description: input.description,
    category: input.category,
    categoryNodeId: input.categoryNodeId,
    supplier: input.supplier,
    supplierId: input.supplierId,
    brand: input.brand,
    brandId: input.brandId,
    unit: input.unit,
    thumbnailPath: input.thumbnailPath,
    libraryFolderId: input.libraryFolderId,
    lifecycleState: input.lifecycleState,
    effectiveAt: input.effectiveAt,
    changeReason: input.changeReason,
  };
}

function normalizePriceOptionInput(input: ComponentPriceOptionInput) {
  const sourceUrl = readComponentSourceUrlInput(input.sourceUrl);
  const sourceValidation = validateQuickAddComponentInput({
    name: input.label,
    category: "Component",
    unit: input.unit,
    unitCost: input.unitCost,
    miscCost: input.miscCost ?? 0,
    pricingDate: input.pricingDate,
    pricingSource: input.pricingSource,
  });
  if (sourceValidation.errors.pricingDate) throw new Error(sourceValidation.errors.pricingDate);
  if (sourceValidation.errors.pricingSource) throw new Error(sourceValidation.errors.pricingSource);
  const costEntries = input.costEntries?.length
    ? input.costEntries.map((entry) => {
        const entryValidation = validateQuickAddComponentInput({
          name: input.label,
          category: "Component",
          unit: input.unit,
          unitCost: entry.unitCost,
          miscCost: entry.miscCost ?? 0,
          pricingDate: entry.pricingDate || input.pricingDate,
          pricingSource: entry.pricingSource,
        });
        if (entryValidation.errors.pricingDate) throw new Error(entryValidation.errors.pricingDate);
        if (entryValidation.errors.pricingSource) throw new Error(entryValidation.errors.pricingSource);
        return {
          ...entry,
          clientId: entry.clientId?.trim() || entry.id?.trim() || undefined,
          unitCost: roundQuickAddMoney(entry.unitCost),
          miscCost: roundQuickAddMoney(entry.miscCost ?? 0),
          currency: entry.currency ?? input.currency ?? "PHP",
          pricingSource: entryValidation.normalized.pricingSource ?? null,
          pricingDate: entryValidation.normalized.pricingDate || input.pricingDate || null,
          sourceUrl: readComponentSourceUrlInput(entry.sourceUrl, "Cost entry source URL"),
          notes: entry.notes ?? "",
          deletedAt: entry.deletedAt ?? null,
          isCurrent: entry.isCurrent ?? false,
        };
      })
    : [{
        clientId: input.activeCostEntryId?.trim() || undefined,
        unitCost: roundQuickAddMoney(input.unitCost),
        miscCost: roundQuickAddMoney(input.miscCost ?? 0),
        currency: input.currency ?? "PHP",
        pricingSource: sourceValidation.normalized.pricingSource ?? null,
        pricingDate: sourceValidation.normalized.pricingDate || null,
        sourceUrl,
        notes: input.notes ?? "",
        isCurrent: true,
        deletedAt: null,
      }];
  const attachments = (input.attachments ?? []).map((attachment) => ({
    ...attachment,
    id: attachment.id?.trim() || undefined,
    assetId: attachment.assetId?.trim() || null,
    bucket: attachment.bucket.trim(),
    path: attachment.path.trim(),
    fileName: attachment.fileName.trim(),
    contentType: attachment.contentType.trim(),
    kind: attachment.kind ?? (attachment.contentType === "application/pdf" ? "pdf" : "excel"),
    scanStatus: attachment.scanStatus?.trim() || null,
    metadata: attachment.metadata ?? {},
  }));

  return {
    ...input,
    label: readRequiredComponentText(input.label, "Variant name"),
    sku: input.sku?.trim() || null,
    variantDescription: input.variantDescription ?? "",
    variantSortOrder: input.variantSortOrder ?? 0,
    unit: readRequiredComponentText(input.unit, "Variant unit", QUICK_ADD_TEXT_LIMITS.unit),
    unitCost: roundQuickAddMoney(input.unitCost),
    miscCost: roundQuickAddMoney(input.miscCost ?? 0),
    currency: input.currency ?? "PHP",
    pricingSource: sourceValidation.normalized.pricingSource ?? null,
    pricingDate: sourceValidation.normalized.pricingDate || null,
    sourceUrl,
    notes: input.notes ?? "",
    supplierId: input.supplierId ?? null,
    activeCostEntryId: input.activeCostEntryId?.trim() || costEntries.find((entry) => entry.isCurrent)?.clientId || null,
    costEntries,
    packageQuantity: input.packageQuantity ?? null,
    packageUnit: input.packageUnit?.trim() || null,
    dimensionLength: input.dimensionLength ?? null,
    dimensionWidth: input.dimensionWidth ?? null,
    dimensionHeight: input.dimensionHeight ?? null,
    dimensionUnit: input.dimensionUnit?.trim() || null,
    mass: input.mass ?? null,
    massUnit: input.massUnit?.trim() || null,
    imageBucket: input.imageBucket?.trim() || null,
    imagePath: input.imagePath?.trim() || null,
    thumbnailPath: input.thumbnailPath?.trim() || null,
    imageMetadata: input.imageMetadata ?? {},
    attachments,
    variantMetadata: input.variantMetadata ?? {},
    isActive: input.isActive ?? true,
    isDefault: input.isDefault ?? false,
    effectiveAt: input.effectiveAt || new Date().toISOString(),
    changeReason: input.changeReason ?? "",
  };
}

function readMetadataObject(metadata: Json | undefined): { [key: string]: Json | undefined } {
  if (metadata && typeof metadata === "object" && !Array.isArray(metadata)) return metadata;
  return {};
}

function createBulkArchivePreviewHash(input: {
  eligibleIds: string[];
  blocked: unknown[];
  summary: Record<string, unknown>;
}) {
  return createHash("sha256")
    .update(JSON.stringify({
      targetType: "library_component",
      action: "archive",
      ids: input.eligibleIds,
      blocked: input.blocked,
      summary: input.summary,
    }))
    .digest("hex");
}

function createBulkDeletePreviewHash(input: {
  eligibleIds: string[];
  blocked: unknown[];
  summary: Record<string, unknown>;
}) {
  return createHash("sha256")
    .update(JSON.stringify({
      targetType: "library_component",
      action: "delete",
      ids: input.eligibleIds,
      blocked: input.blocked,
      summary: input.summary,
    }))
    .digest("hex");
}

function componentSnapshot(component: ReturnType<typeof normalizeComponentInput>, patch: Record<string, unknown> = {}) {
  return {
    name: component.name,
    description: component.description,
    category: component.category,
    categoryNodeId: component.categoryNodeId ?? null,
    supplier: component.supplier ?? null,
    supplierId: component.supplierId ?? null,
    brand: component.brand ?? null,
    brandId: component.brandId ?? null,
    unit: component.unit,
    thumbnailPath: component.thumbnailPath ?? null,
    libraryFolderId: component.libraryFolderId ?? null,
    lifecycleState: component.lifecycleState,
    metadata: readMetadataObject(component.metadata),
    ...patch,
  };
}

function priceOptionSnapshot(priceOption: ReturnType<typeof normalizePriceOptionInput>) {
  return {
    label: priceOption.label,
    sku: priceOption.sku,
    variantDescription: priceOption.variantDescription,
    variantSortOrder: priceOption.variantSortOrder,
    unit: priceOption.unit,
    unitCost: priceOption.unitCost,
    miscCost: priceOption.miscCost,
    currency: priceOption.currency,
    pricingSource: priceOption.pricingSource,
    pricingDate: priceOption.pricingDate,
    sourceUrl: priceOption.sourceUrl,
    notes: priceOption.notes,
    supplierId: priceOption.supplierId,
    packageQuantity: priceOption.packageQuantity,
    packageUnit: priceOption.packageUnit,
    dimensionLength: priceOption.dimensionLength,
    dimensionWidth: priceOption.dimensionWidth,
    dimensionHeight: priceOption.dimensionHeight,
    dimensionUnit: priceOption.dimensionUnit,
    mass: priceOption.mass,
    massUnit: priceOption.massUnit,
    imageBucket: priceOption.imageBucket,
    imagePath: priceOption.imagePath,
    thumbnailPath: priceOption.thumbnailPath,
    imageMetadata: priceOption.imageMetadata,
    attachments: priceOption.attachments,
    variantMetadata: priceOption.variantMetadata,
    isActive: priceOption.isActive,
    isDefault: priceOption.isDefault,
    activeCostEntryId: priceOption.activeCostEntryId,
  };
}

async function readComponentItem(database: D1DatabaseLike, workspaceId: string, itemId: string) {
  return first<ComponentItemD1Row>(
    database,
    `
      SELECT id, workspace_id, name, unit, unit_cost, misc_cost, current_version_number,
        active_price_option_id, pricing_source, pricing_date, thumbnail_path, metadata_json, lifecycle_state, updated_at
      FROM cost_library_items
      WHERE id = ?
        AND workspace_id = ?
      LIMIT 1
    `,
    [itemId, workspaceId],
  );
}

const STALE_COMPONENT_REVISION_ERROR = "This component changed after you opened it. Refresh and try again.";

function assertExpectedComponentRevision(
  existing: ComponentItemD1Row,
  _expectedUpdatedAt: string,
  expectedVersionNumber: number,
) {
  if (
    !Number.isInteger(expectedVersionNumber)
    || expectedVersionNumber < 1
    || numberValue(existing.current_version_number, 1) !== expectedVersionNumber
  ) {
    throw new Error(STALE_COMPONENT_REVISION_ERROR);
  }
}

function buildComponentRevisionGuardStatement(input: {
  workspaceId: string;
  itemId: string;
  expectedUpdatedAt: string;
  expectedVersionNumber: number;
}) {
  return {
    sql: `
      UPDATE cost_library_items
      SET current_version_number = CASE
        WHEN current_version_number = ? THEN current_version_number
        ELSE 0
      END
      WHERE id = ?
        AND workspace_id = ?
    `,
    values: [input.expectedVersionNumber, input.itemId, input.workspaceId] as D1Value[],
  };
}

async function runComponentRevisionGuardedBatch(
  database: D1DatabaseLike,
  statements: Array<{ sql: string; values?: D1Value[] }>,
  input: {
    workspaceId: string;
    itemId: string;
    expectedUpdatedAt: string;
    expectedVersionNumber: number;
    expectedComponentImpactFingerprint?: string;
  },
) {
  const guardStatements = [
    buildComponentRevisionGuardStatement(input),
    ...(input.expectedComponentImpactFingerprint !== undefined
      ? [buildLinkedEstimateRowsRevisionGuardStatement({
          workspaceId: input.workspaceId,
          itemId: input.itemId,
          expectedFingerprint: input.expectedComponentImpactFingerprint,
        })]
      : []),
  ];
  try {
    const results = await runAtomicBatch(database, [...guardStatements, ...statements]);
    return results.slice(guardStatements.length);
  } catch (error) {
    const current = await readComponentItem(database, input.workspaceId, input.itemId);
    if (current) {
      assertExpectedComponentRevision(current, input.expectedUpdatedAt, input.expectedVersionNumber);
    }
    if (input.expectedComponentImpactFingerprint !== undefined) {
      const [currentLinkedRows, currentPriceOptions] = await Promise.all([
        listLinkedEstimateRowTargets(database, input.workspaceId, input.itemId),
        listComponentPriceOptionImpactRows(database, input.workspaceId, input.itemId),
      ]);
      if (buildLinkedEstimateRowsRevisionFingerprint(currentLinkedRows, currentPriceOptions) !== input.expectedComponentImpactFingerprint) {
        throw new Error(STALE_COMPONENT_IMPACT_ERROR);
      }
    }
    throw error;
  }
}

async function assertLibraryFolderInWorkspace(database: D1DatabaseLike, workspaceId: string, folderId: string | null | undefined) {
  if (!folderId) return null;
  if (!isUuid(folderId)) throw new Error("Library folder not found in the current workspace.");
  const folder = await first<{ id: string }>(
    database,
    `
      SELECT id
      FROM library_folders
      WHERE id = ?
        AND workspace_id = ?
      LIMIT 1
    `,
    [folderId, workspaceId],
  );
  if (!folder) throw new Error("Library folder not found in the current workspace.");
  return folder.id;
}

type ComponentPriceOptionWriteInput = {
  workspaceId: string;
  itemId: string;
  priceOption: ReturnType<typeof normalizePriceOptionInput>;
  userId: string;
  effectiveAt: string;
  writeHistory: boolean;
};

function buildComponentPriceOptionWritePlan(
  input: ComponentPriceOptionWriteInput,
  options: { oldSnapshotJson?: string | null; priceOptionId?: string; timestamp?: string } = {},
) {
  const priceOptionId = options.priceOptionId
    ?? (input.priceOption.id && isUuid(input.priceOption.id) ? input.priceOption.id : randomUUID());
  const timestamp = options.timestamp ?? nowIso();
  const costEntries = input.priceOption.costEntries
    .filter((candidate) => candidate.deletedAt === null)
    .map((entry) => ({
      ...entry,
      id: entry.clientId && isUuid(entry.clientId) ? entry.clientId : randomUUID(),
    }));
  const currentCostEntry = costEntries.find((entry) => entry.isCurrent) ?? costEntries[0];
  const attachments = input.priceOption.attachments.map((attachment) => ({
    ...attachment,
    id: attachment.id && isUuid(attachment.id) ? attachment.id : randomUUID(),
    isExisting: Boolean(attachment.id && isUuid(attachment.id)),
  }));
  const persistedPriceOption = {
    ...input.priceOption,
    id: priceOptionId,
    activeCostEntryId: currentCostEntry?.id ?? null,
    attachments: attachments.map(({ isExisting, ...attachment }) => {
      void isExisting;
      return attachment;
    }),
  };
  const metadata = priceOptionSnapshot(persistedPriceOption);
  const guardStatements: Array<{ sql: string; values: D1Value[] }> = [{
    sql: `
      SELECT CASE WHEN NOT EXISTS (
        SELECT 1
        FROM cost_library_item_price_options
        WHERE id = ?
          AND (item_id <> ? OR workspace_id <> ?)
      ) THEN 1 ELSE json('') END AS price_option_ownership_guard
    `,
    values: [priceOptionId, input.itemId, input.workspaceId],
  }];
  const statements: Array<{ sql: string; values: D1Value[] }> = [];

  if (input.priceOption.imagePath) {
    const imageMetadata = readMetadataObject(input.priceOption.imageMetadata);
    const imageAssetId = typeof imageMetadata.assetId === "string" && isUuid(imageMetadata.assetId)
      ? imageMetadata.assetId
      : "";
    guardStatements.push({
      sql: `
        SELECT CASE WHEN EXISTS (
          SELECT 1
          FROM cost_library_item_price_options
          WHERE id = ?
            AND item_id = ?
            AND workspace_id = ?
            AND json_extract(metadata_json, '$.imagePath') = ?
        ) OR EXISTS (
          SELECT 1
          FROM upload_assets
          WHERE id = ?
            AND workspace_id = ?
            AND surface = 'component-image'
            AND status = 'finalized'
            AND scan_status = 'not_required'
            AND storage_bucket = ?
            AND storage_path = ?
        ) THEN 1 ELSE json('') END AS component_image_ownership_guard
      `,
      values: [
        priceOptionId,
        input.itemId,
        input.workspaceId,
        input.priceOption.imagePath,
        imageAssetId,
        input.workspaceId,
        input.priceOption.imageBucket ?? "component-images",
        input.priceOption.imagePath,
      ],
    });
    statements.push({
      sql: `
        UPDATE upload_assets
        SET target_entity_type = 'cost-library-component',
            target_entity_id = ?,
            updated_at = ?
        WHERE id = ?
          AND workspace_id = ?
          AND surface = 'component-image'
          AND status = 'finalized'
      `,
      values: [input.itemId, timestamp, imageAssetId, input.workspaceId],
    });
  }

  if (input.priceOption.isDefault) {
    statements.push({
      sql: `
        UPDATE cost_library_item_price_options
        SET is_default = 0
        WHERE item_id = ?
          AND workspace_id = ?
          AND id <> ?
      `,
      values: [input.itemId, input.workspaceId, priceOptionId],
    });
  }

  statements.push({
    sql: `
      INSERT INTO cost_library_item_price_options (
        id, workspace_id, item_id, label, unit, unit_cost, misc_cost, currency,
        is_active, is_default, updated_at, supplier_id, pricing_source,
        metadata_json, created_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        label = excluded.label,
        unit = excluded.unit,
        unit_cost = excluded.unit_cost,
        misc_cost = excluded.misc_cost,
        currency = excluded.currency,
        is_active = excluded.is_active,
        is_default = excluded.is_default,
        updated_at = excluded.updated_at,
        supplier_id = excluded.supplier_id,
        pricing_source = excluded.pricing_source,
        metadata_json = excluded.metadata_json
      WHERE cost_library_item_price_options.item_id = excluded.item_id
        AND cost_library_item_price_options.workspace_id = excluded.workspace_id
    `,
    values: [
      priceOptionId,
      input.workspaceId,
      input.itemId,
      input.priceOption.label,
      input.priceOption.unit,
      input.priceOption.unitCost,
      input.priceOption.miscCost,
      input.priceOption.currency,
      boolInt(input.priceOption.isActive),
      boolInt(input.priceOption.isDefault),
      timestamp,
      input.priceOption.supplierId,
      input.priceOption.pricingSource,
      jsonText(metadata),
      timestamp,
    ],
  });

  statements.push({
    sql: `
      UPDATE cost_library_item_variant_cost_entries
      SET is_current = 0,
          updated_at = ?
      WHERE workspace_id = ?
        AND item_id = ?
        AND price_option_id = ?
        AND deleted_at IS NULL
    `,
    values: [timestamp, input.workspaceId, input.itemId, priceOptionId],
  });

  for (const entry of costEntries) {
    guardStatements.push({
      sql: `
        SELECT CASE WHEN NOT EXISTS (
          SELECT 1
          FROM cost_library_item_variant_cost_entries
          WHERE id = ?
            AND (workspace_id <> ? OR item_id <> ? OR price_option_id <> ?)
        ) THEN 1 ELSE json('') END AS component_cost_entry_ownership_guard
      `,
      values: [entry.id, input.workspaceId, input.itemId, priceOptionId],
    });
    statements.push({
      sql: `
        INSERT INTO cost_library_item_variant_cost_entries (
          id, workspace_id, item_id, price_option_id, unit_cost, misc_cost, currency,
          pricing_source, pricing_date, source_url, notes, is_current,
          deleted_at, metadata_json, created_at, updated_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
          unit_cost = excluded.unit_cost,
          misc_cost = excluded.misc_cost,
          currency = excluded.currency,
          pricing_source = excluded.pricing_source,
          pricing_date = excluded.pricing_date,
          source_url = excluded.source_url,
          notes = excluded.notes,
          is_current = excluded.is_current,
          deleted_at = excluded.deleted_at,
          metadata_json = excluded.metadata_json,
          updated_at = excluded.updated_at
        WHERE cost_library_item_variant_cost_entries.workspace_id = excluded.workspace_id
          AND cost_library_item_variant_cost_entries.item_id = excluded.item_id
          AND cost_library_item_variant_cost_entries.price_option_id = excluded.price_option_id
      `,
      values: [
        entry.id,
        input.workspaceId,
        input.itemId,
        priceOptionId,
        entry.unitCost,
        entry.miscCost,
        entry.currency,
        entry.pricingSource,
        entry.pricingDate,
        entry.sourceUrl,
        entry.notes,
        boolInt(entry.isCurrent),
        entry.deletedAt,
        jsonText({ source: "component-library-action" }),
        timestamp,
        timestamp,
      ],
    });
  }

  const retainedAttachmentIds = attachments.map((attachment) => attachment.id);
  for (const attachment of attachments) {
    if (attachment.bucket !== "component-attachments") {
      throw new Error("Variant attachments must use the component attachment bucket.");
    }
    if (attachment.isExisting) {
      guardStatements.push({
        sql: `
          SELECT CASE WHEN EXISTS (
            SELECT 1
            FROM component_variant_attachments attachment
            INNER JOIN upload_assets asset ON asset.id = attachment.upload_asset_id
            WHERE attachment.id = ?
              AND attachment.owner_scope = 'library'
              AND attachment.workspace_id = ?
              AND attachment.item_id = ?
              AND attachment.price_option_id = ?
              AND attachment.storage_bucket = ?
              AND attachment.storage_path = ?
              AND asset.workspace_id = attachment.workspace_id
              AND asset.surface = 'component-attachment'
              AND asset.status = 'finalized'
              AND asset.storage_bucket = attachment.storage_bucket
              AND asset.storage_path = attachment.storage_path
              AND (
                asset.scan_status IN ('pending', 'clean')
                OR (
                  asset.scan_status = 'override_approved'
                  AND datetime(asset.scan_override_expires_at) > datetime(?)
                )
              )
          ) THEN 1 ELSE json('') END AS existing_component_attachment_guard
        `,
        values: [
          attachment.id,
          input.workspaceId,
          input.itemId,
          priceOptionId,
          attachment.bucket,
          attachment.path,
          timestamp,
        ],
      });
      statements.push({
        sql: `
          UPDATE component_variant_attachments
          SET file_name = ?,
              content_type = ?,
              size_bytes = ?,
              attachment_kind = ?,
              metadata_json = json_patch(?, json_object(
                'assetId', upload_asset_id,
                'scanStatus', (
                  SELECT scan_status FROM upload_assets WHERE id = upload_asset_id
                )
              )),
              applicable_cost_entry_id = ?,
              updated_at = ?
          WHERE id = ?
            AND owner_scope = 'library'
            AND workspace_id = ?
            AND item_id = ?
            AND price_option_id = ?
        `,
        values: [
          attachment.fileName,
          attachment.contentType,
          attachment.sizeBytes,
          attachment.kind,
          jsonText(attachment.metadata),
          currentCostEntry?.id ?? null,
          timestamp,
          attachment.id,
          input.workspaceId,
          input.itemId,
          priceOptionId,
        ],
      });
      continue;
    }

    if (!attachment.assetId || !isUuid(attachment.assetId)) {
      throw new Error("A finalized upload asset is required for every new variant attachment.");
    }
    guardStatements.push({
      sql: `
        SELECT CASE WHEN EXISTS (
          SELECT 1
          FROM upload_assets
          WHERE id = ?
            AND workspace_id = ?
            AND surface = 'component-attachment'
            AND status = 'finalized'
            AND storage_bucket = ?
            AND storage_path = ?
            AND file_name = ?
            AND content_type = ?
            AND size_bytes = ?
            AND (
              scan_status IN ('pending', 'clean')
              OR (
                scan_status = 'override_approved'
                AND datetime(scan_override_expires_at) > datetime(?)
              )
            )
        ) THEN 1 ELSE json('') END AS new_component_attachment_guard
      `,
      values: [
        attachment.assetId,
        input.workspaceId,
        attachment.bucket,
        attachment.path,
        attachment.fileName,
        attachment.contentType,
        attachment.sizeBytes,
        timestamp,
      ],
    });
    statements.push({
      sql: `
        INSERT INTO component_variant_attachments (
          id, owner_scope, price_option_id, item_id, workspace_id, upload_asset_id,
          storage_bucket, storage_path, file_name, content_type, size_bytes,
          attachment_kind, metadata_json, created_by, review_status,
          applicable_cost_entry_id, is_current_approved, review_revision,
          created_at, updated_at
        )
        VALUES (?, 'library', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, json_patch(?, json_object(
          'assetId', ?,
          'scanStatus', (SELECT scan_status FROM upload_assets WHERE id = ?)
        )), ?, 'uploaded', ?, 0, 1, ?, ?)
      `,
      values: [
        attachment.id,
        priceOptionId,
        input.itemId,
        input.workspaceId,
        attachment.assetId,
        attachment.bucket,
        attachment.path,
        attachment.fileName,
        attachment.contentType,
        attachment.sizeBytes,
        attachment.kind,
        jsonText(attachment.metadata),
        attachment.assetId,
        attachment.assetId,
        input.userId,
        currentCostEntry?.id ?? null,
        timestamp,
        timestamp,
      ],
    });
  }

  statements.push({
    sql: `
      UPDATE upload_assets
      SET status = 'removed',
          updated_at = ?
      WHERE id IN (
        SELECT upload_asset_id
        FROM component_variant_attachments
        WHERE workspace_id = ?
          AND owner_scope = 'library'
          AND item_id = ?
          AND price_option_id = ?
          AND upload_asset_id IS NOT NULL
          AND id NOT IN (SELECT CAST(value AS TEXT) FROM json_each(?))
          AND review_status <> 'superseded'
      )
    `,
    values: [timestamp, input.workspaceId, input.itemId, priceOptionId, jsonText(retainedAttachmentIds, [])],
  }, {
    sql: `
      UPDATE component_variant_attachments
      SET review_status = 'superseded',
          is_current_approved = 0,
          reviewed_by = ?,
          reviewed_at = ?,
          review_note = 'Removed from component variant',
          review_revision = review_revision + 1,
          updated_at = ?
      WHERE workspace_id = ?
        AND owner_scope = 'library'
        AND item_id = ?
        AND price_option_id = ?
        AND id NOT IN (SELECT CAST(value AS TEXT) FROM json_each(?))
        AND review_status <> 'superseded'
    `,
    values: [
      input.userId,
      timestamp,
      timestamp,
      input.workspaceId,
      input.itemId,
      priceOptionId,
      jsonText(retainedAttachmentIds, []),
    ],
  });

  if (input.writeHistory) {
    statements.push({
      sql: `
        INSERT OR IGNORE INTO cost_library_item_price_history (
          id, price_option_id, item_id, workspace_id, operation_key, old_snapshot,
          new_snapshot, change_reason, effective_at, created_by, created_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      values: [
        randomUUID(),
        priceOptionId,
        input.itemId,
        input.workspaceId,
        `${input.itemId}:${priceOptionId}:${input.effectiveAt}`,
        options.oldSnapshotJson ?? null,
        jsonText(metadata),
        input.priceOption.changeReason,
        input.effectiveAt,
        input.userId,
        timestamp,
      ],
    });
  }

  return {
    persisted: {
      id: priceOptionId,
      label: input.priceOption.label,
      isDefault: input.priceOption.isDefault,
      isActive: input.priceOption.isActive,
      unit: input.priceOption.unit,
      unitCost: input.priceOption.unitCost,
      miscCost: input.priceOption.miscCost,
      pricingSource: input.priceOption.pricingSource,
      pricingDate: input.priceOption.pricingDate,
      thumbnailPath: input.priceOption.thumbnailPath,
      snapshot: metadata,
    },
    guardStatements,
    statements,
  };
}

// Lazy estimate-sheet path: the sheet renders without the library dataset and
// the client fetches it on demand. requireCurrentUserContext keeps this server
// action fail-closed for anonymous callers, matching the page-load auth gate.
export async function loadCurrentWorkspaceComponentLibrary(): Promise<ComponentLibraryDataset> {
  await requireCurrentUserContext();
  return getCurrentWorkspaceComponentLibrary();
}

// U18: lite variant for the in-estimate panel — skips the per-item detail graph
// it never reads. Keyed separately on the client (["workspace-component-library",
// "lite"]) so it never serves incomplete data to the full-graph editor surfaces.
export async function loadCurrentWorkspaceComponentLibraryLite(): Promise<ComponentLibraryDataset> {
  await requireCurrentUserContext();
  return getCurrentWorkspaceComponentLibraryLite();
}

// Estimate-sheet project context: the right sidebar must show project-scoped
// express rows under the project's virtual folder while retaining templates.
export async function loadProjectComponentLibraryLite(projectId: string): Promise<ComponentLibraryDataset> {
  await requireCurrentUserContext();
  const [componentRows, templates] = await Promise.all([
    getProjectComponentRowsLibrary(projectId, {
      includeDetailGraph: false,
      itemLimit: SIDEBAR_COMPONENT_LIBRARY_DEFAULT_LIMIT,
      projectRowLimit: SIDEBAR_COMPONENT_LIBRARY_DEFAULT_LIMIT,
    }),
    getCurrentWorkspaceEstimateTemplates(),
  ]);

  return {
    ...componentRows,
    templates,
  };
}

// Library Optimization Plan P0 T3: client-callable loader for the Components
// *management* tab. Returns ComponentRowsLibraryDataset (rows + tree + suppliers +
// brands + folders, no templates). The browse route intentionally skips the
// unbounded detail graph and hydrates a selected component separately.
export async function loadCurrentWorkspaceComponentRowsLibrary(): Promise<ComponentRowsLibraryDataset> {
  await requireCurrentUserContext();
  return getCurrentWorkspaceComponentRowsLibrary({ includeDetailGraph: false });
}

export async function loadProjectComponentRowsLibrary(projectId: string): Promise<ComponentRowsLibraryDataset> {
  await requireCurrentUserContext();
  return getProjectComponentRowsLibrary(projectId, { includeDetailGraph: false });
}

export async function loadCostLibraryComponentRowDetail(itemId: string): Promise<EstimateRowItem | null> {
  await requireCurrentUserContext();
  return getCurrentWorkspaceComponentRowDetail(itemId);
}

export async function loadCostLibraryComponentEditorDetail(itemId: string): Promise<CostLibraryComponentEditorDetail> {
  const [{ workspace }, currentUser] = await Promise.all([ensureDefaultWorkspace(), requireCurrentUserContext()]);
  const database = await requireComponentLibraryActionsD1Database();
  await assertCanManageLibrary(database, workspace.id, currentUser);
  if (!isUuid(itemId)) throw new Error("Component not found in the current workspace.");
  const [component, linkedRows, priceOptions] = await Promise.all([
    getCurrentWorkspaceComponentRowDetail(itemId),
    listLinkedEstimateRowTargets(database, workspace.id, itemId),
    listComponentPriceOptionImpactRows(database, workspace.id, itemId),
  ]);
  if (!component) throw new Error("Component not found in the current workspace.");
  const optionUsageCounts: Record<string, number> = {};
  for (const row of linkedRows) {
    if (!row.selected_price_option_id) continue;
    optionUsageCounts[row.selected_price_option_id] = (optionUsageCounts[row.selected_price_option_id] ?? 0) + 1;
  }
  return {
    component,
    expectedComponentImpactFingerprint: buildLinkedEstimateRowsRevisionFingerprint(linkedRows, priceOptions),
    optionUsageCounts,
  };
}

// Library Optimization Plan P0 T3: client-callable loader for the Templates browse tab.
export async function loadCurrentWorkspaceEstimateTemplates(): Promise<EstimateTemplate[]> {
  await requireCurrentUserContext();
  return getCurrentWorkspaceEstimateTemplates();
}

export async function duplicateCostLibraryComponent(input: { itemId: string }) {
  const [{ workspace }, currentUser] = await Promise.all([ensureDefaultWorkspace(), requireCurrentUserContext()]);
  const database = await requireComponentLibraryActionsD1Database();
  await assertCanManageLibrary(database, workspace.id, currentUser, "duplicate_component");
  if (!isUuid(input.itemId)) throw new Error("Component not found in the current workspace.");

  const source = await getCurrentWorkspaceComponentRowDetail(input.itemId);
  if (!source || source.sourceLibraryItemId !== input.itemId) {
    throw new Error("Component not found in the current workspace.");
  }

  const activeOptions = source.priceOptions?.filter((option) => option.isActive) ?? [];
  const omittedAttachmentCount = activeOptions.reduce(
    (count, option) => count + (option.attachments?.length ?? 0),
    0,
  );
  const priceOptions: ComponentPriceOptionInput[] = activeOptions.length > 0
    ? activeOptions.map((option, index) => ({
        label: option.label,
        sku: option.sku,
        variantDescription: option.variantDescription ?? undefined,
        variantSortOrder: option.variantSortOrder ?? index + 1,
        unit: option.unit,
        unitCost: option.unitCost,
        miscCost: option.miscCost,
        currency: option.currency,
        pricingSource: option.pricingSource ?? undefined,
        pricingDate: option.pricingDate ?? undefined,
        sourceUrl: option.sourceUrl ?? undefined,
        notes: option.notes ?? undefined,
        supplierId: option.supplierId,
        costEntries: option.costEntries?.map((entry) => ({
          unitCost: entry.unitCost,
          miscCost: entry.miscCost,
          currency: entry.currency,
          pricingSource: entry.pricingSource ?? undefined,
          pricingDate: entry.pricingDate || undefined,
          sourceUrl: entry.sourceUrl ?? undefined,
          notes: entry.notes ?? undefined,
          isCurrent: entry.isCurrent,
          deletedAt: null,
        })),
        packageQuantity: option.packageQuantity,
        packageUnit: option.packageUnit,
        dimensionLength: option.dimensionLength,
        dimensionWidth: option.dimensionWidth,
        dimensionHeight: option.dimensionHeight,
        dimensionUnit: option.dimensionUnit,
        mass: option.mass,
        massUnit: option.massUnit,
        imageBucket: option.imageBucket,
        imagePath: option.imagePath,
        thumbnailPath: option.thumbnailPath,
        imageMetadata: readJsonValue(option.imageMetadata),
        attachments: [],
        variantMetadata: readJsonValue(option.variantMetadata),
        isDefault: option.isDefault,
        isActive: true,
        effectiveAt: option.pricingDate || source.pricingDate || undefined,
        changeReason: "Duplicated from the workshop library",
      }))
    : [{
        label: source.priceOptionLabel || "Default",
        unit: source.unit,
        unitCost: source.itemCost,
        miscCost: source.miscCost,
        currency: source.currency || "PHP",
        pricingSource: source.pricingSource,
        pricingDate: source.pricingDate,
        isDefault: true,
        isActive: true,
        effectiveAt: source.pricingDate || undefined,
        changeReason: "Duplicated from the workshop library",
      }];

  const result = await createCostLibraryComponent({
    name: `${source.name?.trim() || source.material} copy`,
    description: source.description,
    category: source.category?.trim() || "Component",
    categoryNodeId: source.categoryNodeId ?? null,
    supplier: source.supplier || null,
    supplierId: source.supplierId ?? null,
    brand: source.brand || null,
    brandId: source.brandId ?? null,
    unit: source.unit,
    thumbnailPath: source.imageUrl ?? null,
    libraryFolderId: source.libraryFolderId ?? null,
    lifecycleState: source.lifecycleState ?? "available",
    effectiveAt: source.pricingDate || undefined,
    changeReason: "Duplicated from the workshop library",
    metadata: { duplicatedFrom: source.id },
    priceOptions,
  });
  return { ...result, omittedAttachmentCount };
}

export async function createCostLibraryComponent(input: CreateCostLibraryComponentInput) {
  const [{ workspace }, currentUser] = await Promise.all([ensureDefaultWorkspace(), requireCurrentUserContext()]);
  const database = await requireComponentLibraryActionsD1Database();
  await assertCanManageLibrary(database, workspace.id, currentUser);
  const priceOptionInputs = input.priceOptions;
  validatePriceOptions(priceOptionInputs);
  const componentInput = readComponentInputForCreate(input);
  const component = normalizeComponentInput({
    ...componentInput,
    metadata: {
      ...readMetadataObject(input.metadata),
      source: "library",
      isCustom: true,
      createdFrom: "workshop-library",
    },
  });
  const defaultPriceOption = priceOptionInputs.find((option) => option.isDefault) ?? priceOptionInputs[0];
  const quickAddValidation = validateQuickAddComponentInput({
    name: component.name,
    category: component.category,
    unit: defaultPriceOption?.unit || component.unit,
    unitCost: defaultPriceOption?.unitCost,
    supplier: component.supplier,
    brand: component.brand,
    pricingDate: defaultPriceOption?.pricingDate,
    pricingSource: defaultPriceOption?.pricingSource,
    libraryFolderId: component.libraryFolderId,
  });
  if (Object.keys(quickAddValidation.errors).length > 0) {
    recordQuickAddValidationErrors(workspace.id, quickAddValidation.errors);
  }
  assertQuickAddComponentInput({
    name: component.name,
    category: component.category,
    unit: defaultPriceOption?.unit || component.unit,
    unitCost: defaultPriceOption?.unitCost,
    supplier: component.supplier,
    brand: component.brand,
    pricingDate: defaultPriceOption?.pricingDate,
    pricingSource: defaultPriceOption?.pricingSource,
    libraryFolderId: component.libraryFolderId,
  });
  const normalizedPriceOptions = priceOptionInputs.map((option) => normalizePriceOptionInput({ ...option, unit: option.unit || component.unit }));
  const priceOptions = normalizedPriceOptions;
  const itemId = component.id && isUuid(component.id) ? component.id : randomUUID();
  const timestamp = nowIso();
  await assertWithinLibraryQuota(database, "cost_library_items", workspace.id, LIBRARY_COMPONENT_CAP, "component");
  const targetFolderId = await assertLibraryFolderInWorkspace(database, workspace.id, component.libraryFolderId);
  const priceOptionPlans = priceOptions.map((priceOption) => buildComponentPriceOptionWritePlan({
    workspaceId: workspace.id,
    itemId,
    priceOption,
    userId: currentUser.userId,
    effectiveAt: priceOption.effectiveAt,
    writeHistory: false,
  }, { timestamp }));
  const persistedPriceOptions = priceOptionPlans.map((plan) => plan.persisted);
  const activePriceOption = persistedPriceOptions.find((option) => option.isDefault) ?? persistedPriceOptions[0];
  if (!activePriceOption) throw new Error("At least one active component variant is required.");
  const statements: Array<{ sql: string; values: D1Value[] }> = [
    ...priceOptionPlans.flatMap((plan) => plan.guardStatements),
    {
      sql: `
      INSERT INTO cost_library_items (
        id, workspace_id, name, description, category, category_node_id,
        library_folder_id, supplier, supplier_id, brand, brand_id, unit, unit_cost,
        misc_cost, lifecycle_state, current_version_number, active_price_option_id,
        pricing_source, pricing_date, thumbnail_path, metadata_json,
        created_by, created_at, updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    values: [
      itemId,
      workspace.id,
      component.name,
      component.description,
      component.category,
      component.categoryNodeId ?? null,
      targetFolderId,
      component.supplier,
      component.supplierId ?? null,
      component.brand,
      component.brandId ?? null,
      activePriceOption.unit,
      activePriceOption.unitCost,
      activePriceOption.miscCost,
      component.lifecycleState,
      1,
      activePriceOption.id,
      activePriceOption.pricingSource,
      activePriceOption.pricingDate,
      component.thumbnailPath,
      jsonText(readMetadataObject(component.metadata)),
      currentUser.userId,
      timestamp,
      timestamp,
    ],
    },
  ];
  for (const plan of priceOptionPlans) statements.push(...plan.statements);
  statements.push({
    sql: `
      INSERT INTO cost_library_item_versions (
        id, item_id, workspace_id, version_number, snapshot_json, change_summary,
        change_reason, effective_at, created_by, created_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    values: [
      randomUUID(),
      itemId,
      workspace.id,
      1,
      jsonText(componentSnapshot(component, { priceOptions: persistedPriceOptions })),
      "Component created",
      component.changeReason,
      component.effectiveAt,
      currentUser.userId,
      timestamp,
    ],
  });
  await runAtomicBatch(database, statements);
  const persistedComponent = await getCurrentWorkspaceComponentRowDetail(itemId);
  if (!persistedComponent) throw new Error("Component was saved but could not be reloaded.");
  revalidateLibraryRoutes();
  return {
    itemId,
    versionNumber: 1,
    activePriceOptionId: activePriceOption.id,
    priceOptions: persistedPriceOptions.map((option) => ({ id: option.id, label: option.label, isDefault: option.isDefault })),
    createdAt: timestamp,
    updatedAt: timestamp,
    component: persistedComponent,
  };
}

export async function saveCostLibraryComponentDraft(input: SaveCostLibraryComponentDraftInput): Promise<SaveCostLibraryComponentDraftResult> {
  const [{ workspace }, currentUser] = await Promise.all([ensureDefaultWorkspace(), requireCurrentUserContext()]);
  const database = await requireComponentLibraryActionsD1Database();
  await assertCanManageLibrary(database, workspace.id, currentUser, "save_component_draft");
  const title = readOptionalComponentText(input.title, "Draft title", QUICK_ADD_TEXT_LIMITS.name) ?? "Untitled component";
  const timestamp = nowIso();
  const draftJson = readComponentDraftJson(input.draft);
  await discardOlderActiveComponentDraftsBeforeInsert(database, workspace.id, timestamp);
  await assertWithinLibraryQuota(
    database,
    "cost_library_component_drafts",
    workspace.id,
    LIBRARY_COMPONENT_DRAFT_CAP,
    "active component draft",
  );
  const draftId = randomUUID();
  await run(
    database,
    `
      INSERT INTO cost_library_component_drafts (
        id, workspace_id, created_by, title, draft_json, status, created_at, updated_at
      )
      VALUES (?, ?, ?, ?, ?, 'active', ?, ?)
    `,
    [
      draftId,
      workspace.id,
      currentUser.userId,
      title,
      draftJson,
      timestamp,
      timestamp,
    ],
  );
  // Drafts are not part of the cached component table yet, so close-save should
  // avoid invalidating the library route on every modal exit.
  return { draftId, savedAt: timestamp };
}

export async function updateCostLibraryComponentWithPriceOptions(itemId: string, input: UpdateCostLibraryComponentWithPriceOptionsInput) {
  const [{ workspace }, currentUser] = await Promise.all([ensureDefaultWorkspace(), requireCurrentUserContext()]);
  const database = await requireComponentLibraryActionsD1Database();
  await assertCanManageLibrary(database, workspace.id, currentUser);
  if (!isUuid(itemId)) throw new Error("Component not found in the current workspace.");
  const existing = await readComponentItem(database, workspace.id, itemId);
  if (!existing) throw new Error("Component not found in the current workspace.");
  assertExpectedComponentRevision(existing, input.expectedUpdatedAt, input.expectedVersionNumber);

  const [existingPriceOptionRows, affectedRows] = await Promise.all([
    all<LibraryPriceOptionProjectionD1Row>(
      database,
      `
        SELECT id, label, unit, unit_cost, misc_cost, currency, is_active, is_default,
          pricing_source, metadata_json, updated_at
        FROM cost_library_item_price_options
        WHERE item_id = ?
          AND workspace_id = ?
        ORDER BY id
      `,
      [itemId, workspace.id],
    ),
    listLinkedEstimateRowTargets(database, workspace.id, itemId),
  ]);
  const currentImpactFingerprint = buildLinkedEstimateRowsRevisionFingerprint(affectedRows, existingPriceOptionRows);
  if (currentImpactFingerprint !== input.expectedComponentImpactFingerprint) {
    throw new Error(STALE_COMPONENT_IMPACT_ERROR);
  }

  const component = normalizeComponentInput(input);
  const targetFolderId = await assertLibraryFolderInWorkspace(database, workspace.id, component.libraryFolderId);
  const metadataJson = input.metadata === undefined
    ? existing.metadata_json ?? "{}"
    : jsonText(readMetadataObject(component.metadata));
  const priceOptionInputs = input.priceOptions;
  validatePriceOptions(priceOptionInputs);
  const existingPriceOptionIds = new Set(existingPriceOptionRows.map((option) => option.id));
  for (const priceOption of priceOptionInputs) {
    if (!priceOption.id) continue;
    if (!isUuid(priceOption.id) || !existingPriceOptionIds.has(priceOption.id)) {
      throw new Error("A submitted component variant no longer belongs to this component. Refresh and try again.");
    }
  }
  const priceOptions = priceOptionInputs.map((option) => normalizePriceOptionInput({ ...option, unit: option.unit || component.unit }));
  const nextVersion = numberValue(existing.current_version_number, 1) + 1;
  const timestamp = nowIso();
  const priceOptionPlans = priceOptions.map((priceOption) => buildComponentPriceOptionWritePlan({
    workspaceId: workspace.id,
    itemId,
    priceOption,
    userId: currentUser.userId,
    effectiveAt: priceOption.effectiveAt,
    writeHistory: false,
  }, { timestamp }));
  const persistedPriceOptions = priceOptionPlans.map((plan) => plan.persisted);
  const activePriceOption = persistedPriceOptions.find((option) => option.isDefault) ?? persistedPriceOptions[0];
  if (!activePriceOption) throw new Error("At least one active component variant is required.");
  const retainedPriceOptionIds = persistedPriceOptions.map((option) => option.id);
  const retainedPriceOptionIdSet = new Set(retainedPriceOptionIds);
  const retainedImageAssetIds = priceOptions.flatMap((option) => {
    const imageMetadata = readMetadataObject(option.imageMetadata);
    const assetId = imageMetadata.assetId;
    return typeof assetId === "string" && isUuid(assetId) ? [assetId] : [];
  });
  const removedPriceOptionIds = new Set(existingPriceOptionRows
    .filter((option) => readBoolean(option.is_active) && !retainedPriceOptionIdSet.has(option.id))
    .map((option) => option.id));
  const removedPriceOptionReplacements = input.removedPriceOptionReplacements ?? {};
  for (const [removedId, replacementId] of Object.entries(removedPriceOptionReplacements)) {
    if (!removedPriceOptionIds.has(removedId)) throw new Error("A variant replacement targets a variant that is not being deleted.");
    if (!isUuid(replacementId) || !retainedPriceOptionIdSet.has(replacementId) || replacementId === removedId) {
      throw new Error("A deleted variant must be replaced with a different active variant from this component.");
    }
  }
  const syncOptions = persistedPriceOptions.map((option) => buildLibraryComponentSyncOption({
    id: option.id,
    label: option.label,
    unit: option.unit,
    unitCost: option.unitCost,
    miscCost: option.miscCost,
    currency: typeof option.snapshot.currency === "string" ? option.snapshot.currency : "PHP",
    isActive: option.isActive,
    isDefault: option.isDefault,
    pricingSource: option.pricingSource,
    pricingDate: option.pricingDate,
    thumbnailPath: option.thumbnailPath,
    snapshot: option.snapshot,
  }));
  const sourcePriceOptions = syncOptions.map((option) => option.snapshot);
  const rowPlans = buildLinkedEstimateRowSyncPlans({
    rows: affectedRows,
    itemId,
    material: component.name,
    componentDescription: component.description,
    category: component.category,
    categoryNodeId: component.categoryNodeId,
    brand: component.brand,
    brandId: component.brandId,
    supplier: component.supplier,
    supplierId: component.supplierId,
    lifecycleState: component.lifecycleState,
    componentVersionNumber: nextVersion,
    componentThumbnailPath: component.thumbnailPath,
    priceOptions: syncOptions,
    defaultPriceOptionId: activePriceOption.id,
    removedPriceOptionReplacements,
    updatedAt: timestamp,
  });
  const statements: Array<{ sql: string; values: D1Value[] }> = [
    ...priceOptionPlans.flatMap((plan) => plan.guardStatements),
    {
      sql: `
      UPDATE cost_library_items
      SET name = ?,
          description = ?,
          category = ?,
          category_node_id = ?,
          library_folder_id = ?,
          supplier = ?,
          supplier_id = ?,
          brand = ?,
          brand_id = ?,
          unit = ?,
          thumbnail_path = ?,
          lifecycle_state = ?,
          current_version_number = ?,
          metadata_json = ?,
          updated_at = ?
      WHERE id = ?
        AND workspace_id = ?
    `,
      values: [
        component.name,
        component.description,
        component.category,
        component.categoryNodeId ?? null,
        targetFolderId,
        component.supplier,
        component.supplierId ?? null,
        component.brand,
        component.brandId ?? null,
        component.unit,
        component.thumbnailPath,
        component.lifecycleState,
        nextVersion,
        metadataJson,
        timestamp,
        itemId,
        workspace.id,
      ],
    },
    {
      sql: `
        UPDATE upload_assets
        SET status = 'removed',
            updated_at = ?
        WHERE workspace_id = ?
          AND surface = 'component-image'
          AND status = 'finalized'
          AND id IN (
            SELECT json_extract(metadata_json, '$.imageMetadata.assetId')
            FROM cost_library_item_price_options
            WHERE workspace_id = ?
              AND item_id = ?
              AND json_type(metadata_json, '$.imageMetadata.assetId') = 'text'
          )
          AND id NOT IN (SELECT CAST(value AS TEXT) FROM json_each(?))
          AND NOT EXISTS (
            SELECT 1
            FROM cost_library_item_price_options retained_option
            WHERE retained_option.workspace_id = ?
              AND retained_option.item_id <> ?
              AND json_extract(retained_option.metadata_json, '$.imageMetadata.assetId') = upload_assets.id
          )
      `,
      values: [
        timestamp,
        workspace.id,
        workspace.id,
        itemId,
        jsonText(retainedImageAssetIds, []),
        workspace.id,
        itemId,
      ],
    },
  ];
  for (const plan of priceOptionPlans) statements.push(...plan.statements);
  if (removedPriceOptionIds.size > 0) {
    const removedPriceOptionIdsJson = jsonText([...removedPriceOptionIds], []);
    statements.push({
      sql: `
        UPDATE upload_assets
        SET status = 'removed',
            updated_at = ?
        WHERE id IN (
          SELECT upload_asset_id
          FROM component_variant_attachments
          WHERE workspace_id = ?
            AND owner_scope = 'library'
            AND item_id = ?
            AND price_option_id IN (SELECT CAST(value AS TEXT) FROM json_each(?))
            AND upload_asset_id IS NOT NULL
            AND review_status <> 'superseded'
        )
      `,
      values: [timestamp, workspace.id, itemId, removedPriceOptionIdsJson],
    }, {
      sql: `
        UPDATE component_variant_attachments
        SET review_status = 'superseded',
            is_current_approved = 0,
            reviewed_by = ?,
            reviewed_at = ?,
            review_note = 'Variant removed from component',
            review_revision = review_revision + 1,
            updated_at = ?
        WHERE workspace_id = ?
          AND owner_scope = 'library'
          AND item_id = ?
          AND price_option_id IN (SELECT CAST(value AS TEXT) FROM json_each(?))
          AND review_status <> 'superseded'
      `,
      values: [
        currentUser.userId,
        timestamp,
        timestamp,
        workspace.id,
        itemId,
        removedPriceOptionIdsJson,
      ],
    });
  }
  statements.push({
    sql: `
        UPDATE cost_library_item_price_options
        SET is_active = 0,
            is_default = 0,
            updated_at = ?
        WHERE item_id = ?
          AND workspace_id = ?
          AND id NOT IN (SELECT CAST(value AS TEXT) FROM json_each(?))
      `,
    values: [timestamp, itemId, workspace.id, jsonText(retainedPriceOptionIds, [])],
  }, {
    sql: `
      UPDATE cost_library_items
      SET active_price_option_id = ?,
          unit = ?,
          unit_cost = ?,
          misc_cost = ?,
          pricing_source = ?,
          pricing_date = ?,
          updated_at = ?
      WHERE id = ?
        AND workspace_id = ?
    `,
    values: [
      activePriceOption.id,
      activePriceOption.unit,
      activePriceOption.unitCost,
      activePriceOption.miscCost,
      activePriceOption.pricingSource,
      activePriceOption.pricingDate,
      timestamp,
      itemId,
      workspace.id,
    ],
  }, {
    sql: `
      INSERT INTO cost_library_item_versions (
        id, item_id, workspace_id, version_number, snapshot_json, change_summary,
        change_reason, effective_at, created_by, created_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    values: [
      randomUUID(),
      itemId,
      workspace.id,
      nextVersion,
      jsonText(componentSnapshot(component, { priceOptions: sourcePriceOptions })),
      "Component and variants updated",
      component.changeReason,
      component.effectiveAt,
      currentUser.userId,
      timestamp,
    ],
  });
  const syncStatementIndex = rowPlans.length > 0 ? statements.length : -1;
  if (rowPlans.length > 0) {
    statements.push(buildLinkedEstimateRowsSyncStatement({
      workspaceId: workspace.id,
      itemId,
      rowPlans,
      updatedAt: timestamp,
    }));
  }
  const results = await runComponentRevisionGuardedBatch(database, statements, {
    workspaceId: workspace.id,
    itemId,
    expectedUpdatedAt: input.expectedUpdatedAt,
    expectedVersionNumber: input.expectedVersionNumber,
    expectedComponentImpactFingerprint: input.expectedComponentImpactFingerprint,
  });
  const instanceSync = syncStatementIndex >= 0
    ? buildLibraryComponentInstanceSyncResult(
        rowPlans,
        results[syncStatementIndex] as D1Result<{ id: string; row_revision: number | string }>,
      )
    : emptyLibraryComponentInstanceSyncResult();
  revalidateLinkedEstimateRows(affectedRows);
  const persistedComponent = await getCurrentWorkspaceComponentRowDetail(itemId);
  if (!persistedComponent) throw new Error("Component was saved but could not be reloaded.");
  revalidateLibraryRoutes();
  return {
    itemId,
    versionNumber: nextVersion,
    activePriceOptionId: activePriceOption.id,
    priceOptions: persistedPriceOptions.map((option) => ({ id: option.id, label: option.label, isDefault: option.isDefault })),
    updatedAt: timestamp,
    component: persistedComponent,
    ...instanceSync,
  };
}

export async function previewBulkArchiveLibraryComponents(input: BulkArchiveLibraryComponentsInput): Promise<BulkActionPreviewResult> {
  const { ids, issues } = normalizeBulkActionIds(input.itemIds, { label: "components", max: 500 });
  if (issues.length > 0) return buildRejectedPreviewResult("library_component", ids, issues);

  const [{ workspace }] = await Promise.all([
    ensureDefaultWorkspace(),
    requireCurrentUserContext(),
  ]);
  const database = await requireComponentLibraryActionsD1Database();
  const sortedIds = [...ids].sort();
  const rows = sortedIds.length
    ? await all<{ id: string; name: string; lifecycle_state: string }>(
        database,
        `
          SELECT id, name, lifecycle_state
          FROM cost_library_items
          WHERE workspace_id = ?
            AND id IN (${placeholders(sortedIds)})
        `,
        [workspace.id, ...sortedIds],
      )
    : [];
  const byId = new Map(rows.map((row) => [row.id, row]));
  const eligibleIds: string[] = [];
  const blocked = [];
  for (const id of sortedIds) {
    const row = byId.get(id);
    if (!row) {
      blocked.push({ id, code: "not_found", message: "Component was not found in this workspace." });
      continue;
    }
    if (row.lifecycle_state === "archived") {
      blocked.push({ id, name: row.name, code: "blocked", message: "Component is already archived." });
      continue;
    }
    eligibleIds.push(id);
  }
  const summary = {
    requestedCount: sortedIds.length,
    eligibleCount: eligibleIds.length,
    blockedCount: blocked.length,
  };
  return coerceBulkPreviewResult({
    ok: eligibleIds.length > 0 && blocked.length === 0,
    targetType: "library_component",
    ids: sortedIds,
    eligibleIds,
    previewHash: createBulkArchivePreviewHash({ eligibleIds, blocked, summary }),
    summary,
    issues: blocked,
    blocked,
  }, { targetType: "library_component", ids: sortedIds });
}

export async function executeBulkArchiveLibraryComponents(input: ExecuteBulkArchiveLibraryComponentsInput): Promise<BulkActionExecutionResult> {
  const { ids, issues } = normalizeBulkActionIds(input.itemIds, { label: "components", max: 500 });
  if (issues.length > 0) {
    return {
      ...buildRejectedPreviewResult("library_component", ids, issues),
      archivedIds: [],
    };
  }

  const [{ workspace }, currentUser] = await Promise.all([
    ensureDefaultWorkspace(),
    requireCurrentUserContext(),
  ]);
  const database = await requireComponentLibraryActionsD1Database();
  await assertCanManageLibrary(database, workspace.id, currentUser);
  const preview = await previewBulkArchiveLibraryComponents({ itemIds: ids });
  if (preview.previewHash !== input.expectedPreviewHash) {
    return {
      ...preview,
      ok: false,
      archivedIds: [],
      issues: [
        ...preview.issues,
        { code: "stale_preview", message: "Preview changed; refresh the archive preview." },
      ],
    };
  }
  if (!preview.ok) {
    return {
      ...preview,
      archivedIds: [],
    };
  }
  const archivedIds = preview.eligibleIds;
  await run(
    database,
    `
      UPDATE cost_library_items
      SET lifecycle_state = 'archived',
          lifecycle_state_changed_at = ?,
          lifecycle_state_changed_by = ?,
          updated_at = ?
      WHERE workspace_id = ?
        AND id IN (${placeholders(archivedIds)})
    `,
    [nowIso(), currentUser.userId, nowIso(), workspace.id, ...archivedIds],
  );
  const result = coerceBulkExecutionResult({
    ok: true,
    targetType: "library_component",
    ids,
    archivedIds,
    previewHash: input.expectedPreviewHash,
    summary: preview.summary,
    issues: [],
    blocked: [],
  }, { targetType: "library_component", ids });
  if (result.ok) revalidateLibraryRoutes();
  return result;
}

async function readLibraryComponentUsageTotals(
  database: D1DatabaseLike,
  workspaceId: string,
  itemIds: string[],
) {
  if (itemIds.length === 0) return { estimateRowCount: 0, templateRowCount: 0 };
  const [estimateRows, templateRows] = await Promise.all([
    first<{ count: number }>(
      database,
      `
        SELECT COUNT(*) AS count
        FROM estimate_row_items row_item
        INNER JOIN estimates estimate ON estimate.id = row_item.estimate_id
        INNER JOIN projects project ON project.id = estimate.project_id
        WHERE project.workspace_id = ?
          AND row_item.source_library_item_id IN (${placeholders(itemIds)})
      `,
      [workspaceId, ...itemIds],
    ),
    first<{ count: number }>(
      database,
      `
        SELECT COUNT(*) AS count
        FROM estimate_template_row_items row_item
        INNER JOIN estimate_templates template ON template.id = row_item.template_id
        WHERE template.workspace_id = ?
          AND row_item.source_library_item_id IN (${placeholders(itemIds)})
      `,
      [workspaceId, ...itemIds],
    ),
  ]);
  return {
    estimateRowCount: numberValue(estimateRows?.count),
    templateRowCount: numberValue(templateRows?.count),
  };
}

export async function previewBulkDeleteLibraryComponents(input: BulkDeleteLibraryComponentsInput): Promise<BulkActionPreviewResult> {
  const { ids, issues } = normalizeBulkActionIds(input.itemIds, { label: "components", max: 500 });
  if (issues.length > 0) return buildRejectedPreviewResult("library_component", ids, issues);

  const [{ workspace }, currentUser] = await Promise.all([
    ensureDefaultWorkspace(),
    requireCurrentUserContext(),
  ]);
  const database = await requireComponentLibraryActionsD1Database();
  await assertCanManageLibrary(database, workspace.id, currentUser);
  const sortedIds = [...ids].sort();
  const rows = await all<{ id: string; name: string }>(
    database,
    `
      SELECT id, name
      FROM cost_library_items
      WHERE workspace_id = ?
        AND id IN (${placeholders(sortedIds)})
    `,
    [workspace.id, ...sortedIds],
  );
  const byId = new Map(rows.map((row) => [row.id, row]));
  const eligibleIds: string[] = [];
  const blocked = [];
  for (const id of sortedIds) {
    const row = byId.get(id);
    if (!row) {
      blocked.push({ id, code: "not_found", message: "Component was not found in this workspace." });
      continue;
    }
    eligibleIds.push(id);
  }
  const usage = await readLibraryComponentUsageTotals(database, workspace.id, eligibleIds);
  const summary = {
    requestedCount: sortedIds.length,
    eligibleCount: eligibleIds.length,
    blockedCount: blocked.length,
    ...usage,
  };
  return coerceBulkPreviewResult({
    ok: eligibleIds.length > 0 && blocked.length === 0,
    targetType: "library_component",
    ids: sortedIds,
    eligibleIds,
    previewHash: createBulkDeletePreviewHash({ eligibleIds, blocked, summary }),
    summary,
    issues: blocked,
    blocked,
  }, { targetType: "library_component", ids: sortedIds });
}

export async function executeBulkDeleteLibraryComponents(input: ExecuteBulkDeleteLibraryComponentsInput): Promise<BulkActionExecutionResult> {
  const { ids, issues } = normalizeBulkActionIds(input.itemIds, { label: "components", max: 500 });
  if (issues.length > 0) {
    return {
      ...buildRejectedPreviewResult("library_component", ids, issues),
      deletedIds: [],
    };
  }

  const [{ workspace }, currentUser] = await Promise.all([
    ensureDefaultWorkspace(),
    requireCurrentUserContext(),
  ]);
  const database = await requireComponentLibraryActionsD1Database();
  await assertCanManageLibrary(database, workspace.id, currentUser);
  const preview = await previewBulkDeleteLibraryComponents({ itemIds: ids });
  if (preview.previewHash !== input.expectedPreviewHash) {
    return {
      ...preview,
      ok: false,
      deletedIds: [],
      issues: [
        ...preview.issues,
        { code: "stale_preview", message: "Preview changed; refresh the deletion preview." },
      ],
    };
  }
  if (!preview.ok) return { ...preview, deletedIds: [] };

  const deletedIds = preview.eligibleIds;
  const affectedRows = await all<LinkedEstimateRowTarget>(
    database,
    `
      SELECT row_item.id AS row_id, project.id AS project_id, estimate.id AS estimate_id
      FROM estimate_row_items row_item
      INNER JOIN estimates estimate ON estimate.id = row_item.estimate_id
      INNER JOIN projects project ON project.id = estimate.project_id
      WHERE project.workspace_id = ?
        AND row_item.source_library_item_id IN (${placeholders(deletedIds)})
    `,
    [workspace.id, ...deletedIds],
  );
  const deniedEstimateIds: string[] = [];
  for (const estimateId of new Set(affectedRows.map((row) => row.estimate_id))) {
    const allowed = await canEditEstimateInD1(database, estimateId, currentUser);
    if (!allowed) deniedEstimateIds.push(estimateId);
  }
  if (deniedEstimateIds.length > 0) {
    const blocked = deniedEstimateIds.map((estimateId) => ({
      id: estimateId,
      code: "estimate_access_denied",
      message: "You need edit access to every linked estimate before permanently deleting this component.",
    }));
    return coerceBulkExecutionResult({
      ...preview,
      ok: false,
      deletedIds: [],
      issues: [...preview.issues, ...blocked],
      blocked: [...preview.blocked, ...blocked],
    }, { targetType: "library_component", ids });
  }

  const timestamp = nowIso();
  await runAtomicBatch(database, [{
    sql: `
      DELETE FROM estimate_row_items
      WHERE source_library_item_id IN (${placeholders(deletedIds)})
        AND estimate_id IN (
          SELECT estimate.id
          FROM estimates estimate
          INNER JOIN projects project ON project.id = estimate.project_id
          WHERE project.workspace_id = ?
        )
    `,
    values: [...deletedIds, workspace.id],
  }, {
    sql: `
      DELETE FROM estimate_template_row_items
      WHERE source_library_item_id IN (${placeholders(deletedIds)})
        AND template_id IN (
          SELECT id
          FROM estimate_templates
          WHERE workspace_id = ?
        )
    `,
    values: [...deletedIds, workspace.id],
  }, {
    sql: `
      UPDATE upload_assets
      SET status = 'removed',
          updated_at = ?
      WHERE id IN (
        SELECT attachment.upload_asset_id
        FROM component_variant_attachments attachment
        WHERE attachment.owner_scope = 'library'
          AND attachment.workspace_id = ?
          AND attachment.item_id IN (${placeholders(deletedIds)})
      )
    `,
    values: [timestamp, workspace.id, ...deletedIds],
  }, {
    sql: `
      DELETE FROM cost_library_items
      WHERE workspace_id = ?
        AND id IN (${placeholders(deletedIds)})
    `,
    values: [workspace.id, ...deletedIds],
  }]);

  revalidateLinkedEstimateRows(affectedRows);
  revalidateTemplateSurfaces();
  revalidateLibraryRoutes();
  return coerceBulkExecutionResult({
    ok: true,
    targetType: "library_component",
    ids,
    deletedIds,
    previewHash: input.expectedPreviewHash,
    summary: preview.summary,
    issues: [],
    blocked: [],
  }, { targetType: "library_component", ids });
}

export async function createLibraryFolder(parentId: string | null, name: string, options: CreateLibraryFolderOptions = {}): Promise<LibraryFolderActionResult> {
  const [{ workspace }, currentUser] = await Promise.all([ensureDefaultWorkspace(), requireCurrentUserContext()]);
  const database = await requireComponentLibraryActionsD1Database();
  await assertCanManageLibraryFolders(database, workspace.id, currentUser);
  const parentResult = parentId
    ? await first<{ id: string; workspace_id: string }>(
        database,
        "SELECT id, workspace_id FROM library_folders WHERE id = ? AND workspace_id = ? LIMIT 1",
        [parentId, workspace.id],
      )
    : null;

  if (parentId && !parentResult) throw new Error("Parent folder not found in the current workspace.");

  const siblings = await all<{ id: string; sort_order: number }>(
    database,
    parentId
      ? "SELECT id, sort_order FROM library_folders WHERE workspace_id = ? AND parent_id = ?"
      : "SELECT id, sort_order FROM library_folders WHERE workspace_id = ? AND parent_id IS NULL",
    parentId ? [workspace.id, parentId] : [workspace.id],
  );

  const placement = options.placement ?? "bottom";
  const siblingRows = siblings ?? [];
  const nextSortOrder = getLibraryFolderCreateSortOrder(siblingRows, placement);
  if (placement === "top" && siblingRows.some((sibling) => sibling.sort_order === nextSortOrder)) {
    const sortedSiblings = [...siblingRows].sort((left, right) => right.sort_order - left.sort_order);
    for (const sibling of sortedSiblings) {
      await run(
        database,
        "UPDATE library_folders SET sort_order = ?, updated_at = ? WHERE id = ? AND workspace_id = ?",
        [sibling.sort_order + LIBRARY_FOLDER_SORT_ORDER_STEP, nowIso(), sibling.id, workspace.id],
      );
    }
  }
  const folderId = randomUUID();
  const timestamp = nowIso();
  await run(
    database,
    `
      INSERT INTO library_folders (
        id, workspace_id, parent_id, name, sort_order, folder_kind,
        created_by, created_at, updated_at
      )
      VALUES (?, ?, ?, ?, ?, 'custom', ?, ?, ?)
    `,
    [folderId, workspace.id, parentId, readFolderName(name), nextSortOrder, currentUser.userId, timestamp, timestamp],
  );
  const data = await first<LibraryFolderRow>(database, "SELECT * FROM library_folders WHERE id = ? LIMIT 1", [folderId]);
  if (!data) throw new Error("Could not create folder.");
  revalidateLibraryRoutes();
  return { folder: data };
}

export async function renameLibraryFolder(folderId: string, name: string): Promise<LibraryFolderActionResult> {
  const [{ workspace }, currentUser] = await Promise.all([ensureDefaultWorkspace(), requireCurrentUserContext()]);
  const database = await requireComponentLibraryActionsD1Database();
  await assertCanManageLibraryFolders(database, workspace.id, currentUser);
  await run(
    database,
    "UPDATE library_folders SET name = ?, updated_at = ? WHERE id = ? AND workspace_id = ?",
    [readFolderName(name), nowIso(), folderId, workspace.id],
  );
  const data = await first<LibraryFolderRow>(database, "SELECT * FROM library_folders WHERE id = ? AND workspace_id = ? LIMIT 1", [folderId, workspace.id]);
  if (!data) throw new Error("Folder not found in the current workspace.");
  revalidateLibraryRoutes();
  return { folder: data };
}

export async function deleteLibraryFolder(folderId: string): Promise<void> {
  const [{ workspace }, currentUser] = await Promise.all([ensureDefaultWorkspace(), requireCurrentUserContext()]);
  const database = await requireComponentLibraryActionsD1Database();
  await assertCanManageLibraryFolders(database, workspace.id, currentUser);
  if (!isUuid(folderId)) throw new Error("Library folder not found in the current workspace.");

  const folder = await first<LibraryFolderRow>(database, "SELECT * FROM library_folders WHERE id = ? AND workspace_id = ? LIMIT 1", [folderId, workspace.id]);
  if (!folder) throw new Error("Library folder not found in the current workspace.");
  await runBatch(database, [
    {
      sql: "UPDATE library_folders SET parent_id = ?, updated_at = ? WHERE workspace_id = ? AND parent_id = ?",
      values: [folder.parent_id, nowIso(), workspace.id, folderId],
    },
    {
      sql: "UPDATE cost_library_items SET library_folder_id = NULL, updated_at = ? WHERE workspace_id = ? AND library_folder_id = ?",
      values: [nowIso(), workspace.id, folderId],
    },
    {
      sql: "DELETE FROM library_folders WHERE id = ? AND workspace_id = ?",
      values: [folderId, workspace.id],
    },
  ]);

  revalidateLibraryRoutes();
}

export async function reorderLibraryFolders(input: ReorderLibraryFoldersInput): Promise<void> {
  const currentUser = await requireCurrentUserContext();
  if (!input.updates.length) throw new Error("At least one library folder update is required.");

  const { workspace } = await ensureDefaultWorkspace();
  const database = await requireComponentLibraryActionsD1Database();
  await assertCanManageLibraryFolders(database, workspace.id, currentUser);
  const validUpdates = input.updates.map((update) => {
    if (!isUuid(update.id)) throw new Error("Library folder not found in the current workspace.");
    if (update.parentId && !isUuid(update.parentId)) throw new Error("Library folder not found in the current workspace.");
    return update;
  });
  await runBatch(database, validUpdates.map((update) => ({
    sql: "UPDATE library_folders SET parent_id = ?, sort_order = ?, updated_at = ? WHERE id = ? AND workspace_id = ?",
    values: [update.parentId, update.sortOrder, nowIso(), update.id, workspace.id],
  })));
  revalidateLibraryRoutes();
}

export async function moveCostLibraryComponentToFolder(input: MoveCostLibraryComponentToFolderInput): Promise<void> {
  const [{ workspace }, currentUser] = await Promise.all([
    ensureDefaultWorkspace(),
    requireCurrentUserContext(),
  ]);
  const database = await requireComponentLibraryActionsD1Database();
  await assertCanManageLibraryFolders(database, workspace.id, currentUser);

  if (!isUuid(input.itemId)) throw new Error("Component not found in the current workspace.");

  const targetFolderId = await assertLibraryFolderInWorkspace(database, workspace.id, input.libraryFolderId);
  await run(
    database,
    "UPDATE cost_library_items SET library_folder_id = ?, updated_at = ? WHERE id = ? AND workspace_id = ?",
    [targetFolderId, nowIso(), input.itemId, workspace.id],
  );
  const component = await first<{ id: string }>(database, "SELECT id FROM cost_library_items WHERE id = ? AND workspace_id = ? LIMIT 1", [input.itemId, workspace.id]);
  if (!component) throw new Error("Component not found in the current workspace.");
  revalidateLibraryRoutes();
}

type EstimateTemplateD1Row = {
  id: string;
  workspace_id: string;
  name: string;
  description: string;
  category: string;
  sort_order: number;
  metadata: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

type EstimateTemplateNodeD1Row = {
  id: string;
  template_id: string;
  parent_id: string | null;
  kind: string;
  name: string;
  sort_order: number;
  metadata: string | null;
  created_at: string;
  updated_at: string;
};

type EstimateTemplateRowItemD1Row = {
  id: string;
  template_id: string;
  template_node_id: string;
  sort_order: number;
  source_library_item_id: string | null;
  source_snapshot: string | null;
  category_node_id: string | null;
  supplier_id: string | null;
  material: string;
  description: string;
  supplier: string;
  unit: string;
  quantity: number | string;
  unit_cost: number | string;
  misc_cost: number | string;
  contingency_percentage: number | string;
  adjustment_percentage: number | string;
  discipline: string;
  designation: string;
  link_state: string;
  metadata: string | null;
  created_at: string;
  updated_at: string;
};

type EstimateSourceRowD1 = {
  id: string;
  project_id: string;
  workspace_id: string;
};

type EstimateNodeSourceRowD1 = {
  id: string;
  parent_id: string | null;
  kind: string;
  name: string;
  sort_order: number;
};

type EstimateTabNodeSourceRowD1 = EstimateNodeSourceRowD1 & {
  kind: "group" | "area";
};

type EstimateRowItemSourceD1 = {
  id: string;
  node_id: string;
  sort_order: number;
  source_library_item_id: string | null;
  source_snapshot_json: string | null;
  category_node_id: string | null;
  supplier_id: string | null;
  material: string;
  description: string;
  supplier: string | null;
  unit: string;
  quantity: number | string;
  unit_cost: number | string;
  contingency_percentage: number | string;
  adjustment_percentage: number | string;
  misc_cost: number | string;
  discipline: string;
  designation: string;
  link_state: string | null;
  metadata_json: string | null;
};

function toTemplateRow(row: EstimateTemplateD1Row): EstimateTemplateTableRow {
  return {
    ...row,
    metadata: readJsonValue(row.metadata, {}),
  } as EstimateTemplateTableRow;
}

function toTemplateNodeRow(row: EstimateTemplateNodeD1Row): EstimateTemplateNodeTableRow {
  return {
    ...row,
    metadata: readJsonValue(row.metadata, {}),
  } as EstimateTemplateNodeTableRow;
}

function toTemplateRowItem(row: EstimateTemplateRowItemD1Row): EstimateTemplateRowItemTableRow {
  return {
    ...row,
    quantity: numberValue(row.quantity),
    unit_cost: numberValue(row.unit_cost),
    misc_cost: numberValue(row.misc_cost),
    contingency_percentage: numberValue(row.contingency_percentage),
    adjustment_percentage: numberValue(row.adjustment_percentage),
    source_snapshot: readJsonValue(row.source_snapshot, {}),
    metadata: readJsonValue(row.metadata, {}),
  } as EstimateTemplateRowItemTableRow;
}

async function readEstimateForTemplateSource(database: D1DatabaseLike, input: { projectId: string; estimateId: string }) {
  return first<EstimateSourceRowD1>(
    database,
    `
      SELECT estimate.id, estimate.project_id, project.workspace_id
      FROM estimates estimate
      JOIN projects project ON project.id = estimate.project_id
      WHERE estimate.id = ?
        AND estimate.project_id = ?
      LIMIT 1
    `,
    [input.estimateId, input.projectId],
  );
}

async function readNextTemplateSortOrder(database: D1DatabaseLike, workspaceId: string, category?: string) {
  const row = await first<{ sort_order: number | null }>(
    database,
    category
      ? "SELECT sort_order FROM estimate_templates WHERE workspace_id = ? AND category = ? ORDER BY sort_order DESC LIMIT 1"
      : "SELECT sort_order FROM estimate_templates WHERE workspace_id = ? ORDER BY sort_order DESC LIMIT 1",
    category ? [workspaceId, category] : [workspaceId],
  );
  return numberValue(row?.sort_order, -1) + 1;
}

async function insertTemplate(database: D1DatabaseLike, input: {
  workspaceId: string;
  name: string;
  description: string;
  category: string;
  sortOrder: number;
  createdBy: string;
  metadata: Record<string, unknown>;
}) {
  const id = randomUUID();
  const timestamp = nowIso();
  await run(
    database,
    `
      INSERT INTO estimate_templates (
        id, workspace_id, name, description, category, sort_order,
        metadata, created_by, created_at, updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    [
      id,
      input.workspaceId,
      input.name,
      input.description,
      input.category,
      input.sortOrder,
      jsonText(input.metadata),
      input.createdBy,
      timestamp,
      timestamp,
    ],
  );
  const row = await first<EstimateTemplateD1Row>(database, "SELECT * FROM estimate_templates WHERE id = ? LIMIT 1", [id]);
  if (!row) throw new Error("Could not read back the created template.");
  return toTemplateRow(row);
}

function templateRowInsertValues(
  templateId: string,
  templateNodeId: string,
  row: EstimateRowItemSourceD1,
): D1Value[] {
  const timestamp = nowIso();
  return [
    randomUUID(),
    templateId,
    templateNodeId,
    numberValue(row.sort_order),
    row.source_library_item_id,
    row.source_snapshot_json ?? "{}",
    row.category_node_id,
    row.supplier_id,
    row.material,
    row.description,
    row.supplier ?? "",
    row.unit,
    numberValue(row.quantity),
    numberValue(row.unit_cost),
    numberValue(row.misc_cost),
    0,
    numberValue(row.adjustment_percentage, numberValue(row.contingency_percentage)),
    row.discipline,
    row.designation,
    row.link_state ?? "unlinked",
    row.metadata_json ?? "{}",
    timestamp,
    timestamp,
  ];
}

const INSERT_TEMPLATE_NODE_SQL = `
  INSERT INTO estimate_template_nodes (
    id, template_id, parent_id, kind, name, sort_order, metadata, created_at, updated_at
  )
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
`;

const INSERT_TEMPLATE_ROW_ITEM_SQL = `
  INSERT INTO estimate_template_row_items (
    id, template_id, template_node_id, sort_order, source_library_item_id,
    source_snapshot, category_node_id, supplier_id, material, description,
    supplier, unit, quantity, unit_cost, misc_cost, contingency_percentage,
    adjustment_percentage, discipline, designation, link_state, metadata,
    created_at, updated_at
  )
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`;

function templateNodeInsertStatement(input: {
  id: string;
  templateId: string;
  parentId: string | null;
  kind: "group" | "area";
  name: string;
  sortOrder: number;
  metadata?: Record<string, unknown>;
}) {
  const timestamp = nowIso();
  return {
    sql: INSERT_TEMPLATE_NODE_SQL,
    values: [
      input.id,
      input.templateId,
      input.parentId,
      input.kind,
      input.name,
      input.sortOrder,
      jsonText(input.metadata ?? {}),
      timestamp,
      timestamp,
    ] as D1Value[],
  };
}

function templateRowItemInsertStatement(
  templateId: string,
  templateNodeId: string,
  row: EstimateRowItemSourceD1,
) {
  return {
    sql: INSERT_TEMPLATE_ROW_ITEM_SQL,
    values: templateRowInsertValues(templateId, templateNodeId, row),
  };
}

function copiedTemplateRowInsertValues(
  templateId: string,
  templateNodeId: string,
  row: EstimateTemplateRowItemD1Row,
): D1Value[] {
  const timestamp = nowIso();
  return [
    randomUUID(),
    templateId,
    templateNodeId,
    numberValue(row.sort_order),
    row.source_library_item_id,
    row.source_snapshot,
    row.category_node_id,
    row.supplier_id,
    row.material,
    row.description,
    row.supplier,
    row.unit,
    numberValue(row.quantity),
    numberValue(row.unit_cost),
    numberValue(row.misc_cost),
    numberValue(row.contingency_percentage),
    numberValue(row.adjustment_percentage),
    row.discipline,
    row.designation,
    row.link_state,
    row.metadata ?? "{}",
    timestamp,
    timestamp,
  ];
}

function copiedTemplateRowItemInsertStatement(
  templateId: string,
  templateNodeId: string,
  row: EstimateTemplateRowItemD1Row,
) {
  return {
    sql: INSERT_TEMPLATE_ROW_ITEM_SQL,
    values: copiedTemplateRowInsertValues(templateId, templateNodeId, row),
  };
}

async function readTemplateBuildRows(database: D1DatabaseLike, templateId: string) {
  const [template, nodes, rows] = await Promise.all([
    first<EstimateTemplateD1Row>(database, "SELECT * FROM estimate_templates WHERE id = ? LIMIT 1", [templateId]),
    all<EstimateTemplateNodeD1Row>(database, "SELECT * FROM estimate_template_nodes WHERE template_id = ? ORDER BY sort_order ASC", [templateId]),
    all<EstimateTemplateRowItemD1Row>(database, "SELECT * FROM estimate_template_row_items WHERE template_id = ? ORDER BY sort_order ASC", [templateId]),
  ]);
  if (!template) return null;
  return {
    templates: [toTemplateRow(template)],
    nodes: nodes.map(toTemplateNodeRow),
    rowItems: rows.map(toTemplateRowItem),
  };
}

export type CreateEstimateTemplateFromNodeInput = {
  projectId: string;
  estimateId: string;
  sourceNodeId: string;
  name: string;
  description?: string;
  category?: string;
};

type EstimateNodeSubtreeRow = {
  id: string;
  parent_id: string | null;
  kind: string;
  name: string;
  sort_order: number;
};

/**
 * Saves an estimate node (group or area) and its whole subtree — child
 * nodes plus estimate rows — as a reusable workspace template. The server
 * reads the subtree authoritatively; clients only send identifiers, never
 * tree payloads. Workspace editors also need edit access to the source
 * estimate before its nodes and rows can be copied into shared templates.
 */
export async function createEstimateTemplateFromEstimateNode(input: CreateEstimateTemplateFromNodeInput) {
  const currentUser = await requireCurrentUserContext();
  const database = await requireComponentLibraryActionsD1Database();

  const templateName = input.name.trim();
  if (!templateName) throw new Error("Template name is required.");
  const templateCategory = (input.category ?? "").trim() || "General";
  const templateDescription = (input.description ?? "").trim();
  if (!isUuid(input.projectId) || !isUuid(input.estimateId) || !isUuid(input.sourceNodeId)) {
    throw new Error("Estimate node not found in the current workspace.");
  }

  const estimate = await readEstimateForTemplateSource(database, {
    projectId: input.projectId,
    estimateId: input.estimateId,
  });
  if (!estimate) throw new Error("Estimate not found in the current workspace.");
  await assertCanManageLibrary(database, estimate.workspace_id, currentUser);
  await assertCanPublishEstimateTemplateFromEstimate(database, input.estimateId, currentUser);
  await assertWithinLibraryQuota(database, "estimate_templates", estimate.workspace_id, LIBRARY_TEMPLATE_CAP, "template");

  const nodeRows = await all<EstimateNodeSubtreeRow>(
    database,
    `
      SELECT id, parent_id, kind, name, sort_order
      FROM estimate_nodes
      WHERE estimate_id = ?
      ORDER BY sort_order ASC
    `,
    [input.estimateId],
  );

  const allNodes = nodeRows;
  const sourceNode = allNodes.find((node) => node.id === input.sourceNodeId);
  if (!sourceNode) throw new Error("The selected node no longer exists in this estimate.");

  // Collect the subtree in breadth-first order so parents precede children.
  const childrenByParentId = new Map<string | null, EstimateNodeSubtreeRow[]>();
  for (const node of allNodes) {
    const siblings = childrenByParentId.get(node.parent_id) ?? [];
    siblings.push(node);
    childrenByParentId.set(node.parent_id, siblings);
  }
  const subtreeNodes: EstimateNodeSubtreeRow[] = [];
  const queue: EstimateNodeSubtreeRow[] = [sourceNode];
  while (queue.length > 0) {
    const node = queue.shift()!;
    subtreeNodes.push(node);
    queue.push(...(childrenByParentId.get(node.id) ?? []));
  }

  const subtreeNodeIds = subtreeNodes.map((node) => node.id);
  const rowItemRows = subtreeNodeIds.length
    ? await all<EstimateRowItemSourceD1>(
        database,
        `
          SELECT id, node_id, sort_order, source_library_item_id, source_snapshot_json,
            category_node_id, supplier_id, material, description, supplier, unit,
            quantity, unit_cost, contingency_percentage, adjustment_percentage,
            misc_cost, discipline, designation, link_state, metadata_json
          FROM estimate_row_items
          WHERE estimate_id = ?
            AND node_id IN (${placeholders(subtreeNodeIds)})
          ORDER BY sort_order ASC
        `,
        [input.estimateId, ...subtreeNodeIds],
      )
    : [];

  const insertedTemplate = await insertTemplate(database, {
    workspaceId: estimate.workspace_id,
    name: templateName,
    description: templateDescription,
    category: templateCategory,
    sortOrder: await readNextTemplateSortOrder(database, estimate.workspace_id),
    createdBy: currentUser.userId,
    metadata: {
      savedFrom: "estimate-workspace",
      sourceEstimateId: input.estimateId,
      sourceNodeId: input.sourceNodeId,
    },
  });

  try {
    const templateNodeIdBySourceId = new Map<string, string>(subtreeNodes.map((node) => [node.id, randomUUID()]));
    const templateNodeStatements = subtreeNodes.map((node) => {
      const kind = normalizeEstimateTreeNodeKind(node.kind);
      if (!kind) throw new Error("Could not copy the node structure.");
      return templateNodeInsertStatement({
        id: templateNodeIdBySourceId.get(node.id)!,
        templateId: insertedTemplate.id,
        // The saved node becomes the template root; descendants keep shape.
        parentId: node.id === sourceNode.id ? null : templateNodeIdBySourceId.get(node.parent_id ?? "") ?? null,
        kind,
        name: node.name,
        sortOrder: node.id === sourceNode.id ? 0 : node.sort_order,
      });
    });

    const rowStatements = rowItemRows.map((row) => {
      const templateNodeId = templateNodeIdBySourceId.get(row.node_id);
      if (!templateNodeId) throw new Error("Could not copy the estimate rows.");
      return templateRowItemInsertStatement(insertedTemplate.id, templateNodeId, row);
    });
    await runBatch(database, [...templateNodeStatements, ...rowStatements]);

    revalidateTemplateSurfaces();

    const buildRows = await readTemplateBuildRows(database, insertedTemplate.id);
    const [template] = buildRows ? buildEstimateTemplatesFromRows(buildRows) : [];
    if (!template) throw new Error("Could not read back the created template.");
    return { template };
  } catch (error) {
    // Without a cross-statement transaction, a partial failure leaves an
    // orphan template; deleting it cascades to any copied nodes/rows.
    await run(database, "DELETE FROM estimate_templates WHERE id = ?", [insertedTemplate.id]);
    throw error;
  }
}

export type CreateEstimateTemplateFromTabInput = {
  projectId: string;
  estimateId: string;
  tabId: string;
  tabName: string;
  name: string;
  description?: string;
  category?: string;
};

type EstimateTabTemplateNodeRow = EstimateNodeSubtreeRow & {
  kind: "group" | "area";
};

export async function createEstimateTemplateFromEstimateTab(input: CreateEstimateTemplateFromTabInput) {
  const currentUser = await requireCurrentUserContext();
  const database = await requireComponentLibraryActionsD1Database();

  const templateName = input.name.trim();
  if (!templateName) throw new Error("Template name is required.");
  const templateCategory = (input.category ?? "").trim() || "General";
  const templateDescription = (input.description ?? "").trim();
  const sourceTabName = input.tabName.trim() || "Project tab";
  if (!isUuid(input.projectId) || !isUuid(input.estimateId) || !isUuid(input.tabId)) {
    throw new Error("Estimate tab not found in the current workspace.");
  }

  const estimate = await readEstimateForTemplateSource(database, {
    projectId: input.projectId,
    estimateId: input.estimateId,
  });
  if (!estimate) throw new Error("Estimate not found in the current workspace.");
  await assertCanManageLibrary(database, estimate.workspace_id, currentUser);
  await assertCanPublishEstimateTemplateFromEstimate(database, input.estimateId, currentUser);
  await assertWithinLibraryQuota(database, "estimate_templates", estimate.workspace_id, LIBRARY_TEMPLATE_CAP, "template");

  const nodeRows = await all<EstimateTabTemplateNodeRow>(
    database,
    `
      SELECT id, parent_id, kind, name, sort_order
      FROM estimate_nodes
      WHERE estimate_id = ?
        AND estimate_tab_id = ?
      ORDER BY sort_order ASC
    `,
    [input.estimateId, input.tabId],
  );

  const sourceNodes: EstimateTabTemplateNodeRow[] = [];
  for (const node of nodeRows) {
    const kind = normalizeEstimateTreeNodeKind(node.kind);
    if (!kind) continue;
    sourceNodes.push({ ...node, kind });
  }
  if (sourceNodes.length === 0) throw new Error("The selected tab has no estimate nodes to save.");

  const sourceNodeIds = sourceNodes.map((node) => node.id);
  const rowItemRows = await all<EstimateRowItemSourceD1>(
    database,
    `
      SELECT id, node_id, sort_order, source_library_item_id, source_snapshot_json,
        category_node_id, supplier_id, material, description, supplier, unit,
        quantity, unit_cost, contingency_percentage, adjustment_percentage,
        misc_cost, discipline, designation, link_state, metadata_json
      FROM estimate_row_items
      WHERE estimate_id = ?
        AND node_id IN (${placeholders(sourceNodeIds)})
      ORDER BY sort_order ASC
    `,
    [input.estimateId, ...sourceNodeIds],
  );

  const insertedTemplate = await insertTemplate(database, {
    workspaceId: estimate.workspace_id,
    name: templateName,
    description: templateDescription,
    category: templateCategory,
    sortOrder: await readNextTemplateSortOrder(database, estimate.workspace_id),
    createdBy: currentUser.userId,
    metadata: {
      savedFrom: "estimate-workspace-tab",
      sourceEstimateId: input.estimateId,
      sourceTabId: input.tabId,
      sourceTabName,
    },
  });

  try {
    const wrapperNodeId = randomUUID();
    const templateNodeIdBySourceId = new Map<string, string>(sourceNodes.map((node) => [node.id, randomUUID()]));
    const sourceNodeIdSet = new Set(sourceNodeIds);
    const copiedNodeStatements = sourceNodes.map((node) => {
      const templateNodeId = templateNodeIdBySourceId.get(node.id);
      if (!templateNodeId) throw new Error("Could not map the estimate tab tree.");
      const mappedParentId = node.parent_id && sourceNodeIdSet.has(node.parent_id)
        ? templateNodeIdBySourceId.get(node.parent_id) ?? wrapperNodeId
        : wrapperNodeId;
      return templateNodeInsertStatement({
        id: templateNodeId,
        templateId: insertedTemplate.id,
        parentId: mappedParentId,
        kind: node.kind,
        name: node.name,
        sortOrder: node.sort_order,
      });
    });
    const templateNodeStatements = [
      templateNodeInsertStatement({
        id: wrapperNodeId,
        templateId: insertedTemplate.id,
        parentId: null,
        kind: "group",
        name: sourceTabName,
        sortOrder: 0,
      }),
      ...copiedNodeStatements,
    ];

    const rowStatements = rowItemRows.map((row) => {
      const templateNodeId = templateNodeIdBySourceId.get(row.node_id);
      if (!templateNodeId) throw new Error("Could not map the estimate tab rows.");
      return templateRowItemInsertStatement(insertedTemplate.id, templateNodeId, row);
    });
    await runBatch(database, [...templateNodeStatements, ...rowStatements]);

    revalidateTemplateSurfaces();

    const buildRows = await readTemplateBuildRows(database, insertedTemplate.id);
    const [template] = buildRows ? buildEstimateTemplatesFromRows(buildRows) : [];
    if (!template) throw new Error("Could not read back the created template.");
    return { template };
  } catch (error) {
    await run(database, "DELETE FROM estimate_templates WHERE id = ?", [insertedTemplate.id]);
    throw error;
  }
}

/** Renames a workspace estimate template. */
export async function renameEstimateTemplate(input: { templateId: string; name: string }) {
  const [{ workspace }, currentUser] = await Promise.all([ensureDefaultWorkspace(), requireCurrentUserContext()]);
  const templateName = input.name.trim();
  if (!templateName) throw new Error("Template name is required.");
  if (!isUuid(input.templateId)) throw new Error("Template not found in the current workspace.");

  const database = await requireComponentLibraryActionsD1Database();
  await assertCanManageLibrary(database, workspace.id, currentUser);
  await run(
    database,
    "UPDATE estimate_templates SET name = ?, updated_at = ? WHERE id = ? AND workspace_id = ?",
    [templateName, nowIso(), input.templateId, workspace.id],
  );
  const template = await first<{ id: string; name: string }>(
    database,
    "SELECT id, name FROM estimate_templates WHERE id = ? AND workspace_id = ? LIMIT 1",
    [input.templateId, workspace.id],
  );
  if (!template) throw new Error("Template not found in the current workspace.");
  revalidateTemplateSurfaces();
  return { templateId: template.id, name: template.name };
}

/** Deletes a workspace estimate template; nodes and rows cascade. */
export async function deleteEstimateTemplate(input: { templateId: string }) {
  const [{ workspace }, currentUser] = await Promise.all([ensureDefaultWorkspace(), requireCurrentUserContext()]);
  if (!isUuid(input.templateId)) throw new Error("Template not found in the current workspace.");

  const database = await requireComponentLibraryActionsD1Database();
  await assertCanManageLibrary(database, workspace.id, currentUser);
  const template = await first<{ id: string }>(
    database,
    "SELECT id FROM estimate_templates WHERE id = ? AND workspace_id = ? LIMIT 1",
    [input.templateId, workspace.id],
  );
  if (!template) throw new Error("Template not found in the current workspace.");
  await run(database, "DELETE FROM estimate_templates WHERE id = ? AND workspace_id = ?", [input.templateId, workspace.id]);
  revalidateTemplateSurfaces();
  return { templateId: template.id };
}

/**
 * Creates an empty workspace estimate template (no nodes, no rows). The
 * Templates browse "New template" flow uses this when there is no estimate
 * node to capture; the template editor fills in the structure later.
 */
export async function createEstimateTemplate(input: { name: string; category?: string; description?: string }) {
  const [{ workspace }, currentUser] = await Promise.all([ensureDefaultWorkspace(), requireCurrentUserContext()]);
  const templateName = input.name.trim();
  if (!templateName) throw new Error("Template name is required.");
  const templateCategory = (input.category ?? "").trim() || "General";
  const templateDescription = (input.description ?? "").trim();

  const database = await requireComponentLibraryActionsD1Database();
  await assertCanManageLibrary(database, workspace.id, currentUser);
  await assertWithinLibraryQuota(database, "estimate_templates", workspace.id, LIBRARY_TEMPLATE_CAP, "template");
  const insertedTemplate = await insertTemplate(database, {
    workspaceId: workspace.id,
    name: templateName,
    description: templateDescription,
    category: templateCategory,
    sortOrder: await readNextTemplateSortOrder(database, workspace.id),
    createdBy: currentUser.userId,
    metadata: { savedFrom: "library-templates-browse" },
  });

  revalidateTemplateSurfaces();

  const [template] = buildEstimateTemplatesFromRows({
    templates: [insertedTemplate],
    nodes: [],
    rowItems: [],
  });
  if (!template) throw new Error("Could not read back the created template.");
  return { template };
}

/**
 * Copies a workspace estimate template: the template row plus every node and
 * every row item (all columns). The copy lands in the same category with the
 * next sort_order in that category and the name `{name} copy`.
 */
export async function duplicateEstimateTemplate(input: { templateId: string }) {
  const [{ workspace }, currentUser] = await Promise.all([ensureDefaultWorkspace(), requireCurrentUserContext()]);
  if (!isUuid(input.templateId)) throw new Error("Template not found in the current workspace.");

  const database = await requireComponentLibraryActionsD1Database();
  await assertCanManageLibrary(database, workspace.id, currentUser);
  await assertWithinLibraryQuota(database, "estimate_templates", workspace.id, LIBRARY_TEMPLATE_CAP, "template");
  const sourceTemplate = await first<EstimateTemplateD1Row>(
    database,
    "SELECT * FROM estimate_templates WHERE id = ? AND workspace_id = ? LIMIT 1",
    [input.templateId, workspace.id],
  );
  if (!sourceTemplate) throw new Error("Template not found in the current workspace.");

  const [sourceNodes, sourceRowItems] = await Promise.all([
    all<EstimateTemplateNodeD1Row>(
      database,
      "SELECT * FROM estimate_template_nodes WHERE template_id = ? ORDER BY sort_order ASC",
      [sourceTemplate.id],
    ),
    all<EstimateTemplateRowItemD1Row>(
      database,
      "SELECT * FROM estimate_template_row_items WHERE template_id = ? ORDER BY sort_order ASC",
      [sourceTemplate.id],
    ),
  ]);

  const insertedTemplate = await insertTemplate(database, {
    workspaceId: workspace.id,
    name: `${sourceTemplate.name} copy`,
    description: sourceTemplate.description,
    category: sourceTemplate.category,
    sortOrder: await readNextTemplateSortOrder(database, workspace.id, sourceTemplate.category),
    createdBy: currentUser.userId,
    metadata: {
      ...readJsonRecord(sourceTemplate.metadata),
      duplicatedFrom: sourceTemplate.id,
    },
  });

  try {
    const templateNodeIdBySourceId = new Map<string, string>(sourceNodes.map((node) => [node.id, randomUUID()]));
    const nodeStatements = sourceNodes.map((node) => {
      const kind = normalizeEstimateTreeNodeKind(node.kind);
      if (!kind) throw new Error("Could not copy the node structure.");
      return templateNodeInsertStatement({
        id: templateNodeIdBySourceId.get(node.id)!,
        templateId: insertedTemplate.id,
        parentId: node.parent_id ? templateNodeIdBySourceId.get(node.parent_id) ?? null : null,
        kind,
        name: node.name,
        sortOrder: numberValue(node.sort_order),
        metadata: readJsonRecord(node.metadata),
      });
    });

    const rowStatements = sourceRowItems.map((row) => {
      const templateNodeId = templateNodeIdBySourceId.get(row.template_node_id);
      if (!templateNodeId) throw new Error("Could not copy the template rows.");
      return copiedTemplateRowItemInsertStatement(insertedTemplate.id, templateNodeId, row);
    });
    await runBatch(database, [...nodeStatements, ...rowStatements]);

    revalidateTemplateSurfaces();

    const buildRows = await readTemplateBuildRows(database, insertedTemplate.id);
    const [template] = buildRows ? buildEstimateTemplatesFromRows(buildRows) : [];
    if (!template) throw new Error("Could not read back the duplicated template.");
    return { template };
  } catch (error) {
    // Without a cross-statement transaction, a partial failure leaves an
    // orphan template; deleting it cascades to any copied nodes/rows.
    await run(database, "DELETE FROM estimate_templates WHERE id = ?", [insertedTemplate.id]);
    throw error;
  }
}

/** Moves a template to another category (group), optionally repositioning it. */
export async function moveEstimateTemplateToCategory(input: { templateId: string; category: string; sortOrder?: number }) {
  const [{ workspace }, currentUser] = await Promise.all([ensureDefaultWorkspace(), requireCurrentUserContext()]);
  const category = input.category.trim();
  if (!category) throw new Error("Group name is required.");
  if (!isUuid(input.templateId)) throw new Error("Template not found in the current workspace.");
  if (input.sortOrder !== undefined && (!Number.isFinite(input.sortOrder) || input.sortOrder < 0)) {
    throw new Error("Template position must be a non-negative number.");
  }

  const database = await requireComponentLibraryActionsD1Database();
  await assertCanManageLibrary(database, workspace.id, currentUser);
  if (input.sortOrder !== undefined) {
    await run(
      database,
      "UPDATE estimate_templates SET category = ?, sort_order = ?, updated_at = ? WHERE id = ? AND workspace_id = ?",
      [category, input.sortOrder, nowIso(), input.templateId, workspace.id],
    );
  } else {
    await run(
      database,
      "UPDATE estimate_templates SET category = ?, updated_at = ? WHERE id = ? AND workspace_id = ?",
      [category, nowIso(), input.templateId, workspace.id],
    );
  }
  const template = await first<{ id: string; category: string; sort_order: number }>(
    database,
    "SELECT id, category, sort_order FROM estimate_templates WHERE id = ? AND workspace_id = ? LIMIT 1",
    [input.templateId, workspace.id],
  );
  if (!template) throw new Error("Template not found in the current workspace.");
  revalidateTemplateSurfaces();
  return { templateId: template.id, category: template.category, sortOrder: template.sort_order };
}

/** Renames a template category (group): bulk text update scoped to the workspace. */
export async function renameTemplateCategory(input: { from: string; to: string }) {
  const [{ workspace }, currentUser] = await Promise.all([ensureDefaultWorkspace(), requireCurrentUserContext()]);
  const from = input.from.trim();
  const to = input.to.trim();
  if (!from) throw new Error("Group name is required.");
  if (!to) throw new Error("Group name is required.");
  if (from === to) return { category: to, updatedCount: 0 };

  const database = await requireComponentLibraryActionsD1Database();
  await assertCanManageLibrary(database, workspace.id, currentUser);
  const result = await run(
    database,
    "UPDATE estimate_templates SET category = ?, updated_at = ? WHERE workspace_id = ? AND category = ?",
    [to, nowIso(), workspace.id, from],
  );
  revalidateTemplateSurfaces();
  return { category: to, updatedCount: result.meta?.changes ?? 0 };
}

export type EstimateInsertTargetProject = {
  id: string;
  name: string;
  estimates: Array<{ id: string; name: string; sheetCode: string | null }>;
};

/**
 * Projects and their estimates for the "Insert into estimate" picker.
 * Wraps the workspace project list and the lightweight per-project estimate
 * list; pending-invite projects are excluded (no insert access yet).
 */
export async function listEstimateInsertTargets(): Promise<{ projects: EstimateInsertTargetProject[] }> {
  await requireCurrentUserContext();
  const { projects } = await listCurrentWorkspaceProjects();
  const accessibleProjects = projects.filter((item) => item.accessKind !== "pending-invite");
  const estimatesByProject = await Promise.all(
    accessibleProjects.map((item) => listProjectEstimateSheets(item.project.id)),
  );

  return {
    projects: accessibleProjects.map((item, index) => ({
      id: item.project.id,
      name: item.project.name,
      estimates: estimatesByProject[index] ?? [],
    })),
  };
}

type EstimateInsertTargetNodeRow = {
  id: string;
  parent_id: string | null;
  kind: string;
  name: string;
};

export type EstimateTemplateInsertTargetResolution = {
  targetParentNodeId: string | null;
  targetParentNodeName: string | null;
  targetParentNodeKind: "group" | "area" | null;
  targetParentNodePath: string[] | null;
};

/**
 * Resolves where a whole template may insert inside an estimate: the first
 * root GROUP node in tree order (templates must insert under a group). Rows
 * arrive in sort_order, so the first qualifying root is the tree-order pick;
 * children of unknown-kind nodes promote to roots, mirroring
 * buildEstimateTree.
 */
export async function resolveEstimateTemplateInsertTarget(input: { projectId: string; estimateId: string }): Promise<EstimateTemplateInsertTargetResolution> {
  const currentUser = await requireCurrentUserContext();
  if (!isUuid(input.projectId) || !isUuid(input.estimateId)) {
    throw new Error("Estimate not found in the current workspace.");
  }

  const database = await requireComponentLibraryActionsD1Database();
  const estimate = await readEstimateForTemplateSource(database, {
    projectId: input.projectId,
    estimateId: input.estimateId,
  });
  if (!estimate) throw new Error("Estimate not found in the current workspace.");
  await assertCanEditEstimate(database, estimate.workspace_id, input.estimateId, currentUser);

  const nodeRows = await all<EstimateInsertTargetNodeRow>(
    database,
    `
      SELECT id, parent_id, kind, name
      FROM estimate_nodes
      WHERE estimate_id = ?
      ORDER BY sort_order ASC
    `,
    [input.estimateId],
  );

  const nodes = nodeRows;
  const nodeById = new Map(nodes.map((node) => [node.id, node]));
  const kindById = new Map<string, "group" | "area">();
  for (const node of nodes) {
    const kind = normalizeEstimateTreeNodeKind(node.kind);
    if (kind) kindById.set(node.id, kind);
  }

  function nodePath(node: EstimateInsertTargetNodeRow) {
    const path: string[] = [];
    let current: EstimateInsertTargetNodeRow | undefined = node;
    while (current) {
      path.unshift(current.name);
      current = current.parent_id ? nodeById.get(current.parent_id) : undefined;
    }
    return path;
  }

  for (const node of nodes) {
    const kind = kindById.get(node.id);
    if (kind !== "group") continue;
    const isRoot = !node.parent_id || !kindById.has(node.parent_id);
    if (isRoot) {
      return {
        targetParentNodeId: node.id,
        targetParentNodeName: node.name,
        targetParentNodeKind: kind,
        targetParentNodePath: nodePath(node),
      };
    }
  }
  return {
    targetParentNodeId: null,
    targetParentNodeName: null,
    targetParentNodeKind: null,
    targetParentNodePath: null,
  };
}

/**
 * Counts where a library component is referenced: template rows and estimate
 * rows whose `source_library_item_id` points at the item (RLS-scoped, both
 * columns indexed). Powers the inspector dock's "Used in" section.
 */
export async function getCostLibraryComponentUsage(input: { itemId: string }) {
  const [{ workspace }] = await Promise.all([ensureDefaultWorkspace(), requireCurrentUserContext()]);
  if (!isUuid(input.itemId)) return { templateRowCount: 0, estimateRowCount: 0 };

  const database = await requireComponentLibraryActionsD1Database();
  const [templateRows, estimateRows] = await Promise.all([
    first<{ count: number }>(
      database,
      `
        SELECT COUNT(*) AS count
        FROM estimate_template_row_items row_item
        JOIN estimate_templates template ON template.id = row_item.template_id
        WHERE template.workspace_id = ?
          AND row_item.source_library_item_id = ?
      `,
      [workspace.id, input.itemId],
    ),
    first<{ count: number }>(
      database,
      `
        SELECT COUNT(*) AS count
        FROM estimate_row_items row_item
        JOIN estimates estimate ON estimate.id = row_item.estimate_id
        JOIN projects project ON project.id = estimate.project_id
        WHERE project.workspace_id = ?
          AND row_item.source_library_item_id = ?
      `,
      [workspace.id, input.itemId],
    ),
  ]);

  return {
    templateRowCount: Number(templateRows?.count ?? 0),
    estimateRowCount: Number(estimateRows?.count ?? 0),
  };
}

export type LibraryOverviewSearchComponent = {
  id: string;
  name: string;
  category: string;
  supplier: string;
};

export type LibraryOverviewSearchTemplate = {
  id: string;
  name: string;
  category: string;
};

export type LibraryOverviewSearchResult = {
  components: LibraryOverviewSearchComponent[];
  templates: LibraryOverviewSearchTemplate[];
};

/**
 * Cross-library search for the Overview home popover: name/supplier/brand
 * ilike over visible components (max 6) and name ilike over templates
 * (max 3). Fetched lazily from the first keystroke — the Overview payload
 * itself never carries the full datasets.
 */
export async function searchLibraryOverview(input: { query: string }): Promise<LibraryOverviewSearchResult> {
  const [{ workspace }] = await Promise.all([ensureDefaultWorkspace(), requireCurrentUserContext()]);
  // Commas, parens, and quotes are PostgREST `or=` syntax; wildcards would
  // widen the match. Collapse them to spaces / escape before interpolating.
  const query = input.query.trim().replace(/[,()"]/g, " ").replace(/\s+/g, " ").trim();
  if (!query) return { components: [], templates: [] };
  const pattern = `%${query.replace(/[\\%_]/g, (char) => `\\${char}`)}%`;

  const database = await requireComponentLibraryActionsD1Database();
  const [componentsResult, templatesResult] = await Promise.all([
    all<{ id: string; name: string; category: string; supplier: string | null }>(
      database,
      `
        SELECT id, name, category, supplier
        FROM cost_library_items
        WHERE workspace_id = ?
          AND lifecycle_state <> 'archived'
          AND (
            LOWER(name) LIKE LOWER(?) ESCAPE '\\'
            OR LOWER(COALESCE(supplier, '')) LIKE LOWER(?) ESCAPE '\\'
            OR LOWER(COALESCE(brand, '')) LIKE LOWER(?) ESCAPE '\\'
          )
        ORDER BY updated_at DESC
        LIMIT 6
      `,
      [workspace.id, pattern, pattern, pattern],
    ),
    all<{ id: string; name: string; category: string }>(
      database,
      `
        SELECT id, name, category
        FROM estimate_templates
        WHERE workspace_id = ?
          AND LOWER(name) LIKE LOWER(?) ESCAPE '\\'
        ORDER BY updated_at DESC
        LIMIT 3
      `,
      [workspace.id, pattern],
    ),
  ]);

  return {
    components: componentsResult.map((row) => ({
      id: row.id,
      name: row.name,
      category: row.category,
      supplier: row.supplier ?? "",
    })),
    templates: templatesResult.map((row) => ({
      id: row.id,
      name: row.name,
      category: row.category,
    })),
  };
}
