import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

const estimateNodePageSource = readFileSync(
  "src/app/workshop/projects/[projectId]/estimates/[nodeId]/page.tsx",
  "utf8",
);

describe("estimate node route server concurrency", () => {
  it("keeps the critical route context and user loads in the first traced parallel block", () => {
    expect(estimateNodePageSource).toContain('withPerfTraceRequest("workshop.estimate-sheet"');
    expect(estimateNodePageSource).toContain("Promise.all([");
    expect(estimateNodePageSource).toContain('traced("estimate-sheet.route-context"');
    expect(estimateNodePageSource).toContain("resolveEstimateTabRouteContext(projectId, nodeId, ESTIMATE_SHEET_TREE_LOAD_LIMITS)");
    expect(estimateNodePageSource).toContain('traced("estimate-sheet.current-user"');
    expect(estimateNodePageSource).toContain("requireCurrentUserContext()");
  });

  it("keeps tab fallback and edit capability in the named tail trace", () => {
    expect(estimateNodePageSource).toContain('withPerfTraceRequest("workshop.estimate-sheet-tail"');
    expect(estimateNodePageSource).toContain('traced("estimate-sheet.tabs"');
    expect(estimateNodePageSource).toContain("tabs ?? (tab ? await getEstimateTabs(project.id, estimate.id) : [])");
    expect(estimateNodePageSource).toContain('traced("estimate-sheet.edit-capability"');
    expect(estimateNodePageSource).toContain("tab ? await resolveEstimateEditCapability(estimate.id) : false");
    expect(estimateNodePageSource).toContain("canEditEstimate");
  });

  it("streams the tail behind the sheet-shaped route fallback", () => {
    expect(estimateNodePageSource).toContain('import { Suspense } from "react"');
    expect(estimateNodePageSource).toContain("EstimateSheetRouteSkeleton");
    expect(estimateNodePageSource).toContain("<Suspense fallback={<EstimateSheetRouteSkeleton />}>");
    expect(estimateNodePageSource).toContain("<EstimateWorkspaceResolved");
    expect(estimateNodePageSource).toContain("async function EstimateWorkspaceResolved");
    expect(estimateNodePageSource.indexOf('withPerfTraceRequest("workshop.estimate-sheet"')).toBeLessThan(
      estimateNodePageSource.indexOf("<Suspense fallback={<EstimateSheetRouteSkeleton />}>"),
    );
    expect(estimateNodePageSource.indexOf("<Suspense fallback={<EstimateSheetRouteSkeleton />}>")).toBeLessThan(
      estimateNodePageSource.indexOf('withPerfTraceRequest("workshop.estimate-sheet-tail"'),
    );
  });
});
