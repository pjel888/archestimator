"use client";

import { SelectionAll, Trash, X } from "@phosphor-icons/react/dist/ssr";

import { Button } from "@/components/ui/button";
import { ToolbarIconButton } from "@/components/ui/toolbar-icon-button";
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

  if (isBottomDock) {
    return (
      <section
        aria-label="Bulk action toolbar"
        className={cn(
          "pointer-events-none fixed bottom-[calc(3.5rem+env(safe-area-inset-bottom))] left-1/2 z-40 flex min-h-[72px] max-w-[calc(100vw-1rem)] -translate-x-1/2 items-center justify-center lg:left-[calc(50%+32px)]",
          className,
        )}
      >
        <div
          data-bulk-action-dock-surface
          className="pointer-events-auto flex w-36 flex-col items-center gap-1 rounded-xs border border-hairline bg-white/95 p-1 shadow-[0_22px_54px_-30px_rgba(17,17,17,0.75)] ring-1 ring-black/[0.04] backdrop-blur-md"
        >
          <div
            data-bulk-action-count-floor
            className="grid h-6 w-full place-items-center rounded-xs border border-hairline bg-surfaceMuted/80 px-2"
          >
            <p className="w-[12ch] truncate text-center text-[10px] font-medium leading-3 tabular-nums text-ink" aria-live="polite">
              {selectedCount} selected
            </p>
          </div>
          {/* react-doctor-disable-next-line react-doctor/prefer-tag-over-role -- Bulk action buttons are a named control group; <address> would be incorrect. */}
          <div
            data-bulk-action-icon-floor
            className="grid h-9 w-full grid-cols-[2rem_2rem_1px_2rem] items-center justify-center gap-1 rounded-xs border border-hairline bg-white p-0.5 shadow-[inset_0_1px_0_rgba(17,17,17,0.02)]"
            role="group"
            aria-label="Bulk selection actions"
          >
            {onSelectVisible ? (
              <ToolbarIconButton
                label="Select visible"
                className="size-8 rounded-xs border border-transparent text-secondary hover:-translate-y-0.5 hover:border-hairline hover:bg-surfaceMuted hover:text-ink focus-visible:-translate-y-0.5 focus-visible:bg-surfaceMuted focus-visible:text-ink"
                onClick={onSelectVisible}
              >
                <SelectionAll size={14} weight="regular" aria-hidden="true" />
              </ToolbarIconButton>
            ) : (
              <span className="size-8 rounded-xs" aria-hidden="true" />
            )}
            <ToolbarIconButton
              label="Clear selection"
              className="size-8 rounded-xs border border-transparent text-secondary hover:-translate-y-0.5 hover:border-hairline hover:bg-surfaceMuted hover:text-ink focus-visible:-translate-y-0.5 focus-visible:bg-surfaceMuted focus-visible:text-ink"
              onClick={onClear}
            >
              <X size={14} weight="regular" aria-hidden="true" />
            </ToolbarIconButton>
            <span className="h-6 w-px bg-hairline" aria-hidden="true" />
            <ToolbarIconButton
              label={actionLabel}
              className="size-8 rounded-xs border border-dangerSoft bg-dangerSoft/40 text-danger hover:-translate-y-0.5 hover:bg-dangerSoft hover:text-danger focus-visible:-translate-y-0.5 focus-visible:bg-dangerSoft focus-visible:text-danger"
              disabled={disabled}
              onClick={onAction}
            >
              <Trash size={14} weight="regular" aria-hidden="true" />
            </ToolbarIconButton>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section
      aria-label="Bulk action toolbar"
      className={cn(
        "flex min-h-9 shrink-0 items-center gap-2 px-2 py-1",
        "border-b border-hairline bg-surfaceMuted",
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
    </section>
  );
}
