import { describe, expect, it } from "vitest";
import { groupGap, nodeShellClasses } from "@/components/workshop/estimate-sheet/rows/node-visuals";

// Req 2: the inter-node vertical rhythm must actually fire (it used to collapse
// to mt-0 for every nested node because a dead flag was never threaded through
// the recursion) and be token-aligned to the DESIGN.md spacing scale
// (sm:8 / md:12 / lg:20), decreasing with depth so nesting reads as a hierarchy.
describe("groupGap vertical rhythm (Req 2)", () => {
  it("gives the root node no top margin", () => {
    expect(groupGap(0)).toBe("mt-0");
  });

  it("separates depth-1 siblings with the lg token (20px)", () => {
    expect(groupGap(1)).toBe("mt-5");
  });

  it("tightens as depth increases (token-aligned, decreasing rhythm)", () => {
    expect(groupGap(2)).toBe("mt-3"); // md = 12px
    expect(groupGap(3)).toBe("mt-2"); // sm = 8px
    expect(groupGap(4)).toBe("mt-2");
  });
});

describe("estimate sheet node shell styling", () => {
  it("keeps root and child nodes on the same surface tone", () => {
    expect(nodeShellClasses(0)).toContain("bg-surfaceMuted/20");
    expect(nodeShellClasses(1)).toBe("bg-surfaceMuted/20");
    expect(nodeShellClasses(2)).toBe("bg-surfaceMuted/20");
  });

  it("limits the framed card treatment to the root node", () => {
    expect(nodeShellClasses(0)).toContain("border border-hairline");
    expect(nodeShellClasses(1)).not.toContain("border");
  });
});
