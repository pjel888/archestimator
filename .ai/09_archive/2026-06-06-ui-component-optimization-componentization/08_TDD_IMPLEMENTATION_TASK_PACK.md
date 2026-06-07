# UI Component Optimization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build reusable, performant UI and tree foundations for Archestimator without changing current workshop/share behavior.

**Architecture:** Extract pure tree utilities first, prove them in read-only share trees, then decompose bridge-node components behind targeted tests. Editable drag/drop trees keep React Complex Tree in the first pass; virtualization remains behind a measured dependency gate.

**Tech Stack:** Next.js 16, React 19, TypeScript 6, Bun, Tailwind v4, Vitest, Testing Library, React Complex Tree, TanStack Query, TanStack Table.

## 2026-06-06 Prerequisite Update

This task pack is future implementation guidance only. Before executing any task:

1. Read `CURRENT_CANONICAL_PLAN.md`.
2. Start with MVP Phases 0-3 only unless owner approval expands scope.
3. Rerun `npx gitnexus status` and exact symbol impact for touched symbols.
4. Treat the 12 missing tests in `IMPLEMENTATION_MATRIX.md` as work to create, not existing validation.
5. Do not change editable estimate tree or sheet behavior during the MVP slice.

---

## File Structure

Create:

- `src/components/workshop/tree-core/types.ts`
- `src/components/workshop/tree-core/tree-index.ts`
- `src/components/workshop/tree-core/flatten-visible-tree.ts`
- `src/components/workshop/tree-core/filter-tree.ts`
- `src/components/workshop/tree-core/tree-aria.ts`
- `src/components/workshop/tree-core/use-tree-expansion.ts`
- `src/components/share/share-tree/share-tree-format.ts`
- `src/components/share/share-tree/share-tree-search.ts`
- `src/components/share/share-tree/use-share-tree-expansion.ts`
- `src/components/share/share-tree/ShareTreeNodeRow.tsx`
- `src/components/share/share-tree/ShareTreeSurface.tsx`
- `src/components/workshop/component-library/tree/library-tree-index.ts`
- `src/components/workshop/estimate-tree/use-estimate-tree-model.ts`
- `src/components/workshop/estimate-sheet/activity/ActivityScopeTree.tsx`
- `src/components/workshop/component-library-manager/add-component/add-component-draft.ts`

Modify:

- `src/components/workshop/workshop-tree.tsx`
- `src/components/share/ShareEstimateTreePanel.tsx`
- `src/components/share/ShareEstimateTreeView.tsx`
- `src/components/workshop/component-library/tree/buildLibraryTree.ts`
- `src/lib/component-library/library-folder-reorder.ts`
- `src/components/workshop/EstimateSheetTree.tsx`
- `src/components/workshop/EstimateSheetContent.tsx`
- `src/components/workshop/component-library-manager/AddComponentModal.tsx`

Test:

- `tests/vitest/tree-core-visible-flatten.test.ts`
- `tests/vitest/tree-core-filter.test.ts`
- `tests/vitest/tree-core-aria.test.ts`
- `tests/vitest/share-tree-search.test.ts`
- `tests/vitest/share-tree-renderer.test.tsx`
- `tests/vitest/component-library-tree-index.test.ts`
- `tests/vitest/library-folder-reorder.test.ts`
- `tests/vitest/estimate-tree-model.test.ts`
- `tests/vitest/estimate-sheet-activity-scope-tree.test.tsx`
- `tests/vitest/add-component-draft.test.ts`

## Task 1: Pure Tree Core Types and Flattening

**Files:**

- Create: `src/components/workshop/tree-core/types.ts`
- Create: `src/components/workshop/tree-core/flatten-visible-tree.ts`
- Test: `tests/vitest/tree-core-visible-flatten.test.ts`

- [ ] **Step 1: Write the failing flattening test**

```ts
import { describe, expect, it } from "vitest";
import { flattenVisibleTree } from "@/components/workshop/tree-core/flatten-visible-tree";
import type { TreeAdapter } from "@/components/workshop/tree-core/types";

type Node = { id: string; label: string; children?: Node[] };

const adapter: TreeAdapter<Node> = {
  getId: (node) => node.id,
  getLabel: (node) => node.label,
  getChildren: (node) => node.children ?? [],
};

describe("flattenVisibleTree", () => {
  it("returns only visible descendants with depth and sibling metadata", () => {
    const nodes: Node[] = [
      {
        id: "root",
        label: "Root",
        children: [
          { id: "a", label: "A" },
          { id: "b", label: "B", children: [{ id: "b-1", label: "B1" }] },
        ],
      },
    ];

    const rows = flattenVisibleTree(nodes, adapter, new Set(["root", "b"]));

    expect(rows.map((row) => [row.id, row.depth, row.indexWithinParent, row.siblingCount])).toEqual([
      ["root", 0, 0, 1],
      ["a", 1, 0, 2],
      ["b", 1, 1, 2],
      ["b-1", 2, 0, 1],
    ]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test tests/vitest/tree-core-visible-flatten.test.ts`

Expected: fail because `tree-core/flatten-visible-tree` does not exist.

- [ ] **Step 3: Write minimal types and implementation**

```ts
// src/components/workshop/tree-core/types.ts
export type TreeNodeId = string;

export interface TreeAdapter<TNode> {
  getId(node: TNode): TreeNodeId;
  getLabel(node: TNode): string;
  getChildren(node: TNode): readonly TNode[];
  isSelectable?(node: TNode): boolean;
  isExpandable?(node: TNode): boolean;
}

export interface VisibleTreeRow<TNode> {
  id: TreeNodeId;
  node: TNode;
  depth: number;
  parentId: TreeNodeId | null;
  indexWithinParent: number;
  siblingCount: number;
  hasChildren: boolean;
  isExpanded: boolean;
}
```

```ts
// src/components/workshop/tree-core/flatten-visible-tree.ts
import type { TreeAdapter, VisibleTreeRow } from "./types";

export function flattenVisibleTree<TNode>(
  nodes: readonly TNode[],
  adapter: TreeAdapter<TNode>,
  expandedIds: ReadonlySet<string>,
): VisibleTreeRow<TNode>[] {
  const rows: VisibleTreeRow<TNode>[] = [];

  function visit(nodeList: readonly TNode[], depth: number, parentId: string | null) {
    nodeList.forEach((node, index) => {
      const id = adapter.getId(node);
      const children = adapter.getChildren(node);
      const hasChildren = children.length > 0;
      const isExpanded = expandedIds.has(id);

      rows.push({
        id,
        node,
        depth,
        parentId,
        indexWithinParent: index,
        siblingCount: nodeList.length,
        hasChildren,
        isExpanded,
      });

      if (hasChildren && isExpanded) visit(children, depth + 1, id);
    });
  }

  visit(nodes, 0, null);
  return rows;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `bun test tests/vitest/tree-core-visible-flatten.test.ts`

Expected: pass.

- [ ] **Step 5: Commit**

```bash
git add src/components/workshop/tree-core/types.ts src/components/workshop/tree-core/flatten-visible-tree.ts tests/vitest/tree-core-visible-flatten.test.ts
git commit -m "Build reusable visible tree flattening foundation

Constraint: Preserve existing recursive tree renderers while adding pure utilities.
Confidence: high
Scope-risk: narrow
Tested: bun test tests/vitest/tree-core-visible-flatten.test.ts"
```

## Task 2: Tree Filtering and ARIA Metadata

**Files:**

- Create: `src/components/workshop/tree-core/filter-tree.ts`
- Create: `src/components/workshop/tree-core/tree-aria.ts`
- Test: `tests/vitest/tree-core-filter.test.ts`
- Test: `tests/vitest/tree-core-aria.test.ts`

- [ ] **Step 1: Write failing filter test**

```ts
import { describe, expect, it } from "vitest";
import { filterTree } from "@/components/workshop/tree-core/filter-tree";
import type { TreeAdapter } from "@/components/workshop/tree-core/types";

type Node = { id: string; label: string; children?: Node[] };

const adapter: TreeAdapter<Node> = {
  getId: (node) => node.id,
  getLabel: (node) => node.label,
  getChildren: (node) => node.children ?? [],
};

describe("filterTree", () => {
  it("keeps matching descendants with their ancestor path", () => {
    const nodes: Node[] = [{ id: "root", label: "Root", children: [{ id: "kitchen", label: "Kitchen" }] }];

    expect(filterTree(nodes, adapter, "kit")).toEqual([
      { id: "root", label: "Root", children: [{ id: "kitchen", label: "Kitchen", children: [] }] },
    ]);
  });
});
```

- [ ] **Step 2: Write failing ARIA test**

```ts
import { describe, expect, it } from "vitest";
import { getVisibleTreeRowAria } from "@/components/workshop/tree-core/tree-aria";

describe("getVisibleTreeRowAria", () => {
  it("returns explicit metadata for dynamic or virtual tree rows", () => {
    expect(getVisibleTreeRowAria({ depth: 2, indexWithinParent: 1, siblingCount: 4, hasChildren: true, isExpanded: false })).toEqual({
      "aria-level": 3,
      "aria-posinset": 2,
      "aria-setsize": 4,
      "aria-expanded": false,
    });
  });
});
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `bun test tests/vitest/tree-core-filter.test.ts tests/vitest/tree-core-aria.test.ts`

Expected: fail because modules do not exist.

- [ ] **Step 4: Implement minimal utilities**

```ts
// src/components/workshop/tree-core/filter-tree.ts
import type { TreeAdapter } from "./types";

export function filterTree<TNode>(
  nodes: readonly TNode[],
  adapter: TreeAdapter<TNode>,
  query: string,
): TNode[] {
  const normalizedQuery = query.toLowerCase().trim();
  if (!normalizedQuery) return nodes.slice();

  function cloneWithChildren(node: TNode, children: TNode[]): TNode {
    return { ...(node as object), children } as TNode;
  }

  function visit(node: TNode): TNode | null {
    const children = adapter.getChildren(node).map(visit).filter((child): child is TNode => Boolean(child));
    const matches = adapter.getLabel(node).toLowerCase().includes(normalizedQuery);
    if (!matches && children.length === 0) return null;
    return cloneWithChildren(node, children);
  }

  return nodes.map(visit).filter((node): node is TNode => Boolean(node));
}
```

```ts
// src/components/workshop/tree-core/tree-aria.ts
export function getVisibleTreeRowAria(row: {
  depth: number;
  indexWithinParent: number;
  siblingCount: number;
  hasChildren: boolean;
  isExpanded: boolean;
}) {
  return {
    "aria-level": row.depth + 1,
    "aria-posinset": row.indexWithinParent + 1,
    "aria-setsize": row.siblingCount,
    ...(row.hasChildren ? { "aria-expanded": row.isExpanded } : {}),
  };
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `bun test tests/vitest/tree-core-filter.test.ts tests/vitest/tree-core-aria.test.ts`

Expected: pass.

## Task 3: Share Tree Utility and Renderer Unification

**Files:**

- Create: `src/components/share/share-tree/share-tree-format.ts`
- Create: `src/components/share/share-tree/share-tree-search.ts`
- Create: `src/components/share/share-tree/use-share-tree-expansion.ts`
- Create: `src/components/share/share-tree/ShareTreeNodeRow.tsx`
- Create: `src/components/share/share-tree/ShareTreeSurface.tsx`
- Modify: `src/components/share/ShareEstimateTreePanel.tsx`
- Modify: `src/components/share/ShareEstimateTreeView.tsx`
- Test: `tests/vitest/share-tree-search.test.ts`
- Test: `tests/vitest/share-tree-renderer.test.tsx`

- [ ] **Step 1: Write failing search test**

```ts
import { describe, expect, it } from "vitest";
import { filterShareTreeNodes } from "@/components/share/share-tree/share-tree-search";
import type { ShareTreeNode } from "@/lib/share/reconstruct-share-tree";

describe("filterShareTreeNodes", () => {
  it("matches row descriptions and keeps ancestor nodes", () => {
    const nodes = [{
      id: "group",
      label: "Group",
      kind: "group",
      total: 120,
      rowCount: 1,
      children: [{
        id: "area",
        label: "Area",
        kind: "area",
        total: 120,
        rowCount: 1,
        rows: [{ id: "row", description: "Quartz slab", quantity: 1, unit: "pc", rowTotal: 120 }],
        children: [],
      }],
    }] satisfies ShareTreeNode[];

    expect(filterShareTreeNodes(nodes, "quartz")[0]?.children[0]?.rows?.map((row) => row.description)).toEqual(["Quartz slab"]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test tests/vitest/share-tree-search.test.ts`

Expected: fail because module does not exist.

- [ ] **Step 3: Implement shared search and formatter**

```ts
// src/components/share/share-tree/share-tree-format.ts
export function formatShareTreeMoney(value: number, currencyCode: string) {
  return `${currencyCode} ${new Intl.NumberFormat("en-PH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)}`;
}
```

```ts
// src/components/share/share-tree/share-tree-search.ts
import type { ShareTreeNode } from "@/lib/share/reconstruct-share-tree";

export function collectShareTreeNodeIds(nodes: readonly ShareTreeNode[]) {
  const ids: string[] = [];
  function visit(nodeList: readonly ShareTreeNode[]) {
    for (const node of nodeList) {
      ids.push(node.id);
      visit(node.children);
    }
  }
  visit(nodes);
  return ids;
}

export function filterShareTreeNodes(nodes: readonly ShareTreeNode[], query: string): ShareTreeNode[] {
  const normalizedQuery = query.toLowerCase().trim();
  if (!normalizedQuery) return nodes.slice();

  function visit(node: ShareTreeNode): ShareTreeNode | null {
    const children = node.children.map(visit).filter((child): child is ShareTreeNode => Boolean(child));
    const rows = node.rows?.filter((row) => row.description.toLowerCase().includes(normalizedQuery)) ?? [];
    const matches = node.label.toLowerCase().includes(normalizedQuery);
    if (!matches && children.length === 0 && rows.length === 0) return null;
    return {
      ...node,
      children,
      rows: rows.length > 0 ? rows : node.rows,
    };
  }

  return nodes.map(visit).filter((node): node is ShareTreeNode => Boolean(node));
}
```

- [ ] **Step 4: Run search test to verify it passes**

Run: `bun test tests/vitest/share-tree-search.test.ts`

Expected: pass.

- [ ] **Step 5: Extract row renderer and hook**

Move shared row rendering from `ShareEstimateTreePanel.tsx:112-297` and `ShareEstimateTreeView.tsx:61-231` into `ShareTreeNodeRow.tsx`. Move expansion logic from `ShareEstimateTreePanel.tsx:321-359` and `ShareEstimateTreeView.tsx:246-274` into `use-share-tree-expansion.ts`.

- [ ] **Step 6: Run renderer tests**

Run: `bun test tests/vitest/share-tree-renderer.test.tsx tests/vitest/share/reconstruct-share-tree.test.ts`

Expected: pass.

## Task 4: Component Library Tree Index

**Files:**

- Create: `src/components/workshop/component-library/tree/library-tree-index.ts`
- Modify: `src/components/workshop/component-library/tree/buildLibraryTree.ts`
- Test: `tests/vitest/component-library-tree-index.test.ts`

- [ ] **Step 1: Write failing index test**

```ts
import { describe, expect, it } from "vitest";
import { buildLibraryTreeItemIndex } from "@/components/workshop/component-library/tree/library-tree-index";

describe("buildLibraryTreeItemIndex", () => {
  it("collects descendants without rebuilding the visual tree", () => {
    const item = { id: "item-1", material: "Tile", name: "Tile", category: "Flooring" };
    const tree = [{ id: "flooring", label: "Flooring", kind: "category", children: [{ id: "item-1", label: "Tile", kind: "component", item }] }];

    const index = buildLibraryTreeItemIndex(tree);

    expect(index.getItemsForNode("flooring").map((entry) => entry.id)).toEqual(["item-1"]);
    expect(index.getItemsForNode("item-1").map((entry) => entry.id)).toEqual(["item-1"]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test tests/vitest/component-library-tree-index.test.ts`

Expected: fail because module does not exist.

- [ ] **Step 3: Implement index and wire `getLibraryItemsForTreeNode`**

Build index once from `buildLibraryTreeWithComponentRows(...)`, then replace the `findNodeById` plus `collectItemsFromNode` path at `buildLibraryTree.ts:441-443` with index lookup.

- [ ] **Step 4: Run tests**

Run: `bun test tests/vitest/component-library-tree-index.test.ts tests/vitest/component-library-ui.test.tsx`

Expected: pass.

## Task 5: Library Folder Reorder Index

**Files:**

- Modify: `src/lib/component-library/library-folder-reorder.ts`
- Test: `tests/vitest/library-folder-reorder.test.ts`

- [ ] **Step 1: Add failing regression test**

Add a test proving a folder cannot be dropped into a deep descendant and that the result is computed with one index-backed operation.

Run: `bun test tests/vitest/library-folder-reorder.test.ts`

Expected: fail before index helper exists if the test imports the new helper.

- [ ] **Step 2: Implement `buildLibraryFolderIndex`**

Replace repeated sibling/child scans at `library-folder-reorder.ts:140-176`, `178-217`, and `250-337` with one index containing:

- `byId`
- `childrenByParentId`
- `locationById`
- `descendantIdsById`

- [ ] **Step 3: Run tests**

Run: `bun test tests/vitest/library-folder-reorder.test.ts tests/vitest/library-folder-tree-selection.test.tsx`

Expected: pass.

## Task 6: Estimate Tree Model Hook

**Files:**

- Create: `src/components/workshop/estimate-tree/use-estimate-tree-model.ts`
- Modify: `src/components/workshop/EstimateSheetTree.tsx`
- Test: `tests/vitest/estimate-tree-model.test.ts`
- Existing tests: `tests/vitest/estimate-sheet-tree-rct-dom.test.tsx`, `tests/vitest/estimate-sheet-tree-dnd.test.tsx`

- [ ] **Step 1: Write failing model test**

```ts
import { describe, expect, it } from "vitest";
import { buildEstimateTreeModel } from "@/components/workshop/estimate-tree/use-estimate-tree-model";

describe("buildEstimateTreeModel", () => {
  it("keeps root, folder ids, and child order stable", () => {
    const nodes = [{ id: "group", name: "Group", kind: "group", children: [{ id: "area", name: "Area", kind: "area" }] }];

    const model = buildEstimateTreeModel(nodes);

    expect(model.items["estimate-tree-root"].children).toEqual(["group"]);
    expect(model.items.group.children).toEqual(["area"]);
    expect([...model.folderIds]).toContain("group");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test tests/vitest/estimate-tree-model.test.ts`

Expected: fail because exported model builder does not exist.

- [ ] **Step 3: Extract model builder from `EstimateSheetTree.tsx:162` and selection builder from `EstimateSheetTree.tsx:193`**

Keep the RCT render path unchanged.

- [ ] **Step 4: Run tests**

Run: `bun test tests/vitest/estimate-tree-model.test.ts tests/vitest/estimate-sheet-tree-rct-dom.test.tsx tests/vitest/estimate-sheet-tree-dnd.test.tsx`

Expected: pass.

## Task 7: Activity Scope Flat Tree Extraction

**Files:**

- Create: `src/components/workshop/estimate-sheet/activity/ActivityScopeTree.tsx`
- Modify: `src/components/workshop/EstimateSheetContent.tsx`
- Test: `tests/vitest/estimate-sheet-activity-scope-tree.test.tsx`

- [ ] **Step 1: Write failing extraction test**

Render a small activity scope tree with one group, one area, and one row. Assert that:

- Group and row are visible.
- Collapse hides descendants.
- Search keeps matched rows and their ancestors.
- Rows use `data-workshop-tree-row`.

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test tests/vitest/estimate-sheet-activity-scope-tree.test.tsx`

Expected: fail because extracted module does not exist.

- [ ] **Step 3: Move `buildActivityScopeTreeItems` from `EstimateSheetContent.tsx:2725`, `ActivityScopeTree` from `EstimateSheetContent.tsx:2838`, and supporting types into the activity module**

Keep `ActivityHistoryModal` wired to the extracted module.

- [ ] **Step 4: Run tests**

Run: `bun test tests/vitest/estimate-sheet-activity-scope-tree.test.tsx tests/vitest/estimate-sheet-version-control-ui.test.tsx`

Expected: pass.

## Task 8: Add Component Draft Extraction

**Files:**

- Create: `src/components/workshop/component-library-manager/add-component/add-component-draft.ts`
- Modify: `src/components/workshop/component-library-manager/AddComponentModal.tsx`
- Test: `tests/vitest/add-component-draft.test.ts`

- [ ] **Step 1: Write failing draft factory test**

```ts
import { describe, expect, it } from "vitest";
import { makeComponentDraft, makeVariantDraft } from "@/components/workshop/component-library-manager/add-component/add-component-draft";

describe("add component draft factories", () => {
  it("creates one default variant with one current cost entry", () => {
    const variant = makeVariantDraft(1);

    expect(variant.label).toBe("Variant 1");
    expect(variant.isDefault).toBe(true);
    expect(variant.costEntries).toHaveLength(1);
    expect(variant.costEntries[0].isCurrent).toBe(true);
  });

  it("creates an empty component draft with lifecycle metadata", () => {
    const draft = makeComponentDraft({ folders: [], selectedFolderId: null, suppliers: [], brands: [] });

    expect(draft.name).toBe("");
    expect(draft.lifecycleState).toBe("draft");
    expect(draft.variants).toHaveLength(1);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test tests/vitest/add-component-draft.test.ts`

Expected: fail because extracted factories do not exist.

- [ ] **Step 3: Move pure factories from `AddComponentModal.tsx:378-425` and draft initialization from `AddComponentModal.tsx:464-520` into the new file**

Keep UI behavior unchanged.

- [ ] **Step 4: Run tests**

Run: `bun test tests/vitest/add-component-draft.test.ts tests/vitest/component-library-manager-ui.test.tsx tests/vitest/workshop-library-consolidation-ui.test.tsx`

Expected: pass.

## Final Verification Commands

Run after all tasks:

```bash
bun run type-check
bun run lint:design-system
bun test tests/vitest/tree-core-visible-flatten.test.ts
bun test tests/vitest/tree-core-filter.test.ts
bun test tests/vitest/tree-core-aria.test.ts
bun test tests/vitest/share-tree-search.test.ts
bun test tests/vitest/share-tree-renderer.test.tsx
bun test tests/vitest/component-library-tree-index.test.ts
bun test tests/vitest/library-folder-reorder.test.ts
bun test tests/vitest/library-folder-tree-selection.test.tsx
bun test tests/vitest/estimate-tree-model.test.ts
bun test tests/vitest/estimate-sheet-tree-rct-dom.test.tsx
bun test tests/vitest/estimate-sheet-tree-dnd.test.tsx
bun test tests/vitest/estimate-sheet-activity-scope-tree.test.tsx
bun test tests/vitest/add-component-draft.test.ts
bun test tests/vitest/route-transition-peak-load-profile.test.tsx
git diff --check
```

Expected:

- All commands pass, or route/profile/browser fixture gaps are explicitly recorded.
- No app source file outside the listed scope changes.
- `@tanstack/react-virtual` is not added in this implementation sequence.
