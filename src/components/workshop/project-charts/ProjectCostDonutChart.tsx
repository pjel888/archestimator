"use client";

import { useMemo, useState } from "react";
import { arc, pie } from "d3";
import type { PieArcDatum } from "d3";

import type { ProjectChartBucket } from "@/lib/project-charts/types";

type ProjectCostDonutChartProps = {
  buckets: ProjectChartBucket[];
  total: number;
  currencyCode: string;
  label: string;
};

type PieDatum = {
  id: string;
  label: string;
  value: number;
  color: string;
  share: number;
  rowCount: number;
};

const CHART_WIDTH = 720;
const CHART_HEIGHT = 560;
const CHART_CENTER_X = CHART_WIDTH / 2;
const CHART_CENTER_Y = CHART_HEIGHT / 2;
const OUTER_RADIUS = 156;
const INNER_RADIUS = 98;
const LABEL_GAP = 30;
const LABEL_MIN_Y = 44;
const LABEL_MAX_Y = CHART_HEIGHT - 44;
const LEFT_LABEL_X = 24;
const RIGHT_LABEL_X = CHART_WIDTH - 24;
const LEFT_CONNECTOR_X = CHART_CENTER_X - OUTER_RADIUS - 14;
const RIGHT_CONNECTOR_X = CHART_CENTER_X + OUTER_RADIUS + 14;

export function ProjectCostDonutChart({ buckets, total, currencyCode, label }: ProjectCostDonutChartProps) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const data: PieDatum[] = useMemo(
    () =>
      buckets
        .filter((bucket) => bucket.total > 0)
        .map((bucket) => ({
          id: bucket.id,
          label: bucket.label,
          value: bucket.total,
          color: bucket.color,
          share: bucket.share,
          rowCount: bucket.rowCount,
        })),
    [buckets],
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

    return pieGenerator(data).map((datum) => ({
      datum,
      path: arcGenerator(datum) ?? "",
    }));
  }, [activeId, data]);
  const callouts = useMemo(() => buildCallouts(arcs), [arcs]);
  const activeDatum = activeId ? data.find((datum) => datum.id === activeId) ?? null : null;

  if (data.length === 0 || total <= 0) {
    return (
      <div className="flex min-h-[520px] items-center justify-center rounded border border-dashed border-hairline text-[11px] text-muted-foreground">
        No cost rows
      </div>
    );
  }

  return (
    <figure aria-label={label} className="flex min-h-[520px] items-center justify-center" data-testid="d3-donut-chart">
      <div className="relative w-full max-w-[720px] min-w-0">
        <svg
          role="img"
          aria-label={label}
          viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}
          className="h-auto w-full overflow-visible drop-shadow-sm"
          preserveAspectRatio="xMidYMid meet"
        >
          <g transform={`translate(${CHART_CENTER_X}, ${CHART_CENTER_Y})`}>
            <circle r={OUTER_RADIUS + 1} fill="none" stroke="rgb(226 232 240)" strokeWidth={1} />
            {arcs.map(({ datum, path }) => (
              <path
                key={datum.data.id}
                d={path}
                fill={datum.data.color}
                stroke="white"
                strokeWidth={1.5}
                opacity={activeId && activeId !== datum.data.id ? 0.42 : 1}
                aria-label={`${datum.data.label}: ${formatMoney(datum.data.value, currencyCode)} (${formatPercent(datum.data.share)})`}
                className="cursor-default transition-opacity"
                tabIndex={0}
                onMouseEnter={() => setActiveId(datum.data.id)}
                onMouseLeave={() => setActiveId(null)}
                onFocus={() => setActiveId(datum.data.id)}
                onBlur={() => setActiveId(null)}
              />
            ))}
          </g>
          {callouts.map((callout) => (
            <g key={callout.id} data-testid="donut-callout">
              <path
                d={`M ${formatSvgNumber(callout.anchorX)} ${formatSvgNumber(callout.anchorY)} L ${formatSvgNumber(callout.connectorX)} ${formatSvgNumber(callout.y)} L ${formatSvgNumber(callout.lineEndX)} ${formatSvgNumber(callout.y)}`}
                fill="none"
                stroke={callout.color}
                strokeOpacity={0.72}
                strokeWidth={1}
              />
              <circle cx={formatSvgNumber(callout.anchorX)} cy={formatSvgNumber(callout.anchorY)} r={2.2} fill={callout.color} />
              <text
                x={formatSvgNumber(callout.textX)}
                y={formatSvgNumber(callout.y - 2)}
                textAnchor={callout.side === "left" ? "start" : "end"}
                className="fill-foreground"
                fontSize={10}
                fontWeight={700}
              >
                {truncateLabel(callout.label)}
              </text>
              <text
                x={formatSvgNumber(callout.textX)}
                y={formatSvgNumber(callout.y + 11)}
                textAnchor={callout.side === "left" ? "start" : "end"}
                className="fill-muted-foreground"
                fontSize={9}
                fontWeight={600}
              >
                {formatPercent(callout.share)}
              </text>
            </g>
          ))}
        </svg>
        {activeDatum ? (
          <figcaption
            className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center"
            data-testid="donut-center-detail"
          >
            <span className="max-w-36 truncate text-[10px] font-semibold text-foreground">{activeDatum.label}</span>
            <span className="text-xs font-semibold tabular-nums text-foreground">
              {formatCompactMoney(activeDatum.value, currencyCode)}
            </span>
            <span className="text-[9px] tabular-nums text-muted-foreground">{formatPercent(activeDatum.share)}</span>
          </figcaption>
        ) : (
          <figcaption aria-hidden="true" className="pointer-events-none absolute inset-0" data-testid="donut-center-empty" />
        )}
      </div>
    </figure>
  );
}

function buildCallouts(arcs: Array<{ datum: PieArcDatum<PieDatum>; path: string }>) {
  const rawCallouts = arcs.map(({ datum }) => {
    const angle = (datum.startAngle + datum.endAngle) / 2 - Math.PI / 2;
    const side: "left" | "right" = Math.cos(angle) < 0 ? "left" : "right";
    const anchorX = CHART_CENTER_X + Math.cos(angle) * (OUTER_RADIUS + 6);
    const anchorY = CHART_CENTER_Y + Math.sin(angle) * (OUTER_RADIUS + 6);
    const preferredY = CHART_CENTER_Y + Math.sin(angle) * (OUTER_RADIUS + 38);

    return {
      id: datum.data.id,
      label: datum.data.label,
      share: datum.data.share,
      color: datum.data.color,
      side,
      anchorX,
      anchorY,
      connectorX: side === "left" ? LEFT_CONNECTOR_X : RIGHT_CONNECTOR_X,
      lineEndX: side === "left" ? LEFT_LABEL_X + 112 : RIGHT_LABEL_X - 112,
      textX: side === "left" ? LEFT_LABEL_X : RIGHT_LABEL_X,
      y: preferredY,
    };
  });

  return (["left", "right"] as const).flatMap((side) => {
    const sideCallouts = rawCallouts.filter((callout) => callout.side === side).sort((left, right) => left.y - right.y);

    for (let index = 1; index < sideCallouts.length; index += 1) {
      sideCallouts[index].y = Math.max(sideCallouts[index].y, sideCallouts[index - 1].y + LABEL_GAP);
    }

    for (let index = sideCallouts.length - 1; index >= 0; index -= 1) {
      const limit = index === sideCallouts.length - 1 ? LABEL_MAX_Y : sideCallouts[index + 1].y - LABEL_GAP;
      sideCallouts[index].y = Math.min(sideCallouts[index].y, limit);
    }

    if (sideCallouts[0]) {
      sideCallouts[0].y = Math.max(sideCallouts[0].y, LABEL_MIN_Y);
    }

    return sideCallouts;
  });
}

function truncateLabel(label: string) {
  return label.length > 24 ? `${label.slice(0, 23)}...` : label;
}

function formatSvgNumber(value: number) {
  return value.toFixed(3);
}

function formatMoney(value: number, currencyCode: string) {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: currencyCode,
    maximumFractionDigits: 0,
  }).format(value);
}

function formatCompactMoney(value: number, currencyCode: string) {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: currencyCode,
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);
}

function formatPercent(value: number) {
  return new Intl.NumberFormat("en-PH", {
    style: "percent",
    maximumFractionDigits: 1,
  }).format(value);
}
