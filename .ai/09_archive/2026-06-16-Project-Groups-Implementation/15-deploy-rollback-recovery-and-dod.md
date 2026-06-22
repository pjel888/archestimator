# Project Groups — Deploy, Rollback, Recovery & Definition-of-Done

Part 15 of the Project Groups implementation plan pack (new artifact per LD-14). This is the **operational safety doc** the implementer follows to apply the migration, prove RLS isolation without polluting live prod, revert any phase cleanly, and gate each phase as Done.

> **OPERATIONS DOC — subordinate to `00-synthesis-and-decisions.md` (decisions) and `07-implementation-plan-overview-and-contracts.md` (contracts). Where this doc conflicts, 00/07 win.** Reconciled/authored 2026-06-16 to the locked decisions in [`_improvement-campaign-2026-06-16/01-AUDIT-FINDINGS-SCORES-AND-LOCKED-DECISIONS.md`](./_improvement-campaign-2026-06-16/01-AUDIT-FINDINGS-SCORES-AND-LOCKED-DECISIONS.md): single-column membership FK + RLS `exists()` IDOR backstop (LD-1); repository-`owned` ownership predicate (LD-2); accents-in-v1 + LD-4 palette; D9 realized assignment selection (LD-5); corrected non-awaitable `router.refresh()` D14 clear (LD-6); `workspaces(id)` FK on both tables (LD-7); typed `bulkAssignProjectsToGroup` result (LD-11); RLS proof under a genuine RLS-enforcing role with no prod pollution (LD-9).

**Project:** Archestimator, Supabase project `ebxxqidacheyapmmzavr`
**Date:** 2026-06-16
**Status:** Operational plan. No migration applied by this document.
**Referenced BY NAME from:** [`08-plan-phase-1-db-and-types.md`](./08-plan-phase-1-db-and-types.md) (Task 2 Step 6 RLS-isolation contract + Task 4 Step 4 DOWN path), [`10-plan-phase-3-repository-and-page.md`](./10-plan-phase-3-repository-and-page.md) ("Phase 3 additive revert"), [`02-database-supabase-analysis.md`](./02-database-supabase-analysis.md) §7 (provider verification → RLS proof).

---

## 0. How to read this doc

This doc has four parts, each a hard gate the implementer must pass before moving on:

1. **§1 Deploy order** — the exact migration-apply / advisor / types-regen sequence for Phase 1, including the timestamp-race guard and the single-regen rule.
2. **§2 The LD-9 RLS-isolation-proof runbook** — the deterministic, repo-runnable procedure (referenced by name from `08` Task 2 Step 6) that proves per-user isolation + the membership IDOR backstop under a genuine RLS-enforcing path, with a hard-abort sanity control and guaranteed-teardown fixtures so **nothing commits to `ebxxqidacheyapmmzavr`**.
3. **§3 Per-phase DOWN / revert + recovery** — Phase 1 (drop schema), Phase 3 (additive-in-reverse), Phase 4 (`organizeBy`-gated client revert). Phase 2 revert is covered as a sub-section of §3.
4. **§4 Per-phase Definition-of-Done** — the concrete pass criteria that close each of Phases 1–4.

Bind every shape to `07` (contracts) and the phase docs `08`–`11`. Do not improvise any DDL, drop order, or proof connection setup; follow this doc verbatim.

---

## 1. Deploy order (Phase 1 — the only schema-mutating phase)

Phases 2–4 are app-source only and ship through the normal git/PR flow (no DB step). The only deploy-ordered work is Phase 1's migration. Execute the steps **in order**; each is a gate.

### 1.1 Step D1 — Re-list migrations and pick a non-colliding timestamp

The latest migration on disk at authoring time is `20260616120000_promote_detached_estimate_rows_to_library.sql` (`02` §1, `08` §0.3). The Groups timestamp MUST be **strictly later** than that **and** later than any concurrent `20260616*`/`20260617*` file present at apply time.

```bash
ls -1 /Users/philiplewis/Documents/archestimator/supabase/migrations | tail -8
```

- If `20260616120000_promote_detached_estimate_rows_to_library.sql` is still the latest, use `20260617090000_project_groups.sql` (the `08` Task 1 Step 1 default).
- If a later `20260616*`/`20260617*` file exists, bump the timestamp strictly greater than the latest and keep the `_project_groups.sql` suffix. Every later reference to `20260617090000_project_groups.sql` means *your* reconfirmed name.

> **Why this gate matters:** an out-of-order timestamp makes Supabase replay migrations in the wrong sequence, and a `types.ts` regenerated before a concurrent migration applies captures a partial schema (00 §5 risk-row 7 "types.ts regeneration race"; `07` §7 "Migration timestamp race").

### 1.2 Step D2 — Author + apply the migration

- Author the migration file exactly per `08` Task 1 Step 3 (the canonical DDL is `07` §2.1–§2.4; the two-table `08` body reproduces it: `project_groups` + `project_group_memberships`, single-column `group_id → project_groups(id) on delete cascade` per LD-1, `workspaces(id)` FK on **both** tables per LD-7, composite `(project_id, workspace_id) → projects(id, workspace_id)` FK, functional unique `lower(name)` index, `UPDATE` grant on definitions only, **no** DB name-length check per LD-8). Re-verify the live `project_favorites` RLS packaging first (`08` Task 1 Step 2) and ship the matching consolidated single-policy form.
- Apply via the Supabase MCP `apply_migration` tool to project `ebxxqidacheyapmmzavr` (standing authorization per `AGENTS.md`), name `project_groups`, body = the exact SQL. Confirm it is recorded as the top row of `supabase_migrations.schema_migrations` (`08` Task 2 Step 1).
- Run the structural verification queries (`08` Task 2 Steps 2–5): both tables + exact columns, FKs/uniques, functional unique name index, RLS enabled, grants authenticated-only with `UPDATE` on `project_groups` and **no** `UPDATE` on `project_group_memberships`.

### 1.3 Step D3 — Advisor-regression gate (binding)

- Run `get_advisors` (type `security`) then `get_advisors` (type `performance`) on `ebxxqidacheyapmmzavr`.
- **PASS criteria (advisor-regression gate):** **0 new ERROR-level findings**, and the **WARN count does not rise above the documented baseline of 74 WARN / 0 ERROR** (`08` §0.1 item 4, Task 2 Step 7). Specifically: no new `rls_disabled_in_public`, no "policy exists but RLS not enabled", no new "unindexed foreign key", no new `function search_path mutable` / `SECURITY DEFINER` (this migration defines no functions), and no new `auth_rls_initplan` (the `(select auth.uid())` initplan form prevents it).
- **If the WARN count rose because `user_id` is flagged as an unindexed FK on either new table** (its leftmost-covered position in `project_group_memberships_workspace_user_idx`/`project_groups_workspace_user_position_idx` means `user_id` alone is not a prefix): add a dedicated `user_id`-leading index — `create index if not exists project_group_memberships_user_id_idx on public.project_group_memberships (user_id);` and the `project_groups` equivalent — to the migration, re-apply, and re-run the advisor (LD-8 / `08` Task 2 Step 7). Add it **only if** the advisor flags it, never speculatively.
- Record the **before/after advisor counts** in the Phase-1 PR body (`08` Task 2 Step 8).

> **ABORT criterion:** any new ERROR, or a WARN that cannot be eliminated by the LD-8 `user_id` index, halts the deploy — reconcile the finding (or revert per §3.1) before regenerating types.

### 1.4 Step D4 — RLS-isolation proof (gate)

Run the §2 runbook. It is the load-bearing security gate: user B must see **0** of user A's rows, and the forged-membership-into-A's-group insert under B's claims must be **rejected by RLS**. A green isolation result on an **unverified** (BYPASSRLS) connection is treated as a FAIL (§2.2). Nothing may commit to `ebxxqidacheyapmmzavr` (§2.4). This satisfies the assertion contract that `08` Task 2 Step 6 defers to this doc by name.

### 1.5 Step D5 — Regenerate types ONCE, after ALL pending migrations

- Confirm no other local migration is unapplied: cross-check `select version from supabase_migrations.schema_migrations order by version desc limit 5;` against `ls -1 .../supabase/migrations | tail -5` — every local file must appear as an applied version. If a concurrent migration is unapplied, apply it (or coordinate with its owner) **first**, then regenerate (`08` Task 3 Step 2).
- Regenerate `src/lib/supabase/types.ts` **exactly once** via the Supabase MCP `generate_typescript_types` tool (schema `public`), overwriting the file. (The `gen:types` npm script — `supabase gen types typescript --project-id ebxxqidacheyapmmzavr --schema public > src/lib/supabase/types.ts`, added in `08` Task 3 Step 1 / `07` §4.8 — is the CLI equivalent.)
- Confirm `Tables<"project_groups">` and `Tables<"project_group_memberships">` appear with the expected shapes (`08` Task 3 Step 3): `accent_id: string | null`, `position: number`, the composite `project_group_memberships_project_workspace_fkey → projects ["id","workspace_id"]`, and a `workspace_id → workspaces` relationship on **both** blocks (LD-7). Confirm `Tables<"projects">` is **unchanged** (no `group_id` column — D3).

### 1.6 Step D6 — Type-check gate + commit types alongside migration

- `bun run --cwd /Users/philiplewis/Documents/archestimator type-check` → **exit 0** (proves the regenerated `types.ts` compiles against the unchanged app; `08` Task 3 Step 4).
- Commit `src/lib/supabase/types.ts` + `package.json` (the `gen:types` script) **together**, alongside (immediately after) the migration-file commit from `08` Task 1 Step 5. The migration file and its generated types are one logical deploy unit — never let `types.ts` drift from the applied schema (`08` Task 3 Step 5; 00 §5 risk-row 7).

> **Deploy summary (the one-line invariant):** re-`ls | tail` → pick a strictly-later timestamp → `apply_migration` → structural probes → `get_advisors` advisor-regression gate (0 new ERROR, WARN ≤ 74 baseline) → §2 RLS proof → regenerate `types.ts` **once** after all pending migrations → `type-check` clean → commit types + `gen:types` with the migration.

---

## 2. LD-9 RLS-isolation-proof runbook

> **This is the procedure `08` Task 2 Step 6 and `02` §7 item 4 reference BY NAME.** It is a deterministic, repo-runnable proof that the per-user RLS policies + the membership `exists()` IDOR backstop (LD-1) actually isolate users — run under a **genuine RLS-enforcing path**, gated by a **hard-abort sanity control**, with **guaranteed-teardown** fixtures so **nothing commits to live project `ebxxqidacheyapmmzavr`**.

### 2.1 Choose ONE enforcing path

The Supabase MCP `execute_sql` connection runs as a privileged role that may **BYPASS RLS** (table owner / `BYPASSRLS`); a 0-result there proves nothing. Choose one of these RLS-enforcing paths:

- **Path A — single rollback-wrapped transaction with `set local role authenticated` + sequential JWT-claim switches** (the `08` Task 2 Step 6 default; works through `execute_sql`). Rows seeded earlier in the transaction are visible to later statements in the *same* transaction, so the cross-user read is meaningful without committing; `rollback` discards everything.
- **Path B — two real authenticated client sessions** (two distinct user JWTs) against transactional fixtures torn down on exit — e.g. reuse `scripts/prove-rls-initplan-postgres.mjs` (referenced by migration `20260613201302`) with two real authenticated sessions.
- **Path C — a disposable Supabase branch DB** (create branch → apply migration → run the proof → **delete the branch**), so the live project is never touched at all.

Whichever path, the two hard rules below are non-negotiable.

### 2.2 HARD RULE 1 — the connection MUST enforce RLS (sanity control is a HARD-ABORT gate)

- Use `set local role authenticated` — the REAL role switch. `set_config('role', 'authenticated', true)` only sets a GUC *named* `role` and does **NOT** switch the active Postgres role, so RLS is never engaged. Do not use it.
- Run this **SANITY CONTROL first**. It is a fail-closed hard-abort gate: if it does not confirm an enforcing connection, **STOP — run no proof block below**.

```sql
-- SANITY CONTROL (run first) — HARD-ABORT GATE: prove RLS is enforced on this connection.
begin;
set local role authenticated;
select set_config('request.jwt.claims',
  json_build_object('sub', '<USER_A>', 'role', 'authenticated')::text, true);
select current_user;                                                     -- expected: authenticated (NOT postgres/service_role)
select (select rolbypassrls from pg_roles where rolname = current_user); -- expected: false
rollback;
```

> If `current_user` is not `authenticated`, or `rolbypassrls` is `true`, the connection BYPASSES RLS. **STOP.** Fix the connection or switch to Path B / Path C before trusting any isolation result. **A green isolation result on an unverified connection is a FAIL**, not a pass.

### 2.3 HARD RULE 2 — no row ever commits to live prod (guaranteed teardown)

- Every proof block is wrapped in `begin … rollback` (never `commit`). The naive "seed with `commit`, read in a new transaction, then delete the seed afterward" pattern is **FORBIDDEN** — a crash between seed and cleanup leaves residue in `ebxxqidacheyapmmzavr`.
- Equivalent acceptable forms: a disposable branch DB deleted afterward (Path C), or two transactional client sessions torn down on exit (Path B).
- **Final guard (run after the proof):** confirm the live tables are empty —

```sql
select count(*) from public.project_groups;            -- expected 0 (no leftover test rows)
select count(*) from public.project_group_memberships; -- expected 0
```

If either is non-zero, a block committed instead of rolling back — **STOP, delete the residue immediately, and re-run under the rollback/branch discipline.**

### 2.4 Discover fixtures (two distinct users + a real owned project)

```sql
-- Two distinct users and a project one of them owns (in a workspace they belong to).
select p.id as project_id, p.workspace_id, p.created_by as user_a
from public.projects p
limit 1;
-- A second, different user id:
select id as user_b from auth.users where id <> '<USER_A_FROM_ABOVE>' limit 1;
```

> If `projects` uses a different owner column than `created_by`, re-verify with `select column_name from information_schema.columns where table_schema='public' and table_name='projects' and column_name in ('created_by','owner_id','user_id');` and substitute the real owner column. RLS keys off `is_workspace_member(workspace_id)` + the membership `user_id`, so you still need a real project the user can reference for the composite FK.

### 2.5 The enumerated negative cases (the pass/fail gates)

Run each block as one rollback-wrapped transaction (Path A) or its Path-B/C equivalent.

**(NC-0) Anon select denied.** A non-authenticated role has no grant and no policy match:

```sql
begin;
set local role anon;
select count(*) from public.project_groups;            -- expected: ERROR  permission denied for table project_groups
rollback;
```

Expected: `permission denied` (grants were revoked from `anon`; `07` §2.4 / `08` Task 2 Step 5). If `anon` can select, the revoke/grant block is wrong — STOP.

**(NC-1) User A sees their own rows; user B sees ZERO of A's rows** (cross-user read isolation — the load-bearing gate). Seed under A's claims, assert A sees them, switch claims to B **in the same transaction**, assert B sees zero, then `rollback`:

```sql
begin;
set local role authenticated;

-- (A) seed under user A's claims
select set_config('request.jwt.claims',
  json_build_object('sub', '<USER_A>', 'role', 'authenticated')::text, true);
insert into public.project_groups (workspace_id, user_id, name, accent_id, position)
values ('<WORKSPACE_A>', '<USER_A>', 'Pipeline', 'teal', 0) returning id;       -- capture <GROUP_A_ID>
insert into public.project_group_memberships (group_id, workspace_id, user_id, project_id)
values ('<GROUP_A_ID>', '<WORKSPACE_A>', '<USER_A>', '<PROJECT_A>');
select count(*) as a_visible_groups  from public.project_groups;                 -- expected >= 1
select count(*) as a_visible_members from public.project_group_memberships;       -- expected >= 1

-- (B) switch claims to user B IN THE SAME TRANSACTION; B must see ZERO of A's rows
select set_config('request.jwt.claims',
  json_build_object('sub', '<USER_B>', 'role', 'authenticated')::text, true);
select count(*) as b_sees_a_group      from public.project_groups            where id = '<GROUP_A_ID>';       -- expected 0
select count(*) as b_sees_a_membership from public.project_group_memberships where group_id = '<GROUP_A_ID>'; -- expected 0

rollback;  -- discard the seed; nothing commits
```

Expected: A's counts `>= 1`, B's counts both `0`. **A non-zero B result is a security failure — STOP and fix the policy.**

**(NC-2) User A cannot read/insert into user B's groups/memberships** (the symmetric direction — same gate as NC-1 with roles swapped; covers both "A reads B" and "A inserts a group/membership impersonating B"):

```sql
begin;
set local role authenticated;
-- seed B's group under B's claims
select set_config('request.jwt.claims',
  json_build_object('sub', '<USER_B>', 'role', 'authenticated')::text, true);
insert into public.project_groups (workspace_id, user_id, name, position)
values ('<WORKSPACE_B>', '<USER_B>', 'B-Private', 0) returning id;               -- <GROUP_B_ID>

-- switch to A; A must NOT see B's group and MUST be blocked from inserting one as B
select set_config('request.jwt.claims',
  json_build_object('sub', '<USER_A>', 'role', 'authenticated')::text, true);
select count(*) as a_sees_b_group from public.project_groups where id = '<GROUP_B_ID>'; -- expected 0
insert into public.project_groups (workspace_id, user_id, name, position)
values ('<WORKSPACE_B>', '<USER_B>', 'Forged-as-B', 1);
-- expected: ERROR  new row violates row-level security policy for table "project_groups"
rollback;
```

Expected: `a_sees_b_group = 0` and the forged insert is **rejected by RLS** (the `with check` requires `user_id = (select auth.uid())`).

**(NC-3) Cross-user-group membership IDOR denied** (the LD-1 `exists()` backstop — `08` Task 2 Step 6 "Membership IDOR backstop"). B cannot insert a membership pointing at A's `group_id`, even with B's own `user_id`/`workspace_id`:

```sql
begin;
set local role authenticated;
-- seed A's group under A's claims
select set_config('request.jwt.claims',
  json_build_object('sub', '<USER_A>', 'role', 'authenticated')::text, true);
insert into public.project_groups (workspace_id, user_id, name, accent_id, position)
values ('<WORKSPACE_A>', '<USER_A>', 'Pipeline', 'teal', 0) returning id;        -- <GROUP_A_ID>

-- switch to B and forge a membership into A's group (B is a member of <WORKSPACE_A> for this probe,
-- or substitute a workspace B belongs to that also contains a project B can reference)
select set_config('request.jwt.claims',
  json_build_object('sub', '<USER_B>', 'role', 'authenticated')::text, true);
insert into public.project_group_memberships (group_id, workspace_id, user_id, project_id)
values ('<GROUP_A_ID>', '<WORKSPACE_A>', '<USER_B>', '<PROJECT_B>');
-- expected: ERROR  new row violates row-level security policy for table "project_group_memberships"
rollback;
```

Expected: **rejected by RLS** (the membership `with check` `exists(select 1 from public.project_groups g where g.id = group_id and g.user_id = (select auth.uid()))` fails because the group belongs to A). If it SUCCEEDS, the `exists()` backstop is missing — STOP and fix the policy (this is the canonical IDOR guard per LD-1 / `07` §2.3).

**(NC-4) Cross-workspace assignment denied** (the composite FK `(project_id, workspace_id) → projects(id, workspace_id)`). A membership whose `(project_id, workspace_id)` pair does not exist on `projects` is structurally rejected:

```sql
begin;
set local role authenticated;
select set_config('request.jwt.claims',
  json_build_object('sub', '<USER_A>', 'role', 'authenticated')::text, true);
insert into public.project_groups (workspace_id, user_id, name, position)
values ('<WORKSPACE_A>', '<USER_A>', 'Pipeline', 0) returning id;                -- <GROUP_A_ID>
-- forge a membership pairing PROJECT_A with a DIFFERENT workspace the project is not in:
insert into public.project_group_memberships (group_id, workspace_id, user_id, project_id)
values ('<GROUP_A_ID>', '<WORKSPACE_OTHER>', '<USER_A>', '<PROJECT_A>');
-- expected: ERROR  insert or update on table "project_group_memberships" violates foreign key
--           constraint "project_group_memberships_project_workspace_fkey"
rollback;
```

Expected: FK violation on `project_group_memberships_project_workspace_fkey` (cross-workspace assignment is structurally blocked; `02` §3 / `07` §2.2).

> The one-to-many uniqueness (`23505` on `project_group_memberships_unique_user_project`), case-insensitive name uniqueness (`23505` on `project_groups_user_workspace_lower_name_idx`), and delete-group cascade (D10) proofs in `08` Task 2 Step 6 are part of the same rollback-wrapped suite; they are correctness proofs (not isolation), kept in `08` because they back the Phase-2 `23505` mapping and the D10 cascade — run them in the same session.

### 2.6 Runbook pass gate

The RLS proof PASSES only when: the sanity control confirmed an enforcing connection (§2.2); NC-0…NC-4 all returned their expected denial/zero results; and the §2.3 final guard shows both live tables at count `0`. Record the result in the Phase-1 PR body (`08` Task 2 Step 8 / Task 4 Step 1).

---

## 3. Per-phase DOWN / revert + recovery

### 3.1 Phase 1 DOWN — drop the schema (FK order: memberships first)

Phase 1 is **additive-only to drop**: both tables are net-new and **no `projects` column was added** (D3), so removing the two tables (with their policies/grants) fully removes the feature's schema. The reused `projects_id_workspace_id_unique` constraint and the `workspaces`/`auth.users` parents are **NOT** this migration's to drop (`08` Task 4 Step 4).

**DOWN SQL (apply as a revert migration or via `apply_migration`; drop memberships BEFORE definitions to respect the `group_id` FK):**

```sql
-- Phase 1 DOWN — remove Project Groups schema. Drop the child (memberships) first:
-- project_group_memberships.group_id references project_groups(id), so definitions
-- cannot be dropped while memberships exist (unless CASCADE). Explicit order is safer.

drop policy if exists "project group memberships can be managed by owners and platform admins"
  on public.project_group_memberships;
drop policy if exists "project groups can be managed by owners and platform admins"
  on public.project_groups;

-- Grants disappear with the tables, but revoke explicitly for a clean audit trail:
revoke all on public.project_group_memberships from authenticated;
revoke all on public.project_groups from authenticated;

drop table if exists public.project_group_memberships;  -- CHILD first (group_id FK)
drop table if exists public.project_groups;             -- PARENT second
```

> If the two-policy split shipped instead of the consolidated single policy (per the `08` Task 1 Step 2 decision), drop all four policy names (owner + admin per table) before dropping the tables. `drop table` also removes the table's indexes, the functional unique name index, and the grants — but dropping policies/grants first keeps the revert legible.

**Recovery steps after the drop:**

1. **Regenerate `types.ts` once more** (the `Tables<"project_groups">` / `Tables<"project_group_memberships">` blocks disappear): `bun run gen:types` or the `generate_typescript_types` MCP tool, overwriting `src/lib/supabase/types.ts`.
2. **`bun run --cwd /Users/philiplewis/Documents/archestimator type-check` → exit 0.** It must stay green because **no app code consumed the new tables in Phase 1** (`08` Task 4 Step 4). If Phase 2/3 code already landed and referenced the tables, revert those phases FIRST (§3.2/§3.3) — a Phase-1 DOWN with Phase-2/3 code present will fail type-check at `.from("project_groups")`.
3. **Advisor-regression abort criteria (re-run `get_advisors` security + performance):** the WARN count must **return to the pre-Phase-1 baseline of 74 WARN / 0 ERROR**. If a finding lingers (e.g. an index the LD-8 step added but the DOWN missed), reconcile before declaring the revert complete. A post-drop advisor count *above* the pre-Phase-1 baseline means the drop was incomplete — STOP and finish it.

### 3.2 Phase 2 revert — server actions (low-risk, new-file removal)

Phase 2 ships a **new file** `src/lib/workshop/group-actions.ts` and a **new test** `tests/vitest/project-group-actions.test.ts` (`09` §"Tech Stack" / Task setup) — it edits no shared churning file. Revert = `git revert` the Phase-2 commits (or delete the two new files). No DB change to undo (the actions read/write the Phase-1 tables but add no schema). After revert:

- `bunx vitest run tests/vitest/project-group-actions.test.ts` no longer applies (file removed); the rest of the suite is unaffected because nothing imported `group-actions.ts` yet (Phase 4 is the first consumer).
- `bun run type-check` → exit 0.
- If Phase 4 already landed and imports the actions, revert Phase 4 FIRST (§3.3) or the import breaks. Phase 2 has no advisor/RLS impact (no DDL), so no advisor re-run is required.

### 3.3 Phase 3 additive revert — repository read + page wiring

> **This is the procedure `10` references BY NAME ("Phase 3 additive revert" / `15` §"Phase 3 additive revert").** Phase 3 is purely additive (two batched reads, one new exported type, one new field on the list-item types, one threaded prop), so its revert is the cleanest of the code phases: **no DB or data change to undo.** But `workspace-repository.ts` is a **hub with 29 importers** (`03-blast-radius-impact-analysis.md` §"`workspace-repository.ts` is a hub"; the `importers_of` query returns 29 — routes, repositories, actions, 3 tests), so the revert must be **as strictly additive-in-reverse as the forward change was**.

**Revert ONLY these items (the exact 7c forward edits, in `src/lib/repositories/workspace-repository.ts` unless noted):**

1. The **two appended `Promise.all` entries** — the `.from("project_groups").select("id, name, accent_id, position")…` read and the `.from("project_group_memberships").select("project_id, group_id")…` read (`10` Task 2.1) — and the **two trailing destructure names** `projectGroupsResult`, `projectGroupMembershipsResult`.
2. Their **two error guards**: `if (projectGroupsResult.error) throw projectGroupsResult.error;` and `if (projectGroupMembershipsResult.error) throw projectGroupMembershipsResult.error;` (`10` Task 2.2).
3. The **`projectGroups` / `groupIdByProjectId` derivations** — the `const projectGroups: ProjectGroupSummary[] = (projectGroupsResult.data ?? []).map(...)` and the `const groupIdByProjectId = new Map<string, string>(...)` blocks (`10` Task 2.3).
4. The **`groupId` stamp** in `createProjectListItem` — `groupId: groupIdByProjectId.get(project.id) ?? null,` — **and** the `groupId: null` default in `createPendingInviteProjectListItem` (`10` Task 3.2 / 3.3).
5. The **`projectGroups` return key** appended after `favoriteProjectIds` in the `listCurrentWorkspaceProjects` return object (`10` Task 3.4).
6. The **`ProjectGroupSummary` export** and the **`groupId: string | null` field** on the internal `WorkshopProjectListItem` type (`10` Task 1.2 / 3.1); in `src/components/workshop/projects-page-client.tsx`, the **`groupId?: string | null`** field on the exported `ProjectListItem`, the **`projectGroups?: ProjectGroupSummary[]`** prop on `ProjectsPageClientProps`, the `EMPTY_PROJECT_GROUPS` constant + destructure default, and the `ProjectGroupSummary` type import (`10` Task 3.5 / Task 5.1); in `src/app/workshop/projects/page.tsx`, the `projectGroups` destructure + the `projectGroups={projectGroups}` JSX prop (`10` Task 5.2).

**PRESERVE (never touch in the revert):** the existing `projects` and `favoriteProjectIds` return keys, the existing `WorkshopProjectListItem`/`ProjectListItem` keys, and the **positional destructuring order** of the `Promise.all` results (`projectsResult, favoritesResult, estimateFavoritesResult, projectMembersResult, sheetMembersResult, workspaceMembershipResult`). Reverting must drop the two trailing names without renumbering the leading six.

**Re-run the downstream-consumer suites after the revert** to confirm the 29 importers stay green:

```bash
bunx vitest run \
  tests/vitest/projects-page-card-layout.test.tsx \
  tests/vitest/projects-page-shared-access.test.tsx \
  tests/vitest/main-sidebar-favorites.test.tsx \
  tests/vitest/workshop-favorites-schema.test.ts \
  tests/vitest/reusable-sources-actions.test.ts \
  tests/vitest/component-library-actions-revalidation.test.ts \
  tests/vitest/project-source-insert-action.test.ts \
  && bun run type-check
```

(The new `tests/vitest/workshop-project-groups-repository.test.ts` is removed by the revert.) All must pass; `type-check` clean. Because Phase 3 added no DB/data, **no migration or advisor step is involved** in this revert. If Phase 4 already landed and reads `item.groupId` / `projectGroups`, revert Phase 4 FIRST (§3.4) or those reads break.

### 3.4 Phase 4 revert — `organizeBy`-gated, low-risk client revert

The Group feature is **behind the `organizeBy` organize control** (None / Date / Group; `07` §5.1). The "By group" mode, the Manage-groups popover, the kebab/bulk "Move to group" affordances, and the accent rendering are all reachable **only** when the user is in `organizeBy === "group"` — so reverting the Phase-4 client PR **removes the Group mode without any DB change**. The date/client/none modes (and their byte-identical DOM, `07` §5.6) remain because Phase 4 routed them through the same `ProjectGroupSection` but preserved every legacy data-attr.

**Revert = `git revert` the Phase-4 commits** (or remove the Phase-4 net-new files). The net-new files removed: `src/components/workshop/ProjectGroupSection.tsx`, `src/components/workshop/project-grid-layout.ts`, `src/lib/workshop/group-accent.ts`, and the new test files `tests/vitest/group-accent.test.ts`, `tests/vitest/project-group-section.test.tsx`, `tests/vitest/projects-page-organize-control.test.tsx`, `tests/vitest/projects-page-group-mode.test.tsx` (`11` Tasks 2–6). The edits to `projects-page-client.tsx` (the `organizeBy` control + persistence, `groupProjectsByUserGroup`, the optimistic `groupOverrides` + `useTransition`/`useEffect` clear per LD-6, the kebab/bulk affordances) and to `LiveProjectCard.tsx` (the details-action-menu "Move to group" item) revert with the PR.

**After the revert, the live date/client/sort suites must stay green** (they were byte-identical throughout):

```bash
bunx vitest run \
  tests/vitest/projects-page-sort-controls.test.tsx \
  tests/vitest/projects-page-card-layout.test.tsx \
  tests/vitest/projects-page-shared-access.test.tsx \
  tests/vitest/projects-page-view-mode.test.tsx \
  tests/vitest/projects-page-access-tabs.test.tsx \
  tests/vitest/bulk-destructive-preview-modal.test.tsx \
  tests/vitest/main-sidebar-favorites.test.tsx \
  && bun run type-check
```

All pass; `type-check` clean. Phase 4 added no DB/data, so **no migration/advisor/RLS step** is involved. Reverting Phase 4 leaves the Phase-1 tables, the Phase-2 actions, and the Phase-3 additive read in place — harmless, because with no Group UI nothing calls the actions and `item.groupId` is simply unread. This is the lowest-blast-radius revert of the four (the feature is gated behind a control the revert removes), so it is the **first** phase to revert if you are unwinding the whole feature top-down (4 → 3 → 2 → 1).

### 3.5 Full feature teardown order

To remove Project Groups entirely, revert **top-down so each phase's consumers are gone before its producers**: **Phase 4 (§3.4) → Phase 3 (§3.3) → Phase 2 (§3.2) → Phase 1 (§3.1)**. The reverse of the build order `7a→7b→7c→7d`. Each step's `type-check` must stay green before the next; the Phase-1 DOWN is last because its tables back everything above.

---

## 4. Per-phase Definition-of-Done

Each phase is **Done** only when **all** its criteria pass — verified, not asserted.

### 4.1 Phase 1 (Part 7a — DB + Types) DoD

- [ ] Migration applied to `ebxxqidacheyapmmzavr` with a timestamp **strictly later** than `20260616120000` and any concurrent `20260616*`/`20260617*` file (§1.1), recorded as the top `supabase_migrations.schema_migrations` row.
- [ ] Structural probes pass (`08` Task 2 Steps 2–5): both tables + exact columns (`accent_id text` **nullable**, `position integer not null default 0`), single-column `group_id → project_groups(id) on delete cascade` FK (LD-1), `workspaces(id) on delete cascade` FK on **both** tables (LD-7), composite `(project_id, workspace_id) → projects(id, workspace_id)` FK, functional unique `project_groups_user_workspace_lower_name_idx`, `unique(user_id, project_id)`, RLS enabled, grants `select,insert,update,delete` on `project_groups` and `select,insert,delete` (NO update) on `project_group_memberships`, no `anon`/`public` privileges, no `group_id` column on `projects`, no DB name-length check (LD-8).
- [ ] **Advisor-regression gate (§1.3):** `get_advisors` security + performance show **0 new ERROR** and WARN **≤ 74 baseline**; before/after counts recorded in the PR body.
- [ ] **§2 RLS-isolation proof passes:** sanity control confirms an enforcing connection; NC-0…NC-4 all return their expected denial/zero results; the §2.3 final guard shows both live tables at count `0` (nothing committed).
- [ ] `src/lib/supabase/types.ts` regenerated **once** after all pending migrations; contains `Tables<"project_groups">` + `Tables<"project_group_memberships">` with the expected shapes; `Tables<"projects">` **byte-identical** (no `group_id`).
- [ ] `bun run type-check` → exit 0; `gen:types` script present in `package.json`; types + script committed alongside the migration.
- [ ] `git status` shows **only** the migration file, `src/lib/supabase/types.ts`, and `package.json` — no edits to `projects-page-client.tsx`, `workspace-repository.ts`, `LiveProjectCard.tsx`, `ProjectDetailsModal.tsx`, or any `projects-page-*` test (`08` Task 4 Step 1).

### 4.2 Phase 2 (Part 7b — Server actions) DoD

- [ ] `src/lib/workshop/group-actions.ts` exists with `"use server"`, the seven actions (`createProjectGroup`, `renameProjectGroup`, `recolorProjectGroup`, `deleteProjectGroup`, `reorderProjectGroups`, `moveProjectToGroup`, `bulkAssignProjectsToGroup`) matching the `07` §4 signatures verbatim, including `bulkAssignProjectsToGroup`'s **typed `{ movedProjectIds, skippedProjectIds }` result (LD-11)**.
- [ ] The assignment ownership gate uses the **LD-2 repository-`owned` predicate** (`workspace_id === workspace.id && (Boolean(workspaceRole) || created_by === profile.id)`, handling nullable `created_by`) — **not** bare `.eq("created_by", profile.id)` — with negative tests for an owned-via-workspace-role project and an owned project with `created_by IS NULL`, both assignable (`07` §4.6/§4.7; `09` Task / Appendix A).
- [ ] Caps enforced app-layer: `createProjectGroup` rejects `>= 50` groups (`ProjectGroupCapError`) and empty/`>40`-char names (`ProjectGroupNameError`); duplicate-name `23505` (from `project_groups_user_workspace_lower_name_idx`) maps to `ProjectGroupNameError`, distinguished from the membership `(user_id, project_id)` `23505` (`07` §2.5 / §4; `08` Task 4 Step 2 confirmed constraint names).
- [ ] `bunx vitest run tests/vitest/project-group-actions.test.ts` fully green; `bun run type-check` → exit 0.
- [ ] New file only — no edit to a shared churning file; no DB/advisor impact.

### 4.3 Phase 3 (Part 7c — Repository + page) DoD

- [ ] `ProjectGroupSummary` exported from `workspace-repository.ts` exactly per `07` §3.1 (camelCase `id`, `name`, `accentId`, `position`); the client imports it, never redefines it.
- [ ] The two per-user reads live in the **single `listCurrentWorkspaceProjects` `Promise.all`** (no N+1, no new serial await), scoped `.eq("user_id", profile.id)`; `groupId` stamped on every list item; `projectGroups` returned **additively** after `favoriteProjectIds`; `projects`/`favoriteProjectIds` keys and the positional destructure order unchanged.
- [ ] `groupId` resolves to `null` for shared / non-owned list items (per-user scoping + `?? null`), pinned by the `"resolves groupId to null for shared / non-owned list items"` test — no cross-user group leak.
- [ ] `bunx vitest run tests/vitest/workshop-project-groups-repository.test.ts` fully green; the downstream-consumer suites (`projects-page-card-layout`, `projects-page-shared-access`, `main-sidebar-favorites`, `workshop-favorites-schema`, `reusable-sources-actions`, `component-library-actions-revalidation`, `project-source-insert-action`) all green (29-importer hub unaffected); `bun run type-check` → exit 0.
- [ ] No UI / `organizeBy` / override map / accent code in this phase (those are Phase 4); the `page.tsx` change is one destructure line + one JSX prop mirroring `favoriteProjectIds` (`10` Done-criteria).

### 4.4 Phase 4 (Part 7d — Client UI + tests) DoD

- [ ] **Date/client/sort byte-identity preserved:** all live suites green — `tests/vitest/projects-page-sort-controls.test.tsx`, `tests/vitest/projects-page-card-layout.test.tsx`, `tests/vitest/projects-page-shared-access.test.tsx`, `tests/vitest/projects-page-view-mode.test.tsx`, `tests/vitest/projects-page-access-tabs.test.tsx`, `tests/vitest/bulk-destructive-preview-modal.test.tsx`, `tests/vitest/main-sidebar-favorites.test.tsx` (the legacy date/client DOM anchors of `07` §5.6 survive verbatim through `ProjectGroupSection`).
- [ ] New group suites green: `tests/vitest/group-accent.test.ts` (palette purity + `resolveAccent`), `tests/vitest/project-group-section.test.tsx`, `tests/vitest/projects-page-organize-control.test.tsx` (organize switching, Q1 default, Shared coercion/disable), `tests/vitest/projects-page-group-mode.test.tsx` (group rendering, Ungrouped, empty named groups, search hiding, dangling-id defense).
- [ ] **Accents ship in v1 (LD-4):** `group-accent.ts` exposes the canonical `GroupAccentSwatch { id; label; ruleColor; dotColor }`, `GROUP_ACCENT_SWATCHES` (the 8 locked hues `slate/stone/sage/teal/indigo/plum/rose/clay`), `DEFAULT_GROUP_ACCENT` id `neutral`, `resolveAccent`, `isGroupAccentColor`; colors inline-style only, never on text (labels stay `text-secondary` #5D5D5D for AA), explicitly non-brand-orange.
- [ ] **D9 realized (LD-5):** the bulk "Move to group" affordance reads the assignment-specific `canAssignProjectToGroup`-gated selection (NOT delete-gated `selectedVisibleProjectIds`), with a test that an owned project blocked from delete by an active shared link is still selectable for and successfully bulk-assigned.
- [ ] **D14 corrected (LD-6):** optimistic `groupOverrides` cleared via `useTransition` + `useEffect` once SSR is authoritative (no `.then()` on the non-awaitable `router.refresh()`), with the interleaving test (a rapid re-assign during a pending refresh must not flicker to stale SSR); bulk path keys clear/rollback off the LD-11 `{ movedProjectIds, skippedProjectIds }` result and toasts on skips.
- [ ] **LD-10 UI reuse:** Manage-groups popover built on `DropdownPopupPanel`/`useDropdownPopup` (Escape/outside-click/focus-trap); accents use `rounded-xs` (never `rounded-full`); current-group "checked" indicator via `DropdownMenu.Item selected`; `ui/` primitive buttons; all-groups-empty-during-search fallback.
- [ ] Zero-groups Group-mode empty state implemented + tested (P0-1).
- [ ] `bun run type-check` → exit 0; the kebab affordance attaches to the `LiveProjectCard` details-action menu (NOT the C3 hover overlay), built once.

---

## 5. Cross-references

| Need | Doc |
|---|---|
| Canonical DB/types contract (DDL, RLS, grants, palette, action signatures) | [`07-implementation-plan-overview-and-contracts.md`](./07-implementation-plan-overview-and-contracts.md) |
| Phase-1 migration tasks + the RLS-assertion contract this doc satisfies | [`08-plan-phase-1-db-and-types.md`](./08-plan-phase-1-db-and-types.md) |
| Phase-2 server-action tasks (ownership gate, caps, typed bulk result) | [`09-plan-phase-2-server-actions.md`](./09-plan-phase-2-server-actions.md) |
| Phase-3 additive repository read; references this doc's "Phase 3 additive revert" | [`10-plan-phase-3-repository-and-page.md`](./10-plan-phase-3-repository-and-page.md) |
| Phase-4 client UI + full test matrix | [`11-plan-phase-4-client-ui-and-tests.md`](./11-plan-phase-4-client-ui-and-tests.md) |
| Canonical DB lane + provider verification (references this doc's RLS proof) | [`02-database-supabase-analysis.md`](./02-database-supabase-analysis.md) |
| 29-importer hub blast radius for the Phase-3 revert | [`03-blast-radius-impact-analysis.md`](./03-blast-radius-impact-analysis.md) |
| Sequencing relative to C1/C2/C3 + build order | [`00-synthesis-and-decisions.md`](./00-synthesis-and-decisions.md) §6 |
| Requirement→task→test traceability + security-control sub-matrix | [`13-requirements-traceability-and-qa-matrix.md`](./13-requirements-traceability-and-qa-matrix.md) |
| Single-worker entry point, validation commands, STOP conditions, contract index | [`14-implementer-handoff-and-runbook.md`](./14-implementer-handoff-and-runbook.md) |
| Executable master guide (capstone) | [`16-MASTER-IMPLEMENTATION-GUIDE.md`](./16-MASTER-IMPLEMENTATION-GUIDE.md) |
| Locked decisions LD-1…LD-15 | [`_improvement-campaign-2026-06-16/01-AUDIT-FINDINGS-SCORES-AND-LOCKED-DECISIONS.md`](./_improvement-campaign-2026-06-16/01-AUDIT-FINDINGS-SCORES-AND-LOCKED-DECISIONS.md) |
