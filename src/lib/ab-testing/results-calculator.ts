import type { ExperimentResult } from "./types";

/**
 * Standard Normal Cumulative Distribution Function approximation.
 */
function normalCDF(z: number): number {
  const p = 0.3275911;
  const a1 = 0.254829592;
  const a2 = -0.284496736;
  const a3 = 1.421413741;
  const a4 = -1.453152027;
  const a5 = 1.061405429;

  const x = z / Math.sqrt(2.0);
  const t = 1.0 / (1.0 + p * x);
  const erf = 1.0 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);
  return 0.5 * (1.0 + erf);
}

/**
 * Computes results for an A/B test.
 * Uses a Chi-Square test of independence (2x2 contingency table) to calculate the p-value.
 */
export function calculateResults(
  variantA: { views: number; conversions: number },
  variantB: { views: number; conversions: number }
): ExperimentResult {
  const rateA = variantA.views > 0 ? variantA.conversions / variantA.views : 0;
  const rateB = variantB.views > 0 ? variantB.conversions / variantB.views : 0;

  const rawUplift = rateA > 0 ? ((rateB - rateA) / rateA) * 100 : 0;
  const uplift = Math.round(rawUplift * 100) / 100;

  // Chi-Square calculation
  const totalViews = variantA.views + variantB.views;
  const totalConversions = variantA.conversions + variantB.conversions;
  const totalNonConversions = totalViews - totalConversions;

  let pValue = 1.0;
  let significant = false;

  if (totalConversions > 0 && totalNonConversions > 0) {
    const expectedAConv = (variantA.views * totalConversions) / totalViews;
    const expectedANonConv = (variantA.views * totalNonConversions) / totalViews;
    const expectedBConv = (variantB.views * totalConversions) / totalViews;
    const expectedBNonConv = (variantB.views * totalNonConversions) / totalViews;

    const chiSquare =
      Math.pow(variantA.conversions - expectedAConv, 2) / expectedAConv +
      Math.pow(variantA.views - variantA.conversions - expectedANonConv, 2) / expectedANonConv +
      Math.pow(variantB.conversions - expectedBConv, 2) / expectedBConv +
      Math.pow(variantB.views - variantB.conversions - expectedBNonConv, 2) / expectedBNonConv;

    const z = Math.sqrt(chiSquare);
    pValue = 2 * (1 - normalCDF(z));
    // Stryker disable next-line EqualityOperator: integer view/conversion counts cannot produce an exact p-value of 0.05.
    significant = pValue < 0.05;
  }

  let recommendation: "A" | "B" | "inconclusive" = "inconclusive";
  if (significant) {
    // Stryker disable next-line EqualityOperator: significance implies unequal rates, so > and >= are equivalent here.
    recommendation = rateB > rateA ? "B" : "A";
  }

  return {
    variantA: { ...variantA, rate: rateA },
    variantB: { ...variantB, rate: rateB },
    uplift,
    pValue,
    significant,
    recommendation,
  };
}
