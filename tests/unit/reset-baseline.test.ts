import { describe, expect, test } from "bun:test";

// Heavy data/dep references that must never leak into the lightweight dashboard
// page — it composes from the cached homebase repositories, not bespoke fetchers.
const forbiddenPageReferences = [
  "createMutableLocalRepository",
  "WorkshopShell",
  "@glideapps/glide-data-grid",
  "@dnd-kit/core",
  "listCurrentWorkspaceProjects",
  "liveProjects",
];

describe("workshop dashboard baseline", () => {
  test("workshop page composes the command-center dashboard from existing data-access", async () => {
    const source = await Bun.file("src/app/workshop/page.tsx").text();
    const homebase = await Bun.file("src/components/workshop/WorkshopHomebaseClient.tsx").text();
    const dashboard = await Bun.file("src/components/workshop/dashboard/WorkshopDashboard.tsx").text();

    // Page reuses the cached homebase + favorites + library repositories and keeps
    // the pending-invite bridge. No parallel data layer.
    expect(source).toContain("WorkshopRouteHeader");
    expect(source).not.toContain("WorkshopPageShell");
    expect(source).toContain("WorkshopHomebaseClient");
    expect(source).toContain("getWorkshopHomebaseData");
    expect(source).toContain("listMainSidebarFavoriteProjects");
    expect(source).toContain("getLibraryDashboardSpotlight");
    expect(source).not.toContain("getLibraryOverview");
    expect(source).toContain("requireCurrentUserContext");
    expect(source).toContain('redirect("/workshop/pending-invite")');
    expect(source).toContain("archestimator_pending_invite");
    expect(source).toContain("favoriteProjects={favoriteProjects}");
    expect(source).toContain("librarySpotlight={librarySpotlight}");
    expect(source).toContain("removedProjectBanner={removedProjectBanner}");
    for (const forbidden of forbiddenPageReferences) {
      expect(source).not.toContain(forbidden);
    }

    // The page renders the dashboard server-side and the homebase client keeps
    // the removed-favorite recovery flow (the one mutation the homepage owns).
    expect(source).toContain("WorkshopDashboard");
    expect(homebase).toContain("children: ReactNode");
    expect(homebase).toContain("useToggleProjectFavorite");
    // Search/filter/group chrome still does NOT belong on the homebase.
    expect(homebase).not.toContain("Search Workshop");
    expect(homebase).not.toContain("onExpandAll");
    expect(homebase).not.toContain("onCollapseAll");

    // The bento lays out project and estimate-sheet destination ledgers, the
    // Library hub, and a working desk led by Favorites plus recent components.
    // (LibrarySpotlight + DashboardStatStrip were removed by owner directive
    // 2026-06-18 — the dashboard no longer surfaces those panels.)
    for (const moduleName of [
      "ImageDestinationCard",
      "LibraryHubCard",
      "LibraryCardLink",
      "RecentProjectsList",
      "RecentSheetsList",
      "RecentComponentsList",
      "FavoritesTree",
    ]) {
      expect(dashboard).toContain(moduleName);
    }
    expect(dashboard).toContain("dashboard-imageband");
    expect(dashboard).toContain("dashboard-desk");
    expect(dashboard).toContain("dashboard-published-panel");
    expect(dashboard).toContain("dashboard-project-card-panel");
    expect(dashboard).toContain("dashboard-estimate-card-panel");
    expect(dashboard).toContain("dashboard-bignum-value");
    expect(dashboard).not.toContain("PublishedProjectQuickActions");
    expect(dashboard).not.toContain("RecentlyAddedComponents");
    expect(dashboard).not.toContain("DashboardEmptyState");
    expect(dashboard).not.toContain("isFirstRun");
  });

  test("main sidebar preserves archestimator sidebar measurements with overlay expansion", async () => {
    const source = await Bun.file("src/components/sidebar/sidebar-types.ts").text();
    const sidebar = await Bun.file("src/components/sidebar/MainSidebar.tsx").text();
    const sidebarHeader = await Bun.file("src/components/sidebar/SidebarHeader.tsx").text();
    const sidebarNavItemRow = await Bun.file("src/components/sidebar/SidebarNavItemRow.tsx").text();
    const workshopNavigation = await Bun.file(
      "src/components/workshop/navigation/workshop-navigation.ts",
    ).text();

    expect(source).toContain("SIDEBAR_WIDTH_EXPANDED = 288");
    expect(source).toContain("SIDEBAR_WIDTH_COLLAPSED = SIDEBAR_PADDING * 2 + SIDEBAR_ICON_SLOT");
    expect(sidebar).toContain("sidebar-glass fixed left-2 top-2 z-[100]");
    expect(sidebar).toContain("getWorkshopNavigationItems");
    expect(workshopNavigation).toContain("WORKSHOP_NAVIGATION_ITEMS");
    expect(sidebar).toContain("data-sidebar-primary-nav-group");
    expect(sidebar).not.toContain("data-sidebar-primary-nav-divider");
    expect(sidebar).toContain("data-sidebar-section-divider");
    expect(sidebar).toContain("flex flex-col gap-2 py-2");
    expect(sidebar).not.toContain("w-px bg-dividerSibling");
    expect(sidebar).toContain("sidebar-glass-shadow");
    expect(sidebar).toContain("sidebar-glass-grain");
    expect(sidebar).not.toContain("data-refraction");
    expect(sidebar).toContain("width: expanded ? SIDEBAR_WIDTH_EXPANDED : SIDEBAR_WIDTH_COLLAPSED");
    expect(workshopNavigation).toContain("href: \"/workshop/projects\"");
    expect(workshopNavigation).toContain("href: \"/workshop/library\"");
    expect(workshopNavigation).toContain("label: \"Library\"");
    expect(workshopNavigation).not.toContain("href: \"/workshop/templates\"");
    expect(workshopNavigation).not.toContain("label: \"Templates\"");
    expect(workshopNavigation).not.toContain("icon: Copy");
    expect(workshopNavigation).not.toContain("Reports");
    expect(workshopNavigation).not.toContain("Cost Library");
    expect(sidebar).not.toContain("grid-cols-[var(--sidebar-grid-columns)]");
    expect(sidebar).not.toContain("NavGroup");
    expect(sidebar).not.toContain("group.label");
    expect(sidebar).not.toContain('label: "Work"');
    expect(sidebar).not.toContain("border-t border-hairline");
    expect(sidebar).not.toContain("border-b border-hairline");
    expect(sidebar).not.toContain("mt-auto");
    expect(sidebarHeader).not.toContain("absolute bottom-0 border-b border-hairline");
    expect(sidebarNavItemRow).toContain("grid-cols-[48px_minmax(0,1fr)_auto]");
    expect(sidebarNavItemRow).toContain("var(--glass-nav-active-bg)");
    expect(sidebarNavItemRow).toContain("var(--glass-nav-active-collapsed-bg)");
    expect(sidebarNavItemRow).toContain("text-brand-orange-dark");
    expect(sidebarNavItemRow).toContain("text-primary");
    expect(sidebarNavItemRow).toContain("var(--glass-nav-active-shadow)");
    expect(sidebarNavItemRow).toContain("var(--glass-nav-active-collapsed-shadow)");
    expect(sidebarNavItemRow).toContain('weight="regular"');
    expect(sidebar).toContain('<Star size={15} weight="regular"');
    expect(sidebar).toContain('<Folder size={16} weight="regular"');
    expect(sidebar).toContain('<FileText size={11} weight="regular"');
    expect(sidebar).toContain('<SidebarSimple');
    expect(sidebar).toContain('aria-label={expanded ? "Collapse sidebar" : "Expand sidebar"}');
    expect(sidebarHeader).not.toContain("SidebarSimple");
    expect(sidebarNavItemRow).not.toContain('expanded ? "w-full pr-2"');
    expect(sidebar).not.toContain("clipPath");
  });

  test("workshop shells share one glass footprint: same content offset, mesh backdrop, no flat canvas", async () => {
    const pageShell = await Bun.file("src/components/workshop/WorkshopShell.tsx").text();
    expect(pageShell).toContain("lg:pl-[var(--sidebar-content-offset)]");
    expect(pageShell).not.toContain("lg:pl-[64px]");
    expect(pageShell).toContain("<WorkshopGlassBackdrop />");
    expect(pageShell).not.toContain("bg-canvas");
  });
});
