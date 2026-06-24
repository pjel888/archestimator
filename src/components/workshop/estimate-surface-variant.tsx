"use client";

import { createContext, use, type ReactNode } from "react";

/**
 * Surface variant for the estimate-sheet hero workspace.
 *
 * - "glass": the liquid-glass design — translucent frosted rails + a floating
 *   near-opaque "paper" centre, layered on the workspace's existing frost
 *   shell. This is the live estimate surface. See `.estimate-glass-*` in
 *   globals.css.
 * - "paper": the legacy solid-white panels. The class constants below resolve
 *   to the EXACT strings the components originally shipped with. No live route
 *   renders it today; it stays the context default so any subtree rendered
 *   outside a provider falls back to the plain, un-frosted look.
 *
 * The variant flows through React context so the three deeply-nested,
 * dynamically-imported surface components (tree, sheet content, library) can
 * read it without prop-drilling.
 */
export type EstimateSurfaceVariant = "paper" | "glass";

const EstimateSurfaceVariantContext = createContext<EstimateSurfaceVariant>("paper");

export function EstimateSurfaceVariantProvider({
  variant,
  children,
}: {
  variant: EstimateSurfaceVariant;
  children: ReactNode;
}) {
  return (
    <EstimateSurfaceVariantContext.Provider value={variant}>
      {children}
    </EstimateSurfaceVariantContext.Provider>
  );
}

export function useEstimateSurfaceVariant(): EstimateSurfaceVariant {
  return use(EstimateSurfaceVariantContext);
}
