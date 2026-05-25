"use client";

import type { CSSProperties, ReactNode } from "react";
import { useEffect, useRef, useState } from "react";
import { SidebarSimple } from "@phosphor-icons/react/dist/ssr";

import { Button } from "@/components/ui/button";
import {
  clampSidePanelContentWidth,
  getSidePanelWidthConfig,
  getSidePanelWidthCookieName,
} from "./side-panel-widths";

type ResizableSidePanelProps = {
  side: "left" | "right";
  ariaLabel: string;
  storageKey: string;
  defaultWidth: number;
  minWidth: number;
  maxWidth: number;
  widthOffset?: number;
  collapsedWidth?: number;
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
  children,
}: ResizableSidePanelProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [savedWidth, setSavedWidth] = useState(() => getInitialWidth(storageKey, defaultWidth, minWidth, maxWidth));
  const [dragWidth, setDragWidth] = useState<number | null>(null);
  const [compactViewport, setCompactViewport] = useState(false);
  const width = dragWidth ?? savedWidth;
  const actualWidth = (collapsed ? collapsedWidth : width) + widthOffset;
  const responsiveWidth = compactViewport ? 0 : actualWidth;
  const cssVariable = getPanelWidthCssVariable(storageKey);
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
    const mediaQuery = window.matchMedia("(max-width: 1023px)");
    const updateCompactViewport = () => setCompactViewport(mediaQuery.matches);
    updateCompactViewport();
    mediaQuery.addEventListener("change", updateCompactViewport);
    return () => mediaQuery.removeEventListener("change", updateCompactViewport);
  }, []);

  useEffect(() => {
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
  }, [responsiveWidth, storageKey]);

  function startResize(event: React.MouseEvent) {
    if (collapsed) return;
    event.preventDefault();
    dragging.current = true;
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
      const delta = side === "left" ? upEvent.clientX - startX.current : startX.current - upEvent.clientX;
      const finalWidth = Math.min(maxWidth, Math.max(minWidth, startWidth.current + delta));
      setSavedWidth(finalWidth);
      setDragWidth(finalWidth);
      persistPanelWidth(storageKey, finalWidth);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    }

    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  }

  const resizer = (
    <div
      aria-hidden={collapsed}
      className={[
        "relative h-full shrink-0 overflow-hidden transition-[width] duration-150",
        collapsed ? "w-0 cursor-default" : "w-2 cursor-col-resize",
      ].join(" ")}
      onMouseDown={startResize}
      title="Drag to resize"
    >
      <div className="absolute left-1/2 top-1/2 grid -translate-x-1/2 -translate-y-1/2 grid-cols-2 gap-[3px]">
        {Array.from({ length: 6 }).map((_, index) => (
          <span key={index} className="size-[3px] rounded-xs bg-divider" />
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
      className="h-full rounded-xs border-x border-hairline bg-white hover:bg-white"
      onClick={() => setCollapsed((value) => !value)}
    >
      <SidebarSimple size={14} aria-hidden="true" className={side === "left" ? "" : "rotate-180"} />
    </Button>
  );

  return (
    <div className="group hidden h-full shrink-0 overflow-hidden lg:flex" style={panelStyle}>
      {side === "right" ? toggle : null}
      {side === "right" ? resizer : null}
      <aside className="h-full min-w-0 flex-1 overflow-hidden bg-white !text-[10px]" aria-label={ariaLabel} aria-hidden={collapsed}>
        {!collapsed ? children : null}
      </aside>
      {side === "left" ? resizer : null}
      {side === "left" ? toggle : null}
    </div>
  );
}
