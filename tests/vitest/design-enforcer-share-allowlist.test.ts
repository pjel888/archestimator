import { describe, expect, it } from "vitest";

import {
  collectFileViolations,
  isSharePxExemptPath,
} from "../../scripts/enforce-app-design-system.mjs";

// Guard for the P-UI-0 prerequisite (Shared Link Improvement Plan, Track T1): the
// design-system enforcer grants the public /share proposal surface a "Client Portal"
// type scale by exempting it from the three px-threshold rules — but that exemption
// MUST stay path-scoped, never an app-wide disable.
describe("design-system enforcer — /share px allowlist", () => {
  const BIG_SECONDARY = '          <p className="text-[16px] text-secondary">Body copy</p>';
  const BIG_UPPERCASE_LABEL = '          <p className="text-[14px] uppercase text-tertiary">Section</p>';

  it("classifies share paths as px-exempt and everything else as enforced", () => {
    expect(isSharePxExemptPath("src/app/share/[token]/page.tsx")).toBe(true);
    expect(isSharePxExemptPath("src/components/share/SharePageHero.tsx")).toBe(true);
    // Not exempt: owner/workshop, ui primitives, landing, etc.
    expect(isSharePxExemptPath("src/components/workshop/publisher/PublisherDrawer.tsx")).toBe(false);
    expect(isSharePxExemptPath("src/components/ui/button.tsx")).toBe(false);
    expect(isSharePxExemptPath("src/app/workshop/projects/page.tsx")).toBe(false);
  });

  it("STILL fails on a >12px font size OUTSIDE /share (allowlist is scoped, not a blanket disable)", () => {
    const violations = collectFileViolations("src/components/workshop/Example.tsx", BIG_SECONDARY);
    expect(violations.some((v) => v.includes("16px"))).toBe(true);
  });

  it("allows a >12px font size INSIDE /share (the Client Portal type scale)", () => {
    const violations = collectFileViolations("src/components/share/Example.tsx", BIG_SECONDARY);
    expect(violations.some((v) => v.includes("16px"))).toBe(false);
  });

  it("exempts /share from the uppercase-label (9px) and secondary-text (10px) thresholds too", () => {
    expect(collectFileViolations("src/components/share/Example.tsx", BIG_UPPERCASE_LABEL)).toEqual([]);
    expect(collectFileViolations("src/components/workshop/Example.tsx", BIG_UPPERCASE_LABEL).length).toBeGreaterThan(0);
  });

  it("keeps enforcing the NON-size rules inside /share (weight, radius, tracking)", () => {
    expect(collectFileViolations("src/components/share/Example.tsx", '<div className="font-bold">x</div>').length).toBeGreaterThan(0);
    expect(collectFileViolations("src/components/share/Example.tsx", '<div className="rounded-md">x</div>').length).toBeGreaterThan(0);
    expect(collectFileViolations("src/components/share/Example.tsx", '<div className="tracking-wide">x</div>').length).toBeGreaterThan(0);
    // and named text sizes are still forbidden in /share (must use explicit arbitrary px)
    expect(collectFileViolations("src/components/share/Example.tsx", '<div className="text-2xl">x</div>').length).toBeGreaterThan(0);
  });

  it("forbids hard-coded proposal-paper hex outside the design token", () => {
    const violations = collectFileViolations("src/components/share/Example.tsx", '<div className="bg-[#FFFDF8]">x</div>');
    expect(violations.some((v) => v.includes("#FFFDF8"))).toBe(true);
    expect(collectFileViolations("src/app/globals.css", "--proposal-paper: #fffdf8;")).toEqual([]);
  });
});
