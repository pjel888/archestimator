"use client";

import type { ComponentProps, FocusEvent, MouseEvent, PointerEvent, ReactNode } from "react";
import { useId, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { ToolbarTooltip } from "@/components/ui/toolbar-tooltip";
import { cn } from "@/lib/ui/cn";

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
  onPointerEnter,
  onPointerLeave,
  ...props
}: ToolbarIconButtonProps) {
  const hasVisibleLabel = Boolean(visibleLabel);
  const [tooltipOpen, setTooltipOpen] = useState(false);
  const wrapperRef = useRef<HTMLSpanElement>(null);
  const tooltipId = useId();
  const describedBy = hasVisibleLabel
    ? props["aria-describedby"]
    : [props["aria-describedby"], tooltipId].filter(Boolean).join(" ");

  function handlePointerEnter(event: PointerEvent<HTMLButtonElement>) {
    onPointerEnter?.(event);
    if (!hasVisibleLabel) setTooltipOpen(true);
  }

  function handlePointerLeave(event: PointerEvent<HTMLButtonElement>) {
    onPointerLeave?.(event);
    setTooltipOpen(false);
  }

  function handleFocus(event: FocusEvent<HTMLButtonElement>) {
    onFocus?.(event);
    if (!hasVisibleLabel) setTooltipOpen(true);
  }

  function handleBlur(event: FocusEvent<HTMLButtonElement>) {
    onBlur?.(event);
    setTooltipOpen(false);
  }

  function handleClick(event: MouseEvent<HTMLButtonElement>) {
    setTooltipOpen(false);
    onClick?.(event);
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
          hasVisibleLabel ? "h-6 min-h-6 w-auto gap-1 rounded-xs px-2 py-0 !text-[9px]" : "size-6 rounded-xs p-0",
          "text-tertiary",
          className,
        )}
        onBlur={handleBlur}
        onClick={handleClick}
        onFocus={handleFocus}
        onPointerEnter={handlePointerEnter}
        onPointerLeave={handlePointerLeave}
      >
        {children}
        {visibleLabel ? <span className="whitespace-nowrap">{visibleLabel}</span> : null}
      </Button>
      <ToolbarTooltip id={tooltipId} label={label} open={!hasVisibleLabel && tooltipOpen} anchorRef={wrapperRef} />
    </span>
  );
}
