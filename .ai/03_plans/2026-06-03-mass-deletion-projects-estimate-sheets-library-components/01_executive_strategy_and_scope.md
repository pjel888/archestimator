# 01 Executive Strategy And Scope

## Feature Thesis

Mass deletion is a data-governance system. It must protect the user's workspace from accidental loss, cross-workspace leakage, broken shared links, lost audit evidence, and orphaned storage objects. The core user value is not speed of deletion alone; it is confidence that destructive cleanup is safe, previewed, permissioned, and recoverable at the operational level.

## Why This Is Data Governance

Projects, estimate sheets, and library components are not isolated UI rows:

- a project owns estimates, estimate nodes, row items, favorites, collaboration records, shared links, project images, and beta feedback references;
- an estimate sheet owns nodes, rows, Activity events, dormant version rows, favorites, sheet-specific collaborators, sheet invitations, charts, and publication metadata;
- a library component has lifecycle state, variants, price history, state history, attachments, storage files, template references, and copied estimate-row snapshots.

Deleting any of these must be previewed with dependency counts, confirmed with a typed phrase, enforced server-side, executed transactionally where database state is involved, audited, and revalidated.

## In Scope

- Bulk delete projects.
- Single and bulk delete estimate sheets.
- Bulk archive library components.
- Optional hard delete of library components only when preview proves zero active estimate/template references.
- Preview-first destructive UX using shared modal primitives.
- Permission-safe server actions.
- Supabase/Postgres preview and execution RPC contracts.
- Auditability through a mass deletion audit record.
- Storage cleanup design for project images and component hard-delete media.
- Tests, performance guardrails, rollout, and recovery strategy.

## Out Of Scope

- Implementing code in this planning pass.
- Creating migrations in this planning pass.
- Soft-delete columns for projects or estimates.
- Undo/restore after hard delete.
- Export-before-delete in the first beta implementation.
- Public share receiver redesign.
- Global admin bulk deletion across workspaces.
- Deleting workspace accounts or user profiles.
- Changing Supabase storage bucket policies except where a future hard-delete migration requires explicit cleanup support.

## Product Principles

1. Preview before destruction.
2. Server authority over client-selected ids.
3. No row-by-row deletion loops from React or server actions.
4. Preserve historical/audit records where they are already designed as immutable history.
5. Archive library components before considering hard delete.
6. Do not let active shared links silently become inconsistent.
7. Use existing access-control primitives before adding new ones.
8. Keep beta behavior conservative and explain friction in the UI.

## Beta-Safe Defaults

| Surface | Default | Reason |
|---|---|---|
| Project delete | Hard delete after preview and typed confirmation; block active publications. | Project deletion has the widest blast radius and shared links can contain receiver decisions/comments. |
| Estimate sheet delete | Hard delete after preview and typed confirmation; block active publications that include selected estimates unless product explicitly accepts metadata update. | Avoid silently changing live/public recipient context. |
| Library component archive | Bulk archive only. | Existing estimate/template rows preserve snapshots; archive is reversible by lifecycle state. |
| Library component hard delete | Optional Phase 6 only; workspace admin (`is_workspace_admin`) or platform admin only; zero references required. | Hard delete touches version history, attachments, and storage. |
| Audit | Dedicated `mass_deletion_events` table recommended. | Existing audit tables are too domain-specific. |
| Storage cleanup | Best-effort after DB commit with allow-listed bucket/path rules and retryable failure reporting. | Avoid rolling back committed database state because object deletion failed. |

## Recommended Implementation Order

1. Backend preview/execution foundation and audit/storage contracts.
2. Estimate sheet UI first because `ProjectEstimatesTable` already has row checkbox selection state.
3. Library component archive UI second because archive is safer than hard delete but requires lifecycle filtering.
4. Project bulk delete UI third because dependency and route surface is widest.
5. Optional hard-delete unreferenced components last.
6. QA/performance/polish after all target surfaces have end-to-end coverage.

## Key Decisions

### Project Delete

Use bulk preview and execution RPCs. Existing single delete in `ProjectDetailsModal.tsx` must be hardened or rerouted through the same preview/execute path. Project delete preview may use `can_access_project(project_id)` to build a safe scope summary, but execution must require `can_manage_project_access(project_id)`, platform admin authority, or an explicit owner/admin delete policy. `can_edit_project(project_id)` is not sufficient for project deletion because current project edit semantics are broader than destructive governance authority. Sheet-only and pending-invite access must be rejected.

### Estimate Sheet Delete

Add sheet-level delete; do not reuse `deleteEstimateNode` or `deleteEstimateRowItem`. Delete selected estimate rows through a single project-scoped RPC, then revalidate project, estimate list, charts, and any open estimate route. If the current route points to a deleted sheet or node, redirect to `/workshop/projects/{projectId}/estimates`.

### Library Component Archive

Archive by setting `lifecycle_state = 'archived'` in a set-based RPC, appending state history, and revalidating `/workshop/library` plus legacy `/workshop/components`. Implementation must add explicit filtering because archived rows are currently still loaded and searchable.

### Optional Hard Delete

Hard delete only when preview proves:

- no `estimate_row_items.source_library_item_id` references;
- no `estimate_template_row_items.source_library_item_id` references;
- actor satisfies `is_workspace_admin(workspace_id)` or platform admin authority;
- storage paths belong to `component-images` or `component-attachments` with workspace/user prefix rules.

### Publication Handling

For beta, block deletion when active publications would be affected. Project deletion blocks when the project has published, non-revoked, unexpired publications. Estimate deletion blocks when selected estimates appear in active publication metadata unless product explicitly chooses an update-and-republish behavior.

### Audit Handling

Create a durable event per execution with actor, workspace, correlation id, target ids, preview summary, execution result, storage cleanup result, and failure status. Preserve collaboration/shared-link/AI audit rows with `ON DELETE SET NULL` where current schema already does so.

### Storage Cleanup Handling

Database commit comes first. Storage cleanup is chunked, allow-listed, and best-effort. Failures return a warning and are auditable; they do not roll back deletion.

## Success Criteria

- User sees a dependency preview before every destructive operation.
- User cannot confirm until the required typed phrase matches.
- Cross-workspace ids are rejected without leaking existence.
- Partial forbidden/not-found ids are reported safely.
- Execution uses one set-based RPC boundary per target action.
- Active publications cannot be broken silently.
- Library archive hides archived components from future insert/search surfaces.
- Audit records survive target deletion.
- Storage cleanup failures are visible and retryable.
- CI and destructive E2E gates are defined before implementation begins.

## Anti-Goals

- No `window.confirm()` for new destructive flows.
- No client-side loops over selected ids.
- No direct Supabase deletes from client components.
- No broad `revalidatePath("/")`.
- No hidden hard-delete path for components with references.
- No claims that archived components disappear until lifecycle filtering is implemented.
- No soft-delete schema retrofit for this release.
