"use client";

import { SidebarSimple } from "@phosphor-icons/react/dist/ssr";

import { ArchestimatorLogo } from "@/components/brand/ArchestimatorLogo";
import { Button } from "@/components/ui/button";
import {
  SIDEBAR_PADDING,
  SIDEBAR_WIDTH_COLLAPSED,
  SIDEBAR_WIDTH_EXPANDED,
} from "./sidebar-types";

type SidebarHeaderProps = {
  expanded: boolean;
  onToggle: () => void;
};

const brandFrameInset = SIDEBAR_PADDING;
const expandedFrameWidth = SIDEBAR_WIDTH_EXPANDED - brandFrameInset * 2;
const collapsedFrameWidth = SIDEBAR_WIDTH_COLLAPSED - brandFrameInset * 2;
const workshopTitleHeaderHeight = 56;
const workshopHeaderIconToolbarHeight = 38;
const headerFrameHeight = workshopTitleHeaderHeight + workshopHeaderIconToolbarHeight - brandFrameInset;
const headerHeight = headerFrameHeight + brandFrameInset * 2;
const headerBorderColor = "color-mix(in srgb, var(--brand-orange) 25%, white)";
const brandLogoWidth = 148;

export function SidebarHeader({ expanded, onToggle }: SidebarHeaderProps) {
  const frameWidth = expanded ? expandedFrameWidth : collapsedFrameWidth;

  return (
    <div
      className="relative shrink-0 overflow-hidden transition-[height] duration-[180ms] ease-out motion-reduce:transition-none"
      style={{ height: headerHeight }}
    >
      <div className="p-2">
        <div
          data-sidebar-header-frame
          className="relative overflow-hidden rounded-xs border bg-surface-muted text-brand-orange transition-[width,height] duration-[180ms] ease-out motion-reduce:transition-none"
          style={{
            width: frameWidth,
            height: headerFrameHeight,
            borderColor: headerBorderColor,
          }}
        >
          <div className="relative flex h-full flex-col justify-between p-2">
            <div className="min-w-0">
              <div
                className="flex h-10 min-w-0 items-center overflow-hidden"
                data-sidebar-header-brand-row
              >
                <div
                  className="flex h-8 shrink-0 items-center overflow-hidden"
                  data-sidebar-header-logo-lock
                  style={{ width: brandLogoWidth }}
                >
                  <ArchestimatorLogo
                    tone="dark"
                    markSize={32}
                    priority
                    showWordmark
                    className="w-full shrink-0 text-brand-orange"
                    markClassName="size-8"
                    separatorClassName="hidden"
                    wordmarkClassName="text-[12px] leading-none text-brand-orange"
                  />
                </div>
              </div>
            </div>

            <div className={["flex", expanded ? "justify-end" : "justify-center"].join(" ")}>
              <Button
                variant="plain"
                size="icon-sm"
                onClick={onToggle}
                aria-expanded={expanded}
                aria-label={expanded ? "Collapse sidebar" : "Expand sidebar"}
                className="text-brand-orange outline-none hover:bg-white/70 hover:text-brand-orange-dark focus-visible:ring-brand-orange motion-reduce:transition-none"
              >
                <SidebarSimple size={16} weight="regular" className="shrink-0" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
