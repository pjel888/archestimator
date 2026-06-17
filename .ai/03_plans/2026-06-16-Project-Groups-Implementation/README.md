# Project Groups — Implementation Readiness Package

> **Status: Implementation-ready** (after the three in-flight branches land — see §5).
> The prior adversarial-review FIX@IMPL backlog is now **integrated into the phase plans**
> (`08`–`11`) rather than left as a pre-start checklist, and readiness is evidenced by the
> requirements→test **traceability matrix** (`13`), the **implementer handoff/runbook** (`14`),
> and the **rollback/recovery + per-phase definition-of-done** (`15`). This is an audit /
> readiness / planning package. **No app code, migrations, or DB mutations were performed.**
> Produced 2026-06-16 by a multi-agent analysis → reconciliation → planning →
> adversarial-review pipeline, with owner decisions locked in by Philip.

## What this feature is

**Project Groups** lets a user define named, ordered, color-accented buckets on
`/workshop/projects` and view the project wall organized by them — **reusing the exact
horizontal-flag treatment already proven for "organize by date."** Structurally it is a third
**"organize by"** mode (None / Date / Group) on the existing page, plus a **per-user** membership
relation cloned from the just-shipped **Favorites** feature. It is **not** a new route, **not** a
new access tab, and **not** a destructive operation.

## Locked owner decisions (2026-06-16)

| # | Question | Decision |
|---|---|---|
| Q1 | Default organize mode on first load | `organizeBy` = **Date** when the current/initial in-memory sort field is a grouping sort — a date field (`updated_at`/`created_at`) *or* `client_name` — else **None**. There is **no persisted sort**; `sortField` initializes to `updated_at`, so first load computes **Date** (zero first-load change). |
| Q2 | Limits | **50 groups / 40-char names**, soft-capped with a clear at-limit message |
| Q3 | Color accents in v1 | **Ship the 8-swatch palette in v1** *(owner override of the colorless-first default)* |
| Q4 | MVP assignment surfaces | **Card kebab + bulk dock only** (no `ProjectDetailsModal` group field in v1) |

## Canonical architecture (the binding spine)

1. **Per-user, workspace-scoped** groups, mirroring `project_favorites` exactly (RLS:
   `user_id = (select auth.uid()) AND is_workspace_member(workspace_id)`). A private layer, not shared.
2. **Two new tables** — `project_groups` (definitions) + `project_group_memberships` (per-user join).
   **No `group_id` column on `projects`** (keeps `Tables<"projects">` untouched).
3. **One-to-many** — a project is in at most one group (DB-enforced `unique(user_id, project_id)`).
4. **Explicit `organizeBy` axis** (None/Date/Group) as a peer toolbar control; **grouping is decoupled
   from the sort field** (the highest-leverage refactor). Date/Client grouping stays byte-identical.
5. **One reusable `ProjectGroupSection`** renders both date *and* user grouping (date-mode DOM preserved
   via `legacyHeaderDataAttr`).
6. **Mirror the Favorites mutation pattern** — `setProjectFavorite`-shaped server actions, additive fetch
   in `listCurrentWorkspaceProjects`'s `Promise.all`, optimistic override + `router.refresh()` (with a
   **clear-after-refresh** divergence for group moves, D14).
7. **Migration cloned from `20260526013617_workshop_favorites.sql`** — composite FK
   `(project_id, workspace_id) ON DELETE CASCADE`, per-user initplan RLS, narrowed grants **with UPDATE**,
   advisor-clean; regenerate `types.ts` after apply.
8. **Server actions enforce ownership** using the repository's `owned` predicate — workspace-role
   membership **OR** `created_by = profile.id` (handling nullable `created_by`), broader than the delete gate (D9).
9. **Accents ship in v1** — `group-accent.ts` 8-swatch desaturated non-brand-orange palette, inline-style
   only, `accent_id` token (not raw hex), labels stay `text-secondary` (#5D5D5D) for AA.
10. **v1 = Your Projects only**; "By group" disabled on the Shared tab (inherits the suppressed
    shared-favorite authorization deferral).

## Readiness verdict

**Ready.** Six adversarial reviewers returned **unanimous "ship-with-fixes."** The one blocker and all
six high-severity findings are **fixed and verified** in the plan (`12` §2). The medium/low FIX@IMPL
items that were previously held in a pre-implementation checklist are now **integrated as built
tasks/steps into the relevant phase plans** (`08`–`11`); `12` §4 records each item's integration target.
Readiness is evidenced by the requirements→test traceability matrix (`13`) — which ends with a 100%
coverage scorecard — the implementer handoff/runbook (`14`), and the rollback/recovery + per-phase
definition-of-done (`15`). The dominant residual risk is **concurrency**, not design.

## Package contents

| Doc | What it owns |
|---|---|
| `00-synthesis-and-decisions.md` | **Canonical decision record** — every cross-cutting decision (D1–D16), resolved conflicts, merged risk register, locked owner answers, build sequence. *Start here.* |
| `01-product-spec-and-ux-flows.md` | Feature definition, organize-by model, lifecycle UX, edge-case walkthroughs, acceptance criteria, MVP cut |
| `02-database-supabase-analysis.md` | Current schema + RLS analysis, proposed DDL, cascade safety, advisor baseline |
| `03-blast-radius-impact-analysis.md` | Dependency map, per-file impact + risk, hub analysis (29 importers), test surfaces, concurrency collision map |
| `04-state-data-flow-analysis.md` | SSR-not-Query data model, Favorites optimistic template, `organizeBy` state, override-staleness divergence |
| `05-ui-reuse-and-design.md` | `ProjectGroupSection` contract, toolbar control, Manage-groups popover, accent palette, assignment markup, DESIGN.md compliance |
| `06-prior-art-and-concurrency-watch.md` | Favorites/archives/date-grouping prior art, in-flight-plan map, conventions, rebase/vigilance checklist |
| `07-implementation-plan-overview-and-contracts.md` | **Contracts spine** — exact DB objects, TS types, server-action signatures, client contracts, test anchors. The interface all build phases bind to. |
| `08-plan-phase-1-db-and-types.md` | **TDD plan — Phase 1:** migration, RLS, grants, indexes, advisors, types regen |
| `09-plan-phase-2-server-actions.md` | **TDD plan — Phase 2:** group CRUD + assignment + bulk actions, ownership gate, validation |
| `10-plan-phase-3-repository-and-page.md` | **TDD plan — Phase 3:** additive repository read + page wiring |
| `11-plan-phase-4-client-ui-and-tests.md` | **TDD plan — Phase 4:** `ProjectGroupSection`, organize control, grouping util, optimistic assignment, kebab + bulk, Manage-groups popover, accents, full test matrix |
| `12-adversarial-review.md` | **Review record** — 6 reviewers, 35 findings, dispositions; the FIX@IMPL checklist (§4), each item marked **INTEGRATED** into its phase plan, plus the round-2 integration record |
| `13-requirements-traceability-and-qa-matrix.md` | **Traceability matrix** — every D1–D16 / Q1–Q4 / `01` §7 acceptance criterion → implementing phase/task → exact test file + `it(...)` name + key assertion; security-control sub-matrix; ends with a 100% coverage scorecard |
| `14-implementer-handoff-and-runbook.md` | **Handoff / runbook** — single-worker entry point, strict `7a→7b→7c→7d` order, consolidated validation command block, STOP/escalate conditions, v1 non-goals, contract index |
| `15-deploy-rollback-recovery-and-dod.md` | **Rollback / recovery / DoD** — migration apply order, types-regen + advisor gate, per-phase DOWN/revert paths, the RLS-isolation-proof runbook, per-phase definition-of-done |
| `16-MASTER-IMPLEMENTATION-GUIDE.md` | **Master implementation guide (capstone)** — the single executable plan the implementing AI follows end-to-end: executive overview + architecture + tech stack, a **SWOT analysis**, a cross-reference index to every doc, the preconditions/sequencing gate, **Phase 1–4 each with pros/cons + bite-sized TDD tasks bound to `07`'s contracts**, the consolidated validation command block, STOP/escalate conditions, non-goals, and per-phase definition-of-done |
| `_superseded-2026-06-16-alt-pass/` | An independent concurrent agent's pass (converged architecture, predates owner decisions) — archived for provenance; **not** the source of truth (see its `NOTE.md`) |

## Build sequence (do not start before §5 is satisfied)

1. **Phase 1 — DB + types** (`08`): new tables, RLS, grants, indexes → apply → `get_advisors` → regenerate `types.ts` → add a `gen:types` script. Isolated, low-risk, reviewable alone.
2. **Phase 2 — Server actions** (`09`): CRUD + assignment + bulk, ownership-gated, optimistic-friendly error shapes.
3. **Phase 3 — Repository + page** (`10`): strictly-additive `listCurrentWorkspaceProjects` fetch + `page.tsx` prop; one owner of the shared `WorkshopProjectListItem`/`ProjectListItem` type edit.
4. **Phase 4 — Client UI + tests** (`11`): the big client refactor; keep all existing `projects-page-*` suites green; add new group-mode suites.
5. **Fast-follows (post-MVP):** drag assignment, group reorder UI, collapse persistence, sidebar groups, shared-project groups, many-to-many tags, `ProjectDetailsModal` group field.

The former `12` §4 FIX@IMPL items are **already integrated as built tasks/steps inside `08`–`11`**, so
each phase plan is self-contained; `12` §4 now serves as the integration index (item → phase/task), not a
separate pre-phase checklist.

## ⚠️ Sequencing & concurrency (the dominant risk)

Build Project Groups **after** the three in-flight branches land (they're mid-edit in the exact files
Groups needs):

- **C1 — Sidebar Favorite Projects & Estimates** (owns `workspace-repository.ts`, `MainSidebar.tsx`, `sidebar-types.ts`, `WorkshopPageShell.tsx`)
- **C2 — Delete-Project Modal UX** (owns `BulkDestructivePreviewModal.tsx`, `bulk-action.ts`, delete strings in `projects-page-client.tsx`)
- **C3 — Project Card Favorite Sheet Links** (owns `LiveProjectCard.tsx`)

**Rebase-before-edit discipline:** before touching any shared file, `git fetch && git status`, re-read the
**live** file (line numbers in this pack are guidance, not authority), confirm C1/C2/C3 have merged, then
re-run `bunx vitest run tests/vitest/projects-page-*.test.tsx` + `bun run type-check`. Prefer **new files**
(`ProjectGroupSection`, `project-grid-layout.ts`, `group-accent.ts`, new test files) over editing churning
shared files where behavior allows.

## How to execute

**The implementing AI follows `16-MASTER-IMPLEMENTATION-GUIDE.md`** — the single, comprehensive
executable plan (overview, architecture, SWOT, per-phase pros/cons + bite-sized TDD tasks bound to `07`,
validation, STOP conditions, per-phase definition-of-done). For a one-page orientation first, read
`14-implementer-handoff-and-runbook.md` (entry point, strict `7a→7b→7c→7d` order, validation command
block, STOP/escalate conditions, contract index). From there, each `08`–`11` plan is a standalone, TDD,
checkbox-tracked plan that `16` sequences and references. Execute with
**`superpowers:subagent-driven-development`** (fresh subagent per task + review between tasks, recommended)
or **`superpowers:executing-plans`** (inline batch with checkpoints). Implement phases in order; do not
combine Phase 1 (DB/actions) with Phase 4 (UI) in a single diff. Consult `15` for the per-phase
definition-of-done and rollback path before and after each phase.

## How this package was built

Analysis (6 parallel lanes) → reconciliation (cross-lane conflict resolution, which caught and corrected
a factual error about Favorites' ownership model) → owner decisions → contracts spine + 4 parallel TDD
build-phase plans → 6 adversarial reviewers → fix integration. A second AI agent independently produced a
converging pass (archived under `_superseded-2026-06-16-alt-pass/`).
