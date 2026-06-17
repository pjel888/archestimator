# 06 — Prior-Art Patterns & Concurrency Watch (Lane F)

**Feature:** Project Groups (user-defined groups as a peer "organize by" mode on `/workshop/projects`).
**Lane goal:** Extract reusable patterns from analogous shipped/in-flight features so Project Groups mirrors them exactly, and produce a vigilance map so concurrent agents on the same files don't clobber each other.
**Date:** 2026-06-16
**Status:** Analysis / readiness only. No app source, migrations, or DB changes in this lane.

> Line numbers in this doc are advisory. The working tree has **uncommitted** changes to `MainSidebar.tsx`, `sidebar-types.ts`, `LiveProjectCard.tsx`, `ProjectDetailsModal.tsx`, `WorkshopPageShell.tsx`, `projects-page-client.tsx`, `workspace-repository.ts`, `BulkDestructivePreviewModal.tsx`, and several projects-page tests on branch `codex/fix-project-delete`. Cite **behavior**, verify before editing, and **rebase/re-read before touching any file in the vigilance map below.**

---

## A. Verified ground truth (what already exists)

| Fact | Evidence |
|------|----------|
| No `project_group*` schema exists yet | `rg -li "project_group"` over `supabase/migrations/` and `src/lib/supabase/types.ts` returns **nothing**. This is a greenfield schema. |
| Route is a thin server component | `src/app/workshop/projects/page.tsx` calls `listCurrentWorkspaceProjects()` → passes `{ projects, favoriteProjectIds }` into `ProjectsPageClient`. This is the single integration seam for any group data. |
| Central project query | `listCurrentWorkspaceProjects()` (`workspace-repository.ts` ~L806) does a `Promise.all` over `projects` + `project_favorites` + `estimate_favorites` + members. A `project_group_memberships` fetch slots into that exact array. |
| Grouping = the "horizontal flag" treatment to reuse (date **and** client today) | `getProjectDateGroupLabel` / `getProjectDateGroup` / `groupProjectsByDate` (~L275-311), `ProjectDateGroup` type (~L100), `shouldGroupProjectsByDate` + `dateGroupedLiveProjects` (~L423-427), render block with `data-project-date-group` / `data-project-date-group-label` (~L724-753). The grouping trigger keys off `defaultOrganizeByForSortField`, which maps date fields **and** `client_name` to grouped — i.e. the page already groups by the active grouping sort dimension, not date alone (see B3). |
| Favorites optimistic pattern (template to copy) | `toggleProjectFavorite` (~L483-493) → `setProjectFavorite` from `@/lib/workshop/actions` → `router.refresh()`, with `favoriteOverrides` local-state rollback on `.catch`. |
| View-mode persistence (localStorage template) | `PROJECT_VIEW_MODE_STORAGE_KEY` + `useSyncExternalStore` + custom event (`PROJECT_VIEW_MODE_CHANGE_EVENT`) ~L63-186, 361-365. The "organize by" mode preference should reuse this exact mechanism. |

---

## B. Prior-art patterns to mirror (with citations)

### B1. Favorites — the canonical "user-scoped per-project record + optimistic UI" pattern ✅ shipped + being extended right now

This is the closest analog to Project Groups: a **per-user, per-project relationship row** that drives optional UI organization. Copy its four layers verbatim.

**1. DB:** `project_favorites` table — `(workspace_id, user_id, project_id)` with `onConflict: "user_id,project_id"`. (`estimate_favorites` is the sibling.) Project Groups keeps the same user-scoped relationship shape plus a canonical `project_groups` parent table: `project_groups(id, workspace_id, user_id, name, accent_id, position, created_at, updated_at)` + `project_group_memberships(workspace_id, user_id, group_id, project_id, created_at, updated_at)`, with the strong composite FK described in `02`.

**2. Server action:** `src/lib/workshop/actions.ts` → `setProjectFavorite({ projectId, favorite })`. Pattern to mirror exactly:
- `"use server"` at top.
- `assertUuid(projectId, "Project")` input guard (`isUuid` from `@/lib/ids`).
- `ensureDefaultWorkspace()` → `{ workspace, profile }`, then `createSupabaseServerClient()`.
- **Verify ownership before write:** re-`select` the project scoped to `workspace.id` and throw if not found (defense even with RLS).
- `upsert`/`delete` on the join table.
- `revalidatePath("/workshop")` + `revalidatePath("/workshop/projects")` on every path.
- → **Project Groups equivalent actions:** `createProjectGroup`, `renameProjectGroup`, `deleteProjectGroup`, `setProjectGroupMembership({ projectId, groupId, member })` / `moveProjectToGroup`, `reorderProjectGroups`. Each follows the assert → ensureWorkspace → verify-scope → mutate → revalidate skeleton.

**3. Repository read:** `listCurrentWorkspaceProjects()` (`workspace-repository.ts` ~L806) fetches `project_favorites` in the `Promise.all` and returns `favoriteProjectIds` (~L972). **Add a parallel `project_group_memberships` + `project_groups` fetch in the same `Promise.all`** and return `{ projects, favoriteProjectIds, projectGroups, projectGroupMembership }`. There is also a separate `cache()`-wrapped reader `listMainSidebarFavoriteProjects` (~L1202, **NEW, uncommitted**) — pattern for any group-aware sidebar reader: wrap in `cache()`, cap with a `*_LIMIT` const, batch-fetch with `.in(...)`.

**4. Optimistic UI:** `projects-page-client.tsx` `toggleProjectFavorite` (~L483):
```
setFavoriteOverrides((c) => ({ ...c, [projectId]: nextFavorite })); // optimistic
setPendingFavoriteId(projectId);
startTransition(() => {
  void setProjectFavorite({ projectId, favorite: nextFavorite })
    .then(() => router.refresh())
    .catch(() => setFavoriteOverrides((c) => ({ ...c, [projectId]: previous }))) // rollback
    .finally(() => setPendingFavoriteId(null));
});
```
`favoriteIds` is then derived by merging server `favoriteProjectIds` with `favoriteOverrides` (~L378-385). **Project Groups membership mutations should use this identical override-map + `startTransition` + `router.refresh()` + catch-rollback shape** (e.g. `groupMembershipOverrides`).

**Naming conventions to adopt (from favorites):** `setX` server actions, `toggleX`/`handleX` client handlers, `xOverrides` optimistic state, `pendingXId` busy flag, `EMPTY_*` shared empty-array constants, `*_STORAGE_KEY` / `*_CHANGE_EVENT` for persisted prefs.

### B2. Archives feature plan — the end-to-end blueprint for a "project organization/state" feature 📋 planned, not implemented

`.ai/03_plans/2026-06-07-archives-feature/` is the most structurally complete prior plan for a feature in this exact surface. Project Groups should mirror its document set and its architectural choices:

- **Reuses the `preview → execute → audit` mass-deletion pattern** for bulk ops (`03_ARCHITECTURE_AND_DESIGN_PLAN.md`). Project Groups bulk "add to group / remove from group" should decide whether it needs the heavy preview-hash governance (it does **not** — grouping is non-destructive and reversible; see B3).
- **Additive schema, nullable-by-default, backward-compatible** (`03`, "Migration Implications"): Project Groups is purely additive (two new tables, zero changes to `projects`), so existing queries are untouched.
- **Indexes for the hot query path** (`04_IMPLEMENTATION_SEQUENCE.md` Phase 2): follow `02` exactly, especially `project_groups(user_id, workspace_id, position, created_at)`, `project_group_memberships(user_id, workspace_id, group_id, created_at)`, and `project_group_memberships(project_id)`.
- **Tests-first / failing-tests scaffolding** (`04` Phase 1): write repository + UI grouping tests before implementation.
- **Tabbed list reuses `WorkshopCollectionLayout` `toolbarPanel` slot** (`03` Reuse Opportunities). Note: Project Groups is an **"organize by" mode**, NOT a new access tab — it renders inside the existing tab body, peer to date grouping, not as a sibling of `your-projects`/`shared-to-you`.
- **Migration naming convention:** `YYYYMMDDHHMMSS_<topic>.sql` (e.g. `20260616HHMMSS_project_groups_foundation.sql`), matching every file in `supabase/migrations/`.
- **RLS posture:** archives plan keeps RLS authoritative and adds app-layer guards; Project Groups tables need new RLS policies scoped to `workspace_id` + `user_id`/owner, following the hardening decisions in `.ai/10_state/decisions.md` (initplan-style `(select auth.uid())`, `authenticated`-only, explicit grants — never default-PUBLIC execute).

**Reuse decision:** Take the archives plan's *document structure and additive/RLS/index discipline*; do **not** take its preview-hash bulk governance for membership changes.

### B3. Date grouping — the literal visual/interaction pattern to extend

The "organize by" mode is the product seam. Current state: grouping is **implicit** — it triggers whenever the active sort field is a *grouping* dimension. **This is not date-only.** `defaultOrganizeByForSortField` maps **both** date sort fields (`updated_at`/`created_at`) **and** `client_name` to a grouped layout, so the live page already groups projects by **Client** as well as by Date — the same horizontal-flag render is reused for both. The "Organize by Date" framing is therefore really **"group by the active grouping sort dimension (date *or* client)"**; the explicit third mode (None / Date / Group) generalizes a behavior the page already exhibits in two dimensions rather than inventing a new one. (This client-grouping prior art is the basis for the **F1 blocker fix** — `client_name` must be honored as a grouping dimension; this is already correct in `07` §5.1 and `11`, and is only under-surfaced in the narrative docs.) The render is the horizontal-flag block (~L724-753): a `div.h-px.bg-hairline` divider + an `<h3 data-project-date-group-label>` with `bg-surfaceMuted`, then a `projectLayoutClassName` cards grid per group.

**To make groups a peer mode you must introduce an explicit "organize by" dimension** (None / Date / Group) rather than overloading the sort field. Recommended:
- Add an `organizeBy` state + a `DropdownSelect` in the toolbar `filterSlot` (the View/Sort dropdowns live there, ~L651-691) using `PROJECT_TOOLBAR_SELECT_TRIGGER_CLASS`.
- Generalize the `ProjectDateGroup` type and `groupProjectsByDate` into a group-source-agnostic shape: `{ key, label, items }` is already generic — add a `groupProjectsByGroupMembership(items, membershipMap, groups)` producer that returns the same `ProjectDateGroup[]`-shaped array (rename the type to `ProjectGrouping`/`ProjectGroupSection`).
- Reuse the **exact same render block** keyed on `data-project-group` / `data-project-group-label` so the flag treatment is pixel-identical. Keep `data-project-date-group*` attributes for the date path (tests depend on them).
- Persist `organizeBy` with the **B1 view-mode localStorage pattern** (new `*_STORAGE_KEY` + `useSyncExternalStore`).

### B4. Mass-deletion governance + `BulkActionToolbar` / `BulkDestructivePreviewModal` reuse

Governance lives in `src/lib/mass-deletion/bulk-action.ts` (`BulkActionPreviewResult`, `targetType: "project" | "estimate_sheet" | "library_component"`, `previewHash`, `eligibleIds`, `validateTypedConfirmationPhrase`) and `src/lib/projects/actions.ts` (`previewBulkDeleteProjects` / `executeBulkDeleteProjects` with `expected_preview_hash`). The UI is `BulkActionToolbar` (bottom-dock selection bar, ~L708-716 in client) + `BulkDestructivePreviewModal`.

**Reuse decision for Project Groups:**
- **Do NOT route group membership changes through preview-hash/typed-confirmation governance.** That machinery exists for **destructive** ops (hard delete) and the irreversible component archive. Adding/removing a project from a group is reversible metadata — use the lightweight B1 optimistic pattern.
- **DO reuse `BulkActionToolbar`** for a bulk "Add selected to group…" / "Remove from group" affordance if multi-select grouping is in scope — it already renders for `selectedVisibleProjectIds` and is feature-agnostic (`actionLabel`, `helperText`, `onAction`, `onClear`, `onSelectVisible`).
- **`BulkDestructivePreviewModal` is shared, copy-sensitive infrastructure.** It now branches copy by `targetType` and by an `executeLabel` prefix (`getActionCopy` → "delete" vs "archive"). If a future "delete group" needs a preview modal, add a `targetType: "project_group"` to the union in `bulk-action.ts` and a label branch in `getTargetLabel` — but a group is a thin container, so a simple `Modal` confirm (no preview hash) is almost certainly correct.

---

## C. In-flight concurrent plans — what they change and where they overlap

### C1. Sidebar Favorite Projects & Estimates  (the biggest overlap)

- **Plan folder:** `.ai/03_plans/2026-06-16-Sidebar-Favorite-Projects-And-Estimates/` is **empty** (just-created shell, like our own Project-Groups folder). The *implementation is live as uncommitted edits* on branch `codex/fix-project-delete`.
- **What it does (from the diff):** Renders a "Favorites" section in `MainSidebar` listing favorite projects and their favorite estimate sheets as prefetchable `next/link`s. New types `MainSidebarFavoriteProject` / `MainSidebarFavoriteEstimateSheet` in `sidebar-types.ts`. New repo reader `listMainSidebarFavoriteProjects` (`cache()`-wrapped, `MAIN_SIDEBAR_FAVORITE_PROJECT_LIMIT = 8`, `MAIN_SIDEBAR_FAVORITE_SHEET_LIMIT = 5`) in `workspace-repository.ts`. Wired through `WorkshopPageShell` (`listMainSidebarFavoriteProjects()` awaited, passed as `favoriteProjects` to `<MainSidebar>`). New test `tests/vitest/main-sidebar-favorites.test.tsx`.
- **Overlap with Project Groups:** **HIGH.** Both extend `workspace-repository.ts` with new readers, both may add a sidebar surface, and a likely future ask is "show project groups in the sidebar too." If groups get a sidebar reader it should mirror `listMainSidebarFavoriteProjects` (cache + limit + `.in()` batch). **Same files: `workspace-repository.ts`, `sidebar-types.ts`, `MainSidebar.tsx`, `WorkshopPageShell.tsx`.**
- **Sequencing:** Let the sidebar-favorites work **land first**. It establishes the `MainSidebarProps` shape and the `cache()`-reader convention; Project Groups should append, not re-architect.

### C2. Delete-Project Modal UX  (`docs/plans/2026-06-16-003-delete-project-modal-ux-plan.md`)

- **What it does:** Rewrites `BulkDestructivePreviewModal` copy to remove server-side/"dependency preview"/"execution" language; adds a human "Needs attention" strip, `targetType`-aware labels, and an archive/delete verb branch (`getActionCopy`, `getTargetLabel`, `formatIssueMessage`). Updates the `/workshop/projects` delete modal description. New test `tests/vitest/bulk-destructive-preview-modal.test.tsx` asserts the absence of `server-side|execution|dependency preview|published` and presence of "Needs attention" + archive copy. Touches `BulkDestructivePreviewModal.tsx` + `projects-page-client.tsx` (the `deleteProjectDescription` strings ~L443-445).
- **Overlap with Project Groups:** **MEDIUM.** Both touch `projects-page-client.tsx`. The delete plan edits the **delete-modal description strings + bulk-modal copy**; Project Groups edits the **toolbar filterSlot + grouping render + new organize-by state**. Different regions of the same file → mergeable, but **both add toolbar/modal copy and both will re-run the projects-page test suite.** If Project Groups adds a "delete group" preview, it must respect this plan's copy contract (no checker language; `formatIssueMessage` style).
- **Sequencing:** This plan is small and copy-focused — let it land first to stabilize `BulkDestructivePreviewModal`'s `targetType`/`executeLabel` contract before Project Groups extends the union.

### C3. Project Card Favorite Sheet Links  (`docs/plans/2026-06-16-002-...md`)

- **What it does:** Converts the `LiveProjectCard` hover-overlay favorite sheets into `next/link`s and reworks the card date band (the uncommitted `LiveProjectCard.tsx` diff shows a new `data-project-card-date-band` Created/Updated grid replacing the single "Created" line). Scope is explicitly limited to `LiveProjectCard.tsx`.
- **Overlap with Project Groups:** **LOW-MEDIUM.** Project Groups likely adds a per-card "Add to group" affordance (card menu / `ProjectDetailsModal`). Both touch `LiveProjectCard.tsx` and the card's action surface. The favorite-links work is card-internal and nearly landed; Project Groups should attach its group affordance to the existing `onExpand`/details-action menu rather than the hover overlay.

### C4. Delete-Project Components Route  (`docs/plans/2026-06-16-001-...md` → canonical `.ai/.../Project-Components-Route-Deletion/`)

- **What it does:** Deletes `/workshop/projects/[projectId]/components` and its mini-sidebar entry. Route-deletion only.
- **Overlap with Project Groups:** **NONE** on the projects-list surface. Listed for completeness; it removes a sub-route, not the list page.

### C5. Promote detached estimate rows (recently merged, `f47f724b` / `2b7231d3`)

- Already on the branch's history; touched `workspace-repository.ts`, `LiveProjectCard.tsx`, projects-page card layout. Relevant only as proof that **`workspace-repository.ts` and `LiveProjectCard.tsx` are high-churn files** — treat both as moving targets.

---

## D. Project conventions our package + implementation must follow

Sourced from `AGENTS.md`, `.ai/00_system/AGENT_OPERATING_PROTOCOL.md`, `.ai/00_system/AGENT_FRAMEWORK_PROTOCOL.md`, `.ai/10_state/decisions.md`, `.ai/10_state/current-state.md`, `.ai/03_plans/README.md`.

| Domain | Rule | Source |
|--------|------|--------|
| **Plan placement** | Plan packs live under `.ai/03_plans/<YYYY-MM-DD>-<topic-slug>/`. Never create root `plans/`. `docs/plans/*.md` files are **LFG-workflow bridges**, not the source of truth — the canonical pack stays in `.ai`. | `03_plans/README.md`, decisions 2026-06-13 |
| **A new plan must state** | exact user job; route/screen affected; non-goals; files expected to change; validation gate; deletion criteria if rejected; loop-surface selection; durable evidence path. | `03_plans/README.md` "Rules for new plans" |
| **Route discipline** | Future work must be route-scoped, screen-scoped, easy to delete. **Do not create broad route families / dashboards / persistence layers without explicit approval in the plan.** Project Groups is in-place on `/workshop/projects` — good fit; do not spawn a `/workshop/groups` route family without owner approval. | `03_plans/README.md` |
| **Stack** | Next.js 16 + React 19 + Bun + TS + Tailwind v4 + Supabase/Postgres. "This is NOT the Next.js you know" — read `node_modules/next/dist/docs/` before writing Next-specific code. | `AGENTS.md` |
| **DB autonomy** | Standing pre-launch authorization to create/apply migrations, change schema/RLS/RPC/grants, regen types — **scoped to project `ebxxqidacheyapmmzavr` ONLY**, never SlateCamp. Fix forward; no per-change owner gate. **This planning task is read-only — do NOT apply migrations.** | `AGENTS.md`, decisions 2026-06-13 |
| **RLS hardening** | New tables need initplan-style `(select auth.uid())` policies, `authenticated`-only where private, explicit grants (never default-PUBLIC execute), advisor-clean. Run `get_advisors` after. | decisions 2026-06-14 (advisor hardening) |
| **Migration naming** | `YYYYMMDDHHMMSS_<topic>.sql`; keep migrations reviewable; no blind `supabase db push --linked` while deferred items exist. | archives `04`, decisions |
| **Testing bias (pre-launch MVP)** | Targeted validation that proves the changed behavior. Reserve broad `bun run validate`/`build`/manual QA for shared logic, auth/security, data-integrity, release, or high-blast-radius work. Tests-first is the archives-plan default for repository + UI grouping logic. | `AGENTS.md` "Pre-launch MVP bias", `04` Phase 1 |
| **UI** | `DESIGN.md`: compact SF Pro, 0 letter-spacing, 3px radius, restrained color, regular-outline icons. Reuse `src/components/ui/` primitives (`DropdownSelect`, `Modal`, `Tabs`, `BulkActionToolbar`). **A11y note from MEMORY:** `#7F7F7F` meta fails WCAG AA — use secondary `#5D5D5D` for load-bearing meta text. | `AGENTS.md`, `DESIGN.md`, MEMORY |
| **Orchestration / completion** | Loop-engineered, maker/checker separation, lead-owned integration. Completion = evidence, not intent; if validation skipped, say why + residual risk. | `AGENT_OPERATING_PROTOCOL.md` "Completion discipline" |
| **`.ai` as brain** | No tool-specific knowledge silos; durable decisions/plans/specs in `.ai`. Update `current-state.md` + `decisions.md` on implementation. | `AGENTS.md` core rules |

---

## E. CONCURRENCY VIGILANCE MAP

Files likely touched by **both** Project Groups and in-flight work. **Rebase/re-read before editing every row marked HIGH or MEDIUM.**

| File | Project Groups touch | In-flight work touching it | Collision risk | Merge / sequencing strategy |
|------|----------------------|----------------------------|----------------|------------------------------|
| `src/lib/repositories/workspace-repository.ts` | Add `project_group*` fetch to `listCurrentWorkspaceProjects` `Promise.all`; new `cache()` group reader | **C1 sidebar-favorites** (new `listMainSidebarFavoriteProjects`, uncommitted); C5 just merged | **HIGH** | Land C1 first. Append a new reader + extend the `Promise.all` array (don't restructure the return). Mirror the `cache()` + `*_LIMIT` + `.in()` batch convention C1 introduced. |
| `src/components/workshop/projects-page-client.tsx` | New `organizeBy` state + toolbar `DropdownSelect`; generalized grouping producer + render; group membership optimistic handlers; possibly bulk "add to group" | **C2 delete-modal** (delete description strings, modal copy); C5 merged | **HIGH** | Different regions (C2 = delete strings ~L443-445 + modal; Groups = filterSlot ~L651-691 + grouping render ~L724-753). Mergeable but **re-run all `projects-page-*` tests after merge.** Land C2 first to freeze modal `targetType` contract. |
| `src/components/workshop/BulkDestructivePreviewModal.tsx` | Only if a "delete group" preview is added (likely not needed) | **C2 delete-modal** (rewrites copy, `getActionCopy`/`getTargetLabel`/`formatIssueMessage`) | **MEDIUM** | Prefer to NOT touch this file. If forced, add `targetType: "project_group"` to the union in `bulk-action.ts` + a label branch, after C2 lands. Respect the no-checker-language test contract. |
| `src/lib/mass-deletion/bulk-action.ts` | Only if group delete uses preview governance | C2 (consumes `targetType`) | **LOW-MEDIUM** | Recommend group membership changes bypass this entirely (reversible metadata). Touch only for a true destructive "delete group". |
| `src/components/workshop/LiveProjectCard.tsx` | Per-card "Add to group" affordance via details menu | **C3 favorite-sheet-links** + card date-band (uncommitted); C5 merged | **MEDIUM** | High-churn file. Attach group affordance to existing `onExpand`/details-action menu, not the hover overlay C3 owns. Rebase before editing. |
| `src/components/workshop/ProjectDetailsModal.tsx` | "Move to group" / group-assignment control | Uncommitted edits present (unattributed) | **MEDIUM** | Re-read current diff before editing; the modal is already mid-change. |
| `src/components/sidebar/MainSidebar.tsx` + `sidebar-types.ts` | Only if groups get a sidebar surface | **C1 sidebar-favorites** (owns both files, uncommitted) | **HIGH (if sidebar in scope) / NONE (if not)** | Defer any sidebar-groups surface until C1 lands. Then extend `MainSidebarProps` additively, mirroring `MainSidebarFavoriteProject`. |
| `src/components/workshop/WorkshopPageShell.tsx` | Only if shell must load group data for sidebar | **C1** (adds `listMainSidebarFavoriteProjects()` await) | **MEDIUM** | If needed, add a second awaited reader next to C1's; don't reorder the existing `Promise.all`. |
| `src/app/workshop/projects/page.tsx` | Pass `projectGroups` / membership into client | none in-flight | **LOW** | Safe additive prop pass-through; extend the destructured repo return. |
| `tests/vitest/projects-page-*.test.tsx` | New organize-by/group-render tests | **C2** (sort-controls, shared-access, card-layout already modified, uncommitted) | **MEDIUM** | Add new test files (`projects-page-group-mode.test.tsx`) rather than editing the churning ones. Preserve `data-project-date-group*` selectors the date tests depend on. |
| `supabase/migrations/` + `src/lib/supabase/types.ts` | New `project_groups` + `project_group_memberships` migration; type regen | none in-flight | **LOW** | Net-new files; only `types.ts` is shared — regen, don't hand-edit beyond documented manual patches. |

### Rebase-before-edit checklist (run before touching any HIGH/MEDIUM file)

1. `git fetch && git status` — confirm branch and uncommitted state; the working tree is dirty on `codex/fix-project-delete`.
2. `git log --oneline -10 -- <file>` and `git diff <file>` — see what concurrent work is mid-flight in that exact file.
3. Re-read the live file (don't trust line numbers in this doc or the shared brief).
4. For `workspace-repository.ts` / `MainSidebar.tsx` / `sidebar-types.ts`: confirm **C1 sidebar-favorites has merged** (or coordinate) before extending — it owns those files now.
5. For `projects-page-client.tsx` / `BulkDestructivePreviewModal.tsx`: confirm **C2 delete-modal copy** is in and the `BulkActionPreviewResult.targetType` union is stable before extending.
6. After any merge into a shared file: `bunx vitest run tests/vitest/projects-page-*.test.tsx tests/vitest/bulk-destructive-preview-modal.test.tsx tests/vitest/main-sidebar-favorites.test.tsx` + `bun run type-check` + `git diff --check`.
7. Prefer **new files** (new server actions, new test files, new grouping module) over editing churning shared files where the behavior allows.

### Recommended global sequencing
1. **C1 (sidebar favorites)** lands → freezes `MainSidebarProps` + `workspace-repository` reader convention.
2. **C2 (delete-modal UX)** lands → freezes `BulkDestructivePreviewModal` copy + `targetType`/`executeLabel` contract.
3. **C3 (card favorite links)** lands → freezes `LiveProjectCard` overlay + date band.
4. **Project Groups** builds on the stabilized surfaces: new schema/actions/repo reader (mirroring favorites), explicit `organizeBy` mode in the toolbar, generalized grouping render reusing the date-flag block.

---

## F. Recommendations (pick-a-default)

- **Mirror favorites, not mass-deletion, for membership mutations.** Group add/remove is reversible metadata → optimistic override-map + `startTransition` + `router.refresh()` + catch-rollback (B1). No preview hash, no typed confirmation.
- **Introduce an explicit `organizeBy` dimension (None / Date / Group)** rather than overloading the sort field; persist it with the view-mode localStorage pattern; reuse the literal date-flag render block keyed on generic `data-project-group*` attributes.
- **Keep it in-place on `/workshop/projects`** — no new route family (route-discipline convention). Optional sidebar surface is a fast-follow that must wait for C1.
- **New additive schema only:** `project_groups` + `project_group_memberships`, RLS scoped to workspace+user, partial indexes, advisor-clean, `YYYYMMDDHHMMSS_project_groups_foundation.sql`. (Planning lane only — do not apply.)
- **Tests-first** for the repository grouping read and the client group-render, in **new** test files to avoid the churning projects-page suites.
- **Sequence behind C1 and C2** to inherit stable shared-file contracts.
