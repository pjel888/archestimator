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
  ["rightDock", "libraryRail"],
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

  it("defines local Library glass slots without changing shared estimate slots", () => {
    expect(librarySurfaceClass("glass", "contentTile")).toBe(
      "rounded-xs border border-white/60 bg-white/80 shadow-[0_10px_24px_rgba(15,23,42,0.08)]",
    );
    expect(librarySurfaceClass("glass", "denseTable")).toBe("bg-transparent");
    expect(librarySurfaceClass("glass", "segmentedControl")).toBe(
      "rounded-xs border border-white/55 bg-white/55 shadow-[0_8px_20px_rgba(15,23,42,0.08)]",
    );
    expect(librarySurfaceClass("glass", "popup")).toBe(
      "rounded-xs border border-white/60 bg-white/90 shadow-[0_18px_40px_rgba(15,23,42,0.14)] backdrop-blur",
    );
    expect(librarySurfaceClass("glass", "emptyState")).toBe("rounded-xs border border-white/55 bg-white/70");
    expect(librarySurfaceClass("glass", "skeleton")).toBe("rounded-xs border border-white/40 bg-white/50");
  });

  it("keeps paper fallback slots opaque and hairlined", () => {
    for (const slot of ["contentTile", "segmentedControl", "popup", "emptyState", "skeleton"] satisfies LibrarySurfaceSlot[]) {
      expect(librarySurfaceClass("paper", slot)).toBe("rounded-xs border border-hairline bg-white");
    }
    expect(librarySurfaceClass("paper", "rightDock")).toBe("border-l border-hairline bg-white");
    expect(librarySurfaceClass("paper", "denseTable")).toBe("bg-white");
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
