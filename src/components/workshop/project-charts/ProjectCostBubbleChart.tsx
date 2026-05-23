"use client";

import { useMemo } from "react";
import { hierarchy, pack } from "d3";
import type { HierarchyCircularNode } from "d3";

import type { ProjectChartBucket } from "@/lib/project-charts/types";

type ProjectCostBubbleChartProps = {
  buckets: ProjectChartBucket[];
  total: number;
  currencyCode: string;
  label: string;
};

type BubbleDatum = {
  id: string;
  label: string;
  value: number;
  color: string;
  share: number;
};

type BubbleRootDatum = { children: BubbleDatum[]; value?: never } | BubbleDatum;

const CHART_SIZE = 560;
const BUBBLE_PADDING = 6;

export function ProjectCostBubbleChart({ buckets, total, currencyCode, label }: ProjectCostBubbleChartProps) {
  const bubbles = useMemo(() => {
    const data: BubbleDatum[] = buckets
      .filter((bucket) => bucket.total > 0)
      .map((bucket) => ({
        id: bucket.id,
        label: bucket.label,
        value: bucket.total,
        color: bucket.color,
        share: bucket.share,
      }));

    const root = hierarchy<BubbleRootDatum>({ children: data })
      .sum((datum) => ("value" in datum ? datum.value ?? 0 : 0))
      .sort((left, right) => (right.value ?? 0) - (left.value ?? 0));

    const packedRoot = pack<BubbleRootDatum>()
      .size([CHART_SIZE - 2, CHART_SIZE - 2])
      .padding(BUBBLE_PADDING)(root);

    return packedRoot.leaves() as Array<HierarchyCircularNode<BubbleDatum>>;
  }, [buckets]);

  if (bubbles.length === 0 || total <= 0) {
    return (
      <div className="flex min-h-[520px] items-center justify-center rounded border border-dashed border-hairline text-[11px] text-muted-foreground">
        No cost rows
      </div>
    );
  }

  return (
    <figure aria-label={label} className="flex min-h-[520px] items-center justify-center" data-testid="d3-bubble-chart">
      <svg
        role="img"
        aria-label={label}
        viewBox={`0 0 ${CHART_SIZE} ${CHART_SIZE}`}
        className="h-auto w-full max-w-[560px]"
        preserveAspectRatio="xMidYMid meet"
      >
        {bubbles.map((bubble) => {
          const showLabel = bubble.r >= 34;
          const showValue = bubble.r >= 46;

          return (
            <g key={bubble.data.id} transform={`translate(${bubble.x + 1}, ${bubble.y + 1})`} data-testid="bubble-node">
              <circle
                r={bubble.r}
                fill={bubble.data.color}
                fillOpacity={0.84}
                stroke="white"
                strokeWidth={1.5}
                aria-label={`${bubble.data.label}: ${formatMoney(bubble.data.value, currencyCode)} (${formatPercent(bubble.data.share)})`}
              />
              <title>{`${bubble.data.label}\n${formatMoney(bubble.data.value, currencyCode)}\n${formatPercent(bubble.data.share)}`}</title>
              {showLabel ? (
                <text textAnchor="middle" className="pointer-events-none fill-white" fontSize={Math.min(11, Math.max(8, bubble.r / 5))} fontWeight={700}>
                  <tspan x={0} y={showValue ? -4 : 3}>
                    {truncateLabel(bubble.data.label, bubble.r)}
                  </tspan>
                  {showValue ? (
                    <tspan x={0} y={11} fontSize={Math.min(10, Math.max(8, bubble.r / 6))} fontWeight={600} fillOpacity={0.86}>
                      {formatPercent(bubble.data.share)}
                    </tspan>
                  ) : null}
                </text>
              ) : null}
            </g>
          );
        })}
      </svg>
    </figure>
  );
}

function truncateLabel(label: string, radius: number) {
  const maxLength = Math.max(6, Math.floor(radius / 3.2));
  return label.length > maxLength ? `${label.slice(0, maxLength - 1)}...` : label;
}

function formatMoney(value: number, currencyCode: string) {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: currencyCode,
    maximumFractionDigits: 0,
  }).format(value);
}

function formatPercent(value: number) {
  return new Intl.NumberFormat("en-PH", {
    style: "percent",
    maximumFractionDigits: 1,
  }).format(value);
}
