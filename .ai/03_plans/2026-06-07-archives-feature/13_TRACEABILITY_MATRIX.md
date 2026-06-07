# Traceability Matrix — Archives Feature

**Date:** 2026-06-07
**Plan:** `.ai/03_plans/2026-06-07-archives-feature/`

## Matrix

| ID | Requirement | Acceptance Criterion | Files/Modules Affected | Implementation Phase | Test/Verification | Risk/Rollback | Status |
|----|-------------|---------------------|----------------------|---------------------|-------------------|---------------|--------|
| R1 | Projects table has archived_at, archived_by columns | Migration applies without error; columns exist in linked Supabase | supabase/migrations/ (new file), src/lib/supabase/types.ts | Phase 2 | Schema contract test; linked Supabase readback | Low risk; additive migration; rollback: DROP COLUMN | Planned |
| R2 | preview_bulk_archive_projects RPC exists | RPC returns eligible/not_found/forbidden/blocked with previewHash | supabase/migrations/, src/lib/supabase/types.ts | Phase 2 | RPC contract test; direct RPC call verification | Low risk; new function; rollback: DROP FUNCTION | Planned |
| R3 | execute_bulk_archive_projects RPC exists | RPC sets archived_at, archived_by; validates previewHash | supabase/migrations/, src/lib/supabase/types.ts | Phase 2 | RPC contract test; stale preview rejection test | Medium risk; state mutation; rollback: set archived_at=NULL | Planned |
| R4 | preview_bulk_restore_projects RPC exists | RPC returns only currently-archived projects as eligible | supabase/migrations/, src/lib/supabase/types.ts | Phase 2 | RPC contract test | Low risk; new function | Planned |
| R5 | execute_bulk_restore_projects RPC exists | RPC sets archived_at=NULL, archived_by=NULL; validates previewHash | supabase/migrations/, src/lib/supabase/types.ts | Phase 2 | RPC contract test | Medium risk; state mutation; rollback: re-archive | Planned |
| R6 | Server actions: previewBulkArchiveProjects | Returns preview result with issues array | src/lib/projects/actions.ts | Phase 3 | Unit test with mock RPC | Low risk; new function | Planned |
| R7 | Server actions: executeBulkArchiveProjects | Calls RPC, returns execution result with archivedIds | src/lib/projects/actions.ts | Phase 3 | Unit test with mock RPC | Medium risk; calls mutation RPC | Planned |
| R8 | Server actions: previewBulkRestoreProjects | Returns preview result for archived projects | src/lib/projects/actions.ts | Phase 3 | Unit test with mock RPC | Low risk | Planned |
| R9 | Server actions: executeBulkRestoreProjects | Calls RPC, returns execution result with `archivedIds` (IDs that were unarchived, reusing existing field) | src/lib/projects/actions.ts | Phase 3 | Unit test with mock RPC | Medium risk | Planned |
| R10 | listCurrentWorkspaceProjects filters archived by default | Active project list excludes archived projects | src/lib/repositories/workspace-repository.ts | Phase 3 | Unit test: active list excludes archived | HIGH risk: query regression could hide active projects | Planned |
| R11 | getWorkshopHomebaseData excludes archived projects | Homebase recent/favorites exclude archived projects | src/lib/repositories/workspace-repository.ts | Phase 3 | Unit test: homebase excludes archived | Medium risk: homebase regression | Planned |
| R12 | Projects page has Active/Archived tabs | Tabs render, tab panels show correct projects, counts correct | src/components/workshop/projects-page-client.tsx | Phase 4 | DOM test: tabs render and switch correctly | Low risk: additive UI change | Planned |
| R13 | Archive action on LiveProjectCard | Archive button visible; triggers preview modal | src/components/workshop/LiveProjectCard.tsx | Phase 4 | DOM test: archive button renders and triggers flow | Low risk: additive action | Planned |
| R14 | Archive action in BulkActionToolbar | Bulk archive button visible when projects selected | src/components/workshop/BulkActionToolbar.tsx | Phase 4 | DOM test: bulk archive renders with selection | Low risk: additive action | Planned |
| R15 | Archive confirmation modal | Modal shows non-destructive copy; confirms archive; shows results | src/components/workshop/ (new or extended) | Phase 4 | DOM test: modal renders, confirms, executes | Low risk: new modal component | Planned |
| R16 | Restore action on archived project cards | Restore button in Archived tab; triggers restore flow | src/components/workshop/LiveProjectCard.tsx | Phase 4 | DOM test: restore button renders for archived projects | Low risk: additive action | Planned |
| R17 | Archived tab empty state | "No archived projects" when tab is empty | src/components/workshop/projects-page-client.tsx | Phase 4 | DOM test: empty state renders | Low risk: conditional render | Planned |
| R18 | Archived project route redirect | Direct URL to archived project redirects to projects list with notice | src/app/workshop/projects/[projectId]/page.tsx, layout.tsx, estimates/ | Phase 5 | Route test: archived project URL returns redirect | Medium risk: route behavior change | Planned |
| R19 | Archived project estimates/charts blocked | Estimate/chart routes redirect for archived projects | src/app/workshop/projects/[projectId]/estimates/, charts/ | Phase 5 | Route test: archived project sub-routes redirect | Medium risk: route behavior change | Planned |
| R20 | Homebase excludes archived | Recent projects and favorites exclude archived | src/lib/repositories/workspace-repository.ts | Phase 5 | Unit test: homebase query filters archived | Medium risk | Planned |
| R21 | Favorites hidden for archived | Archived project favorites not shown; re-appear on restore | src/lib/workshop/actions.ts, workspace-repository.ts | Phase 5 | Unit test: favorites exclude archived; re-appear on restore | Low risk: additive filter | Planned |
| R22 | Pending invites preserved | Invites remain in DB during archive; actionable on restore | src/lib/collaboration/actions.ts | Phase 5 | Unit test: invites survive archive/restore | Low risk: no invite mutation during archive | Planned |
| R23 | Shared links paused for archived | Publication returns "project archived" state | src/lib/publication/public-repository.ts | Phase 6 | Unit test: publication resolves archived state | Medium risk: publication behavior change | Planned |
| R24 | Archive requires authorization | can_edit_project must be true; unauthorized returns forbidden | RPC (Phase 2), actions (Phase 3) | Phase 2 | RPC test: unauthorized archive returns forbidden | Medium risk: auth bypass would allow unauthorized archive | Planned |
| R25 | Restore requires authorization | can_edit_project must be true; unauthorized returns forbidden | RPC (Phase 2), actions (Phase 3) | Phase 2 | RPC test: unauthorized restore returns forbidden | Medium risk: auth bypass | Planned |
| R26 | Delete flow unaffected | Project deletion still works; remains destructive with typed confirmation | src/lib/projects/actions.ts, components | Phase 7 | Regression test: delete flow unchanged | HIGH risk: regression in critical delete flow | Planned |
| R27 | Design-system compliance | New UI passes bun run lint:design-system | UI components (Phase 4) | Phase 4, 7 | lint:design-system exit 0 | Blocking: design-system failures must be fixed | Planned |
| R28 | Archive status messages accessible | aria-live region for archive/restore feedback | UI components (Phase 4) | Phase 4 | DOM test: aria-live present; accessibility audit | Low risk | Planned |
| R29 | Keyboard navigation for tabs | Arrow keys navigate tabs including Archived | src/components/workshop/projects-page-client.tsx | Phase 4 | DOM test: keyboard navigation works | Low risk | Planned |
| R30 | Build passes | bun run build exits 0 | All files | Phase 7 | bun run build | Blocking: build failure | Planned |
| R31 | API surfaces check archive state | XLSX export, AI endpoints, project images reject/redirect for archived projects | src/app/api/projects/..., src/lib/ai/ | Phase 5 | Route test: API returns expected archive response | Medium risk | Planned |

## Summary

- **Total requirements:** 30
- **Phase 1 (Baseline/Tests):** Foundation
- **Phase 2 (Database):** R1-R5 (schema + RPCs)
- **Phase 3 (Server Actions):** R6-R11 (actions + repository)
- **Phase 4 (UI):** R12-R17, R27-R29 (components + design system)
- **Phase 5 (Routes):** R18-R22 (route guards + homebase)
- **Phase 6 (Publication):** R23 (shared links)
- **Phase 7 (Verification):** R26, R30 (regression + build)
- **Cross-cutting:** R24-R25 (authorization in RPCs)

**Status:** All requirements are PLANNED. No implementation has been performed.
