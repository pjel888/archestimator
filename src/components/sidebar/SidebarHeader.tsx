"use client";

import { SidebarSimple, Crown } from "@phosphor-icons/react/dist/ssr";

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
const expandedFrameSize = SIDEBAR_WIDTH_EXPANDED - brandFrameInset * 2;
const collapsedFrameWidth = SIDEBAR_WIDTH_COLLAPSED - brandFrameInset * 2;
const collapsedFrameHeight = expandedFrameSize;
const headerHeight = SIDEBAR_WIDTH_EXPANDED;

export function SidebarHeader({ expanded, onToggle }: SidebarHeaderProps) {
  const frameWidth = expanded ? expandedFrameSize : collapsedFrameWidth;
  const frameHeight = expanded ? expandedFrameSize : collapsedFrameHeight;

  return (
    <div
      className="relative shrink-0 overflow-hidden bg-white transition-[height] duration-[180ms] ease-out motion-reduce:transition-none"
      style={{ height: headerHeight }}
    >
      <div className="p-2">
        <div
          className="relative overflow-hidden rounded-xs bg-secondary text-white ring-1 ring-black/10 transition-[width,height] duration-[180ms] ease-out motion-reduce:transition-none"
          style={{
            width: frameWidth,
            height: frameHeight,
            backgroundImage: 'url("/sidebar-BG.png")',
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        >
          <div className="absolute inset-0 bg-linear-to-b from-secondary/15 via-secondary/5 to-secondary/55" />

          <div className="relative flex h-full flex-col justify-between p-2">
            <div className="min-w-0">
              <div className="flex min-w-0 items-center gap-2 border-b border-white/70 pb-2">
                <ArchestimatorLogo
                  tone="light"
                  markSize={32}
                  priority
                  showWordmark={expanded}
                  className={[
                    "text-white transition-[opacity,transform,background-color,box-shadow] duration-[180ms] ease-out motion-reduce:transform-none motion-reduce:transition-none",
                    expanded ? "" : "size-8 justify-center rounded-xs bg-white/[0.10] ring-1 ring-white/16 backdrop-blur-[1px]",
                  ].join(" ")}
                  markClassName="size-8"
                  separatorClassName="hidden"
                  wordmarkClassName="text-[12px] leading-none text-white drop-shadow-sm"
                />
              </div>

              <div className={["flex w-full items-center overflow-hidden pt-2", expanded ? "justify-start" : "justify-center"].join(" ")}>
                <div
                  className={[
                    "flex min-w-0 items-center rounded-xs bg-white/[0.08] text-white/82 ring-1 ring-white/16 backdrop-blur-[1px] transition-[width,padding,opacity] duration-[180ms] ease-out motion-reduce:transition-none",
                    expanded ? "h-7 w-full gap-1.5 px-2.5 opacity-90" : "h-8 w-full justify-center px-0 opacity-85",
                  ].join(" ")}
                  aria-label="Workspace shell"
                  title="Workspace shell"
                >
                  <Crown size={expanded ? 12 : 15} weight="regular" className="shrink-0 text-white/78" />
                  {expanded && (
                    <span className="min-w-0 truncate whitespace-nowrap text-[10px] font-medium leading-none tracking-normal text-white/78">
                      Workshop
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className={["flex", expanded ? "justify-end" : "justify-center"].join(" ")}>
              <Button
                variant="overlay"
                size="icon-sm"
                onClick={onToggle}
                aria-expanded={expanded}
                aria-label={expanded ? "Collapse sidebar" : "Expand sidebar"}
                className="outline-none motion-reduce:transition-none"
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
