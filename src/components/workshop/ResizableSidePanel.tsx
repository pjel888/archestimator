"use client";

import type { CSSProperties, KeyboardEvent, ReactNode } from "react";
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { SidebarSimple, X } from "@phosphor-icons/react/dist/ssr";

import { Button } from "@/components/ui/button";
import { IconButton } from "@/components/ui/icon-button";
import { createModalLifecyclePublisher } from "@/components/ui/overlays/modal-lifecycle";
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
  compactDrawer?: boolean;
  compactBreakpoint?: "lg" | "estimate-narrow" | "estimate-wide";
  forceDesktop?: boolean;
  children?: ReactNode;
};

const COMPACT_BREAKPOINTS = {
  lg: {
    query: "(max-width: 1023px)",
    compactClassName: "lg:hidden",
    desktopClassName: "hidden lg:flex",
  },
  "estimate-narrow": {
    query: "(max-width: 1399px)",
    compactClassName: "min-[1400px]:hidden",
    desktopClassName: "hidden min-[1400px]:flex",
  },
  "estimate-wide": {
    query: "(max-width: 1719px)",
    compactClassName: "min-[1720px]:hidden",
    desktopClassName: "hidden min-[1720px]:flex",
  },
} as const;

const emptySubscribe = () => () => {};

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

function getSidePanelId(storageKey: string) {
  return `resizable-side-panel-${storageKey.replace(/[^a-zA-Z0-9_-]/g, "-")}`;
}

function persistPanelWidth(storageKey: string, width: number) {
  try { window.localStorage.setItem(storageKey, String(width)); } catch {}
  try {
    document.cookie = `${getSidePanelWidthCookieName(storageKey)}=${width}; Path=/; Max-Age=31536000; SameSite=Lax`;
  } catch {}
}

function getCollapsedStorageKey(storageKey: string) {
  return `${storageKey}:collapsed`;
}

function getInitialCollapsed(storageKey: string) {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(getCollapsedStorageKey(storageKey)) === "true";
  } catch {
    return false;
  }
}

function persistPanelCollapsed(storageKey: string, collapsed: boolean) {
  try {
    window.localStorage.setItem(getCollapsedStorageKey(storageKey), collapsed ? "true" : "false");
  } catch {}
}

function usePanelWidthSnapshot(
  storageKey: string,
  defaultWidth: number,
  minWidth: number,
  maxWidth: number,
  persistWidth: boolean,
) {
  return useSyncExternalStore(
    emptySubscribe,
    () => persistWidth ? getInitialWidth(storageKey, defaultWidth, minWidth, maxWidth) : defaultWidth,
    () => defaultWidth,
  );
}

function usePanelCollapsedSnapshot(storageKey: string, persistWidth: boolean) {
  return useSyncExternalStore(
    emptySubscribe,
    () => persistWidth ? getInitialCollapsed(storageKey) : false,
    () => false,
  );
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
  compactDrawer = true,
  compactBreakpoint = "lg",
  forceDesktop = false,
  children,
}: ResizableSidePanelProps) {
  const glass = useEstimateSurfaceVariant() === "glass";
  const persistedWidth = usePanelWidthSnapshot(storageKey, defaultWidth, minWidth, maxWidth, persistWidth);
  const persistedCollapsed = usePanelCollapsedSnapshot(storageKey, persistWidth);
  const [collapsed, setCollapsed] = useState(persistedCollapsed);
  const [committedWidth, setCommittedWidth] = useState<number | null>(null);
  const [dragWidth, setDragWidth] = useState<number | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const compactBreakpointConfig = COMPACT_BREAKPOINTS[compactBreakpoint];
  const matchesCompactViewport = useMediaQuery(compactBreakpointConfig.query);
  const compactViewport = !forceDesktop && matchesCompactViewport;
  const width = dragWidth ?? committedWidth ?? persistedWidth;
  const actualWidth = collapsed ? collapsedWidth : width + widthOffset;
  const responsiveWidth = compactViewport ? 0 : actualWidth;
  const cssVariable = persistWidth ? getPanelWidthCssVariable(storageKey) : null;
  const panelId = getSidePanelId(storageKey);
  const defaultActualWidth = defaultWidth + widthOffset;
  const panelStyle = {
    width: compactViewport || collapsed || dragWidth !== null || !cssVariable
      ? responsiveWidth
      : `var(${cssVariable}, ${defaultActualWidth}px)`,
  } satisfies CSSProperties;
  const dragging = useRef(false);
  const startX = useRef(0);
  const startWidth = useRef(defaultWidth);
  const drawerRef = useRef<HTMLDivElement | null>(null);
  const drawerTriggerRef = useRef<HTMLButtonElement | null>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const [modalLifecycle] = useState(createModalLifecyclePublisher);

  useEffect(() => {
    const frameId = window.requestAnimationFrame(() => setCollapsed(persistedCollapsed));
    return () => window.cancelAnimationFrame(frameId);
  }, [persistedCollapsed]);

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
      setCommittedWidth(finalWidth);
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
    setCommittedWidth(finalWidth);
    setDragWidth(finalWidth);
    if (persistWidth) persistPanelWidth(storageKey, finalWidth);
  }

  function toggleCollapsed() {
    setCollapsed((value) => {
      const nextValue = !value;
      if (persistWidth) persistPanelCollapsed(storageKey, nextValue);
      return nextValue;
    });
  }

  const openDrawer = useCallback(() => {
    previousFocusRef.current = document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null;
    modalLifecycle.opening();
    setDrawerOpen(true);
  }, [modalLifecycle]);

  const closeDrawer = useCallback(() => {
    setDrawerOpen(false);
    window.requestAnimationFrame(() => {
      const target = previousFocusRef.current ?? drawerTriggerRef.current;
      if (target?.isConnected) target.focus({ preventScroll: true });
      modalLifecycle.closedFocusRestored();
    });
  }, [modalLifecycle]);

  function handleDrawerKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === "Escape") {
      event.preventDefault();
      closeDrawer();
      return;
    }

    if (event.key !== "Tab") return;

    const focusable = Array.from(
      drawerRef.current?.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
      ) ?? [],
    ).filter((element) => !element.hasAttribute("disabled") && element.getAttribute("aria-hidden") !== "true");
    if (focusable.length === 0) return;

    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
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
      aria-controls={panelId}
      aria-expanded={!collapsed}
      style={{ width: collapsedWidth }}
      className={cn(
        "h-full rounded-xs text-secondary transition-colors hover:bg-[#E5E5E5] hover:text-ink focus-visible:bg-[#E5E5E5] focus-visible:text-ink",
        // glass: a faint frosted chip (kept discoverable) instead of a solid
        // white slab on the pane's inner edge.
        glass ? "border-[color:var(--glass-border)] bg-white/35" : "border-hairline bg-white",
        side === "right" ? "border-l" : "border-r",
      )}
      onClick={toggleCollapsed}
    >
      <SidebarSimple size={14} aria-hidden="true" className={side === "left" ? "" : "rotate-180"} />
    </Button>
  );

  useEffect(() => {
    if (!drawerOpen) return;
    const focusable = drawerRef.current?.querySelector<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
    );
    window.requestAnimationFrame(() => {
      (focusable ?? drawerRef.current)?.focus();
    });
  }, [drawerOpen]);

  useEffect(() => {
    if (compactViewport || !drawerOpen) return;
    const frameId = window.requestAnimationFrame(closeDrawer);
    return () => window.cancelAnimationFrame(frameId);
  }, [closeDrawer, compactViewport, drawerOpen]);

  useEffect(
    () => () => {
      modalLifecycle.closedFocusRestored();
    },
    [modalLifecycle],
  );

  if (compactViewport && !compactDrawer) {
    return null;
  }

  if (compactViewport) {
    const drawerSideClass = side === "right" ? "right-0 border-l" : "left-0 border-r";
    const triggerSideClass = side === "right" ? "ml-auto border-l" : "mr-auto border-r";
    const drawerLabel = `${ariaLabel} drawer`;

    return (
      <>
        <IconButton
          type="button"
          ref={drawerTriggerRef}
          variant="secondary"
          size="icon-lg"
          label={`Open ${drawerLabel}`}
          title={undefined}
          aria-controls={panelId}
          aria-expanded={drawerOpen}
          aria-haspopup="dialog"
          className={cn(
            "h-full min-h-10 w-auto min-w-0 shrink-0 gap-2 border-hairline px-2 !text-[10px] text-secondary",
            compactBreakpointConfig.compactClassName,
            triggerSideClass,
          )}
          onClick={openDrawer}
          icon={
            <>
              <SidebarSimple size={14} aria-hidden="true" className={side === "left" ? "" : "rotate-180"} />
              <span className="sr-only">{ariaLabel}</span>
            </>
          }
        />
        {drawerOpen ? (
          <div
            className={cn("fixed inset-0 z-50 bg-black/30", compactBreakpointConfig.compactClassName)}
            onMouseDown={(event) => {
              if (event.target === event.currentTarget) closeDrawer();
            }}
          >
            <div
              ref={drawerRef}
              id={panelId}
              role="dialog"
              aria-modal="true"
              aria-label={drawerLabel}
              tabIndex={-1}
              className={cn(
                "fixed inset-y-0 flex w-[min(24rem,calc(100vw-2rem))] flex-col border-hairline bg-white text-ink shadow-2xl outline-none",
                drawerSideClass,
              )}
              onKeyDown={handleDrawerKeyDown}
            >
              <div className="flex h-10 shrink-0 items-center justify-between border-b border-hairline px-3">
                <h2 className="text-[11px] font-medium text-ink">{ariaLabel}</h2>
                <Button variant="ghost" size="icon-sm" aria-label={`Close ${drawerLabel}`} onClick={closeDrawer}>
                  <X size={14} aria-hidden="true" />
                </Button>
              </div>
              <aside className="min-h-0 flex-1 overflow-hidden !text-[10px]" aria-label={ariaLabel}>
                {children}
              </aside>
            </div>
          </div>
        ) : null}
      </>
    );
  }

  return (
    <div
      className={cn(
        "group h-full shrink-0 overflow-hidden",
        forceDesktop ? "flex" : compactBreakpointConfig.desktopClassName,
      )}
      style={panelStyle}
    >
      {side === "right" ? toggle : null}
      {side === "right" ? resizer : null}
      <aside id={panelId} className={cn("h-full min-w-0 flex-1 overflow-hidden !text-[10px]", glass ? "bg-transparent" : "bg-white")} aria-label={ariaLabel} aria-hidden={collapsed}>
        {!collapsed ? children : null}
      </aside>
      {side === "left" ? resizer : null}
      {side === "left" ? toggle : null}
    </div>
  );
}
