"use client";

import Link from "next/link";
import { usePathname, useRouter, useSelectedLayoutSegments } from "next/navigation";
import { Blueprint, MagnifyingGlass, Package, SquaresFour } from "@phosphor-icons/react/dist/ssr";
import { useCallback, useEffect, useId, useRef, useState, type KeyboardEvent } from "react";

import { HeaderIconToolbar, type HeaderIconToolbarAddAction } from "@/components/ui/header-icon-toolbar";
import { ADD_BUTTON_CLASSNAME } from "@/components/ui/toolbar-icon-button";
import { useNavigationRouter } from "@/hooks/use-navigation-router";
import { cn } from "@/lib/ui/cn";
import { getLibraryActiveTab, LIBRARY_TABS_ID_BASE, type LibraryTabId } from "./library-tabs-model";
import { LibraryOverviewSearch } from "./overview/LibraryOverviewSearch";

const LIBRARY_TABS = [
  {
    id: "overview" as const,
    label: "Overview",
    href: "/workshop/library",
    icon: <SquaresFour />,
  },
  {
    id: "components" as const,
    label: "Components",
    href: "/workshop/library/components",
    icon: <Package />,
  },
  {
    id: "templates" as const,
    label: "Templates",
    href: "/workshop/library/templates",
    icon: <Blueprint />,
  },
] satisfies Array<{ id: LibraryTabId; label: string; href: string; icon: React.ReactNode }>;

type RouterPrefetchOptions = NonNullable<Parameters<ReturnType<typeof useRouter>["prefetch"]>[1]>;
const ROUTER_PREFETCH_KIND_AUTO = "auto" as RouterPrefetchOptions["kind"];
type LibraryRouteRouter = ReturnType<typeof useRouter>;
type LibraryNavigationRouter = ReturnType<typeof useNavigationRouter>;

/**
 * Page-level tab strip for the unified Library surface. Lives in the
 * library layout so the strip persists across tab navigation; hidden on
 * the template editor route, where the breadcrumb owns orientation.
 */
export function LibraryTabsLayoutClient() {
  const routeRouter = useRouter();
  const navigationRouter = useNavigationRouter();
  const pathname = usePathname();
  const segments = useSelectedLayoutSegments();
  const isTemplateEditorRoute = segments[0] === "templates" && segments.length > 1;

  if (isTemplateEditorRoute) return null;

  return (
    <LibraryTabsLayoutContent
      routeRouter={routeRouter}
      navigationRouter={navigationRouter}
      pathname={pathname}
    />
  );
}

function LibraryTabsLayoutContent({
  routeRouter,
  navigationRouter,
  pathname,
}: {
  routeRouter: LibraryRouteRouter;
  navigationRouter: LibraryNavigationRouter;
  pathname: string;
}) {
  const searchPanelId = useId();
  const searchRootRef = useRef<HTMLDivElement | null>(null);
  const prefetchedHrefsRef = useRef<Set<string> | null>(null);
  const tabRefs = useRef<Array<HTMLAnchorElement | null>>([]);
  const [searchOpen, setSearchOpen] = useState(false);
  const searchHasQueryRef = useRef(false);
  if (prefetchedHrefsRef.current === null) prefetchedHrefsRef.current = new Set();

  const activeTab = getLibraryActiveTab(pathname);
  const prefetchLibraryRoute = useCallback(
    (href: string) => {
      const prefetchedHrefs = prefetchedHrefsRef.current;
      if (!prefetchedHrefs || prefetchedHrefs.has(href)) return;
      prefetchedHrefs.add(href);
      routeRouter.prefetch(href, {
        kind: ROUTER_PREFETCH_KIND_AUTO,
        onInvalidate: () => {
          prefetchedHrefsRef.current?.delete(href);
        },
      });
    },
    [routeRouter],
  );

  const handleTabKeyDown = useCallback((event: KeyboardEvent<HTMLAnchorElement>, index: number) => {
    const lastIndex = LIBRARY_TABS.length - 1;
    let nextIndex: number | null = null;
    if (event.key === "ArrowRight" || event.key === "ArrowDown") nextIndex = index === lastIndex ? 0 : index + 1;
    if (event.key === "ArrowLeft" || event.key === "ArrowUp") nextIndex = index === 0 ? lastIndex : index - 1;
    if (event.key === "Home") nextIndex = 0;
    if (event.key === "End") nextIndex = lastIndex;
    if (nextIndex === null) return;
    event.preventDefault();
    tabRefs.current[nextIndex]?.focus();
  }, []);

  const focusSearchToggle = useCallback(() => {
    requestAnimationFrame(() => {
      for (const button of document.querySelectorAll<HTMLButtonElement>("button[aria-controls]")) {
        if (button.getAttribute("aria-controls") === searchPanelId) {
          button.focus();
          return;
        }
      }
    });
  }, [searchPanelId]);

  const closeSearchPanel = useCallback(() => {
    searchHasQueryRef.current = false;
    setSearchOpen(false);
    focusSearchToggle();
  }, [focusSearchToggle]);

  const handleSearchQueryPresenceChange = useCallback((hasQuery: boolean) => {
    searchHasQueryRef.current = hasQuery;
  }, []);

  useEffect(() => {
    if (activeTab === "components") return;

    function handleSearchShortcut(event: globalThis.KeyboardEvent) {
      if (event.defaultPrevented) return;
      if (!(event.metaKey || event.ctrlKey) || event.key.toLowerCase() !== "k") return;
      if (document.querySelector("[role='dialog'], [role='alertdialog']")) return;
      event.preventDefault();
      setSearchOpen(true);
    }

    window.addEventListener("keydown", handleSearchShortcut);
    return () => window.removeEventListener("keydown", handleSearchShortcut);
  }, [activeTab]);

  useEffect(() => {
    if (activeTab === "components" || !searchOpen) return;

    function handleDocumentPointerDown(event: PointerEvent) {
      const target = event.target;
      if (target instanceof Node && searchRootRef.current?.contains(target)) return;
      if (searchHasQueryRef.current) return;
      setSearchOpen(false);
    }

    document.addEventListener("pointerdown", handleDocumentPointerDown, true);
    return () => document.removeEventListener("pointerdown", handleDocumentPointerDown, true);
  }, [activeTab, searchOpen]);

  const startActions: HeaderIconToolbarAddAction[] = [
    {
      id: "library-header-search",
      label: searchOpen ? "Hide library search" : "Show library search",
      icon: <MagnifyingGlass size={12} weight="regular" aria-hidden="true" />,
      onClick: () => {
        if (searchOpen) closeSearchPanel();
        else setSearchOpen(true);
      },
      pressed: searchOpen,
      ariaControls: searchPanelId,
      ariaExpanded: searchOpen,
      className: searchOpen
        ? "bg-surfaceMuted text-ink hover:bg-surfaceMuted focus-visible:bg-surfaceMuted"
        : undefined,
    },
  ];
  const addActions: HeaderIconToolbarAddAction[] = [
    {
      label: "Add component",
      icon: <Package size={13} weight="regular" aria-hidden="true" />,
      onClick: () => navigationRouter.push("/workshop/library/components?add=component"),
      className: ADD_BUTTON_CLASSNAME,
    },
  ];

  return (
    <div className="shrink-0 bg-transparent">
      {activeTab !== "components" ? (
        <div ref={searchRootRef} className="relative">
          <HeaderIconToolbar
            ariaLabel="Library tools"
            labelPrefix="library"
            startActions={startActions}
            startActionsLabel="Library search"
            addActions={addActions}
            className="bg-transparent"
          />
          {searchOpen ? (
            <search
              id={searchPanelId}
              aria-label="Library search"
              className="absolute left-2 right-2 top-[38px] z-30 w-auto sm:right-auto sm:w-[420px]"
              data-library-header-search-panel="true"
            >
              <LibraryOverviewSearch
                className="w-full"
                autoFocus
                onDismiss={closeSearchPanel}
                onQueryPresenceChange={handleSearchQueryPresenceChange}
              />
            </search>
          ) : null}
        </div>
      ) : null}
      <div className="bg-transparent px-2">
        <div
          role="tablist"
          aria-label="Library sections"
          aria-orientation="horizontal"
          className="grid h-[41px] grid-cols-3 gap-1 overflow-visible border-b border-transparent md:grid-cols-[repeat(auto-fill,minmax(248px,1fr))] md:gap-3"
        >
          {LIBRARY_TABS.map((tab, index) => {
            const isActive = activeTab === tab.id;
            return (
              <Link
                key={tab.id}
                ref={(element) => {
                  tabRefs.current[index] = element;
                }}
                href={tab.href}
                prefetch={false}
                role="tab"
                id={`${LIBRARY_TABS_ID_BASE}-tab-${tab.id}`}
                aria-controls={`${LIBRARY_TABS_ID_BASE}-panel-${tab.id}`}
                aria-selected={isActive}
                tabIndex={isActive ? 0 : -1}
                className={cn(
                  "group relative flex h-full min-h-[41px] w-full shrink-0 cursor-pointer items-center justify-start gap-1.5 whitespace-nowrap border-b-2 px-2.5 !text-[10px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-1",
                  isActive
                    ? "border-brand-orange text-ink"
                    : "border-transparent text-tertiary/60 hover:border-divider hover:text-ink",
                )}
                onPointerEnter={() => {
                  if (!isActive) prefetchLibraryRoute(tab.href);
                }}
                onFocus={() => {
                  if (!isActive) prefetchLibraryRoute(tab.href);
                }}
                onClick={() => {
                  if (!isActive) prefetchLibraryRoute(tab.href);
                }}
                onKeyDown={(event) => handleTabKeyDown(event, index)}
              >
                <span className={cn("shrink-0", isActive ? "text-ink" : "text-tertiary group-hover:text-secondary")}>
                  {tab.icon}
                </span>
                <span>{tab.label}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
