# Money-Math Domain Module

**Historical provenance only.** This pack is non-runnable and was superseded
without implementation by `.ai/03_plans/2026-07-31/Code-Improvement/`.
Successor `DEC-AUTO-008` rejects the proposed directory relocation and blanket
formatter consolidation. Successor `UNIT-029` absorbs only UNIT-002's confirmed
external aggregate subset; the quantity-free AI draft subclaim is not promoted.

## Historical unit disposition

| Unit | Title | Priority | Effort | Depends on | Status |
|------|-------|----------|--------|------------|--------|
| UNIT-001 | Create `src/lib/estimates/domain/`; relocate oracle; legacy becomes adapter | P1 | M | — | SUPERSEDED → refuted by successor DEC-AUTO-008 |
| UNIT-002 | Flip 4 float-fed surfaces to the oracle; resolve ARCH-08; route AI budget | P1 | M | UNIT-001 | SUPERSEDED → aggregate subset absorbed by successor UNIT-029 |
| UNIT-003 | Consolidate 11 formatters into 2 parametric formatters | P2 | S | UNIT-001 | SUPERSEDED → refuted by successor DEC-AUTO-008 |

Current status: all units `SUPERSEDED`; no implementation is claimed here.

## Historical disposition

- UNIT-001 is refuted by successor `DEC-AUTO-008`; the existing pure oracle
  remains in `src/lib/estimates/estimate-row-total.ts`.
- UNIT-002's confirmed external aggregate subset is absorbed by successor
  `UNIT-029`; its quantity-free AI draft subclaim is not promoted.
- UNIT-003 is refuted by successor `DEC-AUTO-008` because formatter contracts
  intentionally differ.

## Findings considered and rejected

- **Rewriting the oracle arithmetic** — rejected. The canonical
  `computeEstimateRowCostParts` is correct (integer minor units + `checkedAdd`
  + independent rounding). Relocate, don't rewrite.
- **Multi-currency UI / currency picker** — out of scope. The oracle supports
  multi-currency; this pack stops hardcoding `"PHP"` where a `currency_code`
  already exists, but builds no new UI.
- **Forcing one formatter shape everywhere** — rejected. The 11 formatters
  disagree on purpose in some cases (landing rounds to whole pesos; sheet
  shows 2 decimals). Consolidation must preserve per-surface intent via
  parameters.
- **Changing the `quantity_base`/`contingency` disambiguation rule** —
  rejected. The trace confirmed it is handled consistently across the oracle
  and the legacy wrapper; relocate, don't alter.

## Quality bar — check before finishing each unit

- Could a model that has never seen this repo execute the unit from `00-PLAN.md`
  + the unit file + `references/money-math-map.md` alone?
- Does the pure-math suite (`estimate-row-total.test.ts`,
  `calculation-output-parity.test.ts`) stay green without modification?
- After UNIT-002: `rg "computeEstimateRowLineTotal" src/lib/repositories src/lib/estimates/d1-intents`
  returns zero matches (the legacy wrapper is no longer called by repos).
- After UNIT-003: `rg "formatPeso|formatCurrency" src/` returns matches only in
  the consolidated module and its callers.
