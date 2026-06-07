"use client";

import * as React from "react";
import { X } from "@phosphor-icons/react/dist/ssr";

import { Button } from "@/components/ui/button";
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

function FloatingDockItem({
  label,
  icon,
  onClick,
  variant = "default",
  disabled = false,
}: {
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
  variant?: "default" | "danger" | "ghost";
  disabled?: boolean;
}) {
  const isDanger = variant === "danger";

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      title={label}
      className={cn(
        "group relative flex items-center justify-center",
        "size-10 rounded-xs",
        "transition-all duration-200 ease-out",
        "hover:scale-[1.25] hover:z-10",
        "focus-visible:scale-[1.25] focus-visible:z-10 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-focus",
        "disabled:pointer-events-none disabled:opacity-40",
        isDanger
          ? "bg-dangerSoft/60 text-danger hover:bg-dangerSoft hover:text-danger"
          : "bg-white text-secondary hover:bg-surfaceMuted hover:text-ink"
      )}
      aria-label={label}
    >
      <span className="flex items-center justify-center transition-transform duration-200 ease-out group-hover:scale-110">
        {icon}
      </span>
      {/* Tooltip label appears on hover */}
      <span
        className={cn(
          "pointer-events-none absolute -top-8 left-1/2 -translate-x-1/2",
          "whitespace-nowrap rounded-xs bg-ink px-2 py-0.5 text-[9px] font-medium text-white",
          "opacity-0 transition-opacity duration-150",
          "group-hover:opacity-100 group-focus-visible:opacity-100"
        )}
      >
        {label}
      </span>
    </button>
  );
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
          "pointer-events-none fixed inset-x-0 bottom-[calc(3.5rem+env(safe-area-inset-bottom))] z-40 flex flex-col items-center gap-1",
          className
        )}
      >
        {/* Level 1: Action buttons */}
        <div
          className={cn(
            "pointer-events-auto flex items-center gap-0.5",
            "rounded-xs border border-hairline",
            "bg-white/90 p-1",
            "shadow-[0_16px_48px_-24px_rgba(17,17,17,0.35),0_0_0_1px_rgba(0,0,0,0.04)]",
            "backdrop-blur-xl",
            "animate-in fade-in slide-in-from-bottom-4 duration-300"
          )}
          style={{ animationFillMode: "backwards", animationDelay: "0ms" }}
        >
          {/* Clear selection */}
          <FloatingDockItem
            label="Clear selection"
            icon={<X size={16} weight="regular" />}
            onClick={onClear}
          />

          {/* Divider if actions exist */}
          {actions.length > 0 && (
            <span className="mx-0.5 h-6 w-px bg-hairline" aria-hidden="true" />
          )}

          {/* Action items */}
          {actions.map((action, index) => (
            <FloatingDockItem
              key={index}
              label={action.label}
              icon={action.icon}
              onClick={action.onClick}
              variant={action.variant}
              disabled={action.disabled}
            />
          ))}
        </div>

        {/* Level 2: Selection count — slides down from level 1 */}
        <div
          className={cn(
            "pointer-events-auto flex items-center justify-center gap-1.5",
            "rounded-xs border border-hairline",
            "bg-white/90 px-3 py-1",
            "shadow-[0_16px_48px_-24px_rgba(17,17,17,0.35),0_0_0_1px_rgba(0,0,0,0.04)]",
            "backdrop-blur-xl",
            "animate-in fade-in slide-in-from-top-1 duration-200"
          )}
          style={{ animationFillMode: "backwards", animationDelay: "100ms" }}
        >
          <span
            className="text-[10px] font-medium tabular-nums text-ink"
            aria-live="polite"
          >
            {selectedCount}
          </span>
          <span className="text-[10px] font-normal text-tertiary">
            {selectedLabel}
          </span>
        </div>
      </div>
    );
  }

  // Inline variant
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
