import { describe, expect, it } from "vitest";

import {
  estimateSheetRouteSkeleton,
  projectEstimateNodeLoading,
} from "./project-dashboard-ui-fixtures";

describe("estimate sheet route loading shell", () => {
  it("uses a sheet-shaped leaf fallback instead of parent route fallbacks", () => {
    expect(projectEstimateNodeLoading).not.toBe("");
    expect(projectEstimateNodeLoading).toContain("EstimateSheetRouteSkeleton");
    expect(projectEstimateNodeLoading).not.toContain("ProjectEstimatesListSkeleton");
    expect(projectEstimateNodeLoading).not.toContain("ProjectRouteContentFallback");
    expect(projectEstimateNodeLoading).not.toContain("WorkshopPageShell");
    expect(projectEstimateNodeLoading).not.toContain("cookies()");
    expect(projectEstimateNodeLoading).not.toContain("getCurrentUserContext");
  });

  it("mirrors the estimate workspace glass panes closely enough to prevent route-swap layout snap", () => {
    expect(estimateSheetRouteSkeleton).not.toBe("");
    expect(estimateSheetRouteSkeleton).toContain('role="status"');
    expect(estimateSheetRouteSkeleton).toContain('aria-label="Loading estimate"');
    expect(estimateSheetRouteSkeleton).toContain('aria-busy="true"');
    expect(estimateSheetRouteSkeleton).toContain('"flex h-full min-h-0 overflow-hidden"');
    expect(estimateSheetRouteSkeleton).toContain('"gap-2 p-2"');
    expect(estimateSheetRouteSkeleton).toContain('estimateSurfaceClass("glass", "root")');
    expect(estimateSheetRouteSkeleton).toContain('estimateSurfaceClass(variant, "treeRail")');
    expect(estimateSheetRouteSkeleton).toContain('estimateSurfaceClass(variant, "centerColumnFallback")');
    expect(estimateSheetRouteSkeleton).toContain('estimateSurfaceClass(variant, "libraryRail")');
    expect(estimateSheetRouteSkeleton).toContain("w-[376px]");
    expect(estimateSheetRouteSkeleton).toContain("min-w-[320px]");
    expect(estimateSheetRouteSkeleton).not.toContain("ProjectEstimatesListSkeleton");
    expect(estimateSheetRouteSkeleton).not.toContain("ProjectRouteContentFallback");
  });
});
