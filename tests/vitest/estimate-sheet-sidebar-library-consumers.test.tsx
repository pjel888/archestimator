import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

function source(path: string) {
  return readFileSync(path, "utf8");
}

describe("Estimate Sheet sidebar Library consumers", () => {
  it("keeps shared tab controls linked to rendered tab panels", () => {
    const tabsSource = source("src/components/ui/tabs.tsx");

    expect(tabsSource).toContain("const panelId = idBase ? `${idBase}-panel-${tab.id}` : `tabpanel-${tab.id}`;");
    expect(tabsSource).toContain("aria-controls={controlsPanels ? panelId : undefined}");
    expect(tabsSource).toContain("id={tabId}");
  });

  it("keeps Library and Project source rows visibly scoped with source labels and distinct icons", () => {
    const sidebarSource = source("src/components/workshop/component-library/index.tsx");
    const treeSource = source("src/components/workshop/component-library/tree/LibraryTree.tsx");

    expect(sidebarSource).toContain('activeLibraryTreeAriaLabel = isProjectTab ? "Project sources" : "Library sources"');
    expect(sidebarSource).toContain('activeSourceScopeLabel = isProjectTab || projectId === "hero-sanitized-project" ? "" : "Library"');
    expect(sidebarSource).toContain("treeAriaLabel={activeLibraryTreeAriaLabel}");
    expect(sidebarSource).toContain("sourceScopeLabel={activeSourceScopeLabel}");
    expect(treeSource).toContain("function getComponentIconColorClass");
    expect(treeSource).toContain("isProjectComponentProjectionItem(item)");
    expect(treeSource).toContain('"text-[#AAB6E8]" : "text-[#E8B99D]"');
    expect(treeSource).toContain("const sourceLabel = sourceScope ? `${sourceScope} · ${supplierLabel}` : supplierLabel;");
  });

  it("labels the compact estimate right rail as a Sources drawer", () => {
    const sheetSource = source("src/components/workshop/EstimateSheetContent.tsx");
    const sidebarSource = source("src/components/workshop/component-library/index.tsx");
    const drawerSource = source("src/components/ui/overlays/sheet-drawer.tsx");

    expect(sheetSource).toContain('label: "Open Sources drawer"');
    expect(sheetSource).toContain('visibleLabel="Sources"');
    expect(sheetSource).toContain('aria-haspopup="dialog"');
    expect(sheetSource).toContain("mobileDrawerId={ESTIMATE_SOURCES_DRAWER_ID}");
    expect(sidebarSource).toContain('import { Drawer } from "@/components/ui/overlays/sheet-drawer"');
    expect(sidebarSource).toContain('ariaLabel="Sources"');
    expect(sidebarSource).toContain("compactDrawer={false}");
    expect(sidebarSource).toContain('title="Sources"');
    expect(sidebarSource).toContain('closeLabel="Close Sources drawer"');
    expect(drawerSource).toContain("closeOnEscape={closeOnEscape}");
    expect(drawerSource).toContain("returnFocusOnClose={returnFocusOnClose}");
  });

  it("routes sidebar action notifications through toast instead of inline status text", () => {
    const sidebarSource = source("src/components/workshop/component-library/index.tsx");

    expect(sidebarSource).not.toContain('className="sr-only">\n          {lastActionMessage}');
    expect(sidebarSource).not.toContain("{lastActionMessage}");
    expect(sidebarSource).not.toContain("Project sources updated.");
    expect(sidebarSource).not.toContain("Refreshing project sources...");
    expect(sidebarSource).toContain("toast({ tone: getSidebarActionToastTone(message), message })");
    expect(sidebarSource).toContain('id: PROJECT_SOURCE_INSERT_TOAST_ID');
    expect(sidebarSource).toContain('id: PROJECT_SOURCES_LOAD_TOAST_ID');
    expect(sidebarSource).toContain('label: "Retry"');
  });

  it("keeps routine estimate sheet save status quiet while preserving failure toasts", () => {
    const sheetSource = source("src/components/workshop/EstimateSheetContent.tsx");
    const tabStripSource = source("src/components/workshop/estimate-sheet/EstimateTabStrip.tsx");

    expect(sheetSource).not.toContain("Saving...</");
    expect(sheetSource).not.toContain("Could not save</");
    expect(sheetSource).not.toContain("Dismiss row save error");
    expect(sheetSource).not.toContain("Saving row changes...");
    expect(sheetSource).not.toContain('message: error?.message.includes("refreshed") ? "Saved. Recovered edit." : "Saved."');
    expect(sheetSource).toContain("data-estimate-row-save-status");
    expect(sheetSource).toContain('id: "estimate-row-save"');
    expect(sheetSource).toContain('toast({ id: "estimate-row-save", tone: "error"');
    expect(sheetSource).toContain('state === "saving" || state === "saved"');
    expect(sheetSource).not.toContain('state === "saving" || state === "saved" || state === "idle"');
    expect(tabStripSource).not.toContain('{error ? <p role="alert"');
    expect(tabStripSource).toContain("ESTIMATE_TAB_STRIP_ERROR_TOAST_ID");
    expect(tabStripSource).toContain("toast({");
  });

  it("keeps the estimate sidebar Library fetch bounded to the first trusted page", () => {
    const actionsSource = source("src/lib/component-library/actions.ts");
    const repositorySource = source("src/lib/repositories/component-library-repository.ts");
    const projectionSource = source("src/lib/component-library/project-component-projection.ts");
    const sheetSource = source("src/components/workshop/EstimateSheetContent.tsx");

    expect(actionsSource).toContain("SIDEBAR_COMPONENT_LIBRARY_DEFAULT_LIMIT");
    expect(actionsSource).toContain("itemLimit: SIDEBAR_COMPONENT_LIBRARY_DEFAULT_LIMIT");
    expect(actionsSource).toContain("projectRowLimit: SIDEBAR_COMPONENT_LIBRARY_DEFAULT_LIMIT");
    expect(repositorySource).toContain("SIDEBAR_COMPONENT_LIBRARY_ITEM_COLUMNS");
    expect(repositorySource).toContain("COST_LIBRARY_ITEM_D1_COLUMNS");
    expect(repositorySource).toContain("getCloudflareD1Database");
    expect(repositorySource).toContain("LIMIT ?");
    expect(repositorySource).toContain("WHERE item_id IN (${placeholders(itemIds)})");
    expect(repositorySource).not.toContain(".select(selectColumns)");
    expect(repositorySource).not.toContain(".in(\"item_id\", itemIds)");
    expect(projectionSource).toContain("projectRowLimit?: number");
    expect(projectionSource).toContain("LIMIT ?");
    expect(projectionSource).toContain("projectRowLimit ?? SIDEBAR_COMPONENT_LIBRARY_MAX_LIMIT");
    expect(sheetSource).toContain("return loadProjectComponentLibraryLite(projectId)");
  });

  it("keeps the public landing mockup on the generated library assets without private project surfaces", () => {
    const heroSource = source("src/components/landing-v3/HeroEstimateWorkspaceMockup.tsx");
    const sheetSource = source("src/components/workshop/EstimateSheetContent.tsx");
    const treeSource = source("src/components/workshop/EstimateSheetTree.tsx");
    const sidebarSource = source("src/components/workshop/component-library/index.tsx");

    expect(heroSource).toContain("/component-thumbnails/hero-single-lever-kitchen-faucet.png");
    expect(heroSource).toContain("/component-thumbnails/hero-600x600-ceramic-tiles.png");
    expect(heroSource).toContain("/component-thumbnails/hero-200x1200-faux-wood-tiles.png");
    expect(heroSource).toContain("disableRouteSync");
    expect(heroSource).toContain("libraryUseStoredPreferences={false}");
    expect(heroSource).toContain("libraryEnableReusableProjectSources={false}");
    expect(treeSource).toContain("persistWidth={!disableRouteSync}");
    expect(sheetSource).toContain("libraryUsePersistentPanelWidth = !disableRouteSync");
    expect(sheetSource).toContain("usePersistentPanelWidth={libraryUsePersistentPanelWidth}");
    expect(sidebarSource).toContain("persistWidth={usePersistentPanelWidth}");
    expect(heroSource).not.toMatch(/Quartz kitchen countertop|Base cabinet modules|kitchen-quartz-countertop|kitchen-base-cabinets/);
  });
});
