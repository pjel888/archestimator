# Library Tree UI Replacement — Plan Index

**Date:** 2026-06-13 (rev. 3 — adds execution runbook, QA proof gates, and command corrections)
**Status:** PLAN READY FOR EXECUTION HANDOFF — open questions answered in doc 07; PR 1 starts with Step 0 validation and must complete the unchecked execution prerequisites in doc 06 before code changes
**Owner:** Philip
**Scope:** Replace the `react-complex-tree`-based folder tree in `/workshop/library/components` with the canonical `Tree` component already used by the estimate workspace, while preserving all existing folder/component drag-and-drop, selection, search, and CRUD behavior.

---

## The one-paragraph version

The estimate workspace (`/workshop/projects/.../estimates/...`) already uses a single, reusable `Tree` primitive (`src/components/ui/tree.tsx`) for its left area tree and for the component/templates trees in the right dock. The standalone `/workshop/library/components` route is the only workshop surface that still uses `react-complex-tree` (`ControlledTreeEnvironment`), and only for its **Folders** view mode; its **Suppliers** and **Brands** view modes already use the canonical `Tree` via `LibraryTree`. This plan documents how to close that gap, the exact files that must change, the domain-logic adapter required, and the incremental rollout that keeps the route shippable after every phase.

---

## Documents

| Doc | Contents |
|---|---|
| [01_DESIGN_BRIEF_AND_PROBLEM.md](01_DESIGN_BRIEF_AND_PROBLEM.md) | User job, problem statement, goals, non-goals, success criteria |
| [02_CURRENT_STATE_ANALYSIS.md](02_CURRENT_STATE_ANALYSIS.md) | Exact current tree implementations, file map, data flows, dependency inventory |
| [03_TARGET_STATE_AND_COMPONENT_REUSE.md](03_TARGET_STATE_AND_COMPONENT_REUSE.md) | Target architecture, canonical `Tree` contract, reuse/extend/retire decisions |
| [04_BLAST_RADIUS_AND_RISK_ANALYSIS.md](04_BLAST_RADIUS_AND_RISK_ANALYSIS.md) | Files impacted, feature-parity gaps, risk register, rollback plan |
| [05_IMPLEMENTATION_APPROACH.md](05_IMPLEMENTATION_APPROACH.md) | Recommended incremental phases, per-phase acceptance criteria, verification steps |
| [06_READINESS_AND_ACCEPTANCE_CRITERIA.md](06_READINESS_AND_ACCEPTANCE_CRITERIA.md) | Pre-implementation readiness checklist, validation gates, definition of done |
| [07_OPEN_QUESTIONS_AND_DECISIONS.md](07_OPEN_QUESTIONS_AND_DECISIONS.md) | **Resolved decisions D1–D18** (phase strategy, planner approach, flags, status pattern, parity deviations, runbook stop gates) |
| [08_TEST_IMPACT_AND_DOM_CONTRACT.md](08_TEST_IMPACT_AND_DOM_CONTRACT.md) | The six Vitest files that gate the migration, supporting tests, the `react-complex-tree` mocks to delete, and the `data-*`/ARIA contract per row |
| [09_DROP_EVENT_TRANSLATION_CONTRACT.md](09_DROP_EVENT_TRANSLATION_CONTRACT.md) | Exact translation tables from canonical `(draggedId, targetId, position)` drops to the existing neutral planner; new-evaluator test cases |
| [10_REFERENCE_IMPLEMENTATION_ESTIMATE_TREE.md](10_REFERENCE_IMPLEMENTATION_ESTIMATE_TREE.md) | Line-by-line map from `EstimateSheetTree.tsx` (the working canonical-Tree consumer) to each `FolderTree` concern; `renderRow` vs `renderItem` |
| [11_CRUD_AND_INTERACTION_PARITY_MATRIX.md](11_CRUD_AND_INTERACTION_PARITY_MATRIX.md) | Full CRUD matrix, synthetic-root spec, interaction-state matrix, and the manual QA walkthrough |
| [12_IMPLEMENTATION_READINESS_RUNBOOK.md](12_IMPLEMENTATION_READINESS_RUNBOOK.md) | MVP execution packet: stop gates, per-PR evidence checklist, manual QA template, adversarial QA scenarios |
| [README.md](README.md) | Quick orientation for the next implementer |

A 2026-06-13 external audit of rev. 1 lives at `.ai/02_audits/2026-06-13-library-tree-ui-replacement-plan-audit.md`; docs 08–12 and the rev. 3 edits address its findings plus the final QA/readiness review.

---

## Source evidence

This plan is based on a direct code audit of the working tree on **2026-06-13**:

- `src/components/ui/tree.tsx` — canonical `Tree` primitive (1,153 LOC)
- `src/components/workshop/EstimateSheetTree.tsx` — left estimate tree using canonical `Tree`
- `src/components/workshop/component-library/tree/LibraryTree.tsx` — canonical `Tree` wrapper for library categories
- `src/components/workshop/component-library/tree/TemplatesTree.tsx` — canonical `Tree` wrapper for templates
- `src/components/workshop/component-library/index.tsx` — estimate right sidebar; uses `LibraryTree`/`TemplatesTree`
- `src/components/workshop/library/LibraryComponentsRoute.tsx` → `LibraryPageClient.tsx` → `ComponentLibraryManager.tsx` — library route entry
- `src/components/workshop/component-library-manager/LibraryFolderTree.tsx` — `react-complex-tree` implementation (1,371 LOC)
- `src/components/workshop/component-library-manager/ComponentLibraryManager.tsx` — library manager orchestrating the tree surface (1,526 LOC)
- `src/components/workshop/component-library-manager/AddComponentModal.tsx` — folder picker consumer (2,359 LOC)
- `src/lib/component-library/library-folder-reorder.ts` — folder/component DnD domain logic; only the thin `evaluateLibraryFolderDrop` translator and two type imports are coupled to `react-complex-tree` — the planner core (`buildLibraryFolderReorderPlan`) is already neutral (363 LOC)
- `src/components/workshop/component-library-manager/library-folder-tree-shared.ts` — shared constants/types: `COMPONENT_VIEW_MODES`, `ALL_COMPONENTS_FOLDER_ID`, `ReorderStatus`, `CreateLibraryFolderHandler` (26 LOC)
- `src/lib/bulk-selection/tree-selection.ts` — cascade selection helpers shared with the estimate tree (112 LOC)
- `src/components/workshop/tree-row-affordances.tsx` — `TreeDragHandle`, `TreeSelectionCheckbox`, `TreeBulkActionBar` (237 LOC)
- `src/app/workshop/layout.tsx` — imports `react-complex-tree/lib/style-modern.css`
- `src/components/workshop/component-library/index.tsx` — imports `ComponentViewControls` from `LibraryFolderTree.tsx`

No `e2e/` specs reference library-folder tree selectors, but **six Vitest files do**. Supporting regression tests also pin the shared tree row affordances, route-level CSS boundary, and folder server actions. Full inventory and per-PR gates live in [08_TEST_IMPACT_AND_DOM_CONTRACT.md](08_TEST_IMPACT_AND_DOM_CONTRACT.md); the proof/evidence checklist lives in [12_IMPLEMENTATION_READINESS_RUNBOOK.md](12_IMPLEMENTATION_READINESS_RUNBOOK.md).

### Concurrent work

Other active plans touch `ComponentLibraryManager.tsx` / `AddComponentModal.tsx` / the library route: `2026-06-11-Library-page-ux-and-ui-improvement/`, `2026-06-11-Unification-Plan-For-Components-And-Templates/`, `2026-06-11-Templates-Page-UX-UI-Audit/`. This migration changes the **tree surface only** (Surface props and panel layout are untouched), so conflicts should be mechanical — but land PR 1 before or after, not interleaved with, any PR that rewrites `LibraryFolderTreeSurface`.

---

## What this plan deliberately does NOT change

- The estimate workspace tree behavior — it is the benchmark, not the target of change.
- The estimate right-sidebar `LibraryTree`/`TemplatesTree` — they already use the canonical component.
- Database schema — zero migrations required.
- The library `/workshop/library` route structure or the component catalogue card grid.
- Supplier/brand view modes in the library tree — they already use the canonical `Tree`.

---

## Deletion criteria

If Philip rejects this direction, delete or archive this folder and leave the `react-complex-tree` implementation in place. No source code changes have been made, so no revert is required.
