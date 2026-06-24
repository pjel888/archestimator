import type { EstimateSurfaceVariant } from "./estimate-surface-variant";

export type EstimateSurfaceSlot =
  /** Root <section> wrapping the three panels. */
  | "root"
  /** Left tree rail container. */
  | "treeRail"
  /** Right component-library rail container (and its loading fallback). */
  | "libraryRail"
  /** Centre column that holds the sheet header + scrollable grid. */
  | "centerColumn"
  /** Centre column fallback (dynamic-import skeleton) - mirrors centerColumn. */
  | "centerColumnFallback"
  /** Tree-panel sticky header inside a rail (passed as TreePanelHeader className). */
  | "railPanelHeader"
  /** Secondary toolbar row inside a rail (e.g. the library's filter/view/add row). */
  | "railToolbar"
  /** Icon-toolbar row inside a glass estimate header (passed as TreePanelHeader
   * `toolbarClassName`). The shared HeaderIconToolbar bakes in `bg-white`; in
   * glass we strip it so the parent surface reads through instead of a
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
      // overflow-hidden, which clips the rounding). Radius follows the app
      // design-system token; the root section owns a uniform gutter (gap-2 +
      // p-2), so panes never double their spacing.
      return glass
        ? "estimate-glass-rail rounded-xs"
        : "border-r border-hairline bg-white";
    case "libraryRail":
      // glass: same floating treatment; the library container lacks
      // overflow-hidden, so add it here to clip the pane corners.
      return glass
        ? "estimate-glass-rail rounded-xs overflow-hidden"
        : "border-l border-hairline bg-white";
    case "centerColumn":
    case "centerColumnFallback":
      // glass: floating near-opaque paper with a small frost gutter + rounding.
      return glass ? "estimate-glass-paper rounded-xs" : "bg-white";
    case "railPanelHeader":
      // glass: transparent over the rail's own frosted pane + soft hairline, so
      // the title/tool rows match the tree/library body instead of becoming a
      // brighter white header band. The leading `bg-transparent` lets
      // tailwind-merge strip TreePanelHeader's baked-in `bg-white`.
      // paper: no override (TreePanelHeader keeps its sticky/bg-white default).
      return glass ? "bg-transparent estimate-glass-divider" : "";
    case "railToolbar":
      // A non-sticky toolbar row inside a rail: it needs no masking wash, so
      // glass goes transparent (the frost reads through) with a soft hairline.
      return glass ? "estimate-glass-divider" : "border-b border-hairline bg-white";
    case "chromeToolbar":
      // glass: strip the HeaderIconToolbar's baked-in bg-white so the parent
      // rail/header surface reads through, not a solid-white bar. paper: leave
      // the toolbar's white intact (today's look is unchanged).
      return glass ? "bg-transparent" : "";
    case "sheetHeader":
      // glass: near-opaque masking wash + soft hairline for the center sheet,
      // where dense rows scroll underneath the sticky tab/header stack. Unlike
      // rail headers, this header still needs its own masking chrome.
      return glass
        ? "estimate-glass-chrome estimate-glass-divider"
        : "border-b border-hairline bg-white/95 backdrop-blur";
    case "gridNodeSurface":
    case "gridTableRoot":
    case "gridSiblingDivider":
      // glass: transparent so the one glass paper reads through (kills the
      // stacked-white-box look); the grid's border hairlines still structure it.
      // paper: the original solid white - the legacy paper look, unchanged.
      return glass ? "" : "bg-white";
    case "gridStickyHeader":
    case "gridTableHead":
      return glass ? "estimate-glass-headchrome" : "bg-white";
    default:
      return "";
  }
}
