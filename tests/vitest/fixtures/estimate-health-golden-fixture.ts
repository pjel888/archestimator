/**
 * Deterministic contract fixture for the Estimate Intelligence plan pack.
 *
 * This intentionally lives in tests until UNIT-003 owns the production
 * `src/lib/estimate-health/` evaluator. Do not infer provenance from the
 * display source/date values in these facts.
 */
export const ESTIMATE_HEALTH_EVALUATION_CLOCK = "2026-07-10T12:00:00.000Z";
export const ESTIMATE_HEALTH_EVALUATOR_VERSION = "estimate-health-v1";

export type EstimatePricingProvenanceOrigin =
  | "recorded"
  | "inherited_snapshot"
  | "synthesized_fallback"
  | "missing";

export type EstimateHealthFixtureRow = {
  id: string;
  estimateId: string;
  categoryNodeId: string | null;
  quantity: number;
  unitCost: number;
  amount: number;
  scopeStatus: "included" | "excluded" | "by_owner";
  pricingProvenanceOrigin: EstimatePricingProvenanceOrigin;
  pricingSource: string | null;
  pricingDate: string | null;
  linkState: "linked-clean" | "source-changed" | "unlinked";
  lifecycleState: "available" | "discontinued" | "archived";
};

export type EstimateHealthGoldenFixture = {
  clock: string;
  evaluatorVersion: string;
  workspacePolicy: { revision: number; staleDays: number; veryStaleDays: number };
  categoryPolicy: { categoryNodeId: string; revision: number; staleDays: number; veryStaleDays: number };
  projectTargetBudget: number | null;
  estimateBudget: number | null;
  rows: EstimateHealthFixtureRow[];
  revisionBoundary: {
    estimateId: string;
    baseline: { occurredAt: string; eventId: string };
    highWater: { occurredAt: string; eventId: string };
    events: Array<{
      eventId: string;
      occurredAt: string;
      estimateId: string;
      ordinal: number;
      kind: "quantity" | "rate" | "adjustment" | "misc" | "scope" | "unknown";
      amountDelta: number;
    }>;
  };
};

export const ESTIMATE_HEALTH_GOLDEN_FIXTURE: EstimateHealthGoldenFixture = {
  clock: ESTIMATE_HEALTH_EVALUATION_CLOCK,
  evaluatorVersion: ESTIMATE_HEALTH_EVALUATOR_VERSION,
  workspacePolicy: { revision: 7, staleDays: 90, veryStaleDays: 180 },
  categoryPolicy: { categoryNodeId: "category-masonry", revision: 8, staleDays: 30, veryStaleDays: 60 },
  projectTargetBudget: 1_000,
  estimateBudget: 900,
  rows: [
    { id: "healthy", estimateId: "estimate-main", categoryNodeId: null, quantity: 2, unitCost: 100, amount: 200, scopeStatus: "included", pricingProvenanceOrigin: "recorded", pricingSource: "Supplier quote", pricingDate: "2026-07-01", linkState: "linked-clean", lifecycleState: "available" },
    { id: "unpriced", estimateId: "estimate-main", categoryNodeId: null, quantity: 1, unitCost: 0, amount: 0, scopeStatus: "included", pricingProvenanceOrigin: "missing", pricingSource: null, pricingDate: null, linkState: "unlinked", lifecycleState: "available" },
    { id: "recorded", estimateId: "estimate-main", categoryNodeId: null, quantity: 1, unitCost: 20, amount: 20, scopeStatus: "included", pricingProvenanceOrigin: "recorded", pricingSource: "Manufacturer", pricingDate: "2026-07-05", linkState: "linked-clean", lifecycleState: "available" },
    { id: "inherited", estimateId: "estimate-main", categoryNodeId: null, quantity: 1, unitCost: 30, amount: 30, scopeStatus: "included", pricingProvenanceOrigin: "inherited_snapshot", pricingSource: "Saved snapshot", pricingDate: "2026-06-30", linkState: "linked-clean", lifecycleState: "available" },
    { id: "synthesized", estimateId: "estimate-main", categoryNodeId: null, quantity: 1, unitCost: 40, amount: 40, scopeStatus: "included", pricingProvenanceOrigin: "synthesized_fallback", pricingSource: "Component library", pricingDate: "2026-06-15", linkState: "linked-clean", lifecycleState: "available" },
    { id: "missing-provenance", estimateId: "estimate-main", categoryNodeId: null, quantity: 1, unitCost: 50, amount: 50, scopeStatus: "included", pricingProvenanceOrigin: "missing", pricingSource: "Plausible display source", pricingDate: "2026-07-01", linkState: "linked-clean", lifecycleState: "available" },
    { id: "category-stale", estimateId: "estimate-main", categoryNodeId: "category-masonry", quantity: 1, unitCost: 60, amount: 60, scopeStatus: "included", pricingProvenanceOrigin: "recorded", pricingSource: "Quote", pricingDate: "2026-05-20", linkState: "linked-clean", lifecycleState: "available" },
    { id: "very-stale", estimateId: "estimate-main", categoryNodeId: null, quantity: 1, unitCost: 70, amount: 70, scopeStatus: "included", pricingProvenanceOrigin: "recorded", pricingSource: "Quote", pricingDate: "2025-12-01", linkState: "linked-clean", lifecycleState: "available" },
    { id: "quantity-missing", estimateId: "estimate-main", categoryNodeId: null, quantity: 0, unitCost: 80, amount: 0, scopeStatus: "included", pricingProvenanceOrigin: "recorded", pricingSource: "Quote", pricingDate: "2026-07-01", linkState: "linked-clean", lifecycleState: "available" },
    { id: "additional-priced", estimateId: "estimate-main", categoryNodeId: null, quantity: 1, unitCost: 90, amount: 90, scopeStatus: "included", pricingProvenanceOrigin: "recorded", pricingSource: "Quote", pricingDate: "2026-07-01", linkState: "linked-clean", lifecycleState: "available" },
    { id: "source-changed", estimateId: "estimate-main", categoryNodeId: null, quantity: 1, unitCost: 100, amount: 100, scopeStatus: "included", pricingProvenanceOrigin: "recorded", pricingSource: "Quote", pricingDate: "2026-07-01", linkState: "source-changed", lifecycleState: "available" },
    { id: "discontinued", estimateId: "estimate-main", categoryNodeId: null, quantity: 1, unitCost: 110, amount: 110, scopeStatus: "included", pricingProvenanceOrigin: "recorded", pricingSource: "Quote", pricingDate: "2026-07-01", linkState: "linked-clean", lifecycleState: "discontinued" },
    { id: "excluded", estimateId: "estimate-main", categoryNodeId: null, quantity: 1, unitCost: 2_000, amount: 2_000, scopeStatus: "excluded", pricingProvenanceOrigin: "missing", pricingSource: null, pricingDate: null, linkState: "unlinked", lifecycleState: "archived" },
  ],
  revisionBoundary: {
    estimateId: "estimate-main",
    baseline: { occurredAt: "2026-07-01T00:00:00.000Z", eventId: "event-001" },
    highWater: { occurredAt: "2026-07-10T12:00:00.000Z", eventId: "event-007" },
    events: [
      { eventId: "event-002", occurredAt: "2026-07-02T00:00:00.000Z", estimateId: "estimate-main", ordinal: 0, kind: "quantity", amountDelta: 10 },
      { eventId: "event-003", occurredAt: "2026-07-03T00:00:00.000Z", estimateId: "estimate-main", ordinal: 0, kind: "rate", amountDelta: 20 },
      { eventId: "event-004", occurredAt: "2026-07-04T00:00:00.000Z", estimateId: "estimate-main", ordinal: 0, kind: "adjustment", amountDelta: 30 },
      { eventId: "event-005", occurredAt: "2026-07-05T00:00:00.000Z", estimateId: "estimate-main", ordinal: 0, kind: "misc", amountDelta: 40 },
      { eventId: "event-006", occurredAt: "2026-07-06T00:00:00.000Z", estimateId: "estimate-main", ordinal: 0, kind: "scope", amountDelta: 50 },
      { eventId: "event-007", occurredAt: "2026-07-10T12:00:00.000Z", estimateId: "estimate-main", ordinal: 0, kind: "unknown", amountDelta: 5 },
    ],
  },
};

export const ESTIMATE_HEALTH_RULE_IDS = [
  "unpriced", "quantity-missing", "provenance-missing", "price-stale", "price-very-stale",
  "source-changed", "source-discontinued", "budget-missing", "budget-near", "budget-over",
] as const;

export const ESTIMATE_ROW_PROVENANCE_PRODUCERS = [
  "library-row-insert", "estimate-sheet-copy", "estimate-tab-copy", "deleted-subtree-restore",
  "template-row-insert", "reusable-source-copy", "ai-row-insert", "ai-template-insert",
  "ai-package-replacement", "synthetic-proof-writer", "seed-writer", "unsupported-row-restore",
] as const;

export const ESTIMATE_REVISION_FACT_PRODUCERS = [
  "row-insert", "row-update", "row-replace", "row-move", "row-delete", "row-restore",
  "sheet-adjustment", "template-copy", "subtree-copy", "ai-package-mutation",
] as const;
