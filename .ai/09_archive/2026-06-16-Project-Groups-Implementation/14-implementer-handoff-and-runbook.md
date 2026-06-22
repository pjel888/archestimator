# Project Groups — Implementer Handoff & Runbook

**Plan pack:** `2026-06-16-Project-Groups-Implementation`
**Role:** Single-worker handoff / runbook — the **1-page orientation** an implementer reads before touching anything.
**Date:** 2026-06-16
**Status:** Readiness handoff (NOT implementation). No app source, migrations, or DB mutations are produced by this document.

> **This is the orientation, not the executable plan.** The deep, task-by-task executable plan is
> [`16-MASTER-IMPLEMENTATION-GUIDE.md`](./16-MASTER-IMPLEMENTATION-GUIDE.md) (the capstone), backed by the four phase
> docs [`08`](./08-plan-phase-1-db-and-types.md)–[`11`](./11-plan-phase-4-client-ui-and-tests.md). This runbook tells you
> where to start, what is in/out of scope, the order you must follow, the security bar you must clear, the exact
> commands that prove the work, when to STOP, and where every shared name lives. Read it once, then execute from `16`
> (and the phase docs it references).

---

## 1. Entry point & how to use this pack

You are implementing **Project Groups** for Archestimator `/workshop/projects`: a per-user, named, ordered,
color-accented organization layer rendered through the existing horizontal-flag treatment, as a third **`organizeBy`**
mode (None / Date / Group). Do **not** implement from memory or stale line numbers. Read, in this order, then execute:

1. [`00-synthesis-and-decisions.md`](./00-synthesis-and-decisions.md) — canonical decisions **D1–D16** + owner answers **Q1–Q4**, the merged risk register, the build sequence (§6).
2. [`07-implementation-plan-overview-and-contracts.md`](./07-implementation-plan-overview-and-contracts.md) — the **contracts spine**: authoritative for every shared name, type, signature, DOM anchor, storage key, and migration shape. **Where any doc conflicts, `00` (decisions) then `07` (contracts) win.**
3. [`16-MASTER-IMPLEMENTATION-GUIDE.md`](./16-MASTER-IMPLEMENTATION-GUIDE.md) — **the executable plan** you actually run. It binds verbatim to `07` and references `08`–`11` for task detail.
4. The phase docs — [`08`](./08-plan-phase-1-db-and-types.md) (DB+types), [`09`](./09-plan-phase-2-server-actions.md) (server actions), [`10`](./10-plan-phase-3-repository-and-page.md) (repository+page), [`11`](./11-plan-phase-4-client-ui-and-tests.md) (client UI+tests) — for the bite-sized TDD steps.
5. [`13-requirements-traceability-and-qa-matrix.md`](./13-requirements-traceability-and-qa-matrix.md) — requirement → task → test coverage; use it to confirm nothing is unbuilt.
6. [`15-deploy-rollback-recovery-and-dod.md`](./15-deploy-rollback-recovery-and-dod.md) — migration apply order, per-phase DOWN/revert, the **LD-9 RLS-proof runbook**, per-phase Definition-of-Done.
7. The **live source files** and current `git status` — re-read before every shared-file edit (the contracts spine and lane docs may quote behavior that has drifted; cite **behavior**, never line numbers).

The adversarial-review record is [`12-adversarial-review.md`](./12-adversarial-review.md); its former FIX@IMPL items are now integrated into `08`–`11` as built tasks (LD-8). The lane analyses [`01`](./01-product-spec-and-ux-flows.md)–[`06`](./06-prior-art-and-concurrency-watch.md) are subordinate to `00`/`07`.

---

## 2. Binding scope — DO / DO NOT

**DO (v1):**

- **Per-user, workspace-scoped groups on `Your Projects` only.** Cloned end-to-end from the shipped Favorites feature.
- **Two new tables:** `public.project_groups` (definitions) + `public.project_group_memberships` (per-user join, one-to-many).
- **One-to-many membership** — a project is in at most one group, enforced by `unique(user_id, project_id)` (D1).
- **Explicit `organizeBy` dimension** (None / Date / Group) as a toolbar `DropdownSelect`, decoupled from the sort field (D4); Sort stays visible in all modes.
- **One reusable `ProjectGroupSection`** renders date, client, AND user grouping; date/client modes stay byte-identical (D6).
- **Assignment via card kebab "Move to group" + bulk dock "Move to group"** only (D8, Q4).
- **A virtual, always-trailing "Ungrouped" bucket** (D12).
- **ACCENTS SHIP IN v1 (D13 / Q3 owner override).** v1 includes the `group-accent.ts` 8-swatch palette, accent **selection** UI in the Manage-groups popover, AND accent **rendering** (3px left rule + 6px dot, inline-style only) in `ProjectGroupSection`. The `accent_id` token column is populated from day one.
- **Manage-groups popover** (create / rename / recolor / delete / reorder + at-limit message), built on the shared `DropdownPopupPanel` (LD-10).
- **Optimistic mutations** with the **clear-once-SSR-authoritative** override pattern (D14 / LD-6) and a failure toast (D13/risk-13).
- **Caps soft-enforced in the app/server layer:** 50 groups/user, 40-char names (Q2). **No DB check/length constraint.**

**DO NOT (v1):**

- **Do NOT add a `group_id` column to `public.projects`** (D3 — would change `Tables<"projects">` pervasively).
- **Do NOT create shared/workspace groups, or group SHARED/invited projects** — `Your Projects` only; disable "By group" on the Shared tab with a tooltip and coerce away from `group` (D11).
- **Do NOT route group membership through `updateProjectDetails`**, and **do NOT add a `ProjectDetailsModal` group field** in v1 (fast-follow, Q4).
- **Do NOT use `BulkDestructivePreviewModal` / `bulk-action.ts` for group delete** — a group delete is non-destructive; use a lightweight inline confirm (D10). `tests/vitest/bulk-destructive-preview-modal.test.tsx` must stay untouched and green.
- **Do NOT build tags / many-to-many groups** (that is a future Tags feature, D1).
- **Do NOT put groups in the main sidebar** in v1 (favorites own that rail — leave `MainSidebar.tsx` / `sidebar-types.ts` alone, D16).
- **Do NOT ship a colorless v1, and do NOT defer the color picker as a fast-follow.** This corrects the SUPERSEDED alt-pass handoff, which listed "Color picker UI" as fast-follow — that is WRONG now. **Accents are a v1 deliverable.**
- **Do NOT add a DB `CHECK`/length constraint for caps** — they are app-layer only; the `02` `project_groups_name_check` is NOT shipped (LD-8).

---

## 3. Preconditions & sequencing gate

**Land C1/C2/C3 first.** The repo is dirty on `codex/fix-project-delete` with three in-flight efforts mid-edit in the
exact files Groups needs most. Do NOT start Groups against the dirty tree (`00` §6.1, `06` §C, `03` §5).

1. **C1 — Sidebar Favorite Projects & Estimates** — owns `workspace-repository.ts` (`listMainSidebarFavoriteProjects`), `MainSidebar.tsx`, `sidebar-types.ts`, `WorkshopPageShell.tsx`. Freezes the `MainSidebarProps` shape + the `cache()`-reader convention.
2. **C2 — Delete-Project Modal UX** (`docs/plans/2026-06-16-003-delete-project-modal-ux-plan.md`) — owns `BulkDestructivePreviewModal.tsx` copy + the `bulk-action.ts` `targetType`/`executeLabel` contract + the `projects-page-client.tsx` delete strings. Freezes the no-checker-language test contract.
3. **C3 — Project Card Favorite Sheet Links** — owns the `LiveProjectCard.tsx` hover overlay + date band. Freezes the card's internal layout.

**Rebase-before-edit discipline (every phase, before touching a shared file — `07` §6.4, `06` §E):**

- `git fetch && git status` — confirm C1/C2/C3 have merged for the files they own.
- `git diff <file>` and **re-read the live file**; cite behavior, never line numbers.
- Prefer NEW files (`ProjectGroupSection.tsx`, `project-grid-layout.ts`, `group-accent.ts`, `group-actions.ts`, `group-constants.ts`, new test files) over editing churning shared files where behavior allows.
- Repository/type edits land in ONE owned diff (Part 7c) — never reorder/rename existing `WorkshopProjectListItem`/`ProjectListItem` keys; only append `groupId`.
- After any merge, re-run the Phase-4 regression sweep (§6) + `bun run type-check`. Commit frequently with conventional messages.

**Strict phase order: `7a → 7b → 7c → 7d` (`07` §6).** This is non-negotiable:

- **7a** lands the migration + regenerated `types.ts` first — **7b cannot type-check** until `Tables<"project_groups">`/`Tables<"project_group_memberships">` exist.
- **7b** and **7c** both depend only on 7a's types and may be authored in parallel, **but 7d depends on both**.
- **7d** is a single focused PR (the renderer generalization + the new Group mode together) so the RTL date/client anchors are touched exactly once.

---

## 4. Per-phase one-liner (what each delivers + which doc owns it)

| Phase | Part | Owner doc | Delivers |
|---|---|---|---|
| **1** | 7a — DB + Types | [`08`](./08-plan-phase-1-db-and-types.md) | The `20260617090000_project_groups.sql` migration (two tables, per-user RLS + the LD-1 `exists()` IDOR backstop, composite + `workspaces(id)` FKs per LD-7, functional unique name index, `UPDATE` grant on definitions); applied to `ebxxqidacheyapmmzavr`; advisor baseline unchanged (74 WARN / 0 ERROR); regenerated `src/lib/supabase/types.ts`; `gen:types` npm script. RLS isolation proved per the LD-9 runbook in `15`. No app source touched. |
| **2** | 7b — Server actions | [`09`](./09-plan-phase-2-server-actions.md) | New `src/lib/workshop/group-actions.ts` (`"use server"`) with the seven actions, the shared `group-constants.ts` caps module, the LD-2 owned-predicate assign gate (`verifyOwnedProjectIds`), constraint-disambiguated `23505` → `ProjectGroupNameError`, accent allowlist, `reorderProjectGroups` fan-out cap, and the LD-11 typed `bulkAssignProjectsToGroup` result. New test `tests/vitest/project-group-actions.test.ts`. Touches no UI suite. |
| **3** | 7c — Repository + page | [`10`](./10-plan-phase-3-repository-and-page.md) | Additive `project_groups` + `project_group_memberships` reads in the `listCurrentWorkspaceProjects` `Promise.all`; the exported `ProjectGroupSummary` type; `groupId` on both `WorkshopProjectListItem` and client `ProjectListItem` (one owned diff); `projectGroups` returned and threaded through `page.tsx`. New test `tests/vitest/workshop-project-groups-repository.test.ts`. |
| **4** | 7d — Client UI + tests | [`11`](./11-plan-phase-4-client-ui-and-tests.md) | `group-accent.ts`, `project-grid-layout.ts`, `ProjectGroupSection.tsx`, the `organizeBy` control + persistence (Q1 default + Shared coercion), `groupProjectsByUserGroup`, the zero-groups empty state, Manage-groups popover, optimistic assignment (LD-6 reconciliation effect), card kebab + bulk dock, accents rendered. New tests `project-group-section.test.tsx`, `projects-page-organize-control.test.tsx`, `projects-page-group-mode.test.tsx`, `group-accent.test.ts`. All existing `projects-page-*` + `bulk-destructive-preview-modal` suites stay byte-identical-green. |

---

## 5. Security contract (do NOT claim RLS complete from TS tests alone)

Every group action MUST be scoped by **all three**:

1. **Current authenticated user** — `ensureDefaultWorkspace()` → `{ workspace, profile }`; `profile.id` is the `user_id`, `workspace.id` is the `workspace_id`. Mutations are `.eq("user_id", profile.id).eq("workspace_id", workspace.id)`-scoped (mirrors `setProjectFavorite`).
2. **Current default workspace** — every row carries `workspace_id`; reads/writes pin it.
3. **The LD-2 owned predicate (binding for the D9 assign gate)** — a project is assignable when it matches the repository's `owned` derivation, **NOT** a bare `created_by` check: `project.workspace_id === workspace.id && (Boolean(workspaceRole) || project.created_by === profile.id)`. `created_by` is **nullable** (`ON DELETE SET NULL`), so the gate MUST honor a workspace-role-owned project whose `created_by` is `NULL`. Implemented via `verifyOwnedProjectIds` (`09` §1.5). The assign gate is **separate from `canSelectProjectForDeletion`** (LD-5 / D9) — an owned project blocked from delete by an active shared link must still be groupable.

**RLS layers (two-layer defense — LD-1):**

- Per-user `FOR ALL` policy on both tables: `is_platform_admin() OR ((user_id = (select auth.uid())) AND is_workspace_member(workspace_id))`, matching the live consolidated `project_favorites` convention (re-verify packaging at apply time per `08` Task 1 Step 2).
- The membership-insert `with check` adds the **IDOR backstop** `exists(select 1 from public.project_groups g where g.id = group_id and g.user_id = (select auth.uid()))` — **this is in the migration** and is canonical; it is NOT merely noted/accepted at the action layer. The FK alone only proves the group exists; the `exists()` proves it is the caller's.

**Provider proof requirements (DB phases — do NOT claim RLS complete from local TypeScript/RTL tests alone):**

- **Anon denial** — `anon`/`public` have **zero** privileges on either table (`08` Task 2 Step 5).
- **Cross-user denial** — under a genuine RLS-enforcing role (`set local role authenticated` + JWT claims, two real sessions, or a disposable branch DB), user B sees **0** of user A's groups/memberships (`08` Task 2 Step 6; LD-9 runbook in `15`). A **sanity-control hard-abort gate** (`current_user = authenticated`, `rolbypassrls = false`) MUST pass before any 0-result is trusted — a BYPASSRLS connection passes vacuously and is treated as a FAIL.
- **Shared/cross-user-group (IDOR) denial** — user B cannot insert a membership pointing at user A's `group_id` (rejected by the `exists()` backstop, `08` Task 2 Step 6).
- **No live-prod pollution** — every proof block is `begin … rollback` (or runs on a disposable branch DB); final guard confirms both tables are empty after the proof.
- **Advisor gate** — `get_advisors` (security + performance) shows no new ERROR and WARN not above the 74 baseline; add a `user_id`-leading index ONLY if the advisor flags it (LD-8).
- **Generated types** — `Tables<"project_groups">`/`Tables<"project_group_memberships">` present; `Tables<"projects">` unchanged (no `group_id`); `bun run type-check` exit 0.

---

## 6. Consolidated validation command block

Run the **narrowest** proof for the phase you are in first, then broaden when the touched surface warrants it. All paths are repo-relative to `/Users/philiplewis/Documents/archestimator`.

**Phase 1 (7a) — DB + types.** No Vitest harness for migrations; proof is SQL verification (`08` Task 2), the advisor gate, and:

```bash
bun run type-check          # proves regenerated types.ts compiles against the unchanged app
git diff --check            # no whitespace/conflict markers
```

**Phase 2 (7b) — server actions:**

```bash
bunx vitest run tests/vitest/project-group-actions.test.ts
bun run type-check
git diff --check
```

**Phase 3 (7c) — repository + page:**

```bash
bunx vitest run \
  tests/vitest/workshop-project-groups-repository.test.ts \
  tests/vitest/projects-page-card-layout.test.tsx \
  tests/vitest/projects-page-shared-access.test.tsx \
  tests/vitest/main-sidebar-favorites.test.tsx \
  tests/vitest/workshop-favorites-schema.test.ts
bun run type-check
git diff --check
```

**Phase 4 (7d) — client UI + the full regression sweep (the critical date/client byte-identical gate):**

```bash
bunx vitest run \
  tests/vitest/group-accent.test.ts \
  tests/vitest/project-group-section.test.tsx \
  tests/vitest/projects-page-organize-control.test.tsx \
  tests/vitest/projects-page-group-mode.test.tsx \
  tests/vitest/projects-page-sort-controls.test.tsx \
  tests/vitest/projects-page-card-layout.test.tsx \
  tests/vitest/projects-page-shared-access.test.tsx \
  tests/vitest/projects-page-view-mode.test.tsx \
  tests/vitest/projects-page-access-tabs.test.tsx \
  tests/vitest/bulk-destructive-preview-modal.test.tsx \
  tests/vitest/main-sidebar-favorites.test.tsx
bun run type-check
git diff --check
```

**Broaden only when warranted.** Run `bun run validate` or `bun run build` when the diff touches generated Supabase
types, shared auth/security paths, repository contracts beyond additive fields, or release packaging (`06` §D testing
bias). DB phases additionally require `get_advisors` (security + performance) on `ebxxqidacheyapmmzavr` and the LD-9
RLS-isolation proof — these are NOT replaceable by TS tests (§5).

---

## 7. STOP / escalate conditions

STOP and escalate (do not absorb the problem silently) when:

- **`type-check` is already red on the untouched tree** before you regenerate `types.ts` — a pre-existing type error is not yours to absorb (`08` §0.5).
- **A `project_group*` schema already exists** (`08` Task 1 Step 1 returns rows) — the plan must be reconciled, not blindly applied.
- **Phase 2 starts but `types.ts` has no `project_groups`/`project_group_memberships`** — 7a is incomplete; finish it first (`09` §1).
- **The RLS sanity control fails** (`current_user` ≠ `authenticated`, or `rolbypassrls = true`) — do NOT trust any 0-result; switch to the branch-DB / two-session path in `15` (`08` Task 2 Step 6).
- **The cross-user RLS read returns non-zero for user B**, or the IDOR forge insert SUCCEEDS — a security failure; fix the policy before proceeding.
- **The advisor WARN count rose above 74, or any new ERROR appears** — identify and reconcile the exact finding before proceeding.
- **Any existing `projects-page-*` date/client DOM anchor breaks** (§9 contract index, `07` §5.6) — the renderer generalization regressed the byte-identical contract; revert and re-approach via `legacySectionDataAttr`/`legacyHeaderDataAttr`.
- **C1/C2/C3 have not landed** for the files they own and you have not been explicitly told to proceed on the current branch — do not build Groups on the dirty tree.
- **`00`/`07` and a lane doc (`01`–`06`) or `12` disagree** on a contract — `00` then `07` win; if the spine itself looks wrong, escalate the mechanism choice rather than silently diverging (campaign coordination §3/§5).

---

## 8. v1 non-goals (fast-follow, NOT shipped now)

- `ProjectDetailsModal` group field (Q4 fast-follow).
- Drag-onto-flag assignment (D8 deferred; always behind the menu equivalent).
- Group reorder via DnD if the estimate-tree DnD primitive is not cheaply reusable (else `position`-based reorder ships).
- Collapse-state persistence (collapse is local `useState` in v1, D15).
- Groups in the main sidebar (D16).
- Shared-project groups / many-to-many tags (D11, D1).

> **NOT a non-goal:** color accents. Accents SHIP IN v1 (D13/Q3). The superseded alt-pass handoff that listed the
> "Color picker UI" as fast-follow is corrected here.

---

## 9. Contract index (where each shared name/type/signature/DOM-anchor/storage-key lives)

The contracts spine [`07`](./07-implementation-plan-overview-and-contracts.md) is authoritative. Use this index to find
the owning section; copy the contract verbatim — never redefine or drift a shared shape.

| Contract | Owning doc / section | Notes |
|---|---|---|
| **Migration** `20260617090000_project_groups.sql` (two tables, FKs, RLS, grants, indexes) | `07` §2 / `08` Task 1 | Timestamp re-confirmed at apply time; `workspaces(id)` FK on both tables (LD-7); single-column `group_id` FK + RLS `exists()` backstop (LD-1). |
| **RLS policy + IDOR backstop** | `07` §2.3 / `08` Task 1 Step 3 | `exists()` membership backstop is in the migration (LD-1). |
| **Grants** (`UPDATE` on definitions only) | `07` §2.4 / `08` Task 2 Step 5 | Memberships get `select, insert, delete` — NO `UPDATE`. |
| **Caps** `MAX_PROJECT_GROUPS` / `MAX_PROJECT_GROUP_NAME_LENGTH` / `MAX_BULK_ASSIGN_PROJECTS` | `09` §2.0 (`src/lib/workshop/group-constants.ts`) | Single source of truth; Phase-4 popover imports from here (no local re-declare). |
| **`ProjectGroupSummary`** `{ id; name; accentId: string \| null; position }` | `07` §3.1 (`src/lib/repositories/workspace-repository.ts`) | Exported from the repository; client imports it, never redefines (drift anti-pattern). No timestamps/userId/workspaceId. |
| **`groupId` additive field** on `WorkshopProjectListItem` (`groupId: string \| null`) + client `ProjectListItem` (`groupId?: string \| null`) | `07` §3.2 / `10` Task 3 | One owned diff (Part 7c); append only, never reorder existing keys. |
| **`group-actions.ts` signatures** (`createProjectGroup`, `renameProjectGroup`, `recolorProjectGroup`, `deleteProjectGroup`, `reorderProjectGroups`, `moveProjectToGroup`, `bulkAssignProjectsToGroup`) | `07` §4 (`src/lib/workshop/group-actions.ts`) | `bulkAssignProjectsToGroup` returns `{ movedProjectIds: string[]; skippedProjectIds: string[] }` (LD-11, `07` §4.7). |
| **LD-2 owned predicate / assign gate** (`verifyOwnedProjectIds`, `resolveWorkspaceRole`) | `07` §4.6 / `09` §1.5 | Mirrors the repository `owned` derivation; handles nullable `created_by`; separate from delete gate (LD-5). |
| **Typed errors** `ProjectGroupCapError`, `ProjectGroupNameError` + `23505` disambiguation | `07` §4 / `09` §2 | Name-index `23505` → `ProjectGroupNameError`; membership `unique(user_id, project_id)` `23505` resolved by `onConflict`. |
| **`organizeBy` union** `ProjectOrganizeBy = "none" \| "date" \| "group"` | `07` §3.3 / §5.1 (`projects-page-client.tsx`) | Q1 default rule + decoupling from `isDateSortField` in `07` §5.1; `11` Task 4. |
| **Storage key / event** `PROJECT_ORGANIZE_BY_STORAGE_KEY = "archestimator_projects_organize_by_v1"`, `PROJECT_ORGANIZE_BY_CHANGE_EVENT = "archestimator:projects-organize-by-change"` | `07` §5.1 / `11` Task 4.1 | Clones the `PROJECT_VIEW_MODE_STORAGE_KEY` `useSyncExternalStore` machinery. |
| **`ProjectGroupSection` props** (`ProjectGroupSectionProps`, `ProjectGroupSectionGroup`) | `07` §5.2 (`src/components/workshop/ProjectGroupSection.tsx`) / `11` Task 3 | `legacyHeaderDataAttr` / `legacySectionDataAttr` keep date/client byte-identical. |
| **`groupProjectsByUserGroup`** bucketing util | `07` §5.3 / `11` Task 5.2 | Ungrouped key `"__ungrouped__"`, pinned last, dangling-id defensive (D12). |
| **`group-accent.ts` palette** (`GroupAccentId`, `GroupAccentSwatch`, `GROUP_ACCENT_SWATCHES` (8: slate/stone/sage/teal/indigo/plum/rose/clay), `DEFAULT_GROUP_ACCENT` id `neutral`, `resolveAccent`, `isGroupAccentColor`) | `07` §5.4 (`src/lib/workshop/group-accent.ts`) / `11` Task 1 | Locked hexes (LD-4); inline-style only, never on text; non-brand-orange. Tested by `tests/vitest/group-accent.test.ts`. |
| **Optimistic override (D14/LD-6)** `groupOverrides` + `useTransition` `startGroupRefresh` + clear-once-SSR-authoritative `useEffect` | `07` §5.5 / `11` Task 6.1 | `router.refresh()` is non-awaitable (returns `void`) — NO `.then()`; clear in a `useEffect` once SSR reflects the move. |
| **D9 bulk selection source** `selectableForAssignmentProjectIds` / `canAssignProjectToGroup` | `07` §5.5 / `11` Task 6.2 | NOT the delete-gated `selectedVisibleProjectIds` (LD-5). |
| **Preserved DOM anchors** (`aria-label="Live projects"`, `data-project-view-mode`, `data-project-date-group`, `data-project-date-group-label`, `data-project-group-label`, `data-project-client-group`, combobox `aria-label`s `"View"`/`"Sort field"`/`"Sort direction"`, `data-project-toolbar-view-divider`, tabpanel `aria-label`s) | `07` §5.6 | Byte-identical; asserted by `projects-page-sort-controls` / `-shared-access` suites. |
| **New DOM anchors** (combobox `aria-label="Organize by"`, `data-project-group-kind="group"`, `data-project-group="__ungrouped__"` + `aria-label="Ungrouped"`, `data-project-group-virtual`, card kebab `"Move to group"`, bulk dock `"Move to group"`, `aria-label="Manage groups"`) | `07` §5.7 | New group-mode + organize-control anchors. |
| **Shared layout module** `getProjectGridClassName` / `getProjectDateFlagLayoutClassName` | `07` §5.8 (`src/components/workshop/project-grid-layout.ts`) / `11` Task 2 | Byte-identical class strings; imported by both client + `ProjectGroupSection`. |
| **New test files** | `07` §5.7 / phase docs | `tests/vitest/project-group-actions.test.ts` (`09`), `tests/vitest/workshop-project-groups-repository.test.ts` (`10`), `tests/vitest/group-accent.test.ts` + `project-group-section.test.tsx` + `projects-page-organize-control.test.tsx` + `projects-page-group-mode.test.tsx` (`11`). |
| **Canonical decisions D1–D16 / Q1–Q4** | `00` §2 / §4 | The binding product/architecture record. |
| **Build sequence + concurrency** | `00` §6 / `06` §C–E / `03` §5 | C1/C2/C3 land first; rebase-before-edit; strict `7a→7b→7c→7d`. |
| **Requirement → task → test traceability** | `13` | Confirm coverage; flags any untested requirement. |
| **Deploy / rollback / RLS-proof runbook / per-phase DoD** | `15` | Migration apply order, DOWN paths, LD-9 proof, Definition-of-Done gates. |
