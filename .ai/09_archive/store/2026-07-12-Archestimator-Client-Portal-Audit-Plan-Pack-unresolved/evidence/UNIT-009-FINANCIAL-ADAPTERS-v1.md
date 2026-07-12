# UNIT-009 Financial Adapter Receipt

## Scope and status

- **Unit:** `UNIT-009`
- **Run scope:** `IMPLEMENT_LOCAL`
- **Result:** `PASS`
- **Implementation:** `src/lib/client-portal/financial-sections.ts`.
- **Focused tests:** Client Portal focused Vitest suite — 18 passed.
- **Static verification:** isolated financial adapter TypeScript program — passed.

## Delivered contract

- Financial Summary emits issued estimate count and total only.
- Cost Breakdown aggregates immutable issued rows by discipline with deterministic descending totals and no supplier, rate, material, or source fields.
- Estimate Comparison emits per-estimate totals/row counts and a reconciled issue total.
- These versioned payloads are designed for the Unit 5 issue-builder callback and generic section delivery path.

## Acceptance review

| Acceptance claim | Evidence | Result |
|---|---|---|
| Totals reconcile | Focused test verifies all summary/breakdown/comparison totals equal the source issue total. | PASS |
| Raw sensitive facts absent | Focused test asserts private material data is absent from comparison payloads. | PASS |
| Deterministic buckets | Breakdown orders equal inputs by total then label. | PASS |

## Validation boundary

Interactive charts, chart-target discussion IDs, and section-specific visual components remain later integration work. This unit provides the immutable safe data layer.

## Next unit

`UNIT-010` owns stable recipient identity, credential lifecycle, and management operations.
