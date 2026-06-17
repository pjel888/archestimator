"use client";

import { ArchestimatorLogoMark, ArchestimatorWordmark } from "@/components/brand/ArchestimatorLogo";
import {
  SIDEBAR_PADDING,
  SIDEBAR_WIDTH_COLLAPSED,
  SIDEBAR_WIDTH_EXPANDED,
} from "./sidebar-types";

type SidebarHeaderProps = {
  expanded: boolean;
};

const brandFrameInset = SIDEBAR_PADDING;
const expandedFrameWidth = SIDEBAR_WIDTH_EXPANDED - brandFrameInset * 2;
const collapsedFrameWidth = SIDEBAR_WIDTH_COLLAPSED - brandFrameInset * 2;
const headerFrameHeight = 56;
const headerHeight = headerFrameHeight + brandFrameInset * 2;

/**
 * Brand header: an orange liquid-glass slab with the white mark locked into the
 * 48px icon column so it never shifts when the rail expands/collapses — only the
 * wordmark fades in to its right. The collapse toggle lives in MainSidebar now.
 */
export function SidebarHeader({ expanded }: SidebarHeaderProps) {
  const frameWidth = expanded ? expandedFrameWidth : collapsedFrameWidth;

  return (
    <div
      className="relative shrink-0 overflow-hidden transition-[height] duration-[180ms] ease-out motion-reduce:transition-none"
      style={{ height: headerHeight }}
    >
      <div className="p-2">
        <div
          data-sidebar-header-frame
          className="sidebar-logo-frame relative overflow-hidden rounded-xs transition-[width] duration-[180ms] ease-out motion-reduce:transition-none"
          style={{ width: frameWidth, height: headerFrameHeight }}
        >
          <div
            className="grid h-full grid-cols-[48px_minmax(0,1fr)] items-center"
            data-sidebar-header-brand-row
          >
            <div
              className="flex h-full w-12 items-center justify-center"
              data-sidebar-header-logo-lock
            >
              <ArchestimatorLogoMark tone="light" size={26} priority className="size-[26px]" />
            </div>
            <span
              aria-hidden={!expanded}
              className={[
                "min-w-0 truncate pr-2 transition-[opacity,transform] duration-[180ms] ease-out motion-reduce:transform-none motion-reduce:transition-none",
                expanded ? "translate-x-0 opacity-100" : "pointer-events-none -translate-x-1 opacity-0",
              ].join(" ")}
            >
              <ArchestimatorWordmark className="text-[12px] leading-none text-white" />
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
