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
import { CreatableCombobox, type CreatableComboboxOption } from "@/components/ui/creatable-combobox";
import { DropdownSelect } from "@/components/ui/dropdown-select";
import { Modal } from "@/components/ui/modal";
import { ConfirmDialog } from "@/components/ui/overlays/confirm-dialog";
import {
  createCostLibraryComponent,
  type ComponentLifecycleState,
  type CreateCostLibraryComponentInput,
} from "@/lib/component-library/actions";
import {
  getUserLibraryFolders,
  type LibraryFolderRecord,
} from "@/lib/component-library/library-folder-reorder";
import { validateQuickAddComponentInput } from "@/lib/component-library/quick-add-validation";
import { findComponentCategoryPath, type ComponentLibraryTaxonomyNode } from "@/lib/component-library/taxonomy";
import {
  COMPONENT_UNIT_OPTIONS,
  CONTENT_UNIT_OPTIONS,
  getUnitDisplayLabel,
  type ComponentUnitOption,
  unitUsesContentConversion,
} from "@/lib/component-library/unit-options";
import type { EstimateRowItem } from "@/lib/estimates/types";
import type { ComponentLibraryBrand } from "@/lib/repositories/component-library-repository";
import type { Json } from "@/lib/types/json";
import { cn } from "@/lib/ui/cn";
import {
  uploadComponentAttachment,
  validateComponentAttachmentFile,
} from "@/lib/uploads/component-attachment-client";
import type { ComponentLibrarySupplierOption } from "../component-library/tree/buildLibraryTree";
import {
  isAllComponentsFolderId,
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
  onOpenChange: (open: boolean) => void;
  onComponentCreated: (item: EstimateRowItem) => void;
  onCreateFolder?: CreateLibraryFolderHandler;
  onRenameFolder?: (folderId: string, currentName: string) => void;
  onDeleteFolder?: (folderId: string, currentName: string) => void;
  reorderStatus?: ReorderStatus;
  treeMutationPending?: boolean;
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
const COMPONENT_UNIT_COMBOBOX_OPTIONS = toUnitComboboxOptions(COMPONENT_UNIT_OPTIONS);
const CONTENT_UNIT_COMBOBOX_OPTIONS = toUnitComboboxOptions(CONTENT_UNIT_OPTIONS);
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
  "shadow-[28px_26px_58px_-34px_rgba(23,29,40,0.56),inset_0_1px_0_rgba(255,255,255,0.72),inset_0_0_0_1px_rgba(61,61,61,0.025)]";
const OPENDESIGN_RAIL_SHADOW_CLASS =
  "shadow-[10px_12px_24px_-19px_rgba(23,29,40,0.42),inset_0_1px_0_rgba(255,255,255,0.72),inset_0_0_0_1px_rgba(61,61,61,0.025)]";
const OPENDESIGN_RAIL_ACTIVE_SHADOW_CLASS =
  "shadow-[16px_16px_30px_-24px_rgba(23,29,40,0.56),inset_0_1px_0_rgba(255,255,255,0.72),inset_0_0_0_1px_rgba(61,61,61,0.025)]";

function toUnitComboboxOptions(options: ComponentUnitOption[]): CreatableComboboxOption[] {
  return options.map((option) => ({
    id: option.value,
    label: option.label,
    description: option.description,
    searchText: option.searchText,
  }));
}

function toComboboxOptions(options: Array<{ id: string; name: string }>): CreatableComboboxOption[] {
  return options.map((option) => ({ id: option.id, label: option.name }));
}

function toCategoryComboboxOptions(
  nodes: ComponentLibraryTaxonomyNode[],
  depth = 0,
  path: string[] = [],
): CreatableComboboxOption[] {
  return nodes.flatMap((node) => {
    const nextPath = [...path, node.label];
    const option: CreatableComboboxOption = {
      id: node.id,
      label: node.label,
      description: nextPath.join(" / "),
      searchText: [node.label, node.code, node.meta, node.kind, ...(node.aliases ?? []), ...nextPath].filter(Boolean).join(" "),
    };
    const children = node.children ? toCategoryComboboxOptions(node.children, depth + 1, nextPath) : [];
    return [option, ...children];
  });
}

function getSelectedUnitId(value: string, options: CreatableComboboxOption[]): string | null {
  const trimmedValue = value.trim();
  return options.some((option) => option.id === trimmedValue) ? trimmedValue : null;
}

function getUnitComboboxValue(change: { id: string | null; label: string }) {
  return change.id ?? change.label;
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

function readOptionalPositiveNumber(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : NaN;
}

function normalizeDuplicateIdentityValue(value: string | null | undefined) {
  return (value ?? "").trim().replace(/\s+/g, " ").toLowerCase();
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

function getInitialDraft({
  folders,
  categoryTree,
  selectedFolderId,
  selectedSupplierId,
  selectedBrandId,
  suppliers,
  brands,
}: {
  folders: LibraryFolderRecord[];
  categoryTree: ComponentLibraryTaxonomyNode[];
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
  const categoryPath = categoryNodeId ? findComponentCategoryPath(categoryTree, categoryNodeId) ?? [] : [];
  return {
    name: "",
    category: categoryPath.at(-1) ?? "",
    categoryNodeId,
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
    variants: [makeVariantDraft(1)],
  };
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

async function removeComponentImageUpload(image: VariantImageDraft | null | undefined) {
  const paths = getImageStoragePaths(image);
  if (paths.length === 0) return;
  await fetch("/api/component-library/images", {
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
  return <OpenAddComponentModal {...props} />;
}

function OpenAddComponentModal({
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
}: AddComponentModalProps) {
  const userFolders = useMemo(() => getUserLibraryFolders(folders), [folders]);
  const [draft, setDraft] = useState(() => getInitialDraft({
    folders: userFolders,
    categoryTree,
    selectedFolderId,
    selectedSupplierId,
    selectedBrandId,
    suppliers,
    brands,
  }));
  const [activeTab, setActiveTab] = useState<AddComponentModalTab>("component");
  const [activeVariantId, setActiveVariantId] = useState(() => draft.variants[0]?.id ?? "");
  const [variantDrawerOpen, setVariantDrawerOpen] = useState(false);
  const [variantDrawerView, setVariantDrawerView] = useState<VariantDrawerView>("manager");
  const [variantPreviewUrls, setVariantPreviewUrls] = useState<Record<string, string>>({});
  const [sharedPreviewUrl, setSharedPreviewUrl] = useState("");
  const [imageUpload, setImageUpload] = useState<ImageUploadState>({ state: "idle" });
  const [attachmentUpload, setAttachmentUpload] = useState<ImageUploadState>({ state: "idle" });
  const [discardDialogOpen, setDiscardDialogOpen] = useState(false);
  const [duplicateCheckReady, setDuplicateCheckReady] = useState(false);
  const [duplicateAcknowledged, setDuplicateAcknowledged] = useState(false);
  const [error, setError] = useState("");
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const [isPending, startTransition] = useTransition();
  const thumbnailInputId = useId();
  const variantThumbnailInputId = useId();
  const attachmentInputId = useId();
  const initialFocusRef = useRef<HTMLInputElement>(null);
  const dirtyRef = useRef(false);
  const duplicateCheckTimerRef = useRef<number | null>(null);
  const draftRef = useRef(draft);
  const variantPreviewUrlsRef = useRef(variantPreviewUrls);
  const sharedPreviewUrlRef = useRef(sharedPreviewUrl);

  const categoryOptions = useMemo(() => toCategoryComboboxOptions(categoryTree), [categoryTree]);
  const brandOptions = useMemo(() => toComboboxOptions(brands), [brands]);
  const supplierOptions = useMemo(() => toComboboxOptions(suppliers), [suppliers]);
  const selectedBrand = brands.find((brand) => brand.id === draft.brandId);
  const selectedSupplier = suppliers.find((supplier) => supplier.id === draft.supplierId);
  const defaultVariant = draft.variants.find((variant) => variant.isDefault) ?? draft.variants[0];
  const activeVariant = draft.variants.find((variant) => variant.id === activeVariantId) ?? defaultVariant ?? draft.variants[0];
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
  const selectedCategoryPath = useMemo(
    () => (draft.categoryNodeId ? findComponentCategoryPath(categoryTree, draft.categoryNodeId) ?? [] : []),
    [categoryTree, draft.categoryNodeId],
  );
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
    if (!duplicateCheckReady || duplicateAcknowledged) return null;
    const name = normalizeDuplicateIdentityValue(draft.name);
    const category = normalizeDuplicateIdentityValue(draft.category);
    const supplier = normalizeDuplicateIdentityValue(selectedSupplier?.name ?? draft.supplierName);
    const brand = normalizeDuplicateIdentityValue(selectedBrand?.name ?? draft.brand);
    if (!name || !category || (!supplier && !brand)) return null;
    return libraryItems.find((item) => {
      const itemName = normalizeDuplicateIdentityValue(item.name ?? item.material);
      const itemCategory = normalizeDuplicateIdentityValue(item.category);
      const itemSupplier = normalizeDuplicateIdentityValue(item.supplier);
      const itemBrand = normalizeDuplicateIdentityValue(item.brand);
      return itemName === name && itemCategory === category && ((supplier && itemSupplier === supplier) || (brand && itemBrand === brand));
    }) ?? null;
  }, [
    duplicateAcknowledged,
    duplicateCheckReady,
    draft.brand,
    draft.category,
    draft.name,
    draft.supplierName,
    libraryItems,
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
      if (unitUsesContentConversion(variant.unit) && Number.isNaN(readOptionalPositiveNumber(variant.packageQuantity))) {
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
    setDuplicateCheckReady(false);
    setDuplicateAcknowledged(false);
    updateDraft(update);
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
    markDirty();
    const nextVariant = makeVariantDraft(draft.variants.length + 1, {
      unit: defaultVariant?.unit ?? "unit",
    });
    setDraft((current) => ({ ...current, variants: [...current.variants, nextVariant] }));
    setActiveVariantId(nextVariant.id);
    setVariantDrawerOpen(true);
    setVariantDrawerView("variant");
  }

  function removeActiveVariant() {
    if (!activeVariant || draft.variants.length <= 1) return;
    markDirty();
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
    if (!dirtyRef.current) {
      onOpenChange(false);
      return;
    }
    setDiscardDialogOpen(true);
  }

  function confirmDiscardDraft() {
    cleanupUploadedDraftAssets();
    dirtyRef.current = false;
    setDiscardDialogOpen(false);
    onOpenChange(false);
  }

  async function handleThumbnailUpload(file: File) {
    if (!activeVariant) return;
    if (file.type && !ALLOWED_UPLOAD_TYPES.has(file.type)) {
      setImageUpload({ state: "error", message: "Use a JPG, PNG, WebP, or AVIF image." });
      return;
    }
    if (file.size > MAX_CLIENT_SOURCE_IMAGE_BYTES) {
      setImageUpload({ state: "error", message: "Choose an image under 20 MB." });
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
    markDirty();
    setImageUpload({ state: "processing", message: "Optimizing image..." });

    try {
      const uploadFile = await resizeImageForUpload(file).catch(() => file);
      setImageUpload({ state: "uploading", message: "Uploading image..." });
      const uploadedImage = await uploadComponentImage(uploadFile);
      if (!isUsableUploadResponse(uploadedImage)) throw new Error("Image upload response was incomplete.");
      const imageDraft = toVariantImageDraft(uploadedImage);
      if (draft.sharedImageForAllVariants) {
        updateDraft({ sharedImage: imageDraft, thumbnailPath: imageDraft.thumbnailUrl || imageDraft.url });
      } else {
        updateActiveVariant({ image: imageDraft });
        if (activeVariant.isDefault) updateDraft({ thumbnailPath: imageDraft.thumbnailUrl || imageDraft.url });
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

  function selectCategory(change: { id: string | null; label: string }) {
    const categoryNodeId = change.id ?? "";
    const categoryPath = categoryNodeId ? findComponentCategoryPath(categoryTree, categoryNodeId) ?? [] : [];
    updateQuickAddIdentity({
      category: categoryPath.at(-1) ?? change.label,
      categoryNodeId,
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
    const itemCost = parseMoney(variant?.unitCost ?? "0");
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
        unitCost: parseMoney(entry.unitCost),
        miscCost: 0,
        currency: "PHP",
        pricingSource: null,
        pricingDate: today(),
        confidence: null,
        sourceUrl: null,
        notes: null,
        supplierId: draft.supplierId || null,
        packageQuantity: unitUsesContentConversion(entry.unit) ? readOptionalPositiveNumber(entry.packageQuantity) : null,
        packageUnit: unitUsesContentConversion(entry.unit) ? entry.packageUnit || null : null,
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
      categoryPath: selectedCategoryPath,
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
      confidence: undefined,
      isCustom: true,
    };
  }

  function submit() {
    setSubmitAttempted(true);
    if (imageBusy || attachmentBusy) {
      setError("Wait for uploads to finish before adding this component.");
      return;
    }
    if (validation.length > 0 || isPending) {
      setError("");
      return;
    }
    const fallbackVariant = defaultVariant ?? draft.variants[0] ?? makeVariantDraft(1);
    const defaultVariantImage = getVariantImage(draft, fallbackVariant);
    const defaultThumbnailPath = defaultVariantImage?.thumbnailUrl || defaultVariantImage?.thumbnailPath || null;
    const payload: CreateCostLibraryComponentInput = {
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
          unitCost: parseMoney(variant.unitCost),
          currency: "PHP",
          supplierId: draft.supplierId || null,
          packageQuantity: unitUsesContentConversion(variant.unit) ? readOptionalPositiveNumber(variant.packageQuantity) : null,
          packageUnit: unitUsesContentConversion(variant.unit) ? variant.packageUnit || null : null,
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

  const showValidationErrors = submitAttempted && validation.length > 0;
  const visibleValidationErrors: Partial<typeof quickAddValidation.errors> = showValidationErrors ? quickAddValidation.errors : {};
  const componentStatus = error || (showValidationErrors ? "Complete the required fields before adding this component." : "Ready to add component.");
  const unitLabel = getUnitDisplayLabel(activeVariant?.unit ?? "") || activeVariant?.unit || "unit";
  const showActiveVariantEquivalency = activeVariant ? unitUsesContentConversion(activeVariant.unit) : false;
  const showMainCostSection = !(variantDrawerOpen && variantDrawerView === "variant");

  return (
    <>
      <Modal
        open={open}
        title="Add Component"
        onOpenChange={requestClose}
        closeLabel="Close add component modal"
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
        <div className="relative isolate flex h-[min(940px,calc(100dvh-16px))] w-full max-w-full flex-col overflow-visible text-[10px] text-secondary">
          <div className="relative z-20 flex h-8 shrink-0 items-stretch gap-2 border-b border-[#e7e9ec] px-2" role="tablist" aria-label="Add component sections">
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
                        unoptimized={Boolean(activePreviewUrl || activeImageSrc.startsWith("http"))}
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
                      const file = event.target.files?.[0];
                      event.currentTarget.value = "";
                      if (!file) return;
                      void handleThumbnailUpload(file);
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
                        onChange={(event) => {
                          if (!defaultVariant) return;
                          updateVariant(defaultVariant.id, { description: event.target.value });
                        }}
                        className={OPENDESIGN_TEXTAREA_CLASS}
                      />
                    </ControlField>
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
                              onChange={(event) => {
                                if (!defaultVariant) return;
                                updateVariant(defaultVariant.id, { unitCost: formatAccountingMoney(normalizeMoneyInput(event.target.value)) });
                              }}
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
                              if (!defaultVariant) return;
                              const unit = getUnitComboboxValue(change);
                              updateVariant(defaultVariant.id, {
                                unit,
                                ...(unitUsesContentConversion(unit) ? {} : { packageQuantity: "", packageUnit: "" }),
                              });
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

                  <section className={OPENDESIGN_SECTION_CLASS} aria-label="Catalogue fields">
                    <div className={OPENDESIGN_SECTION_TITLE_CLASS}>Catalogue</div>
                    <ControlField as="div" label="Category" labelClassName={OPENDESIGN_FIELD_LABEL_CLASS} errorText={visibleValidationErrors.category}>
                      <CreatableCombobox
                        ariaLabel="Category"
                        ariaRequired
                        value={draft.category}
                        selectedId={draft.categoryNodeId || null}
                        options={categoryOptions}
                        placeholder="Search categories"
                        emptyLabel="No categories found"
                        createLabel={(value) => `Add category "${value}"`}
                        invalid={Boolean(visibleValidationErrors.category)}
                        inputClassName={OPENDESIGN_INPUT_CLASS}
                        onChange={selectCategory}
                        preferSelectionOnEnter
                        showClearButton={false}
                        showDropdownIndicator
                      />
                    </ControlField>
                    <ControlField as="div" label="Supplier" labelClassName={OPENDESIGN_FIELD_LABEL_CLASS} errorText={visibleValidationErrors.supplier}>
                      <CreatableCombobox
                        ariaLabel="Supplier"
                        value={selectedSupplier?.name ?? draft.supplierName}
                        selectedId={draft.supplierId || null}
                        options={supplierOptions}
                        placeholder="Search suppliers"
                        emptyLabel="No suppliers yet"
                        invalid={Boolean(visibleValidationErrors.supplier)}
                        inputClassName={OPENDESIGN_INPUT_CLASS}
                        onChange={(change) => updateQuickAddIdentity({ supplierId: change.id ?? "", supplierName: change.label })}
                        showClearButton={false}
                        showDropdownIndicator
                      />
                    </ControlField>
                    <ControlField as="div" label="Brand" labelClassName={OPENDESIGN_FIELD_LABEL_CLASS} errorText={visibleValidationErrors.brand}>
                      <CreatableCombobox
                        ariaLabel="Brand"
                        value={selectedBrand?.name ?? draft.brand}
                        selectedId={draft.brandId || null}
                        options={brandOptions}
                        placeholder="Search brands"
                        emptyLabel="No brands yet"
                        invalid={Boolean(visibleValidationErrors.brand)}
                        inputClassName={OPENDESIGN_INPUT_CLASS}
                        onChange={(change) => updateQuickAddIdentity({ brandId: change.id ?? "", brand: change.label })}
                        showClearButton={false}
                        showDropdownIndicator
                      />
                    </ControlField>
                    {possibleDuplicate ? (
                      <output className="flex min-h-8 items-center justify-between gap-2 rounded-[6px] bg-warningSoft/50 px-2 text-[10px] font-medium text-ink">
                        <span className="min-w-0 truncate">
                          A component named &quot;{possibleDuplicate.name ?? possibleDuplicate.material}&quot; already exists.
                        </span>
                        <Button type="button" variant="warning" size="xs" onClick={() => setDuplicateAcknowledged(true)} className="min-w-0 shrink-0 px-2">
                          Create anyway
                        </Button>
                      </output>
                    ) : null}
                  </section>
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
              {isPending ? "Adding..." : imageBusy || attachmentBusy ? "Uploading..." : "Add Component"}
            </button>
          </footer>

          <div
            aria-hidden="true"
            data-add-component-drawer-seam-shadow
            className={cn(
              "pointer-events-none absolute bottom-0 right-[-36px] top-[77px] z-[3] w-9 bg-[linear-gradient(90deg,rgba(23,29,40,0.22),rgba(23,29,40,0.08)_52%,transparent)] opacity-0 transition-opacity duration-200",
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
              "absolute bottom-0 left-[calc(100%-1px)] top-[33px] z-10 flex w-[min(533px,calc(100vw-32px))] origin-left flex-col overflow-visible rounded-r-[6px] border border-l-0 border-[rgba(61,61,61,0.10)] bg-[rgba(255,255,255,0.94)] backdrop-blur-[18px] transition-[transform,opacity] duration-300 ease-[cubic-bezier(0.2,0,0,1)]",
              OPENDESIGN_DRAWER_SHADOW_CLASS,
              variantDrawerOpen ? "translate-x-0 opacity-100" : "pointer-events-none translate-x-[calc(-100%+1px)] opacity-0",
              "max-[1120px]:right-2 max-[1120px]:left-auto max-[1120px]:w-[min(430px,calc(100%-24px))] max-[1120px]:origin-right max-[1120px]:rounded-[6px] max-[1120px]:rounded-r-none max-[1120px]:border-l max-[1120px]:border-r-0 max-[1120px]:shadow-[-26px_0_44px_-34px_rgba(23,29,40,0.52),inset_0_1px_0_rgba(255,255,255,0.72),inset_0_0_0_1px_rgba(61,61,61,0.025)]",
              "max-[900px]:right-0 max-[900px]:w-[min(430px,calc(100%-8px))]",
              "max-[640px]:inset-x-0 max-[640px]:w-full max-[640px]:rounded-none",
            )}
          >
            <header className="flex h-[45px] shrink-0 items-center gap-2 border-b border-[rgba(61,61,61,0.08)] bg-[rgba(255,255,255,0.72)] pl-4 pr-2">
              <div className="mr-auto min-w-0">
                <h3 className="truncate text-[11px] font-medium leading-[1.2] text-ink">Manage Variants</h3>
                <p className="m-0 truncate text-[9px] font-medium leading-3 text-tertiary">{draft.variants.length} variant{draft.variants.length === 1 ? "" : "s"}</p>
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
                aria-pressed={activeVariant?.isDefault ?? false}
                disabled={!activeVariant}
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

            <nav className="absolute left-full top-[45px] z-[3] grid w-[30px] gap-0 max-[1120px]:hidden" aria-label="Variant navigation">
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
                    draft.variants.length === 0 && "rounded-br-[3px]",
                  )}
                >
                  <Plus size={14} weight="regular" aria-hidden="true" />
                </button>
                {draft.variants.map((variant, index) => {
                  const isActive = activeVariant?.id === variant.id && variantDrawerView === "variant";
                  const isLast = index === draft.variants.length - 1;
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
                  {draft.variants.map((variant, index) => (
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
                  <section className="grid h-[99px] grid-cols-[99px_minmax(0,1fr)] items-center gap-2 rounded-[3px] bg-[rgba(61,61,61,0.035)] p-2" aria-label="Variant image">
                    <div className={OPENDESIGN_IMAGE_WELL_CLASS}>
                      {activeImageSrc ? (
                        <Image
                          src={activeImageSrc}
                          alt="Variant thumbnail preview"
                          fill
                          sizes="96px"
                          className="object-cover"
                          unoptimized={Boolean(activePreviewUrl || activeImageSrc.startsWith("http"))}
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
                          const file = event.target.files?.[0];
                          event.currentTarget.value = "";
                          if (!file) return;
                          void handleThumbnailUpload(file);
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
                      className={cn(
                        "grid gap-2",
                        showActiveVariantEquivalency
                          ? "md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1.05fr)]"
                          : "md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]",
                      )}
                    >
                      <ControlField label="Unit cost" labelClassName={OPENDESIGN_FIELD_LABEL_CLASS} errorText={showValidationErrors && activeVariant.id === defaultVariant?.id ? quickAddValidation.errors.unitCost : undefined}>
                        <div className="relative">
                          <span className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 font-mono text-[9px] font-medium text-tertiary">PHP</span>
                          <ControlInput
                            aria-label="Variant unit cost"
                            aria-required="true"
                            inputMode="decimal"
                            value={activeVariant.unitCost}
                            onChange={(event) => updateActiveVariant({ unitCost: formatAccountingMoney(normalizeMoneyInput(event.target.value)) })}
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
                      {showActiveVariantEquivalency ? (
                        <div className="grid h-8 grid-cols-[auto_auto_minmax(44px,0.55fr)_minmax(66px,0.75fr)] items-center gap-1.5 rounded-[6px] bg-[rgba(61,61,61,0.05)] px-1.5">
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
                          <ControlField as="div" label="Equivalent unit" labelClassName="sr-only">
                            <CreatableCombobox
                              ariaLabel="Equivalent unit"
                              value={activeVariant.packageUnit}
                              selectedId={getSelectedUnitId(activeVariant.packageUnit, CONTENT_UNIT_COMBOBOX_OPTIONS)}
                              options={CONTENT_UNIT_COMBOBOX_OPTIONS}
                              placeholder={unitLabel}
                              emptyLabel="No units found"
                              createLabel={(value) => `Add unit "${value}"`}
                              inputClassName={cn(OPENDESIGN_INPUT_CLASS, "h-6 px-1.5")}
                              onChange={(change) => updateActiveVariant({ packageUnit: getUnitComboboxValue(change) })}
                              preferSelectionOnEnter
                              suppressCreateWhenSearchMatches
                              optionPresentation="unit"
                              dropdownPlacement="top"
                              showClearButton={false}
                            />
                          </ControlField>
                        </div>
                      ) : null}
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
                          const file = event.target.files?.[0];
                          event.currentTarget.value = "";
                          if (!file) return;
                          void handleAttachmentUpload(file);
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
            <footer className="flex h-[49px] shrink-0 items-center justify-start border-t border-[rgba(61,61,61,0.08)] px-4">
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
      <ConfirmDialog
        open={discardDialogOpen}
        onOpenChange={setDiscardDialogOpen}
        title="Discard this draft?"
        description="You have unsaved changes to this component. They are lost if you leave."
        confirmLabel="Discard draft"
        cancelLabel="Keep editing"
        tone="warning"
        onConfirm={confirmDiscardDraft}
      />
    </>
  );
}
