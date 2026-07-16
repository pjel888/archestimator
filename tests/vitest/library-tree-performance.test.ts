import { describe, expect, it, vi } from "vitest";

import { filterTree } from "@/components/workshop/component-library/tree/helpers";
import type { LibraryTreeNode } from "@/components/workshop/component-library/tree/types";

function makeResidentLibraryTree(): LibraryTreeNode[] {
  return Array.from({ length: 20 }, (_, folderIndex) => ({
    id: `folder-${folderIndex}`,
    label: `Folder ${folderIndex}`,
    kind: "folder",
    children: Array.from({ length: 50 }, (_, componentIndex) => {
      const itemIndex = folderIndex * 50 + componentIndex;
      return {
        id: `component-${itemIndex}`,
        label: itemIndex === 777 ? "Needle component 777" : `Resident component ${itemIndex}`,
        meta: `Supplier ${itemIndex % 25}`,
        kind: "component",
      };
    }),
  }));
}

describe("library tree performance", () => {
  it("filters 1,000 resident components locally within budget", () => {
    const tree = makeResidentLibraryTree();
    const requestSpy = vi.spyOn(globalThis, "fetch");

    try {
      filterTree(tree, "warmup-miss");
      const startedAt = performance.now();
      const filtered = filterTree(tree, "Needle component 777");
      const elapsedMs = performance.now() - startedAt;

      expect(filtered).toHaveLength(1);
      expect(filtered[0]?.children?.map((node) => node.id)).toEqual(["component-777"]);
      expect(requestSpy).not.toHaveBeenCalled();
      expect(elapsedMs).toBeLessThan(300);
      console.log("library-tree-perf-s08", JSON.stringify({ elapsedMs, residentItemCount: 1_000, requestCount: requestSpy.mock.calls.length }));
    } finally {
      requestSpy.mockRestore();
    }
  });
});
