# SYNTHESIS / COORDINATION CONTRACT — Performance Refactor Plan Pack

> ## V2 IMPROVEMENT CONTRACT (2026-06-17, round 2 — after an 8-lens review panel scored the pack). This section is AUTHORITATIVE for round-2 writers/fixers. Use the pinned IDs, doc names, and gate names below verbatim so cross-references resolve.
>
> ### Review scorecard (BEFORE round-2 improvements)
> | Dimension | Score /100 | Owner of fix |
> |---|---|---|
> | Quality/coherence | 92 | FIX-4, FIX-1/2/3 |
> | Feasibility/impl-readiness | 88 | FIX-5 (RISK-16 retarget), 24, 22 |
> | Performance rigor | 88 | doc 25 + FIX-5/8 |
> | DB/network | 78 | doc 23 + FIX-7 |
> | Strategy/scope | 72 | doc 24 + FIX-2/4/6 |
> | Blast-radius | 62 | doc 21 |
> | Security | 52 | doc 22 + FIX-7/8 |
> | UX/UI | 38 | doc 20 + FIX-5 |
> Target after round 2: every dimension ≥ 95, with residual <100 only where an owner product/measurement decision is genuinely irreducible (those are logged as Q-NN with a named owner + safe default, never left silent).
>
> ### NEW documents to create (round 2) — disjoint files, one writer each
> - `20_UX_UI_AND_INTERACTION_PLAN.md` — cross-phase UX contract: transient-state preservation (scroll/focus/expansion/in-progress edit/active tab/selection) per phase; perceived-latency contracts (synchronous totals on keystroke; optimistic-insert shows entered values, not skeleton; reconcile does not overwrite in-progress edit); a11y gates per phase (roving focus in unified `Tree`, dialog focus-trap/return-focus, keyboard cell editing, ARIA preservation across decomposition); visual-regression gate per phase (storybook:validate at 2/3/7 + CLS check on streaming); DnD visual affordances on convergence; proposal stale-badge debounce contract. Feeds per-phase manual QA + `15`.
> - `21_BLAST_RADIUS_MATRIX.md` — per-target import/caller/flow/test quantification (numbers pinned in §V2-FACTS below). Include the `get_impact_radius` unreliability caveat and the RISK-14 seam-cluster.
> - `22_SECURITY_AND_RLS_THREAT_PLAN.md` — provider RSC auth-boundary continuity (Phase 7); new-RPC SECURITY model + cross-tenant denial proofs; `ActionResult<T>` authz-preservation (Phase 4); optimistic FORBIDDEN-path tests (Phase 5); recursive-CTE multi-role isolation (Phase 8); top-3 exploit scenarios; per-item `prove:*` gate mapping.
> - `23_NETWORK_AND_DATA_FLOW_PLAN.md` — realtime channel/subscription budget (inbound render cost, presence heartbeat, channel count, teardown/leak); committed provisional per-route query-count/round-trip ceilings; payload-size budgets; prefetch & hydration strategy; the cache()↔TanStack hydrate seam as prefetch carrier.
> - `24_EXECUTION_GOVERNANCE_AND_ROLLOUT.md` — branch/PR/merge model for the multi-agent concurrent repo; seam-file lock protocol (RISK-14 cluster); stop-the-line/abort criteria (program-level "dead" thresholds); safe-pause points within phases (mid-session interruption); feature-flag/kill-switch rollout per risky phase; owner-decision deadlines + safe defaults (resolves feasibility GAP-3).
> - `25_OBSERVABILITY_RUM_AND_RESOURCE_BUDGETS.md` — field Web-Vitals/RUM wiring (note `@vercel/speed-insights` NOT installed; `WebVitalsProbe` is dev-gated/console-only/workshop-only); memory & leak budget (mount/unmount listener+timer+subscription baseline; heap ceiling over a scripted session); bundle-EXECUTION-time/TBT budget (distinct from kb); server-render/TTFB budget; measurement methodology rules (≥20 samples for any percentile gate; p95/p99 for all interaction budgets; cold vs warm separated; forbid deriving a TIME budget from jsdom — jsdom asserts COUNTS only).
>
> ### Pinned NEW IDs (round-2 owners must define these; everyone else references them)
> - Risks (in `16`): **RISK-17** realtime inbound render/subscription cost; **RISK-18** client memory growth / listener-timer-subscription leak (incl. per-row store `subscribeRow` symmetry); **RISK-19** workshop-layout RSC→client conversion drops the auth redirect; **RISK-20** new-RPC cross-tenant data leak (`get_project_chart_buckets`, `workspace_homebase_summary`, activity CTE); **RISK-21** `ActionResult<T>` wrapping silently drops an interior authz check; **RISK-22** concurrent multi-agent edits collide on the RISK-14 seam cluster (no branch protocol).
> - Decisions (in `17`): **D-014** Phase-2 family-1 (estimate tree) sequencing — resolve the "convert last (§0)" vs "adopt first (§4 step 1)" contradiction; **D-015** execution governance (branch/PR + stop-the-line + flags) adopted via doc 24; **D-016** field-RUM wiring approach (install `@vercel/speed-insights` in root layout vs route `WebVitalsProbe` to `/api/vitals`); **D-017** reference-stability scope — totals Map is number-valued (value-equality suffices); the structural-sharing primitive targets OBJECT-valued surfaces (editableRows store), not the totals Map.
> - Open questions (in `19`, continue numeric series ≥ **Q-28**): RUM sink choice & PII; realtime per-route channel ceiling value; memory heap-ceiling value; provisional query-count ceilings per route; whether `optimizePackageImports` additions change module-init time. Add owner/deadline/safe-default columns to every "Owner decision needed: yes" question.
>
> ### Pinned NEW gate/script names (mark all "(new, Phase N)" — they do not exist yet)
> `prove:workshop-auth-boundary` (e2e: unauthenticated workshop route → 302 login), `prove:project-chart-buckets` (extend w/ cross-tenant denial), extend `prove:estimate-tabs-rls` (CTE multi-role), `perf:query-count` (define concretely now, not defer), `perf:realtime-cost` (wire `benchmark-estimate-cursor-broadcast` + inbound render count), `perf:memory-leak` (mount/unmount baseline), `perf:tbt`/exec-time check, `a11y` via `bun run storybook:validate` as a named gate at Phases 2/3/6, RUM field dashboard.
>
> ### §V2-FACTS — verified by the round-2 panel (use verbatim; OVERRIDE conflicting earlier text)
> - **Totals Map is `ReadonlyMap<string, number>`** (`EstimateSheetContent.tsx:521`); branch guard does `Object.is(prevTotal,nextTotal)` over NUMBERS (`branch.tsx:147`) → value-equality, so rebuilding the totals Map with equal numbers does NOT break the guard. The REAL object-identity check is `prev.editableRows[item.id] !== next.editableRows[item.id]` (`branch.tsx:101`). RISK-16 / 07 §B.4 / 09 §5 must be retargeted accordingly (see D-017).
> - **Live component-library loader is `getCurrentWorkspaceComponentRowsLibrary`** (called by `LibraryComponentsRoute.tsx:13`, `project-component-projection.ts:160`); the `.select("*")` audit targets it (~`:547-652`, `:757-777`). `…Library`/`…Lite` are only reached via `actions.ts:413/421`. Partially resolves Q-01.
> - **Blast-radius numbers** (code-review-graph + grep, 2026-06-17): `EstimateSheetContent.tsx` = 8 src consumers (graph missed them; grep authoritative: `EstimateWorkspaceClient`, `EstimateHeaderActions`, `ProposalExportPreviewDialog`, `row-table.tsx`, `EstimateTabStrip.tsx`, `use-estimate-header-actions-store.ts`, `estimate-sheet-render-probe.ts`) + ~24 test files (incl. 4 perf gates) → Critical. `ui/tree.tsx` `Tree` = 9 importers / 7 production trees → High (Critical if all 7 share simultaneously). `EstimateSheetTree.tsx` = 11 test files, dynamically imported → High. `app/providers.tsx` = 3 static importers BUT whole-app/32 route segments → Critical. `use-estimate-query.ts` = 5 src / 6 test → High. `use-estimate-row-mutations.ts` = 1 src (ESC only) → Med-High. `component-library-repository.ts` = 17 importers → High. `getEstimateTreeContentSignature` = 1 caller / 5 sites → Low-Med (confirms RISK-12 downgrade). **CAVEAT:** `get_impact_radius` is unreliable on `.tsx` UI targets (escapes into `.agents/skills/impeccable/*.mjs` via name-collision CALLS edges, returns 500+ spurious nodes); use scoped `importers_of`/`callers_of`.
> - **Hooks live in `src/hooks/`** (not `src/components/workshop/`) — normalize any hook path citations.
> - **`@vercel/speed-insights` is NOT installed** (only `@vercel/analytics@2`, `package.json:62`); `WebVitalsProbe.tsx:8-13` is dev-gated (`NEXT_PUBLIC_PERF_TRACE=1`), console-only, mounted only in `WorkshopPageShell.tsx:113` (landing/share emit no vitals).
> - **`get_project_chart_buckets` RPC does not exist** in `supabase/migrations` (confirmed 0 hits) — it is referenced in `project-charts-repository.ts:117` but never shipped.
>
> ### Round-2 writer/fixer assignments (disjoint files)
> New docs: W-UX→20, W-BLAST→21, W-SEC→22, W-NET→23, W-GOV→24, W-OBS→25. Existing-file fixers: FIX-1→`16`, FIX-2→`17`, FIX-3→`19`, FIX-4→`05`, FIX-5→`07`+`09`, FIX-6→`08`, FIX-7→`10`+`14`, FIX-8→`11`+`13`, FIX-9→`15`, FIX-10→`00`+`18`.


> ## POST-REVIEW CORRECTIONS (applied 2026-06-17 after adversarial fact-check AR1/AR2 against live code — these OVERRIDE any conflicting pinned value below)
> 1. **`computeNodeTotals` path:** the real path is `src/components/workshop/estimate-sheet/rows/editable-row-model.ts:162`. The `src/lib/estimates/editable-row-model.ts` path pinned in §1 below is WRONG — that file does not exist.
> 2. **Virtualization flags DEFAULT ON.** `src/lib/workshop/virtualization-flags.ts:11-13` defaults tree/EMC/rows virtualization to `true` (env-overridable); column-resize defaults `false` (:14). The real gap is the THRESHOLDS: estimate rows `minRows=75` (:21), EMC `minSections=80` (:24), tree `minRows=150` (:18) — NOT "behind an off-by-default flag."
> 3. **`router.refresh()` = 12 files** (enumerated by AR1), not 11. The 12: `project-estimates-store.ts`, `use-navigation-router.ts`, `LibraryPageClient.tsx`, `ProjectEstimatesClient.tsx`, `ComponentLibraryManager.tsx`, `ProjectEstimatesTable.tsx`, `projects-page-client.tsx`, `NewProjectForm.tsx`, `ProjectEstimateMetadataStrip.tsx`, `use-template-editor.ts`, `TemplatesBrowseManager.tsx`, `TemplatesBrowsePageClient.tsx`.
> 4. **`AppProviders` wired at `layout.tsx:27`** (render) / `:4` (import), not `:25`.
> 5. **EstimateSheetContent component span = `:1042-2925` (~1884 LOC); file = 2949 LOC** (was ~1042-2922 / ~1881 / 2950 — approximations OK).
> 6. **`lint:design` IS enforcing** (resolves a real engine at `.agents/skills/impeccable/scripts/detector/detect-antipatterns.mjs`). It simply has no reuse/duplication rule. The §5 "is lint:design a no-op?" question is ANSWERED.
> 7. **`ui/card.tsx` is imported 0× repo-wide** (stronger than "0× in workshop").
> 8. **Q-ID scheme:** canonical open-question IDs are numeric `Q-01..Q-23` in `19_OPEN_QUESTIONS.md`. Any letter/word Q-aliases used in phase files (Q-A, Q-bundle, etc.) are resolved via the alias table in `19_OPEN_QUESTIONS.md`.


> **Status:** Authoritative. Every writer agent MUST read this file plus their assigned research dossier(s) before writing. Where a writer's own reading contradicts a "PINNED FACT" below, do NOT silently diverge — note the contradiction in `19_OPEN_QUESTIONS.md` and use the pinned value in your file so the pack stays internally consistent.
>
> This contract is the mechanism by which the parallel agents "agree." It was synthesized by the orchestrator from 7 read-only research dossiers (R1–R7) in `_research/`.

---

## 0. Repo facts (verbatim — use these exact values)

- **Framework:** Next.js 16.2.6 (App Router), React 19.2.6, Bun, TypeScript strict, Tailwind CSS v4.
- **Data:** Supabase / Postgres with RLS; TanStack Query 5.100.14; Zustand 5.0.14.
- **Tables/grids/trees:** TanStack Table 8.21, TanStack Virtual 3.14, custom `src/components/ui/tree.tsx`, `react-complex-tree@2.6.1` (effectively dead — type alias + CSS only).
- **Heavy libs:** `d3@7.9` (full dep; only `d3-shape` is actually used), `exceljs@4.4` (cleanly server-only), `three@0.184` (WebGL; lifecycle is exemplary), `@firecms/neat` (patched), `lenis`, `roughjs`, `rough-notation`, `@phosphor-icons/react` (mostly on `/dist/ssr` path).
- **Tooling:** Storybook 10.4, Vitest 4.1 (361 DOM tests, serial), Playwright 1.60, `@next/bundle-analyzer` (wired in `next.config.ts:190`, NO npm script — invoke via `ANALYZE=true bun run build`).
- **Aggregate gate:** `bun run validate` = `type-check` + `lint` + `lint:design-system` + `lint:design` + `test` (5 unit) + `test:dom` (361 Vitest DOM). It does **NOT** run e2e, perf, storybook, or bundle analysis.
- **Branch when planned:** `feat/sidebar-redesign`. **Date:** 2026-06-17.

## Research dossier index (in `_research/`)

| Dossier | Domain | Primary consumers |
|---|---|---|
| `R1-rsc-and-bundle.md` | App Router / RSC boundaries; bundle & runtime cost | 01, 04, 13 (Phase 7) |
| `R2-state.md` | TanStack Query, Zustand, optimistic mutations, derived state | 01, 02, 04, 11 (Phase 5), 07 (Phase 1) |
| `R3-trees.md` | Every tree/hierarchy family; canonical kernel | 01, 02, 04, 08 (Phase 2) |
| `R4-sheet.md` | EstimateSheetContent responsibility map; render pressure | 01, 04, 09 (Phase 3) |
| `R5-data-supabase.md` | Repositories, server actions, RPC, RLS, indexes, DTOs | 01, 10 (Phase 4), 14 (Phase 8) |
| `R6-ui-primitives.md` | UI/design-system reuse & duplication | 01, 02, 12 (Phase 6) |
| `R7-tests-perf-tooling.md` | Validation & benchmark system, gaps | 03, 15, 06 (Phase 0), 09 (Phase 9 gate) |

---

## 1. PINNED FACTS (cite these file:line refs verbatim; writers may add more from dossiers)

### Estimate sheet (the #1 hotspot)
- `src/components/workshop/EstimateSheetContent.tsx` = **2950 LOC**; the exported component function is **1881 LOC** (`:1042-2922`); **~17 distinct responsibilities**; **~40 state atoms** in one function. Highest blast radius unit in the repo.
- **`editableRows` map identity is the central fan-out coupling.** `useState` map at `EstimateSheetContent.tsx:1093/1401`; one keystroke changes the map's identity → recomputes 6+ whole-tree memos/effects (`:1252, 1401, 1405, 1413, 1429, 1590`). Per-row subscription is the single highest-leverage fix.
- Row/branch *rendering* is already well-shielded by granular `memo` comparators (`branch.tsx:111-156`, `row-table.tsx:86-116`) keyed on per-row `editableRows[id]` identity + stable callbacks. **The problem is COMPUTE work, not row re-renders. Any refactor MUST preserve those guards.**
- Full-tree totals DFS `computeNodeTotals` (`src/lib/estimates/editable-row-model.ts:162-183`) reruns on **every cost-cell keystroke**.
- Proposal preview signature `createProposalPreviewSignature` (`EstimateSheetContent.tsx:287-318`) — full-tree 15-field string DFS, rebuilds per keystroke once the preview dialog has been opened (`:1260-1263`).
- Virtualization is conditional + high-threshold: branch list needs ≥80 sections AND a feature flag (`src/components/workshop/estimate-sheet/virtual-branch-list.tsx:93`); rows virtualize per-table behind another flag (`row-table.tsx:22`). See `src/lib/workshop/virtualization-flags.ts`.

### Trees (the central architectural lens)
- **7 tree families** all re-solving the same problems (≥8 find-by-id, ≥5 descendant collectors, ≥4 keep-ancestor filters, ≥3 cascade engines — same DFS over different node types):
  1. Estimate sheet tree — `EstimateSheetTree.tsx` + `estimate-tree-data.ts`, `lib/estimates/estimate-tree-{reorder,edit}.ts`, `estimate-row-tree-patch.ts`, `lib/domain/estimate-tree.ts`, `lib/estimates/tree-hierarchy.ts`
  2. Component library tree — `component-library/tree/{buildLibraryTree,helpers,LibraryTree}.ts(x)`
  3. Library folder tree — `component-library-manager/LibraryFolderTree.tsx` + `lib/component-library/library-folder-reorder.ts`
  4. Templates / project-source tree — `component-library/tree/TemplatesTree.tsx`
  5. Template structure editor — `library/template-editor/TemplateStructureTree.tsx`
  6. Share estimate tree (read-only) — `share/ShareEstimateTreeView.tsx` + `lib/share/reconstruct-share-tree.ts`
  7. Aggregation/export/proposal/publication traversal (non-render) — `lib/project-charts/`, `lib/proposal-export/`, `lib/publication/snapshot.ts`, `lib/reusable-sources/source-collectors.ts`, `lib/component-library/estimate-templates.ts`
- **Two presentation kernels:** `Tree` (`ui/tree.tsx`, ~1328 LOC, virtualized, used everywhere) vs `WorkshopTree` (no virtualization, only Share). `react-complex-tree` imported for CSS + one type alias only → **removable**.
- EstimateSheetTree rebuilds the entire tree on **every keystroke** (2 filters → full `toUiNode` rebuild) and runs fresh `findEstimateNode` DFS ~15× per interaction.
- `getEstimateTreeContentSignature` (`src/lib/estimates/estimate-tree-reorder.ts:181-220`) **JSON.stringifies ~19 fields × every row of the whole tree** on every reorder; called 5× in `EstimateSheetTree.tsx` (`:300, 301, 411, 418, 440`) incl. initial render.

### State
- **13 hand-rolled optimistic flows, 5 distinct rollback mechanisms** (patch-snapshot, whole-tree snapshot, revision-guarded restore, cache snapshot, closure-restore). Notifications (`useNotificationsQuery.ts:83-164`) and collaborator-role (`use-project-collaboration-query.ts:45-63`) have **NO rollback**.
- **5 query-key conventions** (nested factory ×3, bare-const+builders, inline fns). The `estimateTabId ? tabTree : areaTree` branch is replicated ~14×; `areaTree` flagged legacy (`use-estimate-query.ts:14`).
- TanStack tree cache **doubles as mutable optimistic state** via `setTree`/revision counters (`use-estimate-query.ts:13-15`, keys `estimateQueryKeys.tabTree`/`areaTree`).
- `patchAndMarkStale` idiom (setQueryData + invalidate `refetchType:"none"`) repeated at **22 sites** → candidate helper.
- Server state in Zustand: `project-estimates-store.ts` holds estimate rows with its own optimistic engine. `estimate-ui-store` overlaps `use-estimate-workspace-state` on selection/expansion. High-frequency `dragState` in a shared store. Arrays used where Sets/Maps fit.
- **CORRECTION (R2 over R1):** `project-estimates-store.ts` does NOT call `router.refresh()` (those are prose comments at `:11,16`). The real call is in `ProjectEstimatesClient.tsx:215`. `router.refresh()` spans **11 files**.
- Selection/active-tab → Zustand `use-estimate-workspace-state.ts`; column widths → `estimate-column-widths-store`; activity scope → `estimate-ui-store`; cross-tree header actions → `use-estimate-header-actions-store`. Bulk selection is a LOCAL `bulkSelectedRowIds` Set (`EstimateSheetContent.tsx:1099`), not Zustand.

### Data / Supabase
- **[HIGH]** Component library load `.select("*")` on 8 tables, **unbounded** (no `.limit()`) — `src/lib/repositories/component-library-repository.ts:530-746`. (Liveness depends on whether prod calls the Lite variant — OPEN QUESTION for R4 seam.)
- **[HIGH]** **87 unindexed foreign keys** (live Supabase advisor). Hot-path subset that matters: `estimate_nodes.parent_id`, `project_favorites`, `estimate_favorites`, `project_members`, `project_group_memberships`, `estimate_sheet_members`, `notification_deliveries`. (Most others are write-heavy audit/AI tables → cascade-delete cost only, defer.)
- **[HIGH]** `getWorkshopHomebaseData` serial tail (`src/lib/repositories/workspace-repository.ts:1126-1222`) — after a 6-way `Promise.all`, 5–7 sequential awaits, several independent → collapsible to another parallel wave or a summary RPC.
- **[MED]** Chart aggregation in JS; push-down RPC `get_project_chart_buckets` referenced as "ready migration" but **never shipped** (`src/lib/repositories/project-charts-repository.ts:101-128`). Ships ≤5000 rows / 1500 nodes per chart load.
- **[MED]** `.select("*")` on `projects` in sidebar/list path (`workspace-repository.ts:837/908`); activity-history full-node descendant fetch + actor-label N+1 (`src/app/.../estimates/actions.ts:670-719, 600-622`).
- **Strong patterns to generalize (don't rebuild):** `publication/public-repository.ts` (`cache()` + split column sets); `project_estimate_list_summaries` RPC (already replaced a JS fold); project-charts limit-with-overflow; active RLS-initplan remediation (migration `…162000`, `bun run prove:rls-initplan`).

### RSC / bundle
- **[HIGH]** Authed-only global providers mount on **public/landing routes**: `src/app/providers.tsx:30-46` mounts `RealtimeAuthBridge`, `NotificationProvider`, `PerformanceMonitor`, `NavigationListener` for every route via root `layout.tsx:25`. `RealtimeAuthBridge` (`realtime-auth-bridge.tsx:22-66`) pulls `@supabase/ssr` + supabase-js into the shared/landing bundle and fires an auth roundtrip on marketing pages. Fix: move to `src/app/workshop/layout.tsx`.
- **Redundant `d3` dep:** full `d3` (~868K) installed, only `d3-shape` used → remove `d3`.
- **d3 charts shipped eagerly** to the Data route AND the public Share page: `CostBreakdownSection.tsx:5` + `SharePageTabs.tsx:23` statically import `CostDonutChart`; only `ProjectChartsClient.tsx:26` lazy-loads. Make all dynamic/tab-gated (esp. external `/share/[token]`).
- `next.config.ts:55` `optimizePackageImports` covers only phosphor → extend to tanstack-table/virtual, radix-context-menu, d3-shape.
- Sparse streaming (~4 `Suspense` sites); `router.refresh()` in 11 files re-runs server segments → audit for scoped invalidation + server projections.
- **Confirmed positives (don't waste effort):** exceljs server-only; NeatWireframe WebGL lifecycle exemplary (dynamic import + idle activation + IntersectionObserver pause + destroy); all 32 `page.tsx` are Server Components; landing-only libs scoped to `components/landing/**`.

### UI / design system
- **Root cause:** DS linter (`scripts/enforce-app-design-system.mjs:148-237`) enforces *tokens* (font-size ≤12px, `rounded-xs`, weights, tracking, globals) but has **ZERO reuse/duplication rules**. `DESIGN.md:426` calls a visible duplicate "a blocking design-system defect" yet nothing enforces it → duplicates pass CI silently.
- `Card` primitive imported **0×** in workshop; product cards hand-rolled — `LiveProjectCard.tsx:1-722` is 722 LOC, **un-memoized** (churn + bloat). Plus `ProjectCard.tsx`, `EstimateListCard.tsx`.
- Icon-button forked 3 ways (`ui/icon-button.tsx`, `toolbar-icon-button.tsx`, `header-icon-toolbar.tsx`); `IconButton` dead (0 non-story uses); **19 raw icon-button class strings** in workshop.
- `BulkActionToolbar` exists **twice** (`ui/bulk-action-toolbar.tsx:1-219` and `workshop/BulkActionToolbar.tsx:1-135`, the latter doesn't import the former).
- Skeleton drift: 6 bespoke `animate-pulse` blocks bypass `Skeleton` (some skip `motion-reduce`); `loading.tsx` route shells diverge.
- **6 forked primitive families** total: BulkActionToolbar, Card, icon-button, tab-strip (`EstimateTabStrip` 654 LOC ignores `tab-strip.tsx`), search/input (`SearchInput` adopted in only 2 files; 70 raw `<input>`), skeleton. Plus 8 files hand-roll `role="dialog"`.
- **CAVEAT:** `.agents/skills/impeccable/detect.mjs` is only a loader; its anti-pattern engine isn't in-tree → `enforce-app-design-system.mjs` is the only verifiable CI gate. (`lint:design` may be a no-op — OPEN QUESTION.)

### Tests / perf tooling
- Only **4 jsdom render-isolation gates** exist (`tests/vitest/perf/`, estimate-sheet row table) — the best template to replicate.
- **Gaps:** no render-count budgets for tree/tabs/sidebar/charts; no real large-tree/large-estimate DB fixture (seed is manifest-only, `scripts/seed-performance-test-data.ts:116`; profiles synthetic ≤200 rows); no Supabase query-count/N+1 budget; no bundle-size budget; route-transition budgets are **non-gating** (15s/10s/30s medians, overlay cap 1.0, `scripts/check-route-transition-readiness.ts:108-112`).
- Orphan benchmark scripts (no thresholds, not in package.json): `benchmark-proposal-workbook`, `benchmark-estimate-cursor-broadcast`, `benchmark-shared-link-activity`, `build-performance-query-inventory`.
- Perf scripts: `perf:measure-routes` (needs running app), `perf:check-routes` (gates JSON vs loose budgets), `perf:seed-fixture` (manifest only), `perf:profile-peak-load` (jsdom 50-estimate/200-row, <10s ceiling), `test:e2e:perf` (route-transition spec).
- **OPEN:** whether CI runs anything beyond `validate` (no `.github/` inspected; read-only scope).

---

## 2. PINNED phase order (keep unless a writer proves better; record any deviation in 17_DECISION_LOG)

```
Phase 0  — Baseline, instrumentation, and guardrails
Phase 1  — Canonical indexes, selectors, and performance utilities (incl. structural-hash signature, patchAndMarkStale helper, query-key factory)
Phase 2  — Tree kernel unification (headless TreeIndex + ops)
Phase 3  — Estimate sheet decomposition and render isolation (break editableRows fan-out)
Phase 4  — Query/server-action/DTO standardization + select discipline
Phase 5  — Optimistic mutation lifecycle standardization (1 adapter, standard rollback)
Phase 6  — UI primitive consolidation + loading-state cleanup + DS duplication lint rule
Phase 7  — Bundle/code-splitting/runtime cleanup (provider topology, d3 dedup, share charts)
Phase 8  — Supabase/RPC/index/RLS performance pass (FK indexes, chart RPC, homebase RPC)
Phase 9  — CI benchmark gates and regression prevention
Phase 10 — Documentation, examples, and enforcement
```

**Quick-win note (record in 00_README):** Several Phase 7/8 items are cheap, isolated, high-leverage and MAY be pulled forward right after Phase 0 baseline as "early wins" (each gated by baseline + validate): provider topology move, `d3`→`d3-shape` dedup, share-page dynamic chart import, hot-path FK indexes, shipping `get_project_chart_buckets`. They do not depend on the tree/sheet refactors. Flag them but keep the disciplined default order.

## 3. PINNED top-5 highest-leverage refactor tracks (for 00_README + completion report)

1. **Tree kernel unification** — one headless `TreeIndex` + ops layer replacing ≥8 find-by-id / ≥5 descendant / ≥4 ancestor-filter / ≥3 cascade implementations across 7 tree families; delete `react-complex-tree` and converge `WorkshopTree`→`Tree`.
2. **EstimateSheetContent decomposition + render isolation** — break the 1881-LOC god component; sever the `editableRows` map-identity fan-out via per-row subscription; preserve existing `memo` guards.
3. **Per-keystroke recompute elimination** — replace whole-tree `JSON.stringify` content signature + full-tree totals DFS + proposal-signature DFS with incremental/structural-hash + memoized indexes (Phase 1 primitives feed this).
4. **Optimistic mutation lifecycle standardization** — collapse 13 flows / 5 rollback mechanisms into one adapter; unified query-key factory (fold tabTree/areaTree branch); `patchAndMarkStale` helper (22 sites).
5. **Data/bundle/DB discipline pass** — provider topology move + `d3` dedup + share-page dynamic charts; `.select` column discipline + `.limit()` on component library; hot-path FK indexes; ship `get_project_chart_buckets` + homebase summary RPC.

## 4. Cross-file conventions (all writers use these)

- **Priority labels:** P0 (do first / unblocks others), P1, P2, P3. **Risk labels:** Low / Medium / High / Critical.
- **Evidence format everywhere:** `path/to/file.tsx:line-range — observation`.
- **Validation command vocabulary (only these exist today):** `bun run type-check`, `bun run lint`, `bun run lint:design-system`, `bun run lint:design`, `bun run test`, `bun run test:dom`, `bun run validate`, `bun run test:e2e`, `bun run test:e2e:perf`, `bun run perf:measure-routes`, `bun run perf:check-routes`, `bun run perf:profile-peak-load`, `bun run perf:seed-fixture`, `bun run storybook:validate`, `ANALYZE=true bun run build`, `bun run prove:rls-initplan` (+ other `prove:*`), `bun run prove:estimate-tabs-rls`, etc. New scripts are *proposals* — mark them clearly as "to be added in Phase N."
- **Hard constraints (from the master prompt):** planning only; no `src/**`, `tests/**`, `e2e/**`, `scripts/**`, `supabase/**`, or config changes; no migrations applied; no destructive DB actions; future migrations/indexes/RPCs are planning items with risk + validation only.
- **Decision IDs:** `D-001`, `D-002`, … in `17_DECISION_LOG.md`. **Risk IDs:** `RISK-01`, … in `16_RISK_REGISTER.md`. **Open-question IDs:** `Q-01`, … in `19_OPEN_QUESTIONS.md`. Cross-reference these IDs from other files.

## 5. Cross-cutting OPEN QUESTIONS the pack must capture (seed for 19_OPEN_QUESTIONS)

- Q: Does prod call the full component-library loader or a "Lite" variant? (decides severity of `.select("*")` finding) — owner/eng + measurement.
- Q: Does the left EstimateSheetTree run its own totals DFS, doubling per-keystroke compute vs the sheet? (R3↔R4 seam) — measurement.
- Q: Does CI run anything beyond `bun run validate`? (no `.github/` inspected) — measurement/eng.
- Q: Is `lint:design` (impeccable `detect.mjs`) actually enforcing anything, or a no-op loader? — eng.
- Q: Bundle reality — run `ANALYZE=true bun run build` to confirm all import-graph-derived "ships into bundle X" claims before acting. — measurement (Phase 0).
- Q: Can `bulkSelectedRowIds` (local Set) and `estimate-ui-store`/`use-estimate-workspace-state` selection be merged without regressions? — eng.

## 6. Writer assignments (disjoint output files — no write conflicts)

- **Wave 1:** W1→`01_CODEBASE_AUDIT`; W2→`02_PATTERN_INVENTORY`; W3→`03_PERFORMANCE_BASELINE_AND_BENCHMARKS`+`15_VALIDATION_MATRIX`; W4→`04_TARGET_ARCHITECTURE`; W11→`00_README`+`16_RISK_REGISTER`+`17_DECISION_LOG`+`19_OPEN_QUESTIONS`.
- **Wave 2 (reads Wave-1 outputs + this contract):** W5→`05_PHASED_REFACTOR_PLAN`+`18_EXECUTION_PROMPTS`; W6→`06_PHASE_0_BASELINE_PLAN`+`07_PHASE_1_FOUNDATION_PLAN`; W7→`08_PHASE_2_TREE_KERNEL_PLAN`; W8→`09_PHASE_3_ESTIMATE_SHEET_PLAN`; W9→`10_PHASE_4_DATA_AND_CACHE_PLAN`+`14_PHASE_8_SUPABASE_DB_PLAN`; W10→`11_PHASE_5_OPTIMISTIC_MUTATIONS_PLAN`+`12_PHASE_6_UI_PRIMITIVES_PLAN`+`13_PHASE_7_BUNDLE_RUNTIME_PLAN`.
