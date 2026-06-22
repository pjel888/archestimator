import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { estimateSurfaceClass } from "@/components/workshop/estimate-surface-variant";
import {
  librarySurfaceClass,
  type LibrarySurfaceSlot,
} from "@/components/workshop/library/library-surface-variant";

const mirrorSlots: Array<[LibrarySurfaceSlot, Parameters<typeof estimateSurfaceClass>[1]]> = [
  ["root", "root"],
  ["treeRail", "treeRail"],
  ["centerColumn", "centerColumn"],
  ["sheetHeader", "sheetHeader"],
  ["railPanelHeader", "railPanelHeader"],
  ["toolbar", "chromeToolbar"],
];

describe("library surface variant classes", () => {
  it("keeps glass mirror slots lockstep with estimate surface classes", () => {
    for (const [librarySlot, estimateSlot] of mirrorSlots) {
      expect(librarySurfaceClass("glass", librarySlot)).toBe(estimateSurfaceClass("glass", estimateSlot));
    }
  });

  it("keeps Library-only context strip glass explicit and blur-free", () => {
    expect(librarySurfaceClass("glass", "contextStrip")).toBe(
      "estimate-glass-chrome estimate-glass-divider border-b-0 bg-transparent",
    );
    expect(librarySurfaceClass("glass", "contextStrip")).not.toMatch(/backdrop-(filter|blur)/);
  });

  it("keeps local Library surface helper free of raw backdrop-filter styles", () => {
    const source = readFileSync(
      join(process.cwd(), "src/components/workshop/library/library-surface-variant.tsx"),
      "utf8",
    );

    expect(source).not.toContain("backdrop-filter");
    expect(source).not.toContain("-webkit-backdrop-filter");
  });
});
