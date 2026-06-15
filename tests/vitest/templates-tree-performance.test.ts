import { describe, expect, it } from "vitest";
import {
  buildTemplatesSelectionNodes,
  buildTemplatesTreeNodes,
  filterProjectSourcesByQuery,
  getCheckedProjectSourceRowItems,
  getCheckedProjectSourceTargets,
} from "@/components/workshop/component-library/tree/TemplatesTree";
import type { EstimateRowItem } from "@/components/workshop/estimate-tree-data";
import type { ReusableEstimateSource } from "@/lib/reusable-sources/types";

const rowItem: EstimateRowItem = {
  id: "row-1",
  material: "Nested Component",
  name: "Nested Component",
  description: "Component from a project source",
  supplier: "Supplier",
  source: "library",
  unit: "pc",
  itemCost: 100,
  price: 100,
  currency: "PHP",
  quantity: 1,
  subTotal: 100,
  miscCost: 0,
  totalItemCosts: 100,
  category: "Category",
  pricingSource: "Supplier",
  pricingDate: "2026-06-14",
};

function makeProjectSources(projectCount = 50): ReusableEstimateSource[] {
  const sources: ReusableEstimateSource[] = [];
  for (let projectIndex = 0; projectIndex < projectCount; projectIndex += 1) {
    const projectId = `project-${projectIndex}`;
    sources.push({
      kind: "project",
      projectId,
      name: `Project ${projectIndex}`,
    });
    for (let estimateIndex = 0; estimateIndex < 8; estimateIndex += 1) {
      const estimateId = `estimate-${projectIndex}-${estimateIndex}`;
      sources.push({
        kind: "project-estimate",
        projectId,
        estimateId,
        name: `Estimate ${projectIndex}-${estimateIndex}`,
        sheetCode: `EST-${projectIndex}-${estimateIndex}`,
      });
      for (let tabIndex = 0; tabIndex < 4; tabIndex += 1) {
        const tabId = `tab-${projectIndex}-${estimateIndex}-${tabIndex}`;
        sources.push({
          kind: "project-tab",
          projectId,
          estimateId,
          tabId,
          name: `Tab ${projectIndex}-${estimateIndex}-${tabIndex}`,
        });
        for (let nodeIndex = 0; nodeIndex < 6; nodeIndex += 1) {
          sources.push({
            kind: "project-node",
            projectId,
            estimateId,
            tabId,
            nodeId: `node-${projectIndex}-${estimateIndex}-${tabIndex}-${nodeIndex}`,
            nodeKind: "area",
            name: `Node ${projectIndex}-${estimateIndex}-${tabIndex}-${nodeIndex}`,
          });
        }
      }
    }
  }
  return sources;
}

describe("templates project-source performance helpers", () => {
  it("filters large resident project-source lists with indexed descendants", () => {
    const sources = makeProjectSources();

    const startedAt = performance.now();
    for (let index = 0; index < 5; index += 1) {
      filterProjectSourcesByQuery(sources, "Project 12");
    }
    const elapsedMs = performance.now() - startedAt;
    const filtered = filterProjectSourcesByQuery(sources, "Project 12");

    expect(filtered).toHaveLength(1 + 8 + 32 + 192);
    expect(filtered.every((source) => source.kind !== "custom-template" && source.projectId === "project-12")).toBe(true);
    expect(elapsedMs).toBeLessThan(1000);
  });

  it("keeps a matching project node with only its ancestors", () => {
    const sources = makeProjectSources(2);

    const filtered = filterProjectSourcesByQuery(sources, "Node 1-2-3-4");

    expect(filtered.map((source) => source.kind)).toEqual([
      "project",
      "project-estimate",
      "project-tab",
      "project-node",
    ]);
    expect(filtered.at(-1)).toMatchObject({
      kind: "project-node",
      nodeId: "node-1-2-3-4",
    });
  });

  it("handles hostile search text without throwing or leaking unrelated sources", () => {
    const sources = makeProjectSources(2);

    expect(() => filterProjectSourcesByQuery(sources, "../${ignore-instructions}\u202E".repeat(20))).not.toThrow();
    expect(filterProjectSourcesByQuery(sources, "../${ignore-instructions}\u202E".repeat(20))).toEqual([]);
  });

  it("dedupes duplicate project-node sources before materializing the tree", () => {
    const sources: ReusableEstimateSource[] = [
      {
        kind: "project",
        projectId: "project-1",
        name: "Project 1",
      },
      {
        kind: "project-estimate",
        projectId: "project-1",
        estimateId: "estimate-1",
        name: "Estimate 1",
        sheetCode: "EST-1",
      },
      {
        kind: "project-tab",
        projectId: "project-1",
        estimateId: "estimate-1",
        tabId: "tab-1",
        name: "Tab 1",
      },
      {
        kind: "project-node",
        projectId: "project-1",
        estimateId: "estimate-1",
        tabId: "tab-1",
        nodeId: "node-1",
        nodeKind: "area",
        name: "Older Area",
      },
      {
        kind: "project-node",
        projectId: "project-1",
        estimateId: "estimate-1",
        tabId: "tab-1",
        nodeId: "node-1",
        nodeKind: "area",
        name: "Latest Area",
      },
    ];

    const tabNode = buildTemplatesTreeNodes([], sources)[0]?.children?.[0]?.children?.[0]?.children?.[0];

    expect(tabNode?.children).toHaveLength(1);
    expect(tabNode?.children?.[0]).toMatchObject({
      id: "source-node-node-1",
      label: "Latest Area",
    });
  });

  it("renders project tabs by sheet display label and sort order while preserving raw names", () => {
    const sources: ReusableEstimateSource[] = [
      {
        kind: "project",
        projectId: "project-1",
        name: "Project 1",
      },
      {
        kind: "project-estimate",
        projectId: "project-1",
        estimateId: "estimate-1",
        name: "Estimate 1",
        sheetCode: "EST-1",
      },
      {
        kind: "project-tab",
        projectId: "project-1",
        estimateId: "estimate-1",
        tabId: "tab-second",
        name: "Alpha Stored Name",
        displayName: "Second Saved",
        sortOrder: 1,
      },
      {
        kind: "project-tab",
        projectId: "project-1",
        estimateId: "estimate-1",
        tabId: "tab-first",
        name: "Zed Stored Name",
        displayName: "Page 001",
        sortOrder: 0,
      },
    ];

    const estimateNode = buildTemplatesTreeNodes([], sources)[0]?.children?.[0]?.children?.[0];
    const tabNodes = estimateNode?.children ?? [];

    expect(tabNodes.map((node) => node.label)).toEqual(["Page 001", "Second Saved"]);
    expect(tabNodes.map((node) => node.ariaLabel)).toEqual(["Page 001 project tab source", "Second Saved project tab source"]);
    expect(filterProjectSourcesByQuery(sources, "Zed Stored Name")).toEqual([
      expect.objectContaining({ kind: "project" }),
      expect.objectContaining({ kind: "project-estimate" }),
      expect.objectContaining({ kind: "project-tab", name: "Zed Stored Name" }),
    ]);
    expect(filterProjectSourcesByQuery(sources, "Page 001")).toEqual([
      expect.objectContaining({ kind: "project" }),
      expect.objectContaining({ kind: "project-estimate" }),
      expect.objectContaining({ kind: "project-tab", name: "Zed Stored Name" }),
    ]);
  });

  it("materializes nested project nodes and project component rows without flattening", () => {
    const sources: ReusableEstimateSource[] = [
      {
        kind: "project",
        projectId: "project-1",
        name: "Project 1",
      },
      {
        kind: "project-estimate",
        projectId: "project-1",
        estimateId: "estimate-1",
        name: "Estimate 1",
        sheetCode: "EST-1",
      },
      {
        kind: "project-tab",
        projectId: "project-1",
        estimateId: "estimate-1",
        tabId: "tab-1",
        name: "Tab 1",
      },
      {
        kind: "project-node",
        projectId: "project-1",
        estimateId: "estimate-1",
        tabId: "tab-1",
        nodeId: "node-parent",
        nodeKind: "group",
        name: "Parent Group",
        rowItems: [rowItem],
      },
      {
        kind: "project-node",
        projectId: "project-1",
        estimateId: "estimate-1",
        tabId: "tab-1",
        nodeId: "node-child",
        parentNodeId: "node-parent",
        nodeKind: "area",
        name: "Child Area",
      },
    ];

    const tabNode = buildTemplatesTreeNodes([], sources)[0]?.children?.[0]?.children?.[0]?.children?.[0];
    const parentNode = tabNode?.children?.[0];

    expect(tabNode?.children).toHaveLength(1);
    expect(parentNode?.label).toBe("Parent Group");
    expect(parentNode?.children?.map((node) => node.label)).toEqual(["Child Area", "Nested Component"]);
    expect(parentNode?.children?.[1]).toMatchObject({
      id: "source-node-node-parent::row-row-1-0",
      label: "Nested Component",
      isLeaf: true,
      selectable: true,
    });
  });

  it("dedupes checked project-source descendants and exposes standalone checked component rows", () => {
    const sources: ReusableEstimateSource[] = [
      {
        kind: "project-tab",
        projectId: "project-1",
        estimateId: "estimate-1",
        tabId: "tab-1",
        name: "Tab 1",
      },
      {
        kind: "project-node",
        projectId: "project-1",
        estimateId: "estimate-1",
        tabId: "tab-1",
        nodeId: "node-parent",
        nodeKind: "group",
        name: "Parent Group",
        rowItems: [rowItem],
      },
      {
        kind: "project-node",
        projectId: "project-1",
        estimateId: "estimate-1",
        tabId: "tab-1",
        nodeId: "node-child",
        parentNodeId: "node-parent",
        nodeKind: "area",
        name: "Child Area",
      },
    ];

    expect(getCheckedProjectSourceTargets(sources, new Set(["source-node-node-parent", "source-node-node-child"]))).toEqual([
      expect.objectContaining({ kind: "project-node", nodeId: "node-parent" }),
    ]);
    expect(getCheckedProjectSourceRowItems(sources, new Set(["source-node-node-parent", "source-node-node-parent::row-row-1-0"]))).toEqual([]);
    expect(getCheckedProjectSourceRowItems(sources, new Set(["source-node-node-parent::row-row-1-0"]))).toEqual([rowItem]);
  });

  it("derives selection nodes from the same generated project-source tree shape", () => {
    const sources = makeProjectSources(1);

    const uiNodes = buildTemplatesTreeNodes([], sources);
    const selectionNodes = buildTemplatesSelectionNodes([], sources);

    expect(selectionNodes[0]?.id).toBe(uiNodes[0]?.id);
    expect(selectionNodes[0]?.children?.[0]?.children?.[0]?.children?.[0]?.children).toHaveLength(6);
  });
});
