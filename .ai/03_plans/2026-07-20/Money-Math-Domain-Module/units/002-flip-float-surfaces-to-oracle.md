# UNIT-002 — Flip 4 float-fed surfaces to the oracle; resolve ARCH-08; route AI budget

## Goal

Flip the 4 user-facing surfaces that display float-derived totals so they call
the canonical oracle instead. Delete the upward repository imports into
`lib/estimates/` (ARCH-08 resolved). Route the AI package-builder budget
through the oracle.

## Status

`READY` · depends on: `UNIT-001` · requirement: `DATA-002` · risks: `RISK-001`, `RISK-002`

## Why this matters

Users see different totals depending on which surface they look at: the
estimate list and project charts show float-derived numbers (cent-level drift
from the canonical sheet view); the AI copilot's budget ignores quantity and
adjustment entirely. In an estimating tool, cent drift and quantity-blind
budgets erode trust.

This unit flips the 4 surfaces to the oracle. The estimates-list and charts
totals become bit-identical to the sheet view; the AI budget starts reflecting
quantity × unit cost.

## Current state

The 4 surfaces (from the 2026-07-21 trace):

| # | Surface | File:line | Current feed |
|---|---------|-----------|--------------|
| 1 | Estimates list "Ongoing Project Cost" | `src/lib/repositories/workspace-repository.ts:3200` | legacy `computeEstimateRowLineTotal` (import `:16`) |
| 2 | Estimates list (alt path) | `src/lib/repositories/project-estimate-sheets-repository.ts:221` | legacy `computeEstimateRowLineTotal` (import `:4`) |
| 3 | Project charts (estimate subtotals) | `src/lib/repositories/project-charts-repository.ts:132` | legacy `computeEstimateRowLineTotal` (import `:2`) |
| 4 | AI package-builder budget | `src/lib/ai/package-builder/draft.ts:2295` (`componentCreateTotal = reduce((sum,c) => sum + c.unitCost + c.miscCost, 0)`) | raw IEEE-754, no oracle; reaches persisted estimate via `apply.ts:2667` |

Plus the history-event persisted adjustment/contingency values at
`src/lib/estimates/d1-intents/rows.ts:345,347` (float in the same module that
computes the canonical total). Lower priority — these are audit fields, not
displayed totals — but flag for a follow-up.

The oracle after UNIT-001: `computeEstimateRowCostParts` from
`@/lib/estimates/domain`.

The `currency_code` wrinkle: `project-charts-repository.ts:85` reads
`project.currency_code` but defaults to `"USD"` (not PHP) and then passes the
row into the legacy function that ignores currency. After this unit, thread the
project's actual currency into the oracle call.

## Owned paths / resources

The 4 files above. One sub-step each.

## Implementation boundary

For **each** of the 4 surfaces:

1. **Surfaces 1, 2, 3 (repositories):** replace the
   `computeEstimateRowLineTotal(row)` call with
   `computeEstimateRowCostParts({ ...row, currency_code: projectCurrency }).totalMinorUnits / MINOR_UNIT_FACTOR`.
   The project currency is available in scope at each site (confirm per site).
2. Delete the upward import (`from "@/lib/estimates/estimate-row-total"` or
   `from "@/lib/estimates/legacy-adapters"`) and replace with
   `from "@/lib/estimates/domain"`. ARCH-08 resolved: repositories now depend
   on the leaf domain, not upward into `lib/estimates/`.
3. **Surface 4 (AI budget, RISK-002):** `draft.ts:2295` currently sums
   `unitCost + miscCost`. Replace with the oracle applied to each component
   being created (`computeEstimateRowCostParts({ quantity, unit_cost: unitCost,
   misc_cost: miscCost, adjustment_percentage, currency_code })`). This will
   materially change the budget number (it now reflects quantity). Confirm the
   AI-tooling owner expects this — a budget that ignores quantity is wrong, but
   it IS a user-visible behavior change.
4. Do NOT change the proposal-export path (`build-proposal-export-model.ts:102`)
   or the publication snapshot path (`snapshot.ts:246`) — they already use the
   oracle correctly.
5. Do NOT touch the history-event float fields at `rows.ts:345,347` in this
   unit — flag as a follow-up in maintenance notes.

## Commands you will need

| Purpose | Command | Expected on success |
|---------|---------|---------------------|
| Type-check | `bun run type-check` | exit 0 |
| Lint | `bun run lint` | exit 0 |
| ARCH-08 audit | `rg "from \"@/lib/estimates/estimate-row-total\"|from \"@/lib/estimates/legacy-adapters\"" src/lib/repositories src/lib/estimates/d1-intents` | zero matches in repositories (d1-intents may still import for now — flag) |
| Oracle audit | `rg "computeEstimateRowLineTotal" src/lib/repositories src/lib/ai/package-builder` | zero matches |

## Scope

**In scope:** the 4 files above.

**Out of scope:**
- UNIT-001 (oracle relocation) — prerequisite.
- UNIT-003 (formatter consolidation).
- The history-event float fields (`rows.ts:345,347`) — follow-up.
- Proposal-export and publication paths — already canonical.

## Done criteria

- [ ] `bun run type-check` exits 0
- [ ] `bun run lint` exits 0
- [ ] The 4 surfaces call `computeEstimateRowCostParts` from `@/lib/estimates/domain`
- [ ] The ARCH-08 audit returns zero repository matches
- [ ] The oracle audit returns zero matches in repositories and AI package-builder
- [ ] The pure-math suite passes
- [ ] The `currency_code` threaded into the charts oracle is the project's actual currency (not hardcoded USD)

## Acceptance evidence

- Both audits return the expected reduced sets.
- `git diff` shows the 4 surfaces flipped; no proposal-export/publication change.

## STOP conditions

- A surface's caller depends on the float-returning signature in a way the
  oracle's `totalMinorUnits / 100` cannot satisfy (e.g. it expects an integer).
  Surface it; the call site may need a wrapper.
- The AI-tooling owner (RISK-002) has not confirmed the quantity-reflecting
  budget is the intended behavior. Surface before changing `draft.ts`.
- A project's `currency_code` is genuinely unavailable at a surface (not just
  defaulting wrong). Surface it; do not invent a currency.

## Recovery

Each surface is independent. Revert and reconcile per surface.

## Maintenance notes

- **RISK-001:** estimates-list and charts totals will shift by ≤1 cent per row
  after this unit. This is the intended fix. Document in release notes if the
  team ships them.
- **RISK-002:** the AI budget change is material (now reflects quantity).
  Confirm with the AI-tooling owner before merging.
- **Follow-up (not in this unit):** the history-event `adjustmentValue`/
  `contingencyValue` at `rows.ts:345,347` are float-derived. They are audit
  fields, not displayed totals, but routing them through the domain module's
  rounding would make the history view bit-consistent with the sheet view.
  Defer to a small follow-up.
- ARCH-08 is resolved once this unit lands — repositories depend on the leaf
  domain, not upward into `lib/estimates/`.
