"use client";

import { useEffect, useId, useReducer, useRef, useState, type CSSProperties, type DragEvent, type InputHTMLAttributes, type KeyboardEvent, type MouseEvent, type ReactNode } from "react";
import { ArrowsClockwise, ArrowsOutCardinal, Cube, DotsSixVertical, DotsThreeVertical, ImageSquare, StackPlus, Trash, UploadSimple } from "@phosphor-icons/react/dist/ssr";

import { Button } from "@/components/ui/button";
import { ControlInput } from "@/components/ui/control-input";
import { Modal } from "@/components/ui/modal";
import { Tooltip } from "@/components/ui/overlays/tooltip";
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

const MATERIAL_UNIT_SLOT_CLASS =
  "flex w-16 shrink-0 items-center justify-end whitespace-nowrap text-right text-[10px] font-medium leading-3 text-tertiary";
const MATERIAL_COST_SLOT_CLASS = "w-[112px] shrink-0";
const MATERIAL_TEXT_RESERVE_CLASS = "min-w-0 pr-[136px]";
const ESTIMATE_IMAGE_UPLOAD_MAX_BYTES = 12 * 1024 * 1024;
const ESTIMATE_IMAGE_UPLOAD_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/avif"]);

type EstimateImageModalState = {
  open: boolean;
  imageUrlDraft: string;
  imageUrlDraftDirty: boolean;
  selectedImage: File | null;
  selectedImagePreview: string;
  uploadState: UploadClientState;
};

type EstimateImageModalAction =
  | { type: "open"; imageUrl: string }
  | { type: "close" }
  | { type: "url:change"; value: string }
  | { type: "file:selected"; file: File; previewUrl: string }
  | { type: "file:error"; message: string }
  | { type: "upload:start" }
  | { type: "upload:error"; message: string }
  | { type: "upload:cancelled" };

const INITIAL_ESTIMATE_IMAGE_MODAL_STATE: EstimateImageModalState = {
  open: false,
  imageUrlDraft: "",
  imageUrlDraftDirty: false,
  selectedImage: null,
  selectedImagePreview: "",
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
        uploadState: reduceUploadClientState(state.uploadState, { type: "reset" }),
      };
    case "file:selected":
      return {
        ...state,
        imageUrlDraftDirty: false,
        selectedImage: action.file,
        selectedImagePreview: action.previewUrl,
        uploadState: reduceUploadClientState(state.uploadState, { type: "select", message: `${action.file.name} selected.` }),
      };
    case "file:error":
      return {
        ...state,
        selectedImage: null,
        selectedImagePreview: "",
        uploadState: reduceUploadClientState(state.uploadState, { type: "blocking-error", message: action.message }),
      };
    case "upload:start":
      return {
        ...state,
        uploadState: reduceUploadClientState(state.uploadState, { type: "uploading", message: "Uploading image..." }),
      };
    case "upload:error":
      return {
        ...state,
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
  url: string;
  thumbnailUrl?: string;
  imageAsset?: EstimateRowImageAssetDescriptor;
};

async function uploadEstimateReferenceImage(
  file: File,
  options: { signal?: AbortSignal; projectId?: string; estimateId?: string; rowItemId?: string } = {},
): Promise<UploadedEstimateImage> {
  if (!options.projectId || !options.estimateId) {
    throw new Error("Project and estimate are required to upload a reference image.");
  }
  const formData = new FormData();
  formData.set("projectId", options.projectId);
  formData.set("estimateId", options.estimateId);
  if (options.rowItemId) formData.set("rowItemId", options.rowItemId);
  formData.set("file", file);
  return postUploadFormData<UploadedEstimateImage>("/api/estimate-row-images", formData, {
    signal: options.signal,
    fallbackMessage: "Could not upload image.",
    timeoutMessage: "Image upload timed out. Try again.",
  });
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

function EstimateMaterialCardFrame({
  image,
  name,
  supplier,
  cost,
  description,
  unit,
}: {
  image: ReactNode;
  name: ReactNode;
  supplier: ReactNode;
  cost: ReactNode;
  description: ReactNode;
  unit: ReactNode;
}) {
  return (
    <>
      <div className="flex gap-2">
        {image}
        <div className="flex min-w-0 flex-1 flex-col">
          <div className={MATERIAL_TEXT_RESERVE_CLASS}>
            {name}
            {supplier}
          </div>
          <div className="flex flex-1 items-start justify-end">
            {cost}
          </div>
        </div>
      </div>
      <div className="flex items-start justify-between gap-2">
        {description}
        <div className={MATERIAL_UNIT_SLOT_CLASS} data-estimate-material-unit-slot="true">
          {unit}
        </div>
      </div>
    </>
  );
}

function EstimateMaterialCardContent({ item }: { item: EstimateMaterialCardItem }) {
  return (
    <EstimateMaterialCardFrame
      image={(
        <div
          className="size-14 shrink-0 rounded-xs bg-neutral-100 bg-cover bg-center"
          style={{ backgroundImage: `url(${getMaterialCardImageUrl(item)})` }}
          aria-label={`${item.material} reference image`}
        />
      )}
      name={<p className="truncate text-[11px] font-medium leading-4 text-ink">{item.material}</p>}
      supplier={<p className="truncate text-[10px] font-medium leading-4 text-tertiary">{item.supplier}</p>}
      cost={<p className="whitespace-nowrap text-[9px] font-medium leading-4 tabular-nums text-ink">{pesoFormatter.format(item.itemCost).replace("₱", "₱ ")}</p>}
      description={(
        <p className="truncate text-[10px] leading-4 text-secondary/60 transition-opacity group-hover:text-secondary" title={item.description}>
          {item.description}
        </p>
      )}
      unit={<p className="min-w-0 max-w-full truncate text-right" data-estimate-material-unit-label="true">/ {item.unit}</p>}
    />
  );
}

type ExpressEditableField = "name" | "description" | "supplier" | "unit" | "unitCost" | "imageUrl" | "sourceUrl";

function handleExpressFieldKeyDown(
  event: KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>,
  options: { field: ExpressEditableField; onCommit: () => void; onRevert: (field: ExpressEditableField) => void; multiline?: boolean },
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

  if (event.key === "Enter" && (!options.multiline || event.metaKey || event.ctrlKey)) {
    event.preventDefault();
    event.stopPropagation();
    options.onCommit();
  }
}

function ExpressMaterialImageEditor({
  editableImageUrl,
  editorLabel,
  imageStyle,
  imageUrl,
  itemId,
  projectId,
  estimateId,
  onActiveChange,
  onCommitImageUrl,
}: {
  editableImageUrl: string;
  editorLabel: string;
  imageStyle?: CSSProperties;
  imageUrl: string;
  itemId: string;
  projectId?: string;
  estimateId?: string;
  onActiveChange: (active: boolean) => void;
  onCommitImageUrl: (nextImageUrl: string, imageAsset?: EstimateRowImageAssetDescriptor | null) => void;
}) {
  const imageInputId = useId();
  const [imageModal, dispatchImageModal] = useReducer(estimateImageModalReducer, INITIAL_ESTIMATE_IMAGE_MODAL_STATE);
  const selectedImagePreviewRef = useRef("");
  const imageUploadAbortRef = useRef<AbortController | null>(null);
  const imageUploadAttemptRef = useRef(0);
  const { imageUrlDraft, imageUrlDraftDirty, open: imageModalOpen, selectedImage, selectedImagePreview, uploadState: imageUploadState } = imageModal;
  const imageModalBusy = isUploadClientBusy(imageUploadState);

  useEffect(() => () => {
    imageUploadAttemptRef.current += 1;
    imageUploadAbortRef.current?.abort();
    if (selectedImagePreviewRef.current) URL.revokeObjectURL(selectedImagePreviewRef.current);
  }, []);

  function replaceSelectedImagePreview(nextPreviewUrl: string) {
    if (selectedImagePreviewRef.current === nextPreviewUrl) return;
    if (selectedImagePreviewRef.current) URL.revokeObjectURL(selectedImagePreviewRef.current);
    selectedImagePreviewRef.current = nextPreviewUrl;
  }

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
    dispatchImageModal({ type: "file:selected", file, previewUrl });
  }

  async function saveImageDraft() {
    if (imageModalBusy) return;
    if (selectedImage) {
      const attemptId = imageUploadAttemptRef.current + 1;
      imageUploadAttemptRef.current = attemptId;
      const abortController = new AbortController();
      imageUploadAbortRef.current = abortController;
      dispatchImageModal({ type: "upload:start" });
      try {
        const uploadedImage = await uploadEstimateReferenceImage(selectedImage, {
          signal: abortController.signal,
          projectId,
          estimateId,
          rowItemId: itemId,
        });
        if (imageUploadAttemptRef.current !== attemptId) return;
        onCommitImageUrl(uploadedImage.url, uploadedImage.imageAsset ?? null);
        replaceSelectedImagePreview("");
        dispatchImageModal({ type: "close" });
        onActiveChange(false);
      } catch (error) {
        if (imageUploadAttemptRef.current !== attemptId) return;
        dispatchImageModal(isUploadAbortError(error)
          ? { type: "upload:cancelled" }
          : { type: "upload:error", message: getUploadClientErrorMessage(error, "Could not upload image.") });
      } finally {
        if (imageUploadAbortRef.current === abortController) imageUploadAbortRef.current = null;
      }
      return;
    }
    if (imageUrlDraftDirty) onCommitImageUrl(imageUrlDraft, null);
    closeImageModal();
  }

  return (
    <>
      <ActionTooltip label={imageUrl ? "Change reference image" : "Add reference image"}>
        <button
          type="button"
          className={cn(
            "relative grid size-14 shrink-0 place-items-center overflow-hidden rounded-xs border border-transparent bg-neutral-100 bg-cover bg-center text-center text-[8px] font-medium leading-3 text-tertiary transition hover:border-hairline hover:text-ink focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-focus/50",
            imageUrl && "shadow-[inset_0_0_0_999px_rgba(0,0,0,0.08)]",
          )}
          style={imageStyle}
          data-estimate-row-id={itemId}
          data-express-field="imageUrl"
          aria-label={imageUrl ? `Change reference image for ${editorLabel}` : `Add reference image for ${editorLabel}`}
          onClick={(event) => {
            event.stopPropagation();
            openImageModal();
          }}
        >
          {imageUrl ? null : <ImageSquare size={18} weight="regular" aria-hidden="true" />}
          <span aria-hidden="true" className={cn("absolute inset-x-1 bottom-1 rounded-xs bg-white/86 px-1 py-0.5 opacity-0 transition group-hover:opacity-90 group-focus-within:opacity-90", !imageUrl && "static bg-transparent opacity-100")}>
            {imageUrl ? "Change" : "Add image"}
          </span>
        </button>
      </ActionTooltip>
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
          <label
            htmlFor={imageInputId}
            className={cn(
              "inline-flex h-9 w-full cursor-pointer items-center justify-center gap-2 rounded-xs border border-hairline bg-white px-2 text-[10px] font-medium text-ink transition hover:bg-surfaceMuted focus-within:ring-2 focus-within:ring-focus",
              imageModalBusy && "pointer-events-none opacity-60",
            )}
          >
            <UploadSimple size={13} weight="regular" aria-hidden="true" />
            {selectedImage ? selectedImage.name : "Upload image"}
          </label>
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
  editableRow,
  projectId,
  estimateId,
  onChange,
  onCommit,
  onRevert,
  onActiveChange,
  draftState,
  onRetryDraft,
  onDeleteDraft,
}: {
  item: EstimateRowItem;
  editableRow: EditableRowValue;
  projectId?: string;
  estimateId?: string;
  onChange: (values: Partial<EditableRowValue>) => void;
  onCommit: (values: Partial<EditableRowValue>) => void;
  onRevert: (field: ExpressEditableField) => void;
  onActiveChange: (active: boolean) => void;
  draftState?: ExpressInsertDraftState;
  onRetryDraft: () => void;
  onDeleteDraft: () => void;
}) {
  const commitField = (field: ExpressEditableField) => onCommit({ [field]: editableRow[field] });
  const editorLabel = editableRow.name || item.material || "Project Component";
  const imageUrl = editableRow.imageUrl.trim();
  const imageStyle = imageUrl ? { backgroundImage: `url(${imageUrl})` } : undefined;
  const cardInputClass = "h-4 border-transparent bg-transparent px-0 py-0 shadow-none hover:border-hairline focus:border-hairline focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-focus/40";

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
            editableImageUrl={editableRow.imageUrl}
            editorLabel={editorLabel}
            imageStyle={imageStyle}
            imageUrl={imageUrl}
            itemId={item.id}
            projectId={projectId}
            estimateId={estimateId}
            onActiveChange={onActiveChange}
            onCommitImageUrl={(nextImageUrl, imageAsset) => {
              const normalizedImageUrl = nextImageUrl.trim();
              const imagePatch = { imageUrl: normalizedImageUrl, imageAsset: imageAsset ?? null };
              onChange(imagePatch);
              onCommit(imagePatch);
            }}
          />
        )}
        name={(
          <ControlInput
            type="text"
            value={editableRow.name}
            onChange={(event) => onChange({ name: event.target.value })}
            onFocus={() => onActiveChange(true)}
            onBlur={() => {
              commitField("name");
              onActiveChange(false);
            }}
            onKeyDown={(event) => handleExpressFieldKeyDown(event, { field: "name", onCommit: () => commitField("name"), onRevert })}
            data-estimate-row-id={item.id}
            data-express-field="name"
            aria-label="Component name"
            placeholder="Component name"
            className={cn(cardInputClass, "text-[10px] font-medium leading-4 text-ink placeholder:text-ink")}
          />
        )}
        supplier={(
          <ControlInput
            type="text"
            value={editableRow.supplier}
            onChange={(event) => onChange({ supplier: event.target.value })}
            onFocus={() => onActiveChange(true)}
            onBlur={() => {
              commitField("supplier");
              onActiveChange(false);
            }}
            onKeyDown={(event) => handleExpressFieldKeyDown(event, { field: "supplier", onCommit: () => commitField("supplier"), onRevert })}
            data-estimate-row-id={item.id}
            data-express-field="supplier"
            aria-label="Supplier"
            placeholder="Supplier"
            className={cn(cardInputClass, "text-[8px] font-medium leading-3 text-tertiary placeholder:text-tertiary")}
          />
        )}
        cost={(
          <div className={MATERIAL_COST_SLOT_CLASS}>
            <MoneyInput
              value={editableRow.unitCost}
              onChange={(value) => onChange({ unitCost: value })}
              onFocus={() => onActiveChange(true)}
              onBlur={() => {
                commitField("unitCost");
                onActiveChange(false);
              }}
              onKeyDown={(event) => handleExpressFieldKeyDown(event, { field: "unitCost", onCommit: () => commitField("unitCost"), onRevert })}
              data-estimate-row-id={item.id}
              data-express-field="unitCost"
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
            onBlur={() => {
              commitField("description");
              onActiveChange(false);
            }}
            onKeyDown={(event) => handleExpressFieldKeyDown(event, { field: "description", onCommit: () => commitField("description"), onRevert, multiline: true })}
            data-estimate-row-id={item.id}
            data-express-field="description"
            aria-label="Component description"
            placeholder="Description"
            rows={1}
            className="h-4 min-h-4 flex-1 resize-none overflow-hidden rounded-xs border border-transparent bg-transparent p-0 text-[10px] leading-4 text-secondary/60 outline-none placeholder:text-tertiary transition hover:border-hairline hover:text-secondary focus:border-hairline focus:text-secondary focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-focus/40"
          />
        )}
        unit={(
          <div className="flex w-full min-w-0 items-center justify-end gap-1" data-estimate-material-unit-label="true">
            <span aria-hidden="true">/</span>
            <ControlInput
              type="text"
              value={editableRow.unit}
              onChange={(event) => onChange({ unit: event.target.value })}
              onFocus={() => onActiveChange(true)}
              onBlur={() => {
                commitField("unit");
                onActiveChange(false);
              }}
              onKeyDown={(event) => handleExpressFieldKeyDown(event, { field: "unit", onCommit: () => commitField("unit"), onRevert })}
              data-estimate-row-id={item.id}
              data-express-field="unit"
              aria-label="Unit"
              placeholder="unit"
              align="right"
              className={cn(cardInputClass, "h-4 w-12 text-[10px] font-medium leading-3 text-tertiary placeholder:text-tertiary")}
            />
          </div>
        )}
      />
    </div>
  );
}

export function EstimateMaterialCell({
  item,
  editableRow,
  projectId,
  estimateId,
  isReplaceTarget,
  onExpressEditorActiveChange,
  onExpressFieldChange,
  onExpressFieldCommit,
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
  onOpenComponentDetails,
  expressDraftState,
  onRetryExpressDraft,
  onDeleteExpressDraft,
}: {
  item: EstimateRowItem;
  editableRow: EditableRowValue;
  projectId?: string;
  estimateId?: string;
  isReplaceTarget: boolean;
  onExpressEditorActiveChange: (active: boolean) => void;
  onExpressFieldChange: (values: Partial<EditableRowValue>) => void;
  onExpressFieldCommit: (values: Partial<EditableRowValue>) => void;
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
  onOpenComponentDetails: (opener: HTMLElement) => void;
  expressDraftState?: ExpressInsertDraftState;
  onRetryExpressDraft: () => void;
  onDeleteExpressDraft: () => void;
}) {
  const surfaceVariant = useEstimateSurfaceVariant();
  function handleReplacementDragOver(event: DragEvent<HTMLDivElement>) {
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
    event.stopPropagation();
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData(ESTIMATE_COMPONENT_DRAG_MIME_TYPE, JSON.stringify({ rowItemId: item.id, item } satisfies EstimateComponentDragPayload));
  }

  const showProjectSpecificAction = canMakeProjectSpecific(item);
  const showPromoteAction = canPromoteEstimateRowToLibrary(item);
  const showInlineComponentEditor = isExpressComponentRow(item) || isBlankEstimateRowItem(item);
  const componentLabel = showInlineComponentEditor ? (editableRow.name || "Project Component") : (item.material || "component");
  const sourceTone = getComponentSourceTone(item);
  const sourceLabel = getComponentSourceLabel(sourceTone);

  return (
    <div
      className={cn(
        "group relative flex h-full flex-col gap-2 overflow-hidden py-2 pr-2 pl-3 transition",
        surfaceVariant === "glass" ? "hover:bg-white/40" : "bg-white hover:bg-neutral-50",
        isReplaceTarget && "bg-blue-100 ring-2 ring-inset ring-accent",
      )}
      onDragOver={handleReplacementDragOver}
      onDragLeave={onReplaceDragLeave}
      onDrop={handleReplacementDrop}
      data-replace-target-active={isReplaceTarget ? "true" : undefined}
      data-component-source={sourceTone}
      aria-label={`${componentLabel} replaceable estimate component`}
      title={`${sourceLabel}. Drop another component here to replace this component`}
    >
      <span
        className={cn("pointer-events-none absolute inset-y-0 left-0 w-[3px] bg-divider transition-colors duration-150", getComponentSourceRailClass(sourceTone))}
        aria-hidden="true"
      />
      <span className="sr-only">{sourceLabel}</span>
      <div className="absolute top-1 right-1 z-10 flex items-center gap-1.5" aria-label={`Component actions for ${componentLabel}`}>
        {showProjectSpecificAction ? (
          <ActionTooltip label="Make project component">
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              className="size-5 rounded-xs p-0 text-tertiary hover:bg-surfaceMuted hover:text-ink active:bg-surfaceMuted"
              aria-label={`Make ${componentLabel} a Project Component`}
              onClick={(event: MouseEvent<HTMLButtonElement>) => {
                event.stopPropagation();
                onRequestProjectSpecific();
              }}
            >
              <Cube size={11} weight="regular" aria-hidden="true" />
            </Button>
          </ActionTooltip>
        ) : null}
        {showPromoteAction ? (
          <ActionTooltip label="Promote to library">
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              className="size-5 rounded-xs p-0 text-tertiary hover:bg-surfaceMuted hover:text-ink active:bg-surfaceMuted"
              aria-label={`Promote ${componentLabel} to library`}
              disabled={promoteToLibraryPending}
              onClick={(event: MouseEvent<HTMLButtonElement>) => {
                event.stopPropagation();
                onPromoteToLibrary();
              }}
            >
              <StackPlus size={11} weight="regular" aria-hidden="true" />
            </Button>
          </ActionTooltip>
        ) : null}
        {onOpenReplacePicker ? (
          <ActionTooltip label="Replace component">
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              className="size-5 rounded-xs p-0 text-tertiary hover:bg-surfaceMuted hover:text-ink active:bg-surfaceMuted"
              aria-label={`Replace component ${componentLabel}`}
              onClick={(event: MouseEvent<HTMLButtonElement>) => {
                event.stopPropagation();
                onOpenReplacePicker(event.currentTarget);
              }}
            >
              <ArrowsClockwise size={11} weight="regular" aria-hidden="true" />
            </Button>
          </ActionTooltip>
        ) : null}
        {onOpenMovePicker ? (
          <ActionTooltip label="Move component">
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              className="size-5 rounded-xs p-0 text-tertiary hover:bg-surfaceMuted hover:text-ink active:bg-surfaceMuted"
              aria-label={`Move component ${componentLabel}`}
              onClick={(event: MouseEvent<HTMLButtonElement>) => {
                event.stopPropagation();
                onOpenMovePicker(event.currentTarget);
              }}
            >
              <ArrowsOutCardinal size={11} weight="regular" aria-hidden="true" />
            </Button>
          </ActionTooltip>
        ) : null}
        <ActionTooltip label="Delete component">
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className="size-5 rounded-xs p-0 text-tertiary hover:bg-red-50 hover:text-red-700 active:bg-red-50 focus-visible:text-red-700"
            aria-label={`Delete component ${componentLabel}`}
            onClick={(event: MouseEvent<HTMLButtonElement>) => {
              event.stopPropagation();
              onClearComponent();
            }}
          >
            <Trash size={11} weight="regular" aria-hidden="true" />
          </Button>
        </ActionTooltip>
        <ActionTooltip label="Component details">
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className="size-5 rounded-xs p-0 text-tertiary hover:bg-surfaceMuted hover:text-ink active:bg-surfaceMuted"
            aria-label={`Open component details for ${componentLabel}`}
            onClick={(event: MouseEvent<HTMLButtonElement>) => {
              event.stopPropagation();
              onOpenComponentDetails(event.currentTarget);
            }}
          >
            <DotsThreeVertical size={11} weight="regular" aria-hidden="true" />
          </Button>
        </ActionTooltip>
        <ActionTooltip label="Drag component">
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className="size-5 cursor-grab rounded-xs p-0 text-tertiary hover:bg-surfaceMuted hover:text-ink active:cursor-grabbing active:bg-surfaceMuted"
            aria-label={`Drag component ${componentLabel}`}
            draggable
            onClick={(event: MouseEvent<HTMLButtonElement>) => event.stopPropagation()}
            onDragStart={handleComponentDragStart}
          >
            <DotsSixVertical size={11} weight="regular" aria-hidden="true" />
          </Button>
        </ActionTooltip>
      </div>
      {showInlineComponentEditor ? (
        <ExpressMaterialEditor
          key={`${item.id}:${editableRow.imageUrl}`}
          item={item}
          editableRow={editableRow}
          projectId={projectId}
          estimateId={estimateId}
          onChange={onExpressFieldChange}
          onCommit={onExpressFieldCommit}
          onRevert={onExpressFieldRevert}
          onActiveChange={onExpressEditorActiveChange}
          draftState={expressDraftState}
          onRetryDraft={onRetryExpressDraft}
          onDeleteDraft={onDeleteExpressDraft}
        />
      ) : (
        <EstimateMaterialCardContent item={item} />
      )}
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
      className="text-[9px] tabular-nums"
      {...cellProps}
    />
  );
}
