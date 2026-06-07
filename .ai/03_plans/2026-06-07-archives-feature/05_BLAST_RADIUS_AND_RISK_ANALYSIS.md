# Blast Radius and Risk Analysis: Project Archives Feature

This document analyzes the impact and risks associated with implementing the Project Archives feature.

## Affected User Flows

- **Project Browsing:** The projects page preserves existing tabs (Your Projects / Shared to you) and adds an "Archived" tab as a third top-level tab. The existing tabs implicitly show active projects (filtered by `archived_at IS NULL`).
- **Project Archiving:** A new flow allowing users to select projects, preview the archive action, confirm with a button click, and execute.
- **Project Restoring:** A new flow within the "Archived" tab to select archived projects, preview restoration, and execute.
- **Project Dashboard Access:** Users attempting to access an archived project's dashboard will be redirected to `/workshop/projects` with an "Archived" notification.
- **Estimate Access:** Estimates belonging to archived projects will be blocked/inaccessible.
- **Chart Access:** Charts belonging to archived projects will be blocked/inaccessible.
- **Homebase:** The homebase view will exclude archived projects from "Recent" and "Favorites" sections.
- **Favorites:** Archived projects will be hidden from the favorites list but will reappear if restored.
- **Collaboration:** Shared project lists will exclude archived projects. Pending invites for archived projects are preserved but hidden.
- **Publication:** Shared links for archived projects will be "paused," showing an "Archived" state instead of the project content.

## Affected Modules

- **`src/lib/projects/actions.ts`:** New server actions: `previewBulkArchiveProjects`, `executeBulkArchiveProjects`, `previewBulkRestoreProjects`, `executeBulkRestoreProjects`.
- **`src/lib/repositories/workspace-repository.ts`:** Filter logic changes in `listCurrentWorkspaceProjects` and `getWorkshopHomebaseData`.
- **`src/lib/mass-deletion/bulk-action.ts`:** New archive/restore action types (simple confirm button, NOT typed phrase — archive is non-destructive).
- **`src/components/workshop/projects-page-client.tsx`:** UI changes for tabs and archive/restore state management.
- **`src/components/workshop/LiveProjectCard.tsx`:** Addition of the archive action to the card UI.
- **`src/components/workshop/ProjectDetailsModal.tsx`:** Addition of the archive action to the details view.
- **`src/components/workshop/BulkActionToolbar.tsx`:** Integration of the archive action for bulk selections.
- **`src/components/workshop/BulkDestructivePreviewModal.tsx`:** Potential extension or duplication for archive previews.
- **`src/app/workshop/projects/[projectId]/page.tsx` & `layout.tsx`:** Implementation of archived-state guards.
- **`src/app/workshop/projects/[projectId]/estimates/`:** Implementation of archived-state guards for all estimate sub-routes.
- **`supabase/migrations/`:** New migration for `archived_at` and `archived_by` columns and associated RPCs.
- **`src/lib/supabase/types.ts`:** Type updates reflecting the new schema and RPCs.
- **API/data access surfaces:** Archive state must be checked before serving project data through any authenticated endpoint:
  - `src/app/api/projects/[projectId]/estimates/[estimateId]/export/proposal.xlsx/route.ts` — XLSX export must reject archived project exports
  - `src/app/api/projects/images/route.ts` — project image serving should check project isn't archived
  - `src/app/api/ai/ask/route.ts` — AI ask must exclude archived project data from context reads
  - `src/app/api/ai/package-builder/route.ts` — AI package builder must reject operations on archived projects
- **`src/lib/ai/read-context.ts`:** AI read context should exclude archived project data (similar to how it already excludes archived/discontinued library items)

## Affected Routes

- `/workshop`: Homebase view (filtering).
- `/workshop/projects`: Project list (new tabs and filtering).
- `/workshop/projects/[projectId]`: Dashboard (redirect guard).
- `/workshop/projects/[projectId]/estimates`: Estimate list (block guard).
- `/workshop/projects/[projectId]/estimates/[nodeId]`: Estimate editor (block guard).
- `/workshop/projects/[projectId]/charts`: Charts view (block guard).
- `/api/projects/[projectId]/estimates/[estimateId]/export/proposal.xlsx`: XLSX export (reject for archived).
- `/api/projects/images`: Project image serving (check archive state).
- `/api/ai/ask`: AI ask endpoint (exclude archived project data).
- `/api/ai/package-builder`: AI package builder (reject archived project ops).

## Affected Tests

- `projects-page-access-tabs.test.tsx`: Needs update for the new "Archived" tab.
- `mass-deletion-action-contract.test.ts`: Needs new cases for archive actions.
- `mass-deletion-ui-contract.test.ts`: Needs update for archive UI contract.
- `bulk-action-validation.test.ts`: Needs new cases for archive confirmation UI (simple button confirm, not typed phrase).
- `project-dashboard-ui.test.ts`: Needs cases for archived project redirection.
- `project-publication-schema.test.ts`: Needs cases for archived publication states.
- All project-list related tests: May need updates to account for default filtering of archived projects.

## Risk Matrix

| Risk | Severity | Likelihood | Mitigation |
| :--- | :--- | :--- | :--- |
| **Database Migration** | MEDIUM | LOW | Additive migration; no breaking changes to existing columns. |
| **Route Behavior Changes** | MEDIUM | LOW | Guards are fail-closed (redirect away if archived). |
| **Query Filter Regressions** | HIGH | LOW | Missing `WHERE` clause could hide active projects; mitigated by comprehensive unit tests. |
| **UI Regression** | LOW | MEDIUM | New tab may impact layout on smaller screens; mitigated by design-system linting. |
| **Design-System Lint Failure** | LOW | HIGH | New UI needs compliance; mitigated by running `lint:design-system` early. |
| **Concurrency** | LOW | LOW | Archive/restore operations are idempotent-ish. |
| **Merge Conflicts** | MEDIUM | MEDIUM | Active repository with multiple agents; mitigated by frequent pulls and small commits. |

## Mitigations

- **Phased Rollout:** Implementation is divided into 7 distinct phases with clear boundaries.
- **Rollback Points:** Each phase has a defined rollback strategy.
- **Additive Schema:** Database changes are additive, allowing for easy "roll forward" by nullifying the `archived_at` column.
- **Fail-Closed Guards:** Route guards default to blocking access if a project is archived.
- **Incremental UI:** UI changes add new elements (tabs) rather than restructuring existing ones.
- **Full Test Suite:** A complete validation run is required after each phase to catch regressions early.
