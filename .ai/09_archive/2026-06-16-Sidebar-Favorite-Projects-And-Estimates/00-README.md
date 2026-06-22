# Sidebar Favorite Projects & Estimates — Audit & Implementation Package

**Date:** 2026-06-16
**Type:** Planning · Readiness · Debugging · Audit (no code is *committed* from this package — but note the
feature's read/render half already exists **uncommitted** in the worktree; see `12`. This package is the plan
that authorizes the remaining reactive code.)
**Status:** Audit-hardened across two adversarial passes. Strategy and quality are high and evidence-backed;
implementation-readiness is gated only on the implementation-phase browser proof and the cross-plan
coordination in `12`. Honest residual risks are tracked in `05` and `11` — this package does **not** claim a
uniform 100% on every cell, because two dimensions carry genuine residual risk (the exact Next internal was
never reproduced; authenticated browser proof is deferred to implementation). See `05`.
**Branch context:** `codex/fix-project-delete` (graph built on `main`; symbol references are authoritative;
line refs are stale snapshots to verify before editing — many target files are currently dirty).

---

## The one-paragraph problem

The sidebar has a **Favorites** section that lists favorited projects and their favorited
estimate sheets. When a user toggles "favorite" on a project (projects page) or an estimate,
the new favorite **does not appear in the sidebar until a full page reload or navigation**.
The user's instinct is correct: the sidebar needs a **reactive client-side source of truth**
for favorites so that a toggle anywhere updates the sidebar immediately. Today the sidebar is
a **server-rendered, prop-fed list with no client reactivity**, and the two toggle flows
(project vs. estimate) propagate changes **differently and inconsistently** — neither reliably
reaches the sidebar.

## Root cause in one sentence

The sidebar's favorites are produced once by a server component (`WorkshopPageShell` →
`listMainSidebarFavoriteProjects()`) and passed to a client component (`MainSidebar`) as a
**static prop**; the toggle flows rely on `revalidatePath()` + `router.refresh()` (project) or
a **page-local Zustand store with no refresh at all** (estimate), and **neither path has any
shared, reactive channel into the sidebar** — so the sidebar goes stale until the layout
re-renders from scratch. (The exact Next-internal repaint mechanism was not reproduced; the fix
removes the dependency on it entirely — see `01` §4 and `11`.)

---

## Documents in this package

| # | File | What it covers |
|---|------|----------------|
| 00 | `00-README.md` | This index — problem, root cause, recommended direction, how to navigate |
| 01 | `01-root-cause-analysis.md` | The debugging story: read path, write path, the two distinct failures, the project-flow contradiction resolved with evidence |
| 02 | `02-current-architecture-map.md` | Ground-truth map of the favorites feature, with audit-2 corrections (line drift, no-empty-state, workspaceId gap, uncommitted baseline) |
| 03 | `03-implementation-plan.md` | The fix: routes compared, recommendation, concrete contracts, phased plan, test plan, rollback |
| 04 | `04-code-review-findings.md` | Audit findings beyond the bug — severity-ranked, including the audit-2 P1 blockers |
| 05 | `05-scorecard-and-readiness-audit.md` | Rubric, pre/post scores across **both** audit passes, and honest residual risks |
| 06 | `06-decision-register.md` | Resolved decisions D1–D14 (several revised in audit-2) |
| 07 | `07-requirements-traceability.md` | Requirements R1–R20 mapped to units, files, tests, and QA |
| 08 | `08-ux-interaction-state-spec.md` | Loading, empty, overflow, pending, error, rollback, focus management, live regions, insert animation, collapsed/mobile, a11y |
| 09 | `09-implementation-task-packet.md` | File-level coding handoff with phase labels |
| 10 | `10-ultraqa-adversarial-scenarios.md` | Adversarial QA matrix (QA-01–QA-22) and evidence report contract |
| 11 | `11-root-cause-confirmation-and-race-safety.md` | Repro guidance + proof the fix is correct regardless of cause and has no equivalent race |
| 12 | `12-cross-plan-coordination.md` | Working-tree reality + shared-file ownership with the sibling Project Groups plan |
| 13 | `13-security-and-cache-contract.md` | Loader auth posture, scope eviction, logout clear, input validation, threat model |
| 14 | `14-master-implementation-guide.md` | **The executable build guide** — SWOT, route comparison, global contract pinboard, Phases 0–5 as bite-sized TDD tasks (failing test → minimal code → verify → commit) with real code, exit gates, risk register, Definition of Done. Synthesizes docs 00–13. |

Read **01** for *why it's broken*, **03** for *what to do*, **11/12/13** for the audit-2 hardening, then
**06–10** for the contracts and QA. **When you are ready to build, follow `14` top-to-bottom** — it is the
single executable guide and cites the others for any detail it does not reproduce. **02** and **04** are reference.

---

## Recommended direction (full rationale in `03`)

Make the sidebar favorites a **scoped TanStack Query-backed reactive list** seeded by SSR `initialData`, and
have **both** the project toggle and the estimate toggle write to that **one shared, scoped query cache** via
`setQueryData` (optimistic) + invalidate-on-settle. The loader is a **`"use server"` action used as the
`queryFn`** (matching the codebase's own convention — `fetchProjectCollaborationSummary`), **not** a route
handler (D3). This:

- Matches the project's **own documented state mandate** — "TanStack Query for server state"
  (`.ai/06_specs/state-and-supabase-foundation.md`); the sidebar list *is* server state.
- Gives the **immediate, cross-route reactivity** the user asked for without depending on `router.refresh()`
  (which the codebase already distrusts and has deliberately replaced elsewhere — see `01` §4 and
  `project-estimates-store.ts` / `LibraryPageClient.tsx`).
- **Unifies** the two divergent toggle flows behind one mutation lifecycle (two hooks sharing a helper — D13),
  killing the project/estimate inconsistency at the source.

A Zustand-only store (the user's literal phrasing) would also work, but holding *server state* in Zustand
contradicts the documented three-layer model. The query-cache approach **is** the "store" the user wants — the
right one for this kind of state. Argued, with trade-offs and the rejected route-handler mechanism, in `03`.

## Resolved decisions (see `06` for the full register)

The hardening passes resolved every open choice. Highlights, including audit-2 revisions:

1. **Query scope + sourcing:** key `["favorites","sidebar",workspaceId,userId]` via one shared builder;
   `workspaceId` is sourced in the shell via `ensureDefaultWorkspace()` (it is **not** in
   `getCurrentUserContext()`) and threaded as props (D2).
2. **Client loader:** a `"use server"` action used as the `queryFn` — not a route handler (D3).
3. **Freshness:** `initialData` + **`staleTime: 0`**; no bespoke reconcile-on-mount (D4 — the global 5-min
   `staleTime` would have silently defeated reconciliation).
4. **Estimate under non-favorited project:** mirror server behavior; the explanatory live-status cue is now
   **required**, not optional (D5).
5. **Optimistic timestamp:** synthesize `new Date().toISOString()` on insert so a new favorite sorts to the top
   (D11), mirroring the existing `ProjectEstimateFavoriteButton.tsx:50` precedent.
6. **Cache eviction:** explicit `removeQueries` on scope change **and** on logout (D12, `13`).
7. **Shared/non-owned favorites:** preserve the 2026-06-03 suppression decision (D6).
8. **Next cache backstop:** keep `revalidatePath`; no one-arg `revalidateTag` (compile error in Next 16) (D7).
9. **Homebase:** route the removed-project action through the shared project mutation; preserve its
   `router.replace` navigation (D8 — corrected; it was never `router.refresh()`).
10. **Mutation surface:** two hooks (`useToggleProjectFavorite`, `useToggleEstimateFavorite`) sharing an
    internal helper, not one unified module (D13).
11. **Server-action hygiene:** boolean validation + `workspace_id` on the project-favorite delete (authz);
    defer the `ignoreDuplicates` alignment (D14).

## Success criteria

- Favorite a project → project card and sidebar update optimistically without `router.refresh()`.
- Favorite an estimate under a visible sidebar favorite project, within the top-8 project cap → table row and
  sidebar update optimistically.
- Favorite an estimate under a non-favorited project → table row updates, sidebar remains unchanged **and the
  required cue tells the user why** (D5), matching reload.
- Mutation failure → every optimistic surface rolls back from one snapshot with accessible failure feedback.
- Navigation/reload → the scoped query cache reconciles to server truth (`staleTime: 0` makes this actually
  refetch) without cross-user/workspace leakage; logout clears the cache.
- Tests cover helper shaping/sort/trim/timestamp-synth, scoped cache + eviction, rollback, rapid toggles,
  invalid inputs, logout leakage, focus survival, and focused browser/component behavior.

---

## Two-pass adversarial provenance & vigilance note

**Pass 1** produced the package via 5 parallel read-only investigation agents (data layer, sidebar read path,
toggle write path, state architecture, project-flow verification), synthesized centrally, then pressure-tested
by an adversarial feasibility agent.

**Pass 2 (audit-2, 2026-06-16)** re-reviewed the self-claimed-100% package with 7 persona reviewers
(coherence, feasibility, adversarial, product, security, design, scope) + 2 code-verification agents reading
real source. It found and fixed real blockers the self-scorecard had missed: the `workspaceId` sourcing gap,
the optimistic-timestamp contradiction, the `staleTime` reconciliation defeat, the route-handler convention
deviation + auth/cache foot-guns, the logout cache-leak, the existing-test mismatch, the D5 silent dead-end,
and the D8 Homebase mischaracterization. Honest re-scoring and the residual-risk register are in `05`.

**Assume other coding agents are touching these same files.** Before implementing:

1. Re-confirm line numbers (`rg`/graph) — the repo is on `codex/fix-project-delete`, graph built on `main`,
   and many target files are dirty (e.g. `toggleProjectFavorite` is at line **508**, not 483).
2. Run `git status` and read `12-cross-plan-coordination.md` — the read/render half is **already built
   uncommitted**, and the sibling Project Groups plan touches five of the same files.
3. This is a **plan**; the remaining reactive code is not yet written. Build on the uncommitted baseline; do
   not revert unrelated dirty files.
