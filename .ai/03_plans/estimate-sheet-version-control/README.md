# Estimate Sheet Version Control Plan

**Date:** 2026-05-24
**Route:** `/workshop/projects/[projectId]/estimates/[nodeId]`
**Status:** Activity-only implementation expanded through the local-safe gates; named sheet versions remain dormant.
**Risk:** Broad, because estimate rows feed the live sheet, charts, proposal export previews, template insertion, duplication, and future issued proposal snapshots.

## Current Authority Order

Read this pack in this order after the Activity-only pivot:

1. `README.md` - current orientation and authority map.
2. `18-current-activity-contract.md` - one-page current contract for UI, data, API, dormant artifacts, gaps, and verification.
3. `09-implementation-closeout.md` - what was implemented, what is dormant, and what evidence/gaps remain.
4. `15-dormant-artifact-policy.md` - rules for keeping named-version DB artifacts unexposed.
5. `16-second-pass-reconciliation-audit.md` - post-pivot reconciliation findings and measurement gaps.
6. `17-activity-expansion-roadmap.md` - implementation roadmap and status for node runtime proof, browsing, filters/search, grouping, measurement closure, and export-label drift.
7. `19-local-safe-completion-audit.md` - latest completion audit for the 2026-05-25 implementation pass and remaining blocked/non-goal items.
8. `20-activity-action-matrix-and-group-rollup-plan.md` - next-slice plan for event taxonomy, audit-card language, and Group/Area/row rollup semantics without duplicate ancestor facts.

Documents `02`, `03`, `05`, `06`, `07`, `08`, `10`, `11`, `12`, `13`, and `14` are historical pre-pivot planning context unless a future proposal/export snapshot plan explicitly revives named sheet versions, compare, or restore-as-copy.

## Goal

Add contractor-grade activity history for estimate sheets and estimate row items. Users should be able to see what changed, when it changed, and why it changed, including row-level source replacements such as changing a row from Tile A to Tile B. The earlier named full-sheet version/compare/restore workflow is no longer active because projects can already carry multiple estimate sheets/options.

## Primary User Job

When revising an estimate after design, client, supplier, or value-engineering changes, the estimator needs a trustworthy timeline that answers:

- which rows were added, edited, replaced, or deleted;
- which component/library source was used before and after a replacement;
- how quantity, misc cost, source snapshot, category, supplier, and totals changed;
- when sheet-level metadata or structure changed;
- which activity explains the current estimate state before a user duplicates or exports the sheet.

## Non-Goals

- Do not build the full proposal package system in this slice.
- Do not make issued/exported proposal records active unless a later export plan explicitly does it.
- Do not silently refresh existing estimate rows when component-library prices change.
- Do not add Supabase Realtime in the first implementation.
- Do not restore rejected prototype revision UI or large app shells.
- Do not expose named per-sheet version creation, compare, or restore-as-copy unless a later proposal/export snapshot plan explicitly reintroduces it.

## Plan Documents

1. `01-current-state-and-domain-audit.md` - live code/schema/history surface audit.
2. `02-product-and-ux-plan.md` - historical pre-pivot UX plan for named versions, compare, and restore-as-copy; row history concepts remain useful context.
3. `03-data-model-versioning-plan.md` - historical pre-pivot data model with append-only events plus dormant named-version snapshots/RPC boundaries.
4. `04-blast-radius-and-integration-audit.md` - affected files, graph/GitNexus impact, risks, and integration boundaries.
5. `05-implementation-sequence.md` - historical staged rollout from schema through named-version UI; use only as context after the Activity-only pivot.
6. `06-test-validation-and-release-readiness.md` - historical test matrix; current tests should preserve no `Versions`/`Compare` UI unless future scope changes.
7. `07-open-questions-and-decision-log.md` - historical decision log; current Activity-only decision is recorded in `.ai/10_state/decisions.md` and the dormant artifact policy.
8. `08-implementation-readiness-gate.md` - historical pre-pivot readiness checklist plus post-pivot disposition; do not use it as the active implementation gate.
9. `09-implementation-closeout.md` - implementation evidence reconciled to Activity-only UX plus dormant artifact inventory.
10. `10-second-pass-readiness-audit.md` - reviewer feedback disposition, added concreteness, and remaining blockers.
11. `11-third-pass-readiness-audit.md` - code-cross-referenced corrections for row UX, snapshot schema, metadata version labels, and missing events.
12. `12-fourth-pass-readiness-audit.md` - final pre-implementation corrections for inert row Expand behavior, existing RPC wrapping, actor propagation, and live atomicity testing.
13. `13-ui-design-pass.md` - historical UI design pass; row inspector/activity language remains useful, but sheet versions/compare/restore are pre-pivot.
14. `14-final-pre-implementation-readiness-pass.md` - final corrections for event volume/storage, row revision conflicts, retry idempotency, wrapper RPC strategy, backfill batching, live DB test harness, and UI state gaps.
15. `15-dormant-artifact-policy.md` - policy for keeping named-version DB artifacts dormant and unexposed.
16. `16-second-pass-reconciliation-audit.md` - second-pass documentation reconciliation, evidence, gaps, and future activity-expansion notes.
17. `17-activity-expansion-roadmap.md` - current next-slice roadmap for closing remaining evidence gaps and expanding Activity beyond first-pass row/sheet browsing.
18. `18-current-activity-contract.md` - current single-page contract for supported Activity UX, data/API boundaries, dormant artifacts, contingency history, measurements, typed RPC risk, and verification.
19. `19-local-safe-completion-audit.md` - 2026-05-25 audit of all local-safe implementation gates completed in this pass, with remote measurement/apply evidence and explicit blockers.
20. `20-activity-action-matrix-and-group-rollup-plan.md` - planning matrix for richer activity descriptions and clean Group Node / Area Node / row aggregation without duplicating tree-cascade facts.

## Readiness Score Supersession

The numbered scores in historical audits were planning-pass scores under different assumptions; they are not current release-readiness scores.

| Document | Historical Score | Current Interpretation |
| --- | ---: | --- |
| `10-second-pass-readiness-audit.md` | 86/100 | Pre-pivot planning score before row-action and named-version corrections. |
| `11-third-pass-readiness-audit.md` | 78/100 | Pre-pivot score after correcting false UI assumptions and metadata/version-label drift. |
| `12-fourth-pass-readiness-audit.md` | 82/100 | Pre-pivot score after wrapper/actor/static-test corrections. |
| `14-final-pre-implementation-readiness-pass.md` | 78/100 | Pre-implementation score before migration/UI work existed. |
| `16-second-pass-reconciliation-audit.md` | not scored | Post-pivot documentation reconciliation; named-version UX is dormant. |
| `17-activity-expansion-roadmap.md` | not scored | Active forward strategy; local-safe Activity expansion gates are now implemented and evidence-backed; runtime DB proof/latency/destructive cleanup remain blocked/non-goal. |

Future passes should not assign another standalone readiness score unless they use a fixed rubric and record the evidence behind each dimension. After the 2026-05-25 pass, the honest status is "local-safe Activity expansion implemented; protected-route browser smoke captured; live mutation atomicity proof, scalar latency benchmark, and destructive QA cleanup remain environment- or scope-blocked."

## Recommended Direction

Use an append-only server-written event log as the active user-facing model.

The event log should record row-level and sheet-level changes as they happen through the existing server action boundary. Named estimate versions, compare, and restore-as-copy are not part of the active estimate-sheet UX; create a separate estimate sheet/duplicate sheet for alternatives instead.

2026-05-24 implementation pivot: the sheet header exposes Activity instead of named versions, the right-side metadata strip no longer shows a per-sheet version label, and the app-level `createEstimateSheetVersion` / `restoreEstimateSheetVersionAsCopy` action helpers were removed. Existing migration-era named-version schema/RPC artifacts are dormant compatibility residue, not a supported UI contract.

2026-05-25 completion pass: Activity browsing now includes sheet, row, and node scopes; cursor pagination; event-type/search/browser-local date filters; safe profile-resolved actor labels with fallback; page-local correlation grouping; and read-only retention metrics. The new retention metrics RPC was applied and verified on linked Supabase project `ebxxqidacheyapmmzavr`. Payload/snapshot measurements were recorded and are below the guardrails. Protected-route browser smoke for sheet Activity, row Version History, and node Activity was captured under `.omx/artifacts/visual-ralph/estimate-sheet-version-control/20260525-current-activity/`. The linked remote still contains the historical `V2`/`QA checkpoint` dormant named-version residue; cleanup is destructive and out of scope unless separately approved.

Second-pass hardening added concrete UX sketches, mandatory SQL RPC transaction boundaries, row/history atomicity rules, explicit compare DTO shape, staged delivery passes, E2E/manual failure checks, retention/reversion decisions, and a stronger readiness gate.

Third-pass correction tightened the plan against the actual codebase: row actions are plain buttons in a 30px column, `EstimateSheetHeader` is a private local function, proposal export already reads version labels from `estimate.metadata`, restore-as-copy must mirror `duplicateEstimateSheet()`, and snapshots must include `source_snapshot`, row `metadata`, `discipline`, `designation`, and `link_state`.

Fourth-pass correction clarifies that the row Expand icon is currently inert, so row history requires a new row details/history panel. It also requires history-aware wrappers or migrations for existing RPCs, explicit actor propagation from server actions into SQL, and live database transaction tests before atomicity is claimed.

The UI design pass is now historical where it mentions sheet versions, compare, or restore-as-copy. Keep the shared inspector and audit-card language for Activity and row Version History, but do not expose named-version controls in the current app.

Final pre-implementation correction locks wrapper RPCs for existing reorder/template flows, adds `row_revision` as the same-row concurrency guard, uses stable mutation UUID/correlation ids for retry idempotency, changes event payloads to compact changed-field snapshots, and moves baseline backfill out of the all-in-one schema migration into a re-entrant data step.

Post-pivot rule for exports: proposal preview/export currently renders the mutable current estimate only. Any `versionLabel` read from `estimate.metadata` is legacy/current-estimate metadata, not proof of a named snapshot or issued proposal version.

## Deletion Criteria

If this direction is rejected, delete this plan folder before implementation. If implementation has started, remove only the new version-control schema/actions/UI and preserve unrelated existing row mutation behavior.

## Required Cross-References

- `.ai/03_plans/README.md` requires new plans to state user job, route/screen, non-goals, expected files, validation gate, and deletion criteria.
- `.ai/10_state/current-state.md` documents the current route, live estimate workspace, TanStack area-tree cache, component-library snapshots, proposal export preview, and Supabase migration baseline.
- `.ai/10_state/decisions.md` records the state-first spreadsheet editing contract and component-library snapshot rules.
- `.ai/06_specs/live-project-estimate-bootstrap.md` documents project-scoped row insert/edit/delete validation and optimistic rollback.
- `.ai/06_specs/project-estimate-versioning-system.md` defines autosave history, named estimate versions, issued proposal snapshots, and library versioning as separate layers.
- `.ai/03_plans/workshop-library-component-creation-versioning/` is the closest implemented history/versioning model and should be mirrored where useful.
