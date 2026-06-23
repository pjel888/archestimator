"use client";

import type { ProjectEstimateSheet } from "@/lib/publication/types";

export type SheetPickerListProps = {
  estimates: ProjectEstimateSheet[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  disabled?: boolean;
  "aria-label"?: string;
};

export function SheetPickerList({
  estimates,
  selectedIds,
  onChange,
  disabled,
  "aria-label": ariaLabel = "Select estimates to include in shared link",
}: SheetPickerListProps) {
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
      <div className="rounded-xs border border-dashed border-divider bg-surfaceMuted/60 p-3 text-center text-[10px] text-secondary">
        No estimates in this project.
      </div>
    );
  }

  return (
    <div aria-label={ariaLabel} className="text-[10px]">
      <div className="mb-1 flex items-center gap-2 text-[9px]">
        <button
          type="button"
          onClick={selectAll}
          disabled={disabled || allSelected}
          className="rounded-xs px-1.5 py-0.5 text-secondary hover:text-ink disabled:opacity-50"
        >
          Select all
        </button>
        <button
          type="button"
          onClick={clearAll}
          disabled={disabled || selectedIds.length === 0}
          className="rounded-xs px-1.5 py-0.5 text-secondary hover:text-ink disabled:opacity-50"
        >
          Clear
        </button>
        <span className="ml-auto text-secondary tabular-nums">
          {selectedIds.length} / {estimates.length} selected
        </span>
      </div>

      <div className="max-h-40 overflow-auto rounded-xs border border-hairline bg-white p-1 text-[10px] leading-4">
        {estimates.map((estimate) => {
          const checked = selectedSet.has(estimate.id);
          const label = estimate.sheetCode ? `${estimate.sheetCode} — ${estimate.name}` : estimate.name;
          return (
            <label
              key={estimate.id}
              className="flex cursor-pointer items-center gap-1.5 rounded-xs px-1 py-0.5 hover:bg-surfaceMuted/70"
            >
              <input
                type="checkbox"
                className="size-3 accent-ink"
                checked={checked}
                disabled={disabled}
                onChange={() => toggle(estimate.id)}
                aria-label={label}
              />
              <span className="truncate">{label}</span>
            </label>
          );
        })}
      </div>

      {selectedIds.length === 0 && (
        <p className="mt-1 text-[9px] text-secondary" role="status">
          0 estimates selected
        </p>
      )}
    </div>
  );
}
