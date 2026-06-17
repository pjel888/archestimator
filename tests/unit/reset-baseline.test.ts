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
  test("workshop page keeps the approved sidebar shell and sparse greeting homebase", async () => {
    const source = await Bun.file("src/app/workshop/page.tsx").text();
    const loading = await Bun.file("src/app/workshop/loading.tsx").text();
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
    expect(source).toContain("requireCurrentUserContext");
    expect(source).toContain("userDisplayName={currentUser.displayName}");
    expect(source).not.toContain("Promise.all");
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
    expect(homebase).toContain('className="flex h-full min-h-0 w-full flex-col gap-2 bg-white p-2"');
    expect(homebase).toContain('aria-label="Workshop greeting"');
    expect(homebase).toContain("min-h-[180px] w-full flex-1");
    expect(homebase).toContain("WorkshopGreeting");
    expect(homebase).toContain("getWorkshopGreetingTone");
    expect(homebase).toContain("formatWorkshopGreetingName");
    expect(homebase).toContain("Good morning");
    expect(homebase).toContain("Good afternoon");
    expect(homebase).toContain("Good evening");
    expect(homebase).toContain("Morning");
    expect(homebase).toContain("Night");
    expect(homebase).toContain('icon: "sun"');
    expect(homebase).toContain('icon: "moon"');
    expect(homebase).toContain("w-[280px]");
    expect(homebase).toContain("grid-cols-[36px_minmax(0,1fr)]");
    expect(homebase).toContain("flex size-9 items-center justify-center text-secondary");
    expect(homebase).not.toContain("min-w-[96px]");
    expect(homebase).not.toContain("bg-surfaceMuted/50");
    expect(homebase).toContain("text-[12px]");
    expect(homebase).toContain("text-[11px]");
    expect(homebase).not.toContain("Workshop bento");
    expect(homebase).not.toContain("destinations");
    expect(homebase).not.toContain("DestinationTile");
    expect(homebase).not.toContain("BentoPanel");
    expect(homebase).not.toContain("FavoritesPanel");
    expect(homebase).not.toContain("WorkshopTreeTabs");
    expect(homebase).not.toContain("favoriteTabs");
    expect(homebase).not.toContain("activeFavoriteTab");
    expect(homebase).not.toContain('import Image from "next/image"');
    expect(homebase).not.toContain('imageSrc: "/Cards/Projects-Card.jpg"');
    expect(homebase).not.toContain('imageSrc: "/Cards/Components-Card.jpg"');
    expect(homebase).not.toContain('imageSrc: "/Cards/Templates-Card.jpg"');
    expect(homebase).not.toContain("aspect-square w-full");
    expect(homebase).not.toContain("Open Projects");
    expect(homebase).not.toContain("Open Components");
    expect(homebase).not.toContain("Open Templates");
    expect(homebase).not.toContain("Estimates");
    expect(homebase).not.toContain("Favorite projects");
    expect(homebase).not.toContain("Favorite estimates");
    expect(homebase).not.toContain("Project shortcuts");
    expect(homebase).not.toContain("Estimate shortcuts");
    expect(homebase).toContain("useToggleProjectFavorite");
    expect(homebase).not.toContain("setEstimateFavorite");
    expect(homebase).not.toContain('title="First move"');
    expect(homebase).not.toContain('label="Recommended"');
    expect(homebase).not.toContain("ButtonLink");
    expect(homebase).not.toContain("Gauge");
    expect(homebase).not.toContain("max-w-[980px]");
    expect(homebase).not.toContain("Recent Projects");
    expect(homebase).not.toContain("Sample Projects");
    expect(homebase).not.toContain("View all");
    expect(loading).toContain("Workshop greeting skeleton");
    expect(loading).not.toContain("Workshop bento skeleton");
    expect(loading).not.toContain("aspect-square");
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
    expect(sidebar).toContain("data-sidebar-primary-nav-group");
    expect(sidebar).toContain('data-sidebar-primary-nav-divider="top"');
    expect(sidebar).toContain('data-sidebar-primary-nav-divider="bottom"');
    expect(sidebar).toContain("flex flex-col gap-2 py-2");
    expect(sidebar).toContain("w-px bg-dividerSibling");
    expect(sidebar).toContain("href: \"/workshop/projects\"");
    expect(sidebar).toContain("href: \"/workshop/library\"");
    // 2026-06-11 Library unification: the rail shows a single Library entry
    // (Components + Templates live inside /workshop/library).
    expect(sidebar).toContain("label: \"Library\"");
    expect(sidebar).not.toContain("href: \"/workshop/templates\"");
    expect(sidebar).not.toContain("label: \"Templates\"");
    expect(sidebar).not.toContain("icon: Copy");
    expect(sidebar).not.toContain("Reports");
    expect(sidebar).not.toContain("Cost Library");
    expect(sidebar).not.toContain("grid-cols-[var(--sidebar-grid-columns)]");
    expect(sidebar).not.toContain("NavGroup");
    expect(sidebar).not.toContain("group.label");
    expect(sidebar).not.toContain('label: "Work"');
    expect(sidebar).not.toContain("border-t border-hairline");
    expect(sidebar).not.toContain("border-b border-hairline");
    expect(sidebar).not.toContain("mt-auto");
    expect(sidebarHeader).not.toContain("absolute bottom-0 border-b border-hairline");
    expect(sidebarNavItemRow).toContain("w-full grid-cols-[48px_minmax(0,1fr)_auto]");
    expect(sidebarNavItemRow).toContain("before:bg-orange-50");
    expect(sidebarNavItemRow).toContain("text-orange-700");
    expect(sidebarNavItemRow).toContain("rgb(194,65,12)");
    expect(sidebarNavItemRow).toContain('weight="regular"');
    expect(sidebar).toContain('<Star size={15} weight="regular"');
    expect(sidebar).toContain('<Folder size={13} weight="regular"');
    expect(sidebar).toContain('<FileText size={11} weight="regular"');
    expect(sidebarHeader).toContain('<SidebarSimple size={16} weight="regular"');
    expect(sidebarNavItemRow).not.toContain('expanded ? "w-full pr-2"');
    expect(sidebar).toContain("clipPath");
  });
});
