"use server";

import { createHash, randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";

import { requireCurrentUserContext } from "@/lib/auth/session";
import { canEditEstimateInD1, isWorkspaceEditorInD1, isWorkspaceMemberInD1 } from "@/lib/authz/d1-access";
import { getCloudflareD1Database, type D1DatabaseLike, type D1Value } from "@/lib/cloudflare/d1";
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
import { unitUsesContentConversion } from "./unit-options";

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
  lifecycle_state: ComponentLifecycleState | string;
};

type LibraryComponentProjectionD1Row = {
  id: string;
  name: string;
  description: string;
  category: string;
  category_node_id: string | null;
  supplier: string | null;
  supplier_id: string | null;
  brand: string | null;
  brand_id: string | null;
  unit: string;
  unit_cost: number | string | null;
  misc_cost: number | string | null;
  lifecycle_state: ComponentLifecycleState | string;
  current_version_number: number | string | null;
  active_price_option_id: string | null;
  pricing_source: string | null;
  pricing_date: string | null;
  thumbnail_path: string | null;
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
};

export type LibraryComponentInstanceSyncResult = {
  affectedEstimates: Array<{ projectId: string; estimateId: string }>;
  updatedRowCount: number;
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

async function run(database: D1DatabaseLike, sql: string, values: D1Value[] = []) {
  const result = await database.prepare(sql).bind(...values).run();
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
  bucket: string;
  path: string;
  fileName: string;
  contentType: string;
  sizeBytes: number;
  kind?: "pdf" | "excel";
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
  thumbnailPath?: string | null;
  libraryFolderId?: string | null;
  lifecycleState?: ComponentLifecycleState;
  effectiveAt?: string;
  changeReason?: string;
  metadata?: Json;
};

export type CreateCostLibraryComponentInput = CostLibraryComponentInput & {
  fieldContract?: "opendesign-add-component";
  priceOptions: ComponentPriceOptionInput[];
};

export type SaveCostLibraryComponentDraftInput = {
  fieldContract?: "opendesign-add-component";
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

function revalidateLibraryRoutes() {
  revalidatePath("/workshop/library");
  revalidatePath("/workshop/library/components");
}

function readBoolean(value: unknown) {
  return value === true || value === 1 || value === "1";
}

async function reconcileLinkedEstimateRowsForLibraryComponent(
  database: D1DatabaseLike,
  workspaceId: string,
  itemId: string,
  user: CurrentUserForD1,
): Promise<LibraryComponentInstanceSyncResult> {
  const component = await first<LibraryComponentProjectionD1Row>(
    database,
    `
      SELECT id, name, description, category, category_node_id, supplier, supplier_id,
        brand, brand_id, unit, unit_cost, misc_cost, lifecycle_state,
        current_version_number, active_price_option_id, pricing_source, pricing_date,
        thumbnail_path, updated_at
      FROM cost_library_items
      WHERE id = ?
        AND workspace_id = ?
      LIMIT 1
    `,
    [itemId, workspaceId],
  );
  if (!component) throw new Error("Component not found in the current workspace.");

  const priceOptionRows = await all<LibraryPriceOptionProjectionD1Row>(
    database,
    `
      SELECT id, label, unit, unit_cost, misc_cost, currency, is_active, is_default,
        pricing_source, metadata_json
      FROM cost_library_item_price_options
      WHERE item_id = ?
        AND workspace_id = ?
        AND is_active = 1
      ORDER BY is_default DESC, updated_at DESC, id ASC
    `,
    [itemId, workspaceId],
  );
  const priceOptions = priceOptionRows.map((row) => {
    const metadata = readJsonRecord(row.metadata_json);
    const pricingSource = row.pricing_source ?? (typeof metadata.pricingSource === "string" ? metadata.pricingSource : null);
    const pricingDate = typeof metadata.pricingDate === "string" ? metadata.pricingDate : null;
    const thumbnailPath = typeof metadata.thumbnailPath === "string" ? metadata.thumbnailPath : null;
    return {
      ...metadata,
      id: row.id,
      label: row.label,
      unit: row.unit,
      unitCost: numberValue(row.unit_cost),
      miscCost: numberValue(row.misc_cost),
      currency: row.currency,
      isActive: readBoolean(row.is_active),
      isDefault: readBoolean(row.is_default),
      pricingSource,
      pricingDate,
      thumbnailPath,
    };
  });
  const activePriceOption = priceOptions.find((option) => option.id === component.active_price_option_id)
    ?? priceOptions.find((option) => option.isDefault)
    ?? priceOptions[0];
  const unit = typeof activePriceOption?.unit === "string" ? activePriceOption.unit : component.unit;
  const unitCost = typeof activePriceOption?.unitCost === "number" ? activePriceOption.unitCost : numberValue(component.unit_cost);
  const miscCost = typeof activePriceOption?.miscCost === "number" ? activePriceOption.miscCost : numberValue(component.misc_cost);
  const pricingSource = typeof activePriceOption?.pricingSource === "string"
    ? activePriceOption.pricingSource
    : component.pricing_source;
  const pricingDate = typeof activePriceOption?.pricingDate === "string"
    ? activePriceOption.pricingDate
    : component.pricing_date;
  const imageUrl = typeof activePriceOption?.thumbnailPath === "string" && activePriceOption.thumbnailPath
    ? activePriceOption.thumbnailPath
    : component.thumbnail_path;
  const snapshotPatch = {
    brand: component.brand,
    brandId: component.brand_id,
    category: component.category,
    categoryNodeId: component.category_node_id,
    componentVersionNumber: numberValue(component.current_version_number, 1),
    description: component.description,
    imageUrl,
    lifecycleState: component.lifecycle_state,
    material: component.name,
    misc_cost: miscCost,
    priceOptionId: activePriceOption?.id ?? null,
    priceOptionLabel: activePriceOption?.label ?? null,
    priceOptions,
    pricingDate,
    pricingSource,
    sourceComponentId: itemId,
    sourceLibraryItemId: itemId,
    sourceType: "library_component",
    sourceUpdatedAt: component.updated_at,
    supplier: component.supplier,
    supplierId: component.supplier_id,
    unit,
    unit_cost: unitCost,
  };
  const metadataPatch = {
    brandId: component.brand_id,
    categoryNodeId: component.category_node_id,
    componentVersionNumber: numberValue(component.current_version_number, 1),
    priceOptionId: activePriceOption?.id ?? null,
    sourceComponentId: itemId,
    supplierId: component.supplier_id,
  };
  const affectedRows = await all<{ project_id: string; estimate_id: string }>(
    database,
    `
      SELECT DISTINCT project.id AS project_id, estimate.id AS estimate_id
      FROM estimate_row_items row_item
      INNER JOIN estimates estimate ON estimate.id = row_item.estimate_id
      INNER JOIN projects project ON project.id = estimate.project_id
      WHERE project.workspace_id = ?
        AND row_item.source_library_item_id = ?
        AND (row_item.link_state IS NULL OR row_item.link_state NOT IN ('detached', 'unlinked'))
    `,
    [workspaceId, itemId],
  );
  if (affectedRows.length === 0) return { affectedEstimates: [], updatedRowCount: 0 };
  const editableRows = [];
  for (const row of affectedRows) {
    if (await canEditEstimateInD1(database, row.estimate_id, user)) {
      editableRows.push(row);
    }
  }
  if (editableRows.length === 0) return { affectedEstimates: [], updatedRowCount: 0 };
  const editableEstimateIds = editableRows.map((row) => row.estimate_id);

  const result = await run(
    database,
    `
      UPDATE estimate_row_items
      SET material = ?,
          description = ?,
          supplier = ?,
          supplier_id = ?,
          unit = ?,
          unit_cost = ?,
          misc_cost = ?,
          category_node_id = ?,
          source_snapshot_json = json_patch(COALESCE(source_snapshot_json, '{}'), ?),
          metadata_json = json_patch(COALESCE(metadata_json, '{}'), ?),
          link_state = 'linked-clean',
          row_revision = row_revision + 1,
          updated_at = ?
      WHERE source_library_item_id = ?
        AND (link_state IS NULL OR link_state NOT IN ('detached', 'unlinked'))
        AND estimate_id IN (${placeholders(editableEstimateIds)})
    `,
    [
      component.name,
      component.description,
      component.supplier,
      component.supplier_id,
      unit,
      unitCost,
      miscCost,
      component.category_node_id,
      jsonText(snapshotPatch),
      jsonText(metadataPatch),
      component.updated_at,
      itemId,
      ...editableEstimateIds,
    ],
  );
  for (const row of editableRows) {
    revalidatePath(`/workshop/projects/${row.project_id}/estimates/${row.estimate_id}`);
  }
  return {
    affectedEstimates: editableRows.map((row) => ({ projectId: row.project_id, estimateId: row.estimate_id })),
    updatedRowCount: result.meta?.changes ?? 0,
  };
}

function getMassDeletionCorrelationId(correlationId: string | undefined) {
  return correlationId && isUuid(correlationId) ? correlationId : randomUUID();
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
    libraryFolderId: input.fieldContract === "opendesign-add-component" ? null : input.libraryFolderId,
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
    bucket: attachment.bucket.trim(),
    path: attachment.path.trim(),
    fileName: attachment.fileName.trim(),
    contentType: attachment.contentType.trim(),
    kind: attachment.kind ?? (attachment.contentType === "application/pdf" ? "pdf" : "excel"),
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

function sanitizeOpenDesignAddComponentPriceOption(input: ComponentPriceOptionInput): ComponentPriceOptionInput {
  return {
    id: input.id,
    label: input.label,
    sku: input.sku,
    variantDescription: input.variantDescription,
    variantSortOrder: input.variantSortOrder,
    unit: input.unit,
    unitCost: input.unitCost,
    currency: input.currency,
    supplierId: input.supplierId,
    ...(unitUsesContentConversion(input.unit) ? {
      packageQuantity: input.packageQuantity,
      packageUnit: input.packageUnit,
    } : {}),
    imageBucket: input.imageBucket,
    imagePath: input.imagePath,
    thumbnailPath: input.thumbnailPath,
    imageMetadata: input.imageMetadata,
    attachments: input.attachments,
    isDefault: input.isDefault,
    isActive: input.isActive,
    changeReason: input.changeReason,
    effectiveAt: input.effectiveAt,
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
        active_price_option_id, lifecycle_state
      FROM cost_library_items
      WHERE id = ?
        AND workspace_id = ?
      LIMIT 1
    `,
    [itemId, workspaceId],
  );
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

async function insertComponentVersion(database: D1DatabaseLike, input: {
  itemId: string;
  workspaceId: string;
  versionNumber: number;
  snapshot: Record<string, unknown>;
  summary: string;
  reason: string;
  effectiveAt: string;
  userId: string;
}) {
  const timestamp = nowIso();
  await run(
    database,
    `
      INSERT OR IGNORE INTO cost_library_item_versions (
        id, item_id, workspace_id, version_number, snapshot_json, change_summary,
        change_reason, effective_at, created_by, created_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    [
      randomUUID(),
      input.itemId,
      input.workspaceId,
      input.versionNumber,
      jsonText(input.snapshot),
      input.summary,
      input.reason,
      input.effectiveAt,
      input.userId,
      timestamp,
    ],
  );
}

async function upsertComponentPriceOptionInD1(database: D1DatabaseLike, input: {
  workspaceId: string;
  itemId: string;
  priceOption: ReturnType<typeof normalizePriceOptionInput>;
  userId: string;
  effectiveAt: string;
  writeHistory: boolean;
}) {
  const priceOptionId = input.priceOption.id && isUuid(input.priceOption.id) ? input.priceOption.id : randomUUID();
  const timestamp = nowIso();
  const metadata = priceOptionSnapshot({ ...input.priceOption, id: priceOptionId });
  const oldSnapshotRow = input.writeHistory
    ? await first<{ metadata_json: string | null }>(
      database,
      `
        SELECT metadata_json
        FROM cost_library_item_price_options
        WHERE id = ?
          AND item_id = ?
          AND workspace_id = ?
        LIMIT 1
      `,
      [priceOptionId, input.itemId, input.workspaceId],
    )
    : null;

  if (input.priceOption.isDefault) {
    await run(
      database,
      `
        UPDATE cost_library_item_price_options
        SET is_default = 0
        WHERE item_id = ?
          AND workspace_id = ?
          AND id <> ?
      `,
      [input.itemId, input.workspaceId, priceOptionId],
    );
  }

  await run(
    database,
    `
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
    `,
    [
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
  );

  const activeCostEntries = input.priceOption.costEntries.filter((entry) => entry.deletedAt === null);
  if (activeCostEntries.length > 0) {
    const entryStatements = activeCostEntries.map((entry) => ({
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
      `,
      values: [
        entry.clientId && isUuid(entry.clientId) ? entry.clientId : randomUUID(),
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
      ] as D1Value[],
    }));
    await runBatch(database, entryStatements);
  }

  if (input.writeHistory) {
    await run(
      database,
      `
        INSERT OR IGNORE INTO cost_library_item_price_history (
          id, price_option_id, item_id, workspace_id, operation_key, old_snapshot,
          new_snapshot, change_reason, effective_at, created_by, created_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        randomUUID(),
        priceOptionId,
        input.itemId,
        input.workspaceId,
        `${input.itemId}:${priceOptionId}:${input.effectiveAt}`,
        oldSnapshotRow?.metadata_json ?? null,
        jsonText(metadata),
        input.priceOption.changeReason,
        input.effectiveAt,
        input.userId,
        timestamp,
      ],
    );
  }

  return {
    id: priceOptionId,
    label: input.priceOption.label,
    isDefault: input.priceOption.isDefault,
    isActive: input.priceOption.isActive,
    unit: input.priceOption.unit,
    unitCost: input.priceOption.unitCost,
    miscCost: input.priceOption.miscCost,
    pricingSource: input.priceOption.pricingSource,
    pricingDate: input.priceOption.pricingDate,
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

// Library Optimization Plan P0 T3: client-callable loader for the Templates browse tab.
export async function loadCurrentWorkspaceEstimateTemplates(): Promise<EstimateTemplate[]> {
  await requireCurrentUserContext();
  return getCurrentWorkspaceEstimateTemplates();
}

export async function createCostLibraryComponent(input: CreateCostLibraryComponentInput) {
  const [{ workspace }, currentUser] = await Promise.all([ensureDefaultWorkspace(), requireCurrentUserContext()]);
  const database = await requireComponentLibraryActionsD1Database();
  await assertCanManageLibrary(database, workspace.id, currentUser);
  const priceOptionInputs = input.fieldContract === "opendesign-add-component"
    ? input.priceOptions.map(sanitizeOpenDesignAddComponentPriceOption)
    : input.priceOptions;
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
  await run(
    database,
    `
      INSERT INTO cost_library_items (
        id, workspace_id, name, description, category, category_node_id,
        library_folder_id, supplier, supplier_id, brand, brand_id, unit, unit_cost,
        misc_cost, lifecycle_state, current_version_number, active_price_option_id,
        pricing_source, pricing_date, thumbnail_path, metadata_json,
        created_by, created_at, updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, ?, ?, ?, ?, ?, ?, ?)
    `,
    [
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
      component.unit,
      defaultPriceOption?.unitCost ?? 0,
      defaultPriceOption?.miscCost ?? 0,
      component.lifecycleState,
      1,
      defaultPriceOption?.pricingSource ?? null,
      defaultPriceOption?.pricingDate ?? null,
      component.thumbnailPath,
      jsonText(readMetadataObject(component.metadata)),
      currentUser.userId,
      timestamp,
      timestamp,
    ],
  );
  const persistedPriceOptions = [];
  for (const priceOption of priceOptions) {
    persistedPriceOptions.push(await upsertComponentPriceOptionInD1(database, {
      workspaceId: workspace.id,
      itemId,
      priceOption,
      userId: currentUser.userId,
      effectiveAt: priceOption.effectiveAt,
      writeHistory: false,
    }));
  }
  const activePriceOption = persistedPriceOptions.find((option) => option.isDefault) ?? persistedPriceOptions[0];
  if (activePriceOption) {
    await run(
      database,
      `
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
      [
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
    );
  }
  await insertComponentVersion(database, {
    itemId,
    workspaceId: workspace.id,
    versionNumber: 1,
    snapshot: componentSnapshot(component, { priceOptions: persistedPriceOptions }),
    summary: "Component created",
    reason: component.changeReason,
    effectiveAt: component.effectiveAt,
    userId: currentUser.userId,
  });
  revalidateLibraryRoutes();
  return {
    itemId,
    versionNumber: 1,
    activePriceOptionId: activePriceOption?.id,
    priceOptions: persistedPriceOptions.map((option) => ({ id: option.id, label: option.label, isDefault: option.isDefault })),
  };
}

export async function saveCostLibraryComponentDraft(input: SaveCostLibraryComponentDraftInput): Promise<SaveCostLibraryComponentDraftResult> {
  const [{ workspace }, currentUser] = await Promise.all([ensureDefaultWorkspace(), requireCurrentUserContext()]);
  const database = await requireComponentLibraryActionsD1Database();
  await assertCanManageLibrary(database, workspace.id, currentUser, "save_component_draft");
  if (input.fieldContract !== "opendesign-add-component") {
    throw new Error("Unsupported component draft contract.");
  }

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

export async function updateCostLibraryComponent(itemId: string, input: CostLibraryComponentInput) {
  const [{ workspace }, currentUser] = await Promise.all([ensureDefaultWorkspace(), requireCurrentUserContext()]);
  const database = await requireComponentLibraryActionsD1Database();
  await assertCanManageLibrary(database, workspace.id, currentUser);
  if (!isUuid(itemId)) throw new Error("Component not found in the current workspace.");
  const component = normalizeComponentInput(input);
  const existing = await readComponentItem(database, workspace.id, itemId);
  if (!existing) throw new Error("Component not found in the current workspace.");
  const targetFolderId = await assertLibraryFolderInWorkspace(database, workspace.id, component.libraryFolderId);
  const nextVersion = numberValue(existing.current_version_number, 1) + 1;
  const timestamp = nowIso();
  await run(
    database,
    `
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
    [
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
      jsonText(readMetadataObject(component.metadata)),
      timestamp,
      itemId,
      workspace.id,
    ],
  );
  await insertComponentVersion(database, {
    itemId,
    workspaceId: workspace.id,
    versionNumber: nextVersion,
    snapshot: componentSnapshot(component),
    summary: "Component updated",
    reason: component.changeReason,
    effectiveAt: component.effectiveAt,
    userId: currentUser.userId,
  });
  const instanceSync = await reconcileLinkedEstimateRowsForLibraryComponent(database, workspace.id, itemId, currentUser);
  revalidateLibraryRoutes();
  return {
    itemId,
    versionNumber: nextVersion,
    ...instanceSync,
  };
}

export async function updateCostLibraryComponentWithPriceOptions(itemId: string, input: CreateCostLibraryComponentInput) {
  const [{ workspace }, currentUser] = await Promise.all([ensureDefaultWorkspace(), requireCurrentUserContext()]);
  const database = await requireComponentLibraryActionsD1Database();
  await assertCanManageLibrary(database, workspace.id, currentUser);
  if (!isUuid(itemId)) throw new Error("Component not found in the current workspace.");
  const existing = await readComponentItem(database, workspace.id, itemId);
  if (!existing) throw new Error("Component not found in the current workspace.");

  const component = normalizeComponentInput(input);
  const targetFolderId = await assertLibraryFolderInWorkspace(database, workspace.id, component.libraryFolderId);
  const priceOptionInputs = input.fieldContract === "opendesign-add-component"
    ? input.priceOptions.map(sanitizeOpenDesignAddComponentPriceOption)
    : input.priceOptions;
  validatePriceOptions(priceOptionInputs);
  const priceOptions = priceOptionInputs.map((option) => normalizePriceOptionInput({ ...option, unit: option.unit || component.unit }));
  const nextVersion = numberValue(existing.current_version_number, 1) + 1;
  const timestamp = nowIso();
  await run(
    database,
    `
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
    [
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
      jsonText(readMetadataObject(component.metadata)),
      timestamp,
      itemId,
      workspace.id,
    ],
  );

  const persistedPriceOptions = [];
  for (const priceOption of priceOptions) {
    persistedPriceOptions.push(await upsertComponentPriceOptionInD1(database, {
      workspaceId: workspace.id,
      itemId,
      priceOption,
      userId: currentUser.userId,
      effectiveAt: priceOption.effectiveAt,
      writeHistory: false,
    }));
  }
  const retainedPriceOptionIds = persistedPriceOptions.map((option) => option.id);
  if (retainedPriceOptionIds.length > 0) {
    await run(
      database,
      `
        UPDATE cost_library_item_price_options
        SET is_active = 0,
            is_default = 0,
            updated_at = ?
        WHERE item_id = ?
          AND workspace_id = ?
          AND id NOT IN (${placeholders(retainedPriceOptionIds)})
      `,
      [timestamp, itemId, workspace.id, ...retainedPriceOptionIds],
    );
  }
  const activePriceOption = persistedPriceOptions.find((option) => option.isDefault) ?? persistedPriceOptions[0];
  if (!activePriceOption) throw new Error("At least one active component variant is required.");
  await run(
    database,
    `
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
    [
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
  );
  await insertComponentVersion(database, {
    itemId,
    workspaceId: workspace.id,
    versionNumber: nextVersion,
    snapshot: componentSnapshot(component, { priceOptions: persistedPriceOptions }),
    summary: "Component and variants updated",
    reason: component.changeReason,
    effectiveAt: component.effectiveAt,
    userId: currentUser.userId,
  });
  const instanceSync = await reconcileLinkedEstimateRowsForLibraryComponent(database, workspace.id, itemId, currentUser);
  revalidateLibraryRoutes();
  return {
    itemId,
    versionNumber: nextVersion,
    activePriceOptionId: activePriceOption.id,
    priceOptions: persistedPriceOptions.map((option) => ({ id: option.id, label: option.label, isDefault: option.isDefault })),
    ...instanceSync,
  };
}

export async function upsertCostLibraryComponentPriceOption(itemId: string, input: ComponentPriceOptionInput) {
  const [{ workspace }, currentUser] = await Promise.all([ensureDefaultWorkspace(), requireCurrentUserContext()]);
  const database = await requireComponentLibraryActionsD1Database();
  await assertCanManageLibrary(database, workspace.id, currentUser);
  if (!isUuid(itemId)) throw new Error("Component not found in the current workspace.");
  const existing = await readComponentItem(database, workspace.id, itemId);
  if (!existing) throw new Error("Component not found in the current workspace.");
  const priceOption = normalizePriceOptionInput(input);
  const persisted = await upsertComponentPriceOptionInD1(database, {
    workspaceId: workspace.id,
    itemId,
    priceOption,
    userId: currentUser.userId,
    effectiveAt: priceOption.effectiveAt,
    writeHistory: true,
  });
  const nextVersion = numberValue(existing.current_version_number, 1) + 1;
  const itemPatch = priceOption.isDefault || priceOption.isActive
    ? {
        activePriceOptionId: persisted.id,
        unit: priceOption.unit,
        unitCost: priceOption.unitCost,
        miscCost: priceOption.miscCost,
        pricingSource: priceOption.pricingSource,
        pricingDate: priceOption.pricingDate,
      }
    : { activePriceOptionId: existing.active_price_option_id };
  await run(
    database,
    `
      UPDATE cost_library_items
      SET active_price_option_id = COALESCE(?, active_price_option_id),
          unit = COALESCE(?, unit),
          unit_cost = COALESCE(?, unit_cost),
          misc_cost = COALESCE(?, misc_cost),
          pricing_source = COALESCE(?, pricing_source),
          pricing_date = COALESCE(?, pricing_date),
          current_version_number = ?,
          updated_at = ?
      WHERE id = ?
        AND workspace_id = ?
    `,
    [
      itemPatch.activePriceOptionId ?? null,
      "unit" in itemPatch ? itemPatch.unit ?? null : null,
      "unitCost" in itemPatch ? itemPatch.unitCost ?? null : null,
      "miscCost" in itemPatch ? itemPatch.miscCost ?? null : null,
      "pricingSource" in itemPatch ? itemPatch.pricingSource ?? null : null,
      "pricingDate" in itemPatch ? itemPatch.pricingDate ?? null : null,
      nextVersion,
      nowIso(),
      itemId,
      workspace.id,
    ],
  );
  await insertComponentVersion(database, {
    itemId,
    workspaceId: workspace.id,
    versionNumber: nextVersion,
    snapshot: { priceOption: priceOptionSnapshot({ ...priceOption, id: persisted.id }) },
    summary: "Price option changed",
    reason: priceOption.changeReason,
    effectiveAt: priceOption.effectiveAt,
    userId: currentUser.userId,
  });
  const instanceSync = await reconcileLinkedEstimateRowsForLibraryComponent(database, workspace.id, itemId, currentUser);
  revalidateLibraryRoutes();
  return {
    itemId,
    priceOptionId: persisted.id,
    versionNumber: nextVersion,
    ...instanceSync,
  };
}

export async function changeCostLibraryComponentLifecycleState(input: {
  itemId: string;
  lifecycleState: ComponentLifecycleState;
  changeReason?: string;
  effectiveAt?: string;
}) {
  const [{ workspace }, currentUser] = await Promise.all([ensureDefaultWorkspace(), requireCurrentUserContext()]);
  const database = await requireComponentLibraryActionsD1Database();
  await assertCanManageLibrary(database, workspace.id, currentUser);
  if (!isUuid(input.itemId)) throw new Error("Component not found in the current workspace.");
  const existing = await readComponentItem(database, workspace.id, input.itemId);
  if (!existing) throw new Error("Component not found in the current workspace.");
  const effectiveAt = input.effectiveAt ?? new Date().toISOString();
  const nextVersion = numberValue(existing.current_version_number, 1) + 1;
  await run(
    database,
    `
      UPDATE cost_library_items
      SET lifecycle_state = ?,
          lifecycle_state_changed_at = ?,
          lifecycle_state_changed_by = ?,
          current_version_number = ?,
          updated_at = ?
      WHERE id = ?
        AND workspace_id = ?
    `,
    [input.lifecycleState, effectiveAt, currentUser.userId, nextVersion, nowIso(), input.itemId, workspace.id],
  );
  await run(
    database,
    `
      INSERT OR IGNORE INTO cost_library_item_state_history (
        id, item_id, workspace_id, from_state, to_state, operation_key,
        effective_at, change_reason, created_by, created_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    [
      randomUUID(),
      input.itemId,
      workspace.id,
      String(existing.lifecycle_state),
      input.lifecycleState,
      `${input.itemId}:${input.lifecycleState}:${effectiveAt}`,
      effectiveAt,
      input.changeReason ?? "",
      currentUser.userId,
      nowIso(),
    ],
  );
  await insertComponentVersion(database, {
    itemId: input.itemId,
    workspaceId: workspace.id,
    versionNumber: nextVersion,
    snapshot: { lifecycleState: input.lifecycleState },
    summary: "Lifecycle state changed",
    reason: input.changeReason ?? "",
    effectiveAt,
    userId: currentUser.userId,
  });
  const instanceSync = await reconcileLinkedEstimateRowsForLibraryComponent(database, workspace.id, input.itemId, currentUser);
  revalidateLibraryRoutes();
  return {
    itemId: input.itemId,
    versionNumber: nextVersion,
    lifecycleState: input.lifecycleState,
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
