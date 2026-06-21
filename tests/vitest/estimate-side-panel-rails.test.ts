import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const estimateSheetTree = readFileSync("src/components/workshop/EstimateSheetTree.tsx", "utf8");
const estimateComponentLibrary = readFileSync("src/components/workshop/component-library/index.tsx", "utf8");
const estimateSurfaceVariant = readFileSync("src/components/workshop/estimate-surface-variant.tsx", "utf8");
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

  it("keeps glass rail headers transparent over the rail body instead of adding a white chrome band", () => {
    const railPanelHeaderCase = estimateSurfaceVariant.match(/case "railPanelHeader":[\s\S]*?case "railToolbar":/)?.[0];

    expect(railPanelHeaderCase).toContain('return glass ? "bg-transparent estimate-glass-divider" : "";');
    expect(railPanelHeaderCase).not.toContain("estimate-glass-chrome");
  });
});
