import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";
import { estimateTemplates } from "@/lib/component-library/estimate-templates";
import {
  buildEstimateTemplatesFromRows,
  fallbackComponentLibraryDataset,
  fallbackComponentRowsLibraryDataset,
  getCurrentWorkspaceComponentLibrary,
  getCurrentWorkspaceComponentRowsLibrary,
  getCurrentWorkspaceEstimateTemplates,
  getTemplateTableFallbackTemplates,
} from "@/lib/repositories/component-library-repository";

function collectTemplateNodeIds(nodes: Array<{ id: string; children?: Array<{ id: string; children?: never }> }>): string[] {
  return nodes.flatMap((node) => [node.id, ...collectTemplateNodeIds(node.children ?? [])]);
}

describe("component-library template repository helpers", () => {
  it("pages full workspace detail graph reads and keeps the sidebar path bounded by item ids", () => {
    const source = readFileSync(
      join(process.cwd(), "src/lib/repositories/component-library-repository.ts"),
      "utf8",
    );

    expect(source).toContain("SIDEBAR_COMPONENT_LIBRARY_DEFAULT_LIMIT = 50");
    expect(source).toContain("SIDEBAR_COMPONENT_LIBRARY_MAX_LIMIT = 100");
    expect(source).toContain("SIDEBAR_COMPONENT_LIBRARY_ITEM_COLUMNS");
    expect(source).toContain(".select(SIDEBAR_COMPONENT_LIBRARY_ITEM_COLUMNS)");
    expect(source).toContain(".limit(limit)");
    expect(source).toContain("const isBoundedItemPage = boundedItemLimit !== undefined");
    expect(source).toContain("collectComponentLibraryRowsForSelectedItems");
    expect(source.match(/\.in\("item_id", itemIds\)/g)?.length ?? 0).toBeGreaterThanOrEqual(2);
    expect(source).toContain("collectComponentLibraryWorkspaceRowsForItems");
    expect(source.match(/collectComponentLibraryWorkspaceRowsForItems</g)?.length ?? 0).toBeGreaterThanOrEqual(7);
    expect(source).toContain("const itemIdSet = new Set(itemIds);");
    expect(source).toContain("pageRows.filter((row) => itemIdSet.has(row.item_id))");
    expect(source.match(/\.range\(from, to\)/g)?.length ?? 0).toBeGreaterThanOrEqual(7);
    expect(source).not.toContain("collectComponentLibraryRowsInItemChunks");
    expect(source).not.toContain("COMPONENT_LIBRARY_ITEM_ID_QUERY_CHUNK_SIZE");
    expect(source).not.toContain('.in("item_id", chunk)');
  });

  it("exposes separate component-only, template-only, and combined helper contracts", () => {
    expect(typeof getCurrentWorkspaceComponentRowsLibrary).toBe("function");
    expect(typeof getCurrentWorkspaceEstimateTemplates).toBe("function");
    expect(typeof getCurrentWorkspaceComponentLibrary).toBe("function");
    expect("templates" in fallbackComponentRowsLibraryDataset).toBe(false);
    expect(getCurrentWorkspaceComponentRowsLibrary.toString()).toContain("includeDetailGraph: options.includeDetailGraph");
    expect(fallbackComponentLibraryDataset.templates).toEqual([]);
    expect(getCurrentWorkspaceComponentRowsLibrary.toString()).not.toContain("estimate_templates");
    const combinedHelperSource = getCurrentWorkspaceComponentLibrary.toString();
    expect(combinedHelperSource).toContain("ensureDefaultWorkspace");
    expect(combinedHelperSource).toContain("loadCurrentWorkspaceEstimateTemplates");
    expect(combinedHelperSource).not.toContain("getCurrentWorkspaceComponentRowsLibrary");
    expect(combinedHelperSource).not.toContain("getCurrentWorkspaceEstimateTemplates");
  });

  it("uses static templates only when the persisted template table is missing", () => {
    expect(getTemplateTableFallbackTemplates({ isTemplateTableMissing: true })).toBe(estimateTemplates);
    expect(getTemplateTableFallbackTemplates({ isTemplateTableMissing: false })).toEqual([]);
    expect(fallbackComponentLibraryDataset.templates).toEqual([]);
  });

  it("uses canonical UUID ids for static seed templates that can be persisted and copied by RPC", () => {
    const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    for (const template of estimateTemplates) {
      expect(template.id).toMatch(uuidPattern);
      expect(collectTemplateNodeIds(template.nodes).every((id) => uuidPattern.test(id))).toBe(true);
    }
  });

  it("builds UI-ready estimate templates from persisted template rows", () => {
    const templates = buildEstimateTemplatesFromRows({
      templates: [
        {
          id: "template-1",
          workspace_id: "workspace-1",
          name: "Apartment Starter",
          description: "Starter rooms",
          category: "Residential",
          sort_order: 20,
          metadata: {},
          created_by: null,
          created_at: "2026-05-22T00:00:00.000Z",
          updated_at: "2026-05-22T00:00:00.000Z",
        },
      ],
      nodes: [
        {
          id: "area-1",
          template_id: "template-1",
          parent_id: "group-1",
          kind: "area",
          name: "Living",
          sort_order: 20,
          metadata: {},
          created_at: "2026-05-22T00:00:00.000Z",
          updated_at: "2026-05-22T00:00:00.000Z",
        },
        {
          id: "group-1",
          template_id: "template-1",
          parent_id: null,
          kind: "group",
          name: "Interior",
          sort_order: 10,
          metadata: {},
          created_at: "2026-05-22T00:00:00.000Z",
          updated_at: "2026-05-22T00:00:00.000Z",
        },
      ],
      rowItems: [
        {
          id: "row-1",
          template_id: "template-1",
          template_node_id: "area-1",
          sort_order: 10,
          source_library_item_id: "lib-sofa",
          source_snapshot: {
            category: "Furniture",
            categoryNodeId: "furniture",
            imageUrl: "/component-thumbnails/lib-sofa.jpg",
            pricingDate: "2026-05-17",
            pricingSource: "Catalog",
            source: "library",
            tags: ["living"],
          },
          category_node_id: "furniture",
          supplier_id: "supplier-1",
          material: "Sofa",
          description: "Compact sofa",
          supplier: "IKEA Philippines",
          unit: "pc",
          quantity: 2,
          unit_cost: 100,
          misc_cost: 15,
          discipline: "Architectural",
          designation: "Furniture",
          link_state: "linked-clean",
          metadata: {},
          created_at: "2026-05-22T00:00:00.000Z",
          updated_at: "2026-05-22T00:00:00.000Z",
        },
      ],
    });

    expect(templates).toEqual([
      expect.objectContaining({
        id: "template-1",
        name: "Apartment Starter",
        category: "Residential",
        nodes: [
          expect.objectContaining({
            id: "group-1",
            kind: "group",
            children: [
              expect.objectContaining({
                id: "area-1",
                kind: "area",
                estimateRowItems: [
                  expect.objectContaining({
                    id: "row-1",
                    material: "Sofa",
                    source: "library",
                    quantity: 2,
                    subTotal: 200,
                    miscCost: 15,
                    totalItemCosts: 215,
                    category: "Furniture",
                    categoryNodeId: "furniture",
                    supplierId: "supplier-1",
                    pricingDate: "2026-05-17",
                    pricingSource: "Catalog",
                    tags: ["living"],
                  }),
                ],
              }),
            ],
          }),
        ],
      }),
    ]);
  });
});
