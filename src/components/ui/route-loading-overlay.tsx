"use client";

import { useEffect } from "react";
import { createPortal } from "react-dom";
import { Spinner } from "@/components/ui/spinner";
import { useNavigationUiStore } from "@/stores/navigation-ui-store";
import { cn } from "@/lib/ui/cn";

const MAIN_CONTENT_SELECTORS = [
  "[data-workshop-page-shell-root]",
  "[data-landing-page-root]",
];

export function RouteLoadingOverlay() {
  const isNavigating = useNavigationUiStore((s) => s.isNavigating);

  useEffect(() => {
    if (!isNavigating) return;

    const mains = MAIN_CONTENT_SELECTORS
      .map((sel) => document.querySelector(sel))
      .filter(Boolean) as HTMLElement[];

    mains.forEach((el) => el.setAttribute("aria-hidden", "true"));

    return () => {
      mains.forEach((el) => el.removeAttribute("aria-hidden"));
    };
  }, [isNavigating]);

  if (!isNavigating || typeof document === "undefined") return null;

  return createPortal(
    <div
      data-route-overlay
      role="status"
      aria-live="polite"
      aria-label="Loading page"
      className={cn(
        "fixed inset-0 z-[150] flex items-center justify-center bg-white/25 backdrop-blur-md",
        "pointer-events-none",
        "transition-opacity duration-200 ease-out",
        "motion-reduce:transition-none motion-reduce:duration-0",
      )}
    >
      <Spinner size="lg" decorative />
    </div>,
    document.body,
  );
}
