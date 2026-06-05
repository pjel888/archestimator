"use client";

import Image from "next/image";
import { useEffect, useId, useMemo, useRef, useState, useTransition } from "react";
import { CaretDown, ImageSquare, Plus, Trash, UploadSimple } from "@phosphor-icons/react/dist/ssr";

import { Button } from "@/components/ui/button";
import {
  CONTROL_INPUT_SURFACE_CLASS,
  ControlField,
  ControlInput,
  ControlTextarea,
} from "@/components/ui/control-input";
import { ControlSelect } from "@/components/ui/control-select";
import { CreatableCombobox, type CreatableComboboxOption } from "@/components/ui/creatable-combobox";
import { Modal } from "@/components/ui/modal";
import {
  createCostLibraryComponent,
  type ComponentLifecycleState,
  type CreateCostLibraryComponentInput,
} from "@/lib/component-library/actions";
import { buildLibraryFolderTree, type LibraryFolderRecord } from "@/lib/component-library/library-folder-reorder";
import { sanitizeComponentSourceUrl } from "@/lib/component-library/source-url";
import { findComponentCategoryPath, type ComponentLibraryTaxonomyNode } from "@/lib/component-library/taxonomy";
import {
  COMPONENT_UNIT_OPTIONS,
  CONTENT_UNIT_OPTIONS,
  DIMENSION_UNIT_OPTIONS,
  getUnitDisplayLabel,
  type ComponentUnitOption,
  unitUsesContentConversion,
} from "@/lib/component-library/unit-options";
import type { EstimateRowItem } from "@/lib/estimates/types";
import type { ComponentLibraryBrand } from "@/lib/repositories/component-library-repository";
import type { Json } from "@/lib/supabase/types";
import { cn } from "@/lib/ui/cn";
import { WorkshopTreeTabs, type WorkshopTreeTabItem } from "../workshop-tree";
import type { ComponentLibrarySupplierOption } from "../component-library/tree/buildLibraryTree";
import {
  isAllComponentsFolderId,
  LibraryFolderTreePicker,
  type ComponentViewMode,
  type CreateLibraryFolderHandler,
  type ReorderStatus,
} from "./LibraryFolderTree";

type VariantDraft = {
  id: string;
  label: string;
  sku: string;
  description: string;
  unitCost: string;
  miscCost: string;
  unit: string;
  packageQuantity: string;
  packageUnit: string;
  dimensionLength: string;
  dimensionWidth: string;
  dimensionHeight: string;
  dimensionUnit: string;
  pricingSource: string;
  pricingDate: string;
  confidence: string;
  sourceUrl: string;
  notes: string;
  isDefault: boolean;
  image: VariantImageDraft | null;
  attachments: VariantAttachmentDraft[];
  costEntries: VariantCostEntryDraft[];
  activeCostEntryId: string;
};

type ComponentDraft = {
  name: string;
  brand: string;
  brandId: string;
  thumbnailPath: string;
  libraryFolderId: string;
  categoryNodeId: string;
  supplierId: string;
  supplierName: string;
  lifecycleState: ComponentLifecycleState;
  effectiveAt: string;
  changeReason: string;
  variants: VariantDraft[];
  sharedImageForAllVariants: boolean;
  sharedImage: VariantImageDraft | null;
};

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
};

type VariantCostEntryDraft = {
  id: string;
  unitCost: string;
  miscCost: string;
  pricingSource: string;
  pricingDate: string;
  confidence: string;
  sourceUrl: string;
  notes: string;
  isCurrent: boolean;
  createdAt?: string;
  updatedAt?: string;
  deletedAt?: string | null;
};

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

type UploadedComponentAttachment = {
  bucket: string;
  path: string;
  fileName: string;
  contentType: string;
  sizeBytes: number;
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
  onOpenChange: (open: boolean) => void;
  onComponentCreated: (item: EstimateRowItem) => void;
  onCreateFolder?: CreateLibraryFolderHandler;
  onRenameFolder?: (folderId: string, currentName: string) => void;
  onDeleteFolder?: (folderId: string, currentName: string) => void;
  reorderStatus?: ReorderStatus;
  treeMutationPending?: boolean;
};

type AddComponentModalTab = "component" | "activity";

const MAX_CLIENT_SOURCE_IMAGE_BYTES = 20 * 1024 * 1024;
const MAX_CLIENT_ATTACHMENT_BYTES = 20 * 1024 * 1024;
const CLIENT_IMAGE_EDGE = 1600;
const CLIENT_IMAGE_QUALITY = 0.82;
const ALLOWED_UPLOAD_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/avif"]);
const ALLOWED_ATTACHMENT_TYPES = new Set([
  "application/pdf",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
]);
const ALLOWED_ATTACHMENT_EXTENSION_PATTERN = /\.(pdf|xls|xlsx)$/i;
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
const ADD_COMPONENT_MODAL_TABS: readonly WorkshopTreeTabItem<AddComponentModalTab>[] = [
  { id: "component", label: "Component" },
  { id: "activity", label: "Activity" },
];
const DEFAULT_VARIANT_LABEL = "Variant 1";
const COMPONENT_UNIT_COMBOBOX_OPTIONS = toUnitComboboxOptions(COMPONENT_UNIT_OPTIONS);
const CONTENT_UNIT_COMBOBOX_OPTIONS = toUnitComboboxOptions(CONTENT_UNIT_OPTIONS);
const DIMENSION_UNIT_COMBOBOX_OPTIONS = toUnitComboboxOptions(DIMENSION_UNIT_OPTIONS);

function toUnitComboboxOptions(options: ComponentUnitOption[]): CreatableComboboxOption[] {
  return options.map((option) => ({
    id: option.value,
    label: option.label,
    description: option.description,
    searchText: option.searchText,
  }));
}

function getSelectedUnitId(value: string, options: CreatableComboboxOption[]): string | null {
  const trimmedValue = value.trim();
  return options.some((option) => option.id === trimmedValue) ? trimmedValue : null;
}

function getUnitComboboxValue(change: { id: string | null; label: string }) {
  return change.id ?? change.label;
}

function getContentConversionCopy(unit: string) {
  const unitLabel = getUnitDisplayLabel(unit) || "unit";
  return {
    visible: unitUsesContentConversion(unit),
    label: `Content / ${unitLabel.toLowerCase()}`,
    quantityAriaLabel: `Content per ${unitLabel.toLowerCase()} quantity`,
    unitAriaLabel: `Content per ${unitLabel.toLowerCase()} unit`,
  };
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

function formatBytes(bytes: number | undefined) {
  if (!bytes || bytes <= 0) return "0 KB";
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
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

async function uploadComponentImage(file: File): Promise<UploadedComponentImage> {
  const formData = new FormData();
  formData.set("file", file);
  const response = await fetch("/api/component-library/images", {
    method: "POST",
    body: formData,
  });
  const result = await response.json().catch(() => null);
  if (!response.ok) {
    const message = result && typeof result.error === "string" ? result.error : "Could not upload image.";
    throw new Error(message);
  }
  return result as UploadedComponentImage;
}

function getImageStoragePaths(image: VariantImageDraft | null | undefined) {
  if (!image) return [];
  return Array.from(new Set([image.path, image.thumbnailStoragePath].filter(Boolean)));
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

function isSameStoredImage(left: VariantImageDraft | null | undefined, right: VariantImageDraft | null | undefined) {
  return Boolean(left && right && (left.path === right.path || left.thumbnailStoragePath === right.thumbnailStoragePath));
}

async function removeComponentImageUpload(image: VariantImageDraft | null | undefined) {
  const paths = getImageStoragePaths(image);
  if (paths.length === 0) return;
  await fetch("/api/component-library/images", {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ paths }),
  }).catch(() => undefined);
}

function getAttachmentStoragePaths(attachment: VariantAttachmentDraft | null | undefined) {
  if (!attachment?.path) return [];
  return [attachment.path];
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

function isImageUploadBusy(state: ImageUploadState["state"]) {
  return state === "processing" || state === "uploading";
}

function hasAllowedAttachmentExtension(name: string) {
  return ALLOWED_ATTACHMENT_EXTENSION_PATTERN.test(name);
}

async function uploadComponentAttachment(file: File): Promise<UploadedComponentAttachment> {
  const formData = new FormData();
  formData.set("file", file);
  const response = await fetch("/api/component-library/attachments", {
    method: "POST",
    body: formData,
  });
  const result = await response.json().catch(() => null);
  if (!response.ok) {
    const message = result && typeof result.error === "string" ? result.error : "Could not upload attachment.";
    throw new Error(message);
  }
  return result as UploadedComponentAttachment;
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

function makeCostEntryDraft(overrides: Partial<VariantCostEntryDraft> = {}): VariantCostEntryDraft {
  const timestamp = new Date().toISOString();
  return {
    id: crypto.randomUUID(),
    unitCost: "",
    miscCost: "0",
    pricingSource: "",
    pricingDate: today(),
    confidence: "medium",
    sourceUrl: "",
    notes: "",
    isCurrent: true,
    createdAt: timestamp,
    updatedAt: timestamp,
    deletedAt: null,
    ...overrides,
  };
}

function makeVariantDraft(index: number, overrides: Partial<VariantDraft> = {}): VariantDraft {
  const costEntry = makeCostEntryDraft();
  return {
    id: crypto.randomUUID(),
    label: index === 1 ? DEFAULT_VARIANT_LABEL : `Variant ${index}`,
    sku: "",
    description: "",
    unitCost: "",
    miscCost: "0",
    unit: "unit",
    packageQuantity: "",
    packageUnit: "",
    dimensionLength: "0",
    dimensionWidth: "0",
    dimensionHeight: "0",
    dimensionUnit: "m",
    pricingSource: "",
    pricingDate: today(),
    confidence: "medium",
    sourceUrl: "",
    notes: "",
    isDefault: index === 1,
    image: null,
    attachments: [],
    costEntries: [costEntry],
    activeCostEntryId: costEntry.id,
    ...overrides,
  };
}

function buildFolderPath(folders: LibraryFolderRecord[], folderId: string | null): string[] {
  if (!folderId) return [];
  const byId = new Map(folders.map((folder) => [folder.id, folder]));
  const path: string[] = [];
  let current = byId.get(folderId);
  const seen = new Set<string>();
  while (current && !seen.has(current.id)) {
    seen.add(current.id);
    path.unshift(current.name);
    current = current.parent_id ? byId.get(current.parent_id) : undefined;
  }
  return path;
}

function resolveFolderCategoryNodeId(folders: LibraryFolderRecord[], folderId: string | null): string {
  if (!folderId) return "";
  const byId = new Map(folders.map((folder) => [folder.id, folder]));
  let current = byId.get(folderId);
  const seen = new Set<string>();
  while (current && !seen.has(current.id)) {
    seen.add(current.id);
    if (current.source_category_node_id) return current.source_category_node_id;
    current = current.parent_id ? byId.get(current.parent_id) : undefined;
  }
  return "";
}

function toComboboxOptions(options: Array<{ id: string; name: string }>): CreatableComboboxOption[] {
  return options.map((option) => ({ id: option.id, label: option.name }));
}

function getInitialNestingViewMode(selectedSupplierId?: string | null, selectedBrandId?: string | null): ComponentViewMode {
  if (selectedSupplierId) return "suppliers";
  if (selectedBrandId) return "brand";
  return "default";
}

function getInitialDraft({
  folders,
  selectedFolderId,
  selectedSupplierId,
  selectedBrandId,
  suppliers,
  brands,
}: {
  folders: LibraryFolderRecord[];
  selectedFolderId: string | null;
  selectedSupplierId?: string | null;
  selectedBrandId?: string | null;
  suppliers: ComponentLibrarySupplierOption[];
  brands: ComponentLibraryBrand[];
}): ComponentDraft {
  const selectedFolder = selectedFolderId && !isAllComponentsFolderId(selectedFolderId)
    ? folders.find((folder) => folder.id === selectedFolderId)
    : undefined;
  const supplier = selectedSupplierId ? suppliers.find((entry) => entry.id === selectedSupplierId) : undefined;
  const brand = selectedBrandId ? brands.find((entry) => entry.id === selectedBrandId) : undefined;
  const categoryNodeId = resolveFolderCategoryNodeId(folders, selectedFolder?.id ?? null);
  return {
    name: "",
    brand: brand?.name ?? "",
    brandId: brand?.id ?? "",
    thumbnailPath: "",
    libraryFolderId: selectedFolder?.id ?? "",
    categoryNodeId,
    supplierId: supplier?.id ?? "",
    supplierName: supplier?.name ?? "",
    lifecycleState: "available",
    effectiveAt: today(),
    changeReason: "Component created from workshop library.",
    variants: [makeVariantDraft(1)],
    sharedImageForAllVariants: false,
    sharedImage: null,
  };
}

function parseMoney(value: string) {
  const normalized = value.replace(/[₱,\s]/g, "").trim();
  if (!normalized) return NaN;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : NaN;
}

function normalizeMoneyInput(value: string) {
  const cleaned = value.replace(/[₱,\s]/g, "").replace(/[^0-9.]/g, "");
  const [whole = "", ...decimalParts] = cleaned.split(".");
  if (decimalParts.length === 0) return whole;
  return `${whole}.${decimalParts.join("")}`;
}

function formatAccountingMoney(value: string) {
  const parsed = parseMoney(value);
  return Number.isFinite(parsed) ? accountingNumberFormatter.format(parsed) : value;
}

const costTimestampFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
  hour: "numeric",
  minute: "2-digit",
});

const costDateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
});

function formatCostTimestamp(entry: VariantCostEntryDraft | undefined) {
  if (!entry) return "No timestamp";
  const timestamp = entry.updatedAt || entry.createdAt;
  if (timestamp) return `Updated ${costTimestampFormatter.format(new Date(timestamp))}`;
  if (entry.pricingDate) return `Effective ${costDateFormatter.format(new Date(`${entry.pricingDate}T00:00:00`))} at 12:00 AM`;
  return "No timestamp";
}

function formatCostEntryLabel(entry: VariantCostEntryDraft | undefined) {
  if (!entry) return "No cost entry selected";
  return `${formatAccountingMoney(entry.unitCost)} / ${entry.pricingDate || "No date"}`;
}

function formatMoneyInputValue(value: string, previousValue = "", nativeEvent?: Event) {
  const normalized = normalizeMoneyInput(value);
  const previousNormalized = normalizeMoneyInput(previousValue);
  const [previousWhole = ""] = previousNormalized.split(".");
  const [, decimalPart = ""] = normalized.split(".");
  const inputEvent = typeof InputEvent !== "undefined" && nativeEvent instanceof InputEvent ? nativeEvent : null;

  if (
    inputEvent?.inputType === "insertText" &&
    inputEvent.data &&
    /^\d$/.test(inputEvent.data) &&
    previousValue === formatAccountingMoney(previousValue) &&
    decimalPart.startsWith("00") &&
    decimalPart.length > 2
  ) {
    return formatAccountingMoney(`${previousWhole}${inputEvent.data}`);
  }

  if (
    inputEvent?.inputType === "deleteContentBackward" &&
    previousValue === formatAccountingMoney(previousValue) &&
    previousWhole.length > 0 &&
    decimalPart.length < 2
  ) {
    return previousWhole.length === 1 ? "" : formatAccountingMoney(previousWhole.slice(0, -1));
  }

  return formatAccountingMoney(normalized);
}

function readOptionalPositiveNumber(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : NaN;
}

function readOptionalNonNegativeNumber(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : NaN;
}

function roundMeasurement(value: number) {
  return Math.round((value + Number.EPSILON) * 1_000_000) / 1_000_000;
}

function formatMeasurement(value: number | null) {
  if (value === null) return "";
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 4 }).format(value);
}

function formatComputedMeasurement(value: number | null, unit: string, exponent: 2 | 3) {
  const formattedValue = formatMeasurement(value);
  return formattedValue ? `${formattedValue} ${unit || "unit"}${exponent}` : "";
}

function getActiveCostEntry(variant: VariantDraft | undefined): VariantCostEntryDraft | undefined {
  if (!variant) return undefined;
  return (
    variant.costEntries.find((entry) => !entry.deletedAt && entry.id === variant.activeCostEntryId)
    ?? variant.costEntries.find((entry) => !entry.deletedAt && entry.isCurrent)
    ?? variant.costEntries.find((entry) => !entry.deletedAt)
  );
}

function getVisibleCostEntries(variant: VariantDraft | undefined): VariantCostEntryDraft[] {
  return variant?.costEntries.filter((entry) => !entry.deletedAt) ?? [];
}

function getVariantImage(draft: ComponentDraft, variant: VariantDraft | undefined): VariantImageDraft | null {
  if (draft.sharedImageForAllVariants) return draft.sharedImage;
  return variant?.image ?? null;
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

function buildComponentMetadata(
  variant: VariantDraft,
  computed: { footprintArea: number | null; packageArea: number | null; volume: number | null },
): Json {
  const measurement: Record<string, Json> = {};
  const usesContentConversion = unitUsesContentConversion(variant.unit);
  const packageQuantity = usesContentConversion ? readOptionalPositiveNumber(variant.packageQuantity) : null;
  const length = readOptionalNonNegativeNumber(variant.dimensionLength);
  const width = readOptionalNonNegativeNumber(variant.dimensionWidth);
  const height = readOptionalNonNegativeNumber(variant.dimensionHeight);

  const packageRecord: Record<string, Json> = {};
  if (packageQuantity !== null && !Number.isNaN(packageQuantity)) packageRecord.quantity = packageQuantity;
  if (usesContentConversion && variant.packageUnit.trim()) packageRecord.unit = variant.packageUnit.trim();
  if (Object.keys(packageRecord).length > 0) measurement.package = packageRecord;

  const dimensionsRecord: Record<string, Json> = {};
  const hasDimensionValue =
    (length !== null && !Number.isNaN(length)) ||
    (width !== null && !Number.isNaN(width)) ||
    (height !== null && !Number.isNaN(height));
  if (length !== null && !Number.isNaN(length)) dimensionsRecord.length = length;
  if (width !== null && !Number.isNaN(width)) dimensionsRecord.width = width;
  if (height !== null && !Number.isNaN(height)) dimensionsRecord.height = height;
  if (hasDimensionValue && variant.dimensionUnit.trim()) dimensionsRecord.unit = variant.dimensionUnit.trim();
  if (computed.footprintArea !== null) dimensionsRecord.footprintArea = computed.footprintArea;
  if (computed.packageArea !== null) dimensionsRecord.packageArea = computed.packageArea;
  if (computed.volume !== null) dimensionsRecord.volume = computed.volume;
  if (Object.keys(dimensionsRecord).length > 0) measurement.dimensions = dimensionsRecord;

  return Object.keys(measurement).length > 0 ? { measurement } : {};
}

function sectionTitleClassName() {
  return "text-[9px] font-medium uppercase tracking-normal text-tertiary";
}

const selectWrapperClassName = "h-8 w-full rounded-xs border border-hairline bg-white px-2 shadow-[inset_0_1px_0_rgba(17,17,17,0.02)]";
const selectClassName = "h-full w-full border-b-0 pr-7 !text-[10px] font-medium";

export function AddComponentModal({
  open,
  folders,
  categoryTree,
  suppliers,
  brands,
  libraryItems,
  selectedFolderId,
  selectedSupplierId,
  selectedBrandId,
  onOpenChange,
  onComponentCreated,
  onCreateFolder,
  onRenameFolder,
  onDeleteFolder,
  reorderStatus,
  treeMutationPending,
}: AddComponentModalProps) {
  const [draft, setDraft] = useState(() => getInitialDraft({ folders, selectedFolderId, selectedSupplierId, selectedBrandId, suppliers, brands }));
  const [variantPreviewUrls, setVariantPreviewUrls] = useState<Record<string, string>>({});
  const [sharedPreviewUrl, setSharedPreviewUrl] = useState("");
  const [imageUpload, setImageUpload] = useState<ImageUploadState>({ state: "idle" });
  const [attachmentUpload, setAttachmentUpload] = useState<ImageUploadState>({ state: "idle" });
  const [costPickerOpen, setCostPickerOpen] = useState(false);
  const [costManagerOpen, setCostManagerOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<AddComponentModalTab>("component");
  const [activeVariantId, setActiveVariantId] = useState("");
  const [nestingViewMode, setNestingViewMode] = useState<ComponentViewMode>(() => getInitialNestingViewMode(selectedSupplierId, selectedBrandId));
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();
  const thumbnailInputId = useId();
  const attachmentInputId = useId();
  const tabsId = useId();
  const initialFocusRef = useRef<HTMLInputElement>(null);
  const dirtyRef = useRef(false);
  const wasOpenRef = useRef(false);
  const variantPreviewUrlsRef = useRef<Record<string, string>>({});
  const sharedPreviewUrlRef = useRef("");
  const costPickerRootRef = useRef<HTMLDivElement>(null);
  const costEditBaselineRef = useRef<{ variantId: string; entry: VariantCostEntryDraft } | null>(null);
  const componentTabPanelId = `${tabsId}-component-panel`;
  const activityTabPanelId = `${tabsId}-activity-panel`;
  const costPickerListboxId = `${tabsId}-cost-picker-listbox`;

  const folderNodes = useMemo(() => buildLibraryFolderTree(folders), [folders]);
  const selectedFolderPath = useMemo(() => buildFolderPath(folders, draft.libraryFolderId || null), [draft.libraryFolderId, folders]);
  const selectedCategoryPath = useMemo(
    () => (draft.categoryNodeId ? findComponentCategoryPath(categoryTree, draft.categoryNodeId) ?? [] : []),
    [categoryTree, draft.categoryNodeId],
  );
  const brandOptions = useMemo(() => toComboboxOptions(brands), [brands]);
  const supplierOptions = useMemo(() => toComboboxOptions(suppliers), [suppliers]);
  const selectedBrand = brands.find((brand) => brand.id === draft.brandId);
  const selectedSupplier = suppliers.find((supplier) => supplier.id === draft.supplierId);
  const defaultVariant = draft.variants.find((variant) => variant.isDefault) ?? draft.variants[0];
  const activeVariant = draft.variants.find((variant) => variant.id === activeVariantId) ?? defaultVariant ?? draft.variants[0];
  const activeCostEntry = getActiveCostEntry(activeVariant);
  const visibleCostEntries = getVisibleCostEntries(activeVariant);
  const activeVariantImage = getVariantImage(draft, activeVariant);
  const activePreviewUrl = draft.sharedImageForAllVariants ? sharedPreviewUrl : (activeVariant ? variantPreviewUrls[activeVariant.id] ?? "" : "");
  const activeImageSrc = activePreviewUrl || activeVariantImage?.thumbnailUrl || activeVariantImage?.url || "";
  const activeImagePath = activeVariantImage?.path || activeVariantImage?.thumbnailStoragePath || "";
  const imageBusy = isImageUploadBusy(imageUpload.state);
  const attachmentBusy = isImageUploadBusy(attachmentUpload.state);
  const lifecycleOption = LIFECYCLE_OPTIONS.find((option) => option.value === draft.lifecycleState) ?? LIFECYCLE_OPTIONS[0];
  const defaultCostEntry = getActiveCostEntry(defaultVariant);
  const defaultCost = defaultCostEntry && Number.isFinite(parseMoney(defaultCostEntry.unitCost))
    ? formatAccountingMoney(defaultCostEntry.unitCost)
    : "0.00";
  const activeContentConversion = getContentConversionCopy(activeVariant?.unit ?? "");
  const computedMeasurements = useMemo(() => {
    const usesContentConversion = unitUsesContentConversion(activeVariant?.unit ?? "");
    const packageQuantity = readOptionalPositiveNumber(activeVariant?.packageQuantity ?? "");
      const length = readOptionalNonNegativeNumber(activeVariant?.dimensionLength ?? "");
      const width = readOptionalNonNegativeNumber(activeVariant?.dimensionWidth ?? "");
      const height = readOptionalNonNegativeNumber(activeVariant?.dimensionHeight ?? "");
      const footprintArea = length !== null && !Number.isNaN(length) && width !== null && !Number.isNaN(width)
        ? roundMeasurement(length * width)
        : null;
      const packageArea = footprintArea !== null
        ? roundMeasurement(footprintArea * (usesContentConversion ? (packageQuantity !== null && !Number.isNaN(packageQuantity) ? packageQuantity : 0) : 1))
        : null;
    const volume = footprintArea !== null && height !== null && !Number.isNaN(height)
      ? roundMeasurement(footprintArea * height)
      : null;
    return { footprintArea, packageArea, volume };
  }, [activeVariant?.dimensionHeight, activeVariant?.dimensionLength, activeVariant?.dimensionWidth, activeVariant?.packageQuantity, activeVariant?.unit]);
  const validation = useMemo(() => {
    const messages: string[] = [];
    if (!draft.name.trim()) messages.push("Name is required.");
    if (!draft.libraryFolderId) messages.push("Library folder is required.");
    if (draft.variants.length === 0) messages.push("At least one variant is required.");
    if (draft.variants.filter((variant) => variant.isDefault).length !== 1) messages.push("Exactly one default variant is required.");
    for (const [index, variant] of draft.variants.entries()) {
      const label = variant.label.trim() || `Variant ${index + 1}`;
      const currentCostEntry = getActiveCostEntry(variant);
      if (!variant.label.trim()) messages.push(`${label} name is required.`);
      if (!variant.unit.trim()) messages.push(`${label} unit is required.`);
      if (!currentCostEntry) messages.push(`${label} needs at least one cost entry.`);
      if (!Number.isFinite(parseMoney(currentCostEntry?.unitCost ?? "")) || parseMoney(currentCostEntry?.unitCost ?? "") < 0) {
        messages.push(`${label} cost must be a non-negative number.`);
      }
      if (variant.costEntries.filter((entry) => !entry.deletedAt && entry.isCurrent).length !== 1) {
        messages.push(`${label} needs exactly one current cost entry.`);
      }
      for (const entry of variant.costEntries.filter((candidate) => !candidate.deletedAt)) {
        if (!Number.isFinite(parseMoney(entry.unitCost)) || parseMoney(entry.unitCost) < 0) {
          messages.push(`${label} cost entry must be a non-negative number.`);
        }
      }
      if (unitUsesContentConversion(variant.unit) && Number.isNaN(readOptionalPositiveNumber(variant.packageQuantity))) {
        messages.push(`${label} content quantity must be a positive number when provided.`);
      }
      if (Number.isNaN(readOptionalNonNegativeNumber(variant.dimensionLength))) messages.push(`${label} length must be a non-negative number when provided.`);
      if (Number.isNaN(readOptionalNonNegativeNumber(variant.dimensionWidth))) messages.push(`${label} width must be a non-negative number when provided.`);
      if (Number.isNaN(readOptionalNonNegativeNumber(variant.dimensionHeight))) messages.push(`${label} height must be a non-negative number when provided.`);
      if (variant.sourceUrl.trim() && !sanitizeComponentSourceUrl(variant.sourceUrl)) {
        messages.push(`${label} source URL must use http, https, or an internal path.`);
      }
      for (const entry of variant.costEntries.filter((candidate) => !candidate.deletedAt)) {
        if (entry.sourceUrl.trim() && !sanitizeComponentSourceUrl(entry.sourceUrl)) {
          messages.push(`${label} cost entry source URL must use http, https, or an internal path.`);
        }
      }
    }
    return messages;
  }, [draft]);

  useEffect(() => {
    if (!open) {
      wasOpenRef.current = false;
      return;
    }
    if (wasOpenRef.current) return;
    wasOpenRef.current = true;
    dirtyRef.current = false;
    const initialDraft = getInitialDraft({ folders, selectedFolderId, selectedSupplierId, selectedBrandId, suppliers, brands });
    setDraft(initialDraft);
    setActiveVariantId(initialDraft.variants[0]?.id ?? "");
    setError("");
    Object.values(variantPreviewUrls).forEach((url) => URL.revokeObjectURL(url));
    if (sharedPreviewUrl) URL.revokeObjectURL(sharedPreviewUrl);
    setVariantPreviewUrls({});
    setSharedPreviewUrl("");
    setImageUpload({ state: "idle" });
    setAttachmentUpload({ state: "idle" });
    setCostPickerOpen(false);
    setCostManagerOpen(false);
    costEditBaselineRef.current = null;
    setActiveTab("component");
    setNestingViewMode(getInitialNestingViewMode(selectedSupplierId, selectedBrandId));
    requestAnimationFrame(() => initialFocusRef.current?.focus());
  }, [brands, folders, open, selectedBrandId, selectedFolderId, selectedSupplierId, sharedPreviewUrl, suppliers, variantPreviewUrls]);

  useEffect(() => {
    variantPreviewUrlsRef.current = variantPreviewUrls;
  }, [variantPreviewUrls]);

  useEffect(() => {
    sharedPreviewUrlRef.current = sharedPreviewUrl;
  }, [sharedPreviewUrl]);

  useEffect(() => () => {
    Object.values(variantPreviewUrlsRef.current).forEach((url) => URL.revokeObjectURL(url));
    if (sharedPreviewUrlRef.current) URL.revokeObjectURL(sharedPreviewUrlRef.current);
  }, []);

  function updateDraft(update: Partial<ComponentDraft>) {
    dirtyRef.current = true;
    setDraft((current) => ({ ...current, ...update }));
    setError("");
  }

  const handleCreateFolder: CreateLibraryFolderHandler | undefined = onCreateFolder
    ? (parentId, options) => {
        onCreateFolder(parentId, {
          placement: options?.placement,
          onCreated: (folder) => {
            options?.onCreated?.(folder);
            const nextFolders = [...folders.filter((entry) => entry.id !== folder.id), folder];
            updateDraft({
              libraryFolderId: folder.id,
              categoryNodeId: resolveFolderCategoryNodeId(nextFolders, folder.id),
            });
          },
        });
      }
    : undefined;

  function updateVariant(variantId: string, update: Partial<VariantDraft>) {
    dirtyRef.current = true;
    setDraft((current) => {
      return {
        ...current,
        variants: current.variants.map((variant) => (
          variant.id === variantId ? { ...variant, ...update } : variant
        )),
      };
    });
    setError("");
  }

  function updateActiveVariant(update: Partial<VariantDraft>) {
    if (!activeVariant) return;
    updateVariant(activeVariant.id, update);
  }

  function updateActiveVariantUnit(unit: string) {
    updateActiveVariant({
      unit,
      ...(unitUsesContentConversion(unit) ? {} : { packageQuantity: "", packageUnit: "" }),
    });
  }

  function addVariant() {
    dirtyRef.current = true;
    const nextVariant = makeVariantDraft(draft.variants.length + 1, {
      unit: defaultVariant?.unit ?? "unit",
      dimensionUnit: defaultVariant?.dimensionUnit ?? "m",
    });
    setDraft((current) => {
      return { ...current, variants: [...current.variants, nextVariant] };
    });
    setActiveVariantId(nextVariant.id);
    setError("");
  }

  function removeActiveVariant() {
    if (!activeVariant || draft.variants.length <= 1) return;
    dirtyRef.current = true;
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
    if (removedImage) void removeComponentImageUpload(removedImage);
    for (const attachment of removedAttachments) {
      void removeComponentAttachmentUpload(attachment);
    }
    setError("");
  }

  function setActiveVariantAsDefault() {
    if (!activeVariant) return;
    dirtyRef.current = true;
    setDraft((current) => ({
      ...current,
      variants: current.variants.map((variant) => ({ ...variant, isDefault: variant.id === activeVariant.id })),
    }));
    setError("");
  }

  function cleanupUploadedDraftAssets() {
    for (const image of collectDraftImages(draft)) {
      void removeComponentImageUpload(image);
    }
    for (const attachment of collectDraftAttachments(draft)) {
      void removeComponentAttachmentUpload(attachment);
    }
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
    if (!dirtyRef.current) {
      onOpenChange(false);
      return;
    }
    if (window.confirm("Discard this component draft?")) {
      cleanupUploadedDraftAssets();
      dirtyRef.current = false;
      onOpenChange(false);
    }
  }

  async function handleThumbnailUpload(file: File) {
    if (!activeVariant) return;
    if (file.type && !ALLOWED_UPLOAD_TYPES.has(file.type)) {
      setImageUpload({ state: "error", message: "Use a JPG, PNG, WebP, or AVIF image." });
      return;
    }
    if (file.size > MAX_CLIENT_SOURCE_IMAGE_BYTES) {
      setImageUpload({ state: "error", message: "Choose an image under 20 MB. Large images are converted before upload." });
      return;
    }

    const previousImage = getVariantImage(draft, activeVariant);
    const localPreviewUrl = URL.createObjectURL(file);
    if (draft.sharedImageForAllVariants) {
      if (sharedPreviewUrl) URL.revokeObjectURL(sharedPreviewUrl);
      setSharedPreviewUrl(localPreviewUrl);
    } else {
      const existingPreviewUrl = variantPreviewUrls[activeVariant.id];
      if (existingPreviewUrl) URL.revokeObjectURL(existingPreviewUrl);
      setVariantPreviewUrls((current) => ({ ...current, [activeVariant.id]: localPreviewUrl }));
    }
    dirtyRef.current = true;
    setError("");
    setImageUpload({ state: "processing", message: "Optimizing image before upload..." });

    try {
      const uploadFile = await resizeImageForUpload(file).catch(() => file);
      setImageUpload({ state: "uploading", message: "Uploading optimized image to Supabase Storage..." });
      const uploadedImage = await uploadComponentImage(uploadFile);
      if (!isUsableUploadResponse(uploadedImage)) throw new Error("Image upload response was incomplete.");
      const imageDraft = toVariantImageDraft(uploadedImage);
      if (draft.sharedImageForAllVariants) {
        updateDraft({ sharedImage: imageDraft, thumbnailPath: imageDraft.thumbnailUrl || imageDraft.url });
      } else {
        updateActiveVariant({ image: imageDraft });
        if (activeVariant.isDefault) updateDraft({ thumbnailPath: imageDraft.thumbnailUrl || imageDraft.url });
      }
      if (previousImage && !isSameStoredImage(previousImage, imageDraft)) {
        void removeComponentImageUpload(previousImage);
      }
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
    if (file.type && !ALLOWED_ATTACHMENT_TYPES.has(file.type) && !hasAllowedAttachmentExtension(file.name)) {
      setAttachmentUpload({ state: "error", message: "Use a PDF, XLS, or XLSX file." });
      return;
    }
    if (file.size > MAX_CLIENT_ATTACHMENT_BYTES) {
      setAttachmentUpload({ state: "error", message: "Choose an attachment under 20 MB." });
      return;
    }

    dirtyRef.current = true;
    setError("");
    setAttachmentUpload({ state: "uploading", message: "Uploading attachment to Supabase Storage..." });

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
          },
        ],
      });
      setAttachmentUpload({ state: "uploaded", message: `Stored ${uploaded.fileName} (${formatBytes(uploaded.sizeBytes)}).` });
    } catch (uploadError) {
      setAttachmentUpload({ state: "error", message: uploadError instanceof Error ? uploadError.message : "Could not upload attachment." });
    }
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

  function removeAttachment(attachmentId: string) {
    if (!activeVariant) return;
    const removedAttachment = activeVariant.attachments.find((attachment) => attachment.id === attachmentId);
    updateActiveVariant({
      attachments: activeVariant.attachments.filter((attachment) => attachment.id !== attachmentId),
    });
    if (removedAttachment) void removeComponentAttachmentUpload(removedAttachment);
  }

  function updateActiveCostEntry(update: Partial<VariantCostEntryDraft>) {
    if (!activeVariant || !activeCostEntry) return;
    const timestamp = new Date().toISOString();
    const updatedEntry = {
      ...activeCostEntry,
      ...update,
      isCurrent: true,
      createdAt: activeCostEntry.createdAt ?? timestamp,
      updatedAt: timestamp,
    };
    updateActiveVariant({
      ...("unitCost" in update ? { unitCost: updatedEntry.unitCost } : {}),
      ...("miscCost" in update ? { miscCost: updatedEntry.miscCost } : {}),
      ...("pricingSource" in update ? { pricingSource: updatedEntry.pricingSource } : {}),
      ...("pricingDate" in update ? { pricingDate: updatedEntry.pricingDate } : {}),
      ...("confidence" in update ? { confidence: updatedEntry.confidence } : {}),
      ...("sourceUrl" in update ? { sourceUrl: updatedEntry.sourceUrl } : {}),
      ...("notes" in update ? { notes: updatedEntry.notes } : {}),
      activeCostEntryId: updatedEntry.id,
      costEntries: activeVariant.costEntries.map((entry) => (
        entry.id === updatedEntry.id ? updatedEntry : { ...entry, isCurrent: false }
      )),
    });
  }

  function addCostEntry() {
    if (!activeVariant) return;
    const sourceEntry = activeCostEntry;
    const nextEntry = makeCostEntryDraft({
      unitCost: sourceEntry?.unitCost || "0.00",
      miscCost: sourceEntry?.miscCost ?? "0",
      pricingSource: sourceEntry?.pricingSource ?? "",
      pricingDate: today(),
      confidence: sourceEntry?.confidence ?? "medium",
      sourceUrl: sourceEntry?.sourceUrl ?? "",
      notes: sourceEntry?.notes ?? "",
      isCurrent: true,
    });
    dirtyRef.current = true;
    setDraft((current) => ({
      ...current,
      variants: current.variants.map((variant) => {
        if (variant.id !== activeVariant.id) return variant;
        return {
          ...variant,
          unitCost: nextEntry.unitCost,
          miscCost: nextEntry.miscCost,
          pricingSource: nextEntry.pricingSource,
          pricingDate: nextEntry.pricingDate,
          confidence: nextEntry.confidence,
          sourceUrl: nextEntry.sourceUrl,
          notes: nextEntry.notes,
          activeCostEntryId: nextEntry.id,
          costEntries: [
            ...variant.costEntries.map((entry) => ({ ...entry, isCurrent: false })),
            nextEntry,
          ],
        };
      }),
    }));
    costEditBaselineRef.current = { variantId: activeVariant.id, entry: { ...nextEntry } };
    setCostPickerOpen(false);
    setError("");
  }

  function beginCostEdit() {
    if (!activeVariant || !activeCostEntry) return;
    const currentBaseline = costEditBaselineRef.current;
    if (currentBaseline?.variantId === activeVariant.id && currentBaseline.entry.id === activeCostEntry.id) return;
    costEditBaselineRef.current = { variantId: activeVariant.id, entry: { ...activeCostEntry } };
  }

  function commitCostInputEntry() {
    if (!activeVariant || !activeCostEntry) return;
    const parsedCost = parseMoney(activeCostEntry.unitCost);
    if (!Number.isFinite(parsedCost) || parsedCost < 0) return;

    const formattedCost = formatAccountingMoney(activeCostEntry.unitCost);
    const baseline = costEditBaselineRef.current;
    const baselineMatches = baseline?.variantId === activeVariant.id && baseline.entry.id === activeCostEntry.id;
    const baselineCost = parseMoney(baseline?.entry.unitCost ?? "");

    if (baselineMatches && Number.isFinite(baselineCost) && baselineCost >= 0 && baselineCost !== parsedCost) {
      const nextEntry = makeCostEntryDraft({
        unitCost: formattedCost,
        miscCost: activeCostEntry.miscCost,
        pricingSource: activeCostEntry.pricingSource,
        pricingDate: today(),
        confidence: activeCostEntry.confidence,
        sourceUrl: activeCostEntry.sourceUrl,
        notes: activeCostEntry.notes,
        isCurrent: true,
      });
      dirtyRef.current = true;
      setDraft((current) => ({
        ...current,
        variants: current.variants.map((variant) => {
          if (variant.id !== activeVariant.id) return variant;
          return {
            ...variant,
            unitCost: nextEntry.unitCost,
            miscCost: nextEntry.miscCost,
            pricingSource: nextEntry.pricingSource,
            pricingDate: nextEntry.pricingDate,
            confidence: nextEntry.confidence,
            sourceUrl: nextEntry.sourceUrl,
            notes: nextEntry.notes,
            activeCostEntryId: nextEntry.id,
            costEntries: [
              ...variant.costEntries.map((entry) => (
                entry.id === activeCostEntry.id ? { ...baseline.entry, isCurrent: false } : { ...entry, isCurrent: false }
              )),
              nextEntry,
            ],
          };
        }),
      }));
      costEditBaselineRef.current = { variantId: activeVariant.id, entry: { ...nextEntry } };
    } else {
      const pricingDate = activeCostEntry.pricingDate || today();
      updateActiveCostEntry({ unitCost: formattedCost, pricingDate });
      costEditBaselineRef.current = {
        variantId: activeVariant.id,
        entry: { ...activeCostEntry, unitCost: formattedCost, pricingDate, isCurrent: true },
      };
    }

    setError("");
  }

  function selectCostEntry(entryId: string) {
    if (!activeVariant) return;
    const entry = activeVariant.costEntries.find((candidate) => candidate.id === entryId && !candidate.deletedAt);
    if (!entry) return;
    updateActiveVariant({
      unitCost: entry.unitCost,
      miscCost: entry.miscCost,
      pricingSource: entry.pricingSource,
      pricingDate: entry.pricingDate,
      confidence: entry.confidence,
      sourceUrl: entry.sourceUrl,
      notes: entry.notes,
      activeCostEntryId: entry.id,
      costEntries: activeVariant.costEntries.map((candidate) => ({ ...candidate, isCurrent: candidate.id === entry.id })),
    });
    costEditBaselineRef.current = { variantId: activeVariant.id, entry: { ...entry, isCurrent: true } };
    setCostPickerOpen(false);
  }

  function deleteCostEntry(entryId: string) {
    if (!activeVariant || visibleCostEntries.length <= 1) return;
    const remainingEntries = activeVariant.costEntries.filter((entry) => !entry.deletedAt && entry.id !== entryId);
    const nextCurrent = activeVariant.activeCostEntryId === entryId ? remainingEntries[0] : getActiveCostEntry(activeVariant);
    updateActiveVariant({
      ...(nextCurrent ? {
        unitCost: nextCurrent.unitCost,
        miscCost: nextCurrent.miscCost,
        pricingSource: nextCurrent.pricingSource,
        pricingDate: nextCurrent.pricingDate,
        confidence: nextCurrent.confidence,
        sourceUrl: nextCurrent.sourceUrl,
        notes: nextCurrent.notes,
        activeCostEntryId: nextCurrent.id,
      } : {}),
      costEntries: activeVariant.costEntries.map((entry) => {
        if (entry.id === entryId) {
          const timestamp = new Date().toISOString();
          return { ...entry, isCurrent: false, deletedAt: timestamp, updatedAt: timestamp };
        }
        return { ...entry, isCurrent: nextCurrent ? entry.id === nextCurrent.id : entry.isCurrent };
      }),
    });
    if (nextCurrent) costEditBaselineRef.current = { variantId: activeVariant.id, entry: { ...nextCurrent, isCurrent: true } };
  }

  function buildOptimisticItem(result: {
    itemId?: string;
    versionNumber?: number;
    activePriceOptionId?: string;
    priceOptions?: Array<{ id: string; label: string; isDefault: boolean }>;
  }): EstimateRowItem {
    const variant = defaultVariant;
    const variantCost = getActiveCostEntry(variant);
    const variantImage = getVariantImage(draft, variant);
    const itemCost = parseMoney(variantCost?.unitCost ?? variant?.unitCost ?? "0");
    const miscCost = parseMoney(variantCost?.miscCost ?? variant?.miscCost ?? "0");
    const supplierName = selectedSupplier?.name ?? draft.supplierName;
    const brandName = selectedBrand?.name ?? draft.brand;
    const category = selectedCategoryPath.at(-1) ?? "General";
    const persistedOptions = result.priceOptions ?? [];
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
      miscCost,
      miscCostDefault: miscCost,
      totalItemCosts: itemCost + miscCost,
      imageUrl: variantImage?.thumbnailUrl || variantImage?.thumbnailPath || draft.thumbnailPath || undefined,
      category,
      categoryNodeId: draft.categoryNodeId || undefined,
      categoryPath: selectedCategoryPath,
      libraryFolderId: draft.libraryFolderId,
      brand: brandName || undefined,
      brandId: draft.brandId || undefined,
      sku: variant?.sku || undefined,
      sourceUrl: variant?.sourceUrl || undefined,
      sourceLibraryItemId: result.itemId,
      componentVersionNumber: result.versionNumber,
      priceOptionId: result.activePriceOptionId,
      priceOptionLabel: variant?.label,
      priceOptions: draft.variants.map((entry, index) => {
        const persistedOption = persistedOptions.find((option) => option.label === entry.label) ?? (entry.isDefault && result.activePriceOptionId
          ? { id: result.activePriceOptionId, label: entry.label, isDefault: true }
          : null);
        const costEntry = getActiveCostEntry(entry);
        const image = getVariantImage(draft, entry);
        return {
          id: persistedOption?.id ?? `optimistic-${entry.id}`,
          label: entry.label,
          sku: entry.sku || null,
          variantDescription: entry.description,
          variantSortOrder: index + 1,
          unit: entry.unit,
          unitCost: parseMoney(costEntry?.unitCost ?? entry.unitCost),
          miscCost: parseMoney(costEntry?.miscCost ?? entry.miscCost),
          currency: "PHP",
          pricingSource: costEntry?.pricingSource ?? entry.pricingSource,
          pricingDate: costEntry?.pricingDate ?? entry.pricingDate,
          confidence: costEntry?.confidence ?? entry.confidence,
          sourceUrl: costEntry?.sourceUrl ?? entry.sourceUrl,
          notes: costEntry?.notes ?? entry.notes,
          supplierId: draft.supplierId || null,
          activeCostEntryId: costEntry?.id,
          costEntries: entry.costEntries.filter((candidate) => !candidate.deletedAt).map((candidate) => ({
            id: candidate.id,
            unitCost: parseMoney(candidate.unitCost),
            miscCost: parseMoney(candidate.miscCost),
            currency: "PHP",
            pricingSource: candidate.pricingSource,
            pricingDate: candidate.pricingDate,
            confidence: candidate.confidence,
            sourceUrl: candidate.sourceUrl,
            notes: candidate.notes,
            isCurrent: candidate.id === costEntry?.id,
          })),
          packageQuantity: unitUsesContentConversion(entry.unit) ? readOptionalPositiveNumber(entry.packageQuantity) : null,
          packageUnit: unitUsesContentConversion(entry.unit) ? entry.packageUnit || null : null,
          dimensionLength: readOptionalPositiveNumber(entry.dimensionLength),
          dimensionWidth: readOptionalPositiveNumber(entry.dimensionWidth),
          dimensionHeight: readOptionalPositiveNumber(entry.dimensionHeight),
          dimensionUnit: entry.dimensionUnit || null,
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
      }),
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
      pricingSource: variantCost?.pricingSource || variant?.pricingSource || supplierName || "Component library",
      pricingDate: variantCost?.pricingDate || variant?.pricingDate || today(),
      confidence: variantCost?.confidence || variant?.confidence || undefined,
      isCustom: true,
    };
  }

  function submit() {
    if (imageBusy || attachmentBusy) {
      setError("Wait for uploads to finish before adding this component.");
      return;
    }
    if (validation.length > 0 || isPending) {
      setError(validation[0] ?? "Please resolve validation errors before adding this component.");
      return;
    }
    const fallbackVariant = defaultVariant ?? draft.variants[0] ?? makeVariantDraft(1);
    const defaultVariantMeasurements = (() => {
      const usesContentConversion = unitUsesContentConversion(fallbackVariant?.unit ?? "");
      const packageQuantity = readOptionalPositiveNumber(fallbackVariant?.packageQuantity ?? "");
      const length = readOptionalPositiveNumber(fallbackVariant?.dimensionLength ?? "");
      const width = readOptionalPositiveNumber(fallbackVariant?.dimensionWidth ?? "");
      const height = readOptionalPositiveNumber(fallbackVariant?.dimensionHeight ?? "");
      const footprintArea = length !== null && !Number.isNaN(length) && width !== null && !Number.isNaN(width)
        ? roundMeasurement(length * width)
        : null;
      const packageArea = footprintArea !== null
        ? roundMeasurement(footprintArea * (usesContentConversion ? (packageQuantity !== null && !Number.isNaN(packageQuantity) ? packageQuantity : 0) : 1))
        : null;
      const volume = footprintArea !== null && height !== null && !Number.isNaN(height)
        ? roundMeasurement(footprintArea * height)
        : null;
      return { footprintArea, packageArea, volume };
    })();
    const defaultVariantImage = getVariantImage(draft, fallbackVariant);
    const defaultThumbnailPath = defaultVariantImage?.thumbnailUrl || defaultVariantImage?.thumbnailPath || null;

    const payload: CreateCostLibraryComponentInput = {
      name: draft.name,
      description: fallbackVariant?.description ?? "",
      category: selectedCategoryPath.at(-1) ?? "General",
      categoryNodeId: draft.categoryNodeId,
      supplier: selectedSupplier?.name ?? draft.supplierName,
      supplierId: draft.supplierId || null,
      brand: (selectedBrand?.name ?? draft.brand) || null,
      brandId: draft.brandId || null,
      unit: fallbackVariant?.unit ?? "unit",
      thumbnailPath: defaultThumbnailPath,
      libraryFolderId: draft.libraryFolderId,
      lifecycleState: draft.lifecycleState,
      effectiveAt: draft.effectiveAt,
      changeReason: draft.changeReason,
      metadata: buildComponentMetadata(fallbackVariant, defaultVariantMeasurements),
      priceOptions: draft.variants.map((variant, index) => {
        const costEntry = getActiveCostEntry(variant);
        const variantImage = getVariantImage(draft, variant);
        return {
          label: variant.label,
          sku: variant.sku || null,
          variantDescription: variant.description,
          variantSortOrder: index + 1,
          unit: variant.unit || fallbackVariant?.unit || "unit",
          unitCost: parseMoney(costEntry?.unitCost ?? variant.unitCost),
          miscCost: parseMoney(costEntry?.miscCost ?? variant.miscCost),
          currency: "PHP",
          pricingSource: costEntry?.pricingSource ?? variant.pricingSource,
          pricingDate: costEntry?.pricingDate ?? variant.pricingDate,
          confidence: costEntry?.confidence ?? variant.confidence,
          sourceUrl: costEntry?.sourceUrl ?? variant.sourceUrl,
          notes: costEntry?.notes ?? variant.notes,
          supplierId: draft.supplierId || null,
          activeCostEntryId: costEntry?.id ?? null,
          costEntries: variant.costEntries.filter((entry) => !entry.deletedAt).map((entry) => ({
            clientId: entry.id,
            unitCost: parseMoney(entry.unitCost),
            miscCost: parseMoney(entry.miscCost),
            currency: "PHP",
            pricingSource: entry.pricingSource,
            pricingDate: entry.pricingDate,
            confidence: entry.confidence,
            sourceUrl: entry.sourceUrl,
            notes: entry.notes,
            isCurrent: entry.id === costEntry?.id,
          })),
          packageQuantity: unitUsesContentConversion(variant.unit) ? readOptionalPositiveNumber(variant.packageQuantity) : null,
          packageUnit: unitUsesContentConversion(variant.unit) ? variant.packageUnit || null : null,
          dimensionLength: readOptionalPositiveNumber(variant.dimensionLength),
          dimensionWidth: readOptionalPositiveNumber(variant.dimensionWidth),
          dimensionHeight: readOptionalPositiveNumber(variant.dimensionHeight),
          dimensionUnit: variant.dimensionUnit || null,
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
          variantMetadata: {},
          isDefault: variant.isDefault,
          isActive: true,
          effectiveAt: draft.effectiveAt,
          changeReason: draft.changeReason,
        };
      }),
    };

    startTransition(async () => {
      setError("");
      try {
        const result = await createCostLibraryComponent(payload);
        onComponentCreated(buildOptimisticItem(result));
        dirtyRef.current = false;
        onOpenChange(false);
      } catch (saveError) {
        setError(saveError instanceof Error ? saveError.message : "Could not save component.");
      }
    });
  }

  return (
    <>
    <Modal
      open={open}
      title="Add Component"
      description="Create a persisted, versioned library component."
      onOpenChange={requestClose}
      className="max-w-7xl"
      bodyClassName="p-0"
      closeLabel="Close add component modal"
    >
      <div className="flex h-[78dvh] min-h-[560px] max-h-[760px] flex-col">
        <div className="shrink-0">
          <WorkshopTreeTabs
            tabs={ADD_COMPONENT_MODAL_TABS}
            activeTab={activeTab}
            ariaLabel="Add component sections"
            onTabChange={setActiveTab}
          />
        </div>

        {activeTab === "component" ? (
          <div
            id={componentTabPanelId}
            role="tabpanel"
            aria-label="Component"
            className="grid min-h-0 flex-1 grid-cols-1 overflow-hidden lg:grid-cols-[408px_minmax(0,1fr)_304px]"
          >
          <aside className="min-h-0 overflow-auto border-b border-hairline bg-white p-3 lg:col-start-1 lg:border-b-0 lg:border-r" aria-label="Component image">
            <div className="flex h-full min-h-0 flex-col gap-2">
              <div className="relative flex aspect-square w-full shrink-0 items-center justify-center overflow-hidden rounded-xs border border-dashed border-divider bg-white text-tertiary">
                {activeImageSrc ? (
                  <Image
                    src={activeImageSrc}
                    alt="Component thumbnail preview"
                    fill
                    sizes="408px"
                    className="object-cover"
                    unoptimized={Boolean(activePreviewUrl || activeImageSrc.startsWith("http"))}
                  />
                ) : (
                  <div className="grid justify-items-center gap-1 px-3 text-center">
                    <ImageSquare size={34} weight="regular" aria-hidden="true" />
                    <span className="text-[10px] font-medium leading-4 text-ink">Thumbnail</span>
                    <span className="max-w-48 text-[9px] font-medium leading-3 text-tertiary">
                      Upload a square reference image for this component.
                    </span>
                  </div>
                )}
              </div>
              <div className="grid gap-1">
                <span className="block min-h-3 truncate text-[9px] font-medium uppercase leading-3 tracking-normal text-tertiary">Upload thumbnail</span>
                <input
                  id={thumbnailInputId}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/avif,.jpg,.jpeg,.png,.webp,.avif"
                  aria-label="Upload thumbnail"
                  disabled={imageBusy}
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    event.currentTarget.value = "";
                    if (!file) return;
                    void handleThumbnailUpload(file);
                  }}
                  className="sr-only"
                />
                <label
                  htmlFor={thumbnailInputId}
                  className="inline-flex min-h-8 cursor-pointer items-center justify-center gap-2 rounded-xs border border-hairline bg-white px-3 text-[10px] font-medium leading-none text-ink transition hover:bg-surfaceMuted focus-within:ring-2 focus-within:ring-focus"
                >
                  <UploadSimple size={12} weight="regular" aria-hidden="true" />
                  Choose image
                </label>
                <label className="flex min-h-6 items-center gap-2 rounded-xs px-1 text-[10px] font-medium normal-case tracking-normal text-ink">
                  <input
                    type="checkbox"
                    aria-label="Use same image for all variants"
                    checked={draft.sharedImageForAllVariants}
                    onChange={(event) => setSharedImageMode(event.target.checked)}
                    className="size-3 rounded-xs border-hairline accent-ink"
                  />
                  <span>Use same image for all variants</span>
                </label>
                {activeImagePath ? (
                  <span className="truncate text-[9px] normal-case leading-3 tracking-normal text-tertiary">{activeImagePath}</span>
                ) : (
                  <span className="text-[9px] normal-case leading-3 tracking-normal text-tertiary">JPG, PNG, WebP, or AVIF. Large files are converted to WebP before storage.</span>
                )}
                {imageUpload.state !== "idle" ? (
                  <span
                    role={imageUpload.state === "error" ? "alert" : "status"}
                    className={cn(
                      "text-[9px] normal-case leading-3 tracking-normal",
                      imageUpload.state === "error" ? "text-danger" : "text-tertiary",
                    )}
                  >
                    {imageUpload.message}
                  </span>
                ) : null}
              </div>
            </div>
          </aside>

          <div className="flex min-h-0 flex-col lg:col-start-2">
            <div className="shrink-0 border-b border-hairline bg-white px-3 py-2" aria-label="Selected nesting path">
              <div className="text-[9px] font-medium uppercase tracking-normal text-tertiary">NEST COMPONENT UNDER</div>
              <div className="mt-1 flex min-w-0 flex-wrap items-center gap-x-1 gap-y-0.5 pl-2 text-[10px] leading-4">
                {selectedFolderPath.length > 0 ? (
                  selectedFolderPath.map((segment, index) => {
                    const selected = index === selectedFolderPath.length - 1;
                    return (
                      <span key={`${segment}-${index}`} className="inline-flex min-w-0 items-center gap-1">
                        {index > 0 ? <span className="font-normal text-tertiary">/</span> : null}
                        <span className={cn("max-w-[20rem] truncate", selected ? "font-medium text-ink" : "font-normal text-tertiary")}>
                          {segment}
                        </span>
                      </span>
                    );
                  })
                ) : (
                  <span className="font-normal text-tertiary">No folder selected</span>
                )}
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-auto p-3">
              <div className="grid gap-3">
              <section className="grid gap-2" aria-label="Component details">
                <div className="grid gap-x-2 gap-y-3 md:grid-cols-2" aria-label="Component information fields">
                  <ControlField label="Name" className="md:col-span-2">
                    <ControlInput
                      ref={initialFocusRef}
                      value={draft.name}
                      onChange={(event) => updateDraft({ name: event.target.value })}
                      invalid={!draft.name.trim()}
                      className={CONTROL_INPUT_SURFACE_CLASS}
                    />
                  </ControlField>
                  <ControlField as="div" label="Brand" className="md:col-span-2">
                    <CreatableCombobox
                      ariaLabel="Brand"
                      value={selectedBrand?.name ?? draft.brand}
                      selectedId={draft.brandId || null}
                      options={brandOptions}
                      placeholder="Search or add brand"
                      emptyLabel="No brands yet"
                      onChange={(change) => {
                        updateDraft({ brandId: change.id ?? "", brand: change.label });
                      }}
                    />
                  </ControlField>
                  <ControlField as="div" label="Supplier" className="md:col-span-2">
                    <CreatableCombobox
                      ariaLabel="Supplier"
                      value={selectedSupplier?.name ?? draft.supplierName}
                      selectedId={draft.supplierId || null}
                      options={supplierOptions}
                      placeholder="Search or add supplier"
                      emptyLabel="No suppliers yet"
                      onChange={(change) => {
                        updateDraft({ supplierId: change.id ?? "", supplierName: change.label });
                      }}
                    />
                  </ControlField>
                  <div className="md:col-span-2 rounded-xs border border-hairline bg-white" aria-label="Component variants">
                    <div className="flex h-[32px] items-end gap-0 border-b border-hairline bg-surfaceMuted" role="tablist" aria-label="Component variants">
                      {draft.variants.map((variant) => (
                        <button
                          key={variant.id}
                          type="button"
                          role="tab"
                          aria-selected={activeVariant?.id === variant.id}
                          className={cn(
                            "relative h-full min-w-0 max-w-32 rounded-xs border border-b-0 px-3 text-[10px] font-medium leading-none transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus",
                            activeVariant?.id === variant.id
                              ? "z-10 -mb-px border-hairline bg-white text-ink"
                              : "border-transparent bg-surfaceMuted text-tertiary hover:border-hairline hover:text-ink",
                          )}
                          onClick={() => setActiveVariantId(variant.id)}
                        >
                          <span className="block truncate">{variant.label || "Variant"}</span>
                        </button>
                      ))}
                      <button
                        type="button"
                        aria-label="Add variant"
                        title="Add variant"
                        onClick={addVariant}
                        className="ml-auto grid size-8 place-items-center border-l border-hairline text-tertiary transition hover:bg-white hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
                      >
                        <Plus size={12} weight="regular" aria-hidden="true" />
                      </button>
                    </div>
                    {activeVariant ? (
                      <div role="tabpanel" aria-label={activeVariant.label || "Variant"} className="grid gap-3 p-3">
                        <div className="grid gap-x-2 gap-y-3 md:grid-cols-[minmax(0,1fr)_8.5rem]">
                          <ControlField label="Variant name">
                            <ControlInput
                              aria-label="Variant name"
                              value={activeVariant.label}
                              onChange={(event) => updateActiveVariant({ label: event.target.value })}
                              invalid={!activeVariant.label.trim()}
                              className={CONTROL_INPUT_SURFACE_CLASS}
                            />
                          </ControlField>
                          <div className="grid w-[8.5rem] grid-cols-[6rem_2rem] items-end gap-1 justify-self-end">
                            <Button
                              type="button"
                              variant="secondary"
                              size="sm"
                              onClick={setActiveVariantAsDefault}
                              disabled={activeVariant.isDefault}
                              className="min-h-8 w-24 px-2 whitespace-nowrap"
                            >
                              {activeVariant.isDefault ? "Default" : "Make default"}
                            </Button>
                            {draft.variants.length > 1 && !activeVariant.isDefault ? (
                              <button
                                type="button"
                                aria-label="Remove active variant"
                                title="Remove active variant"
                                onClick={removeActiveVariant}
                                className="grid size-8 shrink-0 place-items-center rounded-xs border border-hairline text-tertiary transition hover:bg-surfaceMuted hover:text-danger focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
                              >
                                <Trash size={12} weight="regular" aria-hidden="true" />
                              </button>
                            ) : (
                              <span aria-hidden="true" className="size-8" />
                            )}
                          </div>
                          <ControlField label="SKU / Reference">
                            <ControlInput
                              value={activeVariant.sku}
                              onChange={(event) => updateActiveVariant({ sku: event.target.value })}
                              className={CONTROL_INPUT_SURFACE_CLASS}
                            />
                          </ControlField>
                          <ControlField as="div" label="Cost" className="md:col-span-2">
                            <div ref={costPickerRootRef} className="relative grid gap-1">
                              <div className="flex min-h-8 items-center justify-between gap-2 rounded-xs border border-hairline bg-surfaceMuted/60 px-2 py-1">
                                <div className="min-w-0">
                                  <div className="truncate text-[10px] font-medium leading-4 text-ink">Cost baseline</div>
                                  <div className="truncate text-[9px] font-medium leading-3 text-tertiary">{formatCostTimestamp(activeCostEntry)}</div>
                                </div>
                                <Button
                                  type="button"
                                  variant="secondary"
                                  size="sm"
                                  aria-label="Open cost manager"
                                  onClick={() => {
                                    beginCostEdit();
                                    commitCostInputEntry();
                                    setCostPickerOpen(false);
                                    setCostManagerOpen(true);
                                  }}
                                  className="h-7 shrink-0 px-2"
                                >
                                  Manage
                                </Button>
                              </div>
                              <div className="grid grid-cols-[minmax(0,1fr)_32px] gap-1">
                                <ControlInput
                                  aria-label="Cost"
                                  role="combobox"
                                  aria-expanded={costPickerOpen}
                                  aria-controls={costPickerListboxId}
                                  inputMode="decimal"
                                  value={activeCostEntry?.unitCost ?? ""}
                                  onFocus={() => {
                                    beginCostEdit();
                                  }}
                                  onClick={() => {
                                    beginCostEdit();
                                  }}
                                  onBlur={(event) => {
                                    commitCostInputEntry();
                                    const nextTarget = event.relatedTarget as Node | null;
                                    if (!nextTarget || !costPickerRootRef.current?.contains(nextTarget)) {
                                      setCostPickerOpen(false);
                                    }
                                  }}
                                  onChange={(event) => {
                                    updateActiveCostEntry({
                                      unitCost: formatMoneyInputValue(event.target.value, activeCostEntry?.unitCost ?? "", event.nativeEvent),
                                    });
                                    setCostPickerOpen(false);
                                  }}
                                  onKeyDown={(event) => {
                                    if (event.key === "Enter") {
                                      event.preventDefault();
                                      commitCostInputEntry();
                                      setCostPickerOpen(false);
                                    }
                                  }}
                                  invalid={!Number.isFinite(parseMoney(activeCostEntry?.unitCost ?? "")) || parseMoney(activeCostEntry?.unitCost ?? "") < 0}
                                  className={cn(CONTROL_INPUT_SURFACE_CLASS, "text-right tabular-nums")}
                                  placeholder="0.00"
                                />
                                <button
                                  type="button"
                                  aria-label="Open cost entries"
                                  title="Open cost entries"
                                  aria-expanded={costPickerOpen}
                                  aria-controls={costPickerListboxId}
                                  onMouseDown={(event) => event.preventDefault()}
                                  onClick={() => {
                                    beginCostEdit();
                                    commitCostInputEntry();
                                    setCostPickerOpen((current) => !current);
                                  }}
                                  className="grid size-8 place-items-center rounded-xs border border-hairline bg-white text-tertiary transition hover:bg-surfaceMuted hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
                                >
                                  <CaretDown size={12} weight="regular" aria-hidden="true" />
                                </button>
                              </div>
                              {costPickerOpen ? (
                                <div className="absolute left-0 right-0 top-[38px] z-30 grid gap-1 rounded-xs border border-hairline bg-white p-1 shadow-lg">
                                  <div
                                    id={costPickerListboxId}
                                    role="listbox"
                                    aria-label="Cost entries"
                                    className="grid gap-1"
                                  >
                                    {visibleCostEntries.map((entry) => (
                                      <div key={entry.id} className="grid grid-cols-[minmax(0,1fr)_28px] gap-1">
                                        <button
                                          type="button"
                                          role="option"
                                          aria-selected={entry.id === activeCostEntry?.id}
                                          onClick={() => selectCostEntry(entry.id)}
                                          className={cn(
                                            "grid min-h-8 grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-xs px-2 text-left text-[10px] font-medium text-ink transition hover:bg-surfaceMuted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus",
                                            entry.id === activeCostEntry?.id ? "bg-accentSoft" : "bg-white",
                                          )}
                                        >
                                          <span className="truncate text-tertiary">{entry.pricingDate || "No date"}</span>
                                          <span className="justify-self-end tabular-nums">{formatAccountingMoney(entry.unitCost)}</span>
                                        </button>
                                        <button
                                          type="button"
                                          aria-label={`Delete cost entry ${entry.pricingDate || "No date"} ${formatAccountingMoney(entry.unitCost)}`}
                                          title="Delete cost entry"
                                          disabled={visibleCostEntries.length <= 1}
                                          onClick={() => deleteCostEntry(entry.id)}
                                          className="grid size-7 place-items-center rounded-xs border border-transparent text-tertiary transition hover:border-hairline hover:bg-dangerSoft/30 hover:text-danger focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus disabled:cursor-not-allowed disabled:opacity-40"
                                        >
                                          <Trash size={11} weight="regular" aria-hidden="true" />
                                        </button>
                                      </div>
                                    ))}
                                  </div>
                                  {activeCostEntry ? (
                                    <label className="grid grid-cols-[minmax(0,1fr)_7.5rem] items-center gap-2 border-t border-hairline px-2 pt-1">
                                      <span className="text-[9px] font-medium uppercase leading-3 tracking-normal text-tertiary">Date</span>
                                      <ControlInput
                                        aria-label="Selected cost date"
                                        type="date"
                                        value={activeCostEntry.pricingDate || today()}
                                        onChange={(event) => updateActiveCostEntry({ pricingDate: event.target.value })}
                                        className={cn(CONTROL_INPUT_SURFACE_CLASS, "h-7")}
                                      />
                                    </label>
                                  ) : null}
                                </div>
                              ) : null}
                            </div>
                          </ControlField>
                          <div
                            className={cn(
                              "grid min-w-0 gap-x-2 gap-y-3 md:col-span-2",
                              activeContentConversion.visible
                                ? "md:grid-cols-[minmax(0,0.8fr)_minmax(18rem,1.2fr)]"
                                : "md:grid-cols-1",
                            )}
                          >
                            <ControlField as="div" label="Unit" reserveHelperSpace>
                              <CreatableCombobox
                                ariaLabel="Unit"
                                value={activeVariant.unit}
                                selectedId={getSelectedUnitId(activeVariant.unit, COMPONENT_UNIT_COMBOBOX_OPTIONS)}
                                options={COMPONENT_UNIT_COMBOBOX_OPTIONS}
                                placeholder="Search or add unit"
                                emptyLabel="No units found"
                                createLabel={(value) => `Add unit "${value}"`}
                                onChange={(change) => updateActiveVariantUnit(getUnitComboboxValue(change))}
                                invalid={!activeVariant.unit.trim()}
                                preferSelectionOnEnter
                                suppressCreateWhenSearchMatches
                                optionPresentation="unit"
                              />
                            </ControlField>
                            {activeContentConversion.visible ? (
                              <ControlField as="div" label={activeContentConversion.label} reserveHelperSpace>
                                <div className="grid min-w-0 grid-cols-[5.5rem_minmax(22ch,1fr)] gap-1">
                                  <ControlInput
                                    aria-label={activeContentConversion.quantityAriaLabel}
                                    inputMode="decimal"
                                    value={activeVariant.packageQuantity}
                                    onChange={(event) => updateActiveVariant({ packageQuantity: event.target.value })}
                                    invalid={Number.isNaN(readOptionalPositiveNumber(activeVariant.packageQuantity))}
                                    className={CONTROL_INPUT_SURFACE_CLASS}
                                    placeholder="12"
                                  />
                                  <CreatableCombobox
                                    ariaLabel={activeContentConversion.unitAriaLabel}
                                    value={activeVariant.packageUnit}
                                    selectedId={getSelectedUnitId(activeVariant.packageUnit, CONTENT_UNIT_COMBOBOX_OPTIONS)}
                                    options={CONTENT_UNIT_COMBOBOX_OPTIONS}
                                    placeholder="unit"
                                    emptyLabel="No content units found"
                                    createLabel={(value) => `Add unit "${value}"`}
                                    inputClassName="min-w-[22ch]"
                                    onChange={(change) => updateActiveVariant({ packageUnit: getUnitComboboxValue(change) })}
                                    preferSelectionOnEnter
                                    suppressCreateWhenSearchMatches
                                    optionPresentation="unit"
                                  />
                                </div>
                              </ControlField>
                            ) : null}
                          </div>
                          <div className="md:col-span-2 rounded-xs border border-hairline bg-white p-3" aria-label="Component measurements">
                            <div className={sectionTitleClassName()}>Measurements</div>
                            <div className="mt-2 grid gap-x-2 gap-y-3 md:grid-cols-4">
                              <ControlField label="Length">
                                <ControlInput
                                  aria-label="Length"
                                  inputMode="decimal"
                                  value={activeVariant.dimensionLength}
	                                  onChange={(event) => updateActiveVariant({ dimensionLength: event.target.value })}
	                                  invalid={Number.isNaN(readOptionalNonNegativeNumber(activeVariant.dimensionLength))}
	                                  className={CONTROL_INPUT_SURFACE_CLASS}
	                                  placeholder="0"
	                                />
                              </ControlField>
                              <ControlField label="Width">
                                <ControlInput
                                  aria-label="Width"
                                  inputMode="decimal"
                                  value={activeVariant.dimensionWidth}
	                                  onChange={(event) => updateActiveVariant({ dimensionWidth: event.target.value })}
	                                  invalid={Number.isNaN(readOptionalNonNegativeNumber(activeVariant.dimensionWidth))}
	                                  className={CONTROL_INPUT_SURFACE_CLASS}
	                                  placeholder="0"
	                                />
                              </ControlField>
                              <ControlField label="Height">
                                <ControlInput
                                  aria-label="Height"
                                  inputMode="decimal"
                                  value={activeVariant.dimensionHeight}
	                                  onChange={(event) => updateActiveVariant({ dimensionHeight: event.target.value })}
	                                  invalid={Number.isNaN(readOptionalNonNegativeNumber(activeVariant.dimensionHeight))}
	                                  className={CONTROL_INPUT_SURFACE_CLASS}
	                                  placeholder="0"
	                                />
                              </ControlField>
                              <ControlField as="div" label="Dimension unit">
                                <CreatableCombobox
                                  ariaLabel="Dimension unit"
                                  value={activeVariant.dimensionUnit}
                                  selectedId={getSelectedUnitId(activeVariant.dimensionUnit, DIMENSION_UNIT_COMBOBOX_OPTIONS)}
                                  options={DIMENSION_UNIT_COMBOBOX_OPTIONS}
                                  placeholder="m"
                                  emptyLabel="No dimension units found"
                                  createLabel={(value) => `Add unit "${value}"`}
                                  onChange={(change) => updateActiveVariant({ dimensionUnit: getUnitComboboxValue(change) })}
                                  preferSelectionOnEnter
                                  suppressCreateWhenSearchMatches
                                  optionPresentation="unit"
                                  dropdownPlacement="top"
                                />
                              </ControlField>
                              <ControlField label="Area / item">
                                <ControlInput
                                  aria-label="Computed footprint area"
                                  disabled
                                  readOnly
                                  value={formatComputedMeasurement(computedMeasurements.footprintArea, activeVariant.dimensionUnit, 2)}
                                  className={cn(
                                    CONTROL_INPUT_SURFACE_CLASS,
                                    "bg-surfaceMuted text-tertiary opacity-100 hover:border-hairline disabled:bg-surfaceMuted disabled:text-tertiary disabled:opacity-100",
                                  )}
                                />
                              </ControlField>
                              <ControlField label="Area / unit">
                                <ControlInput
                                  aria-label="Computed package area"
                                  disabled
                                  readOnly
                                  value={formatComputedMeasurement(computedMeasurements.packageArea, activeVariant.dimensionUnit, 2)}
                                  className={cn(
                                    CONTROL_INPUT_SURFACE_CLASS,
                                    "bg-surfaceMuted text-tertiary opacity-100 hover:border-hairline disabled:bg-surfaceMuted disabled:text-tertiary disabled:opacity-100",
                                  )}
                                />
                              </ControlField>
                              <ControlField label="Volume">
                                <ControlInput
                                  aria-label="Computed volume"
                                  disabled
                                  readOnly
                                  value={formatComputedMeasurement(computedMeasurements.volume, activeVariant.dimensionUnit, 3)}
                                  className={cn(
                                    CONTROL_INPUT_SURFACE_CLASS,
                                    "bg-surfaceMuted text-tertiary opacity-100 hover:border-hairline disabled:bg-surfaceMuted disabled:text-tertiary disabled:opacity-100",
                                  )}
                                />
                              </ControlField>
                              <div aria-hidden="true" className="hidden md:block" />
                            </div>
                          </div>
                          <ControlField label="Description" className="md:col-span-2">
                            <ControlTextarea
                              value={activeVariant.description}
                              onChange={(event) => updateActiveVariant({ description: event.target.value })}
                              className="min-h-16"
                            />
                          </ControlField>
                          <div className="md:col-span-2 rounded-xs border border-hairline bg-white p-3" aria-label="Variant attachments">
                            <div className="flex items-center justify-between gap-2">
                              <div className={sectionTitleClassName()}>Attachments</div>
                              <input
                                id={attachmentInputId}
                                type="file"
                                accept="application/pdf,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                                aria-label="Upload attachment"
                                disabled={attachmentUpload.state === "uploading"}
                                onChange={(event) => {
                                  const file = event.target.files?.[0];
                                  event.currentTarget.value = "";
                                  if (!file) return;
                                  void handleAttachmentUpload(file);
                                }}
                                className="sr-only"
                              />
                              <label
                                htmlFor={attachmentInputId}
                                className="inline-flex min-h-7 cursor-pointer items-center justify-center gap-2 rounded-xs border border-hairline bg-white px-2 text-[10px] font-medium leading-none text-ink transition hover:bg-surfaceMuted focus-within:ring-2 focus-within:ring-focus"
                              >
                                <UploadSimple size={11} weight="regular" aria-hidden="true" />
                                Attach file
                              </label>
                            </div>
                            <div role="list" className="mt-2 grid gap-1">
                              {activeVariant.attachments.length > 0 ? activeVariant.attachments.map((attachment) => (
                                <div
                                  key={attachment.id}
                                  role="listitem"
                                  className="grid min-h-8 grid-cols-[minmax(0,1fr)_auto_28px] items-center gap-2 rounded-xs border border-hairline bg-surfaceMuted px-2"
                                >
                                  <span className="truncate text-[10px] font-medium text-ink">{attachment.fileName}</span>
                                  <span className="shrink-0 text-[9px] font-medium text-tertiary">{formatBytes(attachment.sizeBytes)}</span>
                                  <button
                                    type="button"
                                    aria-label={`Remove attachment ${attachment.fileName}`}
                                    title="Remove attachment"
                                    onClick={() => removeAttachment(attachment.id)}
                                    className="grid size-7 place-items-center rounded-xs text-tertiary transition hover:bg-dangerSoft/30 hover:text-danger focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
                                  >
                                    <Trash size={11} weight="regular" aria-hidden="true" />
                                  </button>
                                </div>
                              )) : (
                                <div className="rounded-xs border border-dashed border-hairline bg-surfaceMuted px-2 py-2 text-[10px] font-medium text-tertiary">
                                  No attachments
                                </div>
                              )}
                            </div>
                            {attachmentUpload.state !== "idle" ? (
                              <span
                                role={attachmentUpload.state === "error" ? "alert" : "status"}
                                className={cn(
                                  "mt-1 block text-[9px] normal-case leading-3 tracking-normal",
                                  attachmentUpload.state === "error" ? "text-danger" : "text-tertiary",
                                )}
                              >
                                {attachmentUpload.message}
                              </span>
                            ) : null}
                          </div>
                        </div>
                      </div>
                    ) : null}
                  </div>
                </div>
              </section>

              </div>
            </div>
          </div>

          <aside className="flex min-h-0 flex-col border-t border-hairline bg-white lg:col-start-3 lg:border-l lg:border-t-0" aria-label="Component nesting">
            <div className="min-h-0 flex-1">
              <LibraryFolderTreePicker
                folders={folders}
                nodes={folderNodes}
                libraryItems={libraryItems}
                selectedFolderId={draft.libraryFolderId}
                viewMode={nestingViewMode}
                onViewModeChange={setNestingViewMode}
                suppliers={suppliers}
                selectedSupplierId={draft.supplierId || null}
                selectedSupplierName={draft.supplierName || null}
                brands={brands}
                selectedBrandId={draft.brandId || null}
                selectedBrandName={draft.brand || null}
                onSelectFolder={(folderId) => {
                  updateDraft({
                    libraryFolderId: folderId,
                    categoryNodeId: resolveFolderCategoryNodeId(folders, folderId),
                  });
                }}
                onSelectSupplier={(supplierId, supplierName) => {
                  const supplier = supplierId ? suppliers.find((entry) => entry.id === supplierId) : null;
                  updateDraft({ supplierId: supplierId ?? "", supplierName: supplierName ?? supplier?.name ?? "" });
                  setNestingViewMode("suppliers");
                }}
                onSelectBrand={(brandId, brandName) => {
                  const brand = brandId ? brands.find((entry) => entry.id === brandId) : null;
                  updateDraft({ brandId: brandId ?? "", brand: brandName ?? brand?.name ?? "" });
                  setNestingViewMode("brand");
                }}
                onCreateFolder={handleCreateFolder}
                onRenameFolder={onRenameFolder}
                onDeleteFolder={onDeleteFolder}
                reorderStatus={reorderStatus}
                treeMutationPending={treeMutationPending}
              />
            </div>
          </aside>
          </div>
        ) : (
          <div
            id={activityTabPanelId}
            role="tabpanel"
            aria-label="Activity"
            className="min-h-0 flex-1 overflow-auto bg-surfaceMuted p-3"
          >
            <div className="mx-auto grid w-full max-w-5xl gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
              <section className="grid gap-3 rounded-xs border border-hairline bg-white p-3" aria-label="Component lifecycle">
                <div className={sectionTitleClassName()}>Lifecycle</div>
                <div className="grid gap-3 md:grid-cols-2">
                  <ControlField label="Component state">
                    <ControlSelect
                      value={draft.lifecycleState}
                      onChange={(event) => updateDraft({ lifecycleState: event.target.value as ComponentLifecycleState })}
                      wrapperClassName={selectWrapperClassName}
                      className={selectClassName}
                    >
                      {LIFECYCLE_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>{option.label}</option>
                      ))}
                    </ControlSelect>
                  </ControlField>
                  <ControlField label="Effective date">
                    <ControlInput
                      type="date"
                      value={draft.effectiveAt}
                      onChange={(event) => updateDraft({ effectiveAt: event.target.value })}
                      className={CONTROL_INPUT_SURFACE_CLASS}
                    />
                  </ControlField>
                  <ControlField label="Change note" className="md:col-span-2">
                    <ControlTextarea
                      value={draft.changeReason}
                      onChange={(event) => updateDraft({ changeReason: event.target.value })}
                      className="min-h-24"
                    />
                  </ControlField>
                </div>
              </section>

              <section className="grid gap-3 rounded-xs border border-hairline bg-white p-3" aria-label="Activity history">
                <div className={sectionTitleClassName()}>Activity history</div>
                <div role="list" className="grid gap-2">
                  <div role="listitem" className="rounded-xs border border-hairline bg-surfaceMuted px-2 py-2">
                    <div className="flex min-w-0 items-center justify-between gap-2">
                      <span className="truncate text-[10px] font-medium text-ink">Component created</span>
                      <span className="shrink-0 text-[9px] font-normal text-tertiary">{draft.effectiveAt}</span>
                    </div>
                    <div className="mt-1 truncate text-[10px] font-normal text-tertiary">{draft.name.trim() || "Unnamed component"}</div>
                    <div className="mt-1 text-[10px] font-normal leading-4 text-tertiary">{draft.changeReason}</div>
                  </div>
                  <div role="listitem" className="rounded-xs border border-hairline bg-surfaceMuted px-2 py-2">
                    <div className="flex min-w-0 items-center justify-between gap-2">
                      <span className="truncate text-[10px] font-medium text-ink">Lifecycle state</span>
                      <span className="shrink-0 text-[9px] font-normal text-tertiary">{lifecycleOption.label}</span>
                    </div>
                    <div className="mt-1 text-[10px] font-normal leading-4 text-tertiary">{draft.effectiveAt}</div>
                  </div>
                  <div role="listitem" className="rounded-xs border border-hairline bg-surfaceMuted px-2 py-2">
                    <div className="flex min-w-0 items-center justify-between gap-2">
                      <span className="truncate text-[10px] font-medium text-ink">Cost baseline</span>
                      <span className="shrink-0 text-[9px] font-normal text-tertiary">{defaultCost}</span>
                    </div>
                    <div className="mt-1 truncate text-[10px] font-normal text-tertiary">
                      {defaultVariant?.label ?? "Variant 1"} / {defaultVariant?.unit || "unit"}
                    </div>
                  </div>
                </div>
              </section>
            </div>
          </div>
        )}

        <div className="sticky bottom-0 z-10 flex min-h-11 items-center justify-end gap-2 border-t border-hairline bg-white px-3 py-2">
          {error ? (
            <div className="mr-auto min-w-0 text-[9px] font-medium leading-4 text-danger" aria-live="polite">
              {error}
            </div>
          ) : null}
          <Button type="button" onClick={submit} variant="primary" size="sm" disabled={isPending || imageBusy || attachmentBusy || validation.length > 0}>
            {isPending ? "Adding..." : imageBusy || attachmentBusy ? "Uploading..." : "Add Component"}
          </Button>
        </div>
      </div>
    </Modal>
    <Modal
      open={costManagerOpen}
      title="Cost Manager"
      description={`${activeVariant?.label ?? "Variant 1"} cost data`}
      onOpenChange={setCostManagerOpen}
      closeLabel="Close cost manager"
      className="max-w-3xl"
      bodyClassName="p-0"
    >
      <div className="grid max-h-[min(720px,calc(100dvh-96px))] min-h-[520px] grid-cols-1 overflow-hidden lg:grid-cols-[280px_minmax(0,1fr)]">
        <section className="min-h-0 border-b border-hairline bg-surfaceMuted/60 lg:border-b-0 lg:border-r" aria-label="All cost entries">
          <div className="flex min-h-10 items-center justify-between gap-2 border-b border-hairline bg-white px-3 py-2">
            <div className="min-w-0">
              <div className="truncate text-[10px] font-medium leading-4 text-ink">All cost entries</div>
              <div className="truncate text-[9px] font-medium leading-3 text-tertiary">{visibleCostEntries.length} records</div>
            </div>
            <Button type="button" variant="secondary" size="sm" onClick={addCostEntry} className="h-7 shrink-0 px-2">
              <Plus size={11} weight="regular" aria-hidden="true" />
              Add cost entry
            </Button>
          </div>
          <div role="listbox" aria-label="Cost manager entries" className="grid max-h-[220px] gap-1 overflow-auto p-2 lg:max-h-none">
            {visibleCostEntries.map((entry) => (
              <div key={entry.id} className="grid grid-cols-[minmax(0,1fr)_28px] gap-1">
                <button
                  type="button"
                  role="option"
                  aria-selected={entry.id === activeCostEntry?.id}
                  aria-label={`${entry.isCurrent ? "Current " : ""}${formatCostEntryLabel(entry)}`}
                  onClick={() => selectCostEntry(entry.id)}
                  className={cn(
                    "grid min-h-[54px] min-w-0 rounded-xs border px-2 py-1.5 text-left transition hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus",
                    entry.id === activeCostEntry?.id ? "border-accent bg-accentSoft" : "border-hairline bg-white",
                  )}
                >
                  <span className="flex min-w-0 items-center justify-between gap-2">
                    <span className="truncate text-[10px] font-medium tabular-nums text-ink">{formatAccountingMoney(entry.unitCost)}</span>
                    {entry.isCurrent ? <span className="shrink-0 rounded-xs bg-white px-1 text-[8px] font-medium uppercase leading-4 text-tertiary">Current</span> : null}
                  </span>
                  <span className="mt-0.5 truncate text-[9px] font-medium leading-3 text-tertiary">{formatCostTimestamp(entry)}</span>
                  <span className="mt-0.5 truncate text-[9px] font-normal leading-3 text-tertiary">{entry.pricingSource || "No source"}</span>
                </button>
                <button
                  type="button"
                  aria-label={`Delete cost entry ${formatCostEntryLabel(entry)}`}
                  title="Delete cost entry"
                  disabled={visibleCostEntries.length <= 1}
                  onClick={() => deleteCostEntry(entry.id)}
                  className="grid size-7 place-items-center self-start rounded-xs border border-transparent text-tertiary transition hover:border-hairline hover:bg-dangerSoft/30 hover:text-danger focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <Trash size={11} weight="regular" aria-hidden="true" />
                </button>
              </div>
            ))}
          </div>
        </section>
        <section className="min-h-0 overflow-auto bg-white p-3" aria-label="Current cost entry">
          <div className="mb-3 rounded-xs border border-hairline bg-surfaceMuted px-3 py-2">
            <div className="flex min-w-0 items-center justify-between gap-2">
              <div className="min-w-0">
                <div className="truncate text-[10px] font-medium leading-4 text-ink">Current entry</div>
                <div className="truncate text-[9px] font-medium leading-3 text-tertiary">{formatCostTimestamp(activeCostEntry)}</div>
              </div>
              <div className="shrink-0 text-right">
                <div className="text-[9px] font-medium leading-4 tabular-nums text-ink">{formatAccountingMoney(activeCostEntry?.unitCost ?? "0")}</div>
                <div className="text-[9px] font-medium leading-3 text-tertiary">PHP</div>
              </div>
            </div>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <ControlField label="Unit cost">
              <ControlInput
                aria-label="Cost manager unit cost"
                inputMode="decimal"
                value={activeCostEntry?.unitCost ?? ""}
                onFocus={beginCostEdit}
                onBlur={commitCostInputEntry}
                onChange={(event) => updateActiveCostEntry({ unitCost: formatMoneyInputValue(event.target.value, activeCostEntry?.unitCost ?? "", event.nativeEvent) })}
                invalid={!Number.isFinite(parseMoney(activeCostEntry?.unitCost ?? "")) || parseMoney(activeCostEntry?.unitCost ?? "") < 0}
                className={cn(CONTROL_INPUT_SURFACE_CLASS, "text-right tabular-nums")}
                placeholder="0.00"
              />
            </ControlField>
            <ControlField label="Misc cost">
              <ControlInput
                aria-label="Cost manager misc cost"
                inputMode="decimal"
                value={activeCostEntry?.miscCost ?? "0"}
                onChange={(event) => updateActiveCostEntry({ miscCost: formatMoneyInputValue(event.target.value, activeCostEntry?.miscCost ?? "", event.nativeEvent) })}
                invalid={!Number.isFinite(parseMoney(activeCostEntry?.miscCost ?? "")) || parseMoney(activeCostEntry?.miscCost ?? "") < 0}
                className={cn(CONTROL_INPUT_SURFACE_CLASS, "text-right tabular-nums")}
                placeholder="0.00"
              />
            </ControlField>
            <ControlField label="Date">
              <ControlInput
                aria-label="Cost manager pricing date"
                type="date"
                value={activeCostEntry?.pricingDate || today()}
                onChange={(event) => updateActiveCostEntry({ pricingDate: event.target.value })}
                className={CONTROL_INPUT_SURFACE_CLASS}
              />
            </ControlField>
            <ControlField as="label" label="Confidence">
              <ControlSelect
                aria-label="Cost manager confidence"
                value={activeCostEntry?.confidence || "medium"}
                onChange={(event) => updateActiveCostEntry({ confidence: event.target.value })}
                wrapperClassName="h-8 rounded-xs border border-hairline bg-white px-2"
                className="h-full w-full border-0 pr-6 text-[10px]"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </ControlSelect>
            </ControlField>
            <ControlField label="Pricing source" className="md:col-span-2">
              <ControlInput
                aria-label="Cost manager pricing source"
                value={activeCostEntry?.pricingSource ?? ""}
                onChange={(event) => updateActiveCostEntry({ pricingSource: event.target.value })}
                className={CONTROL_INPUT_SURFACE_CLASS}
                placeholder="Supplier quote, retail catalog, or allowance"
              />
            </ControlField>
            <ControlField label="Source URL" className="md:col-span-2">
              <ControlInput
                aria-label="Cost manager source URL"
                type="url"
                value={activeCostEntry?.sourceUrl ?? ""}
                onChange={(event) => updateActiveCostEntry({ sourceUrl: event.target.value })}
                className={CONTROL_INPUT_SURFACE_CLASS}
                placeholder="https://"
              />
            </ControlField>
            <ControlField label="Notes" className="md:col-span-2">
              <ControlTextarea
                aria-label="Cost manager notes"
                value={activeCostEntry?.notes ?? ""}
                onChange={(event) => updateActiveCostEntry({ notes: event.target.value })}
                className="min-h-20"
              />
            </ControlField>
          </div>
        </section>
      </div>
    </Modal>
    </>
  );
}
