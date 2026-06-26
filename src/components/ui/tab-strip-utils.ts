import { cn } from "@/lib/ui/cn";

export function getTabStripTabId(idBase: string, tabId: string) {
  return `${idBase}-tab-${tabId}`;
}

export function getTabStripPanelId(idBase: string, tabId: string) {
  return `${idBase}-panel-${tabId}`;
}

export const tabStripTabClassName = (isActive: boolean, variant: "folder" | "modal" | "glass" = "folder") =>
  cn(
    "relative inline-flex h-full items-center gap-1 rounded-xs border border-b-0 px-3 text-[10px] font-medium leading-none transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus",
    variant === "glass"
      ? isActive
        ? "z-10 border-white/70 bg-white/72 text-ink shadow-[inset_0_1px_0_rgba(255,255,255,0.74)] -mb-px"
        : "border-transparent bg-transparent text-tertiary hover:border-white/55 hover:bg-white/34 hover:text-ink"
      : variant === "modal"
      ? isActive
        ? "z-10 border-ink bg-white text-ink -mb-px"
        : "border-transparent bg-white text-secondary hover:border-hairline hover:text-ink"
      : isActive
        ? "z-10 bg-white text-ink border-hairline -mb-px"
        : "bg-surfaceMuted text-tertiary border-transparent hover:text-ink hover:border-hairline",
  );
