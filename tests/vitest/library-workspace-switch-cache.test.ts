import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import {
  workspaceComponentLibraryLiteQueryKey,
  workspaceComponentLibraryQueryKey,
  workspaceComponentRowsLibraryQueryKey,
} from "@/lib/component-library/query-keys";

const CACHE_CALL_SITE_FILES = [
  "src/components/workshop/library/template-editor/TemplateEditorClient.tsx",
  "src/components/workshop/LibraryPageClient.tsx",
  "src/hooks/use-estimate-row-mutations.ts",
  "src/components/workshop/EstimateSheetContent.tsx",
] as const;

function source(path: string) {
  return readFileSync(path, "utf8");
}

describe("workspace component-library cache scoping", () => {
  it("partitions full library keys by workspace", () => {
    expect(workspaceComponentLibraryQueryKey("workspace-a")).toEqual([
      "workspace-component-library",
      "workspace",
      "workspace-a",
    ]);
    expect(workspaceComponentLibraryQueryKey("workspace-b")).toEqual([
      "workspace-component-library",
      "workspace",
      "workspace-b",
    ]);
    expect(workspaceComponentLibraryQueryKey("workspace-a")).not.toEqual(
      workspaceComponentLibraryQueryKey("workspace-b"),
    );
  });

  it("keeps lite project keys under the same scoped workspace prefix", () => {
    const workspacePrefix = workspaceComponentLibraryQueryKey("workspace-a");
    const liteKey = workspaceComponentLibraryLiteQueryKey("workspace-a", "project-a");

    expect(liteKey).toEqual([
      ...workspacePrefix,
      "lite",
      "project",
      "project-a",
    ]);
    expect(workspaceComponentLibraryLiteQueryKey("workspace-a")).toEqual([
      ...workspacePrefix,
      "lite",
    ]);
  });

  it("partitions project component-row keys by workspace and project", () => {
    expect(workspaceComponentRowsLibraryQueryKey("workspace-a", "project-a")).toEqual([
      "workspace-component-rows-library",
      "workspace",
      "workspace-a",
      "project",
      "project-a",
    ]);
    expect(workspaceComponentRowsLibraryQueryKey("workspace-a", "project-a")).not.toEqual(
      workspaceComponentRowsLibraryQueryKey("workspace-a", "project-b"),
    );
    expect(workspaceComponentRowsLibraryQueryKey("workspace-a", "project-a")).not.toEqual(
      workspaceComponentRowsLibraryQueryKey("workspace-b", "project-a"),
    );
  });

  it("removes unscoped full-library query keys from all known call sites", () => {
    for (const file of CACHE_CALL_SITE_FILES) {
      const text = source(file);

      expect(text).not.toContain('queryKey: ["workspace-component-library"]');
      expect(text).not.toContain("queryKey: WORKSPACE_COMPONENT_LIBRARY_QUERY_KEY");
    }

    expect(source("src/components/workshop/library/template-editor/TemplateEditorClient.tsx")).toContain(
      "workspaceComponentLibraryLiteQueryKey(workspaceId)",
    );
    expect(source("src/components/workshop/LibraryPageClient.tsx")).toContain(
      "workspaceComponentLibraryQueryKey(library.workspaceId)",
    );
    expect(source("src/hooks/use-estimate-row-mutations.ts")).toContain(
      "workspaceComponentLibraryQueryKey(workspaceId)",
    );
    expect(source("src/components/workshop/EstimateSheetContent.tsx")).toContain(
      "workspaceComponentLibraryLiteQueryKey(workspaceId, projectId)",
    );
  });

  it("uses scoped rows-library invalidation at known project mutation call sites", () => {
    const sheetSource = source("src/components/workshop/EstimateSheetContent.tsx");
    const mutationHookSource = source("src/hooks/use-estimate-row-mutations.ts");
    const libraryPageSource = source("src/components/workshop/LibraryPageClient.tsx");

    expect(sheetSource).toContain("workspaceComponentRowsLibraryQueryKey(workspaceId, projectId)");
    expect(mutationHookSource).toContain("workspaceComponentRowsLibraryQueryKey(workspaceId, input.projectId || projectId)");
    expect(libraryPageSource).not.toContain("invalidateQueries({ queryKey: WORKSPACE_COMPONENT_ROWS_LIBRARY_QUERY_KEY })");
  });
});
