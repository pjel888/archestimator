export const ESTIMATE_HEALTH_EVALUATOR_VERSION = "estimate-health-v1";

export type EstimatePricingProvenanceOrigin = "recorded" | "inherited_snapshot" | "synthesized_fallback" | "missing";
export type EstimateHealthRuleId =
  | "unpriced"
  | "quantity-missing"
  | "provenance-missing"
  | "price-stale"
  | "price-very-stale"
  | "confidence-low"
  | "source-changed"
  | "source-discontinued"
  | "budget-missing"
  | "budget-near"
  | "budget-over";
export type EstimateHealthSeverity = "info" | "warning" | "error";
export type EstimateHealthGrade = "empty" | "healthy" | "review" | "needs_attention";

export type PriceFreshnessPolicy = {
  revision: number;
  staleDays: number;
  veryStaleDays: number;
};

export type EstimateHealthRowFact = {
  id: string;
  estimateId: string;
  categoryNodeId: string | null;
  quantity: number | null;
  unitCost: number | null;
  amount: number | null;
  scopeStatus: "included" | "excluded" | "by_owner" | null;
  pricingProvenanceOrigin: EstimatePricingProvenanceOrigin | null;
  pricingSource: string | null;
  pricingDate: string | null;
  confidence: string | null;
  linkState: "linked-clean" | "source-changed" | "unlinked" | null;
  lifecycleState: "available" | "discontinued" | "archived" | null;
};

export type EstimateHealthInput = {
  clock: string;
  evaluatorVersion?: string;
  workspacePolicy: PriceFreshnessPolicy;
  categoryPolicy?: (PriceFreshnessPolicy & { categoryNodeId: string }) | null;
  categoryPolicies?: Array<PriceFreshnessPolicy & { categoryNodeId: string }>;
  projectTargetBudget: number | null;
  estimateBudget: number | null;
  rows: EstimateHealthRowFact[];
};

export type EstimateHealthIssue = {
  ruleId: EstimateHealthRuleId;
  severity: EstimateHealthSeverity;
  messageKey: `estimate_health.${EstimateHealthRuleId}`;
  estimateId: string | null;
  rowIds: string[];
  count: number;
  amountImpact: number;
  filter: { kind: "rows"; ruleId: EstimateHealthRuleId } | { kind: "budget"; ruleId: EstimateHealthRuleId };
};

export type EstimateHealthSummary = {
  evaluatorVersion: typeof ESTIMATE_HEALTH_EVALUATOR_VERSION;
  grade: EstimateHealthGrade;
  rowCount: number;
  total: number;
  policyRevision: number;
  pricedRatio: number;
  provenanceRatio: number;
  freshRatio: number;
  budget: { state: "missing" | "under" | "near" | "over"; amount: number | null; source: "estimate" | "project" | null };
  warningCount: number;
  errorCount: number;
  incomplete: boolean;
};

export type EstimateHealthResult = { summary: EstimateHealthSummary; issues: EstimateHealthIssue[] };

export type EstimateCostDriver = { id: string; amount: number; share: number };
