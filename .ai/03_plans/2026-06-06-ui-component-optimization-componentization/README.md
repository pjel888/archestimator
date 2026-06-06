# UI Component Optimization And Componentization

**Status:** REFINED PLANNING PACK - 2026-06-06 - MVP slice ready for future implementation handoff; full editable-tree refactor remains measurement- and owner-gated.
**Scope:** Planning and implementation-readiness documentation only. No source code, dependency, migration, runtime configuration, provider setting, generated file, or secret has been changed by this pack.
**Canonical document:** `CURRENT_CANONICAL_PLAN.md`

## Plan Metadata

| Required field | Current answer |
| --- | --- |
| Exact user job | Contractors and internal operators need large estimate sheets, component-library folders, templates, and public share trees to stay responsive and visually consistent while future developers can safely change tree behavior without editing several duplicated render paths. |
| Routes/screens affected | `/workshop/projects/[projectId]/estimates/[nodeId]`, `/workshop/library`, `/workshop/templates`, `/share/[token]`, and embedded workshop/share tree panels used by those screens. |
| Non-goals | No visual redesign, no generic design-system rebuild, no replacement of `react-complex-tree`, no production data model change, no Supabase query/RLS/migration work, no package/dependency addition without owner approval, no behavior change to optimistic estimate mutations, no deployment/provider setting change. |
| Files expected to change in future implementation | MVP Phases 1-3: new tree utility/test docs plus future `src/components/workshop/tree-core/` and `src/components/share/share-tree/`; modified share tree files only after tests. Later phases may touch `EstimateSheetTree.tsx`, `EstimateSheetContent.tsx`, `LibraryFolderTree.tsx`, `AddComponentModal.tsx`, and component-library manager folders. See `IMPLEMENTATION_MATRIX.md`. |
| Validation gate | Docs-only refinement: `git diff --check` plus path/test/folder verification. Future MVP implementation: targeted Vitest for tree-core/share surfaces plus `bun run type-check` and `bun run lint:design-system`. Future editable-tree phases require Profiler baseline, targeted estimate/tree regression tests, and owner smoke approval. |
| Deletion criteria if rejected | Delete this plan folder and any future unused tree-core/share-tree folders. If future code is started then rejected, revert only the phase commit(s) listed in `IMPLEMENTATION_MATRIX.md`; tree-core utilities must be removable without data migration or provider rollback. |

## Executive Decision

Do not build a broad generic design system. Extract layered composition around the current tree surfaces:

1. Pure tree utilities with no React, DOM, Supabase, or domain mutation imports.
2. Headless hooks for expansion, selection, indexes, and filtered/visible row derivation.
3. Thin render shells that preserve Archestimator's current visual language and domain behavior.

The MVP slice is **Phases 0-3**: baseline/safety, pure utilities, headless shells, and read-only share tree unification. Editable estimate-tree and estimate-sheet decomposition stay behind impact, measurement, and owner gates.

## Document Inventory

| Doc | Purpose | Read when |
| --- | --- | --- |
| `CURRENT_CANONICAL_PLAN.md` | Single source of truth and conflict resolution | Always first |
| `00_INDEX.md` | Legacy index plus refinement pointers | Orientation |
| `01_UI_REUSE_AUDIT.md` | Current component reuse inventory | Before choosing extraction targets |
| `02_TREE_PERFORMANCE_RESEARCH.md` | Performance research and thresholds | Before optimization work |
| `03_TREE_COMPONENTIZATION_AUDIT.md` | Tree surface inventory | Before designing tree-core |
| `04_IMPLEMENTATION_PLAN.md` | Phase plan and sequencing | Before implementation |
| `05_READINESS_VALIDATION.md` | Honest readiness scorecard | Before claiming readiness |
| `06_STRATEGY_CRITIQUE_AND_DECISION.md` | ADR, rejected approaches, critique | Before changing architecture |
| `07_REPO_EVIDENCE_REGISTER.md` | Verified repo evidence | When checking claims |
| `08_TDD_IMPLEMENTATION_TASK_PACK.md` | Future test-first task pack | When executing phases |
| `09_ULTRAQA_PLAN_QUALITY_REPORT.md` | Adversarial QA posture | Before final review |
| `10_ULTRAGOAL_TEAM_HANDOFF.md` | Future OMX/team handoff | When launching execution |
| `MEASUREMENT_BASELINE.md` | Baseline gaps and collection tables | Before Phases 5-8 |
| `BENCHMARK_PROTOCOL.md` | Exact measurement procedure | Before recording metrics |
| `BLAST_RADIUS_ANALYSIS.md` | GitNexus and code-review graph impact | Before editing target symbols |
| `RISK_REGISTER.md` | Risk, mitigation, contingency | Before owner approval |
| `IMPLEMENTATION_MATRIX.md` | Per-phase files/tests/rollback | During execution tracking |
| `CROSS_PLAN_REFERENCES.md` | Coordination with route-transition plan | Before memo/dynamic import work |
| `TREE_CORE_API_CONTRACTS.md` | TypeScript API signatures | Before coding tree-core |
| `EFFORT_AND_MVP_SLICING.md` | Effort estimates and parallelization | Before staffing work |
| `GRADUAL_ROLLOUT_STRATEGY.md` | Incremental rollout and rollback | Before wiring live surfaces |
| `VISUAL_REGRESSION_STRATEGY.md` | Manual/browser visual checks | Before UI changes |
| `OWNER_SIGNOFF.md` | Approval gates | Before high-risk phases |
| `HANDOFF.md` | Implementer context | At implementation start |
| `PLAN_REPAIR_LOG.md` | What this refinement corrected | During future audits |

## Reading Order

1. `CURRENT_CANONICAL_PLAN.md`
2. `README.md`
3. `BLAST_RADIUS_ANALYSIS.md`
4. `MEASUREMENT_BASELINE.md`
5. `CROSS_PLAN_REFERENCES.md`
6. `TREE_CORE_API_CONTRACTS.md`
7. `IMPLEMENTATION_MATRIX.md`
8. `RISK_REGISTER.md`
9. `HANDOFF.md`

## Success Criteria

MVP success means Phases 0-3 can be implemented later with tests, no production behavior change, and a shippable read-only share-tree unification. Full-plan success requires measured performance baselines, editable-tree regression coverage, owner sign-off, and no conflicting route-transition memoization or code-splitting work.

## Relationship To Route-Transition Plan

The active route-transition plan at `.ai/03_plans/route-transition-performance-optimization/` owns route-level performance conventions. This UI plan must defer to:

- `CURRENT_CANONICAL_PLAN.md` for current route-transition truth.
- `14-code-splitting-named-exports.md` for `next/dynamic` named-export patterns.
- `19-react-memo-strategy.md` for strategic React.memo use.
- `BENCHMARK_PROTOCOL.md` for route-level measurements when the interaction is a route transition rather than a tree interaction.

This plan owns tree shape, tree-core contracts, componentization seams, and per-surface behavior preservation.
