import { describe, expect, it } from "vitest";

import {
  collectFileViolations,
  isDashboardPxExemptPath,
} from "../../scripts/enforce-app-design-system.mjs";

// Guard for the Workshop Dashboard design-language exemption (owner directive
// 2026-06-18: the bento redesign is its own design language, freed from the compact
// app/workshop rules). The dashboard directory is FULLY exempt — but the exemption
// MUST stay path-scoped to that directory and never become an app-wide disable.
describe("design-system enforcer — dashboard design-language exemption", () => {
  const HERO = '          <h1 className="font-display text-[34px] text-ink">Good evening</h1>';

  it("classifies the dashboard dir as exempt and everything else as enforced", () => {
    expect(isDashboardPxExemptPath("src/components/workshop/dashboard/DashboardHero.tsx")).toBe(true);
    expect(isDashboardPxExemptPath("src/components/workshop/dashboard/lib.ts")).toBe(true);
    // Not exempt: the rest of workshop, ui primitives, the homebase client itself.
    expect(isDashboardPxExemptPath("src/components/workshop/WorkshopHomebaseClient.tsx")).toBe(false);
    expect(isDashboardPxExemptPath("src/components/ui/button.tsx")).toBe(false);
  });

  it("fully exempts the dashboard dir — display type, bold weight, big radius, tracking, mono, named sizes", () => {
    const dir = "src/components/workshop/dashboard/Example.tsx";
    expect(collectFileViolations(dir, HERO)).toEqual([]);
    expect(collectFileViolations(dir, '<div className="font-bold rounded-2xl tracking-wide font-mono text-2xl">x</div>')).toEqual([]);
  });

  it("STILL enforces every rule OUTSIDE the dashboard dir (scoped, not a blanket disable)", () => {
    expect(collectFileViolations("src/components/workshop/Example.tsx", HERO).some((v) => v.includes("34px"))).toBe(true);
    expect(collectFileViolations("src/components/ui/button.tsx", '<div className="font-bold">x</div>').length).toBeGreaterThan(0);
    expect(collectFileViolations("src/components/ui/button.tsx", '<div className="rounded-md">x</div>').length).toBeGreaterThan(0);
  });
});
