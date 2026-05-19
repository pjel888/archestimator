"use client";

import type { FocusEvent, ReactNode, SelectHTMLAttributes } from "react";
import { useId, useRef, useState } from "react";

import { ToolbarTooltip } from "@/components/ui/toolbar-tooltip";
import { cn } from "@/lib/ui/cn";

type ToolbarIconSelectProps = SelectHTMLAttributes<HTMLSelectElement> & {
  label: string;
  icon: ReactNode;
  wrapperClassName?: string;
};

export function ToolbarIconSelect({
  label,
  icon,
  className,
  wrapperClassName,
  children,
  onBlur,
  onFocus,
  ...props
}: ToolbarIconSelectProps) {
  const [tooltipOpen, setTooltipOpen] = useState(false);
  const wrapperRef = useRef<HTMLSpanElement>(null);
  const tooltipId = useId();
  const describedBy = [props["aria-describedby"], tooltipId].filter(Boolean).join(" ");

  function handleFocus(event: FocusEvent<HTMLSelectElement>) {
    onFocus?.(event);
    setTooltipOpen(true);
  }

  function handleBlur(event: FocusEvent<HTMLSelectElement>) {
    onBlur?.(event);
    setTooltipOpen(false);
  }

  return (
    <span
      ref={wrapperRef}
      className={cn("relative inline-flex size-6 items-center justify-center rounded-sm text-tertiary hover:bg-surfaceMuted focus-within:bg-surfaceMuted", wrapperClassName)}
      onPointerEnter={() => setTooltipOpen(true)}
      onPointerLeave={() => setTooltipOpen(false)}
    >
      <span className="pointer-events-none flex size-6 items-center justify-center" aria-hidden="true">
        {icon}
      </span>
      <select
        {...props}
        aria-label={label}
        aria-describedby={describedBy || undefined}
        title={label}
        className={cn("absolute inset-0 size-full cursor-pointer appearance-none rounded-sm border-0 bg-transparent p-0 text-transparent outline-none", className)}
        onBlur={handleBlur}
        onFocus={handleFocus}
      >
        {children}
      </select>
      <ToolbarTooltip id={tooltipId} label={label} open={tooltipOpen} anchorRef={wrapperRef} />
    </span>
  );
}
