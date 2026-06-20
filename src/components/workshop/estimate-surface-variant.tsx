"use client";

import { createContext, useContext, type ReactNode } from "react";

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
  return useContext(EstimateSurfaceVariantContext);
}

/**
 * Single source of truth for every surface className that differs between the
 * two variants. Each slot returns ONLY the surface-specific portion; call sites
 * keep their stable layout classes and merge this via `cn(...)`. The "paper"
 * branch always returns the original literal so the live route never shifts.
 */
export type EstimateSurfaceSlot =
  /** Root <section> wrapping the three panels. */
  | "root"
  /** Left tree rail container. */
  | "treeRail"
  /** Right component-library rail container (and its loading fallback). */
  | "libraryRail"
  /** Centre column that holds the sheet header + scrollable grid. */
  | "centerColumn"
  /** Centre column fallback (dynamic-import skeleton) — mirrors centerColumn. */
  | "centerColumnFallback"
  /** Tree-panel sticky header inside a rail (passed as TreePanelHeader className). */
  | "railPanelHeader"
  /** Secondary toolbar row inside a rail (e.g. the library's filter/view/add row). */
  | "railToolbar"
  /** Icon-toolbar row INSIDE a chrome header (passed as TreePanelHeader
   * `toolbarClassName`). The shared HeaderIconToolbar bakes in `bg-white`; in
   * glass we strip it so the frosted chrome wash reads through instead of a
   * solid-white bar. */
  | "chromeToolbar"
  /** Sheet sticky header inside the centre column. */
  | "sheetHeader"
  /** Node-card / row-table / sibling-spacer FILL inside the centre paper. In
   * paper these are solid white; in glass they go transparent so the single
   * `.estimate-glass-paper` surface reads through (no stacked white boxes on the
   * glass). The grid's own border hairlines stay and carry the structure. */
  | "gridNodeSurface"
  | "gridSiblingDivider"
  | "gridTableRoot"
  /** Sticky grid headers (node-group header wrapper + the row-table column
   * `<thead>`) that dense cost rows scroll under: paper white, glass a cool
   * frosted `.estimate-glass-headchrome` wash that masks without going stark. */
  | "gridStickyHeader"
  | "gridTableHead";

export function estimateSurfaceClass(
  variant: EstimateSurfaceVariant,
  slot: EstimateSurfaceSlot,
): string {
  const glass = variant === "glass";
  switch (slot) {
    case "root":
      // paper: opaque white workspace. glass: a cool grey "well" so the gutters
      // around the floating panes read as the grey canvas and the bright panes
      // visibly float on it (reference-faithful), instead of sitting on the
      // near-white shell frost where the float barely registers.
      return glass ? "estimate-glass-well" : "bg-white";
    case "treeRail":
      // glass: the rail is a floating frosted pane (the tree container carries
      // overflow-hidden, which clips the rounding). Radius = 8px on the OUTER
      // floating panes — matching the reference glass family's 8px nav / 12px
      // panel radii — while inner dense grid cells stay 3px for legibility. No
      // own margin: the root section owns a uniform 8px gutter (gap-2 + p-2), so
      // the gutter equals the inner padding and panes never double their spacing.
      return glass
        ? "estimate-glass-rail rounded-[8px]"
        : "border-r border-hairline bg-white";
    case "libraryRail":
      // glass: same floating treatment; the library container lacks
      // overflow-hidden, so add it here to clip the rounded corners.
      return glass
        ? "estimate-glass-rail rounded-[8px] overflow-hidden"
        : "border-l border-hairline bg-white";
    case "centerColumn":
    case "centerColumnFallback":
      // glass: floating near-opaque paper with a small frost gutter + rounding.
      return glass ? "estimate-glass-paper rounded-[8px]" : "bg-white";
    case "railPanelHeader":
      // glass: near-opaque masking wash + soft hairline. The leading
      // `bg-transparent` lets tailwind-merge strip TreePanelHeader's baked-in
      // `bg-white`; `.estimate-glass-chrome` (unlayered) then paints the wash.
      // paper: no override (TreePanelHeader keeps its sticky/bg-white default).
      return glass ? "bg-transparent estimate-glass-chrome estimate-glass-divider" : "";
    case "railToolbar":
      // A non-sticky toolbar row inside a rail: it needs no masking wash, so
      // glass goes transparent (the frost reads through) with a soft hairline.
      return glass ? "estimate-glass-divider" : "border-b border-hairline bg-white";
    case "chromeToolbar":
      // glass: strip the HeaderIconToolbar's baked-in bg-white so the frosted
      // chrome wash on the wrapper reads as glass, not a solid-white bar. paper:
      // leave the toolbar's white intact (today's look is unchanged).
      return glass ? "bg-transparent" : "";
    case "sheetHeader":
      return glass
        ? "estimate-glass-chrome estimate-glass-divider"
        : "border-b border-hairline bg-white/95 backdrop-blur";
    case "gridNodeSurface":
    case "gridSiblingDivider":
    case "gridTableRoot":
      // glass: transparent so the one glass paper reads through (kills the
      // stacked-white-box look); the grid's border hairlines still structure it.
      // paper: the original solid white — the legacy paper look, unchanged.
      return glass ? "" : "bg-white";
    case "gridStickyHeader":
    case "gridTableHead":
      // glass: cool frosted wash that masks rows scrolling under the sticky head.
      // paper: solid white (unchanged).
      return glass ? "estimate-glass-headchrome" : "bg-white";
    default:
      return "";
  }
}
