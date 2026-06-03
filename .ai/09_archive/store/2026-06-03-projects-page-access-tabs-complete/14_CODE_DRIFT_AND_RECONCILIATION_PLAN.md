# 14 Code Drift and Reconciliation Plan

**Date:** 2026-06-03
**Purpose:** Document drift between the original plan (created from GitHub-read-only inspection) and the actual local source code verified during refinement. All corrections have been applied.

## Stale Path References (FIXED)

The plan was originally drafted to folder `2026-06-03-projects-page-access-tabs/` (without `-plan` suffix). The actual plan folder is `2026-06-03-projects-page-access-tabs-plan/`. These files contained stale references:

| File | Line | Stale Reference | Fix Applied |
|---|---|---|---|
| `00_INDEX.md` | 4 | `.ai/03_plans/2026-06-03-projects-page-access-tabs/` | Corrected to `-plan` |
| `10_IMPLEMENTATION_PROMPT_DRAFT.md` | 12 | `.ai/03_plans/2026-06-03-projects-page-access-tabs/` | Corrected to `-plan` |
| `FINAL_REPORT_LOCAL_ONLY.md` | 5 | `.ai/03_plans/2026-06-03-projects-page-access-tabs/` | File removed (stray agent report) |
| `.ai/15_Bugs/2026-06-03-shared-project-favorite-action-rejects-visible-shared-projects.md` | 14 | `.ai/03_plans/2026-06-03-projects-page-access-tabs/` | Corrected to `-plan` |

## Stale Statement About `.ai/15_Bugs` (FIXED)

`02_CODEBASE_RESEARCH.md` line 75-76 originally stated: `.ai/15_Bugs was not found as an existing folder/file through README.md`. This was a GitHub-read-only artifact. Local verification shows `.ai/15_Bugs/` exists with 6 bug files. Fixed.

## Source Code Shape Confirmation

### Plan was CORRECT about:

| Code Detail | Plan Assumption | Local Confirmation |
|---|---|---|
| `PROJECT_ACCESS_FILTER_OPTIONS = ["all", "owned", "shared"]` | Line ~60 of projects-page-client.tsx | Confirmed at line 60 |
| `ProjectAccessFilter` type, `accessFilter` state defaulting to `"all"` | Lines ~62, ~170 | Confirmed at lines 62, 170 |
| `hasSharedProjects` used to conditionally show filter | Line ~195 | Confirmed at line 195 |
| Inline tablist shown only when `hasSharedProjects` | Line ~366 | Confirmed at line 366 |
| `toggleProjectFavorite` passed to all `LiveProjectCard` instances | Line ~417 | Confirmed at line 417 |
| `WorkshopCollectionLayout.toolbarPanel` exists as `ReactNode` prop | WorkshopCollectionLayout.tsx | Confirmed at line 26 |
| `LiveProjectCard` props: `selectedForDeletion`, `selectionDisabledReason`, `onToggleSelected` | LiveProjectCard.tsx | Confirmed at lines 39-41 |
| Favorite star hidden only for `isPendingInvite` (line 173), NOT for project-member/sheet-member | Favorite bug confirmed | Confirmed — shared cards DO show broken star |

### Plan was INCOMPLETE about (now documented):

The original plan did not document the full bulk delete/selection machinery present in the local source:

| Symbol | Location (line) | Purpose |
|---|---|---|
| `canSelectProjectForDeletion(item)` | projects-page-client.tsx:148 | Returns false for pending-invite/sheet-member |
| `getProjectDeletionDisabledReason(item)` | projects-page-client.tsx:154 | Returns reason string for disabled selection |
| `BulkActionToolbar` | projects-page-client.tsx:385 | Renders selection count + action/clear buttons |
| `BulkDestructivePreviewModal` | projects-page-client.tsx:480 | Confirmation modal with required phrase |
| `selectableDisplayProjectIds` | projects-page-client.tsx:230 | Memoized list of deletable visible project IDs |
| `selectedVisibleProjectIds` | projects-page-client.tsx:234 | Selected IDs filtered to those in active display list |
| `selectedProjectIds` | projects-page-client.tsx:178 | Set of all selected project IDs (global across tabs) |
| `openProjectDeletePreview(projectIds)` | projects-page-client.tsx:292 | Loads preview, filters by `canSelectProjectForDeletion` |
| `executeProjectDeletePreview()` | projects-page-client.tsx:320 | Executes deletion, removes from selection, refreshes |
| `previewBulkDeleteProjects()` | `src/lib/projects/actions.ts` | Server-side preview RPC |
| `executeBulkDeleteProjects()` | `src/lib/projects/actions.ts` | Server-side execution with preview hash verification |

## Tab/Bulk-Delete Interaction (Reconciled)

After tab filtering, these interactions must work correctly:

1. **`selectableDisplayProjectIds`**: Derives from `displayProjects`. After tab filtering, this will be the active tab's filtered list. Correct behavior — selecting all visible should select only what the user can see.

2. **`selectedVisibleProjectIds`**: Filters `selectedProjectIds` to those visible in active tab. If a selected project is in the non-active tab, it won't appear here. BulkActionToolbar count drops to 0 for cross-tab selections. This is intended — selections persist in the Set.

3. **"Select all visible"**: Uses `selectableDisplayProjectIds`. Tab-scoped. Correct.

4. **"Clear selection"**: Resets entire `selectedProjectIds` Set (line 390). Global clear. Correct.

5. **`openProjectDeletePreview()`**: Must use full `projectItems` (not `displayProjects`) for authorization (line 293: `projectItems.filter(canSelectProjectForDeletion)`). Verified — already uses `projectItems`. Delete preview will correctly authorize all selected projects regardless of active tab.

6. **Critical verification**: After adding tab filtering, verify `openProjectDeletePreview` still uses `projectItems`, not `displayProjects` or `activeBaseProjects`. Read Step 6.5 in `04_IMPLEMENTATION_SEQUENCE.md`.

## Drift Mapping Table

| Old Plan Language | Current Local Source Evidence | Action |
|---|---|---|
| Plan folder `.ai/03_plans/2026-06-03-projects-page-access-tabs/` | Actual folder is `-plan` | FIXED in all docs |
| `.ai/15_Bugs` does not exist | `.ai/15_Bugs/` exists with 6 files | FIXED in 02_CODEBASE_RESEARCH.md |
| Implementation steps mention no bulk-delete reconciliation | Local code has 11+ bulk delete symbols | ADDED Steps 4.5 and 6.5 in 04_IMPLEMENTATION_SEQUENCE.md |
| Scorecard claims 98.8% readiness | Missing traceability matrix, stale refs, stray file, unaddressed bulk-delete | FIXED: honest rescore to 98 in new 11_READINESS_SCORECARD.md |
| Implementation prompt points at stale path | Fixed | Corrected in 10_IMPLEMENTATION_PROMPT_DRAFT.md |

## Future Implementation Agent Re-verification Instructions

Before coding, the implementation agent should:

```bash
# 1. Confirm current filter model still matches plan assumptions
rg "PROJECT_ACCESS_FILTER_OPTIONS|ProjectAccessFilter|hasSharedProjects" src/components/workshop/projects-page-client.tsx

# 2. Confirm LiveProjectCard props still match
rg "selectedForDeletion|selectionDisabledReason|onToggleSelected|onToggleFavorite" src/components/workshop/LiveProjectCard.tsx

# 3. Confirm toolbarPanel still available
rg "toolbarPanel" src/components/workshop/WorkshopCollectionLayout.tsx

# 4. Confirm bulk delete machinery intact
rg "selectableDisplayProjectIds|openProjectDeletePreview|BulkActionToolbar" src/components/workshop/projects-page-client.tsx
```

Also re-read this document to understand what was reconciled.

---

*This document was created during the 2026-06-03 plan refinement. All stale references have been corrected. The plan now matches the local source code at refinement time. Implementation agents should still re-verify before editing.*
