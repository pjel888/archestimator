"use client";

import { ArchestimatorLogoMark, ArchestimatorWordmark } from "@/components/brand/ArchestimatorLogo";
import { SIDEBAR_PADDING } from "./sidebar-types";

type SidebarHeaderProps = {
  expanded: boolean;
};

// Square orange logo slab (owner directive 2026-06-18): a stationary 48×48 square
// — not the old full-width rectangle — locked in the 48px icon column so it never
// shifts on toggle, holding a bigger 32px white mark. The wordmark sits beside it.
const LOGO_SLAB = 48;
const MARK_SIZE = 32;
const headerHeight = LOGO_SLAB + SIDEBAR_PADDING * 2;

export function SidebarHeader({ expanded }: SidebarHeaderProps) {
  return (
    <div className="relative shrink-0 overflow-hidden" style={{ height: headerHeight }}>
      <div className="p-2">
        <div
          className="grid grid-cols-[48px_minmax(0,1fr)] items-center gap-2"
          data-sidebar-header-brand-row
        >
          <div
            className="flex w-12 items-center justify-center"
            data-sidebar-header-logo-lock
          >
            <div
              data-sidebar-header-frame
              className="sidebar-logo-frame flex size-12 items-center justify-center overflow-hidden rounded-xs"
            >
              <ArchestimatorLogoMark tone="light" size={MARK_SIZE} priority className="size-[32px]" />
            </div>
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
  );
}
