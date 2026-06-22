# Project Groups — Implementation Agent Handoff

**Date:** 2026-06-16
**Use:** Paste or read this before assigning the implementation to an agent.

You are implementing Project Groups for Archestimator `/workshop/projects`. Do not implement from memory or from stale line numbers. First read:

1. `00-synthesis-and-decisions.md`
2. `02-database-supabase-analysis.md`
3. `07-implementation-plan.md`
4. `08-traceability-and-qa-matrix.md`
5. Live source files and current `git status`

---

## Binding Scope

Implement private per-user Project Groups for `Your Projects` only:

- Add `project_groups` and `project_group_memberships`.
- Do not add `group_id` to `projects`.
- Do not create shared workspace groups.
- Do not route group membership through `updateProjectDetails`.
- Do not use `BulkDestructivePreviewModal` for group delete.
- Do not build tags/many-to-many groups.
- Do not put groups in the sidebar for v1.

MVP UI:

- Organize control: None / Date / Group.
- Date mode remains DOM-compatible.
- Group mode renders the same horizontal flag treatment.
- Card kebab and bulk dock move projects to groups.
- Manage groups supports create, rename, delete.
- Ungrouped is virtual and pinned last.

Fast-follow by default:

- Color picker UI.
- Manual reorder if DnD is not already cheap.
- Collapse persistence.
- Details-modal group field.
- Drag-to-group.
- Shared-project groups.
- Sidebar groups.

---

## Implementation Order

1. Database migration and schema tests.
2. Server actions and action tests.
3. Repository projection and generated types.
4. `ProjectGroupSection` extraction and Organize mode.
5. Assignment/manage UI.

Stop and re-coordinate if another agent has changed the same files after you read them.

---

## Security Contract

All group actions must be scoped by:

- Current authenticated user.
- Current default workspace.
- Owned/Your Projects eligibility.
- Group id matching `(id, workspace_id, user_id)` when non-null.

Provider/local proof must include anon denial, cross-user denial, shared-project denial, mixed bulk behavior, generated types, and advisor output. Do not claim RLS complete from local TypeScript tests alone.

---

## Validation Commands

Use the narrowest proof first, then broaden if touched surface warrants it:

```bash
bunx vitest run tests/vitest/project-groups-schema.test.ts tests/vitest/set-project-group-action.test.ts
bunx vitest run tests/vitest/projects-page-sort-controls.test.tsx tests/vitest/projects-page-card-layout.test.tsx tests/vitest/projects-page-shared-access.test.tsx
bun run type-check
git diff --check
```

Run `bun run validate` or `bun run build` if the diff touches generated Supabase types, shared auth/security paths, repository contracts beyond additive fields, or release packaging.

---

## Done Means

- All MVP requirements in `08` have proof.
- Date grouping tests still pass.
- RLS/provider evidence is attached for DB work.
- No stale instruction to add `projects.group_id`, use `project_group_members`, or route through `updateProjectDetails` remains in docs or code.
- Fast-follow items are documented as not shipped.
- The final report lists changed files, tests run, skipped checks, and residual risk.

