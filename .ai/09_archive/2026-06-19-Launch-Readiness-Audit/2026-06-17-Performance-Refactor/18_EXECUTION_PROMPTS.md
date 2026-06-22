# 18 — Execution Prompts (one per phase)

> **Authoring agent:** W5. **Status:** Copy-paste-ready prompts for the future implementation agents that will execute each phase. **One prompt per phase (0–10).** Each is self-contained and specific to that phase's candidate files.
>
> **How to use:** When a phase is ready to execute, copy its prompt verbatim into a fresh implementation session. The prompts assume the implementer has repo access at `/Users/philiplewis/Documents/archestimator` and that the plan pack lives at `.ai/03_plans/2026-06-17-Performance-Refactor/`.
>
> **Every prompt enforces the same contract:** read the plan pack first (the phase detail file + `04_TARGET_ARCHITECTURE.md` + `15_VALIDATION_MATRIX.md`); implement **only** that phase; never skip the listed validation; never broaden scope; record evidence (`file:line`, before/after metric); and **when reality diverges from the plan, update the plan** (append to the phase detail file and log a `D-NN` in `17_DECISION_LOG.md` or a `Q-NN` in `19_OPEN_QUESTIONS.md`).
>
> Note: this pack itself is planning-only (`D-011`). These prompts are for the **execution** sessions that come **after** the pack — at which point `src/**` edits are in scope **for the named phase only**, under that phase's gates.

---

## Shared preamble (applies to every prompt below)

```
You are the implementation agent for ONE phase of the Archestimator Performance Refactor.
Repo: /Users/philiplewis/Documents/archestimator

BEFORE WRITING ANY CODE:
1. Read, in this order:
   - .ai/03_plans/2026-06-17-Performance-Refactor/24_EXECUTION_GOVERNANCE_AND_ROLLOUT.md FIRST (branch/PR + merge model, seam-file lock protocol, stop-the-line/abort criteria, safe-pause points, feature-flag/kill-switch rollout, owner-decision deadlines + safe defaults). You operate under these rules for the whole session.
   - .ai/03_plans/2026-06-17-Performance-Refactor/05_PHASED_REFACTOR_PLAN.md  (the master roadmap — find YOUR phase section; it is authoritative on order, dependencies, exit criteria)
   - your phase's detail file (named in your prompt) (Phases 9 & 10 have no detail file — use 15 + 05 instead)        — authoritative on implementation mechanics
   - .ai/03_plans/2026-06-17-Performance-Refactor/04_TARGET_ARCHITECTURE.md   (the end-state your work must land at)
   - .ai/03_plans/2026-06-17-Performance-Refactor/15_VALIDATION_MATRIX.md     (what each command actually proves)
   - .ai/03_plans/2026-06-17-Performance-Refactor/21_BLAST_RADIUS_MATRIX.md   (per-target imports/callers/flows/tests + the RISK-14 seam cluster — consult BEFORE touching any seam file)
   - the relevant entries in 01_CODEBASE_AUDIT.md (A-NN), 16_RISK_REGISTER.md (RISK-NN), 17_DECISION_LOG.md (D-NN), 19_OPEN_QUESTIONS.md (Q-NN) named in your prompt.
2. Confirm your phase's dependencies (05 §0.4) are complete. If a dependency is unmet, STOP and report.
3. Assume OTHER agents are editing this repo CONCURRENTLY. Honor the seam-file lock protocol (doc 24, RISK-14 cluster) before editing a shared seam; rebase/coordinate rather than clobber.

HARD RULES:
- Follow doc 24's branch/PR + seam-lock + stop-the-line + feature-flag rules. Hit a stop-the-line/abort threshold → STOP and report; never push past it.
- Before editing ANY seam file, consult 21_BLAST_RADIUS_MATRIX.md AND run `impact`/`detect_changes` per repo CLAUDE.md (GitNexus). Report the blast radius; warn on HIGH/CRITICAL before proceeding.
- Honor the owner-decision safe-defaults table (doc 24 / 19_OPEN_QUESTIONS.md): where an owner has not decided by deadline, take the recorded SAFE DEFAULT — do not improvise. If an owner decision is unresolved at its deadline, follow the Decision Resolution Protocol in `24_EXECUTION_GOVERNANCE_AND_ROLLOUT.md` §6.1 — apply the recorded safe default, log a D-NN, proceed; never block.
- Implement ONLY this phase. Do not start the next phase's work. Do not "while I'm here" fix unrelated things.
- Do NOT skip validation. Run every command listed for your phase. Paste the output.
- Do NOT remove any load-bearing memo guard (A-08): branch.tsx:111-156, row-table.tsx:86-116. The problem is COMPUTE, not row re-renders.
- Preserve the confirmed-good (A-37, A-06): exceljs server-only, NeatWireframe WebGL lifecycle, all page.tsx as Server Components, existing dynamic-import boundaries.
- Run impact analysis before editing any symbol (CLAUDE.md GitNexus rule); warn on HIGH/CRITICAL risk; run detect_changes() before committing.
- For ANY "use server" file edit, run `bun run build` (tsc + Vitest MISS a non-async export; only next build catches it).
- One responsibility / one tree family / one flow / one primitive per PR where the plan says so. Keep each change independently revertible.
- STANDING GUARDRAILS (D-023, 27_ENGINEERING_GUARDRAILS_AND_PR_CHECKLIST.md): before opening ANY PR, run the 10-question standing PR checklist, respect the Do-Not-Do banned-patterns list, and pass the 6 static guardrail checks. Do NOT re-introduce a banned pattern. For ANY feature touching a repeated data shape, you MUST satisfy the §2 Law-3 merge gate — explicitly name your normalize / index / project / render layers — and the §2 Law-2 gate. These apply to every phase, in addition to your phase's own validation.

EVIDENCE & PLAN UPKEEP:
- Record evidence as file:line + before/after metric (render count, query count, bundle kb, LOC). Cite the A-NN you resolved.
- When reality diverges from the plan: append a note to your phase detail file AND log a D-NN (17_DECISION_LOG.md) or Q-NN (19_OPEN_QUESTIONS.md). Do not silently diverge.

REPORT when done: what changed (files), the before/after metric for each exit criterion, which A-NN/RISK-NN/Q-NN you touched, and any plan updates you made.
```

---

## Prompt — Phase 0: Baseline, instrumentation, and guardrails

```
Execute Phase 0 (Baseline, instrumentation, guardrails). Detail file: 06_PHASE_0_BASELINE_PLAN.md.
Resolves A-03, A-38, A-39, A-40; measures A-01/A-17/A-20/A-22/A-34/A-35. Risks RISK-06, RISK-11, RISK-12.
Dependencies: none. This phase gates every later phase (baseline-before-refactor, D-008).

GOAL: capture an honest, reproducible BEFORE state and build the missing measurement instruments — WITHOUT changing any product behavior.

DO:
1. Add an `analyze` npm-script and run `ANALYZE=true bun run build`. Record per-route First-Load-JS + chunk contents. Confirm or deny, with analyzer evidence: supabase in landing chunk (A-01/Q-09); react-complex-tree absent from runtime bundle (A-17/Q-10); only d3-shape used, full d3 redundant (A-34/Q-09); d3 in share chunk (A-35).
2. Run `perf:measure-routes` then `perf:check-routes`; archive the median/overlay/_rsc JSON as the route baseline.
3. Run `perf:profile-peak-load` (synthetic ≤200 rows); record the number + its non-production caveat.
4. Generalize src/lib/.../estimate-sheet-render-probe.ts into a reusable createRenderProbe(name) and capture CURRENT render/compute counts for tree/tabs/sidebar/charts (baseline only — NO budgets yet; budgets are Phase 9).
5. Build the real large-data fixture: `perf:seed-db-fixture` (new) (1000+ row sheet, deep multi-level tree, 100+ project list) + `perf:profile-peak-load-large` (new). Capture numbers.
6. Run the orphan benchmarks once for a number: scripts/build-performance-query-inventory.ts, benchmark-proposal-workbook.ts, benchmark-estimate-cursor-broadcast.ts. Capture per-hot-path query count as the perf:query-count (new) baseline.
7. Instrument BOTH EstimateSheetContent.tsx:1402-1406 (sheet totals) AND EstimateSheetTree.tsx (its own DFS) on one keystroke to settle Q-05/RISK-12 (does the left tree double the compute?).
8. Answer measurement Q's: Q-11 (15_VALIDATION_MATRIX §1 already corrects lint:design to ENFORCING — confirm), Q-13 (does CI run beyond validate? inspect .github/), Q-16, Q-17, Q-19.
9. Capture a manual Chrome DevTools Performance trace of every matrix flow (landing, /share/[token], homebase, estimates list, sheet keystroke, tree expand/filter, tab switch, charts) — the only production-fidelity anchor.
10. Ratify or reject every PROPOSED budget in 03_PERFORMANCE_BASELINE_AND_BENCHMARKS.md §6.
11. Set up field-RUM wiring (D-016, docs 23/25): do NOT install `@vercel/speed-insights` (owner Q-28: a test forbids it) — wire field RUM via provider-dashboard Speed Insights export (no package) or `/api/vitals` only with owner PII sign-off (D-016) (note: speed-insights NOT installed; WebVitalsProbe is dev-gated/console-only/workshop-only today). Capture `perf:memory-leak` (mount/unmount listener+timer+subscription + heap baseline), `perf:tbt`/exec-time, and `perf:query-count` (new) baselines.
12. Ratify the PROVISIONAL budgets in docs 23 (per-route query-count/round-trip + payload + realtime-cost) and 25 (memory/heap ceiling, TBT/exec-time, server/TTFB) — per the measurement methodology (≥20 samples; p95/p99; cold vs warm separated; never derive a TIME budget from jsdom).
13. Author SC-1..6 static guardrail checks (doc 27, 06 §4.1), runnable LOCALLY in Phase 0 — as ESLint `no-restricted-imports`/`no-restricted-syntax` rules or `scripts/*.mjs` grep gates: SC-1 forbid `react-complex-tree` import (GATED on Q-10 — author now, enable when Phase 2 removes the CSS/type imports), SC-2 forbid selector-less Zustand store hooks, SC-3 `no-hot-barrel-imports`, SC-4 grep `select("*")`, SC-5 grep unwrapped RLS `auth.uid()` (extends `prove:rls-initplan`), SC-6 enforce `src/components/ui/tree` for new trees (STRICT after Phase 2). Run each to confirm it executes; CI-wiring is Phase 9.

DO NOT: change product behavior; refactor; tighten any budget to gating (Phase 9); apply a migration/index (D-011).

VALIDATE: bun run validate; ANALYZE=true bun run build; perf:measure-routes + perf:check-routes; perf:profile-peak-load; the orphan benchmarks; perf:seed-db-fixture + perf:profile-peak-load-large + perf:query-count (new); perf:memory-leak (new) + perf:tbt (new) baselines; SC-1..6 each run locally (doc 27).

EXIT: bundle reality recorded (Q-09/Q-10 answered); route + peak-load synthetic baselines archived AND (large-fixture peak-load archived OR the D-018 synthetic-only downgrade recorded in 17_DECISION_LOG.md per RISK-15/T4); createRenderProbe exists + counts captured; query-count + memory-leak + tbt baselines captured; RUM wiring decided (D-016); provisional docs-23/25 budgets ratified; SC-1..6 authored and runnable locally (doc 27; SC-1 gated on Q-10, SC-6 strict after Phase 2); Q-05/Q-11/Q-13/Q-16/Q-17/Q-19 answered or carried forward with an owner; budgets ratified; Chrome trace anchors each synthetic number.
```

---

## Prompt — Phase 1: Canonical indexes, selectors, and performance utilities

```
Execute Phase 1 (Canonical primitives). Detail file: 07_PHASE_1_FOUNDATION_PLAN.md.
Foundations for A-09, A-11, A-12, A-16. Risks RISK-03, RISK-14. Decisions D-007, D-010.
Dependencies: Phase 0 complete (baselines). Feeds Phases 2,3,4,5.

GOAL: ship the small, pure, well-tested primitives Phases 2–5 consume — WITHOUT wiring them into hot paths yet.

DO (each a new, unwired module + unit tests):
1. src/lib/query/patch-and-mark-stale.ts — patchAndMarkStale(client, key, updater) = setQueryData + invalidate({refetchType:"none"}), returning the snapshot for rollback (04 §4.2). Do NOT migrate the 22 call sites yet.
2. src/lib/query/keys.ts — unified nested query-key factory modeled on favoritesQueryKeys/notificationQueryKeys (the clean templates). Add estimate.tree(id, tabId?) resolver + treeRevision (04 §4.1). Keep BOTH tabTree/areaTree arms (Q-04 not yet resolved). Do NOT rewrite the ~14 ternary call sites yet.
3. src/lib/tree/tree-kernel.ts — buildTreeIndex(roots, adapter) producing byId/parentOf/depthOf/pathOf/find(O(1))/descendantsOf/ancestorsOf + rollup (04 §6.1). Unit-test against a fixture: assert find is O(1) and rollup recomputes ONLY changed ancestors.
4. structuralHash(idx, adapter, fields) (04 §6.1 item 7). FIRST enumerate the exact fields each consumer reads — the 19-field getEstimateTreeContentSignature (estimate-tree-reorder.ts:181-220) and the 15-field createProposalPreviewSignature (EstimateSheetContent.tsx:287-318). Add a PARITY test vs the existing stringify on a fixture (RISK-03, D-010).
5. Keep tests/vitest/perf/* green (nothing hot-path wired).

DO NOT: wire any primitive into EstimateSheetContent/EstimateSheetTree/mutations (Phases 2–5); retire areaTree (Q-04); change any behavior.

VALIDATE: bun run validate; focused bun run test:dom on the new util tests + tests/vitest/perf/*; bun run type-check.

EXIT: all four primitives exist with passing unit tests; structuralHash proven FIELD-EQUIVALENT to the existing stringify on a fixture (RISK-03); key factory produces byte-identical keys to current usage; perf tests still green; no hot path consumes the primitives yet.
```

---

## Prompt — Phase 2: Tree kernel unification

```
Execute Phase 2 (Tree kernel unification). Detail file: 08_PHASE_2_TREE_KERNEL_PLAN.md.
Resolves A-14, A-15, A-16(complete), A-17, A-18, A-05. Risks RISK-02, RISK-04, RISK-06, RISK-12, RISK-14. Decisions D-003, D-004, D-012. Open Q-02, Q-08, Q-10.
Dependencies: Phase 1 (buildTreeIndex, structuralHash, rollup). Coordinate seam files with Phase 3 (serialize edits, RISK-14).

GOAL: replace the ≥8 find-by-id / ≥5 descendant / ≥4 ancestor-filter / ≥3 cascade re-implementations across 7 tree families with ONE headless TreeIndex+ops built once per tree version; converge WorkshopTree→Tree; delete react-complex-tree.

DO (adoption order, one tree family per PR, 04 §6.4):
0. ADOPTION-ORDER RESOLUTION (D-014, doc 20): the estimate tree is adopter-FIRST (step 1 below) but family-LAST to fully retire — land the shared index behind an adapter for it first, converge the other families, and remove the estimate tree's bespoke paths last. Follow the family-1-last / adapter-first sequencing in D-014; do not silently pick the §0 vs §4 contradiction.
2. Swap the 5 getEstimateTreeContentSignature calls (EstimateSheetTree.tsx:300,301,411,418,440) to structuralHash (A-16); VERIFY mergeEstimateTreeStructureWithCachedNodes (estimate-tree-reorder.ts:222-251) change-detection still fires.
3. Collapse buildEstimateNodeReorderPlan vs buildLibraryFolderReorderPlan onto moveNode/removeNodes with DISTINCT sort-order adapters (D-003). Confirm Q-08 before fully unifying — keep adapters if sortOrder rules diverge. Golden-file planner output (RISK-02).
4. Library/folder trees adopt the index; cache the taxonomy shell + precompute category→node map once (A-18: buildLibraryTree.ts:46-149,478-504).
5. Templates adopt the index; donate filterProjectSourcesByQuery (TemplatesTree.tsx:659-730) as the canonical filterKeepingAncestors model.
6. Move Share's render onto Tree in read-only mode; then delete WorkshopTree (A-17). Decide Q-02 (500-row cap) first (RISK-04).
7. Remove react-complex-tree (D-004) ONLY after the Phase-0 analyzer confirmed it is absent from the runtime bundle (Q-10): replace TreeItemIndex alias with `type TreeItemIndex = string` (library-folder-reorder.ts:1,86), drop the CSS import (app/workshop/layout.tsx:15), delete the dep.
8. Generalize cascade selection (tree-selection.ts) and rollups over the adapter (last, low-risk).

9. UX/a11y gates (doc 20): on `Tree` convergence keep roving focus + ARIA tree semantics; preserve DnD VISUAL AFFORDANCES (drop indicators, drag handles, keyboard reorder); satisfy GATE-TRANSIENT-SURVIVAL (expansion/scroll/selection/active-tab survive a tree rebuild); run `bun run storybook:validate` (a11y + visual-regression gate at Phase 2).

DO NOT: decompose EstimateSheetContent (Phase 3); change virtualization thresholds (Phase 3); change reorder PERSISTENCE rules (only the engine); force all 7 families at once.

VALIDATE: bun run validate; focused tree DOM groups (reorder/edit/filter/bulk-selection/context-menu/dnd/external-drop/row-patch); bun run test:e2e estimate-tree-dnd.spec.ts; bun run test (tree-selection unit); bun run storybook:validate (a11y + visual-regression, doc 20); ANALYZE=true bun run build (confirm react-complex-tree + WorkshopTree gone); perf:render-budget (new, Phase 9) for tree once it exists.

EXIT: estimate sheet tree uses TreeIndex.find + filterKeepingAncestors (per-keystroke whole-tree rebuild gone vs Phase-0 baseline); adoption follows family-1-last/adapter-first (D-014); all 5 signature calls use structuralHash with golden-file parity; estimate+library+templates consume the shared index; WorkshopTree deleted, Share on Tree, react-complex-tree removed + analyzer-confirmed absent; tree a11y (roving focus/ARIA) + DnD affordances intact, GATE-TRANSIENT-SURVIVAL green, storybook:validate green; all tree DOM/e2e green; persisted sortOrder byte-identical on the fixture.
```

---

## Prompt — Phase 3: Estimate sheet decomposition and render isolation

```
Execute Phase 3 (Estimate sheet decomposition + render isolation). Detail file: 09_PHASE_3_ESTIMATE_SHEET_PLAN.md.
Resolves A-04, A-07, A-08(constraint), A-09, A-19, A-20, A-21. Risks RISK-01(Critical), RISK-03, RISK-12, RISK-14, RISK-11. Decisions D-009, D-010, D-012. Open Q-05, Q-08b, Q-08c, Q-08e.
Dependencies: Phase 1 (parent-index, structuralHash) + Phase 2 (shared TreeIndex/rollup — totals MUST read the same index the left tree reads, D-012/RISK-12). Serialize seam-file edits with Phase 2 (RISK-14).

GOAL: decompose the 1881-LOC component (EstimateSheetContent.tsx:1042-2922) along R4's responsibility map into hooks + presentational children, and SEVER the editableRows map-identity fan-out via per-row subscription — while PRESERVING every memo guard and keeping nodeTotalsComputes===1, proposalSignatureComputes===0, rendersOutside===0.

DO (highest-value first, ONE responsibility per PR, behind unchanged public props):
1. Extract the well-gated, isolated concerns FIRST to de-risk: useEstimateActivityHistory (gated behind inspector||rowDetails||projectSpecificRowId). Use the already-extracted cursor layer (:866-1040) as the template.
2. Introduce the per-row editable-rows external store (src/components/workshop/estimate-sheet/rows/editable-rows-store.ts — co-located with editable-row-model.ts per the doc-09 §4.1 sheet-math co-location law, 04 §7.2): subscribe per rowId via subscribeRow; KEEP the per-row memo guard (row-table.tsx:86-116). Whole-map snapshot() only on cold paths (export, reconcile). Decide Q-08b (cache vs atoms) WITH MEASUREMENT before committing the shape.
3. Make totals incremental (04 §7.3, A-09): useEstimateTotals = memoized rollup over the SHARED TreeIndex, recomputing only the edited row's ancestor chain. Reconcile the search/facet second pass (displayedNodeTotals, :1402-1406) onto the same rollup (Q-08c). Keep nodeTotals?.get(id) ?? computeNodeTotal(...) fallback (branch.tsx:177).
4. Move the proposal signature off the keystroke path (04 §7.4, A-19): compute lazily on dialog-open + debounced, and/or via structuralHash over only the stale-badge fields (:287-318, :1250-1263). structuralHash MUST cover the exact 15 fields the export reads (RISK-03).
5. Fix the resync effect (A-21, :1766-1783): on server reconcile, DIFF changed rows against the index and patch only those — do not rebuild the whole map.
6. Extract useEstimateRowOperations (the 15 mutation callbacks — largest LOC win; feeds the Phase-5 adapter), useSheetDisplayTransforms, then presentational <EstimateSheetCenterColumn> (pre-derived props only).
7. Virtualization (A-20): only after the render-count gates prove no regression and the large fixture is available, lower thresholds / default-enable flags (gated on Q-C prod-flag answer); cache getScrollElement/findScrollParent per container.
8. UX/perceived-latency + a11y gates (doc 20): GATE-EDIT-* (an in-progress edit is NOT overwritten by reconcile; optimistic insert shows entered values, not a skeleton); GATE-NO-TOTAL-FLASH (totals stay synchronous on keystroke — no flicker/skeleton on the totals path); GATE-CELL-KEYBOARD (keyboard cell editing + focus order preserved through decomposition, ARIA intact); the doc-20 effect-fire gate (decomposition does not add or re-order effect fires). Apply the totals-Map value-equality correction (D-017): the totals Map is number-valued so value-equality suffices — target the structural-sharing primitive at OBJECT-valued surfaces (editableRows store), NOT the totals Map.

DO NOT: change the tree kernel (Phase 2); remove ANY memo comparator (A-08 — compute, not re-renders); change EstimateSheetContent's public props; merge bulkSelectedRowIds into a store (Q-08e — measure; Phase 5 if at all); apply structural-sharing to the number-valued totals Map (D-017).

VALIDATE: bun run validate; tests/vitest/perf/* (relief/memoization/cursor/baseline) — THE LOAD-BEARING GATE: nodeTotalsComputes===1, proposalSignatureComputes===0, rendersOutside===0; the doc-20 effect-fire gate; bun run perf:profile-peak-load; perf:profile-peak-load-large (new); full bun run test:dom; bun run storybook:validate (a11y + visual-regression, doc 20); bun run test:e2e estimates-crud-latency.spec.ts. Diff computeNodeTotals output on a fixture before/after.

EXIT: orchestrator ≤ ~400 LOC and each extracted hook single-responsibility, public props unchanged; editableRows per-row-subscribed (keystroke in row A notifies only row A + its ancestor totals) with structural-sharing on that OBJECT-valued store (D-017, totals Map untouched); totals incremental over the shared index, nodeTotalsComputes===1, left tree NOT double-computing (Q-05/D-012 resolved); GATE-EDIT-*/GATE-NO-TOTAL-FLASH/GATE-CELL-KEYBOARD + effect-fire gate green; proposal signature off the keystroke path, export byte-identical on a fixture; resync patches only changed rows; all 361 DOM tests + 4 perf gates + storybook:validate green; large-fixture peak-load improved vs Phase-0.
```

---

## Prompt — Phase 4: Query / server-action / DTO standardization + select discipline

```
Execute Phase 4 (Query/action/DTO standardization + select discipline). Detail file: 10_PHASE_4_DATA_AND_CACHE_PLAN.md.
Resolves A-02, A-11(apply), A-12(apply), A-22(read discipline), A-25(read part). Risks RISK-09, RISK-13, RISK-07. Decisions D-007. Open Q-01, Q-04, Q-08f, Q-16.
Dependencies: Phase 1 (factory + helper exist). Precedes Phase 5.

GOAL: standardize the read/cache seam — adopt the Phase-1 query-key factory + patchAndMarkStale at all call sites; introduce ActionResult<T> envelope + explicit-column read DTOs; classify and reduce router.refresh(); replace .select("*") with explicit columns (+ .limit()) on read paths.

DO:
1. Migrate the ~14 tabTree/areaTree ternary sites (use-estimate-row-mutations.ts:204,212,229,278,303,313,328,353,383,394) to queryKeys.estimate.tree(id, tabId?). Both arms still present pending Q-04.
2. Migrate the 22 setQueryData+invalidate(refetchType:"none") sites to patchAndMarkStale. Tree-reorder revision sibling-key now via treeRevision — do not disturb reorder rollback (RISK-07).
3. Introduce ActionResult<T>+ActionError (src/lib/server/action-result.ts, 04 §3); wrap existing thin RPC actions ADDITIVELY (underlying *_with_history RPCs untouched). Run `bun run build` after ANY "use server" edit.
4. Read DTOs: replace projects .select("*") (workspace-repository.ts:837/908/1356/1367) with explicit columns; apply explicit columns to the LIVE component-library loader (full or Lite per Q-01/RISK-13 — TRACE THE CALLER FIRST) and add .limit() on cost_library_items + per-item history (component-library-repository.ts:530-746). Cross-check Q-16 (source_snapshot/metadata) before trimming.
5. Activity history: fold actor labels into the event read to kill the second profiles hop (estimates/actions.ts:600-622); explicit columns on the event payload (A-25). (The recursive-CTE node-scope RPC is Phase 8 — NOT here.)
6. router.refresh() classification (Q-08f, 12 files; real call ProjectEstimatesClient.tsx:215): per site label "needs fresh RSC" (auth/permission/route-structure — KEEP with a one-line justification comment) vs "scoped invalidation" (convert to patchAndMarkStale). Convert clear cases; leave genuine RSC cases.
7. staleTime cleanup: delete the ≥7 redundant 5*60*1000 restatements (providers.tsx:18-19 is the central default); KEEP the documented overrides (use-sidebar-favorites-query.ts:30 staleTime 0; EstimateSheetContent.tsx:1193-1196 long lazy cache).
8. SECURITY: ActionResult<T> authz preservation (doc 22, RISK-21) — wrapping a thin RPC action in the envelope MUST NOT drop or bypass any interior authz/permission check. Prove with `prove:action-authz` (new): an unauthorized caller still gets FORBIDDEN through the wrapped path.
9. NETWORK + consumer audit (doc 23): for each read DTO you trim to explicit columns, run the consumer-audit across all 3 CALLER CLASSES (live UI loader, server/RSC projection, export/snapshot path) so no consumer loses a field it reads; record per-route query-count/round-trip + payload deltas vs the Phase-0/doc-23 budgets.

DO NOT: build new RPCs (Phase 8); migrate the optimistic flows themselves (Phase 5); retire areaTree (Q-04); change optimistic semantics; let any ActionResult wrap weaken an authz check (RISK-21).

VALIDATE: bun run validate; bun run build (use-server async-export check); bun run prove:estimate-list-summaries + prove:estimate-tabs-rls + prove:action-authz (new); bun run scripts/build-performance-query-inventory.ts (wildcard count DOWN vs Phase-0); perf:query-count (new).

EXIT: zero hand-branched ternaries (all via resolver); all 22 patch sites use patchAndMarkStale; ActionResult adopted by touched actions WITH authz preserved (prove:action-authz green, RISK-21 cleared), bun run build green; projects + live component-library loader use explicit columns audited across all 3 consumer classes, component-library bounded by .limit(); activity actor-label N+1 removed, wildcard count down, per-route query-count/payload within doc-23 budgets; router.refresh() sites classified, clear invalidation cases converted, retained cases justified inline; redundant staleTime removed; all DOM/e2e green.
```

---

## Prompt — Phase 5: Optimistic mutation lifecycle standardization

```
Execute Phase 5 (Optimistic mutation lifecycle). Detail file: 11_PHASE_5_OPTIMISTIC_MUTATIONS_PLAN.md.
Resolves A-10, A-12(formalize), A-13. Risks RISK-07, RISK-08, RISK-01. Decisions D-005. Open Q-06, Q-07, Q-08e.
Dependencies: Phase 1 (patchAndMarkStale, key factory) + Phase 4 (ActionResult + migrated call sites). Uses Phase-2 mapNode for tree-patch reconciliation.

GOAL: collapse the 13 hand-rolled optimistic flows / 5 rollback mechanisms into ONE createOptimisticMutation adapter with pluggable rollback; give notifications + collaborator-role rollback (per Q-06); clean up the Zustand layer.

DO:
1. Build createOptimisticMutation (src/lib/query/create-optimistic-mutation.ts, 04 §8) with PLUGGABLE rollback (patch-snapshot / whole-tree snapshot / revision-guarded / cache-snapshot / closure-restore / none) and optional identity.revisionKey guard.
2. Migrate the two NO-ROLLBACK flows FIRST (useNotificationsQuery.ts:83-164, use-project-collaboration-query.ts:45-63). Decide Q-06 (intentional eventual-consistency vs latent bug) — make rollback OPT-IN so current behavior is preserved unless the owner chooses to fix (RISK-08, D-005). Record the decision (D-NN).
3. Migrate the estimate-row flows ONE PER PR with parity proof: patch-snapshot (use-estimate-row-mutations.ts:395-398), then revision-guarded reorder restore (use-estimate-query.ts:70-75 — preserve the revision protocol via treeRevision), then the whole-tree move snapshot (:180).
4. Centralize the tree-patch reconciliation (patchEstimateRowItemInTree + findEstimateRowItemInTree + toXxxRowPatch) as the estimate-domain apply/reconcile over mapNode (Phase 2).
5. Decide Q-07 by MEASUREMENT: is the per-row operationId + promise-queue (use-estimate-row-mutations.ts:201-202,426-436) still needed under the adapter? Retain only if ordering still needs it.
6. Retire project-estimates-store's server-state ownership (:35-102) → TanStack cache (A-13); keep UI-only state if any.
7. Zustand structural cleanup (04 §5): ISOLATE dragState into its own store FIRST (estimate-ui-store.ts:49 — highest-frequency, lowest-coupling, safest); then merge use-estimate-workspace-state + estimate-ui-store selection/expansion into one scope-keyed store, arrays→Set/Map (use-estimate-workspace-state.ts:105-108). Evaluate bulkSelectedRowIds merge (Q-08e — MEASURE; likely leave local).
8. SECURITY: optimistic FORBIDDEN-path tests (doc 22) — for each migrated flow, a denied/FORBIDDEN server response MUST roll the optimistic UI back and surface the error (no silently-kept optimistic state on authz failure). Add these to the per-flow parity proof.
9. UX (doc 20): focus-after-mutation contract — after an optimistic create/delete/move, focus lands on a sensible target (new row / neighbor), and on rollback focus + scroll are restored; no focus loss to body.

DO NOT: change the underlying *_with_history RPC contracts; force rollback onto intentional eventual-consistency flows; merge bulkSelectedRowIds without measurement (Q-08e); touch Phase-3 render-isolation work beyond consuming its row store; leave optimistic state on a FORBIDDEN response (doc 22).

VALIDATE: bun run validate; full bun run test:dom (mutation/rollback + FORBIDDEN-path + focus-after-mutation DOM tests); bun run test:e2e (CRUD + collaboration specs); tests/vitest/perf/* (no render regression); benchmark-estimate-cursor-broadcast wired with a threshold for ordering (new, Phase 9).

EXIT: all 13 flows go through createOptimisticMutation (5 mechanisms expressed as parameters); notifications + collaborator-role have rollback (or a recorded D-NN that no-rollback is intentional, opt-in); FORBIDDEN-path tests green for every migrated flow (doc 22); focus-after-mutation + rollback focus/scroll restore verified (doc 20); revision-guarded reorder semantics preserved (concurrent-edit test green); project-estimates-store no longer owns server state; selection/expansion merged into one Set/Map store, dragState isolated, selection subscribers don't re-render on drag; all DOM/e2e green, no render-isolation regression; Q-06/Q-07/Q-08e resolved or recorded.
```

---

## Prompt — Phase 6: UI primitive consolidation + loading cleanup + DS duplication lint rule

```
Execute Phase 6 (UI primitives + loading cleanup + DS duplication lint). Detail file: 12_PHASE_6_UI_PRIMITIVES_PLAN.md.
Resolves A-29(root cause), A-30, A-31, A-32, A-33, A-05. Risks RISK-10. Decisions D-006. Open Q-03, Q-11, Q-23.
Dependencies: Phase 1 (none structural). Independent of Phases 2–5; can run any time after Phase 1. Resolve Q-03 + Q-11 before finalizing migration targets.

GOAL: consolidate the 6 forked primitive families onto canonical primitives, memoize un-memoized cards, unify skeleton/loading-shell strategy, and ADD a duplication/reuse lint rule so re-introduced duplicates fail CI (the root-cause fix).

DO:
1. ADD THE DUPLICATION/REUSE LINT RULE FIRST (D-006, A-29) to the enforcing gate (scripts/enforce-app-design-system.mjs:148-237; note 15_VALIDATION_MATRIX §1 corrects lint:design to ENFORCING — confirm via Q-11). Run it against the current tree: it MUST flag the known duplicates A-30…A-33. Land it in warn-mode first if needed, then promote to error once the tree is clean.
2. Delete workshop/BulkActionToolbar.tsx (:1-135); route callers to ui/bulk-action-toolbar.tsx (:1-219) (A-32).
3. Icon-button: collapse into one Button variant="icon" (or the blessed target per Q-03); migrate the 19 raw class strings (ProjectEstimatesTable.tsx:302,312,344, ProjectTeamspaceHeader.tsx:494, ComponentLibraryManager.tsx:451,581, EstimateColumnRuler.tsx:90, EstimateSheetContent.tsx:2753, AddComponentModal.tsx ×4, LiveProjectCard.tsx ×2); delete the dead IconButton (A-31).
4. Cards: make ui/card.tsx the structural base (header/media/body/footer slots); compose LiveProjectCard/ProjectCard/EstimateListCard on it; MEMOIZE LiveProjectCard.tsx (722 LOC, un-memoized) (A-30).
5. Tab strip: per Q-03, either compose EstimateTabStrip (:1-655) on tab-strip.tsx/Tabs (keeping DnD/scroll/add-affordance feature-local) OR formally bless the divergence with a recorded D-NN (A-32).
6. Inputs: mandate SearchInput/ControlInput; migrate the highest-traffic raw <input> sites (70 total). Dialog consolidation optional (Q-23).
7. Skeletons: the 6 bespoke animate-pulse blocks (data-table.tsx ×2, TemplatesTree.tsx, component-library/index.tsx, 2 stories) adopt Skeleton (+ motion-reduce:animate-none); add <Skeleton.List rows={n}/>; align library/loading.tsx:1 to the shared StaticWorkshopLoadingShell (A-33, Q-23).

DO NOT: decompose the secondary monoliths wholesale (they shrink as primitives absorb logic, A-05); change token rules (already enforced); force a dialog-primitive migration if Q-23 defers it.

VALIDATE: bun run validate; bun run lint:design-system + bun run lint:design (+ the new DS duplication rule); bun run storybook:validate; bun run test:dom (skeleton/primitive tests).

EXIT: the DS gate has a reuse/duplication rule that fails on a seeded duplicate + flags zero remaining known duplicates; one BulkActionToolbar, one icon-button primitive (dead IconButton removed), Card is the structural base, LiveProjectCard memoized; EstimateTabStrip composed or blessed (D-NN); SearchInput/ControlInput adopted at high-traffic sites; all skeletons use Skeleton(+motion-reduce), Skeleton.List exists, loading.tsx shells consistent; storybook:validate + lint:design* green; pixel-diffs accepted.
```

---

## Prompt — Phase 7: Bundle / code-splitting / runtime cleanup

```
Execute Phase 7 (Bundle/code-splitting/runtime). Detail file: 13_PHASE_7_BUNDLE_RUNTIME_PLAN.md.
Resolves A-01, A-02(Suspense part), A-17(complete), A-34, A-35, A-36. Risks RISK-06, RISK-09, RISK-04. Decisions D-002. Open Q-09, Q-10.
Dependencies: Phase 0 analyzer baseline — DO NOT ACT ON ANY BUNDLE CLAIM BEFORE THE ANALYZER CONFIRMS IT (Q-09/Q-10/RISK-06). Phase 2 completes react-complex-tree removal. Provider/d3/share items are EARLY-WIN eligible after Phase 0 (D-002).

GOAL: shrink the public/shared bundle + runtime cost — split provider topology so authed-only providers stop loading on public routes; dedup d3→d3-shape; make d3 charts dynamic at EVERY consumer incl. the public Share page; extend optimizePackageImports; add streaming + the analyze script.

DO (each an independent revertible PR, analyzer before/after as proof):
1. (Early-win, behind the `workshopScopedProviders` feature flag per doc 24) Move RealtimeAuthBridge, NotificationProvider, PerformanceMonitor, NavigationListener, BfcacheHandler from src/app/providers.tsx:30-46 to src/app/workshop/layout.tsx; keep only the public-safe set (QueryClient/Toast/overlay) on root layout.tsx:25-31 (A-01, 04 §1.1). Verify focus/scroll AND that NO auth roundtrip fires on / (realtime-auth-bridge.tsx:22-66, RISK-09). Do NOT delete PerformanceMonitor — relocate it. SECURITY CONSTRAINT (doc 22, RISK-19): the workshop layout MUST STAY an RSC — do NOT convert it to a client component; the existing auth redirect/guard MUST remain intact (mounting client providers must not swallow the server-side redirect). Prove with `prove:workshop-auth-boundary` (new): an unauthenticated workshop route → 302 login.
2. (Early-win) Remove full d3 from package.json (only d3-shape is imported — CostDonutChart.tsx:4-5, analyzer-confirmed Q-09); bun run validate + smoke (A-34).
3. (Early-win) Make CostDonutChart dynamic + tab-gated at CostBreakdownSection.tsx:5 (Data route) and SharePageTabs.tsx:23 (public /share/[token]), matching the already-dynamic ProjectChartsClient.tsx:26-29 (A-35). Confirm the share page still renders the chart post-import (RISK-04).
4. Extend next.config.ts:55 optimizePackageImports ONE ENTRY AT A TIME with a before/after analyzer diff: @tanstack/react-table, @tanstack/react-virtual, @radix-ui/react-context-menu, d3-shape (A-36, RISK-06). Normalize phosphor bare-barrel imports → /dist/ssr.
5. Add the analyze npm script (next.config.ts:190-194, A-03).
6. Streaming (A-02 Suspense part, 04 §1.3): replicate the projects/[projectId]/layout.tsx:42-51 streaming shape on estimates list / library overview / homebase (homebase only after Phase 8 collapses its serial tail), each using the canonical route shell (Phase 6) for pixel-consistency.

DO NOT: remove PerformanceMonitor (relocate); convert src/app/workshop/layout.tsx to a client component or drop its auth redirect (doc 22, RISK-19); ship the provider move without the `workshopScopedProviders` flag (doc 24); touch the confirmed positives A-37 (exceljs server-only create-proposal-workbook.ts; NeatWireframe WebGL lifecycle HeroSection.tsx:11-14,117,132-141); remove QueryClientProvider from root unless the analyzer shows it carries weight; build the homebase RPC (Phase 8).

VALIDATE: bun run validate; ANALYZE=true bun run build (before/after: supabase leaves landing chunk; d3 dedup; share-chunk diff); bun run build; bun run test:e2e (landing-audit.spec.ts, shared-link-receiver.spec.ts, streaming spec); bun run prove:workshop-auth-boundary (new, doc 22); perf:bundle-budget (new, Phase 7/9); CLS check on the streaming routes (doc 25).

EXIT: landing + /share/[token] chunks contain NO supabase/realtime/notifications (analyzer-confirmed) + no auth roundtrip on marketing pages (landing-audit.spec.ts); provider move shipped behind `workshopScopedProviders` flag, workshop layout still RSC, prove:workshop-auth-boundary green (RISK-19 cleared); d3 removed, only d3-shape shipped, charts dynamic at all three consumers; optimizePackageImports extended (each entry analyzer-verified), analyze script exists; heavy authed routes stream behind the canonical shell within the doc-25 CLS budget; validate + e2e green; per-route First-Load-JS improved vs Phase-0.
```

---

## Prompt — Phase 8: Supabase / RPC / index / RLS performance pass

```
Execute Phase 8 (Supabase/RPC/index/RLS). Detail file: 14_PHASE_8_SUPABASE_DB_PLAN.md.
Resolves A-22(DB part), A-23, A-24, A-25, A-26(optional), A-27, A-28(verify). Risks RISK-05(Critical), RISK-13, RISK-12. Decisions D-002, D-011. Open Q-01, Q-12, Q-14, Q-22.
Dependencies: Phase 0 (query-count + latency baselines) + Phase 4 (DTO/read discipline). Phase 7 streaming consumes collapsed homebase. PLANNING-ONLY in this pack — no migration applied (D-011). FK indexes + chart RPC are EARLY-WIN eligible after Phase 0 (D-002).

GOAL: plan (NOT apply) the DB-side performance work — hot-path FK indexes, ship get_project_chart_buckets, collapse the homebase serial tail, recursive-CTE RPC for activity node-scope, verify RLS-initplan still holds — each a planning item carrying risk + validation.

NOTE: In this planning pack, "DO" means PRODUCE THE PLANNING ARTIFACT (exact target + risk + validation + "to be applied in Phase N" marker), not apply a migration. When this phase is later EXECUTED, the same artifacts become the migrations, each under its own gate with RLS review.

DO (each a planning item):
1. (Early-win) Hot-path FK indexes (A-27): estimate_nodes(parent_id), estimate_nodes(estimate_tab_id), project_favorites, estimate_favorites, project_members, project_group_memberships, estimate_sheet_members, notification_deliveries(project|estimate|workspace). Explicit RLS/SECURITY-DEFINER review (RISK-05). DEFER audit/AI-table FKs (Q-22). Plan the unused_index re-evaluation after a longer pg_stat_user_indexes window (Q-14) — do NOT drop on a young DB. Plan each index as `CREATE INDEX CONCURRENTLY` and note the deploy-window/lock implications (doc 23) — CONCURRENTLY cannot run inside a txn block.
2. (Early-win) REVIEW-AND-HARDEN the existing deferred migration `supabase/migrations-pending-review/deferred/20260614021500_get_project_chart_buckets_rpc.sql` (A-24, project-charts-repository.ts:101-128 — the `rg ... supabase/migrations` claim of "0 migrations" is true ONLY because the file lives under `migrations-pending-review/deferred/`, not because it is absent): it ALREADY has `security invoker` + `set search_path = public` + a recursive CTE, but ADD the missing `is_workspace_member(...)` join (doc 22 §2.2 — currently scopes only by `estimate_id = any(...)` + caller RLS) AND the missing `revoke execute on function ... from public, anon` before promotion. Do NOT author a new RPC from scratch. SECURITY (doc 22, RISK-20): keep it `SECURITY INVOKER` (not DEFINER) so caller RLS applies; if DEFINER is ever unavoidable, enforce explicit tenant scoping inside. Add a cross-tenant denial proof (`prove:project-chart-buckets`, new) — a user of tenant B cannot read tenant A's buckets. Add a recursive-CTE CYCLE guard (cycle detection / depth cap) so a malformed parent chain cannot loop. Golden-master oracle parity (charts have golden-master DOM tests), deploy probe with fail-open on partial drift; payload stays buckets-only (no raw facts).
3. Collapse the homebase serial tail (A-23): use `.ai/03_plans/2026-06-19-Workshop-Dashboard-Query-Batching/` as the canonical contract. Execute its Phase 1 app-only wave merge first; only author `workspace_homebase_summary` if that pack's Phase 3 go/no-go says the residual homebase tail still justifies DB work. If RPC proceeds: `SECURITY INVOKER`, membership joins, user-scoped favorites, publications/pending-collab app-side, `prove:workspace-homebase-summary`, server-only rollout flag. Validate round-trip count down (`perf:query-count`).
4. Activity estimate_activity_node_scope recursive-CTE RPC (A-25, estimates/actions.ts:670-719) to replace the JS BFS full-node fetch (:640-662); fold actor labels server-side (paired with Phase-4 N+1 fix). `SECURITY INVOKER` + CTE CYCLE guard + multi-role isolation proof via extended `prove:estimate-tabs-rls` (doc 22, RISK-20).
5. (Optional) First-node window-function RPC (A-26, workspace-repository.ts:1620-1683).
6. Verify RLS-initplan still holds (A-28, Q-12): plan a prove:rls-initplan + advisor security pass confirming no post-…20260614162000 bare auth.uid() in a USING/CHECK clause.

DO NOT: apply any migration in this pack (D-011); drop unused_index without a longer window (Q-14); do the client-side cache work (Phase 4); rebuild the confirmed-good patterns (A-28 — generalize public-repository.ts:85-97, don't replace).

VALIDATE: bun run validate; bun run prove:rls-initplan + prove:estimate-list-summaries + prove:unify-kinds + prove:estimate-tabs-rls (extended for CTE multi-role, doc 22) + prove:project-chart-buckets (new, cross-tenant denial) + prove:workspace-homebase-summary (new, cross-tenant denial); bun run build (if actions touched); perf:query-count (new). Re-run Supabase get_advisors (MCP) only AFTER a migration is actually applied (out of this pack's scope).

EXIT (planning): each DB item exists as an artifact with exact target + risk (RISK-05/RISK-20-reviewed) + validation + "to be applied in Phase N" marker; every new RPC specified `SECURITY INVOKER` (or DEFINER with explicit tenant scoping justified) with a cross-tenant denial proof + recursive-CTE cycle guard; FK indexes planned as CREATE INDEX CONCURRENTLY with deploy-window notes (doc 23); hot-path FK index list finalized, audit/AI FKs deferred (Q-22), unused_index flagged for a longer window (Q-14); get_project_chart_buckets design + golden-master + deploy-probe + prove:project-chart-buckets plan documented; homebase collapse plan (parallel vs RPC) documented with the independence analysis (if RPC, prove:workspace-homebase-summary new cross-tenant denial planned); activity recursive-CTE RPC (cycle-guarded, multi-role isolation) + optional first-node RPC documented; RLS-initplan verification plan (Q-12) documented. NO migration applied.
```

---

## Prompt — Phase 9: CI benchmark gates and regression prevention

```
Execute Phase 9 (CI benchmark gates). Detail file: NONE BY DESIGN — Phase 9 detail = `15_VALIDATION_MATRIX.md` (gate specs) + `05_PHASED_REFACTOR_PLAN.md` §Phase 9. Do not hunt for a Phase_9 file.
Resolves A-38, A-39, A-40. Risks RISK-11. Open Q-13, Q-18, Q-20, Q-21.
Dependencies: Phase 0 (instrumentation, createRenderProbe, large fixture, baselines). Each kernel's render-count test depends on that kernel's phase (2/3/6) landing. Resolve Q-13 (does CI run beyond validate?).

GOAL: turn the Phase-0 instrumentation into HARD CI gates so a perf regression fails the build — render-count budgets (tree/tabs/sidebar/charts), query-count/N+1 budget, bundle-size budget, large-fixture peak-load, tightened route-transition budgets — aggregated into one perf:gate.

DO:
1. Generalize createRenderProbe (Phase 0) and add render-count budget tests modeled on the 4 existing gates (tests/vitest/perf/*) for tree expand/collapse + filter, tab switch, right-sidebar search, charts (perf:render-budget, new). Each asserts exact 0/1 counts.
2. Wire scripts/build-performance-query-inventory.ts (orphan) into a gated perf:query-count (new) with per-flow ceilings + N+1 detection.
3. Add perf:bundle-budget (new) parsing analyzer output: per-route kb ceiling + "no supabase/realtime in landing."
4. Tighten scripts/check-route-transition-readiness.ts:108-113 budgets (15s/10s/30s + overlay cap 1.0) to real WARM targets (Q-21); convert peak-load to a bounded gate against the large fixture (perf:profile-peak-load-large).
5. Wire the orphan benchmarks with thresholds (Q-20): benchmark-proposal-workbook, benchmark-estimate-cursor-broadcast.
6. Wire ALL the round-2 gates introduced in Phases 0–8: perf:realtime-cost (doc 23/25), perf:memory-leak (doc 25), perf:tbt/exec-time (doc 25), and the RUM field check; aggregate them into perf:gate (new).
7. Aggregate the SECURITY prove:* set into a runnable gate too: prove:workshop-auth-boundary, prove:action-authz, prove:project-chart-buckets (cross-tenant), extended prove:estimate-tabs-rls (CTE multi-role) (doc 22) — runs alongside perf:gate in CI.
8. Aggregate all perf into perf:gate (new) and wire into CI (contingent on Q-13). CI-WIRE the SC-1..6 static guardrail checks AUTHORED in Phase 0 (doc 27, 06 §4.1) into this aggregation step — by now Q-10/Phase-2 have landed, so ENABLE SC-1 (react-complex-tree forbidden) and SC-6 at FULL strictness (`src/components/ui/tree` for new trees). This satisfies the doc-27 "CI-wired in Phase 9" claim.
9. PROVE each gate BITES: introduce a deliberate regression for each (perf, security, AND each of SC-1..6) and confirm it fails.

DO NOT: add new product behavior; redo the instrumentation (Phase 0 built it); do the docs (Phase 10). Calibrate budgets against Phase-0 medians + the target device/network (Q-18) so they don't flake; honor the doc-25 methodology (≥20 samples, p95/p99, no time budget from jsdom).

VALIDATE: bun run validate; perf:gate (new) = perf:render-budget + perf:query-count + perf:bundle-budget + perf:realtime-cost + perf:memory-leak + perf:tbt + perf:profile-peak-load(-large) + tightened perf:check-routes; the security prove:* set (prove:workshop-auth-boundary + prove:action-authz + prove:project-chart-buckets + extended prove:estimate-tabs-rls); the SC-1..6 static guardrail checks (doc 27); the wired orphan benchmarks.

EXIT: render-count budgets exist for tree/tabs/sidebar/charts (exact 0/1), the 4 original gates still green; perf:query-count, perf:bundle-budget, perf:realtime-cost, perf:memory-leak, perf:tbt, large-fixture peak-load, tightened route budgets all exist and FAIL on a seeded regression; the security prove:* set is wired and FAILS on a seeded authz/cross-tenant regression; SC-1..6 (doc 27) CI-wired (SC-1 + SC-6 now at full strictness post-Phase-2) and each FAILS on a seeded regression; orphan benchmarks wired with thresholds; perf:gate + the security set + SC-1..6 aggregate them and run in CI (or Q-13 resolved with an explicit CI plan).
```

---

## Prompt — Phase 10: Documentation, examples, and enforcement

```
Execute Phase 10 (Documentation, examples, enforcement). Detail file: NONE BY DESIGN — Phase 10 is docs-only; detail = this prompt + `05_PHASED_REFACTOR_PLAN.md` §Phase 10.
Resolves durability of all prior phases; closes A-29/D-006 enforcement; documents the canonical kernels (A-14, A-04, A-10).
Dependencies: all prior phases (documents their end-state) + Phase 9 (references the gates).

GOAL: document the canonical kernels (TreeIndex/ops, sheet decomposition, optimistic adapter, query-key factory, DTO/RPC discipline, perf-gate system) with copy-pasteable examples, and ensure every new gate is wired + referenced so the wins are durable.

DO:
1. Write kernel usage docs + a minimal RUNNABLE example per canonical kernel: TreeIndex+ops, the sheet hook map, createOptimisticMutation recipe, queryKeys factory + patchAndMarkStale recipe, DTO/RPC discipline, createRenderProbe + perf:gate how-to.
2. Add Storybook examples for the consolidated primitives (Phase 6).
3. Update DESIGN.md (link the new duplication lint rule), AGENTS.md/CLAUDE.md (point implementers at the kernels), .ai/10_state/decisions.md (record the accepted D-NN).
4. Confirm every new gate is documented + referenced from 15_VALIDATION_MATRIX.md; mark the roadmap (05) phases complete with before/after evidence linked.
5. Re-run perf:gate to confirm green end-state.

DO NOT: do any new refactor; add new gates (Phase 9 owns those).

VALIDATE: bun run validate; bun run storybook:validate; re-run perf:gate (new, Phase 9) to confirm green.

EXIT: each canonical kernel has usage docs + a runnable example; DESIGN.md/AGENTS.md/CLAUDE.md/decisions.md reference the kernels + gates; every new gate documented + referenced from 15_VALIDATION_MATRIX.md; perf:gate green; 05's phases marked complete with before/after evidence linked.
```

---

## Prompt — Track F: Next-16 / React-19 Feature-Adoption (Cache Components + React Compiler pilot)

```
Execute the Next-16 / React-19 Feature-Adoption Track (gated). Detail file: 26_NEXT16_CACHE_COMPONENTS_AND_COMPILER_PLAN.md.
This is a GATED ADOPTION TRACK, not one of the numbered phases. It is sequenced LATE on purpose.
Governed by D-021, D-022; risks RISK-23, RISK-24; open Q-36, Q-37.
Dependencies: Phases 1–3 (purity primitives + estimate-sheet decomposition / render isolation) AND Phase 7 (bundle / provider-topology cleanup) must be COMPLETE. Phase 0 baselines + Phase 9 gates anchor before/after. If any dependency is unmet, STOP and report.

BEFORE WRITING ANY CODE: read 26_NEXT16_CACHE_COMPONENTS_AND_COMPILER_PLAN.md, then 04_TARGET_ARCHITECTURE.md, then 15_VALIDATION_MATRIX.md (in addition to the shared-preamble reading list).

GOAL: implement ONLY the gated rollout per doc 26 — the C0→C4 Cache Components rollout and/or the React Compiler purity-audit-then-pilot. Multipliers on clean architecture, never substitutes for it.

DO:
1. Cache Components, in the documented order C0→C4 with the EDITOR LAST: C0 enablement scaffolding + measurement harness (no surfaces cached); C1→C3 progressively cache the lower-risk read surfaces (public/marketing, then list/homebase reads, then secondary authed reads); C4 the estimate editor / sheet LAST, only after C1–C3 are proven and the render-isolation gates still hold.
2. React Compiler: run the PURITY AUDIT FIRST (confirm the Phase 1–3 purity invariants hold for the pilot scope), THEN enable the Compiler for that scope as a SCOPED PILOT only — never repo-wide by default. Measure against the Phase-0/Phase-9 render baselines.
3. Keep BOTH cacheComponents and reactCompiler OFF by default. Do NOT enable either in production without passing its gate (D-021/D-022). Control both via a SINGLE config switch so the whole track is single-config-revert.
4. Cookies / headers() / any per-request private data stay OUTSIDE every cached scope — a cached scope must not read private per-request data.
5. Preserve the branch.tsx / row-table.tsx memo guards (A-08) — the Compiler must not be a license to remove them; verify they remain after any auto-memoization.

DO NOT: enable cacheComponents or reactCompiler in prod without the gates; cache any scope that reads cookies/headers/private per-request data (RISK-23); remove the branch.tsx/row-table.tsx memo guards; let the Compiler over-memoize or miscompile a hot path unverified (RISK-24); start any of this before Phases 1–3 + 7 are green.

VALIDATE: bun run validate; bun run build; bun run test:dom; bun run test:e2e (e2e smoke on the converted surfaces); tests/vitest/perf/* render profiles (no render regression vs Phase-0/Phase-9 baselines); the cache gates `lint:no-request-in-cache` and `prove:no-private-in-public-cache` (the no-stale-private-data check — cached scopes serve no per-request private data, read no cookies/headers — doc 26); record before/after evidence for each C-step and the Compiler pilot.

ROLLBACK: single-config-revert — revert the one config switch to disable cacheComponents/reactCompiler; each C-step and the Compiler pilot are independently revertible.

EXIT: C0→C4 implemented in order (editor last) or the Compiler pilot scoped behind its purity-audit gate; both flags OFF in prod by default and single-config-revert; cookies/headers stay outside cached scopes (`lint:no-request-in-cache` + `prove:no-private-in-public-cache` green); branch.tsx/row-table.tsx memo guards intact; render profiles + build + test:dom + e2e smoke green; D-021/D-022/Q-36/Q-37 resolved or recorded.
```

---

## Appendix — Prompt authoring checklist (for whoever maintains this file)

Each prompt above satisfies the master-prompt requirements:
- [x] Reads the plan pack first (names the phase detail file + `04_TARGET_ARCHITECTURE` + `15_VALIDATION_MATRIX`).
- [x] Implements ONLY that phase (explicit "DO NOT start the next phase").
- [x] Does not skip validation (lists the phase's exact validation commands).
- [x] Does not broaden scope (explicit non-goals / "DO NOT").
- [x] Records evidence (`file:line`, before/after metric; cites `A-NN`).
- [x] Updates the plan when reality differs (append to the phase file + log `D-NN`/`Q-NN`).
- [x] Self-contained and specific to the phase's candidate files (real paths from the audit/dossiers).
