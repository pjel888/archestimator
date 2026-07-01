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
    expect(resizableSidePanel).toContain('useMediaQuery("(max-width: 1023px)")');
    expect(resizableSidePanel).toContain('document.querySelector<HTMLElement>("[data-workshop-page-shell-canvas]")');
    expect(resizableSidePanel).toContain("target.style.removeProperty(panelWidthCssVariable);");
    expect(projectEstimateMetadataStrip).toContain("PROJECT_MINI_SIDEBAR_WIDTH_CSS_VARIABLE");
    expect(projectEstimateMetadataStrip).toContain('workshopCanvas?.style.setProperty(PROJECT_MINI_SIDEBAR_WIDTH_CSS_VARIABLE, "0px")');
  });

  it("keeps the side-panel rail borders and uses neutral gray hover/drag feedback", () => {
    // Hairline edge chrome stays.
    expect(resizableSidePanel).toContain('side === "right" ? "border-l" : "border-r"');
    // Resizer: white/transparent at rest, soft neutral gray while hovered or dragging.
    expect(resizableSidePanel).toContain('"w-2 cursor-col-resize border-x border-hairline bg-white hover:bg-[#E5E5E5]"');
    expect(resizableSidePanel).toContain('"w-2 cursor-col-resize border-x border-hairline bg-[#E5E5E5]"');
    // Grip dots track the same feedback with neutral gray on hover/drag and pale grey at rest.
    expect(resizableSidePanel).toContain("group-hover/resizer:bg-[#7F7F7F]");
    expect(resizableSidePanel).toContain('isDragging ? "bg-[#7F7F7F]" : "bg-divider group-hover/resizer:bg-[#7F7F7F]"');
    // Collapse toggle uses the same neutral workshop control hover, not the orange action accent.
    expect(resizableSidePanel).toContain("hover:bg-[#E5E5E5] hover:text-ink focus-visible:bg-[#E5E5E5] focus-visible:text-ink");
    expect(resizableSidePanel).not.toContain("hover:bg-brand-orange-soft hover:text-brand-orange");
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
    expect(headerIconToolbar).toContain('"flex h-[38px] min-h-[38px] items-center gap-1 bg-white px-2 py-0"');
    expect(headerIconToolbar).not.toContain("border-y border-hairline");
    expect(headerIconToolbar).not.toContain("min-h-10");
    expect(sharedSearchSurfaces).not.toContain('wrapperClassName="h-12 w-full"');
    expect(sharedSearchSurfaces).not.toMatch(/className="flex h-12 (shrink-0 )?items-center gap/);
  });

  it("plumbs estimate-list edit capabilities before rendering mutation controls", () => {
    expect(projectEstimatesPage).toContain("resolveEstimateListEditCapabilities(projectId, estimateIds)");
    expect(projectEstimatesPage).toContain("getCloudflareD1Database");
    expect(projectEstimatesPage).toContain("canEditProjectInD1");
    expect(projectEstimatesPage).toContain("canEditEstimateInD1");
    expect(projectEstimatesPage).not.toContain("createSupabaseServerClient");
    expect(projectEstimatesPage).not.toContain('supabase.rpc("can_edit_project"');
    expect(projectEstimatesPage).not.toContain('.from("estimate_sheet_members")');
    expect(projectEstimatesPage).not.toContain('.from("estimate_sheet_access_settings")');
    expect(projectEstimatesPage).toContain("canCreateEstimates={editCapabilities.canCreateEstimates}");
    expect(projectEstimatesPage).toContain("canEditEstimateById={editCapabilities.canEditEstimateById}");
    expect(projectEstimatesClient).toContain("canCreateEstimates");
    expect(projectEstimatesClient).toContain("canEditEstimateById");
  });
});
