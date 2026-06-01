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
  test("workshop page keeps the approved sidebar shell and bento favorites homebase", async () => {
    const source = await Bun.file("src/app/workshop/page.tsx").text();
    const homebase = await Bun.file("src/components/workshop/WorkshopHomebaseClient.tsx").text();
    const shell = await Bun.file("src/components/workshop/WorkshopPageShell.tsx").text();
    expect(source).toContain("WorkshopPageShell");
    expect(source).toContain("WorkshopHomebaseClient");
    expect(source).toContain("getWorkshopHomebaseData");
    expect(source).not.toContain("listCurrentWorkspaceProjects");
    expect(source).not.toContain("liveProjects");
    expect(source).toContain('redirect("/workshop/pending-invite")');
    expect(source).not.toContain("resolveWorkshopPendingInvite");
    expect(source).not.toContain("clearPendingInviteCookie");
    expect(source).toContain("archestimator_pending_invite");
    expect(source).toContain("removedProjectBanner={removedProjectBanner}");
    expect(homebase).not.toContain("WorkshopCollectionLayout");
    expect(homebase).not.toContain("Search Workshop");
    expect(homebase).not.toContain("Workshop tools");
    expect(homebase).not.toContain("onFilter");
    expect(homebase).not.toContain("onGroup");
    expect(homebase).not.toContain("onExpandAll");
    expect(homebase).not.toContain("onCollapseAll");
    expect(homebase).not.toContain("filterOptions");
    expect(homebase).not.toContain("searchTerms");
    expect(homebase).toContain('className="flex h-full min-h-0 flex-col gap-2 bg-white p-2"');
    expect(homebase).toContain("grid min-h-0 flex-1 grid-cols-12");
    expect(homebase).toContain("auto-rows-min content-start gap-2 overflow-y-auto");
    expect(homebase).toContain("xl:grid-rows-[auto_minmax(0,1fr)]");
    expect(homebase).toContain("xl:content-stretch xl:overflow-hidden");
    expect(homebase).toContain('showHeader={false} surface="flush"');
    expect(homebase).toContain('surface === "flush" ? "border-0 bg-transparent p-0"');
    expect(homebase).toContain("grid content-start items-start gap-2 md:grid-cols-3");
    expect(homebase).toContain("aspect-square w-full");
    expect(homebase).toContain('import Image from "next/image"');
    expect(homebase).toContain('imageSrc: "/Cards/Projects-Card.jpg"');
    expect(homebase).toContain('imageSrc: "/Cards/Components-Card.jpg"');
    expect(homebase).toContain('imageSrc: "/Cards/Templates-Card.jpg"');
    expect(homebase).toContain("opacity-[0.17] mix-blend-soft-light");
    expect(homebase).toContain("imageClassName");
    expect(homebase).toContain("#c5a031_0%");
    expect(homebase).toContain("#bb702f_45%");
    expect(homebase).toContain("rgba(213,186,87,0.70)");
    expect(homebase).toContain("rgba(204,106,51,0.70)");
    expect(homebase).not.toContain("#f6b800_0%");
    expect(homebase).not.toContain("#ea6c00_45%");
    expect(homebase).toContain("#6d8f81_0%");
    expect(homebase).toContain("#106c57_42%");
    expect(homebase).toContain("ellipse_at_8%_52%");
    expect(homebase).toContain("rgba(218,214,187,0.30)");
    expect(homebase).toContain("rgba(130,153,88,0.22)");
    expect(homebase).not.toContain("rgba(244,235,211,0.78)");
    expect(homebase).not.toContain("rgba(155,178,94,0.54)");
    expect(homebase).toContain("#456f9a_0%");
    expect(homebase).not.toContain("#4f6753");
    expect(homebase).not.toContain("#7467be");
    expect(homebase).toContain("radial-gradient(circle_at_1px_1px");
    expect(homebase).toContain("bg-[length:4px_4px]");
    expect(homebase).toContain("bg-white/[0.10] text-white/88 ring-1 ring-white/16 backdrop-blur-[1px]");
    expect(homebase).toContain("absolute inset-x-3 bottom-3");
    expect(homebase).toContain("h-12 max-w-[34ch]");
    expect(homebase).toContain("justify-end gap-1 text-right");
    expect(homebase).not.toContain("bg-white/42");
    expect(homebase).not.toContain("destination.stage");
    expect(homebase).toContain("WorkshopTreeTabs");
    expect(homebase).toContain("favoriteTabs");
    expect(homebase).toContain("activeFavoriteTab");
    expect(homebase).toContain("ariaLabel=\"Favorite views\"");
    expect(homebase).toContain("FavoritesPanel");
    expect(homebase).toContain("xl:col-start-9 xl:row-span-2 xl:row-start-1");
    expect(homebase).toContain("Favorites");
    expect(homebase).not.toContain("Starred");
    expect(homebase).toContain("Projects");
    expect(homebase).toContain("Estimate Sheets");
    expect(homebase).toContain("Favorite projects");
    expect(homebase).toContain("Favorite estimate sheets");
    expect(homebase).not.toContain('title="Favorite projects"');
    expect(homebase).not.toContain('title="Favorite estimate sheets"');
    expect(homebase).not.toContain("Project shortcuts");
    expect(homebase).not.toContain("Estimate sheet shortcuts");
    expect(homebase).toContain("setProjectFavorite");
    expect(homebase).toContain("setEstimateFavorite");
    expect(homebase).toContain("Open Projects");
    expect(homebase).toContain("Open Components");
    expect(homebase).toContain("Open Templates");
    expect(homebase).not.toContain('title="First move"');
    expect(homebase).not.toContain('label="Recommended"');
    expect(homebase).not.toContain("ButtonLink");
    expect(homebase).not.toContain("Gauge");
    expect(homebase).toContain("Blueprint");
    expect(homebase).toContain("icon: Blueprint");
    expect(homebase).not.toContain("icon: Copy");
    expect(homebase).not.toContain("max-w-[980px]");
    expect(homebase).not.toContain("Recent Projects");
    expect(homebase).not.toContain("Sample Projects");
    expect(homebase).not.toContain("View all");
    expect(source).not.toContain("Workshop empty canvas");
    expect(shell).toContain("MainSidebar");
    expect(shell).toContain("aria-label={`${title} canvas`}");
    expect(shell).not.toContain("footer?:");
    expect(shell).not.toContain("Local sample workspace");
    expect(shell).not.toContain("ml-auto flex shrink-0 items-center gap-2");

    for (const forbidden of forbiddenPrototypeReferences) {
      expect(source).not.toContain(forbidden);
    }
  });

  test("main sidebar preserves SlateCamp sidebar measurements with overlay expansion", async () => {
    const source = await Bun.file("src/components/sidebar/sidebar-types.ts").text();
    const sidebar = await Bun.file("src/components/sidebar/MainSidebar.tsx").text();
    const sidebarHeader = await Bun.file("src/components/sidebar/SidebarHeader.tsx").text();
    const sidebarNavItemRow = await Bun.file("src/components/sidebar/SidebarNavItemRow.tsx").text();

    expect(source).toContain("SIDEBAR_WIDTH_EXPANDED = 288");
    expect(source).toContain("SIDEBAR_WIDTH_COLLAPSED = SIDEBAR_PADDING * 2 + SIDEBAR_ICON_SLOT");
    expect(sidebar).toContain("fixed left-0 top-0 z-[100]");
    expect(sidebar).toContain("sidebarNavItems");
    expect(sidebar).toContain("flex flex-col gap-2 pb-2 pt-2");
    expect(sidebar).toContain("href: \"/workshop/projects\"");
    expect(sidebar).toContain("href: \"/workshop/library\"");
    expect(sidebar).toContain("label: \"Components\"");
    expect(sidebar).toContain("href: \"/workshop/templates\"");
    expect(sidebar).toContain("label: \"Templates\"");
    expect(sidebar).toContain("Blueprint");
    expect(sidebar).toContain("icon: Blueprint");
    expect(sidebar).not.toContain("icon: Copy");
    expect(sidebar).not.toContain("Reports");
    expect(sidebar).not.toContain("Cost Library");
    expect(sidebar).not.toContain("grid-cols-[var(--sidebar-grid-columns)]");
    expect(sidebar).not.toContain("NavGroup");
    expect(sidebar).not.toContain("group.label");
    expect(sidebar).not.toContain('label: "Work"');
    expect(sidebar).not.toContain('label: "Library"');
    expect(sidebar).not.toContain("border-t border-hairline");
    expect(sidebar).not.toContain("border-b border-hairline");
    expect(sidebar).not.toContain("mt-auto");
    expect(sidebarHeader).not.toContain("absolute bottom-0 border-b border-hairline");
    expect(sidebarNavItemRow).toContain("w-full grid-cols-[48px_minmax(0,1fr)_auto]");
    expect(sidebarNavItemRow).not.toContain('expanded ? "w-full pr-2"');
    expect(sidebar).toContain("clipPath");
  });
});
