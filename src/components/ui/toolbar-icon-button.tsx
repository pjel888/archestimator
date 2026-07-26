"use client";

import type { ComponentProps, FocusEvent, MouseEvent, PointerEvent, ReactNode } from "react";
import { useEffect, useId, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { ToolbarTooltip } from "@/components/ui/toolbar-tooltip";
import { cn } from "@/lib/ui/cn";

/**
 * Shared light-orange "Add" affordance for the Estimate Sheet page.
 *
 * Named DESIGN.md exception (approved 2026-06-14): the estimate-sheet "add"
 * buttons (Add Area, Add tab, Add Component/Template) use a light-orange tint
 * to disambiguate the primary add action among co-located neutral toolbar
 * icons. Reuses the Tailwind `orange-*` scale already used at
 * projects-page-client.tsx:371. Tailwind v4 has no default button cursor, so
 * `cursor-pointer` is explicit. Does NOT apply to in-row "Add row"
 * (QuietAddRowButton stays low-emphasis).
 */
export const ADD_BUTTON_CLASSNAME =
  "bg-orange-100 text-orange-700 " +
  "hover:bg-orange-200 hover:text-orange-800 " +
  "focus-visible:bg-orange-200 focus-visible:text-orange-800 " +
  "cursor-pointer";

type ToolbarIconButtonProps = Omit<ComponentProps<typeof Button>, "children" | "size"> & {
  label: string;
  children: ReactNode;
  visibleLabel?: string;
};

export function ToolbarIconButton({
  label,
  visibleLabel,
  className,
  children,
  onBlur,
  onClick,
  onFocus,
  onPointerDown,
  onPointerCancel,
  onPointerEnter,
  onPointerLeave,
  onPointerUp,
  ...props
}: ToolbarIconButtonProps) {
  const hasVisibleLabel = Boolean(visibleLabel);
  const [tooltipOpen, setTooltipOpen] = useState(false);
  const wrapperRef = useRef<HTMLSpanElement>(null);
  const hoverTooltipTimerRef = useRef<number | null>(null);
  const pointerActivationRef = useRef(false);
  const tooltipId = useId();
  const describedBy = hasVisibleLabel
    ? props["aria-describedby"]
    : [props["aria-describedby"], tooltipId].filter(Boolean).join(" ");

  function clearHoverTooltipTimer() {
    if (hoverTooltipTimerRef.current === null) return;
    window.clearTimeout(hoverTooltipTimerRef.current);
    hoverTooltipTimerRef.current = null;
  }

  useEffect(() => () => clearHoverTooltipTimer(), []);

  function handlePointerEnter(event: PointerEvent<HTMLButtonElement>) {
    onPointerEnter?.(event);
    if (!hasVisibleLabel) {
      clearHoverTooltipTimer();
      hoverTooltipTimerRef.current = window.setTimeout(() => {
        setTooltipOpen(true);
        hoverTooltipTimerRef.current = null;
      }, 250);
    }
  }

  function handlePointerDown(event: PointerEvent<HTMLButtonElement>) {
    onPointerDown?.(event);
    pointerActivationRef.current = true;
    clearHoverTooltipTimer();
  }

  function handlePointerCancel(event: PointerEvent<HTMLButtonElement>) {
    onPointerCancel?.(event);
    pointerActivationRef.current = false;
    clearHoverTooltipTimer();
    setTooltipOpen(false);
  }

  function handlePointerLeave(event: PointerEvent<HTMLButtonElement>) {
    onPointerLeave?.(event);
    clearHoverTooltipTimer();
    setTooltipOpen(false);
  }

  function handlePointerUp(event: PointerEvent<HTMLButtonElement>) {
    onPointerUp?.(event);
    clearHoverTooltipTimer();
    setTooltipOpen(false);
    pointerActivationRef.current = false;
  }

  function handleFocus(event: FocusEvent<HTMLButtonElement>) {
    onFocus?.(event);
    clearHoverTooltipTimer();
    if (!hasVisibleLabel && !pointerActivationRef.current) setTooltipOpen(true);
  }

  function handleBlur(event: FocusEvent<HTMLButtonElement>) {
    onBlur?.(event);
    pointerActivationRef.current = false;
    clearHoverTooltipTimer();
    setTooltipOpen(false);
  }

  function handleClick(event: MouseEvent<HTMLButtonElement>) {
    clearHoverTooltipTimer();
    setTooltipOpen(false);
    onClick?.(event);
    pointerActivationRef.current = false;
  }

  return (
    <span ref={wrapperRef} className="relative inline-flex">
      <Button
        {...props}
        size="icon-sm"
        variant="ghost"
        aria-label={label}
        aria-describedby={describedBy || undefined}
        title={label}
        className={cn(
          hasVisibleLabel
            ? "inline-flex h-6 min-h-6 w-auto cursor-pointer items-center gap-1 rounded-xs px-2 py-0 !text-[9px]"
            : "size-6 cursor-pointer rounded-xs p-0",
          "text-tertiary",
          className,
        )}
        onBlur={handleBlur}
        onClick={handleClick}
        onFocus={handleFocus}
        onPointerDownCapture={handlePointerDown}
        onPointerCancel={handlePointerCancel}
        onPointerEnter={handlePointerEnter}
        onPointerLeave={handlePointerLeave}
        onPointerUpCapture={handlePointerUp}
      >
        <span className="pointer-events-none inline-flex shrink-0 items-center justify-center">{children}</span>
        {visibleLabel ? <span className="whitespace-nowrap">{visibleLabel}</span> : null}
      </Button>
      <ToolbarTooltip id={tooltipId} label={label} open={!hasVisibleLabel && tooltipOpen} anchorRef={wrapperRef} />
    </span>
  );
}
