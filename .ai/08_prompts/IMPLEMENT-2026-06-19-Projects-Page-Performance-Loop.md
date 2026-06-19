# IMPLEMENT — Projects Page Performance (loop prompt)

> Paste this whole file as the opening message for a serious implementation session.
> It activates the canonical bounded loop in `.ai/00_system/AGENT_OPERATING_PROTOCOL.md`
> ("Loop activation criteria and bounds") and the durable-artifact / `LOOP_LEDGER`
> contract in `.ai/00_system/AGENT_FRAMEWORK_PROTOCOL.md`. This is an **adapter** — it
> points at the canonical mandate and fills in the task; it does not fork or weaken it.

---

## Task

Drive the `.ai/03_plans/2026-06-19-Projects-Page-Performance/` plan pack to a **fully
closed state**: verify the already-shipped work still holds on the current checkout,
then complete every *tracked open follow-up* in the pack, and resolve each
*owner-decision* item to either "shipped" or "explicitly deferred with reason."

**Success = the pack's `05_STATUS.md` can be honestly rewritten so that every row in
its status table and every numbered follow-up is either DONE (with labelled proof) or
DEFERRED (with a one-line owner-ratified reason) — and `LOOP_LEDGER.md` carries the
evidence for each.**

> **Read this first — do NOT re-implement Phases 1–3.** They are already implemented,
> committed, and measured (server data-tail parallelization + `cache()`, lazy/512px
> thumbnails, `React.memo` + `useDeferredValue` render-count win, `content-visibility`,
> Suspense streaming, modal code-splitting). Your job is **verify-then-finish**, not
> rediscover. Re-doing shipped phases is a failure mode, not progress.

## Mode

`implementation` (with embedded `provider-proof` / `browser-proven` measurement steps).

## Required behavior (canonical loop — do not skip)

1. Read `AGENTS.md` and the FAST PATH block at the top of `.ai/10_state/current-state.md`.
   Pull `.ai/00_system` source-of-truth docs only as the task/risk needs them.
2. Read the **whole** plan pack before touching anything:
   `00_README.md`, `01_DIAGNOSIS.md`, `02_IMPLEMENTATION_PLAN.md`, `03_METRICS.md`,
   `04_FURTHER_OPTIMIZATIONS.md`, `05_STATUS.md`,
   `06_PERCEIVED_PERFORMANCE_ACCEPTANCE.md`, and `LOOP_LEDGER.md`.
3. This is **HIGH-BLAST-RADIUS** work (shared data layer `workspace-repository.ts` +
   shared workshop UI `LiveProjectCard.tsx`). The dated pack + `LOOP_LEDGER.md` already
   exist — keep using them; update the ledger **during** the work, not at the end.
4. Run bounded iterations: `DISCOVER → PLAN → EXECUTE → VERIFY → RECORD → DECIDE`.
   Default cap **4–6 iterations**; one iteration ≈ one work item below.
5. Maker/checker: for any change to `workspace-repository.ts` or any authz-touching
   path, verify with a lane/surface distinct from the one that made the change
   (targeted repo tests + adversarial review). The lead owns final integration.
6. Match proof to the claim and **label it precisely** every time:
   `local-only` / `provider-proven` / `browser-proven` / `manual-proof-pending` /
   `not-verified`. A green unit test is `local-only`; a Lighthouse run against
   `next build → next start` is `local production-build proof`, **not** hosted proof.
7. Stop only on: proven pass · explicit blocker · owner decision · approval-gated
   action · iteration cap.
8. Final report (format at the bottom of this file).

---

## Context — exact state of the pack (so you don't re-litigate)

**Already shipped + proven (leave alone unless a verify step regresses):**

| Area | State | Where the proof lives |
|---|---|---|
| Server data tail (4→2 round-trips) + `cache()` | DONE | `tests/vitest/perf/projects-page-server-parallelism.test.ts`; `03_METRICS.md` §1 |
| Card image bytes (512px thumbnail + `loading="lazy"`/`decoding="async"`) | DONE | live authed capture in `03_METRICS.md` |
| `React.memo(LiveProjectCard)` + `useDeferredValue(searchQuery)` | DONE | `tests/vitest/perf/projects-page-render-baseline.test.tsx` (0 re-renders on type/sort) |
| `content-visibility:auto` (cards + list rows) | DONE | type-check/build/tests green |
| Suspense streaming shell + skeleton parity (access-tabs bar) | DONE | `src/app/workshop/projects/loading.tsx` |
| Modal/popover code-splitting (`next/dynamic ssr:false`) | DONE | `04_FURTHER_OPTIMIZATIONS.md` |
| Local production-build authed Lighthouse | DONE (local only) | `03_METRICS.md` §7 |

**Deliberately rejected — do NOT "fix" these (they are correct decisions):**
`next/image` for private covers (auth-gated proxy needs the browser cookie) ·
heavy virtualization (no real 100+ fixture; RISK-15 unresolved) ·
`select('*')` full trim (whole `project` object flows to many client consumers) ·
new speculative DB indexes (primary query already covered by
`projects_workspace_updated_at_idx`; honor prove-before-apply) ·
shared-favorites data model (suppressed per `decisions.md` 2026-06-03).

**Known reds that are NOT this pack (do not chase or "fix" them):**
- `tests/vitest/projects-page-view-mode.test.tsx` "defaults to large cards" —
  owned by the concurrent liquid-glass commit `165adfad`.
- `tests/vitest/workspace-repository-project-list.test.ts` — asserts symbols absent
  from the file; pre-existing.
- Any `workspace-repository.ts` `tsc` error around `assertEstimateNodeRecord` /
  `workspace_homebase_summary` — a concurrent agent's in-flight RPC refactor.
- Confirm each is still foreign (e.g. `git log -1 --format=%H -- <file>`, `git blame`)
  before dismissing; if one has merged into your scope, note it and route to its owner
  rather than silently absorbing it.

---

## Iteration plan — the open work (each item = one loop iteration)

Do these **in order**. Each ends with an independently verifiable deliverable and a
`LOOP_LEDGER.md` append. File scopes are disjoint enough to be safe under concurrency.

### Iteration 0 — Verify the shipped state holds on current HEAD (no code change)
- `bun run type-check` — capture exit code; attribute any error to a file in scope vs a
  known-foreign red above.
- `bun run build` — the real gate for the data-layer change; must be exit 0.
- Targeted proof suites:
  - `bun run test:dom -- projects-page-render-baseline` → expect 4/4.
  - `bun run test -- projects-page-server-parallelism` (or the dom runner) → expect the
    wave-2/wave-3 overlap + ~208ms < ~300ms serial floor still holds.
  - `bun run test:dom -- projects-page` → green except the known-foreign reds.
- **Deliverable:** ledger entry stating "shipped state re-verified on `<HEAD sha>`" with
  the exact pass/fail counts and which reds are foreign. If a perf proof regressed, STOP
  and treat it as the priority bug (the shipped win was undone by a concurrent edit).

### Iteration 1 — Patch the CI route-transition harness (highest-value follow-up)
- **File:** `e2e/route-transition-performance.spec.ts` (and check
  `scripts/measure-route-transitions.ts` for the existing "Workshop to Projects"
  scenario + `e2e/route-transition-performance-budgets.json`).
- **Problem:** the spec never injects the dev-auth bypass cookie, so the authed
  `workshop → projects` scenario redirects to `/login` and the transition is
  unmeasurable in CI.
- **Fix:** inject the dev-auth bypass cookie **or** wire `PLAYWRIGHT_STORAGE_STATE`
  the same way the working authed harnesses do. Find the canonical bypass mechanism
  first (`rg -n "bypass" e2e scripts src/middleware* ; rg -n "PLAYWRIGHT_STORAGE_STATE"`)
  and reuse it — do not invent a new auth path.
- **Verify (browser-proven):** the scenario reaches `/workshop/projects` without a
  `/login` redirect and emits a transition number against the budgets file. Label proof
  precisely; if the runner can't be executed in this environment, label
  `manual-proof-pending` and record the exact command for the owner.
- **Deliverable:** patched spec + ledger entry with the run output or the pending label.

### Iteration 2 — `content-visibility` large-list behavior spot-check
- **Goal:** confirm `content-visibility:auto` on cards/list rows does not break
  scroll, menu portals, or focus on a large list (it is self-correcting, but unverified).
- **How:** use the project's screenshot/dev-auth-bypass harness (see memory
  `workshop-dashboard-no-scroll-fix` for the worktree + dev-auth-bypass screenshot
  pattern) on a workspace with many projects. If no large dataset exists, say so —
  do **not** fabricate a fixture; this overlaps RISK-15 (real large-data fixture is
  feasibility-unproven). Cross-check `06_PERCEIVED_PERFORMANCE_ACCEPTANCE.md` "Large
  list" row.
- **Verify (browser-proven where possible):** scroll has no lasting drift; dropdown
  menus still portal and position correctly; keyboard focus order is intact.
- **Deliverable:** screenshots/notes + ledger entry. If blocked on fixture, mark the
  `06_…` "Large list" row `manual-proof-pending` and stop this item cleanly.

### Iteration 3 — Multi-run authed Lighthouse re-measure (LCP; Slow-3G conditional)
- **Goal:** confirm whether the LCP gap (baseline LCP ~3865ms vs ≤3000ms target;
  warm LCP ~4.4s noted) closed after the shipped wins. Use **multi-run** (not single)
  against `next build → next start` with a real Supabase session, matching the §7
  protocol in `03_METRICS.md`.
- **Slow-3G:** capture **only if** it will decide the next implementation lever
  (`02_IMPLEMENTATION_PLAN.md` + `05_STATUS.md` both say it's optional otherwise). If
  you don't need it to choose the next lever, explicitly skip and say why.
- **Verify:** record median LCP/CLS/TBT across runs; label `local production-build
  proof` (NOT hosted Vercel proof). Update `03_METRICS.md` and the `05_STATUS.md`
  Lighthouse row.
- **Deliverable:** numbers in `03_METRICS.md` + ledger entry. If LCP is still > target,
  do **not** silently start new optimization work — surface it as an owner gate (see
  Iteration 5) because "LCP < 3s" is only a release target if the owner makes it one.

### Iteration 4 — `ProjectCardRow` memo for group-organize mode (CONDITIONAL — gated)
- **Only do this if you can first prove it pays.** Today owned cards in
  *group-organize* mode re-render by design because `groupAssignMenu` passes a fresh
  ReactNode. The plan already sketches the fix: extract a module-level memoized
  `ProjectCardRow` that receives the menu's **primitive** inputs
  (`effectiveGroupId`, `groupBusy`, `projectGroups`, `showGroupMenu`) + stable
  callbacks (`assignProjectToGroup` via `useStableCallback`) and builds the
  `<DropdownMenu>` with `useMemo` **below** the memo boundary; preserve the LD-10
  override-aware checkmark + `aria-busy`.
- **Gate:** first extend `tests/vitest/perf/projects-page-render-baseline.test.tsx`
  with a group-organize-mode render-count assertion. If the current re-render count is
  already acceptable, **do not ship the refactor** — record "not worth it, proven by
  render count" and move on. Ship only if the count is meaningfully high and the
  refactor drives it down.
- **Files:** `src/components/workshop/projects-page-client.tsx`,
  `src/components/workshop/LiveProjectCard.tsx`, the render-baseline test.
- **Verify (local-only):** type-check + build + the render-baseline suite (old + new
  assertions) green; confirm group-mode functional tests still pass.
- **Deliverable:** either the shipped, proven refactor or a ledger entry that closes
  the item as "deferred — render count acceptable."

### Iteration 5 — Resolve the owner-decision lower-value items (decide, don't auto-ship)
These are explicitly "owner's call" in `04_FURTHER_OPTIMIZATIONS.md`. For each, either
implement **with proof** if it's clearly free and UX-neutral, or present a one-line
recommendation and mark DEFERRED. Do **not** silently change consistency behavior.
- **Sidebar favorites `staleTime: 0` → ~10–30s** — kills a redundant mount refetch but
  delays cross-tab favorite reflection. This is a **consistency knob → owner decides**;
  use `AskUserQuestion` or leave a clear recommendation. Default: DEFER.
- **`select('*')` → drop client-unused columns** — needs a narrowed client type; the
  whole `project` flows to many consumers. Risk/reward is poor per the audit. Default:
  DEFER unless a column-usage audit proves it's safe.
- **First-row image `priority`/`fetchpriority`** — low value (LCP is text, not image
  here). Default: DEFER; only ship if Iteration 3 shows the hero image is the LCP element.
- **`traced()` spans on the 3 query waves** — pure observability, UX-neutral, safe to
  ship. Add `traced(...)` (gated by `PERF_TRACE=1`, already imported in
  `workspace-repository.ts`) to attribute the ~711ms server time. Default: SHIP if it
  stays a no-op when `PERF_TRACE` is unset; otherwise DEFER. **Authz invariant applies.**
- **Deliverable:** each item marked DONE (with proof) or DEFERRED (with reason) in
  `04_FURTHER_OPTIMIZATIONS.md` + the ledger.

### Iteration 6 — Reconcile the pack docs to reality + final status
- Rewrite `05_STATUS.md` so every status-table row and numbered follow-up is DONE or
  DEFERRED with a labelled-proof or reason. Fix the minor doc drift in
  `04_FURTHER_OPTIMIZATIONS.md` (its "Also shipped" section already lists
  `Roboto_Mono display:"swap"` and list-view `content-visibility` as shipped, but the
  "Lower-value follow-ups" list still names them as open — remove the stale duplicates).
- Confirm `LOOP_LEDGER.md` "Open follow-ups" section now matches the closed reality.
- **Deliverable:** reconciled docs; pack reads as closed-or-explicitly-deferred.

---

## Hard rules

- **Do not re-implement Phases 1–3.** Verify they hold; finish only the open items above.
- Do not claim completion from intent. A worker self-report or one green check is not
  completion — match proof to claim and label the proof boundary.
- Do not use chat as durable memory — loop state lives in the pack + `LOOP_LEDGER.md`,
  updated during the work.
- Stay inside standing scope: Supabase project `ebxxqidacheyapmmzavr` only; **no**
  production deploys, destructive/irreversible actions, paid add-ons, new DB migrations,
  or provider/GitHub/Notion mutations without fresh owner approval.
- **Concurrency:** other agents may be editing this tree (`workspace-repository.ts`,
  `LiveProjectCard.tsx`, `projects-page-client.tsx`, route shell/loading files). Keep
  disjoint file scopes, re-read `03_METRICS.md` before changing status, and if the
  active user says stay on `main`, keep lanes on the current checkout (no isolation
  without explicit lead authorization). The lead owns conflict checks + integration.
- Treat `DESIGN.md` as an alpha guide, not law — don't gate/revert on design grounds.
- Graph-tool policy is proportional: `rg`/targeted reads/LSP are the default first tool;
  reach for GitNexus/code-review-graph only for broad/high-risk navigation.

## Source-sensitive invariant (RLS/authz — non-negotiable)

P1.1 parallelized **authenticated** reads. Any edit to `workspace-repository.ts`
(including Iteration 4/5) must **prove** the `06_PERCEIVED_PERFORMANCE_ACCEPTANCE.md`
"Authz/RLS regression guard" still holds:
- `sharedProjects` stays scoped to projects the user can access.
- optional publication rows do not reveal inaccessible projects.
- pending collaboration visibility stays scoped to the current authenticated user.
- favorites + group-membership reads preserve their empty-input (`null`-query) behavior.
Prove via targeted repository tests; for risky shape changes, a live/scratch Postgres
proof. Identical return shape, error semantics, and ordering must be preserved.

## Verification gates (proportional — run what the change earns)

1. `bun run type-check` → exit 0 (attribute any red to scope vs known-foreign).
2. Targeted Vitest for the touched area (render-baseline, server-parallelism,
   `projects-page-*`, `LiveProjectCard`, `workspace-repository` repo tests).
3. `bun run build` → the **real** gate for any server/data-layer change.
4. For data-layer / authz edits: adversarial maker/checker review — parallel
   `ce-performance-reviewer` + `ce-correctness-reviewer` (and `ce-security-reviewer`
   if RLS scope is touched) on the diff; adopt valid findings on the merits.
5. `git diff --check` (whitespace) on touched files.
6. Browser/Lighthouse steps labelled `browser-proven` / `local production-build proof`
   / `manual-proof-pending` as applicable — never overclaim hosted proof.

## Ledger contract

Append to `.ai/03_plans/2026-06-19-Projects-Page-Performance/LOOP_LEDGER.md` during each
iteration: what changed (file:line), what was verified + the exact command/output, the
proof label, any concurrent-agent interaction, and the DECIDE outcome (ship / defer /
blocked). Newest at the bottom of the relevant section. Keep it append-only.

## Final report (end of session)

- **Files changed** (paths) and which iterations shipped vs deferred.
- **Evidence + proof boundary** per closed item (with labels).
- **Validation gaps** — anything `manual-proof-pending` or blocked on fixture/owner.
- **Owner decisions still needed** (esp. Iteration 5 consistency knob, LCP-as-release-gate).
- **Remaining risks** and the single recommended **next action**.
