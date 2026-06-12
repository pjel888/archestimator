import { describe, expect, it } from "vitest";

import {
  estimateSheetTree,
  resizableSidePanel,
  projectEstimateMetadataStrip,
  workshopCollectionLayout,
  estimateSheetContent,
  estimateComponentLibrary,
  projectEstimatesPage,
  projectEstimatesClient,
  searchInput,
  headerIconToolbar,
} from "./project-dashboard-ui-fixtures";

describe("project dashboard side-panel UI governance", () => {
  it("lets the estimate tree absorb the removed mini-sidebar width without moving its right edge", () => {
    expect(estimateSheetTree).toContain("ESTIMATE_TREE_LEFT_EXTENSION_WIDTH = 104");
    expect(estimateSheetTree).toContain("widthOffset={ESTIMATE_TREE_LEFT_EXTENSION_WIDTH}");
    expect(resizableSidePanel).toContain("widthOffset?: number");
    expect(resizableSidePanel).toContain("widthOffset = 0");
    expect(resizableSidePanel).toContain("const actualWidth = collapsed ? collapsedWidth : width + widthOffset;");
    expect(resizableSidePanel).toContain("const responsiveWidth = compactViewport ? 0 : actualWidth;");
    expect(resizableSidePanel).toContain('window.matchMedia("(max-width: 1023px)")');
    expect(resizableSidePanel).toContain('document.querySelector<HTMLElement>("[data-workshop-page-shell-canvas]")');
    expect(resizableSidePanel).toContain("target.style.removeProperty(panelWidthCssVariable);");
    expect(projectEstimateMetadataStrip).toContain("PROJECT_MINI_SIDEBAR_WIDTH_CSS_VARIABLE");
    expect(projectEstimateMetadataStrip).toContain('workshopCanvas?.style.setProperty(PROJECT_MINI_SIDEBAR_WIDTH_CSS_VARIABLE, "0px")');
  });

  it("keeps minimized estimate side-panel rails white instead of changing background color", () => {
    expect(resizableSidePanel).toContain('"h-full rounded-xs border-hairline bg-white hover:bg-white"');
    expect(resizableSidePanel).toContain('side === "right" ? "border-l" : "border-r"');
    expect(resizableSidePanel).toContain('"w-2 cursor-col-resize border-x border-hairline bg-white"');
    expect(resizableSidePanel).not.toContain('className="h-full rounded-xs border-x border-hairline bg-white hover:bg-white"');
    expect(resizableSidePanel).not.toContain('collapsed ? "bg-surface-muted" : "bg-white"');
    expect(resizableSidePanel).not.toContain('hover:bg-surface-muted');
  });

  it("keeps shared search and icon toolbar rows at 38px with no component borders", () => {
    const sharedSearchSurfaces = [
      workshopCollectionLayout,
      estimateSheetTree,
      estimateSheetContent,
      estimateComponentLibrary,
      projectEstimatesPage,
      projectEstimatesClient,
    ].join("\n");

    expect(searchInput).toContain("complete 38px search surface height");
    expect(searchInput).toContain("h-[38px] min-h-[38px]");
    expect(searchInput).not.toContain("h-12 min-h-12");
    expect(searchInput).not.toContain("border border-hairline bg-white px-1");
    expect(headerIconToolbar).toContain('className="flex h-[38px] min-h-[38px] items-center gap-1 bg-white px-2 py-0"');
    expect(headerIconToolbar).not.toContain("border-y border-hairline");
    expect(headerIconToolbar).not.toContain("min-h-10");
    expect(sharedSearchSurfaces).not.toContain('wrapperClassName="h-12 w-full"');
    expect(sharedSearchSurfaces).not.toMatch(/className="flex h-12 (shrink-0 )?items-center gap/);
  });
});
