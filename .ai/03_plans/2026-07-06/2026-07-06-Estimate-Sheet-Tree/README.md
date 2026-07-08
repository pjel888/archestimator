# Estimate Sheet Tree Plan Package

Status: CONDITIONALLY READY. Phase 0 (workspace resolution hotfix) is IMPLEMENTATION-READY for the one-line payload fix, but its evidence is now split into action-wrapper payload tests and real D1 history/provider proof. Phases 1-6 remain CONDITIONALLY READY pending the RED/characterization tests in `11_TEST_STRATEGY_AND_QA_MATRIX.md`.

This package plans a focused repair of `src/components/workshop/EstimateSheetTree.tsx`, the shared `Tree` behavior it relies on, and the D1 reorder persistence boundary. The target outcome is reliable branch reordering plus a clearer, keyboard-equivalent, accessible interaction model that preserves the existing context-menu, rename, create, delete, bulk delete, restore, search/filter, lazy-load, active-tab, and external-drop states.

## Live Production Blocker (added 2026-07-06)

The user-reported error **"Could not reorder estimate tree: Estimate history event workspace could not be resolved."** has been root-caused:

- Throw site: `src/lib/estimates/d1-action-client.ts:451`
- Trigger: `reorderEstimateTreeNodes` builds an RPC payload at `src/lib/estimates/actions.ts:2252` that **omits `target_project_id`**. Every other call site in `actions.ts` (30+ sites) passes it correctly.
- Schema: `estimate_sheet_events.workspace_id` is `NOT NULL` (migration `0025_reusable_source_insert_support.sql:11`), so the `insertHistoryEvent` guard throws when neither `input.workspaceId` nor `readProjectContext(database, "")` returns a value.
- Fix shape: one line — add `target_project_id: project.id` to the `rpcPayload`. See `04_ROOT_CAUSE_AND_DEBUG_PLAN.md` RC0 and `12_IMPLEMENTATION_SEQUENCE.md` Phase 0.

This same bug fires for **every** reorder attempt (flat or nested), not only nesting. The user described nesting because that was the case they tried first.

## Index

- `00_AGENT_COORDINATION.md` - master goal, scope, agent ledger, stop condition.
- `01_EXECUTIVE_SUMMARY.md` - recommended path and top findings.
- `02_REQUIREMENTS_AND_ACCEPTANCE_CRITERIA.md` - implementation requirements and done criteria.
- `03_CURRENT_STATE_AND_EVIDENCE.md` - source-backed current behavior.
- `04_ROOT_CAUSE_AND_DEBUG_PLAN.md` - hypotheses, repro tests, and confirmation steps.
- `05_TARGET_UX_AND_PRODUCT_SPEC.md` - target interaction model.
- `06_TECHNICAL_ARCHITECTURE.md` - code structure and boundaries.
- `07_DATA_API_AND_PERSISTENCE.md` - server action, D1 adapter, readback.
- `08_SECURITY_AND_PRIVACY.md` - authz and data exposure.
- `09_PERFORMANCE_AND_SCALE.md` - hover, virtualization, and large-tree budgets.
- `10_ACCESSIBILITY_AND_INTERACTION_STATES.md` - keyboard and screen-reader contract.
- `11_TEST_STRATEGY_AND_QA_MATRIX.md` - RED/GREEN suite.
- `12_IMPLEMENTATION_SEQUENCE.md` - ordered work packages.
- `13_REFACTORING_AND_BOUNDARIES.md` - safe decomposition plan.
- `14_ROLLOUT_ROLLBACK_AND_OBSERVABILITY.md` - rollout and recovery.
- `15_RISKS_ASSUMPTIONS_AND_OPEN_QUESTIONS.md` - unresolved risks.
- `16_DECISION_LOG.md` - plan decisions and rejected options.
- `17_TRACEABILITY_MATRIX.md` - requirement to evidence to tests.
- `18_STACK_CONTRACT_AND_DEPENDENCIES.md` - framework/dependency constraints.
- `19_RESEARCH_REVIEW_AND_QA_EVIDENCE.md` - skill, subagent, and review evidence.
- `20_STATE_INVENTORY_AND_SHADOW_PATHS.md` - canonical state inventory, shadow paths, and plan accuracy corrections.

## Read First

Implement in this order:

1. **Phase 0 (HOTFIX — IMPLEMENTATION-READY):** Add `target_project_id: project.id` to the reorder RPC payload at `src/lib/estimates/actions.ts:2252`. Update existing reorder payload expectations in `tests/vitest/estimate-node-reorder-action.test.ts`; add a real D1 adapter/provider proof for the history event row instead of claiming the mocked action file proves persistence. This unblocks the user immediately.
2. **Phase 1 characterization tests** for branch-with-descendants planner behavior and the non-reorder state inventory in `20_STATE_INVENTORY_AND_SHADOW_PATHS.md`, plus expected-RED tests for confirmed `sortOrder` merge, projected-tree cycle rejection, move dialog before/after/root placement, disabled reason accessibility, and EstimateSheetTree handle-only drag activation.
3. Fix correctness at the merge and persistence boundaries.
4. Improve the shared tree interaction model without changing the estimate data contract.
5. Split `EstimateSheetTree.tsx` only after tests protect reorder behavior.
6. Run the focused suite, then typecheck.
