import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import {
  getProjectEstimateComponentsFolderId,
  getProjectComponentsFolderId,
  projectEstimateRowToLibraryItem,
  type ProjectComponentProjectionRow,
} from "@/lib/component-library/project-component-projection";
import { toProjectOnlyComponentRowsLibrary } from "@/lib/component-library/project-component-dataset";
import { readProjectComponentProjectionMetadata, withExpressComponentMetadata } from "@/lib/estimates/express-components";
import type { ComponentRowsLibraryDataset } from "@/lib/repositories/component-library-repository";

const estimateRowImageAsset = {
  kind: "upload-asset",
  schemaVersion: 1,
  assetId: "asset-1",
  uploadSessionId: "session-1",
  bucket: "project-images",
  path: "workspace-1/user-1/project-images/project-1/estimate-row-images/estimate-1/asset-1.webp",
  thumbnailPath: "workspace-1/user-1/project-images/project-1/estimate-row-images/estimate-1/asset-1-thumb.webp",
  contentType: "image/webp",
  sizeBytes: 128,
  scanStatus: "not_required",
};

function row(overrides: Partial<ProjectComponentProjectionRow> = {}): ProjectComponentProjectionRow {
  return {
    id: "row-1",
    material: "Express vanity",
    description: "Custom vanity",
    supplier: "Local fabricator",
    supplier_id: null,
    brand_id: null,
    unit: "lot",
    unit_cost: 1500,
    quantity: 1,
    quantity_base: null,
    quantity_contingency_amount: null,
    contingency_percentage: 0,
    adjustment_percentage: 0,
    misc_cost: 0,
    row_revision: 2,
    category_node_id: null,
    discipline: "Unspecified",
    designation: "",
    source_library_item_id: null,
    link_state: "unlinked",
    source_snapshot: { imageUrl: "https://example.com/vanity.jpg", imageAsset: estimateRowImageAsset, pricingSource: "Project estimate row" },
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
      id: "express-row-1",
      material: "Express vanity",
      source: "project",
      libraryFolderId: getProjectEstimateComponentsFolderId("project-1", "estimate-1"),
      linkState: "unlinked",
      metadata: {
        expressComponent: { kind: "express", id: "express-row-1" },
        projectComponentProjection: {
          componentId: "express-row-1",
          projectId: "project-1",
          projectName: "Casa Miguel",
          estimateId: "estimate-1",
          estimateName: "Main",
          nodeId: "node-1",
          nodeName: "Powder Room",
          sourceRowId: "row-1",
          instanceRowIds: ["row-1"],
          instanceCount: 1,
          classification: "express",
          imageAsset: estimateRowImageAsset,
        },
      },
    });
    expect(item?.tags).toEqual(expect.arrayContaining(["project-component", "express", "Main", "Powder Room"]));
  });

  it("uses project-component source snapshot identity ahead of stale copied row metadata", () => {
    const item = projectEstimateRowToLibraryItem(row({
      id: "copied-row-2",
      metadata: withExpressComponentMetadata({}, { id: "stale-row-local-id" }),
      source_snapshot: {
        sourceType: "project_component",
        sourceComponentId: "project-component-1",
        sourceEstimateRowId: "row-1",
        imageUrl: "https://example.com/pergo.jpg",
        pricingSource: "Project estimate row",
      },
    }), "project-1", "Casa Miguel");

    expect(item).toMatchObject({
      id: "project-component-1",
      metadata: {
        expressComponent: { id: "stale-row-local-id" },
        projectComponentProjection: {
          componentId: "project-component-1",
          sourceRowId: "copied-row-2",
          instanceRowIds: ["copied-row-2"],
          instanceCount: 1,
        },
      },
    });
  });

  it("preserves authoritative brand identity through the Project projection", () => {
    const item = projectEstimateRowToLibraryItem(row({
      brand_id: "11111111-1111-4111-8111-111111111111",
      source_snapshot: {
        brand: "Acme Materials",
        brandId: "stale-brand-id",
        pricingSource: "Project estimate row",
      },
    }), "project-1", "Casa Miguel");

    expect(item).toMatchObject({
      brand: "Acme Materials",
      brandId: "11111111-1111-4111-8111-111111111111",
    });
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

  it("filters the composed picker dataset to the selected project's owned projections", () => {
    const projectOneItem = projectEstimateRowToLibraryItem(row(), "project-1", "Casa Miguel");
    const projectTwoItem = projectEstimateRowToLibraryItem(row({
      id: "row-2",
      metadata: withExpressComponentMetadata({}, { id: "express-row-2" }),
      estimate_nodes: {
        id: "node-2",
        name: "Lobby",
        estimates: { id: "estimate-2", name: "Lobby works", project_id: "project-2" },
      },
    }), "project-2", "North Studio");
    if (!projectOneItem || !projectTwoItem) throw new Error("Project projection fixture failed");

    const projectOneRoot = getProjectComponentsFolderId("project-1");
    const projectOneEstimate = getProjectEstimateComponentsFolderId("project-1", "estimate-1");
    const projectTwoRoot = getProjectComponentsFolderId("project-2");
    const dataset = {
      workspaceId: "workspace-1",
      categoryTree: [],
      suppliers: [],
      brands: [],
      libraryFolders: [
        { id: projectOneRoot },
        { id: projectOneEstimate },
        { id: projectTwoRoot },
        { id: "shared-library-folder" },
      ],
      libraryItems: [
        projectOneItem,
        projectTwoItem,
        { id: "shared-row", source: "library", libraryFolderId: "shared-library-folder" },
        {
          ...projectTwoItem,
          id: "spoofed-project-row",
          libraryFolderId: projectOneEstimate,
        },
      ],
      isPartial: true,
      loadedComponentCount: 4,
      totalComponentCount: 4,
    } as unknown as ComponentRowsLibraryDataset;

    const filtered = toProjectOnlyComponentRowsLibrary(dataset, "project-1");

    expect(filtered.libraryItems.map((item) => item.id)).toEqual([projectOneItem.id]);
    expect(filtered.libraryFolders.map((folder) => folder.id)).toEqual([projectOneRoot, projectOneEstimate]);
    expect(filtered).toMatchObject({
      isPartial: false,
      loadedComponentCount: 1,
      totalComponentCount: 1,
    });
  });

  it("keeps the dedicated project route deleted while the workspace source tab loads project-only projections", () => {
    const projectRoutePath = join(process.cwd(), "src/app/workshop/projects/[projectId]/components/page.tsx");
    const sidebar = readFileSync(join(process.cwd(), "src/components/workshop/ProjectMiniSidebar.tsx"), "utf8");
    const estimateSidebar = readFileSync(join(process.cwd(), "src/components/workshop/component-library/index.tsx"), "utf8");
    const workspaceRoute = readFileSync(join(process.cwd(), "src/app/workshop/library/components/page.tsx"), "utf8");
    const libraryRoute = readFileSync(join(process.cwd(), "src/components/workshop/library/LibraryComponentsRoute.tsx"), "utf8");
    const libraryPage = readFileSync(join(process.cwd(), "src/components/workshop/LibraryPageClient.tsx"), "utf8");
    const libraryActions = readFileSync(join(process.cwd(), "src/lib/component-library/actions.ts"), "utf8");
    const projection = readFileSync(join(process.cwd(), "src/lib/component-library/project-component-projection.ts"), "utf8");

    expect(existsSync(projectRoutePath)).toBe(false);
    expect(workspaceRoute).not.toContain("getProjectComponentRowsLibrary");
    expect(libraryRoute).toContain("getProjectOnlyComponentRowsLibraryPage(selectedProject.project.id)");
    expect(libraryRoute).not.toContain("toProjectOnlyComponentRowsLibrary");
    expect(libraryRoute).toContain("canManageLibrary && isExpressComponentPromotionEnabled()");
    expect(libraryPage).toContain("loadProjectOnlyComponentRowsLibrary(projectId)");
    expect(libraryPage).toContain("loadProjectOnlyComponentRowsLibrary(projectId, componentRowsPage.nextCursor)");
    expect(libraryPage).toContain("loadProjectComponentRowsLibrary(projectId)");
    expect(libraryActions).toContain("getProjectOnlyComponentRowsLibraryPage(projectId, cursor)");
    expect(projection).toContain("if (!project) return fallbackComponentRowsLibraryDataset");
    expect(projection).toContain("options: ProjectComponentRowsLibraryOptions = {}");
    expect(projection).toContain("includeDetailGraph: options.includeDetailGraph");
    expect(projection).toContain("itemLimit: options.itemLimit");
    expect(projection).toContain("projectRowLimit?: number");
    expect(projection).toContain("export const PROJECT_COMPONENT_ROWS_PAGE_SIZE = 50");
    expect(projection).toContain("export async function getProjectOnlyComponentRowsLibraryPage(");
    expect(projection).toContain("getCloudflareD1Database");
    expect(projection).toContain("FROM estimate_row_items row_items");
    expect(projection).toContain("estimates.project_id = ?");
    expect(projection).not.toMatch(/createSupabaseServerClient|@\/lib\/supabase/);
    expect(getProjectComponentsFolderId("project-1")).toBe("project-components-project-1");
    expect(getProjectEstimateComponentsFolderId("project-1", "estimate-1")).toBe("project-components-project-1-estimate-estimate-1");
    expect(projection).toContain("name: project.name || \"Project\"");
    expect(projection).toContain("name: row.estimate_nodes?.estimates?.name?.trim() || \"Estimate Sheet\"");
    expect(sidebar).not.toContain("/workshop/projects/${projectId}/components");
    expect(estimateSidebar).toContain('components: "Library"');
    expect(estimateSidebar).toContain('project: "Project"');
  });
});
