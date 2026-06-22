"use client";

import { formatChartShare, formatSignedChartMoney } from "@/lib/project-charts/format";
import { cn } from "@/lib/ui/cn";

export type DeltaBadgeProps = {
  delta: number;
  baselineTotal: number;
  currencyCode: string;
  compact?: boolean;
};

export function DeltaBadge({
  delta,
  baselineTotal,
  currencyCode,
  compact = false,
}: DeltaBadgeProps) {
  const tone = delta > 0 ? "text-danger bg-dangerSoft" : delta < 0 ? "text-success bg-successSoft" : "text-secondary bg-surfaceMuted";
  const percent = baselineTotal === 0 ? (delta === 0 ? "0%" : "new") : formatSignedShare(delta / baselineTotal);
  const signCue = delta > 0 ? "up" : delta < 0 ? "down" : "flat";

  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center rounded-xs px-1.5 py-0.5 font-medium tabular-nums leading-none",
        tone,
        compact ? "text-[8px]" : "text-[9px]",
      )}
      aria-label={`${formatSignedChartMoney(delta, currencyCode)} ${percent} ${signCue} versus baseline`}
      title={`${formatSignedChartMoney(delta, currencyCode)} (${percent}) versus baseline`}
    >
      {formatSignedChartMoney(delta, currencyCode)}
      {compact ? "" : ` · ${percent}`}
    </span>
  );
}

function formatSignedShare(value: number): string {
  if (!Number.isFinite(value)) return "0%";
  const sign = value > 0 ? "+" : value < 0 ? "−" : "";
  return `${sign}${formatChartShare(Math.abs(value))}`;
}
