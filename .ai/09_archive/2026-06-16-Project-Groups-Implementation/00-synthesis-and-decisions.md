# Project Groups — Synthesis & Canonical Decision Record (Lane 0 / Reconciliation)

**Plan pack:** `2026-06-16-Project-Groups-Implementation`
**Role:** Reconciliation / synthesis — read all six lane outputs, resolve cross-lane conflicts, produce the single canonical decision record the implementation plan binds to.
**Date:** 2026-06-16
**Status:** Implementation-readiness synthesis (NOT implementation). No app source, migrations, or DB mutations.
**Route in scope:** `/workshop/projects` (`ProjectsPageClient`)

> This document supersedes the individual lanes wherever they conflict. Where a lane
> recommendation is adopted unchanged, it is cited. Where lanes disagreed, the
> **Conflicts Resolved** section records who disagreed and why one answer won. Ground
> truth was re-verified against the live repo and migrations on 2026-06-16 (see
> "Verification" at the end); two lane claims were corrected against that ground truth.

---

## 1. Executive summary & readiness verdict

**The feature.** Project Groups lets a user define named, ordered, optionally color-accented
buckets on `/workshop/projects` and view the project wall organized by them — reusing the
**exact horizontal-flag treatment** already proven for the existing implicit grouping mode.
Note the live page already groups by **both date and Client** today
(`defaultOrganizeByForSortField` maps a date sort field *and* `client_name` → grouped), so
"organize by date" is really "group by the active grouping sort dimension (date **or**
client)." Structurally Groups is a **third explicit "organize by" mode** (None / Date / Group)
that generalizes that existing implicit behavior, plus a per-user membership relation cloned
from the just-shipped Favorites feature. It is **not** a new route,
**not** a new access tab, and **not** a destructive operation.

**Readiness verdict: READY — the adversarial-review FIX@IMPL items are now INTEGRATED into the
phase plans (08–11), not left pending in a checklist.** Readiness is evidenced — not asserted —
by the traceability/QA matrix (`13`), the implementer handoff/runbook (`14`), and the
deploy/rollback/DoD plan (`15`); `12` §4 records each former FIX@IMPL item as integrated into a
named phase task.

The six lanes converge strongly on the architecture: mirror Favorites end-to-end (per-user
rows, `setProjectFavorite`-shaped server actions, additive fetch in the existing
`listCurrentWorkspaceProjects` `Promise.all`, `toggleProjectFavorite` optimistic
override-map + `router.refresh()`), introduce an explicit `organizeBy` dimension persisted
with the view-mode `localStorage`/`useSyncExternalStore` pattern, and generalize the
date-flag renderer into one reusable component without breaking the date-mode DOM contracts.
That spine is unanimous and well-grounded. Analysis can settle every architecture question;
no analysis-blocking unknowns remain.

**What's NOT blocking (resolved here):** cardinality, ownership scope, schema shape
(column vs join table), assignment mechanism, organize-by model, storage approach,
reuse-vs-new component, migration/RLS pattern. All decided below.

**Owner decisions — RESOLVED 2026-06-16 (Philip).** The four owner-tunable calls are now
locked (see §4). Three matched the engineering defaults; **one is an override**: color accents
**ship in v1** (not colorless-first). Locked: (Q1) default organize = **Date when the initial
sort field is a date field or `client_name`, else None** (no persisted sort — computed on first
load); (Q2) caps = **50 groups / 40-char names**, soft-capped with a
clear at-limit message; (Q3) **ship the 8-swatch accent palette in v1**; (Q4) MVP assignment
surfaces = **card kebab + bulk dock only** (no `ProjectDetailsModal` group field in v1). Nothing
remains open; the implementation plan binds to these.

**The one true blocker if mishandled — concurrency, not design.** Three in-flight efforts are
mid-edit (uncommitted) in the exact files Groups needs most. Building against the dirty tree
guarantees painful merge conflicts and risks silently breaking the five RTL suites that assert
the date-flag DOM. The verdict is conditional on **sequencing Groups after those branches land**
(or coordinating a single owner of the contested files). See §6.

---

## 2. Canonical decisions

Each row is the single binding answer. "Binds" lists which lanes/work must conform.

| # | Topic | CANONICAL DECISION | Rationale | Binds |
|---|---|---|---|---|
| **D1** | **Cardinality** | **One-to-many.** A project belongs to **at most one** group. Enforce single-membership at the DB. | 5 of 6 lanes (A, B, C, D, F implicitly) chose one-to-many. The reused flag metaphor is mutually-exclusive buckets (each card appears once, like a month flag); pipeline stages are inherently exclusive. Many-to-many inflates the wall, breaks `Set<string>` bulk-select identity (Lane D), forces "which flag does this card live under" rendering ambiguity (Lane B), and is really a separate future **Tags** feature. | B (constraint), C, D, E |
| **D2** | **Ownership scope** | **Per-user**, workspace-scoped rows, mirroring `project_favorites` (`user_id` column; RLS `user_id = (select auth.uid()) AND is_workspace_member(workspace_id)`, **plus** the LD-1 `exists()` IDOR backstop on membership insert). Groups are a **private** organization layer, not shared with collaborators. The Phase-2 action ownership gate **matches the repository's `owned` predicate** — `workspace_id === workspace.id && (Boolean(workspaceRole) || created_by === profileId)` (workspace-repository.ts ~L236) — **not** a bare `.eq("created_by", profile.id)`; it must handle `created_by IS NULL` (the column is nullable / `ON DELETE SET NULL`) so an owned-via-workspace-role project remains assignable (LD-2). The earlier claim that the `created_by` gate matches the client `owned` gate is **false and removed**: the canonical gate is the repository owned predicate, not bare `created_by`. | 4 of 6 lanes (A, C, D, F) chose per-user; Lane B alone argued per-workspace **on the false premise that it "mirrors favorites."** Verified ground truth: `project_favorites` is **per-user** (`user_id`, `unique(user_id, project_id)`), so the favorites-parity argument supports per-user. decisions.md (2026-05-26) makes favorites first-class per-user rows the binding precedent. Per-user also sidesteps the unsolved "shared label authority / whose RLS" problem (decisions.md:762) that a shared taxonomy would reopen. | B (RLS + `user_id`), C, D |
| **D3** | **Schema shape** | **Two new tables, cloned from `project_favorites`:** `project_groups` (definitions) + `project_group_memberships` (per-user join). **Do NOT add a `group_id` column to `projects`.** | Lanes C, D, F explicitly require a separate membership table; Lane B's default put `group_id` on `projects`. The column approach changes the generated `Tables<"projects">` type consumed **pervasively** (project form, details modal, charts, exports, every list item) — Lane C flags this as a needless blast-radius multiplier. It also collides with decisions.md (2026-05-26): favorites "must not be stored as project/estimate metadata booleans" — the same first-class-row principle applies to group membership. A join table keeps `Tables<"projects">` untouched and contains the change to the additive repository fetch. (This overrides Lane B's §6.1 default in favor of its §6.2-shaped table, but **per-user**, not per-workspace.) | B (DDL), C, D |
| **D4** | **Organize-by model** | **Explicit `organizeBy` dimension (None / Date / Group)** as a 3rd/4th toolbar `DropdownSelect`, peer to View / Sort. **Decouple grouping from the sort field** — grouping stops being an implicit side-effect of the sort field. **Note the live page ALREADY groups implicitly by both date and Client** (`defaultOrganizeByForSortField` maps date sort fields **and** `client_name` → grouped), so the "Date" mode is shorthand for "group by the active grouping sort dimension (date **or** client)." The explicit Group mode generalizes that existing implicit behavior into a third, first-class bucket dimension. | Unanimous (all six lanes). Group has no sort column to ride, so it cannot piggyback the sort control; an explicit mode gives all three a single mental model and removes the surprising silent re-bucketing. This is the single highest-leverage refactor and the root of most integration risk. | C (toolbar), D (state), E (control) |
| **D5** | **Storage / preference** | Persist `organizeBy` (and the collapsed-group set, if collapse ships) in `localStorage` via the **exact `useSyncExternalStore` + custom-event + `storage`-event machinery** behind `PROJECT_VIEW_MODE_STORAGE_KEY`. New key `archestimator_projects_organize_by_v1`. Group **definitions/membership persist server-side**; only the *view preference* is client-local. **No TanStack Query for the projects list.** | Lanes A, D, F converge. The projects list is SSR-prop-driven with no query cache (Lane D's load-bearing finding); adding Query would create two sources of truth and double invalidation. The view-mode pattern gives free cross-tab sync + SSR-safe hydration. | D (state), E (collapse) |
| **D6** | **Flag renderer: reuse vs new** | **Extract ONE reusable `ProjectGroupSection` component** (header + grid + collapse + accent + menu) in `src/components/workshop/`; both date and user grouping render through it. Move `getProjectGridClassName` / `getProjectDateFlagLayoutClassName` to a shared `project-grid-layout.ts`. **Date mode stays byte-identical** (preserve both `data-project-date-group` on the section and `data-project-date-group-label` on the label container, plus `aria-label="Live projects"` and combobox names). | Lanes C, D, E, F agree on generalizing the existing block (not forking a second flag style). Lane E specifies the component contract (`legacySectionDataAttr` + `legacyHeaderDataAttr` props keep date tests green). Doing the generalization and the new mode in **one PR** avoids a second fragile pass over the same RTL anchors (Lane C). | C, D, E, plus tests |
| **D7** | **Migration / RLS pattern** | New migration cloned from `20260526013617_workshop_favorites.sql` **and hardened with an IDOR backstop** (not byte-for-byte verbatim): composite FK `(project_id, workspace_id) → projects(id, workspace_id) ON DELETE CASCADE`; RLS `user_id = (select auth.uid()) AND is_workspace_member(workspace_id)` (initplan-style), `authenticated`-only, explicit narrowed grants, advisor-clean. The membership-insert policy adds the **canonical IDOR backstop** `with check exists(select 1 from project_groups g where g.id = group_id and g.user_id = (select auth.uid()))` so a user cannot attach a project to another user's group — this `exists()` backstop **is in the migration** and is canonical (LD-1). **Group table grants include `UPDATE`** (rename/recolor/reorder) — unlike favorites. Timestamp **strictly later** than `20260616120000` and any concurrent `20260616*` migration. Regenerate `types.ts` after apply. | Lanes B, C, F. Verified: favorites RLS is exactly this initplan per-user shape; `is_workspace_member`/`is_platform_admin` helpers exist; the composite-FK device keeps bulk-delete cascade-safe with **zero RPC edits** (Lane B §5). The single-column `group_id` FK + `exists()` backstop is the canonical IDOR mechanism (LD-1; supersedes the composite `(group_id, workspace_id, user_id)` form). No new SECURITY DEFINER function → advisor baseline (74 WARN / 0 ERROR) is unchanged. | B (owns DDL), C |
| **D8** | **Assignment mechanism** | **Primary = card kebab → "Move to group" (`DropdownMenu`)** + **bulk "Move to group" in `BulkActionToolbar`**. **Fast-follow secondary = `ProjectDetailsModal` group field.** **Drag-onto-flag deferred** (progressive enhancement, always with a menu equivalent). | Lanes A and E converge; A owns the product call. Lowest build cost, best a11y/touch coverage, reuses `DropdownMenu` + `BulkActionToolbar`. Details-modal assignment overlaps concurrent modal work, so it is not a v1 blocker. Drag is pointer-only, no-touch, weak-a11y, highest-cost → layers on later behind the same action. | D, E |
| **D9** | **Bulk-assign permission gate** | Bulk "Move to group" must **NOT** reuse the delete-selection gate (`canSelectProjectForDeletion`). Assignment has its **own permission surface** (an owner can group any owned project even when delete is blocked by an active shared link). The gate is **REALIZED in Phase 4** via an assignment-specific selection source (`canAssignProjectToGroup` over `displayLiveProjects`, with a parallel selected-set the bulk affordance reads — **not** the delete-gated `selectedVisibleProjectIds`); it is **not waived**. `canAssignProjectToGroup` uses the **LD-2 ownership definition** (below), not a bare `created_by` check. | Lanes A and C flag this explicitly. Conflating the gates would wrongly block grouping of delete-blocked projects. Because groups are per-user over **owned** projects only in v1 (D11), the assign gate is "is this an owned, in-workspace project," independent of delete eligibility. | D (selection logic), B (action scope) |
| **D10** | **Delete-group semantics** | Deleting a group **un-assigns** its projects (they fall to a virtual **"Ungrouped"** bucket); it **never** deletes projects. Use a **lightweight inline confirm**, **NOT** `BulkDestructivePreviewModal`. Membership rows cascade with the group (join-table `ON DELETE CASCADE`). | Lanes A, C, E, F agree. Losing a personal organization label is non-destructive; the heavy typed-phrase gate is overkill and would collide with the in-flight delete-modal copy contract. Keep group delete **out of** `BulkDestructivePreviewModal` / `bulk-action.ts`. | C, E |
| **D11** | **Shared/invited projects in v1** | **Group mode on `Your Projects` only.** On the `Shared` tab the `"By group"` option is **disabled with a tooltip**; coerce `organizeBy` away from `group` when switching to Shared. | Lanes A, C, E, F align. decisions.md:762 deliberately suppressed shared favorites "until a dedicated shared-favorite data model and authorization design is approved." Groups over shared projects raise the **identical** unsolved authorization question and inherit the same deferral. | C, D, E |
| **D12** | **"Ungrouped" bucket** | Always-present **virtual** trailing bucket holding every in-scope project with no group. Not a real row (cannot rename/recolor/reorder/delete). Pinned **last**. Hidden when empty; hidden per-group during active search if it has zero matches. The grouping util must bucket any **unknown/dangling** `groupId` into Ungrouped (defensive, survives a cross-tab group deletion). | Lanes A, D agree; Lane D adds the dangling-id defensive requirement. Prevents phantom sections / crashes when a group is deleted in another tab. | D (grouping util), E |
| **D13** | **Color accent** | **Owner confirmed accents SHIP IN v1 (2026-06-16).** Flag background stays `bg-surfaceMuted` (like date flags); add a small **decorative** accent (3px left rule + 6px dot) from a fixed, desaturated, explicitly-non-brand-orange 8-swatch palette in `group-accent.ts`, applied **inline-`style` only** (mirroring the sanctioned chart `bucket-color.ts` containment). Store a stable `accent_id` **token** (not raw hex); column is `accent_id text` nullable (null ⇒ a default neutral swatch). v1 includes accent **selection** UI in the Manage-groups popover and accent rendering in `ProjectGroupSection`. Labels stay `text-secondary` (#5D5D5D) so AA holds regardless of accent. | Lanes A and E converge; E specifies the 8-swatch palette + `group-accent.ts`. Storing an id lets the palette be re-tuned for AA/brand without a data migration; inline-style containment keeps accents out of the neutral design system. | B (`accent_id text` nullable), E |
| **D14** | **Optimistic override staleness (groups-specific)** | For group assignment, **clear the per-project override once SSR is authoritative for that id** — a deliberate divergence from favorites, whose boolean overrides self-heal. **`router.refresh()` returns `void` (not a thenable), so the earlier "clear in the refresh `.then()`" is mechanically impossible (LD-6).** Canonical pattern (mirrors favorites' real implementation): wrap the action call + `router.refresh()` in `startTransition` from `useTransition`; the transition's `isPending` tracks the RSC refresh. Clear the override in a `useEffect` once **either** the transition settles (`isPending` → `false`) **and** the incoming SSR `item.groupId` equals the override value, **or** simply when the SSR prop for that id reflects the move — whichever Phase 4 verifies against live code. The invariant: the override clears only once SSR is authoritative for that id, with no early-clear flicker. | Lane D's D-8. A group override encodes "project X → group A" (not a boolean), so a never-cleared override can mask a later legitimate SSR move (X → group C). Explicit-clear makes SSR authoritative the moment it is trusted; an interleaving test (rapid re-assign during a pending refresh must not flicker to stale SSR) guards it. | D |
| **D15** | **State home (collapse / selection)** | Local `useState` for `collapsedGroupKeys` and any selected-group filter — **no Zustand store.** Preserve `selectedProjectIds` across Organize-mode switches; **clear** it across access-tab switches. | Lane D; consistent with how favorites/sort/select already live (single consumer = `ProjectsPageClient`). Selection is keyed by project id, so it survives re-bucketing; tab switches change the selectable set + permissions. | D |
| **D16** | **MVP scope cut** | **In v1:** explicit organize control; per-user CRUD via a lightweight "Manage groups" popover; one-to-many assignment via card kebab + bulk dock; flag rendering + Ungrouped + empty-group + search handling; optimistic mutations; `Your Projects` only; organize-mode persistence. **Defer by default:** details-modal field, drag assignment, group reorder if DnD isn't cheap, collapse persistence, groups in sidebar, shared-project groups, many-to-many tags. | Lanes A and F define the cut; C and D endorse keeping sidebar + details-modal surfaces out to minimize merge surface. | all |

---

## 3. Conflicts resolved

Each conflict any lane raised, the parties, and the binding resolution.

| Conflict | Between | Resolution |
|---|---|---|
| **Ownership: per-user vs per-workspace** | Lane B (per-workspace) **vs** Lanes A, C, D, F (per-user) | **RESOLVED → per-user (D2).** Lane B's argument rested on "mirrors favorites," but verified ground truth shows favorites are **per-user** (`user_id`, per-user RLS). The factual premise was inverted, so the majority + the favorites precedent + the decisions.md first-class-per-user-rows rule all point to per-user. Per-user also avoids reopening the suppressed shared-label authorization question (decisions.md:762). |
| **Schema: `projects.group_id` column vs separate membership table** | Lane B default (column) **vs** Lanes C, D, F (table) | **RESOLVED → separate `project_group_memberships` table (D3).** A column on `projects` changes the generated `Tables<"projects">` type used pervasively (Lane C blast-radius), and conflicts with the decisions.md rule that favorite-style membership is a first-class row, not project metadata. Adopt Lane B's §6.2 join-table DDL **but per-user** (add `user_id`, per-user RLS, `unique(user_id, project_id)`). Lane B's composite-FK cascade discipline carries over unchanged. |
| **Cardinality: one-to-many vs many-to-many** | Lane B kept a many-to-many fallback; all lanes defaulted one-to-many | **RESOLVED → one-to-many (D1).** No lane preferred many-to-many; it's a future Tags feature. Single-membership keeps the flag metaphor, the `Set<string>` selection model, and the list query all clean. |
| **Group delete routing through `BulkDestructivePreviewModal`** | Lane B (optionally surface group impact in bulk-delete preview) **vs** Lanes A, C, E, F (keep groups out of the destructive modal) | **RESOLVED → keep out (D10).** Group delete is non-destructive and must not touch the concurrency-hot destructive modal / `bulk-action.ts` `targetType` union (owned by the in-flight delete-modal plan). Lightweight inline confirm only. Bulk-delete preview need not count group impact (membership is a join row, no cleanup). |
| **Does the bulk-assign action reuse the delete selection gate?** | Lane A & C (no — different permission surface) **vs** the default temptation to reuse `canSelectProjectForDeletion` | **RESOLVED → separate gate (D9).** Assignment permission is broader than delete permission; reusing the delete gate would wrongly block grouping of delete-blocked projects. |
| **Default organize mode: `date` vs `none`** | Lanes A & D lean `date` (preserve today's behavior) **vs** "calm `none`" alternative; Lane E defers to state lane | **ESCALATED → owner (Q1).** Genuine product/taste call. **Engineering default if owner is silent: `date` when the current/initial sort is a date field, else `none`** — preserves today's behavior for existing users with zero first-load change. |
| **Sort pair visibility in Group mode** | Lane E (keep Sort visible — orders within a group) **vs** hide-it alternative | **RESOLVED → keep Sort visible (per D4 composition rules).** Sort orders cards *within* each group; group order is the user's manual/`position` order; Ungrouped last. Zero extra UI, useful behavior. |
| **Empty named groups under Group mode** | Lane A & D & E (render empty named groups so users can fill them; hide only during search) | **RESOLVED → render empty named groups when not searching; hide empty (incl. Ungrouped) during active search.** Grouping util iterates the server group list, not just groups present in data. |
| **`h3` vs flex-`div` for the flag header (test-tag risk)** | Lane E raised it; date tests query by attribute | **RESOLVED → keep the `data-project-date-group-label` attribute on the header container; tests query by attribute, not tag, so a flex `div` is safe.** Confirm in the implementation PR; if any test asserts the tag, move the attribute onto an `<h3>` label span. |
| **Shared `WorkshopProjectListItem` / `ProjectListItem` type ownership** | Lane C & D & F: both Groups and the in-flight sidebar-favorites lane extend the same type | **RESOLVED → one PR/owner owns the type change (D3 + §6).** The repository + type + `page.tsx` prop change lands first as a tight additive diff; export a `ProjectGroupSummary` from the repository and import it in the client (do not redefine the shape client-side — the drift anti-pattern). |
| **Migration timestamp ordering** | Lane B & F: concurrent plans may add `20260616*` migrations | **RESOLVED → pick a timestamp strictly greater than `20260616120000` and any concurrent `20260616*` file at implementation time; re-`ls supabase/migrations | tail` before naming.** |
| **RLS policy packaging (two-policy split vs consolidated `FOR ALL`)** | Lane B flagged active convention churn (`consolidate`/`command_split` migrations) | **RESOLVED (convention, not logic) → ship the per-user `FOR ALL` form matching the live `project_favorites` policy (verified: single consolidated policy with `user_id = (select auth.uid()) AND is_workspace_member(...)`), and re-verify against the latest `command_split_*`/`consolidate_*` migration at implementation time.** Predicates are stable; only packaging may shift. |

No conflict required escalation beyond the four owner-only product questions in §4.

---

## 4. Owner preference defaults — RESOLVED 2026-06-16 (Philip)

All four were answered by the owner. **Three matched the engineering default; Q3 is an
override (accents ship in v1).** These are now binding inputs to the implementation plan.

1. **Default organize mode on first load.** ✅ **DECIDED: `date` when the current/initial
   in-memory sort field is a grouping sort — a date field (`updated_at`/`created_at`) **or**
   `client_name` — else `none`** (matches default). There is no persisted sort state, so first
   load computes `date` directly from the initial sort field; this preserves today's behavior —
   zero first-load change for existing users. (Q1 across Lanes A/D/E; matches `07` §1.1 and the
   README.)
2. **Caps.** ✅ **DECIDED: 50 groups per user / 40-char names, soft-capped with a clear
   at-limit message** (matches default). (Lane A/B.)
3. **Color accent in v1.** ⚠️ **DECIDED (OVERRIDE): ship the 8-swatch desaturated
   non-brand-orange palette IN v1** — not colorless-first. v1 includes `group-accent.ts`, accent
   selection in the Manage-groups popover, and accent rendering in `ProjectGroupSection`; the
   `accent_id` column is populated from day one. See updated **D13**. (Lane A/E.)
4. **Details-modal assignment path in MVP.** ✅ **DECIDED: kebab + bulk dock only for MVP**
   (matches default); the `ProjectDetailsModal` group field is a fast-follow — keeps Groups off
   the in-flight delete-modal hot path in `ProjectDetailsModal`. (Lane A/C/E.)

**Implicitly settled (do not re-ask unless the owner objects):** groups stay **off** the main
sidebar in v1 (favorites own that rail); group **reorder** ships only if the estimate-tree DnD
primitive is cheaply reusable, else `created_at`/`position` order with reorder as fast-follow;
**collapse** persistence is a fast-follow, not a launch blocker; **case-insensitive unique group
name per user/workspace** is enforced (prevents ambiguous duplicate flags).

---

## 5. Consolidated risk register (merged, deduped, ranked)

| Rank | Risk | Severity | Source lanes | Mitigation (canonical) |
|---|---|---|---|---|
| 1 | **Concurrency:** `projects-page-client.tsx`, `workspace-repository.ts`, `LiveProjectCard.tsx` are uncommitted and mid-edit by three in-flight efforts; starting Groups on the dirty tree guarantees merge conflicts and risks breaking the 5 RTL date-flag suites. | **HIGH** | A, C, D, E, F | **Sequence Groups AFTER C1 (sidebar-favorites) + C2 (delete-modal) + C3 (card links) land** (§6). DB-action-first, then a single client-refactor PR. Prefer new files; rebase-and-re-read before touching any HIGH/MEDIUM file. |
| 2 | **`projects-page-client.tsx` grouping↔sort decoupling:** date grouping is implicitly coupled to `isDateSortField`; introducing the `organizeBy` axis without breaking `data-project-date-group`, `data-project-date-group-label`, `aria-label="Live projects"`, or per-view flag-grid classes is the integration linchpin. | **HIGH** | A, C, D, E, F | Do the generalization + new mode in **one PR** (D6); keep the date path byte-identical via `legacySectionDataAttr` + `legacyHeaderDataAttr`; add Group cases as **new** test files, not edits to the churning suites. |
| 3 | **`workspace-repository.ts` is a hub (29 importers)** sharing `WorkshopProjectListItem` with the sidebar-favorites lane; a non-additive change ripples into homebase, project detail, estimates, library, publication, AI package-builder. | **HIGH** | B, C, D, F | Strictly additive: extend the `Promise.all`, add `groupId` + return `projectGroups`; never reorder/rename existing keys. One owner owns the shared-type edit (§3). |
| 4 | **Card kebab contended by three efforts** (Groups, delete-modal UX, sidebar favorites) on `LiveProjectCard.tsx` / `ProjectDetailsModal.tsx`. | **HIGH** | A | Build the kebab action menu **once**; attach the group affordance to the existing details-action menu, not the hover overlay (owned by C3). |
| 5 | **Wrong RLS/membership scope** could leak groups cross-user or cross-tenant if not cloned faithfully. | **MEDIUM** | C | Clone the **verified** per-user favorites RLS (`user_id = (select auth.uid()) AND is_workspace_member(workspace_id)`) **and harden it with the LD-1 `exists()` IDOR backstop** on membership insert — it is *cloned from favorites and hardened*, not byte-for-byte verbatim, since the backstop closes a cross-user-group IDOR favorites don't face; run `get_advisors` after apply. |
| 6 | **Group-assignment override staleness** (override encodes *which* group, not a boolean) can mask a later legitimate server-side move. | **MEDIUM** | D | Clear the override once SSR is authoritative for that id, tracked via `useTransition`'s `isPending` — **not** a (non-existent) `router.refresh().then()` (D14/LD-6). Deliberate divergence from favorites; add the interleaving regression test. |
| 7 | **`types.ts` regeneration race:** must apply the Groups migration after all pending `20260616*` migrations, then regen once; a stale/hand-edited file breaks every `Tables<…>` consumer. | **MEDIUM** | B, C | Sequence: apply ALL pending migrations → regenerate `types.ts` once → commit alongside the migration. Add a `gen:types` npm script. |
| 8 | **Modeling groups as a `projects` column** would multiply blast radius and violate the first-class-row precedent. | **MEDIUM** | B(self-flagged), C | Rejected by D3 — separate membership table. |
| 9 | **`ProjectDetailsModal` group field overlaps the delete-modal plan's `onDeleteProject` hot path.** | **MEDIUM** | A, C | Defer the details-modal field out of MVP (Q4 default); if shipped, land after C2 and coordinate the modal region. |
| 10 | **Shared-project groups would reopen a suppressed authorization decision** (decisions.md:762). | **MEDIUM** | A | `Your Projects` only in v1 (D11); disable `By group` on Shared. |
| 11 | **Dangling `groupId` (group deleted cross-tab)** could render a phantom section or crash the grouping util. | **MEDIUM** | D | Grouping util buckets unknown ids into Ungrouped (D12). |
| 12 | **Decoupling date grouping (the core UX change)** could silently regress today's month-flag behavior for all users. | **MEDIUM** | A | Keep `compareProjectsByDateOnly` path intact under `organizeBy === "date"`; date-mode regression tests stay green. **Re-gate ONLY `shouldGroupProjects` on `organizeBy`; the `!sortTouched && isDateSortField` date-*ordering* branch in `displayProjects` is SEPARATE and MUST stay untouched** — removing it regresses default newest-first order even in `organizeBy === "none"`. Add a regression assertion that `none` + untouched date sort still orders newest-first. |
| 13 | **Silent rollback** (favorites have no toast) is acceptable for a star but confusing for a reverted "move to group." | **LOW** | D | Wire a toast on group-mutation failure. `ToastProvider` is mounted in `providers.tsx` for production, **but RTL tests render `ProjectsPageClient` bare** — `useToast()` then returns `noopToastContext` (renders nothing). Any test asserting toast copy MUST wrap the render in `<ToastProvider>` (Phase 4 uses a `renderClient` helper); failure-path tests also assert the provider-independent rolled-back bucket state. |
| 14 | **Toolbar density:** a 3rd/4th control + per-flag affordances could overflow on narrow widths. | **LOW** | E | Icon-trigger `DropdownSelect` + `shrink-0`; reuse `PROJECT_TOOLBAR_SELECT_TRIGGER_CLASS`. |
| 15 | **Color-accent scope creep** into the neutral design system / brand-orange collision. **Accents ship in v1 (owner override), so this is LIVE, not mooted.** | **LOW→MED** | A, E | Enforce inline-`style`-only containment, desaturated non-orange set, `accent_id` token (no raw hex, no Tailwind color utilities, no accent on text); add a lint/review check that `group-accent.ts` is the only source of group color. |
| 16 | **RLS convention churn** (consolidate/command_split migrations) — writing the wrong policy packaging is cosmetic, not a security hole. | **LOW** | B | Re-verify the latest convention at implementation time; predicates are stable. |

**No CRITICAL business-operation risks.** There is no payment or destructive-project-data path in this feature. Treat auth/RLS and data-integrity as HIGH until the implementation has provider-backed negative RLS tests, generated types, and advisor output proving the per-user membership model.

---

## 6. Recommended build sequence & concurrency guidance

High-level only — the detailed TDD plan is the next deliverable (`07-implementation-plan` / task #3).

### 6.1 Global sequencing relative to in-flight work

The repo working tree is dirty on `codex/fix-project-delete` with three in-flight efforts.
**Land these first to freeze shared contracts, then build Groups on the stabilized surfaces:**

1. **C1 — Sidebar Favorite Projects & Estimates** (uncommitted): owns `workspace-repository.ts`
   (`listMainSidebarFavoriteProjects` `cache()` reader), `MainSidebar.tsx`, `sidebar-types.ts`,
   `WorkshopPageShell.tsx`. Freezes the `MainSidebarProps` shape + the `cache()`-reader convention.
2. **C2 — Delete-Project Modal UX** (`docs/plans/2026-06-16-003`): owns `BulkDestructivePreviewModal.tsx`
   copy + the `bulk-action.ts` `targetType`/`executeLabel` contract + the `projects-page-client.tsx`
   delete strings. Freezes the no-checker-language test contract.
3. **C3 — Project Card Favorite Sheet Links** (`docs/plans/2026-06-16-002`): owns `LiveProjectCard.tsx`
   hover overlay + date band. Freezes the card's internal layout.

(C4 route-deletion and C5 promote-detached-rows are non-overlapping / already merged.)

### 6.2 Project Groups build order (after the above land)

1. **DB + types foundation (isolated, low-risk).** New migration: `project_groups` +
   `project_group_memberships` (per-user, one-to-many, composite FK cascade, cloned favorites RLS,
   `UPDATE` grant, advisor-clean), timestamp later than all `20260616*`. Apply → run `get_advisors`
   → regenerate `types.ts` → add `gen:types` script. Barely touches contested UI files; review/merge independently.
2. **Server actions.** `setProjectGroupMembership`/`moveProjectToGroup` (clone `setProjectFavorite`:
   `assertUuid` → `ensureDefaultWorkspace` → workspace+user-scoped verify → upsert/delete →
   `revalidatePath("/workshop")` + `("/workshop/projects")`), plus `createProjectGroup`,
   `renameProjectGroup`, `deleteProjectGroup`, `reorderProjectGroups`, and a `bulkAssignProjectsToGroup`
   array action (one call, atomic optimistic apply/rollback — like `executeBulkDeleteProjects`).
3. **Repository read (additive).** Extend the `listCurrentWorkspaceProjects` `Promise.all` with the
   per-user `project_groups` + `project_group_memberships` fetch; build a `Map<projectId, groupId>`;
   stamp `groupId` in `createProjectListItem`; return `projectGroups: ProjectGroupSummary[]`. Extend
   `WorkshopProjectListItem` + client `ProjectListItem` with `groupId?: string | null` in one owned diff.
   Thread `projectGroups` through `page.tsx` (one-line, mirroring `favoriteProjectIds`).
4. **Client refactor (single focused PR).** Extract `ProjectGroupSection` + `project-grid-layout.ts`
   (date mode byte-identical); add the `organizeBy` toolbar control + persistence; add
   `groupProjectsByUserGroup` returning the same section shape; wire optimistic assignment
   (override-map + clear-after-refresh per D14); add the card kebab "Move to group" + bulk dock action
   + "Manage groups" popover. Add **new** test files for group-mode rendering; keep date suites green.
5. **Fast-follows (post-MVP).** Color accents (Q3), details-modal field (Q4), collapse persistence,
   group reorder DnD, sidebar surface, shared-project groups.

### 6.3 Rebase-before-edit discipline

Before touching any HIGH/MEDIUM file: `git fetch && git status`, `git diff <file>`, re-read the live
file (do **not** trust line numbers in any lane doc or the brief), confirm C1/C2/C3 have merged for the
files they own, and after any merge re-run `bunx vitest run tests/vitest/projects-page-*.test.tsx
tests/vitest/bulk-destructive-preview-modal.test.tsx tests/vitest/main-sidebar-favorites.test.tsx` +
`bun run type-check`. Prefer new files over editing churning shared files wherever behavior allows.

---

## 7. Package map

| Doc | Lane | Owns |
|---|---|---|
| [`00-synthesis-and-decisions.md`](./00-synthesis-and-decisions.md) | 0 — Reconciliation (this doc) | Canonical decisions, conflict resolutions, merged risk register, build sequence |
| [`01-product-spec-and-ux-flows.md`](./01-product-spec-and-ux-flows.md) | A — Product/UX | Feature definition, organize-by model, lifecycle UX, 9 edge-case walkthroughs, acceptance checklist, MVP cut |
| [`02-database-supabase-analysis.md`](./02-database-supabase-analysis.md) | B — Database/Supabase | DDL (default + fallback), RLS, cascade safety, advisor baseline, DRAFT migration, types-regen |
| [`03-blast-radius-impact-analysis.md`](./03-blast-radius-impact-analysis.md) | C — Blast-radius | Dependency map, per-file impact table, hub analysis (29 importers), test surfaces, concurrency collision map, sequencing |
| [`04-state-data-flow-analysis.md`](./04-state-data-flow-analysis.md) | D — State/Data-flow | SSR-not-Query model, favorites optimistic template, `organizeBy` state, override-staleness divergence, repository data shape |
| [`05-ui-reuse-and-design.md`](./05-ui-reuse-and-design.md) | E — UI/Design | `ProjectGroupSection` contract, toolbar control, manage-groups popover, accent palette, assignment markup, DESIGN.md compliance |
| [`06-prior-art-and-concurrency-watch.md`](./06-prior-art-and-concurrency-watch.md) | F — Prior-art/Concurrency | Favorites/archives/date-grouping prior art, in-flight plan map (C1–C5), conventions, vigilance/rebase checklist |
| [`07-implementation-plan-overview-and-contracts.md`](./07-implementation-plan-overview-and-contracts.md) | Implementation | Contracts spine — exact DB objects, TS types, server-action signatures, client contracts, test anchors |
| [`08-plan-phase-1-db-and-types.md`](./08-plan-phase-1-db-and-types.md) | Phase 1 | TDD plan — migration, RLS, grants, indexes, advisors, types regen |
| [`09-plan-phase-2-server-actions.md`](./09-plan-phase-2-server-actions.md) | Phase 2 | TDD plan — group CRUD + assignment + bulk actions, ownership gate, validation |
| [`10-plan-phase-3-repository-and-page.md`](./10-plan-phase-3-repository-and-page.md) | Phase 3 | TDD plan — additive repository read + page wiring |
| [`11-plan-phase-4-client-ui-and-tests.md`](./11-plan-phase-4-client-ui-and-tests.md) | Phase 4 | TDD plan — `ProjectGroupSection`, organize control, grouping util, optimistic assignment, kebab + bulk, Manage-groups popover, accents, full test matrix |
| [`12-adversarial-review.md`](./12-adversarial-review.md) | Review record | 6 reviewers, dispositions, FIX@IMPL integration record (§4) |
| [`13-requirements-traceability-and-qa-matrix.md`](./13-requirements-traceability-and-qa-matrix.md) | Traceability / Readiness | Requirement→task→test matrix, security-control sub-matrix, 100% scorecard |
| [`14-implementer-handoff-and-runbook.md`](./14-implementer-handoff-and-runbook.md) | Handoff | Single-worker entry point, `7a→7b→7c→7d` order, validation commands, STOP conditions, contract index |
| [`15-deploy-rollback-recovery-and-dod.md`](./15-deploy-rollback-recovery-and-dod.md) | Rollback / DoD | Migration apply order, per-phase DOWN/revert paths, RLS-proof runbook, per-phase Definition-of-Done |
| [`16-MASTER-IMPLEMENTATION-GUIDE.md`](./16-MASTER-IMPLEMENTATION-GUIDE.md) | Master guide (capstone) | The executable implementation plan the codebase AI follows: overview + architecture + tech stack, SWOT, cross-reference index, preconditions gate, Phase 1–4 with pros/cons + bite-sized TDD tasks bound to `07`, validation, STOP conditions, per-phase Definition-of-Done |

---

## 8. Verification performed (for this synthesis)

- Read all six lane docs in full and reconciled the database lane so no superseded
  `projects.group_id` or per-workspace default remains binding.
- **Corrected Lane B's favorites-ownership premise:** inspected `20260526013617_workshop_favorites.sql`
  — `project_favorites` is **per-user** (`user_id uuid not null`, `unique (user_id, project_id)`,
  RLS `user_id = (select auth.uid()) and is_workspace_member(workspace_id)`). This inverts Lane B's
  "per-workspace mirrors favorites" claim and decides D2 toward per-user.
- Confirmed **decisions.md** binding precedents: 2026-05-26 (favorites are first-class per-user rows,
  "must not be stored as project/estimate metadata booleans" → supports D2 + D3) and 2026-06-03
  (decisions.md:762 — shared favorites deliberately suppressed → supports D11).
- Confirmed **latest migration** is `20260616120000_promote_detached_estimate_rows_to_library.sql`
  (the Groups migration timestamp must exceed it) and that **no `project_group*` schema exists** (per Lane F's `rg` and Lane C's live `list_tables`).
- No app source, migrations, or DB writes performed. This plan pack is docs-only.
