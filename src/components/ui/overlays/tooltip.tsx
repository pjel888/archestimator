"use client";

import { cloneElement, isValidElement, type ReactNode, useId, useState } from "react";

import { cn } from "@/lib/ui/cn";

export type TooltipSide = "top" | "right" | "bottom" | "left";

export type TooltipProps = {
  label: ReactNode;
  children: ReactNode;
  side?: TooltipSide;
  open?: boolean;
  defaultOpen?: boolean;
  className?: string;
  contentClassName?: string;
};

const tooltipSideClasses: Record<TooltipSide, string> = {
  top: "bottom-full left-1/2 mb-1 -translate-x-1/2",
  right: "left-full top-1/2 ml-1 -translate-y-1/2",
  bottom: "left-1/2 top-full mt-1 -translate-x-1/2",
  left: "right-full top-1/2 mr-1 -translate-y-1/2",
};

export function Tooltip({ label, children, side = "top", open, defaultOpen = false, className, contentClassName }: TooltipProps) {
  const [hoverOpen, setHoverOpen] = useState(defaultOpen);
  const tooltipId = useId();
  const isOpen = open ?? hoverOpen;
  const trigger = isOpen && isValidElement<{ "aria-describedby"?: string }>(children)
    ? cloneElement(children, {
        "aria-describedby": [children.props["aria-describedby"], tooltipId].filter(Boolean).join(" "),
      })
    : children;

  return (
    <span
      className={cn("relative inline-flex", className)}
      onMouseEnter={() => setHoverOpen(true)}
      onMouseLeave={() => setHoverOpen(false)}
      onFocus={() => setHoverOpen(true)}
      onBlur={() => setHoverOpen(false)}
    >
      <span aria-describedby={isOpen ? tooltipId : undefined} className="inline-flex">
        {trigger}
      </span>
      {isOpen ? (
        <span
          id={tooltipId}
          role="tooltip"
          className={cn(
            "absolute z-[1100] whitespace-nowrap rounded-xs border border-ink bg-ink px-1.5 py-1 text-[9px] font-medium leading-none tracking-normal text-white shadow-[0_8px_20px_rgba(17,24,39,0.18)]",
            tooltipSideClasses[side],
            contentClassName,
          )}
        >
          {label}
        </span>
      ) : null}
    </span>
  );
}
