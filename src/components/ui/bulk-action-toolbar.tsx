"use client";

import * as React from "react";
import { X } from "@phosphor-icons/react/dist/ssr";

import { Button } from "@/components/ui/button";
import { ToolbarIconButton } from "@/components/ui/toolbar-icon-button";
import { cn } from "@/lib/ui/cn";

export interface BulkAction {
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
  variant?: "default" | "danger" | "ghost";
  disabled?: boolean;
}

export interface BulkActionToolbarProps {
  selectedCount: number;
  selectedLabel?: string;
  actions: BulkAction[];
  onClear: () => void;
  placement?: "inline" | "bottom-dock";
  className?: string;
}

export function BulkActionToolbar({
  selectedCount,
  selectedLabel = "selected",
  actions,
  onClear,
  placement = "inline",
  className,
}: BulkActionToolbarProps) {
  if (selectedCount === 0) return null;

  const isBottomDock = placement === "bottom-dock";

  if (isBottomDock) {
    return (
      <div
        role="region"
        aria-label="Bulk action toolbar"
        className={cn(
          "pointer-events-none fixed bottom-[calc(3.5rem+env(safe-area-inset-bottom))] left-1/2 z-40 flex min-h-[72px] max-w-[calc(100vw-1rem)] -translate-x-1/2 items-center justify-center lg:left-[calc(50%+32px)]",
          className
        )}
      >
        <div
          data-bulk-action-dock-surface
          className="pointer-events-auto flex flex-col items-center gap-1 rounded-xs border border-hairline bg-white/80 p-1 shadow-[0_22px_54px_-30px_rgba(17,17,17,0.75)] ring-1 ring-black/[0.04] backdrop-blur-md"
        >
          <div
            data-bulk-action-count-floor
            className="grid h-6 w-full place-items-center rounded-xs border border-hairline bg-surfaceMuted/80 px-2"
          >
            <p className="truncate text-center text-[10px] font-medium leading-3 tabular-nums text-ink" aria-live="polite">
              {selectedCount} {selectedLabel}
            </p>
          </div>
          <div
            data-bulk-action-icon-floor
            className="flex h-9 w-full items-center justify-center gap-1 rounded-xs border border-hairline bg-white p-0.5 shadow-[inset_0_1px_0_rgba(17,17,17,0.02)]"
            role="group"
            aria-label="Bulk selection actions"
          >
            <ToolbarIconButton
              label="Clear selection"
              className="size-8 rounded-xs border border-transparent text-secondary hover:-translate-y-0.5 hover:border-hairline hover:bg-surfaceMuted hover:text-ink focus-visible:-translate-y-0.5 focus-visible:bg-surfaceMuted focus-visible:text-ink"
              onClick={onClear}
            >
              <X size={14} weight="regular" aria-hidden="true" />
            </ToolbarIconButton>
            
            {actions.length > 0 && (
              <span className="h-6 w-px bg-hairline mx-0.5" aria-hidden="true" />
            )}

            {actions.map((action, index) => {
              const isDanger = action.variant === "danger";
              return (
                <ToolbarIconButton
                  key={index}
                  label={action.label}
                  className={cn(
                    "size-8 rounded-xs border border-transparent hover:-translate-y-0.5 focus-visible:-translate-y-0.5",
                    isDanger
                      ? "border-dangerSoft bg-dangerSoft/40 text-danger hover:bg-dangerSoft hover:text-danger focus-visible:bg-dangerSoft focus-visible:text-danger"
                      : "text-secondary hover:border-hairline hover:bg-surfaceMuted hover:text-ink focus-visible:bg-surfaceMuted focus-visible:text-ink"
                  )}
                  disabled={action.disabled}
                  onClick={action.onClick}
                >
                  {action.icon}
                </ToolbarIconButton>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      role="region"
      aria-label="Bulk action toolbar"
      className={cn(
        "flex min-h-9 shrink-0 items-center gap-2 px-2 py-1",
        "border-b border-hairline bg-surface",
        className
      )}
    >
      <p className="text-[10px] font-medium leading-4 text-ink">
        {selectedCount} {selectedLabel}
      </p>
      <div className="ml-auto flex min-w-0 flex-wrap items-center justify-end gap-1">
        <Button type="button" variant="ghost" size="sm" className="h-7 px-2 text-[10px]" onClick={onClear}>
          Clear
        </Button>
        {actions.map((action, index) => (
          <Button
            key={index}
            type="button"
            variant={action.variant === "danger" ? "danger" : action.variant === "ghost" ? "ghost" : "secondary"}
            size="sm"
            className="h-7 gap-1 px-2 text-[10px]"
            disabled={action.disabled}
            onClick={action.onClick}
          >
            {action.icon}
            {action.label}
          </Button>
        ))}
      </div>
    </div>
  );
}
