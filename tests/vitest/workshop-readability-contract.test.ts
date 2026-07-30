import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

const globalsCss = readFileSync(path.resolve(__dirname, "../../src/app/globals.css"), "utf8");
const readabilityStart = globalsCss.indexOf("/* Workshop readability roles");
const readabilityEnd = globalsCss.indexOf("body:has(.dashboard-transparent-shell)", readabilityStart);
const readabilityCss = globalsCss.slice(readabilityStart, readabilityEnd);

describe("Workshop readability CSS contract", () => {
  it("keeps the role scale scoped to the authenticated Workshop", () => {
    expect(readabilityStart).toBeGreaterThan(-1);
    expect(readabilityEnd).toBeGreaterThan(readabilityStart);
    expect(readabilityCss).toContain("[data-workshop-page-shell-root]");
    expect(readabilityCss).toContain("body:has([data-workshop-page-shell-root]) [role=\"dialog\"]");
    expect(readabilityCss).toContain("--workshop-text-metadata: 9px");
    expect(readabilityCss).toContain("--workshop-text-supporting: 10px");
    expect(readabilityCss).toContain("--workshop-text-primary: 11px");
    expect(readabilityCss).toContain("--workshop-text-title: 12px");
    expect(readabilityCss).not.toMatch(/text-\\\[\(8\|9\|10\|11\|12\)px/);
  });

  it("does not approximate readability with root scaling", () => {
    expect(globalsCss).not.toMatch(/(?:^|\n)\s*(?:html|body|:root)\s*\{[^}]*\bzoom\s*:/su);
    expect(globalsCss).not.toMatch(/(?:^|\n)\s*(?:html|body|:root)\s*\{[^}]*\btransform\s*:\s*scale/isu);
    expect(globalsCss).not.toMatch(/(?:^|\n)\s*(?:html|body|:root)\s*\{[^}]*\bfont-size\s*:/su);
  });

  it("promotes primary controls, labels, tables, trees, and portal dialogs", () => {
    for (const selector of [
      "button",
      "input",
      "select",
      "textarea",
      "a[href]",
      "[role=\"tab\"]",
      "[role=\"treeitem\"]",
      "[data-slot=\"table-cell\"]",
      "[data-slot=\"table-head\"]",
    ]) {
      expect(readabilityCss).toContain(selector);
    }
    expect(readabilityCss).toContain("font-size: var(--workshop-text-primary) !important");
    expect(readabilityCss).toContain("font-size: var(--workshop-text-supporting) !important");
    expect(readabilityCss).toContain("font-size: var(--workshop-text-title) !important");
  });

  it("provides visible focus and native/coarse pointer target floors", () => {
    expect(readabilityCss).toContain(":focus-visible");
    expect(readabilityCss).toContain("outline: 2px solid var(--focus)");
    expect(readabilityCss).toContain("outline-offset: 2px");
    expect(readabilityCss).toContain("--workshop-target-min: 24px");
    expect(readabilityCss).toContain("min-block-size: var(--workshop-target-min)");
    expect(readabilityCss).toContain("min-inline-size: var(--workshop-target-min)");
    expect(readabilityCss).toContain("@media (pointer: coarse)");
    expect(readabilityCss).toContain("--workshop-target-min: 32px");
  });
});
