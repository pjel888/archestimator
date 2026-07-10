# Calculation Domain Invariants And Rounding

## Authority And Review Scope

This is the independently reviewable domain contract for `REQ-001`, `REQ-002`,
`DATA-001`, `AC-001` through `AC-006`, and `DEC-AUTO-001` through
`DEC-AUTO-004`. It does not define execution order or status. `plan-pack.json`
remains machine authority and `IMPLEMENTATION_PLAN.md` remains the sole
canonical execution artifact.

## Named Total Bases

| Basis | Membership | Charges | Consumers |
|---|---|---|---|
| `working_estimate` | Every active row, including proposal-excluded/by-owner rows | Canonical row cost parts and sheet adjustment; no proposal charges | Editor and Project Data/charts |
| `proposal_included_direct` | Active rows with explicit `included`; legacy missing scope maps to included | Canonical row cost parts and sheet adjustment | Publication/share, preview, export direct-cost blocks |
| `final_proposal` | Same rows as proposal-included direct | Direct cost, then proposal contingency, then VAT under existing settings order | Preview and XLSX final total |

Unlike bases are reconciled, not forced equal. Archived tabs, nodes, and rows
enter no active basis. Mixed currencies remain separate totals; this pack never
converts currency.

## Canonical Cost-Part Order

1. Validate finite, bounded input before arithmetic.
2. Normalize quantity to six decimal places.
3. Validate quantity-base plus contingency congruence when base mode exists.
4. Compute material and labor components from the normalized quantity.
5. Apply the legacy row adjustment only when quantity-base mode is absent.
6. Add `misc_cost` as its own cost part.
7. Convert each part to integer minor units with symmetric signed rounding.
8. Sum parts only after checking each conversion, product, and addition with
   `Number.isSafeInteger`.
9. Aggregate rows by the declared basis, then apply sheet and proposal charge
   stages once in the documented order.

The existing `computeEstimateRowLineTotal` export remains a compatibility
wrapper around the evolved oracle. No UI, SQL, snapshot, or workbook module may
become a second formula owner.

## Closed Numeric Domain

| Input | Allowed contract | Refusal |
|---|---|---|
| Quantity, material rate, labor rate, misc | Finite and non-negative | `invalid_calculation_input` |
| Quantity contingency | Signed only when the six-decimal effective quantity agrees with canonical quantity | `invalid_calculation_input` |
| Row/sheet adjustment | `[-100, 1000]` percent | `invalid_calculation_input` |
| Proposal contingency and VAT | `[0, 100]` percent | `invalid_calculation_input` |
| Currency | Supported normalized code; no conversion | typed unsupported/mixed-currency refusal |
| Minor-unit intermediate | Safe integer at every stage | `amount_out_of_range` |

Missing optional values may use only an explicitly documented compatibility
default. A supplied invalid number is never coerced to zero. Overflow, `NaN`,
Infinity, invalid percentage, and quantity mismatch block publication/export;
they never yield a clamped or partial result.

## Rounding And Currency Invariants

- Material, labor, adjustment, and misc round independently to minor units
  before aggregation.
- Negative discounts use symmetric signed rounding.
- Proposal contingency and VAT round from their immediate canonical base.
- Formula-on cached values and formula-off scalar cells use the same minor-unit
  source.
- Currency scale and display metadata are attached to the canonical result.
  Enabling a zero- or three-decimal currency requires an explicit versioned
  extension; two decimals are not silently generalized.
- A legacy issued snapshot keeps its stored row totals. Reads do not reinterpret
  historical content under new formula semantics.

## Failure And Recovery Matrix

| Condition | Required behavior | Recovery owner |
|---|---|---|
| Invalid new mutation | Reject at the server/repository boundary; no partial write | UNIT-002/003 |
| Invalid legacy D1 row | Read-only scan reports it and blocks constraint migration/output | UNIT-003 |
| Unknown calculation version | Safe compatibility state; never guess | UNIT-004 |
| Mixed currency aggregate | Emit per-currency totals and disable one-number comparison | UNIT-003/005 |
| Consumer parity failure | Keep canonical fixture and revert only the affected adapter | Earliest causal unit |
| Overflow during export | Return structured failure and no successful artifact headers | UNIT-005 |

## Proof Producers And Handback

- `TEST-001` freezes independent expected parts, row membership, and bases.
- `TEST-002` proves one oracle plus legacy-wrapper compatibility.
- `TEST-003` proves editor/Data/chart parity and invalid-write/migration behavior.
- `TEST-007` measures cardinality and refusal behavior.
- `TEST-008` covers invalid, legacy, unknown-version, and leak paths.

Resume at the linked unit in `IMPLEMENTATION_PLAN.md`; do not update criterion or
gate status from this document. A reviewer hands failures back with the input,
expected minor units, actual stage, basis, version, and earliest owning unit.

