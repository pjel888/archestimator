# 14 Future Implementation Agent Checklist

## Purpose

This is the compact execution checklist for the next codebase AI. It reduces rediscovery and prevents implementation from starting at the stale monolithic source artifact.

## Before Editing

- Read `00` through `15` in this folder.
- Confirm current branch and dirty state.
- Confirm the stale source artifact file is superseded and not authoritative.
- Re-read `src/lib/projects/actions.ts`, `src/lib/estimates/actions.ts`, `src/lib/component-library/actions.ts`, `src/lib/repositories/workspace-repository.ts`, and `src/lib/supabase/types.ts`.
- Re-check migrations named in `11_verified_schema_fk_index_matrix.md`.
- Run graph/GitNexus impact analysis before editing every existing function, class, method, or exported action.
- Decide the audit table shape before Phase 2 execution RPCs.

## Required Decisions Before Execution RPCs

| Decision | Recommended default | Owner | Blocking |
|---|---|---|---|
| Mass deletion audit table | Add `mass_deletion_events`. | Backend implementer + founder. | Blocks Phase 2. |
| Active publication behavior for estimate delete | Block active affected publications. | Product + backend implementer. | Blocks Phase 2. |
| Project delete authority | Require `can_manage_project_access` or stricter owner/admin/platform policy. | Backend implementer + security reviewer. | Blocks Phase 2. |
| Component hard delete | Defer UI until archive is proven; require `is_workspace_admin(workspace_id)` or platform admin. | Product owner + security reviewer. | Non-blocking for Phases 1-5. |

## Phase Order

1. Phase 0 drift check.
2. Phase 1 preview RPCs/actions/tests.
3. Phase 2 execution RPCs/actions/audit/storage tests.
4. Phase 3 estimate sheet UI.
5. Phase 4 library archive UI/filtering.
6. Phase 5 project single/bulk delete UI.
7. Phase 6 optional component hard delete.
8. Phase 7 QA/performance/polish.

Do not expose a destructive UI before the matching preview and execution contracts are tested.

## Non-Negotiable Implementation Rules

- No `window.confirm()` for new mass-deletion flows.
- Existing `ProjectDetailsModal.tsx` delete must be rerouted or hardened.
- No client-side loops that call single-delete actions per id.
- No server-action loops that call single-delete RPCs per id.
- No reliance on `can_edit_project` alone for project delete.
- No deletion of active publications by side effect.
- No mutation of `snapshot_json` as part of source delete.
- No hard delete for referenced components.
- No object storage cleanup from client paths.
- No broad route revalidation when scoped paths are known.
- No separate project-delete and estimate-delete advisory locks for the same project graph; both must serialize on a project-id-derived lock.

## Test Gate Per Phase

| Phase | Minimum gate |
|---|---|
| Preview backend | Action tests, schema/RPC text tests, type-check. |
| Execution backend | Action tests, schema/RPC tests, storage allow-list tests, `bun run validate`. |
| Estimate UI | Targeted DOM tests, design-system lint, backend action tests still green. |
| Library archive UI | Targeted DOM/repository tests, design-system lint, insertion/search archived filter proof. |
| Project UI | Targeted DOM tests, project action tests, design-system lint, isolated destructive E2E when env is present. |
| Final QA | `bun run validate`, `bun run build`, relevant E2E or documented env-gated skip, graph change detection. |

## PR Description Must Include

- exact target surfaces shipped;
- data-retention policy;
- active-publication blocking proof;
- permission model;
- audit event shape;
- storage cleanup behavior and warning path;
- test commands and results;
- unrun commands with reason;
- rollback plan.
