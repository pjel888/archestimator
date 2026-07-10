"use client";

import { useLayoutEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

/**
 * Portals project-specific footer overlays into the layout-owned shell footer.
 * Callers: projects/[projectId]/layout.tsx (ProjectTotalFooterOverlay).
 * API: children → [data-workshop-shell-footer-slot]. No data files.
 * User instruction: WP-1.5 ProjectTotalFooterOverlay stays projectId-specific content-layer.
 */
export function WorkshopShellFooterSlot({ children }: { children: ReactNode }) {
  const [target, setTarget] = useState<HTMLElement | null>(null);

  useLayoutEffect(() => {
    setTarget(document.querySelector<HTMLElement>("[data-workshop-shell-footer-slot]"));
  }, []);

  if (!target) return null;
  return createPortal(children, target);
}
