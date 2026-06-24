import type { CSSProperties } from "react";

export type EstimateColumnId =
  | "index"
  | "select"
  | "material"
  | "quantity"
  | "subTotal"
  | "adjustment"
  | "miscCost"
  | "totalItemCosts"
  | "actions";

export type ResizableEstimateColumnId =
  | "material"
  | "quantity"
  | "subTotal"
  | "adjustment"
  | "miscCost"
  | "totalItemCosts";

export type EstimateColumnWidths = Partial<Record<ResizableEstimateColumnId, number>>;

export type EstimateColumnDefinition = {
  id: EstimateColumnId;
  label: string;
  defaultWidth: number;
  minWidth: number;
  maxWidth: number;
  resizable: boolean;
  cssVar?: `--est-col-${ResizableEstimateColumnId}`;
};

export const ESTIMATE_COLUMN_DEFINITIONS = [
  { id: "index", label: "#", defaultWidth: 36, minWidth: 36, maxWidth: 36, resizable: false },
  { id: "select", label: "Select", defaultWidth: 32, minWidth: 32, maxWidth: 32, resizable: false },
  { id: "material", label: "Materials", defaultWidth: 160, minWidth: 160, maxWidth: 640, resizable: true, cssVar: "--est-col-material" },
  { id: "quantity", label: "Qty", defaultWidth: 58, minWidth: 52, maxWidth: 140, resizable: true, cssVar: "--est-col-quantity" },
  { id: "subTotal", label: "Subtotal", defaultWidth: 92, minWidth: 76, maxWidth: 220, resizable: true, cssVar: "--est-col-subTotal" },
  { id: "adjustment", label: "Adjustment", defaultWidth: 106, minWidth: 92, maxWidth: 240, resizable: true, cssVar: "--est-col-adjustment" },
  { id: "miscCost", label: "Misc Cost", defaultWidth: 92, minWidth: 76, maxWidth: 220, resizable: true, cssVar: "--est-col-miscCost" },
  { id: "totalItemCosts", label: "Total Item Cost", defaultWidth: 108, minWidth: 88, maxWidth: 260, resizable: true, cssVar: "--est-col-totalItemCosts" },
  { id: "actions", label: "Actions", defaultWidth: 30, minWidth: 30, maxWidth: 30, resizable: false },
] as const satisfies readonly EstimateColumnDefinition[];

export const RESIZABLE_ESTIMATE_COLUMN_IDS = ESTIMATE_COLUMN_DEFINITIONS.flatMap((column) =>
  column.resizable ? [column.id] : [],
) as ResizableEstimateColumnId[];

export const DEFAULT_ESTIMATE_COLUMN_WIDTHS = Object.freeze(
  Object.fromEntries(
    ESTIMATE_COLUMN_DEFINITIONS.flatMap((column) =>
      column.resizable ? [[column.id, column.defaultWidth] as const] : [],
    ),
  ),
) as Readonly<Record<ResizableEstimateColumnId, number>>;

export const EMPTY_ESTIMATE_COLUMN_WIDTHS = Object.freeze({}) as Readonly<EstimateColumnWidths>;

export const DEFAULT_ESTIMATE_COLUMN_TEMPLATE = "36px 32px minmax(160px,1fr) 58px 92px 106px 92px 108px 30px";

export const ESTIMATE_COLUMN_TEMPLATE = [
  "36px",
  "32px",
  "minmax(var(--est-col-material, 160px), 1fr)",
  "var(--est-col-quantity, 58px)",
  "var(--est-col-subTotal, 92px)",
  "var(--est-col-adjustment, 106px)",
  "var(--est-col-miscCost, 92px)",
  "var(--est-col-totalItemCosts, 108px)",
  "30px",
].join(" ");

const RESIZABLE_COLUMN_SET = new Set<EstimateColumnId>(RESIZABLE_ESTIMATE_COLUMN_IDS);

export function isResizableEstimateColumnId(id: EstimateColumnId): id is ResizableEstimateColumnId {
  return RESIZABLE_COLUMN_SET.has(id);
}

function getEstimateColumnDefinition(id: EstimateColumnId) {
  return ESTIMATE_COLUMN_DEFINITIONS.find((column) => column.id === id);
}

export function getResizableEstimateColumnDefinition(id: ResizableEstimateColumnId) {
  const definition = getEstimateColumnDefinition(id);
  if (!definition?.resizable) throw new Error(`Unknown resizable estimate column: ${id}`);
  return definition;
}

export function estimateColumnCssVar(id: ResizableEstimateColumnId) {
  return `--est-col-${id}` as const;
}

export function clampEstimateColumnWidth(id: ResizableEstimateColumnId, value: number) {
  const definition = getResizableEstimateColumnDefinition(id);
  if (!Number.isFinite(value)) return definition.defaultWidth;
  return Math.min(Math.max(Math.round(value), definition.minWidth), definition.maxWidth);
}

export function normalizeEstimateColumnWidths(widths: EstimateColumnWidths | null | undefined): EstimateColumnWidths {
  if (!widths) return EMPTY_ESTIMATE_COLUMN_WIDTHS;
  const normalized: EstimateColumnWidths = {};
  for (const id of RESIZABLE_ESTIMATE_COLUMN_IDS) {
    const rawValue = widths[id];
    if (rawValue === undefined) continue;
    const clampedValue = clampEstimateColumnWidth(id, rawValue);
    if (clampedValue !== DEFAULT_ESTIMATE_COLUMN_WIDTHS[id]) normalized[id] = clampedValue;
  }
  return Object.keys(normalized).length > 0 ? normalized : EMPTY_ESTIMATE_COLUMN_WIDTHS;
}

export function resolveEstimateColumnWidth(widths: EstimateColumnWidths | null | undefined, id: ResizableEstimateColumnId) {
  return clampEstimateColumnWidth(id, widths?.[id] ?? DEFAULT_ESTIMATE_COLUMN_WIDTHS[id]);
}

export function buildEstimateColumnVars(widths: EstimateColumnWidths | null | undefined): CSSProperties {
  const vars: Record<string, string> = {};
  for (const id of RESIZABLE_ESTIMATE_COLUMN_IDS) {
    vars[estimateColumnCssVar(id)] = `${resolveEstimateColumnWidth(widths, id)}px`;
  }
  return vars as CSSProperties;
}
