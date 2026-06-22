import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

function source(path: string) {
  return readFileSync(path, "utf8");
}

describe("Estimate Sheet sidebar Library consumers", () => {
  it("keeps shared tab controls linked to rendered tab panels", () => {
    const tabsSource = source("src/components/ui/tabs.tsx");

    expect(tabsSource).toContain("aria-controls={`tabpanel-${tab.id}`}");
    expect(tabsSource).toContain("id={`tabpanel-${id}`}");
  });

  it("keeps Library and Project source rows visibly scoped with trust chips", () => {
    const sidebarSource = source("src/components/workshop/component-library/index.tsx");
    const treeSource = source("src/components/workshop/component-library/tree/LibraryTree.tsx");

    expect(sidebarSource).toContain('activeLibraryTreeAriaLabel = isProjectTab ? "Project sources" : "Library sources"');
    expect(sidebarSource).toContain('activeSourceScopeLabel = isProjectTab ? "Project" : "Library"');
    expect(sidebarSource).toContain("treeAriaLabel={activeLibraryTreeAriaLabel}");
    expect(sidebarSource).toContain("sourceScopeLabel={activeSourceScopeLabel}");
    expect(treeSource).toContain("SourceTrustChips");
    expect(treeSource).toContain("{sourceScopeLabel} · {item.supplier || \"No supplier\"}");
  });

  it("surfaces sidebar actions visibly instead of relying on sr-only status text", () => {
    const sidebarSource = source("src/components/workshop/component-library/index.tsx");

    expect(sidebarSource).not.toContain('className="sr-only">\n          {lastActionMessage}');
    expect(sidebarSource).toContain("aria-live=\"polite\"");
    expect(sidebarSource).toContain("{lastActionMessage}");
  });

  it("routes risky Library commits through the Estimate Sheet source review gate", () => {
    const sheetSource = source("src/components/workshop/EstimateSheetContent.tsx");
    const trustModelSource = source("src/components/workshop/library/source-trust-model.ts");
    const estimateActionsSource = source("src/lib/estimates/actions.ts");

    expect(sheetSource).toContain("getLibraryCommitTrustGate");
    expect(trustModelSource).toContain("Review source before replacing row");
    expect(sheetSource).toContain("Incoming Library source");
    expect(sheetSource).toContain("Current estimate row");
    expect(sheetSource).toContain("trust_insert_gate_warned");
    expect(sheetSource).toContain("trust_insert_gate_confirmed");
    expect(sheetSource).toContain('item.source === "supplier"');
    expect(estimateActionsSource).toContain("libraryItem.sourceLibraryItemId && isUuid(libraryItem.sourceLibraryItemId)");
    expect(estimateActionsSource).toContain("assertCurrentLibrarySourceForEstimateCommit(supabase, libraryItem)");
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
    expect(repositorySource).toContain(".select(SIDEBAR_COMPONENT_LIBRARY_ITEM_COLUMNS)");
    expect(repositorySource).toContain(".limit(limit)");
    expect(repositorySource).toContain(".in(\"item_id\", itemIds)");
    expect(projectionSource).toContain("projectRowLimit?: number");
    expect(projectionSource).toContain("projectRowsQuery.limit(projectRowLimit)");
    expect(sheetSource).toContain("return loadProjectComponentLibraryLite(projectId)");
  });
});
