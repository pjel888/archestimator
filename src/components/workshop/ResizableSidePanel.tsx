"use client";

import type { ReactNode } from "react";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { SidebarSimple } from "@phosphor-icons/react/dist/ssr";

import { Button } from "@/components/ui/button";

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
  if (typeof window === "undefined" || !window.localStorage) return defaultWidth;
  try {
    const saved = window.localStorage.getItem(storageKey);
    if (!saved) return defaultWidth;
    const parsed = Number.parseInt(saved, 10);
    return Number.isFinite(parsed) ? Math.min(maxWidth, Math.max(minWidth, parsed)) : defaultWidth;
  } catch {
    return defaultWidth;
  }
}

function subscribeToPanelStorage() {
  return () => {};
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
  const savedWidth = useSyncExternalStore(
    subscribeToPanelStorage,
    () => getInitialWidth(storageKey, defaultWidth, minWidth, maxWidth),
    () => defaultWidth,
  );
  const [dragWidth, setDragWidth] = useState<number | null>(null);
  const width = dragWidth ?? savedWidth;
  const actualWidth = (collapsed ? collapsedWidth : width) + widthOffset;
  const dragging = useRef(false);
  const startX = useRef(0);
  const startWidth = useRef(defaultWidth);

  useEffect(() => {
    if (storageKey !== "estimate_sheet_tree_width" && storageKey !== "estimate_component_library_width_v2") return;
    const cssVariable = storageKey === "estimate_sheet_tree_width" ? "--estimate-tree-panel-width" : "--estimate-library-panel-width";
    const previousWidth = document.documentElement.style.getPropertyValue(cssVariable);
    document.documentElement.style.setProperty(cssVariable, `${actualWidth}px`);

    return () => {
      if (previousWidth) document.documentElement.style.setProperty(cssVariable, previousWidth);
      else document.documentElement.style.removeProperty(cssVariable);
    };
  }, [actualWidth, storageKey]);

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
      setDragWidth(finalWidth);
      try { window.localStorage.setItem(storageKey, String(finalWidth)); } catch {}
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
          <span key={index} className="size-[3px] rounded-full bg-divider" />
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
      className="h-full rounded-none border-x border-hairline bg-white hover:bg-white"
      onClick={() => setCollapsed((value) => !value)}
    >
      <SidebarSimple size={14} aria-hidden="true" className={side === "left" ? "" : "rotate-180"} />
    </Button>
  );

  return (
    <div className="group flex h-full shrink-0" style={{ width: actualWidth }}>
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
