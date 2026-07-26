import { describe, expect, it } from "vitest";

import {
  estimateSheetContent,
  estimateSheetRouteSkeleton,
  estimateWorkspaceClient,
  projectEstimateNodeLoading,
} from "./project-dashboard-ui-fixtures";

describe("estimate sheet route loading shell", () => {
  it("uses a sheet-shaped leaf fallback instead of parent route fallbacks", () => {
    expect(projectEstimateNodeLoading).not.toBe("");
    expect(projectEstimateNodeLoading).toContain("EstimateSheetRouteSkeleton");
    expect(projectEstimateNodeLoading).toContain("return <EstimateSheetRouteSkeleton />;");
    expect(projectEstimateNodeLoading).not.toContain("ProjectEstimatesListSkeleton");
    expect(projectEstimateNodeLoading).not.toContain("ProjectRouteContentFallback");
    expect(projectEstimateNodeLoading).not.toContain("WorkshopPageShell");
    expect(projectEstimateNodeLoading).not.toContain("WorkshopShell");
    expect(projectEstimateNodeLoading).not.toContain("@/lib/auth");
    expect(projectEstimateNodeLoading).not.toContain("@/lib/repositories");
    expect(projectEstimateNodeLoading).not.toContain("next/headers");
    expect(projectEstimateNodeLoading).not.toContain("cookies()");
    expect(projectEstimateNodeLoading).not.toContain("headers()");
    expect(projectEstimateNodeLoading).not.toContain("getCurrentUserContext");
    expect(projectEstimateNodeLoading).not.toContain("requireCurrentUserContext");
    expect(projectEstimateNodeLoading).not.toContain("resolveEstimateTabRouteContext");
  });

  it("keeps the unauthenticated fallback generic and detached from protected route data", () => {
    const protectedRouteTokens = [
      "params",
      "searchParams",
      "projectId",
      "projectName",
      "estimateName",
      "currentUser",
      "@/lib/auth",
      "@/lib/repositories",
      "next/headers",
      "cookies()",
      "headers()",
      "createSupabaseServerClient",
      "ProjectEstimateMetadataPublisher",
      "EstimateWorkspaceClient",
    ];

    for (const token of protectedRouteTokens) {
      expect(projectEstimateNodeLoading).not.toContain(token);
      expect(estimateSheetRouteSkeleton).not.toContain(token);
    }
    expect(estimateSheetRouteSkeleton).not.toContain('"use client"');
    expect(estimateSheetRouteSkeleton).not.toContain("useEstimateSurfaceVariant");
  });

  it("mirrors the estimate workspace glass panes closely enough to prevent route-swap layout snap", () => {
    expect(estimateSheetRouteSkeleton).not.toBe("");
    expect(estimateSheetRouteSkeleton).toContain('role="status"');
    expect(estimateSheetRouteSkeleton).toContain('aria-label="Loading estimate"');
    expect(estimateSheetRouteSkeleton).toContain('aria-busy="true"');
    expect(estimateSheetRouteSkeleton).toContain('"flex h-full min-h-0 overflow-hidden"');
    expect(estimateSheetRouteSkeleton).toContain('"gap-2 p-2"');
    expect(estimateSheetRouteSkeleton).toContain('ESTIMATE_SHEET_ROUTE_SKELETON_VARIANT = "glass"');
    expect(estimateSheetRouteSkeleton).toContain('estimateSurfaceClass(ESTIMATE_SHEET_ROUTE_SKELETON_VARIANT, "root")');
    expect(estimateSheetRouteSkeleton).toContain('estimateSurfaceClass(variant, "treeRail")');
    expect(estimateSheetRouteSkeleton).toContain('estimateSurfaceClass(variant, "centerColumnFallback")');
    expect(estimateSheetRouteSkeleton).toContain('estimateSurfaceClass(variant, "libraryRail")');
    expect(estimateSheetRouteSkeleton).toContain("w-[376px]");
    expect(estimateSheetRouteSkeleton).toContain('"hidden h-full min-h-0 flex-col p-2 lg:flex"');
    expect(estimateSheetRouteSkeleton).toContain('ESTIMATE_LIBRARY_DEFAULT_WIDTH_CLASS = "w-[560px]"');
    expect(estimateWorkspaceClient).toContain("data-estimate-workspace");
    expect(estimateWorkspaceClient).not.toContain('aria-label="Desktop workspace notice"');
    expect(estimateSheetRouteSkeleton).toContain('aria-label="Desktop workspace notice"');
    expect(estimateSheetRouteSkeleton).toContain("Estimate editing works best on a desktop-width screen.");
    expect(estimateSheetRouteSkeleton).not.toContain("xl:flex");
    expect(estimateSheetRouteSkeleton).not.toContain("min-w-[320px]");
    expect(estimateSheetRouteSkeleton).not.toContain("ProjectEstimatesListSkeleton");
    expect(estimateSheetRouteSkeleton).not.toContain("ProjectRouteContentFallback");
  });

  it("keeps the dynamic right-sidebar fallback on the same default width contract", () => {
    expect(estimateSheetContent).toContain('ESTIMATE_LIBRARY_DEFAULT_WIDTH_CLASS = "w-[560px]"');
    expect(estimateSheetContent).toContain("<ComponentLibrarySidebarFallback isError={false} />");
    expect(estimateSheetContent).toContain('estimateSurfaceClass(surfaceVariant, "libraryRail")');
    expect(estimateSheetContent).not.toContain("min-w-[320px]");
  });
});
