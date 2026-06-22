const FALSE_VALUES = new Set(["0", "false", "no", "off"]);

export function readPublicFlag(value: string | undefined, defaultValue: boolean): boolean {
  const normalizedValue = value?.trim().toLowerCase();
  if (!normalizedValue) return defaultValue;
  if (FALSE_VALUES.has(normalizedValue)) return false;
  return true;
}

export function isLibraryDenseModeEnabled(): boolean {
  return readPublicFlag(process.env.NEXT_PUBLIC_LIBRARY_DENSE_MODE, false);
}

export function isLibraryVirtualizationEnabled(): boolean {
  return readPublicFlag(process.env.NEXT_PUBLIC_LIBRARY_VIRTUALIZATION_ENABLED, false);
}

export const WORKSHOP_VIRTUALIZATION_FLAGS = {
  tree: readPublicFlag(process.env.NEXT_PUBLIC_TREE_VIRTUALIZATION, true),
  estimateMasterColumn: readPublicFlag(process.env.NEXT_PUBLIC_EMC_VIRTUALIZATION, true),
  estimateRows: readPublicFlag(process.env.NEXT_PUBLIC_ESTIMATE_ROW_VIRTUALIZATION, true),
  estimateColumnResize: readPublicFlag(process.env.NEXT_PUBLIC_ESTIMATE_COLUMN_RESIZE_ENABLED, false),
  libraryComponents: isLibraryVirtualizationEnabled(),
} as const;

export const WORKSHOP_VIRTUALIZATION_DEFAULTS = {
  treeMinRows: 150,
  treeEstimateRowHeight: 28,
  treeOverscan: 8,
  estimateRowsMinRows: 75,
  estimateRowsEstimateRowHeight: 96,
  estimateRowsOverscan: 6,
  estimateMasterColumnMinSections: 80,
  estimateMasterColumnEstimateSectionHeight: 192,
  estimateMasterColumnOverscan: 5,
  libraryComponentsMinRows: 500,
  libraryComponentsEstimateRowHeight: 44,
  libraryComponentsOverscan: 10,
} as const;

export const WORKSHOP_TREE_VIRTUALIZATION = {
  enabled: WORKSHOP_VIRTUALIZATION_FLAGS.tree,
  minRows: WORKSHOP_VIRTUALIZATION_DEFAULTS.treeMinRows,
  estimateRowHeight: WORKSHOP_VIRTUALIZATION_DEFAULTS.treeEstimateRowHeight,
  overscan: WORKSHOP_VIRTUALIZATION_DEFAULTS.treeOverscan,
  useFlushSync: false,
  initialViewportHeight: 480,
} as const;

export const WORKSHOP_ESTIMATE_ROW_VIRTUALIZATION = {
  enabled: WORKSHOP_VIRTUALIZATION_FLAGS.estimateRows,
  minRows: WORKSHOP_VIRTUALIZATION_DEFAULTS.estimateRowsMinRows,
  estimateRowHeight: WORKSHOP_VIRTUALIZATION_DEFAULTS.estimateRowsEstimateRowHeight,
  overscan: WORKSHOP_VIRTUALIZATION_DEFAULTS.estimateRowsOverscan,
  useFlushSync: false,
  initialViewportHeight: 720,
} as const;

export const WORKSHOP_ESTIMATE_MASTER_COLUMN_VIRTUALIZATION = {
  enabled: WORKSHOP_VIRTUALIZATION_FLAGS.estimateMasterColumn,
  minSections: WORKSHOP_VIRTUALIZATION_DEFAULTS.estimateMasterColumnMinSections,
  estimateSectionHeight: WORKSHOP_VIRTUALIZATION_DEFAULTS.estimateMasterColumnEstimateSectionHeight,
  overscan: WORKSHOP_VIRTUALIZATION_DEFAULTS.estimateMasterColumnOverscan,
  useFlushSync: false,
  initialViewportHeight: 900,
} as const;

export const WORKSHOP_LIBRARY_COMPONENTS_VIRTUALIZATION = {
  enabled: WORKSHOP_VIRTUALIZATION_FLAGS.libraryComponents,
  minRows: WORKSHOP_VIRTUALIZATION_DEFAULTS.libraryComponentsMinRows,
  estimateRowHeight: WORKSHOP_VIRTUALIZATION_DEFAULTS.libraryComponentsEstimateRowHeight,
  overscan: WORKSHOP_VIRTUALIZATION_DEFAULTS.libraryComponentsOverscan,
  useFlushSync: false,
  initialViewportHeight: 720,
} as const;
