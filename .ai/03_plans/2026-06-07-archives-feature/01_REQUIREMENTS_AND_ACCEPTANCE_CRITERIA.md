# Requirements and Acceptance Criteria: Archestimator Archives

> **REFINEMENT NOTE (2026-06-07):** Scope section updated to multi-entity. This document's AC items remain project-focused (detailed project ACs validated through multiple Oracle review passes). Per-entity acceptance criteria for estimate sheets, components, and templates are in specialist docs `17-19`.

This document outlines the functional and non-functional requirements for the Archives feature in Archestimator.

## Overview

The Archives feature allows users to archive and restore Projects, Estimate Sheets, Components, and Templates. Archiving is a reversible, non-destructive state that hides items from active surfaces while preserving data. Each entity archives in-place within its domain route. See `14_ENTITY_ARCHIVE_SCOPE_AND_PHASE_STRATEGY.md` for phase ordering.

## Functional Requirements

### MUST (P0)
- **Project Archiving**: Support archiving workspace projects with `archived_at`/`archived_by` columns.
- **Estimate Sheet Archiving**: Support archiving estimate sheets within projects (Phase 2).
- **Component Archiving**: Support archiving components via existing `lifecycle_state`; add restore view (Phase 3).
- **Template Archiving**: Support archiving estimate templates (Phase 4).
- **Project Restoration**: Allow authorized users to restore archived projects/estimates/components/templates.
- **Access Blocking**: Redirect direct URL access to archived projects and estimate sheets with notice.
- **Redirect with Notice**: Redirect attempts to access archived projects to the projects list with "Project Archived" notice.
- **Shared Link Pausing**: Pause active shared links for archived projects. Links should return a "Project Archived" state instead of project data.
- **Homebase Exclusion**: Exclude archived projects from the Workshop Homebase dashboard and "Recent Projects" lists.
- **Tabbed UI**: Preserve existing "Your Projects" and "Projects shared to you" tabs. Add "Archived" as a third top-level tab to separate project states.
- **Search Scoping**: Scope project search to the currently visible tab ("Your Projects", "Projects shared to you", or "Archived").
- **Permissions**: Restrict archive and restore actions to users with `can_edit_project` access (workspace members, project editors, admins, and owners — matching existing project mutation authorization).

### SHOULD (P1)
- **Count Badges**: Display project counts on the existing "Your Projects"/"Projects shared to you" tabs and the "Archived" tab.
- **Favorite Management**: Hide favorites for archived projects from the global favorites list. Re-show them upon restoration.
- **Invite Preservation**: Preserve pending collaboration invites for archived projects but keep them inactive until restoration.
- **Collaborator Visibility**: Hide archived projects from the shared project lists of collaborators who are not owners or admins.

- **Bulk Archive/Restore**: Support selecting multiple projects for archive or restore actions via the existing `BulkActionToolbar`. The RPCs (`preview_bulk_*`, `execute_bulk_*`) naturally handle single or multiple project IDs, so bulk operations are essentially free given the single-project path.
- **Archive Metadata**: Track who archived the project (`archived_by`) and when (`archived_at`). These are mandatory data model columns required for the archive state to function.

### OUT OF SCOPE (Future Phases)
- **Phase 5 Paid-Client Retention**: Architecture planned in `22_SHARED_RECIPIENT_AND_PAID_CLIENT_RETENTION_PLAN.md` — NO implementation without explicit approval.
- **Global Archive Center**: Deferred — in-place archives per domain in V1.
- **Library Item Lifecycle**: Components already use `lifecycle_state` — this plan adds Restore view, not duplicate columns.

## Non-Functional Requirements

- **Performance**: Archive and restore operations should complete within 500ms.
- **UX Consistency**: Use the existing preview-execute pattern from mass deletion for archive actions.
- **Security**: Ensure RLS and application-layer guards strictly enforce access blocking for archived projects.
- **Accessibility**: Tabs and archive actions must be keyboard-navigable and screen-reader friendly.

## Archive Semantics

- **Reversibility**: Archive is a non-destructive state change. Delete remains the destructive option.
- **Blocking vs Read-Only**: Archived projects are fully blocked (redirect + notice), not just read-only.
- **Shared Links**: Links are "paused," meaning the link record remains but the public viewer shows an archived state.
- **Collaborators**: Non-owner collaborators lose visibility of the project in their "Shared to you" list while it is archived.

## Assumptions

- The `projects` table will be extended with `archived_at` and `archived_by` columns.
- Existing `can_edit_project` RPC or equivalent logic is sufficient for permission checks.
- The application layer is the primary enforcer of the "blocked" state via redirects and filters.

## Non-Goals

- Implementing a complex multi-state lifecycle machine for projects.
- Automating project archiving based on inactivity.
- Archiving data to cold storage (data remains in the primary database).

## Acceptance Criteria

| ID | Requirement | Pass/Fail Check |
|---|---|---|
| AC-01 | Permissions | Users with `can_edit_project` can archive a project. |
| AC-02 | Permissions | Users without `can_edit_project` (viewers, sheet-only collaborators) cannot archive. |
| AC-03 | Permissions | Users with `can_edit_project` can restore a project. |
| AC-04 | Visibility | Archived projects appear in the "Archived" tab. |
| AC-05 | Visibility | Archived projects do not appear in the default (non-Archived) tabs. |
| AC-06 | Access Control | Direct URL access to an archived project redirects to the projects list. |
| AC-07 | UX | Redirected users see a notice stating the project is archived. |
| AC-08 | Shared Links | Public shared links for archived projects show an "Archived" status page. |
| AC-09 | Restoration | Restoring a project moves it back to its original tab ("Your Projects" or "Projects shared to you") immediately. |
| AC-10 | Restoration | Restored projects are accessible via direct URL again. |
| AC-11 | Restoration | Restored projects re-enable their public shared links. |
| AC-12 | Homebase | Archived projects are excluded from the Workshop Homebase dashboard. |
| AC-13 | Search | Search in the default (non-Archived) tabs excludes archived projects. |
| AC-14 | Search | Search in the "Archived" tab only returns archived projects. |
| AC-15 | UI | Each tab ("Your Projects", "Projects shared to you", and "Archived") shows accurate project counts. |
| AC-16 | Favorites | Favorites for archived projects are hidden from the favorites list. |
| AC-17 | Favorites | Favorites for archived projects re-appear when the project is restored. |
| AC-18 | Invites | Pending invites for archived projects are preserved but cannot be accepted. |
| AC-19 | Audit | Archive action returns the list of archived IDs for UI feedback. |
| AC-20 | Safety | Delete action still requires typed confirmation and remains destructive. |
