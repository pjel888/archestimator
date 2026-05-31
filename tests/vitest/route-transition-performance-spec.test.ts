import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const routePerfSpec = readFileSync("e2e/route-transition-performance.spec.ts", "utf8");
const packageJson = readFileSync("package.json", "utf8");

describe("route transition performance spec governance", () => {
  it("separates hover-prefetch RSC evidence from click-transition RSC evidence", () => {
    expect(routePerfSpec).toContain("hoverRscRequests");
    expect(routePerfSpec).toContain("allRscRequests");
    expect(routePerfSpec).toContain("transitionRscRequests");
    expect(routePerfSpec).toContain("rscRequests.clear()");
    expect(routePerfSpec).toContain("Hover prefetch RSC requests were not observed");
  });

  it("records project-card and estimate-row hover-prefetch evidence independently", () => {
    expect(routePerfSpec).toContain("projectCardHoverRscRequests");
    expect(routePerfSpec).toContain("estimateRowHoverRscRequests");
    expect(routePerfSpec).toContain('section[aria-label="Live projects"] article[data-project-card-view] a[href^="/workshop/projects/"]');
    expect(routePerfSpec).toContain('a[aria-label^="Open "][href^="/workshop/projects/"][href*="/estimates/"]');
  });

  it("captures Slow 3G link-transition medians, not only Slow 3G page-load metrics", () => {
    expect(routePerfSpec).toContain("slow3gPublicRouteTransition");
    expect(routePerfSpec).toContain("slow-3g-public-link-transition-medians.json");
    expect(routePerfSpec).toContain("route-transition-slow-3g-public-link-medians");
  });

  it("records browser bfcache persisted diagnostics instead of only timing goBack", () => {
    expect(routePerfSpec).toContain("page.addInitScript");
    expect(routePerfSpec).toContain("event.persisted");
    expect(routePerfSpec).toContain("bfcachePersisted");
    expect(routePerfSpec).toContain("notRestoredReasons");
    expect(routePerfSpec).toContain("public-bfcache-restore.png");
  });

  it("keeps a peak-load render profile harness for 50 projects and 200 estimate rows", () => {
    const peakLoadProfileSpec = readFileSync("tests/vitest/route-transition-peak-load-profile.test.tsx", "utf8");

    expect(packageJson).toContain('"perf:profile-peak-load"');
    expect(peakLoadProfileSpec).toContain("ROUTE_PERF_PROFILE_OUTPUT");
    expect(peakLoadProfileSpec).toContain("projectCount: 50");
    expect(peakLoadProfileSpec).toContain("estimateRowCount: 200");
    expect(peakLoadProfileSpec).toContain("route-transition-peak-load-profile");
    expect(peakLoadProfileSpec).toContain("virtualizationDecision");
  });
});
