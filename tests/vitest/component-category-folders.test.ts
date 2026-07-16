import { describe, expect, it } from "vitest";

import { resolveComponentCategory } from "@/lib/component-library/category-folders";

const folders = [
  { id: "root", workspace_id: "workspace-1", parent_id: null, name: "Finishes" },
  { id: "middle", workspace_id: "workspace-1", parent_id: "root", name: "Flooring" },
  { id: "leaf", workspace_id: "workspace-1", parent_id: "middle", name: "Timber" },
];

describe("component category folders", () => {
  it("uses the direct folder as the leaf category and derives parent categories", () => {
    expect(resolveComponentCategory(folders, "leaf")).toEqual({
      categoryId: "leaf",
      category: "Timber",
      categoryPath: ["Finishes", "Flooring", "Timber"],
      categoryPathIds: ["root", "middle", "leaf"],
    });
  });

  it("rejects synthetic, orphaned, cyclic, duplicate, and cross-workspace paths", () => {
    const fallback = { category: "Legacy", categoryPath: ["Legacy"], categoryPathIds: [] };

    expect(resolveComponentCategory(folders, "project-components-project-1", "Legacy")).toEqual(fallback);
    expect(resolveComponentCategory([{ ...folders[2]!, parent_id: "missing" }], "leaf", "Legacy")).toEqual(fallback);
    expect(resolveComponentCategory([
      { ...folders[0]!, parent_id: "leaf" },
      folders[1]!,
      folders[2]!,
    ], "leaf", "Legacy")).toEqual(fallback);
    expect(resolveComponentCategory([folders[0]!, { ...folders[0]!, name: "Duplicate" }], "root", "Legacy")).toEqual(fallback);
    expect(resolveComponentCategory([
      folders[0]!,
      { ...folders[1]!, workspace_id: "workspace-2" },
      folders[2]!,
    ], "leaf", "Legacy")).toEqual(fallback);
  });
});
