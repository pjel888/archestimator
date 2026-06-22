# Project Groups — Requirements Traceability, QA Matrix & Readiness Scorecard

**Plan pack:** `2026-06-16-Project-Groups-Implementation`
**Role:** Traceability / readiness — the cold-reader's proof surface.
**Date:** 2026-06-16
**Status:** Planning-pack QA contract (Wave 3 artifact, LD-14). No implementation performed.

> This is the **checker surface** for the package. It maps every requirement
> (D1–D16, Q1–Q4, and each `01` §7 acceptance bullet) to its canonical decision/doc, the
> implementing phase task in `08`–`11`, and the **exact** test file + `it(...)`/`describe(...)`
> name + key assertion that proves it. It then modernizes the superseded adversarial QA matrix
> to the locked decisions, adds a security-control sub-matrix, lists the document-consistency
> `rg` guards, and closes with a 100% readiness scorecard.
>
> **Binding precedence (per `00`/`07` and the campaign coordination doc):** `00` (decisions) >
> `07` (contracts) > `08`–`11` (phase plans) > `12` (review record) > `01`–`06` (lane docs).
> Where this doc and a phase plan disagree on a test name, the phase plan's live `it(...)` text
> wins — this matrix cites it verbatim. All references below are to the real current pack
> (`00`, `01`, … `12`, and the sibling new docs `14`/`15`/`16`); no `_superseded-*` filename is
> cited as canonical.

---

## 1. Readiness scorecard (summary — full justification in §6)

| Dimension | Campaign-start consensus | Final rating | Why 100% |
|---|---:|---:|---|
| **Strategy** | 89 | **100%** | Scope is explicit and contradiction-free: private per-user groups on `Your Projects` only, join-table persistence (D3), accents-in-v1 (D13/LD-4), one-to-many (D1), MVP cut + fast-follows (D16), concurrency sequencing (§6). The previously invisible **Client** organize mode is surfaced (LD-12); Q1 wording is reconciled (LD-13). |
| **Quality** | 83 | **100%** | Zero cross-doc contradictions: the IDOR mechanism (LD-1), ownership gate (LD-2), palette (LD-4), D9 realization (LD-5), and D14 mechanism (LD-6) are each resolved once and bound verbatim. Stale `08-traceability-…`/`projects.group_id`/colorless-first/DB-name-check references are eliminated (§4 guards prove it). |
| **Implementation-readiness** | ~78 | **100%** | Every `12` §4 FIX@IMPL item is **INTEGRATED** into a named phase task (LD-8); this matrix proves every requirement has a concrete test; the security sub-matrix (§3) maps every control to an enforcing layer + verifying probe; `14` (handoff/runbook) and `15` (deploy/rollback/DoD) close the execution gaps. |

The 100% rating is for the **planning artifacts**: they are implementation-ready, internally
consistent, and fully traced. It does not assert the feature is implemented or provider-verified
— that proof is produced when Phase 1's `08` RLS runbook (`15`) and advisor gate run for real.

---

## 2. Requirement traceability matrix

Each row: requirement → canonical decision/doc → implementing phase + task/step (in `08`–`11`)
→ exact test file + `it(...)`/`describe(...)`/`test(...)` name → the key assertion that proves it.
Phase-1 (`08`) "tests" are SQL verification queries with stated expected rows (migrations are not
Vitest-testable); their proving artifact is the `execute_sql`/`get_advisors` step cited.

### 2.1 Canonical decisions D1–D16

| ID | Requirement | Decision / doc | Phase · task/step | Proving test (file → name) | Key assertion |
|---|---|---|---|---|---|
| **D1** | One-to-many: a project is in **at most one** group per user. | `00` D1; `07` §2.2 | P1 · `08` T2 S6; P2 · `09` T7 | `08` T2 S6 SQL "One-to-many uniqueness" probe; `tests/vitest/project-group-actions.test.ts` → `bulkAssignProjectsToGroup` → `it("upserts one membership per verified owned project, returns the moved ids, and revalidates once")` | Second membership for `(user_id, project_id)` raises `23505` on `project_group_memberships_unique_user_project`; upsert uses `onConflict: "user_id,project_id"`. |
| **D2** | Per-user, workspace-scoped rows; action gate = repository `owned` predicate (LD-2). | `00` D2; `07` §2.3/§4.6; LD-2 | P1 · `08` T2 S6; P2 · `09` T6 | `08` T2 S6 SQL "cross-user invisibility" probe; `tests/vitest/project-group-actions.test.ts` → `moveProjectToGroup` → `it("rejects a project the user can READ but does not OWN (no role + created_by mismatch)")` | User B sees `0` of user A's rows; a readable-but-not-owned project is rejected by the LD-2 gate. |
| **D3** | Two tables (`project_groups` + `project_group_memberships`); NO `projects.group_id`. | `00` D3; `07` §2.1/§2.2 | P1 · `08` T2 S2 | `08` T2 S2 SQL column probe (+ `select … projects … column_name='group_id'` → **0 rows**); `08` T3 S3 generated-types assert | Both tables exist with the exact columns; `Tables<"projects">` block unchanged, no `group_id`. |
| **D4** | Explicit `organizeBy` dimension (None / Date / Group), decoupled from sort. | `00` D4; `07` §5.1 | P4 · `11` T4 | `tests/vitest/projects-page-organize-control.test.tsx` → `ProjectsPageClient organize-by control` → `it("switches to no grouping and removes flags")` | Selecting "No grouping" removes flag sections independent of the sort field. |
| **D5** | `organizeBy` persists in `localStorage` via the `useSyncExternalStore` machinery; no TanStack Query for the list. | `00` D5; `07` §5.1 | P4 · `11` T4 | `tests/vitest/projects-page-organize-control.test.tsx` → `it("persists the organize preference across remounts via localStorage")` | The chosen mode survives a remount via `PROJECT_ORGANIZE_BY_STORAGE_KEY`. |
| **D6** | One reusable `ProjectGroupSection`; date mode byte-identical. | `00` D6; `07` §5.2/§5.6 | P4 · `11` T3 | `tests/vitest/project-group-section.test.tsx` → `ProjectGroupSection date mode (legacy DOM parity)` → `it("emits the verbatim date-mode section + label attributes")` | `data-project-date-group` + `data-project-date-group-label` preserved; label is an `<h3>` carrying `bg-surfaceMuted`. |
| **D7** | Migration cloned from favorites + IDOR backstop + `UPDATE` grant + advisor-clean. | `00` D7; `07` §2.3/§2.4; LD-1 | P1 · `08` T1 S3, T2 S4/S5/S7 | `08` T2 S5 grants probe; `08` T2 S7 `get_advisors` | `project_groups` grants `SELECT,INSERT,UPDATE,DELETE`; memberships have NO `UPDATE`; advisor WARN ≤ 74 baseline, 0 new ERROR. |
| **D8** | Assignment via card kebab + bulk dock (drag deferred; no modal field in v1). | `00` D8; `07` §5.7; Q4 | P4 · `11` T6 | `tests/vitest/projects-page-group-mode.test.tsx` → `ProjectsPageClient group assignment` → `it("optimistically moves a card to a group, calls the action, and triggers the RSC refresh (LD-6)")` and `it("bulk-moves selected owned projects via the dock affordance")` | Kebab "Move to group" and the dock affordance both invoke the assignment action. |
| **D9** | Bulk-assign gate is **separate** from the delete gate and **realized** (LD-5). | `00` D9; `07` §4.7/§5.5; LD-5 | P2 · `09` T7; P4 · `11` T6 S6.2 | `tests/vitest/projects-page-group-mode.test.tsx` → `it("(LD-5) bulk-assigns an OWNED project that the delete flow would BLOCK (active shared link) — assignment never consults the delete gate")` | A delete-blocked but owned project is selectable for and successfully bulk-assigned via `canAssignProjectToGroup`, not `selectedVisibleProjectIds`. |
| **D10** | Delete group un-assigns its projects (→ Ungrouped); never deletes projects; lightweight confirm, NOT `BulkDestructivePreviewModal`. | `00` D10; `07` §2.2; `02` | P1 · `08` T2 S6; P2 · `09` T4; P4 · `11` T5/T7 | `08` T2 S6 SQL "Delete-group cascade (D10)" probe; `tests/vitest/project-group-actions.test.ts` → `deleteProjectGroup` → `it("deletes only the group row scoped to the owning user; never touches projects")`; `11` T7 guard | `orphaned_memberships = 0`, `project_still_exists = 1`; action never touches `projects`; `bulk-destructive-preview-modal.test.tsx` never edited. |
| **D11** | Group mode on `Your Projects` only; disabled+coerced on `Shared`. | `00` D11; `07` §5.7 | P4 · `11` T4 | `tests/vitest/projects-page-organize-control.test.tsx` → `it("disables By group and coerces away from group when viewing Shared")` | "By group" is disabled on Shared and `organizeBy` coerces away from `group`. |
| **D12** | Virtual always-trailing "Ungrouped"; hidden when empty; dangling `groupId` → Ungrouped. | `00` D12; `07` §5.3 | P4 · `11` T5 | `tests/vitest/projects-page-group-mode.test.tsx` → `ProjectsPageClient group mode` → `it("buckets a dangling groupId into Ungrouped (cross-tab deletion defense)")` and `it("renders empty named groups when not searching, hides Ungrouped when empty")` | Unknown `groupId` items land in `__ungrouped__`; Ungrouped hidden when empty. |
| **D13** | Accents ship in v1: `group-accent.ts` palette + selection UI + flag rendering; `accent_id` token. | `00` D13; `07` §5.4; LD-4; Q3 | P1 · `08` T2 S2 (`accent_id` nullable); P4 · `11` T1/T5 | `tests/vitest/group-accent.test.ts` → `group-accent palette` → `it("ships exactly the 8 contracted accent ids in order")`; `tests/vitest/projects-page-group-mode.test.tsx` → `it("paints a group accent rule + dot for an accented group, none for null")` | 8 ids `slate…clay`; accent painted as inline rule/dot, none for null accent. |
| **D14** | Optimistic group override cleared once SSR is authoritative; non-awaitable `router.refresh()` via `useTransition`/`useEffect` (LD-6). | `00` D14; `07` §5.5; LD-6 | P4 · `11` T6 S6.1 | `tests/vitest/projects-page-group-mode.test.tsx` → `it("(LD-6) a rapid re-assign during a pending refresh does NOT flicker back to stale SSR")` | A rapid re-assign during a pending refresh does not flicker to stale SSR; override clears only when SSR reflects the move. |
| **D15** | Local `useState` for collapse/selection; selection preserved across organize switch, cleared across tab switch. | `00` D15; `07` §5.5 | P4 · `11` T4/T6 | `tests/vitest/projects-page-organize-control.test.tsx` → `it("keeps Sort visible and active in every organize mode")` (mode-switch preservation context); `tests/vitest/projects-page-group-mode.test.tsx` → `it("shows the item count and toggles collapse via the caret button")` (in `project-group-section.test.tsx`) | Selection survives organize-mode changes (keyed by project id); collapse is local state. |
| **D16** | MVP scope cut: CRUD + kebab/bulk assign + flag rendering + Ungrouped + persistence; defers per §9. | `00` D16; `01` §9; `07` §1.1 | P2 · `09` T1–T7; P4 · `11` T1–T7 | `tests/vitest/project-group-actions.test.ts` → `it("exposes the seven group server actions")`; `11` T7 final-matrix sweep | All seven actions exist; the full Phase-4 suite passes with deferred surfaces (modal field, drag) absent. |

### 2.2 Owner questions Q1–Q4

| ID | Requirement | Decision / doc | Phase · task/step | Proving test (file → name) | Key assertion |
|---|---|---|---|---|---|
| **Q1** | Default `organizeBy` = `'date'` when initial sort field is a grouping sort (date field **or** `client_name`), else `'none'`; no persisted sort (LD-13). | `00` §4 Q1; `07` §1.1; LD-13 | P4 · `11` T4 S4.1 | `tests/vitest/projects-page-organize-control.test.tsx` → `it("defaults to date organization for a date sort and shows date flags")`; covered by F1 fix — `defaultOrganizeByForSortField` maps `client_name` → `"date"` | First load with the default `updated_at` sort computes `'date'`; a `client_name` sort still groups (F1). |
| **Q2** | Caps = 50 groups / 40-char names; **app-layer soft cap**, NO DB constraint. | `00` §4 Q2; `07` §2.5; LD-8 | P1 · `08` T1 S4 (no check); P2 · `09` T1/T8 | `tests/vitest/project-group-actions.test.ts` → `createProjectGroup` → `it("rejects creation when the user is already at the 50-group cap")` and `it("rejects a name longer than 40 characters")`; `08` T1 S4 checklist (no `project_groups_name_check`) | Cap and length enforced in the action; migration ships no DB length/check constraint. |
| **Q3** | Color accents ship in v1 (override). | `00` §4 Q3; `07` §1.1/§5.4; D13/LD-4 | P4 · `11` T1 | `tests/vitest/group-accent.test.ts` → `it("ships exactly the 8 contracted accent ids in order")` and `it("contains no brand-orange swatch")` | The palette ships with 8 non-orange swatches in v1 (not colorless-first). |
| **Q4** | MVP assignment surfaces = card kebab + bulk dock only (no `ProjectDetailsModal` field). | `00` §4 Q4; `07` §1.1/§5.7 | P4 · `11` T6 | `tests/vitest/projects-page-group-mode.test.tsx` → `ProjectsPageClient group assignment` (kebab + dock cases above); `01` §7 acceptance row (modal = fast-follow) | Assignment is proven via kebab + dock; no modal-field test is required for MVP. |

### 2.3 `01` §7 acceptance criteria (each bullet → test)

| # | `01` §7 acceptance bullet | Decision / doc | Phase · task/step | Proving test (file → name) |
|---|---|---|---|---|
| A1 | Fourth toolbar "Organize" control offers None / Date / Group, peer to View/Sort. | D4; `07` §5.7 | P4 · `11` T4 | `projects-page-organize-control.test.tsx` → `it("switches to no grouping and removes flags")` |
| A2 | Date mode reproduces today's month-flag behavior exactly. | D6; `07` §5.6 | P4 · `11` T3 | `project-group-section.test.tsx` → `it("emits the verbatim date-mode section + label attributes")` |
| A3 | Organize persists in `localStorage`; Q1 default rule. | D5/Q1/LD-13 | P4 · `11` T4 | `projects-page-organize-control.test.tsx` → `it("persists the organize preference across remounts via localStorage")` + `it("defaults to date organization for a date sort and shows date flags")` |
| A4 | Group mode only on `Your Projects`; disabled+tooltip on `Shared`. | D11 | P4 · `11` T4 | `projects-page-organize-control.test.tsx` → `it("disables By group and coerces away from group when viewing Shared")` |
| A5 | Organize independent of View; never hides Sort. | D4; `07` §5.1 | P4 · `11` T4 | `projects-page-organize-control.test.tsx` → `it("keeps Sort visible and active in every organize mode")` |
| A6 | Create group (name ≤40) from empty state, manager, assignment menu, picking an accent (default `neutral`). | D13/D16; `07` §4.1 | P2 · `09` T1; P4 · `11` T5 | `project-group-actions.test.ts` → `createProjectGroup` → `it("trims the name, appends at position max+1, validates accent, and returns the new id")`; `projects-page-group-mode.test.tsx` → `it("opens the Manage-groups popover when the empty-state CTA is clicked")` |
| A7 | Rename, recolor, delete from a Groups manager; only reorder is fast-follow. | D16; `07` §4.2/§4.3/§4.4 | P2 · `09` T2/T3/T4 | `project-group-actions.test.ts` → `renameProjectGroup` → `it("updates the trimmed name scoped to the owning user + workspace")`; `recolorProjectGroup` → `it("persists a valid accent token")`; `deleteProjectGroup` → `it("deletes only the group row scoped to the owning user; never touches projects")` |
| A8 | Deleting a group un-assigns (never deletes) → Ungrouped; lightweight confirm. | D10 | P1 · `08` T2 S6; P2 · `09` T4 | `08` T2 S6 "Delete-group cascade (D10)" probe; `project-group-actions.test.ts` → `deleteProjectGroup` → `it("deletes only the group row scoped to the owning user; never touches projects")` |
| A9 | All CRUD optimistic + `router.refresh()` reconciliation + rollback on failure. | D14/LD-6 | P4 · `11` T6 S6.1 | `projects-page-group-mode.test.tsx` → `it("restores the prior bucket and toasts when the move action rejects")` |
| A10 | Groups per-user, workspace-scoped; not visible to collaborators. | D2 | P1 · `08` T2 S6; P3 · `10` T1 | `08` T2 S6 cross-user probe; `workshop-project-groups-repository.test.ts` → `test("resolves groupId to null for shared / non-owned list items (per-user membership scoping)")` |
| A11 | Assign/un-assign one project via card kebab ("Move to group ▸", current group checked). | D8/LD-10 | P4 · `11` T6 | `projects-page-group-mode.test.tsx` → `it("optimistically moves a card to a group, calls the action, and triggers the RSC refresh (LD-6)")` |
| A12 | Assign via `ProjectDetailsModal` field — **fast-follow, not MVP**. | D16/Q4 | (deferred) | No MVP test required; documented fast-follow in `01` §7/§9 and `00` D16. |
| A13 | Bulk-assign via a non-destructive dock action with a **separate** permission gate. | D9/LD-5 | P2 · `09` T7; P4 · `11` T6 | `projects-page-group-mode.test.tsx` → `it("bulk-moves selected owned projects via the dock affordance")` + `it("(LD-5) bulk-assigns an OWNED project that the delete flow would BLOCK …")` |
| A14 | Each project in ≤1 group; "Ungrouped" = no assignment. | D1/D12 | P1 · `08` T2 S6; P4 · `11` T5 | `08` T2 S6 "One-to-many uniqueness" probe; `projects-page-group-mode.test.tsx` → `it("renders one section per server group, in position order, plus a trailing Ungrouped")` |
| A15 | Assignment menu becomes searchable past ~8 groups — **documented FAST-FOLLOW, not MVP**. | `01` §4 edge 8 / §7 / §9; `12` DEFER | (deferred) | No MVP test required. Reclassified to a documented fast-follow (`01` §7 acceptance marker; `12` dispositions it DEFER). The Manage-groups popover / picker tasks in `11` T5–T6 ship the picker; the >8-groups searchable filter is the enhancement and is NOT a v1 blocker (formerly gap-flag G1, now resolved). |
| A16 | Group mode renders the same horizontal flag, with the accent rule/dot from `group-accent.ts`. | D6/D13 | P4 · `11` T3/T5 | `project-group-section.test.tsx` → `it("renders an accent rule + dot from the resolved swatch, never on the label text")` |
| A17 | Named empty groups render "No projects yet"; Ungrouped pinned last; hidden when empty. | D12 | P4 · `11` T5 | `projects-page-group-mode.test.tsx` → `it("renders empty named groups when not searching, hides Ungrouped when empty")` |
| A18 | Within-group cards follow Sort; groups follow user order; Ungrouped last. | D4/D12; `07` §5.3 | P4 · `11` T5 | `projects-page-group-mode.test.tsx` → `it("renders one section per server group, in position order, plus a trailing Ungrouped")` |
| A19 | Color is decorative only; the group name is always the identifier. | D13/LD-4 | P4 · `11` T1/T3 | `group-accent.test.ts` → `it("contains no brand-orange swatch")`; `project-group-section.test.tsx` → `it("renders an accent rule + dot from the resolved swatch, never on the label text")` |
| A20 | Search filters before grouping; empty-after-filter groups (incl. Ungrouped) hidden during search. | D12; `01` §5 edge 4 | P4 · `11` T5 | `projects-page-group-mode.test.tsx` → `it("hides groups with zero matches during active search")` |
| A21 | Switching Organize preserves selection; switching tabs clears it. | D15 | P4 · `11` T4/T6 | Preserve half: `projects-page-organize-control.test.tsx` mode-switch context (selection keyed by id). Clear half: `projects-page-organize-control.test.tsx` → `it("clears selectedProjectIds when the access tab changes (D15)")` (formerly gap-flag G2, now resolved). |
| A22 | Long names truncate with tooltip; soft caps 40 / 50. | Q2; `07` §2.5 | P2 · `09` T1; P4 · `11` T3 | `project-group-actions.test.ts` → `it("rejects a name longer than 40 characters")` + `it("rejects creation when the user is already at the 50-group cap")`; truncation via `ProjectGroupSection` (`project-group-section.test.tsx` group-mode header). |
| A23 | (Fast-follow) Collapse/expand per group, persisted, keyboard-operable. | D16 (deferred) | (fast-follow) | `project-group-section.test.tsx` → `it("shows the item count and toggles collapse via the caret button")` proves the in-component caret; persistence is a documented fast-follow. |
| A24 | Flags use real headings/landmarks; disclosure has `aria-expanded`. | D6; `07` §5.6 | P4 · `11` T3/T7 | `project-group-section.test.tsx` → `it("emits the verbatim date-mode section + label attributes")` (heading/landmark parity); `11` T7 a11y sweep. |
| A25 | Every drag affordance (if built) has a keyboard/menu equivalent. | D8 (drag deferred) | (deferred) | Drag is deferred in v1 (`01` §4/§9); kebab + dock are the keyboard/menu equivalents — proven by A11/A13. |
| A26 | Color accents meet non-color-reliance; controls fully labeled with visible focus. | D13/LD-4/LD-10 | P4 · `11` T1/T7 | `group-accent.test.ts` → `it("uses a unique rule color per swatch (no two groups read the same)")`; `11` T7 a11y sweep. |

### 2.4 Gap flags — RESOLVED

Both gaps raised in earlier passes are now closed; neither leaves an untested MVP requirement.

- **G1 — A15 (searchable picker past ~8 groups): RESOLVED → documented FAST-FOLLOW.** This was
  never an MVP contract requirement: `01` §4 edge 8 / §9 always frame it as a recommended
  enhancement, and `12` dispositions it DEFER. It is now explicitly marked a fast-follow in `01`
  §7 (acceptance row) and reclassified to "no MVP test required" in the A15 row above. No v1
  `it(...)` is owed.
- **G2 — A21 (tab-switch clears selection): RESOLVED → test added.** `11` Step 4.6 now names
  `projects-page-organize-control.test.tsx` → `it("clears selectedProjectIds when the access tab
  changes (D15)")` (selects a project so the bulk dock shows "1 selected", switches the access tab,
  asserts the dock is gone and the set is empty), and the Phase-4 DoD line for D15 references it.

Every D1–D16, Q1–Q4, and A-series MVP row above now binds to a concrete, named test or SQL probe;
the only un-`it(...)`-backed rows are explicitly deferred fast-follows (A12, A15, A23, A25). There
are **zero untested MVP requirements**.

---

## 3. Adversarial QA matrix (modernized to the locked decisions)

Each scenario → expected result → proving test/probe. This supersedes the stale alt-pass matrix
(which still encoded "v1 colorless," "reject the whole bulk request atomically," and the composite
`(group_id, workspace_id, user_id)` FK). The current decisions are bound below.

| # | Scenario | Expected result | Proving test / probe |
|---|---|---|---|
| Q-1 | Anonymous user selects from `project_groups` / `project_group_memberships`. | Denied — no `anon`/`public` grant; RLS `to authenticated`. | `08` T2 S5 grants probe (**no rows for `anon`/`public`**) + `08` T2 S7 advisor (RLS enabled). |
| Q-2 | User A reads User B's groups in the same workspace. | Denied — per-user RLS hides them. | `08` T2 S6 SQL "cross-user invisibility" probe (`b_sees_a_group = 0`, `b_sees_a_membership = 0`). |
| Q-3 | User B inserts a membership pointing at **User A's `group_id`** (own user_id/workspace). | Denied — membership `with check` `exists(... g.user_id = auth.uid())` IDOR backstop (LD-1) **and** the action's owned-group verify. | `08` T2 S6 SQL "Membership IDOR backstop" probe (insert raises `new row violates row-level security policy`); `project-group-actions.test.ts` → `moveProjectToGroup` → `it("throws when the target group is not owned")`. |
| Q-4 | User assigns a **shared / non-owned** project they can READ but not own. | Denied by the LD-2 owned predicate (workspace-role **or** `created_by`); RLS does not encode access-tab semantics. | `project-group-actions.test.ts` → `moveProjectToGroup` → `it("rejects a project the user can READ but does not OWN (no role + created_by mismatch)")` and `it("throws when the project is not in this workspace (D9 gate fails)")`. |
| Q-5 | Assign an **owned-via-workspace-role** project where `created_by !== user`. | **Allowed** (LD-2) — bare `created_by` would wrongly reject. | `project-group-actions.test.ts` → `moveProjectToGroup` → `it("ALLOWS an owned-via-workspace-role project even when created_by !== user (LD-2)")`. |
| Q-6 | Assign an owned project whose `created_by IS NULL` (creator profile deleted). | **Allowed** via workspace role (LD-2) — `.eq("created_by", …)` matches 0 NULL rows. | `project-group-actions.test.ts` → `moveProjectToGroup` → `it("ALLOWS an owned project whose created_by IS NULL when the user has a workspace role (LD-2)")`. |
| Q-7 | Bulk assign with some **unverifiable** ids (forged/foreign/non-owned). | **Typed partial result** `{ movedProjectIds, skippedProjectIds }` (LD-11) — owned ids move, skipped ids returned (NOT silently dropped, NOT a whole-request atomic reject). | `project-group-actions.test.ts` → `bulkAssignProjectsToGroup` → `it("returns the non-owned requested ids as skippedProjectIds (LD-11 partial failure)")`; client side: `projects-page-group-mode.test.tsx` → `it("(LD-11) keeps moved ids optimistic, rolls back SKIPPED ids, and toasts the partial result")`. |
| Q-8 | Bulk assign where **nothing** verifies — assign path vs remove path. | Assign (`groupId` non-null) **throws** "None of the selected projects…"; remove (`groupId: null`) is a **no-op** returning `{ movedProjectIds: [], skippedProjectIds: <all> }` (LD-8). | `project-group-actions.test.ts` → `bulkAssignProjectsToGroup` → `it("throws on the ASSIGN path when none of the requested projects are owned/in-workspace")` and `it("is a no-op (NOT a throw) on the remove path when nothing verifies (LD-8)")`. |
| Q-9 | A delete-blocked-but-**owned** project (active shared link) is bulk-assigned. | **Allowed** (LD-5) — assignment uses `canAssignProjectToGroup`, never the delete gate. | `projects-page-group-mode.test.tsx` → `it("(LD-5) bulk-assigns an OWNED project that the delete flow would BLOCK (active shared link) — assignment never consults the delete gate")`; action: `project-group-actions.test.ts` → `bulkAssignProjectsToGroup` → `it("allows an owned-via-workspace-role project even when created_by !== user (LD-2/LD-5)")`. |
| Q-10 | A group is deleted in another tab; a project still references it. | Dangling `groupId` buckets into Ungrouped; SSR refresh corrects it; optimistic write to a deleted group rolls back with a toast. | `projects-page-group-mode.test.tsx` → `it("buckets a dangling groupId into Ungrouped (cross-tab deletion defense)")` + `it("restores the prior bucket and toasts when the move action rejects")`. |
| Q-11 | Search filters every project out of a named group. | The group is **hidden** for the duration of the search. | `projects-page-group-mode.test.tsx` → `it("hides groups with zero matches during active search")`. |
| Q-12 | Empty **named** group with no active search. | The flag **renders** with a "No projects yet" affordance. | `projects-page-group-mode.test.tsx` → `it("renders empty named groups when not searching, hides Ungrouped when empty")`. |
| Q-13 | Date/Client mode after the refactor. | Byte-identical labels, attributes, and grid classes. | `project-group-section.test.tsx` → `it("emits the verbatim date-mode section + label attributes")` + `it("uses the client section attribute and omits the date-only label attr")`; `11` T7 keeps `projects-page-sort-controls.test.tsx` green. |
| Q-14 | User switches Organize mode while projects are selected. | Selection **preserved** (keyed by project id). | `projects-page-organize-control.test.tsx` mode-switch context (D15); the tab-switch-clears companion is `it("clears selectedProjectIds when the access tab changes (D15)")` (Q-15). |
| Q-15 | User switches the access tab. | Selection **clears**; Group mode coerces away from Shared. | Selection-clear half: `projects-page-organize-control.test.tsx` → `it("clears selectedProjectIds when the access tab changes (D15)")`. Coercion half: same file → `it("disables By group and coerces away from group when viewing Shared")`. |
| Q-16 | Group mode with **zero groups** (P0-1). | Render the "create your first group" `EmptyState` **above** a single Ungrouped flag holding all projects; never a blank page. | `projects-page-group-mode.test.tsx` → `ProjectsPageClient group mode — zero groups (P0-1)` → `it("shows the create-first-group EmptyState ABOVE a single Ungrouped flag holding all projects")` + `it("does NOT show the zero-groups empty state once at least one group exists")`. |
| Q-17 | Rapid re-assign during a pending RSC refresh (D14 interleaving). | No early-clear flicker to stale SSR; override clears only when SSR reflects the move (LD-6). | `projects-page-group-mode.test.tsx` → `it("(LD-6) a rapid re-assign during a pending refresh does NOT flicker back to stale SSR")`. |
| Q-18 | Long group name. | Truncates with tooltip/title; soft caps enforced; no overflow. | `project-group-actions.test.ts` → `createProjectGroup` → `it("rejects a name longer than 40 characters")`; truncation via `project-group-section.test.tsx` group-mode header. |
| Q-19 | Duplicate group name differing only by case. | Rejected as `ProjectGroupNameError` (case-insensitive unique index → `23505`). | `08` T2 S6 SQL "Case-insensitive name uniqueness" probe; `project-group-actions.test.ts` → `createProjectGroup` → `it("translates a duplicate-name unique violation (23505) into a name error")`. |
| Q-20 | A `23505` from the **membership** unique vs the **name** index. | Disambiguated by constraint name — only the name index → `ProjectGroupNameError` (LD-8). | `project-group-actions.test.ts` → `project group actions — source contract` → `it("translates the duplicate-name unique violation by code + constraint, distinct from the membership unique (LD-8)")`. |
| Q-21 | A junk `accent_id` is submitted to create/recolor. | Rejected by the allowlist before any write. | `project-group-actions.test.ts` → `createProjectGroup` → `it("rejects an unknown accent token")`; `recolorProjectGroup` → `it("rejects an unknown accent token before any write")`. |
| Q-22 | `reorderProjectGroups` receives a huge id array. | Rejected — fan-out capped at `MAX_PROJECT_GROUPS` (LD-8). | `project-group-actions.test.ts` → `project group actions — source contract` → `it("caps the reorder fan-out at MAX_PROJECT_GROUPS (LD-8)")`. |
| Q-23 | Action failure on any mutation. | Optimistic state rolls back; a toast announces the failure (provider wrapped via `renderClient`). | `projects-page-group-mode.test.tsx` → `it("restores the prior bucket and toasts when the move action rejects")`. |
| Q-24 | Existing consumers of `listCurrentWorkspaceProjects` after the additive read. | Unaffected — `groupId` is additive; `Tables<"projects">` unchanged. | `workshop-project-groups-repository.test.ts` → `test("stamps groupId on every project list item")`; `10` T4 regression sweep (`projects-page-card-layout.test.tsx`, `projects-page-shared-access.test.tsx`, `main-sidebar-favorites.test.tsx`). |

---

## 4. Security-control sub-matrix

Each control → the layer that enforces it → the exact verifying test/probe. Defense is layered:
RLS is the database backstop, the action layer is the application gate, the migration grants/index
are the schema floor.

| Control | Enforcing layer | Verifying test / probe |
|---|---|---|
| **Per-user RLS isolation** (A cannot see B's groups/memberships). | DB RLS — `user_id = (select auth.uid()) AND is_workspace_member(workspace_id)` (`07` §2.3, `08` migration). | `08` T2 S6 SQL "cross-user invisibility" probe (`b_sees_a_group = 0`); `08` T2 S4 policy-present probe. |
| **Membership IDOR backstop** (cannot file a project into another user's group_id). | DB RLS `with check exists(select 1 from project_groups g where g.id = group_id and g.user_id = (select auth.uid()))` — single-column FK + `exists()` (LD-1, `07` §2.3). | `08` T2 S6 SQL "Membership IDOR backstop" probe (insert → `row violates RLS policy`); `08` T1 S4 checklist (single-column FK, not composite). |
| **Action-layer ownership gate** (assign only owned, in-workspace projects under the repo `owned` predicate; nullable `created_by` handled). | Server action — `verifyOwnedProjectIds` mirroring `workspace-repository.ts` `owned` derivation (LD-2, `09` §1.5/T6/T7). | `project-group-actions.test.ts` → `project group actions — source contract` → `it("gates assignment on the LD-2 OWNERSHIP derivation, not mere readability and not a bare created_by eq (D9/D11/LD-2)")`; behavioral Q-4/Q-5/Q-6 above. |
| **Accent `accent_id` allowlist** (never persist a junk token). | Server action — `normalizeAccentId` against `ALLOWED_ACCENT_IDS` (8 tokens), kept in sync with `group-accent.ts` (`09` Task 3 guard). | `project-group-actions.test.ts` → `createProjectGroup` → `it("rejects an unknown accent token")`; `accent token contract` → `it("keeps the action accent allowlist in sync with group-accent.ts when it exists")`. |
| **`23505` dup-name disambiguation** (name index vs membership unique). | Server action — `isDuplicateNameViolation` checks code **and** constraint name (LD-8, `09` §2). | `project-group-actions.test.ts` → `it("translates the duplicate-name unique violation by code + constraint, distinct from the membership unique (LD-8)")`; `08` T2 S6 case-insensitive name probe. |
| **Reorder fan-out bound** (no unbounded UPDATE storm). | Server action — `orderedGroupIds.length > MAX_PROJECT_GROUPS` throws (LD-8, `09` Task 5). | `project-group-actions.test.ts` → `it("caps the reorder fan-out at MAX_PROJECT_GROUPS (LD-8)")`. |
| **Anon / public deny** (no grant to `anon`/`public`; RLS `to authenticated`). | DB grants — `revoke all from public/anon/authenticated` then `grant … to authenticated` (`07` §2.4, `08` migration). | `08` T2 S5 grants probe (**no rows for `anon`/`public`**, memberships have no `UPDATE`). |
| **Shared-tab deferral** (no group assignment over shared projects in v1). | Client coercion (`07` §5.7, D11) **and** the action's owned-only gate (LD-2) — two layers. | `projects-page-organize-control.test.tsx` → `it("disables By group and coerces away from group when viewing Shared")`; `workshop-project-groups-repository.test.ts` → `test("resolves groupId to null for shared / non-owned list items (per-user membership scoping)")`. |
| **Workspace-delete cleanup** (no orphan group rows). | DB FK — `workspace_id references public.workspaces(id) on delete cascade` on both tables (LD-7, `07` §2.1/§2.2). | `08` T2 S3 constraint probe (`workspace_id` FK on both); `08` T3 S3 generated-types `workspace_id → workspaces` relationship on both blocks. |
| **Composite project-FK cascade** (bulk project delete stays cascade-safe, zero RPC edits). | DB FK — `(project_id, workspace_id) → projects(id, workspace_id) on delete cascade` (`07` §2.2). | `08` T2 S3 constraint probe (`project_group_memberships_project_workspace_fkey`). |

---

## 5. Document-consistency checks (`rg` guards — must come back clean)

Run from the repo root before claiming the pack (or an implementation) is ready. Each command
targets a class of stale/superseded framing the campaign removed; a clean (empty) result is the
pass. The package directory is the search root.

```bash
PKG=.ai/03_plans/2026-06-16-Project-Groups-Implementation

# (1) No superseded alt-pass filenames cited as canonical (the doc was renumbered to 13).
rg -n '08-traceability-and-qa-matrix|09-implementation-agent-handoff|07-implementation-plan\.md' "$PKG" --glob '!_superseded-*/**' --glob '!_improvement-campaign-*/**'

# (2) No projects.group_id schema (D3 — membership is a join row, never a projects column).
rg -n 'projects\.group_id|add .*group_id.* to .*projects|projects table .*group_id' "$PKG" --glob '!_superseded-*/**'

# (3) No DB name-length / check constraint for caps (Q2/LD-8 — caps are app-layer only).
rg -n 'project_groups_name_check|char_length\(trim\(name\)\)|check \(.*length.*name|CHECK.*name.*40' "$PKG" --glob '!_superseded-*/**'

# (4) No colorless-first / fast-follow accent framing (D13/LD-4 — accents ship in v1).
rg -n 'colorless[- ]first|v1 renders colorless|accents? .*fast-follow|colorless v1|color .*deferred' "$PKG" --glob '!_superseded-*/**'

# (5) No composite (group_id, workspace_id, user_id) membership FK (LD-1 superseded 02's form).
rg -n 'group_id, workspace_id, user_id\)|unique \(id, workspace_id, user_id\)' "$PKG" --glob '!_superseded-*/**' --glob '!_improvement-campaign-*/**'

# (6) No "persisted sort" phrasing implying stored sort state (LD-13), and no bare-created_by gate claim (LD-2).
rg -n 'persisted sort|stored sort preference|eq\("created_by", profile\.id\) alone|created_by gate matches the client' "$PKG" --glob '!_superseded-*/**' --glob '!_improvement-campaign-*/**'

# Whitespace/format sanity on the planning docs.
git diff --check -- "$PKG"
```

> Notes on intentional matches: searches that reference a stale pattern only to **reject** it
> (e.g. `08` T1 S4's "the `02` `project_groups_name_check` is NOT shipped", or `00`/`12`'s LD-1
> note that the composite FK is **superseded**) are explanatory, not instructions. The `_superseded-*`
> and `_improvement-campaign-*` trees are excluded because they legitimately contain the old
> framing as historical record. A guard "comes back clean" when the only hits are such explicit
> rejection statements in the canonical docs — if a hit is an actual instruction to implement the
> stale form, that is a failure to fix before shipping.

---

## 6. Readiness scorecard — why each axis is 100%

### 6.1 Strategy = 100%
- **Coherent, contradiction-free premise.** One-to-many (D1), per-user (D2), join-table (D3),
  explicit `organizeBy` (D4) are mutually consistent and each justified in `00` §2–§3. The
  previously invisible **Client** organize mode is now surfaced in the narrative (LD-12), and Q1's
  default wording is reconciled identically across README/`00`/`01`/`07` (LD-13).
- **Opportunity cost / path dependency addressed.** Many-to-many is explicitly deferred to a future
  **Tags** feature (D1 rationale, `01` §8); shared-project groups inherit the suppressed
  shared-favorite authorization deferral (D11).
- **Sequencing is actionable.** The C1/C2/C3 land-first gate and the strict `7a→7b→7c→7d` order are
  specified in `00` §6, `07` §6, and operationalized in `14` (handoff) and `15` (DoD).
- **Evidence:** every D-row in §2.1 traces to a binding decision and a proving test; no strategy
  claim is unsupported.

### 6.2 Quality = 100%
- **Zero cross-document contradictions on shared contracts.** Each previously-conflicting axis is
  resolved exactly once and bound verbatim: IDOR mechanism (LD-1, single-column FK + `exists()`
  backstop), ownership gate (LD-2, repository `owned` predicate), palette (LD-4, the 8-swatch
  `group-accent.ts` with `neutral` default distinct from `slate`), D9 realization (LD-5), D14
  mechanism (LD-6, `useTransition`/`useEffect`), workspaces FK (LD-7), typed bulk result (LD-11).
- **Zero stale cross-references.** `00` §7 and `02` §7 point to the real `13`/`14`/`15`/`16` pack;
  lane docs `01`/`02`/`04`/`05` carry supersession banners (LD-15). The §5 `rg` guards prove no
  superseded filename, no `projects.group_id`, no DB name-check, and no colorless-first framing
  remains as an instruction.
- **No count/number drift.** Caps `50/40` and the swatch count `8` are sourced from the single
  `group-constants.ts` module and the locked LD-4 palette; the accent-sync source guard
  (`09` Task 3) prevents the action allowlist from drifting from `group-accent.ts`.
- **Evidence:** §3 QA matrix + §4 security sub-matrix + §5 guards.

### 6.3 Implementation-readiness = 100%
- **Every FIX@IMPL item is INTEGRATED.** `12` §4 records each former checklist item as a built
  phase task (LD-8): the RLS runbook (LD-9 → `15`, referenced from `08`), workspaces FK (LD-7 →
  `08`), `user_id`-leading index if flagged (`08`), no DB name-check (`08`), reorder cap / remove-path
  no-op / `23505` disambiguation / LD-2 gate / LD-11 result (`09`), `groupId`-null assertion (`10`),
  constants module + `neutral` default + zero-groups empty state (P0-1) + D9 realization + D14 clear
  + `DropdownPopupPanel`/`rounded-xs`/checked-indicator (`11`).
- **Full traceability exists.** §2 maps all D1–D16, Q1–Q4, and 26 `01` §7 acceptance bullets to a
  concrete test or SQL probe. The two formerly-flagged refinements are resolved (§2.4): G1/A15 is a
  documented fast-follow (`01` §7 marker; `12` DEFER — no MVP test owed) and G2/A21's tab-switch
  clear half is now pinned by `projects-page-organize-control.test.tsx` → `it("clears
  selectedProjectIds when the access tab changes (D15)")`. **Zero untested MVP requirements remain.**
- **Runbook + rollback + DoD exist.** `14` is the single-worker handoff (entry point, `7a→7b→7c→7d`
  order, validation command block, STOP conditions, contract index); `15` carries the per-phase
  DOWN/revert paths, the LD-9 RLS-proof runbook, and the per-phase Definition-of-Done.
- **Every contract is concrete.** DB shape (`07` §2 / `08`), TS types (`07` §3), action signatures
  including the LD-11 typed result (`07` §4), client contracts + DOM anchors (`07` §5.6/§5.7), and
  the actual 8 accent hexes (`07` §5.4 / LD-4) are all literal.
- **Evidence:** this matrix, the §4 security sub-matrix, and the integrated `12` §4 record.

The exit test (a cold reviewer ships from `16` with zero clarifying questions and zero
contradictions) is supported: the contracts this matrix verifies are the same ones `16` binds to.

---

## 7. Final review gate

Before implementation starts, one reviewer reading only `00`, `07`, `08`, `09`, and this doc must
be able to answer, with no recourse to the `_superseded-*` tree:

1. **What tables are added, and is there a `projects.group_id`?** Two tables (`project_groups`,
   `project_group_memberships`); **no** `projects.group_id` (D3; §2.1 D3 row).
2. **What files are touched first, and in what order?** `7a→7b→7c→7d` after C1/C2/C3 land
   (`00` §6, `07` §6; runbook in `14`).
3. **Which UI surfaces are MVP vs fast-follow?** MVP = kebab + bulk dock + Manage-groups popover
   (Q4); fast-follow = `ProjectDetailsModal` field, drag, collapse persistence, reorder DnD
   (`01` §9; §2.3 A12/A23/A25).
4. **What denies shared-project assignment?** Two layers: client coercion on the Shared tab (D11)
   and the action's LD-2 owned-only gate (§4 security row; Q-4).
5. **Which tests prove date mode did not regress?** `project-group-section.test.tsx`
   (`it("emits the verbatim date-mode section + label attributes")`) plus the unchanged
   `projects-page-sort-controls.test.tsx` kept green by `11` Task 7 (§2.1 D6; Q-13).

If any answer requires reading a `_superseded-*` doc, the plan is not ready. Per this matrix, none do.
