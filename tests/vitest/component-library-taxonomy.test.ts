import { describe, expect, it } from "vitest";

import {
  buildComponentCategoryTreeFromRows,
  componentCategoryTree,
  type ComponentLibraryCategoryRow,
  type ComponentLibraryTaxonomyNode,
} from "@/lib/component-library/taxonomy";

function flattenLabels(nodes: ComponentLibraryTaxonomyNode[]): string[] {
  return nodes.flatMap((node) => [node.label, ...flattenLabels(node.children ?? [])]);
}

describe("component library taxonomy", () => {
  it("does not preload fallback taxonomy categories", () => {
    const labels = flattenLabels(componentCategoryTree);

    expect(labels).toEqual([]);
  });

  it("does not synthesize fallback taxonomy categories from empty D1 rows", () => {
    const labels = flattenLabels(buildComponentCategoryTreeFromRows([]));

    expect(labels).toEqual([]);
  });

  it("preserves only explicit D1 taxonomy rows", () => {
    const rows: ComponentLibraryCategoryRow[] = [
      {
        id: "section-site",
        parent_id: null,
        label: "Site",
        node_type: "organizer",
        sort_order: 10,
        code: null,
        metadata: {},
      },
      {
        id: "civil",
        parent_id: "section-site",
        label: "Civil",
        node_type: "category",
        sort_order: 10,
        code: null,
        metadata: {},
      },
    ];

    const labels = flattenLabels(buildComponentCategoryTreeFromRows(rows));

    expect(labels).toEqual(["Site", "Civil"]);
    expect(labels).not.toContain("Administration");
    expect(labels).not.toContain("Fees");
  });
});
