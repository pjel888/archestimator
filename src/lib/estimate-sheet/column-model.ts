import type { CSSProperties } from "react";

export type EstimateColumnId =
  | "index"
  | "select"
  | "material"
  | "quantity"
  | "contingency"
  | "subTotal"
  | "adjustment"
  | "miscCost"
  | "totalItemCosts"
  | "actions";

export type ResizableEstimateColumnId =
  | "material"
  | "quantity"
  | "contingency"
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
  { id: "material", label: "Materials", defaultWidth: 148, minWidth: 148, maxWidth: 640, resizable: true, cssVar: "--est-col-material" },
  { id: "quantity", label: "Qty", defaultWidth: 70, minWidth: 56, maxWidth: 140, resizable: true, cssVar: "--est-col-quantity" },
  { id: "contingency", label: "Contingency", defaultWidth: 104, minWidth: 82, maxWidth: 200, resizable: true, cssVar: "--est-col-contingency" },
  { id: "subTotal", label: "Subtotal", defaultWidth: 108, minWidth: 86, maxWidth: 220, resizable: true, cssVar: "--est-col-subTotal" },
  { id: "adjustment", label: "Adjustment", defaultWidth: 104, minWidth: 82, maxWidth: 200, resizable: true, cssVar: "--est-col-adjustment" },
  { id: "miscCost", label: "Misc Cost", defaultWidth: 108, minWidth: 86, maxWidth: 220, resizable: true, cssVar: "--est-col-miscCost" },
  { id: "totalItemCosts", label: "Total Item Cost", defaultWidth: 124, minWidth: 104, maxWidth: 260, resizable: true, cssVar: "--est-col-totalItemCosts" },
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

export const DEFAULT_ESTIMATE_COLUMN_TEMPLATE = "36px 32px minmax(148px,1fr) 70px 104px 108px 104px 108px 124px 30px";

export const ESTIMATE_COLUMN_TEMPLATE = [
  "36px",
  "32px",
  "minmax(var(--est-col-material, 148px), 1fr)",
  "var(--est-col-quantity, 70px)",
  "var(--est-col-contingency, 104px)",
  "var(--est-col-subTotal, 108px)",
  "var(--est-col-adjustment, 104px)",
  "var(--est-col-miscCost, 108px)",
  "var(--est-col-totalItemCosts, 124px)",
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
