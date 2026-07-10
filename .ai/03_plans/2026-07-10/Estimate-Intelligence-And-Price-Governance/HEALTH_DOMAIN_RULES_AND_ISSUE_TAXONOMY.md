# Health Domain Rules And Issue Taxonomy

## Authority And Review Scope

This artifact is the domain-review surface for `REQ-001`, `DATA-002`, `AC-001`,
`AC-002`, `AC-009`, `AC-010`, `DEC-AUTO-001`, `DEC-AUTO-003`, and
`DEC-AUTO-004`. Stable record status remains in `plan-pack.json`; execution
remains solely in `IMPLEMENTATION_PLAN.md`.

## Canonical Health Result

The pure health boundary consumes only normalized, authorized facts and a fixed
evaluation clock. It returns compact serializable values:

- `EstimateHealthSummary`: grade, counts, priced/provenance/fresh ratios, budget
  state, total, row count, currency state, policy revision, and truncation;
- `EstimateHealthIssue`: stable rule ID, severity, message key, authorized
  estimate/row references, count, amount impact, and typed drill-through filter;
- `EstimateCostDriver`: row/category/supplier driver with amount and share; and
- an explicit evaluation version so caches/receipts cannot mix rule semantics.

The repository returns facts and issue references. UI owns localized copy,
icons, layout, and disclosure. React does not recalculate severity, grade,
freshness, budget, or row membership.

## Rule Taxonomy

| Rule ID | Condition | Severity | Drill-through |
|---|---|---|---|
| `unpriced` | Included row has `unitCost <= 0` | error | Exact row IDs |
| `quantity-missing` | Included row has non-positive effective quantity | warning | Exact row IDs |
| `provenance-missing` | Priced row has missing/synthesized origin, source, or valid explicit price date | warning | Exact row IDs |
| `price-stale` | Explicit price date is past effective stale threshold | warning | Exact row IDs |
| `price-very-stale` | Explicit price date is past effective very-stale threshold | error | Exact row IDs |
| `confidence-low` | Confidence is missing, low, unknown, or unpriced | warning | Exact row IDs |
| `source-changed` | Linked source reports changed state | warning | Exact row IDs |
| `source-discontinued` | Source component is discontinued/archived | error | Exact row IDs |
| `budget-missing` | Estimate override and project fallback are both absent | info | Settings action |
| `budget-near` | Included total is >=90% and <=100% of effective budget | warning | Budget drivers |
| `budget-over` | Included total exceeds effective budget | error | Budget drivers |

Rule IDs, severities, and filter values are versioned contracts. Display copy is
not part of rule identity. A new rule requires a stable ID, deterministic fixture,
severity rationale, exact/no-action drill-through contract, and cache/evidence
version impact.

## Evidence-Origin Contract

`pricing_provenance_origin` is one of `recorded`, `inherited_snapshot`,
`synthesized_fallback`, or `missing`. Producers persist it before display
fallback. Reads never infer `recorded` from a plausible source/date. A
`synthesized_fallback` may preserve display compatibility but cannot count as
provenance, freshness, or verified confidence. Legacy null remains `missing`.

Policy precedence is category override, workspace default, then the compatibility
fallback of 90 stale / 180 very-stale days. The effective policy revision is part
of the DTO, cache key, evaluator input, and receipt. Estimate budget overrides
project target budget; neither is converted across currency.

## Deterministic Grade And State

| Facts | Grade/state |
|---|---|
| No rows | `empty` |
| At least one error | `needs_attention` |
| No error and at least one warning | `review` |
| Rows and no warning/error | `healthy` |
| Mixed currencies | Per-estimate results; monetary comparison unavailable |
| Truncated facts | Summary marked incomplete; never `healthy` by omission |
| Repository/evaluator failure | Typed error; no cached healthy fallback |

Missing facts never improve a grade. Stable issue ordering uses severity, rule
ID, estimate ID, then row ID so repeated fixed-clock runs are byte-stable.

## Invariants And Failure Handback

- Health evaluates only rows returned by the existing authorized repository
  predicate.
- Invalid dates/numbers/shapes fail boundary parsing or become explicit missing;
  they are not normalized into healthy facts.
- Mixed currency is never one amount.
- Logs carry rule IDs, counts, duration, policy revision, truncation, and request
  ID, not project/client names, row copy, raw amounts, or actor identifiers.
- `TEST-001` proves repeated pure determinism; `TEST-003/004` prove origin/policy
  parity and repository membership.

A reviewer hands a domain failure back with rule/evaluator version, fixed clock,
normalized input, policy revision, expected/actual issue IDs and grade, and the
earliest UNIT-003/004 owner. This document does not promote evidence.

