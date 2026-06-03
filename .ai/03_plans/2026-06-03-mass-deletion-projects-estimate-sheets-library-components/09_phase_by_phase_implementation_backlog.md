# 09 Phase By Phase Implementation Backlog

## Purpose

This document converts the strategy, schema map, backend contract, UX plan, security plan, and QA plan into implementation phases. It is intentionally scoped to future work; no runtime code is implemented by this planning pass.

Default sequence:

1. Confirm schema and contracts.
2. Build preview foundations.
3. Build execution foundations.
4. Ship estimate sheet deletion first because `ProjectEstimatesTable` already owns row selection state.
5. Ship library component archive second because archive is reversible and safer than hard delete.
6. Ship project bulk delete third because it has the widest dependency, storage, publication, and collaboration surface.
7. Add optional component hard delete only after reference checks and storage cleanup are proven.
8. Finish with broad QA, performance, and operational hardening.

Each phase should be a separate PR unless the implementation agent has explicit direction to combine small phases.

## Phase 0: Investigation / Schema Confirmation

Goal:

- Convert this plan into a final implementation checklist against the branch's current schema and generated types immediately before coding.

Why this phase exists:

- The plan is verified against the current repository, but migrations, generated Supabase types, or action helpers may drift before implementation starts.
- Destructive data work should not begin from stale assumptions.

Entry criteria:

- Future implementation branch is created.
- Current docs in this folder are read, especially `02_verified_codebase_map.md`, `03_data_dependency_and_schema_decisions.md`, and `06_security_permissions_and_audit_plan.md`.
- No runtime code has been changed yet in that implementation branch.

Tasks:

- Re-read `src/lib/projects/actions.ts`, `src/lib/estimates/actions.ts`, `src/lib/component-library/actions.ts`, `src/lib/repositories/workspace-repository.ts`, and `src/lib/supabase/types.ts`.
- Re-check migrations containing `projects`, `estimates`, collaboration, publications, cost library, AI audit, feedback, and storage policies.
- Verify generated types still include `can_access_project`, `can_edit_project`, `can_access_estimate`, `can_edit_estimate`, `is_workspace_member`, and `is_workspace_admin`.
- Verify whether any newer helper already centralizes server-action id validation, typed confirmation, preview hashing, audit events, or storage cleanup.
- Re-run code intelligence / graph impact analysis before editing each target function, per `AGENTS.md`.
- Decide whether a new audit table is needed or whether `collaboration_audit_events`/AI audit infrastructure should be extended. Recommended default: create a narrow `mass_deletion_events` or equivalent governance audit table instead of overloading collaboration events.
- Record any drift in the implementation PR description and, if material, update this plan folder before coding.

Files likely affected later:

- Read-only in this phase unless plan drift is found.
- Possible planning doc update under this folder only.

Tests:

- None required beyond read-only schema/type inspection.
- If generated types are stale, regenerate or repair as part of a later implementation phase, not this docs-only audit.

Risks:

- Starting implementation without confirming FKs can cause accidental data loss or blocked migrations.
- Treating `can_edit_project` as delete authorization is too broad for project deletion because current permission semantics include workspace member/editor behavior.

Exit criteria:

- Verified schema checklist complete.
- Explicit implementation choices recorded for audit table shape, estimate publication blocking, and component hard-delete gate.
- Future implementation can begin with no unresolved schema ambiguity.

Expected PR size:

- None or docs-only.

Rollback strategy:

- Revert only any Phase 0 planning doc updates.

## Phase 1: Preview RPCs + Server Actions

Goal:

- Add preview-first backend contracts for projects, estimate sheets, and library component archive without executing destructive changes.

Why this phase exists:

- Destructive UI must show exact scope before execution.
- Preview RPCs are lower risk than execution RPCs and provide the data model for UI, blockers, tests, and review.

Entry criteria:

- Phase 0 is complete.
- Audit table decision is made enough to include preview correlation identifiers, even if execution writes audit rows in Phase 2.
- Batch caps are accepted: projects 50, estimate sheets 100, library archive 500, optional hard delete 100.

Tasks:

- Add TypeScript input/result types close to the existing action modules:
  - `src/lib/projects/actions.ts`: `previewBulkDeleteProjects`.
  - `src/lib/estimates/actions.ts`: `previewBulkDeleteEstimateSheets`.
  - `src/lib/component-library/actions.ts`: `previewBulkArchiveLibraryComponents`.
- Add validation helpers only if no existing equivalent exists:
  - validate UUIDs with `@/lib/ids`;
  - trim/dedupe arrays;
  - enforce caps;
  - return structured issues for invalid input.
- Add preview RPC migrations:
  - `preview_bulk_delete_projects(target_project_ids uuid[])`;
  - `preview_bulk_delete_estimate_sheets(target_project_id uuid, target_estimate_ids uuid[])`;
  - `preview_bulk_archive_library_components(target_item_ids uuid[])`.
- Each preview RPC must return eligible, not found, forbidden, and blocked buckets.
- Each preview RPC must aggregate counts set-wise; do not loop target ids in application code.
- Each preview RPC must compute a deterministic preview hash over sorted target ids, blockers, and dependency counts.
- Project preview must count estimates, nodes, row items, favorites, collaboration members/invitations, active publications, publication/shared-link records that would cascade, audit/event records retained by nulling, and project image paths.
- Estimate preview must count nodes, row items, sheet events, versions, favorites, sheet members/access settings, estimate-scoped invitations, and active publications that include selected estimate ids.
- Library archive preview must count current lifecycle states, already archived ids, estimate row references, template row references, variants, attachments, versions, price history, and state history.
- Add unit/schema tests for preview contracts before any UI work.

Files likely affected:

- `src/lib/projects/actions.ts`
- `src/lib/estimates/actions.ts`
- `src/lib/component-library/actions.ts`
- `src/lib/supabase/types.ts` after type generation
- new Supabase migration file under `supabase/migrations/`
- `tests/vitest/*preview*` and schema tests

Tests:

- `bun run type-check`
- `bun run test:dom -- tests/vitest/bulk-delete-projects-actions.test.ts tests/vitest/bulk-delete-estimate-sheets-actions.test.ts tests/vitest/bulk-archive-components-actions.test.ts`
- RPC/schema contract tests for preview function existence, grants, `SECURITY DEFINER`, and `search_path`.

Risks:

- Preview can leak cross-workspace names if forbidden ids are joined before access filtering.
- Active publication rules can be too permissive if `selected_estimate_ids` is treated as the rendered snapshot source instead of metadata.
- Preview hash can be unstable if arrays are not sorted before hashing.

Exit criteria:

- Preview actions return typed results with no destructive effects.
- Preview RPCs prove access and counts without leaking forbidden object metadata.
- Tests cover invalid ids, caps, permission buckets, publication blockers, and empty selections.

Expected PR size:

- Moderate: backend contracts plus migrations/tests.

Rollback strategy:

- Revert preview actions, preview migration, generated types, and tests. No production data mutation should have occurred.

## Phase 2: Execution RPCs + Audit + Storage Cleanup

Goal:

- Add transactional execution RPCs and server actions that rerun preview, enforce authorization, write audit records, mutate data set-wise, and clean storage safely after database success.

Why this phase exists:

- Execution semantics must be proven independently before UI exposes destructive controls.
- Database mutation and object-storage deletion have different transactional properties and need explicit recovery behavior.

Entry criteria:

- Phase 1 preview actions/RPCs are merged or available in branch.
- Audit table or audit event target is finalized.
- Storage path allow-list rules from `04_backend_rpcs_server_actions_and_storage.md` are accepted.

Tasks:

- Add execution server actions:
  - `executeBulkDeleteProjects`;
  - `executeBulkDeleteEstimateSheets`;
  - `deleteEstimateSheet` single-id wrapper;
  - `executeBulkArchiveLibraryComponents`.
- Add execution RPC migrations:
  - `execute_bulk_delete_projects(target_project_ids uuid[], expected_preview_hash text, correlation_id uuid)`;
  - `execute_bulk_delete_estimate_sheets(target_project_id uuid, target_estimate_ids uuid[], expected_preview_hash text, correlation_id uuid)`;
  - `execute_bulk_archive_library_components(target_item_ids uuid[], expected_preview_hash text, correlation_id uuid, change_reason text)`.
- Execution RPCs must rerun preview internally and reject stale preview hashes.
- Execution RPCs must acquire advisory transaction locks on target ids.
- Execution RPCs must use `SECURITY DEFINER`, `SET search_path = public`, explicit grants to authenticated only, and actor validation through `auth.uid()`.
- Project execution must require `can_manage_project_access(project_id)` or owner/admin policy, not just `can_edit_project`.
- Estimate execution must require `can_edit_estimate(estimate_id)` for every target and verify all estimate ids belong to the supplied project id.
- Library archive execution must update lifecycle states set-wise and append state history for every changed row.
- Add or wire audit event writes with correlation id, actor id, workspace id, target type, target ids, counts, blockers, preview hash, and storage warnings.
- For project image cleanup, collect DB-derived paths before deletion, commit database deletion, then remove allow-listed objects from `component-images`.
- Storage cleanup failure must not roll back committed database deletion; return warning and write recoverable audit metadata.
- Revalidate exact affected routes in server actions.

Files likely affected:

- `src/lib/projects/actions.ts`
- `src/lib/estimates/actions.ts`
- `src/lib/component-library/actions.ts`
- new Supabase migration file under `supabase/migrations/`
- `src/lib/supabase/types.ts`
- tests under `tests/vitest/`

Tests:

- Action tests for revalidation, RPC args, error mapping, and storage-warning return.
- RPC/schema tests for grants, search path, preview-hash stale rejection, and audit insert.
- Storage allow-list tests for project image paths.
- `bun run validate`

Risks:

- Deleting project publications by cascade may remove active shared link records; beta default is to block active publications first.
- A single RPC that both deletes DB rows and tries object storage would be unsafe because Supabase Storage object deletion is not part of the same Postgres transaction.
- Retrying execution without idempotency can double-log audit events unless correlation ids are unique.

Exit criteria:

- Execution RPCs are atomic for database mutations.
- Audit events exist for successful and blocked attempts as specified.
- Storage cleanup warnings are recoverable and visible to the caller.
- No row-by-row application deletion loops exist.

Expected PR size:

- Moderate to large: execution migrations, action changes, storage cleanup helpers, and tests.

Rollback strategy:

- Revert execution UI exposure first if already present.
- Revert server actions and migration only if no production migration has been applied; otherwise add a forward migration disabling RPC grants and preserving audit data.

## Phase 3: Estimate Sheet UI

Goal:

- Wire preview-first single and bulk estimate sheet deletion in the existing project estimates table.

Why this phase exists:

- `ProjectEstimatesTable` already owns `selectedEstimateIds`, making it the lowest-friction UI proving ground for the bulk destructive pattern.

Entry criteria:

- Phase 1 and Phase 2 backend estimate preview/execution are available.
- Active publication blocker policy is implemented.
- Shared modal primitive behavior is confirmed in `src/components/ui/modal.tsx`.

Tasks:

- Replace disabled estimate-row trash button in `src/components/workshop/ProjectEstimatesTable.tsx` with a single-delete preview modal trigger.
- Add bulk delete toolbar that appears only when selected estimate ids are non-empty.
- Reuse the existing checkbox state; do not create competing selection state.
- Modal must show selected sheets, node/row/version/event/member counts, publication blockers, and route impact.
- Require typed confirmation:
  - one sheet: `DELETE SHEET`;
  - many sheets: `DELETE {count} SHEETS`.
- Disable execute if preview has forbidden ids, not found ids, active publication blockers, stale preview hash, wrong phrase, or in-flight execution.
- On success, clear selection, refresh estimates list, invalidate affected query keys, and redirect from a deleted current estimate route to `/workshop/projects/[projectId]/estimates`.
- Preserve duplication, inline editing, sheet-code regeneration, and route refresh behavior.

Files likely affected:

- `src/components/workshop/ProjectEstimatesTable.tsx`
- possible focused modal/toolbar components under `src/components/workshop/`
- `src/lib/estimates/actions.ts` only if client contract refinements are needed
- tests under `tests/vitest/`

Tests:

- `tests/vitest/estimate-sheet-bulk-delete-ui.test.tsx`
- `tests/vitest/bulk-destructive-preview-modal.test.tsx`
- action tests from Phases 1 and 2 still pass.
- `bun run lint:design-system`
- `bun run test:dom -- tests/vitest/estimate-sheet-bulk-delete-ui.test.tsx`

Risks:

- Bulk toolbar can collide with existing table controls if not given stable dimensions.
- Deleting the active route without redirect leaves a 404/error route.
- Publication blockers can confuse users if copy says snapshots will update when beta policy blocks instead.

Exit criteria:

- Estimate sheet single and bulk deletion are preview-first.
- Existing checkbox state drives bulk selection.
- UI tests prove disabled/confirm/loading/error/success paths.

Expected PR size:

- Moderate UI PR.

Rollback strategy:

- Hide delete controls behind a feature flag or remove UI calls while keeping backend RPCs intact.

## Phase 4: Library Component Archive UI

Goal:

- Add bulk archive for cost library components and ensure archived items are hidden from default browsing/insertion once archive is introduced.

Why this phase exists:

- Archive preserves historical estimate snapshots and avoids the data-loss risk of immediate hard delete.

Entry criteria:

- Phase 1 and 2 backend archive preview/execution are available.
- Filtering decision is accepted: archived components are hidden by default from library browsing and insertion search, with explicit archived filter only if product wants it.

Tasks:

- Add selection state to `src/components/workshop/component-library-manager/ComponentLibraryManager.tsx` or a focused child component.
- Add archive toolbar for manageable selected components.
- Preview modal shows lifecycle states, already archived count, estimate/template reference counts, variants, attachments, versions, price history, and state history.
- Require typed confirmation `ARCHIVE {count} COMPONENTS`.
- Execute archive action with a required `changeReason`, defaulted from modal copy if user does not enter a custom reason.
- Update repository query or client filtering so archived components do not appear in default component list or insertion/search flows.
- Preserve existing estimate rows that snapshot component data; do not mutate `estimate_row_items`.

Files likely affected:

- `src/components/workshop/component-library-manager/ComponentLibraryManager.tsx`
- `src/components/workshop/component-library-manager/*`
- `src/components/workshop/component-library/tree/*`
- estimate-sidebar insertion UI if it currently queries library components directly
- `src/lib/repositories/component-library-repository.ts`
- `src/lib/component-library/actions.ts`
- tests under `tests/vitest/`

Tests:

- `tests/vitest/library-component-bulk-archive-ui.test.tsx`
- repository/filter tests proving archived components are excluded by default;
- action/RPC tests from Phases 1 and 2 still pass;
- `bun run lint:design-system`.

Risks:

- Current repository rows do not filter archived components by default, so archive can appear ineffective unless filtering changes ship in this phase.
- Component sample/fallback rows in UI can mask missing persisted data if tests only use fallback state.
- Archive state changes must append history so governance trail is not lost.

Exit criteria:

- Components can be bulk archived with preview-first confirmation.
- Archived components disappear from default library and insertion paths.
- Existing estimate rows preserve historical snapshots and links.

Expected PR size:

- Moderate UI/data-query PR.

Rollback strategy:

- Hide archive toolbar and restore default filtering while retaining backend archive state changes if already applied.

## Phase 5: Project Bulk Delete UI

Goal:

- Replace existing single project `window.confirm` deletion with preview-first deletion and add bulk project delete to the projects list for eligible projects.

Why this phase exists:

- Project deletion has the widest blast radius and should be exposed only after the shared destructive pattern and backend execution have been proven.

Entry criteria:

- Phases 1 and 2 project backend preview/execution are available.
- Estimate and library destructive UX patterns are validated.
- Active publication blocker policy is implemented and tested.

Tasks:

- Refactor `src/components/workshop/ProjectDetailsModal.tsx` so the existing `Delete project` control opens preview modal instead of calling `deleteProject` with `window.confirm`.
- Add selection checkboxes to `src/components/workshop/projects-page-client.tsx` or project-card wrappers.
- Make `LiveProjectCard` selection eligible only for owned/manageable project cards; sheet-only and pending access cards must be disabled with reason text or hidden checkbox.
- Bulk toolbar appears only with selected manageable projects.
- Project preview modal shows project names/codes, estimate counts, row counts, collaboration counts, publication blockers, and storage paths count.
- Require typed confirmation:
  - one project: `DELETE PROJECT`;
  - many projects: `DELETE {count} PROJECTS`.
- On success, clear selection, revalidate `/workshop/projects`, and route away from any deleted project detail/estimate/chart route.
- Retain immutable audit records; block active shared links by default.

Files likely affected:

- `src/components/workshop/ProjectDetailsModal.tsx`
- `src/components/workshop/projects-page-client.tsx`
- `src/components/workshop/LiveProjectCard.tsx`
- `src/lib/projects/actions.ts`
- routes under `src/app/workshop/projects/*` only if redirect handling needs a small guard
- tests under `tests/vitest/`

Tests:

- `tests/vitest/project-bulk-delete-ui.test.tsx`
- `tests/vitest/project-details-delete-preview.test.tsx`
- project action tests from Phase 2;
- env-gated Playwright smoke for isolated projects only.

Risks:

- Existing `deleteProject` currently does not call `requireCurrentUserContext`; do not wrap it blindly.
- Project images use `component-images` with `/project-images/` path allow-list; storage cleanup must never remove arbitrary component images.
- Cascading publication rows can remove shared-link comments/responses/events; beta default blocks active publications instead of silently deleting active public surfaces.

Exit criteria:

- No UI path uses `window.confirm` for project deletion.
- Bulk project delete is available only to actors with project-manage/admin authority.
- Sheet-only and pending cards cannot be selected.
- Project image cleanup warning path is visible if storage cleanup fails.

Expected PR size:

- Large UI PR due project list, modal, route handling, and existing single-delete hardening.

Rollback strategy:

- Hide project bulk toolbar and restore a disabled delete state; do not restore unsafe `window.confirm` deletion.

## Phase 6: Optional Hard Delete Unreferenced Components

Goal:

- Add hard delete for library components only when they are proven unreferenced and the actor has elevated authority.

Why this phase exists:

- Archive is the beta-safe default. Hard delete is useful for accidental duplicate components but unsafe unless reference and storage checks are strict.

Entry criteria:

- Component archive is shipped and stable.
- Indexes exist or are added for `estimate_row_items.source_library_item_id` and `estimate_template_row_items.source_library_item_id`.
- Product owner accepts hard-delete availability for closed beta.

Tasks:

- Add preview action and RPC:
  - `previewHardDeleteLibraryComponents`;
  - `preview_hard_delete_library_components`.
- Add execution action and RPC:
  - `executeHardDeleteLibraryComponents`;
  - `execute_hard_delete_library_components`.
- Require `is_workspace_admin(workspace_id)` or platform admin.
- Block any item referenced by estimate rows or template rows.
- Delete storage only from DB-derived `cost_library_items.image_path` / attachment paths and only from allowed buckets:
  - `component-images`;
  - `component-attachments`.
- Keep audit event even after component rows are deleted.
- UI must be hidden by default unless an explicit admin-only affordance is added.

Files likely affected:

- `src/lib/component-library/actions.ts`
- `src/lib/repositories/component-library-repository.ts`
- admin/manager UI components only if feature is exposed
- new migration and tests

Tests:

- hard-delete schema/action tests;
- storage allow-list tests;
- React test proving hidden/non-admin behavior;
- env-gated Playwright only if UI is exposed.

Risks:

- Loose references or missing indexes can make preview slow or incomplete.
- Component storage paths must not be inferred from user-provided names.
- Deleting a component with historical estimate references would break traceability if FK nulling/snapshots are misunderstood.

Exit criteria:

- Referenced components are blocked.
- Unreferenced components hard delete set-wise.
- Storage cleanup is safe, warning-aware, and audited.

Expected PR size:

- Small to moderate if backend-only; moderate if UI is exposed.

Rollback strategy:

- Revoke execute RPC grant and hide UI. Preserve audit rows.

## Phase 7: QA / Performance / Polish

Goal:

- Prove the complete destructive workflow is safe, understandable, performant enough for beta, and operationally recoverable.

Why this phase exists:

- Each phase can pass locally while the end-to-end governance behavior still fails at route transitions, stale previews, active publications, or cleanup residue.

Entry criteria:

- Phases 1 through 5 are implemented.
- Phase 6 is either complete or explicitly deferred.
- Targeted tests for each phase are passing.

Tasks:

- Run full validation suite:
  - `bun run validate`;
  - `bun run build`;
  - `bun run test:e2e`;
  - `bun run test:e2e:perf`;
  - env-gated destructive E2E with `ARCHESTIMATOR_E2E_MASS_DELETION=1` against isolated fixtures.
- Add or update manual QA notes for each destructive flow.
- Run large fixture preview tests for maximum batch sizes.
- Verify stale preview rejection with two-tab/parallel deletion scenario.
- Verify cross-workspace mixed ids return forbidden/not-found buckets without leaking names.
- Verify active shared links block project/estimate deletion by default.
- Verify route redirects after deleting current estimate/project.
- Verify storage cleanup warning is visible and audit records contain recovery data.
- Re-run graph/code impact detection before final commit, per `AGENTS.md`.

Files likely affected:

- Tests and documentation only unless QA finds defects.
- Implementation fixes should stay within affected phase files.

Tests:

- All phase tests.
- Env-gated E2E only against isolated data.
- Design-system lint for every UI phase.

Risks:

- E2E fixture cleanup can accidentally touch seeded demo data if flags and project ids are not isolated.
- Performance checks can pass on small data while preview SQL degrades without indexes.
- Manual QA can overclaim if storage cleanup is mocked but not tested with actual object paths.

Exit criteria:

- All required checks pass or a named non-blocking gap is documented with owner and mitigation.
- Final PR description lists data-retention behavior, active-publication blocking, audit proof, and storage cleanup recovery path.
- No unexpected runtime file scope remains in the implementation branch.

Expected PR size:

- Small if prior phases are clean; moderate if QA fixes are required.

Rollback strategy:

- Disable UI entry points first.
- Revoke execute RPC grants if severe backend issue is found.
- Preserve audit and historical rows; do not run reverse destructive migrations in beta without explicit approval.

## Cross-Phase Guardrails

- No phase may replace preview-first UX with direct destructive execution.
- No phase may use client-provided permission data.
- No phase may use `window.confirm` for new destructive flows.
- No phase may delete object storage paths that were not read from trusted database rows and matched to the bucket/path allow-list.
- No phase may hard delete referenced library components.
- No phase may treat publication snapshots as live mutable estimate data.
- No phase may delete immutable audit/history records unless the product owner explicitly approves a retention policy change.
- No phase may proceed with HIGH or CRITICAL graph impact without warning and reviewing the blast radius.
