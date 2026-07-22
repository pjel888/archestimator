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
  compactLabel?: string;
  defaultWidth: number;
  minWidth: number;
  maxWidth: number;
  resizable: boolean;
  cssVar?: `--est-col-${ResizableEstimateColumnId}`;
};

export const ESTIMATE_COLUMN_DEFINITIONS = [
  { id: "index", label: "#", defaultWidth: 28, minWidth: 28, maxWidth: 28, resizable: false },
  { id: "select", label: "Select", defaultWidth: 32, minWidth: 32, maxWidth: 32, resizable: false },
  { id: "material", label: "Materials", defaultWidth: 280, minWidth: 240, maxWidth: 640, resizable: true, cssVar: "--est-col-material" },
  { id: "quantity", label: "Qty", defaultWidth: 64, minWidth: 52, maxWidth: 140, resizable: true, cssVar: "--est-col-quantity" },
  { id: "contingency", label: "Contingency", compactLabel: "Cont.", defaultWidth: 84, minWidth: 68, maxWidth: 200, resizable: true, cssVar: "--est-col-contingency" },
  { id: "subTotal", label: "Subtotal", defaultWidth: 92, minWidth: 76, maxWidth: 220, resizable: true, cssVar: "--est-col-subTotal" },
  { id: "adjustment", label: "Adjustment", compactLabel: "Adjust.", defaultWidth: 84, minWidth: 68, maxWidth: 200, resizable: true, cssVar: "--est-col-adjustment" },
  { id: "miscCost", label: "Misc Cost", compactLabel: "Misc", defaultWidth: 92, minWidth: 76, maxWidth: 220, resizable: true, cssVar: "--est-col-miscCost" },
  { id: "totalItemCosts", label: "Total Item Cost", compactLabel: "Total", defaultWidth: 108, minWidth: 88, maxWidth: 260, resizable: true, cssVar: "--est-col-totalItemCosts" },
  { id: "actions", label: "Actions", defaultWidth: 32, minWidth: 32, maxWidth: 32, resizable: false },
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

export const DEFAULT_ESTIMATE_COLUMN_TEMPLATE = "28px 32px minmax(240px,1fr) 64px 84px 92px 84px 92px 108px 32px";

const ESTIMATE_COLUMN_TEMPLATE_TRACKS = [
  "28px",
  "32px",
  "minmax(var(--est-col-material, 280px), 1fr)",
  "var(--est-col-quantity, 64px)",
  "var(--est-col-contingency, 84px)",
  "var(--est-col-subTotal, 92px)",
  "var(--est-col-adjustment, 84px)",
  "var(--est-col-miscCost, 92px)",
  "var(--est-col-totalItemCosts, 108px)",
  "32px",
].join(" ");

export const ESTIMATE_COLUMN_TEMPLATE = `var(--estimate-column-template, ${ESTIMATE_COLUMN_TEMPLATE_TRACKS})`;

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
