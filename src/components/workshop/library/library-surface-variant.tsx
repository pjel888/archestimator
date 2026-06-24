"use client";

import { createContext, use, type ReactNode } from "react";

import { EstimateSurfaceVariantProvider } from "@/components/workshop/estimate-surface-variant";

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
  return use(LibrarySurfaceVariantContext);
}
