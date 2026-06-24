import { estimateSurfaceClass } from "@/components/workshop/estimate-surface-class";
import type { LibrarySurfaceVariant } from "./library-surface-variant";

export type LibrarySurfaceSlot =
  | "root"
  | "treeRail"
  | "centerColumn"
  | "sheetHeader"
  | "contextStrip"
  | "railPanelHeader"
  | "toolbar"
  | "rightDock"
  | "contentTile"
  | "denseTable"
  | "segmentedControl"
  | "popup"
  | "emptyState"
  | "skeleton";

export function librarySurfaceClass(variant: LibrarySurfaceVariant, slot: LibrarySurfaceSlot) {
  const glass = variant === "glass";
  switch (slot) {
    case "root":
      return glass ? estimateSurfaceClass("glass", "root") : "bg-white";
    case "treeRail":
      return glass ? estimateSurfaceClass("glass", "treeRail") : "bg-white";
    case "centerColumn":
      return glass ? estimateSurfaceClass("glass", "centerColumn") : "bg-white";
    case "sheetHeader":
      return glass ? estimateSurfaceClass("glass", "sheetHeader") : "bg-white/95 backdrop-blur";
    case "contextStrip":
      return glass ? "estimate-glass-chrome estimate-glass-divider border-b-0 bg-transparent" : "border-b border-hairline";
    case "railPanelHeader":
      return glass ? estimateSurfaceClass("glass", "railPanelHeader") : "";
    case "toolbar":
      return glass ? estimateSurfaceClass("glass", "chromeToolbar") : "";
    case "rightDock":
      return glass ? estimateSurfaceClass("glass", "libraryRail") : "border-l border-hairline bg-white";
    case "contentTile":
      return glass
        ? "rounded-xs border border-white/60 bg-white/80 shadow-[0_10px_24px_rgba(15,23,42,0.08)]"
        : "rounded-xs border border-hairline bg-white";
    case "denseTable":
      return glass ? "bg-transparent" : "bg-white";
    case "segmentedControl":
      return glass
        ? "rounded-xs border border-white/55 bg-white/55 shadow-[0_8px_20px_rgba(15,23,42,0.08)]"
        : "rounded-xs border border-hairline bg-white";
    case "popup":
      return glass
        ? "rounded-xs border border-white/60 bg-white/90 shadow-[0_18px_40px_rgba(15,23,42,0.14)] backdrop-blur"
        : "rounded-xs border border-hairline bg-white";
    case "emptyState":
      return glass
        ? "rounded-xs border border-white/55 bg-white/70"
        : "rounded-xs border border-hairline bg-white";
    case "skeleton":
      return glass
        ? "rounded-xs border border-white/40 bg-white/50"
        : "rounded-xs border border-hairline bg-white";
    default:
      return "";
  }
}
