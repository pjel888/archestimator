"use client";

import { Button } from "@/components/ui/button";
import type { ProjectEstimateSheet } from "@/lib/publication/types";
import { cn } from "@/lib/ui/cn";

export type SheetPickerListProps = {
  estimates: ProjectEstimateSheet[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  disabled?: boolean;
  density?: "compact" | "comfortable";
  "aria-label"?: string;
};

export function SheetPickerList({
  estimates,
  selectedIds,
  onChange,
  disabled,
  density = "compact",
  "aria-label": ariaLabel = "Select estimates to include in shared link",
}: SheetPickerListProps) {
  const comfortable = density === "comfortable";
  const selectedSet = new Set(selectedIds);
  const allIds = estimates.map((estimate) => estimate.id);
  const allSelected = estimates.length > 0 && selectedIds.length === estimates.length;

  function toggle(id: string) {
    if (disabled) return;
    const next = selectedSet.has(id) ? selectedIds.filter((selectedId) => selectedId !== id) : [...selectedIds, id];
    onChange(next);
  }

  function selectAll() {
    if (disabled) return;
    onChange(allIds);
  }

  function clearAll() {
    if (disabled) return;
    onChange([]);
  }

  if (estimates.length === 0) {
    return (
      <div className={cn(
        "rounded-xs border border-dashed border-divider bg-surfaceMuted/60 p-3 text-center text-secondary",
        comfortable ? "min-h-20 text-[10px] leading-4" : "text-[10px]",
      )}>
        No estimates in this project.
      </div>
    );
  }

  return (
    <div aria-label={ariaLabel} className={comfortable ? "text-[10px]" : "text-[10px]"}>
      <div className={cn("mb-1 flex items-center gap-1.5", comfortable ? "text-[9px]" : "text-[9px]")}>
        <Button
          type="button"
          variant="plain"
          size="xs"
          onClick={selectAll}
          disabled={disabled || allSelected}
          className={cn(
            "min-w-0 !text-[inherit] text-secondary hover:text-ink focus-visible:ring-offset-0",
            comfortable ? "min-h-8 px-2 py-1 !text-[9px]" : "min-h-0 px-1.5 py-0.5",
          )}
        >
          Select all
        </Button>
        <Button
          type="button"
          variant="plain"
          size="xs"
          onClick={clearAll}
          disabled={disabled || selectedIds.length === 0}
          className={cn(
            "min-w-0 !text-[inherit] text-secondary hover:text-ink focus-visible:ring-offset-0",
            comfortable ? "min-h-8 px-2 py-1 !text-[9px]" : "min-h-0 px-1.5 py-0.5",
          )}
        >
          Clear
        </Button>
        <span className="ml-auto text-secondary tabular-nums">
          {selectedIds.length} / {estimates.length} selected
        </span>
      </div>

      <div className={cn(
        "rounded-xs border border-hairline bg-white p-1 leading-4",
        comfortable
          ? "max-h-none overflow-visible text-[10px] sm:max-h-[18rem] sm:overflow-auto"
          : "max-h-40 overflow-auto text-[10px]",
      )}>
        {estimates.map((estimate) => {
          const checked = selectedSet.has(estimate.id);
          const label = estimate.sheetCode ? `${estimate.sheetCode} — ${estimate.name}` : estimate.name;
          return (
            <label
              key={estimate.id}
              className={cn(
                "flex cursor-pointer rounded-xs hover:bg-surfaceMuted/70",
                comfortable ? "min-h-9 items-start gap-2 px-2 py-1.5" : "items-center gap-1.5 px-1 py-0.5",
              )}
            >
              <input
                type="checkbox"
                className={cn("accent-ink", comfortable ? "size-3.5" : "size-3")}
                checked={checked}
                disabled={disabled}
                onChange={() => toggle(estimate.id)}
                aria-label={label}
              />
              {comfortable ? (
                <span className="min-w-0 flex-1">
                  {estimate.sheetCode ? (
                    <span className="block break-words text-[8px] leading-3 text-tertiary">{estimate.sheetCode}</span>
                  ) : null}
                  <span className="block break-words text-[10px] font-medium leading-4 text-ink">{estimate.name}</span>
                </span>
              ) : (
                <span className="truncate">{label}</span>
              )}
            </label>
          );
        })}
      </div>

      {selectedIds.length === 0 && (
        <p className={cn("mt-1 text-secondary", comfortable ? "text-[9px]" : "text-[9px]")} role="status">
          0 estimates selected
        </p>
      )}
    </div>
  );
}
