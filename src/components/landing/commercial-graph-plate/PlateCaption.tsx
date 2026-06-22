"use client";

import { useEffect, useRef, useState } from "react";
import type { PlateNode } from "./plate-data";
import { usePrefersReducedMotion } from "@/components/landing/shared/usePrefersReducedMotion";
import { cn } from "@/lib/ui/cn";

/**
 * PlateCaption — the ONE client leaf of the commercial-graph plate section
 * (doc 04 §4.5 / doc 07 §1.2). Renders the active node's `publicLabel` in an
 * `aria-live="polite"` region. SSR renders the default caption; on mount a
 * single focusin/focusout + mouseenter/mouseleave listener on the nearest
 * `[data-plate-root]` ancestor updates the caption from the focused/hovered
 * node's `data-plate-public-label`.
 *
 * Reduced motion (doc 03 §8): the caption swaps instantly, no fade.
 *
 * This is the spec-mandated single hydration surface for the plate — the
 * ArchitecturePlate + PlateNodeCard + PlateEdgeConnector are all RSC.
 */
export interface PlateCaptionProps {
  nodes: PlateNode[];
  /** Default caption when no node is active. */
  defaultCaption?: string;
  className?: string;
}

const DEFAULT_CAPTION =
  "Every node below is labeled by what exists today. Hover or focus a node to read its one-line claim.";

export function PlateCaption({
  nodes,
  defaultCaption = DEFAULT_CAPTION,
  className,
}: PlateCaptionProps) {
  const [activeId, setActiveId] = useState<PlateNode["id"] | null>(null);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const prefersReducedMotion = usePrefersReducedMotion();

  useEffect(() => {
    const root = rootRef.current?.closest?.("[data-plate-root]") as HTMLElement | null;
    if (!root) return;

    const lookup = new Map(nodes.map((n) => [n.id, n]));

    const readTarget = (target: EventTarget | null): PlateNode["id"] | null => {
      if (!(target instanceof HTMLElement)) return null;
      const card = target.closest<HTMLElement>("[data-plate-node-id]");
      return (card?.dataset.plateNodeId ?? null) as PlateNode["id"] | null;
    };

    const onActivate = (event: Event) => {
      const id = readTarget(event.target);
      if (id && lookup.has(id)) setActiveId(id);
    };
    const onClear = (event: Event) => {
      // Only clear if focus/hover actually left the plate (relatedTarget outside).
      const related = (event as FocusEvent | MouseEvent).relatedTarget;
      if (related instanceof HTMLElement && root.contains(related)) return;
      setActiveId(null);
    };

    root.addEventListener("focusin", onActivate);
    root.addEventListener("focusout", onClear);
    root.addEventListener("mouseover", onActivate);
    root.addEventListener("mouseout", onClear);
    return () => {
      root.removeEventListener("focusin", onActivate);
      root.removeEventListener("focusout", onClear);
      root.removeEventListener("mouseover", onActivate);
      root.removeEventListener("mouseout", onClear);
    };
  }, [nodes]);

  const active = activeId ? nodes.find((n) => n.id === activeId) ?? null : null;
  const caption = active ? active.publicLabel : defaultCaption;

  return (
    <div
      ref={rootRef}
      className={cn(
        "mt-[var(--landing-space-md)] rounded-landing-dense border border-landing-hairline bg-surface px-[var(--landing-space-md)] py-[var(--landing-space-sm)]",
        className,
      )}
    >
      <p
        aria-live="polite"
        role="status"
        className={cn(
          "text-landing-text-body-sm leading-landing-prose text-landing-ink-secondary",
          prefersReducedMotion ? "" : "transition-opacity duration-150",
        )}
      >
        <span
          aria-hidden="true"
          className="mr-[var(--landing-space-2xs)] inline-block h-[10px] w-[2px] translate-y-[1px] rounded-full bg-brand-orange align-middle"
        />
        {caption}
      </p>
    </div>
  );
}
