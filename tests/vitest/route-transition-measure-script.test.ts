import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import { sanitizeBenchmarkText } from "@/../scripts/measure-route-transitions";

const measureScript = readFileSync("scripts/measure-route-transitions.ts", "utf8");

describe("route transition measurement script governance", () => {
  it("captures repeatable production-like route transition evidence without requiring auth by default", () => {
    expect(measureScript).toContain('from "@playwright/test"');
    expect(measureScript).toContain("OUTPUT_FILE");
    expect(measureScript).toContain("requiresAuth?: boolean");
    expect(measureScript).toContain("expectedPathname");
    expect(measureScript).toContain("overlayVisibilityRate");
    expect(measureScript).toContain("rscRequestCount");
    expect(measureScript).toContain("SKIP_AUTHENTICATED");
    expect(measureScript).toContain("SCENARIO_FILTER");
    expect(measureScript).toContain("writeFileSync");
    expect(measureScript).toContain('waitUntil: "load"');
    expect(measureScript).toContain('state: "hidden"');
    expect(measureScript).toContain("clickPosition");
    expect(measureScript).toContain("collapsedSidebarIconPosition");
    expect(measureScript).toContain('expectedPathname: "/workshop/settings"');
    expect(measureScript).toContain('name: "Authenticated Library: Overview to Components"');
    expect(measureScript).toContain('name: "Authenticated Library: Components to Templates"');
    expect(measureScript).toContain('name: "Authenticated Library: Templates to Overview"');
    expect(measureScript).toContain('expectedPathname: "/workshop/library/components"');
    expect(measureScript).toContain('expectedPathname: "/workshop/library/templates"');
    expect(measureScript).toContain("clickLibraryTab");
    expect(measureScript).toContain('getByRole("tablist", { name: "Library sections" })');
    expect(measureScript).toContain('clickLibraryTab(page, "Overview")');
    expect(measureScript).toContain('clickLibraryTab(page, "Components")');
    expect(measureScript).toContain('clickLibraryTab(page, "Templates")');
    expect(measureScript).toContain("HERO_PROJECT_ID");
    expect(measureScript).toContain("HERO_ESTIMATE_NODE_ID");
    expect(measureScript).toContain('name: "Authenticated Hero: Workshop to Projects"');
    expect(measureScript).toContain('name: "Authenticated Hero: Projects to Target Project"');
    expect(measureScript).toContain('name: "Authenticated Hero: Target Project to Estimates"');
    expect(measureScript).toContain('name: "Authenticated Hero: Estimates to Target Estimate"');
    expect(measureScript).toContain("preflightBaseUrl");
    expect(measureScript).toContain("waitForRouteReady");
    expect(measureScript).toContain("waitForPathname");
    expect(measureScript).toContain("waitForRouteOverlayHidden");
    expect(measureScript).toContain("window.location.pathname === pathname");
    expect(measureScript).not.toContain("page.waitForURL");
    expect(measureScript).toContain("warmScenario");
    expect(measureScript).toContain("ROUTE_TRANSITION_SKIP_WARMUP");
    expect(measureScript).toContain("warmRoutesBeforeMeasure");
    expect(measureScript).toContain("result.failures.length > 0");
    expect(measureScript).toContain("waitForPathname(page, scenario.expectedPathname), scenario.action(page)");
    expect(measureScript).toContain("finalPathname=");
    expect(measureScript).not.toContain("gitStatusShort");
    expect(measureScript).toContain("archestimator-dev-auth-bypass");
    expect(measureScript).toContain("assertDevAuthBypassLocalOnly");
    expect(measureScript).toContain("LOCAL_DEV_AUTH_HOSTS");
    expect(measureScript).toContain('httpOnly: true');
    expect(measureScript).toContain("Refusing to attach the dev-auth bypass cookie to a non-local BASE_URL");
    expect(measureScript).toContain(":visible");
    expect(measureScript).not.toContain("visibleLink.count()");
    expect(measureScript).toContain("Promise.all([targetPathReady, scenario.action(page)])");
    expect(measureScript).toContain("noWaitAfter: true");
    expect(measureScript).not.toContain('waitUntil: "commit"');
    expect(measureScript).toContain("ROUTE_TRANSITION_WAIT_FOR_NETWORK_IDLE");
    expect(measureScript).toContain("waitForNetworkIdle");
  });

  it("includes Phase 0 target scenarios and selector timeline telemetry", () => {
    expect(measureScript).toContain('name: "Authenticated Target: Cold Direct Target Estimate"');
    expect(measureScript).toContain('name: "Authenticated Target: Estimates to Target Estimate No Hover"');
    expect(measureScript).toContain('name: "Authenticated Target: Estimates to Target Estimate Hover Prefetch"');
    expect(measureScript).toContain('name: "Authenticated Target: Estimates to Target Estimate Warm Revisit"');
    const coldDirectScenario = measureScript.slice(
      measureScript.indexOf('name: "Authenticated Target: Cold Direct Target Estimate"'),
      measureScript.indexOf('name: "Authenticated Target: Estimates to Target Estimate No Hover"'),
    );
    expect(coldDirectScenario).toContain('waitUntil: "domcontentloaded"');
    expect(coldDirectScenario).not.toContain('waitUntil: "load"');
    expect(measureScript).toContain("async function warmRevisitTargetEstimate");
    expect(measureScript).toContain("await waitForEstimateSheetContent(page);");
    expect(measureScript).toContain("MutationObserver");
    expect(measureScript).toContain("ROUTE_TIMELINE_SELECTORS");
    expect(measureScript).toContain("skeletonTimeline");
    expect(measureScript).toContain("parentFallbackSeen");
    expect(measureScript).toContain("sheetSkeletonEpisodes");
    expect(measureScript).toContain("overlayDurationMs");
    expect(measureScript).toContain("const overlayEntries = skeletonTimeline.filter");
    expect(measureScript).not.toContain("const overlaySeen =");
    expect(measureScript).toContain("sheetContentVisibleAtMs");
    expect(measureScript).toContain("[data-testid='estimate-sheet-route-skeleton']");
    expect(measureScript).toContain("[data-testid='project-estimates-list-skeleton']");
    expect(measureScript).toContain("[aria-label='Loading project workspace']");
    expect(measureScript).toContain("[data-route-overlay]");
    expect(measureScript).toContain("[data-estimate-center-column='sheet']");
    expect(measureScript).toContain("[data-workshop-page-shell-root]");
    expect(measureScript).toContain("treatCurrentDomAsBaseline");
    expect(measureScript).toContain("scan(true)");
    expect(measureScript).toContain("new MutationObserver(() => scan())");
  });

  it("keeps committed benchmark output on redacted path classes instead of raw target ids", () => {
    expect(measureScript).toContain("sanitizeBenchmarkText");
    expect(measureScript).toContain("sanitizePathname");
    expect(measureScript).toContain("targetPathClasses");
    expect(measureScript).toContain("{targetProjectId}");
    expect(measureScript).toContain("{targetEstimateNodeId}");
    expect(measureScript).toContain("const message = sanitizeBenchmarkText(error instanceof Error ? error.message : String(error));");
    expect(measureScript).not.toContain("heroPath: {");
    expect(measureScript).not.toContain("projectId: HERO_PROJECT_ID");
    expect(measureScript).not.toContain("estimateNodeId: HERO_ESTIMATE_NODE_ID");
  });

  it("redacts auth material and local paths from benchmark failure text", () => {
    const raw = [
      "Navigation failed for owner@example.com",
      "https://example.test/auth/callback?access_token=access-secret&refresh_token=refresh-secret&code=oauth-code",
      "Authorization: Bearer bearer-secret",
      "Cookie: sb-access-token=session-secret; archestimator-dev-auth-bypass=bypass-secret",
      "Set-Cookie: __Host-auth=host-secret; Path=/",
      "payload eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJ1c2VyLTEifQ.signaturesecret",
      "/tmp/archestimator-route-transition-auth-state.json",
      "/Users/philiplewis/.auth/user.json",
    ].join(" ");

    const sanitized = sanitizeBenchmarkText(raw);

    expect(sanitized).toContain("{email}");
    expect(sanitized).toContain("access_token={redacted}");
    expect(sanitized).toContain("refresh_token={redacted}");
    expect(sanitized).toContain("code={redacted}");
    expect(sanitized).toContain("Authorization: Bearer {redacted}");
    expect(sanitized).toContain("Cookie: {redacted-cookie}");
    expect(sanitized).toContain("Set-Cookie: {redacted-cookie}");
    expect(sanitized).toContain("{jwt}");
    expect(sanitized).toContain("/tmp/{redacted}");
    expect(sanitized).toContain("/Users/{redacted}");
    expect(sanitized).not.toContain("owner@example.com");
    expect(sanitized).not.toContain("access-secret");
    expect(sanitized).not.toContain("refresh-secret");
    expect(sanitized).not.toContain("oauth-code");
    expect(sanitized).not.toContain("bearer-secret");
    expect(sanitized).not.toContain("session-secret");
    expect(sanitized).not.toContain("bypass-secret");
    expect(sanitized).not.toContain("host-secret");
    expect(sanitized).not.toContain("philiplewis");
  });
});
