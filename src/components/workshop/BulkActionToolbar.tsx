"use client";

import { Trash } from "@phosphor-icons/react/dist/ssr";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/ui/cn";

type BulkActionToolbarProps = {
  actionLabel: string;
  disabled?: boolean;
  helperText?: string;
  onAction: () => void;
  onClear: () => void;
  onSelectVisible?: () => void;
  placement?: "inline" | "bottom-dock";
  selectedCount: number;
  className?: string;
};

export function BulkActionToolbar({
  actionLabel,
  disabled = false,
  helperText,
  onAction,
  onClear,
  onSelectVisible,
  placement = "inline",
  selectedCount,
  className,
}: BulkActionToolbarProps) {
  if (selectedCount === 0) return null;
  const isBottomDock = placement === "bottom-dock";

  return (
    <div
      role="region"
      aria-label="Bulk action toolbar"
      className={cn(
        "flex min-h-9 shrink-0 items-center gap-2 px-2 py-1",
        isBottomDock
          ? "fixed bottom-[calc(3.5rem+env(safe-area-inset-bottom))] left-1/2 z-40 w-[min(calc(100vw-1rem),680px)] -translate-x-1/2 flex-wrap rounded-xs border border-hairline bg-white shadow-[0_18px_42px_-36px_rgba(17,17,17,0.65)] lg:left-[calc(50%+32px)]"
          : "border-b border-hairline bg-surfaceMuted",
        className,
      )}
    >
      <p className="text-[10px] font-medium leading-4 text-ink">
        {selectedCount} selected
      </p>
      {helperText ? (
        <p
          className={cn(
            "hidden text-[9px] font-normal leading-3 text-tertiary sm:block",
            isBottomDock ? "max-w-[320px] truncate" : null,
          )}
          title={helperText}
        >
          {helperText}
        </p>
      ) : null}
      <div className="ml-auto flex min-w-0 flex-wrap items-center justify-end gap-1">
        {onSelectVisible ? (
          <Button type="button" variant="ghost" size="sm" className="h-7 px-2" onClick={onSelectVisible}>
            Select visible
          </Button>
        ) : null}
        <Button type="button" variant="ghost" size="sm" className="h-7 px-2" onClick={onClear}>
          Clear
        </Button>
        <Button type="button" variant="danger" size="sm" className="h-7 gap-1 px-2" disabled={disabled} onClick={onAction}>
          <Trash size={12} weight="regular" aria-hidden="true" />
          {actionLabel}
        </Button>
      </div>
    </div>
  );
}
