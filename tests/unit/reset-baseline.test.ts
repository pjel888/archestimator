import { describe, expect, test } from "bun:test";

const forbiddenPrototypeReferences = [
  "createMutableLocalRepository",
  "WorkshopShell",
  "/component-library",
  "/proposals",
  "@glideapps/glide-data-grid",
  "@dnd-kit/core",
];

describe("workshop sidebar baseline", () => {
  test("workshop page keeps only the approved sidebar shell and blank canvas", async () => {
    const source = await Bun.file("src/app/workshop/page.tsx").text();
    expect(source).toContain("MainSidebar");
    expect(source).toContain("Workshop canvas");

    for (const forbidden of forbiddenPrototypeReferences) {
      expect(source).not.toContain(forbidden);
    }
  });

  test("main sidebar preserves SlateCamp sidebar measurements with overlay expansion", async () => {
    const source = await Bun.file("src/components/sidebar/sidebar-types.ts").text();
    const sidebar = await Bun.file("src/components/sidebar/MainSidebar.tsx").text();

    expect(source).toContain("SIDEBAR_WIDTH_EXPANDED = 288");
    expect(source).toContain("SIDEBAR_WIDTH_COLLAPSED = SIDEBAR_PADDING * 2 + SIDEBAR_ICON_SLOT");
    expect(sidebar).toContain("fixed left-0 top-0 z-[100]");
    expect(sidebar).toContain("href: \"/workshop/projects\"");
    expect(sidebar).toContain("href: \"/workshop/components\"");
    expect(sidebar).not.toContain("Reports");
    expect(sidebar).not.toContain("Cost Library");
    expect(sidebar).not.toContain("grid-cols-[var(--sidebar-grid-columns)]");
    expect(sidebar).toContain("clipPath");
  });
});
