"use client";

import { useCallback, useEffect, useId, useReducer, useRef, useState, type CSSProperties, type DragEvent, type InputHTMLAttributes, type KeyboardEvent, type MouseEvent, type ReactNode } from "react";
import { ArrowsClockwise, ArrowsOutCardinal, CaretDown, Cube, DotsSixVertical, DotsThree, ImageSquare, PencilSimple, StackPlus, Trash, UploadSimple } from "@phosphor-icons/react/dist/ssr";

import { Button } from "@/components/ui/button";
import { IconButton } from "@/components/ui/icon-button";
import { ControlInput } from "@/components/ui/control-input";
import { CreatableCombobox, type CreatableComboboxChange, type CreatableComboboxOption } from "@/components/ui/creatable-combobox";
import { DropdownMenu } from "@/components/ui/dropdown-menu";
import { Modal } from "@/components/ui/modal";
import { Skeleton } from "@/components/ui/skeleton";
import {
  getComponentCatalogueComboboxValue,
  getSelectedComponentCatalogueOptionId,
} from "@/components/workshop/component-catalogue-combobox-options";
import {
  COMPONENT_UNIT_COMBOBOX_OPTIONS,
  getSelectedUnitId,
  getUnitComboboxValue,
} from "@/components/workshop/component-unit-combobox-options";
import { Tooltip } from "@/components/ui/overlays/tooltip";
import { formatVariantCode, formatVariantDropdownLabel } from "@/lib/component-library/variant-display";
import { classifyEstimateRowSource, isExpressComponentRow, readProjectComponentProjectionMetadata } from "@/lib/estimates/express-components";
import { cn } from "@/lib/ui/cn";
import { getUploadClientErrorMessage, isUploadAbortError, postUploadFormData } from "@/lib/uploads/client-upload";
import { getUploadClientStatusRole, IDLE_UPLOAD_CLIENT_STATE, isUploadClientBusy, isUploadClientRetryable, reduceUploadClientState, type UploadClientState } from "@/lib/uploads/client-state";
import { useEstimateSurfaceVariant } from "../../estimate-surface-variant";
import {
  getComponentImageUrl as getMaterialCardImageUrl,
  isBlankEstimateRowItem,
  pesoFormatter,
  type EstimateMaterialCardItem,
} from "../activity-history-model";
import type { EstimateRowItem } from "../../estimate-tree-data";
import {
  ESTIMATE_COMPONENT_DRAG_MIME_TYPE,
  LIBRARY_ITEM_DRAG_MIME_TYPE,
  readEstimateComponentDragPayload,
  readEstimateLibraryItemDragPayload,
  type EstimateComponentDragPayload,
} from "./constants";
import { canMakeProjectSpecific, canPromoteEstimateRowToLibrary } from "./cells-model";
import { formatEditableMoney, type EditableRowValue, type EstimateRowImageAssetDescriptor } from "./editable-row-model";

export type ExpressInsertDraftState = "creating" | "failed";

type ComponentSourceTone = "library" | "express" | "project" | "manual";

const MATERIAL_COST_SLOT_CLASS = "w-[76px] shrink-0";
const MATERIAL_UNIT_LABEL_CLASS =
  "flex min-w-0 max-w-full items-center justify-end gap-0.5 text-right !text-[10px] font-medium leading-3";
const MATERIAL_UNIT_SLASH_CLASS = "block shrink-0 leading-3 text-tertiary";
const MATERIAL_UNIT_VALUE_CLASS = "block min-w-0 truncate";
const ESTIMATE_IMAGE_UPLOAD_MAX_BYTES = 12 * 1024 * 1024;
const ESTIMATE_IMAGE_UPLOAD_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/avif"]);
const EMPTY_CATALOGUE_COMBOBOX_OPTIONS: CreatableComboboxOption[] = [];

type EstimateImageModalState = {
  open: boolean;
  imageUrlDraft: string;
  imageUrlDraftDirty: boolean;
  selectedImage: File | null;
  selectedImagePreview: string;
  uploadedImage: UploadedEstimateImage | null;
  uploadState: UploadClientState;
};

type EstimateImageModalAction =
  | { type: "open"; imageUrl: string }
  | { type: "close" }
  | { type: "url:change"; value: string }
  | { type: "file:selected"; file: File; previewUrl: string; message?: string }
  | { type: "file:error"; message: string }
  | { type: "upload:start" }
  | { type: "upload:ready"; uploadedImage: UploadedEstimateImage }
  | { type: "save:start" }
  | { type: "upload:success" }
  | { type: "upload:error"; message: string }
  | { type: "upload:cancelled" };

const INITIAL_ESTIMATE_IMAGE_MODAL_STATE: EstimateImageModalState = {
  open: false,
  imageUrlDraft: "",
  imageUrlDraftDirty: false,
  selectedImage: null,
  selectedImagePreview: "",
  uploadedImage: null,
  uploadState: IDLE_UPLOAD_CLIENT_STATE,
};

function estimateImageModalReducer(state: EstimateImageModalState, action: EstimateImageModalAction): EstimateImageModalState {
  switch (action.type) {
    case "open":
      return {
        ...INITIAL_ESTIMATE_IMAGE_MODAL_STATE,
        open: true,
        imageUrlDraft: action.imageUrl,
      };
    case "close":
      return INITIAL_ESTIMATE_IMAGE_MODAL_STATE;
    case "url:change":
      return {
        ...state,
        imageUrlDraft: action.value,
        imageUrlDraftDirty: true,
        selectedImage: null,
        selectedImagePreview: "",
        uploadedImage: null,
        uploadState: reduceUploadClientState(state.uploadState, { type: "reset" }),
      };
    case "file:selected":
      return {
        ...state,
        open: false,
        imageUrlDraftDirty: false,
        selectedImage: action.file,
        selectedImagePreview: action.previewUrl,
        uploadedImage: null,
        uploadState: reduceUploadClientState(state.uploadState, { type: "select", message: action.message ?? `${action.file.name} selected.` }),
      };
    case "file:error":
      return {
        ...state,
        selectedImage: null,
        selectedImagePreview: "",
        uploadedImage: null,
        uploadState: reduceUploadClientState(state.uploadState, { type: "blocking-error", message: action.message }),
      };
    case "upload:start":
      return {
        ...state,
        open: false,
        uploadedImage: null,
        uploadState: reduceUploadClientState(state.uploadState, { type: "uploading", message: "Uploading image..." }),
      };
    case "upload:ready":
      return {
        ...state,
        uploadedImage: action.uploadedImage,
        uploadState: reduceUploadClientState(state.uploadState, { type: "uploaded", message: "Image uploaded. Saving row..." }),
      };
    case "save:start":
      return {
        ...state,
        uploadState: reduceUploadClientState(state.uploadState, { type: "finalizing", message: "Saving image to row..." }),
      };
    case "upload:success":
      return INITIAL_ESTIMATE_IMAGE_MODAL_STATE;
    case "upload:error":
      return {
        ...state,
        open: false,
        uploadState: reduceUploadClientState(state.uploadState, { type: "retryable-error", message: action.message }),
      };
    case "upload:cancelled":
      return {
        ...state,
        uploadState: reduceUploadClientState(state.uploadState, { type: "cancelled" }),
      };
  }
}

type UploadedEstimateImage = {
  bucket?: string;
  uploadSessionId?: string;
  assetId?: string;
  scanStatus?: string;
  path?: string;
  thumbnailPath?: string;
  url: string;
  thumbnailUrl?: string;
  optimizedBytes?: number;
  contentType?: string;
  width?: number;
  height?: number;
  thumbnailWidth?: number;
  thumbnailHeight?: number;
  imageAsset?: EstimateRowImageAssetDescriptor;
};

async function uploadEstimateReferenceImage(
  file: File,
  options: { signal?: AbortSignal; projectId?: string; estimateId?: string; rowItemId?: string; scope?: "library" | "project" } = {},
): Promise<UploadedEstimateImage> {
  if (options.scope !== "library" && (!options.projectId || !options.estimateId)) {
    throw new Error("Project and estimate are required to upload a reference image.");
  }
  const formData = new FormData();
  if (options.scope !== "library") {
    formData.set("projectId", options.projectId ?? "");
    formData.set("estimateId", options.estimateId ?? "");
    if (options.rowItemId) formData.set("rowItemId", options.rowItemId);
  }
  formData.set("file", file);
  const uploaded = await postUploadFormData<UploadedEstimateImage>(
    options.scope === "library" ? "/api/component-library/images" : "/api/projects/images",
    formData,
    {
      signal: options.signal,
      fallbackMessage: "Could not upload image.",
      timeoutMessage: "Image upload timed out. Try again.",
    },
  );
  if (uploaded.imageAsset || options.scope !== "library") return uploaded;
  if (!uploaded.assetId || !uploaded.uploadSessionId || !uploaded.bucket || !uploaded.path || !uploaded.contentType || !uploaded.scanStatus) {
    throw new Error("Component image upload response was incomplete.");
  }
  return {
    ...uploaded,
    imageAsset: {
      kind: "upload-asset",
      schemaVersion: 1,
      assetId: uploaded.assetId,
      uploadSessionId: uploaded.uploadSessionId,
      bucket: uploaded.bucket,
      path: uploaded.path,
      thumbnailPath: uploaded.thumbnailPath ?? null,
      url: uploaded.url,
      thumbnailUrl: uploaded.thumbnailUrl ?? null,
      fileName: file.name,
      contentType: uploaded.contentType,
      sizeBytes: uploaded.optimizedBytes ?? file.size,
      scanStatus: uploaded.scanStatus,
      width: uploaded.width ?? null,
      height: uploaded.height ?? null,
      thumbnailWidth: uploaded.thumbnailWidth ?? null,
      thumbnailHeight: uploaded.thumbnailHeight ?? null,
    },
  };
}

function validateEstimateReferenceImage(file: File) {
  if (!ESTIMATE_IMAGE_UPLOAD_TYPES.has(file.type)) return "Use a JPG, PNG, WebP, or AVIF image.";
  if (file.size > ESTIMATE_IMAGE_UPLOAD_MAX_BYTES) return "Choose an image under 12 MB.";
  if (file.size <= 0) return "Choose an image with content.";
  return null;
}

function ActionTooltip({ label, children }: { label: ReactNode; children: ReactNode }) {
  return (
    <Tooltip label={label} side="top" contentClassName="z-[1200]">
      {children}
    </Tooltip>
  );
}

function getComponentSourceTone(item: EstimateRowItem): ComponentSourceTone {
  const source = classifyEstimateRowSource(item);
  if (source === "express") return "express";
  const projection = readProjectComponentProjectionMetadata(item.metadata);
  if (projection?.classification === "detached-library") return "project";
  if (source === "detached-library") return "project";
  if (source === "linked-library") return "library";
  return "manual";
}

function getComponentSourceLabel(source: ComponentSourceTone) {
  switch (source) {
    case "library":
      return "Library Component";
    case "express":
      return "Project Component";
    case "project":
      return "Project Component";
    case "manual":
      return "Project Component";
  }
}

function getComponentSourceRailClass(source: ComponentSourceTone) {
  switch (source) {
    case "library":
      return "group-hover:bg-[#E8B99D] group-focus-within:bg-[#E8B99D] group-hover/estimate-row:bg-[#E8B99D]";
    case "express":
      return "group-hover:bg-[#AAB6E8] group-focus-within:bg-[#AAB6E8] group-hover/estimate-row:bg-[#AAB6E8]";
    case "project":
      return "group-hover:bg-[#A6B27B] group-focus-within:bg-[#A6B27B] group-hover/estimate-row:bg-[#A6B27B]";
    case "manual":
      return "group-hover:bg-divider group-focus-within:bg-divider group-hover/estimate-row:bg-divider";
  }
}

export type MaterialVariantOption = NonNullable<EstimateRowItem["priceOptions"]>[number];

function EstimateMaterialCardFrame({
  image,
  name,
  brand,
  supplier,
  variant,
  cost,
  description,
  unit,
}: {
  image: ReactNode;
  name: ReactNode;
  brand: ReactNode;
  supplier: ReactNode;
  variant?: ReactNode;
  cost: ReactNode;
  description: ReactNode;
  unit: ReactNode;
}) {
  return (
    <div className="relative grid h-full min-h-0 grid-cols-[44px_minmax(0,1fr)] grid-rows-[minmax(44px,1fr)_16px] gap-x-2 gap-y-1">
      <div className="col-start-1 row-start-1 min-w-0">{image}</div>
      <div className="col-start-2 row-start-1 flex min-w-0 flex-col justify-between overflow-hidden pr-12">
        {name}
        {brand}
        {supplier}
      </div>
      <div className="col-start-1 row-start-2 flex min-w-0 items-center">{variant}</div>
      <div className="col-start-2 row-start-2 flex min-w-0 items-center gap-1 overflow-hidden">
        <div className="min-w-0 flex-1 overflow-hidden">{description}</div>
        <div className="flex shrink-0 items-center justify-end gap-1">
          {cost}
          <div className="min-w-0 max-w-10" data-estimate-material-unit-slot="true">{unit}</div>
        </div>
      </div>
    </div>
  );
}

function EstimateMaterialCardSyncSkeleton() {
  const skeletonClassName = "bg-[#EFEFEF]";
  return (
    <div className="absolute inset-y-2 right-2 left-3 z-20" data-component-sync-skeleton="true">
      <span className="sr-only">Updating linked component</span>
      <EstimateMaterialCardFrame
        image={<Skeleton className={cn("size-11", skeletonClassName)} />}
        name={<Skeleton className={cn("h-3 w-2/3 max-w-40", skeletonClassName)} />}
        brand={<Skeleton className={cn("h-2 w-20", skeletonClassName)} />}
        supplier={<Skeleton className={cn("h-2 w-28", skeletonClassName)} />}
        cost={<Skeleton className={cn("h-3 w-20", skeletonClassName)} />}
        variant={(
          <div className="flex items-center gap-1">
            <Skeleton className={cn("size-2", skeletonClassName)} />
            <Skeleton className={cn("h-2 w-7", skeletonClassName)} />
          </div>
        )}
        description={<Skeleton className={cn("h-2.5 w-full", skeletonClassName)} />}
        unit={<Skeleton className={cn("h-2.5 w-10", skeletonClassName)} />}
      />
    </div>
  );
}

function getMaterialVariantOptions(item: EstimateMaterialCardItem): MaterialVariantOption[] {
  const options = (item.priceOptions ?? [])
    .map((option, index) => ({ option, index }))
    .filter(({ option }) => option.isActive)
    .sort((left, right) => {
      const leftOrder = typeof left.option.variantSortOrder === "number" ? left.option.variantSortOrder : left.index + 1;
      const rightOrder = typeof right.option.variantSortOrder === "number" ? right.option.variantSortOrder : right.index + 1;
      return leftOrder - rightOrder || left.index - right.index;
    })
    .map(({ option }) => option);
  if (options.length > 0) return options;
  return [{
    id: item.priceOptionId ?? "current-variant",
    label: "Default",
    unit: item.unit,
    unitCost: item.itemCost,
    miscCost: 0,
    currency: "PHP",
    isActive: true,
    isDefault: true,
  }];
}

function getActiveMaterialVariantId(item: EstimateMaterialCardItem, options: MaterialVariantOption[]) {
  if (item.priceOptionId && options.some((option) => option.id === item.priceOptionId)) return item.priceOptionId;
  return options.length === 1 ? options[0]?.id : undefined;
}

function getActiveMaterialVariantLabel(item: EstimateMaterialCardItem) {
  const variantOptions = getMaterialVariantOptions(item);
  if (variantOptions.length < 2) return null;
  const activeOptionId = getActiveMaterialVariantId(item, variantOptions);
  return variantOptions.find((option) => option.id === activeOptionId)?.label.trim() || "Selection required";
}

function MaterialVariantControl({
  item,
  canEditEstimate,
  onSelectVariant,
}: {
  item: EstimateMaterialCardItem;
  canEditEstimate: boolean;
  onSelectVariant?: (option: MaterialVariantOption) => void;
}) {
  const variantOptions = getMaterialVariantOptions(item);
  const activeOptionId = getActiveMaterialVariantId(item, variantOptions);
  const activeOptionIndex = variantOptions.findIndex((option) => option.id === activeOptionId);
  const activeOption = activeOptionIndex >= 0 ? variantOptions[activeOptionIndex] : undefined;
  const variantLabel = activeOptionIndex >= 0 ? formatVariantCode(activeOptionIndex) : "Select";
  const variantTitle = activeOption?.label ?? "Selection required";
  const hasSelectableVariants = (item.priceOptions ?? []).some((option) => option.isActive);
  const controlClass =
    "inline-flex min-h-4 w-fit max-w-full min-w-0 cursor-pointer items-center justify-start gap-0.5 self-start px-0 text-[9px] font-medium leading-3 text-tertiary transition-colors duration-200 ease-[cubic-bezier(0.32,0.72,0,1)] hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus/50";

  if (!canEditEstimate || !onSelectVariant) {
    return (
      <span className={controlClass} title={`Variant: ${variantTitle}`}>
        <CaretDown size={8} weight="regular" className="shrink-0" aria-hidden="true" />
        <span className="truncate">{variantLabel}</span>
      </span>
    );
  }

  return (
    <DropdownMenu
      align="start"
      side="bottom"
      className="min-w-32"
      trigger={(
        <button
          type="button"
          className={`${controlClass} min-h-6 min-w-6 rounded-xs px-1`}
          aria-label={`Change variant for ${item.material}`}
          title={`Variant: ${variantTitle}`}
          onClick={(event) => event.stopPropagation()}
        >
          <CaretDown size={8} weight="regular" className="shrink-0" aria-hidden="true" />
          <span className="truncate">{variantLabel}</span>
        </button>
      )}
    >
      {variantOptions.map((option, index) => (
        <DropdownMenu.Item
          key={option.id}
          id={option.id}
          label={formatVariantDropdownLabel(index, option.label)}
          selected={option.id === activeOptionId}
          disabled={!hasSelectableVariants}
          onClick={() => onSelectVariant(option)}
        />
      ))}
    </DropdownMenu>
  );
}

function EstimateMaterialCardContent({
  item,
  canEditEstimate,
  onSelectVariant,
}: {
  item: EstimateMaterialCardItem;
  canEditEstimate: boolean;
  onSelectVariant?: (option: MaterialVariantOption) => void;
}) {
  const brand = item.brand?.trim();
  const activeVariantLabel = getActiveMaterialVariantLabel(item);
  return (
    <EstimateMaterialCardFrame
      image={(
        <div
          className="size-11 shrink-0 rounded-xs bg-neutral-100 bg-cover bg-center"
          style={{ backgroundImage: `url(${getMaterialCardImageUrl(item)})` }}
          aria-label={`${item.material} reference image`}
        />
      )}
      name={(
        <p className="flex min-w-0 items-baseline gap-1 text-left text-[11px] leading-4">
          <span className="min-w-0 flex-1 truncate font-medium text-ink">{item.material}</span>
          {activeVariantLabel ? (
            <>
              <span className="shrink-0 font-normal text-tertiary" aria-hidden="true">·</span>
              <span className="max-w-[40%] shrink truncate font-normal text-secondary" title={activeVariantLabel}>
                {activeVariantLabel}
              </span>
            </>
          ) : null}
        </p>
      )}
      brand={brand ? (
        <p className="truncate text-left text-[10px] font-medium leading-3 text-secondary" title={brand}>{brand}</p>
      ) : null}
      supplier={<p className="truncate text-left text-[10px] font-normal leading-3 text-tertiary">{item.supplier}</p>}
      variant={<MaterialVariantControl item={item} canEditEstimate={canEditEstimate} onSelectVariant={onSelectVariant} />}
      cost={<p className="whitespace-nowrap text-[10px] font-medium leading-3 tabular-nums text-ink">{pesoFormatter.format(item.itemCost).replace("₱", "₱ ")}</p>}
      description={(
        <p className="block max-w-full truncate text-[10px] leading-4 text-secondary/60 transition-opacity group-hover:text-secondary" title={item.description}>
          {item.description}
        </p>
      )}
      unit={(
        <p className={MATERIAL_UNIT_LABEL_CLASS} data-estimate-material-unit-label="true" title={`per ${item.unit}`}>
          <span className={MATERIAL_UNIT_SLASH_CLASS} data-estimate-material-unit-slash="true" aria-hidden="true">/</span>
          <span className={MATERIAL_UNIT_VALUE_CLASS} data-estimate-material-unit-value="true">{item.unit}</span>
        </p>
      )}
    />
  );
}

type ExpressEditableField = "name" | "description" | "brand" | "supplier" | "unit" | "unitCost" | "priceOptionLabel" | "imageUrl" | "sourceUrl";

export function handleExpressFieldKeyDown(
  event: KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>,
  options: { field: ExpressEditableField; onRevert: (field: ExpressEditableField) => void },
) {
  if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Home", "End"].includes(event.key)) {
    event.stopPropagation();
    return;
  }

  if (event.key === "Escape") {
    event.preventDefault();
    event.stopPropagation();
    options.onRevert(options.field);
    return;
  }

  if (event.key === "Enter") {
    const isMultiline = event.currentTarget.tagName === "TEXTAREA";
    if (isMultiline && !event.metaKey && !event.ctrlKey) {
      event.stopPropagation();
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.blur();
  }
}

function ExpressMaterialImageEditor({
  draftState,
  editableImageUrl,
  editorLabel,
  imageStyle,
  imageUrl,
  itemId,
  projectId,
  estimateId,
  imageUploadScope,
  onActiveChange,
  onCommitImageUrl,
}: {
  draftState?: ExpressInsertDraftState;
  editableImageUrl: string;
  editorLabel: string;
  imageStyle?: CSSProperties;
  imageUrl: string;
  itemId: string;
  projectId?: string;
  estimateId?: string;
  imageUploadScope: "library" | "project";
  onActiveChange: (active: boolean) => void;
  onCommitImageUrl: (nextImageUrl: string, imageAsset?: EstimateRowImageAssetDescriptor | null) => Promise<void>;
}) {
  const imageInputId = useId();
  const imageFileInputRef = useRef<HTMLInputElement | null>(null);
  const [imageModal, dispatchImageModal] = useReducer(estimateImageModalReducer, INITIAL_ESTIMATE_IMAGE_MODAL_STATE);
  const selectedImagePreviewRef = useRef("");
  const imageUploadAbortRef = useRef<AbortController | null>(null);
  const imageUploadAttemptRef = useRef(0);
  const { imageUrlDraft, imageUrlDraftDirty, open: imageModalOpen, selectedImage, selectedImagePreview, uploadedImage, uploadState: imageUploadState } = imageModal;
  const imageModalBusy = isUploadClientBusy(imageUploadState);
  const imageUploadRetryable = Boolean((uploadedImage || selectedImage) && isUploadClientRetryable(imageUploadState));
  const showThumbnailUploadState = Boolean(selectedImage && !imageModalOpen && imageUploadState.message);
  const thumbnailStatusRole = getUploadClientStatusRole(imageUploadState);
  const thumbnailImageStyle = selectedImagePreview ? { backgroundImage: `url(${selectedImagePreview})` } : imageStyle;

  useEffect(() => () => {
    imageUploadAttemptRef.current += 1;
    imageUploadAbortRef.current?.abort();
    if (selectedImagePreviewRef.current) URL.revokeObjectURL(selectedImagePreviewRef.current);
  }, []);

  const replaceSelectedImagePreview = useCallback((nextPreviewUrl: string) => {
    if (selectedImagePreviewRef.current === nextPreviewUrl) return;
    if (selectedImagePreviewRef.current) URL.revokeObjectURL(selectedImagePreviewRef.current);
    selectedImagePreviewRef.current = nextPreviewUrl;
  }, []);

  function openImageModal() {
    onActiveChange(true);
    replaceSelectedImagePreview("");
    dispatchImageModal({ type: "open", imageUrl: editableImageUrl });
  }

  function closeImageModal() {
    imageUploadAttemptRef.current += 1;
    imageUploadAbortRef.current?.abort();
    imageUploadAbortRef.current = null;
    replaceSelectedImagePreview("");
    dispatchImageModal({ type: "close" });
    onActiveChange(false);
  }

  function cancelImageUpload() {
    imageUploadAttemptRef.current += 1;
    imageUploadAbortRef.current?.abort();
    imageUploadAbortRef.current = null;
    dispatchImageModal({ type: "upload:cancelled" });
  }

  function openImageFilePicker() {
    if (imageModalBusy) return;
    imageFileInputRef.current?.click();
  }

  const persistUploadedImage = useCallback(async (image: UploadedEstimateImage, attemptId: number) => {
    dispatchImageModal({ type: "save:start" });
    await onCommitImageUrl(image.url, image.imageAsset ?? null);
    if (imageUploadAttemptRef.current !== attemptId) return;
    replaceSelectedImagePreview("");
    dispatchImageModal({ type: "upload:success" });
    onActiveChange(false);
  }, [onActiveChange, onCommitImageUrl, replaceSelectedImagePreview]);

  const startImageUpload = useCallback(async (file: File) => {
    if (draftState) return;
    const attemptId = imageUploadAttemptRef.current + 1;
    imageUploadAttemptRef.current = attemptId;
    const abortController = new AbortController();
    imageUploadAbortRef.current = abortController;
    dispatchImageModal({ type: "upload:start" });
    let uploadedResult: UploadedEstimateImage | null = null;
    try {
      uploadedResult = await uploadEstimateReferenceImage(file, {
        signal: abortController.signal,
        projectId,
        estimateId,
        rowItemId: itemId,
        scope: imageUploadScope,
      });
      if (imageUploadAttemptRef.current === attemptId) {
        dispatchImageModal({ type: "upload:ready", uploadedImage: uploadedResult });
        await persistUploadedImage(uploadedResult, attemptId);
      }
    } catch (error) {
      if (imageUploadAttemptRef.current === attemptId) {
        dispatchImageModal(isUploadAbortError(error)
          ? { type: "upload:cancelled" }
          : { type: "upload:error", message: getUploadClientErrorMessage(error, uploadedResult ? "Could not save image to row." : "Could not upload image.") });
      }
    } finally {
      if (imageUploadAbortRef.current === abortController) imageUploadAbortRef.current = null;
    }
  }, [draftState, estimateId, imageUploadScope, itemId, persistUploadedImage, projectId]);

  useEffect(() => {
    if (!selectedImage) return;
    if (draftState) return;
    if (imageUploadState.state !== "selected") return;
    void startImageUpload(selectedImage);
  }, [draftState, imageUploadState.state, selectedImage, startImageUpload]);

  function handleImageFileChange(file: File | null | undefined) {
    if (!file) return;
    imageUploadAttemptRef.current += 1;
    imageUploadAbortRef.current?.abort();
    imageUploadAbortRef.current = null;
    const validationMessage = validateEstimateReferenceImage(file);
    if (validationMessage) {
      replaceSelectedImagePreview("");
      dispatchImageModal({ type: "file:error", message: validationMessage });
      return;
    }
    const previewUrl = URL.createObjectURL(file);
    replaceSelectedImagePreview(previewUrl);
    dispatchImageModal({
      type: "file:selected",
      file,
      previewUrl,
      message: draftState ? "Waiting for the component row to save before uploading image..." : "Image selected. Starting upload...",
    });
    onActiveChange(false);
    if (!draftState) void startImageUpload(file);
  }

  async function saveImageDraft() {
    if (imageModalBusy) return;
    if (selectedImage) {
      dispatchImageModal({ type: "file:selected", file: selectedImage, previewUrl: selectedImagePreview, message: "Image selected. Starting upload..." });
      onActiveChange(false);
      void startImageUpload(selectedImage);
      return;
    }
    if (!imageUrlDraftDirty) {
      closeImageModal();
      return;
    }
    try {
      await onCommitImageUrl(imageUrlDraft, null);
      closeImageModal();
    } catch (error) {
      dispatchImageModal({ type: "upload:error", message: getUploadClientErrorMessage(error, "Could not save image to row.") });
    }
  }

  return (
    <>
      <div className="relative size-11 shrink-0">
        <ActionTooltip label={imageModalBusy ? "Uploading reference image" : imageUrl ? "Change reference image" : "Add reference image"}>
          <Button
            type="button"
            variant="plain"
            size="icon-lg"
            className={cn(
              "relative grid size-11 cursor-pointer place-items-center overflow-hidden rounded-xs border border-transparent bg-neutral-100 bg-cover bg-center text-center !text-[8px] font-medium leading-3 text-tertiary transition hover:border-hairline hover:text-ink focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-focus/50 disabled:cursor-progress disabled:opacity-90",
              (imageUrl || selectedImagePreview) && "shadow-[inset_0_0_0_999px_rgba(0,0,0,0.08)]",
            )}
            style={thumbnailImageStyle}
            data-estimate-row-id={itemId}
            data-express-field="imageUrl"
            aria-label={imageUrl ? `Change reference image for ${editorLabel}` : `Add reference image for ${editorLabel}`}
            disabled={imageModalBusy}
            onClick={(event) => {
              event.stopPropagation();
              openImageModal();
            }}
          >
            {imageUrl || selectedImagePreview ? null : <ImageSquare size={18} weight="regular" aria-hidden="true" />}
            <span aria-hidden="true" className={cn("absolute inset-x-1 bottom-1 rounded-xs bg-white/86 px-1 py-0.5 opacity-0 transition group-hover:opacity-90 group-focus-within:opacity-90", !imageUrl && !selectedImagePreview && "static bg-transparent opacity-100")}>
              {imageUrl || selectedImagePreview ? "Change" : "Add image"}
            </span>
          </Button>
        </ActionTooltip>
        {showThumbnailUploadState ? (
          <div
            className={cn(
              "pointer-events-none absolute inset-0 z-10 flex flex-col items-center justify-center gap-1 rounded-xs bg-white/88 px-1 text-center text-[8px] font-medium leading-[10px] shadow-[inset_0_0_0_1px_rgba(0,0,0,0.08)]",
              thumbnailStatusRole === "alert" ? "text-danger" : "text-secondary",
            )}
            role={thumbnailStatusRole}
          >
            {imageModalBusy ? (
              <span className="size-4 animate-spin rounded-full border-2 border-secondary/25 border-t-secondary" aria-hidden="true" />
            ) : null}
            <span className={cn(imageModalBusy && "sr-only")}>{imageUploadState.message}</span>
            {imageUploadRetryable ? (
              <Button
                type="button"
                variant="outline"
                size="xs"
                className="pointer-events-auto mt-0.5 min-h-0 min-w-0 px-1.5 py-0.5 !text-[8px] leading-[10px] shadow-sm focus-visible:ring-1 focus-visible:ring-offset-0"
                aria-label="Retry upload"
                onClick={(event) => {
                  event.stopPropagation();
                  if (uploadedImage) {
                    const attemptId = imageUploadAttemptRef.current + 1;
                    imageUploadAttemptRef.current = attemptId;
                    void persistUploadedImage(uploadedImage, attemptId).catch((error) => {
                      if (imageUploadAttemptRef.current === attemptId) {
                        dispatchImageModal({ type: "upload:error", message: getUploadClientErrorMessage(error, "Could not save image to row.") });
                      }
                    });
                  } else if (selectedImage) void startImageUpload(selectedImage);
                }}
              >
                Retry
              </Button>
            ) : null}
          </div>
        ) : null}
      </div>
      <Modal
        open={imageModalOpen}
        onOpenChange={(open) => {
          if (open) {
            openImageModal();
            return;
          }
          if (imageModalBusy) return;
          closeImageModal();
        }}
        title="Reference image"
        description={`Upload or paste an image URL for ${editorLabel}.`}
        size="sm"
        closeLabel="Close reference image modal"
        closeOnEscape={!imageModalBusy}
        closeOnOverlayClick={!imageModalBusy}
        footer={(
          <>
            <Button type="button" variant="secondary" size="sm" onClick={imageModalBusy ? cancelImageUpload : closeImageModal}>
              {imageModalBusy ? "Cancel upload" : "Cancel"}
            </Button>
            <Button type="button" variant="primary" size="sm" onClick={saveImageDraft} disabled={imageModalBusy}>
              {imageModalBusy ? "Uploading..." : "Save image"}
            </Button>
          </>
        )}
      >
        <div className="space-y-3">
          <div
            className={cn(
              "relative aspect-[4/3] overflow-hidden rounded-xs border border-hairline bg-surfaceMuted bg-cover bg-center",
              imageModalBusy && "opacity-70",
            )}
            style={selectedImagePreview ? { backgroundImage: `url(${selectedImagePreview})` } : imageUrl ? imageStyle : undefined}
          >
            <div className={cn("absolute inset-0 grid place-items-center bg-cover bg-center", (selectedImagePreview || imageUrl) && "bg-transparent")}>
              {selectedImagePreview || imageUrl ? null : (
                <div className="flex flex-col items-center gap-2 text-tertiary">
                  <ImageSquare size={28} weight="regular" aria-hidden="true" />
                  <span className="text-[10px] font-medium leading-3">No image selected</span>
                </div>
              )}
            </div>
          </div>
          <input
            id={imageInputId}
            ref={imageFileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/avif"
            className="sr-only"
            disabled={imageModalBusy}
            aria-label="Upload reference image"
            onChange={(event) => {
              handleImageFileChange(event.target.files?.[0]);
              event.currentTarget.value = "";
            }}
          />
          <Button
            type="button"
            variant="secondary"
            size="sm"
            className="h-9 w-full min-w-0"
            aria-label={selectedImage ? `Upload image, selected ${selectedImage.name}` : "Upload image"}
            disabled={imageModalBusy}
            onClick={openImageFilePicker}
          >
            <UploadSimple size={16} weight="regular" aria-hidden="true" />
            {selectedImage ? selectedImage.name : "Upload image"}
          </Button>
          <div className="space-y-1">
            <label htmlFor={`${imageInputId}-url`} className="block text-[10px] font-medium leading-4 text-secondary">
              Or paste an image URL
            </label>
            <ControlInput
              id={`${imageInputId}-url`}
              type="url"
              value={imageUrlDraft}
              placeholder="https://..."
              disabled={imageModalBusy}
              onChange={(event) => {
                imageUploadAttemptRef.current += 1;
                imageUploadAbortRef.current?.abort();
                imageUploadAbortRef.current = null;
                replaceSelectedImagePreview("");
                dispatchImageModal({ type: "url:change", value: event.target.value });
              }}
              onKeyDown={(event) => {
                if (event.key !== "Enter") return;
                event.preventDefault();
                void saveImageDraft();
              }}
              aria-label="Reference image URL"
            />
          </div>
          {imageUploadState.message ? (
            <div className="space-y-1">
              <p
                className={cn("text-[10px] font-medium leading-4", getUploadClientStatusRole(imageUploadState) === "alert" ? "text-danger" : "text-secondary")}
                role={getUploadClientStatusRole(imageUploadState)}
              >
                {imageUploadState.message}
              </p>
              {selectedImage && isUploadClientRetryable(imageUploadState) ? (
                <Button type="button" variant="secondary" size="xs" className="h-6 rounded-xs px-2 text-[9px]" onClick={saveImageDraft}>
                  Retry upload
                </Button>
              ) : null}
            </div>
          ) : null}
        </div>
      </Modal>
    </>
  );
}

function ExpressMaterialEditor({
  item,
  rowIndex,
  editableRow,
  brandOptions = EMPTY_CATALOGUE_COMBOBOX_OPTIONS,
  supplierOptions = EMPTY_CATALOGUE_COMBOBOX_OPTIONS,
  projectId,
  estimateId,
  onChange,
  onCommit,
  onCommitImage,
  onRevert,
  onActiveChange,
  onSelectVariant,
  draftState,
  onRetryDraft,
  onDeleteDraft,
}: {
  item: EstimateRowItem;
  rowIndex: number;
  editableRow: EditableRowValue;
  brandOptions?: CreatableComboboxOption[];
  supplierOptions?: CreatableComboboxOption[];
  projectId?: string;
  estimateId?: string;
  onChange: (values: Partial<EditableRowValue>) => void;
  onCommit: (values: Partial<EditableRowValue>) => void;
  onCommitImage?: (values: Partial<EditableRowValue>) => Promise<void>;
  onRevert: (field: ExpressEditableField) => void;
  onActiveChange: (active: boolean) => void;
  onSelectVariant?: (option: MaterialVariantOption) => void;
  draftState?: ExpressInsertDraftState;
  onRetryDraft: () => void;
  onDeleteDraft: () => void;
}) {
  const commitField = (field: ExpressEditableField, value: string) => onCommit({ [field]: value });
  const editorLabel = editableRow.name || item.material || "Project Component";
  const activeVariantLabel = getActiveMaterialVariantLabel(item);
  const canEditActiveVariantLabel = Boolean(activeVariantLabel)
    && classifyEstimateRowSource(item) !== "linked-library"
    && (isExpressComponentRow(item) || item.linkState === "detached" || Boolean(readProjectComponentProjectionMetadata(item.metadata)));
  const editableActiveVariantLabel = editableRow.priceOptionLabel ?? activeVariantLabel ?? "";
  const editableBrand = editableRow.brand ?? "";
  const imageUrl = editableRow.imageUrl.trim();
  const imageStyle = imageUrl ? { backgroundImage: `url(${imageUrl})` } : undefined;
  const cardInputClass = "h-4 border-transparent bg-transparent px-0 py-0 shadow-none hover:border-hairline focus:border-hairline focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-focus/40";
  const catalogueMetaInputClass =
    "h-4 w-full rounded-none border-transparent bg-transparent px-0 py-0 pr-0 text-left shadow-none placeholder:text-tertiary hover:border-transparent hover:bg-transparent focus:border-transparent focus:bg-transparent focus-visible:ring-0";
  const selectedBrandId = getSelectedComponentCatalogueOptionId(editableBrand, brandOptions);
  const selectedSupplierId = getSelectedComponentCatalogueOptionId(editableRow.supplier, supplierOptions);

  function handleCatalogueFieldChange(field: "brand" | "supplier", change: CreatableComboboxChange) {
    const value = getComponentCatalogueComboboxValue(change);
    if (field === "brand") {
      onChange({ brand: value });
      if (change.reason !== "input") onCommit({ brand: value });
      return;
    }
    onChange({ supplier: value });
    if (change.reason !== "input") onCommit({ supplier: value });
  }

  function handleUnitFieldChange(change: CreatableComboboxChange) {
    const value = getUnitComboboxValue(change);
    onChange({ unit: value });
    if (change.reason !== "input") onCommit({ unit: value });
  }

  function commitActiveVariantLabel(value: string) {
    const nextVariantLabel = value.trim();
    if (!nextVariantLabel) {
      onRevert("priceOptionLabel");
      return;
    }
    const activeVariantId = getActiveMaterialVariantId(item, getMaterialVariantOptions(item));
    const priceOptions = item.priceOptions?.map((option) => (
      option.id === activeVariantId ? { ...option, label: nextVariantLabel } : option
    ));
    const patch: Partial<EditableRowValue> = {
      priceOptionLabel: nextVariantLabel,
      ...(priceOptions ? { priceOptions } : {}),
    };
    onChange(patch);
    onCommit(patch);
  }

  return (
    <div
      className="flex h-full flex-col justify-between gap-2 text-[10px] leading-3 text-secondary"
      data-express-editor="true"
      aria-label={`${editorLabel} inline editor`}
    >
      {draftState === "creating" ? (
        <p className="sr-only" role="status">
          Creating component row
        </p>
      ) : null}
      {draftState === "failed" ? (
        <div className="rounded-xs border border-dangerSoft bg-dangerSoft/50 px-2 py-1.5" role="alert">
          <p className="text-[9px] font-medium leading-3 text-danger">Component row was not created. Retry or delete this draft.</p>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            <Button
              type="button"
              variant="secondary"
              size="xs"
              className="h-6 rounded-xs px-2 text-[9px]"
              onClick={(event) => {
                event.stopPropagation();
                onRetryDraft();
              }}
            >
              Retry
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="xs"
              className="h-6 rounded-xs px-2 text-[9px] text-danger hover:bg-dangerSoft"
              onClick={(event) => {
                event.stopPropagation();
                onDeleteDraft();
              }}
            >
              Delete draft
            </Button>
          </div>
        </div>
      ) : null}
      <EstimateMaterialCardFrame
        image={(
          <ExpressMaterialImageEditor
            draftState={draftState}
            editableImageUrl={editableRow.imageUrl}
            editorLabel={editorLabel}
            imageStyle={imageStyle}
            imageUrl={imageUrl}
            itemId={item.id}
            projectId={projectId}
            estimateId={estimateId}
            imageUploadScope={classifyEstimateRowSource(item) === "linked-library" ? "library" : "project"}
            onActiveChange={onActiveChange}
            onCommitImageUrl={async (nextImageUrl, imageAsset) => {
              const normalizedImageUrl = nextImageUrl.trim();
              const imagePatch = { imageUrl: normalizedImageUrl, imageAsset: imageAsset ?? null };
              onChange(imagePatch);
              if (onCommitImage) await onCommitImage(imagePatch);
              else await Promise.resolve(onCommit(imagePatch));
            }}
          />
        )}
        name={(
          <div className="flex min-w-0 items-baseline gap-1">
            <ControlInput
              type="text"
              value={editableRow.name}
              onChange={(event) => onChange({ name: event.target.value })}
              onFocus={() => onActiveChange(true)}
              onBlur={(event) => {
                commitField("name", event.currentTarget.value);
                onActiveChange(false);
              }}
              onKeyDown={(event) => handleExpressFieldKeyDown(event, { field: "name", onRevert })}
              data-estimate-row-id={item.id}
              data-express-field="name"
              aria-label={activeVariantLabel ? `Component name, active variant ${activeVariantLabel}` : "Component name"}
              placeholder="Component name"
              className={cn(cardInputClass, "!w-auto min-w-[8ch] max-w-full shrink field-sizing-content !text-[12px] font-medium leading-4 text-ink placeholder:text-ink")}
            />
            {activeVariantLabel ? (
              <>
                <span className="shrink-0 text-[12px] font-normal leading-4 text-tertiary" aria-hidden="true">·</span>
                {canEditActiveVariantLabel ? (
                  <ControlInput
                    type="text"
                    value={editableActiveVariantLabel}
                    onChange={(event) => onChange({ priceOptionLabel: event.target.value })}
                    onFocus={() => onActiveChange(true)}
                    onBlur={(event) => {
                      commitActiveVariantLabel(event.currentTarget.value);
                      onActiveChange(false);
                    }}
                    onKeyDown={(event) => handleExpressFieldKeyDown(event, { field: "priceOptionLabel", onRevert })}
                    data-estimate-row-id={item.id}
                    data-express-field="priceOptionLabel"
                    aria-label={`Active variant name for ${editorLabel}`}
                    aria-required="true"
                    className={cn(cardInputClass, "!w-auto min-w-[4ch] max-w-full shrink field-sizing-content !text-[12px] font-normal leading-4 text-secondary")}
                  />
                ) : (
                  <span className="max-w-[40%] shrink truncate text-[12px] font-normal leading-4 text-secondary" title={activeVariantLabel}>
                    {activeVariantLabel}
                  </span>
                )}
              </>
            ) : null}
          </div>
        )}
        brand={(
          <CreatableCombobox
            value={editableBrand}
            selectedId={selectedBrandId}
            options={brandOptions}
            onChange={(change) => handleCatalogueFieldChange("brand", change)}
            onInputFocus={() => onActiveChange(true)}
            onInputBlur={(event) => {
              commitField("brand", event.currentTarget.value);
              onActiveChange(false);
            }}
            onInputKeyDown={(event) => handleExpressFieldKeyDown(event, { field: "brand", onRevert })}
            inputDataAttributes={{
              "data-estimate-row-id": item.id,
              "data-express-field": "brand",
            }}
            ariaLabel="Brand"
            placeholder="Brand"
            emptyLabel="No brands yet"
            createLabel={(value) => `Add brand "${value}"`}
            showClearButton={false}
            className="w-full max-w-full"
            inputClassName={cn(catalogueMetaInputClass, "!text-[9px] font-medium leading-3 text-secondary")}
          />
        )}
        supplier={(
          <CreatableCombobox
            value={editableRow.supplier}
            selectedId={selectedSupplierId}
            options={supplierOptions}
            onChange={(change) => handleCatalogueFieldChange("supplier", change)}
            onInputFocus={() => onActiveChange(true)}
            onInputBlur={(event) => {
              commitField("supplier", event.currentTarget.value);
              onActiveChange(false);
            }}
            onInputKeyDown={(event) => handleExpressFieldKeyDown(event, { field: "supplier", onRevert })}
            inputDataAttributes={{
              "data-estimate-row-id": item.id,
              "data-express-field": "supplier",
            }}
            ariaLabel="Supplier"
            placeholder="Supplier"
            emptyLabel="No suppliers yet"
            createLabel={(value) => `Add supplier "${value}"`}
            showClearButton={false}
            className="w-full"
            inputClassName={cn(catalogueMetaInputClass, "!text-[10px] font-normal leading-3 text-tertiary")}
          />
        )}
        variant={onSelectVariant ? (
          <MaterialVariantControl item={item} canEditEstimate onSelectVariant={onSelectVariant} />
        ) : undefined}
        cost={(
          <div className={MATERIAL_COST_SLOT_CLASS}>
            <MoneyInput
              value={editableRow.unitCost}
              onChange={(value) => onChange({ unitCost: value })}
              onFocus={() => onActiveChange(true)}
              onBlur={(event) => {
                commitField("unitCost", event.currentTarget.value);
                onActiveChange(false);
              }}
              onKeyDown={(event) => handleExpressFieldKeyDown(event, { field: "unitCost", onRevert })}
              data-estimate-row-id={item.id}
              data-estimate-row-index={rowIndex}
              data-express-field="unitCost"
              data-estimate-price-input="unit-cost"
              ariaLabel="Unit cost"
              align="right"
            />
          </div>
        )}
        description={(
          <textarea
            value={editableRow.description}
            onChange={(event) => onChange({ description: event.target.value })}
            onFocus={() => onActiveChange(true)}
            onBlur={(event) => {
              commitField("description", event.currentTarget.value);
              onActiveChange(false);
            }}
            onKeyDown={(event) => handleExpressFieldKeyDown(event, { field: "description", onRevert })}
            data-estimate-row-id={item.id}
            data-express-field="description"
            aria-label="Component description"
            placeholder="Description"
            rows={1}
            className="h-4 min-h-4 flex-1 resize-none overflow-hidden rounded-xs border border-transparent bg-transparent p-0 text-[10px] leading-4 text-secondary/60 outline-none placeholder:text-tertiary transition hover:border-hairline hover:text-secondary focus:border-hairline focus:text-secondary focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-focus/40"
          />
        )}
        unit={(
          <div className={cn(MATERIAL_UNIT_LABEL_CLASS, "w-full")} data-estimate-material-unit-label="true">
            <span className={MATERIAL_UNIT_SLASH_CLASS} data-estimate-material-unit-slash="true" aria-hidden="true">/</span>
            <CreatableCombobox
              value={editableRow.unit}
              selectedId={getSelectedUnitId(editableRow.unit, COMPONENT_UNIT_COMBOBOX_OPTIONS)}
              options={COMPONENT_UNIT_COMBOBOX_OPTIONS}
              onChange={handleUnitFieldChange}
              onInputFocus={() => onActiveChange(true)}
              onInputBlur={(event) => {
                commitField("unit", event.currentTarget.value);
                onActiveChange(false);
              }}
              onInputKeyDown={(event) => handleExpressFieldKeyDown(event, { field: "unit", onRevert })}
              inputDataAttributes={{
                "data-estimate-row-id": item.id,
                "data-express-field": "unit",
              }}
              ariaLabel="Unit"
              placeholder="unit"
              emptyLabel="No units found"
              createLabel={(value) => `Add unit "${value}"`}
              showClearButton={false}
              optionPresentation="unit"
              dropdownPlacement="top"
              className="w-full"
              inputClassName={cn(cardInputClass, "h-4 w-full pr-0 text-right !text-[10px] font-medium leading-3 text-tertiary placeholder:text-tertiary")}
            />
          </div>
        )}
      />
    </div>
  );
}

export function EstimateMaterialCell({
  canEditEstimate = true,
  canManageLibrary = false,
  componentSyncPending = false,
  item,
  rowIndex,
  editableRow,
  brandOptions = EMPTY_CATALOGUE_COMBOBOX_OPTIONS,
  supplierOptions = EMPTY_CATALOGUE_COMBOBOX_OPTIONS,
  projectId,
  estimateId,
  isReplaceTarget,
  onExpressEditorActiveChange,
  onExpressFieldChange,
  onExpressFieldCommit,
  onExpressImageCommit,
  onExpressFieldRevert,
  onReplaceDragOver,
  onReplaceDragLeave,
  onReplace,
  onClearComponent,
  onRequestProjectSpecific,
  onPromoteToLibrary,
  promoteToLibraryPending,
  onMoveComponent,
  onOpenReplacePicker,
  onOpenMovePicker,
  onOpenComponentEditor,
  onSelectVariant,
  expressDraftState,
  onRetryExpressDraft,
  onDeleteExpressDraft,
}: {
  canEditEstimate?: boolean;
  canManageLibrary?: boolean;
  componentSyncPending?: boolean;
  item: EstimateRowItem;
  rowIndex: number;
  editableRow: EditableRowValue;
  brandOptions?: CreatableComboboxOption[];
  supplierOptions?: CreatableComboboxOption[];
  projectId?: string;
  estimateId?: string;
  isReplaceTarget: boolean;
  onExpressEditorActiveChange: (active: boolean) => void;
  onExpressFieldChange: (values: Partial<EditableRowValue>) => void;
  onExpressFieldCommit: (values: Partial<EditableRowValue>) => void;
  onExpressImageCommit?: (values: Partial<EditableRowValue>) => Promise<void>;
  onExpressFieldRevert: (field: ExpressEditableField) => void;
  onReplaceDragOver: () => void;
  onReplaceDragLeave: () => void;
  onReplace: (libraryItem: EstimateRowItem) => void;
  onClearComponent: () => void;
  onRequestProjectSpecific: () => void;
  onPromoteToLibrary: () => void;
  promoteToLibraryPending?: boolean;
  onMoveComponent: (sourceRowItemId: string, targetRowItemId: string, movedItem: EstimateRowItem) => void;
  onOpenReplacePicker?: (opener: HTMLElement) => void;
  onOpenMovePicker?: (opener: HTMLElement) => void;
  onOpenComponentEditor?: (opener: HTMLElement) => void;
  onSelectVariant?: (option: MaterialVariantOption) => void;
  expressDraftState?: ExpressInsertDraftState;
  onRetryExpressDraft: () => void;
  onDeleteExpressDraft: () => void;
}) {
  const surfaceVariant = useEstimateSurfaceVariant();
  const componentActionTriggerRef = useRef<HTMLButtonElement | null>(null);
  function handleReplacementDragOver(event: DragEvent<HTMLDivElement>) {
    if (!canEditEstimate) return;
    if (event.dataTransfer.types.includes(LIBRARY_ITEM_DRAG_MIME_TYPE)) {
      event.preventDefault();
      event.dataTransfer.dropEffect = "copy";
      onReplaceDragOver();
      return;
    }

    if (event.dataTransfer.types.includes(ESTIMATE_COMPONENT_DRAG_MIME_TYPE)) {
      event.preventDefault();
      event.dataTransfer.dropEffect = "move";
      onReplaceDragOver();
    }
  }

  function handleReplacementDrop(event: DragEvent<HTMLDivElement>) {
    if (!canEditEstimate) return;
    const movedComponent = readEstimateComponentDragPayload(event);
    if (movedComponent) {
      event.preventDefault();
      event.stopPropagation();
      event.dataTransfer.dropEffect = "move";
      onReplaceDragLeave();
      onMoveComponent(movedComponent.rowItemId, item.id, movedComponent.item);
      return;
    }

    const result = readEstimateLibraryItemDragPayload(event.dataTransfer.getData(LIBRARY_ITEM_DRAG_MIME_TYPE));
    if (!result.ok) return;
    event.preventDefault();
    event.stopPropagation();
    onReplaceDragLeave();
    onReplace(result.item);
  }

  function handleComponentDragStart(event: DragEvent<HTMLButtonElement>) {
    if (!canEditEstimate) return;
    event.stopPropagation();
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData(ESTIMATE_COMPONENT_DRAG_MIME_TYPE, JSON.stringify({ rowItemId: item.id, item } satisfies EstimateComponentDragPayload));
  }

  const showProjectSpecificAction = canEditEstimate && canMakeProjectSpecific(item);
  const showPromoteAction = canEditEstimate && canPromoteEstimateRowToLibrary(item);
  const linkedSharedComponent = Boolean(item.sourceLibraryItemId)
    && item.linkState !== "detached"
    && item.linkState !== "unlinked";
  const showInlineComponentEditor = isExpressComponentRow(item)
    || isBlankEstimateRowItem(item)
    || (linkedSharedComponent && canManageLibrary);
  const showInlineVariantControl = linkedSharedComponent || isExpressComponentRow(item);
  const componentLabel = showInlineComponentEditor ? (editableRow.name || "Project Component") : (item.material || "component");
  const sourceTone = getComponentSourceTone(item);
  const sourceLabel = getComponentSourceLabel(sourceTone);
  const componentInteractionEnabled = canEditEstimate && !componentSyncPending;
  const canOpenComponentEditor = componentInteractionEnabled
    && Boolean(onOpenComponentEditor)
    && (!linkedSharedComponent || canManageLibrary);
  const componentEditorLabel = linkedSharedComponent ? "Edit shared library component" : "Edit component";
  const showComponentActionMenu = showProjectSpecificAction
    || showPromoteAction
    || Boolean(canEditEstimate && onOpenReplacePicker)
    || Boolean(canEditEstimate && onOpenMovePicker)
    || canEditEstimate
    || canOpenComponentEditor;

  return (
    <div
      className={cn(
        "group relative flex h-full flex-col gap-2 overflow-visible py-2 pr-2 pl-3 transition",
        surfaceVariant === "glass" ? "hover:bg-white/40" : "bg-white hover:bg-neutral-50",
        isReplaceTarget && "bg-blue-100 ring-2 ring-inset ring-accent",
      )}
      onDragOver={componentInteractionEnabled ? handleReplacementDragOver : undefined}
      onDragLeave={componentInteractionEnabled ? onReplaceDragLeave : undefined}
      onDrop={componentInteractionEnabled ? handleReplacementDrop : undefined}
      data-replace-target-active={isReplaceTarget ? "true" : undefined}
      data-component-source={sourceTone}
      data-component-sync-pending={componentSyncPending ? "true" : undefined}
      aria-busy={componentSyncPending ? true : undefined}
      aria-label={canEditEstimate ? `${componentLabel} replaceable estimate component` : `${componentLabel} estimate component`}
      title={canEditEstimate ? `${sourceLabel}. Drop another component here to replace this component` : sourceLabel}
    >
      <span
        className={cn("pointer-events-none absolute inset-y-0 left-0 w-[3px] bg-divider transition-colors duration-150", getComponentSourceRailClass(sourceTone))}
        aria-hidden="true"
      />
      <span className="sr-only">{sourceLabel}</span>
      <div
        className={cn("absolute top-1 right-1 z-10 flex items-center gap-0.5", componentSyncPending && "invisible")}
        inert={componentSyncPending}
        aria-hidden={componentSyncPending || undefined}
        aria-label={`Component actions for ${componentLabel}`}
      >
        {showComponentActionMenu ? (
          <DropdownMenu
            align="end"
            side="bottom"
            className="min-w-48"
            trigger={(
              <IconButton
                ref={componentActionTriggerRef}
                type="button"
                variant="plain"
                size="icon-xs"
                className="grid size-5 cursor-pointer place-items-center rounded-xs text-tertiary transition hover:bg-surfaceMuted hover:text-ink focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-focus/50 [@media(pointer:coarse)]:size-10"
                label={`Open component actions for ${componentLabel}`}
                title={undefined}
                onClick={(event) => event.stopPropagation()}
                icon={<DotsThree size={14} weight="bold" aria-hidden="true" />}
              />
            )}
          >
            {canOpenComponentEditor && onOpenComponentEditor ? (
              <DropdownMenu.Item
                label={componentEditorLabel}
                icon={<PencilSimple size={14} weight="regular" aria-hidden="true" />}
                onClick={() => {
                  const opener = componentActionTriggerRef.current;
                  if (opener) onOpenComponentEditor(opener);
                }}
              />
            ) : null}
            {canEditEstimate && onOpenReplacePicker ? (
              <DropdownMenu.Item
                label="Replace component"
                icon={<ArrowsClockwise size={14} weight="regular" aria-hidden="true" />}
                onClick={() => {
                  const opener = componentActionTriggerRef.current;
                  if (opener) onOpenReplacePicker(opener);
                }}
              />
            ) : null}
            {canEditEstimate && onOpenMovePicker ? (
              <DropdownMenu.Item
                label="Move component"
                icon={<ArrowsOutCardinal size={14} weight="regular" aria-hidden="true" />}
                onClick={() => {
                  const opener = componentActionTriggerRef.current;
                  if (opener) onOpenMovePicker(opener);
                }}
              />
            ) : null}
            {showProjectSpecificAction ? (
              <DropdownMenu.Item
                label="Make project component"
                icon={<Cube size={14} weight="regular" aria-hidden="true" />}
                onClick={onRequestProjectSpecific}
              />
            ) : null}
            {showPromoteAction ? (
              <DropdownMenu.Item
                label="Promote to library"
                icon={<StackPlus size={14} weight="regular" aria-hidden="true" />}
                disabled={promoteToLibraryPending}
                onClick={onPromoteToLibrary}
              />
            ) : null}
            {canEditEstimate ? (
              <DropdownMenu.Item
                label="Delete component"
                icon={<Trash size={14} weight="regular" aria-hidden="true" />}
                destructive
                onClick={onClearComponent}
              />
            ) : null}
          </DropdownMenu>
        ) : null}
        {canEditEstimate ? (
          <ActionTooltip label="Drag component">
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              className="size-6 cursor-grab rounded-xs p-0 text-tertiary hover:bg-surfaceMuted hover:text-ink active:cursor-grabbing active:bg-surfaceMuted [@media(pointer:coarse)]:hidden"
              aria-label={`Drag component ${componentLabel}`}
              draggable
              onClick={(event: MouseEvent<HTMLButtonElement>) => event.stopPropagation()}
              onDragStart={handleComponentDragStart}
            >
              <DotsSixVertical size={11} weight="regular" aria-hidden="true" />
            </Button>
          </ActionTooltip>
        ) : null}
      </div>
      <div className={cn("contents", componentSyncPending && "invisible")} inert={componentSyncPending} aria-hidden={componentSyncPending || undefined}>
        {canEditEstimate && showInlineComponentEditor ? (
          <ExpressMaterialEditor
            key={`${item.id}:${editableRow.imageUrl}`}
            item={item}
            rowIndex={rowIndex}
            editableRow={editableRow}
            brandOptions={brandOptions}
            supplierOptions={supplierOptions}
            projectId={projectId}
            estimateId={estimateId}
            onChange={onExpressFieldChange}
            onCommit={onExpressFieldCommit}
            onCommitImage={onExpressImageCommit}
            onRevert={onExpressFieldRevert}
            onActiveChange={onExpressEditorActiveChange}
            onSelectVariant={showInlineVariantControl ? onSelectVariant : undefined}
            draftState={expressDraftState}
            onRetryDraft={onRetryExpressDraft}
            onDeleteDraft={onDeleteExpressDraft}
          />
        ) : (
          <EstimateMaterialCardContent item={item} canEditEstimate={canEditEstimate} onSelectVariant={onSelectVariant} />
        )}
      </div>
      {componentSyncPending ? <EstimateMaterialCardSyncSkeleton /> : null}
    </div>
  );
}

export function MoneyInput({
  value,
  onChange,
  ariaLabel,
  align = "right",
  onFocus,
  onBlur,
  ...cellProps
}: {
  value: string;
  onChange: (value: string) => void;
  ariaLabel: string;
  align?: "left" | "center" | "right";
} & {
  "data-estimate-row-index"?: number;
  "data-estimate-row-id"?: string;
  "data-estimate-cell-index"?: number;
  "data-express-field"?: string;
  "data-estimate-price-input"?: "unit-cost";
  disabled?: boolean;
  onFocus?: InputHTMLAttributes<HTMLInputElement>["onFocus"];
  onBlur?: InputHTMLAttributes<HTMLInputElement>["onBlur"];
  onKeyDown?: InputHTMLAttributes<HTMLInputElement>["onKeyDown"];
}) {
  const [isFocused, setIsFocused] = useState(false);

  return (
    <ControlInput
      type="text"
      inputMode="decimal"
      value={isFocused ? value : formatEditableMoney(value)}
      onFocus={(event) => {
        setIsFocused(true);
        onFocus?.(event);
      }}
      onBlur={(event) => {
        setIsFocused(false);
        onBlur?.(event);
      }}
      onChange={(event) => onChange(event.target.value)}
      aria-label={ariaLabel}
      align={align}
      className="border-0 !bg-transparent p-0 !text-[10px] font-medium leading-3 tabular-nums text-ink shadow-none focus-visible:ring-0"
      {...cellProps}
    />
  );
}
