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
  getCurrentWorkspaceComponentRowsLibraryPage,
  getCurrentWorkspaceEstimateTemplates,
  type ComponentLibraryDataset,
  type ComponentRowsLibraryCursor,
  type ComponentRowsLibraryDataset,
  type ComponentRowsLibraryPage,
} from "@/lib/repositories/component-library-repository";
import {
  getProjectComponentRowsLibrary,
  getProjectOnlyComponentRowsLibraryPage,
} from "@/lib/component-library/project-component-projection";
import type { EstimateTemplate } from "@/lib/component-library/estimate-templates";
import {
  assertD1MutationStatementLimit,
  createMutationRequestFingerprint,
} from "@/lib/estimates/mutation-receipts";
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
  type LibraryFolderCreatePlacement,
} from "./library-folder-reorder";
import {
  createLibraryFolderInD1,
  deleteLibraryFolderInD1,
  moveCostLibraryComponentToFolderInD1,
  renameLibraryFolderInD1,
  reorderLibraryFoldersInD1,
  resolveLibraryFolderInWorkspaceD1,
  type LibraryFolderMutationRow,
} from "./folder-mutation-d1";
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
import { UNCATEGORIZED_CATEGORY_LABEL } from "./category-folders";
import {
  buildTemplateMutationReceiptStatement,
  buildTemplateMutationTelemetryStatement,
  createTemplateMutationIdentity,
  normalizeTemplatePricingProvenance,
  readCommittedTemplateMutation,
  runTemplateAtomicBatch,
  toDetachedTemplatePricingProvenance,
  type TemplateMutationIdentity,
  type TemplateMutationStatement,
  type TemplatePricingProvenanceOrigin,
} from "./template-mutations";
import {
  archiveLibraryComponentsInD1,
  createCostLibraryComponentInD1,
  executePermanentDeleteLibraryComponentsInD1,
  findCostLibraryComponentDuplicateInD1,
  isComponentPermanentDeleteD1Error,
  loadComponentMutationImpactInD1,
  loadComponentUpdateContextInD1,
  previewBulkArchiveLibraryComponentsInD1,
  previewPermanentDeleteLibraryComponentsInD1,
  readCreatedComponentReceiptInD1,
  readUpdatedComponentReceiptInD1,
  updateCostLibraryComponentInD1,
  type ComponentDuplicateIdentity,
  type ComponentPermanentDeleteOwners,
  type CreateCostLibraryComponentReceiptResult,
  type UpdateCostLibraryComponentReceiptResult,
} from "./component-mutation-d1";

type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];
type CurrentUserForD1 = Awaited<ReturnType<typeof requireCurrentUserContext>>;
type EstimateTemplateBuildInput = Parameters<typeof buildEstimateTemplatesFromRows>[0];
type EstimateTemplateTableRow = EstimateTemplateBuildInput["templates"][number];
type EstimateTemplateNodeTableRow = EstimateTemplateBuildInput["nodes"][number];
type EstimateTemplateRowItemTableRow = EstimateTemplateBuildInput["rowItems"][number];

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
  intentId?: string;
  allowDuplicate?: boolean;
  priceOptions: ComponentPriceOptionInput[];
};

export type CostLibraryComponentDuplicateCheckInput = Pick<
  CostLibraryComponentInput,
  "name" | "category" | "supplier" | "brand"
>;

export type CostLibraryComponentDuplicateMatch = {
  itemId: string;
  name: string;
  category: string;
  supplier: string | null;
  brand: string | null;
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
  folder: LibraryFolderMutationRow;
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

function readFolderName(name: string) {
  const value = name.trim();
  if (!value) throw new Error("Folder name is required.");
  return value;
}

function readLibraryFolderId(value: string, errorMessage: string) {
  const folderId = value.trim();
  if (!folderId || folderId.length > 256) throw new Error(errorMessage);
  return folderId;
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
    category: readRequiredComponentText(input.category ?? UNCATEGORIZED_CATEGORY_LABEL, "Component category", QUICK_ADD_TEXT_LIMITS.category),
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

function normalizeComponentDuplicateIdentityValue(value: string | null | undefined) {
  return normalizeQuickAddText(value).replace(/\s+/g, " ").toLowerCase();
}

function normalizeComponentDuplicateIdentity(input: CostLibraryComponentDuplicateCheckInput): ComponentDuplicateIdentity {
  return {
    name: normalizeComponentDuplicateIdentityValue(input.name),
    category: normalizeComponentDuplicateIdentityValue(input.category),
    supplier: normalizeComponentDuplicateIdentityValue(input.supplier),
    brand: normalizeComponentDuplicateIdentityValue(input.brand),
  };
}

function componentDuplicateError(match: CostLibraryComponentDuplicateMatch) {
  return new Error(`A component named "${match.name}" already exists. Choose Create anyway to add another.`);
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

// Client-callable bounded loader for the Components management tab. The route
// and each continuation use the same 50-row keyset contract; selected component
// detail is hydrated separately.
export async function loadCurrentWorkspaceComponentRowsLibrary(
  cursor?: ComponentRowsLibraryCursor | null,
): Promise<ComponentRowsLibraryPage> {
  await requireCurrentUserContext();
  return getCurrentWorkspaceComponentRowsLibraryPage(cursor);
}

export async function loadProjectComponentRowsLibrary(projectId: string): Promise<ComponentRowsLibraryDataset> {
  await requireCurrentUserContext();
  return getProjectComponentRowsLibrary(projectId, { includeDetailGraph: false });
}

export async function loadProjectOnlyComponentRowsLibrary(
  projectId: string,
  cursor?: ComponentRowsLibraryCursor | null,
): Promise<ComponentRowsLibraryPage> {
  await requireCurrentUserContext();
  return getProjectOnlyComponentRowsLibraryPage(projectId, cursor);
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
  const [component, impact] = await Promise.all([
    getCurrentWorkspaceComponentRowDetail(itemId),
    loadComponentMutationImpactInD1(database, workspace.id, itemId),
  ]);
  if (!component) throw new Error("Component not found in the current workspace.");
  return { component, ...impact };
}

// Library Optimization Plan P0 T3: client-callable loader for the Templates browse tab.
export async function loadCurrentWorkspaceEstimateTemplates(): Promise<EstimateTemplate[]> {
  await requireCurrentUserContext();
  return getCurrentWorkspaceEstimateTemplates();
}

export async function findCurrentWorkspaceCostLibraryComponentDuplicate(
  input: CostLibraryComponentDuplicateCheckInput,
): Promise<CostLibraryComponentDuplicateMatch | null> {
  const [{ workspace }, currentUser] = await Promise.all([ensureDefaultWorkspace(), requireCurrentUserContext()]);
  const database = await requireComponentLibraryActionsD1Database();
  await assertCanManageLibrary(database, workspace.id, currentUser);
  return findCostLibraryComponentDuplicateInD1(database, workspace.id, normalizeComponentDuplicateIdentity(input));
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
  let omittedImageCount = 0;
  let sourceHasVariantImageReference = false;
  const priceOptions: ComponentPriceOptionInput[] = activeOptions.length > 0
    ? activeOptions.map((option, index) => {
        const imageMetadata = readJsonRecord(option.imageMetadata);
        const hasImageReference = Boolean(
          option.imageBucket
          || option.imagePath
          || option.thumbnailPath
          || imageMetadata.assetId
          || imageMetadata.thumbnailStoragePath
        );
        sourceHasVariantImageReference ||= hasImageReference;
        if (hasImageReference) omittedImageCount += 1;

        return {
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
          imageBucket: null,
          imagePath: null,
          thumbnailPath: null,
          imageMetadata: {},
          attachments: [],
          variantMetadata: readJsonValue(option.variantMetadata),
          isDefault: option.isDefault,
          isActive: true,
          effectiveAt: option.pricingDate || source.pricingDate || undefined,
          changeReason: "Duplicated from the workshop library",
        };
      })
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
  if (source.imageUrl && !sourceHasVariantImageReference) omittedImageCount += 1;
  const duplicatedDefaultOption = priceOptions.find((option) => option.isDefault) ?? priceOptions[0];

  const result = await createCostLibraryComponent({
    allowDuplicate: true,
    name: `${source.name?.trim() || source.material} copy`,
    description: source.description,
    category: source.category?.trim() || "Component",
    categoryNodeId: source.categoryNodeId ?? null,
    supplier: source.supplier || null,
    supplierId: source.supplierId ?? null,
    brand: source.brand || null,
    brandId: source.brandId ?? null,
    unit: source.unit,
    thumbnailPath: duplicatedDefaultOption?.thumbnailPath ?? null,
    libraryFolderId: source.libraryFolderId ?? null,
    lifecycleState: source.lifecycleState ?? "available",
    effectiveAt: source.pricingDate || undefined,
    changeReason: "Duplicated from the workshop library",
    metadata: {
      duplicatedFrom: source.id,
      discipline: source.discipline,
      designation: source.designation,
      tags: source.tags,
      sourceUrl: source.sourceUrl,
      notes: source.notes,
    },
    priceOptions,
  });
  return { ...result, omittedAttachmentCount, omittedImageCount };
}

async function loadCreatedCostLibraryComponentResult(result: CreateCostLibraryComponentReceiptResult) {
  const component = await getCurrentWorkspaceComponentRowDetail(result.itemId);
  if (!component) throw new Error("Component was saved but could not be reloaded.");
  return { ...result, component };
}

export async function createCostLibraryComponent(input: CreateCostLibraryComponentInput) {
  const [{ workspace }, currentUser] = await Promise.all([ensureDefaultWorkspace(), requireCurrentUserContext()]);
  const database = await requireComponentLibraryActionsD1Database();
  await assertCanManageLibrary(database, workspace.id, currentUser);
  const intentId = input.intentId?.trim() || randomUUID();
  if (!isUuid(intentId)) throw new Error("Component creation intent is invalid.");
  const { intentId: ignoredIntentId, ...request } = input;
  void ignoredIntentId;
  const receiptIdentity = {
    workspaceId: workspace.id,
    commandKind: "component.create",
    intentId,
    actorUserId: currentUser.userId,
    requestFingerprint: createMutationRequestFingerprint(request),
  };
  const committedReceipt = await readCreatedComponentReceiptInD1(database, receiptIdentity);
  if (committedReceipt) return loadCreatedCostLibraryComponentResult(committedReceipt);

  const priceOptionInputs = input.priceOptions;
  validatePriceOptions(priceOptionInputs);
  const normalizedComponent = normalizeComponentInput({
    ...readComponentInputForCreate(input),
    metadata: {
      ...readMetadataObject(input.metadata),
      source: "library",
      isCustom: true,
      createdFrom: "workshop-library",
    },
  });
  const targetFolderId = normalizedComponent.libraryFolderId
    ? readLibraryFolderId(normalizedComponent.libraryFolderId, "Library folder not found in the current workspace.")
    : null;
  const targetFolder = await resolveLibraryFolderInWorkspaceD1(database, workspace.id, targetFolderId);
  const component = {
    ...normalizedComponent,
    category: targetFolder.name,
    categoryNodeId: null,
    libraryFolderId: targetFolder.id,
  };
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

  const allowDuplicate = input.allowDuplicate === true;
  const duplicateIdentity = normalizeComponentDuplicateIdentity(component);
  if (!allowDuplicate) {
    const duplicate = await findCostLibraryComponentDuplicateInD1(database, workspace.id, duplicateIdentity);
    if (duplicate) throw componentDuplicateError(duplicate);
  }
  const priceOptions = priceOptionInputs.map((option) => normalizePriceOptionInput({
    ...option,
    unit: option.unit || component.unit,
  }));
  const mutation = await createCostLibraryComponentInD1(database, {
    workspaceId: workspace.id,
    actorUserId: currentUser.userId,
    receiptIdentity,
    component,
    priceOptions,
    duplicateIdentity,
    allowDuplicate,
  });
  if (mutation.kind === "duplicate") throw componentDuplicateError(mutation.match);
  if (mutation.kind === "replayed") return loadCreatedCostLibraryComponentResult(mutation.receipt);
  revalidateLibraryRoutes();
  return loadCreatedCostLibraryComponentResult(mutation.receipt);
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

async function loadUpdatedCostLibraryComponentResult(result: UpdateCostLibraryComponentReceiptResult) {
  const component = await getCurrentWorkspaceComponentRowDetail(result.itemId);
  if (!component) throw new Error("Component was saved but could not be reloaded.");
  for (const affectedEstimate of result.affectedEstimates) {
    revalidatePath(`/workshop/projects/${affectedEstimate.projectId}/estimates/${affectedEstimate.estimateId}`);
  }
  revalidateLibraryRoutes();
  return { ...result, component, rowPatches: {} as Record<string, EstimateRowItemPatch> };
}

export async function updateCostLibraryComponentWithPriceOptions(itemId: string, input: UpdateCostLibraryComponentWithPriceOptionsInput) {
  const [{ workspace }, currentUser] = await Promise.all([ensureDefaultWorkspace(), requireCurrentUserContext()]);
  const database = await requireComponentLibraryActionsD1Database();
  await assertCanManageLibrary(database, workspace.id, currentUser);
  if (!isUuid(itemId)) throw new Error("Component not found in the current workspace.");
  const intentId = input.intentId?.trim() || randomUUID();
  if (!isUuid(intentId)) throw new Error("Component update intent is invalid.");
  const { intentId: ignoredIntentId, ...requestInput } = input;
  void ignoredIntentId;
  const receiptIdentity = {
    workspaceId: workspace.id,
    commandKind: "component.update",
    intentId,
    actorUserId: currentUser.userId,
    requestFingerprint: createMutationRequestFingerprint({ itemId, ...requestInput }),
  };
  const committedReceipt = await readUpdatedComponentReceiptInD1(database, receiptIdentity);
  if (committedReceipt) return loadUpdatedCostLibraryComponentResult(committedReceipt);

  const context = await loadComponentUpdateContextInD1(database, {
    workspaceId: workspace.id,
    itemId,
    expectedUpdatedAt: input.expectedUpdatedAt,
    expectedVersionNumber: input.expectedVersionNumber,
    expectedComponentImpactFingerprint: input.expectedComponentImpactFingerprint,
  });
  const normalizedComponent = normalizeComponentInput(input);
  const targetFolderId = normalizedComponent.libraryFolderId
    ? readLibraryFolderId(normalizedComponent.libraryFolderId, "Library folder not found in the current workspace.")
    : null;
  const targetFolder = await resolveLibraryFolderInWorkspaceD1(database, workspace.id, targetFolderId);
  const component = {
    ...normalizedComponent,
    category: targetFolder.name,
    categoryNodeId: null,
    libraryFolderId: targetFolder.id,
  };
  const metadataJson = input.metadata === undefined
    ? context.existing.metadata_json ?? "{}"
    : jsonText(readMetadataObject(component.metadata));
  const priceOptionInputs = input.priceOptions;
  validatePriceOptions(priceOptionInputs);
  const existingPriceOptionIds = new Set(context.existingPriceOptionRows.map((option) => option.id));
  for (const priceOption of priceOptionInputs) {
    if (!priceOption.id) continue;
    if (!isUuid(priceOption.id) || !existingPriceOptionIds.has(priceOption.id)) {
      throw new Error("A submitted component variant no longer belongs to this component. Refresh and try again.");
    }
  }
  const priceOptions = priceOptionInputs.map((option) => normalizePriceOptionInput({
    ...option,
    unit: option.unit || component.unit,
  }));
  const mutation = await updateCostLibraryComponentInD1(database, {
    workspaceId: workspace.id,
    actorUserId: currentUser.userId,
    itemId,
    intentId,
    receiptIdentity,
    context,
    component,
    priceOptions,
    metadataJson,
    expectedUpdatedAt: input.expectedUpdatedAt,
    expectedVersionNumber: input.expectedVersionNumber,
    expectedComponentImpactFingerprint: input.expectedComponentImpactFingerprint,
    removedPriceOptionReplacements: input.removedPriceOptionReplacements ?? {},
  });
  if (mutation.kind === "replayed") return loadUpdatedCostLibraryComponentResult(mutation.receipt);

  for (const affectedEstimate of mutation.receipt.affectedEstimates) {
    revalidatePath(`/workshop/projects/${affectedEstimate.projectId}/estimates/${affectedEstimate.estimateId}`);
  }
  const persistedComponent = await getCurrentWorkspaceComponentRowDetail(itemId);
  if (!persistedComponent) throw new Error("Component was saved but could not be reloaded.");
  revalidateLibraryRoutes();
  return {
    ...mutation.receipt,
    component: persistedComponent,
    ...mutation.sync,
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
  const preview = await previewBulkArchiveLibraryComponentsInD1(database, workspace.id, ids);
  return coerceBulkPreviewResult({
    ok: preview.eligibleIds.length > 0 && preview.blocked.length === 0,
    targetType: "library_component",
    ids: preview.sortedIds,
    eligibleIds: preview.eligibleIds,
    previewHash: preview.previewHash,
    summary: preview.summary,
    issues: preview.blocked,
    blocked: preview.blocked,
  }, { targetType: "library_component", ids: preview.sortedIds });
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
  await archiveLibraryComponentsInD1(database, {
    workspaceId: workspace.id,
    actorUserId: currentUser.userId,
    itemIds: archivedIds,
  });
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

export async function previewBulkDeleteLibraryComponents(input: BulkDeleteLibraryComponentsInput): Promise<BulkActionPreviewResult> {
  const { ids, issues } = normalizeBulkActionIds(input.itemIds, { label: "components", max: 500 });
  if (issues.length > 0) return buildRejectedPreviewResult("library_component", ids, issues);

  const [{ workspace }, currentUser] = await Promise.all([
    ensureDefaultWorkspace(),
    requireCurrentUserContext(),
  ]);
  const database = await requireComponentLibraryActionsD1Database();
  await assertCanManageLibrary(database, workspace.id, currentUser);
  try {
    const preview = await previewPermanentDeleteLibraryComponentsInD1(database, workspace.id, ids);
    return coerceBulkPreviewResult(preview, {
      targetType: "library_component",
      ids,
    });
  } catch (error) {
    return buildRejectedPreviewResult("library_component", ids, [{
      code: "rpc_error",
      message: `Could not preview component deletion: ${error instanceof Error ? error.message : "Cloudflare D1 preview failed."}`,
    }]);
  }
}

function buildComponentPermanentDeleteFailure(
  ids: string[],
  code: string,
  message: string,
): BulkActionExecutionResult {
  return {
    ok: false,
    targetType: "library_component",
    ids,
    deletedIds: [],
    summary: {
      requestedCount: ids.length,
      eligibleCount: 0,
      blockedCount: 1,
    },
    issues: [{ code, message }],
    blocked: [],
  };
}

function getComponentPermanentDeleteCorrelationId(input: {
  actorUserId: string;
  correlationId?: string;
  expectedPreviewHash: string;
  itemIds: string[];
}) {
  const suppliedCorrelationId = input.correlationId?.trim();
  if (suppliedCorrelationId) {
    if (!isUuid(suppliedCorrelationId)) throw new Error("Deletion correlation id is invalid.");
    return suppliedCorrelationId;
  }
  return `component-delete:${createHash("sha256").update(JSON.stringify({
    actorUserId: input.actorUserId,
    expectedPreviewHash: input.expectedPreviewHash,
    itemIds: [...input.itemIds].sort(),
  })).digest("hex")}`;
}

function revalidateComponentPermanentDeleteSurfaces(input: ComponentPermanentDeleteOwners) {
  for (const owner of input.affectedEstimates) {
    revalidatePath(`/workshop/projects/${owner.projectId}/estimates/${owner.estimateId}`);
  }
  if (input.hasTemplateRows) revalidateTemplateSurfaces();
  revalidateLibraryRoutes();
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
  let correlationId: string;
  try {
    correlationId = getComponentPermanentDeleteCorrelationId({
      actorUserId: currentUser.userId,
      correlationId: input.correlationId,
      expectedPreviewHash: input.expectedPreviewHash,
      itemIds: ids,
    });
  } catch (error) {
    return buildComponentPermanentDeleteFailure(
      ids,
      "invalid_correlation_id",
      error instanceof Error ? error.message : "Deletion correlation id is invalid.",
    );
  }

  try {
    const execution = await executePermanentDeleteLibraryComponentsInD1(database, {
      workspaceId: workspace.id,
      actorUserId: currentUser.userId,
      itemIds: ids,
      expectedPreviewHash: input.expectedPreviewHash,
      correlationId,
    });
    const result = execution.kind === "fresh_commit"
      ? coerceBulkExecutionResult(execution.result, {
          targetType: "library_component",
          ids,
        })
      : execution.result;
    if (result.ok && execution.owners) {
      revalidateComponentPermanentDeleteSurfaces(execution.owners);
    }
    return result;
  } catch (error) {
    if (!isComponentPermanentDeleteD1Error(error)) throw error;
    return buildComponentPermanentDeleteFailure(
      ids,
      "rpc_error",
      error.phase === "impact"
        ? `Could not load component deletion impact: ${error.message}`
        : `Could not permanently delete components: ${error.message}`,
    );
  }
}

export async function createLibraryFolder(parentId: string | null, name: string, options: CreateLibraryFolderOptions = {}): Promise<LibraryFolderActionResult> {
  const [{ workspace }, currentUser] = await Promise.all([ensureDefaultWorkspace(), requireCurrentUserContext()]);
  const database = await requireComponentLibraryActionsD1Database();
  await assertCanManageLibraryFolders(database, workspace.id, currentUser);
  const normalizedParentId = parentId === null
    ? null
    : readLibraryFolderId(parentId, "Parent folder not found in the current workspace.");
  const folder = await createLibraryFolderInD1(database, {
    workspaceId: workspace.id,
    actorUserId: currentUser.userId,
    parentId: normalizedParentId,
    name: readFolderName(name),
    placement: options.placement ?? "bottom",
  });
  revalidateLibraryRoutes();
  return { folder };
}

export async function renameLibraryFolder(folderId: string, name: string): Promise<LibraryFolderActionResult> {
  const [{ workspace }, currentUser] = await Promise.all([ensureDefaultWorkspace(), requireCurrentUserContext()]);
  const database = await requireComponentLibraryActionsD1Database();
  await assertCanManageLibraryFolders(database, workspace.id, currentUser);
  const nextName = readFolderName(name);
  const folder = await renameLibraryFolderInD1(database, {
    workspaceId: workspace.id,
    folderId,
    name: nextName,
  });
  revalidateLibraryRoutes();
  return { folder };
}

export async function deleteLibraryFolder(folderId: string): Promise<void> {
  const [{ workspace }, currentUser] = await Promise.all([ensureDefaultWorkspace(), requireCurrentUserContext()]);
  const database = await requireComponentLibraryActionsD1Database();
  await assertCanManageLibraryFolders(database, workspace.id, currentUser);
  const normalizedFolderId = readLibraryFolderId(folderId, "Library folder not found in the current workspace.");
  await deleteLibraryFolderInD1(database, { workspaceId: workspace.id, folderId: normalizedFolderId });
  revalidateLibraryRoutes();
}

export async function reorderLibraryFolders(input: ReorderLibraryFoldersInput): Promise<void> {
  const currentUser = await requireCurrentUserContext();
  if (!input.updates.length) throw new Error("At least one library folder update is required.");

  const { workspace } = await ensureDefaultWorkspace();
  const database = await requireComponentLibraryActionsD1Database();
  await assertCanManageLibraryFolders(database, workspace.id, currentUser);
  const updateIds = new Set<string>();
  const validUpdates = input.updates.map((update) => {
    const folderId = readLibraryFolderId(update.id, "Library folder not found in the current workspace.");
    const parentId = update.parentId === null
      ? null
      : readLibraryFolderId(update.parentId, "Parent folder not found in the current workspace.");
    if (updateIds.has(folderId)) throw new Error("A library folder can only be reordered once per request.");
    updateIds.add(folderId);
    if (!Number.isSafeInteger(update.sortOrder) || update.sortOrder < 0) {
      throw new Error("Library folder sort order is invalid.");
    }
    if (parentId === folderId) throw new Error("A library folder cannot be moved inside itself.");
    return { ...update, id: folderId, parentId };
  });
  assertD1MutationStatementLimit(validUpdates.length);
  await reorderLibraryFoldersInD1(database, { workspaceId: workspace.id, updates: validUpdates });
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
  const folderId = input.libraryFolderId
    ? readLibraryFolderId(input.libraryFolderId, "Library folder not found in the current workspace.")
    : null;
  await moveCostLibraryComponentToFolderInD1(database, {
    workspaceId: workspace.id,
    itemId: input.itemId,
    folderId,
  });
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
  pricing_provenance_origin: TemplatePricingProvenanceOrigin | null;
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

type EstimateTabSourceRowD1 = {
  id: string;
  name: string;
  updated_at: string;
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
  pricing_provenance_origin: TemplatePricingProvenanceOrigin | null;
  misc_cost: number | string;
  discipline: string;
  designation: string;
  link_state: string | null;
  metadata_json: string | null;
  updated_at: string;
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

function buildTemplateInsert(input: {
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
  const row: EstimateTemplateD1Row = {
    id,
    workspace_id: input.workspaceId,
    name: input.name,
    description: input.description,
    category: input.category,
    sort_order: input.sortOrder,
    metadata: jsonText(input.metadata),
    created_by: input.createdBy,
    created_at: timestamp,
    updated_at: timestamp,
  };
  return {
    row,
    statement: {
      sql: `
      INSERT INTO estimate_templates (
        id, workspace_id, name, description, category, sort_order,
        metadata, created_by, created_at, updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      values: [
        row.id,
        row.workspace_id,
        row.name,
        row.description,
        row.category,
        row.sort_order,
        row.metadata,
        row.created_by,
        row.created_at,
        row.updated_at,
      ] as D1Value[],
    },
  };
}

type TemplateGraphMutationReceipt = {
  templateId: string;
  nodeCount: number;
  rowCount: number;
};

function parseTemplateGraphMutationReceipt(value: unknown): TemplateGraphMutationReceipt {
  if (!value || typeof value !== "object") throw new Error("The committed Template receipt is invalid.");
  const result = value as Record<string, unknown>;
  if (typeof result.templateId !== "string" || !isUuid(result.templateId)) {
    throw new Error("The committed Template receipt is invalid.");
  }
  const nodeCount = Number(result.nodeCount);
  const rowCount = Number(result.rowCount);
  if (!Number.isSafeInteger(nodeCount) || nodeCount < 0 || !Number.isSafeInteger(rowCount) || rowCount < 0) {
    throw new Error("The committed Template receipt is invalid.");
  }
  return { templateId: result.templateId, nodeCount, rowCount };
}

async function readTemplateGraphResult(database: D1DatabaseLike, templateId: string, userMessage: string) {
  const buildRows = await readTemplateBuildRows(database, templateId);
  const [template] = buildRows ? buildEstimateTemplatesFromRows(buildRows) : [];
  if (!template) throw new Error(userMessage);
  return { template };
}

async function readTemplateGraphReplay(
  database: D1DatabaseLike,
  identity: TemplateMutationIdentity,
  userMessage: string,
) {
  const receipt = await readCommittedTemplateMutation(database, identity, parseTemplateGraphMutationReceipt);
  return receipt ? readTemplateGraphResult(database, receipt.templateId, userMessage) : null;
}

function latestUpdatedAt(rows: Array<{ updated_at: string }>) {
  return rows.reduce((latest, row) => row.updated_at > latest ? row.updated_at : latest, "");
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
    toDetachedTemplatePricingProvenance(row.pricing_provenance_origin),
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
    source_snapshot, pricing_provenance_origin, category_node_id, supplier_id, material, description,
    supplier, unit, quantity, unit_cost, misc_cost, contingency_percentage,
    adjustment_percentage, discipline, designation, link_state, metadata,
    created_at, updated_at
  )
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
    normalizeTemplatePricingProvenance(row.pricing_provenance_origin),
    row.category_node_id,
    row.supplier_id,
    row.material,
    row.description,
    row.supplier,
    row.unit,
    numberValue(row.quantity),
    numberValue(row.unit_cost),
    numberValue(row.misc_cost),
    0,
    numberValue(row.adjustment_percentage, numberValue(row.contingency_percentage)),
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
  intentId?: string;
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
  updated_at: string;
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
  const identity = createTemplateMutationIdentity({
    workspaceId: estimate.workspace_id,
    commandKind: "template.create_from_estimate_node",
    intentId: input.intentId,
    actorUserId: currentUser.userId,
    request: {
      projectId: input.projectId,
      estimateId: input.estimateId,
      sourceNodeId: input.sourceNodeId,
      name: templateName,
      description: templateDescription,
      category: templateCategory,
    },
  });
  const replay = await readTemplateGraphReplay(database, identity, "Could not read back the created template.");
  if (replay) return replay;

  await assertCanPublishEstimateTemplateFromEstimate(database, input.estimateId, currentUser);
  await assertWithinLibraryQuota(database, "estimate_templates", estimate.workspace_id, LIBRARY_TEMPLATE_CAP, "template");

  const nodeRows = await all<EstimateNodeSubtreeRow>(
    database,
    `
      SELECT id, parent_id, kind, name, sort_order, updated_at
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
            misc_cost, discipline, designation, link_state, metadata_json,
            pricing_provenance_origin, updated_at
          FROM estimate_row_items
          WHERE estimate_id = ?
            AND node_id IN (${placeholders(subtreeNodeIds)})
          ORDER BY sort_order ASC
        `,
        [input.estimateId, ...subtreeNodeIds],
      )
    : [];

  const insertedTemplate = buildTemplateInsert({
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

  const templateNodeIdBySourceId = new Map<string, string>(subtreeNodes.map((node) => [node.id, randomUUID()]));
  const templateNodeStatements = subtreeNodes.map((node) => {
    const kind = normalizeEstimateTreeNodeKind(node.kind);
    if (!kind) throw new Error("Could not copy the node structure.");
    return templateNodeInsertStatement({
      id: templateNodeIdBySourceId.get(node.id)!,
      templateId: insertedTemplate.row.id,
      parentId: node.id === sourceNode.id ? null : templateNodeIdBySourceId.get(node.parent_id ?? "") ?? null,
      kind,
      name: node.name,
      sortOrder: node.id === sourceNode.id ? 0 : node.sort_order,
    });
  });
  const rowStatements = rowItemRows.map((row) => {
    const templateNodeId = templateNodeIdBySourceId.get(row.node_id);
    if (!templateNodeId) throw new Error("Could not copy the estimate rows.");
    return templateRowItemInsertStatement(insertedTemplate.row.id, templateNodeId, row);
  });
  const sourceGuard: TemplateMutationStatement = {
    sql: `
      SELECT CASE WHEN
        (SELECT COUNT(*) FROM estimate_nodes WHERE estimate_id = ? AND id IN (${placeholders(subtreeNodeIds)})) = ?
        AND COALESCE((SELECT MAX(updated_at) FROM estimate_nodes WHERE estimate_id = ? AND id IN (${placeholders(subtreeNodeIds)})), '') = ?
        AND (SELECT COUNT(*) FROM estimate_row_items WHERE estimate_id = ? AND node_id IN (${placeholders(subtreeNodeIds)})) = ?
        AND COALESCE((SELECT MAX(updated_at) FROM estimate_row_items WHERE estimate_id = ? AND node_id IN (${placeholders(subtreeNodeIds)})), '') = ?
      THEN 1 ELSE json('') END AS template_source_guard
    `,
    values: [
      input.estimateId,
      ...subtreeNodeIds,
      subtreeNodes.length,
      input.estimateId,
      ...subtreeNodeIds,
      latestUpdatedAt(subtreeNodes),
      input.estimateId,
      ...subtreeNodeIds,
      rowItemRows.length,
      input.estimateId,
      ...subtreeNodeIds,
      latestUpdatedAt(rowItemRows),
    ],
  };
  const receipt: TemplateGraphMutationReceipt = {
    templateId: insertedTemplate.row.id,
    nodeCount: templateNodeStatements.length,
    rowCount: rowStatements.length,
  };
  const statements: TemplateMutationStatement[] = [
    sourceGuard,
    insertedTemplate.statement,
    ...templateNodeStatements,
    ...rowStatements,
    buildTemplateMutationTelemetryStatement({
      actorUserId: currentUser.userId,
      workspaceId: estimate.workspace_id,
      templateId: insertedTemplate.row.id,
      action: "create_from_estimate_node",
      intentId: identity.intentId,
      timestamp: insertedTemplate.row.updated_at,
      metadata: { nodeCount: receipt.nodeCount, rowCount: receipt.rowCount },
    }),
    buildTemplateMutationReceiptStatement({
      ...identity,
      templateId: insertedTemplate.row.id,
      result: receipt,
      timestamp: insertedTemplate.row.updated_at,
    }),
  ];
  try {
    await runTemplateAtomicBatch(database, statements);
  } catch (error) {
    const committed = await readTemplateGraphReplay(database, identity, "Could not read back the created template.");
    if (committed) return committed;
    throw error;
  }

  revalidateTemplateSurfaces();
  return readTemplateGraphResult(database, insertedTemplate.row.id, "Could not read back the created template.");
}

export type CreateEstimateTemplateFromTabInput = {
  intentId?: string;
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
  if (!isUuid(input.projectId) || !isUuid(input.estimateId) || !isUuid(input.tabId)) {
    throw new Error("Estimate tab not found in the current workspace.");
  }

  const estimate = await readEstimateForTemplateSource(database, {
    projectId: input.projectId,
    estimateId: input.estimateId,
  });
  if (!estimate) throw new Error("Estimate not found in the current workspace.");
  await assertCanManageLibrary(database, estimate.workspace_id, currentUser);
  const identity = createTemplateMutationIdentity({
    workspaceId: estimate.workspace_id,
    commandKind: "template.create_from_estimate_tab",
    intentId: input.intentId,
    actorUserId: currentUser.userId,
    request: {
      projectId: input.projectId,
      estimateId: input.estimateId,
      tabId: input.tabId,
      name: templateName,
      description: templateDescription,
      category: templateCategory,
    },
  });
  const replay = await readTemplateGraphReplay(database, identity, "Could not read back the created template.");
  if (replay) return replay;

  await assertCanPublishEstimateTemplateFromEstimate(database, input.estimateId, currentUser);
  await assertWithinLibraryQuota(database, "estimate_templates", estimate.workspace_id, LIBRARY_TEMPLATE_CAP, "template");
  const sourceTab = await first<EstimateTabSourceRowD1>(
    database,
    "SELECT id, name, updated_at FROM estimate_tabs WHERE id = ? AND estimate_id = ? AND archived_at IS NULL LIMIT 1",
    [input.tabId, input.estimateId],
  );
  if (!sourceTab) throw new Error("Estimate tab not found in the current workspace.");
  const sourceTabName = sourceTab.name.trim() || input.tabName.trim() || "Project tab";

  const nodeRows = await all<EstimateTabTemplateNodeRow>(
    database,
    `
      SELECT id, parent_id, kind, name, sort_order, updated_at
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
        misc_cost, discipline, designation, link_state, metadata_json,
        pricing_provenance_origin, updated_at
      FROM estimate_row_items
      WHERE estimate_id = ?
        AND node_id IN (${placeholders(sourceNodeIds)})
      ORDER BY sort_order ASC
    `,
    [input.estimateId, ...sourceNodeIds],
  );

  const insertedTemplate = buildTemplateInsert({
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
      templateId: insertedTemplate.row.id,
      parentId: mappedParentId,
      kind: node.kind,
      name: node.name,
      sortOrder: node.sort_order,
    });
  });
  const templateNodeStatements = [
    templateNodeInsertStatement({
      id: wrapperNodeId,
      templateId: insertedTemplate.row.id,
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
    return templateRowItemInsertStatement(insertedTemplate.row.id, templateNodeId, row);
  });
  const sourceGuard: TemplateMutationStatement = {
    sql: `
      SELECT CASE WHEN
        EXISTS (SELECT 1 FROM estimate_tabs WHERE id = ? AND estimate_id = ? AND archived_at IS NULL AND updated_at = ?)
        AND (SELECT COUNT(*) FROM estimate_nodes WHERE estimate_id = ? AND estimate_tab_id = ?) = ?
        AND COALESCE((SELECT MAX(updated_at) FROM estimate_nodes WHERE estimate_id = ? AND estimate_tab_id = ?), '') = ?
        AND (SELECT COUNT(*) FROM estimate_row_items WHERE estimate_id = ? AND node_id IN (${placeholders(sourceNodeIds)})) = ?
        AND COALESCE((SELECT MAX(updated_at) FROM estimate_row_items WHERE estimate_id = ? AND node_id IN (${placeholders(sourceNodeIds)})), '') = ?
      THEN 1 ELSE json('') END AS template_tab_source_guard
    `,
    values: [
      input.tabId,
      input.estimateId,
      sourceTab.updated_at,
      input.estimateId,
      input.tabId,
      sourceNodes.length,
      input.estimateId,
      input.tabId,
      latestUpdatedAt(sourceNodes),
      input.estimateId,
      ...sourceNodeIds,
      rowItemRows.length,
      input.estimateId,
      ...sourceNodeIds,
      latestUpdatedAt(rowItemRows),
    ],
  };
  const receipt: TemplateGraphMutationReceipt = {
    templateId: insertedTemplate.row.id,
    nodeCount: templateNodeStatements.length,
    rowCount: rowStatements.length,
  };
  const statements: TemplateMutationStatement[] = [
    sourceGuard,
    insertedTemplate.statement,
    ...templateNodeStatements,
    ...rowStatements,
    buildTemplateMutationTelemetryStatement({
      actorUserId: currentUser.userId,
      workspaceId: estimate.workspace_id,
      templateId: insertedTemplate.row.id,
      action: "create_from_estimate_tab",
      intentId: identity.intentId,
      timestamp: insertedTemplate.row.updated_at,
      metadata: { nodeCount: receipt.nodeCount, rowCount: receipt.rowCount },
    }),
    buildTemplateMutationReceiptStatement({
      ...identity,
      templateId: insertedTemplate.row.id,
      result: receipt,
      timestamp: insertedTemplate.row.updated_at,
    }),
  ];
  try {
    await runTemplateAtomicBatch(database, statements);
  } catch (error) {
    const committed = await readTemplateGraphReplay(database, identity, "Could not read back the created template.");
    if (committed) return committed;
    throw error;
  }

  revalidateTemplateSurfaces();
  return readTemplateGraphResult(database, insertedTemplate.row.id, "Could not read back the created template.");
}

type TemplateHeaderMutationReceipt = {
  templateId: string;
  name?: string;
  category?: string;
  sortOrder?: number;
  updatedCount?: number;
};

function parseTemplateHeaderMutationReceipt(value: unknown): TemplateHeaderMutationReceipt {
  if (!value || typeof value !== "object") throw new Error("The committed Template receipt is invalid.");
  const result = value as Record<string, unknown>;
  if (typeof result.templateId !== "string" || !isUuid(result.templateId)) {
    throw new Error("The committed Template receipt is invalid.");
  }
  return {
    templateId: result.templateId,
    name: typeof result.name === "string" ? result.name : undefined,
    category: typeof result.category === "string" ? result.category : undefined,
    sortOrder: Number.isFinite(Number(result.sortOrder)) ? Number(result.sortOrder) : undefined,
    updatedCount: Number.isSafeInteger(Number(result.updatedCount)) ? Number(result.updatedCount) : undefined,
  };
}

function parseTemplateCategoryMutationReceipt(value: unknown) {
  if (!value || typeof value !== "object") throw new Error("The committed Template receipt is invalid.");
  const result = value as Record<string, unknown>;
  if (typeof result.category !== "string" || !Number.isSafeInteger(Number(result.updatedCount))) {
    throw new Error("The committed Template receipt is invalid.");
  }
  return { category: result.category, updatedCount: Number(result.updatedCount) };
}

/** Renames a workspace estimate template. */
export async function renameEstimateTemplate(input: { intentId?: string; templateId: string; name: string }) {
  const [{ workspace }, currentUser] = await Promise.all([ensureDefaultWorkspace(), requireCurrentUserContext()]);
  const templateName = input.name.trim();
  if (!templateName) throw new Error("Template name is required.");
  if (!isUuid(input.templateId)) throw new Error("Template not found in the current workspace.");

  const database = await requireComponentLibraryActionsD1Database();
  await assertCanManageLibrary(database, workspace.id, currentUser);
  const identity = createTemplateMutationIdentity({
    workspaceId: workspace.id,
    commandKind: "template.rename",
    intentId: input.intentId,
    actorUserId: currentUser.userId,
    request: { templateId: input.templateId, name: templateName },
  });
  const replay = await readCommittedTemplateMutation(database, identity, parseTemplateHeaderMutationReceipt);
  if (replay) return { templateId: replay.templateId, name: replay.name ?? templateName };

  const template = await first<{ id: string; name: string; updated_at: string }>(
    database,
    "SELECT id, name, updated_at FROM estimate_templates WHERE id = ? AND workspace_id = ? LIMIT 1",
    [input.templateId, workspace.id],
  );
  if (!template) throw new Error("Template not found in the current workspace.");
  const timestamp = nowIso();
  const result: TemplateHeaderMutationReceipt = { templateId: template.id, name: templateName };
  const statements: TemplateMutationStatement[] = [
    {
      sql: `SELECT CASE WHEN EXISTS (
        SELECT 1 FROM estimate_templates WHERE id = ? AND workspace_id = ? AND updated_at = ?
      ) THEN 1 ELSE json('') END AS template_header_guard`,
      values: [template.id, workspace.id, template.updated_at],
    },
    {
      sql: "UPDATE estimate_templates SET name = ?, updated_at = ? WHERE id = ? AND workspace_id = ? AND updated_at = ?",
      values: [templateName, timestamp, template.id, workspace.id, template.updated_at],
    },
    buildTemplateMutationTelemetryStatement({
      actorUserId: currentUser.userId,
      workspaceId: workspace.id,
      templateId: template.id,
      action: "rename",
      intentId: identity.intentId,
      timestamp,
    }),
    buildTemplateMutationReceiptStatement({
      ...identity,
      templateId: template.id,
      result,
      timestamp,
    }),
  ];
  try {
    await runTemplateAtomicBatch(database, statements);
  } catch (error) {
    const committed = await readCommittedTemplateMutation(database, identity, parseTemplateHeaderMutationReceipt);
    if (committed) return { templateId: committed.templateId, name: committed.name ?? templateName };
    throw error;
  }
  revalidateTemplateSurfaces();
  return { templateId: template.id, name: templateName };
}

/** Archives a workspace Estimate Template without affecting linked instances. */
export async function deleteEstimateTemplate(input: { intentId?: string; templateId: string }) {
  const [{ workspace }, currentUser] = await Promise.all([ensureDefaultWorkspace(), requireCurrentUserContext()]);
  if (!isUuid(input.templateId)) throw new Error("Template not found in the current workspace.");

  const database = await requireComponentLibraryActionsD1Database();
  await assertCanManageLibrary(database, workspace.id, currentUser);
  const identity = createTemplateMutationIdentity({
    workspaceId: workspace.id,
    commandKind: "template.archive",
    intentId: input.intentId,
    actorUserId: currentUser.userId,
    request: { templateId: input.templateId },
  });
  const replay = await readCommittedTemplateMutation(database, identity, parseTemplateHeaderMutationReceipt);
  if (replay) return { templateId: replay.templateId };

  const template = await first<{ id: string; updated_at: string; archived_at: string | null }>(
    database,
    "SELECT id, updated_at, archived_at FROM estimate_templates WHERE id = ? AND workspace_id = ? LIMIT 1",
    [input.templateId, workspace.id],
  );
  if (!template) throw new Error("Template not found in the current workspace.");
  if (template.archived_at) return { templateId: template.id };
  const timestamp = nowIso();
  const result: TemplateHeaderMutationReceipt = { templateId: template.id };
  const statements: TemplateMutationStatement[] = [
    {
      sql: `SELECT CASE WHEN EXISTS (
        SELECT 1 FROM estimate_templates WHERE id = ? AND workspace_id = ? AND updated_at = ?
          AND archived_at IS NULL
      ) THEN 1 ELSE json('') END AS template_archive_guard`,
      values: [template.id, workspace.id, template.updated_at],
    },
    {
      sql: `UPDATE estimate_templates
            SET archived_at = ?, archived_by = ?, updated_at = ?
            WHERE id = ? AND workspace_id = ? AND updated_at = ? AND archived_at IS NULL`,
      values: [timestamp, currentUser.userId, timestamp, template.id, workspace.id, template.updated_at],
    },
    buildTemplateMutationTelemetryStatement({
      actorUserId: currentUser.userId,
      workspaceId: workspace.id,
      templateId: template.id,
      action: "archive",
      intentId: identity.intentId,
      timestamp,
    }),
    buildTemplateMutationReceiptStatement({
      ...identity,
      templateId: template.id,
      result,
      timestamp,
    }),
  ];
  try {
    await runTemplateAtomicBatch(database, statements);
  } catch (error) {
    const committed = await readCommittedTemplateMutation(database, identity, parseTemplateHeaderMutationReceipt);
    if (committed) return { templateId: committed.templateId };
    throw error;
  }
  revalidateTemplateSurfaces();
  return { templateId: template.id };
}

export async function restoreEstimateTemplate(input: { intentId?: string; templateId: string }) {
  const [{ workspace }, currentUser] = await Promise.all([ensureDefaultWorkspace(), requireCurrentUserContext()]);
  if (!isUuid(input.templateId)) throw new Error("Template not found in the current workspace.");
  const database = await requireComponentLibraryActionsD1Database();
  await assertCanManageLibrary(database, workspace.id, currentUser);
  const identity = createTemplateMutationIdentity({
    workspaceId: workspace.id,
    commandKind: "template.restore",
    intentId: input.intentId,
    actorUserId: currentUser.userId,
    request: { templateId: input.templateId },
  });
  const replay = await readCommittedTemplateMutation(database, identity, parseTemplateHeaderMutationReceipt);
  if (replay) return { templateId: replay.templateId };
  const template = await first<{ id: string; updated_at: string; archived_at: string | null }>(
    database,
    "SELECT id, updated_at, archived_at FROM estimate_templates WHERE id = ? AND workspace_id = ? LIMIT 1",
    [input.templateId, workspace.id],
  );
  if (!template) throw new Error("Template not found in the current workspace.");
  if (!template.archived_at) return { templateId: template.id };
  const timestamp = nowIso();
  const result: TemplateHeaderMutationReceipt = { templateId: template.id };
  const statements: TemplateMutationStatement[] = [
    {
      sql: `SELECT CASE WHEN EXISTS (
        SELECT 1 FROM estimate_templates
        WHERE id = ? AND workspace_id = ? AND updated_at = ? AND archived_at IS NOT NULL
      ) THEN 1 ELSE json('') END AS template_restore_guard`,
      values: [template.id, workspace.id, template.updated_at],
    },
    {
      sql: `UPDATE estimate_templates
            SET archived_at = NULL, archived_by = NULL, updated_at = ?
            WHERE id = ? AND workspace_id = ? AND updated_at = ? AND archived_at IS NOT NULL`,
      values: [timestamp, template.id, workspace.id, template.updated_at],
    },
    buildTemplateMutationTelemetryStatement({
      actorUserId: currentUser.userId,
      workspaceId: workspace.id,
      templateId: template.id,
      action: "restore",
      intentId: identity.intentId,
      timestamp,
    }),
    buildTemplateMutationReceiptStatement({
      ...identity,
      templateId: template.id,
      result,
      timestamp,
    }),
  ];
  try {
    await runTemplateAtomicBatch(database, statements);
  } catch (error) {
    const committed = await readCommittedTemplateMutation(database, identity, parseTemplateHeaderMutationReceipt);
    if (committed) return { templateId: committed.templateId };
    throw error;
  }
  revalidateTemplateSurfaces();
  return { templateId: template.id };
}

/**
 * Creates an empty workspace estimate template (no nodes, no rows). The
 * Templates browse "New template" flow uses this when there is no estimate
 * node to capture; the template editor fills in the structure later.
 */
export async function createEstimateTemplate(input: { intentId?: string; name: string; category?: string; description?: string }) {
  const [{ workspace }, currentUser] = await Promise.all([ensureDefaultWorkspace(), requireCurrentUserContext()]);
  const templateName = input.name.trim();
  if (!templateName) throw new Error("Template name is required.");
  const templateCategory = (input.category ?? "").trim() || "General";
  const templateDescription = (input.description ?? "").trim();

  const database = await requireComponentLibraryActionsD1Database();
  await assertCanManageLibrary(database, workspace.id, currentUser);
  const identity = createTemplateMutationIdentity({
    workspaceId: workspace.id,
    commandKind: "template.create_blank",
    intentId: input.intentId,
    actorUserId: currentUser.userId,
    request: { name: templateName, category: templateCategory, description: templateDescription },
  });
  const replay = await readTemplateGraphReplay(database, identity, "Could not read back the created template.");
  if (replay) return replay;
  await assertWithinLibraryQuota(database, "estimate_templates", workspace.id, LIBRARY_TEMPLATE_CAP, "template");
  const insertedTemplate = buildTemplateInsert({
    workspaceId: workspace.id,
    name: templateName,
    description: templateDescription,
    category: templateCategory,
    sortOrder: await readNextTemplateSortOrder(database, workspace.id),
    createdBy: currentUser.userId,
    metadata: { savedFrom: "library-templates-browse" },
  });
  const receipt: TemplateGraphMutationReceipt = { templateId: insertedTemplate.row.id, nodeCount: 0, rowCount: 0 };
  const statements: TemplateMutationStatement[] = [
    insertedTemplate.statement,
    buildTemplateMutationTelemetryStatement({
      actorUserId: currentUser.userId,
      workspaceId: workspace.id,
      templateId: insertedTemplate.row.id,
      action: "create_blank",
      intentId: identity.intentId,
      timestamp: insertedTemplate.row.updated_at,
      metadata: { nodeCount: 0, rowCount: 0 },
    }),
    buildTemplateMutationReceiptStatement({
      ...identity,
      templateId: insertedTemplate.row.id,
      result: receipt,
      timestamp: insertedTemplate.row.updated_at,
    }),
  ];
  try {
    await runTemplateAtomicBatch(database, statements);
  } catch (error) {
    const committed = await readTemplateGraphReplay(database, identity, "Could not read back the created template.");
    if (committed) return committed;
    throw error;
  }

  revalidateTemplateSurfaces();
  return readTemplateGraphResult(database, insertedTemplate.row.id, "Could not read back the created template.");
}

/**
 * Copies a workspace estimate template: the template row plus every node and
 * every row item (all columns). The copy lands in the same category with the
 * next sort_order in that category and the name `{name} copy`.
 */
export async function duplicateEstimateTemplate(input: { intentId?: string; templateId: string }) {
  const [{ workspace }, currentUser] = await Promise.all([ensureDefaultWorkspace(), requireCurrentUserContext()]);
  if (!isUuid(input.templateId)) throw new Error("Template not found in the current workspace.");

  const database = await requireComponentLibraryActionsD1Database();
  await assertCanManageLibrary(database, workspace.id, currentUser);
  const identity = createTemplateMutationIdentity({
    workspaceId: workspace.id,
    commandKind: "template.duplicate",
    intentId: input.intentId,
    actorUserId: currentUser.userId,
    request: { templateId: input.templateId },
  });
  const replay = await readTemplateGraphReplay(database, identity, "Could not read back the duplicated template.");
  if (replay) return replay;
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

  const insertedTemplate = buildTemplateInsert({
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

  const templateNodeIdBySourceId = new Map<string, string>(sourceNodes.map((node) => [node.id, randomUUID()]));
  const nodeStatements = sourceNodes.map((node) => {
    const kind = normalizeEstimateTreeNodeKind(node.kind);
    if (!kind) throw new Error("Could not copy the node structure.");
    return templateNodeInsertStatement({
      id: templateNodeIdBySourceId.get(node.id)!,
      templateId: insertedTemplate.row.id,
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
    return copiedTemplateRowItemInsertStatement(insertedTemplate.row.id, templateNodeId, row);
  });
  const sourceGuard: TemplateMutationStatement = {
    sql: `
      SELECT CASE WHEN
        EXISTS (SELECT 1 FROM estimate_templates WHERE id = ? AND workspace_id = ? AND updated_at = ?)
        AND (SELECT COUNT(*) FROM estimate_template_nodes WHERE template_id = ?) = ?
        AND COALESCE((SELECT MAX(updated_at) FROM estimate_template_nodes WHERE template_id = ?), '') = ?
        AND (SELECT COUNT(*) FROM estimate_template_row_items WHERE template_id = ?) = ?
        AND COALESCE((SELECT MAX(updated_at) FROM estimate_template_row_items WHERE template_id = ?), '') = ?
      THEN 1 ELSE json('') END AS template_duplicate_source_guard
    `,
    values: [
      sourceTemplate.id,
      workspace.id,
      sourceTemplate.updated_at,
      sourceTemplate.id,
      sourceNodes.length,
      sourceTemplate.id,
      latestUpdatedAt(sourceNodes),
      sourceTemplate.id,
      sourceRowItems.length,
      sourceTemplate.id,
      latestUpdatedAt(sourceRowItems),
    ],
  };
  const receipt: TemplateGraphMutationReceipt = {
    templateId: insertedTemplate.row.id,
    nodeCount: nodeStatements.length,
    rowCount: rowStatements.length,
  };
  const statements: TemplateMutationStatement[] = [
    sourceGuard,
    insertedTemplate.statement,
    ...nodeStatements,
    ...rowStatements,
    buildTemplateMutationTelemetryStatement({
      actorUserId: currentUser.userId,
      workspaceId: workspace.id,
      templateId: insertedTemplate.row.id,
      action: "duplicate",
      intentId: identity.intentId,
      timestamp: insertedTemplate.row.updated_at,
      metadata: { sourceTemplateId: sourceTemplate.id, nodeCount: receipt.nodeCount, rowCount: receipt.rowCount },
    }),
    buildTemplateMutationReceiptStatement({
      ...identity,
      templateId: insertedTemplate.row.id,
      result: receipt,
      timestamp: insertedTemplate.row.updated_at,
    }),
  ];
  try {
    await runTemplateAtomicBatch(database, statements);
  } catch (error) {
    const committed = await readTemplateGraphReplay(database, identity, "Could not read back the duplicated template.");
    if (committed) return committed;
    throw error;
  }

  revalidateTemplateSurfaces();
  return readTemplateGraphResult(database, insertedTemplate.row.id, "Could not read back the duplicated template.");
}

/** Moves a template to another category (group), optionally repositioning it. */
export async function moveEstimateTemplateToCategory(input: { intentId?: string; templateId: string; category: string; sortOrder?: number }) {
  const [{ workspace }, currentUser] = await Promise.all([ensureDefaultWorkspace(), requireCurrentUserContext()]);
  const category = input.category.trim();
  if (!category) throw new Error("Group name is required.");
  if (!isUuid(input.templateId)) throw new Error("Template not found in the current workspace.");
  if (input.sortOrder !== undefined && (!Number.isFinite(input.sortOrder) || input.sortOrder < 0)) {
    throw new Error("Template position must be a non-negative number.");
  }

  const database = await requireComponentLibraryActionsD1Database();
  await assertCanManageLibrary(database, workspace.id, currentUser);
  const identity = createTemplateMutationIdentity({
    workspaceId: workspace.id,
    commandKind: "template.move_category",
    intentId: input.intentId,
    actorUserId: currentUser.userId,
    request: { templateId: input.templateId, category, sortOrder: input.sortOrder ?? null },
  });
  const replay = await readCommittedTemplateMutation(database, identity, parseTemplateHeaderMutationReceipt);
  if (replay) {
    return {
      templateId: replay.templateId,
      category: replay.category ?? category,
      sortOrder: replay.sortOrder ?? input.sortOrder ?? 0,
    };
  }
  const template = await first<{ id: string; category: string; sort_order: number; updated_at: string }>(
    database,
    "SELECT id, category, sort_order, updated_at FROM estimate_templates WHERE id = ? AND workspace_id = ? LIMIT 1",
    [input.templateId, workspace.id],
  );
  if (!template) throw new Error("Template not found in the current workspace.");
  const timestamp = nowIso();
  const sortOrder = input.sortOrder ?? template.sort_order;
  const result: TemplateHeaderMutationReceipt = { templateId: template.id, category, sortOrder };
  const statements: TemplateMutationStatement[] = [
    {
      sql: `SELECT CASE WHEN EXISTS (
        SELECT 1 FROM estimate_templates WHERE id = ? AND workspace_id = ? AND updated_at = ?
      ) THEN 1 ELSE json('') END AS template_move_category_guard`,
      values: [template.id, workspace.id, template.updated_at],
    },
    {
      sql: "UPDATE estimate_templates SET category = ?, sort_order = ?, updated_at = ? WHERE id = ? AND workspace_id = ? AND updated_at = ?",
      values: [category, sortOrder, timestamp, template.id, workspace.id, template.updated_at],
    },
    buildTemplateMutationTelemetryStatement({
      actorUserId: currentUser.userId,
      workspaceId: workspace.id,
      templateId: template.id,
      action: "move_category",
      intentId: identity.intentId,
      timestamp,
      metadata: { category, sortOrder },
    }),
    buildTemplateMutationReceiptStatement({
      ...identity,
      templateId: template.id,
      result,
      timestamp,
    }),
  ];
  try {
    await runTemplateAtomicBatch(database, statements);
  } catch (error) {
    const committed = await readCommittedTemplateMutation(database, identity, parseTemplateHeaderMutationReceipt);
    if (committed) {
      return {
        templateId: committed.templateId,
        category: committed.category ?? category,
        sortOrder: committed.sortOrder ?? sortOrder,
      };
    }
    throw error;
  }
  revalidateTemplateSurfaces();
  return { templateId: template.id, category, sortOrder };
}

/** Renames a template category (group): bulk text update scoped to the workspace. */
export async function renameTemplateCategory(input: { intentId?: string; from: string; to: string }) {
  const [{ workspace }, currentUser] = await Promise.all([ensureDefaultWorkspace(), requireCurrentUserContext()]);
  const from = input.from.trim();
  const to = input.to.trim();
  if (!from) throw new Error("Group name is required.");
  if (!to) throw new Error("Group name is required.");
  if (from === to) return { category: to, updatedCount: 0 };

  const database = await requireComponentLibraryActionsD1Database();
  await assertCanManageLibrary(database, workspace.id, currentUser);
  const identity = createTemplateMutationIdentity({
    workspaceId: workspace.id,
    commandKind: "template.rename_category",
    intentId: input.intentId,
    actorUserId: currentUser.userId,
    request: { from, to },
  });
  const replay = await readCommittedTemplateMutation(database, identity, parseTemplateCategoryMutationReceipt);
  if (replay) return replay;
  const templates = await all<{ id: string; updated_at: string }>(
    database,
    "SELECT id, updated_at FROM estimate_templates WHERE workspace_id = ? AND category = ? ORDER BY id ASC",
    [workspace.id, from],
  );
  if (templates.length === 0) return { category: to, updatedCount: 0 };
  const timestamp = nowIso();
  const result = { category: to, updatedCount: templates.length };
  const statements: TemplateMutationStatement[] = [
    {
      sql: `SELECT CASE WHEN
        (SELECT COUNT(*) FROM estimate_templates WHERE workspace_id = ? AND category = ?) = ?
        AND COALESCE((SELECT MAX(updated_at) FROM estimate_templates WHERE workspace_id = ? AND category = ?), '') = ?
      THEN 1 ELSE json('') END AS template_category_guard`,
      values: [workspace.id, from, templates.length, workspace.id, from, latestUpdatedAt(templates)],
    },
    {
      sql: "UPDATE estimate_templates SET category = ?, updated_at = ? WHERE workspace_id = ? AND category = ?",
      values: [to, timestamp, workspace.id, from],
    },
    buildTemplateMutationTelemetryStatement({
      actorUserId: currentUser.userId,
      workspaceId: workspace.id,
      templateId: null,
      action: "rename_category",
      intentId: identity.intentId,
      timestamp,
      metadata: { from, to, updatedCount: templates.length },
    }),
    buildTemplateMutationReceiptStatement({
      ...identity,
      templateId: null,
      result,
      timestamp,
    }),
  ];
  try {
    await runTemplateAtomicBatch(database, statements);
  } catch (error) {
    const committed = await readCommittedTemplateMutation(database, identity, parseTemplateCategoryMutationReceipt);
    if (committed) return committed;
    throw error;
  }
  revalidateTemplateSurfaces();
  return result;
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
  estimate_tab_id: string | null;
  kind: string;
  name: string;
};

export type EstimateTemplateInsertTargetResolution = {
  targetParentNodeId: string | null;
  targetTabId: string | null;
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
      SELECT id, parent_id, estimate_tab_id, kind, name
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
        targetTabId: node.estimate_tab_id,
        targetParentNodeName: node.name,
        targetParentNodeKind: kind,
        targetParentNodePath: nodePath(node),
      };
    }
  }
  return {
    targetParentNodeId: null,
    targetTabId: null,
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
