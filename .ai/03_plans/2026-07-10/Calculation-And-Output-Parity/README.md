# Calculation And Output Parity - Plan Pack

Status tuple: `package_status=IMPLEMENTATION_READY`,
`implementation_status=NOT_STARTED`, `release_status=NOT_EVALUATED`,
`plan_lifecycle=ACTIVE`, `terminal_status=ACTIVE`.

## Goal Capsule

Prove that Archestimator does not lose, duplicate, re-scope, re-round, or
mislabel money as an estimate moves from the editable screen through Project
Data/charts, publication snapshot and shared reconstruction, proposal preview,
proposal export model, native XLSX, and print.

This pack owns `BETA-P0-05` and contributes a capability-extraction receipt for
the program-owned `BETA-P1-10` evidence gate, limited to touched
calculation/export state. It turns the existing unification oracle's
unimplemented cross-surface cases and known contingency divergence into the
first executable red baseline.

## Target Outcome

One deterministic golden fixture proves:

1. Every source row appears exactly once in the applicable total basis.
2. Editor, Project Data/charts, publication snapshot, shared reconstruction,
   proposal preview/model, XLSX cached values/formulas, and print agree where
   they represent the same basis.
3. Working-estimate, proposal-included direct-cost, and final-proposal totals are
   named separately and reconcile through explicit adjustments.
4. Quantity contingency, percentage adjustment/discount, misc cost, labor,
   sheet adjustment, proposal contingency, VAT, excluded scope, rounding, and
   currency are deterministic.
5. Unsaved preview recalculation, save/reload recalculation, workbook generation,
   formula-on/formula-off generation, and print-package generation remain in
   parity.
6. Touched calculation and export state is extracted behind typed boundaries
   without changing Publisher issue identity or unrelated proposal UX.

## Scope

In scope:

- canonical row cost-parts, total-basis, rounding, and currency contracts;
- adapters for editor totals, chart facts, publication snapshots, shared tree,
  proposal preview/model, and XLSX;
- public-safe row scope in immutable snapshots where needed for parity;
- one cross-surface golden fixture and consumer/provider tests;
- formula results, workbook recalculation metadata, currency formats, and native
  workbook readback;
- print-media package parity and targeted browser proof;
- performance/reliability budgets, rollout/fix-forward, cleanup, and final audit;
- capability extraction limited to touched calculation/export state.

## Non-Goals

- Publisher funnel, recipient matrix, proposal title/issue/revision identity,
  reminders, publication analytics, or shared-page redesign;
- estimate health, price freshness, risk drill-through, or revision intelligence,
  owned by `../Estimate-Intelligence-And-Price-Governance/`;
- changing proposal acceptance semantics or legal issued-record claims;
- currency conversion or exchange-rate ingestion;
- adding a decimal arithmetic dependency;
- production deploy, hosted D1 mutation, or external spreadsheet certification
  during local implementation.

## Total-Basis Contract

The plan does not assert that unlike totals are numerically equal.

| Basis | Rows and charges | Required consumers |
|---|---|---|
| `working_estimate` | All active estimate rows; row-level material/labor where supported, misc, and adjustment; no proposal scope exclusion or project charges | editor and Project Data/charts |
| `proposal_included_direct` | Only `scopeStatus=included`; canonical row cost parts and sheet adjustment | publication/share proposal view, preview, export model, XLSX direct-cost blocks |
| `final_proposal` | Proposal-included direct cost plus explicit proposal contingency/VAT settings | preview totals and XLSX final total |

Every surface declares its basis. A fixture with excluded rows must prove both
that the row remains visible where required and that it does not enter proposal
included/final totals. Reconciliation explicitly explains the difference from
the working estimate.

## Constraints

- `src/lib/estimates/estimate-row-total.ts` is the existing declared JS line-total
  oracle and must evolve rather than be bypassed by a second formula owner.
- Existing publication sanitization must continue to exclude unit rates, misc
  rates, internal supplier/library metadata, and unsafe image URLs.
- No formula may be copied into UI components, chart aggregation, snapshot
  builders, or workbook builders after the canonical adapter exists.
- Existing data remains readable. Snapshot schema changes are additive and
  versioned; legacy snapshots retain a safe compatibility path.
- Shared publication/export files are serialized. The executing lead must wait
  until the Publisher/Shared Pages writer has finished, re-read its diff, and
  acquire the relevant lease before UNIT-004 or UNIT-005 edits.
- Browser automation is required only for the real print-media claim; unit/DOM/
  workbook readback remains the default for all other claims.

## Proof Boundary And Stop Condition

Planning stops when the pack validates, all choices are closed, all units are
`READY` in a dependency-closed slice, hashes are current, and `UNIT-001` is the
exact next node. No calculation, workbook, print, browser, or release result is
claimed by the plan itself.

Implementation stops only when all cross-surface fixture assertions pass, the
known contingency/snapshot divergence is removed or explicitly represented by a
different named basis, native workbook readback and print-media proof pass,
broad regression/build checks are green, temporary resources are cleaned, and
the final audit finds one calculation owner with no silent compatibility gap.

## Artifact Map

| Artifact | Purpose |
|---|---|
| `plan-pack.json` | Machine state and reciprocal traceability; intentionally excluded from its own artifact list |
| `README.md` | Goal, basis contract, scope, stop condition, handoff |
| `SOURCE_AND_CODEBASE_AUDIT.md` | Current formula owners, red baseline, consumer map, contradictions |
| `REQUIREMENTS_AND_DECISIONS.md` | Invariants, acceptance, decisions, state model, risks |
| `IMPLEMENTATION_PLAN.md` | Canonical DAG, ownership/leases, unit packets, restart checkpoints |
| `VERIFICATION_ROLLOUT_AND_FINAL_AUDIT.md` | Applicability, tests, commands/signals, rollout/fix-forward, final audit |
| `LOOP_LEDGER.md` | Append-only state, evidence fingerprints, dependency wait, resume and cleanup |

## Handoff

- Completed units: none.
- Ready slice: `SLICE-001`, containing `UNIT-001` through `UNIT-007` and all
  transitive dependencies.
- Exact next unit: `UNIT-001`.
- Critical path: `UNIT-001 -> UNIT-002 -> UNIT-003 -> UNIT-004 -> UNIT-005 -> UNIT-006 -> UNIT-007`.
- Shared-file serialization: before UNIT-004/005, confirm the
  `Publisher-And-Shared-Pages` agent has finished, inspect its actual diff, and
  acquire publication/export leases. Do not overwrite concurrent changes.
- Resume command:
  `bun run validate:plan-pack -- .ai/03_plans/2026-07-10/Calculation-And-Output-Parity`.
