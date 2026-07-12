# Open Questions and Decisions — Archives Feature

**Date:** 2026-06-07
**Plan:** `.ai/03_plans/2026-06-07-archives-feature/`

## Decisions Made

| # | Decision | Rationale | Evidence |
|---|----------|-----------|----------|
| D1 | V1 scope: all four archiveable entities (projects, estimate sheets, components, templates) across 5 phases | Phased: P1 Projects, P2 Estimate Sheets, P3 Components (restore+view), P4 Templates, P5 Retention (planning only). In-place archives per domain — no global center V1. | See `14_ENTITY_ARCHIVE_SCOPE_AND_PHASE_STRATEGY.md` for full scope definition |
| D2 | Use simple boolean archive state (archived_at IS NOT NULL) | Simpler than lifecycle state machine; sufficient for V1; mirrors notification_deliveries.archived_at pattern | Notification system uses same pattern in supabase/migrations/20260606090000_notification_system.sql |
| D3 | Follow preview→execute pattern from mass deletion | Consistent with existing project deletion flow; provides stale-preview protection; architects and future agents already understand this pattern | src/lib/mass-deletion/bulk-action.ts, src/lib/projects/actions.ts |
| D4 | Archive authorization = `can_edit_project` (NOT same as delete which uses `can_manage_project_access`) | `can_edit_project` returns true for workspace roles owner/admin/member (NOT viewer) AND project roles editor/admin/owner. Delete uses `can_manage_project_access` (owner/admin only). Archive is intentionally more permissive because it's reversible/non-destructive. See `supabase/migrations/20260526142913_project_sheet_collaboration_access.sql:254` for edit auth. | src/lib/collaboration/actions.ts role system, supabase/migrations/20260526142913_project_sheet_collaboration_access.sql lines 254-269 |
| D5 | Archived projects: fully blocked (redirect), not read-only | Simplest security posture; archived = not active; prevents data access confusion; consistent with removed-project redirect pattern | src/app/workshop/projects/[projectId]/page.tsx redirects missing projects |
| D6 | Shared links paused (not revoked) when project archived | Preserves publication data; can be re-enabled on restore; avoids data loss if accidentally archived. NOTE: `src/lib/publication/public-repository.ts` resolves tokens from `project_publications`; an explicit project archive-state check must be added to the publication resolution flow. | Publication RPCs resolve from project_publications table; project existence check is a future addition |
| D7 | Favorites hidden (not deleted) for archived projects | Preserves favorite data; re-appears on restore; avoids data loss | project_favorites table is independent of project state |
| D8 | Pending invites preserved during archive | Avoids collaboration data loss; invites become actionable again on restore | collaboration_invitations table is independent of project state |
| D9 | Additive migration only (ALTER TABLE ADD COLUMN IF NOT EXISTS) | No breaking changes; safe to roll back; follows existing migration conventions | Migration conventions from supabase/migrations/ |
| D10 | Reuse BulkDestructivePreviewModal pattern for archive | Avoids duplicating modal logic; non-destructive copy differentiates archive from delete | src/components/workshop/BulkDestructivePreviewModal.tsx |
| D11 | UI tabs: Preserve existing "Your Projects" / "Projects shared to you" tabs + add "Archived" as a third top-level tab | Preserves existing structure; Archived is a separate view mode; existing tabs implicitly show active projects only (WHERE archived_at IS NULL) | Current tab structure in src/components/workshop/projects-page-client.tsx |
| D12 | Server-authoritative filtering (WHERE archived_at IS NULL) | Application layer filters archived projects from active views; RLS remains permissive (archived projects are still readable by authorized users through the Archived tab). The visibility boundary is at the app query layer, not at RLS — this is intentional: archived data is still accessible to authorized users, just not shown in default views. RLS is the data-access boundary; app queries are the visibility boundary. | RLS patterns: RLS is the data-access boundary, application queries are the visibility boundary |

## Assumptions

| # | Assumption | Risk if Wrong |
|---|------------|---------------|
| A1 | Linked Supabase project ebxxqidacheyapmmzavr is accessible for exact-file migration apply | Migration cannot be applied; feature blocked |
| A2 | Migration history drift does not prevent single-file apply | May need drift reconciliation before archive migration |
| A3 | can_edit_project RPC is the correct authorization gate for archive/restore | May need separate can_archive_project if finer-grained control needed later |
| A4 | Existing project list query performance is acceptable with added archived_at filter | May need additional index if projects table grows large |
| A5 | archived_at + archived_by on projects row is sufficient audit trail for V1 | May need separate archive audit table for compliance later |
| A6 | No other agent is simultaneously modifying projects table or project actions | Merge conflicts may occur |

## Items Requiring Philip

| # | Question | Classification | Context |
|---|----------|---------------|---------|
| P1 | Confirm archive authorization scope: `can_edit_project` covers workspace members + project editors/admins/owners. Is this acceptable for V1, or should archive be restricted to owners/admins only? Default: `can_edit_project` (matches existing edit semantics) | **Non-blocking** — archive intentionally uses broader edit gate; delete uses `can_manage_project_access` (owner/admin only). Finer-grained control can be added in V2 with a dedicated `can_archive_project` RPC | Delete auth: supabase/migrations/20260603160000 line 95; edit auth: supabase/migrations/20260526142913 lines 254-269 |
| P2 | Should archived projects count toward workspace project limits? Default: NO (archived projects don't count) | **Non-blocking** — minor product decision | No project limits currently implemented |
| P3 | Archive confirmation UI: settled as simple confirm button for new archive flows (projects, estimate sheets, templates). Existing component archive uses typed `ARCHIVE COMPONENT(S)` via `BulkDestructivePreviewModal` at `ComponentLibraryManager.tsx:975` and may keep it. | **Resolved** — new flows use simple confirm; existing component flow unchanged | See 14_ENTITY_ARCHIVE_SCOPE, 18_COMPONENT_ARCHIVE_RESTORE |
| P4 | Should there be an "Unarchive all" or bulk restore? Default: YES, same as bulk archive | **Non-blocking** — symmetric behavior expected | BulkActionToolbar already supports bulk actions |
| P5 | Archive action placement on project cards: visible button or overflow menu? Default: overflow menu (keeps cards clean) | **Non-blocking** — UX preference | Project cards already have overflow actions |
| P6 | Should there be a time-delayed auto-delete for long-archived projects? Default: NO in V1 | **Non-blocking** — future feature | Adds complexity; not needed for V1 |
| P7 | Should the homebase greeting change after archiving? Default: NO (unchanged) | **Non-blocking** — minor product decision | Homebase is now a sparse greeting, not a project list |

## Items Future Implementation Agent May Decide

| # | Item | Guidance |
|---|------|----------|
| I1 | Exact placement of archive button on LiveProjectCard | Follow existing overflow menu pattern; prefer consistency over novelty |
| I2 | Archive confirmation modal copy | Non-destructive tone; "Archive project?" with "This project will be hidden from active views. You can restore it anytime from the Archived tab." |
| I3 | Restore confirmation modal copy | "Restore project?" with "This project will return to your active project list." |
| I4 | Toast notification timing for archive/restore | Follow existing ToastProvider patterns; 3-5 second auto-dismiss |
| I5 | Whether to extend BulkDestructivePreviewModal or create new BulkArchivePreviewModal | Prefer extending existing component with non-destructive variant; avoid duplicating modal logic |
| I6 | Animation/transition for project moving between tabs | Keep minimal; no animation needed in V1; instant hide/show is acceptable |

## Open Questions (Non-Blocking)

| # | Question | Status |
|---|----------|--------|
| Q1 | Should estimate sheet favorites also be hidden when parent project is archived? | Phase 2 (estimate sheet archive) — favorites hide when sheet is archived; when parent project is archived, estimate data is inaccessible via route guards anyway |
| Q2 | Should component library items be archivable in V1? | NO — already has lifecycle_state archiving; separate from project archive |
| Q3 | Should the archive feature have analytics/event tracking? | Deferred — product analytics not yet implemented for any feature |
| Q4 | Should archived projects be included in workspace export/backup? | YES — archived projects are preserved data, not deleted data |

## No Hidden Ambiguity

All decisions above are explicit. Any remaining ambiguity is captured in the "Items Requiring Philip" section. The implementation agent should treat D1-D12 as binding decisions and P1-P7 as decisions with defaults that Philip may override.
