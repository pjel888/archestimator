"use client";

import * as React from "react";
import { createPortal } from "react-dom";

import { cn } from "@/lib/ui/cn";

/**
 * Shared popup core for the dropdown system (`DropdownMenu`, `DropdownSelect`).
 *
 * The panel portals to `document.body` with fixed positioning computed from
 * the trigger rect, so it is never clipped by `overflow-hidden`/`overflow-auto`
 * ancestors (the estimate sheet's section wrappers) and paints at the menu
 * layer of the z map: modal `z-[1000]` < menu `z-[1050]` < tooltip `z-[1100]`.
 *
 * Event mechanics that look odd but are load-bearing:
 *
 * - Escape is handled by a CAPTURE-PHASE document keydown listener on the
 *   NATIVE event. React's synthetic `preventDefault` never reaches other
 *   document-level listeners (the dialog's close-on-Escape), so the popup
 *   must stop the native event before bubble-phase listeners see it.
 * - Outside dismissal fires on `pointerdown`, but item activation commits on
 *   `click` — and the pointerdown that dismissed the popup registers a
 *   one-shot capture-phase click suppressor so the same gesture cannot also
 *   activate whatever sits under the pointer (dialog overlays, buttons).
 *   Native selects swallow that click too.
 * - Scrolling any ancestor closes the popup (a fixed panel would detach from
 *   its trigger); scrolls originating inside the panel are exempt so long
 *   lists stay usable.
 */

export type DropdownPopupAlign = "start" | "end";
export type DropdownPopupSide = "bottom" | "top";
export type DropdownPopupPlacement = "bottom" | "top";

export type DropdownPopupCloseReason = "escape" | "outside-pointer" | "ancestor-scroll" | "resize" | "select" | "manual";

const VIEWPORT_GUTTER = 8;
const TRIGGER_PANEL_GAP = 4;
const PANEL_MAX_HEIGHT = 320;
const PANEL_MIN_VISIBLE_HEIGHT = 80;

type DropdownPopupPosition = {
  placement: DropdownPopupPlacement;
  top: number;
  left: number;
  minWidth: number;
  maxHeight: number;
};

/**
 * The pointerdown that dismissed a popup must also swallow the click the
 * same gesture produces. `stopPropagation` keeps React handlers (overlay
 * close, buttons) from receiving it; `preventDefault` marks the native event
 * so non-React `defaultPrevented` checks skip it as well. If the gesture
 * never produces a click (drag, cancel), the next pointerdown clears the
 * stale suppressor so a later unrelated click is not eaten.
 */
function suppressNextClickAfterDismiss() {
  const suppress = (event: MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    cleanup();
  };
  const cleanup = () => {
    document.removeEventListener("click", suppress, true);
    document.removeEventListener("pointerdown", cleanup, true);
  };
  document.addEventListener("click", suppress, true);
  document.addEventListener("pointerdown", cleanup, true);
}

type UseDropdownPopupOptions = {
  align?: DropdownPopupAlign;
  side?: DropdownPopupSide;
  /** Fires after every close with the reason; Escape already restored focus to the trigger. */
  onClose?: (reason: DropdownPopupCloseReason) => void;
};

export function useDropdownPopup({ align = "start", side = "bottom", onClose }: UseDropdownPopupOptions = {}) {
  const [open, setOpen] = React.useState(false);
  const [position, setPosition] = React.useState<DropdownPopupPosition | null>(null);
  const rootRef = React.useRef<HTMLDivElement | null>(null);
  const triggerRef = React.useRef<HTMLElement | null>(null);
  const panelRef = React.useRef<HTMLDivElement | null>(null);

  const onCloseRef = React.useRef(onClose);
  React.useEffect(() => {
    onCloseRef.current = onClose;
  });

  const close = React.useCallback((reason: DropdownPopupCloseReason) => {
    setOpen((wasOpen) => {
      if (wasOpen) onCloseRef.current?.(reason);
      return false;
    });
    setPosition(null);
  }, []);

  const openPopup = React.useCallback(() => setOpen(true), []);
  const togglePopup = React.useCallback(() => setOpen((value) => !value), []);

  const closeAndFocusTrigger = React.useCallback(
    (reason: DropdownPopupCloseReason) => {
      close(reason);
      requestAnimationFrame(() => triggerRef.current?.focus?.());
    },
    [close],
  );

  // Fixed positioning from the trigger rect, flipping when the preferred
  // side lacks room (the side with more space wins). The panel renders
  // hidden for one layout pass so its size can be measured before placing.
  React.useLayoutEffect(() => {
    if (!open) return;
    const trigger = triggerRef.current;
    const panel = panelRef.current;
    if (!trigger || !panel) return;

    const triggerRect = trigger.getBoundingClientRect();
    const panelHeight = Math.min(panel.scrollHeight, PANEL_MAX_HEIGHT);
    const panelWidth = Math.max(panel.offsetWidth, triggerRect.width);
    const spaceBelow = window.innerHeight - triggerRect.bottom - VIEWPORT_GUTTER;
    const spaceAbove = triggerRect.top - VIEWPORT_GUTTER;

    let placement: DropdownPopupPlacement = side;
    if (side === "bottom" && panelHeight > spaceBelow && spaceAbove > spaceBelow) placement = "top";
    if (side === "top" && panelHeight > spaceAbove && spaceBelow > spaceAbove) placement = "bottom";

    const availableHeight = placement === "bottom" ? spaceBelow : spaceAbove;
    const maxHeight = Math.max(PANEL_MIN_VISIBLE_HEIGHT, Math.min(PANEL_MAX_HEIGHT, availableHeight));
    const visibleHeight = Math.min(panelHeight, maxHeight);
    const top = placement === "bottom"
      ? triggerRect.bottom + TRIGGER_PANEL_GAP
      : Math.max(VIEWPORT_GUTTER, triggerRect.top - TRIGGER_PANEL_GAP - visibleHeight);

    const preferredLeft = align === "start" ? triggerRect.left : triggerRect.right - panelWidth;
    const maxLeft = window.innerWidth - panelWidth - VIEWPORT_GUTTER;
    const left = Math.max(VIEWPORT_GUTTER, Math.min(preferredLeft, maxLeft));

    setPosition({ placement, top, left, minWidth: triggerRect.width, maxHeight });
  }, [align, open, side]);

  // Outside dismissal: pointerdown anywhere outside both the trigger root
  // and the portaled panel closes the popup and swallows the gesture's click.
  React.useEffect(() => {
    if (!open) return;

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Node | null;
      if (!target) return;
      if (rootRef.current?.contains(target) || panelRef.current?.contains(target)) return;
      close("outside-pointer");
      suppressNextClickAfterDismiss();
    };

    document.addEventListener("pointerdown", handlePointerDown, true);
    return () => document.removeEventListener("pointerdown", handlePointerDown, true);
  }, [close, open]);

  // Native-event Escape: capture phase so this runs before any bubble-phase
  // document listener (the dialog's close-on-Escape), and
  // stopImmediatePropagation so none of them fire for this press.
  React.useEffect(() => {
    if (!open) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      event.stopImmediatePropagation();
      closeAndFocusTrigger("escape");
    };

    document.addEventListener("keydown", handleKeyDown, true);
    return () => document.removeEventListener("keydown", handleKeyDown, true);
  }, [closeAndFocusTrigger, open]);

  // A fixed panel detaches from its anchor when any ancestor scrolls or the
  // viewport resizes; close instead of drifting. Panel-internal scrolls are
  // the long-list case and stay exempt.
  React.useEffect(() => {
    if (!open) return;

    const handleScroll = (event: Event) => {
      const target = event.target as Node | null;
      if (target && panelRef.current?.contains(target)) return;
      close("ancestor-scroll");
    };
    const handleResize = () => close("resize");

    document.addEventListener("scroll", handleScroll, true);
    window.addEventListener("resize", handleResize);
    return () => {
      document.removeEventListener("scroll", handleScroll, true);
      window.removeEventListener("resize", handleResize);
    };
  }, [close, open]);

  return {
    open,
    position,
    rootRef,
    triggerRef,
    panelRef,
    openPopup,
    togglePopup,
    close,
    closeAndFocusTrigger,
  };
}

/**
 * Scrolls a panel item into view with plain scrollTop arithmetic.
 * `element.scrollIntoView()` would also scroll every scrollable ancestor —
 * including the document — which both moves the page under a fixed panel and
 * trips the popup's own close-on-ancestor-scroll handler on open.
 */
export function scrollPopupItemIntoView(panel: HTMLElement, item: HTMLElement) {
  const itemTop = item.offsetTop;
  const itemBottom = itemTop + item.offsetHeight;
  if (itemTop < panel.scrollTop) {
    panel.scrollTop = itemTop;
    return;
  }
  if (itemBottom > panel.scrollTop + panel.clientHeight) {
    panel.scrollTop = itemBottom - panel.clientHeight;
  }
}

type DropdownPopupPanelProps = React.HTMLAttributes<HTMLDivElement> & {
  open: boolean;
  position: DropdownPopupPosition | null;
  panelRef: React.RefObject<HTMLDivElement | null>;
};

export function DropdownPopupPanel({ open, position, panelRef, className, style, children, ...props }: DropdownPopupPanelProps) {
  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div
      {...props}
      ref={panelRef}
      data-dropdown-popup-placement={position?.placement ?? "bottom"}
      className={cn(
        "fixed z-[1050] min-w-32 overflow-y-auto rounded-xs border border-hairline bg-white p-1 font-sans text-[10px] font-normal leading-3 text-ink shadow-[0_12px_32px_rgba(17,24,39,0.12)] outline-none",
        className,
      )}
      style={{
        top: position?.top ?? 0,
        left: position?.left ?? 0,
        minWidth: position?.minWidth,
        maxHeight: position?.maxHeight ?? PANEL_MAX_HEIGHT,
        visibility: position ? undefined : "hidden",
        ...style,
      }}
    >
      {children}
    </div>,
    document.body,
  );
}

export function composeRefs<T>(...refs: Array<React.Ref<T> | undefined>) {
  return (node: T | null) => {
    refs.forEach((ref) => {
      if (!ref) return;
      if (typeof ref === "function") {
        ref(node);
        return;
      }
      (ref as React.MutableRefObject<T | null>).current = node;
    });
  };
}
