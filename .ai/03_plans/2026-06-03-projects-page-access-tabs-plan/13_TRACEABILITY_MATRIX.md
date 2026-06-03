# 13 Traceability Matrix

This matrix maps every functional requirement to its acceptance criteria, affected source modules, implementation step, test/verification method, risk/rollback note, and current status. Every row is concrete and directly traceable to `01_REQUIREMENTS_AND_ACCEPTANCE_CRITERIA.md`, `04_IMPLEMENTATION_SEQUENCE.md`, and `06_TESTING_AND_VERIFICATION_PLAN.md`.

## Legend

| Status | Meaning |
|---|---|
| `NOT_IMPLEMENTED` | Requirement has not been coded; exists only in plan. |
| `IN_PROGRESS` | Implementation started but not verified. |
| `VERIFIED` | Implementation complete, focused tests pass, full validate passes. |
| `DEFERRED` | Intentionally excluded from this feature scope. |
| `REMOVED` | Requirement superseded or dropped by product decision. |

## Matrix

| Req ID | Requirement | AC ID | Files/Modules Affected | Impl Step | Test/Verification | Risk/Rollback | Status |
|---|---|---|---|---|---|---|---|
| FR-01 | Two tabs: `Your Projects` and `Projects shared to you`; no All/Owned/Shared filter | AC-01, AC-02 | `projects-page-client.tsx` | Step 2 (tab model), Step 3 (toolbarPanel) | DOM test 1: renders exactly two tabs, no old filter labels | Remove old `PROJECT_ACCESS_FILTER_OPTIONS`; rollback: restore filter model | NOT_IMPLEMENTED |
| FR-02 | `Your Projects` = `accessKind === "owned"` | AC-03 | `projects-page-client.tsx` | Step 2 (partition data) | DOM test 2: owned cards in Your Projects only | Partition via `useMemo`; rollback: restore old filter logic | NOT_IMPLEMENTED |
| FR-03 | `Projects shared to you` = `accessKind !== "owned"` (project-member, sheet-member, pending-invite) | AC-04 | `projects-page-client.tsx` | Step 2 (partition data), Step 4 (content) | DOM test 3: shared tab shows all non-owned cards | Shared tab includes pending-invite; rollback: restore `accessFilter === "shared"` | NOT_IMPLEMENTED |
| FR-04 | Tab labels with optional counts | AC-01 | `projects-page-client.tsx` | Step 3 (toolbarPanel) | DOM test 1: tab labels include count badges | Counts derive from memoized arrays; rollback: remove count display | NOT_IMPLEMENTED |
| FR-05 | Search filters active tab only | AC-06 | `projects-page-client.tsx` | Step 4 (content) | DOM test 6: search filters active tab, not cross-tab | Search query preserved across tabs; rollback: restore global search | NOT_IMPLEMENTED |
| FR-06 | View mode persists across tabs | AC-05 | `projects-page-client.tsx` | Step 4 (content) | DOM test: view mode unchanged after tab switch | `PROJECT_VIEW_MODE_STORAGE_KEY` unchanged; no rollback risk | NOT_IMPLEMENTED |
| FR-07 | Add Project action in owned context only | AC-10 | `projects-page-client.tsx` | Step 4 (empty states) | DOM test 2: owned empty has Create action; DOM test 5: shared empty has no Create action | Toolbar Add stays; shared empty uses invitation copy; rollback: none | NOT_IMPLEMENTED |
| FR-08 | Pending invite cards in shared tab with Accept action | AC-09 | `LiveProjectCard.tsx` (no change needed) | Step 4 (content) | DOM test 3: pending invite card renders Accept button in shared tab | `acceptPendingInvitationById` unchanged; rollback: none | NOT_IMPLEMENTED |
| FR-09 | Default to shared tab when 0 owned + shared > 0 | AC-07 | `projects-page-client.tsx` | Step 2 (initialTab) | DOM test 4: shared tab active when no owned projects | `initialTab` derived before `useState`; rollback: restore `"all"` default | NOT_IMPLEMENTED |
| FR-10 | Suppress shared favorite (no broken star on non-owned cards) | AC-11 | `projects-page-client.tsx`, `LiveProjectCard.tsx` | Step 5 (favorite) | DOM test 8: shared cards lack favorite star; owned cards retain it | Pass `onToggleFavorite` only for owned; rollback: restore handler for all cards | NOT_IMPLEMENTED |
| FR-11 | Bulk delete selection scoped to active tab; delete preview uses full project list | AC-12 | `projects-page-client.tsx` | Step 4.5 (bulk-delete), Step 6.5 (preserve machinery) | DOM test: selection toolbar count reflects active tab; manual smoke: select in tab A, switch to tab B, toolbar hides; switch back, toolbar returns | `selectedProjectIds` Set persists globally; `selectedVisibleProjectIds` scoped to active tab; `openProjectDeletePreview` uses `projectItems` not `displayProjects`; rollback: none if correctly implemented | NOT_IMPLEMENTED |

## Acceptance Criteria Traceability

| AC ID | Test/Verification | Status |
|---|---|---|
| AC-01 | DOM test 1: renders tablist with exactly two tabs named `Your Projects` and `Projects shared to you` | NOT_IMPLEMENTED |
| AC-02 | DOM test 1: old All/Owned/Shared filter labels absent from DOM | NOT_IMPLEMENTED |
| AC-03 | DOM test 2: owned projects appear only under Your Projects | NOT_IMPLEMENTED |
| AC-04 | DOM test 3: project-member, sheet-member, pending-invite cards appear only under Shared | NOT_IMPLEMENTED |
| AC-05 | DOM test: view mode unchanged after tab switch | NOT_IMPLEMENTED |
| AC-06 | DOM test 6: search within active tab produces tab-specific empty copy | NOT_IMPLEMENTED |
| AC-07 | DOM test 4: shared tab active by default when 0 owned + shared > 0 | NOT_IMPLEMENTED |
| AC-08 | DOM test 5: shared tab visible and shows invitation copy when empty | NOT_IMPLEMENTED |
| AC-09 | DOM test 3: pending invite Accept button renders and works in shared tab | NOT_IMPLEMENTED |
| AC-10 | DOM test 2/5: Add Project available from owned empty state only | NOT_IMPLEMENTED |
| AC-11 | DOM test 8: shared cards lack favorite star | NOT_IMPLEMENTED |
| AC-12 | DOM tests cover mixed owned/shared, only-shared, empty shared, search, a11y roles, bulk-delete interaction | NOT_IMPLEMENTED |
| AC-13 | `bun run type-check`, `bun run lint`, `bun run lint:design-system`, focused DOM tests, `bun run validate` all pass | NOT_IMPLEMENTED |
| AC-14 | No source files outside blast radius changed (`projects-page-client.tsx`, `LiveProjectCard.tsx`, test file, `.ai` docs only) | NOT_IMPLEMENTED |

---

*This document was created during the 2026-06-03 plan refinement. The plan is ready for implementation. See `14_CODE_DRIFT_AND_RECONCILIATION_PLAN.md` for source-code drift findings reconciled during refinement.*
