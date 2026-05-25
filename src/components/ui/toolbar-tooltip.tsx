"use client";

import type { RefObject } from "react";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

type ToolbarTooltipProps = {
  id: string;
  label: string;
  open: boolean;
  anchorRef: RefObject<HTMLElement | null>;
};

type TooltipPosition = {
  left: number;
  top: number;
};

export function ToolbarTooltip({ id, label, open, anchorRef }: ToolbarTooltipProps) {
  const [position, setPosition] = useState<TooltipPosition | null>(null);

  useEffect(() => {
    if (!open) return;

    let animationFrameId = 0;

    function updatePosition() {
      const rect = anchorRef.current?.getBoundingClientRect();
      if (!rect) return;

      setPosition({
        left: Math.max(8, Math.min(rect.left, window.innerWidth - 8)),
        top: Math.max(8, Math.min(rect.bottom + 4, window.innerHeight - 8)),
      });
    }

    animationFrameId = window.requestAnimationFrame(updatePosition);
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    return () => {
      window.cancelAnimationFrame(animationFrameId);
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [anchorRef, open]);

  if (typeof document === "undefined" || !open || !position) return null;

  return createPortal(
    <span
      id={id}
      role="tooltip"
      className="pointer-events-none fixed z-[1100] max-w-[calc(100vw-16px)] whitespace-nowrap rounded-xs border border-hairline bg-ink px-1.5 py-1 text-[9px] font-medium leading-none text-white opacity-100 shadow-sm"
      style={{ left: position.left, top: position.top }}
    >
      {label}
    </span>,
    document.body,
  );
}
