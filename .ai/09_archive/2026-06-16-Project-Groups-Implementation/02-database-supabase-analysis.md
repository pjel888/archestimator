# Project Groups — Canonical Database / Supabase Plan (Lane B, Reconciled)

> **LANE/ANALYSIS DOC — subordinate to `00` (decisions) and `07` (contracts). Where this doc conflicts, 00/07 win.** Reconciled 2026-06-16 for: membership IDOR mechanism = single-column `group_id` FK + RLS `exists()` backstop (LD-1, supersedes the prior composite `(group_id, workspace_id, user_id)` FK and `project_groups unique(id, workspace_id, user_id)`); both tables carry a `workspaces(id)` FK (LD-7); the DB `project_groups_name_check` length constraint is removed — caps are app-layer soft-caps per `07` §2.5 (LD-8); `ProjectGroupSummary` drops `createdAt` to match `07` §3.1; action names align to `07` §4 (`moveProjectToGroup`, `recolorProjectGroup`); §7 references `13-requirements-traceability-and-qa-matrix.md` (LD-3); §7 provider verification aligns to the real-role RLS proof with no prod pollution (LD-9).

**Project:** Archestimator, Supabase project `ebxxqidacheyapmmzavr`
**Date:** 2026-06-16
**Status:** Implementation-ready plan, no migration applied.
**Scope:** Data model, migration shape, RLS, server-action data contract, provider verification for Project Groups on `/workshop/projects`.

This document is the canonical database lane after reconciliation. It replaces the earlier per-workspace / `projects.group_id` draft. The binding decisions are:

- **Per-user groups**, workspace-scoped, private to the signed-in user.
- **One group per project per user**, enforced by a unique membership row.
- **Two new tables:** `project_groups` and `project_group_memberships`.
- **No `group_id` column on `projects`.** Keep `Tables<"projects">` unchanged.
- **No SECURITY DEFINER functions.** Use ordinary server actions plus RLS.
- **No broad provider action during planning.** Implementation may apply the reviewed migration under the standing Archestimator Supabase mandate.

---

## 1. Ground Truth Anchors

The precedent is `project_favorites`, not `projects`:

- `project_favorites` has `workspace_id`, `user_id`, `project_id`.
- It enforces `unique(user_id, project_id)`.
- It uses a composite FK `(project_id, workspace_id) -> projects(id, workspace_id) on delete cascade`.
- Its RLS is per-user: `user_id = (select auth.uid()) and is_workspace_member(workspace_id)`, with platform-admin allowance after the 2026-06-14 consolidation.

Project Groups is the same kind of personal workspace organization layer. A shared workspace taxonomy is deliberately out of scope because it reopens the same unsolved shared-label authorization problem that suppressed shared favorites.

The latest observed migration at planning time is:

```txt
20260616120000_promote_detached_estimate_rows_to_library.sql
```

The Project Groups migration timestamp must be strictly later than that and later than any concurrent `20260616*` migration present at implementation time.

---

## 2. Canonical Schema

### 2.1 `project_groups`

Purpose: group definitions owned by one user within one workspace.

```sql
create table if not exists public.project_groups (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  accent_id text,
  position integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists project_groups_user_workspace_name_ci_unique
  on public.project_groups(user_id, workspace_id, lower(name));

create index if not exists project_groups_user_workspace_position_idx
  on public.project_groups(user_id, workspace_id, position, created_at);
```

Notes:

- Store `accent_id`, not raw hex. UI maps ids to inline-style accent colors.
- `position` orders named groups. If reorder ships later, the column is already present.
- **No DB name-length `check` constraint (LD-8).** The earlier `project_groups_name_check char_length(...) BETWEEN 1 AND 40` is **removed** — name caps (40 chars, non-empty after trim) are an **app-layer soft-cap** enforced in `createProjectGroup` / `renameProjectGroup` per `07` §2.5, not a DB constraint. This keeps the at-limit message a clear UI affordance instead of an opaque constraint violation.
- **No `project_groups unique(id, workspace_id, user_id)` (LD-1).** The earlier composite uniqueness existed only to back the membership composite FK; that mechanism is superseded (see §2.2 / §3). The primary key on `id` plus the case-insensitive name index are sufficient.

### 2.2 `project_group_memberships`

Purpose: one private assignment from a project to at most one group for a given user.

```sql
create table if not exists public.project_group_memberships (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  group_id uuid not null references public.project_groups(id) on delete cascade,
  project_id uuid not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint project_group_memberships_project_workspace_fkey
    foreign key (project_id, workspace_id)
    references public.projects(id, workspace_id)
    on delete cascade,
  constraint project_group_memberships_user_project_unique unique (user_id, project_id)
);

create index if not exists project_group_memberships_user_workspace_group_idx
  on public.project_group_memberships(user_id, workspace_id, group_id, created_at);

create index if not exists project_group_memberships_project_idx
  on public.project_group_memberships(project_id);
```

Important behavior:

- One project can be in **zero or one** group for a given user.
- Deleting a group cascades only membership rows; projects fall to the virtual `Ungrouped` bucket.
- Deleting a project cascades membership rows; no mass-delete RPC change is needed.
- Deleting a workspace cascades both tables via their `workspace_id → workspaces(id) on delete cascade` FK (LD-7), so no orphan groups/memberships survive a workspace delete.

> **Reconciled to the canonical single-column FK (LD-1).** `group_id` is now `references public.project_groups(id) on delete cascade` — a **single-column FK**, not the earlier composite `(group_id, workspace_id, user_id) → project_groups(id, workspace_id, user_id)`. The single-column FK proves the group *exists*; it does **not** by itself prove the group belongs to the assigning user. That cross-user IDOR gap is closed by the **RLS `with check` `exists()` backstop** added in §3 (a direct API caller cannot insert a membership pointing at another user's `group_id`), matching `07` §2.3. Cross-workspace assignment remains structurally blocked by the project composite FK `(project_id, workspace_id) → projects(id, workspace_id)`. This is the minimal-churn form that conforms to the contracts spine and the reviewed migration in `07`/`08`.

---

## 3. RLS And Grants

Both tables are private to the owning user plus platform admins. Workspace membership is still required so stale auth users cannot read rows outside their workspace context.

```sql
alter table public.project_groups enable row level security;
alter table public.project_group_memberships enable row level security;

drop policy if exists "project groups can be managed by owners and platform admins"
  on public.project_groups;
create policy "project groups can be managed by owners and platform admins"
  on public.project_groups
  for all
  to authenticated
  using (
    public.is_platform_admin()
    or (
      user_id = (select auth.uid())
      and public.is_workspace_member(workspace_id)
    )
  )
  with check (
    public.is_platform_admin()
    or (
      user_id = (select auth.uid())
      and public.is_workspace_member(workspace_id)
    )
  );

drop policy if exists "project group memberships can be managed by owners and platform admins"
  on public.project_group_memberships;
create policy "project group memberships can be managed by owners and platform admins"
  on public.project_group_memberships
  for all
  to authenticated
  using (
    public.is_platform_admin()
    or (
      user_id = (select auth.uid())
      and public.is_workspace_member(workspace_id)
    )
  )
  with check (
    public.is_platform_admin()
    or (
      user_id = (select auth.uid())
      and public.is_workspace_member(workspace_id)
      -- IDOR backstop (LD-1): the referenced group must belong to THIS user.
      -- The single-column FK only proves the group exists; without this an
      -- API caller could insert a membership pointing at another user's group_id.
      and exists (
        select 1 from public.project_groups g
        where g.id = group_id and g.user_id = (select auth.uid())
      )
    )
  );

revoke all on public.project_groups from public, anon, authenticated;
revoke all on public.project_group_memberships from public, anon, authenticated;
grant select, insert, update, delete on public.project_groups to authenticated;
grant select, insert, delete on public.project_group_memberships to authenticated;
```

The membership IDOR is closed by **two layers**: the RLS `exists()` backstop above (the `group_id` must belong to the signed-in user) plus the project composite FK `(project_id, workspace_id) → projects(id, workspace_id)` blocking cross-workspace assignment. Server actions must still perform a workspace+user-scoped group lookup before upsert so the UI receives a clear error instead of an opaque RLS/FK violation.

> Memberships are granted `select, insert, delete` only — no `UPDATE` — because "move to a different group" is an `upsert` on `(user_id, project_id)` and "remove" is a `delete`; only the group **definitions** table is rename/recolor/reorder-mutable and so gets `UPDATE` (matches `07` §2.4).

---

## 4. DRAFT Migration Skeleton

Filename:

```txt
supabase/migrations/<next_timestamp>_project_groups_foundation.sql
```

Skeleton:

```sql
-- Project Groups foundation.
-- Additive only. No data backfill. No project table column.

create table if not exists public.project_groups (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  accent_id text,
  position integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists project_groups_user_workspace_name_ci_unique
  on public.project_groups(user_id, workspace_id, lower(name));

create index if not exists project_groups_user_workspace_position_idx
  on public.project_groups(user_id, workspace_id, position, created_at);

create table if not exists public.project_group_memberships (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  group_id uuid not null references public.project_groups(id) on delete cascade,
  project_id uuid not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint project_group_memberships_project_workspace_fkey
    foreign key (project_id, workspace_id)
    references public.projects(id, workspace_id)
    on delete cascade,
  constraint project_group_memberships_user_project_unique unique (user_id, project_id)
);

create index if not exists project_group_memberships_user_workspace_group_idx
  on public.project_group_memberships(user_id, workspace_id, group_id, created_at);

create index if not exists project_group_memberships_project_idx
  on public.project_group_memberships(project_id);

alter table public.project_groups enable row level security;
alter table public.project_group_memberships enable row level security;

drop policy if exists "project groups can be managed by owners and platform admins"
  on public.project_groups;
create policy "project groups can be managed by owners and platform admins"
  on public.project_groups
  for all
  to authenticated
  using (
    public.is_platform_admin()
    or (
      user_id = (select auth.uid())
      and public.is_workspace_member(workspace_id)
    )
  )
  with check (
    public.is_platform_admin()
    or (
      user_id = (select auth.uid())
      and public.is_workspace_member(workspace_id)
    )
  );

drop policy if exists "project group memberships can be managed by owners and platform admins"
  on public.project_group_memberships;
create policy "project group memberships can be managed by owners and platform admins"
  on public.project_group_memberships
  for all
  to authenticated
  using (
    public.is_platform_admin()
    or (
      user_id = (select auth.uid())
      and public.is_workspace_member(workspace_id)
    )
  )
  with check (
    public.is_platform_admin()
    or (
      user_id = (select auth.uid())
      and public.is_workspace_member(workspace_id)
      -- IDOR backstop (LD-1): the referenced group must belong to THIS user.
      and exists (
        select 1 from public.project_groups g
        where g.id = group_id and g.user_id = (select auth.uid())
      )
    )
  );

revoke all on public.project_groups from public;
revoke all on public.project_groups from anon;
revoke all on public.project_groups from authenticated;
revoke all on public.project_group_memberships from public;
revoke all on public.project_group_memberships from anon;
revoke all on public.project_group_memberships from authenticated;

grant select, insert, update, delete on public.project_groups to authenticated;
grant select, insert, delete on public.project_group_memberships to authenticated;
```

If implementation finds an existing shared `updated_at` trigger convention, use it. Do not add a new SECURITY DEFINER helper for timestamps.

---

## 5. Repository Data Contract

`listCurrentWorkspaceProjects()` remains the single server read seam. Add group reads to its existing `Promise.all` batch:

```ts
supabase
  .from("project_groups")
  .select("id, name, accent_id, position")
  .eq("workspace_id", workspace.id)
  .eq("user_id", profile.id)
  .order("position", { ascending: true })
  .order("created_at", { ascending: true }),

supabase
  .from("project_group_memberships")
  .select("project_id, group_id")
  .eq("workspace_id", workspace.id)
  .eq("user_id", profile.id),
```

Derived return:

```ts
export type ProjectGroupSummary = {
  id: string;
  name: string;
  accentId: string | null;
  position: number;
};

export type WorkshopProjectListItem = {
  // existing fields unchanged; repository stamps groupId on every item
  groupId: string | null;
};

return {
  workspace,
  projects,
  favoriteProjectIds,
  projectGroups,
};
```

Do not add a `groupName` field to every project unless a later UI proves it needs denormalization. The group catalog is already in props; resolving by id in a memo is cheaper and avoids duplicated names.

---

## 6. Server Actions

Actions live with existing workshop project actions unless implementation chooses a narrow `project-groups-actions.ts` module.

Required actions:

- `createProjectGroup({ name, accentId? })`
- `renameProjectGroup({ groupId, name })`
- `recolorProjectGroup({ groupId, accentId })` (accents ship in v1)
- `deleteProjectGroup({ groupId })`
- `reorderProjectGroups({ orderedGroupIds })` if reorder ships
- `moveProjectToGroup({ projectId, groupId: string | null })`
- `bulkAssignProjectsToGroup({ projectIds, groupId: string | null })`

> Action names are canonical per `07` §4 (`moveProjectToGroup` covers single assignment **and** removal; `recolorProjectGroup` sets the accent). The earlier `assignProjectToGroup` / `updateProjectGroupAccent` names are superseded.

All actions use the same skeleton:

1. Validate UUIDs and bounded strings.
2. `ensureDefaultWorkspace()` to get `workspace` and `profile`.
3. Verify target rows with `workspace_id = workspace.id` and `user_id = profile.id`.
4. For assignment, verify the project is in the current workspace and belongs to `Your Projects` scope. Shared/invited projects are out of v1.
5. Mutate with RLS still active.
6. `revalidatePath("/workshop")` and `revalidatePath("/workshop/projects")`.
7. Return a small typed result when useful for optimistic reconciliation.

Bulk assignment must be one server action call, not N per project. It should upsert/delete all membership rows in a single scoped operation and fail atomically from the UI's perspective.

---

## 7. Provider Verification Plan

After applying the migration to `ebxxqidacheyapmmzavr`, collect:

1. `supabase migration list --linked` shows the new migration as applied and no unexpected remote-only drift.
2. Advisor check: security advisors remain `0 ERROR/CRITICAL`; no `rls_disabled_in_public`, missing policy, or default-public grant finding for the new tables.
3. SQL structural probes:
   - tables exist;
   - RLS enabled;
   - `project_groups` grants are `select, insert, update, delete` to `authenticated` only; `project_group_memberships` grants are `select, insert, delete` to `authenticated` only (no membership `UPDATE`);
   - unique `user_id, project_id` membership constraint exists;
   - `project_groups.workspace_id` and `project_group_memberships.workspace_id` each carry a `workspaces(id) on delete cascade` FK;
   - the single-column `group_id → project_groups(id) on delete cascade` FK and the project composite FK `(project_id, workspace_id) → projects(id, workspace_id) on delete cascade` exist and cascade as planned;
   - `projects` has no `group_id` column.
4. **Cross-user RLS isolation proof (LD-9):** prove the membership `exists()` IDOR backstop under a **genuine RLS-enforcing path** — `SET ROLE authenticated` with the appropriate JWT claims (or two real authenticated clients, or a disposable Supabase branch DB) — so the proof exercises the policy, not a service-role bypass. Include a **sanity control** (a query that MUST fail if RLS is off) as a hard abort gate, and wrap all fixtures in a transaction with rollback (or use namespaced disposable rows with guaranteed cleanup) so **nothing commits to live project `ebxxqidacheyapmmzavr`**. The deterministic, repo-runnable procedure lives in `15-deploy-rollback-recovery-and-dod.md`.
5. Type generation: `src/lib/supabase/types.ts` includes `project_groups` and `project_group_memberships`, and no accidental hand-edit churn.
6. Focused tests from `13-requirements-traceability-and-qa-matrix.md` pass.

Do not claim provider proof from this planning document. The evidence belongs in the implementation run log under `.ai/05_logs/`.

---

## 8. Implementation Checklist

- [ ] Re-list migrations and choose the next timestamp.
- [ ] Create migration from the skeleton above; no source code in the same commit until the schema compiles locally.
- [ ] Apply to Archestimator project `ebxxqidacheyapmmzavr` only.
- [ ] Run provider advisor and structural probes.
- [ ] Regenerate Supabase types.
- [ ] Add repository reads and project-group server actions.
- [ ] Add focused schema/action/repository tests.
- [ ] Only then wire client UI.

No owner decision remains blocking. The four owner preferences in `00-synthesis-and-decisions.md` have defaults, and none changes the canonical database model.
