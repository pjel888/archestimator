import { FinancialTotalCard } from "@/components/ui/financial-total-card";
import { formatChartMoney, formatChartShare, formatSignedChartMoney } from "@/lib/project-charts/format";
import { cn } from "@/lib/ui/cn";
import { formatRelativeTime } from "@/lib/util/relative-time";
import type { DashboardCostRollup, DashboardHeadline as DashboardHeadlineData } from "@/lib/workshop/dashboard-types";

/**
 * Zone A — the single dominant cost figure (R1). One primary (dark)
 * `FinancialTotalCard`, an honestly-labelled anchor (R2 — "Most recently
 * updated", never "Primary"), a budget-variance pill (R3), and one quiet meta
 * line (R4). No co-equal Currency or Last-updated tiles.
 */
type DashboardHeadlineProps = {
  headline: DashboardHeadlineData;
  estimateCount: number;
  rollup: DashboardCostRollup;
};

export function DashboardHeadline({ headline, estimateCount, rollup }: DashboardHeadlineProps) {
  const estimateNoun = estimateCount === 1 ? "estimate" : "estimates";
  const freshness = formatRelativeTime(headline.updatedAt);
  const rollupCaption = formatRollupCaption(rollup, estimateCount);

  return (
    <section aria-label="Cost summary" className="flex flex-col gap-2">
      <div className="relative max-w-md">
        <FinancialTotalCard
          variant="primary"
          label="Project cost"
          value={formatChartMoney(headline.total, headline.currencyCode)}
          sublabel={`Most recently updated · ${headline.name}`}
        />
        {headline.variance ? (
          <div className="absolute right-3 top-3">
            <VariancePill variance={headline.variance} currencyCode={headline.currencyCode} />
          </div>
        ) : null}
      </div>
      <p className="text-[9px] font-medium leading-3 text-secondary">
        {estimateCount} {estimateNoun}
        {rollupCaption ? ` · ${rollupCaption}` : ""}
        {freshness === "—" ? "" : ` · updated ${freshness}`}
      </p>
    </section>
  );
}

function formatRollupCaption(rollup: DashboardCostRollup, estimateCount: number): string | null {
  if (rollup.kind === "mixed") return "mixed currencies";
  // When there is only one estimate the headline already shows the total, so
  // repeating it adds noise. For multiple same-currency estimates, surface the
  // project-wide sum as a quiet caption.
  if (estimateCount > 1) {
    return `${formatChartMoney(rollup.total, rollup.currencyCode)} total`;
  }
  return null;
}

function VariancePill({
  variance,
  currencyCode,
}: {
  variance: NonNullable<DashboardHeadlineData["variance"]>;
  currencyCode: string;
}) {
  const { isOver, delta, percent } = variance;
  // Redundant, non-colour cues (R3): a direction glyph + a signed amount, so the
  // meaning survives for colour-blind and screen-reader users alike.
  const arrow = isOver ? "▲" : "▼";
  const amount = formatSignedChartMoney(delta, currencyCode);
  const share = formatChartShare(Math.abs(percent));
  const label = `${isOver ? "Over" : "Under"} budget by ${formatChartMoney(Math.abs(delta), currencyCode)} (${share})`;

  return (
    <span
      aria-label={label}
      className={cn(
        "inline-flex items-center gap-1 rounded-xs px-1.5 py-px text-[9px] font-medium leading-none tabular-nums",
        isOver ? "bg-dangerSoft text-danger" : "bg-successSoft text-success",
      )}
    >
      <span aria-hidden="true">{arrow}</span>
      <span aria-hidden="true">
        {amount} · {share}
      </span>
    </span>
  );
}
