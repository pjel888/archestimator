import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const estimateSheetTree = readFileSync("src/components/workshop/EstimateSheetTree.tsx", "utf8");
const estimateComponentLibrary = readFileSync("src/components/workshop/component-library/index.tsx", "utf8");
const resizableSidePanel = readFileSync("src/components/workshop/ResizableSidePanel.tsx", "utf8");

describe("estimate side panel rails", () => {
  it("keeps the estimate tree and library collapse rails on the shared width", () => {
    const defaultWidthMatch = resizableSidePanel.match(/collapsedWidth = (\d+)/);

    expect(defaultWidthMatch?.[1]).toBe("32");
    expect(estimateSheetTree).toContain('side="left"');
    expect(estimateSheetTree).not.toContain("collapsedWidth=");
    expect(estimateComponentLibrary).toContain('side="right"');
    expect(estimateComponentLibrary).not.toContain("collapsedWidth=");
  });
});
