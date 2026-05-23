"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { Books, GearSix, House, SquaresFour } from "@phosphor-icons/react/dist/ssr";
import type { Icon as PhosphorIcon } from "@phosphor-icons/react";

import { Button } from "@/components/ui/button";
import { SidebarHeader } from "./SidebarHeader";
import { SidebarNavItemRow } from "./SidebarNavItemRow";
import {
  SIDEBAR_ICON_SLOT,
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

type NavGroup = {
  key: string;
  label: string;
  items: Array<SidebarNavItem & { icon: PhosphorIcon }>;
};

const dashboardItem: SidebarNavItem & { icon: PhosphorIcon } = {
  id: "workshop",
  href: "/workshop",
  label: "Workshop",
  icon: SquaresFour,
  shortcut: "⌘1",
};

const navGroups: NavGroup[] = [
  {
    key: "work",
    label: "Work",
    items: [
      { id: "projects", href: "/workshop/projects", label: "Projects", icon: House, shortcut: "⌘2" },
    ],
  },
  {
    key: "library",
    label: "Library",
    items: [
      { id: "library", href: "/workshop/library", label: "Library", icon: Books, shortcut: "⌘3" },
    ],
  },
];

const settingsItem: SidebarNavItem & { icon: PhosphorIcon } = {
  id: "settings",
  href: "/workshop",
  label: "Settings",
  icon: GearSix,
};

const isActiveHref = (pathname: string | null, href: string) => pathname === href || Boolean(pathname?.startsWith(`${href}/`));

export function MainSidebar({ user }: { user?: MainSidebarUser }) {
  const pathname = usePathname();
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

  const dividerStyle: React.CSSProperties = expanded
    ? { left: 0, right: 0 }
    : { left: SIDEBAR_PADDING, width: SIDEBAR_ICON_SLOT };

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
          <div className="relative flex h-[72px] shrink-0 items-center xl:h-[76px]" style={{ paddingInline: SIDEBAR_PADDING }}>
            <div aria-hidden="true" className="absolute bottom-0 border-b border-hairline" style={dividerStyle} />
            <div className="grid h-10 w-full grid-cols-[48px_minmax(0,1fr)] items-center gap-1 overflow-hidden rounded-md">
              <div className="flex h-10 w-12 shrink-0 items-center justify-center">
                <div className="relative flex size-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-linear-to-br from-secondary to-primary text-[10px] font-semibold leading-none text-white ring-1 ring-black/10">
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

          <div className="flex flex-col gap-3 pt-2" style={{ paddingInline: SIDEBAR_PADDING }}>
            <div className="flex flex-col gap-1">
              <SidebarNavItemRow item={dashboardItem} active={pathname === dashboardItem.href} expanded={expanded} />
            </div>

            {navGroups.map((group, groupIndex) => (
              <div key={group.key} className="flex flex-col gap-1">
                <div className="relative flex h-5 items-center overflow-hidden">
                  <span
                    aria-hidden={!expanded}
                    className={[
                      "px-2 text-[8px] font-bold uppercase tracking-wider text-tertiary select-none transition-[opacity,transform] duration-[180ms] ease-out motion-reduce:transform-none motion-reduce:transition-none",
                      expanded ? "translate-x-0 opacity-100" : "pointer-events-none translate-x-1 opacity-0",
                    ].join(" ")}
                  >
                    {group.label}
                  </span>
                  {!expanded && groupIndex > 0 && <div aria-hidden="true" className="absolute left-0 top-1/2 w-12 border-t border-hairline/70" />}
                </div>
                {group.items.map((item) => (
                  <SidebarNavItemRow key={item.id} item={item} active={isActiveHref(pathname, item.href)} expanded={expanded} />
                ))}
              </div>
            ))}
          </div>

          <div className="relative mt-auto flex flex-col gap-1 pb-2 pt-2" style={{ paddingInline: SIDEBAR_PADDING }}>
            <div className="relative h-3" style={{ marginInline: -SIDEBAR_PADDING }}>
              <div aria-hidden="true" className="absolute top-1/2 border-t border-hairline" style={dividerStyle} />
            </div>
            <SidebarNavItemRow item={settingsItem} active={false} expanded={expanded} />
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
