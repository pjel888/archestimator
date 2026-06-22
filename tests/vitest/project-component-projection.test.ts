import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import {
  getProjectEstimateComponentsFolderId,
  getProjectComponentsFolderId,
  projectEstimateRowToLibraryItem,
  type ProjectComponentProjectionRow,
} from "@/lib/component-library/project-component-projection";
import { readProjectComponentProjectionMetadata, withExpressComponentMetadata } from "@/lib/estimates/express-components";

function row(overrides: Partial<ProjectComponentProjectionRow> = {}): ProjectComponentProjectionRow {
  return {
    id: "row-1",
    material: "Express vanity",
    description: "Custom vanity",
    supplier: "Local fabricator",
    supplier_id: null,
    unit: "lot",
    unit_cost: 1500,
    quantity: 1,
    contingency_percentage: 0,
    misc_cost: 0,
    row_revision: 2,
    category_node_id: null,
    discipline: "Unspecified",
    designation: "",
    source_library_item_id: null,
    link_state: "unlinked",
    source_snapshot: { imageUrl: "https://example.com/vanity.jpg", pricingSource: "Project estimate row" },
    metadata: withExpressComponentMetadata({}, { id: "express-row-1" }),
    created_at: "2026-06-15T00:00:00.000Z",
    estimate_nodes: { id: "node-1", name: "Powder Room", estimates: { id: "estimate-1", name: "Main", project_id: "project-1" } },
    ...overrides,
  };
}

describe("project component projection", () => {
  it("projects express estimate rows into the project / estimate-sheet virtual folder", () => {
    const item = projectEstimateRowToLibraryItem(row(), "project-1", "Casa Miguel");

    expect(item).toMatchObject({
      id: "row-1",
      material: "Express vanity",
      source: "project",
      libraryFolderId: getProjectEstimateComponentsFolderId("project-1", "estimate-1"),
      linkState: "unlinked",
      metadata: {
        expressComponent: { kind: "express", id: "express-row-1" },
        projectComponentProjection: {
          projectId: "project-1",
          projectName: "Casa Miguel",
          estimateId: "estimate-1",
          estimateName: "Main",
          nodeId: "node-1",
          nodeName: "Powder Room",
          classification: "express",
        },
      },
    });
    expect(item?.tags).toEqual(expect.arrayContaining(["project-component", "express", "Main", "Powder Room"]));
  });

  it("projects detached rows and excludes used copied rows, legacy blanks, and source-less manual rows", () => {
    const detached = projectEstimateRowToLibraryItem(row({
      id: "detached-row",
      source_library_item_id: null,
      link_state: "detached",
      source_snapshot: { sourceLibraryItemId: "library-row", category: "Furniture" },
      metadata: {},
    }), "project-1");
    const usedCopiedRow = projectEstimateRowToLibraryItem(row({
      id: "used-copied-row",
      source_library_item_id: null,
      link_state: "unlinked",
      source_snapshot: { sourceLibraryItemId: "library-row", category: "Furniture", pricingSource: "Estimate row snapshot" },
      metadata: {},
    }), "project-1");
    const usedSnapshotRow = projectEstimateRowToLibraryItem(row({
      id: "used-snapshot-row",
      source_library_item_id: null,
      link_state: "unlinked",
      source_snapshot: { category: "Furniture", imageUrl: "https://example.com/used.jpg", pricingSource: "Estimate row snapshot" },
      metadata: {},
    }), "project-1");
    const linkedRow = projectEstimateRowToLibraryItem(row({
      id: "linked-row",
      source_library_item_id: "11111111-1111-4111-8111-111111111111",
      link_state: "linked-clean",
      source_snapshot: { sourceLibraryItemId: "11111111-1111-4111-8111-111111111111", category: "Furniture" },
      metadata: {},
    }), "project-1");
    const sourceLess = projectEstimateRowToLibraryItem(row({ metadata: {}, source_snapshot: null, material: "Manual allowance" }), "project-1");
    const legacyBlank = projectEstimateRowToLibraryItem(row({
      metadata: { tags: ["manual-row-placeholder"] },
      source_snapshot: null,
      material: "Drag or add a component here",
    }), "project-1");

    expect(detached?.tags).toContain("detached-library");
    expect(detached?.category).toBe("Furniture");
    expect(detached?.libraryFolderId).toBe(getProjectEstimateComponentsFolderId("project-1", "estimate-1"));
    expect(usedCopiedRow).toBeNull();
    expect(usedSnapshotRow).toBeNull();
    expect(linkedRow).toBeNull();
    expect(sourceLess).toBeNull();
    expect(legacyBlank).toBeNull();
  });

  it("treats malformed projection metadata as non-project-owned", () => {
    expect(readProjectComponentProjectionMetadata({ projectComponentProjection: {} })).toBeNull();
    expect(readProjectComponentProjectionMetadata({
      projectComponentProjection: {
        projectId: "",
        classification: "express",
      },
    })).toBeNull();
    expect(readProjectComponentProjectionMetadata({
      projectComponentProjection: {
        projectId: "project-1",
        classification: "linked-library",
      },
    })).toBeNull();
    expect(readProjectComponentProjectionMetadata({
      projectComponentProjection: {
        projectId: "project-1",
        classification: "express",
      },
    })).toMatchObject({ projectId: "project-1", classification: "express" });
  });

  it("keeps projection support while the project Components route stays deleted", () => {
    const projectRoutePath = join(process.cwd(), "src/app/workshop/projects/[projectId]/components/page.tsx");
    const sidebar = readFileSync(join(process.cwd(), "src/components/workshop/ProjectMiniSidebar.tsx"), "utf8");
    const estimateSidebar = readFileSync(join(process.cwd(), "src/components/workshop/component-library/index.tsx"), "utf8");
    const workspaceRoute = readFileSync(join(process.cwd(), "src/app/workshop/library/components/page.tsx"), "utf8");
    const libraryPage = readFileSync(join(process.cwd(), "src/components/workshop/LibraryPageClient.tsx"), "utf8");
    const projection = readFileSync(join(process.cwd(), "src/lib/component-library/project-component-projection.ts"), "utf8");

    expect(existsSync(projectRoutePath)).toBe(false);
    expect(workspaceRoute).not.toContain("getProjectComponentRowsLibrary");
    expect(libraryPage).toContain("projectId ? loadProjectComponentRowsLibrary(projectId) : loadCurrentWorkspaceComponentRowsLibrary()");
    expect(projection).toContain("if (!project) return fallbackComponentRowsLibraryDataset");
    expect(projection).toContain("options: ProjectComponentRowsLibraryOptions = {}");
    expect(projection).toContain("includeDetailGraph: options.includeDetailGraph");
    expect(projection).toContain("itemLimit: options.itemLimit");
    expect(projection).toContain("projectRowLimit?: number");
    expect(projection).toContain("projectRowsQuery.limit(projectRowLimit)");
    expect(projection).toContain(".eq(\"estimate_nodes.estimates.project_id\", project.id)");
    expect(getProjectComponentsFolderId("project-1")).toBe("project-components-project-1");
    expect(getProjectEstimateComponentsFolderId("project-1", "estimate-1")).toBe("project-components-project-1-estimate-estimate-1");
    expect(projection).toContain("name: project.name || \"Project\"");
    expect(projection).toContain("name: row.estimate_nodes?.estimates?.name?.trim() || \"Estimate Sheet\"");
    expect(sidebar).not.toContain("/workshop/projects/${projectId}/components");
    expect(estimateSidebar).toContain('{ id: "components", label: "Library" }');
    expect(estimateSidebar).toContain('{ id: "project", label: "Project" }');
  });
});
