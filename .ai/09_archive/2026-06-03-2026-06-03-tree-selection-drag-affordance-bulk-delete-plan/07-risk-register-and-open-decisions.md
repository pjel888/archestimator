# Risk Register and Open Decisions

Related but separate workstream. This plan does not supersede, replace, or modify `.ai/03_plans/2026-06-03-mass-deletion-projects-estimate-sheets-library-components.md`.

## Risk Register

| Risk | Severity | Probability | Impact | Mitigation | Decision / Status | Owner |
|---|---|---:|---|---|---|---|
| Invalid nested interactive markup | High | 3 | Checkbox/button inside native button would break accessibility and events. | Use existing `WorkshopTreeRow` forced `div` slot strategy; add DOM tests. | Decided: non-button row variant for interactive slots. | Future executor |
| React Complex Tree handler breakage | High | 3 | Drag/drop, focus, or context menu could regress. | Keep RCT row-level handlers; add visual handle only; preserve DnD tests. | Decided: handle-only drag not assumed. | Future executor |
| Route selection confused with bulk selection | High | 4 | User may delete wrong current object or lose context. | Separate `bulkSelected*Ids` from RCT/route state and use distinct visuals. | Decided. | Future executor/designer |
| Accidental destructive deletes | Critical | 3 | Data loss. | Server-side validation, typed confirmation for projects/sheets, preview for all destructive flows. | Decided. | Future executor |
| Non-cascading database dependencies | Critical | 2 | Orphaned rows or failed deletes. | Use migration-backed dependency map; live DB check before destructive implementation. | Mostly decided; live DB check remains gate. | Future executor |
| Hard delete of referenced library components | Critical | 3 | Estimate traceability loss. | Archive by default; hard delete requires zero-reference proof. | Decided. | Future executor |
| Permission/RLS gaps | Critical | 3 | Unauthorized destructive mutation. | Server actions revalidate workspace/project/estimate permissions; RLS is defense-in-depth. | Decided. | Future executor |
| Storage cleanup deleting unsafe paths | Critical | 2 | Unrelated file loss. | Reuse safe path validation; bucket/path allowlist; return cleanup failures. | Decided. | Future executor |
| Optimistic UI rollback failure | High | 3 | UI shows deleted data or stale selections. | Rollback where current pattern supports it; otherwise force safe refresh. | Decided. | Future executor |
| Stale selections after filtering/refresh | Medium | 4 | User acts on hidden or nonexistent IDs. | `clearInvalidSelectionsAfterRefresh`; select-visible only. | Decided. | Future executor |
| Scope collision with mass-deletion workstream | High | 2 | Conflicting docs/implementation ownership. | Required boundary wording; do not edit other folder/plan. | Decided: related but separate. | Current/future agents |
| Design-system lint violations | Medium | 3 | UI drifts from app design. | Use shared primitives; run `bun run lint:design-system`. | Decided. | Future executor |
| Over-broad implementation in one PR | High | 3 | Hard review, high regression risk. | Ten phase sequence; commit coherent milestones. | Decided. | Future executor |
| Insufficient test coverage | High | 3 | Silent data/UI regressions. | Add unit, DOM, server action, e2e, manual matrices. | Decided. | Future executor/tester |
| Hidden shared-link/publication references | High | 2 | Broken public/collaboration data after project delete. | Migration-backed map and live DB verification gate. | Mostly decided; verify live before coding. | Future executor |
| Deleting active route object | High | 3 | User lands on broken route. | Action returns fallback href/node; router moves after success. | Decided. | Future executor |
| Inconsistent bulk behavior across surfaces | Medium | 3 | Product feels patched together. | Shared primitives/utilities/count/modal copy. | Decided. | Future executor/designer |
| No keyboard path for selection/reorder | High | 2 | Accessibility failure. | Native checkbox path; preserve RCT keyboard; handle is decorative unless true keyboard drag exists. | Decided. | Future executor/designer |

## Strategic Decisions

| Decision | Status | Evidence / Rationale |
|---|---|---|
| A -- Shared primitive first | Accepted | `WorkshopTreeRow` and `tree-row-affordances.tsx` already exist and are shared by tree surfaces. |
| B -- Do not mix route selection and bulk selection | Accepted | `EstimateSheetTree` and `LibraryFolderTree` already use RCT selected/focused state for route/folder focus. |
| C -- Avoid invalid nested interactive markup | Accepted | Existing row slot strategy already forces `div`; harden/tests first. |
| D -- Visible drag handle as affordance first | Accepted | Current RCT wiring keeps drag handlers on rows; handle-only drag is not proven. |
| E -- Archive referenced library components by default | Accepted | FK `SET NULL` does not satisfy product traceability; archive is safer. |
| F -- Select visible, not entire database | Accepted | Table/tree visible state is client-rendered; global select-all needs separate server preview. |
| G -- Strong typed confirmation for projects and estimate sheets | Accepted | These are top-level destructive objects with broad cascades. |
| H -- Server-side bulk actions, not client loops | Accepted | Bulk destructive operations require permission, transaction, cleanup, and fallback guarantees. |

## Remaining Open Gates

| Gate | Why It Remains | Required Action Before Implementation |
|---|---|---|
| Live DB cascade/RLS introspection | This docs task used migrations and generated types only. | Run linked/local DB schema inspection before destructive RPC/migration work. |
| True handle-only RCT drag | Current wiring does not prove it. | Only pursue in a dedicated proof with tests; otherwise keep visual-only handle. |
| Project storage path inventory | Existing single delete handles project images; other project-owned files were not proven. | Re-run storage metadata search before bulk project delete. |
| Component hard delete storage inventory | Repository exposes image/thumbnail/attachments, but final ownership rules need implementation proof. | Build server-side preview and safe cleanup tests. |

## Stop Condition For Future Executor

If implementation evidence contradicts any accepted decision, stop coding in that phase, update this planning package with the new evidence, and report the contradiction before proceeding.
