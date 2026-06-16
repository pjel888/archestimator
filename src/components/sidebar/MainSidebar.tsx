"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Books, FileText, Folder, SquaresFour, Star } from "@phosphor-icons/react/dist/ssr";
import type { Icon as PhosphorIcon } from "@phosphor-icons/react";

import { Button } from "@/components/ui/button";
import { usePrefetchOnHover } from "@/hooks/use-prefetch-on-hover";
import { useSidebarFavoritesQuery } from "@/hooks/use-sidebar-favorites-query";
import { useSidebarFavoritesAnnouncer } from "@/hooks/use-sidebar-favorites-announcer";
import { SidebarHeader } from "./SidebarHeader";
import { SidebarNavItemRow } from "./SidebarNavItemRow";
import {
  SIDEBAR_PADDING,
  SIDEBAR_TRANSITION,
  SIDEBAR_WIDTH_COLLAPSED,
  SIDEBAR_WIDTH_EXPANDED,
  type MainSidebarFavoriteProject,
  type SidebarNavItem,
} from "./sidebar-types";

type MainSidebarUser = {
  displayName?: string | null;
  email?: string | null;
  avatarUrl?: string | null;
};

export type MainSidebarStatus = {
  projectsBadgeCount?: number;
};

type MainSidebarProps = {
  favoriteProjects?: MainSidebarFavoriteProject[];
  favoritesScope?: { workspaceId: string; userId: string } | null;
  status?: MainSidebarStatus;
  user?: MainSidebarUser;
};

const dashboardItem: SidebarNavItem & { icon: PhosphorIcon } = {
  id: "workshop",
  href: "/workshop",
  label: "Workshop",
  icon: SquaresFour,
  shortcut: "⌘1",
};

const sidebarNavItems: Array<SidebarNavItem & { icon: PhosphorIcon }> = [
  dashboardItem,
  { id: "projects", href: "/workshop/projects", label: "Projects", icon: Folder, shortcut: "⌘2" },
  { id: "library", href: "/workshop/library", label: "Library", icon: Books, shortcut: "⌘3" },
];

const sidebarPrefetchRoutes = sidebarNavItems.map((item) => ({ pathname: item.href }));

const isActiveHref = (pathname: string | null, href: string) => pathname === href || Boolean(pathname?.startsWith(`${href}/`));

function formatPendingInviteBadgeLabel(count: number) {
  return `${count} pending ${count === 1 ? "invite" : "invites"}`;
}

function createFavoritePrefetchRoutes(favoriteProjects: MainSidebarFavoriteProject[]) {
  return favoriteProjects.flatMap((project) => [
    { pathname: project.href },
    ...project.favoriteEstimateSheets.map((sheet) => ({ pathname: sheet.href })),
  ]);
}

/**
 * Flattens the favorites list into the same top-to-bottom order the links render
 * in (project, then its sheets, then the next project). Focus rescue (08) scans
 * this order to land on the nearest surviving favorite when a focused link leaves.
 */
function getFavoriteLinkOrder(favoriteProjects: MainSidebarFavoriteProject[]) {
  return favoriteProjects.flatMap((project) => [
    project.href,
    ...project.favoriteEstimateSheets.map((sheet) => sheet.href),
  ]);
}

function getFavoriteLinkClassName(active: boolean, depth: "project" | "sheet") {
  const base = [
    "group relative flex h-7 min-w-0 items-center gap-2 overflow-hidden rounded-xs outline-none transition-colors duration-[120ms] ease-out",
    "focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-primary",
    active ? "bg-orange-50 text-primary" : "text-tertiary hover:bg-accent-soft hover:text-primary",
  ];

  if (depth === "project") {
    base.push("pl-3 pr-2");
  } else {
    base.push("pl-[52px] pr-2");
  }

  return base.join(" ");
}

export function MainSidebar({ favoriteProjects = [], favoritesScope, status, user }: MainSidebarProps) {
  const pathname = usePathname();
  const favoritesQuery = useSidebarFavoritesQuery({
    scope: favoritesScope ?? { workspaceId: "none", userId: "none" }, // hook always called; null scope reads initialData
    initialData: favoriteProjects,
    enabled: Boolean(favoritesScope), // null scope (loading shells/unauth): read initialData, don't refetch a junk key
  });
  const liveFavoriteProjects = favoritesScope ? favoritesQuery.data ?? [] : favoriteProjects;
  const showEmptyHint = !favoritesQuery.isPending && liveFavoriteProjects.length === 0;
  const { politeText, assertiveText } = useSidebarFavoritesAnnouncer();
  const navRef = useRef<HTMLElement | null>(null);
  // Tracks which favorite link (by href) currently holds focus, plus the previous
  // render's DOM-order href list — both feed the focus-rescue effect (08, QA-18/21).
  const focusedFavoriteHrefRef = useRef<string | null>(null);
  const favoriteLinkOrder = useMemo(() => getFavoriteLinkOrder(liveFavoriteProjects), [liveFavoriteProjects]);
  const previousFavoriteOrderRef = useRef<string[]>(favoriteLinkOrder);

  // Focus rescue: when the favorite link that held focus is removed (unfavorited),
  // move focus to the nearest surviving favorite in DOM order — nearest-above first,
  // then nearest-below — and fall back to the favorites header when the list empties.
  // Without this, focus drops to <body> on optimistic removal (08 Focus management).
  useLayoutEffect(() => {
    const previousOrder = previousFavoriteOrderRef.current;
    previousFavoriteOrderRef.current = favoriteLinkOrder;

    const focusedHref = focusedFavoriteHrefRef.current;
    if (!focusedHref) return;
    if (favoriteLinkOrder.includes(focusedHref)) return; // focused link survived

    focusedFavoriteHrefRef.current = null;
    const nav = navRef.current;
    if (!nav) return;

    const surviving = new Set(favoriteLinkOrder);
    const removedIndex = previousOrder.indexOf(focusedHref);

    // Nearest-above (then nearest-below) surviving href in the prior DOM order.
    let targetHref: string | null = null;
    for (let i = removedIndex - 1; i >= 0; i -= 1) {
      if (surviving.has(previousOrder[i]!)) { targetHref = previousOrder[i]!; break; }
    }
    if (!targetHref) {
      for (let i = removedIndex + 1; i < previousOrder.length; i += 1) {
        if (surviving.has(previousOrder[i]!)) { targetHref = previousOrder[i]!; break; }
      }
    }

    if (targetHref) {
      const target = nav.querySelector<HTMLElement>(
        `[data-sidebar-favorite-project] a[href="${targetHref}"], [data-sidebar-favorite-sheet][href="${targetHref}"], a[href="${targetHref}"]`,
      );
      if (target) {
        target.focus();
        return;
      }
    }

    nav.querySelector<HTMLElement>("[data-sidebar-favorites-header]")?.focus();
  }, [favoriteLinkOrder]);
  const favoritePrefetchRoutes = useMemo(() => createFavoritePrefetchRoutes(liveFavoriteProjects), [liveFavoriteProjects]);
  const prefetchRoutes = useMemo(() => [...sidebarPrefetchRoutes, ...favoritePrefetchRoutes], [favoritePrefetchRoutes]);
  const { prefetch, cancel } = usePrefetchOnHover(prefetchRoutes);
  const userName = user?.displayName || user?.email || "Workspace";
  const userSubtitle = user?.email || "Archestimator";
  const userInitials = userName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || "AE";
  const [expanded, setExpanded] = useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(() =>
    typeof window === "undefined" ? false : window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  );
  const resolvedSidebarNavItems = useMemo(() => {
    const projectsBadgeCount = status?.projectsBadgeCount ?? 0;
    return sidebarNavItems.map((item) => {
      if (item.id !== "projects" || projectsBadgeCount <= 0) return item;
      return {
        ...item,
        badgeCount: projectsBadgeCount,
        badgeLabel: formatPendingInviteBadgeLabel(projectsBadgeCount),
      };
    });
  }, [status?.projectsBadgeCount]);

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const onChange = (event: MediaQueryListEvent) => setPrefersReducedMotion(event.matches);
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "b") {
        event.preventDefault();
        setExpanded((value) => !value);
        return;
      }
      if (event.key === "Escape") {
        setExpanded(false);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const clippedWidth = SIDEBAR_WIDTH_EXPANDED - SIDEBAR_WIDTH_COLLAPSED;
  const sidebarStyle = useMemo<React.CSSProperties>(() => {
    const base: React.CSSProperties = {
      width: SIDEBAR_WIDTH_EXPANDED,
      clipPath: expanded ? "inset(0 0 0 0)" : `inset(0 ${clippedWidth}px 0 0)`,
    };

    if (prefersReducedMotion) return base;

    return {
      ...base,
      transition: `clip-path ${expanded ? SIDEBAR_TRANSITION.expandDuration : SIDEBAR_TRANSITION.collapseDuration}ms ${SIDEBAR_TRANSITION.easing}`,
    };
  }, [clippedWidth, expanded, prefersReducedMotion]);

  const borderStyle = useMemo<React.CSSProperties>(() => {
    const base: React.CSSProperties = {
      left: expanded ? SIDEBAR_WIDTH_EXPANDED - 1 : SIDEBAR_WIDTH_COLLAPSED - 1,
    };

    if (prefersReducedMotion) return base;

    return {
      ...base,
      transition: `left ${expanded ? SIDEBAR_TRANSITION.expandDuration : SIDEBAR_TRANSITION.collapseDuration}ms ${SIDEBAR_TRANSITION.easing}`,
    };
  }, [expanded, prefersReducedMotion]);

  return (
    <>
      {expanded && (
        <Button
          variant="scrim"
          size="scrim"
          aria-label="Close sidebar overlay"
          className="z-30 hidden lg:block"
          onClick={() => setExpanded(false)}
        />
      )}
      <nav
        ref={navRef}
        aria-label="Main navigation"
        className="fixed left-0 top-0 z-[100] hidden h-[100dvh] flex-col overflow-hidden bg-white will-change-[clip-path] lg:flex"
        style={sidebarStyle}
      >
        <SidebarHeader expanded={expanded} onToggle={() => setExpanded((value) => !value)} />

        <div className="flex flex-1 flex-col overflow-y-auto overflow-x-hidden [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <div className="flex h-[72px] shrink-0 items-center xl:h-[80px]" style={{ paddingInline: SIDEBAR_PADDING }}>
            <div className="grid h-10 w-full grid-cols-[48px_minmax(0,1fr)] items-center gap-1 overflow-hidden rounded-xs">
              <div className="flex h-10 w-12 shrink-0 items-center justify-center">
                <div className="relative flex size-8 shrink-0 items-center justify-center overflow-hidden rounded-xs bg-linear-to-br from-secondary to-primary text-[10px] font-medium leading-none text-white ring-1 ring-black/10">
                  {user?.avatarUrl ? (
                    <Image src={user.avatarUrl} alt="" fill sizes="32px" className="object-cover" referrerPolicy="no-referrer" unoptimized />
                  ) : (
                    userInitials
                  )}
                </div>
              </div>
              <div
                aria-hidden={!expanded}
                className={[
                  "min-w-0 overflow-hidden transition-[opacity,transform] duration-[180ms] ease-out motion-reduce:transform-none motion-reduce:transition-none",
                  expanded ? "translate-x-0 opacity-100" : "pointer-events-none translate-x-1 opacity-0",
                ].join(" ")}
              >
                <p className="truncate text-[10px] font-medium leading-none text-ink">{userName}</p>
                <p className="mt-1 truncate text-[9px] leading-none text-tertiary">{userSubtitle}</p>
              </div>
            </div>
          </div>

          <div className="h-px shrink-0 bg-hairline" />

          <div className="flex flex-col gap-2 pb-2 pt-2" style={{ paddingInline: SIDEBAR_PADDING }}>
            {resolvedSidebarNavItems.map((item) => (
              <SidebarNavItemRow
                key={item.id}
                item={item}
                active={item.id === dashboardItem.id ? pathname === item.href : isActiveHref(pathname, item.href)}
                expanded={expanded}
                onPrefetchStart={prefetch}
                onPrefetchCancel={cancel}
              />
            ))}
          </div>

          <div className="shrink-0 border-y border-hairline" style={{ paddingInline: SIDEBAR_PADDING }}>
            <div
              data-sidebar-favorites-header
              tabIndex={-1}
              className="grid h-10 w-full grid-cols-[48px_minmax(0,1fr)] items-center gap-1 overflow-hidden rounded-xs outline-none"
            >
              <span className="flex h-8 w-12 shrink-0 items-center justify-center rounded-xs text-warning">
                <Star size={15} weight="fill" aria-hidden="true" className="shrink-0" />
              </span>
              <span
                aria-hidden={!expanded}
                className={[
                  "min-w-0 truncate whitespace-nowrap text-[10px] font-medium leading-none text-ink transition-[opacity,transform] duration-[180ms] ease-out motion-reduce:transform-none motion-reduce:transition-none",
                  expanded ? "translate-x-0 opacity-100" : "pointer-events-none translate-x-1 opacity-0",
                ].join(" ")}
              >
                Favorites
              </span>
            </div>

            {liveFavoriteProjects.length > 0 ? (
              <div
                aria-label="Favorite projects"
                className={[
                  "flex min-w-0 flex-col gap-0.5 pb-2 transition-[opacity,transform] duration-[180ms] ease-out motion-reduce:transform-none motion-reduce:transition-none",
                  expanded ? "translate-x-0 opacity-100" : "pointer-events-none hidden translate-x-1 opacity-0",
                ].join(" ")}
              >
                {liveFavoriteProjects.map((project) => {
                  const projectActive = isActiveHref(pathname, project.href);
                  return (
                    <div
                      key={project.id}
                      className="min-w-0 transition-[opacity] duration-[120ms] ease-out motion-reduce:transition-none"
                      data-sidebar-favorite-project
                    >
                      <Link
                        href={project.href}
                        prefetch={false}
                        aria-current={projectActive ? "page" : undefined}
                        title={project.projectCode ? `${project.name} (${project.projectCode})` : project.name}
                        onBlur={(event) => {
                          cancel(project.href);
                          // Only clear focus tracking on a genuine focus-out. When the link is
                          // unmounted (unfavorited), it blurs while detached — keep the ref so
                          // the rescue effect can move focus to a surviving favorite.
                          if (event.currentTarget.isConnected && focusedFavoriteHrefRef.current === project.href) {
                            focusedFavoriteHrefRef.current = null;
                          }
                        }}
                        onFocus={() => {
                          prefetch(project.href);
                          focusedFavoriteHrefRef.current = project.href;
                        }}
                        onMouseEnter={() => prefetch(project.href)}
                        onMouseLeave={() => cancel(project.href)}
                        className={getFavoriteLinkClassName(projectActive, "project")}
                      >
                        <Folder size={13} weight={projectActive ? "fill" : "regular"} aria-hidden="true" className="shrink-0" />
                        <span className="min-w-0 truncate text-[9px] font-medium leading-none">{project.name}</span>
                      </Link>

                      {project.favoriteEstimateSheets.length > 0 ? (
                        <div className="mt-0.5 flex min-w-0 flex-col gap-0.5">
                          {project.favoriteEstimateSheets.map((sheet) => {
                            const sheetActive = isActiveHref(pathname, sheet.href);
                            return (
                              <Link
                                key={sheet.id}
                                href={sheet.href}
                                prefetch={false}
                                aria-current={sheetActive ? "page" : undefined}
                                title={sheet.sheetCode ? `${sheet.name} (${sheet.sheetCode})` : sheet.name}
                                onBlur={(event) => {
                                  cancel(sheet.href);
                                  if (event.currentTarget.isConnected && focusedFavoriteHrefRef.current === sheet.href) {
                                    focusedFavoriteHrefRef.current = null;
                                  }
                                }}
                                onFocus={() => {
                                  prefetch(sheet.href);
                                  focusedFavoriteHrefRef.current = sheet.href;
                                }}
                                onMouseEnter={() => prefetch(sheet.href)}
                                onMouseLeave={() => cancel(sheet.href)}
                                className={`${getFavoriteLinkClassName(sheetActive, "sheet")} transition-[opacity] duration-[120ms] ease-out motion-reduce:transition-none`}
                                data-sidebar-favorite-sheet
                              >
                                <FileText size={11} weight={sheetActive ? "fill" : "regular"} aria-hidden="true" className="shrink-0" />
                                <span className="min-w-0 truncate text-[9px] leading-none">{sheet.name}</span>
                              </Link>
                            );
                          })}
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            ) : null}

            {showEmptyHint && expanded ? (
              <p
                data-sidebar-favorites-empty
                className="pb-2 pl-3 text-[9px] font-normal leading-none text-tertiary"
              >
                Star a project to pin it here.
              </p>
            ) : null}

            {/* Always-mounted live regions: the estimate-favorite button announces
                through the module-scoped bridge, so these must persist even when the
                favorites list is empty (08 / D5). */}
            <span
              data-sidebar-favorites-status
              role="status"
              aria-live="polite"
              aria-atomic="true"
              className="sr-only"
            >
              {politeText}
            </span>
            <span
              data-sidebar-favorites-alert
              role="alert"
              aria-live="assertive"
              aria-atomic="true"
              className="sr-only"
            >
              {assertiveText}
            </span>
          </div>
        </div>
      </nav>
      <div
        aria-hidden="true"
        className="fixed top-0 z-[100] hidden h-[100dvh] w-px bg-hairline shadow-[4px_0_12px_rgba(0,0,0,0.10)] pointer-events-none lg:block"
        style={borderStyle}
      />
    </>
  );
}
