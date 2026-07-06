"use client";

import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { cn } from "@/lib/ui/cn";
import type { EstimateTreeNode } from "../estimate-tree-data";
import type { EstimateTreeMoveOption, EstimateTreeMoveSelection } from "./estimate-tree-node-options";

type EstimateTreeMoveDialogProps = {
  sourceNode: EstimateTreeNode | null;
  options: EstimateTreeMoveOption[];
  selection: EstimateTreeMoveSelection | null;
  onSelectionChange: (selection: EstimateTreeMoveSelection) => void;
  onCancel: (sourceNodeId?: string) => void;
  onConfirm: () => void;
};

function moveOptionDescriptionId(optionId: string) {
  return `estimate-tree-move-option-${optionId.replace(/[^a-zA-Z0-9_-]/g, "-")}-description`;
}

export function EstimateTreeMoveDialog({
  sourceNode,
  options,
  selection,
  onSelectionChange,
  onCancel,
  onConfirm,
}: EstimateTreeMoveDialogProps) {
  const selectedOption = selection ? options.find((option) => option.id === selection.id) ?? null : null;
  const sourceNodeId = sourceNode?.id;

  return (
    <Modal
      open={Boolean(sourceNode)}
      title={sourceNode ? `Move ${sourceNode.name}` : "Move Area"}
      description="Choose where this area should move. Invalid targets stay visible with a reason."
      onOpenChange={(open) => {
        if (!open) onCancel(sourceNodeId);
      }}
      closeLabel="Cancel move"
      className="max-w-md"
    >
      <div className="space-y-3">
        <fieldset className="space-y-1">
          <legend className="text-[10px] font-medium leading-4 text-ink">Destination</legend>
          <div
            role="radiogroup"
            aria-label="Move destination"
            className="max-h-72 overflow-auto rounded-xs border border-hairline bg-white"
          >
            {options.length > 0 ? (
              options.map((option) => {
                const checked = selection?.id === option.id;
                const disabledReason = option.disabled ? option.reason : "";
                const descriptionId = moveOptionDescriptionId(option.id);
                return (
                  <button
                    key={option.id}
                    type="button"
                    role="radio"
                    value={option.id}
                    aria-checked={checked}
                    aria-disabled={option.disabled ? "true" : undefined}
                    aria-describedby={descriptionId}
                    data-estimate-tree-move-option={option.id}
                    className={cn(
                      "flex min-h-8 w-full items-start gap-2 border-b border-hairline px-2 py-1.5 text-left last:border-b-0",
                      option.disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer hover:bg-surfaceMuted",
                    )}
                    style={{ paddingLeft: `${8 + option.depth * 14}px` }}
                    onClick={() => {
                      if (option.disabled) return;
                      onSelectionChange(option.selection);
                    }}
                  >
                    <span
                      aria-hidden="true"
                      className={cn(
                        "mt-0.5 grid size-3 shrink-0 place-items-center rounded-full border border-tertiary",
                        checked && "border-brand-orange",
                      )}
                    >
                      {checked ? <span className="size-1.5 rounded-full bg-brand-orange" /> : null}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[10px] font-medium leading-4 text-ink">{option.label}</span>
                      <span id={descriptionId} className="block truncate text-[9px] leading-3 text-tertiary">
                        {disabledReason || option.detail}
                      </span>
                    </span>
                  </button>
                );
              })
            ) : (
              <p className="px-2 py-3 text-[10px] leading-4 text-tertiary">No destinations are available.</p>
            )}
          </div>
        </fieldset>
        <div className="flex justify-end gap-2">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => onCancel(sourceNodeId)}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="primary"
            size="sm"
            disabled={!selectedOption || selectedOption.disabled}
            onClick={onConfirm}
          >
            Move
          </Button>
        </div>
      </div>
    </Modal>
  );
}
