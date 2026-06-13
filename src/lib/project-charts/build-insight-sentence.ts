/**
 * Insight sentence generator (`09` P-1.3 / `08` copy template).
 *
 * Turns the comparison view-model's insight inputs into the one human sentence
 * that IS the product: "{Comparand} is {₱Δ} ({Δ%}) {lower|higher} than {Baseline},
 * driven mostly by {topBucket} ({±₱})[ and {second} ({±₱})]."
 *
 * Pure and deterministic. Covers the four required cases:
 *   - single dominant driver  → one "driven mostly by" clause
 *   - two drivers             → "… and …" clause
 *   - no clear driver / equal → no driver clause, "about the same" wording
 *   - deltaPercent null       → render "new" (baseline bucket was 0), never "∞%"
 */
import type { ProjectChartComparisonInsightInput } from "./project-comparison-view";

export type ProjectChartInsight = {
  /** Full sentence for screen readers and inline copy. */
  sentence: string;
  /** "lower" | "higher" | "equal" — drives the success/danger accent. */
  direction: "lower" | "higher" | "equal";
};

export function buildInsightSentence(insight: ProjectChartComparisonInsightInput | null): ProjectChartInsight | null {
  if (!insight) {
    return null;
  }

  const {
    baselineName,
    comparandName,
    delta,
    deltaPercent,
    direction,
    currencyCode,
    topDrivers,
  } = insight;

  if (direction === "equal") {
    return {
      sentence: `${comparandName} costs about the same as ${baselineName}${driverClause(topDrivers, currencyCode)}.`,
      direction,
    };
  }

  const amount = formatMoney(Math.abs(delta), currencyCode);
  const percentText = formatDeltaPercent(deltaPercent);
  const percentClause = percentText ? ` (${percentText})` : "";

  return {
    sentence: `${comparandName} is ${amount}${percentClause} ${direction} than ${baselineName}${driverClause(topDrivers, currencyCode)}.`,
    direction,
  };
}

function driverClause(
  drivers: ProjectChartComparisonInsightInput["topDrivers"],
  currencyCode: string,
): string {
  if (drivers.length === 0) {
    return "";
  }
  const parts = drivers.map((driver) => `${driver.label} (${formatSignedMoney(driver.delta, currencyCode)})`);
  if (parts.length === 1) {
    return `, driven mostly by ${parts[0]}`;
  }
  return `, driven mostly by ${parts[0]} and ${parts[1]}`;
}

/** Δ% as a signed percent, or "new" when the baseline bucket/total was 0. */
export function formatDeltaPercent(deltaPercent: number | null): string {
  if (deltaPercent === null) {
    return "new";
  }
  if (deltaPercent === 0) {
    return "0%";
  }
  const sign = deltaPercent > 0 ? "+" : "−";
  return `${sign}${Math.abs(deltaPercent * 100).toFixed(1)}%`;
}

function formatMoney(value: number, currencyCode: string): string {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: currencyCode,
    maximumFractionDigits: 0,
  }).format(value);
}

function formatSignedMoney(value: number, currencyCode: string): string {
  const sign = value > 0 ? "+" : value < 0 ? "−" : "";
  return `${sign}${formatMoney(Math.abs(value), currencyCode)}`;
}
