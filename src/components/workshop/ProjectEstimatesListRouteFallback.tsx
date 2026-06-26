"use client";

import { ProjectEstimatesListSkeleton } from "@/components/workshop/ProjectEstimatesListSkeleton";
import { shouldSuppressGlobalRouteOverlay } from "@/lib/navigation/route-overlay-policy";
import { useNavigationUiStore } from "@/stores/navigation-ui-store";

export function ProjectEstimatesListRouteFallback() {
  const targetHref = useNavigationUiStore((state) => state.targetHref);

  if (shouldSuppressGlobalRouteOverlay(targetHref)) {
    return null;
  }

  return <ProjectEstimatesListSkeleton />;
}
