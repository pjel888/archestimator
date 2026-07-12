import { finiteOrZero, hasExplicitProvenance, isIncludedRow, isLowConfidence, toTimestamp } from "./normalize";
import { getPriceFreshness, resolvePriceFreshnessPolicy } from "./price-policy";
import {
  ESTIMATE_HEALTH_EVALUATOR_VERSION,
  type EstimateHealthInput,
  type EstimateHealthIssue,
  type EstimateHealthResult,
  type EstimateHealthRuleId,
  type EstimateHealthSeverity,
} from "./types";

const severityRank: Record<EstimateHealthSeverity, number> = { error: 0, warning: 1, info: 2 };
const ruleSeverity: Record<EstimateHealthRuleId, EstimateHealthSeverity> = {
  unpriced: "error", "quantity-missing": "warning", "provenance-missing": "warning", "price-stale": "warning", "price-very-stale": "error", "confidence-low": "warning", "source-changed": "warning", "source-discontinued": "error", "budget-missing": "info", "budget-near": "warning", "budget-over": "error",
};

type IssueAccumulator = { rowIds: string[]; amountImpact: number; estimateIds: Set<string> };

export function evaluateEstimateHealth(input: EstimateHealthInput): EstimateHealthResult {
  const clock = Date.parse(input.clock);
  const includedRows = input.rows.filter(isIncludedRow).slice().sort((left, right) => left.id.localeCompare(right.id));
  const issues = new Map<EstimateHealthRuleId, IssueAccumulator>();
  const add = (ruleId: EstimateHealthRuleId, row: (typeof includedRows)[number] | null, amountImpact = 0) => {
    const current = issues.get(ruleId) ?? { rowIds: [], amountImpact: 0, estimateIds: new Set<string>() };
    if (row) {
      current.rowIds.push(row.id);
      current.estimateIds.add(row.estimateId);
    }
    current.amountImpact += amountImpact;
    issues.set(ruleId, current);
  };

  let pricedRows = 0;
  let provenanceRows = 0;
  let freshRows = 0;
  let total = 0;
  for (const row of includedRows) {
    const amount = finiteOrZero(row.amount);
    total += amount;
    const priced = finiteOrZero(row.unitCost) > 0;
    const quantityPresent = finiteOrZero(row.quantity) > 0;
    if (priced) pricedRows += 1;
    if (!priced) add("unpriced", row, amount);
    if (!quantityPresent) add("quantity-missing", row, amount);

    const provenance = priced && hasExplicitProvenance(row);
    if (provenance) provenanceRows += 1;
    if (priced && !provenance) add("provenance-missing", row, amount);

    if (provenance) {
      const categoryPolicy = input.categoryPolicies?.find((candidate) => candidate.categoryNodeId === row.categoryNodeId) ?? input.categoryPolicy;
      const policy = resolvePriceFreshnessPolicy({ workspacePolicy: input.workspacePolicy, categoryPolicy, categoryNodeId: row.categoryNodeId });
      const freshness = getPriceFreshness({ timestamp: toTimestamp(row.pricingDate), now: clock, policy });
      if (freshness === "fresh") freshRows += 1;
      if (freshness === "stale") add("price-stale", row, amount);
      if (freshness === "very-stale") add("price-very-stale", row, amount);
    }
    if (isLowConfidence(row.confidence)) add("confidence-low", row, amount);
    if (row.linkState === "source-changed") add("source-changed", row, amount);
    if (row.lifecycleState === "discontinued" || row.lifecycleState === "archived") add("source-discontinued", row, amount);
  }

  const effectiveBudget = Number.isFinite(input.estimateBudget) && (input.estimateBudget as number) >= 0
    ? { amount: input.estimateBudget as number, source: "estimate" as const }
    : Number.isFinite(input.projectTargetBudget) && (input.projectTargetBudget as number) >= 0
      ? { amount: input.projectTargetBudget as number, source: "project" as const }
      : { amount: null, source: null };
  if (includedRows.length > 0) {
    if (effectiveBudget.amount === null) add("budget-missing", null);
    else if (total > effectiveBudget.amount) add("budget-over", null, total - effectiveBudget.amount);
    else if (total >= effectiveBudget.amount * 0.9) add("budget-near", null, total);
  }

  const issueList: EstimateHealthIssue[] = [...issues.entries()].map(([ruleId, value]) => ({
    ruleId,
    severity: ruleSeverity[ruleId],
    messageKey: `estimate_health.${ruleId}` as EstimateHealthIssue["messageKey"],
    estimateId: value.estimateIds.size === 1 ? [...value.estimateIds][0] ?? null : null,
    rowIds: value.rowIds.sort(),
    count: value.rowIds.length || 1,
    amountImpact: value.amountImpact,
    filter: ruleId.startsWith("budget-") ? { kind: "budget" as const, ruleId } : { kind: "rows" as const, ruleId },
  })).sort((left, right) => severityRank[left.severity] - severityRank[right.severity] || left.ruleId.localeCompare(right.ruleId) || (left.rowIds[0] ?? "").localeCompare(right.rowIds[0] ?? ""));

  const warningCount = issueList.filter((issue) => issue.severity === "warning").length;
  const errorCount = issueList.filter((issue) => issue.severity === "error").length;
  const policy = resolvePriceFreshnessPolicy({ workspacePolicy: input.workspacePolicy });
  const budgetState = effectiveBudget.amount === null ? "missing" : total > effectiveBudget.amount ? "over" : total >= effectiveBudget.amount * 0.9 ? "near" : "under";
  return {
    summary: {
      evaluatorVersion: ESTIMATE_HEALTH_EVALUATOR_VERSION,
      grade: includedRows.length === 0 ? "empty" : errorCount > 0 ? "needs_attention" : warningCount > 0 || !Number.isFinite(clock) ? "review" : "healthy",
      rowCount: includedRows.length,
      total,
      policyRevision: policy.revision,
      pricedRatio: includedRows.length ? pricedRows / includedRows.length : 0,
      provenanceRatio: includedRows.length ? provenanceRows / includedRows.length : 0,
      freshRatio: includedRows.length ? freshRows / includedRows.length : 0,
      budget: { state: budgetState, amount: effectiveBudget.amount, source: effectiveBudget.source },
      warningCount,
      errorCount,
      incomplete: !Number.isFinite(clock),
    },
    issues: issueList,
  };
}
