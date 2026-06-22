# 24 — Execution Governance and Rollout

> **Authoring agent:** W-GOV. **Status:** Authoritative for HOW the program is executed in a multi-agent concurrent repo — branch/PR/merge model, seam-file locking (RISK-22), stop-the-line/abort criteria, safe-pause points, feature-flag/kill-switch rollout, and owner-decision deadlines + safe defaults. Adopted as **D-015** (see §7).
>
> **Reads first:** `_research/_SYNTHESIS.md` (V2 IMPROVEMENT CONTRACT — RISK-22, D-015, §V2-FACTS) → `05_PHASED_REFACTOR_PLAN.md` (order, dependency graph §0.4, exit criteria) → `16_RISK_REGISTER.md` (RISK-01/05/14/15/19/22) → `18_EXECUTION_PROMPTS.md` (the per-phase prompt contract this doc governs) → `19_OPEN_QUESTIONS.md` (the Q-NN this doc assigns owners/deadlines/defaults to).
>
> **Scope (D-011 still holds for the PACK):** this document is **planning only**. It defines the rules the *execution* sessions (after the pack) must follow; it applies no edits.
>
> **Conventions (contract §4):** Priority `P0–P3`; Risk `Low/Medium/High/Critical`; evidence `path:line — observation`; new commands flagged **(new, Phase N)**. Where this doc and a phase detail file disagree on **governance** (branching, locking, abort, flags, owner deadlines), **this doc wins**; on implementation mechanics, the detail file wins.

---

## 0. Repo reality this doc must survive (read before anything else)

- **The branch is mid-flight and multi-author.** Current branch `feat/sidebar-redesign` was itself a 101-conflict merge with `main` (commit `1025581b`). Multiple AI agents **and** humans edit this repo concurrently. Any governance that assumes a single linear author is wrong by construction. **RISK-22** is the live one: concurrent edits collide on the RISK-14 seam cluster.
- **The aggregate gate is `bun run validate`** = `type-check` + `lint` + `lint:design-system` + `lint:design` + `test` (5 unit) + `test:dom` (361 Vitest DOM). It does **NOT** run e2e, perf, storybook, or bundle analysis (contract §0). "Green" in this doc means `bun run validate` green **plus** the named perf/e2e gate for that step.
- **The load-bearing perf gates already exist** at `tests/vitest/perf/`: `estimate-sheet-render-relief.test.tsx`, `-memoization.test.tsx`, `-cursor-isolation.test.tsx`, `-render-baseline.test.tsx`. These are the Phase-0 baseline anchors and the stop-the-line tripwires (§3).
- **Seam-cluster paths corrected vs the W-GOV prompt** (verified on disk, 2026-06-17): `estimate-tree-data.ts` lives at `src/components/workshop/estimate-tree-data.ts` (NOT under `estimate-sheet/`); `editable-row-model.ts` is at `src/components/workshop/estimate-sheet/rows/editable-row-model.ts`; the hooks are at `src/hooks/use-estimate-query.ts` and `src/hooks/use-estimate-row-mutations.ts` (contract §V2-FACTS: "Hooks live in `src/hooks/`"). Use these paths verbatim.
- **GitNexus rule (CLAUDE.md) is mandatory at execution time:** run `impact({target, direction:"upstream"})` before editing any symbol; `detect_changes({scope:"compare", base_ref:"main"})` before committing; warn on HIGH/CRITICAL. This doc operationalizes that rule for seam files (§2).
- **Consolidated safety console:** `28_BEHAVIOR_PRESERVATION_AND_SAFETY_NET.md` (D-024) is the single operator surface that unifies this doc's tripwires (§3), kill-switches (§5), seam locks (§2), and the behavior-preservation gates — consult it alongside this doc when executing or pausing a risky phase.

---

## 1. Branch / PR / merge model

### 1.1 Base branch (D-015.1)

- **Program base branch = `main`.** All phase work branches FROM `main` and PRs back INTO `main`. The performance refactor does **not** stack on `feat/sidebar-redesign`; that branch is an unrelated in-flight feature and stacking would inherit its conflict surface.
- **Exception:** if at execution-start `feat/sidebar-redesign` (or any large feature) is still unmerged AND touches a RISK-22 seam file, treat it as a **concurrent author** (§2.4) — do not branch off it, but DO run the seam pre-edit checklist against it as a divergence source.
- Re-confirm the base at the start of every phase: `git fetch origin && git log --oneline origin/main -5`. If `main` has moved, rebase (§1.5) before opening the phase branch.

### 1.2 Branch naming (per-phase trunk + per-PR leaves)

One **phase trunk branch**, multiple **PR leaf branches** off it. This keeps "one responsibility per PR" (the `18` prompt contract) while letting a phase's PRs land in order without N round-trips through `main`.

```
perf/phase-<N>-<slug>                  # phase trunk, branched from main
  └─ perf/phase-<N>/<pr-slug>          # one PR leaf per responsibility, branched from the phase trunk
```

Examples (grounded in `05` sequences):
- `perf/phase-1-foundation` → `perf/phase-1/patch-and-mark-stale`, `…/query-key-factory`, `…/build-tree-index`, `…/structural-hash`
- `perf/phase-3-sheet-decomp` → `perf/phase-3/activity-history-hook`, `…/per-row-store`, `…/incremental-totals`, `…/proposal-signature`, `…/resync-diff`
- Pulled-forward quick win (D-002): `perf/quickwin/d3-dedup`, `perf/quickwin/provider-topology` — branched from `main`, not from a phase trunk.

PR leaves merge into the phase trunk; the phase trunk merges into `main` **once, at the phase exit gate** (§3 exit), after all that phase's exit criteria (per `05`) are met. Small isolated phases (6, 7-quick-wins, 9, 10) MAY skip the trunk and PR a leaf straight to `main`.

### 1.3 PR ordering within a phase ("one responsibility per PR")

- PR order = the **implementation sequence in `05`** for that phase, verbatim (which itself defers to `09 §12`'s authoritative 0–11 numbering for Phase 3 — HB-2). Phase 3 example (`09 §12` Steps): activity-history hook (Step 3) → per-row store + resync diff (Step 4) → incremental totals (Step 5) → row-operations extraction (Step 6) → proposal signature off keystroke (Step 7) → display transforms (Step 8) → center-column (Step 9) → virtualization (Step 10). Do **not** reorder; each step's exit is the next step's precondition.
- Each PR: ONE responsibility / one tree family / one flow / one primitive (the `18` rule). Each PR independently revertible. Each PR runs the phase's full validation set before merge into the trunk (not deferred to phase exit).
- A PR that must touch a **seam file** (§2) acquires the seam lock first and is **serialized** — never two open seam-touching PRs against the same seam file simultaneously.

### 1.4 Merge order when two phases touch the same file

The only real cross-phase file overlap is the **RISK-14 seam cluster**, shared by Phase 2 (tree kernel) and Phase 3 (sheet decomp). Rule:

1. **Phase 1 lands first, always.** Both 2 and 3 consume Phase-1 primitives (`buildTreeIndex`, `structuralHash`, `patchAndMarkStale`, `queryKeys`). Landing primitives first is the single biggest collision-avoider (RISK-14 mitigation, D-001).
2. **Per-seam-file ownership, not whole-phase serialization** (§2.2 owns the table). Each seam file has a *first-owner phase*. The first owner lands its edits to that file and merges to `main`; the second phase **rebases onto `main`** before touching the same file.
3. Where 2 and 3 want the *same* seam file in overlapping windows, **serialize: Phase 2 merges that file's edits first** (the tree kernel is the lower-level dependency; D-012/D-013), then Phase 3 rebases and builds on top. This is the default tie-break.
4. After D-013 is resolved by Phase 0 (Q-05 double-compute finding): if the left tree does **not** double-compute, Phases 2 and 3 may proceed in parallel on *non-shared* files, but the seam-file serialization in (3) still applies to the shared cluster.

### 1.5 Rebase policy when `main` (or `feat/sidebar-redesign`) merges during execution

- **Rebase, don't merge, leaf branches.** PR leaves and phase trunks rebase onto the updated base to keep history linear and conflicts surfaced early. (Public/shared branches another human is on: coordinate before force-push; otherwise prefer a fresh rebase.)
- **Rebase cadence:** at minimum at each PR open and each phase-trunk-to-`main` merge. For any phase touching a seam file, rebase **daily** (or before each seam PR), because the seam files are the highest-churn collision surface.
- After every rebase that touched a seam file, re-run the seam pre-edit checklist (§2.3) and the phase's perf gates — a clean textual rebase can still semantically break a memo guard or a compute-count invariant. **This human-vigilance check is promoted to automated (SEV-5):** the seam memo-guard comparators MUST be protected by an automated comparator-key snapshot test in `tests/vitest/perf/` asserting the compared-key sets of `areEstimateSheetBranchPropsEqual` and `areEstimateRowItemsTablePropsEqual` are **unchanged** — so a rebase (or any edit) that silently widens, narrows, or reorders a comparator's compared keys fails CI rather than relying on a reviewer to re-verify by eye. The manual "re-verify guards after every seam rebase" step still runs, but the snapshot test is the binding gate. Cross-ref doc 28 (consolidated safety console) and doc 15 (validation matrix).

### 1.6 STOP-THE-LINE if `main` diverges on a seam file (RISK-22)

> **Hard rule.** If, during a phase, `main` (or any merging feature branch) lands a change to a RISK-14 seam file that the current phase is mid-edit on, **STOP** that phase's seam work immediately. Do not blind-rebase over it.

Procedure:
1. `git fetch origin` then `detect_changes({scope:"compare", base_ref:"main"})` to see exactly which seam symbols moved.
2. Run `impact({target:<moved symbol>, direction:"upstream"})` on each moved seam symbol to assess whether the in-flight refactor's assumptions still hold.
3. If the divergence touches a memo guard (`branch.tsx:111-156`, `row-table.tsx:86-116`) or a compute-count invariant, **re-baseline**: re-run `tests/vitest/perf/*` on the new `main` to capture the new Phase-0 reference before continuing.
4. Resolve the seam edit on top of the new `main` in a dedicated rebase commit; re-run the phase perf gates; only then continue.
5. If the divergence is large enough to invalidate the phase plan, escalate per §3 (phase abandonment).

---

## 2. Seam-file lock protocol (RISK-22)

### 2.1 The seam cluster (corrected paths)

The RISK-14 cluster — the files Phases 2 and 3 both touch, and the highest concurrent-collision surface in the repo (RISK-22):

| Seam file (verified path) | Why it is a seam | Blast radius (§V2-FACTS) |
|---|---|---|
| `src/components/workshop/EstimateSheetContent.tsx` | God component; Phase-3 decomposition target; reads totals + signatures | **Critical** — 8 src consumers + ~24 test files (incl. 4 perf gates) |
| `src/components/workshop/EstimateSheetTree.tsx` | Left tree; Phase-2 first adoption target; signature call sites | **High** — 11 test files, dynamically imported |
| `src/components/workshop/estimate-tree-data.ts` | Tree data builder; Phase-2 rebuild-per-keystroke target | High (full-tree build path) |
| `src/components/workshop/estimate-sheet/rows/editable-row-model.ts` | `computeNodeTotals` (`:162`); Phase-1/3 incremental-totals target | High (per-keystroke compute) |
| `src/hooks/use-estimate-query.ts` | Tree cache + revision counters; Phase-1/4 key-factory target | **High** — 5 src / 6 test |
| `src/hooks/use-estimate-row-mutations.ts` | 22 `patchAndMarkStale` sites + optimistic flows; Phase-1/4/5 | Med-High — 1 src (ESC) but central to optimistic state |
| `src/lib/estimates/estimate-tree-reorder.ts` | `getEstimateTreeContentSignature` (`:181-220`); Phase-2 `structuralHash` target | Low-Med (1 caller / 5 sites) |

### 2.2 First-owner-phase per seam file (serialize via ownership)

| Seam file | First-owner phase | Hand-off |
|---|---|---|
| `estimate-tree-reorder.ts` | **Phase 2** (signature → `structuralHash`) | none downstream |
| `estimate-tree-data.ts` | **Phase 2** (tree rebuild via `TreeIndex`) | Phase 3 rebases after |
| `EstimateSheetTree.tsx` | **Phase 2** (adopt `TreeIndex.find`, swap signatures) | Phase 3 rebases after |
| `editable-row-model.ts` | **Phase 1** (extract `computeNodeTotals`→incremental primitive unwired), then **Phase 3** wires it | Phase 1 merges the primitive first; Phase 3 wires |
| `use-estimate-query.ts` | **Phase 1** (key factory, both arms), then **Phase 4** migrates call sites | serialize Phase 1 → Phase 4 |
| `use-estimate-row-mutations.ts` | **Phase 1** (helper exists), **Phase 4** migrates 22 sites, **Phase 5** optimistic adapter | serialize 1 → 4 → 5 |
| `EstimateSheetContent.tsx` | **Phase 3** (decomposition) | Phase 2 must finish its `EstimateSheetTree`/data edits and merge **before** Phase 3 opens its `EstimateSheetContent` totals/signature PRs (D-012 tie-break) |

**Coordination rule for the 2↔3 overlap:** Phase 2 merges its edits to `estimate-tree-data.ts` + `EstimateSheetTree.tsx` + `estimate-tree-reorder.ts` to `main` **first**. Phase 3 then rebases onto that `main` before opening its `EstimateSheetContent.tsx` incremental-totals / proposal-signature PRs, so the shared `TreeIndex`/`structuralHash` it consumes is already on `main`. If D-013 resolves to "no double-compute," the only hard serialization that remains is on files both phases literally edit; the rest can parallelize.

### 2.3 Pre-edit checklist (run before touching ANY seam file)

> Mandatory. Assume another agent or human may be editing the same file concurrently.

1. `git fetch origin && git rebase origin/main` (or your phase trunk) — start from current HEAD.
2. `detect_changes({scope:"compare", base_ref:"main"})` — confirm no unexpected seam-file drift since you branched. Cross-ref `21_BLAST_RADIUS_MATRIX.md` for the file's quantified caller/test set.
3. `impact({target:<symbol you will edit>, direction:"upstream"})` — report blast radius (direct callers, affected flows, risk level). **If HIGH/CRITICAL, warn and get owner sign-off before proceeding** (CLAUDE.md rule).
4. Confirm you hold the seam lock (§2.4) — no other open PR is touching this seam file.
5. Verify the load-bearing memo guards are present and untouched before you start (`branch.tsx:111-156`, `row-table.tsx:86-116`); you will re-verify after (§3 tripwire). The comparator-key snapshot test (§1.5, SEV-5) is the binding automated check for `areEstimateSheetBranchPropsEqual`/`areEstimateRowItemsTablePropsEqual` — confirm it is green, not just an eyeball pass.
6. Capture the relevant `tests/vitest/perf/*` baseline numbers for the file you are about to change.

### 2.4 Lock mechanism (lightweight, audit-friendly)

There is no central lock server; use a visible, greppable convention enforced by review:

- **Declare intent** in `19_OPEN_QUESTIONS.md`'s execution-coordination section or a pinned tracking issue: "`<agent/PR>` holds `EstimateSheetContent.tsx` for Phase 3 step 3 until merge." One holder per seam file at a time.
- **Serialize, don't parallelize**, seam-touching PRs: never two open PRs editing the same seam file. The second waits for the first to merge, then rebases.
- A concurrent author (e.g. `feat/sidebar-redesign`, a human) editing a seam file is treated as the current holder — coordinate before opening a competing PR; if they hold it, wait + rebase.
- Release the lock at merge. The next holder runs §2.3 from step 1 (re-fetch) before acquiring.

---

## 3. Stop-the-line / abort criteria (program-level "dead")

These thresholds **PAUSE the current phase and BLOCK the next**. They are tripwires, not judgment calls — when one trips, work stops until it is cleared or escalated.

### 3.1 Tripwires (automatic pause)

| # | Tripwire | Detected by | Action |
|---|---|---|---|
| T1 | Any `tests/vitest/perf/*` gate regresses vs the Phase-0 baseline (compute count up, render count up, or RISK-16 reference-stability `Object.is(prevTotals.get(untouchedId), nextTotals.get(untouchedId))` fails) | the 4 perf gates + the new reference-stability gate (file 09) | PAUSE phase; do not merge; root-cause before any further step |
| T2 | A **Critical-risk** regression in RISK-01 (estimate behavior), RISK-05 (RLS/cross-tenant), or RISK-19 (workshop-layout auth-redirect dropped) | `bun run validate`, `prove:rls-initplan`, `prove:estimate-tabs-rls`, `prove:workshop-auth-boundary` (new, Phase 7), advisor security scan | PAUSE + **owner escalation** (do not self-clear a Critical) |
| T3 | **N = 3 consecutive** failed `bun run validate` on the same PR after fix attempts | CI / local gate | PAUSE the PR; if the failure is the plan's fault (not a typo), escalate to revisit the phase plan |
| T4 | Phase-0 large fixture (RISK-15 / Q-24) proven **infeasible** | Phase 0 prototype outcome | DOWNGRADE all "improved vs baseline" exits → "synthetic-only" (§3.2); record as **D-NN** |
| T5 | A seam file diverges on `main` mid-edit (RISK-22) | §1.6 | STOP-THE-LINE per §1.6 |

### 3.2 Large-fixture-infeasible downgrade (T4, RISK-15)

If Phase 0 cannot cheaply seed the realistic RLS-governed large fixture (`perf:seed-db-fixture`, Q-24), then **every** "improved vs Phase-0 baseline" exit criterion in Phases **2, 3, 4, 7, 8** downgrades from "improved vs large-fixture baseline" to **"synthetic-only: no regression vs the ≤200-row synthetic profile + manual Chrome trace anchor."** This is a *measurement-confidence* downgrade, not a license to skip measurement. **Record the downgrade as a new D-NN** in `17_DECISION_LOG.md` (proposed ID **D-018**), naming which exits are affected and the residual confidence caveat (cross-ref `25_OBSERVABILITY_RUM_AND_RESOURCE_BUDGETS.md` methodology rules: ≥20 samples, p95/p99, cold vs warm, never derive a TIME budget from jsdom).

### 3.3 Phase abandonment + revert procedure

- **Who can declare a phase abandoned:** the **product/program owner (Philip)** — never the implementation agent unilaterally. The agent's job on a tripwire is to PAUSE, gather evidence (file:line, before/after metric, which RISK-NN), and escalate with a recommendation.
- **Revert procedure:** because every PR is one responsibility and independently revertible (the `18` rule), abandonment = `git revert` the phase-trunk merge commit (or the offending leaf PRs) to return `main` to its pre-phase state. Feature-flagged work (§5) is preferred over revert: flip the flag off in prod, leave the code, fix forward. Record the abandonment + reason as a D-NN; re-open the affected `A-NN`/`RISK-NN` as unresolved.
- A Critical tripwire (T2) that reaches prod uses the **kill-switch first** (§5), then revert if the flag does not fully restore behavior.

---

## 4. Safe-pause points within phases (mid-session interruption)

A phase may be interrupted between steps (another agent, a human, end of session). The question per step: **is `bun run validate` green at this step a SAFE place to stop, or must the phase continue to the next step to leave the codebase consistent?**

**General rule:** a step is a safe pause point iff (a) `bun run validate` + the step's perf gate are green AND (b) the codebase is in a consistent state — either the change is purely **additive** (new unwired module) or it is **behind a feature flag** defaulting to the old path. **Recommendation: land every behavior-changing step in Phases 2/3/5 behind a flag (§5) so that EVERY step is a safe pause point.**

### Phase 2 (tree kernel) — wires new primitives into live trees
| Step (from `05`) | Additive? | Safe pause when validate green? |
|---|---|---|
| 1. Adopt `TreeIndex` in estimate tree (behind existing behavior) | Replaces DFS but behavior-identical | **Yes** if the family's DOM + perf gates green AND old DFS helpers retained as fallback |
| 2. Swap 5 signature calls → `structuralHash` | Behavior-identical (parity-tested) | **Yes** only after the field-differential parity test (RISK-03) passes; else **No** — finish parity first |
| 3. Collapse reorder planners (distinct adapters) | Behavior-sensitive (sortOrder) | **Yes** only after byte-compare of persisted `sortOrder` on a fixture; else **No** |
| 4–8. Library/templates/share/`react-complex-tree` removal | Each family independent | **Yes** per family (one family per PR, revertible) |

### Phase 3 (sheet decomp) — wires into the #1 hotspot
> **Step numbers below are `09 §12`'s authoritative 0–11 numbering (HB-2).** This table defers to `09 §12` for per-step detail.

| Step (per `09 §12`) | Additive? | Safe pause when validate green? |
|---|---|---|
| 3. Extract `useEstimateActivityHistory` (gated concern) | Additive extraction | **Yes** |
| 4. Per-row editable-rows store (incl. resync diff — `09 §4.3`) | Behavior-sensitive (fan-out) | **Yes only behind a flag** (§5, `perRowEditableStore` / `resyncDiff`); without the flag → **No**, must reach a consistent wiring |
| 5. Incremental totals over shared `TreeIndex` | Behavior-sensitive + RISK-16 | **Yes only behind a flag** (`incrementalTotals`) AND reference-stability gate green; else **No** |
| 6. Row-operations extraction (`useEstimateRowOperations`) | Extraction additive (byte-identical optimistic logic) | **Yes** per PR (callbacks pure-moved) |
| 7. Proposal signature off keystroke | Behavior-sensitive (export staleness) | **Yes** after field-differential parity (RISK-03) |
| 8–10. Display transforms / center-column (Step 9) / virtualization thresholds (Step 10) | Extraction additive; thresholds flag-gated | **Yes** (virtualization already env-flag-gated) |

### Phase 5 (optimistic mutations) — correctness-sensitive
| Step | Additive? | Safe pause when validate green? |
|---|---|---|
| 1. Build `createOptimisticMutation` (unwired) | Additive | **Yes** |
| 2. Migrate the 2 no-rollback flows | Behavior-sensitive (Q-06) | **Yes** only with rollback **opt-in** (default = preserve current no-rollback behavior) |
| 3. Migrate estimate-row flows (one per PR) | Behavior-sensitive | **Yes** per flow after its parity proof; mid-flow → **No** |
| 4–7. Reconciliation centralization, Zustand cleanup | `dragState` isolation first (safest) | **Yes** per sub-step (each independently revertible) |

---

## 5. Feature-flag / kill-switch rollout

### 5.1 Pattern (extend the existing env-flag module)

Extend the proven `src/lib/workshop/virtualization-flags.ts` pattern — `readPublicFlag(process.env.NEXT_PUBLIC_*, default)`, normalized, default-overridable. Propose a sibling `src/lib/workshop/perf-refactor-flags.ts` **(new, per phase)** using the same shape so each risky path is toggleable in prod **without a revert**:

```
// proposed shape — planning only (D-011)
export const PERF_REFACTOR_FLAGS = {
  perRowEditableStore:  readPublicFlag(process.env.NEXT_PUBLIC_PERF_PER_ROW_STORE,  false), // Phase 3 step 2
  incrementalTotals:    readPublicFlag(process.env.NEXT_PUBLIC_PERF_INCREMENTAL_TOTALS, false), // Phase 3 step 3
  resyncDiff:           readPublicFlag(process.env.NEXT_PUBLIC_PERF_RESYNC_DIFF, false), // Phase 3 step 5
  workshopScopedProviders: readPublicFlag(process.env.NEXT_PUBLIC_PERF_WORKSHOP_PROVIDERS, false), // Phase 7
  chartBucketsRpc:      readPublicFlag(process.env.NEXT_PUBLIC_PERF_CHART_RPC, false), // Phase 8 cutover
} as const;
```

New flags default **OFF** (old path) so shipping the code is a no-op until explicitly enabled — the inverse of the virtualization flags (which default ON because they are already proven). Each flag wraps exactly one risky path so it can be killed independently.

### 5.2 Per-risky-phase flags

| Phase / step | Flag | What it gates | Kill-switch effect |
|---|---|---|---|
| Phase 3 step 2 (per-row store) | `perRowEditableStore` | per-row subscription vs single `editableRows` `useState` map | flip OFF → revert to single-map (memo guards unchanged either way) |
| Phase 3 step 3 (incremental totals) | `incrementalTotals` | `rollup` over shared `TreeIndex` vs `computeNodeTotals` full DFS | flip OFF → fall back to full DFS (the `nodeTotals?.get(id) ?? computeNodeTotal(...)` latent guard at `branch.tsx:177` makes this safe) |
| Phase 3 step 5 (resync diff) | `resyncDiff` | diff-and-patch vs whole-map rebuild on reconcile | flip OFF → whole-map rebuild |
| Phase 7 (provider move) | `workshopScopedProviders` | authed providers in `workshop/layout.tsx` vs root `providers.tsx` | flip OFF → root mount (guards RISK-19 auth-redirect; verify `prove:workshop-auth-boundary`) |
| Phase 8 (RPC cutover) | `chartBucketsRpc` | app reads `get_project_chart_buckets` RPC vs JS aggregation | flip OFF → JS aggregation path |

### 5.3 Cutover sequence (every flagged path)

**Ship dark → enable in staging → canary → 100%.**
1. **Ship dark:** merge with flag OFF; old path runs in prod; new path exercised only by tests with the flag forced on.
2. **Staging:** enable in staging/preview; run the phase's perf + e2e gates against it.
3. **Canary:** enable for a limited cohort/env; watch the field signals (`25_OBSERVABILITY_RUM_AND_RESOURCE_BUDGETS.md`) for regression.
4. **100%:** flip on in prod. Leave the old path + flag in place for one release; remove the dead path + flag in a follow-up cleanup PR only after the new path is proven (Phase 10 territory).

### 5.4 RPC cutover (Phase 8) — additive-then-cutover across two deploys

The chart RPC is **not** greenfield: `get_project_chart_buckets` already exists as a **deferred migration** at `supabase/migrations-pending-review/deferred/20260614021500_get_project_chart_buckets_rpc.sql` (it was never promoted, so the live DB has 0 migration hits — but the SQL is authored and parked). The sibling RPCs (`workspace_homebase_summary`, activity CTE) are genuinely fresh. Cutover is **two deploys**:
- **Deploy N (chart RPC = review-and-harden the existing deferred migration, then promote):** do **not** author from scratch — take the parked `20260614021500_get_project_chart_buckets_rpc.sql`, **add the missing workspace-membership join** (the RLS/tenant-scoping gap flagged in doc 22), re-review `SECURITY DEFINER`/`search_path` per RISK-05, then promote it out of `migrations-pending-review/deferred/` into the applied migration set. For the genuinely-new RPCs (homebase, activity CTE), author additively. In all cases ship the migration **additively** (RPC exists, app does not call it). Run `prove:project-chart-buckets` (new, cross-tenant denial) + advisor security scan + golden-master chart oracle. RLS/`SECURITY DEFINER`/`search_path` review per RISK-05 (owner sign-off required — any new SECURITY DEFINER RPC is an owner decision, §6). Promoting a reviewed-and-hardened parked migration is a lower-risk Deploy N than fresh authoring — it strengthens the two-deploy story.
- **Deploy N+1:** flip `chartBucketsRpc` ON (app cutover) only after the `prove:*` gates pass on the deployed RPC. Kill-switch: flip OFF → JS aggregation, no migration rollback needed.

This ordering means a bad RPC is never in the app's hot path before its cross-tenant denial proof passes, and the app can always fall back without a DB rollback.

---

## 6. Owner-decision register (resolves feasibility GAP-3)

Every `19_OPEN_QUESTIONS.md` question marked **"Owner decision needed: yes"** (in `16` or `19`) gets a named owner placeholder, a **must-resolve-by-phase** deadline, and an explicit **SAFE DEFAULT** the agent applies if unresolved at that deadline. The agent never blocks silently and never guesses — it applies the default and records that it did.

**Status note (2026-06-17 owner answer pass):** the owner completed an answer pass in `19_OPEN_QUESTIONS.md` resolving **Q-01/02/03/06/24** (among others). The **Status** column below reflects each ruling; the **SAFE DEFAULT** column is retained as the documented fallback should a future re-decision be needed (per §6.1).

| Q / RISK | Decision | Owner | Resolve-by | SAFE DEFAULT if unresolved | Status (2026-06-17 answer pass) |
|---|---|---|---|---|---|
| **Q-01** (RISK-13) | Full vs Lite component-library loader in prod | Product owner / Philip + eng (caller trace) | **Phase 0** (it is a trace, not a taste) | Apply `.limit()` + column discipline to the **live** loader per §V2-FACTS (`getCurrentWorkspaceComponentRowsLibrary` is live); treat `…Library`/`…Lite` as reachable only via `actions.ts:413/421`. No guess — the trace resolves it. | **RESOLVED** — owner ruled the **live `RowsLibrary` loader** is the prod path; harden it (`.limit()` + column discipline). Matches the safe default. |
| **Q-02** (RISK-04) | Is the 500-row share cap a hard product limit? | Product owner / Philip | **Phase 2** (before share→`Tree` migration) | **Keep the 500-row cap as a hard limit.** Share stays read-only on the existing render; moving share to the virtualized `Tree` is **deferred** (optional, not required for the kernel win). | **RESOLVED** — owner confirmed the **500-row cap is a hard beta limit** (logged **D-019**). Share→`Tree` migration stays deferred. Matches the safe default. |
| **Q-03** (RISK-10) | Bless vs refactor forked primitives (`EstimateTabStrip`, menu modules, `IconButton` target) | Product owner / Philip + design | **Phase 6** (before consolidation targets finalized) | **Bless the divergence** (record a D-NN); add the duplication lint rule but do NOT force-migrate `EstimateTabStrip`. Consolidate only the unambiguous dups (BulkActionToolbar copy, dead `IconButton`). | **RESOLVED** — owner ruled to **bless the forks** (logged **D-020**); add the duplication lint, no force-migration. Matches the safe default. |
| **Q-06** (RISK-08) | Notification + collaborator-role no-rollback: intentional or latent bug? | Eng + product owner / Philip | **Phase 5** (before migrating those 2 flows) | **Keep no-rollback (opt-in only).** Adapter makes rollback opt-in; current eventual-consistency behavior is preserved unless the owner explicitly opts in. | **RESOLVED** — owner ruled to **keep no-rollback as opt-in**; current eventual-consistency behavior is intentional. Matches the safe default. |
| **Q-24** (RISK-15) | Large-DB perf fixture feasibility | Eng + product owner / Philip | **Phase 0** (it gates downstream exits) | **Synthetic-only fallback** (T4 / §3.2): downgrade all "improved vs baseline" exits in Phases 2/3/4/7/8 to "no regression vs synthetic + manual Chrome trace"; record D-018. | **RESOLVED** — owner kept the fixture as a **Phase-0 gate** with the **synthetic-only fallback** (T4 / §3.2) as the contingency if seeding proves infeasible; downgrade recorded as **D-018**. |
| **RISK-05** | Any new SECURITY DEFINER RPC (chart-buckets, homebase, activity CTE) | Product owner / Philip + eng (security review) | **Phase 8 Deploy N** (before the RPC ships) | **Do NOT ship the RPC.** Keep JS aggregation (flag OFF); the perf win is deferred until the RLS + `SECURITY DEFINER` + `search_path` review and `prove:*` cross-tenant denial pass. Security beats speed. | **OPEN** — per-RPC security sign-off still required at Phase 8 Deploy N (not part of the 2026-06-17 pass). |
| **D-016 / Q-28** (doc 25) | Field RUM / Web-Vitals wiring — package vs provider dashboard vs custom `/api/vitals` (PII surface) | Product owner / Philip + eng (privacy) | **Phase 0** (the "RUM wiring decided" exit gates Phase 0) | **No package + Vercel provider-dashboard Speed Insights** (zero added PII surface, no new endpoint). Stand up a custom `/api/vitals` collector **ONLY** on affirmative owner PII sign-off; absent sign-off, the provider dashboard is the field signal. This makes the Phase-0 "RUM wiring decided" exit resolve deterministically without a new PII-bearing endpoint. | **OPEN** — applied default (provider-dashboard Speed Insights) holds until owner signs off on a custom collector. |
| **Q-36** (doc 26) | Enable `cacheComponents`? | Eng + product | **After Phase 7** (Track F) | **Keep OFF.** Roll out C0→C2 only behind measurement; the editor is never cached except at the query level. Do not enable until the §F gates pass. | **OPEN** — flag decision deferred to the Feature-Adoption Track after Phase 7. |
| **Q-37** (doc 26) | Enable `reactCompiler`? | Eng lead | **After the Phase-3 purity audit** | **Keep OFF** until the §7.1 purity audit passes; pilot in a branch first. | **OPEN** — flag decision deferred to the post-Phase-3 purity audit. |

Cross-ref: each row maps to the canonical Q-NN in `19_OPEN_QUESTIONS.md` (and its alias table). FIX-3 (`19` owner) should add the owner/resolve-by/safe-default columns to those questions to match this table; this doc is the authoritative source for the deadlines + defaults.

### 6.1 Decision Resolution Protocol (non-blocking loop)

This is the binding rule for what happens when an owner decision in the §6 table is still unresolved when the implementing agent reaches its deadline. The agent **never blocks and never guesses** — it applies the recorded safe default, records that it did, and keeps moving. The owner can override later without rewriting history.

**(a) Unresolved at the resolve-by deadline → apply the safe default and proceed.** If an owner decision is still unresolved when its **Resolve-by** phase begins, the implementing agent **APPLIES THE RECORDED SAFE DEFAULT** from the §6 table and continues. It does **not** pause the phase waiting for the owner, and it does **not** invent an answer — it uses exactly the documented fallback. (E.g. Q-02 unresolved by Phase 2 → keep the 500-row cap and defer the share→`Tree` migration.)

**(b) When a default is applied, record it.** The agent logs the applied default as a new **`D-NN`** in `17_DECISION_LOG.md` with the form *"default applied for Q-NN on `<date>`, unresolved by deadline"* (capturing which safe default was applied and which phase exits it affects), and notes it in the relevant phase detail file so the execution trail is visible where the work happened. The applied default is now the in-effect decision until/unless overridden.

**(c) The owner MAY OVERRIDE LATER — logged, never silent.** A post-hoc owner decision is recorded as a **new `D-NN` that supersedes the default's `D-NN`** (both IDs are preserved and cross-referenced; the original is marked *Superseded by D-NN*, not deleted). How the override is applied depends on how the default shipped:
  - **If the default shipped behind a feature flag (§5):** override = **flip the flag** / follow the §5.3 cutover sequence (ship dark → staging → canary → 100%) for the now-preferred path. No revert needed.
  - **If the default shipped un-flagged:** override = a **forward-fix PR** (or a `git revert` of the offending leaf/trunk per §3.3) that references **both `D-NN`s** (the superseded default and the new ruling).

A late override **never silently rewrites history**: the applied default stays in the decision log as a recorded event, the superseding decision points back to it, and the change is shipped through the normal flag-cutover or forward-fix/revert path — never by quietly editing the original entry.

---

## 7. Adopt as D-015

This document is the substance of **D-015 — Execution governance (branch/PR + stop-the-line + flags) adopted via doc 24** (pinned in the V2 contract, §"Pinned NEW IDs").

> **Note for FIX-2 (`17_DECISION_LOG.md` owner):** add the following entry, referencing this doc.
>
> ## D-015 — Execution governance, seam-file locking, and flagged rollout
> Decision: Adopt the branch/PR/merge model, seam-file lock protocol (RISK-22), stop-the-line/abort criteria, safe-pause-point rules, feature-flag/kill-switch rollout, and owner-decision register defined in `24_EXECUTION_GOVERNANCE_AND_ROLLOUT.md`.
> Context: Multi-agent + human concurrent repo (branch `feat/sidebar-redesign` was a 101-conflict merge, commit `1025581b`); the strategy review scored governance lowest. No branch/PR model, abort criteria, safe-pause points, kill-switches, or owner deadlines existed.
> Why: A concurrent repo needs serialized seam edits, tripwire-based stop-the-line, and revert-free kill-switches so risky hot-path changes (Phase 3 per-row store/incremental totals; Phase 7 provider move; Phase 8 RPC cutover) can be paused/aborted without corrupting customer estimates.
> Consequences: Every risky step lands behind an OFF-by-default flag (extends `virtualization-flags.ts`); seam files have first-owner phases and a serialize-don't-parallelize lock; owner decisions (Q-01/02/03/06/24, RISK-05) have deadlines + safe defaults; large-fixture infeasibility (T4) downgrades baseline exits to synthetic-only (proposed D-018).
> Status: Accepted

Also propose **D-018** (large-fixture-infeasible downgrade) per §3.2 if/when T4 trips.
