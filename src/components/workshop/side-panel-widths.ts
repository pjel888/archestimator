export type SidePanelWidthConfig = {
  storageKey: string;
  cssVariable: string;
  defaultWidth: number;
  minWidth: number;
  maxWidth: number;
  widthOffset: number;
};

export const SIDE_PANEL_WIDTH_COOKIE_PREFIX = "archestimator_panel_width_";

export const SIDE_PANEL_WIDTH_CONFIGS = [
  {
    storageKey: "estimate_sheet_tree_width",
    cssVariable: "--estimate-tree-panel-width",
    defaultWidth: 272,
    minWidth: 216,
    maxWidth: 432,
    widthOffset: 104,
  },
  {
    storageKey: "estimate_component_library_width_v2",
    cssVariable: "--estimate-library-panel-width",
    defaultWidth: 380,
    minWidth: 360,
    maxWidth: 560,
    widthOffset: 0,
  },
  {
    storageKey: "component_library_tree_width",
    cssVariable: "--component-library-tree-panel-width",
    defaultWidth: 272,
    minWidth: 216,
    maxWidth: 432,
    widthOffset: 104,
  },
  {
    storageKey: "template_library_tree_width",
    cssVariable: "--template-library-tree-panel-width",
    defaultWidth: 272,
    minWidth: 216,
    maxWidth: 432,
    widthOffset: 104,
  },
  {
    storageKey: "component_inspector_dock_width",
    cssVariable: "--component-inspector-dock-width",
    defaultWidth: 380,
    minWidth: 360,
    maxWidth: 560,
    widthOffset: 0,
  },
  {
    storageKey: "template_preview_dock_width",
    cssVariable: "--template-preview-dock-width",
    defaultWidth: 380,
    minWidth: 360,
    maxWidth: 560,
    widthOffset: 0,
  },
] as const satisfies readonly SidePanelWidthConfig[];

export function getSidePanelWidthConfig(storageKey: string) {
  return SIDE_PANEL_WIDTH_CONFIGS.find((config) => config.storageKey === storageKey) ?? null;
}

export function getSidePanelWidthCookieName(storageKey: string) {
  return `${SIDE_PANEL_WIDTH_COOKIE_PREFIX}${storageKey}`;
}

export function clampSidePanelContentWidth(
  value: number,
  minWidth: number,
  maxWidth: number,
  defaultWidth: number,
) {
  return Number.isFinite(value) ? Math.min(maxWidth, Math.max(minWidth, value)) : defaultWidth;
}

export function getSidePanelActualWidth(config: SidePanelWidthConfig, value: number) {
  return clampSidePanelContentWidth(value, config.minWidth, config.maxWidth, config.defaultWidth) + config.widthOffset;
}
