import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

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
    expect(measureScript).toContain('state: "hidden"');
    expect(measureScript).toContain("clickPosition");
    expect(measureScript).toContain("collapsedSidebarIconPosition");
    expect(measureScript).toContain('expectedPathname: "/workshop/settings"');
  });
});
