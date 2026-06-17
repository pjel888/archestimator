# 19 — Open Questions

> Question IDs `Q-01…Q-37`, grouped by owner. Seeded from contract §5 and the "Open questions" sections of dossiers R1–R7. Cross-references: `RISK-NN` (`16_RISK_REGISTER.md`), `D-NN` (`17_DECISION_LOG.md`). Each question notes who resolves it and how.

---

## 2026-06-17 answer pass

Scope: repo-local evidence plus read-only parallel review. No provider state was mutated, no Supabase/Vercel production proof was claimed, and unresolved owner/provider items stay as explicit gates. Status meanings: **Close** = enough to execute, **Decision** = product/eng policy accepted as the working default, **Gate** = must be measured or provider-verified before claiming closure, **Defer** = intentionally outside the current refactor slice.

| ID | Status | Answer / working default | Evidence / next gate |
|---|---|---|---|
| Q-01 | Close | The live production loader target is `getCurrentWorkspaceComponentRowsLibrary`; full/lite library loaders are secondary action/editor paths. Apply `.limit()`/column trimming to the live rows loader first. | Doc 21 already names this path; sheet lazy library load uses the lite query only when the sidebar/palette is open (`EstimateSheetContent.tsx:1181-1193`). |
| Q-02 | Decision | Treat the share-tree 500-row cap as a hard beta product limit. Do not force share onto the virtualized tree kernel unless Philip explicitly changes the share-scaling requirement. | Existing safe default stands. |
| Q-03 | Decision | Bless `EstimateTabStrip` and the menu-module divergence for now. Add duplication lint, keep `dropdown-popup` as shared core, and only remove/merge clearly dead `IconButton` surfaces later. | `lint:design` is real; broad primitive convergence remains Phase 6, not a Phase 0 blocker. |
| Q-04 | Close | Do not retire `areaTree` yet. Both `tabTree` and legacy `areaTree` remain active compatibility paths, and mutation code still branches on `estimateTabId ? tabTree : areaTree`. | `use-estimate-query.ts:10-15`, `use-estimate-row-mutations.ts:201-204`. |
| Q-05 | Close with Phase-0 check | The suspected left-tree double totals DFS is not present in current code. `EstimateSheetTree` renders `node.total` and does not read `editableRows` or call `computeNodeTotals`; only the sheet content computes the editable totals maps. | `EstimateSheetTree.tsx:154`, `EstimateSheetContent.tsx:1401-1406`. Keep the Phase-0 render/compute count as confirmation. |
| Q-06 | Decision | Keep no-rollback behavior for notifications/collaborator role flows unless the owner explicitly blesses rollback semantics. Adapter migration should preserve no-rollback as an opt-in strategy. | Existing safe default stands. |
| Q-07 | Gate | The per-row `operationId` and promise queue are still active and should stay until the optimistic adapter proves equivalent ordering/stale-response suppression under rapid edits. | `use-estimate-row-mutations.ts:201-202,426-436`. |
| Q-08 | Decision | Use one shared `TreeIndex`/ops core with distinct reorder adapters. Do not force estimate-tree and library-folder reorder persistence into one planner. | D-003 already records this split; differing sort-order rules remain real. |
| Q-08b | Decision | Prefer per-row subscriptions/atoms for `editableRows`, not moving drafts into the TanStack tree cache. The tree cache should stay focused on server tree structure plus optimistic structural updates. | D-009; current hot local map at `EstimateSheetContent.tsx:1093`. |
| Q-08c | Gate | Incremental totals are allowed only if they preserve both full-tree and filtered/grouped `displayedSheetNode` behavior. The helper must support subtree inputs and unchanged-node identity/value reuse. | Current full/subtree calls at `EstimateSheetContent.tsx:1401-1406`; implementation is full traversal in `editable-row-model.ts:162-183`. |
| Q-08d | Gate | Do not remove `EstimateTreeNode.kind` yet. It is still present in types and tree/template/share/chart paths, so removal needs a caller sweep and compatibility migration. | `src/lib/estimates/types.ts:141-148`; read-only QA found additional `kind` references in tree data/hierarchy/action paths. |
| Q-08e | Gate | Do not blindly merge `bulkSelectedRowIds` with Zustand selection. A scoped row-selection store is acceptable only if it preserves visible-row pruning and does not conflate row bulk selection with node/sidebar selection. | Local state/pruning lives in `EstimateSheetContent.tsx:1099,1345-1391`. |
| Q-08f | Gate | No blanket `router.refresh()` replacement. Keep refresh where it syncs RSC chrome/metadata/template canonical state; replace local table/list/library refreshes only after a per-callsite ownership matrix proves equivalent invalidation. | Calls remain in project list/table/client/template/editor paths; classification is behavior-sensitive. |
| Q-09 | Gate | Bundle confirmation is not complete. Analyzer support exists, but `ANALYZE=true bun run build` still needs to be run and inspected for landing/supabase/realtime/rough/lenis/neat leakage. | `@next/bundle-analyzer` exists; no dedicated CI analyzer gate yet. |
| Q-10 | Gate | `react-complex-tree` is not proven absent from runtime. JS value imports look absent outside tests, but workshop layout still imports its CSS, so deletion requires analyzer proof plus CSS/type replacement. | `package.json:70`, `src/app/workshop/layout.tsx:13-15`, `src/lib/component-library/library-folder-reorder.ts:1`. |
| Q-11 | Close | `lint:design` is enforcing, not a no-op. The remaining work is adding the duplication/reuse rule, not proving the engine exists. | `.github/workflows/ci.yml:25-26`, `package.json:48`. |
| Q-12 | Gate | Still provider-verified, not locally closed. Run `bun run prove:rls-initplan` and Supabase Advisor/policy scan before claiming all post-`...162000` policies use `(select auth.uid())`. | Supabase skill security guidance reinforces RLS proof; doc 14 leaves this as a verification item. |
| Q-13 | Close | CI already runs more than `bun run validate`: build, `lint:design`, Playwright install, `test:e2e`, and `test:e2e:perf`. It does not run Storybook, analyzer, or package-level perf scripts. | `.github/workflows/ci.yml:21-31`. |
| Q-13b | Close for current reality | Existing route/perf gates are smoke/loose gates, not production-grade performance enforcement. `perf:seed-fixture` is manifest-only and does not seed Supabase. | `scripts/seed-performance-test-data.ts:40-43,115-117`; `scripts/check-route-transition-readiness.ts` thresholds are readiness checks. |
| Q-13c | Close | The project-total event path is present and measurable. It dispatches from sheet total changes and listens in `ProjectTotalHeader`; cost profiling can be added, but presence is no longer open. | `EstimateSheetContent.tsx:1740-1742`, `ProjectTotalHeader.tsx:218-225`. |
| Q-14 | Decision | Do not drop the 13 `unused_index` entries now. Treat them as early-env false-positive candidates until longer `pg_stat_user_indexes` history, constraint checks, and post-index-change Advisor output agree. | Doc 14 explicitly defers unused-index drops. |
| Q-15 | Gate | Rollup sharing should be correctness-first, not assumed hot-path performance. Sheet preview/client paths may matter, but export/chart/snapshot impact needs runtime trace/RUM/perf marks before optimizing. | Client preview path exists around `EstimateSheetContent.tsx:1583`; provider/runtime measurement is still missing. |
| Q-16 | Close | `source_snapshot` and `metadata` are currently needed by row hydration/model shaping broadly enough that they cannot be dropped wholesale. Future trimming should split heavy blobs into detail-only fields only after a render/reconcile/export audit. | `workspace-repository.ts:1734,1830-1842`. |
| Q-17 | Gate | Double-fetch overlap exists between RSC/server actions and TanStack client hooks, but `cache()` is per-request while TanStack persists client-side. Phase 4 should inventory and dedupe flow-by-flow rather than delete one cache layer globally. | `src/lib/estimates/actions.ts`, `use-estimate-query.ts`, estimate page/client split. |
| Q-18 | Owner gate | No canonical beta target device/network profile is finalized. Use the existing no-throttle/Fast3G/Slow3G presets as non-regression baselines until Philip chooses the binding profile. | `scripts/measure-route-transitions.ts` presets; Phase 0 still asks for target binding. |
| Q-19 | Gate | Client imports of server-action modules prove usage, not bundle leakage. Analyzer output is required before moving code or declaring server-only weight in client bundles. | `EstimateSheetContent.tsx:1072,1079`; component-library actions import boundary. |
| Q-20 | Defer | Keep proposal workbook generation thresholds in Phase 9 unless workbook work becomes a current user-facing deliverable. | Deferrable item; no current blocker. |
| Q-21 | Defer | Tighten existing route budgets if the route matrix stays small; split a separate warm-navigation budget only if Phase 0 shows distinct cold/warm regressions. | Deferrable item; no current blocker. |
| Q-22 | Decision | Defer FK-index work for audit/AI-heavy tables unless cascade-delete latency or Advisor output shows a hot-path issue. Keep the Phase 8 focus on live beta paths. | Doc 14 and execution prompts defer these indexes. |
| Q-23 | Defer / yes later | A route skeleton contract is useful for workshop/library/project routes, but it belongs in Phase 6 UI convergence and should not block data/perf foundation work. | Deferrable item. |
| Q-24 | Gate | A realistic large-DB/RLS fixture does not exist yet. Current seeding is manifest-only; any claim of large-dataset improvement needs a real DB-backed fixture or an explicit owner downgrade of exit criteria. | `scripts/seed-performance-test-data.ts:40-43,115-117`; Phase 0 fixture plan remains open. |
| Q-25 | Close | No Immer/structural-sharing helper is needed for totals. Totals are `Map<string, number>`, so numeric equality/value reuse is sufficient; object-valued map concerns move to Q-33. | `editable-row-model.ts:162-183`; D-017 decision context. |
| Q-26 | Gate | Repo defaults leave tree/EMC/estimate-row virtualization ON when env vars are unset or true. Production values are not proven from repo evidence and must be checked in deployment config. | `.env.example:54-56`, `virtualization-flags.ts:10-13`. |
| Q-27 | Alias / Defer | Q-27 duplicates the menu-collapse slice of Q-03. Keep it as a Q-03 alias, do not run a separate primitive-collapse effort now. | QA duplicate finding; Q-03 decision covers it. |
| Q-28 | Owner + provider gate | Do not add `@vercel/speed-insights` under current tests/telemetry decision. Current lock is provider-dashboard/export-only Speed Insights with no package change; custom `/api/vitals` remains the alternative if owner accepts first-party storage/PII work. | `vercel-web-analytics-integration.test.ts` forbids the package; doc 25 proposes `/api/vitals`; reconcile by keeping the package out until owner/provider proof changes. |
| Q-29 | Gate | Realtime provisional ceilings are usable but not ratified: normal surfaces should stay ≤2 websocket channels, hard upper ≤3, cursor should cause 0 sheet/row renders, presence ≤1 presence-surface render and 0 sheet/row renders. | Doc 23 §1.3; Phase 0 `perf:realtime-cost` still needed. |
| Q-30 | Gate | Canonicalize Q-30 to payload-size ceilings, not memory. Payload budgets are defined provisionally in doc 23; memory/leak needs a separate numeric ceiling before it can be enforced. | Doc 23 §3.2 defines payload ceilings; QA found ID drift with the current memory wording. |
| Q-31 | Gate | Query-count round-trip ceilings are defined provisionally and must be ratified by runtime counts before becoming hard CI gates. | Doc 23 §2.1. |
| Q-32 | Gate | Do not add `@tanstack/react-table`, `@tanstack/react-virtual`, or Radix to `optimizePackageImports` without measured module-init/TBT evidence. Only `@phosphor-icons/react` is configured today. | `next.config.ts:54-55`. |
| Q-33 | Close with audit note | No additional object-valued hot-path derived map is evidenced beyond `editableRows`. Keep Q-33 as the audit bucket if new object maps appear during sheet decomposition. | `EstimateSheetContent.tsx:1093-1105`; totals map is numeric. |

### Canonical mapping corrections from the answer pass

- Q-27 is an alias of Q-03.
- Q-25 is closed; remaining object-valued sharing work belongs to Q-33.
- Q-30 should refer to payload-size ceilings from doc 23. Memory/leak should receive a separate ID or be tracked in doc 25 with a numeric heap/listener/timer ceiling.
- Q-28 must not default to adding `@vercel/speed-insights` while `tests/vitest/vercel-web-analytics-integration.test.ts` locks the "no package change" telemetry decision.

## Owner / product decisions

### Q-01 — Full vs Lite component-library loader in prod
Does production call `getCurrentWorkspaceComponentLibrary` (full, `.select("*")` × 8 tables, unbounded, `component-library-repository.ts:530-746` / `:1146`) or `getCurrentWorkspaceComponentLibraryLite` (`:1169`)?
Decides severity of the [HIGH] unbounded-fetch finding and whether the `.limit()`/column fix targets the live path. → owner + eng caller-trace. (RISK-13; contract §5.)
**Owner:** Eng lead.
**Resolve-by:** before Phase 4 repository `.select` trimming.
**Safe default if unresolved:** audit the live `getCurrentWorkspaceComponentRowsLibrary` loader (§V2-FACTS confirms it is the live path; apply the `.limit()`/column fix there). See doc 24 owner-decision table.

### Q-02 — Is the share-tree 500-row cap a hard product limit?
`reconstruct-share-tree.ts:29` caps at 500 rows. If hard, moving share onto the virtualized `Tree` kernel is optional; if it must scale, virtualization + kernel become mandatory there too.
→ owner/product. (RISK-04; R3.)
**Owner:** Product owner / Philip.
**Resolve-by:** before Phase 2 share-tree kernel migration.
**Safe default if unresolved:** keep the 500-row cap with a visible truncation message; do not commit to scaling share onto the virtualized kernel. See doc 24 owner-decision table.

### Q-03 — Bless vs refactor the forked primitives
`EstimateTabStrip` (654 LOC, ignores `tab-strip.tsx`) — intentional (DnD + horizontal scroll + orange add-affordance) or accidental? Should the 5 menu modules collapse, or is `dropdown-popup` shared-core the end-state? Is `IconButton` (ui) deprecated in favor of `ToolbarIconButton`, or should they merge into `Button variant="icon"`?
Determines migration targets for Phase 6. → owner + design. (RISK-10; R6.)
**Owner:** Product owner / Philip (design intent) + Eng lead (merge targets).
**Resolve-by:** before Phase 6 primitive convergence.
**Safe default if unresolved:** treat the forks as intentional — keep `EstimateTabStrip` and the 5 menu modules as-is; defer any primitive merge rather than collapse blindly. See doc 24 owner-decision table.

## Engineering decisions

### Q-04 — Can the `tabTree`/`areaTree` legacy split be retired?
`areaTree` is flagged legacy (`use-estimate-query.ts:14`) and the `estimateTabId ? tabTree : areaTree` branch is replicated ~14×. Can it be fully retired so the query-key factory folds the branch, or is `areaTree` still load-bearing for any non-tab estimate?
→ eng. (D-007; R2.)

### Q-05 — Does the left `EstimateSheetTree` double the per-keystroke totals compute?
Does the left tree read the SAME `estimateQueryKeys.tabTree` cache and run its own totals DFS, doubling compute vs the sheet (`EstimateSheetContent.tsx:1402-1406`)? The R3↔R4 seam.
**PRELIMINARY FINDING (AR1, file:line verified):** `src/components/workshop/EstimateSheetTree.tsx` contains NO `computeNodeTotals` call and never reads `editableRows`; it renders `node.total` straight off the tree-data model and shows a hardcoded `₱0.00` on optimistic nodes (`EstimateSheetTree.tsx:154`). This suggests the per-keystroke double-compute (RISK-12) is likely NOT real and the Phase 2→3 hard-ordering edge may be looser than assumed. Phase 0 must confirm before relying on D-013.
→ eng + measurement (needs Phase-0 confirmation). (RISK-12, D-012; contract §5, R4.)

### Q-06 — Notification + collaborator-role no-rollback: intentional or latent bug?
`useNotificationsQuery.ts:83-164` and `use-project-collaboration-query.ts:45-63` have no onError rollback. Intentional eventual-consistency, or a latent bug to fix during adapter migration?
→ eng + owner. (RISK-08, D-005; R2.)
**Owner:** Product owner / Philip (eventual-consistency intent) + Eng lead.
**Resolve-by:** before Phase 5 adapter migration of these flows.
**Safe default if unresolved:** keep no-rollback, opt-in only — do not retrofit rollback onto notifications/collaborator-role flows under the adapter unless explicitly blessed. See doc 24 owner-decision table.

### Q-07 — Is the per-row `operationId` + promise-queue still needed under the adapter?
`use-estimate-row-mutations.ts:201-202,426-436` — does a standardized optimistic adapter that handles ordering make the per-row promise-queue redundant?
→ eng. (RISK-07, D-005; R2.)

### Q-08 — Can the estimate and library reorder planners unify?
Distinct `sortOrder` persistence rules (`ESTIMATE_TREE_SORT_ORDER_STEP` vs library folder sort) — can both unify onto one core, or do they force separate adapters over a shared `TreeIndex`?
→ eng. (RISK-02, D-003; R3.)

### Q-08b — Should `editableRows` move into the tree cache or become per-row atoms?
To kill the fan-out (`EstimateSheetContent.tsx:1093/1401`), does the map move into the TanStack tree cache (single source, interacts with R3 tree-as-cache) or become per-row atoms?
→ eng. (D-009; R2.)

### Q-08c — Can `computeNodeTotals` be made incremental safely?
Given the search/facet/group `displayedSheetNode` path computes a SECOND totals map (`:1402-1406`), can `computeNodeTotals` (`editable-row-model.ts:162-183`) be made incremental without breaking either path?
→ eng. (R4.)

### Q-08d — Remove vestigial `EstimateTreeNode.kind`?
`kind` is already vestigial (`estimate-tree.ts`, `tree-hierarchy.ts:18-25`). Removing it would simplify several traversals — safe to drop?
→ eng. (R3.)

### Q-08e — Can local `bulkSelectedRowIds` merge with the Zustand selection stores?
Can `bulkSelectedRowIds` (local Set, `EstimateSheetContent.tsx:1099`) and `estimate-ui-store`/`use-estimate-workspace-state` selection merge without regressions?
→ eng. (contract §5.)

### Q-08f — Per-call-site classification of `router.refresh()`
Across the 11 files (real call `ProjectEstimatesClient.tsx:215`), which calls need a fresh RSC payload vs which could be a scoped cache invalidation? Requires per-feature behavioral knowledge.
→ eng (R2/R5 knowledge). (RISK-09; R1.)

### Q-35 — Add an Escape handler to the unified `Tree` kernel for DnD-cancel a11y?
Doc 20 §3.1 found `ui/tree.tsx` has roving focus, arrow-key navigation, and ARIA wiring but NO Escape handler — needed to cancel an in-progress drag-and-drop (and to clear selection). Should an Escape handler be added to the unified `Tree` during Phase 2 convergence?
→ eng + design. (doc 20 §3.1; RISK-02.)
**Owner:** Eng lead + design.
**Resolve-by:** Phase 2.
**Safe default if unresolved:** add Escape-to-cancel-DnD / clear-selection to the kernel `Tree`.

### Q-25 — Totals-Map reference stability
Phase 3's incremental totals must keep `nodeTotals.get(id)` reference-equal for untouched nodes to preserve the load-bearing memo guards, but the repo has NO immer/immutable.js. Do we add a structural-sharing helper as a Phase-1 primitive, or hand-roll copy-forward-by-reference?
→ eng. (RISK-16; file 07, file 09 Step 5.)

### Q-32 — Do `optimizePackageImports` additions change module-init time?
Do the proposed `optimizePackageImports` additions (tanstack table/virtual, radix context-menu) change module-init / execution time, not just shipped kb?
**Resolve-by:** Phase 7.
**Safe default if unresolved:** measure execution/init time before and after each addition; revert any addition that regresses init time even if it lowers kb. (doc 25; RISK-06.)

### Q-33 — Any other OBJECT-valued derived map on the sheet hot path?
Besides `editableRows`, does any OBJECT-valued derived map exist on the sheet hot path that would need structural sharing to preserve reference equality?
**Resolve-by:** Phase 1.
**Safe default if unresolved:** assume no — the totals Map is number-valued, so value-equality suffices and no structural-sharing primitive is needed for it. (RISK-16; D-017.)

### Q-37 — When to enable `reactCompiler: true`?
Enabling the React Compiler before the §7.1 purity audit can change render behavior or silently bail out on the hot components, and removing manual memo can break the load-bearing guards.
→ eng + measurement.
**Owner:** Eng lead.
**Resolve-by:** after the §7.1 purity audit passes on hot components.
**Safe default if unresolved:** keep `reactCompiler` OFF until the §7.1 purity audit passes on the hot components; pilot in a branch with render profiles before adopting. (doc 26; D-022; RISK-24.)

## Measurement gaps

### Q-28 — RUM sink choice + field-vitals PII/consent
Install `@vercel/speed-insights` (root layout) vs stand up a `/api/vitals` endpoint fed by route `WebVitalsProbe`? Plus: how to handle PII/consent for field Web Vitals. `@vercel/speed-insights` is NOT installed today (only `@vercel/analytics@2`).
**Owner:** Eng lead.
**Resolve-by:** Phase 0.
**Safe default if unresolved:** no package change — rely on the Vercel provider-dashboard Speed Insights export; stand up `/api/vitals` ONLY if the owner accepts the first-party PII/consent work. Do NOT install `@vercel/speed-insights`: `tests/vitest/vercel-web-analytics-integration.test.ts` forbids the package and locks the "no package change" telemetry decision. (D-016; doc 25.)

### Q-29 — Realtime per-route channel ceiling + inbound-render budget
What is the per-route channel-count ceiling value, and the inbound-render budget numbers, for realtime presence/cursor traffic?
**Resolve-by:** Phase 0 (ratify after baseline).
**Safe default if unresolved:** assert ≤1 sheet render on presence change, 0 renders on remote-cursor move. (RISK-17; doc 23.)

### Q-30 — Per-route payload-size ceilings (max rows + serialized bytes)
What per-route payload-size ceilings (maximum row count and maximum serialized byte size) should each route's data fetch be held to? Canonicalized to payload-size, not memory (doc 23 §3.2 defines the payload budgets).
**Resolve-by:** Phase 0.
**Safe default if unresolved:** treat the Phase-0-measured payload baseline (rows + serialized bytes per route) as the ceiling — no regression allowed. (doc 23 §3.2.)

### Q-31 — Provisional per-route query-count / round-trip ceilings
Provisional query-count / round-trip ceilings per route (homebase, sheet, charts), to ratify in Phase 0 after baseline.
**Owner:** Eng lead.
**Resolve-by:** Phase 0 (ratify after baseline).
**Safe default if unresolved:** treat Phase-0-measured baseline counts as the ceilings (no regression allowed). (doc 23.)

### Q-34 — Client memory / leak ceiling (heap-growth + listener/timer/subscription net-zero)
What heap-growth ceiling should a scripted edit session be held to, and what is the listener/timer/subscription budget? (Memory content displaced from Q-30 when Q-30 was canonicalized to payload-size.)
**Resolve-by:** Phase 0.
**Safe default if unresolved:** no net heap growth and net-zero listeners/timers/subscriptions after unmount. (RISK-18; doc 25.)

### Q-09 — Run `ANALYZE=true bun run build` to confirm bundle claims
All "ships into bundle X" claims are import-graph-derived, not analyzer output. Confirm in Phase 0: (a) landing chunk really contains supabase/realtime via providers, (b) rough-notation/roughjs/lenis don't leak past landing, (c) `@firecms/neat`→three lazy-chunk real size.
→ measurement (Phase 0). (RISK-06, D-008; contract §5, R1.)

### Q-10 — Confirm `react-complex-tree` is absent from the runtime bundle
Only a `type`-only import was found (`library-folder-reorder.ts:1`). Verify with analyzer + a broader value-import sweep before removing the ~2.7M dep.
→ measurement + eng. (RISK-06, D-004; R1.)

### Q-11 — Is `lint:design` actually enforcing anything, or a no-op loader?
**ANSWERED — `lint:design` enforces (engine present); the residual gap is that it has NO reuse/duplication rule (addressed in Phase 6 / file 12).** `.agents/skills/impeccable/scripts/detect.mjs` resolves a real engine at `.agents/skills/impeccable/scripts/detector/detect-antipatterns.mjs`, so the gate IS verifiable. The new duplication rule still needs to be added there.
→ eng. (RISK-10, D-006; contract §1, R6.)

### Q-12 — Has any policy after `…20260614162000` reintroduced a bare `auth.uid()`?
Run `bun run prove:rls-initplan` + advisor security scan to confirm no policy added since the last remediation reintroduced a bare `auth.uid()` in a USING/CHECK clause.
→ measurement + eng. (RISK-05; R5.)

### Q-13 — Does CI run anything beyond `bun run validate`?
No `.github/` inspected (read-only scope). Does CI run `test:e2e`, `perf:*`, `storybook:validate`, or `ANALYZE` builds? Decides whether Phase-9 gates need new CI wiring.
→ measurement + eng. (RISK-11; contract §5, R7.)

### Q-13b — Are the route-transition budgets/seed real gates?
Route-transition budgets are non-gating (15s/10s/30s medians, overlay cap 1.0, `check-route-transition-readiness.ts:108-112`). The seed is manifest-only (`seed-performance-test-data.ts:116`). Is there an "approved local-only DB seeding step" elsewhere, or no real seeder?
→ measurement. (RISK-11; R7.)

### Q-13c — Is `dispatchProjectTotalChange` a measurable cost?
DOM CustomEvent on every `projectTotal` change (`EstimateSheetContent.tsx:1740-1742`) — measurable, and who listens? (`ProjectTotalHeader`.)
→ measurement. (R4.)

### Q-24 — Large-DB perf fixture feasibility
Can a realistic RLS-governed multi-tenant fixture (1000+ row sheet, deep `estimate_nodes.parent_id` self-referential tree, 100+ projects) actually be seeded cheaply via the proposed `perf:seed-db-fixture`? The current seeder is manifest-only (`scripts/seed-performance-test-data.ts:116`). If infeasible, every "improved vs Phase-0 baseline" exit criterion in Phases 2/3/4/7/8 becomes unverifiable. Owner/eng decision + Phase-0 fallback needed.
→ measurement + owner/eng. (RISK-15.)
**Owner:** Eng lead.
**Resolve-by:** Phase 0 (gates every "improved vs baseline" exit criterion in Phases 2/3/4/7/8).
**Safe default if unresolved:** if a cheap RLS-governed fixture is infeasible, fall back to count-based jsdom assertions plus hand-curated small fixtures, and downgrade the affected exit criteria from "improved vs baseline" to "no regression in measured counts." See doc 24 owner-decision table.

## Database / provider questions

### Q-14 — Are the 13 `unused_index` entries genuinely dead?
Or just untouched on a young/low-traffic DB? Need a longer `pg_stat_user_indexes` window before dropping any.
→ DB + measurement. (R5.)

### Q-15 — Do export/chart/snapshot rollups run client-side often enough to matter?
A shared memoized `rollup` only pays off on hot paths. Are these mostly server/one-shot, or client-hot?
→ DB/eng + measurement. (R3.)

### Q-16 — Does the sheet UI consume `source_snapshot` + `metadata` for all rows?
For `ESTIMATE_TREE_ROW_ITEM_COLUMNS` (`:1734`), are these heavy columns needed for all rows or only linked rows? Determines `.select` trimming.
→ DB + eng. (R5.)

### Q-17 — Which server reads are also cached client-side (double-fetch)?
Where do `cache()`-wrapped server reads vs TanStack query keys overlap/double-fetch?
→ DB + eng. (R5.)

### Q-18 — Real target device/network profile for binding budgets?
Current presets stop at Slow 3G (`measure-route-transitions.ts:33-37`). What device/network profile should the gating budgets target?
→ owner + measurement. (R7.)

### Q-19 — Are the `EstimateSheetContent` server actions pulling server-only code into the client graph?
Do `loadProjectComponentLibraryLite` / `fetchEstimateSheetVersionControl` (and the client-bundled `build-proposal-export-model`) drag server-only weight into the client graph? Needs the analyzer.
→ measurement + eng. (R1.)

### Q-36 — When to enable `cacheComponents: true`?
Enabling Next.js 16 Cache Components requires proving no cached scope closes over `cookies()`/`headers()`/user-scoped reads (cross-tenant/stale-private-data risk), and which route tiers actually pay off.
→ owner + measurement.
**Owner:** Product owner / Philip + Eng lead.
**Resolve-by:** late (after Phases 1–3 + 7).
**Safe default if unresolved:** keep `cacheComponents` OFF; roll out C0 (marketing) first only, behind measurement; the editor is never cached except at query level. (doc 26; D-021; RISK-23.)

## Deferrable

### Q-20 — Wire the orphan benchmark scripts?
`benchmark-proposal-workbook`, `benchmark-estimate-cursor-broadcast`, `benchmark-shared-link-activity`, `build-performance-query-inventory` have no thresholds and aren't in `package.json`. Wire proposal-workbook + cursor-broadcast with thresholds (low cost) — when?
→ eng (Phase 9, deferrable). (RISK-03/07; R7.)

### Q-21 — Tighten existing route-transition budgets in place, or add a separate warm-navigation budget file?
→ eng (Phase 9, deferrable). (R7.)

### Q-22 — Defer audit/AI-table FK indexes?
`ai_*`, `*_history` FK indexes cost writes for little read benefit — defer unless cascade-delete latency is observed. Confirm deferral.
→ DB (deferrable). (R5.)

### Q-23 — Should a route-skeleton contract be mandated?
Mandate `StaticWorkshopLoadingShell` everywhere to prevent layout shift between `loading.tsx` and the real route?
→ eng + design (Phase 6, deferrable). (R6.)

### Q-26 — Confirm prod env does not disable virtualization flags
Confirm the production environment does not set `NEXT_PUBLIC_*` virtualization flags to `0`. Flags default ON, so this is a confirm-not-fix item.
→ measurement (Phase 0). (Aliased Q-C.)

### Q-27 — Should the 5-module menu family be consolidated?
Should the 5 menu modules collapse into a shared `dropdown-popup` core (overlaps Q-03)? Low priority.
→ eng + design (deferrable). (Aliased Q-menu-collapse.)

---

## Q-ID alias map (canonical numeric IDs)

The phase files use letter/word Q-references; this table resolves them to the canonical numeric IDs in this file.

| Phase-file reference | Canonical ID | Topic |
|---|---|---|
| Q-A | Q-08b | `editableRows` → tree cache vs per-row atoms |
| Q-B | Q-04 | Retire `tabTree`/`areaTree` legacy split |
| Q-C | Q-26 (NEW) | Confirm prod env doesn't disable virtualization flags (confirm-not-fix) |
| Q-D | Q-05 | Left `EstimateSheetTree` double-compute |
| Q-E | Q-01 | Full vs Lite component-library loader in prod |
| Q-F | Q-11 | `lint:design` enforcement (answered question Q-F refers to) |
| Q-bundle | Q-09 | `ANALYZE=true` bundle confirmation |
| Q-G | Q-16 | Sheet UI consumes `source_snapshot` + `metadata` for all rows? |
| Q-H | Q-17 | Server reads also cached client-side (double-fetch) |
| Q-I | Q-12 | Bare `auth.uid()` reintroduced after remediation? |
| Q-J | Q-14 | Are the 13 `unused_index` entries genuinely dead? |
| Q-row-ordering | Q-07 | Per-row `operationId` + promise-queue still needed? |
| Q-areaTree | Q-04 | `areaTree` retirement (same as Q-B) |
| Q-notif-rollback | Q-06 | Notification/collaborator no-rollback intentional? |
| Q-bulk-merge | Q-08e | Merge `bulkSelectedRowIds` with Zustand selection |
| Q-tabstrip | Q-03 | Bless vs refactor forked primitives (`EstimateTabStrip`) |
| Q-iconbutton-target | Q-03 | `IconButton` vs `ToolbarIconButton` merge target |
| Q-menu-collapse | Q-27 (NEW) | Consolidate the 5-module menu family (low priority) |
| Q-lint-design | Q-11 | `lint:design` enforcement (now ANSWERED) |
