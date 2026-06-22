# Project Groups — Master Implementation Guide

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended)
> or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax.
> **This is the single executable entry point.** It binds **verbatim** to the contracts in
> [`07-implementation-plan-overview-and-contracts.md`](./07-implementation-plan-overview-and-contracts.md)
> and **references** [`08`](./08-plan-phase-1-db-and-types.md)–[`11`](./11-plan-phase-4-client-ui-and-tests.md)
> for the full step-level TDD code (DRY — read the phase doc for each task's code rather than duplicating it here).
> For a one-page orientation first, read [`14-implementer-handoff-and-runbook.md`](./14-implementer-handoff-and-runbook.md).

**Goal:** Add a per-user "Project Groups" organization layer to `/workshop/projects` — named, ordered,
color-accented buckets rendered through the existing horizontal-flag treatment, as a third "Organize by"
mode (None / Date / Group) — shipped with **0 errors, full test coverage, and zero regression** to the
date/client-flag DOM contract or the shared `WorkshopProjectListItem` type.

**Architecture:** Next.js (App Router, SSR-prop-driven) + Bun + Supabase/Postgres with RLS. Two new
per-user tables cloned from `project_favorites` and hardened with a membership IDOR `exists()` backstop.
Server actions mirror `setProjectFavorite`. The repository read is **strictly additive**. The client uses
local `useState` + the existing `useSyncExternalStore` localStorage machinery (**no TanStack Query** for
this list). One reusable `ProjectGroupSection` renders date, client, and user grouping; date/client modes
stay **byte-identical** via legacy-data-attr props. Optimistic assignment diverges from favorites: the
override encodes *which* group and is cleared by a reconciliation `useEffect` once SSR is authoritative
(because `router.refresh()` is non-awaitable).

**Tech Stack:** TypeScript, React 19, Next.js App Router, Supabase JS v2, Postgres 15 RLS, Vitest + React
Testing Library; `bunx vitest run <path>`, `bun run type-check`.

---

## 0. How to use this guide & the document map

This guide is the **orchestration layer**. For any task it lists, the **full TDD step code lives in the
cited phase doc** — read this guide → the phase doc for the phase you are on → `07` for any contract →
`15` for that phase's definition-of-done and rollback. **Where any doc conflicts, `00` (decisions) then
`07` (contracts) win;** the lane analyses `01`–`06` are subordinate.

| Doc | Use it for |
|---|---|
| [`00-synthesis-and-decisions.md`](./00-synthesis-and-decisions.md) | Canonical decisions **D1–D16** + owner answers **Q1–Q4**; merged risk register; build sequence. The "why". |
| [`01-product-spec-and-ux-flows.md`](./01-product-spec-and-ux-flows.md) | Product behavior, UX flows, 9 edge cases, acceptance criteria, MVP cut. |
| [`02-database-supabase-analysis.md`](./02-database-supabase-analysis.md) | DB analysis (subordinate to `07` on contract shape). |
| [`03-blast-radius-impact-analysis.md`](./03-blast-radius-impact-analysis.md) | Per-file impact, the 29-importer hub, test surfaces, concurrency map. |
| [`04-state-data-flow-analysis.md`](./04-state-data-flow-analysis.md) | SSR-not-Query model, optimistic template, the D14 divergence. |
| [`05-ui-reuse-and-design.md`](./05-ui-reuse-and-design.md) | `ProjectGroupSection`, toolbar control, popover, palette, DESIGN.md compliance. |
| [`06-prior-art-and-concurrency-watch.md`](./06-prior-art-and-concurrency-watch.md) | Favorites / date+client prior art, in-flight-plan map, rebase discipline. |
| [`07-…contracts.md`](./07-implementation-plan-overview-and-contracts.md) | **THE binding spine** — every shared name, type, signature, DOM anchor, storage key, DDL. |
| [`08`](./08-plan-phase-1-db-and-types.md)–[`11`](./11-plan-phase-4-client-ui-and-tests.md) | The four TDD build-phase plans (full step code). |
| [`12-adversarial-review.md`](./12-adversarial-review.md) | The review record + the integrated-FIX@IMPL index. |
| [`13-…traceability-and-qa-matrix.md`](./13-requirements-traceability-and-qa-matrix.md) | Requirement→task→test proof + security-control matrix + 100% scorecard. |
| [`14-…handoff-and-runbook.md`](./14-implementer-handoff-and-runbook.md) | One-page orientation + **the consolidated contract index** + validation block + STOP conditions. |
| [`15-…rollback-recovery-and-dod.md`](./15-deploy-rollback-recovery-and-dod.md) | Per-phase DOWN/revert, the RLS-proof runbook, per-phase definition-of-done. |
| **`16` (this doc)** | The executable master plan that sequences and binds them all. |

> **Division of labor with `14`:** `14` owns the **consolidated contract index** (every shared
> name/type/signature/DOM-anchor → owning doc§). This guide does **not** duplicate it — when you need to
> locate a contract, use `14` §9. This guide owns the **phased execution plan, pros/cons, SWOT, and DoD**.

---

## 1. Executive overview & value

The `/workshop/projects` wall is a flat grid with three system-defined organizing affordances (access
tabs, sort, and implicit date/client grouping). None lets a user impose **their own** meaning on the wall.
**Project Groups** lets a user define named buckets — "Active bids", "Won — construction", "Cold leads",
"Client: Marriott" — assign projects to them, and view the wall organized by those buckets, reusing the
**exact horizontal-flag treatment** already proven for date grouping. It turns a chronological list into a
**personal workspace board**.

- **Primary user:** the project owner (estimator / PM / principal) managing a growing portfolio on
  `Your Projects` — they own the projects and want a private organization layer that survives sessions and
  devices.
- **What it is, structurally:** a third **`organizeBy`** mode (None / Date / Group) on the existing page,
  plus a per-user membership relation cloned from the just-shipped Favorites feature. It is **not** a new
  route, **not** a new access tab, **not** a destructive operation, and **not** visible to collaborators.
- **v1 boundary:** per-user, `Your Projects` only; one-to-many (a project is in ≤1 group); accents ship in
  v1; assignment via card kebab + bulk dock; drag, details-modal field, shared-project groups, sidebar
  groups, and many-to-many tags are explicit fast-follows.

See [`01`](./01-product-spec-and-ux-flows.md) §1–§5 for the full product narrative, UX flows, and the 9
edge-case walkthroughs.

---

## 2. Architecture & key-decision digest (bound to `07`)

Each canonical decision (full rationale in [`00`](./00-synthesis-and-decisions.md) §2–§4) with its binding
contract anchor. **Implement to the anchor, not to memory.**

| # | Decision (one line) | Binding anchor |
|---|---|---|
| **D1** | One-to-many: a project is in **≤1** group, enforced by `unique(user_id, project_id)`. | `07` §2.2 |
| **D2** | **Per-user**, workspace-scoped rows; RLS `user_id = auth.uid() AND is_workspace_member(workspace_id)`. | `07` §2.3 |
| **D3** | **Two new tables**; **no `group_id` column on `projects`** (`Tables<"projects">` untouched). | `07` §2.1–§2.2 |
| **D4** | Explicit **`organizeBy`** dimension (None/Date/Group); grouping **decoupled** from the sort field. | `07` §3.3, §5.1 |
| **D5** | Persist the `organizeBy` view preference in `localStorage` via `useSyncExternalStore`; **no TanStack Query** for the list. | `07` §5.1 |
| **D6** | One reusable **`ProjectGroupSection`** renders date, client & user grouping; date/client **byte-identical**. | `07` §5.2, §5.6 |
| **D7** | Migration **cloned from favorites + hardened with an IDOR `exists()` backstop**; composite + `workspaces(id)` FKs. | `07` §2 |
| **D8** | Assignment via **card kebab "Move to group" + bulk dock** (drag deferred). | `07` §5.7 |
| **D9** | Assign gate is the **repository `owned` predicate** (workspace-role OR `created_by`, nullable) — **separate** from the delete gate; bulk uses an assignment-specific selection. | `07` §4.6, §5.5 |
| **D10** | Delete group **un-assigns** (→ Ungrouped) via cascade; **lightweight inline confirm**, never `BulkDestructivePreviewModal`. | `07` §2.2, §4.4 |
| **D11** | **`Your Projects` only**; "By group" disabled + coerced away on the Shared tab. | `07` §5.1, §5.7 |
| **D12** | Virtual **"Ungrouped"** bucket pinned last; grouping util buckets dangling ids defensively. | `07` §5.3 |
| **D13** | **Accents ship in v1** — 8-swatch `group-accent.ts` palette (LD-4), inline-style only, AA labels. | `07` §5.4 |
| **D14** | Optimistic group override (encodes *which* group) cleared by a reconciliation `useEffect` once SSR is authoritative (`router.refresh()` non-awaitable). | `07` §5.5 |
| **D15** | Local `useState` for collapse + selection; **preserve** selection across organize-switch, **clear** across tab-switch. | `07` §5.5, `11` Task 4/6 |
| **D16** | MVP cut as above; everything else is a documented fast-follow. | `00` §4, `14` §8 |
| **Q1** | Default `organizeBy` = `"date"` when the current/initial in-memory sort is a grouping sort (date field **or** `client_name`), else `"none"`; no persisted sort. | `07` §5.1 |
| **Q2** | Caps: **50 groups / 40-char names**, **app-layer soft cap** (no DB check). | `07` §2.5 |
| **Q3** | Accents ship in v1 (owner override). | `07` §1.1, §5.4 |
| **Q4** | MVP assignment surfaces = card kebab + bulk dock only. | `07` §5.7 |

---

## 3. SWOT analysis

### Strengths
- **Maximal reuse of proven primitives.** The feature is an end-to-end clone of the just-shipped Favorites
  data/optimistic pattern + the date-flag renderer; almost no novel mechanism. This is the single biggest
  de-risker — the team has already shipped and tested every primitive Groups depends on.
- **Contracts-first.** `07` fixes every shared name, type, signature, DOM anchor, and storage key, so the
  four phases bind to one interface and cannot drift. Cross-doc contradictions were audited out.
- **Strictly additive data + repository changes.** No `projects.group_id`; `Tables<"projects">` untouched;
  the repository read only extends a `Promise.all`. The 29-importer hub (`03` §1) is not rippled.
- **Byte-identical legacy path.** Date *and* client grouping render through the generalized component with
  legacy data-attrs preserved, so the fragile `projects-page-*` suites stay green.
- **Defense in depth on isolation.** Per-user RLS + a membership IDOR `exists()` backstop + an action-layer
  ownership gate (the repository `owned` predicate) — three independent layers.
- **Full traceability.** Every requirement maps to a named test or SQL probe (`13`); every review finding
  is integrated as a built task (`12` §4); rollback + DoD are defined per phase (`15`).

### Weaknesses
- **Phase 4 is a large, fragile client refactor.** Decoupling grouping from the sort field while keeping
  the date/client DOM byte-identical is the integration linchpin; it touches the most-contended file
  (`projects-page-client.tsx`).
- **Soft caps are app-layer only** (50 / 40). A direct DB insert can bypass them; concurrent
  `createProjectGroup` can exceed 50 by one. Accepted for a private layer, but a real non-atomicity.
- **The optimistic group override is stateful** (encodes *which* group, not a boolean) and depends on a
  reconciliation `useEffect` keyed to non-awaitable `router.refresh()` — the subtlest client mechanism.
- **Two CRUD surfaces** (Manage-groups popover + per-flag header menu) add minor surface to keep coherent.

### Opportunities
- **Foundation for fast-follows.** The membership model + `organizeBy` axis + reusable section cleanly
  enable later: details-modal assignment, drag-to-flag, group reorder UI, collapse persistence, sidebar
  groups, shared-project groups, and a future many-to-many **Tags** feature — none requiring a v1 schema rework.
- **Re-tunable accents.** Storing `accent_id` tokens (not hex) lets the palette be re-tuned for AA/brand
  without a data migration.
- **Generalized renderer.** `ProjectGroupSection` + `project-grid-layout.ts` reduce duplication and become
  the canonical flag renderer for any future bucket dimension.

### Threats
- **Concurrency (the dominant risk).** Three in-flight branches (C1 sidebar-favorites, C2 delete-modal,
  C3 card-links) are mid-edit in the exact files Groups needs. Building on the dirty tree guarantees merge
  conflicts and risks silently breaking the date-flag suites. **Mitigation:** land C1/C2/C3 first; rebase
  and re-read live before any shared-file edit; prefer new files; DB-action-first, then a single client PR (§4).
- **Ownership-gate subtlety.** `created_by` is nullable and ownership can come via workspace role; a naive
  `created_by = uid` gate silently rejects legitimately-owned projects. **Mitigation:** D9/LD-2 — gate on
  the repository `owned` predicate; negative tests for role-owned and null-`created_by`.
- **`router.refresh()` semantics.** Non-awaitable; a `.then()`-based override clear flickers to stale SSR.
  **Mitigation:** D14/LD-6 — `startTransition` + reconciliation `useEffect`; interleaving test.
- **Live-DB test hygiene.** The Phase-1 RLS proof must not pollute the production project. **Mitigation:**
  LD-9 — real authenticated role / disposable branch, sanity hard-abort gate, guaranteed teardown (`15` §2).

---

## 4. Preconditions & sequencing gate (READ BEFORE STARTING)

**Hard gate — land C1/C2/C3 first.** The repo is dirty on `codex/fix-project-delete` with three in-flight
efforts mid-edit in the exact files Groups needs most. Do **not** start Groups against the dirty tree
(`00` §6.1, `03` §5, `06` §C):

1. **C1 — Sidebar Favorite Projects & Estimates** — owns `workspace-repository.ts`, `MainSidebar.tsx`,
   `sidebar-types.ts`, `WorkshopPageShell.tsx`.
2. **C2 — Delete-Project Modal UX** — owns `BulkDestructivePreviewModal.tsx`, `bulk-action.ts`, the delete
   strings in `projects-page-client.tsx`.
3. **C3 — Project Card Favorite Sheet Links** — owns the `LiveProjectCard.tsx` hover overlay + date band.

**Rebase-before-edit discipline (before touching any shared file):** `git fetch && git status` → confirm
C1/C2/C3 merged for the files they own → `git diff <file>` and **re-read the live file** (cite behavior,
never line numbers) → prefer **new files** (`ProjectGroupSection.tsx`, `project-grid-layout.ts`,
`group-accent.ts`, `group-actions.ts`, `group-constants.ts`, new test files) over editing churning shared
files → repository/type edits land in **one owned diff** (append `groupId` only; never reorder existing keys)
→ after any merge re-run the Phase-4 regression sweep + `bun run type-check`.

**Strict phase order `7a → 7b → 7c → 7d` (non-negotiable):** 7a lands the migration + regenerated
`types.ts` first (7b cannot type-check until the new `Tables<…>` exist); 7b and 7c depend only on 7a's types
and may be authored in parallel; **7d depends on both** and is a single focused PR so the RTL date/client
anchors are touched exactly once.

---

## 5. The phases

Each phase below gives Objective · Depends-on · Files · Contracts bound (`07` §refs) · a Task list
(one-line summary + pointer to the phase doc's full TDD steps) · **Pros / Cons** · Risks & mitigations ·
**Definition-of-Done**. Execute a phase only when the prior phase's DoD (§ below and `15` §4) is met.

### Phase 1 — DB + Types

**Part 7a of the contracts spine.** Phase doc: [`08-plan-phase-1-db-and-types.md`](./08-plan-phase-1-db-and-types.md). Contracts: [`07`](./07-implementation-plan-overview-and-contracts.md) §2–§3. Deploy/rollback/DoD: [`15`](./15-deploy-rollback-recovery-and-dod.md) §1, §2, §3.1, §4.1.

#### Objective
Lay the per-user, workspace-scoped data foundation for Project Groups — two new tables cloned from `project_favorites` (`project_groups` definitions + `project_group_memberships` one-to-many join), with per-user RLS, an IDOR `exists()` backstop, a `workspaces(id)` FK on both tables, `UPDATE` grants on definitions, advisor-clean lint, and regenerated TypeScript types — touching **zero** app source or UI.

#### Depends on
- **Preconditions:** C1 (sidebar-favorites), C2 (delete-modal-UX), C3 (card-links) merged; `bun run type-check` green on the untouched tree BEFORE regenerating `types.ts` (08 §0.5). Standing authorization to apply migrations to Supabase project `ebxxqidacheyapmmzavr` (per `AGENTS.md`).
- **Downstream:** Phase 2 (7b) and Phase 3 (7c) both depend only on this phase's regenerated types.

#### Files
- **Create:** `supabase/migrations/20260617090000_project_groups.sql` (timestamp RE-CONFIRMED at apply time — must be strictly greater than the latest `20260616*`/`20260617*` file on disk; 08 Task 1 Step 1 / 15 §1.1).
- **Modify:** `src/lib/supabase/types.ts` (regenerated once — never hand-edited).
- **Modify:** `package.json` (add `gen:types` script).
- **Tests:** none in Vitest — every "test" is an `execute_sql` verification query with a stated expected result, plus `get_advisors` and the `bun run type-check` gate. No file under `tests/vitest/` is created or edited in this phase.

#### Contracts bound (07 / locked decisions)
- **07 §2.1** `public.project_groups` DDL: `id, workspace_id, user_id, name, accent_id (nullable text), position (int not null default 0), created_at, updated_at`; functional unique index `project_groups_user_workspace_lower_name_idx` on `(user_id, workspace_id, lower(name))`; position index `project_groups_workspace_user_position_idx`.
- **07 §2.2** `public.project_group_memberships` DDL: single-column `group_id → project_groups(id) on delete cascade` (**LD-1** — NOT a composite group FK), composite `project_group_memberships_project_workspace_fkey (project_id, workspace_id) → projects(id, workspace_id) on delete cascade`, `project_group_memberships_unique_user_project unique(user_id, project_id)`, three indexes (`workspace_user`, `group_id`, `project_id`).
- **LD-7** `workspace_id → public.workspaces(id) on delete cascade` FK on **both** tables (no orphan rows on workspace delete).
- **07 §2.3** Per-user RLS cloned from the live consolidated `project_favorites` policy (`is_platform_admin() OR (user_id = (select auth.uid()) AND public.is_workspace_member(workspace_id))`), `to authenticated`, plus the membership `with check` **`exists(select 1 from project_groups g where g.id = group_id and g.user_id = (select auth.uid()))` IDOR backstop** (LD-1 canonical guard).
- **07 §2.4** Grants `authenticated`-only: `project_groups` → `select, insert, update, delete`; `project_group_memberships` → `select, insert, delete` (NO update). Revoke from `public`/`anon`/`authenticated` first.
- **07 §2.5 / LD-8** Caps are **app-layer only** — NO DB `check` constraint, NO name-length constraint (`project_groups_name_check` deliberately NOT shipped).
- **07 §4.8** `gen:types` npm script: `supabase gen types typescript --project-id ebxxqidacheyapmmzavr --schema public > src/lib/supabase/types.ts`.
- **07 §3.1/§3.2** Produces (but does not yet export/consume) the schema that `Tables<"project_groups">` / `Tables<"project_group_memberships">` map to; `ProjectGroupSummary` and `groupId` wiring are Phase 3, not here.

#### Task list
- [ ] **Task 1 — Author the migration file.** Re-confirm a strictly-later timestamp, confirm no pre-existing `project_group*` schema, re-verify the live `project_favorites` RLS packaging to mirror (consolidated single-policy vs two-policy split), write the exact DDL (two tables + FKs + functional unique index + RLS + grants), static-validate against the §2 checklist, and commit the file alone. *(full TDD steps: 08 Task 1 Steps 1–5)* — key checks: `pg_tables like 'project_group%'` returns 0 rows (RED state); static checklist confirms `accent_id` nullable, no DB caps check, single-column `group_id` FK, `workspaces(id)` FK on both tables.
- [ ] **Task 2 — Apply the migration and verify (DB smoke "tests").** Apply via Supabase MCP `apply_migration` to `ebxxqidacheyapmmzavr`, then run structural probes (columns, FKs/uniques, functional unique index, RLS enabled, grants) and the security-critical RLS-isolation proof. *(full TDD steps: 08 Task 2 Steps 1–8; RLS runbook: 15 §2)* — key tests: column-shape probe (`accent_id text YES`, `position default 0`, no `group_id` on `projects`); grants probe (`project_groups` has UPDATE, `project_group_memberships` does NOT, no `anon`/`public`); **RLS runbook NC-0…NC-4** (anon denied, cross-user read → B sees 0, A-cannot-impersonate-B, membership IDOR rejected, cross-workspace FK rejected) plus the in-08 correctness proofs (`23505` on `project_group_memberships_unique_user_project`, `23505` on `project_groups_user_workspace_lower_name_idx`, delete-group cascade D10); **advisor-regression gate** (`get_advisors` security + performance: 0 new ERROR, WARN ≤ 74 baseline).
- [ ] **Task 3 — Regenerate `types.ts` and add the `gen:types` script.** Add the `gen:types` script after `type-check` in `package.json`, confirm all pending migrations are applied, regenerate `src/lib/supabase/types.ts` ONCE via the `generate_typescript_types` MCP tool, assert the two new table blocks + relationships, and confirm `Tables<"projects">` is unchanged; commit types + script together. *(full TDD steps: 08 Task 3 Steps 1–5)* — key gate: `bun run type-check` → exit 0; grep confirms `project_groups:` and `project_group_memberships:` blocks; `accent_id: string | null`, `position: number`, composite `project_group_memberships_project_workspace_fkey → projects ["id","workspace_id"]`, and a `workspace_id → workspaces` relationship on BOTH blocks (LD-7).
- [ ] **Task 4 — Phase-1 exit criteria & handoff.** Final verification sweep (type-check, advisors, RLS isolation), confirm `git status` shows ONLY the migration + `types.ts` + `package.json`, and record handoff notes (applied filename, advisor before/after, RLS packaging shipped, the confirmed `23505` constraint names for Phase 2's error mapping, caps-are-app-layer reminder). *(full TDD steps: 08 Task 4 Steps 1–4; DOWN path: 15 §3.1)* — no new test file; this is the gate before Phase 2/3 begin.

#### Pros / Cons (this phase's approach)
| Pros | Cons |
|---|---|
| Lowest-risk, most isolatable phase — touches only `supabase/migrations/`, `types.ts`, `package.json`; reviewable largely independently of the contested UI files. | This is the **only live-prod-mutating phase** — every RLS/correctness proof carries live-DB hygiene burden (must run under a genuine RLS-enforcing role with rollback-only fixtures; a committed seed row pollutes `ebxxqidacheyapmmzavr`). |
| End-to-end clone of the just-shipped `project_favorites` migration — proven shape, no new `SECURITY DEFINER` function, so the advisor baseline is unchanged by construction. | Migrations are not Vitest-testable — assurance comes from hand-run SQL probes whose expected results must be read carefully; no CI guardrail catches a missed assertion. |
| Single-column `group_id` FK + RLS `exists()` backstop (LD-1) is minimal-churn to the reviewed migration while still closing the cross-user-group IDOR (two-layer with the Phase-2 action gate). | Caps live only at the app layer (LD-8) — a direct Supabase API insert bypasses the 50-group / 40-char limits (accepted for a per-user private layer, but a real gap to document). |
| Additive-only to drop: both tables are net-new (no `projects.group_id` column, D3), so the Phase-1 DOWN is a clean two-table drop with no schema regression risk. | `type-check` compiles the regenerated `types.ts` against the live app, so the tree must already be green — a pre-existing/concurrent-migration type error blocks this phase and is not this phase's to absorb. |

#### Risks & mitigations
- **Migration timestamp race (00 §5 risk-row 7; 07 §7; 15 §1.1).** A stale/out-of-order timestamp makes Supabase replay in the wrong sequence. *Mitigation:* re-`ls supabase/migrations | tail` at apply time and pick a timestamp strictly greater than the latest `20260616*`/`20260617*` file; record the reconfirmed filename.
- **`types.ts` regeneration race (00 §5 risk-row 7).** Regenerating before a concurrent pending migration applies captures a partial schema. *Mitigation:* cross-check `schema_migrations` against local files so every local migration is applied, then regenerate **exactly once** (08 Task 3 Step 2 / 15 §1.5).
- **RLS proof passes vacuously on a BYPASSRLS connection (C-RLSPROOF / LD-9).** The MCP `execute_sql` role may bypass RLS, making "B sees 0" prove nothing. *Mitigation:* the hard-abort sanity control (`current_user = authenticated`, `rolbypassrls = false`) gates every block; use `set local role authenticated`, never `set_config('role', …)` (15 §2.2).
- **Live-prod pollution (C-RLSPROOF / LD-9).** A committed seed row leaves residue in `ebxxqidacheyapmmzavr`. *Mitigation:* every proof block is `begin … rollback` (Path A) or runs on a disposable branch DB / two transactional sessions; the §2.3 final guard asserts both live tables at count 0 (15 §2.3).
- **Membership IDOR (C-12RLS / LD-1).** Without the `exists()` backstop a direct API caller could insert a membership pointing at another user's `group_id`. *Mitigation:* the backstop is **in the migration** RLS `with check`; NC-3 proves the forged insert under B's claims is rejected.
- **Unindexed `user_id` FK advisor WARN (LD-8).** `user_id` is not the leftmost column of its covering index, so the advisor may flag it. *Mitigation:* add a dedicated `user_id`-leading index ONLY if `get_advisors` flags it (never speculatively), re-apply, re-run the advisor (08 Task 2 Step 7 / 15 §1.3).

#### Definition-of-Done (15 §4.1 + 08 Task 4)
- [ ] Migration applied to `ebxxqidacheyapmmzavr` with a timestamp strictly later than `20260616120000` and any concurrent `20260616*`/`20260617*` file, recorded as the top `supabase_migrations.schema_migrations` row.
- [ ] Structural probes pass: both tables + exact columns (`accent_id text` nullable, `position integer not null default 0`); single-column `group_id → project_groups(id) on delete cascade` (LD-1); `workspaces(id) on delete cascade` FK on both tables (LD-7); composite `(project_id, workspace_id) → projects(id, workspace_id)` FK; functional unique `project_groups_user_workspace_lower_name_idx`; `unique(user_id, project_id)`; RLS enabled; grants `select,insert,update,delete` on `project_groups` and `select,insert,delete` (NO update) on `project_group_memberships`; no `anon`/`public` privileges; no `group_id` on `projects`; no DB name-length check (LD-8).
- [ ] Advisor-regression gate: `get_advisors` security + performance show 0 new ERROR and WARN ≤ 74 baseline; before/after counts recorded in the PR body.
- [ ] RLS-isolation proof passes: sanity control confirms an enforcing connection; NC-0…NC-4 all return their expected denial/zero results; the §2.3 final guard shows both live tables at count 0.
- [ ] `src/lib/supabase/types.ts` regenerated once after all pending migrations; contains `Tables<"project_groups">` + `Tables<"project_group_memberships">` with expected shapes; `Tables<"projects">` byte-identical (no `group_id`).
- [ ] `bun run type-check` → exit 0; `gen:types` script present in `package.json`; types + script committed alongside the migration.
- [ ] `git status` shows ONLY the migration file, `src/lib/supabase/types.ts`, and `package.json` — no edits to `projects-page-client.tsx`, `workspace-repository.ts`, `LiveProjectCard.tsx`, `ProjectDetailsModal.tsx`, or any `projects-page-*` test.
- [ ] Handoff recorded for downstream phases: applied filename/timestamp, advisor before/after counts, which RLS packaging shipped (single consolidated vs two-policy split), the confirmed `23505` constraint names (`project_group_memberships_unique_user_project` and `project_groups_user_workspace_lower_name_idx`) for Phase 2's `ProjectGroupNameError`/upsert mapping, and the caps-are-app-layer-only reminder.


### Phase 2 — Server Actions

> Spine part **7b**. Full TDD step code lives in [`09-plan-phase-2-server-actions.md`](./09-plan-phase-2-server-actions.md); this section orchestrates and points — it does not reproduce the step bodies.

**Objective.** Ship one new `"use server"` module — `src/lib/workshop/group-actions.ts` — exposing the seven Project-Groups mutations (`createProjectGroup`, `renameProjectGroup`, `recolorProjectGroup`, `deleteProjectGroup`, `reorderProjectGroups`, `moveProjectToGroup`, `bulkAssignProjectsToGroup`), each cloning the proven `setProjectFavorite` skeleton (`assertUuid` → `ensureDefaultWorkspace` → workspace+user-scoped verify → upsert/update/delete → dual `revalidatePath`), plus the app-layer caps, the `23505` dup-name disambiguation, the accent allowlist, and the **LD-2 ownership gate** + **LD-11 typed bulk result**.

**Depends on.** Phase 1 (7a) — the regenerated `src/lib/supabase/types.ts` must contain `project_groups` / `project_group_memberships` `Row`/`Insert`/`Update` blocks or `supabase.from("project_groups")` will not type-check (STOP gate, `09` §1). C1/C2/C3 must have merged (`09` §1). Touches no UI suite; 7b and 7c are parallelizable after 7a's types land. First consumer is Phase 4.

#### Files
- **Create:** `src/lib/workshop/group-constants.ts` (plain module, NO `"use server"` — shared caps so the Phase-4 popover imports the same `MAX_PROJECT_GROUPS` / `MAX_PROJECT_GROUP_NAME_LENGTH` values; `09` §2.0).
- **Create:** `src/lib/workshop/group-actions.ts` (the seven actions + typed errors + LD-2 ownership helpers).
- **Create (test):** `tests/vitest/project-group-actions.test.ts`.
- **Read-only reuse (do NOT edit):** `src/lib/workshop/actions.ts` (`setProjectFavorite` skeleton), `src/lib/repositories/workspace-repository.ts` (`ensureDefaultWorkspace`, the `owned` derivation), `src/lib/ids.ts` (`isUuid`), `src/lib/mass-deletion/bulk-action.ts` (`normalizeBulkActionIds`).

#### Contracts bound (07)
- **Signatures — §4.1–§4.7 verbatim:** `createProjectGroup({name, accentId?}) → Promise<{ id: string }>`; `renameProjectGroup`/`recolorProjectGroup`/`deleteProjectGroup`/`reorderProjectGroups`/`moveProjectToGroup` → `Promise<void>`; `bulkAssignProjectsToGroup({projectIds, groupId}) → Promise<{ movedProjectIds: string[]; skippedProjectIds: string[] }>` (**LD-11**).
- **Typed errors — §4:** `ProjectGroupCapError` (50-group cap), `ProjectGroupNameError` (empty/>40-char/duplicate).
- **Caps — §2.5:** 50 groups/user/workspace, 40-char names — app-layer only, NO DB check (`group-constants.ts` is the single source).
- **Membership — §2.2:** one-to-many via `upsert(..., { onConflict: "user_id,project_id" })`; remove = `delete`. `project_group_memberships` only — never `projects.group_id` (D3).
- **Ownership gate — §4.6/§4.7 (LD-2):** `workspace_id === workspace.id && (Boolean(workspaceRole) || created_by === profile.id)`, `created_by` **nullable**; matches the repository `owned` derivation; NOT bare `.eq("created_by", profile.id)`. Membership `workspace_id` stamped from the verified project row so the composite `(project_id, workspace_id) → projects(id, workspace_id)` FK is satisfiable.
- **Accent allowlist — §3.4:** the 8 `GroupAccentId` tokens (`slate/stone/sage/teal/indigo/plum/rose/clay`); `null` ⇒ default neutral. Duplicated as a literal set (a server module must not import the Phase-7d UI `group-accent.ts`); a source guard keeps the two in sync.
- **`23505` disambiguation (LD-8):** a duplicate-name `23505` from `project_groups_user_workspace_lower_name_idx` → `ProjectGroupNameError`; the membership `unique(user_id, project_id)` `23505` is resolved by `onConflict` and must NOT be mistranslated.

#### Task list
- [ ] **Prereq — shared caps module.** Create `group-constants.ts` exporting `MAX_PROJECT_GROUPS=50`, `MAX_PROJECT_GROUP_NAME_LENGTH=40`, `MAX_BULK_ASSIGN_PROJECTS=50` (full TDD steps: `09` §2.0).
- [ ] **Task 0 — test scaffold + module skeleton.** Chainable Supabase builder stub (per-table queued `{data,error,count}`), `vi.hoisted` mocks for `ensureDefaultWorkspace`/`createSupabaseServerClient`/`revalidatePath`; stub the seven exports as `throw "not implemented"`; add `assertUuid`, `isUniqueViolation`, `isDuplicateNameViolation`, `normalizeGroupName`, `normalizeAccentId`, `resolveWorkspaceRole`, `verifyOwnedProjectIds`, `revalidateWorkshop` (full TDD steps: `09` Task 0). **Test:** `"exposes the seven group server actions"`.
- [ ] **Task 1 — `createProjectGroup`.** Trim name; reject empty/>40 (`ProjectGroupNameError`); count `(user_id, workspace_id)`, reject `>= 50` (`ProjectGroupCapError`); `position = max(existing)+1`; validate accent; insert→`{id}`; name-index `23505` → `ProjectGroupNameError` (full TDD steps: `09` Task 1; note the `.maybeSingle()` position-fixture shape pitfall, Appendix C). **Test:** `"translates a duplicate-name unique violation (23505) into a name error"`.
- [ ] **Task 2 — `renameProjectGroup`.** `assertUuid`; trim+length-validate; `update {name, updated_at}` scoped to `(id, user_id, workspace_id)`; dup → `ProjectGroupNameError` (full TDD steps: `09` Task 2). **Test:** `"updates the trimmed name scoped to the owning user + workspace"`.
- [ ] **Task 3 — `recolorProjectGroup` + accent-sync source guard.** `assertUuid`; validate accent allowlist (or `null` to clear); ownership-scoped `update {accent_id, updated_at}`; source-level guard asserts the action's 8-token set stays in sync with `group-accent.ts` when it exists (full TDD steps: `09` Task 3). **Test:** `"rejects an unknown accent token before any write"`.
- [ ] **Task 4 — `deleteProjectGroup` (D10).** `assertUuid`; ownership-scoped `delete` of the group row only; memberships cascade (`ON DELETE CASCADE` on `group_id`) → projects fall to virtual Ungrouped; NEVER touches `projects` or `project_group_memberships` directly (full TDD steps: `09` Task 4). **Test:** `"deletes only the group row scoped to the owning user; never touches projects"`.
- [ ] **Task 5 — `reorderProjectGroups` (fan-out cap, LD-8).** Reject `> MAX_PROJECT_GROUPS` (bounds fan-out); `assertUuid` each; empty array = no-op (no write/no revalidate); one ownership-scoped `update {position: index}` per id via `Promise.all`; non-owned ids match 0 rows (harmless no-op); revalidate once. Partial list = "reposition only these" (intentional; no v1 reorder UI consumer) (full TDD steps: `09` Task 5). **Test:** `"writes position = array index for each id, scoped to the owner"`.
- [ ] **Task 6 — `moveProjectToGroup` (D9 gate, LD-2).** `assertUuid(projectId)`; **D9 assign gate = LD-2 ownership** via `verifyOwnedProjectIds` (NOT `canSelectProjectForDeletion`, NOT bare `created_by`); `groupId===null` ⇒ `delete` membership; else `assertUuid(groupId)` + verify group owned + `upsert {group_id, workspace_id(from verified project), user_id, project_id}` `onConflict: "user_id,project_id"`; ship ONLY this action (no `setProjectGroupMembership` alias) (full TDD steps: `09` Task 6). **Tests:** `"ALLOWS an owned-via-workspace-role project even when created_by !== user (LD-2)"`, `"ALLOWS an owned project whose created_by IS NULL when the user has a workspace role (LD-2)"`, `"does NOT export a setProjectGroupMembership alias"`.
- [ ] **Task 7 — `bulkAssignProjectsToGroup` (LD-11, LD-5).** `normalizeBulkActionIds(..., {label:"projects", max:50})`, throw on blocking issue; batched LD-2 `verifyOwnedProjectIds`; `skippedProjectIds` = requested-but-not-verified; `groupId===null` ⇒ delete memberships for verified ids (**remove-path zero-verify is a no-op, not a throw**), else verify group owned + batched `upsert` `onConflict: "user_id,project_id"` (**assign-path zero-verify throws**); single `revalidatePath` pair; return `{ movedProjectIds, skippedProjectIds }` (full TDD steps: `09` Task 7). **Tests:** `"returns the non-owned requested ids as skippedProjectIds (LD-11 partial failure)"`, `"is a no-op (NOT a throw) on the remove path when nothing verifies (LD-8)"`, `"allows an owned-via-workspace-role project even when created_by !== user (LD-2/LD-5)"`.
- [ ] **Task 8 — source-contract guards.** Static-source asserts: `"use server"` + skeleton parity, single-action (no `setProjectGroupMembership`), caps imported from `group-constants` (values asserted there), `23505`+constraint disambiguation (not blanket-translated), `onConflict: "user_id,project_id"`, never `from("projects").update(...)`, gate uses `verifyOwnedProjectIds`/`workspace_members`/`created_by === userId` and **forbids `.eq("created_by"`** (LD-2), LD-11 result keys present, reorder fan-out cap present (full TDD steps: `09` Task 8). **Test:** `"gates assignment on the LD-2 OWNERSHIP derivation, not mere readability and not a bare created_by eq"`.
- [ ] **Task 9 — verification gate.** `bunx vitest run tests/vitest/project-group-actions.test.ts` green; `bun run type-check` exit 0; sanity-run `bulk-action-validation.test.ts` + `workshop-favorites-schema.test.ts` (reused helpers unregressed); manual §4 signature re-read (full TDD steps: `09` Task 9).

#### Pros / Cons
| Pros | Cons |
|---|---|
| **New-file-only** (`group-actions.ts` + new test + `group-constants.ts`) — zero edits to churning shared files; lowest-collision phase, reviewable in isolation. | The **LD-2 gate adds an extra `workspace_members` read per move/bulk call** (mirrors what the repository already does), and the test stub must script two reads (workspace_members + projects) per gate (Appendix C pitfall). |
| **Skeleton parity** with `setProjectFavorite` keeps the security model uniform (RLS is the boundary; the action pre-verifies for honest errors). | **Caps are app-layer only** (no DB check, §2.5) — a direct DB insert bypasses 50/40; accepted for a per-user private layer but must be documented. |
| **TDD per action** with a programmable per-table mock makes every branch (cap, dup-name, ownership, partial-failure) independently pinned. | **Duplicated accent token set** vs importing `group-accent.ts` — a deliberate boundary (no UI import from a server module; preserves 7b-before-7d build order), guarded by a source-sync test, but still two lists to keep aligned. |
| **No DB/advisor/RLS impact** — pure source; revert is `git revert` of the commits with nothing to undo (15 §3.2). | The mock stub's generic shape and the real `.maybeSingle()` (object, not array) must agree by hand on the `max(position)` fixtures — a known red-test foot-gun. |

#### Risks & mitigations
- **`23505` mistranslation (LD-8 / 07 §7).** The name index and the membership `unique(user_id, project_id)` both raise `23505`. → `isDuplicateNameViolation` disambiguates by constraint name (`lower_name`/`name`); the membership conflict is resolved by `onConflict` and rethrown raw if it ever surfaces. Source guard (Task 8) forbids blanket `isUniqueViolation → ProjectGroupNameError`.
- **Over-strict / NULL-fragile ownership gate (P0-3 / C-OWNERSHIP → LD-2).** A bare `.eq("created_by", profile.id)` refuses owned-via-workspace-role projects and silently drops `created_by IS NULL` rows (`ON DELETE SET NULL`). → `verifyOwnedProjectIds` applies the repo `owned` predicate in app code (workspace-role OR `created_by`); negative tests cover both the role-owned and the null-`created_by` cases.
- **Bulk partial-failure swallowed (C-BULKRET → LD-11).** A `void` return that drops unverified ids leaves the client unable to roll back. → Typed `{ movedProjectIds, skippedProjectIds }`; assign-path zero-verify throws, remove-path zero-verify is a benign no-op (Appendix A).
- **Reorder fan-out abuse (LD-8).** An unbounded `orderedGroupIds` could force N UPDATEs. → Reject `> MAX_PROJECT_GROUPS` before any write.
- **Cross-workspace FK / membership stamp.** A membership stamped with the default workspace could violate the composite FK for a non-default-workspace project. → `workspace_id` stamped from the verified project row.
- **`types.ts` not yet regenerated (Phase-1 dependency).** → STOP gate: `grep` for `project_groups` in `types.ts`; if absent, finish 7a first.
- **Mock-shape drift (`09` Appendix C).** → `.maybeSingle()`/`.single()` fixtures are single objects/`null` (never arrays); batched `.in()` reads are arrays; count reads carry `count`.

#### Definition-of-Done (15 §4.2 + `09` Task 9)
- [ ] `src/lib/workshop/group-actions.ts` exists with `"use server"` and the seven actions matching the **07 §4 signatures verbatim**, including `bulkAssignProjectsToGroup`'s typed `{ movedProjectIds, skippedProjectIds }` result (LD-11).
- [ ] The assignment gate uses the **LD-2 repository-`owned` predicate** (`workspace_id === workspace.id && (Boolean(workspaceRole) || created_by === profile.id)`, handling nullable `created_by`) — **not** bare `.eq("created_by", profile.id)` — with passing negative tests for an owned-via-workspace-role project and an owned `created_by IS NULL` project (both assignable).
- [ ] Caps enforced app-layer: `>= 50` → `ProjectGroupCapError`; empty/>40-char → `ProjectGroupNameError`; name-index `23505` → `ProjectGroupNameError`, distinguished from the membership `(user_id, project_id)` `23505`.
- [ ] One assignment action only (`moveProjectToGroup`); no `setProjectGroupMembership`; module never issues `from("projects").update(...)`.
- [ ] `bunx vitest run tests/vitest/project-group-actions.test.ts` fully green; `bun run type-check` → exit 0.
- [ ] New file only — no edit to a shared churning file; no DB/advisor/RLS impact.


### Phase 3 — Repository + Page

**Phase doc:** [`10-plan-phase-3-repository-and-page.md`](./10-plan-phase-3-repository-and-page.md) (Part 7c) · **Contracts:** [`07`](./07-implementation-plan-overview-and-contracts.md) §3, §4 · **DoD/rollback:** [`15`](./15-deploy-rollback-recovery-and-dod.md) §4.3, §3.3

#### Objective
Make per-user project-group membership and group definitions flow from Postgres to `/workshop/projects` **strictly additively**: extend the existing `listCurrentWorkspaceProjects` `Promise.all` with two per-user reads, export the camelCase `ProjectGroupSummary` type (07 §3.1), stamp `groupId` onto every list item in ONE owned diff (07 §3.2), and thread a `projectGroups` prop through `page.tsx` — without reordering or renaming a single existing return key, type field, or prop.

#### Depends on
- **Phase 1 (Part 7a)** — the migration applied AND `src/lib/supabase/types.ts` regenerated so `Tables<"project_groups">` and `Tables<"project_group_memberships">` exist. **Hard gate before Task 1** (phase doc §0.2): `bun run type-check` + `grep -c "project_groups: {" src/lib/supabase/types.ts` must print `1`+; if `0`, STOP.
- **Independent of Phase 2 (Part 7b)** — 7b and 7c are parallelizable after 7a's types land; this phase does NOT import `group-actions.ts`.
- **Precondition:** C1 (sidebar-favorites), C2 (delete-modal-UX), C3 (card-links) must have merged for the three shared files (07 §6). Run the §0.4 rebase-before-edit checklist (`git fetch && git status`, `git diff`, **re-read the live file** — cite behavior, not line numbers) before EVERY shared-file edit.
- **Blocks Phase 4 (Part 7d)** — 7d imports `ProjectGroupSummary` and reads `item.groupId`; both names are defined HERE and must match 07 §3 verbatim.

#### Files
| Action | Path | Note |
|---|---|---|
| **Create** | `tests/vitest/workshop-project-groups-repository.test.ts` | source-text + shape contract test (Tasks 1, 4) |
| **Modify** | `src/lib/repositories/workspace-repository.ts` | additive read + `ProjectGroupSummary` export + `WorkshopProjectListItem.groupId` (Tasks 1–3) — **29-importer hub** |
| **Modify** | `src/components/workshop/projects-page-client.tsx` | additive `ProjectListItem.groupId` + `ProjectsPageClientProps.projectGroups` ONLY — NO UI (Tasks 3, 5) |
| **Modify** | `src/app/workshop/projects/page.tsx` | thread `projectGroups` prop (Task 5) |

> This phase does NOT create `ProjectGroupSection`, `group-accent.ts`, `project-grid-layout.ts`, the `organizeBy` control, or any assignment UI — those are Part 7d. It adds the `groupId` type field so 7d can consume it, but adds NO rendering logic.

#### Contracts bound
- **07 §3.1** — `export type ProjectGroupSummary = { id: string; name: string; accentId: string | null; position: number }` (camelCase, single source of truth; `accentId` maps from `accent_id`; `position` carries manual order). Client imports it, never redefines it.
- **07 §3.2** — additive `groupId: string | null` on internal `WorkshopProjectListItem` (always stamped) + `groupId?: string | null` (optional) on exported `ProjectListItem`. ONE owned diff; never reorder existing keys.
- **07 §4 (read shape)** — both reads inside the single `listCurrentWorkspaceProjects` `Promise.all` (no N+1, no new serial await), scoped `.eq("workspace_id", workspace.id).eq("user_id", profile.id)`; `project_groups` selects `id, name, accent_id, position` ordered by `position` then `created_at` (07 §1.1); `project_group_memberships` selects `project_id, group_id`. `projectGroups` returned **additively** after `favoriteProjectIds`.
- **LD-1** — single-column membership FK + the RLS `exists()` backstop already enforce per-user isolation; the repository read mirrors favorites' per-user `.eq("user_id", profile.id)` scoping, so the lookup map holds only THIS user's rows.
- **LD-2** — `groupId` resolves to `null` for shared / non-owned items via per-user membership scoping + `?? null`; never inherits another user's group (pairs with the repository `owned` derivation).

#### Task list
- [ ] **Task 1 — Repository test scaffold + `ProjectGroupSummary` export (RED→GREEN).** Create the source-text contract test (mirroring `tests/vitest/workshop-favorites-schema.test.ts`: read the repo/page/client files as strings, assert the additive `.from(...)` reads, return key, type field, and `groupId: null` for shared items); then add the `ProjectGroupSummary` export next to the other repository summary types. *(full TDD steps: phase doc Task 1, Steps 1.1–1.3)* — **produces** `tests/vitest/workshop-project-groups-repository.test.ts` (`"exports the camelCase ProjectGroupSummary contract"` passes after Step 1.2).
- [ ] **Task 2 — Extend the `Promise.all` batch with per-user group + membership reads.** Append the two reads as the LAST two entries of the existing `Promise.all([...])` (after the `workspace_members` read) and add two trailing destructure names + two error guards (throw unconditionally, NOT `isMissingOptionalCollaborationTable`); build the ordered `projectGroups: ProjectGroupSummary[]` and the `groupIdByProjectId` `Map<string,string>`. *(full TDD steps: phase doc Task 2, Steps 2.1–2.5)* — **green test:** `-t "no N+1"` (both reads in the single `Promise.all`, before the destructure).
- [ ] **Task 3 — Stamp `groupId` + return `projectGroups` (one owned diff for shared types).** Append `groupId: string | null` to internal `WorkshopProjectListItem`; stamp `groupId: groupIdByProjectId.get(project.id) ?? null` in `createProjectListItem`; default `groupId: null` in `createPendingInviteProjectListItem`; append `projectGroups` after `favoriteProjectIds` in the return; append optional `groupId?: string | null` to the exported client `ProjectListItem`. *(full TDD steps: phase doc Task 3, Steps 3.1–3.7)* — **green tests:** `"stamps groupId on every project list item"`, `"returns projectGroups additively"`, and the LD-2 invariant `"resolves groupId to null for shared / non-owned list items"`.
- [ ] **Task 4 — Prove existing consumers unaffected (regression gate).** Run the full green-bar suite plus the downstream read-shape importers (`reusable-sources-actions`, `component-library-actions-revalidation`, `project-source-insert-action`) — they mock `listCurrentWorkspaceProjects` and only read `{ projects }`, so the additive `projectGroups` key is invisible. Note the 7a `types.ts`-regen dependency in the PR body. *(full TDD steps: phase doc Task 4, Steps 4.1–4.4)* — **verification gate** (no new file).
- [ ] **Task 5 — Thread `projectGroups` through the route loader (one-line prop).** Add `projectGroups?: ProjectGroupSummary[]` to `ProjectsPageClientProps` (import the type from the repository — single source of truth; do NOT redefine), add the `EMPTY_PROJECT_GROUPS` default in the signature; in `page.tsx` destructure `projectGroups` from the read and forward `projectGroups={projectGroups}` in JSX — exactly mirroring `favoriteProjectIds`. *(full TDD steps: phase doc Task 5, Steps 5.1–5.4)* — **green test:** the full `"client ProjectListItem and page wiring expose groups additively"` (page now contains `projectGroups`).

> **Green-bar command (run after each task):** `bunx vitest run tests/vitest/projects-page-card-layout.test.tsx tests/vitest/projects-page-shared-access.test.tsx tests/vitest/main-sidebar-favorites.test.tsx tests/vitest/workshop-favorites-schema.test.ts tests/vitest/workshop-project-groups-repository.test.ts && bun run type-check` (drop the last file before Task 1). Commit on green; never batch the type edit with the read edit with the page edit — three commits minimum.

#### Pros / Cons
**Pros**
- **Lowest-risk code phase.** Purely additive (two batched reads, one new exported type, one new field, one threaded prop) — no DB or data change; the cleanest revert of the four phases.
- **Invisible to 29 importers.** Adding a named return key + an appended field/destructure name is invisible to every consumer that destructures named keys (07 §0.3); existing `projects`/`favoriteProjectIds` keys untouched.
- **No N+1.** Reads ride the existing single `Promise.all` wave — one round-trip, no new serial await, no per-project query.
- **Deterministic test with zero infra.** Source-text assertion (mirrors `workshop-favorites-schema.test.ts`) pins the additive contract fast, with no Supabase dependency.

**Cons**
- **Hub blast radius.** `workspace-repository.ts` has 29 importers (03 §"hub"), so even an additive edit demands rigorous rebase-and-re-read discipline; a stray reorder of the positional `Promise.all` destructure would ripple silently.
- **Hard gated on 7a.** Cannot start until the regenerated `types.ts` carries both tables; a reviewer pulling this phase without 7a's types gets a `type-check` failure at `.from("project_groups")`.
- **Concurrent-lane coordination.** All three shared files (`workspace-repository.ts`, `projects-page-client.tsx`, `page.tsx`) have in-flight C1/C2/C3 edits; this phase lands AFTER them and must append-after-whatever-C1-added.
- **Source-text test is positional-fragile by design.** It anchors on string fragments (e.g. `groupIdByProjectId.get(project.id) ?? null`); a benign rename of the lookup map breaks the test until updated — acceptable as a contract pin, but a maintenance touchpoint.

#### Risks & mitigations
- **Reorder/rename of `projects`/`favoriteProjectIds` or the positional `Promise.all` destructure** breaks the 29 importers silently. → Append the two new reads/destructure names as the LAST entries; append `projectGroups` AFTER `favoriteProjectIds`; the Task 1 test asserts `projects: [`, `favoriteProjectIds:`, and `projectGroups:` all remain present. Run the downstream-consumer suites (Task 4 §4.2).
- **`types.ts` regeneration race (00 §5 risk-row 7; 07 §7).** Starting before 7a's single post-all-migrations regen captures a partial schema. → §0.2 type-presence gate before Task 1; PR body states the 7a→7c merge-order dependency (§4.3).
- **Cross-user group leak.** Widening the membership read past `.eq("user_id", profile.id)` would let a shared/non-owned project inherit another user's group. → Per-user scoping on the read + `groupIdByProjectId.get(project.id) ?? null` default; pinned by the `"resolves groupId to null for shared / non-owned list items"` test (LD-1/LD-2).
- **Optional client `ProjectListItem.groupId` undefined-vs-null (07 §7 open-risk-4).** `normalizeProjectListItem` synthesizes items without setting `groupId`. → Field is optional on the client type; Part 7d's override math reads `item.groupId ?? null`, collapsing `undefined → null` (Ungrouped). Pending-invite synthetic items default to `groupId: null`.
- **Concurrent-lane churn in shared files.** → §0.4 rebase-before-edit checklist before every shared-file edit; cite behavior not line numbers; three+ small commits.

#### Definition-of-Done (15 §4.3 + phase doc Done-criteria)
- [ ] `ProjectGroupSummary` exported from `workspace-repository.ts` exactly per 07 §3.1 (camelCase `id`, `name`, `accentId`, `position`); the client imports it, never redefines it.
- [ ] The two per-user reads live in the single `listCurrentWorkspaceProjects` `Promise.all` (no N+1, no new serial await), scoped `.eq("user_id", profile.id)`; `groupId` stamped on every list item; `projectGroups` returned additively after `favoriteProjectIds`; `projects`/`favoriteProjectIds` keys and the positional destructure order unchanged.
- [ ] `groupId` resolves to `null` for shared / non-owned list items (per-user scoping + `?? null`), pinned by the `"resolves groupId to null for shared / non-owned list items"` test — no cross-user group leak.
- [ ] `groupId` is non-optional on `WorkshopProjectListItem` (always stamped) and optional on client `ProjectListItem` (defaults to null-equivalent for synthesized items).
- [ ] `bunx vitest run tests/vitest/workshop-project-groups-repository.test.ts` fully green.
- [ ] Downstream-consumer suites all green (29-importer hub unaffected): `projects-page-card-layout`, `projects-page-shared-access`, `main-sidebar-favorites`, `workshop-favorites-schema`, `reusable-sources-actions`, `component-library-actions-revalidation`, `project-source-insert-action`.
- [ ] `bun run type-check` → exit 0 (with `project_groups`/`project_group_memberships` reads).
- [ ] No UI / `organizeBy` / override map / accent code in this phase (those are Phase 4); the `page.tsx` change is one destructure line + one JSX prop mirroring `favoriteProjectIds`.
- [ ] `git log --oneline` shows small additive commits (test scaffold → batch read → groupId+return → page wiring), never a reorder/rename of `projects`/`favoriteProjectIds`/existing list-item keys.

> **Rollback (15 §3.3 "Phase 3 additive revert"):** purely additive — no DB/data to undo. Revert ONLY the six forward-edit items (two `Promise.all` entries + trailing destructure names; two error guards; `projectGroups`/`groupIdByProjectId` derivations; `groupId` stamp + pending-invite default; `projectGroups` return key; `ProjectGroupSummary` export + `groupId`/`projectGroups` type/prop/import). PRESERVE the existing `projects`/`favoriteProjectIds` keys and the leading-six positional destructure order. Re-run the green-bar + downstream-consumer suites to confirm the 29 importers stay green. If Phase 4 already landed, revert it FIRST.


### Phase 4 — Client UI + Tests

**Objective.** Build the entire client surface for Project Groups on `/workshop/projects` — a third "Organize by" mode (None / Date / Group) — by extracting one reusable `ProjectGroupSection`, decoupling grouping from the sort field, adding `organizeBy` state + localStorage persistence, user-group bucketing with a virtual Ungrouped bucket, the LD-4 color accents, optimistic group assignment (card kebab + bulk dock), and a `DropdownPopupPanel`-based Manage-groups popover — all while keeping the existing date/client DOM **byte-identical** so every `projects-page-*` suite stays green.

**Depends on.** Phases 1–3 all merged (strict `7a→7b→7c→7d`): `Tables<"project_groups">`/`Tables<"project_group_memberships">` in `types.ts` (P1); the seven actions + typed `bulkAssignProjectsToGroup` (LD-11) + `group-constants.ts` (`MAX_PROJECT_GROUPS`=50, `MAX_PROJECT_GROUP_NAME_LENGTH`=40) (P2); `ProjectGroupSummary` export, `groupId` on `WorkshopProjectListItem`/`ProjectListItem`, `page.tsx` `projectGroups` prop (P3). **Plus** the LD-10 primitive prerequisite: `DropdownMenuItemProps.selected?: boolean` (trailing `Check`) must exist in `src/components/ui/dropdown-menu.tsx` before Tasks 5–6. Also: C1/C2/C3 in-flight efforts landed; rebase-and-re-read every shared file before editing.

**Files.**
- Create: `src/lib/workshop/group-accent.ts`; `src/components/workshop/project-grid-layout.ts`; `src/components/workshop/ProjectGroupSection.tsx`; `src/components/workshop/ManageGroupsPopover.tsx`
- Modify: `src/components/workshop/projects-page-client.tsx` (organizeBy axis, bucketing, overrides, popover host, kebab/bulk affordances); `src/components/workshop/LiveProjectCard.tsx` (optional `groupAssignMenu` render-prop on the details-action menu, NOT the C3 hover overlay)
- Test (new): `tests/vitest/group-accent.test.ts`; `tests/vitest/project-group-section.test.tsx`; `tests/vitest/projects-page-organize-control.test.tsx`; `tests/vitest/projects-page-group-mode.test.tsx`
- Test (must stay green, never edited): `tests/vitest/projects-page-sort-controls.test.tsx`, `projects-page-card-layout.test.tsx`, `projects-page-shared-access.test.tsx`, `projects-page-view-mode.test.tsx`, `projects-page-access-tabs.test.tsx`, `bulk-destructive-preview-modal.test.tsx`, `main-sidebar-favorites.test.tsx`

**Contracts bound (07 §refs — copy verbatim, do not redrift).**
- §3.3 `type ProjectOrganizeBy = "none" | "date" | "group"`; §3.4 `GroupAccentId` (8 ids); §3.1 `ProjectGroupSummary { id; name; accentId; position }` (imported, never redefined).
- §5.1 storage key `archestimator_projects_organize_by_v1` + event `archestimator:projects-organize-by-change`; Q1 default = `"date"` when initial sort field is a grouping sort (date field **or** `client_name`) else `"none"` (LD-13). §5.8 `project-grid-layout.ts` byte-identical class strings (`minmax(132px,1fr)`/`(200px)`/`(248px)`, list `rounded-xs border border-hairline`).
- §5.2 `ProjectGroupSection` prop interface (`mode`/`group`/`legacyHeaderDataAttr`/`legacySectionDataAttr`/`headerMenuSlot`); §5.4 `group-accent.ts` API + LD-4 locked palette (`slate/stone/sage/teal/indigo/plum/rose/clay`, `DEFAULT_GROUP_ACCENT.id = "neutral"`); §5.3 `groupProjectsByUserGroup`.
- **§5.6 byte-identical DOM anchors (preserve verbatim):** `aria-label="Live projects"`, `data-project-view-mode`, `data-project-date-group`, `data-project-date-group-label=""`, `data-project-group-label`, `data-project-client-group`, `data-project-group`/`data-project-group-kind`, the View/Sort-field/Sort-direction comboboxes, `data-project-toolbar-view-divider=""`.
- **§5.7 new anchors (add):** combobox `aria-label="Organize by"` (Shared disabled variant), `data-project-group-kind="group"`, `data-project-group="__ungrouped__"` + `aria-label="Ungrouped"`, `data-project-group-virtual=""`, card `"Move to group"` menu, `data-bulk-move-to-group`, Manage-groups popover `role="dialog" aria-label="Manage groups"`.
- §5.5 optimistic assignment (D14/LD-6 reconciliation `useEffect`; D9/LD-5 assignment-specific selection); §4.6 `moveProjectToGroup`; §4.7 `bulkAssignProjectsToGroup` typed `{ movedProjectIds, skippedProjectIds }` (LD-11).

**Task list.**
- [ ] **Task 1 — `group-accent.ts` palette + resolver.** Ship the LD-4 8-swatch non-brand-orange palette, `DEFAULT_GROUP_ACCENT` (`id: "neutral"`, distinct from `slate`), `resolveAccent`, `isGroupAccentColor`; inline-`style` only, never on text. _(full TDD steps: phase doc Task 1, Steps 1.1–1.3.)_ Test: `tests/vitest/group-accent.test.ts` (palette purity, non-orange guard, neutral-vs-slate distinction).
- [ ] **Task 2 — `project-grid-layout.ts` extraction.** Move `getProjectGridClassName` + `getProjectDateFlagLayoutClassName` verbatim (byte-identical strings) and import-swap in the client; delete the two local fns. _(full TDD steps: phase doc Task 2, Steps 2.1–2.4.)_ Test: regression via `projects-page-view-mode` + `projects-page-card-layout` + `projects-page-sort-controls` stay green (no new test; behavior-preserving refactor).
- [ ] **Task 3 — `ProjectGroupSection` (one component for date/client/group).** Reproduce the legacy flag block exactly via `legacySectionDataAttr`/`legacyHeaderDataAttr` (date/client label text rendered raw in the `<h3>`, NOT a truncating span, so `getByText(...).toHaveClass("border-x","bg-surfaceMuted")` holds); add accent rule/dot, collapse caret, count, header-menu slot for group mode; render date/client through it in the client. _(full TDD steps: phase doc Task 3, Steps 3.1–3.5.)_ Test: `tests/vitest/project-group-section.test.tsx` + `projects-page-sort-controls.test.tsx` (byte-identity gate).
- [ ] **Task 4 — `organizeBy` axis + persistence + Q1 default + Shared coercion.** Clone the view-mode `useSyncExternalStore` machinery behind `archestimator_projects_organize_by_v1`; add the "Organize by" `DropdownSelect` (peer to View/Sort); decouple grouping from `isDateSortField` (re-gate `shouldGroupProjects` on `organizeBy === "date" && (isDateSortField || client_name)`) while **leaving the `!sortTouched && isDateSortField` ordering branch untouched**; coerce away from `"group"` on Shared without clobbering the stored pref (D11). _(full TDD steps: phase doc Task 4, Steps 4.1–4.7; faithful replacement block in 4.4.)_ Test: `tests/vitest/projects-page-organize-control.test.tsx` (Q1 default, switch removes flags, persistence, Sort stays visible, Shared disable+coerce, D15 tab-change clear).
- [ ] **Task 5 — group-mode bucketing + Ungrouped + zero-groups empty state + accents + Manage-groups popover.** Add `groupProjectsByUserGroup` (iterate server groups so empty named groups render; route dangling `groupId` → Ungrouped (D12); pin virtual Ungrouped last, hidden when empty; hide zero-match groups during search); render group sections; build the **P0-1 zero-groups EmptyState** (`FolderSimple`, "Organize projects into groups", CTA "Create your first group") ABOVE the single Ungrouped flag; the **LD-10 all-groups-empty-during-search fallback** via `renderTabEmptyState()`; the `ManageGroupsPopover` on `DropdownPopupPanel`/`useDropdownPopup` (Escape/outside-click/focus-trap free), `rounded-xs` swatches, recolor via `DropdownMenu.Item selected`, caps imported from `group-constants.ts` (LD-8 DRY), inline-confirm delete (NOT `BulkDestructivePreviewModal`, D10). _(full TDD steps: phase doc Task 5, Steps 5.1–5.9; popover code in 5.6.)_ Test: `tests/vitest/projects-page-group-mode.test.tsx` (position-ordered sections + trailing Ungrouped, empty named groups, dangling-id defense, search hiding, accent render, zero-groups P0-1 cases, search-empty fallback).
- [ ] **Task 6 — optimistic assignment (LD-6) + card kebab + bulk dock (LD-5/LD-11) + toast.** Override-map keyed by groupId (not boolean); wrap action + `router.refresh()` in `startTransition`; clear overrides in a **reconciliation `useEffect`** that fires once `isGroupMutationPending===false` AND SSR `item.groupId` equals the override — NEVER in a `router.refresh().then()` (LD-6); failure restores prior override + toasts. Bulk path reads the **assignment-specific** `selectedAssignableProjectIds` (`canAssignProjectToGroup` = `accessKind === "owned"`, LD-2), NOT the delete-gated `selectedVisibleProjectIds` (LD-5/D9); keys clear/rollback off the typed `{ movedProjectIds, skippedProjectIds }` and toasts partial failure with `tone:"error"` (LD-11). Card menu via optional `groupAssignMenu` render-prop on `LiveProjectCard` details-action menu, current effective group marked with trailing `Check` (LD-10). _(full TDD steps: phase doc Task 6, Steps 6.1–6.6.)_ Test: assignment cases in `projects-page-group-mode.test.tsx` (optimistic move + refresh, reject restores+toasts, bulk move, LD-5 delete-blocked-still-groupable, LD-11 skipped rollback + partial toast, LD-6 interleaving no-flicker).
- [ ] **Task 7 — a11y, responsiveness, full-matrix regression sweep.** Caret keyboard-operable (`aria-expanded` flips), accent `aria-hidden` (never sole signal), labels `text-secondary` for AA; group mode across all 4 view modes uses the shared grid strings; run every group suite + the full byte-identical baseline + `type-check`; confirm `bulk-destructive-preview-modal.test.tsx` was never edited. _(full TDD steps: phase doc Task 7, Steps 7.1–7.4.)_ Test: a11y + responsive cases appended to `projects-page-group-mode.test.tsx`.

**Pros / Cons.**

| Pros | Cons |
|---|---|
| Single `ProjectGroupSection` renders date, client, AND group — one DOM contract, no parallel renderers to keep in sync. | Highest-risk refactor of the pack: re-gating `shouldGroupProjects` on `organizeBy` is one mis-edit away from regressing the byte-identical date/client suites. |
| Feature is fully behind the `organizeBy` control, so revert = remove the client PR with zero DB/data change (15 §3.4 — lowest blast radius). | All UI logic concentrates in the already-churning `projects-page-client.tsx` (also touched by C1/C2/C3), demanding constant rebase-and-re-read. |
| Reuses the proven `useSyncExternalStore`+custom-event localStorage machinery and the shared `DropdownPopupPanel`/`DropdownMenu` primitives (LD-10) — Escape/outside-click/focus-trap for free. | Depends on a `05`/primitive change (`DropdownMenu.Item selected`) landing first; if absent, Tasks 5–6 cannot mark the current group/color. |
| New group behavior lands only in NEW test files; the date/client suites are never edited, keeping the regression contract clean. | LD-6 reconciliation effect + interleaving correctness is subtle (non-awaitable `router.refresh()`); easy to reintroduce the early-clear flicker if copied from the wrong pattern. |
| LD-5 assignment selection decoupled from the delete gate keeps owned-but-delete-blocked projects groupable; LD-11 typed result gives honest partial-failure UX. | The flat (non-nested) `DropdownMenu` + render-prop card-menu and in-flow bulk affordance are deliberate lower-collision deviations from §5.7's "extend the dock" wording (flagged for review). |

**Risks & mitigations.**
- **`organizeBy` decoupling regresses the date path (07 §7; highest-risk surface).** Mitigation: use ONLY the "faithful" gate change (Task 4.4) — `organizeBy === "date" && (isDateSortField || client_name)` — and **never touch the `!sortTouched && isDateSortField` ordering branch in `displayProjects`**; add the `organizeBy="none"` newest-first regression assertion; run the baseline set after every shared-file edit.
- **Date/client label resolves to a wrapper span and fails `getByText(...).toHaveClass(...)`.** Mitigation: render `group.label` raw in the `<h3>` for date/client mode (truncating span only in group mode); pin with the `tagName === "H3"` assertion (Task 3.4).
- **LD-6 early-clear flicker / rapid-reassign races.** Mitigation: clear overrides only in the reconciliation `useEffect` guarded by `!isGroupMutationPending` AND SSR-equals-override; interleaving test holds the first action open and asserts no flicker to the prior bucket.
- **D9 selection coupling (LD-5).** Mitigation: separate `selectedAssignableProjectIds` (gated by `canAssignProjectToGroup`) read by "Move to group"; test that an owned project with an active shared link is still bulk-assigned.
- **Cross-tab group deletion → dangling `groupId`.** Mitigation: `groupProjectsByUserGroup` routes unknown ids to Ungrouped (D12); dangling-id test.
- **Cap/name drift between popover and server.** Mitigation: import `MAX_PROJECT_GROUPS`/`MAX_PROJECT_GROUP_NAME_LENGTH` from `group-constants.ts` (LD-8 DRY), never re-declare.
- **Toast harness misconfig hides failure-path assertions.** Mitigation: `renderClient` wraps `ToastProvider`; failure tests assert the rolled-back bucket state (provider-independent) before the toast copy.

**Definition-of-Done (15 §4.4 + phase-doc acceptance).**
- [ ] Date/client/sort byte-identity preserved: `projects-page-sort-controls`, `projects-page-card-layout`, `projects-page-shared-access`, `projects-page-view-mode`, `projects-page-access-tabs`, `bulk-destructive-preview-modal`, `main-sidebar-favorites` all green; `bulk-destructive-preview-modal.test.tsx` untouched.
- [ ] New group suites green: `group-accent.test.ts`, `project-group-section.test.tsx`, `projects-page-organize-control.test.tsx`, `projects-page-group-mode.test.tsx`.
- [ ] Accents ship v1 (LD-4): `group-accent.ts` exposes `GroupAccentSwatch`, the 8 locked hues, `DEFAULT_GROUP_ACCENT.id="neutral"`, `resolveAccent`, `isGroupAccentColor`; inline-style only, labels stay `text-secondary` (#5D5D5D) for AA, provably non-brand-orange.
- [ ] `organizeBy` axis (None/Date/Group) persists to `archestimator_projects_organize_by_v1`; Q1 default = date-when-grouping-sort (LD-13); grouping decoupled from `isDateSortField`; Sort stays visible in all modes.
- [ ] `groupProjectsByUserGroup` renders empty named groups when not searching, pins virtual Ungrouped last (hidden when empty), buckets dangling ids to Ungrouped, hides zero-match groups during search.
- [ ] D14 corrected (LD-6): overrides cleared via `useTransition`+`useEffect` once SSR authoritative (no `.then()` on `router.refresh()`); interleaving test passes; bulk keys off the LD-11 result and toasts on skips.
- [ ] D9 realized (LD-5): bulk "Move to group" reads `canAssignProjectToGroup`-gated selection; delete-blocked owned project still bulk-assigned.
- [ ] P0-1 zero-groups Group-mode empty state implemented + tested (CTA opens the Manage-groups popover, renders above a single Ungrouped flag).
- [ ] LD-10 UI reuse: Manage-groups popover on `DropdownPopupPanel`/`useDropdownPopup`; `rounded-xs` accents; current-group/color "checked" via `DropdownMenu.Item selected`; `ui/` primitive buttons; all-groups-empty-during-search fallback.
- [ ] Card kebab attaches to the `LiveProjectCard` details-action menu (NOT the C3 hover overlay), built once; `selectedProjectIds` preserved across organize switches, cleared across access-tab switches (D15).
- [ ] `bun run type-check` → exit 0.

---

## 6. Cross-cutting concerns (apply across all phases)

- **Concurrency & rebase discipline (the dominant risk).** Every shared-file edit follows §4's
  rebase-before-edit ritual. Prefer new files. The repository type edit is one owned diff. See `06` §C–E.
- **Optimistic assignment & D14 reconciliation.** `router.refresh()` is non-awaitable. Wrap the action +
  `router.refresh()` in `startTransition`; clear the per-project group override in a `useEffect` only once
  the transition settles **and** the incoming SSR `groupId` reflects the move — never in a `.then()`. The
  override encodes *which* group, so an early or never-cleared override masks a later legitimate SSR move.
  Add the interleaving test (a re-assign during a pending refresh must not flicker). `07` §5.5 / `11` Task 6.1.
- **Security (do NOT claim RLS complete from TS tests alone).** Three scoping layers on every action:
  current user, current workspace, and the **D9/LD-2 `owned` predicate** (workspace-role OR `created_by`,
  handling nullable `created_by`) — never a bare `created_by` gate. Two RLS layers: the per-user `FOR ALL`
  policy + the membership-insert `exists()` IDOR backstop (in the migration, canonical). Provider proof
  (anon/cross-user/IDOR denial, advisor gate, generated types) is required for DB phases. See `14` §5 + `15` §2.
- **Accents (containment).** Inline-`style` only from the single `group-accent.ts` palette (LD-4 hexes);
  never Tailwind color utilities, never on text (labels stay `text-secondary` #5D5D5D for AA), never
  brand-orange; dots/rules `rounded-xs`. `07` §5.4 / `05` §5.
- **DOM byte-identity.** The date/client anchors in `07` §5.6 MUST survive verbatim through
  `ProjectGroupSection` (via `legacySectionDataAttr`/`legacyHeaderDataAttr`). New group-mode anchors are in
  `07` §5.7. The `projects-page-sort-controls` / `-card-layout` / `-shared-access` suites are the guard.
- **Caps semantics.** 50 groups / 40-char names enforced in the app/server layer only (typed
  `ProjectGroupCapError`/`ProjectGroupNameError`); no DB check constraint. `07` §2.5 / `09`.

---

## 7. Validation, STOP conditions & non-goals

The **consolidated, per-phase validation command block**, the full **STOP/escalate conditions**, and the
**v1 non-goals** are owned by [`14`](./14-implementer-handoff-and-runbook.md) §6 / §7 / §8 — run them from
there to avoid drift. In brief:

- **Per-phase proof:** Phase 1 = SQL structural probes + the LD-9 RLS-isolation proof + `get_advisors` gate
  + `bun run type-check`; Phases 2–4 = the named Vitest suites (`14` §6) + `type-check` + `git diff --check`;
  Phase 4 additionally runs the **full date/client byte-identity regression sweep**.
- **STOP and escalate** (full list in `14` §7) when: `type-check` is already red on the untouched tree; a
  `project_group*` schema already exists; the RLS sanity control fails (BYPASSRLS / wrong role); a cross-user
  read returns non-zero or an IDOR forge insert succeeds; the advisor WARN count rises above 74 or any new
  ERROR appears; any existing `projects-page-*` DOM anchor breaks; or C1/C2/C3 have not landed.
- **v1 non-goals** (full list in `14` §8): `ProjectDetailsModal` group field, drag-onto-flag, group reorder
  via DnD (if the primitive isn't cheaply reusable), collapse persistence, sidebar groups, shared-project
  groups, many-to-many tags. **Not a non-goal:** color accents — they ship in v1 (D13/Q3).

---

## 8. Readiness statement

This package is **implementation-ready**. The one blocker and all six high-severity adversarial findings
are fixed and verified (`12` §2); the former FIX@IMPL items are integrated as built tasks/steps in `08`–`11`
(`12` §4 is now the integration index, LD-8). Readiness is **evidenced**, not asserted: the
requirement→task→test traceability matrix (`13`) ends with a 100% coverage scorecard showing every D1–D16,
Q1–Q4, and MVP acceptance criterion bound to a named test or SQL probe (the only un-tested rows are explicit
fast-follows). Per-phase rollback and definition-of-done gates are in `15`.

**The one gating external dependency is concurrency:** build Groups only after C1/C2/C3 land (or with
explicit owner approval to proceed on the current branch), following §4's rebase-before-edit discipline.
With that precondition met, an implementer following this guide and the phase docs it references can ship
Project Groups with full test coverage and zero regression to the existing projects-page behavior.
