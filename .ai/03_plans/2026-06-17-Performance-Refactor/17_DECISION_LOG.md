# 17 — Decision Log

> Decision IDs `D-001…D-024`. Seeded from the architectural decisions implied by the contract (`_SYNTHESIS.md`) and dossiers R1–R7. Cross-references: `RISK-NN` (`16_RISK_REGISTER.md`), `Q-NN` (`19_OPEN_QUESTIONS.md`). Status: Proposed unless noted.

---

## D-001 — Keep the pinned phase order
Decision: Execute phases 0→10 in the contract §2 order; deviations must be recorded here.
Context: 10 phases with real dependencies — foundation primitives (Phase 1) feed both tree kernel (Phase 2) and sheet decomposition (Phase 3); CI gates (Phase 9) need baselines (Phase 0).
Alternatives considered: (a) Tackle the sheet first (highest pain); (b) bundle/DB quick wins first then refactors; (c) parallelize 2 and 3.
Why: Baseline-before-refactor discipline (D-008) requires Phase 0 first; running 2 and 3 in parallel collides on shared seam files (RISK-14). Foundation-first minimizes rework.
Consequences: Slower visible payoff (sheet pain persists until Phase 3) traded for safety and measurability. Quick wins (D-002) blunt the wait.
Status: Accepted

## D-002 — Pull selected Phase 7/8 quick wins forward, gated
Decision: After Phase 0 baseline, optionally harvest isolated high-leverage wins early: provider-topology move, `d3`→`d3-shape` dedup, share-page dynamic chart import, hot-path FK indexes, ship `get_project_chart_buckets`. Each gated by baseline + `bun run validate`.
Context: Contract §2 quick-win note — these don't depend on tree/sheet refactors.
Alternatives considered: Strict in-order (no early wins); harvest all of Phase 7/8 early.
Why: Cheap, isolated, measurable wins de-risk the program and demonstrate value without entangling the big refactors.
Consequences: Slight bookkeeping overhead; each early win must still respect RISK-05/06/09 (verify bundle with analyzer, RLS review for indexes). No big-refactor work is pulled forward.
Status: Proposed

## D-003 — Tree kernel = one headless `TreeIndex` + ops, single presentation kernel
Decision: Build one headless `TreeIndex` (find-by-id, descendants, ancestor-keep filter, cascade) plus an ops layer, consumed by all 7 tree families; converge `WorkshopTree`→`Tree` so there is a single presentation kernel; keep distinct *reorder adapters* over the shared index core.
Context: ≥8 find-by-id, ≥5 descendant collectors, ≥4 ancestor filters, ≥3 cascade engines re-implement the same DFS (contract §1 trees). Two presentation kernels exist (`Tree` virtualized vs `WorkshopTree` share-only).
Alternatives considered: (a) Leave families separate, only share helpers; (b) fully unify reorder planners too.
Why: One index kills the duplication and the per-keystroke rebuild cost; a single virtualized presentation kernel removes `WorkshopTree`. Reorder rules differ (`ESTIMATE_TREE_SORT_ORDER_STEP` vs library folder sort, R3 Q-08) so planners stay as adapters.
Consequences: `TreeIndex` is *derived* state in a selector/memo layer (confirm with state model, Q); share view may need virtualized `Tree` only if 500-row cap isn't a hard limit (RISK-04, Q-02).
Status: Accepted. Owner-ratified 2026-06-17 (Q-08 answer pass) — one shared `TreeIndex`/ops core with distinct reorder adapters; do not force estimate-tree and library-folder persistence into one planner.

## D-004 — Delete `react-complex-tree`
Decision: Remove `react-complex-tree@2.6.1` once confirmed it contributes only a type alias + CSS and is absent from the runtime bundle.
Context: Contract §0 — "effectively dead." Only a `type`-only import found (`library-folder-reorder.ts:1`).
Alternatives considered: Move to devDeps; leave as-is.
Why: Removing a ~2.7M dead lib reduces install/maintenance surface and possible bundle leakage.
Consequences: Must verify with analyzer + a value-import sweep first (RISK-06, Q-10); replace the CSS/type alias with in-house equivalents.
Status: Proposed (gated on Q-10). Owner-ratified 2026-06-17 (Q-10 answer pass) — removal stays GATED on analyzer proof of runtime absence plus CSS/type replacement (workshop layout still imports its CSS); not yet accepted for execution.

## D-005 — One optimistic-mutation adapter with pluggable rollback
Decision: Collapse 13 hand-rolled optimistic flows / 5 rollback mechanisms into a single adapter that takes the rollback strategy as a parameter (patch-snapshot, whole-tree snapshot, revision-guarded, cache-snapshot, closure-restore, or none).
Context: Contract §1 state — 13 flows, 5 mechanisms; notifications + collaborator-role have no rollback.
Alternatives considered: One hardcoded rollback path for all; leave flows as-is.
Why: A single adapter standardizes ordering/error handling while preserving each flow's required guarantee; pluggable rollback avoids forcing rollback onto intentional eventual-consistency flows (RISK-08).
Consequences: No-rollback flows stay opt-out pending owner decision (Q-06); per-row promise-queue may become redundant (Q-07). Migrate one flow at a time with parity proof (RISK-07).
Status: Accepted. Owner-ratified 2026-06-17 (Q-06/Q-07 answer pass) — keep no-rollback opt-in for notifications/collaborator-role flows unless the owner blesses rollback; keep the per-row `operationId`/promise-queue until the adapter proves equivalent ordering/stale-suppression (Q-07 stays a gate).

## D-006 — Add a duplication/reuse lint rule to the enforcing DS gate
Decision: Extend the design-system enforcement so component duplication/reuse is a CI failure, landing the rule in whichever gate is actually enforcing (`enforce-app-design-system.mjs`, after confirming `lint:design` isn't a no-op).
Context: `scripts/enforce-app-design-system.mjs:148-237` enforces tokens but has zero reuse rules; `DESIGN.md:426` calls duplicates blocking yet nothing enforces it.
Alternatives considered: Document-only guidance; rely on review.
Why: Without enforcement, consolidated primitives re-drift (RISK-10).
Consequences: Need to resolve whether `lint:design` is a no-op (Q-11) and whether the impeccable detect engine is in-tree; rule must fail on a seeded duplicate.
Status: Proposed

## D-007 — Unified query-key factory + `patchAndMarkStale` helper
Decision: One nested query-key factory replacing the 5 conventions; fold the `estimateTabId ? tabTree : areaTree` branch (replicated ~14×) into the factory; extract a `patchAndMarkStale` helper for the 22 `setQueryData + invalidate(refetchType:"none")` sites.
Context: Contract §1 state — 5 key conventions, ~14× branch, 22 patch sites; `areaTree` flagged legacy.
Alternatives considered: Keep conventions, only add the helper; retire `areaTree` immediately.
Why: One factory removes drift and the legacy branch; the helper removes 22 copies of a subtle cache idiom.
Consequences: Must confirm `areaTree` can be retired (Q-04) before folding the branch away; tree cache doubles as mutable optimistic state (`use-estimate-query.ts:13-15`) so the factory must coexist with revision counters.
Status: Proposed

## D-008 — Baseline-before-refactor discipline
Decision: No refactor lands without a Phase-0 baseline of the metric it claims to improve, and a before/after comparison; HIGH/CRITICAL-risk items need the relevant proof (`prove:rls-initplan`, analyzer, render-count budget) green.
Context: Contract §1 tests — only 4 render-isolation gates, non-gating route budgets, no real large-tree fixture; bundle claims unmeasured.
Alternatives considered: Refactor on import-graph reasoning alone.
Why: Many findings are derived, not measured (RISK-06, RISK-11); discipline prevents wasted/regressive work.
Consequences: Phase 0 must build the missing baselines (render-count budgets, large-tree fixture, analyzer run) before downstream phases; slower start.
Status: Accepted

## D-009 — Per-row subscription to sever `editableRows` fan-out; preserve memo guards
Decision: Replace the single `editableRows` map (identity changes on every keystroke) with per-row subscription/atoms, while **keeping every existing `memo` comparator** in `branch.tsx` and `row-table.tsx`.
Context: Contract §1 sheet — map identity recomputes 6+ whole-tree memos/effects per keystroke; rendering is already shielded, the problem is compute.
Alternatives considered: Move `editableRows` into the TanStack tree cache as single source; leave the map and only memoize harder.
Why: Per-row subscription removes the fan-out at its root; the memo guards are load-bearing and must not be removed (RISK-01).
Consequences: Interacts with the tree-as-cache model (R2/R3 seam, Q); whether the map moves to cache vs atoms is an open eng decision.
Status: Accepted. Owner-ratified 2026-06-17 (Q-08b answer pass) — prefer per-row subscriptions/atoms for `editableRows`; keep the tree cache focused on server tree structure plus optimistic structural updates, do not move drafts into it.

## D-010 — Replace whole-tree `JSON.stringify` signatures with structural hashes
Decision: Replace `getEstimateTreeContentSignature` (JSON.stringify ~19 fields × every row, `estimate-tree-reorder.ts:181-220`, called 5× incl. initial render) and `createProposalPreviewSignature` (15-field full-tree DFS) with incremental/structural-hash signatures fed by the Phase-1 primitives.
Context: Contract §1 — these serialize the whole tree on every keystroke/reorder.
Alternatives considered: Memoize the existing stringify; debounce.
Why: Structural hash makes change-detection O(changed) instead of O(whole tree).
Consequences: Hash must cover the exact fields each consumer reads or it mis-invalidates exports (RISK-03); enumerate fields before swapping.
Status: Proposed

## D-011 — Planning-only scope for this pack
Decision: This pack produces plans only — no edits to `src/**`, `tests/**`, `e2e/**`, `scripts/**`, `supabase/**`, or config; no migration applied; future migrations/indexes/RPCs are planning items with risk + validation.
Context: Master prompt hard constraints (contract §4).
Alternatives considered: Apply isolated quick wins directly.
Why: Keeps the pack reviewable and reversible; execution happens in later phases under their own gates.
Consequences: Every DB/bundle item carries an explicit "to be applied in Phase N" marker; new scripts are proposals.
Status: Accepted

## D-012 — Share a single memoized rollup/`TreeIndex` across sheet and left tree
Decision: The sheet and the left `EstimateSheetTree` consume one memoized `TreeIndex`/rollup rather than each running its own totals DFS.
Context: Contract §5 / R4 Q — the left tree may run its own totals DFS over the same cache, doubling per-keystroke compute (RISK-12, Q-05).
Alternatives considered: Fix only the sheet's `computeNodeTotals`.
Why: Fixing one side leaves half the cost; a shared index moves the headline metric.
Consequences: Requires the Phase-2 `TreeIndex` and Phase-3 sheet decomposition to coordinate at the shared seam (RISK-14); measure double-compute first (Q-05).
Status: Proposed (see D-013 — the 2→3 ordering edge weakens conditionally on the Phase-0 Q-05 finding; and D-014 — family-1 sequencing within Phase 2).

## D-013 — Phase 2→3 ordering edge is CONDITIONAL on the Q-05 double-compute finding
Decision: Keep Phase 3 after Phase 1's parent-index primitive, but treat full Phase-2 tree-kernel adoption as a PARALLEL (not blocking) dependency for Phase-3 incremental totals UNLESS Phase-0 confirms the left tree runs its own per-keystroke totals DFS.
Context: D-012 pinned a hard 2→3 edge on the premise the tree and sheet must share one index instance to avoid double-compute; AR1 found `EstimateSheetTree.tsx` has no `computeNodeTotals` call (`:154`), suggesting the premise is false.
Alternatives considered: (a) Keep hard 2→3 edge (safe, slower); (b) weaken to Phase-1-parent-index-only dependency if Q-05 confirms no double-compute.
Why: Avoid over-sequencing the highest-risk phase on an unverified premise.
Consequences: Phase 0 must close Q-05 before the dependency graph is finalized; record the outcome.
Status: Proposed (gated on Q-05). Owner-ratified 2026-06-17 (Q-05 answer pass) — the suspected left-tree double-compute is NOT present in current code (`EstimateSheetTree` renders `node.total`, never reads `editableRows` or calls `computeNodeTotals`); keep the Phase-0 render/compute count as confirmation before relaxing the 2→3 edge.

## D-014 — Phase-2 family-1 (estimate tree) sequencing
Decision: Resolve the contradiction between `08_PHASE_2_TREE_KERNEL_PLAN.md` §0 ("convert the estimate sheet tree LAST — highest blast radius") and §4 step 1 ("adopt estimate first"). DECISION: keep estimate-tree (family 1) conversion LAST for safety, BUT design + freeze the `moveNode`/`SortOrderStrategy` adapter shape against family-1's sort-order rules FIRST (an early paper/throwaway probe, before the library-folder step) so the adapter isn't frozen wrong. Add an interim Phase-2 exit criterion that DISTINGUISHES "code-dedup green" (families 2–6 converted) from "perf-win green" (A-15 keystroke decoupling, which only lands when family 1 converts) so the perf regression gate is not marked passed prematurely.
Context: the headline Phase-2 perf win is in family 1; converting it last defers the measurable win to the final PR.
Alternatives considered: family-1 first (early win, highest churn) vs last (safe, late win).
Why: safety + avoid premature green.
Consequences: Phase-2 has two exit tiers.
Status: Proposed

## D-015 — Execution governance adopted via doc 24
Decision: Adopt `24_EXECUTION_GOVERNANCE_AND_ROLLOUT.md` as the binding governance for the program: branch/PR/merge model, seam-file lock protocol (RISK-22), program-level stop-the-line/abort criteria, safe-pause points, and feature-flag/kill-switch rollout for risky phases.
Context: the repo is edited by multiple AI agents + humans concurrently (branch mid-merge, 101 conflicts); the pack lacked execution mechanics.
Alternatives considered: ad-hoc per-phase coordination (rejected — merge-disaster risk).
Why: multi-agent reality + Critical-risk phases need a kill switch and abort thresholds.
Consequences: every phase PR follows doc 24.
Status: Proposed

## D-016 — Field-RUM wiring approach (REVERSED — see owner ruling)
Decision: Do NOT add `@vercel/speed-insights`. Rely on Vercel's provider-dashboard Speed Insights (zero-config on Vercel, export-only) plus the existing dev `WebVitalsProbe` for field/console Web-Vitals visibility. Stand up a first-party `/api/vitals` sink (fed by `WebVitalsProbe.useReportWebVitals`) ONLY if the owner later accepts the PII/consent and first-party-storage work.
Context: file-03 budgets need field truth, but the telemetry lock is provider-dashboard/export-only Speed Insights with NO package change. The repo test `tests/vitest/vercel-web-analytics-integration.test.ts` forbids the `@vercel/speed-insights` package, so installing it would break the build.
Alternatives considered: install `@vercel/speed-insights` in root `layout.tsx` (REJECTED by owner — forbidden by test + telemetry decision); keep jsdom-only counts (rejected — can't prove field wins); first-party `/api/vitals` sink (deferred — only if owner accepts PII/consent work).
Why: respect the locked telemetry decision and the forbidding test; provider-dashboard Speed Insights gives field truth with zero package change and no consent surface to build.
Consequences: no new prod RUM dependency; field vitals come from the Vercel provider dashboard/export; any first-party sink is a gated future item carrying PII/consent review.
Status: Accepted (owner-ruled, Q-28). Owner-ratified 2026-06-17 (Q-28 answer pass). This CORRECTS the round-2 default, which had wrongly proposed installing `@vercel/speed-insights`. Cross-ref Q-28, doc 25, `tests/vitest/vercel-web-analytics-integration.test.ts`.

## D-017 — Reference-stability scope (totals Map vs editableRows)
Decision: The totals Map is `ReadonlyMap<string, number>` (value-equality under `Object.is`), so it needs only value-stability — a plain recompute suffices; the structural-sharing primitive and the reference-identity gate target OBJECT-valued surfaces (the `editableRows` per-row store), NOT the totals Map.
Context: AR/feasibility review found RISK-16 was misaimed at the number-valued totals Map.
Alternatives considered: build structural-sharing for the totals Map (rejected — unnecessary for numbers).
Why: avoid wasted effort + a misleading gate.
Consequences: RISK-16 retargeted; 07 §B.4 + 09 §5 adjusted.
Status: Accepted. Cross-ref RISK-16, Q-25.

## D-018 — Large-fixture-infeasible downgrades baseline exits to synthetic-only
Decision: If Phase 0 cannot cheaply seed the realistic RLS-governed large fixture (`perf:seed-db-fixture`, Q-24/RISK-15), every "improved vs Phase-0 baseline" exit criterion in Phases 2/3/4/7/8 downgrades to "synthetic-only: no regression vs the ≤200-row synthetic profile + a manual Chrome trace anchor." This is a measurement-confidence downgrade, NOT a license to skip measurement.
Context: The pack's measurement edifice depends on a fixture that is unprototyped against the self-referential RLS schema (RISK-15). Doc 24 §3.2 defines this as stop-the-line trigger T4.
Alternatives considered: block the program until a real fixture exists (rejected — may be infeasible); proceed with no measurement (rejected — violates baseline-before-refactor discipline D-011).
Why: keeps the program executable while being honest about reduced confidence.
Consequences: affected phase exits are tagged "synthetic-only"; the residual confidence caveat is recorded; tie to doc 25 methodology rules (≥20 samples, p95/p99, cold vs warm, never derive a TIME budget from jsdom).
Status: Proposed (activates only if T4 trips in Phase 0).
Cross-ref: RISK-15, Q-24, doc 24 §3.2, doc 25.

## D-019 — Share-tree 500-row cap is a hard beta product limit
Decision: Treat the share-tree 500-row cap (`reconstruct-share-tree.ts:29`) as a hard beta product limit; do NOT force share onto the virtualized `Tree` kernel unless the owner changes the share-scaling requirement.
Context: Q-02 owner ruling. The existing safe default stands — share at scale is not a beta requirement.
Alternatives considered: move share onto the virtualized `Tree` kernel to scale past 500 rows (REJECTED unless the owner changes the requirement).
Why: avoid mandating virtualization + kernel adoption on the share path for a scale the product does not require in beta.
Consequences: Phase-2 share migration keeps the 500-row cap plus a visible truncation message; the RISK-04 mitigation is simplified (no kernel-on-share obligation).
Status: Accepted (owner-ruled, Q-02). Owner-ratified 2026-06-17 (Q-02 answer pass). Cross-ref RISK-04, Q-02, D-003.

## D-020 — Bless the forked primitives for now
Decision: Bless `EstimateTabStrip` and the 5-menu-module divergence for now; keep `dropdown-popup` as the shared core, add the duplication lint, and only remove clearly-dead `IconButton` surfaces later. Broad primitive convergence stays Phase 6, not a Phase-0 blocker.
Context: Q-03/Q-27 owner ruling (Q-27 is an alias of Q-03's menu-collapse slice). The forks are treated as intentional (DnD + horizontal scroll + orange add-affordance on `EstimateTabStrip`).
Alternatives considered: collapse the menu modules and merge `IconButton`/`ToolbarIconButton` now (REJECTED — defer broad convergence to Phase 6).
Why: respect intentional design divergence; prevent re-drift via the duplication lint (D-006) without a premature blind merge.
Consequences: keep the forks as-is through Phase 6; the duplication lint (D-006) guards reuse; only clearly-dead `IconButton` surfaces are removed in the interim.
Status: Accepted (owner-ruled, Q-03/Q-27). Owner-ratified 2026-06-17 (Q-03/Q-27 answer pass). Cross-ref RISK-10, Q-03, Q-27, D-006.

## D-021 — Adopt Next.js 16 Cache Components via the C0→C4 gated rollout
Decision: Adopt Next.js 16 Cache Components (`cacheComponents: true`) through the C0→C4 gated rollout (doc 26): enable per-tier with C0 marketing first and the editor LAST, keeping `cookies()`/`headers()` outside cached scopes and using namespaced `cacheTag` + server-action invalidation.
Context: doc 26 — `cacheComponents` can cut RSC/data work on cacheable routes, but a mis-scoped cache leaks cross-tenant or stale private data (RISK-23).
Alternatives considered: enable `cacheComponents` globally at once (rejected — Critical cross-tenant risk); never adopt (rejected — leaves cacheable wins on the table).
Why: a gated tier-by-tier rollout captures the cache wins while bounding the cross-tenant/stale-data blast radius.
Consequences: editor stays uncached except at query level; each tier carries a no-stale-private-data check before advancing.
Status: Proposed (gated, late phase after purity + bundle work).
Cross-ref RISK-23, Q-36.

## D-022 — Pilot React Compiler only after the purity cleanup
Decision: Pilot the React Compiler (`reactCompiler: true`, doc 26) ONLY after the §7.1 purity cleanup passes on the hot components, preserving manual memo per Bible §7.2; pilot in a branch with build+DOM+e2e+render profiles and a single-config-revert.
Context: doc 26 — enabling the compiler before purity cleanup can change render behavior or silently bail out, and removing manual memo can break the load-bearing guards (RISK-24).
Alternatives considered: enable the compiler immediately (rejected — behavior-change/bailout risk on hot paths); strip manual memo on adoption (rejected — guards are load-bearing per §7.2).
Why: purity-first sequencing plus preserved memo keeps the render-isolation gates green while testing the compiler win.
Consequences: compiler adoption is deferred behind the purity audit; manual memo stays until the pilot proves it redundant.
Status: Proposed (gated).
Cross-ref RISK-24, Q-37.

## D-023 — Adopt the engineering guardrails + standing PR checklist
Decision: Adopt the doc 27 engineering guardrails: the §2 Law-2/Law-3 merge gates, the 6 §15.4 static checks, the §17 10-question PR checklist, and the §18 Do-Not-Do banned-patterns list; the static checks become Phase-9 CI gates.
Context: doc 27 — the program needs standing guardrails so the refactor's invariants survive multi-agent execution and don't re-drift.
Alternatives considered: rely on review/judgment alone (rejected — re-drift risk); defer all guardrails to post-program (rejected — invariants needed during execution).
Why: codified merge gates, static checks, and a PR checklist enforce the program's invariants continuously rather than relying on reviewer memory.
Consequences: every PR runs the §17 checklist and respects the §18 banned patterns; the 6 §15.4 static checks land as Phase-9 CI gates.
Status: Accepted.
Cross-ref doc 27, D-006.

## D-024 — Adopt the consolidated Behavior-Preservation & Safety Net (doc 28)
Decision: Adopt `28_BEHAVIOR_PRESERVATION_AND_SAFETY_NET.md` as the mission-critical operator console for the program: the invariant register, the stop-immediately set, the per-phase "correctness gate independent of render count" requirement, and the kill-switch map. The memo-guard comparator check is PROMOTED from a manual review step to an AUTOMATED snapshot test.
Context: the program's highest-severity failure modes (RISK-01 behavior regression, RISK-25 stale-totals scope-hint, the load-bearing memo guards in A-08) need a single consolidated safety surface rather than mitigations scattered across per-phase plans; correctness gates that only count renders cannot catch a value/scope-correctness regression.
Alternatives considered: leave behavior-preservation mitigations distributed per-phase (rejected — no single stop-the-line surface, easy to skip a guard); keep the memo-guard comparator check manual (rejected — manual review is not enforceable across multi-agent execution).
Why: a consolidated invariant register + stop-immediately set + kill-switch map gives the operator one authoritative console; making each per-phase correctness gate independent of render count ensures value/scope regressions (RISK-25) are caught even when render-count budgets pass; automating the memo-guard comparator check removes a manual gap.
Consequences: every phase carries a correctness gate that does not rely on render count; the memo-guard comparator snapshot test lands as an automated gate; doc 28 is the binding safety reference.
Status: Accepted.
Cross-ref doc 28, RISK-25, doc 24 §3.1.
