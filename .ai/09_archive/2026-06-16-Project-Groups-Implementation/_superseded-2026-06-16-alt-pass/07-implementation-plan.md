# Project Groups — Implementation Plan

**Date:** 2026-06-16
**Status:** Ready for implementation after current dirty-tree lanes settle.
**Scope:** `/workshop/projects` Project Groups planning only. No code, migrations, or provider mutations were performed by this document.

This plan turns the reconciled analysis into an ordered, reviewable build path. It binds to `00-synthesis-and-decisions.md` and `02-database-supabase-analysis.md` wherever details overlap.

---

## 1. Stop Conditions Before Starting Code

Do not begin implementation until all are true:

1. Re-read the live files. Line numbers in this pack are guidance, not authority.
2. Confirm the in-flight dirty-tree work touching `projects-page-client.tsx`, `workspace-repository.ts`, `LiveProjectCard.tsx`, `ProjectDetailsModal.tsx`, and project-page tests has either landed or has one named owner coordinating conflicts.
3. Run `git status --short` and record which files are unrelated user/agent work. Do not revert them.
4. Re-run `ls supabase/migrations | tail -20` before naming the migration. The new timestamp must be strictly later than `20260616120000` and any newer `20260616*` file.

---

## 2. Work Units

### W1 — Database Foundation

Files:
- `supabase/migrations/<next_timestamp>_project_groups_foundation.sql`
- `tests/vitest/project-groups-schema.test.ts`
- `src/lib/supabase/types.ts` after provider/local type generation

Build:
- Add `project_groups` and `project_group_memberships` exactly as specified in `02`.
- Use strong FK `(group_id, workspace_id, user_id) -> project_groups(id, workspace_id, user_id)`.
- Use `unique(user_id, project_id)` for one group per project per user.
- Clone favorites-style RLS and grants; authenticated only, private to `auth.uid()` plus platform admin allowance.
- No `projects.group_id`, no SECURITY DEFINER function, no shared workspace taxonomy.

Verify:
- Schema test asserts tables, FKs, unique constraints, RLS enabled, grants, indexes, and no `projects.group_id`.
- Provider/local SQL proof denies anon, cross-user, and cross-workspace table access/mutation. Server-action tests deny shared-project and pending-invite assignment paths because `Your Projects` eligibility is enforced above RLS by `assertCanGroupProject`.
- Regenerate Supabase types once after all pending migrations apply.

Rollback:
- Because this is additive, rollback is a forward migration that drops policies, tables, and generated type usage only if no app code has shipped.

### W2 — Server Actions

Files:
- `src/lib/workshop/group-actions.ts` or `src/lib/workshop/actions.ts`
- `tests/vitest/set-project-group-action.test.ts`

Build:
- Implement `createProjectGroup`, `renameProjectGroup`, `deleteProjectGroup`, `assignProjectToGroup`, `bulkAssignProjectsToGroup`, and `reorderProjectGroups` only if reorder ships.
- Follow `setProjectFavorite`: UUID validation, `ensureDefaultWorkspace()`, Supabase server client, scoped verify, mutate, `revalidatePath("/workshop")`, `revalidatePath("/workshop/projects")`.
- Implement `assertCanGroupProject(projectId)` for assignment writes: current workspace, current user, owned/Your Projects eligibility, not shared/project-member/pending-invite.
- For non-null `groupId`, verify group by `(id, workspace_id, user_id)` before mutation.
- Use `onConflict: "user_id,project_id"` for upserts.

Verify:
- Action tests cover invalid UUID, create/rename/delete scope, assign, unassign, bulk mixed ids, revalidate calls, and denial for shared/non-owned projects.

Rollback:
- Disable UI entry points first, then leave actions unused. No data loss.

### W3 — Repository Projection

Files:
- `src/lib/repositories/workspace-repository.ts`
- `src/app/workshop/projects/page.tsx`
- repository projection tests

Build:
- Add two batched reads inside the existing `listCurrentWorkspaceProjects` `Promise.all`: current user's `project_groups` and `project_group_memberships`.
- Filter both by `workspace_id` and `user_id`.
- Export `ProjectGroupSummary`.
- Add `groupId?: string | null` to `WorkshopProjectListItem` and the client `ProjectListItem` in the same PR.
- Return `projectGroups` alongside `favoriteProjectIds`.

Verify:
- Existing repository tests still pass.
- New projection test proves `groupId`, `groupName` if used, and `projectGroups` are additive and user-scoped.
- Typecheck catches any importer drift.

Rollback:
- Remove only the additive return fields and UI consumers. Keep migration unless explicitly rolling back W1 too.

### W4 — Client Flag Refactor

Files:
- `src/components/workshop/ProjectGroupSection.tsx`
- `src/components/workshop/project-grid-layout.ts`
- `src/components/workshop/projects-page-client.tsx`
- new group-mode tests

Build:
- Extract `ProjectGroupSection`.
- Preserve date-mode output contracts: `data-project-date-group`, `data-project-date-group-label`, `aria-label="Live projects"`, View/Sort combobox names, grid class behavior.
- Add `organizeBy: "none" | "date" | "group"` persisted via the view-mode `useSyncExternalStore` pattern with key `archestimator_projects_organize_by_v1`.
- Default: Date when current/initial sort is date-based, else None.
- Selecting Date coerces sort to `updated_at` unless it is already `created_at` or `updated_at`.
- Keep Sort visible in Group mode; it sorts cards inside each group.
- Group mode disabled on Shared with tooltip and coerced away when switching tabs.

Verify:
- Existing date grouping tests remain green.
- New group-mode tests cover named sections, Ungrouped last, empty named groups visible when no search, empty groups hidden during search, and Shared-tab disable/coercion.

Rollback:
- Revert W4 UI while keeping W1-W3 dormant. Users see the pre-existing page.

### W5 — Assignment And Management UI

Files:
- `LiveProjectCard.tsx`
- `BulkActionToolbar.tsx`
- `ManageProjectGroupsPopover.tsx`
- `projects-page-client.tsx`

Build:
- Primary assignment: card kebab "Move to group" menu.
- Bulk assignment: non-destructive dock action using separate permission gate from delete.
- Manage groups: create, rename, delete in v1.
- Color picker, manual reorder, collapse persistence, drag assignment, details-modal selector, sidebar grouping, shared-project groups, and many-to-many tags are fast-follows by default.
- Assignment picker becomes searchable past about eight groups.
- Optimistic assignment uses a per-project override and clears the override after successful refresh.

Verify:
- Tests cover card assignment, bulk assignment, rollback toast, busy states, selection preservation across organize-mode switches, selection clearing across access-tab switches, and focus restoration after popover actions.

Rollback:
- Disable menu/dock entry points. Existing project list behavior remains intact.

---

## 3. Execution Order

1. W1 database foundation.
2. W2 server actions.
3. W3 repository projection.
4. W4 client flag refactor.
5. W5 assignment/manage UI.

Do not combine W1 with W4/W5. The DB/action foundation should be reviewable without UI churn. Combine W4 and W5 only if the implementer can keep the diff small and tests focused.

---

## 4. Validation Gate

Minimum implementation validation:

```bash
bunx vitest run tests/vitest/project-groups-schema.test.ts tests/vitest/set-project-group-action.test.ts
bunx vitest run tests/vitest/projects-page-sort-controls.test.tsx tests/vitest/projects-page-card-layout.test.tsx tests/vitest/projects-page-shared-access.test.tsx
bun run type-check
git diff --check
```

Add `bun run validate` or `bun run build` if the final diff touches auth/security, generated Supabase types, shared repository contracts beyond additive fields, or release packaging.
