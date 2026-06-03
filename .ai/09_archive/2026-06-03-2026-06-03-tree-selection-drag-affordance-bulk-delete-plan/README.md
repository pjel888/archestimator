# Tree Selection, Drag Affordance, and Bulk Delete Planning Package

## Purpose

This folder is the archived planning and implementation evidence package for visible tree drag affordances, independent bulk selection, and safe bulk destructive workflows across Archestimator tree, table, card, and catalogue surfaces. Product implementation completed locally on 2026-06-03 and the plan is no longer active under `.ai/03_plans`.

## Status

Implemented locally and archived after validation. Hosted/manual beta evidence remains governed by the launch-readiness roadmap and is not implied by this archive.

## Canonical Path

`.ai/09_archive/2026-06-03-2026-06-03-tree-selection-drag-affordance-bulk-delete-plan/`

## Strict Scope Boundary

This archive records the completed local implementation. Future agents must treat hosted/manual launch proof as still separate unless fresh evidence is added to the launch-readiness evidence store.

Related but separate workstream. This plan does not supersede, replace, or modify `.ai/03_plans/2026-06-03-mass-deletion-projects-estimate-sheets-library-components.md`.

## Document Index

| File | Purpose |
|---|---|
| `00-original-plan.md` | Preserved original draft with stale scope/path statements corrected. |
| `01-current-codebase-audit.md` | Evidence-backed audit of live files, symbols, schema, and tests. |
| `02-ux-ui-behavior-spec.md` | Required UX, state, event, accessibility, modal, and error behavior. |
| `03-technical-architecture.md` | Shared primitives, row architecture, state ownership, server action/RPC contracts. |
| `04-data-permissions-and-delete-contracts.md` | Entity-specific delete/archive contracts, cascades, permissions, cleanup, and tests. |
| `05-implementation-sequence.md` | Low-risk phase plan with files, steps, acceptance criteria, commands, rollback, and risks. |
| `06-test-and-validation-plan.md` | Existing coverage anchors, new test matrix, QA matrices, and validation commands. |
| `07-risk-register-and-open-decisions.md` | Prioritized risk table and strategic decisions. |
| `08-readiness-scorecard.md` | Initial and final readiness scoring against the required rubric. |
| `09-implementation-agent-prompt.md` | Copy-paste prompt for the future implementation agent. |
| `10-final-planning-report-template.md` | Final report template preserved from planning. |
| `IMPLEMENTATION_REPORT.md` | Completed local implementation report, validation evidence, risks, and follow-up gates. |

## Recommended Reading Order

1. `README.md`
2. `01-current-codebase-audit.md`
3. `04-data-permissions-and-delete-contracts.md`
4. `02-ux-ui-behavior-spec.md`
5. `03-technical-architecture.md`
6. `05-implementation-sequence.md`
7. `06-test-and-validation-plan.md`
8. `07-risk-register-and-open-decisions.md`
9. `09-implementation-agent-prompt.md`
10. `10-final-planning-report-template.md`

## Implementation Phase Overview

1. Harden the shared row affordance contract already present in `WorkshopTreeRow` and `tree-row-affordances.tsx`.
2. Add shared selection utilities and tests.
3. Add estimate tree visible handles and checkbox selection while preserving route/RCT state.
4. Add server-side estimate node bulk delete.
5. Add library folder tree visible handles and selection.
6. Add estimate sheet table select-visible and bulk delete.
7. Add project card selection and typed-confirm bulk delete.
8. Add component catalogue archive-first selection and gated hard delete.
9. Complete cross-surface accessibility, focus, toast, and design-system polish.
10. Run final validation and release checklist.

## Final Readiness Score

Implemented locally and validation-green on 2026-06-03. The remaining deliberate risks are hosted/manual beta proof and future database transaction consolidation for multi-entity destructive operations.

## Last Audit Date

2026-06-03

## Commit Hash

Recorded in git history for the final implementation commit and push; see `IMPLEMENTATION_REPORT.md` for validation evidence and final response for the pushed SHA.
