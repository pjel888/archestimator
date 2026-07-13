import type { EstimateHealthRowFact, EstimatePricingProvenanceOrigin } from "./types";

export function finiteOrZero(value: number | null | undefined): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

export function isIncludedRow(row: EstimateHealthRowFact): boolean {
  return row.scopeStatus === "included";
}

export function normalizedOrigin(value: EstimatePricingProvenanceOrigin | null | undefined): EstimatePricingProvenanceOrigin {
  return value === "recorded" || value === "inherited_snapshot" || value === "synthesized_fallback" ? value : "missing";
}

export function hasExplicitProvenance(row: EstimateHealthRowFact): boolean {
  return (normalizedOrigin(row.pricingProvenanceOrigin) === "recorded" || normalizedOrigin(row.pricingProvenanceOrigin) === "inherited_snapshot")
    && Boolean(row.pricingSource?.trim())
    && toTimestamp(row.pricingDate) !== null;
}

export function toTimestamp(value: string | null | undefined): number | null {
  if (!value?.trim()) return null;
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) ? timestamp : null;
}
