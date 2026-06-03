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
  selectedCount,
  className,
}: BulkActionToolbarProps) {
  if (selectedCount === 0) return null;

  return (
    <div
      role="region"
      aria-label="Bulk action toolbar"
      className={cn(
        "flex min-h-9 shrink-0 items-center gap-2 border-b border-hairline bg-surfaceMuted px-2 py-1",
        className,
      )}
    >
      <p className="text-[10px] font-medium leading-4 text-ink">
        {selectedCount} selected
      </p>
      {helperText ? (
        <p className="hidden text-[9px] font-normal leading-3 text-tertiary sm:block">
          {helperText}
        </p>
      ) : null}
      <div className="ml-auto flex items-center gap-1">
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
