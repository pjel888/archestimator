"use client";

import { useMemo, useState } from "react";
import { arc, pie } from "d3-shape";
import type { PieArcDatum } from "d3-shape";

import type { CostBucket } from "@/lib/charts/types";
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
  return `${prefix}${new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 }).format(value)}`;
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
    const connector = `M ${item.outerX} ${item.outerY} L ${connectorX} ${itemY} L ${item.labelX} ${itemY}`;

    callouts.push({
      x: item.labelX,
      y: itemY,
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
}: CostDonutChartProps) {
  const [activeId, setActiveId] = useState<string | null>(null);
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

  const arcs = useMemo(() => {
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

    return pieGenerator(data).map((datum) => {
      const path = arcGenerator(datum);
      if (path) return { datum, path };
      return { datum, path: fallbackArcGenerator(datum) ?? "" };
    });
  }, [activeId, data, INNER_RADIUS, OUTER_RADIUS]);

  const callouts = useMemo(() => buildCallouts(arcs, dims, currencyCode), [arcs, dims, currencyCode]);
  const activeDatum = activeId ? data.find((d) => d.id === activeId) ?? null : null;

  const emptyMinH = compact ? "h-[400px]" : "min-h-[520px]";

  // Guard against invalid data (NaN totals, negative values, or empty dataset)
  const safeTotal = Number.isFinite(total) && total > 0 ? total : 0;
  if (data.length === 0 || safeTotal <= 0) {
    return (
      <div className={`flex ${emptyMinH} flex-col items-center justify-center gap-2 rounded-xs border border-dashed border-hairline bg-surface-muted text-[10px]`}>
        <span className="text-tertiary">No cost rows</span>
        <span className="text-[9px] text-muted tabular-nums">
          buckets:{buckets.length} · total:{safeTotal}
        </span>
      </div>
    );
  }

  const centerLabel = activeDatum
    ? `${activeDatum.label}\n${formatCompactMoney(activeDatum.value, currencyCode)}\n${formatPercent(activeDatum.share)}`
    : `${formatCompactMoney(total, currencyCode)}\n${label}`;

  const centerFont = compact ? "text-[10px]" : "text-[11px]";
  const centerDy = compact ? 11 : 14;
  const calloutLabelFont = compact ? "text-[8px]" : "text-[9px]";
  const calloutValueFont = compact ? "text-[8px]" : "text-[9px]";

  // Compact path (share receiver): explicit height container guarantees the full
  // 520x400 viewBox is always visibly allocated. aspect-ratio was unreliable in
  // flex-1 + sidebar layouts across browsers, so we use a fixed height derived
  // from the viewBox ratio (400/520 * max-width ≈ 400px at full width).
  // Workshop (non-compact) path relies on SVG intrinsic sizing.
  const chartContainerClass = compact
    ? "w-full h-[400px]"
    : "mx-auto w-full max-w-[720px]";

  return (
    <div className="relative w-full" aria-label={label}>
      {/* Debug badge — always visible so user can report back what they see */}
      <div className="absolute right-1 top-1 z-10 rounded-xs bg-black/70 px-1.5 py-px text-[8px] text-white tabular-nums">
        🍩 buckets:{data.length} total:{safeTotal}
      </div>
      <div className={cn(chartContainerClass, "bg-white")}>
        <svg
          data-testid="d3-donut-chart"
          viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
          className={cn("w-full h-full block", className)}
          role="img"
          aria-label={label}
          onMouseLeave={() => setActiveId(null)}
        >
        <g>
          {arcs.map(({ datum, path }) => (
            <path
              key={datum.data.id}
              d={path}
              fill={datum.data.color}
              stroke="#fff"
              strokeWidth={1.5}
              className="cursor-pointer transition-opacity"
              style={{ opacity: activeId && activeId !== datum.data.id ? 0.4 : 1 }}
              onMouseEnter={() => setActiveId(datum.data.id)}
              onFocus={() => setActiveId(datum.data.id)}
              tabIndex={0}
              aria-label={`${datum.data.label} ${formatPercent(datum.data.share)}`}
            />
          ))}
        </g>

        {/* Center label */}
        <text
          data-testid={activeDatum ? "donut-center-detail" : "donut-center-empty"}
          x={CENTER_X}
          y={CENTER_Y}
          textAnchor="middle"
          dominantBaseline="middle"
          className={`fill-foreground font-medium ${centerFont}`}
        >
          {centerLabel.split("\n").map((line, idx) => (
            <tspan key={idx} x={CENTER_X} dy={idx === 0 ? 0 : centerDy}>
              {line}
            </tspan>
          ))}
        </text>

        {/* Callouts */}
        <g>
          {callouts.map((c) => (
            <g key={c.id} data-testid="donut-callout">
              <path d={c.connector} fill="none" stroke="#E5E5E5" strokeWidth={1} />
              <circle cx={c.x} cy={c.y} r={3} fill={c.color} />
              <text
                x={c.x + (c.anchor === "start" ? 8 : -8)}
                y={c.y - 2}
                textAnchor={c.anchor}
                className={`fill-foreground ${calloutLabelFont}`}
                fontWeight={activeId === c.id ? 600 : 400}
              >
                {c.label}
              </text>
              <text
                x={c.x + (c.anchor === "start" ? 8 : -8)}
                y={c.y + 10}
                textAnchor={c.anchor}
                className={`fill-muted-foreground tabular-nums ${calloutValueFont}`}
              >
                {c.percent} · {c.value}
              </text>
            </g>
          ))}
        </g>
      </svg>
      </div>

      <div className="sr-only" aria-live="polite">
        {activeDatum ? `${activeDatum.label} ${formatPercent(activeDatum.share)}` : ""}
      </div>
    </div>
  );
}
