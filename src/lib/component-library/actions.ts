"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";

import { requireAuth, requireCurrentUserContext } from "@/lib/auth/session";
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
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/service-role";
import type { Json, Tables } from "@/lib/supabase/types";
import { isUuid } from "@/lib/ids";
import { isMissingRelationError } from "@/lib/repositories/estimate-schema-compat";
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
import { throwActionError } from "./action-errors";
import { unitUsesContentConversion } from "./unit-options";

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
  confidence?: string;
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
  confidence?: string;
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

export type LibraryFolderActionResult = {
  folder: Tables<"library_folders">;
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
  revalidatePath("/workshop/components");
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
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  // react-doctor-disable-next-line react-doctor/supabase-client-owned-authz-field -- Server-side RPC authorization helper; workspace id is verified server-side.
  workspaceId: string,
  action = "manage_library_folders",
) {
  const { data, error } = await supabase.rpc("is_workspace_editor", { target_workspace_id: workspaceId });
  if (error) throwActionError("Could not verify library folder access.", error);
  if (data !== true) {
    recordLibraryEvent("authz_denied", { workspaceId, action, role: "viewer" });
    throw new Error("Only workspace editors/admins can manage library folders.");
  }
}

// Library Optimization Plan P3 T17 (F19/D8): app-layer fail-fast guard mirroring
// assertCanManageLibraryFolders, applied to every mutating component/template action so
// a workspace viewer is denied at the app boundary (defense-in-depth on top of the RLS
// editor-write split). The is_workspace_editor RPC returns true for editors/admins.
async function assertCanManageLibrary(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  workspaceId: string,
  action = "manage_library",
) {
  const { data, error } = await supabase.rpc("is_workspace_editor", { target_workspace_id: workspaceId });
  if (error) throwActionError("Could not verify library access.", error);
  if (data !== true) {
    recordLibraryEvent("authz_denied", { workspaceId, action, role: "viewer" });
    throw new Error("Only workspace editors/admins can manage the library.");
  }
}

async function assertCanEditEstimate(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  workspaceId: string,
  estimateId: string,
  action = "resolve_estimate_template_insert_target",
) {
  const { data, error } = await supabase.rpc("can_edit_estimate", { target_estimate_id: estimateId });
  if (error) throwActionError("Could not verify estimate edit access.", error);
  if (data !== true) {
    recordLibraryEvent("authz_denied", { workspaceId, estimateId, action, role: "viewer" });
    throw new Error("Estimate edit access denied.");
  }
}

async function assertCanPublishEstimateTemplateFromEstimate(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  estimateId: string,
) {
  const { data, error } = await supabase.rpc("can_edit_estimate", { target_estimate_id: estimateId });
  if (error) throwActionError("Could not verify estimate edit access.", error);
  if (data !== true) throw new Error("Estimate edit access is required to save this estimate as a template.");
}

// Library Optimization Plan P3 T19 (F24): a generous per-workspace creation quota so a
// runaway client / abuse cannot create unbounded library rows. Enforced at the app layer
// (a head count, no migration). The caps are far above any legitimate workspace today.
const LIBRARY_COMPONENT_CAP = 10_000;
const LIBRARY_TEMPLATE_CAP = 2_000;

type ComponentLibraryTelemetryEventInsert = {
  actor_user_id: string;
  workspace_id: string | null;
  project_id: string | null;
  estimate_id: string | null;
  event_name: string;
  schema_version: "v1";
  surface: string | null;
  kind: string | null;
  resource_kind: string | null;
  action: string | null;
  reason: string | null;
  payload: Json;
};

type ComponentLibraryTelemetryInsertClient = {
  from: (table: "component_library_telemetry_events") => {
    insert: (row: ComponentLibraryTelemetryEventInsert) => PromiseLike<{ error: { message?: string } | null }>;
  };
};

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

type ComponentLibraryPreferenceRow = {
  active_tab: string | null;
  component_view_mode: string | null;
  favorite_item_ids: string[] | null;
  recent_item_ids: string[] | null;
  tree_order: Json | null;
  updated_at: string | null;
};

type ComponentLibraryPreferenceUpsert = {
  user_id: string;
  workspace_id: string;
  active_tab: ComponentLibraryPreferenceTab;
  component_view_mode: ComponentLibraryPreferenceViewMode;
  favorite_item_ids: string[];
  recent_item_ids: string[];
  tree_order: Json;
};

type ComponentLibraryPreferenceQuery = {
  select: (columns: string) => ComponentLibraryPreferenceQuery;
  eq: (column: string, value: string) => ComponentLibraryPreferenceQuery;
  maybeSingle: () => PromiseLike<{ data: ComponentLibraryPreferenceRow | null; error: { message?: string } | null }>;
  upsert: (
    row: ComponentLibraryPreferenceUpsert,
    options: { onConflict: string },
  ) => PromiseLike<{ error: { message?: string } | null }>;
};

type ComponentLibraryPreferenceClient = {
  from: (table: "component_library_user_preferences") => ComponentLibraryPreferenceQuery;
};

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
      const supabase = await createSupabaseServerClient();
      const { data, error } = await supabase.rpc("is_workspace_member", { target_workspace_id: workspaceId });
      if (error || data !== true) return { ok: false, ignored: true };
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
    const admin = createSupabaseServiceRoleClient("archestimator-component-library-telemetry") as unknown as ComponentLibraryTelemetryInsertClient;
    const { error } = await admin.from("component_library_telemetry_events").insert({
      actor_user_id: user.userId,
      workspace_id: workspaceId,
      project_id: readOptionalTelemetryUuid(record.projectId),
      estimate_id: readOptionalTelemetryUuid(record.estimateId),
      event_name: event,
      schema_version: schemaVersion,
      surface: surface ?? null,
      kind: kind ?? null,
      resource_kind: resourceKind ?? null,
      action: action ?? null,
      reason: reason ?? null,
      payload: payload as Json,
    });

    if (error) return { ok: false, ignored: true };
    return { ok: true };
  } catch {
    return { ok: false, ignored: true };
  }
}

export async function loadComponentLibraryUserPreferences(): Promise<ComponentLibraryUserPreferences | null> {
  try {
    const [{ workspace }, currentUser] = await Promise.all([ensureDefaultWorkspace(), requireCurrentUserContext()]);
    const admin = createSupabaseServiceRoleClient("archestimator-component-library-preferences-read") as unknown as ComponentLibraryPreferenceClient;
    const { data, error } = await admin
      .from("component_library_user_preferences")
      .select("active_tab,component_view_mode,favorite_item_ids,recent_item_ids,tree_order,updated_at")
      .eq("user_id", currentUser.userId)
      .eq("workspace_id", workspace.id)
      .maybeSingle();

    if (error || !data) return null;
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
    const admin = createSupabaseServiceRoleClient("archestimator-component-library-preferences-write") as unknown as ComponentLibraryPreferenceClient;
    const { error } = await admin
      .from("component_library_user_preferences")
      .upsert({
        user_id: currentUser.userId,
        workspace_id: workspace.id,
        active_tab: preferences.activeTab,
        component_view_mode: preferences.componentViewMode,
        favorite_item_ids: preferences.favoriteItemIds,
        recent_item_ids: preferences.recentItemIds,
        tree_order: preferences.treeOrder as Json,
      }, { onConflict: "user_id,workspace_id" });

    if (error) return { ok: false, ignored: true };
    return { ok: true };
  } catch {
    return { ok: false, ignored: true };
  }
}

async function assertWithinLibraryQuota(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  table: "cost_library_items" | "estimate_templates",
  workspaceId: string,
  cap: number,
  label: string,
) {
  const { count, error } = await supabase
    .from(table)
    .select("id", { count: "exact", head: true })
    .eq("workspace_id", workspaceId);
  if (error) throwActionError(`Could not verify the ${label} limit.`, error);
  if ((count ?? 0) >= cap) {
    throw new Error(`This workspace has reached its ${label} limit (${cap}). Archive or delete some first.`);
  }
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
    supplier: readOptionalComponentText(input.supplier, "Supplier", QUICK_ADD_TEXT_LIMITS.supplier),
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
    metadata: input.metadata,
  };
}

function stripOpenDesignAddComponentRpcComponent(input: ReturnType<typeof normalizeComponentInput>) {
  const component = { ...input };
  delete component.libraryFolderId;
  return component;
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
    confidence: input.confidence,
  });
  if (sourceValidation.errors.pricingDate) throw new Error(sourceValidation.errors.pricingDate);
  if (sourceValidation.errors.pricingSource) throw new Error(sourceValidation.errors.pricingSource);
  if (sourceValidation.errors.confidence) throw new Error(sourceValidation.errors.confidence);
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
          confidence: entry.confidence,
        });
        if (entryValidation.errors.pricingDate) throw new Error(entryValidation.errors.pricingDate);
        if (entryValidation.errors.pricingSource) throw new Error(entryValidation.errors.pricingSource);
        if (entryValidation.errors.confidence) throw new Error(entryValidation.errors.confidence);
        return {
          ...entry,
          clientId: entry.clientId?.trim() || entry.id?.trim() || undefined,
          unitCost: roundQuickAddMoney(entry.unitCost),
          miscCost: roundQuickAddMoney(entry.miscCost ?? 0),
          currency: entry.currency ?? input.currency ?? "PHP",
          pricingSource: entryValidation.normalized.pricingSource ?? null,
          pricingDate: entryValidation.normalized.pricingDate || input.pricingDate || new Date().toISOString().slice(0, 10),
          confidence: entryValidation.normalized.confidence ?? null,
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
        pricingDate: sourceValidation.normalized.pricingDate || new Date().toISOString().slice(0, 10),
        confidence: sourceValidation.normalized.confidence ?? null,
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
    confidence: sourceValidation.normalized.confidence ?? null,
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

function stripOpenDesignAddComponentRpcPriceOption(input: ReturnType<typeof normalizePriceOptionInput>) {
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
    effectiveAt: input.effectiveAt,
    changeReason: input.changeReason,
  };
}

function readMetadataObject(metadata: Json | undefined): { [key: string]: Json | undefined } {
  if (metadata && typeof metadata === "object" && !Array.isArray(metadata)) return metadata;
  return {};
}

function getRpcString(result: unknown, key: string): string | undefined {
  if (!result || typeof result !== "object" || Array.isArray(result)) return undefined;
  const value = (result as Record<string, unknown>)[key];
  return typeof value === "string" ? value : undefined;
}

function getRpcNumber(result: unknown, key: string): number | undefined {
  if (!result || typeof result !== "object" || Array.isArray(result)) return undefined;
  const value = (result as Record<string, unknown>)[key];
  return typeof value === "number" ? value : undefined;
}

function getRpcPriceOptions(result: unknown): Array<{ id: string; label: string; isDefault: boolean }> {
  if (!result || typeof result !== "object" || Array.isArray(result)) return [];
  const value = (result as Record<string, unknown>).priceOptions;
  if (!Array.isArray(value)) return [];
  return value.flatMap((entry) => {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) return [];
    const option = entry as Record<string, unknown>;
    return typeof option.id === "string" && typeof option.label === "string"
      ? [{ id: option.id, label: option.label, isDefault: option.isDefault === true }]
      : [];
  });
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
  const supabase = await createSupabaseServerClient();
  await assertCanManageLibrary(supabase, workspace.id);
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
    confidence: defaultPriceOption?.confidence,
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
    confidence: defaultPriceOption?.confidence,
    libraryFolderId: component.libraryFolderId,
  });
  const normalizedPriceOptions = priceOptionInputs.map((option) => normalizePriceOptionInput({ ...option, unit: option.unit || component.unit }));
  const priceOptions = input.fieldContract === "opendesign-add-component"
    ? normalizedPriceOptions.map(stripOpenDesignAddComponentRpcPriceOption)
    : normalizedPriceOptions;
  const componentPayload = input.fieldContract === "opendesign-add-component"
    ? stripOpenDesignAddComponentRpcComponent(component)
    : component;
  await assertWithinLibraryQuota(supabase, "cost_library_items", workspace.id, LIBRARY_COMPONENT_CAP, "component");
  const { data, error } = await supabase.rpc("create_cost_library_component", {
    target_workspace_id: workspace.id,
    component: { ...componentPayload, createdBy: currentUser.userId } as Json,
    price_options: priceOptions as Json,
  });

  if (error) throwActionError("Could not create component.", error);
  revalidateLibraryRoutes();
  return {
    itemId: getRpcString(data, "itemId"),
    versionNumber: getRpcNumber(data, "versionNumber"),
    activePriceOptionId: getRpcString(data, "activePriceOptionId"),
    priceOptions: getRpcPriceOptions(data),
  };
}

export async function updateCostLibraryComponent(itemId: string, input: CostLibraryComponentInput) {
  const [{ workspace }, currentUser] = await Promise.all([ensureDefaultWorkspace(), requireCurrentUserContext()]);
  const supabase = await createSupabaseServerClient();
  await assertCanManageLibrary(supabase, workspace.id);
  const { data, error } = await supabase.rpc("update_cost_library_component", {
    target_workspace_id: workspace.id,
    target_item_id: itemId,
    component: { ...normalizeComponentInput(input), updatedBy: currentUser.userId } as Json,
  });

  if (error) throwActionError("Could not update component.", error);
  revalidateLibraryRoutes();
  return {
    itemId: getRpcString(data, "itemId"),
    versionNumber: getRpcNumber(data, "versionNumber"),
  };
}

export async function upsertCostLibraryComponentPriceOption(itemId: string, input: ComponentPriceOptionInput) {
  const [{ workspace }, currentUser] = await Promise.all([ensureDefaultWorkspace(), requireCurrentUserContext()]);
  const supabase = await createSupabaseServerClient();
  await assertCanManageLibrary(supabase, workspace.id);
  const { data, error } = await supabase.rpc("upsert_cost_library_component_price_option", {
    target_workspace_id: workspace.id,
    target_item_id: itemId,
    price_option: { ...normalizePriceOptionInput(input), updatedBy: currentUser.userId } as Json,
  });

  if (error) throwActionError("Could not save price option.", error);
  revalidateLibraryRoutes();
  return {
    itemId: getRpcString(data, "itemId"),
    priceOptionId: getRpcString(data, "priceOptionId"),
    versionNumber: getRpcNumber(data, "versionNumber"),
  };
}

export async function changeCostLibraryComponentLifecycleState(input: {
  itemId: string;
  lifecycleState: ComponentLifecycleState;
  changeReason?: string;
  effectiveAt?: string;
}) {
  const [{ workspace }, currentUser] = await Promise.all([ensureDefaultWorkspace(), requireCurrentUserContext()]);
  const supabase = await createSupabaseServerClient();
  await assertCanManageLibrary(supabase, workspace.id);
  const { data, error } = await supabase.rpc("set_cost_library_component_lifecycle_state", {
    target_workspace_id: workspace.id,
    target_item_id: input.itemId,
    next_state: input.lifecycleState,
    change_reason: input.changeReason ?? "",
    effective_at: input.effectiveAt ?? new Date().toISOString(),
    acting_user_id: currentUser.userId,
  });

  if (error) throwActionError("Could not change component state.", error);
  revalidateLibraryRoutes();
  return {
    itemId: getRpcString(data, "itemId"),
    versionNumber: getRpcNumber(data, "versionNumber"),
    lifecycleState: getRpcString(data, "lifecycleState"),
  };
}

export async function previewBulkArchiveLibraryComponents(input: BulkArchiveLibraryComponentsInput): Promise<BulkActionPreviewResult> {
  const { ids, issues } = normalizeBulkActionIds(input.itemIds, { label: "components", max: 500 });
  if (issues.length > 0) return buildRejectedPreviewResult("library_component", ids, issues);

  const [{ workspace }] = await Promise.all([
    ensureDefaultWorkspace(),
    requireCurrentUserContext(),
  ]);
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("preview_bulk_archive_library_components", {
    target_workspace_id: workspace.id,
    target_item_ids: ids,
  });

  if (error) {
    return buildRejectedPreviewResult("library_component", ids, [{
      code: "rpc_error",
      message: `Could not preview component archive: ${error.message}`,
    }]);
  }

  return coerceBulkPreviewResult(data, { targetType: "library_component", ids });
}

export async function executeBulkArchiveLibraryComponents(input: ExecuteBulkArchiveLibraryComponentsInput): Promise<BulkActionExecutionResult> {
  const { ids, issues } = normalizeBulkActionIds(input.itemIds, { label: "components", max: 500 });
  if (issues.length > 0) {
    return {
      ...buildRejectedPreviewResult("library_component", ids, issues),
      archivedIds: [],
    };
  }

  const [{ workspace }] = await Promise.all([
    ensureDefaultWorkspace(),
    requireCurrentUserContext(),
  ]);
  const supabase = await createSupabaseServerClient();
  await assertCanManageLibrary(supabase, workspace.id);
  const { data, error } = await supabase.rpc("execute_bulk_archive_library_components", {
    target_workspace_id: workspace.id,
    target_item_ids: ids,
    expected_preview_hash: input.expectedPreviewHash,
    correlation_id: getMassDeletionCorrelationId(input.correlationId),
  });

  if (error) {
    return {
      ok: false,
      targetType: "library_component",
      ids,
      archivedIds: [],
      summary: { requestedCount: ids.length, eligibleCount: 0, blockedCount: 1 },
      issues: [{
        code: "rpc_error",
        message: `Could not archive components: ${error.message}`,
      }],
    };
  }

  const result = coerceBulkExecutionResult(data, { targetType: "library_component", ids });
  if (result.ok) revalidateLibraryRoutes();
  return result;
}

export async function createLibraryFolder(parentId: string | null, name: string, options: CreateLibraryFolderOptions = {}): Promise<LibraryFolderActionResult> {
  const [{ workspace }, currentUser] = await Promise.all([ensureDefaultWorkspace(), requireCurrentUserContext()]);
  const supabase = await createSupabaseServerClient();
  await assertCanManageLibraryFolders(supabase, workspace.id);
  const parentResult = parentId
    ? await supabase
        .from("library_folders")
        .select("id, workspace_id")
        .eq("id", parentId)
        .eq("workspace_id", workspace.id)
        .maybeSingle()
    : null;

  if (parentResult?.error) throw parentResult.error;
  if (parentId && !parentResult?.data) throw new Error("Parent folder not found in the current workspace.");

  let siblingsQuery = supabase
    .from("library_folders")
    .select("id, sort_order")
    .eq("workspace_id", workspace.id);
  siblingsQuery = parentId ? siblingsQuery.eq("parent_id", parentId) : siblingsQuery.is("parent_id", null);
  const { data: siblings, error: siblingsError } = await siblingsQuery;
  if (siblingsError) throw siblingsError;

  const placement = options.placement ?? "bottom";
  const siblingRows = siblings ?? [];
  const nextSortOrder = getLibraryFolderCreateSortOrder(siblingRows, placement);
  if (placement === "top" && siblingRows.some((sibling) => sibling.sort_order === nextSortOrder)) {
    const sortedSiblings = [...siblingRows].sort((left, right) => right.sort_order - left.sort_order);
    for (const sibling of sortedSiblings) {
      const { error: shiftError } = await supabase
        .from("library_folders")
        .update({ sort_order: sibling.sort_order + LIBRARY_FOLDER_SORT_ORDER_STEP })
        .eq("id", sibling.id)
        .eq("workspace_id", workspace.id);
      if (shiftError) throw shiftError;
    }
  }
  const { data, error } = await supabase
    .from("library_folders")
    .insert({
      workspace_id: workspace.id,
      parent_id: parentId,
      name: readFolderName(name),
      sort_order: nextSortOrder,
      folder_kind: "custom",
      created_by: currentUser.userId,
    })
    .select("*")
    .single();

  if (error) throw error;
  revalidateLibraryRoutes();
  return { folder: data };
}

export async function renameLibraryFolder(folderId: string, name: string): Promise<LibraryFolderActionResult> {
  await requireAuth();
  const { workspace } = await ensureDefaultWorkspace();
  const supabase = await createSupabaseServerClient();
  await assertCanManageLibraryFolders(supabase, workspace.id);
  const { data, error } = await supabase
    .from("library_folders")
    .update({ name: readFolderName(name) })
    .eq("id", folderId)
    .eq("workspace_id", workspace.id)
    .select("*")
    .single();

  if (error) throw error;
  revalidateLibraryRoutes();
  return { folder: data };
}

export async function deleteLibraryFolder(folderId: string): Promise<void> {
  await requireAuth();
  const { workspace } = await ensureDefaultWorkspace();
  const supabase = await createSupabaseServerClient();
  await assertCanManageLibraryFolders(supabase, workspace.id);
  if (!isUuid(folderId)) throw new Error("Library folder not found in the current workspace.");

  const { error } = await supabase.rpc("delete_library_folder", {
    target_workspace_id: workspace.id,
    target_folder_id: folderId,
  });
  if (error) throwActionError("Could not delete library folder.", error);

  revalidateLibraryRoutes();
}

export async function reorderLibraryFolders(input: ReorderLibraryFoldersInput): Promise<void> {
  await requireAuth();
  if (!input.updates.length) throw new Error("At least one library folder update is required.");

  const { workspace } = await ensureDefaultWorkspace();
  const supabase = await createSupabaseServerClient();
  await assertCanManageLibraryFolders(supabase, workspace.id);
  const folderUpdates = input.updates.map((update) => ({
    id: update.id,
    parent_id: update.parentId,
    sort_order: update.sortOrder,
  }));
  const { error } = await supabase.rpc("reorder_library_folders", {
    target_workspace_id: workspace.id,
    folder_updates: folderUpdates,
  });

  if (error) throwActionError("Could not reorder library folders.", error);
  revalidateLibraryRoutes();
}

export async function moveCostLibraryComponentToFolder(input: MoveCostLibraryComponentToFolderInput): Promise<void> {
  const [{ workspace }] = await Promise.all([
    ensureDefaultWorkspace(),
    requireCurrentUserContext(),
  ]);
  const supabase = await createSupabaseServerClient();
  await assertCanManageLibraryFolders(supabase, workspace.id);

  if (!isUuid(input.itemId)) throw new Error("Component not found in the current workspace.");

  let targetFolderId: string | null = null;
  if (input.libraryFolderId) {
    if (!isUuid(input.libraryFolderId)) throw new Error("Library folder not found in the current workspace.");
    const { data: folder, error: folderError } = await supabase
      .from("library_folders")
      .select("id")
      .eq("id", input.libraryFolderId)
      .eq("workspace_id", workspace.id)
      .maybeSingle();

    if (folderError) throw folderError;
    if (!folder) throw new Error("Library folder not found in the current workspace.");
    targetFolderId = folder.id;
  }

  const { data: component, error } = await supabase
    .from("cost_library_items")
    .update({ library_folder_id: targetFolderId })
    .eq("id", input.itemId)
    .eq("workspace_id", workspace.id)
    .select("id")
    .maybeSingle();

  if (error) throwActionError("Could not move component.", error);
  if (!component) throw new Error("Component not found in the current workspace.");
  revalidateLibraryRoutes();
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
  const [{ workspace }, currentUser] = await Promise.all([ensureDefaultWorkspace(), requireCurrentUserContext()]);
  const supabase = await createSupabaseServerClient();
  await assertCanManageLibrary(supabase, workspace.id);

  const templateName = input.name.trim();
  if (!templateName) throw new Error("Template name is required.");
  const templateCategory = (input.category ?? "").trim() || "General";
  const templateDescription = (input.description ?? "").trim();
  if (!isUuid(input.estimateId) || !isUuid(input.sourceNodeId)) {
    throw new Error("Estimate node not found in the current workspace.");
  }

  const { data: estimate, error: estimateError } = await supabase
    .from("estimates")
    .select("id, project_id, projects!inner(id, workspace_id)")
    .eq("id", input.estimateId)
    .eq("project_id", input.projectId)
    .eq("projects.workspace_id", workspace.id)
    .maybeSingle();
  if (estimateError) throwActionError("Could not load the estimate.", estimateError);
  if (!estimate) throw new Error("Estimate not found in the current workspace.");
  await assertCanPublishEstimateTemplateFromEstimate(supabase, input.estimateId);

  const { data: nodeRows, error: nodesError } = await supabase
    .from("estimate_nodes")
    .select("id, parent_id, kind, name, sort_order")
    .eq("estimate_id", input.estimateId)
    .order("sort_order", { ascending: true });
  if (nodesError) throwActionError("Could not load the estimate tree.", nodesError);

  const allNodes = (nodeRows ?? []) as EstimateNodeSubtreeRow[];
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
  const { data: rowItemRows, error: rowItemsError } = await supabase
    .from("estimate_row_items")
    .select(
      "id, node_id, sort_order, source_library_item_id, source_snapshot, category_node_id, supplier_id, material, description, supplier, unit, quantity, unit_cost, contingency_percentage, adjustment_percentage, misc_cost, discipline, designation, link_state, metadata",
    )
    .eq("estimate_id", input.estimateId)
    .in("node_id", subtreeNodeIds)
    .order("sort_order", { ascending: true });
  if (rowItemsError) throwActionError("Could not load the estimate rows.", rowItemsError);

  const { data: siblingTemplates, error: sortError } = await supabase
    .from("estimate_templates")
    .select("sort_order")
    .eq("workspace_id", workspace.id)
    .order("sort_order", { ascending: false })
    .limit(1);
  if (sortError) throwActionError("Could not create the template.", sortError);
  const nextSortOrder = (siblingTemplates?.[0]?.sort_order ?? -1) + 1;

  const { data: insertedTemplate, error: templateError } = await supabase
    .from("estimate_templates")
    .insert({
      workspace_id: workspace.id,
      name: templateName,
      description: templateDescription,
      category: templateCategory,
      sort_order: nextSortOrder,
      created_by: currentUser.userId,
      metadata: {
        savedFrom: "estimate-workspace",
        sourceEstimateId: input.estimateId,
        sourceNodeId: input.sourceNodeId,
      },
    })
    .select("*")
    .single();
  if (templateError || !insertedTemplate) {
    throwActionError("Could not create the template.", templateError);
  }

  try {
    const templateNodeIdBySourceId = new Map<string, string>(subtreeNodes.map((node) => [node.id, randomUUID()]));
    const templateNodeInserts = subtreeNodes.map((node) => ({
      id: templateNodeIdBySourceId.get(node.id)!,
      template_id: insertedTemplate.id,
      // The saved node becomes the template root; descendants keep shape.
      parent_id: node.id === sourceNode.id ? null : templateNodeIdBySourceId.get(node.parent_id ?? "") ?? null,
      kind: node.kind as "group" | "area",
      name: node.name,
      sort_order: node.id === sourceNode.id ? 0 : node.sort_order,
      metadata: {},
    }));

    const { data: insertedNodes, error: nodeInsertError } = await supabase
      .from("estimate_template_nodes")
      .insert(templateNodeInserts)
      .select("*");
    if (nodeInsertError) throwActionError("Could not copy the node structure.", nodeInsertError);

    const rowInserts = (rowItemRows ?? []).map((row) => ({
      template_id: insertedTemplate.id,
      template_node_id: templateNodeIdBySourceId.get(row.node_id)!,
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
      contingency_percentage: 0,
      adjustment_percentage: row.adjustment_percentage,
      misc_cost: row.misc_cost,
      discipline: row.discipline,
      designation: row.designation,
      link_state: row.link_state,
      metadata: row.metadata,
    }));

    let insertedRowItems: Tables<"estimate_template_row_items">[] = [];
    if (rowInserts.length > 0) {
      const { data, error: rowInsertError } = await supabase
        .from("estimate_template_row_items")
        .insert(rowInserts)
        .select("*");
      if (rowInsertError) throwActionError("Could not copy the estimate rows.", rowInsertError);
      insertedRowItems = data ?? [];
    }

    revalidateTemplateSurfaces();

    const [template] = buildEstimateTemplatesFromRows({
      templates: [insertedTemplate],
      nodes: insertedNodes ?? [],
      rowItems: insertedRowItems,
    });
    if (!template) throw new Error("Could not read back the created template.");
    return { template };
  } catch (error) {
    // Without a cross-statement transaction, a partial failure leaves an
    // orphan template; deleting it cascades to any copied nodes/rows.
    await supabase.from("estimate_templates").delete().eq("id", insertedTemplate.id);
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
  const [{ workspace }, currentUser] = await Promise.all([ensureDefaultWorkspace(), requireCurrentUserContext()]);
  const supabase = await createSupabaseServerClient();
  await assertCanManageLibrary(supabase, workspace.id);

  const templateName = input.name.trim();
  if (!templateName) throw new Error("Template name is required.");
  const templateCategory = (input.category ?? "").trim() || "General";
  const templateDescription = (input.description ?? "").trim();
  const sourceTabName = input.tabName.trim() || "Project tab";
  if (!isUuid(input.estimateId) || !isUuid(input.tabId)) {
    throw new Error("Estimate tab not found in the current workspace.");
  }

  const { data: estimate, error: estimateError } = await supabase
    .from("estimates")
    .select("id, project_id, projects!inner(id, workspace_id)")
    .eq("id", input.estimateId)
    .eq("project_id", input.projectId)
    .eq("projects.workspace_id", workspace.id)
    .maybeSingle();
  if (estimateError) throwActionError("Could not load the estimate.", estimateError);
  if (!estimate) throw new Error("Estimate not found in the current workspace.");
  await assertCanPublishEstimateTemplateFromEstimate(supabase, input.estimateId);

  const { data: nodeRows, error: nodesError } = await supabase
    .from("estimate_nodes")
    .select("id, parent_id, kind, name, sort_order")
    .eq("estimate_id", input.estimateId)
    .filter("estimate_tab_id", "eq", input.tabId)
    .order("sort_order", { ascending: true });
  if (nodesError) throwActionError("Could not load the estimate tab tree.", nodesError);

  const sourceNodes: EstimateTabTemplateNodeRow[] = [];
  for (const node of nodeRows ?? []) {
    const kind = normalizeEstimateTreeNodeKind(node.kind);
    if (!kind) continue;
    sourceNodes.push({ ...node, kind });
  }
  if (sourceNodes.length === 0) throw new Error("The selected tab has no estimate nodes to save.");

  const sourceNodeIds = sourceNodes.map((node) => node.id);
  const { data: rowItemRows, error: rowItemsError } = await supabase
    .from("estimate_row_items")
    .select(
      "id, node_id, sort_order, source_library_item_id, source_snapshot, category_node_id, supplier_id, material, description, supplier, unit, quantity, unit_cost, contingency_percentage, adjustment_percentage, misc_cost, discipline, designation, link_state, metadata",
    )
    .eq("estimate_id", input.estimateId)
    .in("node_id", sourceNodeIds)
    .order("sort_order", { ascending: true });
  if (rowItemsError) throwActionError("Could not load the estimate rows.", rowItemsError);

  const { data: siblingTemplates, error: sortError } = await supabase
    .from("estimate_templates")
    .select("sort_order")
    .eq("workspace_id", workspace.id)
    .order("sort_order", { ascending: false })
    .limit(1);
  if (sortError) throwActionError("Could not create the template.", sortError);
  const nextSortOrder = (siblingTemplates?.[0]?.sort_order ?? -1) + 1;

  const { data: insertedTemplate, error: templateError } = await supabase
    .from("estimate_templates")
    .insert({
      workspace_id: workspace.id,
      name: templateName,
      description: templateDescription,
      category: templateCategory,
      sort_order: nextSortOrder,
      created_by: currentUser.userId,
      metadata: {
        savedFrom: "estimate-workspace-tab",
        sourceEstimateId: input.estimateId,
        sourceTabId: input.tabId,
        sourceTabName,
      },
    })
    .select("*")
    .single();
  if (templateError || !insertedTemplate) {
    throwActionError("Could not create the template.", templateError);
  }

  try {
    const wrapperNodeId = randomUUID();
    const templateNodeIdBySourceId = new Map<string, string>(sourceNodes.map((node) => [node.id, randomUUID()]));
    const sourceNodeIdSet = new Set(sourceNodeIds);
    const copiedNodeInserts = sourceNodes.map((node) => {
      const templateNodeId = templateNodeIdBySourceId.get(node.id);
      if (!templateNodeId) throw new Error("Could not map the estimate tab tree.");
      const mappedParentId = node.parent_id && sourceNodeIdSet.has(node.parent_id)
        ? templateNodeIdBySourceId.get(node.parent_id) ?? wrapperNodeId
        : wrapperNodeId;
      return {
        id: templateNodeId,
        template_id: insertedTemplate.id,
        parent_id: mappedParentId,
        kind: node.kind,
        name: node.name,
        sort_order: node.sort_order,
        metadata: {},
      };
    });
    const templateNodeInserts = [
      {
        id: wrapperNodeId,
        template_id: insertedTemplate.id,
        parent_id: null,
        kind: "group" as const,
        name: sourceTabName,
        sort_order: 0,
        metadata: {},
      },
      ...copiedNodeInserts,
    ];

    const { data: insertedNodes, error: nodeInsertError } = await supabase
      .from("estimate_template_nodes")
      .insert(templateNodeInserts)
      .select("*");
    if (nodeInsertError) throwActionError("Could not copy the tab structure.", nodeInsertError);

    const rowInserts = (rowItemRows ?? []).map((row) => {
      const templateNodeId = templateNodeIdBySourceId.get(row.node_id);
      if (!templateNodeId) throw new Error("Could not map the estimate tab rows.");
      return {
        template_id: insertedTemplate.id,
        template_node_id: templateNodeId,
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
        contingency_percentage: 0,
        adjustment_percentage: row.adjustment_percentage,
        misc_cost: row.misc_cost,
        discipline: row.discipline,
        designation: row.designation,
        link_state: row.link_state,
        metadata: row.metadata,
      };
    });

    let insertedRowItems: Tables<"estimate_template_row_items">[] = [];
    if (rowInserts.length > 0) {
      const { data, error: rowInsertError } = await supabase
        .from("estimate_template_row_items")
        .insert(rowInserts)
        .select("*");
      if (rowInsertError) throwActionError("Could not copy the estimate rows.", rowInsertError);
      insertedRowItems = data ?? [];
    }

    revalidateTemplateSurfaces();

    const [template] = buildEstimateTemplatesFromRows({
      templates: [insertedTemplate],
      nodes: insertedNodes ?? [],
      rowItems: insertedRowItems,
    });
    if (!template) throw new Error("Could not read back the created template.");
    return { template };
  } catch (error) {
    await supabase.from("estimate_templates").delete().eq("id", insertedTemplate.id);
    throw error;
  }
}

/** Renames a workspace estimate template. */
export async function renameEstimateTemplate(input: { templateId: string; name: string }) {
  const [{ workspace }] = await Promise.all([ensureDefaultWorkspace(), requireCurrentUserContext()]);
  const templateName = input.name.trim();
  if (!templateName) throw new Error("Template name is required.");
  if (!isUuid(input.templateId)) throw new Error("Template not found in the current workspace.");

  const supabase = await createSupabaseServerClient();
  await assertCanManageLibrary(supabase, workspace.id);
  const { data: template, error } = await supabase
    .from("estimate_templates")
    .update({ name: templateName })
    .eq("id", input.templateId)
    .eq("workspace_id", workspace.id)
    .select("id, name")
    .maybeSingle();

  if (error) throwActionError("Could not rename template.", error);
  if (!template) throw new Error("Template not found in the current workspace.");
  revalidateTemplateSurfaces();
  return { templateId: template.id, name: template.name };
}

/** Deletes a workspace estimate template; nodes and rows cascade. */
export async function deleteEstimateTemplate(input: { templateId: string }) {
  const [{ workspace }] = await Promise.all([ensureDefaultWorkspace(), requireCurrentUserContext()]);
  if (!isUuid(input.templateId)) throw new Error("Template not found in the current workspace.");

  const supabase = await createSupabaseServerClient();
  await assertCanManageLibrary(supabase, workspace.id);
  const { data: template, error } = await supabase
    .from("estimate_templates")
    .delete()
    .eq("id", input.templateId)
    .eq("workspace_id", workspace.id)
    .select("id")
    .maybeSingle();

  if (error) throwActionError("Could not delete template.", error);
  if (!template) throw new Error("Template not found in the current workspace.");
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

  const supabase = await createSupabaseServerClient();
  await assertCanManageLibrary(supabase, workspace.id);
  await assertWithinLibraryQuota(supabase, "estimate_templates", workspace.id, LIBRARY_TEMPLATE_CAP, "template");
  const { data: siblingTemplates, error: sortError } = await supabase
    .from("estimate_templates")
    .select("sort_order")
    .eq("workspace_id", workspace.id)
    .order("sort_order", { ascending: false })
    .limit(1);
  if (sortError) throwActionError("Could not create the template.", sortError);
  const nextSortOrder = (siblingTemplates?.[0]?.sort_order ?? -1) + 1;

  const { data: insertedTemplate, error: templateError } = await supabase
    .from("estimate_templates")
    .insert({
      workspace_id: workspace.id,
      name: templateName,
      description: templateDescription,
      category: templateCategory,
      sort_order: nextSortOrder,
      created_by: currentUser.userId,
      metadata: { savedFrom: "library-templates-browse" },
    })
    .select("*")
    .single();
  if (templateError || !insertedTemplate) {
    throwActionError("Could not create the template.", templateError);
  }

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

  const supabase = await createSupabaseServerClient();
  await assertCanManageLibrary(supabase, workspace.id);
  await assertWithinLibraryQuota(supabase, "estimate_templates", workspace.id, LIBRARY_TEMPLATE_CAP, "template");
  const { data: sourceTemplate, error: sourceError } = await supabase
    .from("estimate_templates")
    .select("*")
    .eq("id", input.templateId)
    .eq("workspace_id", workspace.id)
    .maybeSingle();
  if (sourceError) throwActionError("Could not duplicate template.", sourceError);
  if (!sourceTemplate) throw new Error("Template not found in the current workspace.");

  const [nodesResult, rowItemsResult, siblingResult] = await Promise.all([
    supabase
      .from("estimate_template_nodes")
      .select("*")
      .eq("template_id", sourceTemplate.id)
      .order("sort_order", { ascending: true }),
    supabase
      .from("estimate_template_row_items")
      .select("*")
      .eq("template_id", sourceTemplate.id)
      .order("sort_order", { ascending: true }),
    supabase
      .from("estimate_templates")
      .select("sort_order")
      .eq("workspace_id", workspace.id)
      .eq("category", sourceTemplate.category)
      .order("sort_order", { ascending: false })
      .limit(1),
  ]);
  if (nodesResult.error) throwActionError("Could not duplicate template.", nodesResult.error);
  if (rowItemsResult.error) throwActionError("Could not duplicate template.", rowItemsResult.error);
  if (siblingResult.error) throwActionError("Could not duplicate template.", siblingResult.error);
  const nextSortOrder = (siblingResult.data?.[0]?.sort_order ?? -1) + 1;

  const { data: insertedTemplate, error: templateError } = await supabase
    .from("estimate_templates")
    .insert({
      workspace_id: workspace.id,
      name: `${sourceTemplate.name} copy`,
      description: sourceTemplate.description,
      category: sourceTemplate.category,
      sort_order: nextSortOrder,
      created_by: currentUser.userId,
      metadata: {
        ...readMetadataObject(sourceTemplate.metadata),
        duplicatedFrom: sourceTemplate.id,
      },
    })
    .select("*")
    .single();
  if (templateError || !insertedTemplate) {
    throwActionError("Could not duplicate template.", templateError);
  }

  try {
    const sourceNodes = nodesResult.data ?? [];
    const templateNodeIdBySourceId = new Map<string, string>(sourceNodes.map((node) => [node.id, randomUUID()]));
    const nodeInserts = sourceNodes.map((node) => ({
      id: templateNodeIdBySourceId.get(node.id)!,
      template_id: insertedTemplate.id,
      parent_id: node.parent_id ? templateNodeIdBySourceId.get(node.parent_id) ?? null : null,
      kind: node.kind,
      name: node.name,
      sort_order: node.sort_order,
      metadata: node.metadata,
    }));

    let insertedNodes: Tables<"estimate_template_nodes">[] = [];
    if (nodeInserts.length > 0) {
      const { data, error: nodeInsertError } = await supabase
        .from("estimate_template_nodes")
        .insert(nodeInserts)
        .select("*");
      if (nodeInsertError) throwActionError("Could not copy the node structure.", nodeInsertError);
      insertedNodes = data ?? [];
    }

    const rowInserts = (rowItemsResult.data ?? []).map((row) => ({
      template_id: insertedTemplate.id,
      template_node_id: templateNodeIdBySourceId.get(row.template_node_id)!,
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
      contingency_percentage: row.contingency_percentage,
      adjustment_percentage: row.adjustment_percentage,
      misc_cost: row.misc_cost,
      discipline: row.discipline,
      designation: row.designation,
      link_state: row.link_state,
      metadata: row.metadata,
    }));

    let insertedRowItems: Tables<"estimate_template_row_items">[] = [];
    if (rowInserts.length > 0) {
      const { data, error: rowInsertError } = await supabase
        .from("estimate_template_row_items")
        .insert(rowInserts)
        .select("*");
      if (rowInsertError) throwActionError("Could not copy the template rows.", rowInsertError);
      insertedRowItems = data ?? [];
    }

    revalidateTemplateSurfaces();

    const [template] = buildEstimateTemplatesFromRows({
      templates: [insertedTemplate],
      nodes: insertedNodes,
      rowItems: insertedRowItems,
    });
    if (!template) throw new Error("Could not read back the duplicated template.");
    return { template };
  } catch (error) {
    // Without a cross-statement transaction, a partial failure leaves an
    // orphan template; deleting it cascades to any copied nodes/rows.
    await supabase.from("estimate_templates").delete().eq("id", insertedTemplate.id);
    throw error;
  }
}

/** Moves a template to another category (group), optionally repositioning it. */
export async function moveEstimateTemplateToCategory(input: { templateId: string; category: string; sortOrder?: number }) {
  const [{ workspace }] = await Promise.all([ensureDefaultWorkspace(), requireCurrentUserContext()]);
  const category = input.category.trim();
  if (!category) throw new Error("Group name is required.");
  if (!isUuid(input.templateId)) throw new Error("Template not found in the current workspace.");
  if (input.sortOrder !== undefined && (!Number.isFinite(input.sortOrder) || input.sortOrder < 0)) {
    throw new Error("Template position must be a non-negative number.");
  }

  const supabase = await createSupabaseServerClient();
  await assertCanManageLibrary(supabase, workspace.id);
  const patch: { category: string; sort_order?: number } = { category };
  if (input.sortOrder !== undefined) patch.sort_order = input.sortOrder;
  const { data: template, error } = await supabase
    .from("estimate_templates")
    .update(patch)
    .eq("id", input.templateId)
    .eq("workspace_id", workspace.id)
    .select("id, category, sort_order")
    .maybeSingle();

  if (error) throwActionError("Could not move template.", error);
  if (!template) throw new Error("Template not found in the current workspace.");
  revalidateTemplateSurfaces();
  return { templateId: template.id, category: template.category, sortOrder: template.sort_order };
}

/** Renames a template category (group): bulk text update scoped to the workspace. */
export async function renameTemplateCategory(input: { from: string; to: string }) {
  const [{ workspace }] = await Promise.all([ensureDefaultWorkspace(), requireCurrentUserContext()]);
  const from = input.from.trim();
  const to = input.to.trim();
  if (!from) throw new Error("Group name is required.");
  if (!to) throw new Error("Group name is required.");
  if (from === to) return { category: to, updatedCount: 0 };

  const supabase = await createSupabaseServerClient();
  await assertCanManageLibrary(supabase, workspace.id);
  const { data, error } = await supabase
    .from("estimate_templates")
    .update({ category: to })
    .eq("workspace_id", workspace.id)
    .eq("category", from)
    .select("id");

  if (error) throwActionError("Could not rename group.", error);
  revalidateTemplateSurfaces();
  return { category: to, updatedCount: data?.length ?? 0 };
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
  const [{ workspace }] = await Promise.all([ensureDefaultWorkspace(), requireCurrentUserContext()]);
  if (!isUuid(input.projectId) || !isUuid(input.estimateId)) {
    throw new Error("Estimate not found in the current workspace.");
  }

  const supabase = await createSupabaseServerClient();
  const { data: estimate, error: estimateError } = await supabase
    .from("estimates")
    .select("id, project_id, projects!inner(id, workspace_id)")
    .eq("id", input.estimateId)
    .eq("project_id", input.projectId)
    .eq("projects.workspace_id", workspace.id)
    .maybeSingle();
  if (estimateError) throwActionError("Could not load the estimate.", estimateError);
  if (!estimate) throw new Error("Estimate not found in the current workspace.");
  await assertCanEditEstimate(supabase, workspace.id, input.estimateId);

  const { data: nodeRows, error: nodesError } = await supabase
    .from("estimate_nodes")
    .select("id, parent_id, kind, name")
    .eq("estimate_id", input.estimateId)
    .order("sort_order", { ascending: true });
  if (nodesError) throwActionError("Could not load the estimate tree.", nodesError);

  const nodes = (nodeRows ?? []) as EstimateInsertTargetNodeRow[];
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
  await Promise.all([ensureDefaultWorkspace(), requireCurrentUserContext()]);
  if (!isUuid(input.itemId)) return { templateRowCount: 0, estimateRowCount: 0 };

  const supabase = await createSupabaseServerClient();
  const [templateRows, estimateRows] = await Promise.all([
    supabase
      .from("estimate_template_row_items")
      .select("id", { count: "exact", head: true })
      .eq("source_library_item_id", input.itemId),
    supabase
      .from("estimate_row_items")
      .select("id", { count: "exact", head: true })
      .eq("source_library_item_id", input.itemId),
  ]);

  if (templateRows.error) throwActionError("Could not count template usage.", templateRows.error);
  if (estimateRows.error) throwActionError("Could not count estimate usage.", estimateRows.error);

  return {
    templateRowCount: templateRows.count ?? 0,
    estimateRowCount: estimateRows.count ?? 0,
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

  const supabase = await createSupabaseServerClient();
  const [componentsResult, templatesResult] = await Promise.all([
    supabase
      .from("cost_library_items")
      .select("id, name, category, supplier")
      .eq("workspace_id", workspace.id)
      .neq("lifecycle_state", "archived")
      .or(`name.ilike.${pattern},supplier.ilike.${pattern},brand.ilike.${pattern}`)
      .order("updated_at", { ascending: false })
      .limit(6),
    supabase
      .from("estimate_templates")
      .select("id, name, category")
      .eq("workspace_id", workspace.id)
      .ilike("name", pattern)
      .order("updated_at", { ascending: false })
      .limit(3),
  ]);

  if (componentsResult.error) throwActionError("Could not search components.", componentsResult.error);
  if (templatesResult.error && !isMissingRelationError(templatesResult.error, "estimate_templates")) {
    throwActionError("Could not search templates.", templatesResult.error);
  }

  return {
    components: (componentsResult.data ?? []).map((row) => ({
      id: row.id,
      name: row.name,
      category: row.category,
      supplier: row.supplier ?? "",
    })),
    templates: templatesResult.error
      ? []
      : (templatesResult.data ?? []).map((row) => ({
          id: row.id,
          name: row.name,
          category: row.category,
        })),
  };
}
