import { describe, expect, it } from "vitest";

import { isLandingApprovedPath } from "../../scripts/enforce-app-design-system.mjs";

describe("design-system enforcer - public brand surface allowlist", () => {
  it("classifies auth/trust public surfaces as landing-approved only by path", () => {
    expect(isLandingApprovedPath("src/app/login/page.tsx")).toBe(true);
    expect(isLandingApprovedPath("src/app/signup/page.tsx")).toBe(true);
    expect(isLandingApprovedPath("src/app/trust/page.tsx")).toBe(true);
    expect(isLandingApprovedPath("src/components/auth/AuthGlassPanel.tsx")).toBe(true);

    expect(isLandingApprovedPath("src/app/workshop/projects/page.tsx")).toBe(false);
    expect(isLandingApprovedPath("src/components/workshop/project-data/EstimateColumn.tsx")).toBe(false);
    expect(isLandingApprovedPath("src/components/ui/button.tsx")).toBe(false);
  });
});
