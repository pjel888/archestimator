"use client";

import { useMemo, useState } from "react";
import { arc, pie } from "d3-shape";
import type { PieArcDatum } from "d3-shape";

import type { CostBucket } from "@/lib/charts/types";
import { formatSvgNumber, roundSvgPath } from "@/lib/charts/svg-rounding";
import { cn } from "@/lib/ui/cn";

type CostDonutChartProps = {
  buckets: CostBucket[];
  total: number;
  currencyCode: string;
  label: string;
  /** Compact mode for constrained contexts (e.g. /share/[token] receiver next to sidebar).
   *  Uses scaled 520×400 viewBox + tighter callout padding + DESIGN-compliant smaller text.
   *  Workshop usage (no prop) remains full 720×560 unchanged.
   *  P5 polish: aspect-ratio wrapper on compact guarantees the entire viewBox (incl. side/bottom callouts)
   *  receives allocated height from flex-1 width in the share two-col + sticky sidebar layout. Prevents
   *  collapse / clipping where chart was previously invisible. Mobile stacks naturally via max-w.
   */
  compact?: boolean;
  className?: string;
  /**
   * Id of an external breakdown table that describes this chart. When set, the
   * chart's `<svg role="img">` is wired to it via `aria-describedby` so the data
   * table is the accessible surface for the donut (DESIGN.md data-viz rule;
   * WCAG 1.1.1/1.4.4/1.4.10).
   */
  describedById?: string;
  /**
   * Suppress the per-slice callouts (connectors + labels). Use when an external
   * breakdown table already carries every label/amount/share, so the donut can be
   * a clean ring in a narrow cell instead of crowding edge-anchored callouts.
   */
  hideCallouts?: boolean;
  activeBucketId?: string | null;
  onActiveBucketChange?: (bucketId: string | null) => void;
  calloutTextSize?: "default" | "large";
  /**
   * Optional class applied to the inner chart container (the explicit-size
   * wrapper around the SVG). Useful when the consumer needs a different fixed
   * size than the component's defaults, e.g. a larger dashboard donut.
   */
  containerClassName?: string;
};

type PieDatum = {
  id: string;
  label: string;
  value: number;
  color: string;
  share: number;
  rowCount: number;
};

type CalloutCandidate = {
  id: string;
  label: string;
  percent: string;
  value: string;
  color: string;
  outerX: number;
  outerY: number;
  labelX: number;
  labelYBase: number;
  y?: number;
};

// Base (full) dimensions — used by workshop charts and default receiver.
const FULL = {
  WIDTH: 720,
  HEIGHT: 560,
  OUTER_RADIUS: 156,
  INNER_RADIUS: 98,
  LABEL_GAP: 30,
  LABEL_MIN_Y: 44,
  LABEL_MAX_Y: 516, // 560-44
  LEFT_LABEL_X: 24,
  RIGHT_LABEL_X: 696,
  LEFT_CONNECTOR_X: 720 / 2 - 156 - 14,
  RIGHT_CONNECTOR_X: 720 / 2 + 156 + 14,
} as const;

// Compact dimensions for receiver contexts (share page) — ~72% scale keeps callout stacking
// and D3 logic identical while guaranteeing full visibility in flex-1 + sidebar layouts.
const COMPACT = {
  WIDTH: 520,
  HEIGHT: 400,
  OUTER_RADIUS: 112,
  INNER_RADIUS: 70,
  LABEL_GAP: 22,
  LABEL_MIN_Y: 32,
  LABEL_MAX_Y: 368,
  LEFT_LABEL_X: 16,
  RIGHT_LABEL_X: 504,
  LEFT_CONNECTOR_X: 520 / 2 - 112 - 10,
  RIGHT_CONNECTOR_X: 520 / 2 + 112 + 10,
} as const;

interface ChartDims {
  WIDTH: number;
  HEIGHT: number;
  CENTER_X: number;
  CENTER_Y: number;
  OUTER_RADIUS: number;
  INNER_RADIUS: number;
  LABEL_GAP: number;
  LABEL_MIN_Y: number;
  LABEL_MAX_Y: number;
  LEFT_LABEL_X: number;
  RIGHT_LABEL_X: number;
  LEFT_CONNECTOR_X: number;
  RIGHT_CONNECTOR_X: number;
}

function getChartDims(compact: boolean): ChartDims {
  const b = compact ? COMPACT : FULL;
  return {
    WIDTH: b.WIDTH,
    HEIGHT: b.HEIGHT,
    CENTER_X: b.WIDTH / 2,
    CENTER_Y: b.HEIGHT / 2,
    OUTER_RADIUS: b.OUTER_RADIUS,
    INNER_RADIUS: b.INNER_RADIUS,
    LABEL_GAP: b.LABEL_GAP,
    LABEL_MIN_Y: b.LABEL_MIN_Y,
    LABEL_MAX_Y: b.LABEL_MAX_Y,
    LEFT_LABEL_X: b.LEFT_LABEL_X,
    RIGHT_LABEL_X: b.RIGHT_LABEL_X,
    LEFT_CONNECTOR_X: b.LEFT_CONNECTOR_X,
    RIGHT_CONNECTOR_X: b.RIGHT_CONNECTOR_X,
  };
}

function formatCompactMoney(value: number, currencyCode: string): string {
  const abs = Math.abs(value);
  const prefix = currencyCode === "PHP" ? "₱" : currencyCode === "USD" ? "$" : `${currencyCode} `;
  if (abs >= 1_000_000) return `${prefix}${(value / 1_000_000).toFixed(1)}M`;
  if (abs >= 10_000) return `${prefix}${Math.round(value / 1000)}k`;
  // Fixed locale (matches the codebase's en-PH convention) so server and client
  // format grouping identically — an undefined locale uses the runtime default,
  // which differs between the Node server and the visitor's browser → hydration
  // mismatch on the rendered number text.
  return `${prefix}${new Intl.NumberFormat("en-PH", { maximumFractionDigits: 0 }).format(value)}`;
}

function formatPercent(share: number): string {
  return `${(share * 100).toFixed(0)}%`;
}

function truncateLabel(text: string, max = 18): string {
  if (text.length <= max) return text;
  return text.slice(0, max - 1) + "…";
}

function buildCallouts(
  arcs: Array<{ datum: PieArcDatum<PieDatum>; path: string }>,
  dims: ChartDims,
  currencyCode: string,
) {
  const {
    CENTER_X,
    CENTER_Y,
    OUTER_RADIUS,
    LABEL_MIN_Y,
    LABEL_MAX_Y,
    LABEL_GAP,
    LEFT_LABEL_X,
    RIGHT_LABEL_X,
    LEFT_CONNECTOR_X,
    RIGHT_CONNECTOR_X,
  } = dims;

  const callouts: Array<{
    x: number;
    y: number;
    anchor: "start" | "end";
    connector: string;
    label: string;
    percent: string;
    value: string;
    color: string;
    id: string;
  }> = [];

  const left: CalloutCandidate[] = [];
  const right: CalloutCandidate[] = [];

  arcs.forEach(({ datum }) => {
    const midAngle = (datum.startAngle + datum.endAngle) / 2;
    const isRight = Math.cos(midAngle) >= 0;
    const side = isRight ? right : left;

    const outerX = CENTER_X + Math.cos(midAngle) * OUTER_RADIUS;
    const outerY = CENTER_Y + Math.sin(midAngle) * OUTER_RADIUS;
    const labelX = isRight ? RIGHT_LABEL_X : LEFT_LABEL_X;
    const labelYBase = outerY;

    side.push({
      id: datum.data.id,
      label: datum.data.label,
      percent: formatPercent(datum.data.share),
      value: formatCompactMoney(datum.data.value, currencyCode),
      color: datum.data.color,
      outerX,
      outerY,
      labelX,
      labelYBase,
    });
  });

  const stack = (items: CalloutCandidate[], direction: 1 | -1) => {
    items.sort((a, b) => a.labelYBase - b.labelYBase);
    let prevY = direction > 0 ? LABEL_MIN_Y - LABEL_GAP : LABEL_MAX_Y + LABEL_GAP;
    items.forEach((item) => {
      let y = item.labelYBase;
      if (direction > 0) {
        y = Math.max(y, prevY + LABEL_GAP);
        y = Math.min(y, LABEL_MAX_Y);
      } else {
        y = Math.min(y, prevY - LABEL_GAP);
        y = Math.max(y, LABEL_MIN_Y);
      }
      item.y = y;
      prevY = y;
    });
  };

  stack(left, 1);
  stack(right, -1);

  [...left, ...right].forEach((item) => {
    const isRight = item.labelX > CENTER_X;
    const connectorX = isRight ? RIGHT_CONNECTOR_X : LEFT_CONNECTOR_X;
    const itemY = item.y ?? item.labelYBase;
    const connector = roundSvgPath(`M ${item.outerX} ${item.outerY} L ${connectorX} ${itemY} L ${item.labelX} ${itemY}`);

    callouts.push({
      x: Number(formatSvgNumber(item.labelX)),
      y: Number(formatSvgNumber(itemY)),
      anchor: isRight ? "start" : "end",
      connector,
      label: truncateLabel(item.label),
      percent: item.percent,
      value: item.value,
      color: item.color,
      id: item.id,
    });
  });

  return callouts;
}

export function CostDonutChart({
  buckets,
  total,
  currencyCode,
  label,
  compact = false,
  className,
  describedById,
  hideCallouts = false,
  containerClassName,
  activeBucketId,
  onActiveBucketChange,
  calloutTextSize = "default",
}: CostDonutChartProps) {
  const [uncontrolledActiveId, setUncontrolledActiveId] = useState<string | null>(null);
  const activeId = activeBucketId !== undefined ? activeBucketId : uncontrolledActiveId;
  const setActiveId = (bucketId: string | null) => {
    if (activeBucketId === undefined) setUncontrolledActiveId(bucketId);
    onActiveBucketChange?.(bucketId);
  };
  const dims = getChartDims(compact);
  const {
    WIDTH,
    HEIGHT,
    CENTER_X,
    CENTER_Y,
    OUTER_RADIUS,
    INNER_RADIUS,
  } = dims;

  const data: PieDatum[] = useMemo(
    () =>
      buckets
        .filter((bucket) => Number.isFinite(bucket.total) && bucket.total > 0)
        .map((bucket) => ({
          id: bucket.id,
          label: bucket.label,
          value: bucket.total,
          color: bucket.color,
          share: Number.isFinite(bucket.share) ? bucket.share : 0,
          rowCount: bucket.rowCount,
        })),
    [buckets]
  );

  const pieGenerator = pie<PieDatum>()
    .value((datum) => datum.value)
    .sort(null)
    .padAngle(0.012);

  const arcGenerator = arc<PieArcDatum<PieDatum>>()
    .innerRadius(INNER_RADIUS)
    .outerRadius((datum) => (datum.data.id === activeId ? OUTER_RADIUS + 4 : OUTER_RADIUS))
    .cornerRadius(3);

  // Fallback arc without corner radius for edge cases (e.g. full-circle single slice)
  const fallbackArcGenerator = arc<PieArcDatum<PieDatum>>()
    .innerRadius(INNER_RADIUS)
    .outerRadius((datum) => (datum.data.id === activeId ? OUTER_RADIUS + 4 : OUTER_RADIUS));

  const arcs = pieGenerator(data).map((datum) => {
    const path = arcGenerator(datum);
    if (path) return { datum, path: roundSvgPath(path) };
    return { datum, path: roundSvgPath(fallbackArcGenerator(datum) ?? "") };
  });

  const callouts = buildCallouts(arcs, dims, currencyCode);
  const activeDatum = activeId ? data.find((d) => d.id === activeId) ?? null : null;

  const emptyMinH = compact ? "h-[400px]" : "min-h-[520px]";

  // Guard against invalid data (NaN totals, negative values, or empty dataset)
  const safeTotal = Number.isFinite(total) && total > 0 ? total : 0;
  if (data.length === 0 || safeTotal <= 0) {
    return (
      <div className={`flex ${emptyMinH} flex-col items-center justify-center gap-2 rounded-xs border border-dashed border-hairline bg-surface-muted text-[10px]`}>
        <span className="text-tertiary">No cost rows</span>
      </div>
    );
  }

  const centerLabel = activeDatum
    ? `${truncateLabel(activeDatum.label, hideCallouts ? 16 : 18)}\n${formatCompactMoney(activeDatum.value, currencyCode)}\n${formatPercent(activeDatum.share)}`
    : `${formatCompactMoney(total, currencyCode)}\n${label}`;

  const centerFont = compact ? "text-[10px]" : "text-[11px]";
  const centerDy = compact ? 11 : 14;
  const calloutLabelFont = calloutTextSize === "large" ? "text-[11px]" : compact ? "text-[8px]" : "text-[9px]";
  const calloutValueFont = calloutTextSize === "large" ? "text-[11px]" : compact ? "text-[8px]" : "text-[9px]";

  // Callout-less mode (dashboard cost mix): the breakdown table carries the
  // detail, so crop the viewBox tight around the ring (centred on CENTER_X/Y) to
  // drop the empty callout band and render a clean, fully-sized ring in a small
  // square cell. A fixed-pixel square container avoids the percentage-height-on-
  // aspect-ratio collapse the comment below describes.
  const labelCenterX = CENTER_X;
  const labelCenterY = CENTER_Y;
  const ringPadding = 12;
  const ringExtent = (OUTER_RADIUS + ringPadding) * 2;
  const viewBox = hideCallouts
    ? `${formatSvgNumber(CENTER_X - ringExtent / 2)} ${formatSvgNumber(CENTER_Y - ringExtent / 2)} ${ringExtent} ${ringExtent}`
    : `0 0 ${WIDTH} ${HEIGHT}`;

  // Compact path (share receiver): explicit height container guarantees the full
  // 520x400 viewBox is always visibly allocated. aspect-ratio was unreliable in
  // flex-1 + sidebar layouts across browsers (percentage height resolves to 0),
  // so we use an explicit height. Workshop (non-compact) path relies on SVG
  // intrinsic sizing.
  const chartContainerClass = hideCallouts
    ? "mx-auto h-[190px] w-[190px] max-w-full"
    : compact
      ? "w-full h-[400px]"
      : "mx-auto w-full max-w-[720px]";

  return (
    <div className="relative w-full" aria-label={label}>
      <div className={cn(chartContainerClass, "bg-white", containerClassName)}>
        <svg
          data-testid="d3-donut-chart"
          viewBox={viewBox}
          className={cn("w-full h-full block", className)}
          role="img"
          aria-label={label}
          aria-describedby={describedById}
          onMouseLeave={() => setActiveId(null)}
        >
        {/* Arc geometry is generated by d3 around the user-space origin;
            translate it to the chart centre so the ring stays concentric with
            the center label in both full and cropped (hideCallouts) viewBoxes. */}
        <g transform={`translate(${formatSvgNumber(CENTER_X)}, ${formatSvgNumber(CENTER_Y)})`}>
          {arcs.map(({ datum, path }) => (
            <path
              key={datum.data.id}
              d={path}
              fill={datum.data.color}
              stroke="#fff"
              strokeWidth={1.5}
              className="cursor-pointer transition-opacity motion-reduce:transition-none"
              style={{ opacity: activeId && activeId !== datum.data.id ? 0.4 : 1 }}
              onMouseEnter={() => setActiveId(datum.data.id)}
              onFocus={() => setActiveId(datum.data.id)}
              tabIndex={0}
              aria-label={`${datum.data.label} ${formatPercent(datum.data.share)}`}
            />
          ))}
        </g>

        {/* Center label. The wedge geometry is centered on the user-space origin
            (d3 arc), while the chart's nominal centre is (CENTER_X, CENTER_Y); in
            callout-less mode we crop the viewBox to the origin, so the label rides
            the origin too to stay concentric with the ring. */}
        <text
          data-testid={activeDatum ? "donut-center-detail" : "donut-center-empty"}
          x={formatSvgNumber(labelCenterX)}
          y={formatSvgNumber(labelCenterY)}
          textAnchor="middle"
          dominantBaseline="middle"
          className={`fill-foreground font-medium ${centerFont}`}
        >
          {centerLabel.split("\n").map((line, idx) => (
            <tspan key={idx} x={formatSvgNumber(labelCenterX)} dy={idx === 0 ? 0 : formatSvgNumber(centerDy)}>
              {line}
            </tspan>
          ))}
        </text>

        {/* Callouts */}
        {!hideCallouts && (
        <g>
          {callouts.map((c) => (
            <g key={c.id} data-testid="donut-callout">
              {/* Callout connector — the only link between slice and label, so it
                  is a "graphical object" under WCAG 1.4.11. Darkened from #E5E5E5
                  (~1.3:1) to #8f8f8f (~3.2:1) to clear the 3:1 floor (`06` A11Y-4). */}
              <path d={c.connector} fill="none" stroke="#8f8f8f" strokeWidth={1} />
              <circle cx={formatSvgNumber(c.x)} cy={formatSvgNumber(c.y)} r={formatSvgNumber(3)} fill={c.color} />
              <text
                x={formatSvgNumber(c.x + (c.anchor === "start" ? 8 : -8))}
                y={formatSvgNumber(c.y - 2)}
                textAnchor={c.anchor}
                className={`fill-foreground ${calloutLabelFont}`}
                fontWeight={activeId === c.id ? 500 : 400}
              >
                {c.label}
              </text>
              <text
                x={formatSvgNumber(c.x + (c.anchor === "start" ? 8 : -8))}
                y={formatSvgNumber(c.y + 10)}
                textAnchor={c.anchor}
                className={`fill-muted-foreground tabular-nums ${calloutValueFont}`}
              >
                {c.percent} · {c.value}
              </text>
            </g>
          ))}
        </g>
        )}
      </svg>
      </div>

      <div className="sr-only" aria-live="polite">
        {activeDatum ? `${activeDatum.label} ${formatPercent(activeDatum.share)}` : ""}
      </div>
    </div>
  );
}
