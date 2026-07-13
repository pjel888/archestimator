"use client";

import Image from "next/image";
import { useEffect, useId, useMemo, useRef, useState, useTransition } from "react";
import {
  Dna,
  ImageSquare,
  Money,
  Package,
  Paperclip,
  Plus,
  Trash,
  UploadSimple,
  X,
} from "@phosphor-icons/react/dist/ssr";

import { Button } from "@/components/ui/button";
import { ControlField, ControlInput, ControlTextarea } from "@/components/ui/control-input";
import { CreatableCombobox, type CreatableComboboxChange, type CreatableComboboxOption } from "@/components/ui/creatable-combobox";
import { DropdownSelect } from "@/components/ui/dropdown-select";
import { Modal } from "@/components/ui/modal";
import {
  COMPONENT_UNIT_COMBOBOX_OPTIONS,
  getSelectedUnitId,
  getUnitComboboxValue,
} from "@/components/workshop/component-unit-combobox-options";
import {
  createCostLibraryComponent,
  saveCostLibraryComponentDraft,
  updateCostLibraryComponentWithPriceOptions,
  type ComponentLifecycleState,
  type CreateCostLibraryComponentInput,
  type LibraryComponentInstanceSyncResult,
} from "@/lib/component-library/actions";
import {
  type LibraryFolderRecord,
} from "@/lib/component-library/library-folder-reorder";
import { validateQuickAddComponentInput } from "@/lib/component-library/quick-add-validation";
import type { ComponentLibraryTaxonomyNode } from "@/lib/component-library/taxonomy";
import {
  getUnitDisplayLabel,
} from "@/lib/component-library/unit-options";
import { normalizeEstimateRowImageUrl } from "@/lib/estimates/image-url";
import type { EstimateRowItem } from "@/lib/estimates/types";
import type { ComponentLibraryBrand } from "@/lib/repositories/component-library-repository";
import type { Json } from "@/lib/types/json";
import { cn } from "@/lib/ui/cn";
import {
  uploadComponentAttachment,
  validateComponentAttachmentFile,
} from "@/lib/uploads/component-attachment-client";
import { postUploadFormData } from "@/lib/uploads/client-upload";
import type { ComponentLibrarySupplierOption } from "../component-library/tree/buildLibraryTree";
import {
  type CreateLibraryFolderHandler,
  type ReorderStatus,
} from "./library-folder-tree-shared";

type VariantImageDraft = {
  bucket: string;
  path: string;
  thumbnailPath: string;
  thumbnailStoragePath: string;
  url: string;
  thumbnailUrl: string;
  width?: number;
  height?: number;
  originalBytes?: number;
  optimizedBytes?: number;
};

type VariantAttachmentDraft = {
  id: string;
  bucket: string;
  path: string;
  fileName: string;
  contentType: string;
  sizeBytes: number;
  uploadSessionId?: string;
  assetId?: string;
  scanStatus?: string | null;
};

type VariantDraft = {
  id: string;
  label: string;
  description: string;
  sku: string;
  unitCost: string;
  unit: string;
  packageQuantity: string;
  packageUnit: string;
  isDefault: boolean;
  image: VariantImageDraft | null;
  attachments: VariantAttachmentDraft[];
};

type ComponentDraft = {
  name: string;
  category: string;
  categoryNodeId: string;
  supplierId: string;
  supplierName: string;
  brand: string;
  brandId: string;
  thumbnailPath: string;
  lifecycleState: ComponentLifecycleState;
  effectiveAt: string;
  changeReason: string;
  sharedImageForAllVariants: boolean;
  sharedImage: VariantImageDraft | null;
  variants: VariantDraft[];
};

type CatalogueOptionKind = "category" | "supplier" | "brand";

type LocalCatalogueOption = {
  id: string;
  label: string;
  createdAt: string;
};

type LocalCatalogueOptionsState = Record<CatalogueOptionKind, LocalCatalogueOption[]>;

type ImageUploadState =
  | { state: "idle" }
  | { state: "processing"; message: string }
  | { state: "uploading"; message: string }
  | { state: "uploaded"; message: string; optimizedBytes?: number; originalBytes?: number }
  | { state: "error"; message: string };

type UploadedComponentImage = {
  bucket?: string;
  url: string;
  thumbnailUrl: string;
  path: string;
  thumbnailPath: string;
  width: number;
  height: number;
  originalBytes: number;
  optimizedBytes: number;
};

type AddComponentModalProps = {
  open: boolean;
  folders: LibraryFolderRecord[];
  categoryTree: ComponentLibraryTaxonomyNode[];
  suppliers: ComponentLibrarySupplierOption[];
  brands: ComponentLibraryBrand[];
  libraryItems: EstimateRowItem[];
  selectedFolderId: string | null;
  selectedSupplierId?: string | null;
  selectedBrandId?: string | null;
  editingItem?: EstimateRowItem | null;
  imageUploadProjectId?: string | null;
  onOpenChange: (open: boolean) => void;
  onComponentCreated: (item: EstimateRowItem) => void;
  onComponentUpdated?: (item: EstimateRowItem, instanceSync?: LibraryComponentInstanceSyncResult) => void | Promise<void>;
  onCreateFolder?: CreateLibraryFolderHandler;
  onRenameFolder?: (folderId: string, currentName: string) => void;
  onDeleteFolder?: (folderId: string, currentName: string) => void;
  reorderStatus?: ReorderStatus;
  treeMutationPending?: boolean;
  catalogueOptionsStorageScope: string;
};

type AddComponentModalTab = "component" | "activity";
type VariantDrawerView = "manager" | "variant";

const MAX_CLIENT_SOURCE_IMAGE_BYTES = 20 * 1024 * 1024;
const CLIENT_IMAGE_EDGE = 1600;
const CLIENT_IMAGE_QUALITY = 0.82;
const DEFAULT_VARIANT_LABEL = "V1";
const ALLOWED_UPLOAD_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/avif"]);
const accountingNumberFormatter = new Intl.NumberFormat("en-US", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});
const LIFECYCLE_OPTIONS: Array<{ value: ComponentLifecycleState; label: string; tone: "neutral" | "info" | "success" | "warning" | "danger" }> = [
  { value: "draft", label: "Draft", tone: "neutral" },
  { value: "in_production", label: "In production", tone: "info" },
  { value: "available", label: "Available", tone: "success" },
  { value: "discontinued", label: "Discontinued", tone: "warning" },
  { value: "archived", label: "Archived", tone: "danger" },
];
const ADD_COMPONENT_MODAL_TABS: Array<{ id: AddComponentModalTab; label: string }> = [
  { id: "component", label: "Component" },
  { id: "activity", label: "Activity" },
];
const OPENDESIGN_INPUT_CLASS =
  "h-8 rounded-[6px] border-0 bg-[rgba(61,61,61,0.05)] px-2 !text-[10px] font-medium shadow-none hover:bg-[rgba(61,61,61,0.064)] focus:bg-[rgba(61,61,61,0.058)] focus:shadow-[0_0_0_1px_rgba(242,68,5,0.42),inset_0_1px_0_rgba(255,255,255,0.75)] focus-visible:ring-2 focus-visible:ring-[rgba(242,68,5,0.32)]";
const OPENDESIGN_TEXTAREA_CLASS =
  "min-h-14 rounded-[6px] border-0 bg-[rgba(61,61,61,0.05)] px-2 py-2 !text-[10px] font-medium shadow-none hover:bg-[rgba(61,61,61,0.064)] focus:bg-[rgba(61,61,61,0.058)] focus:shadow-[0_0_0_1px_rgba(242,68,5,0.42),inset_0_1px_0_rgba(255,255,255,0.75)] focus-visible:ring-2 focus-visible:ring-[rgba(242,68,5,0.32)]";
const OPENDESIGN_SECTION_CLASS = "grid gap-[10px] rounded-[3px] bg-[rgba(61,61,61,0.035)] p-2";
const OPENDESIGN_SECTION_TITLE_CLASS = "col-span-full flex items-center gap-2 text-[11px] font-medium normal-case text-secondary mb-[2px]";
const OPENDESIGN_FIELD_LABEL_CLASS = "normal-case";
const OPENDESIGN_IMAGE_WELL_CLASS =
  "relative grid aspect-square place-items-center overflow-hidden rounded-[3px] border-0 bg-[rgba(61,61,61,0.04)] shadow-[inset_0_1px_0_rgba(255,255,255,0.72),inset_0_0_0_1px_rgba(61,61,61,0.035)]";
const OPENDESIGN_MODAL_BG_CLASS =
  "bg-[linear-gradient(180deg,rgba(255,255,255,0.88),rgba(255,255,255,0.78))] backdrop-blur-[18px] saturate-150";
const OPENDESIGN_MODAL_SHADOW_CLASS =
  "shadow-[0_28px_70px_-24px_rgba(23,29,40,0.32),0_10px_26px_-18px_rgba(23,29,40,0.24),inset_0_1px_0_rgba(255,255,255,0.82)]";
const OPENDESIGN_DRAWER_SHADOW_CLASS =
  "shadow-[24px_0_42px_-34px_rgba(23,29,40,0.48),inset_0_1px_0_rgba(255,255,255,0.72),inset_0_0_0_1px_rgba(61,61,61,0.025)]";
const OPENDESIGN_RAIL_SHADOW_CLASS =
  "shadow-[10px_12px_24px_-19px_rgba(23,29,40,0.42),inset_0_1px_0_rgba(255,255,255,0.72),inset_0_0_0_1px_rgba(61,61,61,0.025)]";
const OPENDESIGN_RAIL_ACTIVE_SHADOW_CLASS =
  "shadow-[16px_16px_30px_-24px_rgba(23,29,40,0.56),inset_0_1px_0_rgba(255,255,255,0.72),inset_0_0_0_1px_rgba(61,61,61,0.025)]";
const LOCAL_CATALOGUE_OPTION_PREFIX = "local-catalogue-option";
const ADD_COMPONENT_CATALOGUE_OPTIONS_STORAGE_PREFIX = "archestimator:add-component-catalogue-options:v1";
const LOCAL_CATALOGUE_OPTION_LIMIT = 80;
const CATALOGUE_OPTION_KINDS: CatalogueOptionKind[] = ["category", "supplier", "brand"];

function toComboboxOptions(options: Array<{ id: string; name: string }>): CreatableComboboxOption[] {
  return options.map((option) => ({ id: option.id, label: option.name }));
}

function emptyLocalCatalogueOptionsState(): LocalCatalogueOptionsState {
  return {
    category: [],
    supplier: [],
    brand: [],
  };
}

function normalizeCatalogueOptionLabel(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

function normalizeCatalogueOptionKey(value: string): string {
  return normalizeCatalogueOptionLabel(value).toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function makeLocalCatalogueOption(kind: CatalogueOptionKind, value: string): LocalCatalogueOption | null {
  const label = normalizeCatalogueOptionLabel(value);
  const key = normalizeCatalogueOptionKey(label).replace(/\s+/g, "-");
  if (!label || !key) return null;
  return {
    id: `${LOCAL_CATALOGUE_OPTION_PREFIX}:${kind}:${key}`,
    label,
    createdAt: new Date().toISOString(),
  };
}

function isLocalCatalogueOptionId(id: string | null | undefined): id is string {
  return Boolean(id?.startsWith(`${LOCAL_CATALOGUE_OPTION_PREFIX}:`));
}

function isLocalCatalogueComboboxOption(option: CreatableComboboxOption): boolean {
  return isLocalCatalogueOptionId(option.id);
}

function getCatalogueOptionsStorageKey(scope: string): string {
  const normalizedScope = scope.trim().replace(/[^a-zA-Z0-9_.:-]+/g, "-") || "blank-scope";
  return `${ADD_COMPONENT_CATALOGUE_OPTIONS_STORAGE_PREFIX}:${normalizedScope}`;
}

function sanitizeLocalCatalogueOptionsState(value: unknown): LocalCatalogueOptionsState {
  const source = value && typeof value === "object" ? value as Record<string, unknown> : {};
  const next = emptyLocalCatalogueOptionsState();

  for (const kind of CATALOGUE_OPTION_KINDS) {
    const entries = Array.isArray(source[kind]) ? source[kind] : [];
    const seen = new Set<string>();
    for (const entry of entries) {
      if (!entry || typeof entry !== "object") continue;
      const record = entry as Record<string, unknown>;
      const label = typeof record.label === "string" ? normalizeCatalogueOptionLabel(record.label) : "";
      const key = normalizeCatalogueOptionKey(label);
      if (!label || !key || seen.has(key)) continue;
      const fallbackOption = makeLocalCatalogueOption(kind, label);
      if (!fallbackOption) continue;
      next[kind].push({
        id: typeof record.id === "string" && isLocalCatalogueOptionId(record.id) ? record.id : fallbackOption.id,
        label,
        createdAt: typeof record.createdAt === "string" ? record.createdAt : fallbackOption.createdAt,
      });
      seen.add(key);
    }
    next[kind] = next[kind].slice(-LOCAL_CATALOGUE_OPTION_LIMIT);
  }

  return next;
}

function readLocalCatalogueOptionsState(storageKey: string): LocalCatalogueOptionsState {
  if (typeof window === "undefined") return emptyLocalCatalogueOptionsState();
  try {
    const stored = window.localStorage.getItem(storageKey);
    if (!stored) return emptyLocalCatalogueOptionsState();
    return sanitizeLocalCatalogueOptionsState(JSON.parse(stored));
  } catch {
    return emptyLocalCatalogueOptionsState();
  }
}

function writeLocalCatalogueOptionsState(storageKey: string, state: LocalCatalogueOptionsState) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(storageKey, JSON.stringify(sanitizeLocalCatalogueOptionsState(state)));
}

function toLocalCatalogueComboboxOptions(options: LocalCatalogueOption[]): CreatableComboboxOption[] {
  return options.map((option) => ({ id: option.id, label: option.label }));
}

function mergeCatalogueComboboxOptions(
  baseOptions: CreatableComboboxOption[],
  localOptions: CreatableComboboxOption[],
): CreatableComboboxOption[] {
  const seen = new Set<string>();
  const merged: CreatableComboboxOption[] = [];
  for (const option of [...baseOptions, ...localOptions]) {
    const key = normalizeCatalogueOptionKey(option.label);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    merged.push(option);
  }
  return merged;
}

function findSelectedLocalCatalogueOptionId(value: string, options: CreatableComboboxOption[]): string | null {
  const key = normalizeCatalogueOptionKey(value);
  if (!key) return null;
  return options.find((option) => normalizeCatalogueOptionKey(option.label) === key)?.id ?? null;
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

function formatBytes(bytes: number | undefined) {
  if (!bytes || bytes <= 0) return "0 KB";
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function parseMoney(value: string) {
  const normalized = value.replace(/[,\s]/g, "").trim();
  if (!normalized) return NaN;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : NaN;
}

function normalizeMoneyInput(value: string) {
  const cleaned = value.replace(/[,\s]/g, "").replace(/[^0-9.]/g, "");
  const [whole = "", ...decimalParts] = cleaned.split(".");
  if (decimalParts.length === 0) return whole;
  return `${whole}.${decimalParts.join("")}`;
}

function formatAccountingMoney(value: string) {
  const parsed = parseMoney(value);
  return Number.isFinite(parsed) ? accountingNumberFormatter.format(parsed) : value;
}

function parseAccountingMoney(value: string) {
  return parseMoney(formatAccountingMoney(value));
}

function readOptionalPositiveNumber(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : NaN;
}

function normalizeDuplicateIdentityValue(value: string | null | undefined) {
  return (value ?? "").trim().replace(/\s+/g, " ").toLowerCase();
}

function duplicateIdentityKey(name: string, category: string, matchValue: string) {
  return `${name}\u001f${category}\u001f${matchValue}`;
}

function setDuplicateIdentityIndexEntry(
  index: Map<string, { item: EstimateRowItem; order: number }>,
  key: string,
  item: EstimateRowItem,
  order: number,
) {
  if (!index.has(key)) index.set(key, { item, order });
}

function getAttachmentKind(contentType: string): "pdf" | "excel" {
  return contentType === "application/pdf" ? "pdf" : "excel";
}

function buildImageMetadata(image: VariantImageDraft | null): Json {
  if (!image) return {};
  return {
    thumbnailStoragePath: image.thumbnailStoragePath,
    width: image.width ?? null,
    height: image.height ?? null,
    originalBytes: image.originalBytes ?? null,
    optimizedBytes: image.optimizedBytes ?? null,
  };
}

function getImageStoragePaths(image: VariantImageDraft | null | undefined) {
  if (!image) return [];
  return Array.from(new Set([image.path, image.thumbnailStoragePath].filter(Boolean)));
}

function getAttachmentStoragePaths(attachment: VariantAttachmentDraft | null | undefined) {
  if (!attachment?.path) return [];
  return [attachment.path];
}

function isImageUploadBusy(state: ImageUploadState["state"]) {
  return state === "processing" || state === "uploading";
}

function isUsableUploadResponse(value: UploadedComponentImage): value is UploadedComponentImage {
  return Boolean(value.url && value.thumbnailUrl && value.path && value.thumbnailPath);
}

function toVariantImageDraft(value: UploadedComponentImage): VariantImageDraft {
  return {
    bucket: value.bucket ?? "component-images",
    path: value.path,
    thumbnailPath: value.thumbnailUrl,
    thumbnailStoragePath: value.thumbnailPath,
    url: value.url,
    thumbnailUrl: value.thumbnailUrl,
    width: value.width,
    height: value.height,
    originalBytes: value.originalBytes,
    optimizedBytes: value.optimizedBytes,
  };
}

function makeVariantDraft(index: number, overrides: Partial<VariantDraft> = {}): VariantDraft {
  return {
    id: crypto.randomUUID(),
    label: index === 1 ? DEFAULT_VARIANT_LABEL : `V${index}`,
    description: "",
    sku: "",
    unitCost: "",
    unit: "unit",
    packageQuantity: "",
    packageUnit: "",
    isDefault: index === 1,
    image: null,
    attachments: [],
    ...overrides,
  };
}

function getDraftImageSnapshot(image: VariantImageDraft | null) {
  if (!image) return null;
  return {
    bucket: image.bucket,
    path: image.path,
    thumbnailPath: image.thumbnailPath,
    thumbnailStoragePath: image.thumbnailStoragePath,
    url: image.url,
    thumbnailUrl: image.thumbnailUrl,
  };
}

function hasMeaningfulVariantValue(variant: VariantDraft, index: number) {
  return Boolean(
    (variant.label.trim() && variant.label.trim() !== `V${index + 1}`)
      || variant.description.trim()
      || variant.sku.trim()
      || variant.unitCost.trim()
      || variant.unit !== "unit"
      || variant.packageQuantity.trim()
      || variant.packageUnit.trim()
      || variant.image
      || variant.attachments.length > 0,
  );
}

function getDraftSnapshot(draft: ComponentDraft) {
  return {
    name: draft.name.trim(),
    category: draft.category.trim(),
    categoryNodeId: draft.categoryNodeId,
    supplierId: draft.supplierId,
    supplierName: draft.supplierName.trim(),
    brand: draft.brand.trim(),
    brandId: draft.brandId,
    thumbnailPath: draft.thumbnailPath,
    lifecycleState: draft.lifecycleState,
    effectiveAt: draft.effectiveAt,
    changeReason: draft.changeReason.trim(),
    sharedImageForAllVariants: draft.sharedImageForAllVariants,
    sharedImage: draft.sharedImageForAllVariants ? getDraftImageSnapshot(draft.sharedImage) : null,
    variants: draft.variants
      .map((variant, index) => ({ variant, index }))
      .filter(({ variant, index }) => hasMeaningfulVariantValue(variant, index))
      .map(({ variant }) => ({
        label: variant.label.trim(),
        description: variant.description.trim(),
        sku: variant.sku.trim(),
        unitCost: variant.unitCost.trim(),
        unit: variant.unit,
        packageQuantity: variant.packageQuantity.trim(),
        packageUnit: variant.packageUnit.trim(),
        isDefault: variant.isDefault,
        image: getDraftImageSnapshot(variant.image),
        attachments: variant.attachments.map((attachment) => ({
          bucket: attachment.bucket,
          path: attachment.path,
          fileName: attachment.fileName,
          contentType: attachment.contentType,
          sizeBytes: attachment.sizeBytes,
        })),
      })),
  };
}

function hasMeaningfulDraftChanges(initialDraft: ComponentDraft, draft: ComponentDraft) {
  return JSON.stringify(getDraftSnapshot(initialDraft)) !== JSON.stringify(getDraftSnapshot(draft));
}

type ExistingPriceOption = NonNullable<EstimateRowItem["priceOptions"]>[number];

function getSelectedEditingPriceOptionId(editingItem: EstimateRowItem) {
  const selectedId = editingItem.priceOptionId?.trim();
  if (selectedId && editingItem.priceOptions?.some((option) => option.id === selectedId)) return selectedId;
  const defaultId = editingItem.priceOptions?.find((option) => option.isDefault && option.isActive)?.id;
  return defaultId ?? editingItem.priceOptions?.find((option) => option.isActive)?.id ?? editingItem.priceOptions?.[0]?.id ?? null;
}

function compareExistingPriceOptions(left: ExistingPriceOption, right: ExistingPriceOption) {
  const leftSort = typeof left.variantSortOrder === "number" ? left.variantSortOrder : Number.MAX_SAFE_INTEGER;
  const rightSort = typeof right.variantSortOrder === "number" ? right.variantSortOrder : Number.MAX_SAFE_INTEGER;
  if (leftSort !== rightSort) return leftSort - rightSort;
  return left.label.localeCompare(right.label);
}

function toExistingVariantAttachmentDraft(attachment: NonNullable<ExistingPriceOption["attachments"]>[number]): VariantAttachmentDraft {
  return {
    id: attachment.id,
    bucket: attachment.bucket,
    path: attachment.path,
    fileName: attachment.fileName,
    contentType: attachment.contentType,
    sizeBytes: attachment.sizeBytes,
    scanStatus: null,
  };
}

function toVariantDraftFromPriceOption(
  option: ExistingPriceOption,
  index: number,
  input: { editingItem: EstimateRowItem; selectedPriceOptionId: string | null },
) {
  const isSelected = input.selectedPriceOptionId ? option.id === input.selectedPriceOptionId : option.isDefault;
  const imageSource = option.thumbnailPath ?? option.imagePath ?? (isSelected ? input.editingItem.imageUrl : null);
  return makeVariantDraft(index + 1, {
    id: option.id,
    label: option.label || (index === 0 ? DEFAULT_VARIANT_LABEL : `V${index + 1}`),
    description: option.variantDescription ?? (isSelected ? input.editingItem.description : ""),
    sku: option.sku ?? "",
    unitCost: formatAccountingMoney(String(option.unitCost)),
    unit: option.unit || input.editingItem.unit || "unit",
    packageQuantity: option.packageQuantity === null || option.packageQuantity === undefined ? "" : String(option.packageQuantity),
    packageUnit: option.packageUnit ?? "",
    isDefault: Boolean(isSelected),
    image: toExistingVariantImageDraft(imageSource),
    attachments: option.attachments?.map(toExistingVariantAttachmentDraft) ?? [],
  });
}

function getInitialDraft({
  selectedSupplierId,
  selectedBrandId,
  suppliers,
  brands,
  editingItem,
}: {
  selectedSupplierId?: string | null;
  selectedBrandId?: string | null;
  suppliers: ComponentLibrarySupplierOption[];
  brands: ComponentLibraryBrand[];
  editingItem?: EstimateRowItem | null;
}): ComponentDraft {
  if (editingItem) {
    const selectedPriceOptionId = getSelectedEditingPriceOptionId(editingItem);
    const priceOptionDrafts = (editingItem.priceOptions ?? [])
      .filter((option) => option.isActive !== false)
      .slice()
      .sort(compareExistingPriceOptions)
      .map((option, index) => toVariantDraftFromPriceOption(option, index, { editingItem, selectedPriceOptionId }));
    const variants = priceOptionDrafts.length > 0
      ? priceOptionDrafts.map((variant, index) => ({
          ...variant,
          isDefault: selectedPriceOptionId ? variant.id === selectedPriceOptionId : variant.isDefault || index === 0,
        }))
      : [
          makeVariantDraft(1, {
            label: editingItem.priceOptionLabel || DEFAULT_VARIANT_LABEL,
            description: editingItem.description,
            sku: editingItem.sku ?? "",
            unitCost: formatAccountingMoney(String(editingItem.itemCost)),
            unit: editingItem.unit || "unit",
            image: toExistingVariantImageDraft(editingItem.imageUrl),
          }),
        ];
    return {
      name: editingItem.name?.trim() || editingItem.material,
      category: editingItem.category,
      categoryNodeId: editingItem.categoryNodeId ?? "",
      supplierId: editingItem.supplierId ?? "",
      supplierName: editingItem.supplier,
      brand: editingItem.brand ?? "",
      brandId: editingItem.brandId ?? "",
      thumbnailPath: editingItem.imageUrl ?? "",
      lifecycleState: editingItem.lifecycleState ?? "available",
      effectiveAt: editingItem.lifecycleStateChangedAt?.slice(0, 10) || editingItem.pricingDate?.slice(0, 10) || today(),
      changeReason: "Component updated from estimate sheet.",
      sharedImageForAllVariants: false,
      sharedImage: null,
      variants: variants.some((variant) => variant.isDefault)
        ? variants
        : variants.map((variant, index) => ({ ...variant, isDefault: index === 0 })),
    };
  }

  const supplier = selectedSupplierId ? suppliers.find((entry) => entry.id === selectedSupplierId) : undefined;
  const brand = selectedBrandId ? brands.find((entry) => entry.id === selectedBrandId) : undefined;
  return {
    name: "",
    category: "",
    categoryNodeId: "",
    supplierId: supplier?.id ?? "",
    supplierName: supplier?.name ?? "",
    brand: brand?.name ?? "",
    brandId: brand?.id ?? "",
    thumbnailPath: "",
    lifecycleState: "available",
    effectiveAt: today(),
    changeReason: "Component created from workshop library.",
    sharedImageForAllVariants: false,
    sharedImage: null,
    variants: [],
  };
}

function toExistingVariantImageDraft(imageUrl: string | null | undefined): VariantImageDraft | null {
  const resolvedUrl = resolveExistingComponentImageUrl(imageUrl);
  if (!resolvedUrl) return null;
  return {
    bucket: "",
    path: "",
    thumbnailPath: resolvedUrl,
    thumbnailStoragePath: "",
    url: resolvedUrl,
    thumbnailUrl: resolvedUrl,
  };
}

function createBrokeredExistingImageUrl(route: "/api/projects/images" | "/api/component-library/images", path: string) {
  const search = new URLSearchParams({ path });
  return normalizeEstimateRowImageUrl(`${route}?${search.toString()}`);
}

function resolveExistingComponentImageUrl(imageUrl: string | null | undefined) {
  const rawUrl = imageUrl?.trim() ?? "";
  if (!rawUrl) return "";
  if (/^(?:https?:|blob:|data:image\/)/i.test(rawUrl)) return rawUrl;
  if (rawUrl.startsWith("/") && !rawUrl.startsWith("//")) {
    return normalizeEstimateRowImageUrl(rawUrl) ?? rawUrl;
  }

  return (
    createBrokeredExistingImageUrl("/api/projects/images", rawUrl)
    ?? createBrokeredExistingImageUrl("/api/component-library/images", rawUrl)
    ?? ""
  );
}

function shouldBypassNextImageOptimization(src: string, previewSrc: string) {
  return Boolean(
    previewSrc
      || src.startsWith("http")
      || src.startsWith("blob:")
      || src.startsWith("data:")
      || src.startsWith("/api/"),
  );
}

async function resizeImageForUpload(file: File): Promise<File> {
  if (typeof document === "undefined" || typeof createImageBitmap === "undefined") return file;
  const bitmap = await createImageBitmap(file);
  try {
    const scale = Math.min(1, CLIENT_IMAGE_EDGE / Math.max(bitmap.width, bitmap.height));
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d", { alpha: true });
    if (!context) return file;
    context.drawImage(bitmap, 0, 0, width, height);
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/webp", CLIENT_IMAGE_QUALITY));
    if (!blob) return file;
    if (blob.size >= file.size && file.size <= 12 * 1024 * 1024) return file;
    const safeStem = file.name.replace(/\.[^.]+$/, "") || "component-image";
    return new File([blob], `${safeStem}.webp`, { type: "image/webp", lastModified: Date.now() });
  } finally {
    bitmap.close();
  }
}

async function uploadComponentImage(file: File, target: { projectId?: string | null } = {}): Promise<UploadedComponentImage> {
  const formData = new FormData();
  formData.set("file", file);
  const projectId = target.projectId?.trim() ?? "";
  if (projectId) formData.set("projectId", projectId);
  return postUploadFormData<UploadedComponentImage>(projectId ? "/api/projects/images" : "/api/component-library/images", formData, {
    fallbackMessage: "Could not upload image.",
    timeoutMessage: "Image upload timed out. Try again.",
  });
}

async function removeComponentImageUpload(image: VariantImageDraft | null | undefined) {
  const paths = getImageStoragePaths(image);
  if (paths.length === 0) return;
  const route = image?.bucket === "project-images" ? "/api/projects/images" : "/api/component-library/images";
  await fetch(route, {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ paths }),
  }).catch(() => undefined);
}

async function removeComponentAttachmentUpload(attachment: VariantAttachmentDraft | null | undefined) {
  const paths = getAttachmentStoragePaths(attachment);
  if (paths.length === 0) return;
  await fetch("/api/component-library/attachments", {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ paths }),
  }).catch(() => undefined);
}

function getVariantImage(draft: ComponentDraft, variant: VariantDraft | undefined): VariantImageDraft | null {
  if (draft.sharedImageForAllVariants) return draft.sharedImage;
  return variant?.image ?? null;
}

function collectDraftImages(draft: ComponentDraft) {
  const images = [draft.sharedImage, ...draft.variants.map((variant) => variant.image)];
  const byPath = new Map<string, VariantImageDraft>();
  for (const image of images) {
    const storagePath = image?.path || image?.thumbnailStoragePath;
    if (image && storagePath) byPath.set(storagePath, image);
  }
  return Array.from(byPath.values());
}

function collectDraftAttachments(draft: ComponentDraft) {
  const byPath = new Map<string, VariantAttachmentDraft>();
  for (const variant of draft.variants) {
    for (const attachment of variant.attachments) {
      if (attachment.path) byPath.set(attachment.path, attachment);
    }
  }
  return Array.from(byPath.values());
}

export function AddComponentModal(props: AddComponentModalProps) {
  if (!props.open) return null;
  return <OpenAddComponentModal key={`${getCatalogueOptionsStorageKey(props.catalogueOptionsStorageScope)}:${props.editingItem?.id ?? "new"}`} {...props} />;
}

function OpenAddComponentModal({
  open,
  suppliers,
  brands,
  libraryItems,
  selectedSupplierId,
  selectedBrandId,
  editingItem,
  imageUploadProjectId,
  onOpenChange,
  onComponentCreated,
  onComponentUpdated,
  catalogueOptionsStorageScope,
}: AddComponentModalProps) {
  const isEditing = Boolean(editingItem);
  const [draft, setDraft] = useState(() => getInitialDraft({
    selectedSupplierId,
    selectedBrandId,
    suppliers,
    brands,
    editingItem,
  }));
  const [activeTab, setActiveTab] = useState<AddComponentModalTab>("component");
  const [activeVariantId, setActiveVariantId] = useState(() => draft.variants.find((variant) => variant.isDefault)?.id ?? draft.variants[0]?.id ?? "");
  const [variantModeEnabled, setVariantModeEnabled] = useState(() => (editingItem?.priceOptions?.length ?? 0) > 1);
  const [variantDrawerOpen, setVariantDrawerOpen] = useState(false);
  const [variantDrawerView, setVariantDrawerView] = useState<VariantDrawerView>("manager");
  const [variantPreviewUrls, setVariantPreviewUrls] = useState<Record<string, string>>({});
  const [sharedPreviewUrl, setSharedPreviewUrl] = useState("");
  const [imageUpload, setImageUpload] = useState<ImageUploadState>({ state: "idle" });
  const [attachmentUpload, setAttachmentUpload] = useState<ImageUploadState>({ state: "idle" });
  const [discardDialogOpen, setDiscardDialogOpen] = useState(false);
  const [draftSaveError, setDraftSaveError] = useState("");
  const [duplicateCheckReady, setDuplicateCheckReady] = useState(false);
  const [duplicateAcknowledged, setDuplicateAcknowledged] = useState(false);
  const [error, setError] = useState("");
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [draftSavePending, startDraftSaveTransition] = useTransition();
  const thumbnailInputId = useId();
  const variantThumbnailInputId = useId();
  const attachmentInputId = useId();
  const initialFocusRef = useRef<HTMLInputElement>(null);
  const dirtyRef = useRef(false);
  const initialDraftRef = useRef(draft);
  const duplicateCheckTimerRef = useRef<number | null>(null);
  const draftRef = useRef(draft);
  const variantPreviewUrlsRef = useRef(variantPreviewUrls);
  const sharedPreviewUrlRef = useRef(sharedPreviewUrl);
  const catalogueOptionsStorageKey = useMemo(
    () => getCatalogueOptionsStorageKey(catalogueOptionsStorageScope),
    [catalogueOptionsStorageScope],
  );
  const [localCatalogueOptions, setLocalCatalogueOptions] = useState<LocalCatalogueOptionsState>(
    () => readLocalCatalogueOptionsState(catalogueOptionsStorageKey),
  );

  const baseBrandOptions = useMemo(() => toComboboxOptions(brands), [brands]);
  const baseSupplierOptions = useMemo(() => toComboboxOptions(suppliers), [suppliers]);
  const localCategoryOptions = useMemo(
    () => toLocalCatalogueComboboxOptions(localCatalogueOptions.category),
    [localCatalogueOptions.category],
  );
  const localBrandOptions = useMemo(
    () => toLocalCatalogueComboboxOptions(localCatalogueOptions.brand),
    [localCatalogueOptions.brand],
  );
  const localSupplierOptions = useMemo(
    () => toLocalCatalogueComboboxOptions(localCatalogueOptions.supplier),
    [localCatalogueOptions.supplier],
  );
  const categoryOptions = useMemo(
    () => localCategoryOptions,
    [localCategoryOptions],
  );
  const brandOptions = useMemo(
    () => mergeCatalogueComboboxOptions(baseBrandOptions, localBrandOptions),
    [baseBrandOptions, localBrandOptions],
  );
  const supplierOptions = useMemo(
    () => mergeCatalogueComboboxOptions(baseSupplierOptions, localSupplierOptions),
    [baseSupplierOptions, localSupplierOptions],
  );
  const selectedBrand = brands.find((brand) => brand.id === draft.brandId);
  const selectedSupplier = suppliers.find((supplier) => supplier.id === draft.supplierId);
  const supplierValue = selectedSupplier?.name ?? draft.supplierName;
  const brandValue = selectedBrand?.name ?? draft.brand;
  const selectedCategoryOptionId = findSelectedLocalCatalogueOptionId(draft.category, localCategoryOptions);
  const selectedSupplierOptionId = draft.supplierId || findSelectedLocalCatalogueOptionId(supplierValue, localSupplierOptions);
  const selectedBrandOptionId = draft.brandId || findSelectedLocalCatalogueOptionId(brandValue, localBrandOptions);
  const defaultVariant = draft.variants.find((variant) => variant.isDefault) ?? draft.variants[0];
  const activeVariant = draft.variants.find((variant) => variant.id === activeVariantId) ?? defaultVariant ?? draft.variants[0];
  const visibleVariants = variantModeEnabled ? draft.variants : [];
  const activeVariantImage = getVariantImage(draft, activeVariant);
  const activePreviewUrl = draft.sharedImageForAllVariants ? sharedPreviewUrl : (activeVariant ? variantPreviewUrls[activeVariant.id] ?? "" : "");
  const activeImageSrc = activePreviewUrl || activeVariantImage?.thumbnailUrl || activeVariantImage?.url || "";
  const activeImagePath = activeVariantImage?.path || activeVariantImage?.thumbnailStoragePath || "";
  const imageBusy = isImageUploadBusy(imageUpload.state);
  const attachmentBusy = isImageUploadBusy(attachmentUpload.state);
  const lifecycleOption = LIFECYCLE_OPTIONS.find((option) => option.value === draft.lifecycleState) ?? LIFECYCLE_OPTIONS[0];
  const defaultCost = Number.isFinite(parseMoney(defaultVariant?.unitCost ?? ""))
    ? formatAccountingMoney(defaultVariant?.unitCost ?? "")
    : "0.00";
  const duplicateIdentityIndex = useMemo(() => {
    const bySupplier = new Map<string, { item: EstimateRowItem; order: number }>();
    const byBrand = new Map<string, { item: EstimateRowItem; order: number }>();
    libraryItems.forEach((item, order) => {
      if (editingItem && item.id === editingItem.id) return;
      const name = normalizeDuplicateIdentityValue(item.name ?? item.material);
      const category = normalizeDuplicateIdentityValue(item.category);
      if (!name || !category) return;
      const supplier = normalizeDuplicateIdentityValue(item.supplier);
      const brand = normalizeDuplicateIdentityValue(item.brand);
      if (supplier) setDuplicateIdentityIndexEntry(bySupplier, duplicateIdentityKey(name, category, supplier), item, order);
      if (brand) setDuplicateIdentityIndexEntry(byBrand, duplicateIdentityKey(name, category, brand), item, order);
    });
    return { bySupplier, byBrand };
  }, [editingItem, libraryItems]);
  const quickAddValidation = useMemo(() => validateQuickAddComponentInput({
    name: draft.name,
    category: draft.category,
    unit: defaultVariant?.unit ?? "",
    unitCost: defaultVariant?.unitCost ?? "",
    supplier: selectedSupplier?.name ?? draft.supplierName,
    brand: selectedBrand?.name ?? draft.brand,
  }), [
    defaultVariant?.unit,
    defaultVariant?.unitCost,
    draft.brand,
    draft.category,
    draft.name,
    draft.supplierName,
    selectedBrand?.name,
    selectedSupplier?.name,
  ]);
  const possibleDuplicate = useMemo(() => {
    if (isEditing || !duplicateCheckReady || duplicateAcknowledged) return null;
    const name = normalizeDuplicateIdentityValue(draft.name);
    const category = normalizeDuplicateIdentityValue(draft.category);
    const supplier = normalizeDuplicateIdentityValue(selectedSupplier?.name ?? draft.supplierName);
    const brand = normalizeDuplicateIdentityValue(selectedBrand?.name ?? draft.brand);
    if (!name || !category || (!supplier && !brand)) return null;
    const supplierMatch = supplier ? duplicateIdentityIndex.bySupplier.get(duplicateIdentityKey(name, category, supplier)) : null;
    const brandMatch = brand ? duplicateIdentityIndex.byBrand.get(duplicateIdentityKey(name, category, brand)) : null;
    if (supplierMatch && brandMatch) return supplierMatch.order <= brandMatch.order ? supplierMatch.item : brandMatch.item;
    return supplierMatch?.item ?? brandMatch?.item ?? null;
  }, [
    duplicateAcknowledged,
    duplicateCheckReady,
    duplicateIdentityIndex,
    draft.brand,
    draft.category,
    draft.name,
    draft.supplierName,
    isEditing,
    selectedBrand?.name,
    selectedSupplier?.name,
  ]);
  const validation = useMemo(() => {
    const messages: string[] = Object.values(quickAddValidation.errors);
    if (draft.variants.length === 0) messages.push("At least one variant is required.");
    if (draft.variants.filter((variant) => variant.isDefault).length !== 1) messages.push("Exactly one default variant is required.");
    for (const [index, variant] of draft.variants.entries()) {
      const label = variant.label.trim() || `V${index + 1}`;
      if (!variant.label.trim()) messages.push(`${label} name is required.`);
      if (!variant.unit.trim()) messages.push(`${label} unit is required.`);
      if (!Number.isFinite(parseMoney(variant.unitCost)) || parseMoney(variant.unitCost) < 0) {
        messages.push(`${label} cost must be a non-negative number.`);
      }
      if (Number.isNaN(readOptionalPositiveNumber(variant.packageQuantity))) {
        messages.push(`${label} equivalent quantity must be a positive number when provided.`);
      }
    }
    return messages;
  }, [draft.variants, quickAddValidation.errors]);

  useEffect(() => {
    draftRef.current = draft;
  }, [draft]);

  useEffect(() => {
    variantPreviewUrlsRef.current = variantPreviewUrls;
  }, [variantPreviewUrls]);

  useEffect(() => {
    sharedPreviewUrlRef.current = sharedPreviewUrl;
  }, [sharedPreviewUrl]);

  useEffect(() => {
    writeLocalCatalogueOptionsState(catalogueOptionsStorageKey, localCatalogueOptions);
  }, [catalogueOptionsStorageKey, localCatalogueOptions]);

  useEffect(() => {
    const focusFrame = window.requestAnimationFrame(() => initialFocusRef.current?.focus());
    return () => window.cancelAnimationFrame(focusFrame);
  }, []);

  useEffect(() => () => {
    Object.values(variantPreviewUrlsRef.current).forEach((url) => URL.revokeObjectURL(url));
    if (sharedPreviewUrlRef.current) URL.revokeObjectURL(sharedPreviewUrlRef.current);
    if (duplicateCheckTimerRef.current !== null) window.clearTimeout(duplicateCheckTimerRef.current);
  }, []);

  function markDirty() {
    dirtyRef.current = true;
    setError("");
    setSubmitAttempted(false);
  }

  function updateDraft(update: Partial<ComponentDraft>) {
    markDirty();
    setDraft((current) => ({ ...current, ...update }));
  }

  function updateQuickAddIdentity(update: Partial<ComponentDraft>) {
    const current = draftRef.current;
    const duplicateIdentityChanged = (
      (update.name !== undefined && update.name !== current.name)
      || (update.category !== undefined && update.category !== current.category)
      || (update.supplierId !== undefined && update.supplierId !== current.supplierId)
      || (update.supplierName !== undefined && update.supplierName !== current.supplierName)
      || (update.brandId !== undefined && update.brandId !== current.brandId)
      || (update.brand !== undefined && update.brand !== current.brand)
    );
    if (duplicateIdentityChanged) {
      setDuplicateCheckReady(false);
      setDuplicateAcknowledged(false);
    }
    updateDraft(update);
  }

  function acknowledgeDuplicate() {
    if (duplicateCheckTimerRef.current !== null) {
      window.clearTimeout(duplicateCheckTimerRef.current);
      duplicateCheckTimerRef.current = null;
    }
    setDuplicateCheckReady(false);
    setDuplicateAcknowledged(true);
  }

  function getBaseCatalogueOptions(kind: CatalogueOptionKind): CreatableComboboxOption[] {
    if (kind === "category") return [];
    if (kind === "supplier") return baseSupplierOptions;
    return baseBrandOptions;
  }

  function rememberCatalogueOption(kind: CatalogueOptionKind, value: string): LocalCatalogueOption | null {
    const option = makeLocalCatalogueOption(kind, value);
    if (!option) return null;
    const optionKey = normalizeCatalogueOptionKey(option.label);
    setLocalCatalogueOptions((current) => {
      if (getBaseCatalogueOptions(kind).some((baseOption) => normalizeCatalogueOptionKey(baseOption.label) === optionKey)) {
        return current;
      }
      if (current[kind].some((localOption) => normalizeCatalogueOptionKey(localOption.label) === optionKey)) {
        return current;
      }
      return {
        ...current,
        [kind]: [...current[kind], option].slice(-LOCAL_CATALOGUE_OPTION_LIMIT),
      };
    });
    return option;
  }

  function deleteCatalogueOption(kind: CatalogueOptionKind, option: CreatableComboboxOption) {
    if (!isLocalCatalogueComboboxOption(option)) return;
    const optionKey = normalizeCatalogueOptionKey(option.label);
    setLocalCatalogueOptions((current) => {
      const nextOptions = current[kind].filter((localOption) => normalizeCatalogueOptionKey(localOption.label) !== optionKey);
      if (nextOptions.length === current[kind].length) return current;
      return { ...current, [kind]: nextOptions };
    });

    if (kind === "category" && !draft.categoryNodeId && normalizeCatalogueOptionKey(draft.category) === optionKey) {
      updateQuickAddIdentity({ category: "", categoryNodeId: "" });
    }
    if (kind === "supplier" && !draft.supplierId && normalizeCatalogueOptionKey(draft.supplierName) === optionKey) {
      updateQuickAddIdentity({ supplierId: "", supplierName: "" });
    }
    if (kind === "brand" && !draft.brandId && normalizeCatalogueOptionKey(draft.brand) === optionKey) {
      updateQuickAddIdentity({ brandId: "", brand: "" });
    }
  }

  function scheduleDuplicateCheck() {
    if (duplicateCheckTimerRef.current !== null) window.clearTimeout(duplicateCheckTimerRef.current);
    duplicateCheckTimerRef.current = window.setTimeout(() => {
      setDuplicateCheckReady(true);
      duplicateCheckTimerRef.current = null;
    }, 300);
  }

  function updateVariant(variantId: string, update: Partial<VariantDraft>) {
    markDirty();
    setDraft((current) => ({
      ...current,
      variants: current.variants.map((variant) => (variant.id === variantId ? { ...variant, ...update } : variant)),
    }));
  }

  function updatePrimaryVariant(update: Partial<VariantDraft>) {
    markDirty();
    setDraft((current) => {
      const primaryVariant = current.variants.find((variant) => variant.isDefault) ?? current.variants[0];
      if (primaryVariant) {
        return {
          ...current,
          variants: current.variants.map((variant) => (variant.id === primaryVariant.id ? { ...variant, ...update } : variant)),
        };
      }
      return {
        ...current,
        variants: [makeVariantDraft(1, update)],
      };
    });
  }

  function updateActiveVariant(update: Partial<VariantDraft>) {
    if (!activeVariant) return;
    updateVariant(activeVariant.id, update);
  }

  function updateActiveVariantUnit(unit: string) {
    updateActiveVariant({ unit });
  }

  function addVariant() {
    markDirty();
    if (!variantModeEnabled && defaultVariant) {
      setVariantModeEnabled(true);
      setActiveVariantId(defaultVariant.id);
      setVariantDrawerOpen(true);
      setVariantDrawerView("variant");
      return;
    }
    const nextVariant = makeVariantDraft(draft.variants.length + 1, {
      unit: defaultVariant?.unit ?? "unit",
    });
    setDraft((current) => ({ ...current, variants: [...current.variants, nextVariant] }));
    setVariantModeEnabled(true);
    setActiveVariantId(nextVariant.id);
    setVariantDrawerOpen(true);
    setVariantDrawerView("variant");
  }

  function removeActiveVariant() {
    if (!activeVariant) return;
    markDirty();
    if (variantModeEnabled && draft.variants.length === 1) {
      setVariantModeEnabled(false);
      setVariantDrawerView("manager");
      return;
    }
    const removedImage = draft.sharedImageForAllVariants ? null : activeVariant.image;
    const removedAttachments = activeVariant.attachments;
    const removedIndex = draft.variants.findIndex((variant) => variant.id === activeVariant.id);
    const nextVariants = draft.variants.filter((variant) => variant.id !== activeVariant.id);
    const ensuredVariants = nextVariants.some((variant) => variant.isDefault)
      ? nextVariants
      : nextVariants.map((variant, index) => ({ ...variant, isDefault: index === 0 }));
    const nextActive = ensuredVariants[Math.max(0, Math.min(removedIndex, ensuredVariants.length - 1))];
    setDraft((current) => ({ ...current, variants: ensuredVariants }));
    setActiveVariantId(nextActive?.id ?? "");
    if (!nextActive) setVariantDrawerView("manager");
    if (removedImage) void removeComponentImageUpload(removedImage);
    for (const attachment of removedAttachments) void removeComponentAttachmentUpload(attachment);
  }

  function setActiveVariantAsDefault() {
    if (!activeVariant) return;
    markDirty();
    setDraft((current) => ({
      ...current,
      variants: current.variants.map((variant) => ({ ...variant, isDefault: variant.id === activeVariant.id })),
    }));
  }

  function cleanupUploadedDraftAssets() {
    for (const image of collectDraftImages(draftRef.current)) void removeComponentImageUpload(image);
    for (const attachment of collectDraftAttachments(draftRef.current)) void removeComponentAttachmentUpload(attachment);
  }

  function requestClose(openValue: boolean) {
    if (openValue) {
      onOpenChange(openValue);
      return;
    }
    if (imageBusy || attachmentBusy) {
      setError("Wait for uploads to finish before closing.");
      return;
    }
    if (!dirtyRef.current || !hasMeaningfulDraftChanges(initialDraftRef.current, draft)) {
      onOpenChange(false);
      return;
    }
    setDiscardDialogOpen(true);
  }

  function buildComponentPayload(): CreateCostLibraryComponentInput {
    const fallbackVariant = defaultVariant ?? draft.variants[0] ?? makeVariantDraft(1);
    const defaultVariantImage = getVariantImage(draft, fallbackVariant);
    const defaultThumbnailPath = defaultVariantImage?.thumbnailUrl || defaultVariantImage?.thumbnailPath || null;
    return {
      fieldContract: "opendesign-add-component",
      name: draft.name,
      description: fallbackVariant.description,
      category: draft.category.trim(),
      categoryNodeId: draft.categoryNodeId,
      supplier: selectedSupplier?.name ?? draft.supplierName,
      supplierId: draft.supplierId || null,
      brand: (selectedBrand?.name ?? draft.brand) || null,
      brandId: draft.brandId || null,
      unit: fallbackVariant.unit || "unit",
      thumbnailPath: defaultThumbnailPath,
      lifecycleState: draft.lifecycleState,
      effectiveAt: draft.effectiveAt,
      changeReason: draft.changeReason,
      metadata: {},
      priceOptions: draft.variants.map((variant, index) => {
        const variantImage = getVariantImage(draft, variant);
        return {
          label: variant.label,
          sku: variant.sku || null,
          variantDescription: variant.description,
          variantSortOrder: index + 1,
          unit: variant.unit || fallbackVariant.unit || "unit",
          unitCost: parseAccountingMoney(variant.unitCost),
          currency: "PHP",
          supplierId: draft.supplierId || null,
          packageQuantity: readOptionalPositiveNumber(variant.packageQuantity),
          packageUnit: variant.packageUnit || null,
          imageBucket: variantImage?.bucket ?? null,
          imagePath: variantImage?.path ?? null,
          thumbnailPath: variantImage?.thumbnailUrl || variantImage?.thumbnailPath || null,
          imageMetadata: buildImageMetadata(variantImage),
          attachments: variant.attachments.map((attachment) => ({
            bucket: attachment.bucket,
            path: attachment.path,
            fileName: attachment.fileName,
            contentType: attachment.contentType,
            sizeBytes: attachment.sizeBytes,
            kind: getAttachmentKind(attachment.contentType),
          })),
          isDefault: variant.isDefault,
          isActive: true,
          effectiveAt: draft.effectiveAt,
          changeReason: draft.changeReason,
        };
      }),
    };
  }

  function confirmDiscardDraft() {
    cleanupUploadedDraftAssets();
    dirtyRef.current = false;
    setDiscardDialogOpen(false);
    onOpenChange(false);
  }

  function saveDraftAndClose() {
    if (imageBusy || attachmentBusy || draftSavePending) {
      setDraftSaveError("Wait for uploads to finish before saving this draft.");
      return;
    }
    startDraftSaveTransition(async () => {
      setDraftSaveError("");
      try {
        await saveCostLibraryComponentDraft({
          fieldContract: "opendesign-add-component",
          title: draft.name,
          draft: {
            form: draft,
            activeTab,
            activeVariantId,
            variantDrawerOpen,
            variantDrawerView,
          },
        });
        dirtyRef.current = false;
        setDiscardDialogOpen(false);
        onOpenChange(false);
      } catch (saveError) {
        setDraftSaveError(saveError instanceof Error ? saveError.message : "Could not save this component draft.");
      }
    });
  }

  function submitFromCloseDialog() {
    setDiscardDialogOpen(false);
    submit();
  }

  async function handleThumbnailUpload(file: File) {
    const uploadVariant = activeVariant ?? makeVariantDraft(1);
    if (file.type && !ALLOWED_UPLOAD_TYPES.has(file.type)) {
      setImageUpload({ state: "error", message: "Use a JPG, PNG, WebP, or AVIF image." });
      return;
    }
    if (file.size > MAX_CLIENT_SOURCE_IMAGE_BYTES) {
      setImageUpload({ state: "error", message: "Choose an image under 20 MB." });
      return;
    }

    if (!activeVariant) {
      setDraft((current) => current.variants.length > 0
        ? current
        : { ...current, variants: [uploadVariant] });
      setActiveVariantId(uploadVariant.id);
    }

    const previousImage = getVariantImage(draft, uploadVariant);
    let localPreviewUrl = "";
    try {
      localPreviewUrl = URL.createObjectURL(file);
    } catch {
      localPreviewUrl = "";
    }
    if (localPreviewUrl) {
      if (draft.sharedImageForAllVariants) {
        if (sharedPreviewUrl) URL.revokeObjectURL(sharedPreviewUrl);
        setSharedPreviewUrl(localPreviewUrl);
      } else {
        const existingPreviewUrl = variantPreviewUrls[uploadVariant.id];
        if (existingPreviewUrl) URL.revokeObjectURL(existingPreviewUrl);
        setVariantPreviewUrls((current) => ({ ...current, [uploadVariant.id]: localPreviewUrl }));
      }
    }
    markDirty();
    setImageUpload({ state: "processing", message: "Optimizing image..." });

    try {
      const uploadFile = await resizeImageForUpload(file).catch(() => file);
      setImageUpload({ state: "uploading", message: "Uploading image..." });
      const uploadedImage = await uploadComponentImage(uploadFile, { projectId: imageUploadProjectId });
      if (!isUsableUploadResponse(uploadedImage)) throw new Error("Image upload response was incomplete.");
      const imageDraft = toVariantImageDraft(uploadedImage);
      if (draft.sharedImageForAllVariants) {
        updateDraft({ sharedImage: imageDraft, thumbnailPath: imageDraft.thumbnailUrl || imageDraft.url });
      } else {
        updateVariant(uploadVariant.id, { image: imageDraft });
        if (uploadVariant.isDefault) updateDraft({ thumbnailPath: imageDraft.thumbnailUrl || imageDraft.url });
      }
      if (previousImage && previousImage.path !== imageDraft.path) void removeComponentImageUpload(previousImage);
      setImageUpload({
        state: "uploaded",
        message: `Stored WebP thumbnail (${formatBytes(uploadedImage.originalBytes)} -> ${formatBytes(uploadedImage.optimizedBytes)}).`,
        originalBytes: uploadedImage.originalBytes,
        optimizedBytes: uploadedImage.optimizedBytes,
      });
    } catch (uploadError) {
      setImageUpload({ state: "error", message: uploadError instanceof Error ? uploadError.message : "Could not upload image." });
    }
  }

  async function handleAttachmentUpload(file: File) {
    if (!activeVariant) return;
    const uploadValidation = validateComponentAttachmentFile(file);
    if (!uploadValidation.ok) {
      setAttachmentUpload({ state: "error", message: uploadValidation.message });
      return;
    }

    markDirty();
    setAttachmentUpload({ state: "uploading", message: "Uploading attachment..." });
    try {
      const uploaded = await uploadComponentAttachment(file);
      updateActiveVariant({
        attachments: [
          ...activeVariant.attachments,
          {
            id: crypto.randomUUID(),
            bucket: uploaded.bucket,
            path: uploaded.path,
            fileName: uploaded.fileName,
            contentType: uploaded.contentType,
            sizeBytes: uploaded.sizeBytes,
            uploadSessionId: uploaded.uploadSessionId,
            assetId: uploaded.assetId,
            scanStatus: uploaded.scanStatus ?? "pending",
          },
        ],
      });
      setAttachmentUpload({ state: "uploaded", message: `Stored ${uploaded.fileName} (${formatBytes(uploaded.sizeBytes)}).` });
    } catch (uploadError) {
      setAttachmentUpload({ state: "error", message: uploadError instanceof Error ? uploadError.message : "Could not upload attachment." });
    }
  }

  function removeAttachment(attachmentId: string) {
    if (!activeVariant) return;
    const removedAttachment = activeVariant.attachments.find((attachment) => attachment.id === attachmentId);
    updateActiveVariant({
      attachments: activeVariant.attachments.filter((attachment) => attachment.id !== attachmentId),
    });
    if (removedAttachment) void removeComponentAttachmentUpload(removedAttachment);
  }

  function setSharedImageMode(checked: boolean) {
    if (!activeVariant) return;
    if (checked) {
      const existingImage = draft.sharedImage ?? activeVariant.image;
      const existingPreview = sharedPreviewUrl || variantPreviewUrls[activeVariant.id] || "";
      updateDraft({
        sharedImageForAllVariants: true,
        sharedImage: existingImage,
        thumbnailPath: existingImage?.thumbnailUrl || existingImage?.thumbnailPath || draft.thumbnailPath,
      });
      if (existingPreview && !sharedPreviewUrl) setSharedPreviewUrl(existingPreview);
      return;
    }
    updateDraft({ sharedImageForAllVariants: false });
  }

  function selectCategory(change: CreatableComboboxChange) {
    const createdOption = change.reason === "create" ? rememberCatalogueOption("category", change.label) : null;
    const fallbackLabel = change.reason === "input"
      ? change.label
      : normalizeCatalogueOptionLabel(createdOption?.label ?? change.label);
    updateQuickAddIdentity({
      category: fallbackLabel,
      categoryNodeId: "",
    });
  }

  function selectSupplier(change: CreatableComboboxChange) {
    const createdOption = change.reason === "create" ? rememberCatalogueOption("supplier", change.label) : null;
    const supplierId = change.id && !isLocalCatalogueOptionId(change.id) ? change.id : "";
    updateQuickAddIdentity({
      supplierId,
      supplierName: change.reason === "input" ? change.label : normalizeCatalogueOptionLabel(createdOption?.label ?? change.label),
    });
  }

  function selectBrand(change: CreatableComboboxChange) {
    const createdOption = change.reason === "create" ? rememberCatalogueOption("brand", change.label) : null;
    const brandId = change.id && !isLocalCatalogueOptionId(change.id) ? change.id : "";
    updateQuickAddIdentity({
      brandId,
      brand: change.reason === "input" ? change.label : normalizeCatalogueOptionLabel(createdOption?.label ?? change.label),
    });
  }

  function buildOptimisticItem(result: {
    itemId?: string;
    versionNumber?: number;
    activePriceOptionId?: string;
    priceOptions?: Array<{ id: string; label: string; isDefault: boolean }>;
  }): EstimateRowItem {
    const variant = defaultVariant;
    const variantImage = getVariantImage(draft, variant);
    const itemCost = parseAccountingMoney(variant?.unitCost ?? "0");
    const supplierName = selectedSupplier?.name ?? draft.supplierName;
    const brandName = selectedBrand?.name ?? draft.brand;
    const category = draft.category.trim();
    const persistedOptions = result.priceOptions ?? [];
    const priceOptions = draft.variants.map((entry, index) => {
      const persistedOption = persistedOptions.find((option) => option.label === entry.label) ?? (entry.isDefault && result.activePriceOptionId
        ? { id: result.activePriceOptionId, label: entry.label, isDefault: true }
        : null);
      const image = getVariantImage(draft, entry);
      return {
        id: persistedOption?.id ?? `optimistic-${entry.id}`,
        label: entry.label,
        sku: entry.sku || null,
        variantDescription: entry.description,
        variantSortOrder: index + 1,
        unit: entry.unit,
        unitCost: parseAccountingMoney(entry.unitCost),
        miscCost: 0,
        currency: "PHP",
        pricingSource: null,
        pricingDate: today(),
        sourceUrl: null,
        notes: null,
        supplierId: draft.supplierId || null,
        packageQuantity: readOptionalPositiveNumber(entry.packageQuantity),
        packageUnit: entry.packageUnit || null,
        imageBucket: image?.bucket,
        imagePath: image?.path,
        thumbnailPath: image?.thumbnailUrl || image?.thumbnailPath,
        imageMetadata: buildImageMetadata(image),
        attachments: entry.attachments.map((attachment) => ({
          id: attachment.id,
          bucket: attachment.bucket,
          path: attachment.path,
          fileName: attachment.fileName,
          contentType: attachment.contentType,
          sizeBytes: attachment.sizeBytes,
          kind: getAttachmentKind(attachment.contentType),
        })),
        variantMetadata: {},
        isActive: true,
        isDefault: entry.isDefault,
      };
    });

    return {
      id: result.itemId ?? crypto.randomUUID(),
      material: draft.name.trim(),
      name: draft.name.trim(),
      description: variant?.description ?? "",
      supplier: supplierName,
      supplierId: draft.supplierId || undefined,
      source: "library",
      unit: variant?.unit || "unit",
      itemCost,
      price: itemCost,
      currency: "PHP",
      quantity: 1,
      subTotal: itemCost,
      miscCost: 0,
      miscCostDefault: 0,
      totalItemCosts: itemCost,
      imageUrl: variantImage?.thumbnailUrl || variantImage?.thumbnailPath || draft.thumbnailPath || undefined,
      category,
      categoryNodeId: draft.categoryNodeId || undefined,
      categoryPath: undefined,
      brand: brandName || undefined,
      brandId: draft.brandId || undefined,
      sku: variant?.sku || undefined,
      sourceLibraryItemId: result.itemId,
      componentVersionNumber: result.versionNumber,
      priceOptionId: result.activePriceOptionId,
      priceOptionLabel: variant?.label,
      priceOptions,
      lifecycleState: draft.lifecycleState,
      lifecycleStateChangedAt: draft.effectiveAt,
      history: [{
        id: `optimistic-${result.itemId ?? "component"}`,
        type: "version",
        label: `v${result.versionNumber ?? 1}`,
        summary: "Component created",
        effectiveAt: draft.effectiveAt,
        createdAt: new Date().toISOString(),
        versionNumber: result.versionNumber ?? 1,
      }],
      notes: draft.changeReason,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      pricingSource: supplierName || "Component library",
      pricingDate: today(),
      isCustom: true,
    };
  }

  function buildEditedItem(): EstimateRowItem {
    const currentItem = editingItem;
    const variant = defaultVariant ?? draft.variants[0] ?? makeVariantDraft(1);
    const variantImage = getVariantImage(draft, variant);
    const existingPriceOptionsById = new Map((currentItem?.priceOptions ?? []).map((option) => [option.id, option]));
    const editedPriceOptions = draft.variants.map((entry, index): ExistingPriceOption => {
      const existingOption = existingPriceOptionsById.get(entry.id);
      const image = getVariantImage(draft, entry);
      const unitCost = parseAccountingMoney(entry.unitCost);
      return {
        id: entry.id,
        label: entry.label,
        sku: entry.sku || null,
        variantDescription: entry.description,
        variantSortOrder: index + 1,
        unit: entry.unit || variant.unit || currentItem?.unit || "unit",
        unitCost: Number.isFinite(unitCost) ? unitCost : existingOption?.unitCost ?? currentItem?.itemCost ?? 0,
        miscCost: existingOption?.miscCost ?? 0,
        currency: existingOption?.currency ?? "PHP",
        pricingSource: existingOption?.pricingSource ?? null,
        pricingDate: existingOption?.pricingDate ?? (draft.effectiveAt || today()),
        sourceUrl: existingOption?.sourceUrl ?? null,
        notes: existingOption?.notes ?? null,
        supplierId: draft.supplierId || existingOption?.supplierId || null,
        activeCostEntryId: existingOption?.activeCostEntryId ?? null,
        costEntries: existingOption?.costEntries,
        packageQuantity: readOptionalPositiveNumber(entry.packageQuantity),
        packageUnit: entry.packageUnit || null,
        imageBucket: image?.bucket || existingOption?.imageBucket || null,
        imagePath: image?.path || existingOption?.imagePath || null,
        thumbnailPath: image?.thumbnailUrl || image?.thumbnailPath || existingOption?.thumbnailPath || null,
        imageMetadata: buildImageMetadata(image),
        attachments: entry.attachments.map((attachment) => ({
          id: attachment.id,
          bucket: attachment.bucket,
          path: attachment.path,
          fileName: attachment.fileName,
          contentType: attachment.contentType,
          sizeBytes: attachment.sizeBytes,
          kind: getAttachmentKind(attachment.contentType),
        })),
        variantMetadata: existingOption?.variantMetadata ?? {},
        isActive: true,
        isDefault: entry.id === variant.id,
        createdAt: existingOption?.createdAt,
        updatedAt: existingOption?.updatedAt,
      };
    });
    const itemCost = parseAccountingMoney(variant.unitCost);
    const resolvedItemCost = Number.isFinite(itemCost) ? itemCost : currentItem?.itemCost ?? 0;
    const quantity = currentItem?.quantity ?? 1;
    const subTotal = resolvedItemCost * quantity;
    const miscCost = currentItem?.miscCost ?? 0;
    const contingencyPercentage = currentItem?.contingencyPercentage ?? 0;
    const contingencyValue = (subTotal * contingencyPercentage) / 100;
    const adjustmentPercentage = currentItem?.adjustmentPercentage ?? 0;
    const adjustmentValue = (subTotal * adjustmentPercentage) / 100;
    return {
      ...(currentItem ?? buildOptimisticItem({})),
      material: draft.name.trim(),
      name: draft.name.trim(),
      description: variant.description,
      supplier: selectedSupplier?.name ?? draft.supplierName,
      supplierId: draft.supplierId || undefined,
      unit: variant.unit || "unit",
      itemCost: resolvedItemCost,
      price: resolvedItemCost,
      subTotal,
      contingencyValue,
      adjustmentValue,
      miscCost,
      totalItemCosts: subTotal + contingencyValue + adjustmentValue + miscCost,
      imageUrl: variantImage?.thumbnailUrl || variantImage?.thumbnailPath || draft.thumbnailPath || undefined,
      category: draft.category.trim(),
      categoryNodeId: draft.categoryNodeId || undefined,
      brand: (selectedBrand?.name ?? draft.brand) || undefined,
      brandId: draft.brandId || undefined,
      sku: variant.sku || undefined,
      priceOptionId: variant.id,
      priceOptionLabel: variant.label,
      priceOptions: editedPriceOptions,
      lifecycleState: draft.lifecycleState,
      lifecycleStateChangedAt: draft.effectiveAt,
      notes: draft.changeReason,
      updatedAt: new Date().toISOString(),
      pricingSource: (selectedSupplier?.name ?? draft.supplierName) || currentItem?.pricingSource || "Project Component",
      pricingDate: draft.effectiveAt || today(),
    };
  }

  function submit() {
    setSubmitAttempted(true);
    if (imageBusy || attachmentBusy) {
      setError(`Wait for uploads to finish before ${isEditing ? "saving" : "adding"} this component.`);
      return;
    }
    if (validation.length > 0 || isPending) {
      setError("");
      return;
    }
    const payload = buildComponentPayload();

    startTransition(async () => {
      setError("");
      try {
        if (isEditing) {
          let editedItem = buildEditedItem();
          let instanceSync: LibraryComponentInstanceSyncResult | undefined;
          const sourceLibraryItemId = editingItem?.sourceLibraryItemId
            ?? (editingItem?.source === "library" ? editingItem.id : null);
          if (sourceLibraryItemId) {
            const result = await updateCostLibraryComponentWithPriceOptions(sourceLibraryItemId, payload);
            instanceSync = result;
            editedItem = {
              ...editedItem,
              source: "library",
              sourceLibraryItemId,
              linkState: "linked-clean",
              componentVersionNumber: result.versionNumber,
              priceOptionId: result.activePriceOptionId,
            };
          }
          await onComponentUpdated?.(editedItem, instanceSync);
        } else {
          const result = await createCostLibraryComponent(payload);
          onComponentCreated(buildOptimisticItem(result));
        }
        dirtyRef.current = false;
        onOpenChange(false);
      } catch (saveError) {
        setError(saveError instanceof Error ? saveError.message : "Could not save component.");
      }
    });
  }

  const showValidationErrors = submitAttempted && validation.length > 0;
  const visibleValidationErrors: Partial<typeof quickAddValidation.errors> = showValidationErrors ? quickAddValidation.errors : {};
  const componentStatus = error || (showValidationErrors ? `Complete the required fields before ${isEditing ? "saving" : "adding"} this component.` : "");
  const unitLabel = getUnitDisplayLabel(activeVariant?.unit ?? "") || activeVariant?.unit || "unit";
  const showMainCostSection = !variantModeEnabled;

  return (
    <>
      <Modal
        open={open}
        title={isEditing ? "Edit Component" : "Add Component"}
        onOpenChange={requestClose}
        closeLabel={isEditing ? "Close edit component modal" : "Close add component modal"}
        closeOnOverlayClick={false}
        closeOnEscape={false}
        blurBackdrop
        transparentBackdrop
        bodyClassName="overflow-visible p-0"
        className={cn(
          "!w-[min(793px,calc(100vw-16px))] max-w-none overflow-visible rounded-[6px] border border-[rgba(61,61,61,0.10)]",
          OPENDESIGN_MODAL_BG_CLASS,
          OPENDESIGN_MODAL_SHADOW_CLASS,
          "before:pointer-events-none before:absolute before:left-[12%] before:right-[12%] before:top-0 before:h-px before:bg-gradient-to-r before:from-transparent before:via-white/95 before:to-transparent",
          "[&_[data-archestimator-modal-close-header]]:absolute [&_[data-archestimator-modal-close-header]]:right-2 [&_[data-archestimator-modal-close-header]]:top-2 [&_[data-archestimator-modal-close-header]]:z-40 [&_[data-archestimator-modal-close-header]]:min-h-0 [&_[data-archestimator-modal-close-header]]:border-0 [&_[data-archestimator-modal-close-header]]:bg-transparent [&_[data-archestimator-modal-close-header]]:p-0",
          "[&_[data-archestimator-modal-close-header]_button]:size-7 [&_[data-archestimator-modal-close-header]_button]:rounded-[3px] [&_[data-archestimator-modal-close-header]_button]:border [&_[data-archestimator-modal-close-header]_button]:border-[rgba(61,61,61,0.10)] [&_[data-archestimator-modal-close-header]_button]:bg-transparent [&_[data-archestimator-modal-close-header]_button]:text-tertiary",
          "[&_[data-archestimator-modal-close-header]_button]:hover:border-[rgba(61,61,61,0.16)] [&_[data-archestimator-modal-close-header]_button]:hover:bg-[#f5f5f5] [&_[data-archestimator-modal-close-header]_button]:hover:text-ink",
          "[&_[data-archestimator-modal-close-header]_button]:active:translate-y-px",
          "[&_[data-archestimator-modal-title-header]]:min-h-[44px] [&_[data-archestimator-modal-title-header]]:border-0 [&_[data-archestimator-modal-title-header]]:bg-transparent [&_[data-archestimator-modal-title-header]]:px-2 [&_[data-archestimator-modal-title-header]]:py-0",
          "[&_[data-archestimator-modal-title-header]_h2]:!text-[12px] [&_[data-archestimator-modal-title-header]_h2]:!font-medium",
          "[&_[data-archestimator-modal-location-footer]]:hidden",
        )}
      >
        <div className="relative isolate flex h-[min(896px,calc(100dvh-60px))] w-full max-w-full flex-col overflow-visible text-[10px] text-secondary">
          <div className="relative z-20 flex h-8 shrink-0 items-stretch gap-2 border-b border-[#e7e9ec] px-2" role="tablist" aria-label={isEditing ? "Edit component sections" : "Add component sections"}>
            {ADD_COMPONENT_MODAL_TABS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={activeTab === tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "relative flex items-center gap-1.5 h-full px-2 !text-[10px] font-medium text-tertiary border-b-2 border-b-transparent transition-colors hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(242,68,5,0.32)]",
                  activeTab === tab.id && "text-ink border-b-[#F24405]",
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <button
            type="button"
            aria-label="Open variants panel"
            aria-expanded={variantDrawerOpen}
            onClick={() => {
              setVariantDrawerOpen((current) => !current);
              setVariantDrawerView("manager");
            }}
            className={cn(
              "absolute right-[-30px] top-[-1px] z-40 grid h-[34px] w-[30px] place-items-center rounded-r-[3px] border border-l-0 border-[rgba(61,61,61,0.10)] bg-[rgba(255,255,255,0.84)] text-tertiary transition-colors transition-transform hover:border-[#F24405]/30 hover:bg-[color-mix(in_srgb,#F24405_14%,white)] hover:text-[#c63804] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(242,68,5,0.32)] before:absolute before:left-0 before:top-[7px] before:bottom-[7px] before:w-0.5 before:rounded-r-sm before:bg-transparent before:transition-colors",
              "hover:before:bg-[#F24405]",
              OPENDESIGN_RAIL_SHADOW_CLASS,
              "max-[640px]:right-2 max-[640px]:top-[3px] max-[640px]:h-[26px] max-[640px]:w-[28px] max-[640px]:rounded-[6px] max-[640px]:border-l",
              variantDrawerOpen && "border-[#F24405]/30 bg-[color-mix(in_srgb,#F24405_14%,white)] text-[#c63804] before:bg-[#F24405] shadow-[16px_16px_30px_-24px_rgba(23,29,40,0.56),inset_0_1px_0_rgba(255,255,255,0.72),inset_0_0_0_1px_rgba(61,61,61,0.025)]",
            )}
          >
            <Dna size={15} weight="regular" aria-hidden="true" />
          </button>

          {activeTab === "component" ? (
            <div role="tabpanel" aria-label="Component" className="relative z-20 grid min-h-0 flex-1 overflow-hidden lg:grid-cols-[260px_minmax(0,1fr)]">
              <aside className="min-h-0 overflow-auto border-b border-[#f2f2f2] bg-[rgba(255,255,255,0.64)] p-2 lg:border-b-0 lg:border-r" aria-label="Component image">
                <div className="grid gap-2">
                  <div className={OPENDESIGN_IMAGE_WELL_CLASS}>
                    {activeImageSrc ? (
                      <Image
                        src={activeImageSrc}
                        alt="Component thumbnail preview"
                        fill
                        sizes="260px"
                        className="object-cover"
                        unoptimized={shouldBypassNextImageOptimization(activeImageSrc, activePreviewUrl)}
                      />
                    ) : (
                      <div className="grid justify-items-center gap-1 px-4 text-center text-tertiary">
                        <ImageSquare size={30} weight="regular" aria-hidden="true" />
                        <span className="text-[10px] font-medium text-ink">Thumbnail</span>
                        <span className="max-w-[190px] text-[9px] font-medium leading-[1.35] text-tertiary">Upload a square reference image for this component.</span>
                      </div>
                    )}
                  </div>
                  <input
                    id={thumbnailInputId}
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/avif,.jpg,.jpeg,.png,.webp,.avif"
                    aria-label="Upload thumbnail"
                    disabled={imageBusy}
                    onChange={(event) => {
                      const input = event.currentTarget;
                      const file = input.files?.[0];
                      if (!file) return;
                      void handleThumbnailUpload(file).finally(() => {
                        input.value = "";
                      });
                    }}
                    className="sr-only"
                  />
                  <label
                    htmlFor={thumbnailInputId}
                    className="inline-flex h-8 cursor-pointer items-center justify-center gap-2 rounded-[6px] bg-[rgba(61,61,61,0.05)] px-3 !text-[10px] font-medium text-ink transition hover:bg-[rgba(61,61,61,0.08)] focus-within:ring-2 focus-within:ring-[rgba(242,68,5,0.32)]"
                  >
                    <UploadSimple size={12} weight="regular" aria-hidden="true" />
                    Choose image
                  </label>
                  <label className="flex min-h-6 items-center gap-2 rounded-[6px] px-1 !text-[10px] font-medium text-ink">
                    <input
                      type="checkbox"
                      aria-label="Use same image for all variants"
                      checked={draft.sharedImageForAllVariants}
                      onChange={(event) => setSharedImageMode(event.target.checked)}
                      className="size-3 rounded-[3px] border-[rgba(61,61,61,0.22)] accent-[#F24405]"
                    />
                    <span>Use same image for all variants</span>
                  </label>
                  <span className="min-h-4 truncate text-[9px] font-medium text-tertiary">
                    {activeImagePath || "JPG, PNG, WebP, or AVIF"}
                  </span>
                  {imageUpload.state !== "idle" ? (
                    <span
                      role={imageUpload.state === "error" ? "alert" : "status"}
                      className={cn("text-[9px] font-medium", imageUpload.state === "error" ? "text-danger" : "text-tertiary")}
                    >
                      {imageUpload.message}
                    </span>
                  ) : null}
                </div>
              </aside>

              <main className="min-h-0 overflow-auto bg-white p-2" role="form" aria-label="Quick add component">
                <div className="grid gap-[10px]">
                  <section className={cn(OPENDESIGN_SECTION_CLASS, "min-h-[176px]")} aria-label="Component information fields">
                    <div className={OPENDESIGN_SECTION_TITLE_CLASS}>
                      <Package size={11} weight="regular" aria-hidden="true" />
                      Component
                    </div>
                    <ControlField label="Name" labelClassName={OPENDESIGN_FIELD_LABEL_CLASS} errorText={visibleValidationErrors.name}>
                      <ControlInput
                        ref={initialFocusRef}
                        aria-label="Name"
                        data-dialog-initial-focus
                        value={draft.name}
                        onBlur={scheduleDuplicateCheck}
                        onChange={(event) => updateQuickAddIdentity({ name: event.target.value })}
                        aria-required="true"
                        invalid={Boolean(visibleValidationErrors.name)}
                        className={OPENDESIGN_INPUT_CLASS}
                      />
                    </ControlField>
                    <ControlField label="Description" labelClassName={OPENDESIGN_FIELD_LABEL_CLASS}>
                      <ControlTextarea
                        aria-label="Description"
                        value={defaultVariant?.description ?? ""}
                        onChange={(event) => updatePrimaryVariant({ description: event.target.value })}
                        className={OPENDESIGN_TEXTAREA_CLASS}
                      />
                    </ControlField>
                  </section>

                  <section className={OPENDESIGN_SECTION_CLASS} aria-label="Catalogue fields">
                    <div className={OPENDESIGN_SECTION_TITLE_CLASS}>Catalogue</div>
                    <ControlField as="div" label="Category" labelClassName={OPENDESIGN_FIELD_LABEL_CLASS} errorText={visibleValidationErrors.category}>
                      <CreatableCombobox
                        ariaLabel="Category"
                        ariaRequired
                        value={draft.category}
                        selectedId={selectedCategoryOptionId}
                        options={categoryOptions}
                        placeholder="Search categories"
                        emptyLabel="No categories found"
                        createLabel={(value) => `Add category "${value}"`}
                        invalid={Boolean(visibleValidationErrors.category)}
                        inputClassName={OPENDESIGN_INPUT_CLASS}
                        onChange={selectCategory}
                        isOptionDeletable={isLocalCatalogueComboboxOption}
                        onDeleteOption={(option) => deleteCatalogueOption("category", option)}
                        getDeleteOptionLabel={(option) => `Delete category "${option.label}"`}
                        preferSelectionOnEnter
                        showClearButton={false}
                        showDropdownIndicator
                      />
                    </ControlField>
                    <ControlField as="div" label="Supplier" labelClassName={OPENDESIGN_FIELD_LABEL_CLASS} errorText={visibleValidationErrors.supplier}>
                      <CreatableCombobox
                        ariaLabel="Supplier"
                        value={supplierValue}
                        selectedId={selectedSupplierOptionId}
                        options={supplierOptions}
                        placeholder="Search suppliers"
                        emptyLabel="No suppliers yet"
                        createLabel={(value) => `Add supplier "${value}"`}
                        invalid={Boolean(visibleValidationErrors.supplier)}
                        inputClassName={OPENDESIGN_INPUT_CLASS}
                        onChange={selectSupplier}
                        isOptionDeletable={isLocalCatalogueComboboxOption}
                        onDeleteOption={(option) => deleteCatalogueOption("supplier", option)}
                        getDeleteOptionLabel={(option) => `Delete supplier "${option.label}"`}
                        showClearButton={false}
                        showDropdownIndicator
                      />
                    </ControlField>
                    <ControlField as="div" label="Brand" labelClassName={OPENDESIGN_FIELD_LABEL_CLASS} errorText={visibleValidationErrors.brand}>
                      <CreatableCombobox
                        ariaLabel="Brand"
                        value={brandValue}
                        selectedId={selectedBrandOptionId}
                        options={brandOptions}
                        placeholder="Search brands"
                        emptyLabel="No brands yet"
                        createLabel={(value) => `Add brand "${value}"`}
                        invalid={Boolean(visibleValidationErrors.brand)}
                        inputClassName={OPENDESIGN_INPUT_CLASS}
                        onChange={selectBrand}
                        isOptionDeletable={isLocalCatalogueComboboxOption}
                        onDeleteOption={(option) => deleteCatalogueOption("brand", option)}
                        getDeleteOptionLabel={(option) => `Delete brand "${option.label}"`}
                        showClearButton={false}
                        showDropdownIndicator
                      />
                    </ControlField>
                    {possibleDuplicate ? (
                      <output className="flex min-h-8 items-center justify-between gap-2 rounded-[6px] bg-warningSoft/50 px-2 text-[10px] font-medium text-ink">
                        <span className="min-w-0 truncate">
                          A component named &quot;{possibleDuplicate.name ?? possibleDuplicate.material}&quot; already exists.
                        </span>
                        <Button
                          type="button"
                          variant="warning"
                          size="xs"
                          onPointerDown={(event) => {
                            event.preventDefault();
                            acknowledgeDuplicate();
                          }}
                          onClick={acknowledgeDuplicate}
                          className="min-w-0 shrink-0 px-2"
                        >
                          Create anyway
                        </Button>
                      </output>
                    ) : null}
                  </section>

                  {showMainCostSection ? (
                    <section className={OPENDESIGN_SECTION_CLASS} aria-label="Cost fields">
                      <div className={OPENDESIGN_SECTION_TITLE_CLASS}>
                        <Money size={11} weight="regular" aria-hidden="true" />
                        Cost
                      </div>
                      <div className="grid gap-2 md:grid-cols-[minmax(0,1fr)_minmax(76px,0.5fr)]">
                        <ControlField label="Unit cost" labelClassName={OPENDESIGN_FIELD_LABEL_CLASS} errorText={visibleValidationErrors.unitCost}>
                          <div className="relative">
                            <span className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 font-mono text-[9px] font-medium text-tertiary">PHP</span>
                            <ControlInput
                              aria-label="Unit cost"
                              aria-required="true"
                              inputMode="decimal"
                              value={defaultVariant?.unitCost ?? ""}
                              onChange={(event) => updatePrimaryVariant({ unitCost: normalizeMoneyInput(event.target.value) })}
                              onBlur={(event) => updatePrimaryVariant({ unitCost: formatAccountingMoney(normalizeMoneyInput(event.target.value)) })}
                              invalid={Boolean(visibleValidationErrors.unitCost)}
                              className={cn(OPENDESIGN_INPUT_CLASS, "pl-[34px] text-right tabular-nums")}
                              placeholder="0.00"
                            />
                          </div>
                        </ControlField>
                        <ControlField as="div" label="Unit" labelClassName={OPENDESIGN_FIELD_LABEL_CLASS} errorText={visibleValidationErrors.unit}>
                          <CreatableCombobox
                            ariaLabel="Unit"
                            ariaRequired
                            value={defaultVariant?.unit ?? ""}
                            selectedId={getSelectedUnitId(defaultVariant?.unit ?? "", COMPONENT_UNIT_COMBOBOX_OPTIONS)}
                            options={COMPONENT_UNIT_COMBOBOX_OPTIONS}
                            placeholder="Search units"
                            emptyLabel="No units found"
                            createLabel={(value) => `Add unit "${value}"`}
                            invalid={Boolean(visibleValidationErrors.unit)}
                            inputClassName={OPENDESIGN_INPUT_CLASS}
                            onChange={(change) => {
                              const unit = getUnitComboboxValue(change);
                              updatePrimaryVariant({ unit });
                            }}
                            preferSelectionOnEnter
                            suppressCreateWhenSearchMatches
                            optionPresentation="unit"
                            showClearButton={false}
                          />
                        </ControlField>
                      </div>
                    </section>
                  ) : null}
                </div>
              </main>
            </div>
          ) : (
            <div role="tabpanel" aria-label="Activity" className="relative z-20 min-h-0 flex-1 overflow-auto p-[14px]">
              <section className="mx-auto grid w-full max-w-[520px] gap-3" aria-label="Component lifecycle">
                <ControlField label="Component state" labelClassName={OPENDESIGN_FIELD_LABEL_CLASS}>
                  <DropdownSelect
                    aria-label="Component state"
                    options={LIFECYCLE_OPTIONS}
                    value={draft.lifecycleState}
                    onValueChange={(lifecycleState) => updateDraft({ lifecycleState: lifecycleState as ComponentLifecycleState })}
                    className={OPENDESIGN_INPUT_CLASS}
                  />
                </ControlField>
                <ControlField label="Effective date" labelClassName={OPENDESIGN_FIELD_LABEL_CLASS}>
                  <ControlInput
                    aria-label="Effective date"
                    type="date"
                    value={draft.effectiveAt}
                    onChange={(event) => updateDraft({ effectiveAt: event.target.value })}
                    className={OPENDESIGN_INPUT_CLASS}
                  />
                </ControlField>
                <ControlField label="Currency" labelClassName={OPENDESIGN_FIELD_LABEL_CLASS}>
                  <ControlInput
                    aria-label="Currency"
                    disabled
                    readOnly
                    value="PHP"
                    className={cn(OPENDESIGN_INPUT_CLASS, "opacity-100 disabled:opacity-100")}
                  />
                </ControlField>
                <ControlField label="Change note" labelClassName={OPENDESIGN_FIELD_LABEL_CLASS}>
                  <ControlTextarea
                    aria-label="Change note"
                    value={draft.changeReason}
                    onChange={(event) => updateDraft({ changeReason: event.target.value })}
                    className={cn(OPENDESIGN_TEXTAREA_CLASS, "min-h-24")}
                  />
                </ControlField>
                <div className="rounded-[6px] bg-[rgba(61,61,61,0.05)] px-2 py-2 text-[10px] font-medium text-tertiary">
                  Current state: {lifecycleOption.label}. Default cost: PHP {defaultCost}.
                </div>
              </section>
            </div>
          )}

          <footer className="relative z-20 flex h-[49px] min-h-[49px] shrink-0 items-center gap-2 border-t border-[#f2f2f2] bg-[rgba(255,255,255,0.94)] px-2">
            <div className={cn("mr-auto min-w-0 truncate text-[9px] font-medium", error || showValidationErrors ? "text-danger" : "text-tertiary")} aria-live="polite">
              {componentStatus}
            </div>
            <button
              type="button"
              onClick={() => requestClose(false)}
              className="h-8 px-2 text-[10px] font-medium text-tertiary transition hover:bg-[rgba(255,255,255,0.58)] hover:text-ink rounded-[3px] border border-transparent bg-transparent"
            >
              Discard
            </button>
            <button
              type="button"
              onClick={submit}
              disabled={isPending || imageBusy || attachmentBusy}
              className="h-8 px-2 text-[10px] font-medium text-white transition hover:brightness-[0.94] disabled:cursor-not-allowed disabled:opacity-55 rounded-[3px] border border-[#c63804] bg-[#F24405] shadow-[0_1px_0_rgba(255,255,255,0.22)_inset,0_10px_18px_-14px_rgba(198,56,4,0.78)]"
            >
              {isPending ? (isEditing ? "Saving..." : "Adding...") : imageBusy || attachmentBusy ? "Uploading..." : isEditing ? "Save Component" : "Add Component"}
            </button>
          </footer>

          <div
            aria-hidden="true"
            data-add-component-modal-over-drawer-shadow
            className={cn(
              "pointer-events-none absolute bottom-0 right-[-32px] top-8 z-30 w-8 bg-[linear-gradient(90deg,rgba(23,29,40,0.24),rgba(23,29,40,0.12)_32%,rgba(23,29,40,0.035)_70%,transparent)] opacity-0 transition-opacity duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none",
              variantDrawerOpen && "opacity-100",
            )}
          />

          <aside
            role="dialog"
            aria-label="Manage variants"
            aria-modal="false"
            aria-hidden={!variantDrawerOpen}
            inert={!variantDrawerOpen}
            className={cn(
              "absolute bottom-0 left-[calc(100%-1px)] top-8 z-10 flex w-[min(533px,calc(100vw-32px))] origin-left flex-col overflow-visible rounded-r-[6px] border border-l-0 border-[rgba(61,61,61,0.10)] bg-[rgba(255,255,255,0.94)] backdrop-blur-[18px] transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none",
              OPENDESIGN_DRAWER_SHADOW_CLASS,
              variantDrawerOpen ? "translate-x-0 opacity-100" : "pointer-events-none translate-x-[calc(-100%+1px)] opacity-100 max-[1120px]:translate-x-[calc(100%+8px)]",
              "max-[1120px]:right-2 max-[1120px]:left-auto max-[1120px]:w-[min(430px,calc(100%-24px))] max-[1120px]:origin-right max-[1120px]:rounded-[6px] max-[1120px]:rounded-r-none max-[1120px]:border-l max-[1120px]:border-r-0 max-[1120px]:shadow-[-26px_0_44px_-34px_rgba(23,29,40,0.52),inset_0_1px_0_rgba(255,255,255,0.72),inset_0_0_0_1px_rgba(61,61,61,0.025)]",
              "max-[900px]:right-0 max-[900px]:w-[min(430px,calc(100%-8px))]",
              "max-[640px]:inset-x-0 max-[640px]:w-full max-[640px]:rounded-none",
            )}
          >
            <header className="flex h-[45px] shrink-0 items-center gap-2 border-b border-[rgba(61,61,61,0.08)] bg-[rgba(255,255,255,0.72)] pl-4 pr-2">
              <div className="mr-auto min-w-0">
                <h3 className="truncate text-[11px] font-medium leading-[1.2] text-ink">Manage Variants</h3>
                <p className="m-0 truncate text-[9px] font-medium leading-3 text-tertiary">{visibleVariants.length} variant{visibleVariants.length === 1 ? "" : "s"}</p>
              </div>
              <button
                type="button"
                aria-label="Close variants panel"
                onClick={() => setVariantDrawerOpen(false)}
                className="grid size-7 place-items-center rounded-[3px] border border-[rgba(61,61,61,0.10)] bg-transparent text-tertiary transition hover:border-[rgba(61,61,61,0.16)] hover:bg-[#f5f5f5] hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(242,68,5,0.32)]"
              >
                <X size={13} weight="regular" aria-hidden="true" />
              </button>
            </header>

            <div className="flex h-8 shrink-0 items-center justify-start gap-2 border-b border-[rgba(61,61,61,0.08)] bg-[rgba(255,255,255,0.58)] px-2 pb-[5px] pl-4 pt-1">
              <button
                type="button"
                aria-pressed={variantModeEnabled && (activeVariant?.isDefault ?? false)}
                disabled={!variantModeEnabled || !activeVariant}
                onClick={setActiveVariantAsDefault}
                className={cn(
                  "h-5 rounded-full px-2 text-[9px] font-medium leading-none transition disabled:opacity-50",
                  activeVariant?.isDefault
                    ? "bg-[color-mix(in_srgb,#F24405_14%,white)] text-[#c63804]"
                    : "bg-transparent text-[#c63804] hover:bg-[color-mix(in_srgb,#F24405_9%,transparent)]",
                )}
              >
                Default
              </button>
            </div>

            <nav
              className={cn(
                "absolute left-full top-[45px] z-[3] grid w-[30px] gap-0 transition-opacity duration-150 max-[1120px]:hidden motion-reduce:transition-none",
                variantDrawerOpen ? "opacity-100" : "pointer-events-none opacity-0",
              )}
              aria-label="Variant navigation"
              aria-hidden={!variantDrawerOpen}
            >
              <div className="grid gap-0">
                <button
                  type="button"
                  aria-label="Manage variants"
                  aria-pressed={variantDrawerView === "manager"}
                  onClick={() => setVariantDrawerView("manager")}
                  className={cn(
                    "grid h-8 w-[30px] place-items-center rounded-tr-[3px] border border-l-0 border-[rgba(61,61,61,0.10)] bg-[rgba(255,255,255,0.84)] text-tertiary transition hover:border-[#F24405]/30 hover:bg-white hover:text-[#c63804] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(242,68,5,0.32)]",
                    OPENDESIGN_RAIL_SHADOW_CLASS,
                    variantDrawerView === "manager" && cn("z-[2] border-r-2 border-r-[#F24405] bg-[rgba(255,255,255,0.94)] text-[#c63804]", OPENDESIGN_RAIL_ACTIVE_SHADOW_CLASS),
                  )}
                >
                  <Dna size={13} weight="regular" aria-hidden="true" />
                </button>
                <button
                  type="button"
                  aria-label="Add variant"
                  onClick={addVariant}
                  className={cn(
                    "-mt-px grid h-[34px] w-[30px] place-items-center border border-l-0 border-[rgba(61,61,61,0.10)] bg-[rgba(255,255,255,0.84)] text-tertiary opacity-[0.82] transition hover:border-[#F24405]/30 hover:bg-white hover:text-[#c63804] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(242,68,5,0.32)]",
                    OPENDESIGN_RAIL_SHADOW_CLASS,
                    visibleVariants.length === 0 && "rounded-br-[3px]",
                  )}
                >
                  <Plus size={14} weight="regular" aria-hidden="true" />
                </button>
                {visibleVariants.map((variant, index) => {
                  const isActive = activeVariant?.id === variant.id && variantDrawerView === "variant";
                  const isLast = index === visibleVariants.length - 1;
                  return (
                    <button
                      key={variant.id}
                      type="button"
                      aria-label={`Open V${index + 1}`}
                      aria-pressed={isActive}
                      onClick={() => {
                        setActiveVariantId(variant.id);
                        setVariantDrawerView("variant");
                      }}
                      className={cn(
                        "-mt-px grid h-[34px] w-[30px] place-items-center border border-l-0 border-[rgba(61,61,61,0.10)] text-[9px] font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(242,68,5,0.32)]",
                        isActive
                          ? "z-[2] translate-x-0 border-r-2 border-r-[#F24405] bg-[rgba(255,255,255,0.94)] text-[#c63804] opacity-100 shadow-[16px_16px_30px_-24px_rgba(23,29,40,0.56),inset_0_1px_0_rgba(255,255,255,0.72),inset_0_0_0_1px_rgba(61,61,61,0.025)]"
                          : "translate-x-[-3px] bg-[rgba(255,255,255,0.58)] text-tertiary opacity-[0.56] shadow-[7px_10px_18px_-18px_rgba(23,29,40,0.55),inset_0_1px_0_rgba(255,255,255,0.72),inset_0_0_0_1px_rgba(61,61,61,0.025)] hover:translate-x-0 hover:bg-white hover:text-ink hover:opacity-100",
                        isLast && "rounded-br-[3px]",
                      )}
                    >
                      V{index + 1}
                    </button>
                  );
                })}
              </div>
            </nav>

            <div className="min-h-0 flex-1 overflow-auto px-2 pb-2 pl-4 pt-[6px]">
              {variantDrawerView === "manager" ? (
                <div className="grid gap-2" aria-label="Variant manager">
                  {visibleVariants.length === 0 ? (
                    <div className="grid min-h-[64px] place-items-center rounded-[3px] bg-[rgba(61,61,61,0.05)] px-3 text-center text-[10px] font-medium leading-[1.35] text-tertiary">
                      No variants yet.
                    </div>
                  ) : null}
                  {visibleVariants.map((variant, index) => (
                    <button
                      key={variant.id}
                      type="button"
                      onClick={() => {
                        setActiveVariantId(variant.id);
                        setVariantDrawerView("variant");
                      }}
                      className="grid min-h-[34px] grid-cols-[minmax(0,1fr)_auto] items-center gap-2 rounded-[3px] bg-[rgba(61,61,61,0.05)] px-2 py-1.5 text-left transition hover:bg-[rgba(61,61,61,0.075)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(242,68,5,0.32)]"
                    >
                      <span className="min-w-0">
                        <span className="block truncate text-[10px] font-medium text-ink">{variant.label || `V${index + 1}`}</span>
                        <span className="mt-0.5 block truncate text-[9px] font-medium text-tertiary">PHP {formatAccountingMoney(variant.unitCost || "0")} / {getUnitDisplayLabel(variant.unit) || variant.unit}</span>
                      </span>
                      {variant.isDefault ? <span className="h-[18px] rounded-full bg-[color-mix(in_srgb,#F24405_10%,white)] px-[7px] text-[9px] font-medium leading-[18px] text-[#c63804]">Default</span> : null}
                    </button>
                  ))}
                  <Button type="button" variant="secondary" size="sm" onClick={addVariant} className="mt-1 rounded-[6px]">
                    <Plus size={12} weight="regular" aria-hidden="true" />
                    Add variant
                  </Button>
                </div>
              ) : activeVariant ? (
                <div className="grid gap-2" aria-label="Variant editor">
                  <section className="grid h-[99px] grid-cols-[83px_minmax(0,1fr)] items-center gap-2 rounded-[3px] bg-[rgba(61,61,61,0.035)] p-2" aria-label="Variant image">
                    <div className={OPENDESIGN_IMAGE_WELL_CLASS}>
                      {activeImageSrc ? (
                        <Image
                          src={activeImageSrc}
                          alt="Variant thumbnail preview"
                          fill
                          sizes="83px"
                          className="object-cover"
                          unoptimized={shouldBypassNextImageOptimization(activeImageSrc, activePreviewUrl)}
                        />
                      ) : (
                        <ImageSquare size={22} weight="regular" aria-hidden="true" className="text-tertiary" />
                      )}
                    </div>
                    <div className="grid content-center gap-1">
                      <p className="m-0 text-[11px] font-medium leading-[1.25] text-ink">Upload thumbnail</p>
                      <p className="m-0 text-[9px] font-medium leading-3 text-tertiary">Use a square product photo or catalogue crop for this variant.</p>
                      <input
                        id={variantThumbnailInputId}
                        type="file"
                        accept="image/jpeg,image/png,image/webp,image/avif,.jpg,.jpeg,.png,.webp,.avif"
                        aria-label="Upload variant thumbnail"
                        disabled={imageBusy}
                        onChange={(event) => {
                          const input = event.currentTarget;
                          const file = input.files?.[0];
                          if (!file) return;
                          void handleThumbnailUpload(file).finally(() => {
                            input.value = "";
                          });
                        }}
                        className="sr-only"
                      />
                      <label
                        htmlFor={variantThumbnailInputId}
                        className="inline-flex h-[26px] cursor-pointer items-center justify-center justify-self-start gap-2 rounded-[6px] bg-[rgba(61,61,61,0.05)] px-3 !text-[10px] font-medium text-ink transition hover:bg-[rgba(61,61,61,0.08)] focus-within:ring-2 focus-within:ring-[rgba(242,68,5,0.32)]"
                      >
                        <UploadSimple size={12} weight="regular" aria-hidden="true" />
                        Choose image
                      </label>
                      <span className="min-h-[13px] truncate text-[9px] font-medium leading-3 text-tertiary">{activeImagePath || "No image selected"}</span>
                    </div>
                  </section>

                  <section className={OPENDESIGN_SECTION_CLASS} aria-label="Variant identity">
                    <ControlField label="Variant Name" labelClassName={OPENDESIGN_FIELD_LABEL_CLASS}>
                      <ControlInput
                        aria-label="Variant Name"
                        aria-required="true"
                        value={activeVariant.label}
                        onChange={(event) => updateActiveVariant({ label: event.target.value })}
                        invalid={showValidationErrors && !activeVariant.label.trim()}
                        className={OPENDESIGN_INPUT_CLASS}
                      />
                    </ControlField>
                    <ControlField label="Variant Description" labelClassName={OPENDESIGN_FIELD_LABEL_CLASS}>
                      <ControlTextarea
                        aria-label="Variant Description"
                        value={activeVariant.description}
                        onChange={(event) => updateActiveVariant({ description: event.target.value })}
                        className={OPENDESIGN_TEXTAREA_CLASS}
                      />
                    </ControlField>
                    <ControlField label="SKU / Reference" labelClassName={OPENDESIGN_FIELD_LABEL_CLASS}>
                      <ControlInput
                        aria-label="SKU / Reference"
                        value={activeVariant.sku}
                        onChange={(event) => updateActiveVariant({ sku: event.target.value })}
                        className={OPENDESIGN_INPUT_CLASS}
                      />
                    </ControlField>
                  </section>

                  <section className={OPENDESIGN_SECTION_CLASS} aria-label="Variant cost">
                    <div className={OPENDESIGN_SECTION_TITLE_CLASS}>Cost</div>
                    <div
                      className="grid grid-cols-[minmax(0,1fr)_minmax(76px,0.5fr)] items-start gap-2 min-[1121px]:grid-cols-[minmax(190px,1.35fr)_minmax(76px,0.5fr)_minmax(196px,1fr)] max-md:grid-cols-1"
                    >
                      <ControlField label="Unit cost" labelClassName={OPENDESIGN_FIELD_LABEL_CLASS} errorText={showValidationErrors && activeVariant.id === defaultVariant?.id ? quickAddValidation.errors.unitCost : undefined}>
                        <div className="relative">
                          <span className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 font-mono text-[9px] font-medium text-tertiary">PHP</span>
                          <ControlInput
                            aria-label="Variant unit cost"
                            aria-required="true"
                            inputMode="decimal"
                            value={activeVariant.unitCost}
                            onChange={(event) => updateActiveVariant({ unitCost: normalizeMoneyInput(event.target.value) })}
                            onBlur={(event) => updateActiveVariant({ unitCost: formatAccountingMoney(normalizeMoneyInput(event.target.value)) })}
                            invalid={showValidationErrors && (!Number.isFinite(parseMoney(activeVariant.unitCost)) || parseMoney(activeVariant.unitCost) < 0)}
                            className={cn(OPENDESIGN_INPUT_CLASS, "pl-[34px] text-right tabular-nums")}
                            placeholder="0.00"
                          />
                        </div>
                      </ControlField>
                      <ControlField as="div" label="Unit" labelClassName={OPENDESIGN_FIELD_LABEL_CLASS} errorText={showValidationErrors && activeVariant.id === defaultVariant?.id ? quickAddValidation.errors.unit : undefined}>
                        <CreatableCombobox
                          ariaLabel="Variant unit"
                          ariaRequired
                          value={activeVariant.unit}
                          selectedId={getSelectedUnitId(activeVariant.unit, COMPONENT_UNIT_COMBOBOX_OPTIONS)}
                          options={COMPONENT_UNIT_COMBOBOX_OPTIONS}
                          placeholder="Search units"
                          emptyLabel="No units found"
                          createLabel={(value) => `Add unit "${value}"`}
                          invalid={showValidationErrors && !activeVariant.unit.trim()}
                          inputClassName={OPENDESIGN_INPUT_CLASS}
                          onChange={(change) => updateActiveVariantUnit(getUnitComboboxValue(change))}
                          preferSelectionOnEnter
                          suppressCreateWhenSearchMatches
                          optionPresentation="unit"
                          dropdownPlacement="top"
                          showClearButton={false}
                        />
                      </ControlField>
                      <ControlField as="div" label="Equivalency" labelClassName={OPENDESIGN_FIELD_LABEL_CLASS} className="max-[1120px]:col-span-full">
                        <div className="grid h-8 grid-cols-[auto_auto_minmax(44px,0.55fr)_minmax(66px,0.75fr)] items-center gap-1.5 rounded-[6px] bg-[rgba(61,61,61,0.05)] px-1.5 max-sm:grid-cols-[auto_auto_minmax(52px,0.5fr)_minmax(82px,1fr)]">
                          <span className="text-[10px] font-medium text-muted">
                            1 <span className="text-ink">{unitLabel}</span>
                          </span>
                          <span className="text-[10px] font-medium text-muted">=</span>
                          <ControlField label="Equivalent quantity" labelClassName="sr-only">
                            <ControlInput
                              aria-label="Equivalent quantity"
                              inputMode="decimal"
                              value={activeVariant.packageQuantity}
                              onChange={(event) => updateActiveVariant({ packageQuantity: event.target.value })}
                              invalid={Number.isNaN(readOptionalPositiveNumber(activeVariant.packageQuantity))}
                              className={cn(OPENDESIGN_INPUT_CLASS, "h-6 px-1.5")}
                              placeholder="12"
                            />
                          </ControlField>
                          <ControlField label="Equivalent unit" labelClassName="sr-only">
                            <ControlInput
                              aria-label="Equivalent unit"
                              value={activeVariant.packageUnit}
                              onChange={(event) => updateActiveVariant({ packageUnit: event.target.value })}
                              className={cn(OPENDESIGN_INPUT_CLASS, "h-6 px-1.5")}
                              placeholder="tiles"
                            />
                          </ControlField>
                        </div>
                      </ControlField>
                    </div>
                  </section>

                  <section className={OPENDESIGN_SECTION_CLASS} aria-label="Variant attachments">
                    <div className="flex items-center justify-between gap-2">
                      <div className={OPENDESIGN_SECTION_TITLE_CLASS}>
                        <Paperclip size={11} weight="regular" aria-hidden="true" />
                        Attachments
                      </div>
                      <input
                        id={attachmentInputId}
                        type="file"
                        accept="application/pdf,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                        aria-label="Upload attachment"
                        disabled={attachmentBusy}
                        onChange={(event) => {
                          const input = event.currentTarget;
                          const file = input.files?.[0];
                          if (!file) return;
                          void handleAttachmentUpload(file).finally(() => {
                            input.value = "";
                          });
                        }}
                        className="sr-only"
                      />
                      <label
                        htmlFor={attachmentInputId}
                        className="inline-flex h-7 cursor-pointer items-center justify-center gap-2 rounded-[6px] bg-[rgba(61,61,61,0.05)] px-2 !text-[10px] font-medium text-ink transition hover:bg-[rgba(61,61,61,0.08)] focus-within:ring-2 focus-within:ring-[rgba(242,68,5,0.32)]"
                      >
                        <UploadSimple size={11} weight="regular" aria-hidden="true" />
                        Upload
                      </label>
                    </div>
                    <ul className="m-0 flex list-none gap-2 overflow-x-auto overscroll-x-contain p-px pb-1.5 -mx-px snap-x snap-proximity">
                      {activeVariant.attachments.length > 0 ? activeVariant.attachments.map((attachment) => (
                        <li key={attachment.id} className="group relative flex aspect-square w-[92px] shrink-0 snap-start flex-col justify-between rounded-[6px] bg-[rgba(61,61,61,0.05)] p-2 after:pointer-events-none after:absolute after:inset-0 after:rounded-[6px] after:shadow-[inset_0_1px_0_rgba(255,255,255,0.48)]">
                          <div className="grid size-[30px] place-items-center rounded-[3px] bg-white/50">
                            <Paperclip size={16} weight="regular" aria-hidden="true" className="text-tertiary" />
                          </div>
                          <div className="grid min-w-0 gap-0.5">
                            <span className="truncate text-[9.5px] font-medium leading-[1.25] text-ink">{attachment.fileName}</span>
                            <span className="truncate font-mono text-[8.5px] leading-[1.25] text-tertiary">{formatBytes(attachment.sizeBytes)}</span>
                          </div>
                          <button
                            type="button"
                            aria-label={`Remove attachment ${attachment.fileName}`}
                            onClick={() => removeAttachment(attachment.id)}
                            className="absolute right-[5px] top-[5px] grid size-5 place-items-center rounded-full border-0 bg-white/74 p-0 text-tertiary opacity-0 transition hover:bg-danger hover:text-white focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-danger group-hover:opacity-100"
                          >
                            <X size={11} weight="bold" aria-hidden="true" />
                          </button>
                        </li>
                      )) : (
                        <li className="grid min-h-[72px] min-w-full place-items-center rounded-[6px] bg-[rgba(61,61,61,0.05)] px-3 text-center text-[9.5px] leading-[1.35] text-tertiary">
                          No files attached. Upload specs, quotes, certificates, or site files for this variant.
                        </li>
                      )}
                    </ul>
                    {attachmentUpload.state !== "idle" ? (
                      <span
                        role={attachmentUpload.state === "error" ? "alert" : "status"}
                        className={cn("text-[9px] font-medium", attachmentUpload.state === "error" ? "text-danger" : "text-tertiary")}
                      >
                        {attachmentUpload.message}
                      </span>
                    ) : null}
                  </section>
                </div>
              ) : null}
            </div>
            <footer className="flex h-[49px] min-h-[49px] shrink-0 items-center justify-start border-t border-[rgba(61,61,61,0.08)] px-4">
              {variantDrawerView === "variant" && activeVariant ? (
                <button
                  type="button"
                  aria-label="Delete variant"
                  onClick={removeActiveVariant}
                  className="grid size-7 place-items-center rounded-[6px] text-danger transition hover:bg-dangerSoft/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-danger"
                >
                  <Trash size={12} weight="regular" aria-hidden="true" />
                </button>
              ) : null}
            </footer>
          </aside>
        </div>
      </Modal>
      <Modal
        open={discardDialogOpen}
        onOpenChange={(nextOpen) => {
          if (draftSavePending) return;
          setDiscardDialogOpen(nextOpen);
        }}
        title="Save component draft?"
        description="This component has unsaved edits. Choose how to handle it before closing."
        tone="default"
        size="md"
        closeLabel="Close save draft dialog"
        closeOnOverlayClick={false}
        closeOnEscape={false}
        contentClassName={cn("rounded-[12px] border-[rgba(61,61,61,0.08)]", OPENDESIGN_MODAL_BG_CLASS, OPENDESIGN_MODAL_SHADOW_CLASS)}
        bodyClassName="space-y-3 bg-white/65 p-4"
        footer={
          <div className="grid w-full min-w-0 gap-2 sm:grid-cols-[minmax(0,1fr)_auto_auto_auto] sm:items-center">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="w-full justify-center sm:w-auto sm:justify-self-start"
              data-dialog-initial-focus
              onClick={() => setDiscardDialogOpen(false)}
              disabled={draftSavePending}
            >
              Keep editing
            </Button>
            <Button type="button" variant="danger" size="sm" className="w-full sm:w-auto" onClick={confirmDiscardDraft} disabled={draftSavePending}>
              Discard draft
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="w-full sm:w-auto"
              onClick={saveDraftAndClose}
              disabled={draftSavePending || imageBusy || attachmentBusy}
            >
              {draftSavePending ? "Saving..." : "Save to drafts"}
            </Button>
            <Button
              type="button"
              variant="brand"
              size="sm"
              className="w-full sm:w-auto"
              onClick={submitFromCloseDialog}
              disabled={isPending || imageBusy || attachmentBusy || draftSavePending}
            >
              Add Component
            </Button>
          </div>
        }
      >
        {draftSaveError ? (
          <div role="alert" className="rounded-[6px] border border-dangerSoft bg-dangerSoft px-2.5 py-2 text-[9.5px] leading-4 tracking-normal text-danger">
            {draftSaveError}
          </div>
        ) : null}
        <div className="rounded-[8px] border border-[rgba(61,61,61,0.08)] bg-white/78 p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.82)]">
          <p className="m-0 text-[11px] font-medium leading-4 tracking-normal text-ink">Keep this component out of the library until it is ready.</p>
          <p className="m-0 mt-1 text-[10px] leading-4 tracking-normal text-secondary">
            Saving a draft preserves the form, catalogue fields, variants, costs, thumbnails, and attachments for later.
          </p>
        </div>
      </Modal>
    </>
  );
}
