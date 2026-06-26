"use client";

import { cloneElement, isValidElement, type ReactNode, useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

import { cn } from "@/lib/ui/cn";

export type TooltipSide = "top" | "right" | "bottom" | "left";

export type TooltipProps = {
  label: ReactNode;
  children: ReactNode;
  side?: TooltipSide;
  open?: boolean;
  defaultOpen?: boolean;
  delayDuration?: number;
  className?: string;
  contentClassName?: string;
};

type TooltipPosition = {
  left: number;
  top: number;
};

const TOOLTIP_COLLISION_PADDING = 8;
const TOOLTIP_SIDE_OFFSET = 6;

function clamp(value: number, min: number, max: number) {
  if (max < min) return min;
  return Math.max(min, Math.min(value, max));
}

function getTooltipPosition(anchorRect: DOMRect, tooltipRect: DOMRect | undefined, side: TooltipSide): TooltipPosition {
  const tooltipWidth = tooltipRect?.width ?? 0;
  const tooltipHeight = tooltipRect?.height ?? 0;
  const centeredLeft = anchorRect.left + anchorRect.width / 2 - tooltipWidth / 2;
  const centeredTop = anchorRect.top + anchorRect.height / 2 - tooltipHeight / 2;

  const preferred = (() => {
    switch (side) {
      case "right":
        return {
          left: anchorRect.right + TOOLTIP_SIDE_OFFSET,
          top: centeredTop,
        };
      case "bottom":
        return {
          left: centeredLeft,
          top: anchorRect.bottom + TOOLTIP_SIDE_OFFSET,
        };
      case "left":
        return {
          left: anchorRect.left - tooltipWidth - TOOLTIP_SIDE_OFFSET,
          top: centeredTop,
        };
      case "top":
        return {
          left: centeredLeft,
          top: anchorRect.top - tooltipHeight - TOOLTIP_SIDE_OFFSET,
        };
    }
  })();

  return {
    left: clamp(preferred.left, TOOLTIP_COLLISION_PADDING, window.innerWidth - tooltipWidth - TOOLTIP_COLLISION_PADDING),
    top: clamp(preferred.top, TOOLTIP_COLLISION_PADDING, window.innerHeight - tooltipHeight - TOOLTIP_COLLISION_PADDING),
  };
}

export function Tooltip({
  label,
  children,
  side = "top",
  open,
  defaultOpen = false,
  delayDuration = 150,
  className,
  contentClassName,
}: TooltipProps) {
  const [hoverOpen, setHoverOpen] = useState(defaultOpen);
  const [position, setPosition] = useState<TooltipPosition | null>(null);
  const tooltipId = useId();
  const anchorRef = useRef<HTMLSpanElement>(null);
  const tooltipRef = useRef<HTMLSpanElement>(null);
  const delayTimerRef = useRef<number | null>(null);
  const isOpen = open ?? hoverOpen;
  const trigger = isOpen && isValidElement<{ "aria-describedby"?: string }>(children)
    ? cloneElement(children, {
        "aria-describedby": [children.props["aria-describedby"], tooltipId].filter(Boolean).join(" "),
      })
    : children;

  function clearDelayTimer() {
    if (delayTimerRef.current === null) return;
    window.clearTimeout(delayTimerRef.current);
    delayTimerRef.current = null;
  }

  function openWithDelay() {
    if (open !== undefined) return;
    clearDelayTimer();
    delayTimerRef.current = window.setTimeout(() => {
      setHoverOpen(true);
      delayTimerRef.current = null;
    }, delayDuration);
  }

  function openNow() {
    if (open !== undefined) return;
    clearDelayTimer();
    setHoverOpen(true);
  }

  function closeTooltip() {
    if (open !== undefined) return;
    clearDelayTimer();
    setHoverOpen(false);
  }

  useEffect(() => () => clearDelayTimer(), []);

  useLayoutEffect(() => {
    if (!isOpen) return;

    let animationFrameId = 0;

    function updatePosition() {
      const anchorRect = anchorRef.current?.getBoundingClientRect();
      if (!anchorRect) return;
      setPosition(getTooltipPosition(anchorRect, tooltipRef.current?.getBoundingClientRect(), side));
    }

    updatePosition();
    animationFrameId = window.requestAnimationFrame(updatePosition);
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    return () => {
      window.cancelAnimationFrame(animationFrameId);
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [isOpen, side, label]);

  useEffect(() => {
    if (!isOpen || open !== undefined) return;
    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setHoverOpen(false);
    }
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [isOpen, open]);

  return (
    <span
      ref={anchorRef}
      className={cn("relative inline-flex", className)}
      onMouseEnter={openWithDelay}
      onMouseLeave={closeTooltip}
      onFocus={openNow}
      onBlur={closeTooltip}
    >
      <span aria-describedby={isOpen ? tooltipId : undefined} className="inline-flex h-full w-full">
        {trigger}
      </span>
      {typeof document !== "undefined" && isOpen ? createPortal(
        <span
          ref={tooltipRef}
          id={tooltipId}
          role="tooltip"
          data-side={side}
          className={cn(
            "pointer-events-none fixed z-[1100] max-w-[calc(100vw-16px)] whitespace-nowrap rounded-xs border border-ink bg-ink px-1.5 py-1 text-[9px] font-medium leading-none tracking-normal text-white opacity-100 shadow-[0_8px_20px_rgba(17,24,39,0.18)]",
            contentClassName,
          )}
          style={{
            left: position?.left ?? -10_000,
            top: position?.top ?? -10_000,
          }}
        >
          {label}
        </span>,
        document.body,
      ) : null}
    </span>
  );
}
