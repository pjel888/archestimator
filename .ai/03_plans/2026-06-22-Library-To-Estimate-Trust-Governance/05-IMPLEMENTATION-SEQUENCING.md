# Implementation Sequencing

## Entry Conditions

- The active 2026-06-20 Library implementation is merged, paused, or stable enough that current source-trust and cache files can be re-verified.
- The implementer has read `01-CURRENT-EVIDENCE.md` and refreshed stale line anchors with `rg`.
- The implementer has confirmed whether the current worktree already contains source-trust and telemetry files from the active Library implementation.
- The implementer has read the repaired readiness artifacts `06` through `12` and assigned owners for any high-conflict file touched in the phase.

## Phase 0: Reconcile Current Reality

Purpose: prevent stale-plan work from fighting the other Library implementation.

Actions:

- Re-run targeted `rg` for insert, replace, promote, query keys, source trust, attachments, and telemetry.
- Confirm whether `src/components/workshop/library/source-trust-model.ts`, `src/components/workshop/library/source-trust-chips.tsx`, and `src/lib/component-library/library-telemetry.ts` are now tracked or still in active work.
- Confirm `tests/vitest/library-workspace-switch-cache.test.ts` and related cache tests describe current scoped keys.
- Confirm source trust still derives freshness from `pricing_date` and does not treat `updated_at` as reviewed/current pricing evidence.
- Confirm public/proposal snapshot allowlists before moving any source, supplier, confidence, or attachment data toward shared output.
- Create this pack's `_evidence/README.md`.
- Record file locks for high-conflict files using `08-BLAST-RADIUS-AND-INTEGRATION-MAP.md`.

Exit condition: implementation units can reference current files without relying on stale old-pack line numbers, and every touched high-conflict file has one active owner.

## Phase 1: Reuse Safety Foundation

Units: U1, U2, U3.

Order:

1. Add or extend focused tests for stale replace, source labels, target revalidation, and cache scoping.
2. Implement compare-before-replace and sidebar source taxonomy.
3. Wire recovery states and cache invalidation.
4. Record focused evidence for QA-001 through QA-007.

Stop condition: QA-001 through QA-007 pass, and an estimator cannot silently replace or insert from a stale/changed/foreign source. Browser/provider proof may be skipped with risk only when it is not proving this core behavior.

## Phase 2: Governance Layer

Units: U4, U5.

Order:

1. Add tests for accepted/current cost governance and attachment lifecycle.
2. Implement the chosen additive governance schema from `10-DATABASE-MIGRATION-AND-RPC-READINESS.md` when durable accepted cost, lock, assignment, or attachment approval is in scope.
3. Gate all durable trust changes through the named RPC/action boundaries and permission mapping in `09` and `10`.
4. If a phase intentionally ships only transient app-layer review UI, record which durable governance paths were not touched and leave their QA rows open rather than marking them skipped.

Stop condition: migration decisions are closed for every durable state, SQL probes are recorded where relevant, and accepted cost/current attachment state passes QA-008 through QA-010 plus QA-017/018 where implemented.

## Phase 3: Mobile, A11y, And Interruption

Unit: U6.

Order:

1. Add DOM tests for visible errors, focus return, retry state, and invalid numeric state.
2. Add browser proof only for mobile geometry, real drag/drop, route, or portal focus claims that DOM tests cannot prove.
3. Record skipped browser/provider proof with residual risk instead of counting it as pass.

Stop condition: QA-011 and QA-012 pass, and any browser-only mobile/portal/focus claim is proven or recorded with `SKIP-WITH-RISK`.

## Phase 4: Evidence And Release Readiness

Unit: U7.

Order:

1. Extend telemetry sanitizer and event tests.
2. Re-run public snapshot redaction proof for any source-trust or attachment field that moved.
3. Populate `_evidence/` with scenario-by-scenario results.
4. Run `git diff --check` for docs/source hygiene and targeted tests for changed behavior.

Stop condition: every implemented claim has a fresh focused proof or an explicit `SKIP-WITH-RISK` entry, and the final report follows `12-IMPLEMENTATION-READINESS-CHECKLIST.md`.

## Sequencing Risks

- Redaction is the highest blast radius: public/proposal snapshots must stay frozen and must not expose raw pricing source text, supplier internals, confidence prose, history, or attachment paths.
- Cache bleed is next: workspace-scoped and shape-scoped keys must remain separate for full Library, lite sidebar, rows, and templates datasets.
- Accepted-cost semantics must be decided before UI polish: do not ship both a soft "accepted" badge and a separate hard lock unless their meanings are explicit.
- Attachment approval/versioning is a schema decision, not just a visual state, if it must survive reloads and audits.
- Source governance can drift if raw `pricingSource` is reused as a public display label; derive safe labels for overview and public surfaces.
- Parallel agents can conflict in `EstimateSheetContent.tsx`; only one integration owner may hold that file at a time.

## Rollback Expectations

- Compare-before-replace can be disabled by reverting UI guard code while leaving existing insert/replace actions intact.
- Cache invalidation changes must be scoped and reversible; never replace key factories with ad hoc arrays.
- Governance states should start in app-layer code where possible; schema migrations must be additive and recoverable.
- Attachment cleanup must never broaden delete scope to unowned paths.
- Telemetry changes must fail closed by dropping fields, not by emitting raw data.
- Durable trust migrations are fix-forward by default after data writes; disable UI paths before deleting data or audit fields.
