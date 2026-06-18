"use client";

import { ArchestimatorLogoMark, ArchestimatorWordmark } from "@/components/brand/ArchestimatorLogo";
import { SIDEBAR_PADDING, SIDEBAR_TRANSITION, SIDEBAR_WIDTH_EXPANDED } from "./sidebar-types";

type SidebarHeaderProps = {
  expanded: boolean;
};

// Orange brand slab (owner directive 2026-06-18): collapsed is the 48×48 mark;
// expanded becomes a single red rectangle that contains the mark + white wordmark.
const LOGO_SLAB = 48;
const MARK_SIZE = 32;
const EXPANDED_BRAND_SLAB = SIDEBAR_WIDTH_EXPANDED - SIDEBAR_PADDING * 2;
const headerHeight = LOGO_SLAB + SIDEBAR_PADDING * 2;

export function SidebarHeader({ expanded }: SidebarHeaderProps) {
  return (
    <div className="relative shrink-0 overflow-hidden" style={{ height: headerHeight }}>
      <div className="p-2">
        <div className="flex items-center" data-sidebar-header-brand-row>
          <div
            data-sidebar-header-frame
            className="sidebar-logo-frame flex h-12 items-center overflow-hidden rounded-xs transition-[width] duration-[180ms] ease-out motion-reduce:transition-none"
            style={{
              width: expanded ? EXPANDED_BRAND_SLAB : LOGO_SLAB,
              transitionDuration: `${expanded ? SIDEBAR_TRANSITION.expandDuration : SIDEBAR_TRANSITION.collapseDuration}ms`,
              transitionTimingFunction: SIDEBAR_TRANSITION.easing,
            }}
          >
            <div className="flex w-12 shrink-0 items-center justify-center" data-sidebar-header-logo-lock>
              <ArchestimatorLogoMark tone="light" size={MARK_SIZE} priority className="size-[32px]" />
            </div>
            <span
              aria-hidden={!expanded}
              className={[
                "min-w-0 truncate pr-3 transition-[opacity,transform] duration-[180ms] ease-out motion-reduce:transform-none motion-reduce:transition-none",
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
