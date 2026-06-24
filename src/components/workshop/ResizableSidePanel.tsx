"use client";

import type { CSSProperties, KeyboardEvent, ReactNode } from "react";
import { useEffect, useRef, useState } from "react";
import { SidebarSimple } from "@phosphor-icons/react/dist/ssr";

import { Button } from "@/components/ui/button";
import {
  clampSidePanelContentWidth,
  getSidePanelWidthConfig,
  getSidePanelWidthCookieName,
} from "./side-panel-widths";
import { cn } from "@/lib/ui/cn";
import { useMediaQuery } from "@/hooks/use-media-query";
import { useEstimateSurfaceVariant } from "./estimate-surface-variant";

type ResizableSidePanelProps = {
  side: "left" | "right";
  ariaLabel: string;
  storageKey: string;
  defaultWidth: number;
  minWidth: number;
  maxWidth: number;
  widthOffset?: number;
  collapsedWidth?: number;
  persistWidth?: boolean;
  children?: ReactNode;
};

function getInitialWidth(storageKey: string, defaultWidth: number, minWidth: number, maxWidth: number) {
  if (typeof document === "undefined") return defaultWidth;
  try {
    const cookieName = `${getSidePanelWidthCookieName(storageKey)}=`;
    const saved = document.cookie
      .split(";")
      .map((entry) => entry.trim())
      .find((entry) => entry.startsWith(cookieName))
      ?.slice(cookieName.length);
    const parsed = saved ? Number.parseInt(saved, 10) : NaN;
    return clampSidePanelContentWidth(parsed, minWidth, maxWidth, defaultWidth);
  } catch {
    return defaultWidth;
  }
}

function getPanelWidthCssVariable(storageKey: string) {
  return getSidePanelWidthConfig(storageKey)?.cssVariable ?? null;
}

function persistPanelWidth(storageKey: string, width: number) {
  try { window.localStorage.setItem(storageKey, String(width)); } catch {}
  try {
    document.cookie = `${getSidePanelWidthCookieName(storageKey)}=${width}; Path=/; Max-Age=31536000; SameSite=Lax`;
  } catch {}
}

export function ResizableSidePanel({
  side,
  ariaLabel,
  storageKey,
  defaultWidth,
  minWidth,
  maxWidth,
  widthOffset = 0,
  collapsedWidth = 32,
  persistWidth = true,
  children,
}: ResizableSidePanelProps) {
  const glass = useEstimateSurfaceVariant() === "glass";
  const [collapsed, setCollapsed] = useState(false);
  const [savedWidth, setSavedWidth] = useState(() => persistWidth ? getInitialWidth(storageKey, defaultWidth, minWidth, maxWidth) : defaultWidth);
  const [dragWidth, setDragWidth] = useState<number | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const compactViewport = useMediaQuery("(max-width: 1023px)");
  const width = dragWidth ?? savedWidth;
  const actualWidth = collapsed ? collapsedWidth : width + widthOffset;
  const responsiveWidth = compactViewport ? 0 : actualWidth;
  const cssVariable = persistWidth ? getPanelWidthCssVariable(storageKey) : null;
  const defaultActualWidth = defaultWidth + widthOffset;
  const panelStyle = {
    width: compactViewport || collapsed || dragWidth !== null || !cssVariable
      ? responsiveWidth
      : `var(${cssVariable}, ${defaultActualWidth}px)`,
  } satisfies CSSProperties;
  const dragging = useRef(false);
  const startX = useRef(0);
  const startWidth = useRef(defaultWidth);

  useEffect(() => {
    if (!persistWidth) return;
    const panelWidthCssVariable = getPanelWidthCssVariable(storageKey);
    if (!panelWidthCssVariable) return;
    const targets = [
      document.documentElement,
      document.querySelector<HTMLElement>("[data-workshop-page-shell-canvas]"),
    ].filter((target): target is HTMLElement => Boolean(target));
    const previousWidths = targets.map((target) => target.style.getPropertyValue(panelWidthCssVariable));

    targets.forEach((target) => target.style.setProperty(panelWidthCssVariable, `${responsiveWidth}px`));

    return () => {
      targets.forEach((target, index) => {
        const previousWidth = previousWidths[index];
        if (previousWidth) target.style.setProperty(panelWidthCssVariable, previousWidth);
        else target.style.removeProperty(panelWidthCssVariable);
      });
    };
  }, [persistWidth, responsiveWidth, storageKey]);

  function startResize(event: React.MouseEvent) {
    if (collapsed) return;
    event.preventDefault();
    dragging.current = true;
    setIsDragging(true);
    startX.current = event.clientX;
    startWidth.current = width;
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";

    function onMove(moveEvent: MouseEvent) {
      if (!dragging.current) return;
      const delta = side === "left" ? moveEvent.clientX - startX.current : startX.current - moveEvent.clientX;
      setDragWidth(Math.min(maxWidth, Math.max(minWidth, startWidth.current + delta)));
    }

    function onUp(upEvent: MouseEvent) {
      dragging.current = false;
      setIsDragging(false);
      const delta = side === "left" ? upEvent.clientX - startX.current : startX.current - upEvent.clientX;
      const finalWidth = Math.min(maxWidth, Math.max(minWidth, startWidth.current + delta));
      setSavedWidth(finalWidth);
      setDragWidth(finalWidth);
      if (persistWidth) persistPanelWidth(storageKey, finalWidth);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    }

    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  }

  function commitWidth(nextWidth: number) {
    const finalWidth = Math.min(maxWidth, Math.max(minWidth, nextWidth));
    setSavedWidth(finalWidth);
    setDragWidth(finalWidth);
    if (persistWidth) persistPanelWidth(storageKey, finalWidth);
  }

  function handleResizeKeyDown(event: KeyboardEvent) {
    if (collapsed) return;
    const step = event.shiftKey ? 32 : 12;
    if (event.key === "Home") {
      event.preventDefault();
      commitWidth(minWidth);
      return;
    }
    if (event.key === "End") {
      event.preventDefault();
      commitWidth(maxWidth);
      return;
    }
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;

    event.preventDefault();
    const expandsLeftPanel = side === "left" && event.key === "ArrowRight";
    const expandsRightPanel = side === "right" && event.key === "ArrowLeft";
    commitWidth(width + (expandsLeftPanel || expandsRightPanel ? step : -step));
  }

  const resizer = (
    // react-doctor-disable-next-line react-doctor/prefer-tag-over-role -- This interactive splitter contains grip visuals; native <hr> is void and cannot host them.
    <div
      aria-hidden={collapsed}
      aria-label={`Resize ${ariaLabel}`}
      aria-orientation="vertical"
      aria-valuemax={maxWidth}
      aria-valuemin={minWidth}
      aria-valuenow={width}
      className={cn(
        "group/resizer relative h-full shrink-0 overflow-hidden transition-[width,background-color] duration-150",
        collapsed
          ? "w-0 cursor-default"
          : isDragging
            ? "w-2 cursor-col-resize border-x border-hairline bg-[#E5E5E5]"
            // glass: a transparent grab strip (the grip dots still signal it) so
            // it reads as the float gutter, not a white seam at the pane edge.
            : glass
              ? "w-2 cursor-col-resize bg-transparent hover:bg-[#E5E5E5]"
              : "w-2 cursor-col-resize border-x border-hairline bg-white hover:bg-[#E5E5E5]",
      )}
      role="separator"
      tabIndex={collapsed ? -1 : 0}
      onKeyDown={handleResizeKeyDown}
      onMouseDown={startResize}
      title="Drag to resize"
    >
      <div className="absolute left-1/2 top-1/2 grid -translate-x-1/2 -translate-y-1/2 grid-cols-2 gap-[3px]">
        {Array.from({ length: 6 }).map((_, index) => (
          <span
            key={index}
            className={[
              "size-[3px] rounded-xs transition-colors",
              isDragging ? "bg-[#7F7F7F]" : "bg-divider group-hover/resizer:bg-[#7F7F7F]",
            ].join(" ")}
          />
        ))}
      </div>
    </div>
  );

  const toggle = (
    <Button
      variant="ghost"
      size="icon-sm"
      aria-label={collapsed ? `Expand ${ariaLabel}` : `Collapse ${ariaLabel}`}
      aria-expanded={!collapsed}
      style={{ width: collapsedWidth }}
      className={cn(
        "h-full rounded-xs text-secondary transition-colors hover:bg-[#E5E5E5] hover:text-ink focus-visible:bg-[#E5E5E5] focus-visible:text-ink",
        // glass: a faint frosted chip (kept discoverable) instead of a solid
        // white slab on the pane's inner edge.
        glass ? "border-[color:var(--glass-border)] bg-white/35" : "border-hairline bg-white",
        side === "right" ? "border-l" : "border-r",
      )}
      onClick={() => setCollapsed((value) => !value)}
    >
      <SidebarSimple size={14} aria-hidden="true" className={side === "left" ? "" : "rotate-180"} />
    </Button>
  );

  return (
    <div className="group hidden h-full shrink-0 overflow-hidden lg:flex" style={panelStyle}>
      {side === "right" ? toggle : null}
      {side === "right" ? resizer : null}
      <aside className={cn("h-full min-w-0 flex-1 overflow-hidden !text-[10px]", glass ? "bg-transparent" : "bg-white")} aria-label={ariaLabel} aria-hidden={collapsed}>
        {!collapsed ? children : null}
      </aside>
      {side === "left" ? resizer : null}
      {side === "left" ? toggle : null}
    </div>
  );
}
