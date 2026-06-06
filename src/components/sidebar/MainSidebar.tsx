"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { Blueprint, Books, Folder, SquaresFour } from "@phosphor-icons/react/dist/ssr";
import type { Icon as PhosphorIcon } from "@phosphor-icons/react";

import { Button } from "@/components/ui/button";
import { usePrefetchOnHover } from "@/hooks/use-prefetch-on-hover";
import { SidebarHeader } from "./SidebarHeader";
import { SidebarNavItemRow } from "./SidebarNavItemRow";
import {
  SIDEBAR_PADDING,
  SIDEBAR_TRANSITION,
  SIDEBAR_WIDTH_COLLAPSED,
  SIDEBAR_WIDTH_EXPANDED,
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
  { id: "library", href: "/workshop/library", label: "Components", icon: Books, shortcut: "⌘3" },
  { id: "templates", href: "/workshop/templates", label: "Templates", icon: Blueprint, shortcut: "⌘4" },
];

const sidebarPrefetchRoutes = sidebarNavItems.map((item) => ({ pathname: item.href }));

const isActiveHref = (pathname: string | null, href: string) => pathname === href || Boolean(pathname?.startsWith(`${href}/`));

function formatPendingInviteBadgeLabel(count: number) {
  return `${count} pending ${count === 1 ? "invite" : "invites"}`;
}

export function MainSidebar({ status, user }: { status?: MainSidebarStatus; user?: MainSidebarUser }) {
  const pathname = usePathname();
  const { prefetch, cancel } = usePrefetchOnHover(sidebarPrefetchRoutes);
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
        aria-label="Main navigation"
        className="fixed left-0 top-0 z-[100] hidden h-[100dvh] flex-col overflow-hidden bg-white will-change-[clip-path] lg:flex"
        style={sidebarStyle}
      >
        <SidebarHeader expanded={expanded} onToggle={() => setExpanded((value) => !value)} />

        <div className="flex flex-1 flex-col overflow-y-auto overflow-x-hidden [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <div className="flex h-[72px] shrink-0 items-center xl:h-[76px]" style={{ paddingInline: SIDEBAR_PADDING }}>
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
