"use client";

import { useState, type DragEvent, type InputHTMLAttributes, type KeyboardEvent, type MouseEvent, type ReactNode } from "react";
import { Cube, DotsSixVertical, DotsThreeVertical, StackPlus, Trash } from "@phosphor-icons/react/dist/ssr";

import { Button } from "@/components/ui/button";
import { ControlInput } from "@/components/ui/control-input";
import { classifyEstimateRowSource, isExpressComponentRow, readProjectComponentProjectionMetadata } from "@/lib/estimates/express-components";
import { cn } from "@/lib/ui/cn";
import { estimateSurfaceClass } from "../../estimate-surface-class";
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
  type EstimateComponentDragPayload,
} from "./constants";
import { canMakeProjectSpecific, canPromoteEstimateRowToLibrary } from "./cells-model";
import { formatEditableMoney, type EditableRowValue } from "./editable-row-model";

export type ExpressInsertDraftState = "creating" | "failed";

type ComponentSourceTone = "library" | "express" | "project" | "manual";

const MATERIAL_UNIT_SLOT_CLASS =
  "flex w-16 shrink-0 items-center justify-end whitespace-nowrap text-right text-[10px] font-medium leading-3 text-tertiary";

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
          <div className="min-w-0 pr-[108px]">
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

function ExpressMaterialEditor({
  item,
  editableRow,
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
  const cardInputClass = "h-4 border-transparent bg-transparent px-0 py-0 shadow-none hover:border-hairline focus:border-accent focus:bg-white focus:px-1 focus:ring-1 focus:ring-accent";

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
          <label
            className={cn(
              "relative grid size-14 shrink-0 place-items-center overflow-hidden rounded-xs bg-neutral-100 bg-cover bg-center text-center text-[8px] font-medium leading-3 text-tertiary",
              imageUrl && "shadow-[inset_0_0_0_999px_rgba(0,0,0,0.08)]",
            )}
            style={imageStyle}
            title="Paste an image URL"
          >
            <span aria-hidden="true" className="pointer-events-none px-1 opacity-0 transition group-hover:opacity-70 group-focus-within:opacity-70">
              Image URL
            </span>
            <input
              type="url"
              value={editableRow.imageUrl}
              onChange={(event) => onChange({ imageUrl: event.target.value })}
              onFocus={() => onActiveChange(true)}
              onBlur={() => {
                commitField("imageUrl");
                onActiveChange(false);
              }}
              onKeyDown={(event) => handleExpressFieldKeyDown(event, { field: "imageUrl", onCommit: () => commitField("imageUrl"), onRevert })}
              data-estimate-row-id={item.id}
              data-express-field="imageUrl"
              aria-label="Image URL"
              placeholder="Image URL"
              className="absolute inset-0 h-full w-full rounded-xs border-0 bg-transparent p-1 text-center text-[8px] font-medium leading-3 text-transparent outline-none placeholder:text-transparent focus:bg-white/95 focus:text-ink focus:placeholder:text-tertiary"
            />
          </label>
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
            className={cn(cardInputClass, "text-[11px] font-medium leading-4 text-ink placeholder:text-ink")}
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
            className={cn(cardInputClass, "text-[10px] font-medium leading-4 text-tertiary placeholder:text-tertiary")}
          />
        )}
        cost={(
          <div className="w-[84px]">
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
            className="h-4 min-h-4 flex-1 resize-none overflow-hidden rounded-xs border border-transparent bg-transparent p-0 text-[10px] leading-4 text-secondary/60 outline-none placeholder:text-secondary/60 transition hover:border-hairline hover:text-secondary focus:border-accent focus:bg-white focus:px-1 focus:text-secondary focus:ring-1 focus:ring-accent"
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
  onOpenComponentDetails,
  expressDraftState,
  onRetryExpressDraft,
  onDeleteExpressDraft,
}: {
  item: EstimateRowItem;
  editableRow: EditableRowValue;
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

    const payload = event.dataTransfer.getData(LIBRARY_ITEM_DRAG_MIME_TYPE);
    if (!payload) return;
    event.preventDefault();
    event.stopPropagation();
    onReplaceDragLeave();
    onReplace(JSON.parse(payload) as EstimateRowItem);
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
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className="size-5 rounded-xs p-0 text-tertiary hover:bg-surfaceMuted hover:text-ink active:bg-surfaceMuted"
            aria-label={`Make ${componentLabel} a Project Component`}
            title="Make Project Component"
            onClick={(event: MouseEvent<HTMLButtonElement>) => {
              event.stopPropagation();
              onRequestProjectSpecific();
            }}
          >
            <Cube size={11} weight="regular" aria-hidden="true" />
          </Button>
        ) : null}
        {showPromoteAction ? (
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className="size-5 rounded-xs p-0 text-tertiary hover:bg-surfaceMuted hover:text-ink active:bg-surfaceMuted"
            aria-label={`Promote ${componentLabel} to library`}
            title="Promote to library"
            disabled={promoteToLibraryPending}
            onClick={(event: MouseEvent<HTMLButtonElement>) => {
              event.stopPropagation();
              onPromoteToLibrary();
            }}
          >
            <StackPlus size={11} weight="regular" aria-hidden="true" />
          </Button>
        ) : null}
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          className="size-5 rounded-xs p-0 text-tertiary hover:bg-red-50 hover:text-red-700 active:bg-red-50 focus-visible:text-red-700"
          aria-label={`Delete component ${componentLabel}`}
          title="Delete component"
          onClick={(event: MouseEvent<HTMLButtonElement>) => {
            event.stopPropagation();
            onClearComponent();
          }}
        >
          <Trash size={11} weight="regular" aria-hidden="true" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          className="size-5 rounded-xs p-0 text-tertiary hover:bg-surfaceMuted hover:text-ink active:bg-surfaceMuted"
          aria-label={`Open component details for ${componentLabel}`}
          title="Component details"
          onClick={(event: MouseEvent<HTMLButtonElement>) => {
            event.stopPropagation();
            onOpenComponentDetails(event.currentTarget);
          }}
        >
          <DotsThreeVertical size={11} weight="regular" aria-hidden="true" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          className="size-5 cursor-grab rounded-xs p-0 text-tertiary hover:bg-surfaceMuted hover:text-ink active:cursor-grabbing active:bg-surfaceMuted"
          aria-label={`Drag component ${componentLabel}`}
          title="Drag component"
          draggable
          onClick={(event: MouseEvent<HTMLButtonElement>) => event.stopPropagation()}
          onDragStart={handleComponentDragStart}
        >
          <DotsSixVertical size={11} weight="regular" aria-hidden="true" />
        </Button>
      </div>
      {showInlineComponentEditor ? (
        <ExpressMaterialEditor
          item={item}
          editableRow={editableRow}
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
