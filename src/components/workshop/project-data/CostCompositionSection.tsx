"use client";

import { OKABE_ITO_SERIES_COLORS } from "@/lib/project-charts/bucket-color";
import { formatChartMoney, formatChartShare, formatSignedChartMoney } from "@/lib/project-charts/format";
import type { ProjectChartCostComposition } from "@/lib/project-charts/types";
import { cn } from "@/lib/ui/cn";

type CostCompositionSectionProps = {
  className?: string;
  composition: ProjectChartCostComposition | null | undefined;
  currencyCode: string;
  sheetName: string;
};

type Segment = {
  id: "base" | "misc" | "adjustment";
  label: string;
  value: number;
  color: string;
};

const SEGMENTS: Omit<Segment, "value">[] = [
  { id: "base", label: "Direct", color: OKABE_ITO_SERIES_COLORS[0] },
  { id: "misc", label: "Misc", color: OKABE_ITO_SERIES_COLORS[1] },
  { id: "adjustment", label: "Contingency / discount", color: OKABE_ITO_SERIES_COLORS[2] },
];

export function CostCompositionSection({ className, composition, currencyCode, sheetName }: CostCompositionSectionProps) {
  const total = finite(composition?.grandTotal);
  if (!composition || total <= 0) return null;

  const segments: Segment[] = SEGMENTS.map((segment) => ({
    ...segment,
    value:
      segment.id === "base"
        ? finite(composition.baseTotal)
        : segment.id === "misc"
          ? finite(composition.miscTotal)
          : finite(composition.adjustmentTotal),
  }));
  const positiveSegments = segments.filter((segment) => segment.value > 0);
  const positiveTotal = positiveSegments.reduce((sum, segment) => sum + segment.value, 0);
  const directShare = shareOf(composition.baseTotal, total);
  const adjustmentShare = shareOf(composition.adjustmentTotal, total);

  return (
    <section className={cn("flex min-h-0 flex-col overflow-hidden rounded-xs", className)} aria-labelledby="project-data-composition-heading">
      <div className="shrink-0 border-b border-hairline p-3">
        <h2 id="project-data-composition-heading" className="text-[12px] font-medium leading-4 text-ink">
          Cost composition
        </h2>
        <p className="mt-1.5 max-w-[72ch] text-balance text-[12px] font-medium leading-5 text-ink">
          Direct subtotal carries {formatChartShare(directShare)} of {sheetName}.
        </p>
      </div>

      <div className="min-h-0 flex-1 space-y-3 overflow-auto p-3">
        {positiveTotal > 0 ? (
          <div
            role="img"
            aria-label={`Cost composition for ${sheetName}`}
            className="flex h-4 overflow-hidden rounded-xs bg-surfaceMuted"
          >
            {positiveSegments.map((segment) => (
              <span
                key={segment.id}
                aria-hidden="true"
                className="min-w-[2px]"
                style={{
                  width: `${Math.max(0, (segment.value / positiveTotal) * 100)}%`,
                  backgroundColor: segment.color,
                }}
              />
            ))}
          </div>
        ) : null}

        <dl className="grid grid-cols-1 gap-px overflow-hidden rounded-xs border border-hairline bg-hairline sm:grid-cols-3">
          <CompositionFigure
            label="Direct"
            value={formatChartMoney(composition.baseTotal, currencyCode)}
            share={formatChartShare(shareOf(composition.baseTotal, total))}
            color={SEGMENTS[0]!.color}
          />
          <CompositionFigure
            label="Misc"
            value={formatChartMoney(composition.miscTotal, currencyCode)}
            share={formatChartShare(shareOf(composition.miscTotal, total))}
            color={SEGMENTS[1]!.color}
          />
          <CompositionFigure
            label="Contingency / discount"
            value={formatSignedChartMoney(composition.adjustmentTotal, currencyCode)}
            share={formatChartShare(adjustmentShare)}
            color={SEGMENTS[2]!.color}
          />
        </dl>

        <p className="text-[9px] leading-4 text-secondary">
          Composition reconciles to {formatChartMoney(total, currencyCode)} from pre-aggregated sheet totals.
        </p>
      </div>
    </section>
  );
}

function CompositionFigure({
  label,
  value,
  share,
  color,
}: {
  label: string;
  value: string;
  share: string;
  color: string;
}) {
  return (
    <div className="bg-white px-3 py-2">
      <dt className="inline-flex items-center gap-1.5 text-[9px] font-medium uppercase tracking-normal text-secondary">
        <span className="size-2 rounded-xs" aria-hidden="true" style={{ backgroundColor: color }} />
        {label}
      </dt>
      <dd className="mt-0.5 flex items-baseline justify-between gap-2">
        <span className="text-[12px] font-medium tabular-nums leading-tight text-ink">{value}</span>
        <span className="text-[10px] tabular-nums leading-tight text-secondary">{share}</span>
      </dd>
    </div>
  );
}

function shareOf(value: number, total: number): number {
  return total > 0 ? value / total : 0;
}

function finite(value: number | null | undefined): number {
  return Number.isFinite(value) ? Number(value) : 0;
}
