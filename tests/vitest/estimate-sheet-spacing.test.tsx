import { describe, expect, it } from "vitest";
import { groupGap, nodeHeaderClasses } from "@/components/workshop/estimate-sheet/rows/node-visuals-utils";

// Req 2: the inter-node vertical rhythm must actually fire (it used to collapse
// to mt-0 for every nested node because a dead flag was never threaded through
// the recursion). The current sheet uses generous white space instead of
// drawn horizontal dividers, decreasing with depth so nesting still reads as a
// hierarchy.
describe("groupGap vertical rhythm (Req 2)", () => {
  it("gives the root node no top margin", () => {
    expect(groupGap(0)).toBe("mt-0");
  });

  it("separates depth-1 siblings with expanded white space", () => {
    expect(groupGap(1)).toBe("mt-[100px]");
  });

  it("tightens as depth increases while staying spacious", () => {
    expect(groupGap(2)).toBe("mt-[60px]");
    expect(groupGap(3)).toBe("mt-10");
    expect(groupGap(4)).toBe("mt-10");
  });
});

describe("estimate sheet node shell styling", () => {
  it("keeps root and child nodes on a plain white surface", () => {
    expect(nodeHeaderClasses()).toBe("");
  });

  it("removes the framed card treatment from every node depth", () => {
    expect(nodeHeaderClasses()).not.toContain("border");
  });
});
