import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

const estimateSheetContentSource = readFileSync("src/components/workshop/EstimateSheetContent.tsx", "utf8");

describe("estimate component-library lazy-load boundary", () => {
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
    expect(estimateSheetContentSource).toContain("enabled: shouldLoadLibraryLazily && (renderSidebar || showCommandPalette)");
    expect(estimateSheetContentSource).toContain(
      "<ComponentLibrarySidebarFallback isError={libraryQuery.isError} onRetry={() => libraryQuery.refetch()} />",
    );
  });
});
