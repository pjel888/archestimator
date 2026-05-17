"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import { Books, GearSix, House, SquaresFour } from "@phosphor-icons/react/dist/ssr";
import type { Icon as PhosphorIcon } from "@phosphor-icons/react";

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
      { id: "components", href: "/workshop/components", label: "Components", icon: Books, shortcut: "⌘3" },
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

export function MainSidebar() {
  const pathname = usePathname();
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

  const dividerStyle: React.CSSProperties = expanded
    ? { left: 0, right: 0 }
    : { left: SIDEBAR_PADDING, width: SIDEBAR_ICON_SLOT };

  return (
    <>
      {expanded && (
        <button
          type="button"
          aria-label="Close sidebar overlay"
          className="fixed inset-0 z-30 hidden cursor-default bg-black/12 lg:block"
          onClick={() => setExpanded(false)}
        />
      )}
      <nav
        aria-label="Main navigation"
        className="fixed left-0 top-0 z-40 hidden h-[100dvh] flex-col overflow-hidden bg-white shadow-[1px_0_0_rgba(17,17,17,0.10),8px_0_14px_-14px_rgba(17,17,17,0.42)] will-change-[clip-path] lg:flex"
        style={sidebarStyle}
      >
        <SidebarHeader expanded={expanded} onToggle={() => setExpanded((value) => !value)} />

        <div className="flex flex-1 flex-col overflow-y-auto overflow-x-hidden [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <div className="relative flex h-[72px] shrink-0 items-center xl:h-[76px]" style={{ paddingInline: SIDEBAR_PADDING }}>
            <div aria-hidden="true" className="absolute bottom-0 border-b border-hairline" style={dividerStyle} />
            <div className="grid h-10 w-full grid-cols-[48px_minmax(0,1fr)] items-center gap-1 overflow-hidden rounded-md">
              <div className="flex h-10 w-12 shrink-0 items-center justify-center">
                <div className="flex size-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-linear-to-br from-secondary to-primary text-[12px] font-semibold leading-none text-white">
                  AE
                </div>
              </div>
              <div
                aria-hidden={!expanded}
                className={[
                  "min-w-0 overflow-hidden transition-[opacity,transform] duration-[180ms] ease-out motion-reduce:transform-none motion-reduce:transition-none",
                  expanded ? "translate-x-0 opacity-100" : "pointer-events-none translate-x-1 opacity-0",
                ].join(" ")}
              >
                <p className="truncate text-[12.5px] font-medium leading-none text-ink">Workspace</p>
                <p className="mt-1 truncate text-[10px] leading-none text-tertiary">Archestimator</p>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-3 pt-3" style={{ paddingInline: SIDEBAR_PADDING }}>
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

          <div className="mt-auto flex flex-col gap-1 pb-3 pt-4" style={{ paddingInline: SIDEBAR_PADDING }}>
            <div className="relative h-3">
              <div aria-hidden="true" className="absolute top-1/2 border-t border-hairline" style={dividerStyle} />
            </div>
            <SidebarNavItemRow item={settingsItem} active={false} expanded={expanded} />
          </div>
        </div>
      </nav>
    </>
  );
}
