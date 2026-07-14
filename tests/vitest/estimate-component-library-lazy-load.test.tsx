import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

const estimateSheetContentSource = readFileSync("src/components/workshop/EstimateSheetContent.tsx", "utf8");
const estimateWorkspaceClientSource = readFileSync("src/components/workshop/EstimateWorkspaceClient.tsx", "utf8");
const estimateRightSidebarSource = readFileSync("src/components/workshop/component-library/index.tsx", "utf8");

describe("estimate component-library lazy-load boundary", () => {
  it("keeps the workspace panes behind dynamic boundaries while preserving a stable route skeleton", () => {
    expect(estimateWorkspaceClientSource).toContain('const EstimateSheetTree = dynamic(() =>');
    expect(estimateWorkspaceClientSource).toContain('import("./EstimateSheetTree").then((module) => module.EstimateSheetTree)');
    expect(estimateWorkspaceClientSource).toContain('const EstimateSheetContent = dynamic(() =>');
    expect(estimateWorkspaceClientSource).toContain('import("./EstimateSheetContent").then((module) => module.EstimateSheetContent)');
    expect(estimateWorkspaceClientSource).not.toContain('import { EstimateSheetContent } from "./EstimateSheetContent"');
    expect(estimateWorkspaceClientSource).not.toContain('import { EstimateSheetTree } from "./EstimateSheetTree"');
  });

  it("keeps the right sidebar out of the initial estimate sheet content chunk", () => {
    expect(estimateSheetContentSource).not.toContain('import { EstimateRightSidebar } from "./component-library"');
    expect(estimateSheetContentSource).not.toContain('export { EstimateRightSidebar } from "./component-library"');
    expect(estimateSheetContentSource).toContain("const EstimateRightSidebar = dynamic(");
    expect(estimateSheetContentSource).toContain('import("./component-library").then((mod) => mod.EstimateRightSidebar)');
    expect(estimateSheetContentSource).toContain("ssr: false");
    expect(estimateSheetContentSource).toContain("loading: () => <ComponentLibrarySidebarFallback");
  });

  it("keeps the lite library query intent-gated and retryable", () => {
    expect(estimateSheetContentSource).toContain("workspaceComponentLibraryLiteQueryKey(workspaceId, projectId)");
    expect(estimateSheetContentSource).toContain("return loadProjectComponentLibraryLite(projectId)");
    expect(estimateSheetContentSource).toContain("ESTIMATE_LIBRARY_POST_PAINT_DELAY_MS");
    expect(estimateSheetContentSource).toContain("const libraryIntentActive = showCommandPalette || rowComponentPicker?.mode === \"replace\" || sourcesDrawerOpen");
    expect(estimateSheetContentSource).toContain("const libraryQueryCanRun = !shouldLoadLibraryLazily || libraryIntentActive || delayedLibrarySidebarReleased");
    expect(estimateSheetContentSource).toContain("const librarySidebarCanHydrate = !shouldLoadLibraryLazily || libraryIntentActive || delayedLibrarySidebarReleased || Boolean(lazyLibrary)");
    expect(estimateSheetContentSource).toContain("enabled: shouldLoadLibraryLazily && libraryQueryCanRun");
    expect(estimateSheetContentSource).toContain(
      "<ComponentLibrarySidebarFallback isError={isLazyLibraryError} onRetry={() => refetchLazyLibrary()} />",
    );
    expect(estimateSheetContentSource).toContain(
      "shouldLoadLibraryLazily && !librarySidebarCanHydrate",
    );
  });

  it("keeps component thumbnail uploads scoped to the active project", () => {
    expect(estimateRightSidebarSource).toContain("imageUploadProjectId={projectId ?? null}");
  });

  it("hands the canonical project component identity to the estimate component editor", () => {
    expect(estimateSheetContentSource).toContain("getProjectComponentIdentity(item.metadata, item.id, itemWithSnapshot.sourceSnapshot)");
    expect(estimateSheetContentSource).toContain('componentEditScope={isLinkedLibraryComponentRow(componentEditorRow.item) ? "library" : "project"}');
    expect(estimateSheetContentSource).toContain("projectComponentId={getProjectComponentEditorIdentity(componentEditorRow.item)}");
  });
});
