# Project Groups — Plan Phase 1: DB + Types Foundation

Part 1 of the Project Groups implementation plan pack (build-phase **7a** of the contracts spine in [`07-implementation-plan-overview-and-contracts.md`](./07-implementation-plan-overview-and-contracts.md)).

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Lay the per-user data foundation for Project Groups — two new tables cloned from `project_favorites` (`project_groups` definitions + `project_group_memberships` one-to-many join), per-user RLS, composite-FK cascade safety, a `workspace_id → workspaces(id) ON DELETE CASCADE` FK on both tables (LD-7 — no orphan rows when a workspace is deleted), the `accent_id` column (accents ship in v1), the case-insensitive unique name index, and `UPDATE` grants (the favorites divergence) — then apply the migration, prove RLS isolation (under a genuine RLS-enforcing role, with a hard-abort sanity gate and rollback-only fixtures so nothing commits to live prod) and advisor cleanliness with SQL, regenerate `src/lib/supabase/types.ts` once, and add a `gen:types` npm script. The per-phase DOWN/revert path lives in [`15-deploy-rollback-recovery-and-dod.md`](./15-deploy-rollback-recovery-and-dod.md). Zero app source or UI is touched in this phase.

**Architecture:** Next.js (App Router, SSR-prop-driven) + Bun + Supabase/Postgres with RLS. This phase is **pure schema + generated types**. The two tables are cloned end-to-end from `supabase/migrations/20260526013617_workshop_favorites.sql` (and its grant-fix follow-up `20260526013708_workshop_favorites_grant_fix.sql` + RLS-consolidation follow-up `20260614144000_consolidate_low_risk_permissive_policies.sql`), preserving per-user ownership (`user_id` column; RLS `user_id = (select auth.uid()) AND public.is_workspace_member(workspace_id)`), the composite FK `(project_id, workspace_id) → projects(id, workspace_id) ON DELETE CASCADE`, and `authenticated`-only narrowed grants. The grouping/membership cascade (`group_id ON DELETE CASCADE`) implements delete-group semantics (D10). No new `SECURITY DEFINER` function is introduced, so the security-advisor baseline is unchanged.

**Tech Stack:** Postgres 15 (RLS, functional unique index, composite FK), Supabase MCP tools (`apply_migration`, `get_advisors`, `execute_sql`, `generate_typescript_types`), TypeScript (regenerated `src/lib/supabase/types.ts`), `bun run type-check` (= `tsc --noEmit`). Migrations are NOT unit-testable via Vitest, so every "test" in this phase is a concrete SQL verification query with an expected result, plus the advisor check and the type-check gate.

---

## 0. Scope, ground truth, and non-goals

### 0.1 What this phase delivers (and only this)

1. ONE new migration file: `supabase/migrations/20260617090000_project_groups.sql` (timestamp re-confirmed at apply time — see Task 1, Step 1).
2. Two tables: `public.project_groups` + `public.project_group_memberships`, with constraints (including a `workspace_id → workspaces(id) ON DELETE CASCADE` FK on both tables — LD-7), functional unique name index, ordinary indexes, RLS, and grants (including `UPDATE` on the definitions table).
3. Migration applied to Supabase project `ebxxqidacheyapmmzavr` (standing authorization per `AGENTS.md`).
4. Advisor proof: `get_advisors` shows **no new ERROR and no new WARN beyond the existing baseline** (the project's documented baseline is 74 WARN / 0 ERROR; this phase adds zero new SECURITY DEFINER functions and zero unindexed FKs, so the count must not rise).
5. RLS isolation proof: SQL smoke checks proving per-user isolation (user A cannot see user B's groups or memberships) and that the one-to-many uniqueness + cascades behave.
6. Regenerated `src/lib/supabase/types.ts` containing `Tables<"project_groups">` and `Tables<"project_group_memberships">`.
7. A `gen:types` npm script in `package.json`.
8. `bun run type-check` passes (proves the regenerated types compile against the unchanged app).

### 0.2 Non-goals for this phase (owned by later phases — do NOT do them here)

- NO server actions (`group-actions.ts`) — that is **Phase 2 / Part 7b**.
- NO repository read changes, NO `ProjectGroupSummary` export, NO `groupId` on `WorkshopProjectListItem`/`ProjectListItem`, NO `page.tsx` prop — that is **Phase 3 / Part 7c**.
- NO UI, NO `ProjectGroupSection`, NO `group-accent.ts`, NO `organizeBy` control — that is **Phase 4 / Part 7d**.
- NO DB enforcement of the 50-group / 40-char caps — those are **app-layer only** (Q2 soft-cap), enforced in Phase 2's server actions. Do NOT add a `CHECK` constraint or a `text` length constraint. (Open risk: a direct DB insert bypasses the caps; acceptable for a per-user private layer, documented here.)
- Do NOT add a `group_id` column to `public.projects` (D3 — would change `Tables<"projects">` pervasively).

### 0.3 Ground truth re-verified against the live repo (2026-06-16 — RE-VERIFY at apply time)

These were read from the live repo while authoring this plan. **You MUST re-confirm them before applying** — concurrent agents may have added migrations:

- **Latest migration on disk is `20260616120000_promote_detached_estimate_rows_to_library.sql`.** Your new timestamp must be **strictly greater** than this and greater than any concurrent `20260616*`/`20260617*` file present when you apply. Re-run the `ls | tail` in Task 1 Step 1.
- **The composite-unique target already exists.** `20260526013617_workshop_favorites.sql` added `constraint projects_id_workspace_id_unique unique (id, workspace_id)` on `public.projects` (inside a `do $$ ... if not exists ... $$` block). The Groups migration **MUST NOT re-add it** — it reuses that constraint as the composite-FK target.
- **RLS packaging has shifted since the original favorites migration.** The original `20260526013617_workshop_favorites.sql` shipped **two** policies per table (one owner policy + one platform-admin policy). The live convention is now a **single consolidated `FOR ALL` policy** introduced by `20260614144000_consolidate_low_risk_permissive_policies.sql`, named `"project favorites can be managed by owners and platform admins"`, with predicate:
  ```sql
  using (
    is_platform_admin()
    or ((user_id = (select auth.uid())) and is_workspace_member(workspace_id))
  )
  with check (
    is_platform_admin()
    or ((user_id = (select auth.uid())) and is_workspace_member(workspace_id))
  )
  ```
  This plan ships the **consolidated single-policy form** to match the live convention (the spine §2.3 shows the older two-policy form for predicate reference; the predicates are identical, only packaging differs). **RE-VERIFY** the live `project_favorites` policy shape at apply time with the query in Task 1 Step 2 and match whatever it currently is. The predicates are stable; only packaging may move.
- **Grants are narrowed to `authenticated`** via `20260526013708_workshop_favorites_grant_fix.sql` (`revoke all from public/anon/authenticated`, then `grant select, insert, delete on ... to authenticated`). Groups clones this but **adds `update`** to the definitions-table grant.
- **Helper functions `public.is_workspace_member(uuid)` and `public.is_platform_admin()` exist** and are used by the live favorites policy — reuse them verbatim.
- **`gen:types` does not yet exist** in `package.json`; `type-check` is `tsc --noEmit`; DOM tests run via `bunx vitest run <path>` (and `test:dom` = `vitest run --maxWorkers=1`).

### 0.4 Standing authorization & tooling

- Per `AGENTS.md`, you have **standing authorization to apply migrations** to Supabase project `ebxxqidacheyapmmzavr`. Use the Supabase MCP tools: `apply_migration` (DDL), `execute_sql` (verification SELECTs), `get_advisors` (lint), `generate_typescript_types` (types regen), `list_migrations`/`list_tables` (state checks).
- You cannot `cd` between bash calls reliably; always use absolute paths.
- Migrations are not Vitest-testable. Frame every check as an `execute_sql` query with an **expected result row** stated inline.

### 0.5 Gate: do NOT start until C1/C2/C3 have landed

Per the synthesis (§6) and the spine (§6), build Groups only after the three in-flight efforts merge: **C1** (sidebar-favorites), **C2** (delete-modal-UX), **C3** (card-links). This DB phase **barely touches contested UI files** (it touches only `supabase/migrations/`, `src/lib/supabase/types.ts`, and `package.json`), so it is the lowest-risk phase and can be reviewed/merged largely independently — BUT the `type-check` gate at the end compiles the regenerated `types.ts` against the live app, so the app must already be in a compiling state. Confirm the tree is green before starting:

```bash
git -C /Users/philiplewis/Documents/archestimator fetch
git -C /Users/philiplewis/Documents/archestimator status
bun run --cwd /Users/philiplewis/Documents/archestimator type-check
```

Expected: working tree reflects the merged C1/C2/C3 work (or you are explicitly told to proceed on the current branch), and `type-check` exits 0 BEFORE you regenerate `types.ts`. If `type-check` is already red on the untouched tree, STOP and escalate — a pre-existing type error is not yours to absorb.

---

## Task 1 — Author the migration file

**Files**
- **Create:** `supabase/migrations/<RECONFIRMED_TIMESTAMP>_project_groups.sql` (the SQL below; timestamp finalized in Step 1)

This task only writes the file to disk and statically validates it. Application to the live DB is Task 2 (kept separate so the file can be reviewed before any DB mutation).

### Step 1 — Re-confirm the migration timestamp (no stale numbers)

- [ ] List the latest migrations and pick a timestamp strictly later than every `20260616*`/`20260617*` file:

```bash
ls -1 /Users/philiplewis/Documents/archestimator/supabase/migrations | tail -8
```

Expected output ends with (at authoring time) `20260616120000_promote_detached_estimate_rows_to_library.sql`. If that is still the latest, use `20260617090000`. **If a later file exists, choose a timestamp strictly greater than the latest** (bump the date/time, keep the `_project_groups.sql` suffix). Record your chosen filename; every later reference to `20260617090000_project_groups.sql` means *your* reconfirmed name.

- [ ] Also confirm the project has no pre-existing `project_group*` schema (defensive — should return zero rows):

`execute_sql` on project `ebxxqidacheyapmmzavr`:

```sql
select tablename
from pg_tables
where schemaname = 'public'
  and tablename like 'project_group%';
```

Expected: **0 rows**. If rows come back, STOP — the schema already exists and this plan must be reconciled, not blindly applied.

### Step 2 — Re-verify the live `project_favorites` RLS packaging to mirror

- [ ] `execute_sql` on `ebxxqidacheyapmmzavr` to read the exact current favorites policy shape (so the Groups policies match the live convention, not the stale original migration):

```sql
select polname,
       cmd,
       pg_get_expr(polqual, polrelid)      as using_expr,
       pg_get_expr(polwithcheck, polrelid) as check_expr
from pg_policy
where polrelid = 'public.project_favorites'::regclass
order by polname;
```

Expected (live convention as of authoring): a **single** row, `polname = 'project favorites can be managed by owners and platform admins'`, `cmd = '*'` (ALL), with `using_expr` / `check_expr`:
```
is_platform_admin() OR ((user_id = ( SELECT auth.uid() AS uid)) AND is_workspace_member(workspace_id))
```

- [ ] **Decision rule:** if the live shape is the **single consolidated policy** (expected), write the Groups migration with the single consolidated policy form (the SQL in Step 3 already does this). If the live shape is still the **two-policy split** (owner policy + platform-admin policy), instead write two policies per table mirroring exactly that split — the predicates are identical, only the packaging differs. Either way, the predicate is `user_id = (select auth.uid()) AND public.is_workspace_member(workspace_id)` for owners and `public.is_platform_admin()` for admins.

### Step 3 — Write the migration SQL (the "failing test" is the absence of the tables; this step is the implementation)

> Migrations have no Vitest harness. The "RED" state is: the tables do not exist (Step 1's `pg_tables` query returns 0 rows). The "GREEN" state is Task 2's verification queries passing after apply. This step writes the exact DDL.

- [ ] Create the file `/Users/philiplewis/Documents/archestimator/supabase/migrations/20260617090000_project_groups.sql` (use your reconfirmed timestamp) with EXACTLY this content:

```sql
-- Project Groups: per-user, workspace-scoped organization buckets for /workshop/projects.
-- Cloned end-to-end from project_favorites (20260526013617 + grant-fix 20260526013708 +
-- RLS-consolidation 20260614144000): per-user rows, composite FK to projects(id, workspace_id)
-- ON DELETE CASCADE, per-user RLS via is_workspace_member, authenticated-only narrowed grants.
-- Both tables additionally carry workspace_id -> workspaces(id) ON DELETE CASCADE so the
-- per-user organization layer is reclaimed when a workspace is deleted (no orphan rows).
--
-- Two tables (one-to-many: a project is in at most one group per user):
--   project_groups               -- group definitions (name, accent_id token, manual position)
--   project_group_memberships    -- per-user join row; ON DELETE CASCADE off the group implements
--                                    "delete group => projects fall to virtual Ungrouped" (D10).
--
-- Caps (50 groups / 40-char names) are enforced in the server-action layer ONLY (Q2 soft-cap);
-- there is deliberately NO DB check or length constraint here.
--
-- Reuses the existing projects_id_workspace_id_unique (id, workspace_id) constraint added by the
-- favorites migration as the composite-FK target. This migration MUST NOT re-add it.

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

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

create table if not exists public.project_group_memberships (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.project_groups(id) on delete cascade,
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  project_id uuid not null,
  created_at timestamptz not null default now(),
  constraint project_group_memberships_project_workspace_fkey
    foreign key (project_id, workspace_id)
    references public.projects(id, workspace_id)
    on delete cascade,
  -- One-to-many (D1): a project is in at most one group per user.
  constraint project_group_memberships_unique_user_project unique (user_id, project_id)
);

-- ---------------------------------------------------------------------------
-- Indexes
-- ---------------------------------------------------------------------------

-- Case-insensitive unique group name per user per workspace (prevents ambiguous duplicate flags).
-- A column-list unique(...) cannot contain lower(name); this MUST be a functional unique index.
create unique index if not exists project_groups_user_workspace_lower_name_idx
  on public.project_groups (user_id, workspace_id, lower(name));

-- Listing/ordering: the repository read orders a user's groups by position then created_at.
create index if not exists project_groups_workspace_user_position_idx
  on public.project_groups (workspace_id, user_id, position, created_at);

-- Membership lookups (per-user fetch, cascade-by-group, cascade-by-project, advisor FK coverage).
create index if not exists project_group_memberships_workspace_user_idx
  on public.project_group_memberships (workspace_id, user_id);

create index if not exists project_group_memberships_group_id_idx
  on public.project_group_memberships (group_id);

create index if not exists project_group_memberships_project_id_idx
  on public.project_group_memberships (project_id);

-- ---------------------------------------------------------------------------
-- Row Level Security (per-user; cloned from the live consolidated project_favorites policy)
-- ---------------------------------------------------------------------------

alter table public.project_groups enable row level security;
alter table public.project_group_memberships enable row level security;

drop policy if exists "project groups can be managed by owners and platform admins"
  on public.project_groups;
drop policy if exists "project group memberships can be managed by owners and platform admins"
  on public.project_group_memberships;

create policy "project groups can be managed by owners and platform admins"
  on public.project_groups
  for all
  to authenticated
  using (
    public.is_platform_admin()
    or ((user_id = (select auth.uid())) and public.is_workspace_member(workspace_id))
  )
  with check (
    public.is_platform_admin()
    or ((user_id = (select auth.uid())) and public.is_workspace_member(workspace_id))
  );

create policy "project group memberships can be managed by owners and platform admins"
  on public.project_group_memberships
  for all
  to authenticated
  using (
    public.is_platform_admin()
    or ((user_id = (select auth.uid())) and public.is_workspace_member(workspace_id))
  )
  with check (
    public.is_platform_admin()
    or (
      (user_id = (select auth.uid()))
      and public.is_workspace_member(workspace_id)
      -- IDOR backstop: the referenced group must belong to THIS user. The group_id
      -- FK only proves the group EXISTS; without this exists() a direct Supabase API
      -- caller could insert a membership row pointing at ANOTHER user's group_id.
      and exists (
        select 1 from public.project_groups g
        where g.id = group_id and g.user_id = (select auth.uid())
      )
    )
  );

-- ---------------------------------------------------------------------------
-- Grants (authenticated-only; RLS owns row visibility)
-- project_groups gets UPDATE (rename / recolor / reorder) -- the favorites divergence.
-- project_group_memberships does NOT (move = upsert, remove = delete; never an in-place update).
-- ---------------------------------------------------------------------------

revoke all on public.project_groups from public;
revoke all on public.project_groups from anon;
revoke all on public.project_groups from authenticated;
revoke all on public.project_group_memberships from public;
revoke all on public.project_group_memberships from anon;
revoke all on public.project_group_memberships from authenticated;

grant select, insert, update, delete on public.project_groups to authenticated;
grant select, insert, delete on public.project_group_memberships to authenticated;
```

> **If Step 2 found the live convention is still the two-policy split**, replace the two `create policy ... for all ...` blocks above with FOUR policies (an owner + an admin policy per table), mirroring the original `20260526013617_workshop_favorites.sql` shape but with the `project_group(s|_memberships)` table names. The grants and everything else stay identical.

### Step 4 — Static-validate the SQL before touching the DB

- [ ] Re-read the file you just wrote and confirm against this checklist (each line is a contract from the spine §2):
  - [ ] `project_groups` has columns `id, workspace_id, user_id, name, accent_id, position, created_at, updated_at` — and `accent_id` is **nullable `text`** (no `not null`, no default), because `null ⇒ default neutral swatch`.
  - [ ] `position integer not null default 0`.
  - [ ] `user_id ... references auth.users(id) on delete cascade` on BOTH tables.
  - [ ] `workspace_id ... references public.workspaces(id) on delete cascade` on BOTH tables (LD-7 orphan-on-workspace-delete guard).
  - [ ] `project_group_memberships.group_id ... references public.project_groups(id) on delete cascade` (this is D10; single-column FK + RLS `exists()` backstop is the canonical IDOR mechanism per LD-1 — NOT a composite `(group_id, workspace_id, user_id)` FK).
  - [ ] composite FK `project_group_memberships_project_workspace_fkey (project_id, workspace_id) -> public.projects(id, workspace_id) on delete cascade`.
  - [ ] `unique (user_id, project_id)` on memberships (one-to-many D1).
  - [ ] `project_groups_user_workspace_lower_name_idx` is a **unique INDEX** on `(user_id, workspace_id, lower(name))`, NOT a table constraint.
  - [ ] All four membership/group indexes present (workspace_user, group_id, project_id; plus the groups position index).
  - [ ] RLS enabled on both tables; policies `to authenticated`; predicate uses `public.is_workspace_member(workspace_id)` + `public.is_platform_admin()` + `(select auth.uid())` initplan form.
  - [ ] grants: `project_groups` → `select, insert, update, delete`; `project_group_memberships` → `select, insert, delete` (NO update).
  - [ ] The file does **NOT** re-add `projects_id_workspace_id_unique` and does **NOT** add any `group_id` column to `public.projects`.
  - [ ] NO `check` constraint or `text` length constraint enforcing caps (Q2 soft-cap = app layer only). In particular the `02` `project_groups_name_check (char_length(trim(name)) BETWEEN 1 AND 40)` is **NOT shipped** — the 40-char/50-group caps are enforced exclusively in Phase 2's server actions (LD-8 / `07` §2.5).
  - [ ] NO `SECURITY DEFINER` function is defined (keeps the advisor baseline unchanged).

### Step 5 — Commit the migration file

- [ ] Commit (file only; not yet applied):

```bash
git -C /Users/philiplewis/Documents/archestimator add supabase/migrations/20260617090000_project_groups.sql
git -C /Users/philiplewis/Documents/archestimator commit -m "feat(db): add project_groups + project_group_memberships migration

Per-user, workspace-scoped Project Groups tables cloned from project_favorites:
one-to-many membership (unique user_id,project_id), composite FK to
projects(id,workspace_id) ON DELETE CASCADE, group_id cascade for delete-group
semantics, accent_id token column (accents v1), case-insensitive unique name
index, per-user RLS, authenticated-only grants WITH UPDATE on definitions.

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

(Use your reconfirmed filename in the `git add`.)

---

## Task 2 — Apply the migration and verify (DB smoke "tests")

**Files** — none changed on disk; this task mutates the live DB and proves it.

> There is no Vitest here. Each step below is a verification query (`execute_sql` on project `ebxxqidacheyapmmzavr`) with an **expected result** that plays the role of a passing assertion. Run them with the Supabase MCP tools.

### Step 1 — Apply the migration

- [ ] Apply via the Supabase MCP `apply_migration` tool to project `ebxxqidacheyapmmzavr`, name `project_groups`, body = the exact SQL from Task 1 Step 3. (Standing authorization per `AGENTS.md`.)
- [ ] Confirm it is recorded:

```sql
select version, name
from supabase_migrations.schema_migrations
order by version desc
limit 3;
```

Expected: the top row is your `project_groups` migration version (the reconfirmed `2026061709...` timestamp).

### Step 2 — TEST: both tables exist with the exact column shape

- [ ] `execute_sql`:

```sql
select table_name, column_name, data_type, is_nullable, column_default
from information_schema.columns
where table_schema = 'public'
  and table_name in ('project_groups', 'project_group_memberships')
order by table_name, ordinal_position;
```

Expected rows (assert each):
- `project_groups`: `id uuid NO` (default `gen_random_uuid()`), `workspace_id uuid NO`, `user_id uuid NO`, `name text NO`, `accent_id text YES` (no default), `position integer NO` (default `0`), `created_at timestamptz NO` (default `now()`), `updated_at timestamptz NO` (default `now()`).
- `project_group_memberships`: `id uuid NO`, `group_id uuid NO`, `workspace_id uuid NO`, `user_id uuid NO`, `project_id uuid NO`, `created_at timestamptz NO`.

**FAIL** if `accent_id` is `NO` (not nullable), if any `position` default is missing, or if a `group_id` column appears on `public.projects` (run `select 1 from information_schema.columns where table_schema='public' and table_name='projects' and column_name='group_id';` → expected **0 rows**).

### Step 3 — TEST: constraints, FKs, and the functional unique name index

- [ ] FKs and uniques:

```sql
select conname, contype, pg_get_constraintdef(oid) as def
from pg_constraint
where conrelid in ('public.project_groups'::regclass, 'public.project_group_memberships'::regclass)
order by conrelid::regclass::text, conname;
```

Expected to include:
- `project_group_memberships_project_workspace_fkey` — `FOREIGN KEY (project_id, workspace_id) REFERENCES projects(id, workspace_id) ON DELETE CASCADE`.
- `project_group_memberships_unique_user_project` — `UNIQUE (user_id, project_id)`.
- the `group_id` FK — `FOREIGN KEY (group_id) REFERENCES project_groups(id) ON DELETE CASCADE` (single-column — the LD-1 canonical IDOR mechanism, backed by the membership-policy `exists()` clause; NOT a composite group FK).
- the `user_id` FK on each table — `... REFERENCES users(id) ON DELETE CASCADE` (in the `auth` schema).
- the `workspace_id` FK on each table — `FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE` (LD-7).

- [ ] Functional unique name index (NOT a constraint):

```sql
select indexname, indexdef
from pg_indexes
where schemaname = 'public'
  and tablename in ('project_groups', 'project_group_memberships')
order by tablename, indexname;
```

Expected `project_groups_user_workspace_lower_name_idx` def contains `UNIQUE` and `lower(name)`; plus the position index and the three membership indexes.

### Step 4 — TEST: RLS is enabled and the per-user policy is present

- [ ] RLS on:

```sql
select relname, relrowsecurity
from pg_class
where relname in ('project_groups', 'project_group_memberships');
```

Expected: `relrowsecurity = true` for both.

- [ ] Policy predicate matches the live favorites convention:

```sql
select polrelid::regclass::text as tbl, polname, cmd,
       pg_get_expr(polqual, polrelid) as using_expr
from pg_policy
where polrelid in ('public.project_groups'::regclass, 'public.project_group_memberships'::regclass)
order by tbl, polname;
```

Expected: each `using_expr` reads `is_platform_admin() OR ((user_id = ( SELECT auth.uid() AS uid)) AND is_workspace_member(workspace_id))` (single consolidated policy per table) — i.e. **identical** to the `project_favorites` expr you captured in Task 1 Step 2 (modulo table name).

### Step 5 — TEST: grants are authenticated-only and definitions carry UPDATE

- [ ] `execute_sql`:

```sql
select table_name, grantee, privilege_type
from information_schema.role_table_grants
where table_schema = 'public'
  and table_name in ('project_groups', 'project_group_memberships')
  and grantee in ('authenticated', 'anon', 'public')
order by table_name, grantee, privilege_type;
```

Expected:
- `project_groups` / `authenticated`: `SELECT, INSERT, UPDATE, DELETE` (exactly these four).
- `project_group_memberships` / `authenticated`: `SELECT, INSERT, DELETE` (NO `UPDATE`).
- NO rows for `anon` or `public` on either table.

**FAIL** if `project_group_memberships` shows `UPDATE`, or if `anon`/`public` have any privilege.

### Step 6 — TEST (RLS isolation, the security-critical proof): cross-user invisibility + one-to-many uniqueness + cascades

> This is the load-bearing negative test. RLS leakage here would expose one user's private organization layer to another.
>
> **CRITICAL — this is the live-prod phase; nothing here may commit to project `ebxxqidacheyapmmzavr`.** The full, deterministic, repo-runnable RLS-isolation procedure (two real authenticated sessions OR a disposable Supabase branch DB, with guaranteed teardown) is specified in [`15-deploy-rollback-recovery-and-dod.md`](./15-deploy-rollback-recovery-and-dod.md) §"LD-9 RLS-proof runbook"; the blocks below are the assertion contract that runbook must satisfy. Two hard rules govern every block:
>
> 1. **The connection MUST actually enforce RLS.** The Supabase MCP `execute_sql` connection runs as a privileged role that may **BYPASS RLS** (table owner / `BYPASSRLS`). If so, the cross-user "B sees 0" proof passes *vacuously* and proves nothing. (1a) `set local role authenticated` is the REAL role switch — `set_config('role', 'authenticated', true)` only sets a GUC *named* `role` and does NOT switch the active Postgres role, so RLS is never engaged. Use `set local role authenticated`. (1b) The **sanity control** below is a **hard-abort gate**: it MUST fail-closed before any 0-result is trusted. If you cannot get an RLS-enforcing connection through the MCP, run the proof against a local/branch Postgres or reuse `scripts/prove-rls-initplan-postgres.mjs` (referenced by `20260613201302`) with two real authenticated sessions — never accept a 0-result from a BYPASSRLS connection as a pass.
> 2. **No row ever commits to live prod.** Every block below is wrapped in `begin … rollback` (never `commit`). The cross-user read is made visible to "user B" WITHOUT committing by keeping A's seed and B's read in the **same transaction** under sequential `set local role` / claim switches (rows written earlier in a transaction are visible to later statements in that same transaction; `rollback` then discards them). Equivalently, run the proof on a **disposable branch DB** that is deleted afterward, or as two real authenticated client sessions against transactional fixtures torn down on exit. The naive "seed with `commit`, read in a new transaction, then delete the seed afterward" pattern is FORBIDDEN here — a crash between seed and cleanup leaves test residue in `ebxxqidacheyapmmzavr`.
>
> ```sql
> -- SANITY CONTROL (run first) — HARD-ABORT GATE: prove RLS is enforced on this connection.
> begin;
> set local role authenticated;
> select set_config('request.jwt.claims',
>   json_build_object('sub', '<USER_A>', 'role', 'authenticated')::text, true);
> select current_user;                 -- expected: authenticated  (NOT postgres/service_role)
> select (select rolbypassrls from pg_roles where rolname = current_user); -- expected: false
> rollback;
> ```
> If `current_user` is not `authenticated` or `rolbypassrls` is true, **STOP — do not run any block below**; fix the connection (or switch to the branch-DB / two-session path in doc `15`) before trusting any isolation result. A green isolation result on an unverified connection is treated as a FAIL.
>
> Run the proof as a single rollback-wrapped transaction via `execute_sql` (or the doc-`15` two-session script). Use two real auth user ids from the project. Fetch two distinct users + a real owned project first:

```sql
-- Discover fixtures: two distinct users and a project one of them owns (in a workspace they belong to).
select p.id as project_id, p.workspace_id, p.created_by as user_a
from public.projects p
limit 1;
-- Then pick a second, different user id:
select id as user_b
from auth.users
where id <> '<USER_A_FROM_ABOVE>'
limit 1;
```

- [ ] **Seed-and-cross-read in ONE rollback-wrapped transaction** (no commit; nothing persists). Insert A's rows under A's claims, assert A sees them, then switch the active claims to user B **inside the same transaction** and assert B sees ZERO of A's rows — then `rollback` to discard the seed. (Rows written earlier in a transaction are visible to later statements in that same transaction, so the cross-user read is meaningful without committing.) Equivalently, run the doc-`15` two-real-session script whose fixtures are torn down on exit:

```sql
begin;
set local role authenticated;

-- (A) seed under user A's claims
select set_config('request.jwt.claims',
  json_build_object('sub', '<USER_A>', 'role', 'authenticated')::text, true);

insert into public.project_groups (workspace_id, user_id, name, accent_id, position)
values ('<WORKSPACE_A>', '<USER_A>', 'Pipeline', 'teal', 0)
returning id;  -- capture as <GROUP_A_ID>

insert into public.project_group_memberships (group_id, workspace_id, user_id, project_id)
values ('<GROUP_A_ID>', '<WORKSPACE_A>', '<USER_A>', '<PROJECT_A>');

-- A sees their own rows:
select count(*) as a_visible_groups from public.project_groups;       -- expected >= 1
select count(*) as a_visible_members from public.project_group_memberships; -- expected >= 1

-- (B) switch claims to user B IN THE SAME TRANSACTION; B must see ZERO of A's rows:
select set_config('request.jwt.claims',
  json_build_object('sub', '<USER_B>', 'role', 'authenticated')::text, true);

select count(*) as b_sees_a_group
from public.project_groups
where id = '<GROUP_A_ID>';  -- expected 0  (RLS hides A's group from B)

select count(*) as b_sees_a_membership
from public.project_group_memberships
where group_id = '<GROUP_A_ID>';  -- expected 0

rollback;  -- discard the seed; nothing commits to ebxxqidacheyapmmzavr
```

Expected: A's counts `>= 1` and B's counts both `0`. **The B counts are the pass/fail gate for RLS isolation. A non-zero B result is a security failure — STOP and fix the policy.** Because the whole block rolls back, no rows persist regardless of outcome.

- [ ] **One-to-many uniqueness** — re-inserting a second membership for the same `(user_id, project_id)` must fail with `23505`. Self-contained (seeds and rolls back; nothing persists):

```sql
begin;
select set_config('request.jwt.claims',
  json_build_object('sub', '<USER_A>', 'role', 'authenticated')::text, true);
set local role authenticated;

-- Seed two groups + an initial membership for A inside this transaction:
insert into public.project_groups (workspace_id, user_id, name, accent_id, position)
values ('<WORKSPACE_A>', '<USER_A>', 'Pipeline', 'teal', 0) returning id;  -- <GROUP_A_ID>
insert into public.project_group_memberships (group_id, workspace_id, user_id, project_id)
values ('<GROUP_A_ID>', '<WORKSPACE_A>', '<USER_A>', '<PROJECT_A>');

-- Create a 2nd group for A, then try to move PROJECT_A into it via a naive insert:
insert into public.project_groups (workspace_id, user_id, name, position)
values ('<WORKSPACE_A>', '<USER_A>', 'Archive', 1) returning id;  -- <GROUP_A2_ID>

insert into public.project_group_memberships (group_id, workspace_id, user_id, project_id)
values ('<GROUP_A2_ID>', '<WORKSPACE_A>', '<USER_A>', '<PROJECT_A>');
-- expected: ERROR  duplicate key value violates unique constraint
--           "project_group_memberships_unique_user_project"  (SQLSTATE 23505)
rollback;
```

Expected: the second insert raises `23505` on `project_group_memberships_unique_user_project` (confirms the server action must `upsert ... onConflict user_id,project_id`, not blind-insert).

- [ ] **Case-insensitive name uniqueness** — duplicate name differing only by case must fail with `23505`. Self-contained (seeds and rolls back; nothing persists):

```sql
begin;
select set_config('request.jwt.claims',
  json_build_object('sub', '<USER_A>', 'role', 'authenticated')::text, true);
set local role authenticated;

insert into public.project_groups (workspace_id, user_id, name, accent_id, position)
values ('<WORKSPACE_A>', '<USER_A>', 'Pipeline', 'teal', 0);  -- seed inside this tx

insert into public.project_groups (workspace_id, user_id, name, position)
values ('<WORKSPACE_A>', '<USER_A>', 'PIPELINE', 2);
-- expected: ERROR duplicate key value violates unique constraint
--           "project_groups_user_workspace_lower_name_idx" (SQLSTATE 23505)
rollback;
```

Expected: `23505` on `project_groups_user_workspace_lower_name_idx` (confirms Phase 2 must catch `23505` → `ProjectGroupNameError`).

- [ ] **Membership IDOR backstop** — user B cannot insert a membership pointing at user A's group_id, even with B's own user_id/workspace. The `with check` `exists(... project_groups g where g.id = group_id and g.user_id = auth.uid())` must reject it:

```sql
begin;
set local role authenticated;

-- Seed A's group under A's claims inside this transaction:
select set_config('request.jwt.claims',
  json_build_object('sub', '<USER_A>', 'role', 'authenticated')::text, true);
insert into public.project_groups (workspace_id, user_id, name, accent_id, position)
values ('<WORKSPACE_A>', '<USER_A>', 'Pipeline', 'teal', 0) returning id;  -- <GROUP_A_ID>

-- Switch to user B in the SAME transaction and forge a membership into A's group
-- (B is a member of WORKSPACE_A for this probe, or substitute a workspace B belongs
-- to that also contains a project B can reference):
select set_config('request.jwt.claims',
  json_build_object('sub', '<USER_B>', 'role', 'authenticated')::text, true);
insert into public.project_group_memberships (group_id, workspace_id, user_id, project_id)
values ('<GROUP_A_ID>', '<WORKSPACE_A>', '<USER_B>', '<PROJECT_B>');
-- expected: ERROR  new row violates row-level security policy
--           for table "project_group_memberships"
rollback;
```

Expected: the insert is **rejected by RLS** (the group belongs to A, not B). If it SUCCEEDS, the IDOR backstop `exists(...)` clause is missing from the membership `with check` — STOP and fix the policy. (This is the §07 §2.3 / Phase 1 membership-policy backstop; without it the FK only proves the group exists, not that it is the caller's.)

- [ ] **Delete-group cascade (D10)** — deleting the group removes its memberships but NOT the project. Self-contained (seeds, deletes, asserts, then rolls back; nothing persists):

```sql
begin;
select set_config('request.jwt.claims',
  json_build_object('sub', '<USER_A>', 'role', 'authenticated')::text, true);
set local role authenticated;

-- Seed a group + membership for A inside this transaction:
insert into public.project_groups (workspace_id, user_id, name, accent_id, position)
values ('<WORKSPACE_A>', '<USER_A>', 'Pipeline', 'teal', 0) returning id;  -- <GROUP_A_ID>
insert into public.project_group_memberships (group_id, workspace_id, user_id, project_id)
values ('<GROUP_A_ID>', '<WORKSPACE_A>', '<USER_A>', '<PROJECT_A>');

delete from public.project_groups where id = '<GROUP_A_ID>';

select count(*) as orphaned_memberships
from public.project_group_memberships
where group_id = '<GROUP_A_ID>';            -- expected 0 (cascaded away)

select count(*) as project_still_exists
from public.projects where id = '<PROJECT_A>';  -- expected 1 (project untouched)
rollback;  -- discard everything; this was a proof, not a real delete
```

Expected: `orphaned_memberships = 0`, `project_still_exists = 1` (group delete is non-destructive to projects — D10).

- [ ] **No cleanup step is required.** Every block above is `begin … rollback` (or runs on a disposable branch DB / two transactional sessions per doc `15`), so no seed row ever commits to `ebxxqidacheyapmmzavr`. As a final guard, confirm the live tables are empty after the proof:

```sql
select count(*) from public.project_groups;            -- expected 0 (no leftover test rows)
select count(*) from public.project_group_memberships; -- expected 0
```

Expected: both counts `0`. **If either is non-zero, a proof block committed instead of rolling back — STOP, delete the residue immediately, and re-run the proof under the rollback/branch discipline before proceeding.**

> If your project's `projects` table uses a different owner column than `created_by` (re-verify with `select column_name from information_schema.columns where table_schema='public' and table_name='projects' and column_name in ('created_by','owner_id','user_id');`), substitute the real owner column when discovering `<USER_A>`. The RLS predicate keys off `is_workspace_member(workspace_id)` + `user_id`, so the membership's `user_id` is what gates visibility, not the project owner — but you still need a real project the user can reference for the composite FK.

### Step 7 — TEST: advisor baseline is unchanged (no new ERROR/WARN)

- [ ] Run `get_advisors` (type `security`) on `ebxxqidacheyapmmzavr`. Then `get_advisors` (type `performance`).
- [ ] **Expected:** zero new ERROR-level findings, and the WARN count does **not** rise above the documented baseline of **74 WARN / 0 ERROR**. Specifically confirm:
  - NO new "RLS disabled" finding for either new table (RLS is enabled).
  - NO new "policy exists but RLS not enabled" finding.
  - NO new "unindexed foreign key" finding. Every FK column is index-covered by Task 1: `group_id` (`project_group_memberships_group_id_idx`), `project_id` (`project_group_memberships_project_id_idx`), the composite `(project_id, workspace_id)`, and `workspace_id` (LD-7 — leftmost column of `project_groups_workspace_user_position_idx` / `project_group_memberships_workspace_user_idx`, so the new `workspaces(id)` FKs are covered). The `user_id` FKs are leftmost-covered on memberships (`project_group_memberships_workspace_user_idx` leads `workspace_id, user_id`, so `user_id` alone is NOT a prefix) — if `get_advisors` flags `user_id` as an **unindexed foreign key** on either table, ADD a dedicated `user_id`-leading index (`create index if not exists project_group_memberships_user_id_idx on public.project_group_memberships (user_id);` and the equivalent on `project_groups`) to the migration before re-applying, then re-run the advisor (LD-8). Do not add it speculatively — only if the advisor flags it.
  - NO new "function search_path mutable" / "SECURITY DEFINER" finding (this migration defines no functions).
  - The `(select auth.uid())` initplan form means NO new "auth_rls_initplan" performance warning.
- [ ] If the WARN count rose, identify the exact new finding and reconcile it before proceeding (most likely cause would be an unindexed FK — re-check Task 1's indexes). Record the before/after advisor counts in the commit/PR description.

### Step 8 — Commit the verification record

There are no file changes from Task 2 (DB-only), so there is nothing to `git commit` here. Instead, **capture the advisor before/after counts and the RLS-isolation result in the eventual PR description** (the migration commit from Task 1 is the artifact). If your workflow keeps a verification log file, append the results there; otherwise carry them into the Phase-1 PR body.

---

## Task 3 — Regenerate `types.ts` and add the `gen:types` script

**Files**
- **Modify:** `src/lib/supabase/types.ts` (regenerated — do NOT hand-edit)
- **Modify:** `package.json` (add `gen:types` script)

### Step 1 — Add the `gen:types` npm script

- [ ] Read the current scripts block, then add the script. Open `/Users/philiplewis/Documents/archestimator/package.json` and add this line into `"scripts"` (place it right after the `"type-check"` line for discoverability):

```json
    "gen:types": "supabase gen types typescript --project-id ebxxqidacheyapmmzavr --schema public > src/lib/supabase/types.ts",
```

Result (context — the surrounding lines already exist; only the `gen:types` line is new):

```json
    "type-check": "tsc --noEmit",
    "gen:types": "supabase gen types typescript --project-id ebxxqidacheyapmmzavr --schema public > src/lib/supabase/types.ts",
    "test": "bun test tests/unit",
```

### Step 2 — Regenerate `types.ts` ONCE, after ALL pending migrations are applied

> Critical sequencing (open risk in the spine): regenerate exactly **once**, after the Groups migration (and any concurrent pending `20260616*`/`20260617*` migration) is applied. A stale/hand-edited `types.ts` breaks every `Tables<…>` consumer.

- [ ] Confirm no other pending migrations are unapplied (so the regen captures the full schema):

```sql
-- via execute_sql on ebxxqidacheyapmmzavr
select version from supabase_migrations.schema_migrations order by version desc limit 5;
```

Cross-check against `ls -1 /Users/philiplewis/Documents/archestimator/supabase/migrations | tail -5` — every local file must appear as an applied version. If a local migration is NOT yet applied, apply it first (or coordinate with its owning agent), THEN regenerate.

- [ ] Regenerate using the Supabase MCP `generate_typescript_types` tool for project `ebxxqidacheyapmmzavr` (schema `public`) and write the result to `/Users/philiplewis/Documents/archestimator/src/lib/supabase/types.ts`, overwriting the file. (The `gen:types` npm script does the same thing via the CLI if `supabase` is linked; the MCP tool is the in-environment equivalent and is preferred here.)

### Step 3 — TEST: the generated types contain the two new tables with the expected shapes

- [ ] Confirm the new table types appear:

```bash
grep -n "project_groups:\|project_group_memberships:" /Users/philiplewis/Documents/archestimator/src/lib/supabase/types.ts
```

Expected: at least two matches (one per table) under `public.Tables`.

- [ ] Read the generated `project_groups` and `project_group_memberships` blocks and confirm they match these expected shapes (field order is alphabetical in Supabase output; the mirror is `project_favorites`'s generated shape with the extra columns):

`Tables<"project_groups">` expected (`Row`):

```ts
project_groups: {
  Row: {
    accent_id: string | null
    created_at: string
    id: string
    name: string
    position: number
    updated_at: string
    user_id: string
    workspace_id: string
  }
  Insert: {
    accent_id?: string | null
    created_at?: string
    id?: string
    name: string
    position?: number
    updated_at?: string
    user_id: string
    workspace_id: string
  }
  Update: {
    accent_id?: string | null
    created_at?: string
    id?: string
    name?: string
    position?: number
    updated_at?: string
    user_id?: string
    workspace_id?: string
  }
  Relationships: [
    {
      foreignKeyName: "project_groups_user_id_fkey"
      columns: ["user_id"]
      isOneToOne: false
      referencedRelation: "users"
      referencedColumns: ["id"]
    },
    {
      foreignKeyName: "project_groups_workspace_id_fkey"
      columns: ["workspace_id"]
      isOneToOne: false
      referencedRelation: "workspaces"
      referencedColumns: ["id"]
    },
  ]
}
```

(The exact `Relationships` order and which FKs Supabase emits for `auth.users` references can vary by generator version; assert on the `project_groups_workspace_id_fkey → workspaces` relationship being present rather than on exact array order.)

`Tables<"project_group_memberships">` expected (`Row`):

```ts
project_group_memberships: {
  Row: {
    created_at: string
    group_id: string
    id: string
    project_id: string
    user_id: string
    workspace_id: string
  }
  Insert: {
    created_at?: string
    group_id: string
    id?: string
    project_id: string
    user_id: string
    workspace_id: string
  }
  Update: {
    created_at?: string
    group_id?: string
    id?: string
    project_id?: string
    user_id?: string
    workspace_id?: string
  }
  Relationships: [
    {
      foreignKeyName: "project_group_memberships_group_id_fkey"
      columns: ["group_id"]
      isOneToOne: false
      referencedRelation: "project_groups"
      referencedColumns: ["id"]
    },
    {
      foreignKeyName: "project_group_memberships_project_workspace_fkey"
      columns: ["project_id", "workspace_id"]
      isOneToOne: false
      referencedRelation: "projects"
      referencedColumns: ["id", "workspace_id"]
    },
    {
      foreignKeyName: "project_group_memberships_workspace_id_fkey"
      columns: ["workspace_id"]
      isOneToOne: false
      referencedRelation: "workspaces"
      referencedColumns: ["id"]
    },
  ]
}
```

- [ ] Asserts to make on the generated output:
  - [ ] `project_groups.Row.accent_id` is `string | null` (nullable — proves Phase 4 can store `null` for the default swatch).
  - [ ] `project_groups.Row.position` is `number`.
  - [ ] `project_group_memberships.Row.group_id` is a non-null `string` and its relationship references `project_groups`.
  - [ ] The composite `project_group_memberships_project_workspace_fkey` relationship references `projects` on `["id", "workspace_id"]`.
  - [ ] A `workspace_id → workspaces` relationship is present on BOTH generated table blocks (LD-7 — `project_groups_workspace_id_fkey` and `project_group_memberships_workspace_id_fkey`).
  - [ ] No diff to `Tables<"projects">` (the file's `projects:` block must be unchanged — confirm with `git diff` that only the two new table blocks were added, plus possibly any other genuinely-new tables from concurrent migrations; the `projects` block must NOT have a `group_id`).

### Step 4 — TEST (gate): the regenerated types compile against the app

- [ ] Run the type-check gate:

```bash
bun run --cwd /Users/philiplewis/Documents/archestimator type-check
```

Expected: **exit 0**, no errors. This proves the regenerated `types.ts` is consistent with every existing `Tables<…>` consumer (the app does not yet use the new tables, so a clean regen must not break anything). If errors appear, they indicate either a concurrent migration changed an existing table (reconcile with that agent) or the regen captured an unexpected schema state (re-check Step 2).

### Step 5 — Commit types + script together

- [ ] Commit:

```bash
git -C /Users/philiplewis/Documents/archestimator add src/lib/supabase/types.ts package.json
git -C /Users/philiplewis/Documents/archestimator commit -m "chore(db): regenerate supabase types for project groups + add gen:types script

Adds Tables<\"project_groups\"> and Tables<\"project_group_memberships\"> from the
applied migration (single regen after all pending migrations). Adds a gen:types
npm script. type-check passes; Tables<\"projects\"> is unchanged.

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 4 — Phase-1 exit criteria & handoff

**Files** — none; this is the gate before Phase 2/3 may begin.

### Step 1 — Final verification sweep

- [ ] Re-run, all must pass:
  - `bun run --cwd /Users/philiplewis/Documents/archestimator type-check` → exit 0.
  - `get_advisors` (security + performance) on `ebxxqidacheyapmmzavr` → no new ERROR; WARN count not above the 74 baseline.
  - The RLS cross-user isolation query (Task 2 Step 6) → user B sees `0` of user A's rows.
- [ ] Confirm `git status` shows only the intended changes: the new migration file, `src/lib/supabase/types.ts`, and `package.json`. NO edits to `projects-page-client.tsx`, `workspace-repository.ts`, `LiveProjectCard.tsx`, `ProjectDetailsModal.tsx`, or any `projects-page-*` test (those belong to Phases 3/4 and the in-flight C1/C2/C3 efforts).

### Step 2 — Handoff notes for downstream phases

Record in the PR description so Phases 2/3/4 inherit the facts:

- [ ] The exact migration filename/timestamp applied (e.g. `20260617090000_project_groups.sql`).
- [ ] Advisor before/after counts (proving baseline unchanged).
- [ ] Which RLS packaging shipped (consolidated single-policy vs two-policy split), so Phase 2's negative RLS tests assert the right policy name.
- [ ] The confirmed `23505` constraint names — `project_group_memberships_unique_user_project` (one-to-many) and `project_groups_user_workspace_lower_name_idx` (case-insensitive name) — so **Phase 2 (`group-actions.ts`) can map the duplicate-name `23505` (from the lower-name index) to `ProjectGroupNameError`**, and treat the `(user_id, project_id)` `23505` as the "use upsert onConflict user_id,project_id" signal for `moveProjectToGroup`.
- [ ] Reminder: **caps (50 groups / 40-char) are NOT in the DB** — Phase 2 must enforce them; a direct DB insert bypasses them (documented, acceptable for a per-user private layer). The `02` `project_groups_name_check` constraint was deliberately NOT shipped (LD-8).
- [ ] Both tables carry `workspace_id → workspaces(id) ON DELETE CASCADE` (LD-7), so deleting a workspace reclaims its group definitions and memberships — no orphan rows.
- [ ] Whether the LD-8 dedicated `user_id`-leading index was added (only if `get_advisors` flagged `user_id` as an unindexed FK) — so Phase 2 knows the exact index set.

### Step 3 — What Phase 2 / Phase 3 may now assume

- `Tables<"project_groups">` and `Tables<"project_group_memberships">` are available from `@/lib/supabase/types`.
- `accent_id` is a nullable `text` token column (Phase 4 stores `GroupAccentId` strings; `null ⇒ default swatch`).
- The composite FK + per-user uniqueness + cascades are proven, so Phase 2's `moveProjectToGroup` can `upsert` on `onConflict: "user_id,project_id"` (cloning `setProjectFavorite`) and Phase 2's `deleteProjectGroup` can rely on `group_id ON DELETE CASCADE` for membership cleanup (no manual membership delete needed).
- Per-user RLS is proven isolating, so server actions need only the standard `assertUuid → ensureDefaultWorkspace → projects ownership verify → mutate → revalidatePath` skeleton; RLS is the backstop, not the primary gate.

### Step 4 — Down / rollback path (if Phase 1 must be reverted)

The full, authoritative per-phase DOWN/revert procedure — drop policies + grants + tables (memberships first, then definitions, to respect the FKs), revert `src/lib/supabase/types.ts`, and re-run `get_advisors` to confirm no regression — lives in [`15-deploy-rollback-recovery-and-dod.md`](./15-deploy-rollback-recovery-and-dod.md) (LD-14). Do NOT improvise a rollback here; follow doc `15`. Key facts that doc relies on, recorded for the reverter:

- [ ] The revert is **additive-only to drop**: both tables are net-new (no `projects` column was added — D3), so dropping `public.project_group_memberships` then `public.project_groups` (with their policies/grants) fully removes the feature's schema. The reused `projects_id_workspace_id_unique` constraint and the `workspaces`/`auth.users` parents are NOT this migration's to drop.
- [ ] After dropping, regenerate `src/lib/supabase/types.ts` once more (the `Tables<"project_groups">` / `Tables<"project_group_memberships">` blocks disappear) and re-run `bun run --cwd /Users/philiplewis/Documents/archestimator type-check` — it must stay green because no app code consumed the new tables in Phase 1.
- [ ] Re-run `get_advisors` (security + performance) after the drop to confirm the WARN count returns to the pre-Phase-1 baseline (no advisor regression).

---

## Appendix A — Phase-1 commit checklist (frequent commits)

- [ ] Commit 1 (Task 1.5): the migration file alone.
- [ ] Commit 2 (Task 3.5): regenerated `types.ts` + `gen:types` script.
- [ ] (Task 2 produces no file changes — its output is the verified DB state + advisor/RLS evidence carried into the PR body.)

## Appendix B — Quick reference: what mirrors favorites vs what diverges

| Aspect | Favorites (`project_favorites`) | Project Groups | Divergence reason |
|---|---|---|---|
| Ownership | per-user (`user_id`) | per-user (`user_id`) | identical (D2) |
| Composite FK | `(project_id, workspace_id) → projects ON DELETE CASCADE` | same (on memberships) | identical (cascade safety) |
| RLS predicate | `is_platform_admin() OR (user_id=(select auth.uid()) AND is_workspace_member(...))` | identical | cloned verbatim |
| Grants | `select, insert, delete` to `authenticated` | groups: **+ update**; memberships: `select, insert, delete` | rename/recolor/reorder need UPDATE (D7) |
| Tables | one join table | **two** (definitions + join) | groups have names/accents/order (D3) |
| Extra columns | — | `name`, `accent_id`, `position`, `updated_at` | named/ordered/accented buckets (D13) |
| Name uniqueness | — | functional unique index `lower(name)` per user/workspace | case-insensitive dedupe |
| One-to-many | n/a | `unique(user_id, project_id)` on memberships | a project in ≤1 group (D1) |
| Caps | none | 50 groups / 40 chars — **app layer only** | soft-cap (Q2), no DB constraint |
