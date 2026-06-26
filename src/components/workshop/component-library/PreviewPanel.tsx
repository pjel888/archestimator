"use client";

import { X } from "@phosphor-icons/react/dist/ssr";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SourceTrustChips } from "@/components/workshop/library/source-trust-chips";
import { getComponentSourceTrustChips } from "@/components/workshop/library/source-trust-model";
import { cn } from "@/lib/ui/cn";
import type { EstimateRowItem } from "../estimate-tree-data";
import {
  getComponentDesignation,
  getComponentDiscipline,
  getComponentImageUrl,
  getComponentName,
  getComponentPrice,
  getStalenessLabel,
  getStalenessTone,
  pesoFormatter,
  sanitizeComponentSourceUrl,
} from "./helpers";

type PreviewPanelProps = {
  item: EstimateRowItem;
  onClose: () => void;
  onAdd: (quantity?: number) => void;
  onEdit?: () => void;
  onDuplicate?: () => void;
  onFavorite?: () => void;
  onDelete?: () => void;
  deleteLabel?: string;
  addDisabled: boolean;
  addLabel: string;
  insertQuantity: number;
  onInsertQuantityChange: (quantity: number) => void;
};

export function PreviewPanel({
  item,
  onClose,
  onAdd,
  onEdit,
  onDuplicate,
  onFavorite,
  onDelete,
  deleteLabel = "Delete",
  addDisabled,
  addLabel,
  insertQuantity,
  onInsertQuantityChange,
}: PreviewPanelProps) {
  const stalenessTone = getStalenessTone(item.pricingDate);
  const stalenessLabel = getStalenessLabel(item.pricingDate);
  const sourceHref = sanitizeComponentSourceUrl(item.sourceUrl);
  const trustChips = getComponentSourceTrustChips(item);
  const hasManagementActions = Boolean(onEdit || onDuplicate || onFavorite || onDelete);
  const stalenessClass =
    stalenessTone === "danger"
      ? "text-danger"
      : stalenessTone === "warning"
        ? "text-warning"
        : stalenessTone === "success"
          ? "text-success"
          : "text-tertiary";

  return (
    <div className="shrink-0 border-t border-hairline bg-white">
      <div className="flex items-start gap-2 p-2">
        <span
          className="block size-14 shrink-0 overflow-hidden border border-hairline bg-surfaceMuted bg-cover bg-center"
          style={{ backgroundImage: `url(${getComponentImageUrl(item)})` }}
          aria-hidden="true"
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-1">
            <h3 className="truncate text-[11px] font-medium text-ink">{getComponentName(item)}</h3>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              className="size-5 shrink-0 rounded-xs p-0 text-tertiary hover:bg-surfaceMuted hover:text-ink"
              aria-label="Close component preview"
              onClick={onClose}
            >
              <X size={11} />
            </Button>
          </div>
          <p className="text-[9px] font-medium text-tertiary">
            {item.category} · {item.supplier || "No supplier"}
          </p>
          <p className="mt-0.5 font-sans text-[10px] font-medium tabular-nums text-ink">
            {pesoFormatter.format(getComponentPrice(item))} / {item.unit}
          </p>
          <p className={cn("mt-0.5 truncate text-[8px] font-medium leading-3", stalenessClass)}>
            Library · {item.pricingSource || item.supplier || "Missing price source"}
            {stalenessLabel ? ` · ${stalenessLabel}` : ""}
          </p>
          <SourceTrustChips
            chips={trustChips}
            ariaLabel={`${getComponentName(item)} preview source trust`}
            className="mt-1"
            maxChips={4}
          />
        </div>
      </div>
      <div className="px-2 pb-2">
        <p className="line-clamp-3 text-[9px] leading-4 text-tertiary">{item.description || "No description."}</p>
        <div className="mt-1.5 flex flex-wrap gap-1">
          <Badge size="xs">
            {getComponentDiscipline(item)}
          </Badge>
          <Badge size="xs">
            {getComponentDesignation(item)}
          </Badge>
          {item.isCustom ? <Badge size="xs" tone="accent">Custom</Badge> : null}
          {item.tags?.map((tag) => (
            <Badge key={tag} size="xs">
              {tag}
            </Badge>
          ))}
        </div>
        <div className={cn("mt-2 grid gap-1", hasManagementActions ? "grid-cols-[44px_1fr_1fr_1fr]" : "grid-cols-[44px_1fr]")}>
          <input
            type="number"
            min={1}
            value={insertQuantity}
            aria-label="Insert quantity"
            onChange={(event) => onInsertQuantityChange(Math.max(1, Number.parseInt(event.target.value, 10) || 1))}
            className="h-6 border border-hairline bg-white px-1 text-center text-[9px] font-medium tabular-nums text-ink outline-none focus:border-accent"
          />
          <Button onClick={() => onAdd(insertQuantity)} disabled={addDisabled} aria-label={addLabel} title={addLabel} className="h-6 min-h-6 text-[9px]">
            {addDisabled ? "Select area" : `Add ×${insertQuantity}`}
          </Button>
          {onEdit ? (
            <Button variant="secondary" onClick={onEdit} className="h-6 min-h-6 text-[9px]">
              Edit
            </Button>
          ) : null}
          {onDuplicate ? (
            <Button variant="secondary" onClick={onDuplicate} className="h-6 min-h-6 text-[9px]">
              Duplicate
            </Button>
          ) : null}
        </div>
        {onFavorite || onDelete ? (
          <div className="mt-1 grid grid-cols-2 gap-1">
            {onFavorite ? (
              <Button variant="secondary" onClick={onFavorite} className="h-6 min-h-6 text-[9px]">
                {item.isFavorite ? "Unfavorite" : "Favorite"}
              </Button>
            ) : null}
            {onDelete ? (
              <Button variant="danger" onClick={onDelete} className="h-6 min-h-6 text-[9px]">
                {deleteLabel}
              </Button>
            ) : null}
          </div>
        ) : null}
        {item.notes || sourceHref ? (
          <p className="mt-1.5 text-[9px] leading-3 text-tertiary">
            {item.notes} {sourceHref ? <a href={sourceHref} target="_blank" rel="noreferrer" className="text-accent hover:underline">Source</a> : null}
          </p>
        ) : null}
      </div>
    </div>
  );
}
