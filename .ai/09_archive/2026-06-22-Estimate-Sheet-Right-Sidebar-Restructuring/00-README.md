# Estimate Sheet Right Sidebar Restructuring

Status: planning/readiness pack  
Created: 2026-06-22  
Surface: Estimate Sheet right sidebar at `/workshop/projects/[projectId]/estimates/[estimateId]`  
Scope: code-backed plan only; no application code, migrations, browser automation, or visual QA in this pass.

## Short Answer

Yes: add a separate `Project` tab. The cleanest IA is:

1. `Library` - reusable workspace-wide components.
2. `Project` - project-owned components only.
3. `Templates` - reusable estimate structures and project-derived template sources.

This solves the current confusion because project-owned components are components, but their difference is ownership and reuse scope. Users do not need that mixed into the reusable library tree.

## Source Of Truth

This pack intentionally uses code as the primary evidence. Visual/browser proof was skipped by owner direction because the future implementation should copy the existing tab/header/tree format from the current `Components` and `Templates` surfaces.

Primary code anchors:

- `src/components/workshop/component-library/index.tsx` - current sidebar tabs, state, toolbar, tree rendering, bulk actions, search, preview.
- `src/components/workshop/component-library/tree/buildLibraryTree.ts` - current project-folder injection inside the components tree.
- `src/lib/component-library/project-component-projection.ts` - current project-owned projection dataset.
- `src/components/workshop/EstimateSheetContent.tsx` - lazy sidebar data load and cache invalidation.
- `src/components/workshop/estimate-sheet/rows/cells.tsx` - current user-facing `Library Component` and `Project Component` labels.

## Artifact Map

| File | Purpose |
| --- | --- |
| `01-current-state-and-code-audit.md` | What the sidebar does today and where the confusion comes from. |
| `02-target-ux-and-requirements.md` | Target taxonomy, product requirements, copy, and acceptance criteria. |
| `03-component-and-file-plan.md` | Implementation units and file-level plan. |
| `04-blast-radius-and-concurrency-watch.md` | Risk map, shared-file collision points, and boundaries. |
| `05-ux-state-matrix.md` | Loading, empty, error, search, bulk, preview, keyboard, and copy states. |
| `06-qa-verification-matrix.md` | Targeted tests and proof paths. |
| `07-rollout-rollback-and-stop-conditions.md` | Release shape, rollback path, and stop rules. |
| `08-open-decisions-and-risk-register.md` | Product decisions, defaults, and residual risks. |
| `09-readiness-scorecard.md` | Handoff readiness and completion gate for this plan. |
| `10-research-and-sources.md` | Local source evidence and external product-pattern references. |
| `11-implementation-handoff.md` | Exact first implementation pass, defaults, and guardrails. |
| `LOOP_LEDGER.md` | Planning loop record and evidence summary. |

## Non-Goals

- Do not redesign `/workshop/library`.
- Do not change database schema.
- Do not change the estimate sheet body model.
- Do not merge Templates project sources into the new Project tab.
- Do not add browser/visual proof until an implementation exists and a browser-only claim needs proof.

## Recommended Next Step

Implement from `11-implementation-handoff.md`. The first pass should be a local sidebar view-model split: partition `libraryItems` into reusable library items and project-projected items, then add the third tab branch using the same existing header, toolbar, tree, preview, drag, and bulk mechanics.
