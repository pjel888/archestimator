"use client";

import { createContext, useContext, type ReactNode } from "react";

import {
  EstimateSurfaceVariantProvider,
  estimateSurfaceClass,
} from "@/components/workshop/estimate-surface-variant";

export type LibrarySurfaceVariant = "paper" | "glass";

const LibrarySurfaceVariantContext = createContext<LibrarySurfaceVariant>("paper");

export function LibrarySurfaceVariantProvider({
  variant,
  children,
}: {
  variant: LibrarySurfaceVariant;
  children: ReactNode;
}) {
  return (
    <LibrarySurfaceVariantContext.Provider value={variant}>
      <EstimateSurfaceVariantProvider variant={variant}>{children}</EstimateSurfaceVariantProvider>
    </LibrarySurfaceVariantContext.Provider>
  );
}

export function useLibrarySurfaceVariant() {
  return useContext(LibrarySurfaceVariantContext);
}

export type LibrarySurfaceSlot =
  | "root"
  | "treeRail"
  | "centerColumn"
  | "sheetHeader"
  | "contextStrip"
  | "railPanelHeader"
  | "toolbar";

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
    default:
      return "";
  }
}
