# Risk Register and Open Decisions

This document tracks identified risks, their severity, probability, impact, mitigation strategies, and resolved decisions.

## Risk Register

| Risk | Severity | Probability | Impact | Mitigation | Status | Owner |
|---|---:|---:|---|---|---|---|
| **Invalid nested interactive markup** | High | Medium | High | Force `as="div"` on `WorkshopTreeRow` whenever `dragHandleSlot` or `leadingSlot` is provided. Validate with design-system lint. | Mitigated | Implementation Agent |
| **React Complex Tree handler breakage** | High | Medium | High | Keep RCT drag handlers on the row wrapper. Use drag handle as visual-only affordance. Apply `event.stopPropagation()` on checkbox/inline actions. | Mitigated | Implementation Agent |
| **Confusing route selection with bulk selection** | Medium | High | Medium | Maintain `bulkSelectedNodeIds` completely separate from RCT's `selectedItems` (which controls route/focus). Clearly distinguish visual states. | Mitigated | Implementation Agent |
| **Accidental destructive deletes** | Critical | Low | Critical | Require typed confirmation ("DELETE PROJECTS", "DELETE ESTIMATE SHEETS") for top-level destructive objects. Show accurate descendant preview counts. | Mitigated | Implementation Agent |
| **Non-cascading database dependencies orphaned** | Critical | Medium | Critical | Explicitly delete/nullify `project_favorites`, `project_members`, `collaboration_invitations`, etc., in server actions/RPCs *before* deleting parent rows. | Mitigated | Implementation Agent |
| **Hard delete of referenced library components** | High | Low | High | Default bulk action to **Archive**. Gate hard delete behind admin-only check and a strict zero-reference RPC validation. | Mitigated | Implementation Agent |
| **Permission/RLS gaps in bulk operations** | Critical | Low | Critical | All bulk server actions must validate workspace scoping (`ensureDefaultWorkspace`) and explicit edit permissions (`can_edit_estimate`, project ownership) before executing. | Mitigated | Implementation Agent |
| **Storage cleanup deleting unsafe paths** | High | Low | High | Implement strict path validation: must end with `.webp` (or valid attachment type), contain specific bucket folders (e.g., `/project-images/`), and lack `..` or `//`. Best-effort only, post-DB transaction. | Mitigated | Implementation Agent |
| **Optimistic UI rollback failures** | Medium | Medium | Medium | Capture pre-mutation state snapshot. On server error, restore exact snapshot. Clear pending optimistic revision flags. | Mitigated | Implementation Agent |
| **Stale selections after filtering or refresh** | Medium | High | Low | "Select visible" only targets currently rendered IDs. Clear selection state on route change or explicit refresh. | Mitigated | Implementation Agent |
| **Scope collision with mass-deletion workstream** | Medium | Low | Medium | Explicitly document in README and all files: "Related but separate workstream. This plan does not supersede or modify the mass-deletion plan." | Mitigated | Planning Agent |
| **Design-system lint violations** | Medium | Medium | Medium | Run `bun run lint:design-system` after Phase 1. Ensure all new components use approved tokens and patterns. | Mitigated | Implementation Agent |
| **Over-broad implementation in one PR** | High | High | High | Enforce strict phase-by-phase implementation. Each phase must be committed and tested independently. | Mitigated | Implementation Agent |

## Open Decisions (Resolved)

| Decision | Context | Resolution | Evidence |
|---|---|---|---|
| **Hard delete for cost library components with estimate row references?** | Q1 in original plan. | **No.** Bulk action defaults to **Archive**. Hard delete is admin-only and gated behind zero-reference RPC check. | `04-data-permissions-and-delete-contracts.md`, Section 5. |
| **Which FKs cascade when deleting estimates and projects?** | Q2 in original plan. | `projects → estimates → nodes/rows/versions/events` cascade. Non-cascading tables (`project_favorites`, etc.) must be handled explicitly. | `04-data-permissions-and-delete-contracts.md`, Sections 1 & 2. |
| **Are project members/shared estimate users allowed to delete?** | Q3 in original plan. | **No.** Workspace admins and project owners only. Validated via RLS and server action workspace scoping. | `04-data-permissions-and-delete-contracts.md`, Section 1. |
| **Should tree parent checkbox selection cascade to descendants?** | Q4 in original plan. | **Yes.** Checking a group node selects all eligible descendants. Indeterminate parent shown for partial selection. | `03-technical-architecture.md`, Utility Functions. |
| **Should Select All mean all visible filtered items or all items in dataset?** | Q5 in original plan. | **"Select visible"** selects currently rendered rows matching filters. Full dataset selection is deferred. | `02-ux-ui-behavior-spec.md`, Section 13. |
| **Can react-complex-tree support true handle-only drag?** | Q6 in original plan. | **Compromise:** Keep RCT's row-level drag handlers. Add visible grip icon as visual affordance. Ensure checkbox/inline actions don't trigger drag via event isolation. | `03-technical-architecture.md`, Event Propagation Strategy. |
| **What happens to current route selection after deleting the active node/sheet/project?** | Q7 in original plan. | **Nodes:** Compute `fallbackNodeId` via `planEstimateTreeDelete`. **Sheets:** Redirect to project estimates list. **Projects:** Redirect to `/workshop/projects`. | `02-ux-ui-behavior-spec.md`, Section 14. |
| **Dedicated RPC migration for bulk operations or handle in server actions?** | Q8 in original plan. | **Hybrid:** Server actions for simple cases (estimates with FK cascade). Dedicated RPCs for complex cases (projects with 10+ dependent tables, library with reference checks). | `04-data-permissions-and-delete-contracts.md`, RPC Strategy sections. |