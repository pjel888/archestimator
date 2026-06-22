# 16 — Risk Register

> Risk IDs `RISK-01…RISK-25`. Risk labels: Low / Medium / High / Critical. Evidence format: `path:line — observation`. Cross-references: `D-NN` (`17_DECISION_LOG.md`), `Q-NN` (`19_OPEN_QUESTIONS.md`). Grounded in `_research/` dossiers R1–R7 and the contract (`_SYNTHESIS.md`).

---

### RISK-01 — Estimate sheet behavior regression during decomposition
Risk: Breaking up the 1881-LOC exported component and severing the `editableRows` map-identity fan-out silently changes editing/totals/preview behavior.
Affected files: `src/components/workshop/EstimateSheetContent.tsx:1042-2925` (~1884-LOC component), `:1093` (`editableRows` `useState` map; resync effect `:1766-1783`), `:1252,1401,1405,1413,1429,1590` (fan-out memos/effects), `src/components/workshop/estimate-sheet/rows/editable-row-model.ts:162-183` (`computeNodeTotals`).
Why it matters: Highest blast radius unit in the repo (~17 responsibilities, ~40 state atoms). A subtle change to totals or cell editing corrupts customer estimates.
Likelihood: High
Impact: Critical
Mitigation: Per-row subscription instead of map-identity (track 2/3). Decompose incrementally behind unchanged public props. **Preserve every existing `memo` comparator** (`branch.tsx:111-156`, `row-table.tsx:86-116`) — the problem is compute, not row re-renders (contract §1). One responsibility extracted per PR.
Validation: Full 361 Vitest DOM suite green after each extraction; `tests/vitest/perf/` render-isolation gate; Phase-0 keystroke-compute baseline must not regress; diff `computeNodeTotals` output on a fixture tree before/after.
Owner decision needed? no

---

### RISK-02 — Tree DnD / reorder regression from kernel unification
Risk: Replacing ≥3 cascade engines + reorder planners with one headless `TreeIndex` changes drag/drop drop-target math, `sortOrder` persistence, or ancestor-keep filtering.
Affected files: `src/lib/estimates/estimate-tree-reorder.ts` (incl. `:181-220` content signature, `:222-251` `mergeEstimateTreeStructureWithCachedNodes`), `lib/component-library/library-folder-reorder.ts`, `EstimateSheetTree.tsx:300,301,411,418,440` (signature calls), `component-library-manager/LibraryFolderTree.tsx`.
Why it matters: Estimate `ESTIMATE_TREE_SORT_ORDER_STEP` and library folder sort have **distinct persistence rules** (R3 open Q) — a shared core can mis-order siblings or break drop indicators.
Likelihood: Medium
Impact: High
Mitigation: Keep distinct reorder *adapters* over a shared *index* core (D-003); migrate one tree family at a time; golden-file the reorder planner output. Confirm whether planners truly unify before committing (Q-08).
Validation: Reorder unit/DOM tests per tree family; Playwright DnD e2e; byte-compare persisted `sortOrder` before/after on a fixture.
Owner decision needed? no

---

### RISK-03 — Proposal export mismatch after signature/traversal changes
Risk: Replacing the full-tree proposal-preview DFS signature with a structural hash changes what counts as "changed," causing stale or mismatched proposal exports.
Affected files: `EstimateSheetContent.tsx:287-318` (`createProposalPreviewSignature`, 15-field DFS), `:1260-1263` (rebuild trigger), `lib/proposal-export/` (export traversal), `lib/component-library/estimate-templates.ts`.
Why it matters: Export is a customer deliverable; a missed-invalidation bug ships wrong numbers/structure to a client document.
Likelihood: Medium
Impact: High
Mitigation: Structural hash must cover the exact 15 fields the export reads (enumerate them first); keep the export model builder unchanged until the signature is proven equivalent. Wire the orphan `benchmark-proposal-workbook` with a correctness check (Q gap).
Validation: A single before/after workbook snapshot is INSUFFICIENT: it proves the export builder is stable for one tree state but NOT that the new `structuralHash` change-detection fires on exactly the edits the old DFS fired on (the real failure mode is a false-negative in staleness detection). Validation MUST be a FIELD-DIFFERENTIAL parity test whose input set is the EXPORT INPUT SET DERIVED FROM `build-proposal-export-model.ts` — NOT the legacy 13-field signature. The derived set is strictly WIDER than what `createProposalPreviewSignature` covers: it INCLUDES `row.discipline` (read by the export at `build-proposal-export-model.ts:130,144`) and the `ProposalExportSettings` inputs (`contingencyMode`, `contingencyRate`, `vatMode`, `vatRate`, `includeZeroRows`, `showSupplierInRemarks`, `audience`) — all currently MISSING from `createProposalPreviewSignature` (`EstimateSheetContent.tsx:296-313`). For each member of the derived export input set, mutate it and assert old-signature-changed ⟺ new-hash-changed, plus a negative control (mutate a non-export field, assert neither changes). The `discipline`/settings omission is a PRE-EXISTING LATENT BUG (A-41) the refactor fixes-as-found: the corrected signature/hash MUST cover these inputs even though the legacy signature does not. See doc 09 Step 7, doc 28, file 07 structuralHash parity test.
Owner decision needed? no
Cross-ref: A-41, doc 09 Step 7, doc 28.

---

### RISK-04 — Share snapshot / read-only tree mismatch
Risk: Converging `WorkshopTree`→`Tree` and changing share reconstruction alters the public `/share/[token]` rendering or the 500-row cap behavior.
Affected files: `share/ShareEstimateTreeView.tsx`, `lib/share/reconstruct-share-tree.ts:29` (500-row cap), `lib/publication/snapshot.ts`, `SharePageTabs.tsx:23` (static `CostDonutChart` import).
Why it matters: Public route — no auth fallback, external clients see it; a broken snapshot is externally visible and high-embarrassment.
Likelihood: Medium
Impact: High
Mitigation: Decide if 500-row cap is a hard product limit (Q-02) before deciding whether share must move to virtualized `Tree`. Keep snapshot reconstruction read-only and behavior-identical; make the share chart dynamic without changing render output.
Validation: Snapshot-compare rendered share tree for a fixture token; Playwright on `/share/[token]`; confirm chart still renders post-dynamic-import.
Owner decision needed? yes (Q-02: is 500-row cap a hard limit?)

---

### RISK-05 — RLS / security regression in the DB performance pass
Risk: Adding FK indexes, shipping `get_project_chart_buckets`, the homebase summary RPC, or any policy edit reintroduces a bare `auth.uid()` in a USING/CHECK clause or changes an access decision.
Affected files: `supabase/` migrations (planning only), `src/lib/repositories/project-charts-repository.ts:101-128` (chart RPC seam), `workspace-repository.ts:1126-1222` (homebase serial tail), prior remediations `…20260614162000_rls_initplan_auth_uid.sql`.
Why it matters: A wrong policy or SECURITY DEFINER RPC can leak cross-tenant data — the worst possible outcome.
Likelihood: Low
Impact: Critical
Mitigation: New RPCs as planning items with explicit RLS + `SECURITY DEFINER`/`search_path` review; no migration applied in this pack (contract §4); run advisor security scan + `prove:rls-initplan` after any future policy change; confirm no post-`20260614162000` bare `auth.uid()` regression (Q-12).
Validation: `bun run prove:rls-initplan`, `bun run prove:estimate-tabs-rls`, Supabase advisor security pass; cross-tenant access test for any new RPC.
Owner decision needed? yes (any new SECURITY DEFINER RPC)

---

### RISK-06 — Large/bundle regression instead of improvement
Risk: Import-graph-derived "ships into bundle X" claims are unverified (no analyzer run); a "fix" may not shrink the bundle, or `optimizePackageImports` additions may break a barrel import.
Affected files: `src/app/providers.tsx:30-46` + `realtime-auth-bridge.tsx:22-66` (authed providers on public routes), `next.config.ts:55` (`optimizePackageImports`), `CostBreakdownSection.tsx:5`, `SharePageTabs.tsx:23` (eager d3 charts), `package.json` (`d3` full dep).
Why it matters: Effort spent on unmeasured bundle claims is wasted; a bad `optimizePackageImports` entry can break tree-shaking or runtime.
Likelihood: Medium
Impact: Medium
Mitigation: **Run `ANALYZE=true bun run build` in Phase 0 (Q-09) before acting on any bundle claim.** Add `optimizePackageImports` entries one at a time with a before/after analyzer diff. Verify `react-complex-tree` is truly absent from the bundle before removing the dep (Q-10).
Validation: `ANALYZE=true bun run build` before/after; landing-chunk size diff; `bun run validate` + smoke of each affected route.
Owner decision needed? no

---

### RISK-07 — Optimistic rollback bugs from consolidating 13 flows → 1 adapter
Risk: Collapsing 5 distinct rollback mechanisms into one adapter loses a flow-specific guarantee (revision guard, patch-snapshot ordering, closure-restore), causing stuck/incorrect optimistic state.
Affected files: `use-estimate-row-mutations.ts:201-202,426-436` (operationId + promise-queue), `use-estimate-query.ts:13-15` (tree cache as mutable optimistic state + revision counters), the 22 `patchAndMarkStale` sites.
Why it matters: Optimistic UI errors corrupt displayed estimate state and erode trust; ordering bugs are intermittent and hard to catch in tests.
Likelihood: Medium
Impact: High
Mitigation: Adapter must support per-flow rollback strategy as a parameter, not a single hardcoded path; migrate flows one at a time keeping old behavior until parity proven; preserve revision-guarded restore semantics. Confirm whether the per-row promise-queue is still needed under the adapter (Q-07).
Validation: Per-flow optimistic + onError DOM tests (force-fail the mutation); concurrent-edit ordering test; `benchmark-estimate-cursor-broadcast` wired.
Owner decision needed? no

---

### RISK-08 — No-rollback flows surface as data loss under the new adapter
Risk: `useNotificationsQuery` and collaborator-role mutations have **NO onError rollback** today; folding them into a standard adapter that assumes rollback (or that stops their current eventual-consistency behavior) changes observable behavior.
Affected files: `useNotificationsQuery.ts:83-164` (no rollback), `use-project-collaboration-query.ts:45-63` (no rollback).
Why it matters: If the no-rollback is intentional (eventually-consistent), forcing rollback creates flicker; if it is a latent bug, leaving it un-migrated perpetuates it (Q-06).
Likelihood: Medium
Impact: Medium
Mitigation: Decide per-flow whether no-rollback is intentional (Q-06) **before** migrating; make rollback opt-in in the adapter so these flows keep current behavior unless the owner chooses to fix.
Validation: Force-fail notification + role mutations and assert current behavior is unchanged unless explicitly changed; record decision in `17_DECISION_LOG`.
Owner decision needed? yes (Q-06: intentional or latent bug?)

---

### RISK-09 — Route remount / focus / refresh bugs from provider topology + `router.refresh()` changes
Risk: Moving authed providers to `workshop/layout.tsx` or replacing `router.refresh()` (12 files) with scoped invalidation remounts subtrees, loses focus/scroll, or stops a needed fresh RSC payload.
Affected files: `src/app/providers.tsx:30-46`, root `layout.tsx:25`, `src/app/workshop/layout.tsx` (target), `ProjectEstimatesClient.tsx:215` (real `router.refresh()` call), 12 `router.refresh()` files.
Why it matters: A wrong invalidation either shows stale server data or triggers a jarring full-segment remount mid-edit.
Likelihood: Medium
Impact: Medium
Mitigation: Per-call-site classify `router.refresh()` as "needs fresh RSC" vs "cache invalidation" (R1 open Q, owned by R2/R5 knowledge); move providers without changing their mount contract for workshop routes; keep focus/scroll tests.
Validation: Per-route smoke (auth + landing); focus-retention DOM test on edit; verify no auth roundtrip fires on marketing pages post-move (`realtime-auth-bridge`).
Owner decision needed? no

---

### RISK-10 — Design-system drift / under-enforcement during primitive consolidation
Risk: Consolidating 6 forked primitive families changes pixels, and the only verifiable CI gate (`enforce-app-design-system.mjs`) has **zero reuse/duplication rules**, so new duplicates still pass silently.
Affected files: `scripts/enforce-app-design-system.mjs:148-237`, `LiveProjectCard.tsx:1-722` (722 LOC, un-memoized), `ui/bulk-action-toolbar.tsx:1-219` + `workshop/BulkActionToolbar.tsx:1-135` (dup), icon-button forks (`ui/icon-button.tsx`, `toolbar-icon-button.tsx`, `header-icon-toolbar.tsx`), `EstimateTabStrip` (654 LOC).
Why it matters: `DESIGN.md:426` calls a visible duplicate "a blocking design-system defect" yet nothing enforces it; consolidation without a lint rule will silently re-drift.
Likelihood: Medium
Impact: Medium
Mitigation: Add a duplication/reuse lint rule (D-006/Phase 6) as part of consolidation, not after; confirm whether `lint:design` is a no-op (Q-11) so the rule lands in the *enforcing* gate; decide intentional-vs-accidental divergence per family (Q re EstimateTabStrip) before refactoring.
Validation: Storybook visual review + `storybook:validate`; `lint:design-system`; the new duplication rule must fail on a seeded duplicate; pixel-diff consolidated components.
Owner decision needed? yes (bless-vs-refactor `EstimateTabStrip`, menu modules, `IconButton` target)

---

### RISK-11 — Test brittleness blocks or masks the refactor
Risk: 361 serial Vitest DOM tests are render/implementation-coupled; decomposition forces large test churn, and there is no render-count budget for tree/tabs/sidebar/charts so a compute regression can pass CI.
Affected files: `tests/vitest/perf/` (only 4 render-isolation gates — the template), `scripts/seed-performance-test-data.ts:116` (manifest-only seed), `scripts/check-route-transition-readiness.ts:108-112` (non-gating budgets), recent commit `8c3bbd77` (already refreshed sheet/group/estimate DOM assertions).
Why it matters: Either tests break en masse (slowing the refactor) or, worse, pass while perf silently regresses because budgets are loose/non-gating.
Likelihood: High
Impact: Medium
Mitigation: Phase 0 establishes render-count budgets (replicate `tests/vitest/perf/` template) and a real large-tree DB fixture before refactoring; prefer behavior assertions over DOM-shape coupling; tighten route-transition budgets from non-gating to gating in Phase 9.
Validation: `bun run test:dom`, `bun run perf:profile-peak-load`, new render-count budget gates; confirm CI actually runs them (Q-13).
Owner decision needed? no

---

### RISK-12 — Per-keystroke recompute fix is incomplete (double-compute at the tree↔sheet seam)
Risk: Fixing the sheet's `computeNodeTotals` keystroke recompute while the left `EstimateSheetTree` runs its **own** totals DFS over the same cache leaves half the cost in place.
Affected files: `EstimateSheetContent.tsx:1402-1406` (second totals map), `editable-row-model.ts:162-183`, `estimate-tree-data.ts` + `estimate-tree-reorder.ts:181-220` (full-tree signatures), `EstimateSheetTree.tsx` (its own DFS — unconfirmed).
Why it matters: The R3↔R4 seam (contract §5, Q-05) — if the tree double-computes, the headline "per-keystroke compute" metric won't move as expected.
Likelihood: Low (downgraded — see PRELIMINARY FINDING)
Impact: Medium
Mitigation: Measure first (Q-05) whether the left tree reads the same `estimateQueryKeys.tabTree` cache and runs its own totals DFS; share a single memoized `TreeIndex`/rollup across sheet and tree (track 3); coordinate the fix across both before touching `estimate-tree-data.ts`. **PRELIMINARY FINDING (AR1):** `EstimateSheetTree.tsx` has NO `computeNodeTotals` call and never reads `editableRows` (renders `node.total` from the tree-data model; hardcoded `₱0.00` on optimistic nodes at `EstimateSheetTree.tsx:154`). The per-keystroke double-compute may NOT be real; downgrade Likelihood to Low pending Phase-0 confirmation (see Q-05, D-013).
Validation: Phase-0 baseline that instruments *both* the sheet and the tree compute; assert single-pass after the fix.
Owner decision needed? no

---

### RISK-13 — Component-library unbounded fetch fix targets the wrong path
Risk: The `.select("*")` unbounded load on 8 tables may be dead in prod (Lite variant used instead); adding `.limit()`/column discipline to the wrong loader yields no win or breaks the live path.
Affected files: `src/lib/repositories/component-library-repository.ts:530-746` (full loader, `:1146`), `:1169` (Lite variant).
Why it matters: Severity of the [HIGH] finding depends entirely on which loader prod calls (Q-01).
Likelihood: Medium
Impact: Medium
Mitigation: Trace the caller to determine full-vs-Lite (Q-01) before applying `.limit()`/column discipline; apply discipline to whichever path is live; keep DTO shape stable.
Validation: Caller trace; query-count/N+1 budget on the live path; `bun run validate`.
Owner decision needed? yes (Q-01)

---

### RISK-14 — Phase ordering / coordination breakage
Risk: Pulling Phase 7/8 quick wins forward, or running tree (Phase 2) and sheet (Phase 3) in parallel, creates merge conflicts in shared files (`estimate-tree-data.ts`, `editable-row-model.ts`) and undermines the baseline-before-refactor discipline.
Affected files: shared seam files `estimate-tree-data.ts`, `estimate-tree-reorder.ts`, `editable-row-model.ts`, `EstimateSheetContent.tsx`, `EstimateSheetTree.tsx`.
Why it matters: Phases 2 and 3 share turf (contract overlaps R3↔R4); uncoordinated edits double-resolve the same DFS.
Likelihood: Medium
Impact: Medium
Mitigation: Keep the disciplined default order (D-001); quick wins only if isolated + baseline-gated (D-002); land Phase-1 primitives first so both 2 and 3 consume them; serialize edits to shared seam files.
Validation: `detect_changes({scope:"compare", base_ref:"main"})` before each commit to confirm scope; `bun run validate` at each phase boundary.
Owner decision needed? no

---

### RISK-15 — Large-DB perf fixture may be infeasible/expensive under RLS
Risk: Seeding a realistic, RLS-governed multi-tenant large-DB fixture for "improved vs Phase-0 baseline" measurements may be infeasible or too expensive to build, leaving downstream perf exit criteria unmeasurable.
Affected files: `scripts/seed-performance-test-data.ts:116` (manifest-only today).
Why it matters: Every "improved vs Phase-0 baseline" exit criterion in Phases 2/3/4/7/8 depends on `perf:seed-db-fixture` existing; seeding a realistic RLS-governed multi-tenant fixture (self-referential `estimate_nodes.parent_id` at 1000+ rows, FK ordering, policies) is unprototyped.
Likelihood: Medium
Impact: High
Mitigation: Phase-0 fallback (anonymized prod-shaped export, or scaled synthetic with a stated fidelity caveat).
Validation: Prototype the seeder early in Phase 0; if it can't be built cheaply, record the degraded measurement story.
Owner decision needed? yes

---

### RISK-16 — Phase 3 incremental derived state reintroduces full re-renders via lost OBJECT reference-identity (not the totals Map)
Risk: The reference-stability concern applies to OBJECT-valued derived surfaces — the per-row `editableRows` store, whose object identity the branch guard compares — NOT the number-valued totals Map. A refactor that rebuilds an object-valued derived map yields fresh per-row objects for untouched nodes, so `prev.editableRows[id] !== next.editableRows[id]` fires and full re-renders return.
Affected files: `EstimateSheetContent.tsx:521` (totals Map is `ReadonlyMap<string, number>`), `branch.tsx:147` (guard does `Object.is(prevTotal, nextTotal)` over NUMBERS → value-equality), `branch.tsx:101` (the REAL object-identity surface: `prev.editableRows[item.id] !== next.editableRows[item.id]`), `src/components/workshop/estimate-sheet/rows/editable-row-model.ts` (`computeNodeTotals`).
Why it matters: Because the branch guard compares totals by VALUE (`Object.is` over numbers, `branch.tsx:147`), rebuilding the totals Map with equal numbers does NOT break the guard — a plain recompute is value-stable and safe. The object-identity surface that CAN break is `editableRows[id]` (`branch.tsx:101`): if a refactor swaps untouched per-row objects for fresh ones, the memo guard fails and full re-renders return — and the existing perf gates (which count computes / assert byte-equal VALUES, not reference identity) would NOT catch it.
Likelihood: Medium
Impact: High
Mitigation: The per-row store (Phase 3 Step 4) already preserves per-row object identity, so untouched `editableRows[id]` references stay stable across a single-row edit. The structural-sharing helper (Phase-1 primitive) targets object-valued derived maps IF any are introduced; the totals Map needs only value-stability, which a plain recompute already gives. Confirm during Phase 1 measurement whether any object-valued derived map exists that needs structural sharing (see D-017, Q-25). Keep the render-isolation gate that asserts the memo guards still short-circuit, but it asserts `editableRows[id]` identity (`branch.tsx:101`), NOT totals-value identity.
Validation: The reference-stability gate (file 09) asserts `Object.is(prev.editableRows[untouchedId], next.editableRows[untouchedId])` after a single-row edit (object-identity surface), plus a value-equality assertion on the totals Map; do NOT assert reference identity on totals (it is value-typed).
Owner decision needed? no

---

### RISK-17 — Realtime inbound render / subscription cost is unbudgeted
Risk: Inbound realtime traffic — remote cursor broadcasts, presence heartbeat, and `postgres_changes` — re-renders the sheet/tree on every received event; only the OUTBOUND cursor broadcast is throttled and benchmarked, leaving the receive path unmeasured.
Affected files: `src/hooks/use-estimate-cursor-broadcast.ts:152,226,264`, `src/hooks/use-project-presence.ts:156-168`.
Why it matters: A collaborative session with several active peers can drive inbound event volume that re-renders the most expensive surfaces in the app, and no gate currently caps inbound render cost or channel count.
Likelihood: Medium
Impact: Medium
Mitigation: Per-route channel ceiling + an inbound-render budget (doc 23, `perf:realtime-cost`).
Validation: `perf:realtime-cost` (new).
Owner decision needed? no
Cross-ref: doc 23, RISK-18.

---

### RISK-18 — Client memory growth / subscription-timer-listener leak
Risk: Long-lived SPA surfaces accumulate leaked subscriptions, timers, and listeners when teardown is asymmetric with setup, growing the heap over a session.
Affected files: per-row `editable-rows-store.ts` `subscribeRow` symmetry (`04` §7.2), `use-estimate-cursor-broadcast.ts:264,297` (timers), `EstimateSheetContent.tsx` (event listeners, IntersectionObservers).
Why it matters: This is a long-lived SPA surface; an asymmetric unsubscribe (subscribe without a matching teardown) leaks per mount/unmount cycle and degrades a sustained editing session.
Likelihood: Medium
Impact: Medium-High
Mitigation: jsdom mount/unmount leak gate + heap ceiling (doc 25, `perf:memory-leak`).
Validation: `perf:memory-leak` (new).
Owner decision needed? no
Cross-ref: doc 25.

---

### RISK-19 — Workshop-layout RSC→client conversion drops the auth redirect
Risk: Converting `workshop/layout.tsx` to a client component to host `<WorkshopProviders>` (Phase 7 provider move) removes server-side `getCurrentUserContext()` + `redirect("/login")`, making workshop routes publicly reachable.
Affected files: `src/app/workshop/layout.tsx`, `src/app/providers.tsx:30-46`.
Why it matters: If an implementer makes `workshop/layout.tsx` a client component, the server-side auth check no longer runs → workshop routes become public, and `bun run validate` has no unauthenticated-route gate to catch it.
Likelihood: Medium
Impact: Critical
Mitigation: Keep the layout an RSC; mount providers as a child client boundary inside it; add a `prove:workshop-auth-boundary` e2e (doc 22).
Validation: `prove:workshop-auth-boundary` (new).
Owner decision needed? no
Cross-ref: doc 22, RISK-09.

---

### RISK-20 — New-RPC cross-tenant data leak
Risk: A new aggregate RPC whose WHERE clause relies only on child-table RLS (rather than an explicit workspace-membership join) can return another tenant's data on a guessed UUID.
Affected files: `get_project_chart_buckets`, `workspace_homebase_summary`, `estimate_activity_node_scope` (Phases 4/8).
Why it matters: A `security invoker` aggregate over project/workspace data that does not join through membership leaks cross-tenant on a guessed UUID — the worst possible outcome.
Likelihood: Low
Impact: Critical
Mitigation: `security invoker` + `set search_path = public` + WHERE clauses that join through membership; cross-tenant DENIAL proofs for every new RPC.
Validation: Extend `prove:project-chart-buckets` + `prove:estimate-tabs-rls` (doc 22).
Owner decision needed? yes (any SECURITY DEFINER needs sign-off)
Cross-ref: doc 22, RISK-05.

---

### RISK-21 — `ActionResult<T>` wrapping silently drops an interior authz check
Risk: Restructuring server actions to `ok()`/`err()` can move an authz check below an early happy-path return, removing app-layer authorization while type-check and DOM tests still pass.
Affected files: all wrapped server actions (`10` §2.3).
Why it matters: A relocated authz check type-checks and passes DOM tests; RLS still catches the write, but finer app-layer authz (the kind RLS does not enforce) is silently removed.
Likelihood: Medium
Impact: High
Mitigation: Per-action checklist (authz before mutation; on failure return `err FORBIDDEN`); a no-session test per action.
Validation: Extend `prove:estimate-tabs-rls` + a per-action FORBIDDEN test (doc 22).
Owner decision needed? no
Cross-ref: doc 22.

---

### RISK-22 — Concurrent multi-agent edits collide on the seam-file cluster
Risk: Multiple AI agents and humans edit the RISK-14 seam-file cluster concurrently with no branch/lock protocol, double-resolving the same DFS and producing merge conflicts.
Affected files: the RISK-14 cluster — `EstimateSheetContent.tsx`, `EstimateSheetTree.tsx`, `estimate-tree-data.ts`, `src/components/workshop/estimate-sheet/rows/editable-row-model.ts`, `use-estimate-query.ts`, `use-estimate-row-mutations.ts`, `estimate-tree-reorder.ts`.
Why it matters: This repo is edited concurrently by multiple AI agents and humans (this branch is mid-merge with 101 conflicts already resolved), and there is no branch/lock protocol to serialize edits to the shared seam.
Likelihood: High
Impact: High
Mitigation: Branch/PR model + seam-file lock + pre-edit `impact`/`detect_changes` (doc 24, doc 21).
Validation: `detect_changes` clean before commit.
Owner decision needed? no
Cross-ref: doc 24, doc 21, RISK-14.

---

### RISK-23 — Next.js 16 Cache Components stale private/auth data exposure
Risk: Putting `cookies()`/`headers()`/user-scoped reads inside a `use cache` scope can serve one tenant's data to another or stale private data when `cacheComponents` is enabled.
Affected files: `next.config.ts` (`cacheComponents`), workshop/share routes, any `use cache` scope.
Why it matters: A cached scope that closes over auth/user state can leak cross-tenant data or serve stale private data — the worst possible outcome for a multi-tenant app.
Likelihood: Medium
Impact: Critical
Mitigation: Keep `cookies()`/`headers()` OUTSIDE the cache and pass serializable args in; C0→C4 rollout (editor LAST); namespaced `cacheTag` + server-action invalidation; per-phase no-stale-private-data check.
Validation: cache-scope audit + cross-tenant check (doc 26).
Owner decision needed? yes (enabling `cacheComponents`)
Cross-ref: doc 26, D-021, Q-36, RISK-05.

---

### RISK-24 — React Compiler behavior change / bailout in hot components
Risk: Enabling the React Compiler before purity cleanup can change render behavior or silently bail out, and over-aggressive memo removal can break the load-bearing memo guards.
Affected files: hot client components (`EstimateSheetContent.tsx`, `EstimateSheetTree.tsx`, `branch.tsx`/`row-table.tsx` memo guards), `next.config.ts` (`reactCompiler`).
Why it matters: A compiler-driven bailout or removed memo guard reintroduces the per-keystroke full re-render the program is trying to eliminate.
Likelihood: Medium
Impact: High
Mitigation: Enable only after the §7.1 purity audit; preserve manual memo per §7.2; branch pilot with build+DOM+e2e+render profiles; single-config-revert.
Validation: render-isolation gates stay green (doc 26).
Owner decision needed? no
Cross-ref: doc 26, D-022, Q-37, RISK-01.

---

### RISK-25 — Scoped-delta `affectedNodeIds` incompleteness ⇒ silently stale customer totals
Risk: Phase 4 replaces the full-tree refetch with a scoped recompute over the server's `affectedNodeIds` hint; if that hint is wrong or incomplete, the client recomputes the wrong subtree and a customer sees stale totals.
Affected files: `10_PHASE_4_DATA_AND_CACHE_PLAN.md §5.1` (per-op scoped-delta DTOs), `src/components/workshop/estimate-sheet/rows/editable-row-model.ts` (totals recompute).
Why it matters: A too-narrow `affectedNodeIds` makes the client recompute a subtree that excludes some ancestor/dependent whose total actually changed, so the displayed (and exportable) customer totals go stale silently. Critically, the byte-equal totals gate (doc 09 gate #3) is SELF-CONSISTENT within the sheet's own derivation — it asserts the sheet's recompute matches the sheet's own model, so it would NOT catch a too-narrow scope hint that omits a node from BOTH sides.
Likelihood: Medium
Impact: High
Mitigation: A totals-correctness gate asserting recompute-from-`affectedNodeIds` == full-tree recompute over the post-mutation cache (a DIFFERENT oracle than the self-consistent byte-equal gate); keep the full refetch on conflict/structural ops where scope derivation is unreliable.
Validation: the new Phase-4 correctness gate (doc 15, doc 28).
Owner decision needed? no
Cross-ref: doc 10 §5.1, doc 28, RISK-01.
